'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import {
  expensesApi,
  Expense,
  ExpenseCategory,
  ExpenseStatus,
  ExpenseStats,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_ICONS,
  EXPENSE_CATEGORY_COLORS,
  EXPENSE_STATUS_LABELS,
  EXPENSE_STATUS_COLORS,
  PAYMENT_METHOD_LABELS,
  formatExpenseAmount,
  formatExpenseDate,
} from '@/lib/api/expenses';
import { projectsApi } from '@/lib/api/projects';
import { useAuthStore } from '@/stores/auth-store';
import { ExpenseFormModal } from '@/components/expenses/expense-form-modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export default function ExpensesPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreate = hasPermission('expense.create');
  const canUpdate = hasPermission('expense.update');
  const canDelete = hasPermission('expense.delete');

  const [items, setItems] = useState<Expense[]>([]);
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [projects, setProjects] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<{ totalAmount: string; totalVat: string; totalNet: string } | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(30);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | ''>('');
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | ''>('');
  const [projectFilter, setProjectFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Expense | null>(null);
  const [deleteItem, setDeleteItem] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [listData, statsData] = await Promise.all([
        expensesApi.list({
          page,
          limit,
          search: search || undefined,
          category: categoryFilter || undefined,
          status: statusFilter || undefined,
          projectId: projectFilter || undefined,
          from: fromDate || undefined,
          to: toDate || undefined,
        }),
        expensesApi.getStats(fromDate || undefined, toDate || undefined),
      ]);
      setItems(listData.items);
      setTotal(listData.pagination.total);
      setSummary(listData.summary);
      setStats(statsData);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          (error.response?.data as { message?: string })?.message ||
            'Giderler yüklenemedi',
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, categoryFilter, statusFilter, projectFilter, fromDate, toDate]);

  useEffect(() => {
    projectsApi.listAll().then(setProjects).catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetFilters = () => {
    setSearch('');
    setCategoryFilter('');
    setStatusFilter('');
    setProjectFilter('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const hasActiveFilters =
    search || categoryFilter || statusFilter || projectFilter || fromDate || toDate;

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await expensesApi.remove(deleteItem.id);
      toast.success(`Gider silindi: ${deleteItem.code}`);
      setDeleteItem(null);
      load();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          (error.response?.data as { message?: string })?.message || 'Silme başarısız',
        );
      }
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(total / limit);
  const maxCategoryAmount = stats?.byCategory[0]?.amount
    ? parseFloat(stats.byCategory[0].amount)
    : 1;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Genel Giderler</h1>
          <p className="text-slate-600 mt-1">
            Tüm gider kayıtları (ofis, araç, SGK, ekipman vb.)
          </p>
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
            <span>Yeni Gider</span>
          </button>
        )}
      </div>

      {/* Stat Summary */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <SummaryCard
            label="Toplam Gider"
            value={formatExpenseAmount(stats.totalAmount)}
            sub={`${stats.totalCount} kayıt`}
            color="text-slate-900"
            iconBg="bg-blue-100 text-blue-700"
            icon="💰"
          />
          <SummaryCard
            label="Net Toplam"
            value={formatExpenseAmount(stats.totalNet)}
            sub="KDV hariç"
            color="text-emerald-700"
            iconBg="bg-emerald-100 text-emerald-700"
            icon="💵"
          />
          <SummaryCard
            label="KDV Tutarı"
            value={formatExpenseAmount(stats.totalVat)}
            sub="Toplam KDV"
            color="text-amber-700"
            iconBg="bg-amber-100 text-amber-700"
            icon="📊"
          />
          <SummaryCard
            label="Kategori Sayısı"
            value={`${stats.byCategory.length}`}
            sub="Aktif kategori"
            color="text-purple-700"
            iconBg="bg-purple-100 text-purple-700"
            icon="🏷️"
          />
        </div>
      )}

      {/* Kategori Dağılımı (Bar Chart) */}
      {stats && stats.byCategory.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">
              📊 Kategori Dağılımı
            </h3>
            <p className="text-xs text-slate-500">{stats.totalCount} toplam kayıt</p>
          </div>
          <div className="space-y-2">
            {stats.byCategory.map((c) => {
              const amount = parseFloat(c.amount);
              const percent = (amount / maxCategoryAmount) * 100;
              const totalPercent = parseFloat(stats.totalAmount) > 0
                ? (amount / parseFloat(stats.totalAmount)) * 100
                : 0;
              return (
                <div key={c.category} className="flex items-center gap-3">
                  <div className="w-44 flex items-center gap-2 flex-shrink-0">
                    <span className="text-base">
                      {EXPENSE_CATEGORY_ICONS[c.category]}
                    </span>
                    <span className="text-sm text-slate-700 truncate">
                      {EXPENSE_CATEGORY_LABELS[c.category]}
                    </span>
                  </div>
                  <div className="flex-1 h-7 bg-slate-100 rounded-md overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-slate-700 to-slate-900 rounded-md transition-all"
                      style={{ width: `${percent}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-end pr-2">
                      <span className="text-xs font-bold text-slate-900">
                        {totalPercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="w-32 text-right flex-shrink-0">
                    <p className="text-sm font-bold text-slate-900">
                      {formatExpenseAmount(amount)}
                    </p>
                    <p className="text-xs text-slate-500">{c.count} kayıt</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Panel */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700">🔍 Filtreler</h3>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs text-slate-600 hover:text-slate-900"
            >
              ✕ Filtreleri Temizle
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="🔍 Kod, açıklama, fatura..."
            className="input lg:col-span-2"
          />
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value as ExpenseCategory | '');
              setPage(1);
            }}
            className="input"
          >
            <option value="">Tüm Kategoriler</option>
            {(Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]).map((key) => (
              <option key={key} value={key}>
                {EXPENSE_CATEGORY_ICONS[key]} {EXPENSE_CATEGORY_LABELS[key]}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as ExpenseStatus | '');
              setPage(1);
            }}
            className="input"
          >
            <option value="">Tüm Durumlar</option>
            {Object.entries(EXPENSE_STATUS_LABELS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
          <select
            value={projectFilter}
            onChange={(e) => {
              setProjectFilter(e.target.value);
              setPage(1);
            }}
            className="input lg:col-span-2"
          >
            <option value="">Tüm Projeler</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {p.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            className="input"
            title="Başlangıç tarihi"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            className="input"
            title="Bitiş tarihi"
          />
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
            <span className="text-5xl">💸</span>
            <p className="text-slate-600 mt-3">
              {hasActiveFilters
                ? 'Bu filtrelere uyan gider bulunamadı'
                : 'Henüz gider kaydı yok'}
            </p>
            {canCreate && !hasActiveFilters && (
              <button
                onClick={() => {
                  setEditItem(null);
                  setFormOpen(true);
                }}
                className="mt-4 text-sm bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800"
              >
                İlk Gideri Oluştur
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3 text-left font-semibold text-slate-700">Kod / Tarih</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-700">Kategori</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-700">Açıklama</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-700">İlişki</th>
                  <th className="px-3 py-3 text-right font-semibold text-slate-700">Net</th>
                  <th className="px-3 py-3 text-right font-semibold text-slate-700">KDV</th>
                  <th className="px-3 py-3 text-right font-semibold text-slate-700">Toplam</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-700">Ödeme</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-700">Durum</th>
                  <th className="px-3 py-3 text-right font-semibold text-slate-700">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <p className="font-medium text-slate-900 font-mono text-xs">{e.code}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{formatExpenseDate(e.date)}</p>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${EXPENSE_CATEGORY_COLORS[e.category]}`}
                      >
                        <span>{EXPENSE_CATEGORY_ICONS[e.category]}</span>
                        <span>{EXPENSE_CATEGORY_LABELS[e.category]}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2 max-w-xs">
                      <p className="text-slate-900 truncate">{e.description}</p>
                      {e.invoiceNo && (
                        <p className="text-xs text-slate-500 font-mono">Fat: {e.invoiceNo}</p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {e.project && (
                        <p className="text-slate-700">
                          🏗️ <span className="font-mono">{e.project.code}</span>
                        </p>
                      )}
                      {e.contact && (
                        <p className="text-slate-700">
                          👥 <span className="font-mono">{e.contact.code}</span>
                        </p>
                      )}
                      {e.subcontractor && (
                        <p className="text-slate-700">
                          🔧 <span className="font-mono">{e.subcontractor.code}</span>
                        </p>
                      )}
                      {!e.project && !e.contact && !e.subcontractor && (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700 whitespace-nowrap">
                      {formatExpenseAmount(e.amount, e.currency)}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-500 whitespace-nowrap text-xs">
                      {parseFloat(e.vatRate) > 0
                        ? `${e.vatRate}% (${formatExpenseAmount(e.vatAmount, e.currency)})`
                        : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatExpenseAmount(e.totalAmount, e.currency)}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {e.paymentMethod ? PAYMENT_METHOD_LABELS[e.paymentMethod] : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${EXPENSE_STATUS_COLORS[e.status]}`}
                      >
                        {EXPENSE_STATUS_LABELS[e.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {canUpdate && (
                          <button
                            onClick={() => {
                              setEditItem(e);
                              setFormOpen(true);
                            }}
                            className="text-slate-600 hover:text-slate-900 text-xs px-2 py-1 rounded hover:bg-slate-100"
                          >
                            Düzenle
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setDeleteItem(e)}
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
              {summary && (
                <tfoot className="bg-slate-50 border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={4} className="px-3 py-3 text-xs font-bold text-slate-700">
                      SAYFA TOPLAMI ({items.length} kayıt)
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatExpenseAmount(summary.totalNet)}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-700 whitespace-nowrap">
                      {formatExpenseAmount(summary.totalVat)}
                    </td>
                    <td className="px-3 py-3 text-right text-lg font-bold text-emerald-700 whitespace-nowrap">
                      {formatExpenseAmount(summary.totalAmount)}
                    </td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
            <p className="text-sm text-slate-600">
              Sayfa {page} / {totalPages} ({total} toplam kayıt)
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

      <ExpenseFormModal
        open={formOpen}
        expense={editItem}
        onClose={() => setFormOpen(false)}
        onSuccess={load}
      />
      <ConfirmDialog
        open={!!deleteItem}
        title="Gideri sil"
        message={`'${deleteItem?.code}' kodlu gideri silmek üzeresiniz.`}
        confirmText="Sil"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteItem(null)}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  color,
  iconBg,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
  iconBg: string;
  icon: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
          <p className={`text-xl font-bold mt-1 truncate ${color}`}>{value}</p>
          <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ml-2 ${iconBg}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}