import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { getAuditRequestContext } from './audit-request-context';

/** Audit insert methods: `audit_logs` is append-only, so only inserts matter. */
const AUDIT_INSERT_METHODS = ['create', 'createMany'] as const;

interface AuditDelegate {
  create: (args: unknown) => unknown;
  createMany: (args: unknown) => unknown;
}

interface WrappedAuditDelegate extends AuditDelegate {
  // Marks a delegate that is already wrapped so a transaction client opened
  // more than once is never double-wrapped.
  __auditRequestMetadata?: <T>(args: T) => T;
}

interface ClientWithAuditDelegate {
  auditLog?: WrappedAuditDelegate;
  $transaction?: (...args: unknown[]) => unknown;
}

/**
 * Returns `args` with the in-flight request's IP address and User-Agent added to
 * the row(s) being inserted, only for the fields the caller left empty.
 */
export function withAuditRequestMetadata<T>(args: T): T {
  if (args === null || typeof args !== 'object') return args;

  const context = getAuditRequestContext();
  if (!context) return args;

  const stamped = { ...(args as Record<string, unknown>) };
  const rows = stamped.data;
  if (rows === undefined) return args;

  const stampRow = (row: unknown): unknown => {
    if (row === null || typeof row !== 'object') return row;
    const merged: Record<string, unknown> = {
      ...(row as Record<string, unknown>),
    };
    // Values explicitly supplied by a caller always win.
    if (merged.userAgent == null && context.userAgent) {
      merged.userAgent = context.userAgent;
    }
    if (merged.ipAddress == null && context.ipAddress) {
      merged.ipAddress = context.ipAddress;
    }
    return merged;
  };

  stamped.data = Array.isArray(rows) ? rows.map(stampRow) : stampRow(rows);
  return stamped as T;
}

/**
 * Wraps the audit insert methods of one Prisma client (the shared client or a
 * transaction client) so each insert picks up the current request metadata.
 *
 * Decorates the delegate methods directly instead of using Prisma middleware:
 * `$use` no longer exists in the installed Prisma 6.19, and `$extends` returns a
 * *new* client, which would not affect the `PrismaService` singleton that the
 * other modules already inject.
 */
function installOnClient(client: unknown): void {
  const delegate = (client as ClientWithAuditDelegate | undefined)?.auditLog;
  if (!delegate) return;

  const stamp = withAuditRequestMetadata;
  // Idempotent: reuse the marker so repeat installs do not stack wrappers.
  if (delegate.__auditRequestMetadata === stamp) return;

  for (const method of AUDIT_INSERT_METHODS) {
    const original = delegate[method];
    if (typeof original !== 'function') continue;

    delegate[method] = function (this: unknown, args: unknown): unknown {
      return original.call(this, stamp(args));
    };
  }

  delegate.__auditRequestMetadata = stamp;
}

/**
 * Installs the audit request-metadata stamping on the shared Prisma client.
 *
 * Called from the provider constructor (not `onModuleInit`) because Nest
 * instantiates every provider before running lifecycle hooks, which guarantees
 * the hooks are in place before `PrismaService` connects and before any query
 * runs.
 */
export function installAuditRequestMetadata(prisma: PrismaService): void {
  const client = prisma as unknown as ClientWithAuditDelegate;
  installOnClient(client);

  const originalTransaction = client.$transaction;
  if (typeof originalTransaction !== 'function') return;

  // `$transaction` hands out a fresh transaction client whose audit delegate is
  // a different object, so it needs the same treatment. Only the interactive
  // (callback) form is wrapped; sequential transactions are forwarded as-is.
  client.$transaction = function (
    this: unknown,
    arg: unknown,
    ...rest: unknown[]
  ): unknown {
    if (typeof arg === 'function') {
      const callback = arg as (tx: unknown) => unknown;
      return originalTransaction.call(
        this,
        (tx: unknown) => {
          installOnClient(tx);
          return callback(tx);
        },
        ...rest,
      );
    }
    return originalTransaction.call(this, arg, ...rest);
  };
}

/**
 * Installs the stamping hooks when the module is initialised.
 */
@Injectable()
export class AuditRequestMetadataInitializer {
  constructor(prisma: PrismaService) {
    installAuditRequestMetadata(prisma);
  }
}
