import { IsOptional, IsEnum, IsString, IsInt, Min, Max, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentStatusDto } from './create-progress-payment.dto';

export class ListProgressPaymentsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(PaymentStatusDto)
  status?: PaymentStatusDto;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  subcontractorId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'Dönem formatı YYYY-MM olmalı',
  })
  period?: string;

  @IsOptional()
  @IsString()
  search?: string;
}