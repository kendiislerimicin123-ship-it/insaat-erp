'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { toast } from 'sonner';
import {
  materialsApi,
  Material,
  MovementType,
  MOVEMENT_TYPE_LABELS,
  formatStock,
  formatCurrency,
} from '@/lib/api/materials';
import { projectsApi } from '@/lib/api/projects';

const schema = z.object({
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT']),
  quantity: z.coerce.number().min(0.0001, 'Miktar 0 dan büyük olmalı'),
  unitPrice: z.coerce.number().min(0).optional(),
  projectId: z.string().optional(),
  date: z.string().min(1, 'Tarih zorunlu'),
  supplier: z.string().optional(),
  invoiceNo: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  material: Material | null;
  initialType?: MovementType;
  onClose: () => void;
  onSuccess: () => void;
}

export function MovementModal({ open, material, initialType, onClose, onSuccess }: Props) {
  const [projects, setProjects] = useState<Array<{ id: string; code: string; name: string }>>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: initialType ?? 'IN',
      quantity: 0,
      date: new Date().toISOString().slice(0, 10),
    },
  });

  const type = watch('type');
  const quantity = watch('quantity');
  const unitPrice = watch('unitPrice');

  const totalPrice = useMemo(() => {
    return (Number(quantity) || 0) * (Number(unitPrice) || 0);
  }, [quantity, unitPrice]);

  useEffect(() => {
    if (!open) return;
    projectsApi.listAll().then(setProjects).catch(() => {});
    reset({
      type: initialType ?? 'IN',
      quantity: 0,
      unitPrice: undefined,
      projectId: '',
      date: new Date().toISOString().slice(0, 10),
      supplier: '',
      invoiceNo: '',
      notes: '',
    });
  }, [open, initialType, reset]);

  const onSubmit = async (data: FormData) => {
    if (!material) return;

    try {
      const payload = {
        materialId: material.id,
        type: data.type,
        quantity: data.quantity,
        unitPrice: data.unitPrice || undefined,
        projectId: data.projectId || undefined,
        date: new Date(data.date).toISOString(),
        supplier: data.supplier || undefined,
        invoiceNo: data.invoiceNo || undefined,
        notes: data.notes || undefined,
      };

      await materialsApi.createMovement(payload);
      toast.success(
        `Stok ${MOVEMENT_TYPE_LABELS[data.type]} kaydedildi: ${data.quantity} ${material.unit}`,
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

  if (!open || !material) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Stok Hareketi</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {material.code} • {material.name}
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* Mevcut Stok Özeti */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Mevcut Stok</p>
              <p className="text-lg font-bold text-slate-900 mt-1">
                {formatStock(material.currentStock, material.unit)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Ortalama Fiyat</p>
              <p className="text-lg font-bold text-slate-900 mt-1">
                {formatCurrency(material.avgPrice, material.currency)}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Hareket Tipi - 3 buton */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Hareket Tipi *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['IN', 'OUT', 'ADJUSTMENT'] as MovementType[]).map((t) => (
                  <label
                    key={t}
                    className={`cursor-pointer border-2 rounded-lg p-3 text-center transition-colors ${
                      type === t
                        ? t === 'IN'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                          : t === 'OUT'
                            ? 'border-red-600 bg-red-50 text-red-700'
                            : 'border-amber-600 bg-amber-50 text-amber-700'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input type="radio" value={t} {...register('type')} className="sr-only" />
                    <p className="font-medium text-sm">
                      {t === 'IN' ? '⬇️ Giriş' : t === 'OUT' ? '⬆️ Çıkış' : '🔄 Düzeltme'}
                    </p>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                label={type === 'ADJUSTMENT' ? `Yeni Stok Seviyesi (${material.unit}) *` : `Miktar (${material.unit}) *`}
                error={errors.quantity?.message}
              >
                <input
                  type="number"
                  step="0.0001"
                  {...register('quantity')}
                  placeholder="0"
                  className="input"
                />
              </Field>

              <Field label="Tarih *" error={errors.date?.message}>
                <input type="date" {...register('date')} className="input" />
              </Field>

              {type === 'IN' && (
                <>
                  <Field label="Birim Fiyat" error={errors.unitPrice?.message}>
                    <input
                      type="number"
                      step="0.01"
                      {...register('unitPrice')}
                      placeholder="0.00"
                      className="input"
                    />
                  </Field>
                  <Field label="Tedarikçi" error={errors.supplier?.message}>
                    <input
                      {...register('supplier')}
                      placeholder="ABC Tedarik Ltd."
                      className="input"
                    />
                  </Field>
                  <Field label="Fatura No" error={errors.invoiceNo?.message} fullWidth>
                    <input
                      {...register('invoiceNo')}
                      placeholder="FAT-2026-001"
                      className="input"
                    />
                  </Field>
                </>
              )}

              {type === 'OUT' && (
                <Field label="Proje (hangi şantiyeye?)" error={errors.projectId?.message} fullWidth>
                  <select {...register('projectId')} className="input">
                    <option value="">— Proje seçin —</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} — {p.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              <Field label="Notlar" error={errors.notes?.message} fullWidth>
                <textarea {...register('notes')} rows={2} className="input" />
              </Field>
            </div>

            {/* Toplam Tutar (IN için) */}
            {type === 'IN' && totalPrice > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-emerald-700 font-medium">Toplam Tutar</p>
                  <p className="text-xl font-bold text-emerald-700">
                    {formatCurrency(totalPrice, material.currency)}
                  </p>
                </div>
              </div>
            )}

            {/* ADJUSTMENT uyarısı */}
            {type === 'ADJUSTMENT' && (
              <div className="bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg text-xs text-amber-800">
                ⚠️ Düzeltme: Stok seviyesi tam bu değere ayarlanır (mevcut + miktar değil).
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
                className={`px-4 py-2 rounded-lg text-white disabled:opacity-50 ${
                  type === 'IN'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : type === 'OUT'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {isSubmitting ? 'Kaydediliyor...' : `Kaydet`}
              </button>
            </div>
          </form>
        </div>
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