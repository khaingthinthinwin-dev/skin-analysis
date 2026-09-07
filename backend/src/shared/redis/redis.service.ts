import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis | null = null;
  private connected = false;
  private readonly logger = new Logger(RedisService.name);

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const redisUrl =
      this.configService.get<string>('redis.url') || 'redis://localhost:6379';

    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      retryStrategy(times: number) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
    });

    this.client.on('connect', () => {
      this.connected = true;
    });

    this.client.on('ready', () => {
      this.connected = true;
    });

    this.client.on('error', (err) => {
      this.connected = false;
      this.logger.warn(`Redis unavailable: ${err.message}`);
    });

    this.client.on('close', () => {
      this.connected = false;
    });
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => {});
    }
  }

  isAvailable(): boolean {
    return this.connected && this.client !== null;
  }

  private ensureClient(): Redis {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    if (!this.isAvailable()) return null;
    return this.ensureClient()
      .get(key)
      .catch(() => null);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.isAvailable()) return;
    if (ttl) {
      await this.ensureClient()
        .set(key, value, 'EX', ttl)
        .catch(() => {});
    } else {
      await this.ensureClient()
        .set(key, value)
        .catch(() => {});
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isAvailable()) return;
    await this.ensureClient()
      .del(key)
      .catch(() => {});
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    const result = await this.ensureClient()
      .exists(key)
      .catch(() => 0);
    return result === 1;
  }

  async expire(key: string, ttl: number): Promise<void> {
    if (!this.isAvailable()) return;
    await this.ensureClient()
      .expire(key, ttl)
      .catch(() => {});
  }

  async incr(key: string): Promise<number> {
    if (!this.isAvailable()) return 0;
    return this.ensureClient()
      .incr(key)
      .catch(() => 0);
  }

  async blacklistToken(token: string, ttl: number): Promise<void> {
    await this.set(`blacklist:${token}`, '1', ttl);
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    return this.exists(`blacklist:${token}`);
  }

  async checkRateLimit(
    key: string,
    limit: number,
    window: number,
  ): Promise<boolean> {
    const current = await this.incr(key);

    if (current === 1) {
      await this.expire(key, window);
    }

    return current <= limit;
  }

  getClient(): Redis | null {
    return this.client;
  }
}
