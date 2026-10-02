import { AsyncLocalStorage } from 'async_hooks';

export interface AuditRequestContext {
  ipAddress?: string;
  userAgent?: string;
}

// `audit_logs.ip_address` follows the 45-character contract used by
// ListAuditLogsDto (`@MaxLength(45)`), so normalize before persisting.
export const AUDIT_IP_MAX_LENGTH = 45;

// Defensive cap so a hostile client cannot push an unbounded header value into
// the audit table. Display truncation (200 characters, per AL-51) happens in
// the admin detail modal, not here.
export const AUDIT_USER_AGENT_MAX_LENGTH = 512;

const storage = new AsyncLocalStorage<AuditRequestContext>();

/**
 * Runs `callback` with the given audit context visible to every nested call,
 * including the shared Prisma client reached through any service below it.
 */
export function runWithAuditRequestContext<T>(
  context: AuditRequestContext,
  callback: () => T,
): T {
  return storage.run(context, callback);
}

/** Returns the audit context of the in-flight request, if any. */
export function getAuditRequestContext(): AuditRequestContext | undefined {
  return storage.getStore();
}

/**
 * Renders a single IP address in its canonical spelling for storage and
 * display:
 *
 * - the IPv4-mapped prefix is dropped, so `::ffff:127.0.0.1` → `127.0.0.1`
 * - the IPv6 loopback is written as the equivalent IPv4 loopback, so rows
 *   recorded on a machine where `localhost` resolved to `::1` read `127.0.0.1`
 *
 * Every other value — including a real remote IPv6 client address — is passed
 * through untouched. Returns `null` when there is nothing to show.
 */
export function formatIpAddress(raw?: string | null): string | null {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!value) return null;
  if (value === '::1') return '127.0.0.1';
  if (value.startsWith('::ffff:')) {
    return value.slice('::ffff:'.length) || null;
  }
  return value;
}

/**
 * Normalizes a raw request IP into a storable value: the first entry of
 * `X-Forwarded-For` when present (that entry is the client the first proxy
 * saw), rendered through `formatIpAddress` so `::ffff:127.0.0.1` is stored as
 * `127.0.0.1`.
 */
export function normalizeIpAddress(
  raw?: string | string[] | null,
): string | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return undefined;

  const first = value.split(',')[0].trim();
  if (!first) return undefined;

  const formatted = formatIpAddress(first);
  return formatted ? formatted.slice(0, AUDIT_IP_MAX_LENGTH) : undefined;
}

/**
 * Normalizes a raw `User-Agent` header: control characters are replaced so they
 * cannot corrupt the CSV output, and the value is capped in length.
 */
export function normalizeUserAgent(
  raw?: string | string[] | null,
): string | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return undefined;

  // eslint-disable-next-line no-control-regex
  const normalized = value.replace(/[\u0000-\u001F\u007F]+/g, ' ').trim();
  if (!normalized) return undefined;

  return normalized.slice(0, AUDIT_USER_AGENT_MAX_LENGTH);
}
