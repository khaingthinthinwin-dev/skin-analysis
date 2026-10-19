# Functional Specification — Admin Ad Management Screen

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-FDS-ADM-001 |
| **Target Screen** | Admin Ad Management — Ad Review, Approval, Fee Management, Analytics & Reporting |
| **Subsystem** | Advertisement Management — Admin Ad Approval, Bulk Operations, Package/Fee Management, Revenue Analytics, Export Reports |
| **Function ID** | FN-ADM-001 |
| **Version** | 2.0 |
| **Created** | 2026-08-24 |
| **Last Updated** | 2026-10-15 |
| **Author** | Software Architect |
| **Status** | Released |
| **Classification** | Internal — Engineering Division |

---

## Document Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-08-24 | Software Architect | Initial functional specification |
| 1.1 | 2026-08-25 | Software Architect | Added fee create/deactivate operations; restricted export to CSV |
| 2.0 | 2026-10-15 | Software Architect | Full rewrite to match actual codebase: corrected placements, routes, currency (KS), added reactivate/delete fee history, month filter, debounced search, two-step reject flow, allPackages-created logic, updated all table columns and responsive behavior |

---

## Table of Contents

1. [Functional Overview](#1-functional-overview)
2. [Use Cases and Business Workflow](#2-use-cases-and-business-workflow)
3. [State Transition Specification](#3-state-transition-specification)
4. [Business Rules](#4-business-rules)
5. [Screen Specifications](#5-screen-specifications)
6. [Functional Operation Specification](#6-functional-operation-specification)
7. [Input / Output Specification](#7-input--output-specification)
8. [Input Validation Rules](#8-input-validation-rules)
9. [Error Handling Specification](#9-error-handling-specification)
10. [Permission and Access Control](#10-permission-and-access-control)
11. [Real-Time Notification Behavior](#11-real-time-notification-behavior)
12. [Screen Transition Specification](#12-screen-transition-specification)
13. [Non-Functional Considerations](#13-non-functional-considerations)
14. [Configurable Items](#14-configurable-items)
15. [Cross-Reference Traceability Matrix](#15-cross-reference-traceability-matrix)

---

## 1. Functional Overview

### 1.1 Purpose and Scope

This screen subsystem provides platform administrators with full control over the advertisement lifecycle within the Cosmetics Finder platform. It covers the complete admin-side responsibilities: reviewing and approving/rejecting shop-submitted advertisements (individually or in bulk), managing advertisement package pricing and fee configurations (including create, edit, deactivate, reactivate), tracking fee change history with deletion of old records, analyzing platform-wide ad revenue breakdowns by placement and tier, and exporting ad performance and fee history reports in CSV format.

### 1.2 Functional Responsibilities

1. **Ad Review & Approval** — Reviewing pending shop advertisements, approving or rejecting individually with reason, tracking approval metadata (approvedBy, approvedAt).
2. **Bulk Approval / Rejection** — Selecting multiple pending ads via checkboxes and approving or rejecting them in a single batch action, with a common rejection reason for bulk rejects and automated batch refunds.
3. **Package & Fee Management** — Creating, editing, deactivating, and reactivating fee settings per placement and tier. All changes logged to fee history with timestamps, before/after values, and reasons.
4. **Fee History Tracking & Deletion** — Viewing all pricing changes with full audit trail. Deleting old history records (current month protected).
5. **Revenue Breakdown Analytics** — Providing summary metrics, charts, and tables breaking down generated ad revenue by placement location and pricing tier over custom date ranges.
6. **Export Reports** — Exporting Ad Performance reports, Shop ad submission history, and Fee History logs in CSV format via direct download.
7. **Audit Logging** — Recording all significant admin actions to the audit trail.

### 1.3 Target Users

| Attribute | Value |
|-----------|-------|
| **Primary Actor** | Platform Administrator |
| **Required Authentication** | JWT Bearer Token (`admin` role) |
| **Data Scope** | All platform advertisements, all fee settings, all ad payments, platform-wide revenue data |

### 1.4 Placements and Tiers

**Placements** (4 total):

| Placement Value | Display Label |
|-----------------|---------------|
| `search_page_banner` | Search Page Banner |
| `recommendation_page_banner` | Recommendation Page Banner |
| `checkout_page_banner` | Checkout Page Banner |
| `productDetail_page_banner` | Product Detail Page Banner |

**Tiers** (3 total):

| Tier Value | Display Label |
|------------|---------------|
| `basic` | Basic |
| `standard` | Standard |
| `premium` | Premium |

**Total package combinations**: 4 placements × 3 tiers = 12 possible fee settings.

### 1.5 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/admin/ads` | GET | List all ads with filters and pagination |
| `/admin/ads/:id` | GET | Get single ad detail |
| `/admin/ads/:id/approve` | POST | Approve a pending ad |
| `/admin/ads/:id/reject` | POST | Reject a pending ad with reason |
| `/admin/ads/bulk/approve` | POST | Bulk approve ads |
| `/admin/ads/bulk/reject` | POST | Bulk reject ads with common reason |
| `/admin/ad-fees` | GET | List all fee settings |
| `/admin/ad-fees` | POST | Create a new fee setting |
| `/admin/ad-fees/:id` | PUT | Update a fee setting |
| `/admin/ad-fees/:id/deactivate` | PATCH | Deactivate a fee setting |
| `/admin/ad-fees/:id/reactivate` | PATCH | Reactivate a fee setting |
| `/admin/ad-fees/history` | GET | List fee change history with filters |
| `/admin/ad-fees/history` | DELETE | Delete fee history records |
| `/admin/ads/analytics/revenue` | GET | Revenue analytics data |
| `/admin/ads/export/ad-performance` | POST | Export ad performance CSV |
| `/admin/ads/export/submission-history` | POST | Export submission history CSV |
| `/admin/ads/export/fee-history` | POST | Export fee history CSV |

---

## 2. Use Cases and Business Workflow

### 2.1 Use Case Catalog

| UC-ID | Use Case Name | Precondition | Postcondition | Triggering Actor |
|-------|---------------|--------------|---------------|------------------|
| UC-ADM-001 | Review Pending Advertisements | Admin is authenticated | List of ads displayed with filters | Admin |
| UC-ADM-002 | Approve Single Advertisement | Admin selected a pending ad | Ad approved with metadata recorded | Admin |
| UC-ADM-003 | Reject Single Advertisement | Admin selected a pending ad with reason | Ad rejected, refund initiated | Admin |
| UC-ADM-004 | Bulk Approve Advertisements | Admin selected multiple pending ads | All selected ads approved | Admin |
| UC-ADM-005 | Bulk Reject Advertisements | Admin selected multiple pending ads with reason | All selected ads rejected, batch refunds | Admin |
| UC-ADM-006 | View Ad Detail | Admin clicked view on any ad | Full ad details displayed | Admin |
| UC-ADM-007 | Manage Fee Settings | Admin is authenticated | Admin can view, create, edit, deactivate, reactivate fee settings | Admin |
| UC-ADM-008 | View Fee Change History | Admin wants pricing history | Historical fee changes displayed | Admin |
| UC-ADM-009 | Delete Fee Change History | Admin selected deletable records | Old records deleted (current month protected) | Admin |
| UC-ADM-010 | View Revenue Analytics | Admin wants financial data | Revenue charts and metrics displayed | Admin |
| UC-ADM-011 | Export Ad Performance Report | Admin wants ad performance data | CSV file downloaded | Admin |
| UC-ADM-012 | Export Submission History | Admin wants submission records | CSV file downloaded | Admin |
| UC-ADM-013 | Export Fee History Log | Admin wants fee change audit trail | CSV file downloaded | Admin |
| UC-ADM-014 | Create Fee Setting | Admin wants new fee configuration | New fee setting created (max 12 combinations) | Admin |
| UC-ADM-015 | Deactivate Fee Setting | Admin wants to deactivate a setting | Fee setting deactivated, new purchases blocked | Admin |
| UC-ADM-016 | Reactivate Fee Setting | Admin wants to reactivate a setting | Fee setting reactivated | Admin |

### 2.2 Primary Business Workflow — Admin Ad Review

```
┌──────────────────────────────┐
│  Admin Dashboard             │
│  (Advertisement Management)  │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  View Advertisement List     │
│  (Filters + Checkbox         │
│   Selection + Pagination)    │
└──────────┬───────────────────┘
           │
     ┌─────┴──────────────────┐
     │                        │
     ▼                        ▼
┌──────────────┐    ┌──────────────────────┐
│ Single Review│    │ Bulk Selection       │
│ (Click Review│    │ (Check multiple      │
│  on one ad)  │    │  pending ads)        │
└──────┬───────┘    └──────────┬───────────┘
       │                 ┌─────┴─────┐
       ▼                 ▼           ▼
┌──────────────┐  ┌──────────┐ ┌──────────────┐
│ Review Modal │  │ BULK     │ │ BULK         │
│ - Content    │  │ APPROVE  │ │ REJECT       │
│ - Shop Info  │  └────┬─────┘ └──────┬───────┘
│ - Fee/Payment│       │              │
└──────┬───────┘       │              │
  ┌────┴────┐          │              │
  ▼         ▼          ▼              ▼
┌────────┐┌────────┐┌──────────┐┌──────────────┐
│APPROVE ││REJECT  ││Batch     ││Batch         │
│        ││(2-step)││Approve   ││Reject +      │
│        ││        ││All       ││Common Reason │
│        ││        ││Selected  ││+ Batch       │
│        ││        ││          ││Refund        │
└───┬────┘└───┬────┘└────┬─────┘└──────┬───────┘
    │         │          │              │
    ▼         ▼          ▼              ▼
┌──────────────────────────────────────────────┐
│  System: Update status, record metadata,      │
│  send notifications, process refunds,         │
│  log to audit trail                           │
└──────────────────────────────────────────────┘
```

---

## 3. State Transition Specification

### 3.1 Advertisement Approval States

| State | Description | Is Displayed | Admin Can Act |
|-------|-------------|:------------:|:-------------:|
| `pending` | Submitted by shop, awaiting admin review | No | Approve, Reject, Bulk Approve, Bulk Reject |
| `approved` | Admin approved, displayed on platform | Yes | View only |
| `rejected` | Admin rejected with reason, refund processed | No | View only |

### 3.2 Ad Lifecycle Transitions (Admin-Triggered)

| Transition ID | Origin State | Target State | Trigger Action | Guard Conditions |
|---------------|--------------|--------------|----------------|------------------|
| TR-ADM-01 | `pending` | `approved` | Admin approves (single) | Admin authenticated, ad in pending state |
| TR-ADM-02 | `pending` | `rejected` | Admin rejects (single) | Admin authenticated, rejection reason provided |
| TR-ADM-03 | `pending` | `approved` | Admin bulk approves | Admin authenticated, all selected ads in pending state |
| TR-ADM-04 | `pending` | `rejected` | Admin bulk rejects | Admin authenticated, common rejection reason provided |

### 3.3 Fee Settings State Transitions

| Transition ID | Origin State | Target State | Trigger Action | Guard Conditions |
|---------------|--------------|--------------|----------------|------------------|
| TR-FEE-01 | — | Active | Admin creates fee setting | Valid placement, tier, dailyRate > 0; combination not already existing |
| TR-FEE-02 | Active | Updated | Admin edits fee | Change logged to fee history with reason |
| TR-FEE-03 | Active | Inactive | Admin deactivates | Required change reason; existing ads unaffected |
| TR-FEE-04 | Inactive | Active | Admin reactivates | Optional change reason |

### 3.4 Fee History Deletion Protection

| Rule | Description |
|------|-------------|
| Current month protection | Records created in the current calendar month (UTC) cannot be deleted |
| Previous month deletion | Records from previous months can be deleted individually or in bulk (max 50) |
| API enforcement | Backend rejects deletion of current-month records regardless of request |

---

## 4. Business Rules

### 4.1 Ad Review & Approval Rules

| Rule ID | Rule Name | Description |
|---------|-----------|-------------|
| BR-ADM-001 | Admin Approval Required | Only admins can approve or reject advertisements |
| BR-ADM-002 | Rejection Reason Required | Admin must provide a reason when rejecting (1–1000 chars) |
| BR-ADM-003 | Approval Metadata | On approval, record `approvedBy` and `approvedAt` |
| BR-ADM-004 | Refund on Rejection | Rejecting an ad triggers refund of the completed payment |
| BR-ADM-005 | Pending State Guard | Only ads with `approvalStatus='pending'` can be approved/rejected |

### 4.2 Bulk Operation Rules

| Rule ID | Rule Name | Description |
|---------|-----------|-------------|
| BR-ADM-010 | Bulk Selection Limit | Maximum 50 ads per bulk operation |
| BR-ADM-011 | Bulk Selection | Only pending ads are selectable via checkboxes |
| BR-ADM-012 | Bulk Reject Common Reason | A single rejection reason applied to all selected ads |
| BR-ADM-013 | Bulk Refund Processing | Refunds processed sequentially; failures logged but do not block |

### 4.3 Fee Management Rules

| Rule ID | Rule Name | Description |
|---------|-----------|-------------|
| BR-ADM-020 | Placement-Tier Uniqueness | Only one fee setting per placement+tier combination |
| BR-ADM-021 | Total Combinations | Maximum 12 fee settings (4 placements × 3 tiers) |
| BR-ADM-022 | Daily Rate Validation | Daily rate must be > 0 |
| BR-ADM-023 | Duration Validation | Duration days must be ≥ 1 |
| BR-ADM-024 | Max Ads Validation | Max ads must be ≥ 1 |
| BR-ADM-025 | Create Default Reason | Creation form auto-fills change reason as "Initial fee setting" |
| BR-ADM-026 | Deactivate Reason Required | Deactivation requires a change reason (1–1000 chars) |
| BR-ADM-027 | Reactivate Reason Optional | Reactivation change reason is optional (max 1000 chars) |
| BR-ADM-028 | Deactivate Notice | Existing ads unaffected; new purchases blocked while inactive |
| BR-ADM-029 | Fee Change Logging | All changes logged to `ad_feeHistory` with before/after values |
| BR-ADM-030 | Fee History Deletion Protection | Current calendar month records cannot be deleted |
| BR-ADM-031 | Fee History Bulk Delete Limit | Maximum 50 history records per bulk delete |

### 4.4 Revenue Analytics Rules

| Rule ID | Rule Name | Description |
|---------|-----------|-------------|
| BR-ADM-040 | Default Date Range | Analytics defaults to last 30 days |
| BR-ADM-041 | Date Range Required | Both start and end dates required |
| BR-ADM-042 | Placement Filter | Revenue can be filtered by placement (multi-select) |
| BR-ADM-043 | Tier Filter | Revenue can be filtered by tier (multi-select) |
| BR-ADM-044 | Revenue Source | Revenue aggregated from completed payments of approved ads |

### 4.5 Export Rules

| Rule ID | Rule Name | Description |
|---------|-----------|-------------|
| BR-ADM-050 | Format | CSV only (format selector is disabled/locked to CSV) |
| BR-ADM-051 | Date Range | Both start and end dates required; end must be ≥ start |
| BR-ADM-052 | Default Date Range | Export defaults to last 30 days |
| BR-ADM-053 | Ad Performance Filters | Supports placement, tier, status filters |
| BR-ADM-054 | Submission History Filters | Supports shop name search filter |
| BR-ADM-055 | Fee History Filters | Supports placement, tier filters |
| BR-ADM-056 | Filename Pattern | `{reportType}_from{dateFrom}_to{dateTo}.csv` |

### 4.6 Currency Format

All monetary values are displayed in Myanmar Kyat (KS) format: `15,000 KS`.

---

## 5. Screen Specifications

### 5.1 Screen: Advertisement List (`/admin/ads`)

**Purpose:** Display all advertisements with filtering, searching, bulk selection, and pagination.

#### 5.1.1 Page Header

- Title: "Advertisement Management"
- Subtitle: "Review merchant ads and manage advertising fees"
- Pending count badge (amber): "{n} pending"
- Navigation buttons: "Manage Packages" → `/admin/ads/packages`, "Revenue Analytics" → `/admin/ads/analytics`, "Export" → `/admin/ads/export`

#### 5.1.2 Filter Bar

| Filter | Type | Behavior |
|--------|------|----------|
| Shop Search | Input with search icon | 300ms debounce; triggers API call after delay |
| Status | Select | All Status, Pending, Approved, Rejected |
| Placement | Select | All Placements, Search Page Banner, Recommendation Page Banner, Checkout Page Banner, Product Detail Page Banner |
| Tier | Select | All Tiers, Basic, Standard, Premium |
| Date Range | DateRangePicker | From/To date inputs with auto-correct (if From > To, To adjusts to match From) |
| Refresh | Button | Resets all filters to default |

- Changing any filter resets pagination to page 1.

#### 5.1.3 Bulk Action Bar

Visible when ads are selected. Shows selected count, "Bulk Approve" button, "Bulk Reject" button, and "Clear" button.

#### 5.1.4 Ad Table

| Column | Description | Responsive |
|--------|-------------|------------|
| Checkbox | Select individual pending ads; non-pending ads disabled | All |
| Shop | Shop name (truncated, max 110px) | All |
| Title | Ad title (truncated, max 120px); shows "NEW" badge if highlighted | All |
| Placement | Placement label | Hidden below xl |
| Tier | Tier badge (Basic=gray, Standard=blue, Premium=purple) | All |
| Status | Approval status badge (Pending=amber, Approved=green, Rejected=red) | All |
| Payment | Payment status badge (Completed=green, Pending=amber, Refunded=gray) | All |
| Fee | Payment amount in KS (right-aligned) | All |
| Submitted | ISO date (YYYY-MM-DD) | All |
| Schedule | "Sep 1 ~ Sep 14" format | All |
| Actions | Review (pencil icon) for pending, View (eye icon) for others; sticky right | All |

- Rows with selected ads get `bg-secondary/40` background
- Highlighted ad (from notification deep link) gets purple inset outline and "NEW" badge
- Pagination: Page sizes 10/20/50/100 (default 10), smart page number display with gaps

### 5.2 Screen: Ad Review Modal

**Purpose:** Allow admins to review ad content and approve/reject a single advertisement.

#### 5.2.1 Layout Sections

1. **Header**: Title "Review Advertisement" or "View Advertisement" (view-only mode for non-pending ads); description shows shop name
2. **Shop Information**: Grid showing Shop name, Placement label, Tier badge
3. **Advertisement Preview**:
   - Title with Status badge
   - Banner image (max 320px height, object-contain)
   - Announcement message (if present)
   - Content description (if present)
   - SKU label (if present)
   - Start date, End date, Duration in days
4. **Fee and Payment**:
   - Daily rate (KS), Duration (days), Total Fee (KS), Fee Paid (KS), Payment status badge
   - "Fee locked at purchase time" notice
5. **Rejection Reason** (for rejected ads): Red-bordered section showing the rejection reason
6. **Rejection Input** (when rejecting, two-step flow):
   - Step 1: Click "Reject" button
   - Step 2: Textarea appears with required reason input (max 1000 chars, character counter, validation message)
7. **Footer Actions**:
   - Pending ad: Cancel, Reject, Approve buttons
   - Rejecting state: Back, Confirm Reject (disabled until valid reason)
   - View-only: Close button

### 5.3 Screen: Bulk Approve Modal

- Title: "Bulk Approve Ads"
- Description: "You are about to approve {count} advertisements."
- Warning icon (green)
- Actions: Cancel, Confirm Approve (shows "Approving..." during mutation)

### 5.4 Screen: Bulk Reject Modal

- Title: "Bulk Reject Ads"
- Description: "You are about to reject {count} advertisements."
- Warning icon (red)
- Alert: "The advertisements will not be displayed. Paid amounts will be refunded in full (100%) according to the refund rule."
- Rejection reason textarea (required, max 1000 chars, character counter)
- Actions: Cancel, Confirm Reject (disabled until valid reason)

### 5.5 Screen: Package & Fee Management (`/admin/ads/packages`)

**Purpose:** View, create, edit, deactivate, and reactivate fee settings per placement×tier.

#### 5.5.1 Page Header

- Title: "Package & Fee Management"
- Subtitle: "Configure advertising fees by placement and tier"
- "Back to Ads" link → `/admin/ads`
- "View History" link → `/admin/ads/fee-history`
- "Create Fee Setting" button (disabled when all 12 combinations exist)

#### 5.5.2 Fee Settings Table

| Column | Description | Responsive |
|--------|-------------|------------|
| Placement | Placement label (truncated) | All |
| Tier | Tier badge | All |
| Daily Rate | Amount in KS (right-aligned) | All |
| Duration | "{n} day(s)" | Hidden below md |
| Total Fee | Amount in KS (right-aligned) | All |
| Max Ads | Integer | Hidden below lg |
| Status | Active (green) / Inactive (gray) badge | All |
| Actions | Edit (pencil), Deactivate (ban) or Reactivate (rotate-ccw); sticky right | All |

#### 5.5.3 Create Fee Modal

- Placement select (options disabled if combination already exists, shows "(already exists)")
- Tier select (same uniqueness logic)
- Daily rate input (number, step 0.01, min 0.01)
- Duration input (number, step 1, min 1)
- Max ads input (number, step 1, min 1)
- Total fee preview: "Daily rate × Duration" (auto-calculated, shown in KS)
- Effective from date picker (defaults to today)
- No change reason field — auto-submitted as "Initial fee setting"

#### 5.5.4 Edit Fee Modal

- Shows current placement and tier (read-only)
- Shows current total fee
- Daily rate, duration, max ads inputs (pre-filled with current values)
- Effective from date picker (defaults to today)
- Total fee preview (auto-calculated)
- Change reason textarea (required, max 1000 chars)

#### 5.5.5 Deactivate Fee Modal

- Shows placement and tier badge
- Notice: "Existing advertisements are unaffected by this change (fee locking rule). New purchases for this placement and tier will not be available while inactive."
- Change reason textarea (required, max 1000 chars)

#### 5.5.6 Reactivate Fee Modal

- Shows placement and tier badge
- Notice: "This package will become available to merchants again with its current rate and configuration."
- Change reason textarea (optional, max 1000 chars)

### 5.6 Screen: Fee Change History (`/admin/ads/fee-history`)

**Purpose:** View and delete fee change history with filtering.

#### 5.6.1 Page Header

- Title: "Fee Change History"
- Subtitle: "Audit trail of fee setting changes"
- "Back to Packages" link → `/admin/ads/packages`

#### 5.6.2 Filters

| Filter | Type | Options |
|--------|------|---------|
| Month | Select | "All months" + last 12 months (formatted as "September 2026") |
| Placement | Select | All placements + 4 placement options |
| Tier | Select | All tiers + 3 tier options |

- Filters reset pagination and clear selection

#### 5.6.3 Bulk Delete Controls

- Select all checkbox (only deletable rows)
- Selected count display
- Warning when > 50 selected: "Maximum 50 records per bulk operation"
- Delete button (disabled when 0 selected or > 50 selected)
- Clear button

#### 5.6.4 Protection Notice

"Fee change history from the current month is protected and cannot be deleted. Select records from previous months to remove them."

#### 5.6.5 Fee History Table

| Column | Description | Responsive |
|--------|-------------|------------|
| Checkbox | Select deletable records; current-month records disabled | All |
| Date | Formatted date | All |
| Placement | Placement label | All |
| Tier | Tier badge | All |
| Old Rate | Previous daily rate in KS (— for new) | Hidden below md |
| New Rate | New daily rate in KS | All |
| Changed By | Admin name | Hidden below lg |
| Reason | Change reason (truncated, — for none) | Hidden below xl |
| Actions | Delete button (trash icon); sticky right; disabled for current month | All |

### 5.7 Screen: Revenue Analytics (`/admin/ads/analytics`)

**Purpose:** Display financial charts and summary metrics for ad revenue.

#### 5.7.1 Page Header

- Title: "Revenue Analytics"
- Subtitle: "Revenue overview from approved advertisements"
- "Back to Ads" link → `/admin/ads`

#### 5.7.2 Filter Controls

- Date range picker (defaults: 29 days ago to today)
- Placement multi-select
- Tier multi-select

#### 5.7.3 Content Sections

1. **Summary Metrics**: Cards showing total revenue, total ads approved, total fees collected, avg revenue per ad, total refunds
2. **Charts** (2-column grid):
   - Revenue by Placement (bar chart)
   - Revenue by Tier (bar chart)
3. **Revenue Trend** (line chart, full width)
4. **Data Tables** (2-column grid):
   - Ads by Placement table (placement, ad count, total revenue, avg CTR)
   - Ads by Tier table (tier, ad count, total revenue, avg CTR)

### 5.8 Screen: Export Reports (`/admin/ads/export`)

**Purpose:** Generate and download CSV reports.

#### 5.8.1 Page Header

- Title: "Export Reports"
- Subtitle: "Generate CSV reports for advertisements and fee history"
- "Back to Ads" link → `/admin/ads`

#### 5.8.2 Report Type Selector

Three selectable options:
1. **Ad Performance** (default) — impressions, clicks, CTR, revenue per ad
2. **Submission History** — all ad submissions with statuses and outcomes
3. **Fee History** — fee setting changes with timestamps and reasons

#### 5.8.3 Export Configuration Form

| Filter | Type | Applies To |
|--------|------|------------|
| Date Range | DateRangePicker | All report types |
| Placement | Multi-select | Ad Performance, Fee History |
| Tier | Multi-select | Ad Performance, Fee History |
| Status | Multi-select | Ad Performance |
| Shop | Input (search) | Submission History |
| Format | Select (disabled, locked to CSV) | All report types |

- Validation: End date must be ≥ start date
- Helper text: "Generates and downloads a CSV report. Filters are optional; leave empty to include all."
- Generate button with loading spinner during generation

---

## 6. Functional Operation Specification

### 6.1 Operation: List Advertisements

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Navigate to `/admin/ads` |
| **API Endpoint** | `GET /admin/ads` |
| **Query Parameters** | `status`, `placement`, `tier`, `shop`, `dateFrom`, `dateTo`, `page`, `limit` |
| **Processing** | Query advertisements with shop info; apply filters; paginate (default 10 per page) |
| **Success Response** | `{ data: AdminAdvertisement[], meta: { page, limit, total, totalPages } }` |

### 6.2 Operation: View Ad Detail

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Click Review/View on ad row |
| **API Endpoint** | `GET /admin/ads/:id` |
| **Success Response** | `AdminAdDetail` with analytics, feeInfo, paymentInfo |

### 6.3 Operation: Approve Single Advertisement

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Click "Approve" in review modal |
| **API Endpoint** | `POST /admin/ads/:id/approve` |
| **Processing** | Set approved status, record admin ID and timestamp |
| **Success Response** | `AdminAdApprovalResult` |
| **Toast** | "Advertisement approved" |

### 6.4 Operation: Reject Single Advertisement

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Click "Confirm Reject" in review modal (two-step) |
| **API Endpoint** | `POST /admin/ads/:id/reject` |
| **Request Body** | `{ rejection_reason: string }` |
| **Processing** | Set rejected status, record reason, process refund |
| **Success Response** | `AdminAdApprovalResult` |
| **Toast** | "Advertisement rejected" |

### 6.5 Operation: Bulk Approve

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Click "Confirm Approve" in bulk approve modal |
| **API Endpoint** | `POST /admin/ads/bulk/approve` |
| **Request Body** | `{ ad_ids: string[] }` |
| **Success Response** | `AdminBulkResult` with approved count |
| **Toast** | "{count} advertisements approved" |

### 6.6 Operation: Bulk Reject

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Click "Confirm Reject" in bulk reject modal |
| **API Endpoint** | `POST /admin/ads/bulk/reject` |
| **Request Body** | `{ ad_ids: string[], rejection_reason: string }` |
| **Success Response** | `AdminBulkResult` with rejected count, refundsProcessed, refundsFailed |
| **Toast** | "{count} advertisements rejected" |

### 6.7 Operation: Create Fee Setting

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Click "Create Fee Setting" in create modal |
| **API Endpoint** | `POST /admin/ad-fees` |
| **Request Body** | `{ placement, tier, daily_rate, duration_days, max_ads, effective_from, change_reason }` |
| **Processing** | Validate uniqueness (placement+tier); create setting (is_active=true); create history record with null old values |
| **Success Response** | `AdminAdFeeSetting` |
| **Toast** | "Fee setting created" |

### 6.8 Operation: Update Fee Setting

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Click "Save Changes" in edit modal |
| **API Endpoint** | `PUT /admin/ad-fees/:id` |
| **Request Body** | `{ daily_rate, duration_days, max_ads, effective_from, change_reason }` |
| **Processing** | Create history record with old/new values; update setting |
| **Toast** | "Fee setting updated" |

### 6.9 Operation: Deactivate Fee Setting

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Click "Confirm Deactivate" in deactivate modal |
| **API Endpoint** | `PATCH /admin/ad-fees/:id/deactivate` |
| **Request Body** | `{ change_reason: string }` |
| **Processing** | Set is_active=false; create history record with null new values |
| **Toast** | "Fee setting deactivated" |

### 6.10 Operation: Reactivate Fee Setting

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Click "Confirm Reactivate" in reactivate modal |
| **API Endpoint** | `PATCH /admin/ad-fees/:id/reactivate` |
| **Request Body** | `{ change_reason?: string }` |
| **Processing** | Set is_active=true |
| **Toast** | "Fee setting reactivated" |

### 6.11 Operation: View Fee History

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Navigate to `/admin/ads/fee-history` |
| **API Endpoint** | `GET /admin/ad-fees/history` |
| **Query Parameters** | `placement`, `tier`, `month` (YYYY-MM), `page`, `limit` |
| **Success Response** | `PaginatedFeeHistory` with data + meta |

### 6.12 Operation: Delete Fee History

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Click "Confirm Delete" in delete modal (single or bulk) |
| **API Endpoint** | `DELETE /admin/ad-fees/history` |
| **Request Body** | `{ history_ids: string[] }` |
| **Processing** | Delete specified records; current-month records rejected by API |
| **Success Response** | `{ deletedCount: number, deletedIds: string[] }` |
| **Toast** | "Fee change history deleted" or "{count} fee change history records deleted" |

### 6.13 Operation: View Revenue Analytics

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Navigate to `/admin/ads/analytics` |
| **API Endpoint** | `GET /admin/ads/analytics/revenue` |
| **Query Parameters** | `dateFrom`, `dateTo`, `placement[]`, `tier[]` |
| **Success Response** | `RevenueAnalytics` with summary, byPlacement, byTier, trend |

### 6.14 Operation: Export Reports

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Click "Generate Report" on export page |
| **API Endpoints** | `POST /admin/ads/export/ad-performance`, `/admin/ads/export/submission-history`, `/admin/ads/export/fee-history` |
| **Request Body** | Varies by report type (see Section 5.8.3) |
| **Processing** | Backend generates CSV; response is a blob stream |
| **Success Response** | CSV file blob; browser auto-downloads with filename `{type}_from{from}_to{to}.csv` |
| **Toast** | "Report generated and download started" |

---

## 7. Input Validation Rules

### 7.1 Zod Schemas (Frontend)

| Schema | Fields | Rules |
|--------|--------|-------|
| `adminRejectSchema` | `rejection_reason` | min(1), max(1000) |
| `adminBulkApproveSchema` | `ad_ids` | array of UUID, min(1), max(50) |
| `adminBulkRejectSchema` | `ad_ids`, `rejection_reason` | Same as above |
| `createFeeSettingSchema` | `placement`, `tier`, `daily_rate`, `duration_days`, `max_ads`, `effective_from`, `change_reason` | Valid enums; daily_rate ≥ 0.01; duration_days ≥ 1 int; max_ads ≥ 1 int; valid date; change_reason 1–1000 |
| `editFeeSettingSchema` | Same as create minus placement/tier | Same rules |
| `deactivateFeeSchema` | `change_reason` | min(1), max(1000) |
| `reactivateFeeSchema` | `change_reason` | optional, max(1000) |
| `deleteFeeHistorySchema` | `history_ids` | array of UUID, min(1), max(50) |
| `revenueAnalyticsSchema` | `dateFrom`, `dateTo`, `placement[]`, `tier[]` | Valid dates; optional arrays |
| `exportSchema` | `reportType`, `dateFrom`, `dateTo`, `placement[]`, `tier[]`, `status[]`, `shop`, `format` | Valid enums; valid dates; format must be 'csv' |

### 7.2 Validation Codes

| Code | Field | Rule | Message (EN) |
|------|-------|------|--------------|
| VAL-ADM-001 | rejection_reason | required | Rejection reason is required |
| VAL-ADM-002 | rejection_reason | maxLength 1000 | Rejection reason must not exceed 1000 characters |
| VAL-ADM-010 | ad_ids | minSize 1 | Select at least one advertisement |
| VAL-ADM-011 | ad_ids | maxSize 50 | Maximum 50 ads per bulk operation |
| VAL-ADM-020 | placement | required enum | Placement is required |
| VAL-ADM-021 | tier | required enum | Tier is required |
| VAL-ADM-022 | daily_rate | min 0.01 | Daily rate must be greater than 0 |
| VAL-ADM-023 | duration_days | min 1 | Duration must be at least 1 day |
| VAL-ADM-024 | max_ads | min 1 | Max ads must be at least 1 |
| VAL-ADM-025 | effective_from | required date | Effective date is required |
| VAL-ADM-026 | change_reason | required | Change reason is required |
| VAL-ADM-027 | change_reason | maxLength 1000 | Change reason must not exceed 1000 characters |
| VAL-ADM-030 | reportType | required enum | Report type is required |
| VAL-ADM-031 | dateFrom | required date | Start date is required |
| VAL-ADM-032 | dateTo | required date | End date is required |
| VAL-ADM-033 | format | required enum | Export format is required |

### 7.3 Frontend Validation Features

- **React Hook Form + Zod**: Real-time validation on all forms
- **Character counters**: Textareas show `{length}/1000` count
- **Disabled confirm buttons**: Reject/Confirm buttons disabled until valid input
- **Placement-tier uniqueness**: Create fee modal disables already-existing combinations in dropdowns
- **Date range auto-correct**: DateRangePicker adjusts end date if it would be before start date

---

## 8. Error Handling Specification

### 8.1 Error Response Structure

```json
{
  "statusCode": 400,
  "message": ["rejection_reason must not be empty"],
  "error": "Bad Request",
  "timestamp": "2026-10-15T12:00:00.000Z"
}
```

### 8.2 Error Classification — Ad Review

| HTTP | Scenario | Toast Message |
|------|----------|---------------|
| 400 | Missing rejection reason | "Rejection reason is required" |
| 400 | Ad not in pending state | "This advertisement is no longer pending review" |
| 400 | Bulk: empty selection | "At least one ad must be selected" |
| 400 | Bulk: exceeds 50 | "Maximum 50 ads per bulk operation" |
| 404 | Ad not found | "Advertisement not found" |
| 500 | Server error | "Failed to approve/reject advertisement" |

### 8.3 Error Classification — Fee Management

| HTTP | Scenario | Toast Message |
|------|----------|---------------|
| 400 | Invalid daily rate | "Daily rate must be greater than 0" |
| 400 | Invalid duration | "Duration must be at least 1 day" |
| 400 | Invalid max ads | "Max ads must be at least 1" |
| 400 | Missing change reason | "Change reason is required" |
| 400 | Deactivate: already inactive | "Fee setting is already inactive" |
| 404 | Fee setting not found | "Fee setting not found" |
| 409 | Duplicate placement+tier | "A fee setting already exists for this placement and tier" |
| 500 | Server error | "Failed to create/update/deactivate/reactivate fee setting" |

### 8.4 Error Classification — Fee History Deletion

| HTTP | Scenario | Toast Message |
|------|----------|---------------|
| 400 | Current month protected | "Fee change history from the current month is protected" |
| 400 | Empty selection | No request sent |
| 400 | Exceeds 50 | "Maximum 50 records per bulk operation" |
| 500 | Server error | "Failed to delete fee change history" |

### 8.5 Error Classification — Analytics & Export

| HTTP | Scenario | Toast Message |
|------|----------|---------------|
| 400 | Invalid date range | "End date must be after start date" |
| 400 | Invalid report type | "Invalid report type" |
| 500 | Export generation failed | "Failed to generate report" |

### 8.6 Frontend Error Display

- **Toast notifications** for all API errors (destructive variant) and successes (default variant)
- **Inline validation** with red borders and error text below form fields
- **API error messages** extracted from axios error response (supports both string and string[] message formats)
- **Loading spinners** on buttons during pending mutations
- **Disabled buttons** during pending operations to prevent double-submission

---

## 9. Permission and Access Control

### 9.1 Authentication

- JWT Bearer Token via `Authorization` header on all API requests
- Axios interceptor attaches token automatically

### 9.2 Protected Routes (Admin Only)

All 5 pages under `/admin/ads/*` require admin role:
- `/admin/ads` — Advertisement list
- `/admin/ads/packages` — Fee settings
- `/admin/ads/fee-history` — Fee history
- `/admin/ads/analytics` — Revenue analytics
- `/admin/ads/export` — Export reports

### 9.3 Role-Based Access

| Role | Access |
|------|--------|
| `buyer` | No access |
| `merchant` | No access |
| `admin` | Full access |

---

## 10. Real-Time Notification Behavior

### 10.1 Notification Events

| Event | Trigger | Recipient | Message |
|-------|---------|-----------|---------|
| Ad Approved | Admin approves ad | Shop owner | "Your advertisement '{title}' has been approved" |
| Ad Rejected | Admin rejects ad | Shop owner | "Your advertisement '{title}' has been rejected. Reason: {reason}" |

### 10.2 Deep Linking

- New ad submission notification links to `/admin/ads?highlightAdId={uuid}`
- Highlighted ad row shows purple inset outline and "NEW" badge
- Highlight clears after 3 seconds
- Status filter auto-clears when arriving from notification

---

## 11. Screen Transition Specification

### 11.1 Navigation Map

```
/admin/ads (index)
  ├── [Review] → Ad Review Modal (overlay)
  ├── [View] → Ad Review Modal (view-only, overlay)
  ├── [Bulk Approve] → Bulk Approve Modal (overlay)
  ├── [Bulk Reject] → Bulk Reject Modal (overlay)
  ├── [Manage Packages] → /admin/ads/packages
  ├── [Revenue Analytics] → /admin/ads/analytics
  └── [Export] → /admin/ads/export

/admin/ads/packages
  ├── [Create Fee Setting] → Create Fee Modal (overlay)
  ├── [Edit] → Edit Fee Modal (overlay)
  ├── [Deactivate] → Deactivate Fee Modal (overlay)
  ├── [Reactivate] → Reactivate Fee Modal (overlay)
  ├── [View History] → /admin/ads/fee-history
  └── [Back to Ads] → /admin/ads

/admin/ads/fee-history
  ├── [Delete row] → Delete Fee History Modal (overlay, single)
  ├── [Delete selected] → Delete Fee History Modal (overlay, bulk)
  └── [Back to Packages] → /admin/ads/packages

/admin/ads/analytics
  └── [Back to Ads] → /admin/ads

/admin/ads/export
  └── [Back to Ads] → /admin/ads
```

---

## 12. Non-Functional Considerations

### 12.1 Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | React 19 + TypeScript |
| Data Fetching | TanStack Query (React Query) |
| Schema Validation | Zod |
| Form Management | React Hook Form + Zod Resolver |
| Styling | Tailwind CSS 4 |
| UI Components | shadcn/ui |
| Charts | Chart components (AnalyticsCharts) |
| HTTP Client | Axios with interceptors |
| i18n | react-i18next (English/Japanese) |

### 12.2 Data Fetching Patterns

- **Query keys**: `['admin-ads', params]`, `['fee-settings']`, `['fee-history', params]`, `['analytics', params]`
- **Stale time**: 30 seconds for all queries
- **Query invalidation**: Automatic on mutation success
- **Enabled conditions**: Ad detail query only fires when `id` is truthy

### 12.3 Responsive Design

- **Ad Table**: Placement column hidden below xl; Actions column sticky right
- **Fee Settings Table**: Duration hidden below md, Max Ads hidden below lg
- **Fee History Table**: Old Rate hidden below md, Changed By hidden below lg, Reason hidden below xl
- **Analytics**: Charts and tables stack in single column on mobile
- **Export**: Filter form stacks vertically on mobile

### 12.4 Pagination

- Page sizes: 10, 20, 50, 100 (default 10)
- Smart page number display: Shows up to 7 page chips with gaps for large page counts
- Changing page size or filters resets to page 1
- Fee history page clears selection on page change

---

## 13. Configurable Items

| Item | Value | Location |
|------|-------|----------|
| Default page size | 10 | `Pagination.tsx` |
| Page size options | [10, 20, 50, 100] | `Pagination.tsx` |
| Default analytics date range | Last 30 days | `analytics.tsx`, `export.tsx` |
| Bulk operation max | 50 | Zod schemas |
| Fee history delete max | 50 | Zod schema |
| Total package combinations | 12 (4×3) | `packages.tsx` |
| Default create change reason | "Initial fee setting" | `CreateFeeModal.tsx` |
| Stale time | 30 seconds | All query hooks |
| Debounce delay (shop search) | 300ms | `FilterBar.tsx` |
| Highlight duration | 3 seconds | `index.tsx` |
| Currency format | `{value} KS` | `format.ts` |

---

## 14. Cross-Reference Traceability Matrix

### 14.1 Requirements Traceability

| Requirement | Screens | Operations |
|-------------|---------|------------|
| Ads require admin approval | 5.1 | 6.1–6.6 |
| Bulk approve/reject | 5.1, 5.3, 5.4 | 6.5–6.6 |
| Fee CRUD per placement×tier | 5.5 | 6.7–6.10 |
| Fee history audit trail | 5.6 | 6.11–6.12 |
| Revenue analytics | 5.7 | 6.13 |
| CSV export | 5.8 | 6.14 |
| Fee history deletion | 5.6 | 6.12 |

### 14.2 Component Traceability

| Component | Page | Purpose |
|-----------|------|---------|
| `FilterBar` | Ad List | Filter ads by status/placement/tier/shop/date |
| `AdTable` | Ad List | Display ad list with checkboxes |
| `Pagination` | Ad List, Fee History | Page navigation + page size selector |
| `AdReviewModal` | Ad List (overlay) | Review and approve/reject single ad |
| `BulkApproveModal` | Ad List (overlay) | Confirm bulk approval |
| `BulkRejectModal` | Ad List (overlay) | Enter reason and confirm bulk rejection |
| `FeeSettingsTable` | Packages | Display fee settings list |
| `CreateFeeModal` | Packages (overlay) | Create new fee setting |
| `EditFeeModal` | Packages (overlay) | Edit existing fee setting |
| `DeactivateFeeModal` | Packages (overlay) | Deactivate with reason |
| `ReactivateFeeModal` | Packages (overlay) | Reactivate with optional reason |
| `FeeHistoryTable` | Fee History | Display history with delete checkboxes |
| `DeleteFeeHistoryModal` | Fee History (overlay) | Confirm deletion |
| `DateRangePicker` | Multiple | Date range selection with auto-correct |
| `ReportTypeSelector` | Export | Select report type |
| `ExportConfigForm` | Export | Configure and generate export |
| `AnalyticsMetrics` | Analytics | Summary metric cards |
| `AnalyticsCharts` | Analytics | Revenue charts |
| `AnalyticsTables` | Analytics | Revenue data tables |

---

*End of Functional Specification (Admin Ad Management Screen)*
