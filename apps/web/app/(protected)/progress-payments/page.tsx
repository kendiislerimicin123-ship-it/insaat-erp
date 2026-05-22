'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import {
  progressPaymentsApi,
  ProgressPayment,
  PaymentStatus,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  formatCurrency,
  formatPeriod,
  formatDate,
} from '@/lib/api/progress-payments';
import { useAuthStore } from '@/stores/auth-store';
import { ProgressPaymentFormModal } from '@/components/progress-payments/progress-payment-form-modal';
import { PayModal } from '@/components/progress-payments/pay-modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export default function ProgressPaymentsPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreate = hasPermission('progress-payment.create');
  const canUpdate = hasPermission('progress-payment.update');
  const canDelete = hasPermission('progress-payment.delete');
  const canApprove = hasPermission('progress-payment.approve');
  const canPay = hasPermission('progress-payment.pay');

  const [items, setItems] = useState<ProgressPayment[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({ totalAmount: '0', amount: '0', taxAmount: '0' });
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | ''>('');
  const [periodFilter, setPeriodFilter] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<ProgressPayment | null>(null);
  const [payItem, setPayItem] = useState<ProgressPayment | null>(null);
  const [deleteItem, setDeleteItem] = useState<ProgressPayment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await progressPaymentsApi.list({
        page,
        limit,
        search: search || undefined,
        status: statusFilter || undefined,
        period: periodFilter || undefined,
      });
      setItems(response.items);
      setTotal(response.pagination.total);
      setSummary(response.summary);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          (error.response?.data as { message?: string })?.message ||
            'Hakedişler yüklenemedi',
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, statusFilter, periodFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (item: ProgressPayment) => {
    setApprovingId(item.id);
    try {
      await progressPaymentsApi.approve(item.id);
      toast.success(`Hakediş onaylandı: ${item.code}`);
      load();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          (error.response?.data as { message?: string })?.message ||
            'Onaylama başarısız',
        );
      }
    } finally {
      setApprovingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await progressPaymentsApi.remove(deleteItem.id);
      toast.success(`Hakediş silindi: ${deleteItem.code}`);
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

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hakedişler</h1>
          <p className="text-slate-600 mt-1">Toplam {total} hakediş</p>
        </div>
        {canCreate && (
          <button
            onClick={() => {
              setEditItem(null);
              setFormOpen(true);
            }}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 flex items-center gap-2"
          >
            <span>+</span>
            <span>Yeni Hakediş</span>
          </button>
        )}
      </div>

      {/* Summary Cards */}
      {total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <SummaryCard
            label="KDV Hariç Toplam"
            value={formatCurrency(summary.amount, 'TRY')}
            color="bg-slate-50"
          />
          <SummaryCard
            label="KDV Toplam"
            value={formatCurrency(summary.taxAmount, 'TRY')}
            color="bg-amber-50"
          />
          <SummaryCard
            label="Genel Toplam (KDV Dahil)"
            value={formatCurrency(summary.totalAmount, 'TRY')}
            color="bg-emerald-50"
            highlight
          />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="🔍 Kod veya açıklama ara..."
            className="input flex-1"
          />
          <input
            type="text"
            value={periodFilter}
            onChange={(e) => {
              setPeriodFilter(e.target.value);
              setPage(1);
            }}
            placeholder="Dönem (örn. 2026-05)"
            className="input md:w-40"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as PaymentStatus | '');
              setPage(1);
            }}
            className="input md:w-40"
          >
            <option value="">Tüm Durumlar</option>
            {Object.entries(PAYMENT_STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="inline-block w-6 h-6 border-3 border-slate-200 border-t-slate-900 rounded-full animate-spin mb-2" />
            <p className="text-sm">Yükleniyor...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <span className="text-5xl">💰</span>
            <p className="text-slate-600 mt-3">Henüz hakediş yok</p>
            {canCreate && (
              <button
                onClick={() => {
                  setEditItem(null);
                  setFormOpen(true);
                }}
                className="mt-4 text-sm bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800"
              >
                İlk Hakedişi Oluştur
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Kod / Dönem</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Proje</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Taşeron</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Tutar</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Durum</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Ödeme</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{p.code}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{formatPeriod(p.period)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-700">{p.project.code}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{p.project.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-700">{p.subcontractor.code}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{p.subcontractor.name}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-bold text-slate-900">
                        {formatCurrency(p.totalAmount, p.currency)}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">KDV dahil</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${PAYMENT_STATUS_COLORS[p.status]}`}
                      >
                        {PAYMENT_STATUS_LABELS[p.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {p.paidAt ? (
                        <div>
                          <p className="text-xs text-slate-700">{formatDate(p.paidAt)}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{p.paymentMethod}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canApprove && ['DRAFT', 'SUBMITTED'].includes(p.status) && (
                          <button
                            onClick={() => handleApprove(p)}
                            disabled={approvingId === p.id}
                            className="text-amber-700 hover:text-amber-800 text-xs px-2 py-1 rounded hover:bg-amber-50 disabled:opacity-50"
                          >
                            {approvingId === p.id ? '...' : 'Onayla'}
                          </button>
                        )}
                        {canPay && p.status === 'APPROVED' && (
                          <button
                            onClick={() => setPayItem(p)}
                            className="text-emerald-700 hover:text-emerald-800 text-xs px-2 py-1 rounded hover:bg-emerald-50 font-medium"
                          >
                            Öde
                          </button>
                        )}
                        {canUpdate && !['PAID', 'CANCELLED'].includes(p.status) && (
                          <button
                            onClick={() => {
                              setEditItem(p);
                              setFormOpen(true);
                            }}
                            className="text-slate-600 hover:text-slate-900 text-xs px-2 py-1 rounded hover:bg-slate-100"
                          >
                            Düzenle
                          </button>
                        )}
                        {canDelete && p.status !== 'PAID' && (
                          <button
                            onClick={() => setDeleteItem(p)}
                            className="text-red-600 hover:text-red-700 text-xs px-2 py-1 rounded hover:bg-red-50"
                          >
                            Sil
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
            <p className="text-sm text-slate-600">Sayfa {page} / {totalPages}</p>
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

      <ProgressPaymentFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={load}
        payment={editItem}
      />
      <PayModal
        open={!!payItem}
        payment={payItem}
        onClose={() => setPayItem(null)}
        onSuccess={load}
      />
      <ConfirmDialog
        open={!!deleteItem}
        title="Hakedişi sil"
        message={`'${deleteItem?.code}' kodlu hakedişi silmek üzeresiniz.`}
        confirmText="Sil"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteItem(null)}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
  highlight,
}: {
  label: string;
  value: string;
  color: string;
  highlight?: boolean;
}) {
  return (
    <div className={`${color} rounded-xl border border-slate-200 p-4`}>
      <p className="text-xs text-slate-600 uppercase tracking-wide">{label}</p>
      <p
        className={`mt-2 font-bold ${highlight ? 'text-2xl text-emerald-700' : 'text-xl text-slate-900'}`}
      >
        {value}
      </p>
    </div>
  );
}