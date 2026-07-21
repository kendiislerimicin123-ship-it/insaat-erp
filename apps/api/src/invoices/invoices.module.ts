import { Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { AuthModule } from '../auth/auth.module';

/**
 * InvoicesModule
 *
 * NOT: Bu modül başka servis inject ETMEZ. confirm/cancel metotları
 * kendi $transaction'ları içinde doğrudan Prisma'ya yazar — böylece
 * fatura onayı tam atomik olur (cari + stok + gider + çek hepsi bir
 * arada ya olur ya hiçbiri).
 *
 * Servis inject edilseydi (ExpensesService, MaterialsService vb.)
 * onlar kendi transaction'larını açacağı için bütünlük garantisi
 * kaybolurdu.
 */
@Module({
  imports: [AuthModule],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}  