'use client';

import {
  AuditLog,
  AUDIT_ACTION_LABELS,
  AUDIT_ACTION_COLORS,
  AUDIT_RESOURCE_LABELS,
  formatDateTime,
} from '@/lib/api/audit';

interface Props {
  log: AuditLog | null;
  onClose: () => void;
}

export function AuditDetailModal({ log, onClose }: Props) {
  if (!log) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Kayıt Detayı</h2>
            <p className="text-sm text-slate-500 mt-0.5 font-mono">{log.id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Üst Bilgiler */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <InfoRow label="İşlem">
              <span
                className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${AUDIT_ACTION_COLORS[log.action]}`}
              >
                {AUDIT_ACTION_LABELS[log.action]}
              </span>
            </InfoRow>
            <InfoRow label="Kaynak">
              <span className="text-sm text-slate-900">
                {AUDIT_RESOURCE_LABELS[log.resource] ?? log.resource}
              </span>
            </InfoRow>
            <InfoRow label="Tarih">
              <span className="text-sm text-slate-900">
                {formatDateTime(log.createdAt)}
              </span>
            </InfoRow>
            <InfoRow label="IP Adresi">
              <span className="text-sm text-slate-900 font-mono">
                {log.ipAddress ?? '—'}
              </span>
            </InfoRow>
            {log.resourceId && (
              <InfoRow label="Kayıt ID" fullWidth>
                <span className="text-xs text-slate-700 font-mono break-all">
                  {log.resourceId}
                </span>
              </InfoRow>
            )}
            {log.userId && (
              <InfoRow label="Kullanıcı ID" fullWidth>
                <span className="text-xs text-slate-700 font-mono break-all">
                  {log.userId}
                </span>
              </InfoRow>
            )}
            {log.userAgent && (
              <InfoRow label="Tarayıcı" fullWidth>
                <span className="text-xs text-slate-600 break-all">
                  {log.userAgent}
                </span>
              </InfoRow>
            )}
          </div>

          {/* Old Values */}
          {log.oldValues && Object.keys(log.oldValues).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">
                Eski Değerler
              </h3>
              <pre className="bg-red-50 border border-red-200 rounded-lg p-4 text-xs text-slate-800 overflow-x-auto">
                {JSON.stringify(log.oldValues, null, 2)}
              </pre>
            </div>
          )}

          {/* New Values */}
          {log.newValues && Object.keys(log.newValues).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">
                Yeni Değerler
              </h3>
              <pre className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-xs text-slate-800 overflow-x-auto">
                {JSON.stringify(log.newValues, null, 2)}
              </pre>
            </div>
          )}

          {/* Metadata */}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">
                Ek Bilgiler
              </h3>
              <pre className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-800 overflow-x-auto">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  children,
  fullWidth,
}: {
  label: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? 'md:col-span-2' : ''}>
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}