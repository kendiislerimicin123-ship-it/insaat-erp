import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';

export class RegisterDto {
  // ─── Firma (Tenant) bilgileri ───
  @IsString()
  @IsNotEmpty({ message: 'Firma adı zorunludur' })
  @MinLength(2, { message: 'Firma adı en az 2 karakter olmalı' })
  @MaxLength(255)
  companyName: string;

  @IsString()
  @IsNotEmpty({ message: 'Firma slug zorunludur' })
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug sadece küçük harf, rakam ve tire (-) içerebilir',
  })
  companySlug: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  taxNumber?: string;

  // ─── Kullanıcı bilgileri ───
  @IsEmail({}, { message: 'Geçerli bir email adresi girin' })
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(8, { message: 'Şifre en az 8 karakter olmalı' })
  @MaxLength(100)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Şifre en az 1 büyük harf, 1 küçük harf ve 1 rakam içermeli',
  })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Ad zorunludur' })
  @MinLength(2)
  @MaxLength(100)
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Soyad zorunludur' })
  @MinLength(2)
  @MaxLength(100)
  lastName: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}