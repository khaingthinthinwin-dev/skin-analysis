# Program Checklist (PCL) — Admin Ad Management

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-PCL-ADM-001 |
| **Target Screen** | Admin Ad Management |
| **Subsystem** | Advertisement Management |
| **Version** | 1.2 |
| **Created** | 2026-10-14 |
| **Last Updated** | 2026-10-15 |
| **Status** | Active |

---

## 1. Normal Scenarios (N) — Happy Path

- [ ] **N-01**: View pending advertisement queue with filters
  - **Precondition**: Admin is authenticated and there are ads in varying approval states.
  - **Steps**:
    1. Navigate to `/admin/ads`.
    2. Confirm the default list loads.
    3. Filter by status, placement, tier, and shop name.
    4. Apply a date range.
  - **Expected Result**: Ad list displays matching records with summary metadata, pagination, and filter state applied correctly.
  - **Business Rules**: BR-ADM-001, BR-ADM-005
  - **API**: `GET /api/v1/admin/ads`
  - **Note**: Pending E2E coverage for the admin ad review table and filters.

- [ ] **N-02**: Review a single pending ad and approve it
  - **Precondition**: There is at least one ad in `pending` state.
  - **Steps**:
    1. Open the ad review modal.
    2. Verify shop, placement, fee, and payment details.
    3. Click "Approve".
  - **Expected Result**: Ad status changes to `approved`, metadata records the admin ID and timestamp, the shop receives a notification, and an `AD_APPROVED` audit event is recorded.
  - **Business Rules**: BR-ADM-001, BR-ADM-003, BR-ADM-005
  - **API**: `POST /api/v1/admin/ads/:id/approve`

- [ ] **N-03**: Reject a single pending ad with a valid reason
  - **Precondition**: There is at least one ad in `pending` state and payment is completed.
  - **Steps**:
    1. Open the review modal.
    2. Enter a rejection reason.
    3. Click "Reject".
  - **Expected Result**: Ad status changes to `rejected`, rejection reason is stored, refund flow is triggered, the shop receives a notification, and an `AD_REJECTED` audit event records the reason and refund amount.
  - **Business Rules**: BR-ADM-002, BR-ADM-004, BR-ADM-005
  - **API**: `POST /api/v1/admin/ads/:id/reject`

- [ ] **N-04**: Bulk approve multiple pending ads
  - **Precondition**: At least 2 ads are selected and all are in `pending` state.
  - **Steps**:
    1. Select multiple ads from the list.
    2. Click "Bulk Approve".
    3. Confirm the action in the confirmation dialog.
  - **Expected Result**: All selected ads move to `approved`; each shop receives an approval notification and per-ad audit event, and a `BULK_AD_APPROVED` aggregate audit event is recorded.
  - **Business Rules**: BR-ADM-010, BR-ADM-011
  - **API**: `POST /api/v1/admin/ads/bulk/approve`

- [ ] **N-05**: Bulk reject multiple pending ads with one reason
  - **Precondition**: At least 2 ads are selected and all are in `pending` state.
  - **Steps**:
    1. Select multiple ads.
    2. Click "Bulk Reject".
    3. Enter a common reason.
    4. Confirm the action.
  - **Expected Result**: All selected ads move to `rejected`, the same reason is stored, completed payments are refunded, each shop receives a notification and per-ad audit event, and a `BULK_AD_REJECTED` aggregate audit event is recorded.
  - **Business Rules**: BR-ADM-002, BR-ADM-004, BR-ADM-012, BR-ADM-013
  - **API**: `POST /api/v1/admin/ads/bulk/reject`

- [ ] **N-06**: Navigate to package fee page and view all fee settings
  - **Precondition**: Admin is authenticated.
  - **Steps**:
    1. Click "Manage Packages" from the ads page.
  - **Expected Result**: Fee settings table loads with placement, tier, daily rate, duration, max ads, and status columns.
  - **Business Rules**: BR-ADM-020, BR-ADM-021
  - **API**: `GET /api/v1/admin/ad-fees`

- [ ] **N-07**: Create a valid fee setting
  - **Precondition**: Admin is authenticated and fee setting does not already exist for the same placement and tier.
  - **Steps**:
    1. Open "Create Fee Setting" modal.
    2. Select placement and tier.
    3. Enter a valid daily rate, duration, max ads, and effective date.
    4. Click "Create".
  - **Expected Result**: New fee setting becomes active, a fee history record is created with the default reason "Initial fee setting", and a `FEE_CREATED` audit event is recorded.
  - **Business Rules**: BR-ADM-020, BR-ADM-024
  - **API**: `POST /api/v1/admin/ad-fees`

- [ ] **N-08**: Edit an existing fee setting
  - **Precondition**: At least one active fee setting exists.
  - **Steps**:
    1. Open the edit modal for a fee setting.
    2. Change daily rate or duration.
    3. Enter the effective date and a change reason.
    4. Save.
  - **Expected Result**: Fee setting updates successfully, the before/after values are logged in fee history, and a `FEE_UPDATED` audit event is recorded.
  - **Business Rules**: BR-ADM-022, BR-ADM-026
  - **API**: `PUT /api/v1/admin/ad-fees/:id`

- [ ] **N-09**: Deactivate an active fee setting
  - **Precondition**: A fee setting is active and currently in use by the catalog.
  - **Steps**:
    1. Click "Deactivate" for an active fee setting.
    2. Enter a change reason.
    3. Confirm the deactivation modal.
  - **Expected Result**: The fee setting is marked inactive, historical ads remain unaffected, and a `FEE_DEACTIVATED` audit event is recorded.
  - **Business Rules**: BR-ADM-023, BR-ADM-025
  - **API**: `PATCH /api/v1/admin/ad-fees/:id/deactivate`

- [ ] **N-10**: View fee change history
  - **Precondition**: At least one fee setting change has been logged.
  - **Steps**:
    1. Navigate to `/admin/ads/fee-history`.
    2. Apply placement or tier filters if needed.
  - **Expected Result**: History table shows date, placement, tier, old/new values, changed by, and reason.
  - **Business Rules**: BR-ADM-022, BR-ADM-025
  - **API**: `GET /api/v1/admin/ad-fees/history`

- [ ] **N-11**: View revenue analytics by placement and tier
  - **Precondition**: Admin is authenticated and there are approved ad records in the date range.
  - **Steps**:
    1. Navigate to `/admin/ads/analytics`.
    2. Select a date range.
    3. Apply placement or tier filters.
  - **Expected Result**: Summary metrics and charts update to show total revenue, ad counts, and breakdowns by placement/tier.
  - **Business Rules**: BR-ADM-030, BR-ADM-031
  - **API**: `GET /api/v1/admin/ads/analytics/revenue`

- [ ] **N-12**: Export ad performance report as CSV
  - **Precondition**: Admin is authenticated and ad performance data exists.
  - **Steps**:
    1. Navigate to `/admin/ads/export`.
    2. Select "Ad Performance" report type.
    3. Click "Generate" or "Download".
  - **Expected Result**: CSV file downloads with the correct columns and no sensitive fields; an `EXPORT_GENERATED` audit event records the report type, date range, and row count.
  - **Business Rules**: BR-ADM-040, BR-ADM-041
  - **API**: `POST /api/v1/admin/ads/export/ad-performance`

- [ ] **N-13**: Export ads submission history as CSV
  - **Precondition**: Admin is authenticated and submission history records exist.
  - **Steps**:
    1. Open the export panel for ad submissions.
    2. Select the submission-history report type and date range.
    3. Click "Download".
  - **Expected Result**: CSV export includes shop, title, status, review metadata, fee, and refund columns without hidden sensitive data; an `EXPORT_GENERATED` audit event records the report type, date range, and row count.
  - **Business Rules**: BR-ADM-040
  - **API**: `POST /api/v1/admin/ads/export/submission-history`

- [ ] **N-14**: Export fee history log as CSV
  - **Precondition**: Admin is authenticated and fee update history exists.
  - **Steps**:
    1. Open the export panel for fee history.
    2. Select the fee-history report type and date range.
    3. Click "Download".
  - **Expected Result**: CSV export contains package changes with old/new values, changed-by user, reason, and effective date in a readable audit format; an `EXPORT_GENERATED` audit event records the report type, date range, and row count.
  - **Business Rules**: BR-ADM-040
  - **API**: `POST /api/v1/admin/ads/export/fee-history`

- [ ] **N-15**: Language toggle works on admin ad management screens
  - **Precondition**: User is on any admin ad management screen.
  - **Steps**:
    1. Toggle language to Japanese / Myanmar / English.
  - **Expected Result**: All page labels and buttons update to the selected language.
  - **Business Rules**: None (i18n)

- [ ] **N-16**: Theme toggle works on admin ad management screens
  - **Precondition**: User is on any admin ad management screen.
  - **Steps**:
    1. Toggle theme to dark and light mode.
  - **Expected Result**: Page styling switches between light and dark themes without breaking layout.
  - **Business Rules**: None (UI)

- [ ] **N-17**: Responsive layout on desktop and mobile viewports
  - **Precondition**: Admin is on the ad list or package management page.
  - **Steps**:
    1. Set viewport to 1280x720.
    2. Set viewport to 375x667.
  - **Expected Result**: Table, filters, modals, and actions remain usable and readable across screen sizes.
  - **Business Rules**: None (Responsive)

- [ ] **N-18**: Reactivate an inactive fee setting
  - **Precondition**: An ad fee package exists and is currently inactive.
  - **Steps**:
    1. Open the fee setting details or package list.
    2. Click "Reactivate" for the inactive setting.
    3. Confirm the action.
  - **Expected Result**: The package becomes active again, history records the reactivation, and the cache is refreshed.
  - **Business Rules**: BR-ADM-023, BR-ADM-025
  - **API**: `PATCH /api/v1/admin/ad-fees/:id/reactivate`

- [ ] **N-19**: Delete an older fee history record that is eligible for cleanup
  - **Precondition**: At least one fee history record exists from a previous calendar month.
  - **Steps**:
    1. Select a previous-month history row.
    2. Confirm bulk or single delete.
  - **Expected Result**: The selected record is removed and a `FEE_HISTORY_DELETED` audit event is created.
  - **Business Rules**: BR-ADM-025, BR-ADM-026
  - **API**: `DELETE /api/v1/admin/ad-fees/history`, `DELETE /api/v1/admin/ad-fees/history/:id`

- [ ] **N-20**: Filter and paginate fee history by month, placement, and tier
  - **Precondition**: Fee history records exist across multiple months, placements, and tiers, with enough matching records to span multiple pages.
  - **Steps**:
    1. Open `/admin/ads/fee-history`.
    2. Select a calendar month, placement, and tier.
    3. Navigate to the next page of results.
  - **Expected Result**: Every row matches all selected filters; pagination metadata and page contents reflect the filtered result set, and changing a filter returns to page 1.
  - **Business Rules**: BR-ADM-025
  - **API**: `GET /api/v1/admin/ad-fees/history`

- [ ] **N-21**: Open a newly submitted ad from an admin notification
  - **Precondition**: Admin has an `AD_SUBMITTED` notification with an advertisement entity ID.
  - **Steps**:
    1. Open the notification.
    2. Confirm navigation to `/admin/ads` with the ad ID in `highlightAdId`.
  - **Expected Result**: The target ad row scrolls into view and is visibly highlighted as new; the highlight is removed after three seconds and the ad list remains usable.
  - **Business Rules**: None (Notification navigation)

- [ ] **N-22**: View an approved or rejected ad without moderation actions
  - **Precondition**: At least one approved ad and one rejected ad exist.
  - **Steps**:
    1. Select "View" for each non-pending ad.
    2. Inspect the detail modal.
  - **Expected Result**: Details are displayed read-only with no approve/reject controls; the rejected ad's rejection reason is shown.
  - **Business Rules**: BR-ADM-005
  - **API**: `GET /api/v1/admin/ads/:id`

- [ ] **N-23**: Disable fee creation when all placement/tier packages exist
  - **Precondition**: Fee settings exist for all 4 placements × 3 tiers.
  - **Steps**:
    1. Open `/admin/ads/packages`.
  - **Expected Result**: The "Create Fee Setting" button is disabled and indicates that all 12 package combinations already exist.
  - **Business Rules**: BR-ADM-024

- [ ] **N-24**: Keep paid advertisements unchanged when a fee setting is updated
  - **Precondition**: An existing paid advertisement uses an active fee setting, and the admin can update that setting.
  - **Steps**:
    1. Record the paid advertisement's fee and payment amount.
    2. Update the fee setting's rate, duration, and/or max ads with an effective date.
    3. Reopen the existing advertisement details and inspect the fee and payment information.
  - **Expected Result**: The existing advertisement continues to show its original locked rate, duration, total fee, and paid amount; the fee history captures the old and new values and effective date, and the update is available for future package selections.
  - **Business Rules**: BR-ADM-022, BR-ADM-031
  - **API**: `PUT /api/v1/admin/ad-fees/:id`, `GET /api/v1/admin/ads/:id`

---

## 2. Abnormal Scenarios (A) — Error & Negative Paths

- [ ] **A-01**: Attempt to approve or reject without admin role
  - **Precondition**: User is signed in as buyer or merchant or not authenticated.
  - **Steps**:
    1. Open a pending ad review action.
    2. Trigger approve/reject request.
  - **Expected Result**: Request is denied with `403 Forbidden` or redirect to login; no state update occurs.
  - **Business Rules**: BR-ADM-001
  - **API**: `POST /api/v1/admin/ads/:id/approve`, `POST /api/v1/admin/ads/:id/reject`

- [ ] **A-02**: Reject a pending ad without a reason
  - **Precondition**: Admin is authenticated and the ad is pending.
  - **Steps**:
    1. Open the reject modal.
    2. Leave the rejection reason blank.
    3. Submit.
  - **Expected Result**: Validation error is shown and the ad remains pending.
  - **Business Rules**: BR-ADM-002
  - **API**: `POST /api/v1/admin/ads/:id/reject`

- [ ] **A-03**: Attempt to approve or reject an ad that is no longer pending
  - **Precondition**: Selected ad is already `approved` or `rejected`.
  - **Steps**:
    1. Trigger the single or bulk approve/reject flow.
  - **Expected Result**: Error message indicates the ad is no longer pending; no mutation occurs.
  - **Business Rules**: BR-ADM-005
  - **API**: `POST /api/v1/admin/ads/:id/approve`, `POST /api/v1/admin/ads/:id/reject`, `POST /api/v1/admin/ads/bulk/approve`, `POST /api/v1/admin/ads/bulk/reject`

- [ ] **A-04**: Bulk approve more than 50 ads in one request
  - **Precondition**: Admin is authenticated and selects more than 50 ads.
  - **Steps**:
    1. Select 51 or more entries.
    2. Click "Bulk Approve".
  - **Expected Result**: UI blocks the action or backend returns `400` with validation error.
  - **Business Rules**: BR-ADM-010, BR-ADM-011
  - **API**: `POST /api/v1/admin/ads/bulk/approve`

- [ ] **A-05**: Bulk reject without a common rejection reason
  - **Precondition**: Admin selects multiple pending ads.
  - **Steps**:
    1. Open bulk reject modal.
    2. Leave the rejection reason empty.
    3. Confirm.
  - **Expected Result**: Validation error is shown and no bulk rejection occurs.
  - **Business Rules**: BR-ADM-002, BR-ADM-012
  - **API**: `POST /api/v1/admin/ads/bulk/reject`

- [ ] **A-06**: Create fee setting with invalid values
  - **Precondition**: Admin is on fee setting create modal.
  - **Steps**:
    1. Enter daily rate `0` or negative values.
    2. Enter duration `0` or negative values.
    3. Enter max ads `0`.
    4. Save.
  - **Expected Result**: Validation errors block creation; no fee record is added.
  - **Business Rules**: BR-ADM-020
  - **API**: `POST /api/v1/admin/ad-fees`

- [ ] **A-07**: Create duplicate active fee setting for same placement and tier
  - **Precondition**: An active fee setting already exists for the requested placement and tier.
  - **Steps**:
    1. Attempt to create another fee setting with the same placement and tier.
  - **Expected Result**: Conflict error shown and duplicate active record is rejected.
  - **Business Rules**: BR-ADM-024
  - **API**: `POST /api/v1/admin/ad-fees`

- [ ] **A-08**: Deactivate an already inactive fee setting
  - **Precondition**: Selected fee setting status is already inactive.
  - **Steps**:
    1. Click "Deactivate" again.
  - **Expected Result**: Error message prevents invalid state transition.
  - **Business Rules**: BR-ADM-023
  - **API**: `PATCH /api/v1/admin/ad-fees/:id/deactivate`

- [ ] **A-09**: Search ads with no matching result
  - **Precondition**: Shop search query has no match.
  - **Steps**:
    1. Use a shop name that does not exist.
  - **Expected Result**: Empty state appears with a message such as "No advertisements found." and no console errors.
  - **Business Rules**: None (Search)
  - **API**: `GET /api/v1/admin/ads?shop={query}`

- [ ] **A-10**: Export reports with invalid date range
  - **Precondition**: Admin is on the export or analytics screen.
  - **Steps**:
    1. Set `dateTo` earlier than `dateFrom`.
    2. Trigger export or analytics update.
  - **Expected Result**: Validation error or disabled action; no incomplete export file is created.
  - **Business Rules**: BR-ADM-030, BR-ADM-040
  - **API**: `GET /api/v1/admin/ads/analytics/revenue`, `POST /api/v1/admin/ads/export/ad-performance`

- [ ] **A-11**: Access ad management routes without authentication
  - **Precondition**: User is logged out or token is missing.
  - **Steps**:
    1. Navigate directly to `/admin/ads` or `/admin/ads/packages`.
  - **Expected Result**: Redirect to login or `401 Unauthorized`; page content is not displayed.
  - **Business Rules**: BR-ADM-001

- [ ] **A-12**: Review list excludes draft ads that are still pending payment
  - **Precondition**: There are merchant advertisements that were created but not yet paid.
  - **Steps**:
    1. Access `/admin/ads`.
    2. Confirm the list loads with paid submissions only.
  - **Expected Result**: Draft ads with `paymentStatus = 'pending'` do not appear in the review queue and no approval actions are available for them.
  - **Business Rules**: BR-ADM-005
  - **API**: `GET /api/v1/admin/ads`

- [ ] **A-13**: Reject an ad that has no completed payment
  - **Precondition**: Admin rejects an ad whose payment status is not `completed`.
  - **Steps**:
    1. Open a pending ad with no successful charge.
    2. Reject it with a valid reason.
  - **Expected Result**: Ad becomes `rejected`, rejection reason is saved, and no refund is attempted; the payment status remains unchanged when no payment exists.
  - **Business Rules**: BR-ADM-002, BR-ADM-004
  - **API**: `POST /api/v1/admin/ads/:id/reject`

- [ ] **A-14**: Revenue analytics rejects invalid or out-of-range date windows
  - **Precondition**: Admin opens analytics with a date filter.
  - **Steps**:
    1. Set `dateTo` before `dateFrom`.
    2. Or set a range longer than 365 days.
    3. Trigger analytics.
  - **Expected Result**: Backend returns validation errors and no analytics payload is generated.
  - **Business Rules**: BR-ADM-030
  - **API**: `GET /api/v1/admin/ads/analytics/revenue`

- [ ] **A-15**: Fee history delete action rejects current-month records
  - **Precondition**: A fee history row exists for the current calendar month.
  - **Steps**:
    1. Attempt to delete that row via single or bulk deletion.
  - **Expected Result**: Request fails with a validation error; rows from previous months remain deletable.
  - **Business Rules**: BR-ADM-025
  - **API**: `DELETE /api/v1/admin/ad-fees/history`, `DELETE /api/v1/admin/ad-fees/history/:id`

- [ ] **A-16**: Export endpoints reject date ranges over 365 days and non-CSV formats
  - **Precondition**: Admin is authenticated and can submit export requests.
  - **Steps**:
    1. Submit each of the three report requests with a date range longer than 365 days.
    2. Submit a request with a format other than `csv`.
  - **Expected Result**: Each invalid request is rejected with a validation error; no file is downloaded and no successful export audit event is recorded.
  - **Business Rules**: BR-ADM-040
  - **API**: `POST /api/v1/admin/ads/export/ad-performance`, `POST /api/v1/admin/ads/export/submission-history`, `POST /api/v1/admin/ads/export/fee-history`

- [ ] **A-17**: Bulk fee-history deletion is atomic when an ID is protected or missing
  - **Precondition**: An eligible previous-month record, a protected current-month record, and a nonexistent ID are available.
  - **Steps**:
    1. Submit a bulk delete containing both an eligible previous-month ID and a current-month ID.
    2. Submit another bulk delete containing an eligible ID and a nonexistent ID.
  - **Expected Result**: Each request is rejected and none of the eligible records in either request are deleted.
  - **Business Rules**: BR-ADM-025
  - **API**: `DELETE /api/v1/admin/ad-fees/history`

- [ ] **A-18**: Bulk rejection continues after a refund failure
  - **Precondition**: At least two pending ads are selected; refund processing fails for one ad and succeeds for another.
  - **Steps**:
    1. Bulk reject the selected ads with a valid common reason.
    2. Inspect the response summary and payment records.
  - **Expected Result**: All selected ads remain rejected; successful refunds complete, processing continues after the failure, and `refundsProcessed`, `refundsFailed`, `failed`, and per-ad `refundStatus` accurately report the outcome.
  - **Business Rules**: BR-ADM-004, BR-ADM-013
  - **API**: `POST /api/v1/admin/ads/bulk/reject`

- [ ] **A-19**: Ad list rejects invalid filters and pagination parameters
  - **Precondition**: Admin is authenticated.
  - **Steps**:
    1. Request an invalid status, placement, or tier.
    2. Request `page=0`, `limit=0`, or `limit=101`.
    3. Request a shop search longer than 255 characters.
  - **Expected Result**: Each invalid query is rejected with a validation error rather than returning a successful list response.
  - **Business Rules**: BR-ADM-001
  - **API**: `GET /api/v1/admin/ads`

- [ ] **A-20**: Ad list rejects a reversed date range
  - **Precondition**: Admin is authenticated.
  - **Steps**:
    1. Request the ad list with `dateFrom` later than `dateTo`.
  - **Expected Result**: The request is rejected with a validation error; it does not return a successful empty result for an invalid range.
  - **Business Rules**: BR-ADM-001
  - **API**: `GET /api/v1/admin/ads`

- [ ] **A-21**: Bulk moderation rejects a mixed request with a missing or non-pending ad
  - **Precondition**: At least two pending ads exist; the request can also include a nonexistent ID or an ad that is no longer pending.
  - **Steps**:
    1. Submit a bulk approve or bulk reject request containing valid pending ad IDs and one missing or non-pending ID.
    2. Inspect all requested ads and their notifications/audit events.
  - **Expected Result**: The request is rejected before mutation; no pending ad in the request is partially processed and no moderation notifications or audit events are generated.
  - **Business Rules**: BR-ADM-010, BR-ADM-011, BR-ADM-012, BR-ADM-013
  - **API**: `POST /api/v1/admin/ads/bulk/approve`, `POST /api/v1/admin/ads/bulk/reject`

---

## 3. Boundary Scenarios (B) — Edge Cases & Limits

- [ ] **B-01**: Fee setting at minimum values
  - **Precondition**: Admin is on the fee creation modal.
  - **Steps**:
    1. Enter the minimum valid daily rate, duration, and max ads values.
    2. Save.
  - **Expected Result**: Fee creation succeeds and the record is stored with valid minimum values.
  - **Business Rules**: BR-ADM-020

- [ ] **B-02**: Fee setting at maximum reasonable values
  - **Precondition**: Admin is on the fee creation modal.
  - **Steps**:
    1. Enter the upper limit values allowed by frontline validation.
    2. Save.
  - **Expected Result**: Fee setting is accepted without truncation or validation failure.
  - **Business Rules**: BR-ADM-020

- [ ] **B-03**: Rejection reason at maximum length (1000 chars)
  - **Precondition**: Admin is on the reject modal.
  - **Steps**:
    1. Enter exactly 1000 characters in the rejection reason field.
    2. Submit.
  - **Expected Result**: Request succeeds and the full reason is stored without truncation.
  - **Business Rules**: BR-ADM-002

- [ ] **B-04**: Rejection reason beyond maximum length
  - **Precondition**: Admin is on the reject modal.
  - **Steps**:
    1. Enter 1001 characters in the rejection reason field.
  - **Expected Result**: Validation error is shown and the request is blocked.
  - **Business Rules**: BR-ADM-002

- [ ] **B-05**: Bulk selection limit exactly 50 ads
  - **Precondition**: At least 50 pending ads are available.
  - **Steps**:
    1. Select exactly 50 ads.
    2. Trigger bulk approval or bulk reject.
  - **Expected Result**: The batch operation succeeds within the allowed limit.
  - **Business Rules**: BR-ADM-010, BR-ADM-011

- [ ] **B-06**: Bulk selection limit at 51 ads
  - **Precondition**: At least 51 pending ads are available.
  - **Steps**:
    1. Select 51 ads.
  - **Expected Result**: Validation blocks the operation and a clear limit message is displayed.
  - **Business Rules**: BR-ADM-010

- [ ] **B-07**: Empty state when no ads exist
  - **Precondition**: No advertisements exist in the system or filtered dataset is empty.
  - **Steps**:
    1. Navigate to `/admin/ads`.
  - **Expected Result**: Empty-state UI is displayed with a clear message and no broken table layout.
  - **Business Rules**: None (Empty state)

- [ ] **B-08**: Analytics exact date range boundary
  - **Precondition**: Data exists for a single day or exact start/end date.
  - **Steps**:
    1. Set start and end dates to the same day.
    2. Run analytics.
  - **Expected Result**: Revenue and counts reflect exactly that date range without off-by-one errors.
  - **Business Rules**: BR-ADM-030

- [ ] **B-09**: Search shop name with very long input
  - **Precondition**: Admin is on the ad list page.
  - **Steps**:
    1. Enter a very long shop name string near the field limit.
  - **Expected Result**: Input accepts the configured maximum length and filtering still behaves correctly.
  - **Business Rules**: None (Search)

- [ ] **B-10**: Fee setting reactivation boundary
  - **Precondition**: A fee setting is inactive and another identical placement/tier record is not active.
  - **Steps**:
    1. Reactivate the inactive setting.
    2. Attempt to reactivate it again.
  - **Expected Result**: First action succeeds and the second is blocked with a conflict error.
  - **Business Rules**: BR-ADM-023

- [ ] **B-11**: History deletion boundary by month
  - **Precondition**: History records exist for both the current month and a prior month.
  - **Steps**:
    1. Attempt to delete a current-month record.
    2. Attempt to delete a previous-month record.
  - **Expected Result**: Current-month deletion is rejected; previous-month deletion succeeds.
  - **Business Rules**: BR-ADM-025

- [ ] **B-12**: Fee-history bulk deletion limit at 50 and 51 records
  - **Precondition**: At least 51 eligible previous-month history records exist.
  - **Steps**:
    1. Select and delete exactly 50 records.
    2. Attempt to submit 51 record IDs in one bulk request.
  - **Expected Result**: Deleting 50 records succeeds; the 51-record request is blocked with a clear maximum-size validation error.
  - **Business Rules**: BR-ADM-025
  - **API**: `DELETE /api/v1/admin/ad-fees/history`

- [ ] **B-13**: Submission-history export preserves each review event
  - **Precondition**: An ad submission was created within the selected date range, then rejected and later approved within that range, with both review audit events recorded.
  - **Steps**:
    1. Export submission history for the range containing both review events.
    2. Inspect the CSV rows for that ad.
  - **Expected Result**: The CSV has a separate row for each review event, with the corresponding status, reviewer, and review timestamp; ads without review events in the range still appear once with their current status.
  - **Business Rules**: BR-ADM-040
  - **API**: `POST /api/v1/admin/ads/export/submission-history`

- [ ] **B-14**: CSV values containing commas, quotes, or line breaks are escaped
  - **Precondition**: Export data includes a text value with a comma, double quote, or line break.
  - **Steps**:
    1. Generate the applicable CSV report.
    2. Parse the output and compare the affected field with its original value.
  - **Expected Result**: CSV quoting and escaped double quotes preserve the original field value without shifting columns or corrupting rows.
  - **Business Rules**: BR-ADM-040
  - **API**: `POST /api/v1/admin/ads/export/ad-performance`, `POST /api/v1/admin/ads/export/submission-history`, `POST /api/v1/admin/ads/export/fee-history`

- [ ] **B-15**: Export with no matching records returns a valid empty CSV
  - **Precondition**: Admin is authenticated and the chosen report filters match no records.
  - **Steps**:
    1. Generate each report type for a valid date range with filters that match no records.
    2. Inspect the downloaded files and export audit events.
  - **Expected Result**: Each request succeeds with a CSV containing its header row and no data rows; the audit event records `rowCount = 0`.
  - **Business Rules**: BR-ADM-040
  - **API**: `POST /api/v1/admin/ads/export/ad-performance`, `POST /api/v1/admin/ads/export/submission-history`, `POST /api/v1/admin/ads/export/fee-history`

- [ ] **B-16**: Fee-history deletion follows the UTC calendar-month boundary
  - **Precondition**: Fee-history records exist immediately before and at the UTC start of the current month.
  - **Steps**:
    1. Attempt to delete a record created immediately before the UTC month boundary.
    2. Attempt to delete a record created at the UTC month boundary.
  - **Expected Result**: The previous-month record is eligible for deletion; the record at the start of the current UTC month is protected.
  - **Business Rules**: BR-ADM-025
  - **API**: `DELETE /api/v1/admin/ad-fees/history`, `DELETE /api/v1/admin/ad-fees/history/:id`

- [ ] **B-17**: Revenue analytics with no matching approved ads
  - **Precondition**: No approved advertisements match the selected date range and filters.
  - **Steps**:
    1. Run revenue analytics for the empty result set.
  - **Expected Result**: Summary metrics return zero values, placement/tier breakdowns and trend are empty, and the UI displays "No data" states without broken charts.
  - **Business Rules**: BR-ADM-030
  - **API**: `GET /api/v1/admin/ads/analytics/revenue`

- [ ] **B-18**: Ad list pagination at minimum and maximum page sizes
  - **Precondition**: Admin is authenticated and at least 100 advertisements are available.
  - **Steps**:
    1. Request the ad list with `limit=1`.
    2. Request the ad list with `limit=100`.
  - **Expected Result**: Both requests succeed and return correct page contents and pagination metadata without exceeding the requested limit.
  - **Business Rules**: BR-ADM-001
  - **API**: `GET /api/v1/admin/ads`

- [ ] **B-19**: Single rejection refunds every completed payment for the ad
  - **Precondition**: A pending ad has multiple completed payment records.
  - **Steps**:
    1. Reject the ad with a valid reason.
    2. Inspect each payment record and the `AD_REJECTED` audit event.
  - **Expected Result**: Every completed payment is refunded in full with the rejection reason; the advertisement is marked refunded, and the audit event records the sum of the completed payment amounts.
  - **Business Rules**: BR-ADM-002, BR-ADM-004, BR-ADM-005
  - **API**: `POST /api/v1/admin/ads/:id/reject`

---

## 4. Interface Scenarios (I) — API Contracts & Payloads

> API contract tests are intentionally kept as high-value contract checks. Evidence lines reference the test title and status only, since API tests do not require screenshots by design.

- [ ] **I-01**: `GET /api/v1/admin/ads` — returns paginated ad list with filters
  - **Evidence**:
    - API test — no screenshot
    - Test: ad-management.api.spec.ts › "should return paginated ads for admin with filters" — pending
  - **Precondition**: Admin token is valid and multiple ads exist.
  - **Steps**:
    1. Call `GET /api/v1/admin/ads` with status, placement, tier, shop, dateFrom/dateTo, page, and limit.
    2. Confirm response is `200 OK`.
  - **Expected Response**: Response includes `data` and `meta` with total count and pagination metadata; each returned ad satisfies every supplied filter together, and `meta.total` reflects that combined result set.
  - **Business Rules**: BR-ADM-001, BR-ADM-005
  - **API**: `GET /api/v1/admin/ads`

- [ ] **I-02**: `GET /api/v1/admin/ads/:id` — returns full ad detail
  - **Evidence**:
    - API test — no screenshot
    - Test: ad-management.api.spec.ts › "should return full detail for a single advertisement" — pending
  - **Precondition**: Valid ad ID and admin token.
  - **Steps**:
    1. Call `GET /api/v1/admin/ads/:id`.
  - **Expected Response**: `200 OK` with shop, fee, payment, and analytics information.
  - **Business Rules**: BR-ADM-003, BR-ADM-005
  - **API**: `GET /api/v1/admin/ads/:id`

- [ ] **I-03**: `POST /api/v1/admin/ads/:id/approve` — approves a pending ad
  - **Evidence**:
    - API test — no screenshot
    - Test: ad-management.api.spec.ts › "should approve a pending ad and set approval metadata" — pending
  - **Precondition**: Valid admin token and ad in `pending` state.
  - **Steps**:
    1. Call `POST /api/v1/admin/ads/:id/approve`.
  - **Expected Response**: `200 OK` and updated state shows `approvalStatus = 'approved'` with `approvedBy` and `approvedAt` set.
  - **Business Rules**: BR-ADM-001, BR-ADM-003, BR-ADM-005
  - **API**: `POST /api/v1/admin/ads/:id/approve`

- [ ] **I-04**: `POST /api/v1/admin/ads/:id/reject` — rejects a pending ad with reason
  - **Evidence**:
    - API test — no screenshot
    - Test: ad-management.api.spec.ts › "should reject a pending ad and trigger refund" — pending
  - **Precondition**: Valid admin token, pending ad, and rejection reason.
  - **Steps**:
    1. Call `POST /api/v1/admin/ads/:id/reject` with `rejection_reason` payload.
  - **Expected Response**: `200 OK`; state becomes `rejected` and refund fields are set for completed payments.
  - **Business Rules**: BR-ADM-002, BR-ADM-004, BR-ADM-005
  - **API**: `POST /api/v1/admin/ads/:id/reject`

- [ ] **I-05**: `POST /api/v1/admin/ads/bulk/approve` — validates selection and batch result
  - **Evidence**:
    - API test — no screenshot
    - Test: ad-management.api.spec.ts › "should bulk approve only pending ads within limit" — pending
  - **Precondition**: Admin token and valid array of `ad_ids`.
  - **Steps**:
    1. Call `POST /api/v1/admin/ads/bulk/approve` with selected IDs.
  - **Expected Response**: `200 OK` with summary result, or `400` if any ad is not pending or limit is exceeded.
  - **Business Rules**: BR-ADM-010, BR-ADM-011
  - **API**: `POST /api/v1/admin/ads/bulk/approve`

- [ ] **I-06**: `POST /api/v1/admin/ads/bulk/reject` — rejects multiple ads with a common reason and refund summary
  - **Evidence**:
    - API test — no screenshot
    - Test: ad-management.api.spec.ts › "should bulk reject ads and include refund summary" — pending
  - **Precondition**: Admin token, selected `ad_ids`, and common `rejection_reason`.
  - **Steps**:
    1. Call `POST /api/v1/admin/ads/bulk/reject`.
  - **Expected Response**: `200 OK` with `approved/rejected` result summary and refund details.
  - **Business Rules**: BR-ADM-002, BR-ADM-004, BR-ADM-012, BR-ADM-013
  - **API**: `POST /api/v1/admin/ads/bulk/reject`

- [ ] **I-07**: `GET /api/v1/admin/ad-fees` — returns active and inactive fee settings
  - **Evidence**:
    - API test — no screenshot
    - Test: ad-fee.api.spec.ts › "should list fee settings with placement/tier metadata" — pending
  - **Precondition**: Admin token.
  - **Steps**:
    1. Call `GET /api/v1/admin/ad-fees`.
  - **Expected Response**: `200 OK`; settings array includes `placement`, `tier`, `dailyRate`, `durationDays`, and `maxAds`.
  - **Business Rules**: BR-ADM-020, BR-ADM-021
  - **API**: `GET /api/v1/admin/ad-fees`

- [ ] **I-08**: `POST /api/v1/admin/ad-fees` — creates a fee setting with proper validation
  - **Evidence**:
    - API test — no screenshot
    - Test: ad-fee.api.spec.ts › "should create a valid fee setting and log history" — pending
  - **Precondition**: Admin token and valid placement/tier payload.
  - **Steps**:
    1. POST a valid payload with `daily_rate`, `duration_days`, `max_ads`, and `change_reason`.
  - **Expected Response**: `201 Created` and fee history record created.
  - **Business Rules**: BR-ADM-020, BR-ADM-024
  - **API**: `POST /api/v1/admin/ad-fees`

- [ ] **I-09**: `PUT /api/v1/admin/ad-fees/:id` — updates fee setting and snapshots old values
  - **Evidence**:
    - API test — no screenshot
    - Test: ad-fee.api.spec.ts › "should update fee setting and keep historical snapshot" — pending
  - **Precondition**: Existing fee setting id and valid admin token.
  - **Steps**:
    1. Call `PUT /api/v1/admin/ad-fees/:id` with an updated fee payload.
  - **Expected Response**: `200 OK` and a corresponding history record showing previous values.
  - **Business Rules**: BR-ADM-022, BR-ADM-025
  - **API**: `PUT /api/v1/admin/ad-fees/:id`

- [ ] **I-10**: `PATCH /api/v1/admin/ad-fees/:id/deactivate` — deactivates a fee setting
  - **Evidence**:
    - API test — no screenshot
    - Test: ad-fee.api.spec.ts › "should deactivate fee setting without affecting existing ads" — pending
  - **Precondition**: Valid id for an active fee setting.
  - **Steps**:
    1. Send a PATCH request to deactivate.
  - **Expected Response**: `200 OK`, setting becomes inactive, and existing ad assignments remain intact.
  - **Business Rules**: BR-ADM-023, BR-ADM-025
  - **API**: `PATCH /api/v1/admin/ad-fees/:id/deactivate`

- [ ] **I-11**: `GET /api/v1/admin/ad-fees/history` — returns fee change log
  - **Evidence**:
    - API test — no screenshot
    - Test: ad-fee.api.spec.ts › "should return fee history sorted by created time" — pending
  - **Precondition**: Fee history exists.
  - **Steps**:
    1. Call `GET /api/v1/admin/ad-fees/history`.
  - **Expected Response**: `200 OK` with dates, placement, tier, old/new rate values, and change reason.
  - **Business Rules**: BR-ADM-022, BR-ADM-025
  - **API**: `GET /api/v1/admin/ad-fees/history`

- [ ] **I-12**: `GET /api/v1/admin/ads/analytics/revenue` — returns revenue metrics and charts payload
  - **Evidence**:
    - API test — no screenshot
    - Test: ad-analytics.api.spec.ts › "should return total revenue and breakdown metrics" — pending
  - **Precondition**: Valid admin token and approved ads within the filtered date range.
  - **Steps**:
    1. Call `GET /api/v1/admin/ads/analytics/revenue` with date range and optional filters.
  - **Expected Response**: `200 OK`; payload includes totals and placement/tier breakdown data.
  - **Business Rules**: BR-ADM-030, BR-ADM-031
  - **API**: `GET /api/v1/admin/ads/analytics/revenue`

- [ ] **I-13**: `POST /api/v1/admin/ads/export/ad-performance` — downloads CSV report
  - **Evidence**:
    - API test — no screenshot
    - Test: ad-export.api.spec.ts › "should export CSV ad performance report" — pending
  - **Precondition**: Valid admin token and ad performance records.
  - **Steps**:
    1. Call `POST /api/v1/admin/ads/export/ad-performance`.
  - **Expected Response**: `200 OK` with CSV body or attachment header; excludes sensitive fields.
  - **Business Rules**: BR-ADM-040, BR-ADM-041
  - **API**: `POST /api/v1/admin/ads/export/ad-performance`

- [ ] **I-14**: `POST /api/v1/admin/ads/export/submission-history` — exports shop submission history
  - **Evidence**:
    - API test — no screenshot
    - Test: ad-export.api.spec.ts › "should export shop submission history CSV" — pending
  - **Precondition**: Valid admin token and submission history data.
  - **Steps**:
    1. Call `POST /api/v1/admin/ads/export/submission-history`.
  - **Expected Response**: `200 OK` with CSV export that includes submission status and outcomes.
  - **Business Rules**: BR-ADM-040
  - **API**: `POST /api/v1/admin/ads/export/submission-history`

- [ ] **I-15**: `POST /api/v1/admin/ads/export/fee-history` — exports fee history log
  - **Evidence**:
    - API test — no screenshot
    - Test: ad-export.api.spec.ts › "should export fee history log as CSV" — pending
  - **Precondition**: Valid admin token and fee-history entries.
  - **Steps**:
    1. Call `POST /api/v1/admin/ads/export/fee-history`.
  - **Expected Response**: `200 OK` with CSV payload containing fee change records and reasons.
  - **Business Rules**: BR-ADM-040
  - **API**: `POST /api/v1/admin/ads/export/fee-history`

- [ ] **I-16**: `PATCH /api/v1/admin/ad-fees/:id/reactivate` — reactivates an inactive fee setting
  - **Evidence**:
    - API test — no screenshot
    - Test: ad-fee.api.spec.ts › "should reactivate a fee setting and log the change" — pending
  - **Precondition**: Valid admin token and a deactivated fee setting id.
  - **Steps**:
    1. Call `PATCH /api/v1/admin/ad-fees/:id/reactivate` with an optional reactivation reason.
  - **Expected Response**: `200 OK`; setting becomes active and a fee history entry is created with the reactivation reason.
  - **Business Rules**: BR-ADM-023, BR-ADM-025
  - **API**: `PATCH /api/v1/admin/ad-fees/:id/reactivate`

- [ ] **I-17**: `DELETE /api/v1/admin/ad-fees/history` — blocks current-month deletion but allows earlier-history cleanup
  - **Evidence**:
    - API test — no screenshot
    - Test: ad-fee.api.spec.ts › "should reject deleting current-month fee history and allow earlier records" — pending
  - **Precondition**: Admin token and fee history rows for different months.
  - **Steps**:
    1. Submit a delete request containing a current-month id.
    2. Submit a second request with a previous-month id.
  - **Expected Response**: First request fails with `400` and second succeeds with `200` and a deleted count.
  - **Business Rules**: BR-ADM-025
  - **API**: `DELETE /api/v1/admin/ad-fees/history`, `DELETE /api/v1/admin/ad-fees/history/:id`

- [ ] **I-18**: `GET /api/v1/admin/ad-fees/history` — filters by calendar month and paginates
  - **Evidence**:
    - API contract test — pending; no screenshot
  - **Precondition**: Valid admin token and history records spanning multiple months and pages.
  - **Steps**:
    1. Request the endpoint with `month` in `YYYY-MM` format, placement/tier filters, page, and limit.
    2. Confirm the response is `200 OK`.
  - **Expected Response**: Every returned record matches the filters; `data` and `meta` include the filtered total and pagination values.
  - **Business Rules**: BR-ADM-022, BR-ADM-025
  - **API**: `GET /api/v1/admin/ad-fees/history`

- [ ] **I-19**: Export endpoints apply report-specific filters and record audit metadata
  - **Evidence**:
    - API contract test — pending; no screenshot
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
- When a scenario is executed and passed, update the item to `- [x]` and add the required evidence block as specified in the PCL template guide.
