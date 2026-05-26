import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ExpenseCategoryDto {
  OFFICE = 'OFFICE',
  VEHICLE = 'VEHICLE',
  PAYROLL_TAX = 'PAYROLL_TAX',
  EQUIPMENT = 'EQUIPMENT',
  UTILITIES = 'UTILITIES',
  PERMITS = 'PERMITS',
  INSURANCE = 'INSURANCE',
  CONSULTING = 'CONSULTING',
  FOOD = 'FOOD',
  TRANSPORTATION = 'TRANSPORTATION',
  COMMUNICATION = 'COMMUNICATION',
  ENTERTAINMENT = 'ENTERTAINMENT',
  OTHER = 'OTHER',
}

export enum ExpenseStatusDto {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethodDto {
  CASH = 'CASH',
  BANK = 'BANK',
  CHEQUE = 'CHEQUE',
  CREDIT_CARD = 'CREDIT_CARD',
  OTHER = 'OTHER',
}

export class CreateExpenseDto {
  @IsEnum(ExpenseCategoryDto)
  category: ExpenseCategoryDto;

  @IsOptional()
  @IsEnum(ExpenseStatusDto)
  status?: ExpenseStatusDto;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Tutar 0\'dan büyük olmalıdır' })
  amount: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  vatRate?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsDateString()
  date: string;

  @IsString()
  @IsNotEmpty({ message: 'Açıklama zorunludur' })
  @MaxLength(500)
  description: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  contactId?: string;

  @IsOptional()
  @IsString()
  subcontractorId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  invoiceNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  taxNumber?: string;

  @IsOptional()
  @IsEnum(PaymentMethodDto)
  paymentMethod?: PaymentMethodDto;

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  // ─── YENİ: ÇEK BİLGİLERİ (sadece paymentMethod === 'CHEQUE' iken kullanılır) ───
  @IsOptional()
  @IsString()
  @MaxLength(50)
  chequeNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankName?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Vade tarihi geçerli bir tarih olmalı (YYYY-MM-DD)' })
  dueDate?: string;
}