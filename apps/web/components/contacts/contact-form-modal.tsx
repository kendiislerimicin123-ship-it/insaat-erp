'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { toast } from 'sonner';
import {
  contactsApi,
  Contact,
  CONTACT_TYPE_LABELS,
  CONTACT_STATUS_LABELS,
} from '@/lib/api/contacts';

const schema = z.object({
  code: z.string().min(2).max(50).regex(/^[A-Z0-9-]+$/, 'Sadece büyük harf, rakam ve tire (-)'),
  name: z.string().min(2).max(255),
  type: z.enum(['SUPPLIER', 'CUSTOMER', 'BOTH', 'BANK', 'GOVERNMENT', 'OTHER']),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLACKLISTED', 'ARCHIVED']),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Geçersiz e-posta').optional().or(z.literal('')),
  website: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  country: z.string().optional(),
  taxNumber: z.string().optional(),
  taxOffice: z.string().optional(),
  tradeRegistry: z.string().optional(),
  iban: z.string().optional(),
  bankName: z.string().optional(),
  paymentTerms: z.coerce.number().min(0).optional(),
  creditLimit: z.coerce.number().min(0).optional(),
  currency: z.string().default('TRY'),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  contact?: Contact | null;
}

export function ContactFormModal({ open, onClose, onSuccess, contact }: Props) {
  const isEdit = !!contact;

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
      type: 'SUPPLIER',
      status: 'ACTIVE',
      country: 'Türkiye',
      currency: 'TRY',
    },
  });

  useEffect(() => {
    if (!open) return;
    if (contact) {
      reset({
        code: contact.code,
        name: contact.name,
        type: contact.type,
        status: contact.status,
        contactPerson: contact.contactPerson ?? '',
        phone: contact.phone ?? '',
        email: contact.email ?? '',
        website: contact.website ?? '',
        address: contact.address ?? '',
        city: contact.city ?? '',
        district: contact.district ?? '',
        country: contact.country ?? 'Türkiye',
        taxNumber: contact.taxNumber ?? '',
        taxOffice: contact.taxOffice ?? '',
        tradeRegistry: contact.tradeRegistry ?? '',
        iban: contact.iban ?? '',
        bankName: contact.bankName ?? '',
        paymentTerms: contact.paymentTerms ?? undefined,
        creditLimit: contact.creditLimit ? parseFloat(contact.creditLimit) : undefined,
        currency: contact.currency,
        notes: contact.notes ?? '',
      });
    } else {
      reset({
        code: '',
        name: '',
        type: 'SUPPLIER',
        status: 'ACTIVE',
        contactPerson: '',
        phone: '',
        email: '',
        website: '',
        address: '',
        city: '',
        district: '',
        country: 'Türkiye',
        taxNumber: '',
        taxOffice: '',
        tradeRegistry: '',
        iban: '',
        bankName: '',
        currency: 'TRY',
        notes: '',
      });
    }
  }, [open, contact, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        code: data.code,
        name: data.name,
        type: data.type,
        status: data.status,
        contactPerson: data.contactPerson || undefined,
        phone: data.phone || undefined,
        email: data.email || undefined,
        website: data.website || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        district: data.district || undefined,
        country: data.country || undefined,
        taxNumber: data.taxNumber || undefined,
        taxOffice: data.taxOffice || undefined,
        tradeRegistry: data.tradeRegistry || undefined,
        iban: data.iban || undefined,
        bankName: data.bankName || undefined,
        paymentTerms: data.paymentTerms,
        creditLimit: data.creditLimit,
        currency: data.currency,
        notes: data.notes || undefined,
      };

      if (isEdit && contact) {
        await contactsApi.update(contact.id, payload);
        toast.success(`Cari güncellendi: ${data.code}`);
      } else {
        await contactsApi.create(payload);
        toast.success(`Cari oluşturuldu: ${data.code}`);
      }

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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-slate-900">
            {isEdit ? 'Cari Hesabı Düzenle' : 'Yeni Cari Hesap Oluştur'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          <Section title="Temel Bilgiler">
            <Field label="Kod *" error={errors.code?.message}>
              <input {...register('code')} placeholder="CR-001" className="input" disabled={isEdit} />
            </Field>
            <Field label="Tip *" error={errors.type?.message}>
              <select {...register('type')} className="input">
                {Object.entries(CONTACT_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="Firma / Kişi Adı *" error={errors.name?.message} fullWidth>
              <input {...register('name')} placeholder="ABC Çimento Sanayi A.Ş." className="input" />
            </Field>
            <Field label="Durum *" error={errors.status?.message}>
              <select {...register('status')} className="input">
                {Object.entries(CONTACT_STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="Para Birimi" error={errors.currency?.message}>
              <select {...register('currency')} className="input">
                <option value="TRY">TRY (₺)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </Field>
          </Section>

          <Section title="İletişim">
            <Field label="Yetkili Kişi" error={errors.contactPerson?.message}>
              <input {...register('contactPerson')} placeholder="Ahmet Yılmaz" className="input" />
            </Field>
            <Field label="Telefon" error={errors.phone?.message}>
              <input {...register('phone')} placeholder="0532XXXXXXX" className="input" />
            </Field>
            <Field label="E-posta" error={errors.email?.message}>
              <input {...register('email')} placeholder="info@firma.com" className="input" />
            </Field>
            <Field label="Web Sitesi" error={errors.website?.message}>
              <input {...register('website')} placeholder="www.firma.com" className="input" />
            </Field>
          </Section>

          <Section title="Adres">
            <Field label="Şehir" error={errors.city?.message}>
              <input {...register('city')} placeholder="İstanbul" className="input" />
            </Field>
            <Field label="İlçe" error={errors.district?.message}>
              <input {...register('district')} placeholder="Kadıköy" className="input" />
            </Field>
            <Field label="Ülke" error={errors.country?.message}>
              <input {...register('country')} placeholder="Türkiye" className="input" />
            </Field>
            <Field label="Açık Adres" error={errors.address?.message} fullWidth>
              <textarea {...register('address')} rows={2} className="input" />
            </Field>
          </Section>

          <Section title="Resmi Bilgiler">
            <Field label="Vergi No / TC No" error={errors.taxNumber?.message}>
              <input {...register('taxNumber')} className="input" />
            </Field>
            <Field label="Vergi Dairesi" error={errors.taxOffice?.message}>
              <input {...register('taxOffice')} className="input" />
            </Field>
            <Field label="Ticaret Sicil No" error={errors.tradeRegistry?.message}>
              <input {...register('tradeRegistry')} className="input" />
            </Field>
            <Field label="Banka" error={errors.bankName?.message}>
              <input {...register('bankName')} placeholder="Garanti BBVA" className="input" />
            </Field>
            <Field label="IBAN" error={errors.iban?.message} fullWidth>
              <input {...register('iban')} placeholder="TR..." className="input" />
            </Field>
          </Section>

          <Section title="Cari Ayarları">
            <Field label="Vade Gün" error={errors.paymentTerms?.message}>
              <input type="number" {...register('paymentTerms')} placeholder="30" className="input" />
            </Field>
            <Field label="Kredi Limiti" error={errors.creditLimit?.message}>
              <input type="number" step="0.01" {...register('creditLimit')} placeholder="0.00" className="input" />
            </Field>
          </Section>

          <Section title="Notlar">
            <Field label="Açıklama" error={errors.notes?.message} fullWidth>
              <textarea {...register('notes')} rows={3} className="input" />
            </Field>
          </Section>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">
              İptal
            </button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50">
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
      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">{title}</h3>
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