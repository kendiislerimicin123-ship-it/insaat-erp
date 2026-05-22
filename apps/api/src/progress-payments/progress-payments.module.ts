import { Module } from '@nestjs/common';
import { ProgressPaymentsService } from './progress-payments.service';
import { ProgressPaymentsController } from './progress-payments.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ProgressPaymentsController],
  providers: [ProgressPaymentsService],
  exports: [ProgressPaymentsService],
})
export class ProgressPaymentsModule {}