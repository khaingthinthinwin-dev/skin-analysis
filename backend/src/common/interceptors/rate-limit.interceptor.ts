import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RedisService } from '../../shared/redis/redis.service';
import { Request, Response } from 'express';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
};

const STRICT_CONFIG: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10,
};

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  constructor(private readonly redisService: RedisService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const ip =
      request.ip ||
      (request.socket && 'remoteAddress' in request.socket
        ? request.socket.remoteAddress
        : undefined) ||
      'unknown';
    const path =
      'route' in request && request.route && typeof request.route === 'object'
        ? (request.route as { path?: string }).path || request.url
        : request.url;
    const config = this.getRateLimitConfig(path);

    return next.handle().pipe(
      tap({
        next: () => {
          void this.addRateLimitHeaders(response, ip, path, config);
        },
        error: (error: unknown) => {
          if (
            error instanceof HttpException &&
            error.getStatus() === Number(HttpStatus.TOO_MANY_REQUESTS)
          ) {
            void this.addRateLimitHeaders(response, ip, path, config);
          }
        },
      }),
    );
  }

  private getRateLimitConfig(path: string): RateLimitConfig {
    // Stricter rate limiting for auth endpoints
    if (path.includes('/auth/login') || path.includes('/auth/register')) {
      return STRICT_CONFIG;
    }
    return DEFAULT_CONFIG;
  }

  private async addRateLimitHeaders(
    response: Response,
    ip: string,
    path: string,
    config: RateLimitConfig,
  ): Promise<void> {
    try {
      const key = `ratelimit:${ip}:${path}`;
      const now = Date.now();
      const windowStart = now - config.windowMs;

      // Get current request count
      const redis = this.redisService.getClient();
      if (!redis) return;

      // Remove old entries
      await redis.zremrangebyscore(key, 0, windowStart);

      // Count current requests
      const currentCount = await redis.zcard(key);

      // Add current request
      await redis.zadd(key, now, `${now}`);
      await redis.expire(key, Math.ceil(config.windowMs / 1000));

      // Set rate limit headers
      response.setHeader('X-RateLimit-Limit', config.maxRequests);
      response.setHeader(
        'X-RateLimit-Remaining',
        Math.max(0, config.maxRequests - currentCount - 1),
      );
      response.setHeader(
        'X-RateLimit-Reset',
        Math.ceil((now + config.windowMs) / 1000),
      );
      response.setHeader(
        'X-RateLimit-Policy',
        `${config.maxRequests};w=${Math.ceil(config.windowMs / 1000)}`,
      );
    } catch (error) {
      // Silently fail - don't break the request if Redis is unavailable
      console.error('Rate limit header error:', error);
    }
  }
}
