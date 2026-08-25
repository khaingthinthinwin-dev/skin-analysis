# Functional Specification (機能設計書) — Admin Ad Management Screen

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-FDS-ADM-001 |
| **Target Screen** | Admin Ad Management (管理者広告管理) — Ad Review, Approval, Fee Management, Analytics & Reporting |
| **Subsystem** | Advertisement Management — Admin Ad Approval, Bulk Operations, Package/Fee Management, Revenue Analytics, Export Reports |
| **Function ID** | FN-ADM-001 |
| **Version** | 1.1 |
| **Created** | 2026-08-24 |
| **Last Updated** | 2026-08-25 |
| **Author** | Software Architect |
| **Status** | Released (承認済み) |
| **Classification** | Internal — Engineering Division |

---

## Document Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-08-24 | Software Architect | Initial functional specification for Admin Ad Management Screen: ad review/approval (single & bulk), fee management, revenue analytics, and export reports. |
| 1.1 | 2026-08-25 | Software Architect | Removed SKM-FDS-AUTH-001 from related documents (out of scope). Added missing Create and Deactivate operations for fee settings to support full CRUD. Restricted export feature strictly to CSV format (removed Excel and PDF). |

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

This screen subsystem provides platform administrators with full control over the advertisement lifecycle within the Cosmetics Finder platform. It covers the complete admin-side responsibilities: reviewing and approving/rejecting shop-submitted advertisements (individually or in bulk), managing advertisement package pricing and fee configurations, tracking fee change history, analyzing platform-wide ad revenue breakdowns by placement and tier, and exporting ad performance and fee history reports.

The advertisement system is a core monetization channel. Shops pay daily fees based on placement location and pricing tier. All advertisements require admin approval before display. This document defines every screen, operation, business rule, and API endpoint that the Admin interacts with to manage this subsystem.

### 1.2 Functional Responsibilities

1. **Ad Review & Approval** — Reviewing pending shop advertisements, approving or rejecting individually with reason, tracking approval metadata (approved_by, approved_at).
2. **Bulk Approval / Rejection** — Selecting multiple pending ads via checkboxes and approving or rejecting them in a single batch action, with a common rejection reason for bulk rejects and automated batch refunds.
3. **Ad Display Management** — Ensuring only approved, active, non-expired ads are displayed. Priority-based rotation (Premium > Standard > Basic), round-robin within tier, max 5 per slider, auto-rotation every 5 seconds.
4. **Package & Fee Management** — Creating, editing, activating/deactivating fee settings per placement and tier. All changes logged to fee history with timestamps, before/after values, and reasons.
5. **Fee History Tracking** — Recording all pricing changes with full audit trail.
6. **Revenue Breakdown Analytics** — Providing financial charts, graphs, and summary metrics breaking down generated ad revenue by placement location and pricing tier over custom date ranges.
7. **Export Reports** — Exporting Ad Performance reports, Shop ad submission history, and Fee History logs in CSV format.
8. **Audit Logging** — Recording all significant admin actions (approve, reject, bulk approve, bulk reject, fee create, fee update, fee deactivate) to the audit trail.

### 1.3 Target Users

| Attribute | Value |
|-----------|-------|
| **Primary Actor** | Platform Administrator |
| **Required Authentication** | JWT Bearer Token (`admin` role) |
| **Data Scope** | All platform advertisements, all fee settings, all ad payments, platform-wide revenue data. |

### 1.4 Relationships with Other Functions and Peripheral Systems

```text
┌──────────────────────────┐      ┌─────────────────────────────────────┐
│   Admin Actor            │      │     advertisements / ad_payments    │
│ (Reviews, Approves,     ├─────►│  Reads ad records, updates status   │
│  Manages Fees, Exports)  │      │  Processes refunds on rejection     │
└──────────────────────────┘      └──────────────┬────────────────────┘
                                                 │
                                      ┌──────────┴─────────────┐
                                      │                        │
                                      ▼                        ▼
                          ┌──────────────────┐    ┌────────────────────────┐
                          │ ad_fee_settings  │    │  Revenue Analytics     │
                          │ ad_fee_history   │    │  (aggregated metrics)  │
                          └──────────────────┘    └────────────────────────┘
                                                          │
                                                          ▼
                                               ┌────────────────────────┐
                                               │  Export Engine         │
                                               │  (CSV)                 │
                                               └────────────────────────┘
```

### 1.5 Inputs / Outputs

| Input Information | Data Category | Source / Description |
|-------------------|---------------|----------------------|
| `ad_ids` | Admin Selection | Array of ad UUIDs for bulk operations |
| `approval_status` | Admin Decision | Single or bulk approve/reject |
| `rejection_reason` | Admin Input | Reason for rejection (single or bulk) |
| `daily_rate` | Admin Input | Configurable daily rate per placement/tier |
| `duration_days` | Admin Input | Ad duration in days per placement |
| `max_ads` | Admin Input | Maximum ads allowed per placement |
| `effective_from` | Admin Input | Date when fee change takes effect |
| `change_reason` | Admin Input | Reason for fee change |
| `date_from` | Admin Input | Analytics/export start date |
| `date_to` | Admin Input | Analytics/export end date |
| `placement_filter` | Admin Input | Filter analytics by placement |
| `tier_filter` | Admin Input | Filter analytics by tier |
| `export_format` | Admin Input | Export format: csv |

| Output Information | Data Category | Destination / Description |
|--------------------|---------------|---------------------------|
| `advertisement` | Ad DTO | Individual ad record with status, content, schedule |
| `bulk_result` | Bulk DTO | Summary of bulk operation (approved count, rejected count, refund summary) |
| `fee_settings` | Fee DTO | Current fee configuration per placement/tier |
| `fee_history` | History List | Pricing change history with timestamps |
| `revenue_analytics` | Analytics DTO | Revenue breakdown by placement, tier, date range |
| `export_file` | File | Generated CSV report |

### 1.6 Related Documents

| No. | Document ID | Document Name | File Path / Reference | Remarks |
|-----|-------------|---------------|----------------------|---------|
| 1 | SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | Business workflow logic, ad display rules, monetization rules. |
| 2 | SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | Table structures (`advertisements`, `ad_payments`, `ad_fee_settings`, `ad_fee_history`), constraints. |
| 3 | SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | Security rules, naming conventions, API standards. |

---

## 2. Use Cases and Business Workflow

### 2.1 Use Case Catalog

| UC-ID | Use Case Name | Precondition | Postcondition | Triggering Actor |
|-------|---------------|--------------|---------------|------------------|
| UC-ADM-001 | Review Pending Advertisements | Admin is authenticated. | List of pending ads displayed for review with filters. | Admin |
| UC-ADM-002 | Approve Single Advertisement | Admin selected a pending ad. | Ad `approval_status` set to `'approved'`, `approved_by` and `approved_at` recorded. Shop owner notified. | Admin |
| UC-ADM-003 | Reject Single Advertisement | Admin selected a pending ad with reason. | Ad `approval_status` set to `'rejected'`, `rejection_reason` recorded. Refund initiated. Shop owner notified. | Admin |
| UC-ADM-004 | Bulk Approve Advertisements | Admin selected multiple pending ads via checkboxes. | All selected ads approved in batch. Each `approved_by` and `approved_at` recorded. Shop owners notified individually. | Admin |
| UC-ADM-005 | Bulk Reject Advertisements | Admin selected multiple pending ads with common reason. | All selected ads rejected in batch. Common `rejection_reason` applied. Batch refunds initiated. Shop owners notified individually. | Admin |
| UC-ADM-006 | View Ad Detail | Admin selected a specific ad. | Full ad details, status, payment info, shop info, and analytics displayed. | Admin |
| UC-ADM-007 | Manage Ad Fee Settings | Admin is authenticated. | Admin can view, create, edit, activate/deactivate fee settings per placement and tier. | Admin |
| UC-ADM-008 | View Fee Change History | Admin wants to see pricing history. | Historical fee changes displayed with timestamps, reasons, and before/after values. | Admin |
| UC-ADM-009 | View Revenue Breakdown Analytics | Admin wants financial performance data. | Revenue charts and summary metrics broken down by placement and tier over custom date range. | Admin |
| UC-ADM-010 | Export Ad Performance Report | Admin wants to export ad performance data. | CSV file generated with ad metrics (impressions, clicks, CTR, revenue) per ad. | Admin |
| UC-ADM-011 | Export Shop Submission History | Admin wants shop ad submission records. | CSV file generated with all ad submissions, statuses, and outcomes per shop. | Admin |
| UC-ADM-012 | Export Fee History Log | Admin wants fee change audit trail. | CSV file generated with all fee setting changes, timestamps, and reasons. | Admin |
| UC-ADM-013 | Create Fee Setting | Admin wants to add a new fee configuration for a placement and tier. | New fee setting created with status active. `ad_fee_history` record created with `old_daily_rate=null`. | Admin |
| UC-ADM-014 | Deactivate Fee Setting | Admin wants to deactivate an existing active fee setting. | Fee setting status set to inactive. Existing ads using this setting are unaffected. | Admin |

### 2.2 Primary Business Workflow — Admin Ad Review (Single & Bulk)

```
┌──────────────────────────────┐
│  Admin Dashboard             │
│  (Advertisement Management)  │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  View Pending Advertisements │
│  (List with Filters +        │
│   Checkbox Selection)        │
└──────────┬───────────────────┘
           │
     ┌─────┴──────────────────┐
     │                        │
     ▼                        ▼
┌──────────────┐    ┌──────────────────────┐
│ Single Review│    │ Bulk Selection       │
│ (Click Review│    │ (Check multiple ads) │
│  on one ad)  │    └──────────┬───────────┘
└──────┬───────┘               │
       │                 ┌─────┴─────┐
       ▼                 ▼           ▼
┌──────────────┐  ┌──────────┐ ┌──────────────┐
│ Review Modal │  │ BULK     │ │ BULK         │
│ - Content    │  │ APPROVE  │ │ REJECT       │
│ - Shop Info  │  └────┬─────┘ └──────┬───────┘
│ - Payment    │       │              │
└──────┬───────┘       │              │
  ┌────┴────┐          │              │
  ▼         ▼          ▼              ▼
┌────────┐┌────────┐┌──────────┐┌──────────────┐
│APPROVE ││REJECT  ││Batch     ││Batch         │
│        ││        ││Approve   ││Reject +      │
│        ││        ││All       ││Common Reason │
│        ││        ││Selected  ││+ Batch       │
│        ││        ││          ││Refund        │
└───┬────┘└───┬────┘└────┬─────┘└──────┬───────┘
    │         │          │              │
    ▼         ▼          ▼              ▼
┌──────────────────────────────────────────────┐
│  Each Ad: Set approved_by, approved_at       │
│  Each Ad: Send Shop Owner Notification       │
│  Each Ad: Log to audit_logs                  │
│  Batch Reject: Process Batch Refunds         │
└──────────────────────────────────────────────┘
```

### 2.3 Primary Business Workflow — Revenue Analytics & Export

```
┌──────────────────────────────┐
│  Admin Dashboard             │
│  (Advertisement Management)  │
└──────────┬───────────────────┘
           │
     ┌─────┴──────────────┐
     ▼                    ▼
┌──────────────┐   ┌──────────────┐
│ Revenue      │   │ Export       │
│ Analytics    │   │ Reports      │
│ Tab          │   │ Tab          │
└──────┬───────┘   └──────┬───────┘
       │                  │
       ▼                  ▼
┌──────────────┐   ┌──────────────────┐
│ Date Range   │   │ Report Type      │
│ + Filter     │   │ Selection        │
│ (Placement,  │   │ - Ad Performance │
│  Tier)       │   │ - Submission     │
└──────┬───────┘   │   History        │
       │           │ - Fee History    │
       ▼           └────────┬─────────┘
┌──────────────┐            │
│ Charts &     │            ▼
│ Metrics:     │   ┌──────────────────┐
│ - Revenue by │   │ Format Selection │
│   Placement  │   │ CSV              │
│ - Revenue by │   └────────┬─────────┘
│   Tier       │            │
│ - Total Rev  │            ▼
│ - Ad Count   │   ┌──────────────────┐
│ - Avg CTR    │   │ Generate &       │
└──────────────┘   │ Download File    │
                   └──────────────────┘
```

### 2.4 Workflow Critical Path Summary

| Step | Action | Status Before | Status After | Assigned To |
|:----:|--------|---------------|--------------|-------------|
| 1 | Admin navigates to Advertisement Management | — | — | Admin |
| 2 | Admin views pending ad list with filters | — | — | Admin |
| 3a | **Single path:** Admin clicks "Review" on one ad | approval_status='pending' | — | Admin |
| 3b | **Bulk path:** Admin checks multiple ads | — | — | Admin |
| 4a | **Single:** Admin reviews in modal, approves or rejects | approval_status='pending' | 'approved' or 'rejected' | Admin |
| 4b | **Bulk Approve:** Admin clicks "Bulk Approve" | — | All selected → 'approved' | Admin |
| 4c | **Bulk Reject:** Admin enters common reason, clicks "Bulk Reject" | — | All selected → 'rejected' | Admin |
| 5 | System processes each ad: sets metadata, sends notifications | — | — | System |
| 6 | **On rejection:** System processes refunds (single or batch) | — | Refund processed | System |
| 7 | System logs all actions to audit_logs | — | — | System |
| 8 | Admin navigates to Revenue Analytics | — | — | Admin |
| 9 | Admin sets date range and filters, views charts | — | — | Admin |
| 10 | Admin navigates to Export Reports | — | — | Admin |
| 11 | Admin selects report type and format, downloads file | — | — | Admin |

### 2.5 Relevant Requirements Covered

| Requirement ID | Requirement Summary |
|----------------|---------------------|
| B-ADM-003 | Ads require admin approval before display |
| B-ADM-006 | Refund issued on ad rejection |
| B-ADM-007 | Admin can manage packages and set pricing per placement/tier |
| B-ADM-008 | Admin can approve/reject ads with reason |
| B-ADM-009 | Ad display rules: Premium > Standard > Basic priority, round-robin within tier |
| B-ADM-010 | Slider max 5 ads, auto-rotation every 5 seconds |
| B-ADM-011 | Expired/inactive ads excluded from display |
| B-ADM-012 | Ad fees are admin-configurable per placement and tier |
| B-ADM-013 | Admin can perform bulk approval/rejection of ads |
| B-ADM-014 | Platform revenue analytics by placement and tier |
| B-ADM-015 | Export ad performance, submission history, and fee history reports |

---

## 3. State Transition Specification

### 3.1 Advertisement Approval States

| State | Description | Is Displayed | Admin Can Act |
|-------|-------------|:------------:|:-------------:|
| `pending` | Submitted by shop, awaiting admin review | No | Approve, Reject, Bulk Approve, Bulk Reject |
| `approved` | Admin approved, displayed on platform | Yes | View only |
| `rejected` | Admin rejected with reason, refund processed | No | View only |

### 3.2 Advertisement Payment States

| State | Description | Ad Active | Refundable |
|-------|-------------|:---------:|:----------:|
| `pending` | Payment initiated, not yet confirmed | No | No |
| `completed` | Payment successful | Yes (if approved) | On rejection |
| `refunded` | Refund processed after rejection | No | — |

### 3.3 Ad Lifecycle Transitions (Admin-Triggered)

| Transition ID | Origin State | Target State | Trigger Action | Guard Conditions |
|---------------|--------------|--------------|----------------|------------------|
| TR-ADM-01 | `pending` | `approved` | Admin approves (single) | Admin authenticated, ad in pending state |
| TR-ADM-02 | `pending` | `rejected` | Admin rejects (single) | Admin authenticated, rejection reason provided |
| TR-ADM-03 | `pending` | `approved` | Admin bulk approves | Admin authenticated, all selected ads in pending state |
| TR-ADM-04 | `pending` | `rejected` | Admin bulk rejects | Admin authenticated, common rejection reason provided, all selected in pending state |
| TR-ADM-05 | Any | — | Ad expires | `expires_at` reached, ad removed from display |

### 3.4 Payment State Transitions (On Rejection)

| Transition ID | Origin State | Target State | Trigger Action | Guard Conditions |
|---------------|--------------|--------------|----------------|------------------|
| TR-PAY-01 | `completed` | `refunded` | Refund on single rejection | Payment was completed |
| TR-PAY-02 | `completed` | `refunded` | Batch refund on bulk rejection | Payment was completed for each ad |

### 3.5 Fee Settings Change Transitions

| Transition ID | Origin State | Target State | Trigger Action | Guard Conditions |
|---------------|--------------|--------------|----------------|------------------|
| TR-FEE-01 | — | Active setting | Admin creates fee setting | Valid placement, tier, daily_rate > 0 |
| TR-FEE-02 | Active setting | Updated setting | Admin updates fee | Change logged to ad_fee_history |
| TR-FEE-03 | Active setting | Deactivated | Admin deactivates | Existing ads unaffected |

---

## 4. Business Rules

### 4.1 Ad Review & Approval Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-ADM-001 | Admin Approval Required | Only admins can approve or reject advertisements. | Backend (RBAC: admin role) |
| BR-ADM-002 | Rejection Reason Required | Admin must provide a reason when rejecting an ad (single or bulk). | Backend (DTO validation) |
| BR-ADM-003 | Approval Metadata | On each approval, record `approved_by` (admin user ID) and `approved_at` (timestamp). | Backend (service logic) |
| BR-ADM-004 | Refund on Rejection | When admin rejects an ad, a refund is initiated for the corresponding payment. | Backend (ad_payments refund) |
| BR-ADM-005 | Pending State Guard | Only ads with `approval_status='pending'` can be approved or rejected. | Backend (state check) |

### 4.2 Bulk Operation Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-ADM-010 | Bulk Selection Limit | Maximum 50 ads can be selected for a single bulk operation. | Frontend (checkbox cap) + Backend (validation) |
| BR-ADM-011 | Bulk Approve Atomicity | All selected ads are approved in a single database transaction. If any ad fails validation, the entire batch is rolled back. | Backend (transaction) |
| BR-ADM-012 | Bulk Reject Common Reason | A single rejection reason is applied to all ads in a bulk reject operation. | Backend (DTO) |
| BR-ADM-013 | Bulk Refund Processing | For bulk rejection, refunds are processed sequentially for each ad. Failed refunds are logged but do not block other refunds. | Backend (batch processing) |
| BR-ADM-014 | Bulk Notification | For bulk operations, each shop owner receives an individual notification per ad (not a single aggregated notification). | Backend (notification loop) |
| BR-ADM-015 | Bulk Audit Logging | Each ad in a bulk operation generates its own audit log entry for traceability. | Backend (audit loop) |
| BR-ADM-016 | Mixed State Rejection | If any selected ad is not in `pending` state, the bulk operation fails with a descriptive error identifying the non-pending ads. | Backend (pre-flight check) |

### 4.3 Ad Display Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-ADM-020 | Approval Gate | Only ads with `approval_status='approved'` and `is_active=true` are displayed. | Backend (query filter) |
| BR-ADM-021 | Expiry Check | Ads past `expires_at` are excluded from display. | Backend (query filter) |
| BR-ADM-022 | Priority Order | Ads are prioritized: Premium > Standard > Basic. | Backend (ORDER BY tier priority) |
| BR-ADM-023 | Round-Robin Within Tier | Ads within the same priority level rotate using round-robin. | Backend (rotation algorithm) |
| BR-ADM-024 | Slider Limit | Maximum 5 advertisements displayed per slider rotation. | Frontend (display cap) |
| BR-ADM-025 | Auto Rotation | Slider automatically rotates every 5 seconds. | Frontend (timer) |

### 4.4 Fee Management Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-ADM-030 | Fee Change Logging | All fee changes are logged to `ad_fee_history` with old/new values, changed_by, and change_reason. | Backend (service logic) |
| BR-ADM-031 | Effective Date | Fee changes apply only to ads created after the effective_from date. Existing ads are unaffected. | Backend (fee lookup at purchase time) |
| BR-ADM-032 | Unique Placement-Tier | Only one active fee setting per placement+tier combination. | Backend (DB unique constraint) |
| BR-ADM-033 | Daily Rate Validation | Daily rate must be > 0. | Backend (DTO validation + DB check constraint) |
| BR-ADM-034 | Duration Validation | Duration days must be > 0. | Backend (DTO validation + DB check constraint) |
| BR-ADM-035 | Max Ads Validation | Max ads must be > 0. | Backend (DTO validation + DB check constraint) |
| BR-ADM-036 | Create Fee Audit | On fee setting creation, log FEE_CREATED event to audit_logs with placement, tier, and initial values. | Backend (service logic) |
| BR-ADM-037 | Deactivate Fee Guard | Deactivation is only permitted on fee settings with `is_active=true`. | Backend (state check) |
| BR-ADM-038 | Deactivate Fee Logging | On fee setting deactivation, log FEE_DEACTIVATED event to audit_logs. | Backend (service logic) |
| BR-ADM-039 | Deactivate Fee History | Deactivation is logged to `ad_fee_history` with the final values before deactivation. | Backend (service logic) |

### 4.5 Revenue Analytics Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-ADM-040 | Date Range Required | Revenue analytics queries must specify a date_from and date_to range. | Backend (DTO validation) |
| BR-ADM-041 | Maximum Range | Maximum analytics date range is 365 days. | Backend (validation) |
| BR-ADM-042 | Revenue Source | Revenue is aggregated from `ad_payments` where `payment_status='completed'` and `advertisements.approval_status='approved'`. | Backend (query logic) |
| BR-ADM-043 | Placement Breakdown | Revenue can be broken down by placement (homepage_banner, product_sidebar, category_banner, search_top). | Backend (GROUP BY placement) |
| BR-ADM-044 | Tier Breakdown | Revenue can be broken down by tier (basic, standard, premium). | Backend (GROUP BY tier) |

### 4.6 Export Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-ADM-050 | Format Validation | Export format must be csv. | Backend (DTO validation) |
| BR-ADM-051 | Date Range for Export | Exports require a date range. Maximum 365 days. | Backend (DTO validation) |
| BR-ADM-052 | Async Generation | Large exports (>1000 rows) are generated asynchronously. Admin receives a download link via notification when ready. | Backend (job queue) |
| BR-ADM-053 | Export Retention | Generated export files are retained for 24 hours, then deleted. | Backend (cleanup job) |
| BR-ADM-054 | Export Audit | All export actions are logged to audit_logs with report type, format, and date range. | Backend (audit service) |

### 4.7 Security Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-ADM-060 | RBAC Enforcement | All admin ad management endpoints require `admin` role via JwtAuthGuard + RolesGuard. | Backend (NestJS guards) |
| BR-ADM-061 | Audit Trail Integrity | Audit logs are append-only. No UPDATE or DELETE operations permitted. | Backend (DB constraint + service) |
| BR-ADM-062 | Fee Change Accountability | Every fee change must include `changed_by` (admin ID) and `change_reason`. | Backend (DTO validation) |
| BR-ADM-063 | Export Data Sanitization | Exported data must not include sensitive fields (password hashes, tokens, internal IDs not relevant to the report). | Backend (export service) |

---

## 5. Screen Specifications

### 5.1 Screen: Admin Advertisement List (`/admin/advertisements`)

**Purpose:** Display all advertisements with filtering, searching, and bulk selection capabilities.

#### 5.1.1 UI Elements

**Page Header:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-01 | Page Title | Heading (h1) | `ads.title` | No | "Advertisement Management" |
| EL-02 | Pending Count Badge | Badge | `ads.pendingCount` | No | Shows number of pending ads |
| EL-03 | Manage Packages Button | Button (secondary) | `ads.managePackages` | No | Navigate to fee settings page |
| EL-04 | Revenue Analytics Button | Button (secondary) | `ads.revenueAnalytics` | No | Navigate to analytics page |
| EL-05 | Export Button | Button (secondary) | `ads.export` | No | Navigate to export page |

**Ad List Table:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-10 | Select All Checkbox | Checkbox | — | No | Select/deselect all visible ads |
| EL-11 | Row Checkbox | Checkbox | — | No | Select individual ad for bulk operations |
| EL-12 | Shop Column | Table Column | `ads.shop` | Yes | Shop name |
| EL-13 | Title Column | Table Column | `ads.title` | Yes | Advertisement title |
| EL-14 | Placement Column | Table Column | `ads.placement` | Yes | Placement location |
| EL-15 | Tier Column | Table Column | `ads.tier` | Yes | Pricing tier (Basic/Standard/Premium) |
| EL-16 | Status Column | Table Column | `ads.status` | Yes | Approval status badge (pending=yellow, approved=green, rejected=red) |
| EL-17 | Payment Column | Table Column | `ads.payment` | Yes | Payment status badge |
| EL-18 | Submitted Column | Table Column | `ads.submittedAt` | Yes | Submission date |
| EL-19 | Fee Column | Table Column | `ads.fee` | Yes | Ad fee paid |
| EL-20 | Actions Column | Table Column | `ads.actions` | Yes | Review / View buttons |
| EL-21 | Empty State | Empty State | `ads.noAds` | No | "No advertisements found." |

**Filters:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-22 | Status Filter | Select | `ads.filterByStatus` | No | All, Pending, Approved, Rejected |
| EL-23 | Placement Filter | Select | `ads.filterByPlacement` | No | All, Homepage Slider, Product Sidebar, Category Banner, Search Top |
| EL-24 | Tier Filter | Select | `ads.filterByTier` | No | All, Basic, Standard, Premium |
| EL-25 | Shop Search | Input (search) | `ads.searchShop` | No | Search by shop name |
| EL-26 | Date Range Filter | Date Range Picker | `ads.filterByDate` | No | Filter by submission date range |

**Bulk Action Bar (appears when ads selected):**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-27 | Selected Count Text | Text | `ads.selectedCount` | Yes | "{n} ads selected" |
| EL-28 | Bulk Approve Button | Button (success) | `ads.bulkApprove` | Yes | Approve all selected ads |
| EL-29 | Bulk Reject Button | Button (danger) | `ads.bulkReject` | Yes | Open bulk reject modal |
| EL-30 | Clear Selection Button | Button (text) | `ads.clearSelection` | No | Deselect all |

### 5.2 Screen: Admin Ad Review Modal (Single)

**Purpose:** Allow admins to review ad content and approve/reject a single advertisement.

#### 5.2.1 UI Elements

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-31 | Modal Title | Heading (h3) | `ads.reviewAd` | No | "Review Advertisement" |
| EL-32 | Shop Info | Text | `ads.shopInfo` | Yes | Shop name |
| EL-33 | Ad Title | Text | — | Yes | Advertisement title |
| EL-34 | Placement & Tier | Text | `ads.placementTier` | Yes | "Homepage Slider — Standard" |
| EL-35 | Image Preview | Image | — | Yes | Ad banner image |
| EL-36 | Announcement Message | Text | `ads.message` | Yes | Banner message |
| EL-37 | Link URL | Link | `ads.linkUrl` | No | Click-through URL |
| EL-38 | Content Description | Text | `ads.content` | No | Ad description |
| EL-39 | Schedule | Text | `ads.schedule` | Yes | Start and end dates |
| EL-40 | Fee Paid | Text | `ads.feePaid` | Yes | Amount paid |
| EL-41 | Payment Status | Badge | `ads.paymentStatus` | Yes | Payment status |
| EL-42 | Rejection Reason Input | Textarea | `ads.rejectionReason` | Conditional | Required when rejecting (max 1000 chars) |
| EL-43 | Approve Button | Button (success) | `ads.approve` | Yes | Approve the advertisement |
| EL-44 | Reject Button | Button (danger) | `ads.reject` | Yes | Reject with reason |
| EL-45 | Cancel Button | Button (secondary) | `ads.cancel` | No | Close modal |

### 5.3 Screen: Bulk Reject Confirmation Modal

**Purpose:** Allow admins to enter a common rejection reason before executing a bulk reject operation.

#### 5.3.1 UI Elements

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-50 | Modal Title | Heading (h3) | `ads.bulkRejectTitle` | No | "Bulk Reject Advertisements" |
| EL-51 | Selected Count | Text | `ads.bulkRejectCount` | Yes | "You are about to reject {n} advertisements." |
| EL-52 | Warning Message | Alert | `ads.bulkRejectWarning` | No | "Refunds will be automatically processed for all selected ads." |
| EL-53 | Rejection Reason Input | Textarea | `ads.rejectionReason` | Yes | Common rejection reason for all selected ads (max 1000 chars) |
| EL-54 | Confirm Reject Button | Button (danger) | `ads.confirmBulkReject` | Yes | Confirm and execute bulk rejection |
| EL-55 | Cancel Button | Button (secondary) | `ads.cancel` | No | Close modal |

### 5.4 Screen: Bulk Approve Confirmation Modal

**Purpose:** Confirm bulk approval before execution.

#### 5.4.1 UI Elements

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-60 | Modal Title | Heading (h3) | `ads.bulkApproveTitle` | No | "Bulk Approve Advertisements" |
| EL-61 | Selected Count | Text | `ads.bulkApproveCount` | Yes | "You are about to approve {n} advertisements." |
| EL-62 | Confirm Approve Button | Button (success) | `ads.confirmBulkApprove` | Yes | Confirm and execute bulk approval |
| EL-63 | Cancel Button | Button (secondary) | `ads.cancel` | No | Close modal |

### 5.5 Screen: Package & Fee Management (`/admin/advertisements/packages`)

**Purpose:** Allow admins to view, create, edit, activate/deactivate fee settings per placement and tier.

#### 5.5.1 UI Elements

**Page Header:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-70 | Page Title | Heading (h1) | `ads.packages` | No | "Package & Fee Management" |
| EL-71 | Back to Ads Button | Button (text) | `ads.backToAds` | No | Return to Advertisement Management |
| EL-72 | View History Button | Button (secondary) | `ads.viewFeeHistory` | No | Navigate to fee change history |
| EL-72a | Create Fee Setting Button | Button (primary) | `ads.createFeeSetting` | No | Open create fee setting modal |

**Fee Settings Table:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-73 | Placement Column | Table Column | `ads.placement` | Yes | Placement location |
| EL-74 | Tier Column | Table Column | `ads.tier` | Yes | Pricing tier |
| EL-75 | Daily Rate Column | Table Column | `ads.dailyRate` | Yes | Current daily rate ($) |
| EL-76 | Duration Column | Table Column | `ads.duration` | Yes | Duration in days |
| EL-77 | Max Ads Column | Table Column | `ads.maxAds` | Yes | Maximum ads allowed |
| EL-78 | Status Column | Table Column | `ads.status` | Yes | Active/Inactive badge |
| EL-79 | Actions Column | Table Column | `ads.actions` | Yes | Edit / Deactivate buttons |
| EL-80 | Edit Button | Button (secondary) | `ads.edit` | No | Open edit fee modal |
| EL-80a | Deactivate Button | Button (danger) | `ads.deactivate` | No | Deactivate active fee setting |

**Edit Fee Modal:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-81 | Daily Rate Input | Input (number) | `ads.dailyRate` | Yes | New daily rate |
| EL-82 | Duration Input | Input (number) | `ads.duration` | Yes | New duration in days |
| EL-83 | Max Ads Input | Input (number) | `ads.maxAds` | Yes | New max ads |
| EL-84 | Effective From | Date Picker | `ads.effectiveFrom` | Yes | When change takes effect |
| EL-85 | Change Reason | Textarea | `ads.changeReason` | Yes | Reason for fee change (max 1000 chars) |
| EL-86 | Save Button | Button (primary) | `ads.save` | Yes | Save fee changes |
| EL-87 | Cancel Button | Button (secondary) | `ads.cancel` | No | Close modal |

**Create Fee Modal:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-88 | Placement Select | Select | `ads.placement` | Yes | Select placement location |
| EL-89 | Tier Select | Select | `ads.tier` | Yes | Select pricing tier |
| EL-81a | Daily Rate Input | Input (number) | `ads.dailyRate` | Yes | Daily rate |
| EL-82a | Duration Input | Input (number) | `ads.duration` | Yes | Duration in days |
| EL-83a | Max Ads Input | Input (number) | `ads.maxAds` | Yes | Maximum ads allowed |
| EL-84a | Effective From | Date Picker | `ads.effectiveFrom` | Yes | When setting takes effect |
| EL-85a | Change Reason | Textarea | `ads.changeReason` | Yes | Reason for creating fee setting (max 1000 chars) |
| EL-86a | Create Button | Button (primary) | `ads.create` | Yes | Create fee setting |
| EL-87a | Cancel Button | Button (secondary) | `ads.cancel` | No | Close modal |

**Deactivate Fee Confirmation Modal:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-90a | Modal Title | Heading (h3) | `ads.deactivateFeeTitle` | No | "Deactivate Fee Setting" |
| EL-90b | Warning Message | Alert | `ads.deactivateFeeWarning` | No | "This fee setting will be deactivated. Existing ads using this fee will be unaffected." |
| EL-90c | Confirm Deactivate Button | Button (danger) | `ads.confirmDeactivate` | Yes | Confirm deactivation |
| EL-90d | Cancel Button | Button (secondary) | `ads.cancel` | No | Close modal |

### 5.6 Screen: Fee Change History (`/admin/advertisements/fee-history`)

**Purpose:** Display historical fee changes with timestamps, reasons, and before/after values.

#### 5.6.1 UI Elements

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-90 | Page Title | Heading (h1) | `ads.feeHistory` | No | "Fee Change History" |
| EL-91 | Back to Packages Button | Button (text) | `ads.backToPackages` | No | Return to Package Management |
| EL-92 | Placement Filter | Select | `ads.filterByPlacement` | No | Filter by placement |
| EL-93 | Tier Filter | Select | `ads.filterByTier` | No | Filter by tier |
| EL-94 | History Table | Data Table | — | Yes | Columns: Date, Placement, Tier, Old Rate, New Rate, Changed By, Reason |
| EL-95 | Export Button | Button (secondary) | `ads.exportFeeHistory` | No | Export fee history log |

### 5.7 Screen: Revenue Analytics (`/admin/advertisements/analytics`)

**Purpose:** Display financial charts and summary metrics for ad revenue breakdown by placement and tier.

#### 5.7.1 UI Elements

**Page Header:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-100 | Page Title | Heading (h1) | `ads.revenueAnalytics` | No | "Revenue Analytics" |
| EL-101 | Back to Ads Button | Button (text) | `ads.backToAds` | No | Return to Advertisement Management |

**Filter Controls:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-102 | Date Range Picker | Date Range Picker | `ads.dateRange` | Yes | Start and end date for analytics |
| EL-103 | Placement Filter | Multi-Select | `ads.filterByPlacement` | No | Filter by placement(s) |
| EL-104 | Tier Filter | Multi-Select | `ads.filterByTier` | No | Filter by tier(s) |

**Summary Metrics:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-105 | Total Revenue Card | Metric Card | `ads.totalRevenue` | Yes | Total revenue in date range |
| EL-106 | Total Ads Approved Card | Metric Card | `ads.totalAdsApproved` | Yes | Number of approved ads |
| EL-107 | Total Fees Collected Card | Metric Card | `ads.totalFeesCollected` | Yes | Total fees collected |
| EL-108 | Avg Revenue Per Ad Card | Metric Card | `ads.avgRevenuePerAd` | Yes | Average revenue per ad |
| EL-109 | Total Refunds Card | Metric Card | `ads.totalRefunds` | Yes | Total refund amount |

**Charts:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-110 | Revenue by Placement Chart | Bar Chart | `ads.revenueByPlacement` | Yes | Revenue breakdown by placement |
| EL-111 | Revenue by Tier Chart | Bar Chart | `ads.revenueByTier` | Yes | Revenue breakdown by tier |
| EL-112 | Revenue Trend Chart | Line Chart | `ads.revenueTrend` | Yes | Revenue over time (daily/weekly) |
| EL-113 | Ads by Placement Table | Data Table | `ads.adsByPlacement` | Yes | Table: placement, ad count, total revenue, avg CTR |
| EL-114 | Ads by Tier Table | Data Table | `ads.adsByTier` | Yes | Table: tier, ad count, total revenue, avg CTR |

### 5.8 Screen: Export Reports (`/admin/advertisements/export`)

**Purpose:** Allow admins to export Ad Performance reports, Shop ad submission history, and Fee History logs.

#### 5.8.1 UI Elements

**Page Header:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-120 | Page Title | Heading (h1) | `ads.exportReports` | No | "Export Reports" |
| EL-121 | Back to Ads Button | Button (text) | `ads.backToAds` | No | Return to Advertisement Management |

**Report Type Selection:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-122 | Report Type Cards | Card Group | `ads.reportType` | Yes | Three report type options |
| EL-123 | Ad Performance Card | Card (selectable) | `ads.adPerformanceReport` | Yes | "Ad Performance Report — Impressions, clicks, CTR, revenue per ad" |
| EL-124 | Submission History Card | Card (selectable) | `ads.submissionHistoryReport` | Yes | "Shop Submission History — All ad submissions, statuses, outcomes" |
| EL-125 | Fee History Card | Card (selectable) | `ads.feeHistoryReport` | Yes | "Fee History Log — All fee setting changes with timestamps and reasons" |

**Export Configuration:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-126 | Date Range Picker | Date Range Picker | `ads.dateRange` | Yes | Start and end date for export |
| EL-127 | Placement Filter | Multi-Select | `ads.filterByPlacement` | No | Filter by placement(s) |
| EL-128 | Tier Filter | Multi-Select | `ads.filterByTier` | No | Filter by tier(s) |
| EL-129 | Status Filter | Multi-Select | `ads.filterByStatus` | No | Filter by approval status (for ad performance & submission history) |
| EL-130 | Shop Filter | Input (search) | `ads.filterByShop` | No | Filter by shop name (for submission history) |
| EL-131 | Format Selection | Radio Group | `ads.exportFormat` | Yes | CSV |
| EL-132 | Export Button | Button (primary) | `ads.generateExport` | Yes | "Generate Report" |
| EL-133 | Estimated Rows Text | Text | `ads.estimatedRows` | No | "Estimated {n} rows" (shown after filters applied) |

**Recent Exports Table:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-134 | Recent Exports Heading | Heading (h3) | `ads.recentExports` | No | "Recent Exports" |
| EL-135 | Report Type Column | Table Column | `ads.reportType` | Yes | Type of report |
| EL-136 | Format Column | Table Column | `ads.format` | Yes | CSV |
| EL-137 | Date Range Column | Table Column | `ads.dateRange` | Yes | Date range of report |
| EL-138 | Status Column | Table Column | `ads.status` | Yes | Processing/Ready/Expired/Failed |
| EL-139 | Download Column | Table Column | `ads.download` | Yes | Download button (when ready) |
| EL-140 | Generated At Column | Table Column | `ads.generatedAt` | Yes | When report was generated |

---

## 6. Functional Operation Specification

### 6.1 Operation: List Advertisements

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Navigate to `/admin/advertisements` |
| **API Endpoint** | `GET /api/v1/admin/ads` |
| **Query Parameters** | `status` (optional), `placement` (optional), `tier` (optional), `shop` (optional search), `dateFrom` (optional), `dateTo` (optional), `page`, `limit` |
| **Processing Steps** | 1. Validate JWT token and admin role. 2. Query `advertisements` joined with `shops` and `ad_fee_settings`. 3. Apply filters (status, placement, tier, shop search, date range). 4. Paginate results. 5. Return paginated ad list with shop info, fee info, and payment status. |
| **Success Response** | 200 OK with paginated ad list |

### 6.2 Operation: Approve Single Advertisement

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Click "Approve" in ad review modal |
| **API Endpoint** | `POST /api/v1/admin/ads/:id/approve` |
| **Processing Steps** | 1. Validate JWT token and admin role. 2. Find ad by ID. 3. Verify ad `approval_status='pending'`. 4. Set `approval_status='approved'`. 5. Set `approved_by=currentAdmin.id`. 6. Set `approved_at=currentTimestamp`. 7. Send notification to shop owner: "Your advertisement '{title}' has been approved". 8. Log AD_APPROVED event to audit_logs (entity_type='Advertisement', entity_id=adId). 9. Return updated advertisement DTO. |
| **Success Response** | 200 OK with updated advertisement |

### 6.3 Operation: Reject Single Advertisement

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Click "Reject" in ad review modal (with rejection reason) |
| **API Endpoint** | `POST /api/v1/admin/ads/:id/reject` |
| **Request Body** | `{ rejection_reason: string }` |
| **Processing Steps** | 1. Validate JWT token and admin role. 2. Find ad by ID. 3. Verify ad `approval_status='pending'`. 4. Validate `rejection_reason` is provided and non-empty. 5. Set `approval_status='rejected'`. 6. Set `rejection_reason`. 7. Set `approved_by=currentAdmin.id`. 8. Set `approved_at=currentTimestamp`. 9. Find corresponding `ad_payments` record where `ad_id = id` and `payment_status='completed'`. 10. Update `ad_payments`: set `payment_status='refunded'`, `refund_amount=payment_amount`, `refund_reason=rejection_reason`, `refunded_at=currentTimestamp`. 11. Send notification to shop owner: "Your advertisement '{title}' has been rejected. Reason: {reason}". 12. Log AD_REJECTED event to audit_logs. 13. Return updated advertisement DTO. |
| **Success Response** | 200 OK with updated advertisement |

### 6.4 Operation: Bulk Approve Advertisements

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Click "Bulk Approve" with ads selected |
| **API Endpoint** | `POST /api/v1/admin/ads/bulk/approve` |
| **Request Body** | `{ ad_ids: string[] }` |
| **Processing Steps** | 1. Validate JWT token and admin role. 2. Validate `ad_ids` array is non-empty and ≤ 50. 3. Find all ads by IDs. 4. **Pre-flight check:** Verify ALL selected ads have `approval_status='pending'`. If any ad is not pending, return 400 with list of non-pending ad IDs. 5. Begin database transaction. 6. For each ad in batch: a. Set `approval_status='approved'`. b. Set `approved_by=currentAdmin.id`. c. Set `approved_at=currentTimestamp`. 7. Commit transaction. 8. For each ad: a. Send individual notification to shop owner: "Your advertisement '{title}' has been approved". b. Log AD_APPROVED event to audit_logs. 9. Return bulk result DTO: `{ approved: number, total: number, ad_ids: string[] }`. |
| **Success Response** | 200 OK with bulk result DTO |

### 6.5 Operation: Bulk Reject Advertisements

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Click "Bulk Reject" with ads selected and common reason |
| **API Endpoint** | `POST /api/v1/admin/ads/bulk/reject` |
| **Request Body** | `{ ad_ids: string[], rejection_reason: string }` |
| **Processing Steps** | 1. Validate JWT token and admin role. 2. Validate `ad_ids` array is non-empty and ≤ 50. 3. Validate `rejection_reason` is provided and non-empty. 4. Find all ads by IDs. 5. **Pre-flight check:** Verify ALL selected ads have `approval_status='pending'`. If any ad is not pending, return 400 with list of non-pending ad IDs. 6. Begin database transaction. 7. For each ad in batch: a. Set `approval_status='rejected'`. b. Set `rejection_reason=commonReason`. c. Set `approved_by=currentAdmin.id`. d. Set `approved_at=currentTimestamp`. 8. Commit transaction. 9. For each ad (outside transaction, sequential): a. Find corresponding `ad_payments` record where `ad_id = ad.id` and `payment_status='completed'`. b. Update `ad_payments`: set `payment_status='refunded'`, `refund_amount=payment_amount`, `refund_reason=rejection_reason`, `refunded_at=currentTimestamp`. c. If refund fails, log error and continue to next ad. 10. For each ad: a. Send individual notification to shop owner: "Your advertisement '{title}' has been rejected. Reason: {reason}". b. Log AD_REJECTED event to audit_logs. 11. Return bulk result DTO: `{ rejected: number, total: number, refundsProcessed: number, refundsFailed: number, ad_ids: string[] }`. |
| **Success Response** | 200 OK with bulk result DTO |

### 6.6 Operation: View Ad Detail

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Click "Review" or "View" on ad row |
| **API Endpoint** | `GET /api/v1/admin/ads/:id` |
| **Processing Steps** | 1. Validate JWT token and admin role. 2. Find ad by ID. 3. Join with `shops`, `ad_fee_settings`, `ad_payments`. 4. Return full ad DTO with shop info, fee info, payment info, and analytics. |
| **Success Response** | 200 OK with advertisement detail |

### 6.7 Operation: Manage Ad Fee Settings

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Navigate to `/admin/advertisements/packages` |
| **API Endpoints** | `GET /api/v1/admin/ad-fees` (list), `POST /api/v1/admin/ad-fees` (create), `PUT /api/v1/admin/ad-fees/:id` (update), `PATCH /api/v1/admin/ad-fees/:id/deactivate` (deactivate) |
| **Processing Steps (GET)** | 1. Validate admin role. 2. Query all `ad_fee_settings`. 3. Return fee settings list. |
| **Processing Steps (POST)** | 1. Validate admin role. 2. Validate daily_rate > 0, duration_days > 0, max_ads > 0. 3. Check uniqueness: no active setting exists for the given placement+tier. If conflict, return 409. 4. Create `ad_fee_settings` record with `is_active=true`. 5. Create `ad_fee_history` record: `ad_fee_setting_id=<new_id>`, `old_daily_rate=null`, `new_daily_rate=daily_rate`, `old_duration_days=null`, `new_duration_days=duration_days`, `old_max_ads=null`, `new_max_ads=max_ads`, `changed_by=currentAdmin.id`, `change_reason`, `effective_from`. 6. Log FEE_CREATED event to audit_logs. 7. Return created fee setting. |
| **Processing Steps (PUT)** | 1. Validate admin role. 2. Find fee setting by ID. 3. Validate daily_rate > 0, duration_days > 0, max_ads > 0. 4. Create `ad_fee_history` record: `ad_fee_setting_id`, `old_daily_rate`, `new_daily_rate`, `old_duration_days`, `new_duration_days`, `old_max_ads`, `new_max_ads`, `changed_by=currentAdmin.id`, `change_reason`, `effective_from`. 5. Update `ad_fee_settings` record with new values. 6. Log FEE_UPDATED event to audit_logs. 7. Return updated fee setting. |
| **Processing Steps (PATCH deactivate)** | 1. Validate admin role. 2. Find fee setting by ID. 3. Verify `is_active=true`. If already inactive, return 400. 4. Create `ad_fee_history` record: `ad_fee_setting_id`, `old_daily_rate=daily_rate`, `new_daily_rate=null`, `old_duration_days=duration_days`, `new_duration_days=null`, `old_max_ads=max_ads`, `new_max_ads=null`, `changed_by=currentAdmin.id`, `change_reason`, `effective_from=currentTimestamp`. 5. Update `ad_fee_settings`: set `is_active=false`. 6. Log FEE_DEACTIVATED event to audit_logs. 7. Return deactivated fee setting. |
| **Success Response** | 200 OK with fee setting (created, updated, or deactivated) |

### 6.8 Operation: View Fee Change History

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Click "View History" on fee settings page |
| **API Endpoint** | `GET /api/v1/admin/ad-fees/history` |
| **Query Parameters** | `placement` (optional), `tier` (optional), `page`, `limit` |
| **Processing Steps** | 1. Validate admin role. 2. Query `ad_fee_history` joined with `ad_fee_settings` (for placement/tier) and `users` (for changed_by name). 3. Apply filters. 4. Order by `created_at DESC`. 5. Paginate results. 6. Return history list. |
| **Success Response** | 200 OK with history array + meta |

### 6.9 Operation: View Revenue Breakdown Analytics

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Navigate to `/admin/advertisements/analytics` |
| **API Endpoint** | `GET /api/v1/admin/ads/analytics/revenue` |
| **Query Parameters** | `dateFrom` (required), `dateTo` (required), `placement` (optional), `tier` (optional) |
| **Processing Steps** | 1. Validate admin role. 2. Validate date range (dateFrom < dateTo, max 365 days). 3. Query `ad_payments` joined with `advertisements` and `ad_fee_settings` where `payment_status='completed'` and `advertisements.approval_status='approved'` and `paid_at` within date range. 4. Apply placement/tier filters if provided. 5. **Summary Metrics:** Calculate totalRevenue, totalAdsApproved, totalFeesCollected, avgRevenuePerAd, totalRefunds. 6. **By Placement:** GROUP BY placement, calculate revenue per placement. 7. **By Tier:** GROUP BY tier, calculate revenue per tier. 8. **Trend:** GROUP BY date (or week/month based on range), calculate daily revenue. 9. Return analytics DTO with all metrics and chart data. |
| **Success Response** | 200 OK with revenue analytics DTO |

### 6.10 Operation: Export Ad Performance Report

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Click "Generate Report" with Ad Performance selected |
| **API Endpoint** | `POST /api/v1/admin/ads/export/ad-performance` |
| **Request Body** | `{ dateFrom: string, dateTo: string, placement?: string[], tier?: string[], status?: string[], format: 'csv' }` |
| **Processing Steps** | 1. Validate admin role. 2. Validate inputs (date range, format). 3. Query ad performance data: for each ad in date range, gather title, shop, placement, tier, status, impressions, clicks, CTR, fee paid, revenue. 4. Apply filters. 5. If result set > 1000 rows: create export job, return job ID, generate asynchronously. 6. If ≤ 1000 rows: generate file synchronously. 7. Format file based on `format` parameter. 8. Store file in export storage with 24-hour TTL. 9. Log EXPORT_GENERATED event to audit_logs. 10. Return download URL or job ID. |
| **Success Response** | 200 OK with `{ downloadUrl: string }` or `{ jobId: string, status: 'processing' }` |

### 6.11 Operation: Export Shop Submission History

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Click "Generate Report" with Submission History selected |
| **API Endpoint** | `POST /api/v1/admin/ads/export/submission-history` |
| **Request Body** | `{ dateFrom: string, dateTo: string, shop?: string, format: 'csv' }` |
| **Processing Steps** | 1. Validate admin role. 2. Validate inputs. 3. Query all ad submissions in date range: for each ad, gather shop name, title, placement, tier, submitted date, approval status, rejection reason (if rejected), approved/rejected by, approved/rejected at, fee paid, refund amount (if refunded). 4. Apply shop filter if provided. 5. Generate file. 6. Log EXPORT_GENERATED event. 7. Return download URL or job ID. |
| **Success Response** | 200 OK with `{ downloadUrl: string }` or `{ jobId: string, status: 'processing' }` |

### 6.12 Operation: Export Fee History Log

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Click "Generate Report" with Fee History selected, or "Export" on fee history page |
| **API Endpoint** | `POST /api/v1/admin/ads/export/fee-history` |
| **Request Body** | `{ dateFrom: string, dateTo: string, placement?: string[], tier?: string[], format: 'csv' }` |
| **Processing Steps** | 1. Validate admin role. 2. Validate inputs. 3. Query `ad_fee_history` joined with `ad_fee_settings` and `users` where `created_at` within date range. 4. Apply filters. 5. For each record: gather placement, tier, old daily rate, new daily rate, old duration, new duration, old max ads, new max ads, changed by (admin name), change reason, effective from, created at. 6. Generate file. 7. Log EXPORT_GENERATED event. 8. Return download URL or job ID. |
| **Success Response** | 200 OK with `{ downloadUrl: string }` or `{ jobId: string, status: 'processing' }` |

### 6.13 Operation: Check Export Status / Download

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Click download on recent exports table, or poll for async job |
| **API Endpoints** | `GET /api/v1/admin/ads/export/:jobId/status` (status check), `GET /api/v1/admin/ads/export/:jobId/download` (download) |
| **Processing Steps (Status)** | 1. Validate admin role. 2. Find export job by ID. 3. Return status: processing, ready, expired, failed. |
| **Processing Steps (Download)** | 1. Validate admin role. 2. Find export job by ID. 3. Verify status is 'ready'. 4. Stream file to client with appropriate Content-Type and Content-Disposition headers. 5. Log EXPORT_DOWNLOADED event. |
| **Success Response** | 200 OK with file stream |

---

## 7. Input / Output Specification

### 7.1 Input Specification — Single Reject (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `rejection_reason` | Rejection Reason | 却下理由 | TEXT | Yes | Textarea | `@IsNotEmpty()`, `@MaxLength(1000)` |

### 7.2 Input Specification — Bulk Approve (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `ad_ids` | Ad IDs | 広告ID配列 | UUID[] | Yes | Checkbox selection | `@IsArray()`, `@ArrayMinSize(1)`, `@ArrayMaxSize(50)`, each `@IsUUID()` |

### 7.3 Input Specification — Bulk Reject (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `ad_ids` | Ad IDs | 広告ID配列 | UUID[] | Yes | Checkbox selection | `@IsArray()`, `@ArrayMinSize(1)`, `@ArrayMaxSize(50)`, each `@IsUUID()` |
| `rejection_reason` | Rejection Reason | 却下理由 | TEXT | Yes | Textarea | `@IsNotEmpty()`, `@MaxLength(1000)` |

### 7.4 Input Specification — Edit Fee Setting (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `daily_rate` | Daily Rate | 日額料金 | DECIMAL(10,2) | Yes | Input (number) | `@IsNumber()`, `@Min(0.01)` |
| `duration_days` | Duration (Days) | 期間（日数） | INTEGER | Yes | Input (number) | `@IsInt()`, `@Min(1)` |
| `max_ads` | Max Ads | 最大広告数 | INTEGER | Yes | Input (number) | `@IsInt()`, `@Min(1)` |
| `effective_from` | Effective From | 適用開始日 | TIMESTAMP | Yes | Date Picker | `@IsDate()` |
| `change_reason` | Change Reason | 変更理由 | TEXT | Yes | Textarea | `@IsNotEmpty()`, `@MaxLength(1000)` |

### 7.5 Input Specification — Create Fee Setting (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `placement` | Placement | 配置場所 | VARCHAR(50) | Yes | Select | `@IsIn(['homepage_banner', 'product_sidebar', 'category_banner', 'search_top'])` |
| `tier` | Tier | ティア | VARCHAR(20) | Yes | Select | `@IsIn(['basic', 'standard', 'premium'])` |
| `daily_rate` | Daily Rate | 日額料金 | DECIMAL(10,2) | Yes | Input (number) | `@IsNumber()`, `@Min(0.01)` |
| `duration_days` | Duration (Days) | 期間（日数） | INTEGER | Yes | Input (number) | `@IsInt()`, `@Min(1)` |
| `max_ads` | Max Ads | 最大広告数 | INTEGER | Yes | Input (number) | `@IsInt()`, `@Min(1)` |
| `effective_from` | Effective From | 適用開始日 | TIMESTAMP | Yes | Date Picker | `@IsDate()` |
| `change_reason` | Change Reason | 変更理由 | TEXT | Yes | Textarea | `@IsNotEmpty()`, `@MaxLength(1000)` |

### 7.6 Input Specification — Deactivate Fee Setting (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `change_reason` | Change Reason | 変更理由 | TEXT | Yes | Textarea | `@IsNotEmpty()`, `@MaxLength(1000)` |

### 7.7 Input Specification — Revenue Analytics (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `dateFrom` | Start Date | 開始日 | DATE | Yes | Date Picker | `@IsDate()`, required |
| `dateTo` | End Date | 終了日 | DATE | Yes | Date Picker | `@IsDate()`, must be >= dateFrom, max 365 days range |
| `placement` | Placement Filter | 配置場所フィルター | VARCHAR(50)[] | No | Multi-Select | Each `@IsIn(['homepage_banner', 'product_sidebar', 'category_banner', 'search_top'])` |
| `tier` | Tier Filter | ティアフィルター | VARCHAR(20)[] | No | Multi-Select | Each `@IsIn(['basic', 'standard', 'premium'])` |

### 7.8 Input Specification — Export Reports (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `reportType` | Report Type | レポート種別 | ENUM | Yes | Card Selection | `@IsIn(['ad_performance', 'submission_history', 'fee_history'])` |
| `dateFrom` | Start Date | 開始日 | DATE | Yes | Date Picker | `@IsDate()`, required |
| `dateTo` | End Date | 終了日 | DATE | Yes | Date Picker | `@IsDate()`, must be >= dateFrom, max 365 days |
| `placement` | Placement Filter | 配置場所フィルター | VARCHAR(50)[] | No | Multi-Select | Each `@IsIn([...])` |
| `tier` | Tier Filter | ティアフィルター | VARCHAR(20)[] | No | Multi-Select | Each `@IsIn([...])` |
| `status` | Status Filter | ステータスフィルター | VARCHAR(20)[] | No | Multi-Select | Each `@IsIn(['pending', 'approved', 'rejected'])` |
| `shop` | Shop Filter | 店舗フィルター | VARCHAR(255) | No | Input (search) | `@MaxLength(255)` |
| `format` | Export Format | エクスポート形式 | ENUM | Yes | Radio Group | `@IsIn(['csv'])` |

### 7.9 Output Specification — Ad DTO (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `id` | `advertisements.id` | UUID string |
| `shopId` | `advertisements.shop_id` | UUID string |
| `shopName` | `shops.name` | String |
| `title` | `advertisements.title` | String |
| `announcementMessage` | `advertisements.announcement_message` | String |
| `content` | `advertisements.content` | String or null |
| `imageUrl` | `advertisements.image_url` | URL or null |
| `linkUrl` | `advertisements.link_url` | URL or null |
| `placement` | `ad_fee_settings.placement` | String |
| `tier` | `ad_fee_settings.tier` | String |
| `isActive` | `advertisements.is_active` | Boolean |
| `approvalStatus` | `advertisements.approval_status` | 'pending' / 'approved' / 'rejected' |
| `paymentStatus` | `advertisements.payment_status` | 'pending' / 'completed' / 'refunded' |
| `paymentAmount` | `advertisements.payment_amount` | Decimal string ($) |
| `approvedBy` | `advertisements.approved_by` | UUID string or null |
| `approvedAt` | `advertisements.approved_at` | ISO 8601 timestamp or null |
| `rejectionReason` | `advertisements.rejection_reason` | String or null |
| `startsAt` | `advertisements.starts_at` | ISO 8601 timestamp |
| `expiresAt` | `advertisements.expires_at` | ISO 8601 timestamp |
| `weekNumber` | `advertisements.week_number` | Integer |
| `createdAt` | `advertisements.created_at` | ISO 8601 timestamp |
| `analytics` | Analytics tracking | `{ impressions: number, clicks: number, ctr: number }` |

### 7.10 Output Specification — Bulk Result DTO (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `approved` | Count | Integer (number of ads approved) |
| `rejected` | Count | Integer (number of ads rejected) |
| `total` | Count | Integer (total ads processed) |
| `refundsProcessed` | Count | Integer (number of refunds completed) |
| `refundsFailed` | Count | Integer (number of refunds that failed) |
| `ad_ids` | Input echo | UUID string array |
| `errors` | Validation | Array of `{ adId: string, reason: string }` for any failed items |

### 7.11 Output Specification — Fee Setting DTO (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `id` | `ad_fee_settings.id` | UUID string |
| `placement` | `ad_fee_settings.placement` | String |
| `tier` | `ad_fee_settings.tier` | String |
| `dailyRate` | `ad_fee_settings.daily_rate` | Decimal string ($) |
| `durationDays` | `ad_fee_settings.duration_days` | Integer |
| `maxAds` | `ad_fee_settings.max_ads` | Integer |
| `isActive` | `ad_fee_settings.is_active` | Boolean |
| `updatedAt` | `ad_fee_settings.updated_at` | ISO 8601 timestamp |

### 7.12 Output Specification — Fee History DTO (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `id` | `ad_fee_history.id` | UUID string |
| `placement` | `ad_fee_settings.placement` | String |
| `tier` | `ad_fee_settings.tier` | String |
| `oldDailyRate` | `ad_fee_history.old_daily_rate` | Decimal string or null |
| `newDailyRate` | `ad_fee_history.new_daily_rate` | Decimal string |
| `oldDurationDays` | `ad_fee_history.old_duration_days` | Integer or null |
| `newDurationDays` | `ad_fee_history.new_duration_days` | Integer |
| `oldMaxAds` | `ad_fee_history.old_max_ads` | Integer or null |
| `newMaxAds` | `ad_fee_history.new_max_ads` | Integer |
| `changedBy` | `ad_fee_history.changed_by` | UUID string |
| `changedByName` | `users.name` | String (joined) |
| `changeReason` | `ad_fee_history.change_reason` | String or null |
| `effectiveFrom` | `ad_fee_history.effective_from` | ISO 8601 timestamp |
| `createdAt` | `ad_fee_history.created_at` | ISO 8601 timestamp |

### 7.13 Output Specification — Revenue Analytics DTO (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `summary.totalRevenue` | SUM(ad_payments.amount) | Decimal string ($) |
| `summary.totalAdsApproved` | COUNT(approved ads) | Integer |
| `summary.totalFeesCollected` | SUM(completed payments) | Decimal string ($) |
| `summary.avgRevenuePerAd` | totalRevenue / totalAds | Decimal string ($) |
| `summary.totalRefunds` | SUM(refunded amounts) | Decimal string ($) |
| `byPlacement[]` | GROUP BY placement | Array of `{ placement, placementName, adCount, revenue, avgCtr }` |
| `byTier[]` | GROUP BY tier | Array of `{ tier, tierName, adCount, revenue, avgCtr }` |
| `trend[]` | GROUP BY date | Array of `{ date, revenue, adCount }` |

### 7.14 Output Specification — Export Job DTO (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `jobId` | System-generated | UUID string |
| `status` | Job state | 'processing' / 'ready' / 'expired' / 'failed' |
| `downloadUrl` | Storage URL | URL string (when status='ready') |
| `reportType` | Input echo | String |
| `format` | Input echo | String |
| `generatedAt` | Timestamp | ISO 8601 timestamp |
| `expiresAt` | Timestamp + 24h | ISO 8601 timestamp |
| `rowCount` | Query count | Integer |

---

## 8. Input Validation Rules

### 8.1 Single Rejection Validation (Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `rejection_reason` | Required, 1-1000 chars, must not be only whitespace | "Rejection reason is required" | "却下理由は必須です" |

### 8.2 Bulk Operation Validation (Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `ad_ids` | Required, non-empty array, max 50 items, each must be valid UUID | "At least one ad must be selected" / "Maximum 50 ads per bulk operation" / "Invalid ad ID format" | "少なくとも1つの広告を選択してください" / "一括操作は最大50件までです" / "無効な広告ID形式です" |
| `rejection_reason` (bulk reject) | Required, 1-1000 chars | "Rejection reason is required for bulk reject" | "一括拒否には却下理由が必要です" |

### 8.3 Fee Setting Validation (Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `daily_rate` | Required, > 0 | "Daily rate must be greater than 0" | "日額料金は0より大きい必要があります" |
| `duration_days` | Required, > 0 integer | "Duration must be at least 1 day" | "期間は最低1日である必要があります" |
| `max_ads` | Required, > 0 integer | "Max ads must be at least 1" | "最大広告数は最低1である必要があります" |
| `effective_from` | Required, valid date | "Effective date is required" | "適用開始日は必須です" |
| `change_reason` | Required, 1-1000 chars | "Change reason is required" | "変更理由は必須です" |

### 8.4 Create Fee Setting Validation (Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `placement` | Required, valid enum | "Placement is required" / "Invalid placement" | "配置場所は必須です" / "無効な配置場所です" |
| `tier` | Required, valid enum | "Tier is required" / "Invalid tier" | "ティアは必須です" / "無効なティアです" |
| `daily_rate` | Required, > 0 | "Daily rate must be greater than 0" | "日額料金は0より大きい必要があります" |
| `duration_days` | Required, > 0 integer | "Duration must be at least 1 day" | "期間は最低1日である必要があります" |
| `max_ads` | Required, > 0 integer | "Max ads must be at least 1" | "最大広告数は最低1である必要があります" |
| `effective_from` | Required, valid date | "Effective date is required" | "適用開始日は必須です" |
| `change_reason` | Required, 1-1000 chars | "Change reason is required" | "変更理由は必須です" |
| Uniqueness | No active setting exists for placement+tier | "A fee setting already exists for this placement and tier" | "この配置場所とティアのfee設定は既に存在します" |

### 8.5 Deactivate Fee Setting Validation (Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| Fee setting ID | Must exist and be active | "Fee setting not found" / "Fee setting is already inactive" | "fee設定が見つかりません" / "fee設定は既に無効です" |
| `change_reason` | Required, 1-1000 chars | "Change reason is required" | "変更理由は必須です" |

### 8.6 Revenue Analytics Validation (Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `dateFrom` | Required, valid date | "Start date is required" | "開始日は必須です" |
| `dateTo` | Required, valid date, >= dateFrom | "End date is required" / "End date must be after start date" | "終了日は必須です" / "終了日は開始日より後である必要があります" |
| Range | Max 365 days | "Date range cannot exceed 365 days" | "日付範囲は365日を超えることはできません" |

### 8.7 Export Validation (Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `reportType` | Required, must be valid enum | "Report type is required" / "Invalid report type" | "レポート種別は必須です" / "無効なレポート種別です" |
| `format` | Required, must be valid enum | "Export format is required" / "Invalid format" | "エクスポート形式は必須です" / "無効な形式です" |
| `dateFrom` | Required | "Start date is required" | "開始日は必須です" |
| `dateTo` | Required, >= dateFrom | "End date is required" / "End date must be after start date" | "終了日は必須です" / "終了日は開始日より後である必要があります" |

### 8.8 Validation Enforcement Layers

1. **Frontend (Client)**: React Hook Form + Zod schema validation with real-time feedback.
2. **Backend (Server)**: NestJS ValidationPipe + class-validator DTOs on all endpoints.
3. **Database (Constraint)**: DB check constraints as final safety net.

---

## 9. Error Handling Specification

### 9.1 Error Response Structure

```json
{
  "statusCode": 400,
  "message": ["ad_ids must contain between 1 and 50 items"],
  "error": "Bad Request",
  "timestamp": "2026-08-24T12:00:00.000Z",
  "path": "/api/v1/admin/ads/bulk/approve"
}
```

### 9.2 Error Classification Table — Ad Review (Single & Bulk)

| HTTP Status | Error Code | Scenario | User-Facing Behavior |
|-------------|------------|----------|---------------------|
| `400` | `BAD_REQUEST` | Missing rejection reason | "Rejection reason is required" |
| `400` | `BAD_REQUEST` | Ad not in pending state | "This advertisement is no longer pending review" |
| `400` | `BAD_REQUEST` | Bulk: non-pending ads in selection | "The following ads are no longer pending: {list}. Please refresh and try again." |
| `400` | `BAD_REQUEST` | Bulk: empty ad_ids array | "At least one ad must be selected" |
| `400` | `BAD_REQUEST` | Bulk: exceeds 50 ad limit | "Maximum 50 ads per bulk operation" |
| `400` | `BAD_REQUEST` | Bulk: invalid UUID format | "Invalid ad ID format" |
| `403` | `FORBIDDEN` | Non-admin attempting action | "Access denied" |
| `404` | `NOT_FOUND` | Ad not found | "Advertisement not found" |
| `409` | `CONFLICT` | Bulk: some ads changed state during processing | "{n} ads were processed by another admin. Please refresh." |
| `500` | `INTERNAL_SERVER_ERROR` | Server error | "Something went wrong. Please try again" |

### 9.3 Error Classification Table — Fee Management

| HTTP Status | Error Code | Scenario | User-Facing Behavior |
|-------------|------------|----------|---------------------|
| `400` | `BAD_REQUEST` | Invalid daily rate (<=0) | "Daily rate must be greater than 0" |
| `400` | `BAD_REQUEST` | Invalid duration (<=0) | "Duration must be at least 1 day" |
| `400` | `BAD_REQUEST` | Invalid max_ads (<=0) | "Max ads must be at least 1" |
| `409` | `CONFLICT` | Duplicate placement+tier combination | "A fee setting already exists for this placement and tier" |
| `404` | `NOT_FOUND` | Fee setting not found | "Fee setting not found" |
| `400` | `BAD_REQUEST` | Deactivate: fee setting already inactive | "Fee setting is already inactive" |
| `400` | `BAD_REQUEST` | Missing change reason for create/deactivate | "Change reason is required" |
| `500` | `INTERNAL_SERVER_ERROR` | Server error | "Something went wrong. Please try again" |

### 9.4 Error Classification Table — Revenue Analytics

| HTTP Status | Error Code | Scenario | User-Facing Behavior |
|-------------|------------|----------|---------------------|
| `400` | `BAD_REQUEST` | Missing dateFrom or dateTo | "Start date and end date are required" |
| `400` | `BAD_REQUEST` | dateTo before dateFrom | "End date must be after start date" |
| `400` | `BAD_REQUEST` | Date range exceeds 365 days | "Date range cannot exceed 365 days" |
| `500` | `INTERNAL_SERVER_ERROR` | Server error | "Something went wrong. Please try again" |

### 9.5 Error Classification Table — Export

| HTTP Status | Error Code | Scenario | User-Facing Behavior |
|-------------|------------|----------|---------------------|
| `400` | `BAD_REQUEST` | Invalid report type | "Invalid report type" |
| `400` | `BAD_REQUEST` | Invalid format | "Invalid export format. Use CSV." |
| `400` | `BAD_REQUEST` | Missing date range | "Date range is required" |
| `404` | `NOT_FOUND` | Export job not found | "Export job not found" |
| `410` | `GONE` | Export file expired | "This export has expired. Please generate a new one." |
| `500` | `INTERNAL_SERVER_ERROR` | Export generation failed | "Report generation failed. Please try again." |

### 9.6 Frontend Error Display Behavior

- **Field-Level Validation**: Red border and inline text below invalid input.
- **Form-Level Summary**: Alert banner at top of form listing all errors.
- **Toast Notifications**: Used for API errors and successful actions.
- **Loading States**: Spinner on submit buttons during API calls.
- **Bulk Operation Progress**: Progress bar with count of processed items.

---

## 10. Permission and Access Control

### 10.1 Authentication Requirements

- JSON Web Token (JWT) Bearer Token passed via `Authorization` header for all endpoints.
- Refresh token stored in httpOnly cookie for session management.

### 10.2 Protected Endpoints (Admin Only)

| Endpoint | Method | Required Role | Description |
|----------|--------|---------------|-------------|
| `/api/v1/admin/ads` | GET | `admin` | List all ads with filters |
| `/api/v1/admin/ads/:id` | GET | `admin` | View ad detail |
| `/api/v1/admin/ads/:id/approve` | POST | `admin` | Approve single ad |
| `/api/v1/admin/ads/:id/reject` | POST | `admin` | Reject single ad |
| `/api/v1/admin/ads/bulk/approve` | POST | `admin` | Bulk approve ads |
| `/api/v1/admin/ads/bulk/reject` | POST | `admin` | Bulk reject ads |
| `/api/v1/admin/ad-fees` | GET | `admin` | List fee settings |
| `/api/v1/admin/ad-fees` | POST | `admin` | Create fee setting |
| `/api/v1/admin/ad-fees/:id` | PUT | `admin` | Update fee setting |
| `/api/v1/admin/ad-fees/:id/deactivate` | PATCH | `admin` | Deactivate fee setting |
| `/api/v1/admin/ad-fees/history` | GET | `admin` | View fee change history |
| `/api/v1/admin/ads/analytics/revenue` | GET | `admin` | Revenue breakdown analytics |
| `/api/v1/admin/ads/export/ad-performance` | POST | `admin` | Export ad performance report |
| `/api/v1/admin/ads/export/submission-history` | POST | `admin` | Export submission history |
| `/api/v1/admin/ads/export/fee-history` | POST | `admin` | Export fee history |
| `/api/v1/admin/ads/export/:jobId/status` | GET | `admin` | Check export job status |
| `/api/v1/admin/ads/export/:jobId/download` | GET | `admin` | Download export file |

### 10.3 Role-Based Access

| Role | Can Review/Approve/Reject | Can Bulk Approve/Reject | Can Manage Fees | Can View Analytics | Can Export |
|------|:-------------------------:|:-----------------------:|:---------------:|:------------------:|:----------:|
| `buyer` | No | No | No | No | No |
| `merchant` | No | No | No | No | No |
| `admin` | Yes | Yes | Yes | Yes | Yes |

### 10.4 Security Audit Logging

| Event | Data Logged | Retention |
|-------|-------------|-----------|
| `AD_APPROVED` | adminId, adId, shopId, placement, tier, timestamp | 2 years |
| `AD_REJECTED` | adminId, adId, shopId, rejectionReason, refundAmount, timestamp | 2 years |
| `BULK_AD_APPROVED` | adminId, adIds[], count, timestamp | 2 years |
| `BULK_AD_REJECTED` | adminId, adIds[], count, rejectionReason, refundsProcessed, timestamp | 2 years |
| `FEE_UPDATED` | adminId, feeSettingId, oldValue, newValue, changeReason, timestamp | 2 years |
| `FEE_CREATED` | adminId, feeSettingId, placement, tier, dailyRate, durationDays, maxAds, changeReason, timestamp | 2 years |
| `FEE_DEACTIVATED` | adminId, feeSettingId, placement, tier, changeReason, timestamp | 2 years |
| `EXPORT_GENERATED` | adminId, reportType, format, dateRange, rowCount, timestamp | 1 year |
| `EXPORT_DOWNLOADED` | adminId, exportJobId, timestamp | 1 year |

---

## 11. Real-Time Notification Behavior

### 11.1 Notification Events

| Event | Trigger | Recipient | Notification Type |
|-------|---------|-----------|-------------------|
| `AD_APPROVED` | Admin approves ad (single or bulk) | Shop owner (per ad) | "Your advertisement '{title}' has been approved" |
| `AD_REJECTED` | Admin rejects ad (single or bulk) | Shop owner (per ad) | "Your advertisement '{title}' has been rejected. Reason: {reason}" |
| `EXPORT_READY` | Async export job completed | Admin | "Your {reportType} report is ready for download" |
| `LOW_AD_SLOTS` | Placement slots running low | Admin | "Only {count} slots remaining for {placement}" |

### 11.2 Notification Delivery

- Notifications are created in the `notifications` table.
- Real-time delivery via WebSocket (user-specific room).
- For bulk operations: individual notifications are created per shop owner per ad.
- Export ready notifications are delivered via WebSocket and in-app notification center.

---

## 12. Screen Transition Specification

### 12.1 Inbound Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| Admin Dashboard | `/admin/advertisements` | Click "Advertisement Management" in nav |
| Admin Dashboard | `/admin/advertisements/analytics` | Click "Revenue Analytics" shortcut |
| New ad submission notification | `/admin/advertisements` | Click notification for new ad review |

### 12.2 Internal Navigation

| Source | Target | Trigger |
|--------|--------|---------|
| `/admin/advertisements` | Ad Review Modal | Click "Review" on ad row |
| `/admin/advertisements` | Bulk Reject Modal | Click "Bulk Reject" with ads selected |
| `/admin/advertisements` | Bulk Approve Modal | Click "Bulk Approve" with ads selected |
| `/admin/advertisements` | `/admin/advertisements/packages` | Click "Manage Packages" |
| `/admin/advertisements` | `/admin/advertisements/analytics` | Click "Revenue Analytics" |
| `/admin/advertisements` | `/admin/advertisements/export` | Click "Export" |
| `/admin/advertisements/packages` | Edit Fee Modal | Click "Edit" on fee setting |
| `/admin/advertisements/packages` | Create Fee Modal | Click "Create Fee Setting" |
| `/admin/advertisements/packages` | Deactivate Fee Confirmation Modal | Click "Deactivate" on fee setting |
| `/admin/advertisements/packages` | `/admin/advertisements/fee-history` | Click "View History" |
| `/admin/advertisements/fee-history` | `/admin/advertisements/packages` | Click "Back to Packages" |
| `/admin/advertisements/analytics` | `/admin/advertisements` | Click "Back to Ads" |
| `/admin/advertisements/export` | `/admin/advertisements` | Click "Back to Ads" |
| Any admin ad page | `/admin/dashboard` | Navigate away |

### 12.3 Modal Transitions

| Source | Target | Trigger |
|--------|--------|---------|
| Ad Review Modal | Closed | Approve / Reject / Cancel |
| Bulk Approve Modal | Closed | Confirm / Cancel |
| Bulk Reject Modal | Closed | Confirm (with reason) / Cancel |
| Edit Fee Modal | Closed | Save / Cancel |
| Create Fee Modal | Closed | Create / Cancel |
| Deactivate Fee Confirmation Modal | Closed | Confirm / Cancel |

---

## 13. Non-Functional Considerations

### 13.1 Performance Requirements

| Metric | Target |
|--------|--------|
| Ad List Page Load | ≤ 2 seconds |
| Single Approve/Reject API | ≤ 500 milliseconds |
| Bulk Approve/Reject (50 ads) | ≤ 5 seconds |
| Fee Settings Update | ≤ 500 milliseconds |
| Revenue Analytics Query | ≤ 2 seconds |
| Export Generation (≤1000 rows) | ≤ 3 seconds |
| Export Generation (>1000 rows) | Async, notify when ready |

### 13.2 Security Considerations

| Concern | Mitigation |
|---------|------------|
| Admin Bypass | RBAC enforced via JwtAuthGuard + RolesGuard on all endpoints |
| Bulk Operation Abuse | Maximum 50 ads per batch, rate limiting on bulk endpoints |
| Fee Manipulation | Fee changes logged with admin identity, reason, and before/after values |
| Export Data Leakage | Exports exclude sensitive fields (password hashes, tokens), logged to audit |
| SQL Injection | Parameterized queries via Prisma ORM |
| Concurrent Bulk Edits | Optimistic locking or pre-flight state check before batch commit |

### 13.3 Responsive Design Requirements

| Breakpoint | Layout |
|------------|--------|
| Desktop (≥ 1024px) | Full table layout, sidebar filters, side-by-side charts |
| Tablet (768px – 1023px) | Stacked filters, responsive table, stacked charts |
| Mobile (< 768px) | Card-based ad list, full-width modals, single-column charts |

### 13.4 Accessibility Requirements

| Requirement | Implementation |
|-------------|----------------|
| Keyboard Navigation | All interactive elements focusable via Tab, bulk checkboxes keyboard accessible |
| Screen Reader | ARIA labels on buttons, status badges, modals, and charts |
| Color Contrast | WCAG 2.1 AA compliant for status badges and chart colors |
| Focus Management | Modal focus trap, return focus on close |
| Chart Accessibility | Charts include text-based data tables as fallback |

---

## 14. Configurable Items (External Definitions)

Defined via `.env` configuration:

| Definition Key | Default Value | Description |
|----------------|---------------|-------------|
| `AD_BULK_MAX_SIZE` | `50` | Maximum ads per bulk operation |
| `AD_EXPORT_MAX_ROWS_SYNC` | `1000` | Row count threshold for sync vs async export |
| `AD_EXPORT_RETENTION_HOURS` | `24` | Hours before generated export files are deleted |
| `AD_ANALYTICS_MAX_RANGE_DAYS` | `365` | Maximum date range for analytics queries |
| `AD_SLIDER_MAX` | `5` | Maximum ads per slider rotation |
| `AD_SLIDER_INTERVAL` | `5000` | Slider auto-rotation interval in milliseconds |

**Fee settings** are managed dynamically via the `ad_fee_settings` database table and can be updated by admins through the Package & Fee Management screen. See Section 5.5 for the admin UI specification.

---

## 15. Cross-Reference Traceability Matrix

### 15.1 Requirements Definition Traceability

| Requirement ID | Requirement Description | Covered By (This Document) |
|----------------|-------------------------|----------------------------|
| B-ADM-003 | Ads require admin approval before display | UC-ADM-001~003, Sec 6.2~6.3, BR-ADM-001~005 |
| B-ADM-006 | Refund issued on ad rejection | UC-ADM-003, 005, Sec 6.3, 6.5, BR-ADM-004 |
| B-ADM-007 | Admin can manage packages and set pricing | UC-ADM-007, 013~014, Sec 6.7, BR-ADM-030~039 |
| B-ADM-008 | Admin can approve/reject ads with reason | UC-ADM-002~003, Sec 6.2~6.3, BR-ADM-001~005 |
| B-ADM-009 | Ad display rules: priority and round-robin | BR-ADM-020~025 |
| B-ADM-010 | Slider max 5 ads, auto-rotation | BR-ADM-024~025 |
| B-ADM-011 | Expired/inactive ads excluded from display | BR-ADM-020~021 |
| B-ADM-012 | Ad fees are admin-configurable | UC-ADM-007~008, Sec 6.7~6.8 |
| B-ADM-013 | Admin can perform bulk approval/rejection | UC-ADM-004~005, Sec 6.4~6.5, BR-ADM-010~016 |
| B-ADM-014 | Platform revenue analytics by placement and tier | UC-ADM-009, Sec 6.9, BR-ADM-040~044 |
| B-ADM-015 | Export ad performance, submission history, and fee history reports | UC-ADM-010~012, Sec 6.10~6.12, BR-ADM-050~054 |

### 15.2 Database Design Traceability

| Database Table | Relevant Functional Operations |
|----------------|-------------------------------|
| `advertisements` | List Ads (SELECT), Approve/Reject Single (UPDATE), Bulk Approve/Reject (BATCH UPDATE) |
| `ad_payments` | Refund on Rejection (UPDATE), Revenue Analytics (SELECT), Export (SELECT) |
| `ad_fee_settings` | List Fee Settings (SELECT), Create Fee (INSERT), Update Fee (UPDATE), Deactivate Fee (UPDATE), Analytics Breakdown (JOIN) |
| `ad_fee_history` | Fee Change Logging (INSERT), View History (SELECT), Export Fee History (SELECT) |
| `shops` | Ad List with Shop Info (JOIN) |
| `users` | Admin Identity on Approval (JOIN), Fee History Changed By (JOIN) |
| `notifications` | Ad Status Notifications (INSERT), Export Ready Notification (INSERT) |
| `audit_logs` | All Admin Action Logging (INSERT) |

### 15.3 Related Document References

| Document ID | Document Name | File Path |
|-------------|---------------|-----------|
| SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` |
| SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` |
| SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` |

---

*End of Functional Specification (Admin Ad Management Screen)*
