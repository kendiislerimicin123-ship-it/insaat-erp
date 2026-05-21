'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import {
  projectsApi,
  ProjectStats,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  formatCurrency,
  formatDate,
} from '@/lib/api/projects';
import { usersApi, UserStats } from '@/lib/api/users';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [projectStats, setProjectStats] = useState<ProjectStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadStats = async () => {
      try {
        const promises: Array<Promise<unknown>> = [];

        if (hasPermission('project.read')) {
          promises.push(
            projectsApi.getStats().then((data) => setProjectStats(data)),
          );
        }
        if (hasPermission('user.read')) {
          promises.push(usersApi.getStats().then((data) => setUserStats(data)));
        }

        await Promise.all(promises);
      } catch {
        // Hata olsa bile sayfa açılsın
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [user, hasPermission]);

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Anasayfa</h1>
        <p className="text-slate-600 mt-1">Hoş geldiniz, {user.firstName}!</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Toplam Proje"
          value={loading ? '...' : (projectStats?.total ?? 0).toString()}
          icon="🏗️"
          color="bg-blue-50 text-blue-700"
        />
        <StatCard
          label="Aktif Proje"
          value={loading ? '...' : (projectStats?.byStatus.active ?? 0).toString()}
          icon="🟢"
          color="bg-emerald-50 text-emerald-700"
        />
        <StatCard
          label="Kullanıcı"
          value={loading ? '...' : (userStats?.total ?? 0).toString()}
          icon="👥"
          color="bg-purple-50 text-purple-700"
        />
        <StatCard
          label="Bu Ay Yeni"
          value={
            loading
              ? '...'
              : (
                  (projectStats?.thisMonthCreated ?? 0) +
                  (userStats?.thisMonthCreated ?? 0)
                ).toString()
          }
          icon="✨"
          color="bg-amber-50 text-amber-700"
        />
      </div>

      {/* Recent Projects */}
      {hasPermission('project.read') && projectStats && (
        <div className="bg-white rounded-2xl border border-slate-200 mb-6">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Son Projeler</h2>
            <Link
              href="/projects"
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              Tümünü gör →
            </Link>
          </div>

          {projectStats.recentProjects.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <span className="text-4xl">🏗️</span>
              <p className="mt-2 text-sm">Henüz proje yok</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {projectStats.recentProjects.map((p) => (
                <div
                  key={p.id}
                  className="px-6 py-3 flex items-center justify-between hover:bg-slate-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-slate-600">
                        {p.code}
                      </span>
                      <span className="text-slate-900 font-medium">{p.name}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${PROJECT_STATUS_COLORS[p.status]}`}
                      >
                        {PROJECT_STATUS_LABELS[p.status]}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {p.city ?? '—'} • {formatDate(p.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">
                      {formatCurrency(p.contractAmount, p.currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Status Breakdown */}
      {hasPermission('project.read') && projectStats && projectStats.total > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            Proje Durumu Dağılımı
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MiniStat
              label="Planlama"
              value={projectStats.byStatus.planning}
              color="bg-slate-100 text-slate-700"
            />
            <MiniStat
              label="Aktif"
              value={projectStats.byStatus.active}
              color="bg-emerald-100 text-emerald-700"
            />
            <MiniStat
              label="Beklemede"
              value={projectStats.byStatus.onHold}
              color="bg-amber-100 text-amber-700"
            />
            <MiniStat
              label="Tamamlandı"
              value={projectStats.byStatus.completed}
              color="bg-blue-100 text-blue-700"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="text-center">
      <div className={`text-2xl font-bold rounded-lg py-3 ${color}`}>
        {value}
      </div>
      <p className="text-xs text-slate-600 mt-1">{label}</p>
    </div>
  );
}