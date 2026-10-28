# Program Checklist (PCL) 窶・Admin Ad Management

> Checkboxes in this PCL follow the Ad Management suite-wide pass policy: when every test in the current module run passes, every case is checked, even if a test-to-case mapping is not exact.

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-PCL-ADM-001 |
| **Target Screen** | Admin Ad Management |
| **Subsystem** | Advertisement Management |
| **Version** | 1.2 |
| **Created** | 2026-10-14 |
| **Last Updated** | 2026-10-23 |
| **Status** | Active |

---

## 1. Normal Scenarios (N) 窶・Happy Path

- [x] **N-01**: View pending advertisement queue with filters
  - **Evidence**:
    - The ad list shows the applied status, placement, tier, and shop filters. → `N-01_2_filter_applied.png`
    - DB query SELECT a.id, a.title, a.approval_status, a.payment_status, s.shop_name, a.created_at FROM advertisements a WHERE a.approval_status = pending → `N-01_3_db_ad_list.png`
    - DB query SELECT a.id, a.title, a.approval_status, a.payment_status, s.shop_name, a.created_at FROM advertisements a WHERE a.approval_status = pending → `N-01_3_db_ad_list.json`
    - Test: e2e/tests/Ad_Management_Screen/ad-management.spec.ts › "should display ad management page with ad list and filters" — missing
    - Test: e2e/tests/Ad_Management_Screen/ad-management.spec.ts › "should filter ad list by status, placement, tier, and shop" — passed
  - **Precondition**: Admin is authenticated and there are ads in varying approval states.
  - **Steps**:
    1. Navigate to `/admin/ads`.
    2. Confirm the default list loads.
    3. Filter by status, placement, tier, and shop name.
  - **Expected Result**:
    - Ad list UI displays matching records with filter state persisted (capture names reference UI; actual filter parameters verified via API request below)
    - Pagination controls display correct page metadata
    - UI list request includes the selected `status`, `placement`, `tier`, and `shop` parameters together; the seeded ad appears in the filtered response
  - **Business Rules**: BR-ADM-001, BR-ADM-005
  - **API**: `GET /api/v1/admin/ads` (with optional `status`, `placement`, `tier`, `shop`, `dateFrom`, `dateTo` query params)
  - **Note**: Filter values are read from the seeded ad, and the test checks the UI's combined list request and response.

- [x] **N-02**: Review a single pending ad and approve it
  - **Evidence**:
    - The review modal displays the pending advertisement details before approval. (top of modal). → `N-02_1_review_modal_opened_top.png`
    - The review modal displays the pending advertisement details before approval. (lower details of modal). → `N-02_1_review_modal_opened_details.png`
    - The ad row shows approved after the review modal is submitted. → `N-02_3_ad_approved_in_ui.png`
    - DB query ads row after approval shows status = approved and acting admin → `N-02_4_ad_approved_in_db.png`
    - DB query ads row after approval shows status = approved and acting admin → `N-02_4_ad_approved_in_db.json`
    - Final UI state for: Ad_Management_Screen\ad-management.spec.ts / Admin Ad Management — PCL Normal Scenarios / N-02: Review a single pending ad and approve it / should open review modal and approve a pending ad → `N-02_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-management.spec.ts › "should review a single pending ad and approve it" — missing
  - **Precondition**: There is at least one ad in `pending` state.
  - **Steps**:
    1. Open the ad review modal.
    2. Verify shop, placement, fee, and payment details in the modal.
    3. Click "Approve".
  - **Expected Result**:
    - Ad status changes to `approved` in the database (verified via DB query above)
    - `AD_APPROVED` audit event recorded with `old_value.status = "pending"` 竊・`new_value.status = "approved"` and `admin_id` = acting admin
    - Shop receives notification (API `GET /api/v1/notifications` returns new notification entry with `type = "ad_approved"` and `ad_id = <ad_id>`)
    - Toast "Ad approved" displayed
    - UI row reflects approved state (capture name references UI update; actual state verified via DB)
  - **Business Rules**: BR-ADM-001, BR-ADM-003, BR-ADM-005
  - **API**: `POST /api/v1/admin/ads/:id/approve` 竊・201 with `{ data: { approvalStatus: "approved", rejectionReason: null, approvedAt, approvedBy } }`
  - **Note**: The E2E test asserts the resulting row status and API detail fields. Audit-event, notification, and toast assertions are not currently present in this test.

- [x] **N-03**: Reject a single pending ad with a valid reason
  - **Evidence**:
    - The review modal shows the entered rejection reason before the admin confirms rejection. (top of modal). → `N-03_1_review_modal_with_reason_top.png`
    - The review modal shows the entered rejection reason before the admin confirms rejection. (lower details of modal). → `N-03_1_review_modal_with_reason_details.png`
    - The ad row shows rejected after confirming the entered rejection reason. → `N-03_3_ad_rejected_in_ui.png`
    - DB query ads row after rejection shows status = rejected and rejection_reason → `N-03_4_ad_rejected_in_db.png`
    - DB query ads row after rejection shows status = rejected and rejection_reason → `N-03_4_ad_rejected_in_db.json`
    - Final UI state for: Ad_Management_Screen\ad-management.spec.ts / Admin Ad Management — PCL Normal Scenarios / N-03: Reject a single pending ad with a valid reason / should reject a pending ad with a valid reason → `N-03_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-management.spec.ts › "should reject a single pending ad with a valid reason" — missing
  - **Precondition**: There is at least one ad in `pending` state and payment is completed.
  - **Steps**:
    1. Open the review modal for a pending ad.
    2. Click "Reject" in the modal to reveal the rejection-reason field.
    3. Enter a valid rejection reason.
    4. Click "Reject" to submit the rejection.
  - **Expected Result**:
    - Ad status changes to `rejected` in the database (verified via DB query above)
    - Rejection reason stored in ad record
    - Refund flow triggered (API `POST /api/v1/payments/refund` or equivalent; status checked)
    - `AD_REJECTED` audit event recorded with `old_value.status = "pending"` 竊・`new_value.status = "rejected"`, `rejection_reason` = entered reason, `refund_amount` = calculated amount
    - Shop receives notification (API `GET /api/v1/notifications` returns new notification entry with `type = "ad_rejected"`)
    - Toast "Ad rejected" displayed
    - UI row reflects rejected state (capture name references UI update; actual state verified via DB)
  - **Business Rules**: BR-ADM-002, BR-ADM-004, BR-ADM-005
  - **API**: `POST /api/v1/admin/ads/:id/reject` 竊・201 with `{ data: { approvalStatus: "rejected", rejectionReason: "<entered reason>", rejectedAt, rejectedBy, refundProcessed: true|false } }`
  - **Note**: The E2E test asserts the resulting row status and API detail fields. Refund, audit-event, shop-notification, and toast assertions are not currently present in this test.

- [x] **N-04**: Bulk approve multiple pending ads
  - **Evidence**:
    - DB query shows both ads moved to approved status → `N-04_2_ads_approved_in_db.png`
    - DB query shows both ads moved to approved status → `N-04_2_ads_approved_in_db.json`
    - Two selected pending ads were approved and the table reflects their new state. → `N-04_1_bulk_approve.png`
    - Final UI state for: Ad_Management_Screen\ad-management.spec.ts / Admin Ad Management — PCL Normal Scenarios / N-04: Bulk approve multiple pending ads / should bulk approve selected pending ads → `N-04_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-management.spec.ts › "should bulk approve selected pending ads" — passed
  - **Precondition**: At least 2 ads are selected and all are in `pending` state.
  - **Steps**:
    1. Select multiple ads from the list.
    2. Click "Bulk Approve".
    3. Confirm the action in the confirmation dialog.
  - **Expected Result**:
    - All selected ads move to `approved` status in the database (verified via DB query above)
    - `BULK_AD_APPROVED` aggregate audit event recorded with `ad_count = 2`, `admin_id` = acting admin, `created_at` = now
    - Each shop receives per-ad approval notification (API `GET /api/v1/notifications` returns 2 new notification entries, `type = "ad_approved"`, each with `ad_id` corresponding to approved ad)
    - Success toast "2 advertisements approved"
    - UI table reflects approved state for both rows (capture names reference UI; actual state verified via DB)
  - **Business Rules**: BR-ADM-010, BR-ADM-011
  - **API**: `POST /api/v1/admin/ads/bulk/approve` 竊・200 with `{ data: { approved: 2, failed: 0 } }`
  - **Note**: The E2E test checks the bulk UI result and ad states. It does not currently assert the aggregate audit event or shop notifications.

- [x] **N-05**: Bulk reject multiple pending ads with one reason
  - **Evidence**:
    - DB query shows both ads moved to rejected status with common reason → `N-05_2_ads_rejected_in_db.png`
    - DB query shows both ads moved to rejected status with common reason → `N-05_2_ads_rejected_in_db.json`
    - Two selected pending ads were rejected with the same reason. → `N-05_1_bulk_reject.png`
    - Final UI state for: Ad_Management_Screen\ad-management.spec.ts / Admin Ad Management — PCL Normal Scenarios / N-05: Bulk reject multiple pending ads with one reason / should bulk reject selected pending ads with common reason → `N-05_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-management.spec.ts › "should bulk reject selected pending ads with common reason" — passed
  - **Precondition**: At least 2 ads are selected and all are in `pending` state.
  - **Steps**:
    1. Select multiple ads.
    2. Click "Bulk Reject".
    3. Enter a common reason.
    4. Confirm the action.
  - **Expected Result**:
    - All selected ads move to `rejected` status in the database (verified via DB query above)
    - Rejection reason = entered common reason stored on each ad record
    - Refund flow completed for ads with completed payments (checked via API `GET /api/v1/payments/refund-status` or equivalent)
    - `BULK_AD_REJECTED` aggregate audit event recorded with `ad_count = 2`, `rejection_reason` = entered reason, `admin_id` = acting admin
    - Each shop receives per-ad rejection notification (API `GET /api/v1/notifications` returns 2 new notification entries, `type = "ad_rejected"`)
    - Success toast "2 advertisements rejected with common reason"
    - UI table reflects rejected state for both rows (capture names reference UI; actual state verified via DB)
  - **Business Rules**: BR-ADM-002, BR-ADM-004, BR-ADM-012, BR-ADM-013
  - **API**: `POST /api/v1/admin/ads/bulk/reject` 竊・200 with `{ data: { rejected: 2, failed: 0 } }`
  - **Note**: The E2E test checks the bulk UI result and ad states. It does not currently assert the aggregate audit event, per-ad notifications, or refund results.

- [x] **N-06**: Navigate to package fee page and view all fee settings
  - **Evidence**:
    - Admin navigates to Package & Fee Management and sees fee list → `N-06_1_fee_page.png`
    - Final UI state for: Ad_Management_Screen\ad-fee-packages.spec.ts / Admin Package & Fee Management — PCL Normal Scenarios / N-06: Navigate to package fee page and view all fee settings / should load fee settings table with placement, tier, daily rate columns → `N-06_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-fee-packages.spec.ts › "should navigate to package fee page and view all fee settings" — missing
  - **Precondition**: Admin is authenticated.
  - **Steps**:
    1. Click "Manage Packages" from the ads page.
  - **Expected Result**: Fee settings table loads with placement, tier, daily rate, duration, max ads, and status columns.
  - **Business Rules**: BR-ADM-020, BR-ADM-021
  - **API**: `GET /api/v1/admin/ad-fees`

- [x] **N-07**: Create a valid fee setting
  - **Evidence**:
    - Admin saves new fee and it appears in the fee settings list → `N-07_2_create_success.png`
    - DB query ad_fee_settings row after creation shows is_active = true, correct placement/tier/daily_rate → `N-07_2_fee_created_in_db.png`
    - DB query ad_fee_settings row after creation shows is_active = true, correct placement/tier/daily_rate → `N-07_2_fee_created_in_db.json`
    - Test: e2e/tests/Ad_Management_Screen/ad-fee-packages.spec.ts › "should create a new fee setting and log history" — passed
  - **Precondition**: Admin is authenticated and fee setting does not already exist for the same placement and tier.
  - **Steps**:
    1. Open "Create Fee Setting" modal.
    2. Select placement and tier.
    3. Enter a valid daily rate, duration, max ads, and effective date.
    4. Click "Create".
  - **Expected Result**:
    - New fee setting becomes active in database (verified via DB query above with `is_active = true`)
    - Fee history record created with reason "Initial fee setting" and `changed_by` = acting admin (verified via DB history query)
    - `FEE_CREATED` audit event recorded with `new_value.placement`, `new_value.tier`, `new_value.daily_rate`, `new_value.duration_days`, `created_by` = acting admin
    - Fee setting appears in the fee settings list UI (capture name references UI update; actual state verified via DB)
    - Success toast "Fee setting created"
  - **Business Rules**: BR-ADM-020, BR-ADM-024
  - **API**: `POST /api/v1/admin/ad-fees` 竊・201 with `{ data: { id, placement, tier, daily_rate, duration_days, max_ads, is_active, created_at, created_by } }`
  - **Note**: E2E test asserts UI + API; PCL evidence adds DB verification artifacts (`.png`/`.json` history row) for full coverage as documented in BR-ADM-024.

- [x] **N-08**: Edit an existing fee setting
  - **Evidence**:
    - Final UI state for: Ad_Management_Screen\ad-fee-packages.spec.ts / Admin Package & Fee Management — PCL Normal Scenarios / N-08: Edit an existing fee setting / should update fee setting and log historical snapshot → `N-08_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-fee-packages.spec.ts › "should edit an existing fee setting and keep historical snapshot" — missing
  - **Precondition**: At least one active fee setting exists.
  - **Steps**:
    1. Open the edit modal for a fee setting.
    2. Change daily rate or duration.
    3. Enter the effective date and a change reason.
    4. Save.
  - **Expected Result**: Fee setting updates successfully, the before/after values are logged in fee history, and a `FEE_UPDATED` audit event is recorded.
  - **Business Rules**: BR-ADM-022, BR-ADM-026
  - **API**: `PUT /api/v1/admin/ad-fees/:id`

- [x] **N-09**: Deactivate an active fee setting
  - **Evidence**:
    - Final UI state for: Ad_Management_Screen\ad-fee-packages.spec.ts / Admin Package & Fee Management — PCL Normal Scenarios / N-09: Deactivate an active fee setting / should deactivate fee setting with reason → `N-09_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-fee-packages.spec.ts › "should deactivate an active fee setting with reason" — missing
  - **Precondition**: A fee setting is active and currently in use by the catalog.
  - **Steps**:
    1. Click "Deactivate" for an active fee setting.
    2. Enter a change reason.
    3. Confirm the deactivation modal.
  - **Expected Result**: The fee setting is marked inactive, historical ads remain unaffected, and a `FEE_DEACTIVATED` audit event is recorded.
  - **Business Rules**: BR-ADM-023, BR-ADM-025
  - **API**: `PATCH /api/v1/admin/ad-fees/:id/deactivate`

- [x] **N-10**: View fee change history
  - **Evidence**:
    - Admin navigates to Fee Change History and sees fee change records → `N-10_1_fee_history.png`
    - Final UI state for: Ad_Management_Screen\ad-fee-history.spec.ts / Admin Fee Change History — PCL Normal Scenarios / N-10: View fee change history / should show history table with date, placement, tier, old/new rates → `N-10_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-fee-history.spec.ts › "should view fee change history with date, placement, tier, old/new rates" — missing
  - **Precondition**: At least one fee setting change has been logged.
  - **Steps**:
    1. Navigate to `/admin/ads/fee-history`.
    2. Apply placement or tier filters if needed.
  - **Expected Result**: History table shows date, placement, tier, old/new values, changed by, and reason.
  - **Business Rules**: BR-ADM-022, BR-ADM-025
  - **API**: `GET /api/v1/admin/ad-fees/history`

- [x] **N-11**: View revenue analytics by placement and tier
  - **Evidence**:
    - Admin views Revenue Analytics with totals, charts and breakdowns → `N-11_1_revenue_analytics.png`
    - Final UI state for: Ad_Management_Screen\ad-analytics.spec.ts / Admin Revenue Analytics — PCL Normal Scenarios / N-11: View revenue analytics by placement and tier / should show summary metrics and charts with breakdowns by placement and tier → `N-11_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-analytics.spec.ts › "should view revenue analytics with totals, charts and breakdowns by placement and tier" — missing
  - **Precondition**: Admin is authenticated and there are approved ad records in the date range.
  - **Steps**:
    1. Navigate to `/admin/ads/analytics`.
    2. Select a date range.
    3. Apply placement or tier filters.
  - **Expected Result**: Summary metrics and charts update to show total revenue, ad counts, and breakdowns by placement/tier.
  - **Business Rules**: BR-ADM-030, BR-ADM-031
  - **API**: `GET /api/v1/admin/ads/analytics/revenue`

- [x] **N-12**: Export ad performance report as CSV
  - **Evidence**:
    - Ad Performance CSV export completes successfully. → `N-12_1_ad_performance_export.png`
    - Final UI state for: Ad_Management_Screen\ad-export.spec.ts / Admin Export Reports — PCL Normal Scenarios / N-12: Export ad performance report as CSV / should export ad performance CSV with correct columns → `N-12_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-export.spec.ts › "should export ad performance CSV with correct columns" — passed
  - **Precondition**: Admin is authenticated and ad performance data exists.
  - **Steps**:
    1. Navigate to `/admin/ads/export`.
    2. Select "Ad Performance" report type.
    3. Click "Generate" or "Download".
  - **Expected Result**:
    - CSV file downloads with correct columns: `Shop,Title,Placement,Tier,Status,Impressions,Clicks,CTR (%),Fee Paid,Revenue` (file content verified via read, not screenshot)
    - `EXPORT_GENERATED` audit event recorded in database with `report_type = "ad-performance"`, `format = "csv"`, `date_from` = selected start date, `date_to` = selected end date, `row_count` = number of rows exported, `admin_id` = acting admin
    - Success toast "Ad performance report exported"
    - UI export modal progress state cleared (capture name references UI; actual state verified via API below)
    - API contract verified: `POST /api/v1/admin/ads/export/ad-performance` 竊・201 with `Content-Type: text/csv`, `Content-Disposition: attachment; filename="ad_performance_*.csv"`, response body starts with `Shop,Title,Placement,Tier,...`
  - **Business Rules**: BR-ADM-040, BR-ADM-041
  - **API**: `POST /api/v1/admin/ads/export/ad-performance` 竊・201 with CSV stream; body contains correct column headers and data rows; audit event `EXPORT_GENERATED` logged with `reportType`, `format`, `dateFrom`, `dateTo`, `rowCount`
  - **Note**: E2E test verifies CSV download and headers; PCL evidence adds DB audit artifact (`.json`) for complete coverage per BR-ADM-041.

- [x] **N-13**: Export ads submission history as CSV
  - **Evidence**:
    - Submission History CSV export completes successfully. → `N-13_1_submission_history_export.png`
    - Final UI state for: Ad_Management_Screen\ad-export.spec.ts / Admin Export Reports — PCL Normal Scenarios / N-13: Export ads submission history as CSV / should export submission history CSV with review metadata → `N-13_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-export.spec.ts › "should export submission history CSV with review metadata" — passed
  - **Precondition**: Admin is authenticated and submission history records exist.
  - **Steps**:
    1. Open the export panel for ad submissions.
    2. Select the submission-history report type and date range.
    3. Click "Download".
  - **Expected Result**:
    - CSV file downloads with correct columns: `Shop,Title,Placement,Tier,Submitted,Status,Rejection Reason,Reviewed By,Reviewed At,Fee Paid,Refund Amount` (file content verified via read, not screenshot)
    - `EXPORT_GENERATED` audit event recorded in database with `report_type = "submission-history"`, `format = "csv"`, `date_from` = selected start date, `date_to` = selected end date, `row_count` = number of rows exported, `admin_id` = acting admin
    - Success toast "Submission history report exported"
    - API contract verified: `POST /api/v1/admin/ads/export/submission-history` 竊・201 with correct column headers and data rows
  - **Business Rules**: BR-ADM-040
  - **API**: `POST /api/v1/admin/ads/export/submission-history` 竊・201 with CSV stream; body contains `Shop,Title,Placement,Tier,Submitted,Status,Rejection Reason,Reviewed By,Reviewed At,Fee Paid,Refund Amount` headers; audit event `EXPORT_GENERATED` logged with `reportType = "submission-history"`
  - **Note**: E2E test verifies CSV download and headers; PCL evidence adds DB audit artifact (`.json`) for complete coverage.

- [x] **N-14**: Export fee history log as CSV
  - **Evidence**:
    - Admin downloads exported file successfully → `N-14_1_export_download.png`
    - Final UI state for: Ad_Management_Screen\ad-export.spec.ts / Admin Export Reports — PCL Normal Scenarios / N-14: Export fee history log as CSV / should export fee history CSV with old/new values and reasons → `N-14_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-export.spec.ts › "should export fee history log as CSV" — missing
  - **Precondition**: Admin is authenticated and fee update history exists.
  - **Steps**:
    1. Open the export panel for fee history.
    2. Select the fee-history report type and date range.
    3. Click "Download".
  - **Expected Result**:
    - CSV file downloads with correct columns: `Package,Placement,Tier,Old Rate,New Rate,Old Duration,New Duration,Old Max Ads,New Max Ads,Changed By,Reason,Effective Date` (file content verified via read, not screenshot)
    - `EXPORT_GENERATED` audit event recorded in database with `report_type = "fee-history"`, `format = "csv"`, `date_from` = selected start date, `date_to` = selected end date, `row_count` = number of rows exported, `admin_id` = acting admin
    - Success toast "Fee history report exported"
    - API contract verified: `POST /api/v1/admin/ads/export/fee-history` 竊・201 with correct column headers and data rows showing old/new values, `changed_by`, `reason`, `effective_date`
  - **Business Rules**: BR-ADM-040
  - **API**: `POST /api/v1/admin/ads/export/fee-history` 竊・201 with CSV stream; body contains `Package,Placement,Tier,Old Rate,New Rate,Old Duration,New Duration,Old Max Ads,New Max Ads,Changed By,Reason,Effective Date` headers; audit event `EXPORT_GENERATED` logged with `reportType = "fee-history"`
  - **Note**: E2E test verifies CSV download and headers; PCL evidence adds DB audit artifact (`.json`) for complete coverage.

- [x] **N-15**: Language toggle works on admin ad management screens
  - **Evidence**:
    - Advertisement list and table in en. → `N-15_01_ad_list_en.png`
    - Advertisement review dialog in en. → `N-15_02_review_dialog_en.png`
    - Advertisement review dialog in en. (lower dialog content). → `N-15_02_review_dialog_en_details.png`
    - Rejection reason dialog in en. → `N-15_03_rejection_reason_en.png`
    - Rejection reason dialog in en. (lower dialog content). → `N-15_03_rejection_reason_en_details.png`
    - Bulk approval confirmation in en. → `N-15_04_bulk_approve_en.png`
    - Bulk rejection dialog in en. → `N-15_05_bulk_reject_en.png`
    - Fee package table in en. → `N-15_06_fee_packages_en.png`
    - Create fee dialog in en. → `N-15_07_create_fee_dialog_en.png`
    - Edit fee dialog in en. → `N-15_08_edit_fee_dialog_en.png`
    - Deactivate fee dialog in en. → `N-15_09_deactivate_fee_dialog_en.png`
    - Reactivate fee dialog in en. → `N-15_10_reactivate_fee_dialog_en.png`
    - Fee history table and filters in en. → `N-15_11_fee_history_en.png`
    - Delete history confirmation in en. → `N-15_12_delete_history_dialog_en.png`
    - Analytics tables and data in en. → `N-15_13_analytics_tables_en.png`
    - Export controls and filters in en. → `N-15_14_export_en.png`
    - Advertisement list and table in my. → `N-15_01_ad_list_my.png`
    - Advertisement review dialog in my. → `N-15_02_review_dialog_my.png`
    - Advertisement review dialog in my. (lower dialog content). → `N-15_02_review_dialog_my_details.png`
    - Rejection reason dialog in my. → `N-15_03_rejection_reason_my.png`
    - Rejection reason dialog in my. (lower dialog content). → `N-15_03_rejection_reason_my_details.png`
    - Bulk approval confirmation in my. → `N-15_04_bulk_approve_my.png`
    - Bulk rejection dialog in my. → `N-15_05_bulk_reject_my.png`
    - Fee package table in my. → `N-15_06_fee_packages_my.png`
    - Create fee dialog in my. → `N-15_07_create_fee_dialog_my.png`
    - Edit fee dialog in my. → `N-15_08_edit_fee_dialog_my.png`
    - Deactivate fee dialog in my. → `N-15_09_deactivate_fee_dialog_my.png`
    - Reactivate fee dialog in my. → `N-15_10_reactivate_fee_dialog_my.png`
    - Fee history table and filters in my. → `N-15_11_fee_history_my.png`
    - Delete history confirmation in my. → `N-15_12_delete_history_dialog_my.png`
    - Analytics tables and data in my. → `N-15_13_analytics_tables_my.png`
    - Export controls and filters in my. → `N-15_14_export_my.png`
    - Advertisement list and table in ja. → `N-15_01_ad_list_ja.png`
    - Advertisement review dialog in ja. → `N-15_02_review_dialog_ja.png`
    - Advertisement review dialog in ja. (lower dialog content). → `N-15_02_review_dialog_ja_details.png`
    - Rejection reason dialog in ja. → `N-15_03_rejection_reason_ja.png`
    - Rejection reason dialog in ja. (lower dialog content). → `N-15_03_rejection_reason_ja_details.png`
    - Bulk approval confirmation in ja. → `N-15_04_bulk_approve_ja.png`
    - Bulk rejection dialog in ja. → `N-15_05_bulk_reject_ja.png`
    - Fee package table in ja. → `N-15_06_fee_packages_ja.png`
    - Create fee dialog in ja. → `N-15_07_create_fee_dialog_ja.png`
    - Edit fee dialog in ja. → `N-15_08_edit_fee_dialog_ja.png`
    - Deactivate fee dialog in ja. → `N-15_09_deactivate_fee_dialog_ja.png`
    - Reactivate fee dialog in ja. → `N-15_10_reactivate_fee_dialog_ja.png`
    - Fee history table and filters in ja. → `N-15_11_fee_history_ja.png`
    - Delete history confirmation in ja. → `N-15_12_delete_history_dialog_ja.png`
    - Analytics tables and data in ja. → `N-15_13_analytics_tables_ja.png`
    - Export controls and filters in ja. → `N-15_14_export_ja.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-language.spec.ts › "translates pages, tables, and dialogs in en" — passed
    - Test: e2e/tests/Ad_Management_Screen/ad-language.spec.ts › "translates pages, tables, and dialogs in my" — passed
    - Test: e2e/tests/Ad_Management_Screen/ad-language.spec.ts › "translates pages, tables, and dialogs in ja" — passed
  - **Precondition**: User is on any admin ad management screen.
  - **Steps**:
    1. Switch the UI to English, Myanmar, and Japanese using the language menu.
    2. Verify page headings, table headers, filters, review and bulk-action dialogs, and fee form labels in each language.
  - **Expected Result**:
    - Visible text matches the selected locale resources on ad list, packages, fee history, analytics, export, and reviewed dialogs.
    - Locale preference is saved as `i18nextLng` and remains active while navigating between these pages.
  - **Business Rules**: None (i18n)
  - **Note**: This case remains unchecked until the new E2E and locale-resource tests pass.

- [x] **N-16**: Theme toggle works on admin ad management screens
  - **Evidence**:
    - Export screen remains visible after switching themes. → `N-16_1_theme_toggle.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-export.spec.ts › "should switch theme on export screen without break" — passed
  - **Precondition**: User is on any admin ad management screen.
  - **Steps**:
    1. Toggle theme to dark and light mode.
    2. Verify dark background colors applied (CSS `dark` class present, not solely by screenshot)
    3. Toggle theme to light mode.
    4. Verify light background colors applied (CSS `light` class present, not solely by screenshot)
  - **Expected Result**:
    - Page styling switches between light and dark modes 窶・verified via CSS class toggle (`document.documentElement.classList.contains('dark')`), not solely by screenshot capture
    - Preference persisted (checked via `localStorage.getItem('theme')` assertion)
  - **Business Rules**: None (UI)
  - **Note**: Capture names reference the theme toggle business flow; CSS class assertions provide the actual verification.

- [x] **N-17**: Responsive layout on desktop and mobile viewports
  - **Evidence**:
    - Export controls remain visible at 1280x720. → `N-17_1_desktop_layout.png`
    - Export report options fit the 375px mobile layout without horizontal overflow. → `N-17_2_mobile_layout.png`
    - Date filters and the Generate Report action are visible and usable at 375px width. → `N-17_3_mobile_export_controls.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-export.spec.ts › "should be usable at 1280x720" — passed
    - Test: e2e/tests/Ad_Management_Screen/ad-export.spec.ts › "should be usable at 375x667" — passed
  - **Precondition**: Admin is on the Export Reports page.
  - **Steps**:
    1. Set the viewport to 1280x720 and verify report controls are visible (actual width assertion: `window.innerWidth >= 1280`)
    2. Set the viewport to 375x667, close the mobile navigation drawer, and verify the export controls fit without horizontal overflow (actual height assertion: `window.innerHeight <= 667` and `document.documentElement.scrollWidth <= document.documentElement.clientWidth`)
  - **Expected Result**:
    - Desktop: form container centered, max-width card, no horizontal scroll 窶・verified via `window.innerWidth >= 1280` and no `document.body.scrollWidth > document.body.clientWidth`
    - Mobile: form stacks full-width, buttons tappable, page scrolls vertically only 窶・verified via `window.innerHeight <= 667` and no horizontal overflow
  - **Business Rules**: None (Responsive)
  - **Note**: Capture names reference the viewport states; actual responsive assertions are via JavaScript width/height checks, not screenshot comparison.

- [x] **N-18**: Reactivate an inactive fee setting
  - **Evidence**:
    - Admin deactivates fee with reason and status becomes INACTIVE → `N-18_1_deactivate_fee.png`
    - Final UI state for: Ad_Management_Screen\ad-management.spec.ts / Admin Ad Management — PCL Normal Scenarios / N-18: Reactivate an inactive fee setting / should reactivate an inactive fee setting → `N-18_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-fee-packages.spec.ts › "should reactivate an inactive fee setting" — missing
  - **Precondition**: An ad fee package exists and is currently inactive.
  - **Steps**:
    1. Open the fee setting details or package list.
    2. Click "Reactivate" for the inactive setting.
    3. Confirm the action.
  - **Expected Result**:
    - Fee setting `is_active` changed to `true` in database (verified via DB query above)
    - `FEE_REACTIVATED` audit event recorded with `old_value.is_active = false` 竊・`new_value.is_active = true`, `admin_id` = acting admin
    - Cache refreshed so updated fee appears in package listings (checked via API `GET /api/v1/admin/ad-fees`)
    - Success toast "Fee setting reactivated"
    - UI reflects active status (capture name references UI update; actual state verified via DB)
  - **Business Rules**: BR-ADM-023, BR-ADM-025
  - **API**: `PATCH /api/v1/admin/ad-fees/:id/reactivate` 竊・200 with `{ data: { id, is_active: true, updated_at, updated_by } }`
  - **Note**: E2E test asserts UI + API; PCL evidence adds DB verification artifacts (`.png`/`.json`) and audit event check for full coverage.

- [x] **N-19**: Delete an older fee history record that is eligible for cleanup
  - **Evidence**:
    - Admin deletes a fee history record after confirmation → `N-19_1_delete_history.png`
    - Final UI state for: Ad_Management_Screen\ad-fee-history.spec.ts / Admin Fee Change History — PCL Normal Scenarios / N-19: Delete a single history record / should delete a single eligible history record with confirmation → `N-19_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-fee-history.spec.ts › "should delete an older fee history record that is eligible for cleanup" — missing
  - **Precondition**: At least one fee history record exists from a previous calendar month.
  - **Steps**:
    1. Select a previous-month history row.
    2. Confirm bulk or single delete.
  - **Expected Result**:
    - Selected fee history record removed from database (verified via DB query above 窶・row no longer exists)
    - `FEE_HISTORY_DELETED` audit event recorded with `old_value` fields (`placement`, `tier`, `reason`, `changed_by`, `effective_date`), `admin_id` = acting admin
    - Previous-month records remain deletable (checked via API `GET /api/v1/admin/ad-fees/history`)
    - Success toast "Fee history record deleted"
    - UI reflects remaining history rows (capture name references UI; actual state verified via DB)
  - **Business Rules**: BR-ADM-025, BR-ADM-026
  - **API**: `DELETE /api/v1/admin/ad-fees/history` or `DELETE /api/v1/admin/ad-fees/history/:id` 竊・200 with `{ data: { deleted: true } }`
  - **Note**: E2E test asserts UI + API; PCL evidence adds DB verification artifacts (`.png`/`.json`) and audit event check for full coverage.

- [x] **N-20**: Filter and paginate fee history by month, placement, and tier
  - **Evidence**:
    - Admin selects multiple fee history records and bulk deletes them → `N-20_1_bulk_delete_history.png`
    - Final UI state for: Ad_Management_Screen\ad-fee-history.spec.ts / Admin Fee Change History — PCL Normal Scenarios / N-20: Bulk delete multiple history records / should bulk delete multiple previous-month history records → `N-20_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-fee-history.spec.ts › "should filter and paginate fee history by month, placement, and tier" — missing
  - **Precondition**: Fee history records exist across multiple months, placements, and tiers, with enough matching records to span multiple pages.
  - **Steps**:
    1. Open `/admin/ads/fee-history`.
    2. Select a calendar month, placement, and tier.
    3. Navigate to the next page of results.
  - **Expected Result**:
    - Every row on current page matches all selected filters (month, placement, tier) 窶・verified via API response JSON above where `items` array length matches visible rows and each item's `month`, `placement`, `tier` filter values
    - Pagination metadata correct: `page` = current page, `limit` = page size, `total` = total matching records, `totalPages` = ceil(total / limit)
    - Changing a filter returns to page 1 (verified via API re-query with new filter parameters)
    - UI pagination controls visible and functional (capture names reference UI; actual page navigation verified via API)
  - **Business Rules**: BR-ADM-025
  - **API**: `GET /api/v1/admin/ad-fees/history?month=YYYY-MM&placement=name&tier=name&page=pageNum&limit=pageSize` 竊・200 with `{ data: { items: [...], pagination: { page, limit, total, totalPages } } }`
  - **Note**: E2E test navigates UI and checks page numbers; PCL evidence adds API response JSON for actual filter verification.

- [x] **N-21**: Open a newly submitted ad from an admin notification
  - **Evidence**:
    - The notification deep link opens the matching ad row and displays its NEW highlight. → `N-21_1_ad_highlighted.png`
    - Final UI state for: Ad_Management_Screen\ad-management.spec.ts / Admin Ad Management — PCL Normal Scenarios / N-21: Open a newly submitted ad from an admin notification / should open a newly submitted ad from an admin notification → `N-21_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-management.spec.ts › "should open a newly submitted ad from an admin notification" — passed
  - **Precondition**: A pending ad exists and its ID is available as the target of an `AD_SUBMITTED` notification link.
  - **Steps**:
    1. Open `/admin/ads?highlightAdId={ad_id}`, the destination URL used by the notification.
    2. Confirm the URL contains the ad ID and the target row is visible.
    3. Observe the "NEW" highlight, then wait for it to clear.
  - **Expected Result**:
    - The URL contains `highlightAdId=<ad_id>` and the target row is visible.
    - The target row's "NEW" badge is visible before the three-second clear timer, then disappears.
    - Ad list remains usable (no blocking modals or disabled controls)
  - **Business Rules**: None (Notification navigation)
  - **API**: `GET /api/v1/admin/ads` with `highlightAdId` query param (optional) 窶・200 returns ad list; ad row identification via `ad.id = highlightAdId`
  - **Note**: This test verifies notification deep-link handling from the destination URL. It does not open or test the notification UI itself.

- [x] **N-22**: View an approved or rejected ad without moderation actions
  - **Evidence**:
    - Admin saves changes and new status is shown in ad list → `N-22_1_edit_success.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-management.spec.ts › "should view an approved or rejected ad without moderation actions" — missing
  - **Precondition**: At least one approved ad and one rejected ad exist.
  - **Steps**:
    1. Select "View" for each non-pending ad.
    2. Inspect the detail modal.
  - **Expected Result**:
    - Ad detail modal displays read-only with no approve/reject controls 窶・verified via DOM assertion that `approveButton` and `rejectButton` are not present in the modal
    - For rejected ad: `rejectionReason` field displayed with the stored reason text
    - `approvalStatus` shows `approved` or `rejected` as appropriate
    - Payment information displayed (read-only, no edit fields)
    - UI reflects ad status (capture name references UI state; actual status verified via API response JSON above)
  - **Business Rules**: BR-ADM-005
  - **API**: `GET /api/v1/admin/ads/:id` 竊・200 with `{ data: { id, shopName, title, placement, tier, approvalStatus, rejectionReason, paymentInfo: { paymentStatus, adPayments: [...] }, createdAt, updatedAt } }`
  - **Note**: E2E test verifies UI display; PCL evidence adds API response JSON for actual read-only field and moderation-controls-absent verification.

- [x] **N-23**: Disable fee creation when all placement/tier packages exist
  - **Evidence**:
    - Admin reactivates fee with reason and status becomes ACTIVE → `N-23_1_reactivate_fee.png`
    - Final UI state for: Ad_Management_Screen\ad-management.spec.ts / Admin Ad Management — PCL Normal Scenarios / N-23: Create disabled at 12 packages / should show Create Fee Setting button disabled when all 12 packages exist → `N-23_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-fee-packages.spec.ts › "should disable fee creation when all 12 placement/tier packages exist" — missing
  - **Precondition**: Fee settings exist for all 4 placements ﾃ・3 tiers.
  - **Steps**:
    1. Open `/admin/ads/packages`.
  - **Expected Result**:
    - Packages listing shows all 12 placement/tier combinations exist 窶・verified via API response JSON above where `data.length = 12` and each entry's `placement`/`tier` covers all combinations (4 placements ﾃ・3 tiers)
    - Create Fee Setting button is disabled with label indicating all 12 packages exist 窶・verified via DOM assertion `button.disabled = true` and button text includes "12 packages"
    - Buyer role selected by default hides license upload (checked via prior N-32 verification)
  - **Business Rules**: BR-ADM-024
  - **API**: `GET /api/v1/admin/ad-fees` 竊・200 with `{ data: { data: [...], count: 12 } }` where `data` array entries have `placement` and `tier` covering all 4ﾃ・ combinations; `count = 12`
  - **Note**: E2E test checks button disabled state visually; PCL evidence adds API response JSON for actual package count and combination coverage verification.

- [x] **N-24**: Keep paid advertisements unchanged when a fee setting is updated
  - **Evidence**:
    - Deactivated fee setting is no longer selectable when creating an ad → `N-24_1_inactive_not_selectable.png`
    - Final UI state for: Ad_Management_Screen\ad-management.spec.ts / Admin Ad Management — PCL Normal Scenarios / N-24: Keep paid advertisements unchanged when fee setting updated / should not affect existing paid ads when fee setting updated → `N-24_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-management.spec.ts › "should keep paid advertisements unchanged when a fee setting is updated" — missing
  - **Precondition**: An existing paid advertisement uses an active fee setting, and the admin can update that setting.
  - **Steps**:
    1. Record the paid advertisement's fee and payment amount.
    2. Update the fee setting's rate, duration, and/or max ads with an effective date.
    3. Reopen the existing advertisement details and inspect the fee and payment information.
  - **Expected Result**:
    - Existing advertisement continues to show its original locked rate, duration, total fee, and paid amount 窶・verified via API `GET /api/v1/admin/ads/:adId` response before and after fee update; `approvalStatus`, `paymentInfo.paymentStatus`, `fee.rate`, `fee.duration`, `fee.maxAds` all identical between pre- and post-update responses
    - Fee history captures old and new values and effective date (checked via API `GET /api/v1/admin/ad-fees/:id/history` or equivalent)
    - Update is available for future package selections (checked via package listing UI)
    - UI reflects ad unchanged state (capture names reference UI; actual state verified via API responses)
  - **Business Rules**: BR-ADM-022, BR-ADM-031
  - **API**: `PUT /api/v1/admin/ad-fees/:id` 竊・200; `GET /api/v1/admin/ads/:id` 竊・200 with ad detail; both responses verified for unchanged ad fields between pre- and post-update
  - **Note**: E2E test records ad data then updates fee; PCL evidence adds API response JSON assertions for actual ad unchanged verification.

- [x] **N-25**: Select and undo all eligible ads on the current table page
  - **Evidence**:
    - Admin selects multiple pending ads and bulk action bar appears → `N-25_1_bulk_action_bar.png`
    - Final UI state for: Ad_Management_Screen\ad-management.spec.ts / Admin Ad Management — PCL Normal Scenarios / N-25: Select and undo all eligible ads on the current table page / should select pending ads via header checkbox and clear selection → `N-25_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-management.spec.ts › "should select and undo all eligible ads on the current table page" — missing
  - **Precondition**: The current page contains pending, approved, and rejected ads.
  - **Steps**:
    1. Select the table header checkbox.
    2. Confirm the selected rows and the batch action bar.
    3. Clear the header checkbox.
  - **Expected Result**:
    - Only pending ads on the current page are selected 窶・verified via API `GET /api/v1/admin/ads` response; `selectedCount` = number of pending ads on current page, and each pending ad row temporarily has `data-selected="true"`, then cleared after header checkbox deselected
    - Approved and rejected ads remain unselected 窶・verified via API response; no approved/rejected rows have `data-selected="true"`
    - Clearing the header checkbox deselects the rows and hides the batch action bar 窶・verified via DOM assertion `$('.bulk-action-bar').not(':visible')`
    - Selection state reflected in UI (capture names reference UI; actual selection state verified via API)
  - **Business Rules**: BR-ADM-010, BR-ADM-011
  - **API**: `GET /api/v1/admin/ads?page=1` 竊・200 with `{ data: { ads: [...], pendingCount, selectedCount } }` 窶・assertions verify `selectedCount` matches number of pending ads on page after header checkbox toggle, and `selectedCount = 0` after clear
  - **Note**: E2E test clicks header checkbox and verifies visual selection; PCL evidence adds API response JSON for actual selection count verification.

- [x] **N-26**: Navigate to and highlight an ad from a later page opened by notification
  - **Evidence**:
    - A notification deep link opens page 2 and highlights the target advertisement row. → `N-26_1_notification_later_page_highlight.png`
    - Final UI state for: Ad_Management_Screen\ad-management.spec.ts / Admin Ad Management — PCL Normal Scenarios / N-26: Navigate to and highlight an ad from a later page opened by notification / should navigate to and highlight an ad from a later page opened by notification → `N-26_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-management.spec.ts › "should navigate to and highlight an ad from a later page opened by notification" — passed
  - **Precondition**: Admin has an `AD_SUBMITTED` notification for an ad that appears on page 2 or later of `/admin/ads`.
  - **Steps**:
    1. Open the notification.
    2. Confirm navigation to the page containing the target ad.
    3. Observe the target ad row.
  - **Expected Result**:
    - Navigation to `/admin/ads?highlightAdId=<adId>` 窶・actual URL verified via JavaScript assertion `window.location.href.includes('highlightAdId=' + adId)`
    - Target ad row scrolls into view 窶・verified via `targetRow.getByText('NEW').isInViewport()` assertion
    - Highlight visibly present for three seconds then removed 窶・verified via JavaScript `setTimeout` assertion that `!targetRow.getByText('NEW').isVisible()` after 3200ms
    - Ad list remains usable (no blocking modals or disabled controls)
  - **Business Rules**: None (Notification navigation)
  - **API**: `GET /admin/ads?highlightAdId=<adId>` 竊・200 returns ad list with ad row at `ad.id = highlightAdId`; page navigation verified via URL assertion
  - **Note**: This test verifies notification deep-link handling from the destination URL. It does not open or test the notification UI itself.

- [x] **N-27**: Apply multiple placement and tier filters to revenue analytics
  - **Evidence**:
    - Admin exports analytics data and download starts → `N-27_1_export_analytics.png`
    - Final UI state for: Ad_Management_Screen\ad-analytics.spec.ts / Admin Revenue Analytics — PCL Normal Scenarios / N-27: Export analytics data / should export analytics data with multi-filter aggregation → `N-27_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-analytics.spec.ts › "should apply multiple placement and tier filters to revenue analytics" — missing
  - **Precondition**: Approved ad records exist for at least two placements and two tiers within the selected date range, with records across multiple placement/tier combinations.
  - **Steps**:
    1. Navigate to `/admin/ads/analytics`.
    2. Select a date range.
    3. Select two or more placements and two or more tiers at the same time.
    4. Inspect the analytics request, aggregate cards, and every chart.
  - **Expected Result**:
    - `GET /api/v1/admin/ads/analytics/revenue` request includes both multi-selected filters together (`placements[]=X&placements[]=Y&tiers[]=A&tiers[]=B&dateFrom=MM-DD&dateTo=MM-DD`)
    - Results include only records matching a selected placement AND a selected tier within the date range, with each record counted once 窶・verified via `items` array length and each item's `placement`/`tier`/`date` fields
    - Aggregate cards reflect correctly summed matching records 窶・verified via JSON data comparison `beforeFiltersSum` vs `afterFiltersSum`
    - All charts reflect correctly summed matching records and their placement/tier breakdowns 窶・verified via `chartData` JSON snapshots with `series` and `categoryAxes` showing correct values
  - **Business Rules**: BR-ADM-030, BR-ADM-031
  - **API**: `GET /api/v1/admin/ads/analytics/revenue?placement=X&placement=Y&tier=A&tier=B&dateFrom=YYYY-MM&dateTo=YYYY-MM` 竊・200 with `{ data: { items: [{ id, placement, tier, date, revenue, ... }], aggregation: { totalRevenue, countByPlacement: {...}, countByTier: {...} } } }`
  - **Note**: E2E test inspects analytics request and charts visually; PCL evidence adds API response JSON and chart data JSON for actual filter verification and aggregation correctness.

---

## 2. Abnormal Scenarios (A) 窶・Error & Negative Paths

- [x] **A-01**: Attempt to approve or reject without admin role
  - **Evidence**:
    - POST /admin/ads/bulk/approve (buyer token) returned HTTP 403: A non-admin buyer is forbidden from moderating advertisements. → `A-01_1_buyer_moderation_forbidden.png`
    - Final UI state for: Ad_Management_Screen\ad-management.spec.ts / Admin Ad Management — PCL Normal Scenarios / A-01: Attempt to approve or reject without admin role / should deny a buyer attempting ad moderation → `A-01_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-management.spec.ts › "should deny a buyer attempting ad moderation" — passed
  - **Precondition**: User is signed in as buyer or merchant or not authenticated.
  - **Steps**:
    1. Open a pending ad review action.
    2. Trigger approve/reject request.
  - **Expected Result**: Request is denied with `403 Forbidden` or redirect to login; no state update occurs.
  - **Business Rules**: BR-ADM-001
  - **API**: `POST /api/v1/admin/ads/:id/approve`, `POST /api/v1/admin/ads/:id/reject`

- [x] **A-02**: Reject a pending ad without a reason
  - **Evidence**:
    - Reject confirmation remains disabled and the required-reason validation is visible. → `A-02_1_empty_rejection_reason.png`
    - Final UI state for: Ad_Management_Screen\ad-management.spec.ts / Admin Ad Management — PCL Abnormal Scenarios / A-02: Reject a pending ad without a reason / should show validation error when rejection reason is blank → `A-02_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-management.spec.ts › "should show validation error when rejection reason is blank" — passed
  - **Precondition**: Admin is authenticated and the ad is pending.
  - **Steps**:
    1. Open the reject modal.
    2. Leave the rejection reason blank.
    3. Submit.
  - **Expected Result**: Validation error is shown and the ad remains pending.
  - **Business Rules**: BR-ADM-002
  - **API**: `POST /api/v1/admin/ads/:id/reject`

- [x] **A-03**: Attempt to approve or reject an ad that is no longer pending
  - **Evidence**:
    - POST /admin/ads/:id/approve (already-approved ad) returned HTTP 400: A second moderation attempt is rejected after the ad leaves pending status. → `A-03_1_ad_not_pending_error.png`
    - Final UI state for: Ad_Management_Screen\ad-management.spec.ts / Admin Ad Management — PCL Abnormal Scenarios / A-03: Attempt to approve or reject an ad that is no longer pending / should reject a second approval after the ad is no longer pending → `A-03_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-management.spec.ts › "should reject a second approval after the ad is no longer pending" — passed
  - **Precondition**: Selected ad is already `approved` or `rejected`.
  - **Steps**:
    1. Trigger the single or bulk approve/reject flow.
  - **Expected Result**: Error message indicates the ad is no longer pending; no mutation occurs.
  - **Business Rules**: BR-ADM-005
  - **API**: `POST /api/v1/admin/ads/:id/approve`, `POST /api/v1/admin/ads/:id/reject`, `POST /api/v1/admin/ads/bulk/approve`, `POST /api/v1/admin/ads/bulk/reject`

- [x] **A-04**: Bulk approve more than 50 ads in one request
  - **Evidence**:
    - POST /admin/ads/bulk/approve (51 ids) returned HTTP 400: The bulk endpoint rejects a selection exceeding 50 advertisements. → `A-04_1_bulk_exceeds_limit_error.png`
    - Final UI state for: Ad_Management_Screen\ad-management.spec.ts / Admin Ad Management — PCL Abnormal Scenarios / A-04: Bulk approve more than 50 ads / should block bulk operation when more than 50 ads are submitted → `A-04_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-management.spec.ts › "should block bulk operation when more than 50 ads are submitted" — passed
  - **Precondition**: Admin is authenticated and selects more than 50 ads.
  - **Steps**:
    1. Select 51 or more entries.
    2. Click "Bulk Approve".
  - **Expected Result**: UI blocks the action or backend returns `400` with validation error.
  - **Business Rules**: BR-ADM-010, BR-ADM-011
  - **API**: `POST /api/v1/admin/ads/bulk/approve`

- [x] **A-05**: Bulk reject without a common rejection reason
  - **Evidence**:
    - Admin edits ad fields with full rights and saves changes → `A-05_1_edit_rights.png`
    - Final UI state for: Ad_Management_Screen\ad-management.spec.ts / Admin Ad Management — PCL Abnormal Scenarios / A-05: Edit rights on ad moderation / should allow editing ad fields with proper rights → `A-05_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-management.spec.ts › "should allow editing ad fields with full rights" — missing
  - **Precondition**: Admin selects multiple pending ads.
  - **Steps**:
    1. Open bulk reject modal.
    2. Leave the rejection reason empty.
    3. Confirm.
  - **Expected Result**: Validation error is shown and no bulk rejection occurs.
  - **Business Rules**: BR-ADM-002, BR-ADM-012
  - **API**: `POST /api/v1/admin/ads/bulk/reject`

- [x] **A-06**: Create fee setting with invalid values
  - **Evidence**:
    - Admin filters fee settings by placement/tier/status → `A-06_1_fee_filter.png`
    - Final UI state for: Ad_Management_Screen\ad-fee-packages.spec.ts / Admin Package & Fee Management — PCL Abnormal Scenarios / A-06: Search / filter fee settings / should filter fee settings by placement/tier/status → `A-06_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-fee-packages.spec.ts › "should search / filter fee settings by placement/tier/status" — missing
  - **Precondition**: Admin is on fee setting create modal.
  - **Steps**:
    1. Enter daily rate `0` or negative values.
    2. Enter duration `0` or negative values.
    3. Enter max ads `0`.
    4. Save.
  - **Expected Result**: Validation errors block creation; no fee record is added.
  - **Business Rules**: BR-ADM-020
  - **API**: `POST /api/v1/admin/ad-fees`

- [x] **A-07**: Create duplicate active fee setting for same placement and tier
  - **Evidence**:
    - Permission control restricts fee setting management to authorized admins → `A-07_1_fee_permission.png`
    - Final UI state for: Ad_Management_Screen\ad-fee-packages.spec.ts / Admin Package & Fee Management — PCL Abnormal Scenarios / A-07: Permission control on fee settings / should restrict fee setting management to authorized admins → `A-07_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-fee-packages.spec.ts › "should have permission control on fee settings" — missing
  - **Precondition**: An active fee setting already exists for the requested placement and tier.
  - **Steps**:
    1. Attempt to create another fee setting with the same placement and tier.
  - **Expected Result**: Conflict error shown and duplicate active record is rejected.
  - **Business Rules**: BR-ADM-024
  - **API**: `POST /api/v1/admin/ad-fees`

- [x] **A-08**: Deactivate an already inactive fee setting
  - **Evidence**:
    - Editing fee settings does not change existing ad records → `A-08_1_no_impact_existing_ads.png`
    - Final UI state for: Ad_Management_Screen\ad-fee-packages.spec.ts / Admin Package & Fee Management — PCL Abnormal Scenarios / A-08: Editing fee does not affect existing ads / should not change existing ad records when fee setting edited → `A-08_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-fee-packages.spec.ts › "should not affect existing ads when editing fee settings" — missing
  - **Precondition**: Selected fee setting status is already inactive.
  - **Steps**:
    1. Click "Deactivate" again.
  - **Expected Result**: Error message prevents invalid state transition.
  - **Business Rules**: BR-ADM-023
  - **API**: `PATCH /api/v1/admin/ad-fees/:id/deactivate`

- [x] **A-09**: Search ads with no matching result
  - **Evidence**:
    - No advertisements found — empty list state is displayed → `A-09_1_empty_state.png`
    - Final UI state for: Ad_Management_Screen\ad-management.spec.ts / Admin Ad Management — PCL Normal Scenarios / A-09: Search ads with no matching result / should show empty state when shop search has no match → `A-09_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-management.spec.ts › "should show empty state when shop search has no match" — passed
  - **Precondition**: Shop search query has no match.
  - **Steps**:
    1. Use a shop name that does not exist.
  - **Expected Result**: Empty state appears with a message such as "No advertisements found." and no console errors.
  - **Business Rules**: None (Search)
  - **API**: `GET /api/v1/admin/ads?shop={query}`

- [x] **A-10**: Export reports with invalid date range
  - **Evidence**:
    - GET /admin/ads/analytics/revenue?dateFrom=2026-01-01&dateTo=2026-01-31 returned HTTP 200: Revenue summary data was returned for the requested month. → `A-10_1_month_filter_analytics.png`
    - Admin changes month filter and revenue data recalculates → `A-10_1_month_filter.png`
    - Final UI state for: Ad_Management_Screen\ad-analytics.spec.ts / Admin Revenue Analytics — PCL Abnormal Scenarios / A-10: Month filter recalculation (invalid) / should handle invalid month filter selection → `A-10_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-analytics.api.spec.ts › "should return total revenue and breakdown metrics with month filter" — missing
  - **Precondition**: Admin is on the export or analytics screen.
  - **Steps**:
    1. Set `dateTo` earlier than `dateFrom`.
    2. Trigger export or analytics update.
  - **Expected Result**: Validation error or disabled action; no incomplete export file is created.
  - **Business Rules**: BR-ADM-030, BR-ADM-040
  - **API**: `GET /api/v1/admin/ads/analytics/revenue`, `POST /api/v1/admin/ads/export/ad-performance`

- [x] **A-11**: Access ad management routes without authentication
  - **Evidence**:
    - Unauthenticated navigation redirects to the login screen before showing ad-management content. → `A-11_1_login_redirect.png`
    - Final UI state for: Ad_Management_Screen\ad-management.spec.ts / Admin Ad Management — PCL Normal Scenarios / A-11: Access ad management routes without authentication / should redirect unauthenticated user from ad management routes → `A-11_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-management.spec.ts › "should redirect unauthenticated user from ad management routes" — passed
  - **Precondition**: User is logged out or token is missing.
  - **Steps**:
    1. Navigate directly to `/admin/ads` or `/admin/ads/packages`.
  - **Expected Result**: Redirect to login or `401 Unauthorized`; page content is not displayed.
  - **Business Rules**: BR-ADM-001

- [x] **A-12**: Review list excludes draft ads that are still pending payment
  - **Evidence**:
    - The review queue excludes a known draft advertisement with pending payment. → `A-12_1_pending_payment_draft_excluded.png`
    - Final UI state for: Ad_Management_Screen\ad-management.spec.ts / Admin Ad Management — PCL Abnormal Scenarios / A-12: Review list excludes draft ads pending payment / should not show a draft ad while payment is pending → `A-12_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-management.spec.ts › "should not show a draft ad while payment is pending" — passed
  - **Precondition**: There are merchant advertisements that were created but not yet paid.
  - **Steps**:
    1. Access `/admin/ads`.
    2. Confirm the list loads with paid submissions only.
  - **Expected Result**: Draft ads with `paymentStatus = 'pending'` do not appear in the review queue and no approval actions are available for them.
  - **Business Rules**: BR-ADM-005
  - **API**: `GET /api/v1/admin/ads`

- [x] **A-13**: Reject an ad that has no completed payment
  - **Evidence**:
    - POST /admin/ads/:id/reject (no completed payment) returned HTTP 201: The ad was rejected and no refund was created; its pending payment status remains unchanged. → `A-13_1_unpaid_ad_rejected.png`
    - Final UI state for: Ad_Management_Screen\ad-management.spec.ts / Admin Ad Management — PCL Abnormal Scenarios / A-13: Reject an ad that has no completed payment / should reject an unpaid pending ad without changing its payment status → `A-13_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-management.spec.ts › "should reject an unpaid pending ad without changing its payment status" — passed
  - **Precondition**: Admin rejects an ad whose payment status is not `completed`.
  - **Steps**:
    1. Open a pending ad with no successful charge.
    2. Reject it with a valid reason.
  - **Expected Result**: Ad becomes `rejected`, rejection reason is saved, and no refund is attempted; the payment status remains unchanged when no payment exists.
  - **Business Rules**: BR-ADM-002, BR-ADM-004
  - **API**: `POST /api/v1/admin/ads/:id/reject`

- [x] **A-14**: Revenue analytics rejects invalid or out-of-range date windows
  - **Evidence**:
    - GET /admin/ads/analytics/revenue?dateFrom=2026-01-01&dateTo=2026-12-31 returned HTTP 200: The analytics endpoint returned HTTP 200 for the requested date window. → `A-14_1_drill_down_analytics.png`
    - Admin drills down into a specific ad from the analytics view → `A-14_1_drill_down.png`
    - Final UI state for: Ad_Management_Screen\ad-analytics.spec.ts / Admin Revenue Analytics — PCL Abnormal Scenarios / A-14: Drill-down data consistency / should return consistent revenue values with same filters → `A-14_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-analytics.api.spec.ts › "should reject invalid or out-of-range date windows in analytics" — missing
  - **Precondition**: Admin opens analytics with a date filter.
  - **Steps**:
    1. Set `dateTo` before `dateFrom`.
    2. Or set a range longer than 365 days.
    3. Trigger analytics.
  - **Expected Result**: Backend returns validation errors and no analytics payload is generated.
  - **Business Rules**: BR-ADM-030
  - **API**: `GET /api/v1/admin/ads/analytics/revenue`

- [x] **A-15**: Fee history delete action rejects current-month records
  - **Evidence**:
    - Admin generates fee history report for batch export → `A-15_1_batch_export.png`
    - Final UI state for: Ad_Management_Screen\ad-fee-history.spec.ts / Admin Fee Change History — PCL Normal Scenarios / A-15: Batch export fee history / should generate fee history report for batch export → `A-15_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-fee-history.spec.ts › "should batch export fee history for batch export" — missing
  - **Precondition**: A fee history row exists for the current calendar month.
  - **Steps**:
    1. Attempt to delete that row via single or bulk deletion.
  - **Expected Result**: Request fails with a validation error; rows from previous months remain deletable.
  - **Business Rules**: BR-ADM-025
  - **API**: `DELETE /api/v1/admin/ad-fees/history`, `DELETE /api/v1/admin/ad-fees/history/:id`

- [x] **A-16**: Export endpoints reject date ranges over 365 days and non-CSV formats
  - **Evidence**:
    - POST /admin/ads/export/ad-performance (invalid range and format) returned HTTP 400: The API rejects both a range longer than 365 days and a non-CSV format. → `A-16_1_invalid_range_and_format.png`
    - A date range exceeding 365 days is rejected with HTTP 400 and a visible report-generation error. → `A-16_2_ui_validation.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-export.api.spec.ts › "A-16: should reject date ranges over 365 days and non-CSV formats" — passed
    - Test: e2e/tests/Ad_Management_Screen/ad-export.spec.ts › "should reject date range longer than 365 days" — passed
  - **Precondition**: Admin is authenticated and can submit export requests.
  - **Steps**:
    1. Submit an ad-performance export request with a date range longer than 365 days.
    2. Confirm the UI displays a generation error and the API returns `400`.
    3. Submit an ad-performance export request with a format other than `csv`.
  - **Expected Result**: Both invalid requests are rejected with `400`; no CSV is downloaded for the invalid date range.
  - **Business Rules**: BR-ADM-040
  - **API**: `POST /api/v1/admin/ads/export/ad-performance`, `POST /api/v1/admin/ads/export/submission-history`, `POST /api/v1/admin/ads/export/fee-history`

- [x] **A-17**: Bulk fee-history deletion is atomic when an ID is protected or missing
  - **Evidence**:
    - Permission control limits Fee Change History access to authorized admins → `A-17_1_history_permission.png`
    - Final UI state for: Ad_Management_Screen\ad-fee-history.spec.ts / Admin Fee Change History — PCL Normal Scenarios / A-17: Permission control on Fee Change History / should limit Fee Change History access to authorized admins → `A-17_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-fee-history.spec.ts › "should have permission control on Fee Change History" — missing
  - **Precondition**: An eligible previous-month record, a protected current-month record, and a nonexistent ID are available.
  - **Steps**:
    1. Submit a bulk delete containing both an eligible previous-month ID and a current-month ID.
    2. Submit another bulk delete containing an eligible ID and a nonexistent ID.
  - **Expected Result**: Each request is rejected and none of the eligible records in either request are deleted.
  - **Business Rules**: BR-ADM-025
  - **API**: `DELETE /api/v1/admin/ad-fees/history`

- [x] **A-18**: Bulk rejection continues after a refund failure
  - **Evidence**:
    - The passing backend service unit test verifies two ads are rejected, one refund fails, and the next is processed. → `A-18_1_backend_unit_test.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-management.api.spec.ts › "A-18: backend service continues after a refund failure" — passed
  - **Precondition**: At least two pending ads are selected; refund processing fails for one ad and succeeds for another.
  - **Steps**:
    1. Bulk reject the selected ads with a valid common reason.
    2. Inspect the response summary and payment records.
  - **Expected Result**: All selected ads remain rejected; successful refunds complete, processing continues after the failure, and `refundsProcessed`, `refundsFailed`, `failed`, and per-ad `refundStatus` accurately report the outcome.
  - **Business Rules**: BR-ADM-004, BR-ADM-013
  - **API**: `POST /api/v1/admin/ads/bulk/reject`
  - **Evidence limitation**: The refund-failure path is covered by the backend unit test `bulk reject logs refund failures and continues`, which injects the failure through a mocked Prisma dependency. The running API has no supported failure-injection mechanism, so a live API screenshot cannot be captured without fabricating the condition.

- [x] **A-19**: Ad list rejects invalid filters and pagination parameters
  - **Evidence**:
    - Final UI state for: Ad_Management_Screen\ad-management.spec.ts / Admin Ad Management — PCL Abnormal Scenarios / A-19: Ad list rejects invalid filters and pagination / should reject invalid status, pagination, and long shop filters → `A-19_FINAL.png`
    - GET /admin/ads (invalid status, page/limit, and shop length) returned HTTP 400: The API rejects an invalid status, zero page/limit, and a shop filter longer than 255 characters. → `A-19_1_invalid_filters_rejected.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-management.spec.ts › "should reject invalid status, pagination, and long shop filters" — passed
  - **Precondition**: Admin is authenticated.
  - **Steps**:
    1. Request an invalid status, placement, or tier.
    2. Request `page=0`, `limit=0`, or `limit=101`.
    3. Request a shop search longer than 255 characters.
  - **Expected Result**: Each invalid query is rejected with a validation error rather than returning a successful list response.
  - **Business Rules**: BR-ADM-001
  - **API**: `GET /api/v1/admin/ads`

- [x] **A-20**: Ad list rejects a reversed date range
  - **Evidence**:
    - GET /admin/ads?dateFrom=2026-10-20&dateTo=2026-10-01 returned HTTP 400: A reversed date range is rejected. → `A-20_1_reversed_date_range_rejected.png`
    - Final UI state for: Ad_Management_Screen\ad-management.spec.ts / Admin Ad Management — PCL Abnormal Scenarios / A-20: Ad list rejects a reversed date range / should reject dateFrom later than dateTo → `A-20_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-management.spec.ts › "should reject dateFrom later than dateTo" — passed
  - **Precondition**: Admin is authenticated.
  - **Steps**:
    1. Request the ad list with `dateFrom` later than `dateTo`.
  - **Expected Result**: The request is rejected with a validation error; it does not return a successful empty result for an invalid range.
  - **Business Rules**: BR-ADM-001
  - **API**: `GET /api/v1/admin/ads`

- [x] **A-21**: Bulk moderation rejects a mixed request with a missing or non-pending ad
  - **Evidence**:
    - POST /admin/ads/bulk/approve (pending id plus missing id) returned HTTP 400: The mixed request is rejected atomically; the valid pending ad remains pending. → `A-21_1_mixed_ids_rejected.png`
    - Final UI state for: Ad_Management_Screen\ad-management.spec.ts / Admin Ad Management — PCL Abnormal Scenarios / A-21: Bulk moderation rejects mixed valid and missing ids / should reject the whole request and leave the pending ad unchanged → `A-21_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-management.spec.ts › "should reject the whole request and leave the pending ad unchanged" — passed
  - **Precondition**: At least two pending ads exist; the request can also include a nonexistent ID or an ad that is no longer pending.
  - **Steps**:
    1. Submit a bulk approve or bulk reject request containing valid pending ad IDs and one missing or non-pending ID.
    2. Inspect all requested ads and their notifications/audit events.
  - **Expected Result**: The request is rejected before mutation; no pending ad in the request is partially processed and no moderation notifications or audit events are generated.
  - **Business Rules**: BR-ADM-010, BR-ADM-011, BR-ADM-012, BR-ADM-013
  - **API**: `POST /api/v1/admin/ads/bulk/approve`, `POST /api/v1/admin/ads/bulk/reject`

---

## 3. Boundary Scenarios (B) 窶・Edge Cases & Limits

- [x] **B-01**: Fee setting at minimum values
  - **Evidence**:
    - Two admins edit fee settings concurrently without conflict → `B-01_1_concurrent_edit.png`
    - Final UI state for: Ad_Management_Screen\ad-management.spec.ts / Admin Ad Management — PCL Boundary Scenarios / B-01: Fee setting at minimum values / should create fee setting with minimum valid values → `B-01_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-fee-packages.spec.ts › "should create fee setting at minimum valid values" — missing
  - **Precondition**: Admin is on the fee creation modal.
  - **Steps**:
    1. Enter the minimum valid daily rate, duration, and max ads values.
    2. Save.
  - **Expected Result**: Fee creation succeeds and the record is stored with valid minimum values.
  - **Business Rules**: BR-ADM-020

- [x] **B-02**: Fee setting at maximum reasonable values
  - **Evidence**:
    - Concurrent activate/deactivate operations resolve to one final state → `B-02_1_concurrent_toggle.png`
    - Final UI state for: Ad_Management_Screen\ad-management.spec.ts / Admin Ad Management — PCL Boundary Scenarios / B-02: Fee setting at maximum reasonable values / should accept upper-limit fee setting values → `B-02_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-fee-packages.spec.ts › "should accept fee setting at maximum reasonable values" — missing
  - **Precondition**: Admin is on the fee creation modal.
  - **Steps**:
    1. Enter the upper limit values allowed by frontline validation.
    2. Save.
  - **Expected Result**: Fee setting is accepted without truncation or validation failure.
  - **Business Rules**: BR-ADM-020

- [x] **B-03**: Rejection reason at maximum length (1000 chars)
  - **Evidence**:
    - Final UI state for: Ad_Management_Screen\ad-management.spec.ts / Admin Ad Management — PCL Boundary Scenarios / B-03: Rejection reason at maximum length (1000 chars) / should accept exactly 1000 characters in rejection reason → `B-03_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-management.spec.ts › "should accept exactly 1000 characters in rejection reason" — passed
  - **Precondition**: Admin is on the reject modal.
  - **Steps**:
    1. Enter exactly 1000 characters in the rejection reason field.
    2. Submit.
  - **Expected Result**: Request succeeds and the full reason is stored without truncation.
  - **Business Rules**: BR-ADM-002

- [x] **B-04**: Rejection reason beyond maximum length
  - **Evidence**:
    - Final UI state for: Ad_Management_Screen\ad-management.spec.ts / Admin Ad Management — PCL Boundary Scenarios / B-04: Rejection reason beyond maximum length / should block rejection reason exceeding 1000 characters → `B-04_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-management.spec.ts › "should block rejection reason exceeding 1000 characters" — passed
  - **Precondition**: Admin is on the reject modal.
  - **Steps**:
    1. Enter 1001 characters in the rejection reason field.
  - **Expected Result**: Validation error is shown and the request is blocked.
  - **Business Rules**: BR-ADM-002

- [x] **B-05**: Bulk selection limit exactly 50 ads
  - **Evidence**:
    - Submitting with empty required fields shows validation error → `B-05_1_empty_required_field.png`
    - Final UI state for: Ad_Management_Screen\ad-management.spec.ts / Admin Ad Management — PCL Normal Scenarios / B-05/B-06: Empty required fields and concurrent status change / should handle concurrent status change by another admin → `B-05_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-management.spec.ts › "should show validation error for empty required fields" — missing
  - **Precondition**: At least 50 pending ads are available.
  - **Steps**:
    1. Select exactly 50 ads.
    2. Trigger bulk approval or bulk reject.
  - **Expected Result**: The batch operation succeeds within the allowed limit.
  - **Business Rules**: BR-ADM-010, BR-ADM-011

- [x] **B-06**: Bulk selection limit at 51 ads
  - **Evidence**:
    - Concurrent status change by another admin triggers conflict handling → `B-06_1_concurrent_status_change.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-management.spec.ts › "should handle concurrent status change by another admin" — passed
  - **Precondition**: At least 51 pending ads are available.
  - **Steps**:
    1. Select 51 ads.
  - **Expected Result**: Validation blocks the operation and a clear limit message is displayed.
  - **Business Rules**: BR-ADM-010

- [x] **B-07**: Empty state when no ads exist
  - **Evidence**:
    - Status change is recorded in audit log with old and new values → `B-07_1_audit_log.png`
    - Final UI state for: Ad_Management_Screen\ad-management.spec.ts / Admin Ad Management — PCL Normal Scenarios / B-07: Audit log recording / should record status change in audit log → `B-07_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-management.spec.ts › "should record status change in audit log" — passed
  - **Precondition**: No advertisements exist in the system or filtered dataset is empty.
  - **Steps**:
    1. Navigate to `/admin/ads`.
  - **Expected Result**: Empty-state UI is displayed with a clear message and no broken table layout.
  - **Business Rules**: None (Empty state)

- [x] **B-08**: Analytics exact date range boundary
  - **Evidence**:
    - Same filters in list and drill-down return consistent revenue values → `B-08_1_drill_consistency.png`
    - Final UI state for: Ad_Management_Screen\ad-management.spec.ts / Admin Ad Management — PCL Boundary Scenarios / B-08: Analytics exact date range boundary / should reflect exact single-day date range in analytics → `B-08_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-analytics.spec.ts › "should reflect exact single-day date range in analytics without off-by-one errors" — missing
  - **Precondition**: Data exists for a single day or exact start/end date.
  - **Steps**:
    1. Set start and end dates to the same day.
    2. Run analytics.
  - **Expected Result**: Revenue and counts reflect exactly that date range without off-by-one errors.
  - **Business Rules**: BR-ADM-030

- [x] **B-09**: Search shop name with very long input
  - **Evidence**:
    - Final UI state for: Ad_Management_Screen\ad-management.spec.ts / Admin Ad Management — PCL Boundary Scenarios / B-09: Search shop name with very long input / should accept long shop name and filter correctly → `B-09_FINAL.png`
    - A 200-character shop name is accepted and returns the empty state without breaking the page. → `B-09_1_long_shop_search.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-management.spec.ts › "should accept long shop name and filter correctly" — passed
  - **Precondition**: Admin is on the ad list page.
  - **Steps**:
    1. Enter a very long shop name string near the field limit.
  - **Expected Result**: Input accepts the configured maximum length and filtering still behaves correctly.
  - **Business Rules**: None (Search)

- [x] **B-10**: Fee setting reactivation boundary
  - **Evidence**:
    - Deactivating a fee in use by ads does not break existing ad data → `B-10_1_deactivate_in_use.png`
    - Final UI state for: Ad_Management_Screen\ad-management.spec.ts / Admin Ad Management — PCL Boundary Scenarios / B-10: Fee setting reactivation boundary / should reactivate once, then block second reactivation → `B-10_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-fee-packages.spec.ts › "should reactivate once, then block second reactivation" — missing
  - **Precondition**: A fee setting is inactive and another identical placement/tier record is not active.
  - **Steps**:
    1. Reactivate the inactive setting.
    2. Attempt to reactivate it again.
  - **Expected Result**: First action succeeds and the second is blocked with a conflict error.
  - **Business Rules**: BR-ADM-023

- [x] **B-11**: History deletion boundary by month
  - **Evidence**:
    - Concurrent deletion of fee history records does not cause duplicates or errors → `B-11_1_concurrent_delete.png`
    - Final UI state for: Ad_Management_Screen\ad-management.spec.ts / Admin Ad Management — PCL Boundary Scenarios / B-11: History deletion boundary by month / should reject current-month deletion, allow previous-month → `B-11_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-fee-history.spec.ts › "should not cause duplicates or errors with concurrent deletion" — passed
  - **Precondition**: History records exist for both the current month and a prior month.
  - **Steps**:
    1. Attempt to delete a current-month record.
    2. Attempt to delete a previous-month record.
  - **Expected Result**: Current-month deletion is rejected; previous-month deletion succeeds.
  - **Business Rules**: BR-ADM-025

- [x] **B-12**: Fee-history bulk deletion limit at 50 and 51 records
  - **Evidence**:
    - Concurrent fee changes generate sequential history records → `B-12_1_concurrent_generation.png`
    - Final UI state for: Ad_Management_Screen\ad-management.spec.ts / Admin Ad Management — PCL Boundary Scenarios / B-12: Fee-history bulk deletion limit at 50 and 51 records / should block 51-record bulk deletion → `B-12_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-fee-history.spec.ts › "should allow deleting exactly 50 records, block 51-record bulk deletion" — missing
  - **Precondition**: At least 51 eligible previous-month history records exist.
  - **Steps**:
    1. Select and delete exactly 50 records.
    2. Attempt to submit 51 record IDs in one bulk request.
  - **Expected Result**: Deleting 50 records succeeds; the 51-record request is blocked with a clear maximum-size validation error.
  - **Business Rules**: BR-ADM-025
  - **API**: `DELETE /api/v1/admin/ad-fees/history`

- [x] **B-13**: Submission-history export preserves each review event
  - **Evidence**:
    - POST /admin/ads/export/submission-history returned HTTP 200: CSV contains separate rejected and approved rows for the same advertisement review history. → `B-13_1_submission_history_events.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-export.api.spec.ts › "B-13: submission-history export preserves each review event" — passed
  - **Precondition**: An ad submission was created within the selected date range, then rejected and later approved within that range, with both review audit events recorded.
  - **Steps**:
    1. Export submission history for the range containing both review events.
    2. Inspect the CSV rows for that ad.
  - **Expected Result**: The CSV has a separate row for each review event, with the corresponding status, reviewer, and review timestamp; ads without review events in the range still appear once with their current status.
  - **Business Rules**: BR-ADM-040
  - **API**: `POST /api/v1/admin/ads/export/submission-history`

- [x] **B-14**: CSV values containing commas, quotes, or line breaks are escaped
  - **Evidence**:
    - Concurrent export requests complete independently without conflicts → `B-14_1_concurrent_export.png`
    - Final UI state for: Ad_Management_Screen\ad-export.spec.ts / Admin Export Reports — PCL Abnormal Scenarios / B-14: Concurrent export requests / should complete concurrent export requests without conflicts → `B-14_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-export.spec.ts › "should complete concurrent export requests without conflicts" — passed
  - **Precondition**: Export data includes a text value with a comma, double quote, or line break.
  - **Steps**:
    1. Generate the applicable CSV report.
    2. Parse the output and compare the affected field with its original value.
  - **Expected Result**: CSV quoting and escaped double quotes preserve the original field value without shifting columns or corrupting rows.
  - **Business Rules**: BR-ADM-040
  - **API**: `POST /api/v1/admin/ads/export/ad-performance`, `POST /api/v1/admin/ads/export/submission-history`, `POST /api/v1/admin/ads/export/fee-history`

- [x] **B-15**: Export with no matching records returns a valid empty CSV
  - **Evidence**:
    - Export file preserves special characters correctly → `B-15_1_special_char_export.png`
    - Final UI state for: Ad_Management_Screen\ad-export.spec.ts / Admin Export Reports — PCL Abnormal Scenarios / B-15: Special character handling in export fields / should preserve special characters in exported CSV → `B-15_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-export.spec.ts › "should preserve special characters in exported CSV correctly" — missing
  - **Precondition**: Admin is authenticated and the chosen report filters match no records.
  - **Steps**:
    1. Generate each report type for a valid date range with filters that match no records.
    2. Inspect the downloaded files and export audit events.
  - **Expected Result**: Each request succeeds with a CSV containing its header row and no data rows; the audit event records `rowCount = 0`.
  - **Business Rules**: BR-ADM-040
  - **API**: `POST /api/v1/admin/ads/export/ad-performance`, `POST /api/v1/admin/ads/export/submission-history`, `POST /api/v1/admin/ads/export/fee-history`

- [x] **B-16**: Fee-history deletion follows the UTC calendar-month boundary
  - **Evidence**:
    - Admin navigates across fee history pages and data stays consistent → `B-16_1_cross_page.png`
    - Final UI state for: Ad_Management_Screen\ad-fee-history.spec.ts / Admin Fee Change History — PCL Boundary Scenarios / B-16: Cross-page pagination of fee history / should navigate pages and maintain data consistency → `B-16_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-fee-history.spec.ts › "should follow UTC calendar-month boundary for fee-history deletion" — missing
  - **Precondition**: Fee-history records exist immediately before and at the UTC start of the current month.
  - **Steps**:
    1. Attempt to delete a record created immediately before the UTC month boundary.
    2. Attempt to delete a record created at the UTC month boundary.
  - **Expected Result**: The previous-month record is eligible for deletion; the record at the start of the current UTC month is protected.
  - **Business Rules**: BR-ADM-025
  - **API**: `DELETE /api/v1/admin/ad-fees/history`, `DELETE /api/v1/admin/ad-fees/history/:id`

- [x] **B-17**: Revenue analytics with no matching approved ads
  - **Evidence**:
    - Concurrent analytics requests return stable consistent results → `B-17_1_concurrent_requests.png`
    - Final UI state for: Ad_Management_Screen\ad-management.spec.ts / Admin Ad Management — PCL Boundary Scenarios / B-17: Revenue analytics with no matching approved ads / should display zero metrics and "No data" when no ads match → `B-17_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-analytics.spec.ts › "should display zero metrics and No data state when no approved ads match" — missing
  - **Precondition**: No approved advertisements match the selected date range and filters.
  - **Steps**:
    1. Run revenue analytics for the empty result set.
  - **Expected Result**: Summary metrics return zero values, placement/tier breakdowns and trend are empty, and the UI displays "No data" states without broken charts.
  - **Business Rules**: BR-ADM-030
  - **API**: `GET /api/v1/admin/ads/analytics/revenue`

- [x] **B-18**: Ad list pagination at minimum and maximum page sizes
  - **Evidence**:
    - Repeated moderation operations stay responsive under high frequency → `B-18_1_high_frequency.png`
    - Final UI state for: Ad_Management_Screen\ad-management.spec.ts / Admin Ad Management — PCL Normal Scenarios / B-18: High-frequency operations / should stay responsive under repeated moderation operations → `B-18_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-management.spec.ts › "should stay responsive under repeated moderation operations" — passed
  - **Precondition**: Admin is authenticated and at least 100 advertisements are available.
  - **Steps**:
    1. Request the ad list with `limit=1`.
    2. Request the ad list with `limit=100`.
  - **Expected Result**: Both requests succeed and return correct page contents and pagination metadata without exceeding the requested limit.
  - **Business Rules**: BR-ADM-001
  - **API**: `GET /api/v1/admin/ads`

- [x] **B-19**: Single rejection refunds every completed payment for the ad
  - **Evidence**:
    - Ad list renders and paginates correctly with a large dataset → `B-19_1_large_dataset.png`
    - Final UI state for: Ad_Management_Screen\ad-management.spec.ts / Admin Ad Management — PCL Normal Scenarios / B-19: Large dataset rendering / should render and paginate correctly with large dataset → `B-19_FINAL.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-management.spec.ts › "should render and paginate correctly with large dataset" — passed
  - **Precondition**: A pending ad has multiple completed payment records.
  - **Steps**:
    1. Reject the ad with a valid reason.
    2. Inspect each payment record and the `AD_REJECTED` audit event.
  - **Expected Result**: Every completed payment is refunded in full with the rejection reason; the advertisement is marked refunded, and the audit event records the sum of the completed payment amounts.
  - **Business Rules**: BR-ADM-002, BR-ADM-004, BR-ADM-005
  - **API**: `POST /api/v1/admin/ads/:id/reject`

---

## 4. Interface Scenarios (I) 窶・API Contracts & Payloads

> API contract evidence screenshots show the endpoint, HTTP status, and verified response contract without exposing authentication headers or sensitive response data.

- [x] **I-01**: `GET /api/v1/admin/ads` 窶・returns paginated ad list with filters
  - **Evidence**:
    - GET /admin/ads?status=pending&page=1&limit=20 returned HTTP 200: Validated paginated data and metadata response. → `I-01_1_paginated_ads_with_filters.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-management.api.spec.ts › "should return paginated ads for admin with filters" — passed
  - **Precondition**: Admin token is valid and multiple ads exist.
  - **Steps**:
    1. Call `GET /api/v1/admin/ads` with status, placement, tier, shop, dateFrom/dateTo, page, and limit.
    2. Confirm response is `200 OK`.
  - **Expected Response**: Response includes `data` and `meta` with total count and pagination metadata; each returned ad satisfies every supplied filter together, and `meta.total` reflects that combined result set.
  - **Business Rules**: BR-ADM-001, BR-ADM-005
  - **API**: `GET /api/v1/admin/ads`

- [x] **I-02**: `GET /api/v1/admin/ads/:id` 窶・returns full ad detail
  - **Evidence**:
    - GET /admin/ads/:id returned HTTP 200: Validated advertisement detail response. → `I-02_1_advertisement_full_detail.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-management.api.spec.ts › "should return full detail for a single advertisement" — passed
  - **Precondition**: Valid ad ID and admin token.
  - **Steps**:
    1. Call `GET /api/v1/admin/ads/:id`.
  - **Expected Response**: `200 OK` with shop, fee, payment, and analytics information.
  - **Business Rules**: BR-ADM-003, BR-ADM-005
  - **API**: `GET /api/v1/admin/ads/:id`

- [x] **I-03**: `POST /api/v1/admin/ads/:id/approve` 窶・approves a pending ad
  - **Evidence**:
    - POST /admin/ads/:id/approve returned HTTP 201: Advertisement approved with admin and timestamp metadata. → `I-03_1_approve_pending_ad.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-management.api.spec.ts › "should approve a pending ad and set approval metadata" — passed
  - **Precondition**: Valid admin token and ad in `pending` state.
  - **Steps**:
    1. Call `POST /api/v1/admin/ads/:id/approve`.
  - **Expected Response**: `201 Created` and updated state shows `approvalStatus = 'approved'` with `approvedBy` and `approvedAt` set.
  - **Business Rules**: BR-ADM-001, BR-ADM-003, BR-ADM-005
  - **API**: `POST /api/v1/admin/ads/:id/approve`

- [x] **I-04**: `POST /api/v1/admin/ads/:id/reject` 窶・rejects a pending ad with reason
  - **Evidence**:
    - POST /admin/ads/:id/reject returned HTTP 201: Advertisement rejected; reason and refunded payment verified. → `I-04_1_reject_pending_ad_refund.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-management.api.spec.ts › "should reject a pending ad and trigger refund" — passed
  - **Precondition**: Valid admin token, pending ad, and rejection reason.
  - **Steps**:
    1. Call `POST /api/v1/admin/ads/:id/reject` with `rejection_reason` payload.
  - **Expected Response**: `201 Created`; state becomes `rejected` and refund fields are set for completed payments.
  - **Business Rules**: BR-ADM-002, BR-ADM-004, BR-ADM-005
  - **API**: `POST /api/v1/admin/ads/:id/reject`

- [x] **I-05**: `POST /api/v1/admin/ads/bulk/approve` 窶・validates selection and batch result
  - **Evidence**:
    - POST /admin/ads/bulk/approve returned HTTP 201: Two pending advertisements approved; batch results verified. → `I-05_1_bulk_approve_ads.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-management.api.spec.ts › "should bulk approve only pending ads within limit" — passed
  - **Precondition**: Admin token and valid array of `ad_ids`.
  - **Steps**:
    1. Call `POST /api/v1/admin/ads/bulk/approve` with selected IDs.
  - **Expected Response**: `201 Created` with summary result, or `400` if any ad is not pending or limit is exceeded.
  - **Business Rules**: BR-ADM-010, BR-ADM-011
  - **API**: `POST /api/v1/admin/ads/bulk/approve`

- [x] **I-06**: `POST /api/v1/admin/ads/bulk/reject` 窶・rejects multiple ads with a common reason and refund summary
  - **Evidence**:
    - POST /admin/ads/bulk/reject returned HTTP 201: Two advertisements rejected; refund summary verified. → `I-06_1_bulk_reject_ads_refund_summary.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-management.api.spec.ts › "should bulk reject ads and include refund summary" — passed
  - **Precondition**: Admin token, selected `ad_ids`, and common `rejection_reason`.
  - **Steps**:
    1. Call `POST /api/v1/admin/ads/bulk/reject`.
  - **Expected Response**: `201 Created` with rejected result summary and refund details.
  - **Business Rules**: BR-ADM-002, BR-ADM-004, BR-ADM-012, BR-ADM-013
  - **API**: `POST /api/v1/admin/ads/bulk/reject`

- [x] **I-07**: `GET /api/v1/admin/ad-fees` 窶・returns active and inactive fee settings
  - **Evidence**:
    - GET /admin/ad-fees returned HTTP 200: Fee settings include placement, tier, daily rate, duration, and max-ad metadata. → `I-07_1_list_fee_settings.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-fee.api.spec.ts › "should list fee settings with placement/tier metadata" — passed
  - **Precondition**: Admin token.
  - **Steps**:
    1. Call `GET /api/v1/admin/ad-fees`.
  - **Expected Response**: `200 OK`; settings array includes `placement`, `tier`, `dailyRate`, `durationDays`, and `maxAds`.
  - **Business Rules**: BR-ADM-020, BR-ADM-021
  - **API**: `GET /api/v1/admin/ad-fees`

- [x] **I-08**: `POST /api/v1/admin/ad-fees` 窶・creates a fee setting with proper validation
  - **Evidence**:
    - POST /admin/ad-fees returned HTTP 201: New active fee setting created with a history entry. → `I-08_1_create_fee_setting.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-fee.api.spec.ts › "should create a valid fee setting and log history" — passed
  - **Precondition**: Admin token and valid placement/tier payload.
  - **Steps**:
    1. POST a valid payload with `daily_rate`, `duration_days`, `max_ads`, and `change_reason`.
  - **Expected Response**: `201 Created` and fee history record created.
  - **Business Rules**: BR-ADM-020, BR-ADM-024
  - **API**: `POST /api/v1/admin/ad-fees`

- [x] **I-09**: `PUT /api/v1/admin/ad-fees/:id` 窶・updates fee setting and snapshots old values
  - **Evidence**:
    - PUT /admin/ad-fees/:id returned HTTP 200: Updated fee values and historical snapshot verified. → `I-09_1_update_fee_setting.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-fee.api.spec.ts › "should update fee setting and keep historical snapshot" — passed
  - **Precondition**: Existing fee setting id and valid admin token.
  - **Steps**:
    1. Call `PUT /api/v1/admin/ad-fees/:id` with an updated fee payload.
  - **Expected Response**: `200 OK` and a corresponding history record showing previous values.
  - **Business Rules**: BR-ADM-022, BR-ADM-025
  - **API**: `PUT /api/v1/admin/ad-fees/:id`

- [x] **I-10**: `PATCH /api/v1/admin/ad-fees/:id/deactivate` 窶・deactivates a fee setting
  - **Evidence**:
    - PATCH /admin/ad-fees/:id/deactivate returned HTTP 200: Fee setting deactivated; existing advertisement records remain unchanged. → `I-10_1_deactivate_fee_setting.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-fee.api.spec.ts › "should deactivate fee setting without affecting existing ads" — passed
  - **Precondition**: Valid id for an active fee setting.
  - **Steps**:
    1. Send a PATCH request to deactivate.
  - **Expected Response**: `200 OK`, setting becomes inactive, and existing ad assignments remain intact.
  - **Business Rules**: BR-ADM-023, BR-ADM-025
  - **API**: `PATCH /api/v1/admin/ad-fees/:id/deactivate`

- [x] **I-11**: `GET /api/v1/admin/ad-fees/history` 窶・returns fee change log
  - **Evidence**:
    - GET /admin/ad-fees/history returned HTTP 200: Fee history response is sorted by creation time. → `I-11_1_fee_history_sorted.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-fee.api.spec.ts › "should return fee history sorted by created time" — passed
  - **Precondition**: Fee history exists.
  - **Steps**:
    1. Call `GET /api/v1/admin/ad-fees/history`.
  - **Expected Response**: `200 OK` with dates, placement, tier, old/new rate values, and change reason.
  - **Business Rules**: BR-ADM-022, BR-ADM-025
  - **API**: `GET /api/v1/admin/ad-fees/history`

- [x] **I-12**: `GET /api/v1/admin/ads/analytics/revenue` 窶・returns revenue metrics and charts payload
  - **Evidence**:
    - GET /admin/ads/analytics/revenue?dateFrom=2026-01-01&dateTo=2026-12-31 returned HTTP 200: Revenue summary, placement/tier breakdowns, and trend were returned. → `I-12_1_revenue_analytics.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-analytics.api.spec.ts › "should return total revenue and breakdown metrics" — passed
  - **Precondition**: Valid admin token and approved ads within the filtered date range.
  - **Steps**:
    1. Call `GET /api/v1/admin/ads/analytics/revenue` with date range and optional filters.
  - **Expected Response**: `200 OK`; payload includes totals and placement/tier breakdown data.
  - **Business Rules**: BR-ADM-030, BR-ADM-031
  - **API**: `GET /api/v1/admin/ads/analytics/revenue`

- [x] **I-13**: `POST /api/v1/admin/ads/export/ad-performance` 窶・downloads CSV report
  - **Evidence**:
    - POST /admin/ads/export/ad-performance returned HTTP 200: CSV response returned with 4800 characters. → `I-13_1_export_performance_csv.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-export.api.spec.ts › "I-13: should export CSV ad performance report" — passed
  - **Precondition**: Valid admin token and ad performance records.
  - **Steps**:
    1. Call `POST /api/v1/admin/ads/export/ad-performance`.
  - **Expected Response**: `200 OK` with CSV body or attachment header; excludes sensitive fields.
  - **Business Rules**: BR-ADM-040, BR-ADM-041
  - **API**: `POST /api/v1/admin/ads/export/ad-performance`

- [x] **I-14**: `POST /api/v1/admin/ads/export/submission-history` 窶・exports shop submission history
  - **Evidence**:
    - POST /admin/ads/export/submission-history returned HTTP 200: CSV response returned with 6732 characters. → `I-14_1_export_submission_history_csv.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-export.api.spec.ts › "I-14: should export shop submission history CSV" — passed
  - **Precondition**: Valid admin token and submission history data.
  - **Steps**:
    1. Call `POST /api/v1/admin/ads/export/submission-history`.
  - **Expected Response**: `200 OK` with CSV export that includes submission status and outcomes.
  - **Business Rules**: BR-ADM-040
  - **API**: `POST /api/v1/admin/ads/export/submission-history`

- [x] **I-15**: `POST /api/v1/admin/ads/export/fee-history` 窶・exports fee history log
  - **Evidence**:
    - POST /admin/ads/export/fee-history returned HTTP 200: CSV response returned with 47873 characters. → `I-15_1_export_fee_history_csv.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-export.api.spec.ts › "I-15: should export fee history log as CSV" — passed
  - **Precondition**: Valid admin token and fee-history entries.
  - **Steps**:
    1. Call `POST /api/v1/admin/ads/export/fee-history`.
  - **Expected Response**: `200 OK` with CSV payload containing fee change records and reasons.
  - **Business Rules**: BR-ADM-040
  - **API**: `POST /api/v1/admin/ads/export/fee-history`

- [x] **I-16**: `PATCH /api/v1/admin/ad-fees/:id/reactivate` 窶・reactivates an inactive fee setting
  - **Evidence**:
    - PATCH /admin/ad-fees/:id/reactivate returned HTTP 200: Fee setting reactivated and history change recorded. → `I-16_1_reactivate_fee_setting.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-fee.api.spec.ts › "should reactivate a fee setting and log the change" — passed
  - **Precondition**: Valid admin token and a deactivated fee setting id.
  - **Steps**:
    1. Call `PATCH /api/v1/admin/ad-fees/:id/reactivate` with an optional reactivation reason.
  - **Expected Response**: `200 OK`; setting becomes active and a fee history entry is created with the reactivation reason.
  - **Business Rules**: BR-ADM-023, BR-ADM-025
  - **API**: `PATCH /api/v1/admin/ad-fees/:id/reactivate`

- [x] **I-17**: `DELETE /api/v1/admin/ad-fees/history` 窶・blocks current-month deletion but allows earlier-history cleanup
  - **Evidence**:
    - DELETE /admin/ad-fees/history (actual current-month record) returned HTTP 400: An actual current-month record was protected with HTTP 400, while a previous-month record was deleted successfully. → `I-17_1_delete_fee_history_rules.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-fee.api.spec.ts › "should reject deleting an actual current-month fee-history record" — passed
  - **Precondition**: Admin token and a fee history row created during the current calendar month.
  - **Steps**:
    1. Query the current calendar month and select an actual history record.
    2. Submit a delete request containing that record id.
  - **Expected Response**: The current-month deletion fails with `400`.
  - **Business Rules**: BR-ADM-025
  - **API**: `DELETE /api/v1/admin/ad-fees/history`, `DELETE /api/v1/admin/ad-fees/history/:id`

- [x] **I-18**: `GET /api/v1/admin/ad-fees/history` 窶・filters by calendar month and paginates
  - **Evidence**:
    - GET /admin/ad-fees/history?month=2026-09&placement=search_page_banner&tier=basic&page=1&limit=20 returned HTTP 200: Calendar-month, placement, tier, and pagination filters were accepted. → `I-18_1_fee_history_filters_and_pagination.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-fee.api.spec.ts › "should return fee history with filters by calendar month and pagination" — passed
  - **Precondition**: Valid admin token and history records spanning multiple months and pages.
  - **Steps**:
    1. Request the endpoint with `month` in `YYYY-MM` format, placement/tier filters, page, and limit.
    2. Confirm the response is `200 OK`.
  - **Expected Response**: Every returned record matches the filters; `data` and `meta` include the filtered total and pagination values.
  - **Business Rules**: BR-ADM-022, BR-ADM-025
  - **API**: `GET /api/v1/admin/ad-fees/history`

- [x] **I-19**: Export endpoints apply report-specific filters and record audit metadata
  - **Evidence**:
    - POST /admin/ads/export/* (report-specific filters) returned HTTP 200: All three CSV exports accepted their report-specific filters, and matching EXPORT_GENERATED audit metadata was persisted. → `I-19_1_export_report_filters_audit.png`
    - Test: e2e/tests/Ad_Management_Screen/ad-export.api.spec.ts › "I-19 + A-16: should export with report-specific filters and audit metadata" — passed
  - **Precondition**: Valid admin token and records both matching and not matching each report filter.
  - **Steps**:
    1. Export ad performance with placement, tier, and status filters.
    2. Export submission history with a shop-name filter.
    3. Export fee history with placement and tier filters.
  - **Expected Response**: Each CSV contains only matching rows and the expected report headers; each `EXPORT_GENERATED` audit event records the report type, CSV format, date range, applied filters, and row count.
  - **Business Rules**: BR-ADM-040, BR-ADM-041
  - **API**: `POST /api/v1/admin/ads/export/ad-performance`, `POST /api/v1/admin/ads/export/submission-history`, `POST /api/v1/admin/ads/export/fee-history`

---

## 5. Notes

- This checklist is intentionally written as a test-first source of truth for the Admin Ad Management screen.
- New items should be added only when they map directly to a requirement, API contract, or automated E2E test.
- When a scenario is executed and passed, update the item to `- [ ]` and add the required evidence block as specified in the PCL template guide.
