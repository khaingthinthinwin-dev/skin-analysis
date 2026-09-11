# DD_AUDIT_06 — Test Specification

> **Doc ID:** SKM-DD-AUDIT-06 | **Version:** 1.1 | **Status:** Draft  
> **Last Updated:** 2026-09-09

---

## 1. Scope

This specification covers backend unit/controller tests, frontend component tests, and critical E2E paths for the Audit Log module. Mock persistence, storage, and HTTP at their boundaries; no test accesses a live audit-log service.

## 2. Backend Unit Tests (`src/modules/admin/audit-logs/`)

| Suite | Scenario | Expected result |
|---|---|---|
| list | Default query | `created_at DESC`, page 1, limit 50; actor join included. |
| list | Combined user/action/entity/date/IP/text filters | AND predicates and correct paged total. |
| list | Invalid UUID, date, page, limit, sort | `BadRequestException`. |
| list | Single and repeated action/entity query values; UTC date-only boundaries | Values normalize to arrays; start/end dates include the intended UTC days. |
| list | Partial range or end before start | `BadRequestException`. |
| detail | Existing record | Full detail with actor and JSON values. |
| detail | Missing record | `NotFoundException`. |
| sanitization | Password/token/secret fields | Never present unmasked in list/detail/export. |
| filters | Distinct action/entity values | Correct arrays returned. |
| export | Valid CSV under row cap | Read-only query, CSV columns/escaping correct, private signed URL and five-minute expiry returned. |
| export | Range >365 days or >10,000 rows | `BadRequestException`; no file and no audit-record mutation. |
| delete | Eligible 90+ day records/files | Controlled deletion and exact counts returned. |
| delete | Threshold below configured minimum, young/missing explicit target, no eligible targets | `BadRequestException`; explicit-ID requests are atomic and no protected data is removed. |
| authorization | Buyer/merchant/no token | Guard rejects all endpoints. |

Mock `PrismaService`, export storage, clock, and audit writer. Assert no scheduled auto-purge exists and that export never invokes delete/update persistence methods.

## 3. Controller Tests

| Request | Cases |
|---|---|
| `GET /api/v1/admin/audit-logs` | 200 valid query; 400 malformed query; 403 non-admin. |
| `GET /api/v1/admin/audit-logs/filters` | 200 options; 403 non-admin; must not be captured by `/:id`. |
| `GET /api/v1/admin/audit-logs/:id` | 200 detail; 400 invalid UUID; 404 missing. |
| `POST /api/v1/admin/audit-logs/export` | 200 download URL; 400 CSV/range/row validation. |
| `DELETE /api/v1/admin/audit-logs/files` | 200 counts; 400 threshold/no eligible target; 403 non-admin. |

## 4. Frontend Component Tests (Vitest + React Testing Library)

| Component | Scenarios |
|---|---|
| `AuditLogPage` | Default request/query, loading state, error preserves earlier results, empty state. |
| `AuditLogFilters` | Valid filter submission, clear resets state, active count, UUID/date/IP/search validation, search debounce. |
| `AuditLogTable` | Columns/cards, row detail action, sortable supported fields, entity link mapping and null values. |
| `Pagination` | First/last disabled states, page change, page-size reset to first page. |
| `AuditLogDetailModal` | Full details, System/null presentation, masked formatted JSON, 200-character user-agent truncation, Escape/focus return, history navigation. |
| `AutoRefresh` | Starts/stops at 30 sec, keeps current query, pauses when hidden/in flight, preserves data on error. |
| `Export` | Current filters sent with csv, advisory empty-result feedback, disabled pending state, row-limit toast, successful signed download action. |
| `DeleteAuditLogsDialog` | Configured minimum default, below-minimum value disables confirm, selected-ID versus retention-wide scope, success invalidation/close, failure remains open. |
| i18n/a11y | EN/JA/MY labels, labelled controls, live validation error, keyboard modal behavior. |

## 5. End-to-End Scenarios (Playwright)

| ID | Flow |
|---|---|
| E2E-AUDIT-01 | Admin opens list and sees newest-first page of 50. |
| E2E-AUDIT-02 | Apply multiple filters/search, share URL, then clear filters. |
| E2E-AUDIT-03 | Open detail, inspect masked JSON, navigate to actor and entity history. |
| E2E-AUDIT-04 | Export filtered data successfully; verify only selected result set is exported. |
| E2E-AUDIT-05 | Attempt an oversized/date-range export and receive guidance without data deletion. |
| E2E-AUDIT-06 | Enable auto-refresh, verify 30-second re-query and pause while tab hidden. |
| E2E-AUDIT-07 | Delete eligible 90-day data; verify success counts and refreshed list. |
| E2E-AUDIT-08 | Attempt deletion at 89 days and verify protected records/files remain. |
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
