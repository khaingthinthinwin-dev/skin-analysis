# DD_OI_02 — Frontend Page: Merchant Order Insights

> **Doc ID:** SKM-DD-OI-02
> **Version:** 2.0
> **Status:** Revised to match current source code
> **Last Updated:** 2026-10-15
> **Source of truth:** `frontend/src/pages/order-insights/MerchantOrderInsightsPage.tsx` and the components, hooks, schemas, types, services, and route registration referenced below.

---

## 1. Scope and implementation status

This document specifies the implemented **Merchant Order Insights** screen at `/merchant/order-insights`. It replaces the previous draft's description of seven buyer, merchant, and admin screens: those other screens are separate pages and are not part of this screen's frontend specification.

The page is a read-only order and summary view. It does not change order status. The completed-orders tile only applies the `delivered` filter and scrolls to the order list. Opening a row navigates to merchant order detail.

The route is registered in `frontend/src/app/routes.tsx` and renders `frontend/src/pages/order-insights/MerchantOrderInsightsPage.tsx`. The older `frontend/src/pages/shared/OrderInsights.tsx` is a separate static demonstration with hard-coded sample rows; it is not the `/merchant/order-insights` implementation and must not be used as its data or behavior specification.

### 1.1 Page composition

| Region | Current implementation | Behavior |
|---|---|---|
| Header | Page title and shop-scope note | Localized title “Order Insights”; note states orders are for the merchant's shop. |
| Sales summary | `SalesSummaryTiles` | Today's orders, this month's orders, and completed orders. Completed is an interactive shortcut to the delivered list. |
| Revenue summary | `RevenueSummaryGroup` | Sales, Commission, Revenue, and AOV for a selectable period; custom range opens a dialog. |
| Order list | `OrderFilterBar` + `MerchantOrderTable` | Filters, search, sort, row navigation, errors, and an empty state. |
| Pagination | `OrderPagination` | Shown when the response total is greater than zero; page sizes 10, 20, and 50. |
| Export | `ExportMerchantOrdersDialog` | Opened from the filter bar; disabled while list data is loading or when there are no matching orders. |
| Access denied | Inline destructive alert | A 403 from any page query replaces the page with “Access denied” and the server message or approval fallback. |

### 1.2 Route and role

| Property | Specification |
|---|---|
| Route | `/merchant/order-insights` |
| Page component | `MerchantOrderInsightsPage` |
| Intended role | Merchant; backend summary controller also permits admin and super-admin roles. |
| Data scope | Orders and summaries are server-scoped to the current merchant/shop. The client does not select a merchant scope. |
| Approval behavior | A 403 is rendered as an access-denied alert; the fallback explains that the merchant account may not be approved. |
| Writes | No status mutation is performed by this page (BR-OI-007). |

---

## 2. Layout and responsive behavior

The page is a vertically stacked `<main>` with compact padding (`p-2`, increasing to `lg:p-4`) and consistent 16px section spacing. Cards use the shared UI Card primitives. Text is translated through `react-i18next`; fallbacks are supplied in the page/components. Light and dark theme classes are present.

1. Header: title and shop-scope description.
2. Sales counters: one column by default, three columns from the `sm` breakpoint.
3. Revenue summary: period controls and active-range label above the figures. On narrow screens, the four figures become label/value rows; at `sm` and above they form the Sales − Commission = Revenue formula with AOV after a divider.
4. Order list card: filters above the table/empty/error content. The toolbar uses responsive grid columns and wraps on smaller viewports; the table component owns its row and horizontal overflow presentation.
5. Pagination: separate from the list card and shown only if the server reports one or more matching orders.
6. Dialogs: custom revenue range and merchant order export are mounted only while open.

The implementation uses Tailwind breakpoints rather than the old design draft's asserted `md`/`lg` column guarantees. See the component class names for exact responsive behavior.

---

## 3. Sales summary

**Component:** `frontend/src/features/order-insights/components/SalesSummaryTiles.tsx`
**Query hook:** `useSalesSummary`
**Data type:** `SalesSummaryDto`

| Tile | Field | Display | Interaction |
|---|---|---|---|
| Today's Orders | `todayCount` | Integer count | None |
| This Month's Orders | `thisMonthCount` | Integer count | None |
| Completed Orders | `completedCount` | Integer count | Button applies `status=delivered`, resets page to 1, updates URL query parameters, and smoothly scrolls to the list. |

While loading, three skeleton tiles are displayed. A query failure replaces the tile group with a panel error and Retry button. The counter values default to zero if absent from the response. Counts are provided by the server; the frontend does not calculate them from the current page of rows.

---

## 4. Revenue summary

**Component:** `RevenueSummaryGroup.tsx`
**Custom period components:** `PeriodSelector`, `CustomRangeModal`, `RangeLabelPill`
**Query hook:** `useRevenueSummary`
**Data type:** `RevenueSummaryDto`

### 4.1 Period selection

| Period | Code | Default / interaction |
|---|---|---|
| Today | `today` | Available in the period selector. |
| This Month | `this_month` | Initial page period. |
| Last Month | `last_month` | Available in the period selector. |
| Custom | `custom` | Opens a modal; figures are not fetched for a draft range. Apply requires a valid start and end date. |

Custom date inputs use native date controls, cannot be in the future, and require `from <= to`. Cancel, close, Escape, or backdrop dismissal keeps the previously applied period. Applying a valid range sets the period to `custom` and fetches the summary. The period controls and modal return focus to the Custom control when closed.

A 422 for a missing/invalid server range is shown as “Select a start and end date” in the summary. The modal also displays local validation messages for missing dates, future dates, and reversed ranges. A non-422 revenue failure is shown with a panel error and Retry button. While the query is loading, the summary card displays skeletons.

### 4.2 Figures and labels

| Figure | DTO field | Meaning / display |
|---|---|---|
| Sales | `sales` | Period sales amount. |
| Commission | `commission` | Commission amount for the period. |
| Revenue | `revenue` | Net revenue amount. |
| AOV | `aov` | Average order value as supplied by the server. |
| Order count | `orderCount` | Caption indicates the number of orders behind the figures. |
| Commission rate | `commissionRate` | Captioned rate; current rate is marked when not historically locked. |
| Rate source/lock | `commissionRateSource`, `commissionRateLocked` | Used to reflect whether the rate is current settings or an order snapshot. |
| Period | `period.code`, `period.from`, `period.to` | Used to display the active date range. |

All money values are formatted as whole Myanmar Kyat (`Ks`) using `roundToWholeKs` (`Math.round`) and a thousands separator. The screen does not display two decimal places. For an empty period, monetary figures are shown as a dash and no fabricated zero commission rate is shown. The footer says “Based on N orders” and identifies the commission rate. When the current rate is used and the period has orders, an information tooltip explains that historical rate locking is pending. No revenue trend chart is rendered because the summary DTO contains period aggregates only, not a time series.

---

## 5. Order list and controls

**Page state and filters:** `useOrderListFilters`, `useOrderQueryParams`
**Filter schema:** `frontend/src/features/order-insights/schemas/orderFilters.schema.ts`
**Filter component:** `OrderFilterBar.tsx`
**Table component:** `MerchantOrderTable.tsx`

### 5.1 Defaults and URL state

| Filter/state | Initial value |
|---|---|
| Status | `all` |
| Payment status | `all` |
| From / To | Empty |
| Page | `1` |
| Page size | `10` |
| Sort field | `createdAt` |
| Sort direction | `desc` |
| Order search | Empty / omitted |

Filter changes are reflected in URL query parameters. Applying or changing a filter/search/sort resets the page to 1. Changing the page size also resets the page to 1. Reset restores the defaults and patches the URL. Search is debounced by 250 ms and trims whitespace.

### 5.2 Available controls

| Control | Behavior |
|---|---|
| Order status | `all` or one of `placed`, `confirmed`, `packed`, `shipped`, `out_for_delivery`, `delivered`. |
| Payment status | `all`, `pending`, or `completed`. |
| Date range | Start and end dates sent as order-list filters. Invalid ranges are rejected by schema/server validation. |
| Order search | Debounced text search; merchant page requests the compact/icon-only search presentation. |
| Apply | Applies form values and resets to page 1. |
| Reset | Restores all list filters to the defaults. |
| Export | Opens the export dialog; disabled during list loading or if the current result total is zero. |

The merchant page does not enable the filter bar's shop search. No admin shop/merchant selector is rendered here.

### 5.3 Table behavior

The table renders merchant order rows supplied by the list endpoint. It supports sorting by `createdAt`, `totalAmount`, and `status`; selecting the active sort field toggles descending/ascending, while selecting another field starts descending. Rows expose a View action that navigates to `/merchant/orders/:id` and carries the current list search string in navigation state for return navigation.

The row DTO includes `id`, `createdAt`, `status`, `itemCount`, `totalAmount`, `paymentStatus`, optional `shopName`, `customerName`, and optional `commissionRate`. Use the merchant table implementation as the authoritative column and formatting definition. Monetary display uses the whole-Ks formatter. This page is a list view; customer details and invoice actions belong to merchant order detail.

### 5.4 Empty, loading, and error states

- List loading: the table receives `loading`; the query retains previous data as placeholder data while refetching.
- No matches: `MerchantEmptyOrderState` is displayed with a reset-filter action. It is an informational empty state, not an error.
- List error: an inline panel error with Retry is displayed.
- 429: panel error helper uses a rate-limit message.
- 403 from sales, revenue, or orders: page-level access-denied alert is displayed.
- Other query failures: the affected summary/list region shows its own error and Retry action.
- Pagination: shown only when response `meta.total > 0`.

---

## 6. Pagination and export

### 6.1 Pagination

**Component:** `OrderPagination.tsx`
**Response metadata:** `meta.page`, `meta.limit`, `meta.total`

Page changes update the URL and query. Page-size options are 10, 20, and 50; selecting a size returns to page 1. The server response is the source of pagination totals.

### 6.2 Export

**Dialog:** `ExportMerchantOrdersDialog.tsx`

Export is initiated from the list toolbar. The dialog receives the active filters and current matching total. Export is a read/download operation; it does not mutate orders. The CSV formatting and data projection are implemented by `exportMerchantOrdersCsv.ts` and its service path. Do not infer export fields from table columns; refer to the export utility for the actual CSV schema.

---

## 7. Data fetching and API integration

The page uses TanStack Query hooks and merchant order services. Query state is not maintained by the static shared demo page.

| Query | Hook | Purpose |
|---|---|---|
| Merchant order list | `useMerchantOrders(filters)` | Loads filtered/sorted/paginated rows; query key includes filters and previous data is retained during refetch. |
| Sales summary | `useSalesSummary()` | Loads today, month, and completed counters. |
| Revenue summary | `useRevenueSummary({ period, from, to })` | Loads summary only when the Zod period schema validates the requested period. |

Service functions in `frontend/src/features/order-insights/services/merchantOrderService.ts` are the source for HTTP paths, query parameter serialization, and response unwrapping. The backend summary controller exposes `GET /order-insights/merchant/sales-summary` and `GET /order-insights/merchant/revenue-summary`; the order list is served by the shared orders API. All requests use the authenticated client and depend on server-side role/merchant scoping.

The screen must not fabricate rows, counts, money values, commission rates, or merchant identifiers. Revenue is displayed in the four-figure context supplied by the API. The exact aggregation and authorization rules belong to the backend business/API design documents.

---

## 8. Component and file map

| Responsibility | Source file |
|---|---|
| Route registration | `frontend/src/app/routes.tsx` |
| Page orchestration | `frontend/src/pages/order-insights/MerchantOrderInsightsPage.tsx` |
| Sales counters | `frontend/src/features/order-insights/components/SalesSummaryTiles.tsx` |
| Revenue figures and period UI | `frontend/src/features/order-insights/components/RevenueSummaryGroup.tsx` |
| Period selector | `frontend/src/features/order-insights/components/PeriodSelector.tsx` |
| Custom range dialog | `frontend/src/features/order-insights/components/CustomRangeModal.tsx` |
| Order filter toolbar | `frontend/src/features/order-insights/components/OrderFilterBar.tsx` |
| Merchant order rows | `frontend/src/features/order-insights/components/MerchantOrderTable.tsx` |
| Empty list state | `frontend/src/features/order-insights/components/MerchantEmptyOrderState.tsx` |
| Pagination | `frontend/src/features/order-insights/components/OrderPagination.tsx` |
| Export dialog | `frontend/src/features/order-insights/components/ExportMerchantOrdersDialog.tsx` |
| List query | `frontend/src/features/order-insights/hooks/useMerchantOrders.ts` |
| Sales query | `frontend/src/features/order-insights/hooks/useSalesSummary.ts` |
| Revenue query | `frontend/src/features/order-insights/hooks/useRevenueSummary.ts` |
| Filter validation | `frontend/src/features/order-insights/schemas/orderFilters.schema.ts` |
| Shared and merchant DTOs/formatters | `frontend/src/features/order-insights/types/orderInsights.types.ts`, `merchantOrderInsights.types.ts` |
| Merchant HTTP service | `frontend/src/features/order-insights/services/merchantOrderService.ts` |
| CSV projection | `frontend/src/features/order-insights/utils/exportMerchantOrdersCsv.ts` |
| Static shared demo (not this route) | `frontend/src/pages/shared/OrderInsights.tsx` |

---

## 9. Differences corrected from the previous draft

1. Restricted this document to the actual Merchant Order Insights page rather than treating seven separate routes as one screen.
2. Corrected the page path to `MerchantOrderInsightsPage.tsx` and pointed to the live route registration.
3. Replaced the old claim of status/date-only filtering with the implemented status, payment status, date range, and order search controls.
4. Added implemented sort fields, URL-backed filter state, debounced search, page reset rules, and page-size choices.
5. Added Sales Summary's three current metrics and the completed-orders shortcut behavior.
6. Documented the actual Revenue Summary periods, custom date modal, whole-Ks rounding, commission-rate caption/tooltip, empty-period display, and lack of a trend series.
7. Added the order export dialog and its loading/empty disable conditions.
8. Corrected stale page-size claims; the current merchant list defaults to 10 rows and offers 10/20/50.
9. Replaced unsupported assumptions about a universal pagination/table layout with the responsive component behavior in source.
10. Distinguished the live data-driven merchant page from the older static `shared/OrderInsights.tsx` mock.
11. Kept order detail, tracking, buyer history, and admin orders out of this page's scope. Their separate pages must be specified from their own current source files.

---

## 10. Related specifications

- [Module Overview](./DD_Order_Insights_01_MODULE_OVERVIEW.md)
- [API Endpoints](./DD_Order_Insights_03_API_ENDPOINTS.md)
- [DTOs and Types](./DD_Order_Insights_04_DTOS_AND_TYPES.md)
- [Business Logic](./DD_Order_Insights_05_BUSINESS_LOGIC.md)
- [Test Specification](./DD_Order_Insights_06_TEST_SPEC.md)