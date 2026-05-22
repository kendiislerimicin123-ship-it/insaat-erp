import { apiClient } from './client';

export type PaymentStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'PAID'
  | 'REJECTED'
  | 'CANCELLED';

export interface ProgressPayment {
  id: string;
  tenantId: string;
  code: string;
  projectId: string;
  subcontractorId: string;
  period: string;
  amount: string; // Decimal as string
  taxRate: string;
  taxAmount: string;
  totalAmount: string;
  currency: string;
  status: PaymentStatus;
  description: string | null;
  notes: string | null;
  issuedAt: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  paymentMethod: string | null;
  paymentRef: string | null;
  createdAt: string;
  updatedAt: string;
  project: { id: string; code: string; name: string };
  subcontractor: { id: string; code: string; name: string; category: string };
}

export interface CreateProgressPaymentInput {
  code: string;
  projectId: string;
  subcontractorId: string;
  period: string;
  amount: number;
  taxRate?: number;
  currency?: string;
  status?: PaymentStatus;
  description?: string;
  notes?: string;
  issuedAt?: string;
}

export type UpdateProgressPaymentInput = Partial<CreateProgressPaymentInput>;

export interface PayProgressPaymentInput {
  paymentMethod: string;
  paymentRef?: string;
}

export interface ListProgressPaymentsQuery {
  page?: number;
  limit?: number;
  status?: PaymentStatus;
  projectId?: string;
  subcontractorId?: string;
  period?: string;
  search?: string;
}

export interface ProgressPaymentsListResponse {
  items: ProgressPayment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalAmount: string;
    amount: string;
    taxAmount: string;
  };
}

export interface ProgressPaymentStats {
  total: number;
  byStatus: { draft: number; submitted: number; approved: number; paid: number };
  totalAmount: string;
  paidAmount: string;
  pendingAmount: string;
}

export const progressPaymentsApi = {
  async list(query: ListProgressPaymentsQuery = {}): Promise<ProgressPaymentsListResponse> {
    const { data } = await apiClient.get<ProgressPaymentsListResponse>(
      '/progress-payments',
      { params: query },
    );
    return data;
  },

  async getById(id: string): Promise<ProgressPayment> {
    const { data } = await apiClient.get<ProgressPayment>(`/progress-payments/${id}`);
    return data;
  },

  async create(input: CreateProgressPaymentInput): Promise<ProgressPayment> {
    const { data } = await apiClient.post<ProgressPayment>('/progress-payments', input);
    return data;
  },

  async update(id: string, input: UpdateProgressPaymentInput): Promise<ProgressPayment> {
    const { data } = await apiClient.patch<ProgressPayment>(
      `/progress-payments/${id}`,
      input,
    );
    return data;
  },

  async approve(id: string): Promise<ProgressPayment> {
    const { data } = await apiClient.patch<ProgressPayment>(
      `/progress-payments/${id}/approve`,
      {},
    );
    return data;
  },

  async pay(id: string, input: PayProgressPaymentInput): Promise<ProgressPayment> {
    const { data } = await apiClient.patch<ProgressPayment>(
      `/progress-payments/${id}/pay`,
      input,
    );
    return data;
  },

  async remove(id: string): Promise<{ message: string; id: string }> {
    const { data } = await apiClient.delete<{ message: string; id: string }>(
      `/progress-payments/${id}`,
    );
    return data;
  },

  async getStats(): Promise<ProgressPaymentStats> {
    const { data } = await apiClient.get<ProgressPaymentStats>(
      '/progress-payments/stats',
    );
    return data;
  },
};

// ─── Helper'lar ───
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  DRAFT: 'Taslak',
  SUBMITTED: 'Sunuldu',
  APPROVED: 'Onaylandı',
  PAID: 'Ödendi',
  REJECTED: 'Reddedildi',
  CANCELLED: 'İptal',
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-amber-100 text-amber-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-200 text-slate-600',
};

export function formatCurrency(amount: string | number, currency = 'TRY'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatPeriod(period: string): string {
  // 2026-05 → Mayıs 2026
  const [year, month] = period.split('-');
  const months = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
  ];
  return `${months[parseInt(month) - 1]} ${year}`;
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateString));
}