import { Module } from '@nestjs/common';
import { ContactTransactionsService } from './contact-transactions.service';
import { ContactTransactionsController } from './contact-transactions.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ContactTransactionsController],
  providers: [ContactTransactionsService],
  exports: [ContactTransactionsService],
})
export class ContactTransactionsModule {}