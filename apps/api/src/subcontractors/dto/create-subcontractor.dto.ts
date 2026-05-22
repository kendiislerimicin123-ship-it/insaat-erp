import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsEmail,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

export enum SubcontractorCategoryDto {
  EXCAVATION = 'EXCAVATION',
  CONCRETE = 'CONCRETE',
  FORMWORK = 'FORMWORK',
  REBAR = 'REBAR',
  MASONRY = 'MASONRY',
  PLASTER = 'PLASTER',
  PAINT = 'PAINT',
  TILE = 'TILE',
  ELECTRICAL = 'ELECTRICAL',
  PLUMBING = 'PLUMBING',
  HVAC = 'HVAC',
  CARPENTRY = 'CARPENTRY',
  ROOFING = 'ROOFING',
  INSULATION = 'INSULATION',
  LANDSCAPING = 'LANDSCAPING',
  CLEANING = 'CLEANING',
  OTHER = 'OTHER',
}

export enum SubcontractorStatusDto {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BLACKLISTED = 'BLACKLISTED',
  ARCHIVED = 'ARCHIVED',
}

export class CreateSubcontractorDto {
  @IsString()
  @IsNotEmpty({ message: 'Taşeron kodu zorunludur' })
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[A-Z0-9-]+$/, {
    message: 'Sadece büyük harf, rakam ve tire (-) kullanılabilir',
  })
  code: string;

  @IsString()
  @IsNotEmpty({ message: 'Firma adı zorunludur' })
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsEnum(SubcontractorCategoryDto)
  category?: SubcontractorCategoryDto;

  @IsOptional()
  @IsEnum(SubcontractorStatusDto)
  status?: SubcontractorStatusDto;

  // İletişim
  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactPerson?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Geçerli bir e-posta girin' })
  @MaxLength(255)
  email?: string;

  // Adres
  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  // Resmi
  @IsOptional()
  @IsString()
  @MaxLength(20)
  taxNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  taxOffice?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tradeRegistry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(34)
  iban?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}