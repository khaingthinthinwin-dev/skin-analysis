# Screen Items Specification (画面項目設計書) — Review & Content Moderation

**Document ID:** SKM-SIS-SCR-003  
**Target Screen:** Review & Content Moderation (レビュー・コンテンツ管理)  
**Subsystem:** Administration — Review Moderation & Content Management  
**Function ID:** FN-MOD-001  
**Version:** 1.2  
**Created:** 2026-08-08  
**Last Updated:** 2026-08-12  
**Author:** Senior System Engineer  
**Review Status:** Approved (承認済み)  
**Classification:** Internal — Engineering Division

---

## 1. Document Control (ドキュメント管理)

### 1.1 Document Revision History

| Version | Date | Author | Description of Changes |
| :--- | :--- | :--- | :--- |
| 1.0 | 2026-08-08 | Senior System Engineer | Initial release. Screen items specification for Review & Content Moderation covering reviews dashboard, review detail modal, merchants management, merchant detail modal, and user moderation actions. |
| 1.1 | 2026-08-12 | Senior System Engineer | Added Product Content Moderation screen (UC-MOD-004, BR-MOD-010~013): product table, product moderation modal, deactivation/reactivation flows, database mappings, API responses, i18n keys, and test checklist. |
| 1.2 | 2026-08-12 | Senior System Engineer | Added User Management screen (`/admin/users`): user table, user detail modal, activate/deactivate flows (UC-MOD-006, BR-MOD-040~042), database mappings, API responses, i18n keys, and test checklist. Fixed `is_approved IS NULL` to correct `is_approved = FALSE` per BR-MOD-002. |

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
The Review & Content Moderation screens serve as the central administration hub for maintaining platform integrity. They enable administrators to moderate product reviews (approve/reject/delete), manage merchant registrations (approve/reject), moderate product content (activate/deactivate), and perform user account moderation (activate/deactivate). All actions are protected by admin-only RBAC enforcement.

### 2.2 Target Users & Roles (対象ユーザーと権限)

| Attribute | Value |
| :--- | :--- |
| **Primary Actors** | Platform Administrator (管理者) |
| **Required Authentication** | JWT Bearer Token with `admin` role |
| **Data Scope** | All reviews, products, merchants, and user accounts |
| **Access Control** | Protected routes — `JwtAuthGuard` + `RolesGuard` (`admin`) |

### 2.3 Core Functions & Basic Design Principles (主要機能・基本設計方針)
1. **Review Moderation** — View, approve, reject, and delete product reviews with audit logging.
2. **Content Moderation** — View all products, deactivate violating content (`is_active = false`), reactivate products, and enforce platform policy (UC-MOD-004, BR-MOD-010~013).
3. **Merchant Registration Management** — Approve or reject merchant shop registrations.
4. **User Account Moderation** — View all users, activate or deactivate user accounts for policy violations (UC-MOD-006, BR-MOD-040~042). Admin cannot deactivate self.
5. **Real-Time Feedback** — Toast notifications for all moderation actions.
6. **Confirmation Dialogs** — Required for all destructive actions (delete, reject, deactivate).
7. **Pagination & Filtering** — Tab-based status filters with server-side pagination.
8. **Internationalization** — Full i18n support for EN, JA, MY.

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

#### Product Content Moderation Layout (`/admin/content`)
```text
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [Y] PAGE HEADER                     │   │
│  │   Page Title: "Product Content Moderation"       │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [AA] STATS BAR (cond.)              │   │
│  │   Total | Active | Inactive | Pending Review     │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [BB] FILTER TABS                    │   │
│  │   All | Active | Inactive | Pending Review       │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │   [CC] SEARCH + SORT BAR                        │   │
│  │   [Search Input] [Sort Dropdown] [Bulk Actions]  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [DD] PRODUCTS TABLE                 │   │
│  │   Checkbox | Image | Name | Shop | Price         │   │
│  │   Status Badge | Owner | Date | Actions Dropdown │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [EE] PAGINATION                     │   │
│  │   < 1 2 3 ... 10 >    Page Size: [20]           │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Product Moderation Modal Layout
```text
┌─────────────────────────────────────────────────────────┐
│                    MODAL OVERLAY                         │
│              ┌─────────────────────────────┐            │
│              │   [FF] MODAL HEADER         │            │
│              │   "Product Moderation"       │            │
│              │              [X Close]       │            │
│              ├─────────────────────────────┤            │
│              │                             │            │
│              │   [GG] PRODUCT INFO CARD    │            │
│              │   Image | Name | Price      │            │
│              │   Description               │            │
│              │   Category | Shop Name      │            │
│              │                             │            │
│              │   [HH] PRODUCT IMAGES       │            │
│              │   Gallery (grid layout)     │            │
│              │                             │            │
│              │   [II] SHOP OWNER CARD      │            │
│              │   Shop Logo | Name          │            │
│              │   Owner Name | Email        │            │
│              │                             │            │
│              │   [JJ] STATUS INFO          │            │
│              │   Current Status Badge      │            │
│              │   Created Date              │            │
│              │   Last Updated              │            │
│              │                             │            │
│              │   [KK] MODERATION REASON    │            │
│              │   Textarea (conditional)    │            │
│              │                             │            │
│              │   [LL] ACTION BUTTONS       │            │
│              │   [Deactivate] [Reactivate] │            │
│              └─────────────────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

#### Users Management Layout (`/admin/users`)
```text
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [MM] PAGE HEADER                    │   │
│  │   Page Title: "User Management"                  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [NN] STATS BAR (cond.)              │   │
│  │   Total | Active | Inactive | Admin              │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [OO] FILTER TABS                    │   │
│  │   All | Active | Inactive | Admin                │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │   [PP] SEARCH BAR                                │   │
│  │   [Search Input]                                 │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [QQ] USERS TABLE                    │   │
│  │   Avatar | Name | Email | Role                   │   │
│  │   Status Badge | Joined Date | Actions Dropdown  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [RR] PAGINATION                     │   │
│  │   < 1 2 3 ... 10 >    Page Size: [20]           │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### User Detail Modal Layout
```text
┌─────────────────────────────────────────────────────────┐
│                    MODAL OVERLAY                         │
│              ┌─────────────────────────────┐            │
│              │   [SS] MODAL HEADER         │            │
│              │   "User Detail" [X Close]    │            │
│              ├─────────────────────────────┤            │
│              │                             │            │
│              │   [TT] USER INFO CARD       │            │
│              │   Avatar | Name | Email     │            │
│              │   Phone | Role | Joined     │            │
│              │                             │            │
│              │   [UU] ACCOUNT STATUS       │            │
│              │   Current Status Badge      │            │
│              │   Last Login                │            │
│              │   Review Count              │            │
│              │                             │            │
│              │   [VV] ACTION BUTTONS       │            │
│              │   [Deactivate] [Reactivate] │            │
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
| 3 | `statPendingCount` | Pending Reviews Count | Stats Card | Integer | — | Populated on load | — | `COUNT(reviews WHERE is_approved = FALSE AND moderation_reason IS NOT NULL)` | Amber badge for pending count. Note: Reviews are approved by default (`is_approved = true`). Pending count reflects reviews pending re-approval or under manual review. |
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

### 4.23 Section [Y]: Page Header — Content Moderation (ページヘッダー — コンテンツ管理)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 68 | `lblContentTitle` | Page Title | Static Label (`<h1>`) | String | — | Visible. Text: "Product Content Moderation" | — | i18n key: `admin.content.title` | `text-2xl font-bold`. |

### 4.24 Section [AA]: Stats Bar — Content Moderation (統計バー — コンテンツ管理)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 69 | `statTotalProducts` | Total Products Count | Stats Card | Integer | — | Populated on load | — | `COUNT(products)` | Tailwind: `bg-white rounded-lg p-4 shadow-sm`. |
| 70 | `statActiveCount` | Active Products Count | Stats Card | Integer | — | Populated on load | — | `COUNT(products WHERE is_active = TRUE)` | Green badge for active count. |
| 71 | `statInactiveCount` | Inactive Products Count | Stats Card | Integer | — | Populated on load | — | `COUNT(products WHERE is_active = FALSE)` | Red badge. |
| 72 | `statPendingReviewCount` | Pending Review Count | Stats Card | Integer | — | Populated on load | — | `COUNT(products WHERE status = 'PENDING_REVIEW')` | Amber badge. |

### 4.25 Section [BB]: Filter Tabs — Content Moderation (フィルタタブ — コンテンツ管理)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 73 | `tabFilterContent` | Filter Tabs | Tab Group | Enum | — | Default: "All" | Options: All, Active, Inactive, Pending Review | — | i18n key: `admin.content.tabs`. Updates query params on change. |

### 4.26 Section [CC]: Search + Sort Bar — Content Moderation (検索・ソートバー — コンテンツ管理)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 74 | `txtContentSearch` | Search Products Input | Input (`text`) | String(255) | No | Empty. Placeholder: "Search products..." | MaxLength: 255 | — | i18n key: `admin.content.search`. Debounced (300ms). |
| 75 | `selContentSort` | Sort Products Dropdown | Select | Enum | No | Default: `createdAt desc` | Options: Newest, Oldest, Price (High-Low), Price (Low-High), Name (A-Z), Name (Z-A) | — | i18n key: `admin.content.sort`. |
| 76 | `btnBulkDeactivate` | Deactivate Selected Button | Button (`destructive`) | — | No | Disabled (no selection) | — | — | Enabled when active products selected. Requires confirmation. |
| 77 | `btnBulkReactivate` | Reactivate Selected Button | Button (`outline`) | — | No | Disabled (no selection) | — | — | Enabled when inactive products selected. |

### 4.27 Section [DD]: Products Table (製品テーブル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 78 | `chkSelectAllProducts` | Select All Checkbox | Checkbox | Boolean | No | Unchecked | — | — | Toggles all row checkboxes. |
| 79 | `chkSelectProduct` | Select Product Checkbox | Checkbox | Boolean | No | Per-row. Unchecked | — | — | Enables bulk action buttons. |
| 80 | `imgProductThumb` | Product Thumbnail | Image | URL | — | First product image | — | `products.images[0]` | `h-12 w-12 rounded object-cover`. |
| 81 | `lblProductName` | Product Name | Static Label (Link) | String | — | Populated from DB | — | `products.name` | Links to `/products/:slug`. `font-medium text-sm`. |
| 82 | `lblProductShop` | Shop Name | Static Label | String | — | Populated from DB | — | `shops.name` | `text-sm text-muted-foreground`. |
| 83 | `lblProductPrice` | Product Price | Static Label | Decimal | — | Formatted with currency | — | `products.price` | Localized currency format. |
| 84 | `badgeProductStatus` | Product Status Badge | Badge | Enum | — | Green (Active), Red (Inactive), Amber (Pending Review) | — | `products.is_active` | Standard status badge colors. |
| 85 | `lblProductOwner` | Product Owner | Static Label | String | — | Populated from DB | — | `users.name` (via shops) | Owner name from shop relation. |
| 86 | `lblProductCreatedDate` | Created Date | Static Label | DateTime | — | ISO 8601 formatted | — | `products.created_at` | Localized date format via i18n. |
| 87 | `ddlProductActions` | Actions Dropdown | Dropdown Menu | — | — | Collapsed | Options: View Detail, Deactivate, Reactivate | — | Destructive actions show confirmation. |

### 4.28 Section [EE]: Pagination — Content Moderation (ページネーション — コンテンツ管理)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 88 | `pagProducts` | Products Pagination | Pagination | — | — | Page 1, Total pages from API | — | API response `meta.totalPages` | Page size selector: 20, 50, 100. |

### 4.29 Section [FF]: Product Moderation Modal Header (製品モデレーションモーダルヘッダー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 89 | `lblProductModerationTitle` | Modal Title | Static Label (`<h2>`) | String | — | Text: "Product Moderation" | — | i18n key: `admin.content.detail.title` | `text-lg font-semibold`. |
| 90 | `btnCloseProductModal` | Close Modal Button | Icon Button | — | — | Visible. X icon. | — | — | Closes modal. Escape key also closes. |

### 4.30 Section [GG]: Product Info Card in Moderation Modal (製品モデレーションモーダル内製品カード)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 91 | `imgProductMain` | Product Main Image | Image | URL | — | First product image | — | `products.images[0]` | `h-24 w-24 rounded object-cover`. |
| 92 | `lblProductDetailName` | Product Name | Static Label | String | — | Populated from DB | — | `products.name` | `font-semibold text-lg`. |
| 93 | `lblProductDetailPrice` | Product Price | Static Label | Decimal | — | Formatted with currency | — | `products.price` | Localized currency format. |
| 94 | `lblProductDescription` | Product Description | Static Label (`<p>`) | Text | — | Populated from DB or "—" | — | `products.description` | `text-sm text-muted-foreground`. Truncated at 200 chars with "..." |
| 95 | `lblProductCategory` | Product Category | Static Label | String | — | Populated from DB | — | `categories.name` | Category name from relation. |
| 96 | `lblProductShopName` | Shop Name | Static Label (Link) | String | — | Populated from DB | — | `shops.name` | Links to `/admin/merchants/:id`. |

### 4.31 Section [HH]: Product Images Gallery in Moderation Modal (製品モデレーションモーダル内画像ギャラリー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 97 | `galleryProductImages` | Product Images | Image Gallery | Array[URL] | No | Grid layout of images | — | `products.images` | `grid grid-cols-4 gap-2`. Max 10 images. |

### 4.32 Section [II]: Shop Owner Card in Moderation Modal (製品モデレーションモーダル内出品者カード)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 98 | `imgProductShopLogo` | Shop Logo | Avatar | URL | — | Shop logo or placeholder | — | `shops.logo_url` | `h-10 w-10 rounded-full`. |
| 99 | `lblProductShopNameDetail` | Shop Name | Static Label | String | — | Populated from DB | — | `shops.name` | `font-semibold`. |
| 100 | `lblProductOwnerName` | Owner Name | Static Label | String | — | Populated from DB | — | `users.name` | `text-sm text-muted-foreground`. |
| 101 | `lblProductOwnerEmail` | Owner Email | Static Label | String | — | Populated from DB | — | `users.email` | `text-sm text-muted-foreground`. |

### 4.33 Section [JJ]: Status Info in Moderation Modal (製品モデレーションモーダル内ステータス情報)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 102 | `badgeProductDetailStatus` | Product Status Badge | Badge | Enum | — | Green (Active), Red (Inactive), Amber (Pending Review) | — | `products.is_active` | Current product status. |
| 103 | `lblProductDetailCreated` | Created Date | Static Label | DateTime | — | ISO 8601 formatted | — | `products.created_at` | Localized date format. |
| 104 | `lblProductDetailUpdated` | Last Updated | Static Label | DateTime | — | ISO 8601 formatted | — | `products.updated_at` | Localized date format. |

### 4.34 Section [KK]: Moderation Reason Input — Product (製品モデレーション理由入力)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 105 | `lblProductModerationReason` | Moderation Reason Label | Static Label (`<label>`) | String | — | Visible only when Deactivate is clicked. Text: "Reason for Deactivation" | — | i18n key: `admin.content.reason` | Required for deactivation. |
| 106 | `txtProductModerationReason` | Moderation Reason Textarea | Textarea | String(500) | Conditional | Empty. Placeholder: "Enter reason..." | MaxLength: 500. Required when deactivating. | — | `min-h-[80px]`. Character count shown. |

### 4.35 Section [LL]: Product Moderation Modal Action Buttons (製品モデレーションモーダルアクションボタン)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 107 | `btnDeactivateProduct` | Deactivate Button | Button (`destructive`) | — | — | Visible when product is active. Text: "Deactivate" | — | — | i18n key: `admin.content.deactivate`. Shows reason textarea. Requires confirmation. |
| 108 | `btnReactivateProduct` | Reactivate Button | Button (`default`) | — | — | Visible when product is inactive. Text: "Reactivate" | — | — | i18n key: `admin.content.reactivate`. |

### 4.36 Section [MM]: Page Header — Users Management (ページヘッダー — ユーザー管理)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 109 | `lblUsersTitle` | Page Title | Static Label (`<h1>`) | String | — | Visible. Text: "User Management" | — | i18n key: `admin.users.title` | `text-2xl font-bold`. |

### 4.37 Section [NN]: Stats Bar — Users Management (統計バー — ユーザー管理)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 110 | `statTotalUsers` | Total Users Count | Stats Card | Integer | — | Populated on load | — | `COUNT(users)` | Tailwind: `bg-white rounded-lg p-4 shadow-sm`. |
| 111 | `statActiveUsers` | Active Users Count | Stats Card | Integer | — | Populated on load | — | `COUNT(users WHERE is_active = TRUE)` | Green badge. |
| 112 | `statInactiveUsers` | Inactive Users Count | Stats Card | Integer | — | Populated on load | — | `COUNT(users WHERE is_active = FALSE)` | Red badge. |
| 113 | `statAdminUsers` | Admin Users Count | Stats Card | Integer | — | Populated on load | — | `COUNT(users WHERE role = 'admin')` | Purple badge. |

### 4.38 Section [OO]: Filter Tabs — Users Management (フィルタタブ — ユーザー管理)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 114 | `tabFilterUsers` | Filter Tabs | Tab Group | Enum | — | Default: "All" | Options: All, Active, Inactive, Admin | — | i18n key: `admin.users.tabs`. Updates query params on change. |

### 4.39 Section [PP]: Search Bar — Users Management (検索バー — ユーザー管理)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 115 | `txtUserSearch` | Search Users Input | Input (`text`) | String(255) | No | Empty. Placeholder: "Search users..." | MaxLength: 255 | — | i18n key: `admin.users.search`. Debounced (300ms). |

### 4.40 Section [QQ]: Users Table (ユーザーテーブル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 116 | `imgUserAvatar` | User Avatar | Avatar | URL | — | User avatar or default placeholder | — | `users.avatar_url` | `h-8 w-8 rounded-full`. |
| 117 | `lblUserName` | User Name | Static Label | String | — | Populated from DB | — | `users.name` | `font-medium text-sm`. |
| 118 | `lblUserEmail` | User Email | Static Label | String | — | Populated from DB | — | `users.email` | `text-sm text-muted-foreground`. |
| 119 | `lblUserRole` | User Role | Static Label | Enum | — | Populated from DB | — | `users.role` | Displays: buyer, merchant, admin. |
| 120 | `badgeUserStatus` | User Status Badge | Badge | Enum | — | Green (Active), Red (Inactive) | — | `users.is_active` | Standard status badge colors. |
| 121 | `lblUserJoinedDate` | Joined Date | Static Label | DateTime | — | ISO 8601 formatted | — | `users.created_at` | Localized date format via i18n. |
| 122 | `ddlUserActions` | Actions Dropdown | Dropdown Menu | — | — | Collapsed | Options: View Detail, Deactivate, Reactivate | — | Destructive actions show confirmation. Cannot deactivate self (BR-MOD-042). |

### 4.41 Section [RR]: Pagination — Users Management (ページネーション — ユーザー管理)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 123 | `pagUsers` | Users Pagination | Pagination | — | — | Page 1, Total pages from API | — | API response `meta.totalPages` | Page size selector: 20, 50, 100. |

### 4.42 Section [SS]: User Detail Modal Header (ユーザーモーダルヘッダー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 124 | `lblUserDetailTitle` | Modal Title | Static Label (`<h2>`) | String | — | Text: "User Detail" | — | i18n key: `admin.users.detail.title` | `text-lg font-semibold`. |
| 125 | `btnCloseUserModal` | Close Modal Button | Icon Button | — | — | Visible. X icon. | — | — | Closes modal. Escape key also closes. |

### 4.43 Section [TT]: User Info Card in User Modal (ユーザーモーダル内ユーザーカード)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 126 | `imgUserDetailAvatar` | User Avatar | Avatar | URL | — | User avatar or default placeholder | — | `users.avatar_url` | `h-16 w-16 rounded-full`. |
| 127 | `lblUserDetailName` | User Name | Static Label | String | — | Populated from DB | — | `users.name` | `font-semibold text-lg`. |
| 128 | `lblUserDetailEmail` | User Email | Static Label | String | — | Populated from DB | — | `users.email` | `text-sm text-muted-foreground`. |
| 129 | `lblUserDetailPhone` | User Phone | Static Label | String | — | Populated from DB or "—" | — | `users.phone` | `text-sm`. |
| 130 | `lblUserDetailRole` | User Role | Static Label | Enum | — | Populated from DB | — | `users.role` | Displays role with icon. |
| 131 | `lblUserDetailJoined` | Joined Date | Static Label | DateTime | — | ISO 8601 formatted | — | `users.created_at` | Localized date format. |

### 4.44 Section [UU]: Account Status in User Modal (ユーザーモーダル内アカウントステータス)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 132 | `badgeUserDetailStatus` | User Status Badge | Badge | Enum | — | Green (Active), Red (Inactive) | — | `users.is_active` | Current user status. |
| 133 | `lblUserDetailLastLogin` | Last Login | Static Label | DateTime | — | ISO 8601 formatted or "—" | — | `users.last_login_at` | Localized date format. |
| 134 | `lblUserDetailReviewCount` | Review Count | Static Label | Integer | — | Populated from DB | — | `COUNT(reviews WHERE user_id = :id)` | Text: "X reviews". |

### 4.45 Section [VV]: User Modal Action Buttons (ユーザーモーダルアクションボタン)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 135 | `btnDeactivateUser` | Deactivate Button | Button (`destructive`) | — | — | Visible when user is active. Text: "Deactivate" | — | — | i18n key: `admin.users.deactivate`. Requires confirmation. Hidden for current admin (BR-MOD-042). |
| 136 | `btnReactivateUser` | Reactivate Button | Button (`default`) | — | — | Visible when user is inactive. Text: "Reactivate" | — | — | i18n key: `admin.users.reactivate`. |

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

### 5.19 Content Tab Filter Change (`tabFilterContent` onChange)
- **Trigger:** User clicks a filter tab (All, Active, Inactive, Pending Review).
- **Processing Logic:**
  1. Update URL query parameter `?status=active|inactive|pending_review`.
  2. Reset pagination to page 1.
  3. Fetch filtered products from `GET /api/v1/admin/content?status={status}&page=1&limit=20`.
  4. Re-render products table with new data.
- **Exception Handling:** Network error: Show toast "Failed to load products. Please try again."

### 5.20 Content Search Input (`txtContentSearch` onInput)
- **Trigger:** User types in search field.
- **Processing Logic:**
  1. Debounce input (300ms).
  2. Update URL query parameter `?search={query}`.
  3. Fetch filtered products from API with search query.
  4. Re-render products table.
- **Exception Handling:** Network error: Show toast error.

### 5.21 Content Sort Change (`selContentSort` onChange)
- **Trigger:** User selects a sort option.
- **Processing Logic:**
  1. Update URL query parameter `?sort={field}&order={asc|desc}`.
  2. Fetch sorted products from API.
  3. Re-render products table.
- **Exception Handling:** None applicable.

### 5.22 Product Row Click / View Detail (`ddlProductActions` → "View Detail")
- **Trigger:** User clicks "View Detail" in actions dropdown or row click.
- **Processing Logic:**
  1. Fetch full product data from `GET /api/v1/admin/content/:id`.
  2. Open Product Moderation Modal with populated data.
  3. Display product info, images, shop owner info, status, moderation actions.
- **Exception Handling:** `404 NOT_FOUND`: Show toast "Product not found".

### 5.23 Deactivate Product (`btnDeactivateProduct` onClick)
- **Trigger:** User clicks "Deactivate" button in product moderation modal.
- **Processing Logic:**
  1. **UI Update:** Show `lblProductModerationReason` and `txtProductModerationReason` textarea.
  2. **Client-Side Pre-Check:** Validate reason is not empty (required). Validate max 500 chars.
  3. **Confirmation Dialog:** Show "Are you sure you want to deactivate this product? It will no longer be visible to buyers."
  4. **Backend Dispatch:** `PATCH /api/v1/admin/content/:id/status` with `{ isActive: false, reason: '...' }`.
  5. **Backend Execution:** Update `products.is_active = false`. Invalidate product cache in Redis. Invalidate product list cache. Log audit trail (BR-MOD-011, BR-MOD-013).
  6. **Post-Execution UI:** Close modal. Show success toast "Product deactivated". Refresh products list.
- **Exception Handling:**
  - `400 BAD_REQUEST`: Show inline error "Deactivation reason is required".
  - `403 FORBIDDEN`: Show toast "You do not have permission".
  - `404 NOT_FOUND`: Show toast "Product not found".
  - `409 CONFLICT`: Show toast "Product is already inactive".
  - `500 INTERNAL_SERVER_ERROR`: Show toast "Something went wrong. Please try again".

### 5.24 Reactivate Product (`btnReactivateProduct` onClick)
- **Trigger:** User clicks "Reactivate" button in product moderation modal.
- **Processing Logic:**
  1. **Confirmation Dialog:** Show "Are you sure you want to reactivate this product? It will become visible to buyers again."
  2. **Backend Dispatch:** `PATCH /api/v1/admin/content/:id/status` with `{ isActive: true }`.
  3. **Backend Execution:** Update `products.is_active = true`. Invalidate product cache in Redis. Invalidate product list cache. Log audit trail (TR-MOD-06).
  4. **Post-Execution UI:** Close modal. Show success toast "Product reactivated". Refresh products list.
- **Exception Handling:**
  - `403 FORBIDDEN`: Show toast "You do not have permission".
  - `404 NOT_FOUND`: Show toast "Product not found".
  - `409 CONFLICT`: Show toast "Product is already active".
  - `500 INTERNAL_SERVER_ERROR`: Show toast error.

### 5.25 Bulk Deactivate (`btnBulkDeactivate` onClick)
- **Trigger:** User selects multiple products and clicks "Deactivate Selected".
- **Processing Logic:**
  1. **Reason Modal:** Open modal to enter deactivation reason (required).
  2. **Confirmation Dialog:** Show "Deactivate {count} selected products? They will no longer be visible to buyers."
  3. **Backend Dispatch:** `PATCH /api/v1/admin/content/bulk/status` with `{ ids: [...], isActive: false, reason: '...' }`.
  4. **Backend Execution:** Batch update `is_active` for all selected products. Invalidate affected product caches. Audit.
  5. **Post-Execution UI:** Show success toast "{count} products deactivated". Refresh list. Clear selection.
- **Exception Handling:** Reason empty: Inline error "Deactivation reason is required". Partial failure: Show toast with count of successful/failed operations.

### 5.26 Bulk Reactivate (`btnBulkReactivate` onClick)
- **Trigger:** User selects multiple products and clicks "Reactivate Selected".
- **Processing Logic:**
  1. **Confirmation Dialog:** Show "Reactivate {count} selected products?"
  2. **Backend Dispatch:** `PATCH /api/v1/admin/content/bulk/status` with `{ ids: [...], isActive: true }`.
  3. **Backend Execution:** Batch update `is_active`. Invalidate caches. Audit.
  4. **Post-Execution UI:** Show success toast. Refresh list. Clear selection.
- **Exception Handling:** Partial failure: Show toast with count.

### 5.27 Content Pagination Change (`pagProducts` onPageChange)
- **Trigger:** User clicks a page number or changes page size.
- **Processing Logic:**
  1. Update URL query parameter `?page={n}&limit={size}`.
  2. Fetch paginated products from API.
  3. Re-render table.
- **Exception Handling:** None applicable.

### 5.28 Users Tab Filter Change (`tabFilterUsers` onChange)
- **Trigger:** User clicks a filter tab (All, Active, Inactive, Admin).
- **Processing Logic:**
  1. Update URL query parameter `?status=active|inactive|admin`.
  2. Reset pagination to page 1.
  3. Fetch filtered users from `GET /api/v1/admin/users?status={status}&page=1&limit=20`.
  4. Re-render users table with new data.
- **Exception Handling:** Network error: Show toast "Failed to load users. Please try again."

### 5.29 Users Search Input (`txtUserSearch` onInput)
- **Trigger:** User types in search field.
- **Processing Logic:**
  1. Debounce input (300ms).
  2. Update URL query parameter `?search={query}`.
  3. Fetch filtered users from API with search query.
  4. Re-render users table.
- **Exception Handling:** Network error: Show toast error.

### 5.30 User Row Click / View Detail (`ddlUserActions` → "View Detail")
- **Trigger:** User clicks "View Detail" in actions dropdown or row click.
- **Processing Logic:**
  1. Fetch full user data from `GET /api/v1/admin/users/:id`.
  2. Open User Detail Modal with populated data.
  3. Display user info, account status, moderation actions.
- **Exception Handling:** `404 NOT_FOUND`: Show toast "User not found".

### 5.31 Deactivate User (`btnDeactivateUser` onClick)
- **Trigger:** User clicks "Deactivate" button in user detail modal.
- **Processing Logic:**
  1. **Confirmation Dialog:** Show "Are you sure you want to deactivate this user? They will not be able to log in."
  2. **Backend Dispatch:** `PATCH /api/v1/admin/users/:id/status` with `{ isActive: false }`.
  3. **Backend Execution:** Update `users.is_active = false`. Revoke all user refresh tokens (BR-MOD-041). Invalidate user profile cache. Log audit trail.
  4. **Post-Execution UI:** Close modal. Show success toast "User deactivated". Refresh users list.
- **Exception Handling:**
  - `400 BAD_REQUEST`: Show toast "You cannot deactivate your own account" (BR-MOD-042).
  - `403 FORBIDDEN`: Show toast "You do not have permission".
  - `404 NOT_FOUND`: Show toast "User not found".
  - `409 CONFLICT`: Show toast "User is already inactive".
  - `500 INTERNAL_SERVER_ERROR`: Show toast "Something went wrong. Please try again".

### 5.32 Reactivate User (`btnReactivateUser` onClick)
- **Trigger:** User clicks "Reactivate" button in user detail modal.
- **Processing Logic:**
  1. **Confirmation Dialog:** Show "Are you sure you want to reactivate this user? They will be able to log in again."
  2. **Backend Dispatch:** `PATCH /api/v1/admin/users/:id/status` with `{ isActive: true }`.
  3. **Backend Execution:** Update `users.is_active = true`. Invalidate user profile cache. Log audit trail (TR-MOD-08).
  4. **Post-Execution UI:** Close modal. Show success toast "User reactivated". Refresh users list.
- **Exception Handling:**
  - `403 FORBIDDEN`: Show toast "You do not have permission".
  - `404 NOT_FOUND`: Show toast "User not found".
  - `409 CONFLICT`: Show toast "User is already active".
  - `500 INTERNAL_SERVER_ERROR`: Show toast error.

### 5.33 Users Pagination Change (`pagUsers` onPageChange)
- **Trigger:** User clicks a page number or changes page size.
- **Processing Logic:**
  1. Update URL query parameter `?page={n}&limit={size}`.
  2. Fetch paginated users from API.
  3. Re-render table.
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

### 6.4 Product Content Moderation Validation Errors

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-MOD-020** | `txtProductModerationReason` | Reason is empty when action = 'deactivate' | Red border. Text below field. | "Deactivation reason is required" | "無効化理由は必須です" |
| **VAL-MOD-021** | `txtProductModerationReason` | Reason exceeds 500 characters | Red border. Text below field. | "Reason must not exceed 500 characters" | "理由は500文字以下である必要があります" |
| **MOD_030** | `alertError` | Non-admin user attempts moderation (403) | Alert banner (destructive) | "You do not have permission to perform this action" | "このアクションを実行する権限がありません" |
| **MOD_031** | `alertError` | Product not found (404) | Alert banner (destructive) | "Product not found" | "製品が見つかりません" |
| **MOD_032** | `alertError` | Product already in target state (409) | Toast notification (warning) | "Product is already active/inactive" | "製品は既に有効/無効です" |
| **MOD_033** | `alertError` | Server error (500) | Alert banner (destructive) | "Something went wrong. Please try again" | "問題が発生しました。もう一度お試しください" |

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

### 7.5 Products List → Database

| Table Field | API Response Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `product.id` | `id` | `products` | VARCHAR(25) PK |
| `name` | `product.name` | `name` | `products` | VARCHAR(255) |
| `slug` | `product.slug` | `slug` | `products` | VARCHAR(255) |
| `images[0]` | `product.images[0]` | `images` | `products` | TEXT[] |
| `price` | `product.price` | `price` | `products` | NUMERIC(10,2) |
| `isActive` | `product.isActive` | `is_active` | `products` | BOOLEAN |
| `status` | `product.status` | `status` | `products` | VARCHAR(50) |
| `shop.name` | `product.shop.name` | `name` | `shops` | VARCHAR(200) |
| `shop.user.name` | `product.shop.user.name` | `name` | `users` | VARCHAR(200) |
| `createdAt` | `product.createdAt` | `created_at` | `products` | TIMESTAMPTZ |

### 7.6 Product Detail → Database

| Table Field | API Response Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| `description` | `product.description` | `description` | `products` | TEXT NULL |
| `images` | `product.images` | `images` | `products` | TEXT[] |
| `category.name` | `product.category.name` | `name` | `categories` | VARCHAR(200) |
| `shop.id` | `product.shop.id` | `id` | `shops` | VARCHAR(25) |
| `shop.logoUrl` | `product.shop.logoUrl` | `logo_url` | `shops` | VARCHAR(500) NULL |
| `shop.user.email` | `product.shop.user.email` | `email` | `users` | VARCHAR(255) |
| `updatedAt` | `product.updatedAt` | `updated_at` | `products` | TIMESTAMPTZ |

### 7.7 Users List → Database

| Table Field | API Response Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `user.id` | `id` | `users` | VARCHAR(25) PK |
| `name` | `user.name` | `name` | `users` | VARCHAR(200) |
| `email` | `user.email` | `email` | `users` | VARCHAR(255) |
| `avatarUrl` | `user.avatarUrl` | `avatar_url` | `users` | VARCHAR(500) NULL |
| `role` | `user.role` | `role` | `users` | VARCHAR(50) |
| `isActive` | `user.isActive` | `is_active` | `users` | BOOLEAN |
| `createdAt` | `user.createdAt` | `created_at` | `users` | TIMESTAMPTZ |

### 7.8 User Detail → Database

| Table Field | API Response Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| `phone` | `user.phone` | `phone` | `users` | VARCHAR(20) NULL |
| `lastLoginAt` | `user.lastLoginAt` | `last_login_at` | `users` | TIMESTAMPTZ NULL |
| `updatedAt` | `user.updatedAt` | `updated_at` | `users` | TIMESTAMPTZ |
| `reviewCount` | `user.reviewCount` | (computed) | `reviews` | INTEGER |

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

### 8.5 Products List Success Response

```json
{
  "data": [
    {
      "id": "clxProd001",
      "name": "Hydrating Serum",
      "slug": "hydrating-serum",
      "images": ["https://cdn.example.com/products/serum-1.jpg"],
      "price": 49.99,
      "isActive": true,
      "status": "ACTIVE",
      "shop": {
        "id": "clxShop001",
        "name": "Beauty Garden",
        "user": {
          "id": "clxUser001",
          "name": "Jane Smith"
        }
      },
      "createdAt": "2026-08-01T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 200,
    "totalPages": 10
  }
}
```

### 8.6 Product Moderation Success Response

```json
{
  "data": {
    "id": "clxProd001",
    "isActive": false,
    "updatedAt": "2026-08-12T12:00:00.000Z"
  }
}
```

### 8.7 Users List Success Response

```json
{
  "data": [
    {
      "id": "clxUser001",
      "name": "John Doe",
      "email": "john@example.com",
      "avatarUrl": "https://cdn.example.com/avatars/john.jpg",
      "role": "buyer",
      "isActive": true,
      "createdAt": "2026-07-01T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 500,
    "totalPages": 25
  }
}
```

### 8.8 User Moderation Success Response

```json
{
  "data": {
    "id": "clxUser001",
    "isActive": false,
    "updatedAt": "2026-08-12T12:00:00.000Z"
  }
}
```

### 8.7 Error Response (Standard)

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

### 9.3 English (en) — Content Moderation

| Key | Value |
| :--- | :--- |
| `admin.content.title` | "Product Content Moderation" |
| `admin.content.tabs.all` | "All" |
| `admin.content.tabs.active` | "Active" |
| `admin.content.tabs.inactive` | "Inactive" |
| `admin.content.tabs.pendingReview` | "Pending Review" |
| `admin.content.search` | "Search products..." |
| `admin.content.sort.newest` | "Newest" |
| `admin.content.sort.oldest` | "Oldest" |
| `admin.content.sort.priceHigh` | "Price (High-Low)" |
| `admin.content.sort.priceLow` | "Price (Low-High)" |
| `admin.content.sort.nameAZ` | "Name (A-Z)" |
| `admin.content.sort.nameZA` | "Name (Z-A)" |
| `admin.content.detail.title` | "Product Moderation" |
| `admin.content.stats.total` | "Total Products" |
| `admin.content.stats.active` | "Active" |
| `admin.content.stats.inactive` | "Inactive" |
| `admin.content.stats.pendingReview` | "Pending Review" |
| `admin.content.reason` | "Reason for Deactivation" |
| `admin.content.reasonPlaceholder` | "Enter reason for deactivation..." |
| `admin.content.deactivate` | "Deactivate" |
| `admin.content.reactivate` | "Reactivate" |
| `admin.content.confirmDeactivate` | "Are you sure you want to deactivate this product? It will no longer be visible to buyers." |
| `admin.content.confirmReactivate` | "Are you sure you want to reactivate this product? It will become visible to buyers again." |
| `admin.content.success.deactivated` | "Product deactivated" |
| `admin.content.success.reactivated` | "Product reactivated" |
| `admin.content.bulk.deactivate` | "Deactivate Selected" |
| `admin.content.bulk.reactivate` | "Reactivate Selected" |
| `admin.content.bulk.confirmDeactivate` | "Deactivate {count} selected products? They will no longer be visible to buyers." |
| `admin.content.bulk.confirmReactivate` | "Reactivate {count} selected products?" |

### 9.4 English (en) — Users Management

| Key | Value |
| :--- | :--- |
| `admin.users.title` | "User Management" |
| `admin.users.tabs.all` | "All" |
| `admin.users.tabs.active` | "Active" |
| `admin.users.tabs.inactive` | "Inactive" |
| `admin.users.tabs.admin` | "Admin" |
| `admin.users.search` | "Search users..." |
| `admin.users.detail.title` | "User Detail" |
| `admin.users.deactivate` | "Deactivate" |
| `admin.users.reactivate` | "Reactivate" |
| `admin.users.confirmDeactivate` | "Are you sure you want to deactivate this user? They will not be able to log in." |
| `admin.users.confirmReactivate` | "Are you sure you want to reactivate this user? They will be able to log in again." |
| `admin.users.success.deactivated` | "User deactivated" |
| `admin.users.success.reactivated` | "User reactivated" |
| `admin.users.stats.total` | "Total Users" |
| `admin.users.stats.active` | "Active" |
| `admin.users.stats.inactive` | "Inactive" |
| `admin.users.stats.admin` | "Admin" |

### 9.4 Japanese (ja) — Reviews
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

### 9.5 Japanese (ja) — Merchants
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

### 9.6 Japanese (ja) — Content Moderation

| Key | Value |
| :--- | :--- |
| `admin.content.title` | "製品コンテンツ管理" |
| `admin.content.tabs.all` | "すべて" |
| `admin.content.tabs.active` | "有効" |
| `admin.content.tabs.inactive` | "無効" |
| `admin.content.tabs.pendingReview` | "レビュー待ち" |
| `admin.content.search` | "製品を検索..." |
| `admin.content.sort.newest` | "新規順" |
| `admin.content.sort.oldest` | "古い順" |
| `admin.content.sort.priceHigh` | "価格（高→低）" |
| `admin.content.sort.priceLow` | "価格（低→高）" |
| `admin.content.sort.nameAZ` | "名前（A-Z）" |
| `admin.content.sort.nameZA` | "名前（Z-A）" |
| `admin.content.detail.title` | "製品モデレーション" |
| `admin.content.stats.total` | "合計製品数" |
| `admin.content.stats.active` | "有効" |
| `admin.content.stats.inactive` | "無効" |
| `admin.content.stats.pendingReview` | "レビュー待ち" |
| `admin.content.reason` | "無効化理由" |
| `admin.content.reasonPlaceholder` | "無効化理由を入力してください..." |
| `admin.content.deactivate` | "無効化" |
| `admin.content.reactivate` | "有効化" |
| `admin.content.confirmDeactivate` | "この製品を無効にしてもよろしいですか？購入者に表示されなくなります。" |
| `admin.content.confirmReactivate` | "この製品を有効にしてもよろしいですか？購入者に再び表示されます。" |
| `admin.content.success.deactivated` | "製品が無効化されました" |
| `admin.content.success.reactivated` | "製品が有効化されました" |
| `admin.content.bulk.deactivate` | "選択を無効化" |
| `admin.content.bulk.reactivate` | "選択を有効化" |
| `admin.content.bulk.confirmDeactivate` | "選択した{count}件の製品を無効にしますか？購入者に表示されなくなります。" |
| `admin.content.bulk.confirmReactivate` | "選択した{count}件の製品を有効にしますか？" |

### 9.7 Japanese (ja) — Users Management

| Key | Value |
| :--- | :--- |
| `admin.users.title` | "ユーザー管理" |
| `admin.users.tabs.all` | "すべて" |
| `admin.users.tabs.active` | "有効" |
| `admin.users.tabs.inactive` | "無効" |
| `admin.users.tabs.admin` | "管理者" |
| `admin.users.search` | "ユーザーを検索..." |
| `admin.users.detail.title` | "ユーザー詳細" |
| `admin.users.deactivate` | "無効化" |
| `admin.users.reactivate` | "有効化" |
| `admin.users.confirmDeactivate` | "このユーザーを無効にしてもよろしいですか？ログインできなくなります。" |
| `admin.users.confirmReactivate` | "このユーザーを有効にしてもよろしいですか？再びログインできるようになります。" |
| `admin.users.success.deactivated` | "ユーザーが無効化されました" |
| `admin.users.success.reactivated` | "ユーザーが有効化されました" |
| `admin.users.stats.total` | "合計ユーザー数" |
| `admin.users.stats.active` | "有効" |
| `admin.users.stats.inactive` | "無効" |
| `admin.users.stats.admin` | "管理者" |

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
| **Usage** | Reviews table, Merchants table, Products table, Users table |

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
| **Usage** | Review Detail Modal, Merchant Detail Modal, Product Moderation Modal, User Detail Modal, Confirmation Dialogs |

### 10.5 DropdownMenu Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/dropdown-menu.tsx` |
| **Usage** | Actions dropdown in table rows |

### 10.6 Tabs Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/tabs.tsx` |
| **Usage** | Filter tabs (All, Pending, Approved, Rejected, Active, Inactive, Pending Review, Admin) |

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

### 12.5 Content Moderation Dashboard Tests

- [ ] Page loads with correct title "Product Content Moderation"
- [ ] Stats bar displays correct counts (Total, Active, Inactive, Pending Review)
- [ ] Filter tabs filter products correctly (All, Active, Inactive, Pending Review)
- [ ] Search input filters products by name, shop name
- [ ] Sort dropdown sorts products correctly (Newest, Oldest, Price, Name)
- [ ] Pagination works with page size selector (20, 50, 100)
- [ ] Select all checkbox toggles all row checkboxes
- [ ] Bulk action buttons enable when selections made
- [ ] Bulk action buttons disable when no selections
- [ ] Status badges display correct colors (Green=Active, Red=Inactive, Amber=Pending)

### 12.6 Product Moderation Modal Tests

- [ ] Modal opens with correct product data
- [ ] Product info card displays image, name, price, description, category, shop
- [ ] Product images gallery displays all images in grid layout
- [ ] Shop owner card displays logo, shop name, owner name, owner email
- [ ] Status info displays current status badge, created date, last updated
- [ ] Deactivate button shows reason textarea
- [ ] Deactivate with reason submits successfully
- [ ] Deactivate without reason shows validation error
- [ ] Reactivate button submits successfully for inactive products
- [ ] Confirmation dialog shows for deactivate/reactivate actions
- [ ] Modal closes on Escape key
- [ ] Modal closes on X button click

### 12.7 Bulk Content Moderation Tests

- [ ] Bulk deactivate opens reason modal
- [ ] Bulk deactivate with reason submits successfully
- [ ] Bulk deactivate without reason shows validation error
- [ ] Bulk reactivate shows confirmation dialog
- [ ] Bulk reactivate submits successfully
- [ ] Selection cleared after bulk action
- [ ] Toast notification shows count of affected products

### 12.8 Users Management Dashboard Tests

- [ ] Page loads with correct title "User Management"
- [ ] Stats bar displays correct counts (Total, Active, Inactive, Admin)
- [ ] Filter tabs filter users correctly (All, Active, Inactive, Admin)
- [ ] Search input filters users by name, email
- [ ] Pagination works with page size selector (20, 50, 100)
- [ ] Status badges display correct colors (Green=Active, Red=Inactive)
- [ ] Role labels display correctly (buyer, merchant, admin)
- [ ] Actions dropdown shows View Detail, Deactivate, Reactivate

### 12.9 User Detail Modal Tests

- [ ] Modal opens with correct user data
- [ ] User info card displays avatar, name, email, phone, role, joined date
- [ ] Account status displays status badge, last login, review count
- [ ] Deactivate button shows confirmation dialog
- [ ] Deactivate confirmation submits successfully
- [ ] Reactivate button shows confirmation dialog
- [ ] Reactivate confirmation submits successfully
- [ ] Deactivate button hidden for current admin (self-deactivation prevention)
- [ ] Modal closes on Escape key
- [ ] Modal closes on X button click

### 12.10 Error Handling Tests

- [ ] 403 Forbidden shows "You do not have permission"
- [ ] 404 Not Found shows "Review not found" / "Merchant not found" / "Product not found" / "User not found"
- [ ] 409 Conflict shows "Already approved/rejected" / "Already active/inactive"
- [ ] 400 Bad Request shows "You cannot deactivate your own account"
- [ ] 500 Server Error shows generic error message
- [ ] Network error shows connection error message
- [ ] Validation errors display inline on fields

### 12.11 i18n Tests

- [ ] All labels render correctly in English
- [ ] All labels render correctly in Japanese
- [ ] All labels render correctly in Myanmar
- [ ] Language toggle switches all labels
- [ ] Error messages display in selected language

### 12.12 Responsive Design Tests

- [ ] Desktop layout: Full sidebar + table
- [ ] Tablet layout: Collapsible sidebar + responsive table
- [ ] Mobile layout: Stacked cards (admin mobile not primary target)
- [ ] Modals are responsive on all breakpoints

### 12.13 Accessibility Tests

- [ ] All controls are keyboard navigable
- [ ] ARIA labels present on all interactive elements
- [ ] Error messages announced via `role="alert"`
- [ ] Color contrast meets WCAG 2.1 AA (4.5:1)
- [ ] Focus indicators visible on all interactive elements

---

*End of Screen Items Specification (Review & Content Moderation)*
