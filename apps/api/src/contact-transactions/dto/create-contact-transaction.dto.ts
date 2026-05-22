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

export enum TransactionTypeDto {
  DEBT = 'DEBT',
  CREDIT = 'CREDIT',
  PAYMENT = 'PAYMENT',
  COLLECTION = 'COLLECTION',
}

export class CreateContactTransactionDto {
  @IsString()
  @IsNotEmpty({ message: 'Cari seçilmelidir' })
  contactId: string;

  @IsEnum(TransactionTypeDto)
  type: TransactionTypeDto;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Tutar 0 dan büyük olmalı' })
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  documentNo?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  bankReference?: string;
}

export class ListContactTransactionsDto {
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 50;

  @IsOptional()
  @IsString()
  contactId?: string;

  @IsOptional()
  @IsEnum(TransactionTypeDto)
  type?: TransactionTypeDto;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}