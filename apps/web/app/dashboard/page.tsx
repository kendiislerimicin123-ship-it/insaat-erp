'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { authApi } from '@/lib/api/auth';
import { tokenStorage } from '@/lib/api/client';

export default function DashboardPage() {
  const router = useRouter();
  const { user, setUser, logout } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const token = tokenStorage.getAccessToken();
    if (!token) {
      router.push('/login');
      return;
    }

    // /me ile user'ı yenile — bu hep tam ve güncel gelir
    authApi
      .getMe()
      .then((res) => {
        setUser(res.user);
        setIsReady(true);
      })
      .catch(() => {
        tokenStorage.clearTokens();
        router.push('/login');
      });
  }, [router, setUser]);

  const handleLogout = async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    try {
      await authApi.logout(refreshToken || undefined);
    } catch {
      // hatası bile olsa logout
    }
    logout();
    router.push('/login');
  };

  // Yükleniyor — user veya backend'den /me henüz gelmedi
  if (!isReady || !user || !user.roles || !user.permissions) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mb-3" />
          <p className="text-slate-600 text-sm">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className="text-xl font-bold text-slate-900">İnşaat ERP</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">
              {user.firstName} {user.lastName}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Çıkış
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Hoş geldiniz, {user.firstName}!
          </h2>
          <p className="text-slate-600 mb-6">
            İnşaat ERP sistemine başarıyla giriş yaptınız.
          </p>

          {/* User info grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide">
                E-posta
              </p>
              <p className="text-slate-900 font-medium mt-1">{user.email}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide">
                Roller
              </p>
              <p className="text-slate-900 font-medium mt-1">
                {user.roles.length > 0 ? user.roles.join(', ') : '—'}
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide">
                Tenant ID
              </p>
              <p className="text-slate-700 text-sm font-mono mt-1 truncate">
                {user.tenantId}
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide">
                Toplam İzin
              </p>
              <p className="text-slate-900 font-medium mt-1">
                {user.permissions.length} izin
              </p>
            </div>
          </div>

          {/* Permissions */}
          {user.permissions.length > 0 && (
            <div className="mt-6 bg-slate-50 rounded-lg p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">
                İzinleriniz
              </p>
              <div className="flex flex-wrap gap-2">
                {user.permissions.map((perm) => (
                  <span
                    key={perm}
                    className="text-xs bg-white border border-slate-200 px-2.5 py-1 rounded-md text-slate-700"
                  >
                    {perm}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}