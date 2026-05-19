import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // .env dosyasını oku, tüm uygulamada erişilebilir yap
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env'],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}