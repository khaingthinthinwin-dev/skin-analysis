import { describe, expect, it } from 'vitest';
import {
  auditLogQuerySchema,
  deleteAuditLogsSchema,
  AUDIT_LOG_MIN_RETENTION_DAYS,
} from './auditLog.schema';
import { parseAuditLogQuery, countActiveFilters } from '../hooks/useAuditLogQuery';

describe('auditLogQuerySchema', () => {
  it('applies defaults', () => {
    const parsed = auditLogQuerySchema.parse({});
    expect(parsed).toMatchObject({
      page: 1,
      limit: 50,
      sortBy: 'created_at',
      sortOrder: 'desc',
    });
  });

  it('accepts multi-value action arrays and sorts fields', () => {
    const parsed = auditLogQuerySchema.parse({
      action: ['merchant.approve', 'order.status_change'],
      entityType: ['Merchant'],
      sortBy: 'action',
      sortOrder: 'asc',
      limit: '100',
    });
    expect(parsed.action).toEqual(['merchant.approve', 'order.status_change']);
    expect(parsed.limit).toBe(100);
    expect(parsed.sortBy).toBe('action');
  });

  it('rejects invalid UUID userId', () => {
    const result = auditLogQuerySchema.safeParse({ userId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects dateTo before dateFrom', () => {
    const result = auditLogQuerySchema.safeParse({
      dateFrom: '2026-02-01',
      dateTo: '2026-01-01',
    });
    expect(result.success).toBe(false);
  });

  it('rejects limit above 200', () => {
    const result = auditLogQuerySchema.safeParse({ limit: 500 });
    expect(result.success).toBe(false);
  });
});

describe('deleteAuditLogsSchema', () => {
  it('rejects retention below 90 days', () => {
    expect(
      deleteAuditLogsSchema.safeParse({ olderThanDays: 89 }).success,
    ).toBe(false);
  });

  it('accepts 90 days', () => {
    const parsed = deleteAuditLogsSchema.parse({
      olderThanDays: String(AUDIT_LOG_MIN_RETENTION_DAYS),
    });
    expect(parsed.olderThanDays).toBe(90);
  });
});

describe('parseAuditLogQuery', () => {
  it('hydrates multi-select arrays from repeated keys', () => {
    const params = new URLSearchParams(
      'action=merchant.approve&action=order.status_change&entityType=Merchant&page=2&limit=25&sortBy=action&sortOrder=asc',
    );
    expect(parseAuditLogQuery(params)).toMatchObject({
      action: ['merchant.approve', 'order.status_change'],
      entityType: ['Merchant'],
      page: 2,
      limit: 25,
      sortBy: 'action',
      sortOrder: 'asc',
    });
  });

  it('falls back to defaults for invalid UUID', () => {
    const params = new URLSearchParams('userId=oops');
    const parsed = parseAuditLogQuery(params);
    expect(parsed.userId).toBeUndefined();
    expect(parsed.page).toBe(1);
  });

  it('counts active filters', () => {
    const params = new URLSearchParams(
      'userId=aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee&search=ada&ipAddress=10.0.0.1',
    );
    expect(countActiveFilters(parseAuditLogQuery(params))).toBe(3);
  });
});
