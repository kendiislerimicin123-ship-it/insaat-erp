import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Tüm modüllerde PrismaService kullanılabilir, import'a gerek yok
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}