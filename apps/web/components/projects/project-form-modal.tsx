'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { toast } from 'sonner';
import {
  projectsApi,
  Project,
  ProjectStatus,
  PROJECT_STATUS_LABELS,
} from '@/lib/api/projects';

// ─── Validation Schema ───
const projectFormSchema = z.object({
  code: z
    .string()
    .min(2, 'Proje kodu en az 2 karakter')
    .max(50)
    .regex(/^[A-Z0-9-]+$/, 'Sadece büyük harf, rakam ve tire (-)'),
  name: z.string().min(2, 'Proje adı en az 2 karakter').max(255),
  description: z.string().optional(),
  status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']),
  address: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  clientName: z.string().optional(),
  clientTaxNumber: z.string().optional(),
  clientPhone: z.string().optional(),
  clientEmail: z
    .string()
    .email('Geçersiz e-posta')
    .optional()
    .or(z.literal('')),
  contractAmount: z
    .string()
    .optional()
    .refine((v) => !v || !isNaN(Number(v)), 'Geçersiz sayı'),
  currency: z.string().default('TRY'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectFormSchema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  project?: Project | null; // null = yeni, dolu = düzenle
}

export function ProjectFormModal({ open, onClose, onSuccess, project }: Props) {
  const isEdit = !!project;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      code: '',
      name: '',
      status: 'PLANNING',
      currency: 'TRY',
    },
  });

  // Modal her açıldığında formu doldur (edit) veya temizle (create)
  useEffect(() => {
    if (!open) return;
    if (project) {
      reset({
        code: project.code,
        name: project.name,
        description: project.description ?? '',
        status: project.status,
        address: project.address ?? '',
        city: project.city ?? '',
        district: project.district ?? '',
        clientName: project.clientName ?? '',
        clientTaxNumber: project.clientTaxNumber ?? '',
        clientPhone: project.clientPhone ?? '',
        clientEmail: project.clientEmail ?? '',
        contractAmount: project.contractAmount ?? '',
        currency: project.currency,
        startDate: project.startDate?.slice(0, 10) ?? '',
        endDate: project.endDate?.slice(0, 10) ?? '',
      });
    } else {
      reset({
        code: '',
        name: '',
        description: '',
        status: 'PLANNING',
        address: '',
        city: '',
        district: '',
        clientName: '',
        clientTaxNumber: '',
        clientPhone: '',
        clientEmail: '',
        contractAmount: '',
        currency: 'TRY',
        startDate: '',
        endDate: '',
      });
    }
  }, [open, project, reset]);

  const onSubmit = async (data: ProjectFormData) => {
    try {
      const payload = {
        code: data.code,
        name: data.name,
        description: data.description || undefined,
        status: data.status,
        address: data.address || undefined,
        city: data.city || undefined,
        district: data.district || undefined,
        clientName: data.clientName || undefined,
        clientTaxNumber: data.clientTaxNumber || undefined,
        clientPhone: data.clientPhone || undefined,
        clientEmail: data.clientEmail || undefined,
        contractAmount: data.contractAmount
          ? Number(data.contractAmount)
          : undefined,
        currency: data.currency,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
      };

      if (isEdit && project) {
        await projectsApi.update(project.id, payload);
        toast.success(`Proje güncellendi: ${data.code}`);
      } else {
        await projectsApi.create(payload);
        toast.success(`Yeni proje oluşturuldu: ${data.code}`);
      }

      onSuccess();
      onClose();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          (error.response?.data as { message?: string })?.message ||
            'İşlem başarısız',
        );
      } else {
        toast.error('Beklenmeyen bir hata oluştu');
      }
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-slate-900">
            {isEdit ? 'Projeyi Düzenle' : 'Yeni Proje Oluştur'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Temel Bilgiler */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
              Temel Bilgiler
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Proje Kodu *" error={errors.code?.message}>
                <input
                  {...register('code')}
                  placeholder="PRJ-2026-001"
                  className="input"
                  disabled={isEdit} // Kod sonradan değişmesin
                />
              </Field>
              <Field label="Durum *" error={errors.status?.message}>
                <select {...register('status')} className="input">
                  {Object.entries(PROJECT_STATUS_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Proje Adı *" error={errors.name?.message} fullWidth>
                <input
                  {...register('name')}
                  placeholder="Çamlıca Konutları İnşaatı"
                  className="input"
                />
              </Field>
              <Field label="Açıklama" error={errors.description?.message} fullWidth>
                <textarea
                  {...register('description')}
                  rows={3}
                  placeholder="Proje hakkında detay..."
                  className="input"
                />
              </Field>
            </div>
          </div>

          {/* Lokasyon */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
              Lokasyon
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Şehir" error={errors.city?.message}>
                <input {...register('city')} placeholder="İstanbul" className="input" />
              </Field>
              <Field label="İlçe" error={errors.district?.message}>
                <input
                  {...register('district')}
                  placeholder="Üsküdar"
                  className="input"
                />
              </Field>
              <Field label="Adres" error={errors.address?.message} fullWidth>
                <input
                  {...register('address')}
                  placeholder="Tam adres"
                  className="input"
                />
              </Field>
            </div>
          </div>

          {/* Müşteri */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
              Müşteri / İşveren
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Müşteri Adı" error={errors.clientName?.message}>
                <input
                  {...register('clientName')}
                  placeholder="ABC Gayrimenkul A.Ş."
                  className="input"
                />
              </Field>
              <Field label="Vergi No" error={errors.clientTaxNumber?.message}>
                <input
                  {...register('clientTaxNumber')}
                  placeholder="1234567890"
                  className="input"
                />
              </Field>
              <Field label="Telefon" error={errors.clientPhone?.message}>
                <input
                  {...register('clientPhone')}
                  placeholder="0212XXXXXXX"
                  className="input"
                />
              </Field>
              <Field label="E-posta" error={errors.clientEmail?.message}>
                <input
                  {...register('clientEmail')}
                  placeholder="info@firma.com"
                  className="input"
                />
              </Field>
            </div>
          </div>

          {/* Bütçe ve Tarihler */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
              Bütçe ve Süre
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Sözleşme Bedeli" error={errors.contractAmount?.message}>
                <input
                  {...register('contractAmount')}
                  type="number"
                  step="0.01"
                  placeholder="0"
                  className="input"
                />
              </Field>
              <Field label="Para Birimi" error={errors.currency?.message}>
                <select {...register('currency')} className="input">
                  <option value="TRY">TRY</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </Field>
              <div></div>
              <Field label="Başlangıç Tarihi" error={errors.startDate?.message}>
                <input {...register('startDate')} type="date" className="input" />
              </Field>
              <Field label="Bitiş Tarihi" error={errors.endDate?.message}>
                <input {...register('endDate')} type="date" className="input" />
              </Field>
            </div>
          </div>

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
              {isSubmitting
                ? 'Kaydediliyor...'
                : isEdit
                  ? 'Güncelle'
                  : 'Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Helper Field Component ───
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
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}