import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class PayProgressPaymentDto {
  @IsString()
  @IsNotEmpty({ message: 'Ödeme yöntemi zorunludur' })
  @MaxLength(50)
  paymentMethod: string; // Havale, EFT, Çek, Nakit

  @IsOptional()
  @IsString()
  @MaxLength(255)
  paymentRef?: string; // Banka işlem no, çek no vs.
}