# DD_AUDIT_03 — API Endpoints

> **Doc ID:** SKM-DD-AUDIT-03 | **Version:** 1.2 | **Status:** Draft  
> **Last Updated:** 2026-10-21

---

## 1. Controller Setup

- **File:** `src/modules/admin/audit-logs/audit-logs.controller.ts`
- **Base route:** `/api/v1/admin/audit-logs`
- **Guards:** `JwtAuthGuard`, then `RolesGuard`; every operation requires `@Roles('admin')`.
- **Declaration order:** Declare static routes (`/filters`) before `/:id`; otherwise `filters` can be captured as an ID.
- **Success response envelope:** `{ data: ... }`.
- **Error response envelope** (matches FDS §9.1): `{ statusCode, message, error, timestamp, path }`. `message` may be a string or string array. Example: `{ "statusCode": 400, "message": ["dateTo must be greater than or equal to dateFrom"], "error": "Bad Request", "timestamp": "2026-08-25T12:00:00.000Z", "path": "/api/v1/admin/audit-logs" }`.

## 2. GET /

Lists audit events joined with actor data. Query: `userId`, repeated `action` and `entityType` keys, `entityId`, `dateFrom`, `dateTo`, `ipAddress`, `search`, `page=1`, `limit=50`, `sortBy=created_at`, and `sortOrder=desc`. For example: `?action=MERCHANT_APPROVED&action=AD_REJECTED`. A date-only `dateFrom` is normalized to the start of the Myanmar Time day (00:00:00.000 +06:30); a date-only `dateTo` is normalized to the end of that day (23:59:59.999 +06:30). Datetime input must include a UTC offset.

```json
{ "data": { "items": [{ "id": "uuid", "userId": "uuid", "userName": "Ada", "userEmail": "a@example.com", "userRole": "admin", "action": "MERCHANT_APPROVED", "entityType": "merchant", "summary": "Merchant approved", "ipAddress": "203.0.113.1", "createdAt": "2026-08-25T14:30:00.000Z" }], "meta": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 } } }
```

`entityId` is deliberately absent from the response payload. Returns `200`; `400` malformed filters/paging/sort; `403` non-admin; `500` internal error. Default query is newest first. The service must parameterize all values and use AND semantics for supplied filters. Every sort appends `id` as a deterministic tie-breaker to prevent duplicate or missing rows across pages.

## 3. GET /filters

Returns the action and entity-type vocabularies for the dropdowns: the audit catalog merged with the values already recorded in `audit_logs` (de-duplicated and sorted). The legacy `audit.admin.delete` label is hidden; rows stored under it remain reachable through `AUDIT_LOG_DELETE`.

```json
{ "data": { "actions": ["AD_APPROVED", "AUDIT_EXPORT", "MERCHANT_APPROVED"], "entityTypes": ["Advertisement", "AuditLog", "merchant"] } }
```

Requires admin and returns `200`; do not expose sensitive values.

## 4. GET /:id

Returns one full audit entry with actor information and `oldValue`, `newValue`, `ipAddress`, and `userAgent`. `id` must be UUID. The payload never contains `entityId`. Returns `200`, `404` if absent, `403` if unauthorized, or `400` invalid ID.

## 5. POST /export

Accepts `ExportAuditLogsDto`: the same optional filtering properties as the list endpoint plus required `format: "csv"`. It validates valid dates, `dateTo >= dateFrom`, and a maximum 365-day range, then counts matching rows before generation. More than 10,000 rows returns `400` and produces no file. The generated CSV columns are Timestamp, Actor Name, Actor Email, Actor Role, Action, Entity Type, Old Value, New Value, IP Address, and User Agent (no Entity ID column). Timestamps are rendered in Myanmar Time, old/new values are masked JSON strings, the file is UTF-8 with a leading BOM and CRLF line endings, and the name is `audit-logs-startDate-endDate(today).csv` (all stamps are Myanmar dates).

The response is the file itself — there is no download URL and no stored object:

```http
HTTP/1.1 200 OK
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="audit-logs-2026-01-01-2026-01-31(2026-10-21).csv"
```

The operation only reads audit records. A separately appended `AUDIT_EXPORT` event is permitted but never changes exported records. Returns `200`; `400` invalid format/range/row cap; `403`; `500` generation failure.

## 6. DELETE /files

Accepts `{ "olderThanDays": 90, "recordIds": ["uuid"], "fileIds": ["uuid"] }`. All fields are optional, but `olderThanDays` defaults to configured `AUDIT_LOG_MIN_RETENTION_DAYS` (90) and cannot be lower. `olderThanDays` is always validated server-side regardless of whether explicit IDs are provided. Explicit IDs must be UUIDs and are handled atomically: every requested target must exist and have `created_at < now - olderThanDays`, otherwise return `400` and delete nothing. With no IDs, delete all eligible records older than the threshold in controlled batches. Current list/search filters are NOT used — deletion targets are determined solely by `olderThanDays` and explicit IDs. `fileIds` is accepted for API-contract compatibility only and is ignored: no export-file table exists, so `deletedFiles` is always `0`.

```json
{ "data": { "deletedRecords": 12, "deletedFiles": 0 } }
```

Returns `200`; `400` for an invalid threshold, invalid IDs, or no eligible targets; `403` non-admin; `500` failure. The endpoint must not delete younger data and appends an `AUDIT_LOG_DELETE` event with the operation summary.

## 7. Operational Controls

All endpoints accept a JWT bearer token. The list/detail/filter/export endpoints are read-only with respect to `audit_logs`; no update endpoint exists. Use request correlation IDs, structured error logging without sensitive payload data, and rate/size safeguards appropriate to administrative reporting.

## 8. Cross-References

DTO definitions are in [DD_AUDIT_04](./DD_Audit_Log_04_DTOS_AND_TYPES.md); service flow is in [DD_AUDIT_05](./DD_Audit_Log_05_BUSINESS_LOGIC.md).
