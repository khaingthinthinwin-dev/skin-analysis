# Functional Specification (機能設計書) — Review & Content Moderation

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-FDS-MOD-001 |
| **Target Screen** | Review & Content Moderation (レビュー・コンテンツ管理) |
| **Subsystem** | Administration — Review Moderation & Content Management |
| **Function ID** | FN-MOD-001 |
| **Version** | 2.3 |
| **Created** | 2026-08-07 |
| **Last Updated** | 2026-10-21 |
| **Author** | Software Architect |
| **Status** | Released (承認済み) |
| **Classification** | Internal — Engineering Division |

---

## Document Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-08-07 | Software Architect | Initial functional specification for Review and Content Moderation covering use cases, business rules, validation, error handling, and permission control. |
| 1.1 | 2026-08-14 | Software Architect | Aligned with core requirements and database design: UUID identifiers, hybrid review approach (verified purchase = auto-approved, non-verified = pending admin), merchant `license_status` workflow, website notifications, and removal of unsupported product pending state. |
| 1.2 | 2026-08-17 | Software Architect | Added Review Reports feature (SYS-REV-001~008): buyer report submission, admin report review/resolution, report status flow, review_reports database table, new API endpoints, business rules BR-MOD-050~055. |
| 1.3 | 2026-08-17 | Software Architect | Added Product Content Moderation (UC-MOD-008, BR-MOD-010~013), expanded merchant approval workflow (UC-MOD-005), and user management operations. |
| 1.4 | 2026-08-17 | Software Architect | Aligned with core DB spec v2.2: added `review_reports`, `audit_logs`, `notifications` table references. |
| 1.5 | 2026-08-17 | Software Architect | Updated traceability matrix with full coverage of audit logs, notifications, and report-related operations. |
| 2.0 | 2026-08-21 | Software Architect | Major alignment update: synced with REQ v2.10, DB v2.4, DEV v2.1. Fixed `review_reports` reason/status enums to match DB spec. Updated API response format to `{data, meta}` envelope. Clarified merchant `license_status` vs `shops.is_approved` dual-state. Added notification creation details in operations. Updated audit log data format per DB schema. Added product moderation state transitions. |
| 2.1 | 2026-08-24 | Software Architect | Clarified Section 3.1 PENDING review state: correctly describes the hybrid approach where non-verified purchase reviews have `is_approved = false` in the database and appear in the admin moderation queue. Updated rejection reason fields from VARCHAR(500) to TEXT to align with DB spec (no max length constraint on `merchants.rejection_reason`). |
| 2.2 | 2026-08-24 | Software Architect | Changed review display approach from hybrid to admin-moderated: ALL reviews now require admin approval before being shown to buyers (`is_approved = false` by default). Removed verified purchase auto-approval. Updated BR-MOD-002, Section 3.1 PENDING state, Section 3.6 state transitions, Section 5.1 filter tabs, and Section 6.1/6.2 operations. |
| 2.3 | 2026-10-21 | Software Architect | Aligned with actual backend source code: (1) Review status is a 3-value string enum (`pending`/`approved`/`rejected`) stored in `reviews.status`, not a boolean `is_approved`. (2) Product content moderation base path corrected to `/admin/content` (not `/admin/products`). (3) Added missing API endpoints: `GET /admin/dashboard-stats`, all individual detail GET endpoints (`/admin/reviews/:id`, `/admin/merchants/:id`, `/admin/products/:id` → `/admin/content/:id`, `/admin/users/:id`, `/admin/reports/:id`), bulk review moderation (`POST /admin/reviews/bulk/moderate`), bulk review deletion (`DELETE /admin/reviews/bulk`), bulk product moderation (`PATCH /admin/content/bulk/status`). (4) Corrected notification type strings to match code (`REVIEW_APPROVED`, `REVIEW_REJECTED`, `MERCHANT_STATUS_CHANGED`, `PRODUCT_DEACTIVATED`, `PRODUCT_REACTIVATED`, `USER_ACTIVATED`, `USER_DEACTIVATED`, `REPORT_RESOLVED`, `REPORT_REJECTED`). (5) Added `reason` optional field to `ModerateUserDto`. (6) Corrected `reason` field in `ModerateReviewDto` to `@MaxLength(500)`, not unbounded TEXT. (7) Added `ADMIN` value to `UserStatusFilter`. (8) Corrected audit log `entityType` casing to lowercase (`review`, `merchant`, `product`, `user`, `report`). (9) Corrected merchant rejection flow: products are not auto-deactivated on rejection, only cache is cleared. (10) Fixed `isApproved` → `status` in output specification. |

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

This screen serves as the central administration hub for maintaining platform integrity within the Cosmetics Finder platform. The Review & Content Moderation subsystem provides the complete set of capabilities necessary for administrators to moderate product reviews, remove violating content, approve merchant registrations, and enforce platform quality standards.

This subsystem is critical for ensuring trust and safety across the marketplace. It is responsible for providing administrators with tools to review, approve, reject, and delete reviews, remove content that breaches platform policy, and manage user accounts while maintaining audit trails and ensuring compliance with platform policies.

### 1.2 Functional Responsibilities

This screen is responsible for the following core functional areas:

1. **Review Moderation** — Viewing all reviews, approving/rejecting hidden reviews, and deleting inappropriate reviews with audit logging. All reviews are hidden by default until admin approval. Admin can moderate all reviews.
2. **Content Moderation** — Removing violating content that breaches platform policy.
3. **Merchant Registration Management** — Approving or rejecting merchant shop registrations based on license verification and compliance checks.
4. **User Account Moderation** — Activating or deactivating user accounts for policy violations.
5. **Review Report Management** — Processing reported reviews: confirming, rejecting, or resolving reports. Managing report statuses (pending, reviewed, resolved, rejected).

### 1.3 Target Users

| Attribute | Value |
|-----------|-------|
| **Primary Actor** | Platform Administrator (管理者) |
| **Required Authentication** | JWT Bearer Token with `admin` role |
| **Data Scope** | All reviews, products, merchants, user accounts, review reports, audit logs |

### 1.4 Relationships with Other Functions and Peripheral Systems

```text
┌──────────────────────────┐      ┌─────────────────────────────────────┐
│   Admin Actor            │      │     reviews / products / shops      │
│   (Moderates Content)    ├─────►│  Reads/moderates records            │
└──────────────────────────┘      └──────────────┬────────────────────┘
                                                 │ Reads/Writes
                                                 ▼
                                      ┌────────────────────────┐
                                      │  Admin Module          │
                                      │  (Moderation Service)  │
                                      └──────────┬─────────────┘
                                                 │ Audit Log
                                                 ▼
┌──────────────────────────┐      ┌─────────────────────────────────────┐
│   Buyer / Merchant       │      │     Redis (Cache Invalidation)      │
│   (Reports / Submits)    ├─────┤  Invalidates product caches          │
└──────────────────────────┘      └─────────────────────────────────────┘
```

### 1.5 Inputs / Outputs

| Input Information | Data Category | Source / Description |
|-------------------|---------------|----------------------|
| `reviewId` | Path Parameter | ID of the review to moderate |
| `moderationAction` | User Input | Approve or reject decision |
| `moderationReason` | User Input | Optional reason for rejection |
| `productId` | Path Parameter | ID of the product to moderate |
| `merchantId` | Path Parameter | ID of the merchant to approve/reject |
| `userId` | Path Parameter | ID of the user to activate/deactivate |

| Output Information | Data Category | Destination / Description |
|--------------------|---------------|---------------------------|
| `review` | Review DTO | Review data with moderation status |
| `product` | Product DTO | Product data with approval status |
| `merchant` | Merchant/Shop DTO | Merchant data with approval status |
| `auditLog` | Audit Record | Recorded moderation action |

### 1.6 Related Documents

| No. | Document ID | Document Name | File Path / Reference | Remarks |
|-----|-------------|---------------|----------------------|---------|
| 1 | SKM-REQ-001 | Requirements Definition (v2.11) | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | Business workflow logic, required fields, and rules. |
| 2 | SKM-DBS-001 | Database Design Specification (v2.5) | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | Table structures (`reviews`, `products`, `shops`, `review_reports`, `audit_logs`, `notifications`), constraints. |
| 3 | SKM-DEV-001 | Development Rules (v2.1) | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | Security rules, API standards, error responses, naming conventions. |

---

## 2. Use Cases and Business Workflow

### 2.1 Use Case Catalog

| UC-ID | Use Case Name | Precondition | Postcondition | Triggering Actor |
|-------|---------------|--------------|---------------|------------------|
| UC-MOD-001 | View All Reviews | Admin is authenticated with `admin` role. | List of all reviews displayed with filters and pagination. | Admin |
| UC-MOD-002 | Moderate Review (Approve/Reject) | Review exists, admin is authenticated. | Review `is_approved` status updated. Product `avg_rating` and `review_count` recalculated if applicable. | Admin |
| UC-MOD-003 | Delete Inappropriate Review | Review exists, admin is authenticated. | Review permanently removed. Product `avg_rating` and `review_count` recalculated. | Admin |
| UC-MOD-004 | Remove Violating Content | Content violates platform policy. | Content removed or deactivated. Audit log recorded. | Admin |
| UC-MOD-005 | Approve/Reject Merchant Registration | Merchant exists with `license_status = 'pending'` and an associated shop exists. | Merchant `license_status` updated; associated `shops.is_approved` synchronized. | Admin |
| UC-MOD-006 | Activate/Deactivate User Account | User account exists. | User `is_active` status toggled. User sessions terminated on deactivation. | Admin |
| UC-MOD-007 | Manage Review Reports | Buyer has reported a review, pending report exists. | Admin confirms, rejects, or resolves report. Target review may be rejected/deleted. | Admin |
| UC-MOD-008 | Product Content Moderation | Product violates platform policy. | Admin deactivates (`is_active = false`) or reactivates product. Audit log recorded. | Admin |

### 2.2 Primary Business Workflow

```
                         ┌──────────────────┐
                         │  Admin Logs In   │
                         │  (Admin Role)    │
                         └────────┬─────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │  Admin Dashboard Display     │
                    │  (Pending Actions Overview)  │
                    └──────────┬──────────────────┘
                               │
           ┌───────────┬───────┴───────┬───────────┐
           ▼           ▼               ▼           ▼
    ┌────────────┐┌────────────┐┌────────────┐┌────────────┐
    │  Review    ││  Content   ││  Merchant  ││    User    │
    │ Moderation ││ Moderation ││  Approval  ││ Management │
    │ 01~03, 07  ││  04, 08    ││    05      ││    06      │
    └─────┬──────┘└─────┬──────┘└─────┬──────┘└─────┬──────┘
          │             │             │             │
          └─────────────┴──────┬──────┴─────────────┘
                               │
                               ▼
                    ┌─────────────────────────────┐
                    │    Moderation Action Form    │
                    │ (Approve / Reject / Delete)  │
                    └──────────┬──────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
       ┌────────────┐  ┌──────────────┐  ┌──────────────┐
       │  Approve   │  │   Reject     │  │    Delete    │
       │  (200 OK)  │  │  (200 OK)    │  │ (204 No      │
       └─────┬──────┘  └──────────────┘  │  Content)    │
             │                           └──────────────┘
             ▼
      ┌──────────────────────┐
      │  Backend Processing  │
      │  (Update / Recalc /  │
      │       Audit Log)     │
      └──────────┬───────────┘
                 │
        ┌────────┴──────────────────────┐
        ▼                               ▼
 ┌──────────────┐              ┌─────────────────────┐
 │   SUCCESS    │              │     FAILURE         │
 │   (Cache     │              │   (400/403/404)     │
 │  Invalidated)│              └─────────┬───────────┘
 └──────┬───────┘                        │
        │                                ▼
        ▼                       ┌─────────────────────┐
 ┌──────────────┐               │  Display Error      │
 │    Toast     │               │     Message         │
 │ Notification │               └─────────────────────┘
 └──────────────┘
```

### 2.3 Workflow Critical Path Summary

| Step | Action | Status Before | Status After | Assigned To |
|:----:|--------|---------------|--------------|-------------|
| 1 | Admin navigates to /admin/reviews | — | Reviews list loaded | System |
| 2 | Admin selects a review | — | Review detail displayed | Admin |
| 3 | Admin approves or rejects review | is_approved = false (pending) | is_approved = true/false | Admin |
| 4 | System recalculates product avg_rating | Old avg_rating | Updated avg_rating | System |
| 5 | System invalidates product cache | Cached product | Cache evicted | System |
| 6 | Admin navigates to /admin/merchants | — | Merchant list loaded | System |
| 7 | Admin approves merchant registration | license_status = pending / shops.is_approved = false | license_status = approved / shops.is_approved = true | Admin |

### 2.4 Relevant Requirements Covered

| Requirement ID | Requirement Summary |
|----------------|---------------------|
| A-REV-001 | Admin can view all reviews |
| A-REV-002 | Admin can approve/reject reviews |
| A-REV-003 | Admin can delete inappropriate reviews |
| A-CONT-002 | Admin can approve/reject merchant registrations |
| A-CONT-004 | Admin can remove violating content |

---

## 3. State Transition Specification

### 3.1 Review Moderation States

The review status is stored in `reviews.status` as a 3-value string enum — **not** a boolean `is_approved` field.

| State | `reviews.status` value | Description | Visible to Buyers | Can Be Edited |
|-------|------------------------|-------------|:-----------------:|:-------------:|
| `PENDING` | `'pending'` | Default state on creation. Awaiting admin approval. Visible only in admin moderation queue. | ✗ | ✗ |
| `APPROVED` | `'approved'` | Review approved and displayed on product page. Included in `avg_rating` / `review_count`. | ✓ | ✗ |
| `REJECTED` | `'rejected'` | Review rejected and hidden from product page. Excluded from `avg_rating` / `review_count`. | ✗ | ✗ |

### 3.2 Merchant Approval States

| State | Description | Can List Products | Can Access Dashboard |
|-------|-------------|:-----------------:|:--------------------:|
| `PENDING` | Merchant registered, shop created, awaiting admin approval | ✗ | ✓ (limited) |
| `APPROVED` | Merchant approved by admin, shop is active | ✓ | ✓ |
| `REJECTED` | Merchant rejected by admin, shop deactivated | ✗ | ✓ (limited) |

### 3.3 Product Moderation States

| State | Description | Visible in Search | Can Be Purchased |
|-------|-------------|:-----------------:|:----------------:|
| `ACTIVE` | Product is active and approved | ✓ | ✓ |
| `INACTIVE` | Product is deactivated (soft delete or admin action) | ✗ | ✗ |

### 3.4 User Account Moderation States

| State | Description | Can Login | Can Perform Actions |
|-------|-------------|:---------:|:-------------------:|
| `ACTIVE` | Account is active | ✓ | ✓ |
| `INACTIVE` | Account deactivated by admin | ✗ | ✗ |

### 3.5 Review Report States

| State | Description | Can Be Modified | Can Be Deleted |
|-------|-------------|:---------------:|:--------------:|
| `PENDING` | Report submitted, awaiting admin review | ✓ | ✓ |
| `REVIEWED` | Admin has reviewed but not yet resolved | ✓ | ✓ |
| `RESOLVED` | Report resolved, target review may be rejected | ✗ | ✗ |
| `REJECTED` | Report rejected by admin | ✗ | ✓ |

### 3.6 State Transition Table

| Transition ID | Origin State | Target State | Trigger Action | Guard Conditions |
|---------------|--------------|--------------|----------------|------------------|
| TR-MOD-01 | `PENDING` (default) | `APPROVED` | Admin approves review | Admin role, review exists |
| TR-MOD-02 | `PENDING` (default) | `REJECTED` | Admin rejects review | Admin role, review exists |
| TR-MOD-03 | `PENDING` (merchant) | `APPROVED` | Admin approves merchant | Admin role, merchant and shop exist |
| TR-MOD-04 | `PENDING` (merchant) | `REJECTED` | Admin rejects merchant | Admin role, merchant and shop exist |
| TR-MOD-05 | `ACTIVE` (product) | `INACTIVE` | Admin deactivates product | Admin role, product exists |
| TR-MOD-06 | `INACTIVE` (product) | `ACTIVE` | Admin reactivates product | Admin role, product exists |
| TR-MOD-07 | `ACTIVE` (user) | `INACTIVE` | Admin deactivates user | Admin role, user exists, no pending orders |
| TR-MOD-08 | `INACTIVE` (user) | `ACTIVE` | Admin reactivates user | Admin role, user exists |
| TR-MOD-09 | `PENDING` (report) | `REVIEWED` | Admin marks report as reviewed | Admin role, report exists |
| TR-MOD-10 | `PENDING`/`REVIEWED` (report) | `RESOLVED` | Admin resolves report (auto-rejects target review) | Admin role, report exists |
| TR-MOD-11 | `PENDING`/`REVIEWED` (report) | `REJECTED` | Admin rejects report | Admin role, report exists |
| TR-MOD-12 | `PENDING`/`REJECTED` (report) | Deleted | Admin deletes report | Admin role, report exists, not resolved |

---

## 4. Business Rules

### 4.1 Review Moderation Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-MOD-001 | Admin-Only Moderation | Only users with `admin` role can moderate reviews. | Backend (JwtAuthGuard + RolesGuard) |
| BR-MOD-002 | Review Approval Default | All reviews are hidden by default (`is_approved = false`). Admin must approve each review before it becomes visible to buyers. | Backend (review creation service) |
| BR-MOD-003 | Rating Recalculation | When review approval status changes, product `avg_rating` and `review_count` must be recalculated from approved reviews only. | Backend (moderation service) |
| BR-MOD-004 | Cache Invalidation | When review status changes, product cache (`cache:product:{id}`) and product list cache (`cache:products:list:*`) must be invalidated. | Backend (moderation service) |
| BR-MOD-005 | Deletion Cascade | Deleting a review removes it permanently and recalculates product statistics. | Backend (Prisma onDelete: Cascade) |
| BR-MOD-006 | Audit Logging | All moderation actions (approve, reject, delete) must be logged with admin ID, target ID, action, and timestamp. | Backend (audit interceptor) |

### 4.2 Content Moderation Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-MOD-010 | Product Visibility | Only active products (`is_active = true`) from approved merchants appear in buyer-facing search results. | Backend (product query filter) |
| BR-MOD-011 | Violating Content Removal | Admin can deactivate products that violate platform policy by setting `is_active = false`. | Backend (moderation service) |
| BR-MOD-012 | Product Ownership | Merchants can only edit/delete their own products. Admin can moderate any product. | Backend (ownership check in service) |
| BR-MOD-013 | Soft Delete Pattern | Products are soft-deleted via `is_active = false`, not hard-deleted, to preserve order history integrity. | Backend (service logic) |

### 4.3 Merchant Approval Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-MOD-020 | Merchant Approval Required | New merchants require admin approval before full merchant access. `merchants.license_status = 'pending'` and `shops.is_approved = false` by default. Two tables track approval state: `merchants.license_status` (pending/approved/rejected) for merchant-level access, and `shops.is_approved` (boolean) for shop visibility to buyers. | Backend (merchant/shop creation) |
| BR-MOD-021 | Unapproved Merchant Restriction | Products from merchants whose `license_status` is not `approved` or whose shop is not approved are NOT visible to buyers in search results. | Backend (product query filter) |
| BR-MOD-022 | Rejection with Reason | Admin can reject merchants with a reason stored in `merchants.rejection_reason` for merchant reference. | Backend (moderation DTO) |
| BR-MOD-023 | Re-approval on Reactivation | If an approved merchant/shop is deactivated, re-approval is required before merchant features and public visibility are restored. | Backend (status transition) |

### 4.4 User Moderation Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-MOD-040 | Admin-Only User Moderation | Only users with `admin` role can activate/deactivate user accounts. | Backend (RolesGuard) |
| BR-MOD-041 | Session Termination | When a user is deactivated, all active sessions (refresh tokens) should be revoked. | Backend (token revocation) |
| BR-MOD-042 | Self-Deactivation Prevention | Admin cannot deactivate their own account. | Backend (ownership check) |

### 4.5 Review Report Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-MOD-050 | Only Buyers Can Report | Only buyers with purchase history can report reviews. | Backend (ownership check) |
| BR-MOD-051 | Duplicate Report Prevention | Same user cannot report the same review twice. Enforced via unique constraint on `review_reports` table (review_id + reported_by). | Backend (Prisma unique constraint) |
| BR-MOD-052 | Report Reason Required | Report must select a reason (spam/inappropriate/fake/other) and optional detail text. | Backend (DTO validation) |
| BR-MOD-053 | Report Status Management | Reports start with `pending` status. Admin changes to `reviewed`, `resolved`, or `rejected`. | Backend (moderation service) |
| BR-MOD-054 | Report Target Review Handling | When report is resolved, admin can reject/delete the target review. Report is not auto-notified. | Backend (moderation service) |
| BR-MOD-055 | Report Deletion | Admin can delete pending/rejected reports. Resolved reports cannot be deleted. | Backend (moderation service) |

---

## 5. Screen Specifications

### 5.1 Screen: Admin Review & Report Management (`/admin/reviews`)

**Purpose:** Allow administrators to view, moderate, and manage all product reviews AND review reports in a single screen with tab navigation.

#### 5.1.1 Screen Tabs

| Tab ID | Tab Name | Description |
|--------|----------|-------------|
| `tabReviews` | Reviews | View and moderate all product reviews |
| `tabReports` | Reports | View and manage all review reports |

#### 5.1.2 Reviews Tab UI Elements

**Reviews Table View:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-01 | Page Title | Text | `admin.reviews.title` | Yes | "Review & Report Management" |
| EL-02 | Screen Tabs | Tab Group | `admin.reviews.screenTabs` | Yes | Tabs: Reviews, Reports |
| EL-03 | Filter Tabs | Tab Group | `admin.reviews.tabs` | Yes | Tabs: All, Pending, Approved, Rejected |
| EL-04 | Search Input | Input (text) | `admin.reviews.search` | No | Search reviews by user name, product name, or content |
| EL-05 | Sort Dropdown | Select | `admin.reviews.sort` | No | Sort by: Newest, Oldest, Rating (High-Low), Rating (Low-High) |
| EL-06 | Reviews Table | Table | — | Yes | Displays: checkbox, user avatar, user name, product name, rating stars, review title, status badge, created date, actions |
| EL-07 | Review Status Badge | Badge | — | Yes | Green (Approved), Red (Rejected), Amber (Pending) |
| EL-08 | Rating Display | Star Rating | — | Yes | 1-5 star display with Beauty Pink (#EC4899) color |
| EL-09 | Actions Dropdown | Dropdown Menu | — | Yes | Options: View Detail, Approve, Reject, Delete |
| EL-10 | Bulk Actions | Button Group | — | No | Approve Selected, Reject Selected, Delete Selected |
| EL-11 | Pagination | Pagination | — | Yes | Page navigation with page size selector (20/50/100) |
| EL-12 | Stats Bar | Stats Display | — | No | Shows: Total Reviews, Pending Count, Approved Count, Rejected Count |

**Review Detail Modal:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-13 | Review Content | Text | — | Yes | Full review body text |
| EL-14 | Review Images | Image Gallery | — | No | Review images in grid layout |
| EL-15 | Product Info Card | Card | — | Yes | Product name, image, price, link to product detail |
| EL-16 | User Info Card | Card | — | Yes | User name, email, avatar, review count |
| EL-17 | Verified Purchase Badge | Badge | — | No | "Verified Purchase" indicator |
| EL-18 | Moderation Reason Input | Textarea | `admin.moderation.reason` | Conditional | Required when rejecting. Optional for approve. |
| EL-19 | Approve Button | Button (primary) | `admin.moderation.approve` | Yes | Approve review |
| EL-20 | Reject Button | Button (destructive) | `admin.moderation.reject` | Yes | Reject review |
| EL-21 | Delete Button | Button (destructive) | `admin.moderation.delete` | Yes | Permanently delete review |
| EL-22 | Close Button | Button (outline) | — | Yes | Close modal |

#### 5.1.3 Reports Tab UI Elements

**Report List Table View:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-23 | Filter Tabs | Tab Group | `admin.reports.tabs` | Yes | Tabs: All, Pending, Reviewed, Resolved, Rejected |
| EL-24 | Search Input | Input (text) | `admin.reports.search` | No | Search by reporter name, review content |
| EL-25 | Reports Table | Table | — | Yes | Displays: checkbox, reporter name, review body excerpt, reason badge, status badge, reported date, actions |
| EL-26 | Report Status Badge | Badge | — | Yes | Amber (Pending), Blue (Reviewed), Green (Resolved), Red (Rejected) |
| EL-27 | Report Reason Badge | Badge | — | Yes | Reason category display (spam/inappropriate/fake/other) |
| EL-28 | Actions Dropdown | Dropdown Menu | — | Yes | Options: View Detail, Reject, Resolve |
| EL-29 | Bulk Actions | Button Group | — | No | Reject Selected, Resolve Selected |
| EL-30 | Pagination | Pagination | — | Yes | Page navigation with page size selector (20/50/100) |
| EL-31 | Stats Bar | Stats Display | — | No | Shows: Total Reports, Pending Count, Reviewed Count, Resolved Count, Rejected Count |

**Report Detail Modal:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-32 | Reporter Info Card | Card | — | Yes | User name, email, avatar |
| EL-33 | Review Info Card | Card | — | Yes | Review body, rating, target product name |
| EL-34 | Report Reason Display | Text | — | Yes | Selected reason category |
| EL-35 | Report Detail Text | Text | — | No | Reporter's additional explanation |
| EL-36 | Target Review Actions | Button Group | — | Yes | Approve/Reject/Delete buttons for the target review |
| EL-37 | Admin Note Input | Textarea | `admin.reports.adminNote` | No | Optional admin note |
| EL-38 | Reject Button | Button (destructive) | `admin.reports.reject` | Yes | Reject report |
| EL-39 | Resolve Button | Button (primary) | `admin.reports.resolve` | Yes | Resolve report (auto-reject target review) |
| EL-40 | Delete Button | Button (destructive) | `admin.reports.delete` | Yes | Delete report |
| EL-41 | Close Button | Button (outline) | — | Yes | Close modal |

### 5.2 Screen: Admin Merchants Management (`/admin/merchants`)

**Purpose:** Allow administrators to view, approve, or reject merchant registrations.

#### 5.2.1 UI Elements

**Merchants Table View:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-42 | Page Title | Text | `admin.merchants.title` | Yes | "Merchant Management" |
| EL-43 | Filter Tabs | Tab Group | `admin.merchants.tabs` | Yes | Tabs: All, Pending Approval, Approved, Rejected |
| EL-44 | Search Input | Input (text) | `admin.merchants.search` | No | Search by merchant name, user email |
| EL-45 | Merchants Table | Table | — | Yes | Displays: checkbox, shop logo, shop name, user name, registration date, status badge, actions |
| EL-46 | Merchant Status Badge | Badge | — | Yes | Green (Approved), Amber (Pending), Red (Rejected) |
| EL-47 | Actions Dropdown | Dropdown Menu | — | Yes | Options: View Detail, Approve, Reject |
| EL-48 | Pagination | Pagination | — | Yes | Page navigation |

**Merchant Detail Modal:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-49 | Shop Info Card | Card | — | Yes | Shop name, logo, banner, description |
| EL-50 | License File Viewer | PDF Viewer | — | Yes | Business license PDF display/download |
| EL-51 | User Info Card | Card | — | Yes | User name, email, phone, registration date |
| EL-52 | Rejection Reason Input | Textarea | `admin.merchant.rejectReason` | Conditional | Required when rejecting |
| EL-53 | Approve Button | Button (primary) | `admin.merchant.approve` | Yes | Approve merchant |
| EL-54 | Reject Button | Button (destructive) | `admin.merchant.reject` | Yes | Reject merchant |
| EL-55 | Close Button | Button (outline) | — | Yes | Close modal |

---

## 6. Functional Operation Specification

### 6.1 Operation: View Reviews

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Admin navigates to /admin/reviews or changes the review status filter |
| **API Endpoint** | `GET /api/v1/admin/reviews` |
| **Request Query Parameters** | `page` (default: 1), `limit` (default: 20), `sort` (default: `createdAt`), `order` (default: `desc`), `status` (`pending`/`approved`/`rejected`/omitted for all), `search` (searches `title`, `body`, user name, product name) |
| **Pre-Submission Validation** | JWT access token validated. Admin role verified. |
| **Processing Steps** | 1. Validate JWT access token. 2. Verify admin role via RolesGuard. 3. Build `where` clause filtering `reviews.status`. 4. If `search` provided, apply OR filter across `title`, `body`, `user.name`, `product.name`. 5. Join with `users` (id, name, email, avatarUrl) and `products` (id, name, images, slug, price). 6. Apply pagination and ordering. 7. Return `{ items, total, page, limit, totalPages }`. |
| **Success Response** | 200 OK with paginated review data |
| **Post-Action** | Display reviews table with moderation actions |

### 6.1.1 Operation: Get Review By ID

| Attribute | Specification |
|-----------|---------------|
| **API Endpoint** | `GET /api/v1/admin/reviews/:id` |
| **Processing Steps** | 1. Validate JWT and admin role. 2. Find review by UUID. 3. Include `user` (id, name, email, avatarUrl, reviewCount) and `product` (id, name, images, slug, price). 4. Throw 404 if not found. |
| **Success Response** | 200 OK with full review DTO |

### 6.1.2 Operation: Dashboard Stats

| Attribute | Specification |
|-----------|---------------|
| **API Endpoint** | `GET /api/v1/admin/dashboard-stats` |
| **Processing Steps** | Returns aggregated counts: `totalUsers`, `totalMerchants` (approved only), `pendingMerchants`, `pendingAds`, `pendingReviewReports`. |
| **Success Response** | 200 OK with stats object |

### 6.2 Operation: Moderate Review (Approve/Reject)

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Admin clicks "Approve" or "Reject" on a review |
| **API Endpoint** | `POST /api/v1/admin/reviews/:id/moderate` |
| **Request Content-Type** | `application/json` |
| **Request Body** | `{ action: 'approve' \| 'reject', reason?: string }` |
| **Pre-Submission Validation** | JWT access token validated. Admin role verified. Review exists. Reason required for rejection. 409 thrown if review is already in target state. |
| **Processing Steps** | 1. Validate JWT and admin role. 2. Find review by UUID. 3. If action = `'reject'`, validate non-empty reason; throw 400 if missing. 4. Throw 409 if review already in target state. 5. Within a DB transaction: update `reviews.status` to `'approved'` or `'rejected'`. 6. Recalculate product `avg_rating` and `review_count` from `status = 'approved'` reviews only (raw SQL). 7. Log to `audit_logs` (action: `REVIEW_APPROVED` or `REVIEW_REJECTED`, entityType: `'review'`, entityId: reviewId, newValue: `{ status, reason }`). 8. After transaction: invalidate Redis cache (`DEL cache:product:{id}` and `DEL cache:products:list:*`). 9. Send notifications (fail-open): reviewer receives `REVIEW_APPROVED` or `REVIEW_REJECTED`; merchant receives `REVIEW_APPROVED` notification on approval. 10. Return `{ id, status, updatedAt }`. |
| **Success Response** | 200 OK — `{ id, status, updatedAt }` |
| **Post-Action** | Display toast notification. Refresh reviews list. |

### 6.2.1 Operation: Bulk Moderate Reviews

| Attribute | Specification |
|-----------|---------------|
| **API Endpoint** | `POST /api/v1/admin/reviews/bulk/moderate` |
| **Request Body** | `{ ids: string[], action: 'approve' \| 'reject', reason?: string }` |
| **Processing Steps** | Iterates over each ID and calls single-review moderation. Failures are recorded but do not stop the batch. |
| **Success Response** | 200 OK — `{ processed: number, failed: number, results: [{ id, status, error? }] }` |

> **Route ordering note:** `POST /admin/reviews/bulk/moderate` is registered **before** `POST /admin/reviews/:id/moderate` to prevent the literal segment `"bulk"` from being matched as a review UUID.

### 6.3 Operation: Delete Review

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Admin clicks "Delete" on a review with confirmation dialog |
| **API Endpoint** | `DELETE /api/v1/admin/reviews/:id` |
| **Request Headers** | `Authorization: Bearer <accessToken>` |
| **Pre-Submission Validation** | JWT access token validated. Admin role verified. Review exists (404 if not found). |
| **Processing Steps** | 1. Validate JWT and admin role. 2. Find review by UUID. 3. Within a DB transaction: hard-delete review (`tx.review.delete`). 4. Recalculate product `avg_rating` and `review_count` from remaining `status = 'approved'` reviews. 5. Log to `audit_logs` (action: `REVIEW_DELETED`, entityType: `'review'`, entityId: reviewId, oldValue: `{ productId }`). 6. After transaction: invalidate Redis cache (`DEL cache:product:{id}` and `DEL cache:products:list:*`). 7. Return 204 No Content. |
| **Success Response** | 204 No Content |
| **Post-Action** | Display toast notification. Refresh reviews list. |

### 6.3.1 Operation: Bulk Delete Reviews

| Attribute | Specification |
|-----------|---------------|
| **API Endpoint** | `DELETE /api/v1/admin/reviews/bulk` |
| **Request Body** | `{ ids: string[] }` |
| **Processing Steps** | Iterates over each ID and calls single-review deletion. Failures are recorded but do not stop the batch. |
| **Success Response** | 200 OK — `{ processed: number, failed: number, results: [{ id, status, error? }] }` |

### 6.4 Operation: View All Merchants

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Admin navigates to /admin/merchants |
| **API Endpoint** | `GET /api/v1/admin/merchants` |
| **Request Query Parameters** | `page`, `limit`, `sort`, `order`, `status` (pending/approved/rejected) |
| **Pre-Submission Validation** | JWT access token validated. Admin role verified. |
| **Processing Steps** | 1. Validate JWT and admin role. 2. Query `merchants` table with `license_status` filter. 3. Join with `users` (merchant user) and associated `shops` for merchant/shop data. 4. Apply pagination. 5. Return paginated merchant list in `{ data, meta }` envelope. |
| **Success Response** | 200 OK with paginated merchant data |
| **Post-Action** | Display merchants table |

### 6.5.1 Operation: Get Merchant By ID

| Attribute | Specification |
|-----------|---------------|
| **API Endpoint** | `GET /api/v1/admin/merchants/:id` |
| **Processing Steps** | 1. Validate JWT and admin role. 2. Find merchant by UUID including `user` (id, name, email, phone). 3. Throw 404 if not found. |
| **Success Response** | 200 OK with full merchant DTO |

### 6.6 Operation: Approve/Reject Merchant

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Admin clicks "Approve" or "Reject" on a merchant |
| **API Endpoint** | `PATCH /api/v1/admin/merchants/:id/status` |
| **Request Content-Type** | `application/json` |
| **Request Body** | `{ status: 'approved' \| 'rejected', reason?: string }` |
| **Pre-Submission Validation** | JWT access token validated. Admin role verified. Merchant exists. 409 if merchant already in target state. Reason required for rejection (400 if empty). |
| **Processing Steps** | 1. Validate JWT and admin role. 2. Find merchant by UUID. 3. Throw 409 if already in target state. 4. If status = `'rejected'`, validate non-empty reason. 5. Look up associated shop via `shops.userId`. 6. Within a DB transaction: update `merchants.license_status`, `rejection_reason` (null on approval), `reviewedAt`, `reviewedBy`. 7. If shop exists, update `shops.isApproved` (`true` when approved, `false` when rejected). 8. If rejected and shop exists: invalidate `cache:products:list:*` in Redis (merchant's products are **not** individually deactivated at this step). 9. Create `MERCHANT_STATUS_CHANGED` notification for merchant user. 10. Log to `audit_logs` (action: `MERCHANT_APPROVED` or `MERCHANT_REJECTED`, entityType: `'merchant'`, entityId: merchantId, newValue: `{ status, reason, shopId }`). 11. Return `{ id, licenseStatus, updatedAt }`. |
| **Success Response** | 200 OK — `{ id, licenseStatus, updatedAt }` |
| **Post-Action** | Display toast notification. Refresh merchants list. |

> **Note:** Merchant rejection does **not** set `products.is_active = false` directly. Products from unapproved merchants are hidden via the `shops.is_approved = false` filter in the buyer-facing product query (BR-MOD-021).

### 6.6.1 Operation: Get User By ID

| Attribute | Specification |
|-----------|---------------|
| **API Endpoint** | `GET /api/v1/admin/users/:id` |
| **Processing Steps** | 1. Validate JWT and admin role. 2. Find user by UUID (select: id, name, email, phone, avatarUrl, roleCode, isActive, createdAt, updatedAt, reviewCount). 3. Throw 404 if not found. |
| **Success Response** | 200 OK with user detail DTO |

### 6.7 Operation: Activate/Deactivate User

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Admin toggles user active status |
| **API Endpoint** | `PATCH /api/v1/admin/users/:id/status` |
| **Request Content-Type** | `application/json` |
| **Request Body** | `{ isActive: boolean, reason?: string }` |
| **Pre-Submission Validation** | JWT access token validated. Admin role verified. User exists. Admin cannot deactivate self (400). 409 if user already in target state. Reason required when deactivating (400 if empty). Merchant users: must have `licenseStatus = 'approved'`; must have no pending orders. Buyer users: must have no pending orders. |
| **Processing Steps** | 1. Validate JWT and admin role. 2. Find user by UUID. 3. Throw 400 on self-deactivation attempt. 4. Throw 409 if user already in target state. 5. Validate deactivation reason (required, non-empty). 6. For merchant role: check `licenseStatus = 'approved'` and no pending orders. 7. For buyer role: check no pending orders. 8. Within a DB transaction: update `users.isActive` (and `deactivationReason` on deactivation). 9. If deactivating: revoke all active refresh tokens (`refreshToken.updateMany` where `isRevoked = false`). 10. If deactivating a merchant: set all their active products to `isActive = false` and invalidate product caches. 11. Log to `audit_logs` (action: `USER_ACTIVATED` or `USER_DEACTIVATED`, entityType: `'user'`, entityId: targetUserId, newValue: `{ isActive, reason }`). 12. Send `USER_ACTIVATED` or `USER_DEACTIVATED` notification to affected user (fail-open). 13. Return `{ id, isActive, updatedAt }`. |
| **Success Response** | 200 OK — `{ id, isActive, updatedAt }` |
| **Post-Action** | Display toast notification. Refresh users list. |

### 6.5 Operation: View Products (Content Moderation)

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Admin navigates to content moderation section |
| **API Endpoint** | `GET /api/v1/admin/content` |
| **Request Query Parameters** | `page`, `limit`, `sort`, `order`, `status` (`active`/`inactive`), `search` (searches product name, merchant shop name) |
| **Processing Steps** | 1. Validate JWT and admin role. 2. Build where clause. 3. Include merchant (id, shopName, user.id, user.name) and category (id, name). 4. Annotate each product with `hasPendingOrders` flag (checked against non-terminal order statuses). 5. Return paginated list. |
| **Success Response** | 200 OK with `{ items, total, page, limit, totalPages }` where each item includes `hasPendingOrders: boolean` |

### 6.5.1 Operation: Get Product By ID

| Attribute | Specification |
|-----------|---------------|
| **API Endpoint** | `GET /api/v1/admin/content/:id` |
| **Processing Steps** | Returns full product with merchant, category, and `hasPendingOrders` flag. Throws 404 if not found. |
| **Success Response** | 200 OK with product detail DTO |

### 6.5.2 Operation: Product Content Moderation (Single)

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Admin clicks "Deactivate" or "Reactivate" on a product |
| **API Endpoint** | `PATCH /api/v1/admin/content/:id/status` |
| **Request Content-Type** | `application/json` |
| **Request Body** | `{ isActive: boolean, reason?: string }` |
| **Pre-Submission Validation** | JWT access token validated. Admin role verified. Product exists. 409 if product already in target state. Deactivation: reason required (400 if empty); product must have no pending orders (400 if has pending orders). Reactivation: merchant user must be active. |
| **Processing Steps** | 1. Validate JWT and admin role. 2. Find product by UUID. 3. Deactivation guard: check no pending orders; validate reason. 4. Reactivation guard: check merchant user `isActive = true`. 5. Within a DB transaction: update `products.isActive`. 6. Log to `audit_logs` (action: `PRODUCT_DEACTIVATED` or `PRODUCT_REACTIVATED`, entityType: `'product'`, entityId: productId, newValue: `{ isActive, reason }`). 7. Create `PRODUCT_DEACTIVATED` or `PRODUCT_REACTIVATED` notification for merchant user (fail-open). 8. After transaction: invalidate Redis cache (`DEL cache:product:{id}` and `DEL cache:products:list:*`). 9. Return `{ id, isActive, updatedAt }`. |
| **Success Response** | 200 OK — `{ id, isActive, updatedAt }` |
| **Post-Action** | Display toast notification. Refresh products list. |

### 6.5.3 Operation: Bulk Product Moderation

| Attribute | Specification |
|-----------|---------------|
| **API Endpoint** | `PATCH /api/v1/admin/content/bulk/status` |
| **Request Body** | `{ ids: string[], isActive: boolean, reason?: string }` |
| **Processing Steps** | Iterates over each ID and calls single-product moderation. Failures recorded but do not stop the batch. |
| **Success Response** | 200 OK — `{ processed: number, failed: number, results: [{ id, status, error? }] }` |

> **Route ordering note:** `PATCH /admin/content/bulk/status` is registered **before** `PATCH /admin/content/:id/status` to prevent `"bulk"` from being matched as a product UUID.

### 6.8 Operation: Report List

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Admin navigates to /admin/reports or changes the report status filter |
| **API Endpoint** | `GET /api/v1/admin/reports` |
| **Request Query Parameters** | `page` (default: 1), `limit` (default: 20), `sort` (default: `createdAt`), `order` (default: `desc`), `status` (`pending`/`reviewed`/`resolved`/`rejected`/omitted for all), `search` (searches reporter name, reporter email, review body) |
| **Pre-Submission Validation** | JWT access token validated. Admin role verified. |
| **Processing Steps** | 1. Validate JWT access token. 2. Verify admin role via RolesGuard. 3. Query `review_reports` table with optional status filter. 4. Include `review` (with nested `user` and `product`), `reporter` (id, name, email, avatarUrl), `resolver` (id, name). 5. Apply pagination. 6. Return `{ items, total, page, limit, totalPages }`. |
| **Success Response** | 200 OK with paginated report data |
| **Post-Action** | Display reports table |

### 6.8.1 Operation: Get Report By ID

| Attribute | Specification |
|-----------|---------------|
| **API Endpoint** | `GET /api/v1/admin/reports/:id` |
| **Processing Steps** | Returns full report including nested `review` (with user and product), `reporter`, and `resolver`. Throws 404 if not found. |
| **Success Response** | 200 OK with full report DTO |

### 6.9 Operation: Report Status Update

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Admin clicks "Reject", "Mark Reviewed", or "Resolve" on a report |
| **API Endpoint** | `PATCH /api/v1/admin/reports/:id/status` |
| **Request Content-Type** | `application/json` |
| **Request Body** | `{ status: 'reviewed' \| 'resolved' \| 'rejected', adminNote?: string }` |
| **Pre-Submission Validation** | JWT access token validated. Admin role verified. Report exists. 409 if report already resolved. Status `reviewed` can only be set from `pending` state (409 otherwise). |
| **Processing Steps** | 1. Validate JWT and admin role. 2. Find report by UUID. 3. Throw 409 if already resolved. 4. Throw 409 if marking `reviewed` on a non-pending report. 5. Within a DB transaction: update `review_reports.status`, `adminNote`, `resolvedBy`, `resolvedAt`. 6. If status = `'resolved'`: find target review, set `reviews.status = 'rejected'`, recalculate product stats, invalidate product cache. 7. Log to `audit_logs` (action: `REPORT_RESOLVED` or `REPORT_REJECTED`, entityType: `'report'`, entityId: reportId, newValue: `{ status, reviewId }`). 8. After transaction (for `resolved` or `rejected`): send notifications (fail-open) — reporter receives `REPORT_RESOLVED` or `REPORT_REJECTED`; merchant receives `REPORT_RESOLVED` on resolution. 9. Return updated report. |
| **Success Response** | 200 OK with updated Report DTO |
| **Post-Action** | Display toast notification. Refresh reports list. |

---

## 7. Input / Output Specification

### 7.1 Input Specification — Review Moderation (入力定義)

`ModerateReviewDto`:

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `action` | Moderation Action | 審査アクション | ENUM (`'approve'`, `'reject'`) | Yes | Radio / Button | `@IsEnum(ReviewAction)`, `@IsNotEmpty()` |
| `reason` | Rejection Reason | 却下理由 | VARCHAR(500) | Conditional | Textarea | `@IsOptional()`, `@IsString()`, `@MaxLength(500)`; non-empty enforced at service layer when action = `'reject'` |

`BulkModerateReviewsDto`:

| Field | Display Name (EN) | Data Type | Required | Validation |
|-------|-------------------|-----------|:--------:|------------|
| `ids` | Review IDs | string[] | Yes | `@IsArray()`, `@ArrayMinSize(1)`, `@IsString({ each: true })` |
| `action` | Action | ENUM | Yes | `@IsEnum(ReviewAction)`, `@IsNotEmpty()` |
| `reason` | Reason | VARCHAR(500) | No | `@IsOptional()`, `@MaxLength(500)` |

`BulkDeleteReviewsDto`:

| Field | Data Type | Required | Validation |
|-------|-----------|:--------:|------------|
| `ids` | string[] | Yes | `@IsArray()`, `@ArrayMinSize(1)`, `@IsString({ each: true })` |

### 7.2 Input Specification — Merchant Approval (入力定義)

`ModerateMerchantDto`:

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `status` | Approval Status | 承認ステータス | ENUM (`'approved'`, `'rejected'`) | Yes | Radio / Button | `@IsEnum(MerchantStatus)`, `@IsNotEmpty()` |
| `reason` | Rejection Reason | 却下理由 | VARCHAR(500) | Conditional | Textarea | `@IsOptional()`, `@IsString()`, `@MaxLength(500)`; non-empty enforced at service layer when status = `'rejected'` |

### 7.3 Input Specification — User Moderation (入力定義)

`ModerateUserDto`:

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `isActive` | Active Status | 有効ステータス | BOOLEAN | Yes | Toggle | `@IsBoolean()`, `@IsNotEmpty()` |
| `reason` | Deactivation Reason | 無効化理由 | VARCHAR(500) | Conditional | Textarea | `@IsOptional()`, `@IsString()`, `@MaxLength(500)`; non-empty enforced at service layer when `isActive = false` |

`BulkModerateProductsDto`:

| Field | Data Type | Required | Validation |
|-------|-----------|:--------:|------------|
| `ids` | string[] | Yes | `@IsArray()`, `@ArrayMinSize(1)`, `@IsString({ each: true })` |
| `isActive` | boolean | Yes | `@IsBoolean()`, `@IsNotEmpty()` |
| `reason` | VARCHAR(500) | No | `@IsOptional()`, `@MaxLength(500)` |

### 7.4 Input Specification — Review Report (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `reason` | Report Reason | 報告理由 | ENUM ('spam', 'inappropriate', 'fake', 'other') | Yes | Select | `@IsIn(['spam', 'inappropriate', 'fake', 'other'])` |
| `detail` | Report Detail | 報告詳細 | TEXT | No | Textarea | `@MaxLength(1000)` |
| `reviewId` | Review ID | レビューID | UUID | Yes | Hidden field | `@IsUUID()` |

### 7.4.1 Input Specification — Report Status Update (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `status` | Report Status | 報告ステータス | ENUM ('reviewed', 'resolved', 'rejected') | Yes | Radio / Button | `@IsIn(['reviewed', 'resolved', 'rejected'])` |
| `adminNote` | Admin Note | 管理者メモ | TEXT | No | Textarea | `@MaxLength(1000)` |

### 7.5 Output Specification — Review List (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `id` | `reviews.id` | UUID string |
| `status` | `reviews.status` | Status badge (`pending` → Amber, `approved` → Green, `rejected` → Red) |
| `rating` | `reviews.rating` | Star icons (1-5) |
| `title` | `reviews.title` | String or null |
| `body` | `reviews.body` | Review body text |
| `user.id` | `users.id` | UUID string |
| `user.name` | `users.name` | String |
| `user.email` | `users.email` | String |
| `user.avatarUrl` | `users.avatar_url` | URL or null |
| `product.id` | `products.id` | UUID string |
| `product.name` | `products.name` | String |
| `product.images` | `products.images` | Array of image URLs |
| `product.slug` | `products.slug` | String |
| `product.price` | `products.price` | Decimal string |
| `createdAt` | `reviews.created_at` | ISO 8601 timestamp |
| `updatedAt` | `reviews.updated_at` | ISO 8601 timestamp |

> **Note:** The `reviews.status` string field is the canonical status indicator. There is no `isApproved` boolean field in the API response.

### 7.6 Output Specification — Merchant List (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `id` | `merchants.id` | UUID string |
| `shopName` | `merchants.shop_name` / `shops.name` | String |
| `licenseStatus` | `merchants.license_status` | Status badge (Pending/Approved/Rejected) |
| `shop.isApproved` | `shops.is_approved` | Boolean visibility flag |
| `shop.slug` | `shops.slug` | String |
| `shop.logoUrl` | `shops.logo_url` | URL or placeholder |
| `user.name` | `users.name` | String |
| `user.email` | `users.email` | String |
| `createdAt` | `merchants.created_at` | ISO 8601 timestamp |

### 7.7 Output Specification — Report List (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `id` | `review_reports.id` | UUID string |
| `reviewer.name` | `users.name` (reporter) | String |
| `reviewer.email` | `users.email` (reporter) | String |
| `review.content` | `reviews.body` | Text excerpt (100 chars) |
| `review.rating` | `reviews.rating` | Star icons (1-5) |
| `reason` | `review_reports.reason` | Badge (spam/inappropriate/fake/other) |
| `detail` | `review_reports.description` | Text or "—" |
| `status` | `review_reports.status` | Status badge (Pending/Reviewed/Resolved/Rejected) |
| `resolvedBy.name` | `users.name` (resolver) | String or "—" |
| `adminNote` | `review_reports.admin_note` | Text or "—" |
| `resolvedAt` | `review_reports.resolved_at` | ISO 8601 timestamp or "—" |
| `createdAt` | `review_reports.created_at` | ISO 8601 timestamp |

---

## 8. Input Validation Rules

### 8.1 Review Moderation Validation (Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `action` | Required, `@IsEnum(ReviewAction)` | "action must be 'approve' or 'reject'" | "アクションは'approve'または'reject'である必要があります" |
| `reason` | `@MaxLength(500)` at DTO layer; non-empty enforced at service layer when action = `'reject'` | "Rejection reason is required" | "却下理由は必須です" |

### 8.2 Merchant Approval Validation (Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `status` | Required, must be 'approved' or 'rejected' | "Status must be 'approved' or 'rejected'" | "ステータスは'approved'または'rejected'である必要があります" |
| `reason` | Required when status = 'rejected' | "Rejection reason is required" | "却下理由は必須です" |

### 8.3 User Moderation Validation (Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `isActive` | Required, `@IsBoolean()` | "Active status must be a boolean" | "有効ステータスはブール値である必要があります" |
| `reason` | `@MaxLength(500)` at DTO; non-empty enforced at service layer when `isActive = false` | "Deactivation reason is required" | "無効化理由は必須です" |

### 8.4 Report Validation (Strict Mode)

`ReportReviewDto` (create report via `POST /admin/reviews/:id/report`):

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `reason` | Required, `@IsEnum(ReportReviewReason)` | "reason must be 'spam', 'inappropriate', 'fake', or 'other'" | "理由は次のいずれかである必要があります: spam, inappropriate, fake, other" |
| `detail` | Optional, `@MaxLength(500)` | "Detail must not exceed 500 characters" | "詳細は500文字以下である必要があります" |

> **Note:** `reviewId` is passed as a path parameter (`/admin/reviews/:id/report`), not as a body field.

### 8.4.1 Report Status Update Validation

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `status` | Required, valid ENUM value | "Status must be one of: reviewed, resolved, rejected" | "ステータスは次のいずれかである必要があります: reviewed, resolved, rejected" |
| `adminNote` | Optional, max 1000 chars | "Admin note must not exceed 1000 characters" | "管理者メモは1000文字以下である必要があります" |

### 8.5 Validation Enforcement Layers

1. **Frontend (Client)**: React Hook Form + Zod schema validation with real-time feedback.
2. **Backend (Server)**: NestJS ValidationPipe + class-validator DTOs on all endpoints.

---

## 9. Error Handling Specification

### 9.1 Error Response Structure

Per DEV RULES Section 6.1, error responses follow standard NestJS format:

```json
{
  "statusCode": 400,
  "message": ["action must be one of the following values: approve, reject"],
  "error": "Bad Request",
  "timestamp": "2026-08-21T12:00:00.000Z",
  "path": "/api/v1/admin/reviews/abc123/moderate"
}
```

**Success Response Structure** (per DEV RULES Section 8.3):

Single resource:
```json
{
  "data": {
    "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "isApproved": true,
    "rating": 5
  }
}
```

Collection with pagination:
```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

**Response Rules:**
- Always wrap data in `{ data: ... }` envelope.
- Use `meta` for pagination metadata.
- Use ISO 8601 for all dates: `"2026-08-21T12:00:00.000Z"`.
- Use string for decimal values: `"29.99"` not `29.99`.
- Never return Prisma entity directly. Use DTOs or explicit `select`.

### 9.2 Error Classification Table — Review Moderation

| HTTP Status | Error Code | Scenario | User-Facing Behavior |
|-------------|------------|----------|---------------------|
| `400` | `BAD_REQUEST` | Validation failures (missing action, reason) | Field-level inline errors + top banner |
| `403` | `FORBIDDEN` | Non-admin user attempting moderation | "You do not have permission to perform this action" |
| `404` | `NOT_FOUND` | Review not found | "Review not found" with back link |
| `409` | `CONFLICT` | Review already in target state | "Review is already approved/rejected" |
| `500` | `INTERNAL_SERVER_ERROR` | Server error | "Something went wrong. Please try again" |

### 9.3 Error Classification Table — Merchant Management

| HTTP Status | Error Code | Scenario | User-Facing Behavior |
|-------------|------------|----------|---------------------|
| `400` | `BAD_REQUEST` | Validation failures | Field-level inline errors |
| `403` | `FORBIDDEN` | Non-admin user | "You do not have permission" |
| `404` | `NOT_FOUND` | Merchant/shop not found | "Merchant not found" |
| `409` | `CONFLICT` | Merchant already in target status | "Merchant is already approved/rejected" |
| `500` | `INTERNAL_SERVER_ERROR` | Server error | "Something went wrong. Please try again" |

### 9.4 Error Classification Table — Report Management

| HTTP Status | Error Code | Scenario | User-Facing Behavior |
|-------------|------------|----------|---------------------|
| `400` | `BAD_REQUEST` | Validation failures (missing reason, reviewId) | Field-level inline errors |
| `403` | `FORBIDDEN` | Non-admin user | "You do not have permission" |
| `404` | `NOT_FOUND` | Report not found | "Report not found" |
| `409` | `CONFLICT` | Attempting to change an already resolved/rejected report | "This report has already been resolved" |
| `500` | `INTERNAL_SERVER_ERROR` | Server error | "Something went wrong. Please try again" |

### 9.5 Frontend Error Display Behavior

- **Field-Level Validation**: Red border and inline text below invalid input.
- **Form-Level Summary**: Alert banner at top of form listing all errors.
- **Toast Notifications**: Used for API errors and successful actions.
- **Loading States**: Spinner on submit buttons during API calls.
- **Confirmation Dialogs**: Required for destructive actions (delete review, reject merchant).

---

## 10. Permission and Access Control

### 10.1 Authentication Requirements

- JSON Web Token (JWT) Bearer Token passed via `Authorization` header for all admin endpoints.
- Token must contain `role: 'admin'` in payload.

### 10.2 Admin Endpoint Access Control

| Endpoint | Method | Access Level | Description |
|----------|--------|-------------|-------------|
| `GET /admin/dashboard-stats` | GET | Protected (admin) | Aggregated counts for admin dashboard |
| `GET /admin/reviews` | GET | Protected (admin) | View all reviews with status/search filter |
| `GET /admin/reviews/:id` | GET | Protected (admin) | View single review detail |
| `POST /admin/reviews/bulk/moderate` | POST | Protected (admin) | Bulk approve/reject reviews |
| `DELETE /admin/reviews/bulk` | DELETE | Protected (admin) | Bulk delete reviews |
| `POST /admin/reviews/:id/moderate` | POST | Protected (admin) | Approve/reject single review |
| `POST /admin/reviews/:id/report` | POST | Protected (admin) | Create a report for a review |
| `DELETE /admin/reviews/:id` | DELETE | Protected (admin) | Hard-delete single review |
| `GET /admin/merchants` | GET | Protected (admin) | View all merchants with license_status filter |
| `GET /admin/merchants/:id` | GET | Protected (admin) | View single merchant detail |
| `PATCH /admin/merchants/:id/status` | PATCH | Protected (admin) | Approve/reject merchant (updates license_status + shops.is_approved) |
| `GET /admin/content` | GET | Protected (admin) | View all products for content moderation |
| `GET /admin/content/:id` | GET | Protected (admin) | View single product detail |
| `PATCH /admin/content/bulk/status` | PATCH | Protected (admin) | Bulk deactivate/reactivate products |
| `PATCH /admin/content/:id/status` | PATCH | Protected (admin) | Deactivate/reactivate single product |
| `GET /admin/users` | GET | Protected (admin) | View all users with status filter |
| `GET /admin/users/:id` | GET | Protected (admin) | View single user detail |
| `PATCH /admin/users/:id/status` | PATCH | Protected (admin) | Activate/deactivate user |
| `GET /admin/reports` | GET | Protected (admin) | View all review reports with status filter |
| `GET /admin/reports/:id` | GET | Protected (admin) | View single report detail |
| `PATCH /admin/reports/:id/status` | PATCH | Protected (admin) | Report status update (reviewed/resolved/rejected) |
| `DELETE /admin/reports/:id` | DELETE | Protected (admin) | Delete report (pending/rejected only) |

### 10.3 Role-Based Access

| Role | Can View Reviews | Can Moderate Reviews | Can Manage Merchants | Can Manage Users | Can Manage Reports | Can Moderate Products |
|------|:----------------:|:--------------------:|:--------------------:|:----------------:|:----------------:|:----------------:|
| `buyer` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `merchant` | Own products only | ✗ | ✗ | ✗ | ✗ | ✗ |
| `admin` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

### 10.4 Security Audit Logging

Per DB spec Section 3.28, audit logs use the `audit_logs` table with structured JSONB fields. Entity types use **lowercase** values as implemented in the service layer (`logAudit` helper).

| Event | `entityType` | `newValue` shape | Retention |
|-------|-------------|------------------|-----------|
| `REVIEW_APPROVED` | `'review'` | `{ status: 'approved', reason }` | 2 years |
| `REVIEW_REJECTED` | `'review'` | `{ status: 'rejected', reason }` | 2 years |
| `REVIEW_DELETED` | `'review'` | `oldValue: { productId }`, newValue: `undefined` | 2 years |
| `REPORT_CREATED` | `'report'` | `{ reviewId, reason }` | 2 years |
| `MERCHANT_APPROVED` | `'merchant'` | `{ status: 'approved', reason, shopId }` | 2 years |
| `MERCHANT_REJECTED` | `'merchant'` | `{ status: 'rejected', reason, shopId }` | 2 years |
| `USER_ACTIVATED` | `'user'` | `{ isActive: true, reason }` | 2 years |
| `USER_DEACTIVATED` | `'user'` | `{ isActive: false, reason }` | 2 years |
| `PRODUCT_DEACTIVATED` | `'product'` | `{ isActive: false, reason }` | 2 years |
| `PRODUCT_REACTIVATED` | `'product'` | `{ isActive: true, reason }` | 2 years |
| `REPORT_RESOLVED` | `'report'` | `{ status: 'resolved', reviewId }` | 2 years |
| `REPORT_REJECTED` | `'report'` | `{ status: 'rejected', reviewId }` | 2 years |
| `REPORT_DELETED` | `'report'` | `oldValue: { reviewId, status }`, newValue: `undefined` | 2 years |

---

## 11. Real-Time Notification Behavior

### 11.1 Admin Dashboard Notifications

The admin dashboard receives real-time updates for pending moderation items:

| Event | Trigger | Action |
|-------|---------|--------|
| `NEW_MERCHANT_REGISTRATION` | New merchant registers | Increment pending merchant approvals badge |
| `REVIEW_CREATED` | New review submitted | Increment total reviews badge; review hidden until admin approval |
| `NEW_REPORT` | Buyer submits review report | Increment pending reports badge |

### 11.2 Post-Moderation Notifications

After moderation action, relevant parties are notified via the `notifications` table (DB spec Section 3.29). Notification creation is **fail-open** — moderation actions complete even if notification creation fails. Duplicate notifications are suppressed via `skipDuplicates: true` or a `userId:type` Map deduplication step.

| Notification `type` | Trigger | Recipient(s) | `entityType` | Notes |
|---------------------|---------|--------------|--------------|-------|
| `REVIEW_APPROVED` | Admin approves review | Review author (`userId`) | `'Product'` (entityId = productId) | Merchant also notified with same type if product merchant differs from reviewer |
| `REVIEW_REJECTED` | Admin rejects review | Review author (`userId`) | `'Review'` (entityId = reviewId) | |
| `MERCHANT_STATUS_CHANGED` | Admin approves/rejects merchant | Merchant user (`userId`) | `'merchant'` (entityId = merchantId) | Single notification covers both approved and rejected |
| `PRODUCT_DEACTIVATED` | Admin deactivates product | Product merchant user | `'product'` (entityId = productId) | |
| `PRODUCT_REACTIVATED` | Admin reactivates product | Product merchant user | `'product'` (entityId = productId) | |
| `USER_ACTIVATED` | Admin activates user | Affected user | `'user'` (entityId = userId) | |
| `USER_DEACTIVATED` | Admin deactivates user | Affected user | `'user'` (entityId = userId) | |
| `REPORT_RESOLVED` | Admin resolves report | Reporter (`reportedBy`) + Product merchant | `'ReviewReport'` / `'Product'` | Reporter gets `REPORT_RESOLVED`; merchant gets separate `REPORT_RESOLVED` notification |
| `REPORT_REJECTED` | Admin rejects report | Reporter (`reportedBy`) | `'ReviewReport'` (entityId = reportId) | |

**Notification Table Fields (per DB spec):**
- `id`: UUID primary key
- `userId`: Recipient user ID (FK to `users`)
- `type`: Notification type string (uppercase enum, e.g., `REVIEW_APPROVED`)
- `title`: Notification title (VARCHAR 255)
- `message`: Notification body text (TEXT)
- `entityType`: Related entity type string (e.g., `'Product'`, `'Review'`, `'merchant'`, `'user'`)
- `entityId`: Related entity UUID
- `isRead`: Boolean (default false)
- `readAt`: Timestamp when read (nullable)

---

## 12. Screen Transition Specification

### 12.1 Inbound Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| Admin Dashboard | `/admin/reviews` | Clicking "Reviews" card or sidebar link |
| Admin Dashboard | `/admin/merchants` | Clicking "Pending Approvals" card or sidebar link |
| Admin Dashboard | `/admin/reports` | Clicking "Reports" card or sidebar link |
| Admin Dashboard | `/admin/products` | Clicking "Products" card or sidebar link |
| Any admin page | `/admin/reviews` | Direct URL navigation |

### 12.2 Internal Navigation

| Source | Target | Trigger |
|--------|--------|---------|
| `/admin/reviews` | Review Detail Modal | Click "View Detail" or row click |
| `/admin/merchants` | Merchant Detail Modal | Click "View Detail" or row click |
| `/admin/reports` | Report Detail Modal | Click "View Detail" or row click |
| `/admin/reviews` | `/admin/merchants` | Sidebar navigation |
| `/admin/merchants` | `/admin/reviews` | Sidebar navigation |
| `/admin/reports` | `/admin/reviews` | Sidebar navigation |

### 12.3 Outbound Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| `/admin/reviews` | `/products/:slug` | Click "View Product" link in review detail |
| `/admin/merchants` | `/admin/reviews` | After merchant approval, navigate to their reviews |
| `/admin/reports` | `/admin/reviews` | After report resolution, navigate to target review |
| Any admin page | `/admin/dashboard` | Click "Back to Dashboard" |

### 12.4 Error Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| Any admin page | `/login` | JWT token expired or invalid |
| Any admin page | `/unauthorized` | 403 Forbidden (non-admin role) |
| Any admin page | `/admin/dashboard` | Resource not found (404) |
| `/admin/reports` | `/admin/reports` | After report status update, refresh list |

---

## 13. Non-Functional Considerations

### 13.1 Performance Requirements

Per DEV RULES Section 10.1:

| Metric | Target |
|--------|--------|
| Admin Dashboard Load (LCP) | ≤ 2 seconds |
| Reviews List API Response (p95) | ≤ 500 milliseconds |
| Moderation Action Response | ≤ 300 milliseconds |
| Search/Filter Response (10K reviews) | ≤ 3 seconds |
| Cache Invalidation (Redis DEL) | ≤ 5 milliseconds |
| Database Query Time | ≤ 50 milliseconds |

### 13.2 Security Considerations

Per DEV RULES Sections 5.4, 6.4:

| Concern | Mitigation |
|---------|------------|
| Unauthorized Access | JwtAuthGuard + RolesGuard on all admin endpoints (DEV RULES 5.4) |
| RBAC Bypass | Backend enforcement only; never trust frontend (DEV RULES 5.4) |
| Audit Trail Tampering | Append-only `audit_logs` table with structured JSONB old_value/new_value (DB SPEC 3.28) |
| Bulk Operations | Rate limiting on admin endpoints via Redis sliding window (DEV RULES 10.5) |
| Destructive Actions | Confirmation dialogs required for delete/reject actions |
| Session Revocation | Deactivating user revokes all refresh tokens (UPDATE is_revoked = true) |
| Input Validation | All inputs validated via class-validator DTOs with whitelist: true (DEV RULES 5.6) |
| Password Security | Argon2id hashing only (DEV RULES 5.5) |

### 13.3 Responsive Design Requirements

Per DEV RULES Section 9.1 (Layout Grid):

| Breakpoint | Layout |
|------------|--------|
| Desktop (≥ 1024px) | Full sidebar + table layout with modal overlays (12-column grid, max-width 1280px) |
| Tablet (768px – 1023px) | Collapsible sidebar + responsive table (8-column grid) |
| Mobile (< 768px) | Bottom navigation + stacked cards (4-column grid, admin mobile not primary target) |

**Design Tokens:** Use shadcn/ui CSS variables per DEV RULES Section 9.6. Primary: Luxury Purple (#7C3AED), Accent: Beauty Pink (#EC4899), Secondary: Soft Lavender (#F3E8FF).

---

## 14. Configurable Items (External Definitions)

Defined via `.env` configuration:

| Definition Key | Default Value | Description |
|----------------|---------------|-------------|
| `ADMIN_RATE_LIMIT` | `100` | Max admin API requests per minute |
| `REVIEW_DEFAULT_PAGE_SIZE` | `20` | Default reviews per page |
| `REVIEW_MAX_PAGE_SIZE` | `100` | Maximum reviews per page |
| `PRODUCT_CACHE_TTL` | `300` | Product cache TTL in seconds (5 min) |
| `AUDIT_LOG_RETENTION_DAYS` | `730` | Admin audit log retention (2 years) |
| `MODERATION_REASON_MAX_LENGTH` | `500` | Maximum characters for moderation reason |
| `REPORT_DETAIL_MAX_LENGTH` | `1000` | Maximum characters for report detail text |
| `DELETE_CONFIRMATION_REQUIRED` | `true` | Require confirmation dialog for destructive actions |

---

## 15. Cross-Reference Traceability Matrix

### 15.1 Requirements Definition Traceability

| Requirement ID | Requirement Description | Covered By (This Document) |
|----------------|-------------------------|----------------------------|
| A-REV-001 | Admin can view all reviews | UC-MOD-001, Sec 6.1 |
| A-REV-002 | Admin can approve/reject reviews | UC-MOD-002, BR-MOD-001~006, Sec 6.2 |
| A-REV-003 | Admin can delete inappropriate reviews | UC-MOD-003, BR-MOD-005, Sec 6.3 |
| A-CONT-002 | Admin can approve/reject merchant registrations | UC-MOD-005, BR-MOD-020~023, Sec 6.6 |
| A-CONT-004 | Admin can remove violating content | UC-MOD-004, UC-MOD-008, Sec 6.5 |
| A-REPORT-001 | Buyer can report a review | UC-MOD-007, BR-MOD-050~055 |
| A-REPORT-002 | Admin can review/resolve reports | UC-MOD-007, BR-MOD-053~055, Sec 6.8~6.9 |

### 15.2 Database Design Traceability

| Database Table | Relevant Functional Operations |
|----------------|-------------------------------|
| `reviews` | View reviews (SELECT with user + product joins), Moderate reviews (UPDATE `status`), Delete reviews (DELETE) |
| `products` | View products (SELECT), Recalculate `avg_rating` and `review_count` via raw SQL (approved reviews only), Product moderation (UPDATE `is_active`) |
| `merchants` | View merchants (SELECT), Approve/reject merchants (UPDATE `license_status`, `rejection_reason`, `reviewed_at`, `reviewed_by`) |
| `shops` | Synchronize shop approval on merchant action (UPDATE `is_approved`) |
| `users` | View users (SELECT), Activate/deactivate users (UPDATE `is_active`, `deactivation_reason`) |
| `refresh_tokens` | Revoke active sessions on user deactivation (UPDATE `is_revoked = true`) |
| `review_reports` | View reports (SELECT with reporter + review + resolver joins), Report creation (INSERT), Report status update (UPDATE `status`, `resolved_by`, `resolved_at`, `admin_note`), Report deletion (DELETE) |
| `audit_logs` | Audit log recording (INSERT) — fields: `user_id`, `action`, `entity_type` (lowercase), `entity_id`, `old_value` (JSONB), `new_value` (JSONB) |
| `notifications` | Website notification creation (INSERT) — fields: `user_id`, `type` (uppercase), `title`, `message`, `entity_type`, `entity_id` |

### 15.3 API Endpoint Traceability

| API Endpoint | Method | Functional Operation | Requirement |
|--------------|--------|---------------------|-------------|
| `GET /admin/dashboard-stats` | GET | Admin dashboard counts | — |
| `GET /admin/reviews` | GET | View all reviews | A-REV-001 |
| `GET /admin/reviews/:id` | GET | View single review | A-REV-001 |
| `POST /admin/reviews/bulk/moderate` | POST | Bulk approve/reject reviews | A-REV-002 |
| `DELETE /admin/reviews/bulk` | DELETE | Bulk delete reviews | A-REV-003 |
| `POST /admin/reviews/:id/moderate` | POST | Approve/reject single review | A-REV-002 |
| `POST /admin/reviews/:id/report` | POST | Create report for a review | A-REPORT-001 |
| `DELETE /admin/reviews/:id` | DELETE | Delete single review | A-REV-003 |
| `GET /admin/merchants` | GET | View merchants | A-CONT-002 |
| `GET /admin/merchants/:id` | GET | View single merchant | A-CONT-002 |
| `PATCH /admin/merchants/:id/status` | PATCH | Approve/reject merchant | A-CONT-002 |
| `GET /admin/content` | GET | View products for moderation | A-CONT-004 |
| `GET /admin/content/:id` | GET | View single product | A-CONT-004 |
| `PATCH /admin/content/bulk/status` | PATCH | Bulk product moderation | A-CONT-004 |
| `PATCH /admin/content/:id/status` | PATCH | Single product moderation | A-CONT-004 |
| `GET /admin/users` | GET | View users | A-CONT-002 |
| `GET /admin/users/:id` | GET | View single user | A-CONT-002 |
| `PATCH /admin/users/:id/status` | PATCH | Activate/deactivate user | A-CONT-002 |
| `GET /admin/reports` | GET | View reports | A-REPORT-001 |
| `GET /admin/reports/:id` | GET | View single report | A-REPORT-002 |
| `PATCH /admin/reports/:id/status` | PATCH | Report status update | A-REPORT-002 |
| `DELETE /admin/reports/:id` | DELETE | Delete report | A-REPORT-002 |

### 15.4 Related Document References

| Document ID | Document Name | File Path |
|-------------|---------------|-----------|
| SKM-REQ-001 | Requirements Definition (v2.10) | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` |
| SKM-DBS-001 | Database Design Specification (v2.4) | `docs/core-work/データベース設計書_DATABASE_SPEC.md` |
| SKM-DEV-001 | Development Rules (v2.1) | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` |

---

*End of Functional Specification (Review & Content Moderation)*
