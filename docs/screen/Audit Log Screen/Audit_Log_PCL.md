# Program Checklist (PCL) — Admin Audit Log

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-PCL-AUDIT-001 |
| **Target Screen** | Admin Audit Log (管理者監査ログ) |
| **Subsystem** | Audit Logging |
| **Version** | 1.3 |
| **Created** | 2026-10-14 |
| **Last Updated** | 2026-10-21 |
| **Status** | Active |

> Scope: route `/admin/audit-logs` (admin + super_admin, `ProtectedRoute` role guard). The screen is read-only apart from the manual retention delete: there is no back-navigation button, no User/Entity ID filter input (`userId`/`entityId` are URL-only parameters), no Entity ID column, and no user/entity history shortcuts — `entityId` is never returned by the API. CSV exports are streamed to the browser (no stored export file), so deletion only ever removes DB records. All timestamps shown in the UI are Myanmar Time (UTC+6:30).

---

## 1. Normal Scenarios (N) — Happy Path

- [ ] **N-01**: Audit log page loads with log list
  - **Precondition**: Authenticated admin user; audit log records exist
  - **Steps**:
    1. Log in as admin
    2. Navigate to `/admin/audit-logs`
    3. Wait for the list to render
  - **Expected Result**: Page displays the audit log table with the log list, search input, Auto-Refresh toggle, Export CSV and Delete Audit Logs buttons visible; entries sorted by `created_at DESC` (newest first), 10 entries per page by default (page-size options: 10, 20, 50, 100)
  - **Business Rules**: BR-AUDIT-020, BR-AUDIT-021, BR-AUDIT-040
  - **API**: `GET /api/v1/admin/audit-logs`
  - **Note**: Test scaffold exists in `e2e/tests/Audit_Log/audit-log.spec.ts` ("should display audit log page with log list") but the PCL item remains unchecked until the test passes and Evidence is recorded.

- [ ] **N-02**: Filter logs by action type
  - **Precondition**: Authenticated admin user on `/admin/audit-logs`; multiple action types exist in the data
  - **Steps**:
    1. Open the Action multi-select (button with listbox popup; options loaded from `GET /api/v1/admin/audit-logs/filters`)
    2. Select one or more action types (checkboxes; the button summary shows "N selected")
    3. Selections apply immediately — there is no Apply button; "Clear selection" empties the multi-select
  - **Expected Result**: Table refreshes showing only entries matching the selected action type(s) — each selection triggers an immediate refetch; Active Filters badge count increments; Clear Filters link appears
  - **Business Rules**: BR-AUDIT-024, BR-AUDIT-025
  - **API**: `GET /api/v1/admin/audit-logs?action=...`
  - **Note**: Test scaffold exists in `audit-log.spec.ts` ("should filter logs by action type") with TODO steps; not yet verified.

- [ ] **N-03**: Filter logs by date range
  - **Precondition**: Authenticated admin user on `/admin/audit-logs`; audit records span multiple dates
  - **Steps**:
    1. Open the From/To date pickers (custom calendar popups)
    2. Select a valid start date and end date
  - **Expected Result**: The range applies automatically once BOTH dates are set (no Apply button); selecting only one end of the range sends nothing; table refreshes showing only entries within the selected range (`dateFrom` and `dateTo` sent together as Myanmar day boundaries); an inverted range is blocked client-side (see A-03)
  - **Business Rules**: BR-AUDIT-023, BR-AUDIT-024
  - **API**: `GET /api/v1/admin/audit-logs?dateFrom=...&dateTo=...`
  - **Note**: The date picker is a custom calendar popup (not the native browser picker) and its month/weekday labels are fixed Japanese text in every locale — verify the selected ISO date, not the surrounding glyphs.
  - **Note**: Test scaffold exists in `audit-log.spec.ts` ("should filter logs by date range") with TODO steps; not yet verified.

- [ ] **N-04**: View audit log detail
  - **Precondition**: Authenticated admin user; audit log list is displayed with at least one row
  - **Steps**:
    1. Click "View Detail" on a log row
    2. Inspect the Audit Log Detail Modal
  - **Expected Result**: Modal opens showing timestamp rendered in Myanmar Time (MMT, `YYYY/MM/DD HH:mm:ss.SSS MMT`), actor name/email/role, action, entity type, Old Value/New Value sections rendered as humanized key-value lists (sensitive fields masked as `***`), IP address, and a Client Information section with the user agent parsed into client type (Web Browser / Mobile App / API Client / Unknown), browser, and device — the raw user agent string and the entity ID are never displayed
  - **Business Rules**: BR-AUDIT-002, BR-AUDIT-003, BR-AUDIT-004, BR-AUDIT-005, BR-AUDIT-006
  - **API**: `GET /api/v1/admin/audit-logs/:id`
  - **Note**: Test scaffold exists in `audit-log.spec.ts` ("should view audit log detail") with TODO steps; not yet verified.

- [ ] **N-05**: Export audit log as CSV
  - **Precondition**: Authenticated admin user; current filtered list has results (meta.total > 0)
  - **Steps**:
    1. Apply desired filters to the list
    2. Click "Export CSV" — the Export CSV date-range dialog opens (Start/End Date pre-filled from the current list date filters, if any)
    3. Select a Start Date and End Date (both required)
    4. Click "Export CSV" in the dialog to confirm
  - **Expected Result**: Dialog blocks invalid ranges with inline errors before any request; on success the CSV file downloads directly (streamed attachment, filename `audit-logs-startDate-endDate(today).csv`, Myanmar dates) and a success toast "CSV export downloaded" is shown; CSV columns are Timestamp, Actor Name, Actor Email, Actor Role, Action, Entity Type, Old Value, New Value, IP Address, User Agent (no Entity ID column); only the rows matching the current list filters AND the chosen date range are exported; the export is read-only with respect to the exported rows but appends an `AUDIT_EXPORT` self-audit event (admin, filters, row count, format) to `audit_logs`; underlying exported audit log records are unchanged; if the filtered list has 0 rows, an info toast "No matching records to export" appears and the dialog does not open
  - **Business Rules**: BR-AUDIT-030, BR-AUDIT-031, BR-AUDIT-034, BR-AUDIT-035
  - **API**: `POST /api/v1/admin/audit-logs/export`
  - **Note**: Test scaffold exists in `audit-log.spec.ts` ("should export audit log as CSV") with TODO steps; not yet verified.

- [ ] **N-06**: Apply combined filters with free-text search and clear them
  - **Precondition**: Authenticated admin user on `/admin/audit-logs`
  - **Steps**:
    1. Enter a search query in the Search input (debounced 300ms, capped at 255 chars)
    2. Add entity type filter (multi-select) and IP address filter
    3. Verify combined results
    4. Click "Clear Filters"
  - **Expected Result**: All filters combine with AND logic; search matches against `action`, `entity_type`, and joined `users.name`/`users.email`; clicking Clear Filters resets all filter params (page/limit/sort are kept), hides the badge and link, and reloads the list. Note: there is no user filter input in the filter bar — a `userId` filter can only be supplied via the URL query parameter (see N-08)
  - **Business Rules**: BR-AUDIT-024, BR-AUDIT-025
  - **API**: `GET /api/v1/admin/audit-logs?search=...&userId=...&entityType=...&ipAddress=...`

- [ ] **N-07**: Pagination navigation and page size change
  - **Precondition**: Authenticated admin user; more than one page of audit log records exists
  - **Steps**:
    1. Click "Next" / a page number button
    2. Verify table and page info text update
    3. Change the Rows-per-page select to 100 (options: 10, 20, 50, 100)
    4. Click "Prev"
  - **Expected Result**: Page info shows "Showing page {page} of {totalPages}"; Prev disabled on first page, Next disabled on last page; changing page size resets to page 1 and refetches with the new limit
  - **Business Rules**: BR-AUDIT-021, BR-AUDIT-022
  - **API**: `GET /api/v1/admin/audit-logs?page=...&limit=...`

- [ ] **N-08**: Filter list by user via URL query parameter
  - **Precondition**: Authenticated admin user; audit entries exist created by a real user (non-system action)
  - **Steps**:
    1. Navigate to `/admin/audit-logs?userId={user_id}`
  - **Expected Result**: List refetches showing only entries by that user; the userId counts toward the Active Filters badge; a non-UUID userId in the URL is ignored (falls back to the default list). Note: the detail modal has no "View User History" button — userId filtering is URL-driven only
  - **Business Rules**: BR-AUDIT-024
  - **API**: `GET /api/v1/admin/audit-logs?userId=...`

- [ ] **N-09**: Filter list by entity via URL query parameter
  - **Precondition**: Authenticated admin user; audit entries exist with a non-null entity ID
  - **Steps**:
    1. Navigate to `/admin/audit-logs?entityType={entity_type}&entityId={entity_id}`
  - **Expected Result**: List refetches showing only entries for that entity; both params count toward the Active Filters badge; a non-UUID entityId in the URL is ignored. Note: the detail modal has no "View Entity History" button and never displays the entity ID — entity filtering is URL-driven only
  - **Business Rules**: BR-AUDIT-024
  - **API**: `GET /api/v1/admin/audit-logs?entityType=...&entityId=...`

- [ ] **N-10**: Auto-refresh toggles and polls at 30-second interval
  - **Precondition**: Authenticated admin user on `/admin/audit-logs` with active filters applied
  - **Steps**:
    1. Turn the Auto-Refresh toggle ON
    2. Wait 30 seconds
    3. Verify a read-only list request reuses current filters/sort/pagination
    4. Turn the toggle OFF
  - **Expected Result**: List re-queries every 30 seconds without losing filters; polling pauses while the browser tab is hidden and resumes when visible; polling stops when disabled; existing data retained while refreshing
  - **Business Rules**: BR-AUDIT-020, BR-AUDIT-024
  - **API**: `GET /api/v1/admin/audit-logs`

- [ ] **N-11**: Manually delete audit log records at or above the 90-day threshold
  - **Precondition**: Authenticated admin user; DB contains audit log records aged >= 90 days
  - **Steps**:
    1. (Optional) Select rows via the row checkboxes — selected IDs are sent as `recordIds`
    2. Click "Delete Audit Logs" button
    3. Verify warning alert and default retention value of 90 days
    4. Keep retention at 90 (or higher)
    5. Click "Confirm Delete"
  - **Expected Result**: Success toast "Deleted {count} records" (record count only); dialog closes; selection cleared; list and filter options refresh; an `AUDIT_LOG_DELETE` audit event is appended; records younger than the threshold remain untouched; with rows selected only those IDs are deleted (all must be eligible or the request is rejected)
  - **Business Rules**: BR-AUDIT-001, BR-AUDIT-007, BR-AUDIT-041
  - **API**: `DELETE /api/v1/admin/audit-logs/files`

- [ ] **N-12**: Language toggle works on screen
  - **Precondition**: User is on `/admin/audit-logs`
  - **Steps**:
    1. Toggle language to English / Japanese / Myanmar
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
  - **Expected Result**: Full table layout with all columns visible, horizontal filter bar (4-column grid); detail modal rendered as a centered modal (up to 640px wide, max 85dvh); export and delete dialogs centered at max-w-md (448px)
  - **Business Rules**: None (Responsive)

- [ ] **N-15**: Responsive layout on mobile viewport
  - **Precondition**: Viewport < 768px
  - **Steps**:
    1. Set viewport to 375x667
    2. Load `/admin/audit-logs`
  - **Expected Result**: Table remains a table with horizontal scrolling (not a card list); filters stack in a single-column layout; detail/export/delete dialogs render full-screen; layout stacks and scrolls correctly
  - **Business Rules**: None (Responsive)

- [ ] **N-16**: Sort table by column
  - **Precondition**: Authenticated admin user; audit log list displays rows
  - **Steps**:
    1. Click the "Action" column header
    2. Click the "Action" header again
    3. Click the "Timestamp" header
    4. Click the "Entity Type" header
  - **Expected Result**: Only Timestamp, Action, and Entity Type headers are sortable (they render sort icons); clicking a new column sorts DESC first and updates `sortBy`/`sortOrder` in the URL; clicking the same column toggles ASC/DESC; the current page number is preserved when sorting (no reset to page 1); the list refetches with `sortBy`/`sortOrder` query params; an invalid `sortBy` in the URL fails URL parsing, so the whole default query is restored (`created_at desc`, page 1, limit 10) rather than only the sort field
  - **Business Rules**: BR-AUDIT-020, BR-AUDIT-022
  - **API**: `GET /api/v1/admin/audit-logs?sortBy=action&sortOrder=asc`

- [ ] **N-17**: Select rows and delete only the selection
  - **Precondition**: Authenticated admin user; list shows rows of which at least one is older than 90 days
  - **Steps**:
    1. Check one or more row checkboxes (header checkbox selects/deselects all rows on the current page)
    2. Click "Delete Audit Logs"
    3. Verify the scope text: "N selected records older than X days will be permanently deleted. Records younger than the threshold are rejected by the server."
    4. Enter a valid retention (>= 90) and click "Confirm Delete"
  - **Expected Result**: Request body contains the selected `recordIds` plus `olderThanDays`; success toast shows the deleted count and the selection is cleared; if any selected record does not exist or is younger than the threshold, the whole request is rejected atomically with 400 ("One or more specified records do not exist." / "Records younger than 90 days cannot be deleted.") and no record is deleted
  - **Business Rules**: BR-AUDIT-001, BR-AUDIT-041
  - **API**: `DELETE /api/v1/admin/audit-logs/files` with `{ olderThanDays, recordIds }`

- [ ] **N-18**: Filter, sort, and pagination state persists in the URL
  - **Precondition**: Authenticated admin user on `/admin/audit-logs`
  - **Steps**:
    1. Apply filters (search, action, entity type, IP, date range) and change page/sort
    2. Copy the URL and open it in a new tab (or reload)
    3. Modify the URL parameters to invalid values (e.g. `userId=abc`, `page=0`, `sortBy=bogus`)
  - **Expected Result**: All filter/sort/pagination values are encoded in the URL query string (`replace: true` — no history entries per keystroke); reloading or sharing the URL restores the exact same view; changing any filter resets `page` to 1 (unless the change itself is a page/sort change); invalid `userId`/`entityId` (non-UUID), inverted date ranges, invalid `page`, and invalid `sortBy`/`sortOrder` are dropped or defaulted rather than breaking the screen
  - **Business Rules**: BR-AUDIT-024, BR-AUDIT-025
  - **API**: `GET /api/v1/admin/audit-logs?...`

- [ ] **N-19**: Filter logs by IP address
  - **Precondition**: Authenticated admin user on `/admin/audit-logs`; audit records exist with known client IP addresses
  - **Steps**:
    1. Type a partial IP (e.g. `203.0.113`) into the "IP Address" filter input
    2. Verify the request and the filtered table
    3. Clear the input
  - **Expected Result**: The input applies the filter immediately (no Apply button, no debounce) and the request carries `ipAddress=203.0.113`; the table shows only rows whose stored address contains the value — the server matches the address and its variants (`::ffff:`-prefixed IPv4, IPv4-mapped IPv6) with a partial `contains` match, so a differently written form of the same address is also found; clearing the input removes the filter and the Active Filters badge count drops; the field accepts at most 45 characters
  - **Business Rules**: BR-AUDIT-024, BR-AUDIT-026
  - **API**: `GET /api/v1/admin/audit-logs?ipAddress=...`

- [ ] **N-20**: Action / Entity Type filter options cover every recordable value
  - **Precondition**: Authenticated admin user on `/admin/audit-logs`; some action or entity type values have never been recorded yet
  - **Steps**:
    1. Open the Action multi-select
    2. Compare the offered options with the values that exist in `audit_logs`
    3. Open the Entity Type multi-select and repeat
  - **Expected Result**: Both dropdowns offer the full audit catalog merged with the values already recorded (sorted, de-duplicated), so a value that can be written by the application is selectable even before it occurs once; the legacy `audit.admin.delete` label is never offered in the Action dropdown (rows stored under it are still reachable through `AUDIT_LOG_DELETE`)
  - **Business Rules**: BR-AUDIT-028
  - **API**: `GET /api/v1/admin/audit-logs/filters`

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
  - **Expected Result**: Client-side redirect to `/unauthorized` (ProtectedRoute role guard); if the API is called directly it returns 403; all audit endpoints return 403 for non-admin roles
  - **Business Rules**: BR-AUDIT-040
  - **API**: `GET /api/v1/admin/audit-logs` → 403 `FORBIDDEN`

- [ ] **A-03**: Set date range with end date before start date
  - **Precondition**: Authenticated admin user on `/admin/audit-logs`
  - **Steps**:
    1. Pick a Start date, then an End date earlier than the Start date
  - **Expected Result**: Inline validation error "End date must be after start date" (both date pickers marked `aria-invalid`); the invalid range is blocked client-side and never applied as a filter
  - **Business Rules**: BR-AUDIT-023
  - **API**: `GET /api/v1/admin/audit-logs` → 400 `BAD_REQUEST`
  - **Note**: Error code VAL-AUDIT-002 (the range error; there is no separate "invalid start date" code).

- [ ] **A-04**: Enter invalid Entity ID (non-UUID) in the URL query
  - **Precondition**: Authenticated admin user on `/admin/audit-logs`
  - **Steps**:
    1. Navigate to `/admin/audit-logs?entityId=not-a-uuid`
  - **Expected Result**: The invalid entityId is silently dropped by the URL parser — the default list loads and no request is sent containing the invalid value. Note: the filter bar has no Entity ID input; entityId reaches the screen only via the URL
  - **Business Rules**: None (input validation)
  - **API**: `GET /api/v1/admin/audit-logs` → 400 `BAD_REQUEST` only if an invalid UUID is sent directly
  - **Note**: No filter-input error code applies (there is no Entity ID input on the screen).

- [ ] **A-05**: Export when filtered results exceed the 10,000-row limit
  - **Precondition**: Authenticated admin user; filters produce more than 10,000 matching records
  - **Steps**:
    1. Apply broad filters matching > 10,000 rows
    2. Click "Export CSV", pick a date range in the dialog, and confirm
  - **Expected Result**: Toast error "Export exceeds maximum row limit (10,000). Please narrow your filters." (400 body parsed from the blob response); no CSV generated; no audit log records are deleted, archived, purged, or modified
  - **Business Rules**: BR-AUDIT-033, BR-AUDIT-034
  - **API**: `POST /api/v1/admin/audit-logs/export` → 400 `BAD_REQUEST`

- [ ] **A-06**: Export with date range exceeding 365 days
  - **Precondition**: Authenticated admin user
  - **Steps**:
    1. Click "Export CSV" to open the export dialog
    2. Pick a Start/End date pair spanning wider than 365 days and attempt to confirm
  - **Expected Result**: Inline error "Date range cannot exceed 365 days" shown inside the export dialog; the request is never sent and no file is generated
  - **Business Rules**: BR-AUDIT-032
  - **API**: `POST /api/v1/admin/audit-logs/export` → 400 `BAD_REQUEST` if the dialog validation is bypassed
  - **Note**: Error code VAL-AUDIT-021.

- [ ] **A-07**: Confirm deletion with retention period below 90 days
  - **Precondition**: Authenticated admin user; Delete Audit Logs dialog open
  - **Steps**:
    1. Enter 89 (or lower) in the retention period input
  - **Expected Result**: Inline error "Retention period must be at least 90 days" (shown after blur/submit; input marked `aria-invalid`); Confirm Delete button disabled; API would return 400 "Minimum retention period is 90 days. Records and files younger than 90 days cannot be deleted."
  - **Business Rules**: BR-AUDIT-001, BR-AUDIT-041
  - **API**: `DELETE /api/v1/admin/audit-logs/files` → 400 `BAD_REQUEST`
  - **Note**: Error code VAL-AUDIT-030.

- [ ] **A-08**: Confirm deletion when no eligible records exist
  - **Precondition**: Authenticated admin user; no records older than the retention threshold
  - **Steps**:
    1. Open Delete Audit Logs dialog
    2. Enter valid retention >= 90
    3. Click "Confirm Delete"
  - **Expected Result**: Error message "No records or files eligible for deletion (must be >= 90 days old)." displayed inside the delete dialog; no data removed
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
  - **Expected Result**: HTTP 404 with standard error body; the open detail modal shows the inline error "Audit log entry not found" (no toast)
  - **Business Rules**: None
  - **API**: `GET /api/v1/admin/audit-logs/:id` → 404 `NOT_FOUND`

- [ ] **A-11**: Server error during list load preserves existing data
  - **Precondition**: Admin has a loaded list; API returns 500 on subsequent request (e.g., failed auto-refresh)
  - **Steps**:
    1. Trigger a refresh/filter request that fails with 500
  - **Expected Result**: Existing list data remains unchanged (served from cache); a non-blocking inline error banner (role=alert) shows the API message or "Failed to load audit logs"; the next auto-refresh interval may retry
  - **Business Rules**: None (error handling)
  - **API**: Any audit endpoint → 500 `INTERNAL_SERVER_ERROR`

- [ ] **A-12**: Attempt to modify an audit log record via API
  - **Precondition**: Authenticated admin user with a valid audit log ID
  - **Steps**:
    1. Attempt `PUT` / `PATCH` on `/api/v1/admin/audit-logs/:id`
  - **Expected Result**: HTTP 404/405 (no update endpoint exists); audit log records are never modified
  - **Business Rules**: BR-AUDIT-001, BR-AUDIT-042
  - **API**: `PUT|PATCH /api/v1/admin/audit-logs/:id` → not available

- [ ] **A-13**: List request returns 403 while the admin is on the page
  - **Precondition**: Authenticated admin user is on `/admin/audit-logs` (e.g. the session role was revoked, or the API is stubbed to return 403)
  - **Steps**:
    1. Load or refresh the audit log list so the list request returns 403
    2. Observe the resulting route
  - **Expected Result**: The page navigates to `/unauthorized` (replace, so no history entry is left behind) and renders nothing else; the same rule applies to the 403 raised by any list refresh while the screen is open
  - **Business Rules**: BR-AUDIT-040
  - **API**: `GET /api/v1/admin/audit-logs` → 403 `FORBIDDEN`

- [ ] **A-14**: Export request fails with a server error
  - **Precondition**: Authenticated admin user; the export endpoint returns 500 (or the network drops the request)
  - **Steps**:
    1. Open the export dialog, pick a valid date range, and confirm
    2. Observe the response handling
  - **Expected Result**: The blob response body is parsed and its `message` is shown in an error toast (fallback "Report generation failed. Please try again."); no file is downloaded; the export dialog stays open with the entered dates so the request can be retried; the audit log list is not modified
  - **Business Rules**: BR-AUDIT-034
  - **API**: `POST /api/v1/admin/audit-logs/export` → 500 `INTERNAL_SERVER_ERROR`

- [ ] **A-15**: Retention input is empty or not a number
  - **Precondition**: Authenticated admin user; Delete Audit Logs dialog open
  - **Steps**:
    1. Clear the retention period input
    2. (Optionally) type a non-numeric value
    3. Try to submit
  - **Expected Result**: The Confirm Delete button is disabled; after blur/submit an inline error "Retention period must be at least 90 days" is shown and the input is marked `aria-invalid`; no request is sent to the API
  - **Business Rules**: BR-AUDIT-001, BR-AUDIT-041
  - **API**: none (request blocked client-side)

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
  - **Expected Result**: Input is capped at 255 characters via `maxLength` — the 256th character cannot be typed (silent truncation, no inline error); API returns 400 if a longer query is sent directly
  - **Business Rules**: None (input validation)
  - **API**: `GET /api/v1/admin/audit-logs` → 400 `BAD_REQUEST`
  - **Note**: Error code VAL-AUDIT-006.

- [ ] **B-03**: IP address filter at 45 characters vs 46 characters
  - **Precondition**: Authenticated admin user on `/admin/audit-logs`
  - **Steps**:
    1. Enter an exactly 45-character value in the IP Address filter and apply
    2. Enter a 46-character value and apply
  - **Expected Result**: IP input is capped at 45 characters via `maxLength` — a 46-character value cannot be typed (silent truncation, no inline error); API returns 400 if a longer value is sent directly
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
    1. Set a date range spanning 365 calendar days inclusive (e.g. 2025-01-01 → 2025-12-31) and export
    2. Set a date range spanning 366 calendar days inclusive (dateTo = dateFrom + 365 days) and export
  - **Expected Result**: Both the export dialog and the backend measure the range from start-of-day to end-of-day; the 365-day inclusive range is accepted and CSV generated; the 366-day inclusive range is rejected with "Date range cannot exceed 365 days"
  - **Business Rules**: BR-AUDIT-032
  - **API**: `POST /api/v1/admin/audit-logs/export`

- [ ] **B-06**: Export row count at exactly 10,000 vs 10,001 rows
  - **Precondition**: Authenticated admin user; ability to produce precisely sized result sets
  - **Steps**:
    1. Apply filters matching exactly 10,000 rows, export via the dialog
    2. Apply filters matching 10,001 rows, export via the dialog
  - **Expected Result**: 10,000 rows exported successfully; 10,001 rows rejected with row-limit toast; no audit records mutated in either case
  - **Business Rules**: BR-AUDIT-033, BR-AUDIT-034
  - **API**: `POST /api/v1/admin/audit-logs/export`

- [ ] **B-07**: Page size options at min/max boundaries
  - **Precondition**: Authenticated admin user on `/admin/audit-logs`
  - **Steps**:
    1. Open the Rows-per-page select and verify options 10, 20, 50, 100
    2. Select 100 (maximum offered by the UI)
    3. Attempt to request limit=201 via API
  - **Expected Result**: All UI options accepted (frontend schema caps limit at 100); backend accepts limit up to 200; limit=201 returns 400
  - **Business Rules**: BR-AUDIT-021, BR-AUDIT-022
  - **API**: `GET /api/v1/admin/audit-logs?limit=...`
  - **Note**: Error code VAL-AUDIT-010.

- [ ] **B-08**: Empty state when no records or no filter matches
  - **Precondition**: Database has 0 records for the current view (or filters match nothing)
  - **Steps**:
    1. Navigate to `/admin/audit-logs` with no data, or apply a search with no matches
  - **Expected Result**: Friendly empty state "No matching records were found." displayed instead of a blank table; Export CSV button remains visible, but clicking it with 0 results shows an info toast "No matching records to export" and the export dialog does not open
  - **Business Rules**: None (UI)
  - **API**: `GET /api/v1/admin/audit-logs` → 200 with empty `data` and `meta.total = 0`

- [ ] **B-09**: User agent is parsed, never shown raw, in detail modal
  - **Precondition**: Detail modal open for an entry whose user agent string exceeds 200 characters
  - **Steps**:
    1. Open the detail modal
    2. Inspect the Client Information section
  - **Expected Result**: The raw user agent string is never rendered (no truncation needed); instead it is parsed into a Client Type badge (Web Browser / Mobile App / API Client / Unknown), Browser, and Device; when no user agent exists the parsed section is hidden and IP shows "Unknown"
  - **Business Rules**: None (UI)
  - **API**: `GET /api/v1/admin/audit-logs/:id`

- [ ] **B-10**: Pagination with invalid page parameter (page = 0)
  - **Precondition**: Authenticated admin user
  - **Steps**:
    1. Call `GET /api/v1/admin/audit-logs?page=0`
  - **Expected Result**: Frontend never sends page=0 — the URL parser fails schema validation and falls back to the default query (page 1); a direct API call returns HTTP 400 (`page must not be less than 1`)
  - **Business Rules**: None (input validation)
  - **API**: `GET /api/v1/admin/audit-logs?page=0` → 400 `BAD_REQUEST`

- [ ] **B-11**: Several values selected inside one multi-select
  - **Precondition**: Authenticated admin user; rows exist for at least two different action types
  - **Steps**:
    1. Select two action types in the Action multi-select
    2. Verify the request and the rows returned
    3. Add an entity type filter on top
  - **Expected Result**: The two values are sent as repeated `action` query keys (never a JSON array) and the server matches rows that satisfy **either** value (OR / `IN` semantics inside a single filter); adding the entity type filter narrows the result further (AND between different filters), so the final rows satisfy the entity type **and** one of the two actions
  - **Business Rules**: BR-AUDIT-024
  - **API**: `GET /api/v1/admin/audit-logs?action=...&action=...&entityType=...`

- [ ] **B-12**: Export range covering a single day
  - **Precondition**: Authenticated admin user; at least one audit record exists on the chosen day
  - **Steps**:
    1. Open the export dialog
    2. Set the start and end date to the same day
    3. Confirm the export
  - **Expected Result**: A one-day range is accepted by both the dialog validation and the server (the range is measured from 00:00:00.000 to 23:59:59.999 Myanmar Time of that day); the CSV contains only that day's rows
  - **Business Rules**: BR-AUDIT-032
  - **API**: `POST /api/v1/admin/audit-logs/export`

---

## 4. Interface Scenarios (I) — API Contracts & Payloads

- [ ] **I-01**: `GET /api/v1/admin/audit-logs` — returns 200 with list and pagination
  - **Precondition**: Admin JWT provided; records exist
  - **Steps**:
    1. Call API with default params (`page=1`, `limit=50`, `sortBy=created_at`, `sortOrder=desc`)
  - **Expected Response**: Status code 200, JSON `{ data: { items: [...], meta: { page, limit, total, totalPages } } }`; each item contains `id, userId, userName, userEmail, userRole, action, entityType, summary, ipAddress, createdAt` (entityId is never sent to the client); sorted newest first; backend default limit is 50 when omitted, but the UI always sends its own limit (default 10)
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
  - **Expected Response**: Status code 200, JSON `{ data: { actions: string[], entityTypes: string[] } }` — distinct recorded values merged with the full action/entity-type catalog so filters offer every recordable value; the arrays are de-duplicated and sorted; the legacy `audit.admin.delete` label is filtered out of `actions`
  - **Business Rules**: BR-AUDIT-040, BR-AUDIT-028
  - **API**: `GET /api/v1/admin/audit-logs/filters`

- [ ] **I-04**: `GET /api/v1/admin/audit-logs/:id` — returns 200 with full detail DTO
  - **Precondition**: Admin JWT provided; existing audit log UUID
  - **Steps**:
    1. Call API with a valid audit log ID
  - **Expected Response**: Status code 200, JSON with `id, userId, userName, userEmail, userRole, action, entityType, summary, ipAddress, createdAt, oldValue, newValue, userAgent` (entityId is never returned to the client; sensitive fields in oldValue/newValue are masked as `***`)
  - **Business Rules**: BR-AUDIT-002, BR-AUDIT-003, BR-AUDIT-005, BR-AUDIT-006
  - **API**: `GET /api/v1/admin/audit-logs/:id`

- [ ] **I-05**: `GET /api/v1/admin/audit-logs/:id` — returns 404 for non-existent ID and 400 for invalid UUID
  - **Precondition**: Admin JWT provided
  - **Steps**:
    1. Call API with a random non-existent UUID
    2. Call API with a malformed ID (e.g., `abc`)
  - **Expected Response**: Step 1 → 404, JSON `{ statusCode: 404, error: "Not Found", errorCode: "RES_001", message: "Audit log entry not found", timestamp, path }`; Step 2 → 400 Bad Request for invalid UUID format
  - **Business Rules**: None
  - **API**: `GET /api/v1/admin/audit-logs/:id`

- [ ] **I-06**: `POST /api/v1/admin/audit-logs/export` — returns 200 with streamed CSV file, read-only
  - **Precondition**: Admin JWT provided; valid payload with `format: 'csv'`; result set under 10,000 rows and range <= 365 days
  - **Steps**:
    1. Call API with valid request body (current filters + `format: 'csv'` + `dateFrom`/`dateTo`)
    2. Verify audit_logs row count before and after
  - **Expected Response**: Status code 200 with the CSV file streamed directly (`Content-Type: text/csv`, `Content-Disposition: attachment; filename="audit-logs-startDate-endDate(today).csv"` — no JSON body / downloadUrl); export performs only SELECT/file-generation — zero audit log records deleted, archived, purged, or updated; CSV columns: Timestamp, Actor Name, Actor Email, Actor Role, Action, Entity Type, Old Value, New Value, IP Address, User Agent (no Entity ID column); timestamps rendered in Myanmar Time; file prefixed with a UTF-8 BOM
  - **Business Rules**: BR-AUDIT-030, BR-AUDIT-031, BR-AUDIT-034, BR-AUDIT-043
  - **API**: `POST /api/v1/admin/audit-logs/export`

- [ ] **I-07**: `POST /api/v1/admin/audit-logs/export` — returns 400 for invalid format / range / row violations
  - **Precondition**: Admin JWT provided
  - **Steps**:
    1. Send payload with `format: 'xlsx'`
    2. Send payload with `dateFrom`/`dateTo` spanning > 365 days
    3. Send payload matching > 10,000 rows
  - **Expected Response**: All → HTTP 400 `BAD_REQUEST` with corresponding messages ("format must be one of the following values: csv" / "Date range cannot exceed 365 days" / "Export exceeds maximum row limit (10,000). Please narrow your filters."); no file created
  - **Business Rules**: BR-AUDIT-030, BR-AUDIT-032, BR-AUDIT-033
  - **API**: `POST /api/v1/admin/audit-logs/export`

- [ ] **I-08**: `DELETE /api/v1/admin/audit-logs/files` — returns 200 with deletion counts
  - **Precondition**: Admin JWT provided; records aged >= 90 days exist
  - **Steps**:
    1. Call API with `{ olderThanDays: 90 }` (optionally with `recordIds` for explicit deletion)
  - **Expected Response**: Status code 200, JSON `{ deletedRecords: number, deletedFiles: number }` (deletedFiles is always 0 — CSVs are streamed, no export-file table); only records older than the threshold are removed; young records untouched; when `recordIds` is given, every ID must exist and be eligible or the request is rejected atomically
  - **Business Rules**: BR-AUDIT-001, BR-AUDIT-007, BR-AUDIT-041
  - **API**: `DELETE /api/v1/admin/audit-logs/files`

- [ ] **I-09**: `DELETE /api/v1/admin/audit-logs/files` — returns 400 for threshold below minimum
  - **Precondition**: Admin JWT provided
  - **Steps**:
    1. Call API with `{ olderThanDays: 89 }`
  - **Expected Response**: Status code 400 `BAD_REQUEST` with "Minimum retention period is 90 days. Records and files younger than 90 days cannot be deleted."; no records deleted (the server message still mentions files, but no export-file table exists so `deletedFiles` stays 0)
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
  - **Expected Response**: JSON contains `{ statusCode, error, errorCode, message, timestamp, path }`
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

- [ ] **I-13**: `POST /api/v1/admin/audit-logs/export` — accepts the `entityId` filter but never emits an Entity ID column
  - **Precondition**: Admin JWT provided; at least one record has a non-null `entity_id`
  - **Steps**:
    1. Call the export endpoint with `{ format: 'csv', entityId: '<uuid>', dateFrom, dateTo }`
  - **Expected Response**: Status code 200 with the streamed CSV; only the matching rows are exported; the header row is exactly `Timestamp, Actor Name, Actor Email, Actor Role, Action, Entity Type, Old Value, New Value, IP Address, User Agent` — no Entity ID column is ever written, even though `entityId` is an accepted filter
  - **Business Rules**: BR-AUDIT-030, BR-AUDIT-031, BR-AUDIT-034, BR-AUDIT-027
  - **API**: `POST /api/v1/admin/audit-logs/export`

- [ ] **I-14**: `DELETE /api/v1/admin/audit-logs/files` — `fileIds` is accepted for contract compatibility and ignored
  - **Precondition**: Admin JWT provided; an eligible (>= 90 days) record exists
  - **Steps**:
    1. Call the endpoint with `{ olderThanDays: 90, fileIds: ['<uuid>'] }`
  - **Expected Response**: Status code 200 with `{ deletedRecords: <n>, deletedFiles: 0 }`; the `fileIds` value changes nothing (no export-file storage exists, so it is never deleted and never counted); only the eligible DB records are removed
  - **Business Rules**: BR-AUDIT-001, BR-AUDIT-007, BR-AUDIT-041
  - **API**: `DELETE /api/v1/admin/audit-logs/files`

- [ ] **I-15**: `GET /api/v1/admin/audit-logs` — `entityId` filter is honoured but the field is never returned
  - **Precondition**: Admin JWT provided; records exist with a non-null `entity_id`
  - **Steps**:
    1. Call the list endpoint with `?entityId=<uuid>`
    2. Inspect the returned items
  - **Expected Response**: Status code 200; only the rows with that `entity_id` are returned, but no item contains an `entityId` property — the same rule applies to the detail endpoint; the value is accepted purely as a filter
  - **Business Rules**: BR-AUDIT-024, BR-AUDIT-027
  - **API**: `GET /api/v1/admin/audit-logs?entityId=...`

---

## Sign-Off

| Item | Status |
|------|--------|
| Test scenarios defined (N, A, B, I) | ☑️ |
| E2E tests implemented | ☐ |
| PCL auto-update verified | ☐ |
| Next review date | 2026-10-31 |
