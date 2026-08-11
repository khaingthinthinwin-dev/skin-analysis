# Functional Specification (機能設計書) — Advertisement Management

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-FDS-AD-001 |
| **Target Screen** | Advertisement Management (広告管理) |
| **Subsystem** | Advertisement — Shop Advertisement Management |
| **Function ID** | FN-AD-001 |
| **Version** | 1.1 |
| **Created** | 2026-08-05 |
| **Last Updated** | 2026-08-10 |
| **Author** | Software Architect |
| **Status** | Released (承認済み) |
| **Classification** | Internal — Engineering Division |


---

## Document Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-08-05 | Software Architect | Initial functional specification for Advertisement Management covering merchant ad creation, scheduling, image upload, status control, and platform display. |
| 1.1 | 2026-08-10 | Software Architect | Aligned with Requirement Spec v1.1 / Database Spec v1.1. Added admin approval workflow (M-AD-006), advertising fee payment (M-AD-007), weekly ad limit (M-AD-008), and announcement message (M-AD-009). Added `approval_status`, `payment_status`, `payment_amount`, `payment_reference`, `approved_by`, `approved_at`, `rejection_reason`, `week_number`, and `announcement_message` fields. |

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

This subsystem manages the complete lifecycle of shop advertisements within the Cosmetics Finder marketplace. It provides merchants with the ability to create, schedule, pay the advertising fee, submit for admin approval, activate/deactivate, and manage promotional banners tied to their approved shop. Admins approve or reject submitted advertisements with a reason, and only paid, approved, in-schedule advertisements are exposed to the storefront for platform-wide display (banner/image + announcement message).

The Advertisement Management subsystem connects merchant promotional intent with buyer visibility. Active, in-schedule, approved advertisements are served to the public storefront through a cacheable endpoint, ensuring consistent banner rendering without exposing merchant management operations. A weekly limit of 5 active advertisements is enforced platform-wide.

### 1.2 Functional Responsibilities

This subsystem is responsible for the following core functional areas:

1. **Advertisement Creation** — Merchants can create promotional advertisements with title, content, announcement message, optional image, optional click-through link, and schedule.
2. **Advertisement Scheduling** — Merchants can set start/end dates; advertisements are only displayed within the scheduled window.
3. **Ad Image Upload** — Merchants can upload an ad image (JPG, PNG, WebP, max 5MB) stored with UUID-based naming.
4. **Advertisement Management** — Merchants can list, search, filter, edit, and delete their own advertisements.
5. **Advertising Fee Payment** — Merchants must pay the advertising fee before the ad is submitted for approval. Payment transaction is recorded with amount, status, and reference.
6. **Admin Approval Workflow** — After verified payment, the ad enters `PENDING_APPROVAL`; admin approves or rejects with reason. Rejected ads can be edited and resubmitted.
7. **Weekly Ad Limit** — A maximum of 5 active advertisements per week is enforced platform-wide (Monday 00:00 to Sunday 23:59 UTC), validated before an ad is approved for display.
8. **Status Control** — Merchant-visible lifecycle (scheduled/active/inactive/expired) is derived from `is_active`, `approval_status`, `payment_status`, and the schedule.
9. **Soft Delete** — Deleting an advertisement sets `is_active = false`, retaining the record for history.
10. **Platform Display** — Paid, approved, active, in-schedule advertisements are exposed via a public endpoint for storefront banner and announcement message rendering.
11. **Cache Management** — Active ads are cached in Redis with a 5-minute TTL; cache is invalidated on any mutation.
12. **Audit Logging** — All advertisement mutations and approval/payment actions are logged for audit (90-day retention).

### 1.3 Target Users

| Attribute | Value |
|-----------|-------|
| **Primary Actor (Merchant)** | Authenticated merchant creating, paying for, and managing their shop's advertisements |
| **Primary Actor (Admin)** | Admin approving/rejecting advertisements and managing platform-wide ads |
| **Primary Actor (Buyer)** | Authenticated or unauthenticated visitor viewing platform banners |
| **Required Authentication** | JWT Bearer Token for merchant and admin operations; Public for active ad display |
| **Data Scope** | Merchant: own shop's ads only. Buyer: all active ads (public). Admin: all ads. |

### 1.4 Relationships with Other Functions and Peripheral Systems

```text
┌──────────────────────────┐      ┌─────────────────────────────────────┐
│   Merchant Actor         │      │     advertisements                  │
│   (Manages Ads)          ├─────►│  CRUD, schedule, image, payment,    │
└──────────────────────────┘      │  submit for approval               │
                                  └──────────────┬────────────────────┘
                                                 │ Reads/Writes
                                                 ▼
                                      ┌────────────────────────┐
                                      │  Advertisements Module │
                                      └──────────┬─────────────┘
                                                 │
                         ┌───────────────────────┼───────────────────────┐
                         ▼                       ▼                       ▼
              ┌──────────────────┐   ┌────────────────────┐   ┌──────────────────┐
              │  Shops           │   │  Redis Cache       │   │  Audit Log       │
              │  (is_approved    │   │  cache:ads:active  │   │  AD_CREATED /    │
              │   check)         │   │  (TTL 5 min)       │   │  AD_PAID /       │
              └──────────────────┘   └────────────────────┘   │  AD_APPROVED /   │
                                                              │  AD_REJECTED /   │
                         ┌────────────────────────────┐      │  AD_UPDATED /    │
                         │  Admin Actor               │      │  AD_DELETED      │
                         │  (Approve / Reject Ads)    │      └──────────────────┘
                         └─────────────┬──────────────┘
                                       │ approve/reject with reason
                                       ▼
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
| `title` | User Input | Advertisement title (required, max 200 chars) |
| `content` | User Input | Advertisement content/description (optional, max 5000 chars) |
| `announcementMessage` | User Input | Banner announcement message (required, max 500 chars) |
| `imageUrl` | File Upload | Ad image URL (JPG, PNG, WebP, max 5MB) |
| `linkUrl` | User Input | Click-through link URL (optional) |
| `isActive` | User Input | Advertisement active flag |
| `startsAt` | User Input | Schedule start timestamp |
| `expiresAt` | User Input | Schedule end timestamp |
| `paymentReference` | System / User Input | Payment transaction reference for ad fee |
| `page` / `limit` / `status` / `approvalStatus` | Query Parameter | Pagination and status filter for list view |
| `id` | Path Parameter | Advertisement ID (CUID) for update/delete |

| Output Information | Data Category | Destination / Description |
|--------------------|---------------|---------------------------|
| `advertisement` | Advertisement DTO | Full advertisement data (including approval/payment fields) |
| `advertisements` | Advertisement[] DTO | Paginated advertisement list |
| `meta` | Pagination Meta | Page, limit, total, totalPages |
| `activeAds` | Advertisement[] DTO | Active in-schedule approved ads for platform display |
| `pendingApprovalAds` | Advertisement[] DTO | Ads awaiting admin approval/rejection |

### 1.6 Related Documents

| No. | Document ID | Document Name | File Path / Reference | Remarks |
|-----|-------------|---------------|----------------------|---------|
| 1 | SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | M-AD-001~009, Merchant Shop Advertisement module, Advertisement Rules (4.6) |
| 2 | SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | `advertisements` table (v1.1 fields), indexes, check constraints |
| 3 | SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | Advertisement Rules (12.7), naming conventions, RBAC |

---

## 2. Use Cases and Business Workflow

### 2.1 Use Case Catalog

| UC-ID | Use Case Name | Precondition | Postcondition | Triggering Actor |
|-------|---------------|--------------|---------------|------------------|
| UC-AD-001 | Create Advertisement | Merchant is authenticated and has approved shop. | New advertisement record created in `advertisements` table linked to merchant's shop with `approval_status = pending`, `payment_status = pending`. | Merchant |
| UC-AD-002 | Schedule Advertisement | Merchant is authenticated. Shop is approved. | Advertisement has valid `starts_at`/`expires_at` schedule and `week_number` derived. | Merchant |
| UC-AD-003 | Upload Ad Image | Merchant is authenticated. Shop is approved. | Image uploaded and stored with UUID naming; `image_url` set. | Merchant |
| UC-AD-004 | List Own Advertisements | Merchant is authenticated. | Paginated list of merchant's own ads (with status/approval filter) displayed. | Merchant |
| UC-AD-005 | Update Advertisement | Merchant is authenticated. Ad belongs to merchant's shop. | Advertisement record updated. If ad was rejected, it returns to `pending` approval. | Merchant |
| UC-AD-006 | Delete Advertisement (Soft) | Merchant is authenticated. Ad belongs to merchant's shop. | Advertisement `is_active` set to false. Active ads cache invalidated. | Merchant |
| UC-AD-007 | Toggle Advertisement Active/Inactive | Merchant is authenticated. Ad belongs to merchant's shop. | Advertisement visibility toggled. | Merchant |
| UC-AD-008 | Display Active Advertisements | None (public). | Paid, approved, active, in-schedule advertisements returned for storefront display. | Buyer/Visitor |
| UC-AD-009 | Pay Advertising Fee | Merchant is authenticated. Ad created (draft). | Payment recorded with `payment_amount`/`payment_reference`; `payment_status` set to `paid`. | Merchant / Payment System |
| UC-AD-010 | Submit Advertisement for Approval | Merchant is authenticated. Ad has `payment_status = paid`. | Advertisement enters `approval_status = pending` for admin review. | Merchant |
| UC-AD-011 | Approve Advertisement | Admin is authenticated. Ad is pending approval and paid. | Weekly limit validated; ad `approval_status = approved`; `approved_by`/`approved_at` set; cache invalidated. | Admin |
| UC-AD-012 | Reject Advertisement | Admin is authenticated. Ad is pending approval. | Ad `approval_status = rejected`; `rejection_reason` stored; payment refunded automatically. | Admin |
| UC-AD-013 | Resubmit Rejected Advertisement | Merchant is authenticated. Ad is rejected. | Rejected ad edited and resubmitted; `approval_status` returns to `pending`. | Merchant |

### 2.2 Primary Business Workflow — Merchant Advertisement Management

```
                    ┌──────────────────────┐
                    │  Merchant Logs In    │
                    │  (JWT Authenticated) │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Merchant Dashboard  │
                    │  /merchant/ads       │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────────┐
              ▼                ▼                    ▼
   ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
   │ View Ad List    │ │ New Ad          │ │ Edit Ad         │
   │ (UC-AD-004)     │ │ (UC-AD-001)     │ │ (UC-AD-005)     │
   └────────┬────────┘ └────────┬────────┘ └────────┬────────┘
            │                   │                   │
            ▼                   ▼                   ▼
   ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
   │ Filter/Search   │ │ Fill Ad Form    │ │ Update Fields   │
   │ Ads             │ │ (Schedule,      │ │ & Schedule      │
   │                 │ │  announcement,  │ │  (editing a     │
   │                 │ │  image)         │ │  rejected ad    │
   │                 │ │                 │ │  → back to      │
   │                 │ │                 │ │  pending)       │
   └────────┬────────┘ └────────┬────────┘ └────────┬────────┘
            │                   │                   │
            │                   ▼                   ▼
            │          ┌─────────────────┐ ┌─────────────────┐
            │          │ Upload Image    │ │ Save Changes    │
            │          │ (UC-AD-003)     │ │ (UC-AD-005)     │
            │          └────────┬────────┘ └────────┬────────┘
            │                   │                   │
            │                   ▼                   ▼
            │          ┌─────────────────┐ ┌─────────────────┐
            │          │ Pay Ad Fee      │ │ Ad Draft Saved  │
            │          │ (UC-AD-009)     │ └────────┬────────┘
            │          └────────┬────────┘          │
            │                   │                   │
            │                   ▼                   │
            │          ┌─────────────────┐          │
            │          │ Submit for      │◄─────────┘
            │          │ Approval        │   (if paid)
            │          │ (UC-AD-010)     │
            │          └────────┬────────┘
            │                   │
            │                   ▼
            │          ┌─────────────────┐      ┌─────────────────┐
            │          │ PENDING         │─────►│ Admin           │
            │          │ APPROVAL        │      │ Approve /       │
            │          │                 │      │ Reject          │
            │          └────────┬────────┘      │ (UC-AD-011/012)│
            │                   │               └────────┬────────┘
            │                   │                        │
            │         approved  │                 ┌──────┴──────┐
            │         ┌─────────▼────────┐        │  rejected   │
            │         │ APPROVED (paid)  │        ▼            │
            │         │ Weekly limit     │  ┌─────────────────┐│
            │         │ validated (5/wk) │  │ REJECTED +     ││
            │         │ → displayable    │  │ refund (auto)  ││
            │         └─────────┬────────┘  └────────┬────────┘│
            │                   │                     │        │
            │                   │             edit & resubmit  │
            │                   │                     └────────┘
            │                   ▼
            │          ┌─────────────────┐
            │          │ Toggle Active/  │
            │          │ Inactive        │
            │          │ (UC-AD-007)     │
            │          └────────┬────────┘
            │                   │
            │                   ▼
            │          ┌─────────────────┐
            │          │ Delete Ad       │
            │          │ (Soft Delete)   │
            │          │ (UC-AD-006)     │
            │          └─────────────────┘
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
| 2 | Merchant clicks "New Ad" | — | Form Displayed | System |
| 3 | Merchant fills ad form (title, announcement, schedule, image) | — | — | Merchant |
| 4 | Merchant submits advertisement (draft) | — | `payment_status = pending`, `approval_status = pending` | System |
| 5 | Merchant pays advertising fee | `payment_status = pending` | `payment_status = paid` (amount, reference recorded) | Merchant / Payment System |
| 6 | Merchant submits for approval | `payment_status = paid` | `approval_status = pending` | Merchant |
| 7 | Admin reviews pending ad | `approval_status = pending` | — | Admin |
| 8a | Admin approves ad (weekly limit validated ≤ 5) | `approval_status = pending` | `approval_status = approved`, `approved_by`/`approved_at` set | Admin |
| 8b | Admin rejects ad with reason | `approval_status = pending` | `approval_status = rejected`, refund processed | Admin |
| 9 | Ad appears in merchant ad list with approval badge | — | — | System |
| 10 | Active ads cache invalidated | — | Cache Cleared | System |
| 11 | Buyer loads storefront | Public | — | Buyer |
| 12 | GET /ads/active returns approved, in-schedule active ads | — | Banners Served | System |
| 13 | Buyer clicks banner | — | Redirected to Link URL | System |

### 2.5 Relevant Requirements Covered

| Requirement ID | Requirement Summary |
|----------------|---------------------|
| M-AD-001 | Merchant can create shop advertisements |
| M-AD-002 | Merchant can set ad schedule (start/end date) |
| M-AD-003 | Merchant can upload ad images |
| M-AD-004 | Merchant can view/manage own ads |
| M-AD-005 | Active ads display on platform |
| M-AD-006 | Admin can approve/reject advertisements |
| M-AD-007 | Merchants must pay advertising fee before submission |
| M-AD-008 | Maximum 5 active advertisements per week |
| M-AD-009 | Advertisements display with banner/image and announcement message |

---

## 3. State Transition Specification

### 3.1 Advertisement Display States

| State | Description | Visible to Buyers | Can Edit | Can Delete |
|-------|-------------|:-----------------:|:--------:|:----------:|
| `DRAFT` | `approval_status = pending`, `payment_status = pending` | ✗ | ✓ | ✓ |
| `PENDING_APPROVAL` | `payment_status = paid`, `approval_status = pending` | ✗ | ✗ (unless rejected) | ✓ |
| `APPROVED` | `approval_status = approved`, `payment_status = paid` | depends on schedule + `is_active` | ✓ | ✓ |
| `REJECTED` | `approval_status = rejected` (refund processed) | ✗ | ✓ (resubmission) | ✓ |
| `SCHEDULED` | approved, `is_active = true` and `starts_at > now` | ✗ | ✓ | ✓ |
| `ACTIVE` | approved, `is_active = true`, `starts_at <= now <= expires_at` | ✓ | ✓ | ✓ |
| `INACTIVE` | `is_active = false` (hidden or soft deleted) | ✗ | ✓ | ✓ |
| `EXPIRED` | `expires_at < now` | ✗ | ✓ | ✓ |

### 3.2 Approval Status States (`approval_status`)

| State | DB Value | Description | Transition Allowed |
|-------|----------|-------------|-------------------|
| `PENDING` | `'pending'` | Awaiting admin review (draft or paid/submitted) | → `approved`, `rejected` |
| `APPROVED` | `'approved'` | Admin approved; displayable if paid, active, in-schedule | → (reject not allowed after approval) |
| `REJECTED` | `'rejected'` | Admin rejected with reason; refund auto-processed | → `pending` (edit + resubmit) |

### 3.3 Payment Status States (`payment_status`)

| State | DB Value | Description | Transition Allowed |
|-------|----------|-------------|-------------------|
| `PENDING` | `'pending'` | Advertising fee not yet paid | → `paid`, `failed` |
| `PAID` | `'paid'` | Fee paid and verified; required before approval submission | → `refunded` |
| `FAILED` | `'failed'` | Payment attempt failed | → `pending`, `paid` |
| `REFUNDED` | `'refunded'` | Auto-refunded on rejection | terminal |

### 3.4 Advertisement Lifecycle Transitions

| Transition ID | Origin State | Target State | Trigger Action | Guard Conditions |
|---------------|--------------|--------------|----------------|------------------|
| TR-AD-01 | — | `DRAFT` | Create ad (draft) | Valid data, shop approved, announcement message required |
| TR-AD-02 | `DRAFT` | `PENDING_APPROVAL` | Pay fee + submit for approval | `payment_status = paid`; weekly limit check at approval time |
| TR-AD-03 | `PENDING_APPROVAL` | `APPROVED` | Admin approves | Weekly limit ≤ 5 for target week |
| TR-AD-04 | `PENDING_APPROVAL` | `REJECTED` | Admin rejects with reason | Reason required; refund auto-processed |
| TR-AD-05 | `REJECTED` | `PENDING_APPROVAL` | Edit + resubmit | Ad belongs to merchant; new content valid |
| TR-AD-06 | `APPROVED` | `SCHEDULED` | Start time not yet reached | System time check |
| TR-AD-07 | `SCHEDULED` | `ACTIVE` | Start time reached | System time check |
| TR-AD-08 | `ACTIVE` | `EXPIRED` | End time passed | System time check |
| TR-AD-09 | `ACTIVE` | `INACTIVE` | Toggle active off | Ad belongs to merchant |
| TR-AD-10 | `INACTIVE` | `ACTIVE` | Toggle active on (in schedule) | Ad belongs to merchant, ad approved |
| TR-AD-11 | `ACTIVE` | `INACTIVE` | Soft delete | Ad belongs to merchant |
| TR-AD-12 | `EXPIRED` | `ACTIVE` | Extend `expires_at` / reschedule | New date range valid |

### 3.5 Cache States (Redis `cache:ads:active`)

| State | Description | TTL | Behavior |
|-------|-------------|:---:|----------|
| `CACHE_COLD` | No cached active ad list | — | Query DB (approved, paid, active, in-schedule), seed cache (5 min TTL) |
| `CACHE_WARM` | Cached active ad list available | 5 min | Serve cached response |
| `CACHE_INVALIDATED` | Mutation performed (create/update/delete/approve/reject) | — | `DEL cache:ads:active`, next request re-queries |

---

## 4. Business Rules

### 4.1 Advertisement Creation Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AD-001 | Required Fields | Ad must have: title, announcementMessage, startsAt, expiresAt. | Backend (DTO validation) + Frontend (Zod schema) |
| BR-AD-002 | Title Length | Title must be 1-200 characters. | Backend (DTO validation) + Frontend (Zod schema) |
| BR-AD-003 | Date Range | `expiresAt` must be strictly after `startsAt`. | Backend (DB constraint `chk_advertisements_dates`) |
| BR-AD-004 | Shop Approval | Merchant must have an approved shop (`is_approved = true`) before creating ads. | Backend (service check) |
| BR-AD-005 | Default Status | New ads default to `is_active = true`, `approval_status = pending`, `payment_status = pending` (draft). | Backend (service logic) |
| BR-AD-006 | Image Optional | Ads can be text-only or with image. | Backend (DTO validation) |
| BR-AD-007 | Link Optional | Click-through link URL is optional. | Backend (DTO validation) |
| BR-AD-024 | Announcement Message Required | `announcement_message` is required (max 500 chars) and displayed on the banner. | Backend (DTO validation) + DB (NOT NULL) |

### 4.2 Advertisement Schedule Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AD-008 | Schedule Required | Both `startsAt` and `expiresAt` are required. | Backend (DTO validation) |
| BR-AD-009 | Schedule Validity | `expires_at` > `starts_at` enforced by DB check constraint. | Backend (DB constraint `chk_advertisements_dates`) |
| BR-AD-010 | Active Window | An ad is active when `is_active = true` AND `approval_status = approved` AND `payment_status = paid` AND `starts_at <= now` AND `expires_at >= now`. | Backend (query filter) |
| BR-AD-025 | Week Number | `week_number` (ISO week) is derived from `starts_at` and stored for weekly limit tracking. | Backend (service logic) |

### 4.3 Advertisement Status Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AD-011 | Active Visibility | Only approved, paid, in-schedule active ads are served to buyers. | Backend (query filter) |
| BR-AD-012 | Soft Delete | Delete sets `is_active = false`, record is retained. | Backend (service logic) |
| BR-AD-013 | Expired Visibility | Expired ads hidden from buyers, visible to merchant. | Backend (role-based query) |
| BR-AD-014 | Derived Status | Display status (active/inactive/expired) derived client-side from `is_active`, `approval_status`, `payment_status`, and schedule; never persisted. | Frontend (display logic) |
| BR-AD-026 | Approval Status Enum | `approval_status` restricted to `pending/approved/rejected` via DB check constraint `chk_advertisements_approval_status`. | Backend (DB constraint) |
| BR-AD-027 | Payment Status Enum | `payment_status` restricted to `pending/paid/failed/refunded` via DB check constraint `chk_advertisements_payment_status`. | Backend (DB constraint) |

### 4.4 Advertisement Image Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AD-015 | File Size | Maximum 5MB per ad image. | Backend (file upload validation) |
| BR-AD-016 | File Types | Allowed: JPG, PNG, WebP. | Backend (MIME type validation) |
| BR-AD-017 | File Naming | UUID-based filenames `{uuid}.{ext}` to prevent conflicts. | Backend (upload service) |
| BR-AD-018 | Storage | Stored outside webroot, served via signed URLs or API endpoint. | Backend (storage service) |

### 4.5 Ownership Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AD-019 | Merchant Ownership | Ads belong to a shop; only the shop's merchant can manage them. | Backend (service check) |
| BR-AD-020 | Admin Override | Admins can manage and moderate all advertisements. | Backend (RBAC) |
| BR-AD-021 | Buyer Read-Only | Buyers can only view approved active ads via the public endpoint. | Backend (RBAC) |

### 4.6 Approval Workflow Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AD-028 | Approval Required | All advertisements require admin approval before display. | Backend (service logic) |
| BR-AD-029 | Submission Requires Payment | Ad only transitions to `PENDING_APPROVAL` after `payment_status = paid` is verified. | Backend (service logic) |
| BR-AD-030 | Approve/Reject with Reason | Admin approves or rejects; rejection requires `rejection_reason` and sets `approved_by`/`approved_at`. | Backend (service logic + DTO validation) |
| BR-AD-031 | Rejection Refund | Rejected ads trigger automatic refund; `payment_status` set to `refunded`. | Backend (payment service) |
| BR-AD-032 | Resubmission | Rejected ads can be edited and resubmitted, returning to `approval_status = pending`. | Backend (service logic) |

### 4.7 Payment Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AD-033 | Payment Required Before Submission | Merchants must pay the advertising fee before ad submission. | Backend (service logic) |
| BR-AD-034 | Payment Record | Payment transaction recorded with amount, status, and reference (`payment_amount`, `payment_reference`). | Backend (payment service) |
| BR-AD-035 | Payment Verification | Payment must be verified before ad transitions to `PENDING_APPROVAL`. | Backend (service logic) |

### 4.8 Weekly Ad Limit Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AD-036 | Weekly Limit | Maximum 5 active advertisements per week across all merchants. | Backend (service logic, query on `week_number`) |
| BR-AD-037 | Week Definition | Week runs Monday 00:00 to Sunday 23:59 (UTC); ISO week number used. | Backend (date utility) |
| BR-AD-038 | Limit Validation Timing | Limit validated before approving an ad for display (approval time). | Backend (service logic) |
| BR-AD-039 | Limit Exceeded Response | Approval blocked with `409 Conflict` and clear message when limit reached. | Backend (service logic) |

### 4.9 Cache Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AD-022 | Cache Key | Approved active ads cached under `cache:ads:active` with 5-minute TTL. | Backend (Redis cache) |
| BR-AD-023 | Cache Invalidation | Any mutation (create/update/delete/approve/reject) invalidates the active ads cache. | Backend (service logic) |

---

## 5. Screen Specifications

### 5.1 Screen: Advertisement Management (`/merchant/advertisements`)

**Purpose:** Allow merchants to view, create, schedule, and manage their shop's promotional advertisements.

#### 5.1.1 UI Elements

**Header & Summary:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-01 | Page Title | Heading (h5) | `merchant.ads.title` | Yes | "Advertisements" |
| EL-02 | Page Subtitle | Text | `merchant.ads.subtitle` | No | "Create, pay for and manage your shop's promotional banners." |
| EL-03 | New Ad Button | Button (primary) | `merchant.ads.new` | Yes | Open Create Advertisement dialog |
| EL-04 | Active Ads Stat | Card | `merchant.ads.statActive` | Yes | Number of currently running (approved) ads |
| EL-05 | Pending Approval Stat | Card | `merchant.ads.statPending` | Yes | Number of ads awaiting admin approval |
| EL-06 | Expired Stat | Card | `merchant.ads.statExpired` | Yes | Number of past campaigns |

**Toolbar:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-07 | Status Filter | Select | `merchant.ads.filterStatus` | No | Filter by all/active/inactive/expired |
| EL-07a | Approval Status Filter | Select | `merchant.ads.filterApproval` | No | Filter by all/pending/approved/rejected |
| EL-08 | Search Input | Input (text) | `merchant.ads.search` | No | Search within own ads |
| EL-09 | Export Button | Button (outline) | `merchant.ads.export` | No | Export ad list (CSV) |

**Advertisement Card:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-10 | Ad Thumbnail | Image | — | Yes | Ad image with BANNER tag overlay |
| EL-11 | Ad Title | Text | — | Yes | Advertisement title |
| EL-12 | Status Badge | Badge | — | Yes | Active/Inactive/Expired badge |
| EL-12a | Approval Status Badge | Badge | — | Yes | Pending/Approved/Rejected badge |
| EL-12b | Payment Status Badge | Badge | — | Yes | Paid/Pending/Failed/Refunded badge |
| EL-13 | Ad Content | Text | — | No | Advertisement content/description |
| EL-13a | Announcement Message | Text | — | Yes | Banner announcement message (truncated, tooltip for full) |
| EL-14 | Schedule Display | Text | — | Yes | "Aug 01, 2026 → Sep 15, 2026" |
| EL-15 | Link URL | Text | — | No | Click-through link display |
| EL-15a | Pay & Submit Button | Button (primary) | `merchant.ads.paySubmit` | No | Pay fee + submit for approval (shown when draft/pending payment) |
| EL-15b | Resubmit Button | Button (primary) | `merchant.ads.resubmit` | No | Edit + resubmit rejected ad |
| EL-15c | Rejection Reason | Alert (warning) | — | No | Displays `rejection_reason` on rejected ads |
| EL-16 | Edit Button | Button (ghost) | `common.edit` | Yes | Open edit dialog |
| EL-17 | Delete Button | Button (ghost, danger) | `common.delete` | Yes | Soft delete with confirmation |

**Pagination:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-18 | Page Info | Text | `common.pageInfo` | Yes | "Page 1 of 3 · 12 ads" |
| EL-19 | Prev Button | Button (outline) | `common.prev` | Yes | Previous page |
| EL-20 | Next Button | Button (primary) | `common.next` | Yes | Next page |

**Default State:**
- Ads loaded with pagination (20 per page)
- Sorted by newest first
- Status filter shows "All statuses"
- Loading skeleton during fetch

### 5.2 Screen: Create / Edit Advertisement (Dialog)

**Purpose:** Allow merchants to create or edit an advertisement with title, content, announcement message, image, link, schedule, and active flag.

#### 5.2.1 UI Elements

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-21 | Dialog Title | Heading (h5) | `merchant.ads.formTitle` | Yes | "Create Advertisement" / "Edit Advertisement" |
| EL-22 | Close Button | Button (icon) | — | No | Dismiss dialog |
| EL-23 | Title Input | Input (text) | `merchant.ads.title` | Yes | Advertisement title (max 200) |
| EL-24 | Content Input | Textarea | `merchant.ads.content` | No | Advertisement content (max 5000) |
| EL-24a | Announcement Message Input | Textarea | `merchant.ads.announcement` | Yes | Banner announcement message (max 500); shown on the displayed banner |
| EL-25 | Image Upload | File Upload | `merchant.ads.image` | No | JPG, PNG, WebP · max 5MB |
| EL-26 | Uploaded File | Text | — | No | Displays uploaded filename |
| EL-27 | Browse Files Button | Button (outline) | `merchant.ads.browse` | No | Open file picker |
| EL-28 | Link URL Input | Input (url) | `merchant.ads.linkUrl` | No | Click-through link URL |
| EL-29 | Start Date Input | Input (date) | `merchant.ads.startDate` | Yes | Schedule start date |
| EL-30 | End Date Input | Input (date) | `merchant.ads.endDate` | Yes | Schedule end date |
| EL-31 | Active Toggle | Switch | `merchant.ads.isActive` | Yes | "Visible to buyers during the scheduled period" |
| EL-32 | Cancel Button | Button (outline) | `common.cancel` | No | Close dialog without saving |
| EL-33 | Save Ad Button | Button (primary) | `merchant.ads.save` | Yes | Save draft; after save the ad appears with a "Pay & Submit" action |

**Default State (Create):**
- Title input auto-focused
- Active toggle ON by default
- End Date defaults to Start Date + 30 days
- Image upload zone empty (optional)

**Default State (Edit):**
- All fields populated with existing ad data
- Image preview shows current image
- Save button text changes to "Update Ad"

#### 5.2.2 Payment & Submission Panel

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-34 | Fee Summary | Text | `merchant.ads.fee` | Yes | Advertising fee amount displayed before payment (e.g., "Advertising Fee: $XX.XX") |
| EL-35 | Payment Status Text | Text | — | Yes | Shows `payment_status` (Pending / Paid / Failed / Refunded) |
| EL-36 | Pay Fee Button | Button (primary) | `merchant.ads.pay` | No | Invokes payment (stubbed); sets `payment_status = paid` |
| EL-37 | Submit for Approval Button | Button (primary) | `merchant.ads.submit` | No | Enabled only when `payment_status = paid`; sets `approval_status = pending` |
| EL-38 | Approval Status Text | Text | — | Yes | Shows `approval_status` (Pending / Approved / Rejected) and `rejection_reason` when rejected |

**Behavior:**
- The ad cannot be submitted for approval until the fee is paid (`payment_status = paid`).
- Once submitted, the ad is read-only for the merchant until admin decision.
- A rejected ad returns to editable state with the rejection reason shown; saving re-submits (back to pending).

### 5.3 Screen: Admin Advertisement Moderation (`/admin/advertisements`)

**Purpose:** Allow admins to review, approve, or reject advertisements submitted by merchants.

#### 5.3.1 UI Elements

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-40 | Page Title | Heading (h5) | `admin.ads.title` | Yes | "Advertisement Moderation" |
| EL-41 | Pending Queue | Card/Table | `admin.ads.pendingQueue` | Yes | Ads with `approval_status = pending`, `payment_status = paid` |
| EL-42 | Ad Preview | Card | — | Yes | Thumbnail, title, content, announcement message, schedule, link, shop name, fee/payment info |
| EL-43 | Approve Button | Button (success) | `admin.ads.approve` | Yes | Approve ad (validates weekly limit) |
| EL-44 | Reject Button | Button (destructive) | `admin.ads.reject` | Yes | Reject ad with reason |
| EL-45 | Rejection Reason Input | Textarea | `admin.ads.rejectReason` | No | Required reason shown when rejecting |
| EL-46 | All Ads Table | Table | `admin.ads.all` | No | All ads with filterable approval/payment status |

**Default State:**
- Shows pending approval queue first (sorted oldest first)
- Each pending ad shows full preview and approve/reject actions
- Weekly limit indicator: "X of 5 active ads this week"

---

## 6. Functional Operation Specification

### 6.1 Operation: Create Advertisement (Draft)

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Save Ad" button click in Create Advertisement dialog |
| **API Endpoint** | `POST /api/v1/ads` |
| **Request Content-Type** | `multipart/form-data` (when image attached) or `application/json` |
| **Pre-Submission Validation** | Full DTO validation (class-validator) + Zod schema |
| **Processing Steps** | 1. Validate JWT token and merchant role. 2. Resolve merchant's shop (GET /shops/merchant). 3. Verify shop exists and `is_approved = true`. 4. Validate all fields (title, announcement message, schedule, image). 5. Upload image (if provided). 6. Derive `week_number` from `starts_at`. 7. Create advertisement record with `shop_id`, `approval_status = pending`, `payment_status = pending`. 8. Invalidate active ads cache (`DEL cache:ads:active`). 9. Log `AD_CREATED` audit event. 10. Return created advertisement DTO. |
| **Success Response** | 201 Created with advertisement data |
| **Post-Action** | Close dialog, refresh ad list, show success toast. Ad appears as draft with "Pay & Submit" action. |

### 6.2 Operation: Pay Advertising Fee

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Pay Fee" button click on draft ad |
| **API Endpoint** | `POST /api/v1/ads/:id/pay` |
| **Request Content-Type** | `application/json` (payment info; payment gateway stubbed) |
| **Pre-Submission Validation** | Advertisement ownership check; ad must be in `payment_status = pending` |
| **Processing Steps** | 1. Validate `:id` as CUID format. 2. Validate JWT token and merchant role. 3. Find advertisement; verify ownership. 4. Confirm ad is not yet paid. 5. Process payment (stubbed) for `payment_amount` (configurable fee). 6. Record `payment_status = paid`, `payment_amount`, `payment_reference`. 7. Log `AD_PAID` audit event. 8. Return updated advertisement DTO. |
| **Success Response** | 200 OK with updated advertisement data |
| **Post-Action** | Enable "Submit for Approval" button; show success toast |

### 6.3 Operation: Submit Advertisement for Approval

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Submit for Approval" button click (requires `payment_status = paid`) |
| **API Endpoint** | `POST /api/v1/ads/:id/submit` |
| **Request Content-Type** | None |
| **Pre-Submission Validation** | Advertisement ownership check; `payment_status = paid` required |
| **Processing Steps** | 1. Validate `:id` as CUID format. 2. Validate JWT token and merchant role. 3. Find advertisement; verify ownership. 4. Verify `payment_status = paid`. 5. Set `approval_status = pending` (submit). 6. Invalidate active ads cache. 7. Notify admin of pending approval. 8. Log `AD_SUBMITTED` audit event. 9. Return updated advertisement DTO. |
| **Success Response** | 200 OK with updated advertisement data |
| **Post-Action** | Ad becomes read-only for merchant until admin decision |

### 6.4 Operation: Admin Approve Advertisement

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Approve" button click in admin moderation screen |
| **API Endpoint** | `POST /api/v1/admin/ads/:id/approve` |
| **Request Content-Type** | None |
| **Pre-Submission Validation** | Admin role; ad in `approval_status = pending` |
| **Processing Steps** | 1. Validate `:id` as CUID format. 2. Validate JWT token and admin role. 3. Find advertisement; verify `approval_status = pending`. 4. Validate weekly limit: count approved active ads with same `week_number`; if ≥ 5 return 409 Conflict. 5. Set `approval_status = approved`, `approved_by` (admin id), `approved_at` (now). 6. Invalidate active ads cache. 7. Log `AD_APPROVED` audit event. 8. Return updated advertisement DTO. |
| **Success Response** | 200 OK with updated advertisement data |
| **Post-Action** | Ad is eligible for storefront display within its schedule |

### 6.5 Operation: Admin Reject Advertisement

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Reject" button click (with reason) in admin moderation screen |
| **API Endpoint** | `POST /api/v1/admin/ads/:id/reject` |
| **Request Content-Type** | `application/json` (rejectionReason) |
| **Pre-Submission Validation** | Admin role; ad in `approval_status = pending`; reason required |
| **Processing Steps** | 1. Validate `:id` as CUID format. 2. Validate JWT token and admin role. 3. Find advertisement; verify `approval_status = pending`. 4. Validate `rejection_reason` (required). 5. Set `approval_status = rejected`, `approved_by`, `approved_at`, `rejection_reason`. 6. Trigger automatic refund → `payment_status = refunded`. 7. Invalidate active ads cache. 8. Log `AD_REJECTED` audit event. 9. Notify merchant of rejection and reason. 10. Return updated advertisement DTO. |
| **Success Response** | 200 OK with updated advertisement data |
| **Post-Action** | Merchant sees rejection reason; can edit + resubmit |

### 6.6 Operation: List Own Advertisements

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Navigate to `/merchant/advertisements` or apply filter/search |
| **API Endpoint** | `GET /api/v1/ads` |
| **Request Content-Type** | None (query parameters) |
| **Pre-Submission Validation** | Query params validated (page, limit, status, approvalStatus) |
| **Processing Steps** | 1. Validate query parameters. 2. Resolve merchant's shop id. 3. Build Prisma WHERE with `shop_id = <merchant shop id>`. 4. Apply status filter (active: `is_active = true` AND approved AND paid AND in schedule) and approval status filter. 5. Apply pagination via `idx_advertisements_shop_id`. 6. Return paginated response with meta. |
| **Success Response** | 200 OK with advertisement list and pagination meta |
| **Cache** | None (per-merchant, not cached) |

### 6.7 Operation: Update Advertisement

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Update Ad" button click in Edit Advertisement dialog |
| **API Endpoint** | `PATCH /api/v1/ads/:id` |
| **Request Content-Type** | `multipart/form-data` or `application/json` |
| **Pre-Submission Validation** | Full DTO validation, advertisement ownership check |
| **Processing Steps** | 1. Validate `:id` as CUID format. 2. Validate JWT token and merchant role. 3. Find advertisement by id. 4. Verify `advertisement.shop_id == merchant's shop id`. 5. Validate provided fields (expires_at > starts_at if both present). 6. Update advertisement record; recompute `week_number` if `starts_at` changed. 7. If ad was `rejected`, reset `approval_status = pending` for resubmission. 8. Invalidate active ads cache (`DEL cache:ads:active`). 9. Log `AD_UPDATED` audit event. 10. Return updated advertisement DTO. |
| **Success Response** | 200 OK with updated advertisement data |
| **Post-Action** | Close dialog, refresh ad list, show success toast |

### 6.8 Operation: Delete Advertisement (Soft Delete)

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Click delete button on ad card (with confirmation) |
| **API Endpoint** | `DELETE /api/v1/ads/:id` |
| **Request Content-Type** | None |
| **Pre-Submission Validation** | Advertisement ownership check |
| **Processing Steps** | 1. Validate `:id` as CUID format. 2. Validate JWT token and merchant role. 3. Find advertisement by id. 4. Verify `advertisement.shop_id == merchant's shop id`. 5. Set `is_active = false` (soft delete). 6. Invalidate active ads cache (`DEL cache:ads:active`). 7. Log `AD_DELETED` audit event. 8. Return soft-deleted ad info. |
| **Success Response** | 200 OK with `{ id, isActive: false }` |
| **Post-Action** | Remove ad from list view, show success toast |

### 6.9 Operation: List Active Advertisements (Public)

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Storefront load / banner carousel render |
| **API Endpoint** | `GET /api/v1/ads/active` |
| **Request Content-Type** | None |
| **Pre-Submission Validation** | None (public route) |
| **Processing Steps** | 1. `@Public()` route (no JWT required). 2. Check Redis cache `cache:ads:active`. 3. On cache miss: query `WHERE is_active = true AND approval_status = 'approved' AND payment_status = 'paid' AND starts_at <= now() AND expires_at >= now() ORDER BY created_at DESC`. 4. Seed Redis cache with 5-minute TTL. 5. Return active ad list (banner/image + announcement message). |
| **Success Response** | 200 OK with active advertisement list |
| **Cache** | Redis: `cache:ads:active` TTL 5 minutes |

### 6.10 Operation: List Pending Advertisements (Admin)

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Admin navigates to `/admin/advertisements` |
| **API Endpoint** | `GET /api/v1/admin/ads?approvalStatus=pending` |
| **Request Content-Type** | None (query parameters) |
| **Pre-Submission Validation** | Admin role |
| **Processing Steps** | 1. Validate query parameters. 2. Query ads with `approval_status = pending` (and `payment_status = paid`) via `idx_advertisements_approval_status` + `idx_advertisements_payment_status`. 3. Include shop name and payment info. 4. Return paginated list. |
| **Success Response** | 200 OK with paginated pending ad list |
| **Cache** | None |

---

## 7. Input / Output Specification

### 7.1 Input Specification — Create Advertisement (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `title` | Title | タイトル | VARCHAR(200) | Yes | Input (text) | `@IsString()`, `@IsNotEmpty()`, `@MaxLength(200)` |
| `content` | Content | 内容 | TEXT | No | Textarea | `@IsString()`, `@IsOptional()`, `@MaxLength(5000)` |
| `announcementMessage` | Announcement Message | 告知メッセージ | VARCHAR(500) | Yes | Textarea | `@IsString()`, `@IsNotEmpty()`, `@MaxLength(500)` |
| `imageUrl` | Image | 画像 | VARCHAR(500) | No | File Upload | `@IsUrl()`, `@IsOptional()`, `@MaxLength(500)`, JPG/PNG/WebP, max 5MB |
| `linkUrl` | Link URL | リンクURL | VARCHAR(500) | No | Input (url) | `@IsUrl()`, `@IsOptional()`, `@MaxLength(500)` |
| `isActive` | Active | 有効フラグ | BOOLEAN | No | Switch | `@IsBoolean()`, `@IsOptional()`, default true |
| `startsAt` | Start Date | 開始日時 | TIMESTAMPTZ | Yes | Input (datetime) | `@IsDateString()` |
| `expiresAt` | End Date | 終了日時 | TIMESTAMPTZ | Yes | Input (datetime) | `@IsDateString()`, must be after `startsAt` |

> Note: `approval_status`, `payment_status`, `payment_amount`, `payment_reference`, `week_number`, `approved_by`, `approved_at`, and `rejection_reason` are system-managed and never accepted from the merchant input.

### 7.2 Input Specification — Update Advertisement (入力定義)

Same as Create Advertisement, with all fields optional (partial update).

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
| `POST /admin/ads/:id/reject` | `rejectionReason` | String | Yes | `@IsString()`, `@IsNotEmpty()`, `@MaxLength(2000)` |
| `POST /ads/:id/pay` | `paymentReference` | String | No | `@IsString()`, `@IsOptional()`, `@MaxLength(100)` |

### 7.5 Output Specification — Advertisement (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `id` | `advertisements.id` | CUID string |
| `shopId` | `advertisements.shop_id` | CUID string |
| `title` | `advertisements.title` | String |
| `content` | `advertisements.content` | String or null |
| `announcementMessage` | `advertisements.announcement_message` | String |
| `imageUrl` | `advertisements.image_url` | URL string or null |
| `linkUrl` | `advertisements.link_url` | URL string or null |
| `isActive` | `advertisements.is_active` | Boolean |
| `approvalStatus` | `advertisements.approval_status` | 'pending' / 'approved' / 'rejected' |
| `paymentStatus` | `advertisements.payment_status` | 'pending' / 'paid' / 'failed' / 'refunded' |
| `paymentAmount` | `advertisements.payment_amount` | Decimal string or null |
| `paymentReference` | `advertisements.payment_reference` | String or null |
| `approvedBy` | `advertisements.approved_by` | CUID string or null |
| `approvedAt` | `advertisements.approved_at` | ISO 8601 timestamp or null |
| `rejectionReason` | `advertisements.rejection_reason` | String or null |
| `weekNumber` | `advertisements.week_number` | Integer (ISO week) |
| `startsAt` | `advertisements.starts_at` | ISO 8601 timestamp |
| `expiresAt` | `advertisements.expires_at` | ISO 8601 timestamp |
| `createdAt` | `advertisements.created_at` | ISO 8601 timestamp |

### 7.6 Output Specification — Active Advertisement (Public, 出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `id` | `advertisements.id` | CUID string |
| `shopId` | `advertisements.shop_id` | CUID string |
| `title` | `advertisements.title` | String |
| `content` | `advertisements.content` | String or null |
| `announcementMessage` | `advertisements.announcement_message` | String (banner announcement) |
| `imageUrl` | `advertisements.image_url` | URL string or null |
| `linkUrl` | `advertisements.link_url` | URL string or null |
| `startsAt` | `advertisements.starts_at` | ISO 8601 timestamp |
| `expiresAt` | `advertisements.expires_at` | ISO 8601 timestamp |

---

## 8. Input Validation Rules

### 8.1 Advertisement Creation Validation (Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `title` | Required, 1-200 chars | "Title is required" / "Title must not exceed 200 characters" | "タイトルは必須です" / "タイトルは200文字以内で入力してください" |
| `content` | Optional, max 5000 chars | "Content must not exceed 5000 characters" | "内容は5000文字以内で入力してください" |
| `announcementMessage` | Required, max 500 chars | "Announcement message is required" / "Announcement message must not exceed 500 characters" | "告知メッセージは必須です" / "告知メッセージは500文字以内で入力してください" |
| `imageUrl` | Optional, valid URL, max 500 chars, JPG/PNG/WebP only, max 5MB | "Invalid image URL" / "Image URL must not exceed 500 characters" / "Only JPG, PNG, and WebP images are supported" / "Image file must not exceed 5MB" | "画像URLが無効です" / "画像URLは500文字以内で入力してください" / "JPG、PNG、WebP形式の画像のみサポートされています" / "画像ファイルは5MB以下である必要があります" |
| `linkUrl` | Optional, valid URL, max 500 chars | "Invalid link URL" / "Link URL must not exceed 500 characters" | "リンクURLが無効です" / "リンクURLは500文字以内で入力してください" |
| `isActive` | Optional, must be boolean, default true | "Active flag must be a boolean" | "有効フラグは真偽値で指定してください" |
| `startsAt` | Required, valid datetime | "Start date is required" / "Invalid start date" | "開始日時は必須です" / "開始日時が無効です" |
| `expiresAt` | Required, valid datetime, after startsAt | "End date is required" / "End date must be after start date" | "終了日時は必須です" / "終了日時は開始日時より後の日時を入力してください" |

### 8.2 Schedule Date Validation

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `expiresAt` | Must be strictly after `startsAt` | "End date must be after start date" | "終了日時は開始日時より後の日時を入力してください" |
| `startsAt` / `expiresAt` | DB check constraint `chk_advertisements_dates` | "Advertisement dates are invalid" | "広告期間が不正です" |

### 8.3 Approval / Payment / Weekly Limit Validation

| Field / Rule | Validation Rule | Error Message (EN) | Error Message (JA) |
|--------------|-----------------|--------------------|--------------------|
| `approvalStatus` | Enum `pending/approved/rejected` (DB constraint `chk_advertisements_approval_status`) | "Invalid approval status" | "承認状態が不正です" |
| `paymentStatus` | Enum `pending/paid/failed/refunded` (DB constraint `chk_advertisements_payment_status`) | "Invalid payment status" | "支払い状態が不正です" |
| `rejectionReason` | Required when rejecting | "Rejection reason is required" | "却下理由は必須です" |
| Submit action | Requires `payment_status = paid` | "Advertising fee must be paid before submission" | "提出前に広告料金をお支払いください" |
| Weekly limit | Max 5 approved active ads per week | "Weekly advertisement limit reached (max 5)" | "今週の広告枠上限(5件)に達しました" |

### 8.4 Validation Enforcement Layers

1. **Frontend (Client)**: React Hook Form + Zod schema validation with real-time feedback (date-range refine on `expiresAt > startsAt`).
2. **Backend (Server)**: NestJS ValidationPipe + class-validator DTOs on all endpoints; service-level checks for payment/approval/weekly-limit rules.
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
  "path": "/api/v1/ads/clx1234567890"
}
```

### 9.2 Error Classification Table — Advertisement Operations

| HTTP Status | Error Code | Scenario | User-Facing Behavior |
|-------------|------------|----------|---------------------|
| `400` | `BAD_REQUEST` | Validation failures (incl. missing `rejectionReason`, missing `announcementMessage`) | Field-level inline errors + top banner |
| `401` | `UNAUTHORIZED` | Missing or invalid JWT | Redirect to login |
| `403` | `FORBIDDEN` | Not merchant/admin, not ad owner, or shop not approved | "Shop is not approved" / "You don't have permission to manage this ad" |
| `404` | `NOT_FOUND` | Advertisement not found | "Advertisement not found" with refresh option |
| `409` | `CONFLICT` | `expires_at <= starts_at` | "Invalid schedule dates" with inline date error |
| `409` | `WEEKLY_LIMIT_REACHED` | Weekly ad limit (5/week) reached on approve | "Weekly advertisement limit reached (max 5)" |
| `422` | `UNPROCESSABLE_ENTITY` | Submit without payment / approve non-pending ad | "Advertising fee must be paid before submission" |
| `413` | `PAYLOAD_TOO_LARGE` | Ad image file > 5MB | "Image file must not exceed 5MB" |
| `415` | `UNSUPPORTED_MEDIA_TYPE` | Invalid image format | "Only JPG, PNG, and WebP images are supported" |
| `429` | `TOO_MANY_REQUESTS` | Rate limit exceeded | "Too many requests. Please wait {seconds} seconds" |
| `500` | `INTERNAL_SERVER_ERROR` | Server error (incl. payment verification failure) | "Something went wrong. Please try again" |

### 9.3 Frontend Error Display Behavior

- **Field-Level Validation**: Red border and inline text below invalid input.
- **Form-Level Summary**: Alert banner at top of form listing all errors.
- **Toast Notifications**: Used for API errors and successful actions.
- **Loading States**: Spinner on submit buttons during API calls.
- **Empty States**: Illustrated message when no ads match the current filter/search.
- **Confirm Dialog**: Delete requires confirmation before the soft-delete API call.

---

## 10. Permission and Access Control

### 10.1 Authentication Requirements

- JSON Web Token (JWT) Bearer Token passed via `Authorization` header for merchant operations.
- Public endpoint (active ad display) requires no authentication.

### 10.2 Public vs Protected Endpoints

| Endpoint | Access Level | Description |
|----------|-------------|-------------|
| `POST /ads` | Protected (Merchant/Admin) | Create advertisement (draft) |
| `GET /ads` | Protected (Merchant/Admin) | List own advertisements |
| `PATCH /ads/:id` | Protected (Merchant/Admin) | Update advertisement |
| `DELETE /ads/:id` | Protected (Merchant/Admin) | Delete advertisement (soft delete) |
| `POST /ads/:id/pay` | Protected (Merchant/Admin) | Pay advertising fee |
| `POST /ads/:id/submit` | Protected (Merchant/Admin) | Submit advertisement for approval |
| `GET /admin/ads` | Protected (Admin) | List all ads / pending approval queue |
| `POST /admin/ads/:id/approve` | Protected (Admin) | Approve advertisement |
| `POST /admin/ads/:id/reject` | Protected (Admin) | Reject advertisement (with reason + refund) |
| `GET /ads/active` | Public | List active approved ads for platform display |

### 10.3 Role-Based Access

| Role | View Own Ads | Create Ads | Edit Ads | Delete Ads | Pay Fee / Submit | Approve / Reject | View Active Ads (Public) |
|------|:------------:|:----------:|:--------:|:----------:|:----------------:|:----------------:|:------------------------:|
| `buyer` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| `merchant` | ✓ (own shop) | ✓ (own shop) | ✓ (own shop) | ✓ (own shop) | ✓ (own shop) | ✗ | ✓ |
| `admin` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

### 10.4 Ownership Enforcement

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('merchant', 'admin')
@Controller('ads')
export class AdvertisementsController {
  // POST /, GET /, PATCH /:id, DELETE /:id, POST /:id/pay, POST /:id/submit
  //   guarded by roles above + ownership checks

  @Public()
  @Get('active')
  findActive() { ... }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/ads')
export class AdminAdvertisementsController {
  // GET /, POST /:id/approve, POST /:id/reject (admin only)
}
```

Merchants can only read/update/delete/pay/submit ads whose `shop_id` matches their own shop. Attempts to access another merchant's ad MUST return `403 Forbidden`. Admin bypasses ownership checks. Approve/reject endpoints MUST require `admin` role only.

### 10.5 Security Audit Logging

| Event | Data Logged | Retention |
|-------|-------------|-----------|
| `AD_CREATED` | shopId, adId, merchantId, timestamp | 90 days |
| `AD_PAID` | shopId, adId, amount, reference, timestamp | 90 days |
| `AD_SUBMITTED` | shopId, adId, merchantId, timestamp | 90 days |
| `AD_APPROVED` | shopId, adId, adminId, timestamp | 90 days |
| `AD_REJECTED` | shopId, adId, adminId, reason, timestamp | 90 days |
| `AD_UPDATED` | shopId, adId, changed fields, timestamp | 90 days |
| `AD_DELETED` | shopId, adId, merchantId, timestamp | 90 days |

---

## 11. Real-Time Notification Behavior

### 11.1 Current Implementation

The Advertisement Management screen does not require WebSocket connections. Advertisement status (pending/approved/rejected, active/inactive/expired) is derived from schedule data and refreshed through standard query invalidation (TanStack Query) after mutations.

### 11.2 Notification Events

| Event | Trigger | Recipient | Action |
|-------|---------|-----------|--------|
| `AD_SUBMITTED` | Merchant submits ad for approval | Admin | Pending approval badge / notification in admin dashboard |
| `AD_APPROVED` | Admin approves ad | Merchant | Notification + ad becomes displayable (cache refresh ≤ 5 min) |
| `AD_REJECTED` | Admin rejects ad | Merchant | Notification with `rejection_reason`; refund processed |
| `AD_ACTIVATED` | Ad start time reached / toggled active | — | Appears on storefront after `cache:ads:active` refresh (max 5 min) |
| `AD_EXPIRED` | `expires_at` passed | — | Disappears from storefront after cache refresh |
| `AD_MUTATED` | Create/update/delete | — | Cache invalidated immediately; next `GET /ads/active` re-queries DB |

---

## 12. Screen Transition Specification

### 12.1 Inbound Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| Merchant dashboard | `/merchant/advertisements` | Click "Advertisements" menu |
| Admin dashboard | `/admin/advertisements` | Click "Advertisement Moderation" menu |
| Any protected route (unauthenticated) | `/login` | No valid access token |

### 12.2 Internal Navigation

| Source | Target | Trigger |
|--------|--------|---------|
| `/merchant/advertisements` | Create/Edit Dialog (modal) | Click "New Ad" / "Edit" |
| Create/Edit Dialog | `/merchant/advertisements` | Click "Cancel" or save success |
| `/admin/advertisements` | Approve/Reject Dialog (modal) | Click "Approve" / "Reject" |

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
| Create/Update Ad API | ≤ 1 second |
| Pay Fee / Submit API | ≤ 2 seconds |
| Approve / Reject Ad API | ≤ 1 second |
| Delete Ad API | ≤ 500 milliseconds |
| Active Ads API (cache hit) | ≤ 100 milliseconds |
| Active Ads API (cache miss) | ≤ 500 milliseconds |
| Ad Image Upload (5MB) | ≤ 3 seconds |

### 13.2 Caching Strategy

| Cache Key | TTL | Invalidation Trigger |
|-----------|-----|---------------------|
| `cache:ads:active` | 5 minutes | Any ad create/update/delete/approve/reject/payment-status change |

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
| `AD_IMAGE_MAX_SIZE_MB` | `5` | Maximum ad image file size in MB |
| `AD_IMAGE_ALLOWED_TYPES` | `['image/jpeg', 'image/png', 'image/webp']` | Allowed MIME types for ad images |
| `AD_IMAGE_STORAGE_PATH` | `./uploads/ads` | Directory to store uploaded ad images |
| `AD_ACTIVE_CACHE_TTL_SECONDS` | `300` | Active ads cache TTL (5 min) |
| `AD_ACTIVE_CACHE_KEY` | `cache:ads:active` | Redis key for active ads cache |
| `AD_FEE_AMOUNT` | `50.00` | Advertising fee required per ad submission |
| `AD_WEEKLY_LIMIT` | `5` | Maximum active advertisements per week (platform-wide) |
| `AD_ANNOUNCEMENT_MAX_LENGTH` | `500` | Maximum length of announcement message |

---

## 15. Cross-Reference Traceability Matrix

### 15.1 Requirements Definition Traceability

| Requirement ID | Requirement Description | Covered By (This Document) |
|----------------|-------------------------|----------------------------|
| M-AD-001 | Merchant can create shop advertisements | UC-AD-001, Sec 6.1 |
| M-AD-002 | Merchant can set ad schedule (start/end date) | UC-AD-002, BR-AD-008~010, BR-AD-025, Sec 8.2 |
| M-AD-003 | Merchant can upload ad images | UC-AD-003, BR-AD-015~018, Sec 7.1 |
| M-AD-004 | Merchant can view/manage own ads | UC-AD-004, Sec 5.1, Sec 6.6~6.8 |
| M-AD-005 | Active ads display on platform | UC-AD-008, Sec 6.9, Sec 11.2 |
| M-AD-006 | Admin can approve/reject advertisements | UC-AD-011/012, BR-AD-028~032, Sec 5.3, Sec 6.4~6.5, Sec 6.10 |
| M-AD-007 | Merchants must pay advertising fee before submission | UC-AD-009/010, BR-AD-029/033~035, Sec 6.2~6.3 |
| M-AD-008 | Maximum 5 active advertisements per week | BR-AD-036~039, Sec 6.4 (step 4), Sec 8.3 |
| M-AD-009 | Advertisements display with banner/image and announcement message | BR-AD-024, EL-24a/EL-13a, Sec 7.6 |

### 15.2 Database Design Traceability

| Database Table | Relevant Functional Operations |
|----------------|-------------------------------|
| `advertisements` | Create (INSERT), List (SELECT+WHERE), Update (SELECT+UPDATE), Soft delete (UPDATE is_active), Pay (UPDATE payment_status/payment_amount/payment_reference), Submit/Approve/Reject (UPDATE approval_status/approved_by/approved_at/rejection_reason), Active display (SELECT+WHERE approved+paid+in-schedule), Weekly limit (SELECT count by week_number) |
| `shops` | Shop approval check (SELECT is_approved), Resolve merchant shop id (SELECT) |
| `users` | Approver reference (`approved_by` FK), admin identity for audit |

### 15.3 Related Document References

| Document ID | Document Name | File Path |
|-------------|---------------|-----------|
| SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` |
| SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` |
| SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` |

---

*End of Functional Specification (Advertisement Management)*
