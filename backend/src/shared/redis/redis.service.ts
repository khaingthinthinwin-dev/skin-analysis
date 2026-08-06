import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const redisUrl =
      this.configService.get<string>('redis.url') || 'redis://localhost:6379';
    this.client = new Redis(redisUrl);
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.set(key, value, 'EX', ttl);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async expire(key: string, ttl: number): Promise<void> {
    await this.client.expire(key, ttl);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async blacklistToken(token: string, ttl: number): Promise<void> {
    await this.client.set(`blacklist:${token}`, '1', 'EX', ttl);
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const result = await this.client.exists(`blacklist:${token}`);
    return result === 1;
  }

  getClient(): Redis {
    return this.client;
  }
}
