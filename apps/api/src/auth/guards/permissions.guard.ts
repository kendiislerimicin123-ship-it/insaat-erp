import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.permissions) {
      throw new ForbiddenException('Yetkilendirme bilgisi bulunamadı');
    }

    const userPermissions: string[] = user.permissions;

    // TÜM gerekli izinler kullanıcıda olmalı (AND mantığı)
    const missingPermissions = requiredPermissions.filter(
      (perm) => !userPermissions.includes(perm),
    );

    if (missingPermissions.length > 0) {
      this.logger.warn(
        `🚫 Yetkisiz erişim: ${user.email} → eksik izinler: ${missingPermissions.join(', ')}`,
      );
      throw new ForbiddenException(
        `Bu işlem için eksik izin(ler): ${missingPermissions.join(', ')}`,
      );
    }

    return true;
  }
}