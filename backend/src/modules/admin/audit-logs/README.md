# Audit Logs Module

## Ownership
- Developer Tag: `[ATM]`
- Primary Responsibility: Admin audit trail viewing, filtering, CSV export, and manual retention deletion (FN-AUDIT-001)

## Endpoints (all require `admin` role via JwtAuthGuard + RolesGuard)
- `GET /admin/audit-logs` - Paginated list with filters (userId, action[], entityType[], entityId, dateFrom/dateTo, ipAddress, search, page, limit, sortBy, sortOrder)
- `GET /admin/audit-logs/filters` - Distinct action / entity type options for dropdowns
- `GET /admin/audit-logs/:id` - Full detail with masked old/new JSON, IP, user agent
- `POST /admin/audit-logs/export` - Stream filtered results as CSV (read-only; max 365-day range, 10,000 rows)
- `DELETE /admin/audit-logs/files` - Delete records aged >= `AUDIT_LOG_MIN_RETENTION_DAYS` (90); explicit `recordIds` requests are atomic

## Notes
- Audit logs are append-only; the only mutation path is the guarded manual delete above.
- Time zone: `created_at` is stored and returned as a UTC instant, but everything this module renders or bounds is in Myanmar Time (MMT, a fixed UTC+06:30 with no DST) - date-only `dateFrom`/`dateTo` are widened to the Myanmar midnight boundaries of the named day, the CSV `Timestamp` column and the export filename stamps are MMT. The conversion is a fixed offset, so results do not depend on the server's OS time zone. A datetime value that carries an explicit offset is honoured as sent and is not re-anchored.
- CSV exports stream directly (no export-file storage table exists); `deletedFiles` is always 0.
- Sensitive keys (password/token/secret/...) are masked to `***` in detail responses and CSV output.
- Request metadata capture: an app-wide interceptor (`audit-request-metadata.interceptor.ts`, registered from this module via `APP_INTERCEPTOR`) captures the caller's IP and `User-Agent`, and `audit-request-metadata.installer.ts` stamps them onto every `audit_logs` insert (`create` / `createMany`, including transaction clients) that does not already provide them. Caller-supplied values are never overwritten, and writes made without a request context stay `NULL`.
- The CSV `User Agent` column is a one-line parsed summary of three parts (`Web Browser | Chrome 120 | Desktop`, built by `user-agent-summary.ts` with `ua-parser-js`) instead of the raw string; the detail endpoint still returns the raw `userAgent` so the frontend modal can render the same facts (Client Type / Browser / Device). The OS is deliberately omitted everywhere: Windows 11 still reports `Windows NT 10.0` in the User-Agent, so an OS label would be a guess. Historical rows written before this hook existed have `user_agent = NULL`, so the CSV `User Agent` column is empty for those older events; only events recorded after the hook runs carry a value.
- `entity_id` stays in the database (the list/export filters still accept `entityId`), but list and detail responses never return it - the UI does not display it.
- Self-audit events: this module records its own sensitive operations. `DELETE /files` appends `AUDIT_LOG_DELETE` (renamed from `audit.admin.delete` so the Action filter label matches the other uppercase actions; the old spelling is hidden from the filter options and still matches when filtering by `AUDIT_LOG_DELETE`), and a successful `POST /export` appends `AUDIT_EXPORT` (BR-AUDIT-035) with `newValue = { format, rowCount, filters }`. The export event is written after the read and row-cap check, so it never affects its own result set, and it carries filter values only - never exported row data. List/detail views are intentionally not logged because the 30-second auto-refresh would flood the table and consume the 10,000-row export budget.

