'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { toast } from 'sonner';
import {
  materialsApi,
  Material,
  MATERIAL_CATEGORY_LABELS,
  MATERIAL_UNIT_LABELS,
} from '@/lib/api/materials';

const schema = z.object({
  code: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[A-Z0-9-]+$/, 'Sadece büyük harf, rakam ve tire (-)'),
  name: z.string().min(2).max(255),
  category: z.enum([
    'CEMENT', 'AGGREGATE', 'STEEL', 'TIMBER', 'BRICK_BLOCK',
    'TILE_CERAMIC', 'PAINT_CHEMICAL', 'ELECTRICAL', 'PLUMBING',
    'HVAC', 'INSULATION', 'ADHESIVE', 'HARDWARE', 'TOOLS', 'SAFETY', 'OTHER',
  ]),
  unit: z.enum([
    'PIECE', 'KG', 'TON', 'M', 'M2', 'M3',
    'LITER', 'PACKAGE', 'BOX', 'ROLL',
  ]),
  description: z.string().optional(),
  minStock: z.coerce.number().min(0).optional(),
  currency: z.string().default('TRY'),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  material?: Material | null;
}

export function MaterialFormModal({ open, onClose, onSuccess, material }: Props) {
  const isEdit = !!material;

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
      unit: 'PIECE',
      minStock: 0,
      currency: 'TRY',
    },
  });

  useEffect(() => {
    if (!open) return;
    if (material) {
      reset({
        code: material.code,
        name: material.name,
        category: material.category,
        unit: material.unit,
        description: material.description ?? '',
        minStock: parseFloat(material.minStock),
        currency: material.currency,
        notes: material.notes ?? '',
      });
    } else {
      reset({
        code: '',
        name: '',
        category: 'OTHER',
        unit: 'PIECE',
        description: '',
        minStock: 0,
        currency: 'TRY',
        notes: '',
      });
    }
  }, [open, material, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        code: data.code,
        name: data.name,
        category: data.category,
        unit: data.unit,
        description: data.description || undefined,
        minStock: data.minStock,
        currency: data.currency,
        notes: data.notes || undefined,
      };

      if (isEdit && material) {
        await materialsApi.update(material.id, payload);
        toast.success(`Malzeme güncellendi: ${data.code}`);
      } else {
        await materialsApi.create(payload);
        toast.success(`Malzeme oluşturuldu: ${data.code}`);
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
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-slate-900">
            {isEdit ? 'Malzemeyi Düzenle' : 'Yeni Malzeme Oluştur'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Kod *" error={errors.code?.message}>
              <input
                {...register('code')}
                placeholder="MAT-001"
                className="input"
                disabled={isEdit}
              />
            </Field>
            <Field label="Malzeme Adı *" error={errors.name?.message}>
              <input
                {...register('name')}
                placeholder="Çimento CEM I 42.5"
                className="input"
              />
            </Field>
            <Field label="Kategori *" error={errors.category?.message}>
              <select {...register('category')} className="input">
                {Object.entries(MATERIAL_CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="Birim *" error={errors.unit?.message}>
              <select {...register('unit')} className="input">
                {Object.entries(MATERIAL_UNIT_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="Açıklama" error={errors.description?.message} fullWidth>
              <textarea
                {...register('description')}
                rows={2}
                placeholder="Marka, model, teknik özellikler..."
                className="input"
              />
            </Field>
            <Field label="Minimum Stok (Kritik Seviye)" error={errors.minStock?.message}>
              <input
                type="number"
                step="0.01"
                {...register('minStock')}
                placeholder="0"
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
            <Field label="Notlar" error={errors.notes?.message} fullWidth>
              <textarea {...register('notes')} rows={2} className="input" />
            </Field>
          </div>

          {!isEdit && (
            <div className="bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg text-xs text-blue-800">
              ℹ️ Stok seviyesi 0 olarak başlar. Stok eklemek için listeden &ldquo;Giriş&rdquo; yapın.
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
              {isSubmitting ? 'Kaydediliyor...' : isEdit ? 'Güncelle' : 'Oluştur'}
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