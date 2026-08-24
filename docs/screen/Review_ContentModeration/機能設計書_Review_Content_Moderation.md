# Functional Specification (機能設計書) — Review & Content Moderation

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-FDS-MOD-001 |
| **Target Screen** | Review & Content Moderation (レビュー・コンテンツ管理) |
| **Subsystem** | Administration — Review Moderation & Content Management |
| **Function ID** | FN-MOD-001 |
| **Version** | 2.2 |
| **Created** | 2026-08-07 |
| **Last Updated** | 2026-08-24 |
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

| State | Description | Visible to Buyers | Can Be Edited |
|-------|-------------|:-----------------:|:-------------:|
| `APPROVED` | Review is approved and displayed on product page | ✓ | ✗ |
| `REJECTED` | Review is rejected and hidden from product page | ✗ | ✗ |
| `PENDING` | Review awaiting admin approval (hidden from buyers). Mapped to `is_approved = false` in the database. Visible only in admin moderation queue. | N/A | ✗ |

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
| **Request Query Parameters** | `page` (default: 1), `limit` (default: 20), `sort` (default: `createdAt`), `order` (default: `desc`), `status` (`pending`/`approved`/`rejected`/omitted for all) |
| **Pre-Submission Validation** | JWT access token validated. Admin role verified. |
| **Processing Steps** | 1. Validate JWT access token. 2. Verify admin role via RolesGuard. 3. Query `reviews` table with filters. 4. Join with `users` and `products` for display data. 5. Apply pagination. 6. Return paginated review list in `{ data, meta }` envelope. |
| **Success Response** | 200 OK with paginated review data |
| **Post-Action** | Display reviews table with moderation actions |

### 6.2 Operation: Moderate Review (Approve/Reject)

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Admin clicks "Approve" or "Reject" on a review |
| **API Endpoint** | `POST /api/v1/admin/reviews/:id/moderate` |
| **Request Content-Type** | `application/json` |
| **Request Body** | `{ action: 'approve' | 'reject', reason?: string }` |
| **Pre-Submission Validation** | JWT access token validated. Admin role verified. Review exists. Reason required for rejection. |
| **Processing Steps** | 1. Validate JWT and admin role. 2. Find review by ID. 3. If action = 'reject', validate reason is provided. 4. Update `reviews.is_approved` based on action (true for approve, false for reject). 5. Recalculate product `avg_rating` and `review_count` from approved reviews only. 6. Invalidate product cache in Redis (`DEL cache:product:{id}`). 7. Invalidate product list cache in Redis (`DEL cache:products:list:*`). 8. Log moderation action to `audit_logs` table (user_id, action, entity_type: 'Review', entity_id, old_value, new_value, ip_address, user_agent). 9. Create notifications for review author and product merchant (type: `review.status_changed`). 10. Return updated review data in `{ data }` envelope. |
| **Success Response** | 200 OK with updated review DTO |
| **Post-Action** | Display toast notification. Refresh reviews list. |

### 6.3 Operation: Delete Review

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Admin clicks "Delete" on a review with confirmation dialog |
| **API Endpoint** | `DELETE /api/v1/admin/reviews/:id` |
| **Request Headers** | `Authorization: Bearer <accessToken>` |
| **Pre-Submission Validation** | JWT access token validated. Admin role verified. Review exists. |
| **Processing Steps** | 1. Validate JWT and admin role. 2. Find review by ID. 3. Hard delete review from database. 4. Recalculate product `avg_rating` and `review_count` from remaining approved reviews. 5. Invalidate product cache in Redis (`DEL cache:product:{id}`). 6. Invalidate product list cache in Redis (`DEL cache:products:list:*`). 7. Log deletion action to `audit_logs` table (old_value contains deleted review data, new_value is null). 8. Return 204 No Content. |
| **Success Response** | 204 No Content |
| **Post-Action** | Display toast notification. Refresh reviews list. |

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

### 6.6 Operation: Approve/Reject Merchant

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Admin clicks "Approve" or "Reject" on a merchant |
| **API Endpoint** | `PATCH /api/v1/admin/merchants/:id/status` |
| **Request Content-Type** | `application/json` |
| **Request Body** | `{ status: 'approved' | 'rejected', reason?: string }` |
| **Pre-Submission Validation** | JWT access token validated. Admin role verified. Merchant and associated shop exist. |
| **Processing Steps** | 1. Validate JWT and admin role. 2. Find merchant by ID. 3. If status = 'rejected', validate reason is provided. 4. Update `merchants.license_status` to `'approved'` or `'rejected'`. 5. Set `merchants.rejection_reason`, `reviewed_at`, and `reviewed_by`. 6. Synchronize associated `shops.is_approved` (`true` when approved, `false` when rejected). 7. If rejected, deactivate merchant's products (`is_active = false`). 8. Create website notification for the merchant user (type: `merchant.approved` or `merchant.rejected`). 9. Log moderation action to audit trail with `old_value`/`new_value` JSONB. 10. Return updated merchant data. |
| **Success Response** | 200 OK with updated merchant DTO |
| **Post-Action** | Display toast notification. Refresh merchants list. |

### 6.7 Operation: Activate/Deactivate User

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Admin toggles user active status |
| **API Endpoint** | `PATCH /api/v1/admin/users/:id/status` |
| **Request Content-Type** | `application/json` |
| **Request Body** | `{ isActive: boolean }` |
| **Pre-Submission Validation** | JWT access token validated. Admin role verified. User exists. Admin cannot deactivate self. |
| **Processing Steps** | 1. Validate JWT and admin role. 2. Find user by ID. 3. Prevent self-deactivation. 4. Update `users.is_active`. 5. If deactivating, revoke all user refresh tokens (`UPDATE refresh_tokens SET is_revoked = true WHERE user_id = ?`). 6. Invalidate user profile cache in Redis (`DEL cache:user:{id}`). 7. Log action to `audit_logs` table (user_id, action, entityType: 'User', entityId: targetUserId, oldValue, newValue, ipAddress, userAgent). 8. Return updated user data in `{ data }` envelope. |
| **Success Response** | 200 OK with updated user DTO |
| **Post-Action** | Display toast notification. Refresh users list. |

### 6.5 Operation: Product Content Moderation

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Admin clicks "Deactivate" or "Reactivate" on a product |
| **API Endpoint** | `PATCH /api/v1/admin/products/:id/status` |
| **Request Content-Type** | `application/json` |
| **Request Body** | `{ isActive: boolean, reason?: string }` |
| **Pre-Submission Validation** | JWT access token validated. Admin role verified. Product exists. |
| **Processing Steps** | 1. Validate JWT and admin role. 2. Find product by ID. 3. If deactivating, validate reason is provided. 4. Update `products.is_active`. 5. Invalidate product cache in Redis (`DEL cache:product:{id}`). 6. Invalidate product list cache in Redis (`DEL cache:products:list:*`). 7. Log action to `audit_logs` table (user_id, action, entityType: 'Product', entityId: productId, oldValue, newValue, ipAddress, userAgent). 8. Create notification for product merchant (type: `product.deactivated`). 9. Return updated product data in `{ data }` envelope. |
| **Success Response** | 200 OK with updated Product DTO |
| **Post-Action** | Display toast notification. Refresh products list. |

### 6.8 Operation: Report List

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Admin navigates to /admin/reports or changes the report status filter |
| **API Endpoint** | `GET /api/v1/admin/reports` |
| **Request Query Parameters** | `page` (default: 1), `limit` (default: 20), `sort` (default: `createdAt`), `order` (default: `desc`), `status` (`pending`/`reviewed`/`resolved`/`rejected`/omitted for all) |
| **Pre-Submission Validation** | JWT access token validated. Admin role verified. |
| **Processing Steps** | 1. Validate JWT access token. 2. Verify admin role via RolesGuard. 3. Query `review_reports` table with optional status filter. 4. Join with `users` (reporter), `reviews` (reported review), and `users` (resolver) for display data. 5. Apply pagination. 6. Return paginated report list in `{ data, meta }` envelope. |
| **Success Response** | 200 OK with paginated report data |
| **Post-Action** | Display reports table |

### 6.9 Operation: Report Status Update

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Admin clicks "Reject" or "Complete" on a report |
| **API Endpoint** | `PATCH /api/v1/admin/reports/:id/status` |
| **Request Content-Type** | `application/json` |
| **Request Body** | `{ status: 'reviewed' | 'resolved' | 'rejected', adminNote?: string }` |
| **Pre-Submission Validation** | JWT access token validated. Admin role verified. Report exists. Resolved/rejected reports cannot be changed. |
| **Processing Steps** | 1. Validate JWT and admin role. 2. Find report by ID. 3. If status = 'resolved', reject the target review (`is_approved = false`) and recalculate product stats. 4. Update `review_reports.status`. 5. Set `review_reports.resolved_by`, `resolved_at`, and optional `admin_note`. 6. Log action to `audit_logs` table (user_id, action, entityType: 'ReviewReport', entityId: reportId, oldValue, newValue, ipAddress, userAgent). 7. Create notification for report reporter (type: `report.resolved`). 8. Return updated report data in `{ data }` envelope. |
| **Success Response** | 200 OK with updated Report DTO |
| **Post-Action** | Display toast notification. Refresh reports list. |

---

## 7. Input / Output Specification

### 7.1 Input Specification — Review Moderation (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `action` | Moderation Action | 審査アクション | ENUM ('approve', 'reject') | Yes | Radio / Button | `@IsIn(['approve', 'reject'])` |
| `reason` | Rejection Reason | 却下理由 | TEXT | Conditional | Textarea | `@IsNotEmpty()` when action = 'reject' |

### 7.2 Input Specification — Merchant Approval (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `status` | Approval Status | 承認ステータス | ENUM ('approved', 'rejected') | Yes | Radio / Button | `@IsIn(['approved', 'rejected'])` |
| `reason` | Rejection Reason | 却下理由 | TEXT | Conditional | Textarea | `@IsNotEmpty()` when status = 'rejected' |

### 7.3 Input Specification — User Moderation (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `isActive` | Active Status | 有効ステータス | BOOLEAN | Yes | Toggle | `@IsBoolean()` |

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
| `user.name` | `users.name` | String |
| `user.avatarUrl` | `users.avatar_url` | URL or null |
| `product.name` | `products.name` | String |
| `product.images[0]` | `products.images` | URL (first image) |
| `rating` | `reviews.rating` | Star icons (1-5) |
| `title` | `reviews.title` | String or null |
| `isApproved` | `reviews.is_approved` | Status badge (Approved/Rejected) |
| `isVerifiedPurchase` | `reviews.is_verified_purchase` | Badge (Verified) |
| `createdAt` | `reviews.created_at` | ISO 8601 timestamp |

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
| `action` | Required, must be 'approve' or 'reject' | "Action must be 'approve' or 'reject'" | "アクションは'approve'または'reject'である必要があります" |
| `reason` | Required when action = 'reject' | "Rejection reason is required" | "却下理由は必須です" |

### 8.2 Merchant Approval Validation (Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `status` | Required, must be 'approved' or 'rejected' | "Status must be 'approved' or 'rejected'" | "ステータスは'approved'または'rejected'である必要があります" |
| `reason` | Required when status = 'rejected' | "Rejection reason is required" | "却下理由は必須です" |

### 8.3 User Moderation Validation (Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `isActive` | Required, boolean | "Active status must be a boolean" | "有効ステータスはブール値である必要があります" |

### 8.4 Report Validation (Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `reason` | Required, valid ENUM value | "Reason must be one of: spam, inappropriate, fake, other" | "理由は次のいずれかである必要があります: spam, inappropriate, fake, other" |
| `detail` | Optional, max 1000 chars | "Detail must not exceed 1000 characters" | "詳細は1000文字以下である必要があります" |
| `reviewId` | Required, valid UUID | "Review ID must be a valid UUID" | "レビューIDは有効なUUIDである必要があります" |

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

| Endpoint | Access Level | Description |
|----------|-------------|-------------|
| `GET /admin/reviews` | Protected (admin) | View all reviews with optional approved/rejected filter |
| `POST /admin/reviews/:id/moderate` | Protected (admin) | Approve/reject review |
| `DELETE /admin/reviews/:id` | Protected (admin) | Delete review |
| `GET /admin/users` | Protected (admin) | View all users |
| `PATCH /admin/users/:id/status` | Protected (admin) | Activate/deactivate user |
| `GET /admin/merchants` | Protected (admin) | View all merchants with license_status filter |
| `PATCH /admin/merchants/:id/status` | Protected (admin) | Approve/reject merchant (updates license_status + shops.is_approved) |
| `GET /admin/products` | Protected (admin) | View all products |
| `PATCH /admin/products/:id/status` | Protected (admin) | Product moderation — deactivate/reactivate (UPDATE is_active) |
| `GET /admin/reports` | Protected (admin) | View all review reports with status filter |
| `PATCH /admin/reports/:id/status` | Protected (admin) | Report status update (reviewed/resolved/rejected) |
| `DELETE /admin/reports/:id` | Protected (admin) | Delete report (pending/rejected only) |

### 10.3 Role-Based Access

| Role | Can View Reviews | Can Moderate Reviews | Can Manage Merchants | Can Manage Users | Can Manage Reports | Can Moderate Products |
|------|:----------------:|:--------------------:|:--------------------:|:----------------:|:----------------:|:----------------:|
| `buyer` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `merchant` | Own products only | ✗ | ✗ | ✗ | ✗ | ✗ |
| `admin` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

### 10.4 Security Audit Logging

Per DB spec Section 3.28, audit logs use the `audit_logs` table with structured JSONB fields:

| Event | Data Logged | Retention |
|-------|-------------|-----------|
| `REVIEW_APPROVED` | userId (admin), entityType: 'Review', entityId: reviewId, oldValue: `{ isApproved: false }`, newValue: `{ isApproved: true }`, ipAddress, userAgent | 2 years |
| `REVIEW_REJECTED` | userId (admin), entityType: 'Review', entityId: reviewId, oldValue: `{ isApproved: true }`, newValue: `{ isApproved: false, reason }`, ipAddress, userAgent | 2 years |
| `REVIEW_DELETED` | userId (admin), entityType: 'Review', entityId: reviewId, oldValue: `{ ...reviewData }`, newValue: null, ipAddress, userAgent | 2 years |
| `MERCHANT_APPROVED` | userId (admin), entityType: 'Merchant', entityId: merchantId, oldValue: `{ licenseStatus: 'pending' }`, newValue: `{ licenseStatus: 'approved' }`, ipAddress, userAgent | 2 years |
| `MERCHANT_REJECTED` | userId (admin), entityType: 'Merchant', entityId: merchantId, oldValue: `{ licenseStatus: 'pending' }`, newValue: `{ licenseStatus: 'rejected', rejectionReason }`, ipAddress, userAgent | 2 years |
| `USER_DEACTIVATED` | userId (admin), entityType: 'User', entityId: targetUserId, oldValue: `{ isActive: true }`, newValue: `{ isActive: false }`, ipAddress, userAgent | 2 years |
| `USER_ACTIVATED` | userId (admin), entityType: 'User', entityId: targetUserId, oldValue: `{ isActive: false }`, newValue: `{ isActive: true }`, ipAddress, userAgent | 2 years |
| `PRODUCT_DEACTIVATED` | userId (admin), entityType: 'Product', entityId: productId, oldValue: `{ isActive: true }`, newValue: `{ isActive: false }`, ipAddress, userAgent | 2 years |
| `PRODUCT_REACTIVATED` | userId (admin), entityType: 'Product', entityId: productId, oldValue: `{ isActive: false }`, newValue: `{ isActive: true }`, ipAddress, userAgent | 2 years |
| `REPORT_RESOLVED` | userId (admin), entityType: 'ReviewReport', entityId: reportId, oldValue: `{ status: 'pending' }`, newValue: `{ status: 'resolved' }`, ipAddress, userAgent | 2 years |
| `REPORT_REJECTED` | userId (admin), entityType: 'ReviewReport', entityId: reportId, oldValue: `{ status: 'pending' }`, newValue: `{ status: 'rejected' }`, ipAddress, userAgent | 2 years |
| `REPORT_DELETED` | userId (admin), entityType: 'ReviewReport', entityId: reportId, oldValue: `{ ...reportData }`, newValue: null, ipAddress, userAgent | 2 years |
| `RBAC_VIOLATION` | userId, entityType: 'Auth', entityId: null, action: 'rbac.violation', ipAddress, userAgent | 30 days |

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

After moderation action, relevant parties are notified via the `notifications` table (DB spec Section 3.29):

| Event | Trigger | Recipients | Notification Type | Notification Fields |
|-------|---------|------------|-------------------|---------------------|
| `REVIEW_STATUS_CHANGED` | Admin approves/rejects review | Review author, Product merchant | `review.status_changed` | title, message, entityType: 'Review', entityId: reviewId |
| `MERCHANT_STATUS_CHANGED` | Admin approves/rejects merchant | Merchant user | `merchant.approved` or `merchant.rejected` | title, message, entityType: 'Merchant', entityId: merchantId |
| `CONTENT_REMOVED` | Admin deactivates product | Product merchant | `product.deactivated` | title, message, entityType: 'Product', entityId: productId |
| `REPORT_RESOLVED` | Admin resolves report | Report reporter | `report.resolved` | title, message, entityType: 'ReviewReport', entityId: reportId |

**Notification Table Fields (per DB spec):**
- `id`: UUID primary key
- `user_id`: Recipient user ID (FK to users)
- `type`: Notification type string (e.g., `merchant.approved`)
- `title`: Notification title (VARCHAR 255)
- `message`: Notification body text (TEXT)
- `entity_type`: Related entity type (e.g., 'Merchant', 'Review')
- `entity_id`: Related entity UUID
- `is_read`: Boolean (default false)
- `read_at`: Timestamp when read (nullable)
| `USER_STATUS_CHANGED` | Admin activates/deactivates user | Affected user | Session termination on deactivation |

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
| `reviews` | View reviews (SELECT), Moderate reviews (UPDATE is_approved), Delete reviews (DELETE) |
| `products` | View products (SELECT), Recalculate avg_rating, Product moderation (UPDATE is_active) |
| `merchants` | View merchants (SELECT), Approve/reject merchants (UPDATE license_status, rejection_reason, reviewed_at, reviewed_by) |
| `shops` | View merchants (SELECT), Synchronize shop approval (UPDATE is_approved) |
| `users` | View users (SELECT), Activate/deactivate users (UPDATE is_active) |
| `review_reports` | View reports (SELECT), Report status update (UPDATE status, resolved_by, resolved_at, admin_note), Report deletion (DELETE) |
| `audit_logs` | Audit log recording (INSERT) — fields: user_id, action, entity_type, entity_id, old_value (JSONB), new_value (JSONB), ip_address, user_agent |
| `notifications` | Website notification creation (INSERT) — fields: user_id, type, title, message, entity_type, entity_id |

### 15.3 API Endpoint Traceability

| API Endpoint | Functional Operation | Requirement |
|--------------|---------------------|-------------|
| `GET /admin/reviews` | View all reviews | A-REV-001 |
| `POST /admin/reviews/:id/moderate` | Approve/reject review | A-REV-002 |
| `DELETE /admin/reviews/:id` | Delete review | A-REV-003 |
| `GET /admin/merchants` | View merchants | A-CONT-002 |
| `PATCH /admin/merchants/:id/status` | Approve/reject merchant | A-CONT-002 |
| `GET /admin/users` | View users | A-CONT-002 |
| `PATCH /admin/users/:id/status` | Activate/deactivate user | A-CONT-002 |
| `GET /admin/products` | View products | A-CONT-004 |
| `PATCH /admin/products/:id/status` | Product moderation | A-CONT-004 |
| `GET /admin/reports` | View reports | A-REPORT-001 |
| `PATCH /admin/reports/:id/status` | Report status update (reviewed/resolved/rejected) | A-REPORT-002 |
| `DELETE /admin/reports/:id` | Delete report | A-REPORT-002 |

### 15.4 Related Document References

| Document ID | Document Name | File Path |
|-------------|---------------|-----------|
| SKM-REQ-001 | Requirements Definition (v2.10) | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` |
| SKM-DBS-001 | Database Design Specification (v2.4) | `docs/core-work/データベース設計書_DATABASE_SPEC.md` |
| SKM-DEV-001 | Development Rules (v2.1) | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` |

---

*End of Functional Specification (Review & Content Moderation)*
