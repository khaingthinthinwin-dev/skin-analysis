import { TransformInterceptor } from './transform.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { lastValueFrom } from 'rxjs';
import { Response as ExpressResponse } from 'express';

function createContext(response?: Partial<ExpressResponse>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getResponse: () =>
        ({
          headersSent: false,
          writableEnded: false,
          ...response,
        }) as ExpressResponse,
    }),
  } as unknown as ExecutionContext;
}

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<any>;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
  });

  it('should wrap response data in { data }', async () => {
    const context = createContext();
    const callHandler: CallHandler = {
      handle: () => of({ name: 'test', value: 42 }),
    };

    const result$ = interceptor.intercept(context, callHandler);
    const result = await lastValueFrom(result$);

    expect(result).toEqual({ data: { name: 'test', value: 42 } });
  });

  it('should handle null data', async () => {
    const context = createContext();
    const callHandler: CallHandler = {
      handle: () => of(null),
    };

    const result$ = interceptor.intercept(context, callHandler);
    const result = await lastValueFrom(result$);

    expect(result).toEqual({ data: null });
  });

  it('should handle array data', async () => {
    const context = createContext();
    const callHandler: CallHandler = {
      handle: () => of([1, 2, 3] as unknown),
    };

    const result$ = interceptor.intercept(context, callHandler);
    const result = await lastValueFrom(result$);

    expect(result).toEqual({ data: [1, 2, 3] });
  });

  it('should return raw data without wrapping when headers are already sent', async () => {
    const context = createContext({ headersSent: true });
    const callHandler: CallHandler = {
      handle: () => of('some csv body'),
    };

    const result$ = interceptor.intercept(context, callHandler);
    const result = await lastValueFrom(result$);

    expect(result).toBe('some csv body');
  });

  it('should return raw data without wrapping when the response is ended', async () => {
    const context = createContext({ writableEnded: true });
    const callHandler: CallHandler = {
      handle: () => of(Buffer.from('binary')),
    };

    const result$ = interceptor.intercept(context, callHandler);
    const result = await lastValueFrom(result$);

    expect(result).toEqual(Buffer.from('binary'));
  });
});
