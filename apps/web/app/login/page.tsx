'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { authApi } from '@/lib/api/auth';
import { tokenStorage } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';

const loginSchema = z.object({
  companySlug: z
    .string()
    .min(2, 'Firma slug en az 2 karakter olmalı')
    .regex(/^[a-z0-9-]+$/, 'Sadece küçük harf, rakam ve tire kullanın'),
  email: z.string().email('Geçerli bir e-posta adresi girin'),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalı'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      companySlug: 'acme-insaat',
      email: 'ahmet@acme.com',
      password: 'Test1234!',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setApiError(null);
    setIsSubmitting(true);
    try {
      const response = await authApi.login(data);
      tokenStorage.setTokens(response.accessToken, response.refreshToken);
      setUser(response.user);
      router.push('/dashboard');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setApiError(
          (error.response?.data as { message?: string })?.message ||
            'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.',
        );
      } else {
        setApiError('Beklenmeyen bir hata oluştu.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">İnşaat ERP</h1>
          <p className="text-slate-600 mt-2">Hesabınıza giriş yapın</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Firma Slug */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Firma Kodu
            </label>
            <input
              type="text"
              {...register('companySlug')}
              placeholder="firma-adi"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
            {errors.companySlug && (
              <p className="text-sm text-red-600 mt-1">
                {errors.companySlug.message}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              E-posta
            </label>
            <input
              type="email"
              {...register('email')}
              placeholder="ornek@firma.com"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
            {errors.email && (
              <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Şifre
            </label>
            <input
              type="password"
              {...register('password')}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
            {errors.password && (
              <p className="text-sm text-red-600 mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* API Error */}
          {apiError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {apiError}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-6">
          Test hesabı: <code className="bg-slate-100 px-1.5 py-0.5 rounded">ahmet@acme.com / Test1234!</code>
        </p>
      </div>
    </div>
  );
}