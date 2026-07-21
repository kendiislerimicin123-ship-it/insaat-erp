import {
  IsOptional,
  IsEnum,
  IsString,
  IsDateString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  InvoiceTypeDto,
  InvoiceStatusDto,
  InvoicePaymentMethodDto,
} from './create-invoice.dto';

export class ListInvoicesDto {
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(InvoiceTypeDto)
  type?: InvoiceTypeDto;

  @IsOptional()
  @IsEnum(InvoiceStatusDto)
  status?: InvoiceStatusDto;

  @IsOptional()
  @IsString()
  contactId?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsEnum(InvoicePaymentMethodDto)
  paymentMethod?: InvoicePaymentMethodDto;

  // Fatura tarihine göre filtre
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  // Vade tarihine göre filtre
  @IsOptional()
  @IsDateString()
  dueFrom?: string;

  @IsOptional()
  @IsDateString()
  dueTo?: string;

  // Kod, fatura no, irsaliye no, notlarda arama
  @IsOptional()
  @IsString()
  search?: string;

  // Sadece vadesi geçmiş ödenmemiş faturalar
  @IsOptional()
  @IsString()
  overdueOnly?: string;
}

// ════════════════════════════════════
// İSTATİSTİK SORGUSU
// ════════════════════════════════════
export class InvoiceStatsDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  projectId?: string;
}