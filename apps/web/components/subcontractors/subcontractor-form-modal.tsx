'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { toast } from 'sonner';
import {
  subcontractorsApi,
  Subcontractor,
  SUBCONTRACTOR_CATEGORY_LABELS,
  SUBCONTRACTOR_STATUS_LABELS,
} from '@/lib/api/subcontractors';

const schema = z.object({
  code: z
    .string()
    .min(2, 'En az 2 karakter')
    .max(50)
    .regex(/^[A-Z0-9-]+$/, 'Sadece büyük harf, rakam ve tire (-)'),
  name: z.string().min(2, 'En az 2 karakter').max(255),
  category: z.enum([
    'EXCAVATION', 'CONCRETE', 'FORMWORK', 'REBAR', 'MASONRY',
    'PLASTER', 'PAINT', 'TILE', 'ELECTRICAL', 'PLUMBING',
    'HVAC', 'CARPENTRY', 'ROOFING', 'INSULATION', 'LANDSCAPING',
    'CLEANING', 'OTHER',
  ]),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLACKLISTED', 'ARCHIVED']),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Geçersiz e-posta').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  taxNumber: z.string().optional(),
  taxOffice: z.string().optional(),
  tradeRegistry: z.string().optional(),
  iban: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  subcontractor?: Subcontractor | null;
}

export function SubcontractorFormModal({
  open,
  onClose,
  onSuccess,
  subcontractor,
}: Props) {
  const isEdit = !!subcontractor;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: '',
      name: '',
      category: 'OTHER',
      status: 'ACTIVE',
    },
  });

  useEffect(() => {
    if (!open) return;
    if (subcontractor) {
      reset({
        code: subcontractor.code,
        name: subcontractor.name,
        category: subcontractor.category,
        status: subcontractor.status,
        contactPerson: subcontractor.contactPerson ?? '',
        phone: subcontractor.phone ?? '',
        email: subcontractor.email ?? '',
        address: subcontractor.address ?? '',
        city: subcontractor.city ?? '',
        district: subcontractor.district ?? '',
        taxNumber: subcontractor.taxNumber ?? '',
        taxOffice: subcontractor.taxOffice ?? '',
        tradeRegistry: subcontractor.tradeRegistry ?? '',
        iban: subcontractor.iban ?? '',
        notes: subcontractor.notes ?? '',
      });
    } else {
      reset({
        code: '',
        name: '',
        category: 'OTHER',
        status: 'ACTIVE',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        district: '',
        taxNumber: '',
        taxOffice: '',
        tradeRegistry: '',
        iban: '',
        notes: '',
      });
    }
  }, [open, subcontractor, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        code: data.code,
        name: data.name,
        category: data.category,
        status: data.status,
        contactPerson: data.contactPerson || undefined,
        phone: data.phone || undefined,
        email: data.email || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        district: data.district || undefined,
        taxNumber: data.taxNumber || undefined,
        taxOffice: data.taxOffice || undefined,
        tradeRegistry: data.tradeRegistry || undefined,
        iban: data.iban || undefined,
        notes: data.notes || undefined,
      };

      if (isEdit && subcontractor) {
        await subcontractorsApi.update(subcontractor.id, payload);
        toast.success(`Taşeron güncellendi: ${data.code}`);
      } else {
        await subcontractorsApi.create(payload);
        toast.success(`Taşeron oluşturuldu: ${data.code}`);
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
            {isEdit ? 'Taşeronu Düzenle' : 'Yeni Taşeron Oluştur'}
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
            <Field label="Kod *" error={errors.code?.message}>
              <input
                {...register('code')}
                placeholder="TAS-001"
                className="input"
                disabled={isEdit}
              />
            </Field>
            <Field label="Kategori *" error={errors.category?.message}>
              <select {...register('category')} className="input">
                {Object.entries(SUBCONTRACTOR_CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="Firma Adı *" error={errors.name?.message} fullWidth>
              <input
                {...register('name')}
                placeholder="ABC Beton Sanayi"
                className="input"
              />
            </Field>
            <Field label="Durum *" error={errors.status?.message}>
              <select {...register('status')} className="input">
                {Object.entries(SUBCONTRACTOR_STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </Field>
          </Section>

          {/* İletişim */}
          <Section title="İletişim">
            <Field label="Yetkili Kişi" error={errors.contactPerson?.message}>
              <input {...register('contactPerson')} placeholder="Mehmet Yıldız" className="input" />
            </Field>
            <Field label="Telefon" error={errors.phone?.message}>
              <input {...register('phone')} placeholder="0532XXXXXXX" className="input" />
            </Field>
            <Field label="E-posta" error={errors.email?.message} fullWidth>
              <input {...register('email')} placeholder="info@firma.com" className="input" />
            </Field>
          </Section>

          {/* Adres */}
          <Section title="Adres">
            <Field label="Şehir" error={errors.city?.message}>
              <input {...register('city')} placeholder="İstanbul" className="input" />
            </Field>
            <Field label="İlçe" error={errors.district?.message}>
              <input {...register('district')} placeholder="Kadıköy" className="input" />
            </Field>
            <Field label="Açık Adres" error={errors.address?.message} fullWidth>
              <textarea {...register('address')} rows={2} className="input" />
            </Field>
          </Section>

          {/* Resmi Bilgiler */}
          <Section title="Resmi Bilgiler">
            <Field label="Vergi No" error={errors.taxNumber?.message}>
              <input {...register('taxNumber')} className="input" />
            </Field>
            <Field label="Vergi Dairesi" error={errors.taxOffice?.message}>
              <input {...register('taxOffice')} className="input" />
            </Field>
            <Field label="Sicil No" error={errors.tradeRegistry?.message}>
              <input {...register('tradeRegistry')} className="input" />
            </Field>
            <Field label="IBAN" error={errors.iban?.message}>
              <input {...register('iban')} placeholder="TR..." className="input" />
            </Field>
          </Section>

          {/* Notlar */}
          <Section title="Notlar">
            <Field label="Açıklama" error={errors.notes?.message} fullWidth>
              <textarea {...register('notes')} rows={3} placeholder="Taşeron hakkında notlar..." className="input" />
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