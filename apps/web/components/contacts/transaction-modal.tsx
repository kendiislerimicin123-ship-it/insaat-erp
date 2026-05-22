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
  formatBalance,
} from '@/lib/api/contacts';

const schema = z.object({
  type: z.enum(['DEBT', 'CREDIT', 'PAYMENT', 'COLLECTION']),
  amount: z.coerce.number().min(0.01, 'Tutar 0 dan büyük olmalı'),
  date: z.string().min(1, 'Tarih zorunlu'),
  documentNo: z.string().optional(),
  description: z.string().optional(),
  paymentMethod: z.string().optional(),
  bankReference: z.string().optional(),
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
  const isPaymentRelated = type === 'PAYMENT' || type === 'COLLECTION';

  // Modal açıldığında resetle (sadece bir kez, initialType bağımlılığı kalktı)
  useEffect(() => {
    if (open) {
      reset({
        type: initialType ?? 'DEBT',
        amount: 0,
        date: new Date().toISOString().slice(0, 10),
        documentNo: '',
        description: '',
        paymentMethod: '',
        bankReference: '',
      });
    }
  }, [open, initialType, reset]);

  const onSubmit = async (data: FormData) => {
    if (!contact) return;

    try {
      const payload = {
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

      await contactTransactionsApi.create(payload);
      toast.success(
        `${TRANSACTION_TYPE_LABELS[data.type]} kaydedildi: ${formatBalance(data.amount, contact.currency)}`,
      );
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
        <div className="px-6 py-4 border-b border-slate-200">
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
                    <select {...register('paymentMethod')} className="input" defaultValue="Havale/EFT">
                      <option value="">— Seçin —</option>
                      <option value="Nakit">💵 Nakit</option>
                      <option value="Havale/EFT">🏦 Havale / EFT</option>
                      <option value="Çek">📋 Çek</option>
                      <option value="Senet">📜 Senet</option>
                      <option value="Kredi Kartı">💳 Kredi Kartı</option>
                      <option value="POS">🖥️ POS</option>
                      <option value="Diğer">🔹 Diğer</option>
                    </select>
                    <p className="text-xs text-amber-600 mt-1">
                      💡 Çek/Senet için detay takibi → Çek Yönetimi modülünden
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Banka Ref / İşlem No
                    </label>
                    <input
                      {...register('bankReference')}
                      placeholder="örn: BNK-12345 veya çek no"
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