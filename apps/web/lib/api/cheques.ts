import { apiClient } from './client';

export type ChequeKind = 'CHEQUE' | 'PROMISSORY_NOTE';
export type ChequeDirection = 'INCOMING' | 'OUTGOING';
export type ChequeStatus =
  | 'PORTFOLIO' | 'ENDORSED' | 'DEPOSITED'
  | 'COLLECTED' | 'PAID' | 'BOUNCED' | 'CANCELLED';

export interface Cheque {
  id: string;
  tenantId: string;
  contactId: string;
  kind: ChequeKind;
  direction: ChequeDirection;
  chequeNo: string;
  bankName: string | null;
  bankBranch: string | null;
  drawer: string | null;
  amount: string;
  currency: string;
  issueDate: string;
  dueDate: string;
  status: ChequeStatus;
  statusDate: string | null;
  statusNote: string | null;
  description: string | null;
  createdAt: string;
  contact?: { id: string; code: string; name: string };
}

export interface CreateChequeInput {
  contactId: string;
  kind: ChequeKind;
  direction: ChequeDirection;
  chequeNo: string;
  bankName?: string;
  bankBranch?: string;
  drawer?: string;
  amount: number;
  currency?: string;
  issueDate: string;
  dueDate: string;
  description?: string;
}

export interface ChequeStats {
  counts: { totalIncoming: number; totalOutgoing: number };
  portfolio: {
    incoming: { count: number; total: string };
    outgoing: { count: number; total: string };
  };
  overdue: {
    incoming: { count: number; total: string };
    outgoing: { count: number; total: string };
  };
  upcoming30Days: {
    incoming: { count: number; total: string };
    outgoing: { count: number; total: string };
  };
  monthlyDistribution: Array<{
    month: string;
    incoming: string;
    outgoing: string;
    count: number;
  }>;
}

export const chequesApi = {
  async list(query: {
    contactId?: string;
    kind?: ChequeKind;
    direction?: ChequeDirection;
    status?: ChequeStatus;
    dueFrom?: string;
    dueTo?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const { data } = await apiClient.get<{
      items: Cheque[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>('/cheques', { params: query });
    return data;
  },

  async create(input: CreateChequeInput): Promise<Cheque> {
    const { data } = await apiClient.post<Cheque>('/cheques', input);
    return data;
  },

  async updateStatus(id: string, status: ChequeStatus, statusNote?: string): Promise<Cheque> {
    const { data } = await apiClient.patch<Cheque>(`/cheques/${id}/status`, {
      status,
      statusNote,
    });
    return data;
  },

  async remove(id: string): Promise<{ message: string; id: string }> {
    const { data } = await apiClient.delete<{ message: string; id: string }>(
      `/cheques/${id}`,
    );
    return data;
  },

  async getStats(): Promise<ChequeStats> {
    const { data } = await apiClient.get<ChequeStats>('/cheques/stats');
    return data;
  },
};

export const CHEQUE_KIND_LABELS: Record<ChequeKind, string> = {
  CHEQUE: 'Çek',
  PROMISSORY_NOTE: 'Senet',
};

export const CHEQUE_DIRECTION_LABELS: Record<ChequeDirection, string> = {
  INCOMING: 'Gelen',
  OUTGOING: 'Verilen',
};

export const CHEQUE_DIRECTION_COLORS: Record<ChequeDirection, string> = {
  INCOMING: 'bg-emerald-100 text-emerald-700',
  OUTGOING: 'bg-red-100 text-red-700',
};

export const CHEQUE_STATUS_LABELS: Record<ChequeStatus, string> = {
  PORTFOLIO: 'Portföyde',
  ENDORSED: 'Ciro Edildi',
  DEPOSITED: 'Bankada',
  COLLECTED: 'Tahsil Edildi',
  PAID: 'Ödendi',
  BOUNCED: 'Karşılıksız',
  CANCELLED: 'İptal',
};

export const CHEQUE_STATUS_COLORS: Record<ChequeStatus, string> = {
  PORTFOLIO: 'bg-blue-100 text-blue-700',
  ENDORSED: 'bg-amber-100 text-amber-700',
  DEPOSITED: 'bg-cyan-100 text-cyan-700',
  COLLECTED: 'bg-emerald-100 text-emerald-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  BOUNCED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-700',
};

export function formatChequeAmount(amount: string | number, currency = 'TRY'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatChequeDate(dateString: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateString));
}

// Vade kalan gün
export function daysUntilDue(dueDate: string): number {
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// Ay adlandırma (örn: "2026-05" → "Mayıs 2026")
const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

export function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const monthIdx = parseInt(month, 10) - 1;
  return `${MONTH_NAMES[monthIdx]} ${year}`;
}