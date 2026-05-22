'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import {
  chequesApi,
  Cheque,
  ChequeKind,
  ChequeDirection,
  ChequeStatus,
  ChequeStats,
  CHEQUE_KIND_LABELS,
  CHEQUE_DIRECTION_LABELS,
  CHEQUE_DIRECTION_COLORS,
  CHEQUE_STATUS_LABELS,
  CHEQUE_STATUS_COLORS,
  formatChequeAmount,
  formatChequeDate,
  formatMonth,
  daysUntilDue,
} from '@/lib/api/cheques';
import { useAuthStore } from '@/stores/auth-store';
import { ChequeFormModal } from '@/components/cheques/cheque-form-modal';
import { ChequeStatusModal } from '@/components/cheques/cheque-status-modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export default function ChequesPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreate = hasPermission('cheque.create');
  const canUpdate = hasPermission('cheque.update');
  const canDelete = hasPermission('cheque.delete');

  const [items, setItems] = useState<Cheque[]>([]);
  const [stats, setStats] = useState<ChequeStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [directionFilter, setDirectionFilter] = useState<ChequeDirection | ''>('');
  const [kindFilter, setKindFilter] = useState<ChequeKind | ''>('');
  const [statusFilter, setStatusFilter] = useState<ChequeStatus | ''>('');

  const [formOpen, setFormOpen] = useState(false);
  const [initialDirection, setInitialDirection] = useState<ChequeDirection>('INCOMING');
  const [statusModalItem, setStatusModalItem] = useState<Cheque | null>(null);
  const [deleteItem, setDeleteItem] = useState<Cheque | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [list, statsData] = await Promise.all([
        chequesApi.list({
          direction: directionFilter || undefined,
          kind: kindFilter || undefined,
          status: statusFilter || undefined,
          limit: 100,
        }),
        chequesApi.getStats(),
      ]);
      setItems(list.items);
      setStats(statsData);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          (error.response?.data as { message?: string })?.message ||
            'Çek/Senet yüklenemedi',
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [directionFilter, kindFilter, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await chequesApi.remove(deleteItem.id);
      toast.success(`Silindi: ${deleteItem.chequeNo}`);
      setDeleteItem(null);
      load();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          (error.response?.data as { message?: string })?.message ||
            'Silme başarısız',
        );
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Çek / Senet</h1>
          <p className="text-slate-600 mt-1">Vade takibi ve portföy yönetimi</p>
        </div>
        {canCreate && (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setInitialDirection('INCOMING');
                setFormOpen(true);
              }}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 flex items-center gap-2"
            >
              <span>⬇️</span>
              <span>Gelen</span>
            </button>
            <button
              onClick={() => {
                setInitialDirection('OUTGOING');
                setFormOpen(true);
              }}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <span>⬆️</span>
              <span>Verilen</span>
            </button>
          </div>
        )}
      </div>

      {/* Vade Takvimi - Dashboard */}
      {stats && (
        <>
          {/* Kritik uyarılar */}
          {(parseInt(stats.overdue.incoming.count.toString()) > 0 ||
            parseInt(stats.overdue.outgoing.count.toString()) > 0) && (
            <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 mb-4">
              <p className="text-sm font-bold text-red-800 mb-2">
                ⚠️ VADESI GEÇMIŞ ÇEKLER/SENETLER
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-red-700">Gelen (Tahsil bekleyen)</p>
                  <p className="text-lg font-bold text-red-700">
                    {stats.overdue.incoming.count} adet •{' '}
                    {formatChequeAmount(stats.overdue.incoming.total)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-red-700">Verilen (Ödenmesi geciken)</p>
                  <p className="text-lg font-bold text-red-700">
                    {stats.overdue.outgoing.count} adet •{' '}
                    {formatChequeAmount(stats.overdue.outgoing.total)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Ana Özet Kartlar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Gelen Portföy */}
            <div className="bg-white rounded-2xl border-2 border-emerald-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-wide">
                  ⬇️ Gelen Portföy
                </h3>
                <span className="text-xs text-slate-500">
                  Toplam {stats.counts.totalIncoming} kayıt
                </span>
              </div>
              <p className="text-2xl font-bold text-emerald-700">
                {formatChequeAmount(stats.portfolio.incoming.total)}
              </p>
              <p className="text-sm text-slate-600 mt-1">
                {stats.portfolio.incoming.count} adet aktif çek/senet
              </p>
              <div className="mt-3 pt-3 border-t border-emerald-100">
                <p className="text-xs text-slate-500 uppercase tracking-wide">
                  Önümüzdeki 30 gün
                </p>
                <p className="text-sm font-semibold text-slate-700 mt-1">
                  {stats.upcoming30Days.incoming.count} adet •{' '}
                  {formatChequeAmount(stats.upcoming30Days.incoming.total)}
                </p>
              </div>
            </div>

            {/* Verilen Tedavül */}
            <div className="bg-white rounded-2xl border-2 border-red-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-red-700 uppercase tracking-wide">
                  ⬆️ Verilen Tedavül
                </h3>
                <span className="text-xs text-slate-500">
                  Toplam {stats.counts.totalOutgoing} kayıt
                </span>
              </div>
              <p className="text-2xl font-bold text-red-700">
                {formatChequeAmount(stats.portfolio.outgoing.total)}
              </p>
              <p className="text-sm text-slate-600 mt-1">
                {stats.portfolio.outgoing.count} adet ödeme bekleyen
              </p>
              <div className="mt-3 pt-3 border-t border-red-100">
                <p className="text-xs text-slate-500 uppercase tracking-wide">
                  Önümüzdeki 30 gün
                </p>
                <p className="text-sm font-semibold text-slate-700 mt-1">
                  {stats.upcoming30Days.outgoing.count} adet •{' '}
                  {formatChequeAmount(stats.upcoming30Days.outgoing.total)}
                </p>
              </div>
            </div>
          </div>

          {/* Aylık Vade Takvimi */}
          {stats.monthlyDistribution.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">
                📅 Aylık Vade Takvimi (Önümüzdeki 6 Ay)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {stats.monthlyDistribution.map((m) => (
                  <div key={m.month} className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-slate-700">
                      {formatMonth(m.month)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{m.count} adet</p>
                    {parseFloat(m.incoming) > 0 && (
                      <p className="text-xs text-emerald-700 font-medium mt-1">
                        ⬇️ {formatChequeAmount(m.incoming)}
                      </p>
                    )}
                    {parseFloat(m.outgoing) > 0 && (
                      <p className="text-xs text-red-700 font-medium mt-0.5">
                        ⬆️ {formatChequeAmount(m.outgoing)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <select
            value={directionFilter}
            onChange={(e) => setDirectionFilter(e.target.value as ChequeDirection | '')}
            className="input md:w-48"
          >
            <option value="">Tüm Yönler</option>
            <option value="INCOMING">⬇️ Gelen</option>
            <option value="OUTGOING">⬆️ Verilen</option>
          </select>
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value as ChequeKind | '')}
            className="input md:w-40"
          >
            <option value="">Tüm Türler</option>
            <option value="CHEQUE">📋 Çek</option>
            <option value="PROMISSORY_NOTE">📜 Senet</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ChequeStatus | '')}
            className="input md:w-48"
          >
            <option value="">Tüm Durumlar</option>
            {Object.entries(CHEQUE_STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Liste */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="inline-block w-6 h-6 border-3 border-slate-200 border-t-slate-900 rounded-full animate-spin mb-2" />
            <p className="text-sm">Yükleniyor...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <span className="text-5xl">📋</span>
            <p className="text-slate-600 mt-3">Henüz çek/senet yok</p>
            {canCreate && (
              <button
                onClick={() => {
                  setInitialDirection('INCOMING');
                  setFormOpen(true);
                }}
                className="mt-4 text-sm bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800"
              >
                İlk Kaydı Ekle
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Tür / Yön</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">No / Banka</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Cari</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Tutar</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Vade</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Durum</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((c) => {
                  const days = daysUntilDue(c.dueDate);
                  const isOverdue =
                    days < 0 &&
                    ['PORTFOLIO', 'DEPOSITED', 'ENDORSED'].includes(c.status);
                  const isUpcoming =
                    days >= 0 &&
                    days < 7 &&
                    ['PORTFOLIO', 'DEPOSITED', 'ENDORSED'].includes(c.status);
                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-slate-50 ${isOverdue ? 'bg-red-50/40' : isUpcoming ? 'bg-amber-50/40' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">
                          {c.kind === 'CHEQUE' ? '📋' : '📜'} {CHEQUE_KIND_LABELS[c.kind]}
                        </p>
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium mt-1 ${CHEQUE_DIRECTION_COLORS[c.direction]}`}
                        >
                          {c.direction === 'INCOMING' ? '⬇️' : '⬆️'} {CHEQUE_DIRECTION_LABELS[c.direction]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-mono text-slate-900">{c.chequeNo}</p>
                        {c.bankName && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {c.bankName}
                            {c.bankBranch && ` / ${c.bankBranch}`}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-900">{c.contact?.name ?? '—'}</p>
                        <p className="text-xs text-slate-500">{c.contact?.code}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">
                        {formatChequeAmount(c.amount, c.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-700">{formatChequeDate(c.dueDate)}</p>
                        {['PORTFOLIO', 'DEPOSITED', 'ENDORSED'].includes(c.status) && (
                          <p
                            className={`text-xs mt-0.5 ${
                              days < 0
                                ? 'text-red-700 font-bold'
                                : days < 7
                                  ? 'text-amber-700'
                                  : 'text-slate-500'
                            }`}
                          >
                            {days < 0 && `⚠️ ${Math.abs(days)} gün geçti`}
                            {days === 0 && '⚡ Bugün!'}
                            {days > 0 && `${days} gün kaldı`}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${CHEQUE_STATUS_COLORS[c.status]}`}
                        >
                          {CHEQUE_STATUS_LABELS[c.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canUpdate && (
                            <button
                              onClick={() => setStatusModalItem(c)}
                              className="text-blue-700 hover:text-blue-800 text-xs px-2 py-1 rounded hover:bg-blue-50"
                            >
                              🔄 Durum
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => setDeleteItem(c)}
                              className="text-red-600 hover:text-red-700 text-xs px-2 py-1 rounded hover:bg-red-50"
                            >
                              Sil
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ChequeFormModal
        open={formOpen}
        initialDirection={initialDirection}
        onClose={() => setFormOpen(false)}
        onSuccess={load}
      />
      <ChequeStatusModal
        open={!!statusModalItem}
        cheque={statusModalItem}
        onClose={() => setStatusModalItem(null)}
        onSuccess={load}
      />
      <ConfirmDialog
        open={!!deleteItem}
        title="Çek/Senet sil"
        message={`'${deleteItem?.chequeNo}' numaralı kaydı silmek üzeresiniz.`}
        confirmText="Sil"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteItem(null)}
      />
    </div>
  );
}