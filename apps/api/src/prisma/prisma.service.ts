import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@insaat-erp/database';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ PostgreSQL bağlantısı başarılı');
    } catch (error) {
      this.logger.error('❌ PostgreSQL bağlantı hatası', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('🔌 PostgreSQL bağlantısı kapatıldı');
  }

  async healthCheck(): Promise<{ ok: boolean; latency: number }> {
    const start = Date.now();
    await this.$queryRaw`SELECT 1`;
    return {
      ok: true,
      latency: Date.now() - start,
    };
  }
}