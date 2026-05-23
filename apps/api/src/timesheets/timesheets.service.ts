import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@insaat-erp/database';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTimesheetDto,
  UpdateTimesheetDto,
  ListTimesheetsDto,
  TimesheetDetailInputDto,
} from './dto/create-timesheet.dto';

@Injectable()
export class TimesheetsService {
  private readonly logger = new Logger(TimesheetsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Bir detay satırı için kazanç hesaplama
  private calculateEarning(detail: TimesheetDetailInputDto): Prisma.Decimal {
    if (detail.absent) return new Prisma.Decimal(0);

    const dailyWage = new Prisma.Decimal(detail.dailyWage);
    const hoursWorked = new Prisma.Decimal(detail.hoursWorked);
    const overtimeHours = new Prisma.Decimal(detail.overtimeHours ?? 0);
    const overtimeMultiplier = new Prisma.Decimal(detail.overtimeMultiplier ?? 1.5);

    // Normal saat ücreti: dailyWage / 8 (varsayılan)
    const hourlyRate = dailyWage.div(8);

    // Normal kazanç
    const normalEarning = hourlyRate.mul(hoursWorked);

    // Mesai kazancı
    const overtimeEarning = hourlyRate.mul(overtimeHours).mul(overtimeMultiplier);

    return normalEarning.add(overtimeEarning);
  }

  async create(tenantId: string, userId: string, dto: CreateTimesheetDto) {
    // Taşeron + Proje kontrolü
    const [subcontractor, project] = await Promise.all([
      this.prisma.subcontractor.findFirst({
        where: { id: dto.subcontractorId, tenantId, deletedAt: null },
      }),
      this.prisma.project.findFirst({
        where: { id: dto.projectId, tenantId, deletedAt: null },
      }),
    ]);

    if (!subcontractor) {
      throw new BadRequestException(`Taşeron bulunamadı: ${dto.subcontractorId}`);
    }
    if (!project) {
      throw new BadRequestException(`Proje bulunamadı: ${dto.projectId}`);
    }

    // İşçilerin hepsi bu taşerona bağlı mı?
    const employeeIds = dto.details.map((d) => d.employeeId);
    const employees = await this.prisma.subcontractorEmployee.findMany({
      where: {
        id: { in: employeeIds },
        subcontractorId: dto.subcontractorId,
        tenantId,
        deletedAt: null,
      },
    });

    if (employees.length !== employeeIds.length) {
      throw new BadRequestException(
        `Bazı işçiler bulunamadı veya bu taşerona bağlı değil`,
      );
    }

    // Hesaplar
    let totalAmount = new Prisma.Decimal(0);
    let totalHours = new Prisma.Decimal(0);
    let presentCount = 0;

    const detailsData = dto.details.map((d) => {
      const earning = this.calculateEarning(d);
      totalAmount = totalAmount.add(earning);
      totalHours = totalHours.add(new Prisma.Decimal(d.hoursWorked));
      if (!d.absent) presentCount++;

      return {
        tenantId,
        employeeId: d.employeeId,
        absent: d.absent ?? false,
        hoursWorked: d.hoursWorked,
        dailyWage: d.dailyWage,
        overtimeHours: d.overtimeHours ?? 0,
        overtimeMultiplier: d.overtimeMultiplier ?? 1.5,
        totalEarning: earning,
        notes: d.notes,
      };
    });

    // TRANSACTION: TimesheetEntry + Details atomik
    const result = await this.prisma.$transaction(async (tx) => {
      const entry = await tx.timesheetEntry.create({
        data: {
          tenantId,
          subcontractorId: dto.subcontractorId,
          projectId: dto.projectId,
          date: new Date(dto.date),
          workDescription: dto.workDescription,
          approvedBy: dto.approvedBy,
          status: 'DRAFT',
          totalAmount,
          employeeCount: presentCount,
          totalHours,
          currency: dto.currency ?? 'TRY',
          notes: dto.notes,
          createdBy: userId,
          updatedBy: userId,
          details: {
            create: detailsData,
          },
        },
        include: {
          subcontractor: { select: { id: true, code: true, name: true } },
          project: { select: { id: true, code: true, name: true } },
          details: {
            include: {
              employee: { select: { id: true, name: true, specialty: true } },
            },
          },
        },
      });

      return entry;
    });

    this.logger.log(
      `📅 Yeni puantaj: ${subcontractor.code} | ${project.code} | ${dto.date} | ${presentCount} işçi | ${totalAmount.toString()} ${dto.currency ?? 'TRY'}`,
    );

    return result;
  }

  async findAll(tenantId: string, query: ListTimesheetsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: Prisma.TimesheetEntryWhereInput = {
      tenantId,
      deletedAt: null,
    };

    if (query.subcontractorId) where.subcontractorId = query.subcontractorId;
    if (query.projectId) where.projectId = query.projectId;
    if (query.status) where.status = query.status;

    if (query.from || query.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(query.from);
      if (query.to) where.date.lte = new Date(query.to);
    }

    const [items, total, summary] = await Promise.all([
      this.prisma.timesheetEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        include: {
          subcontractor: { select: { id: true, code: true, name: true } },
          project: { select: { id: true, code: true, name: true } },
          _count: { select: { details: true } },
        },
      }),
      this.prisma.timesheetEntry.count({ where }),
      this.prisma.timesheetEntry.aggregate({
        where,
        _sum: { totalAmount: true, totalHours: true, employeeCount: true },
      }),
    ]);

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      summary: {
        totalAmount: summary._sum?.totalAmount?.toString() ?? '0',
        totalHours: summary._sum?.totalHours?.toString() ?? '0',
        totalEmployees: summary._sum?.employeeCount ?? 0,
      },
    };
  }

  async findOne(tenantId: string, id: string) {
    const entry = await this.prisma.timesheetEntry.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        subcontractor: { select: { id: true, code: true, name: true } },
        project: { select: { id: true, code: true, name: true } },
        details: {
          include: {
            employee: {
              select: {
                id: true,
                name: true,
                specialty: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!entry) {
      throw new NotFoundException(`Puantaj bulunamadı: ${id}`);
    }

    return entry;
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    dto: UpdateTimesheetDto,
  ) {
    const existing = await this.findOne(tenantId, id);

    if (existing.status === 'PAID') {
      throw new BadRequestException('Ödenmiş puantaj düzenlenemez');
    }

    // Detaylar varsa yeniden hesapla
    let totalAmount: Prisma.Decimal | undefined;
    let totalHours: Prisma.Decimal | undefined;
    let presentCount: number | undefined;

    if (dto.details) {
      totalAmount = new Prisma.Decimal(0);
      totalHours = new Prisma.Decimal(0);
      presentCount = 0;

      for (const d of dto.details) {
        const earning = this.calculateEarning(d);
        totalAmount = totalAmount.add(earning);
        totalHours = totalHours.add(new Prisma.Decimal(d.hoursWorked));
        if (!d.absent) presentCount++;
      }
    }

    // TRANSACTION: önce detayları sil, sonra yeniden oluştur (ENTRY yi sil değil)
    const result = await this.prisma.$transaction(async (tx) => {
      // Detaylar değiştiyse
      if (dto.details) {
        await tx.timesheetEntryDetail.deleteMany({
          where: { timesheetEntryId: id },
        });

        await tx.timesheetEntryDetail.createMany({
          data: dto.details.map((d) => ({
            tenantId,
            timesheetEntryId: id,
            employeeId: d.employeeId,
            absent: d.absent ?? false,
            hoursWorked: d.hoursWorked,
            dailyWage: d.dailyWage,
            overtimeHours: d.overtimeHours ?? 0,
            overtimeMultiplier: d.overtimeMultiplier ?? 1.5,
            totalEarning: this.calculateEarning(d),
            notes: d.notes,
          })),
        });
      }

      // Entry güncelle
      const updated = await tx.timesheetEntry.update({
        where: { id },
        data: {
          ...(dto.date !== undefined && { date: new Date(dto.date) }),
          ...(dto.workDescription !== undefined && {
            workDescription: dto.workDescription,
          }),
          ...(dto.approvedBy !== undefined && { approvedBy: dto.approvedBy }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
          ...(totalAmount !== undefined && { totalAmount }),
          ...(totalHours !== undefined && { totalHours }),
          ...(presentCount !== undefined && { employeeCount: presentCount }),
          updatedBy: userId,
        },
        include: {
          subcontractor: { select: { id: true, code: true, name: true } },
          project: { select: { id: true, code: true, name: true } },
          details: {
            include: {
              employee: { select: { id: true, name: true, specialty: true } },
            },
          },
        },
      });

      return updated;
    });

    this.logger.log(`✏️  Puantaj güncellendi: ${id}`);

    return result;
  }

  async approve(tenantId: string, userId: string, id: string) {
    const entry = await this.findOne(tenantId, id);

    if (entry.status !== 'DRAFT') {
      throw new BadRequestException(
        `Sadece taslak (DRAFT) puantajlar onaylanabilir. Mevcut: ${entry.status}`,
      );
    }

    const updated = await this.prisma.timesheetEntry.update({
      where: { id },
      data: {
        status: 'APPROVED',
        updatedBy: userId,
      },
    });

    this.logger.log(`✅ Puantaj onaylandı: ${id}`);

    return updated;
  }

  async remove(tenantId: string, userId: string, id: string) {
    const entry = await this.findOne(tenantId, id);

    if (entry.status === 'PAID') {
      throw new BadRequestException('Ödenmiş puantaj silinemez');
    }

    await this.prisma.timesheetEntry.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: userId,
      },
    });

    this.logger.log(`🗑️  Puantaj silindi (soft): ${id}`);

    return { message: 'Puantaj silindi', id };
  }
}