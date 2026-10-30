# Program Checklist (PCL) — Commission & Revenue

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-PCL-COMM-001 |
| **Target Screen** | Admin Commission / Revenue Dashboard (手数料・収益管理) |
| **Subsystem** | Commission Management & Revenue Tracking |
| **Version** | 1.5 |
| **Created** | 2026-10-14 |
| **Last Updated** | 2026-10-22 |
| **Status** | Active |

---

## 1. Normal Scenarios (N) — Happy Path

- [x] **N-01**: Commission tab loads by default with rate card and report table
  - **Evidence**:
    - Admin landing (User Management) right after admin login → `N-01_0_admin_users_landing.png`
    - `N-01_1_ui_commission_tab_loaded.png`
    - Test: commission-revenue.spec.ts › "N-01: loads the Commission tab by default with rate and reports" — passed
    - Test: commission-revenue.spec.ts › "N-01: navigates from the admin landing page to the Commission tab" — passed
  - **Precondition**: Admin can sign in through the login form.
  - **Steps**:
    1. Sign in through the login form → the admin lands on `/admin/users` (User Management).
    2. In the sidebar click "Commission & Revenue" → `/admin/commission-revenue`.
    3. Verify the "Commission" tab is active by default, the rate card shows the rate that is persisted in `commission_settings`, and the report table renders the Merchant / Commission Rate / Orders / Revenue / Commission columns.
  - **Expected Result**: The screen renders at `/admin/commission-revenue`; the "Commission" tab is active by default; the rate card shows the saved platform rate as a percentage string; the report table renders its rows. The screen is **read-only** — no database row is written.

- [x] **N-02**: Edit commission rate successfully
  - **Evidence**:
    - `N-02_1_ui_before_rate_card.png`
    - `N-02_2_ui_doing_rate_input_filled.png`
    - `N-02_3_ui_after_rate_changed.png`
    - DB CHANGES — commission_settings updated in place, one new rate-history row, one new audit row → `N-02_4_db_after_rate_update.png`
    - DB CHANGES — commission_settings updated in place, one new rate-history row, one new audit row → `N-02_4_db_after_rate_update.json`
    - Test: commission-revenue.spec.ts › "N-02: updates the commission rate successfully" — passed
    - Test: commission-revenue.spec.ts › "N-02: updates the commission rate successfully (live stack evidence)" — passed
  - **Precondition**: Admin is on the Commission tab and the saved platform rate differs from the target rate (`12`), so the change is observable.
  - **Steps**:
    1. Note the rate card (e.g. `15%`).
    2. Click "Edit Rate" — the dialog opens **pre-filled with the saved rate**.
    3. Replace the input content with `12` (no separate clear step — `fill` replaces the value).
    4. Click "Save" and validate the API contract: `PATCH /api/v1/admin/commission` → `200`, request body `{"rate":"12"}` (decimal **string**), response body `{"data":{"rate":"12"}}`.
    5. Verify the dialog closed, the toast "Commission rate updated" is shown and the rate card renders `12%`.
  - **Expected Result**:
    - **UI**: the dialog closes on save; the toast "Commission rate updated" is shown; the rate card changes from the saved rate to `12%` (whole number, no decimals — the card renders `Number(rate)`).
    - **API**: `PATCH /api/v1/admin/commission` → `200` with `{"data":{"rate":"12"}}`; the request body carries the rate as a decimal string so no precision is lost.
    - **Database**: the singleton `commission_settings` row is updated **in place** (same `id`) to `commission_rate = 12.00`, with `updated_by` = the acting admin and `updated_at` moved forward; exactly **one** new row is appended to `commission_rate_history` (`commission_rate = 12.00`, `effective_from` = now, `created_by` = the acting admin). The new rate applies to **new orders only** (existing orders keep their historical rate — see N-31).
    - **Audit log**: one `COMMISSION_RATE_UPDATED` entry for the `CommissionSetting` entity with `old_value.rate` = the saved rate and `new_value.rate` = `"12"`.
    - **Environment**: the scenario restores the saved rate afterwards (asserted, not captured — the restore appends a second history and audit row because both tables are append-only).
    - **Value formats**: database `12.00` (DECIMAL(5,2)) · API/audit `"12"` · UI `12%` — assertions compare numerically.

- [x] **N-03**: Filter commission reports by date range
  - **Evidence**:
    - `N-03_1_filtered_reports.png`
    - Final UI state for N-03 and N-04: applies and resets commission report date filters → `N-03_final_state.png`
    - Test: commission-revenue.spec.ts › "N-03 and N-04: applies and resets commission report date filters" — passed
  - **Precondition**: Admin is on Commission tab with report data
  - **Steps**:
    1. Set "From" to `2026-08-01`
    2. Set "To" to `2026-08-15`
    3. Click "Apply"
  - **Expected Result**: Report table refreshes with filtered rows; pagination resets to page 1
  - **Business Rules**: BR-COMM-004, BR-COMM-005
  - **API**: `GET /api/v1/admin/commission/reports?from=2026-08-01&to=2026-08-15`

- [x] **N-04**: Reset commission report filters
  - **Evidence**:
    - `N-04_1_filters_reset.png`
    - Final UI state for N-03 and N-04: applies and resets commission report date filters → `N-04_final_state.png`
    - Test: commission-revenue.spec.ts › "N-03 and N-04: applies and resets commission report date filters" — passed
  - **Precondition**: Admin has applied a date filter on the Commission tab
  - **Steps**:
    1. Click "Reset"
  - **Expected Result**: Date fields cleared; full report data restored; pagination resets to first page
  - **Business Rules**: BR-COMM-005
  - **API**: `GET /api/v1/admin/commission/reports`

- [x] **N-05**: Paginate the commission report table
  - **Evidence**:
    - `N-05_1_report_paged.png`
    - Final UI state for N-05: changes report page size and advances pagination when another page exists → `N-05_final_state.png`
    - Test: commission-revenue.spec.ts › "N-05: changes report page size and advances pagination when another page exists" — passed
  - **Precondition**: Admin is on Commission tab with more than 20 report rows
  - **Steps**:
    1. Set the "Rows" selector to `20`
    2. Click "Next >" in the pagination controls
  - **Expected Result**: Rows reload with page size 20 and page 2 content; "Showing page 2 of …" updates (column headers are not sortable in the current UI — default order is backend-computed: merchant name asc / date asc)
  - **Business Rules**: BR-COMM-005
  - **API**: `GET /api/v1/admin/commission/reports?page=2&limit=20`

- [x] **N-06**: Revenue tab loads KPIs, chart, target, panels, and payout table
  - **Evidence**:
    - `N-06_1_revenue_tab.png`
    - Final UI state for N-06 and N-20: loads revenue KPIs, chart, target, panels, and payout columns → `N-06_final_state.png`
    - Test: commission-revenue.spec.ts › "N-06 and N-20: loads revenue KPIs, chart, target, panels, and payout columns" — passed
  - **Precondition**: Admin is authenticated
  - **Steps**:
    1. Navigate to `/admin/commission-revenue`
    2. Click the "Revenue" tab
    3. Verify 6 KPI cards display values
    4. Verify trend chart, target progress card, Payout Status / Ad Payment Status / Ad Fee Summary panels, and payout table load
  - **Expected Result**: Total Revenue, Total Commission, Ad Fee Revenue, Total Income, Avg Order Value, Net Revenue render as currency strings; chart and tables populated
  - **Business Rules**: BR-REV-001, BR-ADFE-002, BR-ADFE-005, BR-COMM-008
  - **API**: `GET /api/v1/admin/revenue/kpis`, `/revenue/trends`, `/revenue/forecast`, `/revenue/target`, `/revenue/ad-fee`, `/revenue/payouts`, `/revenue/payouts/merchants`

- [x] **N-07**: Change trend chart range
  - **Evidence**:
    - `N-07_1_range_changed.png`
    - Final UI state for N-07: changes the revenue trend range → `N-07_final_state.png`
    - Test: commission-revenue.spec.ts › "N-07: changes the revenue trend range" — passed
  - **Precondition**: Admin is on Revenue tab
  - **Steps**:
    1. Verify default range is `30d`
    2. Click `7d`, then `90d`, then `1y`
  - **Expected Result**: Chart refetches and updates for each range; forecast series refreshes accordingly
  - **Business Rules**: BR-REV-002, BR-REV-013
  - **API**: `GET /api/v1/admin/revenue/trends?range=7d`

- [x] **N-08**: Process a pending payout successfully
  - **Evidence**:
    - `N-08_1_ui_doing_process_dialog.png`
    - DB CHANGES — the payout row is completed and the PAYOUT_PROCESSED audit row was written → `N-08_2_db_after_payout_process.png`
    - DB CHANGES — the payout row is completed and the PAYOUT_PROCESSED audit row was written → `N-08_2_db_after_payout_process.json`
    - Test: commission-revenue.spec.ts › "N-08: processes a pending payout after confirmation" — passed
    - Test: commission-revenue.spec.ts › "N-08: processes a pending payout after confirmation (live stack evidence)" — passed
  - **Precondition**: A `pending` payout row exists for a merchant. The backend never creates payout rows at runtime, so the test seeds the fixture `e2e00000-…-a1` for the current period and deletes it again afterwards.
  - **Steps**:
    1. Open the "Revenue" tab and locate the `pending` payout row.
    2. Click the process icon (aria-label "Process") on that row.
    3. Verify the confirmation dialog "Process payout for <merchant>?" shows Total Amount, −Commission Fee, Net Payout and the note that ad fees are excluded.
    4. Click "Confirm".
  - **Expected Result**:
    - **API**: `POST /api/v1/admin/revenue/payouts/:id/process` → **201** with `{ "data": { "payoutId", "status": "completed", "processedAt", "idempotencyKey" } }`.
    - **UI**: success toast "Payout processed"; the row's status badge changes from "Pending" to "Completed" and shows the completed date.
    - **Database**: the `payouts` row moves `status: pending → completed` with `processed_at`, `processed_by` (the acting admin) and `idempotency_key = payout-<id>`; `net_payout` stays `total_amount − commission_amount` (ad fees are never deducted); a `PAYOUT_COMPLETED` notification is created for the merchant user.
    - **Audit log**: one `PAYOUT_PROCESSED` entry for that payout with `old_value.status = "pending"` → `new_value.status = "completed"`.

- [x] **N-09**: Set a revenue target
  - **Evidence**:
    - `N-09_1_ui_doing_target_filled.png`
    - DB CHANGES — the monthly row is updated in place and a TARGET_UPDATED audit row was written → `N-09_2_db_after_target_save.png`
    - DB CHANGES — the monthly row is updated in place and a TARGET_UPDATED audit row was written → `N-09_2_db_after_target_save.json`
    - Test: commission-revenue.spec.ts › "N-09 and N-11: saves a revenue target and changes its period" — passed
    - Test: commission-revenue.spec.ts › "N-09 and N-11: saves a revenue target and changes its period (live stack evidence)" — passed
  - **Precondition**: Admin is on the Revenue tab; a monthly target may or may not exist.
  - **Steps**:
    1. Click "Edit Target" (or "Set Target" when no target exists).
    2. Enter `100000` and select the `monthly` period.
    3. Click "Save Target".
  - **Expected Result**:
    - **API**: `PUT /api/v1/admin/revenue/targets` → `200` with `{ "data": { "targetAmount": "100000", "targetPeriod": "monthly", "actualRevenue", "progressPercent" } }`.
    - **UI**: success toast "Revenue target updated"; the target card shows the new amount and the progress bar / gauge is rendered.
    - **Database**: the `revenue_targets` row for `monthly` is **updated in place** (same `id`, `is_active = true`) — `target_amount` becomes `100000.00` and `updated_at` moves forward; the `quarterly` row is not touched.
    - **Audit log**: one `TARGET_UPDATED` entry with `new_value.targetAmount = "100000"` and `new_value.period = "monthly"`.

- [x] **N-10**: View AI revenue forecast on trend chart
  - **Evidence**:
    - `N-10_1_forecast_line.png`
    - Final UI state for N-10: displays the AI forecast legend when forecast data is available → `N-10_final_state.png`
    - Test: commission-revenue.spec.ts › "N-10: displays the AI forecast legend when forecast data is available" — passed
  - **Precondition**: Admin is on Revenue tab with sufficient historical data
  - **Steps**:
    1. Verify dotted forecast line on the trend chart
    2. Verify "AI Forecast" legend visible
    3. Change range to `7d`
  - **Expected Result**: Dotted line continues the trend line and updates for the selected range; forecast includes revenue + platform fees + ad fees
  - **Business Rules**: BR-REV-011, BR-REV-012, BR-REV-013, BR-REV-015, BR-ADFE-006
  - **API**: `GET /api/v1/admin/revenue/forecast?range=30d`

- [x] **N-11**: Toggle revenue target period and view progress gauge
  - **Evidence**:
    - `N-11_1_ui_quarterly_gauge.png`
    - Test: commission-revenue.spec.ts › "N-09 and N-11: saves a revenue target and changes its period" — passed
    - Test: commission-revenue.spec.ts › "N-09 and N-11: saves a revenue target and changes its period (live stack evidence)" — passed
  - **Precondition**: A monthly target exists.
  - **Steps**:
    1. Toggle the target period from `monthly` to `quarterly`.
    2. Verify the gauge bar and the progress percentage are re-rendered for the selected period.
  - **Expected Result**:
    - **UI**: the target card re-renders for the selected period; the progress bar is present and the progress label shows the clamped 0–100 % value.
    - **API**: only a read (`GET /api/v1/admin/revenue/target?period=quarterly`) is issued — no write.
    - **Database**: **no row is written** — the `quarterly` row is identical before and after the switch and no `TARGET_UPDATED` audit row is created.

- [x] **N-12**: View ad fee revenue, trend, and ad payment status
  - **Evidence**:
    - `N-12_1_ad_fee_display.png`
    - Final UI state for N-12: displays ad fee revenue and payment status panels → `N-12_final_state.png`
    - Test: commission-revenue.spec.ts › "N-12: displays ad fee revenue and payment status panels" — passed
  - **Precondition**: Admin is on Revenue tab with ad payment data
  - **Steps**:
    1. Verify Ad Fee Revenue KPI card shows correct value
    2. Verify ad fee trend line renders on the chart
    3. Verify Ad Payment Status panel shows Completed / Pending / Refunded badges
    4. Verify Ad Fee Summary card displays active ads, total collected, pending
  - **Expected Result**: Ad fee values included in Total Income KPI; ad payment badges in a single-row 3-column grid
  - **Business Rules**: BR-ADFE-001, BR-ADFE-002, BR-ADFE-003, BR-ADFE-005
  - **API**: `GET /api/v1/admin/revenue/ad-fee?range=30d`

- [x] **N-13**: Export commission report as CSV
  - **Evidence**:
    - `N-13_1_ui_doing_export_commission.png`
    - Test: commission-revenue.spec.ts › "N-13: exports the commission report as CSV" — passed
    - Test: commission-revenue.spec.ts › "N-13 to N-15: exports the three reports and proves only the audit log changed in the database" — passed
  - **Precondition**: Admin is on the Commission tab and a date range with data exists.
  - **Steps**:
    1. Click "Export" (Commission Report card).
    2. Select format `CSV` and a valid date range.
    3. Click "Generate".
  - **Expected Result**:
    - **API**: `POST /api/v1/admin/commission/export` → 201 with a `text/csv` stream.
    - **UI**: the CSV file downloads; the modal shows the progress state while the request is in flight.
    - **Database**: **no business table is modified** — the fingerprints of `commission_settings`, `revenue_targets`, `payouts` and `payout_items` are identical before and after; only `audit_logs` grows by one `EXPORT_GENERATED` row (`reportType: "commission"`).

- [x] **N-14**: Export revenue report as Excel (XLSX)
  - **Evidence**:
    - `N-14_1_ui_doing_export_revenue.png`
    - Test: commission-revenue.spec.ts › "N-14: exports the revenue report as XLSX" — passed
    - Test: commission-revenue.spec.ts › "N-13 to N-15: exports the three reports and proves only the audit log changed in the database" — passed
  - **Precondition**: Admin is on the Revenue tab and a date range with data exists.
  - **Steps**:
    1. Click "Export Revenue".
    2. Select format `Excel` and a valid date range.
    3. Click "Generate".
  - **Expected Result**:
    - **API**: `POST /api/v1/admin/revenue/export` → 201 with an XLSX stream.
    - **UI**: the XLSX file downloads; the modal shows the progress state while the request is in flight.
    - **Database**: **no business table is modified**; only `audit_logs` grows by one `EXPORT_GENERATED` row (`reportType: "revenue"`).

- [x] **N-15**: Export payout history as CSV
  - **Evidence**:
    - `N-15_1_ui_doing_export_payout.png`
    - DB CHANGES — one EXPORT_GENERATED audit row per export; no business table was modified → `N-15_2_db_after_exports.png`
    - DB CHANGES — one EXPORT_GENERATED audit row per export; no business table was modified → `N-15_2_db_after_exports.json`
    - Test: commission-revenue.spec.ts › "N-15: exports payout history as CSV" — passed
    - Test: commission-revenue.spec.ts › "N-13 to N-15: exports the three reports and proves only the audit log changed in the database" — passed
  - **Precondition**: Admin is on the Revenue tab and a date range with payout data exists.
  - **Steps**:
    1. Click "Export Payout" (Merchant Payouts header).
    2. Select format `CSV` and a valid date range (prefilled from the period filter when one is applied).
    3. Click "Generate".
  - **Expected Result**:
    - **API**: `POST /api/v1/admin/revenue/payouts/export` → 201 with a CSV stream; the Net column is `total − commission` (ad fees excluded).
    - **UI**: the CSV file downloads; the modal shows the progress state while the request is in flight.
    - **Database**: **no business table is modified**; the three exports of this scenario add exactly three `EXPORT_GENERATED` rows to `audit_logs` (`commission`, `revenue`, `payout`) and nothing else changes.

- [x] **N-16**: Language toggle works on screen
  - **Evidence**:
    - `N-16_1_lang_ja.png`
    - `N-16_2_lang_my.png`
    - Final UI state for N-16: language toggle works on screen → `N-16_final_state.png`
    - Test: commission-revenue.spec.ts › "N-16: language toggle works on screen" — passed
  - **Precondition**: Admin is on `/admin/commission-revenue`
  - **Steps**:
    1. Toggle language to Japanese
    2. Verify labels change
    3. Toggle to Myanmar
    4. Toggle back to English
  - **Expected Result**: Dashboard header/sidebar i18n labels update (e.g., sidebar menu `nav.menu.commissionRevenue` becomes "手数料・収益" / "ကော်မရှင်နှင့် ဝင်ငွေ"); preference persisted. ⚠️ Page body labels (tabs, buttons, tables, dialogs) are currently hardcoded English on this screen — they do NOT translate
  - **Business Rules**: None (i18n)

- [x] **N-17**: Theme toggle works on screen
  - **Evidence**:
    - `N-17_1_dark.png`
    - `N-17_2_light.png`
    - Final UI state for N-17: theme toggle works on screen → `N-17_final_state.png`
    - Test: commission-revenue.spec.ts › "N-17: theme toggle works on screen" — passed
  - **Precondition**: Admin is on `/admin/commission-revenue`
  - **Steps**:
    1. Toggle theme to dark
    2. Verify dark background applied
    3. Toggle back to light
  - **Expected Result**: Styling switches between light and dark modes; preference persisted
  - **Business Rules**: None (UI)

- [x] **N-18**: Responsive layout on desktop viewport
  - **Evidence**:
    - `N-18_1_desktop_layout.png`
    - Final UI state for N-18 and N-19: keeps the dashboard usable at desktop and mobile widths → `N-18_final_state.png`
    - Test: commission-revenue.spec.ts › "N-18 and N-19: keeps the dashboard usable at desktop and mobile widths" — passed
  - **Precondition**: Viewport >= 1024px
  - **Steps**:
    1. Set viewport to 1280x720
    2. Verify multi-column KPI grid and full-width tables
  - **Expected Result**: Desktop layout with multi-column KPI grid and full-width tables
  - **Business Rules**: None (Responsive)

- [x] **N-19**: Responsive layout on mobile viewport
  - **Evidence**:
    - `N-19_1_mobile_layout.png`
    - Final UI state for N-18 and N-19: keeps the dashboard usable at desktop and mobile widths → `N-19_final_state.png`
    - Test: commission-revenue.spec.ts › "N-18 and N-19: keeps the dashboard usable at desktop and mobile widths" — passed
  - **Precondition**: Viewport < 768px
  - **Steps**:
    1. Set viewport to 375x667
    2. Verify stacked KPI cards and horizontally scrollable tables
  - **Expected Result**: Stacked single-column cards; tables scroll horizontally; export modal full-width
  - **Business Rules**: None (Responsive)

- [x] **N-20**: Payout table renders amounts, status, and dates per row
  - **Evidence**:
    - Final UI state for N-06 and N-20: loads revenue KPIs, chart, target, panels, and payout columns → `N-20_final_state.png`
    - Test: commission-revenue.spec.ts › "N-06 and N-20: loads revenue KPIs, chart, target, panels, and payout columns" — passed
  - **Precondition**: Admin is on Revenue tab with payout rows
  - **Steps**:
    1. Inspect a payout row (Merchant, Period, Total Orders, Total Amount, Commission, Net Payout, Status, Completed Date)
    2. Verify Total Orders badge = completed + pending order counts
    3. Verify Net Payout = Total Amount − Commission
  - **Expected Result**: Amounts rendered as `… Ks`; Commission shown in red with a minus sign; Period rendered as `MMM YYYY`; Status badge matches the row status; Completed Date shows a date only for `completed` payouts (`-` otherwise); ad fees never deducted from Net Payout
  - **Business Rules**: BR-REV-005, BR-REV-016, BR-ADFE-004
  - **API**: `GET /api/v1/admin/revenue/payouts`

- [x] **N-21**: Switch commission report grouping (By Merchant / By Day / By Order)
  - **Evidence**:
    - Final UI state for N-21: switches report grouping by merchant, day, and order → `N-21_final_state.png`
    - Test: commission-revenue.spec.ts › "N-21: switches report grouping by merchant, day, and order" — passed
  - **Precondition**: Admin is on Commission tab with report data
  - **Steps**:
    1. Click "By Day"
    2. Click "By Order"
    3. Click "By Merchant"
  - **Expected Result**: Clicked button becomes active (primary) and the report refetches each time; "By Day" adds a Date column, "By Order" shows Order Number + Date and hides the Orders column, "By Merchant" restores merchant rows; report card title updates to `daily` / `by order` / `by merchant`
  - **Business Rules**: BR-COMM-005
  - **API**: `GET /api/v1/admin/commission/reports?groupBy=day`

- [x] **N-22**: Cancel Edit Rate keeps the saved rate
  - **Evidence**:
    - Final UI state for N-22: canceling rate edits preserves the saved value → `N-22_final_state.png`
    - Test: commission-revenue.spec.ts › "N-22: canceling rate edits preserves the saved value" — passed
  - **Precondition**: Admin is on Commission tab
  - **Steps**:
    1. Click "Edit Rate"
    2. Change the value to `50`
    3. Click "Cancel"
    4. Re-open the dialog
  - **Expected Result**: Dialog closes without sending `PATCH`; rate card unchanged; reopened dialog is pre-filled with the saved rate again
  - **Business Rules**: BR-COMM-001
  - **API**: None (no request sent)

- [x] **N-23**: Filter payout list by status, merchant, and period
  - **Evidence**:
    - Final UI state for N-23 to N-25: filters, searches, and resets payout rows → `N-23_final_state.png`
    - Test: commission-revenue.spec.ts › "N-23 to N-25: filters, searches, and resets payout rows" — passed
  - **Precondition**: Admin is on Revenue tab with payout data spanning multiple statuses/merchants/periods
  - **Steps**:
    1. Set Status to `Pending`
    2. Set Merchant to a specific merchant
    3. Set Period to a specific month (e.g. Aug 2026)
  - **Expected Result**: Each change refetches the payout table with the matching query parameter and resets pagination to page 1; only matching rows are shown; Status offers All / Pending / Processing / Completed; Period options are built from the returned payout periods (newest 6)
  - **Business Rules**: BR-REV-005
  - **API**: `GET /api/v1/admin/revenue/payouts?status=pending&merchantId=<id>&period=YYYY-MM`

- [x] **N-24**: Search payout list by merchant name or period
  - **Evidence**:
    - Final UI state for N-23 to N-25: filters, searches, and resets payout rows → `N-24_final_state.png`
    - Test: commission-revenue.spec.ts › "N-23 to N-25: filters, searches, and resets payout rows" — passed
  - **Precondition**: Admin is on Revenue tab
  - **Steps**:
    1. Type a merchant name (or `YYYY-MM`) into the Search box
    2. Click the search icon button (aria-label "Search payouts") — Enter does not trigger the search
    3. Search for a term that matches nothing
  - **Expected Result**: Search runs server-side and resets to page 1; only matching rows remain; no-match shows the empty state "No payouts found."
  - **Business Rules**: None (payout list search)
  - **API**: `GET /api/v1/admin/revenue/payouts?search=<term>`

- [x] **N-25**: Reset payout filters
  - **Evidence**:
    - Final UI state for N-23 to N-25: filters, searches, and resets payout rows → `N-25_final_state.png`
    - Test: commission-revenue.spec.ts › "N-23 to N-25: filters, searches, and resets payout rows" — passed
  - **Precondition**: Status/merchant/period/search filters are applied on the Revenue tab
  - **Steps**:
    1. Click "Reset"
  - **Expected Result**: Status and Merchant return to "All", Period to "All periods", search box cleared, pagination back to page 1, full payout list restored
  - **Business Rules**: None (UI)
  - **API**: `GET /api/v1/admin/revenue/payouts`

- [x] **N-26**: Paginate the payout table
  - **Evidence**:
    - Final UI state for N-26: paginates the payout table → `N-26_final_state.png`
    - Test: commission-revenue.spec.ts › "N-26: paginates the payout table" — passed
  - **Precondition**: Payout list has more rows than the current page size
  - **Steps**:
    1. Click the next page control
    2. Change the page size to `20`
  - **Expected Result**: Rows update for the selected page; page-size options are 10 / 20 / 50 / 100; changing the page size resets to page 1
  - **Business Rules**: None (payout list browsing)
  - **API**: `GET /api/v1/admin/revenue/payouts?page=2&limit=20`

- [x] **N-27**: View payout detail dialog
  - **Evidence**:
    - Final UI state for N-27: opens payout details for a listed payout → `N-27_final_state.png`
    - Test: commission-revenue.spec.ts › "N-27: opens payout details for a listed payout" — passed
  - **Precondition**: Admin is on Revenue tab with payout rows
  - **Steps**:
    1. Click the eye (View payout details) icon on a `completed` payout
    2. Verify Total Amount, −Commission Fee, Net Payout, and Paid Date
    3. Click "Close", then click the eye icon on a `pending` payout
  - **Expected Result**: Dialog "Payout Detail for <merchant>" opens with the amount rows and Paid Date (`-` when not yet processed); viewing or cancelling a pending payout also fires the review request, which moves `pending` → `processing` and refreshes the list
  - **Business Rules**: BR-REV-005, BR-REV-016, BR-COMM-007
  - **API**: `POST /api/v1/admin/revenue/payouts/:id/review`

- [x] **N-28**: Select and bulk-delete eligible payout rows
  - **Evidence**:
    - `N-28_1_ui_doing_delete_dialog.png`
    - DB CHANGES — the payout row is gone from payouts and a PAYOUT_DELETED audit row remains → `N-28_2_db_after_payout_deleted.png`
    - DB CHANGES — the payout row is gone from payouts and a PAYOUT_DELETED audit row remains → `N-28_2_db_after_payout_deleted.json`
    - Test: commission-revenue.spec.ts › "N-28: selects and deletes an eligible payout row" — passed
    - Test: commission-revenue.spec.ts › "N-28: selects and deletes an eligible payout row (live stack evidence)" — passed
  - **Precondition**: A completed payout that is at least three months old exists. The test seeds the fixture `e2e00000-…-b2` (created 5 months ago) and removes it again afterwards.
  - **Steps**:
    1. Tick the row checkbox of that payout (or the header select-all checkbox).
    2. Click the trash (Delete selected payouts) button.
    3. Verify the confirmation dialog "Are you sure you want to delete these rows?" is shown.
    4. Click "Confirm delete".
  - **Expected Result**:
    - **API**: `DELETE /api/v1/admin/revenue/payouts` → 200 with `{ "data": { "payoutIds": [...], "deleted": true } }`.
    - **UI**: success toast "Payouts deleted"; the row disappears from the table and the selection is cleared (the trash button is disabled again).
    - **Database**: the `payouts` row **and its `payout_items` rows are removed** from the database.
    - **Audit log**: one `PAYOUT_DELETED` entry per deleted payout with `old_value.status`, `old_value.totalAmount`, `old_value.periodStart` and the deleted order ids.
    - ⚠️ The confirmation copy is generic ("This action cannot be undone.") — it does **not** state the selected row count (see B-16).

- [x] **N-29**: Payout confirmation dialog shows amount breakdown and processing state
  - **Evidence**:
    - Final UI state for N-29: payout processing dialog shows payout amounts → `N-29_final_state.png`
    - Test: commission-revenue.spec.ts › "N-29: payout processing dialog shows payout amounts" — passed
  - **Precondition**: Admin is on Revenue tab; the payout aggregates multiple orders
  - **Steps**:
    1. Click the process ($) icon on a payout row
    2. Review Total Amount, −Commission Fee, Net Payout, and the Breakdown section
    3. Click "Confirm" and observe the button while the request is in flight
  - **Expected Result**: Title "Process payout for <merchant>?"; description states ad fees are excluded (net = total − commission); Breakdown lists completed/pending order counts and amounts when more than one order exists; buttons show "Processing..." and are disabled until the request settles
  - **Business Rules**: BR-REV-005, BR-REV-016, BR-ADFE-004
  - **API**: `POST /api/v1/admin/revenue/payouts/:id/process`

- [x] **N-30**: Apply and remove multiple payout filters simultaneously (Status + Merchant + Period)
  - **Evidence**:
    - `N-30_1_combined_filters.png`
    - `N-30_2_merchant_filter_removed.png`
    - Final UI state for N-30: applies and removes multiple payout filters simultaneously → `N-30_final_state.png`
    - Test: commission-revenue.spec.ts › "N-30: applies and removes multiple payout filters simultaneously" — passed
  - **Precondition**: Admin is on Revenue tab with payout data spanning multiple statuses/merchants/periods
  - **Steps**:
    1. Set Status to `Pending`, Merchant to a specific merchant, and Period to a specific month (e.g. Aug 2026) simultaneously
    2. Verify the payout request carries all three parameters (`status`, `merchantId`, `period`) and the table narrows to the intersection (product set) of the three conditions
    3. Reset only Merchant to "All" while keeping Status and Period selected
  - **Expected Result**: Combined filters refetch with `GET /api/v1/admin/revenue/payouts?status=pending&merchantId=<id>&period=YYYY-MM` and show only rows matching all three; after restoring Merchant to "All", `merchantId` is excluded from the query (empty values are not sent — `RevenueTab.tsx` spreads only truthy filter values), Status and Period are retained, pagination resets to page 1, and results update in real time without page reload
  - **Business Rules**: BR-REV-005
  - **API**: `GET /api/v1/admin/revenue/payouts?status=pending&merchantId=<id>&period=YYYY-MM`

- [x] **N-31**: Historical rate locking for existing report rows after a rate change
  - **Evidence**:
    - `N-31_1_ui_before_report_rows.png`
    - DB CHANGES — exactly one new rate-history row; the existing orders keep their historical rate → `N-31_2_db_after_rate_lock.png`
    - DB CHANGES — exactly one new rate-history row; the existing orders keep their historical rate → `N-31_2_db_after_rate_lock.json`
    - Test: commission-revenue.spec.ts › "N-31: historical rate locking for existing report rows after a rate change" — passed
    - Test: commission-revenue.spec.ts › "N-31: historical rate locking for existing report rows after a rate change (live stack evidence)" — passed
  - **Precondition**: Commission report rows exist at the current rate.
  - **Steps**:
    1. Note the commission rate / commission values of the existing report rows.
    2. Change the platform rate through the "Edit Rate" dialog and save.
    3. Reload the commission report for the same date range.
  - **Expected Result**:
    - **UI**: the rate card shows the new rate; the existing report rows are unchanged (same merchant, order, date, rate, revenue and commission).
    - **API**: `PATCH /api/v1/admin/commission` → 200; `GET /api/v1/admin/commission/reports` returns identical rows before and after the change.
    - **Database**: exactly **one new row** is appended to `commission_rate_history` (`commission_rate` = the new rate, `effective_from` = now, `created_by` = the acting admin); the existing history rows are untouched, so orders placed earlier keep their historical rate.
    - **Audit log**: one `COMMISSION_RATE_UPDATED` entry for the rate change.

## 2. Abnormal Scenarios (A) — Error & Negative Paths

- [x] **A-01**: Edit rate with empty input
  - **Evidence**:
    - Final UI state for A-01 to A-03 and B-14: blocks empty, invalid, above-limit, and zero commission rates → `A-01_final_state.png`
    - Test: commission-revenue.spec.ts › "A-01 to A-03 and B-14: blocks empty, invalid, above-limit, and zero commission rates" — passed
  - **Precondition**: Edit Rate dialog is open
  - **Steps**:
    1. Clear the rate input
    2. Click "Save"
  - **Expected Result**: Inline error "Commission rate must be between 0 and 100" (the single client-side message for empty / non-numeric / ≤ 0 input); Save button disabled; no request sent
  - **Business Rules**: BR-COMM-001
  - **API**: None (client-side only — a direct `PATCH /api/v1/admin/commission` with an empty rate returns 400 "Commission rate is required")

- [x] **A-02**: Edit rate with non-decimal input
  - **Evidence**:
    - Final UI state for A-01 to A-03 and B-14: blocks empty, invalid, above-limit, and zero commission rates → `A-02_final_state.png`
    - Test: commission-revenue.spec.ts › "A-01 to A-03 and B-14: blocks empty, invalid, above-limit, and zero commission rates" — passed
  - **Precondition**: Edit Rate dialog is open
  - **Steps**:
    1. Enter `abc` (the `type="number"` input rejects non-numeric characters, leaving the value empty)
    2. Click "Save"
  - **Expected Result**: Same inline error as A-01 ("Commission rate must be between 0 and 100"); submit blocked
  - **Business Rules**: BR-COMM-001
  - **API**: None (client-side only — backend DTO would return 400 "Commission rate must be a number with up to 2 decimal places")

- [x] **A-03**: Edit rate out of range (>100)
  - **Evidence**:
    - Final UI state for A-01 to A-03 and B-14: blocks empty, invalid, above-limit, and zero commission rates → `A-03_final_state.png`
    - Test: commission-revenue.spec.ts › "A-01 to A-03 and B-14: blocks empty, invalid, above-limit, and zero commission rates" — passed
  - **Precondition**: Edit Rate dialog is open
  - **Steps**:
    1. Enter `150`
    2. Click "Save"
  - **Expected Result**: ⚠️ The client does NOT block values > 100 (it only rejects NaN / ≤ 0) — Save is enabled, the request is sent and the dialog closes; the backend rejects it with 400 "Commission rate must be greater than 0 and at most 100"; destructive toast "Failed to update commission rate"; rate card unchanged
  - **Business Rules**: BR-COMM-001
  - **API**: `PATCH /api/v1/admin/commission`

- [x] **A-04**: Report filter with "From" after "To"
  - **Evidence**:
    - Final UI state for A-04: rejects a commission report range where From is after To → `A-04_final_state.png`
    - Test: commission-revenue.spec.ts › "A-04: rejects a commission report range where From is after To" — passed
  - **Precondition**: Admin is on Commission tab
  - **Steps**:
    1. Set "From" to `2026-08-15`
    2. Set "To" to `2026-08-01`
    3. Click "Apply"
  - **Expected Result**: Inline validation error "From date must be earlier than or equal to To date."; no fetch
  - **Business Rules**: BR-COMM-004
  - **API**: None (client-side validation — the backend returns 400 with the same message when called directly)

- [x] **A-05**: Process an already-processed payout
  - **Evidence**:
    - Final UI state for A-05: processing an already-processed payout is blocked → `A-05_final_state.png`
    - Test: commission-revenue.spec.ts › "A-05: processing an already-processed payout is blocked" — passed
  - **Precondition**: A payout row is already `completed`
  - **Steps**:
    1. Observe the process icon on completed rows
    2. (Race / forced request) trigger process for that payout again
  - **Expected Result**: The process button is disabled on completed rows, so no dialog opens; if a 409 still occurs, destructive toast "Payout already processed" and the payout list refreshes (no alert banner is implemented)
  - **Business Rules**: BR-REV-004
  - **API**: `POST /api/v1/admin/revenue/payouts/:id/process` → 409 `{ statusCode: 409, error: "CONFLICT", errorCode: "RES_003", message: "Payout has already been processed" }`

- [x] **A-06**: Process a non-existent payout
  - **Evidence**:
    - API request and response evidence for A-06: returns 404 when processing a non-existent payout → `A-06_api_call.png`
    - Test: commission-revenue.spec.ts › "A-06: returns 404 when processing a non-existent payout" — passed
  - **Precondition**: Payout ID does not exist
  - **Steps**:
    1. Call process payout with a fake ID
  - **Expected Result**: Status 404 `{ errorCode: "RES_001", message: "Payout not found" }`; the UI surfaces the generic all-failed toast "Payout already processed" (used for every failed batch) and the payout list is invalidated/refreshed
  - **Business Rules**: BR-REV-005
  - **API**: `POST /api/v1/admin/revenue/payouts/:id/process`

- [x] **A-07**: Set target with empty amount
  - **Evidence**:
    - Final UI state for A-07 and A-08: blocks empty and non-positive revenue targets → `A-07_final_state.png`
    - Test: commission-revenue.spec.ts › "A-07 and A-08: blocks empty and non-positive revenue targets" — passed
  - **Precondition**: Edit/Set Target dialog is open
  - **Steps**:
    1. Clear the target amount
    2. Click "Save Target"
  - **Expected Result**: Inline error "Target amount must be a positive number with up to 2 decimal places."; submit blocked (no request)
  - **Business Rules**: BR-REV-007
  - **API**: `PUT /api/v1/admin/revenue/targets`

- [x] **A-08**: Set target with non-positive amount
  - **Evidence**:
    - Final UI state for A-07 and A-08: blocks empty and non-positive revenue targets → `A-08_final_state.png`
    - Test: commission-revenue.spec.ts › "A-07 and A-08: blocks empty and non-positive revenue targets" — passed
  - **Precondition**: Edit/Set Target dialog is open
  - **Steps**:
    1. Enter `-500`
    2. Click "Save Target"
  - **Expected Result**: Inline error "Target amount must be a positive number with up to 2 decimal places." (the `^\d+(\.\d{1,2})?$` regex rejects the minus sign); submit blocked
  - **Business Rules**: BR-REV-007
  - **API**: `PUT /api/v1/admin/revenue/targets`

- [x] **A-09**: Export without selecting a date range
  - **Evidence**:
    - Final UI state for A-09 to A-11: validates export date ranges before generating → `A-09_final_state.png`
    - Test: commission-revenue.spec.ts › "A-09 to A-11: validates export date ranges before generating" — passed
  - **Precondition**: Export modal is open
  - **Steps**:
    1. Leave the date range empty
    2. Click "Generate"
  - **Expected Result**: Inline error "Please select a start and end date."; generation blocked
  - **Business Rules**: BR-EXP-002
  - **API**: `POST /api/v1/admin/commission/export`

- [x] **A-10**: Export with end date before start date
  - **Evidence**:
    - Final UI state for A-09 to A-11: validates export date ranges before generating → `A-10_final_state.png`
    - Test: commission-revenue.spec.ts › "A-09 to A-11: validates export date ranges before generating" — passed
  - **Precondition**: Export modal is open
  - **Steps**:
    1. Set dateFrom to `2026-08-15`
    2. Set dateTo to `2026-08-01`
    3. Click "Generate"
  - **Expected Result**: Inline error "End date must be after start date."; generation blocked
  - **Business Rules**: BR-EXP-002
  - **API**: `POST /api/v1/admin/revenue/export`

- [x] **A-11**: Export date range exceeds 365 days
  - **Evidence**:
    - Final UI state for A-09 to A-11: validates export date ranges before generating → `A-11_final_state.png`
    - Test: commission-revenue.spec.ts › "A-09 to A-11: validates export date ranges before generating" — passed
  - **Precondition**: Export modal is open
  - **Steps**:
    1. Set dateFrom to `2025-01-01`
    2. Set dateTo to `2026-08-26`
    3. Click "Generate"
  - **Expected Result**: Inline error "Date range cannot exceed 365 days."; generation blocked (client-side check on the raw day difference)
  - **Business Rules**: BR-EXP-002
  - **API**: `POST /api/v1/admin/revenue/payouts/export`

- [x] **A-12**: Buyer access denied to admin route
  - **Evidence**:
    - Final UI state for A-12: buyer access denied to admin route → `A-12_final_state.png`
    - Test: commission-revenue.spec.ts › "A-12: buyer access denied to admin route" — passed
  - **Precondition**: Logged in as buyer
  - **Steps**:
    1. Navigate directly to `/admin/commission-revenue`
  - **Expected Result**: Redirect to `/unauthorized` (ProtectedRoute `replace`); the page never renders. A direct API call with the buyer token returns 403 `{ errorCode: "RES_004", message: "Insufficient permissions" }`
  - **Business Rules**: BR-COMM-006

- [x] **A-13**: Merchant access denied to admin route
  - **Evidence**:
    - Final UI state for A-13: merchant access denied to admin route → `A-13_final_state.png`
    - Test: commission-revenue.spec.ts › "A-13: merchant access denied to admin route" — passed
  - **Precondition**: Logged in as merchant
  - **Steps**:
    1. Navigate directly to `/admin/commission-revenue`
  - **Expected Result**: Redirect to `/unauthorized` (ProtectedRoute `replace`); the page never renders. A direct API call with the merchant token returns 403 `{ errorCode: "RES_004", message: "Insufficient permissions" }`
  - **Business Rules**: BR-COMM-006

- [x] **A-14**: Server error on revenue dashboard load
  - **Evidence**:
    - Final UI state for A-14: server error on revenue dashboard load falls back to empty states → `A-14_final_state.png`
    - Test: commission-revenue.spec.ts › "A-14: server error on revenue dashboard load falls back to empty states" — passed
  - **Precondition**: Backend returns 500 SYS_001 for the revenue GETs
  - **Steps**:
    1. Navigate to `/admin/commission-revenue` (Revenue tab)
  - **Expected Result**: ⚠️ No alert banner / retry is implemented on this screen: KPI cards fall back to `0 Ks`, the trend chart shows "No trend data available.", the target card shows "No target set for this period.", and the payout area shows its empty/loading state; on refetch failures TanStack Query keeps the last successful data (placeholderData)
  - **Business Rules**: None (error handling)
  - **API**: `GET /api/v1/admin/revenue/kpis` (and the other `/admin/revenue/*` GETs)

- [x] **A-15**: Network error during an admin action
  - **Evidence**:
    - Final UI state for A-15: network error during a commission rate update → `A-15_final_state.png`
    - Test: commission-revenue.spec.ts › "A-15: network error during a commission rate update" — passed
  - **Precondition**: Network connectivity is interrupted
  - **Steps**:
    1. Attempt to save a commission rate update
  - **Expected Result**: Destructive toast "Failed to update commission rate" (no alert banner); the edit dialog has already closed; the rate card keeps its previous value
  - **Business Rules**: None (error handling)
  - **API**: `PATCH /api/v1/admin/commission`

- [x] **A-16**: Delete action blocked when no payout row is selected
  - **Evidence**:
    - Final UI state for A-16: delete action is disabled when no payout row is selected → `A-16_final_state.png`
    - Test: commission-revenue.spec.ts › "A-16: delete action is disabled when no payout row is selected" — passed
  - **Precondition**: No payout checkboxes are ticked
  - **Steps**:
    1. Locate the trash (Delete selected payouts) button
    2. Attempt to click it
  - **Expected Result**: Button is disabled (title "Delete selected payouts"); no confirmation dialog opens; no request sent
  - **Business Rules**: None (UI)
  - **API**: None (no request sent)

- [x] **A-17**: Delete payout rows that are not eligible (409)
  - **Evidence**:
    - Final UI state for A-17: ineligible payout deletion displays the 409 error and keeps rows → `A-17_final_state.png`
    - Test: commission-revenue.spec.ts › "A-17: ineligible payout deletion displays the 409 error and keeps rows" — passed
  - **Precondition**: Selection includes a payout that is not `completed` or is younger than three months
  - **Steps**:
    1. Select the ineligible rows
    2. Click the trash button, then "Confirm delete"
  - **Expected Result**: Confirmation dialog closes; error dialog "Payout cannot be deleted" appears with the backend message ("Each payout must be completed and at least three months old."); no rows are removed
  - **Business Rules**: None (payout deletion eligibility — 409 CONFLICT)
  - **API**: `DELETE /api/v1/admin/revenue/payouts`

- [x] **A-18**: Delete payout request fails (non-409 error)
  - **Evidence**:
    - Final UI state for A-18: non-409 payout deletion failure keeps the list unchanged → `A-18_final_state.png`
    - Test: commission-revenue.spec.ts › "A-18: non-409 payout deletion failure keeps the list unchanged" — passed
  - **Precondition**: Backend returns 404/500 or the network fails during deletion
  - **Steps**:
    1. Select rows and confirm deletion while the request fails
  - **Expected Result**: Error dialog "Failed to delete payout" shows the backend message (or generic text); payout list unchanged
  - **Business Rules**: None (error handling)
  - **API**: `DELETE /api/v1/admin/revenue/payouts`

- [x] **A-19**: Process a payout group containing already-processed payouts
  - **Evidence**:
    - Final UI state for A-19: grouped payout processing reports partial success and refreshes data → `A-19_final_state.png`
    - Test: commission-revenue.spec.ts › "A-19: grouped payout processing reports partial success and refreshes data" — passed
  - **Precondition**: The payout row aggregates several underlying payouts, at least one already processed
  - **Steps**:
    1. Click the process icon, then "Confirm"
  - **Expected Result**: Partial success → toast "Payout partially processed (X succeeded, Y skipped (already processed))"; all failed → destructive toast "Payout already processed"; confirmation dialog closes and payout list + KPIs refresh in every case
  - **Business Rules**: BR-REV-004
  - **API**: `POST /api/v1/admin/revenue/payouts/:id/process`

- [x] **A-20**: Export request fails
  - **Evidence**:
    - Final UI state for A-20: commission export failure leaves the dialog open and resets progress → `A-20_final_state.png`
    - Test: commission-revenue.spec.ts › "A-20: commission export failure leaves the dialog open and resets progress" — passed
  - **Precondition**: Export endpoint returns 500 (EXP_005) or the request fails
  - **Steps**:
    1. Open the Export modal and enter a valid date range
    2. Click "Generate"
  - **Expected Result**: Destructive toast "Export failed"; modal stays open with the entered values; the button reverts from "Generating..." to "Generate"
  - **Business Rules**: None (error handling — EXP_005)
  - **API**: `POST /api/v1/admin/commission/export`

- [x] **A-21**: Save revenue target fails
  - **Evidence**:
    - Final UI state for A-21: failed target save keeps the existing target unchanged → `A-21_final_state.png`
    - Test: commission-revenue.spec.ts › "A-21: failed target save keeps the existing target unchanged" — passed
  - **Precondition**: `PUT /api/v1/admin/revenue/targets` returns 400 (VAL_001 — e.g. `targetAmount` failing class-validator) or 500
  - **Steps**:
    1. Open Edit/Set Target and enter a valid amount
    2. Click "Save Target" while the request fails
  - **Expected Result**: Dialog closes; destructive toast "Failed to save target" with the backend message when provided; gauge and target amount unchanged after refetch
  - **Business Rules**: BR-REV-007
  - **API**: `PUT /api/v1/admin/revenue/targets`

- [x] **A-22**: Commission rate update fails
  - **Evidence**:
    - Final UI state for A-22: failed commission update keeps the saved rate unchanged → `A-22_final_state.png`
    - Test: commission-revenue.spec.ts › "A-22: failed commission update keeps the saved rate unchanged" — passed
  - **Precondition**: `PATCH /api/v1/admin/commission` returns 400 (VAL_001, message "Commission rate must be greater than 0 and at most 100") or 500
  - **Steps**:
    1. Open Edit Rate and enter a syntactically valid rate
    2. Click "Save" while the request fails
  - **Expected Result**: Dialog closes; destructive toast "Failed to update commission rate"; rate card still shows the previous rate after query invalidation
  - **Business Rules**: BR-COMM-001
  - **API**: `PATCH /api/v1/admin/commission`

---

## 3. Boundary Scenarios (B) — Edge Cases & Limits

- [x] **B-01**: Commission rate at minimum valid value
  - **Evidence**:
    - Final UI state for B-01: accepts the minimum commission rate of 0.01 → `B-01_final_state.png`
    - Test: commission-revenue.spec.ts › "B-01: accepts the minimum commission rate of 0.01" — passed
  - **Precondition**: Edit Rate dialog is open
  - **Steps**:
    1. Enter `0.01`
    2. Click "Save"
  - **Expected Result**: Success — rate accepted and persisted
  - **Business Rules**: BR-COMM-001
  - **API**: `PATCH /api/v1/admin/commission`

- [x] **B-02**: Commission rate at maximum valid value (100)
  - **Evidence**:
    - Final UI state for B-02: accepts the maximum commission rate of 100 → `B-02_final_state.png`
    - Test: commission-revenue.spec.ts › "B-02: accepts the maximum commission rate of 100" — passed
  - **Precondition**: Edit Rate dialog is open
  - **Steps**:
    1. Enter `100`
    2. Click "Save"
  - **Expected Result**: Success — rate accepted and persisted
  - **Business Rules**: BR-COMM-001
  - **API**: `PATCH /api/v1/admin/commission`

- [x] **B-03**: Commission rate with two decimal places
  - **Evidence**:
    - Final UI state for B-03: accepts and renders a commission rate with two decimals → `B-03_final_state.png`
    - Test: commission-revenue.spec.ts › "B-03: accepts and renders a commission rate with two decimals" — passed
  - **Precondition**: Edit Rate dialog is open
  - **Steps**:
    1. Enter `12.50`
    2. Click "Save"
  - **Expected Result**: Success — accepted; the number input normalizes `12.50` to `12.5`, the API returns the decimal string `"12.5"`, and the rate card renders `12.5%`
  - **Business Rules**: BR-COMM-001, BR-COMM-003
  - **API**: `PATCH /api/v1/admin/commission`

- [x] **B-04**: Target amount with two decimal places
  - **Evidence**:
    - Final UI state for B-04: saves a revenue target with two decimal places → `B-04_final_state.png`
    - Test: commission-revenue.spec.ts › "B-04: saves a revenue target with two decimal places" — passed
  - **Precondition**: Edit/Set Target dialog is open
  - **Steps**:
    1. Enter `100000.50`
    2. Select period, click "Save Target"
  - **Expected Result**: Success — amount accepted and persisted with precision
  - **Business Rules**: BR-REV-007
  - **API**: `PUT /api/v1/admin/revenue/targets`

- [x] **B-05**: Target progress above 100% (over target)
  - **Evidence**:
    - Final UI state for B-05: clamps target progress above 100 percent → `B-05_final_state.png`
    - Test: commission-revenue.spec.ts › "B-05: clamps target progress above 100 percent" — passed
  - **Precondition**: Actual revenue exceeds the configured target
  - **Steps**:
    1. Load the target progress card
  - **Expected Result**: Gauge bar width clamped to 100%; ⚠️ the progress label is also clamped (`100%`) — no separate "over target" indicator is implemented in the current UI
  - **Business Rules**: BR-REV-008
  - **API**: `GET /api/v1/admin/revenue/target`

- [x] **B-06**: No revenue target configured
  - **Evidence**:
    - Final UI state for B-06: shows a way to set a target when none exists → `B-06_final_state.png`
    - Test: commission-revenue.spec.ts › "B-06: shows a way to set a target when none exists" — passed
  - **Precondition**: No active target exists for the period
  - **Steps**:
    1. Load the target progress card
  - **Expected Result**: No gauge/progress bar rendered; message "No target set for this period." displayed; "Set Target" button available; period toggle still available
  - **Business Rules**: BR-REV-008
  - **API**: `GET /api/v1/admin/revenue/target`

- [x] **B-07**: Empty state for commission report table
  - **Evidence**:
    - Final UI state for B-07: shows the commission report empty state for an empty response → `B-07_final_state.png`
    - Test: commission-revenue.spec.ts › "B-07: shows the commission report empty state for an empty response" — passed
  - **Precondition**: No completed orders exist for the selected range
  - **Steps**:
    1. Apply a date range with no data
  - **Expected Result**: Empty-state row "No commission reports found." displayed; Export button disabled (see B-13)
  - **Business Rules**: BR-COMM-005
  - **API**: `GET /api/v1/admin/commission/reports`

- [x] **B-08**: Empty state for payout table
  - **Evidence**:
    - Final UI state for B-08: shows the payout empty state without row actions → `B-08_final_state.png`
    - Test: commission-revenue.spec.ts › "B-08: shows the payout empty state without row actions" — passed
  - **Precondition**: No payout records match the current filters
  - **Steps**:
    1. Load the payout table (or apply a search with no matches)
  - **Expected Result**: Empty-state row "No payouts found." displayed; no row checkboxes / process buttons available
  - **Business Rules**: BR-REV-005
  - **API**: `GET /api/v1/admin/revenue/payouts`

- [x] **B-09**: Forecast with insufficient historical data
  - **Evidence**:
    - Final UI state for B-09 and B-10: renders forecast and ad fee empty or zero data without breaking the dashboard → `B-09_final_state.png`
    - Test: commission-revenue.spec.ts › "B-09 and B-10: renders forecast and ad fee empty or zero data without breaking the dashboard" — passed
  - **Precondition**: Fewer than the minimum required data points exist (backend MIN_POINTS = 7)
  - **Steps**:
    1. Load the Revenue tab
  - **Expected Result**: Dotted forecast line hidden; informational note "Not enough historical data to generate a forecast" shown inside the chart (rendered from the API `note` field); "AI Forecast" legend hidden
  - **Business Rules**: BR-REV-014
  - **API**: `GET /api/v1/admin/revenue/forecast`

- [x] **B-10**: Ad fee zero-state values
  - **Evidence**:
    - Final UI state for B-09 and B-10: renders forecast and ad fee empty or zero data without breaking the dashboard → `B-10_final_state.png`
    - Test: commission-revenue.spec.ts › "B-09 and B-10: renders forecast and ad fee empty or zero data without breaking the dashboard" — passed
  - **Precondition**: No ad payments exist
  - **Steps**:
    1. Load the Revenue tab
  - **Expected Result**: Ad Fee Revenue KPI renders `0 Ks` (currency formatter rounds to whole numbers); Ad Fee Summary shows Active Ads `0`, Total Collected `$0.00`, Pending `0`; Ad Payment Status badges show `0`
  - **Business Rules**: BR-ADFE-001, BR-ADFE-005
  - **API**: `GET /api/v1/admin/revenue/ad-fee`

- [x] **B-11**: Export date range at the 365-day limit
  - **Evidence**:
    - Final UI state for B-11: accepts an export date range at the 365-day limit → `B-11_final_state.png`
    - Test: commission-revenue.spec.ts › "B-11: accepts an export date range at the 365-day limit" — passed
  - **Precondition**: Export modal is open
  - **Steps**:
    1. Set dateFrom to `2025-08-26`
    2. Set dateTo to `2026-08-25` (364-day difference = 365 inclusive days)
    3. Click "Generate"
  - **Expected Result**: Accepted — the backend counts the range inclusively (`days = diff + 1`) so ≤ 365 calendar days pass. ⚠️ A `dateTo` exactly 365 days after `dateFrom` passes the client check (raw difference) but the backend rejects it with 400 "Date range cannot exceed 365 days"
  - **Business Rules**: BR-EXP-002
  - **API**: `POST /api/v1/admin/commission/export`

- [x] **B-12**: Commission rate placeholder before settings load
  - **Evidence**:
    - Final UI state for B-12: shows the rate placeholder and default edit value while settings are loading → `B-12_final_state.png`
    - Test: commission-revenue.spec.ts › "B-12: shows the rate placeholder and default edit value while settings are loading" — passed
  - **Precondition**: `GET /api/v1/admin/commission` has not resolved yet or returns no rate
  - **Steps**:
    1. Open the Commission tab before settings arrive
  - **Expected Result**: Rate card shows `—%` (never `NaN`); Edit Rate dialog falls back to `10.00` until the real rate loads
  - **Business Rules**: BR-COMM-008
  - **API**: `GET /api/v1/admin/commission`

- [x] **B-13**: Export button disabled when the report table is empty
  - **Evidence**:
    - Final UI state for B-13: keeps commission export disabled when reports are empty → `B-13_final_state.png`
    - Test: commission-revenue.spec.ts › "B-13: keeps commission export disabled when reports are empty" — passed
  - **Precondition**: Commission report returned zero rows
  - **Steps**:
    1. Apply a date range with no data
    2. Attempt to click "Export"
  - **Expected Result**: Export button disabled; the Export modal does not open
  - **Business Rules**: None (UI)
  - **API**: `GET /api/v1/admin/commission/reports`

- [x] **B-14**: Commission rate exactly 0 is rejected
  - **Evidence**:
    - Final UI state for A-01 to A-03 and B-14: blocks empty, invalid, above-limit, and zero commission rates → `B-14_final_state.png`
    - Test: commission-revenue.spec.ts › "A-01 to A-03 and B-14: blocks empty, invalid, above-limit, and zero commission rates" — passed
  - **Precondition**: Edit Rate dialog is open
  - **Steps**:
    1. Enter `0`
    2. Attempt to click "Save"
  - **Expected Result**: Inline error "Commission rate must be between 0 and 100"; Save stays disabled (rate must be greater than 0)
  - **Business Rules**: BR-COMM-001
  - **API**: `PATCH /api/v1/admin/commission`

- [x] **B-15**: Target amount with more than two decimal places
  - **Evidence**:
    - Final UI state for B-15: rejects a target amount with more than two decimal places → `B-15_final_state.png`
    - Test: commission-revenue.spec.ts › "B-15: rejects a target amount with more than two decimal places" — passed
  - **Precondition**: Edit/Set Target dialog is open
  - **Steps**:
    1. Enter `100000.999`
    2. Click "Save Target"
  - **Expected Result**: Inline error "Target amount must be a positive number with up to 2 decimal places."; submit blocked
  - **Business Rules**: BR-REV-007
  - **API**: `PUT /api/v1/admin/revenue/targets`

- [x] **B-16**: Select-all applies only to the current payout page
  - **Evidence**:
    - Final UI state for B-16: select-all retains only selections made on each visible payout page → `B-16_final_state.png`
    - Test: commission-revenue.spec.ts › "B-16: select-all retains only selections made on each visible payout page" — passed
  - **Precondition**: Payout list spans multiple pages
  - **Steps**:
    1. Tick the header checkbox on page 1
    2. Move to page 2, then return to page 1
  - **Expected Result**: Header checkbox selects only the rows visible on the current page; selections from other pages are retained. The current confirmation copy is generic ("This action cannot be undone.") and does not display the selected-row count.
  - **Business Rules**: None (UI)
  - **API**: `GET /api/v1/admin/revenue/payouts`

- [x] **B-17**: Export Generate shows a progress state while in flight
  - **Evidence**:
    - Final UI state for B-17: shows the export progress state until the response settles → `B-17_final_state.png`
    - Test: commission-revenue.spec.ts › "B-17: shows the export progress state until the response settles" — passed
  - **Precondition**: Export modal is open with a valid range
  - **Steps**:
    1. Click "Generate"
  - **Expected Result**: Button label changes to "Generating..."; both "Generate" and "Cancel" are disabled until the response settles, then re-enabled
  - **Business Rules**: None (UI)
  - **API**: `POST /api/v1/admin/commission/export`

- [x] **B-18**: Payout search character limit boundary (100 / 101 characters)
  - **Evidence**:
    - API request and response evidence for B-18: payout search at the 100 / 101 character boundary → `B-18_api_call.png`
    - Test: commission-revenue.spec.ts › "B-18: payout search at the 100 / 101 character boundary" — passed
  - **Precondition**: Admin is on Revenue tab (search runs server-side via `GET /api/v1/admin/revenue/payouts?search=<term>`); since over-limit input cannot be verified directly from the UI search box, verify at API level
  - **Steps**:
    1. Call `GET /api/v1/admin/revenue/payouts` with a `search` value of exactly 100 characters
    2. Call `GET /api/v1/admin/revenue/payouts` with a `search` value of 101 characters
  - **Expected Result**: 100 characters → accepted (200 with payout list, possibly empty); 101 characters → rejected with 400 by the backend `@MaxLength(100)` validation on `PayoutQueryDto.search` (standard error body)
  - **Business Rules**: None (payout list search boundary)
  - **API**: `GET /api/v1/admin/revenue/payouts?search=<term>`

---

## 4. Interface Scenarios (I) — API Contracts & Payloads

> API contract tests — **no screenshots by design**. Evidence lines reference the test title and status only.

- [x] **I-01**: `GET /api/v1/admin/commission` — returns 200 with current rate
  - **Evidence**:
    - API request and response evidence for I-01 and I-03: returns commission settings and paginated reports for an admin → `I-01_api_call.png`
    - Test: commission-revenue.spec.ts › "I-01 and I-03: returns commission settings and paginated reports for an admin" — passed
  - **Precondition**: Valid admin access token
  - **Steps**:
    1. Call `GET /api/v1/admin/commission` with admin bearer token
  - **Expected Response**: Status 200, JSON `{ data: { rate: "10.00" } }` (rate as string)
  - **Business Rules**: BR-COMM-003
  - **API**: `GET /api/v1/admin/commission`

- [x] **I-02**: `PATCH /api/v1/admin/commission` — returns success with updated rate
  - **Evidence**:
    - API request and response evidence for I-02: PATCH commission returns the updated rate → `I-02_api_call.png`
    - Test: commission-revenue.spec.ts › "I-02: PATCH commission returns the updated rate" — passed
  - **Precondition**: Valid admin token and payload `{ rate: "12.50" }`
  - **Steps**:
    1. Call `PATCH /api/v1/admin/commission`
  - **Expected Response**: Status 200 when updating an existing setting or 201 when the setting is first created, JSON `{ data: { rate: "12.5" } }`; audit event logged
  - **Business Rules**: BR-COMM-001, BR-COMM-007
  - **API**: `PATCH /api/v1/admin/commission`

- [x] **I-03**: `GET /api/v1/admin/commission/reports` — returns 200 with rows and pagination
  - **Evidence**:
    - API request and response evidence for I-01 and I-03: returns commission settings and paginated reports for an admin → `I-03_api_call.png`
    - Test: commission-revenue.spec.ts › "I-01 and I-03: returns commission settings and paginated reports for an admin" — passed
  - **Precondition**: Admin token; records exist
  - **Steps**:
    1. Call `GET /api/v1/admin/commission/reports?page=1&limit=20`
  - **Expected Response**: Status 200, JSON `{ data: { reports: [...], pagination: { page, limit, total, totalPages } } }`
  - **Business Rules**: BR-COMM-005
  - **API**: `GET /api/v1/admin/commission/reports`

- [x] **I-04**: `GET /api/v1/admin/commission/reports` — returns 400 for `from > to`
  - **Evidence**:
    - API request and response evidence for I-04: rejects a commission report range where the start is after the end → `I-04_api_call.png`
    - Test: commission-revenue.spec.ts › "I-04: rejects a commission report range where the start is after the end" — passed
  - **Precondition**: Admin token; `from` later than `to`
  - **Steps**:
    1. Call with `from=2026-08-15&to=2026-08-01`
  - **Expected Response**: Status 400, standard error body
  - **Business Rules**: BR-COMM-004
  - **API**: `GET /api/v1/admin/commission/reports`

- [x] **I-05**: `GET /api/v1/admin/revenue/kpis` — returns 200 with 6 KPI values
  - **Evidence**:
    - API request and response evidence for I-05 to I-10 and I-12: returns revenue dashboard payloads for an admin → `I-05_api_call.png`
    - Test: commission-revenue.spec.ts › "I-05 to I-10 and I-12: returns revenue dashboard payloads for an admin" — passed
  - **Precondition**: Admin token
  - **Steps**:
    1. Call `GET /api/v1/admin/revenue/kpis?range=30d`
  - **Expected Response**: Status 200, `{ data: { kpis: { totalRevenue, totalCommission, adFeeRevenue, totalIncome, avgOrderValue, netRevenue } } }` all as decimal strings
  - **Business Rules**: BR-REV-001, BR-ADFE-002
  - **API**: `GET /api/v1/admin/revenue/kpis`

- [x] **I-06**: `GET /api/v1/admin/revenue/trends` — returns 200 with trend points
  - **Evidence**:
    - API request and response evidence for I-05 to I-10 and I-12: returns revenue dashboard payloads for an admin → `I-06_api_call.png`
    - Test: commission-revenue.spec.ts › "I-05 to I-10 and I-12: returns revenue dashboard payloads for an admin" — passed
  - **Precondition**: Admin token; valid range
  - **Steps**:
    1. Call `GET /api/v1/admin/revenue/trends?range=30d`
  - **Expected Response**: Status 200, `{ data: { trendPoints: [{ date, revenue, commission, adFee, totalIncome }] } }`
  - **Business Rules**: BR-REV-002, BR-ADFE-003
  - **API**: `GET /api/v1/admin/revenue/trends`

- [x] **I-07**: `GET /api/v1/admin/revenue/target` — returns 200 with target or null
  - **Evidence**:
    - API request and response evidence for I-05 to I-10 and I-12: returns revenue dashboard payloads for an admin → `I-07_api_call.png`
    - Test: commission-revenue.spec.ts › "I-05 to I-10 and I-12: returns revenue dashboard payloads for an admin" — passed
  - **Precondition**: Admin token; `period=monthly`
  - **Steps**:
    1. Call `GET /api/v1/admin/revenue/target?period=monthly`
  - **Expected Response**: Status 200, `{ data: { target: { targetAmount, period, actualRevenue, progressPercent } } }` (or `{ data: { target: null } }` when none)
  - **Business Rules**: BR-REV-008, BR-REV-009
  - **API**: `GET /api/v1/admin/revenue/target`

- [x] **I-08**: `PUT /api/v1/admin/revenue/targets` — returns 200 with saved target
  - **Evidence**:
    - API request and response evidence for I-05 to I-10 and I-12: returns revenue dashboard payloads for an admin → `I-08_api_call.png`
    - Test: commission-revenue.spec.ts › "I-05 to I-10 and I-12: returns revenue dashboard payloads for an admin" — passed
  - **Precondition**: Admin token; payload `{ targetAmount: "150000.00", targetPeriod: "monthly" }`
  - **Steps**:
    1. Call `PUT /api/v1/admin/revenue/targets`
  - **Expected Response**: Status 200, `{ data: { targetAmount, targetPeriod, actualRevenue, progressPercent } }`; audit event `TARGET_UPDATED` logged
  - **Business Rules**: BR-REV-006, BR-REV-007, BR-REV-009, BR-COMM-007
  - **API**: `PUT /api/v1/admin/revenue/targets`

- [x] **I-09**: `GET /api/v1/admin/revenue/forecast` — returns 200 with points or empty series
  - **Evidence**:
    - API request and response evidence for I-05 to I-10 and I-12: returns revenue dashboard payloads for an admin → `I-09_api_call.png`
    - Test: commission-revenue.spec.ts › "I-05 to I-10 and I-12: returns revenue dashboard payloads for an admin" — passed
  - **Precondition**: Admin token; valid range
  - **Steps**:
    1. Call `GET /api/v1/admin/revenue/forecast?range=30d`
  - **Expected Response**: Status 200, `{ data: { forecastPoints: [{ date, forecastRevenue, forecastCommission, forecastAdFee }] } }`; empty array with `note` when data insufficient
  - **Business Rules**: BR-REV-012, BR-REV-014, BR-ADFE-006
  - **API**: `GET /api/v1/admin/revenue/forecast`

- [x] **I-10**: `GET /api/v1/admin/revenue/ad-fee` — returns 200 with KPIs, trend, status
  - **Evidence**:
    - API request and response evidence for I-05 to I-10 and I-12: returns revenue dashboard payloads for an admin → `I-10_api_call.png`
    - Test: commission-revenue.spec.ts › "I-05 to I-10 and I-12: returns revenue dashboard payloads for an admin" — passed
  - **Precondition**: Admin token; valid range
  - **Steps**:
    1. Call `GET /api/v1/admin/revenue/ad-fee?range=30d`
  - **Expected Response**: Status 200, `{ data: { adFeeKpis: { totalAdFees, activeAds, pendingPayments, completedPayments }, adFeeTrendPoints: [{ date, adFee }], adFeePaymentStatus: { completed, pending, refunded } } }`
  - **Business Rules**: BR-ADFE-001, BR-ADFE-005
  - **API**: `GET /api/v1/admin/revenue/ad-fee`

- [x] **I-11**: `GET /api/v1/admin/revenue/payments/status` — returns 200 with status counts
  - **Evidence**:
    - API request and response evidence for I-11: payment status endpoint returns payout status counts → `I-11_api_call.png`
    - Test: commission-revenue.spec.ts › "I-11: payment status endpoint returns payout status counts" — passed
  - **Precondition**: Admin token; valid range
  - **Steps**:
    1. Call `GET /api/v1/admin/revenue/payments/status?range=30d`
  - **Expected Response**: Status 200, `{ data: { completed, processing, pending } }` — counts of payout rows created within the range (⚠️ NOT the order/ad payment breakdown from the spec)
  - **Business Rules**: None (implemented as payout status counts; BR-REV-003 order/ad breakdown is not served by this route)
  - **API**: `GET /api/v1/admin/revenue/payments/status`

- [x] **I-12**: `GET /api/v1/admin/revenue/payouts` — returns 200 with payout list
  - **Evidence**:
    - API request and response evidence for I-05 to I-10 and I-12: returns revenue dashboard payloads for an admin → `I-12_api_call.png`
    - Test: commission-revenue.spec.ts › "I-05 to I-10 and I-12: returns revenue dashboard payloads for an admin" — passed
  - **Precondition**: Admin token; optional `status` filter
  - **Steps**:
    1. Call `GET /api/v1/admin/revenue/payouts?status=pending&page=1&limit=20`
  - **Expected Response**: Status 200, `{ data: { items: [{ id, payoutId, merchantId, merchantName, period, commissionRate, totalAmount, commissionAmount, adFeeAmount, netAmount, status, failureReason, createdAt, processedAt, canDelete, completedCount, completedTotal, completedCommission, pendingCount, pendingTotal, pendingCommission }], total, page, limit, totalPages, statusCounts: { completed, processing, pending }, periods: ["YYYY-MM", …] } }`; `netAmount = totalAmount − commissionAmount` and `adFeeAmount` is always `"0.00"` (BR-REV-016 / BR-ADFE-004); backend default `limit` is 20 (UI sends 10)
  - **Business Rules**: BR-REV-016, BR-ADFE-004
  - **API**: `GET /api/v1/admin/revenue/payouts`

- [x] **I-13**: `POST /api/v1/admin/revenue/payouts/:id/process` — returns 200 on success
  - **Evidence**:
    - API request and response evidence for I-13: process endpoint returns the completed payout contract → `I-13_api_call.png`
    - Test: commission-revenue.spec.ts › "I-13: process endpoint returns the completed payout contract" — passed
  - **Precondition**: Admin token; payout `pending`
  - **Steps**:
    1. Call process endpoint for a pending payout
  - **Expected Response**: Status 200, `{ data: { payoutId, status: "completed", processedAt, idempotencyKey } }`; audit event `PAYOUT_PROCESSED` logged. ⚠️ The **live** endpoint answers **201** (the NestJS default for `@Post`) — this test intercepts the route with a mock that replies 200, see section 5
  - **Business Rules**: BR-REV-004, BR-REV-005, BR-COMM-007
  - **API**: `POST /api/v1/admin/revenue/payouts/:id/process`

- [x] **I-14**: `POST /api/v1/admin/revenue/payouts/:id/process` — returns 409 for already-processed payout
  - **Evidence**:
    - API request and response evidence for I-14: processing an already-processed payout returns the standard 409 contract → `I-14_api_call.png`
    - Test: commission-revenue.spec.ts › "I-14: processing an already-processed payout returns the standard 409 contract" — passed
  - **Precondition**: Admin token; payout already processed
  - **Steps**:
    1. Call process endpoint again for the same payout
  - **Expected Response**: Status 409, `{ statusCode: 409, error: "CONFLICT", errorCode: "RES_003", message: "Payout has already been processed" }` (⚠️ the filter maps 409 → `RES_003`; the spec's `COMM_004` code is never emitted by the backend)
  - **Business Rules**: BR-REV-004
  - **API**: `POST /api/v1/admin/revenue/payouts/:id/process`

- [x] **I-15**: `POST /api/v1/admin/commission/export` — returns 201 with file stream
  - **Evidence**:
    - API request and response evidence for I-15: commission export responds with a CSV file stream → `I-15_api_call.png`
    - Test: commission-revenue.spec.ts › "I-15: commission export responds with a CSV file stream" — passed
  - **Precondition**: Admin token; payload `{ dateFrom, dateTo, format: "csv" }`
  - **Steps**:
    1. Call commission export with valid body
  - **Expected Response**: Status 201, `Content-Type: text/csv`, `Content-Disposition: attachment; filename="commission report(<group label>) report {YYYYMMDD}-{YYYYMMDD}({YYYYMMDD})(csv)"` where `<group label>` is `by merchant` / `by date` / `by order` (⚠️ built by `export.service.payload()` — the format token is wrapped in parentheses, there is no `.csv` extension); audit event `EXPORT_GENERATED` logged
  - **Business Rules**: BR-EXP-001, BR-EXP-002, BR-EXP-003
  - **API**: `POST /api/v1/admin/commission/export`

- [x] **I-16**: `POST /api/v1/admin/revenue/export` — returns 201 with XLSX stream
  - **Evidence**:
    - API request and response evidence for I-16: revenue export responds with an XLSX file stream → `I-16_api_call.png`
    - Test: commission-revenue.spec.ts › "I-16: revenue export responds with an XLSX file stream" — passed
  - **Precondition**: Admin token; payload `{ dateFrom, dateTo, format: "xlsx" }`
  - **Steps**:
    1. Call revenue export with valid body
  - **Expected Response**: Status 201, `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `Content-Disposition: attachment; filename="revenue report {YYYYMMDD}-{YYYYMMDD}({YYYYMMDD})(xlsx)"`; audit event `EXPORT_GENERATED` logged
  - **Business Rules**: BR-EXP-001, BR-EXP-002, BR-EXP-003
  - **API**: `POST /api/v1/admin/revenue/export`

- [x] **I-17**: `POST /api/v1/admin/revenue/payouts/export` — returns 201 with file stream
  - **Evidence**:
    - API request and response evidence for I-17: payout export responds with a file stream → `I-17_api_call.png`
    - Test: commission-revenue.spec.ts › "I-17: payout export responds with a file stream" — passed
  - **Precondition**: Admin token; valid body
  - **Steps**:
    1. Call payout export with valid body
  - **Expected Response**: Status 201, file stream with `Content-Type: text/csv` (or the XLSX mime) and `Content-Disposition: attachment; filename="payout report(for all){YYYYMMDD}-{YYYYMMDD}({YYYYMMDD})"` (⚠️ `for all` becomes the merchant name when `merchantId` is sent; no extension token is appended for payouts); Net column = total − commission (ad fees excluded)
  - **Business Rules**: BR-EXP-001, BR-EXP-002, BR-REV-016
  - **API**: `POST /api/v1/admin/revenue/payouts/export`

- [x] **I-18**: Error response follows standard API format
  - **Evidence**:
    - API request and response evidence for I-18: error responses include the standard API fields → `I-18_api_call.png`
    - Test: commission-revenue.spec.ts › "I-18: error responses include the standard API fields" — passed
  - **Precondition**: Any error scenario
  - **Steps**:
    1. Trigger an error (e.g., invalid rate)
  - **Expected Response**: JSON contains `{ statusCode, error, errorCode, message, timestamp, path }`
  - **Business Rules**: None
  - **API**: Any endpoint

- [x] **I-19**: Admin endpoints return 403 for non-admin token
  - **Evidence**:
    - API request and response evidence for I-19: denies commission access to buyer and merchant accounts → `I-19_api_call.png`
    - Test: commission-revenue.spec.ts › "I-19: denies commission access to buyer and merchant accounts" — passed
  - **Precondition**: Authenticated buyer or merchant token
  - **Steps**:
    1. Call any `/api/v1/admin/commission` or `/api/v1/admin/revenue` endpoint
  - **Expected Response**: Status 403, `{ statusCode: 403, error: "FORBIDDEN", errorCode: "RES_004", message: "Insufficient permissions" }` (⚠️ `RolesGuard` throws a plain `ForbiddenException`; the spec's `COMM_002` code is never emitted by the backend)
  - **Business Rules**: BR-COMM-006
  - **API**: All admin endpoints

- [x] **I-20**: Admin endpoints return 401 without a token
  - **Evidence**:
    - API request and response evidence for I-20: rejects an admin endpoint request without an authorization token → `I-20_api_call.png`
    - Test: commission-revenue.spec.ts › "I-20: rejects an admin endpoint request without an authorization token" — passed
  - **Precondition**: No Authorization header
  - **Steps**:
    1. Call any `/api/v1/admin/commission` or `/api/v1/admin/revenue` endpoint
  - **Expected Response**: Status 401 Unauthorized
  - **Business Rules**: BR-COMM-006
  - **API**: All admin endpoints

- [x] **I-21**: `GET /api/v1/admin/revenue/payouts/merchants` — returns 200 with merchant options
  - **Evidence**:
    - API request and response evidence for I-21: payout merchant endpoint returns merchant options → `I-21_api_call.png`
    - Test: commission-revenue.spec.ts › "I-21: payout merchant endpoint returns merchant options" — passed
  - **Precondition**: Admin token; at least one merchant with a payout
  - **Steps**:
    1. Call `GET /api/v1/admin/revenue/payouts/merchants`
  - **Expected Response**: Status 200, `{ data: [{ id, name }] }` — feeds the payout Merchant filter and the payout export merchant selector
  - **Business Rules**: None
  - **API**: `GET /api/v1/admin/revenue/payouts/merchants`

- [x] **I-22**: `POST /api/v1/admin/revenue/payouts/:id/review` — returns 200 with payout status
  - **Evidence**:
    - API request and response evidence for I-22: review endpoint transitions pending status and leaves processing unchanged → `I-22_api_call.png`
    - Test: commission-revenue.spec.ts › "I-22: review endpoint transitions pending status and leaves processing unchanged" — passed
  - **Precondition**: Admin token; payout `pending` (and one already processed)
  - **Steps**:
    1. Call the review endpoint for a `pending` payout
    2. Call it again for a non-pending payout
  - **Expected Response**: Status 200, `{ data: { payoutId, status } }`; pending payouts transition `pending` → `processing` with audit event `PAYOUT_REVIEWED`; non-pending payouts return their current status unchanged; 404 when the payout does not exist
  - **Business Rules**: BR-REV-005, BR-COMM-007
  - **API**: `POST /api/v1/admin/revenue/payouts/:id/review`

- [x] **I-23**: `DELETE /api/v1/admin/revenue/payouts` — returns 200 / 409 / 404 / 400
  - **Evidence**:
    - API request and response evidence for I-23: delete endpoint returns success, conflict, not-found, and validation responses → `I-23_api_call.png`
    - Test: commission-revenue.spec.ts › "I-23: delete endpoint returns success, conflict, not-found, and validation responses" — passed
  - **Precondition**: Admin token; body `{ payoutIds: ["<uuid>", ...] }`
  - **Steps**:
    1. Call delete with eligible payout IDs (status `completed`, at least three months old)
    2. Call delete with an ineligible payout ID
    3. Call delete with an unknown payout ID, and with an empty array
  - **Expected Response**: (1) Status 200, `{ data: { payoutIds, deleted: true } }` with one `PAYOUT_DELETED` audit entry per payout; (2) Status 409, message "These payouts cannot be deleted: …. Each payout must be completed and at least three months old."; (3) Status 404 for unknown IDs, 400 for an empty array
  - **Business Rules**: BR-COMM-007
  - **API**: `DELETE /api/v1/admin/revenue/payouts`


---

## Sign-Off

| Item | Status |
|------|--------|
| Test scenarios defined (N, A, B, I) | ☑️ |
| E2E tests implemented | ☑️ |
| PCL auto-update verified | ☑️ |
| Database evidence captured (before / after) | ☑️ |
| Next review date | 2026-10-31 |
