# DD_AUDIT_05 — Business Logic

> **Doc ID:** SKM-DD-AUDIT-05 | **Version:** 1.1 | **Status:** Draft  
> **Last Updated:** 2026-09-09

---

## 1. Service Responsibilities

`AuditLogService` validates administrative access, normalizes queries, reads/join audit data, generates sanitized exports, and coordinates retention-safe deletion. It never exposes an update operation for audit records.

## 2. List and Detail Algorithms

1. Guard verifies a valid JWT and `admin` role.
2. Normalize default paging and sorting; normalize a single or repeated action/entity query value to an array; reject unknown fields, invalid IDs/dates, or incomplete/descending date ranges. Normalize date-only values to UTC day boundaries and require an offset for datetime values.
3. Build parameterized predicates: all supplied filters use AND; text search applies to action, entity type, joined user name, and email.
4. Fetch matching rows and joined actor data; paginate and map to list DTOs. Append `id` as a stable secondary sort key. Null actor maps to System at presentation time.
5. Detail retrieval fetches exactly one row plus actor, returns 404 if absent, then masks sensitive JSON keys before response.

## 3. Export Algorithm

1. Validate `format='csv'`, all filters, complete date range when used, and maximum 365-day span.
2. Reuse the list predicate without pagination. Count rows first.
3. If count exceeds 10,000, fail `400` without storage, purge, archive, or other mutation of audit records.
4. Stream sanitized rows to CSV with the defined columns; escape CSV fields and serialize masked JSON safely.
5. Store the private object and `audit_export_files` metadata as completed. Return a signed, single-file URL with a five-minute expiry. An optional `audit.export` record describes the export but never modifies source data.

## 4. Manual Deletion Algorithm

1. Validate admin role and `olderThanDays >= AUDIT_LOG_MIN_RETENTION_DAYS`; use the configured default (90) if omitted.
2. Calculate UTC cutoff `now - olderThanDays`.
3. Select only requested records/files, or all candidates when no explicit IDs are provided, where `created_at < cutoff`.
4. For explicit IDs, reject the complete request if any target is absent or ineligible; otherwise delete precisely those targets. For retention-wide deletion, reject if no eligible target exists. Never broaden explicit-ID deletion to ineligible data.
5. Delete audit records and storage objects in controlled, transactional or compensating batches. Mark export metadata `DELETED` with `deletedAt` after its object is removed, preserving only the non-downloadable lifecycle trace. Report precise deleted counts.
6. Optionally append an `audit.admin.delete` event containing admin ID, counts, and threshold. No automatic or scheduled purge is allowed.

## 5. JSON Sanitization

Before persistence, response mapping, and CSV generation, recursively mask forbidden key names case-insensitively: `password`, `passwordHash`, `accessToken`, `refreshToken`, `token`, `secret`, and credentials. Do not rely solely on UI masking. Preserve JSON shape where practical and replace values with `***`.

## 6. Auto-Refresh Logic

The UI interval defaults to 30,000 ms. It invokes only the list read path with the current normalized query. Skip while a prior refresh is pending or the page is hidden. On error retain the last successful data, expose non-blocking feedback, and permit the next scheduled retry.

## 7. Entity Link Mapping

`Merchant → /admin/merchants/:id`, `Product → /admin/products/:id`, `Order → /admin/orders/:id`, `Advertisement → /admin/advertisements/:id`, `User → /admin/users/:id`. Unknown types or null IDs are plain text, not navigable links.

## 8. Performance and Integrity

Use indexes on user ID, action, entity type, entity ID, and created timestamp. Targets are ≤2s initial list, ≤1s filter/search, ≤500ms detail, and ≤5s for a 10,000-row export. SQL access uses Prisma/parameterized queries. Audit data remains append-only except the guarded retention deletion described above.

## 9. Cross-References

The externally visible contract is defined in [DD_AUDIT_03](./DD_Audit_Log_03_API_ENDPOINTS.md); test coverage is defined in [DD_AUDIT_06](./DD_Audit_Log_06_TEST_SPEC.md).
