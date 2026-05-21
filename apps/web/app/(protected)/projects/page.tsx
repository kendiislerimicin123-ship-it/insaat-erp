'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import {
  projectsApi,
  Project,
  ProjectStatus,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  formatCurrency,
  formatDate,
} from '@/lib/api/projects';
import { useAuthStore } from '@/stores/auth-store';
import { ProjectFormModal } from '@/components/projects/project-form-modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export default function ProjectsPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreate = hasPermission('project.create');
  const canUpdate = hasPermission('project.update');
  const canDelete = hasPermission('project.delete');

  // List state
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | ''>('');

  // Modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ─── Load projects ───
  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await projectsApi.list({
        page,
        limit,
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setProjects(response.items);
      setTotal(response.pagination.total);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          (error.response?.data as { message?: string })?.message ||
            'Projeler yüklenemedi',
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, statusFilter]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // ─── Actions ───
  const handleNewClick = () => {
    setEditProject(null);
    setFormOpen(true);
  };

  const handleEditClick = (project: Project) => {
    setEditProject(project);
    setFormOpen(true);
  };

  const handleDeleteClick = (project: Project) => {
    setDeleteProject(project);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteProject) return;
    setDeleting(true);
    try {
      await projectsApi.remove(deleteProject.id);
      toast.success(`Proje silindi: ${deleteProject.code}`);
      setDeleteProject(null);
      loadProjects();
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
          <h1 className="text-2xl font-bold text-slate-900">Projeler</h1>
          <p className="text-slate-600 mt-1">
            Toplam {total} proje{total !== 1 ? '' : ''}
          </p>
        </div>
        {canCreate && (
          <button
            onClick={handleNewClick}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 flex items-center gap-2"
          >
            <span>+</span>
            <span>Yeni Proje</span>
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
            placeholder="🔍 Kod, isim veya müşteri ara..."
            className="input flex-1"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as ProjectStatus | '');
              setPage(1);
            }}
            className="input md:w-48"
          >
            <option value="">Tüm Durumlar</option>
            {Object.entries(PROJECT_STATUS_LABELS).map(([key, label]) => (
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
        ) : projects.length === 0 ? (
          <div className="p-12 text-center">
            <span className="text-5xl">🏗️</span>
            <p className="text-slate-600 mt-3">Henüz proje yok</p>
            {canCreate && (
              <button
                onClick={handleNewClick}
                className="mt-4 text-sm bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800"
              >
                İlk Projeyi Oluştur
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Kod</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Ad</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Durum</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Şehir</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Müşteri</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Bedel</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Başlangıç</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projects.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{p.code}</td>
                    <td className="px-4 py-3 text-slate-700">{p.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${PROJECT_STATUS_COLORS[p.status]}`}
                      >
                        {PROJECT_STATUS_LABELS[p.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{p.city ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{p.clientName ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {formatCurrency(p.contractAmount, p.currency)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{formatDate(p.startDate)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canUpdate && (
                          <button
                            onClick={() => handleEditClick(p)}
                            className="text-slate-600 hover:text-slate-900 text-xs px-2 py-1 rounded hover:bg-slate-100"
                          >
                            Düzenle
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteClick(p)}
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
      <ProjectFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={loadProjects}
        project={editProject}
      />
      <ConfirmDialog
        open={!!deleteProject}
        title="Projeyi sil"
        message={`'${deleteProject?.name}' projesini silmek üzeresiniz. Bu işlem geri alınamaz.`}
        confirmText="Sil"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteProject(null)}
      />
    </div>
  );
}