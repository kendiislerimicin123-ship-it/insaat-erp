'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import {
  subcontractorsApi,
  Subcontractor,
  SubcontractorCategory,
  SubcontractorStatus,
  SUBCONTRACTOR_CATEGORY_LABELS,
  SUBCONTRACTOR_STATUS_LABELS,
  SUBCONTRACTOR_STATUS_COLORS,
} from '@/lib/api/subcontractors';
import { useAuthStore } from '@/stores/auth-store';
import { SubcontractorFormModal } from '@/components/subcontractors/subcontractor-form-modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export default function SubcontractorsPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreate = hasPermission('subcontractor.create');
  const canUpdate = hasPermission('subcontractor.update');
  const canDelete = hasPermission('subcontractor.delete');

  const [items, setItems] = useState<Subcontractor[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [isLoading, setIsLoading] = useState(true);

  const [categoryFilter, setCategoryFilter] = useState<SubcontractorCategory | ''>('');
  const [statusFilter, setStatusFilter] = useState<SubcontractorStatus | ''>('');

  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Subcontractor | null>(null);
  const [deleteItem, setDeleteItem] = useState<Subcontractor | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await subcontractorsApi.list({
        page,
        limit,
        category: categoryFilter || undefined,
        status: statusFilter || undefined,
      });
      setItems(data.items);
      setTotal(data.pagination.total);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          (error.response?.data as { message?: string })?.message ||
            'Taşeronlar yüklenemedi',
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, categoryFilter, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDeleteConfirm = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await subcontractorsApi.remove(deleteItem.id);
      toast.success(`Taşeron silindi: ${deleteItem.code}`);
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
          <h1 className="text-2xl font-bold text-slate-900">Taşeronlar</h1>
          <p className="text-slate-600 mt-1">Toplam {total} taşeron</p>
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
            <span>Yeni Taşeron</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value as SubcontractorCategory | '');
              setPage(1);
            }}
            className="input md:w-56"
          >
            <option value="">Tüm Kategoriler</option>
            {Object.entries(SUBCONTRACTOR_CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as SubcontractorStatus | '');
              setPage(1);
            }}
            className="input md:w-40"
          >
            <option value="">Tüm Durumlar</option>
            {Object.entries(SUBCONTRACTOR_STATUS_LABELS).map(([key, label]) => (
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
            <span className="text-5xl">🔧</span>
            <p className="text-slate-600 mt-3">Henüz taşeron yok</p>
            {canCreate && (
              <button
                onClick={() => {
                  setEditItem(null);
                  setFormOpen(true);
                }}
                className="mt-4 text-sm bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800"
              >
                İlk Taşeronu Oluştur
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Kod</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Firma</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Kategori</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Yetkili</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Telefon</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Şehir</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Durum</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{s.code}</td>
                    <td className="px-4 py-3">
                      <p className="text-slate-900">{s.name}</p>
                      {s.taxNumber && (
                        <p className="text-xs text-slate-500 mt-0.5">V.No: {s.taxNumber}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {SUBCONTRACTOR_CATEGORY_LABELS[s.category]}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{s.contactPerson ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{s.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{s.city ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${SUBCONTRACTOR_STATUS_COLORS[s.status]}`}
                      >
                        {SUBCONTRACTOR_STATUS_LABELS[s.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/subcontractors/${s.id}`}
                          className="text-blue-700 hover:text-blue-800 text-xs px-2 py-1 rounded hover:bg-blue-50"
                        >
                          📋 Detay
                        </Link>
                        {canUpdate && (
                          <button
                            onClick={() => {
                              setEditItem(s);
                              setFormOpen(true);
                            }}
                            className="text-slate-600 hover:text-slate-900 text-xs px-2 py-1 rounded hover:bg-slate-100"
                          >
                            Düzenle
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setDeleteItem(s)}
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

      <SubcontractorFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={load}
        subcontractor={editItem}
      />
      <ConfirmDialog
        open={!!deleteItem}
        title="Taşeronu sil"
        message={`'${deleteItem?.name}' taşeronunu silmek üzeresiniz.`}
        confirmText="Sil"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteItem(null)}
      />
    </div>
  );
}