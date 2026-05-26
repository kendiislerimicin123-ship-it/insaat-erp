'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { toast } from 'sonner';
import {
  contactTransactionsApi,
  TransactionType,
  TRANSACTION_TYPE_LABELS,
  Contact,
  PaymentMethod,
  PAYMENT_METHOD_LABELS,
  formatBalance,
} from '@/lib/api/contacts';

const schema = z.object({
  type: z.enum(['DEBT', 'CREDIT', 'PAYMENT', 'COLLECTION']),
  amount: z.coerce.number().min(0.01, 'Tutar 0 dan büyük olmalı'),
  date: z.string().min(1, 'Tarih zorunlu'),
  documentNo: z.string().optional(),
  description: z.string().optional(),
  paymentMethod: z
    .enum(['CASH', 'BANK', 'CHEQUE', 'CREDIT_CARD', 'OTHER'])
    .optional()
    .or(z.literal('').transform(() => undefined)),
  bankReference: z.string().optional(),
  // Çek bilgileri — hepsi opsiyonel
  chequeNo: z.string().optional(),
  bankName: z.string().optional(),
  dueDate: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  contact: Contact | null;
  initialType?: TransactionType;
  onClose: () => void;
  onSuccess: () => void;
}

export function TransactionModal({ open, contact, initialType, onClose, onSuccess }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: initialType ?? 'DEBT',
      amount: 0,
      date: new Date().toISOString().slice(0, 10),
    },
  });

  const type = watch('type');
  const selectedMethod = watch('paymentMethod');
  const isPaymentRelated = type === 'PAYMENT' || type === 'COLLECTION';
  const isCheque = isPaymentRelated && selectedMethod === 'CHEQUE';

  useEffect(() => {
    if (open) {
      reset({
        type: initialType ?? 'DEBT',
        amount: 0,
        date: new Date().toISOString().slice(0, 10),
        documentNo: '',
        description: '',
        paymentMethod: undefined,
        bankReference: '',
        chequeNo: '',
        bankName: '',
        dueDate: '',
      });
    }
  }, [open, initialType, reset]);

  const onSubmit = async (data: FormData) => {
    if (!contact) return;

    try {
      const basePayload = {
        contactId: contact.id,
        type: data.type,
        amount: data.amount,
        currency: contact.currency,
        date: new Date(data.date).toISOString(),
        documentNo: data.documentNo || undefined,
        description: data.description || undefined,
        paymentMethod: data.paymentMethod || undefined,
        bankReference: data.bankReference || undefined,
      };

      // Çek bilgileri sadece CHEQUE seçilince payload'a eklenir
      const payload = isCheque
        ? {
            ...basePayload,
            chequeNo: data.chequeNo?.trim() || undefined,
            bankName: data.bankName?.trim() || undefined,
            dueDate: data.dueDate || undefined,
          }
        : basePayload;

      await contactTransactionsApi.create(payload);

      const message = isCheque
        ? `${TRANSACTION_TYPE_LABELS[data.type]} (çek) kaydedildi: ${formatBalance(data.amount, contact.currency)}`
        : `${TRANSACTION_TYPE_LABELS[data.type]} kaydedildi: ${formatBalance(data.amount, contact.currency)}`;
      toast.success(message);
      onSuccess();
      onClose();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          (error.response?.data as { message?: string })?.message || 'İşlem başarısız',
        );
      }
    }
  };

  if (!open || !contact) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-slate-900">Cari Hareket Ekle</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {contact.code} • {contact.name}
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Mevcut Bakiye</p>
            <p
              className={`text-xl font-bold mt-1 ${
                parseFloat(contact.currentBalance) > 0
                  ? 'text-emerald-700'
                  : parseFloat(contact.currentBalance) < 0
                    ? 'text-red-700'
                    : 'text-slate-700'
              }`}
            >
              {formatBalance(contact.currentBalance, contact.currency)}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Hareket Tipi *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(['CREDIT', 'PAYMENT', 'DEBT', 'COLLECTION'] as TransactionType[]).map((t) => {
                  const isPositive = t === 'CREDIT' || t === 'PAYMENT';
                  return (
                    <label
                      key={t}
                      className={`cursor-pointer border-2 rounded-lg p-3 text-center transition-colors ${
                        type === t
                          ? isPositive
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                            : 'border-red-600 bg-red-50 text-red-700'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input type="radio" value={t} {...register('type')} className="sr-only" />
                      <p className="font-medium text-sm">
                        {isPositive ? '⬆️' : '⬇️'} {TRANSACTION_TYPE_LABELS[t]}
                      </p>
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {type === 'CREDIT' && '➕ Cariye fatura/iş yaptık (alacaklandık)'}
                {type === 'DEBT' && '➖ Cariden mal/hizmet aldık (borçlandık)'}
                {type === 'PAYMENT' && '➕ Biz cariye ödeme yaptık (borcumuz azaldı)'}
                {type === 'COLLECTION' && '➖ Cariden tahsilat aldık (alacağımız azaldı)'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Tutar ({contact.currency}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('amount')}
                  placeholder="0.00"
                  className="input"
                />
                {errors.amount && <p className="text-xs text-red-600 mt-1">{errors.amount.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tarih *</label>
                <input type="date" {...register('date')} className="input" />
                {errors.date && <p className="text-xs text-red-600 mt-1">{errors.date.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Belge / Fatura No
                </label>
                <input {...register('documentNo')} placeholder="FAT-2026-001" className="input" />
              </div>

              {/* ÖDEME / TAHSILAT için Yöntem ve Referans */}
              {isPaymentRelated && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Ödeme Yöntemi
                    </label>
                    <select {...register('paymentMethod')} className="input">
                      <option value="">— Seçin —</option>
                      {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((key) => (
                        <option key={key} value={key}>
                          {PAYMENT_METHOD_LABELS[key]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Banka Ref / İşlem No
                    </label>
                    <input
                      {...register('bankReference')}
                      placeholder="örn: BNK-12345"
                      className="input"
                    />
                  </div>
                </>
              )}

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Açıklama</label>
                <textarea {...register('description')} rows={2} className="input" />
              </div>
            </div>

            {/* ─── ÇEK BİLGİLERİ (sadece PAYMENT/COLLECTION + CHEQUE seçilince görünür) ─── */}
            {isCheque && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📋</span>
                  <p className="text-sm font-semibold text-blue-900">
                    Çek Bilgileri ({type === 'PAYMENT' ? 'Verilen Çek' : 'Alınan Çek'})
                  </p>
                  <span className="text-xs text-blue-700 ml-auto">(Opsiyonel)</span>
                </div>
                <p className="text-xs text-blue-700">
                  {type === 'PAYMENT'
                    ? 'Çek/Senet sayfasına VERİLEN çek olarak otomatik kaydedilecek.'
                    : 'Çek/Senet sayfasına GELEN çek olarak otomatik kaydedilecek.'}{' '}
                  Bilgileri doldurmazsanız sistem varsayılan değerlerle kaydeder.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Çek Numarası
                    </label>
                    <input
                      {...register('chequeNo')}
                      placeholder="Örn: 001234"
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Banka
                    </label>
                    <input
                      {...register('bankName')}
                      placeholder="Örn: Ziraat Bankası"
                      className="input"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Vade Tarihi
                    </label>
                    <input type="date" {...register('dueDate')} className="input" />
                    <p className="text-xs text-slate-500 mt-1">
                      Boş bırakılırsa: hareket tarihinden 30 gün sonrası
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
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
                {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
