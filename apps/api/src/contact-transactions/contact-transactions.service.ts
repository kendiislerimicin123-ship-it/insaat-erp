import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@insaat-erp/database';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateContactTransactionDto,
  ListContactTransactionsDto,
} from './dto/create-contact-transaction.dto';

@Injectable()
export class ContactTransactionsService {
  private readonly logger = new Logger(ContactTransactionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ────────────────────────────────────
  // CREATE (Transaction içinde bakiye güncelleme)
  // ────────────────────────────────────
  async create(
    tenantId: string,
    userId: string,
    dto: CreateContactTransactionDto,
  ) {
    // Cari bu tenant'a mı ait?
    const contact = await this.prisma.contact.findFirst({
      where: { id: dto.contactId, tenantId, deletedAt: null },
    });
    if (!contact) {
      throw new BadRequestException(`Cari bulunamadı: ${dto.contactId}`);
    }

    const amount = new Prisma.Decimal(dto.amount);
    const currentBalance = new Prisma.Decimal(contact.currentBalance.toString());

    // Bakiye değişim mantığı:
    //   CREDIT  (Alacak)   → bakiye artar (cari bize daha çok borçlandı)
    //   PAYMENT (Ödeme)    → bakiye artar (biz cariye ödedik, ona olan borcumuz azaldı)
    //   DEBT    (Borç)     → bakiye azalır (biz cariye borçlandık)
    //   COLLECTION (Tahsilat) → bakiye azalır (cariden tahsil ettik, alacağımız azaldı)
    let balanceChange: Prisma.Decimal;
    if (dto.type === 'CREDIT' || dto.type === 'PAYMENT') {
      balanceChange = amount;
    } else {
      balanceChange = amount.neg(); // negatif
    }

    const newBalance = currentBalance.add(balanceChange);

    // TRANSACTION: hareket + cari bakiye atomik
    const result = await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.contactTransaction.create({
        data: {
          tenantId,
          contactId: dto.contactId,
          type: dto.type,
          amount,
          currency: dto.currency ?? 'TRY',
          date: new Date(dto.date),
          documentNo: dto.documentNo,
          description: dto.description,
          paymentMethod: dto.paymentMethod,
          bankReference: dto.bankReference,
          balanceAfter: newBalance,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      await tx.contact.update({
        where: { id: dto.contactId },
        data: {
          currentBalance: newBalance,
          updatedBy: userId,
        },
      });

      return transaction;
    });

    this.logger.log(
      `💸 Cari hareket: ${contact.code} | ${dto.type} ${amount.toString()} ${dto.currency ?? 'TRY'} | yeni bakiye: ${newBalance.toString()}`,
    );

    return result;
  }

  // ────────────────────────────────────
  // LIST (cari ekstre veya tüm hareketler)
  // ────────────────────────────────────
  async findAll(tenantId: string, query: ListContactTransactionsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: Prisma.ContactTransactionWhereInput = {
      tenantId,
      deletedAt: null,
    };

    if (query.contactId) where.contactId = query.contactId;
    if (query.type) where.type = query.type;

    if (query.from || query.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(query.from);
      if (query.to) where.date.lte = new Date(query.to);
    }

    const [items, total, summary] = await Promise.all([
      this.prisma.contactTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        include: {
          contact: { select: { id: true, code: true, name: true } },
        },
      }),
      this.prisma.contactTransaction.count({ where }),
      this.prisma.contactTransaction.groupBy({
        by: ['type'],
        where,
        _sum: { amount: true },
      }),
    ]);

    // Özet (tipler bazında toplamlar)
    const sumByType = {
      DEBT: '0',
      CREDIT: '0',
      PAYMENT: '0',
      COLLECTION: '0',
    };
    for (const s of summary) {
      sumByType[s.type] = s._sum.amount?.toString() ?? '0';
    }

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: sumByType,
    };
  }

  // ────────────────────────────────────
  // DELETE (Soft, bakiye geri al)
  // ────────────────────────────────────
  async remove(tenantId: string, userId: string, id: string) {
    const transaction = await this.prisma.contactTransaction.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!transaction) {
      throw new NotFoundException(`Cari hareket bulunamadı: ${id}`);
    }

    // TRANSACTION: hareketi sil + cari bakiyesi geri al
    await this.prisma.$transaction(async (tx) => {
      const contact = await tx.contact.findUnique({
        where: { id: transaction.contactId },
      });
      if (!contact) {
        throw new NotFoundException('Cari bulunamadı');
      }

      const currentBalance = new Prisma.Decimal(contact.currentBalance.toString());
      const amount = new Prisma.Decimal(transaction.amount.toString());

      // Ters işlem
      let revert: Prisma.Decimal;
      if (transaction.type === 'CREDIT' || transaction.type === 'PAYMENT') {
        revert = amount.neg(); // yapılan toplamayı geri çıkar
      } else {
        revert = amount; // yapılan çıkarmayı geri ekle
      }

      const newBalance = currentBalance.add(revert);

      await tx.contact.update({
        where: { id: transaction.contactId },
        data: {
          currentBalance: newBalance,
          updatedBy: userId,
        },
      });

      await tx.contactTransaction.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          updatedBy: userId,
        },
      });
    });

    this.logger.log(`🗑️  Cari hareket silindi (soft): ${id}`);

    return { message: 'Cari hareket silindi', id };
  }
}