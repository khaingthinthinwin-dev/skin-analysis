# Functional Specification (機能設計書) — Advertisement Management

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-FDS-AD-001 |
| **Target Screen** | Advertisement Management (広告管理) |
| **Subsystem** | Advertisement — Shop Advertisement Management |
| **Function ID** | FN-AD-001 |
| **Version** | 1.0 |
| **Created** | 2026-08-05 |
| **Last Updated** | 2026-08-07 |
| **Author** | Software Architect |
| **Status** | Released (承認済み) |
| **Classification** | Internal — Engineering Division |

---

## Document Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-08-05 | Software Architect | Initial functional specification for Advertisement Management covering merchant ad creation, scheduling, image upload, status control, and platform display. |

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

This subsystem manages the complete lifecycle of shop advertisements within the Cosmetics Finder marketplace. It provides merchants with the ability to create, schedule, activate/deactivate, and manage promotional banners tied to their approved shop, while exposing active advertisements to the storefront for platform-wide display.

The Advertisement Management subsystem connects merchant promotional intent with buyer visibility. Active, in-schedule advertisements are served to the public storefront through a cacheable endpoint, ensuring consistent banner rendering without exposing merchant management operations.

### 1.2 Functional Responsibilities

This subsystem is responsible for the following core functional areas:

1. **Advertisement Creation** — Merchants can create promotional advertisements with title, content, optional image, optional click-through link, and schedule.
2. **Advertisement Scheduling** — Merchants can set start/end dates; advertisements are only displayed within the scheduled window.
3. **Ad Image Upload** — Merchants can upload an ad image (JPG, PNG, WebP, max 5MB) stored with UUID-based naming.
4. **Advertisement Management** — Merchants can list, search, filter, edit, and delete their own advertisements.
5. **Status Control** — Merchants can toggle advertisements active/inactive; status (active/inactive/expired) is derived from `is_active` and the schedule.
6. **Soft Delete** — Deleting an advertisement sets `is_active = false`, retaining the record for history.
7. **Platform Display** — Active, in-schedule advertisements are exposed via a public endpoint for storefront banner rendering.
8. **Cache Management** — Active ads are cached in Redis with a 5-minute TTL; cache is invalidated on any mutation.
9. **Audit Logging** — All advertisement mutations are logged for audit (90-day retention).

### 1.3 Target Users

| Attribute | Value |
|-----------|-------|
| **Primary Actor (Merchant)** | Authenticated merchant managing their shop's advertisements |
| **Primary Actor (Buyer)** | Authenticated or unauthenticated visitor viewing platform banners |
| **Primary Actor (Admin)** | Admin with platform-wide advertisement access |
| **Required Authentication** | JWT Bearer Token for merchant operations; Public for active ad display |
| **Data Scope** | Merchant: own shop's ads only. Buyer: all active ads (public). Admin: all ads. |

### 1.4 Relationships with Other Functions and Peripheral Systems

```text
┌──────────────────────────┐      ┌─────────────────────────────────────┐
│   Merchant Actor         │      │     advertisements                  │
│   (Manages Ads)          ├─────►│  CRUD operations, schedule, image   │
└──────────────────────────┘      └──────────────┬────────────────────┘
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
              │   check)         │   │  (TTL 5 min)       │   │  AD_UPDATED /    │
              └──────────────────┘   └────────────────────┘   │  AD_DELETED      │
                                                              └──────────────────┘
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
| `imageUrl` | File Upload | Ad image URL (JPG, PNG, WebP, max 5MB) |
| `linkUrl` | User Input | Click-through link URL (optional) |
| `isActive` | User Input | Advertisement active flag |
| `startsAt` | User Input | Schedule start timestamp |
| `expiresAt` | User Input | Schedule end timestamp |
| `page` / `limit` / `status` | Query Parameter | Pagination and status filter for list view |
| `id` | Path Parameter | Advertisement ID (CUID) for update/delete |

| Output Information | Data Category | Destination / Description |
|--------------------|---------------|---------------------------|
| `advertisement` | Advertisement DTO | Full advertisement data |
| `advertisements` | Advertisement[] DTO | Paginated advertisement list |
| `meta` | Pagination Meta | Page, limit, total, totalPages |
| `activeAds` | Advertisement[] DTO | Active in-schedule ads for platform display |

### 1.6 Related Documents

| No. | Document ID | Document Name | File Path / Reference | Remarks |
|-----|-------------|---------------|----------------------|---------|
| 1 | SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | M-AD-001~005, Merchant Shop Advertisement module |
| 2 | SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | `advertisements` table, indexes, check constraints |
| 3 | SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | Advertisement Rules (12.7), naming conventions, RBAC |

---

## 2. Use Cases and Business Workflow

### 2.1 Use Case Catalog

| UC-ID | Use Case Name | Precondition | Postcondition | Triggering Actor |
|-------|---------------|--------------|---------------|------------------|
| UC-AD-001 | Create Advertisement | Merchant is authenticated and has approved shop. | New advertisement record created in `advertisements` table linked to merchant's shop. Active ads cache invalidated. | Merchant |
| UC-AD-002 | Schedule Advertisement | Merchant is authenticated. Shop is approved. | Advertisement has valid `starts_at`/`expires_at` schedule. | Merchant |
| UC-AD-003 | Upload Ad Image | Merchant is authenticated. Shop is approved. | Image uploaded and stored with UUID naming; `image_url` set. | Merchant |
| UC-AD-004 | List Own Advertisements | Merchant is authenticated. | Paginated list of merchant's own ads (with status filter) displayed. | Merchant |
| UC-AD-005 | Update Advertisement | Merchant is authenticated. Ad belongs to merchant's shop. | Advertisement record updated. Active ads cache invalidated. | Merchant |
| UC-AD-006 | Delete Advertisement (Soft) | Merchant is authenticated. Ad belongs to merchant's shop. | Advertisement `is_active` set to false. Active ads cache invalidated. | Merchant |
| UC-AD-007 | Toggle Advertisement Active/Inactive | Merchant is authenticated. Ad belongs to merchant's shop. | Advertisement visibility toggled. | Merchant |
| UC-AD-008 | Display Active Advertisements | None (public). | Active, in-schedule advertisements returned for storefront display. | Buyer/Visitor |

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
   │ Ads             │ │ (Schedule/Image)│ │ & Schedule      │
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
            │          │ Submit Ad       │ │ Cache Invalidated│
            │          │ (UC-AD-001)     │ │ Ad Updated      │
            │          └────────┬────────┘ └─────────────────┘
            │                   │
            │                   ▼
            │          ┌─────────────────┐
            │          │ Ad Created      │
            │          │ in Database     │
            │          └─────────────────┘
            │
            ▼
   ┌─────────────────┐
   │ Toggle Active/  │
   │ Inactive        │
   │ (UC-AD-007)     │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │ Delete Ad       │
   │ (Soft Delete)   │
   │ (UC-AD-006)     │
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
| 2 | Merchant clicks "New Ad" | — | Form Displayed | System |
| 3 | Merchant fills ad form (title, schedule, image) | — | — | Merchant |
| 4 | Merchant submits advertisement | — | Ad Created | System |
| 5 | Ad appears in merchant ad list | — | — | System |
| 6 | Active ads cache invalidated | — | Cache Cleared | System |
| 7 | Buyer loads storefront | Public | — | Buyer |
| 8 | GET /ads/active returns in-schedule active ads | — | Banners Served | System |
| 9 | Buyer clicks banner | — | Redirected to Link URL | System |

### 2.5 Relevant Requirements Covered

| Requirement ID | Requirement Summary |
|----------------|---------------------|
| M-AD-001 | Merchant can create shop advertisements |
| M-AD-002 | Merchant can set ad schedule (start/end date) |
| M-AD-003 | Merchant can upload ad images |
| M-AD-004 | Merchant can view/manage own ads |
| M-AD-005 | Active ads display on platform |

---

## 3. State Transition Specification

### 3.1 Advertisement States

| State | Description | Visible to Buyers | Can Edit | Can Delete |
|-------|-------------|:-----------------:|:--------:|:----------:|
| `SCHEDULED` | `is_active = true` and `starts_at > now` | ✗ | ✓ | ✓ |
| `ACTIVE` | `is_active = true`, `starts_at <= now <= expires_at` | ✓ | ✓ | ✓ |
| `INACTIVE` | `is_active = false` (hidden or soft deleted) | ✗ | ✓ | ✓ |
| `EXPIRED` | `expires_at < now` | ✗ | ✓ | ✓ |

### 3.2 Advertisement Lifecycle Transitions

| Transition ID | Origin State | Target State | Trigger Action | Guard Conditions |
|---------------|--------------|--------------|----------------|------------------|
| TR-AD-01 | — | `SCHEDULED` | Create ad with future start date | Valid data, shop approved |
| TR-AD-02 | `SCHEDULED` | `ACTIVE` | Start time reached | System time check |
| TR-AD-03 | `ACTIVE` | `EXPIRED` | End time passed | System time check |
| TR-AD-04 | `ACTIVE` | `INACTIVE` | Toggle active off | Ad belongs to merchant |
| TR-AD-05 | `INACTIVE` | `ACTIVE` | Toggle active on (in schedule) | Ad belongs to merchant |
| TR-AD-06 | `ACTIVE` | `INACTIVE` | Soft delete | Ad belongs to merchant |
| TR-AD-07 | `EXPIRED` | `ACTIVE` | Extend `expires_at` / reschedule | New date range valid |

### 3.3 Cache States (Redis `cache:ads:active`)

| State | Description | TTL | Behavior |
|-------|-------------|:---:|----------|
| `CACHE_COLD` | No cached active ad list | — | Query DB, seed cache (5 min TTL) |
| `CACHE_WARM` | Cached active ad list available | 5 min | Serve cached response |
| `CACHE_INVALIDATED` | Mutation performed (create/update/delete) | — | `DEL cache:ads:active`, next request re-queries |

---

## 4. Business Rules

### 4.1 Advertisement Creation Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AD-001 | Required Fields | Ad must have: title, startsAt, expiresAt. | Backend (DTO validation) + Frontend (Zod schema) |
| BR-AD-002 | Title Length | Title must be 1-200 characters. | Backend (DTO validation) + Frontend (Zod schema) |
| BR-AD-003 | Date Range | `expiresAt` must be strictly after `startsAt`. | Backend (DB constraint `chk_advertisements_dates`) |
| BR-AD-004 | Shop Approval | Merchant must have an approved shop (`is_approved = true`) before creating ads. | Backend (service check) |
| BR-AD-005 | Default Status | New ads default to `is_active = true`. | Backend (service logic) |
| BR-AD-006 | Image Optional | Ads can be text-only or with image. | Backend (DTO validation) |
| BR-AD-007 | Link Optional | Click-through link URL is optional. | Backend (DTO validation) |

### 4.2 Advertisement Schedule Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AD-008 | Schedule Required | Both `startsAt` and `expiresAt` are required. | Backend (DTO validation) |
| BR-AD-009 | Schedule Validity | `expires_at` > `starts_at` enforced by DB check constraint. | Backend (DB constraint `chk_advertisements_dates`) |
| BR-AD-010 | Active Window | An ad is active when `is_active = true` AND `starts_at <= now` AND `expires_at >= now`. | Backend (query filter) |

### 4.3 Advertisement Status Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AD-011 | Active Visibility | Only in-schedule active ads are served to buyers. | Backend (query filter) |
| BR-AD-012 | Soft Delete | Delete sets `is_active = false`, record is retained. | Backend (service logic) |
| BR-AD-013 | Expired Visibility | Expired ads hidden from buyers, visible to merchant. | Backend (role-based query) |
| BR-AD-014 | Derived Status | Status (active/inactive/expired) derived client-side, never persisted. | Frontend (display logic) |

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
| BR-AD-020 | Admin Override | Admins can manage all advertisements. | Backend (RBAC) |
| BR-AD-021 | Buyer Read-Only | Buyers can only view active ads via the public endpoint. | Backend (RBAC) |

### 4.6 Cache Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AD-022 | Cache Key | Active ads cached under `cache:ads:active` with 5-minute TTL. | Backend (Redis cache) |
| BR-AD-023 | Cache Invalidation | Any mutation (create/update/delete) invalidates the active ads cache. | Backend (service logic) |

---

## 5. Screen Specifications

### 5.1 Screen: Advertisement Management (`/merchant/advertisements`)

**Purpose:** Allow merchants to view, create, schedule, and manage their shop's promotional advertisements.

#### 5.1.1 UI Elements

**Header & Summary:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-01 | Page Title | Heading (h5) | `merchant.ads.title` | Yes | "Advertisements" |
| EL-02 | Page Subtitle | Text | `merchant.ads.subtitle` | No | "Create, schedule and manage your shop's promotional banners." |
| EL-03 | New Ad Button | Button (primary) | `merchant.ads.new` | Yes | Open Create Advertisement dialog |
| EL-04 | Active Ads Stat | Card | `merchant.ads.statActive` | Yes | Number of currently running ads |
| EL-05 | Scheduled Stat | Card | `merchant.ads.statScheduled` | Yes | Number of upcoming campaigns |
| EL-06 | Expired Stat | Card | `merchant.ads.statExpired` | Yes | Number of past campaigns |

**Toolbar:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-07 | Status Filter | Select | `merchant.ads.filterStatus` | No | Filter by all/active/inactive/expired |
| EL-08 | Search Input | Input (text) | `merchant.ads.search` | No | Search within own ads |
| EL-09 | Export Button | Button (outline) | `merchant.ads.export` | No | Export ad list (CSV) |

**Advertisement Card:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-10 | Ad Thumbnail | Image | — | Yes | Ad image with BANNER tag overlay |
| EL-11 | Ad Title | Text | — | Yes | Advertisement title |
| EL-12 | Status Badge | Badge | — | Yes | Active/Inactive/Expired badge |
| EL-13 | Ad Content | Text | — | No | Advertisement content/description |
| EL-14 | Schedule Display | Text | — | Yes | "Aug 01, 2026 → Sep 15, 2026" |
| EL-15 | Link URL | Text | — | No | Click-through link display |
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

**Purpose:** Allow merchants to create or edit an advertisement with title, content, image, link, schedule, and active flag.

#### 5.2.1 UI Elements

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-21 | Dialog Title | Heading (h5) | `merchant.ads.formTitle` | Yes | "Create Advertisement" / "Edit Advertisement" |
| EL-22 | Close Button | Button (icon) | — | No | Dismiss dialog |
| EL-23 | Title Input | Input (text) | `merchant.ads.title` | Yes | Advertisement title (max 200) |
| EL-24 | Content Input | Textarea | `merchant.ads.content` | No | Advertisement content (max 5000) |
| EL-25 | Image Upload | File Upload | `merchant.ads.image` | No | JPG, PNG, WebP · max 5MB |
| EL-26 | Uploaded File | Text | — | No | Displays uploaded filename |
| EL-27 | Browse Files Button | Button (outline) | `merchant.ads.browse` | No | Open file picker |
| EL-28 | Link URL Input | Input (url) | `merchant.ads.linkUrl` | No | Click-through link URL |
| EL-29 | Start Date Input | Input (date) | `merchant.ads.startDate` | Yes | Schedule start date |
| EL-30 | End Date Input | Input (date) | `merchant.ads.endDate` | Yes | Schedule end date |
| EL-31 | Active Toggle | Switch | `merchant.ads.isActive` | Yes | "Visible to buyers during the scheduled period" |
| EL-32 | Cancel Button | Button (outline) | `common.cancel` | No | Close dialog without saving |
| EL-33 | Save Ad Button | Button (primary) | `merchant.ads.save` | Yes | Submit form |

**Default State (Create):**
- Title input auto-focused
- Active toggle ON by default
- End Date defaults to Start Date + 30 days
- Image upload zone empty (optional)

**Default State (Edit):**
- All fields populated with existing ad data
- Image preview shows current image
- Save button text changes to "Update Ad"

---

## 6. Functional Operation Specification

### 6.1 Operation: Create Advertisement

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Save Ad" button click in Create Advertisement dialog |
| **API Endpoint** | `POST /api/v1/ads` |
| **Request Content-Type** | `multipart/form-data` (when image attached) or `application/json` |
| **Pre-Submission Validation** | Full DTO validation (class-validator) + Zod schema |
| **Processing Steps** | 1. Validate JWT token and merchant role. 2. Resolve merchant's shop (GET /shops/merchant). 3. Verify shop exists and `is_approved = true`. 4. Validate all fields (title, schedule, image). 5. Upload image (if provided). 6. Create advertisement record with `shop_id`. 7. Invalidate active ads cache (`DEL cache:ads:active`). 8. Log `AD_CREATED` audit event. 9. Return created advertisement DTO. |
| **Success Response** | 201 Created with advertisement data |
| **Post-Action** | Close dialog, refresh ad list, show success toast |

### 6.2 Operation: List Own Advertisements

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Navigate to `/merchant/advertisements` or apply filter/search |
| **API Endpoint** | `GET /api/v1/ads` |
| **Request Content-Type** | None (query parameters) |
| **Pre-Submission Validation** | Query params validated (page, limit, status) |
| **Processing Steps** | 1. Validate query parameters. 2. Resolve merchant's shop id. 3. Build Prisma WHERE with `shop_id = <merchant shop id>`. 4. Apply status filter (active: `is_active = true` AND in schedule). 5. Apply pagination via `idx_advertisements_shop_id`. 6. Return paginated response with meta. |
| **Success Response** | 200 OK with advertisement list and pagination meta |
| **Cache** | None (per-merchant, not cached) |

### 6.3 Operation: Update Advertisement

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Update Ad" button click in Edit Advertisement dialog |
| **API Endpoint** | `PATCH /api/v1/ads/:id` |
| **Request Content-Type** | `multipart/form-data` or `application/json` |
| **Pre-Submission Validation** | Full DTO validation, advertisement ownership check |
| **Processing Steps** | 1. Validate `:id` as CUID format. 2. Validate JWT token and merchant role. 3. Find advertisement by id. 4. Verify `advertisement.shop_id == merchant's shop id`. 5. Validate provided fields (expires_at > starts_at if both present). 6. Update advertisement record. 7. Invalidate active ads cache (`DEL cache:ads:active`). 8. Log `AD_UPDATED` audit event. 9. Return updated advertisement DTO. |
| **Success Response** | 200 OK with updated advertisement data |
| **Post-Action** | Close dialog, refresh ad list, show success toast |

### 6.4 Operation: Delete Advertisement (Soft Delete)

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Click delete button on ad card (with confirmation) |
| **API Endpoint** | `DELETE /api/v1/ads/:id` |
| **Request Content-Type** | None |
| **Pre-Submission Validation** | Advertisement ownership check |
| **Processing Steps** | 1. Validate `:id` as CUID format. 2. Validate JWT token and merchant role. 3. Find advertisement by id. 4. Verify `advertisement.shop_id == merchant's shop id`. 5. Set `is_active = false` (soft delete). 6. Invalidate active ads cache (`DEL cache:ads:active`). 7. Log `AD_DELETED` audit event. 8. Return soft-deleted ad info. |
| **Success Response** | 200 OK with `{ id, isActive: false }` |
| **Post-Action** | Remove ad from list view, show success toast |

### 6.5 Operation: List Active Advertisements (Public)

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Storefront load / banner carousel render |
| **API Endpoint** | `GET /api/v1/ads/active` |
| **Request Content-Type** | None |
| **Pre-Submission Validation** | None (public route) |
| **Processing Steps** | 1. `@Public()` route (no JWT required). 2. Check Redis cache `cache:ads:active`. 3. On cache miss: query `WHERE is_active = true AND starts_at <= now() AND expires_at >= now() ORDER BY created_at DESC`. 4. Seed Redis cache with 5-minute TTL. 5. Return active ad list. |
| **Success Response** | 200 OK with active advertisement list |
| **Cache** | Redis: `cache:ads:active` TTL 5 minutes |

---

## 7. Input / Output Specification

### 7.1 Input Specification — Create Advertisement (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `title` | Title | タイトル | VARCHAR(200) | Yes | Input (text) | `@IsString()`, `@IsNotEmpty()`, `@MaxLength(200)` |
| `content` | Content | 内容 | TEXT | No | Textarea | `@IsString()`, `@IsOptional()`, `@MaxLength(5000)` |
| `imageUrl` | Image | 画像 | VARCHAR(500) | No | File Upload | `@IsUrl()`, `@IsOptional()`, `@MaxLength(500)`, JPG/PNG/WebP, max 5MB |
| `linkUrl` | Link URL | リンクURL | VARCHAR(500) | No | Input (url) | `@IsUrl()`, `@IsOptional()`, `@MaxLength(500)` |
| `isActive` | Active | 有効フラグ | BOOLEAN | No | Switch | `@IsBoolean()`, `@IsOptional()`, default true |
| `startsAt` | Start Date | 開始日時 | TIMESTAMPTZ | Yes | Input (datetime) | `@IsDateString()` |
| `expiresAt` | End Date | 終了日時 | TIMESTAMPTZ | Yes | Input (datetime) | `@IsDateString()`, must be after `startsAt` |

### 7.2 Input Specification — Update Advertisement (入力定義)

Same as Create Advertisement, with all fields optional (partial update).

### 7.3 Input Specification — List Query (入力定義)

| Field | Display Name (EN) | Data Type | Required | Input Control | Validation |
|-------|-------------------|-----------|:--------:|---------------|------------|
| `page` | Page | Number | No | Pagination | `@IsInt()`, `@Min(1)`, default 1 |
| `limit` | Limit | Number | No | Pagination | `@IsInt()`, `@Min(1)`, `@Max(100)`, default 20 |
| `status` | Status | String | No | Select | `@IsIn(['active', 'inactive', 'expired'])`, `@IsOptional()` |

### 7.4 Output Specification — Advertisement (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `id` | `advertisements.id` | CUID string |
| `shopId` | `advertisements.shop_id` | CUID string |
| `title` | `advertisements.title` | String |
| `content` | `advertisements.content` | String or null |
| `imageUrl` | `advertisements.image_url` | URL string or null |
| `linkUrl` | `advertisements.link_url` | URL string or null |
| `isActive` | `advertisements.is_active` | Boolean |
| `startsAt` | `advertisements.starts_at` | ISO 8601 timestamp |
| `expiresAt` | `advertisements.expires_at` | ISO 8601 timestamp |
| `createdAt` | `advertisements.created_at` | ISO 8601 timestamp |

### 7.5 Output Specification — Active Advertisement (Public, 出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `id` | `advertisements.id` | CUID string |
| `shopId` | `advertisements.shop_id` | CUID string |
| `title` | `advertisements.title` | String |
| `content` | `advertisements.content` | String or null |
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

### 8.3 Validation Enforcement Layers

1. **Frontend (Client)**: React Hook Form + Zod schema validation with real-time feedback (date-range refine on `expiresAt > startsAt`).
2. **Backend (Server)**: NestJS ValidationPipe + class-validator DTOs on all endpoints.
3. **Database (PostgreSQL)**: CHECK constraint `chk_advertisements_dates` as final guard.

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
| `400` | `BAD_REQUEST` | Validation failures | Field-level inline errors + top banner |
| `401` | `UNAUTHORIZED` | Missing or invalid JWT | Redirect to login |
| `403` | `FORBIDDEN` | Not merchant/admin, not ad owner, or shop not approved | "Shop is not approved" / "You don't have permission to manage this ad" |
| `404` | `NOT_FOUND` | Advertisement not found | "Advertisement not found" with refresh option |
| `409` | `CONFLICT` | `expires_at <= starts_at` | "Invalid schedule dates" with inline date error |
| `413` | `PAYLOAD_TOO_LARGE` | Ad image file > 5MB | "Image file must not exceed 5MB" |
| `415` | `UNSUPPORTED_MEDIA_TYPE` | Invalid image format | "Only JPG, PNG, and WebP images are supported" |
| `429` | `TOO_MANY_REQUESTS` | Rate limit exceeded | "Too many requests. Please wait {seconds} seconds" |
| `500` | `INTERNAL_SERVER_ERROR` | Server error | "Something went wrong. Please try again" |

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
| `POST /ads` | Protected (Merchant/Admin) | Create advertisement |
| `GET /ads` | Protected (Merchant/Admin) | List own advertisements |
| `PATCH /ads/:id` | Protected (Merchant/Admin) | Update advertisement |
| `DELETE /ads/:id` | Protected (Merchant/Admin) | Delete advertisement (soft delete) |
| `GET /ads/active` | Public | List active ads for platform display |

### 10.3 Role-Based Access

| Role | View Own Ads | Create Ads | Edit Ads | Delete Ads | View Active Ads (Public) |
|------|:------------:|:----------:|:--------:|:----------:|:------------------------:|
| `buyer` | ✗ | ✗ | ✗ | ✗ | ✓ |
| `merchant` | ✓ (own shop) | ✓ (own shop) | ✓ (own shop) | ✓ (own shop) | ✓ |
| `admin` | ✓ | ✓ | ✓ | ✓ | ✓ |

### 10.4 Ownership Enforcement

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('merchant', 'admin')
@Controller('ads')
export class AdvertisementsController {
  // POST /, GET /, PATCH /:id, DELETE /:id guarded by roles above

  @Public()
  @Get('active')
  findActive() { ... }
}
```

Merchants can only read/update/delete ads whose `shop_id` matches their own shop. Attempts to access another merchant's ad MUST return `403 Forbidden`. Admin bypasses ownership checks.

### 10.5 Security Audit Logging

| Event | Data Logged | Retention |
|-------|-------------|-----------|
| `AD_CREATED` | shopId, adId, merchantId, timestamp | 90 days |
| `AD_UPDATED` | shopId, adId, changed fields, timestamp | 90 days |
| `AD_DELETED` | shopId, adId, merchantId, timestamp | 90 days |

---

## 11. Real-Time Notification Behavior

### 11.1 Current Implementation

The Advertisement Management screen does not require WebSocket connections. Advertisement status (active/inactive/expired) is derived from schedule data and refreshed through standard query invalidation (TanStack Query) after mutations.

### 11.2 Cache-Driven Platform Display

| Event | Trigger | Action |
|-------|---------|--------|
| `AD_ACTIVATED` | Ad start time reached / toggled active | Appears on storefront after `cache:ads:active` refresh (max 5 min) |
| `AD_EXPIRED` | `expires_at` passed | Disappears from storefront after cache refresh |
| `AD_MUTATED` | Create/update/delete | Cache invalidated immediately; next `GET /ads/active` re-queries DB |

---

## 12. Screen Transition Specification

### 12.1 Inbound Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| Merchant dashboard | `/merchant/advertisements` | Click "Advertisements" menu |
| Any protected route (unauthenticated) | `/login` | No valid access token |

### 12.2 Internal Navigation

| Source | Target | Trigger |
|--------|--------|---------|
| `/merchant/advertisements` | Create/Edit Dialog (modal) | Click "New Ad" / "Edit" |
| Create/Edit Dialog | `/merchant/advertisements` | Click "Cancel" or save success |

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
| Delete Ad API | ≤ 500 milliseconds |
| Active Ads API (cache hit) | ≤ 100 milliseconds |
| Active Ads API (cache miss) | ≤ 500 milliseconds |
| Ad Image Upload (5MB) | ≤ 3 seconds |

### 13.2 Caching Strategy

| Cache Key | TTL | Invalidation Trigger |
|-----------|-----|---------------------|
| `cache:ads:active` | 5 minutes | Any ad create/update/delete |

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

---

## 15. Cross-Reference Traceability Matrix

### 15.1 Requirements Definition Traceability

| Requirement ID | Requirement Description | Covered By (This Document) |
|----------------|-------------------------|----------------------------|
| M-AD-001 | Merchant can create shop advertisements | UC-AD-001, Sec 6.1 |
| M-AD-002 | Merchant can set ad schedule (start/end date) | UC-AD-002, BR-AD-008~010, Sec 8.2 |
| M-AD-003 | Merchant can upload ad images | UC-AD-003, BR-AD-015~018, Sec 7.1 |
| M-AD-004 | Merchant can view/manage own ads | UC-AD-004, Sec 5.1, Sec 6.2~6.4 |
| M-AD-005 | Active ads display on platform | UC-AD-008, Sec 6.5, Sec 11.2 |

### 15.2 Database Design Traceability

| Database Table | Relevant Functional Operations |
|----------------|-------------------------------|
| `advertisements` | Create (INSERT), List (SELECT+WHERE), Update (SELECT+UPDATE), Soft delete (UPDATE is_active), Active display (SELECT+WHERE) |
| `shops` | Shop approval check (SELECT is_approved), Resolve merchant shop id (SELECT) |

### 15.3 Related Document References

| Document ID | Document Name | File Path |
|-------------|---------------|-----------|
| SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` |
| SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` |
| SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` |

---

*End of Functional Specification (Advertisement Management)*
