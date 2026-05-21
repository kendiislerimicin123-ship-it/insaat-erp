'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { authApi } from '@/lib/api/auth';
import { tokenStorage } from '@/lib/api/client';

/**
 * Korunan sayfalar için kullanılır.
 * Token yoksa → /login'e atar.
 * Token varsa → /me ile fresh user yükler, store'a yazar.
 * Hata olursa → token temizler, /login'e atar.
 */
export function useAuthGuard() {
  const router = useRouter();
  const { user, setUser, logout } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const token = tokenStorage.getAccessToken();

    if (!token) {
      router.push('/login');
      return;
    }

    authApi
      .getMe()
      .then((res) => {
        setUser(res.user);
        setIsReady(true);
      })
      .catch(() => {
        tokenStorage.clearTokens();
        logout();
        router.push('/login');
      });
  }, [router, setUser, logout]);

  return { user, isReady };
}