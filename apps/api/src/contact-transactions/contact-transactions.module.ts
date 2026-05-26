import { Module } from '@nestjs/common';
import { ContactTransactionsService } from './contact-transactions.service';
import { ContactTransactionsController } from './contact-transactions.controller';
import { AuthModule } from '../auth/auth.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { ChequesModule } from '../cheques/cheques.module';

@Module({
  imports: [AuthModule, ExpensesModule, ChequesModule],
  controllers: [ContactTransactionsController],
  providers: [ContactTransactionsService],
  exports: [ContactTransactionsService],
})
export class ContactTransactionsModule {}