'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import axios from 'axios';
import { subcontractorsApi, Subcontractor } from '@/lib/api/subcontractors';
import {
  employeesApi,
  Employee,
  EMPLOYEE_SPECIALTY_LABELS,
  EMPLOYEE_SPECIALTY_COLORS,
  EMPLOYEE_STATUS_LABELS,
  EMPLOYEE_STATUS_COLORS,
  formatWage,
} from '@/lib/api/employees';
import {
  timesheetsApi,
  Timesheet,
  TIMESHEET_STATUS_LABELS,
  TIMESHEET_STATUS_COLORS,
  formatTimesheetAmount,
  formatTimesheetDate,
} from '@/lib/api/timesheets';
import { progressPaymentsApi, ProgressPayment } from '@/lib/api/progress-payments';
import { useAuthStore } from '@/stores/auth-store';
import { EmployeeFormModal } from '@/components/employees/employee-form-modal';
import { TimesheetFormModal } from '@/components/timesheets/timesheet-form-modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

type TabType = 'payments' | 'employees' | 'timesheets';

export default function SubcontractorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canEmployeeCreate = hasPermission('employee.create');
  const canEmployeeUpdate = hasPermission('employee.update');
  const canEmployeeDelete = hasPermission('employee.delete');
  const canTimesheetCreate = hasPermission('timesheet.create');
  const canTimesheetUpdate = hasPermission('timesheet.update');
  const canTimesheetDelete = hasPermission('timesheet.delete');
  const canTimesheetApprove = hasPermission('timesheet.approve');

  const [subcontractor, setSubcontractor] = useState<Subcontractor | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [payments, setPayments] = useState<ProgressPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [tab, setTab] = useState<TabType>('payments');

  const [employeeFormOpen, setEmployeeFormOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [deleteEmployee, setDeleteEmployee] = useState<Employee | null>(null);

  const [timesheetFormOpen, setTimesheetFormOpen] = useState(false);
  const [editTimesheet, setEditTimesheet] = useState<Timesheet | null>(null);
  const [deleteTimesheet, setDeleteTimesheet] = useState<Timesheet | null>(null);

  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [sub, empList, tsList, paymentsList] = await Promise.all([
        subcontractorsApi.getById(id),
        employeesApi.list({ subcontractorId: id, limit: 100 }),
        timesheetsApi.list({ subcontractorId: id, limit: 100 }),
        progressPaymentsApi.list({ subcontractorId: id, limit: 100 }),
      ]);
      setSubcontractor(sub);
      setEmployees(empList.items);
      setTimesheets(tsList.items);
      setPayments(paymentsList.items);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          (error.response?.data as { message?: string })?.message ||
            'Veri yüklenemedi',
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDeleteEmployee = async () => {
    if (!deleteEmployee) return;
    setDeleting(true);
    try {
      await employeesApi.remove(deleteEmployee.id);
      toast.success(`İşçi silindi: ${deleteEmployee.name}`);
      setDeleteEmployee(null);
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

  const handleDeleteTimesheet = async () => {
    if (!deleteTimesheet) return;
    setDeleting(true);
    try {
      await timesheetsApi.remove(deleteTimesheet.id);
      toast.success('Puantaj silindi');
      setDeleteTimesheet(null);
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

  const handleApprove = async (timesheet: Timesheet) => {
    try {
      await timesheetsApi.approve(timesheet.id);
      toast.success('Puantaj onaylandı');
      load();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          (error.response?.data as { message?: string })?.message ||
            'Onaylama başarısız',
        );
      }
    }
  };

  if (isLoading && !subcontractor) {
    return (
      <div className="max-w-7xl mx-auto p-12 text-center text-slate-500">
        <div className="inline-block w-6 h-6 border-3 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
        <p className="text-sm mt-2">Yükleniyor...</p>
      </div>
    );
  }

  if (!subcontractor) return null;

  // Stat hesaplamaları
  const totalPaid = payments
    .filter((p) => p.status === 'PAID')
    .reduce((sum, p) => sum + parseFloat(p.totalAmount), 0);
  const totalPending = payments
    .filter((p) => p.status !== 'PAID' && p.status !== 'DRAFT')
    .reduce((sum, p) => sum + parseFloat(p.totalAmount), 0);
  const totalTimesheetAmount = timesheets.reduce(
    (sum, t) => sum + parseFloat(t.totalAmount),
    0,
  );
  const activeEmployeeCount = employees.filter((e) => e.status === 'ACTIVE').length;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-4">
        <Link href="/subcontractors" className="text-sm text-slate-600 hover:text-slate-900">
          ← Taşeronlar
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{subcontractor.name}</h1>
            <p className="text-sm text-slate-500 font-mono mt-1">{subcontractor.code}</p>
            <div className="flex items-center gap-3 mt-2 text-sm text-slate-600">
              <span>🔧 {subcontractor.category}</span>
              {subcontractor.contactPerson && <span>• 👤 {subcontractor.contactPerson}</span>}
              {subcontractor.phone && <span>• 📞 {subcontractor.phone}</span>}
              {subcontractor.city && <span>• 📍 {subcontractor.city}</span>}
            </div>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-200">
          <StatBox
            label="Toplam Ödenen"
            value={formatTimesheetAmount(totalPaid)}
            color="text-emerald-700"
          />
          <StatBox
            label="Bekleyen Hakediş"
            value={formatTimesheetAmount(totalPending)}
            color="text-amber-700"
          />
          <StatBox
            label="Puantaj Toplamı"
            value={formatTimesheetAmount(totalTimesheetAmount)}
            color="text-blue-700"
          />
          <StatBox
            label="Aktif Ekip"
            value={`${activeEmployeeCount} kişi`}
            color="text-slate-900"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-t-2xl border border-slate-200 border-b-0">
        <div className="flex">
          <TabButton
            active={tab === 'payments'}
            onClick={() => setTab('payments')}
            icon="💰"
            label="Hakediş Hareketleri"
            count={payments.length}
          />
          <TabButton
            active={tab === 'employees'}
            onClick={() => setTab('employees')}
            icon="👷"
            label="Ekip"
            count={employees.length}
          />
          <TabButton
            active={tab === 'timesheets'}
            onClick={() => setTab('timesheets')}
            icon="📅"
            label="Puantaj Kayıtları"
            count={timesheets.length}
          />
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-b-2xl border border-slate-200 border-t-0 p-5">
        {tab === 'payments' && (
          <PaymentsTab payments={payments} />
        )}

        {tab === 'employees' && (
          <EmployeesTab
            employees={employees}
            canCreate={canEmployeeCreate}
            canUpdate={canEmployeeUpdate}
            canDelete={canEmployeeDelete}
            onAdd={() => {
              setEditEmployee(null);
              setEmployeeFormOpen(true);
            }}
            onEdit={(e) => {
              setEditEmployee(e);
              setEmployeeFormOpen(true);
            }}
            onDelete={setDeleteEmployee}
          />
        )}

        {tab === 'timesheets' && (
          <TimesheetsTab
            timesheets={timesheets}
            canCreate={canTimesheetCreate}
            canUpdate={canTimesheetUpdate}
            canDelete={canTimesheetDelete}
            canApprove={canTimesheetApprove}
            employeesAvailable={employees.length > 0}
            onAdd={() => {
              setEditTimesheet(null);
              setTimesheetFormOpen(true);
            }}
            onEdit={(t) => {
              setEditTimesheet(t);
              setTimesheetFormOpen(true);
            }}
            onApprove={handleApprove}
            onDelete={setDeleteTimesheet}
          />
        )}
      </div>

      {/* Modals */}
      <EmployeeFormModal
        open={employeeFormOpen}
        subcontractorId={id}
        employee={editEmployee}
        onClose={() => setEmployeeFormOpen(false)}
        onSuccess={load}
      />
      <TimesheetFormModal
        open={timesheetFormOpen}
        subcontractorId={id}
        subcontractorName={subcontractor.name}
        timesheet={editTimesheet}
        onClose={() => setTimesheetFormOpen(false)}
        onSuccess={load}
      />
      <ConfirmDialog
        open={!!deleteEmployee}
        title="İşçiyi sil"
        message={`'${deleteEmployee?.name}' işçisini silmek üzeresiniz. Puantaj kaydı varsa silinemez.`}
        confirmText="Sil"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteEmployee}
        onCancel={() => setDeleteEmployee(null)}
      />
      <ConfirmDialog
        open={!!deleteTimesheet}
        title="Puantajı sil"
        message="Bu puantajı silmek üzeresiniz."
        confirmText="Sil"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteTimesheet}
        onCancel={() => setDeleteTimesheet(null)}
      />
    </div>
  );
}

// ─────────────────────────────────────
// Tab Buton
// ─────────────────────────────────────
function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-slate-900 text-slate-900 bg-slate-50'
          : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
      }`}
    >
      {icon} {label}{' '}
      <span className="ml-1 text-xs bg-slate-200 px-1.5 py-0.5 rounded">{count}</span>
    </button>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

// ─────────────────────────────────────
// Tab 1: Hakediş Hareketleri
// ─────────────────────────────────────
function PaymentsTab({ payments }: { payments: ProgressPayment[] }) {
  if (payments.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        <span className="text-4xl">💰</span>
        <p className="mt-2">Bu taşerona ait hakediş yok</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200 text-xs">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-slate-700">Kod / Dönem</th>
            <th className="px-3 py-2 text-left font-semibold text-slate-700">Proje</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-700">Tutar</th>
            <th className="px-3 py-2 text-left font-semibold text-slate-700">Durum</th>
            <th className="px-3 py-2 text-left font-semibold text-slate-700">Ödeme</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {payments.map((p) => (
            <tr key={p.id} className="hover:bg-slate-50">
              <td className="px-3 py-2">
                <p className="font-medium text-slate-900">{p.code}</p>
                <p className="text-xs text-slate-500">{p.period}</p>
              </td>
              <td className="px-3 py-2 text-slate-700">{p.project?.code}</td>
              <td className="px-3 py-2 text-right font-bold text-slate-900">
                {formatTimesheetAmount(p.totalAmount)}
              </td>
              <td className="px-3 py-2">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    p.status === 'PAID'
                      ? 'bg-emerald-100 text-emerald-700'
                      : p.status === 'APPROVED'
                        ? 'bg-blue-100 text-blue-700'
                        : p.status === 'SUBMITTED'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {p.status}
                </span>
              </td>
              <td className="px-3 py-2 text-xs text-slate-600">
                {p.paidAt ? formatTimesheetDate(p.paidAt) : '—'}
                {p.paymentMethod && <p className="text-xs text-slate-500">{p.paymentMethod}</p>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────
// Tab 2: Ekip / İşçiler
// ─────────────────────────────────────
function EmployeesTab({
  employees,
  canCreate,
  canUpdate,
  canDelete,
  onAdd,
  onEdit,
  onDelete,
}: {
  employees: Employee[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onAdd: () => void;
  onEdit: (e: Employee) => void;
  onDelete: (e: Employee) => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-slate-600">Bu taşerona bağlı işçi/ekip üyeleri</p>
        {canCreate && (
          <button
            onClick={onAdd}
            className="text-sm bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800"
          >
            + Yeni İşçi
          </button>
        )}
      </div>

      {employees.length === 0 ? (
        <div className="p-8 text-center text-slate-500">
          <span className="text-4xl">👷</span>
          <p className="mt-2">Henüz işçi/ekip üyesi yok</p>
          {canCreate && (
            <button
              onClick={onAdd}
              className="mt-4 text-sm bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800"
            >
              İlk İşçiyi Ekle
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">Ad Soyad</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">Uzmanlık</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">Rol</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-700">Günlük Ücret</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">Telefon</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">Durum</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-700">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <p className="font-medium text-slate-900">{e.name}</p>
                    {e.tcNo && (
                      <p className="text-xs text-slate-500 font-mono">{e.tcNo}</p>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${EMPLOYEE_SPECIALTY_COLORS[e.specialty]}`}
                    >
                      {EMPLOYEE_SPECIALTY_LABELS[e.specialty]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-700">{e.role ?? '—'}</td>
                  <td className="px-3 py-2 text-right font-medium text-slate-900">
                    {formatWage(e.dailyWage, e.currency)}
                  </td>
                  <td className="px-3 py-2 text-slate-600 text-xs">{e.phone ?? '—'}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${EMPLOYEE_STATUS_COLORS[e.status]}`}
                    >
                      {EMPLOYEE_STATUS_LABELS[e.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canUpdate && (
                        <button
                          onClick={() => onEdit(e)}
                          className="text-slate-600 hover:text-slate-900 text-xs px-2 py-1 rounded hover:bg-slate-100"
                        >
                          Düzenle
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => onDelete(e)}
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
    </>
  );
}

// ─────────────────────────────────────
// Tab 3: Puantaj Kayıtları
// ─────────────────────────────────────
function TimesheetsTab({
  timesheets,
  canCreate,
  canUpdate,
  canDelete,
  canApprove,
  employeesAvailable,
  onAdd,
  onEdit,
  onApprove,
  onDelete,
}: {
  timesheets: Timesheet[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canApprove: boolean;
  employeesAvailable: boolean;
  onAdd: () => void;
  onEdit: (t: Timesheet) => void;
  onApprove: (t: Timesheet) => void;
  onDelete: (t: Timesheet) => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-slate-600">Günlük puantaj kayıtları (en yeni üstte)</p>
        {canCreate && (
          <button
            onClick={onAdd}
            disabled={!employeesAvailable}
            className="text-sm bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
            title={!employeesAvailable ? 'Önce ekibe işçi ekleyin' : ''}
          >
            + Yeni Puantaj
          </button>
        )}
      </div>

      {!employeesAvailable && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 mb-3">
          ⚠️ Puantaj girebilmek için önce <strong>Ekip</strong> tabından işçi eklemeniz gerekiyor.
        </div>
      )}

      {timesheets.length === 0 ? (
        <div className="p-8 text-center text-slate-500">
          <span className="text-4xl">📅</span>
          <p className="mt-2">Henüz puantaj kaydı yok</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">Tarih</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">Proje</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-700">İşçi</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-700">Saat</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-700">Toplam</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">Yapılan İş</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">Durum</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-700">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {timesheets.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-900">
                    {formatTimesheetDate(t.date)}
                  </td>
                  <td className="px-3 py-2 text-slate-700 text-xs">
                    {t.project?.code}
                    <p className="text-slate-500">{t.project?.name}</p>
                  </td>
                  <td className="px-3 py-2 text-right text-slate-700">{t.employeeCount}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{parseFloat(t.totalHours)} s</td>
                  <td className="px-3 py-2 text-right font-bold text-emerald-700">
                    {formatTimesheetAmount(t.totalAmount, t.currency)}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600 max-w-xs truncate">
                    {t.workDescription ?? '—'}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${TIMESHEET_STATUS_COLORS[t.status]}`}
                    >
                      {TIMESHEET_STATUS_LABELS[t.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canApprove && t.status === 'DRAFT' && (
                        <button
                          onClick={() => onApprove(t)}
                          className="text-blue-700 hover:text-blue-800 text-xs px-2 py-1 rounded hover:bg-blue-50"
                        >
                          ✓ Onayla
                        </button>
                      )}
                      {canUpdate && t.status !== 'PAID' && (
                        <button
                          onClick={() => onEdit(t)}
                          className="text-slate-600 hover:text-slate-900 text-xs px-2 py-1 rounded hover:bg-slate-100"
                        >
                          Düzenle
                        </button>
                      )}
                      {canDelete && t.status !== 'PAID' && (
                        <button
                          onClick={() => onDelete(t)}
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
    </>
  );
}