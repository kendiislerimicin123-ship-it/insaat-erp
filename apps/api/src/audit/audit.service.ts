import { Injectable, Logger } from '@nestjs/common';
import { AuditAction, Prisma } from '@insaat-erp/database';
import { PrismaService } from '../prisma/prisma.service';

interface CreateAuditLogInput {
  action: AuditAction;
  resource: string;
  resourceId?: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  tenantId?: string | null;
  userId?: string | null;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Yeni audit log kaydı oluşturur.
   * Hata olursa request'i bozmaz, sadece log atar.
   */
  async log(input: CreateAuditLogInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: input.action,
          resource: input.resource,
          resourceId: input.resourceId,
          oldValues: input.oldValues
            ? (this.sanitize(input.oldValues) as Prisma.InputJsonValue)
            : undefined,
          newValues: input.newValues
            ? (this.sanitize(input.newValues) as Prisma.InputJsonValue)
            : undefined,
          metadata: input.metadata
            ? (this.sanitize(input.metadata) as Prisma.InputJsonValue)
            : undefined,
          tenantId: input.tenantId,
          userId: input.userId,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
      });
    } catch (error) {
      // Audit log hatası asla request'i bozmaz
      this.logger.error('Audit log yazılamadı', error);
    }
  }

  /**
   * Tenant'a ait audit log'ları listeler.
   */
  async findByTenant(
    tenantId: string,
    options: {
      page?: number;
      limit?: number;
      action?: AuditAction;
      resource?: string;
      userId?: string;
      from?: Date;
      to?: Date;
    },
  ) {
    const page = options.page ?? 1;
    const limit = options.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      tenantId,
      ...(options.action && { action: options.action }),
      ...(options.resource && { resource: options.resource }),
      ...(options.userId && { userId: options.userId }),
      ...((options.from || options.to) && {
        createdAt: {
          ...(options.from && { gte: options.from }),
          ...(options.to && { lte: options.to }),
        },
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
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

  /**
   * Şifre, token gibi hassas alanları log'tan temizle.
   */
  private sanitize(data: Record<string, unknown>): Record<string, unknown> {
    const SENSITIVE_KEYS = [
      'password',
      'token',
      'accessToken',
      'refreshToken',
      'secret',
      'apiKey',
      'authorization',
    ];

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (SENSITIVE_KEYS.some((k) => key.toLowerCase().includes(k.toLowerCase()))) {
        result[key] = '***REDACTED***';
      } else {
        result[key] = value;
      }
    }
    return result;
  }
}