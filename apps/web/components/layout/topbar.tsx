'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { authApi } from '@/lib/api/auth';
import { toast } from 'sonner';

export function Topbar() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // logout backend hata verse bile devam
    }
    clear();
    toast.success('Çıkış yapıldı');
    router.push('/login');
  };

  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-end">
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-slate-900">{user?.fullName}</p>
          <p className="text-xs text-slate-500">{user?.roles?.[0]?.name}</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white text-sm font-bold">
          {initials}
        </div>
        <button
          onClick={handleLogout}
          className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
        >
          Çıkış
        </button>
      </div>
    </header>
  );
}