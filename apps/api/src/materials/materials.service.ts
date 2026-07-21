import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@insaat-erp/database';
import { PrismaService } from '../prisma/prisma.service';
import { ExpensesService } from '../expenses/expenses.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { ListMaterialsDto } from './dto/list-materials.dto';
import {
  CreateMovementDto,
  ListMovementsDto,
} from './dto/create-movement.dto';

@Injectable()
export class MaterialsService {
  private readonly logger = new Logger(MaterialsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly expensesService: ExpensesService,
  ) {}

  // ════════════════════════════════════
  // MATERIAL CRUD
  // ════════════════════════════════════

  async create(tenantId: string, userId: string, dto: CreateMaterialDto) {
    const existing = await this.prisma.material.findFirst({
      where: { tenantId, code: dto.code, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException(
        `Bu firma için '${dto.code}' kodlu bir malzeme zaten var`,
      );
    }

    const material = await this.prisma.material.create({
      data: {
        tenantId,
        code: dto.code,
        name: dto.name,
        category: dto.category,
        unit: dto.unit,
        description: dto.description,
        minStock: dto.minStock ?? 0,
        currency: dto.currency ?? 'TRY',
        notes: dto.notes,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    this.logger.log(
      `📦 Yeni malzeme: ${material.code} (${material.name}) | tenant: ${tenantId}`,
    );

    return material;
  }

  async findAll(tenantId: string, query: ListMaterialsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.MaterialWhereInput = {
      tenantId,
      deletedAt: null,
    };

    if (query.category) where.category = query.category;
    if (query.unit) where.unit = query.unit;

    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.material.findMany({
        where,
        skip: query.lowStock === 'true' ? 0 : skip,
        take: query.lowStock === 'true' ? undefined : limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.material.count({ where }),
    ]);

    let filtered = items;
    let finalTotal = total;

    if (query.lowStock === 'true') {
      filtered = items.filter(
        (m) => Number(m.currentStock) <= Number(m.minStock) && Number(m.minStock) > 0,
      );
      finalTotal = filtered.length;
      filtered = filtered.slice(skip, skip + limit);
    }

    return {
      items: filtered,
      pagination: {
        page,
        limit,
        total: finalTotal,
        totalPages: Math.ceil(finalTotal / limit),
      },
    };
  }

  async findOne(tenantId: string, id: string) {
    const material = await this.prisma.material.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!material) {
      throw new NotFoundException(`Malzeme bulunamadı: ${id}`);
    }

    return material;
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    dto: UpdateMaterialDto,
  ) {
    await this.findOne(tenantId, id);

    if (dto.code) {
      const conflict = await this.prisma.material.findFirst({
        where: {
          tenantId,
          code: dto.code,
          id: { not: id },
          deletedAt: null,
        },
      });
      if (conflict) {
        throw new ConflictException(
          `Bu firma için '${dto.code}' kodlu başka bir malzeme var`,
        );
      }
    }

    const updated = await this.prisma.material.update({
      where: { id },
      data: {
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.unit !== undefined && { unit: dto.unit }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.minStock !== undefined && { minStock: dto.minStock }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        updatedBy: userId,
      },
    });

    this.logger.log(`✏️  Malzeme güncellendi: ${updated.code}`);

    return updated;
  }

  async remove(tenantId: string, userId: string, id: string) {
    const material = await this.findOne(tenantId, id);

    const movementCount = await this.prisma.materialMovement.count({
      where: { materialId: id, deletedAt: null },
    });

    if (movementCount > 0) {
      throw new BadRequestException(
        `Bu malzemeye ait ${movementCount} stok hareketi var. Önce hareketler silinmeli.`,
      );
    }

    await this.prisma.material.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: userId,
      },
    });

    this.logger.log(`🗑️  Malzeme silindi (soft): ${material.code}`);

    return { message: 'Malzeme silindi', id };
  }

  // ════════════════════════════════════
  // STOCK MOVEMENT (TRANSACTION CORE)
  // ════════════════════════════════════

  async createMovement(
    tenantId: string,
    userId: string,
    dto: CreateMovementDto,
  ) {
    const material = await this.prisma.material.findFirst({
      where: { id: dto.materialId, tenantId, deletedAt: null },
    });
    if (!material) {
      throw new BadRequestException(`Malzeme bulunamadı: ${dto.materialId}`);
    }

    if (dto.projectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: dto.projectId, tenantId, deletedAt: null },
      });
      if (!project) {
        throw new BadRequestException(`Proje bulunamadı: ${dto.projectId}`);
      }
    }

    const quantity = new Prisma.Decimal(dto.quantity);
    const currentStock = new Prisma.Decimal(material.currentStock.toString());

    if (dto.type === 'OUT' && currentStock.lessThan(quantity)) {
      throw new BadRequestException(
        `Yetersiz stok. Mevcut: ${currentStock.toString()} ${material.unit}, İstenen: ${quantity.toString()}`,
      );
    }

    const unitPrice = dto.unitPrice
      ? new Prisma.Decimal(dto.unitPrice)
      : null;
    const totalPrice = unitPrice ? unitPrice.mul(quantity) : null;

    let newStock: Prisma.Decimal;
    if (dto.type === 'IN') {
      newStock = currentStock.add(quantity);
    } else if (dto.type === 'OUT') {
      newStock = currentStock.sub(quantity);
    } else {
      newStock = quantity;
    }

    let newAvgPrice = new Prisma.Decimal(material.avgPrice.toString());
    let lastPurchasePrice = material.lastPurchasePrice
      ? new Prisma.Decimal(material.lastPurchasePrice.toString())
      : null;

    if (dto.type === 'IN' && unitPrice) {
      const oldStockVal = currentStock.mul(newAvgPrice);
      const newPurchaseVal = quantity.mul(unitPrice);
      if (newStock.greaterThan(0)) {
        newAvgPrice = oldStockVal.add(newPurchaseVal).div(newStock);
      }
      lastPurchasePrice = unitPrice;
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const movement = await tx.materialMovement.create({
        data: {
          tenantId,
          materialId: dto.materialId,
          projectId: dto.projectId,
          type: dto.type,
          quantity,
          unitPrice,
          totalPrice,
          currency: dto.currency ?? 'TRY',
          date: new Date(dto.date),
          supplier: dto.supplier,
          invoiceNo: dto.invoiceNo,
          notes: dto.notes,
          createdBy: userId,
          updatedBy: userId,
        },
        include: {
          material: { select: { id: true, code: true, name: true, unit: true } },
          project: { select: { id: true, code: true, name: true } },
        },
      });

      await tx.material.update({
        where: { id: dto.materialId },
        data: {
          currentStock: newStock,
          avgPrice: newAvgPrice,
          ...(lastPurchasePrice && { lastPurchasePrice }),
          updatedBy: userId,
        },
      });

      return movement;
    });

    this.logger.log(
      `📊 Stok hareketi: ${material.code} | ${dto.type} ${quantity.toString()} ${material.unit} | yeni stok: ${newStock.toString()}`,
    );

   // 🤖 OTOMATİK GİDER ÜRETİMİ
    // Kural (D): IN + fiyat varsa gider yazılır.
    // Proje seçiliyse projeye, seçilmemişse genel gider olarak.
    // OUT ve ADJUSTMENT gider üretmez (mükerrer kaydı engellemek için).
    //
    // ⚠️ Fatura kaynaklı hareketlerde gider YAZILMAZ — faturanın kendisi
    // tek bir gider kaydı oluşturur. Buradan da yazılırsa aynı harcama
    // iki kez gidere düşer. Bu metot manuel stok girişleri için çalışır;
    // fatura onayı InvoicesService.confirm() içinde kendi kaydını yazar.
    if (dto.type === 'IN' && totalPrice) {
      await this.expensesService.createFromMaterialMovement(tenantId, result.id);
    }
    return result;
  }

  async findMovements(tenantId: string, query: ListMovementsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.MaterialMovementWhereInput = {
      tenantId,
      deletedAt: null,
    };

    if (query.materialId) where.materialId = query.materialId;
    if (query.projectId) where.projectId = query.projectId;
    if (query.type) where.type = query.type;

    if (query.from || query.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(query.from);
      if (query.to) where.date.lte = new Date(query.to);
    }

    if (query.supplier) {
      where.supplier = { contains: query.supplier, mode: 'insensitive' };
    }

    if (query.search) {
      where.OR = [
        { invoiceNo: { contains: query.search, mode: 'insensitive' } },
        { supplier: { contains: query.search, mode: 'insensitive' } },
        { notes: { contains: query.search, mode: 'insensitive' } },
        {
          material: {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' } },
              { name: { contains: query.search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.materialMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        include: {
          material: { select: { id: true, code: true, name: true, unit: true, category: true } },
          project: { select: { id: true, code: true, name: true } },
        },
      }),
      this.prisma.materialMovement.count({ where }),
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

  async getMovementStats(tenantId: string, from?: string, to?: string) {
    const where: Prisma.MaterialMovementWhereInput = {
      tenantId,
      deletedAt: null,
    };

    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    } else {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      where.date = { gte: startOfMonth, lte: endOfMonth };
    }

    const [inMovements, outMovements, totalCount, suppliers] = await Promise.all([
      this.prisma.materialMovement.aggregate({
        where: { ...where, type: 'IN' },
        _sum: { totalPrice: true },
        _count: true,
      }),
      this.prisma.materialMovement.aggregate({
        where: { ...where, type: 'OUT' },
        _count: true,
      }),
      this.prisma.materialMovement.count({ where }),
      this.prisma.materialMovement.findMany({
        where: { ...where, type: 'IN', supplier: { not: null } },
        select: { supplier: true },
        distinct: ['supplier'],
      }),
    ]);

    return {
      totalIn: inMovements._count,
      totalOut: outMovements._count,
      totalCost: inMovements._sum?.totalPrice?.toString() ?? '0',
      uniqueSuppliers: suppliers.length,
      totalMovements: totalCount,
    };
  }

  async removeMovement(tenantId: string, userId: string, id: string) {
    const movement = await this.prisma.materialMovement.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!movement) {
      throw new NotFoundException(`Stok hareketi bulunamadı: ${id}`);
    }

    await this.prisma.$transaction(async (tx) => {
      const material = await tx.material.findUnique({
        where: { id: movement.materialId },
      });
      if (!material) {
        throw new NotFoundException('Malzeme bulunamadı');
      }

      const currentStock = new Prisma.Decimal(material.currentStock.toString());
      const quantity = new Prisma.Decimal(movement.quantity.toString());

      let newStock: Prisma.Decimal;
      if (movement.type === 'IN') {
        newStock = currentStock.sub(quantity);
      } else if (movement.type === 'OUT') {
        newStock = currentStock.add(quantity);
      } else {
        newStock = currentStock;
      }

      await tx.material.update({
        where: { id: movement.materialId },
        data: {
          currentStock: newStock,
          updatedBy: userId,
        },
      });

      await tx.materialMovement.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          updatedBy: userId,
        },
      });
    });

    // 🤖 OTOMATİK GİDER GERİ ÇEKME
    await this.expensesService.deleteBySource(tenantId, 'MATERIAL_MOVEMENT', id);

    this.logger.log(`🗑️  Stok hareketi silindi (soft): ${id}`);

    return { message: 'Stok hareketi silindi', id };
  }

  async removeMovementsBulk(tenantId: string, userId: string, ids: string[]) {
    if (ids.length === 0) {
      throw new BadRequestException('En az bir hareket seçilmelidir');
    }
    if (ids.length > 50) {
      throw new BadRequestException('Tek seferde en fazla 50 hareket silinebilir');
    }

    const movements = await this.prisma.materialMovement.findMany({
      where: {
        id: { in: ids },
        tenantId,
        deletedAt: null,
      },
    });

    if (movements.length === 0) {
      throw new NotFoundException('Geçerli hareket bulunamadı');
    }

    let successCount = 0;
    for (const movement of movements) {
      try {
        await this.removeMovement(tenantId, userId, movement.id);
        successCount++;
      } catch (error) {
        this.logger.warn(`Hareket silinemedi: ${movement.id} - ${error}`);
      }
    }

    this.logger.log(`🗑️  Toplu silme: ${successCount}/${ids.length} hareket silindi`);

    return {
      message: `${successCount} hareket silindi`,
      total: ids.length,
      success: successCount,
    };
  }

  // ════════════════════════════════════
  // STATS (Malzeme genel)
  // ════════════════════════════════════
  async getStats(tenantId: string) {
    const baseWhere = { tenantId, deletedAt: null };

    const [totalMaterials, totalMovements, materials] = await Promise.all([
      this.prisma.material.count({ where: baseWhere }),
      this.prisma.materialMovement.count({ where: baseWhere }),
      this.prisma.material.findMany({
        where: baseWhere,
        select: {
          currentStock: true,
          minStock: true,
          avgPrice: true,
        },
      }),
    ]);

    let totalStockValue = new Prisma.Decimal(0);
    let lowStockCount = 0;

    for (const m of materials) {
      const stock = new Prisma.Decimal(m.currentStock.toString());
      const avg = new Prisma.Decimal(m.avgPrice.toString());
      const minS = new Prisma.Decimal(m.minStock.toString());

      totalStockValue = totalStockValue.add(stock.mul(avg));

      if (minS.greaterThan(0) && stock.lessThanOrEqualTo(minS)) {
        lowStockCount++;
      }
    }

    return {
      totalMaterials,
      totalMovements,
      lowStockCount,
      totalStockValue: totalStockValue.toString(),
    };
  }
} 