import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('API_PORT', 3001);
  const corsOrigin = configService.get<string>('CORS_ORIGIN', 'http://localhost:3000');

  // Global validation pipe — tüm DTO'lar otomatik validate edilir
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // CORS
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  // Global API prefix → tüm endpoint'ler /api ile başlar
  app.setGlobalPrefix('api');

  await app.listen(port);

  Logger.log(`🚀 İnşaat ERP API running on http://localhost:${port}/api`, 'Bootstrap');
}

bootstrap();