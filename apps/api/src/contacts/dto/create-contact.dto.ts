import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsEmail,
  IsNumber,
  MaxLength,
  MinLength,
  Matches,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ContactTypeDto {
  SUPPLIER = 'SUPPLIER',
  CUSTOMER = 'CUSTOMER',
  BOTH = 'BOTH',
  BANK = 'BANK',
  GOVERNMENT = 'GOVERNMENT',
  OTHER = 'OTHER',
}

export enum ContactStatusDto {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BLACKLISTED = 'BLACKLISTED',
  ARCHIVED = 'ARCHIVED',
}

export class CreateContactDto {
  @IsString()
  @IsNotEmpty({ message: 'Cari kodu zorunludur' })
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[A-Z0-9-]+$/, {
    message: 'Sadece büyük harf, rakam ve tire (-)',
  })
  code: string;

  @IsString()
  @IsNotEmpty({ message: 'Firma/Kişi adı zorunludur' })
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @IsEnum(ContactTypeDto)
  type: ContactTypeDto;

  @IsOptional()
  @IsEnum(ContactStatusDto)
  status?: ContactStatusDto;

  // İletişim
  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactPerson?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Geçerli bir e-posta girin' })
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  // Adres
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

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  // Resmi
  @IsOptional()
  @IsString()
  @MaxLength(20)
  taxNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  taxOffice?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tradeRegistry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(34)
  iban?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankName?: string;

  // Cari ayarlar
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  paymentTerms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  creditLimit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}