# DD_AUDIT_06 — Test Specification

> **Doc ID:** SKM-DD-AUDIT-06 | **Version:** 1.2 | **Status:** Draft  
> **Last Updated:** 2026-10-21

---

## 1. Scope

This specification covers backend unit/controller tests, frontend component tests, and critical E2E paths for the Audit Log module. Mock persistence and HTTP at their boundaries; no test accesses a live audit-log service.

## 2. Backend Unit Tests (`src/modules/admin/audit-logs/`)

| Suite | Scenario | Expected result |
|---|---|---|
| list | Default query | `created_at DESC`, page 1, server limit 50; actor join included; `entityId` absent from the payload. |
| list | Combined action/entity-type/date/IP/text filters | AND predicates and correct paged total. |
| list | Invalid UUID, date, page, limit, sort | `BadRequestException`. |
| list | Single and repeated action/entity query values; Myanmar Time date-only boundaries | Values normalize to arrays; start/end dates include the intended MMT days. |
| list | Partial range or end before start | `BadRequestException`. |
| list | IP filter | Matches the address and its `::ffff:`/IPv4-mapped variants. |
| list | Action filter includes `AUDIT_LOG_DELETE` | Legacy `audit.admin.delete` rows are matched too. |
| detail | Existing record | Full detail with actor and JSON values; `entityId` absent. |
| detail | Missing record | `NotFoundException`. |
| sanitization | Password/token/secret fields | Never present unmasked in list/detail/export. |
| filters | Catalog ∪ recorded values | Correct sorted arrays returned; legacy `audit.admin.delete` hidden. |
| export | Valid CSV under row cap | Read-only query, CSV columns/escaping correct, MMT timestamps, UTF-8 BOM, `audit-logs-startDate-endDate(today).csv` name, streamed as an attachment. |
| export | Range >365 days or >10,000 rows | `BadRequestException`; no file and no audit-record mutation. |
| export | Self-audit event | `AUDIT_EXPORT` appended; failure to append does not fail the export. |
| delete | Eligible 90+ day records | Controlled deletion and exact counts returned; `deletedFiles` is 0. |
| delete | Threshold below configured minimum, young/missing explicit target, no eligible targets | `BadRequestException`; explicit-ID requests are atomic and no protected data is removed. |
| authorization | Buyer/merchant/no token | Guard rejects all endpoints. |

Mock `PrismaService`, the clock, and the audit writer. Assert no scheduled auto-purge exists and that export never invokes delete/update persistence methods.

## 3. Controller Tests

| Request | Cases |
|---|---|
| `GET /api/v1/admin/audit-logs` | 200 valid query; 400 malformed query; 403 non-admin. |
| `GET /api/v1/admin/audit-logs/filters` | 200 options; 403 non-admin; must not be captured by `/:id`. |
| `GET /api/v1/admin/audit-logs/:id` | 200 detail; 400 invalid UUID; 404 missing. |
| `POST /api/v1/admin/audit-logs/export` | 200 CSV attachment with `Content-Disposition`; 400 CSV/range/row validation. |
| `DELETE /api/v1/admin/audit-logs/files` | 200 counts; 400 threshold/no eligible target; 403 non-admin. |

## 4. Frontend Component Tests (Vitest + React Testing Library)

| Component | Scenarios |
|---|---|
| `AuditLog` (page) | Default request/query (limit 10), loading state, error preserves earlier results, empty state, 403 redirect to `/unauthorized`. |
| `AuditLogHeader` | Auto-refresh toggle, export blocked with an info toast when the list is empty, delete opens the dialog. |
| `AuditLogFilters` | Valid filter submission, clear resets state, active count, date/IP/search validation, search debounce, range error when `dateTo < dateFrom`. |
| `AuditLogTable` | Columns, row selection and select-all, sortable supported fields, MMT timestamp format, empty state; no entity-ID column. |
| `AuditLogPagination` | First/last disabled states, page change, page-size reset to first page, 10/20/50/100 options. |
| `AuditLogDetailModal` | Full details, System/null presentation, humanized key/value rendering, parsed client info, Escape/focus return; no entity-ID row and no history buttons. |
| `AutoRefresh` | Starts/stops at 30 sec, keeps current query, pauses when hidden/in flight, preserves data on error. |
| `AuditLogExportDialog` | Required start/end dates, reversed range, 365-day cap, inline errors, pending state. |
| `Export` | Current filters plus the chosen range sent with csv, advisory empty-result feedback, successful blob download with the server filename. |
| `DeleteAuditLogsDialog` | Configured minimum default, below-minimum value disables confirm, selected-ID versus retention-wide scope, success invalidation/close/selection reset, failure remains open. |
| i18n/a11y | EN/JA/MY labels, labelled controls, live validation error, keyboard modal behavior. |

## 5. End-to-End Scenarios (Playwright)

| ID | Flow |
|---|---|
| E2E-AUDIT-01 | Admin opens list and sees a newest-first page of 10. |
| E2E-AUDIT-02 | Apply multiple filters/search, share URL, then clear filters. |
| E2E-AUDIT-03 | Open detail and inspect the humanized before/after values and parsed client information. |
| E2E-AUDIT-04 | Export filtered data from the date-range dialog; verify only the selected result set is exported and the file downloads. |
| E2E-AUDIT-05 | Attempt an oversized/date-range export and receive guidance without data deletion. |
| E2E-AUDIT-06 | Enable auto-refresh, verify 30-second re-query and pause while tab hidden. |
| E2E-AUDIT-07 | Delete eligible 90-day data; verify success counts and refreshed list. |
| E2E-AUDIT-08 | Attempt deletion at 89 days and verify protected records remain. |
| E2E-AUDIT-09 | Buyer and merchant routes are denied; admin routes are allowed. |
| E2E-AUDIT-10 | Desktop/tablet/mobile layouts and modal focus behavior. |
| E2E-AUDIT-11 | Select eligible rows for deletion; then include one young row and verify the complete explicit-ID request is rejected with no deletion. |

## 6. Coverage Requirements

| Category | Minimum |
|---|---:|
| Backend unit tests | 90% |
| Frontend component tests | 85% |
| E2E critical paths | 100% |
| Integration tests | 80% |

## 7. Cross-References

Test the API and rules in [DD_AUDIT_03](./DD_Audit_Log_03_API_ENDPOINTS.md) and [DD_AUDIT_05](./DD_Audit_Log_05_BUSINESS_LOGIC.md).
