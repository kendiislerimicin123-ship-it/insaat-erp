import { apiClient } from './client';
import { Employee } from './employees';

export type TimesheetStatus = 'DRAFT' | 'APPROVED' | 'PAID' | 'CANCELLED';

export interface TimesheetDetail {
  id: string;
  employeeId: string;
  absent: boolean;
  hoursWorked: string;
  dailyWage: string;
  overtimeHours: string;
  overtimeMultiplier: string;
  totalEarning: string;
  notes: string | null;
  employee?: Pick<Employee, 'id' | 'name' | 'specialty' | 'role'>;
}

export interface Timesheet {
  id: string;
  tenantId: string;
  subcontractorId: string;
  projectId: string;
  date: string;
  workDescription: string | null;
  approvedBy: string | null;
  status: TimesheetStatus;
  totalAmount: string;
  employeeCount: number;
  totalHours: string;
  currency: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  subcontractor?: { id: string; code: string; name: string };
  project?: { id: string; code: string; name: string };
  details?: TimesheetDetail[];
  _count?: { details: number };
}

export interface TimesheetDetailInput {
  employeeId: string;
  absent?: boolean;
  hoursWorked: number;
  dailyWage: number;
  overtimeHours?: number;
  overtimeMultiplier?: number;
  notes?: string;
}

export interface CreateTimesheetInput {
  subcontractorId: string;
  projectId: string;
  date: string;
  workDescription?: string;
  approvedBy?: string;
  currency?: string;
  notes?: string;
  details: TimesheetDetailInput[];
}

export interface UpdateTimesheetInput {
  date?: string;
  workDescription?: string;
  approvedBy?: string;
  notes?: string;
  details?: TimesheetDetailInput[];
}

export const timesheetsApi = {
  async list(query: {
    page?: number;
    limit?: number;
    subcontractorId?: string;
    projectId?: string;
    status?: TimesheetStatus;
    from?: string;
    to?: string;
  } = {}) {
    const { data } = await apiClient.get<{
      items: Timesheet[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
      summary: { totalAmount: string; totalHours: string; totalEmployees: number };
    }>('/timesheets', { params: query });
    return data;
  },

  async getById(id: string): Promise<Timesheet> {
    const { data } = await apiClient.get<Timesheet>(`/timesheets/${id}`);
    return data;
  },

  async create(input: CreateTimesheetInput): Promise<Timesheet> {
    const { data } = await apiClient.post<Timesheet>('/timesheets', input);
    return data;
  },

  async update(id: string, input: UpdateTimesheetInput): Promise<Timesheet> {
    const { data } = await apiClient.patch<Timesheet>(`/timesheets/${id}`, input);
    return data;
  },

  async approve(id: string): Promise<Timesheet> {
    const { data } = await apiClient.patch<Timesheet>(`/timesheets/${id}/approve`, {});
    return data;
  },

  async remove(id: string): Promise<{ message: string; id: string }> {
    const { data } = await apiClient.delete<{ message: string; id: string }>(
      `/timesheets/${id}`,
    );
    return data;
  },
};

export const TIMESHEET_STATUS_LABELS: Record<TimesheetStatus, string> = {
  DRAFT: 'Taslak',
  APPROVED: 'Onaylandı',
  PAID: 'Ödendi',
  CANCELLED: 'İptal',
};

export const TIMESHEET_STATUS_COLORS: Record<TimesheetStatus, string> = {
  DRAFT: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-slate-100 text-slate-700',
};

export function formatTimesheetAmount(amount: string | number, currency = 'TRY'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatTimesheetDate(dateString: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateString));
}

// Bir detay satırı için kazanç hesaplama (frontend preview)
export function calculateEarning(detail: TimesheetDetailInput): number {
  if (detail.absent) return 0;
  const hourlyRate = detail.dailyWage / 8;
  const normalEarning = hourlyRate * detail.hoursWorked;
  const overtimeEarning =
    hourlyRate * (detail.overtimeHours ?? 0) * (detail.overtimeMultiplier ?? 1.5);
  return normalEarning + overtimeEarning;
}