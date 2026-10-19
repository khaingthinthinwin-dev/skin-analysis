# Program Checklist (PCL) — Commission & Revenue

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-PCL-COMM-001 |
| **Target Screen** | Admin Commission / Revenue Dashboard (手数料・収益管理) |
| **Subsystem** | Commission Management & Revenue Tracking |
| **Version** | 1.3 |
| **Created** | 2026-10-14 |
| **Last Updated** | 2026-10-19 |
| **Status** | Active |

> **Source of truth:** `docs/screen/Commission_Revenue/Detailed Design/` (DD_COMM_01–06),
> `機能設計書_Commission_&_Revenue.md` (v8.0), `画面項目設計書_Commission_&_Revenue.md` (v5.0).
> Route: `/admin/commission-revenue` (admin-only, `ProtectedRoute roles={['admin']}`).

---

## 1. Normal Scenarios (N) — Happy Path

> ⚠️ Evidence note: the `Test:` lines in N-01…N-19 reference Playwright titles that do **not** yet exist in `commission-revenue.spec.ts` (only 4 tests are implemented there). Replace each `Test:` line with the real title when the E2E tests are written; screenshots listed below exist under `e2e/`.

- [ ] **N-01**: Commission tab loads by default with rate card and report table
  - **Evidence**:
    - Screenshots → `N-01_1_commission_tab.png`
    - Test: commission-revenue.spec.ts › "should load commission tab with rate and reports" — passed
  - **Precondition**: Admin is authenticated
  - **Steps**:
    1. Login as admin
    2. Navigate to `/admin/commission-revenue`
    3. Verify "Commission" tab is active by default
    4. Verify commission rate card displays the current rate
    5. Verify the report table renders rows and returns to full opacity after fetching (the table is dimmed to 50% opacity while fetching; the rate card shows `—%` until settings resolve)
  - **Expected Result**: Commission tab active; rate rendered as percentage string; report table shows Merchant / Commission Rate / Orders / Revenue / Commission
  - **Business Rules**: BR-COMM-002, BR-COMM-003, BR-COMM-005, BR-COMM-008
  - **API**: `GET /api/v1/admin/commission`, `GET /api/v1/admin/commission/reports`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **N-02**: Edit commission rate successfully
  - **Evidence**:
    - Screenshots → `N-02_1_rate_updated.png`
    - Test: commission-revenue.spec.ts › "should update commission rate successfully" — passed
  - **Precondition**: Admin is on Commission tab
  - **Steps**:
    1. Click "Edit Rate"
    2. Verify dialog opens pre-filled with current rate
    3. Clear input, enter `15.00`
    4. Click "Save"
  - **Expected Result**: Dialog closes; success toast "Commission rate updated"; rate card updates to `15%` (card renders `Number(rate)`); audit event `COMMISSION_RATE_UPDATED` logged
  - **Business Rules**: BR-COMM-001, BR-COMM-002, BR-COMM-003, BR-COMM-007
  - **API**: `PATCH /api/v1/admin/commission`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **N-03**: Filter commission reports by date range
  - **Evidence**:
    - Screenshots → `N-03_1_filtered_reports.png`
    - Test: commission-revenue.spec.ts › "should filter commission reports by date range" — passed
  - **Precondition**: Admin is on Commission tab with report data
  - **Steps**:
    1. Set "From" to `2026-08-01`
    2. Set "To" to `2026-08-15`
    3. Click "Apply"
  - **Expected Result**: Report table refreshes with filtered rows; pagination resets to page 1
  - **Business Rules**: BR-COMM-004, BR-COMM-005
  - **API**: `GET /api/v1/admin/commission/reports?from=2026-08-01&to=2026-08-15`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **N-04**: Reset commission report filters
  - **Evidence**:
    - Screenshots → `N-04_1_filters_reset.png`
    - Test: commission-revenue.spec.ts › "should reset commission report filters" — passed
  - **Precondition**: Admin has applied a date filter on the Commission tab
  - **Steps**:
    1. Click "Reset"
  - **Expected Result**: Date fields cleared; full report data restored; pagination resets to first page
  - **Business Rules**: BR-COMM-005
  - **API**: `GET /api/v1/admin/commission/reports`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **N-05**: Paginate the commission report table
  - **Evidence**:
    - Screenshots → `N-05_1_report_paged.png`
    - Test: commission-revenue.spec.ts › "should paginate commission report table" — passed
  - **Precondition**: Admin is on Commission tab with more than 20 report rows
  - **Steps**:
    1. Set the "Rows" selector to `20`
    2. Click "Next >" in the pagination controls
  - **Expected Result**: Rows reload with page size 20 and page 2 content; "Showing page 2 of …" updates (column headers are not sortable in the current UI — default order is backend-computed: merchant name asc / date asc)
  - **Business Rules**: BR-COMM-005
  - **API**: `GET /api/v1/admin/commission/reports?page=2&limit=20`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **N-06**: Revenue tab loads KPIs, chart, target, panels, and payout table
  - **Evidence**:
    - Screenshots → `N-06_1_revenue_tab.png`
    - Test: commission-revenue.spec.ts › "should load revenue tab with KPI, chart, target and payouts" — passed
  - **Precondition**: Admin is authenticated
  - **Steps**:
    1. Navigate to `/admin/commission-revenue`
    2. Click the "Revenue" tab
    3. Verify 6 KPI cards display values
    4. Verify trend chart, target progress card, Payout Status / Ad Payment Status / Ad Fee Summary panels, and payout table load
  - **Expected Result**: Total Revenue, Total Commission, Ad Fee Revenue, Total Income, Avg Order Value, Net Revenue render as currency strings; chart and tables populated
  - **Business Rules**: BR-REV-001, BR-ADFE-002, BR-ADFE-005, BR-COMM-008
  - **API**: `GET /api/v1/admin/revenue/kpis`, `/revenue/trends`, `/revenue/forecast`, `/revenue/target`, `/revenue/ad-fee`, `/revenue/payouts`, `/revenue/payouts/merchants`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **N-07**: Change trend chart range
  - **Evidence**:
    - Screenshots → `N-07_1_range_changed.png`
    - Test: commission-revenue.spec.ts › "should change revenue trend range" — passed
  - **Precondition**: Admin is on Revenue tab
  - **Steps**:
    1. Verify default range is `30d`
    2. Click `7d`, then `90d`, then `1y`
  - **Expected Result**: Chart refetches and updates for each range; forecast series refreshes accordingly
  - **Business Rules**: BR-REV-002, BR-REV-013
  - **API**: `GET /api/v1/admin/revenue/trends?range=7d`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **N-08**: Process a pending payout successfully
  - **Evidence**:
    - Screenshots → `N-08_1_payout_processed.png`
    - DB payouts row → status `completed`, `processed_at` set → `N-08_2_db_payout.json`
    - Test: commission-revenue.spec.ts › "should process a pending payout" — passed
  - **Precondition**: Admin is on Revenue tab with a `pending` payout row
  - **Steps**:
    1. Click the process icon (aria-label "Process payout") on a pending payout row
    2. Verify confirmation dialog shows merchant, commission, and net payout
    3. Click "Confirm"
  - **Expected Result**: Success toast; payout status changes to `completed`; list and KPIs refresh; audit event `PAYOUT_PROCESSED` logged
  - **Business Rules**: BR-REV-004, BR-REV-005, BR-REV-016, BR-ADFE-004
  - **API**: `POST /api/v1/admin/revenue/payouts/:id/process`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **N-09**: Set a revenue target
  - **Evidence**:
    - Screenshots → `N-09_1_target_saved.png`
    - DB revenue_targets row → `N-09_2_db_target.json`
    - Test: commission-revenue.spec.ts › "should set a monthly revenue target" — passed
  - **Precondition**: Admin is on Revenue tab
  - **Steps**:
    1. Click "Edit Target" (or "Set Target" when no target exists)
    2. Enter `100000`
    3. Select `monthly` period
    4. Click "Save Target"
  - **Expected Result**: Dialog closes; success toast "Revenue target updated"; gauge bar and target amount update; audit event `TARGET_UPDATED` logged
  - **Business Rules**: BR-REV-006, BR-REV-007, BR-REV-009, BR-COMM-007
  - **API**: `PUT /api/v1/admin/revenue/targets`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **N-10**: View AI revenue forecast on trend chart
  - **Evidence**:
    - Screenshots → `N-10_1_forecast_line.png`
    - Test: commission-revenue.spec.ts › "should render AI forecast dotted line" — passed
  - **Precondition**: Admin is on Revenue tab with sufficient historical data
  - **Steps**:
    1. Verify dotted forecast line on the trend chart
    2. Verify "AI Forecast" legend visible
    3. Change range to `7d`
  - **Expected Result**: Dotted line continues the trend line and updates for the selected range; forecast includes revenue + platform fees + ad fees
  - **Business Rules**: BR-REV-011, BR-REV-012, BR-REV-013, BR-REV-015, BR-ADFE-006
  - **API**: `GET /api/v1/admin/revenue/forecast?range=30d`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **N-11**: Toggle revenue target period and view progress gauge
  - **Evidence**:
    - Screenshots → `N-11_1_target_period_toggle.png`
    - Test: commission-revenue.spec.ts › "should toggle target period and show progress" — passed
  - **Precondition**: Admin is on Revenue tab
  - **Steps**:
    1. Toggle target period between `monthly` and `quarterly`
    2. Verify gauge bar and progress percentage update
  - **Expected Result**: Target card refetches; gauge shows clamped 0–100% with progress % label
  - **Business Rules**: BR-REV-006, BR-REV-008, BR-REV-010
  - **API**: `GET /api/v1/admin/revenue/target?period=quarterly`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **N-12**: View ad fee revenue, trend, and ad payment status
  - **Evidence**:
    - Screenshots → `N-12_1_ad_fee_display.png`
    - Test: commission-revenue.spec.ts › "should display ad fee revenue and ad payment status" — passed
  - **Precondition**: Admin is on Revenue tab with ad payment data
  - **Steps**:
    1. Verify Ad Fee Revenue KPI card shows correct value
    2. Verify ad fee trend line renders on the chart
    3. Verify Ad Payment Status panel shows Completed / Pending / Refunded badges
    4. Verify Ad Fee Summary card displays active ads, total collected, pending
  - **Expected Result**: Ad fee values included in Total Income KPI; ad payment badges in a single-row 3-column grid
  - **Business Rules**: BR-ADFE-001, BR-ADFE-002, BR-ADFE-003, BR-ADFE-005
  - **API**: `GET /api/v1/admin/revenue/ad-fee?range=30d`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **N-13**: Export commission report as CSV
  - **Evidence**:
    - Screenshots → `N-13_1_export_commission.png`
    - Test: commission-revenue.spec.ts › "should export commission report as CSV" — passed
  - **Precondition**: Admin is on Commission tab
  - **Steps**:
    1. Click "Export" (Commission Report card)
    2. Select format `CSV`
    3. Select a valid date range
    4. Click "Generate"
  - **Expected Result**: CSV file downloads with correct headers and merchant-level data; audit event `EXPORT_GENERATED` logged
  - **Business Rules**: BR-EXP-001, BR-EXP-002, BR-EXP-003, BR-EXP-004
  - **API**: `POST /api/v1/admin/commission/export`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **N-14**: Export revenue report as Excel (XLSX)
  - **Evidence**:
    - Screenshots → `N-14_1_export_revenue.png`
    - Test: commission-revenue.spec.ts › "should export revenue report as XLSX" — passed
  - **Precondition**: Admin is on Revenue tab
  - **Steps**:
    1. Click "Export Revenue"
    2. Select format `Excel`
    3. Select a valid date range
    4. Click "Generate"
  - **Expected Result**: XLSX file downloads with revenue KPI, trend, and payment status data; audit event `EXPORT_GENERATED` logged
  - **Business Rules**: BR-EXP-001, BR-EXP-002, BR-EXP-003, BR-EXP-004
  - **API**: `POST /api/v1/admin/revenue/export`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **N-15**: Export payout history as CSV
  - **Evidence**:
    - Screenshots → `N-15_1_export_payout.png`
    - Test: commission-revenue.spec.ts › "should export payout history as CSV" — passed
  - **Precondition**: Admin is on Revenue tab
  - **Steps**:
    1. Click "Export Payout" (Merchant Payouts header)
    2. Select format `CSV`
    3. Select a valid date range (prefilled from the period filter when one is applied)
    4. Click "Generate"
  - **Expected Result**: CSV downloads with payout records; net = total − commission (ad fees excluded); audit event `EXPORT_GENERATED` logged
  - **Business Rules**: BR-EXP-001, BR-EXP-002, BR-EXP-003, BR-REV-016, BR-ADFE-004
  - **API**: `POST /api/v1/admin/revenue/payouts/export`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **N-16**: Language toggle works on screen
  - **Evidence**:
    - Screenshots → `N-16_1_lang_ja.png`, `N-16_2_lang_my.png`
    - Test: commission-revenue.spec.ts › "should switch language on commission revenue screen" — passed
  - **Precondition**: Admin is on `/admin/commission-revenue`
  - **Steps**:
    1. Toggle language to Japanese
    2. Verify labels change
    3. Toggle to Myanmar
    4. Toggle back to English
  - **Expected Result**: Dashboard header/sidebar i18n labels update (e.g., sidebar menu `nav.menu.commissionRevenue` becomes "手数料・収益" / "ကော်မရှင်နှင့် ဝင်ငွေ"); preference persisted. ⚠️ Page body labels (tabs, buttons, tables, dialogs) are currently hardcoded English on this screen — they do NOT translate
  - **Business Rules**: None (i18n)
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **N-17**: Theme toggle works on screen
  - **Evidence**:
    - Screenshots → `N-17_1_dark.png`, `N-17_2_light.png`
    - Test: commission-revenue.spec.ts › "should toggle theme on commission revenue screen" — passed
  - **Precondition**: Admin is on `/admin/commission-revenue`
  - **Steps**:
    1. Toggle theme to dark
    2. Verify dark background applied
    3. Toggle back to light
  - **Expected Result**: Styling switches between light and dark modes; preference persisted
  - **Business Rules**: None (UI)
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **N-18**: Responsive layout on desktop viewport
  - **Evidence**:
    - Screenshots → `N-18_1_desktop_layout.png`
    - Test: commission-revenue.spec.ts › "should display desktop layout at 1280px" — passed
  - **Precondition**: Viewport >= 1024px
  - **Steps**:
    1. Set viewport to 1280x720
    2. Verify multi-column KPI grid and full-width tables
  - **Expected Result**: Desktop layout with multi-column KPI grid and full-width tables
  - **Business Rules**: None (Responsive)
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **N-19**: Responsive layout on mobile viewport
  - **Evidence**:
    - Screenshots → `N-19_1_mobile_layout.png`
    - Test: commission-revenue.spec.ts › "should display mobile layout at 375px" — passed
  - **Precondition**: Viewport < 768px
  - **Steps**:
    1. Set viewport to 375x667
    2. Verify stacked KPI cards and horizontally scrollable tables
  - **Expected Result**: Stacked single-column cards; tables scroll horizontally; export modal full-width
  - **Business Rules**: None (Responsive)
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **N-20**: Payout table renders amounts, status, and dates per row
  - **Precondition**: Admin is on Revenue tab with payout rows
  - **Steps**:
    1. Inspect a payout row (Merchant, Period, Total Orders, Total Amount, Commission, Net Payout, Status, Completed Date)
    2. Verify Total Orders badge = completed + pending order counts
    3. Verify Net Payout = Total Amount − Commission
  - **Expected Result**: Amounts rendered as `… Ks`; Commission shown in red with a minus sign; Period rendered as `MMM YYYY`; Status badge matches the row status; Completed Date shows a date only for `completed` payouts (`-` otherwise); ad fees never deducted from Net Payout
  - **Business Rules**: BR-REV-005, BR-REV-016, BR-ADFE-004
  - **API**: `GET /api/v1/admin/revenue/payouts`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **N-21**: Switch commission report grouping (By Merchant / By Day / By Order)
  - **Precondition**: Admin is on Commission tab with report data
  - **Steps**:
    1. Click "By Day"
    2. Click "By Order"
    3. Click "By Merchant"
  - **Expected Result**: Clicked button becomes active (primary) and the report refetches each time; "By Day" adds a Date column, "By Order" shows Order Number + Date and hides the Orders column, "By Merchant" restores merchant rows; report card title updates to `daily` / `by order` / `by merchant`
  - **Business Rules**: BR-COMM-005
  - **API**: `GET /api/v1/admin/commission/reports?groupBy=day`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **N-22**: Cancel Edit Rate keeps the saved rate
  - **Precondition**: Admin is on Commission tab
  - **Steps**:
    1. Click "Edit Rate"
    2. Change the value to `50`
    3. Click "Cancel"
    4. Re-open the dialog
  - **Expected Result**: Dialog closes without sending `PATCH`; rate card unchanged; reopened dialog is pre-filled with the saved rate again
  - **Business Rules**: BR-COMM-001
  - **API**: None (no request sent)
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **N-23**: Filter payout list by status, merchant, and period
  - **Precondition**: Admin is on Revenue tab with payout data spanning multiple statuses/merchants/periods
  - **Steps**:
    1. Set Status to `Pending`
    2. Set Merchant to a specific merchant
    3. Set Period to a specific month (e.g. Aug 2026)
  - **Expected Result**: Each change refetches the payout table with the matching query parameter and resets pagination to page 1; only matching rows are shown; Status offers All / Pending / Processing / Completed; Period options are built from the returned payout periods (newest 6)
  - **Business Rules**: BR-REV-005
  - **API**: `GET /api/v1/admin/revenue/payouts?status=pending&merchantId=<id>&period=YYYY-MM`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **N-24**: Search payout list by merchant name or period
  - **Precondition**: Admin is on Revenue tab
  - **Steps**:
    1. Type a merchant name (or `YYYY-MM`) into the Search box
    2. Click the search icon button (aria-label "Search payouts") — Enter does not trigger the search
    3. Search for a term that matches nothing
  - **Expected Result**: Search runs server-side and resets to page 1; only matching rows remain; no-match shows the empty state "No merchant payouts found."
  - **Business Rules**: None (payout list search)
  - **API**: `GET /api/v1/admin/revenue/payouts?search=<term>`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **N-25**: Reset payout filters
  - **Precondition**: Status/merchant/period/search filters are applied on the Revenue tab
  - **Steps**:
    1. Click "Reset"
  - **Expected Result**: Status and Merchant return to "All", Period to "All periods", search box cleared, pagination back to page 1, full payout list restored
  - **Business Rules**: None (UI)
  - **API**: `GET /api/v1/admin/revenue/payouts`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **N-26**: Paginate the payout table
  - **Precondition**: Payout list has more rows than the current page size
  - **Steps**:
    1. Click the next page control
    2. Change the page size to `20`
  - **Expected Result**: Rows update for the selected page; page-size options are 10 / 20 / 50 / 100; changing the page size resets to page 1
  - **Business Rules**: None (payout list browsing)
  - **API**: `GET /api/v1/admin/revenue/payouts?page=2&limit=20`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **N-27**: View payout detail dialog
  - **Precondition**: Admin is on Revenue tab with payout rows
  - **Steps**:
    1. Click the eye (View payout details) icon on a `completed` payout
    2. Verify Total Amount, −Commission Fee, Net Payout, and Paid Date
    3. Click "Close", then click the eye icon on a `pending` payout
  - **Expected Result**: Dialog "Payout Detail for <merchant>" opens with the amount rows and Paid Date (`-` when not yet processed); viewing or cancelling a pending payout also fires the review request, which moves `pending` → `processing` and refreshes the list
  - **Business Rules**: BR-REV-005, BR-REV-016, BR-COMM-007
  - **API**: `POST /api/v1/admin/revenue/payouts/:id/review`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **N-28**: Select and bulk-delete eligible payout rows
  - **Precondition**: Completed payouts older than three months exist
  - **Steps**:
    1. Tick row checkboxes (or the header select-all checkbox)
    2. Click the trash (Delete selected payouts) button
    3. Verify the confirm dialog shows the selected row count
    4. Click "Confirm delete"
  - **Expected Result**: Success toast "Payouts deleted"; deleted rows disappear; selection cleared; payout list refetched; audit event `PAYOUT_DELETED` logged per payout
  - **Business Rules**: BR-COMM-007
  - **API**: `DELETE /api/v1/admin/revenue/payouts`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **N-29**: Payout confirmation dialog shows amount breakdown and processing state
  - **Precondition**: Admin is on Revenue tab; the payout aggregates multiple orders
  - **Steps**:
    1. Click the process ($) icon on a payout row
    2. Review Total Amount, −Commission Fee, Net Payout, and the Breakdown section
    3. Click "Confirm" and observe the button while the request is in flight
  - **Expected Result**: Title "Process payout for <merchant>?"; description states ad fees are excluded (net = total − commission); Breakdown lists completed/pending order counts and amounts when more than one order exists; buttons show "Processing..." and are disabled until the request settles
  - **Business Rules**: BR-REV-005, BR-REV-016, BR-ADFE-004
  - **API**: `POST /api/v1/admin/revenue/payouts/:id/process`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **N-30**: Apply and remove multiple payout filters simultaneously (Status + Merchant + Period)
  - **Precondition**: Admin is on Revenue tab with payout data spanning multiple statuses/merchants/periods
  - **Steps**:
    1. Set Status to `Pending`, Merchant to a specific merchant, and Period to a specific month (e.g. Aug 2026) simultaneously
    2. Verify the payout request carries all three parameters (`status`, `merchantId`, `period`) and the table narrows to the intersection (product set) of the three conditions
    3. Reset only Merchant to "All" while keeping Status and Period selected
  - **Expected Result**: Combined filters refetch with `GET /api/v1/admin/revenue/payouts?status=pending&merchantId=<id>&period=YYYY-MM` and show only rows matching all three; after restoring Merchant to "All", `merchantId` is excluded from the query (empty values are not sent — `RevenueTab.tsx` spreads only truthy filter values), Status and Period are retained, pagination resets to page 1, and results update in real time without page reload
  - **Business Rules**: BR-REV-005
  - **API**: `GET /api/v1/admin/revenue/payouts?status=pending&merchantId=<id>&period=YYYY-MM`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **N-31**: Historical rate locking for existing report rows after a rate change
  - **Precondition**: Commission report rows exist at the current rate (e.g. `10.00`); admin changes the rate via Edit Rate (e.g. to `15.00`)
  - **Steps**:
    1. Note the commission rate / commission values on an existing report row
    2. Change the commission rate via Edit Rate and save
    3. Reload the commission report (same date range covering orders placed before the rate change)
    4. Create (or observe) a new order completed after the rate change and reload the report again
  - **Expected Result**: Existing (old) report rows keep the original rate and commission amounts; only new orders generated after the rate change use the new rate; backend resolves the rate via `commissionRateHistory` by order date (`getEffectiveRate(at)` / `buildRateLookup`), which is the core of BR-COMM-003
  - **Business Rules**: BR-COMM-002, BR-COMM-003
  - **API**: `PATCH /api/v1/admin/commission`, `GET /api/v1/admin/commission/reports`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

---

## 2. Abnormal Scenarios (A) — Error & Negative Paths

- [ ] **A-01**: Edit rate with empty input
  - **Precondition**: Edit Rate dialog is open
  - **Steps**:
    1. Clear the rate input
    2. Click "Save"
  - **Expected Result**: Inline error "Commission rate must be between 0 and 100" (the single client-side message for empty / non-numeric / ≤ 0 input); Save button disabled; no request sent
  - **Business Rules**: BR-COMM-001
  - **API**: None (client-side only — a direct `PATCH /api/v1/admin/commission` with an empty rate returns 400 "Commission rate is required")
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **A-02**: Edit rate with non-decimal input
  - **Precondition**: Edit Rate dialog is open
  - **Steps**:
    1. Enter `abc` (the `type="number"` input rejects non-numeric characters, leaving the value empty)
    2. Click "Save"
  - **Expected Result**: Same inline error as A-01 ("Commission rate must be between 0 and 100"); submit blocked
  - **Business Rules**: BR-COMM-001
  - **API**: None (client-side only — backend DTO would return 400 "Commission rate must be a number with up to 2 decimal places")
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **A-03**: Edit rate out of range (>100)
  - **Precondition**: Edit Rate dialog is open
  - **Steps**:
    1. Enter `150`
    2. Click "Save"
  - **Expected Result**: ⚠️ The client does NOT block values > 100 (it only rejects NaN / ≤ 0) — Save is enabled, the request is sent and the dialog closes; the backend rejects it with 400 "Commission rate must be greater than 0 and at most 100"; destructive toast "Failed to update commission rate"; rate card unchanged
  - **Business Rules**: BR-COMM-001
  - **API**: `PATCH /api/v1/admin/commission`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **A-04**: Report filter with "From" after "To"
  - **Precondition**: Admin is on Commission tab
  - **Steps**:
    1. Set "From" to `2026-08-15`
    2. Set "To" to `2026-08-01`
    3. Click "Apply"
  - **Expected Result**: Inline validation error "From date must be earlier than or equal to To date."; no fetch
  - **Business Rules**: BR-COMM-004
  - **API**: None (client-side validation — the backend returns 400 with the same message when called directly)
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **A-05**: Process an already-processed payout
  - **Precondition**: A payout row is already `completed`
  - **Steps**:
    1. Observe the process icon on completed rows
    2. (Race / forced request) trigger process for that payout again
  - **Expected Result**: The process button is disabled on completed rows, so no dialog opens; if a 409 still occurs, destructive toast "Payout already processed" and the payout list refreshes (no alert banner is implemented)
  - **Business Rules**: BR-REV-004
  - **API**: `POST /api/v1/admin/revenue/payouts/:id/process` → 409 `{ statusCode: 409, error: "CONFLICT", errorCode: "RES_003", message: "Payout has already been processed" }`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **A-06**: Process a non-existent payout
  - **Precondition**: Payout ID does not exist
  - **Steps**:
    1. Call process payout with a fake ID
  - **Expected Result**: Status 404 `{ errorCode: "RES_001", message: "Payout not found" }`; the UI surfaces the generic all-failed toast "Payout already processed" (used for every failed batch) and the payout list is invalidated/refreshed
  - **Business Rules**: BR-REV-005
  - **API**: `POST /api/v1/admin/revenue/payouts/:id/process`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **A-07**: Set target with empty amount
  - **Precondition**: Edit/Set Target dialog is open
  - **Steps**:
    1. Clear the target amount
    2. Click "Save Target"
  - **Expected Result**: Inline error "Target amount must be a positive number with up to 2 decimal places."; submit blocked (no request)
  - **Business Rules**: BR-REV-007
  - **API**: `PUT /api/v1/admin/revenue/targets`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **A-08**: Set target with non-positive amount
  - **Precondition**: Edit/Set Target dialog is open
  - **Steps**:
    1. Enter `-500`
    2. Click "Save Target"
  - **Expected Result**: Inline error "Target amount must be a positive number with up to 2 decimal places." (the `^\d+(\.\d{1,2})?$` regex rejects the minus sign); submit blocked
  - **Business Rules**: BR-REV-007
  - **API**: `PUT /api/v1/admin/revenue/targets`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **A-09**: Export without selecting a date range
  - **Precondition**: Export modal is open
  - **Steps**:
    1. Leave the date range empty
    2. Click "Generate"
  - **Expected Result**: Inline error "Please select a start and end date."; generation blocked
  - **Business Rules**: BR-EXP-002
  - **API**: `POST /api/v1/admin/commission/export`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **A-10**: Export with end date before start date
  - **Precondition**: Export modal is open
  - **Steps**:
    1. Set dateFrom to `2026-08-15`
    2. Set dateTo to `2026-08-01`
    3. Click "Generate"
  - **Expected Result**: Inline error "End date must be after start date."; generation blocked
  - **Business Rules**: BR-EXP-002
  - **API**: `POST /api/v1/admin/revenue/export`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **A-11**: Export date range exceeds 365 days
  - **Precondition**: Export modal is open
  - **Steps**:
    1. Set dateFrom to `2025-01-01`
    2. Set dateTo to `2026-08-26`
    3. Click "Generate"
  - **Expected Result**: Inline error "Date range cannot exceed 365 days."; generation blocked (client-side check on the raw day difference)
  - **Business Rules**: BR-EXP-002
  - **API**: `POST /api/v1/admin/revenue/payouts/export`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **A-12**: Buyer access denied to admin route
  - **Precondition**: Logged in as buyer
  - **Steps**:
    1. Navigate directly to `/admin/commission-revenue`
  - **Expected Result**: Redirect to `/unauthorized` (ProtectedRoute `replace`); the page never renders. A direct API call with the buyer token returns 403 `{ errorCode: "RES_004", message: "Insufficient permissions" }`
  - **Business Rules**: BR-COMM-006
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **A-13**: Merchant access denied to admin route
  - **Precondition**: Logged in as merchant
  - **Steps**:
    1. Navigate directly to `/admin/commission-revenue`
  - **Expected Result**: Redirect to `/unauthorized` (ProtectedRoute `replace`); the page never renders. A direct API call with the merchant token returns 403 `{ errorCode: "RES_004", message: "Insufficient permissions" }`
  - **Business Rules**: BR-COMM-006
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **A-14**: Server error on revenue dashboard load
  - **Precondition**: Backend returns 500 SYS_001 for the revenue GETs
  - **Steps**:
    1. Navigate to `/admin/commission-revenue` (Revenue tab)
  - **Expected Result**: ⚠️ No alert banner / retry is implemented on this screen: KPI cards fall back to `0 Ks`, the trend chart shows "No trend data available.", the target card shows "No target set for this period.", and the payout area shows its empty/loading state; on refetch failures TanStack Query keeps the last successful data (placeholderData)
  - **Business Rules**: None (error handling)
  - **API**: `GET /api/v1/admin/revenue/kpis` (and the other `/admin/revenue/*` GETs)
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **A-15**: Network error during an admin action
  - **Precondition**: Network connectivity is interrupted
  - **Steps**:
    1. Attempt to save a commission rate update
  - **Expected Result**: Destructive toast "Failed to update commission rate" (no alert banner); the edit dialog has already closed; the rate card keeps its previous value
  - **Business Rules**: None (error handling)
  - **API**: `PATCH /api/v1/admin/commission`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **A-16**: Delete action blocked when no payout row is selected
  - **Precondition**: No payout checkboxes are ticked
  - **Steps**:
    1. Locate the trash (Delete selected payouts) button
    2. Attempt to click it
  - **Expected Result**: Button is disabled (title "Delete selected payouts"); no confirmation dialog opens; no request sent
  - **Business Rules**: None (UI)
  - **API**: None (no request sent)
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **A-17**: Delete payout rows that are not eligible (409)
  - **Precondition**: Selection includes a payout that is not `completed` or is younger than three months
  - **Steps**:
    1. Select the ineligible rows
    2. Click the trash button, then "Confirm delete"
  - **Expected Result**: Confirmation dialog closes; error dialog "Payout cannot be deleted" appears with the backend message ("Each payout must be completed and at least three months old."); no rows are removed
  - **Business Rules**: None (payout deletion eligibility — 409 CONFLICT)
  - **API**: `DELETE /api/v1/admin/revenue/payouts`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **A-18**: Delete payout request fails (non-409 error)
  - **Precondition**: Backend returns 404/500 or the network fails during deletion
  - **Steps**:
    1. Select rows and confirm deletion while the request fails
  - **Expected Result**: Error dialog "Failed to delete payout" shows the backend message (or generic text); payout list unchanged
  - **Business Rules**: None (error handling)
  - **API**: `DELETE /api/v1/admin/revenue/payouts`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **A-19**: Process a payout group containing already-processed payouts
  - **Precondition**: The payout row aggregates several underlying payouts, at least one already processed
  - **Steps**:
    1. Click the process icon, then "Confirm"
  - **Expected Result**: Partial success → toast "Payout partially processed (X succeeded, Y skipped (already processed))"; all failed → destructive toast "Payout already processed"; confirmation dialog closes and payout list + KPIs refresh in every case
  - **Business Rules**: BR-REV-004
  - **API**: `POST /api/v1/admin/revenue/payouts/:id/process`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **A-20**: Export request fails
  - **Precondition**: Export endpoint returns 500 (EXP_005) or the request fails
  - **Steps**:
    1. Open the Export modal and enter a valid date range
    2. Click "Generate"
  - **Expected Result**: Destructive toast "Export failed"; modal stays open with the entered values; the button reverts from "Generating..." to "Generate"
  - **Business Rules**: None (error handling — EXP_005)
  - **API**: `POST /api/v1/admin/commission/export`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **A-21**: Save revenue target fails
  - **Precondition**: `PUT /api/v1/admin/revenue/targets` returns 400 (VAL_001 — e.g. `targetAmount` failing class-validator) or 500
  - **Steps**:
    1. Open Edit/Set Target and enter a valid amount
    2. Click "Save Target" while the request fails
  - **Expected Result**: Dialog closes; destructive toast "Failed to save target" with the backend message when provided; gauge and target amount unchanged after refetch
  - **Business Rules**: BR-REV-007
  - **API**: `PUT /api/v1/admin/revenue/targets`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **A-22**: Commission rate update fails
  - **Precondition**: `PATCH /api/v1/admin/commission` returns 400 (VAL_001, message "Commission rate must be greater than 0 and at most 100") or 500
  - **Steps**:
    1. Open Edit Rate and enter a syntactically valid rate
    2. Click "Save" while the request fails
  - **Expected Result**: Dialog closes; destructive toast "Failed to update commission rate"; rate card still shows the previous rate after query invalidation
  - **Business Rules**: BR-COMM-001
  - **API**: `PATCH /api/v1/admin/commission`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

---

## 3. Boundary Scenarios (B) — Edge Cases & Limits

- [ ] **B-01**: Commission rate at minimum valid value
  - **Precondition**: Edit Rate dialog is open
  - **Steps**:
    1. Enter `0.01`
    2. Click "Save"
  - **Expected Result**: Success — rate accepted and persisted
  - **Business Rules**: BR-COMM-001
  - **API**: `PATCH /api/v1/admin/commission`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **B-02**: Commission rate at maximum valid value (100)
  - **Precondition**: Edit Rate dialog is open
  - **Steps**:
    1. Enter `100`
    2. Click "Save"
  - **Expected Result**: Success — rate accepted and persisted
  - **Business Rules**: BR-COMM-001
  - **API**: `PATCH /api/v1/admin/commission`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **B-03**: Commission rate with two decimal places
  - **Precondition**: Edit Rate dialog is open
  - **Steps**:
    1. Enter `12.50`
    2. Click "Save"
  - **Expected Result**: Success — accepted; backend stores/returns `12.50` (2-decimal string) and the rate card renders `Number(rate)` → `12.5%`
  - **Business Rules**: BR-COMM-001, BR-COMM-003
  - **API**: `PATCH /api/v1/admin/commission`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **B-04**: Target amount with two decimal places
  - **Precondition**: Edit/Set Target dialog is open
  - **Steps**:
    1. Enter `100000.50`
    2. Select period, click "Save Target"
  - **Expected Result**: Success — amount accepted and persisted with precision
  - **Business Rules**: BR-REV-007
  - **API**: `PUT /api/v1/admin/revenue/targets`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **B-05**: Target progress above 100% (over target)
  - **Precondition**: Actual revenue exceeds the configured target
  - **Steps**:
    1. Load the target progress card
  - **Expected Result**: Gauge bar width clamped to 100%; ⚠️ the progress label is also clamped (`100%`) — no separate "over target" indicator is implemented in the current UI
  - **Business Rules**: BR-REV-008
  - **API**: `GET /api/v1/admin/revenue/target`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **B-06**: No revenue target configured
  - **Precondition**: No active target exists for the period
  - **Steps**:
    1. Load the target progress card
  - **Expected Result**: No gauge/progress bar rendered; message "No target set for this period." displayed; "Set Target" button available; period toggle still available
  - **Business Rules**: BR-REV-008
  - **API**: `GET /api/v1/admin/revenue/target`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **B-07**: Empty state for commission report table
  - **Precondition**: No completed orders exist for the selected range
  - **Steps**:
    1. Apply a date range with no data
  - **Expected Result**: Empty-state row "No commission reports found." displayed; Export button disabled (see B-13)
  - **Business Rules**: BR-COMM-005
  - **API**: `GET /api/v1/admin/commission/reports`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **B-08**: Empty state for payout table
  - **Precondition**: No payout records match the current filters
  - **Steps**:
    1. Load the payout table (or apply a search with no matches)
  - **Expected Result**: Empty-state row "No merchant payouts found." displayed; no row checkboxes / process buttons available
  - **Business Rules**: BR-REV-005
  - **API**: `GET /api/v1/admin/revenue/payouts`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **B-09**: Forecast with insufficient historical data
  - **Precondition**: Fewer than the minimum required data points exist (backend MIN_POINTS = 7)
  - **Steps**:
    1. Load the Revenue tab
  - **Expected Result**: Dotted forecast line hidden; informational note "Not enough historical data to generate a forecast" shown inside the chart (rendered from the API `note` field); "AI Forecast" legend hidden
  - **Business Rules**: BR-REV-014
  - **API**: `GET /api/v1/admin/revenue/forecast`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **B-10**: Ad fee zero-state values
  - **Precondition**: No ad payments exist
  - **Steps**:
    1. Load the Revenue tab
  - **Expected Result**: Ad Fee Revenue KPI renders `0 Ks` (currency formatter rounds to whole numbers); Ad Fee Summary shows Active Ads `0`, Total Collected `$0.00`, Pending `0`; Ad Payment Status badges show `0`
  - **Business Rules**: BR-ADFE-001, BR-ADFE-005
  - **API**: `GET /api/v1/admin/revenue/ad-fee`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **B-11**: Export date range at the 365-day limit
  - **Precondition**: Export modal is open
  - **Steps**:
    1. Set dateFrom to `2025-08-26`
    2. Set dateTo to `2026-08-25` (364-day difference = 365 inclusive days)
    3. Click "Generate"
  - **Expected Result**: Accepted — the backend counts the range inclusively (`days = diff + 1`) so ≤ 365 calendar days pass. ⚠️ A `dateTo` exactly 365 days after `dateFrom` passes the client check (raw difference) but the backend rejects it with 400 "Date range cannot exceed 365 days"
  - **Business Rules**: BR-EXP-002
  - **API**: `POST /api/v1/admin/commission/export`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **B-12**: Commission rate placeholder before settings load
  - **Precondition**: `GET /api/v1/admin/commission` has not resolved yet or returns no rate
  - **Steps**:
    1. Open the Commission tab before settings arrive
  - **Expected Result**: Rate card shows `—%` (never `NaN`); Edit Rate dialog falls back to `10.00` until the real rate loads
  - **Business Rules**: BR-COMM-008
  - **API**: `GET /api/v1/admin/commission`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **B-13**: Export button disabled when the report table is empty
  - **Precondition**: Commission report returned zero rows
  - **Steps**:
    1. Apply a date range with no data
    2. Attempt to click "Export"
  - **Expected Result**: Export button disabled; the Export modal does not open
  - **Business Rules**: None (UI)
  - **API**: `GET /api/v1/admin/commission/reports`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **B-14**: Commission rate exactly 0 is rejected
  - **Precondition**: Edit Rate dialog is open
  - **Steps**:
    1. Enter `0`
    2. Attempt to click "Save"
  - **Expected Result**: Inline error "Commission rate must be between 0 and 100"; Save stays disabled (rate must be greater than 0)
  - **Business Rules**: BR-COMM-001
  - **API**: `PATCH /api/v1/admin/commission`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **B-15**: Target amount with more than two decimal places
  - **Precondition**: Edit/Set Target dialog is open
  - **Steps**:
    1. Enter `100000.999`
    2. Click "Save Target"
  - **Expected Result**: Inline error "Target amount must be a positive number with up to 2 decimal places."; submit blocked
  - **Business Rules**: BR-REV-007
  - **API**: `PUT /api/v1/admin/revenue/targets`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **B-16**: Select-all applies only to the current payout page
  - **Precondition**: Payout list spans multiple pages
  - **Steps**:
    1. Tick the header checkbox on page 1
    2. Move to page 2, then return to page 1
  - **Expected Result**: Header checkbox selects only the rows visible on the current page; selections from other pages are retained; the delete confirmation counts all selected rows
  - **Business Rules**: None (UI)
  - **API**: `GET /api/v1/admin/revenue/payouts`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **B-17**: Export Generate shows a progress state while in flight
  - **Precondition**: Export modal is open with a valid range
  - **Steps**:
    1. Click "Generate"
  - **Expected Result**: Button label changes to "Generating..."; both "Generate" and "Cancel" are disabled until the response settles, then re-enabled
  - **Business Rules**: None (UI)
  - **API**: `POST /api/v1/admin/commission/export`
  - **Note**: Not yet tested — awaiting Playwright E2E implementation.

- [ ] **B-18**: Payout search character limit boundary (100 / 101 characters)
  - **Precondition**: Admin is on Revenue tab (search runs server-side via `GET /api/v1/admin/revenue/payouts?search=<term>`); since over-limit input cannot be verified directly from the UI search box, verify at API level
  - **Steps**:
    1. Call `GET /api/v1/admin/revenue/payouts` with a `search` value of exactly 100 characters
    2. Call `GET /api/v1/admin/revenue/payouts` with a `search` value of 101 characters
  - **Expected Result**: 100 characters → accepted (200 with payout list, possibly empty); 101 characters → rejected with 400 by the backend `@MaxLength(100)` validation on `PayoutQueryDto.search` (standard error body)
  - **Business Rules**: None (payout list search boundary)
  - **API**: `GET /api/v1/admin/revenue/payouts?search=<term>`
  - **Note**: Not yet tested — awaiting API contract spec implementation.

---

## 4. Interface Scenarios (I) — API Contracts & Payloads

> API contract tests — **no screenshots by design**. Evidence lines reference the test title and status only.

- [ ] **I-01**: `GET /api/v1/admin/commission` — returns 200 with current rate
  - **Precondition**: Valid admin access token
  - **Steps**:
    1. Call `GET /api/v1/admin/commission` with admin bearer token
  - **Expected Response**: Status 200, JSON `{ data: { rate: "10.00" } }` (rate as string)
  - **Business Rules**: BR-COMM-003
  - **API**: `GET /api/v1/admin/commission`
  - **Note**: Not yet tested — awaiting API contract spec implementation.

- [ ] **I-02**: `PATCH /api/v1/admin/commission` — returns 200 with updated rate
  - **Precondition**: Valid admin token and payload `{ rate: "12.50" }`
  - **Steps**:
    1. Call `PATCH /api/v1/admin/commission`
  - **Expected Response**: Status 200, JSON `{ data: { rate: "12.50" } }`; audit event logged
  - **Business Rules**: BR-COMM-001, BR-COMM-007
  - **API**: `PATCH /api/v1/admin/commission`
  - **Note**: Not yet tested — awaiting API contract spec implementation.

- [ ] **I-03**: `GET /api/v1/admin/commission/reports` — returns 200 with rows and pagination
  - **Precondition**: Admin token; records exist
  - **Steps**:
    1. Call `GET /api/v1/admin/commission/reports?page=1&limit=20`
  - **Expected Response**: Status 200, JSON `{ data: { reports: [...], pagination: { page, limit, total, totalPages } } }`
  - **Business Rules**: BR-COMM-005
  - **API**: `GET /api/v1/admin/commission/reports`
  - **Note**: Not yet tested — awaiting API contract spec implementation.

- [ ] **I-04**: `GET /api/v1/admin/commission/reports` — returns 400 for `from > to`
  - **Precondition**: Admin token; `from` later than `to`
  - **Steps**:
    1. Call with `from=2026-08-15&to=2026-08-01`
  - **Expected Response**: Status 400, standard error body
  - **Business Rules**: BR-COMM-004
  - **API**: `GET /api/v1/admin/commission/reports`
  - **Note**: Not yet tested — awaiting API contract spec implementation.

- [ ] **I-05**: `GET /api/v1/admin/revenue/kpis` — returns 200 with 6 KPI values
  - **Precondition**: Admin token
  - **Steps**:
    1. Call `GET /api/v1/admin/revenue/kpis?range=30d`
  - **Expected Response**: Status 200, `{ data: { kpis: { totalRevenue, totalCommission, adFeeRevenue, totalIncome, avgOrderValue, netRevenue } } }` all as decimal strings
  - **Business Rules**: BR-REV-001, BR-ADFE-002
  - **API**: `GET /api/v1/admin/revenue/kpis`
  - **Note**: Not yet tested — awaiting API contract spec implementation. ⚠️ Implemented route (`admin-revenue.controller` `@Get('kpis')`); DD_COMM_03 §3.1 still documents `GET /api/v1/admin/revenue` — update the DD to match the code.

- [ ] **I-06**: `GET /api/v1/admin/revenue/trends` — returns 200 with trend points
  - **Precondition**: Admin token; valid range
  - **Steps**:
    1. Call `GET /api/v1/admin/revenue/trends?range=30d`
  - **Expected Response**: Status 200, `{ data: { trendPoints: [{ date, revenue, commission, adFee, totalIncome }] } }`
  - **Business Rules**: BR-REV-002, BR-ADFE-003
  - **API**: `GET /api/v1/admin/revenue/trends`
  - **Note**: Not yet tested — awaiting API contract spec implementation.

- [ ] **I-07**: `GET /api/v1/admin/revenue/target` — returns 200 with target or null
  - **Precondition**: Admin token; `period=monthly`
  - **Steps**:
    1. Call `GET /api/v1/admin/revenue/target?period=monthly`
  - **Expected Response**: Status 200, `{ data: { target: { targetAmount, period, actualRevenue, progressPercent } } }` (or `{ data: { target: null } }` when none)
  - **Business Rules**: BR-REV-008, BR-REV-009
  - **API**: `GET /api/v1/admin/revenue/target`
  - **Note**: Not yet tested — awaiting API contract spec implementation. ⚠️ Implemented route is singular `/revenue/target` (`@Get('target')`); DD_COMM_03 §3.3 documents `/revenue/targets` — update the DD to match the code.

- [ ] **I-08**: `PUT /api/v1/admin/revenue/targets` — returns 200 with saved target
  - **Precondition**: Admin token; payload `{ targetAmount: "150000.00", targetPeriod: "monthly" }`
  - **Steps**:
    1. Call `PUT /api/v1/admin/revenue/targets`
  - **Expected Response**: Status 200, `{ data: { targetAmount, targetPeriod, actualRevenue, progressPercent } }`; audit event `TARGET_UPDATED` logged
  - **Business Rules**: BR-REV-006, BR-REV-007, BR-REV-009, BR-COMM-007
  - **API**: `PUT /api/v1/admin/revenue/targets`
  - **Note**: Not yet tested — awaiting API contract spec implementation.

- [ ] **I-09**: `GET /api/v1/admin/revenue/forecast` — returns 200 with points or empty series
  - **Precondition**: Admin token; valid range
  - **Steps**:
    1. Call `GET /api/v1/admin/revenue/forecast?range=30d`
  - **Expected Response**: Status 200, `{ data: { forecastPoints: [{ date, forecastRevenue, forecastCommission, forecastAdFee }] } }`; empty array with `note` when data insufficient
  - **Business Rules**: BR-REV-012, BR-REV-014, BR-ADFE-006
  - **API**: `GET /api/v1/admin/revenue/forecast`
  - **Note**: Not yet tested — awaiting API contract spec implementation.

- [ ] **I-10**: `GET /api/v1/admin/revenue/ad-fee` — returns 200 with KPIs, trend, status
  - **Precondition**: Admin token; valid range
  - **Steps**:
    1. Call `GET /api/v1/admin/revenue/ad-fee?range=30d`
  - **Expected Response**: Status 200, `{ data: { adFeeKpis: { totalAdFees, activeAds, pendingPayments, completedPayments }, adFeeTrendPoints: [{ date, adFee }], adFeePaymentStatus: { completed, pending, refunded } } }`
  - **Business Rules**: BR-ADFE-001, BR-ADFE-005
  - **API**: `GET /api/v1/admin/revenue/ad-fee`
  - **Note**: Not yet tested — awaiting API contract spec implementation. ⚠️ Implemented route is singular `/revenue/ad-fee` (`@Get('ad-fee')`); DD_COMM_03 §3.6 documents `/revenue/ad-fees` — update the DD to match the code.

- [ ] **I-11**: `GET /api/v1/admin/revenue/payments/status` — returns 200 with status counts
  - **Precondition**: Admin token; valid range
  - **Steps**:
    1. Call `GET /api/v1/admin/revenue/payments/status?range=30d`
  - **Expected Response**: Status 200, `{ data: { completed, processing, pending } }` — counts of payout rows created within the range (⚠️ NOT the order/ad payment breakdown from the spec)
  - **Business Rules**: None (implemented as payout status counts; BR-REV-003 order/ad breakdown is not served by this route)
  - **API**: `GET /api/v1/admin/revenue/payments/status`
  - **Note**: Not yet tested — awaiting API contract spec implementation. ⚠️ The current UI does not call this endpoint — the "Payout Status" panel uses `statusCounts` from `GET /revenue/payouts`; DD_COMM_03 §3.7 documents `/revenue/payments`.

- [ ] **I-12**: `GET /api/v1/admin/revenue/payouts` — returns 200 with payout list
  - **Precondition**: Admin token; optional `status` filter
  - **Steps**:
    1. Call `GET /api/v1/admin/revenue/payouts?status=pending&page=1&limit=20`
  - **Expected Response**: Status 200, `{ data: { items: [{ id, payoutId, merchantId, merchantName, period, commissionRate, totalAmount, commissionAmount, adFeeAmount, netAmount, status, failureReason, createdAt, processedAt, canDelete, completedCount, completedTotal, completedCommission, pendingCount, pendingTotal, pendingCommission }], total, page, limit, totalPages, statusCounts: { completed, processing, pending }, periods: ["YYYY-MM", …] } }`; `netAmount = totalAmount − commissionAmount` and `adFeeAmount` is always `"0.00"` (BR-REV-016 / BR-ADFE-004); backend default `limit` is 20 (UI sends 10)
  - **Business Rules**: BR-REV-016, BR-ADFE-004
  - **API**: `GET /api/v1/admin/revenue/payouts`
  - **Note**: Not yet tested — awaiting API contract spec implementation.

- [ ] **I-13**: `POST /api/v1/admin/revenue/payouts/:id/process` — returns 200 on success
  - **Precondition**: Admin token; payout `pending`
  - **Steps**:
    1. Call process endpoint for a pending payout
  - **Expected Response**: Status 200, `{ data: { payoutId, status: "completed", processedAt, idempotencyKey } }`; audit event `PAYOUT_PROCESSED` logged
  - **Business Rules**: BR-REV-004, BR-REV-005, BR-COMM-007
  - **API**: `POST /api/v1/admin/revenue/payouts/:id/process`
  - **Note**: Not yet tested — awaiting API contract spec implementation.

- [ ] **I-14**: `POST /api/v1/admin/revenue/payouts/:id/process` — returns 409 for already-processed payout
  - **Precondition**: Admin token; payout already processed
  - **Steps**:
    1. Call process endpoint again for the same payout
  - **Expected Response**: Status 409, `{ statusCode: 409, error: "CONFLICT", errorCode: "RES_003", message: "Payout has already been processed" }` (⚠️ the filter maps 409 → `RES_003`; the spec's `COMM_004` code is never emitted by the backend)
  - **Business Rules**: BR-REV-004
  - **API**: `POST /api/v1/admin/revenue/payouts/:id/process`
  - **Note**: Not yet tested — awaiting API contract spec implementation.

- [ ] **I-15**: `POST /api/v1/admin/commission/export` — returns 200 with file stream
  - **Precondition**: Admin token; payload `{ dateFrom, dateTo, format: "csv" }`
  - **Steps**:
    1. Call commission export with valid body
  - **Expected Response**: Status 200, `Content-Type: text/csv`, `Content-Disposition: attachment; filename="commission report(<group label>) report {YYYYMMDD}-{YYYYMMDD}({YYYYMMDD})(csv)"` where `<group label>` is `by merchant` / `by date` / `by order` (⚠️ built by `export.service.payload()` — the format token is wrapped in parentheses, there is no `.csv` extension); audit event `EXPORT_GENERATED` logged
  - **Business Rules**: BR-EXP-001, BR-EXP-002, BR-EXP-003
  - **API**: `POST /api/v1/admin/commission/export`
  - **Note**: Not yet tested — awaiting API contract spec implementation.

- [ ] **I-16**: `POST /api/v1/admin/revenue/export` — returns 200 with XLSX stream
  - **Precondition**: Admin token; payload `{ dateFrom, dateTo, format: "xlsx" }`
  - **Steps**:
    1. Call revenue export with valid body
  - **Expected Response**: Status 200, `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `Content-Disposition: attachment; filename="revenue report {YYYYMMDD}-{YYYYMMDD}({YYYYMMDD})(xlsx)"`; audit event `EXPORT_GENERATED` logged
  - **Business Rules**: BR-EXP-001, BR-EXP-002, BR-EXP-003
  - **API**: `POST /api/v1/admin/revenue/export`
  - **Note**: Not yet tested — awaiting API contract spec implementation.

- [ ] **I-17**: `POST /api/v1/admin/revenue/payouts/export` — returns 200 with file stream
  - **Precondition**: Admin token; valid body
  - **Steps**:
    1. Call payout export with valid body
  - **Expected Response**: Status 200, file stream with `Content-Type: text/csv` (or the XLSX mime) and `Content-Disposition: attachment; filename="payout report(for all){YYYYMMDD}-{YYYYMMDD}({YYYYMMDD})"` (⚠️ `for all` becomes the merchant name when `merchantId` is sent; no extension token is appended for payouts); Net column = total − commission (ad fees excluded)
  - **Business Rules**: BR-EXP-001, BR-EXP-002, BR-REV-016
  - **API**: `POST /api/v1/admin/revenue/payouts/export`
  - **Note**: Not yet tested — awaiting API contract spec implementation.

- [ ] **I-18**: Error response follows standard API format
  - **Precondition**: Any error scenario
  - **Steps**:
    1. Trigger an error (e.g., invalid rate)
  - **Expected Response**: JSON contains `{ statusCode, error, errorCode, message, timestamp, path }`
  - **Business Rules**: None
  - **API**: Any endpoint
  - **Note**: Not yet tested — awaiting API contract spec implementation.

- [ ] **I-19**: Admin endpoints return 403 for non-admin token
  - **Precondition**: Authenticated buyer or merchant token
  - **Steps**:
    1. Call any `/api/v1/admin/commission` or `/api/v1/admin/revenue` endpoint
  - **Expected Response**: Status 403, `{ statusCode: 403, error: "FORBIDDEN", errorCode: "RES_004", message: "Insufficient permissions" }` (⚠️ `RolesGuard` throws a plain `ForbiddenException`; the spec's `COMM_002` code is never emitted by the backend)
  - **Business Rules**: BR-COMM-006
  - **API**: All admin endpoints
  - **Note**: Not yet tested — awaiting API contract spec implementation.

- [ ] **I-20**: Admin endpoints return 401 without a token
  - **Precondition**: No Authorization header
  - **Steps**:
    1. Call any `/api/v1/admin/commission` or `/api/v1/admin/revenue` endpoint
  - **Expected Response**: Status 401 Unauthorized
  - **Business Rules**: BR-COMM-006
  - **API**: All admin endpoints
  - **Note**: Not yet tested — awaiting API contract spec implementation.

- [ ] **I-21**: `GET /api/v1/admin/revenue/payouts/merchants` — returns 200 with merchant options
  - **Precondition**: Admin token; at least one merchant with a payout
  - **Steps**:
    1. Call `GET /api/v1/admin/revenue/payouts/merchants`
  - **Expected Response**: Status 200, `{ data: [{ id, name }] }` — feeds the payout Merchant filter and the payout export merchant selector
  - **Business Rules**: None
  - **API**: `GET /api/v1/admin/revenue/payouts/merchants`
  - **Note**: Not yet tested — awaiting API contract spec implementation.

- [ ] **I-22**: `POST /api/v1/admin/revenue/payouts/:id/review` — returns 200 with payout status
  - **Precondition**: Admin token; payout `pending` (and one already processed)
  - **Steps**:
    1. Call the review endpoint for a `pending` payout
    2. Call it again for a non-pending payout
  - **Expected Response**: Status 200, `{ data: { payoutId, status } }`; pending payouts transition `pending` → `processing` with audit event `PAYOUT_REVIEWED`; non-pending payouts return their current status unchanged; 404 when the payout does not exist
  - **Business Rules**: BR-REV-005, BR-COMM-007
  - **API**: `POST /api/v1/admin/revenue/payouts/:id/review`
  - **Note**: Not yet tested — awaiting API contract spec implementation.

- [ ] **I-23**: `DELETE /api/v1/admin/revenue/payouts` — returns 200 / 409 / 404
  - **Precondition**: Admin token; body `{ payoutIds: ["<uuid>", ...] }`
  - **Steps**:
    1. Call delete with eligible payout IDs (status `completed`, at least three months old)
    2. Call delete with an ineligible payout ID
    3. Call delete with an unknown payout ID, and with an empty array
  - **Expected Response**: (1) Status 200, `{ data: { payoutIds, deleted: true } }` with one `PAYOUT_DELETED` audit entry per payout; (2) Status 409, message "These payouts cannot be deleted: …. Each payout must be completed and at least three months old."; (3) Status 404 for unknown IDs, 400 for an empty array
  - **Business Rules**: BR-COMM-007
  - **API**: `DELETE /api/v1/admin/revenue/payouts`
  - **Note**: Not yet tested — awaiting API contract spec implementation.

---

## Sign-Off

| Item | Status |
|------|--------|
| Test scenarios defined (N, A, B, I) | ☑️ |
| E2E tests implemented | ☐ |
| PCL auto-update verified | ☐ |
| Next review date | 2026-10-31 |
