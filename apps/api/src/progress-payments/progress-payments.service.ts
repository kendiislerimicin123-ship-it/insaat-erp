import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@insaat-erp/database';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProgressPaymentDto } from './dto/create-progress-payment.dto';
import { UpdateProgressPaymentDto } from './dto/update-progress-payment.dto';
import { ListProgressPaymentsDto } from './dto/list-progress-payments.dto';
import { PayProgressPaymentDto } from './dto/pay-progress-payment.dto';

@Injectable()
export class ProgressPaymentsService {
  private readonly logger = new Logger(ProgressPaymentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ────────────────────────────────────
  // CREATE
  // ────────────────────────────────────
  async create(
    tenantId: string,
    userId: string,
    dto: CreateProgressPaymentDto,
  ) {
    // Kod benzersiz mi?
    const existing = await this.prisma.progressPayment.findFirst({
      where: { tenantId, code: dto.code, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException(
        `Bu firma için '${dto.code}' kodlu bir hakediş zaten var`,
      );
    }

    // Proje aynı tenant'a mı ait?
    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, tenantId, deletedAt: null },
    });
    if (!project) {
      throw new BadRequestException(`Proje bulunamadı: ${dto.projectId}`);
    }

    // Taşeron aynı tenant'a mı ait?
    const subcontractor = await this.prisma.subcontractor.findFirst({
      where: { id: dto.subcontractorId, tenantId, deletedAt: null },
    });
    if (!subcontractor) {
      throw new BadRequestException(
        `Taşeron bulunamadı: ${dto.subcontractorId}`,
      );
    }

    // Finansal hesaplar (Decimal arithmetic için string'den gidelim)
    const amount = new Prisma.Decimal(dto.amount);
    const taxRate = new Prisma.Decimal(dto.taxRate ?? 20);
    const taxAmount = amount.mul(taxRate).div(100);
    const totalAmount = amount.add(taxAmount);

    const created = await this.prisma.progressPayment.create({
      data: {
        tenantId,
        code: dto.code,
        projectId: dto.projectId,
        subcontractorId: dto.subcontractorId,
        period: dto.period,
        amount,
        taxRate,
        taxAmount,
        totalAmount,
        currency: dto.currency ?? 'TRY',
        status: dto.status ?? 'DRAFT',
        description: dto.description,
        notes: dto.notes,
        issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : null,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    this.logger.log(
      `💰 Yeni hakediş: ${created.code} | tutar: ${totalAmount.toString()} ${created.currency} | tenant: ${tenantId}`,
    );

    return this.findOne(tenantId, created.id);
  }

  // ────────────────────────────────────
  // LIST
  // ────────────────────────────────────
  async findAll(tenantId: string, query: ListProgressPaymentsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProgressPaymentWhereInput = {
      tenantId,
      deletedAt: null,
    };

    if (query.status) where.status = query.status;
    if (query.projectId) where.projectId = query.projectId;
    if (query.subcontractorId) where.subcontractorId = query.subcontractorId;
    if (query.period) where.period = query.period;

    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total, summary] = await Promise.all([
      this.prisma.progressPayment.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ period: 'desc' }, { createdAt: 'desc' }],
        include: {
          project: { select: { id: true, code: true, name: true } },
          subcontractor: {
            select: { id: true, code: true, name: true, category: true },
          },
        },
      }),
      this.prisma.progressPayment.count({ where }),
      // Sayfa özeti: toplam tutar (filter'lara göre)
      this.prisma.progressPayment.aggregate({
        where,
        _sum: { amount: true, taxAmount: true, totalAmount: true },
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalAmount: summary._sum.totalAmount?.toString() ?? '0',
        amount: summary._sum.amount?.toString() ?? '0',
        taxAmount: summary._sum.taxAmount?.toString() ?? '0',
      },
    };
  }

  // ────────────────────────────────────
  // GET ONE
  // ────────────────────────────────────
  async findOne(tenantId: string, id: string) {
    const pp = await this.prisma.progressPayment.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        project: { select: { id: true, code: true, name: true } },
        subcontractor: {
          select: { id: true, code: true, name: true, category: true },
        },
      },
    });

    if (!pp) {
      throw new NotFoundException(`Hakediş bulunamadı: ${id}`);
    }

    return pp;
  }

  // ────────────────────────────────────
  // UPDATE
  // ────────────────────────────────────
  async update(
    tenantId: string,
    userId: string,
    id: string,
    dto: UpdateProgressPaymentDto,
  ) {
    const current = await this.findOne(tenantId, id);

    // PAID veya CANCELLED durumdaki hakediş güncellenemez
    if (['PAID', 'CANCELLED'].includes(current.status)) {
      throw new BadRequestException(
        `${current.status} durumundaki hakediş güncellenemez`,
      );
    }

    // Kod değişiyorsa unique kontrol
    if (dto.code && dto.code !== current.code) {
      const conflict = await this.prisma.progressPayment.findFirst({
        where: {
          tenantId,
          code: dto.code,
          id: { not: id },
          deletedAt: null,
        },
      });
      if (conflict) {
        throw new ConflictException(
          `Bu firma için '${dto.code}' kodlu başka bir hakediş var`,
        );
      }
    }

    // Proje değişiyorsa kontrol
    if (dto.projectId && dto.projectId !== current.projectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: dto.projectId, tenantId, deletedAt: null },
      });
      if (!project) {
        throw new BadRequestException(`Proje bulunamadı: ${dto.projectId}`);
      }
    }

    // Taşeron değişiyorsa kontrol
    if (
      dto.subcontractorId &&
      dto.subcontractorId !== current.subcontractorId
    ) {
      const sub = await this.prisma.subcontractor.findFirst({
        where: { id: dto.subcontractorId, tenantId, deletedAt: null },
      });
      if (!sub) {
        throw new BadRequestException(
          `Taşeron bulunamadı: ${dto.subcontractorId}`,
        );
      }
    }

    // Finansal hesap güncellemesi (tutar veya KDV oranı değiştiyse)
    const updateData: Prisma.ProgressPaymentUpdateInput = {
      ...(dto.code !== undefined && { code: dto.code }),
      ...(dto.projectId !== undefined && {
        project: { connect: { id: dto.projectId } },
      }),
      ...(dto.subcontractorId !== undefined && {
        subcontractor: { connect: { id: dto.subcontractorId } },
      }),
      ...(dto.period !== undefined && { period: dto.period }),
      ...(dto.currency !== undefined && { currency: dto.currency }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...(dto.issuedAt !== undefined && {
        issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : null,
      }),
      updatedBy: userId,
    };

    if (dto.amount !== undefined || dto.taxRate !== undefined) {
      const amount = new Prisma.Decimal(dto.amount ?? current.amount.toString());
      const taxRate = new Prisma.Decimal(
        dto.taxRate ?? current.taxRate.toString(),
      );
      const taxAmount = amount.mul(taxRate).div(100);
      const totalAmount = amount.add(taxAmount);
      updateData.amount = amount;
      updateData.taxRate = taxRate;
      updateData.taxAmount = taxAmount;
      updateData.totalAmount = totalAmount;
    }

    await this.prisma.progressPayment.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`✏️  Hakediş güncellendi: ${id}`);

    return this.findOne(tenantId, id);
  }

  // ────────────────────────────────────
  // DELETE (soft)
  // ────────────────────────────────────
  async remove(tenantId: string, userId: string, id: string) {
    const current = await this.findOne(tenantId, id);

    if (current.status === 'PAID') {
      throw new BadRequestException(
        'Ödenmiş hakediş silinemez. Önce iptal etmelisiniz.',
      );
    }

    await this.prisma.progressPayment.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: userId,
      },
    });

    this.logger.log(`🗑️  Hakediş silindi (soft): ${current.code}`);

    return { message: 'Hakediş silindi', id };
  }

  // ────────────────────────────────────
  // APPROVE (status transition)
  // ────────────────────────────────────
  async approve(tenantId: string, userId: string, id: string) {
    const current = await this.findOne(tenantId, id);

    if (current.status !== 'SUBMITTED' && current.status !== 'DRAFT') {
      throw new BadRequestException(
        `${current.status} durumundaki hakediş onaylanamaz. Sadece DRAFT/SUBMITTED durumu onaylanabilir.`,
      );
    }

    await this.prisma.progressPayment.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: userId,
        updatedBy: userId,
      },
    });

    this.logger.log(`✅ Hakediş onaylandı: ${current.code} | onaylayan: ${userId}`);

    return this.findOne(tenantId, id);
  }

  // ────────────────────────────────────
  // PAY (status transition)
  // ────────────────────────────────────
  async pay(
    tenantId: string,
    userId: string,
    id: string,
    dto: PayProgressPaymentDto,
  ) {
    const current = await this.findOne(tenantId, id);

    if (current.status !== 'APPROVED') {
      throw new BadRequestException(
        `${current.status} durumundaki hakediş ödenemez. Önce onaylanmalı.`,
      );
    }

    await this.prisma.progressPayment.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paymentMethod: dto.paymentMethod,
        paymentRef: dto.paymentRef,
        updatedBy: userId,
      },
    });

    this.logger.log(
      `💵 Hakediş ödendi: ${current.code} | ${current.totalAmount.toString()} ${current.currency} | yöntem: ${dto.paymentMethod}`,
    );

    return this.findOne(tenantId, id);
  }

  // ────────────────────────────────────
  // STATS
  // ────────────────────────────────────
  async getStats(tenantId: string) {
    const baseWhere = { tenantId, deletedAt: null };

    const [total, draft, submitted, approved, paid, totalSums] =
      await Promise.all([
        this.prisma.progressPayment.count({ where: baseWhere }),
        this.prisma.progressPayment.count({
          where: { ...baseWhere, status: 'DRAFT' },
        }),
        this.prisma.progressPayment.count({
          where: { ...baseWhere, status: 'SUBMITTED' },
        }),
        this.prisma.progressPayment.count({
          where: { ...baseWhere, status: 'APPROVED' },
        }),
        this.prisma.progressPayment.count({
          where: { ...baseWhere, status: 'PAID' },
        }),
        this.prisma.progressPayment.aggregate({
          where: baseWhere,
          _sum: { totalAmount: true },
        }),
      ]);

    const paidSum = await this.prisma.progressPayment.aggregate({
      where: { ...baseWhere, status: 'PAID' },
      _sum: { totalAmount: true },
    });

    const pendingSum = await this.prisma.progressPayment.aggregate({
      where: { ...baseWhere, status: { in: ['DRAFT', 'SUBMITTED', 'APPROVED'] } },
      _sum: { totalAmount: true },
    });

    return {
      total,
      byStatus: { draft, submitted, approved, paid },
      totalAmount: totalSums._sum.totalAmount?.toString() ?? '0',
      paidAmount: paidSum._sum.totalAmount?.toString() ?? '0',
      pendingAmount: pendingSum._sum.totalAmount?.toString() ?? '0',
    };
  }
}