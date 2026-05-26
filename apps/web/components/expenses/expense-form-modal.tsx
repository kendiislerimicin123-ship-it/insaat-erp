'use client';

import { useEffect, useState, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { toast } from 'sonner';
import {
  expensesApi,
  Expense,
  ExpenseCategory,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_ICONS,
  EXPENSE_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  formatExpenseAmount,
} from '@/lib/api/expenses';
import { projectsApi } from '@/lib/api/projects';
import { contactsApi, Contact } from '@/lib/api/contacts';
import { subcontractorsApi, Subcontractor } from '@/lib/api/subcontractors';

const schema = z.object({
  category: z.enum([
    'OFFICE', 'VEHICLE', 'PAYROLL_TAX', 'EQUIPMENT', 'UTILITIES',
    'PERMITS', 'INSURANCE', 'CONSULTING', 'FOOD', 'TRANSPORTATION',
    'COMMUNICATION', 'ENTERTAINMENT', 'OTHER',
  ]),
  status: z.enum(['DRAFT', 'CONFIRMED', 'CANCELLED']),
  amount: z.coerce.number().min(0.01, 'Tutar 0\'dan büyük olmalı'),
  vatRate: z.coerce.number().min(0).default(0),
  currency: z.string().default('TRY'),
  date: z.string().min(1, 'Tarih zorunlu'),
  description: z.string().min(2, 'Açıklama zorunlu').max(500),
  notes: z.string().optional(),
  projectId: z.string().optional().or(z.literal('')),
  contactId: z.string().optional().or(z.literal('')),
  subcontractorId: z.string().optional().or(z.literal('')),
  invoiceNo: z.string().max(100).optional().or(z.literal('')),
  taxNumber: z.string().max(20).optional().or(z.literal('')),
  paymentMethod: z.enum(['CASH', 'BANK', 'CHEQUE', 'CREDIT_CARD', 'OTHER']).optional().or(z.literal('')),
  paidAt: z.string().optional().or(z.literal('')),
  // YENİ: Çek bilgileri (opsiyonel)
  chequeNo: z.string().optional(),
  bankName: z.string().optional(),
  dueDate: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  expense?: Expense | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ExpenseFormModal({ open, expense, onClose, onSuccess }: Props) {
  const isEdit = !!expense;

  const [projects, setProjects] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: 'OFFICE',
      status: 'CONFIRMED',
      amount: 0,
      vatRate: 0,
      currency: 'TRY',
      date: new Date().toISOString().slice(0, 10),
      description: '',
    },
  });

  // Canlı KDV hesaplama
  const amountWatch = useWatch({ control, name: 'amount' });
  const vatRateWatch = useWatch({ control, name: 'vatRate' });
  const currencyWatch = useWatch({ control, name: 'currency' });
  const paymentMethodWatch = useWatch({ control, name: 'paymentMethod' });

  // Sadece YENİ kayıtta (edit değil) ve CHEQUE seçildiğinde çek bölümü görünür
  const isCheque = !isEdit && paymentMethodWatch === 'CHEQUE';

  const calculated = useMemo(() => {
    const a = Number(amountWatch) || 0;
    const v = Number(vatRateWatch) || 0;
    const vatAmount = (a * v) / 100;
    const totalAmount = a + vatAmount;
    return { vatAmount, totalAmount };
  }, [amountWatch, vatRateWatch]);

  useEffect(() => {
    if (!open) return;

    Promise.all([
      projectsApi.listAll().then(setProjects).catch(() => {}),
      contactsApi.list({ limit: 100 }).then((d) => setContacts(d.items)).catch(() => {}),
      subcontractorsApi.list({ limit: 100 }).then((d) => setSubcontractors(d.items)).catch(() => {}),
    ]);

    if (expense) {
      reset({
        category: expense.category,
        status: expense.status,
        amount: parseFloat(expense.amount),
        vatRate: parseFloat(expense.vatRate),
        currency: expense.currency,
        date: expense.date.slice(0, 10),
        description: expense.description,
        notes: expense.notes ?? '',
        projectId: expense.projectId ?? '',
        contactId: expense.contactId ?? '',
        subcontractorId: expense.subcontractorId ?? '',
        invoiceNo: expense.invoiceNo ?? '',
        taxNumber: expense.taxNumber ?? '',
        paymentMethod: expense.paymentMethod ?? '',
        paidAt: expense.paidAt ? expense.paidAt.slice(0, 10) : '',
        chequeNo: '',
        bankName: '',
        dueDate: '',
      });
    } else {
      reset({
        category: 'OFFICE',
        status: 'CONFIRMED',
        amount: 0,
        vatRate: 0,
        currency: 'TRY',
        date: new Date().toISOString().slice(0, 10),
        description: '',
        notes: '',
        projectId: '',
        contactId: '',
        subcontractorId: '',
        invoiceNo: '',
        taxNumber: '',
        paymentMethod: '',
        paidAt: '',
        chequeNo: '',
        bankName: '',
        dueDate: '',
      });
    }
  }, [open, expense, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      const basePayload = {
        category: data.category,
        status: data.status,
        amount: data.amount,
        vatRate: data.vatRate,
        currency: data.currency,
        date: new Date(data.date).toISOString(),
        description: data.description,
        notes: data.notes || undefined,
        projectId: data.projectId || undefined,
        contactId: data.contactId || undefined,
        subcontractorId: data.subcontractorId || undefined,
        invoiceNo: data.invoiceNo || undefined,
        taxNumber: data.taxNumber || undefined,
        paymentMethod: (data.paymentMethod || undefined) as
          | 'CASH'
          | 'BANK'
          | 'CHEQUE'
          | 'CREDIT_CARD'
          | 'OTHER'
          | undefined,
        paidAt: data.paidAt ? new Date(data.paidAt).toISOString() : undefined,
      };

      // Çek bilgileri sadece CHEQUE + yeni kayıt durumunda eklenir
      const payload = isCheque
        ? {
            ...basePayload,
            chequeNo: data.chequeNo?.trim() || undefined,
            bankName: data.bankName?.trim() || undefined,
            dueDate: data.dueDate || undefined,
          }
        : basePayload;

      if (isEdit && expense) {
        await expensesApi.update(expense.id, payload);
        toast.success('Gider güncellendi');
      } else {
        await expensesApi.create(payload);
        toast.success(isCheque ? 'Yeni gider kaydedildi (çek oluşturuldu)' : 'Yeni gider kaydedildi');
      }

      onSuccess();
      onClose();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          (error.response?.data as { message?: string })?.message ||
            'İşlem başarısız',
        );
      }
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[95vh] overflow-y-auto shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-slate-900">
            {isEdit ? `Gideri Düzenle (${expense?.code})` : 'Yeni Gider Kaydı'}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Genel gider — ofis, araç, ekipman, vergi vb.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {/* Kategori & Durum */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Kategori *" error={errors.category?.message} fullWidth>
              <select {...register('category')} className="input">
                {(Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]).map((key) => (
                  <option key={key} value={key}>
                    {EXPENSE_CATEGORY_ICONS[key]} {EXPENSE_CATEGORY_LABELS[key]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Durum *" error={errors.status?.message}>
              <select {...register('status')} className="input">
                {Object.entries(EXPENSE_STATUS_LABELS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tarih *" error={errors.date?.message}>
              <input type="date" {...register('date')} className="input" />
            </Field>
          </div>

          {/* Tutar / KDV bölümü */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              💰 Tutar Bilgisi
            </p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Field label="Tutar (Net) *" error={errors.amount?.message}>
                <input type="number" step="0.01" {...register('amount')} className="input" />
              </Field>
              <Field label="KDV (%)" error={errors.vatRate?.message}>
                <input type="number" step="1" {...register('vatRate')} className="input" />
              </Field>
              <Field label="Para Birimi" error={errors.currency?.message}>
                <select {...register('currency')} className="input">
                  <option value="TRY">₺ TRY</option>
                  <option value="USD">$ USD</option>
                  <option value="EUR">€ EUR</option>
                </select>
              </Field>
              <Field label="Ödeme Şekli" error={errors.paymentMethod?.message}>
                <select {...register('paymentMethod')} className="input">
                  <option value="">— Seçiniz —</option>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Toplam hesaplama */}
            <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between">
              <div className="text-sm">
                <span className="text-slate-500">KDV Tutarı:</span>{' '}
                <span className="font-medium">
                  {formatExpenseAmount(calculated.vatAmount, currencyWatch || 'TRY')}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 uppercase">Toplam</span>
                <p className="text-2xl font-bold text-slate-900">
                  {formatExpenseAmount(calculated.totalAmount, currencyWatch || 'TRY')}
                </p>
              </div>
            </div>
          </div>

          {/* ─── ÇEK BİLGİLERİ (sadece YENİ + CHEQUE seçilince görünür) ─── */}
          {isCheque && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">📋</span>
                <p className="text-sm font-semibold text-blue-900">Çek Bilgileri (Verilen Çek)</p>
                <span className="text-xs text-blue-700 ml-auto">(Opsiyonel)</span>
              </div>
              <p className="text-xs text-blue-700">
                Çek/Senet sayfasına VERİLEN çek olarak otomatik kaydedilecek.
                Bilgileri doldurmazsanız sistem varsayılan değerlerle kaydeder.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Çek Numarası" error={errors.chequeNo?.message}>
                  <input
                    {...register('chequeNo')}
                    placeholder="Örn: 001234"
                    className="input"
                  />
                </Field>

                <Field label="Banka" error={errors.bankName?.message}>
                  <input
                    {...register('bankName')}
                    placeholder="Örn: Ziraat Bankası"
                    className="input"
                  />
                </Field>

                <Field label="Vade Tarihi" error={errors.dueDate?.message} fullWidth>
                  <input type="date" {...register('dueDate')} className="input" />
                  <p className="text-xs text-slate-500 mt-1">
                    Boş bırakılırsa: gider tarihinden 30 gün sonrası
                  </p>
                </Field>
              </div>
            </div>
          )}

          {/* Açıklama */}
          <Field label="Açıklama *" error={errors.description?.message}>
            <input
              {...register('description')}
              placeholder="örn: Şantiye yemek faturası — Mayıs 2026"
              className="input"
            />
          </Field>

          {/* İlişkiler */}
          <div className="border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              🔗 İlişkilendir (Opsiyonel)
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Proje" error={errors.projectId?.message}>
                <select {...register('projectId')} className="input">
                  <option value="">— Genel (proje yok) —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Cari Hesap" error={errors.contactId?.message}>
                <select {...register('contactId')} className="input">
                  <option value="">— Cari yok —</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Taşeron" error={errors.subcontractorId?.message}>
                <select {...register('subcontractorId')} className="input">
                  <option value="">— Taşeron yok —</option>
                  {subcontractors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          {/* Belge Bilgisi */}
          <div className="border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              📄 Belge / Ödeme Bilgisi (Opsiyonel)
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Fatura No" error={errors.invoiceNo?.message}>
                <input
                  {...register('invoiceNo')}
                  placeholder="FAT-2026-001"
                  className="input"
                />
              </Field>
              <Field label="Vergi No (VÖ)" error={errors.taxNumber?.message}>
                <input {...register('taxNumber')} placeholder="1234567890" className="input" />
              </Field>
              <Field label="Ödeme Tarihi" error={errors.paidAt?.message}>
                <input type="date" {...register('paidAt')} className="input" />
              </Field>
            </div>
          </div>

          <Field label="Notlar" error={errors.notes?.message}>
            <textarea {...register('notes')} rows={2} className="input" />
          </Field>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {isSubmitting ? 'Kaydediliyor...' : isEdit ? 'Güncelle' : 'Gideri Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
  fullWidth,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? 'md:col-span-2' : ''}>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
