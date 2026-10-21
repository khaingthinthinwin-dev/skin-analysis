# DD_AUDIT_02 — Frontend Page Design

> **Doc ID:** SKM-DD-AUDIT-02 | **Version:** 1.2 | **Status:** Draft  
> **Last Updated:** 2026-10-21

---

## 1. Page and Route

- **Route:** `/admin/audit-logs`
- **Access:** authenticated `admin` only; anonymous users go to login and authenticated non-admin users go to Unauthorized (a `403` list response navigates to `/unauthorized`).
- **Page:** `src/pages/admin/AuditLog.tsx`; desktop table, tablet scrollable table, mobile full-screen modal/dialogs.

## 2. Component Structure

```text
AuditLog (src/pages/admin/AuditLog.tsx)
├─ AuditLogHeader (title/subtitle, auto-refresh, export, delete)
├─ AuditLogFilters (search, action, entity type, IP, date range, clear, active-count badge)
│  └─ MultiSelect / DatePicker helpers
├─ AuditLogTable (rows, select-all, row selection, sort headers, empty state)
├─ AuditLogPagination (shared PaginationControls, page sizes 10/20/50/100)
├─ AuditLogDetailModal
├─ AuditLogExportDialog (start/end date, inline validation)
└─ DeleteAuditLogsDialog (retention days, dynamic scope text)
```

## 3. Query State

The URL is the shareable source of filter state. On load, parse it and merge valid values with defaults: `page=1`, `limit=10`, `sortBy=created_at`, `sortOrder=desc`. Filter changes reset `page` to 1. Multiple filters combine with AND logic. Serialize each multi-select as repeated query keys (for example, `?action=MERCHANT_APPROVED&action=AD_REJECTED`); do not serialize a JSON array. Debounce free-text search (300 ms) before updating the query; the date range is applied only when both ends are valid. A date-only `dateFrom` means `00:00:00.000` and a date-only `dateTo` means `23:59:59.999` in Myanmar Time (UTC+6:30) — the server applies the same day boundaries.

```typescript
type AuditLogQueryState = {
  userId?: string; action?: string[]; entityType?: string[]; entityId?: string;
  dateFrom?: string; dateTo?: string; ipAddress?: string; search?: string;
  page: number; limit: 10 | 20 | 50 | 100;
  sortBy: 'created_at' | 'action' | 'entity_type'; sortOrder: 'asc' | 'desc';
};
```

`userId` and `entityId` are URL-only parameters: the filter bar renders no control for them.

## 4. Screen Items and Behavior

| Area | Item IDs | Implementation behavior |
|---|---|---|
| Header | A1–A5 | Title with icon, subtitle, 30-second refresh toggle, CSV export (opens the export dialog; blocked with an info toast when the list is empty), and delete action. Delete is visible only to admins. There is no "back to dashboard" control. |
| Filters | B1–B7 | Search, multi-action, multi-entity type, IP, date range (from/to pickers with inline range error), clear, active-count badge. |
| Results | C1–C11 | Select-all checkbox, row selection checkbox, timestamp, actor, action, entity type, summary, IP, view-detail action, and empty state. Sort only supported backend fields. There is no entity-ID column. |
| Row Selection | chkSelectRow / chkSelectAll | Checkbox per row for explicit deletion; select-all toggles only the visible rows. When one or more rows are selected, the delete dialog sends their IDs as `recordIds`; when none are selected, it performs the retention-wide deletion described below. |
| Pagination | D1–D5 | Info, previous/next, page buttons/ellipsis, and the 10/20/50/100 selector (default 10). |
| Detail | E1–E15 | Focus-trapped modal with basic info, humanized old/new value lists, IP, and parsed client information. There is no entity-ID row and no history shortcuts. |
| Export dialog | G1–G7 | Start/end date inputs (both required, max 365 days, inline validation), export and cancel actions. |
| Delete dialog | F1–F8 | Warning, retention-days input (default/minimum 90), dynamic scope text, inline API error, cancel/confirm. With selected rows it shows the selected-record count; otherwise it shows the retention-wide scope. Current list filters never broaden deletion targets. Server eligibility is authoritative. |

## 5. Client Validation

Use Zod schemas (`auditLogQuerySchema`, `deleteAuditLogsSchema`) — React Hook Form is not used on this screen; dialogs manage local state and call `safeParse`. UUID fields require UUID format; IP input is ≤45 characters; search is ≤255; `dateTo >= dateFrom`; limit is 1–100; and deletion retention is an integer at least the configured `AUDIT_LOG_MIN_RETENTION_DAYS` (90 by default). Display field errors inline in an `aria-live="polite"` region. Server validation remains authoritative.

## 6. Data Fetching and Mutations

- Use TanStack Query keyed by normalized query state: `['audit-logs', 'list', query]`.
- Load filter options with `['audit-log-filters']` (5-minute stale time); do not refetch needlessly while a dropdown is open.
- The detail request is enabled only after a row is selected (`['audit-logs', 'detail', id]`).
- Export/delete are mutations. Disable their initiating controls while the mutation request is pending and surface returned API messages in a toast. The export button stays enabled regardless of result count; on click the client uses the current query total as an advisory empty-result check and shows an info toast instead of opening the dialog. A successful export response is a CSV blob that is downloaded through an object URL using the filename from `Content-Disposition` (client-side fallback `audit-logs-startDate-endDate(today).csv`).
- After delete success, close the dialog, clear the row selection, invalidate list/filter queries, and refetch the current list.

## 7. Auto-Refresh

When enabled, refetch the current list every 30 seconds. Never start a second request while one is running; pause while `document.visibilityState !== 'visible'` and never refresh in the background (`refetchIntervalInBackground: false`); preserve old rows on failure and show a non-blocking notification. It must reuse current filters, sorting, pagination, and must never trigger export or deletion.

## 8. Detail Presentation and Navigation

Format timestamps in Myanmar Time as `YYYY/MM/DD HH:mm:ss.SSS MMT`. Render `System` for a null actor, hide unavailable actor email/role, render a null IP as `Unknown`, render old/new values as humanized key/value lists (keys converted from camelCase/snake_case to Title Case, nested objects and arrays expanded, `null` shown as `—`) instead of raw JSON, and parse the user agent into client type, browser, and device instead of printing the raw string. No entity links and no history navigation exist — `entityId` is never returned by the API.

## 9. Accessibility, Responsive Design, and i18n

All controls have labels, keyboard operation, visible focus, WCAG 2.1 AA contrast, and translated EN/JA/MY strings under `audit.*`. Escape/overlay/Close close the modal; focus returns to its trigger. Desktop (≥1024px) uses the full table, a four-column filter card, and a centered detail modal (max 40rem); tablet uses a two-column filter grid and scrollable table; mobile (<768px) uses a single-column filter grid, a scrollable table, and full-screen modal/dialogs.

## 10. Error UX

`403` navigates to Unauthorized; `404` detail shows "Audit log entry not found"; filter errors are inline; export errors are unwrapped from the error blob and shown as a toast; network/server errors preserve prior visible data where available and use a toast. A delete failure keeps the dialog open for retry.

## 11. Cross-References

See [module overview](./DD_Audit_Log_01_MODULE_OVERVIEW.md), [API contract](./DD_Audit_Log_03_API_ENDPOINTS.md), and the screen-item specification.
