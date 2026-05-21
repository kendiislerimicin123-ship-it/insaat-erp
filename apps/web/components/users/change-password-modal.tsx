'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { toast } from 'sonner';
import { usersApi, User } from '@/lib/api/users';

const schema = z.object({
  newPassword: z
    .string()
    .min(8, 'En az 8 karakter')
    .max(100)
    .regex(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '1 büyük, 1 küçük, 1 rakam içermeli'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Şifreler eşleşmiyor',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ChangePasswordModal({ open, user, onClose, onSuccess }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) reset({ newPassword: '', confirmPassword: '' });
  }, [open, reset]);

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    try {
      await usersApi.changePassword(user.id, { newPassword: data.newPassword });
      toast.success(`Şifre değiştirildi: ${user.email}`);
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

  if (!open || !user) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Şifre Değiştir</h2>
          <p className="text-sm text-slate-500 mt-0.5">{user.email}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Yeni Şifre *
            </label>
            <input
              type="text"
              {...register('newPassword')}
              placeholder="En az 8 karakter"
              className="input"
            />
            {errors.newPassword && (
              <p className="text-xs text-red-600 mt-1">{errors.newPassword.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Yeni Şifre (Tekrar) *
            </label>
            <input
              type="text"
              {...register('confirmPassword')}
              className="input"
            />
            {errors.confirmPassword && (
              <p className="text-xs text-red-600 mt-1">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg text-xs text-amber-800">
            ⚠️ Şifre değişince kullanıcının tüm aktif oturumları sonlandırılacak.
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
              {isSubmitting ? 'Kaydediliyor...' : 'Şifreyi Değiştir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}