import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@insaat-erp/database';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly BCRYPT_ROUNDS = 12;

  constructor(private readonly prisma: PrismaService) {}

  // ────────────────────────────────────
  // CREATE
  // ────────────────────────────────────
  async create(tenantId: string, creatorUserId: string, dto: CreateUserDto) {
    // 1. Email çakışma kontrolü (tenant içinde)
    const existing = await this.prisma.user.findFirst({
      where: {
        tenantId,
        email: dto.email,
        deletedAt: null,
      },
    });
    if (existing) {
      throw new ConflictException(`'${dto.email}' bu firma için zaten kayıtlı`);
    }

    // 2. Rolleri DB'den çek (slug'lar geçerli mi?)
    const roles = await this.findRolesBySlug(tenantId, dto.roleSlugs);
    if (roles.length !== dto.roleSlugs.length) {
      const foundSlugs = roles.map((r) => r.slug);
      const missing = dto.roleSlugs.filter((s) => !foundSlugs.includes(s));
      throw new BadRequestException(
        `Bu rol(ler) bulunamadı: ${missing.join(', ')}`,
      );
    }

    // 3. Şifre hash
    const hashedPassword = await bcrypt.hash(dto.password, this.BCRYPT_ROUNDS);

    // 4. Transaction: user oluştur + rolleri ata
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          tenantId,
          email: dto.email,
          password: hashedPassword,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          status: dto.status ?? 'ACTIVE',
          createdBy: creatorUserId,
          updatedBy: creatorUserId,
        },
      });

      await tx.userRole.createMany({
        data: roles.map((role) => ({
          userId: user.id,
          roleId: role.id,
          assignedBy: creatorUserId,
        })),
      });

      return user;
    });

    this.logger.log(
      `👤 Yeni kullanıcı: ${result.email} | roller: ${dto.roleSlugs.join(',')} | tenant: ${tenantId}`,
    );

    return this.findOne(tenantId, result.id);
  }

  // ────────────────────────────────────
  // LIST
  // ────────────────────────────────────
  async findAll(tenantId: string, query: ListUsersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      tenantId,
      deletedAt: null,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.role) {
      where.userRoles = {
        some: {
          role: { slug: query.role },
        },
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: this.userSelect(),
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: items.map((u) => this.mapUser(u)),
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
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
      select: this.userSelect(),
    });

    if (!user) {
      throw new NotFoundException(`Kullanıcı bulunamadı: ${id}`);
    }

    return this.mapUser(user);
  }

  // ────────────────────────────────────
  // UPDATE
  // ────────────────────────────────────
  async update(
    tenantId: string,
    updaterUserId: string,
    id: string,
    dto: UpdateUserDto,
  ) {
    await this.findOne(tenantId, id);

    await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.status !== undefined && { status: dto.status }),
        updatedBy: updaterUserId,
      },
    });

    this.logger.log(`✏️  Kullanıcı güncellendi: ${id} | tenant: ${tenantId}`);

    return this.findOne(tenantId, id);
  }

  // ────────────────────────────────────
  // DELETE (soft)
  // ────────────────────────────────────
  async remove(tenantId: string, deleterUserId: string, id: string) {
    // Kendi kendini silmeyi engelle
    if (id === deleterUserId) {
      throw new ForbiddenException('Kendi hesabınızı silemezsiniz');
    }

    await this.findOne(tenantId, id);

    await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: deleterUserId,
      },
    });

    // Aktif refresh token'ları da iptal et (güvenlik)
    await this.prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    this.logger.log(`🗑️  Kullanıcı silindi (soft): ${id} | tenant: ${tenantId}`);

    return { message: 'Kullanıcı başarıyla silindi', id };
  }

  // ────────────────────────────────────
  // UPDATE ROLES
  // ────────────────────────────────────
  async updateRoles(
    tenantId: string,
    updaterUserId: string,
    id: string,
    dto: UpdateUserRolesDto,
  ) {
    await this.findOne(tenantId, id);

    // Yeni rolleri bul
    const roles = await this.findRolesBySlug(tenantId, dto.roleSlugs);
    if (roles.length !== dto.roleSlugs.length) {
      const foundSlugs = roles.map((r) => r.slug);
      const missing = dto.roleSlugs.filter((s) => !foundSlugs.includes(s));
      throw new BadRequestException(
        `Bu rol(ler) bulunamadı: ${missing.join(', ')}`,
      );
    }

    // Transaction: eski rolleri sil + yenilerini ekle
    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId: id } });
      await tx.userRole.createMany({
        data: roles.map((role) => ({
          userId: id,
          roleId: role.id,
          assignedBy: updaterUserId,
        })),
      });
    });

    this.logger.log(
      `🔄 Roller güncellendi: ${id} → [${dto.roleSlugs.join(',')}] | tenant: ${tenantId}`,
    );

    return this.findOne(tenantId, id);
  }

  // ────────────────────────────────────
  // CHANGE PASSWORD (admin tarafından)
  // ────────────────────────────────────
  async changePassword(
    tenantId: string,
    adminUserId: string,
    targetUserId: string,
    dto: ChangePasswordDto,
  ) {
    await this.findOne(tenantId, targetUserId);

    const hashedPassword = await bcrypt.hash(dto.newPassword, this.BCRYPT_ROUNDS);

    await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        password: hashedPassword,
        updatedBy: adminUserId,
      },
    });

    // Tüm refresh token'ları iptal et (güvenlik)
    await this.prisma.refreshToken.updateMany({
      where: { userId: targetUserId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    this.logger.log(
      `🔑 Şifre değiştirildi: ${targetUserId} (admin: ${adminUserId})`,
    );

    return { message: 'Şifre başarıyla değiştirildi' };
  }
  
  // ────────────────────────────────────
  // STATS
  // ────────────────────────────────────
  async getStats(tenantId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const baseWhere = {
      tenantId,
      deletedAt: null,
    };

    const [total, active, inactive, thisMonthCreated] = await Promise.all([
      this.prisma.user.count({ where: baseWhere }),
      this.prisma.user.count({ where: { ...baseWhere, status: 'ACTIVE' } }),
      this.prisma.user.count({ where: { ...baseWhere, status: 'INACTIVE' } }),
      this.prisma.user.count({
        where: { ...baseWhere, createdAt: { gte: monthStart } },
      }),
    ]);

    return {
      total,
      active,
      inactive,
      thisMonthCreated,
    };
  }

  // ────────────────────────────────────
  // YARDIMCI METODLAR
  // ────────────────────────────────────

  private async findRolesBySlug(tenantId: string, slugs: string[]) {
    return this.prisma.role.findMany({
      where: {
        slug: { in: slugs },
        deletedAt: null,
        OR: [
          { tenantId }, // Tenant'a özel roller
          { tenantId: null, isSystem: true }, // Sistem rolleri
        ],
      },
    });
  }

  private userSelect() {
    return {
      id: true,
      tenantId: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      status: true,
      emailVerifiedAt: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      userRoles: {
        select: {
          role: {
            select: {
              id: true,
              slug: true,
              name: true,
            },
          },
        },
      },
    };
  }

  private mapUser(user: {
    userRoles: { role: { id: string; slug: string; name: string } }[];
    [k: string]: unknown;
  }) {
    const { userRoles, ...rest } = user;
    return {
      ...rest,
      roles: userRoles.map((ur) => ur.role),
    };
  }
}