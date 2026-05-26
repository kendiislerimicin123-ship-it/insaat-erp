import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Prisma } from '@insaat-erp/database';
import { PrismaService } from '../prisma/prisma.service';
import { ChequesService } from '../cheques/cheques.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ListExpensesDto } from './dto/list-expenses.dto';

@Injectable()
export class ExpensesService {
  private readonly logger = new Logger(ExpensesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => ChequesService))
    private readonly chequesService: ChequesService,
  ) {}

  // ════════════════════════════════════
  // CREATE (manuel)
  // ════════════════════════════════════
  async create(tenantId: string, userId: string, dto: CreateExpenseDto) {
    if (dto.projectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: dto.projectId, tenantId, deletedAt: null },
      });
      if (!project) throw new BadRequestException('Proje bulunamadı');
    }

    if (dto.contactId) {
      const contact = await this.prisma.contact.findFirst({
        where: { id: dto.contactId, tenantId, deletedAt: null },
      });
      if (!contact) throw new BadRequestException('Cari hesap bulunamadı');
    }

    if (dto.subcontractorId) {
      const sub = await this.prisma.subcontractor.findFirst({
        where: { id: dto.subcontractorId, tenantId, deletedAt: null },
      });
      if (!sub) throw new BadRequestException('Taşeron bulunamadı');
    }

    // Kod üret: GDR-2026-0001 (manuel için)
    const year = new Date().getFullYear();
    const count = await this.prisma.expense.count({
      where: { tenantId, code: { startsWith: `GDR-${year}-` } },
    });
    const code = `GDR-${year}-${String(count + 1).padStart(4, '0')}`;

    const amount = new Prisma.Decimal(dto.amount);
    const vatRate = new Prisma.Decimal(dto.vatRate ?? 0);
    const vatAmount = amount.mul(vatRate).div(100);
    const totalAmount = amount.add(vatAmount);

    const expense = await this.prisma.expense.create({
      data: {
        tenantId,
        code,
        category: dto.category,
        status: dto.status ?? 'CONFIRMED',
        amount,
        vatRate,
        vatAmount,
        totalAmount,
        currency: dto.currency ?? 'TRY',
        date: new Date(dto.date),
        description: dto.description,
        notes: dto.notes,
        projectId: dto.projectId,
        contactId: dto.contactId,
        subcontractorId: dto.subcontractorId,
        invoiceNo: dto.invoiceNo,
        taxNumber: dto.taxNumber,
        paymentMethod: dto.paymentMethod,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : null,
        createdBy: userId,
        updatedBy: userId,
      },
      include: {
        project: { select: { id: true, code: true, name: true } },
        contact: { select: { id: true, code: true, name: true, type: true } },
        subcontractor: { select: { id: true, code: true, name: true } },
      },
    });

    this.logger.log(`💸 Yeni gider: ${expense.code} (${dto.category}) ${totalAmount.toString()} ${expense.currency}`);

    // 🤖 OTOMATİK ÇEK ÜRETİMİ (sadece paymentMethod === 'CHEQUE' ise)
    if (dto.paymentMethod === 'CHEQUE') {
      await this.chequesService.createFromExpense(tenantId, expense.id, {
        chequeNo: dto.chequeNo,
        bankName: dto.bankName,
        dueDate: dto.dueDate,
      });
    }

    return expense;
  }

  // ════════════════════════════════════
  // FIND ALL
  // ════════════════════════════════════
  async findAll(tenantId: string, query: ListExpensesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ExpenseWhereInput = {
      tenantId,
      deletedAt: null,
    };

    if (query.category) where.category = query.category;
    if (query.status) where.status = query.status;
    if (query.projectId) where.projectId = query.projectId;
    if (query.contactId) where.contactId = query.contactId;
    if (query.subcontractorId) where.subcontractorId = query.subcontractorId;
    if (query.paymentMethod) where.paymentMethod = query.paymentMethod;

    if (query.from || query.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(query.from);
      if (query.to) where.date.lte = new Date(query.to);
    }

    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { invoiceNo: { contains: query.search, mode: 'insensitive' } },
        { taxNumber: { contains: query.search, mode: 'insensitive' } },
        { notes: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total, summary] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        include: {
          project: { select: { id: true, code: true, name: true } },
          contact: { select: { id: true, code: true, name: true, type: true } },
          subcontractor: { select: { id: true, code: true, name: true } },
        },
      }),
      this.prisma.expense.count({ where }),
      this.prisma.expense.aggregate({
        where,
        _sum: { totalAmount: true, vatAmount: true, amount: true },
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
        totalAmount: summary._sum?.totalAmount?.toString() ?? '0',
        totalVat: summary._sum?.vatAmount?.toString() ?? '0',
        totalNet: summary._sum?.amount?.toString() ?? '0',
      },
    };
  }

  // ════════════════════════════════════
  // FIND ONE
  // ════════════════════════════════════
  async findOne(tenantId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        project: { select: { id: true, code: true, name: true } },
        contact: { select: { id: true, code: true, name: true, type: true } },
        subcontractor: { select: { id: true, code: true, name: true } },
      },
    });

    if (!expense) {
      throw new NotFoundException(`Gider bulunamadı: ${id}`);
    }

    return expense;
  }

  // ════════════════════════════════════
  // UPDATE
  // ════════════════════════════════════
  async update(tenantId: string, userId: string, id: string, dto: UpdateExpenseDto) {
    const existing = await this.findOne(tenantId, id);

    if (existing.isAutoGenerated) {
      throw new BadRequestException(
        `Bu gider otomatik üretildi (${existing.sourceType}). Manuel düzenleme yapılamaz. Değişiklik için kaynak kaydı (hakediş/cari hareketi/puantaj) güncelleyin.`,
      );
    }

    const data: Prisma.ExpenseUpdateInput = {
      updatedBy: userId,
    };

    if (dto.category !== undefined) data.category = dto.category;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.date !== undefined) data.date = new Date(dto.date);
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.invoiceNo !== undefined) data.invoiceNo = dto.invoiceNo;
    if (dto.taxNumber !== undefined) data.taxNumber = dto.taxNumber;
    if (dto.paymentMethod !== undefined) data.paymentMethod = dto.paymentMethod;
    if (dto.paidAt !== undefined) data.paidAt = dto.paidAt ? new Date(dto.paidAt) : null;

    if (dto.projectId !== undefined) {
      data.project = dto.projectId
        ? { connect: { id: dto.projectId } }
        : { disconnect: true };
    }
    if (dto.contactId !== undefined) {
      data.contact = dto.contactId
        ? { connect: { id: dto.contactId } }
        : { disconnect: true };
    }
    if (dto.subcontractorId !== undefined) {
      data.subcontractor = dto.subcontractorId
        ? { connect: { id: dto.subcontractorId } }
        : { disconnect: true };
    }

    if (dto.amount !== undefined || dto.vatRate !== undefined) {
      const amount = new Prisma.Decimal(dto.amount ?? existing.amount.toString());
      const vatRate = new Prisma.Decimal(dto.vatRate ?? existing.vatRate.toString());
      const vatAmount = amount.mul(vatRate).div(100);
      data.amount = amount;
      data.vatRate = vatRate;
      data.vatAmount = vatAmount;
      data.totalAmount = amount.add(vatAmount);
    }

    const updated = await this.prisma.expense.update({
      where: { id },
      data,
      include: {
        project: { select: { id: true, code: true, name: true } },
        contact: { select: { id: true, code: true, name: true, type: true } },
        subcontractor: { select: { id: true, code: true, name: true } },
      },
    });

    this.logger.log(`✏️  Gider güncellendi: ${updated.code}`);

    return updated;
  }

  // ════════════════════════════════════
  // DELETE (soft)
  // ════════════════════════════════════
  async remove(tenantId: string, userId: string, id: string) {
    const expense = await this.findOne(tenantId, id);

    if (expense.isAutoGenerated) {
      throw new BadRequestException(
        `Bu gider otomatik üretildi (${expense.sourceType}). Manuel silinemez. Kaynak kaydı (hakediş/cari hareketi/puantaj) iptal edilirse otomatik silinir.`,
      );
    }

    await this.prisma.expense.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: userId,
      },
    });

    // 🤖 OTOMATİK ÇEK GERİ ÇEKME (eğer bu expense'ten çek üretildiyse)
    await this.chequesService.deleteBySource(tenantId, 'EXPENSE', id);

    this.logger.log(`🗑️  Gider silindi (soft): ${expense.code}`);

    return { message: 'Gider silindi', id };
  }

  // ════════════════════════════════════
  // STATS
  // ════════════════════════════════════
  async getStats(tenantId: string, from?: string, to?: string, projectId?: string) {
    const where: Prisma.ExpenseWhereInput = {
      tenantId,
      deletedAt: null,
      status: 'CONFIRMED',
    };

    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    if (projectId) where.projectId = projectId;

    const total = await this.prisma.expense.aggregate({
      where,
      _sum: { totalAmount: true, vatAmount: true, amount: true },
      _count: true,
    });

    const byCategory = await this.prisma.expense.groupBy({
      by: ['category'],
      where,
      _sum: { totalAmount: true },
      _count: true,
      orderBy: { _sum: { totalAmount: 'desc' } },
    });

    return {
      totalCount: total._count,
      totalAmount: total._sum?.totalAmount?.toString() ?? '0',
      totalVat: total._sum?.vatAmount?.toString() ?? '0',
      totalNet: total._sum?.amount?.toString() ?? '0',
      byCategory: byCategory.map((row) => ({
        category: row.category,
        count: row._count,
        amount: row._sum?.totalAmount?.toString() ?? '0',
      })),
    };
  }

  // ════════════════════════════════════════════════════════════════════
  // ⚙️  OTOMATİK HELPER METOTLAR (önceden eklenmiş)
  // ════════════════════════════════════════════════════════════════════

  private async generateAutoCode(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.expense.count({
      where: { tenantId, code: { startsWith: `OTO-${year}-` } },
    });
    return `OTO-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  private async existsFromSource(
    tenantId: string,
    sourceType: string,
    sourceId: string,
  ): Promise<boolean> {
    const existing = await this.prisma.expense.findFirst({
      where: {
        tenantId,
        sourceType: sourceType as any,
        sourceId,
        deletedAt: null,
      },
      select: { id: true },
    });
    return existing !== null;
  }

  // ════════════════════════════════════
  // HAKEDİŞ → EXPENSE
  // ════════════════════════════════════
  async createFromProgressPayment(tenantId: string, paymentId: string) {
    try {
      const payment = await this.prisma.progressPayment.findFirst({
        where: { id: paymentId, tenantId, deletedAt: null },
        include: {
          subcontractor: { select: { id: true, name: true } },
          project: { select: { id: true, code: true, name: true } },
        },
      });

      if (!payment) {
        this.logger.warn(`⚠️  ProgressPayment bulunamadı: ${paymentId}`);
        return null;
      }

      if (payment.status !== 'PAID') {
        this.logger.warn(`⚠️  ProgressPayment PAID değil (status=${payment.status}), atlanıyor: ${payment.code}`);
        return null;
      }

      if (await this.existsFromSource(tenantId, 'PROGRESS_PAYMENT', paymentId)) {
        this.logger.log(`ℹ️  Bu hakediş için zaten expense var, atlanıyor: ${payment.code}`);
        return null;
      }

      const code = await this.generateAutoCode(tenantId);
      const description = `Hakediş ödemesi - ${payment.subcontractor?.name ?? 'Bilinmiyor'} - ${payment.project?.name ?? 'Bilinmiyor'}`;

      const expense = await this.prisma.expense.create({
        data: {
          tenantId,
          code,
          category: 'SUBCONTRACTOR',
          status: 'CONFIRMED',
          amount: payment.amount,
          vatRate: payment.taxRate,
          vatAmount: payment.taxAmount,
          totalAmount: payment.totalAmount,
          currency: payment.currency,
          date: payment.paidAt ?? new Date(),
          description,
          projectId: payment.projectId,
          subcontractorId: payment.subcontractorId,
          paidAt: payment.paidAt,
          sourceType: 'PROGRESS_PAYMENT',
          sourceId: paymentId,
          isAutoGenerated: true,
          notes: `Kaynak: ${payment.code}`,
          createdBy: 'SYSTEM',
          updatedBy: 'SYSTEM',
        },
      });

      this.logger.log(`🤖 OTO Gider üretildi (Hakediş): ${expense.code} ← ${payment.code} (${payment.totalAmount.toString()} ${payment.currency})`);

      return expense;
    } catch (error) {
      this.logger.error(`❌ createFromProgressPayment hatası: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  // ════════════════════════════════════
  // CARİ HAREKETİ → EXPENSE
  // ════════════════════════════════════
  async createFromContactTransaction(tenantId: string, transactionId: string) {
    try {
      const tx = await this.prisma.contactTransaction.findFirst({
        where: { id: transactionId, tenantId },
        include: {
          contact: { select: { id: true, code: true, name: true, type: true } },
        },
      });

      if (!tx) {
        this.logger.warn(`⚠️  ContactTransaction bulunamadı: ${transactionId}`);
        return null;
      }

      if (tx.type !== 'PAYMENT') {
        return null;
      }

      if (await this.existsFromSource(tenantId, 'CONTACT_TRANSACTION', transactionId)) {
        this.logger.log(`ℹ️  Bu cari hareketi için zaten expense var, atlanıyor: ${transactionId}`);
        return null;
      }

      let category: 'SUPPLIER_PAYMENT' | 'OTHER' = 'OTHER';
      if (tx.contact?.type === 'SUPPLIER') category = 'SUPPLIER_PAYMENT';

      const code = await this.generateAutoCode(tenantId);
      const description = `Cari ödemesi - ${tx.contact?.name ?? 'Bilinmiyor'}${tx.description ? ` (${tx.description})` : ''}`;

      const expense = await this.prisma.expense.create({
        data: {
          tenantId,
          code,
          category,
          status: 'CONFIRMED',
          amount: tx.amount,
          vatRate: new Prisma.Decimal(0),
          vatAmount: new Prisma.Decimal(0),
          totalAmount: tx.amount,
          currency: tx.currency,
          date: tx.date,
          description,
          contactId: tx.contactId,
          paymentMethod: (tx.paymentMethod as Prisma.ExpenseCreateInput['paymentMethod']) ?? null,
          paidAt: tx.date,
          sourceType: 'CONTACT_TRANSACTION',
          sourceId: transactionId,
          isAutoGenerated: true,
          notes: `Kaynak: Cari hareketi ${transactionId.substring(0, 8)}`,
          createdBy: 'SYSTEM',
          updatedBy: 'SYSTEM',
        },
      });

      this.logger.log(`🤖 OTO Gider üretildi (Cari): ${expense.code} ← ${tx.contact?.name} (${tx.amount.toString()} ${tx.currency})`);

      return expense;
    } catch (error) {
      this.logger.error(`❌ createFromContactTransaction hatası: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  // ════════════════════════════════════
  // PUANTAJ → EXPENSE
  // ════════════════════════════════════
  async createFromTimesheet(tenantId: string, timesheetId: string) {
    try {
      const timesheet = await this.prisma.timesheetEntry.findFirst({
        where: { id: timesheetId, tenantId },
        include: {
          subcontractor: { select: { id: true, name: true } },
          project: { select: { id: true, code: true, name: true } },
        },
      });

      if (!timesheet) {
        this.logger.warn(`⚠️  Timesheet bulunamadı: ${timesheetId}`);
        return null;
      }

      if (timesheet.status !== 'APPROVED') {
        this.logger.warn(`⚠️  Timesheet APPROVED değil (status=${timesheet.status}), atlanıyor: ${timesheetId}`);
        return null;
      }

      if (!timesheet.totalAmount || new Prisma.Decimal(timesheet.totalAmount).lte(0)) {
        this.logger.warn(`⚠️  Timesheet totalAmount sıfır/negatif, atlanıyor: ${timesheetId}`);
        return null;
      }

      if (await this.existsFromSource(tenantId, 'TIMESHEET', timesheetId)) {
        this.logger.log(`ℹ️  Bu puantaj için zaten expense var, atlanıyor: ${timesheetId}`);
        return null;
      }

      const code = await this.generateAutoCode(tenantId);
      const dateStr = timesheet.date.toLocaleDateString('tr-TR');
      const description = `Puantaj ödemesi - ${timesheet.subcontractor?.name ?? 'Bilinmiyor'} - ${timesheet.project?.name ?? 'Bilinmiyor'} (${dateStr})`;

      const expense = await this.prisma.expense.create({
        data: {
          tenantId,
          code,
          category: 'LABOR',
          status: 'CONFIRMED',
          amount: timesheet.totalAmount,
          vatRate: new Prisma.Decimal(0),
          vatAmount: new Prisma.Decimal(0),
          totalAmount: timesheet.totalAmount,
          currency: timesheet.currency,
          date: timesheet.date,
          description,
          projectId: timesheet.projectId,
          subcontractorId: timesheet.subcontractorId,
          sourceType: 'TIMESHEET',
          sourceId: timesheetId,
          isAutoGenerated: true,
          notes: `Kaynak: Puantaj ${timesheetId.substring(0, 8)}`,
          createdBy: 'SYSTEM',
          updatedBy: 'SYSTEM',
        },
      });

      this.logger.log(`🤖 OTO Gider üretildi (Puantaj): ${expense.code} ← ${timesheet.subcontractor?.name} ${dateStr} (${timesheet.totalAmount.toString()} ${timesheet.currency})`);

      return expense;
    } catch (error) {
      this.logger.error(`❌ createFromTimesheet hatası: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  // ════════════════════════════════════
  // GERİ ÇEKME (soft delete by source)
  // ════════════════════════════════════
  async deleteBySource(
    tenantId: string,
    sourceType: 'PROGRESS_PAYMENT' | 'CONTACT_TRANSACTION' | 'TIMESHEET',
    sourceId: string,
  ) {
    try {
      const expense = await this.prisma.expense.findFirst({
        where: {
          tenantId,
          sourceType,
          sourceId,
          deletedAt: null,
        },
      });

      if (!expense) {
        return null;
      }

      await this.prisma.expense.update({
        where: { id: expense.id },
        data: {
          deletedAt: new Date(),
          updatedBy: 'SYSTEM',
        },
      });

      this.logger.log(`🔄 OTO Gider geri çekildi: ${expense.code} (kaynak ${sourceType} ${sourceId})`);

      return expense;
    } catch (error) {
      this.logger.error(`❌ deleteBySource hatası: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }
}