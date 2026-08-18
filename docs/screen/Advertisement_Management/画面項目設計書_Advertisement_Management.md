# Screen Items Specification (画面項目設計書) — Advertisement Management

**Document ID:** SKM-SIS-AD-001  
**Target Screen:** Advertisement Management (広告管理) — Merchant List, Create/Edit Dialog, Admin Moderation  
**Subsystem:** Advertisement — Shop Advertisement Management  
**Function ID:** FN-AD-001  
**Version:** 2.0  
**Created:** 2026-08-11  
**Last Updated:** 2026-08-18  
**Author:** Senior System Engineer  
**Review Status:** Draft (レビュー中)  
**Classification:** Internal — Engineering Division

---

## 1. Document Control (ドキュメント管理)

### 1.1 Document Revision History

| Version | Date | Author | Description of Changes |
| :--- | :--- | :--- | :--- |
| 1.0 | 2026-08-11 | Senior System Engineer | Initial release. Screen items specification for the Advertisement Management subsystem (Merchant list, Create/Edit dialog, Payment & Submission panel, Admin moderation, Public banner display), aligned with SKM-FDS-AD-001 v1.1 and the `advertisements` table structure in SKM-DBS-001 v1.1. |
| 2.0 | 2026-08-18 | Senior System Engineer | Aligned with REQUIREMENT_SPEC v1.7, DATABASE_SPEC v2.2, DEVELOPMENT_RULES, and FDS-AD v2.1. Added 7–30 day duration validation, the two-active-ads-per-merchant approval limit, dynamic fee/transaction mapping, canonical payment values, and lifecycle traceability. |

### 1.2 Related Documents

| No. | Document ID | Document Name | File Path | Remarks |
| :-- | :--- | :--- | :--- | :--- |
| 1 | SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | M-AD-001~014 business workflow, state flow, duration, and active-ad limits. |
| 2 | SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | `advertisements`, `ad_fee_settings`, `ad_payments`, and `ad_fee_history` (v2.2). |
| 3 | SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | Security rules, design tokens, error responses, RBAC. |
| 4 | SKM-FDS-AD-001 | Functional Specification — Advertisements | `docs/screen/Advertisement_Management/機能設計書_Advertisement_Management.md` | v2.1 use cases, state transitions, validation rules, and error handling. |

---

## 2. Screen Overview & Purpose (画面概要・目的)

### 2.1 Purpose (目的)
The Advertisement Management screens enable merchants to create, schedule, pay for, and manage promotional banners tied to their approved shop, and admins to approve or reject submitted advertisements. Advertisements whose payment is `completed`, approval is `approved`, `is_active` is true, and schedule is current are served to the public storefront with an announcement message. A platform-wide weekly limit of five and a per-merchant simultaneous limit of two active advertisements are enforced.

### 2.2 Target Users & Roles (対象ユーザーと権限)

| Attribute | Value |
| :--- | :--- |
| **Primary Actors** | Merchant (manages own shop's ads), Admin (approves/rejects ads), Buyer/Visitor (views active banners) |
| **Required Authentication** | JWT Bearer Token for merchant and admin operations; Public for active ad display |
| **Data Scope** | Merchant: own shop's ads only. Admin: all ads. Buyer: active approved ads (public). |
| **Access Control** | Merchant/Admin routes protected with `JwtAuthGuard` + `RolesGuard`; public endpoint for active ad display |

### 2.3 Core Functions & Basic Design Principles (主要機能・基本設計方針)
1. **Advertisement Creation** — Create promotional ads with title, content, announcement message, optional image, optional link, and schedule.
2. **Schedule Management** — Set start/end dates; ads only display within the scheduled window.
3. **Image Upload** — Upload ad image (JPG/PNG/WebP, max 5MB) with client-side validation.
4. **Advertising Fee Payment** — Pay the fee (stubbed gateway); record amount, status, and reference.
5. **Admin Approval Workflow** — Approve/reject with reason; rejected ads refunded and resubmittable.
6. **Approval Limits** — Platform-wide maximum of 5 active ads per ISO week and a maximum of 2 active ads per merchant, both validated at approval.
7. **Status Control** — Derived lifecycle (draft/pending/approved/rejected/scheduled/active/inactive/expired).
8. **Soft Delete** — Delete sets `is_active = false`, retaining the record for history.
9. **Platform Display** — Public banner carousel with announcement message for active ads.
10. **Form Validation** — Client-side (Zod) + server-side (class-validator) validation with real-time feedback.
11. **Internationalization** — Full i18n support for EN, JA, MY.
12. **Duration & Responsive Design** — Date range must be 7–30 days inclusive; the mobile-first dialog becomes a full-screen sheet on mobile.

**Lifecycle representation:** The required business flow is `draft → pending_payment → pending_approval → approved → active → expired`, with `rejected → resubmitted` as the recovery path. These are UI/business states derived from `payment_status`, `approval_status`, `is_active`, and the UTC schedule; they are not an additional database column. In particular, only a submitted ad with `payment_status = completed` may be shown in the pending-approval queue.

---

## 3. Screen Layout (画面レイアウト構成)

### 3.1 Overall Page Structure (全体画面構成)

#### Merchant Advertisement Management Page Layout (`/merchant/advertisements`)
```text
+-------------------------------------------------------------+
|                    BROWSER VIEWPORT                          |
+-------------------------------------------------------------+
|                                                             |
|  +-------------------------------------------------------+  |
|  |   [A] PAGE HEADER & SUMMARY                            |  |
|  |   [A1] Title "Advertisements"        [A3] + New Ad     |  |
|  |   [A2] Subtitle                                        |  |
|  |   +----------+ +----------+ +----------+               |  |
|  |   |[A4]Active| |[A5]Pending| |[A6]Expired|             |  |
|  |   +----------+ +----------+ +----------+               |  |
|  +-------------------------------------------------------+  |
|                                                             |
|  +-------------------------------------------------------+  |
|  |   [B] TOOLBAR                                          |  |
|  |   [B1]Status [B2]Approval [B3]Search    [B4]Export    |  |
|  +-------------------------------------------------------+  |
|                                                             |
|  +-------------------------------------------------------+  |
|  |   [C] ADVERTISEMENT CARD GRID                           |  |
|  |   +----------------+ +----------------+                |  |
|  |   | [C1] Thumbnail | | [C1] Thumbnail |                |  |
|  |   | [C2] Title     | | [C2] Title     |                |  |
|  |   | [C3] Badges    | | [C3] Badges    |                |  |
|  |   | [C4] Content   | | [C4] Content   |                |  |
|  |   | [C5] Announce  | | [C5] Announce  |                |  |
|  |   | [C6] Schedule  | | [C6] Schedule  |                |  |
|  |   | [C7] Link      | | [C7] Link      |                |  |
|  |   | [C8] Actions   | | [C8] Actions   |                |  |
|  |   +----------------+ +----------------+                |  |
|  +-------------------------------------------------------+  |
|                                                             |
|  +-------------------------------------------------------+  |
|  |   [D] PAGINATION                                       |  |
|  |   [D1] Page Info       [D2] < Prev   [D3] Next >       |  |
|  +-------------------------------------------------------+  |
|                                                             |
+-------------------------------------------------------------+
```

#### Create / Edit Advertisement Dialog Layout
```text
+-----------------------------------------------------------+
|               MODAL DIALOG (max-width 640px)               |
+-----------------------------------------------------------+
|  [E1] Create Advertisement              [E2] x            |
|  +-----------------------------------------------------+  |
|  |  [E3] Title *              [E4] Title Input         |  |
|  |  [E5] Content              [E6] Content Textarea    |  |
|  |  [E7] Announcement *       [E8] Announcement Textarea|  |
|  |  [E9] Image                [E10] Upload Zone        |  |
|  |                            [E11] File Name [E12] -  |  |
|  |  [E13] Link URL            [E14] Link URL Input     |  |
|  |  [E15] Start Date *        [E16] Start Date Input   |  |
|  |  [E17] End Date *          [E18] End Date Input     |  |
|  |  [E19] Active              [E20] Switch             |  |
|  +-----------------------------------------------------+  |
|  |  [F] PAYMENT & SUBMISSION PANEL                      |  |
|  |  [F1] Fee: $50.00   [F2] Status: Pending            |  |
|  |  [F3] Pay Fee       [F4] Submit for Approval        |  |
|  |  [F5] Approval Status / rejection reason            |  |
|  +-----------------------------------------------------+  |
|  [E21] Cancel                        [E22] Save Ad       |
+-----------------------------------------------------------+
```

#### Admin Advertisement Moderation Page Layout (`/admin/advertisements`)
```text
+-------------------------------------------------------------+
|                    BROWSER VIEWPORT                          |
+-------------------------------------------------------------+
|  +-------------------------------------------------------+  |
|  |   [G1] Page Title "Advertisement Moderation"          |  |
|  |   [G7] Weekly Limit: "3 of 5 active this week"        |  |
|  +-------------------------------------------------------+  |
|                                                             |
|  +-------------------------------------------------------+  |
|  |   [G2] PENDING APPROVAL QUEUE                          |  |
|  |   +-------------------------------------------------+  |  |
|  |   | [G3] Ad Preview (thumbnail, title, announcement, |  |  |
|  |   |      schedule, link, shop name, fee/payment)     |  |  |
|  |   | [G4] Approve          [G5] Reject                |  |  |
|  |   | [G6] Rejection Reason (shown when rejecting)     |  |  |
|  |   +-------------------------------------------------+  |  |
|  +-------------------------------------------------------+  |
|                                                             |
|  +-------------------------------------------------------+  |
|  |   [G8] ALL ADS TABLE (filterable)                     |  |
|  +-------------------------------------------------------+  |
|                                                             |
+-------------------------------------------------------------+
```

#### Public Storefront Banner Layout (`/` — buyer view)
```text
+-------------------------------------------------------------+
|  [H1] Banner Carousel (4:1 aspect ratio)                    |
|  +-------------------------------------------------------+  |
|  |  [H2] Ad Image (clickable)                            |  |
|  |  [H3] Announcement Message overlay                    |  |
|  +-------------------------------------------------------+  |
+-------------------------------------------------------------+
```

### 3.2 Responsive Layout Breakpoints (レスポンシブ対応)

| Breakpoint | Min Width | Layout Behavior |
| :--- | :--- | :--- |
| Mobile (default) | 0px | Single-column ad cards; dialog becomes full-screen sheet |
| Tablet (`md:`) | 768px | Sidebar collapses; two-column ad card grid |
| Desktop (`lg:`) | 1024px | Full dashboard layout with sidebar; three-column ad card grid |
| Wide (`xl:`) | 1280px | Three-column grid with enhanced spacing; dialog max-width 640px |

---

## 4. Item Definitions (画面項目定義)

### 4.1 Section [A]: Page Header & Summary (ページヘッダー・サマリー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 1 | `lblPageTitle` | Page Title | Heading (`<h5>`) | String | Yes | Text: "Advertisements" | — | — | i18n key: `merchant.ads.title`. |
| 2 | `lblPageSubtitle` | Page Subtitle | Static Label (`<p>`) | String | No | Text: "Create, pay for and manage your shop's promotional banners." | — | — | i18n key: `merchant.ads.subtitle`. Tailwind: `text-muted-foreground`. |
| 3 | `btnNewAd` | New Ad Button | Button (`primary`) | — | Yes | Visible. Text: "+ New Ad" | — | — | Opens Create Advertisement dialog. i18n key: `merchant.ads.new`. |
| 4 | `cardStatActive` | Active Ads Stat | Card | Number | Yes | Value: 0 | — | Derived from `advertisements` (`is_active = true`, `approval_status = 'approved'`, `payment_status = 'completed'`, in schedule) | i18n key: `merchant.ads.statActive`. The UI label “Paid” represents DB value `completed`. |
| 5 | `cardStatPending` | Pending Approval Stat | Card | Number | Yes | Value: 0 | — | Derived from `advertisements.approval_status = 'pending'` | i18n key: `merchant.ads.statPending`. Count of ads awaiting admin review. |
| 6 | `cardStatExpired` | Expired Stat | Card | Number | Yes | Value: 0 | — | Derived from `advertisements.expires_at < now` | i18n key: `merchant.ads.statExpired`. Count of past campaigns. |

### 4.2 Section [B]: Toolbar (ツールバー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 7 | `selStatusFilter` | Status Filter | Select | Enum | No | Default: "all" | Options: all, active, inactive, expired | Query param `status` | i18n key: `merchant.ads.filterStatus`. Re-triggers list fetch on change. |
| 8 | `selApprovalFilter` | Approval Status Filter | Select | Enum | No | Default: "all" | Options: all, pending, approved, rejected | Query param `approvalStatus` | i18n key: `merchant.ads.filterApproval`. Re-triggers list fetch on change. |
| 9 | `txtSearch` | Search Input | Input (`search`) | String(200) | No | Empty. Placeholder: "Search ads..." | MaxLength: 200 | — | Debounced search (300ms) within own ads. i18n key: `merchant.ads.search`. |
| 10 | `btnExport` | Export Button | Button (`outline`) | — | No | Visible. Text: "Export CSV" | — | — | i18n key: `merchant.ads.export`. Downloads CSV of the current filtered ad list. |

### 4.3 Section [C]: Advertisement Card (広告カード)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 11 | `imgThumbnail` | Ad Thumbnail | Image | URL(500) | Yes | Placeholder when no `image_url` | — | `advertisements.image_url` | Displays "BANNER" tag overlay. Alt text from ad title. |
| 12 | `lblAdTitle` | Ad Title | Static Label | String(200) | Yes | — | — | `advertisements.title` | Card heading. Truncated to 1 line. |
| 13 | `badgeStatus` | Status Badge | Badge | Enum | Yes | Derived from data | Values: Active / Inactive / Expired | Derived from `is_active`, `approval_status`, `payment_status`, schedule | Color: active `bg-green-100 text-green-800`, inactive `bg-gray-100 text-gray-800`, expired `bg-amber-100 text-amber-800`. |
| 14 | `badgeApproval` | Approval Status Badge | Badge | Enum | Yes | Derived from data | Values: Pending / Approved / Rejected | `advertisements.approval_status` | Color: pending `bg-amber-100 text-amber-800`, approved `bg-green-100 text-green-800`, rejected `bg-red-100 text-red-800`. |
| 15 | `badgePayment` | Payment Status Badge | Badge | Enum | Yes | Derived from data | DB values: pending / completed / failed / refunded; display: Pending / Paid / Failed / Refunded | `advertisements.payment_status` | `completed` is displayed as “Paid”. Colors: completed green, pending amber, failed red, refunded gray. |
| 16 | `lblContent` | Ad Content | Static Label | TEXT(5000) | No | — | — | `advertisements.content` | Truncated to 2 lines; tooltip for full content. |
| 17 | `lblAnnouncement` | Announcement Message | Static Label | VARCHAR(500) | Yes | — | — | `advertisements.announcement_message` | Banner message shown on storefront. Truncated; tooltip for full text. |
| 18 | `lblSchedule` | Schedule Display | Static Label | — | Yes | — | Format: "Aug 01, 2026 → Sep 15, 2026" | `advertisements.starts_at`, `expires_at` | Locale-aware date formatting. |
| 19 | `lnkLinkUrl` | Link URL | Link | URL(500) | No | Hidden when null | Valid URL | `advertisements.link_url` | Displayed truncated; opens in new tab. |
| 20 | `btnPaySubmit` | Pay & Submit Button | Button (`primary`) | — | No | Shown when lifecycle is draft or pending payment | — | `advertisements.payment_status`; `ad_payments` | i18n key: `merchant.ads.paySubmit`. Navigates to payment panel; submission remains disabled until the payment transaction is `completed`. |
| 21 | `btnResubmit` | Resubmit Button | Button (`primary`) | — | No | Shown when `approval_status = rejected` | — | — | i18n key: `merchant.ads.resubmit`. Opens edit dialog for rejected ad; saving re-submits to pending. |
| 22 | `alertRejection` | Rejection Reason Alert | Alert (`warning`) | TEXT(2000) | No | Hidden by default | — | `advertisements.rejection_reason` | Shown on rejected ads. Displays the admin's rejection reason. |
| 23 | `btnEdit` | Edit Button | Button (`ghost`) | — | Yes | Visible. Pencil icon | — | — | Opens Edit Advertisement dialog. |
| 24 | `btnDelete` | Delete Button | Button (`ghost`, danger) | — | Yes | Visible. Trash icon | — | — | Soft delete with confirmation dialog. |

### 4.4 Section [D]: Pagination (ページネーション)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 25 | `lblPageInfo` | Page Info | Static Label | String | Yes | Text: "Page 1 of 1" | Format: "Page {page} of {totalPages} · {total} ads" | Pagination `meta` | i18n key: `common.pageInfo`. |
| 26 | `btnPrev` | Previous Button | Button (`outline`) | — | Yes | Disabled on page 1 | — | — | i18n key: `common.prev`. Loads previous page. |
| 27 | `btnNext` | Next Button | Button (`primary`) | — | Yes | Disabled on last page | — | — | i18n key: `common.next`. Loads next page. |

### 4.5 Section [E]: Create / Edit Advertisement Dialog (広告作成・編集ダイアログ)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 28 | `lblDialogTitle` | Dialog Title | Heading (`<h5>`) | String | Yes | Text: "Create Advertisement" / "Edit Advertisement" | — | — | i18n key: `merchant.ads.formTitle`. |
| 29 | `btnCloseDialog` | Close Button | Button (`icon`) | — | No | Visible. X icon | — | — | Dismisses dialog without saving. |
| 30 | `lblTitle` | Title Label | Static Label (`<label>`) | String | — | Always displayed. Text: "Title" | — | — | Associated with `txtTitle` via `htmlFor`/`id`. Required indicator: `*`. |
| 31 | `txtTitle` | Title Input | Input (`text`) | String(200) | Mandatory | Empty (Create) / populated (Edit). Auto-focused. | MinLength: 1. MaxLength: 200. | `advertisements.title` | Required. |
| 32 | `lblContent` | Content Label | Static Label (`<label>`) | String | — | Always displayed. Text: "Content" | — | — | Associated with `txtContent` via `htmlFor`/`id`. |
| 33 | `txtContent` | Content Input | Textarea | TEXT(5000) | Optional | Empty (Create) / populated (Edit) | MaxLength: 5000. | `advertisements.content` | Optional. 4 rows. |
| 34 | `lblAnnouncement` | Announcement Message Label | Static Label (`<label>`) | String | — | Always displayed. Text: "Announcement Message" | — | — | Associated with `txtAnnouncement` via `htmlFor`/`id`. Required indicator: `*`. |
| 35 | `txtAnnouncement` | Announcement Message Input | Textarea | VARCHAR(500) | Mandatory | Empty (Create) / populated (Edit) | MaxLength: 500. | `advertisements.announcement_message` | Required. Banner message shown on storefront. Character counter `{n}/500`. |
| 36 | `lblImage` | Image Label | Static Label (`<label>`) | String | — | Always displayed. Text: "Image" | — | — | Associated with `uplImage`. |
| 37 | `uplImage` | Image Upload Zone | File Upload (drag & drop) | File (Binary) | Optional | Empty zone. Placeholder: "Drag & drop or click to upload" | Allowed MIME: `image/jpeg`, `image/png`, `image/webp`. Max 5MB. | `advertisements.image_url` (stored in uploads/ads) | Optional. Validates MIME + size client-side. |
| 38 | `lblUploadedFile` | Uploaded File Name | Static Label | String(255) | No | Hidden until file uploaded | — | — | Displays `{uuid}.{ext}`-style filename. Clickable to preview. |
| 39 | `btnBrowse` | Browse Files Button | Button (`outline`) | — | No | Visible. Text: "Browse Files" | — | — | Opens native file picker. |
| 40 | `lblLinkUrl` | Link URL Label | Static Label (`<label>`) | String | — | Always displayed. Text: "Link URL" | — | — | Associated with `txtLinkUrl` via `htmlFor`/`id`. |
| 41 | `txtLinkUrl` | Link URL Input | Input (`url`) | URL(500) | Optional | Empty | Format: valid URL (http/https). MaxLength: 500. | `advertisements.link_url` | Optional. Click-through link. |
| 42 | `lblStartDate` | Start Date Label | Static Label (`<label>`) | String | — | Always displayed. Text: "Start Date" | — | — | Associated with `txtStartDate` via `htmlFor`/`id`. Required indicator: `*`. |
| 43 | `txtStartDate` | Start Date Input | Input (`datetime-local`) | TIMESTAMPTZ | Mandatory | Empty (Create) / populated (Edit) | Valid datetime; stored as UTC. | `advertisements.starts_at` | Required. `week_number` is derived from the ISO week of this value. |
| 44 | `lblEndDate` | End Date Label | Static Label (`<label>`) | String | — | Always displayed. Text: "End Date" | — | — | Associated with `txtEndDate` via `htmlFor`/`id`. Required indicator: `*`. |
| 45 | `txtEndDate` | End Date Input | Input (`datetime-local`) | TIMESTAMPTZ | Mandatory | Default: Start Date + 30 days (Create) | Must be after `txtStartDate`; duration is 7–30 days inclusive. | `advertisements.expires_at` | Required. UI validates the DB constraint (`expires_at > starts_at`) and requirement limits M-AD-013/014. |
| 46 | `lblActiveToggle` | Active Toggle Label | Static Label (`<label>`) | String | — | Text: "Visible to buyers during the scheduled period" | — | — | Associated with `swActive`. |
| 47 | `swActive` | Active Toggle | Switch | BOOLEAN | Yes | Default: ON | Values: true / false | `advertisements.is_active` | i18n key: `merchant.ads.isActive`. |
| 48 | `btnCancel` | Cancel Button | Button (`outline`) | — | No | Visible. Text: "Cancel" | — | — | Closes dialog without saving. |
| 49 | `btnSaveAd` | Save Ad Button | Button (`primary`) | — | Yes | Create: "Save Ad" / Edit: "Update Ad" | — | — | Saves draft or updates ad. Loading: Spinner + "Saving...". Disabled when loading. |

### 4.6 Section [F]: Payment & Submission Panel (支払い・申請パネル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 50 | `lblFeeSummary` | Fee Summary | Static Label | Currency (DECIMAL(10,2)) | Yes | Calculated fee, initially loading | Placement/tier daily rate × selected duration; show configured currency. | `ad_fee_settings.daily_rate`; `ad_payments.amount` after payment | Resolve the active `(placement, tier)` fee setting. A later fee change must not change an already-paid amount. |
| 51 | `lblPaymentStatus` | Payment Status Text | Static Label | Enum | Yes | Text: "Payment: Pending" | DB: pending / completed / failed / refunded; UI: Pending / Paid / Failed / Refunded. | `advertisements.payment_status`; latest `ad_payments.payment_status` | The user-facing word “Paid” maps to canonical DB value `completed`. |
| 52 | `btnPayFee` | Pay Fee Button | Button (`primary`) | — | No | Shown when payment is pending or failed and the ad is editable | — | Creates/updates `ad_payments` transaction; mirrors result to `advertisements.payment_status` | i18n key: `merchant.ads.pay`. On success, store amount, method, transaction/reference and paid timestamp; status becomes `completed`. |
| 53 | `btnSubmitApproval` | Submit for Approval Button | Button (`primary`) | — | No | Disabled unless payment is `completed` | — | `advertisements.payment_status`, `approval_status` | i18n key: `merchant.ads.submit`. Submission moves merchant-visible lifecycle to pending approval; do not enable merely because a payment reference exists. |
| 54 | `lblApprovalStatus` | Approval Status Text | Static Label | Enum | Yes | Text: "Approval: Pending" | Values: Pending / Approved / Rejected + `rejection_reason` | `advertisements.approval_status`, `rejection_reason` | Shows rejection reason when rejected. |

### 4.7 Section [G]: Admin Advertisement Moderation (広告審査画面)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 55 | `lblAdminTitle` | Admin Page Title | Heading (`<h5>`) | String | Yes | Text: "Advertisement Moderation" | — | — | i18n key: `admin.ads.title`. |
| 56 | `listPendingQueue` | Pending Queue | Card / List | — | Yes | Loaded with `approval_status = pending` + `payment_status = completed` submitted ads | Sorted oldest first | `advertisements` joined to `ad_payments` as needed | i18n key: `admin.ads.pendingQueue`. Exclude unpaid drafts even though their default approval field is `pending`. |
| 57 | `cardAdPreview` | Ad Preview | Card | — | Yes | Shows thumbnail, title, content, announcement, schedule, link, shop name, fee/payment info | — | `advertisements` + `shops.name` | Full preview before decision. |
| 58 | `lblWeeklyLimit` | Weekly Limit Indicator | Static Label | String | Yes | Text: "3 of 5 active ads this week" | 0–5; ISO week derived from `starts_at` in UTC. | Count of eligible active ads by `week_number` | i18n key: `admin.ads.weeklyLimit`. It is a platform-wide limit, not a merchant quota. |
| 59 | `btnApprove` | Approve Button | Button (`success`) | — | Yes | Visible. Text: "Approve" | Only eligible paid submissions. | Updates `advertisements.approval_status`, `approved_by`, `approved_at` | i18n key: `admin.ads.approve`. Atomically validate weekly limit (max 5) and merchant simultaneous active limit (max 2) before approving. |
| 60 | `btnReject` | Reject Button | Button (`destructive`) | — | Yes | Visible. Text: "Reject" | — | — | i18n key: `admin.ads.reject`. Reveals `txtRejectReason`. |
| 61 | `txtRejectReason` | Rejection Reason Input | Textarea | TEXT(2000) | Conditional | Hidden until Reject clicked | MaxLength: 2000. Required to submit rejection. | `advertisements.rejection_reason` | Required when rejecting. |
| 62 | `tblAllAds` | All Ads Table | Table | — | No | All ads with filterable approval/payment status | — | `advertisements` (all) | i18n key: `admin.ads.all`. Includes pagination. |

### 4.8 Section [H]: Public Storefront Banner (ストアフロントバナー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 63 | `bannerCarousel` | Banner Carousel | Carousel | — | Yes | Renders all active ads from `GET /api/v1/ads/active` | 4:1 aspect ratio | Redis cache `cache:ads:active` (TTL 5 min) | Auto-play with manual navigation arrows. |
| 64 | `imgBanner` | Banner Image | Image | URL(500) | No | Hidden when `image_url` null | — | `advertisements.image_url` | Served via signed URL / API endpoint. |
| 65 | `lblBannerAnnouncement` | Announcement Message | Static Label | VARCHAR(500) | Yes | Text: `announcement_message` | — | `advertisements.announcement_message` | Overlay on banner image. i18n aware. |
| 66 | `lnkBanner` | Banner Link | Link | URL(500) | No | Only when `link_url` present | Valid URL | `advertisements.link_url` | Buyer click navigates to the target link. |

### 4.9 Section [I]: Error Alert (エラーアラート)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 67 | `alertError` | Error Alert Banner | Alert (`destructive`) | String | Conditional | Hidden by default. Shown on API error. | — | API error response message | Tailwind: `border-destructive/50 text-destructive`. Dismissible. |

---

## 5. Item Behaviors & Event Specifications (各項目における挙動・イベント仕様)

### 5.1 Navigate to Advertisement Management (`btnNewAd` onClick / route entry)
- **Trigger:** User clicks "Advertisements" in merchant dashboard, or clicks "+ New Ad".
- **Processing Logic:**
  1. Verify JWT and merchant role (route guard).
  2. Fetch merchant's shop via `GET /shops/merchant`. If no shop or `is_approved = false`, show block message "Your shop must be approved before creating advertisements".
  3. Fetch ad list `GET /api/v1/ads` with pagination (page 1, limit 20).
  4. Render loading skeleton during fetch; empty state when no ads.
- **Exception Handling:**
  - `401`: Redirect to `/login`.
  - `403`: Redirect to `/unauthorized`.
  - Shop not approved: display warning banner.

### 5.2 Open Create / Edit Dialog (`btnNewAd` / `btnEdit` / `btnResubmit` onClick)
- **Trigger:** User clicks "+ New Ad", "Edit", or "Resubmit".
- **Processing Logic:**
  1. **Create:** Open empty form dialog. Auto-focus `txtTitle`. Default `swActive` ON; default `txtEndDate` = `txtStartDate` + 30 days, which remains within the allowed 7–30 day range.
  2. **Edit / Resubmit:** Populate all fields from existing ad data. Show current image preview in `uplImage`. Show `alertRejection` and the Payment & Submission panel when applicable.
  3. For rejected ads, saving re-submits (`approval_status` → `pending`).
- **Exception Handling:** None applicable.

### 5.3 Save Advertisement (`btnSaveAd` onClick)
- **Trigger:** User clicks "Save Ad" (create) or "Update Ad" (edit).
- **Processing Logic:**
  1. **Client-Side Pre-Check:** Zod validation — title required (≤ 200), announcement required (≤ 500), content ≤ 5000, link valid URL if present, image valid if attached, `expiresAt > startsAt`, and duration of 7–30 days inclusive.
  2. **Create:** `POST /api/v1/ads` (multipart/form-data if image attached). Backend derives ISO `week_number` from `starts_at`, creates an unpaid draft/pending-payment lifecycle record with `payment_status = pending`; the default approval column value must not place it in the admin queue before submission.
  3. **Edit:** `PATCH /api/v1/ads/:id` with partial fields; recompute `week_number` if `starts_at` changed. A rejected ad may be edited and resubmitted; it must not be treated as a fresh approval submission until payment is `completed` and submit is invoked.
  4. Backend invalidates cache `DEL cache:ads:active`; logs `AD_CREATED`/`AD_UPDATED` audit event.
  5. **Post-Execution UI:** Close dialog, refresh ad list, show success toast. New ad appears as draft with `btnPaySubmit`.
- **Exception Handling:**
  - `VAL-AD-001/002` (title): inline error on `txtTitle`.
  - `VAL-AD-010/011` (announcement): inline error on `txtAnnouncement`.
  - `VAL-AD-040` (date range): inline error on `txtEndDate`.
  - `413` (image size), `415` (image type): inline error on `uplImage`.
  - `403`: "Shop is not approved" or "You don't have permission to manage this ad".
  - `404`: "Advertisement not found" (refresh list).

### 5.4 Pay Advertising Fee (`btnPayFee` onClick)
- **Trigger:** User clicks "Pay Fee" on a draft ad.
- **Processing Logic:**
  1. `POST /api/v1/ads/:id/pay` with optional `paymentReference`.
  2. Backend verifies ownership and a payable state; resolves the active `ad_fee_settings` rate for the selected placement/tier and duration, then creates/updates the associated `ad_payments` transaction.
  3. On confirmed payment, backend sets `ad_payments.payment_status` and `advertisements.payment_status` to `completed`, and records amount, payment method, transaction/reference, and `paid_at`; logs `AD_PAID`.
  4. **Post-Execution UI:** Update `lblPaymentStatus`, `badgePayment`, enable `btnSubmitApproval`, show success toast.
- **Exception Handling:**
  - `422`: "Advertising fee must be paid before submission" (idempotency guard).
  - `500`: payment verification failure → `SYS_001` message.

### 5.5 Submit for Approval (`btnSubmitApproval` onClick)
- **Trigger:** User clicks "Submit for Approval" (enabled only when `payment_status = completed`).
- **Processing Logic:**
  1. `POST /api/v1/ads/:id/submit`.
  2. Backend verifies ownership and `payment_status = completed`; the ad enters the pending-approval lifecycle and is eligible for the admin queue.
  3. Backend invalidates cache; notifies admin of pending approval; logs `AD_SUBMITTED`.
  4. **Post-Execution UI:** Ad becomes read-only for the merchant until admin decision. Show toast "Ad submitted for approval".
- **Exception Handling:**
  - `422` (not paid): toast error "Advertising fee must be paid before submission".
  - `404`: "Advertisement not found".

### 5.6 Admin Approve (`btnApprove` onClick)
- **Trigger:** Admin clicks "Approve" on a pending ad.
- **Processing Logic:**
  1. `POST /api/v1/admin/ads/:id/approve`.
  2. Backend verifies admin role and `approval_status = pending`.
  3. Backend atomically validates the platform weekly limit (approved active ads with the same `week_number`, maximum 5) and the merchant simultaneous active-ad limit (maximum 2); return the applicable conflict error if either would be exceeded.
  4. Backend sets `approval_status = approved`, `approved_by` (admin id), `approved_at` (now); invalidates cache; logs `AD_APPROVED`.
  5. **Post-Execution UI:** Remove ad from pending queue, refresh `lblWeeklyLimit`, notify merchant, show success toast.
- **Exception Handling:**
  - `409 WEEKLY_LIMIT_REACHED`: alert "Weekly advertisement limit reached (max 5)".
  - `404`: "Advertisement not found".

### 5.7 Admin Reject (`btnReject` / `txtRejectReason` onClick)
- **Trigger:** Admin clicks "Reject" on a pending ad, enters a reason, confirms.
- **Processing Logic:**
  1. Clicking "Reject" reveals `txtRejectReason` (required).
  2. Submit `POST /api/v1/admin/ads/:id/reject` with `{ rejectionReason }`.
  3. Backend verifies admin role and `approval_status = pending`; validates `rejection_reason` (required, ≤ 2000).
  4. Backend sets `approval_status = rejected`, `approved_by`, `approved_at`, and `rejection_reason`; creates the refund record on `ad_payments` (`refund_amount`, `refund_reason`, `refunded_at`) and mirrors `payment_status = refunded` to the advertisement; invalidates cache; logs `AD_REJECTED`; notifies merchant.
  5. **Post-Execution UI:** Remove ad from pending queue, show success toast.
- **Exception Handling:**
  - `VAL-AD-050`: "Rejection reason is required" inline on `txtRejectReason`.
  - `404`: "Advertisement not found".

### 5.8 List / Filter / Search (`selStatusFilter` / `selApprovalFilter` / `txtSearch` onChange)
- **Trigger:** User changes a filter or types in the search box.
- **Processing Logic:**
  1. Debounce search input (300ms).
  2. Re-fetch `GET /api/v1/ads?page=1&limit=20&status=...&approvalStatus=...&search=...`.
  3. Backend applies status filter (active: `is_active = true` AND `approval_status = approved` AND `payment_status = completed` AND in schedule) and approval filter.
  4. Update pagination meta (`lblPageInfo`) and stat cards.
  5. Show loading skeleton during fetch; empty state when no matches.
- **Exception Handling:**
  - `400` (invalid query param): show validation message.
  - Network error: `NET_ERR` alert.

### 5.9 Pagination (`btnPrev` / `btnNext` onClick)
- **Trigger:** User clicks Previous or Next.
- **Processing Logic:**
  1. Update page number (min 1, max totalPages).
  2. Re-fetch list with current filters and new page.
  3. Scroll to top of list; update `lblPageInfo`.
- **Exception Handling:** Same as 5.8.

### 5.10 Ad Image Upload (`uplImage` onChange / onDrop)
- **Trigger:** User selects a file via file picker or drag & drop.
- **Processing Logic:**
  1. Validate MIME type ∈ {`image/jpeg`, `image/png`, `image/webp`}.
  2. Validate file size ≤ 5MB.
  3. If valid: display filename in `lblUploadedFile`, show remove action, preview image. Store file until form submission.
  4. If invalid: show inline error on upload zone; keep upload zone visible.
- **Exception Handling:**
  - `VAL-AD-030`: "Only JPG, PNG, and WebP images are supported".
  - `VAL-AD-031`: "Image file must not exceed 5MB".

### 5.11 Soft Delete (`btnDelete` onClick)
- **Trigger:** User clicks delete icon and confirms in the confirmation dialog.
- **Processing Logic:**
  1. Show confirmation dialog: "Delete this advertisement? This action cannot be undone."
  2. On confirm: `DELETE /api/v1/ads/:id`.
  3. Backend verifies ownership; sets `is_active = false`; invalidates cache; logs `AD_DELETED`.
  4. **Post-Execution UI:** Remove ad from list, refresh stat cards, show success toast.
- **Exception Handling:**
  - `404`: "Advertisement not found" (refresh list).
  - Cancel: no action.

### 5.12 Toggle Active/Inactive (`swActive` onChange)
- **Trigger:** User toggles the active switch in the edit dialog.
- **Processing Logic:**
  1. Store new value in form state; saved on "Update Ad" (`PATCH /api/v1/ads/:id`).
  2. An ad is only displayed when `is_active = true`, `approval_status = approved`, `payment_status = completed`, and its UTC schedule is current.
  3. Backend invalidates cache on save.
- **Exception Handling:** None applicable.

### 5.13 Export CSV (`btnExport` onClick)
- **Trigger:** User clicks "Export CSV".
- **Processing Logic:**
  1. Request current filtered ad list (respecting pagination/filters) as CSV.
  2. Generate file client-side or via API; trigger browser download `advertisements.csv`.
- **Exception Handling:** None applicable.

### 5.14 Public Banner Display (`lnkBanner` onClick)
- **Trigger:** Buyer/visitor clicks an active banner on the storefront.
- **Processing Logic:**
  1. `GET /api/v1/ads/active` returns completed-payment, approved, active, in-schedule ads (Redis cache `cache:ads:active`, TTL 5 min), capped at five for the storefront rotation.
  2. Render banner image + announcement message in carousel.
  3. Click navigates to `link_url` (new tab).
- **Exception Handling:** On cache miss, backend re-queries DB; no user-visible error.

---

## 6. Validation & Error Message Mapping (バリデーション及びエラーメッセージマッピング)

### 6.1 Advertisement Form Validation Errors (Create/Edit Dialog)

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-AD-001** | `txtTitle` | Title is empty | Red border. Text below field. | "Title is required" | "タイトルは必須です" |
| **VAL-AD-002** | `txtTitle` | Title exceeds 200 characters | Red border. Text below field. | "Title must not exceed 200 characters" | "タイトルは200文字以内で入力してください" |
| **VAL-AD-010** | `txtContent` | Content exceeds 5000 characters | Red border. Text below field. | "Content must not exceed 5000 characters" | "内容は5000文字以内で入力してください" |
| **VAL-AD-020** | `txtAnnouncement` | Announcement message is empty | Red border. Text below field. | "Announcement message is required" | "告知メッセージは必須です" |
| **VAL-AD-021** | `txtAnnouncement` | Announcement exceeds 500 characters | Red border. Text below field. | "Announcement message must not exceed 500 characters" | "告知メッセージは500文字以内で入力してください" |
| **VAL-AD-030** | `uplImage` | Image MIME type not allowed | Inline error on upload zone | "Only JPG, PNG, and WebP images are supported" | "JPG、PNG、WebP形式の画像のみサポートされています" |
| **VAL-AD-031** | `uplImage` | Image file exceeds 5MB | Inline error on upload zone | "Image file must not exceed 5MB" | "画像ファイルは5MB以下である必要があります" |
| **VAL-AD-032** | `txtLinkUrl` | Link URL invalid format | Red border. Text below field. | "Invalid link URL" | "リンクURLが無効です" |
| **VAL-AD-033** | `txtLinkUrl` | Link URL exceeds 500 characters | Red border. Text below field. | "Link URL must not exceed 500 characters" | "リンクURLは500文字以内で入力してください" |
| **VAL-AD-040** | `txtStartDate` | Start date empty / invalid | Red border. Text below field. | "Start date is required" / "Invalid start date" | "開始日時は必須です" / "開始日時が無効です" |
| **VAL-AD-041** | `txtEndDate` | End date empty / invalid | Red border. Text below field. | "End date is required" / "Invalid end date" | "終了日時は必須です" / "終了日時が無効です" |
| **VAL-AD-042** | `txtEndDate` | End date not after start date | Red border. Text below field. | "End date must be after start date" | "終了日時は開始日時より後の日時を入力してください" |
| **AD_DURATION_TOO_SHORT** | `txtEndDate` | Duration (`expiresAt - startsAt`) is less than 7 days | Red border. Text below field. | "Advertisement must run for at least 7 days" | "広告は最低7日間は表示する必要があります" |
| **AD_DURATION_TOO_LONG** | `txtEndDate` | Duration (`expiresAt - startsAt`) exceeds 30 days | Red border. Text below field. | "Advertisement duration must not exceed 30 days" | "広告の表示期間は30日以内にしてください" |
| **VAL-AD-050** | `txtRejectReason` | Rejection reason empty | Red border. Text below field. | "Rejection reason is required" | "却下理由は必須です" |

### 6.2 API / Business Rule Errors (Merchant)

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AD-401** | `alertError` | Missing or invalid JWT (401) | Redirect to login | "Session expired. Please sign in again" | "セッションが切れました。再度ログインしてください" |
| **AD-403** | `alertError` | Not merchant/admin or not ad owner (403) | Alert banner (destructive) | "You don't have permission to manage this ad" | "この広告を管理する権限がありません" |
| **AD-403-SHOP** | `alertError` | Shop not approved (403) | Alert banner (destructive) | "Your shop must be approved before creating advertisements" | "広告を作成するには店舗の承認が必要です" |
| **AD-404** | `alertError` | Advertisement not found (404) | Alert banner (destructive) | "Advertisement not found" | "広告が見つかりません" |
| **AD-409** | `alertError` | Invalid schedule dates (409) | Alert banner (destructive) | "Invalid schedule dates" | "広告期間が不正です" |
| **AD_DURATION_TOO_SHORT** | `txtEndDate` | Advertisement duration is less than 7 days (400) | Inline error and form summary | "Advertisement must run for at least 7 days" | "広告は最低7日間は表示する必要があります" |
| **AD_DURATION_TOO_LONG** | `txtEndDate` | Advertisement duration exceeds 30 days (400) | Inline error and form summary | "Advertisement duration must not exceed 30 days" | "広告の表示期間は30日以内にしてください" |
| **AD-422** | `alertError` | Submit without payment (422) | Alert banner (destructive) | "Advertising fee must be paid before submission" | "提出前に広告料金をお支払いください" |
| **AD-429** | `alertError` | Rate limit exceeded (429) | Alert banner (destructive) | "Too many requests. Please wait {seconds} seconds" | "リクエストが多すぎます。{seconds}秒お待ちください" |
| **SYS_001** | `alertError` | Server error (500) | Alert banner (destructive) | "Something went wrong. Please try again" | "問題が発生しました。もう一度お試しください" |
| **NET_ERR** | `alertError` | Network error | Alert banner (destructive) | "Network error. Please check your connection" | "ネットワークエラー。接続を確認してください" |

### 6.3 Admin Approval Errors

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AD-LIMIT** | `alertError` | Weekly limit (5/week) reached on approve (409) | Alert banner (destructive) | "Weekly advertisement limit reached (max 5)" | "今週の広告枠上限(5件)に達しました" |
| **MERCHANT_AD_LIMIT_REACHED** | `alertError` | Merchant already has two simultaneous active ads (409) | Alert banner (destructive) | "Maximum 2 active ads per merchant reached" | "出品者ごとの同時掲載広告上限（2件）に達しました" |
| **VAL-AD-050** | `txtRejectReason` | Rejection without reason | Red border. Text below field. | "Rejection reason is required" | "却下理由は必須です" |
| **AD-403** | `alertError` | Non-admin attempts approve/reject (403) | Redirect to `/unauthorized` | "Admin access required" | "管理者権限が必要です" |

---

## 7. Database Fields Mapping (データベースフィールドマッピング)

### 7.1 Create / Edit Advertisement Form → Database

| Form Field | API Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| `txtTitle` | `title` | `title` | `advertisements` | VARCHAR(255) NOT NULL (UI/business maximum: 200) |
| `txtContent` | `content` | `content` | `advertisements` | TEXT (nullable) |
| `txtAnnouncement` | `announcementMessage` | `announcement_message` | `advertisements` | VARCHAR(500) NOT NULL |
| `uplImage` | `imageUrl` | `image_url` | `advertisements` | TEXT (nullable; UI/API maximum: 500) |
| `txtLinkUrl` | `linkUrl` | `link_url` | `advertisements` | TEXT (nullable; UI/API maximum: 500) |
| `swActive` | `isActive` | `is_active` | `advertisements` | BOOLEAN DEFAULT TRUE |
| `txtStartDate` | `startsAt` | `starts_at` | `advertisements` | TIMESTAMPTZ NOT NULL |
| `txtEndDate` | `expiresAt` | `expires_at` | `advertisements` | TIMESTAMPTZ NOT NULL |
| — (system) | — | `week_number` | `advertisements` | INTEGER (derived from `starts_at`) |
| — (system) | — | `shop_id` | `advertisements` | UUID FK → `shops.id` |
| — (system) | — | `approval_status` | `advertisements` | VARCHAR(20) DEFAULT 'pending' |
| — (system) | — | `payment_status` | `advertisements` | VARCHAR(20) DEFAULT 'pending' |

### 7.2 Payment / Approval Fields → Database

| Form Field | API Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| `btnPayFee` (result) | `paymentStatus` | `payment_status` | `advertisements` | VARCHAR(20) (`pending`/`completed`/`failed`/`refunded`; `completed` displays as Paid) |
| `btnPayFee` (result) | `paymentAmount` | `payment_amount` | `advertisements` | DECIMAL(10,2) (nullable) |
| `btnPayFee` (result) | `paymentReference` | `payment_reference` | `advertisements` | VARCHAR(255) (nullable) |
| `btnApprove` (result) | `approvalStatus` | `approval_status` | `advertisements` | VARCHAR(20) ('pending'/'approved'/'rejected') |
| `btnApprove` (result) | `approvedBy` | `approved_by` | `advertisements` | UUID FK → `users.id` (nullable) |
| `btnApprove` (result) | `approvedAt` | `approved_at` | `advertisements` | TIMESTAMPTZ (nullable) |
| `txtRejectReason` | `rejectionReason` | `rejection_reason` | `advertisements` | TEXT (nullable) |
| — (system) | fee lookup | `daily_rate` | `ad_fee_settings` | DECIMAL(10,2), selected by active `placement` + `tier` |
| — (system) | payment transaction | `ad_id`, `merchant_id`, `amount`, `payment_method`, `payment_status`, `transaction_id`, `paid_at` | `ad_payments` | UUID FKs / DECIMAL(10,2) / VARCHAR(50) / VARCHAR(20) / VARCHAR(255) / TIMESTAMPTZ |
| — (system) | refund transaction | `refund_amount`, `refund_reason`, `refunded_at` | `ad_payments` | DECIMAL(10,2) / TEXT / TIMESTAMPTZ (nullable until refund) |

---

## 8. API Response Mapping (APIレスポンスマッピング)

### 8.1 Create Advertisement Success Response (201)

```json
{
  "data": {
    "id": "clx1234567890",
    "shopId": "clxshop000001",
    "title": "Summer Serum Sale",
    "content": "20% off all serums this month.",
    "announcementMessage": "Summer Serum Sale - 20% OFF!",
    "imageUrl": "/uploads/ads/9f2c.../banner.webp",
    "linkUrl": "/products?category=serums",
    "isActive": true,
    "approvalStatus": "pending",
    "paymentStatus": "pending",
    "paymentAmount": null,
    "paymentReference": null,
    "approvedBy": null,
    "approvedAt": null,
    "rejectionReason": null,
    "weekNumber": 33,
    "startsAt": "2026-08-15T00:00:00.000Z",
    "expiresAt": "2026-09-14T23:59:59.000Z",
    "createdAt": "2026-08-11T04:00:00.000Z"
  }
}
```

### 8.2 List Advertisements Success Response (200)

```json
{
  "data": [
    {
      "id": "clx1234567890",
      "title": "Summer Serum Sale",
      "announcementMessage": "Summer Serum Sale - 20% OFF!",
      "imageUrl": "/uploads/ads/9f2c.../banner.webp",
      "isActive": true,
      "approvalStatus": "approved",
      "paymentStatus": "completed",
      "startsAt": "2026-08-15T00:00:00.000Z",
      "expiresAt": "2026-09-14T23:59:59.000Z"
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

### 8.3 Admin Approve Success Response (200)

```json
{
  "data": {
    "id": "clx1234567890",
    "approvalStatus": "approved",
    "approvedBy": "clxadmin00001",
    "approvedAt": "2026-08-11T06:00:00.000Z",
    "paymentStatus": "completed"
  }
}
```

### 8.4 Error Response — Weekly Limit Reached (409)

```json
{
  "statusCode": 409,
  "error": "CONFLICT",
  "errorCode": "WEEKLY_LIMIT_REACHED",
  "message": "Weekly advertisement limit reached (max 5)",
  "timestamp": "2026-08-11T06:00:00.000Z",
  "path": "/api/v1/admin/ads/clx1234567890/approve"
}
```

### 8.5 Error Response — Submit Without Payment (422)

```json
{
  "statusCode": 422,
  "error": "UNPROCESSABLE_ENTITY",
  "errorCode": "AD_422",
  "message": "Advertising fee must be paid before submission",
  "timestamp": "2026-08-11T06:00:00.000Z",
  "path": "/api/v1/ads/clx1234567890/submit"
}
```

### 8.6 Active Advertisements Response (Public, 200)

```json
{
  "data": [
    {
      "id": "clx1234567890",
      "shopId": "clxshop000001",
      "title": "Summer Serum Sale",
      "content": "20% off all serums this month.",
      "announcementMessage": "Summer Serum Sale - 20% OFF!",
      "imageUrl": "/uploads/ads/9f2c.../banner.webp",
      "linkUrl": "/products?category=serums",
      "startsAt": "2026-08-15T00:00:00.000Z",
      "expiresAt": "2026-09-14T23:59:59.000Z"
    }
  ]
}
```

---

## 9. i18n Keys Reference (i18nキーリファレンス)

### 9.1 English (en) — Merchant Advertisements

| Key | Value |
| :--- | :--- |
| `merchant.ads.title` | "Advertisements" |
| `merchant.ads.subtitle` | "Create, pay for and manage your shop's promotional banners." |
| `merchant.ads.new` | "New Ad" |
| `merchant.ads.statActive` | "Active Ads" |
| `merchant.ads.statPending` | "Pending Approval" |
| `merchant.ads.statExpired` | "Expired" |
| `merchant.ads.filterStatus` | "All statuses" |
| `merchant.ads.filterApproval` | "All approval statuses" |
| `merchant.ads.search` | "Search ads..." |
| `merchant.ads.export` | "Export CSV" |
| `merchant.ads.formTitle.create` | "Create Advertisement" |
| `merchant.ads.formTitle.edit` | "Edit Advertisement" |
| `merchant.ads.title` | "Title" |
| `merchant.ads.content` | "Content" |
| `merchant.ads.announcement` | "Announcement Message" |
| `merchant.ads.image` | "Image" |
| `merchant.ads.imagePlaceholder` | "Drag & drop or click to upload" |
| `merchant.ads.imageHelper` | "JPG, PNG, or WebP. Maximum 5MB." |
| `merchant.ads.browse` | "Browse Files" |
| `merchant.ads.linkUrl` | "Link URL" |
| `merchant.ads.linkUrlPlaceholder` | "https://example.com" |
| `merchant.ads.startDate` | "Start Date" |
| `merchant.ads.endDate` | "End Date" |
| `merchant.ads.isActive` | "Visible to buyers during the scheduled period" |
| `merchant.ads.save` | "Save Ad" |
| `merchant.ads.update` | "Update Ad" |
| `merchant.ads.saving` | "Saving..." |
| `merchant.ads.pay` | "Pay Fee" |
| `merchant.ads.submit` | "Submit for Approval" |
| `merchant.ads.paySubmit` | "Pay & Submit" |
| `merchant.ads.resubmit` | "Resubmit" |
| `merchant.ads.fee` | "Advertising Fee" |
| `merchant.ads.success.create` | "Advertisement created successfully" |
| `merchant.ads.success.update` | "Advertisement updated successfully" |
| `merchant.ads.success.paid` | "Advertising fee paid successfully" |
| `merchant.ads.success.submitted` | "Advertisement submitted for approval" |
| `merchant.ads.success.deleted` | "Advertisement deleted" |
| `merchant.ads.error.shopNotApproved` | "Your shop must be approved before creating advertisements" |
| `merchant.ads.error.noPermission` | "You don't have permission to manage this ad" |
| `merchant.ads.error.notFound` | "Advertisement not found" |
| `merchant.ads.deleteConfirm` | "Delete this advertisement? This action cannot be undone." |
| `merchant.ads.empty` | "No advertisements yet. Create your first ad to promote your shop." |

### 9.2 English (en) — Admin Moderation & Common

| Key | Value |
| :--- | :--- |
| `admin.ads.title` | "Advertisement Moderation" |
| `admin.ads.pendingQueue` | "Pending Approval Queue" |
| `admin.ads.approve` | "Approve" |
| `admin.ads.reject` | "Reject" |
| `admin.ads.rejectReason` | "Rejection Reason" |
| `admin.ads.rejectReasonPlaceholder` | "Explain why this advertisement is rejected" |
| `admin.ads.all` | "All Advertisements" |
| `admin.ads.weeklyLimit` | "{count} of {limit} active ads this week" |
| `admin.ads.success.approved` | "Advertisement approved" |
| `admin.ads.success.rejected` | "Advertisement rejected and refunded" |
| `common.edit` | "Edit" |
| `common.delete` | "Delete" |
| `common.cancel` | "Cancel" |
| `common.save` | "Save" |
| `common.prev` | "Previous" |
| `common.next` | "Next" |
| `common.pageInfo` | "Page {page} of {totalPages} · {total} ads" |
| `common.status.active` | "Active" |
| `common.status.inactive` | "Inactive" |
| `common.status.expired` | "Expired" |
| `common.approval.pending` | "Pending" |
| `common.approval.approved` | "Approved" |
| `common.approval.rejected` | "Rejected" |
| `common.payment.pending` | "Payment Pending" |
| `common.payment.paid` | "Paid" |
| `common.payment.failed` | "Payment Failed" |
| `common.payment.refunded` | "Refunded" |

### 9.3 Japanese (ja) — Merchant Advertisements

| Key | Value |
| :--- | :--- |
| `merchant.ads.title` | "広告管理" |
| `merchant.ads.subtitle` | "店舗のプロモーションバナーを作成・支払い・管理します。" |
| `merchant.ads.new` | "新規広告" |
| `merchant.ads.statActive` | "掲載中" |
| `merchant.ads.statPending` | "承認待ち" |
| `merchant.ads.statExpired` | "終了" |
| `merchant.ads.filterStatus` | "すべての状態" |
| `merchant.ads.filterApproval` | "すべての承認状態" |
| `merchant.ads.search` | "広告を検索..." |
| `merchant.ads.export` | "CSV出力" |
| `merchant.ads.formTitle.create` | "広告作成" |
| `merchant.ads.formTitle.edit` | "広告編集" |
| `merchant.ads.title` | "タイトル" |
| `merchant.ads.content` | "内容" |
| `merchant.ads.announcement` | "告知メッセージ" |
| `merchant.ads.image` | "画像" |
| `merchant.ads.imagePlaceholder` | "ドラッグ＆ドロップまたはクリックしてアップロード" |
| `merchant.ads.imageHelper` | "JPG、PNG、WebP形式。最大5MB。" |
| `merchant.ads.browse` | "ファイルを選択" |
| `merchant.ads.linkUrl` | "リンクURL" |
| `merchant.ads.linkUrlPlaceholder` | "https://example.com" |
| `merchant.ads.startDate` | "開始日時" |
| `merchant.ads.endDate` | "終了日時" |
| `merchant.ads.isActive` | "掲載期間中は購入者に表示する" |
| `merchant.ads.save` | "広告を保存" |
| `merchant.ads.update` | "更新" |
| `merchant.ads.saving` | "保存中..." |
| `merchant.ads.pay` | "料金を支払う" |
| `merchant.ads.submit` | "承認申請" |
| `merchant.ads.paySubmit` | "支払い・申請" |
| `merchant.ads.resubmit` | "再申請" |
| `merchant.ads.fee` | "広告料金" |
| `merchant.ads.success.create` | "広告を作成しました" |
| `merchant.ads.success.update` | "広告を更新しました" |
| `merchant.ads.success.paid` | "広告料金を支払いました" |
| `merchant.ads.success.submitted` | "承認を申請しました" |
| `merchant.ads.success.deleted` | "広告を削除しました" |
| `merchant.ads.error.shopNotApproved` | "広告を作成するには店舗の承認が必要です" |
| `merchant.ads.error.noPermission` | "この広告を管理する権限がありません" |
| `merchant.ads.error.notFound` | "広告が見つかりません" |
| `merchant.ads.deleteConfirm` | "この広告を削除しますか？この操作は取り消せません。" |
| `merchant.ads.empty` | "広告がありません。最初の広告を作成して店舗を宣伝しましょう。" |

### 9.4 Japanese (ja) — Admin Moderation & Common

| Key | Value |
| :--- | :--- |
| `admin.ads.title` | "広告審査" |
| `admin.ads.pendingQueue` | "承認待ちキュー" |
| `admin.ads.approve` | "承認" |
| `admin.ads.reject` | "却下" |
| `admin.ads.rejectReason` | "却下理由" |
| `admin.ads.rejectReasonPlaceholder` | "この広告を却下する理由を入力してください" |
| `admin.ads.all` | "全広告一覧" |
| `admin.ads.weeklyLimit` | "今週の掲載中広告 {count}/{limit} 件" |
| `admin.ads.success.approved` | "広告を承認しました" |
| `admin.ads.success.rejected` | "広告を却下し、返金しました" |
| `common.edit` | "編集" |
| `common.delete` | "削除" |
| `common.cancel` | "キャンセル" |
| `common.save` | "保存" |
| `common.prev` | "前へ" |
| `common.next` | "次へ" |
| `common.pageInfo` | "{totalPages}ページ中{page}ページ目 · {total}件" |
| `common.status.active` | "掲載中" |
| `common.status.inactive` | "停止中" |
| `common.status.expired` | "終了" |
| `common.approval.pending` | "承認待ち" |
| `common.approval.approved` | "承認済み" |
| `common.approval.rejected` | "却下" |
| `common.payment.pending` | "支払い待ち" |
| `common.payment.paid` | "支払い済み" |
| `common.payment.failed` | "支払い失敗" |
| `common.payment.refunded` | "返金済み" |

---

## 10. Shared Components (共有コンポーネント)

### 10.1 AdvertisementCard Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/features/merchant/components/AdvertisementCard.tsx` |
| **Purpose** | Reusable card displaying thumbnail, title, status badges, announcement, schedule, link, and action buttons |
| **Props** | `advertisement: Advertisement`, `onEdit: () => void`, `onDelete: () => void`, `onPaySubmit: () => void` |

### 10.2 AdvertisementFormDialog Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/features/merchant/components/AdvertisementFormDialog.tsx` |
| **Purpose** | Create/Edit advertisement form with validation, image upload, schedule pickers, and payment & submission panel |
| **Props** | `open: boolean`, `advertisement?: Advertisement`, `onClose: () => void`, `onSaved: () => void` |

### 10.3 AdvertisementFormSchema (Zod)

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/features/merchant/schemas/advertisement.schema.ts` |
| **Rules** | Title 1–200, content ≤ 5000, announcement 1–500, link valid URL ≤ 500, image type/size, `expiresAt > startsAt` (refine) |

### 10.4 useAdvertisements Hook

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/features/merchant/hooks/useAdvertisements.ts` |
| **Purpose** | TanStack Query hooks for list/create/update/delete/pay/submit with cache invalidation on `['ads']` query keys |

### 10.5 Shared UI Primitives (shadcn/ui)

| Component | Location | Usage |
| :--- | :--- | :--- |
| `Dialog` | `frontend/src/components/ui/dialog.tsx` | Create/Edit dialog, delete confirmation |
| `Badge` | `frontend/src/components/ui/badge.tsx` | Status / approval / payment badges |
| `Select` | `frontend/src/components/ui/select.tsx` | Status & approval filters |
| `Switch` | `frontend/src/components/ui/switch.tsx` | Active toggle |
| `Alert` | `frontend/src/components/ui/alert.tsx` | Error / rejection reason banners |
| `Table` | `frontend/src/components/ui/table.tsx` | Admin all-ads table |
| `Toast` | `frontend/src/components/ui/toast.tsx` | Success / error notifications |
| `Skeleton` | `frontend/src/components/ui/skeleton.tsx` | List loading states |

---

## 11. Special UI Notes & Styling Constraints (特記事項・UI仕様)

- **Design System:** Luxury Cosmetics Theme — Primary `#7C3AED` (Purple), Accent `#EC4899` (Pink), Secondary `#F3E8FF` (Lavender).
- **Status Badge Colors:** Active `bg-green-100 text-green-800`, Inactive `bg-gray-100 text-gray-800`, Expired `bg-amber-100 text-amber-800`; Approval Pending `bg-amber-100 text-amber-800`, Approved `bg-green-100 text-green-800`, Rejected `bg-red-100 text-red-800`; canonical payment value `completed` (displayed as Paid) `bg-green-100 text-green-800`, Pending `bg-amber-100 text-amber-800`, Failed `bg-red-100 text-red-800`, Refunded `bg-gray-100 text-gray-800`.
- **Responsive Viewport Design:** Desktop three-column card grid with sidebar; tablet two-column; mobile single-column with full-screen sheet dialog (max-width 640px on desktop).
- **Accessibility:** Every control keyboard navigable. ARIA labels required for edit/delete/pay/submit icon buttons. Error messages announced via `role="alert"`. Focus trap in dialog; visible focus ring.
- **Performance:** Loading skeletons during fetch; spinners during async operations; active ads served from Redis cache (`cache:ads:active`, TTL 5 min) and invalidated on mutation.
- **Security:** All user input sanitized (XSS prevention). Image uploads validated server-side by MIME magic bytes (JPG/PNG/WebP, ≤ 5MB) and stored outside webroot with UUID naming; served via signed URLs. Ownership checks enforced on every merchant ad mutation (403 on cross-shop access).
- **Banner Display:** Standard 4:1 banner aspect ratio; WebP preferred with JPEG fallback; CDN-compatible URLs.

---

## 12. Testing Checklist (テストチェックリスト)

### 12.1 Advertisement List Screen Tests

- [ ] Ad list loads with pagination (20/page, newest first)
- [ ] Loading skeleton shown during fetch
- [ ] Empty state displayed when no ads
- [ ] Status filter (all/active/inactive/expired) works
- [ ] Approval status filter (all/pending/approved/rejected) works
- [ ] Search debounce (300ms) filters within own ads
- [ ] Stat cards reflect current counts
- [ ] Pagination prev/next and page info correct
- [ ] Export CSV downloads current filtered list
- [ ] Edit button opens edit dialog with populated data
- [ ] Delete requires confirmation; soft delete removes from list
- [ ] Status / approval / payment badges render correct colors and values
- [ ] Rejection reason alert shown on rejected ads
- [ ] Pay & Submit button shown only on drafts; Resubmit shown on rejected ads

### 12.2 Create / Edit Dialog Tests

- [ ] Title required and max 200 chars (VAL-AD-001/002)
- [ ] Announcement required and max 500 chars with counter (VAL-AD-020/021)
- [ ] Content optional, max 5000 chars (VAL-AD-010)
- [ ] Link URL validated if present (VAL-AD-032/033)
- [ ] End date must be after start date (VAL-AD-042)
- [ ] Schedule duration below 7 days is rejected (`AD_DURATION_TOO_SHORT`)
- [ ] Schedule duration above 30 days is rejected (`AD_DURATION_TOO_LONG`)
- [ ] End date defaults to start date + 30 days on create
- [ ] Image upload accepts JPG/PNG/WebP, rejects others (VAL-AD-030)
- [ ] Image > 5MB rejected (VAL-AD-031)
- [ ] Active toggle defaults ON
- [ ] Save Ad creates draft (approval pending, payment pending)
- [ ] Edit pre-populates fields; Update Ad persists changes
- [ ] Editing a rejected ad resets approval status to pending
- [ ] Form validation errors display inline with EN/JA text
- [ ] Loading state on save button during submission

### 12.3 Payment & Submission Tests

- [ ] Pay Fee button shown when payment status is pending
- [ ] Pay Fee records an `ad_payments` amount, method, transaction/reference and `paid_at`; badge displays Paid for `completed`
- [ ] Submit for Approval is disabled until payment status is `completed`
- [ ] Submit sets approval status to pending
- [ ] Ad becomes read-only after submission until admin decision
- [ ] Submit without payment shows error (AD-422)

### 12.4 Admin Moderation Tests

- [ ] Pending queue shows submitted `completed`-payment + pending-approval ads, oldest first; unpaid drafts are excluded
- [ ] Weekly limit indicator shows correct count
- [ ] Approve sets approval status to approved, sets approvedBy/approvedAt
- [ ] Approve blocked with weekly-limit error when 5 ads are active (AD-LIMIT)
- [ ] Approve blocked with `MERCHANT_AD_LIMIT_REACHED` when the merchant already has 2 simultaneous active ads
- [ ] Reject requires rejection reason (VAL-AD-050)
- [ ] Reject sets status to rejected and refunds payment (payment_status = refunded)
- [ ] Merchant is notified of approval/rejection with reason
- [ ] All Ads table filters by approval/payment status
- [ ] Non-admin blocked from admin endpoints (403)

### 12.5 Public Banner Display Tests

- [ ] Active ads endpoint (GET /ads/active) public, no auth required
- [ ] Only `completed` + approved + active + in-schedule ads returned (the UI renders `completed` as Paid)
- [ ] Redis cache used (cache:ads:active, TTL 5 min)
- [ ] Cache invalidated on create/update/delete/approve/reject/pay
- [ ] Banner carousel renders image + announcement message
- [ ] Banner click navigates to link URL
- [ ] All i18n keys render correctly (EN/JA/MY)
- [ ] Keyboard navigation and screen-reader labels work

---

*End of Screen Items Specification (Advertisement Management)*
