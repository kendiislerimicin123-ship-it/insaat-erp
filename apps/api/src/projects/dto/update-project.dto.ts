import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsDateString } from 'class-validator';
import { CreateProjectDto } from './create-project.dto';

/**
 * Update DTO = Create DTO'nun tüm alanları opsiyonel hali.
 * Ek olarak actualEndDate (gerçek bitiş tarihi) güncellenebilir.
 */
export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  @IsOptional()
  @IsDateString({}, { message: 'Gerçek bitiş tarihi geçersiz format' })
  actualEndDate?: string;
}