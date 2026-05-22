import { Module } from '@nestjs/common';
import { SubcontractorsService } from './subcontractors.service';
import { SubcontractorsController } from './subcontractors.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SubcontractorsController],
  providers: [SubcontractorsService],
  exports: [SubcontractorsService],
})
export class SubcontractorsModule {}