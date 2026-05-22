import { IsOptional, IsEnum, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import {
  SubcontractorCategoryDto,
  SubcontractorStatusDto,
} from './create-subcontractor.dto';

export class ListSubcontractorsDto {
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
  @IsEnum(SubcontractorCategoryDto)
  category?: SubcontractorCategoryDto;

  @IsOptional()
  @IsEnum(SubcontractorStatusDto)
  status?: SubcontractorStatusDto;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  search?: string;
}