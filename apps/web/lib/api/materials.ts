import { apiClient } from './client';

export type MaterialCategory =
  | 'CEMENT' | 'AGGREGATE' | 'STEEL' | 'TIMBER' | 'BRICK_BLOCK'
  | 'TILE_CERAMIC' | 'PAINT_CHEMICAL' | 'ELECTRICAL' | 'PLUMBING'
  | 'HVAC' | 'INSULATION' | 'ADHESIVE' | 'HARDWARE' | 'TOOLS'
  | 'SAFETY' | 'OTHER';

export type MaterialUnit =
  | 'PIECE' | 'KG' | 'TON' | 'M' | 'M2' | 'M3'
  | 'LITER' | 'PACKAGE' | 'BOX' | 'ROLL';

export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT';

export interface Material {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  category: MaterialCategory;
  unit: MaterialUnit;
  description: string | null;
  currentStock: string;
  minStock: string;
  avgPrice: string;
  lastPurchasePrice: string | null;
  currency: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialMovement {
  id: string;
  tenantId: string;
  materialId: string;
  projectId: string | null;
  type: MovementType;
  quantity: string;
  unitPrice: string | null;
  totalPrice: string | null;
  currency: string;
  date: string;
  supplier: string | null;
  invoiceNo: string | null;
  notes: string | null;
  createdAt: string;
  material: {
    id: string;
    code: string;
    name: string;
    unit: MaterialUnit;
    category?: MaterialCategory;
  };
  project: { id: string; code: string; name: string } | null;
}

export interface CreateMaterialInput {
  code: string;
  name: string;
  category: MaterialCategory;
  unit: MaterialUnit;
  description?: string;
  minStock?: number;
  currency?: string;
  notes?: string;
}

export type UpdateMaterialInput = Partial<CreateMaterialInput>;

export interface CreateMovementInput {
  materialId: string;
  type: MovementType;
  quantity: number;
  unitPrice?: number;
  currency?: string;
  projectId?: string;
  date: string;
  supplier?: string;
  invoiceNo?: string;
  notes?: string;
}

export interface MaterialStats {
  totalMaterials: number;
  totalMovements: number;
  lowStockCount: number;
  totalStockValue: string;
}

export interface MovementStats {
  totalIn: number;
  totalOut: number;
  totalCost: string;
  uniqueSuppliers: number;
  totalMovements: number;
}

export const materialsApi = {
  async list(query: { page?: number; limit?: number; category?: MaterialCategory; unit?: MaterialUnit; search?: string; lowStock?: string } = {}) {
    const { data } = await apiClient.get<{
      items: Material[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>('/materials', { params: query });
    return data;
  },

  async listAll(): Promise<Material[]> {
    const { data } = await apiClient.get<{ items: Material[] }>('/materials', {
      params: { limit: 100 },
    });
    return data.items;
  },

  async create(input: CreateMaterialInput): Promise<Material> {
    const { data } = await apiClient.post<Material>('/materials', input);
    return data;
  },

  async update(id: string, input: UpdateMaterialInput): Promise<Material> {
    const { data } = await apiClient.patch<Material>(`/materials/${id}`, input);
    return data;
  },

  async remove(id: string): Promise<{ message: string; id: string }> {
    const { data } = await apiClient.delete<{ message: string; id: string }>(
      `/materials/${id}`,
    );
    return data;
  },

  async getStats(): Promise<MaterialStats> {
    const { data } = await apiClient.get<MaterialStats>('/materials/stats');
    return data;
  },

  // ─── Movements ───
  async listMovements(query: {
    page?: number;
    limit?: number;
    materialId?: string;
    projectId?: string;
    type?: MovementType;
    from?: string;
    to?: string;
    search?: string;
    supplier?: string;
  } = {}) {
    const { data } = await apiClient.get<{
      items: MaterialMovement[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>('/materials/movements', { params: query });
    return data;
  },

  async getMovementStats(from?: string, to?: string): Promise<MovementStats> {
    const { data } = await apiClient.get<MovementStats>('/materials/movements/stats', {
      params: { from, to },
    });
    return data;
  },

  async createMovement(input: CreateMovementInput): Promise<MaterialMovement> {
    const { data } = await apiClient.post<MaterialMovement>(
      '/materials/movements',
      input,
    );
    return data;
  },

  async removeMovement(id: string): Promise<{ message: string; id: string }> {
    const { data } = await apiClient.delete<{ message: string; id: string }>(
      `/materials/movements/${id}`,
    );
    return data;
  },

  async removeMovementsBulk(ids: string[]): Promise<{ message: string; total: number; success: number }> {
    const { data } = await apiClient.post<{ message: string; total: number; success: number }>(
      '/materials/movements/bulk-delete',
      { ids },
    );
    return data;
  },
};

export const MATERIAL_CATEGORY_LABELS: Record<MaterialCategory, string> = {
  CEMENT: 'Çimento',
  AGGREGATE: 'Agrega (Kum/Çakıl)',
  STEEL: 'Demir/Çelik',
  TIMBER: 'Kereste',
  BRICK_BLOCK: 'Tuğla/Briket',
  TILE_CERAMIC: 'Fayans/Seramik',
  PAINT_CHEMICAL: 'Boya/Kimyasal',
  ELECTRICAL: 'Elektrik',
  PLUMBING: 'Sıhhi Tesisat',
  HVAC: 'Mekanik (HVAC)',
  INSULATION: 'Yalıtım',
  ADHESIVE: 'Yapıştırıcı/Harç',
  HARDWARE: 'Hırdavat',
  TOOLS: 'Aletler',
  SAFETY: 'İş Güvenliği',
  OTHER: 'Diğer',
};

export const MATERIAL_UNIT_LABELS: Record<MaterialUnit, string> = {
  PIECE: 'Adet',
  KG: 'kg',
  TON: 'Ton',
  M: 'm',
  M2: 'm²',
  M3: 'm³',
  LITER: 'lt',
  PACKAGE: 'Paket/Çuval',
  BOX: 'Kutu',
  ROLL: 'Rulo',
};

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  IN: 'Giriş',
  OUT: 'Çıkış',
  ADJUSTMENT: 'Düzeltme',
};

export const MOVEMENT_TYPE_COLORS: Record<MovementType, string> = {
  IN: 'bg-emerald-100 text-emerald-700',
  OUT: 'bg-red-100 text-red-700',
  ADJUSTMENT: 'bg-amber-100 text-amber-700',
};

export const MOVEMENT_TYPE_ROW_COLORS: Record<MovementType, string> = {
  IN: 'bg-emerald-50/40 hover:bg-emerald-50',
  OUT: 'bg-red-50/40 hover:bg-red-50',
  ADJUSTMENT: 'bg-amber-50/40 hover:bg-amber-50',
};

export function formatStock(value: string | number, unit: MaterialUnit): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  const formatted = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(num);
  return `${formatted} ${MATERIAL_UNIT_LABELS[unit]}`;
}

export function formatCurrency(amount: string | number, currency = 'TRY'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateString));
}