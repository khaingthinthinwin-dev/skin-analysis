# Functional Specification (機能設計書) — Advertisement Management

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-FDS-AD-001 |
| **Target Screen** | Advertisement Management (広告管理) |
| **Subsystem** | Advertisement — Shop Advertisement Management |
| **Function ID** | FN-AD-001 |
| **Version** | 2.6 |
| **Created** | 2026-08-05 |
| **Last Updated** | 2026-08-26 |
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
| 2.2 | 2026-08-25 | Software Architect | Aligned advertisement process with REQ v2.11 §4.4: restored merchant ad creation flow as 6-step process — **Select Package → Upload Content (image + content) → Pay Fee → Admin Review → Approved → Displayed**. Package selection now creates a draft ad (no payment yet); merchant uploads ad content (`title`, `content`, `image_url`, `link_url`, `announcement_message`) in a separate step; payment is a separate step that moves the ad to `PENDING_APPROVAL`. Restored merchant CRUD on own advertisements (edit content, toggle active/inactive, delete/soft-deactivate). Restored ad resubmission after rejection (edit + resubmit). State machine updated with `DRAFT` and `CONTENT_UPLOADED` states; approval flow supports resubmission cycle. Updated all use cases, business rules, screen specifications, functional operations, input/output specs, validation rules, error handling, permissions, notifications, and traceability accordingly. |
| 2.6 | 2026-08-26 | Software Architect | Aligned with DATABASE_SPEC v2.5 & DEVELOPMENT_RULES v2.1: corrected `payment_status` enum to `pending/completed/refunded` (removed `failed` — not in DB check constraint); corrected `approvalStatus` filter/validation to `pending/approved/rejected` only (removed application-level `draft`/`content_uploaded` from DB query layer); fixed backend module path from `review-management` to `advertisement-management` per DEVELOPMENT_RULES §2.1. |

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

This subsystem manages the complete lifecycle of shop advertisements within the Cosmetics Finder marketplace. The advertisement process follows a 6-step flow: **1 · Select Package → 2 · Upload Content (image + content) → 3 · Pay Fee → 4 · Admin Review → 5 · Approved → 6 · Displayed**. Merchants browse Admin-created advertisement packages, select a package to create a draft advertisement, upload their own ad content (title, content, image, announcement message), pay the advertising fee, and submit the ad for Admin review. Admins approve or reject advertisements with a reason (auto-refund on rejection), and only paid, approved, in-schedule advertisements are exposed to the storefront for platform-wide display (banner/image + announcement message). Rejected ads can be edited and resubmitted by the merchant.

The Advertisement Management subsystem connects merchant promotional intent with buyer visibility through an Admin-controlled package model. Advertisement packages are defined in `ad_fee_settings` by Admin, where each package defines the placement, tier, daily rate, and display duration (`duration_days`); the fee is calculated as `daily_rate × duration_days`. When a merchant selects a package, a draft advertisement record is created with `approval_status = pending` and `payment_status = pending`. The merchant then uploads ad content (image + text), and upon payment the ad enters `PENDING_APPROVAL` for admin review. Active, in-schedule, approved advertisements are served to the public storefront through a cacheable endpoint, ensuring consistent banner rendering. A weekly limit of 5 active advertisements is enforced platform-wide. The storefront slider displays at most 5 advertisements per rotation, ordered by tier priority (Premium > Standard > Basic) with round-robin rotation within the same tier and automatic rotation every 5 seconds.

### 1.2 Functional Responsibilities

This subsystem is responsible for the following core functional areas:

1. **Package Management (Admin-Only)** — Admins create, update, and deactivate advertisement packages (placement × tier) in `ad_fee_settings`. Merchants cannot create, edit, or deactivate packages.
2. **Package Selection (Merchant)** — Merchants browse the Admin-created package catalog (`GET /ads/packages`) and select a package. Selection creates a draft advertisement record linked to the merchant's shop. No payment occurs at this stage.
3. **Ad Content Upload (Merchant)** — After selecting a package, the merchant uploads ad content: `title`, `content` (text description), `image_url` (banner image), `link_url` (click-through link), and `announcement_message`. This moves the ad from `DRAFT` to `CONTENT_UPLOADED`.
4. **Advertising Fee Payment (Merchant)** — The advertising fee is charged as a separate step after content upload. Fee = package `daily_rate × duration_days`. Payment moves the ad to `PENDING_APPROVAL`. Payment transaction is recorded in `ad_payments` with amount, status, and reference.
5. **Advertisement Management (Merchant)** — Merchants can view, edit content, toggle active/inactive, and soft-delete (deactivate) their own advertisements. Merchants can also resubmit rejected ads after editing.
6. **Admin Approval Workflow** — After payment, the ad enters `PENDING_APPROVAL`; admin approves or rejects with reason. Rejected ads trigger automatic refund; merchants may edit and resubmit.
7. **Weekly Ad Limit** — A maximum of 5 active advertisements per week is enforced platform-wide (Monday 00:00 to Sunday 23:59 UTC), validated before an ad is approved for display.
8. **Package-Defined Duration** — Display duration is fixed by the selected package's `duration_days` (catalog spans 7–30 days across placements); validated at selection time via rate resolution.
9. **Ad Fee Settings Management** — Admins manage the full package catalog in `ad_fee_settings`: create new packages, update daily rates, and deactivate packages; every rate change is logged in `ad_fee_history` and applies only to subsequently selected packages.
10. **Status Control** — Merchant-visible lifecycle (active/expired) is derived from `is_active`, `approval_status`, `payment_status`, and the schedule; merchants can toggle `is_active` directly.
11. **Soft Retention** — Advertisement records are retained for history; merchant delete sets `is_active = false`. Admins may deactivate packages so they no longer appear in the catalog.
12. **Platform Display** — Paid, approved, active, in-schedule advertisements are exposed via a public endpoint for storefront banner and announcement message rendering. The storefront slider shows at most 5 ads per rotation cycle, ordered Premium > Standard > Basic with round-robin within the same tier, auto-rotating every 5 seconds; expired/rejected ads are excluded automatically.
13. **Cache Management** — Active ads are cached in Redis with a 5-minute TTL; cache is invalidated on any mutation (content upload, payment, admin approval/rejection, merchant edit/toggle/delete, admin package changes).
14. **Audit Logging** — All package mutations, selections/payments, content uploads, and approval actions are logged for audit (merchant-side events: 90-day retention; admin approval/rejection/fee-change events: 2 years per Development Rules §6.4).

### 1.3 Target Users

| Attribute | Value |
|-----------|-------|
| **Primary Actor (Merchant)** | Authenticated merchant browsing Admin-created packages, selecting packages, uploading ad content, paying fees, managing own advertisements, and resubmitting rejected ads |
| **Primary Actor (Admin)** | Admin creating/managing advertisement packages and approving/rejecting purchased advertisements |
| **Primary Actor (Buyer)** | Authenticated or unauthenticated visitor viewing platform banners |
| **Required Authentication** | JWT Bearer Token for merchant and admin operations; Public for active ad display |
| **Data Scope** | Merchant: own shop's ads only. Buyer: all active ads (public). Admin: all ads. |

### 1.4 Relationships with Other Functions and Peripheral Systems

```text
┌──────────────────────────┐      ┌─────────────────────────────────────┐
│   Merchant Actor         │      │     advertisements                  │
│   (Selects Packages,     ├─────►│  Created on package selection       │
│   Uploads Content,       │      │  Content uploaded by merchant       │
│   Pays Fee, Manages)     │      │  Payment recorded separately        │
└──────────────────────────┘      └──────────────┬────────────────────┘
                                                  │ Reads / Writes
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
               │   check)         │   │  cache:ads:packages│   │  AD_CONTENT_     │
               └──────────────────┘   │  (TTL 5/10 min)    │   │  UPLOADED /      │
                                      └────────────────────┘   │  AD_PAID /       │
                                                               │  AD_APPROVED /   │
                          ┌────────────────────────────┐      │  AD_REJECTED /   │
                          │  Admin Actor               │      │  AD_FEE_UPDATED  │
                          │  (Manage Package Ads,      │      └──────────────────┘
                          │   Approve / Reject Ads)    ├─────►┌──────────────────┐
                          └─────────────┬──────────────┘      │  ad_fee_settings │
                                        │ approve/reject with reason
                                        ▼                      │  (Package CRUD)  │
                             ┌──────────────────────┐         └──────────────────┘
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
| `feeSettingId` | Path Parameter | Advertisement package (placement × tier) selected from the Admin-created catalog |
| `title` | Merchant Input | Advertisement title (1–200 chars) — uploaded by merchant after package selection |
| `content` | Merchant Input | Advertisement content/description — uploaded by merchant after package selection |
| `imageUrl` | Merchant Input | Advertisement banner image URL — uploaded by merchant after package selection |
| `linkUrl` | Merchant Input | Click-through link URL (optional) — uploaded by merchant after package selection |
| `announcementMessage` | Merchant Input | Banner announcement message (max 500 chars) — uploaded by merchant after package selection |
| `paymentReference` | System / User Input | Payment transaction reference for ad fee (recorded at payment step) |
| `placement` | Admin Input | Package placement (`homepage_slider`, `product_sidebar`, `category_banner`, `search_top`) at package creation |
| `tier` | Admin Input | Package pricing tier (`basic`, `standard`, `premium`) at package creation |
| `daily_rate` | Admin Input | Daily rate for a package (creation/update) |
| `duration_days` / `max_ads` | Admin Input | Display duration and slot capacity at package creation |
| `reason` | Admin Input | Rejection reason for moderation |
| `page` / `limit` / `status` / `approvalStatus` | Query Parameter | Pagination and status filter for list view |
| `id` | Path Parameter | Advertisement ID (UUID, merchant edit/approve/reject) or fee setting ID (admin package update/deactivate) |

> **v2.5 change:** Merchants now provide advertisement content fields (`title`, `content`, `imageUrl`, `linkUrl`, `announcementMessage`) in the Upload Content step (§6.2). These are no longer Admin-defined at package level.

| Output Information | Data Category | Destination / Description |
|--------------------|---------------|---------------------------|
| `advertisement` | Advertisement DTO | Full advertisement data (including approval/payment/content fields) |
| `advertisements` | Advertisement[] DTO | Paginated advertisement list (merchant: own shop ads; admin: all ads) |
| `meta` | Pagination Meta | Page, limit, total, totalPages |
| `packages` | AdFeeSetting[] DTO | Available advertisement packages (placement × tier × rate × duration × max ads) created by Admin for merchant browsing/selection |
| `activeAds` | Advertisement[] DTO | Active in-schedule approved ads for platform display (slider rotation) |
| `pendingApprovalAds` | Advertisement[] DTO | Ads awaiting admin approval/rejection |
| `feeSettings` | AdFeeSetting[] DTO | All advertisement package fee settings (admin management) |

### 1.6 Related Documents

| No. | Document ID | Document Name | File Path / Reference | Remarks |
|-----|-------------|---------------|----------------------|---------|
| 1 | SKM-REQ-001 | Requirements Definition (v2.11) | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | §4.4 Advertisements (merchant: View Packages, Purchase Ad with Upload Content, Submit for Approval, Resubmit Rejected), §5.3 Advertisement Management (admin), §7.6 Business Rules — Advertisements, §2.2 Permission Matrix. |
| 2 | SKM-DBS-001 | Database Design Specification (v2.5) | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | `advertisements` (§3.13), `ad_fee_settings` (§3.14), `ad_payments` (§3.15), `ad_fee_history` (§3.16), `merchants`, `shops` tables, UUID PKs, indexes, check constraints |
| 3 | SKM-DEV-001 | Development Rules (v2.1) | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | Advertisement Rules (12.7), naming conventions, RBAC, REST conventions (8.1: PATCH for partial updates), audit retention (6.4) |
---

## 2. Use Cases and Business Workflow

### 2.1 Use Case Catalog

| UC-ID | Use Case Name | Precondition | Postcondition | Triggering Actor |
|-------|---------------|--------------|---------------|------------------|
| UC-AD-001 | Select Advertisement Package | Merchant is authenticated and has an approved shop. An active package exists in the Admin-created catalog. | Advertisement record auto-created system-side linked to merchant's shop with selected package, `approval_status = pending`, `payment_status = pending`, `starts_at` = NULL, `expires_at` = NULL. Merchant proceeds to Upload Content. | Merchant |
| UC-AD-002 | Set Advertisement Schedule | Merchant has selected a package (ad is in `PENDING` state with no content). | Merchant sets `starts_at`; `expires_at` is derived as `starts_at + package duration_days`. Schedule validated before payment. | Merchant |
| UC-AD-003 | Upload Ad Content | Merchant has selected a package (ad is in `PENDING` state). | Merchant uploads `title`, `content`, `image_url`, `link_url`, `announcement_message`. Content fields updated; ad remains in `PENDING` state with `payment_status = pending`. | Merchant |
| UC-AD-004 | Manage Own Advertisements | Merchant is authenticated. | Merchants can view, edit content, toggle active/inactive, and soft-delete their own advertisements in a list view. | Merchant |
| UC-AD-005 | Update Advertisement | Merchant has an existing advertisement (any state except `APPROVED`+`ACTIVE`). | Merchant can edit `title`, `content`, `image_url`, `link_url`, `announcement_message`. Changes saved to ad. | Merchant |
| UC-AD-006 | Delete Advertisement (Soft) | Merchant has an existing advertisement. | Advertisement soft-deleted (`is_active = false`); hidden from buyer display and merchant active list. Record retained for history. | Merchant |
| UC-AD-007 | Toggle Advertisement Active/Inactive | Merchant has an approved, paid advertisement. | Merchant toggles `is_active` to control buyer visibility. | Merchant |
| UC-AD-008 | Display Active Advertisements | None (public). | Paid, approved, active, in-schedule advertisements returned for storefront display; slider shows max 5 per rotation per merchant, priority Premium > Standard > Basic, round-robin within tier, auto-rotation every 5 seconds. | Buyer/Visitor |
| UC-AD-009 | Pay Advertising Fee | Advertisement is in `PENDING` state with content uploaded and schedule set. | Fee (`daily_rate × duration_days`) recorded in `ad_payments`; advertisement `payment_status = completed`; `approval_status` remains `pending`; ad awaits admin review. | Merchant |
| UC-AD-010 | Submit Advertisement for Approval | Advertisement is paid (`payment_status = completed`). | Advertisement remains in `approval_status = pending` (no separate submit action; payment completion makes ad visible in admin queue). | System |
| UC-AD-011 | Approve Advertisement | Admin is authenticated. Ad is pending approval and paid. | Weekly limit validated (per merchant); ad `approval_status = approved`; `approved_by`/`approved_at` set; cache invalidated. | Admin |
| UC-AD-012 | Reject Advertisement | Admin is authenticated. Ad is pending approval. | Ad `approval_status = rejected`; `rejection_reason` stored; payment refunded automatically (`ad_payments` refund fields + `payment_status = refunded`). Merchant may edit and resubmit. | Admin |
| UC-AD-013 | Resubmit Rejected Advertisement | Advertisement is in `REJECTED` state. | Merchant edits content and resubmits; ad moves back to `PENDING` state with updated content and fresh payment. | Merchant |
| UC-AD-014 | Browse Advertisement Packages | Merchant is authenticated. | Admin-created packages (placement × tier × daily rate × duration × max ads) from `ad_fee_settings` displayed for selection. | Merchant |
| UC-AD-015 | Manage Ad Packages | Admin is authenticated. | Full package lifecycle management: create new packages, update daily rates, deactivate packages; rate changes logged in `ad_fee_history`. **Only Admin can CRUD packages.** | Admin |

### 2.2 Primary Business Workflow — Merchant Advertisement Lifecycle

> **Note:** DATABASE_SPEC v2.5 constrains `approval_status` to `pending/approved/rejected`. Application tracks content upload status via content fields and payment status via `payment_status`.

```
                    ┌──────────────────────┐
                    │  Merchant Logs In    │
                    │  (JWT Authenticated) │
                    └──────────┬───────────┘
                               │
                               ▼
              ┌────────────────────────────────┐
              │  License Status Check          │
              └───────────┬────────┬───────────┘
                          │        │
              pending/reject│       │approved
                          ▼        ▼
              ┌────────────────┐ ┌─────────────────────────┐
              │  Status =      │ │  Status =               │
              │  pending       │ │  approved               │
              │  → Dashboard   │ │  → Full Dashboard       │
              │  with          │ │    Access               │
              │  Restricted    │ │                         │
              │  Ops           │ │  /merchant/advertisements│
              │  → Pending     │ │  (Full CRUD)            │
              │  Banner        │ │                         │
              └────────────────┘ └─────────────┬───────────┘
                                               │
                                               ▼
                             ┌──────────────────────────┐
                             │  Browse Package Catalog  │
                             │  (Admin-created packages)│
                             │  (UC-AD-014)             │
                             └────────────┬─────────────┘
                                          │
                                          ▼
                             ┌──────────────────────────┐
                             │ Select Package           │
                             │ (UC-AD-001, creates      │
                             │  ad with approval_status │
                             │  = pending, payment_     │
                             │  status = pending)       │
                             └────────────┬─────────────┘
                                          │
                                          ▼
                             ┌──────────────────────────┐
                             │ Upload Content            │
                             │ (UC-AD-003: title,        │
                             │  content, image, link,    │
                             │  announcement message)    │
                             │ → Content fields updated  │
                             │   (approval_status still  │
                             │    pending)               │
                             └────────────┬─────────────┘
                                          │
                                          ▼
                             ┌──────────────────────────┐
                             │ Pay Fee                   │
                             │ (UC-AD-009: daily_rate ×  │
                             │  duration_days)           │
                             │ → payment_status =        │
                             │   completed               │
                             │ → approval_status still   │
                             │   pending                 │
                             └────────────┬─────────────┘
                                          │
                                          ▼
                             ┌─────────────────┐      ┌─────────────────┐
                             │ PENDING         │─────►│ Admin           │
                             │ (paid, awaiting │      │ Approve /       │
                             │  admin review)  │      │ Reject          │
                             └────────┬────────┘      │ (UC-AD-011/012)│
                                      │               └────────┬────────┘
                                      │                        │
                                      │                 ┌──────┴──────┐
                            approved  │                 │  rejected   │
                            ┌─────────▼────────┐        ▼             │
                            │ APPROVED (paid)  │  ┌─────────────────┐│
                            │ Weekly limit     │  │ REJECTED +     ││
                            │ validated (5/wk  │  │ refund (auto)  ││
                            │ per merchant)    │  │ Edit + Resubmit││
                            │ → displayable    │  └─────────────────┘│
                            └─────────┬────────┘                       │
                                      │                       (merchant edits
                                      ▼                        and resubmits)
                             ┌─────────────────┐
                             │ ACTIVE in       │
                             │ schedule window │
                             │ (toggleable)    │
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
| 2 | Merchant browses Admin-created package catalog | — | Catalog Displayed | System |
| 3 | Merchant clicks "Select" on a package | — | `approval_status = pending`, `payment_status = pending` | Merchant |
| 4 | Merchant uploads content (title, content, image, link, announcement) | `draft` | `content_uploaded` | Merchant |
| 5 | Merchant sets schedule (`starts_at`; `expires_at` derived) | `content_uploaded` | Schedule set | Merchant |
| 6 | Merchant clicks "Pay Fee" → system charges `daily_rate × duration_days` | `content_uploaded` | `payment_status = completed`, `approval_status = pending`, `starts_at` set, `expires_at = starts_at + package duration_days`, `week_number` derived | System |
| 7 | Transaction recorded in `ad_payments` (amount, reference) | — | Ledger Entry Created | System |
| 8 | Ad enters approval queue automatically | `payment_status = completed` | `approval_status = pending` | System |
| 9 | Admin reviews pending ad | `approval_status = pending` | — | Admin |
| 10a | Admin approves ad (weekly limit validated ≤ 5) | `approval_status = pending` | `approval_status = approved`, `approved_by`/`approved_at` set | Admin |
| 10b | Admin rejects ad with reason | `approval_status = pending` | `approval_status = rejected`, `payment_status = refunded` (auto-refund) | Admin |
| 11 | Ad appears in merchant list with approval badge | — | — | System |
| 12 | Active ads cache invalidated | — | Cache Cleared | System |
| 13 | Buyer loads storefront | Public | — | Buyer |
| 14 | GET /ads/active returns approved, in-schedule active ads | — | Banners Served | System |
| 15 | Buyer clicks banner | — | Redirected to Link URL | System |

### 2.5 Relevant Requirements Covered

| Requirement ID | Requirement Summary | REQ v2.11 Source | Coverage Status |
|-----------------|---------------------|------------------|-----------------|
| M-AD-001 | Merchant can create shop advertisements | §4.4 (Purchase Ad) | Covered — merchants select a package to create an ad (UC-AD-001), then upload content (UC-AD-003) |
| M-AD-002 | Merchant can set ad schedule (start date; end derived from package) | §4.4 (Purchase Ad), §7.6 | Covered — merchant sets `starts_at`; `expires_at` derived as `starts_at + package duration_days` (UC-AD-002) |
| M-AD-003 | Merchant can upload ad images | §4.4 (Purchase Ad) | Covered — merchant uploads `title`, `content`, `image_url`, `link_url`, `announcement_message` in UC-AD-003 |
| M-AD-004 | Merchant can view/manage own ads | §4.4 | Covered — full management (view, edit, toggle, delete) in UC-AD-004 |
| M-AD-005 | Active ads display on platform | §4.4, §5.3 Display Rules | Covered |
| M-AD-006 | Admin can approve/reject advertisements | §5.3 (Review Ads), §2.2 Permission Matrix | Covered |
| M-AD-007 | Merchants must pay advertising fee before submission | §4.4, §7.6 | Covered — payment is a separate step (UC-AD-009) after content upload |
| M-AD-008 | Maximum 5 active advertisements per week | §7.6 | Covered |
| M-AD-009 | Advertisements display with banner/image and announcement message | §4.4, §5.3 Display Rules | Covered — merchant-provided content displayed |
| M-AD-010 | Ad states: draft → pending_payment → pending_approval → approved → active → expired | §4.4, §7.6 | Revised in v2.5 — flow: selected(draft) → content_uploaded → paid(pending_approval) → approved → active → expired |
| M-AD-011 | Rejected ads auto-refund payment to merchant | §7.6 | Covered |
| M-AD-012 | Per merchant: maximum 2 active ads simultaneously | — | **Not defined in REQ v2.11** — rule dropped from this specification |
| M-AD-013 | Minimum ad duration: 7 days | §5.3 Package Fields (`duration_days`) | Superseded — duration fixed per package; catalog minimum is 7 days |
| M-AD-014 | Maximum ad duration: 30 days | §5.3 Package Fields (`duration_days`) | Superseded — duration fixed per package; catalog maximum is 30 days |
| — | Merchant browses available advertisement packages created by Admin and selects one | §4.4 (View Packages) | Covered (UC-AD-014, UC-AD-001) |
| — | Merchant uploads ad content (image + text) after package selection | §4.4 (Upload Content) | Covered (UC-AD-003) |
| — | Merchant views ad performance analytics (impressions/clicks/CTR) | §4.4 (View Analytics) | **Out of scope** — no analytics counters exist in DATABASE_SPEC v2.5 schema; deferred until schema extension |
| — | Admin manages packages / sets pricing / views package history | §5.3 (Manage Packages, Set Pricing, Package History) | Covered (UC-AD-015, Sec 5.3.2, Sec 6.12~6.14) — full Admin CRUD on packages |
| — | Multiple merchants may purchase the same package | §5.3 Display Rules | Covered (BR-AD-053) |
| — | Merchant can resubmit rejected ads | §4.4 (Resubmit Rejected Ads) | Covered (UC-AD-013) |

---

## 3. State Transition Specification

### 3.1 Advertisement Display States

> **Note:** DATABASE_SPEC v2.5 constrains `approval_status` to `pending/approved/rejected`. Application tracks content upload status via content fields (title, announcement_message) and payment status via `payment_status`.

| State | Description | Visible to Buyers | Can Edit | Can Delete |
|-------|-------------|:-----------------:|:--------:|:----------:|
| `PENDING` (No Content) | Package selected; content not yet uploaded; `payment_status = pending` | ✗ | ✓ | ✓ |
| `PENDING` (Content Uploaded) | Content uploaded; `payment_status = pending` | ✗ | ✓ | ✓ |
| `PENDING` (Paid) | Content uploaded; `payment_status = completed`; awaiting admin review | ✗ | ✗ | ✗ |
| `APPROVED` | `approval_status = approved`, `payment_status = completed` | depends on schedule + `is_active` | ✗ | ✗ |
| `REJECTED` | `approval_status = rejected` (refund processed) | ✗ | ✓ (resubmit) | ✓ |
| `SCHEDULED` | approved, `is_active = true` and `starts_at > now` | ✗ | ✓ (toggle) | ✓ |
| `ACTIVE` | approved, `is_active = true`, `starts_at <= now <= expires_at` | ✓ | ✓ (toggle) | ✓ |
| `INACTIVE` | `is_active = false` (merchant-controlled hidden state) | ✗ | ✓ (toggle) | ✓ |
| `EXPIRED` | `expires_at < now` | ✗ | ✗ | ✗ |

> **Ad States Flow (M-AD-010, revised to match DATABASE_SPEC v2.5):** `pending(no content) → pending(content uploaded) → pending(paid) → approved → active → expired`
> Rejected ads at approval stage → refund fee automatically → merchant may edit and resubmit → back to `pending`

### 3.2 Approval Status States (`approval_status`)

> **Note:** DATABASE_SPEC v2.5 constrains `approval_status` to `pending/approved/rejected` only. The `draft` and `content_uploaded` states are application-level concepts managed via `payment_status` and content fields.

| State | DB Value | Description | Transition Allowed |
|-------|----------|-------------|-------------------|
| `PENDING` | `'pending'` | Ad created (package selected), awaiting content upload, payment, and admin review | → `approved`, `rejected` |
| `APPROVED` | `'approved'` | Admin approved; displayable if paid, active, in-schedule | → (reject not allowed after approval) |
| `REJECTED` | `'rejected'` | Admin rejected with reason; refund auto-processed; merchant may resubmit | → `pending` (on resubmission after edit + payment) |

### 3.3 Payment Status States (`payment_status`)

> **Note:** DATABASE_SPEC v2.5 constrains `payment_status` to `pending/completed/refunded` only.

| State | DB Value | Description | Transition Allowed |
|-------|----------|-------------|-------------------|
| `PENDING` | `'pending'` | Advertising fee not yet paid | → `completed` |
| `COMPLETED` | `'completed'` | Fee paid and verified; required before admin approval | → `refunded` |
| `REFUNDED` | `'refunded'` | Auto-refunded on rejection | → `pending` (on resubmission) |

### 3.4 Advertisement Lifecycle Transitions

> **Note:** DATABASE_SPEC v2.5 constrains `approval_status` to `pending/approved/rejected`. Application tracks content upload status via content fields and payment status via `payment_status`.

| Transition ID | Origin State | Target State | Trigger Action | Guard Conditions |
|---------------|--------------|--------------|----------------|------------------|
| TR-AD-01 | — | `PENDING` (no content) | Merchant selects an Admin-created package | Valid package (`ad_fee_settings` active), shop approved; `approval_status = pending`, `payment_status = pending`, `starts_at` = NULL, `expires_at` = NULL |
| TR-AD-02 | `PENDING` (no content) | `PENDING` (content uploaded) | Merchant uploads content (title, content, image, announcement) | Content fields validated; `starts_at` set by merchant; `expires_at` derived |
| TR-AD-03 | `PENDING` (content uploaded) | `PENDING` (paid) | Merchant pays fee | Valid schedule (`expires_at = starts_at + duration_days`), payment succeeds; `payment_status = completed`, `week_number` derived |
| TR-AD-04 | `PENDING` (paid) | `APPROVED` | Admin approves | Weekly limit ≤ 5 per merchant for target week |
| TR-AD-05 | `PENDING` (paid) | `REJECTED` | Admin rejects with reason | Reason required; refund auto-processed |
| TR-AD-06 | `REJECTED` | `PENDING` | Merchant edits and resubmits (pays fresh fee) | Content updated; payment succeeds |
| TR-AD-07 | `APPROVED` | `SCHEDULED` | Start time not yet reached | System time check |
| TR-AD-08 | `SCHEDULED` | `ACTIVE` | Start time reached | System time check |
| TR-AD-09 | `ACTIVE` | `EXPIRED` | End time passed | System time check |
| TR-AD-10 | `ACTIVE` / `SCHEDULED` | `INACTIVE` | Merchant toggles active off | Merchant owns ad |
| TR-AD-11 | `INACTIVE` | `ACTIVE` / `SCHEDULED` | Merchant toggles active on | Merchant owns ad, within schedule |
| TR-AD-12 | `PENDING` / `INACTIVE` | (deleted) | Merchant soft-deletes ad | `is_active = false`; record retained |
| TR-AD-13 | `EXPIRED` | — | — | Terminal; merchant selects a new package to run again |

### 3.5 Cache States (Redis `cache:ads:active`)

| State | Description | TTL | Behavior |
|-------|-------------|:---:|----------|
| `CACHE_COLD` | No cached active ad list | — | Query DB (approved, paid, active, in-schedule), seed cache (5 min TTL) |
| `CACHE_WARM` | Cached active ad list available | 5 min | Serve cached response |
| `CACHE_INVALIDATED` | Mutation performed (create/update/delete/content upload/payment/approve/reject) | — | `DEL cache:ads:active`, next request re-queries |

---

## 4. Business Rules

### 4.1 Package Selection / Ad Creation Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AD-001 | Required Fields | Ad must have: `title`, `announcementMessage`, `startsAt`. `content`, `imageUrl`, `linkUrl` are optional. All provided by merchant after package selection. | Backend (RBAC + service logic + DTO validation) |
| BR-AD-002 | Title Length | Title must be 1–200 characters. | Backend (DTO validation) |
| BR-AD-003 | Date Range | `expiresAt` must be strictly after `startsAt`. | Backend (DB constraint `chk_advertisements_dates`) |
| BR-AD-004 | Shop Approval | Merchant must have an approved shop (`is_approved = true`) before selecting a package. | Backend (service check) |
| BR-AD-005 | Default Status | Ads auto-created by package selection default to `is_active = true`, `approval_status = pending`, `payment_status = pending`. | Backend (service logic + DB defaults) |
| BR-AD-006 | Image Optional | Ads can be text-only or with image. Image max 5MB, allowed types: JPG, PNG, WebP. | Backend (file upload validation) |
| BR-AD-007 | Link Optional | Click-through link URL is optional. | Backend (DTO validation) |
| BR-AD-024 | Announcement Message Required | `announcement_message` is required and displayed on the banner. Max 500 chars. | Backend (DTO validation) + DB (NOT NULL on advertisements) |

### 4.2 Advertisement Schedule Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AD-008 | Schedule Required | Both `startsAt` and `expiresAt` are required before payment. `startsAt` set by merchant; `expiresAt` derived as `starts_at + package duration_days`. | Backend (service logic) |
| BR-AD-009 | Schedule Validity | `expires_at` > `starts_at` enforced by DB check constraint. | Backend (DB constraint `chk_advertisements_dates`) |
| BR-AD-010 | Active Window | An ad is active when `is_active = true` AND `approval_status = approved` AND `payment_status = completed` AND `starts_at <= now` AND `expires_at >= now`. | Backend (query filter) |
| BR-AD-025 | Week Number | `week_number` (ISO week) is derived from `starts_at` and stored for weekly limit tracking. | Backend (service logic) |

### 4.3 Advertisement Status Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AD-011 | Active Visibility | Only approved, paid, in-schedule active ads are served to buyers. | Backend (query filter) |
| BR-AD-012 | Record Retention | Soft delete sets `is_active = false`. Records are retained for history. | Backend (service logic) |
| BR-AD-013 | Expired Visibility | Expired ads hidden from buyers, visible to merchant (read-only). | Backend (role-based query) |
| BR-AD-014 | Derived Status | Display status (active/expired) derived client-side from `is_active`, `approval_status`, `payment_status`, and schedule. Merchant can influence via `is_active` toggle. | Frontend (display logic) |
| BR-AD-026 | Approval Status Enum | `approval_status` restricted to `pending/approved/rejected` via DB check constraint. Application tracks content upload status via content fields and payment status via `payment_status`. | Backend (DB constraint) |
| BR-AD-027 | Payment Status Enum | `payment_status` restricted to `pending/completed/refunded` via DB check constraint. | Backend (DB constraint) |

### 4.4 Image / Content Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AD-015 | File Size | Maximum 5MB per ad image. | Backend (file upload validation) |
| BR-AD-016 | File Types | Allowed: JPG, PNG, WebP. | Backend (MIME type validation) |
| BR-AD-017 | File Naming | UUID-based filenames `{uuid}.{ext}`. | Backend (upload service) |
| BR-AD-018 | Storage | Stored outside webroot, served via signed URLs or API endpoint. | Backend (upload service) |

### 4.5 Ownership Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AD-019 | Merchant Ownership | Ads belong to a shop; the shop's merchant can view, edit content, toggle, and soft-delete their own advertisements. | Backend (service check + RBAC) |
| BR-AD-020 | Admin Override | Admins can manage all advertisements (approve/reject) and own the full package catalog lifecycle (create/update/deactivate). | Backend (RBAC) |
| BR-AD-021 | Buyer Read-Only | Buyers can only view approved active ads via the public endpoint. | Backend (RBAC) |

### 4.6 Approval Workflow Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AD-028 | Approval Required | All advertisements require admin approval before display. | Backend (service logic) |
| BR-AD-029 | Submission Requires Payment | Ads enter `PENDING_APPROVAL` only with `payment_status = completed`; guaranteed by the payment step (UC-AD-009). | Backend (service logic) |
| BR-AD-030 | Approve/Reject with Reason | Admin approves or rejects; rejection requires `rejection_reason` and sets `approved_by`/`approved_at`. | Backend (service logic + DTO validation) |
| BR-AD-031 | Rejection Refund | Rejected ads trigger automatic refund; `payment_status` set to `refunded`. | Backend (payment service) |
| BR-AD-032 | Resubmission Allowed | Rejected ads can be edited and resubmitted by the merchant. Resubmission requires fresh payment. | Backend (service logic) |

### 4.7 Payment Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AD-033 | Payment After Content | The advertising fee is charged after content upload (UC-AD-009), not at selection. An ad must have content before payment. | Backend (service logic) |
| BR-AD-034 | Package-Based Fee Calculation | Advertising fee = `daily_rate × duration_days`, resolved from the selected Admin-created package (`placement` × `tier`) in `ad_fee_settings`. Seeded placements: `homepage_slider` (7 days), `product_sidebar` (15 days), `category_banner` (30 days), `search_top` (7 days); tiers: `basic`, `standard`, `premium`. | Backend (ad_fee_settings query) |
| BR-AD-035 | Payment Record & Ledger | Payment details recorded in `ad_payments` ledger table with `ad_id`, `merchant_id` (referencing `merchants.id`), `amount`, `payment_method`, `payment_status`, and `transaction_id`. | Backend (payment service) |
| BR-AD-036 | Payment Verification | Payment must be verified (`payment_status = completed`) before the ad is queued for approval. | Backend (service logic) |
| BR-AD-037 | Fee Modification Audit | Rate changes by admins apply only to packages selected after the change and are logged in `ad_fee_history`. | Backend (audit logic) |

### 4.8 Weekly Ad Limit Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AD-046 | Weekly Limit | Maximum 5 active advertisements per week **per merchant**. | Backend (service logic, query on `week_number` + `shop_id`) |
| BR-AD-047 | Week Definition | Week runs Monday 00:00 to Sunday 23:59 (UTC); ISO week number used. | Backend (date utility) |
| BR-AD-048 | Limit Validation Timing | Limit validated before approving an ad for display (approval time). | Backend (service logic) |
| BR-AD-049 | Limit Exceeded Response | Approval blocked with `409 Conflict` and clear message when limit reached. | Backend (service logic) |

### 4.9 Package & Duration Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AD-050 | Package Selection Required | Merchant must select an active package (`placement` × `tier`) from the Admin-created `ad_fee_settings` catalog; invalid or inactive combinations are rejected at selection. | Backend (service logic + DTO validation) + Frontend (package picker) |
| BR-AD-051 | Package-Defined Duration | `expires_at` is derived server-side as `starts_at + duration_days`; merchant sets only `starts_at`. The catalog spans 7–30 days across placements. | Backend (service logic) |
| BR-AD-052 | Rate Snapshot | `payment_amount` records the fee at payment time; subsequent rate changes in `ad_fee_settings` do not affect already-paid advertisements. | Backend (payment service) |
| BR-AD-053 | Shared Package Capacity | Multiple merchants may select the same package. Per-placement concurrent capacity is governed by `max_ads` in `ad_fee_settings` (enforced once placement persistence is available — see §4.11 Design Note). | Backend (service logic, deferred) |

### 4.10 Cache Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AD-022 | Cache Key | Approved active ads cached under `cache:ads:active` with 5-minute TTL. | Backend (Redis cache) |
| BR-AD-023 | Cache Invalidation | Any mutation (package selection, content upload, payment, approve/reject, merchant edit/toggle/delete, admin package create/update/deactivate) invalidates the active ads cache and/or package catalog cache. | Backend (service logic) |

### 4.11 Platform Display Rules (REQ v2.11 §5.3)

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AD-054 | Slider Rotation Cap | The storefront advertisement slider displays at most 5 advertisements per rotation cycle. | Frontend (slider component) |
| BR-AD-055 | Tier Priority Order | Advertisements are ordered by tier priority: Premium > Standard > Basic. | Backend (ordering) / Frontend (fallback) |
| BR-AD-056 | Round-Robin Within Tier | Advertisements within the same priority tier rotate evenly (round-robin) across rotation cycles. | Frontend (rotation logic) |
| BR-AD-057 | Auto-Rotation Interval | The slider auto-rotates every 5 seconds. | Frontend (timer) |
| BR-AD-058 | Automatic Exclusion | Expired, inactive, rejected, and unpaid advertisements are excluded from display automatically by the active-ads query filter. | Backend (query filter) |

> **Design Note — Placement/Tier Persistence Gap:** DATABASE_SPEC v2.5's `advertisements` table does not persist `placement` or `tier` (the purchased package). Placement and tier are captured from the selected package at selection time and used for fee resolution (`daily_rate × duration_days`) and the `payment_amount` snapshot, but cannot be queried for display ordering or per-placement capacity checks (`max_ads`). **Recommended follow-up:** schema migration to persist the purchased package (e.g., nullable `placement`/`tier` columns or an `ad_fee_setting_id` FK on `advertisements`) so BR-AD-055 ordering and BR-AD-053 capacity enforcement can be implemented server-side. Until then, `GET /ads/active` returns ads ordered by `created_at DESC` and tier-based prioritization is applied client-side only when package context is available.

---

## 5. Screen Specifications

### 5.1 Screen: Advertisement Management (`/merchant/advertisements`)

**Purpose:** Let merchants browse the Admin-created advertisement package catalog, select packages, upload ad content, pay fees, and manage their own advertisements (view, edit, toggle, delete).

#### 5.1.1 UI Elements

**Header & Summary:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-01 | Page Title | Heading (h5) | `merchant.ads.title` | Yes | "Advertisements" |
| EL-02 | Page Subtitle | Text | `merchant.ads.subtitle` | No | "Select an advertising package, upload your content, and manage your advertisements." |
| EL-03a | Package Catalog Section | Section/Grid | `merchant.ads.catalog` | Yes | Read-only grid of active Admin-created packages from `GET /ads/packages`: placement, tier, daily rate, duration days, max ads, computed fee |
| EL-03b | Select Button | Button (primary) | `merchant.ads.select` | Yes | On each package card; creates a draft ad and opens the Upload Content dialog (§5.2) |
| EL-04 | Active Ads Stat | Card | `merchant.ads.statActive` | Yes | Number of currently running (approved) ads |
| EL-05 | Pending Approval Stat | Card | `merchant.ads.statPending` | Yes | Number of ads awaiting admin approval |
| EL-06 | Expired Stat | Card | `merchant.ads.statExpired` | Yes | Number of past campaigns |

**Toolbar (advertisement list):**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-07 | Status Filter | Select | `merchant.ads.filterStatus` | No | Filter by all/active/expired |
| EL-07a | Approval Status Filter | Select | `merchant.ads.filterApproval` | No | Filter by all/pending/approved/rejected |
| EL-08 | Search Input | Input (text) | `merchant.ads.search` | No | Search within own ads |
| EL-09 | Export Button | Button (outline) | `merchant.ads.export` | No | Export ad list (CSV) |

**Advertisement Card:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-10 | Ad Thumbnail | Image | — | No | Ad image (`image_url`); placeholder if no image uploaded |
| EL-11 | Ad Title | Text | — | Yes | Merchant-provided title |
| EL-12 | Status Badge | Badge | — | Yes | Active/Expired badge |
| EL-12a | Approval Status Badge | Badge | — | Yes | Draft/Content Uploaded/Pending/Approved/Rejected badge |
| EL-12b | Payment Status Badge | Badge | — | Yes | Pending/Completed/Refunded badge |
| EL-13 | Ad Content | Text | — | No | Merchant-provided content/description |
| EL-13a | Announcement Message | Text | — | Yes | Banner announcement message (truncated, tooltip for full) |
| EL-14 | Schedule Display | Text | — | No | "Aug 24, 2026 → Aug 31, 2026" (shown after schedule set) |
| EL-15a | Pay Fee Button | Button (primary) | `merchant.ads.payFee` | Conditional | Shown when ad is in `CONTENT_UPLOADED` state; opens payment confirmation dialog (§5.4) |
| EL-15b | Resubmit Button | Button (primary) | `merchant.ads.resubmit` | Conditional | Shown when ad is in `REJECTED` state; opens edit + resubmit flow |
| EL-15c | Rejection Reason | Alert (warning) | — | No | Displays `rejection_reason` on rejected ads |
| EL-16 | Edit Button | Button (outline) | `merchant.ads.edit` | Conditional | Shown on draft/content_uploaded/rejected ads; opens edit content dialog (§5.5) |
| EL-17 | Delete Button | Button (destructive) | `merchant.ads.delete` | Conditional | Shown on draft/content_uploaded/inactive ads; soft-deletes the ad |
| EL-17a | Toggle Active Button | Switch | `merchant.ads.toggleActive` | Conditional | Shown on approved/paid ads; toggles `is_active` |

**Pagination:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-18 | Page Info | Text | `common.pageInfo` | Yes | "Page 1 of 3 · 12 ads" |
| EL-19 | Prev Button | Button (outline) | `common.prev` | Yes | Previous page |
| EL-20 | Next Button | Button (primary) | `common.next` | Yes | Next page |

**Default State:**
- Admin-created packages loaded into the catalog grid (active only), sorted by placement then tier
- Ads loaded with pagination (20 per page), sorted by newest first
- Status filter shows "All statuses"; loading skeleton during fetch
- **Pending merchant restrictions:** When `license_status` is `'pending'` or `'reject'`:
  - EL-03b (Select Button) — disabled
  - Info banner displayed: "Your shop is pending approval. You can browse packages and view your ads, but you cannot select a package until your shop is approved."

### 5.2 Screen: Upload Ad Content (Dialog)

**Purpose:** After selecting a package, the merchant uploads advertisement content (title, content, image, announcement message) and sets the schedule. This is the content upload step in the 6-step flow.

#### 5.2.1 UI Elements

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-21 | Dialog Title | Heading (h5) | `merchant.ads.uploadTitle` | Yes | "Upload Advertisement Content" |
| EL-22 | Close Button | Button (icon) | — | No | Dismiss dialog |
| EL-22a | Placement Display | Text (read-only) | `merchant.ads.placement` | Yes | Selected package placement; from catalog |
| EL-22b | Tier Display | Text (read-only) | `merchant.ads.tier` | Yes | Selected package tier |
| EL-23 | Title Input | Input (text) | `merchant.ads.title` | Yes | Advertisement title (1–200 chars) |
| EL-24 | Content Input | Textarea | `merchant.ads.content` | No | Advertisement content/description |
| EL-25 | Image Upload | File Upload | `merchant.ads.image` | No | Banner image upload (JPG/PNG/WebP, max 5MB); preview shown after upload |
| EL-26 | Link URL Input | Input (url) | `merchant.ads.linkUrl` | No | Click-through link URL |
| EL-27 | Announcement Message Input | Textarea | `merchant.ads.announcement` | Yes | Banner announcement message (max 500 chars) |
| EL-28 | Start Date Input | Date Picker | `merchant.ads.startDate` | Yes | Ad start date; `expires_at` auto-calculated as start + package duration |
| EL-29 | End Date Display | Text (read-only) | `merchant.ads.endDate` | Yes | Auto-calculated: Start Date + package `duration_days`; not editable |
| EL-32 | Cancel Button | Button (outline) | `common.cancel` | No | Close dialog without saving |
| EL-33 | Save & Continue Button | Button (primary) | `merchant.ads.saveContinue` | Yes | Saves content and schedule; ad moves to `CONTENT_UPLOADED` state; payment button becomes available |

**Default State:**
- Title, content, image, link URL, announcement message are empty (merchant fills in)
- Start date defaults to today
- End date auto-calculated and displayed as read-only
- Fee summary shown: package `daily_rate × duration_days`

### 5.3 Screen: Package Selection Confirmation (Dialog)

**Purpose:** Confirm the merchant's package selection before creating the draft ad.

#### 5.3.1 UI Elements

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-34 | Dialog Title | Heading (h5) | `merchant.ads.selectTitle` | Yes | "Select Advertising Package" |
| EL-35 | Package Info | Text (read-only) | — | Yes | Placement, tier, daily rate, duration, computed fee |
| EL-36 | Confirm Select Button | Button (primary) | `merchant.ads.confirmSelect` | Yes | Creates draft ad; opens Upload Content dialog (§5.2) |
| EL-37 | Cancel Button | Button (outline) | `common.cancel` | No | Close dialog |

### 5.4 Screen: Payment Confirmation (Dialog)

**Purpose:** Confirm the payment for an ad that has content uploaded and schedule set.

#### 5.4.1 UI Elements

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-40 | Dialog Title | Heading (h5) | `merchant.ads.payTitle` | Yes | "Pay Advertising Fee" |
| EL-41 | Fee Summary | Text | `merchant.ads.fee` | Yes | "Advertising Fee: $35.00 · 7 days × $5.00/day" |
| EL-42 | Payment Reference Input | Input (text) | `merchant.ads.paymentRef` | No | Payment transaction reference (gateway stubbed) |
| EL-43 | Pay & Submit Button | Button (primary) | `merchant.ads.paySubmit` | Yes | Charges fee; ad moves to `PENDING_APPROVAL` |
| EL-44 | Cancel Button | Button (outline) | `common.cancel` | No | Close dialog |

**Behavior:**
- Payment is processed; on success, `payment_status = completed`, `approval_status = pending`
- Ad enters admin approval queue automatically
- After success, the ad appears in the list as `PENDING_APPROVAL`

### 5.5 Screen: Edit Ad Content (Dialog)

**Purpose:** Edit advertisement content for draft, content_uploaded, or rejected ads. Also used for resubmission flow.

#### 5.5.1 UI Elements

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-50 | Dialog Title | Heading (h5) | `merchant.ads.editTitle` | Yes | "Edit Advertisement Content" |
| EL-51 | Title Input | Input (text) | `merchant.ads.title` | Yes | Advertisement title (1–200 chars) |
| EL-52 | Content Input | Textarea | `merchant.ads.content` | No | Advertisement content/description |
| EL-53 | Image Upload | File Upload | `merchant.ads.image` | No | Banner image upload (JPG/PNG/WebP, max 5MB) |
| EL-54 | Link URL Input | Input (url) | `merchant.ads.linkUrl` | No | Click-through link URL |
| EL-55 | Announcement Message Input | Textarea | `merchant.ads.announcement` | Yes | Banner announcement message (max 500 chars) |
| EL-56 | Save Button | Button (primary) | `merchant.ads.save` | Yes | Saves content changes |
| EL-57 | Save & Pay Button | Button (primary) | `merchant.ads.savePay` | Conditional | For rejected ads: saves changes and opens payment dialog for resubmission |
| EL-58 | Cancel Button | Button (outline) | `common.cancel` | No | Close dialog |

### 5.6 Screen: Admin Advertisement Moderation (`/admin/advertisements`)

**Purpose:** Allow admins to review, approve, or reject advertisements submitted by merchants.

#### 5.6.1 UI Elements

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-60 | Page Title | Heading (h5) | `admin.ads.title` | Yes | "Advertisement Moderation" |
| EL-61 | Pending Queue | Card/Table | `admin.ads.pendingQueue` | Yes | Ads with `approval_status = pending`, `payment_status = completed` |
| EL-62 | Ad Preview | Card | — | Yes | Thumbnail, title, content, announcement message, schedule, link, shop name, fee/payment info |
| EL-63 | Approve Button | Button (success) | `admin.ads.approve` | Yes | Approve ad (validates weekly limit) |
| EL-64 | Reject Button | Button (destructive) | `admin.ads.reject` | Yes | Reject ad with reason (triggers auto-refund) |
| EL-65 | Rejection Reason Input | Textarea | `admin.ads.rejectReason` | No | Required reason shown when rejecting |
| EL-66 | All Ads Table | Table | `admin.ads.all` | No | All ads with filterable approval/payment status |

**Default State:**
- Shows pending approval queue first (sorted oldest first)
- Each pending ad shows full preview and approve/reject actions
- Weekly limit indicator: "X of 5 active ads this week"

#### 5.6.2 UI Elements — Package Ad Management (REQ v2.11 §5.3: Manage Packages / Set Pricing / Package History)

> Admin owns the full package lifecycle — Admin creates the package ads that merchants can select. Merchants have no package management capability.

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-70 | Fee Settings Table | Table | `admin.ads.feeSettings` | Yes | All packages from `ad_fee_settings`: placement, tier, daily rate, duration days, max ads, active flag; loaded via `GET /admin/ad-fee-settings` |
| EL-71 | Daily Rate Input | Input (number) | `admin.ads.dailyRate` | No | Inline editable daily rate per package (≥ 0) |
| EL-72 | Save Rate Button | Button (primary) | `admin.ads.saveRate` | No | Persists rate via `PATCH /admin/ad-fee-settings/:id`; change logged to `ad_fee_history` |
| EL-73 | Fee History View | Dialog/Table | `admin.ads.feeHistory` | No | Rate change audit trail from `ad_fee_history`: old/new rate, changed by, changed at |
| EL-74 | New Package Button | Button (primary) | `admin.ads.newPackage` | Yes | Open Create Package dialog; persists via `POST /admin/ad-fee-settings` |
| EL-74a | Placement Select | Select | `admin.ads.placement` | Yes | Package placement (`homepage_slider`, `product_sidebar`, `category_banner`, `search_top`); must be unique per tier combination |
| EL-74b | Tier Select | Select | `admin.ads.tier` | Yes | Pricing tier (`basic`, `standard`, `premium`) |
| EL-74c | Duration Days Input | Input (number) | `admin.ads.durationDays` | Yes | Display duration in days (7–30 catalog bounds) |
| EL-74d | Max Ads Input | Input (number) | `admin.ads.maxAds` | Yes | Slot capacity for the placement |
| EL-75 | Deactivate Package Button | Button (destructive) | `admin.ads.deactivate` | No | Removes the package from the merchant catalog via `DELETE /admin/ad-fee-settings/:id` (soft deactivation; existing paid ads unaffected) |

**Default State:**
- Fee settings table sorted by placement then tier
- Active packages appear in the merchant catalog immediately (cache `cache:ads:packages` invalidated)
- Deactivating a package does not affect already-purchased advertisements
- Rate changes apply only to packages selected after the change (paid ads unaffected — BR-AD-052)

---

## 6. Functional Operation Specification

> **v2.5 Operating Model:** Merchants perform a 6-step advertisement flow: Select Package → Upload Content → Pay Fee → Admin Review → Approved → Displayed. Package selection creates a draft ad; content upload is a separate step; payment is a separate step that moves the ad to `PENDING_APPROVAL`. Merchants can also edit content, toggle active/inactive, soft-delete, and resubmit rejected ads.
>
> **Implementation Status (as of 2026-08-25):** Admin-side operations are implemented in `backend/src/modules/admin/advertisement-management/`. Merchant-side operations (`backend/src/modules/merchant/advertisements/`) are to be implemented per this specification.

### 6.1 Operation: Select Advertisement Package

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Select" button click on a package card (§5.3) |
| **API Endpoint** | `POST /api/v1/ads/packages/:feeSettingId/select` |
| **Request Content-Type** | `application/json` (empty body or optional `paymentReference`) |
| **Pre-Submission Validation** | JWT merchant role; active fee setting exists; shop approved |
| **Processing Steps** | 1. Validate `:feeSettingId` as UUID format. 2. Validate JWT token and merchant role. 3. Resolve merchant's shop (GET /shops/merchant). 4. Verify shop exists and `is_approved = true`. **If shop is not approved, return `403 SHOP_NOT_APPROVED`.** 5. Find active package in `ad_fee_settings` by id; if not found or inactive return `404 NOT_FOUND` / `400 AD_PACKAGE_INVALID`. 6. In a transaction: create advertisement record linked to the shop with `approval_status = pending`, `payment_status = pending`, `is_active = true`, no content yet, no schedule yet, package fee = `daily_rate × duration_days` stored as reference. 7. Invalidate package catalog cache. 8. Log `AD_SELECTED` audit event. 9. Return created advertisement DTO (`201 Created`). |
| **Success Response** | 201 Created with advertisement data (draft state) |
| **Post-Action** | Open Upload Content dialog (§5.2) for the newly created draft ad |

### 6.2 Operation: Upload Ad Content

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Save & Continue" button click in Upload Content dialog (§5.2) or "Save" in Edit dialog (§5.5) |
| **API Endpoint** | `PATCH /api/v1/ads/:id/content` |
| **Request Content-Type** | `multipart/form-data` (for image upload) or `application/json` |
| **Pre-Submission Validation** | JWT merchant role; ad belongs to merchant's shop; ad in `DRAFT` or `CONTENT_UPLOADED` or `REJECTED` state |
| **Processing Steps** | 1. Validate `:id` as UUID format. 2. Validate JWT token and merchant role. 3. Find advertisement; verify ownership (`shop_id` matches merchant's shop). 4. Verify ad state allows content upload (`DRAFT`, `CONTENT_UPLOADED`, or `REJECTED`). 5. Validate content fields: `title` (required, 1–200 chars), `announcementMessage` (required, max 500 chars), `content` (optional), `linkUrl` (optional, valid URL). 6. If `imageUrl` provided via file upload: validate MIME type (JPG/PNG/WebP), validate size (≤ 5MB), generate UUID filename, store outside webroot, set `image_url`. 7. Set `starts_at` from request. 8. Derive `expires_at = starts_at + package duration_days` (resolved from the ad's package at selection time). 9. Validate `expires_at > starts_at`. 10. Update advertisement: set `title`, `content`, `image_url`, `link_url`, `announcement_message`, `starts_at`, `expires_at`. `approval_status` remains `'pending'` (unchanged). 11. Log `AD_CONTENT_UPLOADED` audit event. 12. Return updated advertisement DTO. |
| **Success Response** | 200 OK with updated advertisement data |
| **Post-Action** | Dialog closes; Pay Fee button becomes available on the ad card |

### 6.3 Operation: Pay Advertising Fee

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Pay & Submit" button click in Payment Confirmation dialog (§5.4) |
| **API Endpoint** | `POST /api/v1/ads/:id/pay` |
| **Request Content-Type** | `application/json` (`paymentReference` optional) |
| **Pre-Submission Validation** | JWT merchant role; ad belongs to merchant's shop; ad in `CONTENT_UPLOADED` state; content and schedule validated |
| **Processing Steps** | 1. Validate `:id` as UUID format. 2. Validate JWT token and merchant role. 3. Find advertisement; verify ownership and ad has content uploaded (`content IS NOT NULL AND image_url IS NOT NULL`) AND `payment_status = 'pending'`. 4. Resolve fee = `daily_rate × duration_days` from the package. 5. In one transaction: process payment (stubbed); record transaction in `ad_payments` (`payment_status = completed`, `amount`, `payment_method`, `transaction_id`, `paid_at`); update advertisement: `payment_status = completed`. `approval_status` remains `'pending'` (unchanged); set `payment_amount`, `payment_reference`, derive `week_number` from `starts_at`. 6. Invalidate active ads cache (`DEL cache:ads:active`). 7. Log `AD_PAID` audit event. 8. Notify admin of pending approval. 9. Return updated advertisement DTO. |
| **Success Response** | 200 OK with updated advertisement data (PENDING_APPROVAL state) |
| **Post-Action** | Ad appears as PENDING_APPROVAL in the merchant list; payment button hidden |

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
| **Post-Action** merchant sees rejection reason and refund status in the list; Edit + Resubmit buttons become available (merchant may edit content and pay fresh fee to resubmit) |

### 6.6 Operation: List Own Advertisements

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Navigate to `/merchant/advertisements` or apply filter/search |
| **API Endpoint** | `GET /api/v1/ads` |
| **Request Content-Type** | None (query parameters) |
| **Pre-Submission Validation** | Query params validated (page, limit, status, approvalStatus) |
| **Processing Steps** | 1. Validate query parameters. 2. Resolve merchant's shop id. 3. Build Prisma WHERE with `shop_id = <merchant shop id>`. 4. Apply status filter (active: `is_active = true` AND approved AND completed AND in schedule) and approval status filter. 5. Apply pagination via `idx_advertisements_shop_id`. 6. Return paginated response with meta. |
| **Success Response** | 200 OK with advertisement list and pagination meta |
| **Cache** | None (per-merchant, not cached) |

### 6.7 Operation: Update Advertisement Content

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Edit" button click on an ad card → Edit Content dialog (§5.5) → "Save" |
| **API Endpoint** | `PATCH /api/v1/ads/:id` |
| **Request Content-Type** | `multipart/form-data` or `application/json` |
| **Pre-Submission Validation** | JWT merchant role; ad belongs to merchant's shop; ad in editable state (`DRAFT`, `CONTENT_UPLOADED`, `REJECTED`) |
| **Processing Steps** | 1. Validate `:id` as UUID format. 2. Validate JWT token and merchant role. 3. Find advertisement; verify ownership. 4. Verify ad state allows editing. 5. Update content fields (`title`, `content`, `image_url`, `link_url`, `announcement_message`). 6. Log `AD_UPDATED` audit event. 7. Return updated advertisement DTO. |
| **Success Response** | 200 OK with updated advertisement data |
| **Note** | For rejected ads: after editing, merchant proceeds to Pay Fee (§6.3) for resubmission |

### 6.8 Operation: Delete Advertisement (Soft Delete)

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Delete" button click on an ad card → confirmation dialog |
| **API Endpoint** | `DELETE /api/v1/ads/:id` |
| **Request Content-Type** | None |
| **Pre-Submission Validation** | JWT merchant role; ad belongs to merchant's shop; ad in deletable state (`DRAFT`, `CONTENT_UPLOADED`, `INACTIVE`) |
| **Processing Steps** | 1. Validate `:id` as UUID format. 2. Validate JWT token and merchant role. 3. Find advertisement; verify ownership. 4. Verify ad state allows deletion. 5. Set `is_active = false` (soft delete). 6. Invalidate active ads cache if applicable. 7. Log `AD_DELETED` audit event. 8. Return success response. |
| **Success Response** | 200 OK with success message |
| **Note** | Record retained for history (BR-AD-012) |

### 6.9 Operation: Toggle Advertisement Active/Inactive

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Toggle switch on ad card (EL-17a) |
| **API Endpoint** | `PATCH /api/v1/ads/:id/toggle` |
| **Request Content-Type** | `application/json` (`isActive: boolean`) |
| **Pre-Submission Validation** | JWT merchant role; ad belongs to merchant's shop; ad is approved and paid |
| **Processing Steps** | 1. Validate `:id` as UUID format. 2. Validate JWT token and merchant role. 3. Find advertisement; verify ownership and `approval_status = approved`, `payment_status = completed`. 4. Update `is_active` to the provided value. 5. Invalidate active ads cache. 6. Log `AD_TOGGLED` audit event. 7. Return updated advertisement DTO. |
| **Success Response** | 200 OK with updated advertisement data |

### 6.10 Operation: List Active Advertisements (Public)

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Storefront load / banner carousel render |
| **API Endpoint** | `GET /api/v1/ads/active` |
| **Request Content-Type** | None |
| **Pre-Submission Validation** | None (public route) |
| **Processing Steps** | 1. `@Public()` route (no JWT required). 2. Check Redis cache `cache:ads:active`. 3. On cache miss: query `WHERE is_active = true AND approval_status = 'approved' AND payment_status = 'completed' AND starts_at <= now() AND expires_at >= now() ORDER BY created_at DESC`. 4. Seed Redis cache with 5-minute TTL. 5. Return active ad list (banner/image + announcement message). Client applies display rules: slider cap of 5 per rotation, tier priority Premium > Standard > Basic, round-robin within tier, auto-rotation every 5 seconds (see §4.11; server-side tier ordering pending placement persistence — see Design Note). |
| **Success Response** | 200 OK with active advertisement list |
| **Cache** | Redis: `cache:ads:active` TTL 5 minutes |

### 6.11 Operation: List Pending Advertisements (Admin)

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Admin navigates to `/admin/advertisements` |
| **API Endpoint** | `GET /api/v1/admin/ads?approvalStatus=pending` (implemented as `GET /admin/ads?status=pending`) |
| **Request Content-Type** | None (query parameters) |
| **Pre-Submission Validation** | Admin role |
| **Processing Steps** | 1. Validate query parameters. 2. Query ads with `approval_status = pending` (and `payment_status = completed`) via `idx_advertisements_approval_status` + `idx_advertisements_payment_status`. 3. Include shop name and payment info. 4. Return paginated list. |
| **Success Response** | 200 OK with paginated pending ad list |
| **Cache** | None |

### 6.12 Operation: Browse Advertisement Packages (Merchant)

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Merchant opens the package catalog section on `/merchant/advertisements` |
| **API Endpoint** | `GET /api/v1/ads/packages` |
| **Request Content-Type** | None |
| **Pre-Submission Validation** | JWT token; merchant or admin role |
| **Processing Steps** | 1. Validate JWT token and role. 2. Query active `ad_fee_settings` (packages created by Admin) ordered by placement, tier. 3. Group by placement with tier options (`basic`/`standard`/`premium`), exposing `daily_rate`, `duration_days`, `max_ads` per package. 4. Return read-only package catalog for selection (UC-AD-014). |
| **Success Response** | 200 OK with grouped package list |
| **Cache** | Redis: `cache:ads:packages` TTL 10 minutes; invalidated on fee settings update |

### 6.13 Operation: Get Ad Fee Settings (Admin)

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Admin opens Ad Fee Settings management panel (EL-70) |
| **API Endpoint** | `GET /api/v1/admin/ad-fee-settings` |
| **Request Content-Type** | None |
| **Pre-Submission Validation** | Admin role |
| **Processing Steps** | 1. Validate JWT token and admin role. 2. Query all `ad_fee_settings` ordered by placement, tier. 3. Return settings list (placement, tier, daily_rate, duration_days, max_ads). |
| **Success Response** | 200 OK with fee settings list |
| **Cache** | None |

### 6.14 Operation: Update Ad Fee Setting (Admin)

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Save Rate" button click in fee settings panel (EL-72) |
| **API Endpoint** | `PATCH /api/v1/admin/ad-fee-settings/:id` |
| **Request Content-Type** | `application/json` (`daily_rate`) |
| **Pre-Submission Validation** | Admin role; `daily_rate` numeric ≥ 0 |
| **Processing Steps** | 1. Validate `:id` as UUID format. 2. Validate JWT token and admin role. 3. Find fee setting; if not found return 404. 4. Update `daily_rate`; `updated_at` refreshed. 5. Insert audit record into `ad_fee_history`: `ad_fee_setting_id`, `old_daily_rate`, `new_daily_rate`, `changed_by` (admin id), `changed_at`. 6. Invalidate `cache:ads:packages`. 7. Log `AD_FEE_UPDATED` audit event. 8. Return updated fee setting DTO. Rate change applies only to packages selected afterwards (BR-AD-037/BR-AD-052). |
| **Success Response** | 200 OK with updated fee setting data |
| **Post-Action** | Refresh fee settings table; show success toast |

### 6.15 Operation: Create Advertisement Package (Admin)

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "New Package" button click in Package Ad Management panel (EL-74) |
| **API Endpoint** | `POST /api/v1/admin/ad-fee-settings` |
| **Request Content-Type** | `application/json` (`placement`, `tier`, `daily_rate`, `duration_days`, `max_ads`) |
| **Pre-Submission Validation** | Admin role; DTO validation (§8.1a); unique (`placement`, `tier`) combination |
| **Processing Steps** | 1. Validate JWT token and admin role. 2. Validate all fields; reject duplicate active (`placement`, `tier`) combination with `409 CONFLICT`. 3. Validate `duration_days` within catalog bounds (7–30) and `max_ads` ≥ 1; `daily_rate` ≥ 0. 4. Insert new package into `ad_fee_settings`. 5. Invalidate `cache:ads:packages`. 6. Log `AD_PACKAGE_CREATED` audit event. 7. Return created fee setting DTO (`201 Created`). The package is immediately selectable by merchants in the catalog. |
| **Success Response** | 201 Created with fee setting data |
| **Post-Action** | Refresh fee settings table; show success toast |

### 6.16 Operation: Deactivate Advertisement Package (Admin)

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Deactivate" button click on a package row (EL-75) |
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
| `feeSettingId` | Package | 広告パッケージ | UUID (path param) | Yes | Select button | `@IsUUID()`; must resolve to an active `ad_fee_settings` record |

### 7.2 Input Specification — Upload Ad Content (Merchant, 入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `title` | Title | タイトル | VARCHAR(200) | Yes | Input (text) | `@IsString()`, `@IsNotEmpty()`, `@MaxLength(200)` |
| `content` | Content | 内容 | TEXT | No | Textarea | `@IsString()`, `@IsOptional()` |
| `image` | Image | 画像 | File (binary) | No | File upload | MIME: `image/jpeg`, `image/png`, `image/webp`; max 5MB |
| `linkUrl` | Link URL | リンクURL | VARCHAR(2048) | No | Input (url) | `@IsUrl()`, `@IsOptional()`, `@MaxLength(2048)` |
| `announcementMessage` | Announcement Message | 告知メッセージ | VARCHAR(500) | Yes | Textarea | `@IsString()`, `@IsNotEmpty()`, `@MaxLength(500)` |
| `startsAt` | Start Date | 開始日 | DATE | Yes | Date picker | `@IsDateString()`; must be ≥ today |

> `expiresAt` is derived server-side as `starts_at + duration_days` from the selected package; not merchant input. `approval_status`, `payment_status`, `payment_amount`, `payment_reference`, `week_number`, `approved_by`, `approved_at`, `rejection_reason` are system-managed.

### 7.3 Input Specification — Pay Fee (Merchant, 入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `paymentReference` | Payment Reference | 支払い参照 | VARCHAR(100) | No | (hidden, gateway stub) | `@IsString()`, `@IsOptional()`, `@MaxLength(100)` |

### 7.4 Input Specification — List Query (入力定義)

| Field | Display Name (EN) | Data Type | Required | Input Control | Validation |
|-------|-------------------|-----------|:--------:|---------------|------------|
| `page` | Page | Number | No | Pagination | `@IsInt()`, `@Min(1)`, default 1 |
| `limit` | Limit | Number | No | Pagination | `@IsInt()`, `@Min(1)`, `@Max(100)`, default 20 |
| `status` | Status | String | No | Select | `@IsIn(['active', 'inactive', 'expired'])`, `@IsOptional()` |
| `approvalStatus` | Approval Status | String | No | Select | `@IsIn(['pending', 'approved', 'rejected'])`, `@IsOptional()` |

### 7.5 Input Specification — Admin Actions (入力定義)

| Endpoint | Field | Data Type | Required | Validation |
|----------|-------|-----------|:--------:|------------|
| `PATCH /admin/ads/:id/reject` | `reason` | String | Yes | `@IsString()`, `@IsNotEmpty()`, `@MaxLength(2000)` |
| `PATCH /admin/ad-fee-settings/:id` | `daily_rate` | Number | Yes | `@IsNumber()`, `@Min(0)`, `@Max(10000)` |
| `POST /admin/ad-fee-settings` | package fields | Object | Yes | See §7.6 |

### 7.6 Input Specification — Create Advertisement Package (Admin, 入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `placement` | Placement | 掲載場所 | VARCHAR(50) | Yes | Select | `@IsIn(['homepage_slider', 'product_sidebar', 'category_banner', 'search_top'])`; unique per tier |
| `tier` | Tier | 料金プラン | VARCHAR(20) | Yes | Select | `@IsIn(['basic', 'standard', 'premium'])` |
| `daily_rate` | Daily Rate | 日額 | DECIMAL(10,2) | Yes | Input (number) | `@IsNumber()`, `@Min(0)` |
| `duration_days` | Duration Days | 表示日数 | INTEGER | Yes | Input (number) | `@IsInt()`, `@Min(7)`, `@Max(30)` |
| `max_ads` | Max Ads | 最大枠数 | INTEGER | Yes | Input (number) | `@IsInt()`, `@Min(1)` |

### 7.7 Output Specification — Advertisement (出力定義)

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
| `paymentStatus` | `advertisements.payment_status` | 'pending' / 'completed' / 'refunded' |
| `paymentAmount` | `advertisements.payment_amount` | Decimal string or null |
| `paymentReference` | `advertisements.payment_reference` | String or null |
| `approvedBy` | `advertisements.approved_by` | UUID string or null |
| `approvedAt` | `advertisements.approved_at` | ISO 8601 timestamp or null |
| `rejectionReason` | `advertisements.rejection_reason` | String or null |
| `weekNumber` | `advertisements.week_number` | Integer (ISO week) |
| `startsAt` | `advertisements.starts_at` | ISO 8601 timestamp |
| `expiresAt` | `advertisements.expires_at` | ISO 8601 timestamp |
| `createdAt` | `advertisements.created_at` | ISO 8601 timestamp |

### 7.8 Output Specification — Active Advertisement (Public, 出力定義)

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

### 8.2 Content Upload Validation (Merchant, Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `title` | Required, 1–200 chars | "Title is required" / "Title must not exceed 200 characters" | "タイトルは必須です" / "タイトルは200文字以内で入力してください" |
| `content` | Optional, max 5000 chars | "Content must not exceed 5000 characters" | "内容は5000文字以内で入力してください" |
| `image` | Optional; if provided: MIME must be `image/jpeg`, `image/png`, or `image/webp`; size ≤ 5MB | "Image must be JPG, PNG, or WebP" / "Image must not exceed 5MB" | "画像はJPG、PNG、WebPで入力してください" / "画像は5MB以内で入力してください" |
| `linkUrl` | Optional, valid URL format, max 2048 chars | "Invalid URL format" / "Link URL must not exceed 2048 characters" | "URLの形式が不正です" / "リンクURLは2048文字以内で入力してください" |
| `announcementMessage` | Required, max 500 chars | "Announcement message is required" / "Announcement message must not exceed 500 characters" | "告知メッセージは必須です" / "告知メッセージは500文字以内で入力してください" |
| `startsAt` | Required, must be ≥ today | "Start date is required" / "Start date must be today or later" | "開始日は必須です" / "開始日は今日以降で入力してください" |

### 8.3 Schedule Date Validation (System-Derived)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `startsAt` | Set by merchant; must be ≥ today | "Start date must be today or later" | "開始日は今日以降で入力してください" |
| `expiresAt` | System-derived: `starts_at + duration_days` of the selected package; guarded by DB check constraint `chk_advertisements_dates` (`expires_at > starts_at`) | "Advertisement dates are invalid" | "広告期間が不正です" |
| Duration | Fixed by selected package's `duration_days`; catalog spans 7–30 days across placements | "Advertisement duration is determined by the selected package" | "広告の表示期間は選択したパッケージにより決定されます" |

### 8.4 Approval / Payment / Weekly Limit Validation

| Field / Rule | Validation Rule | Error Message (EN) | Error Message (JA) |
|--------------|-----------------|--------------------|--------------------|
| `approvalStatus` | Enum `pending/approved/rejected` (DB constraint) | "Invalid approval status" | "承認状態が不正です" |
| `paymentStatus` | Enum `pending/completed/refunded` (DB constraint) | "Invalid payment status" | "支払い状態が不正です" |
| `rejectionReason` | Required when rejecting | "Rejection reason is required" | "却下理由は必須です" |
| Payment | Payment must succeed; failure returns error without changing ad state | "Payment failed. Please try again." | "支払いに失敗しました。もう一度お試しください。" |
| Weekly limit | Max 5 approved active ads per week | "Weekly advertisement limit reached (max 5)" | "今週の広告枠上限(5件)に達しました" |

### 8.5 Validation Enforcement Layers

1. **Frontend (Client)**: React Hook Form + Zod schema validation on all forms (package selection, content upload, payment, edit).
2. **Backend (Server)**: NestJS ValidationPipe + class-validator DTOs on all endpoints; service-level checks for package resolution, shop approval, content validation, payment, approval/weekly-limit rules, and server-side `expires_at` derivation.
3. **Database (PostgreSQL)**: CHECK constraints `chk_advertisements_dates`, `chk_advertisements_approval_status`, `chk_advertisements_payment_status` as final guards.

---

## 9. Error Handling Specification

### 9.1 Error Response Structure

```json
{
  "statusCode": 403,
  "message": ["Forbidden"],
  "error": "Forbidden",
  "timestamp": "2026-08-25T12:00:00.000Z",
  "path": "/api/v1/ads/a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

### 9.2 Error Classification Table — Advertisement Operations

| HTTP Status | Error Code | Scenario | User-Facing Behavior |
|-------------|------------|----------|---------------------|
| `400` | `BAD_REQUEST` | Validation failures (missing `title`, `announcementMessage`, invalid image, etc.) | Field-level inline errors + top banner |
| `401` | `UNAUTHORIZED` | Missing or invalid JWT | Redirect to login |
| `403` | `FORBIDDEN` | Not merchant/admin, not ad owner | "You don't have permission to manage this ad" |
| `403` | `SHOP_NOT_APPROVED` | Pending merchant attempts package selection | "Your shop is pending approval. You cannot select an advertising package until your shop is approved." |
| `404` | `NOT_FOUND` | Advertisement not found; selected package not found | "Advertisement not found" with refresh option |
| `409` | `CONFLICT` | `expires_at <= starts_at` (DB guard) | "Invalid schedule dates" |
| `409` | `WEEKLY_LIMIT_REACHED` | Weekly ad limit (5/week) reached on approve | "Weekly advertisement limit reached (max 5)" |
| `400` | `AD_PACKAGE_INVALID` | Selected `feeSettingId` does not resolve to an active `ad_fee_settings` record | "Selected advertising package is unavailable" |
| `400` | `AD_SCHEDULE_INVALID` | Derived schedule invalid (`expires_at` could not be derived from package duration) | "Advertisement schedule is invalid" |
| `413` | `PAYLOAD_TOO_LARGE` | Ad image file > 5MB | "Image file must not exceed 5MB" |
| `415` | `UNSUPPORTED_MEDIA_TYPE` | Invalid image format (not JPG/PNG/WebP) | "Image must be JPG, PNG, or WebP format" |
| `422` | `UNPROCESSABLE_ENTITY` | Approve non-pending ad; payment verification failure | "Payment failed. Please try again." |
| `429` | `TOO_MANY_REQUESTS` | Rate limit exceeded | "Too many requests. Please wait {seconds} seconds" |
| `500` | `INTERNAL_SERVER_ERROR` | Server error (incl. payment verification failure) | "Something went wrong. Please try again" |

### 9.3 Frontend Error Display Behavior

- **Field-Level Validation**: Red border and inline text below invalid input.
- **Form-Level Summary**: Alert banner at top of form listing all errors.
- **Toast Notifications**: Used for API errors and successful actions.
- **Loading States**: Spinner on submit buttons during API calls.
- **Empty States**: Illustrated message when no ads match the current filter/search.
- **Confirm Dialog**: Package selection and delete require confirmation dialogs.

---

## 10. Permission and Access Control

### 10.1 Authentication Requirements

- JSON Web Token (JWT) Bearer Token passed via `Authorization` header for merchant and admin operations.
- Public endpoint (active ad display) requires no authentication.

### 10.2 Public vs Protected Endpoints

| Endpoint | Access Level | Description |
|----------|-------------|-------------|
| `GET /ads/packages` | Protected (Merchant/Admin) | Browse Admin-created advertisement packages |
| `POST /ads/packages/:feeSettingId/select` | Protected (Merchant) | Select package; creates draft ad |
| `PATCH /ads/:id/content` | Protected (Merchant) | Upload ad content (title, image, etc.) |
| `POST /ads/:id/pay` | Protected (Merchant) | Pay advertising fee; ad enters approval queue |
| `GET /ads` | Protected (Merchant) | List own advertisements |
| `PATCH /ads/:id` | Protected (Merchant) | Edit ad content |
| `DELETE /ads/:id` | Protected (Merchant) | Soft-delete ad |
| `PATCH /ads/:id/toggle` | Protected (Merchant) | Toggle active/inactive |
| `GET /admin/ads` | Protected (Admin) | List all ads / pending approval queue |
| `PATCH /admin/ads/:id/approve` | Protected (Admin) | Approve advertisement |
| `PATCH /admin/ads/:id/reject` | Protected (Admin) | Reject advertisement (with reason + refund) |
| `GET /admin/ad-fee-settings` | Protected (Admin) | List advertisement package settings |
| `POST /admin/ad-fee-settings` | Protected (Admin) | Create advertisement package |
| `PATCH /admin/ad-fee-settings/:id` | Protected (Admin) | Update package daily rate (logged to `ad_fee_history`) |
| `DELETE /admin/ad-fee-settings/:id` | Protected (Admin) | Deactivate package |
| `GET /ads/active` | Public | List active approved ads for platform display |

### 10.3 Role-Based Access

| Role | View Own Ads | Select Package | Upload Content | Pay Fee | Edit Content | Delete/Toggle | Manage Packages | Approve/Reject | View Active Ads |
|------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `buyer` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| `merchant` (pending) | ✓ (read-only) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| `merchant` (approved) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ |
| `admin` | ✓ (all ads) | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ (full CRUD) | ✓ | ✓ |

> **Note (v2.5):** Merchants with `license_status = 'approved'` have full CRUD on their own advertisements. Pending merchants can view their list (read-only) but cannot select packages, upload content, or pay.

### 10.4 Ownership Enforcement

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('merchant', 'admin')
@Controller('ads')
export class AdvertisementsController {
  // GET /packages        — read-only Admin-created catalog (merchant/admin)
  // POST /packages/:feeSettingId/select — merchant select (creates draft ad)
  // PATCH /:id/content   — merchant upload content
  // POST /:id/pay        — merchant pay fee
  // GET /                — own ads (merchant), all ads (admin)
  // PATCH /:id           — merchant edit content
  // DELETE /:id          — merchant soft-delete
  // PATCH /:id/toggle    — merchant toggle active/inactive

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

Merchants can only manage ads whose `shop_id` matches their own shop. Attempts to access another merchant's ad MUST return `403 Forbidden`. Admin owns the package catalog lifecycle; approve/reject endpoints MUST require `admin` role only.

**Pending Merchant Restrictions:** Merchants with `license_status` of `'pending'` or `'reject'` can browse the package catalog and view their purchase list (read-only), but package selection MUST verify `shop.is_approved = true` and return `403 SHOP_NOT_APPROVED` if the shop is not approved. The frontend disables the Select action for pending merchants.

### 10.5 Security Audit Logging

| Event | Data Logged | Retention |
|-------|-------------|-----------|
| `AD_SELECTED` | shopId, adId, feeSettingId, merchantId, placement, tier, timestamp | 90 days |
| `AD_CONTENT_UPLOADED` | shopId, adId, merchantId, title, hasImage, timestamp | 90 days |
| `AD_PAID` | shopId, adId, amount, reference, timestamp | 90 days |
| `AD_UPDATED` | shopId, adId, merchantId, changes, timestamp | 90 days |
| `AD_DELETED` | shopId, adId, merchantId, timestamp | 90 days |
| `AD_TOGGLED` | shopId, adId, merchantId, oldIsActive, newIsActive, timestamp | 90 days |
| `AD_APPROVED` | shopId, adId, adminId, timestamp | 2 years (admin action — Development Rules §6.4) |
| `AD_REJECTED` | shopId, adId, adminId, reason, refund amount, timestamp | 2 years (admin action — Development Rules §6.4) |
| `AD_PACKAGE_CREATED` | settingId, placement, tier, daily rate, duration, max ads, adminId, timestamp | 2 years (admin action — Development Rules §6.4) |
| `AD_PACKAGE_DEACTIVATED` | settingId, placement, tier, adminId, timestamp | 2 years (admin action — Development Rules §6.4) |
| `AD_FEE_UPDATED` | settingId, placement, tier, old rate, new rate, adminId, timestamp | 2 years (admin action — Development Rules §6.4) |

---

## 11. Real-Time Notification Behavior

### 11.1 Current Implementation

The Advertisement Management screen does not require WebSocket connections. Advertisement status (draft/content_uploaded/pending/approved/rejected, active/inactive/expired) is derived from schedule data and refreshed through standard query invalidation (TanStack Query) after mutations.

### 11.2 Notification Events

| Event | Trigger | Recipient | Action |
|-------|---------|-----------|--------|
| `AD_SUBMITTED` | Ad enters `PENDING_APPROVAL` after payment | Admin | Pending approval badge / notification in admin dashboard |
| `AD_APPROVED` | Admin approves ad | Merchant | Notification + ad becomes displayable (cache refresh ≤ 5 min) |
| `AD_REJECTED` | Admin rejects ad | Merchant | Notification with `rejection_reason`; refund processed; merchant may edit and resubmit |
| `AD_ACTIVATED` | Start time reached | — | Appears on storefront after `cache:ads:active` refresh (max 5 min) |
| `AD_EXPIRED` | `expires_at` passed | — | Disappears from storefront after cache refresh |
| `AD_MUTATED` | Content upload / payment / merchant edit / toggle / delete / admin package changes | — | Cache invalidated immediately; next `GET /ads/active` re-queries DB |

---

## 12. Screen Transition Specification

### 12.1 Inbound Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| Merchant dashboard | `/merchant/advertisements` | Click "Advertisements" menu |
| Admin dashboard | `/admin/advertisements` | Click "Advertisement Moderation" menu |
| Merchant | `/merchant/advertisements` (Read-Only + Package Catalog) | `license_status` is `'pending'` or `'reject'` — select/upload/pay disabled, list viewable |
| Merchant | `/merchant/advertisements` (Full CRUD) | `license_status` is `'approved'` |
| Any protected route (unauthenticated) | `/login` | No valid access token |

### 12.2 Internal Navigation

| Source | Target | Trigger |
|--------|--------|---------|
| `/merchant/advertisements` | Package Selection Confirmation dialog (modal) | Click "Select" on a package card |
| Package Selection Confirmation dialog | Upload Ad Content dialog (modal) | Click "Confirm Select" |
| Upload Ad Content dialog | `/merchant/advertisements` | Click "Save & Continue" (content saved, Pay Fee button available) |
| Pay Fee button on ad card | Payment Confirmation dialog (modal) | Click "Pay Fee" |
| Payment Confirmation dialog | `/merchant/advertisements` | Payment success (ad moves to PENDING_APPROVAL) |
| Edit button on ad card | Edit Ad Content dialog (modal) | Click "Edit" |
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
| Upload Content API | ≤ 2 seconds (excl. image upload time) |
| Pay Fee API | ≤ 2 seconds |
| Approve / Reject Ad API | ≤ 1 second |
| Active Ads API (cache hit) | ≤ 100 milliseconds |
| Active Ads API (cache miss) | ≤ 500 milliseconds |

### 13.2 Caching Strategy

| Cache Key | TTL | Invalidation Trigger |
|-----------|-----|---------------------|
| `cache:ads:active` | 5 minutes | Content upload, payment, approve/reject, merchant edit/toggle/delete, admin package changes |
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
| Mobile (< 768px) | Single-column ad cards, dialogs become full-screen sheets |

### 13.5 Accessibility Requirements

| Requirement | Implementation |
|-------------|---------------|
| WCAG 2.1 AA | Semantic HTML, ARIA labels on all interactive elements |
| Keyboard Navigation | Tab order through ad cards, toolbar, dialog fields |
| Screen Reader | Alt text for ad images, ARIA labels for edit/delete/toggle actions |
| Color Contrast | Minimum 4.5:1 for text, 3:1 for UI components (status badges) |
| Focus Indicators | Visible focus ring on all interactive elements, focus trap in dialogs |

---

## 14. Configurable Items (External Definitions)

Defined via `.env` configuration:

| Definition Key | Default Value | Description |
|----------------|---------------|-------------|
| `AD_LIST_PAGE_SIZE` | `20` | Default items per page |
| `AD_LIST_MAX_PAGE_SIZE` | `100` | Maximum items per page |
| `AD_IMAGE_MAX_SIZE_MB` | `5` | Maximum ad image file size in MB |
| `AD_IMAGE_ALLOWED_TYPES` | `['image/jpeg', 'image/png', 'image/webp']` | Allowed MIME types for ad images |
| `AD_IMAGE_STORAGE_PATH` | `./uploads/ads` | Directory to store uploaded ad images |
| `AD_ACTIVE_CACHE_TTL_SECONDS` | `300` | Active ads cache TTL (5 min) |
| `AD_ACTIVE_CACHE_KEY` | `cache:ads:active` | Redis key for active ads cache |
| `AD_PACKAGES_CACHE_TTL_SECONDS` | `600` | Package catalog cache TTL (10 min) |
| `AD_PACKAGES_CACHE_KEY` | `cache:ads:packages` | Redis key for package catalog cache |
| `AD_FEE_SETTINGS_TABLE` | `ad_fee_settings` | Dynamic placement/tier fee settings master |
| `AD_WEEKLY_LIMIT` | `5` | Maximum active advertisements per week (platform-wide) |
| `AD_SLIDER_MAX_ADS` | `5` | Maximum advertisements displayed per storefront slider rotation cycle |
| `AD_SLIDER_ROTATION_SECONDS` | `5` | Storefront slider auto-rotation interval in seconds |
| `AD_MIN_DURATION_DAYS` | `7` | Package catalog sanity bound — minimum package duration in days |
| `AD_MAX_DURATION_DAYS` | `30` | Package catalog sanity bound — maximum package duration in days |
| `AD_ANNOUNCEMENT_MAX_LENGTH` | `500` | Maximum length of announcement message |

---

## 15. Cross-Reference Traceability Matrix

### 15.1 Requirements Definition Traceability

| Requirement ID | Requirement Description | Covered By (This Document) |
|----------------|-------------------------|----------------------------|
| M-AD-001 | Merchant can create shop advertisements | Covered — UC-AD-001 (select package), UC-AD-003 (upload content), Sec 6.1 + 6.2 |
| M-AD-002 | Merchant can set ad schedule (start date; end derived from package) | Covered — UC-AD-002, BR-AD-008~010, BR-AD-025, BR-AD-051, Sec 6.2 (step 7~8), Sec 8.3 |
| M-AD-003 | Merchant can upload ad images | Covered — UC-AD-003, BR-AD-015~018, Sec 6.2, §5.2 |
| M-AD-004 | Merchant can view/manage own ads | Covered — UC-AD-004, Sec 5.1, Sec 6.6~6.9 |
| M-AD-005 | Active ads display on platform | UC-AD-008, BR-AD-054~058, Sec 6.10, Sec 11.2 |
| M-AD-006 | Admin can approve/reject advertisements | UC-AD-011/012, BR-AD-028~031, Sec 5.6, Sec 6.4~6.5, Sec 6.11 |
| M-AD-007 | Merchants must pay advertising fee before submission | Covered — UC-AD-009, BR-AD-029/033~036, Sec 6.3 |
| M-AD-008 | Maximum 5 active advertisements per week | BR-AD-046~049, Sec 6.4 (step 4), Sec 8.4 |
| M-AD-009 | Advertisements display with banner/image and announcement message | BR-AD-024, EL-13a, Sec 7.8 (merchant-provided content) |
| M-AD-010 | Ad states: draft → pending_payment → pending_approval → approved → active → expired | Revised in v2.5 — draft → content_uploaded → paid(pending_approval) → approved → active → expired — Sec 3.1, Sec 3.4 |
| M-AD-011 | Rejected ads auto-refund payment to merchant | BR-AD-031, Sec 6.5 (steps 6~7) |
| — (REQ v2.11 §4.4 View Packages) | Merchant browses Admin-created advertisement packages and selects one | UC-AD-014 + UC-AD-001, Sec 6.12 + Sec 6.1, EL-03a/EL-03b |
| — (REQ v2.11 §4.4 Upload Content) | Merchant uploads ad content (image + text) after package selection | UC-AD-003, Sec 6.2, §5.2 |
| — (REQ v2.11 §4.4 Resubmit Rejected) | Merchant can edit and resubmit rejected ads | UC-AD-013, BR-AD-032, Sec 6.7 |
| — (REQ v2.11 §5.3 Manage Packages / Set Pricing / Package History) | Admin manages full package lifecycle with audit history | UC-AD-015, Sec 5.6.2, Sec 6.13~6.16, BR-AD-037/BR-AD-052 |
| — (REQ v2.11 §5.3 Display Rules) | Slider cap 5, priority Premium > Standard > Basic, round-robin, auto-rotation 5s | BR-AD-054~058, Sec 4.11, Sec 6.10 |

### 15.2 Database Design Traceability

| Database Table | Relevant Functional Operations |
|----------------|-------------------------------|
| `advertisements` | INSERT on package selection (shop_id, draft state), UPDATE on content upload (title, content, image, schedule, content_uploaded state), UPDATE on payment (payment_status, approval_status, payment_amount), UPDATE on merchant edit (content fields), UPDATE on toggle (is_active), soft-delete (is_active = false), Approve/Reject (UPDATE approval_status/approved_by/approved_at/rejection_reason), Active display (SELECT+WHERE approved+paid+in-schedule), Weekly limit (SELECT count by week_number). |
| `ad_fee_settings` | Admin-only package catalog management (INSERT create, SELECT grouped by placement/tier, UPDATE daily_rate, soft-deactivate), fee resolution at selection (`daily_rate × duration_days`), merchant catalog browsing (SELECT active only) |
| `ad_payments` | Record advertisement payment transaction (INSERT: amount, payment_method, payment_status, transaction_id, paid_at), refund on rejection (UPDATE payment_status/refund_amount/refund_reason/refunded_at) — linked via `merchant_id` to `merchants` |
| `ad_fee_history` | Audit trail for admin rate modifications (INSERT: old/new rate, changed_by, changed_at), package history view (SELECT) |
| `merchants` | Merchant profile and license status verification |
| `shops` | Shop approval check (SELECT is_approved), Resolve merchant shop id (SELECT) |
| `users` | Approver reference (`approved_by` FK), admin identity for audit |

### 15.3 Related Document References

| Document ID | Document Name | Version | File Path |
|-------------|---------------|---------|-----------|
| SKM-REQ-001 | Requirements Definition | v2.11 | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` |
| SKM-DBS-001 | Database Design Specification | v2.5 | `docs/core-work/データベース設計書_DATABASE_SPEC.md` |
| SKM-DEV-001 | Development Rules | v2.1 | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` |

---

*End of Functional Specification (Advertisement Management)*
