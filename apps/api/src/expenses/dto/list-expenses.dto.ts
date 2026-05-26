import { IsOptional, IsEnum, IsString, IsDateString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import {
  ExpenseCategoryDto,
  ExpenseStatusDto,
  PaymentMethodDto,
} from './create-expense.dto';

export class ListExpensesDto {
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(ExpenseCategoryDto)
  category?: ExpenseCategoryDto;

  @IsOptional()
  @IsEnum(ExpenseStatusDto)
  status?: ExpenseStatusDto;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  contactId?: string;

  @IsOptional()
  @IsString()
  subcontractorId?: string;

  @IsOptional()
  @IsEnum(PaymentMethodDto)
  paymentMethod?: PaymentMethodDto;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  search?: string;
}