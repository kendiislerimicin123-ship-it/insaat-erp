'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { toast } from 'sonner';
import {
  usersApi,
  User,
  Role,
  USER_STATUS_LABELS,
} from '@/lib/api/users';

const createUserSchema = z.object({
  email: z.string().email('Geçerli bir e-posta girin').max(255),
  password: z
    .string()
    .min(8, 'En az 8 karakter')
    .max(100)
    .regex(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '1 büyük, 1 küçük, 1 rakam içermeli'),
  firstName: z.string().min(2, 'En az 2 karakter').max(100),
  lastName: z.string().min(2, 'En az 2 karakter').max(100),
  phone: z.string().max(20).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION']),
  roleSlugs: z.array(z.string()).min(1, 'En az 1 rol seçin'),
});

const updateUserSchema = z.object({
  firstName: z.string().min(2).max(100),
  lastName: z.string().min(2).max(100),
  phone: z.string().max(20).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION']),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;
type UpdateUserFormData = z.infer<typeof updateUserSchema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user?: User | null;
}

export function UserFormModal({ open, onClose, onSuccess, user }: Props) {
  const isEdit = !!user;
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);

  // İki ayrı form: oluşturma ve güncelleme
  const createForm = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phone: '',
      status: 'ACTIVE',
      roleSlugs: [],
    },
  });

  const updateForm = useForm<UpdateUserFormData>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      status: 'ACTIVE',
    },
  });

  // Rolleri yükle
  useEffect(() => {
    if (open && !isEdit) {
      usersApi.getAvailableRoles().then(setAvailableRoles).catch(() => {});
    }
  }, [open, isEdit]);

  // Form'u doldur veya temizle
  useEffect(() => {
    if (!open) return;
    if (user) {
      updateForm.reset({
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone ?? '',
        status: user.status,
      });
    } else {
      createForm.reset({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        status: 'ACTIVE',
        roleSlugs: [],
      });
    }
  }, [open, user, createForm, updateForm]);

  const onCreateSubmit = async (data: CreateUserFormData) => {
    try {
      await usersApi.create({
        ...data,
        phone: data.phone || undefined,
      });
      toast.success(`Kullanıcı oluşturuldu: ${data.email}`);
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

  const onUpdateSubmit = async (data: UpdateUserFormData) => {
    if (!user) return;
    try {
      await usersApi.update(user.id, {
        ...data,
        phone: data.phone || undefined,
      });
      toast.success(`Kullanıcı güncellendi: ${user.email}`);
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

  // ─── UPDATE FORM ───
  if (isEdit && user) {
    const { register, handleSubmit, formState } = updateForm;
    return (
      <Modal title={`Kullanıcı Düzenle: ${user.email}`} onClose={onClose}>
        <form
          onSubmit={handleSubmit(onUpdateSubmit)}
          className="p-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Ad *" error={formState.errors.firstName?.message}>
              <input {...register('firstName')} className="input" />
            </Field>
            <Field label="Soyad *" error={formState.errors.lastName?.message}>
              <input {...register('lastName')} className="input" />
            </Field>
            <Field label="Telefon" error={formState.errors.phone?.message}>
              <input {...register('phone')} placeholder="05XX..." className="input" />
            </Field>
            <Field label="Durum *" error={formState.errors.status?.message}>
              <select {...register('status')} className="input">
                {Object.entries(USER_STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <p className="text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg">
            ℹ️ E-posta değiştirilemez. Şifre ve roller ayrı butonlardan güncellenir.
          </p>

          <FormFooter
            onCancel={onClose}
            isSubmitting={formState.isSubmitting}
            submitLabel="Güncelle"
          />
        </form>
      </Modal>
    );
  }

  // ─── CREATE FORM ───
  const { register, handleSubmit, formState, watch, setValue } = createForm;
  const selectedRoles = watch('roleSlugs');

  const toggleRole = (slug: string) => {
    const current = selectedRoles || [];
    setValue(
      'roleSlugs',
      current.includes(slug)
        ? current.filter((s) => s !== slug)
        : [...current, slug],
      { shouldValidate: true },
    );
  };

  return (
    <Modal title="Yeni Kullanıcı Oluştur" onClose={onClose}>
      <form onSubmit={handleSubmit(onCreateSubmit)} className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="E-posta *" error={formState.errors.email?.message} fullWidth>
            <input
              {...register('email')}
              type="email"
              placeholder="ornek@firma.com"
              className="input"
            />
          </Field>
          <Field label="Geçici Şifre *" error={formState.errors.password?.message} fullWidth>
            <input
              {...register('password')}
              type="text"
              placeholder="En az 8 karakter, 1 büyük, 1 küçük, 1 rakam"
              className="input"
            />
          </Field>
          <Field label="Ad *" error={formState.errors.firstName?.message}>
            <input {...register('firstName')} className="input" />
          </Field>
          <Field label="Soyad *" error={formState.errors.lastName?.message}>
            <input {...register('lastName')} className="input" />
          </Field>
          <Field label="Telefon" error={formState.errors.phone?.message}>
            <input {...register('phone')} placeholder="05XX..." className="input" />
          </Field>
          <Field label="Durum *" error={formState.errors.status?.message}>
            <select {...register('status')} className="input">
              {Object.entries(USER_STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Roles */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Roller *
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {availableRoles.length === 0 ? (
              <p className="text-sm text-slate-500">Roller yükleniyor...</p>
            ) : (
              availableRoles.map((role) => {
                const isSelected = selectedRoles?.includes(role.slug);
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => toggleRole(role.slug)}
                    className={`text-left p-3 rounded-lg border transition-colors ${
                      isSelected
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{role.name}</span>
                      {role.isSystem && (
                        <span className="text-[10px] uppercase tracking-wide opacity-75">
                          Sistem
                        </span>
                      )}
                    </div>
                    {role.description && (
                      <p className={`text-xs mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                        {role.description}
                      </p>
                    )}
                  </button>
                );
              })
            )}
          </div>
          {formState.errors.roleSlugs && (
            <p className="text-xs text-red-600 mt-1">
              {formState.errors.roleSlugs.message}
            </p>
          )}
        </div>

        <FormFooter
          onCancel={onClose}
          isSubmitting={formState.isSubmitting}
          submitLabel="Oluştur"
        />
      </form>
    </Modal>
  );
}

// ─── Helpers ───
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        {children}
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

function FormFooter({
  onCancel,
  isSubmitting,
  submitLabel,
}: {
  onCancel: () => void;
  isSubmitting: boolean;
  submitLabel: string;
}) {
  return (
    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
      >
        İptal
      </button>
      <button
        type="submit"
        disabled={isSubmitting}
        className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {isSubmitting ? 'Kaydediliyor...' : submitLabel}
      </button>
    </div>
  );
}