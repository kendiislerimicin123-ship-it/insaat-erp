import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(8, { message: 'Yeni şifre en az 8 karakter olmalı' })
  @MaxLength(100)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Şifre en az 1 büyük harf, 1 küçük harf ve 1 rakam içermeli',
  })
  newPassword: string;
}