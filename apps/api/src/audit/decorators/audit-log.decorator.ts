import { SetMetadata } from '@nestjs/common';

export const AUDIT_LOG_KEY = 'audit_log';

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

export interface AuditLogConfig {
  action: AuditAction;
  resource: string;
  resourceIdParam?: string;
}

/**
 * Endpoint'i audit'e dahil eder.
 * Örnek: @AuditLog({ action: 'CREATE', resource: 'project' })
 */
export const AuditLog = (config: AuditLogConfig) =>
  SetMetadata(AUDIT_LOG_KEY, config);