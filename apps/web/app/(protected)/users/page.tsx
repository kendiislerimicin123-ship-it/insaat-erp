'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import {
  usersApi,
  User,
  UserStatus,
  USER_STATUS_LABELS,
  USER_STATUS_COLORS,
} from '@/lib/api/users';
import { useAuthStore } from '@/stores/auth-store';
import { UserFormModal } from '@/components/users/user-form-modal';
import { ChangePasswordModal } from '@/components/users/change-password-modal';
import { ManageRolesModal } from '@/components/users/manage-roles-modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export default function UsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreate = hasPermission('user.create');
  const canUpdate = hasPermission('user.update');
  const canDelete = hasPermission('user.delete');
  const canAssignRoles = hasPermission('role.assign');

  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<UserStatus | ''>('');

  const [formOpen, setFormOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [rolesUser, setRolesUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await usersApi.list({
        page,
        limit,
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setUsers(response.items);
      setTotal(response.pagination.total);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          (error.response?.data as { message?: string })?.message ||
            'Kullanıcılar yüklenemedi',
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, statusFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleNewClick = () => {
    setEditUser(null);
    setFormOpen(true);
  };

  const handleEditClick = (user: User) => {
    setEditUser(user);
    setFormOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteUser) return;
    setDeleting(true);
    try {
      await usersApi.remove(deleteUser.id);
      toast.success(`Kullanıcı silindi: ${deleteUser.email}`);
      setDeleteUser(null);
      loadUsers();
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
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kullanıcılar</h1>
          <p className="text-slate-600 mt-1">Toplam {total} kullanıcı</p>
        </div>
        {canCreate && (
          <button
            onClick={handleNewClick}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 flex items-center gap-2"
          >
            <span>+</span>
            <span>Yeni Kullanıcı</span>
          </button>
        )}
      </div>

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
            placeholder="🔍 İsim veya e-posta ara..."
            className="input flex-1"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as UserStatus | '');
              setPage(1);
            }}
            className="input md:w-48"
          >
            <option value="">Tüm Durumlar</option>
            {Object.entries(USER_STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
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
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <span className="text-5xl">👥</span>
            <p className="text-slate-600 mt-3">Henüz kullanıcı yok</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Kullanıcı</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">E-posta</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Roller</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Durum</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Son Giriş</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isCurrentUser = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-medium">
                            {u.firstName.charAt(0)}
                            {u.lastName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {u.firstName} {u.lastName}
                              {isCurrentUser && (
                                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                                  Siz
                                </span>
                              )}
                            </p>
                            {u.phone && <p className="text-xs text-slate-500">{u.phone}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{u.email}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {u.roles.length === 0 ? (
                            <span className="text-xs text-slate-400">—</span>
                          ) : (
                            u.roles.map((r) => (
                              <span
                                key={r.id}
                                className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded"
                              >
                                {r.name}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${USER_STATUS_COLORS[u.status]}`}
                        >
                          {USER_STATUS_LABELS[u.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {u.lastLoginAt
                          ? new Intl.DateTimeFormat('tr-TR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            }).format(new Date(u.lastLoginAt))
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canUpdate && (
                            <button
                              onClick={() => handleEditClick(u)}
                              className="text-slate-600 hover:text-slate-900 text-xs px-2 py-1 rounded hover:bg-slate-100"
                            >
                              Düzenle
                            </button>
                          )}
                          {canAssignRoles && (
                            <button
                              onClick={() => setRolesUser(u)}
                              className="text-slate-600 hover:text-slate-900 text-xs px-2 py-1 rounded hover:bg-slate-100"
                            >
                              Roller
                            </button>
                          )}
                          {canUpdate && (
                            <button
                              onClick={() => setPasswordUser(u)}
                              className="text-slate-600 hover:text-slate-900 text-xs px-2 py-1 rounded hover:bg-slate-100"
                            >
                              Şifre
                            </button>
                          )}
                          {canDelete && !isCurrentUser && (
                            <button
                              onClick={() => setDeleteUser(u)}
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

      {/* Modals */}
      <UserFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={loadUsers}
        user={editUser}
      />
      <ChangePasswordModal
        open={!!passwordUser}
        user={passwordUser}
        onClose={() => setPasswordUser(null)}
        onSuccess={loadUsers}
      />
      <ManageRolesModal
        open={!!rolesUser}
        user={rolesUser}
        onClose={() => setRolesUser(null)}
        onSuccess={loadUsers}
      />
      <ConfirmDialog
        open={!!deleteUser}
        title="Kullanıcıyı sil"
        message={`'${deleteUser?.email}' kullanıcısını silmek üzeresiniz. Aktif oturumları sonlandırılacak.`}
        confirmText="Sil"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteUser(null)}
      />
    </div>
  );
}