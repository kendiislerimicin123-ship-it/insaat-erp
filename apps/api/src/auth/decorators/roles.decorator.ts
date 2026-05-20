import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Endpoint'e erişebilecek rolleri belirler.
 * Örnek: @Roles('COMPANY_ADMIN', 'SUPER_ADMIN')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);