import { IsEmail, IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Geçerli bir email adresi girin' })
  @MaxLength(255)
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  // Tenant slug ile login (multi-tenant için)
  @IsString()
  @IsNotEmpty()
  companySlug: string;
}