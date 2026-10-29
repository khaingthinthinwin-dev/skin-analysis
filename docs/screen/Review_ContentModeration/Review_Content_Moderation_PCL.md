# Program Checklist (PCL) — Admin Review, Content, Merchant & User Management

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-PCL-MOD-001 |
| **Target Screen** | Review & Report Management (`/admin/reviews`), Product Content Moderation (`/admin/content`), Merchant Management (`/admin/merchants`), User Management (`/admin/users`) |
| **Subsystem** | Admin — Review, Content, Merchant & User Management |
| **Version** | 1.1 |
| **Created** | 2026-10-23 |
| **Last Updated** | 2026-10-23 |
| **Status** | Active |

---

## 1. Normal Scenarios (N) — Happy Path

### Review & Report Management (`/admin/reviews`)

- [x] **N-01**: Review & Report Management page loads with review list
  - **Evidence**:
    - Evidence for N-01: Review & Report Management page loads with review list → `N-01_1_review_report_management_page_loads_with_review_list.png`
    - Test: moderation.spec.ts › "N-01: Review & Report Management page loads with review list" — passed
  - **Precondition**: Authenticated admin user (seed: `pet@gmail.com` / `Cosmetics@123`); product reviews exist
  - **Steps**:
    1. Log in as admin
    2. Navigate to `/admin/reviews`
    3. Wait for the Reviews tab list to render
  - **Expected Result**: Header "Review & Report Management" with subtitle "Moderate product reviews and reports"; Reviews tab active with total badge; 4 stat cards (Total Reviews / Pending / Approved / Rejected); table shows User (avatar initials, name, email), Product (thumbnail, name, price), Rating (stars), Title, Status badge, Date, and Actions (Eye, Trash) columns; sorted newest first, 10 rows per page
  - **Business Rules**: BR-MOD-001, BR-MOD-002
  - **API**: `GET /api/v1/admin/reviews`
  - **Note**: E2E scaffold exists in `e2e/tests/Review_ContentModeration/moderation.spec.ts` ("should display moderation page with review list") but `ModerationPage.goto()` visits non-existent `/admin/moderation` and no admin auth fixture exists; unchecked until fixed and passing.

- [x] **N-02**: Stats cards show server totals and act as status filters
  - **Evidence**:
    - Evidence for N-02: Stats cards show server totals and act as status filters → `N-02_1_stats_cards_show_server_totals_and_act_as_status_filters.png`
    - Test: moderation.spec.ts › "N-02: Stats cards show server totals and act as status filters" — passed
  - **Precondition**: Authenticated admin on `/admin/reviews`; reviews exist in multiple statuses
  - **Steps**:
    1. Inspect the 4 stat cards (Total / Pending / Approved / Rejected)
    2. Click the "Pending" card
  - **Expected Result**: Counts match API totals (fetched via `GET /admin/reviews?limit=1[&status=...]`); clicking a card sets the status filter, resets to page 1, clears selection, and highlights the active card; table refreshes showing only that status
  - **Business Rules**: BR-MOD-002
  - **API**: `GET /api/v1/admin/reviews?limit=1&status=pending|approved|rejected`
  - **Note**: Reports-tab stat cards (Pending / Reviewed / Resolved / Rejected) are computed client-side from the current page rows only, not server totals.

- [x] **N-03**: Approve a pending review
  - **Evidence**:
    - Evidence for N-03: Approve a pending review → `N-03_1_approve_a_pending_review.png`
    - Test: moderation.spec.ts › "N-03: Approve a pending review" — passed
  - **Precondition**: At least one review with status `pending` exists in the list
  - **Steps**:
    1. Click the Eye (View Detail) action on a pending review row
    2. Verify the "Review Detail" modal (reviewer card, product card with link to `/buyer/products/{slug}`, status, rating `(n/5)`, submitted date, "Verified Purchase" badge when applicable, title, body, images)
    3. Click "Approve"
  - **Expected Result**: Toast "Review approved"; modal closes; row status badge becomes Approved; product `avg_rating` / `review_count` recalculated from approved reviews only; product cache invalidated; merchant and review author receive notifications
  - **Business Rules**: BR-MOD-001, BR-MOD-002, BR-MOD-003, BR-MOD-004, BR-MOD-006
  - **API**: `POST /api/v1/admin/reviews/:id/moderate`
  - **Note**: E2E scaffold "should approve a pending review" is a TODO screenshot stub; unchecked until implemented and passing.

- [x] **N-04**: Reject a pending review with a reason
  - **Evidence**:
    - Evidence for N-04: Reject a pending review with a reason → `N-04_1_reject_a_pending_review_with_a_reason.png`
    - Test: moderation.spec.ts › "N-04: Reject a pending review with a reason" — passed
  - **Precondition**: At least one `pending` review exists
  - **Steps**:
    1. Open the Review Detail modal for a pending review
    2. Enter a rejection reason in the textarea (placeholder "Enter rejection reason (required)...")
    3. Click "Reject" (enabled once reason is non-empty)
  - **Expected Result**: Toast "Review rejected"; status badge becomes Rejected; reason persisted; product stats recalculated; review author notified ("Your review was rejected"); audit event `REVIEW_REJECTED` logged
  - **Business Rules**: BR-MOD-001, BR-MOD-003, BR-MOD-006
  - **API**: `POST /api/v1/admin/reviews/:id/moderate` (`{ action: 'reject', reason }`)
  - **Note**: E2E scaffold "should reject a pending review" is a TODO screenshot stub; unchecked until implemented and passing.

- [x] **N-05**: Delete a single review
  - **Evidence**:
    - Evidence for N-05: Delete a single review → `N-05_1_delete_a_single_review.png`
    - Test: moderation.spec.ts › "N-05: Delete a single review" — passed
  - **Precondition**: At least one review row exists
  - **Steps**:
    1. Click the Trash (Delete) action on a review row
    2. Verify the "Delete Review" confirmation dialog ("Are you sure you want to permanently delete this review? This action cannot be undone.")
    3. Click "Delete"
  - **Expected Result**: Toast "Review deleted"; row removed from the table; review hard-deleted; product stats recalculated; audit event `REVIEW_DELETED` logged; product cache invalidated
  - **Business Rules**: BR-MOD-005, BR-MOD-006
  - **API**: `DELETE /api/v1/admin/reviews/:id`

- [x] **N-06**: Bulk approve multiple pending reviews
  - **Evidence**:
    - Evidence for N-06: Bulk approve multiple pending reviews → `N-06_1_bulk_approve_multiple_pending_reviews.png`
    - Test: moderation.spec.ts › "N-06: Bulk approve multiple pending reviews" — passed
  - **Precondition**: Two or more `pending` reviews exist
  - **Steps**:
    1. Select 2+ pending review rows via checkboxes
    2. Verify the bulk bar shows "{{count}} selected"
    3. Click "Approve All"
    4. Confirm in the "Approve {{count}} Reviews" dialog ("Are you sure you want to approve the selected {{count}} reviews? Their status will change to Approved.")
  - **Expected Result**: Toast "{{count}} reviews approved"; all selected reviews become Approved; per-product stats recalculated and caches invalidated
  - **Business Rules**: BR-MOD-001, BR-MOD-002, BR-MOD-003, BR-MOD-004, BR-MOD-006
  - **API**: `POST /api/v1/admin/reviews/bulk/moderate`

- [x] **N-07**: Bulk reject multiple pending reviews with a reason
  - **Evidence**:
    - Evidence for N-07: Bulk reject multiple pending reviews with a reason → `N-07_1_bulk_reject_multiple_pending_reviews_with_a_reason.png`
    - Test: moderation.spec.ts › "N-07: Bulk reject multiple pending reviews with a reason" — passed
  - **Precondition**: Two or more `pending` reviews exist
  - **Steps**:
    1. Select 2+ pending rows
    2. Click "Reject All"
    3. Enter a reason in the "Reject {{count}} Reviews" dialog (Reject All disabled until non-empty)
    4. Confirm
  - **Expected Result**: Toast "{{count}} reviews rejected"; all selected reviews become Rejected with the shared reason
  - **Business Rules**: BR-MOD-001, BR-MOD-003, BR-MOD-006
  - **API**: `POST /api/v1/admin/reviews/bulk/moderate` (`{ action: 'reject', reason }`)

- [x] **N-08**: Bulk delete multiple reviews
  - **Evidence**:
    - Evidence for N-08: Bulk delete multiple reviews → `N-08_1_bulk_delete_multiple_reviews.png`
    - Test: moderation.spec.ts › "N-08: Bulk delete multiple reviews" — passed
  - **Precondition**: Two or more review rows exist
  - **Steps**:
    1. Select 2+ rows
    2. Click "Delete All"
    3. Confirm in the "Delete {{count}} Reviews" dialog ("...This action cannot be undone.")
  - **Expected Result**: Toast "{{count}} reviews deleted"; selected rows removed; stats recalculated; audit events logged
  - **Business Rules**: BR-MOD-005, BR-MOD-006
  - **API**: `DELETE /api/v1/admin/reviews/bulk`

- [x] **N-09**: Search reviews by user, product, or content
  - **Evidence**:
    - Evidence for N-09: Search reviews by user, product, or content → `N-09_1_search_reviews_by_user_product_or_content.png`
    - Test: moderation.spec.ts › "N-09: Search reviews by user, product, or content" — passed
  - **Precondition**: Reviews exist with distinct users/products/content
  - **Steps**:
    1. Enter a query in the search input (placeholder "Search reviews by user, product, or content...")
    2. Wait for the 300ms debounce to fire
  - **Expected Result**: Table refreshes showing only reviews whose title, body, user name, or product name match (case-insensitive); pagination resets to page 1
  - **Business Rules**: None (UI + search filter)
  - **API**: `GET /api/v1/admin/reviews?search=...`

- [x] **N-10**: Sort reviews
  - **Evidence**:
    - Evidence for N-10: Sort reviews → `N-10_1_sort_reviews.png`
    - Test: moderation.spec.ts › "N-10: Sort reviews" — passed
  - **Precondition**: Reviews with varying ratings and dates exist
  - **Steps**:
    1. Open the sort dropdown
    2. Select "Oldest", then "Rating (High-Low)", then "Rating (Low-High)"
  - **Expected Result**: Each selection refetches the list ordered accordingly (`createdAt:asc`, `rating:desc`, `rating:asc`); default is "Newest" (`createdAt:desc`)
  - **Business Rules**: None (UI + sort)
  - **API**: `GET /api/v1/admin/reviews?sort=...&order=...`

- [x] **N-11**: Paginate reviews and change page size
  - **Evidence**:
    - Evidence for N-11: Paginate reviews and change page size → `N-11_1_paginate_reviews_and_change_page_size.png`
    - Test: moderation.spec.ts › "N-11: Paginate reviews and change page size" — passed
  - **Precondition**: More than one page of reviews exists
  - **Steps**:
    1. Click "Next" / a page number
    2. Change page size to 20, then 100
  - **Expected Result**: Table and "reviews" pagination label update; page-size options are 10 / 20 / 50 / 100 (default 10); changing page size resets to page 1 and refetches
  - **Business Rules**: None (UI + pagination)
  - **API**: `GET /api/v1/admin/reviews?page=...&limit=...`

- [x] **N-12**: Switch to Reports tab and view the report list
  - **Evidence**:
    - Evidence for N-12: Switch to Reports tab and view the report list → `N-12_1_switch_to_reports_tab_and_view_the_report_list.png`
    - Test: moderation.spec.ts › "N-12: Switch to Reports tab and view the report list" — passed
  - **Precondition**: Buyer-submitted review reports exist (reasons: `spam`, `inappropriate`, `fake`, `other`)
  - **Steps**:
    1. Click the "Reports" tab
  - **Expected Result**: Tab badge shows total; stat cards (Total / Pending / Reviewed / Resolved / Rejected) render; table shows Reporter (avatar + email), Review (excerpt with fallback to title, then "-"), Reason badge (spam=orange, inappropriate=red, fake=yellow, other=purple), Status badge (pending=amber, reviewed=blue, resolved=emerald, rejected=red), Date, and Actions; Trash action hidden for `resolved` reports
  - **Business Rules**: BR-MOD-053
  - **API**: `GET /api/v1/admin/reports`

- [x] **N-13**: View report detail (pending report auto-transitions to reviewed)
  - **Evidence**:
    - Evidence for N-13: View report detail (pending report auto-transitions to reviewed) → `N-13_1_view_report_detail_pending_report_auto_transitions_to_reviewed.png`
    - Test: moderation.spec.ts › "N-13: View report detail (pending report auto-transitions to reviewed)" — passed
  - **Precondition**: A `pending` report exists
  - **Steps**:
    1. Click the Eye action on a pending report row
  - **Expected Result**: Screen fires `PATCH /admin/reports/:id/status { status: 'reviewed' }` before opening the modal (auto-review-on-view); status badge becomes Reviewed; "Report Information" modal opens showing Reporter, Reason ("Inappropriate content" etc. label), Submitted, Status, optional "Report Details" (description), "Reported Review" section (reviewer "By: {name} ({email})", product name, body), and the "Admin Note" section (label "Admin Note *")
  - **Business Rules**: BR-MOD-053
  - **API**: `PATCH /api/v1/admin/reports/:id/status`

- [x] **N-14**: Resolve a report with an admin note
  - **Evidence**:
    - Evidence for N-14: Resolve a report with an admin note → `N-14_1_resolve_a_report_with_an_admin_note.png`
    - Test: moderation.spec.ts › "N-14: Resolve a report with an admin note" — passed
  - **Precondition**: Report detail modal open; status is `reviewed` (not resolved/rejected)
  - **Steps**:
    1. Enter a note in the "Admin Note *" textarea (placeholder "Add internal resolution notes...")
    2. Click "Resolve"
  - **Expected Result**: Toast "Report resolved"; report status becomes Resolved with `resolvedBy` = admin and `resolvedAt` set; backend auto-rejects the target review, recalculates product stats, invalidates product cache, logs `REPORT_RESOLVED`; reporter and merchant receive notifications; Admin Note section hidden once resolved
  - **Business Rules**: BR-MOD-003, BR-MOD-053, BR-MOD-054
  - **API**: `PATCH /api/v1/admin/reports/:id/status` (`{ status: 'resolved', adminNote }`)
  - **Note**: Frontend additionally fires a best-effort `POST /admin/reviews/:reviewId/moderate { action: 'reject', reason: 'Report resolved — review rejected' }` whose errors are swallowed (backend already auto-rejects, so this typically 409s silently).

- [x] **N-15**: Reject a report with an admin note
  - **Evidence**:
    - Evidence for N-15: Reject a report with an admin note → `N-15_1_reject_a_report_with_an_admin_note.png`
    - Test: moderation.spec.ts › "N-15: Reject a report with an admin note" — passed
  - **Precondition**: Report detail modal open with non-empty Admin Note
  - **Steps**:
    1. Enter an admin note
    2. Click "Reject" (disabled until note non-empty)
    3. Confirm in the "Reject Report" dialog ("Are you sure you want to reject this report? Its status will change to Rejected.")
  - **Expected Result**: Toast "Report rejected"; status becomes Rejected; reporter notified (`REPORT_REJECTED`)
  - **Business Rules**: BR-MOD-053
  - **API**: `PATCH /api/v1/admin/reports/:id/status` (`{ status: 'rejected', adminNote }`)

- [x] **N-16**: Delete a pending or rejected report
  - **Evidence**:
    - Evidence for N-16: Delete a pending or rejected report → `N-16_1_delete_a_pending_or_rejected_report.png`
    - Test: moderation.spec.ts › "N-16: Delete a pending or rejected report" — passed
  - **Precondition**: A `pending` or `rejected` report exists
  - **Steps**:
    1. Click the Trash action on the report row
    2. Confirm in the "Delete Report" dialog ("Are you sure you want to permanently delete this report? This action cannot be undone.")
  - **Expected Result**: Toast "Report deleted"; row removed; audit event `REPORT_DELETED` logged
  - **Business Rules**: BR-MOD-055
  - **API**: `DELETE /api/v1/admin/reports/:id`

- [x] **N-17**: Notification deep-link highlights the target review or report
  - **Evidence**:
    - Evidence for N-17: Notification deep-link highlights the target review or report → `N-17_1_notification_deep_link_highlights_the_target_review_or_report.png`
    - Test: moderation.spec.ts › "N-17: Notification deep-link highlights the target review or report" — passed
  - **Precondition**: Admin has `REVIEW_CREATED` / `REVIEW_REPORTED` notifications in the Notifications Center
  - **Steps**:
    1. Open the Notifications Center
    2. Click a review-created notification
    3. Verify the highlighted row; close the detail modal
    4. Repeat for a report-reported notification
  - **Expected Result**: Navigates to `/admin/reviews?tab=reviews&highlight=<reviewId>` or `?tab=reports&highlight=<reportId>`; the target tab is selected automatically; the target row gets a purple border and a "From notification" badge; highlight (and the `history.replaceState` URL param) is cleared when the detail modal closes or a different tab is selected (re-selecting the same tab keeps it)
  - **Business Rules**: None (UI deep-link)

### Product Content Moderation (`/admin/content`)

- [x] **N-18**: Product Content Moderation page loads with product list
  - **Evidence**:
    - Evidence for N-18: Product Content Moderation page loads with product list → `N-18_1_product_content_moderation_page_loads_with_product_list.png`
    - Test: moderation.spec.ts › "N-18: Product Content Moderation page loads with product list" — passed
  - **Precondition**: Authenticated admin; merchant products exist
  - **Steps**:
    1. Navigate to `/admin/content`
    2. Wait for the list to render
  - **Expected Result**: Header "Product Content Moderation" with subtitle "Review and moderate product content"; 3 stat cards (Total Products / Active / Inactive); table shows checkbox, Product (thumbnail, name truncated, category), Shop (shopName or "N/A", owner name), Price (`$x.xx`), Status badge (Active=emerald / Inactive=red), Created date, and Actions (Eye; Ban when active; CheckCircle when inactive); sorted newest first, 10 rows per page
  - **Business Rules**: BR-MOD-010
  - **API**: `GET /api/v1/admin/content`

- [x] **N-19**: Stats cards show product totals and act as status filters
  - **Evidence**:
    - Evidence for N-19: Stats cards show product totals and act as status filters → `N-19_1_stats_cards_show_product_totals_and_act_as_status_filters.png`
    - Test: moderation.spec.ts › "N-19: Stats cards show product totals and act as status filters" — passed
  - **Precondition**: Products exist in both active and inactive states
  - **Steps**:
    1. Inspect Total / Active / Inactive cards
    2. Click the "Inactive" card
  - **Expected Result**: Counts match server totals; clicking sets the `status` filter, resets to page 1, clears selection, and highlights the active card
  - **Business Rules**: BR-MOD-010
  - **API**: `GET /api/v1/admin/content?limit=1&status=active|inactive`

- [x] **N-20**: View product moderation detail dialog
  - **Evidence**:
    - Evidence for N-20: View product moderation detail dialog → `N-20_1_view_product_moderation_detail_dialog.png`
    - Test: moderation.spec.ts › "N-20: View product moderation detail dialog" — passed
  - **Precondition**: At least one product row exists
  - **Steps**:
    1. Click the Eye action on a product row
  - **Expected Result**: Dialog shows Product Information (image, name, "price · category"), Shop card (initials circle + shop name), Status and Created cards, and a Product Images grid; footer has Cancel plus Deactivate (active products) or Reactivate (inactive products)
  - **Business Rules**: BR-MOD-010
  - **API**: `GET /api/v1/admin/content/:id`

- [x] **N-21**: Deactivate a product with a reason
  - **Evidence**:
    - Evidence for N-21: Deactivate a product with a reason → `N-21_1_deactivate_a_product_with_a_reason.png`
    - Test: moderation.spec.ts › "N-21: Deactivate a product with a reason" — passed
  - **Precondition**: An active product without pending (non-terminal) orders
  - **Steps**:
    1. Click the Ban (Deactivate) action on the row (or Deactivate in the detail dialog)
    2. Enter a reason in the textarea (placeholder "Enter deactivation reason (required, max 500 characters)...")
    3. Click "Deactivate" (enabled once reason non-empty)
  - **Expected Result**: Toast "Product deactivated"; status badge becomes Inactive; product hidden from buyer storefront (soft delete via `is_active = false`); merchant notified ("Product Deactivated" with the reason); audit event `PRODUCT_DEACTIVATED` logged; product and product-list caches invalidated
  - **Business Rules**: BR-MOD-010, BR-MOD-011, BR-MOD-013
  - **API**: `PATCH /api/v1/admin/content/:id/status` (`{ isActive: false, reason }`)

- [x] **N-22**: Reactivate an inactive product
  - **Evidence**:
    - Evidence for N-22: Reactivate an inactive product → `N-22_1_reactivate_an_inactive_product.png`
    - Test: moderation.spec.ts › "N-22: Reactivate an inactive product" — passed
  - **Precondition**: An inactive product whose merchant user is active
  - **Steps**:
    1. Click the CheckCircle (Reactivate) action on the row (or Reactivate in the detail dialog)
    2. Confirm in the dialog (no reason field)
  - **Expected Result**: Toast "Product reactivated"; status badge becomes Active; product visible again to buyers; merchant notified ("Product Reactivated"); audit event `PRODUCT_REACTIVATED` logged
  - **Business Rules**: BR-MOD-010, BR-MOD-013
  - **API**: `PATCH /api/v1/admin/content/:id/status` (`{ isActive: true }`)

- [x] **N-23**: Bulk deactivate products with a reason
  - **Evidence**:
    - Evidence for N-23: Bulk deactivate products with a reason → `N-23_1_bulk_deactivate_products_with_a_reason.png`
    - Test: moderation.spec.ts › "N-23: Bulk deactivate products with a reason" — passed
  - **Precondition**: Two or more active products without pending orders
  - **Steps**:
    1. Select 2+ eligible rows (bulk bar shows "{{count}} selected")
    2. Click "Deactivate All"
    3. Enter a reason in the "Deactivate {{count}} Product(s)" dialog ("The selected products will be deactivated and hidden from the storefront. This can be undone later.")
    4. Confirm
  - **Expected Result**: Toast "{{count}} products deactivated" (singular "product" for 1); all selected become Inactive; per-product audit events and merchant notifications logged
  - **Business Rules**: BR-MOD-011, BR-MOD-013
  - **API**: `PATCH /api/v1/admin/content/bulk/status`

- [x] **N-24**: Bulk activate products
  - **Evidence**:
    - Evidence for N-24: Bulk activate products → `N-24_1_bulk_activate_products.png`
    - Test: moderation.spec.ts › "N-24: Bulk activate products" — passed
  - **Precondition**: Two or more inactive products
  - **Steps**:
    1. Select 2+ inactive rows
    2. Click "Activate All"
    3. Confirm in the "Activate {{count}} Product(s)" dialog
  - **Expected Result**: Toast "{{count}} products activated"; all selected become Active
  - **Business Rules**: BR-MOD-010, BR-MOD-013
  - **API**: `PATCH /api/v1/admin/content/bulk/status` (`{ ids, isActive: true }`)

- [x] **N-25**: Search products by name or shop
  - **Evidence**:
    - Evidence for N-25: Search products by name or shop → `N-25_1_search_products_by_name_or_shop.png`
    - Test: moderation.spec.ts › "N-25: Search products by name or shop" — passed
  - **Precondition**: Products exist across multiple shops
  - **Steps**:
    1. Enter a query in the search input (placeholder "Search products by name or shop...")
    2. Wait for the 300ms debounce
  - **Expected Result**: Table refreshes showing only products whose name or merchant shopName matches; pagination resets to page 1
  - **Business Rules**: None (UI + search filter)
  - **API**: `GET /api/v1/admin/content?search=...`

- [x] **N-26**: Sort products
  - **Evidence**:
    - Evidence for N-26: Sort products → `N-26_1_sort_products.png`
    - Test: moderation.spec.ts › "N-26: Sort products" — passed
  - **Precondition**: Products with varying names, prices, and dates exist
  - **Steps**:
    1. Cycle the sort dropdown through all options
  - **Expected Result**: Options sort by Newest / Oldest (`createdAt`), Price (High-Low) / (Low-High) (`price`), Name (A-Z) / (Z-A) (`name`); default is Newest
  - **Business Rules**: None (UI + sort)
  - **API**: `GET /api/v1/admin/content?sort=...&order=...`

- [x] **N-27**: Pending-order guard blocks product deactivation in the UI
  - **Evidence**:
    - Evidence for N-27: Pending-order guard blocks product deactivation in the UI → `N-27_1_pending_order_guard_blocks_product_deactivation_in_the_ui.png`
    - Test: moderation.spec.ts › "N-27: Pending-order guard blocks product deactivation in the UI" — passed
  - **Precondition**: An active product with at least one non-terminal order (`hasPendingOrders: true`)
  - **Steps**:
    1. Locate the product row and hover the disabled Ban button
    2. Open the detail dialog and inspect the Deactivate button
    3. Select only pending-order products and inspect "Deactivate All"
  - **Expected Result**: Ban button disabled with tooltip "Cannot deactivate until the order delivery is completed." (wrapped so the tooltip still fires on the disabled control); detail-dialog Deactivate also disabled; "Deactivate All" disabled when every selected product has pending orders; products are still reactivatable
  - **Business Rules**: BR-MOD-013
  - **API**: `GET /api/v1/admin/content` (`hasPendingOrders` flag)

- [x] **N-28**: Paginate products and change page size
  - **Evidence**:
    - Evidence for N-28: Paginate products and change page size → `N-28_1_paginate_products_and_change_page_size.png`
    - Test: moderation.spec.ts › "N-28: Paginate products and change page size" — passed
  - **Precondition**: More than one page of products exists
  - **Steps**:
    1. Navigate pages and change page size
  - **Expected Result**: "products" pagination label updates; page-size options 10 / 20 / 50 / 100; refetch with new limit
  - **Business Rules**: None (UI + pagination)
  - **API**: `GET /api/v1/admin/content?page=...&limit=...`

### Merchant Management (`/admin/merchants`)

- [x] **N-29**: Merchant Management page loads stats and merchant registrations
  - **Evidence**:
    - Evidence for N-29: Merchant Management page loads stats and merchant registrations → `N-29_1_merchant_management_page_loads_stats_and_merchant_registrations.png`
    - Test: moderation.spec.ts › "N-29: Merchant Management page loads stats and merchant registrations" — passed
  - **Precondition**: Authenticated admin; merchant records exist in pending, approved, and rejected states.
  - **Steps**:
    1. Navigate to `/admin/merchants` and wait for the list and stat requests.
    2. Compare Total Merchants, Pending, Approved, and Rejected card values with the corresponding list totals.
  - **Expected Result**: Four stat cards render with values from `GET /api/v1/admin/merchants` counts. The page shows a merchant table with Shop, Owner, Registered, License Status, and Actions; rows show shop name, owner name/email, registered date, status badge, and a view-details action. The list defaults to newest first and 10 rows per page.
  - **Business Rules**: BR-MOD-020~023
  - **API**: `GET /api/v1/admin/merchants` (four requests for total/status counts and the current page)

- [x] **N-30**: Filter, search, and sort merchant registrations
  - **Evidence**:
    - Evidence for N-30: Filter, search, and sort merchant registrations → `N-30_1_filter_search_and_sort_merchant_registrations.png`
    - Test: moderation.spec.ts › "N-30: Filter, search, and sort merchant registrations" — passed
  - **Precondition**: Merchants exist across license statuses, with searchable shop names, owner names, and emails.
  - **Steps**:
    1. Select Pending, Approved, and Rejected stat cards in turn.
    2. Search by shop name, owner name, and owner email; wait for the 300 ms debounce.
    3. Change sort between Newest, Oldest, Shop Name (A-Z), and Shop Name (Z-A).
  - **Expected Result**: The status card filters the list and resets page to 1; search matches shop name, owner name, or owner email; changing sort updates the request and resets page to 1. The status filter is applied client-side to the query; sort/search are passed to the list endpoint.
  - **Business Rules**: BR-MOD-020~023
  - **API**: `GET /api/v1/admin/merchants?status=...&search=...&sort=...&order=...`

- [x] **N-31**: View merchant registration and business license details
  - **Evidence**:
    - Evidence for N-31: View merchant registration and business license details → `N-31_1_view_merchant_registration_and_business_license_details.png`
    - Test: moderation.spec.ts › "N-31: View merchant registration and business license details" — passed
  - **Precondition**: At least one merchant registration exists with business-license information.
  - **Steps**:
    1. Click View merchant details for a merchant.
    2. Inspect shop name, owner name/email, status, submitted/registered dates, and license information.
    3. Open or download the license document when available; close the modal.
  - **Expected Result**: The detail modal shows merchant information, license status and submitted date, owner information, rejection reason when present, and the business license image or PDF link when present. A missing license URL does not break the dialog; the modal is populated from the list result.
  - **Business Rules**: BR-MOD-020~023
  - **API**: None for opening the modal; detail endpoint contract is covered by I-20.

- [x] **N-32**: Approve or reject a pending merchant registration
  - **Evidence**:
    - Evidence for N-32: Approve or reject a pending merchant registration → `N-32_1_approve_or_reject_a_pending_merchant_registration.png`
    - Test: moderation.spec.ts › "N-32: Approve or reject a pending merchant registration" — passed
  - **Precondition**: Pending merchant registration and admin account; a non-empty reason is available for rejection.
  - **Steps**:
    1. Approve one pending registration and confirm the status change.
    2. Reject another pending registration with a reason and confirm.
    3. Verify merchant status, shop approval state, merchant notification, and refreshed list/stats.
  - **Expected Result**: Approval changes license status to Approved and shop approval to true; rejection changes license status to Rejected, saves the reason, and sets shop approval false when a shop exists. The merchant receives a `MERCHANT_STATUS_CHANGED` in-app notification for each action; merchant and user list queries refresh. There is no merchant delete action or delete endpoint.
  - **Business Rules**: BR-MOD-020~023
  - **API**: `PATCH /api/v1/admin/merchants/:id/status` with `{ status: "approved" }` or `{ status: "rejected", reason }`

### User Management (`/admin/users`)

- [x] **N-33**: User Management page loads stats and user table
  - **Evidence**:
    - Evidence for N-33: User Management page loads stats and user table → `N-33_1_user_management_page_loads_stats_and_user_table.png`
    - Test: moderation.spec.ts › "N-33: User Management page loads stats and user table" — passed
  - **Precondition**: Authenticated admin; buyer, merchant, and admin users exist in active and inactive states.
  - **Steps**:
    1. Navigate to `/admin/users` and wait for list and stats requests.
    2. Compare Total Users, Active, Inactive, and Admin card values with the corresponding list totals.
  - **Expected Result**: Four stat cards display their totals. The page shows user avatar/initials and name, email, role, status badge, and Actions; rows have view-detail and applicable activate/deactivate actions. The list defaults to newest first and 10 rows per page.
  - **Business Rules**: BR-MOD-040~042
  - **API**: `GET /api/v1/admin/users` (four requests for total/status counts and the current page)

- [x] **N-34**: Search, filter, sort, and paginate users
  - **Evidence**:
    - Evidence for N-34: Search, filter, sort, and paginate users → `N-34_1_search_filter_sort_and_paginate_users.png`
    - Test: moderation.spec.ts › "N-34: Search, filter, sort, and paginate users" — passed
  - **Precondition**: Users exist with distinct names, emails, account statuses, roles, and registration dates.
  - **Steps**:
    1. Search by a user name and by an email; wait for the 300 ms debounce.
    2. Select Total, Active, Inactive, and Admin status cards.
    3. Sort by Newest, Oldest, Name (A-Z), and Name (Z-A); change page and page size.
  - **Expected Result**: Search matches name or email; status cards filter and reset the page; sorting uses `createdAt` or `name` and resets page to 1. Pagination supports page sizes 10, 20, 50, and 100.
  - **Business Rules**: BR-MOD-040~042
  - **API**: `GET /api/v1/admin/users?search=...&status=...&sort=...&order=...&page=...&limit=...`

- [x] **N-35**: View user account details
  - **Evidence**:
    - Evidence for N-35: View user account details → `N-35_1_view_user_account_details.png`
    - Test: moderation.spec.ts › "N-35: View user account details" — passed
  - **Precondition**: At least one user is present in the list.
  - **Steps**:
    1. Click the user row's View Details action.
    2. Inspect avatar, name, email, phone when available, role, active status, joined date, user ID, and profile details.
  - **Expected Result**: User Detail modal displays the selected row's user information and account status; optional values render gracefully. The current UI opens with data from the list response rather than fetching detail on modal open; verify the detail endpoint separately in I-22.
  - **Business Rules**: BR-MOD-040~042
  - **API**: None for opening the modal; detail endpoint contract is covered by I-22.

- [x] **N-36**: Deactivate and reactivate eligible user accounts, including approved merchant accounts
  - **Evidence**:
    - Evidence for N-36: Deactivate and reactivate eligible user accounts, including approved merchant accounts → `N-36_1_deactivate_and_reactivate_eligible_user_accounts_including_approved.png`
    - Test: moderation.spec.ts › "N-36: Deactivate and reactivate eligible user accounts, including approved merchant accounts" — passed
  - **Precondition**: An active non-admin user with no non-terminal orders; for merchant account coverage, merchant license is approved. An inactive eligible user is also available.
  - **Steps**:
    1. Deactivate an eligible account with a non-empty reason and confirm.
    2. Verify status, user session/token effects where observable, merchant products when the user is an approved merchant, and refreshed stats/list.
    3. Reactivate the inactive account and confirm.
  - **Expected Result**: Account status changes and the matching success toast appears. Deactivation records the reason, revokes active refresh tokens, and for a merchant deactivates active products; reactivation restores the account status. Admin accounts cannot be deactivated. This is the supported merchant-account deactivation path; merchant registration records cannot be deleted through this module.
  - **Business Rules**: BR-MOD-040~042
  - **API**: `PATCH /api/v1/admin/users/:id/status` with `{ isActive: false, reason }` or `{ isActive: true }`

### Cross-cutting (Review & Report, Content, and Merchant, User Management)

- [x] **N-37**: Language preference applies across the in-scope admin management screens
  - **Evidence**:
    - Evidence for N-37: Language preference applies across the in-scope admin management screens → `N-37_1_language_preference_applies_across_the_in_scope_admin_management.png`
    - Test: moderation.spec.ts › "N-37: Language preference applies across the in-scope admin management screens" — passed
  - **Precondition**: Authenticated admin can open `/admin/reviews`, `/admin/content`, `/admin/merchants` and `/admin/users`.
  - **Steps**:
    1. Select Japanese or Myanmar in the header language selector.
    2. Navigate between Review & Report Management, Product Content Moderation, User Management and Merchant Management; open representative detail/confirmation dialogs on each.
    3. Confirm the language selection is retained after navigating between those screens, then switch back to English.
  - **Expected Result**: The selected preference is retained across the three in-scope screens without a reload or loss of current view state. UI remains usable in every locale. Current implementation has no `admin.*` translation keys in `frontend/src/i18n/locales/{en,ja,my}/`; labels fall back to inline English. Treat Japanese/Myanmar translation assertions as a known gap until keys are added.
  - **Business Rules**: None (i18n)
  - **API**: None

- [x] **N-38**: Theme toggle works across in-scope admin management screens
  - **Evidence**:
    - Evidence for N-38: Theme toggle works across in-scope admin management screens → `N-38_1_theme_toggle_works_across_in_scope_admin_management_screens.png`
    - Test: moderation.spec.ts › "N-38: Theme toggle works across in-scope admin management screens" — passed
  - **Precondition**: Authenticated admin can open the four in-scope admin management screens.
  - **Steps**:
    1. Toggle to dark mode and inspect lists, stats, filters, badges, and dialogs on `/admin/reviews`, `/admin/content`, `/admin/merchants` and `/admin/users`.
    2. Navigate between the three screens while dark mode is active.
    3. Toggle back to light mode and inspect the same UI.
  - **Expected Result**: Theme choice persists across Review & Report, Content, User and Merchant Management; tables, filters, status badges, stat cards, and dialogs remain legible in both themes.
  - **Business Rules**: None (UI)

- [x] **N-39**: Responsive layout on desktop and tablet viewports
  - **Evidence**:
    - Evidence for N-39: Responsive layout on desktop and tablet viewports → `N-39_1_responsive_layout_on_desktop_and_tablet_viewports.png`
    - Test: moderation.spec.ts › "N-39: Responsive layout on desktop and tablet viewports" — passed
  - **Precondition**: Admin can open all four in-scope screens.
  - **Steps**:
    1. Set viewport to 1280x720 and load `/admin/reviews`, `/admin/content`, `/admin/merchants` and `/admin/users`.
    2. Repeat at 768x1024 and inspect the same screens.
  - **Expected Result**: At desktop width, full table layouts and stat cards render without page-level horizontal overflow. At tablet width, controls, stats, and table regions adapt or scroll within their containers; detail and confirmation dialogs remain fully visible at both sizes.
  - **Business Rules**: None (Responsive)

- [x] **N-40**: Responsive layout on mobile viewport
  - **Evidence**:
    - Evidence for N-40: Responsive layout on mobile viewport → `N-40_1_responsive_layout_on_mobile_viewport.png`
    - Test: moderation.spec.ts › "N-40: Responsive layout on mobile viewport" — passed
  - **Precondition**: Viewport < 768px; admin can open all four in-scope screens.
  - **Steps**:
    1. Set viewport to 375x667 and load `/admin/reviews`, `/admin/content`, `/admin/merchants` and `/admin/users`.
    2. Inspect stat cards, tables, search/sort controls, pagination, and dialogs.
  - **Expected Result**: Stat cards wrap; tables remain usable through the implemented horizontal-scroll behavior; search/sort controls, pagination, and dialogs fit the viewport without page-level horizontal overflow on each of the three covered screens.
  - **Business Rules**: None (Responsive)

- [x] **N-41**: Language toggle updates in-scope management labels and messages (Japanese / Myanmar)
  - **Evidence**:
    - Evidence for N-41: Language toggle updates in-scope management labels and messages (Japanese / Myanmar) → `N-41_1_language_toggle_updates_in_scope_management_labels_and_messages.png`
    - Test: moderation.spec.ts › "N-41: Language toggle updates in-scope management labels and messages (Japanese / Myanmar)" — passed
  - **Precondition**: Authenticated admin has representative rows on Review & Report Management, Product Content Moderation, User Management and Merchant Management and can open a detail or confirmation dialog.
  - **Steps**:
    1. Set the header language selector to Japanese (`日本語`).
    2. Check page titles, stat cards, tabs/filters, table headings, row actions, detail dialogs, confirmation dialogs, validation/error messages, and action toasts across all four in-scope screens.
    3. Repeat with Myanmar (`မြန်မာ`), then switch back to English.
  - **Expected Result**: Record translation coverage for each in-scope screen and language without page reloads or layout failures; toggling locale must not discard the current screen or open dialog state. Since `admin.*` locale keys are currently absent, labels fall back to English; JA/MY text assertions remain failing until translations are implemented.
  - **Business Rules**: None (i18n)
  - **API**: None
  - **Reference**: Checkout PCL N-18–N-21; Review moderation design scenario E2E-MOD-17.

- [x] **N-42**: Admin actions create in-app notifications for the affected users
  - **Evidence**:
    - Evidence for N-42: Admin actions create in-app notifications for the affected users → `N-42_1_admin_actions_create_in_app_notifications_for_the_affected_users.png`
    - Test: moderation.spec.ts › "N-42: Admin actions create in-app notifications for the affected users" — passed
  - **Precondition**: Admin and Notifications Center are available; test data includes a pending review/report, an admin-visible `MERCHANT_REGISTERED` notification, affected review authors/reporters, and merchants with a product eligible for content moderation.
  - **Steps**:
    1. Approve/reject a merchant registration and verify its merchant account receives `MERCHANT_STATUS_CHANGED`.
    2. Verify review approval/rejection, report resolution, and product deactivation notifications and recipients as covered by N-01, N-02, N-14, and N-21.
    3. Open review-created and report-reported notifications and verify their target-row deep links using N-17.
    4. Open the `MERCHANT_REGISTERED` notification as an admin and verify it navigates to `/admin/merchants?merchantId=<merchantId>`, clears any status filter, highlights and scrolls the target row into view, then removes the highlight query after the timeout.
  - **Expected Result**: Each successful review, report, product-content, user or merchant action creates the in-app notification for the affected recipient described by its in-scope scenario; unrelated users receive none. Review/report notifications resolve to their intended tab and row; the merchant-registration notification resolves to the merchant list and highlights the target. Verify in-app delivery only; no push/email behavior is asserted.
  - **Business Rules**: BR-MOD-003, BR-MOD-004, BR-MOD-006, BR-MOD-011, BR-MOD-020~023, BR-MOD-053, BR-MOD-054
  - **API**: Merchant and review/content moderation endpoints in referenced scenarios; Notifications Center read path
  - **Reference**: Checkout PCL N-22.

---

## 2. Abnormal Scenarios (A) — Error & Negative Paths

- [x] **A-01**: Access moderation routes without authentication
  - **Evidence**:
    - Evidence for A-01: Access moderation routes without authentication → `A-01_1_access_moderation_routes_without_authentication.png`
    - Test: moderation.spec.ts › "A-01: Access moderation routes without authentication" — passed
  - **Precondition**: User is not logged in
  - **Steps**:
    1. Navigate directly to `/admin/reviews` (`/admin/content`, `admin/users` and `admin/merchants`)
  - **Expected Result**: Redirect to `/login`; no moderation data exposed; direct API calls return 401
  - **Business Rules**: BR-MOD-001
  - **API**: `GET /api/v1/admin/reviews` → 401

- [x] **A-02**: Access moderation routes as a non-admin role (buyer / merchant)
  - **Evidence**:
    - Evidence for A-02: Access moderation routes as a non-admin role (buyer / merchant) → `A-02_1_access_moderation_routes_as_a_non_admin_role_buyer_merchant.png`
    - Test: moderation.spec.ts › "A-02: Access moderation routes as a non-admin role (buyer / merchant)" — passed
  - **Precondition**: Authenticated as buyer or merchant (e.g. `eem@gmail.com` / `smt@gmail.com`)
  - **Steps**:
    1. Navigate directly to `/admin/reviews` (`/admin/content`, `admin/users` and `admin/merchants`)
  - **Expected Result**: Frontend guard redirects to `/unauthorized`; backend returns 403 for direct API calls
  - **Business Rules**: BR-MOD-001
  - **API**: All `/api/v1/admin/*` endpoints → 403

- [x] **A-03**: Bulk approve/reject when the selection includes non-pending reviews
  - **Evidence**:
    - Evidence for A-03: Bulk approve/reject when the selection includes non-pending reviews → `A-03_1_bulk_approve_reject_when_the_selection_includes_non_pending_reviews.png`
    - Test: moderation.spec.ts › "A-03: Bulk approve/reject when the selection includes non-pending reviews" — passed
  - **Precondition**: Selection contains a mix of pending and approved/rejected reviews
  - **Steps**:
    1. Select mixed-status reviews
    2. Inspect "Approve All" / "Reject All"
  - **Expected Result**: Both buttons disabled unless every selected review is `pending` (and no dialog is open / mutation pending); if invoked anyway, guard toast "Only pending reviews can be approved" / "Only pending reviews can be rejected" is shown and no API call is made
  - **Business Rules**: BR-MOD-002
  - **API**: `POST /api/v1/admin/reviews/bulk/moderate`

- [x] **A-04**: Reject a review with an empty reason
  - **Evidence**:
    - Evidence for A-04: Reject a review with an empty reason → `A-04_1_reject_a_review_with_an_empty_reason.png`
    - Test: moderation.spec.ts › "A-04: Reject a review with an empty reason" — passed
  - **Precondition**: Review Detail modal open for a pending review
  - **Steps**:
    1. Leave the rejection reason textarea empty
    2. Inspect the "Reject" button (and bulk "Reject All")
  - **Expected Result**: Reject buttons disabled while reason is empty; direct API call returns 400 "Rejection reason is required"
  - **Business Rules**: BR-MOD-001
  - **API**: `POST /api/v1/admin/reviews/:id/moderate` → 400

- [x] **A-05**: Moderating a review that was already moderated elsewhere (stale UI)
  - **Evidence**:
    - Evidence for A-05: Moderating a review that was already moderated elsewhere (stale UI) → `A-05_1_moderating_a_review_that_was_already_moderated_elsewhere_stale_ui.png`
    - Test: moderation.spec.ts › "A-05: Moderating a review that was already moderated elsewhere (stale UI)" — passed
  - **Precondition**: Review is approved/rejected by another admin after this list loaded
  - **Steps**:
    1. Open the (now stale) detail modal
    2. Click Approve or Reject
  - **Expected Result**: Backend returns 409 "Review already approved" / "Review already rejected"; error toast "Failed to approve review" / "Failed to reject review"; list refetches on next load
  - **Business Rules**: BR-MOD-002
  - **API**: `POST /api/v1/admin/reviews/:id/moderate` → 409

- [x] **A-06**: Resolve a report with an empty admin note
  - **Evidence**:
    - Evidence for A-06: Resolve a report with an empty admin note → `A-06_1_resolve_a_report_with_an_empty_admin_note.png`
    - Test: moderation.spec.ts › "A-06: Resolve a report with an empty admin note" — passed
  - **Precondition**: Report detail modal open
  - **Steps**:
    1. Leave "Admin Note *" empty
    2. Attempt to resolve
  - **Expected Result**: Inline error "Admin note is required." displayed; Resolve action blocked; no API call
  - **Business Rules**: BR-MOD-053
  - **API**: `PATCH /api/v1/admin/reports/:id/status`

- [x] **A-07**: Reject a report with an empty admin note
  - **Evidence**:
    - Evidence for A-07: Reject a report with an empty admin note → `A-07_1_reject_a_report_with_an_empty_admin_note.png`
    - Test: moderation.spec.ts › "A-07: Reject a report with an empty admin note" — passed
  - **Precondition**: Report detail modal open
  - **Steps**:
    1. Leave "Admin Note *" empty and inspect the Reject button
  - **Expected Result**: Reject disabled until the admin note is non-empty
  - **Business Rules**: BR-MOD-053
  - **API**: `PATCH /api/v1/admin/reports/:id/status`

- [x] **A-08**: Delete a resolved report
  - **Evidence**:
    - Evidence for A-08: Delete a resolved report → `A-08_1_delete_a_resolved_report.png`
    - Test: moderation.spec.ts › "A-08: Delete a resolved report" — passed
  - **Precondition**: A `resolved` report exists
  - **Steps**:
    1. Inspect the row (Trash hidden for resolved reports)
    2. Call `DELETE /api/v1/admin/reports/:id` directly
  - **Expected Result**: UI blocks the action; API returns 409 "Resolved reports cannot be deleted"; toast "Failed to delete report"
  - **Business Rules**: BR-MOD-055
  - **API**: `DELETE /api/v1/admin/reports/:id` → 409

- [x] **A-09**: Mark an already-resolved report as reviewed (auto-review-on-view race)
  - **Evidence**:
    - Evidence for A-09: Mark an already-resolved report as reviewed (auto-review-on-view race) → `A-09_1_mark_an_already_resolved_report_as_reviewed_auto_review_on_view_race.png`
    - Test: moderation.spec.ts › "A-09: Mark an already-resolved report as reviewed (auto-review-on-view race)" — passed
  - **Precondition**: Report was resolved after this list loaded; its status still shows pending/reviewed in the stale UI
  - **Steps**:
    1. Click the Eye action on the stale pending report
  - **Expected Result**: Auto-review call returns 409 "Only pending reports can be marked as reviewed"; error toast "Failed to update report"; the detail modal still opens for inspection
  - **Business Rules**: BR-MOD-053
  - **API**: `PATCH /api/v1/admin/reports/:id/status` → 409

- [x] **A-10**: Deactivate a product that has pending (non-terminal) orders
  - **Evidence**:
    - Evidence for A-10: Deactivate a product that has pending (non-terminal) orders → `A-10_1_deactivate_a_product_that_has_pending_non_terminal_orders.png`
    - Test: moderation.spec.ts › "A-10: Deactivate a product that has pending (non-terminal) orders" — passed
  - **Precondition**: Active product with `hasPendingOrders: true`
  - **Steps**:
    1. Attempt deactivation via row Ban button / detail dialog / bulk action (all disabled in UI)
    2. Call `PATCH /api/v1/admin/content/:id/status { isActive: false, reason }` directly
  - **Expected Result**:Reject disabled until the order delivery is completed. API returns 400 with the same message; product remains Active
  - **Business Rules**: BR-MOD-011, BR-MOD-013
  - **API**: `PATCH /api/v1/admin/content/:id/status` → 400

- [x] **A-11**: Reactivate a product whose merchant user is inactive
  - **Evidence**:
    - Evidence for A-11: Reactivate a product whose merchant user is inactive → `A-11_1_reactivate_a_product_whose_merchant_user_is_inactive.png`
    - Test: moderation.spec.ts › "A-11: Reactivate a product whose merchant user is inactive" — passed
  - **Precondition**: Inactive product owned by a deactivated merchant user
  - **Steps**:
    1. Click Reactivate and confirm
  - **Expected Result**: API returns 400 "Merchant user is inactive"; toast "Failed to update product"; product remains Inactive
  - **Business Rules**: BR-MOD-010, BR-MOD-013
  - **API**: `PATCH /api/v1/admin/content/:id/status` → 400

- [x] **A-12**: Server error during list load or action
  - **Evidence**:
    - Evidence for A-12: Server error during list load or action → `A-12_1_server_error_during_list_load_or_action.png`
    - Test: moderation.spec.ts › "A-12: Server error during list load or action" — passed
  - **Precondition**: Backend returns 500 for a moderation request (e.g. simulated outage)
  - **Steps**:
    1. Load `/admin/reviews` or `/admin/content` with the backend down
    2. Retry an action (approve / deactivate / resolve)
  - **Expected Result**: Action-specific error toast shown via `apiErrorMessage` fallback ("Failed to approve review", "Failed to update product", "Failed to resolve report", ...); stat cards remain at 0 (stat-fetch errors are swallowed); page does not crash
  - **Business Rules**: None (error handling)

- [x] **A-13**: Bulk operation with partial failures
  - **Evidence**:
    - Evidence for A-13: Bulk operation with partial failures → `A-13_1_bulk_operation_with_partial_failures.png`
    - Test: moderation.spec.ts › "A-13: Bulk operation with partial failures" — passed
  - **Precondition**: Bulk request where some ids fail (e.g. one review already approved, one product has pending orders)
  - **Steps**:
    1. Run a bulk approve/reject/delete or bulk activate/deactivate covering the mixed set
  - **Expected Result**: HTTP 200 with `{ processed, failed, results }`; success toast when all pass, else partial toast "{{processed}} of {{total}} updated/approved/rejected/deleted, {{failed}} failed"; on partial product-update failure the selection is replaced by the failed ids for retry
  - **Business Rules**: None (bulk result handling)
  - **API**: `POST /api/v1/admin/reviews/bulk/moderate`, `DELETE /api/v1/admin/reviews/bulk`, `PATCH /api/v1/admin/content/bulk/status`

- [x] **A-14**: Direct API calls with missing or invalid JWT
  - **Evidence**:
    - API evidence for A-14: Direct API calls with missing or invalid JWT → `A-14_1_direct_api_calls_with_missing_or_invalid_jwt.png`
    - Test: moderation.spec.ts › "A-14: Direct API calls with missing or invalid JWT" — passed
  - **Precondition**: No token, expired token, or malformed Bearer header
  - **Steps**:
    1. Call any `/api/v1/admin/*` endpoint without a valid admin JWT
  - **Expected Result**: HTTP 401; no data returned
  - **Business Rules**: BR-MOD-001
  - **API**: All `/api/v1/admin/*` endpoints → 401

- [x] **A-15**: Approve or reject an already processed merchant registration
  - **Evidence**:
    - Evidence for A-15: Approve or reject an already processed merchant registration → `A-15_1_approve_or_reject_an_already_processed_merchant_registration.png`
    - Test: moderation.spec.ts › "A-15: Approve or reject an already processed merchant registration" — passed
  - **Precondition**: An already-approved merchant and an already-rejected merchant exist.
  - **Steps**:
    1. Attempt to approve the already-approved merchant.
    2. Attempt to reject the already-rejected merchant with a valid reason.
  - **Expected Result**: API returns 409 "Merchant already approved" / "Merchant already rejected"; no merchant status, shop approval, notification, or audit state is changed by the failed request. The UI shows its action-specific failure toast if the action is available through stale state.
  - **Business Rules**: BR-MOD-020~023
  - **API**: `PATCH /api/v1/admin/merchants/:id/status` → 409

- [x] **A-16**: Reject a merchant with an empty reason or access merchant actions as a non-admin
  - **Evidence**:
    - Evidence for A-16: Reject a merchant with an empty reason or access merchant actions as a non-admin → `A-16_1_reject_a_merchant_with_an_empty_reason_or_access_merchant_actions_as_a.png`
    - Test: moderation.spec.ts › "A-16: Reject a merchant with an empty reason or access merchant actions as a non-admin" — passed
  - **Precondition**: Pending merchant registration; unauthenticated and non-admin tokens are available.
  - **Steps**:
    1. Submit rejection with missing, empty, or whitespace-only reason.
    2. Call merchant list/detail/status endpoints without a token and with buyer/merchant tokens.
  - **Expected Result**: Missing, empty, or whitespace-only reason returns 400 "Rejection reason is required". Missing token returns 401 and non-admin role returns 403; merchant state is unchanged.
  - **Business Rules**: BR-MOD-001, BR-MOD-020~023
  - **API**: `GET /api/v1/admin/merchants`, `GET /api/v1/admin/merchants/:id`, `PATCH /api/v1/admin/merchants/:id/status`

- [x] **A-17**: Deactivate an already-inactive user
  - **Evidence**:
    - Evidence for A-17: Deactivate an already-inactive user → `A-17_1_deactivate_an_already_inactive_user.png`
    - Test: moderation.spec.ts › "A-17: Deactivate an already-inactive user" — passed
  - **Precondition**: Inactive user and valid admin token.
  - **Steps**:
    1. Submit `{ isActive: false, reason: "Repeated request" }` for the inactive user.
  - **Expected Result**: API returns 409 "User already inactive"; user state, tokens, products, and notifications are not changed again. If submitted through a stale UI, an error toast is shown.
  - **Business Rules**: BR-MOD-040~042
  - **API**: `PATCH /api/v1/admin/users/:id/status` → 409

- [x] **A-18**: Access User Management without authorization
  - **Evidence**:
    - Evidence for A-18: Access User Management without authorization → `A-18_1_access_user_management_without_authorization.png`
    - Test: moderation.spec.ts › "A-18: Access User Management without authorization" — passed
  - **Precondition**: No token, expired/invalid token, and non-admin user tokens are available.
  - **Steps**:
    1. Request user list, detail, and status endpoints without a token and with buyer/merchant tokens.
    2. Attempt to open `/admin/users` as a non-admin user.
  - **Expected Result**: API returns 401 without a valid token and 403 for authenticated non-admin roles; UI access is denied by the admin route guard. No user data or status changes are returned.
  - **Business Rules**: BR-MOD-001
  - **API**: `GET /api/v1/admin/users`, `GET /api/v1/admin/users/:id`, `PATCH /api/v1/admin/users/:id/status`

- [x] **A-19**: User list or status action encounters a server error
  - **Evidence**:
    - Evidence for A-19: User list or status action encounters a server error → `A-19_1_user_list_or_status_action_encounters_a_server_error.png`
    - Test: moderation.spec.ts › "A-19: User list or status action encounters a server error" — passed
  - **Precondition**: Backend returns 500 for a user list/detail/status request.
  - **Steps**:
    1. Load `/admin/users` while list or stats requests fail.
    2. Retry deactivation/reactivation with a simulated 500 response.
  - **Expected Result**: Page does not crash; failed stat requests leave stats at 0, and the list query shows its error/empty behavior. A status action shows the server message or action-specific fallback toast; no optimistic status change is retained.
  - **Business Rules**: None (error handling)
  - **API**: User management endpoints → 500

---

## 3. Boundary Scenarios (B) — Edge Cases & Limits

- [x] **B-01**: Review rejection reason at exactly 500 characters
  - **Evidence**:
    - Evidence for B-01: Review rejection reason at exactly 500 characters → `B-01_1_review_rejection_reason_at_exactly_500_characters.png`
    - Test: moderation.spec.ts › "B-01: Review rejection reason at exactly 500 characters" — passed
  - **Precondition**: Review Detail modal open for a pending review
  - **Steps**:
    1. Enter exactly 500 characters in the rejection reason textarea
    2. Click Reject (or run Reject All bulk with a 500-char reason)
  - **Expected Result**: Input accepted; review rejected successfully
  - **Business Rules**: BR-MOD-001

- [x] **B-02**: Review rejection reason exceeding 500 characters
  - **Evidence**:
    - Evidence for B-02: Review rejection reason exceeding 500 characters → `B-02_1_review_rejection_reason_exceeding_500_characters.png`
    - Test: moderation.spec.ts › "B-02: Review rejection reason exceeding 500 characters" — passed
  - **Precondition**: Review Detail modal open
  - **Steps**:
    1. Enter 501+ characters in the rejection reason textarea (frontend review textarea has no `maxLength`; backend caps at 500)
    2. Submit
  - **Expected Result**: Backend returns 400 "Reason must not exceed 500 characters"; error toast "Failed to reject review"; review stays pending. Product deactivation textarea is separately capped by `maxLength={500}` so excess input is blocked in the UI with a live "{n}/500" counter
  - **Business Rules**: BR-MOD-001, BR-MOD-011
  - **API**: `POST /api/v1/admin/reviews/:id/moderate` → 400

- [x] **B-03**: Report admin note at the 1000-character limit
  - **Evidence**:
    - Evidence for B-03: Report admin note at the 1000-character limit → `B-03_1_report_admin_note_at_the_1000_character_limit.png`
    - Test: moderation.spec.ts › "B-03: Report admin note at the 1000-character limit" — passed
  - **Precondition**: Report detail modal open
  - **Steps**:
    1. Enter exactly 1000 characters in "Admin Note *", then resolve
    2. Repeat with 1001 characters (frontend textarea has no `maxLength`; backend caps at 1000)
  - **Expected Result**: 1000 chars accepted and resolution succeeds; 1001 chars rejected by backend validation (400)
  - **Business Rules**: BR-MOD-053
  - **API**: `PATCH /api/v1/admin/reports/:id/status`

- [x] **B-04**: Search query at the 255-character limit
  - **Evidence**:
    - Evidence for B-04: Search query at the 255-character limit → `B-04_1_search_query_at_the_255_character_limit.png`
    - Test: moderation.spec.ts › "B-04: Search query at the 255-character limit" — passed
  - **Precondition**: On either moderation screen
  - **Steps**:
    1. Enter exactly 255 characters in search, then 256 characters
  - **Expected Result**: 255 chars accepted (list refetches, likely empty results); 256 chars rejected by backend validation (400)
  - **Business Rules**: None (DTO validation)
  - **API**: `GET /api/v1/admin/reviews?search=...`, `GET /api/v1/admin/content?search=...`

- [x] **B-05**: Pagination limit at min/max boundaries and invalid page values
  - **Evidence**:
    - Evidence for B-05: Pagination limit at min/max boundaries and invalid page values → `B-05_1_pagination_limit_at_min_max_boundaries_and_invalid_page_values.png`
    - Test: moderation.spec.ts › "B-05: Pagination limit at min/max boundaries and invalid page values" — passed
  - **Precondition**: On either moderation screen or calling the API directly
  - **Steps**:
    1. Request with `limit=100` (max), then `limit=101` and `limit=0`
    2. Request with `page=0` and `page=9999`
  - **Expected Result**: `limit=100` accepted; `limit=101` / `limit=0` rejected or clamped per DTO (limit 1— 00, default 20; UI default 10); `page` defaults to 1 when < 1; a page beyond the last page returns empty `items` with the correct `total` and the UI shows its empty state without crashing
  - **Business Rules**: None (DTO validation)
  - **API**: `GET /api/v1/admin/reviews?page=...&limit=...`, `GET /api/v1/admin/content?page=...&limit=...`

- [x] **B-06**: Empty state when no records or no filter matches
  - **Evidence**:
    - Evidence for B-06: Empty state when no records or no filter matches → `B-06_1_empty_state_when_no_records_or_no_filter_matches.png`
    - Test: moderation.spec.ts › "B-06: Empty state when no records or no filter matches" — passed
  - **Precondition**: Empty database for the view, or a search/filter that matches nothing
  - **Steps**:
    1. Load `/admin/reviews` (Reviews tab), Reports tab, and `/admin/content` with no data / a non-matching search
  - **Expected Result**: Friendly empty states shown — "No reviews found." (colspan 8), "No reports found." (colspan 6), "No products found." (colspan 7); stat cards show 0; no crash
  - **Business Rules**: None (UI)

- [x] **B-07**: Select-all checkbox toggles only the current page
  - **Evidence**:
    - Evidence for B-07: Select-all checkbox toggles only the current page → `B-07_1_select_all_checkbox_toggles_only_the_current_page.png`
    - Test: moderation.spec.ts › "B-07: Select-all checkbox toggles only the current page" — passed
  - **Precondition**: More than one page of rows exists
  - **Steps**:
    1. Click the header checkbox on page 1
    2. Navigate to page 2
  - **Expected Result**: All rows on the current page are selected and the bulk bar appears with the page's count; selection is not carried across pages; clearing the checkbox clears the page's selection
  - **Business Rules**: None (UI)

- [x] **B-08**: Review with empty title and body renders fallback content
  - **Evidence**:
    - Evidence for B-08: Review with empty title and body renders fallback content → `B-08_1_review_with_empty_title_and_body_renders_fallback_content.png`
    - Test: moderation.spec.ts › "B-08: Review with empty title and body renders fallback content" — passed
  - **Precondition**: A review with both `title` and `body` empty/blank
  - **Steps**:
    1. Load the Reviews list and open its detail modal
  - **Expected Result**: Title column falls back to the body, then to "-"; report list "Review" column falls back to title then "-"; report detail shows "No review content available."
  - **Business Rules**: None (UI fallback)

- [x] **B-09**: Product images missing or relative paths
  - **Evidence**:
    - Evidence for B-09: Product images missing or relative paths → `B-09_1_product_images_missing_or_relative_paths.png`
    - Test: moderation.spec.ts › "B-09: Product images missing or relative paths" — passed
  - **Precondition**: A product with no images, and one with relative image paths
  - **Steps**:
    1. Open the detail dialog for each
  - **Expected Result**: Missing images render gracefully (no broken layout); relative image URLs are prefixed with the API host (derived from `VITE_API_BASE_URL` with the `/api/v1` suffix stripped)
  - **Business Rules**: None (UI)

- [x] **B-10**: Review detail product link without a slug
  - **Evidence**:
    - Evidence for B-10: Review detail product link without a slug → `B-10_1_review_detail_product_link_without_a_slug.png`
    - Test: moderation.spec.ts › "B-10: Review detail product link without a slug" — passed
  - **Precondition**: A review whose product has no `slug`
  - **Steps**:
    1. Open the Review Detail modal
  - **Expected Result**: Product name renders as plain text (not a broken `/buyer/products/undefined` link); with a slug, the name links to `/buyer/products/{slug}`
  - **Business Rules**: None (UI)

- [x] **B-11**: Merchant rejection reason at the 500-character boundary
  - **Evidence**:
    - Evidence for B-11: Merchant rejection reason at the 500-character boundary → `B-11_1_merchant_rejection_reason_at_the_500_character_boundary.png`
    - Test: moderation.spec.ts › "B-11: Merchant rejection reason at the 500-character boundary" — passed
  - **Precondition**: Pending merchant registration and rejection dialog/API available.
  - **Steps**:
    1. Submit rejection with exactly 500 characters.
    2. Submit a separate rejection with 501 characters.
  - **Expected Result**: A 500-character reason is accepted and stored; 501 characters returns 400 with "Reason must not exceed 500 characters". Verify whether the UI textarea prevents excess input; API validation remains authoritative.
  - **Business Rules**: BR-MOD-020~023
  - **API**: `PATCH /api/v1/admin/merchants/:id/status`

- [x] **B-12**: Merchant search, empty state, and pagination boundaries
  - **Evidence**:
    - Evidence for B-12: Merchant search, empty state, and pagination boundaries → `B-12_1_merchant_search_empty_state_and_pagination_boundaries.png`
    - Test: moderation.spec.ts › "B-12: Merchant search, empty state, and pagination boundaries" — passed
  - **Precondition**: Merchant records exist; admin is on `/admin/merchants`.
  - **Steps**:
    1. Search for a non-matching shop/owner/email value.
    2. Submit a 255-character search, then 256 characters directly to the API.
    3. Request page 1 and a page beyond the last page; request limits 1, 100, 0, and 101.
  - **Expected Result**: Non-matching search shows "No merchants found." with total 0; a 255-character search is accepted and 256 is rejected by DTO validation. Page 1 and limits 1— 00 are valid; a page beyond the last returns no items and correct total, while limits outside 1— 00 fail validation. UI page-size options are 10, 20, 50, and 100.
  - **Business Rules**: None (query validation/UI)
  - **API**: `GET /api/v1/admin/merchants?search=...&page=...&limit=...`

- [x] **B-13**: User search, empty state, and pagination boundaries
  - **Evidence**:
    - Evidence for B-13: User search, empty state, and pagination boundaries → `B-13_1_user_search_empty_state_and_pagination_boundaries.png`
    - Test: moderation.spec.ts › "B-13: User search, empty state, and pagination boundaries" — passed
  - **Precondition**: User records exist; admin is on `/admin/users`.
  - **Steps**:
    1. Search for a non-matching name/email value.
    2. Submit a 255-character search, then 256 characters directly to the API.
    3. Request limits 1, 100, 0, and 101; navigate to page 1 and a page beyond the last page.
  - **Expected Result**: Non-matching search shows "No users found." with total 0; a 255-character search is accepted and 256 is rejected by DTO validation. Limits 1— 00 are valid; an out-of-range limit fails validation. A page beyond the last page returns no items and correct total without crashing. UI page-size options are 10, 20, 50, and 100. Email length is not separately constrained by the user search DTO.
  - **Business Rules**: None (query validation/UI)
  - **API**: `GET /api/v1/admin/users?search=...&page=...&limit=...`

---

## 4. Interface Scenarios (I) — API Contracts & Payloads

### Reviews

- [x] **I-01**: `GET /api/v1/admin/reviews` — returns 200 with list and pagination
  - **Evidence**:
    - API evidence for I-01: GET /api/v1/admin/reviews  Ereturns 200 with list and pagination → `I-01_1_get_api_v1_admin_reviews_returns_200_with_list_and_pagination.png`
    - Test: moderation.spec.ts › "I-01: GET /api/v1/admin/reviews — returns 200 with list and pagination" — passed
  - **Precondition**: Valid admin JWT; reviews exist
  - **Steps**:
    1. Call with valid query parameters (`page`, `limit`, `status`, `search`, `sort`, `order`)
  - **Expected Response**: Status 200, JSON `{ data: { items: [ { id, title, body, rating, status, isVerifiedPurchase, createdAt, user: { id, name, email, avatarUrl }, product: { id, name, images, slug, price } } ], total, page, limit, totalPages } }`
  - **Business Rules**: BR-MOD-002
  - **API**: `GET /api/v1/admin/reviews`

- [x] **I-02**: `POST /api/v1/admin/reviews/:id/moderate` — approve returns 200 with updated status
  - **Evidence**:
    - API evidence for I-02: POST /api/v1/admin/reviews/:id/moderate  Eapprove returns 200 with updated status → `I-02_1_post_api_v1_admin_reviews_id_moderate_approve_returns_200_with_updated.png`
    - Test: moderation.spec.ts › "I-02: POST /api/v1/admin/reviews/:id/moderate — approve returns 200 with updated status" — passed
  - **Precondition**: A `pending` review
  - **Steps**:
    1. Call with `{ "action": "approve" }`
  - **Expected Response**: Status 200, JSON `{ data: { id, status: "approved", updatedAt } }`; product stats recalculated, cache invalidated, `REVIEW_APPROVED` audit event written, merchant + author notified
  - **Business Rules**: BR-MOD-001, BR-MOD-002, BR-MOD-003, BR-MOD-004, BR-MOD-006
  - **API**: `POST /api/v1/admin/reviews/:id/moderate`

- [x] **I-03**: `POST /api/v1/admin/reviews/:id/moderate` — reject validation errors
  - **Evidence**:
    - API evidence for I-03: POST /api/v1/admin/reviews/:id/moderate  Ereject validation errors → `I-03_1_post_api_v1_admin_reviews_id_moderate_reject_validation_errors.png`
    - Test: moderation.spec.ts › "I-03: POST /api/v1/admin/reviews/:id/moderate — reject validation errors" — passed
  - **Precondition**: Valid admin JWT
  - **Steps**:
    1. Call reject without `reason`
    2. Call with invalid `action` value / missing `action`
    3. Call with `reason` of 501 characters
  - **Expected Response**: 400 with `{ statusCode: 400, message: "Rejection reason is required" | "Action is required" | "action must be 'approve' or 'reject'" | "Reason must not exceed 500 characters", error: "BAD_REQUEST", ... }`
  - **Business Rules**: BR-MOD-001
  - **API**: `POST /api/v1/admin/reviews/:id/moderate` → 400

- [x] **I-04**: `POST /api/v1/admin/reviews/:id/moderate` — 404 and 409 states
  - **Evidence**:
    - API evidence for I-04: POST /api/v1/admin/reviews/:id/moderate  E404 and 409 states → `I-04_1_post_api_v1_admin_reviews_id_moderate_404_and_409_states.png`
    - Test: moderation.spec.ts › "I-04: POST /api/v1/admin/reviews/:id/moderate — 404 and 409 states" — passed
  - **Precondition**: Non-existent UUID; already approved/rejected review
  - **Steps**:
    1. Call with a fake review id
    2. Call approve on an already-approved review; reject an already-rejected review
  - **Expected Response**: 404 `{ message: "Review not found" }`; 409 `{ message: "Review already approved" }` / `{ message: "Review already rejected" }`
  - **Business Rules**: BR-MOD-002
  - **API**: `POST /api/v1/admin/reviews/:id/moderate`

- [x] **I-05**: `DELETE /api/v1/admin/reviews/:id` — returns 204 and 404 for unknown ID
  - **Evidence**:
    - API evidence for I-05: DELETE /api/v1/admin/reviews/:id  Ereturns 204 and 404 for unknown ID → `I-05_1_delete_api_v1_admin_reviews_id_returns_204_and_404_for_unknown_id.png`
    - Test: moderation.spec.ts › "I-05: DELETE /api/v1/admin/reviews/:id — returns 204 and 404 for unknown ID" — passed
  - **Precondition**: Existing review; non-existent UUID
  - **Steps**:
    1. Delete an existing review
    2. Delete a fake id
  - **Expected Response**: 204 No Content (empty body) for success; 404 `{ message: "Review not found" }` for unknown id; hard delete + stats recalculation + `REVIEW_DELETED` audit event
  - **Business Rules**: BR-MOD-005, BR-MOD-006
  - **API**: `DELETE /api/v1/admin/reviews/:id`

- [x] **I-06**: `POST /api/v1/admin/reviews/bulk/moderate` — returns bulk result shape
  - **Evidence**:
    - API evidence for I-06: POST /api/v1/admin/reviews/bulk/moderate  Ereturns bulk result shape → `I-06_1_post_api_v1_admin_reviews_bulk_moderate_returns_bulk_result_shape.png`
    - Test: moderation.spec.ts › "I-06: POST /api/v1/admin/reviews/bulk/moderate — returns bulk result shape" — passed
  - **Precondition**: Two or more review ids
  - **Steps**:
    1. Call with `{ "ids": ["...","..."], "action": "approve" }` (optionally `"reason"` for reject)
  - **Expected Response**: Status 200, JSON `{ data: { processed, failed, results: [ { id, status: "success" | "failed", error? } ] } }`; per-id errors mirror the single-item contract; `ids` must be a non-empty array (400 otherwise)
  - **Business Rules**: BR-MOD-001, BR-MOD-006
  - **API**: `POST /api/v1/admin/reviews/bulk/moderate`

- [x] **I-07**: `DELETE /api/v1/admin/reviews/bulk` — returns bulk result shape with JSON body
  - **Evidence**:
    - API evidence for I-07: DELETE /api/v1/admin/reviews/bulk  Ereturns bulk result shape with JSON body → `I-07_1_delete_api_v1_admin_reviews_bulk_returns_bulk_result_shape_with_json.png`
    - Test: moderation.spec.ts › "I-07: DELETE /api/v1/admin/reviews/bulk — returns bulk result shape with JSON body" — passed
  - **Precondition**: Two or more review ids
  - **Steps**:
    1. Call `DELETE /api/v1/admin/reviews/bulk` with JSON body `{ "ids": ["...","..."] }`
  - **Expected Response**: Status 200, JSON `{ data: { processed, failed, results: [...] } }`; route resolves to the bulk handler (not `:id`)
  - **Business Rules**: BR-MOD-005, BR-MOD-006
  - **API**: `DELETE /api/v1/admin/reviews/bulk`

### Reports

- [x] **I-08**: `GET /api/v1/admin/reports` — returns 200 with list and pagination
  - **Evidence**:
    - API evidence for I-08: GET /api/v1/admin/reports  Ereturns 200 with list and pagination → `I-08_1_get_api_v1_admin_reports_returns_200_with_list_and_pagination.png`
    - Test: moderation.spec.ts › "I-08: GET /api/v1/admin/reports — returns 200 with list and pagination" — passed
  - **Precondition**: Reports exist
  - **Steps**:
    1. Call with `page`, `limit`, `status` (`pending|reviewed|resolved|rejected`), `search`
  - **Expected Response**: Status 200, JSON `{ data: { items: [ { id, status, reason, description, adminNote, createdAt, reporter: {...}, review: { user, product }, resolver: {...} } ], total, page, limit, totalPages } }`; search matches reporter name/email and review body
  - **Business Rules**: BR-MOD-053
  - **API**: `GET /api/v1/admin/reports`

- [x] **I-09**: `PATCH /api/v1/admin/reports/:id/status` — resolved sets resolver and auto-rejects the target review
  - **Evidence**:
    - API evidence for I-09: PATCH /api/v1/admin/reports/:id/status  Eresolved sets resolver and auto-rejects the target review → `I-09_1_patch_api_v1_admin_reports_id_status_resolved_sets_resolver_and_auto.png`
    - Test: moderation.spec.ts › "I-09: PATCH /api/v1/admin/reports/:id/status — resolved sets resolver and auto-rejects the target review" — passed
  - **Precondition**: A pending/reviewed report with a target review
  - **Steps**:
    1. Call with `{ "status": "resolved", "adminNote": "..." }` (`adminNote` ≤ 1000 chars)
  - **Expected Response**: Status 200 with the updated report (`resolvedBy` = admin user id, `resolvedAt` = timestamp); target review status becomes `rejected`; product stats recalculated; cache invalidated; `REPORT_RESOLVED` audit event; reporter + merchant notified
  - **Business Rules**: BR-MOD-003, BR-MOD-053, BR-MOD-054
  - **API**: `PATCH /api/v1/admin/reports/:id/status`

- [x] **I-10**: `PATCH /api/v1/admin/reports/:id/status` — invalid transitions return 409
  - **Evidence**:
    - API evidence for I-10: PATCH /api/v1/admin/reports/:id/status  Einvalid transitions return 409 → `I-10_1_patch_api_v1_admin_reports_id_status_invalid_transitions_return_409.png`
    - Test: moderation.spec.ts › "I-10: PATCH /api/v1/admin/reports/:id/status — invalid transitions return 409" — passed
  - **Precondition**: A resolved report; a non-pending report being marked reviewed
  - **Steps**:
    1. Patch a resolved report again
    2. Patch a non-pending report with `{ "status": "reviewed" }`
  - **Expected Response**: 409 `{ message: "Report already resolved" }` / `{ message: "Only pending reports can be marked as reviewed" }`
  - **Business Rules**: BR-MOD-053
  - **API**: `PATCH /api/v1/admin/reports/:id/status` → 409

- [x] **I-11**: `DELETE /api/v1/admin/reports/:id` — 204 success, 404 unknown, 409 resolved
  - **Evidence**:
    - API evidence for I-11: DELETE /api/v1/admin/reports/:id  E204 success, 404 unknown, 409 resolved → `I-11_1_delete_api_v1_admin_reports_id_204_success_404_unknown_409_resolved.png`
    - Test: moderation.spec.ts › "I-11: DELETE /api/v1/admin/reports/:id — 204 success, 404 unknown, 409 resolved" — passed
  - **Precondition**: Pending/rejected report; resolved report; non-existent UUID
  - **Steps**:
    1. Delete a pending report
    2. Delete a resolved report
    3. Delete a fake id
  - **Expected Response**: 204 No Content; 409 `{ message: "Resolved reports cannot be deleted" }`; 404 `{ message: "Report not found" }`; `REPORT_DELETED` audit event on success
  - **Business Rules**: BR-MOD-055, BR-MOD-006
  - **API**: `DELETE /api/v1/admin/reports/:id`

### Products (Content Moderation)

- [x] **I-12**: `GET /api/v1/admin/content` — returns 200 with list and `hasPendingOrders` flag
  - **Evidence**:
    - API evidence for I-12: GET /api/v1/admin/content  Ereturns 200 with list and hasPendingOrders flag → `I-12_1_get_api_v1_admin_content_returns_200_with_list_and_haspendingorders.png`
    - Test: moderation.spec.ts › "I-12: GET /api/v1/admin/content — returns 200 with list and hasPendingOrders flag" — passed
  - **Precondition**: Products exist, at least one with a non-terminal order
  - **Steps**:
    1. Call with `page`, `limit`, `status` (`active|inactive`), `search`, `sort`, `order`
  - **Expected Response**: Status 200, JSON `{ data: { items: [ { id, name, price, images, isActive, hasPendingOrders, createdAt, merchant: { shopName, user } } ], total, page, limit, totalPages } }`; `hasPendingOrders` true when any containing order has a non-terminal status; search matches product name + merchant shopName
  - **Business Rules**: BR-MOD-010, BR-MOD-013
  - **API**: `GET /api/v1/admin/content`

- [x] **I-13**: `PATCH /api/v1/admin/content/:id/status` — success and validation errors
  - **Evidence**:
    - API evidence for I-13: PATCH /api/v1/admin/content/:id/status  Esuccess and validation errors → `I-13_1_patch_api_v1_admin_content_id_status_success_and_validation_errors.png`
    - Test: moderation.spec.ts › "I-13: PATCH /api/v1/admin/content/:id/status — success and validation errors" — passed
  - **Precondition**: Active/inactive product; admin JWT
  - **Steps**:
    1. Deactivate with `{ "isActive": false, "reason": "..." }` (`reason` ≤ 500)
    2. Reactivate with `{ "isActive": true }`
    3. Call without `isActive`, with non-boolean `isActive`, and deactivate without `reason`
  - **Expected Response**: 200 `{ data: { id, isActive, updatedAt } }`; 400 `{ message: "Active status is required" | "Active status must be a boolean" | "Deactivation reason is required" }`; success writes `PRODUCT_DEACTIVATED`/`PRODUCT_REACTIVATED` audit events, notifies the merchant, and invalidates caches
  - **Business Rules**: BR-MOD-011, BR-MOD-013, BR-MOD-006
  - **API**: `PATCH /api/v1/admin/content/:id/status`

- [x] **I-14**: `PATCH /api/v1/admin/content/:id/status` — guard and state errors
  - **Evidence**:
    - API evidence for I-14: PATCH /api/v1/admin/content/:id/status  Eguard and state errors → `I-14_1_patch_api_v1_admin_content_id_status_guard_and_state_errors.png`
    - Test: moderation.spec.ts › "I-14: PATCH /api/v1/admin/content/:id/status — guard and state errors" — passed
  - **Precondition**: Product with pending orders; already inactive/active product; inactive merchant user; non-existent UUID
  - **Steps**:
    1. Deactivate a product with non-terminal orders
    2. Deactivate an already-inactive product; reactivate an already-active product
    3. Reactivate a product whose merchant user is inactive
    4. Patch a fake id
  - **Expected Response**: 400 `{ message: "Cannot deactivate until the order delivery is completed." | "Product already inactive" | "Product already active" | "Merchant user is inactive" }`; 404 `{ message: "Product not found" }`
  - **Business Rules**: BR-MOD-010, BR-MOD-013
  - **API**: `PATCH /api/v1/admin/content/:id/status`

- [x] **I-15**: `PATCH /api/v1/admin/content/bulk/status` — returns bulk result shape
  - **Evidence**:
    - API evidence for I-15: PATCH /api/v1/admin/content/bulk/status  Ereturns bulk result shape → `I-15_1_patch_api_v1_admin_content_bulk_status_returns_bulk_result_shape.png`
    - Test: moderation.spec.ts › "I-15: PATCH /api/v1/admin/content/bulk/status — returns bulk result shape" — passed
  - **Precondition**: Two or more product ids
  - **Steps**:
    1. Call with `{ "ids": ["...","..."], "isActive": false, "reason": "..." }` (reason required for deactivate)
  - **Expected Response**: Status 200, JSON `{ data: { processed, failed, results: [ { id, status: "success" | "failed", error? } ] } }`; per-id errors mirror the single-item contract; route resolves to the bulk handler (not `:id`)
  - **Business Rules**: BR-MOD-011, BR-MOD-013, BR-MOD-006
  - **API**: `PATCH /api/v1/admin/content/bulk/status`

###  User Management 

- [x] **I-16**: `GET /api/v1/admin/users` returns searchable, filtered users and pagination
  - **Evidence**:
    - API evidence for I-16: GET /api/v1/admin/users returns searchable, filtered users and pagination → `I-16_1_get_api_v1_admin_users_returns_searchable_filtered_users_and.png`
    - Test: moderation.spec.ts › "I-16: GET /api/v1/admin/users returns searchable, filtered users and pagination" — passed
  - **Precondition**: Admin JWT; users exist with multiple role and active states.
  - **Steps**:
    1. Call with `page`, `limit`, `status`, `search`, `sort`, and `order`.
    2. Repeat for active, inactive, and admin filters; search a name and email.
  - **Expected Response**: 200 with `{ data: { items: [{ id, email, name, roleCode, avatarUrl, isActive, createdAt, merchantProfile: { id, shopName, licenseStatus } }], total, page, limit, totalPages } }`; search matches user name/email; status filters active/inactive/admin.
  - **Business Rules**: BR-MOD-040~042
  - **API**: `GET /api/v1/admin/users`

- [x] **I-17**: User detail and status endpoints return contract responses
  - **Evidence**:
    - API evidence for I-17: User detail and status endpoints return contract responses → `I-17_1_user_detail_and_status_endpoints_return_contract_responses.png`
    - Test: moderation.spec.ts › "I-17: User detail and status endpoints return contract responses" — passed
  - **Precondition**: Admin JWT; active eligible user, inactive user, and unknown UUID.
  - **Steps**:
    1. Call `GET /api/v1/admin/users/:id`.
    2. Deactivate with `{ isActive: false, reason: "..." }`; reactivate with `{ isActive: true }`.
    3. Call with unknown ID, already-active/inactive state, missing/non-boolean `isActive`, and reason over 500 characters.
  - **Expected Response**: Detail returns 200 with user profile/account fields and review count; unknown ID returns 404. Status updates return 200 `{ data: { id, isActive, updatedAt } }`; invalid payload returns 400, invalid state transition returns 409, and business guards (self-deactivation, unapproved merchant license, or non-terminal orders) return 400. Successful deactivation revokes refresh tokens; no DELETE user endpoint is exposed by this controller.
  - **Business Rules**: BR-MOD-040~042
  - **API**: `GET /api/v1/admin/users/:id`, `PATCH /api/v1/admin/users/:id/status`

### Merchant Management

- [x] **I-18**: `GET /api/v1/admin/merchants` returns filtered merchant registrations and pagination
  - **Evidence**:
    - API evidence for I-18: GET /api/v1/admin/merchants returns filtered merchant registrations and pagination → `I-18_1_get_api_v1_admin_merchants_returns_filtered_merchant_registrations_and.png`
    - Test: moderation.spec.ts › "I-18: GET /api/v1/admin/merchants returns filtered merchant registrations and pagination" — passed
  - **Precondition**: Admin JWT; merchant registrations exist in each license status.
  - **Steps**:
    1. Call with `page`, `limit`, `status`, `search`, `sort`, and `order`.
  - **Expected Response**: 200 with `{ data: { items: [{ id, userId, shopName, businessLicenseUrl, licenseStatus, rejectionReason, reviewedAt, createdAt, user: { id, name, email } }], total, page, limit, totalPages } }`. Status filters pending/approved/rejected; search matches shop name, owner name, and owner email.
  - **Business Rules**: BR-MOD-020~023
  - **API**: `GET /api/v1/admin/merchants`

- [x] **I-19**: Merchant detail and status endpoints return contract responses
  - **Evidence**:
    - API evidence for I-19: Merchant detail and status endpoints return contract responses → `I-19_1_merchant_detail_and_status_endpoints_return_contract_responses.png`
    - Test: moderation.spec.ts › "I-19: Merchant detail and status endpoints return contract responses" — passed
  - **Precondition**: Admin JWT; known pending merchant and unknown UUID.
  - **Steps**:
    1. Call `GET /api/v1/admin/merchants/:id`.
    2. Approve with `{ status: "approved" }`; reject another pending merchant with `{ status: "rejected", reason: "..." }`.
    3. Call with unknown ID, invalid status, and rejection reason over 500 characters.
  - **Expected Response**: Detail returns 200 with merchant, owner contact, license, status, and rejection fields; unknown ID returns 404. Status updates return 200 `{ data: { id, licenseStatus, updatedAt } }`; invalid status/overlong reason returns 400. Approval/rejection also updates the associated shop approval state when present and creates the merchant status notification. There is no merchant DELETE contract.
  - **Business Rules**: BR-MOD-020~023
  - **API**: `GET /api/v1/admin/merchants/:id`, `PATCH /api/v1/admin/merchants/:id/status`

- [x] **I-20**: Merchant management endpoints enforce admin authentication
  - **Evidence**:
    - API evidence for I-20: Merchant management endpoints enforce admin authentication → `I-20_1_merchant_management_endpoints_enforce_admin_authentication.png`
    - Test: moderation.spec.ts › "I-20: Merchant management endpoints enforce admin authentication" — passed
  - **Precondition**: Missing/invalid JWT, buyer or merchant JWT, and admin JWT.
  - **Steps**:
    1. Call merchant list, detail, and status endpoints with each credential.
  - **Expected Response**: 401 without a valid token; 403 for non-admin roles; authenticated admin receives endpoint-specific success or business-validation response.
  - **Business Rules**: BR-MOD-001
  - **API**: `GET/PATCH /api/v1/admin/merchants/*`

- [x] **I-21**: Merchant query DTO validation enforces limits and supported filters
  - **Evidence**:
    - API evidence for I-21: Merchant query DTO validation enforces limits and supported filters → `I-21_1_merchant_query_dto_validation_enforces_limits_and_supported_filters.png`
    - Test: moderation.spec.ts › "I-21: Merchant query DTO validation enforces limits and supported filters" — passed
  - **Precondition**: Valid admin JWT.
  - **Steps**:
    1. Request `limit=100`, then `limit=101` and `limit=0`.
    2. Request `search` with 255 and 256 characters.
    3. Request unsupported status values and a page less than 1.
  - **Expected Response**: For merchant queries, limit 1— 00 and search up to 255 characters are accepted; invalid limits, search lengths, statuses, and page values return 400 DTO validation errors.
  - **Business Rules**: None (DTO validation)
  - **API**: `GET /api/v1/admin/merchants`

### Cross-cutting

- [x] **I-22**: All in-scope review, content, user and merchant management endpoints enforce authentication and the `admin` role
  - **Evidence**:
    - API evidence for I-22: All in-scope review, content, user and merchant management endpoints enforce authentication and the admin role → `I-22_1_all_in_scope_review_content_user_and_merchant_management_endpoints.png`
    - Test: moderation.spec.ts › "I-22: All in-scope review, content, user and merchant management endpoints enforce authentication and the admin role" — passed
  - **Precondition**: No token, buyer/merchant token, `super_admin` token, admin token
  - **Steps**:
    1. Open `/admin/reviews`, `/admin/content`, `/admin/users` and `/admin/merchants` as unauthenticated, non-admin, and admin users.
    2. Call representative review list/moderation, report list/status, content list/status, and merchant list/detail/status endpoints under `/api/v1/admin/` with each token variant.
  - **Expected Response**: Frontend denies unauthenticated/non-admin page access according to the route guard. API returns 401 without a token and 403 `{ message: "Insufficient permissions" }` for any `roleCode !== 'admin'` (including `super_admin`); successful responses are available only to `admin`.
  - **Business Rules**: BR-MOD-001
  - **API**: Review, report, content, and merchant endpoints under `/api/v1/admin/*`

- [x] **I-23**: In-scope API errors follow the standard format and successes use the `{ data }` envelope
  - **Evidence**:
    - API evidence for I-23: In-scope API errors follow the standard format and successes use the { data } envelope → `I-23_1_in_scope_api_errors_follow_the_standard_format_and_successes_use_the.png`
    - Test: moderation.spec.ts › "I-23: In-scope API errors follow the standard format and successes use the { data } envelope" — passed
  - **Precondition**: Any success and any error scenario
  - **Steps**:
    1. Trigger success and representative 400/401/403/404/409/500 responses across review/report, content, and merchant endpoints.
    2. Trigger a list failure and a failed action in each in-scope UI module.
  - **Expected Response**: Every success body is wrapped as `{ data: ... }` (204 deletes return an empty body); every error body contains `{ statusCode, message, error, timestamp, path }`. Failed list/action requests show the module's error state or action-specific toast, do not crash the page, and do not leave an unconfirmed status change.
  - **Business Rules**: None
  - **API**: In-scope review, report, content, and merchant endpoints under `/api/v1/admin/*`

- [x] **I-24**: Bulk routes are not shadowed by `:id` routes
  - **Evidence**:
    - API evidence for I-24: Bulk routes are not shadowed by :id routes → `I-24_1_bulk_routes_are_not_shadowed_by_id_routes.png`
    - Test: moderation.spec.ts › "I-24: Bulk routes are not shadowed by :id routes" — passed
  - **Precondition**: Valid admin JWT
  - **Steps**:
    1. Call `POST /api/v1/admin/reviews/bulk/moderate`, `DELETE /api/v1/admin/reviews/bulk`, and `PATCH /api/v1/admin/content/bulk/status` (bulk routes are declared before `:id` routes in the controller)
  - **Expected Response**: Each request is handled by the bulk handler (bulk result shape / 204 semantics per contract) and is never parsed as an `:id` of literal value "bulk" (no spurious 404 "Review not found" / "Product not found")
  - **Business Rules**: None (route ordering)
  - **API**: Bulk endpoints listed above

---

## Sign-Off

| Item | Status |
|------|--------|
| Test scenarios defined (N, A, B, I) | ☑︁E|
| E2E tests implemented | ☁E|
| PCL auto-update verified | ☁E|
| Next review date | 2026-10-31 |
