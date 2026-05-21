import { apiClient } from './client';

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGIN_FAILED'
  | 'PASSWORD_CHANGE'
  | 'PASSWORD_RESET'
  | 'PERMISSION_GRANT'
  | 'PERMISSION_REVOKE'
  | 'ROLE_ASSIGN'
  | 'ROLE_REVOKE';

export interface AuditLog {
  id: string;
  tenantId: string | null;
  userId: string | null;
  action: AuditAction;
  resource: string;
  resourceId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogsListResponse {
  items: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ListAuditLogsQuery {
  page?: number;
  limit?: number;
  action?: AuditAction;
  resource?: string;
  userId?: string;
  from?: string; // ISO date
  to?: string;
}

export const auditApi = {
  async list(query: ListAuditLogsQuery = {}): Promise<AuditLogsListResponse> {
    const { data } = await apiClient.get<AuditLogsListResponse>('/audit-logs', {
      params: query,
    });
    return data;
  },
};

// ─── Helper'lar ───
export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: 'Oluşturma',
  UPDATE: 'Güncelleme',
  DELETE: 'Silme',
  LOGIN: 'Giriş',
  LOGOUT: 'Çıkış',
  LOGIN_FAILED: 'Başarısız Giriş',
  PASSWORD_CHANGE: 'Şifre Değişikliği',
  PASSWORD_RESET: 'Şifre Sıfırlama',
  PERMISSION_GRANT: 'İzin Verme',
  PERMISSION_REVOKE: 'İzin Kaldırma',
  ROLE_ASSIGN: 'Rol Atama',
  ROLE_REVOKE: 'Rol Kaldırma',
};

export const AUDIT_ACTION_COLORS: Record<AuditAction, string> = {
  CREATE: 'bg-emerald-100 text-emerald-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  LOGIN: 'bg-slate-100 text-slate-700',
  LOGOUT: 'bg-slate-100 text-slate-600',
  LOGIN_FAILED: 'bg-red-50 text-red-700',
  PASSWORD_CHANGE: 'bg-amber-100 text-amber-700',
  PASSWORD_RESET: 'bg-amber-100 text-amber-700',
  PERMISSION_GRANT: 'bg-purple-100 text-purple-700',
  PERMISSION_REVOKE: 'bg-purple-100 text-purple-700',
  ROLE_ASSIGN: 'bg-indigo-100 text-indigo-700',
  ROLE_REVOKE: 'bg-indigo-100 text-indigo-700',
};

export const AUDIT_RESOURCE_LABELS: Record<string, string> = {
  project: 'Proje',
  user: 'Kullanıcı',
  role: 'Rol',
  permission: 'İzin',
  tenant: 'Firma',
  auth: 'Kimlik',
};

export function formatDateTime(dateString: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(dateString));
}