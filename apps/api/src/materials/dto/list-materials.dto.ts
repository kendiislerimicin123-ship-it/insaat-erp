import { IsOptional, IsEnum, IsString, IsInt, Min, Max, IsBooleanString } from 'class-validator';
import { Type } from 'class-transformer';
import { MaterialCategoryDto, MaterialUnitDto } from './create-material.dto';

export class ListMaterialsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(MaterialCategoryDto)
  category?: MaterialCategoryDto;

  @IsOptional()
  @IsEnum(MaterialUnitDto)
  unit?: MaterialUnitDto;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBooleanString()
  lowStock?: string; // "true" → minStock altındakiler
}