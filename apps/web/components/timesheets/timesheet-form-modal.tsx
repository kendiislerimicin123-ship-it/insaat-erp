'use client';

import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  timesheetsApi,
  Timesheet,
  TimesheetDetailInput,
  calculateEarning,
  formatTimesheetAmount,
} from '@/lib/api/timesheets';
import { employeesApi, Employee, EMPLOYEE_SPECIALTY_LABELS } from '@/lib/api/employees';
import { projectsApi } from '@/lib/api/projects';

interface Props {
  open: boolean;
  subcontractorId: string;
  subcontractorName: string;
  timesheet?: Timesheet | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface RowData {
  employeeId: string;
  employeeName: string;
  employeeSpecialty: string;
  absent: boolean;
  hoursWorked: number;
  dailyWage: number;
  overtimeHours: number;
  overtimeMultiplier: number;
  notes: string;
}

export function TimesheetFormModal({
  open,
  subcontractorId,
  subcontractorName,
  timesheet,
  onClose,
  onSuccess,
}: Props) {
  const isEdit = !!timesheet;

  const [projects, setProjects] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [projectId, setProjectId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [workDescription, setWorkDescription] = useState('');
  const [approvedBy, setApprovedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<RowData[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Modal açıldığında veri yükle
  useEffect(() => {
    if (!open) return;

    Promise.all([
      projectsApi.listAll().then(setProjects).catch(() => {}),
      employeesApi.listBySubcontractor(subcontractorId).then(setEmployees).catch(() => {}),
    ]);

    if (timesheet) {
      setProjectId(timesheet.projectId);
      setDate(timesheet.date.slice(0, 10));
      setWorkDescription(timesheet.workDescription ?? '');
      setApprovedBy(timesheet.approvedBy ?? '');
      setNotes(timesheet.notes ?? '');
      setRows(
        (timesheet.details ?? []).map((d) => ({
          employeeId: d.employeeId,
          employeeName: d.employee?.name ?? '',
          employeeSpecialty: d.employee?.specialty ?? '',
          absent: d.absent,
          hoursWorked: parseFloat(d.hoursWorked),
          dailyWage: parseFloat(d.dailyWage),
          overtimeHours: parseFloat(d.overtimeHours),
          overtimeMultiplier: parseFloat(d.overtimeMultiplier),
          notes: d.notes ?? '',
        })),
      );
    } else {
      setProjectId('');
      setDate(new Date().toISOString().slice(0, 10));
      setWorkDescription('');
      setApprovedBy('');
      setNotes('');
      setRows([]);
    }
  }, [open, subcontractorId, timesheet]);

  // Tek satırlık özet (toplam)
  const summary = useMemo(() => {
    let totalAmount = 0;
    let totalHours = 0;
    let presentCount = 0;
    let absentCount = 0;

    rows.forEach((r) => {
      if (r.absent) {
        absentCount++;
      } else {
        presentCount++;
        totalHours += r.hoursWorked;
        totalAmount += calculateEarning({
          employeeId: r.employeeId,
          absent: r.absent,
          hoursWorked: r.hoursWorked,
          dailyWage: r.dailyWage,
          overtimeHours: r.overtimeHours,
          overtimeMultiplier: r.overtimeMultiplier,
        });
      }
    });

    return { totalAmount, totalHours, presentCount, absentCount };
  }, [rows]);

  // Tüm işçileri ekle butonu
  const addAllEmployees = () => {
    const existingIds = new Set(rows.map((r) => r.employeeId));
    const newRows = employees
      .filter((e) => !existingIds.has(e.id))
      .map((e) => ({
        employeeId: e.id,
        employeeName: e.name,
        employeeSpecialty: e.specialty,
        absent: false,
        hoursWorked: 8,
        dailyWage: parseFloat(e.dailyWage),
        overtimeHours: 0,
        overtimeMultiplier: 1.5,
        notes: '',
      }));
    setRows([...rows, ...newRows]);
  };

  // Tek işçi ekle
  const addEmployee = (employeeId: string) => {
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return;
    if (rows.find((r) => r.employeeId === employeeId)) {
      toast.error('Bu işçi zaten eklenmiş');
      return;
    }
    setRows([
      ...rows,
      {
        employeeId: emp.id,
        employeeName: emp.name,
        employeeSpecialty: emp.specialty,
        absent: false,
        hoursWorked: 8,
        dailyWage: parseFloat(emp.dailyWage),
        overtimeHours: 0,
        overtimeMultiplier: 1.5,
        notes: '',
      },
    ]);
  };

  const removeRow = (employeeId: string) => {
    setRows(rows.filter((r) => r.employeeId !== employeeId));
  };

  const updateRow = (employeeId: string, field: keyof RowData, value: string | number | boolean) => {
    setRows(rows.map((r) => (r.employeeId === employeeId ? { ...r, [field]: value } : r)));
  };

  const handleSubmit = async () => {
    if (!projectId) {
      toast.error('Proje seçilmeli');
      return;
    }
    if (rows.length === 0) {
      toast.error('En az 1 işçi eklenmeli');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        subcontractorId,
        projectId,
        date: new Date(date).toISOString(),
        workDescription: workDescription || undefined,
        approvedBy: approvedBy || undefined,
        notes: notes || undefined,
        details: rows.map((r) => ({
          employeeId: r.employeeId,
          absent: r.absent,
          hoursWorked: r.hoursWorked,
          dailyWage: r.dailyWage,
          overtimeHours: r.overtimeHours,
          overtimeMultiplier: r.overtimeMultiplier,
          notes: r.notes || undefined,
        })),
      };

      if (isEdit && timesheet) {
        await timesheetsApi.update(timesheet.id, payload);
        toast.success(`Puantaj güncellendi`);
      } else {
        await timesheetsApi.create(payload);
        toast.success(`Puantaj kaydedildi: ${summary.presentCount} işçi`);
      }

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

  if (!open) return null;

  const availableEmployees = employees.filter(
    (e) => !rows.find((r) => r.employeeId === e.id),
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[95vh] overflow-y-auto shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-slate-900">
            {isEdit ? 'Puantajı Düzenle' : 'Yeni Puantaj Girişi'}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">{subcontractorName}</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Üst bilgiler */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Proje *
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="input"
              >
                <option value="">— Proje seçin —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Tarih *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Onaylayan
              </label>
              <input
                type="text"
                value={approvedBy}
                onChange={(e) => setApprovedBy(e.target.value)}
                placeholder="Şantiye şefi adı"
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Yapılan İş
            </label>
            <textarea
              value={workDescription}
              onChange={(e) => setWorkDescription(e.target.value)}
              rows={2}
              placeholder="örn: 2. kat döşeme demir bağlama, kalıp sökümü"
              className="input"
            />
          </div>

          {/* İşçi tablosu */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-semibold text-slate-700">
                👷 İşçi Listesi ({rows.length} satır)
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                {availableEmployees.length > 0 && (
                  <>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          addEmployee(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="text-sm border border-slate-300 rounded-lg px-2 py-1"
                      defaultValue=""
                    >
                      <option value="">+ İşçi ekle</option>
                      {availableEmployees.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name} ({EMPLOYEE_SPECIALTY_LABELS[e.specialty]})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={addAllEmployees}
                      className="text-xs bg-slate-900 text-white px-2 py-1.5 rounded-lg hover:bg-slate-800"
                    >
                      Tümünü Ekle
                    </button>
                  </>
                )}
              </div>
            </div>

            {rows.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                {employees.length === 0 ? (
                  <>
                    <p>⚠️ Bu taşeronda henüz işçi yok</p>
                    <p className="text-xs mt-1">Önce ekibe işçi ekleyin</p>
                  </>
                ) : (
                  <>
                    <p>Henüz işçi eklenmedi</p>
                    <p className="text-xs mt-1">Yukarıdan işçi seçin veya tümünü ekleyin</p>
                  </>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 border-b border-slate-200 text-xs">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">
                        İşçi
                      </th>
                      <th className="px-2 py-2 text-center font-semibold text-slate-700">
                        Gelmedi
                      </th>
                      <th className="px-2 py-2 text-right font-semibold text-slate-700">
                        Saat
                      </th>
                      <th className="px-2 py-2 text-right font-semibold text-slate-700">
                        Günlük (₺)
                      </th>
                      <th className="px-2 py-2 text-right font-semibold text-slate-700">
                        Mesai (s)
                      </th>
                      <th className="px-2 py-2 text-right font-semibold text-slate-700">
                        Mesai x
                      </th>
                      <th className="px-2 py-2 text-right font-semibold text-slate-700">
                        Kazanç (₺)
                      </th>
                      <th className="px-2 py-2 text-center font-semibold text-slate-700">
                        Sil
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row) => {
                      const earning = calculateEarning({
                        employeeId: row.employeeId,
                        absent: row.absent,
                        hoursWorked: row.hoursWorked,
                        dailyWage: row.dailyWage,
                        overtimeHours: row.overtimeHours,
                        overtimeMultiplier: row.overtimeMultiplier,
                      });
                      return (
                        <tr
                          key={row.employeeId}
                          className={row.absent ? 'bg-slate-50 opacity-60' : ''}
                        >
                          <td className="px-3 py-2">
                            <p className="font-medium text-slate-900">{row.employeeName}</p>
                            <p className="text-xs text-slate-500">
                              {EMPLOYEE_SPECIALTY_LABELS[row.employeeSpecialty as keyof typeof EMPLOYEE_SPECIALTY_LABELS] ?? row.employeeSpecialty}
                            </p>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={row.absent}
                              onChange={(e) => updateRow(row.employeeId, 'absent', e.target.checked)}
                              className="rounded"
                            />
                          </td>
                          <td className="px-2 py-2 text-right">
                            <input
                              type="number"
                              step="0.5"
                              value={row.hoursWorked}
                              onChange={(e) => updateRow(row.employeeId, 'hoursWorked', parseFloat(e.target.value) || 0)}
                              disabled={row.absent}
                              className="w-16 text-right border border-slate-300 rounded px-2 py-1 disabled:bg-slate-100"
                            />
                          </td>
                          <td className="px-2 py-2 text-right">
                            <input
                              type="number"
                              step="0.01"
                              value={row.dailyWage}
                              onChange={(e) => updateRow(row.employeeId, 'dailyWage', parseFloat(e.target.value) || 0)}
                              disabled={row.absent}
                              className="w-24 text-right border border-slate-300 rounded px-2 py-1 disabled:bg-slate-100"
                            />
                          </td>
                          <td className="px-2 py-2 text-right">
                            <input
                              type="number"
                              step="0.5"
                              value={row.overtimeHours}
                              onChange={(e) => updateRow(row.employeeId, 'overtimeHours', parseFloat(e.target.value) || 0)}
                              disabled={row.absent}
                              className="w-16 text-right border border-slate-300 rounded px-2 py-1 disabled:bg-slate-100"
                            />
                          </td>
                          <td className="px-2 py-2 text-right">
                            <input
                              type="number"
                              step="0.1"
                              value={row.overtimeMultiplier}
                              onChange={(e) => updateRow(row.employeeId, 'overtimeMultiplier', parseFloat(e.target.value) || 1.5)}
                              disabled={row.absent}
                              className="w-16 text-right border border-slate-300 rounded px-2 py-1 disabled:bg-slate-100"
                            />
                          </td>
                          <td className="px-2 py-2 text-right font-bold">
                            {row.absent ? (
                              <span className="text-slate-400">—</span>
                            ) : (
                              <span className="text-emerald-700">{formatTimesheetAmount(earning)}</span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeRow(row.employeeId)}
                              className="text-red-600 hover:text-red-800 text-xs"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-300">
                    <tr>
                      <td colSpan={2} className="px-3 py-3 font-bold text-slate-900">
                        TOPLAM
                      </td>
                      <td className="px-2 py-3 text-right font-bold text-slate-900">
                        {summary.totalHours}
                      </td>
                      <td colSpan={3} className="px-2 py-3 text-right text-xs text-slate-600">
                        {summary.presentCount} işçi geldi
                        {summary.absentCount > 0 && ` • ${summary.absentCount} gelmedi`}
                      </td>
                      <td className="px-2 py-3 text-right">
                        <span className="text-lg font-bold text-emerald-700">
                          {formatTimesheetAmount(summary.totalAmount)}
                        </span>
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Notlar */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Genel Notlar
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="input"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || rows.length === 0 || !projectId}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {submitting ? 'Kaydediliyor...' : isEdit ? 'Güncelle' : 'Puantajı Kaydet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}