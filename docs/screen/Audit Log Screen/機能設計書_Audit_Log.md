# Functional Specification (機能設計書) — Admin Audit Log Screen

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-FDS-AUDIT-001 |
| **Target Screen** | Admin Audit Log (管理者監査ログ) — Audit Trail Viewing, Filtering, and Export |
| **Subsystem** | Audit Logging — Admin Audit Trail, Change Tracking, Security Monitoring |
| **Function ID** | FN-AUDIT-001 |
| **Version** | 1.2 |
| **Created** | 2026-08-25 |
| **Last Updated** | 2026-10-21 |
| **Author** | Software Architect |
| **Status** | Released (承認済み) |
| **Classification** | Internal — Engineering Division |

---

## Document Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-08-25 | Software Architect | Initial functional specification for Admin Audit Log Screen: audit trail viewing, filtering, detail inspection, and CSV export. |
| 1.1 | 2026-08-27 | Software Architect | Updated for admin-controlled manual deletion: removed system auto-purge, added `DELETE /api/v1/admin/audit-logs/files` endpoint, updated business rules (BR-AUDIT-001, BR-AUDIT-007, BR-AUDIT-034, BR-AUDIT-041), state transitions, permissions, and configurable items. CSV export files retained indefinitely until admin manual delete. |
| 1.2 | 2026-10-21 | Software Architect | Aligned with the implemented source code: removed the "Back to Dashboard" button and the visible User / Entity ID filter inputs (`userId` / `entityId` are URL-only parameters); removed the Entity ID column, the detail-modal Entity ID row, and the "View User History" / "View Entity History" actions (the API never returns `entityId`); timestamps are rendered in Myanmar Time (`YYYY/MM/DD HH:mm:ss.SSS MMT`) and date-only bounds use MMT day boundaries; pagination default is 10 (backend default 50) with 10/20/50/100 options; the detail modal renders humanized old/new value lists and parsed client information instead of raw JSON / user agent; row selection feeds the `recordIds` delete option; CSV export opens a date-range dialog and is streamed as a file attachment (no download URL, no export-file storage table, `deletedFiles` always 0); filter options merge the audit catalog with recorded values and hide the legacy `audit.admin.delete` label; self-audit events are `AUDIT_EXPORT` and `AUDIT_LOG_DELETE`; the client uses TanStack Query + Zod (not React Hook Form). |

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

This screen subsystem provides platform administrators with full visibility into all significant system actions performed within the Cosmetics Finder platform. It serves as the central audit trail for security monitoring, compliance, and operational accountability.

The audit log captures every meaningful action across the platform — user authentication events, merchant approvals, product changes, advertisement lifecycle events, order status transitions, commission rate changes, payout processing, and administrative actions. Each log entry records who performed the action, what was changed (with before/after values), when it occurred, and from where (IP address, user agent).

This document defines every screen, operation, business rule, and API endpoint that the Admin interacts with to view, filter, search, and export audit log data.

### 1.2 Functional Responsibilities

1. **Audit Trail Viewing** — Displaying all audit log entries in a sortable, paginated table with timestamp, actor, action type, entity type, summary, and IP address.
2. **Advanced Filtering** — Filtering audit logs by action type, entity type, date range, IP address, and free-text search. (`userId` and `entityId` are accepted as URL query parameters only; the screen renders no input for them.)
3. **Log Detail Inspection** — Viewing full details of individual audit log entries including humanized old/new value lists, IP address, and parsed client information (client type, browser, device).
4. **Search** — Full-text search across action names, entity types, and user information.
5. **CSV Export** — Choosing an export date range in a dialog, then downloading the filtered audit log data as a CSV attachment for external analysis and compliance reporting.
6. **Real-Time Monitoring** — Auto-refresh capability to monitor recent system activity in near real-time (suspended while the browser tab is hidden).
7. **Manual Deletion** — Authorized admins can manually delete DB audit log records that are at least 90 days old, either retention-wide or limited to explicitly selected rows. No system auto-purge exists, and no export-file storage exists (exports are streamed directly to the browser).

### 1.3 Target Users

| Attribute | Value |
|-----------|-------|
| **Primary Actor** | Platform Administrator |
| **Required Authentication** | JWT Bearer Token (`admin` role) |
| **Data Scope** | All platform audit log entries (append-only, with admin manual deletion for records >= 90 days). |

### 1.4 Relationships with Other Functions and Peripheral Systems

```text
┌──────────────────────────┐      ┌─────────────────────────────────────┐
│   Admin Actor            │      │         audit_logs                  │
│ (Views, Filters,        ├─────►│  Reads log entries                  │
│  Exports, Deletes       │      │  Append-only + Admin Manual Delete  │
│  Audit Logs & CSVs)     │      │  (>= 90 days only)                 │
└──────────────────────────┘      └──────────────┬────────────────────┘
                                                 │
                                      ┌──────────┴─────────────┐
                                      │                        │
                                      ▼                        ▼
                          ┌──────────────────┐    ┌────────────────────────┐
                          │ users            │    │  Export Engine         │
                          │ (actor info)     │    │  (CSV streamed to the │
                           │                  │    │   admin's browser)    │
                          └──────────────────┘    └────────────────────────┘
                                                          │
                                                          ▼
                                               ┌────────────────────────┐
                                               │  All Platform Modules  │
                                               │  (write audit entries) │
                                               └────────────────────────┘
```

### 1.5 Inputs / Outputs

| Input Information | Data Category | Source / Description |
|-------------------|---------------|----------------------|
| `userId` | Admin Input | Filter by specific user UUID (URL query parameter only — no on-screen control) |
| `action` | Admin Input | Filter by action type (e.g., AUDIT_EXPORT, MERCHANT_APPROVED, AD_REJECTED) |
| `entityType` | Admin Input | Filter by entity type (e.g., merchant, order, Advertisement, AuditLog) |
| `entityId` | Admin Input | Filter by specific entity UUID (URL query parameter only — no on-screen control) |
| `date_from` | Admin Input | Filter start date |
| `date_to` | Admin Input | Filter end date |
| `ip_address` | Admin Input | Filter by IP address |
| `search` | Admin Input | Free-text search across action, entity type, user name |
| `page` | Admin Input | Pagination page number |
| `limit` | Admin Input | Items per page |
| `sort_by` | Admin Input | Sort field (created_at, action, entity_type) |
| `sort_order` | Admin Input | Sort direction (asc, desc) |
| `export_format` | Admin Input | Export format: csv |
| `export_date_from` / `export_date_to` | Admin Input | Export date range chosen in the export dialog (both required, max 365 days) |
| `selected_record_ids` | Admin Input | Explicit row selection forwarded to the delete operation as `recordIds` |

| Output Information | Data Category | Destination / Description |
|--------------------|---------------|---------------------------|
| `audit_logs` | Audit Log List | Paginated list of audit log entries (never includes `entityId`) |
| `audit_log_detail` | Audit Log DTO | Full audit log entry with old/new values (never includes `entityId`) |
| `export_file` | File | CSV report streamed as a file attachment (`text/csv`, UTF-8 BOM) — no download URL and no stored export file |

### 1.6 Related Documents

| No. | Document ID | Document Name | File Path / Reference | Remarks |
|-----|-------------|---------------|----------------------|---------|
| 1 | SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | Business rules for audit logging (Section 5.8, 6.4, 7.8). |
| 2 | SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | `audit_logs` table structure (Section 3.28), indexes (Section 4.1). |
| 3 | SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | Security rules, naming conventions, API standards, audit logging requirements (Section 6.4). |

---

## 2. Use Cases and Business Workflow

### 2.1 Use Case Catalog

| UC-ID | Use Case Name | Precondition | Postcondition | Triggering Actor |
|-------|---------------|--------------|---------------|------------------|
| UC-AUDIT-001 | View Audit Log List | Admin is authenticated. | Paginated list of all audit log entries displayed with default sort (newest first, 10 per page). | Admin |
| UC-AUDIT-002 | Filter Audit Logs | Admin is viewing audit log list. | Filtered audit log list displayed matching filter criteria (action, entity type, date range, IP address, free-text search). | Admin |
| UC-AUDIT-003 | Search Audit Logs | Admin is viewing audit log list. | Search results displayed matching search query across action, entity, user. | Admin |
| UC-AUDIT-004 | View Audit Log Detail | Admin selected a specific audit log entry. | Full log detail displayed including humanized old/new values, IP address, and parsed client information. | Admin |
| UC-AUDIT-005 | Export Audit Logs (CSV) | Admin has applied filters to the audit log list. | A date range is chosen in the export dialog and the matching CSV file is downloaded. | Admin |
| UC-AUDIT-006 | Manually Delete Audit Logs | Admin wants to purge old audit records. | DB audit log records aged >= 90 days are permanently deleted — either every record older than the retention period, or exactly the rows selected in the table. Records younger than 90 days are rejected. | Admin |

### 2.2 Primary Business Workflow — Audit Log Viewing and Filtering

```
┌──────────────────────────────┐
│  Admin Dashboard             │
│  (Platform Overview)         │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  Navigate to Audit Log       │
│  (Click "Audit Log" in nav)  │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  Audit Log List              │
│  (Default: newest first,     │
│   10 per page)               │
└──────────┬───────────────────┘
           │
     ┌─────┴──────────────────┐
     │                        │
     ▼                        ▼
┌──────────────┐    ┌──────────────────────┐
│ Apply Filters│    │ Click Log Entry      │
│ (Action,     │    │ (View Detail)        │
│  Entity Type,│    └──────────┬───────────┘
│  Date, IP,   │               │
│  Search)     │               ▼
└──────┬───────┘      ┌──────────────────┐
       │              │  Log Detail      │
       ▼              │  Modal           │
┌──────────────┐      │  - Timestamp     │
│ Filtered     │      │  - Actor (User)  │
│ Results      │      │  - Action        │
│ (Updated     │      │  - Entity Type   │
│  List)       │      │  - Old Value     │
└──────┬───────┘      │  - New Value     │
       │              │  - IP Address    │
       ▼              │  - Client Info   │
┌──────────────┐      └──────────────────┘
│ Export CSV   │
│ (date range  │
│  dialog)     │
└──────────────┘
```

### 2.3 Workflow Critical Path Summary

| Step | Action | Status Before | Status After | Assigned To |
|:----:|--------|---------------|--------------|-------------|
| 1 | Admin navigates to Audit Log | — | — | Admin |
| 2 | System loads audit log list (newest first, paginated) | — | List displayed | System |
| 3a | **Filter path:** Admin applies filters (action, entity type, date range, IP address) | — | Filtered list displayed | Admin |
| 3b | **Search path:** Admin enters search query | — | Search results displayed | Admin |
| 3c | **Detail path:** Admin clicks a log entry | — | Detail modal displayed | Admin |
| 4 | Admin clicks "Export CSV" and confirms a date range in the dialog | — | CSV file generated and downloaded | System |
| 5 | **Manual delete path:** Admin optionally selects rows in the table, sets the retention period, and confirms deletion | — | Eligible audit log records permanently deleted | Admin |

### 2.4 Relevant Requirements Covered

| Requirement ID | Requirement Summary |
|----------------|---------------------|
| B-ADM-016 | Audit logs record all significant system actions |
| B-ADM-017 | Audit logs track who did what, when, with before/after values |
| B-ADM-018 | Audit logs are filterable by user, action type, entity |
| B-ADM-019 | Audit logs are append-only (no UPDATE or DELETE) |
| B-ADM-020 | Only admins can view audit logs |
| B-ADM-021 | Audit log data excludes sensitive fields (passwords, tokens) |

---

## 3. State Transition Specification

### 3.1 Audit Log Retention States

| State | Description | Records Available to Admin | Allowed Write Operation |
|-------|-------------|:--------------------------:|-------------------------|
| `ACTIVE` | Append-only audit log record younger than 90 days. Cannot be deleted by anyone. | Yes | INSERT only |
| `DELETABLE` | Audit log record aged >= 90 days (`AUDIT_LOG_MIN_RETENTION_DAYS`). Eligible for admin manual deletion. | Yes | INSERT only |
| `DELETED` | Record removed by an authorized admin via manual delete. | No | None |

### 3.2 CSV Export Request States

| State | Description | Transition Trigger |
|-------|-------------|-------------------|
| `IDLE` | No export request is in progress; the export dialog may be closed or open. | Admin opens the export dialog |
| `VALIDATING` | The chosen date range is validated client-side (both dates required, end >= start, range to end-of-day <= 365 days) and by the server DTO. | Admin confirms the export dialog |
| `STREAMING` | The backend reads the matching rows and streams the CSV attachment. | Request passes client and server validation |
| `COMPLETED` | The CSV file was downloaded by the browser; a success toast is shown. | Response fully received |
| `FAILED` | Validation or generation failed; an error toast is shown and the dialog stays open. | Error response |

CSV export transitions perform read-only queries against `audit_logs`. No export state transition deletes, archives, purges, updates, or otherwise modifies audit log records. There is **no export-file storage**: the generated CSV is streamed to the admin's browser as an attachment and is never persisted, so there is no export file to retain, expire, or delete.

### 3.3 Auto-Refresh States

| State | Description | Transition Trigger |
|-------|-------------|-------------------|
| `DISABLED` | The audit log list does not refresh automatically. | Admin turns auto-refresh off |
| `ENABLED` | The list refreshes every `AUDIT_LOG_AUTO_REFRESH_INTERVAL` milliseconds. | Admin turns auto-refresh on |
| `REFRESHING` | A read-only list request is in progress. | Refresh interval elapses or admin requests refresh |
| `PAUSED` | Automatic refresh is temporarily paused while the page is hidden or a request is in flight. | Page visibility change or request overlap |
| `ERROR` | The latest refresh request failed; existing list data remains unchanged. | Refresh request returns an error |

### 3.4 State Transition Matrix

| Transition ID | From State | To State | Trigger / Guard Condition |
|---------------|------------|----------|---------------------------|
| TR-AUDIT-001 | `ACTIVE` | `DELETABLE` | Record ages past 90 days (`>= AUDIT_LOG_MIN_RETENTION_DAYS`); no automatic action taken |
| TR-AUDIT-002 | `DELETABLE` | `DELETED` | Authorized admin manually deletes the record via `DELETE /api/v1/admin/audit-logs/files` (retention-wide or explicit `recordIds`) |
| TR-AUDIT-003 | `IDLE` | `VALIDATING` | Admin confirms the export dialog |
| TR-AUDIT-004 | `VALIDATING` | `STREAMING` | Request passes client-side and server-side validation |
| TR-AUDIT-005 | `STREAMING` | `COMPLETED` | CSV file streamed successfully; `AUDIT_EXPORT` self-audit event appended |
| TR-AUDIT-006 | `VALIDATING` / `STREAMING` | `FAILED` | Validation, row-limit, or generation error |
| TR-AUDIT-008 | `DISABLED` | `ENABLED` | Admin enables auto-refresh |
| TR-AUDIT-009 | `ENABLED` | `REFRESHING` | Refresh interval elapses while the tab is visible |
| TR-AUDIT-010 | `REFRESHING` | `ENABLED` | Read-only list query succeeds |
| TR-AUDIT-011 | `REFRESHING` | `ERROR` | Read-only list query fails |

---

## 4. Business Rules

### 4.1 Audit Log Data Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AUDIT-001 | Append-Only with Admin Manual Deletion | Audit logs are append-only (no UPDATE). DELETE is permitted only for authorized admins (role: `admin`) manually deleting records that are at least 90 days old (`>= AUDIT_LOG_MIN_RETENTION_DAYS`). Records younger than 90 days cannot be deleted by anyone. | Backend (DB constraint + service) |
| BR-AUDIT-007 | No System Auto-Purge | System background auto-deletion of DB audit log records is completely removed. There is no scheduled retention purge job. All deletion is manual and admin-initiated only. | Backend (no scheduled job) |
| BR-AUDIT-002 | No Sensitive Data | Audit logs must never contain passwords, access tokens, refresh tokens, or authentication secrets in old_value or new_value fields. | Backend (service logic) |
| BR-AUDIT-003 | Actor Identification | Each log entry must record the `user_id` of the actor. System-generated actions may have `user_id = NULL`. | Backend (service logic) |
| BR-AUDIT-004 | Timestamp Accuracy | Each log entry must record `created_at` as the exact UTC timestamp of the action. | Backend (DB default) |
| BR-AUDIT-005 | IP Address Capture | When available, the client IP address must be captured in `ip_address` field. | Backend (interceptor) |
| BR-AUDIT-006 | User Agent Capture | When available, the client user agent must be captured in `user_agent` field. | Backend (interceptor) |

### 4.2 Audit Event Coverage Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AUDIT-010 | Authentication Events | All login, logout, password reset request, and password reset completion events must be logged. | Backend (auth module) |
| BR-AUDIT-011 | Merchant Approval Events | All merchant approval, rejection, and status changes must be logged with old/new license_status values. | Backend (merchant-management module) |
| BR-AUDIT-012 | Product Events | All product create, update, and delete events must be logged with before/after values. | Backend (products module) |
| BR-AUDIT-013 | Advertisement Events | All advertisement create, approve, reject, and status change events must be logged. | Backend (advertisement-management module) |
| BR-AUDIT-014 | Order Events | All order status changes must be logged with old/new status values. | Backend (orders module) |
| BR-AUDIT-015 | Fee Settings Events | All fee setting create, update, and deactivate events must be logged. | Backend (advertisement-management module) |
| BR-AUDIT-016 | Commission Events | All commission rate changes must be logged with old/new rate values. | Backend (commission-revenue module) |
| BR-AUDIT-017 | Payout Events | All payout processing events must be logged with amount and status. | Backend (commission-revenue module) |
| BR-AUDIT-018 | Review Moderation Events | All review approve, reject, and flag events must be logged. | Backend (review-management module) |

### 4.3 Viewing and Filtering Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AUDIT-020 | Default Sort | Audit log list defaults to sorting by `created_at DESC` (newest first). | Backend (query default) |
| BR-AUDIT-021 | Default Page Size | The list endpoint defaults to 50 entries per page; the Admin Audit Log screen requests 10 per page on first load (`AUDIT_LOG_PAGE_SIZES` = 10 / 20 / 50 / 100). | Backend (pagination default) + Frontend (query schema default) |
| BR-AUDIT-022 | Maximum Page Size | Maximum page size is 200 entries per page on the backend; the client schema caps the value at 100. | Backend (validation) + Frontend (Zod pipe) |
| BR-AUDIT-023 | Date Range Filter | Date range filter is optional. When provided, both date_from and date_to are required. Date-only values are interpreted as Myanmar Time (UTC+6:30) day boundaries: `dateFrom` = 00:00:00.000, `dateTo` = 23:59:59.999. | Backend (DTO validation) |
| BR-AUDIT-024 | Combined Filters | Multiple filters can be combined (AND logic). | Backend (query builder) |
| BR-AUDIT-025 | Search Scope | Free-text search matches against `action`, `entity_type`, and joined `users.name` / `users.email`. | Backend (query logic) |
| BR-AUDIT-026 | IP Filter Matching | The IP filter is a partial match: the query matches the stored address and its common variants (e.g. `::ffff:` prefixed IPv4, IPv4-mapped IPv6) using `contains`. | Backend (query logic) |
| BR-AUDIT-027 | Entity ID Never Returned | `entity_id` remains in the database and the list/export filters still accept `entityId`, but list and detail responses never return it — the UI does not display it. | Backend (DTO mapping) |
| BR-AUDIT-028 | Filter Option Catalog | The Action and Entity Type filter options are the union of the audit catalog (every action / entity type the application can record) and the values already recorded in `audit_logs`. The legacy `audit.admin.delete` label is hidden from the Action filter; rows stored under it remain reachable through `AUDIT_LOG_DELETE`. | Backend (filter catalog) |

### 4.4 Export Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AUDIT-030 | Export Format | Audit log export format is restricted to CSV only. | Backend (DTO validation) |
| BR-AUDIT-031 | Export Applies Current Filters | Export generates data using the same filters currently applied to the list view, combined with the date range chosen in the export dialog. | Backend (query reuse) |
| BR-AUDIT-032 | Export Date Range Limit | Maximum export date range is 365 days (measured to the end of the selected end day). Both dates are mandatory in the export dialog. | Backend (validation) + Frontend (dialog validation) |
| BR-AUDIT-033 | Export Row Limit | Maximum 10,000 rows per export. If filtered results exceed this limit, admin is notified. | Backend (validation) |
| BR-AUDIT-034 | Export Is Read-Only | CSV export using search, date range, or filters performs only SELECT/read operations. It MUST NOT delete, archive, purge, or modify any audit log record. The generated CSV is streamed directly to the admin's browser as an attachment; no export file is stored, so there is nothing to delete later. | Backend (service and DB permissions) |
| BR-AUDIT-035 | Export Audit | A successful export appends an `AUDIT_EXPORT` self-audit event recording the applied filters and the row count; recording that event does not modify or purge the exported records, and a failure to write the event never fails the export. | Backend (service logic) |

### 4.5 Security Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AUDIT-040 | RBAC Enforcement | All audit log endpoints require `admin` role via JwtAuthGuard + RolesGuard. | Backend (NestJS guards) |
| BR-AUDIT-041 | Admin Manual Delete Only | Audit logs can be deleted only by authorized admins via `DELETE /api/v1/admin/audit-logs/files`. Only records aged >= 90 days are eligible. When explicit `recordIds` are supplied, every referenced record must exist and satisfy the age check (atomic — the request fails without deleting anything if one record is ineligible); otherwise every record older than the retention threshold is deleted. Non-admin roles and records younger than 90 days are rejected. | Backend (delete endpoint + guard) |
| BR-AUDIT-042 | No Modification | Audit logs cannot be modified via the API. | Backend (no update endpoints) |
| BR-AUDIT-043 | Export Data Sanitization | Exported data must not include sensitive fields. | Backend (export service) |

---

## 5. Screen Specifications

### 5.1 Screen: Admin Audit Log List (`/admin/audit-logs`)

**Purpose:** Display all audit log entries in a sortable, filterable, paginated table.

#### 5.1.1 UI Elements

**Page Header:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| AL-01 | Page Title | Heading (h1) | `audit.title` | No | "Audit Log" |
| AL-02 | Page Subtitle | Text | `audit.subtitle` | No | Short description shown under the title |
| AL-03 | Auto-Refresh Toggle | Switch | `audit.autoRefresh` | No | Enable/disable auto-refresh every 30 seconds (paused while the tab is hidden) |
| AL-04 | Export CSV Button | Button (outline) | `audit.exportCsv` | No | Opens the export date-range dialog; blocked with an info toast when the list is empty |
| AL-05 | Delete Audit Logs Button | Button (destructive) | `audit.deleteLogs` | No | Opens the manual delete confirmation dialog |

> There is no "Back to Dashboard" element in the page header.

**Audit Log Table:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| AL-09 | Select-All Checkbox | Checkbox (header) | `audit.selectAll` | No | Select/deselect every row on the current page |
| AL-10 | Row Selection Checkbox | Checkbox | `audit.selectRow` | No | Select a row; selected IDs are sent as `recordIds` on delete |
| AL-11 | Timestamp Column | Table Column | `audit.timestamp` | Yes | When the action occurred, rendered in Myanmar Time (sortable) |
| AL-12 | Actor Column | Table Column | `audit.actor` | Yes | User name and email (avatar + name / email) |
| AL-13 | Action Column | Table Column | `audit.action` | Yes | Action performed, shown as a colour-coded badge (sortable, filterable) |
| AL-14 | Entity Type Column | Table Column | `audit.entityType` | Yes | Entity type affected (sortable, filterable) |
| AL-15 | Summary Column | Table Column | `audit.summary` | Yes | Brief summary of what changed |
| AL-16 | IP Address Column | Table Column | `audit.ipAddress` | Yes | Client IP address |
| AL-17 | Actions Column | Table Column | `audit.actions` | Yes | "View Detail" icon button |
| AL-18 | Empty State | Empty State | `audit.noLogs` | No | "No audit log entries found." |

> The table has **no Entity ID column** — `entityId` is never returned by the API.

**Filters:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| AL-20 | Search Input | Input (search) | `audit.search` | No | Free-text search across action, entity type, user (debounced 300 ms) |
| AL-21 | Action Filter | Select (multi) | `audit.filterByAction` | No | Filter by action type (catalog ∪ recorded values) |
| AL-22 | Entity Type Filter | Select (multi) | `audit.filterByEntityType` | No | Filter by entity type (catalog ∪ recorded values) |
| AL-23 | Date Range Filter | Date Range Picker | `audit.filterByDate` | No | Filter by date range (from / to, both required) |
| AL-24 | IP Address Filter | Input (text) | `audit.filterByIp` | No | Filter by IP address (max 45 chars) |
| AL-25 | Clear Filters Button | Button (ghost) | `audit.clearFilters` | No | Reset all filters (shown only when at least one filter is active) |
| AL-26 | Active Filters Badge | Badge | `audit.activeFilters` | No | Shows count of active filters |

> `userId` and `entityId` are supported by the API but have **no filter control** on this screen; they can only be supplied through the URL query string.

**Pagination:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| AL-30 | Page Info Text | Text | — | Yes | "Showing page {page} of {totalPages}" (hardcoded in the shared `PaginationControls`) |
| AL-31 | Previous Button | Button | `audit.previous` | No | Previous page |
| AL-32 | Page Number Buttons | Button Group | `audit.pageNumbers` | No | Page number navigation |
| AL-33 | Next Button | Button | `audit.next` | No | Next page |
| AL-34 | Page Size Select | Select | `audit.pageSize` | No | Items per page: 10 (default), 20, 50, 100 |

### 5.2 Screen: Audit Log Detail Modal

**Purpose:** Display full details of a single audit log entry including old/new values.

#### 5.2.1 UI Elements

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| AL-40 | Modal Title | Heading (DialogTitle) | `audit.logDetail` | No | "Audit Log Detail" |
| AL-41 | Timestamp | Text | `audit.timestamp` | Yes | Full Myanmar Time timestamp (`YYYY/MM/DD HH:mm:ss.SSS MMT`) |
| AL-42 | Actor Name | Text | `audit.actorName` | Yes | User who performed the action ("System" for system events) |
| AL-43 | Actor Email | Text | `audit.actorEmail` | Conditional | Actor email address (hidden when absent) |
| AL-44 | Actor Role | Badge | `audit.actorRole` | Conditional | Actor role (admin, merchant, buyer, super_admin) |
| AL-45 | Action | Text | `audit.action` | Yes | Action performed (e.g., MERCHANT_APPROVED) |
| AL-46 | Entity Type | Text | `audit.entityType` | Yes | Entity type affected |
| AL-47 | Old Value | Key/Value List | `audit.oldValue` | Conditional | Previous state, rendered as a humanized key/value list |
| AL-48 | New Value | Key/Value List | `audit.newValue` | Conditional | New state, rendered as a humanized key/value list |
| AL-49 | IP Address | Text | `audit.ipAddress` | Yes | Client IP address |
| AL-50 | Client Information | Section + Badge | `audit.clientInfo` / `audit.clientType` / `audit.clientBrowser` / `audit.clientDevice` | Conditional | User agent parsed into client type, browser, and device (the raw user agent string is never displayed) |
| AL-51 | Close Button | Button | `audit.close` | No | Close modal |

> The modal has **no Entity ID row** and **no "View User History" / "View Entity History" buttons**.

### 5.3 Screen: Export Date-Range Dialog

**Purpose:** Choose the period of audit log rows to include in the CSV export.

#### 5.3.1 UI Elements

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| AL-60 | Dialog Title | Heading (DialogTitle) | `audit.exportDialogTitle` | No | "Export Audit Logs" |
| AL-61 | Start Date Input | Input (date) | `audit.exportStartDate` | Yes | Export range start (prefilled from the list filter) |
| AL-62 | End Date Input | Input (date) | `audit.exportEndDate` | Yes | Export range end (prefilled from the list filter) |
| AL-63 | Range Error Message | Text (alert) | `audit.exportRangeRequired` / `audit.invalidDateRange` / `audit.exportRangeTooLong` | Conditional | Inline validation (missing dates, reversed range, range > 365 days) |
| AL-64 | Export Button | Button (submit) | `audit.exportCsv` | No | Starts the export request (disabled while pending) |
| AL-65 | Cancel Button | Button (outline) | `audit.cancel` | No | Closes the dialog without exporting |

### 5.4 Screen: Manual Delete Confirmation Dialog

**Purpose:** Confirm the deletion of audit log records older than the retention period.

#### 5.4.1 UI Elements

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| AL-70 | Dialog Title | Heading (DialogTitle) | `audit.deleteDialogTitle` | No | "Delete Audit Logs" |
| AL-71 | Warning Alert | Alert (destructive) | `audit.deleteWarningTitle` / `audit.deleteWarning` | No | Warns that deletion is permanent and limited to records >= 90 days |
| AL-72 | Retention Days Input | Input (number) | `audit.retentionDays` | No | Minimum age in days (default 90, min 90) |
| AL-73 | Retention Error Message | Text (alert) | `audit.retentionMin` | Conditional | Shown when the entered retention is below the 90-day minimum |
| AL-74 | Deletion Scope Summary | Text | `audit.deleteScopeSummary` / `audit.deleteScopeSelected` | Yes | Retention-wide wording, or the "selected records" wording when rows are selected |
| AL-75 | API Error Message | Text (alert) | `audit.deleteFailed` | Conditional | Server error message shown inline; the dialog stays open |
| AL-76 | Confirm Delete Button | Button (destructive) | `audit.confirmDelete` | No | Executes the delete request |
| AL-77 | Cancel Button | Button (outline) | `audit.cancel` | No | Closes the dialog without deleting |

---

## 6. Functional Operation Specification

### 6.1 Operation: List Audit Logs

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Navigate to `/admin/audit-logs` |
| **API Endpoint** | `GET /api/v1/admin/audit-logs` |
| **Query Parameters** | `userId` (optional), `action` (optional), `entityType` (optional), `entityId` (optional), `dateFrom` (optional), `dateTo` (optional), `ipAddress` (optional), `search` (optional), `page` (default 1), `limit` (default 50 on the server; the screen sends 10), `sortBy` (default 'created_at'), `sortOrder` (default 'desc') |
| **Processing Steps** | 1. Validate JWT token and admin role. 2. Build query with filters (userId, action, entityType, entityId, date range, ipAddress). Date-only values are expanded to Myanmar Time day boundaries (00:00:00.000 / 23:59:59.999 +06:30). 3. If `search` provided, add LIKE conditions on `action`, `entity_type`, and joined `users.name`/`users.email`. 4. If `ipAddress` provided, add `contains` conditions for the address and its variants. 5. If `action` includes `AUDIT_LOG_DELETE`, also match the legacy `audit.admin.delete` rows. 6. Apply sort (default: `created_at DESC`, with `id` as tie-breaker). 7. Paginate results. 8. For each entry, join with `users` table to get actor name/email/role. 9. Return paginated audit log list **without** `entityId`. |
| **Success Response** | 200 OK with paginated audit log list |

### 6.2 Operation: View Audit Log Detail

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Click the View Detail icon on an audit log row |
| **API Endpoint** | `GET /api/v1/admin/audit-logs/:id` |
| **Processing Steps** | 1. Validate JWT token and admin role. 2. Find audit log entry by ID. 3. Join with `users` table for actor details. 4. Mask sensitive fields in old_value / new_value. 5. Return full audit log DTO with old_value, new_value, ip_address, user_agent — **without** `entityId`. |
| **Success Response** | 200 OK with audit log detail |

### 6.3 Operation: Export Audit Logs (CSV)

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Click "Export CSV" and confirm a date range in the export dialog (blocked with an info toast when the list is empty) |
| **API Endpoint** | `POST /api/v1/admin/audit-logs/export` |
| **Request Body** | `{ userId?: string, action?: string[], entityType?: string[], entityId?: string, dateFrom?: string, dateTo?: string, ipAddress?: string, search?: string, format: 'csv' }` |
| **Processing Steps** | 1. Validate JWT token and admin role. 2. Validate inputs (date range required, max 365 days). 3. Build a read-only query with the same filters as the list endpoint. 4. Check row count — if > 10,000 rows, return 400 with a warning; do not modify audit logs. 5. Generate the CSV content with columns: Timestamp, Actor Name, Actor Email, Actor Role, Action, Entity Type, Old Value, New Value, IP Address, User Agent (no Entity ID column). Timestamps are rendered in Myanmar Time; old/new values are JSON strings with sensitive fields masked. 6. Prefix the file with a UTF-8 BOM and join rows with CRLF. 7. Name the file `audit-logs-{startDate}-{endDate}({today}).csv` (Myanmar dates; falls back to `audit-logs-{today}.csv` without a range). 8. Append an `AUDIT_EXPORT` self-audit event recording the applied filters and the row count. 9. Stream the file to the client as an attachment — **nothing is stored server-side**. |
| **Success Response** | 200 OK with `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="..."` and the CSV body (no download URL) |

### 6.4 Operation: Manual Delete Audit Logs

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Admin clicks the "Delete Audit Logs" button, optionally selects rows in the table, and confirms the retention period |
| **API Endpoint** | `DELETE /api/v1/admin/audit-logs/files` |
| **Request Body** | `{ olderThanDays?: number, recordIds?: string[], fileIds?: string[] }` (`fileIds` is accepted for API-contract compatibility only and is ignored — exports are streamed and no export-file table exists) |
| **Processing Steps** | 1. Validate JWT token and admin role. 2. If `olderThanDays` provided, validate it is >= `AUDIT_LOG_MIN_RETENTION_DAYS` (90). 3. If `recordIds` provided: load the referenced rows, reject the request if any row is missing or younger than the retention threshold (atomic — nothing is deleted), then delete exactly those rows. 4. Otherwise: count the rows older than the threshold, reject when there are none, and delete them in controlled batches. 5. Append an `AUDIT_LOG_DELETE` self-audit event recording `deletedRecords`, `deletedFiles` (always 0), `olderThanDays`, and the selected `recordIds`. 6. Return count of deleted records and files. |
| **Success Response** | 200 OK with `{ deletedRecords: number, deletedFiles: number }` (`deletedFiles` is always `0`) |
| **Error Responses** | 400 if `olderThanDays` < 90; 403 if non-admin; 400 if no eligible records or if a requested record is missing / too young |

### 6.5 Operation: Get Available Filter Options

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Admin opens filter dropdowns |
| **API Endpoint** | `GET /api/v1/admin/audit-logs/filters` |
| **Processing Steps** | 1. Validate JWT token and admin role. 2. Query distinct `action` values from `audit_logs`. 3. Query distinct `entity_type` values from `audit_logs`. 4. Merge both with the audit catalogs (every action / entity type the application can record), sort and de-duplicate the result, and hide the legacy `audit.admin.delete` label from the action list. 5. Return arrays of available filter options. |
| **Success Response** | 200 OK with `{ actions: string[], entityTypes: string[] }` |

---

## 7. Input / Output Specification

### 7.1 Input Specification — List Audit Logs (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `userId` | User Filter (URL only) | ユーザーフィルター（URLのみ） | UUID | No | — (URL query parameter) | `@IsOptional()`, `@IsUUID()` |
| `action` | Action Filter | アクションフィルター | VARCHAR(100)[] | No | Multi-Select | Each `@IsString()`, `@MaxLength(100)` |
| `entityType` | Entity Type Filter | エンティティ種別フィルター | VARCHAR(100)[] | No | Multi-Select | Each `@IsString()`, `@MaxLength(100)` |
| `entityId` | Entity ID Filter (URL only) | エンティティIDフィルター（URLのみ） | UUID | No | — (URL query parameter) | `@IsOptional()`, `@IsUUID()` |
| `dateFrom` | Start Date | 開始日 | DATE | No | Date Picker | `@IsOptional()`, `@IsDateString()` |
| `dateTo` | End Date | 終了日 | DATE | No | Date Picker | `@IsOptional()`, `@IsDateString()`, must be >= dateFrom |
| `ipAddress` | IP Address Filter | IPアドレスフィルター | VARCHAR(45) | No | Input (text) | `@IsOptional()`, `@MaxLength(45)` |
| `search` | Search | 検索 | VARCHAR(255) | No | Input (search) | `@IsOptional()`, `@MaxLength(255)` |
| `page` | Page | ページ | INTEGER | No | — | `@IsOptional()`, `@Min(1)`, default 1 |
| `limit` | Limit | 件数 | INTEGER | No | Select | `@IsOptional()`, `@Min(1)`, `@Max(200)`, default 50 (the screen sends 10) |
| `sortBy` | Sort By | ソート | VARCHAR(50) | No | — | `@IsOptional()`, `@IsIn(['created_at', 'action', 'entity_type'])`, default 'created_at' |
| `sortOrder` | Sort Order | ソート順 | VARCHAR(4) | No | — | `@IsOptional()`, `@IsIn(['asc', 'desc'])`, default 'desc' |

### 7.2 Input Specification — Export Audit Logs (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `userId` | User Filter (URL only) | ユーザーフィルター（URLのみ） | UUID | No | — | `@IsOptional()`, `@IsUUID()` |
| `action` | Action Filter | アクションフィルター | VARCHAR(100)[] | No | — | `@IsOptional()`, each `@IsString()` |
| `entityType` | Entity Type Filter | エンティティ種別フィルター | VARCHAR(100)[] | No | — | `@IsOptional()`, each `@IsString()` |
| `entityId` | Entity ID Filter (URL only) | エンティティIDフィルター（URLのみ） | UUID | No | — | `@IsOptional()`, `@IsUUID()` |
| `dateFrom` | Start Date | 開始日 | DATE | No | Export dialog | `@IsOptional()`, `@IsDateString()` |
| `dateTo` | End Date | 終了日 | DATE | No | Export dialog | `@IsOptional()`, `@IsDateString()`, must be >= dateFrom |
| `ipAddress` | IP Address Filter | IPアドレスフィルター | VARCHAR(45) | No | — | `@IsOptional()`, `@MaxLength(45)` |
| `search` | Search | 検索 | VARCHAR(255) | No | — | `@IsOptional()`, `@MaxLength(255)` |
| `format` | Export Format | エクスポート形式 | ENUM | Yes | — | `@IsIn(['csv'])` |

### 7.3 Output Specification — Audit Log List DTO (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `id` | `audit_logs.id` | UUID string |
| `userId` | `audit_logs.user_id` | UUID string or null |
| `userName` | `users.name` | String (joined) |
| `userEmail` | `users.email` | String (joined) |
| `userRole` | `users.role` | String (joined) |
| `action` | `audit_logs.action` | String |
| `entityType` | `audit_logs.entity_type` | String |
| `summary` | Computed | Auto-generated summary from action + entity_type |
| `ipAddress` | `audit_logs.ip_address` | String or null |
| `createdAt` | `audit_logs.created_at` | ISO 8601 timestamp (rendered in Myanmar Time) |

> `entityId` is intentionally **not** part of the list DTO.

### 7.4 Output Specification — Audit Log Detail DTO (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `id` | `audit_logs.id` | UUID string |
| `userId` | `audit_logs.user_id` | UUID string or null |
| `userName` | `users.name` | String (joined) |
| `userEmail` | `users.email` | String (joined) |
| `userRole` | `users.role` | String (joined) |
| `action` | `audit_logs.action` | String |
| `entityType` | `audit_logs.entity_type` | String |
| `oldValue` | `audit_logs.old_value` | JSON object or null (sensitive fields masked) |
| `newValue` | `audit_logs.new_value` | JSON object or null (sensitive fields masked) |
| `ipAddress` | `audit_logs.ip_address` | String or null |
| `userAgent` | `audit_logs.user_agent` | String or null (parsed client-side for display) |
| `createdAt` | `audit_logs.created_at` | ISO 8601 timestamp (rendered in Myanmar Time) |

> `entityId` is intentionally **not** part of the detail DTO.

### 7.5 Output Specification — Filter Options DTO (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `actions` | Audit action catalog ∪ DISTINCT `audit_logs.action` (legacy `audit.admin.delete` hidden) | String array |
| `entityTypes` | Audit entity type catalog ∪ DISTINCT `audit_logs.entity_type` | String array |

### 7.6 Input Specification — Manual Delete Audit Logs (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `olderThanDays` | Minimum Age (Days) | 最小経過日数 | INTEGER | No | Number input | `@IsOptional()`, `@Min(1)`, default 90; service enforces >= 90 |
| `recordIds` | Record IDs | レコードID配列 | UUID[] | No | Row selection in the table | `@IsOptional()`, each `@IsUUID('4')` |
| `fileIds` | File IDs (compatibility only) | ファイルID配列（互換性のみ） | UUID[] | No | — | `@IsOptional()`, each `@IsUUID('4')`; ignored by the service (no export-file storage exists) |

### 7.7 Output Specification — Manual Delete Result DTO (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `deletedRecords` | Count of deleted audit log records | Integer |
| `deletedFiles` | No export-file storage exists | Always `0` |

---

## 8. Input Validation Rules

### 8.1 List Audit Logs Validation (Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `userId` | Must be valid UUID if provided | "Invalid user ID format" | "無効なユーザーID形式です" |
| `entityId` | Must be valid UUID if provided | "Invalid entity ID format" | "無効なエンティティID形式です" |
| `dateFrom` | Must be valid date if provided | "Invalid start date" | "無効な開始日です" |
| `dateTo` | Must be valid date if provided, >= dateFrom | "End date must be after start date" | "終了日は開始日より後である必要があります" |
| `ipAddress` | Max 45 characters if provided | "IP address too long" | "IPアドレスが長すぎます" |
| `search` | Max 255 characters if provided | "Search query too long" | "検索クエリが長すぎます" |
| `page` | Must be >= 1 | "Page must be at least 1" | "ページは最低1である必要があります" |
| `limit` | Must be 1-200 on the server (the client schema caps it at 100) | "Limit must be between 1 and 200" | "件数は1から200の間である必要があります" |
| `sortBy` | Must be valid sort field | "Invalid sort field" | "無効なソートフィールドです" |
| `sortOrder` | Must be 'asc' or 'desc' | "Sort order must be 'asc' or 'desc'" | "ソート順は'asc'または'desc'である必要があります" |

### 8.2 Export Audit Logs Validation (Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `format` | Required, must be 'csv' | "Export format is required" / "Export format must be CSV" | "エクスポート形式は必須です" / "エクスポート形式はCSVである必要があります" |
| `dateFrom` | Optional, valid date | "Invalid start date" | "無効な開始日です" |
| `dateTo` | Optional, valid date, >= dateFrom | "End date must be after start date" | "終了日は開始日より後である必要があります" |
| Range | Max 365 days | "Date range cannot exceed 365 days" | "日付範囲は365日を超えることはできません" |
| Row Count | Max 10,000 rows | "Export exceeds maximum row limit (10,000). Please narrow your filters." | "エクスポートが最大行制限（10,000）を超えています。フィルターを絞り込んでください。" |
| Operation | Read-only SELECT/file generation; must not delete, archive, purge, or modify audit log records | "CSV export is read-only" | "CSVエクスポートは読み取り専用です" |

### 8.3 Validation Enforcement Layers

1. **Frontend (Client)**: Zod schemas (`auditLogQuerySchema`, `deleteAuditLogsSchema`) with real-time feedback. The screen uses TanStack Query for data fetching; React Hook Form is not used.
2. **Backend (Server)**: NestJS ValidationPipe + class-validator DTOs on all endpoints.
3. **Database (Constraint)**: DB indexes as performance safety net.

### 8.4 Manual Delete Audit Logs Validation (Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `olderThanDays` | Optional, must be >= 90 if provided | "Minimum retention period is 90 days" | "最小保持期間は90日です" |
| `recordIds` | Optional, each must be valid UUID | "Invalid record ID format" | "無効なレコードID形式です" |
| `fileIds` | Optional, each must be valid UUID (accepted but ignored) | "Invalid file ID format" | "無効なファイルID形式です" |
| Age Check | Target records must be >= 90 days old; with `recordIds` every referenced record must exist and be eligible, otherwise the whole request is rejected | "Records younger than 90 days cannot be deleted" / "One or more specified records do not exist." | "90日未満のレコードは削除できません" / "指定されたレコードの一部が存在しません。" |

---

## 9. Error Handling Specification

### 9.1 Error Response Structure

```json
{
  "statusCode": 400,
  "message": ["dateTo must be greater than or equal to dateFrom"],
  "error": "Bad Request",
  "timestamp": "2026-08-25T12:00:00.000Z",
  "path": "/api/v1/admin/audit-logs"
}
```

### 9.2 Error Classification Table — Audit Log Viewing

| HTTP Status | Error Code | Scenario | User-Facing Behavior |
|-------------|------------|----------|---------------------|
| `400` | `BAD_REQUEST` | Invalid filter parameters | "Invalid filter parameters. Please check your input." |
| `400` | `BAD_REQUEST` | dateTo before dateFrom | "End date must be after start date" |
| `400` | `BAD_REQUEST` | Invalid sort field | "Invalid sort field" |
| `403` | `FORBIDDEN` | Non-admin attempting access | "Access denied" |
| `404` | `NOT_FOUND` | Audit log entry not found | "Audit log entry not found" |
| `500` | `INTERNAL_SERVER_ERROR` | Server error | "Something went wrong. Please try again" |

### 9.3 Error Classification Table — Export

| HTTP Status | Error Code | Scenario | User-Facing Behavior |
|-------------|------------|----------|---------------------|
| `400` | `BAD_REQUEST` | Invalid export format | "Export format must be CSV" |
| `400` | `BAD_REQUEST` | Date range exceeds 365 days | "Date range cannot exceed 365 days" |
| `400` | `BAD_REQUEST` | Export exceeds row limit | "Export exceeds maximum row limit (10,000). Please narrow your filters." |
| `400` | `BAD_REQUEST` | Export attempted to perform a write or purge operation | "CSV export is read-only." |
| `500` | `INTERNAL_SERVER_ERROR` | Export generation failed | "Report generation failed. Please try again." |

### 9.4 Error Classification Table — Manual Deletion

| HTTP Status | Error Code | Scenario | User-Facing Behavior |
|-------------|------------|----------|---------------------|
| `400` | `BAD_REQUEST` | `olderThanDays` is less than 90 | "Minimum retention period is 90 days. Records and files younger than 90 days cannot be deleted." |
| `400` | `BAD_REQUEST` | No eligible records found | "No records or files eligible for deletion (must be >= 90 days old)." |
| `400` | `BAD_REQUEST` | A requested `recordIds` entry is missing or too young | "One or more specified records do not exist." / "Records younger than 90 days cannot be deleted." |
| `403` | `FORBIDDEN` | Non-admin attempting deletion | "Access denied" |
| `500` | `INTERNAL_SERVER_ERROR` | Deletion failed | "Deletion failed. Please try again." |

### 9.5 Frontend Error Display Behavior

- **Field-Level Validation**: Inline text below invalid input (date range, retention days, export range).
- **Form-Level Summary**: Error banner above the list (`role="alert"`) for list load / refresh failures; inline messages inside the delete and export dialogs.
- **Toast Notifications**: Used for API errors and successful actions (export success, delete success, empty-export notice).
- **Loading States**: Buttons are disabled and re-labelled while a request is in progress; the table shows skeleton rows while loading.

---

## 10. Permission and Access Control

### 10.1 Authentication Requirements

- JSON Web Token (JWT) Bearer Token passed via `Authorization` header for all endpoints.
- Refresh token stored in httpOnly cookie for session management.

### 10.2 Protected Endpoints (Admin Only)

| Endpoint | Method | Required Role | Description |
|----------|--------|---------------|-------------|
| `/api/v1/admin/audit-logs` | GET | `admin` | List audit logs with filters |
| `/api/v1/admin/audit-logs/:id` | GET | `admin` | View audit log detail |
| `/api/v1/admin/audit-logs/export` | POST | `admin` | Export audit logs as a streamed CSV attachment |
| `/api/v1/admin/audit-logs/files` | DELETE | `admin` | Manually delete audit log records aged >= 90 days (optionally limited to selected `recordIds`) |
| `/api/v1/admin/audit-logs/filters` | GET | `admin` | Get available filter options (catalog ∪ recorded values) |

### 10.3 Role-Based Access

| Role | Can View Audit Logs | Can Export Audit Logs | Can Delete Audit Logs |
|------|:-------------------:|:---------------------:|:---------------------:|
| `buyer` | No | No | No |
| `merchant` | No | No | No |
| `admin` | Yes | Yes | Yes (records >= 90 days only) |

### 10.4 Security Audit Logging

| Event | Data Logged | Retention |
|-------|-------------|-----------|
| `AUDIT_EXPORT` | adminId, applied filters, rowCount, format, timestamp | Governed by admin manual deletion |
| `AUDIT_LOG_DELETE` | adminId, deletedRecordCount, deletedFileCount (always 0), olderThanDays, selected recordIds, timestamp | Governed by admin manual deletion |

---

## 11. Real-Time Notification Behavior

### 11.1 Auto-Refresh Behavior

The Admin Audit Log screen uses authenticated polling rather than WebSocket push. When enabled, the client requests the current filtered list every `AUDIT_LOG_AUTO_REFRESH_INTERVAL` milliseconds (default: 30 seconds).

| Event | Trigger | Client Action | Data Operation |
|-------|---------|---------------|----------------|
| `autoRefreshEnabled` | Admin enables the toggle | Start the configured polling interval | Read-only `GET` request |
| `auditLogRefresh` | Polling interval elapses | Reload the current page and filters | Read-only `SELECT` |
| `newActivityDetected` | Response contains newer records | Update the list and show a non-blocking notification | No audit log mutation |
| `autoRefreshDisabled` | Admin disables the toggle | Stop polling and retain the current list | None |
| `refreshError` | Refresh request fails | Preserve existing data and show an error notification | No audit log mutation |

### 11.2 Refresh and Consistency Rules

- Auto-refresh uses the same filters, sort order, and pagination state currently shown by the administrator.
- Refresh requests are read-only and MUST NOT delete, archive, purge, or update audit log records.
- The client suspends polling while the browser tab is hidden and never refreshes in the background (`refetchIntervalInBackground: false`).
- A failed refresh does not clear existing results; the previous rows are kept and the next scheduled interval may retry.
- Export actions are initiated explicitly by the administrator and are independent of auto-refresh.
- Manual deletion of audit logs is initiated explicitly by the administrator and is independent of auto-refresh and export operations.

---

## 12. Screen Transition Specification

### 12.1 Inbound Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| Admin Dashboard | `/admin/audit-logs` | Click "Audit Log" in nav |
| Admin Dashboard | `/admin/audit-logs` | Click "Recent Activity" shortcut |
| Any Admin Page | `/admin/audit-logs` | Click "View Audit Trail" link on entity detail |

### 12.2 Internal Navigation

| Source | Target | Trigger |
|--------|--------|---------|
| `/admin/audit-logs` | Audit Log Detail Modal | Click the View Detail icon on a log row |
| `/admin/audit-logs` | Export Date-Range Dialog | Click "Export CSV" |
| `/admin/audit-logs` | Manual Delete Confirmation Dialog | Click "Delete Audit Logs" |
| `/admin/audit-logs` | `/unauthorized` | The list request fails with 403 |

> There is no navigation to a user-scoped or entity-scoped audit history, and no link to an entity detail page — `entityId` is not exposed to the client.

### 12.3 Modal Transitions

| Source | Target | Trigger |
|--------|--------|---------|
| Audit Log Detail Modal | Closed | Close / Click outside |

---

## 13. Non-Functional Considerations

### 13.1 Performance Requirements

| Metric | Target |
|--------|--------|
| Audit Log List Page Load | ≤ 2 seconds |
| Filter/Search Response | ≤ 1 second |
| Audit Log Detail Load | ≤ 500 milliseconds |
| CSV Export Generation (≤10,000 rows) | ≤ 5 seconds |
| Auto-Refresh Interval | 30 seconds |

### 13.2 Security Considerations

| Concern | Mitigation |
|---------|------------|
| Admin Bypass | RBAC enforced via JwtAuthGuard + RolesGuard on all endpoints |
| Data Integrity | Audit logs are append-only (no UPDATE in DB); DELETE restricted to admin manual deletion for records >= 90 days only |
| Sensitive Data Exposure | Passwords, tokens, secrets never logged in old_value/new_value |
| Export Data Leakage | Exports exclude sensitive fields, logged to audit |
| SQL Injection | Parameterized queries via Prisma ORM |
| Large Dataset Performance | DB indexes on user_id, action, entity_type, entity_id, created_at |
| Accidental Deletion | Minimum 90-day age requirement enforced; admin must confirm deletion; deletion logged as audit event |

### 13.3 Responsive Design Requirements

| Breakpoint | Layout |
|------------|--------|
| Desktop (≥ 1024px) | Full table layout, 4-column filter card, centered detail modal (max 40rem) |
| Tablet (768px – 1023px) | Two-column filter grid, responsive table with horizontal scroll, centered dialogs |
| Mobile (< 768px) | Single-column filters, scrollable table, full-screen modal and dialogs |

### 13.4 Accessibility Requirements

### 13.5 Background Jobs and Retention

There is no system background auto-deletion job for audit log records. All deletion of DB audit log records is performed exclusively by authorized admins via manual deletion. CSV exports are streamed to the browser and are never stored, so there are no export files to retain or purge.

| Attribute | Specification |
|-----------|---------------|
| **Auto-Purge** | Completely removed. No scheduled background retention purge job exists. |
| **Admin Manual Deletion** | Authorized admins (role: `admin`) can manually delete DB audit log records that are at least 90 days old via `DELETE /api/v1/admin/audit-logs/files`, either retention-wide or limited to explicitly selected rows. |
| **Minimum Age Requirement** | Records younger than 90 days (`< AUDIT_LOG_MIN_RETENTION_DAYS`) cannot be deleted by anyone, including admins. |
| **Export File Retention** | Not applicable — exports are streamed as attachments and no export-file metadata table exists (`deletedFiles` is always 0). |
| **Auditability** | Each admin deletion is logged as an `AUDIT_LOG_DELETE` event for traceability. |

The Admin Audit Log UI exposes a manual delete operation for authorized admins. There is no export-file expiration or deletion path.

| Requirement | Implementation |
|-------------|----------------|
| Keyboard Navigation | All interactive elements focusable via Tab |
| Screen Reader | ARIA labels on buttons, filters, and modals |
| Color Contrast | WCAG 2.1 AA compliant for timestamps and action badges |
| Focus Management | Modal focus trap, return focus on close |

---

## 14. Configurable Items (External Definitions)

Defined via `.env` configuration:

| Definition Key | Default Value | Description |
|----------------|---------------|-------------|
| `AUDIT_LOG_PAGE_SIZE` | `50` (server) / `10` (Admin Audit Log screen) | Default number of entries per page |
| `AUDIT_LOG_MAX_PAGE_SIZE` | `200` (server) / `100` (client schema) | Maximum entries per page |
| `AUDIT_LOG_EXPORT_MAX_ROWS` | `10000` | Maximum rows per CSV export |
| `AUDIT_LOG_EXPORT_MAX_RANGE_DAYS` | `365` | Maximum export date range in days |
| `AUDIT_LOG_AUTO_REFRESH_INTERVAL` | `30000` | Auto-refresh interval in milliseconds (30 seconds) |
| `AUDIT_LOG_MIN_RETENTION_DAYS` | `90` | Minimum age (in days) before audit log records can be manually deleted by an admin. Records younger than this value are protected from deletion. |
| `AUDIT_LOG_PAGE_SIZES` | `10, 20, 50, 100` | Page-size options offered by the Admin Audit Log screen |

---

## 15. Cross-Reference Traceability Matrix

### 15.1 Requirements Definition Traceability

| Requirement ID | Requirement Description | Covered By (This Document) |
|----------------|-------------------------|----------------------------|
| B-ADM-016 | Audit logs record all significant system actions | UC-AUDIT-001~006, BR-AUDIT-010~018 |
| B-ADM-017 | Audit logs track who did what, when, with before/after values | UC-AUDIT-004, Sec 7.4, BR-AUDIT-003~004 |
| B-ADM-018 | Audit logs are filterable by user, action type, entity | UC-AUDIT-002~003, Sec 6.1, BR-AUDIT-020~025 |
| B-ADM-019 | Audit logs are append-only with admin-only manual deletion for records >= 90 days | BR-AUDIT-001, BR-AUDIT-041 |
| B-ADM-020 | Only admins can view audit logs | UC-AUDIT-001~006, Sec 10, BR-AUDIT-040 |
| B-ADM-021 | Audit log data excludes sensitive fields | BR-AUDIT-002, BR-AUDIT-043 |

### 15.2 Database Design Traceability

| Database Table | Relevant Functional Operations |
|----------------|-------------------------------|
| `audit_logs` | List Logs (SELECT), View Detail (SELECT), Export (SELECT), Manual Delete (DELETE) |
| `users` | Join for actor info (JOIN) |

### 15.3 Related Document References

| Document ID | Document Name | File Path |
|-------------|---------------|-----------|
| SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` |
| SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` |
| SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` |

---

*End of Functional Specification (Admin Audit Log Screen)*
