import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsEmail,
  IsNumber,
  IsDateString,
  MaxLength,
  MinLength,
  Matches,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ProjectStatusDto {
  PLANNING = 'PLANNING',
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty({ message: 'Proje kodu zorunludur' })
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[A-Z0-9-]+$/, {
    message: 'Proje kodu sadece büyük harf, rakam ve tire (-) içerebilir',
  })
  code: string;

  @IsString()
  @IsNotEmpty({ message: 'Proje adı zorunludur' })
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ProjectStatusDto, {
    message: 'Geçersiz proje durumu',
  })
  status?: ProjectStatusDto;

  // Lokasyon
  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  // Müşteri
  @IsOptional()
  @IsString()
  @MaxLength(255)
  clientName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  clientTaxNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  clientPhone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Geçerli bir email girin' })
  @MaxLength(255)
  clientEmail?: string;

  // Bütçe
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Sözleşme bedeli geçersiz' })
  @Min(0, { message: 'Sözleşme bedeli negatif olamaz' })
  contractAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  // Süre (ISO 8601: "2026-05-20" formatı)
  @IsOptional()
  @IsDateString({}, { message: 'Başlangıç tarihi geçersiz format' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Bitiş tarihi geçersiz format' })
  endDate?: string;
}