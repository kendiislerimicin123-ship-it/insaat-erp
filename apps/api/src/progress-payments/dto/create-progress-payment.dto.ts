import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  MaxLength,
  MinLength,
  Matches,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PaymentStatusDto {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export class CreateProgressPaymentDto {
  @IsString()
  @IsNotEmpty({ message: 'Hakediş kodu zorunludur' })
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[A-Z0-9-]+$/, {
    message: 'Sadece büyük harf, rakam ve tire (-)',
  })
  code: string;

  @IsString()
  @IsNotEmpty({ message: 'Proje seçilmelidir' })
  projectId: string;

  @IsString()
  @IsNotEmpty({ message: 'Taşeron seçilmelidir' })
  subcontractorId: string;

  @IsString()
  @IsNotEmpty({ message: 'Dönem zorunludur' })
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'Dönem formatı YYYY-MM olmalı (örn: 2026-05)',
  })
  period: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Tutar 0 dan büyük olmalı' })
  amount: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  taxRate?: number; // varsayılan 20

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string; // varsayılan TRY

  @IsOptional()
  @IsEnum(PaymentStatusDto)
  status?: PaymentStatusDto;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  issuedAt?: string;
}