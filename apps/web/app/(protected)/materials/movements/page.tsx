'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import axios from 'axios';
import {
  materialsApi,
  MaterialMovement,
  MovementType,
  MovementStats,
  Material,
  MOVEMENT_TYPE_LABELS,
  MOVEMENT_TYPE_COLORS,
  MOVEMENT_TYPE_ROW_COLORS,
  formatStock,
  formatCurrency,
  formatDate,
} from '@/lib/api/materials';
import { projectsApi } from '@/lib/api/projects';
import { useAuthStore } from '@/stores/auth-store';
import { MovementModal } from '@/components/materials/movement-modal';
import { MovementDetailModal } from '@/components/movements/movement-detail-modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export default function MovementsPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canMovement = hasPermission('material.movement');

  const [items, setItems] = useState<MaterialMovement[]>([]);
  const [stats, setStats] = useState<MovementStats | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(30);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [materialFilter, setMaterialFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<MovementType | ''>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [supplier, setSupplier] = useState('');

  // Selection (bulk delete)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals
  const [detailItem, setDetailItem] = useState<MaterialMovement | null>(null);
  const [movementMaterial, setMovementMaterial] = useState<Material | null>(null);
  const [movementType, setMovementType] = useState<MovementType>('IN');
  const [movementFormOpen, setMovementFormOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<MaterialMovement | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [movementsData, statsData] = await Promise.all([
        materialsApi.listMovements({
          page,
          limit,
          search: search || undefined,
          materialId: materialFilter || undefined,
          projectId: projectFilter || undefined,
          type: typeFilter || undefined,
          from: fromDate || undefined,
          to: toDate || undefined,
          supplier: supplier || undefined,
        }),
        materialsApi.getMovementStats(fromDate || undefined, toDate || undefined),
      ]);
      setItems(movementsData.items);
      setTotal(movementsData.pagination.total);
      setStats(statsData);
      setSelectedIds(new Set()); // Selection reset
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          (error.response?.data as { message?: string })?.message ||
            'Hareketler yüklenemedi',
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, materialFilter, projectFilter, typeFilter, fromDate, toDate, supplier]);

  // İlk yüklemede malzeme + proje listesi
  useEffect(() => {
    materialsApi.listAll().then(setMaterials).catch(() => {});
    projectsApi.listAll().then(setProjects).catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Filtre sıfırlama
  const resetFilters = () => {
    setSearch('');
    setMaterialFilter('');
    setProjectFilter('');
    setTypeFilter('');
    setFromDate('');
    setToDate('');
    setSupplier('');
    setPage(1);
  };

  const hasActiveFilters =
    search || materialFilter || projectFilter || typeFilter || fromDate || toDate || supplier;

  // Selection
  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  // Delete
  const handleDeleteSingle = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await materialsApi.removeMovement(deleteItem.id);
      toast.success('Hareket silindi');
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

  const handleBulkDelete = async () => {
    setDeleting(true);
    try {
      const result = await materialsApi.removeMovementsBulk(Array.from(selectedIds));
      toast.success(`${result.success} hareket silindi`);
      setBulkDeleteOpen(false);
      setSelectedIds(new Set());
      load();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          (error.response?.data as { message?: string })?.message || 'Toplu silme başarısız',
        );
      }
    } finally {
      setDeleting(false);
    }
  };

  const openMovementForm = (type: MovementType) => {
    if (materials.length === 0) {
      toast.error('Önce malzeme tanımlamalısınız');
      return;
    }
    // Boş bir material gibi gönder (modalda dropdown yok ama)
    // Bu sayfada movement modal'ı kullanmak için MovementModal'a özel açma yapacağız
    // Şimdilik basitçe ilk malzemeyi seçili göster, kullanıcı modaldan değiştirebilir
    // (Movement modal aslında "tek malzeme için" tasarlandı, bu sayfa için ihtiyaç olabilir bir genişletme — şu an Liste sayfasındaki gibi mevcut Movement modal kullanılır)
    setMovementMaterial(materials[0]);
    setMovementType(type);
    setMovementFormOpen(true);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
            <Link href="/materials" className="hover:text-slate-900">
              Malzemeler
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Stok Hareketleri</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Stok Hareketleri</h1>
          <p className="text-slate-600 mt-1">Tüm giriş, çıkış ve düzeltme kayıtları</p>
        </div>
        {canMovement && materials.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={() => openMovementForm('IN')}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 flex items-center gap-2 text-sm"
            >
              <span>⬇️</span>
              <span>Yeni Giriş</span>
            </button>
            <button
              onClick={() => openMovementForm('OUT')}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2 text-sm"
            >
              <span>⬆️</span>
              <span>Yeni Çıkış</span>
            </button>
          </div>
        )}
      </div>

      {/* Stat Cards (5 kart) */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <StatCard
            label="Toplam Giriş"
            value={stats.totalIn.toString()}
            icon="⬇️"
            color="bg-emerald-50 text-emerald-700"
          />
          <StatCard
            label="Toplam Çıkış"
            value={stats.totalOut.toString()}
            icon="⬆️"
            color="bg-red-50 text-red-700"
          />
          <StatCard
            label="Toplam Maliyet"
            value={formatCurrency(stats.totalCost)}
            icon="💰"
            color="bg-blue-50 text-blue-700"
            wide
          />
          <StatCard
            label="Tedarikçi"
            value={stats.uniqueSuppliers.toString()}
            icon="🏢"
            color="bg-purple-50 text-purple-700"
          />
          <StatCard
            label="Hareket Sayısı"
            value={stats.totalMovements.toString()}
            icon="📊"
            color="bg-slate-50 text-slate-700"
          />
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
            placeholder="🔍 Malzeme, fatura, tedarikçi..."
            className="input"
          />
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as MovementType | '');
              setPage(1);
            }}
            className="input"
          >
            <option value="">Tüm Tipler</option>
            <option value="IN">⬇️ Giriş</option>
            <option value="OUT">⬆️ Çıkış</option>
            <option value="ADJUSTMENT">🔄 Düzeltme</option>
          </select>
          <select
            value={materialFilter}
            onChange={(e) => {
              setMaterialFilter(e.target.value);
              setPage(1);
            }}
            className="input"
          >
            <option value="">Tüm Malzemeler</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.code} — {m.name}
              </option>
            ))}
          </select>
          <select
            value={projectFilter}
            onChange={(e) => {
              setProjectFilter(e.target.value);
              setPage(1);
            }}
            className="input"
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
            placeholder="Başlangıç"
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
            placeholder="Bitiş"
            className="input"
            title="Bitiş tarihi"
          />
          <input
            type="text"
            value={supplier}
            onChange={(e) => {
              setSupplier(e.target.value);
              setPage(1);
            }}
            placeholder="🏢 Tedarikçi adı..."
            className="input md:col-span-2"
          />
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && canMovement && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3 mb-4 flex items-center justify-between">
          <p className="text-sm font-medium text-amber-900">
            ✓ {selectedIds.size} hareket seçildi
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs px-3 py-1.5 rounded-lg border border-amber-400 text-amber-800 hover:bg-amber-100"
            >
              Seçimi İptal Et
            </button>
            <button
              onClick={() => setBulkDeleteOpen(true)}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700"
            >
              🗑️ Seçilenleri Sil
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="inline-block w-6 h-6 border-3 border-slate-200 border-t-slate-900 rounded-full animate-spin mb-2" />
            <p className="text-sm">Yükleniyor...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <span className="text-5xl">📊</span>
            <p className="text-slate-600 mt-3">
              {hasActiveFilters ? 'Bu filtrelere uyan hareket bulunamadı' : 'Henüz hareket yok'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="mt-3 text-sm text-blue-700 hover:text-blue-800"
              >
                Filtreleri temizle
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {canMovement && (
                    <th className="px-3 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === items.length && items.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded"
                      />
                    </th>
                  )}
                  <th className="px-3 py-3 text-left font-semibold text-slate-700">Tarih</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-700">Tip</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-700">Malzeme</th>
                  <th className="px-3 py-3 text-right font-semibold text-slate-700">Miktar</th>
                  <th className="px-3 py-3 text-right font-semibold text-slate-700">Birim Fiyat</th>
                  <th className="px-3 py-3 text-right font-semibold text-slate-700">Toplam</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-700">Proje</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-700">Tedarikçi / Fatura</th>
                  <th className="px-3 py-3 text-right font-semibold text-slate-700">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((m) => (
                  <tr
                    key={m.id}
                    className={`${MOVEMENT_TYPE_ROW_COLORS[m.type]} ${selectedIds.has(m.id) ? 'ring-2 ring-inset ring-blue-400' : ''}`}
                  >
                    {canMovement && (
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(m.id)}
                          onChange={() => toggleSelect(m.id)}
                          className="rounded"
                        />
                      </td>
                    )}
                    <td className="px-3 py-2 text-slate-900 whitespace-nowrap">
                      {formatDate(m.date)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${MOVEMENT_TYPE_COLORS[m.type]}`}
                      >
                        {m.type === 'IN' && '⬇️'}
                        {m.type === 'OUT' && '⬆️'}
                        {m.type === 'ADJUSTMENT' && '🔄'}{' '}
                        {MOVEMENT_TYPE_LABELS[m.type]}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-medium text-slate-900">{m.material.code}</p>
                      <p className="text-xs text-slate-500">{m.material.name}</p>
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatStock(m.quantity, m.material.unit)}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700 whitespace-nowrap">
                      {m.unitPrice ? formatCurrency(m.unitPrice, m.currency) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-bold whitespace-nowrap">
                      {m.totalPrice ? (
                        <span
                          className={m.type === 'IN' ? 'text-emerald-700' : 'text-slate-900'}
                        >
                          {formatCurrency(m.totalPrice, m.currency)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {m.project ? (
                        <>
                          <p className="text-xs font-medium text-slate-900">{m.project.code}</p>
                          <p className="text-xs text-slate-500">{m.project.name}</p>
                        </>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {m.supplier && <p className="text-xs text-slate-700">{m.supplier}</p>}
                      {m.invoiceNo && (
                        <p className="text-xs text-slate-500 font-mono">{m.invoiceNo}</p>
                      )}
                      {!m.supplier && !m.invoiceNo && (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setDetailItem(m)}
                          className="text-blue-700 hover:text-blue-800 text-xs px-2 py-1 rounded hover:bg-blue-100"
                        >
                          📋 Detay
                        </button>
                        {canMovement && (
                          <button
                            onClick={() => setDeleteItem(m)}
                            className="text-red-600 hover:text-red-700 text-xs px-2 py-1 rounded hover:bg-red-100"
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

        {/* Pagination */}
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

      {/* Modals */}
      <MovementDetailModal
        open={!!detailItem}
        movement={detailItem}
        onClose={() => setDetailItem(null)}
      />
      <MovementModal
        open={movementFormOpen}
        material={movementMaterial}
        initialType={movementType}
        onClose={() => setMovementFormOpen(false)}
        onSuccess={load}
      />
      <ConfirmDialog
        open={!!deleteItem}
        title="Hareketi sil"
        message="Bu hareketi silmek üzeresiniz. Stok seviyesi otomatik düzeltilecek."
        confirmText="Sil"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteSingle}
        onCancel={() => setDeleteItem(null)}
      />
      <ConfirmDialog
        open={bulkDeleteOpen}
        title="Toplu Silme"
        message={`${selectedIds.size} hareketi silmek üzeresiniz. Bu işlem geri alınamaz ve stok seviyeleri otomatik düzeltilecek.`}
        confirmText={`${selectedIds.size} Hareketi Sil`}
        variant="danger"
        loading={deleting}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteOpen(false)}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
  wide,
}: {
  label: string;
  value: string;
  icon: string;
  color: string;
  wide?: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-3 ${wide ? 'md:col-span-1' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
          <p className="text-lg font-bold text-slate-900 mt-1 truncate">{value}</p>
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ml-2 ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}