# Screen Items Specification (画面項目設計書) — Review & Content Moderation

**Document ID:** SKM-SIS-SCR-003  
**Target Screen:** Review & Content Moderation (レビュー・コンテンツ管理)  
**Subsystem:** Administration — Review Moderation & Content Management  
**Function ID:** FN-MOD-001  
**Version:** 1.0  
**Created:** 2026-08-08  
**Last Updated:** 2026-08-08  
**Author:** Senior System Engineer  
**Review Status:** Approved (承認済み)  
**Classification:** Internal — Engineering Division

---

## 1. Document Control (ドキュメント管理)

### 1.1 Document Revision History

| Version | Date | Author | Description of Changes |
| :--- | :--- | :--- | :--- |
| 1.0 | 2026-08-08 | Senior System Engineer | Initial release. Screen items specification for Review & Content Moderation covering reviews dashboard, review detail modal, merchants management, merchant detail modal, and user moderation actions. |

### 1.2 Related Documents

| No. | Document ID | Document Name | File Path | Remarks |
| :-- | :--- | :--- | :--- | :--- |
| 1 | SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | Business workflow logic, required fields, and rules. |
| 2 | SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | Table structures (`reviews`, `products`, `shops`, `users`), constraints. |
| 3 | SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | Security rules, design tokens, error responses. |
| 4 | SKM-FDS-MOD-001 | Functional Specification — Review & Content Moderation | `docs/screen/ReviewContentModeration/機能設計書_Review_Content_Moderation.md` | Use cases, state transitions, validation rules, error handling. |

---

## 2. Screen Overview & Purpose (画面概要・目的)

### 2.1 Purpose (目的)
The Review & Content Moderation screens serve as the central administration hub for maintaining platform integrity. They enable administrators to moderate product reviews (approve/reject/delete), manage merchant registrations (approve/reject), and perform user account moderation (activate/deactivate). All actions are protected by admin-only RBAC enforcement.

### 2.2 Target Users & Roles (対象ユーザーと権限)

| Attribute | Value |
| :--- | :--- |
| **Primary Actors** | Platform Administrator (管理者) |
| **Required Authentication** | JWT Bearer Token with `admin` role |
| **Data Scope** | All reviews, products, merchants, and user accounts |
| **Access Control** | Protected routes — `JwtAuthGuard` + `RolesGuard` (`admin`) |

### 2.3 Core Functions & Basic Design Principles (主要機能・基本設計方針)
1. **Review Moderation** — View, approve, reject, and delete product reviews with audit logging.
2. **Merchant Registration Management** — Approve or reject merchant shop registrations.
3. **User Account Moderation** — Activate or deactivate user accounts for policy violations.
4. **Real-Time Feedback** — Toast notifications for all moderation actions.
5. **Confirmation Dialogs** — Required for all destructive actions (delete, reject).
6. **Pagination & Filtering** — Tab-based status filters with server-side pagination.
7. **Internationalization** — Full i18n support for EN, JA, MY.

---

## 3. Screen Layout (画面レイアウト構成)

### 3.1 Overall Page Structure (全体画面構成)

#### Reviews Dashboard Layout (`/admin/reviews`)
```text
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [A] ADMIN SIDEBAR                   │   │
│  │   Dashboard / Users / Merchants / Reviews / ...  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [B] PAGE HEADER                     │   │
│  │   Page Title: "Review Moderation"                │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [C] STATS BAR (cond.)               │   │
│  │   Total | Pending | Approved | Rejected          │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [D] FILTER TABS                     │   │
│  │   All | Pending | Approved | Rejected            │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │   [E] SEARCH + SORT BAR                         │   │
│  │   [Search Input] [Sort Dropdown] [Bulk Actions]  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [F] REVIEWS TABLE                   │   │
│  │   Checkbox | Avatar | User | Product | Rating    │   │
│  │   Title | Status Badge | Date | Actions Dropdown │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [G] PAGINATION                      │   │
│  │   < 1 2 3 ... 10 >    Page Size: [20]           │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Review Detail Modal Layout
```text
┌─────────────────────────────────────────────────────────┐
│                    MODAL OVERLAY                         │
│              ┌─────────────────────────────┐            │
│              │   [H] MODAL HEADER          │            │
│              │   "Review Detail"  [X Close] │            │
│              ├─────────────────────────────┤            │
│              │                             │            │
│              │   [I] USER INFO CARD        │            │
│              │   Avatar | Name | Email     │            │
│              │   Review Count              │            │
│              │                             │            │
│              │   [J] PRODUCT INFO CARD     │            │
│              │   Image | Name | Price      │            │
│              │   Link to product detail    │            │
│              │                             │            │
│              │   [K] REVIEW CONTENT        │            │
│              │   Rating Stars | Title      │            │
│              │   Body Text | Images        │            │
│              │   Verified Purchase Badge   │            │
│              │                             │            │
│              │   [L] MODERATION REASON     │            │
│              │   Textarea (conditional)    │            │
│              │                             │            │
│              │   [M] ACTION BUTTONS        │            │
│              │   [Approve] [Reject] [Delete]│            │
│              └─────────────────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

#### Merchants Management Layout (`/admin/merchants`)
```text
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [N] PAGE HEADER                     │   │
│  │   Page Title: "Merchant Management"              │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [O] FILTER TABS                     │   │
│  │   All | Pending Approval | Approved | Rejected   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │   [P] SEARCH BAR                                │   │
│  │   [Search Input]                                 │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [Q] MERCHANTS TABLE                 │   │
│  │   Checkbox | Logo | Shop Name | User Name        │   │
│  │   Registration Date | Status Badge | Actions     │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [R] PAGINATION                      │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Merchant Detail Modal Layout
```text
┌─────────────────────────────────────────────────────────┐
│                    MODAL OVERLAY                         │
│              ┌─────────────────────────────┐            │
│              │   [S] MODAL HEADER          │            │
│              │   "Merchant Detail" [X Close]│            │
│              ├─────────────────────────────┤            │
│              │                             │            │
│              │   [T] SHOP INFO CARD        │            │
│              │   Logo | Banner | Name      │            │
│              │   Description               │            │
│              │                             │            │
│              │   [U] LICENSE VIEWER        │            │
│              │   PDF Display / Download    │            │
│              │                             │            │
│              │   [V] USER INFO CARD        │            │
│              │   Name | Email | Phone      │            │
│              │   Registration Date         │            │
│              │                             │            │
│              │   [W] REJECTION REASON      │            │
│              │   Textarea (conditional)    │            │
│              │                             │            │
│              │   [X] ACTION BUTTONS        │            │
│              │   [Approve] [Reject]        │            │
│              └─────────────────────────────┘            │
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

### 4.1 Section [B]: Page Header — Reviews (ページヘッダー — レビュー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 1 | `lblReviewsTitle` | Page Title | Static Label (`<h1>`) | String | — | Visible. Text: "Review Moderation" | — | i18n key: `admin.reviews.title` | Tailwind: `text-2xl font-bold`. |

### 4.2 Section [C]: Stats Bar (統計バー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 2 | `statTotalReviews` | Total Reviews Count | Stats Card | Integer | — | Populated on load | — | `COUNT(reviews)` | Tailwind: `bg-white rounded-lg p-4 shadow-sm`. |
| 3 | `statPendingCount` | Pending Reviews Count | Stats Card | Integer | — | Populated on load | — | `COUNT(reviews WHERE is_approved IS NULL)` | Amber badge for pending count. |
| 4 | `statApprovedCount` | Approved Reviews Count | Stats Card | Integer | — | Populated on load | — | `COUNT(reviews WHERE is_approved = TRUE)` | Green badge. |
| 5 | `statRejectedCount` | Rejected Reviews Count | Stats Card | Integer | — | Populated on load | — | `COUNT(reviews WHERE is_approved = FALSE)` | Red badge. |

### 4.3 Section [D]: Filter Tabs — Reviews (フィルタタブ — レビュー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 6 | `tabFilterReviews` | Filter Tabs | Tab Group | Enum | — | Default: "All" | Options: All, Pending, Approved, Rejected | — | i18n key: `admin.reviews.tabs`. Updates query params on change. |

### 4.4 Section [E]: Search + Sort Bar (検索・ソートバー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 7 | `txtReviewSearch` | Search Reviews Input | Input (`text`) | String(255) | No | Empty. Placeholder: "Search reviews..." | MaxLength: 255 | — | i18n key: `admin.reviews.search`. Debounced (300ms). |
| 8 | `selReviewSort` | Sort Reviews Dropdown | Select | Enum | No | Default: `createdAt desc` | Options: Newest, Oldest, Rating (High-Low), Rating (Low-High) | — | i18n key: `admin.reviews.sort`. |
| 9 | `btnBulkApprove` | Approve Selected Button | Button (`outline`) | — | No | Disabled (no selection) | — | — | Enabled when checkboxes selected. |
| 10 | `btnBulkReject` | Reject Selected Button | Button (`outline`) | — | No | Disabled (no selection) | — | — | Opens reason modal when clicked. |
| 11 | `btnBulkDelete` | Delete Selected Button | Button (`destructive`) | — | No | Disabled (no selection) | — | — | Requires confirmation dialog. |

### 4.5 Section [F]: Reviews Table (レビューテーブル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 12 | `chkSelectAllReviews` | Select All Checkbox | Checkbox | Boolean | No | Unchecked | — | — | Toggles all row checkboxes. |
| 13 | `chkSelectReview` | Select Review Checkbox | Checkbox | Boolean | No | Per-row. Unchecked | — | — | Enables bulk action buttons. |
| 14 | `imgUserAvatar` | User Avatar | Avatar | URL | — | User avatar or default placeholder | — | `users.avatar_url` | `h-8 w-8 rounded-full`. |
| 15 | `lblUserName` | User Name | Static Label | String | — | Populated from DB | — | `users.name` | `font-medium text-sm`. |
| 16 | `lblProductName` | Product Name | Static Label | String | — | Populated from DB | — | `products.name` | `text-sm text-muted-foreground`. |
| 17 | `ratingStars` | Rating Display | Star Rating | Integer (1-5) | — | Populated from DB | — | `reviews.rating` | 1-5 star display with Beauty Pink (#EC4899). |
| 18 | `lblReviewTitle` | Review Title | Static Label | String | — | Populated from DB or "—" | — | `reviews.title` | Truncated at 50 chars. |
| 19 | `badgeReviewStatus` | Review Status Badge | Badge | Enum | — | Green (Approved), Red (Rejected), Amber (Pending) | — | `reviews.is_approved` | Standard status badge colors. |
| 20 | `lblCreatedDate` | Created Date | Static Label | DateTime | — | ISO 8601 formatted | — | `reviews.created_at` | Localized date format via i18n. |
| 21 | `ddlReviewActions` | Actions Dropdown | Dropdown Menu | — | — | Collapsed | Options: View Detail, Approve, Reject, Delete | — | Destructive actions show confirmation. |

### 4.6 Section [G]: Pagination — Reviews (ページネーション — レビュー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 22 | `pagReviews` | Reviews Pagination | Pagination | — | — | Page 1, Total pages from API | — | API response `meta.totalPages` | Page size selector: 20, 50, 100. |

### 4.7 Section [H]: Review Detail Modal Header (レビューモーダルヘッダー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 23 | `lblReviewDetailTitle` | Modal Title | Static Label (`<h2>`) | String | — | Text: "Review Detail" | — | i18n key: `admin.reviews.detail.title` | `text-lg font-semibold`. |
| 24 | `btnCloseReviewModal` | Close Modal Button | Icon Button | — | — | Visible. X icon. | — | — | Closes modal. Escape key also closes. |

### 4.8 Section [I]: User Info Card in Review Modal (レビューモーダル内ユーザーカード)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 25 | `imgReviewUserAvatar` | User Avatar | Avatar | URL | — | User avatar or default placeholder | — | `users.avatar_url` | `h-10 w-10 rounded-full`. |
| 26 | `lblReviewUserName` | User Name | Static Label | String | — | Populated from DB | — | `users.name` | `font-semibold`. |
| 27 | `lblReviewUserEmail` | User Email | Static Label | String | — | Populated from DB | — | `users.email` | `text-sm text-muted-foreground`. |
| 28 | `lblReviewUserCount` | User Review Count | Static Label | Integer | — | Populated from DB | — | `COUNT(reviews WHERE user_id = :id)` | Text: "X reviews". |

### 4.9 Section [J]: Product Info Card in Review Modal (レビューモーダル内製品カード)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 29 | `imgReviewProduct` | Product Image | Image | URL | — | First product image | — | `products.images[0]` | `h-16 w-16 rounded object-cover`. |
| 30 | `lblReviewProductName` | Product Name | Static Label (Link) | String | — | Populated from DB | — | `products.name` | Links to `/products/:slug`. |
| 31 | `lblReviewProductPrice` | Product Price | Static Label | Decimal | — | Formatted with currency | — | `products.price` | Localized currency format. |

### 4.10 Section [K]: Review Content in Modal (モーダル内レビュー内容)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 32 | `ratingReviewDetail` | Review Rating | Star Rating | Integer (1-5) | — | Populated from DB | — | `reviews.rating` | Read-only display. |
| 33 | `lblReviewDetailTitleValue` | Review Title | Static Label | String | — | Populated from DB or "—" | — | `reviews.title` | `font-semibold`. |
| 34 | `lblReviewBody` | Review Body | Static Label (`<p>`) | Text | — | Populated from DB or "—" | — | `reviews.body` | `text-sm whitespace-pre-wrap`. |
| 35 | `galleryReviewImages` | Review Images | Image Gallery | Array[URL] | No | Grid layout of images | — | `reviews.images` | `grid grid-cols-3 gap-2`. Max 10 images. |
| 36 | `badgeVerifiedPurchase` | Verified Purchase Badge | Badge | — | No | Shown if `is_verified_purchase = true` | — | `reviews.is_verified_purchase` | Text: "Verified Purchase". Green badge. |

### 4.11 Section [L]: Moderation Reason Input (モデレーション理由入力)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 37 | `lblModerationReason` | Moderation Reason Label | Static Label (`<label>`) | String | — | Visible only when Reject is clicked. Text: "Reason for Rejection" | — | i18n key: `admin.moderation.reason` | Required for rejection. |
| 38 | `txtModerationReason` | Moderation Reason Textarea | Textarea | String(500) | Conditional | Empty. Placeholder: "Enter reason..." | MaxLength: 500. Required when rejecting. | — | `min-h-[80px]`. Character count shown. |

### 4.12 Section [M]: Review Modal Action Buttons (レビューモーダルアクションボタン)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 39 | `btnApproveReview` | Approve Button | Button (`submit`, `default`) | — | — | Visible. Text: "Approve" | — | — | i18n key: `admin.moderation.approve`. Full width. |
| 40 | `btnRejectReview` | Reject Button | Button (`destructive`) | — | — | Visible. Text: "Reject" | — | — | i18n key: `admin.moderation.reject`. Shows reason textarea. |
| 41 | `btnDeleteReview` | Delete Button | Button (`destructive`) | — | — | Visible. Text: "Delete" | — | — | i18n key: `admin.moderation.delete`. Requires confirmation. |

### 4.13 Section [N]: Page Header — Merchants (ページヘッダー — 出品者)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 42 | `lblMerchantsTitle` | Page Title | Static Label (`<h1>`) | String | — | Visible. Text: "Merchant Management" | — | i18n key: `admin.merchants.title` | `text-2xl font-bold`. |

### 4.14 Section [O]: Filter Tabs — Merchants (フィルタタブ — 出品者)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 43 | `tabFilterMerchants` | Filter Tabs | Tab Group | Enum | — | Default: "All" | Options: All, Pending Approval, Approved, Rejected | — | i18n key: `admin.merchants.tabs`. |

### 4.15 Section [P]: Search Bar — Merchants (検索バー — 出品者)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 44 | `txtMerchantSearch` | Search Merchants Input | Input (`text`) | String(255) | No | Empty. Placeholder: "Search merchants..." | MaxLength: 255 | — | i18n key: `admin.merchants.search`. Debounced (300ms). |

### 4.16 Section [Q]: Merchants Table (出品者テーブル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 45 | `chkSelectAllMerchants` | Select All Checkbox | Checkbox | Boolean | No | Unchecked | — | — | Toggles all row checkboxes. |
| 46 | `chkSelectMerchant` | Select Merchant Checkbox | Checkbox | Boolean | No | Per-row. Unchecked | — | — | — |
| 47 | `imgShopLogo` | Shop Logo | Avatar | URL | — | Shop logo or placeholder | — | `shops.logo_url` | `h-8 w-8 rounded`. |
| 48 | `lblShopName` | Shop Name | Static Label | String | — | Populated from DB | — | `shops.name` | `font-medium text-sm`. |
| 49 | `lblMerchantUserName` | Merchant User Name | Static Label | String | — | Populated from DB | — | `users.name` | `text-sm text-muted-foreground`. |
| 50 | `lblMerchantRegDate` | Registration Date | Static Label | DateTime | — | ISO 8601 formatted | — | `shops.created_at` | Localized date format. |
| 51 | `badgeMerchantStatus` | Merchant Status Badge | Badge | Enum | — | Green (Approved), Amber (Pending), Red (Rejected) | — | `shops.is_approved` | Standard status badge colors. |
| 52 | `ddlMerchantActions` | Actions Dropdown | Dropdown Menu | — | — | Collapsed | Options: View Detail, Approve, Reject | — | Destructive actions show confirmation. |

### 4.17 Section [R]: Pagination — Merchants (ページネーション — 出品者)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 53 | `pagMerchants` | Merchants Pagination | Pagination | — | — | Page 1, Total pages from API | — | API response `meta.totalPages` | Page size selector: 20, 50, 100. |

### 4.18 Section [T]: Shop Info Card in Merchant Modal (出品者モーダル内ショップカード)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 54 | `imgShopLogoDetail` | Shop Logo | Image | URL | — | Shop logo or placeholder | — | `shops.logo_url` | `h-16 w-16 rounded`. |
| 55 | `imgShopBanner` | Shop Banner | Image | URL | — | Shop banner or placeholder | — | `shops.banner_url` | `h-24 w-full object-cover rounded`. |
| 56 | `lblShopNameDetail` | Shop Name | Static Label | String | — | Populated from DB | — | `shops.name` | `font-semibold text-lg`. |
| 57 | `lblShopDescription` | Shop Description | Static Label (`<p>`) | Text | — | Populated from DB or "—" | — | `shops.description` | `text-sm text-muted-foreground`. |

### 4.19 Section [U]: License Viewer in Merchant Modal (出品者モーダル内ライセンスビューア)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 58 | `viewerLicense` | License PDF Viewer | PDF Viewer | URL | — | Embedded PDF or download link | — | S3/local file path | PDF display with zoom controls. |
| 59 | `btnDownloadLicense` | Download License Button | Button (`outline`) | — | — | Visible. Text: "Download" | — | — | Triggers file download. |

### 4.20 Section [V]: User Info Card in Merchant Modal (出品者モーダル内ユーザーカード)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 60 | `lblMerchantDetailName` | Merchant Name | Static Label | String | — | Populated from DB | — | `users.name` | `font-semibold`. |
| 61 | `lblMerchantDetailEmail` | Merchant Email | Static Label | String | — | Populated from DB | — | `users.email` | `text-sm text-muted-foreground`. |
| 62 | `lblMerchantDetailPhone` | Merchant Phone | Static Label | String | — | Populated from DB or "—" | — | `users.phone` | `text-sm`. |
| 63 | `lblMerchantDetailRegDate` | Registration Date | Static Label | DateTime | — | ISO 8601 formatted | — | `shops.created_at` | Localized date format. |

### 4.21 Section [W]: Rejection Reason Input in Merchant Modal (出品者モーダル内却下理由)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 64 | `lblMerchantRejectReason` | Rejection Reason Label | Static Label (`<label>`) | String | — | Visible only when Reject is clicked. Text: "Reason for Rejection" | — | i18n key: `admin.merchant.rejectReason` | Required for rejection. |
| 65 | `txtMerchantRejectReason` | Rejection Reason Textarea | Textarea | String(500) | Conditional | Empty. Placeholder: "Enter reason..." | MaxLength: 500. Required when rejecting. | — | `min-h-[80px]`. |

### 4.22 Section [X]: Merchant Modal Action Buttons (出品者モーダルアクションボタン)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 66 | `btnApproveMerchant` | Approve Button | Button (`submit`, `default`) | — | — | Visible. Text: "Approve" | — | — | i18n key: `admin.merchant.approve`. |
| 67 | `btnRejectMerchant` | Reject Button | Button (`destructive`) | — | — | Visible. Text: "Reject" | — | — | i18n key: `admin.merchant.reject`. Shows reason textarea. |

---

## 5. Item Behaviors & Event Specifications (各項目における挙動・イベント仕様)

### 5.1 Reviews Tab Filter Change (`tabFilterReviews` onChange)
- **Trigger:** User clicks a filter tab (All, Pending, Approved, Rejected).
- **Processing Logic:**
  1. Update URL query parameter `?status=pending|approved|rejected`.
  2. Reset pagination to page 1.
  3. Fetch filtered reviews from `GET /api/v1/admin/reviews/pending?status={status}&page=1&limit=20`.
  4. Re-render reviews table with new data.
- **Exception Handling:** Network error: Show toast "Failed to load reviews. Please try again."

### 5.2 Review Search Input (`txtReviewSearch` onInput)
- **Trigger:** User types in search field.
- **Processing Logic:**
  1. Debounce input (300ms).
  2. Update URL query parameter `?search={query}`.
  3. Fetch filtered reviews from API with search query.
  4. Re-render reviews table.
- **Exception Handling:** Network error: Show toast error.

### 5.3 Review Sort Change (`selReviewSort` onChange)
- **Trigger:** User selects a sort option.
- **Processing Logic:**
  1. Update URL query parameter `?sort={field}&order={asc|desc}`.
  2. Fetch sorted reviews from API.
  3. Re-render reviews table.
- **Exception Handling:** None applicable.

### 5.4 Review Row Click / View Detail (`ddlReviewActions` → "View Detail")
- **Trigger:** User clicks "View Detail" in actions dropdown or row click.
- **Processing Logic:**
  1. Fetch full review data from `GET /api/v1/admin/reviews/:id`.
  2. Open Review Detail Modal with populated data.
  3. Display user info, product info, review content, moderation actions.
- **Exception Handling:** `404 NOT_FOUND`: Show toast "Review not found".

### 5.5 Approve Review (`btnApproveReview` onClick)
- **Trigger:** User clicks "Approve" button in review detail modal.
- **Processing Logic:**
  1. **Backend Dispatch:** `POST /api/v1/admin/reviews/:id/moderate` with `{ action: 'approve' }`.
  2. **Backend Execution:** Update `reviews.is_approved = true`. Recalculate product `avg_rating` and `review_count`. Invalidate product cache. Log audit trail.
  3. **Post-Execution UI:** Close modal. Show success toast "Review approved". Refresh reviews list.
- **Exception Handling:**
  - `409 CONFLICT`: Show toast "Review is already approved".
  - `403 FORBIDDEN`: Show toast "You do not have permission".
  - `404 NOT_FOUND`: Show toast "Review not found".
  - `500 INTERNAL_SERVER_ERROR`: Show toast "Something went wrong. Please try again".

### 5.6 Reject Review (`btnRejectReview` onClick → confirm with reason)
- **Trigger:** User clicks "Reject" button, enters reason, then clicks confirm.
- **Processing Logic:**
  1. **UI Update:** Show `lblModerationReason` and `txtModerationReason` textarea.
  2. **Client-Side Pre-Check:** Validate reason is not empty (required). Validate max 500 chars.
  3. **Backend Dispatch:** `POST /api/v1/admin/reviews/:id/moderate` with `{ action: 'reject', reason: '...' }`.
  4. **Backend Execution:** Update `reviews.is_approved = false`. Recalculate product stats. Invalidate cache. Log audit trail.
  5. **Post-Execution UI:** Close modal. Show success toast "Review rejected". Refresh reviews list.
- **Exception Handling:**
  - `400 BAD_REQUEST`: Show inline error "Rejection reason is required".
  - `409 CONFLICT`: Show toast "Review is already rejected".
  - `500 INTERNAL_SERVER_ERROR`: Show toast error.

### 5.7 Delete Review (`btnDeleteReview` onClick)
- **Trigger:** User clicks "Delete" button in review detail modal.
- **Processing Logic:**
  1. **Confirmation Dialog:** Show "Are you sure you want to permanently delete this review? This action cannot be undone."
  2. **Backend Dispatch:** `DELETE /api/v1/admin/reviews/:id`.
  3. **Backend Execution:** Hard delete review from database. Recalculate product `avg_rating` and `review_count` from remaining approved reviews. Invalidate product cache. Log audit trail.
  4. **Post-Execution UI:** Close modal. Show success toast "Review deleted". Refresh reviews list.
- **Exception Handling:**
  - `404 NOT_FOUND`: Show toast "Review not found".
  - `500 INTERNAL_SERVER_ERROR`: Show toast error.

### 5.8 Bulk Approve (`btnBulkApprove` onClick)
- **Trigger:** User selects multiple reviews and clicks "Approve Selected".
- **Processing Logic:**
  1. **Confirmation Dialog:** Show "Approve {count} selected reviews?"
  2. **Backend Dispatch:** `POST /api/v1/admin/reviews/bulk/moderate` with `{ ids: [...], action: 'approve' }`.
  3. **Backend Execution:** Batch update `is_approved` for all selected reviews. Recalculate affected product stats. Invalidate caches.
  4. **Post-Execution UI:** Show success toast "{count} reviews approved". Refresh list. Clear selection.
- **Exception Handling:** Partial failure: Show toast with count of successful/failed operations.

### 5.9 Bulk Reject (`btnBulkReject` onClick)
- **Trigger:** User selects multiple reviews and clicks "Reject Selected".
- **Processing Logic:**
  1. **Reason Modal:** Open modal to enter rejection reason (required).
  2. **Backend Dispatch:** `POST /api/v1/admin/reviews/bulk/moderate` with `{ ids: [...], action: 'reject', reason: '...' }`.
  3. **Backend Execution:** Batch update. Recalculate. Invalidate. Audit.
  4. **Post-Execution UI:** Show success toast. Refresh list. Clear selection.
- **Exception Handling:** Reason empty: Inline error "Rejection reason is required".

### 5.10 Bulk Delete (`btnBulkDelete` onClick)
- **Trigger:** User selects multiple reviews and clicks "Delete Selected".
- **Processing Logic:**
  1. **Confirmation Dialog:** Show "Permanently delete {count} selected reviews? This cannot be undone."
  2. **Backend Dispatch:** `DELETE /api/v1/admin/reviews/bulk` with `{ ids: [...] }`.
  3. **Backend Execution:** Batch hard delete. Recalculate product stats for affected products. Invalidate caches. Audit.
  4. **Post-Execution UI:** Show success toast. Refresh list. Clear selection.
- **Exception Handling:** Partial failure: Show toast with count.

### 5.11 Merchants Tab Filter Change (`tabFilterMerchants` onChange)
- **Trigger:** User clicks a filter tab (All, Pending Approval, Approved, Rejected).
- **Processing Logic:**
  1. Update URL query parameter `?status=pending|approved|rejected`.
  2. Reset pagination to page 1.
  3. Fetch filtered merchants from `GET /api/v1/admin/merchants?status={status}&page=1&limit=20`.
  4. Re-render merchants table.
- **Exception Handling:** Network error: Show toast error.

### 5.12 Merchant Search Input (`txtMerchantSearch` onInput)
- **Trigger:** User types in search field.
- **Processing Logic:**
  1. Debounce input (300ms).
  2. Update URL query parameter `?search={query}`.
  3. Fetch filtered merchants from API.
  4. Re-render merchants table.
- **Exception Handling:** None applicable.

### 5.13 Merchant Row Click / View Detail (`ddlMerchantActions` → "View Detail")
- **Trigger:** User clicks "View Detail" in actions dropdown or row click.
- **Processing Logic:**
  1. Fetch full merchant data from `GET /api/v1/admin/merchants/:id`.
  2. Open Merchant Detail Modal with populated data.
  3. Display shop info, license viewer, user info, moderation actions.
- **Exception Handling:** `404 NOT_FOUND`: Show toast "Merchant not found".

### 5.14 Approve Merchant (`btnApproveMerchant` onClick)
- **Trigger:** User clicks "Approve" button in merchant detail modal.
- **Processing Logic:**
  1. **Backend Dispatch:** `PATCH /api/v1/admin/merchants/:id/status` with `{ status: 'approved' }`.
  2. **Backend Execution:** Update `shops.is_approved = true`. Log audit trail.
  3. **Post-Execution UI:** Close modal. Show success toast "Merchant approved". Refresh merchants list.
- **Exception Handling:**
  - `409 CONFLICT`: Show toast "Merchant is already approved".
  - `403 FORBIDDEN`: Show toast "You do not have permission".
  - `500 INTERNAL_SERVER_ERROR`: Show toast error.

### 5.15 Reject Merchant (`btnRejectMerchant` onClick → confirm with reason)
- **Trigger:** User clicks "Reject" button, enters reason, then confirms.
- **Processing Logic:**
  1. **UI Update:** Show rejection reason textarea.
  2. **Client-Side Pre-Check:** Validate reason not empty.
  3. **Backend Dispatch:** `PATCH /api/v1/admin/merchants/:id/status` with `{ status: 'rejected', reason: '...' }`.
  4. **Backend Execution:** Update `shops.is_approved = false`. Deactivate shop's products (`is_active = false`). Log audit trail.
  5. **Post-Execution UI:** Close modal. Show success toast "Merchant rejected". Refresh merchants list.
- **Exception Handling:**
  - `400 BAD_REQUEST`: Inline error "Rejection reason is required".
  - `409 CONFLICT`: Show toast "Merchant is already rejected".
  - `500 INTERNAL_SERVER_ERROR`: Show toast error.

### 5.16 Pagination Change (`pagReviews` / `pagMerchants` onPageChange)
- **Trigger:** User clicks a page number or changes page size.
- **Processing Logic:**
  1. Update URL query parameter `?page={n}&limit={size}`.
  2. Fetch paginated data from API.
  3. Re-render table.
- **Exception Handling:** None applicable.

### 5.17 Language Toggle (`btnLanguageToggle` onClick)
- **Trigger:** User clicks language toggle button.
- **Processing Logic:**
  1. Cycle through languages: EN → JA → MY → EN.
  2. Update `i18next` language via `i18n.changeLanguage()`.
  3. Persist preference to `localStorage`.
  4. Re-render all translated labels.
- **Exception Handling:** None applicable.

### 5.18 Theme Toggle (`btnThemeToggle` onClick)
- **Trigger:** User clicks theme toggle button.
- **Processing Logic:**
  1. Cycle through themes: light → dark → system.
  2. Update `next-themes` theme via `setTheme()`.
  3. Persist preference to `localStorage`.
- **Exception Handling:** None applicable.

---

## 6. Validation & Error Message Mapping (バリデーション及びエラーメッセージマッピング)

### 6.1 Review Moderation Validation Errors

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-MOD-001** | `txtModerationReason` | Reason is empty when action = 'reject' | Red border. Text below field. | "Rejection reason is required" | "却下理由は必須です" |
| **VAL-MOD-002** | `txtModerationReason` | Reason exceeds 500 characters | Red border. Text below field. | "Reason must not exceed 500 characters" | "理由は500文字以下である必要があります" |
| **MOD_001** | `alertError` | Non-admin user attempts moderation (403) | Alert banner (destructive) | "You do not have permission to perform this action" | "このアクションを実行する権限がありません" |
| **MOD_002** | `alertError` | Review not found (404) | Alert banner (destructive) | "Review not found" | "レビューが見つかりません" |
| **MOD_003** | `alertError` | Review already in target state (409) | Toast notification (warning) | "Review is already approved/rejected" | "レビューは既に承認済み/却下済みです" |
| **MOD_004** | `alertError` | Server error (500) | Alert banner (destructive) | "Something went wrong. Please try again" | "問題が発生しました。もう一度お試しください" |
| **NET_ERR** | `alertError` | Network error | Alert banner (destructive) | "Network error. Please check your connection" | "ネットワークエラー。接続を確認してください" |

### 6.2 Merchant Moderation Validation Errors

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-MOD-010** | `txtMerchantRejectReason` | Reason is empty when status = 'rejected' | Red border. Text below field. | "Rejection reason is required" | "却下理由は必須です" |
| **VAL-MOD-011** | `txtMerchantRejectReason` | Reason exceeds 500 characters | Red border. Text below field. | "Reason must not exceed 500 characters" | "理由は500文字以下である必要があります" |
| **MOD_010** | `alertError` | Non-admin user attempts moderation (403) | Alert banner (destructive) | "You do not have permission" | "権限がありません" |
| **MOD_011** | `alertError` | Merchant not found (404) | Alert banner (destructive) | "Merchant not found" | "出品者が見つかりません" |
| **MOD_012** | `alertError` | Merchant already in target status (409) | Toast notification (warning) | "Merchant is already approved/rejected" | "出品者は既に承認済み/却下済みです" |
| **MOD_013** | `alertError` | Server error (500) | Alert banner (destructive) | "Something went wrong. Please try again" | "問題が発生しました。もう一度お試しください" |

### 6.3 User Moderation Validation Errors

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **MOD_020** | `alertError` | Non-admin user attempts moderation (403) | Alert banner (destructive) | "You do not have permission" | "権限がありません" |
| **MOD_021** | `alertError` | Admin attempts to deactivate self (400) | Alert banner (destructive) | "You cannot deactivate your own account" | "自分自身のアカウントを無効化することはできません" |
| **MOD_022** | `alertError` | User not found (404) | Alert banner (destructive) | "User not found" | "ユーザーが見つかりません" |

---

## 7. Database Fields Mapping (データベースフィールドマッピング)

### 7.1 Reviews List → Database

| Table Field | API Response Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `review.id` | `id` | `reviews` | VARCHAR(25) PK |
| `user.name` | `review.user.name` | `name` | `users` | VARCHAR(200) |
| `user.avatarUrl` | `review.user.avatarUrl` | `avatar_url` | `users` | VARCHAR(500) NULL |
| `product.name` | `review.product.name` | `name` | `products` | VARCHAR(255) |
| `product.images[0]` | `review.product.images[0]` | `images` | `products` | TEXT[] |
| `rating` | `review.rating` | `rating` | `reviews` | INTEGER |
| `title` | `review.title` | `title` | `reviews` | VARCHAR(255) NULL |
| `isApproved` | `review.isApproved` | `is_approved` | `reviews` | BOOLEAN |
| `isVerifiedPurchase` | `review.isVerifiedPurchase` | `is_verified_purchase` | `reviews` | BOOLEAN |
| `createdAt` | `review.createdAt` | `created_at` | `reviews` | TIMESTAMPTZ |

### 7.2 Review Detail → Database

| Table Field | API Response Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| `body` | `review.body` | `body` | `reviews` | TEXT NULL |
| `images` | `review.images` | `images` | `reviews` | TEXT[] |
| `user.email` | `review.user.email` | `email` | `users` | VARCHAR(255) |
| `user.reviewCount` | `review.user.reviewCount` | (computed) | `reviews` | INTEGER |
| `product.slug` | `review.product.slug` | `slug` | `products` | VARCHAR(255) |
| `product.price` | `review.product.price` | `price` | `products` | NUMERIC(10,2) |

### 7.3 Merchants List → Database

| Table Field | API Response Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `merchant.id` | `id` | `shops` | VARCHAR(25) PK |
| `name` | `merchant.name` | `name` | `shops` | VARCHAR(200) |
| `slug` | `merchant.slug` | `slug` | `shops` | VARCHAR(200) |
| `logoUrl` | `merchant.logoUrl` | `logo_url` | `shops` | VARCHAR(500) NULL |
| `user.name` | `merchant.user.name` | `name` | `users` | VARCHAR(200) |
| `user.email` | `merchant.user.email` | `email` | `users` | VARCHAR(255) |
| `isApproved` | `merchant.isApproved` | `is_approved` | `shops` | BOOLEAN |
| `createdAt` | `merchant.createdAt` | `created_at` | `shops` | TIMESTAMPTZ |

### 7.4 Merchant Detail → Database

| Table Field | API Response Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| `bannerUrl` | `merchant.bannerUrl` | `banner_url` | `shops` | VARCHAR(500) NULL |
| `description` | `merchant.description` | `description` | `shops` | TEXT NULL |
| `address` | `merchant.address` | `address` | `shops` | TEXT NULL |
| `phone` | `merchant.phone` | `phone` | `shops` | VARCHAR(20) NULL |
| `email` | `merchant.email` | `email` | `shops` | VARCHAR(255) NULL |
| `user.phone` | `merchant.user.phone` | `phone` | `users` | VARCHAR(20) NULL |

---

## 8. API Response Mapping (APIレスポンスマッピング)

### 8.1 Reviews List Success Response

```json
{
  "data": [
    {
      "id": "clx1234567890",
      "user": {
        "id": "clx0987654321",
        "name": "John Doe",
        "avatarUrl": "https://cdn.example.com/avatars/john.jpg"
      },
      "product": {
        "id": "clx1122334455",
        "name": "Hydrating Serum",
        "images": ["https://cdn.example.com/products/serum-1.jpg"],
        "slug": "hydrating-serum"
      },
      "rating": 5,
      "title": "Excellent product!",
      "body": "This serum transformed my skin...",
      "isApproved": true,
      "isVerifiedPurchase": true,
      "createdAt": "2026-08-07T10:30:00.000Z"
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

### 8.2 Review Moderation Success Response

```json
{
  "data": {
    "id": "clx1234567890",
    "isApproved": false,
    "updatedAt": "2026-08-08T12:00:00.000Z"
  }
}
```

### 8.3 Merchants List Success Response

```json
{
  "data": [
    {
      "id": "clxShop001",
      "name": "Beauty Garden",
      "slug": "beauty-garden",
      "logoUrl": "https://cdn.example.com/shops/beauty-garden-logo.png",
      "user": {
        "id": "clxUser001",
        "name": "Jane Smith",
        "email": "jane@example.com"
      },
      "isApproved": false,
      "createdAt": "2026-08-06T08:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 25,
    "totalPages": 2
  }
}
```

### 8.4 Merchant Moderation Success Response

```json
{
  "data": {
    "id": "clxShop001",
    "isApproved": true,
    "updatedAt": "2026-08-08T12:00:00.000Z"
  }
}
```

### 8.5 Error Response (Standard)

```json
{
  "statusCode": 400,
  "message": ["action must be one of the following values: approve, reject"],
  "error": "Bad Request",
  "timestamp": "2026-08-08T12:00:00.000Z",
  "path": "/api/v1/admin/reviews/abc123/moderate"
}
```

---

## 9. i18n Keys Reference (i18nキーリファレンス)

### 9.1 English (en) — Reviews

| Key | Value |
| :--- | :--- |
| `admin.reviews.title` | "Review Moderation" |
| `admin.reviews.tabs.all` | "All" |
| `admin.reviews.tabs.pending` | "Pending" |
| `admin.reviews.tabs.approved` | "Approved" |
| `admin.reviews.tabs.rejected` | "Rejected" |
| `admin.reviews.search` | "Search reviews..." |
| `admin.reviews.sort.newest` | "Newest" |
| `admin.reviews.sort.oldest` | "Oldest" |
| `admin.reviews.sort.ratingHigh` | "Rating (High-Low)" |
| `admin.reviews.sort.ratingLow` | "Rating (Low-High)" |
| `admin.reviews.detail.title` | "Review Detail" |
| `admin.reviews.stats.total` | "Total Reviews" |
| `admin.reviews.stats.pending` | "Pending" |
| `admin.reviews.stats.approved` | "Approved" |
| `admin.reviews.stats.rejected` | "Rejected" |
| `admin.moderation.reason` | "Reason for Rejection" |
| `admin.moderation.reasonPlaceholder` | "Enter reason for rejection..." |
| `admin.moderation.approve` | "Approve" |
| `admin.moderation.reject` | "Reject" |
| `admin.moderation.delete` | "Delete" |
| `admin.moderation.confirmDelete` | "Are you sure you want to permanently delete this review? This action cannot be undone." |
| `admin.moderation.success.approved` | "Review approved" |
| `admin.moderation.success.rejected` | "Review rejected" |
| `admin.moderation.success.deleted` | "Review deleted" |
| `admin.moderation.bulk.approve` | "Approve Selected" |
| `admin.moderation.bulk.reject` | "Reject Selected" |
| `admin.moderation.bulk.delete` | "Delete Selected" |
| `admin.moderation.bulk.confirmApprove` | "Approve {count} selected reviews?" |
| `admin.moderation.bulk.confirmReject` | "Reject {count} selected reviews?" |
| `admin.moderation.bulk.confirmDelete` | "Permanently delete {count} selected reviews? This cannot be undone." |
| `admin.moderation.verifiedPurchase` | "Verified Purchase" |
| `admin.moderation.viewProduct` | "View Product" |

### 9.2 English (en) — Merchants

| Key | Value |
| :--- | :--- |
| `admin.merchants.title` | "Merchant Management" |
| `admin.merchants.tabs.all` | "All" |
| `admin.merchants.tabs.pending` | "Pending Approval" |
| `admin.merchants.tabs.approved` | "Approved" |
| `admin.merchants.tabs.rejected` | "Rejected" |
| `admin.merchants.search` | "Search merchants..." |
| `admin.merchants.detail.title` | "Merchant Detail" |
| `admin.merchant.rejectReason` | "Reason for Rejection" |
| `admin.merchant.rejectReasonPlaceholder` | "Enter reason for rejection..." |
| `admin.merchant.approve` | "Approve" |
| `admin.merchant.reject` | "Reject" |
| `admin.merchant.success.approved` | "Merchant approved" |
| `admin.merchant.success.rejected` | "Merchant rejected" |
| `admin.merchant.downloadLicense` | "Download License" |

### 9.3 Japanese (ja) — Reviews

| Key | Value |
| :--- | :--- |
| `admin.reviews.title` | "レビューモデレーション" |
| `admin.reviews.tabs.all` | "すべて" |
| `admin.reviews.tabs.pending` | "保留中" |
| `admin.reviews.tabs.approved` | "承認済み" |
| `admin.reviews.tabs.rejected` | "却下済み" |
| `admin.reviews.search` | "レビューを検索..." |
| `admin.reviews.sort.newest` | "新規順" |
| `admin.reviews.sort.oldest` | "古い順" |
| `admin.reviews.sort.ratingHigh` | "評価（高→低）" |
| `admin.reviews.sort.ratingLow` | "評価（低→高）" |
| `admin.reviews.detail.title` | "レビュー詳細" |
| `admin.reviews.stats.total` | "合計レビュー数" |
| `admin.reviews.stats.pending` | "保留中" |
| `admin.reviews.stats.approved` | "承認済み" |
| `admin.reviews.stats.rejected` | "却下済み" |
| `admin.moderation.reason` | "却下理由" |
| `admin.moderation.reasonPlaceholder` | "却下理由を入力してください..." |
| `admin.moderation.approve` | "承認" |
| `admin.moderation.reject` | "却下" |
| `admin.moderation.delete` | "削除" |
| `admin.moderation.confirmDelete` | "このレビューを完全に削除してもよろしいですか？この操作は取り消せません。" |
| `admin.moderation.success.approved` | "レビューが承認されました" |
| `admin.moderation.success.rejected` | "レビューが却下されました" |
| `admin.moderation.success.deleted` | "レビューが削除されました" |
| `admin.moderation.bulk.approve` | "選択を承認" |
| `admin.moderation.bulk.reject` | "選択を却下" |
| `admin.moderation.bulk.delete` | "選択を削除" |
| `admin.moderation.bulk.confirmApprove` | "選択した{count}件のレビューを承認しますか？" |
| `admin.moderation.bulk.confirmReject` | "選択した{count}件のレビューを却下しますか？" |
| `admin.moderation.bulk.confirmDelete` | "選択した{count}件のレビューを完全に削除しますか？この操作は取り消せません。" |
| `admin.moderation.verifiedPurchase` | "認証済み購入" |
| `admin.moderation.viewProduct` | "製品を表示" |

### 9.4 Japanese (ja) — Merchants

| Key | Value |
| :--- | :--- |
| `admin.merchants.title` | "出品者管理" |
| `admin.merchants.tabs.all` | "すべて" |
| `admin.merchants.tabs.pending` | "承認待ち" |
| `admin.merchants.tabs.approved` | "承認済み" |
| `admin.merchants.tabs.rejected` | "却下済み" |
| `admin.merchants.search` | "出品者を検索..." |
| `admin.merchants.detail.title` | "出品者詳細" |
| `admin.merchant.rejectReason` | "却下理由" |
| `admin.merchant.rejectReasonPlaceholder` | "却下理由を入力してください..." |
| `admin.merchant.approve` | "承認" |
| `admin.merchant.reject` | "却下" |
| `admin.merchant.success.approved` | "出品者が承認されました" |
| `admin.merchant.success.rejected` | "出品者が却下されました" |
| `admin.merchant.downloadLicense` | "ライセンスをダウンロード" |

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
| **Usage** | Reviews table, Merchants table |

### 10.3 Badge Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/badge.tsx` |
| **Variants** | `default`, `secondary`, `destructive`, `outline` |
| **Usage** | Status badges (Approved, Rejected, Pending) |

### 10.4 Dialog Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/dialog.tsx` |
| **Usage** | Review Detail Modal, Merchant Detail Modal, Confirmation Dialogs |

### 10.5 DropdownMenu Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/dropdown-menu.tsx` |
| **Usage** | Actions dropdown in table rows |

### 10.6 Tabs Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/tabs.tsx` |
| **Usage** | Filter tabs (All, Pending, Approved, Rejected) |

### 10.7 Pagination Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/pagination.tsx` |
| **Usage** | Table pagination with page size selector |

### 10.8 Textarea Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/textarea.tsx` |
| **Usage** | Moderation reason input |

---

## 11. Special UI Notes & Styling Constraints (特記事項・UI仕様)

- **Design System:** Luxury Cosmetics Theme — Primary `#7C3AED` (Purple), Accent `#EC4899` (Pink), Secondary `#F3E8FF` (Lavender).
- **Status Badge Colors:** Approved: `bg-green-100 text-green-800`, Rejected: `bg-red-100 text-red-800`, Pending: `bg-amber-100 text-amber-800`.
- **Responsive Viewport Design:** Full sidebar on desktop, collapsible on tablet, bottom nav on mobile.
- **Accessibility:** Every control must be keyboard navigable. ARIA labels required. Error messages must be announced via `role="alert"`.
- **Performance:** Tables use skeleton loaders during initial load. Buttons display spinner during async operations. Modals use lazy loading.
- **Security:** All user input is sanitized to prevent XSS. Admin endpoints enforced via backend RBAC only.
- **Confirmation Dialogs:** Required for all destructive actions (delete review, reject merchant). Use `AlertDialog` component.

---

## 12. Testing Checklist (テストチェックリスト)

### 12.1 Reviews Dashboard Tests

- [ ] Page loads with correct title "Review Moderation"
- [ ] Stats bar displays correct counts
- [ ] Filter tabs filter reviews correctly (All, Pending, Approved, Rejected)
- [ ] Search input filters reviews by user name, product name, content
- [ ] Sort dropdown sorts reviews correctly
- [ ] Pagination works with page size selector (20, 50, 100)
- [ ] Select all checkbox toggles all row checkboxes
- [ ] Bulk action buttons enable when selections made
- [ ] Bulk action buttons disable when no selections

### 12.2 Review Detail Modal Tests

- [ ] Modal opens with correct review data
- [ ] User info card displays avatar, name, email, review count
- [ ] Product info card displays image, name, price, link
- [ ] Review content displays rating, title, body, images
- [ ] Verified purchase badge shows when applicable
- [ ] Approve button submits successfully
- [ ] Reject button shows reason textarea
- [ ] Reject with reason submits successfully
- [ ] Reject without reason shows validation error
- [ ] Delete button shows confirmation dialog
- [ ] Delete confirmation submits successfully
- [ ] Modal closes on Escape key
- [ ] Modal closes on X button click

### 12.3 Merchants Dashboard Tests

- [ ] Page loads with correct title "Merchant Management"
- [ ] Filter tabs filter merchants correctly (All, Pending, Approved, Rejected)
- [ ] Search input filters merchants by shop name, user email
- [ ] Pagination works correctly
- [ ] Status badges display correct colors

### 12.4 Merchant Detail Modal Tests

- [ ] Modal opens with correct merchant data
- [ ] Shop info card displays logo, banner, name, description
- [ ] License viewer displays PDF correctly
- [ ] Download license button works
- [ ] User info card displays name, email, phone, registration date
- [ ] Approve button submits successfully
- [ ] Reject button shows reason textarea
- [ ] Reject with reason submits successfully
- [ ] Reject without reason shows validation error

### 12.5 Error Handling Tests

- [ ] 403 Forbidden shows "You do not have permission"
- [ ] 404 Not Found shows "Review not found" / "Merchant not found"
- [ ] 409 Conflict shows "Already approved/rejected"
- [ ] 500 Server Error shows generic error message
- [ ] Network error shows connection error message
- [ ] Validation errors display inline on fields

### 12.6 i18n Tests

- [ ] All labels render correctly in English
- [ ] All labels render correctly in Japanese
- [ ] All labels render correctly in Myanmar
- [ ] Language toggle switches all labels
- [ ] Error messages display in selected language

### 12.7 Responsive Design Tests

- [ ] Desktop layout: Full sidebar + table
- [ ] Tablet layout: Collapsible sidebar + responsive table
- [ ] Mobile layout: Stacked cards (admin mobile not primary target)
- [ ] Modals are responsive on all breakpoints

### 12.8 Accessibility Tests

- [ ] All controls are keyboard navigable
- [ ] ARIA labels present on all interactive elements
- [ ] Error messages announced via `role="alert"`
- [ ] Color contrast meets WCAG 2.1 AA (4.5:1)
- [ ] Focus indicators visible on all interactive elements

---

*End of Screen Items Specification (Review & Content Moderation)*
