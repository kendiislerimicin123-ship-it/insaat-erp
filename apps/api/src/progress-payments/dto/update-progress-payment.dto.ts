import { PartialType } from '@nestjs/mapped-types';
import { CreateProgressPaymentDto } from './create-progress-payment.dto';

export class UpdateProgressPaymentDto extends PartialType(
  CreateProgressPaymentDto,
) {}