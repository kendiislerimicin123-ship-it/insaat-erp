import { Module } from '@nestjs/common';
import { ProgressPaymentsService } from './progress-payments.service';
import { ProgressPaymentsController } from './progress-payments.controller';
import { AuthModule } from '../auth/auth.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { ChequesModule } from '../cheques/cheques.module';

@Module({
  imports: [AuthModule, ExpensesModule, ChequesModule],
  controllers: [ProgressPaymentsController],
  providers: [ProgressPaymentsService],
  exports: [ProgressPaymentsService],
})
export class ProgressPaymentsModule {}