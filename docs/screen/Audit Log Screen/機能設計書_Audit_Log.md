# Functional Specification (機能設計書) — Admin Audit Log Screen

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-FDS-AUDIT-001 |
| **Target Screen** | Admin Audit Log (管理者監査ログ) — Audit Trail Viewing, Filtering, and Export |
| **Subsystem** | Audit Logging — Admin Audit Trail, Change Tracking, Security Monitoring |
| **Function ID** | FN-AUDIT-001 |
| **Version** | 1.0 |
| **Created** | 2026-08-25 |
| **Last Updated** | 2026-08-25 |
| **Author** | Software Architect |
| **Status** | Released (承認済み) |
| **Classification** | Internal — Engineering Division |

---

## Document Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-08-25 | Software Architect | Initial functional specification for Admin Audit Log Screen: audit trail viewing, filtering, detail inspection, and CSV export. |

---

## Table of Contents

1. [Functional Overview](#1-functional-overview)
2. [Use Cases and Business Workflow](#2-use-cases-and-business-workflow)
3. [Business Rules](#3-business-rules)
4. [Screen Specifications](#4-screen-specifications)
5. [Functional Operation Specification](#5-functional-operation-specification)
6. [Input / Output Specification](#6-input--output-specification)
7. [Input Validation Rules](#7-input-validation-rules)
8. [Error Handling Specification](#8-error-handling-specification)
9. [Permission and Access Control](#9-permission-and-access-control)
10. [Screen Transition Specification](#10-screen-transition-specification)
11. [Non-Functional Considerations](#11-non-functional-considerations)
12. [Configurable Items (External Definitions)](#12-configurable-items-external-definitions)
13. [Cross-Reference Traceability Matrix](#13-cross-reference-traceability-matrix)

---

## 1. Functional Overview

### 1.1 Purpose and Scope

This screen subsystem provides platform administrators with full visibility into all significant system actions performed within the Cosmetics Finder platform. It serves as the central audit trail for security monitoring, compliance, and operational accountability.

The audit log captures every meaningful action across the platform — user authentication events, merchant approvals, product changes, advertisement lifecycle events, order status transitions, commission rate changes, payout processing, and administrative actions. Each log entry records who performed the action, what was changed (with before/after values), when it occurred, and from where (IP address, user agent).

This document defines every screen, operation, business rule, and API endpoint that the Admin interacts with to view, filter, search, and export audit log data.

### 1.2 Functional Responsibilities

1. **Audit Trail Viewing** — Displaying all audit log entries in a sortable, paginated table with timestamp, actor, action type, entity, and summary information.
2. **Advanced Filtering** — Filtering audit logs by user, action type, entity type, date range, and IP address to quickly locate specific events.
3. **Log Detail Inspection** — Viewing full details of individual audit log entries including old/new values (JSON diff), user agent, and IP address.
4. **Search** — Full-text search across action names, entity types, and user information.
5. **CSV Export** — Exporting filtered audit log data in CSV format for external analysis and compliance reporting.
6. **Real-Time Monitoring** — Auto-refresh capability to monitor recent system activity in near real-time.

### 1.3 Target Users

| Attribute | Value |
|-----------|-------|
| **Primary Actor** | Platform Administrator |
| **Required Authentication** | JWT Bearer Token (`admin` role) |
| **Data Scope** | All platform audit log entries (append-only). |

### 1.4 Relationships with Other Functions and Peripheral Systems

```text
┌──────────────────────────┐      ┌─────────────────────────────────────┐
│   Admin Actor            │      │         audit_logs                  │
│ (Views, Filters,        ├─────►│  Reads log entries                  │
│  Exports Audit Logs)    │      │  Append-only (no write from UI)     │
└──────────────────────────┘      └──────────────┬────────────────────┘
                                                 │
                                      ┌──────────┴─────────────┐
                                      │                        │
                                      ▼                        ▼
                          ┌──────────────────┐    ┌────────────────────────┐
                          │ users            │    │  Export Engine         │
                          │ (actor info)     │    │  (CSV)                 │
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
| `user_id` | Admin Input | Filter by specific user UUID |
| `action` | Admin Input | Filter by action type (e.g., merchant.approve, order.status_change) |
| `entity_type` | Admin Input | Filter by entity type (e.g., Merchant, Order, Product) |
| `entity_id` | Admin Input | Filter by specific entity UUID |
| `date_from` | Admin Input | Filter start date |
| `date_to` | Admin Input | Filter end date |
| `ip_address` | Admin Input | Filter by IP address |
| `search` | Admin Input | Free-text search across action, entity type, user name |
| `page` | Admin Input | Pagination page number |
| `limit` | Admin Input | Items per page |
| `sort_by` | Admin Input | Sort field (created_at, action, entity_type) |
| `sort_order` | Admin Input | Sort direction (asc, desc) |
| `export_format` | Admin Input | Export format: csv |

| Output Information | Data Category | Destination / Description |
|--------------------|---------------|---------------------------|
| `audit_logs` | Audit Log List | Paginated list of audit log entries |
| `audit_log_detail` | Audit Log DTO | Full audit log entry with old/new values |
| `export_file` | File | Generated CSV report |

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
| UC-AUDIT-001 | View Audit Log List | Admin is authenticated. | Paginated list of all audit log entries displayed with default sort (newest first). | Admin |
| UC-AUDIT-002 | Filter Audit Logs | Admin is viewing audit log list. | Filtered audit log list displayed matching filter criteria. | Admin |
| UC-AUDIT-003 | Search Audit Logs | Admin is viewing audit log list. | Search results displayed matching search query across action, entity, user. | Admin |
| UC-AUDIT-004 | View Audit Log Detail | Admin selected a specific audit log entry. | Full log detail displayed including old/new values, IP, user agent. | Admin |
| UC-AUDIT-005 | Export Audit Logs (CSV) | Admin has applied filters to audit log list. | CSV file generated containing filtered audit log entries. | Admin |
| UC-AUDIT-006 | View User Audit History | Admin wants to see all actions by a specific user. | Audit log list filtered to show only entries for the selected user. | Admin |
| UC-AUDIT-007 | View Entity Audit History | Admin wants to see all changes to a specific entity. | Audit log list filtered to show only entries for the selected entity type and ID. | Admin |

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
│   50 per page)               │
└──────────┬───────────────────┘
           │
     ┌─────┴──────────────────┐
     │                        │
     ▼                        ▼
┌──────────────┐    ┌──────────────────────┐
│ Apply Filters│    │ Click Log Entry      │
│ (User, Action│    │ (View Detail)        │
│  Entity, Date│    └──────────┬───────────┘
│  IP, Search) │               │
└──────┬───────┘               ▼
       │              ┌──────────────────┐
       ▼              │  Log Detail      │
┌──────────────┐      │  Modal/Page      │
│ Filtered     │      │  - Timestamp     │
│ Results      │      │  - Actor (User)  │
│ (Updated     │      │  - Action        │
│  List)       │      │  - Entity        │
└──────┬───────┘      │  - Old Value     │
       │              │  - New Value     │
       ▼              │  - IP Address    │
┌──────────────┐      │  - User Agent    │
│ Export CSV   │      └──────────────────┘
│ (Filtered)   │
└──────────────┘
```

### 2.3 Workflow Critical Path Summary

| Step | Action | Status Before | Status After | Assigned To |
|:----:|--------|---------------|--------------|-------------|
| 1 | Admin navigates to Audit Log | — | — | Admin |
| 2 | System loads audit log list (newest first, paginated) | — | List displayed | System |
| 3a | **Filter path:** Admin applies filters (user, action, entity, date, IP) | — | Filtered list displayed | Admin |
| 3b | **Search path:** Admin enters search query | — | Search results displayed | Admin |
| 3c | **Detail path:** Admin clicks a log entry | — | Detail modal/page displayed | Admin |
| 4 | Admin clicks "Export CSV" with current filters | — | CSV file generated and downloaded | System |
| 5 | Admin optionally clicks "User Audit History" link on a log entry | — | List filtered by that user | Admin |
| 6 | Admin optionally clicks "Entity Audit History" link on a log entry | — | List filtered by that entity | Admin |

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

## 3. Business Rules

### 3.1 Audit Log Data Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AUDIT-001 | Append-Only | Audit logs are append-only. No UPDATE or DELETE operations are permitted on `audit_logs` table. | Backend (DB constraint + service) |
| BR-AUDIT-002 | No Sensitive Data | Audit logs must never contain passwords, access tokens, refresh tokens, or authentication secrets in old_value or new_value fields. | Backend (service logic) |
| BR-AUDIT-003 | Actor Identification | Each log entry must record the `user_id` of the actor. System-generated actions may have `user_id = NULL`. | Backend (service logic) |
| BR-AUDIT-004 | Timestamp Accuracy | Each log entry must record `created_at` as the exact UTC timestamp of the action. | Backend (DB default) |
| BR-AUDIT-005 | IP Address Capture | When available, the client IP address must be captured in `ip_address` field. | Backend (interceptor) |
| BR-AUDIT-006 | User Agent Capture | When available, the client user agent must be captured in `user_agent` field. | Backend (interceptor) |

### 3.2 Audit Event Coverage Rules

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

### 3.3 Viewing and Filtering Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AUDIT-020 | Default Sort | Audit log list defaults to sorting by `created_at DESC` (newest first). | Backend (query default) |
| BR-AUDIT-021 | Default Page Size | Default page size is 50 entries per page. | Backend (pagination default) |
| BR-AUDIT-022 | Maximum Page Size | Maximum page size is 200 entries per page. | Backend (validation) |
| BR-AUDIT-023 | Date Range Filter | Date range filter is optional. When provided, both date_from and date_to are required. | Backend (DTO validation) |
| BR-AUDIT-024 | Combined Filters | Multiple filters can be combined (AND logic). | Backend (query builder) |
| BR-AUDIT-025 | Search Scope | Free-text search matches against `action`, `entity_type`, and joined `users.name` / `users.email`. | Backend (query logic) |

### 3.4 Export Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AUDIT-030 | Export Format | Audit log export format is restricted to CSV only. | Backend (DTO validation) |
| BR-AUDIT-031 | Export Applies Current Filters | Export generates data using the same filters currently applied to the list view. | Backend (query reuse) |
| BR-AUDIT-032 | Export Date Range Limit | Maximum export date range is 365 days. | Backend (validation) |
| BR-AUDIT-033 | Export Row Limit | Maximum 10,000 rows per export. If filtered results exceed this limit, admin is notified. | Backend (validation) |
| BR-AUDIT-034 | Export Audit | Export actions themselves are logged to audit_logs with action `audit.export`. | Backend (service logic) |

### 3.5 Security Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AUDIT-040 | RBAC Enforcement | All audit log endpoints require `admin` role via JwtAuthGuard + RolesGuard. | Backend (NestJS guards) |
| BR-AUDIT-041 | No Bulk Delete | Audit logs cannot be deleted or purged via the API. | Backend (no delete endpoints) |
| BR-AUDIT-042 | No Modification | Audit logs cannot be modified via the API. | Backend (no update endpoints) |
| BR-AUDIT-043 | Export Data Sanitization | Exported data must not include sensitive fields. | Backend (export service) |

---

## 4. Screen Specifications

### 4.1 Screen: Admin Audit Log List (`/admin/audit-logs`)

**Purpose:** Display all audit log entries in a sortable, filterable, paginated table.

#### 4.1.1 UI Elements

**Page Header:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| AL-01 | Page Title | Heading (h1) | `audit.title` | No | "Audit Log" |
| AL-02 | Back to Dashboard Button | Button (text) | `audit.backToDashboard` | No | Return to Admin Dashboard |
| AL-03 | Auto-Refresh Toggle | Switch | `audit.autoRefresh` | No | Enable/disable auto-refresh every 30 seconds |
| AL-04 | Export CSV Button | Button (secondary) | `audit.exportCsv` | No | Export filtered audit logs as CSV |

**Audit Log Table:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| AL-10 | Timestamp Column | Table Column | `audit.timestamp` | Yes | When the action occurred (sortable) |
| AL-11 | Actor Column | Table Column | `audit.actor` | Yes | User name and email (sortable) |
| AL-12 | Action Column | Table Column | `audit.action` | Yes | Action performed (sortable, filterable) |
| AL-13 | Entity Type Column | Table Column | `audit.entityType` | Yes | Entity type affected (sortable, filterable) |
| AL-14 | Entity ID Column | Table Column | `audit.entityId` | Yes | Entity ID (clickable link to entity) |
| AL-15 | Summary Column | Table Column | `audit.summary` | Yes | Brief summary of what changed |
| AL-16 | IP Address Column | Table Column | `audit.ipAddress` | Yes | Client IP address |
| AL-17 | Actions Column | Table Column | `audit.actions` | Yes | "View Detail" button |
| AL-18 | Empty State | Empty State | `audit.noLogs` | No | "No audit log entries found." |

**Filters:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| AL-20 | User Filter | Input (search) | `audit.filterByUser` | No | Search by user name or email |
| AL-21 | Action Filter | Select (multi) | `audit.filterByAction` | No | Filter by action type |
| AL-22 | Entity Type Filter | Select (multi) | `audit.filterByEntityType` | No | Filter by entity type |
| AL-23 | Date Range Filter | Date Range Picker | `audit.filterByDate` | No | Filter by date range |
| AL-24 | IP Address Filter | Input (text) | `audit.filterByIp` | No | Filter by IP address |
| AL-25 | Search Input | Input (search) | `audit.search` | No | Free-text search across action, entity, user |
| AL-26 | Clear Filters Button | Button (text) | `audit.clearFilters` | No | Reset all filters |
| AL-27 | Active Filters Badge | Badge | `audit.activeFilters` | No | Shows count of active filters |

**Pagination:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| AL-30 | Page Info Text | Text | `audit.pageInfo` | Yes | "Showing {start}-{end} of {total}" |
| AL-31 | Previous Button | Button (secondary) | `audit.previous` | No | Previous page |
| AL-32 | Page Number Buttons | Button Group | `audit.pageNumbers` | No | Page number navigation |
| AL-33 | Next Button | Button (secondary) | `audit.next` | No | Next page |
| AL-34 | Page Size Select | Select | `audit.pageSize` | No | Items per page: 25, 50, 100, 200 |

### 4.2 Screen: Audit Log Detail Modal

**Purpose:** Display full details of a single audit log entry including old/new values.

#### 4.2.1 UI Elements

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| AL-40 | Modal Title | Heading (h3) | `audit.logDetail` | No | "Audit Log Detail" |
| AL-41 | Timestamp | Text | `audit.timestamp` | Yes | Full UTC timestamp |
| AL-42 | Actor Name | Text | `audit.actorName` | Yes | User who performed the action |
| AL-43 | Actor Email | Text | `audit.actorEmail` | Yes | Actor email address |
| AL-44 | Actor Role | Badge | `audit.actorRole` | Yes | Actor role (admin, merchant, buyer) |
| AL-45 | Action | Text | `audit.action` | Yes | Action performed (e.g., merchant.approve) |
| AL-46 | Entity Type | Text | `audit.entityType` | Yes | Entity type affected |
| AL-47 | Entity ID | Text (clickable) | `audit.entityId` | Yes | Entity ID (link to entity detail) |
| AL-48 | Old Value | Code Block (JSON) | `audit.oldValue` | Conditional | Previous state (JSON, shown for updates) |
| AL-49 | New Value | Code Block (JSON) | `audit.newValue` | Conditional | New state (JSON, shown for creates/updates) |
| AL-50 | IP Address | Text | `audit.ipAddress` | Yes | Client IP address |
| AL-51 | User Agent | Text (truncated) | `audit.userAgent` | Yes | Client user agent string |
| AL-52 | Close Button | Button (secondary) | `audit.close` | No | Close modal |
| AL-53 | View User History Button | Button (text) | `audit.viewUserHistory` | No | Navigate to audit log filtered by this user |
| AL-54 | View Entity History Button | Button (text) | `audit.viewEntityHistory` | No | Navigate to audit log filtered by this entity |

---

## 5. Functional Operation Specification

### 5.1 Operation: List Audit Logs

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Navigate to `/admin/audit-logs` |
| **API Endpoint** | `GET /api/v1/admin/audit-logs` |
| **Query Parameters** | `userId` (optional), `action` (optional), `entityType` (optional), `entityId` (optional), `dateFrom` (optional), `dateTo` (optional), `ipAddress` (optional), `search` (optional), `page` (default 1), `limit` (default 50), `sortBy` (default 'created_at'), `sortOrder` (default 'desc') |
| **Processing Steps** | 1. Validate JWT token and admin role. 2. Build query with filters (userId, action, entityType, entityId, date range, ipAddress). 3. If `search` provided, add LIKE conditions on `action`, `entity_type`, and joined `users.name`/`users.email`. 4. Apply sort (default: `created_at DESC`). 5. Paginate results. 6. For each entry, join with `users` table to get actor name/email. 7. Return paginated audit log list. |
| **Success Response** | 200 OK with paginated audit log list |

### 5.2 Operation: View Audit Log Detail

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Click "View Detail" on audit log row |
| **API Endpoint** | `GET /api/v1/admin/audit-logs/:id` |
| **Processing Steps** | 1. Validate JWT token and admin role. 2. Find audit log entry by ID. 3. Join with `users` table for actor details. 4. Return full audit log DTO with old_value, new_value, ip_address, user_agent. |
| **Success Response** | 200 OK with audit log detail |

### 5.3 Operation: Export Audit Logs (CSV)

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Click "Export CSV" button |
| **API Endpoint** | `POST /api/v1/admin/audit-logs/export` |
| **Request Body** | `{ userId?: string, action?: string, entityType?: string, entityId?: string, dateFrom?: string, dateTo?: string, ipAddress?: string, search?: string, format: 'csv' }` |
| **Processing Steps** | 1. Validate JWT token and admin role. 2. Validate inputs (date range max 365 days). 3. Build query with same filters as list endpoint. 4. Check row count — if > 10,000 rows, return 400 with warning. 5. Generate CSV file with columns: Timestamp, Actor Name, Actor Email, Actor Role, Action, Entity Type, Entity ID, Old Value, New Value, IP Address, User Agent. 6. Store file in export storage with 24-hour TTL. 7. Log EXPORT_GENERATED event to audit_logs with action `audit.export`. 8. Return download URL. |
| **Success Response** | 200 OK with `{ downloadUrl: string }` |

### 5.4 Operation: Get Available Filter Options

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Admin opens filter dropdowns |
| **API Endpoint** | `GET /api/v1/admin/audit-logs/filters` |
| **Processing Steps** | 1. Validate JWT token and admin role. 2. Query distinct `action` values from `audit_logs`. 3. Query distinct `entity_type` values from `audit_logs`. 4. Return arrays of available filter options. |
| **Success Response** | 200 OK with `{ actions: string[], entityTypes: string[] }` |

---

## 6. Input / Output Specification

### 6.1 Input Specification — List Audit Logs (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `userId` | User Filter | ユーザーフィルター | UUID | No | Input (search) | `@IsOptional()`, `@IsUUID()` |
| `action` | Action Filter | アクションフィルター | VARCHAR(100)[] | No | Multi-Select | Each `@IsString()` |
| `entityType` | Entity Type Filter | エンティティ種別フィルター | VARCHAR(100)[] | No | Multi-Select | Each `@IsString()` |
| `entityId` | Entity ID Filter | エンティティIDフィルター | UUID | No | Input (search) | `@IsOptional()`, `@IsUUID()` |
| `dateFrom` | Start Date | 開始日 | DATE | No | Date Picker | `@IsOptional()`, `@IsDate()` |
| `dateTo` | End Date | 終了日 | DATE | No | Date Picker | `@IsOptional()`, `@IsDate()`, must be >= dateFrom |
| `ipAddress` | IP Address Filter | IPアドレスフィルター | VARCHAR(45) | No | Input (text) | `@IsOptional()`, `@MaxLength(45)` |
| `search` | Search | 検索 | VARCHAR(255) | No | Input (search) | `@IsOptional()`, `@MaxLength(255)` |
| `page` | Page | ページ | INTEGER | No | — | `@IsOptional()`, `@Min(1)`, default 1 |
| `limit` | Limit | 件数 | INTEGER | No | Select | `@IsOptional()`, `@Min(1)`, `@Max(200)`, default 50 |
| `sortBy` | Sort By | ソート | VARCHAR(50) | No | — | `@IsOptional()`, `@IsIn(['created_at', 'action', 'entity_type'])`, default 'created_at' |
| `sortOrder` | Sort Order | ソート順 | VARCHAR(4) | No | — | `@IsOptional()`, `@IsIn(['asc', 'desc'])`, default 'desc' |

### 6.2 Input Specification — Export Audit Logs (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `userId` | User Filter | ユーザーフィルター | UUID | No | — | `@IsOptional()`, `@IsUUID()` |
| `action` | Action Filter | アクションフィルター | VARCHAR(100) | No | — | `@IsOptional()`, `@IsString()` |
| `entityType` | Entity Type Filter | エンティティ種別フィルター | VARCHAR(100) | No | — | `@IsOptional()`, `@IsString()` |
| `entityId` | Entity ID Filter | エンティティIDフィルター | UUID | No | — | `@IsOptional()`, `@IsUUID()` |
| `dateFrom` | Start Date | 開始日 | DATE | No | — | `@IsOptional()`, `@IsDate()` |
| `dateTo` | End Date | 終了日 | DATE | No | — | `@IsOptional()`, `@IsDate()`, must be >= dateFrom |
| `ipAddress` | IP Address Filter | IPアドレスフィルター | VARCHAR(45) | No | — | `@IsOptional()`, `@MaxLength(45)` |
| `search` | Search | 検索 | VARCHAR(255) | No | — | `@IsOptional()`, `@MaxLength(255)` |
| `format` | Export Format | エクスポート形式 | ENUM | Yes | — | `@IsIn(['csv'])` |

### 6.3 Output Specification — Audit Log List DTO (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `id` | `audit_logs.id` | UUID string |
| `userId` | `audit_logs.user_id` | UUID string or null |
| `userName` | `users.name` | String (joined) |
| `userEmail` | `users.email` | String (joined) |
| `userRole` | `users.role` | String (joined) |
| `action` | `audit_logs.action` | String |
| `entityType` | `audit_logs.entity_type` | String |
| `entityId` | `audit_logs.entity_id` | UUID string or null |
| `summary` | Computed | Auto-generated summary from action + entity_type |
| `ipAddress` | `audit_logs.ip_address` | String or null |
| `createdAt` | `audit_logs.created_at` | ISO 8601 timestamp |

### 6.4 Output Specification — Audit Log Detail DTO (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `id` | `audit_logs.id` | UUID string |
| `userId` | `audit_logs.user_id` | UUID string or null |
| `userName` | `users.name` | String (joined) |
| `userEmail` | `users.email` | String (joined) |
| `userRole` | `users.role` | String (joined) |
| `action` | `audit_logs.action` | String |
| `entityType` | `audit_logs.entity_type` | String |
| `entityId` | `audit_logs.entity_id` | UUID string or null |
| `oldValue` | `audit_logs.old_value` | JSON object or null |
| `newValue` | `audit_logs.new_value` | JSON object or null |
| `ipAddress` | `audit_logs.ip_address` | String or null |
| `userAgent` | `audit_logs.user_agent` | String or null |
| `createdAt` | `audit_logs.created_at` | ISO 8601 timestamp |

### 6.5 Output Specification — Filter Options DTO (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `actions` | DISTINCT `audit_logs.action` | String array |
| `entityTypes` | DISTINCT `audit_logs.entity_type` | String array |

---

## 7. Input Validation Rules

### 7.1 List Audit Logs Validation (Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `userId` | Must be valid UUID if provided | "Invalid user ID format" | "無効なユーザーID形式です" |
| `entityId` | Must be valid UUID if provided | "Invalid entity ID format" | "無効なエンティティID形式です" |
| `dateFrom` | Must be valid date if provided | "Invalid start date" | "無効な開始日です" |
| `dateTo` | Must be valid date if provided, >= dateFrom | "End date must be after start date" | "終了日は開始日より後である必要があります" |
| `ipAddress` | Max 45 characters if provided | "IP address too long" | "IPアドレスが長すぎます" |
| `search` | Max 255 characters if provided | "Search query too long" | "検索クエリが長すぎます" |
| `page` | Must be >= 1 | "Page must be at least 1" | "ページは最低1である必要があります" |
| `limit` | Must be 1-200 | "Limit must be between 1 and 200" | "件数は1から200の間である必要があります" |
| `sortBy` | Must be valid sort field | "Invalid sort field" | "無効なソートフィールドです" |
| `sortOrder` | Must be 'asc' or 'desc' | "Sort order must be 'asc' or 'desc'" | "ソート順は'asc'または'desc'である必要があります" |

### 7.2 Export Audit Logs Validation (Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `format` | Required, must be 'csv' | "Export format is required" / "Export format must be CSV" | "エクスポート形式は必須です" / "エクスポート形式はCSVである必要があります" |
| `dateFrom` | Optional, valid date | "Invalid start date" | "無効な開始日です" |
| `dateTo` | Optional, valid date, >= dateFrom | "End date must be after start date" | "終了日は開始日より後である必要があります" |
| Range | Max 365 days | "Date range cannot exceed 365 days" | "日付範囲は365日を超えることはできません" |
| Row Count | Max 10,000 rows | "Export exceeds maximum row limit (10,000). Please narrow your filters." | "エクスポートが最大行制限（10,000）を超えています。フィルターを絞り込んでください。" |

### 7.3 Validation Enforcement Layers

1. **Frontend (Client)**: React Hook Form + Zod schema validation with real-time feedback.
2. **Backend (Server)**: NestJS ValidationPipe + class-validator DTOs on all endpoints.
3. **Database (Constraint)**: DB indexes as performance safety net.

---

## 8. Error Handling Specification

### 8.1 Error Response Structure

```json
{
  "statusCode": 400,
  "message": ["dateTo must be greater than or equal to dateFrom"],
  "error": "Bad Request",
  "timestamp": "2026-08-25T12:00:00.000Z",
  "path": "/api/v1/admin/audit-logs"
}
```

### 8.2 Error Classification Table — Audit Log Viewing

| HTTP Status | Error Code | Scenario | User-Facing Behavior |
|-------------|------------|----------|---------------------|
| `400` | `BAD_REQUEST` | Invalid filter parameters | "Invalid filter parameters. Please check your input." |
| `400` | `BAD_REQUEST` | dateTo before dateFrom | "End date must be after start date" |
| `400` | `BAD_REQUEST` | Invalid sort field | "Invalid sort field" |
| `403` | `FORBIDDEN` | Non-admin attempting access | "Access denied" |
| `404` | `NOT_FOUND` | Audit log entry not found | "Audit log entry not found" |
| `500` | `INTERNAL_SERVER_ERROR` | Server error | "Something went wrong. Please try again" |

### 8.3 Error Classification Table — Export

| HTTP Status | Error Code | Scenario | User-Facing Behavior |
|-------------|------------|----------|---------------------|
| `400` | `BAD_REQUEST` | Invalid export format | "Export format must be CSV" |
| `400` | `BAD_REQUEST` | Date range exceeds 365 days | "Date range cannot exceed 365 days" |
| `400` | `BAD_REQUEST` | Export exceeds row limit | "Export exceeds maximum row limit (10,000). Please narrow your filters." |
| `500` | `INTERNAL_SERVER_ERROR` | Export generation failed | "Report generation failed. Please try again." |

### 8.4 Frontend Error Display Behavior

- **Field-Level Validation**: Red border and inline text below invalid input.
- **Form-Level Summary**: Alert banner at top of form listing all errors.
- **Toast Notifications**: Used for API errors and successful actions.
- **Loading States**: Spinner on submit buttons during API calls.

---

## 9. Permission and Access Control

### 9.1 Authentication Requirements

- JSON Web Token (JWT) Bearer Token passed via `Authorization` header for all endpoints.
- Refresh token stored in httpOnly cookie for session management.

### 9.2 Protected Endpoints (Admin Only)

| Endpoint | Method | Required Role | Description |
|----------|--------|---------------|-------------|
| `/api/v1/admin/audit-logs` | GET | `admin` | List audit logs with filters |
| `/api/v1/admin/audit-logs/:id` | GET | `admin` | View audit log detail |
| `/api/v1/admin/audit-logs/export` | POST | `admin` | Export audit logs as CSV |
| `/api/v1/admin/audit-logs/filters` | GET | `admin` | Get available filter options |

### 9.3 Role-Based Access

| Role | Can View Audit Logs | Can Export Audit Logs |
|------|:-------------------:|:---------------------:|
| `buyer` | No | No |
| `merchant` | No | No |
| `admin` | Yes | Yes |

### 9.4 Security Audit Logging

| Event | Data Logged | Retention |
|-------|-------------|-----------|
| `AUDIT_VIEWED` | adminId, filters, resultCount, timestamp | 1 year |
| `AUDIT_EXPORTED` | adminId, filters, rowCount, format, timestamp | 1 year |

---

## 10. Screen Transition Specification

### 10.1 Inbound Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| Admin Dashboard | `/admin/audit-logs` | Click "Audit Log" in nav |
| Admin Dashboard | `/admin/audit-logs` | Click "Recent Activity" shortcut |
| Any Admin Page | `/admin/audit-logs` | Click "View Audit Trail" link on entity detail |

### 10.2 Internal Navigation

| Source | Target | Trigger |
|--------|--------|---------|
| `/admin/audit-logs` | Audit Log Detail Modal | Click "View Detail" on log row |
| `/admin/audit-logs` | `/admin/audit-logs?userId=...` | Click "View User History" on log detail |
| `/admin/audit-logs` | `/admin/audit-logs?entityType=...&entityId=...` | Click "View Entity History" on log detail |
| `/admin/audit-logs` | Entity Detail Page | Click entity ID link on log row |

### 10.3 Modal Transitions

| Source | Target | Trigger |
|--------|--------|---------|
| Audit Log Detail Modal | Closed | Close / Click outside |

---

## 11. Non-Functional Considerations

### 11.1 Performance Requirements

| Metric | Target |
|--------|--------|
| Audit Log List Page Load | ≤ 2 seconds |
| Filter/Search Response | ≤ 1 second |
| Audit Log Detail Load | ≤ 500 milliseconds |
| CSV Export Generation (≤10,000 rows) | ≤ 5 seconds |
| Auto-Refresh Interval | 30 seconds |

### 11.2 Security Considerations

| Concern | Mitigation |
|---------|------------|
| Admin Bypass | RBAC enforced via JwtAuthGuard + RolesGuard on all endpoints |
| Data Integrity | Audit logs are append-only (no UPDATE/DELETE in DB) |
| Sensitive Data Exposure | Passwords, tokens, secrets never logged in old_value/new_value |
| Export Data Leakage | Exports exclude sensitive fields, logged to audit |
| SQL Injection | Parameterized queries via Prisma ORM |
| Large Dataset Performance | DB indexes on user_id, action, entity_type, entity_id, created_at |

### 11.3 Responsive Design Requirements

| Breakpoint | Layout |
|------------|--------|
| Desktop (≥ 1024px) | Full table layout, sidebar filters |
| Tablet (768px – 1023px) | Stacked filters, responsive table |
| Mobile (< 768px) | Card-based log list, full-width modals |

### 11.4 Accessibility Requirements

| Requirement | Implementation |
|-------------|----------------|
| Keyboard Navigation | All interactive elements focusable via Tab |
| Screen Reader | ARIA labels on buttons, filters, and modals |
| Color Contrast | WCAG 2.1 AA compliant for timestamps and action badges |
| Focus Management | Modal focus trap, return focus on close |

---

## 12. Configurable Items (External Definitions)

Defined via `.env` configuration:

| Definition Key | Default Value | Description |
|----------------|---------------|-------------|
| `AUDIT_LOG_PAGE_SIZE` | `50` | Default number of entries per page |
| `AUDIT_LOG_MAX_PAGE_SIZE` | `200` | Maximum entries per page |
| `AUDIT_LOG_EXPORT_MAX_ROWS` | `10000` | Maximum rows per CSV export |
| `AUDIT_LOG_EXPORT_RETENTION_HOURS` | `24` | Hours before generated export files are deleted |
| `AUDIT_LOG_AUTO_REFRESH_INTERVAL` | `30000` | Auto-refresh interval in milliseconds |
| `AUDIT_LOG_RETENTION_DAYS` | `730` | Days to retain audit logs (default: 2 years) |

---

## 13. Cross-Reference Traceability Matrix

### 13.1 Requirements Definition Traceability

| Requirement ID | Requirement Description | Covered By (This Document) |
|----------------|-------------------------|----------------------------|
| B-ADM-016 | Audit logs record all significant system actions | UC-AUDIT-001~007, BR-AUDIT-010~018 |
| B-ADM-017 | Audit logs track who did what, when, with before/after values | UC-AUDIT-004, Sec 6.4, BR-AUDIT-003~004 |
| B-ADM-018 | Audit logs are filterable by user, action type, entity | UC-AUDIT-002~003, Sec 5.1, BR-AUDIT-020~025 |
| B-ADM-019 | Audit logs are append-only (no UPDATE or DELETE) | BR-AUDIT-001, BR-AUDIT-041~042 |
| B-ADM-020 | Only admins can view audit logs | UC-AUDIT-001~007, Sec 9, BR-AUDIT-040 |
| B-ADM-021 | Audit log data excludes sensitive fields | BR-AUDIT-002, BR-AUDIT-043 |

### 13.2 Database Design Traceability

| Database Table | Relevant Functional Operations |
|----------------|-------------------------------|
| `audit_logs` | List Logs (SELECT), View Detail (SELECT), Export (SELECT) |
| `users` | Join for actor info (JOIN) |

### 13.3 Related Document References

| Document ID | Document Name | File Path |
|-------------|---------------|-----------|
| SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` |
| SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` |
| SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` |

---

*End of Functional Specification (Admin Audit Log Screen)*
