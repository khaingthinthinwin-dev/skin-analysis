import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import {
  AuditRequestContext,
  normalizeIpAddress,
  normalizeUserAgent,
  runWithAuditRequestContext,
} from './audit-request-context';

/**
 * Captures the caller's IP address and `User-Agent` header for the current
 * request and publishes them through `audit-request-context`.
 *
 * Registered app-wide from `AuditLogsModule` via `APP_INTERCEPTOR`, so any
 * module that writes to `audit_logs` gets the metadata stamped on its rows by
 * `fillAuditRequestMetadata` without threading the values through its own call
 * stack.
 */
@Injectable()
export class AuditRequestMetadataInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const auditContext: AuditRequestContext = {
      ipAddress: normalizeIpAddress(this.resolveIp(request)),
      userAgent: normalizeUserAgent(request.headers['user-agent']),
    };

    // The store must be active while the route handler is *subscribed*, not
    // only while the Observable is created: `next.handle()` is cold, so the
    // handler would otherwise run outside the captured context.
    return new Observable((subscriber) =>
      runWithAuditRequestContext(auditContext, () =>
        next.handle().subscribe(subscriber),
      ),
    );
  }

  /**
   * Resolves the *client* address, most authoritative source first:
   *
   * 1. `CF-Connecting-IP` / `X-Real-IP` — written (and overwritten) by the
   *    CDN/proxy itself, so a client cannot forge them.
   * 2. `X-Forwarded-For` — left-most entry, i.e. the client the first proxy
   *    saw; further entries are the proxy hops.
   * 3. `request.ip`, then the socket address — local/direct traffic, where the
   *    client and the server share the machine.
   *
   * Express' `trust proxy` is not configured app-wide, so the proxy headers
   * are read directly here rather than via `request.ip` (which would otherwise
   * report only the proxy's own address in a deployment).
   */
  private resolveIp(request: Request): string | undefined {
    const headerNames = [
      'cf-connecting-ip',
      'x-real-ip',
      'x-forwarded-for',
    ] as const;
    const fromHeader = headerNames
      .map((name) => {
        const raw = request.headers[name];
        const value = Array.isArray(raw) ? raw[0] : raw;
        return value?.split(',')[0]?.trim();
      })
      .find((value) => value !== undefined && value !== '');
    if (fromHeader) return fromHeader;

    if (request.ip) return request.ip;
    // Defensive: test doubles (and exotic adapters) may not expose a socket.
    const socket: { remoteAddress?: string } | undefined = request.socket;
    return socket?.remoteAddress;
  }
}
