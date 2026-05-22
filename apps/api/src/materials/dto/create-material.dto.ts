import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  MaxLength,
  MinLength,
  Matches,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum MaterialCategoryDto {
  CEMENT = 'CEMENT',
  AGGREGATE = 'AGGREGATE',
  STEEL = 'STEEL',
  TIMBER = 'TIMBER',
  BRICK_BLOCK = 'BRICK_BLOCK',
  TILE_CERAMIC = 'TILE_CERAMIC',
  PAINT_CHEMICAL = 'PAINT_CHEMICAL',
  ELECTRICAL = 'ELECTRICAL',
  PLUMBING = 'PLUMBING',
  HVAC = 'HVAC',
  INSULATION = 'INSULATION',
  ADHESIVE = 'ADHESIVE',
  HARDWARE = 'HARDWARE',
  TOOLS = 'TOOLS',
  SAFETY = 'SAFETY',
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

export class CreateMaterialDto {
  @IsString()
  @IsNotEmpty({ message: 'Malzeme kodu zorunludur' })
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[A-Z0-9-]+$/, {
    message: 'Sadece büyük harf, rakam ve tire (-)',
  })
  code: string;

  @IsString()
  @IsNotEmpty({ message: 'Malzeme adı zorunludur' })
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @IsEnum(MaterialCategoryDto)
  category: MaterialCategoryDto;

  @IsEnum(MaterialUnitDto)
  unit: MaterialUnitDto;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  minStock?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}