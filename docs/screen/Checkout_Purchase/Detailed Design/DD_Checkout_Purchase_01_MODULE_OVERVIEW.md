# DD_CHECK-01 — Module Overview

> **Doc ID:** SKM-DD-CHECK-01 | **Version:** 1.0 | **Status:** Draft
> **Last Updated:** 2026-09-07

---

## 1. Module Overview

The **Checkout & Purchase Module** (チェックアウト・購入モジュール) is the buyer-facing purchase subsystem of the Cosmetics Finder platform. It covers the **Checkout Page** (`/checkout`) and the **Order Confirmation Page** (`/checkout/confirmation/:orderId`) — converting cart contents into confirmed orders with status `placed`, validating stock availability, applying coupon discounts, calculating totals (subtotal − discount), persisting order records for merchant fulfillment, and rendering the post-purchase confirmation (機能設計書 §1.1, §1.2, Requirement Spec §3.3, 画面項目設計書 v1.0).

This module is **read-write**: it creates `orders`, `order_items`, `order_status_history`, and `inventory_transactions` records, decrements `products.stock_quantity`, increments `promotions.used_count`, and clears `cart_items` — all within a single atomic database transaction (BR-CHECK-014). The module also renders the sponsored ad slide-down panel on the checkout page (UC-CHECK-008, BR-AD-001~012).

**Order History, Order Detail, and Order Tracking** (UC-CHECK-005, UC-CHECK-006, UC-CHECK-007 per 機能設計書 §2.1/§2.3) are explicitly **out of Detailed Design scope for this module** — they are implemented by the **Order Insights module** (画面項目設計書 v1.0 revision history: "Order History, Order Detail, and Order Tracking pages are developed by the order status screen team"). This module creates the orders that Order Insights later reads; the order-status state machine itself belongs to Order Insights' DD_01 §3.

---

## 2. Supported Use Cases

| ID | Use Case | Description |
|----|----------|-------------|
| UC-CHECK-001 | View Checkout Page | Authenticated buyer navigates to `/checkout`. System fetches cart items with product details, validates stock, calculates subtotal, and renders the checkout form with order summary, shipping address form, payment method selection, and optional coupon field. Enforces BR-CHECK-001 (authentication), BR-CHECK-002 (cart not empty), BR-CHECK-003 (buyer role only), BR-CHECK-006 (stock validation), BR-CHECK-008 (subtotal calculation). |
| UC-CHECK-002 | Apply Coupon Code | Buyer enters a coupon code on the checkout page. System validates code existence, expiry, minimum order amount, usage limit, and single-use-per-user constraints (BR-COUPON-001~006). Discount is calculated per BR-COUPON-007 and applied to the order total (BR-CHECK-009). Only one coupon per order (BR-COUPON-008); applying a new coupon replaces the previous one. |
| UC-CHECK-003 | Remove Coupon Code | Buyer removes an applied coupon. Discount is cleared and the order total reverts to the subtotal (BR-CHECK-009, BR-CHECK-010). |
| UC-CHECK-004 | Place Order | Buyer submits shipping address and payment method. System re-validates stock, locks prices (BR-CHECK-007), calculates final total (BR-CHECK-010), creates the order with status `placed` (BR-CHECK-013, BR-CHECK-015), decrements stock atomically (BR-CHECK-011), clears the cart (BR-CHECK-012), and commits all writes as one transaction (BR-CHECK-014). On success, the buyer is navigated to the Order Confirmation page. |
| UC-CHECK-005 | View Order History | **Out of Detailed Design scope for this module — implemented by the Order Insights module.** The FDS §2.1/§2.3 includes this use case for workflow continuity (BR-HIST-001~003), but the screen itself (`/orders`), its API (`GET /api/v1/orders`), and its field-level design belong to Order Insights' DD_02 and DD_03. This module creates the orders that Order Insights lists here. |
| UC-CHECK-006 | View Order Detail | **Out of Detailed Design scope for this module — implemented by the Order Insights module.** The FDS §2.1/§2.3 includes this use case for workflow continuity, but the screen (`/orders/:orderId`), its API (`GET /api/v1/orders/:id`), and its field-level design belong to Order Insights' DD_02 and DD_03. This module creates the orders whose detail Order Insights renders. |
| UC-CHECK-007 | Track Order | **Out of Detailed Design scope for this module — implemented by the Order Insights module.** The FDS §2.1/§2.3 includes this use case for workflow continuity, but the screen (`/orders/:orderId/tracking`), its API (`GET /api/v1/orders/:id/tracking`), the order-status state machine, and its field-level design belong to Order Insights' DD_01 §3, DD_02, and DD_03. This module creates the orders whose tracking timeline Order Insights renders. |
| UC-CHECK-008 | View Sponsored Ad Slot | On checkout page mount, the system fetches approved, active, in-schedule ads for the Checkout Top placement (BR-AD-001~004), applies tier priority (Premium > Standard > Basic) with round-robin rotation within each tier (BR-AD-005~006), limits to a maximum of 5 ads (BR-AD-007), and caches results in Redis with key `cache:ads:checkout-top` (TTL 5 min) (BR-AD-008). The ad panel slides into view with graceful degradation on error or empty response (BR-AD-009), reduced-motion support (BR-AD-010), pause-on-interaction (BR-AD-011), and click tracking (BR-AD-012). |

---

## 3. Business Workflow — Checkout to Confirmation
The following mermaid diagram models the full business workflow from cart through order placement and into the post-purchase flow. The **Checkout & Purchase module's Detailed Design scope ends after Order Confirmation** (solid boundary). Everything beyond that dashed boundary belongs to the **Order Insights module**.

```mermaid
flowchart TD
    A[Cart Page /cart] --> B{Authenticated?}
    B -- No --> C[Alert Modal:<br/>"Please log in to complete your purchase."]
    C --> D[Click Log in → /login]
    B -- Yes --> E{Buyer Role?}
    E -- No (Merchant/Admin) --> F[403 Forbidden:<br/>"Shopping features are only available to buyers"]
    E -- Yes --> G{Cart has items?}
    G -- No --> H[Redirect to Cart]
    G -- Yes --> I[GET /api/v1/checkout<br/>Load Checkout Page]
    I --> J[GET /api/v1/ads?placement=checkout_top<br/>Load Sponsored Ad Slot — parallel, non-blocking]
    J --> K[Checkout Page /checkout<br/>1. Review Order Summary<br/>2. Enter Shipping Address<br/>3. Select Payment Method<br/>4. Apply Coupon — optional<br/>5. Review Total]
    K --> L{Apply Coupon?}
    L -- Yes --> M[POST /api/v1/checkout/validate-coupon<br/>Validate and Apply]
    M --> N{Discount OK?}
    N -- Yes --> O[Update Order Total]
    N -- No --> P[Show Error Toast]
    P --> K
    L -- No --> O
    O --> Q[Click Place Order]
    Q --> R{Stock Valid?}
    R -- No --> S[409 Conflict:<br/>"Some items are no longer available."]
    S --> K
    R -- Yes --> T{Validation Pass?}
    T -- No --> U[400 Bad Request:<br/>Field-level errors]
    U --> K
    T -- Yes --> V[POST /api/v1/orders<br/>Create Order + Items + Status History<br/>+ Inventory Transactions<br/>Decrement Stock, Clear Cart<br/>— Atomic Transaction]
    V --> W{Success?}
    W -- Yes 201 --> X[Order Confirmation Page<br/>/checkout/confirmation/:orderId]
    W -- No 500 --> Y[Show Error Toast]
    Y --> K
    X --> Z[Display Order ID, Status, Items,<br/>Total, Estimated Delivery]

    Z -.->|OUT OF SCOPE| AA[Order History /orders<br/>— Order Insights Module]
    AA -.->|OUT OF SCOPE| AB[Order Detail /orders/:orderId<br/>— Order Insights Module]
    AB -.->|OUT OF SCOPE| AC[Order Tracking /orders/:orderId/tracking<br/>— Order Insights Module]

    classDef scope fill:#e1f5fe,stroke:#0277bd,stroke-width:2px
    classDef oos fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px,stroke-dasharray: 5 5
    class A,B,E,G,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z scope
    class AA,AB,AC oos
```

---

## 4. Security & Permissions

Security & permissions requirements for this module (機能設計書 §10.1, §10.2, §10.3, §10.4; 画面項目設計書 §2.2; 機能設計書 §1.3):

1. **Authentication**: All checkout, coupon, and order endpoints require a valid JWT. Unauthenticated access returns `401 Unauthorized` with a prompt to log in (BR-CHECK-001, error code `AUTH_001`).
2. **Role-Based Access Control (RBAC)**: All shopping endpoints (checkout load, coupon validation, order placement, order confirmation) are restricted to the `buyer` role. `merchant` and `admin` roles receive `403 Forbidden` with message "Shopping features are only available to buyers." (BR-CHECK-003, error code `CHECK_004`).
3. **Audit Logging**: Checkout page loads, coupon validations, order placements, and confirmation page views are logged with user identity and timestamp (events `CHECKOUT_LOADED`, `COUPON_VALIDATED`, `ORDER_PLACED`, `ORDER_CONFIRMATION_VIEWED` — Error Response Structure: DD_CHECK-03 §6; Audit Logging Events: DD_CHECK-03 §7; Audit Logging Logic: DD_CHECK-05 §8). Retention aligned with Development Rules §6.4 (buyer financial events: 1 year).
4. **Currency Precision**: All monetary values are transmitted and rendered as strings to preserve `DECIMAL(10,2)` precision. Never rendered as floats (see DD_04).
5. **Generic Error Messages**: Field-level validation errors return specific messages; server failures return a generic `500` toast. Coupon and stock error messages never leak internal details (see DD_CHECK-03 §6 for the error response structure and DD_CHECK-05 §6 for message definitions).
6. **PII Exposure**: Shipping address and payment details are never logged to client-side consoles and are never included in ad payloads.

| Role | Can View Cart | Can View Checkout | Can Apply Coupon | Can Place Order | Can View Confirmation | Can View Orders (Out of scope) |
|------|:---:|:---:|:---:|:---:|:---:|:---:|
| `buyer` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (Order Insights module) |
| `merchant` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `admin` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

---

## 5. Architectural Components Involved

### 5.1 Frontend Components

| Layer | Files |
|-------|-------|
| **Frontend Pages** | `Checkout.tsx` (`/checkout`), `OrderConfirmation.tsx` (`/checkout/confirmation/:orderId`) |
| **Frontend Components** | `CheckoutForm.tsx`, `OrderSummary.tsx`, `ShippingAddressForm.tsx`, `PaymentMethodSelector.tsx`, `CouponField.tsx`, `AdSlotPanel.tsx`, `AdSlide.tsx`, `OrderConfirmationCard.tsx` |
| **Frontend Hooks** | `useCheckout.ts`, `usePlaceOrder.ts`, `useValidateCoupon.ts`, `useAdSlot.ts` |
| **Frontend Services** | `checkout.service.ts`, `orders.service.ts`, `ads.service.ts` |
| **Frontend Schemas** | `checkout.schema.ts`, `order.schema.ts`, `ad.schema.ts` |

### 5.2 Backend Components

| Layer | Files |
|-------|-------|
| **Backend Controllers** | `checkout.controller.ts` (routes under `/api/v1/checkout`), `orders.controller.ts` (routes under `/api/v1/orders` — order placement only) |
| **Backend Services** | `checkout.service.ts`, `order.service.ts`, `promotions.service.ts` (coupon validation), `ads.service.ts` (ad slot fetch) |
| **Backend DTOs** | `shipping-address.dto.ts`, `place-order.dto.ts`, `validate-coupon.dto.ts`, `checkout-response.dto.ts`, `order-response.dto.ts`, `validate-coupon-response.dto.ts`, `ad-slot-response.dto.ts` |
| **Backend Guards** | `jwt-auth.guard.ts`, `roles.guard.ts` / `require-buyer-role.guard.ts` |
| **Shared Services** | `prisma.service.ts` (orders, order_items, order_status_history, inventory_transactions, promotions, cart_items, products, advertisements), `redis.service.ts` (`cache:ads:checkout-top`), `logger.service.ts` (audit events) |

---

## 6. API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:-------------:|
| `GET` | `/api/v1/checkout` | Load checkout page data — cart items, subtotal, stock status, user addresses | Yes (Buyer) |
| `GET` | `/api/v1/ads?placement=checkout_top` | Load sponsored ad slot for checkout (parallel, non-blocking, cached) | No (public cache; page-level auth applies) |
| `POST` | `/api/v1/checkout/validate-coupon` | Validate and apply coupon code; return discount amount and new total | Yes (Buyer) |
| `POST` | `/api/v1/orders` | Place order — create order, order items, status history, inventory transactions; decrement stock; clear cart; return order confirmation | Yes (Buyer) |

> **Note:** `GET /api/v1/orders`, `GET /api/v1/orders/:id`, and `GET /api/v1/orders/:id/tracking` (Order History, Order Detail, Order Tracking) are implemented by the **Order Insights module** and are not covered in this module's DD_03.

---

## 7. Database Tables Involved

This module is **read-write** — it writes to these tables during order placement (unlike Order Insights, which is fully read-only).

| Table | Purpose | Operations |
|-------|---------|------------|
| `orders` | Store customer order header (`buyer_id`, `merchant_id`, `status`, `subtotal`, `discount_amount`, `total_amount`, `payment_method`, `shipping_address` JSONB, `coupon_code`, `notes`) | **INSERT** (order placement), SELECT (confirmation page) |
| `order_items` | Store line items per order with unit/total price locked at creation (immutable snapshot per BR-CHECK-015) | **INSERT** (order placement), SELECT (confirmation page) |
| `order_status_history` | Append-only, chronological status-change audit trail per order | **INSERT** (initial `placed` status on order placement) |
| `inventory_transactions` | Append-only stock-decrement records on order creation | **INSERT** (stock decrement records) |
| `products` | Product catalog with `stock_quantity`, `unit_price` | SELECT (stock validation, price lookup), **UPDATE** (atomic stock decrement, BR-CHECK-011) |
| `promotions` | Coupon/promotion codes with `discount_type`, `discount_value`, `min_order_amount`, `max_uses`, `used_count`, `expires_at` | SELECT (coupon validation), **UPDATE** (atomic `used_count` increment on successful order, BR-COUPON-009) |
| `cart_items` | Buyer's shopping cart line items | SELECT (load cart for checkout), **DELETE** (clear cart after successful order, BR-CHECK-012) |
| `carts` | Buyer's cart header | SELECT (resolve cart for checkout); retained as empty after successful checkout |
| `advertisements` | Ad creative records (`image_url`, `title`, `description`, `cta_text`, `cta_url`, `is_approved`, `is_active`, `schedule_start`, `schedule_end`) | SELECT (ad slot fetch for checkout_top placement) |
| `advertisement_packages` | Purchased ad packages determining tier (`premium` / `standard` / `basic`) and placement eligibility | SELECT (tier priority resolution, BR-AD-005) |

---

## 8. External Dependencies

| Dependency | Purpose | Configuration |
|------------|---------|---------------|
| Prisma ORM | Database access layer for orders, order_items, products, promotions, cart_items, advertisements, etc. | `DATABASE_URL` |
| Redis | Ad slot cache (`cache:ads:checkout-top`, TTL 5 min) | `REDIS_URL` |
| TanStack Query v5 | Frontend server-state fetching (checkout data, ad slot) and cache invalidation | Frontend config |
| React Hook Form + Zod | Checkout form validation (shipping address, payment method, coupon code) | Frontend config |
| i18next | Internationalization (EN / MY / JA) — checkout labels, error messages, confirmation text | `frontend/src/i18n.ts` |

---

## 9. Cross-References

| Related Document | Purpose |
|------------------|---------|
| [DD_CHECK-02](./DD_Checkout_Purchase_02_FRONTEND_Page.md) | Frontend page design — Checkout and Order Confirmation screens |
| [DD_CHECK-03](./DD_Checkout_Purchase_03_API_ENDPOINTS.md) | Backend REST API contract — `/checkout`, `/orders`, `/ads` endpoints |
| [DD_CHECK-04](./DD_Checkout_Purchase_04_DTOS_AND_TYPES.md) | DTO and type definitions — shipping address, place-order, coupon, ad slot |
| [DD_CHECK-05](./DD_Checkout_Purchase_05_BUSINESS_LOGIC.md) | Backend business rules — order placement transaction, coupon validation, stock decrement |
| [DD_CHECK-06](./DD_Checkout_Purchase_06_TEST_SPEC.md) | Test specification — checkout flow, coupon application, order placement, ad slot |
| [機能設計書_Checkout_Purchase](../機能設計書_Checkout_Purchase.md) | Full functional specification (use cases, workflows, business rules, error handling) |
| [画面項目設計書_Checkout_Purchase](../画面項目設計書_Checkout_Purchase.md) | Screen items specification — Checkout + Order Confirmation fields and layout |
| [DD_OI-01](../Order_Insights/Detailed%20Design/DD_Order_Insights_01_MODULE_OVERVIEW.md) | Order Insights module overview — owns the order-status state machine and Order History/Detail/Tracking screens that this module's orders flow into |
