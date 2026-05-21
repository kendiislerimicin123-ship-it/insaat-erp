'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { usersApi, User, Role } from '@/lib/api/users';

interface Props {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ManageRolesModal({ open, user, onClose, onSuccess }: Props) {
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    usersApi.getAvailableRoles().then(setAllRoles).catch(() => {});
    setSelectedSlugs(user.roles.map((r) => r.slug));
  }, [open, user]);

  const toggleRole = (slug: string) => {
    setSelectedSlugs((current) =>
      current.includes(slug)
        ? current.filter((s) => s !== slug)
        : [...current, slug],
    );
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (selectedSlugs.length === 0) {
      toast.error('En az 1 rol seçin');
      return;
    }

    setSubmitting(true);
    try {
      await usersApi.updateRoles(user.id, { roleSlugs: selectedSlugs });
      toast.success(`Roller güncellendi: ${user.email}`);
      onSuccess();
      onClose();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          (error.response?.data as { message?: string })?.message ||
            'İşlem başarısız',
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !user) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Rolleri Yönet</h2>
          <p className="text-sm text-slate-500 mt-0.5">{user.email}</p>
        </div>

        <div className="p-6 space-y-3">
          {allRoles.length === 0 ? (
            <p className="text-sm text-slate-500">Roller yükleniyor...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {allRoles.map((role) => {
                const isSelected = selectedSlugs.includes(role.slug);
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => toggleRole(role.slug)}
                    className={`text-left p-3 rounded-lg border transition-colors ${
                      isSelected
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{role.name}</span>
                      {role.isSystem && (
                        <span className="text-[10px] uppercase tracking-wide opacity-75">
                          Sistem
                        </span>
                      )}
                    </div>
                    {role.description && (
                      <p
                        className={`text-xs mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}
                      >
                        {role.description}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <p className="text-xs text-slate-500 pt-2">
            {selectedSlugs.length} rol seçildi
          </p>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            İptal
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || selectedSlugs.length === 0}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}