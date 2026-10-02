import { beforeEach, describe, expect, it } from '@jest/globals';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import {
  AuditRequestContext,
  getAuditRequestContext,
} from './audit-request-context';
import { AuditRequestMetadataInterceptor } from './audit-request-metadata.interceptor';

function createContext(
  headers: Record<string, string>,
  ip?: string,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers, ip }),
    }),
  } as unknown as ExecutionContext;
}

describe('AuditRequestMetadataInterceptor', () => {
  let interceptor: AuditRequestMetadataInterceptor;

  beforeEach(() => {
    interceptor = new AuditRequestMetadataInterceptor();
  });

  it('should expose the User-Agent and IP to the route handler', async () => {
    const userAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36';
    const context = createContext(
      { 'user-agent': userAgent },
      '::ffff:127.0.0.1',
    );

    let observed: AuditRequestContext | undefined;
    const callHandler: CallHandler = {
      handle: () => {
        observed = getAuditRequestContext();
        return of('response');
      },
    };

    const result = await lastValueFrom(
      interceptor.intercept(context, callHandler),
    );

    expect(result).toBe('response');
    expect(observed).toEqual({
      ipAddress: '127.0.0.1',
      userAgent,
    });
    // The context must not leak past the request.
    expect(getAuditRequestContext()).toBeUndefined();
  });

  it('should prefer X-Forwarded-For over the socket address', async () => {
    const context = createContext(
      { 'user-agent': 'Mozilla/5.0', 'x-forwarded-for': '203.0.113.1' },
      '::1',
    );

    let observed: AuditRequestContext | undefined;
    const callHandler: CallHandler = {
      handle: () => {
        observed = getAuditRequestContext();
        return of(null);
      },
    };

    await lastValueFrom(interceptor.intercept(context, callHandler));

    expect(observed?.ipAddress).toBe('203.0.113.1');
  });

  it('should prefer CF-Connecting-IP over the other proxy headers', async () => {
    const context = createContext(
      {
        'user-agent': 'Mozilla/5.0',
        'cf-connecting-ip': '198.51.100.4',
        'x-real-ip': '203.0.113.2',
        'x-forwarded-for': '203.0.113.1, 10.0.0.1',
      },
      '::1',
    );

    let observed: AuditRequestContext | undefined;
    const callHandler: CallHandler = {
      handle: () => {
        observed = getAuditRequestContext();
        return of(null);
      },
    };

    await lastValueFrom(interceptor.intercept(context, callHandler));

    expect(observed?.ipAddress).toBe('198.51.100.4');
  });

  it('should fall back to X-Real-IP when no forwarded chain is present', async () => {
    const context = createContext({ 'x-real-ip': '203.0.113.9' }, '::1');

    let observed: AuditRequestContext | undefined;
    const callHandler: CallHandler = {
      handle: () => {
        observed = getAuditRequestContext();
        return of(null);
      },
    };

    await lastValueFrom(interceptor.intercept(context, callHandler));

    expect(observed?.ipAddress).toBe('203.0.113.9');
  });

  it('should keep a real IPv6 client address reported by the proxy', async () => {
    const context = createContext(
      { 'x-forwarded-for': '2001:db8::8a2e:370:7334' },
      '::1',
    );

    let observed: AuditRequestContext | undefined;
    const callHandler: CallHandler = {
      handle: () => {
        observed = getAuditRequestContext();
        return of(null);
      },
    };

    await lastValueFrom(interceptor.intercept(context, callHandler));

    expect(observed?.ipAddress).toBe('2001:db8::8a2e:370:7334');
  });

  it('should fall back to the socket address and normalize loopback', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {},
          socket: { remoteAddress: '::1' },
        }),
      }),
    } as unknown as ExecutionContext;

    let observed: AuditRequestContext | undefined;
    const callHandler: CallHandler = {
      handle: () => {
        observed = getAuditRequestContext();
        return of(null);
      },
    };

    await lastValueFrom(interceptor.intercept(context, callHandler));

    expect(observed?.ipAddress).toBe('127.0.0.1');
  });

  it('should provide an empty context when the request has no metadata', async () => {
    const context = createContext({});

    let observed: AuditRequestContext | undefined;
    const callHandler: CallHandler = {
      handle: () => {
        observed = getAuditRequestContext();
        return of(null);
      },
    };

    await lastValueFrom(interceptor.intercept(context, callHandler));

    expect(observed).toEqual({
      ipAddress: undefined,
      userAgent: undefined,
    });
  });

  it('should leave the handler outside any context before it runs', () => {
    const context = createContext({ 'user-agent': 'Mozilla/5.0' });
    const callHandler: CallHandler = { handle: () => of(null) };

    // Creating the Observable must not activate the store.
    interceptor.intercept(context, callHandler);

    expect(getAuditRequestContext()).toBeUndefined();
  });
});
