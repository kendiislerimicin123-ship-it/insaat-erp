import { apiClient } from './client';

export type SubcontractorCategory =
  | 'EXCAVATION'
  | 'CONCRETE'
  | 'FORMWORK'
  | 'REBAR'
  | 'MASONRY'
  | 'PLASTER'
  | 'PAINT'
  | 'TILE'
  | 'ELECTRICAL'
  | 'PLUMBING'
  | 'HVAC'
  | 'CARPENTRY'
  | 'ROOFING'
  | 'INSULATION'
  | 'LANDSCAPING'
  | 'CLEANING'
  | 'OTHER';

export type SubcontractorStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'BLACKLISTED'
  | 'ARCHIVED';

export interface Subcontractor {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  category: SubcontractorCategory;
  status: SubcontractorStatus;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  taxNumber: string | null;
  taxOffice: string | null;
  tradeRegistry: string | null;
  iban: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface CreateSubcontractorInput {
  code: string;
  name: string;
  category?: SubcontractorCategory;
  status?: SubcontractorStatus;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  district?: string;
  taxNumber?: string;
  taxOffice?: string;
  tradeRegistry?: string;
  iban?: string;
  notes?: string;
}

export type UpdateSubcontractorInput = Partial<CreateSubcontractorInput>;

export interface ListSubcontractorsQuery {
  page?: number;
  limit?: number;
  category?: SubcontractorCategory;
  status?: SubcontractorStatus;
  city?: string;
  search?: string;
}

export interface SubcontractorsListResponse {
  items: Subcontractor[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SubcontractorStats {
  total: number;
  active: number;
  inactive: number;
  blacklisted: number;
}

export const subcontractorsApi = {
  async list(query: ListSubcontractorsQuery = {}): Promise<SubcontractorsListResponse> {
    const { data } = await apiClient.get<SubcontractorsListResponse>(
      '/subcontractors',
      { params: query },
    );
    return data;
  },

  async getById(id: string): Promise<Subcontractor> {
    const { data } = await apiClient.get<Subcontractor>(`/subcontractors/${id}`);
    return data;
  },

  async create(input: CreateSubcontractorInput): Promise<Subcontractor> {
    const { data } = await apiClient.post<Subcontractor>('/subcontractors', input);
    return data;
  },

  async update(id: string, input: UpdateSubcontractorInput): Promise<Subcontractor> {
    const { data } = await apiClient.patch<Subcontractor>(
      `/subcontractors/${id}`,
      input,
    );
    return data;
  },

  async remove(id: string): Promise<{ message: string; id: string }> {
    const { data } = await apiClient.delete<{ message: string; id: string }>(
      `/subcontractors/${id}`,
    );
    return data;
  },

  async getStats(): Promise<SubcontractorStats> {
    const { data } = await apiClient.get<SubcontractorStats>(
      '/subcontractors/stats',
    );
    return data;
  },

  async listAll(): Promise<Array<{ id: string; code: string; name: string; category: SubcontractorCategory; status: SubcontractorStatus }>> {
    const { data } = await apiClient.get<{
      items: Array<{ id: string; code: string; name: string; category: SubcontractorCategory; status: SubcontractorStatus }>;
    }>('/subcontractors', { params: { limit: 100, status: 'ACTIVE' } });
    return data.items;
  },
};

// ─── Helper'lar ───
export const SUBCONTRACTOR_CATEGORY_LABELS: Record<SubcontractorCategory, string> = {
  EXCAVATION: 'Hafriyat',
  CONCRETE: 'Beton',
  FORMWORK: 'Kalıp',
  REBAR: 'Demir Donatı',
  MASONRY: 'Duvarcılık',
  PLASTER: 'Sıva',
  PAINT: 'Boya',
  TILE: 'Fayans / Seramik',
  ELECTRICAL: 'Elektrik',
  PLUMBING: 'Sıhhi Tesisat',
  HVAC: 'Mekanik / HVAC',
  CARPENTRY: 'Doğrama',
  ROOFING: 'Çatı',
  INSULATION: 'Yalıtım',
  LANDSCAPING: 'Peyzaj',
  CLEANING: 'Temizlik',
  OTHER: 'Diğer',
};

export const SUBCONTRACTOR_STATUS_LABELS: Record<SubcontractorStatus, string> = {
  ACTIVE: 'Aktif',
  INACTIVE: 'Pasif',
  BLACKLISTED: 'Kara Liste',
  ARCHIVED: 'Arşiv',
};

export const SUBCONTRACTOR_STATUS_COLORS: Record<SubcontractorStatus, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  INACTIVE: 'bg-slate-100 text-slate-700',
  BLACKLISTED: 'bg-red-100 text-red-700',
  ARCHIVED: 'bg-amber-100 text-amber-700',
};  