# Program Checklist (PCL) — Admin Audit Log

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-PCL-AUDIT-001 |
| **Target Screen** | Admin Audit Log (管理者監査ログ) |
| **Subsystem** | Audit Logging |
| **Version** | 1.0 |
| **Created** | 2026-10-14 |
| **Last Updated** | 2026-10-14 |
| **Status** | Active |

---

## 1. Normal Scenarios (N) — Happy Path

- [ ] **N-01**: Audit log page loads with log list
  - **Precondition**: Authenticated admin user; audit log records exist
  - **Steps**:
    1. Log in as admin
    2. Navigate to `/admin/audit-logs`
    3. Wait for the list to render
  - **Expected Result**: Page displays the audit log table with the log list, search input, and Export CSV button visible; entries sorted by `created_at DESC` (newest first), 50 entries per page
  - **Business Rules**: BR-AUDIT-020, BR-AUDIT-021, BR-AUDIT-040
  - **API**: `GET /api/v1/admin/audit-logs`
  - **Note**: Test scaffold exists in `e2e/tests/Audit_Log/audit-log.spec.ts` ("should display audit log page with log list") but the PCL item remains unchecked until the test passes and Evidence is recorded.

- [ ] **N-02**: Filter logs by action type
  - **Precondition**: Authenticated admin user on `/admin/audit-logs`; multiple action types exist in the data
  - **Steps**:
    1. Open the Action Filter dropdown (options loaded from `GET /api/v1/admin/audit-logs/filters`)
    2. Select one or more action types
    3. Apply the filter
  - **Expected Result**: Table refreshes showing only entries matching the selected action type(s); Active Filters badge count increments; Clear Filters link appears
  - **Business Rules**: BR-AUDIT-024, BR-AUDIT-025
  - **API**: `GET /api/v1/admin/audit-logs?action=...`
  - **Note**: Test scaffold exists in `audit-log.spec.ts` ("should filter logs by action type") with TODO steps; not yet verified.

- [ ] **N-03**: Filter logs by date range
  - **Precondition**: Authenticated admin user on `/admin/audit-logs`; audit records span multiple dates
  - **Steps**:
    1. Open the Date Range Filter
    2. Select a valid start date and end date
    3. Apply the filter
  - **Expected Result**: Table refreshes showing only entries within the selected date range (both `dateFrom` and `dateTo` sent)
  - **Business Rules**: BR-AUDIT-023, BR-AUDIT-024
  - **API**: `GET /api/v1/admin/audit-logs?dateFrom=...&dateTo=...`
  - **Note**: Test scaffold exists in `audit-log.spec.ts` ("should filter logs by date range") with TODO steps; not yet verified.

- [ ] **N-04**: View audit log detail
  - **Precondition**: Authenticated admin user; audit log list is displayed with at least one row
  - **Steps**:
    1. Click "View Detail" on a log row
    2. Inspect the Audit Log Detail Modal
  - **Expected Result**: Modal opens showing timestamp (full UTC), actor name/email/role, action, entity type, entity ID link, Old Value/New Value JSON code blocks (pretty-printed, sensitive fields masked), IP address, and truncated user agent
  - **Business Rules**: BR-AUDIT-002, BR-AUDIT-003, BR-AUDIT-004, BR-AUDIT-005, BR-AUDIT-006
  - **API**: `GET /api/v1/admin/audit-logs/:id`
  - **Note**: Test scaffold exists in `audit-log.spec.ts` ("should view audit log detail") with TODO steps; not yet verified.

- [ ] **N-05**: Export audit log as CSV
  - **Precondition**: Authenticated admin user; filtered list has results under the 10,000-row limit
  - **Steps**:
    1. Apply desired filters to the list
    2. Click "Export CSV"
    3. Wait for generation and download
  - **Expected Result**: Success toast shown; CSV file downloads containing the filtered rows with columns Timestamp, Actor Name, Actor Email, Actor Role, Action, Entity Type, Entity ID, Old Value, New Value, IP Address, User Agent; underlying audit log records are unchanged
  - **Business Rules**: BR-AUDIT-030, BR-AUDIT-031, BR-AUDIT-034, BR-AUDIT-035
  - **API**: `POST /api/v1/admin/audit-logs/export`
  - **Note**: Test scaffold exists in `audit-log.spec.ts` ("should export audit log as CSV") with TODO steps; not yet verified.

- [ ] **N-06**: Apply combined filters with free-text search and clear them
  - **Precondition**: Authenticated admin user on `/admin/audit-logs`
  - **Steps**:
    1. Enter a search query in the Search input (debounced 300ms)
    2. Add user filter, entity type filter, and IP address filter
    3. Verify combined results
    4. Click "Clear Filters"
  - **Expected Result**: All filters combine with AND logic; search matches against `action`, `entity_type`, and joined `users.name`/`users.email`; clicking Clear Filters resets all filters, hides the badge and link, and reloads the default list
  - **Business Rules**: BR-AUDIT-024, BR-AUDIT-025
  - **API**: `GET /api/v1/admin/audit-logs?search=...&userId=...&entityType=...&ipAddress=...`

- [ ] **N-07**: Pagination navigation and page size change
  - **Precondition**: Authenticated admin user; more than one page of audit log records exists
  - **Steps**:
    1. Click "Next" / a page number button
    2. Verify table and page info text update
    3. Change Page Size select to 100
    4. Click "Previous"
  - **Expected Result**: Page info shows "Showing {start}-{end} of {total}"; Previous disabled on first page, Next disabled on last page; changing page size resets to page 1 and refetches with the new limit
  - **Business Rules**: BR-AUDIT-021, BR-AUDIT-022
  - **API**: `GET /api/v1/admin/audit-logs?page=...&limit=...`

- [ ] **N-08**: View user history from detail modal
  - **Precondition**: Detail modal open for a log entry created by a real user (non-system action)
  - **Steps**:
    1. Click "View User History" in the detail modal
  - **Expected Result**: Modal closes; navigates to `/admin/audit-logs?userId={user_id}`; list refetches showing only entries by that user
  - **Business Rules**: BR-AUDIT-024
  - **API**: `GET /api/v1/admin/audit-logs?userId=...`

- [ ] **N-09**: View entity history from detail modal
  - **Precondition**: Detail modal open for a log entry with a non-null entity ID
  - **Steps**:
    1. Click "View Entity History" in the detail modal
  - **Expected Result**: Modal closes; navigates to `/admin/audit-logs?entityType={entity_type}&entityId={entity_id}`; list refetches showing only entries for that entity
  - **Business Rules**: BR-AUDIT-024
  - **API**: `GET /api/v1/admin/audit-logs?entityType=...&entityId=...`

- [ ] **N-10**: Auto-refresh toggles and polls at 30-second interval
  - **Precondition**: Authenticated admin user on `/admin/audit-logs` with active filters applied
  - **Steps**:
    1. Turn the Auto-Refresh toggle ON
    2. Wait 30 seconds
    3. Verify a read-only list request reuses current filters/sort/pagination
    4. Turn the toggle OFF
  - **Expected Result**: List re-queries every 30 seconds without losing filters; polling stops when disabled; existing data retained while refreshing
  - **Business Rules**: BR-AUDIT-020, BR-AUDIT-024
  - **API**: `GET /api/v1/admin/audit-logs`

- [ ] **N-11**: Manually delete audit logs and CSV files at or above the 90-day threshold
  - **Precondition**: Authenticated admin user; DB contains audit log records and/or CSV export files aged >= 90 days
  - **Steps**:
    1. Click "Delete Audit Logs" button
    2. Verify warning message and default retention value of 90 days
    3. Keep retention at 90 (or higher)
    4. Click "Confirm Delete"
  - **Expected Result**: Success toast with `deletedRecords` and `deletedFiles` counts; dialog closes; list refreshes; an optional `audit.admin.delete` audit event is appended; records younger than 90 days remain untouched
  - **Business Rules**: BR-AUDIT-001, BR-AUDIT-007, BR-AUDIT-041
  - **API**: `DELETE /api/v1/admin/audit-logs/files`

- [ ] **N-12**: Language toggle works on screen
  - **Precondition**: User is on `/admin/audit-logs`
  - **Steps**:
    1. Toggle language to Japanese / Myanmar
  - **Expected Result**: All UI labels (title, filters, table columns, buttons, dialog texts) update to the selected language
  - **Business Rules**: None (i18n)

- [ ] **N-13**: Theme toggle works on screen
  - **Precondition**: User is on `/admin/audit-logs`
  - **Steps**:
    1. Toggle theme to dark / light
  - **Expected Result**: Styling switches between dark and light modes; table, badges, and modal remain legible
  - **Business Rules**: None (UI)

- [ ] **N-14**: Responsive layout on desktop viewport
  - **Precondition**: Viewport >= 1024px
  - **Steps**:
    1. Set viewport to 1280x720
    2. Load `/admin/audit-logs`
  - **Expected Result**: Full table layout with all columns visible, horizontal filter bar, detail modal rendered as 400px side panel, delete dialog centered at 480px
  - **Business Rules**: None (Responsive)

- [ ] **N-15**: Responsive layout on mobile viewport
  - **Precondition**: Viewport < 768px
  - **Steps**:
    1. Set viewport to 375x667
    2. Load `/admin/audit-logs`
  - **Expected Result**: Card-based log list, stacked vertical filters, full-screen modal and dialog; layout stacks and scrolls correctly
  - **Business Rules**: None (Responsive)

---

## 2. Abnormal Scenarios (A) — Error & Negative Paths

- [ ] **A-01**: Access audit log route without authentication
  - **Precondition**: User is not logged in
  - **Steps**:
    1. Navigate directly to `/admin/audit-logs`
  - **Expected Result**: Redirect to `/login`; no audit log data is exposed
  - **Business Rules**: BR-AUDIT-040
  - **API**: `GET /api/v1/admin/audit-logs` → 401/403

- [ ] **A-02**: Access audit log route as non-admin role (buyer / merchant)
  - **Precondition**: Authenticated as buyer or merchant
  - **Steps**:
    1. Navigate directly to `/admin/audit-logs`
  - **Expected Result**: Redirect to Unauthorized page or 403 Forbidden; all audit endpoints return 403 for non-admin roles
  - **Business Rules**: BR-AUDIT-040
  - **API**: `GET /api/v1/admin/audit-logs` → 403 `FORBIDDEN`

- [ ] **A-03**: Set date range with end date before start date
  - **Precondition**: Authenticated admin user on `/admin/audit-logs`
  - **Steps**:
    1. Set `dateTo` earlier than `dateFrom`
    2. Apply the filter
  - **Expected Result**: Inline validation error "End date must be after start date" (red border); request blocked or API returns 400 with the same message
  - **Business Rules**: BR-AUDIT-023
  - **API**: `GET /api/v1/admin/audit-logs` → 400 `BAD_REQUEST`
  - **Note**: Error code VAL-AUDIT-003.

- [ ] **A-04**: Enter invalid Entity ID (non-UUID) in filter
  - **Precondition**: Authenticated admin user on `/admin/audit-logs`
  - **Steps**:
    1. Type "not-a-uuid" into the Entity ID filter
    2. Attempt to apply
  - **Expected Result**: Inline validation error "Invalid Entity ID format"; request not sent with invalid value
  - **Business Rules**: None (input validation)
  - **API**: `GET /api/v1/admin/audit-logs` → 400 `BAD_REQUEST` if sent
  - **Note**: Error code VAL-AUDIT-005.

- [ ] **A-05**: Export when filtered results exceed the 10,000-row limit
  - **Precondition**: Authenticated admin user; filters produce more than 10,000 matching records
  - **Steps**:
    1. Apply broad filters matching > 10,000 rows
    2. Click "Export CSV"
  - **Expected Result**: Toast error "Export exceeds maximum row limit (10,000). Please narrow your filters."; no CSV generated; no audit log records are deleted, archived, purged, or modified
  - **Business Rules**: BR-AUDIT-033, BR-AUDIT-034
  - **API**: `POST /api/v1/admin/audit-logs/export` → 400 `BAD_REQUEST`

- [ ] **A-06**: Export with date range exceeding 365 days
  - **Precondition**: Authenticated admin user
  - **Steps**:
    1. Set a date range wider than 365 days
    2. Click "Export CSV"
  - **Expected Result**: Toast error "Date range cannot exceed 365 days"; no file generated
  - **Business Rules**: BR-AUDIT-032
  - **API**: `POST /api/v1/admin/audit-logs/export` → 400 `BAD_REQUEST`
  - **Note**: Error code VAL-AUDIT-021.

- [ ] **A-07**: Confirm deletion with retention period below 90 days
  - **Precondition**: Authenticated admin user; Delete Audit Logs dialog open
  - **Steps**:
    1. Enter 89 (or lower) in the retention period input
  - **Expected Result**: Inline error "Retention period must be at least 90 days" (red border); Confirm Delete button disabled; API would return 400 "Minimum retention period is 90 days"
  - **Business Rules**: BR-AUDIT-001, BR-AUDIT-041
  - **API**: `DELETE /api/v1/admin/audit-logs/files` → 400 `BAD_REQUEST`
  - **Note**: Error code VAL-AUDIT-030.

- [ ] **A-08**: Confirm deletion when no eligible records or files exist
  - **Precondition**: Authenticated admin user; no records/files older than the retention threshold
  - **Steps**:
    1. Open Delete Audit Logs dialog
    2. Enter valid retention >= 90
    3. Click "Confirm Delete"
  - **Expected Result**: Error message "No records or files eligible for deletion (must be >= 90 days old)."; no data removed
  - **Business Rules**: BR-AUDIT-001, BR-AUDIT-041
  - **API**: `DELETE /api/v1/admin/audit-logs/files` → 400 `BAD_REQUEST`

- [ ] **A-09**: Non-admin calls delete endpoint directly
  - **Precondition**: Authenticated as buyer/merchant (or no token)
  - **Steps**:
    1. Call `DELETE /api/v1/admin/audit-logs/files` with a valid-looking body
  - **Expected Result**: HTTP 403 `FORBIDDEN`; "Access denied"; no records deleted
  - **Business Rules**: BR-AUDIT-040, BR-AUDIT-041
  - **API**: `DELETE /api/v1/admin/audit-logs/files` → 403

- [ ] **A-10**: Open detail for a non-existent audit log ID
  - **Precondition**: Authenticated admin user
  - **Steps**:
    1. Call `GET /api/v1/admin/audit-logs/:id` with a random UUID (or simulate a stale detail link)
  - **Expected Result**: HTTP 404 with standard error body; UI toast "Audit log entry not found"
  - **Business Rules**: None
  - **API**: `GET /api/v1/admin/audit-logs/:id` → 404 `NOT_FOUND`

- [ ] **A-11**: Server error during list load preserves existing data
  - **Precondition**: Admin has a loaded list; API returns 500 on subsequent request (e.g., failed auto-refresh)
  - **Steps**:
    1. Trigger a refresh/filter request that fails with 500
  - **Expected Result**: Existing list data remains unchanged; non-blocking error toast "Something went wrong. Please try again"; next interval may retry
  - **Business Rules**: None (error handling)
  - **API**: Any audit endpoint → 500 `INTERNAL_SERVER_ERROR`

- [ ] **A-12**: Attempt to modify an audit log record via API
  - **Precondition**: Authenticated admin user with a valid audit log ID
  - **Steps**:
    1. Attempt `PUT` / `PATCH` on `/api/v1/admin/audit-logs/:id`
  - **Expected Result**: HTTP 404/405 (no update endpoint exists); audit log records are never modified
  - **Business Rules**: BR-AUDIT-001, BR-AUDIT-042
  - **API**: `PUT|PATCH /api/v1/admin/audit-logs/:id` → not available

---

## 3. Boundary Scenarios (B) — Edge Cases & Limits

- [ ] **B-01**: Search input at maximum allowable length (255 chars)
  - **Precondition**: Authenticated admin user on `/admin/audit-logs`
  - **Steps**:
    1. Enter exactly 255 characters in the Search input
    2. Apply search
  - **Expected Result**: Input accepted; search request sent with the full query
  - **Business Rules**: BR-AUDIT-025
  - **API**: `GET /api/v1/admin/audit-logs?search=...`

- [ ] **B-02**: Search input exceeding maximum allowable length (256 chars)
  - **Precondition**: Authenticated admin user on `/admin/audit-logs`
  - **Steps**:
    1. Enter 256 characters in the Search input
  - **Expected Result**: Validation error "Search query too long" (red border) or input truncated to 255 chars; API returns 400 if sent
  - **Business Rules**: None (input validation)
  - **API**: `GET /api/v1/admin/audit-logs` → 400 `BAD_REQUEST`
  - **Note**: Error code VAL-AUDIT-006.

- [ ] **B-03**: IP address filter at 45 characters vs 46 characters
  - **Precondition**: Authenticated admin user on `/admin/audit-logs`
  - **Steps**:
    1. Enter an exactly 45-character value in the IP Address filter and apply
    2. Enter a 46-character value and apply
  - **Expected Result**: 45 chars accepted; 46 chars shows "IP address too long" or API returns 400
  - **Business Rules**: None (input validation)
  - **API**: `GET /api/v1/admin/audit-logs?ipAddress=...`
  - **Note**: Error code VAL-AUDIT-004.

- [ ] **B-04**: Retention period exactly at the 90-day minimum boundary
  - **Precondition**: Delete Audit Logs dialog open
  - **Steps**:
    1. Enter exactly 90 in the retention input
    2. Verify Confirm Delete is enabled
    3. Enter 89 and verify Confirm Delete becomes disabled
  - **Expected Result**: 90 accepted (minimum allowed); 89 rejected with inline error — the boundary is `>= 90`
  - **Business Rules**: BR-AUDIT-001, BR-AUDIT-041
  - **API**: `DELETE /api/v1/admin/audit-logs/files` (`olderThanDays: 90` valid; `89` → 400)

- [ ] **B-05**: Export date range at exactly 365 days vs 366 days
  - **Precondition**: Authenticated admin user
  - **Steps**:
    1. Set a date range of exactly 365 days and export
    2. Set a date range of 366 days and export
  - **Expected Result**: 365-day range accepted and CSV generated; 366-day range rejected with "Date range cannot exceed 365 days"
  - **Business Rules**: BR-AUDIT-032
  - **API**: `POST /api/v1/admin/audit-logs/export`

- [ ] **B-06**: Export row count at exactly 10,000 vs 10,001 rows
  - **Precondition**: Authenticated admin user; ability to produce precisely sized result sets
  - **Steps**:
    1. Apply filters matching exactly 10,000 rows, click Export CSV
    2. Apply filters matching 10,001 rows, click Export CSV
  - **Expected Result**: 10,000 rows exported successfully; 10,001 rows rejected with row-limit toast; no audit records mutated in either case
  - **Business Rules**: BR-AUDIT-033, BR-AUDIT-034
  - **API**: `POST /api/v1/admin/audit-logs/export`

- [ ] **B-07**: Page size options at min/max boundaries
  - **Precondition**: Authenticated admin user on `/admin/audit-logs`
  - **Steps**:
    1. Open Page Size select and verify options 25, 50, 100, 200
    2. Select 200 (maximum)
    3. Attempt to request limit=201 via API
  - **Expected Result**: All UI options accepted; limit=200 returns 200 OK; limit=201 returns 400 "Limit must be between 1 and 200"
  - **Business Rules**: BR-AUDIT-021, BR-AUDIT-022
  - **API**: `GET /api/v1/admin/audit-logs?limit=...`
  - **Note**: Error code VAL-AUDIT-010.

- [ ] **B-08**: Empty state when no records or no filter matches
  - **Precondition**: Database has 0 records for the current view (or filters match nothing)
  - **Steps**:
    1. Navigate to `/admin/audit-logs` with no data, or apply a search with no matches
  - **Expected Result**: Friendly empty state "No matching records were found." displayed instead of a blank table; Export CSV still visible (enabled regardless of result count)
  - **Business Rules**: None (UI)
  - **API**: `GET /api/v1/admin/audit-logs` → 200 with empty `data` and `meta.total = 0`

- [ ] **B-09**: User agent truncation at 200 characters in detail modal
  - **Precondition**: Detail modal open for an entry whose user agent string exceeds 200 characters
  - **Steps**:
    1. Open the detail modal
    2. Inspect the User Agent field
  - **Expected Result**: String truncated with "..." at 200 characters; full text available on hover
  - **Business Rules**: None (UI)
  - **API**: `GET /api/v1/admin/audit-logs/:id`

- [ ] **B-10**: Pagination with invalid page parameter (page = 0)
  - **Precondition**: Authenticated admin user
  - **Steps**:
    1. Call `GET /api/v1/admin/audit-logs?page=0`
  - **Expected Result**: HTTP 400 with "Page must be at least 1"
  - **Business Rules**: None (input validation)
  - **API**: `GET /api/v1/admin/audit-logs?page=0` → 400 `BAD_REQUEST`

---

## 4. Interface Scenarios (I) — API Contracts & Payloads

- [ ] **I-01**: `GET /api/v1/admin/audit-logs` — returns 200 with list and pagination
  - **Precondition**: Admin JWT provided; records exist
  - **Steps**:
    1. Call API with default params (`page=1`, `limit=50`, `sortBy=created_at`, `sortOrder=desc`)
  - **Expected Response**: Status code 200, JSON `{ data: [...], meta: { total, page, limit } }`; each item contains `id, userId, userName, userEmail, userRole, action, entityType, entityId, summary, ipAddress, createdAt`; sorted newest first
  - **Business Rules**: BR-AUDIT-020, BR-AUDIT-021, BR-AUDIT-040
  - **API**: `GET /api/v1/admin/audit-logs`

- [ ] **I-02**: `GET /api/v1/admin/audit-logs` — combined filters applied with AND logic
  - **Precondition**: Admin JWT provided; records exist across users/actions/entities
  - **Steps**:
    1. Call API with `userId`, `action`, `entityType`, `dateFrom`, `dateTo`, `ipAddress`, and `search` combined
  - **Expected Response**: Status code 200; only records satisfying ALL criteria returned; `meta.total` reflects the combined predicate count
  - **Business Rules**: BR-AUDIT-024, BR-AUDIT-025
  - **API**: `GET /api/v1/admin/audit-logs?...`

- [ ] **I-03**: `GET /api/v1/admin/audit-logs/filters` — returns 200 with distinct options
  - **Precondition**: Admin JWT provided; audit records exist
  - **Steps**:
    1. Call `GET /api/v1/admin/audit-logs/filters`
    2. Verify route is not swallowed by the `/:id` route
  - **Expected Response**: Status code 200, JSON `{ actions: string[], entityTypes: string[] }` from DISTINCT values
  - **Business Rules**: BR-AUDIT-040
  - **API**: `GET /api/v1/admin/audit-logs/filters`

- [ ] **I-04**: `GET /api/v1/admin/audit-logs/:id` — returns 200 with full detail DTO
  - **Precondition**: Admin JWT provided; existing audit log UUID
  - **Steps**:
    1. Call API with a valid audit log ID
  - **Expected Response**: Status code 200, JSON with `id, userId, userName, userEmail, userRole, action, entityType, entityId, oldValue, newValue, ipAddress, userAgent, createdAt`
  - **Business Rules**: BR-AUDIT-002, BR-AUDIT-003, BR-AUDIT-005, BR-AUDIT-006
  - **API**: `GET /api/v1/admin/audit-logs/:id`

- [ ] **I-05**: `GET /api/v1/admin/audit-logs/:id` — returns 404 for non-existent ID and 400 for invalid UUID
  - **Precondition**: Admin JWT provided
  - **Steps**:
    1. Call API with a random non-existent UUID
    2. Call API with a malformed ID (e.g., `abc`)
  - **Expected Response**: Step 1 → 404, JSON `{ statusCode: 404, error: "NOT_FOUND" }`; Step 2 → 400 Bad Request for invalid UUID format
  - **Business Rules**: None
  - **API**: `GET /api/v1/admin/audit-logs/:id`

- [ ] **I-06**: `POST /api/v1/admin/audit-logs/export` — returns 200 with download URL, read-only
  - **Precondition**: Admin JWT provided; valid payload with `format: 'csv'`; result set under 10,000 rows and range <= 365 days
  - **Steps**:
    1. Call API with valid request body (current filters + `format: 'csv'`)
    2. Verify audit_logs row count before and after
  - **Expected Response**: Status code 200, JSON `{ downloadUrl: string }`; export performs only SELECT/file-generation — zero audit log records deleted, archived, purged, or updated; CSV columns: Timestamp, Actor Name, Actor Email, Actor Role, Action, Entity Type, Entity ID, Old Value, New Value, IP Address, User Agent
  - **Business Rules**: BR-AUDIT-030, BR-AUDIT-031, BR-AUDIT-034, BR-AUDIT-043
  - **API**: `POST /api/v1/admin/audit-logs/export`

- [ ] **I-07**: `POST /api/v1/admin/audit-logs/export` — returns 400 for invalid format / range / row violations
  - **Precondition**: Admin JWT provided
  - **Steps**:
    1. Send payload with `format: 'xlsx'`
    2. Send payload with `dateFrom`/`dateTo` spanning > 365 days
    3. Send payload matching > 10,000 rows
  - **Expected Response**: All → HTTP 400 `BAD_REQUEST` with corresponding messages ("Export format must be CSV" / "Date range cannot exceed 365 days" / "Export exceeds maximum row limit (10,000). Please narrow your filters."); no file created
  - **Business Rules**: BR-AUDIT-030, BR-AUDIT-032, BR-AUDIT-033
  - **API**: `POST /api/v1/admin/audit-logs/export`

- [ ] **I-08**: `DELETE /api/v1/admin/audit-logs/files` — returns 200 with deletion counts
  - **Precondition**: Admin JWT provided; records/files aged >= 90 days exist
  - **Steps**:
    1. Call API with `{ olderThanDays: 90 }`
  - **Expected Response**: Status code 200, JSON `{ deletedRecords: number, deletedFiles: number }`; only records/files older than the threshold are removed; young records untouched
  - **Business Rules**: BR-AUDIT-001, BR-AUDIT-007, BR-AUDIT-041
  - **API**: `DELETE /api/v1/admin/audit-logs/files`

- [ ] **I-09**: `DELETE /api/v1/admin/audit-logs/files` — returns 400 for threshold below minimum
  - **Precondition**: Admin JWT provided
  - **Steps**:
    1. Call API with `{ olderThanDays: 89 }`
  - **Expected Response**: Status code 400 `BAD_REQUEST` with "Minimum retention period is 90 days"; no records deleted
  - **Business Rules**: BR-AUDIT-001, BR-AUDIT-041
  - **API**: `DELETE /api/v1/admin/audit-logs/files`

- [ ] **I-10**: All audit endpoints reject non-admin roles with 403
  - **Precondition**: Buyer or merchant JWT (or no token)
  - **Steps**:
    1. Call each endpoint (`GET list`, `GET filters`, `GET :id`, `POST export`, `DELETE files`) with a non-admin token
  - **Expected Response**: Every endpoint returns HTTP 403 `FORBIDDEN` (401 when unauthenticated); JwtAuthGuard + RolesGuard enforced
  - **Business Rules**: BR-AUDIT-040
  - **API**: All `/api/v1/admin/audit-logs*` endpoints

- [ ] **I-11**: Error response follows standard API format
  - **Precondition**: Any error scenario (e.g., invalid filter params)
  - **Steps**:
    1. Trigger an error on any audit endpoint
  - **Expected Response**: JSON contains `{ statusCode, message, error, timestamp, path }`
  - **Business Rules**: None
  - **API**: Any `/api/v1/admin/audit-logs*` endpoint

- [ ] **I-12**: Sensitive fields never appear unmasked in list / detail / export
  - **Precondition**: Audit records exist whose old/new values would otherwise include credentials
  - **Steps**:
    1. Fetch `GET /api/v1/admin/audit-logs` (list)
    2. Fetch `GET /api/v1/admin/audit-logs/:id` (detail)
    3. Fetch `POST /api/v1/admin/audit-logs/export` output
  - **Expected Response**: Passwords, access tokens, refresh tokens, and auth secrets are never present unmasked (`***`) in `oldValue`, `newValue`, or exported CSV columns
  - **Business Rules**: BR-AUDIT-002, BR-AUDIT-043
  - **API**: All read endpoints

---

## Sign-Off

| Item | Status |
|------|--------|
| Test scenarios defined (N, A, B, I) | ☑️ |
| E2E tests implemented | ☐ |
| PCL auto-update verified | ☐ |
| Next review date | 2026-10-31 |
