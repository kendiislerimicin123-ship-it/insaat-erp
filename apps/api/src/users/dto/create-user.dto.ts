import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  ArrayMinSize,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export enum UserStatusDto {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
}

export class CreateUserDto {
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

  @IsOptional()
  @IsEnum(UserStatusDto)
  status?: UserStatusDto;

  /**
   * Atanacak rol slug'ları (örn: ["PROJECT_MANAGER", "VIEWER"])
   * En az 1 rol verilmeli.
   */
  @IsArray()
  @ArrayMinSize(1, { message: 'En az 1 rol atanmalı' })
  @IsString({ each: true })
  roleSlugs: string[];
}