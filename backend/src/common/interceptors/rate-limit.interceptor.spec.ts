import { RateLimitInterceptor } from './rate-limit.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { lastValueFrom } from 'rxjs';

interface MockRedisClient {
  zremrangebyscore: jest.Mock;
  zcard: jest.Mock;
  zadd: jest.Mock;
  expire: jest.Mock;
}

interface MockRedisService {
  getClient: jest.Mock;
}

const mockRedisService: MockRedisService = {
  getClient: jest.fn(),
};

describe('RateLimitInterceptor', () => {
  let interceptor: RateLimitInterceptor;

  beforeEach(() => {
    interceptor = new RateLimitInterceptor(mockRedisService as never);
    jest.clearAllMocks();
  });

  const mockRequest = (url = '/api/test', ip = '127.0.0.1') => ({
    ip,
    url,
    route: { path: url },
    socket: { remoteAddress: ip },
  });

  interface MockResponse {
    setHeader: jest.Mock;
    headersSent: boolean;
  }

  const mockResponse = (): MockResponse => ({
    setHeader: jest.fn(),
    headersSent: false,
  });

  const mockContext = (req: unknown, res: MockResponse): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
    }) as ExecutionContext;

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should use strict config for auth login', async () => {
    const redisMock: MockRedisClient = {
      zremrangebyscore: jest.fn(),
      zcard: jest.fn().mockResolvedValue(0),
      zadd: jest.fn(),
      expire: jest.fn(),
    };
    mockRedisService.getClient.mockReturnValue(redisMock);

    const req = mockRequest('/auth/login');
    const res = mockResponse();
    const context = mockContext(req, res);
    const callHandler: CallHandler = { handle: () => of('ok') };

    const result$ = interceptor.intercept(context, callHandler);
    await lastValueFrom(result$);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 10);
  });

  it('should use default config for other endpoints', async () => {
    const redisMock: MockRedisClient = {
      zremrangebyscore: jest.fn(),
      zcard: jest.fn().mockResolvedValue(0),
      zadd: jest.fn(),
      expire: jest.fn(),
    };
    mockRedisService.getClient.mockReturnValue(redisMock);

    const req = mockRequest('/api/products');
    const res = mockResponse();
    const context = mockContext(req, res);
    const callHandler: CallHandler = { handle: () => of('ok') };

    const result$ = interceptor.intercept(context, callHandler);
    await lastValueFrom(result$);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 100);
  });

  it('should not set headers if Redis unavailable', async () => {
    mockRedisService.getClient.mockReturnValue(null);

    const req = mockRequest();
    const res = mockResponse();
    const context = mockContext(req, res);
    const callHandler: CallHandler = { handle: () => of('ok') };

    const result$ = interceptor.intercept(context, callHandler);
    await lastValueFrom(result$);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(res.setHeader).not.toHaveBeenCalled();
  });

  it('should not set headers if response already sent', async () => {
    const redisMock: MockRedisClient = {
      zremrangebyscore: jest.fn(),
      zcard: jest.fn().mockResolvedValue(0),
      zadd: jest.fn(),
      expire: jest.fn(),
    };
    mockRedisService.getClient.mockReturnValue(redisMock);

    const req = mockRequest();
    const res = mockResponse();
    res.headersSent = true;
    const context = mockContext(req, res);
    const callHandler: CallHandler = { handle: () => of('ok') };

    const result$ = interceptor.intercept(context, callHandler);
    await lastValueFrom(result$);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(res.setHeader).not.toHaveBeenCalled();
  });

  it('should use strict config for auth register', async () => {
    const redisMock: MockRedisClient = {
      zremrangebyscore: jest.fn(),
      zcard: jest.fn().mockResolvedValue(0),
      zadd: jest.fn(),
      expire: jest.fn(),
    };
    mockRedisService.getClient.mockReturnValue(redisMock);

    const req = mockRequest('/auth/register');
    const res = mockResponse();
    const context = mockContext(req, res);
    const callHandler: CallHandler = { handle: () => of('ok') };

    const result$ = interceptor.intercept(context, callHandler);
    await lastValueFrom(result$);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 10);
  });
});
