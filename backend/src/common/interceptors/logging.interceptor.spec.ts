import { LoggingInterceptor } from './logging.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { lastValueFrom } from 'rxjs';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should log method, url, and elapsed time', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ method: 'GET', url: '/api/test' }),
      }),
    } as unknown as ExecutionContext;

    const callHandler: CallHandler = {
      handle: () => of('response'),
    };

    const result$ = interceptor.intercept(context, callHandler);
    await lastValueFrom(result$);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringMatching(/GET \/api\/test \d+ms/),
    );
  });

  it('should pass through the response data', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ method: 'POST', url: '/api/data' }),
      }),
    } as unknown as ExecutionContext;

    const callHandler: CallHandler = {
      handle: () => of({ result: 'ok' }),
    };

    const result$ = interceptor.intercept(context, callHandler);
    const result = await lastValueFrom(result$);

    expect(result).toEqual({ result: 'ok' });
  });
});
