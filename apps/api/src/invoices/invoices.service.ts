import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma, MaterialUnit } from '@insaat-erp/database';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto, InvoiceLineDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { ListInvoicesDto, InvoiceStatsDto } from './dto/list-invoices.dto';

// ─── Hesaplama sonuç tipleri ───
interface CalculatedLine {
  materialId: string | null;
  description: string;
  quantity: Prisma.Decimal;
  unit: MaterialUnit;
  unitPrice: Prisma.Decimal;
  discountRate: Prisma.Decimal;
  vatRate: Prisma.Decimal;
  lineSubtotal: Prisma.Decimal;
  lineVatAmount: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
  sortOrder: number;
}

interface CalculatedInvoice {
  lines: CalculatedLine[];
  subtotal: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  vatAmount: Prisma.Decimal;
  withholdingAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
}

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ════════════════════════════════════════════════════════════
  // 🧮 HESAPLAMA MOTORU
  // ════════════════════════════════════════════════════════════
  // Sıra kritik:
  //   1. Her kalem: (miktar × fiyat) − kalem iskontosu = lineSubtotal
  //                 lineSubtotal × kdvOranı = lineVatAmount
  //   2. linesSum = Σ lineSubtotal
  //   3. discountAmount = linesSum × genelIskonto/100
  //   4. subtotal = linesSum − discountAmount
  //   5. vatAmount = Σ lineVatAmount × (subtotal / linesSum)
  //      ← genel iskonto uygulanınca KDV de orantılı azalır
  //   6. withholdingAmount = vatAmount × tevkifatOranı/100
  //   7. totalAmount = subtotal + vatAmount − withholdingAmount
  //
  // Tevkifat: KDV'nin bir kısmını alıcı doğrudan devlete öder, satıcıya
  // ödemez. Bu yüzden ödenecek tutardan düşülür. Gider tarafında ise
  // TAM KDV kaydedilir (devlete ödenen de gider sayılır).
  // ════════════════════════════════════════════════════════════
  private calculate(
    lines: InvoiceLineDto[],
    discountRate: number,
    withholdingRate: number,
  ): CalculatedInvoice {
    const genelIskonto = new Prisma.Decimal(discountRate ?? 0);
    const tevkifat = new Prisma.Decimal(withholdingRate ?? 0);

    const calculatedLines: CalculatedLine[] = [];
    let linesSum = new Prisma.Decimal(0);
    let linesVatSum = new Prisma.Decimal(0);

    // ─── 1. Kalem bazlı hesaplama ───
    lines.forEach((line, index) => {
      const quantity = new Prisma.Decimal(line.quantity);
      const unitPrice = new Prisma.Decimal(line.unitPrice);
      const lineDiscount = new Prisma.Decimal(line.discountRate ?? 0);
      const lineVatRate = new Prisma.Decimal(line.vatRate ?? 20);

      // Brüt tutar
      const gross = quantity.mul(unitPrice);

      // Kalem iskontosu düşülmüş net
      const discountMultiplier = new Prisma.Decimal(100)
        .sub(lineDiscount)
        .div(100);
      const lineSubtotal = gross.mul(discountMultiplier);

      // Kalem KDV'si
      const lineVatAmount = lineSubtotal.mul(lineVatRate).div(100);
      const lineTotal = lineSubtotal.add(lineVatAmount);

      linesSum = linesSum.add(lineSubtotal);
      linesVatSum = linesVatSum.add(lineVatAmount);

      calculatedLines.push({
        materialId: line.materialId ?? null,
        description: line.description,
        quantity,
        unit: (line.unit ?? 'PIECE') as MaterialUnit,
        unitPrice,
        discountRate: lineDiscount,
        vatRate: lineVatRate,
        lineSubtotal,
        lineVatAmount,
        lineTotal,
        sortOrder: line.sortOrder ?? index,
      });
    });

    // ─── 2. Genel iskonto ───
    const discountAmount = linesSum.mul(genelIskonto).div(100);
    const subtotal = linesSum.sub(discountAmount);

    // ─── 3. KDV — genel iskonto oranında düşürülür ───
    let vatAmount: Prisma.Decimal;
    if (linesSum.isZero()) {
      vatAmount = new Prisma.Decimal(0);
    } else {
      vatAmount = linesVatSum.mul(subtotal).div(linesSum);
    }

    // ─── 4. Tevkifat ───
    const withholdingAmount = vatAmount.mul(tevkifat).div(100);

    // ─── 5. Ödenecek toplam ───
    const totalAmount = subtotal.add(vatAmount).sub(withholdingAmount);

    return {
      lines: calculatedLines,
      subtotal,
      discountAmount,
      vatAmount,
      withholdingAmount,
      totalAmount,
    };
  }

  // ════════════════════════════════════
  // KOD ÜRETİMİ
  // ════════════════════════════════════
  // ALF-2026-0001 (alış) / STF-2026-0001 (satış)
  // max(code) bazlı — soft delete edilmiş kayıtlar da sayılır,
  // böylece silinen fatura kodu tekrar kullanılmaz.
  // ════════════════════════════════════
  private async generateCode(
    tenantId: string,
    type: 'PURCHASE' | 'SALES',
  ): Promise<string> {
    const prefix = type === 'PURCHASE' ? 'ALF' : 'STF';
    const year = new Date().getFullYear();
    const pattern = `${prefix}-${year}-`;

    const last = await this.prisma.invoice.findFirst({
      where: { tenantId, code: { startsWith: pattern } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });

    let nextNumber = 1;
    if (last) {
      const lastNumber = parseInt(last.code.replace(pattern, ''), 10);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    return `${pattern}${String(nextNumber).padStart(4, '0')}`;
  }

  // ════════════════════════════════════
  // DOĞRULAMALAR
  // ════════════════════════════════════
  private async validateReferences(
    tenantId: string,
    contactId: string,
    projectId: string | undefined,
    lines: InvoiceLineDto[],
  ) {
    // Cari kontrolü
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, tenantId, deletedAt: null },
    });
    if (!contact) {
      throw new BadRequestException(`Cari hesap bulunamadı: ${contactId}`);
    }

    // Proje kontrolü
    if (projectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: projectId, tenantId, deletedAt: null },
      });
      if (!project) {
        throw new BadRequestException(`Proje bulunamadı: ${projectId}`);
      }
    }

    // Malzeme kontrolü — kalemlerde materialId varsa hepsi bu tenant'a ait olmalı
    await this.validateMaterials(tenantId, lines);

    return contact;
  }

  private async validateMaterials(tenantId: string, lines: InvoiceLineDto[]) {
    const materialIds = lines
      .map((l) => l.materialId)
      .filter((id): id is string => Boolean(id));

    if (materialIds.length === 0) return;

    const uniqueIds = [...new Set(materialIds)];
    const materials = await this.prisma.material.findMany({
      where: { id: { in: uniqueIds }, tenantId, deletedAt: null },
      select: { id: true },
    });

    if (materials.length !== uniqueIds.length) {
      const found = new Set(materials.map((m) => m.id));
      const missing = uniqueIds.filter((id) => !found.has(id));
      throw new BadRequestException(
        `Bazı malzemeler bulunamadı: ${missing.join(', ')}`,
      );
    }
  }

  // ════════════════════════════════════
  // CREATE (her zaman DRAFT)
  // ════════════════════════════════════
  async create(tenantId: string, userId: string, dto: CreateInvoiceDto) {
    await this.validateReferences(tenantId, dto.contactId, dto.projectId, dto.lines);

    const calc = this.calculate(
      dto.lines,
      dto.discountRate ?? 0,
      dto.withholdingRate ?? 0,
    );

    const code = await this.generateCode(tenantId, dto.type);

    const invoice = await this.prisma.invoice.create({
      data: {
        tenantId,
        code,
        type: dto.type,
        status: 'DRAFT',
        contactId: dto.contactId,
        projectId: dto.projectId ?? null,
        invoiceNo: dto.invoiceNo ?? null,
        invoiceDate: new Date(dto.invoiceDate),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        waybillNo: dto.waybillNo ?? null,
        waybillDate: dto.waybillDate ? new Date(dto.waybillDate) : null,
        subtotal: calc.subtotal,
        discountRate: new Prisma.Decimal(dto.discountRate ?? 0),
        discountAmount: calc.discountAmount,
        vatAmount: calc.vatAmount,
        withholdingRate: new Prisma.Decimal(dto.withholdingRate ?? 0),
        withholdingAmount: calc.withholdingAmount,
        totalAmount: calc.totalAmount,
        currency: dto.currency ?? 'TRY',
        paymentMethod: dto.paymentMethod ?? null,
        serialNo: dto.serialNo ?? null,
        sequenceNo: dto.sequenceNo ?? null,
        notes: dto.notes ?? null,
        createdBy: userId,
        updatedBy: userId,
        lines: {
          create: calc.lines.map((l) => ({
            tenantId,
            materialId: l.materialId,
            description: l.description,
            quantity: l.quantity,
            unit: l.unit,
            unitPrice: l.unitPrice,
            discountRate: l.discountRate,
            vatRate: l.vatRate,
            lineSubtotal: l.lineSubtotal,
            lineVatAmount: l.lineVatAmount,
            lineTotal: l.lineTotal,
            sortOrder: l.sortOrder,
          })),
        },
      },
    });

    const typeLabel = dto.type === 'PURCHASE' ? 'Alış' : 'Satış';
    this.logger.log(
      `🧾 Yeni ${typeLabel} faturası: ${invoice.code} | ${calc.lines.length} kalem | ${calc.totalAmount.toString()} ${invoice.currency} | DRAFT`,
    );

    return this.findOne(tenantId, invoice.id);
  }

  // ════════════════════════════════════
  // FIND ALL
  // ════════════════════════════════════
  async findAll(tenantId: string, query: ListInvoicesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = {
      tenantId,
      deletedAt: null,
    };

    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.contactId) where.contactId = query.contactId;
    if (query.projectId) where.projectId = query.projectId;
    if (query.paymentMethod) where.paymentMethod = query.paymentMethod;

    // Fatura tarihi filtresi
    if (query.from || query.to) {
      where.invoiceDate = {};
      if (query.from) where.invoiceDate.gte = new Date(query.from);
      if (query.to) where.invoiceDate.lte = new Date(query.to);
    }

    // Vade tarihi filtresi
    if (query.dueFrom || query.dueTo) {
      where.dueDate = {};
      if (query.dueFrom) where.dueDate.gte = new Date(query.dueFrom);
      if (query.dueTo) where.dueDate.lte = new Date(query.dueTo);
    }

    // Vadesi geçmiş + ödenmemiş
    if (query.overdueOnly === 'true') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      where.dueDate = { lt: today };
      where.status = 'CONFIRMED';
    }

    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { invoiceNo: { contains: query.search, mode: 'insensitive' } },
        { waybillNo: { contains: query.search, mode: 'insensitive' } },
        { notes: { contains: query.search, mode: 'insensitive' } },
        { contact: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total, summary] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ invoiceDate: 'desc' }, { createdAt: 'desc' }],
        include: {
          contact: { select: { id: true, code: true, name: true, type: true } },
          project: { select: { id: true, code: true, name: true } },
          _count: { select: { lines: true } },
        },
      }),
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.aggregate({
        where,
        _sum: {
          subtotal: true,
          vatAmount: true,
          withholdingAmount: true,
          totalAmount: true,
        },
      }),
    ]);

    return {
      items: items.map((inv) => ({
        ...inv,
        lineCount: inv._count.lines,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        subtotal: summary._sum?.subtotal?.toString() ?? '0',
        vatAmount: summary._sum?.vatAmount?.toString() ?? '0',
        withholdingAmount: summary._sum?.withholdingAmount?.toString() ?? '0',
        totalAmount: summary._sum?.totalAmount?.toString() ?? '0',
      },
    };
  }

  // ════════════════════════════════════
  // FIND ONE (kalemler + üretilen kayıtlar)
  // ════════════════════════════════════
  async findOne(tenantId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        contact: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            taxNumber: true,
            taxOffice: true,
            address: true,
            phone: true,
          },
        },
        project: { select: { id: true, code: true, name: true } },
        lines: {
          orderBy: { sortOrder: 'asc' },
          include: {
            material: { select: { id: true, code: true, name: true, unit: true } },
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Fatura bulunamadı: ${id}`);
    }

    // Bu faturadan üretilen otomatik kayıtlar
    const [movements, transactions, cheques, expense] = await Promise.all([
      this.prisma.materialMovement.findMany({
        where: { invoiceId: id, tenantId, deletedAt: null },
        select: {
          id: true,
          type: true,
          quantity: true,
          totalPrice: true,
          date: true,
          material: { select: { id: true, code: true, name: true, unit: true } },
        },
      }),
      this.prisma.contactTransaction.findMany({
        where: { invoiceId: id, tenantId, deletedAt: null },
        select: {
          id: true,
          type: true,
          amount: true,
          date: true,
          balanceAfter: true,
        },
      }),
      this.prisma.cheque.findMany({
        where: { invoiceId: id, tenantId, deletedAt: null },
        select: {
          id: true,
          chequeNo: true,
          bankName: true,
          amount: true,
          dueDate: true,
          status: true,
          direction: true,
        },
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.expense.findFirst({
        where: {
          tenantId,
          sourceType: 'INVOICE',
          sourceId: id,
          deletedAt: null,
        },
        select: {
          id: true,
          code: true,
          category: true,
          amount: true,
          vatAmount: true,
          totalAmount: true,
        },
      }),
    ]);

    return {
      ...invoice,
      generated: {
        movements,
        transactions,
        cheques,
        expense,
      },
    };
  }

  // ════════════════════════════════════
  // UPDATE (sadece DRAFT)
  // ════════════════════════════════════
  async update(
    tenantId: string,
    userId: string,
    id: string,
    dto: UpdateInvoiceDto,
  ) {
    const existing = await this.prisma.invoice.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { lines: true },
    });

    if (!existing) {
      throw new NotFoundException(`Fatura bulunamadı: ${id}`);
    }

    if (existing.status !== 'DRAFT') {
      throw new BadRequestException(
        `Sadece taslak (DRAFT) faturalar düzenlenebilir. Mevcut durum: ${existing.status}. ` +
          `Onaylanmış faturayı değiştirmek için önce iptal edin.`,
      );
    }

    // Proje değişiyorsa doğrula
    if (dto.projectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: dto.projectId, tenantId, deletedAt: null },
      });
      if (!project) {
        throw new BadRequestException(`Proje bulunamadı: ${dto.projectId}`);
      }
    }

    // ─── Kalemler değişiyorsa yeniden hesapla ───
    const linesChanged = dto.lines !== undefined;
    const discountRate = dto.discountRate ?? Number(existing.discountRate);
    const withholdingRate =
      dto.withholdingRate ?? Number(existing.withholdingRate);

    let calc: CalculatedInvoice | null = null;

    if (linesChanged) {
      await this.validateMaterials(tenantId, dto.lines!);
      calc = this.calculate(dto.lines!, discountRate, withholdingRate);
    } else if (
      dto.discountRate !== undefined ||
      dto.withholdingRate !== undefined
    ) {
      // Kalemler aynı ama iskonto/tevkifat değişti → mevcut kalemlerle yeniden hesapla
      const currentLines: InvoiceLineDto[] = existing.lines.map((l) => ({
        materialId: l.materialId ?? undefined,
        description: l.description,
        quantity: Number(l.quantity),
        unit: l.unit as never,
        unitPrice: Number(l.unitPrice),
        discountRate: Number(l.discountRate),
        vatRate: Number(l.vatRate),
        sortOrder: l.sortOrder,
      }));

      calc = this.calculate(currentLines, discountRate, withholdingRate);
    }

    await this.prisma.$transaction(async (tx) => {
      // Kalemler değiştiyse sil + yeniden oluştur
      if (linesChanged && calc) {
        await tx.invoiceLine.deleteMany({ where: { invoiceId: id } });

        await tx.invoiceLine.createMany({
          data: calc.lines.map((l) => ({
            tenantId,
            invoiceId: id,
            materialId: l.materialId,
            description: l.description,
            quantity: l.quantity,
            unit: l.unit,
            unitPrice: l.unitPrice,
            discountRate: l.discountRate,
            vatRate: l.vatRate,
            lineSubtotal: l.lineSubtotal,
            lineVatAmount: l.lineVatAmount,
            lineTotal: l.lineTotal,
            sortOrder: l.sortOrder,
          })),
        });
      }

      // Başlık güncelle
      const data: Prisma.InvoiceUpdateInput = {
        updatedBy: userId,
      };

      if (dto.projectId !== undefined) {
        data.project = dto.projectId
          ? { connect: { id: dto.projectId } }
          : { disconnect: true };
      }
      if (dto.invoiceNo !== undefined) data.invoiceNo = dto.invoiceNo || null;
      if (dto.invoiceDate !== undefined) data.invoiceDate = new Date(dto.invoiceDate);
      if (dto.dueDate !== undefined) {
        data.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
      }
      if (dto.waybillNo !== undefined) data.waybillNo = dto.waybillNo || null;
      if (dto.waybillDate !== undefined) {
        data.waybillDate = dto.waybillDate ? new Date(dto.waybillDate) : null;
      }
      if (dto.currency !== undefined) data.currency = dto.currency;
      if (dto.paymentMethod !== undefined) data.paymentMethod = dto.paymentMethod;
      if (dto.serialNo !== undefined) data.serialNo = dto.serialNo || null;
      if (dto.sequenceNo !== undefined) data.sequenceNo = dto.sequenceNo ?? null;
      if (dto.notes !== undefined) data.notes = dto.notes || null;

      // Yeniden hesaplandıysa tutarları güncelle
      if (calc) {
        data.subtotal = calc.subtotal;
        data.discountRate = new Prisma.Decimal(discountRate);
        data.discountAmount = calc.discountAmount;
        data.vatAmount = calc.vatAmount;
        data.withholdingRate = new Prisma.Decimal(withholdingRate);
        data.withholdingAmount = calc.withholdingAmount;
        data.totalAmount = calc.totalAmount;
      }

      await tx.invoice.update({ where: { id }, data });
    });

    this.logger.log(
      `✏️  Fatura güncellendi: ${existing.code}${linesChanged ? ' (kalemler değişti)' : ''}`,
    );

    return this.findOne(tenantId, id);
  }

  // ════════════════════════════════════
  // DELETE (soft, sadece DRAFT)
  // ════════════════════════════════════
  async remove(tenantId: string, userId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!invoice) {
      throw new NotFoundException(`Fatura bulunamadı: ${id}`);
    }

    if (invoice.status !== 'DRAFT') {
      throw new BadRequestException(
        `Sadece taslak (DRAFT) faturalar silinebilir. Mevcut durum: ${invoice.status}. ` +
          `Onaylanmış faturayı kaldırmak için iptal edin.`,
      );
    }

    await this.prisma.invoice.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: userId,
      },
    });

    this.logger.log(`🗑️  Fatura silindi (soft): ${invoice.code}`);

    return { message: 'Fatura silindi', id };
  }

  // ════════════════════════════════════
  // STATS
  // ════════════════════════════════════
  async getStats(tenantId: string, query: InvoiceStatsDto) {
    const baseWhere: Prisma.InvoiceWhereInput = {
      tenantId,
      deletedAt: null,
      status: { in: ['CONFIRMED', 'PAID'] },
    };

    if (query.from || query.to) {
      baseWhere.invoiceDate = {};
      if (query.from) baseWhere.invoiceDate.gte = new Date(query.from);
      if (query.to) baseWhere.invoiceDate.lte = new Date(query.to);
    }

    if (query.projectId) baseWhere.projectId = query.projectId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      purchaseAgg,
      salesAgg,
      draftCount,
      confirmedCount,
      paidCount,
      cancelledCount,
      overdueAgg,
    ] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: { ...baseWhere, type: 'PURCHASE' },
        _sum: { subtotal: true, vatAmount: true, totalAmount: true },
        _count: true,
      }),
      this.prisma.invoice.aggregate({
        where: { ...baseWhere, type: 'SALES' },
        _sum: { subtotal: true, vatAmount: true, totalAmount: true },
        _count: true,
      }),
      this.prisma.invoice.count({
        where: { tenantId, deletedAt: null, status: 'DRAFT' },
      }),
      this.prisma.invoice.count({
        where: { tenantId, deletedAt: null, status: 'CONFIRMED' },
      }),
      this.prisma.invoice.count({
        where: { tenantId, deletedAt: null, status: 'PAID' },
      }),
      this.prisma.invoice.count({
        where: { tenantId, deletedAt: null, status: 'CANCELLED' },
      }),
      this.prisma.invoice.aggregate({
        where: {
          tenantId,
          deletedAt: null,
          status: 'CONFIRMED',
          dueDate: { lt: today },
        },
        _sum: { totalAmount: true },
        _count: true,
      }),
    ]);

    const purchaseTotal = purchaseAgg._sum?.totalAmount ?? new Prisma.Decimal(0);
    const salesTotal = salesAgg._sum?.totalAmount ?? new Prisma.Decimal(0);

    return {
      purchase: {
        count: purchaseAgg._count,
        subtotal: purchaseAgg._sum?.subtotal?.toString() ?? '0',
        vatAmount: purchaseAgg._sum?.vatAmount?.toString() ?? '0',
        totalAmount: purchaseTotal.toString(),
      },
      sales: {
        count: salesAgg._count,
        subtotal: salesAgg._sum?.subtotal?.toString() ?? '0',
        vatAmount: salesAgg._sum?.vatAmount?.toString() ?? '0',
        totalAmount: salesTotal.toString(),
      },
      // Satış − Alış (kaba brüt fark, gerçek kâr değil)
      balance: salesTotal.sub(purchaseTotal).toString(),
      byStatus: {
        draft: draftCount,
        confirmed: confirmedCount,
        paid: paidCount,
        cancelled: cancelledCount,
      },
      overdue: {
        count: overdueAgg._count,
        totalAmount: overdueAgg._sum?.totalAmount?.toString() ?? '0',
      },
    };
  }
  // ════════════════════════════════════════════════════════════
  // ✅ CONFIRM — OTOMASYON ZİNCİRİ
  // ════════════════════════════════════════════════════════════
  // Tek transaction içinde şunlar olur:
  //
  // PURCHASE (alış):
  //   1. ContactTransaction (DEBT)  → cari bakiye artar (borçlandık)
  //   2. MaterialMovement (IN)      → her malzeme kalemi için stok girişi
  //   3. Expense                    → tek gider kaydı
  //   4. Cheque                     → paymentMethod CHEQUE ise
  //
  // SALES (satış):
  //   1. ContactTransaction (CREDIT) → cari bakiye artar (müşteri borçlandı)
  //   2. MaterialMovement (OUT)      → stok çıkışı
  //   3. Expense                     → YOK (satış gelirdir)
  //   4. Cheque                      → paymentMethod CHEQUE ise
  //
  // ÇAKIŞMA ÖNLEME: Üretilen hareketlerde invoiceId dolu olur.
  // MaterialsService ve ContactTransactionsService hook'ları
  // invoiceId doluysa gider yazmaz — gideri fatura yazar.
  // ════════════════════════════════════════════════════════════
  async confirm(tenantId: string, userId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        contact: { select: { id: true, code: true, name: true, type: true } },
        project: { select: { id: true, code: true, name: true } },
        lines: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Fatura bulunamadı: ${id}`);
    }

    if (invoice.status !== 'DRAFT') {
      throw new BadRequestException(
        `Sadece taslak (DRAFT) faturalar onaylanabilir. Mevcut durum: ${invoice.status}`,
      );
    }

    if (invoice.lines.length === 0) {
      throw new BadRequestException('Kalemi olmayan fatura onaylanamaz');
    }

    // ─── SATIŞ için stok yeterliliği ön kontrolü ───
    // Transaction dışında kontrol ediyoruz ki erken ve net hata verelim
    if (invoice.type === 'SALES') {
      const materialLines = invoice.lines.filter((l) => l.materialId);

      if (materialLines.length > 0) {
        // Aynı malzeme birden fazla kalemde geçebilir — topla
        const needed = new Map<string, Prisma.Decimal>();
        for (const line of materialLines) {
          const current = needed.get(line.materialId!) ?? new Prisma.Decimal(0);
          needed.set(line.materialId!, current.add(line.quantity));
        }

        const materials = await this.prisma.material.findMany({
          where: { id: { in: [...needed.keys()] }, tenantId, deletedAt: null },
          select: { id: true, code: true, name: true, currentStock: true, unit: true },
        });

        const insufficient: string[] = [];
        for (const mat of materials) {
          const required = needed.get(mat.id)!;
          const stock = new Prisma.Decimal(mat.currentStock);
          if (stock.lessThan(required)) {
            insufficient.push(
              `${mat.code} (${mat.name}): stok ${stock.toString()} ${mat.unit}, gereken ${required.toString()} ${mat.unit}`,
            );
          }
        }

        if (insufficient.length > 0) {
          throw new BadRequestException(
            `Yetersiz stok — fatura onaylanamaz:\n${insufficient.join('\n')}`,
          );
        }
      }
    }

    // ─── TEK TRANSACTION: hepsi ya olur ya hiçbiri ───
    const result = await this.prisma.$transaction(async (tx) => {
      const now = new Date();

      // ══════════════════════════════════
      // 1. CARİ HAREKET
      // ══════════════════════════════════
      // PURCHASE → DEBT  : biz tedarikçiye borçlandık (bakiye azalır)
      // SALES    → CREDIT: müşteri bize borçlandı (bakiye artar)
      //
      // NOT: Bakiye mantığı ContactTransactionsService ile aynı:
      //   CREDIT / PAYMENT → bakiye artar
      //   DEBT / COLLECTION → bakiye azalır
      // ══════════════════════════════════
      const contact = await tx.contact.findUnique({
        where: { id: invoice.contactId },
        select: { id: true, code: true, name: true, currentBalance: true },
      });

      if (!contact) {
        throw new BadRequestException('Cari hesap bulunamadı');
      }

      const txType: 'DEBT' | 'CREDIT' =
        invoice.type === 'PURCHASE' ? 'DEBT' : 'CREDIT';

      const currentBalance = new Prisma.Decimal(contact.currentBalance);
      const balanceChange =
        txType === 'CREDIT'
          ? invoice.totalAmount
          : new Prisma.Decimal(invoice.totalAmount).neg();
      const newBalance = currentBalance.add(balanceChange);

      const typeLabel = invoice.type === 'PURCHASE' ? 'Alış' : 'Satış';

      const contactTransaction = await tx.contactTransaction.create({
        data: {
          tenantId,
          contactId: invoice.contactId,
          invoiceId: id, // ← gider hook'u bunu görüp gider yazmayacak
          type: txType,
          amount: invoice.totalAmount,
          currency: invoice.currency,
          date: invoice.invoiceDate,
          documentNo: invoice.invoiceNo ?? invoice.code,
          description: `${typeLabel} faturası ${invoice.code}${invoice.invoiceNo ? ` (Fat: ${invoice.invoiceNo})` : ''}`,
          paymentMethod: invoice.paymentMethod,
          balanceAfter: newBalance,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      await tx.contact.update({
        where: { id: invoice.contactId },
        data: { currentBalance: newBalance, updatedBy: userId },
      });

      // ══════════════════════════════════
      // 2. STOK HAREKETLERİ
      // ══════════════════════════════════
      // Sadece materialId dolu kalemler için.
      // PURCHASE → IN  (ağırlıklı ortalama fiyat güncellenir)
      // SALES    → OUT (fiyat güncellenmez)
      // ══════════════════════════════════
      const movementIds: string[] = [];
      const movementType: 'IN' | 'OUT' =
        invoice.type === 'PURCHASE' ? 'IN' : 'OUT';

      for (const line of invoice.lines) {
        if (!line.materialId) continue; // hizmet kalemi → stok yok

        const material = await tx.material.findUnique({
          where: { id: line.materialId },
          select: {
            id: true,
            code: true,
            currentStock: true,
            avgPrice: true,
            lastPurchasePrice: true,
          },
        });

        if (!material) {
          throw new BadRequestException(
            `Malzeme bulunamadı: ${line.materialId}`,
          );
        }

        const quantity = new Prisma.Decimal(line.quantity);
        const currentStock = new Prisma.Decimal(material.currentStock);
        const unitPrice = new Prisma.Decimal(line.unitPrice);
        const totalPrice = quantity.mul(unitPrice);

        // Yeni stok
        const newStock =
          movementType === 'IN'
            ? currentStock.add(quantity)
            : currentStock.sub(quantity);

        // Negatif stok koruması (SALES ön kontrolü geçmiş olsa da
        // transaction içinde eşzamanlı değişim olabilir)
        if (newStock.lessThan(0)) {
          throw new BadRequestException(
            `Yetersiz stok: ${material.code} — mevcut ${currentStock.toString()}, çıkış ${quantity.toString()}`,
          );
        }

        // Ağırlıklı ortalama fiyat — sadece alışta güncellenir
        let newAvgPrice = new Prisma.Decimal(material.avgPrice);
        let newLastPurchasePrice = material.lastPurchasePrice
          ? new Prisma.Decimal(material.lastPurchasePrice)
          : null;

        if (movementType === 'IN' && unitPrice.greaterThan(0)) {
          const oldStockValue = currentStock.mul(newAvgPrice);
          const newPurchaseValue = quantity.mul(unitPrice);
          if (newStock.greaterThan(0)) {
            newAvgPrice = oldStockValue.add(newPurchaseValue).div(newStock);
          }
          newLastPurchasePrice = unitPrice;
        }

        const movement = await tx.materialMovement.create({
          data: {
            tenantId,
            materialId: line.materialId,
            projectId: invoice.projectId,
            invoiceId: id, // ← gider hook'u bunu görüp gider yazmayacak
            type: movementType,
            quantity,
            unitPrice,
            totalPrice,
            currency: invoice.currency,
            date: invoice.invoiceDate,
            supplier: invoice.type === 'PURCHASE' ? contact.name : null,
            invoiceNo: invoice.invoiceNo ?? invoice.code,
            notes: `${typeLabel} faturası ${invoice.code} kaleminden otomatik`,
            createdBy: userId,
            updatedBy: userId,
          },
        });

        movementIds.push(movement.id);

        await tx.material.update({
          where: { id: line.materialId },
          data: {
            currentStock: newStock,
            avgPrice: newAvgPrice,
            ...(newLastPurchasePrice && { lastPurchasePrice: newLastPurchasePrice }),
            updatedBy: userId,
          },
        });
      }

      // ══════════════════════════════════
      // 3. GİDER KAYDI (sadece PURCHASE)
      // ══════════════════════════════════
      // Kategori: kalemlerin çoğunluğu malzemeyse MATERIAL_PURCHASE,
      // değilse SUPPLIER_PAYMENT.
      //
      // Tutar: TAM KDV kaydedilir (tevkifat düşülmez) — devlete
      // ödenen KDV de firmanın gideridir.
      // ══════════════════════════════════
      let expenseId: string | null = null;

      if (invoice.type === 'PURCHASE') {
        const materialLineCount = invoice.lines.filter((l) => l.materialId).length;
        const category =
          materialLineCount > invoice.lines.length / 2
            ? 'MATERIAL_PURCHASE'
            : 'SUPPLIER_PAYMENT';

        // Gider kodu: OTO-2026-0001
        const year = new Date().getFullYear();
        const lastExpense = await tx.expense.findFirst({
          where: { tenantId, code: { startsWith: `OTO-${year}-` } },
          orderBy: { code: 'desc' },
          select: { code: true },
        });

        let expenseNumber = 1;
        if (lastExpense) {
          const parsed = parseInt(
            lastExpense.code.replace(`OTO-${year}-`, ''),
            10,
          );
          if (!isNaN(parsed)) expenseNumber = parsed + 1;
        }
        const expenseCode = `OTO-${year}-${String(expenseNumber).padStart(4, '0')}`;

        // KDV oranı: ağırlıklı ortalama (raporlama için yaklaşık değer)
        const effectiveVatRate = invoice.subtotal.isZero()
          ? new Prisma.Decimal(0)
          : invoice.vatAmount.mul(100).div(invoice.subtotal);

        const expense = await tx.expense.create({
          data: {
            tenantId,
            code: expenseCode,
            category,
            status: 'CONFIRMED',
            amount: invoice.subtotal,
            vatRate: effectiveVatRate,
            vatAmount: invoice.vatAmount,
            totalAmount: invoice.subtotal.add(invoice.vatAmount),
            currency: invoice.currency,
            date: invoice.invoiceDate,
            description: `Alış faturası - ${contact.name} (${invoice.code})`,
            projectId: invoice.projectId,
            contactId: invoice.contactId,
            invoiceNo: invoice.invoiceNo,
            paymentMethod: invoice.paymentMethod,
            sourceType: 'INVOICE',
            sourceId: id,
            isAutoGenerated: true,
            notes:
              `Kaynak: ${invoice.code}` +
              (invoice.withholdingAmount.greaterThan(0)
                ? ` | Tevkifat: ${invoice.withholdingAmount.toString()} ${invoice.currency}`
                : ''),
            createdBy: 'SYSTEM',
            updatedBy: 'SYSTEM',
          },
        });

        expenseId = expense.id;
      }

      // ══════════════════════════════════
      // 4. FATURA DURUMUNU GÜNCELLE
      // ══════════════════════════════════
      const updated = await tx.invoice.update({
        where: { id },
        data: {
          status: 'CONFIRMED',
          confirmedAt: now,
          updatedBy: userId,
        },
      });

      return {
        invoice: updated,
        contactTransactionId: contactTransaction.id,
        movementIds,
        expenseId,
        newBalance,
      };
    });

    const typeLabel = invoice.type === 'PURCHASE' ? 'Alış' : 'Satış';
    this.logger.log(
      `✅ ${typeLabel} faturası onaylandı: ${invoice.code} | ` +
        `${invoice.totalAmount.toString()} ${invoice.currency} | ` +
        `cari bakiye: ${result.newBalance.toString()} | ` +
        `${result.movementIds.length} stok hareketi` +
        (result.expenseId ? ' | gider oluşturuldu' : ''),
    );

    return this.findOne(tenantId, id);
  }

  // ════════════════════════════════════════════════════════════
  // 💵 PAY — Ödeme işaretleme
  // ════════════════════════════════════════════════════════════
  // Sadece CONFIRMED faturalar ödenebilir.
  // paymentMethod CHEQUE ise çek(ler) oluşturulur — taksitli ödeme
  // için birden fazla çek gönderilebilir.
  //
  // NOT: Ödeme kaydı ayrıca cari hareket OLUŞTURMAZ. Fatura onayında
  // zaten borç/alacak yazıldı. Ödemenin cariye yansıması için
  // kullanıcı ayrıca PAYMENT/COLLECTION hareketi girmelidir.
  // ════════════════════════════════════════════════════════════
  async pay(
    tenantId: string,
    userId: string,
    id: string,
    dto: {
      paymentMethod: 'CASH' | 'BANK' | 'CHEQUE' | 'CREDIT_CARD' | 'OTHER';
      paidAt?: string;
      cheques?: Array<{
        chequeNo?: string;
        bankName?: string;
        dueDate?: string;
        amount?: number;
      }>;
    },
  ) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        contact: { select: { id: true, code: true, name: true } },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Fatura bulunamadı: ${id}`);
    }

    if (invoice.status !== 'CONFIRMED') {
      throw new BadRequestException(
        `Sadece onaylanmış (CONFIRMED) faturalar ödenebilir. Mevcut durum: ${invoice.status}`,
      );
    }

    // Çek tutarları toplamı fatura tutarını aşmamalı
    if (dto.paymentMethod === 'CHEQUE' && dto.cheques && dto.cheques.length > 0) {
      const withAmount = dto.cheques.filter((c) => c.amount !== undefined);
      if (withAmount.length > 0) {
        let sum = new Prisma.Decimal(0);
        for (const c of withAmount) {
          sum = sum.add(new Prisma.Decimal(c.amount!));
        }
        if (sum.greaterThan(invoice.totalAmount)) {
          throw new BadRequestException(
            `Çek tutarları toplamı (${sum.toString()}) fatura tutarını (${invoice.totalAmount.toString()}) aşamaz`,
          );
        }
      }
    }

    const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      // ─── Çek(ler) oluştur ───
      const createdCheques: string[] = [];

      if (dto.paymentMethod === 'CHEQUE') {
        // Çek bilgisi verilmemişse tek çek varsayılan değerlerle
        const chequeList =
          dto.cheques && dto.cheques.length > 0 ? dto.cheques : [{}];

        const direction: 'OUTGOING' | 'INCOMING' =
          invoice.type === 'PURCHASE' ? 'OUTGOING' : 'INCOMING';

        const typeLabel = invoice.type === 'PURCHASE' ? 'Alış' : 'Satış';

        let chequeIndex = 0;
        for (const c of chequeList) {
          chequeIndex++;

          const chequeNo =
            c.chequeNo?.trim() || `OTO-${invoice.code}-${chequeIndex}`;

          // Mükerrer kontrolü
          const existing = await tx.cheque.findFirst({
            where: {
              tenantId,
              sourceType: 'INVOICE',
              sourceId: id,
              chequeNo,
              deletedAt: null,
            },
            select: { id: true },
          });

          if (existing) {
            this.logger.warn(
              `⚠️  '${chequeNo}' numaralı çek zaten var, atlanıyor: ${invoice.code}`,
            );
            continue;
          }

          const amount = c.amount
            ? new Prisma.Decimal(c.amount)
            : chequeList.length === 1
              ? invoice.totalAmount
              : invoice.totalAmount.div(chequeList.length);

          const dueDate = c.dueDate
            ? new Date(c.dueDate)
            : (invoice.dueDate ??
              new Date(
                invoice.invoiceDate.getTime() +
                  chequeIndex * 30 * 24 * 60 * 60 * 1000,
              ));

          const cheque = await tx.cheque.create({
            data: {
              tenantId,
              contactId: invoice.contactId,
              subcontractorId: null,
              invoiceId: id,
              kind: 'CHEQUE',
              direction,
              chequeNo,
              bankName: c.bankName?.trim() || null,
              amount,
              currency: invoice.currency,
              issueDate: invoice.invoiceDate,
              dueDate,
              status: 'PORTFOLIO',
              statusDate: new Date(),
              description: `${typeLabel} faturası - ${invoice.contact.name} (${invoice.code})${chequeList.length > 1 ? ` — ${chequeIndex}/${chequeList.length}. taksit` : ''}`,
              sourceType: 'INVOICE',
              sourceId: id,
              isAutoGenerated: true,
              createdBy: 'SYSTEM',
              updatedBy: 'SYSTEM',
            },
          });

          createdCheques.push(cheque.chequeNo);
        }
      }

      // ─── Fatura durumu ───
      // ─── Fatura durumu ───
      await tx.invoice.update({
        where: { id },
        data: {
          status: 'PAID',
          paidAt,
          paymentMethod: dto.paymentMethod,
          updatedBy: userId,
        },
      });

      return { createdCheques };
    });
    

    this.logger.log(
      `💵 Fatura ödendi: ${invoice.code} | ${invoice.totalAmount.toString()} ${invoice.currency} | ` +
        `yöntem: ${dto.paymentMethod}` +
        (result.createdCheques.length > 0
          ? ` | ${result.createdCheques.length} çek: ${result.createdCheques.join(', ')}`
          : ''),
    );

    return this.findOne(tenantId, id);
  }

  // ════════════════════════════════════════════════════════════
  // ❌ CANCEL — İptal ve geri alma
  // ════════════════════════════════════════════════════════════
  // CONFIRMED veya PAID faturalar iptal edilebilir.
  // Tek transaction içinde tüm otomatik kayıtlar geri alınır:
  //   1. Cari bakiye eski haline döner, hareket soft delete
  //   2. Stok geri alınır, hareketler soft delete
  //   3. Gider soft delete
  //   4. Çekler soft delete (tahsil sürecindekiler hariç)
  //
  // ⚠️ Tahsil sürecine girmiş çek varsa (COLLECTED/PAID/DEPOSITED)
  // iptal REDDEDİLİR — önce çek durumu düzeltilmeli.
  // ════════════════════════════════════════════════════════════
  async cancel(
    tenantId: string,
    userId: string,
    id: string,
    reason?: string,
  ) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        contact: { select: { id: true, name: true } },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Fatura bulunamadı: ${id}`);
    }

    if (invoice.status === 'DRAFT') {
      throw new BadRequestException(
        'Taslak fatura iptal edilemez — silebilirsiniz.',
      );
    }

    if (invoice.status === 'CANCELLED') {
      throw new BadRequestException('Bu fatura zaten iptal edilmiş.');
    }

    // ─── Tahsil sürecindeki çek kontrolü ───
    const lockedCheques = await this.prisma.cheque.findMany({
      where: {
        tenantId,
        invoiceId: id,
        deletedAt: null,
        status: { in: ['COLLECTED', 'PAID', 'DEPOSITED', 'ENDORSED'] },
      },
      select: { chequeNo: true, status: true },
    });

    if (lockedCheques.length > 0) {
      const list = lockedCheques
        .map((c) => `${c.chequeNo} (${c.status})`)
        .join(', ');
      throw new BadRequestException(
        `Bu faturaya bağlı çekler tahsil sürecinde: ${list}. ` +
          `Fatura iptal edilemez — önce çek durumlarını düzeltin.`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const now = new Date();

      // ══════════════════════════════════
      // 1. CARİ HAREKETLERİ GERİ AL
      // ══════════════════════════════════
      const transactions = await tx.contactTransaction.findMany({
        where: { tenantId, invoiceId: id, deletedAt: null },
      });

      let balanceReverted = new Prisma.Decimal(0);

      for (const t of transactions) {
        const contact = await tx.contact.findUnique({
          where: { id: t.contactId },
          select: { currentBalance: true },
        });

        if (!contact) continue;

        const currentBalance = new Prisma.Decimal(contact.currentBalance);
        const amount = new Prisma.Decimal(t.amount);

        // Ters işlem: CREDIT/PAYMENT eklemişti → çıkar, DEBT/COLLECTION çıkarmıştı → ekle
        const revert =
          t.type === 'CREDIT' || t.type === 'PAYMENT' ? amount.neg() : amount;

        const newBalance = currentBalance.add(revert);
        balanceReverted = newBalance;

        await tx.contact.update({
          where: { id: t.contactId },
          data: { currentBalance: newBalance, updatedBy: userId },
        });

        await tx.contactTransaction.update({
          where: { id: t.id },
          data: { deletedAt: now, updatedBy: userId },
        });
      }

      // ══════════════════════════════════
      // 2. STOK HAREKETLERİNİ GERİ AL
      // ══════════════════════════════════
      // NOT: Ortalama fiyat geri hesaplanmaz — matematiksel olarak
      // tam tersine çevrilemez (araya başka hareketler girmiş olabilir).
      // Sadece stok miktarı düzeltilir.
      const movements = await tx.materialMovement.findMany({
        where: { tenantId, invoiceId: id, deletedAt: null },
      });

      for (const m of movements) {
        const material = await tx.material.findUnique({
          where: { id: m.materialId },
          select: { currentStock: true },
        });

        if (!material) continue;

        const currentStock = new Prisma.Decimal(material.currentStock);
        const quantity = new Prisma.Decimal(m.quantity);

        // IN'i geri al → çıkar, OUT'u geri al → ekle
        const newStock =
          m.type === 'IN' ? currentStock.sub(quantity) : currentStock.add(quantity);

        await tx.material.update({
          where: { id: m.materialId },
          data: {
            currentStock: newStock.lessThan(0) ? new Prisma.Decimal(0) : newStock,
            updatedBy: userId,
          },
        });

        await tx.materialMovement.update({
          where: { id: m.id },
          data: { deletedAt: now, updatedBy: userId },
        });
      }

      // ══════════════════════════════════
      // 3. GİDERİ GERİ AL
      // ══════════════════════════════════
      const expenses = await tx.expense.updateMany({
        where: {
          tenantId,
          sourceType: 'INVOICE',
          sourceId: id,
          deletedAt: null,
        },
        data: { deletedAt: now, updatedBy: 'SYSTEM' },
      });

      // ══════════════════════════════════
      // 4. ÇEKLERİ GERİ AL
      // ══════════════════════════════════
      const cheques = await tx.cheque.updateMany({
        where: { tenantId, invoiceId: id, deletedAt: null },
        data: { deletedAt: now, updatedBy: 'SYSTEM' },
      });

      // ══════════════════════════════════
      // 5. FATURA DURUMU
      // ══════════════════════════════════
      await tx.invoice.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: now,
          notes: reason
            ? `${invoice.notes ? invoice.notes + '\n' : ''}[İPTAL] ${reason}`
            : invoice.notes,
          updatedBy: userId,
        },
      });

      return {
        transactionCount: transactions.length,
        movementCount: movements.length,
        expenseCount: expenses.count,
        chequeCount: cheques.count,
        balanceReverted,
      };
    });

    this.logger.log(
      `❌ Fatura iptal edildi: ${invoice.code} | ` +
        `${result.transactionCount} cari hareketi, ` +
        `${result.movementCount} stok hareketi, ` +
        `${result.expenseCount} gider, ` +
        `${result.chequeCount} çek geri çekildi` +
        (reason ? ` | Sebep: ${reason}` : ''),
    );

    return this.findOne(tenantId, id);
  }
}

