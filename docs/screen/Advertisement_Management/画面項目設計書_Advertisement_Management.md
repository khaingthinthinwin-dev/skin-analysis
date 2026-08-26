# Screen Items Specification (画面項目設計書) — Advertisement Management

**Document ID:** SKM-SIS-SCR-AD-001
**Target Screen:** Advertisement Management (広告管理)
**Subsystem:** Advertisement — Shop Advertisement Management
**Function ID:** FN-AD-001
**Version:** 1.1
**Created:** 2026-08-25
**Last Updated:** 2026-08-25
**Author:** Senior System Engineer
**Review Status:** Approved (承認済み)
**Classification:** Internal — Engineering Division

---

## 1. Document Control (ドキュメント管理)

### 1.1 Document Revision History

| Version | Date | Author | Description of Changes |
| :--- | :--- | :--- | :--- |
| 1.0 | 2026-08-25 | Senior System Engineer | Initial release. Screen items specification for Merchant Advertisement Management (`/merchant/advertisements`) and Admin Advertisement Moderation (`/admin/ads`) screens, including package catalog, content upload dialog, payment dialog, edit dialog, and admin fee settings panel. |
| 1.1 | 2026-08-25 | Senior System Engineer | Aligned with DATABASE_SPEC v2.5 and Functional Specification v2.6. Removed application-level states (`draft`, `content_uploaded`) from DB-layer references. Updated: approval status filter options (§4.6), badge colors (§4.7), button visibility conditions (§4.7), backend execution logic (§5.1–5.4), API response examples (§8.1–8.2), DB defaults (§7.2), and test checklist (§12.4–12.5). |

### 1.2 Related Documents

| No. | Document ID | Document Name | File Path | Remarks |
| :-- | :--- | :--- | :--- | :--- |
| 1 | SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | §4.4 Advertisements (merchant), §5.3 Advertisement Management (admin), §7.6 Business Rules. |
| 2 | SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | `advertisements` (§3.13), `ad_fee_settings` (§3.14), `ad_payments` (§3.15), `ad_fee_history` (§3.16), `shops` tables. |
| 3 | SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | Naming conventions, RBAC, REST conventions (§8.1: PATCH for partial updates), audit retention (§6.4), advertisement rules (§12.7). |
| 4 | SKM-FDS-AD-001 | Functional Specification — Advertisement Management | `docs/screen/Advertisement_Management/機能設計書_Advertisement_Management.md` | Use cases, state transitions, validation rules, error handling, screen specifications (§5), operations (§6). |

---

## 2. Screen Overview & Purpose (画面概要・目的)

### 2.1 Purpose (目的)
The Advertisement Management screens enable merchants to browse Admin-created advertisement packages, select packages, upload ad content, pay advertising fees, and manage their own advertisements (view, edit, toggle, delete, resubmit rejected). The Admin Advertisement Moderation screen enables admins to review, approve, or reject merchant-submitted advertisements and manage the package catalog (create, update rates, deactivate).

### 2.2 Target Users & Roles (対象ユーザーと権限)

| Attribute | Value |
| :--- | :--- |
| **Primary Actors** | Authenticated merchant (`license_status = 'approved'` for CRUD; `'pending'`/`'rejected'` for read-only), Authenticated admin |
| **Required Authentication** | JWT Bearer Token (merchant/admin); Public (active ad display on storefront) |
| **Data Scope** | Merchant: own shop's ads only. Admin: all ads and all package fee settings. Buyer: active approved ads (public). |
| **Access Control** | Merchant endpoints require `merchant` role + shop approval for mutations. Admin endpoints require `admin` role. Public endpoint (`GET /ads/active`) requires no auth. |

### 2.3 Core Functions & Basic Design Principles (主要機能・基本設計方針)
1. **Package Catalog Browsing** — Merchants browse Admin-created packages (placement × tier × rate × duration).
2. **Package Selection** — Select a package to create a draft advertisement.
3. **Content Upload** — Upload ad content (title, content, image, announcement message) and set schedule.
4. **Fee Payment** — Pay advertising fee; ad enters admin approval queue.
5. **Advertisement Management** — View, edit content, toggle active/inactive, soft-delete own ads.
6. **Resubmission** — Edit and resubmit rejected ads after payment.
7. **Admin Moderation** — Approve or reject ads with reason; auto-refund on rejection.
8. **Admin Package Management** — Create, update rates, deactivate packages; rate changes audited.
9. **Form Validation** — Client-side validation with real-time feedback via React Hook Form + Zod.
10. **Error Handling** — Display inline and form-level errors with error codes.
11. **Internationalization** — Full i18n support for EN, JA, MY.
12. **Responsive Design** — Mobile-first dashboard layout with dialog modals.

---

## 3. Screen Layout (画面レイアウト構成)

### 3.1 Overall Page Structure (全体画面構成)

#### Merchant Advertisement Management Page Layout (`/merchant/advertisements`)
```text
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  [A] SIDEBAR NAVIGATION                             ││
│  │  Merchant Portal / Advertisements (active)           ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  [B] PAGE HEADER                                    ││
│  │  [B1] Title: "Advertisements"                       ││
│  │  [B2] Subtitle: "Select an advertising package..."  ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  [C] PENDING MERCHANT BANNER (conditional)          ││
│  │  Info: "Your shop is pending approval..."           ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  [D] STATISTICS CARDS ROW                           ││
│  │  [D1] Active Ads Count  [D2] Pending Count          ││
│  │  [D3] Expired Count                                  ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  [E] PACKAGE CATALOG SECTION                        ││
│  │  [E1] Section Title: "Available Packages"           ││
│  │  [E2] Package Cards Grid                            ││
│  │      ┌─────────────────────────────────────────┐    ││
│  │      │ Package Card                            │    ││
│  │      │  [E2a] Placement Name                   │    ││
│  │      │  [E2b] Tier Badge (Basic/Std/Premium)   │    ││
│  │      │  [E2c] Daily Rate: $X.XX/day            │    ││
│  │      │  [E2d] Duration: X days                 │    ││
│  │      │  [E2e] Max Ads: X                       │    ││
│  │      │  [E2f] Total Fee: $XX.XX                │    ││
│  │      │  [E2g] Select Button                     │    ││
│  │      └─────────────────────────────────────────┘    ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  [F] TOOLBAR                                        ││
│  │  [F1] Status Filter (Select)                        ││
│  │  [F2] Approval Status Filter (Select)               ││
│  │  [F3] Search Input                                  ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  [G] ADVERTISEMENT LIST                             ││
│  │  ┌─────────────────────────────────────────────┐    ││
│  │  │ Ad Card                                    │    ││
│  │  │  [G1] Thumbnail Image                      │    ││
│  │  │  [G2] Title                                │    ││
│  │  │  [G3] Approval Status Badge                │    ││
│  │  │  [G4] Payment Status Badge                 │    ││
│  │  │  [G5] Content Preview (truncated)          │    ││
│  │  │  [G6] Announcement Message (truncated)     │    ││
│  │  │  [G7] Schedule Display                     │    ││
│  │  │  [G8] Rejection Reason (conditional)       │    ││
│  │  │  [G9] Pay Fee Button (conditional)         │    ││
│  │  │  [G10] Resubmit Button (conditional)       │    ││
│  │  │  [G11] Edit Button (conditional)           │    ││
│  │  │  [G12] Delete Button (conditional)         │    ││
│  │  │  [G13] Toggle Active Switch (conditional)  │    ││
│  │  └─────────────────────────────────────────────┘    ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  [H] PAGINATION                                     ││
│  │  [H1] Page Info  [H2] Prev  [H3] Next              ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Package Selection Confirmation Dialog Layout
```text
┌─────────────────────────────────────────────────────────┐
│                   DIALOG OVERLAY                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  [I] PACKAGE SELECTION CONFIRMATION DIALOG          ││
│  │                                                     ││
│  │  [I1] Dialog Title: "Select Advertising Package"   ││
│  │                                                     ││
│  │  [I2] Package Info (read-only):                     ││
│  │       Placement / Tier / Rate / Duration / Fee      ││
│  │                                                     ││
│  │  ┌──────────────────────────────────────────────┐  ││
│  │  │  [I3] Confirm Select Button    [I4] Cancel   │  ││
│  │  └──────────────────────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Upload Ad Content Dialog Layout
```text
┌─────────────────────────────────────────────────────────┐
│                   DIALOG OVERLAY                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  [J] UPLOAD AD CONTENT DIALOG                       ││
│  │                                                     ││
│  │  [J1] Dialog Title: "Upload Advertisement Content"  ││
│  │  [J2] Close Button (X icon)                         ││
│  │                                                     ││
│  │  [J3] Placement Display (read-only)                 ││
│  │  [J4] Tier Display (read-only)                      ││
│  │                                                     ││
│  │  [J5] Title Input                                   ││
│  │  [J6] Content Textarea                              ││
│  │  [J7] Image Upload (drag & drop + file picker)      ││
│  │  [J8] Link URL Input                                ││
│  │  [J9] Announcement Message Textarea                 ││
│  │  [J10] Start Date Picker                            ││
│  │  [J11] End Date Display (read-only, auto-calculated)││
│  │  [J12] Fee Summary (read-only)                      ││
│  │                                                     ││
│  │  ┌──────────────────────────────────────────────┐  ││
│  │  │  [J13] Cancel    [J14] Save & Continue       │  ││
│  │  └──────────────────────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Payment Confirmation Dialog Layout
```text
┌─────────────────────────────────────────────────────────┐
│                   DIALOG OVERLAY                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  [K] PAYMENT CONFIRMATION DIALOG                    ││
│  │                                                     ││
│  │  [K1] Dialog Title: "Pay Advertising Fee"           ││
│  │                                                     ││
│  │  [K2] Fee Summary Text                              ││
│  │       "Advertising Fee: $35.00 · 7 days × $5.00/day"││
│  │                                                     ││
│  │  [K3] Payment Reference Input (optional, hidden)    ││
│  │                                                     ││
│  │  ┌──────────────────────────────────────────────┐  ││
│  │  │  [K4] Cancel    [K5] Pay & Submit             │  ││
│  │  └──────────────────────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Edit Ad Content Dialog Layout
```text
┌─────────────────────────────────────────────────────────┐
│                   DIALOG OVERLAY                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  [L] EDIT AD CONTENT DIALOG                         ││
│  │                                                     ││
│  │  [L1] Dialog Title: "Edit Advertisement Content"    ││
│  │                                                     ││
│  │  [L2] Title Input                                   ││
│  │  [L3] Content Textarea                              ││
│  │  [L4] Image Upload (with current preview)           ││
│  │  [L5] Link URL Input                                ││
│  │  [L6] Announcement Message Textarea                 ││
│  │                                                     ││
│  │  ┌──────────────────────────────────────────────┐  ││
│  │  │  [L7] Cancel    [L8] Save                     │  ││
│  │  │         [L9] Save & Pay (rejected only)       │  ││
│  │  └──────────────────────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Admin Advertisement Moderation Page Layout (`/admin/ads`)
```text
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  [A] SIDEBAR NAVIGATION                             ││
│  │  Admin Portal / Ad Management (active)               ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  [M] PAGE HEADER                                    ││
│  │  [M1] Title: "Advertisement Moderation"             ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  [N] PENDING APPROVAL QUEUE                         ││
│  │  [N1] Weekly Limit Indicator: "X of 5 active"       ││
│  │  [N2] Pending Ad Cards                              ││
│  │      ┌─────────────────────────────────────────┐    ││
│  │      │ Pending Ad Card                         │    ││
│  │      │  [N2a] Thumbnail                        │    ││
│  │      │  [N2b] Title                            │    ││
│  │      │  [N2c] Content Preview                  │    ││
│  │      │  [N2d] Announcement Message             │    ││
│  │      │  [N2e] Schedule                         │    ││
│  │      │  [N2f] Shop Name                        │    ││
│  │      │  [N2g] Fee / Payment Info               │    ││
│  │      │  [N2h] Approve Button                   │    ││
│  │      │  [N2i] Reject Button                    │    ││
│  │      │  [N2j] Rejection Reason Textarea (cond.)│    ││
│  │      └─────────────────────────────────────────┘    ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  [O] FEE SETTINGS / PACKAGE MANAGEMENT SECTION      ││
│  │  [O1] Section Title: "Advertisement Packages"       ││
│  │  [O2] New Package Button                            ││
│  │  [O3] Fee Settings Table                            ││
│  │      ┌─────────────────────────────────────────┐    ││
│  │      │ Fee Settings Table                      │    ││
│  │      │  Columns: Placement | Tier | Daily Rate │    ││
│  │      │  | Duration | Max Ads | Active | Actions│    ││
│  │      │  [O3a] Edit Rate Button per row          │    ││
│  │      │  [O3b] Deactivate Button per row         │    ││
│  │      │  [O3c] Fee History Button per row        │    ││
│  │      └─────────────────────────────────────────┘    ││
│  │  [O4] All Ads Table                                ││
│  │      ┌─────────────────────────────────────────┐    ││
│  │      │ All Ads Table                           │    ││
│  │      │  Columns: Title | Shop | Status |       │    ││
│  │      │  Approval | Payment | Schedule | Actions │    ││
│  │      └─────────────────────────────────────────┘    ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Admin Create Package Dialog Layout
```text
┌─────────────────────────────────────────────────────────┐
│                   DIALOG OVERLAY                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  [P] CREATE PACKAGE DIALOG                          ││
│  │                                                     ││
│  │  [P1] Dialog Title: "Create Advertisement Package"  ││
│  │                                                     ││
│  │  [P2] Placement Select                              ││
│  │  [P3] Tier Select                                   ││
│  │  [P4] Daily Rate Input                              ││
│  │  [P5] Duration Days Input                           ││
│  │  [P6] Max Ads Input                                ││
│  │                                                     ││
│  │  ┌──────────────────────────────────────────────┐  ││
│  │  │  [P7] Cancel    [P8] Create Package          │  ││
│  │  └──────────────────────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Responsive Layout Breakpoints (レスポンシブ対応)

| Breakpoint | Min Width | Layout Behavior |
| :--- | :--- | :--- |
| Mobile (default) | 0px | Single-column ad cards, dialogs become full-screen sheets, package cards stacked |
| Tablet (`md:`) | 768px | Ad cards in 2-column grid, sidebar collapses, dialogs centered |
| Desktop (`lg:`) | 1024px | Full dashboard layout with sidebar, ad cards with thumbnails, 3-column package grid |
| Wide (`xl:`) | 1280px | Wider package grid (4 columns), expanded table columns |

---

## 4. Item Definitions (画面項目定義)

### 4.1 Section [A]: Sidebar Navigation (サイドバーナビゲーション)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 1 | `navSidebar` | Sidebar Navigation | Sidebar (`MerchantLayout` / `AdminLayout`) | — | Yes | Rendered by role; "Advertisements" item highlighted for merchant, "Ad Management" for admin | — | Role-based navigation config (`navConfig.ts`) | Uses standard sidebar component. Active item: `bg-purple-100/60 text-primary`. See Development Rules §9.7. |

### 4.2 Section [B]: Page Header (ページヘッダー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 2 | `lblAdTitle` | Page Title | Static Label (`<h1>`) | String | Yes | Text: "Advertisements" | — | Hardcoded UI text | Tailwind: `text-3xl font-bold tracking-tight`. i18n: `merchant.ads.title`. |
| 3 | `lblAdSubtitle` | Page Subtitle | Static Label (`<p>`) | String | No | Text: "Select an advertising package, upload your content, and manage your advertisements." | — | Hardcoded UI text | Tailwind: `text-muted-foreground`. i18n: `merchant.ads.subtitle`. |

### 4.3 Section [C]: Pending Merchant Banner (出品者承認待ちバナー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 4 | `bannerPendingMerchant` | Pending Merchant Info | Alert (`info`) | String | Conditional | Hidden by default. Shown when `license_status` is `'pending'` or `'rejected'`. | — | `merchants.license_status` | Text: "Your shop is pending approval. You can browse packages and view your ads, but you cannot select a package until your shop is approved." Tailwind: `border-blue-500/50 text-blue-700`. i18n: `merchant.ads.pendingBanner`. |

### 4.4 Section [D]: Statistics Cards (統計カード)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 5 | `statActiveAds` | Active Ads Stat | Card | Integer | Yes | Loading skeleton; populated from API response | — | Computed: count of ads where `approval_status = 'approved'` AND `payment_status = 'completed'` AND `is_active = true` AND in schedule | i18n: `merchant.ads.statActive`. Tailwind: `bg-secondary/50`. |
| 6 | `statPendingApproval` | Pending Approval Stat | Card | Integer | Yes | Loading skeleton; populated from API response | — | Computed: count of ads where `approval_status = 'pending'` AND `payment_status = 'completed'` | i18n: `merchant.ads.statPending`. Tailwind: `bg-amber-100/50`. |
| 7 | `statExpiredAds` | Expired Stat | Card | Integer | Yes | Loading skeleton; populated from API response | — | Computed: count of ads where `expires_at < now()` | i18n: `merchant.ads.statExpired`. Tailwind: `bg-muted/50`. |

### 4.5 Section [E]: Package Catalog (広告パッケージカタログ)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 8 | `lblCatalogTitle` | Package Catalog Title | Static Label (`<h2>`) | String | Yes | Text: "Available Packages" | — | Hardcoded UI text | i18n: `merchant.ads.catalog`. Tailwind: `text-xl font-semibold`. |
| 9 | `cardPackage` | Package Card | Card | Object | Yes | Grid of active packages from `GET /ads/packages` | — | `ad_fee_settings` (active only) | Each card displays placement, tier, daily rate, duration, max ads, computed total fee. |
| 10 | `lblPlacement` | Placement Name | Static Label (`<span>`) | String | Yes | Text from package: "Homepage Slider", "Product Sidebar", etc. | — | `ad_fee_settings.placement` | i18n mapped from placement enum. |
| 11 | `badgeTier` | Tier Badge | Badge | Enum | Yes | "Basic", "Standard", or "Premium" | — | `ad_fee_settings.tier` | Colors: basic = `bg-gray-100 text-gray-800`, standard = `bg-blue-100 text-blue-800`, premium = `bg-purple-100 text-purple-800`. i18n: `merchant.ads.tier.{tier}`. |
| 12 | `lblDailyRate` | Daily Rate | Static Label (`<span>`) | Decimal | Yes | Format: "$X.XX/day" | — | `ad_fee_settings.daily_rate` | i18n: `merchant.ads.dailyRate`. |
| 13 | `lblDuration` | Duration | Static Label (`<span>`) | Integer | Yes | Format: "X days" | — | `ad_fee_settings.duration_days` | i18n: `merchant.ads.duration`. |
| 14 | `lblMaxAds` | Max Ads | Static Label (`<span>`) | Integer | Yes | Format: "Max X ads" | — | `ad_fee_settings.max_ads` | i18n: `merchant.ads.maxAds`. |
| 15 | `lblTotalFee` | Total Fee | Static Label (`<span>`) | Decimal | Yes | Format: "Total: $XX.XX" | — | Computed: `daily_rate × duration_days` | i18n: `merchant.ads.totalFee`. Tailwind: `text-primary font-bold`. |
| 16 | `btnSelectPackage` | Select Button | Button (`primary`) | — | Yes | Visible; text: "Select" | — | — | Disabled when `license_status` is `'pending'` or `'rejected'`. Opens Package Selection Confirmation dialog (§4.13). i18n: `merchant.ads.select`. Tailwind: `bg-primary text-primary-foreground`. |

### 4.6 Section [F]: Toolbar (ツールバー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 17 | `selStatusFilter` | Status Filter | Select | Enum | No | Default: "All" | Options: All, Active, Expired, Inactive | — | Filters ad list by display status. i18n: `merchant.ads.filterStatus`. |
| 18 | `selApprovalFilter` | Approval Status Filter | Select | Enum | No | Default: "All" | Options: All, Pending, Approved, Rejected | — | Filters ad list by `approval_status`. i18n: `merchant.ads.filterApproval`. |
| 19 | `txtAdSearch` | Search Input | Input (`text`) | String(100) | No | Empty. Placeholder: "Search ads..." | MaxLength: 100 | — | Searches within own ads by title. i18n: `merchant.ads.search`. |

### 4.7 Section [G]: Advertisement Card (広告カード)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 20 | `imgAdThumbnail` | Ad Thumbnail | Image | URL | No | Placeholder image if no `image_url` uploaded | — | `advertisements.image_url` | Aspect ratio: 16:9. Tailwind: `rounded-lg object-cover`. |
| 21 | `lblAdTitle` | Ad Title | Static Label (`<h3>`) | String(200) | Yes | Text from `title` field | MaxLength display: 200 | `advertisements.title` | Tailwind: `font-semibold text-base`. |
| 22 | `badgeApprovalStatus` | Approval Status Badge | Badge | Enum | Yes | Maps to approval status text | — | `advertisements.approval_status` | Colors: pending = `bg-amber-100 text-amber-800`, approved = `bg-green-100 text-green-800`, rejected = `bg-red-100 text-red-800`. i18n: `merchant.ads.status.{status}`. |
| 23 | `badgePaymentStatus` | Payment Status Badge | Badge | Enum | Yes | Maps to payment status text | — | `advertisements.payment_status` | Colors: pending = `bg-amber-100 text-amber-800`, completed = `bg-green-100 text-green-800`, refunded = `bg-gray-100 text-gray-800`. i18n: `merchant.ads.payment.{status}`. |
| 24 | `lblAdContent` | Ad Content Preview | Static Label (`<p>`) | String | No | Truncated to 100 chars; full text on hover tooltip | — | `advertisements.content` | Tailwind: `text-muted-foreground text-sm line-clamp-2`. |
| 25 | `lblAnnouncement` | Announcement Message | Static Label (`<p>`) | String(500) | Yes | Truncated to 60 chars; full text on tooltip | — | `advertisements.announcement_message` | Tailwind: `text-sm font-medium`. |
| 26 | `lblSchedule` | Schedule Display | Static Label (`<span>`) | String | No | Format: "Aug 24, 2026 → Aug 31, 2026" | — | `advertisements.starts_at` + `advertisements.expires_at` | Only shown when schedule is set. i18n: `merchant.ads.schedule`. |
| 27 | `lblRejectionReason` | Rejection Reason | Alert (`warning`) | String(2000) | Conditional | Hidden unless `approval_status = 'rejected'` | — | `advertisements.rejection_reason` | Tailwind: `border-amber-500/50 text-amber-700 bg-amber-50`. i18n: `merchant.ads.rejectionReason`. |
| 28 | `btnPayFee` | Pay Fee Button | Button (`primary`) | — | Conditional | Shown when ad has content (`content IS NOT NULL AND image_url IS NOT NULL`) AND `payment_status = 'pending'` | — | — | Opens Payment Confirmation dialog (§4.16). i18n: `merchant.ads.payFee`. Tailwind: `bg-primary`. |
| 29 | `btnResubmit` | Resubmit Button | Button (`primary`) | — | Conditional | Shown when `approval_status = 'rejected'` | — | — | Opens Edit Ad Content dialog (§4.17) in resubmit mode (Save & Pay button shown). i18n: `merchant.ads.resubmit`. Tailwind: `bg-primary`. |
| 30 | `btnEditAd` | Edit Button | Button (`outline`) | — | Conditional | Shown when ad has content (`content IS NOT NULL AND image_url IS NOT NULL`) AND `payment_status = 'pending'` (content uploaded), OR when `approval_status = 'rejected'` | — | — | Opens Edit Ad Content dialog (§4.17). i18n: `merchant.ads.edit`. Tailwind: `border-border`. |
| 31 | `btnDeleteAd` | Delete Button | Button (`destructive`) | — | Conditional | Shown when ad has content (`content IS NOT NULL AND image_url IS NOT NULL`) AND `payment_status = 'pending'` (content uploaded), OR when `is_active = false` (inactive) | — | — | Confirmation dialog before soft-delete. i18n: `merchant.ads.delete`. Tailwind: `text-destructive`. |
| 32 | `swtToggleActive` | Toggle Active Switch | Switch | Boolean | Conditional | Shown when `approval_status = 'approved'` AND `payment_status = 'completed'` | — | `advertisements.is_active` | Toggles `is_active`. i18n: `merchant.ads.toggleActive`. |

### 4.8 Section [H]: Pagination (ページネーション)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 33 | `lblPageInfo` | Page Info | Static Label (`<span>`) | String | Yes | Format: "Page 1 of 3 · 12 ads" | — | `meta.total`, `meta.page`, `meta.totalPages` | i18n: `common.pageInfo`. |
| 34 | `btnPrevPage` | Previous Page | Button (`outline`) | — | Yes | Disabled on first page | — | — | i18n: `common.prev`. |
| 35 | `btnNextPage` | Next Page | Button (`primary`) | — | Yes | Disabled on last page | — | — | i18n: `common.next`. |

### 4.9 Section [I]: Package Selection Confirmation Dialog (パッケージ選択確認ダイアログ)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 36 | `lblSelectDialogTitle` | Dialog Title | Static Label (`<h2>`) | String | Yes | Text: "Select Advertising Package" | — | Hardcoded UI text | i18n: `merchant.ads.selectTitle`. Tailwind: `text-lg font-semibold`. |
| 37 | `lblPackageInfo` | Package Info | Static Label (`<div>`) | Object | Yes | Read-only display: Placement, Tier, Daily Rate, Duration, Total Fee | — | Selected `ad_fee_settings` record | Displayed as key-value pairs in a description list. |
| 38 | `btnConfirmSelect` | Confirm Select Button | Button (`primary`) | — | Yes | Text: "Confirm Selection" | — | — | Calls `POST /ads/packages/:feeSettingId/select`. On success, creates draft ad and opens Upload Content dialog. Loading state: Spinner + "Selecting...". i18n: `merchant.ads.confirmSelect`. |
| 39 | `btnCancelSelect` | Cancel Button | Button (`outline`) | — | Yes | Text: "Cancel" | — | — | Closes dialog. i18n: `common.cancel`. |

### 4.10 Section [J]: Upload Ad Content Dialog (広告コンテンツアップロードダイアログ)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 40 | `lblUploadDialogTitle` | Dialog Title | Static Label (`<h2>`) | String | Yes | Text: "Upload Advertisement Content" | — | Hardcoded UI text | i18n: `merchant.ads.uploadTitle`. Tailwind: `text-lg font-semibold`. |
| 41 | `btnCloseUploadDialog` | Close Button | Icon Button (`X`) | — | Yes | X icon | — | — | Dismisses dialog. i18n: `common.close`. |
| 42 | `lblPlacementDisplay` | Placement Display | Static Label (`<span>`) | String | Yes | Read-only: selected package placement | — | `ad_fee_settings.placement` | i18n: `merchant.ads.placement`. Tailwind: `text-muted-foreground`. |
| 43 | `lblTierDisplay` | Tier Display | Static Label (`<span>`) | String | Yes | Read-only: selected package tier | — | `ad_fee_settings.tier` | i18n: `merchant.ads.tier`. |
| 44 | `txtAdTitle` | Title Input | Input (`text`) | String(200) | Mandatory | Empty. Placeholder: "Enter advertisement title" | MaxLength: 200. MinLength: 1. | `advertisements.title` | i18n: `merchant.ads.titlePlaceholder`. |
| 45 | `txtAdContent` | Content Input | Textarea | String(5000) | No | Empty. Placeholder: "Enter advertisement content" | MaxLength: 5000. | `advertisements.content` | i18n: `merchant.ads.contentPlaceholder`. |
| 46 | `uplAdImage` | Image Upload | File Upload (drag & drop) | File (binary) | No | Empty; drag & drop zone + file picker button | Accepted MIME: `image/jpeg`, `image/png`, `image/webp`. Max size: 5MB. | `advertisements.image_url` | Preview shown after upload. i18n: `merchant.ads.image`. |
| 47 | `txtLinkUrl` | Link URL Input | Input (`url`) | String(2048) | No | Empty. Placeholder: "https://example.com" | Format: valid URL. MaxLength: 2048. | `advertisements.link_url` | i18n: `merchant.ads.linkUrlPlaceholder`. |
| 48 | `txtAnnouncement` | Announcement Message Input | Textarea | String(500) | Mandatory | Empty. Placeholder: "Enter banner announcement message" | MaxLength: 500. MinLength: 1. | `advertisements.announcement_message` | i18n: `merchant.ads.announcementPlaceholder`. |
| 49 | `dateStart` | Start Date Input | Date Picker | DATE | Mandatory | Default: today | Must be ≥ today. | `advertisements.starts_at` | i18n: `merchant.ads.startDate`. |
| 50 | `lblEndDate` | End Date Display | Static Label (`<span>`) | String | Yes | Read-only: auto-calculated as `starts_at + package duration_days` | — | Computed: `starts_at + duration_days` | Format: "Aug 31, 2026". i18n: `merchant.ads.endDate`. Tailwind: `text-muted-foreground`. |
| 51 | `lblFeeSummary` | Fee Summary | Static Label (`<div>`) | String | Yes | Read-only: "Advertising Fee: $35.00 · 7 days × $5.00/day" | — | `ad_fee_settings.daily_rate × duration_days` | i18n: `merchant.ads.fee`. Tailwind: `font-semibold text-primary`. |
| 52 | `btnCancelUpload` | Cancel Button | Button (`outline`) | — | Yes | Text: "Cancel" | — | — | Closes dialog without saving. i18n: `common.cancel`. |
| 53 | `btnSaveAndContinue` | Save & Continue Button | Button (`primary`) | — | Yes | Text: "Save & Continue" | — | — | Calls `PATCH /ads/:id/content`. On success, ad moves to `CONTENT_UPLOADED` state; Pay Fee button becomes available on ad card. Loading: Spinner + "Saving...". i18n: `merchant.ads.saveContinue`. |

### 4.11 Section [K]: Payment Confirmation Dialog (支払い確認ダイアログ)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 54 | `lblPayDialogTitle` | Dialog Title | Static Label (`<h2>`) | String | Yes | Text: "Pay Advertising Fee" | — | Hardcoded UI text | i18n: `merchant.ads.payTitle`. Tailwind: `text-lg font-semibold`. |
| 55 | `lblFeeDetail` | Fee Summary | Static Label (`<div>`) | String | Yes | Format: "Advertising Fee: $35.00 · 7 days × $5.00/day" | — | `advertisements.payment_amount`, `ad_fee_settings` | i18n: `merchant.ads.fee`. Tailwind: `text-sm`. |
| 56 | `txtPaymentRef` | Payment Reference Input | Input (`text`) | String(100) | No | Empty (hidden, gateway stubbed) | MaxLength: 100. | `advertisements.payment_reference` | i18n: `merchant.ads.paymentRef`. Hidden in production; only visible in development mode. |
| 57 | `btnPaySubmit` | Pay & Submit Button | Button (`primary`) | — | Yes | Text: "Pay & Submit" | — | — | Calls `POST /ads/:id/pay`. On success, `payment_status = completed`, `approval_status = pending`. Ad enters admin approval queue. Loading: Spinner + "Processing payment...". i18n: `merchant.ads.paySubmit`. |
| 58 | `btnCancelPay` | Cancel Button | Button (`outline`) | — | Yes | Text: "Cancel" | — | — | Closes dialog. i18n: `common.cancel`. |

### 4.12 Section [L]: Edit Ad Content Dialog (広告コンテンツ編集ダイアログ)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 59 | `lblEditDialogTitle` | Dialog Title | Static Label (`<h2>`) | String | Yes | Text: "Edit Advertisement Content" | — | Hardcoded UI text | i18n: `merchant.ads.editTitle`. Tailwind: `text-lg font-semibold`. |
| 60 | `txtEditTitle` | Title Input | Input (`text`) | String(200) | Mandatory | Pre-filled with current `title` | MaxLength: 200. MinLength: 1. | `advertisements.title` | i18n: `merchant.ads.titlePlaceholder`. |
| 61 | `txtEditContent` | Content Input | Textarea | String(5000) | No | Pre-filled with current `content` | MaxLength: 5000. | `advertisements.content` | i18n: `merchant.ads.contentPlaceholder`. |
| 62 | `uplEditImage` | Image Upload | File Upload (drag & drop) | File (binary) | No | Shows current image preview if exists | Accepted MIME: `image/jpeg`, `image/png`, `image/webp`. Max size: 5MB. | `advertisements.image_url` | i18n: `merchant.ads.image`. |
| 63 | `txtEditLinkUrl` | Link URL Input | Input (`url`) | String(2048) | No | Pre-filled with current `link_url` | Format: valid URL. MaxLength: 2048. | `advertisements.link_url` | i18n: `merchant.ads.linkUrlPlaceholder`. |
| 64 | `txtEditAnnouncement` | Announcement Message Input | Textarea | String(500) | Mandatory | Pre-filled with current `announcement_message` | MaxLength: 500. MinLength: 1. | `advertisements.announcement_message` | i18n: `merchant.ads.announcementPlaceholder`. |
| 65 | `btnEditCancel` | Cancel Button | Button (`outline`) | — | Yes | Text: "Cancel" | — | — | Closes dialog. i18n: `common.cancel`. |
| 66 | `btnEditSave` | Save Button | Button (`primary`) | — | Conditional | Shown when ad is in `DRAFT` or `CONTENT_UPLOADED` state; text: "Save" | — | — | Calls `PATCH /ads/:id`. i18n: `merchant.ads.save`. |
| 67 | `btnEditSaveAndPay` | Save & Pay Button | Button (`primary`) | — | Conditional | Shown when ad is in `REJECTED` state; text: "Save & Pay" | — | — | Calls `PATCH /ads/:id` then opens Payment Confirmation dialog. i18n: `merchant.ads.savePay`. |

### 4.13 Section [M]: Admin Page Header (管理者ページヘッダー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 68 | `lblAdminAdTitle` | Page Title | Static Label (`<h1>`) | String | Yes | Text: "Advertisement Moderation" | — | Hardcoded UI text | i18n: `admin.ads.title`. Tailwind: `text-3xl font-bold tracking-tight`. |

### 4.14 Section [N]: Pending Approval Queue (承認待ちキュー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 69 | `lblWeeklyLimit` | Weekly Limit Indicator | Static Label (`<span>`) | String | Yes | Format: "X of 5 active ads this week" | — | Computed: count of approved ads for current ISO week | i18n: `admin.ads.weeklyLimit`. Tailwind: `text-sm text-muted-foreground`. |
| 70 | `cardPendingAd` | Pending Ad Card | Card | Object | Yes | List of ads with `approval_status = 'pending'` AND `payment_status = 'completed'` | — | `advertisements` + `shops` | Sorted oldest first. |
| 71 | `imgPendingThumbnail` | Pending Ad Thumbnail | Image | URL | No | Placeholder if no image | — | `advertisements.image_url` | Tailwind: `rounded-lg object-cover`. |
| 72 | `lblPendingTitle` | Pending Ad Title | Static Label (`<h3>`) | String | Yes | Text from `title` | — | `advertisements.title` | Tailwind: `font-semibold`. |
| 73 | `lblPendingContent` | Pending Ad Content | Static Label (`<p>`) | String | No | Truncated to 200 chars | — | `advertisements.content` | Tailwind: `text-muted-foreground text-sm line-clamp-3`. |
| 74 | `lblPendingAnnouncement` | Pending Announcement | Static Label (`<p>`) | String(500) | Yes | Banner announcement message | — | `advertisements.announcement_message` | Tailwind: `text-sm font-medium`. |
| 75 | `lblPendingSchedule` | Pending Schedule | Static Label (`<span>`) | String | Yes | Format: "Aug 24, 2026 → Aug 31, 2026" | — | `advertisements.starts_at` + `advertisements.expires_at` | i18n: `merchant.ads.schedule`. |
| 76 | `lblPendingShop` | Pending Shop Name | Static Label (`<span>`) | String | Yes | Merchant's shop name | — | `shops.name` | i18n: `admin.ads.shopName`. |
| 77 | `lblPendingFee` | Pending Fee Info | Static Label (`<span>`) | String | Yes | Format: "Fee: $35.00 · Paid" | — | `advertisements.payment_amount` | i18n: `admin.ads.feeInfo`. |
| 78 | `btnApproveAd` | Approve Button | Button (`success`) | — | Yes | Text: "Approve" | — | — | Calls `PATCH /admin/ads/:id/approve`. Validates weekly limit (max 5). Loading: Spinner + "Approving...". i18n: `admin.ads.approve`. Tailwind: `bg-green-600 hover:bg-green-700`. |
| 79 | `btnRejectAd` | Reject Button | Button (`destructive`) | — | Yes | Text: "Reject" | — | — | Shows `txtRejectReason` textarea. Calls `PATCH /admin/ads/:id/reject` with reason. Auto-refund on rejection. Loading: Spinner + "Rejecting...". i18n: `admin.ads.reject`. Tailwind: `bg-destructive`. |
| 80 | `txtRejectReason` | Rejection Reason Input | Textarea | String(2000) | Conditional | Shown when Reject button clicked. Empty. Placeholder: "Enter rejection reason" | MaxLength: 2000. Required when rejecting. | — | i18n: `admin.ads.rejectReason`. Tailwind: `border-destructive/50`. |

### 4.15 Section [O]: Fee Settings / Package Management (料金設定・パッケージ管理)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 81 | `lblFeeSettingsTitle` | Fee Settings Title | Static Label (`<h2>`) | String | Yes | Text: "Advertisement Packages" | — | Hardcoded UI text | i18n: `admin.ads.feeSettings`. Tailwind: `text-xl font-semibold`. |
| 82 | `btnNewPackage` | New Package Button | Button (`primary`) | — | Yes | Text: "New Package" | — | — | Opens Create Package dialog (§4.18). i18n: `admin.ads.newPackage`. Tailwind: `bg-primary`. |
| 83 | `tblFeeSettings` | Fee Settings Table | Table | Object[] | Yes | All packages from `GET /admin/ad-fee-settings`, sorted by placement, tier | — | `ad_fee_settings` | Columns: Placement, Tier, Daily Rate, Duration, Max Ads, Active, Actions. |
| 84 | `btnEditRate` | Edit Rate Button | Button (`outline`) | — | Yes (per row) | Inline edit mode for daily rate | — | `ad_fee_settings.daily_rate` | Calls `PATCH /admin/ad-fee-settings/:id`. i18n: `admin.ads.saveRate`. |
| 85 | `numDailyRate` | Daily Rate Input | Input (`number`) | Decimal(10,2) | Conditional | Inline editable on row | Min: 0. Max: 10000. | `ad_fee_settings.daily_rate` | i18n: `admin.ads.dailyRate`. Tailwind: `w-24`. |
| 86 | `btnFeeHistory` | Fee History Button | Button (`outline`) | — | Yes (per row) | Text: "History" | — | — | Opens Fee History dialog showing `ad_fee_history` records. i18n: `admin.ads.feeHistory`. |
| 87 | `btnDeactivatePackage` | Deactivate Package Button | Button (`destructive`) | — | Conditional (per row) | Shown when `is_active = true` | — | `ad_fee_settings.is_active` | Confirmation dialog before deactivation. Calls `DELETE /admin/ad-fee-settings/:id`. i18n: `admin.ads.deactivate`. Tailwind: `text-destructive`. |
| 88 | `tblAllAds` | All Ads Table | Table | Object[] | Yes | All platform ads with filterable approval/payment status | — | `advertisements` + `shops` | Columns: Title, Shop, Approval Status, Payment Status, Schedule, Actions. |

### 4.16 Section [P]: Create Package Dialog (パッケージ作成ダイアログ)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 89 | `lblCreatePkgTitle` | Dialog Title | Static Label (`<h2>`) | String | Yes | Text: "Create Advertisement Package" | — | Hardcoded UI text | i18n: `admin.ads.createPkgTitle`. Tailwind: `text-lg font-semibold`. |
| 90 | `selPlacement` | Placement Select | Select | Enum | Mandatory | Default: first option | Options: `homepage_slider`, `product_sidebar`, `category_banner`, `search_top` | `ad_fee_settings.placement` | i18n: `admin.ads.placement`. Must be unique per tier combination. |
| 91 | `selTier` | Tier Select | Select | Enum | Mandatory | Default: first option | Options: `basic`, `standard`, `premium` | `ad_fee_settings.tier` | i18n: `admin.ads.tier`. |
| 92 | `numCreateDailyRate` | Daily Rate Input | Input (`number`) | Decimal(10,2) | Mandatory | Empty. Placeholder: "0.00" | Min: 0. Max: 10000. | `ad_fee_settings.daily_rate` | i18n: `admin.ads.dailyRate`. |
| 93 | `numDurationDays` | Duration Days Input | Input (`number`) | Integer | Mandatory | Empty. Placeholder: "7" | Min: 7. Max: 30. | `ad_fee_settings.duration_days` | i18n: `admin.ads.durationDays`. |
| 94 | `numMaxAds` | Max Ads Input | Input (`number`) | Integer | Mandatory | Empty. Placeholder: "1" | Min: 1. | `ad_fee_settings.max_ads` | i18n: `admin.ads.maxAds`. |
| 95 | `btnCancelCreatePkg` | Cancel Button | Button (`outline`) | — | Yes | Text: "Cancel" | — | — | Closes dialog. i18n: `common.cancel`. |
| 96 | `btnCreatePkg` | Create Package Button | Button (`primary`) | — | Yes | Text: "Create Package" | — | — | Calls `POST /admin/ad-fee-settings`. 201 Created on success. Loading: Spinner + "Creating...". i18n: `admin.ads.createPkg`. |

---

## 5. Item Behaviors & Event Specifications (各項目における挙動・イベント仕様)

### 5.1 Package Select Button Click (`btnSelectPackage` onClick)
- **Trigger:** Merchant clicks "Select" on a package card.
- **Processing Logic:**
  1. **Pre-Check:** Verify merchant's `license_status` is `'approved'`. If not, show info banner and block selection.
  2. **Open Confirmation Dialog:** Show Package Selection Confirmation dialog (§4.9) with selected package details.
  3. **Confirm Selection:** On `btnConfirmSelect` click, call `POST /ads/packages/:feeSettingId/select`.
   4. **Backend Execution:** Validate package is active; verify shop is approved; create advertisement record with `approval_status = pending`, `payment_status = pending`, `is_active = true`.
  5. **Post-Execution UI:** Close confirmation dialog. Open Upload Content dialog (§4.10) for the newly created draft ad. Show success toast. Refresh ad list.
- **Exception Handling:**
  - `403 SHOP_NOT_APPROVED`: Display "Your shop is pending approval" in banner.
  - `404 NOT_FOUND`: Display "Selected advertising package is unavailable" in dialog error.
  - `400 AD_PACKAGE_INVALID`: Display "Selected advertising package is unavailable" in dialog error.

### 5.2 Upload Content Form Submit (`btnSaveAndContinue` onClick)
- **Trigger:** Merchant clicks "Save & Continue" in Upload Content dialog.
- **Processing Logic:**
  1. **Client-Side Pre-Check:** Strict validation — `title` not empty (max 200), `announcementMessage` not empty (max 500), `startsAt` ≥ today. Image validation if provided (MIME type, size).
  2. **Backend Dispatch:** `PATCH /api/v1/ads/:id/content` with `{ title, content, image, linkUrl, announcementMessage, startsAt }`.
   3. **Backend Execution:** Validate content fields; validate image if provided; derive `expires_at = starts_at + duration_days`. `approval_status` remains `'pending'` (unchanged).
  4. **Post-Execution UI:** Close dialog. Pay Fee button (`btnPayFee`) becomes available on the ad card. Show success toast. Refresh ad list.
- **Exception Handling:**
  - `400 BAD_REQUEST`: Display field-level inline errors (missing title, invalid image, etc.).
  - `413 PAYLOAD_TOO_LARGE`: Display "Image file must not exceed 5MB" inline.
  - `415 UNSUPPORTED_MEDIA_TYPE`: Display "Image must be JPG, PNG, or WebP format" inline.

### 5.3 Pay Fee Button Click (`btnPayFee` onClick)
- **Trigger:** Merchant clicks "Pay Fee" on an ad card.
- **Processing Logic:**
  1. **Open Payment Dialog:** Show Payment Confirmation dialog (§4.11) with fee summary.
  2. **Confirm Payment:** On `btnPaySubmit` click, call `POST /ads/:id/pay`.
   3. **Backend Execution:** Validate ad has content uploaded (`content IS NOT NULL AND image_url IS NOT NULL`) AND `payment_status = 'pending'`; process payment (stubbed); record in `ad_payments`; set `payment_status = completed`. `approval_status` remains `'pending'` (unchanged); derive `week_number`.
  4. **Post-Execution UI:** Close dialog. Ad status updates to PENDING_APPROVAL. Pay Fee button hidden. Show success toast. Refresh ad list.
- **Exception Handling:**
  - `422 UNPROCESSABLE_ENTITY`: Display "Payment failed. Please try again." in dialog error.
  - `500 INTERNAL_SERVER_ERROR`: Display "Something went wrong. Please try again" in dialog error.

### 5.4 Edit Content Form Submit (`btnEditSave` / `btnEditSaveAndPay` onClick)
- **Trigger:** Merchant clicks "Save" or "Save & Pay" in Edit dialog.
- **Processing Logic:**
  1. **Client-Side Pre-Check:** Strict validation — same as Upload Content.
  2. **Backend Dispatch:** `PATCH /api/v1/ads/:id` with `{ title, content, image, linkUrl, announcementMessage }`.
   3. **Backend Execution:** Validate ad allows editing: content uploaded (`content IS NOT NULL AND image_url IS NOT NULL`) AND `payment_status = 'pending'`, OR `approval_status = 'rejected'`; update content fields.
  4. **Post-Execution UI (Save):** Close dialog. Show success toast. Refresh ad list.
  5. **Post-Execution UI (Save & Pay):** Close dialog. Open Payment Confirmation dialog for resubmission payment.
- **Exception Handling:**
  - `400 BAD_REQUEST`: Display field-level inline errors.
  - `403 FORBIDDEN`: Display "You don't have permission to manage this ad".

### 5.5 Delete Button Click (`btnDeleteAd` onClick)
- **Trigger:** Merchant clicks "Delete" on an ad card.
- **Processing Logic:**
  1. **Confirmation Dialog:** Show confirmation dialog: "Are you sure you want to delete this advertisement?"
  2. **Backend Dispatch:** `DELETE /api/v1/ads/:id`.
  3. **Backend Execution:** Set `is_active = false` (soft delete). Record retained for history.
  4. **Post-Execution UI:** Ad removed from active list. Show success toast. Refresh ad list.
- **Exception Handling:**
  - `403 FORBIDDEN`: Display "You don't have permission to manage this ad".
  - `404 NOT_FOUND`: Display "Advertisement not found". Refresh list.

### 5.6 Toggle Active Switch (`swtToggleActive` onChange)
- **Trigger:** Merchant toggles the active switch on an approved ad.
- **Processing Logic:**
  1. **Backend Dispatch:** `PATCH /api/v1/ads/:id/toggle` with `{ isActive: newValue }`.
  2. **Backend Execution:** Verify `approval_status = approved` AND `payment_status = completed`; update `is_active`.
  3. **Post-Execution UI:** Switch state updates. Ad visibility on storefront changes accordingly. Show success toast.
- **Exception Handling:**
  - `403 FORBIDDEN`: Display "You don't have permission to manage this ad".

### 5.7 Admin Approve Click (`btnApproveAd` onClick)
- **Trigger:** Admin clicks "Approve" on a pending ad.
- **Processing Logic:**
  1. **Backend Dispatch:** `PATCH /api/v1/admin/ads/:id/approve`.
  2. **Backend Execution:** Validate weekly limit (max 5 approved active ads for current week); set `approval_status = approved`, `approved_by`, `approved_at`.
  3. **Post-Execution UI:** Ad removed from pending queue. Show success toast. Refresh pending queue. Update weekly limit indicator.
- **Exception Handling:**
  - `409 WEEKLY_LIMIT_REACHED`: Display "Weekly advertisement limit reached (max 5)" in alert banner.

### 5.8 Admin Reject Click (`btnRejectAd` onClick)
- **Trigger:** Admin clicks "Reject" (after entering reason in `txtRejectReason`).
- **Processing Logic:**
  1. **Validation:** `txtRejectReason` must not be empty.
  2. **Backend Dispatch:** `PATCH /api/v1/admin/ads/:id/reject` with `{ reason }`.
  3. **Backend Execution:** Set `approval_status = rejected`, `rejection_reason`; trigger auto-refund (`ad_payments`: `payment_status = refunded`, `refund_amount`, `refunded_at`).
  4. **Post-Execution UI:** Ad removed from pending queue. Show success toast. Refresh pending queue.
- **Exception Handling:**
  - `400 BAD_REQUEST`: Display "Rejection reason is required" if reason is empty.

### 5.9 Admin Create Package (`btnCreatePkg` onClick)
- **Trigger:** Admin clicks "Create Package" in Create Package dialog.
- **Processing Logic:**
  1. **Client-Side Pre-Check:** All fields validated — `placement` selected, `tier` selected, `dailyRate` ≥ 0, `durationDays` 7–30, `maxAds` ≥ 1.
  2. **Backend Dispatch:** `POST /api/v1/admin/ad-fee-settings` with `{ placement, tier, daily_rate, duration_days, max_ads }`.
  3. **Backend Execution:** Validate unique (`placement`, `tier`) combination; insert into `ad_fee_settings`.
  4. **Post-Execution UI:** Close dialog. Refresh fee settings table. Show success toast. Package immediately appears in merchant catalog.
- **Exception Handling:**
  - `409 CONFLICT`: Display "A package with this placement and tier already exists" in dialog error.

### 5.10 Admin Update Daily Rate (`btnEditRate` onClick)
- **Trigger:** Admin clicks "Save Rate" after inline editing daily rate.
- **Processing Logic:**
  1. **Backend Dispatch:** `PATCH /api/v1/admin/ad-fee-settings/:id` with `{ daily_rate }`.
  2. **Backend Execution:** Update `daily_rate`; insert audit record into `ad_fee_history`.
  3. **Post-Execution UI:** Table row updates. Show success toast. Package catalog cache invalidated.
- **Exception Handling:**
  - `400 BAD_REQUEST`: Display "Invalid rate value" if rate < 0.

### 5.11 Admin Deactivate Package (`btnDeactivatePackage` onClick)
- **Trigger:** Admin clicks "Deactivate" on a package row.
- **Processing Logic:**
  1. **Confirmation Dialog:** Show confirmation: "This will remove the package from the merchant catalog. Already-purchased ads will not be affected."
  2. **Backend Dispatch:** `DELETE /api/v1/admin/ad-fee-settings/:id`.
  3. **Backend Execution:** Set `is_active = false` on the package.
  4. **Post-Execution UI:** Package row updates (inactive state). Show success toast. Package no longer appears in merchant catalog.
- **Exception Handling:**
  - `404 NOT_FOUND`: Display "Package not found". Refresh table.

### 5.12 Status / Approval Filter Change (`selStatusFilter` / `selApprovalFilter` onChange)
- **Trigger:** Admin or merchant selects a different filter value.
- **Processing Logic:**
  1. Update query parameters.
  2. Re-fetch ad list with new filter.
  3. Reset pagination to page 1.
- **Exception Handling:** None applicable.

### 5.13 Search Input (`txtAdSearch` onChange with debounce 300ms)
- **Trigger:** Merchant types in search input.
- **Processing Logic:**
  1. Debounce 300ms after last keystroke.
  2. Re-fetch ad list with search query.
  3. Reset pagination to page 1.
- **Exception Handling:** None applicable.

### 5.14 Navigation Links
- **Trigger:** User clicks sidebar navigation items.
- **Processing Logic:**
  1. Navigate to target route via React Router.
  2. Reset page state on navigation.
- **Exception Handling:** None applicable.

---

## 6. Validation & Error Message Mapping (バリデーション及びエラーメッセージマッピング)

### 6.1 Package Selection Validation Errors

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-AD-001** | `btnSelectPackage` | Shop not approved (`license_status` is `'pending'` or `'rejected'`) | Info banner at top of page | "Your shop is pending approval. You cannot select an advertising package until your shop is approved." | "ショップの承認が完了していないため、広告パッケージを選択できません" |
| **VAL-AD-002** | `cardPackage` | Selected package is inactive or not found | Dialog error alert | "Selected advertising package is unavailable" | "選択された広告パッケージは利用できません" |
| **AD_PACKAGE_INVALID** | `btnConfirmSelect` | `feeSettingId` does not resolve to an active `ad_fee_settings` record | Dialog error alert | "Selected advertising package is unavailable" | "選択された広告パッケージは利用できません" |

### 6.2 Content Upload Validation Errors

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-AD-010** | `txtAdTitle` | Title is empty | Red border. Text below field. | "Title is required" | "タイトルは必須です" |
| **VAL-AD-011** | `txtAdTitle` | Title exceeds 200 characters | Red border. Text below field. | "Title must not exceed 200 characters" | "タイトルは200文字以内で入力してください" |
| **VAL-AD-012** | `txtAdContent` | Content exceeds 5000 characters | Red border. Text below field. | "Content must not exceed 5000 characters" | "内容は5000文字以内で入力してください" |
| **VAL-AD-013** | `uplAdImage` | Image MIME type is not JPG/PNG/WebP | Inline error on upload zone | "Image must be JPG, PNG, or WebP format" | "画像はJPG、PNG、WebPで入力してください" |
| **VAL-AD-014** | `uplAdImage` | Image exceeds 5MB | Inline error on upload zone | "Image file must not exceed 5MB" | "画像は5MB以内で入力してください" |
| **VAL-AD-015** | `txtLinkUrl` | Link URL format is invalid | Red border. Text below field. | "Invalid URL format" | "URLの形式が不正です" |
| **VAL-AD-016** | `txtLinkUrl` | Link URL exceeds 2048 characters | Red border. Text below field. | "Link URL must not exceed 2048 characters" | "リンクURLは2048文字以内で入力してください" |
| **VAL-AD-017** | `txtAnnouncement` | Announcement message is empty | Red border. Text below field. | "Announcement message is required" | "告知メッセージは必須です" |
| **VAL-AD-018** | `txtAnnouncement` | Announcement message exceeds 500 characters | Red border. Text below field. | "Announcement message must not exceed 500 characters" | "告知メッセージは500文字以内で入力してください" |
| **VAL-AD-019** | `dateStart` | Start date is empty | Red border. Text below field. | "Start date is required" | "開始日は必須です" |
| **VAL-AD-020** | `dateStart` | Start date is in the past | Red border. Text below field. | "Start date must be today or later" | "開始日は今日以降で入力してください" |

### 6.3 Payment Validation Errors

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AD_SCHEDULE_INVALID** | `btnPaySubmit` | Derived `expires_at` could not be computed from package duration | Dialog error alert | "Advertisement schedule is invalid" | "広告期間が不正です" |
| **PAYMENT_FAILED** | `btnPaySubmit` | Payment processing failed | Dialog error alert | "Payment failed. Please try again." | "支払いに失敗しました。もう一度お試しください。" |

### 6.4 Admin Approval/Rejection Validation Errors

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **WEEKLY_LIMIT_REACHED** | `btnApproveAd` | Weekly ad limit (5/week) reached | Alert banner at top of queue | "Weekly advertisement limit reached (max 5)" | "今週の広告枠上限(5件)に達しました" |
| **VAL-AD-030** | `txtRejectReason` | Rejection reason is empty when rejecting | Red border. Text below field. | "Rejection reason is required" | "却下理由は必須です" |
| **VAL-AD-031** | `txtRejectReason` | Rejection reason exceeds 2000 characters | Red border. Text below field. | "Rejection reason must not exceed 2000 characters" | "却下理由は2000文字以内で入力してください" |

### 6.5 Admin Package Management Validation Errors

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-AD-040** | `selPlacement` | No placement selected | Red border. Text below field. | "Placement is required" | "掲載場所は必須です" |
| **VAL-AD-041** | `selTier` | No tier selected | Red border. Text below field. | "Tier is required" | "料金プランは必須です" |
| **VAL-AD-042** | `numCreateDailyRate` | Daily rate is empty or < 0 | Red border. Text below field. | "Daily rate must be 0 or greater" | "日額は0以上で入力してください" |
| **VAL-AD-043** | `numDurationDays` | Duration < 7 or > 30 | Red border. Text below field. | "Duration must be between 7 and 30 days" | "表示日数は7〜30日で入力してください" |
| **VAL-AD-044** | `numMaxAds` | Max ads < 1 | Red border. Text below field. | "Max ads must be at least 1" | "最大枠数は1以上で入力してください" |
| **VAL-AD-045** | `selPlacement` + `selTier` | Duplicate (placement, tier) combination | Dialog error alert | "A package with this placement and tier already exists" | "この掲載場所と料金プランの組み合わせは既に存在します" |

### 6.6 Generic API Error Handling

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **UNAUTHORIZED** | `alertError` | Missing or invalid JWT | Redirect to `/login` | "Please log in to continue" | "続行するにはログインしてください" |
| **FORBIDDEN** | `alertError` | Not ad owner or not admin | Alert banner | "You don't have permission to manage this ad" | "この広告を管理する権限がありません" |
| **NOT_FOUND** | `alertError` | Advertisement not found | Alert banner with refresh option | "Advertisement not found" | "広告が見つかりません" |
| **TOO_MANY_REQUESTS** | `alertError` | Rate limit exceeded | Alert banner | "Too many requests. Please wait {seconds} seconds" | "リクエストが多すぎます。{seconds}秒お待ちください" |
| **INTERNAL_SERVER_ERROR** | `alertError` | Server error | Alert banner | "Something went wrong. Please try again" | "問題が発生しました。もう一度お試しください" |
| **NET_ERR** | `alertError` | Network error | Alert banner | "Network error. Please check your connection" | "ネットワークエラー。接続を確認してください" |

### 6.7 Validation Enforcement Layers

1. **Frontend (Client)**: React Hook Form + Zod schema validation on all forms (package selection, content upload, payment, edit, admin package management).
2. **Backend (Server)**: NestJS ValidationPipe + class-validator DTOs on all endpoints; service-level checks for package resolution, shop approval, content validation, payment, approval/weekly-limit rules, and server-side `expires_at` derivation.
3. **Database (PostgreSQL)**: CHECK constraints `chk_advertisements_dates`, `chk_advertisements_approval_status`, `chk_advertisements_payment_status` as final guards.

---

## 7. Database Field Mapping (データベースフィールドマッピング)

### 7.1 Upload Content Form → Database

| Form Field | API Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| `txtAdTitle` | `title` | `title` | `advertisements` | VARCHAR(255) NOT NULL |
| `txtAdContent` | `content` | `content` | `advertisements` | TEXT (nullable) |
| `uplAdImage` | `image` | `image_url` | `advertisements` | TEXT (nullable) |
| `txtLinkUrl` | `linkUrl` | `link_url` | `advertisements` | TEXT (nullable) |
| `txtAnnouncement` | `announcementMessage` | `announcement_message` | `advertisements` | VARCHAR(500) NOT NULL |
| `dateStart` | `startsAt` | `starts_at` | `advertisements` | TIMESTAMPTZ NOT NULL |
| (system-derived) | — | `expires_at` | `advertisements` | TIMESTAMPTZ NOT NULL |
| (system-derived) | — | `week_number` | `advertisements` | INTEGER NOT NULL |

### 7.2 Package Selection → Database

| API Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- |
| `feeSettingId` (path param) | FK reference to `ad_fee_settings.id` | `advertisements` | UUID |
| (system-created) | `shop_id` | `advertisements` | UUID NOT NULL (FK → `shops.id`) |
| (system-created) | `approval_status` | `advertisements` | VARCHAR(20) DEFAULT 'pending' |
| (system-created) | `payment_status` | `advertisements` | VARCHAR(20) DEFAULT 'pending' |
| (system-created) | `is_active` | `advertisements` | BOOLEAN DEFAULT TRUE |

### 7.3 Payment → Database

| API Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- |
| `paymentReference` | `payment_reference` | `advertisements` | VARCHAR(255) (nullable) |
| (system-created) | `payment_amount` | `advertisements` | DECIMAL(10,2) (nullable) |
| (system-created) | `payment_status` = 'completed' | `advertisements` | VARCHAR(20) |
| (system-created) | `approval_status` = 'pending' | `advertisements` | VARCHAR(20) |
| (ledger) | `amount`, `payment_method`, `payment_status`, `transaction_id`, `paid_at` | `ad_payments` | Various |

### 7.4 Admin Approval → Database

| Action | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- |
| Approve | `approval_status` = 'approved' | `advertisements` | VARCHAR(20) |
| Approve | `approved_by` | `advertisements` | UUID (nullable, FK → `users.id`) |
| Approve | `approved_at` | `advertisements` | TIMESTAMPTZ (nullable) |
| Reject | `approval_status` = 'rejected' | `advertisements` | VARCHAR(20) |
| Reject | `rejection_reason` | `advertisements` | TEXT (nullable) |
| Reject | `approved_by`, `approved_at` | `advertisements` | UUID, TIMESTAMPTZ |
| Reject (refund) | `payment_status` = 'refunded', `refund_amount`, `refund_reason`, `refunded_at` | `ad_payments` | Various |

### 7.5 Admin Package Management → Database

| Action | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- |
| Create | `placement`, `tier`, `daily_rate`, `duration_days`, `max_ads`, `is_active` | `ad_fee_settings` | Various |
| Update Rate | `daily_rate`, `updated_at` | `ad_fee_settings` | DECIMAL(10,2), TIMESTAMPTZ |
| Rate Audit | `ad_fee_setting_id`, `old_daily_rate`, `new_daily_rate`, `changed_by`, `effective_from` | `ad_fee_history` | Various |
| Deactivate | `is_active` = false | `ad_fee_settings` | BOOLEAN |

---

## 8. API Response Mapping (APIレスポンスマッピング)

### 8.1 Package Selection Success Response

```json
{
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "shopId": "f4c5a1b2-3d6e-4f70-8a9b-1c2d3e4f5a6b",
    "title": "",
    "content": null,
    "announcementMessage": "",
    "imageUrl": null,
    "linkUrl": null,
    "isActive": true,
    "approvalStatus": "pending",
    "paymentStatus": "pending",
    "paymentAmount": null,
    "paymentReference": null,
    "approvedBy": null,
    "approvedAt": null,
    "rejectionReason": null,
    "weekNumber": null,
    "startsAt": null,
    "expiresAt": null,
    "createdAt": "2026-08-25T12:00:00.000Z"
  }
}
```

### 8.2 Content Upload Success Response

```json
{
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "shopId": "f4c5a1b2-3d6e-4f70-8a9b-1c2d3e4f5a6b",
    "title": "Summer Skincare Sale",
    "content": "Get 20% off all serums this summer!",
    "announcementMessage": "Summer Sale - 20% Off Serums",
    "imageUrl": "/uploads/ads/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
    "linkUrl": "https://example.com/summer-sale",
    "isActive": true,
    "approvalStatus": "pending",
    "paymentStatus": "pending",
    "paymentAmount": null,
    "paymentReference": null,
    "approvedBy": null,
    "approvedAt": null,
    "rejectionReason": null,
    "weekNumber": null,
    "startsAt": "2026-08-25T00:00:00.000Z",
    "expiresAt": "2026-09-01T00:00:00.000Z",
    "createdAt": "2026-08-25T12:00:00.000Z"
  }
}
```

### 8.3 Payment Success Response

```json
{
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "shopId": "f4c5a1b2-3d6e-4f70-8a9b-1c2d3e4f5a6b",
    "title": "Summer Skincare Sale",
    "content": "Get 20% off all serums this summer!",
    "announcementMessage": "Summer Sale - 20% Off Serums",
    "imageUrl": "/uploads/ads/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
    "linkUrl": "https://example.com/summer-sale",
    "isActive": true,
    "approvalStatus": "pending",
    "paymentStatus": "completed",
    "paymentAmount": "35.00",
    "paymentReference": "TXN-2026-001",
    "approvedBy": null,
    "approvedAt": null,
    "rejectionReason": null,
    "weekNumber": 35,
    "startsAt": "2026-08-25T00:00:00.000Z",
    "expiresAt": "2026-09-01T00:00:00.000Z",
    "createdAt": "2026-08-25T12:00:00.000Z"
  }
}
```

### 8.4 Admin Approve Success Response

```json
{
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "approvalStatus": "approved",
    "approvedBy": "admin-uuid-here",
    "approvedAt": "2026-08-25T14:00:00.000Z",
    "paymentStatus": "completed"
  }
}
```

### 8.5 Admin Reject Success Response

```json
{
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "approvalStatus": "rejected",
    "rejectionReason": "Image quality is too low for platform display",
    "approvedBy": "admin-uuid-here",
    "approvedAt": "2026-08-25T14:00:00.000Z",
    "paymentStatus": "refunded"
  }
}
```

### 8.6 Package Catalog Response

```json
{
  "data": [
    {
      "id": "uuid",
      "placement": "homepage_slider",
      "tier": "basic",
      "dailyRate": "3.00",
      "durationDays": 7,
      "maxAds": 1,
      "totalFee": "21.00"
    },
    {
      "id": "uuid",
      "placement": "homepage_slider",
      "tier": "standard",
      "dailyRate": "5.00",
      "durationDays": 7,
      "maxAds": 1,
      "totalFee": "35.00"
    }
  ]
}
```

### 8.7 Fee Settings Response (Admin)

```json
{
  "data": [
    {
      "id": "uuid",
      "placement": "homepage_slider",
      "tier": "basic",
      "dailyRate": "3.00",
      "durationDays": 7,
      "maxAds": 1,
      "isActive": true,
      "createdAt": "2026-08-03T00:00:00.000Z",
      "updatedAt": "2026-08-25T00:00:00.000Z"
    }
  ]
}
```

### 8.8 Paginated Ad List Response

```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "shopId": "f4c5a1b2-3d6e-4f70-8a9b-1c2d3e4f5a6b",
      "title": "Summer Skincare Sale",
      "approvalStatus": "approved",
      "paymentStatus": "completed",
      "isActive": true,
      "createdAt": "2026-08-25T12:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 12,
    "totalPages": 1
  }
}
```

---

## 9. i18n Keys Reference (i18nキーリファレンス)

### 9.1 English (en) — Merchant Advertisement Management

| Key | Value |
| :--- | :--- |
| `merchant.ads.title` | "Advertisements" |
| `merchant.ads.subtitle` | "Select an advertising package, upload your content, and manage your advertisements." |
| `merchant.ads.pendingBanner` | "Your shop is pending approval. You can browse packages and view your ads, but you cannot select a package until your shop is approved." |
| `merchant.ads.statActive` | "Active Ads" |
| `merchant.ads.statPending` | "Pending Approval" |
| `merchant.ads.statExpired` | "Expired" |
| `merchant.ads.catalog` | "Available Packages" |
| `merchant.ads.select` | "Select" |
| `merchant.ads.tier.basic` | "Basic" |
| `merchant.ads.tier.standard` | "Standard" |
| `merchant.ads.tier.premium` | "Premium" |
| `merchant.ads.dailyRate` | "Daily Rate" |
| `merchant.ads.duration` | "Duration" |
| `merchant.ads.maxAds` | "Max Ads" |
| `merchant.ads.totalFee` | "Total Fee" |
| `merchant.ads.filterStatus` | "Status" |
| `merchant.ads.filterApproval` | "Approval Status" |
| `merchant.ads.search` | "Search ads..." |
| `merchant.ads.status.draft` | "Draft" |
| `merchant.ads.status.content_uploaded` | "Content Uploaded" |
| `merchant.ads.status.pending` | "Pending Approval" |
| `merchant.ads.status.approved` | "Approved" |
| `merchant.ads.status.rejected` | "Rejected" |
| `merchant.ads.payment.pending` | "Payment Pending" |
| `merchant.ads.payment.completed` | "Paid" |
| `merchant.ads.payment.refunded` | "Refunded" |
| `merchant.ads.schedule` | "Schedule" |
| `merchant.ads.rejectionReason` | "Rejection Reason" |
| `merchant.ads.payFee` | "Pay Fee" |
| `merchant.ads.resubmit` | "Resubmit" |
| `merchant.ads.edit` | "Edit" |
| `merchant.ads.delete` | "Delete" |
| `merchant.ads.toggleActive` | "Toggle Active" |
| `merchant.ads.selectTitle` | "Select Advertising Package" |
| `merchant.ads.confirmSelect` | "Confirm Selection" |
| `merchant.ads.uploadTitle` | "Upload Advertisement Content" |
| `merchant.ads.placement` | "Placement" |
| `merchant.ads.tier` | "Tier" |
| `merchant.ads.titlePlaceholder` | "Enter advertisement title" |
| `merchant.ads.contentPlaceholder` | "Enter advertisement content" |
| `merchant.ads.image` | "Advertisement Image" |
| `merchant.ads.linkUrlPlaceholder` | "https://example.com" |
| `merchant.ads.announcementPlaceholder` | "Enter banner announcement message" |
| `merchant.ads.startDate` | "Start Date" |
| `merchant.ads.endDate` | "End Date" |
| `merchant.ads.fee` | "Fee Summary" |
| `merchant.ads.saveContinue` | "Save & Continue" |
| `merchant.ads.payTitle` | "Pay Advertising Fee" |
| `merchant.ads.paymentRef` | "Payment Reference" |
| `merchant.ads.paySubmit` | "Pay & Submit" |
| `merchant.ads.editTitle` | "Edit Advertisement Content" |
| `merchant.ads.save` | "Save" |
| `merchant.ads.savePay` | "Save & Pay" |
| `merchant.ads.export` | "Export CSV" |
| `common.cancel` | "Cancel" |
| `common.close` | "Close" |
| `common.prev` | "Previous" |
| `common.next` | "Next" |
| `common.pageInfo` | "Page {page} of {totalPages} · {total} ads" |

### 9.2 English (en) — Admin Advertisement Management

| Key | Value |
| :--- | :--- |
| `admin.ads.title` | "Advertisement Moderation" |
| `admin.ads.weeklyLimit` | "{count} of 5 active ads this week" |
| `admin.ads.pendingQueue` | "Pending Approval Queue" |
| `admin.ads.shopName` | "Shop" |
| `admin.ads.feeInfo` | "Fee Info" |
| `admin.ads.approve` | "Approve" |
| `admin.ads.reject` | "Reject" |
| `admin.ads.rejectReason` | "Rejection reason" |
| `admin.ads.all` | "All Advertisements" |
| `admin.ads.feeSettings` | "Advertisement Packages" |
| `admin.ads.newPackage` | "New Package" |
| `admin.ads.createPkgTitle` | "Create Advertisement Package" |
| `admin.ads.placement` | "Placement" |
| `admin.ads.tier` | "Tier" |
| `admin.ads.dailyRate` | "Daily Rate" |
| `admin.ads.durationDays` | "Duration (days)" |
| `admin.ads.maxAds` | "Max Ads" |
| `admin.ads.saveRate` | "Save Rate" |
| `admin.ads.feeHistory` | "History" |
| `admin.ads.deactivate` | "Deactivate" |
| `admin.ads.createPkg` | "Create Package" |

### 9.3 Japanese (ja) — Merchant Advertisement Management

| Key | Value |
| :--- | :--- |
| `merchant.ads.title` | "広告管理" |
| `merchant.ads.subtitle` | "広告パッケージを選択し、コンテンツをアップロードして、広告を管理します。" |
| `merchant.ads.pendingBanner` | "ショップの承認が完了していないため、広告パッケージを選択できません。パッケージの閲覧と広告の表示は可能です。" |
| `merchant.ads.statActive` | "掲載中" |
| `merchant.ads.statPending` | "承認待ち" |
| `merchant.ads.statExpired` | "期限切れ" |
| `merchant.ads.catalog` | "利用可能なパッケージ" |
| `merchant.ads.select` | "選択" |
| `merchant.ads.tier.basic` | "ベーシック" |
| `merchant.ads.tier.standard` | "スタンダード" |
| `merchant.ads.tier.premium` | "プレミアム" |
| `merchant.ads.dailyRate` | "日額" |
| `merchant.ads.duration` | "表示日数" |
| `merchant.ads.maxAds` | "最大枠数" |
| `merchant.ads.totalFee` | "合計料金" |
| `merchant.ads.filterStatus` | "ステータス" |
| `merchant.ads.filterApproval` | "承認状態" |
| `merchant.ads.search` | "広告を検索..." |
| `merchant.ads.status.draft` | "下書き" |
| `merchant.ads.status.content_uploaded` | "コンテンツアップロード済み" |
| `merchant.ads.status.pending` | "承認待ち" |
| `merchant.ads.status.approved` | "承認済み" |
| `merchant.ads.status.rejected` | "却下" |
| `merchant.ads.payment.pending` | "支払い待ち" |
| `merchant.ads.payment.completed` | "支払い済み" |
| `merchant.ads.payment.refunded` | "返金済み" |
| `merchant.ads.schedule` | "スケジュール" |
| `merchant.ads.rejectionReason` | "却下理由" |
| `merchant.ads.payFee` | "料金を支払う" |
| `merchant.ads.resubmit` | "再提出" |
| `merchant.ads.edit` | "編集" |
| `merchant.ads.delete` | "削除" |
| `merchant.ads.toggleActive` | "掲載切替" |
| `merchant.ads.selectTitle` | "広告パッケージを選択" |
| `merchant.ads.confirmSelect` | "選択を確認" |
| `merchant.ads.uploadTitle` | "広告コンテンツをアップロード" |
| `merchant.ads.placement` | "掲載場所" |
| `merchant.ads.tier` | "料金プラン" |
| `merchant.ads.titlePlaceholder` | "広告タイトルを入力" |
| `merchant.ads.contentPlaceholder` | "広告内容を入力" |
| `merchant.ads.image` | "広告画像" |
| `merchant.ads.linkUrlPlaceholder` | "https://example.com" |
| `merchant.ads.announcementPlaceholder` | "バナー告知メッセージを入力" |
| `merchant.ads.startDate` | "開始日" |
| `merchant.ads.endDate` | "終了日" |
| `merchant.ads.fee` | "料金概要" |
| `merchant.ads.saveContinue` | "保存して次へ" |
| `merchant.ads.payTitle` | "広告料金を支払う" |
| `merchant.ads.paymentRef` | "支払い参照" |
| `merchant.ads.paySubmit` | "支払い＆送信" |
| `merchant.ads.editTitle` | "広告コンテンツを編集" |
| `merchant.ads.save` | "保存" |
| `merchant.ads.savePay` | "保存して支払い" |
| `merchant.ads.export` | "CSV出力" |
| `common.cancel` | "キャンセル" |
| `common.close` | "閉じる" |
| `common.prev` | "前へ" |
| `common.next` | "次へ" |
| `common.pageInfo` | "ページ {page} / {totalPages} · {total} 件" |

### 9.4 Japanese (ja) — Admin Advertisement Management

| Key | Value |
| :--- | :--- |
| `admin.ads.title` | "広告モデレーション" |
| `admin.ads.weeklyLimit` | "今週の掲載中: {count} / 5 件" |
| `admin.ads.pendingQueue` | "承認待ちキュー" |
| `admin.ads.shopName` | "ショップ" |
| `admin.ads.feeInfo` | "料金情報" |
| `admin.ads.approve` | "承認" |
| `admin.ads.reject` | "却下" |
| `admin.ads.rejectReason` | "却下理由" |
| `admin.ads.all` | "全広告" |
| `admin.ads.feeSettings` | "広告パッケージ" |
| `admin.ads.newPackage` | "新規パッケージ" |
| `admin.ads.createPkgTitle` | "広告パッケージを作成" |
| `admin.ads.placement` | "掲載場所" |
| `admin.ads.tier` | "料金プラン" |
| `admin.ads.dailyRate` | "日額" |
| `admin.ads.durationDays` | "表示日数" |
| `admin.ads.maxAds` | "最大枠数" |
| `admin.ads.saveRate` | "料金を保存" |
| `admin.ads.feeHistory` | "履歴" |
| `admin.ads.deactivate` | "無効化" |
| `admin.ads.createPkg` | "パッケージを作成" |

---

## 10. Shared Components (共有コンポーネント)

### 10.1 MerchantLayout Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/layouts/MerchantLayout.tsx` |
| **Purpose** | Shared layout wrapper for Merchant pages with sidebar navigation |

### 10.2 AdminLayout Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/layouts/AdminLayout.tsx` |
| **Purpose** | Shared layout wrapper for Admin pages with sidebar navigation |

### 10.3 Alert Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/alert.tsx` |
| **Variants** | `default`, `destructive`, `success`, `info` |
| **Usage** | Error/success/info banners at top of pages and dialogs |

### 10.4 Badge Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/badge.tsx` |
| **Variants** | `default`, `secondary`, `destructive`, `outline` |
| **Usage** | Approval/payment status badges on ad cards |

### 10.5 Dialog Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/dialog.tsx` |
| **Purpose** | Modal dialogs for package selection, content upload, payment, edit, admin package creation |

### 10.6 Switch Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/switch.tsx` |
| **Usage** | Toggle active/inactive on approved ad cards |

### 10.7 Table Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/table.tsx` |
| **Usage** | Admin fee settings table, all ads table |

### 10.8 Select Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/select.tsx` |
| **Usage** | Status filters, placement/tier selects in admin package creation |

### 10.9 DatePicker Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/date-picker.tsx` |
| **Usage** | Start date selection in Upload Content dialog |

---

## 11. Special UI Notes & Styling Constraints (特記事項・UI仕様)

- **Design System:** Luxury Cosmetics Theme — Primary `#7C3AED` (Purple), Accent `#EC4899` (Pink), Secondary `#F3E8FF` (Lavender). See Development Rules §9.2.
- **Responsive Viewport Design:** Full dashboard layout on desktop (sidebar + content), single-column on mobile. Dialogs become full-screen sheets on mobile.
- **Accessibility:** Every control must be keyboard navigable. ARIA labels required on all interactive elements. Error messages must be announced via `role="alert"`. Focus trap within dialogs when open. ESC key closes dialogs.
- **Performance:** Package catalog and ad list use skeleton loaders during initial load. Buttons display spinner during async operations. Active ads API targets ≤ 100ms (cache hit), ≤ 500ms (cache miss).
- **Security:** All user input is sanitized to prevent XSS. AutoComplete attributes set correctly on form fields. File uploads validated on both client and server (MIME type, size).
- **Design Tokens:** Status badges use standard color mapping — success: `bg-green-100 text-green-800`, error: `bg-red-100 text-red-800`, warning: `bg-amber-100 text-amber-800`, info: `bg-blue-100 text-blue-800`.
- **Image Handling:** Ad images served via API endpoint or signed URLs, never exposed as raw filesystem paths. UUID-based filenames (`{uuid}.{ext}`).
- **Caching:** Active ads cached in Redis (`cache:ads:active`) with 5-minute TTL. Package catalog cached (`cache:ads:packages`) with 10-minute TTL. Cache invalidated on any mutation.

---

## 12. Testing Checklist (テストチェックリスト)

### 12.1 Package Catalog Tests

- [ ] Active packages loaded from `GET /ads/packages`
- [ ] Package cards display placement, tier, rate, duration, max ads, total fee
- [ ] Tier badges display correct colors (basic/standard/premium)
- [ ] Select button disabled for pending merchants
- [ ] Info banner shown for pending merchants
- [ ] Select button enabled for approved merchants
- [ ] Package selection confirmation dialog shows correct package details
- [ ] Confirm selection creates draft ad (201 response)
- [ ] Cancel selection closes dialog without changes
- [ ] Package catalog cache invalidated on admin rate update

### 12.2 Content Upload Tests

- [ ] Title required validation (empty → error)
- [ ] Title max length (200 chars) enforced
- [ ] Content optional (can be empty)
- [ ] Content max length (5000 chars) enforced
- [ ] Image upload accepts JPG/PNG/WebP
- [ ] Image upload rejects non-image files with error (VAL-AD-013)
- [ ] Image upload rejects files > 5MB with error (VAL-AD-014)
- [ ] Image preview shown after upload
- [ ] Link URL optional (can be empty)
- [ ] Link URL format validation works
- [ ] Announcement message required validation (empty → error)
- [ ] Announcement message max length (500 chars) enforced
- [ ] Start date picker defaults to today
- [ ] Start date rejects past dates
- [ ] End date auto-calculated and displayed as read-only
- [ ] Fee summary displayed correctly
- [ ] Save & Continue creates content (PATCH /ads/:id/content)
- [ ] On success, ad moves to CONTENT_UPLOADED state
- [ ] Pay Fee button becomes available after content upload
- [ ] Cancel closes dialog without saving
- [ ] Loading state shown during submission

### 12.3 Payment Tests

- [ ] Payment confirmation dialog shows fee summary
- [ ] Pay & Submit processes payment (POST /ads/:id/pay)
- [ ] On success, ad moves to PENDING_APPROVAL state
- [ ] Payment status badge updates to "Paid"
- [ ] Ad appears in admin approval queue
- [ ] Payment failure shows error in dialog
- [ ] Cancel closes dialog without processing
- [ ] Loading state shown during payment processing

### 12.4 Advertisement Management Tests

- [ ] Ad list loads with pagination (20 per page)
- [ ] Status filter works (All/Active/Expired/Inactive)
- [ ] Approval status filter works (All/Pending/Approved/Rejected)
- [ ] Search within own ads works
- [ ] Ad cards display thumbnail, title, badges, content preview, schedule
- [ ] Rejection reason shown on rejected ads
- [ ] Edit button shown on content_uploaded (content IS NOT NULL, payment_status = pending) or rejected ads
- [ ] Delete button shown on content_uploaded (content IS NOT NULL, payment_status = pending) or inactive (is_active = false) ads
- [ ] Toggle switch shown on approved/paid ads
- [ ] Delete confirmation dialog shown before soft-delete
- [ ] Toggle switch updates `is_active` immediately
- [ ] Pagination navigation works (prev/next)
- [ ] Page info displays correctly

### 12.5 Edit Content Tests

- [ ] Edit dialog pre-fills current content values
- [ ] Image upload shows current image preview
- [ ] Save button shown for content_uploaded (content IS NOT NULL, payment_status = pending) ads
- [ ] Save & Pay button shown for rejected ads
- [ ] Save updates content without changing state
- [ ] Save & Pay updates content then opens payment dialog
- [ ] All validation rules same as content upload
- [ ] Cancel closes dialog without changes

### 12.6 Resubmission Tests

- [ ] Resubmit button shown on rejected ads
- [ ] Clicking resubmit opens edit dialog in resubmit mode
- [ ] After editing, Save & Pay button available
- [ ] Payment processes fresh fee for resubmission
- [ ] Ad returns to PENDING_APPROVAL after resubmission payment

### 12.7 Admin Moderation Tests

- [ ] Pending approval queue loads with pending ads
- [ ] Pending cards display full ad preview
- [ ] Weekly limit indicator shows correct count
- [ ] Approve button processes approval (PATCH /admin/ads/:id/approve)
- [ ] Approval validates weekly limit (max 5)
- [ ] Weekly limit exceeded shows error (WEEKLY_LIMIT_REACHED)
- [ ] Reject button shows reason textarea
- [ ] Reject without reason shows validation error (VAL-AD-030)
- [ ] Reject with reason processes rejection (PATCH /admin/ads/:id/reject)
- [ ] Auto-refund triggered on rejection
- [ ] Ad removed from pending queue after approve/reject
- [ ] All ads table loads with filterable columns

### 12.8 Admin Package Management Tests

- [ ] Fee settings table loads all packages
- [ ] New Package button opens create dialog
- [ ] Create dialog validates all fields
- [ ] Create package persists via POST /admin/ad-fee-settings
- [ ] Duplicate (placement, tier) rejected with error
- [ ] Duration days validated (7–30)
- [ ] Max ads validated (≥ 1)
- [ ] Daily rate inline edit works
- [ ] Save rate persists via PATCH /admin/ad-fee-settings/:id
- [ ] Rate change logged to ad_fee_history
- [ ] Deactivate button shows confirmation dialog
- [ ] Deactivate sets `is_active = false`
- [ ] Deactivated package removed from merchant catalog
- [ ] Fee history dialog shows audit trail
- [ ] Loading states shown during all operations

### 12.9 Error Handling Tests

- [ ] 401 Unauthorized redirects to `/login`
- [ ] 403 Forbidden shows permission error
- [ ] 404 Not Found shows not found error
- [ ] 409 Conflict shows appropriate conflict error
- [ ] 413 Payload Too Large shows file size error
- [ ] 415 Unsupported Media Type shows format error
- [ ] 429 Too Many Requests shows rate limit error
- [ ] 500 Internal Server Error shows generic error
- [ ] Network error shows connection error

### 12.10 i18n Tests

- [ ] All English labels render correctly
- [ ] All Japanese labels render correctly (when locale switched)
- [ ] Language toggle switches all ad management labels
- [ ] Error messages display in correct language
- [ ] Status badges display in correct language

### 12.11 Responsive Design Tests

- [ ] Desktop layout: sidebar + content, 3-4 column package grid
- [ ] Tablet layout: collapsed sidebar, 2-column package grid
- [ ] Mobile layout: single-column cards, full-screen dialogs
- [ ] All tables horizontally scrollable on mobile
- [ ] All forms usable on mobile (touch targets ≥ 44px)
- [ ] Keyboard navigation works throughout

---

*End of Screen Items Specification (Advertisement Management)*
