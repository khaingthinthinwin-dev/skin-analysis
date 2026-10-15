# Screen Items Specification - Order Insights

> Document ID: SKM-SSD-OI-001 | Version: 3.0 | Status: Source-aligned | Last Updated: 2026-10-15

## 1. Scope and conventions

This item specification follows the mounted routes in `frontend/src/app/routes.tsx`. The buyer tracking timeline is part of the buyer detail page; there is no standalone buyer tracking route. The merchant list route is `/merchant/order-insights`. Values come from the current page/components unless identified as a known placeholder.

Shared display rules: labels use i18next with English fallback; status and payment badges are display-only except the merchant detail transition control. Amounts shown in order lists use whole-Ks formatting where components call `formatCurrencyAmount`; buyer detail currently formats its amounts as USD with two decimals. Responsive layout uses the implemented Tailwind classes and horizontal overflow where provided by the table/progress components.

## 2. Buyer order list - `/orders`

Source: `BuyerOrdersPage.tsx`, `OrderFilterBar.tsx`, `OrderHistoryTable.tsx`, `OrderPagination.tsx`.

| Item | Type / source | Required/default | Behavior |
|---|---|---|---|
| Page title | Heading | Visible: My Orders | Localized. |
| KPI group | Four statistic cards | Rendered after data loads | Orders, Total Spent, In Progress, Delivered. Fixed sample values are used for no-date `all`/`placed`/`delivered`; other conditions use API summary. Known placeholder. |
| Status | Select | `all` | Six order statuses or all; change applies immediately and resets page. |
| Shop search | Text input | Empty | Debounced; backend searches shop and merchant name. |
| Order search | Text input | Empty | Debounced; searches visible first-eight UUID reference. |
| From / To | Date inputs | Empty | Date range; invalid order is blocked by form validation. |
| Apply / Reset | Buttons | Enabled as applicable | Apply/reset filters; resets page to 1. |
| Export | Button + dialog | Disabled while exporting or zero results | Downloads client-generated CSV for current filters. |
| Orders table | Table | Server data | Order #, Date, Shop, Items, Total, Payment, Status, Track. Sort by date/total; status header is not sortable in buyer page. |
| Track | Row action | One per row | Navigates to `/orders/:id` (buyer detail), not a separate tracking route. |
| Pagination | Control | Page 1, 10/page in UI | Sizes 10/20/50/100; page and size update URL state. |
| Empty/error | Informational state / retry | Conditional | Empty order state at total 0; list load failure has retry. |

Buyer CSV includes order reference, date, item names/quantities, total, payment status, order status. It fetches details for all matching orders before creating the file.

## 3. Buyer order detail - `/orders/:id`

Source: `BuyerOrderDetailPage.tsx`.

| Item | Type / source | Visibility / behavior |
|---|---|---|
| Order heading/reference | Heading + copy/print actions as rendered | Uses API reference or formatted UUID fallback. |
| Status summary | Status badge and explanatory copy | Current status; read-only. |
| Delivery progress | Six-step progress component | Placed, confirmed, packed, shipped, out_for_delivery, delivered; uses reached timestamps from detail timeline. |
| Items | Product rows | Product name/image, quantity, stored unit/line amounts. |
| Totals | Summary card | Discount/coupon where present and total. No shipping fee field is specified by current DTO. |
| Payment | Method/status | Badge and localized method. |
| Shipping address | Address card | Address fields present in response. |
| Notes | Text card | Hidden when null/empty. |
| Back | Link/button | Returns to buyer order list. |
| Loading/error | Skeleton / alert or not-found | Retry on recoverable server error; not-found for 404. |

## 4. Merchant Order Insights list - `/merchant/order-insights`

Source: `MerchantOrderInsightsPage.tsx` and feature components.

| Item | Type / source | Required/default | Behavior |
|---|---|---|---|
| Header | Title + scope note | Visible | Order Insights; own-shop scope note. |
| Sales Summary | Three tiles from API | Loading skeleton | Today, this month, completed. Completed tile applies delivered filter, resets page, scrolls to list. |
| Revenue Summary | Card from API | Initial period `this_month` | Sales, Commission, Revenue, AOV, order count, commission-rate text; amounts display in whole Ks. |
| Period selector | Button group | This Month active | Today/This Month/Last Month; Custom opens date dialog. |
| Custom period | Dialog with two date inputs | Draft until Apply | No future dates; both dates required; from <= to. Cancel/close keeps prior period. |
| Status | Select | `all` | Six status filters; change resets page. |
| Payment status | Select | `all` | all/pending/completed. |
| Date range | Date inputs | Empty | List created-date range. |
| Order search | Search input | Empty | Debounced, max length 100 by schema. |
| Apply / Reset | Buttons | N/A | Updates query/URL; page reset. |
| Export | Button/dialog | Disabled while loading or total=0 | Fetches all filtered pages and downloads CSV client-side. |
| Merchant table | Table | API rows | Order reference/date/customer/item count/total/payment/status and row View action; sortable createdAt/totalAmount/status. Use `MerchantOrderTable.tsx` for exact rendered columns. |
| View | Row link/button | One per row | Navigates to `/merchant/orders/:id`, retaining list query in navigation state. |
| Pagination | Control | Page 1, 10/page | Sizes 10/20/50. |
| Access/error/empty | Alert/panel/empty state | Conditional | 403 replaces page with access denied; local query errors provide retry; zero results show resettable empty state. |

## 5. Merchant order detail - `/merchant/orders/:id`

Source: `MerchantOrderDetailPage.tsx`.

| Item | Type / source | Behavior |
|---|---|---|
| Order heading | Reference, copy, status | Current status badge and order context. |
| Advance status | Conditional button + confirmation dialog | Shown only when API `availableTransitions` has a next value; confirms and calls fulfillment PATCH. Loading prevents duplicate submission. |
| Delivery progress | Timeline component, merchant variant | Six statuses, history timestamps, upcoming Next marker. |
| Invoice | Dialog/action | Opens printable merchant invoice. |
| Customer information | Card | Name, email, phone. |
| Items and commission | Product list/calculation | Merchant's order items, saved rate and commission explanation. |
| Totals/payment | Cards | Discount/total, payment method/status. |
| Shipping and notes | Cards | Shipping fields; notes hidden if absent. |
| Back/loading/error | Link, skeleton, alert | Returns to order insights list; 404 shown as not found; retry where available. |

## 6. Admin order list - `/admin/orders`

Source: `AdminOrdersPage.tsx`, `AdminOrderFilterBar.tsx`, `AdminOrderTable.tsx`.

| Item | Type / source | Required/default | Behavior |
|---|---|---|---|
| Header | Title/subtitle | Visible | All Orders and platform scope description. |
| KPI tiles | API list summary | After data load | Total order value, in progress, completed; reflects filtered list set. |
| Order reference | Text input | Empty | Search by visible order reference. |
| Shop/Merchant | Searchable combobox | Empty | Search and select merchant/shop; admin-only scope. |
| Status / payment | Selects | `all` | Six statuses; pending/completed payment. |
| From / To | Date inputs | Empty | Date filter; reversed range blocks search. |
| Search / Clear / Export | Buttons | As applicable | Apply, reset, export all filtered pages client-side. |
| Active filter chips | Chip group | Conditional | Remove individual filters or clear all. |
| Result count | Text | API total | Number matching current filters. |
| Order table | Table | API rows | Order #, Date, Shop/Merchant, Buyer, Items, Total, Payment, Status, View; sort by date/total/status. |
| View | Link/button | One per row | Navigates to `/admin/orders/:id`. |
| Pagination | Control | Page 1, default 10 | Sizes 10/20/50. |
| Empty/error | Empty state or alert | Conditional | No matches offers Clear Filters; failures offer Retry. |

## 7. Admin order detail - `/admin/orders/:id`

Source: `AdminOrderDetailPage.tsx`.

| Item | Type / source | Behavior |
|---|---|---|
| Order header | Reference/date/status | Copy order reference. |
| Print | Button | Browser print / save as PDF. |
| Delivery progress | Merchant variant of progress display | Shows status history where returned. |
| Shop/merchant | Card | Shop and merchant identifiers/names from admin detail projection. |
| Customer | Card | Customer details. |
| Payment, items, totals | Cards/table | Read-only order data. |
| Shipping and notes | Cards | Notes shown only when present. |
| Back | Link/button | Returns to All Orders. |
| Loading/error/not found | Skeleton/alert | Retry for recoverable errors; no cross-scope data disclosure. |

## 8. Shared validation and state

- Frontend list filters are URL-backed. Filter/search/sort changes reset page to 1; page-size change also resets to 1.
- List schema permits statuses above, payment status all/pending/completed, order/shop searches up to 100 characters, page >= 1, limit 1-100, sort createdAt/totalAmount/status, and asc/desc.
- Revenue custom period requires both dates and `from <= to`; custom date dialog disallows future dates.
- Backend remains authoritative for role scope, order ownership, validation, and response values.
- Buyer, merchant, and admin display projections differ. Do not show buyer PII in buyer order detail.

## 9. Known implementation gaps

- Buyer KPI cards include fixed sample values for selected filter states.
- No standalone buyer tracking route exists; timeline is in buyer detail.
- Revenue summary uses current commission setting/default rather than the saved per-order rates.
- Exports are client-side; no export endpoint exists.
- E2E scenarios include TODO assertions; do not treat every listed behavior as E2E-verified.