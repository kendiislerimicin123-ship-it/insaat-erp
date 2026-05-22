'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { toast } from 'sonner';
import {
  progressPaymentsApi,
  ProgressPayment,
  PAYMENT_STATUS_LABELS,
  formatCurrency,
} from '@/lib/api/progress-payments';
import { projectsApi } from '@/lib/api/projects';
import { subcontractorsApi } from '@/lib/api/subcontractors';

const schema = z.object({
  code: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[A-Z0-9-]+$/, 'Sadece büyük harf, rakam ve tire (-)'),
  projectId: z.string().min(1, 'Proje seçilmeli'),
  subcontractorId: z.string().min(1, 'Taşeron seçilmeli'),
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Format: YYYY-MM'),
  amount: z.coerce.number().min(0.01, 'Tutar 0 dan büyük olmalı'),
  taxRate: z.coerce.number().min(0).max(100),
  currency: z.string().default('TRY'),
  status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'PAID', 'REJECTED', 'CANCELLED']),
  description: z.string().optional(),
  notes: z.string().optional(),
  issuedAt: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  payment?: ProgressPayment | null;
}

export function ProgressPaymentFormModal({
  open,
  onClose,
  onSuccess,
  payment,
}: Props) {
  const isEdit = !!payment;
  const [projects, setProjects] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [subcontractors, setSubcontractors] = useState<Array<{ id: string; code: string; name: string }>>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: '',
      projectId: '',
      subcontractorId: '',
      period: new Date().toISOString().slice(0, 7),
      amount: 0,
      taxRate: 20,
      currency: 'TRY',
      status: 'DRAFT',
    },
  });

  // İzlenen değerler — live hesaplama
  const amount = watch('amount');
  const taxRate = watch('taxRate');

  const calc = useMemo(() => {
    const a = Number(amount) || 0;
    const r = Number(taxRate) || 0;
    const tax = (a * r) / 100;
    const total = a + tax;
    return { amount: a, tax, total };
  }, [amount, taxRate]);

  // Proje + taşeron listelerini yükle
  useEffect(() => {
    if (!open) return;
    Promise.all([projectsApi.listAll(), subcontractorsApi.listAll()])
      .then(([p, s]) => {
        setProjects(p);
        setSubcontractors(s);
      })
      .catch(() => {});
  }, [open]);

  // Form'u doldur veya temizle
  useEffect(() => {
    if (!open) return;
    if (payment) {
      reset({
        code: payment.code,
        projectId: payment.projectId,
        subcontractorId: payment.subcontractorId,
        period: payment.period,
        amount: parseFloat(payment.amount),
        taxRate: parseFloat(payment.taxRate),
        currency: payment.currency,
        status: payment.status,
        description: payment.description ?? '',
        notes: payment.notes ?? '',
        issuedAt: payment.issuedAt ? payment.issuedAt.slice(0, 10) : '',
      });
    } else {
      reset({
        code: '',
        projectId: '',
        subcontractorId: '',
        period: new Date().toISOString().slice(0, 7),
        amount: 0,
        taxRate: 20,
        currency: 'TRY',
        status: 'DRAFT',
        description: '',
        notes: '',
        issuedAt: '',
      });
    }
  }, [open, payment, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        code: data.code,
        projectId: data.projectId,
        subcontractorId: data.subcontractorId,
        period: data.period,
        amount: data.amount,
        taxRate: data.taxRate,
        currency: data.currency,
        status: data.status,
        description: data.description || undefined,
        notes: data.notes || undefined,
        issuedAt: data.issuedAt ? new Date(data.issuedAt).toISOString() : undefined,
      };

      if (isEdit && payment) {
        await progressPaymentsApi.update(payment.id, payload);
        toast.success(`Hakediş güncellendi: ${data.code}`);
      } else {
        await progressPaymentsApi.create(payload);
        toast.success(`Hakediş oluşturuldu: ${data.code}`);
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
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-slate-900">
            {isEdit ? 'Hakedişi Düzenle' : 'Yeni Hakediş Oluştur'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Temel Bilgiler */}
          <Section title="Temel Bilgiler">
            <Field label="Hakediş Kodu *" error={errors.code?.message}>
              <input
                {...register('code')}
                placeholder="HKD-2026-001"
                className="input"
                disabled={isEdit}
              />
            </Field>
            <Field label="Dönem (YYYY-MM) *" error={errors.period?.message}>
              <input
                {...register('period')}
                placeholder="2026-05"
                className="input"
              />
            </Field>
            <Field label="Proje *" error={errors.projectId?.message}>
              <select {...register('projectId')} className="input">
                <option value="">Proje seçin...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Taşeron *" error={errors.subcontractorId?.message}>
              <select {...register('subcontractorId')} className="input">
                <option value="">Taşeron seçin...</option>
                {subcontractors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Düzenleme Tarihi" error={errors.issuedAt?.message}>
              <input type="date" {...register('issuedAt')} className="input" />
            </Field>
            <Field label="Durum *" error={errors.status?.message}>
              <select {...register('status')} className="input">
                {Object.entries(PAYMENT_STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </Field>
          </Section>

          {/* Finansal */}
          <Section title="Finansal Bilgiler">
            <Field label="Tutar (KDV Hariç) *" error={errors.amount?.message}>
              <input
                type="number"
                step="0.01"
                {...register('amount')}
                placeholder="0.00"
                className="input"
              />
            </Field>
            <Field label="KDV Oranı (%) *" error={errors.taxRate?.message}>
              <input
                type="number"
                step="0.01"
                {...register('taxRate')}
                placeholder="20"
                className="input"
              />
            </Field>
            <Field label="Para Birimi" error={errors.currency?.message}>
              <select {...register('currency')} className="input">
                <option value="TRY">TRY (₺)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </Field>
          </Section>

          {/* Hesaplama Özeti */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
              Hesaplama
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-500">KDV Hariç</p>
                <p className="text-lg font-bold text-slate-900 mt-0.5">
                  {formatCurrency(calc.amount, watch('currency') || 'TRY')}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">KDV ({taxRate || 0}%)</p>
                <p className="text-lg font-bold text-slate-900 mt-0.5">
                  {formatCurrency(calc.tax, watch('currency') || 'TRY')}
                </p>
              </div>
              <div className="border-l border-slate-200 pl-4">
                <p className="text-xs text-emerald-700 font-medium uppercase tracking-wide">
                  Toplam (KDV Dahil)
                </p>
                <p className="text-xl font-bold text-emerald-700 mt-0.5">
                  {formatCurrency(calc.total, watch('currency') || 'TRY')}
                </p>
              </div>
            </div>
          </div>

          {/* Açıklamalar */}
          <Section title="Açıklamalar">
            <Field label="İş Açıklaması" error={errors.description?.message} fullWidth>
              <textarea
                {...register('description')}
                rows={3}
                placeholder="Yapılan işin tanımı (örn: 500m³ beton dökümü)"
                className="input"
              />
            </Field>
            <Field label="Notlar" error={errors.notes?.message} fullWidth>
              <textarea
                {...register('notes')}
                rows={2}
                placeholder="İç notlar..."
                className="input"
              />
            </Field>
          </Section>

          {/* Footer */}
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
              {isSubmitting ? 'Kaydediliyor...' : isEdit ? 'Güncelle' : 'Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
        {title}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
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