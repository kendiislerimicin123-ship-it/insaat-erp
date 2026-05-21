'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import {
  auditApi,
  AuditLog,
  AuditAction,
  AUDIT_ACTION_LABELS,
  AUDIT_ACTION_COLORS,
  AUDIT_RESOURCE_LABELS,
  formatDateTime,
} from '@/lib/api/audit';
import { AuditDetailModal } from '@/components/audit/audit-detail-modal';

const RESOURCE_OPTIONS = ['project', 'user', 'role', 'permission', 'tenant', 'auth'];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [isLoading, setIsLoading] = useState(true);

  const [actionFilter, setActionFilter] = useState<AuditAction | ''>('');
  const [resourceFilter, setResourceFilter] = useState<string>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await auditApi.list({
        page,
        limit,
        action: actionFilter || undefined,
        resource: resourceFilter || undefined,
        from: fromDate ? new Date(fromDate).toISOString() : undefined,
        to: toDate
          ? new Date(toDate + 'T23:59:59').toISOString()
          : undefined,
      });
      setLogs(response.items);
      setTotal(response.pagination.total);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          (error.response?.data as { message?: string })?.message ||
            'Kayıtlar yüklenemedi',
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, actionFilter, resourceFilter, fromDate, toDate]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleResetFilters = () => {
    setActionFilter('');
    setResourceFilter('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Denetim Kayıtları</h1>
        <p className="text-slate-600 mt-1">
          Sistemde yapılan tüm işlemlerin kaydı • Toplam {total} kayıt
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide block mb-1">
              İşlem
            </label>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value as AuditAction | '');
                setPage(1);
              }}
              className="input"
            >
              <option value="">Tümü</option>
              {Object.entries(AUDIT_ACTION_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide block mb-1">
              Kaynak
            </label>
            <select
              value={resourceFilter}
              onChange={(e) => {
                setResourceFilter(e.target.value);
                setPage(1);
              }}
              className="input"
            >
              <option value="">Tümü</option>
              {RESOURCE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {AUDIT_RESOURCE_LABELS[r] ?? r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide block mb-1">
              Başlangıç
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="input"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide block mb-1">
              Bitiş
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="input"
            />
          </div>
        </div>

        {(actionFilter || resourceFilter || fromDate || toDate) && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={handleResetFilters}
              className="text-xs text-slate-600 hover:text-slate-900 underline"
            >
              Filtreleri temizle
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="inline-block w-6 h-6 border-3 border-slate-200 border-t-slate-900 rounded-full animate-spin mb-2" />
            <p className="text-sm">Yükleniyor...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <span className="text-5xl">📋</span>
            <p className="text-slate-600 mt-3">Bu filtreyle kayıt bulunamadı</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Tarih</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">İşlem</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Kaynak</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Kayıt ID</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">IP</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${AUDIT_ACTION_COLORS[log.action]}`}
                      >
                        {AUDIT_ACTION_LABELS[log.action]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {AUDIT_RESOURCE_LABELS[log.resource] ?? log.resource}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 font-mono">
                      {log.resourceId ? `${log.resourceId.slice(0, 12)}...` : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-mono text-xs">
                      {log.ipAddress ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-slate-600 hover:text-slate-900 text-xs px-2 py-1 rounded hover:bg-slate-100"
                      >
                        Detay
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
            <p className="text-sm text-slate-600">
              Sayfa {page} / {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                Önceki
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                Sonraki
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <AuditDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
}