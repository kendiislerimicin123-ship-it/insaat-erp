import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContextStore {
  tenantId: string;
  userId: string;
  userEmail: string;
  userRoles: string[];
}

/**
 * Request scope'da tenant ve user bilgisini taşır.
 * AsyncLocalStorage sayesinde her request kendi izole bağlamına sahiptir.
 * Prisma middleware ve service'ler buradan tenantId okur.
 */
@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<TenantContextStore>();

  /**
   * Verilen context içinde callback'i çalıştırır.
   * Bu callback ve onun çağırdığı her şey context'e erişebilir.
   */
  run<T>(context: TenantContextStore, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  /**
   * Mevcut tenant bağlamını döndürür.
   * Eğer bağlam yoksa (public endpoint) null döner.
   */
  getContext(): TenantContextStore | undefined {
    return this.storage.getStore();
  }

  /**
   * Mevcut tenant ID'sini döndürür.
   * Bağlam yoksa null döner — bu durumda Prisma middleware filtre eklemez.
   */
  getTenantId(): string | null {
    return this.storage.getStore()?.tenantId ?? null;
  }

  /**
   * Mevcut user ID'sini döndürür.
   */
  getUserId(): string | null {
    return this.storage.getStore()?.userId ?? null;
  }
}