import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';
import {
  AUDIT_LOG_KEY,
  AuditLogConfig,
} from './decorators/audit-log.decorator';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const config = this.reflector.get<AuditLogConfig>(
      AUDIT_LOG_KEY,
      context.getHandler(),
    );

    // @AuditLog() decorator yoksa atla
    if (!config) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;
    const ipAddress = this.getClientIp(request);
    const userAgent = request.get('user-agent') as string | undefined;
    const method = request.method as string;
    const path = request.route?.path ?? request.url;

    const paramName = config.resourceIdParam ?? 'id';
    const resourceIdFromParam = request.params?.[paramName];

    return next.handle().pipe(
      tap({
        next: (response: unknown) => {
          const resourceId =
            resourceIdFromParam ||
            (response as { id?: string })?.id ||
            undefined;

          const newValues =
            config.action === 'CREATE' || config.action === 'UPDATE'
              ? (response as Record<string, unknown>)
              : undefined;

          const metadata = {
            method,
            path,
          };

          this.auditService.log({
            action: config.action,
            resource: config.resource,
            resourceId,
            newValues,
            metadata,
            tenantId: user?.tenantId,
            userId: user?.id,
            ipAddress,
            userAgent,
          });
        },
        error: () => {
          // Hata durumunda log yazmıyoruz
        },
      }),
    );
  }

  private getClientIp(req: {
    ip?: string;
    socket?: { remoteAddress?: string };
  }): string | undefined {
    return (req.ip || req.socket?.remoteAddress || '').replace('::ffff:', '') || undefined;
  }
}