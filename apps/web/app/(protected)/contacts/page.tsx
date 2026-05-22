'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import {
  contactsApi,
  Contact,
  ContactType,
  ContactStatus,
  ContactStats,
  CONTACT_TYPE_LABELS,
  CONTACT_TYPE_COLORS,
  CONTACT_STATUS_LABELS,
  CONTACT_STATUS_COLORS,
  formatBalance,
} from '@/lib/api/contacts';
import { useAuthStore } from '@/stores/auth-store';
import { ContactFormModal } from '@/components/contacts/contact-form-modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export default function ContactsPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreate = hasPermission('contact.create');
  const canUpdate = hasPermission('contact.update');
  const canDelete = hasPermission('contact.delete');

  const [items, setItems] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<ContactStats | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ContactType | ''>('');
  const [statusFilter, setStatusFilter] = useState<ContactStatus | ''>('');

  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Contact | null>(null);
  const [deleteItem, setDeleteItem] = useState<Contact | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [list, statsData] = await Promise.all([
        contactsApi.list({
          page,
          limit,
          search: search || undefined,
          type: typeFilter || undefined,
          status: statusFilter || undefined,
        }),
        contactsApi.getStats(),
      ]);
      setItems(list.items);
      setTotal(list.pagination.total);
      setStats(statsData);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          (error.response?.data as { message?: string })?.message ||
            'Cariler yüklenemedi',
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, typeFilter, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDeleteConfirm = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await contactsApi.remove(deleteItem.id);
      toast.success(`Cari silindi: ${deleteItem.code}`);
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
          <h1 className="text-2xl font-bold text-slate-900">Cari Hesaplar</h1>
          <p className="text-slate-600 mt-1">Toplam {total} cari</p>
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
            <span>Yeni Cari</span>
          </button>
        )}
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <StatCard label="Toplam Cari" value={stats.total.toString()} icon="👥" color="bg-slate-50 text-slate-700" />
          <StatCard label="Tedarikçi" value={stats.suppliers.toString()} icon="📦" color="bg-blue-50 text-blue-700" />
          <StatCard label="Müşteri" value={stats.customers.toString()} icon="💰" color="bg-emerald-50 text-emerald-700" />
          <StatCard label="Çift Yönlü" value={stats.both.toString()} icon="🔄" color="bg-purple-50 text-purple-700" />
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
            placeholder="🔍 Kod, isim, yetkili, vergi no, telefon..."
            className="input flex-1"
          />
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as ContactType | '');
              setPage(1);
            }}
            className="input md:w-48"
          >
            <option value="">Tüm Tipler</option>
            {Object.entries(CONTACT_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as ContactStatus | '');
              setPage(1);
            }}
            className="input md:w-40"
          >
            <option value="">Tüm Durumlar</option>
            {Object.entries(CONTACT_STATUS_LABELS).map(([key, label]) => (
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
            <span className="text-5xl">👥</span>
            <p className="text-slate-600 mt-3">Henüz cari hesap yok</p>
            {canCreate && (
              <button
                onClick={() => {
                  setEditItem(null);
                  setFormOpen(true);
                }}
                className="mt-4 text-sm bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800"
              >
                İlk Cariyi Oluştur
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Kod</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Firma / Kişi</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Tip</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">İletişim</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Şehir</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Bakiye</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Durum</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((c) => {
                  const balance = parseFloat(c.currentBalance);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{c.code}</td>
                      <td className="px-4 py-3">
                        <p className="text-slate-900 font-medium">{c.name}</p>
                        {c.taxNumber && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            V.No: {c.taxNumber}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${CONTACT_TYPE_COLORS[c.type]}`}
                        >
                          {CONTACT_TYPE_LABELS[c.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {c.contactPerson && (
                          <p className="text-slate-700">{c.contactPerson}</p>
                        )}
                        {c.phone && (
                          <p className="text-xs text-slate-500">{c.phone}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{c.city ?? '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <p
                          className={`font-bold ${balance > 0 ? 'text-emerald-700' : balance < 0 ? 'text-red-700' : 'text-slate-500'}`}
                        >
                          {formatBalance(c.currentBalance, c.currency)}
                        </p>
                        {balance > 0 && (
                          <p className="text-xs text-emerald-600">Alacak</p>
                        )}
                        {balance < 0 && (
                          <p className="text-xs text-red-600">Borç</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${CONTACT_STATUS_COLORS[c.status]}`}
                        >
                          {CONTACT_STATUS_LABELS[c.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/contacts/${c.id}`}
                            className="text-blue-700 hover:text-blue-800 text-xs px-2 py-1 rounded hover:bg-blue-50"
                          >
                            📋 Detay
                          </Link>
                          {canUpdate && (
                            <button
                              onClick={() => {
                                setEditItem(c);
                                setFormOpen(true);
                              }}
                              className="text-slate-600 hover:text-slate-900 text-xs px-2 py-1 rounded hover:bg-slate-100"
                            >
                              Düzenle
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

      <ContactFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={load}
        contact={editItem}
      />
      <ConfirmDialog
        open={!!deleteItem}
        title="Cariyi sil"
        message={`'${deleteItem?.name}' carisini silmek üzeresiniz.`}
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
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}