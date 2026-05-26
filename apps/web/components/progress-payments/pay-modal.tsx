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
  PaymentMethod,
  PAYMENT_METHOD_LABELS,
  formatCurrency,
} from '@/lib/api/progress-payments';

const schema = z.object({
  paymentMethod: z.enum(['CASH', 'BANK', 'CHEQUE', 'CREDIT_CARD', 'OTHER'], {
    errorMap: () => ({ message: 'Ödeme yöntemi seçilmeli' }),
  }),
  paymentRef: z.string().optional(),
  // Çek bilgileri — hepsi opsiyonel
  chequeNo: z.string().optional(),
  bankName: z.string().optional(),
  dueDate: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  payment: ProgressPayment | null;
  onClose: () => void;
  onSuccess: () => void;
}

// Bugünden 30 gün sonrası (vade için varsayılan placeholder)
function getDefaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
}

export function PayModal({ open, payment, onClose, onSuccess }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      paymentMethod: 'BANK',
      paymentRef: '',
      chequeNo: '',
      bankName: '',
      dueDate: '',
    },
  });

  // Seçilen ödeme yöntemini izle (çek alanlarını göstermek için)
  const selectedMethod = watch('paymentMethod');
  const isCheque = selectedMethod === 'CHEQUE';

  useEffect(() => {
    if (open) {
      reset({
        paymentMethod: 'BANK',
        paymentRef: '',
        chequeNo: '',
        bankName: '',
        dueDate: '',
      });
    }
  }, [open, reset]);

  const onSubmit = async (data: FormData) => {
    if (!payment) return;
    try {
      // Çek değilse çek alanlarını gönderme
      const payload =
        data.paymentMethod === 'CHEQUE'
          ? {
              paymentMethod: data.paymentMethod as PaymentMethod,
              paymentRef: data.paymentRef || undefined,
              chequeNo: data.chequeNo?.trim() || undefined,
              bankName: data.bankName?.trim() || undefined,
              dueDate: data.dueDate || undefined,
            }
          : {
              paymentMethod: data.paymentMethod as PaymentMethod,
              paymentRef: data.paymentRef || undefined,
            };

      await progressPaymentsApi.pay(payment.id, payload);

      const message = isCheque
        ? `Hakediş ödendi (çek): ${payment.code}`
        : `Hakediş ödendi: ${payment.code}`;
      toast.success(message);
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
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
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
                {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((key) => (
                  <option key={key} value={key}>
                    {PAYMENT_METHOD_LABELS[key]}
                  </option>
                ))}
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
                placeholder="Banka işlem no, dekont no, vs."
                className="input"
              />
            </div>

            {/* ─── ÇEK BİLGİLERİ (sadece Çek seçilince görünür) ─── */}
            {isCheque && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📋</span>
                  <p className="text-sm font-semibold text-blue-900">
                    Çek Bilgileri
                  </p>
                  <span className="text-xs text-blue-700 ml-auto">
                    (Opsiyonel — boş bırakabilirsiniz)
                  </span>
                </div>
                <p className="text-xs text-blue-700">
                  Çek/Senet sayfasına otomatik olarak kaydedilecek. Bilgileri doldurmazsanız sistem varsayılan değerlerle kaydeder.
                </p>

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

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Vade Tarihi
                  </label>
                  <input
                    type="date"
                    {...register('dueDate')}
                    placeholder={getDefaultDueDate()}
                    className="input"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Boş bırakılırsa: bugünden 30 gün sonrası
                  </p>
                </div>
              </div>
            )}

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
