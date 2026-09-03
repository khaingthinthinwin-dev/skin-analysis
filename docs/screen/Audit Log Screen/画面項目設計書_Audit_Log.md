# Screen Items Specification (画面項目設計書) — Admin Audit Log Screen

**Document ID:** SKM-SIS-SCR-AUDIT-001  
**Target Screen:** Admin Audit Log (管理者監査ログ)  
**Subsystem:** Audit Logging  
**Function ID:** FN-AUDIT-001  
**Version:** 1.0  
**Created:** 2026-08-27  
**Last Updated:** 2026-08-27  
**Author:** Software Architect  
**Review Status:** Approved (承認済み)  
**Classification:** Internal — Engineering Division

---

## 1. Document Control (ドキュメント管理)

### 1.1 Document Revision History

| Version | Date | Author | Description of Changes |
| :--- | :--- | :--- | :--- |
| 1.0 | 2026-08-27 | Software Architect | Initial screen items specification for Admin Audit Log screens: audit log list, detail modal, and manual delete confirmation dialog. |

### 1.2 Related Documents

| No. | Document ID | Document Name | File Path | Remarks |
| :-- | :--- | :--- | :--- | :--- |
| 1 | SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | Business rules for audit logging (Section 5.8, 6.4, 7.8). |
| 2 | SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | `audit_logs` table structure (Section 3.28), indexes (Section 4.1). |
| 3 | SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | Security rules, naming conventions, API standards, audit logging requirements (Section 6.4). |
| 4 | SKM-FDS-AUDIT-001 | Functional Specification — Audit Log | `docs/screen/Audit Log Screen/機能設計書_Audit_Log.md` | Use cases, state transitions, validation rules, error handling. |

---

## 2. Screen Overview & Purpose (画面概要・目的)

### 2.1 Purpose (目的)
The Admin Audit Log screen provides platform administrators with full visibility into all significant system actions performed within the Cosmetics Finder platform. It serves as the central audit trail for security monitoring, compliance, and operational accountability. The screen enables viewing, filtering, searching, and exporting audit log data, as well as manual deletion of records that are at least 90 days old.

### 2.2 Target Users & Roles (対象ユーザーと権限)

| Attribute | Value |
| :--- | :--- |
| **Primary Actors** | Platform Administrator (admin role) |
| **Required Authentication** | JWT Bearer Token (`admin` role) |
| **Data Scope** | All platform audit log entries (append-only, with admin manual deletion for records >= 90 days) |
| **Access Control** | Admin-only routes — `JwtAuthGuard` + `RolesGuard` enforced |

### 2.3 Core Functions & Basic Design Principles (主要機能・基本設計方針)
1. **Audit Trail Viewing** — Display all audit log entries in a sortable, paginated table.
2. **Advanced Filtering** — Filter by user, action type, entity type, date range, IP address, and entity ID.
3. **Log Detail Inspection** — View full details including old/new values (JSON diff), IP, user agent.
4. **Search** — Full-text search across action names, entity types, and user information.
5. **CSV Export** — Export filtered audit log data in CSV format.
6. **Real-Time Monitoring** — Auto-refresh capability every 30 seconds.
7. **Manual Deletion** — Delete DB audit log records aged >= 90 days.
8. **Internationalization** — Full i18n support for EN, JA, MY.
9. **Responsive Design** — Desktop table layout, mobile card-based layout.

---

## 3. Screen Layout (画面レイアウト構成)

### 3.1 Overall Page Structure (全体画面構成)

#### Audit Log List Page Layout
```text
┌─────────────────────────────────────────────────────────────────────┐
│                         BROWSER VIEWPORT                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  [A] PAGE HEADER                                             │   │
│  │  [A1] Page Title: "Audit Log"                                │   │
│  │  [A2] Back to Dashboard    [A3] Auto-Refresh Toggle          │   │
│  │                                    [A4] Export CSV           │   │
│  │                                    [A5] Delete Audit Logs    │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  [B] FILTERS SECTION                                       │     │
│  │                                                            │     │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │     │
│  │  │ [B1]     │ │ [B2]     │ │ [B3]     │ │ [B4]         │   │     │
│  │  │ User     │ │ Action   │ │ Entity   │ │ Date Range   │   │     │
│  │  │ Filter   │ │ Filter   │ │ Type     │ │ Filter       │   │     │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │     │
│  │                                                            │     │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐            │     │
│  │  │ [B5]     │ │ [B6]     │ │ [B7]             │            │     │
│  │  │ IP Addr  │ │ Entity   │ │ Search           │            │     │
│  │  │ Filter   │ │ ID       │ │                  │            │     │
│  │  └──────────┘ └──────────┘ └──────────────────┘            │     │
│  │                                                            │     │
│  │  ┌──────────────────────┐ ┌──────────────────────┐         │     │
│  │  │ [B8] Clear Filters   │ │ [B9] Active Filters  │         │     │
│  │  └──────────────────────┘ └──────────────────────┘         │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  [C] AUDIT LOG TABLE                                        │    │
│  │                                                             │    │
│  │  ┌─────┬────────┬────────┬────────┬────────┬────────┬────┐  │    │
│  │  │[C1] │[C2]    │[C3]    │[C4]    │[C5]    │[C6]    │[C7]│  │    │
│  │  │ Chk │Time    │Actor   │Action  │Entity  │Entity  │Sum │  │    │
│  │  │     │stamp   │        │        │Type    │ID      │mary│  │    │
│  │  ├─────┼────────┼────────┼────────┼────────┼────────┼────┤  │    │
│  │  │     │        │        │        │        │        │[C8]│  │    │
│  │  │     │        │        │        │        │        │ IP │  │    │
│  │  ├─────┼────────┼────────┼────────┼────────┼────────┼────┤  │    │
│  │  │[C9] "View Detail" button per row                      │  │    │
│  │  └─────┴────────┴────────┴────────┴────────┴────────┴────┘  │    │
│  │                                                             │    │
│  │  [C10] Empty State (when no results)                        │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  [D] PAGINATION                                             │    │
│  │  [D1] Page Info  [D2] Prev  [D3] Pages  [D4] Next           │    │
│  │                                    [D5] Page Size Select    │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Audit Log Detail Modal Layout
```text
┌──────────────────────────────────────────────────────────────┐
│  [E] MODAL HEADER                                            │
│  [E1] Modal Title: "Audit Log Detail"   [E2] Close Button    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─ Basic Information ────────────────────────────────────┐  │
│  │ [E3] Timestamp: 2026-08-25 14:30:00 UTC                │  │
│  │ [E4] Actor Name: John Smith                            │  │
│  │ [E5] Actor Email: john@example.com                     │  │
│  │ [E6] Actor Role: [admin]                               │  │
│  │ [E7] Action: merchant.approve                          │  │
│  │ [E8] Entity Type: Merchant                             │  │
│  │ [E9] Entity ID: 550e8400-e29b-41d4-a716-... (link)     │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ Change Details ────────────────────────────────────────┐ │
│  │ [E10] Old Value:                                        │ │
│  │ ┌─────────────────────────────────────────────────────┐ │ │
│  │ │ {                                                   │ │ │
│  │ │   "license_status": "pending",                      │ │ │
│  │ │   "rejection_reason": null                          │ │ │
│  │ │ }                                                   │ │ │
│  │ └─────────────────────────────────────────────────────┘ │ │
│  │                                                         │ │
│  │ [E11] New Value:                                        │ │
│  │ ┌─────────────────────────────────────────────────────┐ │ │
│  │ │ {                                                   │ │ │
│  │ │   "license_status": "approved",                     │ │ │
│  │ │   "reviewed_at": "2026-08-25T14:30:00.000Z"         │ │ │
│  │ │ }                                                   │ │ │
│  │ └─────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─ Client Information ───────────────────────────────────┐  │
│  │ [E12] IP Address: 192.168.1.100                        │  │
│  │ [E13] User Agent: Mozilla/5.0 (Windows NT 10.0...)     │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ Quick Actions ─────────────────────────────────────────┐ │
│  │ [E14] View User History Button                          │ │
│  │ [E15] View Entity History Button                        │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

#### Manual Delete Confirmation Dialog Layout
```text
┌──────────────────────────────────────────────────────────────┐
│  [F] DIALOG HEADER                                           │
│  [F1] Dialog Title: "Delete Audit Logs"                    │
│                                            [F2] Close        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  [F3] Warning Message:                                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ ⚠This action will permanently delete audit log records │ │
│  │ that are at least 90 days old.                         │ │
│  │ This operation cannot be undone.                        │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  [F4] Retention Period Input:                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Delete records older than: [  90  ] days                │ │
│  │ Minimum: 90 days                                        │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  [F5] Deletion Scope Summary:                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Audit log records older than {N} days will be           │ │
│  │ permanently deleted.                                    │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐   │
│  │          [F6] Confirm Delete (danger button)          │   │
│  │          [F7] Cancel (secondary)                      │   │
│  └───────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Responsive Layout Breakpoints (レスポンシブ対応)

| Breakpoint | Min Width | Layout Behavior |
| :--- | :--- | :--- |
| Mobile (default) | 0px | Stacked filters, card-based table layout, full-width modal |
| Tablet (`md:`) | 768px | Wrapped filter grid, responsive table with horizontal scroll |
| Desktop (`lg:`) | 1024px | Horizontal filter bar, full table, side panel modal (400px) |
| Wide (`xl:`) | 1280px | Full-width layout with enhanced spacing |

---

## 4. Item Definitions (画面項目定義)

### 4.1 Section [A]: Page Header (ページヘッダー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 1 | `lblAuditTitle` | Page Title | Static Label (`<h1>`) | String | — | Visible. Text: "Audit Log" | — | Hardcoded UI text | Tailwind: `text-2xl font-bold`. i18n: `audit.title`. |
| 2 | `lnkBackToDashboard` | Back to Dashboard Button | Link (`<Link>`) | — | — | Visible. Text: "Back to Dashboard" | — | — | Navigates to `/admin/dashboard`. Left-aligned in header. i18n: `audit.backToDashboard`. |
| 3 | `tglAutoRefresh` | Auto-Refresh Toggle | Switch | Boolean | — | Default: `false` (OFF) | — | — | Toggles auto-refresh every 30 seconds. i18n: `audit.autoRefresh`. |
| 4 | `btnExportCsv` | Export CSV Button | Button (`secondary`) | — | — | Visible. Text: "Export CSV" | — | — | Triggers CSV export of filtered audit logs. Visible to admin users.Enabled regardless of the current list result count. i18n: `audit.exportCsv`. |
| 5 | `btnDeleteLogs` | Delete Audit Logs Button | Button (`danger`) | — | — | Visible. Text: "Delete Audit Logs" | — | — | Visible and enabled for authorized admin users regardless of the current audit log list result count. Deletion eligibility is determined by the retention period and backend age check, not by the current list result count. Opens Manual Delete Confirmation Dialog (Section 4.6). Restricted to admin role. i18n: `audit.deleteLogs`. |

### 4.2 Section [B]: Filters (フィルター)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 6 | `txtUserFilter` | User Filter | Input (search/autocomplete) | `{ id: string, label: string }` | — | Empty. Placeholder: "Search by user..." | Min 2 chars to trigger search | `GET /api/v1/admin/users/search?q={query}` | Autocomplete input. On selection, resolves to UUID. Sends `userId=<UUID>` to API. Debounced (300ms). i18n: `audit.filterByUser`. |
| 7 | `selActionFilter` | Action Filter | Select (multi) | string[] | — | Empty (`[]`) | — | `GET /api/v1/admin/audit-logs/filters` | Multi-select dropdown. Options: action types from audit_logs. Sends `action=<string>[]` to API. i18n: `audit.filterByAction`. |
| 8 | `selEntityTypeFilter` | Entity Type Filter | Select (multi) | string[] | — | Empty (`[]`) | — | `GET /api/v1/admin/audit-logs/filters` | Multi-select dropdown. Options: entity types from audit_logs. Sends `entityType=<string>[]` to API. i18n: `audit.filterByEntityType`. |
| 9 | `txtDateFrom` | Date Range Start | Input (`date`) | Date | — | Empty | Valid date, <= dateTo | — | Start date for range filter. i18n: `audit.filterByDate`. |
| 10 | `txtDateTo` | Date Range End | Input (`date`) | Date | — | Empty | Valid date, >= dateFrom | — | End date for range filter. Both required if either provided. i18n: `audit.filterByDate`. |
| 11 | `txtIpAddressFilter` | IP Address Filter | Input (`text`) | String(45) | — | Empty. Placeholder: "Filter by IP..." | Max 45 chars | — | Filter by client IP address. Sends `ipAddress=<string>` to API. i18n: `audit.filterByIp`. |
| 12 | `txtEntityIdFilter` | Entity ID Filter | Input (`text`) | String (UUID) | — | Empty. Placeholder: "Filter by Entity ID..." | Valid UUID format | — | Filter by entity UUID. Sends `entityId=<UUID>` to API. Debounced (300ms). Validates UUID before sending. i18n: `audit.filterByEntityId`. |
| 13 | `txtSearch` | Search Input | Input (`search`) | String(255) | — | Empty. Placeholder: "Search..." | Max 255 chars | — | Free-text search across action, entity type, user name/email. Debounced (300ms). Sends `search=<string>` to API. i18n: `audit.search`. |
| 14 | `btnClearFilters` | Clear Filters Button | Link (`<Link>`) | — | — | Visible. Text: "Clear Filters" | — | — | Resets all filters to default values. Hidden when no filters active. i18n: `audit.clearFilters`. |
| 15 | `lblActiveFilters` | Active Filters Badge | Badge | Number | — | Hidden (count = 0) | — | — | Shows count of active filters. Hidden when count = 0. i18n: `audit.activeFilters`. |

### 4.3 Section [C]: Audit Log Table (監査ログテーブル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 16 | `chkSelectRow` | Row Selection Checkbox | Checkbox | Boolean | — | Unchecked | — | — | Select row for bulk operations. |
| 17 | `colTimestamp` | Timestamp Column | Table Column | DateTime | Yes | Default sort: DESC | `YYYY-MM-DD HH:mm:ss UTC` | `audit_logs.created_at` | When the action occurred. Sortable. Width: 180px. i18n: `audit.timestamp`. |
| 18 | `colActor` | Actor Column | Table Column | String | Yes | — | `Name (email)` | `users.name` + `users.email` | User who performed the action. Joined from users table. Width: 200px. i18n: `audit.actor`. |
| 19 | `colAction` | Action Column | Table Column | String | Yes | — | Localized string | `audit_logs.action` | Action type (e.g., merchant.approve). Sortable, filterable. Width: 180px. i18n: `audit.action`. |
| 20 | `colEntityType` | Entity Type Column | Table Column | String | Yes | — | Localized string | `audit_logs.entity_type` | Entity type affected (e.g., Merchant, Order). Sortable, filterable. Width: 150px. i18n: `audit.entityType`. |
| 21 | `colEntityId` | Entity ID Column | Table Column | UUID | Yes | — | UUID (truncated) + link | `audit_logs.entity_id` | Clickable link to entity detail page. Truncated UUID display. Width: 140px. i18n: `audit.entityId`. |
| 22 | `colSummary` | Summary Column | Table Column | String | Yes | — | Auto-generated text | Computed | Brief description derived from action + entity_type. Width: auto. i18n: `audit.summary`. |
| 23 | `colIpAddress` | IP Address Column | Table Column | String | Yes | — | IP string | `audit_logs.ip_address` | Client IP address. May be null for system actions. Width: 130px. i18n: `audit.ipAddress`. |
| 24 | `btnViewDetail` | View Detail Button | Link (`<Link>`) | — | — | Visible per row. Text: "View Detail" | — | — | Opens audit log detail modal (Section 4.4). i18n: `audit.viewDetail`. |
| 25 | `lblEmptyState` | Empty State | Empty State | — | — | Hidden by default | — | — | "No matching records were found." Displayed when filtered results return 0 rows. i18n: `audit.noLogs`. |

### 4.4 Section [E]: Audit Log Detail Modal (監査ログ詳細モーダル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 26 | `lblModalTitle` | Modal Title | Static Label (`<h3>`) | String | — | Visible. Text: "Audit Log Detail" | — | Hardcoded UI text | i18n: `audit.logDetail`. |
| 27 | `btnCloseModal` | Close Button | Button (`secondary`) | — | — | Visible. Text: "Close" | — | — | Closes modal. Also closes on Escape key and overlay click. i18n: `audit.close`. |
| 28 | `lblDetailTimestamp` | Timestamp | Static Label (`<Text>`) | DateTime | Yes | — | `YYYY-MM-DD HH:mm:ss.SSS UTC` | `audit_logs.created_at` | Full UTC timestamp with milliseconds. i18n: `audit.timestamp`. |
| 29 | `lblActorName` | Actor Name | Static Label (`<Text>`) | String | Conditional | — | String | `users.name` | User name. "System" if user_id is null. i18n: `audit.actorName`. |
| 30 | `lblActorEmail` | Actor Email | Static Label (`<Text>`) | String | Conditional | — | String | `users.email` | Actor email address. Hidden if user_id is null. i18n: `audit.actorEmail`. |
| 31 | `lblActorRole` | Actor Role | Badge | String | Conditional | — | Badge with color | `users.role` | Actor role. Badge color: admin=red, merchant=blue, buyer=green. Hidden if user_id is null. i18n: `audit.actorRole`. |
| 32 | `lblDetailAction` | Action | Static Label (`<Text>`) | String | Yes | — | Localized string | `audit_logs.action` | Action performed. i18n: `audit.action`. |
| 33 | `lblDetailEntityType` | Entity Type | Static Label (`<Text>`) | String | Yes | — | Localized string | `audit_logs.entity_type` | Entity type affected. i18n: `audit.entityType`. |
| 34 | `lnkDetailEntityId` | Entity ID | Link (`<Link>`) | UUID | Conditional | — | UUID (full) + link | `audit_logs.entity_id` | Clickable link to entity detail. Hidden if entity_id is null. i18n: `audit.entityId`. |
| 35 | `txtOldValue` | Old Value | Code Block (`<pre><code>`) | JSON | Conditional | — | Pretty-printed JSON (2-space indent) | `audit_logs.old_value` | Previous state. Shown for update events. Hidden if null. Sensitive fields masked as `***`. i18n: `audit.oldValue`. |
| 36 | `txtNewValue` | New Value | Code Block (`<pre><code>`) | JSON | Conditional | — | Pretty-printed JSON (2-space indent) | `audit_logs.new_value` | New state. Shown for create/update events. Hidden if null. Sensitive fields masked as `***`. i18n: `audit.newValue`. |
| 37 | `lblDetailIpAddress` | IP Address | Static Label (`<Text>`) | String | Conditional | — | IP string | `audit_logs.ip_address` | Client IP address. "Unknown" if null. i18n: `audit.ipAddress`. |
| 38 | `lblUserAgent` | User Agent | Static Label (`<Text>`) | String | Conditional | — | Truncated string (max 200 chars) | `audit_logs.user_agent` | Client user agent. Truncated with "..." if > 200 chars. Full text shown on hover. i18n: `audit.userAgent`. |
| 39 | `btnViewUserHistory` | View User History Button | Button (`text`) | — | — | Visible. Text: "View User History" | — | — | Navigates to audit log list filtered by this user's ID. Closes modal first. i18n: `audit.viewUserHistory`. |
| 40 | `btnViewEntityHistory` | View Entity History Button | Button (`text`) | — | — | Visible. Text: "View Entity History" | — | — | Navigates to audit log list filtered by this entity type and ID. Closes modal first. i18n: `audit.viewEntityHistory`. |

### 4.5 Section [D]: Pagination (ページネーション)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 41 | `lblPageInfo` | Page Info Text | Static Label (`<Text>`) | String | Yes | — | "Showing {start}-{end} of {total}" | — | Always displayed. i18n: `audit.pageInfo`. |
| 42 | `btnPrevPage` | Previous Button | Button (`secondary`) | — | — | Visible. Text: "Previous" | — | — | Navigate to previous page. Disabled on first page. i18n: `audit.previous`. |
| 43 | `btnPageNumbers` | Page Number Buttons | Button Group | — | — | — | Shows up to 5 page buttons with ellipsis | — | Page number navigation. i18n: `audit.pageNumbers`. |
| 44 | `btnNextPage` | Next Button | Button (`secondary`) | — | — | Visible. Text: "Next" | — | — | Navigate to next page. Disabled on last page. i18n: `audit.next`. |
| 45 | `selPageSize` | Page Size Select | Select | Number | — | Default: `50` | Options: 25, 50, 100, 200 | — | Items per page. i18n: `audit.pageSize`. |

### 4.6 Section [F]: Manual Delete Confirmation Dialog (手動削除確認ダイアログ)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 46 | `lblDeleteDialogTitle` | Dialog Title | Static Label (`<h3>`) | String | — | Visible. Text: "Delete Audit Logs" | — | Hardcoded UI text | i18n: `audit.deleteDialogTitle`. |
| 47 | `btnCloseDialog` | Close Button | Button (`secondary`) | — | — | Visible. Text: "Close" | — | — | Closes dialog without performing deletion. i18n: `audit.close`. |
| 48 | `lblDeleteWarning` | Warning Message | Alert (`warning`) | — | — | Visible | — | — | Informs admin that deletion is permanent and applies to records >= 90 days. i18n: `audit.deleteWarning`. |
| 49 | `txtRetentionDays` | Retention Period Input | Input (`number`) | Number | — | Default: `90` | Min: 90 | — | Number of days. Records younger than this will NOT be deleted. i18n: `audit.retentionDays`. |
| 50 | `lblDeleteScopeSummary` | Deletion Scope Summary | Static Label (`<Text>`) | String | Yes | — | "Audit log records older than {N} days will be permanently deleted." | — | Dynamic summary updated based on retention period input. The current list/search filters are NOT used to determine which records are deleted. Deletion eligibility is determined solely by `olderThanDays` — audit log records older than the specified retention period are targeted. Records younger than the specified retention period must NOT be deleted. The minimum allowed retention period is 90 days. i18n: `audit.deleteScopeSummary`. |
| 51 | `btnConfirmDelete` | Confirm Delete Button | Button (`danger`) | — | — | Visible. Text: "Confirm Delete" | — | — | Triggers `DELETE /api/v1/admin/audit-logs/files` with `{ olderThanDays: <value> }`. Disabled while request is in progress. Shows spinner during API call. i18n: `audit.confirmDelete`. |
| 52 | `btnCancelDelete` | Cancel Button | Button (`secondary`) | — | — | Visible. Text: "Cancel" | — | — | Closes dialog without performing deletion. i18n: `audit.cancel`. |

---

## 5. Item Behaviors & Event Specifications (各項目における挙動・イベント仕様)

### 5.1 Page Load (`/admin/audit-logs`)
- **Trigger:** Admin navigates to `/admin/audit-logs`.
- **Processing Logic:**
  1. **Authentication Check:** Verify JWT token and `admin` role. Redirect to login if unauthenticated.
  2. **Initial Data Load:** `GET /api/v1/admin/audit-logs` with default params (`page=1`, `limit=50`, `sortBy=created_at`, `sortOrder=desc`).
  3. **Filter Options Load:** `GET /api/v1/admin/audit-logs/filters` to populate Action Filter and Entity Type Filter dropdowns.
  4. **Render:** Display audit log table with results.
- **Exception Handling:**
  - `403` (FORBIDDEN): Redirect to Unauthorized page.
  - `500` (INTERNAL_SERVER_ERROR): Display "Failed to load audit logs" error message.
  - Network error: Display "Network error. Please check your connection".

### 5.2 Auto-Refresh Toggle (`tglAutoRefresh` onChange)
- **Trigger:** Admin toggles the auto-refresh switch.
- **Processing Logic:**
  1. **If enabled:** Start polling interval (30 seconds). On each interval, re-fetch audit log list with current filters.
  2. **If disabled:** Stop polling. Retain current list data.
  3. **Pause behavior:** Pause polling when page is hidden or when a refresh request is still in progress.
- **Exception Handling:**
  - Refresh error: Preserve existing data and show non-blocking error notification. Next interval retries automatically.

### 5.3 Export CSV (`btnExportCsv` onClick)
- **Trigger:** Admin clicks "Export CSV" button.
- **Processing Logic:**
  1. **Client-Side Pre-Check:** Ensure there are audit log entries to export.
  2. **Backend Dispatch:** `POST /api/v1/admin/audit-logs/export` with current filter params + `{ format: 'csv' }`.
  3. **Backend Execution:** Validate inputs (date range max 365 days, row count max 10,000). Generate CSV file. Store file (no automatic TTL). Return download URL.
  4. **Post-Execution UI:** Trigger file download. Show success toast.
- **Exception Handling:**
  - `400` (BAD_REQUEST): Display "Export exceeds maximum row limit (10,000). Please narrow your filters."
  - `500` (INTERNAL_SERVER_ERROR): Display "Report generation failed. Please try again."
  - Network error: Display "Network error. Please check your connection".

### 5.4 Delete Audit Logs Button (`btnDeleteLogs` onClick)
- **Trigger:** Admin clicks "Delete Audit Logs" button.
- **Processing Logic:**
  1. **Authorization Check:** Verify admin role. Button hidden for non-admin users.
  2. **Open Dialog:** Display Manual Delete Confirmation Dialog (Section 4.6).
- **Exception Handling:**
  - None (button hidden if not authorized).

### 5.5 Retention Period Input (`txtRetentionDays` onChange)
- **Trigger:** Admin changes the retention period value.
- **Processing Logic:**
  1. **Validation:** Must be >= 90.
  2. **Update Summary:** Update deletion scope summary text with new value.
  3. **Enable/Disable Confirm:** Disable confirm button if validation fails.
- **Exception Handling:**
  - Invalid input: Show inline error message. Disable confirm button.

### 5.6 Confirm Delete (`btnConfirmDelete` onClick)
- **Trigger:** Admin clicks "Confirm Delete" button.
- **Processing Logic:**
  1. **Client-Side Pre-Check:** Validate retention period >= 90.
  2. **Backend Dispatch:** `DELETE /api/v1/admin/audit-logs/files` with `{ olderThanDays: <input value> }`.
  3. **Backend Execution:** Validate JWT token and admin role. Select DB records where `created_at` older than threshold. Delete in controlled batches. Return count of deleted records.
  4. **Post-Execution UI:** Close dialog. Show success toast. Refresh list (or re-fetch if auto-refresh is off).
- **Exception Handling:**
  - `400` (BAD_REQUEST): Display "Minimum retention period is 90 days" or "No records eligible for deletion".
  - `403` (FORBIDDEN): Display "Access denied".
  - `500` (INTERNAL_SERVER_ERROR): Display "Deletion failed. Please try again." Dialog remains open for retry.
  - Loading state: Show spinner on confirm button. Disable all inputs during request.

### 5.7 View Detail (`btnViewDetail` onClick)
- **Trigger:** Admin clicks "View Detail" button on a log row.
- **Processing Logic:**
  1. **Backend Dispatch:** `GET /api/v1/admin/audit-logs/:id`.
  2. **Backend Execution:** Find audit log entry by ID. Join with users table for actor details. Return full audit log DTO.
  3. **Post-Execution UI:** Display Audit Log Detail Modal (Section 4.4).
- **Exception Handling:**
  - `404` (NOT_FOUND): Display "Audit log entry not found" error.
  - `500` (INTERNAL_SERVER_ERROR): Display "Failed to load audit log detail".

### 5.8 View User History (`btnViewUserHistory` onClick)
- **Trigger:** Admin clicks "View User History" button in detail modal.
- **Processing Logic:**
  1. **Close Modal:** Close detail modal.
  2. **Navigate:** Navigate to `/admin/audit-logs?userId={entity.user_id}`.
  3. **Re-fetch:** Audit log list filtered to show only entries for the selected user.
- **Exception Handling:** None applicable.

### 5.9 View Entity History (`btnViewEntityHistory` onClick)
- **Trigger:** Admin clicks "View Entity History" button in detail modal.
- **Processing Logic:**
  1. **Close Modal:** Close detail modal.
  2. **Navigate:** Navigate to `/admin/audit-logs?entityType={entity.entity_type}&entityId={entity.entity_id}`.
  3. **Re-fetch:** Audit log list filtered to show only entries for the selected entity.
- **Exception Handling:** None applicable.

### 5.10 Clear Filters (`btnClearFilters` onClick)
- **Trigger:** Admin clicks "Clear Filters" link.
- **Processing Logic:**
  1. **Reset State:** Reset all filter values to defaults.
  2. **Re-fetch:** `GET /api/v1/admin/audit-logs` with default params.
  3. **Update UI:** Hide clear filters link and active filters badge.
- **Exception Handling:** None applicable.

### 5.11 Pagination (`btnPrevPage` / `btnNextPage` / `btnPageNumbers` / `selPageSize` onClick/onChange)
- **Trigger:** Admin clicks page navigation or changes page size.
- **Processing Logic:**
  1. **Update State:** Update page number or limit.
  2. **Re-fetch:** `GET /api/v1/admin/audit-logs` with updated params.
  3. **Update UI:** Update table, pagination controls, and page info text.
- **Exception Handling:**
  - `400` (BAD_REQUEST): Display "Invalid pagination parameters".

### 5.12 Entity ID Link (`colEntityId` onClick)
- **Trigger:** Admin clicks entity ID link in table.
- **Processing Logic:**
  1. **Navigate:** Based on entity_type, navigate to appropriate detail page:
     - Merchant: `/admin/merchants/:entityId`
     - Product: `/admin/products/:entityId`
     - Order: `/admin/orders/:entityId`
     - Advertisement: `/admin/advertisements/:entityId`
     - User: `/admin/users/:entityId`
  2. If entity_id is null, display "—" (em dash) and no link.
- **Exception Handling:** None applicable.

---

## 6. Validation & Error Message Mapping (バリデーション及びエラーメッセージマッピング)

### 6.1 Filter Validation Errors

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-AUDIT-001** | `txtUserFilter` | User must exist (resolved UUID) | Red border. Text below field. | "User not found" | "ユーザーが見つかりません" |
| **VAL-AUDIT-002** | `txtDateFrom` | Must be valid date if provided | Red border. Text below field. | "Invalid start date" | "無効な開始日です" |
| **VAL-AUDIT-003** | `txtDateTo` | Must be valid date if provided, >= dateFrom | Red border. Text below field. | "End date must be after start date" | "終了日は開始日より後である必要があります" |
| **VAL-AUDIT-004** | `txtIpAddressFilter` | Max 45 characters if provided | Red border. Text below field. | "IP address too long" | "IPアドレスが長すぎます" |
| **VAL-AUDIT-005** | `txtEntityIdFilter` | Must be valid UUID format if provided | Red border. Text below field. | "Invalid Entity ID format" | "エンティティIDの形式が無効です" |
| **VAL-AUDIT-006** | `txtSearch` | Max 255 characters if provided | Red border. Text below field. | "Search query too long" | "検索クエリが長すぎます" |

### 6.2 Pagination Validation Errors

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-AUDIT-010** | `selPageSize` | Must be 1-200 | Inline error | "Limit must be between 1 and 200" | "件数は1から200の間である必要があります" |

### 6.3 Export Validation Errors

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-AUDIT-020** | `format` | Required, must be 'csv' | Toast error | "Export format must be CSV" | "エクスポート形式はCSVである必要があります" |
| **VAL-AUDIT-021** | Date Range | Max 365 days | Toast error | "Date range cannot exceed 365 days" | "日付範囲は365日を超えることはできません" |
| **VAL-AUDIT-022** | Row Count | Max 10,000 rows | Toast error | "Export exceeds maximum row limit (10,000). Please narrow your filters." | "エクスポートが最大行制限（10,000）を超えています。フィルターを絞り込んでください。" |

### 6.4 Delete Validation Errors

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-AUDIT-030** | `txtRetentionDays` | Must be >= 90 | Red border. Text below field. | "Retention period must be at least 90 days" | "保持期間は最低90日である必要があります" |

### 6.5 API Error Responses

| HTTP Status | Error Code | Scenario | UI Display |
| :--- | :--- | :--- | :--- |
| `400` | `BAD_REQUEST` | Invalid filter parameters | Toast: "Invalid filter parameters. Please check your input." |
| `403` | `FORBIDDEN` | Non-admin access attempt | Redirect to Unauthorized page |
| `404` | `NOT_FOUND` | Audit log entry not found | Toast: "Audit log entry not found" |
| `500` | `INTERNAL_SERVER_ERROR` | Server error | Toast: "Something went wrong. Please try again" |

### 6.6 Validation Enforcement Layers

1. **Frontend (Client)**: React Hook Form + Zod schema validation with real-time feedback.
2. **Backend (Server)**: NestJS ValidationPipe + class-validator DTOs on all endpoints.
3. **Database (Constraint)**: DB indexes as performance safety net.

---

## 7. Responsive Layout Behavior (レスポンシブレイアウト動作)

### 7.1 Desktop (≥1024px)
- Full table layout with all columns visible
- Horizontal filter bar
- Side panel modal (400px width) for detail view
- Centered dialog (480px width) for delete confirmation

### 7.2 Tablet (768px-1023px)
- Responsive table with horizontal scroll
- Wrapped filter grid
- Full-width modal
- Full-width dialog

### 7.3 Mobile (<768px)
- Card-based table layout (each row becomes a card)
- Stacked filters (vertical layout)
- Full-screen modal
- Full-screen dialog

---

## 8. Accessibility Requirements (アクセシビリティ要件)

| Requirement | Implementation |
| :--- | :--- |
| Keyboard Navigation | All interactive elements focusable via Tab key. Enter/Space to activate buttons. Escape to close modals. |
| Screen Reader Support | All form fields have associated labels via `htmlFor`/`id`. ARIA labels for icon buttons. Live regions for dynamic content updates. |
| Color Contrast | WCAG 2.1 AA compliance for all text and interactive elements. |
| Focus Management | Focus trapped in modals. Focus returned to trigger element when modal closes. |
| Error Announcements | Validation errors announced via `aria-live="polite"` for screen readers. |

---

*End of Screen Items Specification (Admin Audit Log Screen)*
