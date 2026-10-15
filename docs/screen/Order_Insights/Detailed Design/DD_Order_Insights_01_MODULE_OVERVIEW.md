# DD_OI_01 - Module Overview

> Doc ID: SKM-DD-OI-01 | Version: 2.0 | Status: Source-aligned | Last Updated: 2026-10-15

## 1. Scope

Order visibility is implemented across buyer order history/detail, merchant order insights/detail, and admin orders/detail. Merchant sales and revenue summaries live in the shared Order Insights backend module. Checkout creates orders and Order Fulfillment changes status; therefore only the insights screens and summary reads are read-oriented. The order-related system as a whole is not read-only.

Current source is authoritative. Product requirements may describe behavior not yet implemented; see known gaps below.

## 2. Implemented frontend screens

| Role | Route | Page |
|---|---|---|
| Buyer | `/orders` | `frontend/src/pages/order-insights/BuyerOrdersPage.tsx` |
| Buyer | `/orders/:id` | `frontend/src/pages/order-insights/BuyerOrderDetailPage.tsx` |
| Merchant | `/merchant/order-insights` | `frontend/src/pages/order-insights/MerchantOrderInsightsPage.tsx` |
| Merchant | `/merchant/orders/:id` | `frontend/src/pages/order-insights/MerchantOrderDetailPage.tsx` |
| Admin | `/admin/orders` | `frontend/src/pages/order-insights/AdminOrdersPage.tsx` |
| Admin | `/admin/orders/:id` | `frontend/src/pages/order-insights/AdminOrderDetailPage.tsx` |

There is no mounted buyer tracking page route. Tracking data is consumed in merchant/admin detail flows through APIs. The merchant list route is nested under `/merchant` and is `/merchant/order-insights`, not `/merchant/orders`.

`frontend/src/pages/shared/OrderInsights.tsx` is a separate static demo with hard-coded sample rows, not the merchant dashboard.

## 3. Backend ownership and endpoints

| Capability | Owner | Routes |
|---|---|---|
| Place order; list/detail/tracking | `backend/src/modules/buyer/orders/OrdersController` | `POST /api/v1/orders`; `GET /api/v1/orders`, `GET /api/v1/orders/:orderId`, `GET /api/v1/orders/:orderId/tracking` |
| Sales/revenue summaries | `backend/src/modules/shared/order-insights/MerchantOrderInsightsController` | `GET /api/v1/order-insights/merchant/sales-summary`, `GET /api/v1/order-insights/merchant/revenue-summary` |
| Merchant fulfillment detail/tracking/status | `backend/src/modules/merchant/order-fulfillment/OrderFulfillmentController` | `GET /api/v1/merchant/orders/:id`, `GET /api/v1/merchant/orders/:id/tracking`, `PATCH /api/v1/merchant/orders/:id/status` |

`OrderInsightsModule` and `OrderFulfillmentModule` are registered in `backend/src/app.module.ts`; the previous README note that they were unregistered is stale.

## 4. Scope and projection

The orders controller permits buyer, merchant, admin, and super_admin roles. Services enforce data scope: buyers see own orders; merchants resolve their merchant record from JWT and must be approved; admin/super_admin can see all orders and optionally filter by merchant/shop. Merchant fulfillment routes are merchant-only and verify ownership. Summary endpoints allow merchant/admin/super_admin; merchants are approval-gated, admins may select a merchant or aggregate all.

List row projection is role-specific: buyer gets shop name; merchant gets customer name and order commission rate; admin gets customer and shop names. Detail projections differ by role. Cross-scope order access is concealed as 404.

Order status codes in frontend types and validation: `placed`, `confirmed`, `packed`, `shipped`, `out_for_delivery`, `delivered`. Transitions belong to fulfillment, not the insights list page.

## 5. Data architecture

Frontend pages/components/hooks/services/schemas/types are under `frontend/src/pages/order-insights/` and `frontend/src/features/order-insights/`. The merchant page uses TanStack Query. Merchant CSV export fetches all matching list pages and builds the file client-side; there is no server export route.

Backend summary aggregation/cache is under `backend/src/modules/shared/order-insights/`; order list/detail logic is under `backend/src/modules/buyer/orders/`; merchant mutation/detail logic is under `backend/src/modules/merchant/order-fulfillment/`.

## 6. Known distinctions and gaps

- Buyer order service does not send payment-status filtering; backend applies that filter only to merchant/admin/super_admin.
- Revenue summary uses the latest current commission setting/default for all selected orders. Merchant list/detail also expose each order's saved rate; summary does not aggregate per-order rates.
- No direct buyer tracking route is registered.
- `POST /orders` and `PATCH /merchant/orders/:id/status` are writes adjacent to insights; BR-OI-007 applies to viewing/summaries, not every order endpoint.
- Summary service writes `MERCHANT_SUMMARY_VIEWED`; fulfillment has its own audit events. The complete list/detail audit matrix in older design text is not implemented by the order service.

## 7. Cross-references

- [Frontend Page](./DD_Order_Insights_02_FRONTEND_Page.md)
- [API Endpoints](./DD_Order_Insights_03_API_ENDPOINTS.md)
- [DTOs and Types](./DD_Order_Insights_04_DTOS_AND_TYPES.md)
- [Business Logic](./DD_Order_Insights_05_BUSINESS_LOGIC.md)
- [Test Specification](./DD_Order_Insights_06_TEST_SPEC.md)