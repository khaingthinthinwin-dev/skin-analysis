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
>
> Evidence capture: UI and API test screenshots are stored under `e2e/test-results/Audit_Log/screenshots/`. Captured screenshots and test outcomes are recorded beneath each mapped checklist item; an item is checked only when all mapped tests pass.

---

## 1. Normal Scenarios (N) — Happy Path

- [x] **N-01**: Audit log page loads with log list
  - **Evidence**:
    - `N-01_1_audit_log_list.png`
    - Final UI state for N-01: loads the audit log list with the default sort and page size → `N-01_final_state.png`
    - Test: audit-log.spec.ts › "N-01: loads the audit log list with the default sort and page size" — passed
  - **Precondition**: Authenticated admin user; audit log records exist
  - **Steps**:
    1. Log in as admin
    2. Navigate to `/admin/audit-logs`
    3. Wait for the list to render
  - **Expected Result**: Page displays the audit log table with the log list, search input, Auto-Refresh toggle, Export CSV and Delete Audit Logs buttons visible; entries sorted by `created_at DESC` (newest first), 10 entries per page by default (page-size options: 10, 20, 50, 100)
  - **Business Rules**: BR-AUDIT-020, BR-AUDIT-021, BR-AUDIT-040
  - **API**: `GET /api/v1/admin/audit-logs`

- [x] **N-02**: Filter logs by action type
  - **Evidence**:
    - `N-02_1_filter_by_action.png`
    - Final UI state for N-02: filters logs by action type → `N-02_final_state.png`
    - Test: audit-log.spec.ts › "N-02: filters logs by action type" — passed
  - **Precondition**: Authenticated admin user on `/admin/audit-logs`; multiple action types exist in the data
  - **Steps**:
    1. Open the Action multi-select (button with listbox popup; options loaded from `GET /api/v1/admin/audit-logs/filters`)
    2. Select one or more action types (checkboxes; the button summary shows "N selected")
    3. Selections apply immediately — there is no Apply button; "Clear selection" empties the multi-select
  - **Expected Result**: Table refreshes showing only entries matching the selected action type(s) — each selection triggers an immediate refetch; Active Filters badge count increments; Clear Filters link appears
  - **Business Rules**: BR-AUDIT-024, BR-AUDIT-025
  - **API**: `GET /api/v1/admin/audit-logs?action=...`

- [x] **N-03**: Filter logs by date range
  - **Evidence**:
    - `N-03_1_filter_by_date_range.png`
    - Final UI state for N-03: filters logs by date range → `N-03_final_state.png`
    - Test: audit-log.spec.ts › "N-03: filters logs by date range" — passed
  - **Precondition**: Authenticated admin user on `/admin/audit-logs`; audit records span multiple dates
  - **Steps**:
    1. Open the From/To date pickers (custom calendar popups)
    2. Select a valid start date and end date
  - **Expected Result**: The range applies automatically once BOTH dates are set (no Apply button); selecting only one end of the range sends nothing; table refreshes showing only entries within the selected range (`dateFrom` and `dateTo` sent together as Myanmar day boundaries); an inverted range is blocked client-side (see A-03)
  - **Business Rules**: BR-AUDIT-023, BR-AUDIT-024
  - **API**: `GET /api/v1/admin/audit-logs?dateFrom=...&dateTo=...`
  - **Note**: The date picker is a custom calendar popup (not the native browser picker) and its month/weekday labels are fixed Japanese text in every locale — verify the selected ISO date, not the surrounding glyphs.

- [x] **N-04**: View audit log detail
  - **Evidence**:
    - `N-04_1_detail_modal.png`
    - Final UI state for N-04: opens the audit log detail modal → `N-04_final_state.png`
    - Test: audit-log.spec.ts › "N-04: opens the audit log detail modal" — passed
  - **Precondition**: Authenticated admin user; audit log list is displayed with at least one row
  - **Steps**:
    1. Click "View Detail" on a log row
    2. Inspect the Audit Log Detail Modal
  - **Expected Result**: Modal opens showing timestamp rendered in Myanmar Time (MMT, `YYYY/MM/DD HH:mm:ss.SSS MMT`), actor name/email/role, action, entity type, Old Value/New Value sections rendered as humanized key-value lists (sensitive fields masked as `***`), IP address, and a Client Information section with the user agent parsed into client type (Web Browser / Mobile App / API Client / Unknown), browser, and device — the raw user agent string and the entity ID are never displayed
  - **Business Rules**: BR-AUDIT-002, BR-AUDIT-003, BR-AUDIT-004, BR-AUDIT-005, BR-AUDIT-006
  - **API**: `GET /api/v1/admin/audit-logs/:id`

- [x] **N-05**: Export audit log as CSV
  - **Evidence**:
    - `N-05_1_ui_before_export.png`
    - `N-05_2_ui_export_dates_filled.png`
    - `N-05_3_ui_after_export.png`
    - Test: audit-log.spec.ts › "N-05: exports audit log with UI evidence" — passed
    - Regression test: audit-log.spec.ts › "N-05: exports the filtered audit log as CSV" — passed
  - **Precondition**: Authenticated admin user; current filtered list has results (meta.total > 0)
  - **Steps**:
    1. Apply desired filters to the list
    2. Click "Export CSV" — the Export CSV date-range dialog opens (Start/End Date pre-filled from the current list date filters, if any)
    3. Select a Start Date and End Date (both required)
    4. Click "Export CSV" in the dialog to confirm
  - **Expected Result**: Dialog blocks invalid ranges with inline errors before any request; on success the CSV file downloads directly (streamed attachment, filename `audit-logs-startDate-endDate(today).csv`, Myanmar dates) and a success toast "CSV export downloaded" is shown; CSV columns are Timestamp, Actor Name, Actor Email, Actor Role, Action, Entity Type, Old Value, New Value, IP Address, User Agent (no Entity ID column); only the rows matching the current list filters AND the chosen date range are exported; the export is read-only with respect to the exported rows but appends an `AUDIT_EXPORT` self-audit event (admin, filters, row count, format) to `audit_logs`; underlying exported audit log records are unchanged; if the filtered list has 0 rows, an info toast "No matching records to export" appears and the dialog does not open
  - **Business Rules**: BR-AUDIT-030, BR-AUDIT-031, BR-AUDIT-034, BR-AUDIT-035
  - **API**: `POST /api/v1/admin/audit-logs/export`

- [x] **N-06**: Apply combined filters with free-text search and clear them
  - **Evidence**:
    - `N-06_1_filters_cleared.png`
    - Final UI state for N-06: combines free-text search with the IP filter and clears the filters → `N-06_final_state.png`
    - Test: audit-log.spec.ts › "N-06: combines free-text search with the IP filter and clears the filters" — passed
  - **Precondition**: Authenticated admin user on `/admin/audit-logs`
  - **Steps**:
    1. Enter a search query in the Search input (debounced 300ms, capped at 255 chars)
    2. Add entity type filter (multi-select) and IP address filter
    3. Verify combined results
    4. Click "Clear Filters"
  - **Expected Result**: All filters combine with AND logic; search matches against `action`, `entity_type`, and joined `users.name`/`users.email`; clicking Clear Filters resets all filter params (page/limit/sort are kept), hides the badge and link, and reloads the list. Note: there is no user filter input in the filter bar — a `userId` filter can only be supplied via the URL query parameter (see N-08)
  - **Business Rules**: BR-AUDIT-024, BR-AUDIT-025
  - **API**: `GET /api/v1/admin/audit-logs?search=...&userId=...&entityType=...&ipAddress=...`

- [x] **N-07**: Pagination navigation and page size change
  - **Evidence**:
    - `N-07_1_pagination.png`
    - Final UI state for N-07: paginates the table and changes the page size → `N-07_final_state.png`
    - Test: audit-log.spec.ts › "N-07: paginates the table and changes the page size" — passed
  - **Precondition**: Authenticated admin user; more than one page of audit log records exists
  - **Steps**:
    1. Click "Next" / a page number button
    2. Verify table and page info text update
    3. Change the Rows-per-page select to 100 (options: 10, 20, 50, 100)
    4. Click "Prev"
  - **Expected Result**: Page info shows "Showing page {page} of {totalPages}"; Prev disabled on first page, Next disabled on last page; changing page size resets to page 1 and refetches with the new limit
  - **Business Rules**: BR-AUDIT-021, BR-AUDIT-022
  - **API**: `GET /api/v1/admin/audit-logs?page=...&limit=...`

- [x] **N-08**: Filter list by user via URL query parameter
  - **Evidence**:
    - `N-08_1_url_driven_filters.png`
    - Final UI state for N-08 and N-09: filters the list by user and entity through the URL query string → `N-08_final_state.png`
    - Test: audit-log.spec.ts › "N-08 and N-09: filters the list by user and entity through the URL query string" — passed
  - **Precondition**: Authenticated admin user; audit entries exist created by a real user (non-system action)
  - **Steps**:
    1. Navigate to `/admin/audit-logs?userId={user_id}`
  - **Expected Result**: List refetches showing only entries by that user; the userId counts toward the Active Filters badge; a non-UUID userId in the URL is ignored (falls back to the default list). Note: the detail modal has no "View User History" button — userId filtering is URL-driven only
  - **Business Rules**: BR-AUDIT-024
  - **API**: `GET /api/v1/admin/audit-logs?userId=...`

- [x] **N-09**: Filter list by entity via URL query parameter
  - **Evidence**:
    - Final UI state for N-08 and N-09: filters the list by user and entity through the URL query string → `N-09_final_state.png`
    - Test: audit-log.spec.ts › "N-08 and N-09: filters the list by user and entity through the URL query string" — passed
  - **Precondition**: Authenticated admin user; audit entries exist with a non-null entity ID
  - **Steps**:
    1. Navigate to `/admin/audit-logs?entityType={entity_type}&entityId={entity_id}`
  - **Expected Result**: List refetches showing only entries for that entity; both params count toward the Active Filters badge; a non-UUID entityId in the URL is ignored. Note: the detail modal has no "View Entity History" button and never displays the entity ID — entity filtering is URL-driven only
  - **Business Rules**: BR-AUDIT-024
  - **API**: `GET /api/v1/admin/audit-logs?entityType=...&entityId=...`

- [x] **N-10**: Auto-refresh toggles and polls at 30-second interval
  - **Evidence**:
    - `N-10_1_auto_refresh.png`
    - Final UI state for N-10: polls the list every 30 seconds while auto-refresh is enabled → `N-10_final_state.png`
    - Test: audit-log.spec.ts › "N-10: polls the list every 30 seconds while auto-refresh is enabled" — passed
  - **Precondition**: Authenticated admin user on `/admin/audit-logs` with active filters applied
  - **Steps**:
    1. Turn the Auto-Refresh toggle ON
    2. Wait 30 seconds
    3. Verify a read-only list request reuses current filters/sort/pagination
    4. Turn the toggle OFF
  - **Expected Result**: List re-queries every 30 seconds without losing filters; polling pauses while the browser tab is hidden and resumes when visible; polling stops when disabled; existing data retained while refreshing
  - **Business Rules**: BR-AUDIT-020, BR-AUDIT-024
  - **API**: `GET /api/v1/admin/audit-logs`

- [x] **N-11**: Manually delete audit log records at or above the 90-day threshold
  - **Evidence**:
    - `N-11_1_ui_before_delete.png`
    - `N-11_2_ui_delete_confirmation.png`
    - `N-11_3_ui_after_delete.png`
    - SAMPLE DATA ONLY — the UI delete request is intercepted by the E2E fixture; the SQL simulation deletes only the seeded eligible row, and its synthetic `AUDIT_LOG_DELETE` event remains → `N-11_4_db_after_sample_delete.png`
    - Machine-readable database rows → `N-11_4_db_after_sample_delete.json`
    - Test: audit-log.spec.ts › "N-11: deletes only seeded retention sample records (live database evidence)" — passed
    - Regression test: audit-log.spec.ts › "N-11: deletes audit log records at or above the retention threshold" — passed
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

- [x] **N-12**: Language toggle works on screen
  - **Evidence**:
    - `N-12_1_lang_ja.png`
    - `N-12_2_lang_my.png`
    - Final UI state for N-12: language toggle works on screen → `N-12_final_state.png`
    - Test: audit-log.spec.ts › "N-12: language toggle works on screen" — passed
  - **Precondition**: User is on `/admin/audit-logs`
  - **Steps**:
    1. Toggle language to English / Japanese / Myanmar
  - **Expected Result**: All UI labels (title, filters, table columns, buttons, dialog texts) update to the selected language
  - **Business Rules**: None (i18n)

- [x] **N-13**: Theme toggle works on screen
  - **Evidence**:
    - `N-13_1_dark.png`
    - `N-13_2_light.png`
    - Final UI state for N-13: theme toggle works on screen → `N-13_final_state.png`
    - Test: audit-log.spec.ts › "N-13: theme toggle works on screen" — passed
  - **Precondition**: User is on `/admin/audit-logs`
  - **Steps**:
    1. Toggle theme to dark / light
  - **Expected Result**: Styling switches between dark and light modes; table, badges, and modal remain legible
  - **Business Rules**: None (UI)

- [x] **N-14**: Responsive layout on desktop viewport
  - **Evidence**:
    - `N-14_1_desktop_layout.png`
    - Final UI state for N-14 and N-15: keeps the screen usable at desktop and mobile widths → `N-14_final_state.png`
    - Test: audit-log.spec.ts › "N-14 and N-15: keeps the screen usable at desktop and mobile widths" — passed
  - **Precondition**: Viewport >= 1024px
  - **Steps**:
    1. Set viewport to 1280x720
    2. Load `/admin/audit-logs`
  - **Expected Result**: Full table layout with all columns visible, horizontal filter bar (4-column grid); detail modal rendered as a centered modal (up to 640px wide, max 85dvh); export and delete dialogs centered at max-w-md (448px)
  - **Business Rules**: None (Responsive)

- [x] **N-15**: Responsive layout on mobile viewport
  - **Evidence**:
    - `N-15_1_mobile_layout.png`
    - Final UI state for N-14 and N-15: keeps the screen usable at desktop and mobile widths → `N-15_final_state.png`
    - Test: audit-log.spec.ts › "N-14 and N-15: keeps the screen usable at desktop and mobile widths" — passed
  - **Precondition**: Viewport < 768px
  - **Steps**:
    1. Set viewport to 375x667
    2. Load `/admin/audit-logs`
  - **Expected Result**: Table remains a table with horizontal scrolling (not a card list); filters stack in a single-column layout; detail/export/delete dialogs render full-screen; layout stacks and scrolls correctly
  - **Business Rules**: None (Responsive)

- [x] **N-16**: Sort table by column
  - **Evidence**:
    - `N-16_1_sorted_by_action.png`
    - Final UI state for N-16: sorts the table by column → `N-16_final_state.png`
    - Test: audit-log.spec.ts › "N-16: sorts the table by column" — passed
  - **Precondition**: Authenticated admin user; audit log list displays rows
  - **Steps**:
    1. Click the "Action" column header
    2. Click the "Action" header again
    3. Click the "Timestamp" header
    4. Click the "Entity Type" header
  - **Expected Result**: Only Timestamp, Action, and Entity Type headers are sortable (they render sort icons); clicking a new column sorts DESC first and updates `sortBy`/`sortOrder` in the URL; clicking the same column toggles ASC/DESC; the current page number is preserved when sorting (no reset to page 1); the list refetches with `sortBy`/`sortOrder` query params; an invalid `sortBy` in the URL fails URL parsing, so the whole default query is restored (`created_at desc`, page 1, limit 10) rather than only the sort field
  - **Business Rules**: BR-AUDIT-020, BR-AUDIT-022
  - **API**: `GET /api/v1/admin/audit-logs?sortBy=action&sortOrder=asc`

- [x] **N-17**: Select rows and delete only the selection
  - **Evidence**:
    - `N-17_1_ui_before_selection.png`
    - `N-17_2_ui_selected_confirmation.png`
    - `N-17_3_ui_after_selected_delete.png`
    - SAMPLE DATA ONLY — the UI delete request is intercepted by the E2E fixture; the SQL simulation deletes only the selected test row while the unselected sample row and synthetic delete event remain → `N-17_4_db_after_selected_sample_delete.png`
    - Machine-readable database rows → `N-17_4_db_after_selected_sample_delete.json`
    - Test: audit-log.spec.ts › "N-17: deletes only the selected seeded sample record (live database evidence)" — passed
    - Regression test: audit-log.spec.ts › "N-17: selects rows and deletes only the selection" — passed
  - **Precondition**: Authenticated admin user; list shows rows of which at least one is older than 90 days
  - **Steps**:
    1. Check one or more row checkboxes (header checkbox selects/deselects all rows on the current page)
    2. Click "Delete Audit Logs"
    3. Verify the scope text: "N selected records older than X days will be permanently deleted. Records younger than the threshold are rejected by the server."
    4. Enter a valid retention (>= 90) and click "Confirm Delete"
  - **Expected Result**: Request body contains the selected `recordIds` plus `olderThanDays`; success toast shows the deleted count and the selection is cleared; if any selected record does not exist or is younger than the threshold, the whole request is rejected atomically with 400 ("One or more specified records do not exist." / "Records younger than 90 days cannot be deleted.") and no record is deleted
  - **Business Rules**: BR-AUDIT-001, BR-AUDIT-041
  - **API**: `DELETE /api/v1/admin/audit-logs/files` with `{ olderThanDays, recordIds }`

- [x] **N-18**: Filter, sort, and pagination state persists in the URL
  - **Evidence**:
    - `N-18_1_url_state.png`
    - Final UI state for N-18: keeps filter, sort, and pagination state in the URL → `N-18_final_state.png`
    - Test: audit-log.spec.ts › "N-18: keeps filter, sort, and pagination state in the URL" — passed
  - **Precondition**: Authenticated admin user on `/admin/audit-logs`
  - **Steps**:
    1. Apply filters (search, action, entity type, IP, date range) and change page/sort
    2. Copy the URL and open it in a new tab (or reload)
    3. Modify the URL parameters to invalid values (e.g. `userId=abc`, `page=0`, `sortBy=bogus`)
  - **Expected Result**: All filter/sort/pagination values are encoded in the URL query string (`replace: true` — no history entries per keystroke); reloading or sharing the URL restores the exact same view; changing any filter resets `page` to 1 (unless the change itself is a page/sort change); invalid `userId`/`entityId` (non-UUID), inverted date ranges, invalid `page`, and invalid `sortBy`/`sortOrder` are dropped or defaulted rather than breaking the screen
  - **Business Rules**: BR-AUDIT-024, BR-AUDIT-025
  - **API**: `GET /api/v1/admin/audit-logs?...`

- [x] **N-19**: Filter logs by IP address
  - **Evidence**:
    - `N-19_1_filters_applied.png`
    - Final UI state for N-19 with only the IP Address filter filled → `N-19_final_state.png`
    - Test: audit-log.spec.ts › "N-19: filters audit logs by IP address" — passed
  - **Precondition**: Authenticated admin user on `/admin/audit-logs`; audit records exist with known client IP addresses
  - **Steps**:
    1. Leave Search, Action, Entity Type, and Date Range empty
    2. Type a partial IP (`203.0.113`) into the "IP Address" filter input
    3. Verify the IP Address is the only populated filter and the request returns the filtered table
  - **Expected Result**: The input applies the filter immediately (no Apply button, no debounce) and the request carries only `ipAddress=203.0.113` among filter parameters; the table shows only rows whose stored address contains the value — the server matches the address and its variants (`::ffff:`-prefixed IPv4, IPv4-mapped IPv6) with a partial `contains` match, so a differently written form of the same address is also found; clearing the input removes the filter and the Active Filters badge count drops; the field accepts at most 45 characters
  - **Business Rules**: BR-AUDIT-024, BR-AUDIT-026
  - **API**: `GET /api/v1/admin/audit-logs?ipAddress=...`

- [x] **N-20**: Action / Entity Type filter options cover every recordable value
  - **Evidence**:
    - `N-20_1_filter_options.png`
    - Final UI state for N-20: offers every recordable action and entity type in the filters → `N-20_final_state.png`
    - Test: audit-log.spec.ts › "N-20: offers every recordable action and entity type in the filters" — passed
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

- [x] **A-01**: Access audit log route without authentication
  - **Evidence**:
    - Final UI state for A-01: unauthenticated access redirects to the login page → `A-01_final_state.png`
    - Test: audit-log.spec.ts › "A-01: unauthenticated access redirects to the login page" — passed
  - **Precondition**: User is not logged in
  - **Steps**:
    1. Navigate directly to `/admin/audit-logs`
  - **Expected Result**: Redirect to `/login`; no audit log data is exposed
  - **Business Rules**: BR-AUDIT-040
  - **API**: `GET /api/v1/admin/audit-logs` → 401/403

- [x] **A-02**: Access audit log route as non-admin role (buyer / merchant)
  - **Evidence**:
    - Final UI state for A-02: buyer and merchant access to the admin route is denied → `A-02_final_state.png`
    - Test: audit-log.spec.ts › "A-02: buyer and merchant access to the admin route is denied" — passed
  - **Precondition**: Authenticated as buyer or merchant
  - **Steps**:
    1. Navigate directly to `/admin/audit-logs`
  - **Expected Result**: Client-side redirect to `/unauthorized` (ProtectedRoute role guard); if the API is called directly it returns 403; all audit endpoints return 403 for non-admin roles
  - **Business Rules**: BR-AUDIT-040
  - **API**: `GET /api/v1/admin/audit-logs` → 403 `FORBIDDEN`

- [x] **A-03**: Set date range with end date before start date
  - **Evidence**:
    - `A-03_1_invalid_date_range.png`
    - Final UI state for A-03: blocks a date range whose end date is before the start date → `A-03_final_state.png`
    - Test: audit-log.spec.ts › "A-03: blocks a date range whose end date is before the start date" — passed
  - **Precondition**: Authenticated admin user on `/admin/audit-logs`
  - **Steps**:
    1. Pick a Start date, then an End date earlier than the Start date
  - **Expected Result**: Inline validation error "End date must be after start date" (both date pickers marked `aria-invalid`); the invalid range is blocked client-side and never applied as a filter
  - **Business Rules**: BR-AUDIT-023
  - **API**: `GET /api/v1/admin/audit-logs` → 400 `BAD_REQUEST`
  - **Note**: Error code VAL-AUDIT-002 (the range error; there is no separate "invalid start date" code).

- [x] **A-04**: Enter invalid Entity ID (non-UUID) in the URL query
  - **Evidence**:
    - `A-04_1_invalid_entity_id.png`
    - Final UI state for A-04: drops an invalid entity id supplied through the URL → `A-04_final_state.png`
    - Test: audit-log.spec.ts › "A-04: drops an invalid entity id supplied through the URL" — passed
  - **Precondition**: Authenticated admin user on `/admin/audit-logs`
  - **Steps**:
    1. Navigate to `/admin/audit-logs?entityId=not-a-uuid`
  - **Expected Result**: The invalid entityId is silently dropped by the URL parser — the default list loads and no request is sent containing the invalid value. Note: the filter bar has no Entity ID input; entityId reaches the screen only via the URL
  - **Business Rules**: None (input validation)
  - **API**: `GET /api/v1/admin/audit-logs` → 400 `BAD_REQUEST` only if an invalid UUID is sent directly
  - **Note**: No filter-input error code applies (there is no Entity ID input on the screen).

- [x] **A-05**: Export when filtered results exceed the 10,000-row limit
  - **Evidence**:
    - `A-05_1_export_row_limit.png`
    - Final UI state for A-05: reports the row limit when an export exceeds 10,000 rows → `A-05_final_state.png`
    - Test: audit-log.spec.ts › "A-05: reports the row limit when an export exceeds 10,000 rows" — passed
  - **Precondition**: Authenticated admin user; filters produce more than 10,000 matching records
  - **Steps**:
    1. Apply broad filters matching > 10,000 rows
    2. Click "Export CSV", pick a date range in the dialog, and confirm
  - **Expected Result**: Toast error "Export exceeds maximum row limit (10,000). Please narrow your filters." (400 body parsed from the blob response); no CSV generated; no audit log records are deleted, archived, purged, or modified
  - **Business Rules**: BR-AUDIT-033, BR-AUDIT-034
  - **API**: `POST /api/v1/admin/audit-logs/export` → 400 `BAD_REQUEST`

- [x] **A-06**: Export with date range exceeding 365 days
  - **Evidence**:
    - `A-06_1_export_range_too_long.png`
    - Final UI state for A-06: blocks an export range longer than 365 days before any request is sent → `A-06_final_state.png`
    - Test: audit-log.spec.ts › "A-06: blocks an export range longer than 365 days before any request is sent" — passed
  - **Precondition**: Authenticated admin user
  - **Steps**:
    1. Click "Export CSV" to open the export dialog
    2. Pick a Start/End date pair spanning wider than 365 days and attempt to confirm
  - **Expected Result**: Inline error "Date range cannot exceed 365 days" shown inside the export dialog; the request is never sent and no file is generated
  - **Business Rules**: BR-AUDIT-032
  - **API**: `POST /api/v1/admin/audit-logs/export` → 400 `BAD_REQUEST` if the dialog validation is bypassed
  - **Note**: Error code VAL-AUDIT-021.

- [x] **A-07**: Confirm deletion with retention period below 90 days
  - **Evidence**:
    - `A-07_1_retention_too_short.png`
    - Final UI state for A-07 and A-15: blocks an empty or below-minimum retention period → `A-07_final_state.png`
    - Test: audit-log.spec.ts › "A-07 and A-15: blocks an empty or below-minimum retention period" — passed
  - **Precondition**: Authenticated admin user; Delete Audit Logs dialog open
  - **Steps**:
    1. Enter 89 (or lower) in the retention period input
  - **Expected Result**: Inline error "Retention period must be at least 90 days" (shown after blur/submit; input marked `aria-invalid`); Confirm Delete button disabled; API would return 400 "Minimum retention period is 90 days. Records and files younger than 90 days cannot be deleted."
  - **Business Rules**: BR-AUDIT-001, BR-AUDIT-041
  - **API**: `DELETE /api/v1/admin/audit-logs/files` → 400 `BAD_REQUEST`
  - **Note**: Error code VAL-AUDIT-030.

- [x] **A-08**: Confirm deletion when no eligible records exist
  - **Evidence**:
    - `A-08_1_no_eligible_records.png`
    - Final UI state for A-08: shows the server error when no eligible record can be deleted → `A-08_final_state.png`
    - Test: audit-log.spec.ts › "A-08: shows the server error when no eligible record can be deleted" — passed
  - **Precondition**: Authenticated admin user; no records older than the retention threshold
  - **Steps**:
    1. Open Delete Audit Logs dialog
    2. Enter valid retention >= 90
    3. Click "Confirm Delete"
  - **Expected Result**: Error message "No records or files eligible for deletion (must be >= 90 days old)." displayed inside the delete dialog; no data removed
  - **Business Rules**: BR-AUDIT-001, BR-AUDIT-041
  - **API**: `DELETE /api/v1/admin/audit-logs/files` → 400 `BAD_REQUEST`

- [x] **A-09**: Non-admin calls delete endpoint directly
  - **Evidence**:
    - API request and response evidence for I-10: denies every audit endpoint to buyer and merchant accounts → `A-09_api_call.png`
    - Test: audit-log.spec.ts › "I-10: denies every audit endpoint to buyer and merchant accounts" — passed
  - **Precondition**: Authenticated as buyer/merchant (or no token)
  - **Steps**:
    1. Call `DELETE /api/v1/admin/audit-logs/files` with a valid-looking body
  - **Expected Result**: HTTP 403 `FORBIDDEN`; "Access denied"; no records deleted
  - **Business Rules**: BR-AUDIT-040, BR-AUDIT-041
  - **API**: `DELETE /api/v1/admin/audit-logs/files` → 403

- [x] **A-10**: Open detail for a non-existent audit log ID
  - **Evidence**:
    - `A-10_1_detail_not_found.png`
    - Final UI state for A-10: shows an inline error when the detail entry does not exist → `A-10_final_state.png`
    - Test: audit-log.spec.ts › "A-10: shows an inline error when the detail entry does not exist" — passed
  - **Precondition**: Authenticated admin user
  - **Steps**:
    1. Call `GET /api/v1/admin/audit-logs/:id` with a random UUID (or simulate a stale detail link)
  - **Expected Result**: HTTP 404 with standard error body; the open detail modal shows the inline error "Audit log entry not found" (no toast)
  - **Business Rules**: None
  - **API**: `GET /api/v1/admin/audit-logs/:id` → 404 `NOT_FOUND`

- [x] **A-11**: Server error during list load preserves existing data
  - **Evidence**:
    - `A-11_1_list_error.png`
    - Final UI state for A-11: keeps the previous rows when a list request fails → `A-11_final_state.png`
    - Test: audit-log.spec.ts › "A-11: keeps the previous rows when a list request fails" — passed
  - **Precondition**: Admin has a loaded list; API returns 500 on subsequent request (e.g., failed auto-refresh)
  - **Steps**:
    1. Trigger a refresh/filter request that fails with 500
  - **Expected Result**: Existing list data remains unchanged (served from cache); a non-blocking inline error banner (role=alert) shows the API message or "Failed to load audit logs"; the next auto-refresh interval may retry
  - **Business Rules**: None (error handling)
  - **API**: Any audit endpoint → 500 `INTERNAL_SERVER_ERROR`

- [x] **A-12**: Attempt to modify an audit log record via API
  - **Evidence**:
    - API request and response evidence for A-12: rejects updates to audit log records → `A-12_api_call.png`
    - Test: audit-log.spec.ts › "A-12: rejects updates to audit log records" — passed
  - **Precondition**: Authenticated admin user with a valid audit log ID
  - **Steps**:
    1. Attempt `PUT` / `PATCH` on `/api/v1/admin/audit-logs/:id`
  - **Expected Result**: HTTP 404/405 (no update endpoint exists); audit log records are never modified
  - **Business Rules**: BR-AUDIT-001, BR-AUDIT-042
  - **API**: `PUT|PATCH /api/v1/admin/audit-logs/:id` → not available

- [x] **A-13**: List request returns 403 while the admin is on the page
  - **Evidence**:
    - Final UI state for A-13: redirects to the unauthorized page when the list request returns 403 → `A-13_final_state.png`
    - Test: audit-log.spec.ts › "A-13: redirects to the unauthorized page when the list request returns 403" — passed
  - **Precondition**: Authenticated admin user is on `/admin/audit-logs` (e.g. the session role was revoked, or the API is stubbed to return 403)
  - **Steps**:
    1. Load or refresh the audit log list so the list request returns 403
    2. Observe the resulting route
  - **Expected Result**: The page navigates to `/unauthorized` (replace, so no history entry is left behind) and renders nothing else; the same rule applies to the 403 raised by any list refresh while the screen is open
  - **Business Rules**: BR-AUDIT-040
  - **API**: `GET /api/v1/admin/audit-logs` → 403 `FORBIDDEN`

- [x] **A-14**: Export request fails with a server error
  - **Evidence**:
    - `A-14_1_export_failed.png`
    - Final UI state for A-14: keeps the export dialog open when the export request fails → `A-14_final_state.png`
    - Test: audit-log.spec.ts › "A-14: keeps the export dialog open when the export request fails" — passed
  - **Precondition**: Authenticated admin user; the export endpoint returns 500 (or the network drops the request)
  - **Steps**:
    1. Open the export dialog, pick a valid date range, and confirm
    2. Observe the response handling
  - **Expected Result**: The blob response body is parsed and its `message` is shown in an error toast (fallback "Report generation failed. Please try again."); no file is downloaded; the export dialog stays open with the entered dates so the request can be retried; the audit log list is not modified
  - **Business Rules**: BR-AUDIT-034
  - **API**: `POST /api/v1/admin/audit-logs/export` → 500 `INTERNAL_SERVER_ERROR`

- [x] **A-15**: Retention input is empty or below the minimum
  - **Evidence**:
    - Final UI state for A-07 and A-15: blocks an empty or below-minimum retention period → `A-15_final_state.png`
    - Test: audit-log.spec.ts › "A-07 and A-15: blocks an empty or below-minimum retention period" — passed
  - **Precondition**: Authenticated admin user; Delete Audit Logs dialog open
  - **Steps**:
    1. Clear the retention period input
    2. Enter a value below 90
    3. Try to submit
  - **Expected Result**: The Confirm Delete button is disabled; after blur/submit an inline error "Retention period must be at least 90 days" is shown and the input is marked `aria-invalid`; no request is sent to the API. The input is `type=number`, so non-numeric text is rejected by the browser and is not a valid UI input case.
  - **Business Rules**: BR-AUDIT-001, BR-AUDIT-041
  - **API**: none (request blocked client-side)

---

## 3. Boundary Scenarios (B) — Edge Cases & Limits

- [x] **B-01**: Search input at maximum allowable length (255 chars)
  - **Evidence**:
    - Final UI state for B-01 and B-02: caps the search input at 255 characters → `B-01_final_state.png`
    - Test: audit-log.spec.ts › "B-01 and B-02: caps the search input at 255 characters" — passed
  - **Precondition**: Authenticated admin user on `/admin/audit-logs`
  - **Steps**:
    1. Enter exactly 255 characters in the Search input
    2. Apply search
  - **Expected Result**: Input accepted; search request sent with the full query
  - **Business Rules**: BR-AUDIT-025
  - **API**: `GET /api/v1/admin/audit-logs?search=...`

- [x] **B-02**: Search input exceeding maximum allowable length (256 chars)
  - **Evidence**:
    - `B-02_1_search_length_cap.png`
    - Final UI state for B-01 and B-02: caps the search input at 255 characters → `B-02_final_state.png`
    - Test: audit-log.spec.ts › "B-01 and B-02: caps the search input at 255 characters" — passed
  - **Precondition**: Authenticated admin user on `/admin/audit-logs`
  - **Steps**:
    1. Enter 256 characters in the Search input
  - **Expected Result**: Input is capped at 255 characters via `maxLength` — the 256th character cannot be typed (silent truncation, no inline error); API returns 400 if a longer query is sent directly
  - **Business Rules**: None (input validation)
  - **API**: `GET /api/v1/admin/audit-logs` → 400 `BAD_REQUEST`
  - **Note**: Error code VAL-AUDIT-006.

- [x] **B-03**: IP address filter at 45 characters vs 46 characters
  - **Evidence**:
    - `B-03_1_ip_length_cap.png`
    - Final UI state for B-03: caps the IP address filter at 45 characters → `B-03_final_state.png`
    - Test: audit-log.spec.ts › "B-03: caps the IP address filter at 45 characters" — passed
  - **Precondition**: Authenticated admin user on `/admin/audit-logs`
  - **Steps**:
    1. Enter an exactly 45-character value in the IP Address filter and apply
    2. Verify the input's `maxLength` is 45; a longer value is restricted by the browser input
  - **Expected Result**: IP input is capped at 45 characters via `maxLength` — a 46-character value cannot be typed (silent truncation, no inline error); API returns 400 if a longer value is sent directly
  - **Business Rules**: None (input validation)
  - **API**: `GET /api/v1/admin/audit-logs?ipAddress=...`
  - **Note**: Error code VAL-AUDIT-004.

- [x] **B-04**: Retention period exactly at the 90-day minimum boundary
  - **Evidence**:
    - `B-04_1_retention_boundary.png`
    - Final UI state for B-04: accepts a retention of exactly 90 days and rejects 89 → `B-04_final_state.png`
    - Test: audit-log.spec.ts › "B-04: accepts a retention of exactly 90 days and rejects 89" — passed
  - **Precondition**: Delete Audit Logs dialog open
  - **Steps**:
    1. Enter exactly 90 in the retention input
    2. Verify Confirm Delete is enabled
    3. Enter 89 and verify Confirm Delete becomes disabled
  - **Expected Result**: 90 accepted (minimum allowed); 89 rejected with inline error — the boundary is `>= 90`
  - **Business Rules**: BR-AUDIT-001, BR-AUDIT-041
  - **API**: `DELETE /api/v1/admin/audit-logs/files` (`olderThanDays: 90` valid; `89` → 400)

- [x] **B-05**: Export date range at exactly 365 days vs 366 days
  - **Evidence**:
    - `B-05_1_export_range_boundary.png`
    - Final UI state for B-05: accepts a 365-day export range and rejects a 366-day range → `B-05_final_state.png`
    - Test: audit-log.spec.ts › "B-05: accepts a 365-day export range and rejects a 366-day range" — passed
  - **Precondition**: Authenticated admin user
  - **Steps**:
    1. Set a date range spanning 365 calendar days inclusive (e.g. 2025-01-01 → 2025-12-31) and export
    2. Set a date range spanning 366 calendar days inclusive (dateTo = dateFrom + 365 days) and export
  - **Expected Result**: Both the export dialog and the backend measure the range from start-of-day to end-of-day; the 365-day inclusive range is accepted and CSV generated; the 366-day inclusive range is rejected with "Date range cannot exceed 365 days"
  - **Business Rules**: BR-AUDIT-032
  - **API**: `POST /api/v1/admin/audit-logs/export`

- [x] **B-06**: Export row count at exactly 10,000 vs 10,001 rows
  - **Evidence**:
    - Final UI state for A-05: reports the row limit when an export exceeds 10,000 rows → `B-06_final_state.png`
    - Test: audit-log.spec.ts › "A-05: reports the row limit when an export exceeds 10,000 rows" — passed
  - **Precondition**: Authenticated admin user; ability to produce precisely sized result sets
  - **Steps**:
    1. Apply filters matching exactly 10,000 rows, export via the dialog
    2. Apply filters matching 10,001 rows, export via the dialog
  - **Expected Result**: 10,000 rows exported successfully; 10,001 rows rejected with row-limit toast; no audit records mutated in either case
  - **Business Rules**: BR-AUDIT-033, BR-AUDIT-034
  - **API**: `POST /api/v1/admin/audit-logs/export`

- [x] **B-07**: Page size options at min/max boundaries
  - **Evidence**:
    - `B-07_1_page_size_options.png`
    - Final UI state for B-07: offers page sizes 10, 20, 50, and 100 only → `B-07_final_state.png`
    - Test: audit-log.spec.ts › "B-07: offers page sizes 10, 20, 50, and 100 only" — passed
  - **Precondition**: Authenticated admin user on `/admin/audit-logs`
  - **Steps**:
    1. Open the Rows-per-page select and verify options 10, 20, 50, 100
    2. Select 100 (maximum offered by the UI)
    3. Attempt to request limit=201 via API
  - **Expected Result**: All UI options accepted (frontend schema caps limit at 100); backend accepts limit up to 200; limit=201 returns 400
  - **Business Rules**: BR-AUDIT-021, BR-AUDIT-022
  - **API**: `GET /api/v1/admin/audit-logs?limit=...`
  - **Note**: Error code VAL-AUDIT-010.

- [x] **B-08**: Empty state when no records or no filter matches
  - **Evidence**:
    - `B-08_1_empty_state.png`
    - Final UI state for B-08: shows the empty state and blocks the export when there are no records → `B-08_final_state.png`
    - Test: audit-log.spec.ts › "B-08: shows the empty state and blocks the export when there are no records" — passed
  - **Precondition**: Database has 0 records for the current view (or filters match nothing)
  - **Steps**:
    1. Navigate to `/admin/audit-logs` with no data, or apply a search with no matches
  - **Expected Result**: Friendly empty state "No matching records were found." displayed instead of a blank table; Export CSV button remains visible, but clicking it with 0 results shows an info toast "No matching records to export" and the export dialog does not open
  - **Business Rules**: None (UI)
  - **API**: `GET /api/v1/admin/audit-logs` → 200 with empty `data` and `meta.total = 0`

- [x] **B-09**: User agent is parsed, never shown raw, in detail modal
  - **Evidence**:
    - `B-09_1_parsed_user_agent.png`
    - Final UI state for B-09: parses the user agent instead of showing it raw → `B-09_final_state.png`
    - Test: audit-log.spec.ts › "B-09: parses the user agent instead of showing it raw" — passed
  - **Precondition**: Detail modal open for an entry whose user agent string exceeds 200 characters
  - **Steps**:
    1. Open the detail modal
    2. Inspect the Client Information section
  - **Expected Result**: The raw user agent string is never rendered (no truncation needed); instead it is parsed into a Client Type badge (Web Browser / Mobile App / API Client / Unknown), Browser, and Device; when no user agent exists the parsed section is hidden and IP shows "Unknown"
  - **Business Rules**: None (UI)
  - **API**: `GET /api/v1/admin/audit-logs/:id`

- [x] **B-10**: Pagination with invalid page parameter (page = 0)
  - **Evidence**:
    - API request and response evidence for I-11: error responses carry the standard API fields → `B-10_api_call.png`
    - Test: audit-log.spec.ts › "I-11: error responses carry the standard API fields" — passed
  - **Precondition**: Authenticated admin user
  - **Steps**:
    1. Call `GET /api/v1/admin/audit-logs?page=0`
  - **Expected Result**: Frontend never sends page=0 — the URL parser fails schema validation and falls back to the default query (page 1); a direct API call returns HTTP 400 (`page must not be less than 1`)
  - **Business Rules**: None (input validation)
  - **API**: `GET /api/v1/admin/audit-logs?page=0` → 400 `BAD_REQUEST`

- [x] **B-11**: Several values selected inside one multi-select
  - **Evidence**:
    - `B-11_1_multi_select_values.png`
    - Final UI state for B-11: matches any value selected in one multi-select and intersects filters → `B-11_final_state.png`
    - Test: audit-log.spec.ts › "B-11: matches any value selected in one multi-select and intersects filters" — passed
  - **Precondition**: Authenticated admin user; rows exist for at least two different action types
  - **Steps**:
    1. Select two action types in the Action multi-select
    2. Verify the request and the rows returned
    3. Add an entity type filter on top
  - **Expected Result**: The two values are sent as repeated `action` query keys (never a JSON array) and the server matches rows that satisfy **either** value (OR / `IN` semantics inside a single filter); adding the entity type filter narrows the result further (AND between different filters), so the final rows satisfy the entity type **and** one of the two actions
  - **Business Rules**: BR-AUDIT-024
  - **API**: `GET /api/v1/admin/audit-logs?action=...&action=...&entityType=...`

- [x] **B-12**: Export range covering a single day
  - **Evidence**:
    - UI before export → `B-12_1_ui_before_export.png`
    - Export dialog with the single-day range filled → `B-12_2_ui_export_dates_filled.png`
    - UI after export → `B-12_3_ui_after_export.png`
    - Test: audit-log.spec.ts › "B-12: accepts an export range that covers a single day" — passed
  - **Precondition**: Authenticated admin user; at least one audit record exists on the chosen day
  - **Steps**:
    1. Open the export dialog
    2. Set the start and end date to the same day and capture the dialog
    3. Confirm the export
  - **Expected Result**: The dialog accepts a same-day range and submits the identical start/end dates; the CSV response contains only fixture rows for that day.
  - **Note**: This boundary test verifies the CSV response using mocked fixture data, but its saved evidence is limited to the three UI screenshots.
  - **Business Rules**: BR-AUDIT-032
  - **API**: `POST /api/v1/admin/audit-logs/export`

---

## 4. Interface Scenarios (I) — API Contracts & Payloads

- [x] **I-01**: `GET /api/v1/admin/audit-logs` — returns 200 with list and pagination
  - **Evidence**:
    - API request and response evidence for I-01: returns a paginated list without an entity id field → `I-01_api_call.png`
    - Test: audit-log.spec.ts › "I-01: returns a paginated list without an entity id field" — passed
  - **Precondition**: Admin JWT provided; records exist
  - **Steps**:
    1. Call API with default params (`page=1`, `limit=50`, `sortBy=created_at`, `sortOrder=desc`)
  - **Expected Response**: Status code 200, JSON `{ data: { items: [...], meta: { page, limit, total, totalPages } } }`; each item contains `id, userId, userName, userEmail, userRole, action, entityType, summary, ipAddress, createdAt` (entityId is never sent to the client); sorted newest first; backend default limit is 50 when omitted, but the UI always sends its own limit (default 10)
  - **Business Rules**: BR-AUDIT-020, BR-AUDIT-021, BR-AUDIT-040
  - **API**: `GET /api/v1/admin/audit-logs`

- [x] **I-02**: `GET /api/v1/admin/audit-logs` — combined filters applied with AND logic
  - **Evidence**:
    - API request and response evidence for I-02: applies combined filters with AND logic → `I-02_api_call.png`
    - Test: audit-log.spec.ts › "I-02: applies combined filters with AND logic" — passed
  - **Precondition**: Admin JWT provided; records exist across users/actions/entities
  - **Steps**:
    1. Call API with `userId`, `action`, `entityType`, `dateFrom`, `dateTo`, `ipAddress`, and `search` combined
  - **Expected Response**: Status code 200; only records satisfying ALL criteria returned; `meta.total` reflects the combined predicate count
  - **Business Rules**: BR-AUDIT-024, BR-AUDIT-025
  - **API**: `GET /api/v1/admin/audit-logs?...`

- [x] **I-03**: `GET /api/v1/admin/audit-logs/filters` — returns 200 with distinct options
  - **Evidence**:
    - API request and response evidence for I-03: returns the merged filter options and hides the legacy delete label → `I-03_api_call.png`
    - Test: audit-log.spec.ts › "I-03: returns the merged filter options and hides the legacy delete label" — passed
  - **Precondition**: Admin JWT provided; audit records exist
  - **Steps**:
    1. Call `GET /api/v1/admin/audit-logs/filters`
    2. Verify route is not swallowed by the `/:id` route
  - **Expected Response**: Status code 200, JSON `{ data: { actions: string[], entityTypes: string[] } }` — distinct recorded values merged with the full action/entity-type catalog so filters offer every recordable value; the arrays are de-duplicated and sorted; the legacy `audit.admin.delete` label is filtered out of `actions`
  - **Business Rules**: BR-AUDIT-040, BR-AUDIT-028
  - **API**: `GET /api/v1/admin/audit-logs/filters`

- [x] **I-04**: `GET /api/v1/admin/audit-logs/:id` — returns 200 with full detail DTO
  - **Evidence**:
    - API request and response evidence for I-04: returns the detail DTO with masked values and no entity id → `I-04_api_call.png`
    - Test: audit-log.spec.ts › "I-04: returns the detail DTO with masked values and no entity id" — passed
  - **Precondition**: Admin JWT provided; existing audit log UUID
  - **Steps**:
    1. Call API with a valid audit log ID
  - **Expected Response**: Status code 200, JSON with `id, userId, userName, userEmail, userRole, action, entityType, summary, ipAddress, createdAt, oldValue, newValue, userAgent` (entityId is never returned to the client; sensitive fields in oldValue/newValue are masked as `***`)
  - **Business Rules**: BR-AUDIT-002, BR-AUDIT-003, BR-AUDIT-005, BR-AUDIT-006
  - **API**: `GET /api/v1/admin/audit-logs/:id`

- [x] **I-05**: `GET /api/v1/admin/audit-logs/:id` — returns 404 for non-existent ID and 400 for invalid UUID
  - **Evidence**:
    - API request and response evidence for I-05: returns 404 for a missing id and 400 for an invalid id → `I-05_api_call.png`
    - Test: audit-log.spec.ts › "I-05: returns 404 for a missing id and 400 for an invalid id" — passed
  - **Precondition**: Admin JWT provided
  - **Steps**:
    1. Call API with a random non-existent UUID
    2. Call API with a malformed ID (e.g., `abc`)
  - **Expected Response**: Step 1 → 404, JSON `{ statusCode: 404, error: "Not Found", errorCode: "RES_001", message: "Audit log entry not found", timestamp, path }`; Step 2 → 400 Bad Request for invalid UUID format
  - **Business Rules**: None
  - **API**: `GET /api/v1/admin/audit-logs/:id`

- [x] **I-06**: `POST /api/v1/admin/audit-logs/export` — returns 201 with streamed CSV file, read-only (current endpoint behavior)
  - **Evidence**:
    - API request and response evidence for I-06: streams the CSV export as a file attachment → `I-06_api_call.png`
    - Test: audit-log.spec.ts › "I-06: streams the CSV export as a file attachment" — passed
  - **Precondition**: Admin JWT provided; valid payload with `format: 'csv'`; result set under 10,000 rows and range <= 365 days
  - **Steps**:
    1. Call API with valid request body (current filters + `format: 'csv'` + `dateFrom`/`dateTo`)
    2. Verify audit_logs row count before and after
  - **Expected Response**: Status code 201 (current endpoint behavior; the detailed API design specifies 200) with the CSV file streamed directly (`Content-Type: text/csv`, `Content-Disposition: attachment; filename="audit-logs-startDate-endDate(today).csv"` — no JSON body / downloadUrl); export performs only SELECT/file-generation — zero audit log records deleted, archived, purged, or updated; CSV columns: Timestamp, Actor Name, Actor Email, Actor Role, Action, Entity Type, Old Value, New Value, IP Address, User Agent (no Entity ID column); timestamps rendered in Myanmar Time; file prefixed with a UTF-8 BOM
  - **Business Rules**: BR-AUDIT-030, BR-AUDIT-031, BR-AUDIT-034, BR-AUDIT-043
  - **API**: `POST /api/v1/admin/audit-logs/export`

- [x] **I-07**: `POST /api/v1/admin/audit-logs/export` — returns 400 for invalid format / range / row violations
  - **Evidence**:
    - API request and response evidence for I-07: rejects an invalid format, range, and row limit → `I-07_api_call.png`
    - Test: audit-log.spec.ts › "I-07: rejects an invalid format, range, and row limit" — passed
  - **Precondition**: Admin JWT provided
  - **Steps**:
    1. Send payload with `format: 'xlsx'`
    2. Send payload with `dateFrom`/`dateTo` spanning > 365 days
    3. Send payload matching > 10,000 rows
  - **Expected Response**: All → HTTP 400 `BAD_REQUEST` with corresponding messages ("format must be one of the following values: csv" / "Date range cannot exceed 365 days" / "Export exceeds maximum row limit (10,000). Please narrow your filters."); no file created
  - **Business Rules**: BR-AUDIT-030, BR-AUDIT-032, BR-AUDIT-033
  - **API**: `POST /api/v1/admin/audit-logs/export`

- [x] **I-08**: `DELETE /api/v1/admin/audit-logs/files` — returns 200 with deletion counts
  - **Evidence**:
    - API request and response evidence for I-08 and I-14: deletes eligible records, ignores file ids, and reports zero deleted files → `I-08_api_call.png`
    - Test: audit-log.spec.ts › "I-08 and I-14: deletes eligible records, ignores file ids, and reports zero deleted files" — passed
  - **Precondition**: Admin JWT provided; records aged >= 90 days exist
  - **Steps**:
    1. Call API with `{ olderThanDays: 90 }` (optionally with `recordIds` for explicit deletion)
  - **Expected Response**: Status code 200, JSON `{ deletedRecords: number, deletedFiles: number }` (deletedFiles is always 0 — CSVs are streamed, no export-file table); only records older than the threshold are removed; young records untouched; when `recordIds` is given, every ID must exist and be eligible or the request is rejected atomically
  - **Business Rules**: BR-AUDIT-001, BR-AUDIT-007, BR-AUDIT-041
  - **API**: `DELETE /api/v1/admin/audit-logs/files`

- [x] **I-09**: `DELETE /api/v1/admin/audit-logs/files` — returns 400 for threshold below minimum
  - **Evidence**:
    - API request and response evidence for I-09: rejects a retention threshold below the minimum → `I-09_api_call.png`
    - Test: audit-log.spec.ts › "I-09: rejects a retention threshold below the minimum" — passed
  - **Precondition**: Admin JWT provided
  - **Steps**:
    1. Call API with `{ olderThanDays: 89 }`
  - **Expected Response**: Status code 400 `BAD_REQUEST` with "Minimum retention period is 90 days. Records and files younger than 90 days cannot be deleted."; no records deleted (the server message still mentions files, but no export-file table exists so `deletedFiles` stays 0)
  - **Business Rules**: BR-AUDIT-001, BR-AUDIT-041
  - **API**: `DELETE /api/v1/admin/audit-logs/files`

- [x] **I-10**: All audit endpoints reject non-admin roles with 403
  - **Evidence**:
    - API request and response evidence for I-10: denies every audit endpoint to buyer and merchant accounts → `I-10_api_call.png`
    - Test: audit-log.spec.ts › "I-10: denies every audit endpoint to buyer and merchant accounts" — passed
  - **Precondition**: Buyer or merchant JWT (or no token)
  - **Steps**:
    1. Call each endpoint (`GET list`, `GET filters`, `GET :id`, `POST export`, `DELETE files`) with a non-admin token
  - **Expected Response**: Every endpoint returns HTTP 403 `FORBIDDEN` (401 when unauthenticated); JwtAuthGuard + RolesGuard enforced
  - **Business Rules**: BR-AUDIT-040
  - **API**: All `/api/v1/admin/audit-logs*` endpoints

- [x] **I-11**: Error response follows standard API format
  - **Evidence**:
    - API request and response evidence for I-11: error responses carry the standard API fields → `I-11_api_call.png`
    - Test: audit-log.spec.ts › "I-11: error responses carry the standard API fields" — passed
  - **Precondition**: Any error scenario (e.g., invalid filter params)
  - **Steps**:
    1. Trigger an error on any audit endpoint
  - **Expected Response**: JSON contains `{ statusCode, error, errorCode, message, timestamp, path }`
  - **Business Rules**: None
  - **API**: Any `/api/v1/admin/audit-logs*` endpoint

- [x] **I-12**: Sensitive fields never appear unmasked in list / detail / export
  - **Evidence**:
    - API request and response evidence for I-12: never exposes sensitive values unmasked → `I-12_api_call.png`
    - Test: audit-log.spec.ts › "I-12: never exposes sensitive values unmasked" — passed
  - **Precondition**: Audit records exist whose old/new values would otherwise include credentials
  - **Steps**:
    1. Fetch `GET /api/v1/admin/audit-logs` (list)
    2. Fetch `GET /api/v1/admin/audit-logs/:id` (detail)
    3. Fetch `POST /api/v1/admin/audit-logs/export` output
  - **Expected Response**: Passwords, access tokens, refresh tokens, and auth secrets are never present unmasked (`***`) in `oldValue`, `newValue`, or exported CSV columns
  - **Business Rules**: BR-AUDIT-002, BR-AUDIT-043
  - **API**: All read endpoints

- [x] **I-13**: `POST /api/v1/admin/audit-logs/export` — accepts the `entityId` filter but never emits an Entity ID column (current endpoint returns 201)
  - **Evidence**:
    - API request and response evidence for I-13: accepts the entity id filter but never writes an entity id column → `I-13_api_call.png`
    - Test: audit-log.spec.ts › "I-13: accepts the entity id filter but never writes an entity id column" — passed
  - **Precondition**: Admin JWT provided; at least one record has a non-null `entity_id`
  - **Steps**:
    1. Call the export endpoint with `{ format: 'csv', entityId: '<uuid>', dateFrom, dateTo }`
  - **Expected Response**: Status code 201 (current endpoint behavior; the detailed API design specifies 200) with the streamed CSV; only the matching rows are exported; the header row is exactly `Timestamp, Actor Name, Actor Email, Actor Role, Action, Entity Type, Old Value, New Value, IP Address, User Agent` — no Entity ID column is ever written, even though `entityId` is an accepted filter
  - **Business Rules**: BR-AUDIT-030, BR-AUDIT-031, BR-AUDIT-034, BR-AUDIT-027
  - **API**: `POST /api/v1/admin/audit-logs/export`

- [x] **I-14**: `DELETE /api/v1/admin/audit-logs/files` — `fileIds` is accepted for contract compatibility and ignored
  - **Evidence**:
    - API request and response evidence for I-08 and I-14: deletes eligible records, ignores file ids, and reports zero deleted files → `I-14_api_call.png`
    - Test: audit-log.spec.ts › "I-08 and I-14: deletes eligible records, ignores file ids, and reports zero deleted files" — passed
  - **Precondition**: Admin JWT provided; an eligible (>= 90 days) record exists
  - **Steps**:
    1. Call the endpoint with `{ olderThanDays: 90, fileIds: ['<uuid>'] }`
  - **Expected Response**: Status code 200 with `{ deletedRecords: <n>, deletedFiles: 0 }`; the `fileIds` value changes nothing (no export-file storage exists, so it is never deleted and never counted); only the eligible DB records are removed
  - **Business Rules**: BR-AUDIT-001, BR-AUDIT-007, BR-AUDIT-041
  - **API**: `DELETE /api/v1/admin/audit-logs/files`

- [x] **I-15**: `GET /api/v1/admin/audit-logs` — `entityId` filter is honoured but the field is never returned
  - **Evidence**:
    - API request and response evidence for I-15: honours the entity id filter without returning the field → `I-15_api_call.png`
    - Test: audit-log.spec.ts › "I-15: honours the entity id filter without returning the field" — passed
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
| E2E tests implemented | ☑️ |
| PCL auto-update verified | ☐ |
| Next review date | 2026-10-31 |
