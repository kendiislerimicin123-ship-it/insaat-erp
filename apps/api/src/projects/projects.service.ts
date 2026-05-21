import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@insaat-erp/database';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ListProjectsDto } from './dto/list-projects.dto';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ────────────────────────────────────
  // CREATE
  // ────────────────────────────────────
  async create(tenantId: string, userId: string, dto: CreateProjectDto) {
    // Aynı tenant'ta proje kodu çakışması kontrolü
    const existing = await this.prisma.project.findFirst({
      where: {
        tenantId,
        code: dto.code,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Bu firma için '${dto.code}' kodlu bir proje zaten var`,
      );
    }

    const project = await this.prisma.project.create({
      data: {
        tenantId,
        code: dto.code,
        name: dto.name,
        description: dto.description,
        status: dto.status ?? 'PLANNING',
        address: dto.address,
        city: dto.city,
        district: dto.district,
        clientName: dto.clientName,
        clientTaxNumber: dto.clientTaxNumber,
        clientPhone: dto.clientPhone,
        clientEmail: dto.clientEmail,
        contractAmount: dto.contractAmount,
        currency: dto.currency ?? 'TRY',
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    this.logger.log(`📁 Yeni proje: ${project.code} (${project.name}) | tenant: ${tenantId}`);

    return project;
  }

  // ────────────────────────────────────
  // LIST (pagination + filter)
  // ────────────────────────────────────
  async findAll(tenantId: string, query: ListProjectsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProjectWhereInput = {
      tenantId,
      deletedAt: null,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.city) {
      where.city = { contains: query.city, mode: 'insensitive' };
    }

    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
        { clientName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.project.count({ where }),
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

  // ────────────────────────────────────
  // GET ONE
  // ────────────────────────────────────
  async findOne(tenantId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id,
        tenantId, // KRİTİK: tenant kontrolü
        deletedAt: null,
      },
    });

    if (!project) {
      throw new NotFoundException(`Proje bulunamadı: ${id}`);
    }

    return project;
  }

  // ────────────────────────────────────
  // UPDATE
  // ────────────────────────────────────
  async update(
    tenantId: string,
    userId: string,
    id: string,
    dto: UpdateProjectDto,
  ) {
    // Önce proje var mı + bu tenant'a mı ait kontrolü
    await this.findOne(tenantId, id);

    // Kod değişiyorsa çakışma kontrolü
    if (dto.code) {
      const conflict = await this.prisma.project.findFirst({
        where: {
          tenantId,
          code: dto.code,
          id: { not: id },
          deletedAt: null,
        },
      });
      if (conflict) {
        throw new ConflictException(
          `Bu firma için '${dto.code}' kodlu başka bir proje var`,
        );
      }
    }

    const updated = await this.prisma.project.update({
      where: { id },
      data: {
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.district !== undefined && { district: dto.district }),
        ...(dto.clientName !== undefined && { clientName: dto.clientName }),
        ...(dto.clientTaxNumber !== undefined && {
          clientTaxNumber: dto.clientTaxNumber,
        }),
        ...(dto.clientPhone !== undefined && { clientPhone: dto.clientPhone }),
        ...(dto.clientEmail !== undefined && { clientEmail: dto.clientEmail }),
        ...(dto.contractAmount !== undefined && {
          contractAmount: dto.contractAmount,
        }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.startDate !== undefined && {
          startDate: dto.startDate ? new Date(dto.startDate) : null,
        }),
        ...(dto.endDate !== undefined && {
          endDate: dto.endDate ? new Date(dto.endDate) : null,
        }),
        ...(dto.actualEndDate !== undefined && {
          actualEndDate: dto.actualEndDate ? new Date(dto.actualEndDate) : null,
        }),
        updatedBy: userId,
      },
    });

    this.logger.log(`✏️  Proje güncellendi: ${updated.code} | tenant: ${tenantId}`);

    return updated;
  }

  // ────────────────────────────────────
  // DELETE (soft delete)
  // ────────────────────────────────────
  async remove(tenantId: string, userId: string, id: string) {
    await this.findOne(tenantId, id);

    const deleted = await this.prisma.project.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: userId,
      },
    });

    this.logger.log(`🗑️  Proje silindi (soft): ${deleted.code} | tenant: ${tenantId}`);

    return {
      message: 'Proje başarıyla silindi',
      id: deleted.id,
    };
  }
}