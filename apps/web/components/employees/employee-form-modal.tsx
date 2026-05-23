'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { toast } from 'sonner';
import {
  employeesApi,
  Employee,
  EMPLOYEE_SPECIALTY_LABELS,
  EMPLOYEE_STATUS_LABELS,
} from '@/lib/api/employees';

const schema = z.object({
  name: z.string().min(2, 'En az 2 karakter').max(255),
  tcNo: z.string().max(11).optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  specialty: z.enum([
    'FOREMAN', 'MASTER', 'APPRENTICE', 'LABORER',
    'OPERATOR', 'DRIVER', 'TECHNICIAN', 'ENGINEER', 'OTHER',
  ]),
  role: z.string().max(100).optional().or(z.literal('')),
  dailyWage: z.coerce.number().min(0),
  startDate: z.string().optional().or(z.literal('')),
  endDate: z.string().optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE', 'TERMINATED', 'ARCHIVED']),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  subcontractorId: string;
  employee?: Employee | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function EmployeeFormModal({
  open,
  subcontractorId,
  employee,
  onClose,
  onSuccess,
}: Props) {
  const isEdit = !!employee;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      specialty: 'LABORER',
      status: 'ACTIVE',
      dailyWage: 0,
    },
  });

  useEffect(() => {
    if (!open) return;
    if (employee) {
      reset({
        name: employee.name,
        tcNo: employee.tcNo ?? '',
        phone: employee.phone ?? '',
        specialty: employee.specialty,
        role: employee.role ?? '',
        dailyWage: parseFloat(employee.dailyWage),
        startDate: employee.startDate ? employee.startDate.slice(0, 10) : '',
        endDate: employee.endDate ? employee.endDate.slice(0, 10) : '',
        status: employee.status,
        notes: employee.notes ?? '',
      });
    } else {
      reset({
        name: '',
        tcNo: '',
        phone: '',
        specialty: 'LABORER',
        role: '',
        dailyWage: 0,
        startDate: '',
        endDate: '',
        status: 'ACTIVE',
        notes: '',
      });
    }
  }, [open, employee, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        subcontractorId,
        name: data.name,
        tcNo: data.tcNo || undefined,
        phone: data.phone || undefined,
        specialty: data.specialty,
        role: data.role || undefined,
        dailyWage: data.dailyWage,
        startDate: data.startDate ? new Date(data.startDate).toISOString() : undefined,
        endDate: data.endDate ? new Date(data.endDate).toISOString() : undefined,
        status: data.status,
        notes: data.notes || undefined,
      };

      if (isEdit && employee) {
        await employeesApi.update(employee.id, payload);
        toast.success(`İşçi güncellendi: ${data.name}`);
      } else {
        await employeesApi.create(payload);
        toast.success(`İşçi eklendi: ${data.name}`);
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
            {isEdit ? 'İşçiyi Düzenle' : 'Yeni İşçi Ekle'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Ad Soyad *" error={errors.name?.message} fullWidth>
              <input {...register('name')} placeholder="Ahmet Yılmaz" className="input" />
            </Field>

            <Field label="TC No" error={errors.tcNo?.message}>
              <input {...register('tcNo')} placeholder="12345678901" maxLength={11} className="input" />
            </Field>

            <Field label="Telefon" error={errors.phone?.message}>
              <input {...register('phone')} placeholder="0532XXXXXXX" className="input" />
            </Field>

            <Field label="Uzmanlık *" error={errors.specialty?.message}>
              <select {...register('specialty')} className="input">
                {Object.entries(EMPLOYEE_SPECIALTY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </Field>

            <Field label="Rol / Görev" error={errors.role?.message}>
              <input
                {...register('role')}
                placeholder="örn: Demirci, Sıvacı, Boyacı"
                className="input"
              />
            </Field>

            <Field label="Günlük Ücret (₺) *" error={errors.dailyWage?.message}>
              <input
                type="number"
                step="0.01"
                {...register('dailyWage')}
                placeholder="800"
                className="input"
              />
            </Field>

            <Field label="Durum *" error={errors.status?.message}>
              <select {...register('status')} className="input">
                {Object.entries(EMPLOYEE_STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </Field>

            <Field label="Başlama Tarihi" error={errors.startDate?.message}>
              <input type="date" {...register('startDate')} className="input" />
            </Field>

            <Field label="Bitiş Tarihi" error={errors.endDate?.message}>
              <input type="date" {...register('endDate')} className="input" />
            </Field>

            <Field label="Notlar" error={errors.notes?.message} fullWidth>
              <textarea {...register('notes')} rows={2} className="input" />
            </Field>
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
              {isSubmitting ? 'Kaydediliyor...' : isEdit ? 'Güncelle' : 'Ekle'}
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