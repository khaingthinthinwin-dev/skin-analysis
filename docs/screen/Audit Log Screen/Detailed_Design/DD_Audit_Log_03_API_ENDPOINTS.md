# DD_AUDIT_03 — API Endpoints

> **Doc ID:** SKM-DD-AUDIT-03 | **Version:** 1.1 | **Status:** Draft  
> **Last Updated:** 2026-09-09

---

## 1. Controller Setup

- **File:** `src/modules/admin/audit-logs/audit-logs.controller.ts`
- **Base route:** `/api/v1/admin/audit-logs`
- **Guards:** `JwtAuthGuard`, then `RolesGuard`; every operation requires `@Roles('admin')`.
- **Declaration order:** Declare static routes (`/filters`) before `/:id`; otherwise `filters` can be captured as an ID.
- **Success response envelope:** `{ data: ... }`.
- **Error response envelope** (matches FDS §9.1): `{ statusCode, message, error, timestamp, path }`. `message` may be a string or string array. Example: `{ "statusCode": 400, "message": ["dateTo must be greater than or equal to dateFrom"], "error": "Bad Request", "timestamp": "2026-08-25T12:00:00.000Z", "path": "/api/v1/admin/audit-logs" }`.

## 2. GET /

Lists audit events joined with actor data. Query: `userId`, repeated `action` and `entityType` keys, `entityId`, `dateFrom`, `dateTo`, `ipAddress`, `search`, `page=1`, `limit=50`, `sortBy=created_at`, and `sortOrder=desc`. For example: `?action=merchant.approve&action=order.status_change`. A date-only `dateFrom` is normalized to the start of the UTC day; a date-only `dateTo` is normalized to the end of the UTC day. Datetime input must include a UTC offset.

```json
{ "data": { "items": [{ "id": "uuid", "userId": "uuid", "userName": "Ada", "userEmail": "a@example.com", "userRole": "admin", "action": "merchant.approve", "entityType": "Merchant", "entityId": "uuid", "summary": "Merchant approved", "ipAddress": "203.0.113.1", "createdAt": "2026-08-25T14:30:00.000Z" }], "meta": { "page": 1, "limit": 50, "total": 1, "totalPages": 1 } } }
```

Returns `200`; `400` malformed filters/paging/sort; `403` non-admin; `500` internal error. Default query is newest first. The service must parameterize all values and use AND semantics for supplied filters. Every sort appends `id` as a deterministic tie-breaker to prevent duplicate or missing rows across pages.

## 3. GET /filters

Returns distinct current values for dropdowns:

```json
{ "data": { "actions": ["merchant.approve"], "entityTypes": ["Merchant"] } }
```

Requires admin and returns `200`; do not expose sensitive values.

## 4. GET /:id

Returns one full audit entry with actor information and `oldValue`, `newValue`, `ipAddress`, and `userAgent`. `id` must be UUID. Returns `200`, `404` if absent, `403` if unauthorized, or `400` invalid ID.

## 5. POST /export

Accepts `ExportAuditLogsDto`: the same optional filtering properties as the list endpoint plus required `format: "csv"`. It validates valid dates, `dateTo >= dateFrom`, a maximum 365-day range, then counts matching rows before generation. More than 10,000 rows returns `400` and produces no file. The generated CSV columns are Timestamp, Actor Name, Actor Email, Actor Role, Action, Entity Type, Entity ID, Old Value, New Value, IP Address, and User Agent.

```json
{ "data": { "downloadUrl": "https://storage.example/audit-exports/uuid.csv?signature=...", "expiresAt": "2026-09-09T12:05:00.000Z" } }
```

The object remains private. `downloadUrl` is a signed, single-file URL that expires in five minutes; it must be generated only after the admin authorization check and must stop resolving after file deletion. Returns `200`; `400` invalid format/range/row cap; `403`; `500` generation/storage failure. This operation only reads audit records. A separately appended `audit.export` event is permitted but never changes exported records.

## 6. DELETE /files

Accepts `{ "olderThanDays": 90, "recordIds": ["uuid"], "fileIds": ["uuid"] }`. All fields are optional, but `olderThanDays` defaults to configured `AUDIT_LOG_MIN_RETENTION_DAYS` (90) and cannot be lower. `olderThanDays` is always validated server-side regardless of whether explicit IDs are provided. Explicit IDs must be UUIDs and are handled atomically: every requested target must exist and have `created_at < now - olderThanDays`, otherwise return `400` and delete nothing. With no IDs, delete all eligible records and generated CSV files older than the threshold in controlled batches. Current list/search filters are NOT used — deletion targets are determined solely by `olderThanDays` and explicit IDs.

```json
{ "data": { "deletedRecords": 12, "deletedFiles": 2 } }
```

Returns `200`; `400` for an invalid threshold, invalid IDs, or no eligible targets; `403` non-admin; `500` failure. The endpoint must not delete younger data and may append `audit.admin.delete` with the operation summary.

## 7. Operational Controls

All endpoints accept a JWT bearer token. The list/detail/filter/export endpoints are read-only with respect to `audit_logs`; no update endpoint exists. Use request correlation IDs, structured error logging without sensitive payload data, and rate/size safeguards appropriate to administrative reporting.

## 8. Cross-References

DTO definitions are in [DD_AUDIT_04](./DD_Audit_Log_04_DTOS_AND_TYPES.md); service flow is in [DD_AUDIT_05](./DD_Audit_Log_05_BUSINESS_LOGIC.md).
