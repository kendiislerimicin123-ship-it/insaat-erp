import { apiClient } from './client';

export type ProjectStatus =
  | 'PLANNING'
  | 'ACTIVE'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Project {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  address: string | null;
  city: string | null;
  district: string | null;
  clientName: string | null;
  clientTaxNumber: string | null;
  clientPhone: string | null;
  clientEmail: string | null;
  contractAmount: string | null; // Decimal backend'den string gelir
  currency: string;
  startDate: string | null;
  endDate: string | null;
  actualEndDate: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface CreateProjectInput {
  code: string;
  name: string;
  description?: string;
  status?: ProjectStatus;
  address?: string;
  city?: string;
  district?: string;
  clientName?: string;
  clientTaxNumber?: string;
  clientPhone?: string;
  clientEmail?: string;
  contractAmount?: number;
  currency?: string;
  startDate?: string;
  endDate?: string;
}

export interface ProjectStats {
  total: number;
  byStatus: {
    active: number;
    planning: number;
    completed: number;
    onHold: number;
  };
  thisMonthCreated: number;
  recentProjects: Array<{
    id: string;
    code: string;
    name: string;
    status: ProjectStatus;
    city: string | null;
    contractAmount: string | null;
    currency: string;
    createdAt: string;
  }>;
}

export interface UpdateProjectInput extends Partial<CreateProjectInput> {
  actualEndDate?: string;
}

export interface ListProjectsQuery {
  page?: number;
  limit?: number;
  status?: ProjectStatus;
  city?: string;
  search?: string;
}

export interface ProjectsListResponse {
  items: Project[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const projectsApi = {
  async list(query: ListProjectsQuery = {}): Promise<ProjectsListResponse> {
    const { data } = await apiClient.get<ProjectsListResponse>('/projects', {
      params: query,
    });
    return data;
  },

  async getById(id: string): Promise<Project> {
    const { data } = await apiClient.get<Project>(`/projects/${id}`);
    return data;
  },

  async create(input: CreateProjectInput): Promise<Project> {
    const { data } = await apiClient.post<Project>('/projects', input);
    return data;
  },

  async update(id: string, input: UpdateProjectInput): Promise<Project> {
    const { data } = await apiClient.patch<Project>(`/projects/${id}`, input);
    return data;
  },

  async remove(id: string): Promise<{ message: string; id: string }> {
    const { data } = await apiClient.delete<{ message: string; id: string }>(
      `/projects/${id}`,
    );
    return data;
  },
  
  async getStats(): Promise<ProjectStats> {
    const { data } = await apiClient.get<ProjectStats>('/projects/stats');
    return data;
  },

  async listAll(): Promise<Array<{ id: string; code: string; name: string; status: string }>> {
    const { data } = await apiClient.get<{
      items: Array<{ id: string; code: string; name: string; status: string }>;
    }>('/projects', { params: { limit: 100 } });
    return data.items;
  },
};

// ─── Helper'lar ───
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNING: 'Planlama',
  ACTIVE: 'Aktif',
  ON_HOLD: 'Beklemede',
  COMPLETED: 'Tamamlandı',
  CANCELLED: 'İptal',
};

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  PLANNING: 'bg-slate-100 text-slate-700',
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  ON_HOLD: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export function formatCurrency(amount: string | null, currency = 'TRY'): string {
  if (!amount) return '—';
  const num = parseFloat(amount);
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatDate(dateString: string | null): string {
  if (!dateString) return '—';
  try {
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(dateString));
  } catch {
    return '—';
  }
}