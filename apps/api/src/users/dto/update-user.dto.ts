import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

/**
 * Update: password ve roleSlugs ayrı endpoint'lerden güncellenir.
 * Bu DTO sadece profil bilgilerini günceller.
 */
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password', 'roleSlugs', 'email'] as const),
) {}