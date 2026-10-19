# Screen Items Specification (画面項目設計書) — Admin Ad Management

**Document ID:** SKM-SIS-ADM-001  
**Target Screen:** Admin Ad Management (管理者広告管理)  
**Subsystem:** Advertisement Management — Admin Ad Review, Fee Management, Analytics, Export  
**Function ID:** FN-ADM-001  
**Version:** 2.0  
**Created:** 2026-08-26  
**Last Updated:** 2026-10-15  
**Author:** Software Architect  
**Review Status:** Released (承認済み)  
**Classification:** Internal — Engineering Division

---

## 1. Document Control (ドキュメント管理)

### 1.1 Document Revision History

| Version | Date | Author | Description of Changes |
| :--- | :--- | :--- | :--- |
| 1.0 | 2026-08-26 | Software Architect | Initial screen items specification for Admin Ad Management screens. |
| 1.1 | 2026-08-27 | Software Architect | Updated for business flow consistency: clarified Package/Fee Setting relationship, added fee calculation display rule, added payment behavior display, improved review modal, added fee locking rule, added business rules summary. |
| 1.2 | 2026-08-28 | Software Architect | Aligned admin routes, moderation APIs, fee-setting APIs, report-specific export APIs, advertisement DB column names, and revenue aggregation conditions with the latest functional and database specifications. |
| 2.0 | 2026-10-15 | Software Architect | **Full rewrite to match actual codebase implementation.** Updated all placement enums, i18n keys, component structures, table columns, modal layouts, filter controls, pagination, badge styles, and responsive breakpoints to reflect the shipped code. |

### 1.2 Related Documents

| No. | Document ID | Document Name | File Path | Remarks |
| :-- | :--- | :--- | :--- | :--- |
| 1 | SKM-REQ-001 | Requirements Definition (v2.10) | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | Business rules, ad display rules, monetization rules. |
| 2 | SKM-DBS-001 | Database Design Specification (v2.5) | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | Table structures (`advertisements`, `ad_payments`, `ad_fee_settings`, `ad_fee_history`), constraints. |
| 3 | SKM-DEV-001 | Development Rules (v2.1) | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | Security rules, design tokens, error responses. |
| 4 | SKM-FDS-ADM-001 | Functional Specification — Admin Ad Management (v1.2) | `docs/screen/Ad_Management_Screen/機能設計書_Ad_Management_Screen.md` | Use cases, state transitions, validation rules, error handling. |

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
2. **Bulk Approval / Rejection** — Selecting multiple pending ads via checkboxes and approving or rejecting them in a single batch action, with a common rejection reason for bulk rejects and automated batch refunds. Maximum 50 ads per bulk operation.
3. **Package & Fee Management** — Creating, editing, activating/deactivating fee settings per placement and tier. Each Fee Setting defines an Advertisement Package. All changes logged to fee history with timestamps, before/after values, and reasons. Maximum 12 packages (4 placements × 3 tiers).
4. **Fee Calculation Display** — Displaying the calculated Total Fee (Daily Rate × Duration Days) to both Merchants and Admins at the point of package selection and in the review modal.
5. **Fee Locking** — Once a Merchant has purchased a package and the advertisement fee has been determined, the paid amount is locked. Later Fee Setting changes do not affect existing advertisement paid amounts.
6. **Fee History Tracking** — Recording all pricing changes with full audit trail. Records from the current month are protected from deletion.
7. **Revenue Breakdown Analytics** — Providing pie charts, trend line chart, and summary metrics breaking down generated ad revenue by placement location and pricing tier over custom date ranges.
8. **Export Reports** — Exporting Ad Performance reports, Shop ad submission history, and Fee History logs in CSV format via direct download.
9. **Real-Time Feedback** — Toast notifications for all moderation actions.
10. **Confirmation Dialogs** — Required for all destructive actions (reject, bulk reject, deactivate fee, delete fee history).
11. **Pagination & Filtering** — Server-side pagination with multi-criteria filtering. Default page size 10; selectable 10/20/50/100.
12. **Internationalization** — Full i18n support for EN, JA, MY.
13. **Notification Deep Linking** — Ad list supports `?highlightAdId=` URL parameter to highlight and scroll to a specific ad row with a purple outline and NEW badge for 3 seconds.

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
Admin selects multiple ads (PENDING only, max 50)
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
│  │   Title: "Advertisement Management"              │   │
│  │   Subtitle: "Review merchant ads and manage     │   │
│  │              advertising fees"                   │   │
│  │   [Pending Count Badge] [Manage Packages]        │   │
│  │   [Revenue Analytics] [Export]                   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [B] FILTER BAR                      │   │
│  │   [Search Shop...] [Status ▼] [Placement ▼]     │   │
│  │   [Tier ▼] [Date Range From/To] [Refresh]       │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [C] BULK ACTION BAR                │   │
│  │   (visible only when ads selected)              │   │
│  │   {n} ads selected | [Clear]                    │   │
│  │   [All Approve] [All Reject]                    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [D] ADS TABLE                       │   │
│  │   ☐ | Shop | Title | Placement | Tier           │   │
│  │   Status | Payment | Fee | Submitted | Schedule  │   │
│  │   [Review/View icon] (sticky right)              │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [E] PAGINATION                      │   │
│  │   Rows: [10▼]  Showing page 1 of 8              │   │
│  │   [< Prev] [1] [2] [3] ... [8] [Next >]         │   │
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
│              │   or "View Advertisement"   │            │
│              │   "Advertisement by {shop}" │            │
│              ├─────────────────────────────┤            │
│              │                             │            │
│              │   [B] SHOP INFO             │            │
│              │   Shop | Placement | Tier   │            │
│              │   (3-column grid)           │            │
│              │                             │            │
│              │   [C] AD PREVIEW            │            │
│              │   Title + Status Badge      │            │
│              │   Banner Image (max 320px)  │            │
│              │   Announcement Message      │            │
│              │   Content | SKU             │            │
│              │   Start Date | End Date     │            │
│              │   Duration: {n} days        │            │
│              │                             │            │
│              │   [D] FEE & PAYMENT INFO    │            │
│              │   Daily Rate | Duration     │            │
│              │   ─────────────────         │            │
│              │   Total Fee | Fee Paid      │            │
│              │   Payment Status Badge      │            │
│              │   Paid on {date}            │            │
│              │   Fee locked notice         │            │
│              │                             │            │
│              │   [E] REJECTION REASON      │            │
│              │   (shown for rejected ads)  │            │
│              │                             │            │
│              │   [F] REJECTION INPUT       │            │
│              │   (shown after Reject btn)  │            │
│              │   Textarea + char count     │            │
│              │                             │            │
│              │   [G] ACTION BUTTONS        │            │
│              │   [Cancel] [Reject]         │            │
│              │   OR [Cancel] [Back]        │            │
│              │         [Confirm Reject]    │            │
│              │   OR [Close] (read-only)    │            │
│              └─────────────────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

#### Bulk Reject Confirmation Modal Layout
```text
┌─────────────────────────────────────────────────────────┐
│                    MODAL OVERLAY                        │
│              ┌─────────────────────────────┐            │
│              │   ⚠ (red circle icon)      │            │
│              │   "Bulk Reject Ads"         │            │
│              │   "You are about to reject  │            │
│              │    {n} advertisements."     │            │
│              ├─────────────────────────────┤            │
│              │   Refund notice text        │            │
│              │                             │            │
│              │   Rejection reason *        │            │
│              │   Textarea + char count     │            │
│              │                             │            │
│              │   [Cancel] [Confirm Reject] │            │
│              └─────────────────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

#### Bulk Approve Confirmation Modal Layout
```text
┌─────────────────────────────────────────────────────────┐
│                    MODAL OVERLAY                        │
│              ┌─────────────────────────────┐            │
│              │   ⚠ (green circle icon)     │            │
│              │   "Bulk Approve Ads"        │            │
│              │   "You are about to approve │            │
│              │    {n} advertisements."     │            │
│              ├─────────────────────────────┤            │
│              │   [Cancel] [Confirm Approve]│            │
│              └─────────────────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

#### Package & Fee Management Layout (`/admin/ads/packages`)
```text
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [A] PAGE HEADER                     │   │
│  │   Title: "Package & Fee Management"             │   │
│  │   Subtitle: "Configure advertising fees by       │   │
│  │              placement and tier"                 │   │
│  │   [← Back to Ads] [View History]                │   │
│  │                     [+ Create Fee Setting]       │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [B] FEE SETTINGS TABLE              │   │
│  │   Placement | Tier | Daily Rate | Duration       │   │
│  │   Total Fee | Max Ads | Status | Actions         │   │
│  │   [Edit] [Deactivate/Reactivate] (sticky right)  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Fee Change History Layout (`/admin/ads/fee-history`)
```text
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [A] PAGE HEADER                     │   │
│  │   Title: "Fee Change History"                   │   │
│  │   Subtitle: "Audit trail of fee setting changes" │   │
│  │   [← Back to Packages]                           │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [B] FILTER BAR                      │   │
│  │   [Month ▼] [Placement ▼] [Tier ▼]              │   │
│  │   {n} selected | [Clear] [🗑 Delete]             │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │   Current month protection notice                │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [C] HISTORY TABLE                   │   │
│  │   ☐ | Date | Placement | Tier | Old Rate        │   │
│  │   New Rate | Changed By | Reason | [🗑]          │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [D] PAGINATION                      │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Revenue Analytics Layout (`/admin/ads/analytics`)
```text
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [A] PAGE HEADER                     │   │
│  │   Title: "Revenue Analytics"                    │   │
│  │   Subtitle: "Revenue overview from approved     │   │
│  │              advertisements"                     │   │
│  │   [← Back to Ads]                                │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [B] FILTER CONTROLS                 │   │
│  │   [Date Range From/To] [Placement ▼] [Tier ▼]   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [C] SUMMARY METRICS (5 cards)      │   │
│  │   Total Revenue | Total Ads Approved             │   │
│  │   Total Fees Collected | Avg Revenue Per Ad      │   │
│  │   Total Refunds                                  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [D] CHARTS                          │   │
│  │   ┌─────────────────┐ ┌─────────────────┐        │   │
│  │   │ Revenue by      │ │ Revenue by      │        │   │
│  │   │ Placement [Pie] │ │ Tier [Pie]      │        │   │
│  │   └─────────────────┘ └─────────────────┘        │   │
│  │   ┌─────────────────────────────────────┐        │   │
│  │   │ Revenue Trend [Line]                │        │   │
│  │   └─────────────────────────────────────┘        │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [E] DATA TABLES                     │   │
│  │   ┌─────────────────┐ ┌─────────────────┐        │   │
│  │   │ Ads by          │ │ Ads by          │        │   │
│  │   │ Placement       │ │ Tier            │        │   │
│  │   └─────────────────┘ └─────────────────┘        │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Export Reports Layout (`/admin/ads/export`)
```text
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [A] PAGE HEADER                     │   │
│  │   Title: "Export Reports"                       │   │
│  │   Subtitle: "Generate CSV reports for           │   │
│  │              advertisements and fee history"     │   │
│  │   [← Back to Ads]                                │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [B] REPORT TYPE SELECTION           │   │
│  │   ┌──────────┐ ┌──────────┐ ┌──────────┐        │   │
│  │   │ Ad       │ │Submission│ │ Fee      │        │   │
│  │   │Performance│ │ History  │ │ History  │        │   │
│  │   └──────────┘ └──────────┘ └──────────┘        │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [C] EXPORT CONFIGURATION            │   │
│  │   [Date Range] [Placement ▼] [Tier ▼]           │   │
│  │   [Status ▼] [Shop search...] [Format: CSV]     │   │
│  │   Helper text                                    │   │
│  │   [Generate Report]                              │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Responsive Layout Breakpoints (レスポンシブ対応)

| Breakpoint | Min Width | Layout Behavior |
| :--- | :--- | :--- |
| Mobile (default) | 0px | Stacked layout, full-width filters, tables scroll horizontally |
| `sm:` | 640px | Filter bar wraps, pagination splits left/right, modal max-widths apply |
| `md:` | 768px | Fee Settings: Duration column visible; Fee History: Old Rate column visible |
| `lg:` | 1024px | Analytics/Export: 2-column chart/table grids; Fee History: Changed By column visible; Fee Settings: Max Ads column visible |
| `xl:` | 1280px | Ad List: Placement column visible; Fee History: Reason column visible |

---

## 4. Item Definitions (画面項目定義)

### 4.1 Section [A]: Page Header — Ad List (ページヘッダー — 広告リスト)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 1 | `lblAdsTitle` | Page Title | Static Label (`<h1>`) | String | — | Visible. Text: "Advertisement Management" | — | i18n key: `admin.ads.list.title` | `text-2xl font-bold tracking-tight sm:text-3xl`. |
| 2 | `lblAdsSubtitle` | Page Subtitle | Static Label (`<p>`) | String | — | Visible. Text: "Review merchant ads and manage advertising fees" | — | i18n key: `admin.ads.list.subtitle` | `text-muted-foreground`. |
| 3 | `badgePendingCount` | Pending Count Badge | Badge | Integer | — | Populated on load. Text: "{count} pending advertisement(s)" | — | `COUNT(advertisements WHERE approval_status = 'pending')` | Amber badge (`bg-amber-100 text-amber-800`). i18n key: `admin.ads.list.pendingCount`. |
| 4 | `btnManagePackages` | Manage Packages Button | Button (`outline`, `size="sm"`) | — | — | Visible. Text: "Manage Packages" with LayoutGrid icon | — | — | Navigates to `/admin/ads/packages`. i18n key: `admin.ads.list.managePackages`. |
| 5 | `btnRevenueAnalytics` | Revenue Analytics Button | Button (`outline`, `size="sm"`) | — | — | Visible. Text: "Revenue Analytics" with BarChart3 icon | — | — | Navigates to `/admin/ads/analytics`. i18n key: `admin.ads.list.revenueAnalytics`. |
| 6 | `btnExport` | Export Button | Button (`outline`, `size="sm"`) | — | — | Visible. Text: "Export" with Download icon | — | — | Navigates to `/admin/ads/export`. i18n key: `common.actions.export`. |

### 4.2 Section [B]: Filter Bar — Ad List (フィルターバー — 広告リスト)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 7 | `txtShopSearch` | Shop Search Input | Input (`text`) with Search icon | String | No | Empty. Placeholder: "Search shop..." | Debounced 300ms | — | i18n key: `admin.ads.list.filters.searchShop`. `h-9 w-full pl-8 sm:w-40`. |
| 8 | `selStatusFilter` | Status Filter | Select | Enum | No | Default: "All Status" | Options: All Status, Pending, Approved, Rejected | — | i18n key: `admin.ads.list.filters.allStatuses` / `admin.ads.status.{status}`. `h-9 w-full sm:w-32`. |
| 9 | `selPlacementFilter` | Placement Filter | Select | Enum | No | Default: "All Placements" | Options: All Placements, Search Page Banner, Recommendation Page Banner, Checkout Page Banner, Product Detail Page Banner | — | i18n key: `admin.ads.list.filters.allPlacements` / `admin.ads.placement.{placement}`. `h-9 w-full sm:w-40`. |
| 10 | `selTierFilter` | Tier Filter | Select | Enum | No | Default: "All Tiers" | Options: All Tiers, Basic, Standard, Premium | — | i18n key: `admin.ads.list.filters.allTiers` / `admin.ads.tier.{tier}`. `h-9 w-full sm:w-32`. |
| 11 | `dateRangeFilter` | Date Range Filter | DateRangePicker (From/To date inputs) | Date Range | No | Empty | Valid date range; From > To auto-corrects | — | i18n keys: `admin.ads.dateRange.from`, `admin.ads.dateRange.to`. Labels hidden (`hideLabels`). |
| 12 | `btnRefreshFilters` | Refresh Filters Button | Button (`outline`, `size="sm"`) | — | — | Visible. Text: "Refresh" with RefreshCw icon | — | — | Resets all filters to default. i18n key: `admin.ads.list.filters.reset`. |

### 4.3 Section [C]: Ads Table (広告テーブル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 13 | `chkSelectAllAds` | Select All Checkbox | Checkbox | Boolean | No | Unchecked. Only visible when pending ads exist. | — | — | Toggles all pending row checkboxes. Disabled when no pending ads. i18n key: `admin.ads.list.selectAll`. |
| 14 | `chkSelectAd` | Select Ad Checkbox | Checkbox | Boolean | No | Per-row. Unchecked. Disabled for non-pending ads. | — | — | Enables bulk action bar. i18n key: `admin.ads.list.selectAdvertisement`. |
| 15 | `lblShopName` | Shop Name | Static Label | String | — | Populated from DB | — | `shops.name` | `font-semibold text-foreground`. Max width 110px, truncated. |
| 16 | `lblAdTitle` | Ad Title | Static Label | String | — | Populated from DB | — | `advertisements.title` | `text-foreground`. Max width 120px, truncated. Shows NEW badge when highlighted. |
| 17 | `lblPlacement` | Placement | Static Label | String | — | Populated from DB | — | `advertisements.placement` | Localized via `admin.ads.placement.{placement}`. Hidden below `xl:`. Max width 120px, truncated. |
| 18 | `badgeTier` | Tier | TierBadge | Enum | — | Populated from DB | — | `advertisements.tier` | Basic=gray, Standard=blue, Purple=purple. i18n key: `admin.ads.tier.{tier}`. |
| 19 | `badgeAdStatus` | Ad Status Badge | StatusBadge | Enum | — | Pending=amber, Approved=green, Rejected=red | — | `advertisements.approval_status` | i18n key: `admin.ads.status.{status}`. |
| 20 | `badgePaymentStatus` | Payment Status Badge | PaymentBadge | Enum | — | Completed=green, Pending=amber, Refunded=gray | — | `advertisements.payment_status` | i18n key: `admin.ads.status.{status}`. |
| 21 | `lblFee` | Fee | Static Label | Decimal | — | Formatted with `formatPrice()` or "—" | — | `advertisements.payment_amount` | `text-right font-semibold tabular-nums`. |
| 22 | `lblSubmittedAt` | Submitted Date | Static Label | Date | — | Formatted as YYYY-MM-DD via `formatIsoDate()` | — | `advertisements.created_at` | `tabular-nums whitespace-nowrap`. |
| 23 | `lblSchedule` | Schedule | Static Label | String | — | "Sep 1 ~ Sep 14" via `formatScheduleRange()` | — | `advertisements.starts_at`, `advertisements.expires_at` | Month + day format, no year. |
| 24 | `btnReviewAd` | Review Button | Button (`outline`, `size="sm"`) with Pencil icon | — | — | Visible only for pending ads | — | — | Opens Ad Review Modal (editable). i18n key: `admin.ads.list.reviewAdvertisement`. |
| 25 | `btnViewAd` | View Button | Button (`outline`, `size="sm"`) with Eye icon | — | — | Visible only for non-pending ads | — | — | Opens Ad Review Modal (read-only). i18n key: `admin.ads.list.viewAdvertisement`. |
| 26 | `rowHighlight` | Row Highlight | CSS decoration | — | — | Purple inset outline on highlighted row | — | — | Triggered by `?highlightAdId=` URL param. Auto-scrolls to row. NEW badge pulses. |

### 4.4 Section [D]: Bulk Action Bar (一括操作バー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 27 | `lblSelectedCount` | Selected Count Text | Static Label | String | — | "{count} ads selected" | — | — | i18n key: `admin.ads.bulk.selectedCount`. `text-sm font-medium`. |
| 28 | `lblMaxSelection` | Max Selection Warning | Static Label (alert) | String | — | "Maximum 50 ads per bulk operation." | — | — | Shown when count > 50. `text-destructive`. i18n key: `admin.ads.bulk.maxSelection`. |
| 29 | `btnClearSelection` | Clear Button | Button (`ghost`, `size="sm"`) | — | No | Visible. Text: "Clear" | — | — | Deselects all. i18n key: `common.filters.clear`. |
| 30 | `btnBulkApprove` | All Approve Button | Button (`size="sm"`) | — | No | Disabled when count > 50 | — | — | Opens Bulk Approve Modal. i18n key: `admin.ads.bulk.approveAll`. |
| 31 | `btnBulkReject` | All Reject Button | Button (`destructive`, `size="sm"`) | — | No | Disabled when count > 50 | — | — | Opens Bulk Reject Modal. i18n key: `admin.ads.bulk.rejectAll`. |

### 4.5 Section [E]: Pagination — Ad List (ページネーション — 広告リスト)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 32 | `pagAds` | Ads Pagination | Pagination | — | — | Page 1, default limit 10 | — | API response `meta.total`, `meta.totalPages` | Page size selector: 10, 20, 50, 100. "Showing page {page} of {totalPages}". Prev/Next text buttons with page number chips. |

### 4.6 Section [A]: Ad Review Modal Header (広告レビューモーダルヘッダー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 33 | `lblReviewAdTitle` | Modal Title | DialogTitle | String | — | "Review Advertisement" (editable) or "View Advertisement" (read-only) | — | i18n key: `admin.ads.reviewModal.reviewTitle` / `admin.ads.reviewModal.viewTitle` | `sm:max-w-2xl`. |
| 34 | `lblReviewAdDescription` | Modal Description | DialogDescription | String | — | "Advertisement by {shopName}" or "Loading advertisement details..." | — | i18n key: `admin.ads.reviewModal.advertisementBy` / `admin.ads.reviewModal.loadingDetails` | — |

### 4.7 Section [B]: Shop Info in Review Modal (レビューモーダル内ショップ情報)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 35 | `lblReviewShopName` | Shop Name | Static Label | String | — | Populated from DB | — | `shops.name` | `font-medium`. |
| 36 | `lblReviewPlacement` | Placement | Static Label | String | — | Localized placement name | — | `advertisements.placement` | `font-medium`. |
| 37 | `badgeReviewTier` | Tier | TierBadge | Enum | — | Populated from DB | — | `advertisements.tier` | Standard tier badge colors. |

### 4.8 Section [C]: Ad Preview in Review Modal (レビューモーダル内広告プレビュー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 38 | `lblAdTitle` | Ad Title | Static Label | String | — | Populated from DB | — | `advertisements.title` | `text-sm font-medium`. |
| 39 | `badgeAdStatus` | Status Badge | StatusBadge | Enum | — | Populated from DB | — | `advertisements.approval_status` | Standard status badge colors. |
| 40 | `imgAdBanner` | Ad Banner Image | Image | URL | — | Ad banner image or "No banner image" | — | `advertisements.image_url` | `max-h-[320px] w-full object-contain`. |
| 41 | `lblAdAnnouncement` | Announcement | Static Label | String | — | Populated from DB (conditional) | — | `advertisements.announcement_message` | `text-sm font-medium`. |
| 42 | `lblAdContent` | Content | Static Label (`<p>`) | Text | — | Populated from DB (conditional) | — | `advertisements.content` | `text-sm text-muted-foreground`. |
| 43 | `lblAdSku` | SKU | Static Label | String | — | Populated from DB (conditional) | — | `advertisements.sku` | `text-sm text-primary`. |
| 44 | `lblStartDate` | Start Date | Static Label | Date | — | Formatted via `formatDate()` | — | `advertisements.starts_at` | `MMM d, yyyy` format. |
| 45 | `lblEndDate` | End Date | Static Label | Date | — | Formatted via `formatDate()` | — | `advertisements.expires_at` | `MMM d, yyyy` format. |
| 46 | `lblAdDuration` | Duration | Static Label | String | — | "{count} days" | — | Computed from `advertisements.starts_at` and `advertisements.expires_at` | i18n key: `admin.ads.reviewModal.durationDays`. |

### 4.9 Section [D]: Fee & Payment Info in Review Modal (レビューモーダル内料金・決済情報)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 47 | `lblDailyRateDisplay` | Daily Rate | Static Label | Decimal | — | Formatted with `formatPrice()` | — | `ad_fee_settings.daily_rate` (locked at purchase) | Fee Locking Rule. |
| 48 | `lblDurationDisplay` | Duration | Static Label | String | — | "{count} days" | — | `ad_fee_settings.duration_days` (locked at purchase) | Fee Locking Rule. |
| 49 | `lblTotalFeeDisplay` | Total Fee | Static Label | Decimal | — | Formatted with `formatPrice()` | — | Computed: `daily_rate × duration_days` (locked at purchase) | **Fee Calculation Display Rule.** Fee Locking Rule. |
| 50 | `lblFeePaid` | Fee Paid | Static Label | Decimal | — | Formatted with `formatPrice()` | — | `ad_payments.amount` | Fee Locking Rule. |
| 51 | `badgePaymentStatusDetail` | Payment Status | PaymentBadge | Enum | — | Completed=green, Pending=amber, Refunded=gray | — | `ad_payments.payment_status` | — |
| 52 | `lblPaidOn` | Paid On Date | Static Label | String | — | "Paid on {date}" (conditional) | — | `ad_payments.paid_at` | `text-xs text-muted-foreground`. |
| 53 | `lblFeeLockedNotice` | Fee Locked Notice | Static Label | String | — | "Fee locked at purchase time; later fee setting changes do not affect this advertisement." | — | — | i18n key: `admin.ads.reviewModal.feeLockedNotice`. `text-xs text-muted-foreground`. |

### 4.10 Section [E]: Rejection Reason Display (却下理由表示)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 54 | `lblRejectionReason` | Rejection Reason | Static Label | Text | — | Visible only when status ≠ pending AND rejectionReason exists | — | `advertisements.rejection_reason` | Red border box (`border-red-200 bg-red-50/50`). |

### 4.11 Section [F]: Rejection Reason Input (却下理由入力)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 55 | `txtRejectionReason` | Rejection Reason Textarea | Textarea | String(1000) | Conditional | Empty. Placeholder: "Describe why this advertisement is rejected..." | MaxLength: 1000. Required when rejecting. | — | `rows={4}`. Character count shown. i18n key: `admin.ads.reviewModal.rejectionPlaceholder`. |
| 56 | `lblRejectionRequired` | Rejection Required Error | Static Label (alert) | String | — | "Rejection reason is required." | — | — | Shown when textarea empty. `text-destructive`. i18n key: `admin.ads.reviewModal.rejectionRequired`. |

### 4.12 Section [G]: Review Modal Action Buttons (レビューモーダルアクションボタン)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 57 | `btnCancelReview` | Cancel Button | Button (`outline`) | — | — | Visible. Text: "Cancel" | — | — | i18n key: `common.cancel`. Disabled while processing. |
| 58 | `btnApproveAd` | Approve Button | Button (`default`) | — | — | Visible. Text: "Approve" / "Approving..." | — | — | i18n key: `admin.ads.reviewModal.approve` / `admin.ads.reviewModal.approving`. Only for PENDING ads. |
| 59 | `btnRejectAd` | Reject Button | Button (`destructive`) | — | — | Visible. Text: "Reject" | — | — | i18n key: `admin.ads.reviewModal.reject`. Shows rejection input. Only for PENDING ads. |
| 60 | `btnBackFromReject` | Back Button | Button (`ghost`) | — | — | Visible in reject mode. Text: "Back" | — | — | i18n key: `common.back`. Returns to approve/reject choice. |
| 61 | `btnConfirmReject` | Confirm Reject Button | Button (`destructive`) | — | — | Visible in reject mode. Text: "Confirm Reject" / "Rejecting..." | — | — | i18n key: `admin.ads.reviewModal.confirmReject` / `admin.ads.reviewModal.rejecting`. Disabled when reason empty. |
| 62 | `btnCloseReview` | Close Button | Button (`outline`) | — | — | Visible for read-only or non-pending. Text: "Close" | — | — | i18n key: `common.close`. |

### 4.13 Section [A]: Bulk Reject Modal Header (一括却下モーダルヘッダー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 63 | `lblBulkRejectTitle` | Modal Title | DialogTitle | String | — | "Bulk Reject Ads" | — | i18n key: `admin.ads.bulkReject.title` | AlertTriangle icon in red circle (`bg-destructive/10`). |
| 64 | `lblBulkRejectDescription` | Modal Description | DialogDescription | String | — | "You are about to reject {count} advertisements." | — | i18n key: `admin.ads.bulkReject.description` | — |

### 4.14 Section [B]: Bulk Reject Warning & Reason (一括却下警告・理由)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 65 | `lblBulkRejectRefundNotice` | Refund Notice | Static Label (alert) | String | — | "The advertisements will not be displayed. Paid amounts will be refunded in full (100%) according to the refund rule." | — | i18n key: `admin.ads.bulkReject.refundNotice` | `text-sm text-destructive`. |
| 66 | `txtBulkRejectReason` | Rejection Reason Textarea | Textarea | String(1000) | Yes | Empty. Placeholder: "Describe why these advertisements are rejected..." | MaxLength: 1000. Required. | — | `rows={4}`. Character count shown. i18n key: `admin.ads.bulkReject.reasonPlaceholder`. |
| 67 | `lblBulkRejectReasonRequired` | Reason Required Error | Static Label (alert) | String | — | "Rejection reason is required." | — | — | Shown when textarea empty. i18n key: `admin.ads.bulkReject.reasonRequired`. |

### 4.15 Section [C]: Bulk Reject Action Buttons (一括却下アクションボタン)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 68 | `btnCancelBulkReject` | Cancel Button | Button (`outline`) | — | — | Visible. Text: "Cancel" | — | — | i18n key: `common.cancel`. |
| 69 | `btnConfirmBulkReject` | Confirm Reject Button | Button (`destructive`) | — | — | Visible. Text: "Confirm Reject" / "Rejecting..." | — | — | i18n key: `admin.ads.bulkReject.confirm` / `admin.ads.bulkReject.rejecting`. Disabled when reason empty. |

### 4.16 Section [A]: Bulk Approve Modal Header (一括承認モーダルヘッダー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 70 | `lblBulkApproveTitle` | Modal Title | DialogTitle | String | — | "Bulk Approve Ads" | — | i18n key: `admin.ads.bulkApprove.title` | AlertTriangle icon in green circle (`bg-green-100`). |
| 71 | `lblBulkApproveDescription` | Modal Description | DialogDescription | String | — | "You are about to approve {count} advertisements." | — | i18n key: `admin.ads.bulkApprove.description` | — |

### 4.17 Section [B]: Bulk Approve Action Buttons (一括承認アクションボタン)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 72 | `btnCancelBulkApprove` | Cancel Button | Button (`outline`) | — | — | Visible. Text: "Cancel" | — | — | i18n key: `common.cancel`. |
| 73 | `btnConfirmBulkApprove` | Confirm Approve Button | Button (`default`) | — | — | Visible. Text: "Confirm Approve" / "Approving..." | — | — | i18n key: `admin.ads.bulkApprove.confirm` / `admin.ads.bulkApprove.approving`. |

### 4.18 Section [A]: Page Header — Package & Fee Management (ページヘッダー — パッケージ＆Fee管理)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 74 | `lblPackagesTitle` | Page Title | Static Label (`<h1>`) | String | — | Visible. Text: "Package & Fee Management" | — | i18n key: `admin.ads.packages.title` | `text-2xl font-bold tracking-tight sm:text-3xl`. |
| 75 | `lblPackagesSubtitle` | Page Subtitle | Static Label (`<p>`) | String | — | Visible. Text: "Configure advertising fees by placement and tier" | — | i18n key: `admin.ads.packages.subtitle` | `text-muted-foreground`. |
| 76 | `btnBackToAdsFromPackages` | Back to Ads Button | Button (`outline`, `size="sm"`) | — | — | Visible. Text: "Back to Ads" with ArrowLeft icon | — | — | Navigates to `/admin/ads`. i18n key: `admin.ads.packages.backToAds`. |
| 77 | `btnViewFeeHistory` | View History Button | Button (`outline`, `size="sm"`) | — | — | Visible. Text: "View History" with History icon | — | — | Navigates to `/admin/ads/fee-history`. i18n key: `admin.ads.packages.viewHistory`. |
| 78 | `btnCreateFeeSetting` | Create Fee Setting Button | Button (`size="sm"`) | — | — | Visible. Text: "Create Fee Setting" with Plus icon. Disabled when all 12 packages created. | — | — | Opens Create Fee Modal. Tooltip: "All 12 placement & tier packages have been created". i18n key: `admin.ads.packages.createFeeSetting`. |

### 4.19 Section [B]: Fee Settings Table (Fee設定テーブル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 79 | `lblFeePlacement` | Placement | Static Label | String | — | Localized placement name | — | `ad_fee_settings.placement` | `font-medium text-foreground`. Max width 140px, truncated. |
| 80 | `badgeFeeTier` | Tier | TierBadge | Enum | — | Populated from DB | — | `ad_fee_settings.tier` | Basic=gray, Standard=blue, Premium=purple. |
| 81 | `lblDailyRate` | Daily Rate | Static Label | Decimal | — | Formatted with `formatPrice()` | — | `ad_fee_settings.daily_rate` | `text-right font-semibold tabular-nums`. |
| 82 | `lblDuration` | Duration | Static Label | Integer | — | "{count} day(s)" | — | `ad_fee_settings.duration_days` | Hidden below `md:`. `tabular-nums`. |
| 83 | `lblTotalFee` | Total Fee | Static Label | Decimal | — | Formatted with `formatPrice()` | — | Computed: `daily_rate × duration_days` | **Fee Calculation Display Rule.** `text-right font-semibold tabular-nums`. |
| 84 | `lblMaxAds` | Max Ads | Static Label | Integer | — | Populated from DB | — | `ad_fee_settings.max_ads` | Hidden below `lg:`. `tabular-nums`. |
| 85 | `badgeFeeStatus` | Status Badge | FeeStatusBadge | Enum | — | Active=green, Inactive=gray | — | `ad_fee_settings.is_active` | i18n key: `admin.ads.status.active` / `admin.ads.status.inactive`. |
| 86 | `btnEditFee` | Edit Button | Button (`outline`, `size="sm"`) with Pencil icon | — | — | Visible | — | — | Opens Edit Fee Modal. |
| 87 | `btnDeactivateFee` | Deactivate Button | Button (`ghost`, `size="sm"`, destructive styling) with Ban icon | — | — | Visible for active settings | — | — | Opens Deactivate Confirmation Modal. |
| 88 | `btnReactivateFee` | Reactivate Button | Button (`outline`, `size="sm"`) with RotateCcw icon | — | — | Visible for inactive settings | — | — | Opens Reactivate Confirmation Modal. |

### 4.20 Section [A]: Create Fee Modal (Fee作成モーダル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 89 | `lblCreateFeeTitle` | Modal Title | DialogTitle | String | — | "Create Fee Setting" | — | i18n key: `admin.ads.fee.create.title` | `sm:max-w-3xl`. |
| 90 | `lblCreateFeeDescription` | Modal Description | DialogDescription | String | — | "Define a new advertising fee for a placement and tier combination." | — | i18n key: `admin.ads.fee.create.description` | — |
| 91 | `selCreatePlacement` | Placement Select | Select | Enum | Yes | Empty. Placeholder: "Select placement" | Options: Search Page Banner, Recommendation Page Banner, Checkout Page Banner, Product Detail Page Banner. Taken combinations disabled. | — | i18n key: `admin.ads.fee.create.placementLabel`. |
| 92 | `selCreateTier` | Tier Select | Select | Enum | Yes | Empty. Placeholder: "Select tier" | Options: Basic, Standard, Premium. Taken combinations disabled. | — | i18n key: `admin.ads.fee.create.tierLabel`. |
| 93 | `numCreateDailyRate` | Daily Rate Input | Input (`number`) | Decimal | Yes | Empty. Placeholder: "0.00" | `step="0.01" min="0.01"`. Must be > 0. | — | i18n key: `admin.ads.fee.dailyRateLabel`. |
| 94 | `numCreateDuration` | Duration Input | Input (`number`) | Integer | Yes | Empty. Placeholder: "7" | `step="1" min="1"`. Must be integer ≥ 1. | — | i18n key: `admin.ads.fee.durationLabel`. |
| 95 | `numCreateMaxAds` | Max Ads Input | Input (`number`) | Integer | Yes | Empty. Placeholder: "5" | `step="1" min="1"`. Must be integer ≥ 1. | — | i18n key: `admin.ads.fee.maxAdsLabel`. |
| 96 | `lblCreateTotalFeePreview` | Total Fee Preview | Static Label | Decimal | — | Computed: Daily Rate × Duration | — | Computed from inputs | **Fee Calculation Display Rule.** Updates in real-time. i18n key: `admin.ads.fee.totalFeeLabel`. |
| 97 | `dateCreateEffectiveFrom` | Effective From | Input (`date`) | Date | Yes | Default: today | Valid date required | — | i18n key: `admin.ads.fee.effectiveFromLabel`. |
| 98 | `btnCreateFee` | Create Button | Button (`submit`, `default`) | — | — | Visible. Text: "Create Fee Setting" / "Creating..." | — | — | i18n key: `admin.ads.fee.create.submit` / `admin.ads.fee.create.creating`. Disabled when combination taken. |
| 99 | `btnCancelCreateFee` | Cancel Button | Button (`outline`) | — | — | Visible. Text: "Cancel" | — | — | i18n key: `common.cancel`. |

### 4.21 Section [A]: Edit Fee Modal (Fee編集モーダル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 100 | `lblEditFeeTitle` | Modal Title | DialogTitle | String | — | "Edit Fee Setting" | — | i18n key: `admin.ads.fee.edit.title` | `sm:max-w-lg`. |
| 101 | `lblEditFeeDescription` | Modal Description | DialogDescription | String | — | "{Placement} - {Tier}" | — | i18n keys: `admin.ads.placement.{placement}`, `admin.ads.tier.{tier}` | — |
| 102 | `lblEditCurrentFee` | Current Fee Info | Static Label | String | — | Placement name + Tier badge + "Current total fee: {amount}" | — | — | i18n key: `admin.ads.fee.edit.currentTotalFee`. |
| 103 | `numEditDailyRate` | Daily Rate Input | Input (`number`) | Decimal | Yes | Populated from current value | `step="0.01" min="0.01"`. Must be > 0. | `ad_fee_settings.daily_rate` | i18n key: `admin.ads.fee.dailyRateLabel`. |
| 104 | `numEditDuration` | Duration Input | Input (`number`) | Integer | Yes | Populated from current value | `step="1" min="1"`. Must be integer ≥ 1. | `ad_fee_settings.duration_days` | i18n key: `admin.ads.fee.durationLabel`. |
| 105 | `numEditMaxAds` | Max Ads Input | Input (`number`) | Integer | Yes | Populated from current value | `step="1" min="1"`. Must be integer ≥ 1. | `ad_fee_settings.max_ads` | i18n key: `admin.ads.fee.maxAdsLabel`. |
| 106 | `lblEditTotalFeePreview` | Total Fee Preview | Static Label | Decimal | — | Computed: Daily Rate × Duration | — | Computed from inputs | **Fee Calculation Display Rule.** Updates in real-time. |
| 107 | `dateEditEffectiveFrom` | Effective From | Input (`date`) | Date | Yes | Default: today | Valid date required | — | i18n key: `admin.ads.fee.effectiveFromLabel`. |
| 108 | `txtEditChangeReason` | Change Reason | Textarea | String(1000) | Yes | Empty. Placeholder: "Why is this fee setting changed?" | MaxLength: 1000. Required. | — | i18n key: `admin.ads.fee.edit.changeReasonPlaceholder`. `rows={3}`. |
| 109 | `btnSaveFee` | Save Button | Button (`submit`, `default`) | — | — | Visible. Text: "Save Changes" / "Saving..." | — | — | i18n key: `admin.ads.fee.edit.submit` / `admin.ads.fee.edit.saving`. |
| 110 | `btnCancelEditFee` | Cancel Button | Button (`outline`) | — | — | Visible. Text: "Cancel" | — | — | i18n key: `common.cancel`. |

### 4.22 Section [A]: Deactivate Fee Modal (Fee無効化モーダル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 111 | `lblDeactivateFeeTitle` | Modal Title | DialogTitle | String | — | "Deactivate Fee Setting" | — | i18n key: `admin.ads.fee.deactivate.title` | AlertTriangle icon in red circle. `sm:max-w-md`. |
| 112 | `lblDeactivateFeeDescription` | Modal Description | DialogDescription | String | — | "{Placement} - {Tier}" | — | — | — |
| 113 | `lblDeactivateFeeInfo` | Fee Info | Static Label | String | — | Placement name + Tier badge | — | — | — |
| 114 | `lblDeactivateFeeNotice` | Notice | Static Label | String | — | "Existing advertisements are unaffected by this change (fee locking rule). New purchases for this placement and tier will not be available while inactive." | — | i18n key: `admin.ads.fee.deactivate.notice` | Fee Locking Rule. |
| 115 | `txtDeactivateChangeReason` | Change Reason | Textarea | String(1000) | Yes | Empty. Placeholder: "Why is this fee setting deactivated?" | MaxLength: 1000. Required. | — | i18n key: `admin.ads.fee.deactivate.changeReasonPlaceholder`. `rows={4}`. |
| 116 | `btnConfirmDeactivateFee` | Confirm Deactivate Button | Button (`destructive`) | — | — | Visible. Text: "Confirm Deactivate" / "Deactivating..." | — | — | i18n key: `admin.ads.fee.deactivate.confirm` / `admin.ads.fee.deactivate.deactivating`. |
| 117 | `btnCancelDeactivateFee` | Cancel Button | Button (`outline`) | — | — | Visible. Text: "Cancel" | — | — | i18n key: `common.cancel`. |

### 4.23 Section [A]: Reactivate Fee Modal (Fee再有効化モーダル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 118 | `lblReactivateFeeTitle` | Modal Title | DialogTitle | String | — | "Reactivate Fee Setting" | — | i18n key: `admin.ads.fee.reactivate.title` | RotateCcw icon in green circle. `sm:max-w-md`. |
| 119 | `lblReactivateFeeDescription` | Modal Description | DialogDescription | String | — | "{Placement} - {Tier}" | — | — | — |
| 120 | `lblReactivateFeeInfo` | Fee Info | Static Label | String | — | Placement name + Tier badge | — | — | — |
| 121 | `lblReactivateFeeNotice` | Notice | Static Label | String | — | "This package will become available to merchants again with its current rate and configuration." | — | i18n key: `admin.ads.fee.reactivate.notice` | — |
| 122 | `txtReactivateChangeReason` | Change Reason | Textarea | String(1000) | No | Empty. Placeholder: "Why is this fee setting reactivated?" | MaxLength: 1000. Optional. | — | i18n key: `admin.ads.fee.reactivate.changeReasonPlaceholder`. `rows={4}`. |
| 123 | `btnConfirmReactivateFee` | Confirm Reactivate Button | Button (`default`) | — | — | Visible. Text: "Confirm Reactivate" / "Reactivating..." | — | — | i18n key: `admin.ads.fee.reactivate.confirm` / `admin.ads.fee.reactivate.reactivating`. |
| 124 | `btnCancelReactivateFee` | Cancel Button | Button (`outline`) | — | — | Visible. Text: "Cancel" | — | — | i18n key: `common.cancel`. |

### 4.24 Section [A]: Page Header — Fee Change History (ページヘッダー — Fee変更履歴)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 125 | `lblFeeHistoryTitle` | Page Title | Static Label (`<h1>`) | String | — | Visible. Text: "Fee Change History" | — | i18n key: `admin.ads.feeHistory.title` | `text-2xl font-bold tracking-tight sm:text-3xl`. |
| 126 | `lblFeeHistorySubtitle` | Page Subtitle | Static Label (`<p>`) | String | — | Visible. Text: "Audit trail of fee setting changes" | — | i18n key: `admin.ads.feeHistory.subtitle` | `text-muted-foreground`. |
| 127 | `btnBackToPackages` | Back to Packages Button | Button (`outline`, `size="sm"`) | — | — | Visible. Text: "Back to Packages" with ArrowLeft icon | — | — | Navigates to `/admin/ads/packages`. i18n key: `admin.ads.feeHistory.backToPackages`. |

### 4.25 Section [B]: Filter Bar — Fee History (フィルターバー — Fee履歴)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 128 | `selHistoryMonthFilter` | Month Filter | Select | String (YYYY-MM) | No | Default: "All months" | Options: All months + last 12 months | — | i18n key: `admin.ads.feeHistory.allMonths`. `h-9 w-full sm:w-44`. |
| 129 | `selHistoryPlacementFilter` | Placement Filter | Select | Enum | No | Default: "All placements" | Options: All placements, Search Page Banner, Recommendation Page Banner, Checkout Page Banner, Product Detail Page Banner | — | i18n key: `admin.ads.feeHistory.allPlacements`. `h-9 w-full sm:w-44`. |
| 130 | `selHistoryTierFilter` | Tier Filter | Select | Enum | No | Default: "All tiers" | Options: All tiers, Basic, Standard, Premium | — | i18n key: `admin.ads.feeHistory.allTiers`. `h-9 w-full sm:w-36`. |
| 131 | `lblHistorySelectedCount` | Selected Count | Static Label | String | — | "{count} selected" | — | — | Shown when records selected. i18n key: `admin.ads.feeHistory.selectedCount`. |
| 132 | `lblHistoryMaxBulk` | Max Bulk Warning | Static Label (alert) | String | — | "Maximum 50 records per bulk operation" | — | — | Shown when count > 50. i18n key: `admin.ads.feeHistory.maxBulkSelection`. |
| 133 | `btnClearHistorySelection` | Clear Button | Button (`ghost`, `size="sm"`) | — | No | Visible. Text: "Clear" | — | — | i18n key: `common.filters.clear`. |
| 134 | `btnDeleteSelectedHistory` | Delete Selected Button | Button (`destructive`, `size="sm"`) with Trash2 icon | — | No | Disabled when 0 selected or > 50 selected | — | — | Opens Delete Fee History Modal. i18n key: `admin.ads.feeHistory.deleteSelectedLabel`. |
| 135 | `lblCurrentMonthProtected` | Protection Notice | Static Label | String | — | "Fee change history from the current month is protected and cannot be deleted. Select records from previous months to remove them." | — | i18n key: `admin.ads.feeHistory.currentMonthProtected` | `text-sm text-muted-foreground`. |

### 4.26 Section [C]: History Table (履歴テーブル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 136 | `chkSelectAllHistory` | Select All Checkbox | Checkbox | Boolean | No | Unchecked. Only for deletable rows. | — | — | i18n key: `admin.ads.feeHistory.selectAllLabel`. |
| 137 | `chkSelectHistoryRow` | Select Row Checkbox | Checkbox | Boolean | No | Per-row. Unchecked. Disabled for current month. | — | — | i18n key: `admin.ads.feeHistory.selectRowLabel`. |
| 138 | `lblHistoryDate` | Date | Static Label | DateTime | — | Formatted via `formatDate()` | — | `ad_fee_history.created_at` | `whitespace-nowrap tabular-nums`. |
| 139 | `lblHistoryPlacement` | Placement | Static Label | String | — | Localized placement name | — | `ad_fee_history.placement` | `font-medium text-foreground`. Max width 120px, truncated. |
| 140 | `badgeHistoryTier` | Tier | TierBadge | Enum | — | Populated from DB | — | `ad_fee_history.tier` | Standard tier badge colors. |
| 141 | `lblOldRate` | Old Rate | Static Label | Decimal | — | Formatted with `formatPrice()` or "—" | — | `ad_fee_history.old_daily_rate` | Hidden below `md:`. `tabular-nums`. |
| 142 | `lblNewRate` | New Rate | Static Label | Decimal | — | Formatted with `formatPrice()` | — | `ad_fee_history.new_daily_rate` | `text-right font-semibold tabular-nums`. |
| 143 | `lblChangedBy` | Changed By | Static Label | String | — | Populated from DB | — | `ad_fee_history.changedByName` | Hidden below `lg:`. `whitespace-nowrap`. |
| 144 | `lblReason` | Reason | Static Label | Text | — | Populated from DB or "—" | — | `ad_fee_history.change_reason` | Hidden below `xl:`. Max width 240px, truncated. |
| 145 | `btnDeleteHistoryRow` | Delete Row Button | Button (`ghost`, `size="sm"`) with Trash2 icon | — | — | Disabled for current month or when deleting | — | — | Opens Delete Fee History Modal for single row. i18n key: `admin.ads.feeHistory.deleteRecordLabel`. |

### 4.27 Section [D]: Delete Fee History Modal (履歴削除モーダル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 146 | `lblDeleteHistoryTitle` | Modal Title | DialogTitle | String | — | "Delete Fee Change History" | — | i18n key: `admin.ads.fee.deleteHistory.title` | AlertTriangle icon in red circle. `sm:max-w-md`. |
| 147 | `lblDeleteHistoryDescription` | Modal Description | DialogDescription | String | — | Singular: "Permanently delete this history record..." / Plural: "Permanently delete these {count} history records..." | — | i18n key: `admin.ads.fee.deleteHistory.descriptionOne` / `admin.ads.fee.deleteHistory.descriptionCount` | — |
| 148 | `lblDeleteHistoryWarning` | Warning | Static Label | String | — | "This action cannot be undone. History records created in the current month are protected and will always be rejected." | — | i18n key: `admin.ads.fee.deleteHistory.warning` | — |
| 149 | `btnConfirmDeleteHistory` | Confirm Delete Button | Button (`destructive`) | — | — | Visible. Text: "Confirm Delete" / "Deleting..." | — | — | i18n key: `admin.ads.fee.deleteHistory.confirm` / `admin.ads.fee.deleteHistory.deleting`. |
| 150 | `btnCancelDeleteHistory` | Cancel Button | Button (`outline`) | — | — | Visible. Text: "Cancel" | — | — | i18n key: `common.cancel`. |

### 4.28 Section [D]: Pagination — Fee History (ページネーション — Fee履歴)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 151 | `pagFeeHistory` | Fee History Pagination | Pagination | — | — | Page 1, default limit 10 | — | API response `meta.total`, `meta.totalPages` | Page size selector: 10, 20, 50, 100. |

### 4.29 Section [A]: Page Header — Revenue Analytics (ページヘッダー — 収益分析)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 152 | `lblAnalyticsTitle` | Page Title | Static Label (`<h1>`) | String | — | Visible. Text: "Revenue Analytics" | — | i18n key: `admin.ads.analytics.title` | `text-2xl font-bold tracking-tight sm:text-3xl`. |
| 153 | `lblAnalyticsSubtitle` | Page Subtitle | Static Label (`<p>`) | String | — | Visible. Text: "Revenue overview from approved advertisements" | — | i18n key: `admin.ads.analytics.subtitle` | `text-muted-foreground`. |
| 154 | `btnBackToAdsFromAnalytics` | Back to Ads Button | Button (`outline`, `size="sm"`) | — | — | Visible. Text: "Back to Ads" with ArrowLeft icon | — | — | Navigates to `/admin/ads`. i18n key: `admin.ads.analytics.backToAds`. |

### 4.30 Section [B]: Filter Controls — Analytics (フィルターコントロール — 分析)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 155 | `dateRangeAnalytics` | Date Range Picker | DateRangePicker | Date Range | Yes | Default: last 30 days (daysAgoIso(29) to todayIso()) | Valid date range | — | i18n key: `admin.ads.analytics.dateRange`. |
| 156 | `selAnalyticsPlacement` | Placement Filter | MultiSelect | Array[Enum] | No | Empty (all placements) | Options: Search Page Banner, Recommendation Page Banner, Checkout Page Banner, Product Detail Page Banner | — | i18n key: `admin.ads.analytics.placementsLabel`. |
| 157 | `selAnalyticsTier` | Tier Filter | MultiSelect | Array[Enum] | No | Empty (all tiers) | Options: Basic, Standard, Premium | — | i18n key: `admin.ads.analytics.tiersLabel`. |

### 4.31 Section [C]: Summary Metrics (サマリーメトリクス)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 158 | `statTotalRevenue` | Total Revenue Card | Card | Decimal | — | Populated on load | — | `SUM(ad_payments.amount)` where `payment_status = 'completed'`, `approval_status = 'approved'`, within date range | `formatPrice()`. |
| 159 | `statTotalAdsApproved` | Total Ads Approved Card | Card | Integer | — | Populated on load | — | Count of approved ads with completed payments in date range | — |
| 160 | `statTotalFeesCollected` | Total Fees Collected Card | Card | Decimal | — | Populated on load | — | `SUM(ad_payments.amount)` for completed payments linked to approved ads in date range | `formatPrice()`. |
| 161 | `statAvgRevenuePerAd` | Avg Revenue Per Ad Card | Card | Decimal | — | Populated on load | — | `totalRevenue / totalAds` | `formatPrice()`. |
| 162 | `statTotalRefunds` | Total Refunds Card | Card | Decimal | — | Populated on load | — | `SUM(refunded amounts)` | `formatPrice()`. |

### 4.32 Section [D]: Charts (チャート)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 163 | `chartRevenueByPlacement` | Revenue by Placement Chart | SVG Pie Chart with legend | Array | — | Populated on load | — | `GROUP BY ad_fee_settings.placement` | 8-color palette. Shows percentage and revenue per segment. `lg:grid-cols-2`. |
| 164 | `chartRevenueByTier` | Revenue by Tier Chart | SVG Pie Chart with legend | Array | — | Populated on load | — | `GROUP BY ad_fee_settings.tier` | 8-color palette. `lg:grid-cols-2`. |
| 165 | `chartRevenueTrend` | Revenue Trend Chart | SVG Line Chart (Catmull-Rom curve) | Array | — | Populated on load | — | `GROUP BY payment date` | Blue gradient fill. Hover tooltip with date + revenue. ~6 x-axis labels. |

### 4.33 Section [E]: Data Tables — Analytics (データテーブル — 分析)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 166 | `tblAdsByPlacement` | Ads by Placement Table | Table | Array | — | Populated on load | — | `GROUP BY ad_fee_settings.placement` | Columns: Placement / Tier, Ad Count, Total Revenue, Avg CTR. `lg:grid-cols-2`. |
| 167 | `tblAdsByTier` | Ads by Tier Table | Table | Array | — | Populated on load | — | `GROUP BY ad_fee_settings.tier` | Columns: Placement / Tier, Ad Count, Total Revenue, Avg CTR. `lg:grid-cols-2`. |

### 4.34 Section [A]: Page Header — Export Reports (ページヘッダー — エクスポートレポート)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 168 | `lblExportTitle` | Page Title | Static Label (`<h1>`) | String | — | Visible. Text: "Export Reports" | — | i18n key: `admin.ads.export.title` | `text-2xl font-bold tracking-tight sm:text-3xl`. |
| 169 | `lblExportSubtitle` | Page Subtitle | Static Label (`<p>`) | String | — | Visible. Text: "Generate CSV reports for advertisements and fee history" | — | i18n key: `admin.ads.export.subtitle` | `text-muted-foreground`. |
| 170 | `btnBackToAdsFromExport` | Back to Ads Button | Button (`outline`, `size="sm"`) | — | — | Visible. Text: "Back to Ads" with ArrowLeft icon | — | — | Navigates to `/admin/ads`. i18n key: `admin.ads.export.backToAds`. |

### 4.35 Section [B]: Report Type Selection (レポート種別選択)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 171 | `cardAdPerformance` | Ad Performance Card | Card (selectable) | — | — | Default selected. Label: "Ad Performance". Description: "Approved ads with payments and stats" | — | — | BarChart3 icon. `sm:grid-cols-3`. |
| 172 | `cardSubmissionHistory` | Submission History Card | Card (selectable) | — | — | Selectable. Label: "Submission History". Description: "All advertisement submissions" | — | — | History icon. |
| 173 | `cardFeeHistory` | Fee History Card | Card (selectable) | — | — | Selectable. Label: "Fee History". Description: "Fee setting change records" | — | — | FileDown icon. |

### 4.36 Section [C]: Export Configuration (エクスポート設定)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 174 | `dateRangeExport` | Date Range Picker | DateRangePicker | Date Range | Yes | Default: last 30 days | Valid date range; end < start shows error | — | i18n key: `admin.ads.export.dateRange`. |
| 175 | `selExportPlacement` | Placement Filter | MultiSelect | Array[Enum] | No | Empty (all placements) | Options: Search Page Banner, Recommendation Page Banner, Checkout Page Banner, Product Detail Page Banner | — | i18n key: `admin.ads.export.placementsLabel`. |
| 176 | `selExportTier` | Tier Filter | MultiSelect | Array[Enum] | No | Empty (all tiers) | Options: Basic, Standard, Premium | — | i18n key: `admin.ads.export.tiersLabel`. |
| 177 | `selExportStatus` | Status Filter | MultiSelect | Array[Enum] | No | Empty (all statuses) | Options: Pending, Approved, Rejected | — | i18n key: `admin.ads.export.statusesLabel`. |
| 178 | `txtExportShopFilter` | Shop Filter | Input (`text`) | String | No | Empty. Placeholder: "Search shop..." | — | — | i18n key: `admin.ads.export.searchShopPlaceholder`. `h-9 w-full sm:w-48`. |
| 179 | `selExportFormat` | Format Selection | Select | Enum | Yes | Default: CSV (disabled) | Options: CSV only | — | i18n key: `admin.ads.export.format`. `h-9 w-full sm:w-28`. |
| 180 | `lblExportHelperText` | Helper Text | Static Label | String | — | "Generates and downloads a CSV report. Filters are optional; leave empty to include all." | — | i18n key: `admin.ads.export.helperText` | `text-xs text-muted-foreground`. |
| 181 | `lblExportInvalidRange` | Invalid Range Error | Static Label (alert) | String | — | "End date must be after start date." | — | — | Shown when date range invalid. i18n key: `admin.ads.export.invalidRange`. |
| 182 | `btnGenerateExport` | Generate Report Button | Button (`default`) with Download icon | — | — | Visible. Text: "Generate Report" / "Generating..." | — | — | i18n key: `admin.ads.export.generateReport` / `admin.ads.export.generating`. Disabled when invalid range or generating. |

---

## 5. Item Behaviors & Event Specifications (各項目における挙動・イベント仕様)

### 5.1 Ad List Page Behaviors

| Item ID | Trigger Event | Processing Logic | Exception Handling |
| :--- | :--- | :--- | :--- |
| `btnManagePackages` | Click | Navigate to `/admin/ads/packages`. | — |
| `btnRevenueAnalytics` | Click | Navigate to `/admin/ads/analytics`. | — |
| `btnExport` | Click | Navigate to `/admin/ads/export`. | — |
| `selStatusFilter` | Change | Update filters state, reset to page 1, re-fetch ad list. | — |
| `selPlacementFilter` | Change | Update filters state, reset to page 1, re-fetch ad list. | — |
| `selTierFilter` | Change | Update filters state, reset to page 1, re-fetch ad list. | — |
| `txtShopSearch` | Input (debounced 300ms) | Update filters state with trimmed shop name, re-fetch ad list. | — |
| `dateRangeFilter` | Change | Update filters state with date range, re-fetch ad list. | — |
| `btnRefreshFilters` | Click | Reset all filters to default (empty), clear shop input. | — |
| `chkSelectAllAds` | Change | Toggle all pending row checkboxes. Update bulk action bar count. | — |
| `chkSelectAd` | Change | Toggle row checkbox. Update bulk action bar count. | — |
| `btnReviewAd` | Click | Fetch ad details by ID. Open Ad Review Modal (editable). | — |
| `btnViewAd` | Click | Fetch ad details by ID. Open Ad Review Modal (read-only). | — |
| `btnBulkApprove` | Click | Open Bulk Approve Modal. | — |
| `btnBulkReject` | Click | Open Bulk Reject Modal. | — |
| `btnClearSelection` | Click | Deselect all checkboxes. Hide bulk action bar. | — |
| `pagAds` | Page change | Update page state, re-fetch ad list. | — |
| `pagAds` | Limit change | Update limit state, reset to page 1, re-fetch ad list. | — |
| URL `?highlightAdId=` | Page load | Highlight row with purple outline, scroll to row, show NEW badge for 3 seconds. | — |

### 5.2 Ad Review Modal Behaviors

| Item ID | Trigger Event | Processing Logic | Exception Handling |
| :--- | :--- | :--- | :--- |
| `btnCancelReview` / `btnCloseReview` | Click / Escape | Close modal. | — |
| `btnApproveAd` | Click | Call approve mutation. Close modal on success. Show success toast. | Show error toast on failure. |
| `btnRejectAd` | Click | Show rejection input section (textarea + Back + Confirm Reject buttons). | — |
| `btnBackFromReject` | Click | Hide rejection input section. Return to Approve/Reject choice. | — |
| `btnConfirmReject` | Click | Validate reason not empty. Call reject mutation with reason. Close modal on success. Show success toast. | Show error toast on failure. Button disabled when reason empty. |
| `txtRejectionReason` | Input | Update rejection reason state. Show character count. | — |

### 5.3 Bulk Reject Modal Behaviors

| Item ID | Trigger Event | Processing Logic | Exception Handling |
| :--- | :--- | :--- | :--- |
| `btnCancelBulkReject` / Close | Click / Escape | Close modal. | — |
| `btnConfirmBulkReject` | Click | Validate reason not empty. Call bulk reject mutation with IDs and reason. Close modal on success. Show success toast. Clear selection. | Show error toast on failure. Button disabled when reason empty. |
| `txtBulkRejectReason` | Input | Update rejection reason state. Show character count. | — |

### 5.4 Bulk Approve Modal Behaviors

| Item ID | Trigger Event | Processing Logic | Exception Handling |
| :--- | :--- | :--- | :--- |
| `btnCancelBulkApprove` / Close | Click / Escape | Close modal. | — |
| `btnConfirmBulkApprove` | Click | Call bulk approve mutation with IDs. Close modal on success. Show success toast. Clear selection. | Show error toast on failure. |

### 5.5 Package & Fee Management Behaviors

| Item ID | Trigger Event | Processing Logic | Exception Handling |
| :--- | :--- | :--- | :--- |
| `btnBackToAdsFromPackages` | Click | Navigate to `/admin/ads`. | — |
| `btnViewFeeHistory` | Click | Navigate to `/admin/ads/fee-history`. | — |
| `btnCreateFeeSetting` | Click | Open Create Fee Modal. | — |
| `btnEditFee` | Click | Open Edit Fee Modal with fee setting data. | — |
| `btnDeactivateFee` | Click | Open Deactivate Fee Modal. | — |
| `btnReactivateFee` | Click | Open Reactivate Fee Modal. | — |
| `btnCreateFee` | Click | Validate all fields. Check uniqueness (placement+tier). Call create mutation. Close modal on success. Show success toast. | Show validation errors inline. Show error toast on failure. |
| `btnSaveFee` | Click | Validate all fields. Call update mutation. Close modal on success. Show success toast. | Show validation errors inline. Show error toast on failure. |
| `btnConfirmDeactivateFee` | Click | Validate reason. Call deactivate mutation. Close modal on success. Show success toast. | Show error toast on failure. |
| `btnConfirmReactivateFee` | Click | Call reactivate mutation. Close modal on success. Show success toast. | Show error toast on failure. |

### 5.6 Fee Change History Behaviors

| Item ID | Trigger Event | Processing Logic | Exception Handling |
| :--- | :--- | :--- | :--- |
| `btnBackToPackages` | Click | Navigate to `/admin/ads/packages`. | — |
| `selHistoryMonthFilter` | Change | Update month filter, reset to page 1, clear selection, re-fetch. | — |
| `selHistoryPlacementFilter` | Change | Update placement filter, reset to page 1, clear selection, re-fetch. | — |
| `selHistoryTierFilter` | Change | Update tier filter, reset to page 1, clear selection, re-fetch. | — |
| `chkSelectAllHistory` | Change | Toggle all deletable row checkboxes. | — |
| `chkSelectHistoryRow` | Change | Toggle row checkbox. | — |
| `btnDeleteSelectedHistory` | Click | Open Delete Fee History Modal for selected IDs. | — |
| `btnDeleteHistoryRow` | Click | Open Delete Fee History Modal for single row ID. | — |
| `btnConfirmDeleteHistory` | Click | Call delete mutation with IDs. Close modal on success. Show success toast. Clear selection. | Show error toast on failure. |
| `btnClearHistorySelection` | Click | Deselect all checkboxes. | — |
| `pagFeeHistory` | Page change | Update page state, clear selection, re-fetch. | — |

### 5.7 Revenue Analytics Behaviors

| Item ID | Trigger Event | Processing Logic | Exception Handling |
| :--- | :--- | :--- | :--- |
| `btnBackToAdsFromAnalytics` | Click | Navigate to `/admin/ads`. | — |
| `dateRangeAnalytics` | Change | Update date range state, re-fetch analytics data. | — |
| `selAnalyticsPlacement` | Change | Update placement filter state, re-fetch analytics data. | — |
| `selAnalyticsTier` | Change | Update tier filter state, re-fetch analytics data. | — |
| `chartRevenueTrend` | Hover | Show tooltip with date and revenue at hovered point. | — |

### 5.8 Export Reports Behaviors

| Item ID | Trigger Event | Processing Logic | Exception Handling |
| :--- | :--- | :--- | :--- |
| `btnBackToAdsFromExport` | Click | Navigate to `/admin/ads`. | — |
| `cardAdPerformance` | Click | Set report type to `ad_performance`. | — |
| `cardSubmissionHistory` | Click | Set report type to `submission_history`. | — |
| `cardFeeHistory` | Click | Set report type to `fee_history`. | — |
| `btnGenerateExport` | Click | Validate date range. Call the report-specific export mutation. Show success toast. | Show error toast on failure. Button disabled when invalid range. |

---

## 6. Validation & Error Message Mapping (バリデーション及びエラーメッセージマッピング)

### 6.1 Ad Review Validation

| Field | Rule | Error Message (EN) | Error Message (JA) |
| :--- | :--- | :--- | :--- |
| `rejection_reason` | Required when rejecting | "Rejection reason is required." | "却下理由を入力してください。" |
| `rejection_reason` | MaxLength: 1000 | (enforced by maxLength) | — |

### 6.2 Bulk Reject Validation

| Field | Rule | Error Message (EN) | Error Message (JA) |
| :--- | :--- | :--- | :--- |
| `rejection_reason` | Required | "Rejection reason is required." | "却下理由を入力してください。" |
| `rejection_reason` | MaxLength: 1000 | (enforced by maxLength) | — |
| `ad_ids` | Min length: 1 | (button disabled when 0 selected) | — |
| `ad_ids` | Max length: 50 | "Maximum 50 ads per bulk operation." | "一括操作では広告を最大50件まで選択できます。" |

### 6.3 Fee Setting Validation

| Field | Rule | Error Message (EN) | Error Message (JA) |
| :--- | :--- | :--- | :--- |
| `placement` | Required, valid enum | "Placement is required" | "掲載枠を選択してください" |
| `tier` | Required, valid enum | "Tier is required" | "プランを選択してください" |
| `daily_rate` | Required, > 0 | "Daily rate must be greater than 0" | "日額料金は0より大きい値にしてください" |
| `duration_days` | Required, integer ≥ 1 | "Duration must be at least 1 day" | "期間は1日以上にしてください" |
| `max_ads` | Required, integer ≥ 1 | "Max ads must be at least 1" | "広告上限数は1以上にしてください" |
| `effective_from` | Required, valid date | "Effective date is required" | "適用開始日を入力してください" |
| `change_reason` | Required (edit/deactivate), MaxLength: 1000 | "Change reason is required" / "Change reason must not exceed 1000 characters" | "変更理由を入力してください" / "変更理由は1000文字以内で入力してください" |
| Uniqueness | No existing setting for placement+tier | "A fee setting already exists for this placement and tier." | "この掲載枠とプランの料金設定はすでに存在します。" |

### 6.4 Export Validation

| Field | Rule | Error Message (EN) | Error Message (JA) |
| :--- | :--- | :--- | :--- |
| `dateFrom` | Required | (button disabled) | — |
| `dateTo` | Required | (button disabled) | — |
| `dateRange` | End ≥ Start | "End date must be after start date." | "終了日は開始日より後の日付にしてください。" |
| `format` | Fixed: CSV | — | — |

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
| `lblPlacement` | `advertisements.placement` | VARCHAR(50) | Enum: `search_page_banner`, `recommendation_page_banner`, `checkout_page_banner`, `productDetail_page_banner` |
| `lblTier` | `advertisements.tier` | VARCHAR(20) | Enum: `basic`, `standard`, `premium` |
| `badgeAdStatus` | `advertisements.approval_status` | VARCHAR(20) | Enum: `pending`, `approved`, `rejected` |
| `badgePaymentStatus` | `advertisements.payment_status` | VARCHAR(20) | Enum: `pending`, `completed`, `refunded` |
| `lblSubmittedAt` | `advertisements.created_at` | TIMESTAMP | — |
| `lblFee` | `advertisements.payment_amount` | DECIMAL(10,2) | — |
| `imgAdBanner` | `advertisements.image_url` | TEXT | — |
| `lblAdAnnouncement` | `advertisements.announcement_message` | VARCHAR(500) | — |
| `lblAdContent` | `advertisements.content` | TEXT | — |
| `lblAdSku` | `advertisements.sku` | VARCHAR(100) | — |
| `lblAdSchedule` | `advertisements.starts_at`, `advertisements.expires_at` | TIMESTAMPTZ | — |
| `txtRejectionReason` | `advertisements.rejection_reason` | TEXT | — |

### 7.2 Ad Payments Table

| UI Element | DB Column | Type | Notes |
| :--- | :--- | :--- | :--- |
| `lblFeePaid` | `ad_payments.amount` | DECIMAL(10,2) | — |
| `badgePaymentStatusDetail` | `ad_payments.payment_status` | VARCHAR(20) | Enum: `pending`, `completed`, `refunded` |
| `lblPaidOn` | `ad_payments.paid_at` | TIMESTAMP | — |

### 7.3 Ad Fee Settings Table

| UI Element | DB Column | Type | Notes |
| :--- | :--- | :--- | :--- |
| `lblFeePlacement` | `ad_fee_settings.placement` | VARCHAR(50) | Enum: `search_page_banner`, `recommendation_page_banner`, `checkout_page_banner`, `productDetail_page_banner` |
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
| `lblOldRate` | `ad_fee_history.old_daily_rate` | DECIMAL(10,2) | — |
| `lblNewRate` | `ad_fee_history.new_daily_rate` | DECIMAL(10,2) | — |
| `lblChangedBy` | `ad_fee_history.changed_by` | UUID | FK → `users.id` |
| `lblReason` | `ad_fee_history.change_reason` | TEXT | — |

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
      "placement": "search_page_banner",
      "tier": "standard",
      "approvalStatus": "pending",
      "paymentStatus": "completed",
      "paymentAmount": 35.00,
      "imageUrl": "https://cdn.example.com/ads/banner1.jpg",
      "announcementMessage": "Summer Sale 50% Off",
      "content": "Description text...",
      "sku": "SKU-001",
      "startsAt": "2026-09-01T00:00:00.000Z",
      "expiresAt": "2026-09-07T23:59:59.999Z",
      "rejectionReason": null,
      "createdAt": "2026-08-25T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "totalPages": 15
  }
}
```

### 8.2 Ad Review Detail Response

```json
{
  "data": {
    "id": "clxAd001",
    "shopName": "Glow Skincare",
    "title": "Summer Sale Banner",
    "placement": "search_page_banner",
    "tier": "standard",
    "approvalStatus": "pending",
    "imageUrl": "https://cdn.example.com/ads/banner1.jpg",
    "announcementMessage": "Summer Sale 50% Off",
    "content": "Description text...",
    "sku": "SKU-001",
    "startsAt": "2026-09-01T00:00:00.000Z",
    "expiresAt": "2026-09-07T23:59:59.999Z",
    "rejectionReason": null,
    "feeInfo": {
      "dailyRate": 5.00,
      "durationDays": 7,
      "totalFee": 35.00
    },
    "paymentInfo": {
      "amount": 35.00,
      "paymentStatus": "completed",
      "paidAt": "2026-08-25T09:00:00.000Z"
    }
  }
}
```

### 8.3 Ad Approve Success Response

```json
{
  "data": {
    "id": "clxAd001",
    "approvalStatus": "approved",
    "approvedBy": "clxAdmin001",
    "approvedAt": "2026-08-26T12:00:00.000Z",
    "updatedAt": "2026-08-26T12:00:00.000Z"
  }
}
```

### 8.4 Ad Reject Success Response

```json
{
  "data": {
    "id": "clxAd001",
    "approvalStatus": "rejected",
    "rejectionReason": "Violates advertising policy",
    "updatedAt": "2026-08-26T12:00:00.000Z"
  }
}
```

### 8.5 Bulk Approve Success Response

```json
{
  "data": {
    "approved": 5,
    "failed": 0,
    "results": [
      { "id": "clxAd001", "approvalStatus": "approved" },
      { "id": "clxAd002", "approvalStatus": "approved" }
    ]
  }
}
```

### 8.6 Bulk Reject Success Response

```json
{
  "data": {
    "rejected": 5,
    "failed": 0,
    "refundsProcessed": 5,
    "results": [
      { "id": "clxAd001", "approvalStatus": "rejected", "refundStatus": "processed" },
      { "id": "clxAd002", "approvalStatus": "rejected", "refundStatus": "processed" }
    ]
  }
}
```

### 8.7 Fee Settings Success Response

```json
{
  "data": [
    {
      "id": "clxFee001",
      "placement": "search_page_banner",
      "tier": "standard",
      "dailyRate": 5.00,
      "durationDays": 7,
      "maxAds": 1,
      "totalFee": 35.00,
      "isActive": true,
      "createdAt": "2026-08-20T10:00:00.000Z"
    }
  ]
}
```

### 8.8 Revenue Analytics Success Response

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
        "placement": "search_page_banner",
        "placementName": "Search Page Banner",
        "adCount": 20,
        "revenue": 5500.00,
        "avgCtr": 0.032
      }
    ],
    "byTier": [
      {
        "tier": "premium",
        "tierName": "Premium",
        "adCount": 10,
        "revenue": 4500.00,
        "avgCtr": 0.041
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

### 8.9 Fee History Success Response

```json
{
  "data": [
    {
      "id": "clxFeeHist001",
      "placement": "search_page_banner",
      "tier": "standard",
      "oldDailyRate": 4.00,
      "newDailyRate": 5.00,
      "changedByName": "Admin User",
      "changeReason": "Annual rate adjustment",
      "createdAt": "2026-08-25T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 80,
    "totalPages": 8
  }
}
```

### 8.10 Delete Fee History Success Response

```json
{
  "data": {
    "deletedCount": 3
  }
}
```

### 8.11 Error Response (Standard)

```json
{
  "statusCode": 400,
  "message": ["placement must be one of the following values: search_page_banner, recommendation_page_banner, checkout_page_banner, productDetail_page_banner"],
  "error": "Bad Request",
  "timestamp": "2026-08-26T12:00:00.000Z",
  "path": "/api/v1/admin/ad-fees"
}
```

---

## 9. i18n Keys Reference (i18nキーリファレンス)

### 9.1 English (en) — Ad Management

| Key | Value |
| :--- | :--- |
| `admin.ads.list.title` | "Advertisement Management" |
| `admin.ads.list.subtitle` | "Review merchant ads and manage advertising fees" |
| `admin.ads.list.managePackages` | "Manage Packages" |
| `admin.ads.list.revenueAnalytics` | "Revenue Analytics" |
| `admin.ads.list.pendingCount_one` | "{{count}} pending advertisement" |
| `admin.ads.list.pendingCount_other` | "{{count}} pending advertisements" |
| `admin.ads.list.filters.searchShop` | "Search shop..." |
| `admin.ads.list.filters.allStatuses` | "All Status" |
| `admin.ads.list.filters.allPlacements` | "All Placements" |
| `admin.ads.list.filters.allTiers` | "All Tiers" |
| `admin.ads.list.filters.reset` | "Reset all filters" |
| `admin.ads.list.table.shop` | "Shop" |
| `admin.ads.list.table.title` | "Title" |
| `admin.ads.list.table.placement` | "Placement" |
| `admin.ads.list.table.tier` | "Tier" |
| `admin.ads.list.table.status` | "Status" |
| `admin.ads.list.table.payment` | "Payment" |
| `admin.ads.list.table.fee` | "Fee" |
| `admin.ads.list.table.submitted` | "Submitted" |
| `admin.ads.list.table.schedule` | "Schedule" |
| `admin.ads.list.table.actions` | "Actions" |
| `admin.ads.list.empty` | "No advertisements found." |
| `admin.ads.list.selectAll` | "Select all pending advertisements" |
| `admin.ads.list.reviewAdvertisement` | "Review {{title}}" |
| `admin.ads.list.viewAdvertisement` | "View {{title}}" |
| `admin.ads.list.newBadge` | "NEW" |
| `admin.ads.list.approveSuccess` | "Advertisement approved" |
| `admin.ads.list.rejectSuccess` | "Advertisement rejected" |
| `admin.ads.list.bulkApproved` | "{{count}} advertisements approved" |
| `admin.ads.list.bulkRejected` | "{{count}} advertisements rejected" |
| `admin.ads.bulk.selectedCount_one` | "{{count}} ad selected" |
| `admin.ads.bulk.selectedCount_other` | "{{count}} ads selected" |
| `admin.ads.bulk.maxSelection` | "Maximum 50 ads per bulk operation." |
| `admin.ads.bulk.approveAll` | "All Approve" |
| `admin.ads.bulk.rejectAll` | "All Reject" |
| `admin.ads.bulkApprove.title` | "Bulk Approve Ads" |
| `admin.ads.bulkApprove.description_other` | "You are about to approve {{count}} advertisements." |
| `admin.ads.bulkApprove.confirm` | "Confirm Approve" |
| `admin.ads.bulkApprove.approving` | "Approving..." |
| `admin.ads.bulkReject.title` | "Bulk Reject Ads" |
| `admin.ads.bulkReject.description_other` | "You are about to reject {{count}} advertisements." |
| `admin.ads.bulkReject.refundNotice` | "The advertisements will not be displayed. Paid amounts will be refunded in full (100%) according to the refund rule." |
| `admin.ads.bulkReject.reason` | "Rejection reason" |
| `admin.ads.bulkReject.reasonPlaceholder` | "Describe why these advertisements are rejected..." |
| `admin.ads.bulkReject.reasonRequired` | "Rejection reason is required." |
| `admin.ads.bulkReject.confirm` | "Confirm Reject" |
| `admin.ads.bulkReject.rejecting` | "Rejecting..." |
| `admin.ads.reviewModal.reviewTitle` | "Review Advertisement" |
| `admin.ads.reviewModal.viewTitle` | "View Advertisement" |
| `admin.ads.reviewModal.advertisementBy` | "Advertisement by {{shopName}}" |
| `admin.ads.reviewModal.shop` | "Shop" |
| `admin.ads.reviewModal.placement` | "Placement" |
| `admin.ads.reviewModal.tier` | "Tier" |
| `admin.ads.reviewModal.announcement` | "Announcement" |
| `admin.ads.reviewModal.skuLabel` | "SKU: {{sku}}" |
| `admin.ads.reviewModal.startDate` | "Start date" |
| `admin.ads.reviewModal.endDate` | "End date" |
| `admin.ads.reviewModal.duration` | "Duration" |
| `admin.ads.reviewModal.durationDays_other` | "{{count}} days" |
| `admin.ads.reviewModal.dailyRate` | "Daily rate" |
| `admin.ads.reviewModal.totalFee` | "Total fee" |
| `admin.ads.reviewModal.feePaid` | "Fee paid" |
| `admin.ads.reviewModal.paymentStatus` | "Payment status" |
| `admin.ads.reviewModal.paidOn` | "Paid on {{date}}" |
| `admin.ads.reviewModal.feeLockedNotice` | "Fee locked at purchase time; later fee setting changes do not affect this advertisement." |
| `admin.ads.reviewModal.rejectionReason` | "Rejection reason" |
| `admin.ads.reviewModal.rejectionPlaceholder` | "Describe why this advertisement is rejected..." |
| `admin.ads.reviewModal.rejectionRequired` | "Rejection reason is required." |
| `admin.ads.reviewModal.reject` | "Reject" |
| `admin.ads.reviewModal.confirmReject` | "Confirm Reject" |
| `admin.ads.reviewModal.rejecting` | "Rejecting..." |
| `admin.ads.reviewModal.approve` | "Approve" |
| `admin.ads.reviewModal.approving` | "Approving..." |
| `admin.ads.packages.title` | "Package & Fee Management" |
| `admin.ads.packages.subtitle` | "Configure advertising fees by placement and tier" |
| `admin.ads.packages.backToAds` | "Back to Ads" |
| `admin.ads.packages.viewHistory` | "View History" |
| `admin.ads.packages.createFeeSetting` | "Create Fee Setting" |
| `admin.ads.packages.allCreatedTooltip` | "All 12 placement & tier packages have been created" |
| `admin.ads.fee.table.header.placement` | "Placement" |
| `admin.ads.fee.table.header.tier` | "Tier" |
| `admin.ads.fee.table.header.dailyRate` | "Daily Rate" |
| `admin.ads.fee.table.header.duration` | "Duration" |
| `admin.ads.fee.table.header.totalFee` | "Total Fee" |
| `admin.ads.fee.table.header.maxAds` | "Max Ads" |
| `admin.ads.fee.table.header.status` | "Status" |
| `admin.ads.fee.table.header.actions` | "Actions" |
| `admin.ads.fee.table.empty` | "No fee settings found." |
| `admin.ads.fee.create.title` | "Create Fee Setting" |
| `admin.ads.fee.create.description` | "Define a new advertising fee for a placement and tier combination." |
| `admin.ads.fee.create.placementLabel` | "Placement" |
| `admin.ads.fee.create.tierLabel` | "Tier" |
| `admin.ads.fee.create.submit` | "Create Fee Setting" |
| `admin.ads.fee.create.creating` | "Creating..." |
| `admin.ads.fee.dailyRateLabel` | "Daily rate" |
| `admin.ads.fee.durationLabel` | "Duration (days)" |
| `admin.ads.fee.maxAdsLabel` | "Max ads" |
| `admin.ads.fee.totalFeeLabel` | "Total fee (Daily rate x Duration)" |
| `admin.ads.fee.effectiveFromLabel` | "Effective from" |
| `admin.ads.fee.changeReasonLabel` | "Change reason" |
| `admin.ads.fee.edit.title` | "Edit Fee Setting" |
| `admin.ads.fee.edit.changeReasonPlaceholder` | "Why is this fee setting changed?" |
| `admin.ads.fee.edit.currentTotalFee` | "Current total fee: {{amount}}" |
| `admin.ads.fee.edit.submit` | "Save Changes" |
| `admin.ads.fee.edit.saving` | "Saving..." |
| `admin.ads.fee.deactivate.title` | "Deactivate Fee Setting" |
| `admin.ads.fee.deactivate.notice` | "Existing advertisements are unaffected by this change (fee locking rule). New purchases for this placement and tier will not be available while inactive." |
| `admin.ads.fee.deactivate.changeReasonPlaceholder` | "Why is this fee setting deactivated?" |
| `admin.ads.fee.deactivate.confirm` | "Confirm Deactivate" |
| `admin.ads.fee.deactivate.deactivating` | "Deactivating..." |
| `admin.ads.fee.reactivate.title` | "Reactivate Fee Setting" |
| `admin.ads.fee.reactivate.notice` | "This package will become available to merchants again with its current rate and configuration." |
| `admin.ads.fee.reactivate.optional` | "(optional)" |
| `admin.ads.fee.reactivate.changeReasonPlaceholder` | "Why is this fee setting reactivated?" |
| `admin.ads.fee.reactivate.confirm` | "Confirm Reactivate" |
| `admin.ads.fee.reactivate.reactivating` | "Reactivating..." |
| `admin.ads.fee.deleteHistory.title` | "Delete Fee Change History" |
| `admin.ads.fee.deleteHistory.descriptionOne` | "Permanently delete this history record from the fee change history." |
| `admin.ads.fee.deleteHistory.descriptionCount` | "Permanently delete these {{count}} history records from the fee change history." |
| `admin.ads.fee.deleteHistory.warning` | "This action cannot be undone. History records created in the current month are protected and will always be rejected." |
| `admin.ads.fee.deleteHistory.confirm` | "Confirm Delete" |
| `admin.ads.fee.deleteHistory.deleting` | "Deleting..." |
| `admin.ads.fee.validation.placementRequired` | "Placement is required" |
| `admin.ads.fee.validation.tierRequired` | "Tier is required" |
| `admin.ads.fee.validation.dailyRate` | "Daily rate must be greater than 0" |
| `admin.ads.fee.validation.duration` | "Duration must be at least 1 day" |
| `admin.ads.fee.validation.maxAds` | "Max ads must be at least 1" |
| `admin.ads.fee.validation.effectiveFrom` | "Effective date is required" |
| `admin.ads.fee.validation.changeReasonRequired` | "Change reason is required" |
| `admin.ads.fee.validation.changeReasonMax` | "Change reason must not exceed 1000 characters" |
| `admin.ads.feeHistory.title` | "Fee Change History" |
| `admin.ads.feeHistory.subtitle` | "Audit trail of fee setting changes" |
| `admin.ads.feeHistory.backToPackages` | "Back to Packages" |
| `admin.ads.feeHistory.month` | "Month" |
| `admin.ads.feeHistory.allMonths` | "All months" |
| `admin.ads.feeHistory.placement` | "Placement" |
| `admin.ads.feeHistory.allPlacements` | "All placements" |
| `admin.ads.feeHistory.tier` | "Tier" |
| `admin.ads.feeHistory.allTiers` | "All tiers" |
| `admin.ads.feeHistory.date` | "Date" |
| `admin.ads.feeHistory.oldRate` | "Old Rate" |
| `admin.ads.feeHistory.newRate` | "New Rate" |
| `admin.ads.feeHistory.changedBy` | "Changed By" |
| `admin.ads.feeHistory.reason` | "Reason" |
| `admin.ads.feeHistory.actions` | "Actions" |
| `admin.ads.feeHistory.selectAllLabel` | "Select all deletable fee change history" |
| `admin.ads.feeHistory.deleteRecordLabel` | "Delete fee change history from {{date}}" |
| `admin.ads.feeHistory.empty` | "No fee change history found." |
| `admin.ads.feeHistory.maxBulkSelection` | "Maximum 50 records per bulk operation" |
| `admin.ads.feeHistory.deleteSelectedLabel` | "Delete selected fee change history" |
| `admin.ads.feeHistory.currentMonthProtected` | "Fee change history from the current month is protected and cannot be deleted. Select records from previous months to remove them." |
| `admin.ads.feeHistory.deleteSuccessSingle` | "Fee change history deleted" |
| `admin.ads.feeHistory.deleteSuccessCount_other` | "{{count}} fee change history records deleted" |
| `admin.ads.feeHistory.deleteFailed` | "Failed to delete fee change history" |
| `admin.ads.feeHistory.selectedCount_other` | "{{count}} records selected" |
| `admin.ads.analytics.title` | "Revenue Analytics" |
| `admin.ads.analytics.subtitle` | "Revenue overview from approved advertisements" |
| `admin.ads.analytics.backToAds` | "Back to Ads" |
| `admin.ads.analytics.dateRange` | "Date range" |
| `admin.ads.analytics.placement` | "Placement" |
| `admin.ads.analytics.placementsLabel` | "placements" |
| `admin.ads.analytics.tier` | "Tier" |
| `admin.ads.analytics.tiersLabel` | "tiers" |
| `admin.ads.analytics.tables.placementTier` | "Placement / Tier" |
| `admin.ads.analytics.tables.adCount` | "Ad Count" |
| `admin.ads.analytics.tables.totalRevenue` | "Total Revenue" |
| `admin.ads.analytics.tables.averageCtr` | "Avg CTR" |
| `admin.ads.analytics.tables.noData` | "No data" |
| `admin.ads.analytics.tables.byPlacementTitle` | "Ads by Placement" |
| `admin.ads.analytics.tables.byTierTitle` | "Ads by Tier" |
| `admin.ads.analytics.charts.noData` | "No data" |
| `admin.ads.analytics.charts.revenueByPlacement` | "Revenue by Placement" |
| `admin.ads.analytics.charts.revenueByTier` | "Revenue by Tier" |
| `admin.ads.analytics.charts.revenueTrend` | "Revenue Trend" |
| `admin.ads.analytics.charts.dailyRevenue` | "Daily revenue over the selected period" |
| `admin.ads.export.title` | "Export Reports" |
| `admin.ads.export.subtitle` | "Generate CSV reports for advertisements and fee history" |
| `admin.ads.export.backToAds` | "Back to Ads" |
| `admin.ads.export.dateRange` | "Date range" |
| `admin.ads.export.format` | "Format" |
| `admin.ads.export.generateReport` | "Generate Report" |
| `admin.ads.export.generating` | "Generating..." |
| `admin.ads.export.helperText` | "Generates and downloads a CSV report. Filters are optional; leave empty to include all." |
| `admin.ads.export.invalidRange` | "End date must be after start date." |
| `admin.ads.export.placement` | "Placement" |
| `admin.ads.export.placementsLabel` | "placements" |
| `admin.ads.export.searchShopPlaceholder` | "Search shop..." |
| `admin.ads.export.shop` | "Shop" |
| `admin.ads.export.status` | "Status" |
| `admin.ads.export.statusesLabel` | "statuses" |
| `admin.ads.export.tier` | "Tier" |
| `admin.ads.export.tiersLabel` | "tiers" |
| `admin.ads.export.generateSuccess` | "Report generated and download started" |
| `admin.ads.export.generateFailed` | "Failed to generate report" |
| `admin.ads.pagination.rows` | "Rows:" |
| `admin.ads.pagination.rowsPerPage` | "Rows per page" |
| `admin.ads.pagination.showingPage` | "Showing page {{page}} of {{totalPages}}" |
| `admin.ads.pagination.previous` | "Prev" |
| `admin.ads.pagination.next` | "Next" |
| `admin.ads.pagination.goToPage` | "Go to page {{page}}" |
| `admin.ads.dateRange.from` | "From" |
| `admin.ads.dateRange.to` | "To" |
| `admin.ads.dateRange.clear` | "Clear date range" |
| `admin.ads.multiSelect.select` | "Select {{label}}" |
| `admin.ads.multiSelect.all` | "All {{label}}" |
| `admin.ads.multiSelect.selectedCount_other` | "{{count}} selected" |
| `admin.ads.multiSelect.clear` | "Clear selection" |
| `admin.ads.placement.search_page_banner` | "Search Page Banner" |
| `admin.ads.placement.recommendation_page_banner` | "Recommendation Page Banner" |
| `admin.ads.placement.checkout_page_banner` | "Checkout Page Banner" |
| `admin.ads.placement.productDetail_page_banner` | "Product Detail Page Banner" |
| `admin.ads.tier.basic` | "Basic" |
| `admin.ads.tier.standard` | "Standard" |
| `admin.ads.tier.premium` | "Premium" |
| `admin.ads.status.pending` | "Pending" |
| `admin.ads.status.approved` | "Approved" |
| `admin.ads.status.rejected` | "Rejected" |
| `admin.ads.status.completed` | "Completed" |
| `admin.ads.status.refunded` | "Refunded" |
| `admin.ads.status.active` | "Active" |
| `admin.ads.status.inactive` | "Inactive" |
| `common.cancel` | "Cancel" |
| `common.close` | "Close" |
| `common.back` | "Back" |
| `common.loading` | "Loading..." |
| `common.actions.export` | "Export" |
| `common.filters.clear` | "Clear" |

---

## 10. Shared Components (共有コンポーネント)

### 10.1 Badge Component

| Item | Details |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/badge.tsx` |
| **Variants** | `default`, `secondary`, `destructive`, `outline` |
| **Usage** | Status badges, payment badges, tier badges, fee status badges |

### 10.2 Dialog Component

| Item | Details |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/dialog.tsx` |
| **Usage** | Ad Review Modal, Bulk Approve/Reject Modals, Fee Create/Edit/Deactivate/Reactivate Modals, Delete Fee History Modal |

### 10.3 Select Component

| Item | Details |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/select.tsx` |
| **Usage** | Status/Placement/Tier filters, Month filter, Format selector |

### 10.4 MultiSelect Component

| Item | Details |
| :--- | :--- |
| **Location** | `frontend/src/features/admin/advertisement-management/components/MultiSelect.tsx` |
| **Usage** | Analytics placement/tier filters, Export placement/tier/status filters |

### 10.5 DateRangePicker Component

| Item | Details |
| :--- | :--- |
| **Location** | `frontend/src/features/admin/advertisement-management/components/DateRangePicker.tsx` |
| **Usage** | Ad list date filter, Analytics date range, Export date range |

### 10.6 Pagination Component

| Item | Details |
| :--- | :--- |
| **Location** | `frontend/src/features/admin/advertisement-management/components/Pagination.tsx` |
| **Usage** | Ad list pagination, Fee history pagination |

### 10.7 Badge Color Reference

| Badge Type | Status | Light Mode | Dark Mode |
| :--- | :--- | :--- | :--- |
| StatusBadge | Pending | `bg-amber-100 text-amber-800` | `bg-amber-500/15 text-amber-400` |
| StatusBadge | Approved | `bg-green-100 text-green-800` | `bg-green-500/15 text-green-400` |
| StatusBadge | Rejected | `bg-red-100 text-red-800` | `bg-red-500/15 text-red-400` |
| PaymentBadge | Completed | `bg-green-100 text-green-800` | `bg-green-500/15 text-green-400` |
| PaymentBadge | Pending | `bg-amber-100 text-amber-800` | `bg-amber-500/15 text-amber-400` |
| PaymentBadge | Refunded | `bg-gray-100 text-gray-800` | `bg-gray-500/15 text-gray-300` |
| TierBadge | Basic | `bg-gray-100 text-gray-800` | `bg-gray-500/15 text-gray-300` |
| TierBadge | Standard | `bg-blue-100 text-blue-800` | `bg-blue-500/15 text-blue-400` |
| TierBadge | Premium | `bg-purple-100 text-purple-800` | `bg-purple-500/15 text-purple-400` |
| FeeStatusBadge | Active | `bg-green-100 text-green-800` | — |
| FeeStatusBadge | Inactive | `bg-gray-100 text-gray-800` | — |

---

## 11. Business Rules Summary (ビジネスルール要約)

1. Advertisement package pricing is defined through Fee Settings (Placement, Tier, Daily Rate, Duration Days, Max Ads). Maximum 12 packages (4 placements × 3 tiers).
2. **Total Fee = Daily Rate × Duration Days** is displayed at package selection and in review modal.
3. Both Merchants and Admins can view the calculated fee at the point of package selection and in the review modal.
4. After payment and submission, advertisements enter PENDING review status.
5. **Only PENDING advertisements can be approved or rejected.**
6. Admin approval makes ads visible per their schedule (`starts_at` ~ `expires_at`).
7. Admin rejection requires a reason (required, max 1000 characters).
8. Rejected advertisements are not displayed.
9. **Rejected advertisements are refunded at 100% of the paid amount.**
10. **Fee Locking Rule:** Later Fee Setting changes do not affect existing advertisements' paid amounts.
11. Fee Setting changes only apply to new advertisements created after the change.
12. Fee Setting deactivation does not affect existing advertisements that already purchased the package.
13. Fee change history records from the current calendar month are protected and cannot be deleted.
14. Bulk operations are limited to maximum 50 records per operation.
15. Default pagination page size is 10; selectable options are 10, 20, 50, 100.

---

## 12. Placement & Tier Enums (配置場所・ティア列挙値)

### 2.1 Placements

| Enum Value | Display Label (EN) | Display Label (JA) |
| :--- | :--- | :--- |
| `search_page_banner` | Search Page Banner | 検索ページバナー |
| `recommendation_page_banner` | Recommendation Page Banner | おすすめページバナー |
| `checkout_page_banner` | Checkout Page Banner | 購入手続きページバナー |
| `productDetail_page_banner` | Product Detail Page Banner | 商品詳細ページバナー |

### 2.2 Tiers

| Enum Value | Display Label (EN) | Display Label (JA) |
| :--- | :--- | :--- |
| `basic` | Basic | ベーシック |
| `standard` | Standard | スタンダード |
| `premium` | Premium | プレミアム |

### 2.3 Approval Statuses

| Enum Value | Display Label (EN) | Display Label (JA) |
| :--- | :--- | :--- |
| `pending` | Pending | 保留中 |
| `approved` | Approved | 承認済み |
| `rejected` | Rejected | 却下済み |

### 2.4 Payment Statuses

| Enum Value | Display Label (EN) | Display Label (JA) |
| :--- | :--- | :--- |
| `completed` | Completed | 完了 |
| `pending` | Pending | 保留中 |
| `refunded` | Refunded | 返金済み |