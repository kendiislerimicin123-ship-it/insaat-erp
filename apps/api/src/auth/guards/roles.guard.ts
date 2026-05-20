import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Decorator'dan gereken rolleri al
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // @Roles() yoksa serbest geç
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.roles) {
      throw new ForbiddenException('Yetkilendirme bilgisi bulunamadı');
    }

    // User'ın rolleri ile gereken rolleri kesişir mi?
    const userRoles: string[] = user.roles;
    const hasRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      this.logger.warn(
        `🚫 Yetkisiz erişim: ${user.email} (${userRoles.join(',')}) → gerekli: ${requiredRoles.join(',')}`,
      );
      throw new ForbiddenException(
        `Bu işlem için gerekli rol: ${requiredRoles.join(' veya ')}`,
      );
    }

    return true;
  }
}