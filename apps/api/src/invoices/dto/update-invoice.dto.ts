import {
  IsString,
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
import { InvoiceLineDto, InvoicePaymentMethodDto } from './create-invoice.dto';

/**
 * Fatura güncelleme — sadece DRAFT durumundaki faturalar güncellenebilir.
 *
 * `lines` gönderilirse mevcut tüm kalemler silinip yenileri yazılır
 * (Timesheet modülündeki pattern ile aynı). Gönderilmezse kalemlere
 * dokunulmaz, sadece başlık alanları güncellenir.
 *
 * NOT: `type` ve `contactId` güncellenemez — fatura tipi ve carisi
 * değişecekse fatura silinip yeniden oluşturulmalıdır.
 */
export class UpdateInvoiceDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  invoiceNo?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Fatura tarihi geçerli olmalıdır (YYYY-MM-DD)' })
  invoiceDate?: string;

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
  @Max(100, { message: 'Tevkifat oranı %100\'den büyük olamaz' })
  withholdingRate?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsEnum(InvoicePaymentMethodDto)
  paymentMethod?: InvoicePaymentMethodDto;

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

  // Gönderilirse tüm kalemler değiştirilir
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Fatura en az 1 kalem içermelidir' })
  @ArrayMaxSize(200, { message: 'Fatura en fazla 200 kalem içerebilir' })
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineDto)
  lines?: InvoiceLineDto[];
}

// ════════════════════════════════════
// ÖDEME İŞARETLEME
// ════════════════════════════════════
export class PayInvoiceDto {
  @IsEnum(InvoicePaymentMethodDto, {
    message: 'Ödeme yöntemi zorunludur',
  })
  paymentMethod: InvoicePaymentMethodDto;

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  // ─── Çek bilgileri (sadece paymentMethod === 'CHEQUE' iken) ───
  // Bir faturadan birden fazla çek kesilebilir; her çek ayrı çağrıda
  // veya cheques dizisiyle gönderilir.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(24, { message: 'En fazla 24 taksit çeki oluşturulabilir' })
  @ValidateNested({ each: true })
  @Type(() => InvoiceChequeDto)
  cheques?: InvoiceChequeDto[];
}

export class InvoiceChequeDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  chequeNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankName?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Vade tarihi geçerli olmalıdır (YYYY-MM-DD)' })
  dueDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;
}

// ════════════════════════════════════
// İPTAL
// ════════════════════════════════════
export class CancelInvoiceDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}