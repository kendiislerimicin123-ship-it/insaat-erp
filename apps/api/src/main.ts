import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
  const configService = app.get(ConfigService);

  // CORS — Frontend'in backend'e erişebilmesi için
  app.enableCors({
    origin: [
      'http://localhost:3000', // Next.js dev server
      // Production domain'leri sonra eklenecek
    ],
    credentials: true, // Cookies + auth header için
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO'da olmayan alanları sil
      forbidNonWhitelisted: true, // DTO dışı alan gelirse hata
      transform: true, // Type'ları otomatik convert et
    }),
  );

  // API prefix
  app.setGlobalPrefix('api');

  const port = configService.get<number>('PORT', 3001);
  await app.listen(port);

  logger.log(`🚀 İnşaat ERP API running on http://localhost:${port}/api`);
}

bootstrap();