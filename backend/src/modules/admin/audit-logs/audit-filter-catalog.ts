/**
 * The complete filter vocabularies of the Audit Log screen: every audit
 * `action` and `entityType` this application can write into `audit_logs`.
 *
 * `GET /admin/audit-logs/filters` merges these catalogs with the DISTINCT
 * values already recorded, so the Action and Entity Type filters offer the
 * complete set even before a given value has happened once.
 *
 * NOTE: register every newly introduced audit action / entity type here,
 * otherwise the dropdowns only pick it up after the first occurrence.
 * Sources:
 * - admin/advertisement-management  (admin-ad-management, admin-ad-export)
 * - admin/audit-logs                (export self-audit, manual delete)
 * - admin/commission-revenue        (commission, revenue, export)
 * - admin/review-management         (reviews, reports, merchants, products, users)
 * - merchant/advertisements         (merchant ad submission lifecycle)
 * - prisma/seed.ts                  (demo rows)
 */

/** Every audit action the system can record. */
export const AUDIT_ACTION_CATALOG: readonly string[] = [
  // prisma/seed.ts (demo data)
  'APPROVE_MERCHANT',
  'PLACE_ORDER',

  // admin — advertisement management
  'AD_APPROVED',
  'AD_REJECTED',
  'BULK_AD_APPROVED',
  'BULK_AD_REJECTED',
  'FEE_CREATED',
  'FEE_UPDATED',
  'FEE_DEACTIVATED',
  'EXPORT_GENERATED',

  // admin — audit logs (self-audit events)
  'AUDIT_EXPORT',
  'AUDIT_LOG_DELETE',

  // admin — commission & revenue
  'COMMISSION_RATE_UPDATED',
  'TARGET_UPDATED',
  'PAYOUT_PROCESSED',
  'PAYOUT_DELETED',

  // admin — review & content moderation, user/merchant/product management
  'REVIEW_APPROVED',
  'REVIEW_REJECTED',
  'REVIEW_DELETED',
  'REPORT_CREATED',
  'REPORT_RESOLVED',
  'REPORT_REJECTED',
  'REPORT_DELETED',
  'MERCHANT_APPROVED',
  'MERCHANT_REJECTED',
  'PRODUCT_REACTIVATED',
  'PRODUCT_DEACTIVATED',
  'USER_ACTIVATED',
  'USER_DEACTIVATED',

  // merchant — advertisement submission lifecycle
  'AD_SELECTED',
  'AD_CONTENT_UPLOADED',
  'AD_PAID',
  'AD_UPDATED',
  'AD_DELETED',
  'AD_TOGGLED',
];

/** Every `entity_type` the system can record. */
export const AUDIT_ENTITY_TYPE_CATALOG: readonly string[] = [
  // prisma/seed.ts (demo data) — `merchant` is also used by moderation
  'merchant',
  'order',

  // admin — review & content moderation, user/product management
  'review',
  'report',
  'product',
  'user',

  // admin & merchant — advertisement management
  'Advertisement',
  'AdFeeSetting',

  // admin — audit logs (self-audit events)
  'AuditLog',

  // admin — commission & revenue
  'CommissionSetting',
  'Export',
  'Payout',
  'RevenueTarget',
];

/**
 * Catalog ∪ recorded values: de-duplicated and ascending, so values that exist
 * only in the table (legacy or renamed) are never dropped.
 */
function unionWithRecorded(
  catalog: readonly string[],
  recorded: readonly string[],
): string[] {
  return [...new Set([...catalog, ...recorded])].sort((a, b) =>
    a.localeCompare(b),
  );
}

/**
 * Pre-rename spelling of the manual-delete self-audit event. Hidden from the
 * Action filter (the label must read `AUDIT_LOG_DELETE` consistently with the
 * other self-audit actions); rows already stored with this value stay
 * filterable through `AUDIT_LOG_DELETE`.
 */
export const LEGACY_AUDIT_DELETE_ACTIONS: readonly string[] = [
  'audit.admin.delete',
];

/** Full action list: catalog ∪ the actions already present in `audit_logs`. */
export function mergeWithRecordedActions(
  recorded: readonly string[],
): string[] {
  const visible = recorded.filter(
    (action) => !LEGACY_AUDIT_DELETE_ACTIONS.includes(action),
  );
  return unionWithRecorded(AUDIT_ACTION_CATALOG, visible);
}

/** Full entity type list: catalog ∪ the types already present in `audit_logs`. */
export function mergeWithRecordedEntityTypes(
  recorded: readonly string[],
): string[] {
  return unionWithRecorded(AUDIT_ENTITY_TYPE_CATALOG, recorded);
}
