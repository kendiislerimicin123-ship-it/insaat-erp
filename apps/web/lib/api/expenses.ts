import { apiClient } from './client';

export type ExpenseCategory =
  | 'OFFICE' | 'VEHICLE' | 'PAYROLL_TAX' | 'EQUIPMENT' | 'UTILITIES'
  | 'PERMITS' | 'INSURANCE' | 'CONSULTING' | 'FOOD' | 'TRANSPORTATION'
  | 'COMMUNICATION' | 'ENTERTAINMENT' | 'OTHER';

export type ExpenseStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

export type PaymentMethod = 'CASH' | 'BANK' | 'CHEQUE' | 'CREDIT_CARD' | 'OTHER';

export interface Expense {
  id: string;
  tenantId: string;
  code: string;
  category: ExpenseCategory;
  status: ExpenseStatus;
  amount: string;
  vatRate: string;
  vatAmount: string;
  totalAmount: string;
  currency: string;
  date: string;
  description: string;
  notes: string | null;
  projectId: string | null;
  contactId: string | null;
  subcontractorId: string | null;
  invoiceNo: string | null;
  taxNumber: string | null;
  paymentMethod: PaymentMethod | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; code: string; name: string } | null;
  contact?: { id: string; code: string; name: string; type: string } | null;
  subcontractor?: { id: string; code: string; name: string } | null;
}

export interface CreateExpenseInput {
  category: ExpenseCategory;
  status?: ExpenseStatus;
  amount: number;
  vatRate?: number;
  currency?: string;
  date: string;
  description: string;
  notes?: string;
  projectId?: string;
  contactId?: string;
  subcontractorId?: string;
  invoiceNo?: string;
  taxNumber?: string;
  paymentMethod?: PaymentMethod;
  paidAt?: string;
  // YENİ: Çek bilgileri (sadece paymentMethod === 'CHEQUE' iken kullanılır)
  chequeNo?: string;
  bankName?: string;
  dueDate?: string;
}

export type UpdateExpenseInput = Partial<CreateExpenseInput>;

export interface ExpenseStats {
  totalCount: number;
  totalAmount: string;
  totalVat: string;
  totalNet: string;
  byCategory: Array<{
    category: ExpenseCategory;
    count: number;
    amount: string;
  }>;
}

export const expensesApi = {
  async list(query: {
    page?: number;
    limit?: number;
    category?: ExpenseCategory;
    status?: ExpenseStatus;
    projectId?: string;
    contactId?: string;
    subcontractorId?: string;
    paymentMethod?: PaymentMethod;
    from?: string;
    to?: string;
    search?: string;
  } = {}) {
    const { data } = await apiClient.get<{
      items: Expense[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
      summary: { totalAmount: string; totalVat: string; totalNet: string };
    }>('/expenses', { params: query });
    return data;
  },

  async getById(id: string): Promise<Expense> {
    const { data } = await apiClient.get<Expense>(`/expenses/${id}`);
    return data;
  },

  async create(input: CreateExpenseInput): Promise<Expense> {
    const { data } = await apiClient.post<Expense>('/expenses', input);
    return data;
  },

  async update(id: string, input: UpdateExpenseInput): Promise<Expense> {
    const { data } = await apiClient.patch<Expense>(`/expenses/${id}`, input);
    return data;
  },

  async remove(id: string): Promise<{ message: string; id: string }> {
    const { data } = await apiClient.delete<{ message: string; id: string }>(
      `/expenses/${id}`,
    );
    return data;
  },

  async getStats(from?: string, to?: string, projectId?: string): Promise<ExpenseStats> {
    const { data } = await apiClient.get<ExpenseStats>('/expenses/stats', {
      params: { from, to, projectId },
    });
    return data;
  },
};

// ─── Label, ikon ve renk mapping'leri ───
export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  OFFICE: 'Ofis Giderleri',
  VEHICLE: 'Araç Giderleri',
  PAYROLL_TAX: 'SGK / Vergi',
  EQUIPMENT: 'Ekipman',
  UTILITIES: 'Şantiye (Su/Elektrik)',
  PERMITS: 'İzin / Ruhsat',
  INSURANCE: 'Sigorta',
  CONSULTING: 'Danışmanlık',
  FOOD: 'Yemek',
  TRANSPORTATION: 'Nakliye',
  COMMUNICATION: 'İletişim / Telefon',
  ENTERTAINMENT: 'Açılış / İkram',
  OTHER: 'Diğer',
};

export const EXPENSE_CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  OFFICE: '🏢',
  VEHICLE: '🚗',
  PAYROLL_TAX: '👤',
  EQUIPMENT: '🔨',
  UTILITIES: '⚡',
  PERMITS: '📜',
  INSURANCE: '🛡️',
  CONSULTING: '👨‍💼',
  FOOD: '🍽️',
  TRANSPORTATION: '🚛',
  COMMUNICATION: '📞',
  ENTERTAINMENT: '🎉',
  OTHER: '📦',
};

export const EXPENSE_CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  OFFICE: 'bg-blue-100 text-blue-700',
  VEHICLE: 'bg-orange-100 text-orange-700',
  PAYROLL_TAX: 'bg-red-100 text-red-700',
  EQUIPMENT: 'bg-purple-100 text-purple-700',
  UTILITIES: 'bg-yellow-100 text-yellow-700',
  PERMITS: 'bg-cyan-100 text-cyan-700',
  INSURANCE: 'bg-emerald-100 text-emerald-700',
  CONSULTING: 'bg-indigo-100 text-indigo-700',
  FOOD: 'bg-pink-100 text-pink-700',
  TRANSPORTATION: 'bg-amber-100 text-amber-700',
  COMMUNICATION: 'bg-sky-100 text-sky-700',
  ENTERTAINMENT: 'bg-rose-100 text-rose-700',
  OTHER: 'bg-slate-100 text-slate-700',
};

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  DRAFT: 'Taslak',
  CONFIRMED: 'Onaylı',
  CANCELLED: 'İptal',
};

export const EXPENSE_STATUS_COLORS: Record<ExpenseStatus, string> = {
  DRAFT: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-slate-100 text-slate-700',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Nakit',
  BANK: 'Havale / EFT',
  CHEQUE: 'Çek',
  CREDIT_CARD: 'Kredi Kartı',
  OTHER: 'Diğer',
};

export function formatExpenseAmount(amount: string | number, currency = 'TRY'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatExpenseDate(dateString: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateString));
}