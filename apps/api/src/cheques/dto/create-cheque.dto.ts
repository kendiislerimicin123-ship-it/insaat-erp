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

export enum ChequeKindDto {
  CHEQUE = 'CHEQUE',
  PROMISSORY_NOTE = 'PROMISSORY_NOTE',
}

export enum ChequeDirectionDto {
  INCOMING = 'INCOMING',
  OUTGOING = 'OUTGOING',
}

export enum ChequeStatusDto {
  PORTFOLIO = 'PORTFOLIO',
  ENDORSED = 'ENDORSED',
  DEPOSITED = 'DEPOSITED',
  COLLECTED = 'COLLECTED',
  PAID = 'PAID',
  BOUNCED = 'BOUNCED',
  CANCELLED = 'CANCELLED',
}

export class CreateChequeDto {
  @IsString()
  @IsNotEmpty({ message: 'Cari seçilmelidir' })
  contactId: string;

  @IsEnum(ChequeKindDto)
  kind: ChequeKindDto;

  @IsEnum(ChequeDirectionDto)
  direction: ChequeDirectionDto;

  @IsString()
  @IsNotEmpty({ message: 'Çek/Senet numarası zorunludur' })
  @MaxLength(50)
  chequeNo: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankBranch?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  drawer?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Tutar 0 dan büyük olmalı' })
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsDateString()
  issueDate: string;

  @IsDateString()
  dueDate: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateChequeStatusDto {
  @IsEnum(ChequeStatusDto)
  status: ChequeStatusDto;

  @IsOptional()
  @IsString()
  statusNote?: string;
}

export class ListChequesDto {
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
  @IsEnum(ChequeKindDto)
  kind?: ChequeKindDto;

  @IsOptional()
  @IsEnum(ChequeDirectionDto)
  direction?: ChequeDirectionDto;

  @IsOptional()
  @IsEnum(ChequeStatusDto)
  status?: ChequeStatusDto;

  @IsOptional()
  @IsDateString()
  dueFrom?: string;

  @IsOptional()
  @IsDateString()
  dueTo?: string;
}