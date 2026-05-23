import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  MaxLength,
  MinLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum EmployeeSpecialtyDto {
  FOREMAN = 'FOREMAN',
  MASTER = 'MASTER',
  APPRENTICE = 'APPRENTICE',
  LABORER = 'LABORER',
  OPERATOR = 'OPERATOR',
  DRIVER = 'DRIVER',
  TECHNICIAN = 'TECHNICIAN',
  ENGINEER = 'ENGINEER',
  OTHER = 'OTHER',
}

export enum EmployeeStatusDto {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  TERMINATED = 'TERMINATED',
  ARCHIVED = 'ARCHIVED',
}

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty({ message: 'Taşeron seçilmelidir' })
  subcontractorId: string;

  @IsString()
  @IsNotEmpty({ message: 'İşçi adı zorunludur' })
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(11)
  tcNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsEnum(EmployeeSpecialtyDto)
  specialty: EmployeeSpecialtyDto;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  role?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  dailyWage: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(EmployeeStatusDto)
  status?: EmployeeStatusDto;

  @IsOptional()
  @IsString()
  notes?: string;
}   