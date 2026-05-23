import { apiClient } from './client';

export type EmployeeSpecialty =
  | 'FOREMAN' | 'MASTER' | 'APPRENTICE' | 'LABORER'
  | 'OPERATOR' | 'DRIVER' | 'TECHNICIAN' | 'ENGINEER' | 'OTHER';

export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'TERMINATED' | 'ARCHIVED';

export interface Employee {
  id: string;
  tenantId: string;
  subcontractorId: string;
  name: string;
  tcNo: string | null;
  phone: string | null;
  specialty: EmployeeSpecialty;
  role: string | null;
  dailyWage: string;
  currency: string;
  startDate: string | null;
  endDate: string | null;
  status: EmployeeStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  subcontractor?: { id: string; code: string; name: string };
}

export interface CreateEmployeeInput {
  subcontractorId: string;
  name: string;
  tcNo?: string;
  phone?: string;
  specialty: EmployeeSpecialty;
  role?: string;
  dailyWage: number;
  currency?: string;
  startDate?: string;
  endDate?: string;
  status?: EmployeeStatus;
  notes?: string;
}

export type UpdateEmployeeInput = Partial<CreateEmployeeInput>;

export const employeesApi = {
  async list(query: {
    page?: number;
    limit?: number;
    subcontractorId?: string;
    specialty?: EmployeeSpecialty;
    status?: EmployeeStatus;
    search?: string;
  } = {}) {
    const { data } = await apiClient.get<{
      items: Employee[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>('/employees', { params: query });
    return data;
  },

  async listBySubcontractor(subcontractorId: string): Promise<Employee[]> {
    const { data } = await apiClient.get<{ items: Employee[] }>('/employees', {
      params: { subcontractorId, limit: 100, status: 'ACTIVE' },
    });
    return data.items;
  },

  async create(input: CreateEmployeeInput): Promise<Employee> {
    const { data } = await apiClient.post<Employee>('/employees', input);
    return data;
  },

  async update(id: string, input: UpdateEmployeeInput): Promise<Employee> {
    const { data } = await apiClient.patch<Employee>(`/employees/${id}`, input);
    return data;
  },

  async remove(id: string): Promise<{ message: string; id: string }> {
    const { data } = await apiClient.delete<{ message: string; id: string }>(
      `/employees/${id}`,
    );
    return data;
  },
};

export const EMPLOYEE_SPECIALTY_LABELS: Record<EmployeeSpecialty, string> = {
  FOREMAN: 'Ustabaşı',
  MASTER: 'Usta',
  APPRENTICE: 'Çırak',
  LABORER: 'Düz İşçi',
  OPERATOR: 'Operatör',
  DRIVER: 'Şoför',
  TECHNICIAN: 'Teknisyen',
  ENGINEER: 'Mühendis',
  OTHER: 'Diğer',
};

export const EMPLOYEE_SPECIALTY_COLORS: Record<EmployeeSpecialty, string> = {
  FOREMAN: 'bg-purple-100 text-purple-700',
  MASTER: 'bg-blue-100 text-blue-700',
  APPRENTICE: 'bg-cyan-100 text-cyan-700',
  LABORER: 'bg-slate-100 text-slate-700',
  OPERATOR: 'bg-amber-100 text-amber-700',
  DRIVER: 'bg-emerald-100 text-emerald-700',
  TECHNICIAN: 'bg-indigo-100 text-indigo-700',
  ENGINEER: 'bg-pink-100 text-pink-700',
  OTHER: 'bg-slate-100 text-slate-600',
};

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  ACTIVE: 'Aktif',
  INACTIVE: 'Pasif',
  TERMINATED: 'Ayrıldı',
  ARCHIVED: 'Arşiv',
};

export const EMPLOYEE_STATUS_COLORS: Record<EmployeeStatus, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  INACTIVE: 'bg-slate-100 text-slate-700',
  TERMINATED: 'bg-red-100 text-red-700',
  ARCHIVED: 'bg-amber-100 text-amber-700',
};

export function formatWage(wage: string | number, currency = 'TRY'): string {
  const num = typeof wage === 'string' ? parseFloat(wage) : wage;
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}