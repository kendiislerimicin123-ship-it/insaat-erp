import { IsArray, IsString, ArrayMinSize } from 'class-validator';

export class UpdateUserRolesDto {
  /**
   * Kullanıcının yeni rol slug'ları.
   * Mevcut rollerin yerine geçer (idempotent).
   */
  @IsArray()
  @ArrayMinSize(1, { message: 'En az 1 rol atanmalı' })
  @IsString({ each: true })
  roleSlugs: string[];
}