'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { toast } from 'sonner';
import {
  chequesApi,
  ChequeKind,
  ChequeDirection,
  CHEQUE_KIND_LABELS,
  CHEQUE_DIRECTION_LABELS,
  daysUntilDue,
} from '@/lib/api/cheques';
import { contactsApi } from '@/lib/api/contacts';

const schema = z.object({
  contactId: z.string().min(1, 'Cari seçilmelidir'),
  kind: z.enum(['CHEQUE', 'PROMISSORY_NOTE']),
  direction: z.enum(['INCOMING', 'OUTGOING']),
  chequeNo: z.string().min(1, 'Numara zorunlu').max(50),
  bankName: z.string().optional(),
  bankBranch: z.string().optional(),
  drawer: z.string().optional(),
  amount: z.coerce.number().min(0.01, 'Tutar 0 dan büyük olmalı'),
  issueDate: z.string().min(1, 'Düzenleme tarihi zorunlu'),
  dueDate: z.string().min(1, 'Vade tarihi zorunlu'),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  initialKind?: ChequeKind;
  initialDirection?: ChequeDirection;
  onClose: () => void;
  onSuccess: () => void;
}

export function ChequeFormModal({
  open,
  initialKind,
  initialDirection,
  onClose,
  onSuccess,
}: Props) {
  const [contacts, setContacts] = useState<Array<{ id: string; code: string; name: string }>>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      kind: initialKind ?? 'CHEQUE',
      direction: initialDirection ?? 'INCOMING',
      issueDate: new Date().toISOString().slice(0, 10),
    },
  });

  const kind = watch('kind');
  const dueDate = watch('dueDate');

  const daysToMaturity = useMemo(() => {
    if (!dueDate) return null;
    return daysUntilDue(dueDate);
  }, [dueDate]);

  useEffect(() => {
    if (open) {
      contactsApi.listAll().then(setContacts).catch(() => {});
      reset({
        contactId: '',
        kind: initialKind ?? 'CHEQUE',
        direction: initialDirection ?? 'INCOMING',
        chequeNo: '',
        bankName: '',
        bankBranch: '',
        drawer: '',
        amount: 0,
        issueDate: new Date().toISOString().slice(0, 10),
        dueDate: '',
        description: '',
      });
    }
  }, [open, initialKind, initialDirection, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        contactId: data.contactId,
        kind: data.kind,
        direction: data.direction,
        chequeNo: data.chequeNo,
        bankName: data.bankName || undefined,
        bankBranch: data.bankBranch || undefined,
        drawer: data.drawer || undefined,
        amount: data.amount,
        issueDate: new Date(data.issueDate).toISOString(),
        dueDate: new Date(data.dueDate).toISOString(),
        description: data.description || undefined,
      };

      await chequesApi.create(payload);
      toast.success(
        `${CHEQUE_KIND_LABELS[data.kind]} kaydedildi: ${data.chequeNo}`,
      );
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
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200 sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-slate-900">Yeni Çek / Senet</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Tür ve Yön */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tür *">
              <div className="grid grid-cols-2 gap-2">
                {(['CHEQUE', 'PROMISSORY_NOTE'] as ChequeKind[]).map((k) => (
                  <label
                    key={k}
                    className={`cursor-pointer border-2 rounded-lg p-2.5 text-center transition-colors ${
                      kind === k
                        ? 'border-slate-900 bg-slate-50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input type="radio" value={k} {...register('kind')} className="sr-only" />
                    <p className="font-medium text-sm">
                      {k === 'CHEQUE' ? '📋' : '📜'} {CHEQUE_KIND_LABELS[k]}
                    </p>
                  </label>
                ))}
              </div>
            </Field>

            <Field label="Yön *">
              <div className="grid grid-cols-2 gap-2">
                {(['INCOMING', 'OUTGOING'] as ChequeDirection[]).map((d) => (
                  <label
                    key={d}
                    className={`cursor-pointer border-2 rounded-lg p-2.5 text-center transition-colors ${
                      watch('direction') === d
                        ? d === 'INCOMING'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                          : 'border-red-600 bg-red-50 text-red-700'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input type="radio" value={d} {...register('direction')} className="sr-only" />
                    <p className="font-medium text-sm">
                      {d === 'INCOMING' ? '⬇️' : '⬆️'} {CHEQUE_DIRECTION_LABELS[d]}
                    </p>
                  </label>
                ))}
              </div>
            </Field>
          </div>

          <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            {watch('direction') === 'INCOMING'
              ? '⬇️ Müşteriden bize gelen — portföyde tutulup vadesinde tahsil edilecek'
              : '⬆️ Bizden tedarikçiye verilen — vadesinde bankamızdan ödenecek'}
          </p>

          {/* Cari + Numara */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Cari *" error={errors.contactId?.message} fullWidth>
              <select {...register('contactId')} className="input">
                <option value="">— Cari seçin —</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label={`${kind === 'CHEQUE' ? 'Çek' : 'Senet'} No *`}
              error={errors.chequeNo?.message}
            >
              <input
                {...register('chequeNo')}
                placeholder={kind === 'CHEQUE' ? '0001234' : 'SN-001'}
                className="input"
              />
            </Field>

            <Field label="Tutar (TRY) *" error={errors.amount?.message}>
              <input
                type="number"
                step="0.01"
                {...register('amount')}
                placeholder="0.00"
                className="input"
              />
            </Field>
          </div>

          {/* Banka (sadece çek için) */}
          {kind === 'CHEQUE' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Banka">
                <input
                  {...register('bankName')}
                  placeholder="Garanti BBVA"
                  className="input"
                />
              </Field>
              <Field label="Şube">
                <input
                  {...register('bankBranch')}
                  placeholder="Bağdat Caddesi"
                  className="input"
                />
              </Field>
            </div>
          )}

          {/* Keşideci */}
          <Field label="Keşideci (kim düzenledi)">
            <input
              {...register('drawer')}
              placeholder={kind === 'CHEQUE' ? 'Çeki düzenleyen firma/kişi' : 'Senedi borçlu'}
              className="input"
            />
          </Field>

          {/* Tarihler */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Düzenleme / Keşide Tarihi *" error={errors.issueDate?.message}>
              <input type="date" {...register('issueDate')} className="input" />
            </Field>
            <Field label="Vade Tarihi *" error={errors.dueDate?.message}>
              <input type="date" {...register('dueDate')} className="input" />
            </Field>
          </div>

          {/* Vade uyarısı */}
          {daysToMaturity !== null && dueDate && (
            <div
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                daysToMaturity < 0
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : daysToMaturity < 7
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {daysToMaturity < 0 && `⚠️ Vade ${Math.abs(daysToMaturity)} gün geçmiş!`}
              {daysToMaturity === 0 && '⚡ Vade bugün!'}
              {daysToMaturity > 0 && daysToMaturity < 7 && `⏰ ${daysToMaturity} gün sonra vadesi gelecek`}
              {daysToMaturity >= 7 && `📅 Vadeye ${daysToMaturity} gün var`}
            </div>
          )}

          {/* Açıklama */}
          <Field label="Açıklama">
            <textarea {...register('description')} rows={2} className="input" />
          </Field>

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