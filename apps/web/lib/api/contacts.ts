import { apiClient } from './client';

export type ContactType = 'SUPPLIER' | 'CUSTOMER' | 'BOTH' | 'BANK' | 'GOVERNMENT' | 'OTHER';
export type ContactStatus = 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED' | 'ARCHIVED';

// YENİ: Ödeme yöntemi enum (backend ile aynı)
export type PaymentMethod = 'CASH' | 'BANK' | 'CHEQUE' | 'CREDIT_CARD' | 'OTHER';


export interface Contact {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  type: ContactType;
  status: ContactStatus;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  country: string | null;
  taxNumber: string | null;
  taxOffice: string | null;
  tradeRegistry: string | null;
  iban: string | null;
  bankName: string | null;
  paymentTerms: number | null;
  creditLimit: string | null;
  currency: string;
  currentBalance: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactInput {
  code: string;
  name: string;
  type: ContactType;
  status?: ContactStatus;
  contactPerson?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  district?: string;
  country?: string;
  taxNumber?: string;
  taxOffice?: string;
  tradeRegistry?: string;
  iban?: string;
  bankName?: string;
  paymentTerms?: number;
  creditLimit?: number;
  currency?: string;
  notes?: string;
}

export type UpdateContactInput = Partial<CreateContactInput>;

export interface ContactStats {
  total: number;
  suppliers: number;
  customers: number;
  both: number;
  totalBalance: string;
}

export const contactsApi = {
  async getById(id: string): Promise<Contact> {
    const { data } = await apiClient.get<Contact>(`/contacts/${id}`);
    return data;
  },

  async list(query: { page?: number; limit?: number; type?: ContactType; status?: ContactStatus; city?: string; search?: string } = {}) {
    const { data } = await apiClient.get<{
      items: Contact[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>('/contacts', { params: query });
    return data;
  },

  async listAll(): Promise<Contact[]> {
    const { data } = await apiClient.get<{ items: Contact[] }>('/contacts', {
      params: { limit: 100, status: 'ACTIVE' },
    });
    return data.items;
  },

  async create(input: CreateContactInput): Promise<Contact> {
    const { data } = await apiClient.post<Contact>('/contacts', input);
    return data;
  },

  async update(id: string, input: UpdateContactInput): Promise<Contact> {
    const { data } = await apiClient.patch<Contact>(`/contacts/${id}`, input);
    return data;
  },

  async remove(id: string): Promise<{ message: string; id: string }> {
    const { data } = await apiClient.delete<{ message: string; id: string }>(
      `/contacts/${id}`,
    );
    return data;
  },

  async getStats(): Promise<ContactStats> {
    const { data } = await apiClient.get<ContactStats>('/contacts/stats');
    return data;
  },
};

// ─── Helper'lar ───
export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  SUPPLIER: 'Tedarikçi',
  CUSTOMER: 'Müşteri',
  BOTH: 'Tedarikçi + Müşteri',
  BANK: 'Banka',
  GOVERNMENT: 'Resmi Kurum',
  OTHER: 'Diğer',
};

export const CONTACT_TYPE_COLORS: Record<ContactType, string> = {
  SUPPLIER: 'bg-blue-100 text-blue-700',
  CUSTOMER: 'bg-emerald-100 text-emerald-700',
  BOTH: 'bg-purple-100 text-purple-700',
  BANK: 'bg-slate-100 text-slate-700',
  GOVERNMENT: 'bg-amber-100 text-amber-700',
  OTHER: 'bg-slate-100 text-slate-600',
};

export const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = {
  ACTIVE: 'Aktif',
  INACTIVE: 'Pasif',
  BLACKLISTED: 'Kara Liste',
  ARCHIVED: 'Arşiv',
};

export const CONTACT_STATUS_COLORS: Record<ContactStatus, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  INACTIVE: 'bg-slate-100 text-slate-700',
  BLACKLISTED: 'bg-red-100 text-red-700',
  ARCHIVED: 'bg-amber-100 text-amber-700',
};

// YENİ: Ödeme yöntemi etiketleri
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: '💵 Nakit',
  BANK: '🏦 Havale / EFT',
  CHEQUE: '📋 Çek',
  CREDIT_CARD: '💳 Kredi Kartı',
  OTHER: '🔹 Diğer',
};

export function formatBalance(balance: string | number, currency = 'TRY'): string {
  const num = typeof balance === 'string' ? parseFloat(balance) : balance;
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

// ════════════════════════════════════════
// CONTACT TRANSACTIONS API
// ════════════════════════════════════════

export type TransactionType = 'DEBT' | 'CREDIT' | 'PAYMENT' | 'COLLECTION';

export interface ContactTransaction {
  id: string;
  contactId: string;
  type: TransactionType;
  amount: string;
  currency: string;
  date: string;
  documentNo: string | null;
  description: string | null;
  paymentMethod: PaymentMethod | null; // GÜNCEL: string | null'dan PaymentMethod | null'a
  bankReference: string | null;
  balanceAfter: string;
  createdAt: string;
  contact?: { id: string; code: string; name: string };
}

export interface CreateTransactionInput {
  contactId: string;
  type: TransactionType;
  amount: number;
  currency?: string;
  date: string;
  documentNo?: string;
  description?: string;
  paymentMethod?: PaymentMethod; // GÜNCEL: string'den PaymentMethod'a
  bankReference?: string;
  // YENİ: Çek bilgileri (sadece paymentMethod === 'CHEQUE' iken kullanılır)
  chequeNo?: string;
  bankName?: string;
  dueDate?: string;
}

export const contactTransactionsApi = {
  async list(query: {
    contactId?: string;
    type?: TransactionType;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const { data } = await apiClient.get<{
      items: ContactTransaction[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
      summary: { DEBT: string; CREDIT: string; PAYMENT: string; COLLECTION: string };
    }>('/contact-transactions', { params: query });
    return data;
  },

  async create(input: CreateTransactionInput): Promise<ContactTransaction> {
    const { data } = await apiClient.post<ContactTransaction>(
      '/contact-transactions',
      input,
    );
    return data;
  },

  async remove(id: string): Promise<{ message: string; id: string }> {
    const { data } = await apiClient.delete<{ message: string; id: string }>(
      `/contact-transactions/${id}`,
    );
    return data;
  },
};

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  DEBT: 'Borç',
  CREDIT: 'Alacak',
  PAYMENT: 'Ödeme',
  COLLECTION: 'Tahsilat',
};

export const TRANSACTION_TYPE_COLORS: Record<TransactionType, string> = {
  DEBT: 'bg-red-100 text-red-700',
  CREDIT: 'bg-emerald-100 text-emerald-700',
  PAYMENT: 'bg-blue-100 text-blue-700',
  COLLECTION: 'bg-purple-100 text-purple-700',
};

// Bakiye'ye etki: + (artırır) veya - (azaltır)
export const TRANSACTION_TYPE_DIRECTION: Record<TransactionType, '+' | '-'> = {
  CREDIT: '+',   // Cari bize borçlandı (bakiye artar)
  PAYMENT: '+',  // Biz ona ödedik (bakiye artar)
  DEBT: '-',     // Biz ona borçlandık (bakiye azalır)
  COLLECTION: '-', // Cariden tahsil ettik (bakiye azalır)
};