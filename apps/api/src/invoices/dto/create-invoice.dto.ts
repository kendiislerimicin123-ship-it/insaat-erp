import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  MaxLength,
  Min,
  Max,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

// ════════════════════════════════════
// ENUM'LAR
// ════════════════════════════════════

export enum InvoiceTypeDto {
  PURCHASE = 'PURCHASE',
  SALES = 'SALES',
}

export enum InvoiceStatusDto {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export enum InvoicePaymentMethodDto {
  CASH = 'CASH',
  BANK = 'BANK',
  CHEQUE = 'CHEQUE',
  CREDIT_CARD = 'CREDIT_CARD',
  OTHER = 'OTHER',
}

export enum MaterialUnitDto {
  PIECE = 'PIECE',
  KG = 'KG',
  TON = 'TON',
  M = 'M',
  M2 = 'M2',
  M3 = 'M3',
  LITER = 'LITER',
  PACKAGE = 'PACKAGE',
  BOX = 'BOX',
  ROLL = 'ROLL',
}

// ════════════════════════════════════
// FATURA KALEMİ
// ════════════════════════════════════
// materialId boş bırakılırsa HİZMET kalemi sayılır (nakliye, işçilik,
// kiralama vb.) ve stok hareketi oluşturmaz.
// ════════════════════════════════════
export class InvoiceLineDto {
  @IsOptional()
  @IsString()
  materialId?: string;

  @IsString()
  @IsNotEmpty({ message: 'Kalem açıklaması zorunludur' })
  @MaxLength(500)
  description: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001, { message: 'Miktar 0\'dan büyük olmalıdır' })
  quantity: number;

  @IsOptional()
  @IsEnum(MaterialUnitDto)
  unit?: MaterialUnitDto;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0, { message: 'Birim fiyat negatif olamaz' })
  unitPrice: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100, { message: 'İskonto oranı %100\'den büyük olamaz' })
  discountRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100, { message: 'KDV oranı %100\'den büyük olamaz' })
  vatRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

// ════════════════════════════════════
// FATURA OLUŞTURMA
// ════════════════════════════════════
export class CreateInvoiceDto {
  @IsEnum(InvoiceTypeDto, {
    message: 'Fatura tipi PURCHASE (alış) veya SALES (satış) olmalıdır',
  })
  type: InvoiceTypeDto;

  @IsString()
  @IsNotEmpty({ message: 'Cari hesap zorunludur' })
  contactId: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  // ─── Belge bilgisi ───
  @IsOptional()
  @IsString()
  @MaxLength(100)
  invoiceNo?: string;

  @IsDateString({}, { message: 'Fatura tarihi geçerli olmalıdır (YYYY-MM-DD)' })
  invoiceDate: string;

  @IsOptional()
  @IsDateString({}, { message: 'Vade tarihi geçerli olmalıdır (YYYY-MM-DD)' })
  dueDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  waybillNo?: string;

  @IsOptional()
  @IsDateString()
  waybillDate?: string;

  // ─── Genel iskonto ve tevkifat ───
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100, { message: 'İskonto oranı %100\'den büyük olamaz' })
  discountRate?: number;

  // Tevkifat oranı: 2/10 = 20, 4/10 = 40, 9/10 = 90 şeklinde yüzde olarak
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100, { message: 'Tevkifat oranı %100\'den büyük olamaz' })
  withholdingRate?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  // ─── Ödeme ───
  @IsOptional()
  @IsEnum(InvoicePaymentMethodDto)
  paymentMethod?: InvoicePaymentMethodDto;

  // ─── e-Fatura (şimdilik manuel giriş) ───
  @IsOptional()
  @IsString()
  @MaxLength(10)
  serialNo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sequenceNo?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  // ─── KALEMLER ───
  @IsArray()
  @ArrayMinSize(1, { message: 'Fatura en az 1 kalem içermelidir' })
  @ArrayMaxSize(200, { message: 'Fatura en fazla 200 kalem içerebilir' })
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineDto)
  lines: InvoiceLineDto[];
}