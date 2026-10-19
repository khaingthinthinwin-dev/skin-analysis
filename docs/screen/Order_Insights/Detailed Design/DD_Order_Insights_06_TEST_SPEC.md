# DD_OI_06 - Test Specification

> Doc ID: SKM-DD-OI-06 | Version: 2.0 | Status: Source-aligned coverage inventory | Last Updated: 2026-10-15

## 1. Purpose

This document lists checked-in Order Insights related tests and distinguishes implemented assertions from TODO E2E scenarios. It does not claim coverage percentages. Tests were not run as part of this documentation update.

## 2. Backend test files present

| Test file | Area |
|---|---|
| `backend/src/modules/buyer/orders/orders.controller.spec.ts` | Orders controller behavior. |
| `backend/src/modules/buyer/orders/orders.service.spec.ts` | Order creation, list/detail/tracking service behavior. |
| `backend/src/modules/buyer/orders/dto/order-list-query.dto.spec.ts` | Order list query validation. |
| `backend/src/modules/shared/order-insights/merchant-order-insights.controller.spec.ts` | Summary controller delegation. |
| `backend/src/modules/shared/order-insights/merchant-summary.service.spec.ts` | Summary scopes, calculations, cache, rate limit, and audit cases. |
| `backend/src/modules/shared/order-insights/period-window.spec.ts` | UTC period window calculations. |
| `backend/src/modules/shared/order-insights/order-insights.module.spec.ts` | Module wiring. |
| `backend/src/modules/merchant/order-fulfillment/order-fulfillment.controller.spec.ts` | Fulfillment controller behavior. |
| `backend/src/modules/merchant/order-fulfillment/order-fulfillment.service.spec.ts` | Merchant detail/tracking/status transition behavior. |

See each test file for exact assertions; this table does not imply every edge case is covered.

## 3. Frontend test files present

Relevant page tests: `MerchantOrderInsightsPage.test.tsx`, `MerchantOrderDetailPage.test.tsx`, `AdminOrdersPage.test.tsx`, and `AdminOrderDetailPage.test.tsx` under `frontend/src/pages/order-insights/`.

Relevant feature tests include merchant/admin order hooks and services, summary hooks, query parameter handling, merchant table/empty state/export, revenue summary and period controls, custom range modal, admin table/filter/KPI components, status transition control, CSV utilities, invoice/print utilities, and search/date helpers. Consult `rg --files frontend/src/features/order-insights` for the current list; do not cite absent buyer page tests.

## 4. E2E status

`e2e/tests/Order_Insights/order-insights.spec.ts` defines buyer, merchant, and admin smoke scenarios. Several bodies are TODO placeholders (detail navigation verification, tracking assertions, summary assertions, filter assertions, export download verification). The file is not evidence that the former complete 21-scenario matrix is implemented. Page helper: `e2e/pages/Order_Insights/OrderInsightsPage.ts`.

## 5. Future source-aligned test checklist

These are recommended scenarios, not claims about existing coverage:

1. Merchant list defaults; URL query state; status/payment/date/search; sorting; reset; page-size/page reset; completed tile shortcut.
2. Loading/placeholder data, empty state, retryable errors, 403 page-level access denied.
3. Summary period changes, custom date validation, UTC range labels, whole-Ks formatting, count/rate captions.
4. Export fetches every matching page and respects active filters; disabled while loading or when total is zero.
5. Buyer/merchant/admin scope and role-specific list/detail projections.
6. Summary UTC boundaries, empty periods, current-rate commission calculation, cache key/TTL, and summary-only 30-per-minute throttling.
7. Merchant fulfillment scope, valid transitions, transactional history update, and applicable COD payment behavior.
8. E2E cases that replace current TODOs with real detail, tracking, filtering, summary, and export assertions.

## 6. Removed stale assertions

- Coverage thresholds 90% backend, 85% frontend, 100% E2E, and 80% integration are not established by checked-in configuration and are removed.
- No mounted buyer tracking route is present.
- Summary endpoints have a 30-per-minute service throttle; the inspected order list/detail service does not implement the old 60-per-minute limit.
- Merchant currency display rounds to whole Ks, not two decimal places.
- E2E TODOs do not prove full role isolation, responsive behavior, language switching, or export correctness.

## 7. Cross-references

- [Frontend Page](./DD_Order_Insights_02_FRONTEND_Page.md)
- [API Endpoints](./DD_Order_Insights_03_API_ENDPOINTS.md)
- [DTOs and Types](./DD_Order_Insights_04_DTOS_AND_TYPES.md)
- [Business Logic](./DD_Order_Insights_05_BUSINESS_LOGIC.md)