# Screen Items Specification (画面項目設計書) — Admin Ad Management

**Document ID:** SKM-SIS-ADM-001  
**Target Screen:** Admin Ad Management (管理者広告管理)  
**Subsystem:** Advertisement Management — Admin Ad Review, Fee Management, Analytics, Export  
**Function ID:** FN-ADM-001  
**Version:** 1.1  
**Created:** 2026-08-26  
**Last Updated:** 2026-08-27  
**Author:** Software Architect  
**Review Status:** Released (承認済み)  
**Classification:** Internal — Engineering Division

---

## 1. Document Control (ドキュメント管理)

### 1.1 Document Revision History

| Version | Date | Author | Description of Changes |
| :--- | :--- | :--- | :--- |
| 1.0 | 2026-08-26 | Software Architect | Initial screen items specification for Admin Ad Management screens: ad list, ad review modal, bulk approve/reject modals, package & fee management, fee change history, revenue analytics, and export reports. |
| 1.1 | 2026-08-27 | Software Architect | Updated for business flow consistency: clarified Package/Fee Setting relationship, added fee calculation display rule (Total Fee = Daily Rate × Duration), added payment behavior display, improved review modal with fee/schedule/refund info, improved reject confirmation UI, added fee locking rule, clarified schedule and max ads display, added business rules summary and confirmation-required items. |

### 1.2 Related Documents

| No. | Document ID | Document Name | File Path | Remarks |
| :-- | :--- | :--- | :--- | :--- |
| 1 | SKM-REQ-001 | Requirements Definition (v2.10) | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | Business rules, ad display rules, monetization rules. |
| 2 | SKM-DBS-001 | Database Design Specification (v2.5) | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | Table structures (`advertisements`, `ad_payments`, `ad_fee_settings`, `ad_fee_history`), constraints. |
| 3 | SKM-DEV-001 | Development Rules (v2.1) | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | Security rules, design tokens, error responses. |
| 4 | SKM-FDS-ADM-001 | Functional Specification — Admin Ad Management (v1.1) | `docs/screen/Ad_Management_Screen/機能設計書_Ad_Management_Screen.md` | Use cases, state transitions, validation rules, error handling. |

---

## 2. Screen Overview & Purpose (画面概要・目的)

### 2.1 Purpose (目的)
The Admin Ad Management screens provide platform administrators with full control over the advertisement lifecycle. They enable administrators to review and approve/reject shop-submitted advertisements (individually or in bulk), manage advertisement package pricing and fee configurations, track fee change history, analyze platform-wide ad revenue breakdowns by placement and tier, and export ad performance and fee history reports.

The advertisement system is a core monetization channel. **Advertisement Packages are configured through Fee Settings** — each Fee Setting defines a package by its Placement, Tier, Daily Rate, Duration, and Max Ads. Merchants select an available package, and the system calculates the Total Fee using the rule: **Total Fee = Daily Rate × Duration Days**. After successful payment and submission, the advertisement enters PENDING review. Only administrators can approve or reject advertisements. Approved advertisements become eligible for display according to their schedule. Rejected advertisements are not displayed and are refunded in full.

### 2.2 Target Users & Roles (対象ユーザーと権限)

| Attribute | Value |
| :--- | :--- |
| **Primary Actors** | Platform Administrator (管理者) |
| **Required Authentication** | JWT Bearer Token with `admin` role |
| **Data Scope** | All platform advertisements, all fee settings, all ad payments, platform-wide revenue data |
| **Access Control** | Protected routes — `JwtAuthGuard` + `RolesGuard` (`admin`) |

### 2.3 Core Functions & Basic Design Principles (主要機能・基本設計方針)
1. **Ad Review & Approval** — Reviewing pending shop advertisements, approving or rejecting individually with reason, tracking approval metadata (approved_by, approved_at).
2. **Bulk Approval / Rejection** — Selecting multiple pending ads via checkboxes and approving or rejecting them in a single batch action, with a common rejection reason for bulk rejects and automated batch refunds.
3. **Package & Fee Management** — Creating, editing, activating/deactivating fee settings per placement and tier. Each Fee Setting defines an Advertisement Package. All changes logged to fee history with timestamps, before/after values, and reasons.
4. **Fee Calculation Display** — Displaying the calculated Total Fee (Daily Rate × Duration Days) to both Merchants and Admins at the point of package selection and in the review modal.
5. **Fee Locking** — Once a Merchant has purchased a package and the advertisement fee has been determined, the paid amount is locked. Later Fee Setting changes do not affect existing advertisement paid amounts.
6. **Fee History Tracking** — Recording all pricing changes with full audit trail.
7. **Revenue Breakdown Analytics** — Providing financial charts, graphs, and summary metrics breaking down generated ad revenue by placement location and pricing tier over custom date ranges.
8. **Export Reports** — Exporting Ad Performance reports, Shop ad submission history, and Fee History logs in CSV format.
9. **Real-Time Feedback** — Toast notifications for all moderation actions.
10. **Confirmation Dialogs** — Required for all destructive actions (reject, bulk reject, deactivate fee).
11. **Pagination & Filtering** — Server-side pagination with multi-criteria filtering.
12. **Internationalization** — Full i18n support for EN, JA, MY.

### 2.4 Ad Review Flow (Admin Moderated)

**Full Business Flow — Merchant to Admin:**

```text
Admin defines Package / Fee Setting
(Placement, Tier, Daily Rate, Duration, Max Ads)
         ↓
Package becomes available for Merchant selection
         ↓
Merchant selects a Package
         ↓
System calculates Total Fee
  Total Fee = Daily Rate × Duration Days
         ↓
Merchant completes payment
         ↓
┌────────────────────────┐
│ Payment Success?       │
└────────┬───────────────┘
    YES  │  NO → Payment Failed state (not submitted)
         ↓
Merchant submits Advertisement
         ↓
┌────────────────────────┐
│ Ad Created             │
│ (status = PENDING)     │
│ Not displayed on site  │
└────────────────────────┘
         ↓
┌────────────────────────┐
│ Admin sees in Pending  │
│ queue                  │
└────────────────────────┘
         ↓
    ┌────┴────┐
    │         │
    ↓         ↓
┌───────┐ ┌───────┐
│APPROVE│ │REJECT │
└───────┘ └───────┘
    │         │
    ↓         ↓
┌────────┐ ┌────────────────┐
│VISIBLE │ │ HIDDEN         │
│TO ALL  │ │ + 100% REFUND  │
│(per    │ │ (paid amount   │
│schedule)│ │  refunded)    │
└────────┘ └────────────────┘
```

**Bulk Operations Flow:**
```text
Admin selects multiple ads (PENDING only)
         ↓
    ┌────┴────┐
    │         │
    ↓         ↓
┌──────────┐ ┌──────────┐
│BULK      │ │BULK      │
│APPROVE   │ │REJECT    │
└──────────┘ └──────────┘
    │              │
    ↓              ↓
┌────────┐  ┌──────────────┐
│ALL     │  │ALL           │
│APPROVED│  │REJECTED      │
│+ NOTIFY│  │+ 100% REFUNDS│
└────────┘  └──────────────┘
```

---

## 3. Screen Layout (画面レイアウト構成)

### 3.1 Overall Page Structure (全体画面構成)

#### Advertisement List Layout (`/admin/ads`)
```text
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [A] PAGE HEADER                     │   │
│  │   Page Title: "Advertisement Management"         │   │
│  │   Pending Count Badge | Manage Packages Button   │   │
│  │   Revenue Analytics Button | Export Button        │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [B] FILTER BAR                      │   │
│  │   Status ▼ | Placement ▼ | Tier ▼               │   │
│  │   Search Shop... | Date Range                    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [C] ADS TABLE                       │   │
│  │   ☐ | Shop | Title | Placement | Tier            │   │
│  │   Status Badge | Payment Badge | Fee | Submitted  │   │
│  │   Schedule | Actions [Review] [View]              │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [D] BULK ACTION BAR                  │   │
│  │   {n} ads selected | [Bulk Approve] [Bulk Reject]│   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [E] PAGINATION                      │   │
│  │   < 1 2 3 ... 8 >    Showing 1-20 of 150        │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Ad Review Modal Layout (Single)
```text
┌─────────────────────────────────────────────────────────┐
│                    MODAL OVERLAY                        │
│              ┌─────────────────────────────┐            │
│              │   [A] MODAL HEADER          │            │
│              │   "Review Advertisement"    │            │
│              │                    [X Close]│            │
│              ├─────────────────────────────┤            │
│              │                             │            │
│              │   [B] SHOP INFO             │            │
│              │   Shop Name | Placement     │            │
│              │   Tier                      │            │
│              │                             │            │
│              │   [C] AD PREVIEW            │            │
│              │   Banner Image              │            │
│              │   Message | Link URL        │            │
│              │   Content | Schedule        │            │
│              │   (Start Date ~ End Date)   │            │
│              │   Duration: {n} days        │            │
│              │                             │            │
│              │   [D] FEE & PAYMENT INFO    │            │
│              │   Daily Rate | Duration     │            │
│              │   ─────────────────         │            │
│              │   Total Fee (calculated)    │            │
│              │   Fee Paid | Payment Status │            │
│              │   (Fee locked at purchase)  │            │
│              │                             │            │
│              │   [E] REJECTION REASON      │            │
│              │   Textarea (conditional)    │            │
│              │   Refund Info (conditional) │            │
│              │                             │            │
│              │   [F] ACTION BUTTONS        │            │
│              │   [Approve] [Reject]        │            │
│              │   [Cancel]                  │            │
│              └─────────────────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

#### Bulk Reject Confirmation Modal Layout
```text
┌─────────────────────────────────────────────────────────┐
│                    MODAL OVERLAY                        │
│              ┌─────────────────────────────┐            │
│              │   [A] MODAL HEADER          │            │
│              │   "Bulk Reject Ads"         │            │
│              │                    [X Close]│            │
│              ├─────────────────────────────┤            │
│              │                             │            │
│              │   [B] WARNING MESSAGE       │            │
│              │   "You are about to reject  │            │
│              │    {n} advertisements."     │            │
│              │                             │            │
│              │   "The advertisements will  │            │
│              │    not be displayed."       │            │
│              │                             │            │
│              │   "Paid amounts will be     │            │
│              │    refunded in full (100%)  │            │
│              │    according to the refund  │            │
│              │    rule."                   │            │
│              │                             │            │
│              │   [C] REJECTION REASON      │            │
│              │   Textarea (required)       │            │
│              │                             │            │
│              │   [D] ACTION BUTTONS        │            │
│              │   [Cancel] [Confirm Reject] │            │
│              └─────────────────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

#### Bulk Approve Confirmation Modal Layout
```text
┌─────────────────────────────────────────────────────────┐
│                    MODAL OVERLAY                        │
│              ┌─────────────────────────────┐            │
│              │   [A] MODAL HEADER          │            │
│              │   "Bulk Approve Ads"        │            │
│              │                    [X Close]│            │
│              ├─────────────────────────────┤            │
│              │                             │            │
│              │   [B] CONFIRMATION MESSAGE  │            │
│              │   "You are about to approve │            │
│              │    {n} advertisements."     │            │
│              │                             │            │
│              │   [C] ACTION BUTTONS        │            │
│              │   [Cancel] [Confirm Approve]│            │
│              └─────────────────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

#### Package & Fee Management Layout (`/admin/advertisements/packages`)
```text
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [A] PAGE HEADER                     │   │
│  │   Page Title: "Package & Fee Management"         │   │
│  │   [← Back to Ads] [View History]                 │   │
│  │                           [+ Create Fee Setting] │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [B] FEE SETTINGS TABLE              │   │
│  │   Placement | Tier | Daily Rate | Duration       │   │
│  │   Total Fee | Max Ads | Status | Actions         │   │
│  │   [Edit] [Deactivate]                           │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Fee Change History Layout (`/admin/advertisements/fee-history`)
```text
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [A] PAGE HEADER                     │   │
│  │   Page Title: "Fee Change History"               │   │
│  │   [← Back to Packages]                           │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [B] FILTER BAR                      │   │
│  │   Placement ▼ | Tier ▼                           │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [C] HISTORY TABLE                   │   │
│  │   Date | Placement | Tier | Old Rate | New Rate  │   │
│  │   Changed By | Reason                            │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [D] PAGINATION                      │   │
│  │   < 1 2 3 ... 5 >    Showing 1-20 of 80         │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Revenue Analytics Layout (`/admin/advertisements/analytics`)
```text
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [A] PAGE HEADER                     │   │
│  │   Page Title: "Revenue Analytics"                │   │
│  │   [← Back to Ads]                                │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [B] FILTER CONTROLS                 │   │
│  │   Date Range | Placement ▼ | Tier ▼              │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [C] SUMMARY METRICS                 │   │
│  │   Total Revenue | Approved Ads | Fees Collected  │   │
│  │   Avg Revenue Per Ad | Total Refunds             │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [D] CHARTS                          │   │
│  │   Revenue by Placement [Bar] | Revenue by Tier   │   │
│  │   [Bar] | Revenue Trend [Line]                   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [E] DATA TABLES                     │   │
│  │   Ads by Placement | Ads by Tier                 │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Export Reports Layout (`/admin/advertisements/export`)
```text
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [A] PAGE HEADER                     │   │
│  │   Page Title: "Export Reports"                   │   │
│  │   [← Back to Ads]                                │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [B] REPORT TYPE SELECTION           │   │
│  │   [Ad Performance] [Submission History]          │   │
│  │   [Fee History]                                  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [C] EXPORT CONFIGURATION            │   │
│  │   Date Range | Placement ▼ | Tier ▼ | Status ▼   │   │
│  │   Shop Search... | Format: (●) CSV               │   │
│  │   [Generate Report] | Estimated {n} rows         │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [D] RECENT EXPORTS TABLE            │   │
│  │   Type | Format | Date Range | Status | Download │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Responsive Layout Breakpoints (レスポンシブ対応)

| Breakpoint | Min Width | Layout Behavior |
| :--- | :--- | :--- |
| Mobile (default) | 0px | Bottom navigation + stacked cards (admin mobile not primary target) |
| Tablet (`md:`) | 768px | Collapsible sidebar + responsive table |
| Desktop (`lg:`) | 1024px | Full sidebar + table layout with modal overlays |
| Wide (`xl:`) | 1280px | Full sidebar + expanded table layout |

---

## 4. Item Definitions (画面項目定義)

### 4.1 Section [A]: Page Header — Ad List (ページヘッダー — 広告リスト)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 1 | `lblAdsTitle` | Page Title | Static Label (`<h1>`) | String | — | Visible. Text: "Advertisement Management" | — | i18n key: `admin.ads.title` | Tailwind: `text-2xl font-bold`. |
| 2 | `badgePendingCount` | Pending Count Badge | Badge | Integer | — | Populated on load | — | `COUNT(advertisements WHERE status = 'pending')` | Amber badge. Shows number of pending ads. |
| 3 | `btnManagePackages` | Manage Packages Button | Button (`outline`) | — | — | Visible. Text: "Manage Packages" | — | — | Navigates to `/admin/advertisements/packages`. |
| 4 | `btnRevenueAnalytics` | Revenue Analytics Button | Button (`outline`) | — | — | Visible. Text: "Revenue Analytics" | — | — | Navigates to `/admin/advertisements/analytics`. |
| 5 | `btnExport` | Export Button | Button (`outline`) | — | — | Visible. Text: "Export" | — | — | Navigates to `/admin/advertisements/export`. |

### 4.2 Section [B]: Filter Bar — Ad List (フィルターバー — 広告リスト)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 6 | `selStatusFilter` | Status Filter | Select | Enum | No | Default: "All" | Options: All, Pending, Approved, Rejected | — | i18n key: `admin.ads.filterByStatus`. Updates query params on change. |
| 7 | `selPlacementFilter` | Placement Filter | Select | Enum | No | Default: "All" | Options: All, Homepage Banner, Product Sidebar, Category Banner, Search Top | — | i18n key: `admin.ads.filterByPlacement`. |
| 8 | `selTierFilter` | Tier Filter | Select | Enum | No | Default: "All" | Options: All, Basic, Standard, Premium | — | i18n key: `admin.ads.filterByTier`. |
| 9 | `txtShopSearch` | Shop Search Input | Input (`text`) | String(255) | No | Empty. Placeholder: "Search shop..." | MaxLength: 255 | — | i18n key: `admin.ads.searchShop`. Debounced (300ms). |
| 10 | `dateRangeFilter` | Date Range Filter | Date Range Picker | Date Range | No | Empty | Valid date range | — | i18n key: `admin.ads.filterByDate`. Filters by submission date. |

### 4.3 Section [C]: Ads Table (広告テーブル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 11 | `chkSelectAllAds` | Select All Checkbox | Checkbox | Boolean | No | Unchecked | — | — | Toggles all row checkboxes. |
| 12 | `chkSelectAd` | Select Ad Checkbox | Checkbox | Boolean | No | Per-row. Unchecked | — | — | Enables bulk action buttons. |
| 13 | `lblShopName` | Shop Name | Static Label | String | — | Populated from DB | — | `shops.name` | `font-medium text-sm`. |
| 14 | `lblAdTitle` | Ad Title | Static Label | String | — | Populated from DB | — | `advertisements.title` | `text-sm`. |
| 15 | `lblPlacement` | Placement | Static Label | String | — | Populated from DB | — | `advertisements.placement` | Localized placement name. |
| 16 | `lblTier` | Tier | Badge | Enum | — | Populated from DB | — | `advertisements.tier` | Standard badge colors. |
| 17 | `badgeAdStatus` | Ad Status Badge | Badge | Enum | — | Green (Approved — eligible for display per schedule), Red (Rejected — not displayed, refunded), Amber (Pending — awaiting admin review) | — | `advertisements.status` | Standard status badge colors. Only PENDING ads can be approved or rejected. |
| 18 | `badgePaymentStatus` | Payment Status Badge | Badge | Enum | — | Green (Completed), Amber (Pending), Gray (Refunded) | — | `advertisements.payment_status` | Standard status badge colors. |
| 19 | `lblSubmittedAt` | Submitted Date | Static Label | DateTime | — | ISO 8601 formatted | — | `advertisements.created_at` | Localized date format via i18n. |
| 20 | `lblFee` | Fee | Static Label | Decimal | — | Formatted with currency | — | `advertisements.fee_amount` | Localized currency format. |
| 21 | `btnReviewAd` | Review Button | Button (`outline`) | — | — | Visible. Text: "Review" | — | — | Opens Ad Review Modal. Only for pending ads. |
| 22 | `btnViewAd` | View Button | Button (`outline`) | — | — | Visible. Text: "View" | — | — | Opens Ad Review Modal (read-only). |
| 23 | `lblAdListSchedule` | Schedule (Ad List) | Static Label | String | — | "2026-09-01 ~ 2026-09-07" | — | `advertisements.start_date`, `advertisements.end_date` | Localized date range format. Display period = End Date - Start Date + 1 day. |

### 4.4 Section [D]: Bulk Action Bar (一括操作バー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 24 | `lblSelectedCount` | Selected Count Text | Static Label | String | — | "{n} ads selected" | — | — | i18n key: `admin.ads.selectedCount`. |
| 25 | `btnBulkApprove` | Bulk Approve Button | Button (`default`) | — | No | Disabled (no selection) | — | — | Enabled when checkboxes selected. Opens Bulk Approve Modal. |
| 26 | `btnBulkReject` | Bulk Reject Button | Button (`destructive`) | — | No | Disabled (no selection) | — | — | Enabled when checkboxes selected. Opens Bulk Reject Modal. |
| 27 | `btnClearSelection` | Clear Selection Button | Button (`text`) | — | No | Visible. Text: "Clear" | — | — | Deselects all. |

### 4.5 Section [E]: Pagination — Ad List (ページネーション — 広告リスト)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 28 | `pagAds` | Ads Pagination | Pagination | — | — | Page 1, Total pages from API | — | API response `meta.totalPages` | Page size selector: 20, 50, 100. |

### 4.6 Section [A]: Ad Review Modal Header (広告レビューモーダルヘッダー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 29 | `lblReviewAdTitle` | Modal Title | Static Label (`<h2>`) | String | — | Text: "Review Advertisement" | — | i18n key: `admin.ads.reviewAd` | `text-lg font-semibold`. |
| 30 | `btnCloseReviewModal` | Close Modal Button | Icon Button | — | — | Visible. X icon. | — | — | Closes modal. Escape key also closes. |

### 4.7 Section [B]: Shop Info in Review Modal (レビューモーダル内ショップ情報)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 31 | `lblReviewShopName` | Shop Name | Static Label | String | — | Populated from DB | — | `shops.name` | `font-semibold`. |
| 32 | `lblReviewPlacementTier` | Placement & Tier | Static Label | String | — | "Homepage Banner — Standard" | — | `advertisements.placement`, `advertisements.tier` | `text-sm text-muted-foreground`. |

### 4.8 Section [C]: Ad Preview in Review Modal (レビューモーダル内広告プレビュー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 33 | `imgAdBanner` | Ad Banner Image | Image | URL | — | Ad banner image | — | `advertisements.image_url` | `w-full rounded`. |
| 34 | `lblAdMessage` | Announcement Message | Static Label | String | — | Populated from DB | — | `advertisements.message` | `font-medium`. |
| 35 | `lblAdLinkUrl` | Link URL | Static Label (Link) | String | — | Populated from DB or "—" | — | `advertisements.link_url` | Clickable link. |
| 36 | `lblAdContent` | Content Description | Static Label (`<p>`) | Text | — | Populated from DB or "—" | — | `advertisements.content` | `text-sm whitespace-pre-wrap`. |
| 37 | `lblAdSchedule` | Schedule | Static Label | String | — | "2026-09-01 ~ 2026-09-07" | — | `advertisements.start_date`, `advertisements.end_date` | Localized date range format. Display period = End Date - Start Date + 1 day. |
| 38 | `lblAdDuration` | Duration | Static Label | String | — | "{n} days" | — | Computed from `advertisements.start_date` and `advertisements.end_date` | Display only. Business Rule Confirmation Required: exact date-counting rule. |

### 4.9 Section [D]: Fee & Payment Info in Review Modal (レビューモーダル内料金・決済情報)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 39 | `lblDailyRateDisplay` | Daily Rate | Static Label | Decimal | — | Formatted with currency | — | `ad_fee_settings.daily_rate` (locked at purchase) | Fee Locking Rule: displays the rate at the time of purchase, not the current rate. |
| 40 | `lblDurationDisplay` | Duration | Static Label | String | — | "{n} days" | — | `ad_fee_settings.duration_days` (locked at purchase) | Fee Locking Rule. |
| 41 | `lblTotalFeeDisplay` | Total Fee | Static Label (`<strong>`) | Decimal | — | "Daily Rate × Duration = Total Fee" | — | Computed: `daily_rate × duration_days` (locked at purchase) | **Fee Calculation Display Rule.** Fee Locking Rule: amount is locked at purchase time. |
| 42 | `lblFeePaid` | Fee Paid | Static Label | Decimal | — | Formatted with currency | — | `ad_payments.amount` | The amount actually paid by the Merchant. Fee Locking Rule. |
| 43 | `badgePaymentStatusDetail` | Payment Status | Badge | Enum | — | Green (Completed), Amber (Pending), Gray (Refunded) | — | `ad_payments.status` | Standard status badge colors. |
| 44 | `lblRefundInfo` | Refund Information | Static Label | String | — | Visible only when status = REJECTED. "Refund: {amount} (100% of paid amount)" | — | Computed: `ad_payments.amount` | Shown after Admin rejection. Fee Locking Rule. |

### 4.10 Section [E]: Rejection Reason & Refund Info (却下理由・返金情報)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 45 | `lblRejectionReason` | Rejection Reason Label | Static Label (`<label>`) | String | — | Visible only when Reject is clicked. Text: "Rejection Reason" | — | i18n key: `admin.ads.rejectionReason` | Required for rejection. |
| 46 | `txtRejectionReason` | Rejection Reason Textarea | Textarea | String(1000) | Conditional | Empty. Placeholder: "Enter reason..." | MaxLength: 1000. Required when rejecting. | — | `min-h-[80px]`. Character count shown. |
| 47 | `alertRejectWarning` | Rejection Confirmation Alert | Alert | — | — | Visible when Reject is clicked. "The advertisement will be rejected and will not be displayed. The paid amount will be refunded in full (100%) according to the refund rule." | — | i18n key: `admin.ads.rejectWarning` | Amber alert. Shown above rejection reason. |

### 4.11 Section [F]: Review Modal Action Buttons (レビューモーダルアクションボタン)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 48 | `btnApproveAd` | Approve Button | Button (`submit`, `default`) | — | — | Visible. Text: "Approve" | — | — | i18n key: `admin.ads.approve`. Full width. Only for PENDING ads. |
| 49 | `btnRejectAd` | Reject Button | Button (`destructive`) | — | — | Visible. Text: "Reject" | — | — | i18n key: `admin.ads.reject`. Shows rejection confirmation alert + reason textarea. Only for PENDING ads. |
| 50 | `btnCancelReview` | Cancel Button | Button (`outline`) | — | — | Visible. Text: "Cancel" | — | — | i18n key: `admin.ads.cancel`. Closes modal. |

### 4.12 Section [A]: Bulk Reject Modal Header (一括却下モーダルヘッダー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 51 | `lblBulkRejectTitle` | Modal Title | Static Label (`<h2>`) | String | — | Text: "Bulk Reject Advertisements" | — | i18n key: `admin.ads.bulkRejectTitle` | `text-lg font-semibold`. |
| 52 | `btnCloseBulkRejectModal` | Close Modal Button | Icon Button | — | — | Visible. X icon. | — | — | Closes modal. Escape key also closes. |

### 4.13 Section [B]: Warning Message (警告メッセージ)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 53 | `lblBulkRejectCount` | Selected Count | Static Label | String | — | "You are about to reject {n} advertisements." | — | i18n key: `admin.ads.bulkRejectCount` | Dynamic count. |
| 54 | `alertBulkRejectWarning` | Warning Alert | Alert | — | — | "The advertisements will not be displayed. Paid amounts will be refunded in full (100%) according to the refund rule." | — | i18n key: `admin.ads.bulkRejectWarning` | Amber alert. |

### 4.14 Section [C]: Rejection Reason Input — Bulk (却下理由入力 — 一括)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 55 | `txtBulkRejectReason` | Rejection Reason Textarea | Textarea | String(1000) | Yes | Empty. Placeholder: "Enter reason..." | MaxLength: 1000. Required. | — | `min-h-[80px]`. Character count shown. |

### 4.15 Section [D]: Bulk Reject Action Buttons (一括却下アクションボタン)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 56 | `btnConfirmBulkReject` | Confirm Reject Button | Button (`submit`, `destructive`) | — | — | Visible. Text: "Confirm Reject" | — | — | i18n key: `admin.ads.confirmBulkReject`. Requires reason. |
| 57 | `btnCancelBulkReject` | Cancel Button | Button (`outline`) | — | — | Visible. Text: "Cancel" | — | — | i18n key: `admin.ads.cancel`. Closes modal. |

### 4.16 Section [A]: Bulk Approve Modal Header (一括承認モーダルヘッダー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 58 | `lblBulkApproveTitle` | Modal Title | Static Label (`<h2>`) | String | — | Text: "Bulk Approve Advertisements" | — | i18n key: `admin.ads.bulkApproveTitle` | `text-lg font-semibold`. |
| 59 | `btnCloseBulkApproveModal` | Close Modal Button | Icon Button | — | — | Visible. X icon. | — | — | Closes modal. Escape key also closes. |

### 4.17 Section [B]: Confirmation Message (確認メッセージ)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 60 | `lblBulkApproveCount` | Selected Count | Static Label | String | — | "You are about to approve {n} advertisements." | — | i18n key: `admin.ads.bulkApproveCount` | Dynamic count. |

### 4.18 Section [C]: Bulk Approve Action Buttons (一括承認アクションボタン)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 61 | `btnConfirmBulkApprove` | Confirm Approve Button | Button (`submit`, `default`) | — | — | Visible. Text: "Confirm Approve" | — | — | i18n key: `admin.ads.confirmBulkApprove`. |
| 62 | `btnCancelBulkApprove` | Cancel Button | Button (`outline`) | — | — | Visible. Text: "Cancel" | — | — | i18n key: `admin.ads.cancel`. Closes modal. |

### 4.19 Section [A]: Page Header — Package & Fee Management (ページヘッダー — パッケージ＆Fee管理)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 63 | `lblPackagesTitle` | Page Title | Static Label (`<h1>`) | String | — | Visible. Text: "Package & Fee Management" | — | i18n key: `admin.ads.packages` | `text-2xl font-bold`. |
| 64 | `btnBackToAdsFromPackages` | Back to Ads Button | Button (`text`) | — | — | Visible. Text: "← Back to Ads" | — | — | Navigates to `/admin/ads`. |
| 65 | `btnViewFeeHistory` | View History Button | Button (`outline`) | — | — | Visible. Text: "View History" | — | — | Navigates to `/admin/advertisements/fee-history`. |
| 66 | `btnCreateFeeSetting` | Create Fee Setting Button | Button (`primary`) | — | — | Visible. Text: "+ Create Fee Setting" | — | — | Opens Create Fee Modal. |

### 4.20 Section [B]: Fee Settings Table (Fee設定テーブル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 67 | `lblFeePlacement` | Placement | Static Label | String | — | Populated from DB | — | `ad_fee_settings.placement` | `font-medium text-sm`. |
| 68 | `badgeFeeTier` | Tier | Badge | Enum | — | Populated from DB | — | `ad_fee_settings.tier` | Standard badge colors. |
| 69 | `lblDailyRate` | Daily Rate | Static Label | Decimal | — | Formatted with currency | — | `ad_fee_settings.daily_rate` | Localized currency format. |
| 70 | `lblDuration` | Duration | Static Label | Integer | — | "{n} days" | — | `ad_fee_settings.duration_days` | — |
| 71 | `lblTotalFee` | Total Fee | Static Label | Decimal | — | Formatted with currency | — | Computed: `daily_rate × duration_days` | **Fee Calculation Display Rule.** Shows the calculated package price. |
| 72 | `lblMaxAds` | Max Ads | Static Label | Integer | — | Populated from DB | — | `ad_fee_settings.max_ads` | Max Ads definition requires business confirmation. |
| 73 | `badgeFeeStatus` | Status Badge | Badge | Enum | — | Green (Active), Gray (Inactive) | — | `ad_fee_settings.is_active` | Standard status badge colors. |
| 74 | `btnEditFee` | Edit Button | Button (`outline`) | — | — | Visible. Text: "Edit" | — | — | Opens Edit Fee Modal. Only for active settings. |
| 75 | `btnDeactivateFee` | Deactivate Button | Button (`destructive`) | — | — | Visible. Text: "Deactivate" | — | — | Opens Deactivate Confirmation Modal. Only for active settings. |

### 4.21 Section [A]: Edit Fee Modal Header (Fee編集モーダルヘッダー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 76 | `lblEditFeeTitle` | Modal Title | Static Label (`<h2>`) | String | — | Text: "Edit Fee Setting" | — | i18n key: `admin.ads.editFee` | `text-lg font-semibold`. |
| 77 | `btnCloseEditFeeModal` | Close Modal Button | Icon Button | — | — | Visible. X icon. | — | — | Closes modal. Escape key also closes. |

### 4.22 Section [B]: Edit Fee Form (Fee編集フォーム)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 78 | `numEditDailyRate` | Daily Rate Input | Input (`number`) | Decimal | Yes | Populated from current value | `@IsNumber()`, `@Min(0.01)` | `ad_fee_settings.daily_rate` | — |
| 79 | `numEditDuration` | Duration Input | Input (`number`) | Integer | Yes | Populated from current value | `@IsInt()`, `@Min(1)` | `ad_fee_settings.duration_days` | — |
| 80 | `lblEditTotalFeePreview` | Total Fee Preview | Static Label | Decimal | — | Computed: Daily Rate × Duration | — | Computed from inputs | **Fee Calculation Display Rule.** Updates in real-time as Daily Rate or Duration changes. |
| 81 | `numEditMaxAds` | Max Ads Input | Input (`number`) | Integer | Yes | Populated from current value | `@IsInt()`, `@Min(1)` | `ad_fee_settings.max_ads` | Max Ads definition requires business confirmation. |
| 82 | `dateEditEffectiveFrom` | Effective From | Date Picker | Date | Yes | Empty | `@IsDate()`, required | — | — |
| 83 | `txtEditChangeReason` | Change Reason | Textarea | String(1000) | Yes | Empty. Placeholder: "Enter reason..." | MaxLength: 1000. Required. | — | `min-h-[80px]`. |

### 4.23 Section [C]: Edit Fee Action Buttons (Fee編集アクションボタン)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 84 | `btnSaveFee` | Save Button | Button (`submit`, `default`) | — | — | Visible. Text: "Save" | — | — | i18n key: `admin.ads.save`. Requires all fields valid. |
| 85 | `btnCancelEditFee` | Cancel Button | Button (`outline`) | — | — | Visible. Text: "Cancel" | — | — | i18n key: `admin.ads.cancel`. Closes modal. |

### 4.24 Section [A]: Create Fee Modal Header (Fee作成モーダルヘッダー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 86 | `lblCreateFeeTitle` | Modal Title | Static Label (`<h2>`) | String | — | Text: "Create Fee Setting" | — | i18n key: `admin.ads.createFee` | `text-lg font-semibold`. |
| 87 | `btnCloseCreateFeeModal` | Close Modal Button | Icon Button | — | — | Visible. X icon. | — | — | Closes modal. Escape key also closes. |

### 4.25 Section [B]: Create Fee Form (Fee作成フォーム)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 88 | `selCreatePlacement` | Placement Select | Select | Enum | Yes | Default: first option | Options: Homepage Banner, Product Sidebar, Category Banner, Search Top | — | i18n key: `admin.ads.placement`. Uniqueness check: no active setting for placement+tier. |
| 89 | `selCreateTier` | Tier Select | Select | Enum | Yes | Default: first option | Options: Basic, Standard, Premium | — | i18n key: `admin.ads.tier`. |
| 90 | `numCreateDailyRate` | Daily Rate Input | Input (`number`) | Decimal | Yes | Empty | `@IsNumber()`, `@Min(0.01)` | — | — |
| 91 | `numCreateDuration` | Duration Input | Input (`number`) | Integer | Yes | Empty | `@IsInt()`, `@Min(1)` | — | — |
| 92 | `lblCreateTotalFeePreview` | Total Fee Preview | Static Label | Decimal | — | Computed: Daily Rate × Duration | — | Computed from inputs | **Fee Calculation Display Rule.** Updates in real-time as Daily Rate or Duration changes. |
| 93 | `numCreateMaxAds` | Max Ads Input | Input (`number`) | Integer | Yes | Empty | `@IsInt()`, `@Min(1)` | — | Max Ads definition requires business confirmation. |
| 94 | `dateCreateEffectiveFrom` | Effective From | Date Picker | Date | Yes | Empty | `@IsDate()`, required | — | — |
| 95 | `txtCreateChangeReason` | Change Reason | Textarea | String(1000) | Yes | Empty. Placeholder: "Enter reason..." | MaxLength: 1000. Required. | — | `min-h-[80px]`. |

### 4.26 Section [C]: Create Fee Action Buttons (Fee作成アクションボタン)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 96 | `btnCreateFee` | Create Button | Button (`submit`, `default`) | — | — | Visible. Text: "Create" | — | — | i18n key: `admin.ads.create`. Requires all fields valid. |
| 97 | `btnCancelCreateFee` | Cancel Button | Button (`outline`) | — | — | Visible. Text: "Cancel" | — | — | i18n key: `admin.ads.cancel`. Closes modal. |

### 4.27 Section [A]: Deactivate Fee Confirmation Modal Header (Fee無効化確認モーダルヘッダー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 98 | `lblDeactivateFeeTitle` | Modal Title | Static Label (`<h2>`) | String | — | Text: "Deactivate Fee Setting" | — | i18n key: `admin.ads.deactivateFeeTitle` | `text-lg font-semibold`. |
| 99 | `btnCloseDeactivateFeeModal` | Close Modal Button | Icon Button | — | — | Visible. X icon. | — | — | Closes modal. Escape key also closes. |

### 4.28 Section [B]: Deactivate Fee Warning (Fee無効化警告)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 100 | `alertDeactivateFeeWarning` | Warning Alert | Alert | — | — | "This fee setting will be deactivated. Existing ads that have already purchased this package are unaffected — their paid amount is locked." | — | i18n key: `admin.ads.deactivateFeeWarning` | Amber alert. Fee Locking Rule. |

### 4.29 Section [C]: Deactivate Fee Action Buttons (Fee無効化アクションボタン)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 101 | `btnConfirmDeactivateFee` | Confirm Deactivate Button | Button (`submit`, `destructive`) | — | — | Visible. Text: "Deactivate" | — | — | i18n key: `admin.ads.confirmDeactivate`. |
| 102 | `btnCancelDeactivateFee` | Cancel Button | Button (`outline`) | — | — | Visible. Text: "Cancel" | — | — | i18n key: `admin.ads.cancel`. Closes modal. |

### 4.30 Section [A]: Page Header — Fee Change History (ページヘッダー — Fee変更履歴)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 103 | `lblFeeHistoryTitle` | Page Title | Static Label (`<h1>`) | String | — | Visible. Text: "Fee Change History" | — | i18n key: `admin.ads.feeHistory` | `text-2xl font-bold`. |
| 104 | `btnBackToPackages` | Back to Packages Button | Button (`text`) | — | — | Visible. Text: "← Back to Packages" | — | — | Navigates to `/admin/advertisements/packages`. |

### 4.31 Section [B]: Filter Bar — Fee History (フィルターバー — Fee履歴)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 105 | `selHistoryPlacementFilter` | Placement Filter | Select | Enum | No | Default: "All" | Options: All, Homepage Banner, Product Sidebar, Category Banner, Search Top | — | i18n key: `admin.ads.filterByPlacement`. |
| 106 | `selHistoryTierFilter` | Tier Filter | Select | Enum | No | Default: "All" | Options: All, Basic, Standard, Premium | — | i18n key: `admin.ads.filterByTier`. |

### 4.32 Section [C]: History Table (履歴テーブル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 107 | `lblHistoryDate` | Date | Static Label | DateTime | — | ISO 8601 formatted | — | `ad_fee_history.created_at` | Localized date format. |
| 108 | `lblHistoryPlacement` | Placement | Static Label | String | — | Populated from DB | — | `ad_fee_history.placement` | — |
| 109 | `badgeHistoryTier` | Tier | Badge | Enum | — | Populated from DB | — | `ad_fee_history.tier` | Standard badge colors. |
| 110 | `lblOldRate` | Old Rate | Static Label | Decimal | — | Formatted with currency | — | `ad_fee_history.old_rate` | Localized currency format. |
| 111 | `lblNewRate` | New Rate | Static Label | Decimal | — | Formatted with currency | — | `ad_fee_history.new_rate` | Localized currency format. |
| 112 | `lblChangedBy` | Changed By | Static Label | String | — | Populated from DB | — | `users.name` (via `ad_fee_history.changed_by`) | Admin name. |
| 113 | `lblReason` | Reason | Static Label | Text | — | Populated from DB or "—" | — | `ad_fee_history.reason` | `text-sm`. |

### 4.33 Section [D]: Pagination — Fee History (ページネーション — Fee履歴)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 114 | `pagFeeHistory` | Fee History Pagination | Pagination | — | — | Page 1, Total pages from API | — | API response `meta.totalPages` | Page size selector: 20, 50, 100. |

### 4.34 Section [A]: Page Header — Revenue Analytics (ページヘッダー — 収益分析)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 115 | `lblAnalyticsTitle` | Page Title | Static Label (`<h1>`) | String | — | Visible. Text: "Revenue Analytics" | — | i18n key: `admin.ads.revenueAnalytics` | `text-2xl font-bold`. |
| 116 | `btnBackToAdsFromAnalytics` | Back to Ads Button | Button (`text`) | — | — | Visible. Text: "← Back to Ads" | — | — | Navigates to `/admin/ads`. |

### 4.35 Section [B]: Filter Controls — Analytics (フィルターコントロール — 分析)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 117 | `dateRangeAnalytics` | Date Range Picker | Date Range Picker | Date Range | Yes | Default: last 30 days | Valid date range, max 365 days | — | i18n key: `admin.ads.dateRange`. |
| 118 | `selAnalyticsPlacement` | Placement Filter | Multi-Select | Array[Enum] | No | Empty (all placements) | Options: Homepage Banner, Product Sidebar, Category Banner, Search Top | — | i18n key: `admin.ads.filterByPlacement`. |
| 119 | `selAnalyticsTier` | Tier Filter | Multi-Select | Array[Enum] | No | Empty (all tiers) | Options: Basic, Standard, Premium | — | i18n key: `admin.ads.filterByTier`. |

### 4.36 Section [C]: Summary Metrics (サマリーメトリクス)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 120 | `statTotalRevenue` | Total Revenue Card | Stats Card | Decimal | — | Populated on load | — | `SUM(ad_payments.amount)` | **Business Rule Confirmation Required:** Revenue calculation definition (Gross vs Net after refunds) not confirmed. |
| 121 | `statTotalAdsApproved` | Total Ads Approved Card | Stats Card | Integer | — | Populated on load | — | `COUNT(approved ads)` | — |
| 122 | `statTotalFeesCollected` | Total Fees Collected Card | Stats Card | Decimal | — | Populated on load | — | `SUM(completed payments)` | Localized currency format. |
| 123 | `statAvgRevenuePerAd` | Avg Revenue Per Ad Card | Stats Card | Decimal | — | Populated on load | — | `totalRevenue / totalAds` | Localized currency format. |
| 124 | `statTotalRefunds` | Total Refunds Card | Stats Card | Decimal | — | Populated on load | — | `SUM(refunded amounts)` | Localized currency format. Shows total amount refunded due to rejections. |

### 4.37 Section [D]: Charts (チャート)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 125 | `chartRevenueByPlacement` | Revenue by Placement Chart | Bar Chart | Array | — | Populated on load | — | `GROUP BY placement` | Revenue breakdown by placement. |
| 126 | `chartRevenueByTier` | Revenue by Tier Chart | Bar Chart | Array | — | Populated on load | — | `GROUP BY tier` | Revenue breakdown by tier. |
| 127 | `chartRevenueTrend` | Revenue Trend Chart | Line Chart | Array | — | Populated on load | — | `GROUP BY date` | Revenue over time (daily/weekly). |

### 4.38 Section [E]: Data Tables — Analytics (データテーブル — 分析)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 128 | `tblAdsByPlacement` | Ads by Placement Table | Data Table | Array | — | Populated on load | — | `GROUP BY placement` | Columns: Placement, Ad Count, Total Revenue, Avg CTR. |
| 129 | `tblAdsByTier` | Ads by Tier Table | Data Table | Array | — | Populated on load | — | `GROUP BY tier` | Columns: Tier, Ad Count, Total Revenue, Avg CTR. |

### 4.39 Section [A]: Page Header — Export Reports (ページヘッダー — エクスポートレポート)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 130 | `lblExportTitle` | Page Title | Static Label (`<h1>`) | String | — | Visible. Text: "Export Reports" | — | i18n key: `admin.ads.exportReports` | `text-2xl font-bold`. |
| 131 | `btnBackToAdsFromExport` | Back to Ads Button | Button (`text`) | — | — | Visible. Text: "← Back to Ads" | — | — | Navigates to `/admin/ads`. |

### 4.40 Section [B]: Report Type Selection (レポート種別選択)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 132 | `cardAdPerformance` | Ad Performance Card | Card (selectable) | — | — | Selectable | — | — | "Ad Performance Report — Impressions, clicks, CTR, revenue per ad". |
| 133 | `cardSubmissionHistory` | Submission History Card | Card (selectable) | — | — | Selectable | — | — | "Shop Submission History — All ad submissions, statuses, outcomes". |
| 134 | `cardFeeHistory` | Fee History Card | Card (selectable) | — | — | Selectable | — | — | "Fee History Log — All fee setting changes with timestamps and reasons". |

### 4.41 Section [C]: Export Configuration (エクスポート設定)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 135 | `dateRangeExport` | Date Range Picker | Date Range Picker | Date Range | Yes | Empty | Valid date range, max 365 days | — | i18n key: `admin.ads.dateRange`. |
| 136 | `selExportPlacement` | Placement Filter | Multi-Select | Array[Enum] | No | Empty (all placements) | Options: Homepage Banner, Product Sidebar, Category Banner, Search Top | — | i18n key: `admin.ads.filterByPlacement`. |
| 137 | `selExportTier` | Tier Filter | Multi-Select | Array[Enum] | No | Empty (all tiers) | Options: Basic, Standard, Premium | — | i18n key: `admin.ads.filterByTier`. |
| 138 | `selExportStatus` | Status Filter | Multi-Select | Array[Enum] | No | Empty (all statuses) | Options: Pending, Approved, Rejected | — | i18n key: `admin.ads.filterByStatus`. For ad performance & submission history. |
| 139 | `txtExportShopFilter` | Shop Filter | Input (`text`) | String(255) | No | Empty. Placeholder: "Filter by shop..." | MaxLength: 255 | — | i18n key: `admin.ads.filterByShop`. For submission history. |
| 140 | `radExportFormat` | Format Selection | Radio Group | Enum | Yes | Default: CSV | Options: CSV | — | i18n key: `admin.ads.exportFormat`. Only CSV supported. |
| 141 | `btnGenerateExport` | Generate Report Button | Button (`primary`) | — | — | Visible. Text: "Generate Report" | — | — | i18n key: `admin.ads.generateExport`. Requires date range. |
| 142 | `lblEstimatedRows` | Estimated Rows Text | Static Label | String | — | "Estimated {n} rows" | — | — | Shown after filters applied. |

### 4.42 Section [D]: Recent Exports Table (最近のエクスポートテーブル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 143 | `lblExportType` | Report Type | Static Label | String | — | Populated from DB | — | `export_jobs.report_type` | — |
| 144 | `lblExportFormat` | Format | Static Label | String | — | "CSV" | — | — | — |
| 145 | `lblExportDateRange` | Date Range | Static Label | String | — | Populated from DB | — | `export_jobs.date_from`, `export_jobs.date_to` | — |
| 146 | `badgeExportStatus` | Status Badge | Badge | Enum | — | Amber (Processing), Green (Ready), Red (Failed), Gray (Expired) | — | `export_jobs.status` | Standard status badge colors. |
| 147 | `btnDownloadExport` | Download Button | Button (`outline`) | — | — | Visible when status = "ready" | — | — | Triggers file download. |

---

## 5. Item Behaviors & Event Specifications (各項目における挙動・イベント仕様)

### 5.1 Ad List Page Behaviors

| Item ID | Trigger Event | Processing Logic | Exception Handling |
| :--- | :--- | :--- | :--- |
| `btnManagePackages` | Click | Navigate to `/admin/advertisements/packages`. | Show toast error on navigation failure. |
| `btnRevenueAnalytics` | Click | Navigate to `/admin/advertisements/analytics`. | Show toast error on navigation failure. |
| `btnExport` | Click | Navigate to `/admin/advertisements/export`. | Show toast error on navigation failure. |
| `selStatusFilter` | Change | Update query params, re-fetch ad list with new filter. | Show toast error on API failure. |
| `selPlacementFilter` | Change | Update query params, re-fetch ad list with new filter. | Show toast error on API failure. |
| `selTierFilter` | Change | Update query params, re-fetch ad list with new filter. | Show toast error on API failure. |
| `txtShopSearch` | Input (debounced 300ms) | Update query params, re-fetch ad list with search term. | Show toast error on API failure. |
| `dateRangeFilter` | Change | Update query params, re-fetch ad list with date range. | Show toast error on API failure. |
| `chkSelectAllAds` | Change | Toggle all row checkboxes. Update bulk action bar count. | — |
| `chkSelectAd` | Change | Toggle row checkbox. Update bulk action bar count. Enable/disable bulk buttons. | — |
| `btnReviewAd` | Click | Fetch ad details by ID. Open Ad Review Modal. | Show toast error if ad not found. |
| `btnViewAd` | Click | Fetch ad details by ID. Open Ad Review Modal (read-only). | Show toast error if ad not found. |
| `btnBulkApprove` | Click | Validate selection > 0. Open Bulk Approve Modal. | Show toast warning if no selection. |
| `btnBulkReject` | Click | Validate selection > 0. Open Bulk Reject Modal. | Show toast warning if no selection. |
| `btnClearSelection` | Click | Deselect all checkboxes. Reset bulk action bar. | — |
| `pagAds` | Page change | Update page query param, re-fetch ad list. | Show toast error on API failure. |

### 5.2 Ad Review Modal Behaviors

| Item ID | Trigger Event | Processing Logic | Exception Handling |
| :--- | :--- | :--- | :--- |
| `btnCloseReviewModal` | Click / Escape | Close modal. Reset form state. | — |
| `btnApproveAd` | Click | Validate ad is PENDING. Call `PATCH /api/v1/admin/ads/:id/approve`. Close modal. Refresh ad list. Show success toast. | Show toast error if ad is not PENDING. Show toast error on API failure. |
| `btnRejectAd` | Click | Show rejection confirmation alert. Show rejection reason textarea. Validate reason not empty. Call `PATCH /api/v1/admin/ads/:id/reject` with reason. Close modal. Refresh ad list. Show success toast. | Show validation error if reason empty. Show toast error on API failure. |
| `btnCancelReview` | Click | Close modal. Reset form state. | — |
| `txtRejectionReason` | Input | Update rejection reason state. Show character count. | — |

### 5.3 Bulk Reject Modal Behaviors

| Item ID | Trigger Event | Processing Logic | Exception Handling |
| :--- | :--- | :--- | :--- |
| `btnCloseBulkRejectModal` | Click / Escape | Close modal. Reset form state. | — |
| `btnConfirmBulkReject` | Click | Validate reason not empty. Call `POST /api/v1/admin/ads/bulk-reject` with IDs and reason. Close modal. Refresh ad list. Show success toast. Clear selection. | Show validation error if reason empty. Show toast error on API failure. |
| `btnCancelBulkReject` | Click | Close modal. Reset form state. | — |
| `txtBulkRejectReason` | Input | Update rejection reason state. Show character count. | — |

### 5.4 Bulk Approve Modal Behaviors

| Item ID | Trigger Event | Processing Logic | Exception Handling |
| :--- | :--- | :--- | :--- |
| `btnCloseBulkApproveModal` | Click / Escape | Close modal. | — |
| `btnConfirmBulkApprove` | Click | Call `POST /api/v1/admin/ads/bulk-approve` with IDs. Close modal. Refresh ad list. Show success toast. Clear selection. | Show toast error on API failure. |
| `btnCancelBulkApprove` | Click | Close modal. | — |

### 5.5 Package & Fee Management Behaviors

| Item ID | Trigger Event | Processing Logic | Exception Handling |
| :--- | :--- | :--- | :--- |
| `btnBackToAdsFromPackages` | Click | Navigate to `/admin/ads`. | Show toast error on navigation failure. |
| `btnViewFeeHistory` | Click | Navigate to `/admin/advertisements/fee-history`. | Show toast error on navigation failure. |
| `btnCreateFeeSetting` | Click | Open Create Fee Modal. | — |
| `btnEditFee` | Click | Fetch fee setting details. Open Edit Fee Modal. | Show toast error if setting not found. |
| `btnDeactivateFee` | Click | Open Deactivate Fee Confirmation Modal. | — |
| `btnSaveFee` | Click | Validate all fields. Call `PATCH /api/v1/admin/ads/fees/:id`. Close modal. Refresh fee list. Show success toast. | Show validation errors inline. Show toast error on API failure. |
| `btnCreateFee` | Click | Validate all fields. Check uniqueness (placement+tier). Call `POST /api/v1/admin/ads/fees`. Close modal. Refresh fee list. Show success toast. | Show validation errors inline. Show toast error on duplicate. Show toast error on API failure. |
| `btnConfirmDeactivateFee` | Click | Call `PATCH /api/v1/admin/ads/fees/:id/deactivate`. Close modal. Refresh fee list. Show success toast. | Show toast error on API failure. |
| `btnCancelEditFee` / `btnCancelCreateFee` / `btnCancelDeactivateFee` | Click | Close modal. Reset form state. | — |

### 5.6 Fee Change History Behaviors

| Item ID | Trigger Event | Processing Logic | Exception Handling |
| :--- | :--- | :--- | :--- |
| `btnBackToPackages` | Click | Navigate to `/admin/advertisements/packages`. | Show toast error on navigation failure. |
| `selHistoryPlacementFilter` | Change | Update query params, re-fetch history list. | Show toast error on API failure. |
| `selHistoryTierFilter` | Change | Update query params, re-fetch history list. | Show toast error on API failure. |
| `pagFeeHistory` | Page change | Update page query param, re-fetch history list. | Show toast error on API failure. |

### 5.7 Revenue Analytics Behaviors

| Item ID | Trigger Event | Processing Logic | Exception Handling |
| :--- | :--- | :--- | :--- |
| `btnBackToAdsFromAnalytics` | Click | Navigate to `/admin/ads`. | Show toast error on navigation failure. |
| `dateRangeAnalytics` | Change | Re-fetch analytics data with new date range. | Show toast error on API failure. |
| `selAnalyticsPlacement` | Change | Re-fetch analytics data with placement filter. | Show toast error on API failure. |
| `selAnalyticsTier` | Change | Re-fetch analytics data with tier filter. | Show toast error on API failure. |

### 5.8 Export Reports Behaviors

| Item ID | Trigger Event | Processing Logic | Exception Handling |
| :--- | :--- | :--- | :--- |
| `btnBackToAdsFromExport` | Click | Navigate to `/admin/ads`. | Show toast error on navigation failure. |
| `cardAdPerformance` | Click | Select report type. Update form state. | — |
| `cardSubmissionHistory` | Click | Select report type. Update form state. | — |
| `cardFeeHistory` | Click | Select report type. Update form state. | — |
| `btnGenerateExport` | Click | Validate report type selected. Validate date range. Call `POST /api/v1/admin/ads/export`. Show estimated rows. Show success toast. | Show validation errors if missing. Show toast error on API failure. |
| `btnDownloadExport` | Click | Trigger file download via blob URL. | Show toast error if file expired or not found. |

---

## 6. Validation & Error Message Mapping (バリデーション及びエラーメッセージマッピング)

### 6.1 Ad Review Validation

| Field | Rule | Error Message (EN) | Error Message (JA) |
| :--- | :--- | :--- | :--- |
| `rejection_reason` | Required when rejecting | "Rejection reason is required" | "却下理由は必須です" |
| `rejection_reason` | MaxLength: 1000 | "Rejection reason must not exceed 1000 characters" | "却下理由は1000文字以内で入力してください" |

### 6.2 Bulk Reject Validation

| Field | Rule | Error Message (EN) | Error Message (JA) |
| :--- | :--- | :--- | :--- |
| `rejection_reason` | Required | "Rejection reason is required" | "却下理由は必須です" |
| `rejection_reason` | MaxLength: 1000 | "Rejection reason must not exceed 1000 characters" | "却下理由は1000文字以内で入力してください" |
| `ad_ids` | Min length: 1 | "Select at least one advertisement" | "少なくとも1つの広告を選択してください" |

### 6.3 Fee Setting Validation

| Field | Rule | Error Message (EN) | Error Message (JA) |
| :--- | :--- | :--- | :--- |
| `placement` | Required, valid enum | "Placement is required" / "Invalid placement" | "配置場所は必須です" / "無効な配置場所です" |
| `tier` | Required, valid enum | "Tier is required" / "Invalid tier" | "ティアは必須です" / "無効なティアです" |
| `daily_rate` | Required, `@Min(0.01)` | "Daily rate must be greater than 0" | "日額料金は0より大きい必要があります" |
| `duration_days` | Required, `@Min(1)` | "Duration must be at least 1 day" | "期間は最低1日である必要があります" |
| `max_ads` | Required, `@Min(1)` | "Max ads must be at least 1" | "最大広告数は最低1である必要があります" |
| `effective_from` | Required, valid date | "Effective date is required" | "適用開始日は必須です" |
| `change_reason` | Required, MaxLength: 1000 | "Change reason is required" | "変更理由は必須です" |
| Uniqueness | No active setting for placement+tier | "A fee setting already exists for this placement and tier" | "この配置場所とティアのfee設定は既に存在します" |

### 6.4 Export Validation

| Field | Rule | Error Message (EN) | Error Message (JA) |
| :--- | :--- | :--- | :--- |
| `reportType` | Required, valid enum | "Report type is required" / "Invalid report type" | "レポート種別は必須です" / "無効なレポート種別です" |
| `dateFrom` | Required, valid date | "Start date is required" | "開始日は必須です" |
| `dateTo` | Required, >= dateFrom, max 365 days | "End date is required" / "End date must be after start date" / "Date range cannot exceed 365 days" | "終了日は必須です" / "終了日は開始日より後である必要があります" / "日付範囲は365日を超えることはできません" |
| `format` | Required, valid enum | "Export format is required" / "Invalid format" | "エクスポート形式は必須です" / "無効な形式です" |

### 6.5 Standard Error Response Format

```json
{
  "statusCode": 400,
  "message": ["error detail"],
  "error": "Bad Request",
  "timestamp": "2026-08-26T12:00:00.000Z",
  "path": "/api/v1/admin/ads/abc123/approve"
}
```

---

## 7. Database Fields Mapping (データベースフィールドマッピング)

### 7.1 Advertisements Table

| UI Element | DB Column | Type | Notes |
| :--- | :--- | :--- | :--- |
| `lblShopName` | `shops.name` | VARCHAR(255) | Via JOIN on `shop_id` |
| `lblAdTitle` | `advertisements.title` | VARCHAR(255) | — |
| `lblPlacement` | `advertisements.placement` | VARCHAR(50) | Enum: `homepage_banner`, `product_sidebar`, `category_banner`, `search_top` |
| `lblTier` | `advertisements.tier` | VARCHAR(20) | Enum: `basic`, `standard`, `premium` |
| `badgeAdStatus` | `advertisements.status` | VARCHAR(20) | Enum: `pending`, `approved`, `rejected` |
| `badgePaymentStatus` | `advertisements.payment_status` | VARCHAR(20) | Enum: `pending`, `completed`, `refunded` |
| `lblSubmittedAt` | `advertisements.created_at` | TIMESTAMP | — |
| `lblFee` | `advertisements.fee_amount` | DECIMAL(10,2) | — |
| `imgAdBanner` | `advertisements.image_url` | TEXT | — |
| `lblAdMessage` | `advertisements.message` | VARCHAR(500) | — |
| `lblAdLinkUrl` | `advertisements.link_url` | TEXT | — |
| `lblAdContent` | `advertisements.content` | TEXT | — |
| `lblAdSchedule` | `advertisements.start_date`, `advertisements.end_date` | DATE | — |
| `txtRejectionReason` | `advertisements.rejection_reason` | TEXT | — |

### 7.2 Ad Payments Table

| UI Element | DB Column | Type | Notes |
| :--- | :--- | :--- | :--- |
| `lblFeePaid` | `ad_payments.amount` | DECIMAL(10,2) | — |
| `badgePaymentStatusDetail` | `ad_payments.status` | VARCHAR(20) | Enum: `pending`, `completed`, `refunded` |

### 7.3 Ad Fee Settings Table

| UI Element | DB Column | Type | Notes |
| :--- | :--- | :--- | :--- |
| `lblFeePlacement` | `ad_fee_settings.placement` | VARCHAR(50) | Enum: `homepage_banner`, `product_sidebar`, `category_banner`, `search_top` |
| `badgeFeeTier` | `ad_fee_settings.tier` | VARCHAR(20) | Enum: `basic`, `standard`, `premium` |
| `lblDailyRate` | `ad_fee_settings.daily_rate` | DECIMAL(10,2) | — |
| `lblDuration` | `ad_fee_settings.duration_days` | INTEGER | — |
| `lblMaxAds` | `ad_fee_settings.max_ads` | INTEGER | — |
| `badgeFeeStatus` | `ad_fee_settings.is_active` | BOOLEAN | — |

### 7.4 Ad Fee History Table

| UI Element | DB Column | Type | Notes |
| :--- | :--- | :--- | :--- |
| `lblHistoryDate` | `ad_fee_history.created_at` | TIMESTAMP | — |
| `lblHistoryPlacement` | `ad_fee_history.placement` | VARCHAR(50) | — |
| `badgeHistoryTier` | `ad_fee_history.tier` | VARCHAR(20) | — |
| `lblOldRate` | `ad_fee_history.old_rate` | DECIMAL(10,2) | — |
| `lblNewRate` | `ad_fee_history.new_rate` | DECIMAL(10,2) | — |
| `lblChangedBy` | `ad_fee_history.changed_by` | UUID | FK → `users.id` |
| `lblReason` | `ad_fee_history.reason` | TEXT | — |

---

## 8. API Response Mapping (APIレスポンスマッピング)

### 8.1 Ad List Success Response

```json
{
  "data": [
    {
      "id": "clxAd001",
      "shopId": "clxShop001",
      "shopName": "Glow Skincare",
      "title": "Summer Sale Banner",
      "placement": "homepage_banner",
      "tier": "standard",
      "status": "pending",
      "paymentStatus": "completed",
      "feeAmount": 35.00,
      "imageUrl": "https://cdn.example.com/ads/banner1.jpg",
      "message": "Summer Sale 50% Off",
      "linkUrl": "https://example.com/sale",
      "content": "Description text...",
      "startDate": "2026-09-01",
      "endDate": "2026-09-07",
      "rejectionReason": null,
      "approvedBy": null,
      "approvedAt": null,
      "createdAt": "2026-08-25T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### 8.2 Ad Approve Success Response

```json
{
  "data": {
    "id": "clxAd001",
    "status": "approved",
    "approvedBy": "clxAdmin001",
    "approvedAt": "2026-08-26T12:00:00.000Z",
    "updatedAt": "2026-08-26T12:00:00.000Z"
  }
}
```

### 8.3 Ad Reject Success Response

```json
{
  "data": {
    "id": "clxAd001",
    "status": "rejected",
    "rejectionReason": "Violates advertising policy",
    "updatedAt": "2026-08-26T12:00:00.000Z"
  }
}
```

### 8.4 Bulk Approve Success Response

```json
{
  "data": {
    "approved": 5,
    "failed": 0,
    "results": [
      { "id": "clxAd001", "status": "approved" },
      { "id": "clxAd002", "status": "approved" }
    ]
  }
}
```

### 8.5 Bulk Reject Success Response

```json
{
  "data": {
    "rejected": 5,
    "failed": 0,
    "refundsProcessed": 5,
    "results": [
      { "id": "clxAd001", "status": "rejected", "refundStatus": "processed" },
      { "id": "clxAd002", "status": "rejected", "refundStatus": "processed" }
    ]
  }
}
```

### 8.6 Fee Settings Success Response

```json
{
  "data": [
    {
      "id": "clxFee001",
      "placement": "homepage_banner",
      "tier": "standard",
      "dailyRate": 5.00,
      "durationDays": 7,
      "maxAds": 1,
      "isActive": true,
      "createdAt": "2026-08-20T10:00:00.000Z"
    }
  ]
}
```

### 8.7 Revenue Analytics Success Response

```json
{
  "data": {
    "summary": {
      "totalRevenue": 12500.00,
      "totalAdsApproved": 45,
      "totalFeesCollected": 8200.00,
      "avgRevenuePerAd": 277.78,
      "totalRefunds": 1200.00
    },
    "byPlacement": [
      {
        "placement": "homepage_banner",
        "placementName": "Homepage Banner",
        "adCount": 20,
        "revenue": 5500.00,
        "avgCtr": 3.2
      }
    ],
    "byTier": [
      {
        "tier": "premium",
        "tierName": "Premium",
        "adCount": 10,
        "revenue": 4500.00,
        "avgCtr": 4.1
      }
    ],
    "trend": [
      {
        "date": "2026-08-25",
        "revenue": 450.00,
        "adCount": 5
      }
    ]
  }
}
```

### 8.8 Fee History Success Response

```json
{
  "data": [
    {
      "id": "clxFeeHist001",
      "placement": "homepage_banner",
      "tier": "standard",
      "oldRate": 4.00,
      "newRate": 5.00,
      "changedBy": "clxAdmin001",
      "changedByName": "Admin User",
      "reason": "Annual rate adjustment",
      "createdAt": "2026-08-25T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 80,
    "totalPages": 4
  }
}
```

### 8.9 Export Job Success Response

```json
{
  "data": {
    "id": "clxExport001",
    "reportType": "ad_performance",
    "format": "csv",
    "status": "processing",
    "estimatedRows": 150,
    "createdAt": "2026-08-26T12:00:00.000Z"
  }
}
```

### 8.10 Error Response (Standard)

```json
{
  "statusCode": 400,
  "message": ["placement must be one of the following values: homepage_banner, product_sidebar, category_banner, search_top"],
  "error": "Bad Request",
  "timestamp": "2026-08-26T12:00:00.000Z",
  "path": "/api/v1/admin/ads/fees"
}
```

---

## 9. i18n Keys Reference (i18nキーリファレンス)

### 9.1 English (en) — Ad Management

| Key | Value |
| :--- | :--- |
| `admin.ads.title` | "Advertisement Management" |
| `admin.ads.pendingCount` | "{count} Pending" |
| `admin.ads.managePackages` | "Manage Packages" |
| `admin.ads.revenueAnalytics` | "Revenue Analytics" |
| `admin.ads.export` | "Export" |
| `admin.ads.filterByStatus` | "Status" |
| `admin.ads.filterByPlacement` | "Placement" |
| `admin.ads.filterByTier` | "Tier" |
| `admin.ads.searchShop` | "Search shop..." |
| `admin.ads.filterByDate` | "Date Range" |
| `admin.ads.shop` | "Shop" |
| `admin.ads.titleColumn` | "Title" |
| `admin.ads.placement` | "Placement" |
| `admin.ads.tier` | "Tier" |
| `admin.ads.status` | "Status" |
| `admin.ads.payment` | "Payment" |
| `admin.ads.submittedAt` | "Submitted" |
| `admin.ads.fee` | "Fee" |
| `admin.ads.actions` | "Actions" |
| `admin.ads.noAds` | "No advertisements found." |
| `admin.ads.selectedCount` | "{n} ads selected" |
| `admin.ads.bulkApprove` | "Bulk Approve" |
| `admin.ads.bulkReject` | "Bulk Reject" |
| `admin.ads.clearSelection` | "Clear" |
| `admin.ads.reviewAd` | "Review Advertisement" |
| `admin.ads.shopInfo` | "Shop Info" |
| `admin.ads.placementTier` | "{placement} — {tier}" |
| `admin.ads.message` | "Announcement Message" |
| `admin.ads.linkUrl` | "Link URL" |
| `admin.ads.content` | "Content" |
| `admin.ads.schedule` | "Schedule" |
| `admin.ads.feePaid` | "Fee Paid" |
| `admin.ads.paymentStatus` | "Payment Status" |
| `admin.ads.rejectionReason` | "Rejection Reason" |
| `admin.ads.rejectionReasonPlaceholder` | "Enter reason for rejection..." |
| `admin.ads.approve` | "Approve" |
| `admin.ads.reject` | "Reject" |
| `admin.ads.cancel` | "Cancel" |
| `admin.ads.bulkRejectTitle` | "Bulk Reject Advertisements" |
| `admin.ads.bulkRejectCount` | "You are about to reject {n} advertisements." |
| `admin.ads.bulkRejectWarning` | "The advertisements will not be displayed. Paid amounts will be refunded in full (100%) according to the refund rule." |
| `admin.ads.confirmBulkReject` | "Confirm Reject" |
| `admin.ads.bulkApproveTitle` | "Bulk Approve Advertisements" |
| `admin.ads.bulkApproveCount` | "You are about to approve {n} advertisements." |
| `admin.ads.confirmBulkApprove` | "Confirm Approve" |
| `admin.ads.packages` | "Package & Fee Management" |
| `admin.ads.backToAds` | "← Back to Ads" |
| `admin.ads.viewFeeHistory` | "View History" |
| `admin.ads.createFeeSetting` | "+ Create Fee Setting" |
| `admin.ads.dailyRate` | "Daily Rate" |
| `admin.ads.duration` | "Duration" |
| `admin.ads.maxAds` | "Max Ads" |
| `admin.ads.editFee` | "Edit Fee Setting" |
| `admin.ads.createFee` | "Create Fee Setting" |
| `admin.ads.save` | "Save" |
| `admin.ads.create` | "Create" |
| `admin.ads.effectiveFrom` | "Effective From" |
| `admin.ads.changeReason` | "Change Reason" |
| `admin.ads.changeReasonPlaceholder` | "Enter reason for change..." |
| `admin.ads.deactivateFeeTitle` | "Deactivate Fee Setting" |
| `admin.ads.deactivateFeeWarning` | "This fee setting will be deactivated. Existing ads that have already purchased this package are unaffected — their paid amount is locked." |
| `admin.ads.confirmDeactivate` | "Deactivate" |
| `admin.ads.feeHistory` | "Fee Change History" |
| `admin.ads.backToPackages` | "← Back to Packages" |
| `admin.ads.oldRate` | "Old Rate" |
| `admin.ads.newRate` | "New Rate" |
| `admin.ads.changedBy` | "Changed By" |
| `admin.ads.reason` | "Reason" |
| `admin.ads.date` | "Date" |
| `admin.ads.revenueAnalytics` | "Revenue Analytics" |
| `admin.ads.dateRange` | "Date Range" |
| `admin.ads.totalRevenue` | "Total Revenue" |
| `admin.ads.totalAdsApproved` | "Total Ads Approved" |
| `admin.ads.totalFeesCollected` | "Total Fees Collected" |
| `admin.ads.avgRevenuePerAd` | "Avg Revenue Per Ad" |
| `admin.ads.totalRefunds` | "Total Refunds" |
| `admin.ads.revenueByPlacement` | "Revenue by Placement" |
| `admin.ads.revenueByTier` | "Revenue by Tier" |
| `admin.ads.revenueTrend` | "Revenue Trend" |
| `admin.ads.adsByPlacement` | "Ads by Placement" |
| `admin.ads.adsByTier` | "Ads by Tier" |
| `admin.ads.exportReports` | "Export Reports" |
| `admin.ads.reportType` | "Report Type" |
| `admin.ads.adPerformanceReport` | "Ad Performance Report" |
| `admin.ads.submissionHistoryReport` | "Shop Submission History" |
| `admin.ads.feeHistoryReport` | "Fee History Log" |
| `admin.ads.exportFormat` | "Format" |
| `admin.ads.generateExport` | "Generate Report" |
| `admin.ads.estimatedRows` | "Estimated {n} rows" |
| `admin.ads.download` | "Download" |
| `admin.ads.format` | "Format" |
| `admin.ads.generatedAt` | "Generated At" |
| `admin.ads.success.approved` | "Advertisement approved" |
| `admin.ads.success.rejected` | "Advertisement rejected" |
| `admin.ads.success.bulkApproved` | "{n} advertisements approved" |
| `admin.ads.success.bulkRejected` | "{n} advertisements rejected" |
| `admin.ads.success.feeCreated` | "Fee setting created" |
| `admin.ads.success.feeUpdated` | "Fee setting updated" |
| `admin.ads.success.feeDeactivated` | "Fee setting deactivated" |
| `admin.ads.success.exportStarted` | "Export started" |
| `admin.ads.rejectWarning` | "The advertisement will be rejected and will not be displayed. The paid amount will be refunded in full (100%) according to the refund rule." |
| `admin.ads.totalFee` | "Total Fee" |
| `admin.ads.feeCalculation` | "Daily Rate × Duration = Total Fee" |
| `admin.ads.refundInfo` | "Refund: {amount} (100% of paid amount)" |

### 9.2 Japanese (ja) — Ad Management

| Key | Value |
| :--- | :--- |
| `admin.ads.title` | "広告管理" |
| `admin.ads.pendingCount` | "{count} 件承認待ち" |
| `admin.ads.managePackages` | "パッケージ管理" |
| `admin.ads.revenueAnalytics` | "収益分析" |
| `admin.ads.export` | "エクスポート" |
| `admin.ads.filterByStatus` | "ステータス" |
| `admin.ads.filterByPlacement` | "配置場所" |
| `admin.ads.filterByTier` | "ティア" |
| `admin.ads.searchShop` | "店舗を検索..." |
| `admin.ads.filterByDate` | "日付範囲" |
| `admin.ads.shop` | "店舗" |
| `admin.ads.titleColumn` | "タイトル" |
| `admin.ads.placement` | "配置場所" |
| `admin.ads.tier` | "ティア" |
| `admin.ads.status` | "ステータス" |
| `admin.ads.payment` | "決済" |
| `admin.ads.submittedAt` | "提出日" |
| `admin.ads.fee` | "料金" |
| `admin.ads.actions` | "操作" |
| `admin.ads.noAds` | "広告が見つかりません。" |
| `admin.ads.selectedCount` | "{n} 件の広告を選択中" |
| `admin.ads.bulkApprove` | "一括承認" |
| `admin.ads.bulkReject` | "一括却下" |
| `admin.ads.clearSelection` | "選択解除" |
| `admin.ads.reviewAd` | "広告を確認" |
| `admin.ads.shopInfo` | "店舗情報" |
| `admin.ads.placementTier` | "{placement} — {tier}" |
| `admin.ads.message` | "告知メッセージ" |
| `admin.ads.linkUrl` | "リンクURL" |
| `admin.ads.content` | "コンテンツ" |
| `admin.ads.schedule` | "スケジュール" |
| `admin.ads.feePaid` | "支払料金" |
| `admin.ads.paymentStatus` | "決済ステータス" |
| `admin.ads.rejectionReason` | "却下理由" |
| `admin.ads.rejectionReasonPlaceholder` | "却下理由を入力してください..." |
| `admin.ads.approve` | "承認" |
| `admin.ads.reject` | "却下" |
| `admin.ads.cancel` | "キャンセル" |
| `admin.ads.bulkRejectTitle` | "広告を一括却下" |
| `admin.ads.bulkRejectCount` | "{n} 件の広告を却下しようとしています。" |
| `admin.ads.bulkRejectWarning` | "選択したすべての広告に対して返金が自動処理されます。" |
| `admin.ads.confirmBulkReject` | "却下を確認" |
| `admin.ads.bulkApproveTitle` | "広告を一括承認" |
| `admin.ads.bulkApproveCount` | "{n} 件の広告を承認しようとしています。" |
| `admin.ads.confirmBulkApprove` | "承認を確認" |
| `admin.ads.packages` | "パッケージ＆Fee管理" |
| `admin.ads.backToAds` | "← 広告管理に戻る" |
| `admin.ads.viewFeeHistory` | "履歴を表示" |
| `admin.ads.createFeeSetting` | "+ Fee設定を作成" |
| `admin.ads.dailyRate` | "日額料金" |
| `admin.ads.duration` | "期間" |
| `admin.ads.maxAds` | "最大広告数" |
| `admin.ads.editFee` | "Fee設定を編集" |
| `admin.ads.createFee` | "Fee設定を作成" |
| `admin.ads.save` | "保存" |
| `admin.ads.create` | "作成" |
| `admin.ads.effectiveFrom` | "適用開始日" |
| `admin.ads.changeReason` | "変更理由" |
| `admin.ads.changeReasonPlaceholder` | "変更理由を入力してください..." |
| `admin.ads.deactivateFeeTitle` | "Fee設定を無効化" |
| `admin.ads.deactivateFeeWarning` | "このFee設定は無効化されます。このパッケージを既に購入した既存の広告には影響しません — 支払額は固定されます。" |
| `admin.ads.confirmDeactivate` | "無効化" |
| `admin.ads.feeHistory` | "Fee変更履歴" |
| `admin.ads.backToPackages` | "← パッケージ管理に戻る" |
| `admin.ads.oldRate` | "旧料金" |
| `admin.ads.newRate` | "新料金" |
| `admin.ads.changedBy` | "変更者" |
| `admin.ads.reason` | "理由" |
| `admin.ads.date` | "日付" |
| `admin.ads.revenueAnalytics` | "収益分析" |
| `admin.ads.dateRange` | "日付範囲" |
| `admin.ads.totalRevenue` | "総収益" |
| `admin.ads.totalAdsApproved` | "承認済み広告数" |
| `admin.ads.totalFeesCollected` | "回収Fee合計" |
| `admin.ads.avgRevenuePerAd` | "広告あたり平均収益" |
| `admin.ads.totalRefunds` | "返金合計" |
| `admin.ads.revenueByPlacement` | "配置場所別収益" |
| `admin.ads.revenueByTier` | "ティア別収益" |
| `admin.ads.revenueTrend` | "収益トレンド" |
| `admin.ads.adsByPlacement` | "配置場所別広告" |
| `admin.ads.adsByTier` | "ティア別広告" |
| `admin.ads.exportReports` | "エクスポートレポート" |
| `admin.ads.reportType` | "レポート種別" |
| `admin.ads.adPerformanceReport` | "広告パフォーマンスレポート" |
| `admin.ads.submissionHistoryReport` | "店舗提出履歴" |
| `admin.ads.feeHistoryReport` | "Fee履歴ログ" |
| `admin.ads.exportFormat` | "形式" |
| `admin.ads.generateExport` | "レポートを生成" |
| `admin.ads.estimatedRows` | "推定{n}行" |
| `admin.ads.download` | "ダウンロード" |
| `admin.ads.format` | "形式" |
| `admin.ads.generatedAt` | "生成日時" |
| `admin.ads.success.approved` | "広告が承認されました" |
| `admin.ads.success.rejected` | "広告が却下されました" |
| `admin.ads.success.bulkApproved` | "{n} 件の広告が承認されました" |
| `admin.ads.success.bulkRejected` | "{n} 件の広告が却下されました" |
| `admin.ads.success.feeCreated` | "Fee設定が作成されました" |
| `admin.ads.success.feeUpdated` | "Fee設定が更新されました" |
| `admin.ads.success.feeDeactivated` | "Fee設定が無効化されました" |
| `admin.ads.success.exportStarted` | "エクスポートが開始されました" |
| `admin.ads.rejectWarning` | "この広告は却下され、表示されません。支払額は全額（100%）返金されます。" |
| `admin.ads.totalFee` | "合計料金" |
| `admin.ads.feeCalculation` | "日額料金 × 期間 = 合計料金" |
| `admin.ads.refundInfo` | "返金額: {amount}（支払額の100%）" |

---

## 10. Shared Components (共有コンポーネント)

### 10.1 DashboardLayout Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/layout/DashboardLayout.tsx` |
| **Purpose** | Shared admin layout with sidebar navigation |

### 10.2 DataTable Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/table.tsx` |
| **Variants** | `default`, `striped` |
| **Usage** | Ads table, Fee settings table, Fee history table, Export recent table |

### 10.3 Badge Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/badge.tsx` |
| **Variants** | `default`, `secondary`, `destructive`, `outline` |
| **Usage** | Status badges (Approved, Rejected, Pending), Payment badges, Tier badges |

### 10.4 Dialog Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/dialog.tsx` |
| **Usage** | Ad Review Modal, Bulk Approve Modal, Bulk Reject Modal, Edit Fee Modal, Create Fee Modal, Deactivate Fee Confirmation Modal |

### 10.5 Select Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/select.tsx` |
| **Usage** | Status filter, Placement filter, Tier filter, Fee setting selects |

### 10.6 Tabs Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/tabs.tsx` |
| **Usage** | Report type selection in Export page |

### 10.7 Pagination Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/pagination.tsx` |
| **Usage** | Table pagination with page size selector |

### 10.8 Textarea Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/textarea.tsx` |
| **Usage** | Rejection reason input, Change reason input |

### 10.9 DatePicker Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/date-picker.tsx` |
| **Usage** | Date range filter, Effective from date |

### 10.10 Card Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/card.tsx` |
| **Usage** | Report type selection cards, Metric cards in analytics |

---

## 11. Special UI Notes & Styling Constraints (特記事項・UI仕様)

- **Design System:** Luxury Cosmetics Theme — Primary `#7C3AED` (Purple), Accent `#EC4899` (Pink), Secondary `#F3E8FF` (Lavender).
- **Status Badge Colors:** Approved: `bg-green-100 text-green-800`, Rejected: `bg-red-100 text-red-800`, Pending: `bg-amber-100 text-amber-800`.
- **Payment Badge Colors:** Completed: `bg-green-100 text-green-800`, Pending: `bg-amber-100 text-amber-800`, Refunded: `bg-gray-100 text-gray-800`.
- **Fee Status Badge Colors:** Active: `bg-green-100 text-green-800`, Inactive: `bg-gray-100 text-gray-800`.
- **Responsive Viewport Design:** Full sidebar on desktop, collapsible on tablet, bottom nav on mobile.
- **Accessibility:** Every control must be keyboard navigable. ARIA labels required. Error messages must be announced via `role="alert"`.
- **Performance:** Tables use skeleton loaders during initial load. Buttons display spinner during async operations. Modals use lazy loading.
- **Security:** All user input is sanitized to prevent XSS. Admin endpoints enforced via backend RBAC only.
- **Confirmation Dialogs:** Required for all destructive actions (reject ad, bulk reject, deactivate fee). Use `AlertDialog` component.

---

## 12. Business Rules Reflected in This Screen (本画面で反映されるビジネスルール)

1. Advertisement Package pricing is configured through Fee Setting (Placement, Tier, Daily Rate, Duration, Max Ads).
2. **Total Fee = Daily Rate × Duration Days.** The calculated fee is displayed to both Merchant and Admin.
3. The fee amount is clearly displayed to the Merchant/Admin at package selection and in the review modal.
4. After successful payment and submission, the advertisement enters PENDING review.
5. **Only PENDING advertisements can be Approved or Rejected.**
6. Admin approval makes the advertisement eligible for display according to its schedule (Start Date ~ End Date).
7. Admin rejection requires a rejection reason (required, max 1000 characters).
8. Rejected advertisements are not displayed.
9. **Admin rejection before display results in a 100% refund of the successfully paid amount.**
10. **Existing purchased advertisement fees are not changed by later Fee Setting changes (Fee Locking Rule).**
11. Fee Setting changes only apply to new advertisements created after the change takes effect.
12. Deactivating a Fee Setting does not affect existing advertisements that used that setting.

---

## 13. Business Rule Confirmation Required (要確認事項)

The following items require business confirmation before implementation. They are marked as unresolved because the current document does not define them.

| No. | Item | Description | Status |
| :-- | :--- | :--- | :--- |
| 1 | Package vs Fee Setting relationship | The document treats Fee Setting as the Advertisement Package definition. If a separate Package entity is needed, this requires clarification. | Assumed: Fee Setting = Package |
| 2 | Discount / Tax / Service Fee | No discount, tax, or service fee rules are defined in the current document. | Not implemented |
| 3 | Payment Pending behavior | The exact UI behavior when payment is Pending (before submission) is not defined. The ad should not appear in the Admin review queue until payment is completed and the ad is submitted. | Not implemented |
| 4 | Exact Max Ads definition | Whether Max Ads means maximum active advertisements, maximum per placement, or maximum per period is not defined. | Requires confirmation |
| 5 | Date/duration calculation | Whether the display period counts Start Date and End Date inclusively (e.g., Sep 1–7 = 7 days) or exclusively is not defined. | Requires confirmation |
| 6 | Timezone | Timezone rules for Start Date, End Date, and schedule display are not defined. | Requires confirmation |
| 7 | Revenue calculation (Gross vs Net) | Whether Total Revenue in analytics means Gross Revenue or Net Revenue (after refunds) is not defined. | Requires confirmation |
| 8 | Merchant cancellation/refund rules | Rules for Merchant-initiated cancellation and refund (before Admin review) are not defined in the current document. | Not implemented |
| 9 | Payment Failed state | The exact UI behavior when payment fails (whether the ad is saved as draft, discarded, or shown in a specific state) is not defined. | Requires confirmation |

---

## 14. Testing Checklist (テストチェックリスト)

### 14.1 Ad List Dashboard Tests

- [ ] Page loads with correct title "Advertisement Management"
- [ ] Pending count badge displays correct number
- [ ] Manage Packages button navigates to fee settings
- [ ] Revenue Analytics button navigates to analytics
- [ ] Export button navigates to export page
- [ ] Filter by status works correctly (All, Pending, Approved, Rejected)
- [ ] Filter by placement works correctly
- [ ] Filter by tier works correctly
- [ ] Shop search filters by shop name
- [ ] Date range filter works correctly
- [ ] Pagination works with page size selector (20, 50, 100)
- [ ] Select all checkbox toggles all row checkboxes
- [ ] Bulk action buttons enable when selections made
- [ ] Bulk action buttons disable when no selections
- [ ] Clear selection deselects all
- [ ] Status badge shows correct lifecycle state (Pending/Approved/Rejected)
- [ ] Fee column shows correct calculated amount

### 14.2 Ad Review Modal Tests

- [ ] Modal opens with correct ad data
- [ ] Shop info displays correctly (name, placement, tier)
- [ ] Ad preview shows banner image, message, link URL, content
- [ ] Schedule displays Start Date ~ End Date with duration in days
- [ ] Fee section shows Daily Rate, Duration, and Total Fee (Daily Rate × Duration)
- [ ] Fee Paid displays the amount actually paid
- [ ] Payment Status badge shows correct state (Completed/Pending/Refunded)
- [ ] Fee amount is locked (displays purchase-time rate, not current rate)
- [ ] Approve button submits successfully (only for PENDING ads)
- [ ] Reject button shows rejection confirmation alert
- [ ] Reject confirmation alert explains: not displayed + 100% refund
- [ ] Reject with reason submits successfully
- [ ] Reject without reason shows validation error
- [ ] Refund info displayed after rejection
- [ ] Cancel button closes modal
- [ ] Modal closes on Escape key
- [ ] Modal closes on X button click

### 14.3 Bulk Approve Modal Tests

- [ ] Modal opens with correct count
- [ ] Confirmation message shows correct number
- [ ] Confirm Approve button submits successfully
- [ ] Cancel button closes modal
- [ ] Modal closes on Escape key

### 14.4 Bulk Reject Modal Tests

- [ ] Modal opens with correct count
- [ ] Warning message displays: not displayed + 100% refund
- [ ] Warning message shows correct refund information
- [ ] Reject button disabled without reason
- [ ] Reject with reason submits successfully
- [ ] Reject without reason shows validation error
- [ ] Cancel button closes modal
- [ ] Modal closes on Escape key

### 14.5 Package & Fee Management Tests

- [ ] Page loads with correct title "Package & Fee Management"
- [ ] Fee settings table displays correctly with Total Fee column
- [ ] Total Fee = Daily Rate × Duration is calculated correctly
- [ ] Status badges display correct colors (Active/Inactive)
- [ ] Create Fee Setting button opens create modal
- [ ] Edit button opens edit modal with pre-filled data
- [ ] Deactivate button opens confirmation modal
- [ ] Deactivate warning mentions fee locking for existing ads
- [ ] Create fee with valid data succeeds
- [ ] Create fee with duplicate placement+tier shows error
- [ ] Edit fee with valid data succeeds
- [ ] Deactivate fee succeeds
- [ ] Back to Ads navigates correctly
- [ ] View History navigates correctly

### 14.6 Fee Change History Tests

- [ ] Page loads with correct title "Fee Change History"
- [ ] History table displays correctly
- [ ] Filter by placement works correctly
- [ ] Filter by tier works correctly
- [ ] Pagination works correctly
- [ ] Back to Packages navigates correctly

### 14.7 Revenue Analytics Tests

- [ ] Page loads with correct title "Revenue Analytics"
- [ ] Date range filter works correctly
- [ ] Placement filter works correctly
- [ ] Tier filter works correctly
- [ ] Summary metrics display correctly
- [ ] Total Refunds card shows refunded amount
- [ ] Revenue by Placement chart renders
- [ ] Revenue by Tier chart renders
- [ ] Revenue Trend chart renders
- [ ] Data tables display correctly
- [ ] Back to Ads navigates correctly

### 14.8 Export Reports Tests

- [ ] Page loads with correct title "Export Reports"
- [ ] Report type cards are selectable
- [ ] Ad Performance card selects correctly
- [ ] Submission History card selects correctly
- [ ] Fee History card selects correctly
- [ ] Date range filter works correctly
- [ ] Placement filter works correctly
- [ ] Tier filter works correctly
- [ ] Status filter works correctly
- [ ] Shop search works correctly
- [ ] Format selection shows CSV only
- [ ] Generate Report button validates required fields
- [ ] Estimated rows display after filters applied
- [ ] Recent exports table displays correctly
- [ ] Download button works when status is ready
- [ ] Back to Ads navigates correctly

### 14.9 Error Handling Tests

- [ ] 403 Forbidden shows "You do not have permission"
- [ ] 404 Not Found shows "Advertisement not found"
- [ ] 409 Conflict shows "Already approved/rejected"
- [ ] 500 Server Error shows generic error message
- [ ] Network error shows connection error message
- [ ] Validation errors display inline on fields

### 14.10 i18n Tests

- [ ] All labels render correctly in English
- [ ] All labels render correctly in Japanese
- [ ] All labels render correctly in Myanmar
- [ ] Language toggle switches all labels
- [ ] Error messages display in selected language
- [ ] New strings (rejectWarning, totalFee, refundInfo) display correctly

### 14.11 Responsive Design Tests

- [ ] Desktop layout: Full sidebar + table
- [ ] Tablet layout: Collapsible sidebar + responsive table
- [ ] Mobile layout: Stacked cards (admin mobile not primary target)
- [ ] Modals are responsive on all breakpoints

### 14.12 Accessibility Tests

- [ ] All controls are keyboard navigable
- [ ] ARIA labels present on all interactive elements
- [ ] Error messages announced via `role="alert"`
- [ ] Color contrast meets WCAG 2.1 AA (4.5:1)
- [ ] Focus indicators visible on all interactive elements

---

*End of Screen Items Specification (Admin Ad Management)*
