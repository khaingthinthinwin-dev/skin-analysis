# Functional Specification (機能設計書) — Advertisement Management

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-FDS-AD-001 |
| **Target Screen** | Advertisement Management (広告管理) |
| **Subsystem** | Advertisement — Shop Advertisement Management |
| **Function ID** | FN-AD-001 |
| **Version** | 2.4 |
| **Created** | 2026-08-05 |
| **Last Updated** | 2026-08-24 |
| **Author** | Software Architect |
| **Status** | Released (承認済み) |
| **Classification** | Internal — Engineering Division |


---

## Document Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-08-05 | Software Architect | Initial functional specification for Advertisement Management covering merchant ad creation, scheduling, image upload, status control, and platform display. |
| 1.1 | 2026-08-10 | Software Architect | Aligned with Requirement Spec v1.1 / Database Spec v1.1. Added admin approval workflow (M-AD-006), advertising fee payment (M-AD-007), weekly ad limit (M-AD-008), and announcement message (M-AD-009). Added `approval_status`, `payment_status`, `payment_amount`, `payment_reference`, `approved_by`, `approved_at`, `rejection_reason`, `week_number`, and `announcement_message` fields. |
| 2.0 | 2026-08-14 | Software Architect | Aligned with DATABASE_SPEC v2.0 & REQUIREMENT_SPEC v1.5: replaced CUID references with UUID (`gen_random_uuid()`); integrated dynamic fee pricing via `ad_fee_settings` (placement × tier), payment transaction ledger via `ad_payments` (linked to `merchants`), and fee audit log via `ad_fee_history`; updated DB traceability matrix. |
| 2.1 | 2026-08-18 | Software Architect | Aligned with DATABASE_SPEC v2.2 & REQUIREMENT_SPEC v1.7: corrected `payment_status` enum to `pending/completed/refunded/failed` (DB canonical); added ad duration limits (7–30 days, M-AD-013/014), per-merchant max 2 active ads (M-AD-012), ad states flow (M-AD-010), auto-refund on rejection (M-AD-011); updated traceability matrix. |
| 2.2 | 2026-08-21 | Software Architect | Aligned with REQUIREMENT_SPEC v2.10 & DATABASE_SPEC v2.4: introduced package-based advertisement model (placement × tier packages from `ad_fee_settings`; fee = `daily_rate × duration_days`; duration fixed per package, 7–30 days catalog bounds); `expires_at` now system-derived from package duration; added platform display rules (slider max 5 per rotation, priority Premium > Standard > Basic, round-robin within tier, 5-second auto-rotation); removed per-merchant max 2 active ads limit (no longer defined in REQ v2.10); corrected admin approve/reject to `PATCH` endpoints; added admin ad fee settings management (view/update rates with `ad_fee_history` audit) and merchant package browsing; re-anchored requirement traceability to REQ v2.10 sections (legacy M-AD IDs retained as internal anchors); flagged open item: `advertisements` does not persist `placement`/`tier`. |
| 2.3 | 2026-08-24 | Software Architect | Changed pending merchant behavior: pending merchants can now view the dashboard/product list page (read-only) instead of being redirected with an error toast. All CRUD operations (create/edit/delete/pay/submit) are restricted and hidden for pending merchants; only approved merchants have full access to merchant features. |
| 2.4 | 2026-08-24 | Software Architect | Removed merchant CRUD on advertisements entirely: merchants cannot perform CRUD operations on advertisements and can only select packages from package ads created by Admin. Merchant-side create/edit/delete/pay/submit/toggle endpoints removed (`POST /ads`, `PATCH /ads/:id`, `DELETE /ads/:id`, `POST /ads/:id/pay`, `POST /ads/:id/submit`) and replaced by a single selection operation (`POST /ads/packages/:feeSettingId/select` = select + immediate payment; ad record auto-created with `approval_status = pending`; schedule derived as selection time + package duration). Rejected ads are now terminal (auto-refund, no resubmission). Admin owns the full package-ad lifecycle: create/update/deactivate packages via `/admin/ad-fee-settings` including display content (display name, announcement message); creative-columns gap in `ad_fee_settings` flagged in Design Note. Merchant screens reduced to read-only purchase list + package catalog with Select action; use cases, state machine, business rules, validation, error handling, permissions, notifications, navigation, and traceability updated accordingly. |

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
14. [Configurable Items (External Definitions)](#14-configurable-items-external-definitions)
15. [Cross-Reference Traceability Matrix](#15-cross-reference-traceability-matrix)

---

## 1. Functional Overview

### 1.1 Purpose and Scope

This subsystem manages the complete lifecycle of shop advertisements within the Cosmetics Finder marketplace. Admins create and manage advertisement packages (placement × tier) — the only source of purchasable ad inventory on the platform. Merchants cannot perform CRUD operations on advertisements; they can only browse the package catalog created by Admin and select a package, which triggers immediate payment and system-side creation of an advertisement tied to their approved shop. Admins approve or reject purchased advertisements with a reason (auto-refund on rejection), and only paid, approved, in-schedule advertisements are exposed to the storefront for platform-wide display (banner/image + announcement message).

The Advertisement Management subsystem connects merchant promotional intent with buyer visibility through an Admin-controlled package model. Advertisement packages are defined in `ad_fee_settings` by Admin, where each package fixes the daily rate, display duration (`duration_days`), slot capacity (`max_ads`), and display content (display name, announcement message); the fee is calculated as `daily_rate × duration_days`. When a merchant selects a package, `starts_at` is set to the selection (payment) time and `expires_at` is derived as `starts_at + duration_days`; the advertisement enters admin approval automatically. Active, in-schedule, approved advertisements are served to the public storefront through a cacheable endpoint, ensuring consistent banner rendering without exposing merchant management operations. A weekly limit of 5 active advertisements is enforced platform-wide. The storefront slider displays at most 5 advertisements per rotation, ordered by tier priority (Premium > Standard > Basic) with round-robin rotation within the same tier and automatic rotation every 5 seconds.

### 1.2 Functional Responsibilities

This subsystem is responsible for the following core functional areas:

1. **Package Management (Admin-Only)** — Admins create, update, and deactivate advertisement packages (placement × tier) in `ad_fee_settings`, including display content (display name, announcement message). Merchants cannot create, edit, or delete packages.
2. **Package Selection (Merchant, Read-Catalog Only)** — Merchants browse the Admin-created package catalog (`GET /ads/packages`) and select a package; selection is their only write operation. No merchant CRUD on advertisements exists.
3. **Advertisement Auto-Creation on Selection** — Selecting a package creates the advertisement record system-side, linked to the merchant's approved shop, with `approval_status = pending` and `payment_status = completed` after successful payment. `starts_at` = selection (payment) time; `expires_at = starts_at + duration_days`; `week_number` derived from `starts_at`.
4. **Advertising Fee Payment at Selection** — The advertising fee is charged as part of package selection. Fee = package `daily_rate × duration_days`. Payment transaction is recorded in `ad_payments` with amount, status, and reference.
5. **Purchase List (Read-Only)** — Merchants can list, search, and filter their own purchased advertisements in read-only mode. Merchants cannot edit, delete, toggle, pay separately, or resubmit advertisements.
6. **Admin Approval Workflow** — After successful selection + payment, the ad enters `PENDING_APPROVAL`; admin approves or rejects with reason. Rejected ads are terminal: payment is auto-refunded and the merchant may simply select another package.
7. **Weekly Ad Limit** — A maximum of 5 active advertisements per week is enforced platform-wide (Monday 00:00 to Sunday 23:59 UTC), validated before an ad is approved for display.
8. **Package-Defined Duration** — Display duration is fixed by the selected package's `duration_days` (catalog spans 7–30 days across placements); validated at selection time via rate resolution.
9. **Ad Fee Settings Management** — Admins manage the full package catalog in `ad_fee_settings`: create new packages, update daily rates and display content, and deactivate packages; every rate change is logged in `ad_fee_history` and applies only to subsequently selected packages.
10. **Status Control** — Merchant-visible lifecycle (active/expired) is derived from `is_active`, `approval_status`, `payment_status`, and the schedule; merchants cannot change it directly.
11. **Soft Retention** — Advertisement records are retained for history; no merchant delete operation exists. Admins may deactivate packages so they no longer appear in the catalog.
12. **Platform Display** — Paid, approved, active, in-schedule advertisements are exposed via a public endpoint for storefront banner and announcement message rendering. The storefront slider shows at most 5 ads per rotation cycle, ordered Premium > Standard > Basic with round-robin within the same tier, auto-rotating every 5 seconds; expired/rejected ads are excluded automatically.
13. **Cache Management** — Active ads are cached in Redis with a 5-minute TTL; cache is invalidated on any mutation (package selection, admin approval/rejection, admin package changes).
14. **Audit Logging** — All package mutations, selections/payments, and approval actions are logged for audit (merchant-side events: 90-day retention; admin approval/rejection/fee-change events: 2 years per Development Rules §6.4).

### 1.3 Target Users

| Attribute | Value |
|-----------|-------|
| **Primary Actor (Merchant)** | Authenticated merchant browsing Admin-created packages, selecting (purchasing) packages, and viewing their own advertisements in read-only mode |
| **Primary Actor (Admin)** | Admin creating/managing advertisement packages and approving/rejecting purchased advertisements |
| **Primary Actor (Buyer)** | Authenticated or unauthenticated visitor viewing platform banners |
| **Required Authentication** | JWT Bearer Token for merchant and admin operations; Public for active ad display |
| **Data Scope** | Merchant: own shop's ads only. Buyer: all active ads (public). Admin: all ads. |

### 1.4 Relationships with Other Functions and Peripheral Systems

```text
┌──────────────────────────┐      ┌─────────────────────────────────────┐
│   Merchant Actor         │      │     advertisements                  │
│   (Selects Packages,     ├─────►│  Auto-created on package selection  │
│   Read-Only List)        │      │  payment, schedule derived          │
└──────────────────────────┘      └──────────────┬────────────────────┘
                                                  │ Reads / System Writes
                                                  ▼
                                       ┌────────────────────────┐
                                       │  Advertisements Module │
                                       └──────────┬─────────────┘
                                                  │
                          ┌───────────────────────┼───────────────────────┐
                          ▼                       ▼                       ▼
               ┌──────────────────┐   ┌────────────────────┐   ┌──────────────────┐
               │  Shops           │   │  Redis Cache       │   │  Audit Log       │
               │  (is_approved    │   │  cache:ads:active  │   │  AD_SELECTED /   │
               │   check)         │   │  cache:ads:packages│   │  AD_PAID /       │
               └──────────────────┘   │  (TTL 5/10 min)    │   │  AD_APPROVED /   │
                                      └────────────────────┘   │  AD_REJECTED /   │
                                                               │  AD_FEE_UPDATED  │
                          ┌────────────────────────────┐      └──────────────────┘
                          │  Admin Actor               │
                          │  (Manage Package Ads,      │      ┌──────────────────┐
                          │   Approve / Reject Ads)    ├─────►│  ad_fee_settings │
                          └─────────────┬──────────────┘      │  (Package CRUD)  │
                                        │ approve/reject with reason
                                        ▼                      └──────────────────┘
                             ┌──────────────────────┐
                             │  Payment System      │
                             │  (stubbed)           │
                             │  fee + status + ref  │
                             └──────────────────────┘
                          ▲
                          │
┌──────────────────────────┐      ┌─────────────────────────────────────┐
│   Buyer Actor            │      │     Storefront / Platform          │
│   (Views Active Ads)     ├─────►│  Renders active banners (public)   │
└──────────────────────────┘      └─────────────────────────────────────┘
```

### 1.5 Inputs / Outputs

| Input Information | Data Category | Source / Description |
|-------------------|---------------|----------------------|
| `feeSettingId` | Path Parameter | Advertisement package (placement × tier) selected from the Admin-created catalog — the only merchant write input |
| `paymentReference` | System / User Input | Payment transaction reference for ad fee (recorded at selection) |
| `placement` | Admin Input | Package placement (`homepage_slider`, `product_sidebar`, `category_banner`, `search_top`) at package creation |
| `tier` | Admin Input | Package pricing tier (`basic`, `standard`, `premium`) at package creation |
| `daily_rate` | Admin Input | Daily rate for a package (creation/update) |
| `duration_days` / `max_ads` | Admin Input | Display duration and slot capacity at package creation |
| `display_name` / `announcementMessage` | Admin Input | Package display content (banner title and announcement message) defined by Admin |
| `reason` | Admin Input | Rejection reason for moderation |
| `page` / `limit` / `status` / `approvalStatus` | Query Parameter | Pagination and status filter for list view |
| `id` | Path Parameter | Advertisement ID (UUID, admin approve/reject) or fee setting ID (admin package update/deactivate) |

> Merchants never input advertisement content fields (`title`, `content`, `announcementMessage`, `imageUrl`, `linkUrl`, `isActive`, `startsAt`). All such values are Admin-defined (package level) or system-derived.

| Output Information | Data Category | Destination / Description |
|--------------------|---------------|---------------------------|
| `advertisement` | Advertisement DTO | Full advertisement data (including approval/payment fields) |
| `advertisements` | Advertisement[] DTO | Paginated advertisement list (merchant: read-only own purchases; admin: all ads) |
| `meta` | Pagination Meta | Page, limit, total, totalPages |
| `packages` | AdFeeSetting[] DTO | Available advertisement packages (placement × tier × rate × duration × max ads × display content) created by Admin for merchant browsing/selection |
| `activeAds` | Advertisement[] DTO | Active in-schedule approved ads for platform display (slider rotation) |
| `pendingApprovalAds` | Advertisement[] DTO | Ads awaiting admin approval/rejection |
| `feeSettings` | AdFeeSetting[] DTO | All advertisement package fee settings (admin management) |

### 1.6 Related Documents

| No. | Document ID | Document Name | File Path / Reference | Remarks |
|-----|-------------|---------------|----------------------|---------|
| 1 | SKM-REQ-001 | Requirements Definition (v2.10) | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | §4.4 Advertisements (merchant), §5.3 Advertisement Management (admin, incl. Package Fields & Display Rules), §7.6 Business Rules — Advertisements, §2.2 Permission Matrix. Note: REQ v2.0 was a clean rewrite; legacy M-AD-001~014 IDs no longer exist upstream and are retained in this document as internal traceability anchors only. |
| 2 | SKM-DBS-001 | Database Design Specification (v2.4) | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | `advertisements` (§3.13), `ad_fee_settings` (§3.14), `ad_payments` (§3.15), `ad_fee_history` (§3.16), `merchants`, `shops` tables, UUID PKs, indexes, check constraints |
| 3 | SKM-DEV-001 | Development Rules (v2.1) | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | Advertisement Rules (12.7), naming conventions, RBAC, REST conventions (8.1: PATCH for partial updates), audit retention (6.4) |

> **Note on enum precedence:** Development Rules §12.7 lists `payment_status` as `pending/paid/failed/refunded`; the database canonical values per DATABASE_SPEC v2.4 are `pending/completed/refunded/failed`. The DB canonical values govern this specification.

---

## 2. Use Cases and Business Workflow

### 2.1 Use Case Catalog

| UC-ID | Use Case Name | Precondition | Postcondition | Triggering Actor |
|-------|---------------|--------------|---------------|------------------|
| UC-AD-001 | Select Advertisement Package (Purchase) | Merchant is authenticated and has an approved shop. An active package exists in the Admin-created catalog. | Fee (`daily_rate × duration_days`) recorded in `ad_payments`; advertisement record auto-created system-side linked to merchant's shop with selected package, `approval_status = pending`, `payment_status = completed`, `starts_at` = selection time, `expires_at = starts_at + duration_days`. **Merchants cannot create ads by any other means.** | Merchant |
| UC-AD-002 | ~~Schedule Advertisement~~ | — | — | **Removed in v2.4** — schedule is fully system-derived (`starts_at` = selection time; `expires_at = starts_at + package duration_days`); merchants set no dates. |
| UC-AD-003 | ~~Upload Ad Image~~ | — | — | **Removed in v2.4** — banner display content is defined by Admin at package level; merchants upload nothing. |
| UC-AD-004 | List Own Advertisements (Read-Only) | Merchant is authenticated. | Paginated read-only list of merchant's own purchased ads (with status/approval filter) displayed. No edit/delete/toggle actions available to any merchant. | Merchant |
| UC-AD-005 | ~~Update Advertisement~~ | — | — | **Removed in v2.4** — merchants cannot perform CRUD operations on advertisements. |
| UC-AD-006 | ~~Delete Advertisement (Soft)~~ | — | — | **Removed in v2.4** — merchants cannot delete advertisements; records are retained for history. |
| UC-AD-007 | ~~Toggle Advertisement Active/Inactive~~ | — | — | **Removed in v2.4** — merchant visibility control no longer exists; lifecycle is schedule/status-derived only. |
| UC-AD-008 | Display Active Advertisements | None (public). | Paid, approved, active, in-schedule advertisements returned for storefront display; slider shows max 5 per rotation, priority Premium > Standard > Basic, round-robin within tier, auto-rotation every 5 seconds. | Buyer/Visitor |
| UC-AD-009 | ~~Pay Advertising Fee~~ | — | — | **Merged into UC-AD-001 in v2.4** — fee payment happens atomically at package selection; there is no separate pay step. |
| UC-AD-010 | Submit Advertisement for Approval | Advertisement created via package selection with `payment_status = completed`. | Advertisement enters `approval_status = pending` automatically for admin review (no separate submit action). | System |
| UC-AD-011 | Approve Advertisement | Admin is authenticated. Ad is pending approval and paid. | Weekly limit validated; ad `approval_status = approved`; `approved_by`/`approved_at` set; cache invalidated. | Admin |
| UC-AD-012 | Reject Advertisement | Admin is authenticated. Ad is pending approval. | Ad `approval_status = rejected`; `rejection_reason` stored; payment refunded automatically (`ad_payments` refund fields + `payment_status = refunded`). **Rejected ads are terminal — no resubmission.** | Admin |
| UC-AD-013 | ~~Resubmit Rejected Advertisement~~ | — | — | **Removed in v2.4** — rejected ads are terminal (auto-refund); the merchant may select a new package instead. |
| UC-AD-014 | Browse Advertisement Packages | Merchant is authenticated. | Admin-created packages (placement × tier × daily rate × duration × max ads × display content) from `ad_fee_settings` displayed for selection. | Merchant |
| UC-AD-015 | Manage Ad Packages | Admin is authenticated. | Full package lifecycle management: create new packages, update daily rates/display content, deactivate packages; rate changes logged in `ad_fee_history`. **Only Admin can CRUD packages.** | Admin |

### 2.2 Primary Business Workflow — Merchant Package Selection (Read-Only Advertisement List)

```
                    ┌──────────────────────┐
                    │  Merchant Logs In    │
                    │  (JWT Authenticated) │
                    └──────────┬───────────┘
                               │
                               ▼
              ┌────────────────────────────────┐
              │  Check license_status          │
              └───────────┬────────┬───────────┘
                          │        │
              pending/reject│       │approved
                          ▼        ▼
              ┌────────────────┐ ┌─────────────────────────┐
              │  Advertisement │ │  Advertisement          │
              │  Management    │ │  Management Page        │
              │  Page          │ │  /merchant/advertisements│
              │  (Read-Only)   │ │  (Select Packages)      │
              │                │ │                         │
              │  ┌───────────┐ │ │  - Package catalog      │
              │  │ View Ad   │ │ │    browse only          │
              │  │ List Only │ │ │  - Select & Pay button  │
              │  │           │ │ │    ENABLED              │
              │  │ Select/   │ │ │  - No New/Edit/Delete   │
              │  │ CRUD      │ │ │    buttons (removed)    │
              │  │ operations│ │ │  - Purchase list is     │
              │  │ hidden    │ │ │    read-only            │
              │  └───────────┘ │ └─────────────┬───────────┘
              └────────────────┘               │
                                               ▼
                            ┌──────────────────────────┐
                            │  Browse Package Catalog  │
                            │  (Admin-created packages)│
                            │  (UC-AD-014)             │
                            └────────────┬─────────────┘
                                         │
                                         ▼
                            ┌──────────────────────────┐
                            │ Select Package + Pay Fee │
                            │ (UC-AD-001, single step) │
                            └────────────┬─────────────┘
                                         │
                                         ▼
                            ┌──────────────────────────┐
                            │ Ad auto-created (system):│
                            │ pending + paid, schedule │
                            │ = selection time + pkg   │
                            │ duration (UC-AD-010 auto)│
                            └────────────┬─────────────┘
                                         │
                                         ▼
                            ┌─────────────────┐      ┌─────────────────┐
                            │ PENDING         │─────►│ Admin           │
                            │ APPROVAL        │      │ Approve /       │
                            │                 │      │ Reject          │
                            └────────┬────────┘      │ (UC-AD-011/012)│
                                     │               └────────┬────────┘
                                     │                        │
                                     │                 ┌──────┴──────┐
                           approved  │                 │  rejected   │
                           ┌─────────▼────────┐        ▼             │
                           │ APPROVED (paid)  │  ┌─────────────────┐│
                           │ Weekly limit     │  │ REJECTED +     ││
                           │ validated (5/wk) │  │ refund (auto)  ││
                           │ → displayable    │  │ TERMINAL       ││
                           └─────────┬────────┘  └─────────────────┘│
                                     │                       (merchant may
                                     ▼                        select another
                            ┌─────────────────┐               package)
                            │ ACTIVE in       │
                            │ schedule window │
                            └────────┬────────┘
                                     │
                                     ▼
                            ┌─────────────────┐
                            │ EXPIRED         │
                            │ (auto, derived) │
                            └─────────────────┘
```

### 2.3 Primary Business Workflow — Platform Banner Display

```
                    ┌──────────────────────┐
                    │  Buyer Arrives       │
                    │  (Public Access)     │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Storefront Loads    │
                    │  GET /ads/active     │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
   ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
   │ Check Redis     │ │ Cache Hit       │ │ Cache Miss      │
   │ cache:ads:active│ │ (Serve Cached)  │ │ (Query DB)      │
   └────────┬────────┘ └────────┬────────┘ └────────┬────────┘
            │                   │                   │
            └───────────────────┼───────────────────┘
                                │
                                ▼
                    ┌──────────────────────┐
                    │  Render Active       │
                    │  Banner Carousel     │
                    └──────────────────────┘
```

### 2.4 Workflow Critical Path Summary

| Step | Action | Status Before | Status After | Assigned To |
|:----:|--------|---------------|--------------|-------------|
| 1 | Merchant navigates to /merchant/advertisements | Authenticated | — | Merchant |
| 2 | Merchant browses Admin-created package catalog (placement × tier × rate × duration × display content) | — | Catalog Displayed | System |
| 3 | Merchant clicks "Select & Pay" on a package (the only merchant write operation) | — | Confirmation Displayed | Merchant |
| 4 | System processes payment (`daily_rate × duration_days`) and auto-creates the advertisement | — | `payment_status = completed`, `approval_status = pending`, `starts_at` = selection time, `expires_at = starts_at + package duration_days`, `week_number` derived | System |
| 5 | Transaction recorded in `ad_payments` (amount, reference) | — | Ledger Entry Created | System |
| 6 | Ad enters approval queue automatically (no merchant submit step) | `payment_status = completed` | `approval_status = pending` | System |
| 7 | Admin reviews pending ad | `approval_status = pending` | — | Admin |
| 8a | Admin approves ad (weekly limit validated ≤ 5) | `approval_status = pending` | `approval_status = approved`, `approved_by`/`approved_at` set | Admin |
| 8b | Admin rejects ad with reason | `approval_status = pending` | `approval_status = rejected`, `payment_status = refunded` (auto-refund; terminal) | Admin |
| 9 | Ad appears in merchant purchase list with approval badge (read-only) | — | — | System |
| 10 | Active ads cache invalidated | — | Cache Cleared | System |
| 11 | Buyer loads storefront | Public | — | Buyer |
| 12 | GET /ads/active returns approved, in-schedule active ads | — | Banners Served | System |
| 13 | Buyer clicks banner | — | Redirected to Link URL | System |

### 2.5 Relevant Requirements Covered

> REQUIREMENT_SPEC v2.0 was a clean rewrite; the granular M-AD-xxx IDs below no longer exist upstream. They are retained as internal anchors of this document, mapped to their REQUIREMENT_SPEC v2.10 source sections.

| Requirement ID (Legacy) | Requirement Summary | REQ v2.10 Source | Coverage Status |
|--------------------------|---------------------|------------------|-----------------|
| M-AD-001 | Merchant can create shop advertisements | §4.4 (Purchase Ad) | **Superseded in v2.4** — merchants cannot create ads; ads are auto-created by package selection only (UC-AD-001) |
| M-AD-002 | Merchant can set ad schedule (start date; end derived from package) | §4.4 (Purchase Ad), §7.6 | **Superseded in v2.4** — schedule fully system-derived (`starts_at` = selection time; end = + package duration) |
| M-AD-003 | Merchant can upload ad images | §4.4 (Purchase Ad) | **Removed in v2.4** — display content defined by Admin at package level |
| M-AD-004 | Merchant can view/manage own ads | §4.4 | Revised in v2.4 — view-only (read-only purchase list); no manage/edit/delete operations |
| M-AD-005 | Active ads display on platform | §4.4, §5.3 Display Rules | Covered |
| M-AD-006 | Admin can approve/reject advertisements | §5.3 (Review Ads), §2.2 Permission Matrix | Covered |
| M-AD-007 | Merchants must pay advertising fee before submission | §4.4, §7.6 | Covered — payment is atomic with package selection (UC-AD-001) |
| M-AD-008 | Maximum 5 active advertisements per week | §7.6 | Covered |
| M-AD-009 | Advertisements display with banner/image and announcement message | §4.4, §5.3 Display Rules | Covered — announcement message Admin-defined at package level |
| M-AD-010 | Ad states: draft → pending_payment → pending_approval → approved → active → expired | §4.4, §7.6 | Revised in v2.4 — draft/pending_payment stages removed; flow: selected+paid → pending_approval → approved → active → expired |
| M-AD-011 | Rejected ads auto-refund payment to merchant | §7.6 | Covered — rejection is terminal (no resubmission) |
| M-AD-012 | Per merchant: maximum 2 active ads simultaneously | — | **Removed in v2.2** — not defined in REQ v2.10; rule dropped from this specification |
| M-AD-013 | Minimum ad duration: 7 days | §5.3 Package Fields (`duration_days`) | Superseded — duration now fixed per package; catalog minimum is 7 days |
| M-AD-014 | Maximum ad duration: 30 days | §5.3 Package Fields (`duration_days`) | Superseded — duration now fixed per package; catalog maximum is 30 days |
| — | Merchant browses available advertisement packages created by Admin and selects one | §4.4 (View Packages) | Covered (UC-AD-014, UC-AD-001) |
| — | Merchant views ad performance analytics (impressions/clicks/CTR) | §4.4 (View Analytics) | **Out of scope** — no analytics counters exist in DATABASE_SPEC v2.4 schema; deferred until schema extension |
| — | Admin manages packages / sets pricing / views package history | §5.3 (Manage Packages, Set Pricing, Package History) | Covered (UC-AD-015, Sec 5.3.2, Sec 6.12~6.14) — full Admin CRUD on packages since v2.4 |
| — | Multiple merchants may purchase the same package | §5.3 Display Rules | Covered (BR-AD-053) |

---

## 3. State Transition Specification

### 3.1 Advertisement Display States

> Since v2.4, merchants cannot perform any CRUD operation on advertisements — the "Can Edit" / "Can Delete" columns are ✗ for every state. Lifecycle progression is system-derived or admin-driven only.

| State | Description | Visible to Buyers | Can Edit | Can Delete |
|-------|-------------|:-----------------:|:--------:|:----------:|
| `DRAFT` | ~~`approval_status = pending`, `payment_status = pending`~~ | ✗ | ✗ | ✗ |
| `PENDING_APPROVAL` | Created via package selection with `payment_status = completed`, `approval_status = pending` | ✗ | ✗ | ✗ |
| `APPROVED` | `approval_status = approved`, `payment_status = completed` | depends on schedule + `is_active` | ✗ | ✗ |
| `REJECTED` | `approval_status = rejected` (refund processed) — **terminal since v2.4** | ✗ | ✗ | ✗ |
| `SCHEDULED` | approved, `is_active = true` and `starts_at > now` (rare: only if selection occurs before a delayed activation) | ✗ | ✗ | ✗ |
| `ACTIVE` | approved, `is_active = true`, `starts_at <= now <= expires_at` | ✓ | ✗ | ✗ |
| `INACTIVE` | `is_active = false` (system/admin-controlled hidden state) | ✗ | ✗ | ✗ |
| `EXPIRED` | `expires_at < now` | ✗ | ✗ | ✗ |

> **Ad States Flow (M-AD-010, revised v2.4):** `selected+paid → pending_approval → approved → active → expired`
> (`draft` and `pending_payment` stages no longer exist — payment is atomic with package selection.)
> Rejected ads at approval stage → refund fee automatically → **terminal** (no resubmission; merchant selects a new package if desired)

### 3.2 Approval Status States (`approval_status`)

| State | DB Value | Description | Transition Allowed |
|-------|----------|-------------|-------------------|
| `PENDING` | `'pending'` | Awaiting admin review (paid, auto-queued after package selection) | → `approved`, `rejected` |
| `APPROVED` | `'approved'` | Admin approved; displayable if paid, active, in-schedule | → (reject not allowed after approval) |
| `REJECTED` | `'rejected'` | Admin rejected with reason; refund auto-processed; **terminal since v2.4 (no resubmission)** | terminal |

### 3.3 Payment Status States (`payment_status`)

| State | DB Value | Description | Transition Allowed |
|-------|----------|-------------|-------------------|
| `PENDING` | `'pending'` | Advertising fee not yet paid | → `completed`, `failed` |
| `COMPLETED` | `'completed'` | Fee paid and verified; required before approval submission | → `refunded` |
| `FAILED` | `'failed'` | Payment attempt failed | → `pending`, `completed` |
| `REFUNDED` | `'refunded'` | Auto-refunded on rejection | terminal |

### 3.4 Advertisement Lifecycle Transitions

| Transition ID | Origin State | Target State | Trigger Action | Guard Conditions |
|---------------|--------------|--------------|----------------|------------------|
| TR-AD-01 | — | `PENDING_APPROVAL` (paid) | Merchant selects an Admin-created package (select + pay, single step) | Valid package (`ad_fee_settings` active), shop approved, payment succeeded; `starts_at` = selection time; `expires_at = starts_at + duration_days`; `week_number` derived |
| TR-AD-02 | ~~`DRAFT` → `PENDING_APPROVAL`~~ | — | — | **Removed in v2.4** — merged into TR-AD-01 (no separate pay/submit steps) |
| TR-AD-03 | `PENDING_APPROVAL` | `APPROVED` | Admin approves | Weekly limit ≤ 5 for target week |
| TR-AD-04 | `PENDING_APPROVAL` | `REJECTED` | Admin rejects with reason | Reason required; refund auto-processed; **terminal** |
| TR-AD-05 | ~~`REJECTED` → `PENDING_APPROVAL`~~ | — | — | **Removed in v2.4** — rejected ads are terminal; merchant selects a new package instead |
| TR-AD-06 | `APPROVED` | `SCHEDULED` | Start time not yet reached | System time check |
| TR-AD-07 | `SCHEDULED` | `ACTIVE` | Start time reached | System time check |
| TR-AD-08 | `ACTIVE` | `EXPIRED` | End time passed | System time check |
| TR-AD-09 | ~~`ACTIVE` → `INACTIVE`~~ | — | — | **Removed in v2.4** — merchants cannot toggle ads |
| TR-AD-10 | ~~`INACTIVE` → `ACTIVE`~~ | — | — | **Removed in v2.4** — merchants cannot toggle ads |
| TR-AD-11 | ~~`ACTIVE` → `INACTIVE`~~ | — | — | **Removed in v2.4** — merchants cannot delete ads; records retained for history |
| TR-AD-12 | ~~`EXPIRED` → `ACTIVE`~~ | — | — | **Removed in v2.4** — expired ads are terminal; merchant selects a new package to run again |

> Since v2.4, no lifecycle transition is triggered by a merchant mutation: the only merchant-initiated transition is TR-AD-01 (package selection). All other transitions are system-derived or admin-driven.

### 3.5 Cache States (Redis `cache:ads:active`)

| State | Description | TTL | Behavior |
|-------|-------------|:---:|----------|
| `CACHE_COLD` | No cached active ad list | — | Query DB (approved, paid, active, in-schedule), seed cache (5 min TTL) |
| `CACHE_WARM` | Cached active ad list available | 5 min | Serve cached response |
| `CACHE_INVALIDATED` | Mutation performed (create/update/delete/approve/reject) | — | `DEL cache:ads:active`, next request re-queries |

---

## 4. Business Rules

### 4.1 Package Selection / Auto-Creation Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AD-001 | Required Fields | ~~Ad must have: title, announcementMessage, startsAt, expiresAt.~~ **Superseded in v2.4** — merchants provide no content fields; the only input is the selected `feeSettingId`. Display fields are Admin-defined at package level; schedule is system-derived. | Backend (RBAC + service logic) |
| BR-AD-002 | Title Length | ~~Title must be 1-200 characters.~~ **Superseded in v2.4** — display name is Admin-defined at package creation (max 200 chars validated there). | Backend (admin DTO validation) |
| BR-AD-003 | Date Range | `expiresAt` must be strictly after `startsAt`. | Backend (DB constraint `chk_advertisements_dates`) |
| BR-AD-004 | Shop Approval | Merchant must have an approved shop (`is_approved = true`) before selecting a package. | Backend (service check) |
| BR-AD-005 | Default Status | Ads auto-created by package selection default to `is_active = true`, `approval_status = pending`, `payment_status = completed`. | Backend (service logic) |
| BR-AD-006 | Image Optional | ~~Ads can be text-only or with image.~~ **Superseded in v2.4** — banner imagery is Admin-defined at package level (see Design Note in §4.11); merchants never upload images. | — |
| BR-AD-007 | Link Optional | Click-through link URL is optional (Admin-defined at package level). | Backend (admin DTO validation) |
| BR-AD-024 | Announcement Message Required | `announcement_message` is required and displayed on the banner. Since v2.4 it is defined by Admin per package, not entered by merchants. | Backend (admin DTO validation) + DB (NOT NULL on advertisements) |

### 4.2 Advertisement Schedule Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AD-008 | Schedule Required | Both `startsAt` and `expiresAt` are required — both system-derived since v2.4 (`starts_at` = selection time; `expires_at = starts_at + package duration_days`); merchants set neither. | Backend (service logic) |
| BR-AD-009 | Schedule Validity | `expires_at` > `starts_at` enforced by DB check constraint. | Backend (DB constraint `chk_advertisements_dates`) |
| BR-AD-010 | Active Window | An ad is active when `is_active = true` AND `approval_status = approved` AND `payment_status = completed` AND `starts_at <= now` AND `expires_at >= now`. | Backend (query filter) |
| BR-AD-025 | Week Number | `week_number` (ISO week) is derived from `starts_at` and stored for weekly limit tracking. | Backend (service logic) |

### 4.3 Advertisement Status Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AD-011 | Active Visibility | Only approved, paid, in-schedule active ads are served to buyers. | Backend (query filter) |
| BR-AD-012 | Record Retention | ~~Delete sets `is_active = false`.~~ Since v2.4 no delete operation exists for merchants; all records are retained for history. | Backend (service logic) |
| BR-AD-013 | Expired Visibility | Expired ads hidden from buyers, visible to merchant (read-only). | Backend (role-based query) |
| BR-AD-014 | Derived Status | Display status (active/expired) derived client-side from `is_active`, `approval_status`, `payment_status`, and schedule; never persisted; merchants cannot influence it directly. | Frontend (display logic) |
| BR-AD-026 | Approval Status Enum | `approval_status` restricted to `pending/approved/rejected` via DB check constraint `chk_advertisements_approval_status`. | Backend (DB constraint) |
| BR-AD-027 | Payment Status Enum | `payment_status` restricted to `pending/completed/refunded/failed` via DB check constraint `chk_advertisements_payment_status`. | Backend (DB constraint) |

### 4.4 Package Content Rules (formerly Image Rules)

> Merchant ad-image upload was removed in v2.4. Banner display content is Admin-defined at the package level.

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AD-015 | ~~File Size~~ | ~~Maximum 5MB per ad image.~~ **Removed in v2.4** — merchants do not upload images; future package creative assets (Admin-uploaded) inherit these limits when the schema supports them. | Deferred (schema gap — §4.11 Design Note) |
| BR-AD-016 | ~~File Types~~ | ~~Allowed: JPG, PNG, WebP.~~ **Removed in v2.4** — same deferral as BR-AD-015. | Deferred (schema gap — §4.11 Design Note) |
| BR-AD-017 | ~~File Naming~~ | ~~UUID-based filenames `{uuid}.{ext}`.~~ **Removed in v2.4** — applicable only to future Admin-side creative uploads. | Deferred (schema gap — §4.11 Design Note) |
| BR-AD-018 | ~~Storage~~ | ~~Stored outside webroot, served via signed URLs or API endpoint.~~ **Removed in v2.4** — applicable only to future Admin-side creative uploads. | Deferred (schema gap — §4.11 Design Note) |

### 4.5 Ownership Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AD-019 | Merchant Read-Only Ownership | Ads belong to a shop; the shop's merchant can view them in read-only mode only. Since v2.4, merchants cannot update/delete/toggle/pay-on/submit their own (or any) advertisements. | Backend (service check + RBAC) |
| BR-AD-020 | Admin Override | Admins can manage all advertisements (approve/reject) and own the full package catalog lifecycle (create/update/deactivate). | Backend (RBAC) |
| BR-AD-021 | Buyer Read-Only | Buyers can only view approved active ads via the public endpoint. | Backend (RBAC) |

### 4.6 Approval Workflow Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AD-028 | Approval Required | All advertisements require admin approval before display. | Backend (service logic) |
| BR-AD-029 | Submission Requires Payment | Ads enter `PENDING_APPROVAL` only with `payment_status = completed`; since v2.4 this is guaranteed atomically by package selection (no separate submit action). | Backend (service logic) |
| BR-AD-030 | Approve/Reject with Reason | Admin approves or rejects; rejection requires `rejection_reason` and sets `approved_by`/`approved_at`. | Backend (service logic + DTO validation) |
| BR-AD-031 | Rejection Refund | Rejected ads trigger automatic refund; `payment_status` set to `refunded`. | Backend (payment service) |
| BR-AD-032 | ~~Resubmission~~ | ~~Rejected ads can be edited and resubmitted.~~ **Removed in v2.4** — rejection is terminal; the merchant may select a new package instead. | — |

### 4.7 Payment Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AD-033 | Payment at Selection | The advertising fee is charged atomically as part of package selection; an unpaid advertisement state cannot exist since v2.4. | Backend (service logic, transactional) |
| BR-AD-034 | Package-Based Fee Calculation | Advertising fee = `daily_rate × duration_days`, resolved from the selected Admin-created package (`placement` × `tier`) in `ad_fee_settings`. Seeded placements: `homepage_slider` (7 days), `product_sidebar` (15 days), `category_banner` (30 days), `search_top` (7 days); tiers: `basic`, `standard`, `premium`. | Backend (ad_fee_settings query) |
| BR-AD-035 | Payment Record & Ledger | Payment details recorded in `ad_payments` ledger table with `ad_id`, `merchant_id` (referencing `merchants.id`), `amount`, `payment_method`, `payment_status`, and `transaction_id`. | Backend (payment service) |
| BR-AD-036 | Payment Verification | Payment must be verified (`payment_status = completed`) before the auto-created ad is queued for approval — guaranteed by the atomic selection flow. | Backend (service logic) |
| BR-AD-037 | Fee Modification Audit | Rate changes by admins apply only to packages selected after the change and are logged in `ad_fee_history`. | Backend (audit logic) |

### 4.8 Weekly Ad Limit Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AD-046 | Weekly Limit | Maximum 5 active advertisements per week across all merchants. | Backend (service logic, query on `week_number`) |
| BR-AD-047 | Week Definition | Week runs Monday 00:00 to Sunday 23:59 (UTC); ISO week number used. | Backend (date utility) |
| BR-AD-048 | Limit Validation Timing | Limit validated before approving an ad for display (approval time). | Backend (service logic) |
| BR-AD-049 | Limit Exceeded Response | Approval blocked with `409 Conflict` and clear message when limit reached. | Backend (service logic) |

### 4.9 Package & Duration Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AD-050 | Package Selection Required | Merchant must select an active package (`placement` × `tier`) from the Admin-created `ad_fee_settings` catalog; invalid or inactive combinations are rejected at selection. | Backend (service logic + DTO validation) + Frontend (package picker) |
| BR-AD-051 | Package-Defined Duration | `starts_at` = package selection (payment) time and `expires_at` is derived server-side as `starts_at + duration_days`; merchants cannot set any date. The catalog spans 7–30 days across placements. | Backend (service logic) |
| BR-AD-052 | Rate Snapshot | `payment_amount` records the fee at selection time; subsequent rate changes in `ad_fee_settings` do not affect already-paid advertisements. | Backend (payment service) |
| BR-AD-053 | Shared Package Capacity | Multiple merchants may select the same package. Per-placement concurrent capacity is governed by `max_ads` in `ad_fee_settings` (enforced once placement persistence is available — see §4.11 Design Note). | Backend (service logic, deferred) |

### 4.10 Cache Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AD-022 | Cache Key | Approved active ads cached under `cache:ads:active` with 5-minute TTL. | Backend (Redis cache) |
| BR-AD-023 | Cache Invalidation | Any mutation (package selection, approve/reject, admin package create/update/deactivate) invalidates the active ads cache and/or package catalog cache. | Backend (service logic) |

### 4.11 Platform Display Rules (REQ v2.10 §5.3)

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AD-054 | Slider Rotation Cap | The storefront advertisement slider displays at most 5 advertisements per rotation cycle. | Frontend (slider component) |
| BR-AD-055 | Tier Priority Order | Advertisements are ordered by tier priority: Premium > Standard > Basic. | Backend (ordering) / Frontend (fallback) |
| BR-AD-056 | Round-Robin Within Tier | Advertisements within the same priority tier rotate evenly (round-robin) across rotation cycles. | Frontend (rotation logic) |
| BR-AD-057 | Auto-Rotation Interval | The slider auto-rotates every 5 seconds. | Frontend (timer) |
| BR-AD-058 | Automatic Exclusion | Expired, inactive, rejected, and unpaid advertisements are excluded from display automatically by the active-ads query filter. | Backend (query filter) |

> **Design Note — Placement/Tier Persistence Gap:** DATABASE_SPEC v2.4's `advertisements` table does not persist `placement` or `tier` (the purchased package). Placement and tier are captured from the selected package at selection/payment time and used for fee resolution (`daily_rate × duration_days`) and the `payment_amount` snapshot, but cannot be queried for display ordering or per-placement capacity checks (`max_ads`). **Recommended follow-up:** schema migration to persist the purchased package (e.g., nullable `placement`/`tier` columns or an `ad_fee_setting_id` FK on `advertisements`) so BR-AD-055 ordering and BR-AD-053 capacity enforcement can be implemented server-side. Until then, `GET /ads/active` returns ads ordered by `created_at DESC` and tier-based prioritization is applied client-side only when package context is available.

> **Design Note — Package Display Content Gap (v2.4):** Because merchants no longer provide advertisement content, banner creatives must originate from Admin-defined packages. DATABASE_SPEC v2.4's `ad_fee_settings` table carries pricing fields only (no `display_name`, `announcement_message`, image, or link columns). Until a schema migration adds creative columns to `ad_fee_settings` (recommended: `display_name`, `announcement_message`, nullable `image_url`, nullable `link_url`), the system derives defaults at ad auto-creation: title = formatted "{placement} · {tier}" display name; announcement message = placement default template; no image; no link URL. Admin-side creative inputs (EL-52a/EL-52b in §5.3.2) are specified as the target contract.

### 4.12 Merchant Access Restriction Rules (v2.4)

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AD-059 | No Merchant CRUD on Advertisements | **Merchants cannot perform CRUD operations on advertisements.** No merchant endpoint exists for creating, updating, deleting, paying separately, submitting, or toggling advertisements. Merchants can only view their own purchase history (read-only). | Backend (RBAC — no merchant mutation routes) + Frontend (action buttons not rendered) |
| BR-AD-060 | Admin-Owned Package Catalog | Advertisement packages ("package ads") are created, updated, and deactivated exclusively by Admin. The merchant-facing catalog is read-only; merchants can only select packages from it. | Backend (admin-only routes on `/admin/ad-fee-settings`) |
| BR-AD-061 | Selection = Purchase | Package selection is atomic: fee payment + advertisement auto-creation + approval queueing occur in one transaction. There is no draft state and no separate pay/submit step. | Backend (transactional service logic) |
| BR-AD-062 | Rejection Is Terminal | A rejected advertisement is final: payment is auto-refunded and the record is retained for history. The merchant's recourse is selecting another package. | Backend (service logic) |

---

## 5. Screen Specifications

### 5.1 Screen: Advertisement Management (`/merchant/advertisements`)

**Purpose:** Let merchants browse the Admin-created advertisement package catalog and select (purchase) packages, and view their own purchased advertisements in a strictly read-only list. Merchants cannot perform CRUD operations on advertisements.

#### 5.1.1 UI Elements

**Header & Summary:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-01 | Page Title | Heading (h5) | `merchant.ads.title` | Yes | "Advertisements" |
| EL-02 | Page Subtitle | Text | `merchant.ads.subtitle` | No | "Select an advertising package created by Admin and track your purchases." |
| EL-03 | New Ad Button | ~~Button (primary)~~ | — | — | **Removed in v2.4** — merchants cannot create advertisements; replaced by the package catalog below |
| EL-03a | Package Catalog Section | Section/Grid | `merchant.ads.catalog` | Yes | Read-only grid of active Admin-created packages from `GET /ads/packages`: placement, tier, display name, announcement preview, daily rate, duration days, max ads, computed fee |
| EL-03b | Select & Pay Button | Button (primary) | `merchant.ads.selectPay` | Yes | On each package card; opens the selection confirmation dialog (§5.2). The only write action available to merchants |
| EL-04 | Active Ads Stat | Card | `merchant.ads.statActive` | Yes | Number of currently running (approved) ads |
| EL-05 | Pending Approval Stat | Card | `merchant.ads.statPending` | Yes | Number of ads awaiting admin approval |
| EL-06 | Expired Stat | Card | `merchant.ads.statExpired` | Yes | Number of past campaigns |

**Toolbar (read-only purchase list):**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-07 | Status Filter | Select | `merchant.ads.filterStatus` | No | Filter by all/active/expired |
| EL-07a | Approval Status Filter | Select | `merchant.ads.filterApproval` | No | Filter by all/pending/approved/rejected |
| EL-08 | Search Input | Input (text) | `merchant.ads.search` | No | Search within own purchases |
| EL-09 | Export Button | Button (outline) | `merchant.ads.export` | No | Export purchase list (CSV) |

**Advertisement Card (read-only):**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-10 | Ad Thumbnail | Image | — | No | Ad image with BANNER tag overlay (package-derived; may be empty until creative columns ship — §4.11 Design Note) |
| EL-11 | Ad Title | Text | — | Yes | Display name from the selected package |
| EL-12 | Status Badge | Badge | — | Yes | Active/Expired badge |
| EL-12a | Approval Status Badge | Badge | — | Yes | Pending/Approved/Rejected badge |
| EL-12b | Payment Status Badge | Badge | — | Yes | Completed/Refunded badge |
| EL-13 | Ad Content | Text | — | No | Package description/content |
| EL-13a | Announcement Message | Text | — | Yes | Banner announcement message (truncated, tooltip for full) |
| EL-14 | Schedule Display | Text | — | Yes | "Aug 24, 2026 → Aug 31, 2026" (start = selection time; end = start + package duration_days) |
| EL-15a | Pay & Submit Button | ~~Button~~ | — | — | **Removed in v2.4** — payment is atomic with selection |
| EL-15b | Resubmit Button | ~~Button~~ | — | — | **Removed in v2.4** — rejected ads are terminal (refund issued automatically) |
| EL-15c | Rejection Reason | Alert (warning) | — | No | Displays `rejection_reason` on rejected ads, plus guidance to select another package |
| EL-16 | Edit Button | ~~Button~~ | — | — | **Removed in v2.4** — merchants cannot edit advertisements |
| EL-17 | Delete Button | ~~Button~~ | — | — | **Removed in v2.4** — merchants cannot delete advertisements |

**Pagination:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-18 | Page Info | Text | `common.pageInfo` | Yes | "Page 1 of 3 · 12 ads" |
| EL-19 | Prev Button | Button (outline) | `common.prev` | Yes | Previous page |
| EL-20 | Next Button | Button (primary) | `common.next` | Yes | Next page |

**Default State:**
- Admin-created packages loaded into the catalog grid (active only), sorted by placement then tier
- Purchases loaded with pagination (20 per page), sorted by newest first
- Status filter shows "All statuses"; loading skeleton during fetch
- **No CRUD affordances exist for any merchant**: no create form, no edit/delete/toggle/pay/resubmit actions are rendered (BR-AD-059)
- **Pending merchant restrictions:** When `license_status` is `'pending'` or `'reject'`, in addition to the universal read-only list:
  - EL-03b (Select & Pay Button) — disabled
  - Info banner displayed: "Your shop is pending approval. You can browse packages and view your ads, but you cannot select a package until your shop is approved."

### 5.2 Screen: Package Selection Confirmation (Dialog)

**Purpose:** Confirm the merchant's package selection before charging the fee. This replaces the former Create/Edit Advertisement dialog — merchants cannot create or edit advertisements; they only select Admin-created packages.

#### 5.2.1 UI Elements

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-21 | Dialog Title | Heading (h5) | `merchant.ads.selectTitle` | Yes | "Select Advertising Package" |
| EL-22 | Close Button | Button (icon) | — | No | Dismiss dialog |
| EL-22a | Placement Display | Text (read-only) | `merchant.ads.placement` | Yes | Selected package placement: Homepage Slider (7 days) / Product Sidebar (15 days) / Category Banner (30 days) / Search Top (7 days); from `GET /ads/packages` |
| EL-22b | Tier Display | Text (read-only) | `merchant.ads.tier` | Yes | Selected package tier: Basic / Standard / Premium |
| EL-23 | Display Name Preview | Text (read-only) | — | Yes | Banner title defined by Admin for this package |
| EL-24a | Announcement Message Preview | Text (read-only) | `merchant.ads.announcement` | Yes | Announcement message defined by Admin; shown on the displayed banner |
| EL-29 | Start Date Notice | Text (read-only) | `merchant.ads.startDate` | Yes | "Starts immediately upon successful payment" (= selection time) |
| EL-30 | End Date Display | Text (read-only) | `merchant.ads.endDate` | Yes | Auto-calculated: Selection Time + package `duration_days`; not editable by anyone but the system |
| EL-32 | Cancel Button | Button (outline) | `common.cancel` | No | Close dialog without selecting |
| EL-33 | Select & Pay Button | Button (primary) | `merchant.ads.selectPay` | Yes | Confirms selection; charges the fee and auto-creates the advertisement (`POST /ads/packages/:feeSettingId/select`) |

**Default State:**
- All values are read-only — there are no merchant-editable inputs in this dialog
- Fee summary visible before confirmation
- Disabled with tooltip when merchant's shop is not approved (pending/reject)

#### 5.2.2 Payment Summary Panel

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-34 | Fee Summary | Text | `merchant.ads.fee` | Yes | Advertising fee displayed before confirmation = package `daily_rate × duration_days` (e.g., "Advertising Fee: $35.00 · 7 days × $5.00/day") |
| EL-35 | Payment Status Text | Text | — | No | Shown on the purchase card afterwards (`completed` / `refunded`) |
| EL-36 | Pay Fee Button | ~~Button~~ | — | — | **Removed in v2.4** — payment is part of the Select & Pay action (EL-33) |
| EL-37 | Submit for Approval Button | ~~Button~~ | — | — | **Removed in v2.4** — approved-pending queueing is automatic after selection |
| EL-38 | Approval Status Text | Text | — | No | Shows `approval_status` (Pending / Approved / Rejected) and `rejection_reason` when rejected |

**Behavior:**
- Selecting a package charges the fee immediately; no draft state exists.
- After success, the ad appears in the read-only purchase list as `PENDING_APPROVAL`.
- A rejected ad cannot be edited or resubmitted; its card shows the rejection reason, refund status, and a hint to select another package.

### 5.3 Screen: Admin Advertisement Moderation (`/admin/advertisements`)

**Purpose:** Allow admins to review, approve, or reject advertisements submitted by merchants.

#### 5.3.1 UI Elements

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-40 | Page Title | Heading (h5) | `admin.ads.title` | Yes | "Advertisement Moderation" |
| EL-41 | Pending Queue | Card/Table | `admin.ads.pendingQueue` | Yes | Ads with `approval_status = pending`, `payment_status = completed` |
| EL-42 | Ad Preview | Card | — | Yes | Thumbnail, title, content, announcement message, schedule, link, shop name, fee/payment info |
| EL-43 | Approve Button | Button (success) | `admin.ads.approve` | Yes | Approve ad (validates weekly limit) |
| EL-44 | Reject Button | Button (destructive) | `admin.ads.reject` | Yes | Reject ad with reason (triggers auto-refund) |
| EL-45 | Rejection Reason Input | Textarea | `admin.ads.rejectReason` | No | Required reason shown when rejecting |
| EL-46 | All Ads Table | Table | `admin.ads.all` | No | All ads with filterable approval/payment status |

**Default State:**
- Shows pending approval queue first (sorted oldest first)
- Each pending ad shows full preview and approve/reject actions
- Weekly limit indicator: "X of 5 active ads this week"

#### 5.3.2 UI Elements — Package Ad Management (REQ v2.10 §5.3: Manage Packages / Set Pricing / Package History)

> Since v2.4, Admin owns the full package lifecycle — Admin creates the package ads that merchants can only select. Merchants have no package management capability.

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-47 | Fee Settings Table | Table | `admin.ads.feeSettings` | Yes | All packages from `ad_fee_settings`: placement, tier, daily rate, duration days, max ads, display name, announcement message, active flag; loaded via `GET /admin/ad-fee-settings` |
| EL-48 | Daily Rate Input | Input (number) | `admin.ads.dailyRate` | No | Inline editable daily rate per package (≥ 0) |
| EL-49 | Save Rate Button | Button (primary) | `admin.ads.saveRate` | No | Persists rate via `PATCH /admin/ad-fee-settings/:id`; change logged to `ad_fee_history` |
| EL-50 | Fee History View | Dialog/Table | `admin.ads.feeHistory` | No | Rate change audit trail from `ad_fee_history`: old/new rate, changed by, changed at |
| EL-51 | New Package Button | Button (primary) | `admin.ads.newPackage` | Yes | Open Create Package dialog; persists via `POST /admin/ad-fee-settings` |
| EL-51a | Placement Select | Select | `admin.ads.placement` | Yes | Package placement (`homepage_slider`, `product_sidebar`, `category_banner`, `search_top`); must be unique per tier combination |
| EL-51b | Tier Select | Select | `admin.ads.tier` | Yes | Pricing tier (`basic`, `standard`, `premium`) |
| EL-51c | Duration Days Input | Input (number) | `admin.ads.durationDays` | Yes | Display duration in days (7–30 catalog bounds) |
| EL-51d | Max Ads Input | Input (number) | `admin.ads.maxAds` | Yes | Slot capacity for the placement |
| EL-52a | Display Name Input | Input (text) | `admin.ads.displayName` | Yes | Banner title shown on the storefront (max 200); target contract pending schema migration (§4.11 Design Note) |
| EL-52b | Announcement Message Input | Textarea | `admin.ads.announcement` | Yes | Banner announcement message shown on the storefront (max 500); target contract pending schema migration |
| EL-52c | Deactivate Package Button | Button (destructive) | `admin.ads.deactivate` | No | Removes the package from the merchant catalog via `DELETE /admin/ad-fee-settings/:id` (soft deactivation; existing paid ads unaffected) |

**Default State:**
- Fee settings table sorted by placement then tier
- Active packages appear in the merchant catalog immediately (cache `cache:ads:packages` invalidated)
- Deactivating a package does not affect already-purchased advertisements
- Rate changes apply only to packages selected after the change (paid ads unaffected — BR-AD-052)

---

## 6. Functional Operation Specification

> **v2.4 Operating Model:** Merchants cannot perform CRUD operations on advertisements. The only merchant write operation is package selection (`POST /ads/packages/:feeSettingId/select`), which atomically pays the fee and auto-creates the advertisement. Former merchant operations (create draft / pay separately / submit / update / delete / toggle) have been removed; the sections below retain their IDs with removal notes for traceability.
>
> **Implementation Status (as of 2026-08-21):** Admin-side operations are implemented in `backend/src/modules/admin/review-management/` (`GET /admin/ads`, `PATCH /admin/ads/:id/approve`, `PATCH /admin/ads/:id/reject`, `GET /admin/ad-fee-settings`, `PATCH /admin/ad-fee-settings/:id`). Merchant-side operations (`backend/src/modules/merchant/advertisements/`) are scaffolded but not yet implemented; the specifications below define the target contract for that module under the v2.4 no-CRUD model.

### 6.1 Operation: Select Advertisement Package (Purchase)

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Select & Pay" button click in Package Selection Confirmation dialog (§5.2) |
| **API Endpoint** | `POST /api/v1/ads/packages/:feeSettingId/select` |
| **Request Content-Type** | `application/json` (optional `paymentReference`; payment gateway stubbed) |
| **Pre-Submission Validation** | JWT merchant role; active fee setting exists; shop approved |
| **Processing Steps** | 1. Validate `:feeSettingId` as UUID format. 2. Validate JWT token and merchant role. **Merchants have no other ad-mutation endpoint (BR-AD-059).** 3. Resolve merchant's shop (GET /shops/merchant). 4. Verify shop exists and `is_approved = true`. **If shop is not approved, return `403 SHOP_NOT_APPROVED` with message "Your shop is pending approval. You cannot select an advertising package until your shop is approved."** 5. Find active package in `ad_fee_settings` by id; if not found or inactive return `404 NOT_FOUND` / `400 AD_PACKAGE_INVALID`. 6. Resolve fee = `daily_rate × duration_days`. 7. In one transaction: process payment (stubbed); record transaction in `ad_payments` (`payment_status = completed`, `amount`, `payment_method`, `transaction_id`, `paid_at`); create advertisement record linked to the shop with display content from the package (see §4.11 Design Note for pre-migration defaults), `starts_at` = now, `expires_at = starts_at + duration_days`, `week_number` derived, `approval_status = pending`, `payment_status = completed`, `payment_amount`, `payment_reference`. 8. Invalidate active ads cache (`DEL cache:ads:active`). 9. Log `AD_SELECTED` and `AD_PAID` audit events. 10. Notify admin of pending approval. 11. Return created advertisement DTO (`201 Created`). |
| **Success Response** | 201 Created with advertisement data |
| **Post-Action** | Close dialog, refresh purchase list, show success toast. Ad appears as PENDING_APPROVAL in the read-only list. |

### 6.2 ~~Operation: Pay Advertising Fee~~

**Removed in v2.4.** Payment is atomic with package selection (§6.1). There is no separate `POST /ads/:id/pay` endpoint and no unpaid advertisement state.

### 6.3 ~~Operation: Submit Advertisement for Approval~~

**Removed in v2.4.** Ads selected via §6.1 enter `PENDING_APPROVAL` automatically (UC-AD-010). There is no separate `POST /ads/:id/submit` endpoint and no merchant submit action.

### 6.4 Operation: Admin Approve Advertisement

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Approve" button click in admin moderation screen |
| **API Endpoint** | `PATCH /api/v1/admin/ads/:id/approve` |
| **Request Content-Type** | None |
| **Pre-Submission Validation** | Admin role; ad in `approval_status = pending` |
| **Processing Steps** | 1. Validate `:id` as UUID format. 2. Validate JWT token and admin role. 3. Find advertisement; verify `approval_status = pending`. 4. Validate weekly limit: count approved active ads with same `week_number`; if ≥ 5 return 409 Conflict. 5. Set `approval_status = approved`, `approved_by` (admin id), `approved_at` (now). 6. Invalidate active ads cache. 7. Log `AD_APPROVED` audit event. 8. Notify merchant of approval. 9. Return updated advertisement DTO. |
| **Success Response** | 200 OK with updated advertisement data |
| **Post-Action** | Ad is eligible for storefront display within its schedule |

### 6.5 Operation: Admin Reject Advertisement

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Reject" button click (with reason) in admin moderation screen |
| **API Endpoint** | `PATCH /api/v1/admin/ads/:id/reject` |
| **Request Content-Type** | `application/json` (`reason`) |
| **Pre-Submission Validation** | Admin role; ad in `approval_status = pending`; reason required |
| **Processing Steps** | 1. Validate `:id` as UUID format. 2. Validate JWT token and admin role. 3. Find advertisement; verify `approval_status = pending`. 4. Validate `reason` (required, max 2000 chars). 5. Set `approval_status = rejected`, `approved_by`, `approved_at`, `rejection_reason`. 6. Trigger automatic refund in a transaction: update the linked `ad_payments` record with `payment_status = refunded`, `refund_amount` (= paid amount), `refund_reason`, `refunded_at`. 7. Update advertisement `payment_status = refunded`. 8. Invalidate active ads cache. 9. Log `AD_REJECTED` audit event. 10. Notify merchant of rejection and reason. 11. Return updated advertisement DTO. |
| **Success Response** | 200 OK with updated advertisement data |
| **Post-Action** | Merchant sees rejection reason and refund status in the read-only list; rejection is terminal — merchant may select another package (BR-AD-062) |

### 6.6 Operation: List Own Advertisements (Read-Only)

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Navigate to `/merchant/advertisements` or apply filter/search |
| **API Endpoint** | `GET /api/v1/ads` |
| **Request Content-Type** | None (query parameters) |
| **Pre-Submission Validation** | Query params validated (page, limit, status, approvalStatus) |
| **Processing Steps** | 1. Validate query parameters. 2. Resolve merchant's shop id. 3. Build Prisma WHERE with `shop_id = <merchant shop id>`. 4. Apply status filter (active: `is_active = true` AND approved AND completed AND in schedule) and approval status filter. 5. Apply pagination via `idx_advertisements_shop_id`. 6. Return paginated response with meta. |
| **Success Response** | 200 OK with advertisement list and pagination meta |
| **Cache** | None (per-merchant, not cached) |
| **Note** | Strictly read-only for ALL merchants since v2.4 — no mutation endpoint backs this view, so no action buttons are rendered client-side. Pending merchants additionally cannot select packages (§6.1 guard). |

### 6.7 ~~Operation: Update Advertisement~~

**Removed in v2.4.** Merchants cannot perform CRUD operations on advertisements; `PATCH /api/v1/ads/:id` no longer exists. Content changes come only from Admin package definitions or future admin moderation tools.

### 6.8 ~~Operation: Delete Advertisement (Soft Delete)~~

**Removed in v2.4.** Merchants cannot delete advertisements; `DELETE /api/v1/ads/:id` no longer exists. All records are retained for history (BR-AD-012).

### 6.9 Operation: List Active Advertisements (Public)

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Storefront load / banner carousel render |
| **API Endpoint** | `GET /api/v1/ads/active` |
| **Request Content-Type** | None |
| **Pre-Submission Validation** | None (public route) |
| **Processing Steps** | 1. `@Public()` route (no JWT required). 2. Check Redis cache `cache:ads:active`. 3. On cache miss: query `WHERE is_active = true AND approval_status = 'approved' AND payment_status = 'completed' AND starts_at <= now() AND expires_at >= now() ORDER BY created_at DESC`. 4. Seed Redis cache with 5-minute TTL. 5. Return active ad list (banner/image + announcement message). Client applies display rules: slider cap of 5 per rotation, tier priority Premium > Standard > Basic, round-robin within tier, auto-rotation every 5 seconds (see §4.11; server-side tier ordering pending placement persistence — see Design Note). |
| **Success Response** | 200 OK with active advertisement list |
| **Cache** | Redis: `cache:ads:active` TTL 5 minutes |

### 6.10 Operation: List Pending Advertisements (Admin)

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Admin navigates to `/admin/advertisements` |
| **API Endpoint** | `GET /api/v1/admin/ads?approvalStatus=pending` (implemented as `GET /admin/ads?status=pending`) |
| **Request Content-Type** | None (query parameters) |
| **Pre-Submission Validation** | Admin role |
| **Processing Steps** | 1. Validate query parameters. 2. Query ads with `approval_status = pending` (and `payment_status = completed`) via `idx_advertisements_approval_status` + `idx_advertisements_payment_status`. 3. Include shop name and payment info. 4. Return paginated list. |
| **Success Response** | 200 OK with paginated pending ad list |
| **Cache** | None |

### 6.11 Operation: Browse Advertisement Packages (Merchant)

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Merchant opens the package catalog section on `/merchant/advertisements` |
| **API Endpoint** | `GET /api/v1/ads/packages` |
| **Request Content-Type** | None |
| **Pre-Submission Validation** | JWT token; merchant or admin role |
| **Processing Steps** | 1. Validate JWT token and role. 2. Query active `ad_fee_settings` (packages created by Admin) ordered by placement, tier. 3. Group by placement with tier options (`basic`/`standard`/`premium`), exposing `daily_rate`, `duration_days`, `max_ads`, and display content per package. 4. Return read-only package catalog for selection (UC-AD-014). |
| **Success Response** | 200 OK with grouped package list |
| **Cache** | Redis: `cache:ads:packages` TTL 10 minutes; invalidated on fee settings update |

### 6.12 Operation: Get Ad Fee Settings (Admin)

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Admin opens Ad Fee Settings management panel (EL-47) |
| **API Endpoint** | `GET /api/v1/admin/ad-fee-settings` |
| **Request Content-Type** | None |
| **Pre-Submission Validation** | Admin role |
| **Processing Steps** | 1. Validate JWT token and admin role. 2. Query all `ad_fee_settings` ordered by placement, tier. 3. Return settings list (placement, tier, daily_rate, duration_days, max_ads). |
| **Success Response** | 200 OK with fee settings list |
| **Cache** | None |

### 6.13 Operation: Update Ad Fee Setting (Admin)

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Save Rate" button click in fee settings panel (EL-49) |
| **API Endpoint** | `PATCH /api/v1/admin/ad-fee-settings/:id` |
| **Request Content-Type** | `application/json` (`daily_rate`) |
| **Pre-Submission Validation** | Admin role; `daily_rate` numeric ≥ 0 |
| **Processing Steps** | 1. Validate `:id` as UUID format. 2. Validate JWT token and admin role. 3. Find fee setting; if not found return 404. 4. Update `daily_rate`; `updated_at` refreshed. 5. Insert audit record into `ad_fee_history`: `ad_fee_setting_id`, `old_daily_rate`, `new_daily_rate`, `changed_by` (admin id), `changed_at`. 6. Invalidate `cache:ads:packages`. 7. Log `AD_FEE_UPDATED` audit event. 8. Return updated fee setting DTO. Rate change applies only to packages selected afterwards (BR-AD-037/BR-AD-052). |
| **Success Response** | 200 OK with updated fee setting data |
| **Post-Action** | Refresh fee settings table; show success toast |

### 6.14 Operation: Create Advertisement Package (Admin, v2.4)

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "New Package" button click in Package Ad Management panel (EL-51) |
| **API Endpoint** | `POST /api/v1/admin/ad-fee-settings` |
| **Request Content-Type** | `application/json` (`placement`, `tier`, `daily_rate`, `duration_days`, `max_ads`, `display_name`, `announcementMessage`) |
| **Pre-Submission Validation** | Admin role; DTO validation (§8.1); unique (`placement`, `tier`) combination |
| **Processing Steps** | 1. Validate JWT token and admin role. 2. Validate all fields; reject duplicate active (`placement`, `tier`) combination with `409 CONFLICT`. 3. Validate `duration_days` within catalog bounds (7–30) and `max_ads` ≥ 1; `daily_rate` ≥ 0. 4. Insert new package into `ad_fee_settings`. 5. Invalidate `cache:ads:packages`. 6. Log `AD_PACKAGE_CREATED` audit event. 7. Return created fee setting DTO (`201 Created`). The package is immediately selectable by merchants in the read-only catalog. |
| **Success Response** | 201 Created with fee setting data |
| **Post-Action** | Refresh fee settings table; show success toast |

### 6.15 Operation: Deactivate Advertisement Package (Admin, v2.4)

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Deactivate" button click on a package row (EL-52c) |
| **API Endpoint** | `DELETE /api/v1/admin/ad-fee-settings/:id` |
| **Request Content-Type** | None |
| **Pre-Submission Validation** | Admin role |
| **Processing Steps** | 1. Validate `:id` as UUID format. 2. Validate JWT token and admin role. 3. Find fee setting; if not found return 404. 4. Soft-deactivate the package (`is_active = false`) so it no longer appears in the merchant catalog; already-purchased advertisements are unaffected. 5. Invalidate `cache:ads:packages`. 6. Log `AD_PACKAGE_DEACTIVATED` audit event. 7. Return deactivated fee setting DTO. |
| **Success Response** | 200 OK with updated fee setting data |
| **Post-Action** | Refresh fee settings table; show success toast |

---

## 7. Input / Output Specification

### 7.1 Input Specification — Package Selection (Merchant, 入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `feeSettingId` | Package | 広告パッケージ | UUID (path param) | Yes | Select & Pay button | `@IsUUID()`; must resolve to an active `ad_fee_settings` record |
| `paymentReference` | Payment Reference | 支払い参照 | VARCHAR(100) | No | (hidden, gateway stub) | `@IsString()`, `@IsOptional()`, `@MaxLength(100)` |

> **No other merchant inputs exist since v2.4.** Advertisement content fields (`title`, `content`, `announcementMessage`, `imageUrl`, `linkUrl`, `isActive`, `startsAt`) are never accepted from merchants — merchants cannot perform CRUD operations on advertisements.

### 7.1a Input Specification — Create Advertisement Package (Admin, 入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `placement` | Placement | 掲載場所 | VARCHAR(50) | Yes | Select | `@IsIn(['homepage_slider', 'product_sidebar', 'category_banner', 'search_top'])`; unique per tier |
| `tier` | Tier | 料金プラン | VARCHAR(20) | Yes | Select | `@IsIn(['basic', 'standard', 'premium'])` |
| `daily_rate` | Daily Rate | 日額 | DECIMAL(10,2) | Yes | Input (number) | `@IsNumber()`, `@Min(0)` |
| `duration_days` | Duration Days | 表示日数 | INTEGER | Yes | Input (number) | `@IsInt()`, `@Min(7)`, `@Max(30)` |
| `max_ads` | Max Ads | 最大枠数 | INTEGER | Yes | Input (number) | `@IsInt()`, `@Min(1)` |
| `display_name` | Display Name | 表示名 | VARCHAR(200) | Yes* | Input (text) | `@IsString()`, `@IsNotEmpty()`, `@MaxLength(200)` — *target contract pending schema migration (§4.11 Design Note)* |
| `announcementMessage` | Announcement Message | 告知メッセージ | VARCHAR(500) | Yes* | Textarea | `@IsString()`, `@IsNotEmpty()`, `@MaxLength(500)` — *target contract pending schema migration* |

> Note: `approval_status`, `payment_status`, `payment_amount`, `payment_reference`, `week_number`, `approved_by`, `approved_at`, `rejection_reason`, `starts_at` (= selection time), and `expires_at` (derived server-side as `starts_at + duration_days`) are system-managed on the advertisement record and never accepted from merchant input.

### 7.2 ~~Input Specification — Update Advertisement (入力定義)~~

**Removed in v2.4.** No update operation exists for merchants — merchants cannot perform CRUD operations on advertisements. Package definitions are updated by Admin via `PATCH /admin/ad-fee-settings/:id` (daily rate; display content per §4.11 Design Note).

### 7.3 Input Specification — List Query (入力定義)

| Field | Display Name (EN) | Data Type | Required | Input Control | Validation |
|-------|-------------------|-----------|:--------:|---------------|------------|
| `page` | Page | Number | No | Pagination | `@IsInt()`, `@Min(1)`, default 1 |
| `limit` | Limit | Number | No | Pagination | `@IsInt()`, `@Min(1)`, `@Max(100)`, default 20 |
| `status` | Status | String | No | Select | `@IsIn(['active', 'inactive', 'expired'])`, `@IsOptional()` |
| `approvalStatus` | Approval Status | String | No | Select | `@IsIn(['pending', 'approved', 'rejected'])`, `@IsOptional()` |

### 7.4 Input Specification — Admin Actions (入力定義)

| Endpoint | Field | Data Type | Required | Validation |
|----------|-------|-----------|:--------:|------------|
| `POST /ads/packages/:feeSettingId/select` | `paymentReference` | String | No | `@IsString()`, `@IsOptional()`, `@MaxLength(100)` |
| `PATCH /admin/ads/:id/reject` | `reason` | String | Yes | `@IsString()`, `@IsNotEmpty()`, `@MaxLength(2000)` |
| `PATCH /admin/ad-fee-settings/:id` | `daily_rate` | Number | Yes | `@IsNumber()`, `@Min(0)`, `@Max(10000)` |
| `POST /admin/ad-fee-settings` | package fields | Object | Yes | See §7.1a |

> Former rows removed in v2.4: `POST /ads/:id/pay` (merged into selection).

### 7.5 Output Specification — Advertisement (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `id` | `advertisements.id` | UUID string |
| `shopId` | `advertisements.shop_id` | UUID string |
| `title` | `advertisements.title` | String |
| `content` | `advertisements.content` | String or null |
| `announcementMessage` | `advertisements.announcement_message` | String |
| `imageUrl` | `advertisements.image_url` | URL string or null |
| `linkUrl` | `advertisements.link_url` | URL string or null |
| `isActive` | `advertisements.is_active` | Boolean |
| `approvalStatus` | `advertisements.approval_status` | 'pending' / 'approved' / 'rejected' |
| `paymentStatus` | `advertisements.payment_status` | 'pending' / 'completed' / 'failed' / 'refunded' |
| `paymentAmount` | `advertisements.payment_amount` | Decimal string or null |
| `paymentReference` | `advertisements.payment_reference` | String or null |
| `approvedBy` | `advertisements.approved_by` | UUID string or null |
| `approvedAt` | `advertisements.approved_at` | ISO 8601 timestamp or null |
| `rejectionReason` | `advertisements.rejection_reason` | String or null |
| `weekNumber` | `advertisements.week_number` | Integer (ISO week) |
| `startsAt` | `advertisements.starts_at` | ISO 8601 timestamp |
| `expiresAt` | `advertisements.expires_at` | ISO 8601 timestamp |
| `createdAt` | `advertisements.created_at` | ISO 8601 timestamp |

> Since v2.4, content fields in this DTO (`title`, `announcementMessage`, etc.) originate from the Admin-defined package (or system defaults pending the §4.11 schema migration), never from merchant input.

### 7.6 Output Specification — Active Advertisement (Public, 出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `id` | `advertisements.id` | UUID string |
| `shopId` | `advertisements.shop_id` | UUID string |
| `title` | `advertisements.title` | String |
| `content` | `advertisements.content` | String or null |
| `announcementMessage` | `advertisements.announcement_message` | String (banner announcement) |
| `imageUrl` | `advertisements.image_url` | URL string or null |
| `linkUrl` | `advertisements.link_url` | URL string or null |
| `startsAt` | `advertisements.starts_at` | ISO 8601 timestamp |
| `expiresAt` | `advertisements.expires_at` | ISO 8601 timestamp |

---

## 8. Input Validation Rules

### 8.1 Package Selection Validation (Merchant, Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `feeSettingId` | Required UUID; must resolve to an active package in the Admin-created `ad_fee_settings` catalog | "Package is required" / "Selected advertising package is unavailable" | "広告パッケージは必須です" / "選択された広告パッケージは利用できません" |
| Shop approval | Merchant's shop must be `is_approved = true` to select a package | "Your shop is pending approval. You cannot select an advertising package until your shop is approved." | "ショップの承認が完了していないため、広告パッケージを選択できません" |
| `paymentReference` | Optional, max 100 chars | "Payment reference must not exceed 100 characters" | "支払い参照は100文字以内で入力してください" |

> Since v2.4 merchants provide no advertisement content — all former content-field validations (`title`, `content`, `announcementMessage`, `imageUrl`, `linkUrl`, `isActive`, `startsAt`) moved to Admin package creation (§7.1a). Merchants cannot perform CRUD operations on advertisements.

### 8.1a Create Advertisement Package Validation (Admin, Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `placement` | Required, one of `homepage_slider` / `product_sidebar` / `category_banner` / `search_top`; unique per tier | "Placement is required" / "Invalid placement" / "A package for this placement and tier already exists" | "掲載場所は必須です" / "掲載場所が不正です" / "この掲載場所とプランの組み合わせは既に存在します" |
| `tier` | Required, one of `basic` / `standard` / `premium` | "Tier is required" / "Invalid tier" | "料金プランは必須です" / "料金プランが不正です" |
| `daily_rate` | Required, ≥ 0 | "Daily rate is required" / "Daily rate must not be negative" | "日額は必須です" / "日額は0以上で入力してください" |
| `duration_days` | Required integer within 7–30 catalog bounds | "Duration days must be between 7 and 30" | "表示日数は7〜30日の範囲で入力してください" |
| `max_ads` | Required integer ≥ 1 | "Max ads must be at least 1" | "最大枠数は1以上で入力してください" |
| `display_name` | Required, 1-200 chars (target contract pending schema migration) | "Display name is required" / "Display name must not exceed 200 characters" | "表示名は必須です" / "表示名は200文字以内で入力してください" |
| `announcementMessage` | Required, max 500 chars (target contract pending schema migration) | "Announcement message is required" / "Announcement message must not exceed 500 characters" | "告知メッセージは必須です" / "告知メッセージは500文字以内で入力してください" |

### 8.2 Schedule Date Validation (System-Derived)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `startsAt` | System-derived = package selection (payment) time; never merchant input | — | — |
| `expiresAt` | System-derived: `starts_at + duration_days` of the selected package; guarded by DB check constraint `chk_advertisements_dates` (`expires_at > starts_at`) | "Advertisement dates are invalid" | "広告期間が不正です" |
| Duration | Fixed by selected package's `duration_days`; catalog spans 7–30 days across placements (7d homepage_slider/search_top, 15d product_sidebar, 30d category_banner) | "Advertisement duration is determined by the selected package" | "広告の表示期間は選択したパッケージにより決定されます" |

### 8.3 Approval / Payment / Weekly Limit Validation

| Field / Rule | Validation Rule | Error Message (EN) | Error Message (JA) |
|--------------|-----------------|--------------------|--------------------|
| `approvalStatus` | Enum `pending/approved/rejected` (DB constraint `chk_advertisements_approval_status`) | "Invalid approval status" | "承認状態が不正です" |
| `paymentStatus` | Enum `pending/completed/refunded/failed` (DB constraint `chk_advertisements_payment_status`) | "Invalid payment status" | "支払い状態が不正です" |
| `rejectionReason` | Required when rejecting | "Rejection reason is required" | "却下理由は必須です" |
| Selection payment | Payment must succeed within the selection transaction; failure rolls back ad creation entirely (`payment_status` stays out of the ledger) | "Payment failed. The package was not selected." | "支払いに失敗しました。パッケージは選択されていません。" |
| Merchant mutation attempt | Any merchant request to a former CRUD endpoint (`POST /ads`, `PATCH /ads/:id`, `DELETE /ads/:id`, `POST /ads/:id/pay`, `POST /ads/:id/submit`) returns `403 FORBIDDEN` — endpoints no longer exist for the merchant role | "Merchants cannot modify advertisements. Please select an advertising package instead." | "店舗は広告を変更できません。広告パッケージを選択してください。" |
| Weekly limit | Max 5 approved active ads per week | "Weekly advertisement limit reached (max 5)" | "今週の広告枠上限(5件)に達しました" |

### 8.4 Validation Enforcement Layers

1. **Frontend (Client)**: React Hook Form + Zod schema validation on the selection dialog (package selection required, read-only derived schedule display). No advertisement content form exists for merchants.
2. **Backend (Server)**: NestJS ValidationPipe + class-validator DTOs on all endpoints; service-level checks for package resolution, shop approval, atomic payment, approval/weekly-limit rules, and server-side `starts_at`/`expires_at` derivation.
3. **Database (PostgreSQL)**: CHECK constraints `chk_advertisements_dates`, `chk_advertisements_approval_status`, `chk_advertisements_payment_status` as final guards.

---

## 9. Error Handling Specification

### 9.1 Error Response Structure

```json
{
  "statusCode": 403,
  "message": ["Forbidden"],
  "error": "Forbidden",
  "timestamp": "2026-08-05T12:00:00.000Z",
  "path": "/api/v1/ads/a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

### 9.2 Error Classification Table — Advertisement Operations

| HTTP Status | Error Code | Scenario | User-Facing Behavior |
|-------------|------------|----------|---------------------|
| `400` | `BAD_REQUEST` | Validation failures (incl. missing `reason`, missing `announcementMessage`) | Field-level inline errors + top banner |
| `401` | `UNAUTHORIZED` | Missing or invalid JWT | Redirect to login |
| `403` | `FORBIDDEN` | Not merchant/admin, not ad owner; **also any merchant attempt at a former CRUD endpoint (removed in v2.4)** | "You don't have permission to manage this ad" / "Merchants cannot modify advertisements. Please select an advertising package instead." |
| `403` | `SHOP_NOT_APPROVED` | Pending merchant attempts package selection | Read-only view: "Your shop is pending approval. You can browse packages and view your ads, but you cannot select a package until your shop is approved." (Select & Pay disabled in UI) |
| `404` | `NOT_FOUND` | Advertisement not found; selected package not found | "Advertisement not found" with refresh option |
| `409` | `CONFLICT` | `expires_at <= starts_at` (DB guard) | "Invalid schedule dates" |
| `409` | `WEEKLY_LIMIT_REACHED` | Weekly ad limit (5/week) reached on approve | "Weekly advertisement limit reached (max 5)" |
| `400` | `AD_PACKAGE_INVALID` | Selected `feeSettingId` does not resolve to an active `ad_fee_settings` record (package deactivated or invalid) | "Selected advertising package is unavailable" |
| `400` | `AD_SCHEDULE_INVALID` | Derived schedule invalid (`expires_at` could not be derived from package duration) | "Advertisement schedule is invalid" |
| `422` | `UNPROCESSABLE_ENTITY` | Approve non-pending ad; payment verification failure during selection | "Advertising fee payment failed. The package was not selected." |
| ~~`413`~~ | ~~`PAYLOAD_TOO_LARGE`~~ | ~~Ad image file > 5MB~~ — **Removed in v2.4** (merchants upload nothing) | — |
| ~~`415`~~ | ~~`UNSUPPORTED_MEDIA_TYPE`~~ | ~~Invalid image format~~ — **Removed in v2.4** (merchants upload nothing) | — |
| `429` | `TOO_MANY_REQUESTS` | Rate limit exceeded | "Too many requests. Please wait {seconds} seconds" |
| `500` | `INTERNAL_SERVER_ERROR` | Server error (incl. payment verification failure) | "Something went wrong. Please try again" |

### 9.3 Frontend Error Display Behavior

- **Field-Level Validation**: Red border and inline text below invalid input.
- **Form-Level Summary**: Alert banner at top of form listing all errors.
- **Toast Notifications**: Used for API errors and successful actions.
- **Loading States**: Spinner on submit buttons during API calls.
- **Empty States**: Illustrated message when no ads match the current filter/search.
- **Confirm Dialog**: Package selection requires confirmation (with fee summary) before the select-and-pay API call.

---

## 10. Permission and Access Control

### 10.1 Authentication Requirements

- JSON Web Token (JWT) Bearer Token passed via `Authorization` header for merchant operations.
- Public endpoint (active ad display) requires no authentication.

### 10.2 Public vs Protected Endpoints

| Endpoint | Access Level | Description |
|----------|-------------|-------------|
| `GET /ads/packages` | Protected (Merchant/Admin) | Browse Admin-created advertisement packages (read-only catalog) |
| `POST /ads/packages/:feeSettingId/select` | Protected (Merchant) | Select package + pay fee; auto-creates the advertisement — **the only merchant write operation** |
| `GET /ads` | Protected (Merchant) | List own advertisements (read-only purchase history) |
| `GET /admin/ads` | Protected (Admin) | List all ads / pending approval queue |
| `PATCH /admin/ads/:id/approve` | Protected (Admin) | Approve advertisement |
| `PATCH /admin/ads/:id/reject` | Protected (Admin) | Reject advertisement (with reason + refund, terminal) |
| `GET /admin/ad-fee-settings` | Protected (Admin) | List advertisement package settings |
| `POST /admin/ad-fee-settings` | Protected (Admin) | Create advertisement package (v2.4) |
| `PATCH /admin/ad-fee-settings/:id` | Protected (Admin) | Update package daily rate / display content (logged to `ad_fee_history`) |
| `DELETE /admin/ad-fee-settings/:id` | Protected (Admin) | Deactivate package (removed from merchant catalog; v2.4) |
| `GET /ads/active` | Public | List active approved ads for platform display |

> **Removed endpoints (v2.4):** `POST /ads`, `PATCH /ads/:id`, `DELETE /ads/:id`, `POST /ads/:id/pay`, `POST /ads/:id/submit` — merchants cannot perform CRUD operations on advertisements.

### 10.3 Role-Based Access

| Role | View Own Ads | Create Ads | Edit/Delete/Toggle Ads | Select Package (+ Pay) | Manage Packages (CRUD) | Approve / Reject | View Active Ads (Public) |
|------|:------------:|:----------:|:----------------------:|:----------------------:|:----------------------:|:----------------:|:------------------------:|
| `buyer` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| `merchant` (pending) | ✓ (own shop, read-only) | ✗ | ✗ | ✗ (`SHOP_NOT_APPROVED`) | ✗ | ✗ | ✓ |
| `merchant` (approved) | ✓ (own shop, read-only) | ✗ | ✗ | ✓ | ✗ | ✗ | ✓ |
| `admin` | ✓ (all ads) | ✗ (ads are auto-created by selection only) | ✗ (via moderation approve/reject only) | ✓ | ✓ (full CRUD on packages) | ✓ | ✓ |

> **Note (v2.4):** Merchants cannot perform CRUD operations on advertisements. The merchant role has exactly one write operation: selecting an Admin-created package (which atomically pays and auto-creates the ad). All merchants see their own purchases read-only; pending merchants additionally cannot select packages. Only merchants with `license_status = 'approved'` may select packages.

### 10.4 Ownership Enforcement

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('merchant', 'admin')
@Controller('ads')
export class AdvertisementsController {
  // GET /packages        — read-only Admin-created catalog (merchant/admin)
  // POST /packages/:feeSettingId/select — merchant select + pay (only write op)
  // GET /                — own purchase history, read-only (merchant)
  //
  // No POST /, PATCH /:id, DELETE /:id, POST /:id/pay, POST /:id/submit —
  // merchants cannot perform CRUD operations on advertisements (BR-AD-059)

  @Public()
  @Get('active')
  findActive() { ... }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class AdminAdvertisementsController {
  // GET /ads, PATCH /ads/:id/approve, PATCH /ads/:id/reject,
  // GET /ad-fee-settings, POST /ad-fee-settings,
  // PATCH /ad-fee-settings/:id, DELETE /ad-fee-settings/:id  (admin only)
}
```

Merchants can only view ads whose `shop_id` matches their own shop and select packages from the Admin-created catalog. Attempts to access another merchant's ad or to reach a former CRUD endpoint MUST return `403 Forbidden`. Admin owns the package catalog lifecycle; approve/reject endpoints MUST require `admin` role only.

**Pending Merchant Restrictions:** Merchants with `license_status` of `'pending'` or `'reject'` can browse the package catalog and view their purchase list (read-only), but package selection MUST verify `shop.is_approved = true` and return `403 SHOP_NOT_APPROVED` if the shop is not approved. The frontend disables the Select & Pay action for pending merchants.

### 10.5 Security Audit Logging

| Event | Data Logged | Retention |
|-------|-------------|-----------|
| `AD_SELECTED` | shopId, adId, feeSettingId, merchantId, placement, tier, amount, timestamp | 90 days |
| `AD_PAID` | shopId, adId, amount, reference, timestamp | 90 days |
| `AD_SUBMITTED` | shopId, adId, timestamp (system-generated on selection — no merchant action) | 90 days |
| `AD_APPROVED` | shopId, adId, adminId, timestamp | 2 years (admin action — Development Rules §6.4) |
| `AD_REJECTED` | shopId, adId, adminId, reason, refund amount, timestamp | 2 years (admin action — Development Rules §6.4) |
| `AD_PACKAGE_CREATED` | settingId, placement, tier, daily rate, duration, max ads, display name, adminId, timestamp | 2 years (admin action — Development Rules §6.4) |
| `AD_PACKAGE_DEACTIVATED` | settingId, placement, tier, adminId, timestamp | 2 years (admin action — Development Rules §6.4) |
| `AD_FEE_UPDATED` | settingId, placement, tier, old rate, new rate, adminId, timestamp | 2 years (admin action — Development Rules §6.4) |

> Removed in v2.4: `AD_CREATED` (merged into `AD_SELECTED`), `AD_UPDATED`, `AD_DELETED` (no merchant mutations exist).

---

## 11. Real-Time Notification Behavior

### 11.1 Current Implementation

The Advertisement Management screen does not require WebSocket connections. Advertisement status (pending/approved/rejected, active/inactive/expired) is derived from schedule data and refreshed through standard query invalidation (TanStack Query) after mutations.

### 11.2 Notification Events

| Event | Trigger | Recipient | Action |
|-------|---------|-----------|--------|
| `AD_SUBMITTED` | Ad auto-enters pending queue after package selection (system-generated; no merchant action) | Admin | Pending approval badge / notification in admin dashboard |
| `AD_APPROVED` | Admin approves ad | Merchant | Notification + ad becomes displayable (cache refresh ≤ 5 min) |
| `AD_REJECTED` | Admin rejects ad | Merchant | Notification with `rejection_reason`; refund processed; rejection is terminal |
| `AD_ACTIVATED` | Start time reached | — | Appears on storefront after `cache:ads:active` refresh (max 5 min) |
| `AD_EXPIRED` | `expires_at` passed | — | Disappears from storefront after cache refresh |
| `AD_MUTATED` | Package selection / admin package changes | — | Cache invalidated immediately; next `GET /ads/active` re-queries DB |

---

## 12. Screen Transition Specification

### 12.1 Inbound Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| Merchant dashboard | `/merchant/advertisements` | Click "Advertisements" menu |
| Admin dashboard | `/admin/advertisements` | Click "Advertisement Moderation" menu |
| Merchant | `/merchant/advertisements` (Advertisement Management Page, Read-Only + Package Catalog) | `license_status` is `'pending'` or `'reject'` — package selection disabled, purchase list viewable |
| Merchant | `/merchant/advertisements` (Advertisement Management Page, Select & Pay enabled) | `license_status` is `'approved'` |
| Any protected route (unauthenticated) | `/login` | No valid access token |

### 12.2 Internal Navigation

| Source | Target | Trigger |
|--------|--------|---------|
| `/merchant/advertisements` | Package Selection Confirmation dialog (modal) | Click "Select & Pay" on a package card |
| Package Selection Confirmation dialog | `/merchant/advertisements` | Click "Cancel" or selection success |
| `/admin/advertisements` | Approve/Reject Dialog (modal) | Click "Approve" / "Reject" |
| `/admin/advertisements` | Create Package Dialog (modal) | Click "New Package" |

### 12.3 Outbound Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| Ad banner (storefront) | `linkUrl` (e.g. `/products?category=serums`) | Buyer clicks active banner |

### 12.4 Error Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| Any ad page | `/login` | 401 Unauthorized |
| Any ad page | `/unauthorized` | 403 Forbidden |
| Any ad page | `/merchant/advertisements` | 404 Advertisement not found (refresh list) |

---

## 13. Non-Functional Considerations

### 13.1 Performance Requirements

| Metric | Target |
|--------|--------|
| Advertisement List Page Load | ≤ 2 seconds |
| Package Catalog Load | ≤ 2 seconds |
| Select & Pay (Package Selection) API | ≤ 2 seconds |
| Approve / Reject Ad API | ≤ 1 second |
| Active Ads API (cache hit) | ≤ 100 milliseconds |
| Active Ads API (cache miss) | ≤ 500 milliseconds |

### 13.2 Caching Strategy

| Cache Key | TTL | Invalidation Trigger |
|-----------|-----|---------------------|
| `cache:ads:active` | 5 minutes | Package selection (ad auto-creation), approve/reject, admin package changes |
| `cache:ads:packages` | 10 minutes | Admin package create/update/deactivate (rate change) |

### 13.3 Image Optimization

| Requirement | Description |
|-------------|-------------|
| Format | Serve WebP when supported, fallback to JPEG |
| Banner Dimensions | Standard banner aspect ratio (e.g. 4:1) with responsive variants |
| CDN Ready | Image URLs should be CDN-compatible for production |
| Compression | Serve optimized/sized variants to minimize banner load weight |

### 13.4 Responsive Design Requirements

| Breakpoint | Layout |
|------------|--------|
| Desktop (≥ 1024px) | Full dashboard layout with sidebar, card list with thumbnails |
| Tablet (768px – 1023px) | Sidebar collapses, ad cards stack vertically |
| Mobile (< 768px) | Single-column ad cards, dialog becomes full-screen sheet |

### 13.5 Accessibility Requirements

| Requirement | Implementation |
|-------------|---------------|
| WCAG 2.1 AA | Semantic HTML, ARIA labels on all interactive elements |
| Keyboard Navigation | Tab order through ad cards, toolbar, dialog fields |
| Screen Reader | Alt text for ad images, ARIA labels for edit/delete actions |
| Color Contrast | Minimum 4.5:1 for text, 3:1 for UI components (status badges) |
| Focus Indicators | Visible focus ring on all interactive elements, focus trap in dialog |

---

## 14. Configurable Items (External Definitions)

Defined via `.env` configuration:

| Definition Key | Default Value | Description |
|----------------|---------------|-------------|
| `AD_LIST_PAGE_SIZE` | `20` | Default items per page |
| `AD_LIST_MAX_PAGE_SIZE` | `100` | Maximum items per page |
| `AD_IMAGE_MAX_SIZE_MB` | `5` | Maximum ad image file size in MB (deferred — applies to future Admin-side package creatives, §4.11 Design Note) |
| `AD_IMAGE_ALLOWED_TYPES` | `['image/jpeg', 'image/png', 'image/webp']` | Allowed MIME types for ad images (deferred — same as above) |
| `AD_IMAGE_STORAGE_PATH` | `./uploads/ads` | Directory to store uploaded ad images (deferred — same as above) |
| `AD_ACTIVE_CACHE_TTL_SECONDS` | `300` | Active ads cache TTL (5 min) |
| `AD_ACTIVE_CACHE_KEY` | `cache:ads:active` | Redis key for active ads cache |
| `AD_PACKAGES_CACHE_TTL_SECONDS` | `600` | Package catalog cache TTL (10 min) |
| `AD_PACKAGES_CACHE_KEY` | `cache:ads:packages` | Redis key for package catalog cache |
| `AD_FEE_SETTINGS_TABLE` | `ad_fee_settings` | Dynamic placement/tier fee settings master |
| `AD_WEEKLY_LIMIT` | `5` | Maximum active advertisements per week (platform-wide) |
| `AD_SLIDER_MAX_ADS` | `5` | Maximum advertisements displayed per storefront slider rotation cycle (REQ v2.10 §5.3) |
| `AD_SLIDER_ROTATION_SECONDS` | `5` | Storefront slider auto-rotation interval in seconds (REQ v2.10 §5.3) |
| `AD_MIN_DURATION_DAYS` | `7` | Package catalog sanity bound — minimum package duration in days |
| `AD_MAX_DURATION_DAYS` | `30` | Package catalog sanity bound — maximum package duration in days |
| `AD_ANNOUNCEMENT_MAX_LENGTH` | `500` | Maximum length of announcement message |

---

## 15. Cross-Reference Traceability Matrix

### 15.1 Requirements Definition Traceability

> Legacy M-AD-xxx IDs are internal anchors of this document (REQUIREMENT_SPEC v2.0 was a clean rewrite; see §2.5 for the full mapping to REQ v2.10 sections).

| Requirement ID | Requirement Description | Covered By (This Document) |
|----------------|-------------------------|----------------------------|
| M-AD-001 | ~~Merchant can create shop advertisements~~ | **Revised in v2.4** — merchants cannot create ads; ads auto-created by package selection — UC-AD-001, BR-AD-059~061, Sec 6.1 |
| M-AD-002 | Merchant can set ad schedule (start date; end derived from package) | **Superseded in v2.4** — schedule system-derived from selection time — BR-AD-008~010, BR-AD-025, BR-AD-051, Sec 8.2 |
| M-AD-003 | Merchant can upload ad images | **Removed in v2.4** — display content Admin-defined at package level — BR-AD-015~018 (deferred), Sec 4.11 Design Note |
| M-AD-004 | Merchant can view/manage own ads | Revised in v2.4 — read-only purchase list — UC-AD-004, Sec 5.1, Sec 6.6 |
| M-AD-005 | Active ads display on platform | UC-AD-008, BR-AD-054~058, Sec 6.9, Sec 11.2 |
| M-AD-006 | Admin can approve/reject advertisements | UC-AD-011/012, BR-AD-028~031, Sec 5.3, Sec 6.4~6.5, Sec 6.10 |
| M-AD-007 | Merchants must pay advertising fee before submission | Covered via selection-time payment — UC-AD-001, BR-AD-029/033~036, Sec 6.1 |
| M-AD-008 | Maximum 5 active advertisements per week | BR-AD-046~049, Sec 6.4 (step 4), Sec 8.3 |
| M-AD-009 | Advertisements display with banner/image and announcement message | BR-AD-024, EL-13a, Sec 7.6 (content Admin-defined per package) |
| M-AD-010 | Ad states: draft → pending_payment → pending_approval → approved → active → expired | Revised in v2.4 — selected+paid → pending_approval → approved → active → expired — Sec 3.1, Sec 3.4 |
| M-AD-011 | Rejected ads auto-refund payment to merchant | BR-AD-031, BR-AD-062, Sec 6.5 (steps 6~7) — rejection terminal |
| M-AD-012 | ~~Per merchant: maximum 2 active ads simultaneously~~ | **Removed in v2.2** — not defined in REQ v2.10 |
| M-AD-013 | ~~Minimum ad duration: 7 days~~ | Superseded by package-defined duration — BR-AD-050~052, Sec 4.9 |
| M-AD-014 | ~~Maximum ad duration: 30 days~~ | Superseded by package-defined duration — BR-AD-050~052, Sec 4.9 |
| — (REQ v2.10 §4.4 View Packages) | Merchant browses Admin-created advertisement packages and selects one | UC-AD-014 + UC-AD-001, Sec 6.11 + Sec 6.1, EL-03a/EL-03b |
| — (REQ v2.10 §5.3 Manage Packages / Set Pricing / Package History) | Admin manages full package lifecycle with audit history | UC-AD-015, Sec 5.3.2, Sec 6.12~6.15, BR-AD-037/BR-AD-052/BR-AD-060 |
| — (REQ v2.10 §5.3 Display Rules) | Slider cap 5, priority Premium > Standard > Basic, round-robin, auto-rotation 5s | BR-AD-054~058, Sec 4.11, Sec 6.9 |
| — (v2.4 internal) | Merchants cannot perform CRUD operations on advertisements; they only select packages created by Admin | BR-AD-059~062, Sec 10.3, Sec 10.4 |
| — (REQ v2.10 §4.4 View Analytics) | Merchant views ad impressions/clicks/CTR | **Out of scope** — no analytics counters in DATABASE_SPEC v2.4; deferred pending schema extension |

### 15.2 Database Design Traceability

| Database Table | Relevant Functional Operations |
|----------------|-------------------------------|
| `advertisements` | System-side INSERT on package selection (shop_id, derived schedule, pending+paid statuses), List (SELECT+WHERE, read-only), Approve/Reject (UPDATE approval_status/approved_by/approved_at/rejection_reason), Active display (SELECT+WHERE approved+paid+in-schedule), Weekly limit (SELECT count by week_number). No merchant UPDATE/DELETE since v2.4. Note: placement/tier of the purchased package are not persisted in DBS v2.4 — see Design Note in §4.11. |
| `ad_fee_settings` | Admin-only package catalog management (INSERT create, SELECT grouped by placement/tier, UPDATE daily_rate/display content, soft-deactivate), fee resolution at selection (`daily_rate × duration_days`), merchant catalog browsing (SELECT active only) |
| `ad_payments` | Record advertisement payment transaction (INSERT: amount, payment_method, payment_status, transaction_id, paid_at), refund on rejection (UPDATE payment_status/refund_amount/refund_reason/refunded_at) — linked via `merchant_id` to `merchants` |
| `ad_fee_history` | Audit trail for admin rate modifications (INSERT: old/new rate, changed_by, changed_at), package history view (SELECT) |
| `merchants` | Merchant profile and license status verification |
| `shops` | Shop approval check (SELECT is_approved), Resolve merchant shop id (SELECT) |
| `users` | Approver reference (`approved_by` FK), admin identity for audit |

### 15.3 Related Document References

| Document ID | Document Name | Version | File Path |
|-------------|---------------|---------|-----------|
| SKM-REQ-001 | Requirements Definition | v2.10 | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` |
| SKM-DBS-001 | Database Design Specification | v2.4 | `docs/core-work/データベース設計書_DATABASE_SPEC.md` |
| SKM-DEV-001 | Development Rules | v2.1 | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` |

---

*End of Functional Specification (Advertisement Management)*
