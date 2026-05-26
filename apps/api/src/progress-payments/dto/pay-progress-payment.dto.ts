import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { PaymentMethod } from '@insaat-erp/database';

export class PayProgressPaymentDto {
  @IsEnum(PaymentMethod, {
    message: 'Ödeme yöntemi geçersiz. Geçerli değerler: CASH, BANK, CHEQUE, CREDIT_CARD, OTHER',
  })
  @IsNotEmpty({ message: 'Ödeme yöntemi zorunludur' })
  paymentMethod: PaymentMethod; // CASH | BANK | CHEQUE | CREDIT_CARD | OTHER

  @IsOptional()
  @IsString()
  @MaxLength(255)
  paymentRef?: string; // Banka işlem no, dekont no vs.

  // ─── ÇEK BİLGİLERİ (sadece paymentMethod === 'CHEQUE' ise kullanılır) ───
  // Hepsi opsiyonel — kullanıcı doldurmak istemezse boş bırakabilir.
  // Backend, paymentMethod=CHEQUE olduğunda mevcut bilgilerle çek kaydı oluşturur.

  @IsOptional()
  @IsString()
  @MaxLength(50)
  chequeNo?: string; // Çek numarası (örn: "001234")

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankName?: string; // Banka adı (örn: "Ziraat Bankası")

  @IsOptional()
  @IsDateString({}, { message: 'Vade tarihi geçerli bir tarih olmalı (YYYY-MM-DD)' })
  dueDate?: string; // Vade tarihi (ISO format: 2026-06-15)
}