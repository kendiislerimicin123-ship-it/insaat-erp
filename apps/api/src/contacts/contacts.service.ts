import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@insaat-erp/database';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ListContactsDto } from './dto/list-contacts.dto';

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, userId: string, dto: CreateContactDto) {
    const existing = await this.prisma.contact.findFirst({
      where: { tenantId, code: dto.code, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException(
        `Bu firma için '${dto.code}' kodlu bir cari zaten var`,
      );
    }

    const contact = await this.prisma.contact.create({
      data: {
        tenantId,
        code: dto.code,
        name: dto.name,
        type: dto.type,
        status: dto.status ?? 'ACTIVE',
        contactPerson: dto.contactPerson,
        phone: dto.phone,
        email: dto.email,
        website: dto.website,
        address: dto.address,
        city: dto.city,
        district: dto.district,
        country: dto.country ?? 'Türkiye',
        taxNumber: dto.taxNumber,
        taxOffice: dto.taxOffice,
        tradeRegistry: dto.tradeRegistry,
        iban: dto.iban,
        bankName: dto.bankName,
        paymentTerms: dto.paymentTerms,
        creditLimit: dto.creditLimit,
        currency: dto.currency ?? 'TRY',
        notes: dto.notes,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    this.logger.log(
      `👥 Yeni cari: ${contact.code} (${contact.name}) | tip: ${contact.type}`,
    );

    return contact;
  }

  async findAll(tenantId: string, query: ListContactsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ContactWhereInput = {
      tenantId,
      deletedAt: null,
    };

    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.city) where.city = { contains: query.city, mode: 'insensitive' };

    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
        { contactPerson: { contains: query.search, mode: 'insensitive' } },
        { taxNumber: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.contact.count({ where }),
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
    const contact = await this.prisma.contact.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!contact) {
      throw new NotFoundException(`Cari bulunamadı: ${id}`);
    }

    return contact;
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    dto: UpdateContactDto,
  ) {
    await this.findOne(tenantId, id);

    if (dto.code) {
      const conflict = await this.prisma.contact.findFirst({
        where: {
          tenantId,
          code: dto.code,
          id: { not: id },
          deletedAt: null,
        },
      });
      if (conflict) {
        throw new ConflictException(
          `Bu firma için '${dto.code}' kodlu başka bir cari var`,
        );
      }
    }

    const updated = await this.prisma.contact.update({
      where: { id },
      data: {
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.contactPerson !== undefined && { contactPerson: dto.contactPerson }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.website !== undefined && { website: dto.website }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.district !== undefined && { district: dto.district }),
        ...(dto.country !== undefined && { country: dto.country }),
        ...(dto.taxNumber !== undefined && { taxNumber: dto.taxNumber }),
        ...(dto.taxOffice !== undefined && { taxOffice: dto.taxOffice }),
        ...(dto.tradeRegistry !== undefined && { tradeRegistry: dto.tradeRegistry }),
        ...(dto.iban !== undefined && { iban: dto.iban }),
        ...(dto.bankName !== undefined && { bankName: dto.bankName }),
        ...(dto.paymentTerms !== undefined && { paymentTerms: dto.paymentTerms }),
        ...(dto.creditLimit !== undefined && { creditLimit: dto.creditLimit }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        updatedBy: userId,
      },
    });

    this.logger.log(`✏️  Cari güncellendi: ${updated.code}`);

    return updated;
  }

  async remove(tenantId: string, userId: string, id: string) {
    await this.findOne(tenantId, id);

    const deleted = await this.prisma.contact.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: userId,
      },
    });

    this.logger.log(`🗑️  Cari silindi (soft): ${deleted.code}`);

    return { message: 'Cari başarıyla silindi', id: deleted.id };
  }

  async getStats(tenantId: string) {
    const baseWhere = { tenantId, deletedAt: null };

    const [total, suppliers, customers, both, balances] = await Promise.all([
      this.prisma.contact.count({ where: baseWhere }),
      this.prisma.contact.count({
        where: { ...baseWhere, type: 'SUPPLIER' },
      }),
      this.prisma.contact.count({
        where: { ...baseWhere, type: 'CUSTOMER' },
      }),
      this.prisma.contact.count({
        where: { ...baseWhere, type: 'BOTH' },
      }),
      this.prisma.contact.aggregate({
        where: baseWhere,
        _sum: { currentBalance: true },
      }),
    ]);

    return {
      total,
      suppliers,
      customers,
      both,
      totalBalance: balances._sum.currentBalance?.toString() ?? '0',
    };
  }
}