import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@insaat-erp/database';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateChequeDto,
  UpdateChequeStatusDto,
  ListChequesDto,
} from './dto/create-cheque.dto';

@Injectable()
export class ChequesService {
  private readonly logger = new Logger(ChequesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, userId: string, dto: CreateChequeDto) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: dto.contactId, tenantId, deletedAt: null },
    });
    if (!contact) {
      throw new BadRequestException(`Cari bulunamadı: ${dto.contactId}`);
    }

    const cheque = await this.prisma.cheque.create({
      data: {
        tenantId,
        contactId: dto.contactId,
        kind: dto.kind,
        direction: dto.direction,
        chequeNo: dto.chequeNo,
        bankName: dto.bankName,
        bankBranch: dto.bankBranch,
        drawer: dto.drawer,
        amount: dto.amount,
        currency: dto.currency ?? 'TRY',
        issueDate: new Date(dto.issueDate),
        dueDate: new Date(dto.dueDate),
        status: 'PORTFOLIO',
        statusDate: new Date(),
        description: dto.description,
        createdBy: userId,
        updatedBy: userId,
      },
      include: {
        contact: { select: { id: true, code: true, name: true } },
      },
    });

    this.logger.log(
      `📋 Yeni ${cheque.kind === 'CHEQUE' ? 'çek' : 'senet'}: ${cheque.chequeNo} | ${cheque.direction} | ${cheque.amount}`,
    );

    return cheque;
  }

  async findAll(tenantId: string, query: ListChequesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: Prisma.ChequeWhereInput = {
      tenantId,
      deletedAt: null,
    };

    if (query.contactId) where.contactId = query.contactId;
    if (query.kind) where.kind = query.kind;
    if (query.direction) where.direction = query.direction;
    if (query.status) where.status = query.status;

    if (query.dueFrom || query.dueTo) {
      where.dueDate = {};
      if (query.dueFrom) where.dueDate.gte = new Date(query.dueFrom);
      if (query.dueTo) where.dueDate.lte = new Date(query.dueTo);
    }

    const [items, total] = await Promise.all([
      this.prisma.cheque.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dueDate: 'asc' },
        include: {
          contact: { select: { id: true, code: true, name: true } },
        },
      }),
      this.prisma.cheque.count({ where }),
    ]);

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(tenantId: string, id: string) {
    const cheque = await this.prisma.cheque.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        contact: { select: { id: true, code: true, name: true } },
      },
    });

    if (!cheque) {
      throw new NotFoundException(`Çek/Senet bulunamadı: ${id}`);
    }

    return cheque;
  }

  async updateStatus(
    tenantId: string,
    userId: string,
    id: string,
    dto: UpdateChequeStatusDto,
  ) {
    const cheque = await this.findOne(tenantId, id);

    const updated = await this.prisma.cheque.update({
      where: { id },
      data: {
        status: dto.status,
        statusDate: new Date(),
        statusNote: dto.statusNote,
        updatedBy: userId,
      },
      include: {
        contact: { select: { id: true, code: true, name: true } },
      },
    });

    this.logger.log(
      `🔄 ${cheque.chequeNo}: ${cheque.status} → ${dto.status}`,
    );

    return updated;
  }

  async remove(tenantId: string, userId: string, id: string) {
    await this.findOne(tenantId, id);

    await this.prisma.cheque.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: userId,
      },
    });

    return { message: 'Çek/Senet silindi', id };
  }

  // ────────────────────────────────────
  // DASHBOARD STATS (Vade takvimi için)
  // ────────────────────────────────────
  async getStats(tenantId: string) {
    const baseWhere = { tenantId, deletedAt: null };
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    // Portföydeki çekler (henüz tahsil/ödeme yapılmamış)
    const portfolioStatus: Prisma.EnumChequeStatusFilter['in'] = [
      'PORTFOLIO',
      'DEPOSITED',
      'ENDORSED',
    ];

    const [
      // Toplam sayılar
      totalIncoming,
      totalOutgoing,
      // Portföy toplamları (aktif çekler/senetler)
      portfolioIncoming,
      portfolioOutgoing,
      // Vadesi geçmiş (kritik!)
      overdueIncoming,
      overdueOutgoing,
      // Bu 30 günde
      upcomingIncoming,
      upcomingOutgoing,
      // Aylık dağılım (önümüzdeki 6 ay)
      monthlyDistribution,
    ] = await Promise.all([
      this.prisma.cheque.count({
        where: { ...baseWhere, direction: 'INCOMING' },
      }),
      this.prisma.cheque.count({
        where: { ...baseWhere, direction: 'OUTGOING' },
      }),
      this.prisma.cheque.aggregate({
        where: {
          ...baseWhere,
          direction: 'INCOMING',
          status: { in: portfolioStatus },
        },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.cheque.aggregate({
        where: {
          ...baseWhere,
          direction: 'OUTGOING',
          status: { in: portfolioStatus },
        },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.cheque.aggregate({
        where: {
          ...baseWhere,
          direction: 'INCOMING',
          status: { in: portfolioStatus },
          dueDate: { lt: today },
        },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.cheque.aggregate({
        where: {
          ...baseWhere,
          direction: 'OUTGOING',
          status: { in: portfolioStatus },
          dueDate: { lt: today },
        },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.cheque.aggregate({
        where: {
          ...baseWhere,
          direction: 'INCOMING',
          status: { in: portfolioStatus },
          dueDate: { gte: today, lte: thirtyDaysLater },
        },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.cheque.aggregate({
        where: {
          ...baseWhere,
          direction: 'OUTGOING',
          status: { in: portfolioStatus },
          dueDate: { gte: today, lte: thirtyDaysLater },
        },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.cheque.findMany({
        where: {
          ...baseWhere,
          status: { in: portfolioStatus },
          dueDate: {
            gte: today,
            lte: new Date(today.getTime() + 180 * 24 * 60 * 60 * 1000), // 6 ay
          },
        },
        select: {
          dueDate: true,
          amount: true,
          direction: true,
        },
        orderBy: { dueDate: 'asc' },
      }),
    ]);

    // Aylık dağılımı grupla
    const byMonth: Record<string, { incoming: number; outgoing: number; count: number }> = {};
    for (const c of monthlyDistribution) {
      const monthKey = `${c.dueDate.getFullYear()}-${String(c.dueDate.getMonth() + 1).padStart(2, '0')}`;
      if (!byMonth[monthKey]) {
        byMonth[monthKey] = { incoming: 0, outgoing: 0, count: 0 };
      }
      const amount = parseFloat(c.amount.toString());
      if (c.direction === 'INCOMING') {
        byMonth[monthKey].incoming += amount;
      } else {
        byMonth[monthKey].outgoing += amount;
      }
      byMonth[monthKey].count += 1;
    }

    const monthlyArray = Object.entries(byMonth)
      .map(([month, data]) => ({
        month,
        incoming: data.incoming.toFixed(2),
        outgoing: data.outgoing.toFixed(2),
        count: data.count,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      counts: {
        totalIncoming,
        totalOutgoing,
      },
      portfolio: {
        incoming: {
          count: portfolioIncoming._count,
          total: portfolioIncoming._sum?.amount?.toString() ?? '0',
        },
        outgoing: {
          count: portfolioOutgoing._count,
          total: portfolioOutgoing._sum?.amount?.toString() ?? '0',
        },
      },
      overdue: {
        incoming: {
          count: overdueIncoming._count,
          total: overdueIncoming._sum?.amount?.toString() ?? '0',
        },
        outgoing: {
          count: overdueOutgoing._count,
          total: overdueOutgoing._sum?.amount?.toString() ?? '0',
        },
      },
      upcoming30Days: {
        incoming: {
          count: upcomingIncoming._count,
          total: upcomingIncoming._sum?.amount?.toString() ?? '0',
        },
        outgoing: {
          count: upcomingOutgoing._count,
          total: upcomingOutgoing._sum?.amount?.toString() ?? '0',
        },
      },
      monthlyDistribution: monthlyArray,
    };
  }
}