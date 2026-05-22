'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { toast } from 'sonner';
import {
  progressPaymentsApi,
  ProgressPayment,
  formatCurrency,
} from '@/lib/api/progress-payments';

const schema = z.object({
  paymentMethod: z.string().min(1, 'Ödeme yöntemi seçilmeli'),
  paymentRef: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  payment: ProgressPayment | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function PayModal({ open, payment, onClose, onSuccess }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { paymentMethod: 'Havale/EFT', paymentRef: '' },
  });

  useEffect(() => {
    if (open) reset({ paymentMethod: 'Havale/EFT', paymentRef: '' });
  }, [open, reset]);

  const onSubmit = async (data: FormData) => {
    if (!payment) return;
    try {
      await progressPaymentsApi.pay(payment.id, {
        paymentMethod: data.paymentMethod,
        paymentRef: data.paymentRef || undefined,
      });
      toast.success(`Hakediş ödendi: ${payment.code}`);
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

  if (!open || !payment) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Hakediş Ödeme</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {payment.code} • {payment.subcontractor.name}
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* Tutar özeti */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="text-xs text-emerald-700 uppercase tracking-wide">
              Ödenecek Tutar
            </p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">
              {formatCurrency(payment.totalAmount, payment.currency)}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Ödeme Yöntemi *
              </label>
              <select {...register('paymentMethod')} className="input">
                <option value="Havale/EFT">Havale / EFT</option>
                <option value="Çek">Çek</option>
                <option value="Nakit">Nakit</option>
                <option value="Kredi Kartı">Kredi Kartı</option>
                <option value="Diğer">Diğer</option>
              </select>
              {errors.paymentMethod && (
                <p className="text-xs text-red-600 mt-1">{errors.paymentMethod.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Referans No (Opsiyonel)
              </label>
              <input
                {...register('paymentRef')}
                placeholder="Banka işlem no, çek no, vs."
                className="input"
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg text-xs text-amber-800">
              ⚠️ Ödendi olarak işaretlenen hakediş daha sonra düzenlenemez.
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
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Kaydediliyor...' : '💵 Ödendi Olarak İşaretle'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}