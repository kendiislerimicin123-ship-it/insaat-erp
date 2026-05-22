import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@insaat-erp/database';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubcontractorDto } from './dto/create-subcontractor.dto';
import { UpdateSubcontractorDto } from './dto/update-subcontractor.dto';
import { ListSubcontractorsDto } from './dto/list-subcontractors.dto';

@Injectable()
export class SubcontractorsService {
  private readonly logger = new Logger(SubcontractorsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    userId: string,
    dto: CreateSubcontractorDto,
  ) {
    const existing = await this.prisma.subcontractor.findFirst({
      where: { tenantId, code: dto.code, deletedAt: null },
    });

    if (existing) {
      throw new ConflictException(
        `Bu firma için '${dto.code}' kodlu bir taşeron zaten var`,
      );
    }

    const subcontractor = await this.prisma.subcontractor.create({
      data: {
        tenantId,
        code: dto.code,
        name: dto.name,
        category: dto.category ?? 'OTHER',
        status: dto.status ?? 'ACTIVE',
        contactPerson: dto.contactPerson,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        city: dto.city,
        district: dto.district,
        taxNumber: dto.taxNumber,
        taxOffice: dto.taxOffice,
        tradeRegistry: dto.tradeRegistry,
        iban: dto.iban,
        notes: dto.notes,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    this.logger.log(
      `🔧 Yeni taşeron: ${subcontractor.code} (${subcontractor.name}) | tenant: ${tenantId}`,
    );

    return subcontractor;
  }

  async findAll(tenantId: string, query: ListSubcontractorsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.SubcontractorWhereInput = {
      tenantId,
      deletedAt: null,
    };

    if (query.category) where.category = query.category;
    if (query.status) where.status = query.status;
    if (query.city) where.city = { contains: query.city, mode: 'insensitive' };

    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
        { contactPerson: { contains: query.search, mode: 'insensitive' } },
        { taxNumber: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.subcontractor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.subcontractor.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(tenantId: string, id: string) {
    const sub = await this.prisma.subcontractor.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!sub) {
      throw new NotFoundException(`Taşeron bulunamadı: ${id}`);
    }

    return sub;
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    dto: UpdateSubcontractorDto,
  ) {
    await this.findOne(tenantId, id);

    if (dto.code) {
      const conflict = await this.prisma.subcontractor.findFirst({
        where: {
          tenantId,
          code: dto.code,
          id: { not: id },
          deletedAt: null,
        },
      });
      if (conflict) {
        throw new ConflictException(
          `Bu firma için '${dto.code}' kodlu başka bir taşeron var`,
        );
      }
    }

    const updated = await this.prisma.subcontractor.update({
      where: { id },
      data: {
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.contactPerson !== undefined && {
          contactPerson: dto.contactPerson,
        }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.district !== undefined && { district: dto.district }),
        ...(dto.taxNumber !== undefined && { taxNumber: dto.taxNumber }),
        ...(dto.taxOffice !== undefined && { taxOffice: dto.taxOffice }),
        ...(dto.tradeRegistry !== undefined && {
          tradeRegistry: dto.tradeRegistry,
        }),
        ...(dto.iban !== undefined && { iban: dto.iban }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        updatedBy: userId,
      },
    });

    this.logger.log(`✏️  Taşeron güncellendi: ${updated.code}`);

    return updated;
  }

  async remove(tenantId: string, userId: string, id: string) {
    await this.findOne(tenantId, id);

    const deleted = await this.prisma.subcontractor.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: userId,
      },
    });

    this.logger.log(`🗑️  Taşeron silindi (soft): ${deleted.code}`);

    return { message: 'Taşeron başarıyla silindi', id: deleted.id };
  }

  async getStats(tenantId: string) {
    const baseWhere = { tenantId, deletedAt: null };

    const [total, active, inactive, blacklisted] = await Promise.all([
      this.prisma.subcontractor.count({ where: baseWhere }),
      this.prisma.subcontractor.count({
        where: { ...baseWhere, status: 'ACTIVE' },
      }),
      this.prisma.subcontractor.count({
        where: { ...baseWhere, status: 'INACTIVE' },
      }),
      this.prisma.subcontractor.count({
        where: { ...baseWhere, status: 'BLACKLISTED' },
      }),
    ]);

    return { total, active, inactive, blacklisted };
  }
}