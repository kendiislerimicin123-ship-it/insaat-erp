'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import {
  materialsApi,
  Material,
  MaterialCategory,
  MaterialStats,
  MovementType,
  MATERIAL_CATEGORY_LABELS,
  MATERIAL_UNIT_LABELS,
  formatStock,
  formatCurrency,
} from '@/lib/api/materials';
import { useAuthStore } from '@/stores/auth-store';
import { MaterialFormModal } from '@/components/materials/material-form-modal';
import { MovementModal } from '@/components/materials/movement-modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export default function MaterialsPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreate = hasPermission('material.create');
  const canUpdate = hasPermission('material.update');
  const canDelete = hasPermission('material.delete');
  const canMovement = hasPermission('material.movement');

  const [items, setItems] = useState<Material[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<MaterialStats | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<MaterialCategory | ''>('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Material | null>(null);
  const [movementItem, setMovementItem] = useState<Material | null>(null);
  const [movementType, setMovementType] = useState<MovementType>('IN');
  const [deleteItem, setDeleteItem] = useState<Material | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [list, statsData] = await Promise.all([
        materialsApi.list({
          page,
          limit,
          search: search || undefined,
          category: categoryFilter || undefined,
          lowStock: lowStockOnly ? 'true' : undefined,
        }),
        materialsApi.getStats(),
      ]);
      setItems(list.items);
      setTotal(list.pagination.total);
      setStats(statsData);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          (error.response?.data as { message?: string })?.message ||
            'Malzemeler yüklenemedi',
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, categoryFilter, lowStockOnly]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDeleteConfirm = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await materialsApi.remove(deleteItem.id);
      toast.success(`Malzeme silindi: ${deleteItem.code}`);
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
          <h1 className="text-2xl font-bold text-slate-900">Malzemeler</h1>
          <p className="text-slate-600 mt-1">Toplam {total} malzeme</p>
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
            <span>Yeni Malzeme</span>
          </button>
        )}
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <StatCard label="Toplam Malzeme" value={stats.totalMaterials.toString()} icon="📦" color="bg-blue-50 text-blue-700" />
          <StatCard label="Stok Hareketi" value={stats.totalMovements.toString()} icon="📊" color="bg-slate-50 text-slate-700" />
          <StatCard label="Kritik Stok" value={stats.lowStockCount.toString()} icon="⚠️" color="bg-red-50 text-red-700" />
          <StatCard label="Toplam Stok Değeri" value={formatCurrency(stats.totalStockValue, 'TRY')} icon="💰" color="bg-emerald-50 text-emerald-700" />
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
            placeholder="🔍 Kod veya isim ara..."
            className="input flex-1"
          />
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value as MaterialCategory | '');
              setPage(1);
            }}
            className="input md:w-48"
          >
            <option value="">Tüm Kategoriler</option>
            {Object.entries(MATERIAL_CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => {
                setLowStockOnly(e.target.checked);
                setPage(1);
              }}
              className="rounded"
            />
            <span className="text-sm whitespace-nowrap">⚠️ Sadece kritik stok</span>
          </label>
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
            <span className="text-5xl">📦</span>
            <p className="text-slate-600 mt-3">Henüz malzeme yok</p>
            {canCreate && (
              <button
                onClick={() => {
                  setEditItem(null);
                  setFormOpen(true);
                }}
                className="mt-4 text-sm bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800"
              >
                İlk Malzemeyi Oluştur
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Kod / Adı</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Kategori</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Mevcut Stok</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Ort. Fiyat</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Toplam Değer</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((m) => {
                  const stock = parseFloat(m.currentStock);
                  const minS = parseFloat(m.minStock);
                  const avg = parseFloat(m.avgPrice);
                  const isLow = minS > 0 && stock <= minS;
                  const totalValue = stock * avg;
                  return (
                    <tr key={m.id} className={`hover:bg-slate-50 ${isLow ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{m.code}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{m.name}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {MATERIAL_CATEGORY_LABELS[m.category]}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isLow && <span className="text-xs">⚠️</span>}
                          <p className={`font-bold ${isLow ? 'text-red-700' : 'text-slate-900'}`}>
                            {formatStock(m.currentStock, m.unit)}
                          </p>
                        </div>
                        {minS > 0 && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            Min: {formatStock(m.minStock, m.unit)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {parseFloat(m.avgPrice) > 0 ? formatCurrency(m.avgPrice, m.currency) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">
                        {totalValue > 0 ? formatCurrency(totalValue, m.currency) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canMovement && (
                            <>
                              <button
                                onClick={() => {
                                  setMovementItem(m);
                                  setMovementType('IN');
                                }}
                                className="text-emerald-700 hover:text-emerald-800 text-xs px-2 py-1 rounded hover:bg-emerald-50"
                              >
                                ⬇️ Giriş
                              </button>
                              <button
                                onClick={() => {
                                  setMovementItem(m);
                                  setMovementType('OUT');
                                }}
                                className="text-red-700 hover:text-red-800 text-xs px-2 py-1 rounded hover:bg-red-50"
                              >
                                ⬆️ Çıkış
                              </button>
                            </>
                          )}
                          {canUpdate && (
                            <button
                              onClick={() => {
                                setEditItem(m);
                                setFormOpen(true);
                              }}
                              className="text-slate-600 hover:text-slate-900 text-xs px-2 py-1 rounded hover:bg-slate-100"
                            >
                              Düzenle
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => setDeleteItem(m)}
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

      <MaterialFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={load}
        material={editItem}
      />
      <MovementModal
        open={!!movementItem}
        material={movementItem}
        initialType={movementType}
        onClose={() => setMovementItem(null)}
        onSuccess={load}
      />
      <ConfirmDialog
        open={!!deleteItem}
        title="Malzemeyi sil"
        message={`'${deleteItem?.name}' malzemesini silmek üzeresiniz. Aktif stok hareketi varsa silinemez.`}
        confirmText="Sil"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteItem(null)}
      />
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
          <p className="text-xl font-bold text-slate-900 mt-1 truncate">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${color} flex-shrink-0 ml-3`}>
          {icon}
        </div>
      </div>
    </div>
  );
}