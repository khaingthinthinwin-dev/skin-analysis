# DD_AUDIT_02 — Frontend Page Design

> **Doc ID:** SKM-DD-AUDIT-02 | **Version:** 1.1 | **Status:** Draft  
> **Last Updated:** 2026-09-09

---

## 1. Page and Route

- **Route:** `/admin/audit-logs`
- **Access:** authenticated `admin` only; anonymous users go to login and authenticated non-admin users go to Unauthorized.
- **Page:** `AuditLogPage.tsx`; desktop table, tablet scrollable table, mobile card list.

## 2. Component Structure

```text
AuditLogPage
├─ AuditLogHeader (back, auto-refresh, export, delete)
├─ AuditLogFilters (user, action, entity type, dates, IP, entity ID, search)
├─ ActiveFilterSummary
├─ AuditLogTable / AuditLogCards
│  ├─ EmptyState
│  └─ AuditLogRow → View detail / entity link
├─ Pagination
├─ AuditLogDetailModal
└─ DeleteAuditLogsDialog
```

## 3. Query State

The URL is the shareable source of filter state. On load, parse it and merge valid values with defaults: `page=1`, `limit=50`, `sortBy=created_at`, `sortOrder=desc`. Filter changes reset `page` to 1. Multiple filters combine with AND logic. Serialize each multi-select as repeated query keys (for example, `?action=merchant.approve&action=order.status_change`); do not serialize a JSON array. Debounce free-text search before updating the query; date range is applied only when both ends are valid. A date-only `dateFrom` means `00:00:00.000Z` and a date-only `dateTo` means `23:59:59.999Z`.

```typescript
type AuditLogQueryState = {
  userId?: string; action?: string[]; entityType?: string[]; entityId?: string;
  dateFrom?: string; dateTo?: string; ipAddress?: string; search?: string;
  page: number; limit: 25 | 50 | 100 | 200;
  sortBy: 'created_at' | 'action' | 'entity_type'; sortOrder: 'asc' | 'desc';
};
```

## 4. Screen Items and Behavior

| Area | Item IDs | Implementation behavior |
|---|---|---|
| Header | A1–A5 | Title, dashboard link, 30-second refresh toggle, CSV export (always visible and enabled regardless of current result count), and delete action. Delete is visible only to admins. |
| Filters | B1–B9 | User/UUID, multi-action, multi-entity type, date range, IP, entity UUID, search, clear, active-count badge. |
| Results | C1–C10 | Timestamp, actor, action, entity type/ID, summary, IP, row detail action, and empty state. Sort only supported backend fields. |
| Row Selection | chkSelectRow | Checkbox per row for explicit deletion. Select-all toggles only visible rows. When one or more rows are selected, the delete dialog sends their IDs as `recordIds`; when none are selected, it performs the retention-wide deletion described below. |
| Pagination | D1–D5 | Info, previous/next, up to five page buttons/ellipsis, and 25/50/100/200 selector. |
| Detail | E1–E14 | Focus-trapped modal with actor/entity/context, masked pretty JSON, and history shortcuts. |
| Delete dialog | F1–F7 | Warning, retention-days input (default/minimum 90), dynamic scope text, cancel/confirm. With selected rows, it shows the selected-record count; otherwise it shows the retention-wide scope. Current list filters never broaden deletion targets. Server eligibility is authoritative. |

## 5. Client Validation

Use React Hook Form and a Zod schema. UUID fields require UUID format; IP input is ≤45 characters; search is ≤255; `dateTo >= dateFrom`; limit is 1–200; and deletion retention is an integer at least the configured `AUDIT_LOG_MIN_RETENTION_DAYS` (90 by default). Display field errors inline in an `aria-live="polite"` region. Server validation remains authoritative.

## 6. Data Fetching and Mutations

- Use TanStack Query keyed by normalized query state: `['audit-logs', query]`.
- Load filter options with `['audit-log-filters']`; do not refetch needlessly while a dropdown is open.
- The detail request is enabled only after a row is selected.
- Export/delete are mutations. Disable their initiating controls while the mutation request is pending and surface returned API messages in a toast. Export button remains enabled regardless of result count. On click, the client uses the current query total as an advisory empty-result check and explains that there are no matching records; the server remains authoritative for all export validation. A successful response opens the short-lived signed download URL immediately.
- After delete success, close the dialog, invalidate list/filter queries, and refetch the current list.

## 7. Auto-Refresh

When enabled, refetch the current list every 30 seconds. Never start a second request while one is running; pause while `document.visibilityState !== 'visible'`; preserve old rows on failure and show a non-blocking notification. It must reuse current filters, sorting, pagination, and must never trigger export or deletion.

## 8. Detail Presentation and Navigation

Format timestamps as full UTC with milliseconds. Render `System` for null actor, hide unavailable actor email/role and entity links, render null IP as `Unknown`, truncate user agent at 200 characters with accessible full-text tooltip, and JSON stringify old/new values with two-space indentation after masking sensitive keys. Entity links map Merchant/Product/Order/Advertisement/User to their matching admin detail pages. History buttons close the modal and replace query state with `userId` or `entityType` + `entityId`.

## 9. Accessibility, Responsive Design, and i18n

All controls have labels, keyboard operation, visible focus, WCAG 2.1 AA contrast, and translated EN/JA/MY strings under `audit.*`. Escape/overlay/Close close the modal; focus returns to its trigger. Desktop (≥1024px) uses full table and 400px side modal; tablet uses wrapped filters and scrollable table; mobile (<768px) uses stacked filters, cards, and full-screen modal/dialog.

## 10. Error UX

`403` navigates to Unauthorized; `404` detail shows “Audit log entry not found”; filter errors are inline; export over-limit explains how to narrow filters; network/server errors preserve prior visible data where available and use a toast. A delete failure keeps the dialog open for retry.

## 11. Cross-References

See [module overview](./DD_Audit_Log_01_MODULE_OVERVIEW.md), [API contract](./DD_Audit_Log_03_API_ENDPOINTS.md), and the screen-item specification.
