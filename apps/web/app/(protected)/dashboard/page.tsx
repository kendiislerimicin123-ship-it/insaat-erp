'use client';

import { useAuthStore } from '@/stores/auth-store';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Anasayfa</h1>
        <p className="text-slate-600 mt-1">Hoş geldiniz, {user.firstName}!</p>
      </div>

      {/* İstatistik Kartları — şimdilik placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Aktif Projeler" value="—" icon="🏗️" />
        <StatCard label="Kullanıcılar" value="—" icon="👥" />
        <StatCard label="Bu Ay Eylem" value="—" icon="📊" />
      </div>

      {/* User Info Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Hesap Bilgileri</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoBox label="E-posta" value={user.email} />
          <InfoBox label="Roller" value={user.roles.join(', ') || '—'} />
          <InfoBox label="Tenant ID" value={user.tenantId} mono />
          <InfoBox label="Toplam İzin" value={`${user.permissions.length} izin`} />
        </div>

        {user.permissions.length > 0 && (
          <div className="mt-6">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">
              İzinleriniz
            </p>
            <div className="flex flex-wrap gap-2">
              {user.permissions.map((perm) => (
                <span
                  key={perm}
                  className="text-xs bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md text-slate-700"
                >
                  {perm}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}

function InfoBox({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-slate-50 rounded-lg p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p
        className={`text-slate-900 mt-1 ${mono ? 'font-mono text-sm break-all' : 'font-medium'}`}
      >
        {value}
      </p>
    </div>
  );
}