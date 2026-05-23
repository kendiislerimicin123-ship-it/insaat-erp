import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@insaat-erp/database';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { ListEmployeesDto } from './dto/list-employees.dto';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, userId: string, dto: CreateEmployeeDto) {
    const subcontractor = await this.prisma.subcontractor.findFirst({
      where: { id: dto.subcontractorId, tenantId, deletedAt: null },
    });
    if (!subcontractor) {
      throw new BadRequestException(`Taşeron bulunamadı: ${dto.subcontractorId}`);
    }

    const employee = await this.prisma.subcontractorEmployee.create({
      data: {
        tenantId,
        subcontractorId: dto.subcontractorId,
        name: dto.name,
        tcNo: dto.tcNo,
        phone: dto.phone,
        specialty: dto.specialty,
        role: dto.role,
        dailyWage: dto.dailyWage,
        currency: dto.currency ?? 'TRY',
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        status: dto.status ?? 'ACTIVE',
        notes: dto.notes,
        createdBy: userId,
        updatedBy: userId,
      },
      include: {
        subcontractor: { select: { id: true, code: true, name: true } },
      },
    });

    this.logger.log(
      `👷 Yeni işçi: ${employee.name} (${employee.specialty}) | taşeron: ${subcontractor.code}`,
    );

    return employee;
  }

  async findAll(tenantId: string, query: ListEmployeesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: Prisma.SubcontractorEmployeeWhereInput = {
      tenantId,
      deletedAt: null,
    };

    if (query.subcontractorId) where.subcontractorId = query.subcontractorId;
    if (query.specialty) where.specialty = query.specialty;
    if (query.status) where.status = query.status;

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { tcNo: { contains: query.search } },
        { phone: { contains: query.search } },
        { role: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.subcontractorEmployee.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          subcontractor: { select: { id: true, code: true, name: true } },
        },
      }),
      this.prisma.subcontractorEmployee.count({ where }),
    ]);

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(tenantId: string, id: string) {
    const employee = await this.prisma.subcontractorEmployee.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        subcontractor: { select: { id: true, code: true, name: true } },
      },
    });

    if (!employee) {
      throw new NotFoundException(`İşçi bulunamadı: ${id}`);
    }

    return employee;
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    dto: UpdateEmployeeDto,
  ) {
    await this.findOne(tenantId, id);

    const updated = await this.prisma.subcontractorEmployee.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.tcNo !== undefined && { tcNo: dto.tcNo }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.specialty !== undefined && { specialty: dto.specialty }),
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.dailyWage !== undefined && { dailyWage: dto.dailyWage }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.startDate !== undefined && {
          startDate: dto.startDate ? new Date(dto.startDate) : null,
        }),
        ...(dto.endDate !== undefined && {
          endDate: dto.endDate ? new Date(dto.endDate) : null,
        }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        updatedBy: userId,
      },
      include: {
        subcontractor: { select: { id: true, code: true, name: true } },
      },
    });

    this.logger.log(`✏️  İşçi güncellendi: ${updated.name}`);

    return updated;
  }

  async remove(tenantId: string, userId: string, id: string) {
    const employee = await this.findOne(tenantId, id);

    // Aktif puantaj kaydı var mı?
    const detailCount = await this.prisma.timesheetEntryDetail.count({
      where: { employeeId: id },
    });

    if (detailCount > 0) {
      throw new BadRequestException(
        `Bu işçiye ait ${detailCount} puantaj kaydı var. Önce kayıtlar silinmeli veya işçi pasif yapılmalı.`,
      );
    }

    await this.prisma.subcontractorEmployee.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: userId,
      },
    });

    this.logger.log(`🗑️  İşçi silindi (soft): ${employee.name}`);

    return { message: 'İşçi silindi', id };
  }
}