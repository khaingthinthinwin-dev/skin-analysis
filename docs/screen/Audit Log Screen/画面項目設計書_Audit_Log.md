# Screen Items Specification (画面項目設計書) — Admin Audit Log Screen

**Document ID:** SKM-SIS-SCR-AUDIT-001  
**Target Screen:** Admin Audit Log (管理者監査ログ)  
**Subsystem:** Audit Logging  
**Function ID:** FN-AUDIT-001  
**Version:** 1.1  
**Created:** 2026-08-27  
**Last Updated:** 2026-10-21  
**Author:** Software Architect  
**Review Status:** Approved (承認済み)  
**Classification:** Internal — Engineering Division

---

## 1. Document Control (ドキュメント管理)

### 1.1 Document Revision History

| Version | Date | Author | Description of Changes |
| :--- | :--- | :--- | :--- |
| 1.0 | 2026-08-27 | Software Architect | Initial screen items specification for Admin Audit Log screens: audit log list, detail modal, and manual delete confirmation dialog. |
| 1.1 | 2026-10-21 | Software Architect | Aligned specification with implemented source code: removed the "Back to Dashboard" button and the User/Entity ID filter inputs (userId/entityId are URL-only parameters); removed the Entity ID column and detail-modal Entity ID row (entityId is never returned by the API); removed the "View User History"/"View Entity History" quick actions; timestamps now displayed in Myanmar Time (`YYYY/MM/DD HH:mm:ss.SSS MMT`); pagination default 10 with 10/20/50/100 options; detail modal renders humanized old/new value lists and parsed client information instead of raw user agent; added row-selection checkboxes feeding `recordIds` on delete; added Export CSV date-range dialog (Section 4.7); corrected export/delete API flows (streamed CSV, no download URL; `DELETE /files` with optional `recordIds`). |

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
2. **Advanced Filtering** — Filter by action type, entity type, date range, IP address, and free-text search. (`userId` / `entityId` are supported as URL query parameters only — no visible filter inputs exist for them.)
3. **Log Detail Inspection** — View full details including humanized old/new value lists and parsed client information (client type, browser, device).
4. **Search** — Free-text search across action names, entity types, and user information (debounced 300 ms).
5. **CSV Export** — Choose an export date range in a dialog, then download the filtered audit log data as a CSV file.
6. **Real-Time Monitoring** — Auto-refresh capability every 30 seconds (paused while the browser tab is hidden).
7. **Manual Deletion** — Delete DB audit log records aged >= 90 days, either retention-wide or limited to explicitly selected rows.
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
│  │  [A1] Page Title: "Audit Log"  + [A2] Subtitle               │   │
│  │                         [A3] Auto-Refresh Toggle             │   │
│  │                                    [A4] Export CSV           │   │
│  │                                    [A5] Delete Audit Logs    │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  [B] FILTERS SECTION                                       │     │
│  │                                                            │     │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │     │
│  │  │ [B1]     │ │ [B2]     │ │ [B3]     │ │ [B4]         │   │     │
│  │  │ Search   │ │ Action   │ │ Entity   │ │ IP Addr      │   │     │
│  │  │          │ │ Filter   │ │ Type     │ │ Filter       │   │     │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │     │
│  │                                                            │     │
│  │  ┌──────────────────────────────────────────┐               │     │
│  │  │ [B5] Date Range (from – to)              │               │     │
│  │  └──────────────────────────────────────────┘               │     │
│  │                                                            │     │
│  │  ┌──────────────────────┐ ┌──────────────────────┐         │     │
│  │  │ [B6] Clear Filters   │ │ [B7] Active Filters  │         │     │
│  │  └──────────────────────┘ └──────────────────────┘         │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  [C] AUDIT LOG TABLE                                        │    │
│  │                                                             │    │
│  │  ┌─────┬────────┬────────┬────────┬────────┬────────┬────┐  │    │
│  │  │[C1] │[C2]    │[C3]    │[C4]    │[C5]    │[C6]    │[C7]│  │    │
│  │  │Chk  │Time    │Actor   │Action  │Entity  │Summary │ IP │  │    │
│  │  │All  │stamp   │        │        │Type    │        │    │  │    │
│  │  ├─────┼────────┼────────┼────────┼────────┼────────┼────┤  │    │
│  │  │[C8] │        │        │        │        │        │[C9]│  │    │
│  │  │ Chk │ ...row values...                        │Eye │  │    │
│  │  ├─────┴────────┴────────┴────────┴────────┴────────┴────┤  │    │
│  │  │ [C10] "View Detail" icon button per row                │  │    │
│  │  └────────────────────────────────────────────────────────┘  │    │
│  │                                                             │    │
│  │  [C11] Empty State (when no results)                        │    │
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

#### Export CSV Date-Range Dialog Layout
```text
┌──────────────────────────────────────────────────────────────┐
│  [G] DIALOG HEADER                                           │
│  [G1] Title: "Export Audit Logs"                             │
│  [G2] Description                                            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  [G3] Start Date Input (type="date", required)               │
│  [G4] End Date Input   (type="date", required)               │
│  [G5] Inline Validation Message (role="alert")               │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐   │
│  │   [G6] Cancel (outline)      [G7] Export CSV (submit) │   │
│  └───────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

#### Audit Log Detail Modal Layout
```text
┌──────────────────────────────────────────────────────────────┐
│  [E] MODAL HEADER                                            │
│  [E1] Modal Title: "Audit Log Detail"                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─ Basic Information ────────────────────────────────────┐  │
│  │ [E2] Timestamp: 2026/08/25 14:30:00.123 MMT            │  │
│  │ [E3] Actor Name: John Smith  ("System" if no user)     │  │
│  │ [E4] Actor Email: john@example.com (if present)        │  │
│  │ [E5] Actor Role: [admin] (badge, if present)           │  │
│  │ [E6] Action: MERCHANT_APPROVE                          │  │
│  │ [E7] Entity Type: MERCHANT                             │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ Change Details ────────────────────────────────────────┐ │
│  │ [E8] Old Value (humanized key/value list):              │ │
│  │ ┌─────────────────────────────────────────────────────┐ │ │
│  │ │ License Status    pending                           │ │ │
│  │ │ Rejection Reason  —                                 │ │ │
│  │ └─────────────────────────────────────────────────────┘ │ │
│  │                                                         │ │
│  │ [E9] New Value (same rendering):                        │ │
│  │ ┌─────────────────────────────────────────────────────┐ │ │
│  │ │ License Status    approved                          │ │ │
│  │ │ Reviewed At       2026-08-25T14:30:00.000Z          │ │ │
│  │ └─────────────────────────────────────────────────────┘ │ │
│  │                                                         │ │
│  │ [E10] "No change details" hint when both values are null│ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─ Client Information ───────────────────────────────────┐  │
│  │ [E11] IP Address: 192.168.1.100 ("Unknown" if null)    │  │
│  │ [E12] Client Type: [Browser] (badge, parsed from UA)   │  │
│  │ [E13] Client Browser: Chrome 140.0                     │  │
│  │ [E14] Client Device: Desktop                           │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐   │
│  │                              [E15] Close (primary)    │   │
│  └───────────────────────────────────────────────────────┘   │
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
│  │ No rows selected:                                       │ │
│  │   "Audit log records older than {N} days will be        │ │
│  │    permanently deleted."                                │ │
│  │ Rows selected:                                          │ │
│  │   "Delete {count} selected record(s) older than          │ │
│  │    {N} days."                                            │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  [F6] API Error Message (role="alert", shown on failure)     │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐   │
│  │          [F7] Confirm Delete (danger button)          │   │
│  │          [F8] Cancel (secondary)                      │   │
│  └───────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Responsive Layout Breakpoints (レスポンシブ対応)

| Breakpoint | Min Width | Layout Behavior |
| :--- | :--- | :--- |
| Mobile (default) | 0px | Stacked/single-column filters, scrollable table card, full-screen modal & dialogs |
| Tablet (`md:`) | 768px | Two-column filter grid, responsive table with horizontal scroll, centered modal & dialogs |
| Desktop (`lg:`) | 1024px | Four-column filter bar, full table, centered detail modal (max 40rem) |
| Wide (`xl:`) | 1280px | Full-width layout with enhanced spacing |

---

## 4. Item Definitions (画面項目定義)

### 4.1 Section [A]: Page Header (ページヘッダー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 1 | `lblAuditTitle` | Page Title | Static Label (`<h1>`) | String | — | Visible. Text: "Audit Logs" | — | Hardcoded UI text | Tailwind: `text-2xl font-bold`. i18n: `audit.title`. Icon (`ShieldCheck`) shown left of the title. |
| 2 | `lblAuditSubtitle` | Page Subtitle | Static Label (`<p>`) | String | — | Visible. Text: subtitle | — | Hardcoded UI text | i18n: `audit.subtitle`. Rendered below the title. |
| 3 | `tglAutoRefresh` | Auto-Refresh Toggle | Switch | Boolean | — | Default: `false` (OFF) | — | — | Toggles auto-refresh every 30 seconds. While ON, a spinning icon and pulsing green dot are displayed. i18n: `audit.autoRefresh`. |
| 4 | `btnExportCsv` | Export CSV Button | Button (`outline`) | — | — | Visible. Text: "Export CSV" (during request: "Exporting...") | — | — | Opens the Export CSV Date-Range Dialog (Section 4.7); when the current list total is 0, shows an info toast (`audit.exportEmpty`) instead of opening the dialog. Disabled while an export request is pending. i18n: `audit.exportCsv` / `audit.exporting` / `audit.exportEmpty`. |
| 5 | `btnDeleteLogs` | Delete Audit Logs Button | Button (`destructive`) | — | — | Visible. Text: "Delete Audit Logs" | — | — | Visible for authorized admin users regardless of the current audit log list result count. Deletion eligibility is determined by the retention period and backend age check, not by the current list result count. Opens Manual Delete Confirmation Dialog (Section 4.6). Restricted to admin role. i18n: `audit.deleteLogs`. |

> Note: There is no "Back to Dashboard" (or any other navigation) button in the page header.

### 4.2 Section [B]: Filters (フィルター)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 6 | `txtSearch` | Search Input | Input (`search`) | String(255) | — | Empty. Placeholder: search placeholder | Max 255 chars (`maxLength`) | — | Free-text search across action, entity type, user name/email. Debounced (300 ms) before being published to the query state. Sends `search=<string>` to API. i18n: `audit.search` / `audit.searchPlaceholder`. |
| 7 | `selActionFilter` | Action Filter | Select (multi) | string[] | — | Empty (`[]`) | — | `GET /api/v1/admin/audit-logs/filters` | Multi-select dropdown. Options: action catalog merged with values recorded in `audit_logs`. Sends repeated `action=<string>` params. Includes a "clear selection" control. i18n: `audit.filterByAction`. |
| 8 | `selEntityTypeFilter` | Entity Type Filter | Select (multi) | string[] | — | Empty (`[]`) | — | `GET /api/v1/admin/audit-logs/filters` | Multi-select dropdown. Options: entity types from catalog ∪ recorded values. Sends repeated `entityType=<string>` params. i18n: `audit.filterByEntityType`. |
| 9 | `txtIpAddressFilter` | IP Address Filter | Input (`text`) | String(45) | — | Empty. Placeholder: IP placeholder | Max 45 chars (`maxLength`) | — | Filter by client IP address. Publishes immediately on change (no debounce). Sends `ipAddress=<string>` to API. i18n: `audit.filterByIp` / `audit.filterByIpPlaceholder`. |
| 10 | `txtDateFrom` | Date Range Start | Input (`date`, `DatePicker`) | Date (`YYYY-MM-DD`) | — | Empty | Valid date; range rejected if `dateTo < dateFrom` | — | Start date for range filter. Published only when both ends are set. i18n: `audit.dateFrom`. |
| 11 | `txtDateTo` | Date Range End | Input (`date`, `DatePicker`) | Date (`YYYY-MM-DD`) | — | Empty | Valid date; range rejected if `dateTo < dateFrom` | — | End date for range filter. Clearing either end clears the whole range. i18n: `audit.dateTo`. |
| 12 | `lblDateRangeError` | Date Range Error | Static Label (`<p role="alert">`) | String | — | Hidden | — | — | Shown when `dateTo < dateFrom`; both pickers are marked invalid. Range is not published while invalid. i18n: `audit.invalidDateRange`. |
| 13 | `btnClearFilters` | Clear Filters Button | Button (`ghost`, small) | — | — | Hidden (`activeCount = 0`) | — | — | Resets all filter values (including search/date inputs) to defaults. Shown only when at least one filter is active. i18n: `audit.clearFilters`. |
| 14 | `lblActiveFilters` | Active Filters Badge | Badge | Number | — | Hidden (`count = 0`) | — | — | Shows count of active filters (`audit.activeFilters`, `{count}`). Hidden when count = 0. |

> Note: The `userId` and `entityId` filters exist only as URL query parameters (they can be set via the URL and are sent to the API when present). The filter bar renders **no** input for them, and no autocomplete user-search control is displayed on this screen.

### 4.3 Section [C]: Audit Log Table (監査ログテーブル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 15 | `chkSelectAll` | Select-All Checkbox (header) | Checkbox | Boolean | — | Unchecked (checked when every row on the page is selected) | — | — | Toggles selection of all rows currently displayed. i18n: `audit.selectAll`. |
| 16 | `chkSelectRow` | Row Selection Checkbox | Checkbox | Boolean | — | Unchecked | — | — | Select a row for deletion. Selected IDs are sent as `recordIds` in the delete request. i18n: `audit.selectRow`. |
| 17 | `colTimestamp` | Timestamp Column | Table Column | DateTime | Yes | Default sort: `created_at` DESC | `YYYY/MM/DD HH:mm:ss.SSS MMT` (Myanmar Time, UTC+6:30) | `audit_logs.created_at` | When the action occurred. Sortable. Width: 160px. i18n: `audit.timestamp`. |
| 18 | `colActor` | Actor Column | Table Column | String | Yes | — | Avatar initials + `Name` / `email` (second line) | `users.name` + `users.email` | User who performed the action; "System" (`SYS` avatar) when `userId` is null. Not sortable. i18n: `audit.actor` / `audit.system`. |
| 19 | `colAction` | Action Column | Table Column | String | Yes | — | Raw action code in a color-coded badge | `audit_logs.action` | Action code (e.g. `MERCHANT_APPROVE`). Sortable. Badge color derived from keywords (DELETE/REMOVE/REJECT → rose, APPROVE/CREATE/SUCCESS → emerald, UPDATE/EDIT → amber, PAID/PAY/EXPORT → indigo, otherwise muted). i18n: `audit.action`. |
| 20 | `colEntityType` | Entity Type Column | Table Column | String | Yes | — | Raw entity type in a muted badge | `audit_logs.entity_type` | Entity type affected. Sortable. i18n: `audit.entityType`. |
| 21 | `colSummary` | Summary Column | Table Column | String | Yes | — | Server-provided summary text (`—` when empty) | Computed server-side | Brief description derived from action + entity type. Truncated with `max-w-[200px]`. i18n: `audit.summary`. |
| 22 | `colIpAddress` | IP Address Column | Table Column | String | Yes | — | IP string in mono badge (`Unknown` when null) | `audit_logs.ip_address` | Client IP address. Not sortable. i18n: `audit.ipAddress` / `audit.unknownIp`. |
| 23 | `btnViewDetail` | View Detail Button | Button (icon, `outline`) | — | — | Visible per row. Icon: `Eye` (aria-label/title = "View Detail") | — | — | Opens audit log detail modal (Section 4.4) for that row. i18n: `audit.viewDetail`. |
| 24 | `lblEmptyState` | Empty State | Empty State | — | — | Hidden by default | — | — | Bot icon + "No matching records were found." (`audit.noLogs`), spanning all 8 columns, displayed when filtered results return 0 rows. |

> Sorting is available only on `created_at`, `action`, and `entity_type`. Clicking a sorted column again toggles asc/desc; clicking a new column resets order to DESC.

### 4.4 Section [E]: Audit Log Detail Modal (監査ログ詳細モーダル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 25 | `lblModalTitle` | Modal Title | Static Label (`<DialogTitle>`) | String | — | Visible. Text: "Audit Log Detail" | — | Hardcoded UI text | i18n: `audit.logDetail`. |
| 26 | `btnCloseModal` | Close Button | Button (primary) | — | — | Visible. Text: "Close" | — | — | Closes modal. Also closes on Escape key and overlay click. i18n: `audit.close`. |
| 27 | `lblDetailTimestamp` | Timestamp | Static Label | DateTime | Yes | — | `YYYY/MM/DD HH:mm:ss.SSS MMT` | `audit_logs.created_at` | Full Myanmar Time (UTC+6:30) timestamp with milliseconds, mono font. i18n: `audit.timestamp`. |
| 28 | `lblActorName` | Actor Name | Static Label | String | Conditional | — | String ("System" when no user) | `users.name` | Rendered whenever a detail payload exists; "System" if `userId` is null. i18n: `audit.actorName` / `audit.system`. |
| 29 | `lblActorEmail` | Actor Email | Static Label | String | Conditional | — | String | `users.email` | Hidden when `userEmail` is absent (system actions). i18n: `audit.actorEmail`. |
| 30 | `lblActorRole` | Actor Role | Badge | String | Conditional | — | Badge with role color | `users.role` | Badge colors: `admin`=red, `merchant`=blue, `buyer`=emerald, `super_admin`=purple. Hidden when `userRole` is absent. i18n: `audit.actorRole`. |
| 31 | `lblDetailAction` | Action | Static Label (mono) | String | Yes | — | Raw action code | `audit_logs.action` | Action performed. i18n: `audit.action`. |
| 32 | `lblDetailEntityType` | Entity Type | Static Label | String | Yes | — | Raw entity type | `audit_logs.entity_type` | Entity type affected. i18n: `audit.entityType`. |
| 33 | `lblChangeDetails` | Change Details Section | Section card | Object | Conditional | — | Humanized key/value list | `audit_logs.old_value` / `audit_logs.new_value` | Old/New values are rendered as readable key/value lists (keys converted from camelCase/snake_case to Title Case), **not** as pretty-printed JSON. Scalars are formatted (numbers grouped, percent/currency keywords formatted). Arrays are comma-separated; nested objects become nested lists; `null` renders as `—`. Section boxes scroll (`max-h-40`). When both values are null, shows "no change details" (`audit.noChangeDetails`). Server masks sensitive fields as `***`. i18n: `audit.changeDetails` / `audit.oldValue` / `audit.newValue`. |
| 34 | `lblDetailIpAddress` | IP Address | Static Label (mono) | String | Conditional | — | IP string or "Unknown" | `audit_logs.ip_address` | Client IP address. i18n: `audit.ipAddress` / `audit.unknownIp`. |
| 35 | `lblClientInfo` | Client Information Section | Section card + Badge | Object | Conditional | — | Parsed from `user_agent` | `audit_logs.user_agent` | Raw user agent is never displayed. It is parsed into: Client Type badge (Browser / Mobile App / API Client / Unknown), Client Browser, and Client Device (Desktop / Mobile / Tablet / Other / Unknown). The parsed block is hidden when `userAgent` is null. i18n: `audit.clientInfo` / `audit.clientType` / `audit.clientBrowser` / `audit.clientDevice`. |
| 36 | `lblDetailLoading` / `lblDetailError` | Loading / Error States | Skeleton / Alert | — | — | Hidden | — | — | Loading shows skeleton placeholders (`audit.loading`); a failed fetch shows "Audit log entry not found" (`audit.detailNotFound`). |

> Section [E] contains **no** Entity ID row and **no** "View User History" / "View Entity History" buttons — the API never returns `entityId`, and the modal only offers the Close action.

### 4.5 Section [D]: Pagination (ページネーション)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 37 | `lblPageInfo` | Page Info Text | Static Label | String | Yes | — | "Showing page {page} of {totalPages}" | `meta.page` / `meta.totalPages` | Rendered by the shared `PaginationControls` component (hardcoded English text, `data-testid="page-info"`; the `audit.pageInfo` key is not used by this control). |
| 38 | `btnPrevPage` | Previous Button | Button | — | — | Visible. Text: "Previous" | — | — | Navigate to previous page. Disabled on first page. i18n: `audit.previous`. |
| 39 | `btnPageNumbers` | Page Number Buttons | Button Group | — | — | — | Ellipsis-truncated page list | — | Page number navigation. i18n: `audit.pageNumbers`. |
| 40 | `btnNextPage` | Next Button | Button | — | — | Visible. Text: "Next" | — | — | Navigate to next page. Disabled on last page. i18n: `audit.next`. |
| 41 | `selPageSize` | Page Size Select | Select | Number | — | Default: `10` | Options: 10, 20, 50, 100 (`AUDIT_LOG_PAGE_SIZES`) | — | Items per page. Changing the page size resets to page 1. i18n: `audit.pageSize`. |

### 4.6 Section [F]: Manual Delete Confirmation Dialog (手動削除確認ダイアログ)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 42 | `lblDeleteDialogTitle` | Dialog Title | Static Label (`<DialogTitle>`) | String | — | Visible. Text: "Delete Audit Logs" | — | Hardcoded UI text | i18n: `audit.deleteDialogTitle`. |
| 43 | `lblDeleteWarning` | Warning Message | Alert (`destructive`) | — | — | Visible (title + description) | — | — | Title: `audit.deleteWarningTitle`, description: `audit.deleteWarning` — informs admin that deletion is permanent and applies to records >= 90 days. |
| 44 | `txtRetentionDays` | Retention Period Input | Input (`number`) | Number | — | Default: `90` (`AUDIT_LOG_MIN_RETENTION_DAYS`) | Min: 90, step 1 | — | Number of days. Records younger than this will NOT be deleted. Validated with the Zod schema on submit; errors shown after blur/submit attempt. i18n: `audit.retentionDays` / `audit.days`. |
| 45 | `lblMinRetention` | Minimum Retention Hint | Static Label | String | — | Visible | — | — | "Minimum: 90 days" hint below the input (`audit.minRetention`, `{days}`). |
| 46 | `lblRetentionError` | Retention Error | Static Label (`<p role="alert">`) | String | — | Hidden until touched + invalid | — | — | "Retention period must be at least 90 days" (`audit.retentionMin`). Input marked `aria-invalid`. |
| 47 | `lblDeleteScopeSummary` | Deletion Scope Summary | Static Label | String | Yes | — | Two variants | — | **No rows selected:** `audit.deleteScopeSummary` — "Audit log records older than {N} days will be permanently deleted." **Rows selected (count > 0):** `audit.deleteScopeSelected` — "{count} selected record(s) older than {N} days" scope text. The current list/search filters are NOT used to determine which records are deleted; eligibility is determined solely by `olderThanDays` (and, when provided, the explicit `recordIds`). Minimum retention is 90 days. |
| 48 | `lblDeleteApiError` | API Error Message | Static Label (`<p role="alert">`) | String | — | Hidden | — | — | Server error message (or `audit.deleteFailed` fallback) shown inline; dialog stays open for retry. |
| 49 | `btnConfirmDelete` | Confirm Delete Button | Button (`destructive`) | — | — | Visible. Text: "Confirm Delete" (during request: "Deleting...") | Disabled while pending or when validation fails | — | Triggers `DELETE /api/v1/admin/audit-logs/files` with `{ olderThanDays: <value> }` plus `{ recordIds: [...] }` when rows are selected. i18n: `audit.confirmDelete` / `audit.deleting`. |
| 50 | `btnCancelDelete` | Cancel Button | Button (`outline`) | — | — | Visible. Text: "Cancel" | — | — | Closes dialog without performing deletion; resets retention input to 90. i18n: `audit.cancel`. |

> On success the dialog closes, row selections are cleared, a success toast shows the deleted record count (`audit.deleteSuccess`, `{count}`), and both the list and filter-option caches are invalidated.

### 4.7 Section [G]: Export CSV Date-Range Dialog (エクスポート日付範囲ダイアログ)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- | :--- | :--- | :--- |
| 51 | `lblExportDialogTitle` | Dialog Title | Static Label (`<DialogTitle>`) | String | — | Visible. Text: "Export Audit Logs" | — | Hardcoded UI text | i18n: `audit.exportDialogTitle`. |
| 52 | `lblExportDialogDescription` | Dialog Description | Static Label (`<DialogDescription>`) | String | — | Visible | — | Hardcoded UI text | i18n: `audit.exportDialogDescription`. |
| 53 | `txtExportDateFrom` | Export Start Date | Input (`date`) | Date (`YYYY-MM-DD`) | Yes | Prefilled from the list filter `dateFrom` (may be empty) | Required (`audit.exportRangeRequired` when empty) | — | Sent as `dateFrom` in the export request. Disabled while pending. i18n: `audit.exportStartDate`. |
| 54 | `txtExportDateTo` | Export End Date | Input (`date`) | Date (`YYYY-MM-DD`) | Yes | Prefilled from the list filter `dateTo` (may be empty) | Required; must be >= start; range to end-of-day must be <= 365 days | — | Sent as `dateTo` in the export request. Disabled while pending. i18n: `audit.exportEndDate`. |
| 55 | `lblExportRangeError` | Export Range Error | Static Label (`<p role="alert">`) | String | — | Hidden | — | — | Inline validation message: missing dates (`audit.exportRangeRequired`), reversed range (`audit.invalidDateRange`), or range over 365 days (`audit.exportRangeTooLong`, `{days}`). |
| 56 | `btnExportConfirm` / `btnExportCancel` | Export / Cancel Buttons | Button (`submit` / `outline`) | — | — | Visible. Text: "Export CSV" / "Cancel" | — | — | Confirm submits the export with the current list filters + chosen range; disabled while pending (label switches to "Exporting..."). Cancel closes the dialog. i18n: `audit.exportCsv` / `audit.exporting` / `audit.cancel`. |

---

## 5. Item Behaviors & Event Specifications (各項目における挙動・イベント仕様)

### 5.1 Page Load (`/admin/audit-logs`)
- **Trigger:** Admin navigates to `/admin/audit-logs`.
- **Processing Logic:**
  1. **Authentication Check:** Verify JWT token and `admin` role.
  2. **Initial Data Load:** `GET /api/v1/admin/audit-logs` with default params (`page=1`, `limit=10`, `sortBy=created_at`, `sortOrder=desc`) plus any `userId` / `entityId` present in the URL.
  3. **Filter Options Load:** `GET /api/v1/admin/audit-logs/filters` (cached 5 minutes) to populate Action Filter and Entity Type Filter dropdowns.
  4. **Render:** Display audit log table with results (skeleton placeholders while loading).
- **Exception Handling:**
  - `403` (FORBIDDEN): Redirect to `/unauthorized` (page is unmounted after navigation).
  - Load failure (no cached data): Inline error banner (`role="alert"`) showing the server message or "Failed to load audit logs" (`audit.loadFailed`).
  - Network error: Banner shows the Axios error message or the fallback text.

### 5.2 Auto-Refresh Toggle (`tglAutoRefresh` onChange)
- **Trigger:** Admin toggles the auto-refresh switch.
- **Processing Logic:**
  1. **If enabled:** Start polling interval (30 seconds). On each interval, re-fetch audit log list with current filters.
  2. **If disabled:** Stop polling (`refetchInterval: false`). Retain current list data.
  3. **Pause behavior:** Polling is suspended automatically while the browser tab is hidden (`document.visibilityState !== 'visible'`) and never runs in the background (`refetchIntervalInBackground: false`).
- **Exception Handling:**
  - Refresh error with previously successful data: previous rows are preserved, a non-blocking error banner (`refreshError`) is shown, and the next interval retries automatically.

### 5.3 Export CSV (`btnExportCsv` onClick → dialog confirm)
- **Trigger:** Admin clicks "Export CSV" button.
- **Processing Logic:**
  1. **Empty-List Pre-Check:** If `meta.total === 0`, show an info toast (`audit.exportEmpty`) and do **not** open the dialog.
  2. **Open Dialog:** Otherwise open the Export CSV Date-Range Dialog (Section 4.7), prefilled with the current list `dateFrom`/`dateTo`.
  3. **Client-Side Validation:** Both dates required; end >= start; range to end-of-day <= 365 days (`AUDIT_LOG_EXPORT_MAX_RANGE_DAYS`). Errors render inline below the inputs.
  4. **Backend Dispatch:** `POST /api/v1/admin/audit-logs/export` with the current list filters + `{ dateFrom, dateTo, format: 'csv' }` (response type `blob`).
  5. **Backend Execution:** Validates the range (max 365 days, max 10,000 rows), streams a UTF-8 CSV attachment (BOM-prefixed, CRLF lines, MMT timestamps) named `audit-logs-{startDate}-{endDate}({today}).csv`.
  6. **Post-Execution UI:** Create a Blob URL, trigger the browser download with the filename from `Content-Disposition` (fallback name built client-side), close the dialog, and show a success toast (`audit.exportSuccess`).
- **Exception Handling:**
  - `400` / other API errors: unwrap the error Blob into JSON, show its `message`, falling back to `audit.exportFailed`.
  - Export button is disabled while the request is pending (label = "Exporting...").

### 5.4 Delete Audit Logs Button (`btnDeleteLogs` onClick)
- **Trigger:** Admin clicks "Delete Audit Logs" button.
- **Processing Logic:**
  1. **Authorization Check:** Verify admin role. Button hidden for non-admin users.
  2. **Open Dialog:** Clear any previous error and display Manual Delete Confirmation Dialog (Section 4.6).
- **Exception Handling:**
  - None (button hidden if not authorized).

### 5.5 Retention Period Input (`txtRetentionDays` onChange / onBlur)
- **Trigger:** Admin changes the retention period value and blurs the field (or attempts submit).
- **Processing Logic:**
  1. **Validation:** Zod `deleteAuditLogsSchema` — coerced integer, must be >= 90.
  2. **Update Summary:** The deletion scope summary text updates live with the typed value (and switches variant when rows are selected).
  3. **Enable/Disable Confirm:** Confirm button is disabled while the value is invalid.
- **Exception Handling:**
  - Invalid input: inline error (`audit.retentionMin`) with `aria-invalid` + `role="alert"`.

### 5.6 Confirm Delete (`btnConfirmDelete` onClick)
- **Trigger:** Admin clicks "Confirm Delete" button.
- **Processing Logic:**
  1. **Client-Side Pre-Check:** Validate retention period >= 90.
  2. **Backend Dispatch:** `DELETE /api/v1/admin/audit-logs/files` with `{ olderThanDays: <value> }`, plus `{ recordIds: [...] }` when rows were selected (the ID set is cleared on success).
  3. **Backend Execution:** Validate JWT token and admin role. When `recordIds` is given, verify every ID is eligible (age check) atomically and delete exactly those rows; otherwise delete DB records where `created_at` older than the threshold in controlled batches. Return `{ deletedRecords, deletedFiles }` (`deletedFiles` is always 0 — no export-file storage exists).
  4. **Post-Execution UI:** Close dialog, clear selections, show success toast with `deletedRecords` count, and invalidate list + filter caches.
- **Exception Handling:**
  - `400` (BAD_REQUEST): inline error message (e.g. "Minimum retention period is 90 days", "No records eligible for deletion").
  - `403` (FORBIDDEN): inline error message.
  - Other errors: inline error (`audit.deleteFailed` fallback); dialog remains open for retry.
  - Pending state: Confirm button disabled and labelled "Deleting..."; inputs disabled.

### 5.7 View Detail (`btnViewDetail` onClick)
- **Trigger:** Admin clicks the View Detail icon button on a log row.
- **Processing Logic:**
  1. **Set State:** Store the row ID; the modal opens and fetches `GET /api/v1/admin/audit-logs/:id`.
  2. **Backend Execution:** Find audit log entry by ID. Join with users table for actor details. Return full audit log DTO (no `entityId`).
  3. **Post-Execution UI:** Render Audit Log Detail Modal (Section 4.4) with skeleton while loading.
- **Exception Handling:**
  - Fetch failure: modal shows "Audit log entry not found" (`audit.detailNotFound`).

### 5.8 Row Selection (`chkSelectRow` / `chkSelectAll` onChange)
- **Trigger:** Admin toggles a row checkbox or the header select-all checkbox.
- **Processing Logic:**
  1. **Update State:** Add/remove the row ID in the `selectedIds` set; select-all adds/removes every ID of the current page (only when the page has rows).
  2. **Visual Feedback:** Selected rows carry `data-selected`; the scope text in the delete dialog switches to the "selected records" variant.
  3. **Delete Integration:** On delete confirm, the selected IDs are sent as `recordIds`. Selections are cleared after a successful delete.
- **Exception Handling:** None (selection is purely client-side).

### 5.9 Clear Filters (`btnClearFilters` onClick)
- **Trigger:** Admin clicks "Clear Filters" button (visible only when `activeCount > 0`).
- **Processing Logic:**
  1. **Reset State:** Reset all filter values to defaults (search box and date inputs included) and reset to page 1.
  2. **Re-fetch:** `GET /api/v1/admin/audit-logs` with default params.
  3. **Update UI:** Hide clear filters button and active filters badge.
- **Exception Handling:** None applicable.

### 5.10 Pagination (`btnPrevPage` / `btnNextPage` / `btnPageNumbers` / `selPageSize` onClick/onChange)
- **Trigger:** Admin clicks page navigation or changes page size.
- **Processing Logic:**
  1. **Update State:** Update `page` (page change) or `limit` + reset `page=1` (page size change).
  2. **Re-fetch:** `GET /api/v1/admin/audit-logs` with updated params.
  3. **Update UI:** Update table, pagination controls, and page info text.
- **Exception Handling:**
  - `400` (BAD_REQUEST): error banner with the server message.

### 5.11 Column Sorting (`colTimestamp` / `colAction` / `colEntityType` header click)
- **Trigger:** Admin clicks a sortable column header.
- **Processing Logic:**
  1. **Toggle/Reset:** Same column → toggle `asc`/`desc`; different column → set that column with `desc`.
  2. **Re-fetch:** `GET /api/v1/admin/audit-logs` with `sortBy` / `sortOrder`; page is not reset.
  3. **Update UI:** Sort icon switches between `ArrowUp` / `ArrowDown` (dimmed `ArrowUpDown` when the column is inactive).
- **Exception Handling:** None applicable.

---

## 6. Validation & Error Message Mapping (バリデーション及びエラーメッセージマッピング)

### 6.1 Filter Validation Errors

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-AUDIT-002** | `txtDateFrom` / `txtDateTo` | Both provided and `dateTo >= dateFrom` (range is not published otherwise) | Red text below the date range (`role="alert"`), both pickers marked invalid | "End date must be after start date" | "終了日は開始日より後である必要があります" |
| **VAL-AUDIT-004** | `txtIpAddressFilter` | Max 45 characters (enforced by `maxLength` on the input) | Input truncates at 45 chars | — | — |
| **VAL-AUDIT-006** | `txtSearch` | Max 255 characters (enforced by `maxLength` on the input) | Input truncates at 255 chars | — | — |

> `userId` / `entityId` have no visible controls, hence no client-side validation messages for them; if present in the URL they must be UUIDs (validated by the Zod query schema and by the backend DTO).

### 6.2 Pagination Validation Errors

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-AUDIT-010** | `selPageSize` | Value must be one of 10 / 20 / 50 / 100; Zod pipe allows 1–100 | Select offers only the allowed options | "Limit must be between 1 and 100" | "件数は1から100の間である必要があります" |

### 6.3 Export Validation Errors

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-AUDIT-020** | `format` | Required, must be `'csv'` (backend DTO) | Toast/API error message | "Export format must be CSV" | "エクスポート形式はCSVである必要があります" |
| **VAL-AUDIT-021** | Export dialog date range | Max 365 days measured to end-of-day | Inline error below the date inputs (`role="alert"`) | "Date range cannot exceed 365 days" | "日付範囲は365日を超えることはできません" |
| **VAL-AUDIT-022** | Row Count | Max 10,000 rows (backend) | Toast error with server message | "Export exceeds maximum row limit (10,000). Please narrow your filters." | "エクスポートが最大行制限（10,000）を超えています。フィルターを絞り込んでください。" |
| **VAL-AUDIT-023** | Export dialog dates | Both dates required | Inline error below the date inputs | "Start and end dates are required" (i18n `audit.exportRangeRequired`) | "開始日と終了日は必須です" |

### 6.4 Delete Validation Errors

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-AUDIT-030** | `txtRetentionDays` | Coerced integer >= 90 | Red text below field after blur/submit (`role="alert"`), `aria-invalid`, Confirm disabled | "Retention period must be at least 90 days" | "保持期間は最低90日である必要があります" |
| **VAL-AUDIT-031** | `recordIds` (when rows selected) | Every selected record must satisfy the retention age check (backend, atomic) | Inline error in the delete dialog | "No records eligible for deletion" (server message) | "削除対象のレコードがありません" |

### 6.5 API Error Responses

| HTTP Status | Error Code | Scenario | UI Display |
| :--- | :--- | :--- | :--- |
| `400` | `BAD_REQUEST` | Invalid filter/export/delete parameters | Error banner (list) or inline message (dialogs) with the server `message` |
| `403` | `FORBIDDEN` | Non-admin access attempt | Redirect to `/unauthorized` (list); inline message (mutations) |
| `404` | `NOT_FOUND` | Audit log entry not found | Detail modal: "Audit log entry not found" |
| `500` | `INTERNAL_SERVER_ERROR` | Server error | Error banner / toast with server message or `audit.loadFailed` / `audit.deleteFailed` / `audit.exportFailed` |

### 6.6 Validation Enforcement Layers

1. **Frontend (Client)**: Zod schemas (`auditLogQuerySchema`, `deleteAuditLogsSchema`) with real-time feedback; React Hook Form is **not** used on this screen — dialogs manage state with local `useState` + `safeParse`.
2. **Backend (Server)**: NestJS ValidationPipe + class-validator DTOs on all endpoints.
3. **Database (Constraint)**: DB indexes as performance safety net.

---

## 7. Responsive Layout Behavior (レスポンシブレイアウト動作)

### 7.1 Desktop (≥1024px)
- Full table layout with all columns visible (horizontally scrollable container)
- Filter card as a 4-column grid (`lg:grid-cols-4`), date range on a full-width row
- Centered detail modal (max width 40rem, height up to 85dvh) for detail view
- Centered dialogs (max width 28rem / `max-w-md`) for export range and delete confirmation

### 7.2 Tablet (768px-1023px)
- Responsive table with horizontal scroll
- Wrapped filter grid (2 columns)
- Centered modal/dialog (`md:` breakpoint applies the centered, bordered style)

### 7.3 Mobile (<768px)
- Scrollable table in a card container (stacked filter layout, single-column grid)
- Detail modal, export dialog, and delete dialog render full-screen (`h-dvh`, no rounding) with internal scroll

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
