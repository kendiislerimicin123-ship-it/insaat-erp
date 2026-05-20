import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Endpoint'e erişmek için gerekli izinleri belirler.
 * Format: 'resource.action'
 * Örnek: @RequirePermissions('user.create', 'user.update')
 *
 * Varsayılan davranış: TÜM izinler gerekli (AND mantığı)
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);