import { z } from 'zod';

export const AUDIT_LOG_MIN_RETENTION_DAYS = 90;
export const AUDIT_LOG_EXPORT_MAX_RANGE_DAYS = 365;
export const AUDIT_LOG_PAGE_SIZES = [10, 20, 50, 100] as const;
export const AUDIT_SORT_FIELDS = ['created_at', 'action', 'entity_type'] as const;

const uuidSchema = z.string().uuid();
const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === '' ? undefined : v));

export const auditLogQuerySchema = z
  .object({
    userId: uuidSchema.optional(),
    action: z.array(z.string()).optional(),
    entityType: z.array(z.string()).optional(),
    entityId: uuidSchema.optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    ipAddress: optionalTrimmed(45),
    search: optionalTrimmed(255),
    page: z.coerce.number().int().min(1).default(1),
    limit: z
      .union([z.literal('10'), z.literal('20'), z.literal('50'), z.literal('100'), z.number()])
      .default(10)
      .transform((v) => Number(v))
      .pipe(z.number().int().min(1).max(100)),
    sortBy: z.enum(AUDIT_SORT_FIELDS).default('created_at'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .refine(
    (v) => !(v.dateFrom && v.dateTo) || v.dateTo >= v.dateFrom,
    { message: 'dateTo must be after dateFrom', path: ['dateTo'] },
  );

export type AuditLogQueryState = z.infer<typeof auditLogQuerySchema>;

export const DEFAULT_AUDIT_LOG_QUERY: AuditLogQueryState = {
  ipAddress: undefined,
  search: undefined,
  page: 1,
  limit: 10,
  sortBy: 'created_at',
  sortOrder: 'desc',
};

export const deleteAuditLogsSchema = z.object({
  olderThanDays: z.coerce
    .number()
    .int()
    .min(AUDIT_LOG_MIN_RETENTION_DAYS, 'retentionMin'),
});

export type DeleteAuditLogsFormData = z.infer<typeof deleteAuditLogsSchema>;
