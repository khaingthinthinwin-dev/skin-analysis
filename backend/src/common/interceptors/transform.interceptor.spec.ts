import { TransformInterceptor } from './transform.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { lastValueFrom } from 'rxjs';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<any>;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
  });

  it('should wrap response data in { data }', async () => {
    const context = {} as ExecutionContext;
    const callHandler: CallHandler = {
      handle: () => of({ name: 'test', value: 42 }),
    };

    const result$ = interceptor.intercept(context, callHandler);
    const result = await lastValueFrom(result$);

    expect(result).toEqual({ data: { name: 'test', value: 42 } });
  });

  it('should handle null data', async () => {
    const context = {} as ExecutionContext;
    const callHandler: CallHandler = {
      handle: () => of(null),
    };

    const result$ = interceptor.intercept(context, callHandler);
    const result = await lastValueFrom(result$);

    expect(result).toEqual({ data: null });
  });

  it('should handle array data', async () => {
    const context = {} as ExecutionContext;
    const callHandler: CallHandler = {
      handle: () => of([1, 2, 3]),
    };

    const result$ = interceptor.intercept(context, callHandler);
    const result = await lastValueFrom(result$);

    expect(result).toEqual({ data: [1, 2, 3] });
  });
});
