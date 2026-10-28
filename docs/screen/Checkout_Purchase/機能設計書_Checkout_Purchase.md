# Functional Specification (機能設計書) — Purchase & Checkout

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-FDS-CHECKOUT-001 |
| **Target Screen** | Purchase & Checkout (購入・チェックアウト) |
| **Subsystem** | Buyer Module — Checkout, Order Placement & Order History |
| **Function ID** | FN-CHECK-001, FN-ORDER-001 |
| **Version** | 1.4 |
| **Created** | 2026-08-17 |
| **Last Updated** | 2026-10-21 |
| **Author** | Software Architect |
| **Status** | Source-aligned (implementation baseline; planned gaps identified) |
| **Classification** | Internal — Engineering Division |

---

## Document Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.4 | 2026-10-22 | Software Architect | Updated to reflect PCL v1.3 audit: order confirmation uses derived orderNumber, estimated delivery not rendered, ads via search/ads with no tier/cache/rotation, coupon zero-total only at order placement, inventory_transactions not written, notification created per merchant group, rate limits global-only, and identified gaps (stock warning UI, coupon format/zero-total at validation, notes maxLength server-side, protected route redirect path). |
| 1.3 | 2026-08-27 | Software Architect | Added sponsored ad slot design for Checkout Top. The actual implementation is reconciled in v1.4 below. |
| 1.2 | 2026-08-23 | Software Architect | Removed shipping fee and tax fee from checkout calculation. Total is now calculated as subtotal - discount. |
| 1.1 | 2026-08-18 | Software Architect | Added checkout persistence design for cart conversion, inventory transaction logging, and order status history tracking. |
| 1.0 | 2026-08-17 | Software Architect | Initial functional specification for Purchase and Checkout pages covering use cases, business rules, validation, error handling, and permission control. Aligned with REQUIREMENT_SPEC v1.5, DATABASE_SPEC v2.0, and DEVELOPMENT_RULES v2.0. |

---

## Table of Contents

1. [Functional Overview](#1-functional-overview)
2. [Use Cases and Business Workflow](#2-use-cases-and-business-workflow)
3. [State Transition Specification](#3-state-transition-specification)
4. [Business Rules](#4-business-rules)
5. [Screen Specifications](#5-screen-specifications)
6. [Functional Operation Specification](#6-functional-operation-specification)
7. [Input / Output Specification](#7-input--output-specification)
8. [Input Validation Rules](#8-input-validation-rules)
9. [Error Handling Specification](#9-error-handling-specification)
10. [Permission and Access Control](#10-permission-and-access-control)
11. [Real-Time Notification Behavior](#11-real-time-notification-behavior)
12. [Screen Transition Specification](#12-screen-transition-specification)
13. [Non-Functional Considerations](#13-non-functional-considerations)
14. [Configurable Items (External Definitions)](#14-configurable-items-external-definitions)
15. [Cross-Reference Traceability Matrix](#15-cross-reference-traceability-matrix)

---

> **Implementation baseline (2026-10-22):** This specification records the behavior in the current frontend and backend. Requirements that are not implemented are explicitly marked as target/gap behavior. Checkout is mounted at `/buyer/checkout`; order APIs are under `/api/v1`. The detailed checkout implementation audit is `Checkout_Purchase_PCL.md` (v1.3, updated 2026-10-22). All N/A/B/I scenarios are tracked there with evidence.

## 1. Functional Overview

### 1.1 Purpose and Scope

This screen provides the complete checkout and order management functionality for the Cosmetics Finder platform. The Checkout subsystem handles the end-to-end purchase workflow from order review through payment method selection and order confirmation. The Order subsystem manages order history, order details, and order tracking for authenticated buyers.

These subsystems are the final stage of the e-commerce workflow, converting cart contents into confirmed orders while validating stock availability, applying coupon discounts, calculating totals, and persisting order records for merchant fulfillment and buyer tracking.

### 1.2 Functional Responsibilities

This screen is responsible for the following core functional areas:

1. **Checkout Flow** — Guiding the user through shipping address entry, payment method selection, coupon application, and order summary review before final confirmation.
2. **Coupon Validation** — Validating and applying discount codes (percentage or fixed) at checkout, enforcing expiry, minimum order amount, and single-use constraints.
3. **Order Calculation** — Computing subtotal, discount amount, and final total based on cart items and applied coupons.
4. **Order Placement** — Creating order records with status `placed`, decrementing stock atomically, clearing the cart, and returning order confirmation.
5. **Sponsored Ad Display** — Rendering the shared `AdBannerSlider` on checkout using `checkout_page_banner`. The page uses the shared search ads endpoint; a separate checkout sponsored-ads endpoint exists but is not used by the mounted page.
6. **Order History** — Displaying a paginated list of all past orders with status, date, total, and item count.
7. **Order Details** — Showing full order information including items, shipping address, payment status, and order timeline.
8. **Order Tracking** — Backend tracking data is available at `GET /api/v1/orders/:orderId/tracking`; no buyer tracking page route is currently mounted.
9. **Notification Delivery** — Sending order confirmation and status change notifications to the buyer and relevant merchant.

### 1.3 Target Users

| Attribute | Value |
|-----------|-------|
| **Primary Actor** | Authenticated Buyer |
| **Required Authentication** | JWT Bearer Token |
| **Data Scope** | Own orders, own shipping addresses, own payment records |
| **Guest Behavior** | On `/buyer/checkout`, unauthenticated users see a login dialog. [Log in] navigates to `/login?redirect=%2Fcheckout`; closing the dialog returns to `/buyer/cart`. |

### 1.4 Relationships with Other Functions and Peripheral Systems

```text
┌──────────────────────────┐      ┌─────────────────────────────────────┐
│   Authenticated Buyer    │      │     orders / order_items            │
│   (Places Order)         ├─────►│  Creates order records              │
└──────────────────────────┘      └──────────────┬──────────────────────┘
                                                 │ Reads/Writes
                                                 ▼
                                       ┌────────────────────────┐
                                       │   Checkout Service     │
                                       └──────────┬─────────────┘
                                                  │
                         ┌────────────────────────┼────────────────────────┐
                         ▼                        ▼                        ▼
               ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
               │   Cart Module    │    │  Promotions      │    │  Products        │
               │   (Stock Check)  │    │  (Coupon Valid)  │    │  (Price/Stock)   │
               └──────────────────┘    └──────────────────┘    └──────────────────┘
                                                  │
                                                  ▼
                                       ┌────────────────────────┐
                                       │  Orders Module         │
                                       │  (Order Management)    │
                                       └────────────────────────┘
```

### 1.5 Inputs / Outputs

| Input Information | Data Category | Source / Description |
|-------------------|---------------|----------------------|
| `shippingAddress` | Request Body | Buyer's shipping address (JSON object) |
| `paymentMethod` | Request Body | Selected payment method identifier |
| `couponCode` | Request Body | Optional discount code applied at checkout |
| `notes` | Request Body | Optional order notes from buyer |
| `orderId` | URL Parameter | Order ID for detail/tracking view |
| `page` | Query Parameter | Pagination page number for order history |
| `limit` | Query Parameter | Items per page for order history |

| Output Information | Data Category | Destination / Description |
|--------------------|---------------|---------------------------|
| `order` | Order DTO | Created order with items, totals, and status |
| `orderConfirmation` | Confirmation DTO | Order ID, status, estimated delivery, summary |
| `orders` | Order List DTO | Paginated array of order summaries |
| `orderDetail` | Order Detail DTO | Full order with items, address, timeline |
| `tracking` | Tracking DTO | Order status timeline and estimated delivery |
| `paymentResult` | Payment DTO | Payment processing result (stubbed) |

### 1.6 Related Documents

| No. | Document ID | Document Name | File Path / Reference | Remarks |
|-----|-------------|---------------|----------------------|---------|
| 1 | SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | Business workflow logic, required fields, and rules. |
| 2 | SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | Table structures (`orders`, `order_items`, `promotions`), constraints. |
| 3 | SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | Security rules, design tokens, error responses. |

---

## 2. Use Cases and Business Workflow

### 2.1 Use Case Catalog

| UC-ID | Use Case Name | Precondition | Postcondition | Triggering Actor |
|-------|---------------|--------------|---------------|------------------|
| UC-CHECK-001 | View Checkout Page | User is authenticated. | Checkout page displays order summary, shipping form, payment options, and eligible ads. An empty cart currently returns checkout data with an empty item list; the page does not automatically redirect. | Authenticated Buyer |
| UC-CHECK-002 | Apply Coupon Code | User is on checkout page. Valid coupon code entered. | Discount applied. Order total recalculated. | Authenticated Buyer |
| UC-CHECK-003 | Remove Coupon Code | User is on checkout page. Coupon code already applied. | Discount removed. Order total recalculated. | Authenticated Buyer |
| UC-CHECK-004 | Place Order | User is on checkout page. Shipping address valid. Payment method selected. Stock validated. | Order created with status `placed`. Stock decremented. Cart cleared. Order confirmation displayed. | Authenticated Buyer |
| UC-CHECK-005 | View Order History | User is authenticated. User has past orders. | Paginated order list displayed with status, date, total, and item count. | Authenticated Buyer |
| UC-CHECK-006 | View Order Detail | User is authenticated. Order exists and belongs to user. | Full order detail displayed with items, shipping address, payment status, and timeline. | Authenticated Buyer |
| UC-CHECK-007 | Track Order | User is authenticated. Order exists. | Order tracking timeline displayed with current status and estimated delivery. | Authenticated Buyer |
| UC-CHECK-008 | View Sponsored Ad Slot | Checkout page loaded. | Shared ad banner displays eligible `checkout_page_banner` ads; empty/error data hides the panel. The search endpoint returns up to five results ordered by `startsAt DESC` and currently assigns `tier: standard` to each; no five-minute response cache or tier ranking is applied. | Authenticated Buyer |

### 2.2 Primary Business Workflow — Checkout

```
                    ┌──────────────────┐
                    │  Cart Page       │
                    │  (/cart)         │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────────────────┐
                    │  Click "Proceed to Checkout" │
                    └──────────┬───────────────────┘
                               │
                    ┌──────────┴──────────────────┐
                    │  Authenticated?             │
                    └──────────┬──────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
        ┌──────────┐    ┌──────────┐    ┌──────────────┐
        │ YES      │    │ NO       │    │ Cart Empty?  │
        │ (Proceed)│    │ (Guest)  │    │              │
        └────┬─────┘    └────┬─────┘    └──────┬───────┘
             │               │                 │
             │               ▼                 │
             │    ┌─────────────────────┐      │
             │    │ Show Alert Modal:   │      │
             │    │ "Please log in to   │      │
             │    │  complete your      │      │
             │    │  purchase."         │      │
             │    │ [Log in]            │      │
             │    └─────────┬───────────┘      │
             │              │                  │
             │              ▼                  │
             │    ┌──────────────────┐         │
             │    │ Click [Log in]   │         │
             │    │ → Navigate to    │         │
             │    │   /login         │         │
             │    └──────────────────┘         │
             │                                 │
             │                          ┌──────┴───────┐
             │                          ▼              ▼
             │                    ┌──────────┐    ┌──────────┐
             │                    │ YES      │    │ NO       │
             │                    │ (Redirect│    │ (Proceed)│
             │                    │  to Cart)│    └────┬─────┘
             │                    └──────────┘         │
             │                                         │
             ▼                                         ▼
     ┌────────────────────────────────────────────────────────┐
     │              Checkout Page (/checkout)           　    │
     │                                                  　    │
     │  1. Review Order Summary (items, subtotal)       　    │
     │  2. Enter Shipping Address                       　    │
     │  3. Select Payment Method                         　   │
     │  4. Apply Coupon Code (optional)                  　   │
      │  5. Review Total (subtotal - discount)                               　│
     │  6. Click "Place Order"                              　│
     └──────────────────┬─────────────────────────────────────┘
                        │
          ┌─────────────┼──────────────────────┐
          ▼             ▼                      ▼
   ┌────────────┐ ┌──────────────┐    ┌──────────────────┐
   │ Validation │ │ Stock Check  │    │ Coupon Validate  │
   │  PASS      │ │  PASS        │    │  PASS (optional) │
   └─────┬──────┘ └──────┬───────┘    └────────┬─────────┘
         │               │                     │
         └───────────────┼─────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ Backend Processing   │
              │ (Create Order,       │
              │  Decrement Stock,    │
              │  Clear Cart)         │
              └──────────┬───────────┘
                         │
           ┌─────────────┴──────────────────────┐
           ▼                                    ▼
     ┌──────────────┐                 ┌─────────────────────┐
     │  SUCCESS     │                 │  FAILURE            │
     │  (201)       │                 │  (400)              │
     └──────┬───────┘                 └─────────┬───────────┘
            │                                   │
            ▼                                   ▼
     ┌──────────────┐                 ┌─────────────────────┐
     │ Order        │                 │ Display Error       │
     │ Confirmation │                 │ Message             │
     │ Page         │                 └─────────────────────┘
     └──────────────┘
```

### 2.3 Primary Business Workflow — Order History & Tracking

```
                    ┌──────────────────┐
                    │  User Header     │
                    │  (Profile Menu)  │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌─────────────────────────────┐
                    │  Click "Order History"      │
                    └──────────┬──────────────────┘
                               │
                               ▼
                    ┌─────────────────────────────┐
                    │  GET /api/v1/orders         │
                    │  (Paginated order list)     │
                    └──────────┬──────────────────┘
                               │
               ┌───────────────┼───────────────────┐
               ▼               ▼                   ▼
         ┌──────────┐   ┌──────────────┐   ┌──────────────┐
         │ Orders   │   │ Click Order  │   │ No Orders    │
         │ Displayed│   │ Detail       │   │ (Empty State)│
         └────┬─────┘   └──────┬───────┘   └──────────────┘
              │                │
              │                ▼
              │       ┌─────────────────────────────┐
              │       │  GET /api/v1/orders/:id     │
              │       │  (Full order detail)        │
              │       └──────────┬──────────────────┘
              │                  │
              │                  ▼
              │       ┌─────────────────────────────┐
              │       │  Order Detail Page          │
              │       │  - Items, Address, Payment  │
              │       │  - Status Timeline          │
              │       │  - Tracking (if shipped)    │
              │       └─────────────────────────────┘
              │
              ▼
       ┌──────────────────┐
       │ Pagination       │
       │ (Next/Prev Page) │
       └──────────────────┘
```

### 2.4 Workflow Critical Path Summary

| Step | Action | Status Before | Status After | Assigned To |
|:----:|--------|---------------|--------------|-------------|
| 1 | User clicks "Proceed to Checkout" from cart | Items in cart | Checkout page displayed | System |
| 2 | User enters shipping address | — | Address form filled | Buyer |
| 3 | User selects payment method | — | Payment method selected | Buyer |
| 4 | User enters coupon code (optional) | — | Discount applied | System |
| 5 | User reviews order summary | — | Summary confirmed | Buyer |
| 6 | User clicks "Place Order" | — | Order created | System |
| 7 | Stock decremented, cart cleared | Stock at N | Stock at N-qty | System |
| 8 | Order confirmation displayed | — | Confirmation shown | System |
| 9 | User views order history | — | Order list displayed | System |
| 10 | User views order detail | — | Order detail displayed | System |

### 2.5 Relevant Requirements Covered

| Requirement ID | Requirement Summary |
|----------------|---------------------|
| B-CHECK-001 | User can enter shipping address |
| B-CHECK-002 | User can select payment method |
| B-CHECK-003 | User can review order before confirming |
| B-CHECK-004 | System calculates subtotal, discount, total |
| B-CHECK-005 | Order is created with status "placed" |
| B-CHECK-006 | Stock is decremented on order creation |
| B-CHECK-007 | User can view order confirmation |
| B-CHECK-008 | User can view order history |
| B-CHECK-009 | User can view order details |
| B-CHECK-010 | Order confirmation notification is sent |

---

## 3. State Transition Specification

### 3.1 Order Status States

| State | Description | Buyer Can Cancel | Merchant Can Update | Visible in History |
|-------|-------------|:----------------:|:-------------------:|:------------------:|
| `placed` | Order created, awaiting merchant confirmation | ✓ | ✓ (to `confirmed`) | ✓ |
| `confirmed` | Merchant accepted order | ✓ | ✓ (to `packed`) | ✓ |
| `packed` | Order packed and ready to ship | ✗ | ✓ (to `shipped`) | ✓ |
| `shipped` | Order sent to courier | ✗ | ✓ (to `out_for_delivery`) | ✓ |
| `out_for_delivery` | Order on the way to buyer | ✗ | ✗ | ✓ |
| `delivered` | Buyer received order | ✗ | ✗ | ✓ |

### 3.2 Payment Status States

| State | Description | Can Refund |
|-------|-------------|:----------:|
| `pending` | Payment not yet processed | No |
| `completed` | Payment successfully processed | Yes |
| `failed` | Payment processing failed | No |
| `refunded` | Payment refunded to buyer | No |

### 3.3 Order Status Transitions

| Transition ID | Origin State | Target State | Trigger Action | Guard Conditions |
|---------------|--------------|--------------|----------------|------------------|
| TR-ORDER-01 | `placed` | `confirmed` | Merchant confirms order | Merchant validates stock, shipping info |
| TR-ORDER-02 | `confirmed` | `packed` | Merchant packs order | — |
| TR-ORDER-03 | `packed` | `shipped` | Merchant ships order | Courier assigned, tracking number provided |
| TR-ORDER-04 | `shipped` | `out_for_delivery` | Courier dispatches for delivery | — |
| TR-ORDER-05 | `out_for_delivery` | `delivered` | Buyer receives order | Buyer confirms or auto-confirm after 7 days |

### 3.4 Checkout Form States

| State | Description | Can Submit |
|-------|-------------|:----------:|
| `IDLE` | Form loaded, no interaction yet | No |
| `EDITING` | User is filling in shipping address | No |
| `VALID` | All required fields valid, stock OK | Yes |
| `SUBMITTING` | Order submission in progress | No |
| `SUCCESS` | Order placed successfully | — |
| `ERROR` | Validation or server error occurred | No |

---

## 4. Business Rules

### 4.1 Checkout Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-CHECK-001 | Authentication Required | Only authenticated users can access checkout. | Backend (JwtAuthGuard) |
| BR-CHECK-002 | Cart Not Empty | Order placement requires a non-empty cart. `GET /checkout` currently returns HTTP 200 with `items: []` when the cart is empty. | Order placement service; not enforced by checkout-data endpoint |
| BR-CHECK-003 | Buyer Role Only | Checkout is restricted to Buyer role. Merchants and Admins get 403 Forbidden. | Backend (requireBuyerRole guard) |
| BR-CHECK-004 | Shipping Address Required | Shipping address must include: recipient name, phone, address line 1, city, state, postal code, country. | Backend (DTO validation) |
| BR-CHECK-005 | Payment Method Required | Payment method must be selected. | Backend (DTO validation) |
| BR-CHECK-006 | Stock Validation | All items must have sufficient stock before order placement. Stock is re-validated at submission time. | Backend (service validation) |
| BR-CHECK-007 | Price Lock | Order total is calculated at order creation time using current DB prices. Cart prices are informational only. | Backend (order service) |
| BR-CHECK-008 | Subtotal Calculation | Subtotal = sum of (unit_price × quantity) for all items. | Backend (computed field) |
| BR-CHECK-009 | Discount Calculation | Discount is calculated after subtotal, based on applied coupon. Percentage discount: subtotal × (discount_value / 100). Fixed discount: discount_value (capped at subtotal). | Backend (order service) |
| BR-CHECK-010 | Total Calculation | total = subtotal - discount. Total must be > 0. | Backend (order service) |
| BR-CHECK-011 | Transactional Stock Decrement | Product stock decrements execute within the order Prisma transaction after the service checks cart availability. The current service does not use row-level product locks. | Backend (Prisma transaction) |
| BR-CHECK-012 | Cart Clearance | Successful order placement clears all items from the user's cart. | Backend (order service) |
| BR-CHECK-013 | Order Confirmation | Order confirmation page displays order ID, status, items, and total. | Frontend |
| BR-CHECK-014 | Checkout Persistence Atomicity | Orders, order items, initial status history, product stock updates, promotion usage updates, notifications, and cart-item deletion run within the Prisma transaction. Checkout does not create `inventory_transactions` rows. | Backend (Prisma transaction) |
| BR-CHECK-015 | Immutable Order Snapshot | Each `order_items` row copies the cart item quantity and the current authoritative product price at checkout. Later changes to `cart_items` or `products` must not alter the order. | Backend (order service) |

### 4.2 Coupon Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-COUPON-001 | Code Validation | Coupon code must exist, be active, and belong to a merchant. | Backend (promotions service) |
| BR-COUPON-002 | Expiry Check | Coupon must not be expired (expires_at > now). | Backend (service validation) |
| BR-COUPON-003 | Minimum Order | If min_order_amount is set, subtotal must meet or exceed it. | Backend (service validation) |
| BR-COUPON-004 | Usage Limit | If max_uses is set, used_count must be < max_uses. | Backend (service validation) |
| BR-COUPON-005 | Single Use Per User | Coupon validation checks prior buyer use; order placement also rejects previously used vouchers/coupons. | Backend service |
| BR-COUPON-006 | Merchant Scope | Coupon must belong to the merchant whose products are in the cart. (For MVP: any valid coupon applies.) | Backend (future) |
| BR-COUPON-007 | Discount Type | `percentage`: discount = subtotal × (value / 100). `fixed`: discount = min(value, subtotal). | Backend (order service) |
| BR-COUPON-008 | One Coupon Per Merchant Order | Checkout stores at most one voucher per merchant and can remove it client-side. Multi-merchant carts may create separate orders with separate voucher codes. | Frontend state and backend order service |
| BR-COUPON-009 | Usage Increment | On successful order, coupon used_count is incremented atomically. | Backend (Prisma transaction) |

### 4.3 Sponsored Ad Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AD-001 | Placement Eligibility | Checkout requests `checkout_page_banner`; the search ads service filters by matching fee-setting placement. | Backend SearchService |
| BR-AD-002 | Approval Status | Only approved ads are returned. | Backend SearchService |
| BR-AD-003 | Active Status | Only active ads are returned. | Backend SearchService |
| BR-AD-004 | Schedule Check | Ads must satisfy `startsAt <= now` and `expiresAt >= now`; ads from unapproved shops are excluded. | Backend SearchService |
| BR-AD-005 | Result Ordering | Ads sort by `startsAt DESC`; the response DTO currently assigns `tier: standard` to every ad. No premium/standard/basic ranking is applied. | Backend SearchService |
| BR-AD-006 | Rotation | No round-robin rotation is applied on the checkout search ads route. | Current implementation |
| BR-AD-007 | Maximum Ads | Search ads endpoint returns at most five ads. | Backend SearchService |
| BR-AD-008 | Checkout Ad Cache | No Redis result cache is applied on the checkout search ads route. | Current implementation |
| BR-AD-009 | Graceful Degradation | Empty/error data yields no visible banner; checkout continues without ads. | Frontend |
| BR-AD-010 | Reduced Motion | Slider suppresses timed auto-advance for `prefers-reduced-motion: reduce`; no separate slide-down entrance animation is implemented. | Frontend |
| BR-AD-011 | Pause on Interaction | Auto-advance pauses on hover or keyboard focus and resumes after leave/blur. | Frontend |
| BR-AD-012 | Click Tracking | Slider supports a click callback, but Checkout does not pass one; checkout ad clicks are not tracked through this callback. | Frontend (not wired on checkout) |
### 4.4 Order History Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-HIST-001 | Owner-Only Access | Users can only view their own orders. | Backend (service filter by buyer_id) |
| BR-HIST-002 | Pagination | Order history is paginated with default 10 items per page. | Backend (query params) |
| BR-HIST-003 | Sort Order | Orders are sorted by created_at descending (newest first). | Backend (default query) |

### 4.5 Display Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-DISP-001 | Order Status Badge | Display order status with color-coded badge (placed: blue, confirmed: yellow, shipped: purple, delivered: green). | Frontend |
| BR-DISP-002 | Price Formatting | Display all prices with locale-appropriate currency formatting. | Frontend (i18n) |
| BR-DISP-003 | Order Timeline | Display order status timeline as vertical stepper with timestamps. | Frontend |
| BR-DISP-004 | Estimated Delivery | Show estimated delivery date for orders in `shipped` or `out_for_delivery` status. | Frontend |

---

## 5. Screen Specifications

### 5.1 Screen: Checkout Page (`/buyer/checkout`)

**Purpose:** Allow authenticated buyers to review their order, enter shipping details, select payment method, and place the order.

#### 5.1.1 UI Elements

**Checkout View:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-01 | Page Title | Heading (h1) | `checkout.title` | Yes | "Checkout" / "チェックアウト" |
| EL-02 | Order Summary Section | Container | — | Yes | Left column with order items and totals |
| EL-03 | Shipping Address Section | Container | — | Yes | Right column with address form |
| EL-04 | Payment Method Section | Container | — | Yes | Right column below shipping |
| EL-05 | Coupon Section | Container | — | Optional | Coupon code input and apply button |
| EL-06 | Order Items List | List | — | Yes | Cart items with images, names, prices, quantities |
| EL-07 | Order Item Row | Row | — | Yes | Product image, name, unit price, quantity, line total |
| EL-08 | Subtotal | Text | `checkout.subtotal` | Yes | Sum of all line totals |
| EL-09 | Coupon Code Input | Input (text) | `checkout.couponCode` | No | Discount code entry |
| EL-10 | Apply Coupon Button | Button (secondary) | `checkout.applyCoupon` | No | Validate and apply coupon |
| EL-11 | Discount Amount | Text (green) | `checkout.discount` | Conditional | "-$X.XX" if coupon applied |
| EL-12 | Remove Coupon Button | Button (ghost) | `checkout.removeCoupon` | Conditional | Remove applied coupon |
| EL-13 | Total Amount | Text (bold) | `checkout.total` | Yes | Final total amount |
| EL-14 | Recipient Name | Input (text) | `checkout.recipientName` | Yes | Name of person receiving the order |
| EL-15 | Phone Number | Input (tel) | `checkout.phone` | Yes | Contact phone for delivery |
| EL-16 | Address Line 1 | Input (text) | `checkout.address1` | Yes | Street address |
| EL-17 | Address Line 2 | Input (text) | `checkout.address2` | No | Apartment, suite, unit, etc. |
| EL-18 | City | Input (text) | `checkout.city` | Yes | City or municipality |
| EL-19 | State/Province | Input (text) | `checkout.state` | Yes | State or province |
| EL-20 | Postal Code | Input (text) | `checkout.postalCode` | Yes | ZIP or postal code |
| EL-21 | Country | Select | `checkout.country` | Yes | Country selection dropdown |
| EL-22 | Payment Method | Radio Group | `checkout.paymentMethod` | Yes | Payment method selection |
| EL-23 | Cash on Delivery | Radio Button | `checkout.cod` | Yes | Pay when order arrives |
| EL-24 | Bank Transfer | Radio Button | `checkout.bankTransfer` | Yes | Pay via bank transfer |
| EL-25 | Card Payment | Radio Button | `checkout.cardPayment` | Yes | Credit/debit card (stubbed) |
| EL-26 | Order Notes | Textarea | `checkout.notes` | No | Optional notes for merchant |
| EL-27 | Place Order Button | Button (primary, large) | `checkout.placeOrder` | Yes | Submit order |
| EL-28 | Back to Cart Link | Link | `checkout.backToCart` | Yes | "← Back to Cart" |
| EL-29 | Guest Login Alert Modal | Dialog/Modal | `checkout.guestLoginAlert` | Conditional | Alert modal for unauthenticated users: "Please log in to complete your purchase." with [Log in] button navigating to `/login` |
| EL-30 | Loading Overlay | Overlay | — | Conditional | Shown during order submission |
| EL-31 | Stock Warning Alert | Alert | — | Conditional | "Some items have changed stock availability" |
| EL-32 | Sponsored Ad Banner | Card | — | Conditional | Shared `AdBannerSlider` after the checkout header; hidden when no eligible ads or query data is unavailable. |
| EL-33 | Ad Carousel | Card content | — | Conditional | One ad is visible at a time; auto-advances every 5 seconds and loops, with previous/next controls and dots when multiple ads exist. No vertical slide-down transition. |
| EL-34 | Ad Card | Card | — | Conditional | Current ad is clickable; shared ads endpoint returns at most five. Layout stacks on narrow screens and is horizontal at medium widths. |
| EL-35 | Ad Image | Image (img) | — | Conditional | Uses the ad image, then product image/sample image fallback; alt text uses the ad title. |
| EL-36 | Ad Title | Heading (h3) | — | Conditional | Uses ad title or resolved product name; line treatment responds to viewport width. |
| EL-37 | Ad Description | Paragraph (p) | — | Conditional | HTML tags are stripped; hidden when no description is available. |
| EL-38 | Ad CTA Button | Button | — | Conditional | “Learn more”; navigates to product or ad destination. |
| EL-39 | Ad Announcement / Shop Badge | Badge (span) | — | Conditional | Announcement message (fallback “SPONSORED”) and shop/category tag; not the designed localized Sponsored badge. |
| EL-40 | Success Icon | Icon (checkmark) | — | Yes | Large green checkmark |
| EL-41 | Success Title | Heading (h1) | `checkout.confirmation.title` | Yes | "Order Placed Successfully!" |
| EL-42 | Order ID | Text | `checkout.confirmation.orderId` | Yes | "Order #ABC-12345" |
| EL-43 | Order Status | Badge | `checkout.confirmation.status` | Yes | "Placed" status badge |
| EL-44 | Estimated Delivery | Text | `checkout.confirmation.estimatedDelivery` | Conditional | `estimatedDelivery` is returned by order placement but is not currently rendered on confirmation. |
| EL-45 | Order Summary Card | Card | — | Yes | Items, totals, shipping address |
| EL-46 | Continue Shopping Button | Button (primary) | `checkout.confirmation.continueShopping` | Yes | Navigates to `/buyer/search`. |
| EL-47 | View Order Button | Button (secondary) | `checkout.confirmation.viewOrder` | Yes | Navigate to /orders/:orderId |
| EL-48 | Print Receipt Button | Button (ghost) | `checkout.confirmation.print` | No | Print order confirmation |

**Default State:**
- Order items displayed in summary with thumbnails and quantities
- Subtotal, and total calculated and displayed
- Shipping address form with required fields
- Payment method defaults to "Cash on Delivery"
- Place Order button disabled until form is valid
- Loading overlay shown during submission

### 5.2 Screen: Order Confirmation Page (`/buyer/checkout/confirmation/:orderId`)

**Purpose:** Confirm successful order placement and display order summary.

#### 5.2.1 UI Elements

**Confirmation View:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-40 | Success Icon | Icon (checkmark) | — | Yes | Large green checkmark |
| EL-41 | Success Title | Heading (h1) | `checkout.confirmation.title` | Yes | "Order Placed Successfully!" |
| EL-42 | Order ID | Text | `checkout.confirmation.orderId` | Yes | "Order #ABC-12345" |
| EL-43 | Order Status | Badge | `checkout.confirmation.status` | Yes | "Placed" status badge |
| EL-44 | Estimated Delivery | Text | `checkout.confirmation.estimatedDelivery` | Conditional | `estimatedDelivery` is returned by order placement but is not currently rendered on confirmation. |
| EL-45 | Order Summary Card | Card | — | Yes | Items, totals, shipping address |
| EL-46 | Continue Shopping Button | Button (primary) | `checkout.confirmation.continueShopping` | Yes | Navigates to `/buyer/search`. |
| EL-47 | View Order Button | Button (secondary) | `checkout.confirmation.viewOrder` | Yes | Navigate to /orders/:orderId |
| EL-48 | Print Receipt Button | Button (ghost) | `checkout.confirmation.print` | No | Print order confirmation |

**Default State:**
- Success animation on load
- Order summary displayed with all items
- Estimated delivery date shown for shipped orders
- Buttons for navigation

### 5.3 Screen: Order History Page (`/orders`)

**Purpose:** Display a paginated list of all past orders for the authenticated buyer.

#### 5.3.1 UI Elements

**Order History View:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-49 | Page Title | Heading (h1) | `orders.title` | Yes | "Order History" / "注文履歴" |
| EL-50 | Order Count | Text | `orders.orderCount` | Yes | "{count} orders" |
| EL-51 | Orders Table | Table | — | Yes | Table of order rows |
| EL-52 | Order Row | Row | — | Yes | Order ID, date, status, items count, total, actions |
| EL-53 | Order ID | Text (link) | — | Yes | Clickable order ID linking to detail |
| EL-54 | Order Date | Text | — | Yes | Formatted order date |
| EL-55 | Order Status | Badge | — | Yes | Color-coded status badge |
| EL-56 | Item Count | Text | — | Yes | Number of items in order |
| EL-57 | Order Total | Text | — | Yes | Total amount with currency |
| EL-58 | View Detail Button | Button (ghost) | `orders.viewDetail` | Yes | Navigate to order detail |
| EL-59 | Empty State | EmptyState | `orders.empty` | Conditional | "No orders yet. Start shopping!" |
| EL-60 | Pagination | Pagination | — | Conditional | Page navigation (if > 1 page) |
| EL-61 | Loading Skeleton | Skeleton | — | Conditional | Shown while loading order data |

**Default State:**
- Orders displayed in table sorted by newest first
- Status badges with color coding
- Pagination controls at bottom

### 5.4 Screen: Order Detail Page (`/orders/:orderId`)

**Purpose:** Display full order information including items, address, payment, and tracking.

#### 5.4.1 UI Elements

**Order Detail View:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-62 | Page Title | Heading (h1) | `orderDetail.title` | Yes | "Order Detail" / "注文詳細" |
| EL-63 | Order ID | Text | `orderDetail.orderId` | Yes | "Order #ABC-12345" |
| EL-64 | Order Date | Text | `orderDetail.orderDate` | Yes | Formatted order date |
| EL-65 | Order Status | Badge | `orderDetail.status` | Yes | Current status badge |
| EL-66 | Order Items Section | Container | — | Yes | List of ordered products |
| EL-67 | Order Item Row | Row | — | Yes | Product image, name, quantity, unit price, line total |
| EL-68 | Subtotal | Text | `orderDetail.subtotal` | Yes | Sum of line totals |
| EL-69 | Discount | Text (green) | `orderDetail.discount` | Conditional | Discount amount if coupon applied |
| EL-70 | Total Amount | Text (bold) | `orderDetail.total` | Yes | Final total |
| EL-71 | Shipping Address Card | Card | — | Yes | Recipient name, phone, full address |
| EL-72 | Payment Info Card | Card | — | Yes | Payment method and status |
| EL-73 | Order Notes | Text | `orderDetail.notes` | Conditional | Buyer's notes if provided |
| EL-74 | Order Timeline | Timeline/Stepper | — | Yes | Vertical status timeline with timestamps |
| EL-75 | Timeline Step | Step Item | — | Yes | Status name, timestamp, description |
| EL-76 | Tracking Number | Text | `orderDetail.trackingNumber` | Conditional | Courier tracking number (if shipped) |
| EL-77 | Estimated Delivery | Text | `orderDetail.estimatedDelivery` | Conditional | Estimated delivery date |
| EL-78 | Back to Orders Link | Link | `orderDetail.backToOrders` | Yes | "← Back to Orders" |

**Default State:**
- Full order details displayed
- Timeline showing current status

### 5.5 Order Tracking Data (`GET /api/v1/orders/:orderId/tracking`; no mounted buyer tracking page)

**Purpose:** Display real-time order tracking with status timeline and estimated delivery.

#### 5.5.1 UI Elements

**Tracking View:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-79 | Page Title | Heading (h1) | `tracking.title` | Yes | "Track Order" / "注文追踪" |
| EL-80 | Order ID | Text | `tracking.orderId` | Yes | "Order #ABC-12345" |
| EL-81 | Current Status | Badge (large) | `tracking.currentStatus` | Yes | Current status with icon |
| EL-82 | Tracking Timeline | Timeline/Stepper | — | Yes | Full status timeline |
| EL-83 | Timeline Step | Step Item | — | Yes | Status icon, name, timestamp, description |
| EL-84 | Estimated Delivery Card | Card | — | Conditional | Estimated delivery date and carrier info |
| EL-85 | Tracking Number | Text | `tracking.trackingNumber` | Conditional | Courier tracking number |
| EL-86 | Carrier Name | Text | `tracking.carrier` | Conditional | Shipping carrier name |
| EL-87 | Back to Order Link | Link | `tracking.backToOrder` | Yes | "← Back to Order Detail" |

---

## 6. Functional Operation Specification

### 6.1 Operation: Load Checkout Page

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Navigation to `/buyer/checkout` |
| **API Endpoint** | `GET /api/v1/checkout` |
| **Request Headers** | `Authorization: Bearer <accessToken>` |
| **Pre-Submission Validation** | JWT and buyer role are required. Empty cart is not rejected by this GET operation. |
| **Processing Steps** | Upsert the buyer cart; fetch items with product and merchant data; compute current-price line totals and subtotal; return `items`, `subtotal`, `discountAmount: "0.00"`, `total`, and `cartId`. Each item includes `isAvailable`, `merchantId`, and `merchantName`. No saved-address lookup occurs. |
| **Success Response** | HTTP 200, including an empty `items` array when the cart has no items. |
| **Post-Action** | Render checkout form and order summary; page displays a load error only when the request fails. |
### 6.2 Operation: Load Sponsored Ad Slot

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | `AdBannerSlider` mounts on Checkout page |
| **API Endpoint** | `GET /api/v1/search/ads?placement=checkout_page_banner` (mounted page uses `features/search/services/ad.service.ts`) |
| **Request Headers** | Public route; checkout JWT is not required by the ads endpoint. |
| **Processing Steps** | `SearchService.getAdsByPlacement` filters fee-setting placement, approved ads, active ads, `startsAt <= now`, `expiresAt >= now`, and approved shops. It orders by `startsAt DESC`, takes at most five, and projects tier as `standard`. No payment-status filter, named tier ranking, Redis rotation, or result cache is applied on this route. The frontend filters placement/schedule, hides empty data, auto-advances every five seconds, pauses on hover/focus, and disables its timer for reduced motion. Checkout does not pass analytics callbacks. |
| **Success Response** | `{ data: [...] }` with ad fields including `id`, `placement`, `title`, `announcementMessage`, `description`, `imageUrl`, `sku`, `tier`, `approvalStatus`, `startsAt`, and `expiresAt`. |
| **Error Response** | Search ads service response is treated as query error by frontend; no banner is rendered. |
| **Not Implemented in Current Checkout Path** | The separate `/api/v1/checkout/sponsored-ads` endpoint is not used by the page. No five-minute checkout-result cache, premium-first tier ordering, rotation, slide-down entrance transition, or checkout click-analytics callback is implemented. |
### 6.3 Operation: Validate Coupon Code

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Apply" button click after entering coupon code |
| **API Endpoint** | `POST /api/v1/checkout/validate-coupon` |
| **Request Headers** | `Authorization: Bearer <accessToken>` |
| **Request Body** | `{ couponCode: string, subtotal: number }` |
| **Pre-Submission Validation** | Coupon code not empty, subtotal > 0 |
| **Processing Steps** | 1. Validate JWT token. 2. Find promotion by code. 3. Verify `is_active = true`. 4. Check `expires_at > now()`. 5. Check `min_order_amount` if set. 6. Check `used_count < max_uses` if `max_uses` is set. 7. Calculate discount amount. 8. Return discount details. |
| **Success Response** | 200 OK with discount amount, discount type, and new total |
| **Error Response** | 400 Bad Request (invalid/expired/limited coupon) |
| **Post-Action** | Update order summary with discount |

### 6.4 Operation: Place Order

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Place Order" button click on checkout page |
| **API Endpoint** | `POST /api/v1/orders` |
| **Request Headers** | `Authorization: Bearer <accessToken>` |
| **Request Content-Type** | `application/json` |
| **Request Body** | `{ shippingAddress: ShippingAddressDTO, paymentMethod: string, couponCode?: string, voucherCodes?: Record<merchantId, code>, notes?: string }` |
| **Pre-Submission Validation** | All required fields present, cart not empty |
| **Processing Steps** | Validate DTO; reject empty cart or inactive/insufficient-stock products; group cart by merchant; recalculate using database prices; apply submitted per-merchant vouchers (or legacy coupon); reject a group total at or below zero. In one Prisma transaction create one `placed` / `pending` order per merchant, items, initial status history and merchant notification, increment promotion usage, decrement stock, then delete cart items. |
| **Success Response** | 201 Created with `{ data: { orders: [...] } }`; one order object per merchant group, including generated `orderNumber` (`ORD-` + first 8 uppercase UUID characters) and estimated delivery at creation time + 7 days. |
| **Error Response** | 400 for DTO/domain failures, including empty cart and insufficient stock. |
| **Post-Action** | Navigate to order confirmation page |

#### 6.4.1 Checkout Persistence and Transaction Design

Order records, order items, stock decrements, promotion increments, notifications, status history, and cart-item deletion are executed in the Prisma transaction. A failure within the transaction rolls back those writes. The current order service does not implement row-level product locks and does not write inventory transaction records.

##### A. Cart Integration Logic (`carts`, `cart_items` to `orders`, `order_items`)

1. Load the single cart whose `carts.user_id` equals the authenticated buyer ID, together with its `cart_items` and the referenced `products`.
2. Reject the request with `400 BAD_REQUEST` if no cart exists or it has no items. Reject with `400 BAD_REQUEST` if any cart product is inactive or has insufficient stock.
3. Group cart items by `products.merchant_id`. Because an `orders` row has one `merchant_id`, create one order per merchant group. The request succeeds only if every group can be created; otherwise the complete transaction rolls back. For a single-merchant cart this produces one order.
4. For each group, calculate price and totals from the cart product records loaded by the service, not from client input. Insert `orders` with `buyer_id`, the group `merchant_id`, shipping/payment fields, computed amounts, and `status = 'placed'`.
5. Insert one `order_items` row per source `cart_items` row, copying `product_id`, `merchant_id`, requested `quantity`, current product price as `unit_price`, and `quantity * unit_price` as `total_price`. `cart_items` remain the mutable shopping intent; `order_items` are the immutable purchase snapshot.
6. Delete only the `cart_items` rows successfully converted to order items. Once all rows have been consumed, retain the buyer's empty `carts` row for subsequent use. A failed checkout leaves the cart unchanged.

##### B. Inventory Transaction Logic (`inventory_transactions`)

Checkout does not create `inventory_transactions` rows. Product stock is decremented for each order item inside the order transaction; inventory ledger entries described in older design material are not part of the current checkout implementation.

##### C. Order Status History Tracking (`order_status_history`)

`orders.status` holds the current state, while `order_status_history` is the authoritative chronological audit trail. Resolve each named status to its `order_statuses` master row and insert exactly one history row in the same database transaction whenever `orders.status` changes.

| Transition | `orders.status` update | History record |
|------------|------------------------|----------------|
| Checkout succeeds | Create as `placed` | Insert the order ID, `placed` status ID, and note `Order placed`. |
| Merchant confirms | `placed` to `confirmed` | Insert the `confirmed` status ID, `changed_by = merchant user ID`, and optional operational note. |
| System/courier fulfillment transition | Update to the allowed next state | Insert the target status ID; `changed_by` is the acting user when known, otherwise `NULL`, with a system/courier note. |

Status history rows are never updated or deleted during normal operation. The order-tracking API joins `order_status_history` to `order_statuses`, orders by `created_at ASC` (then `id ASC` as a tie-breaker), and returns each status, timestamp, actor where permitted, and note. The service rejects invalid or terminal-state transitions before updating either table.

### 6.5 Operation: View Order History

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Navigation to `/orders` |
| **API Endpoint** | `GET /api/v1/orders` |
| **Request Headers** | `Authorization: Bearer <accessToken>` |
| **Query Parameters** | `page` (default: 1), `limit` (default: 10) |
| **Pre-Submission Validation** | User authenticated |
| **Processing Steps** | 1. Validate JWT token. 2. Query orders where `buyer_id = user.id`. 3. Sort by `created_at` descending. 4. Join with order_items for item count. 5. Paginate results. 6. Return paginated order list. |
| **Success Response** | 200 OK with orders array and pagination meta |

### 6.5 Operation: View Order Detail

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Click on order ID or "View Detail" button |
| **API Endpoint** | `GET /api/v1/orders/:id` |
| **Request Headers** | `Authorization: Bearer <accessToken>` |
| **Pre-Submission Validation** | User authenticated, order exists, belongs to user |
| **Processing Steps** | 1. Validate JWT token. 2. Find order by ID. 3. Verify `buyer_id = user.id`. 4. Fetch order_items with product details. 5. Return full order detail. |
| **Success Response** | 200 OK with order detail data |
| **Error Response** | 404 Not Found, 403 Forbidden |

### 6.6 Operation: Track Order

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Click "Track Order" button on order detail |
| **API Endpoint** | `GET /api/v1/orders/:id/tracking` |
| **Request Headers** | `Authorization: Bearer <accessToken>` |
| **Pre-Submission Validation** | User authenticated, order exists, belongs to user |
| **Processing Steps** | 1. Validate JWT token. 2. Find order by ID. 3. Verify `buyer_id = user.id`. 4. Build status timeline from order history. 5. Calculate estimated delivery date. 6. Return tracking data. |
| **Success Response** | 200 OK with tracking timeline and estimated delivery |

---

## 7. Input / Output Specification

### 7.1 Input Specification — Shipping Address (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|------------|
| `recipientName` | Recipient Name | 受取人氏名 | VARCHAR(200) | Yes | `@IsString()`, `@IsNotEmpty()`, `@MaxLength(200)` |
| `phone` | Phone Number | 電話番号 | VARCHAR(20) | Yes | Backend: `@IsString()`, `@IsNotEmpty()`, `@MaxLength(20)`; frontend allows digits only, requires leading 0 and length 9 or 11, and caps input at 11. |
| `addressLine1` | Address Line 1 | 住所1 | VARCHAR(255) | Yes | `@IsString()`, `@IsNotEmpty()`, `@MaxLength(255)` |
| `addressLine2` | Address Line 2 | 住所2 | VARCHAR(255) | No | `@IsOptional()`, `@IsString()`, `@MaxLength(255)` |
| `city` | City | 市区町村 | VARCHAR(100) | Yes | `@IsString()`, `@IsNotEmpty()`, `@MaxLength(100)` |
| `state` | State/Province | 都道府県 | VARCHAR(100) | Yes | `@IsString()`, `@IsNotEmpty()`, `@MaxLength(100)` |
| `postalCode` | Postal Code | 郵便番号 | VARCHAR(20) | Yes | `@IsString()`, `@IsNotEmpty()`, `@MaxLength(20)` |
| `country` | Country | 国 | VARCHAR(100) | Yes | Backend: `@IsString()`, `@IsNotEmpty()`, `@MaxLength(100)`; frontend uses a fixed country list and defaults to `JP`. |

### 7.2 Input Specification — Order Placement (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|------------|
| `shippingAddress` | Shipping Address | 配送先住所 | JSON Object | Yes | Nested validation (Sec 7.1) |
| `paymentMethod` | Payment Method | 決済方法 | ENUM | Yes | `@IsIn(['cod', 'bank_transfer', 'card'])` |
| `couponCode` | Coupon Code | クーポンコード | String | No | `@IsOptional()`, `@IsString()`; legacy single code. |
| `voucherCodes` | Per-merchant vouchers | 店舗別クーポン | Object | No | `@IsOptional()`, `@IsObject()`; map of merchant ID to code. |
| `notes` | Order Notes | 備考 | String | No | Backend: `@IsOptional()`, `@IsString()` (no server maximum); frontend textarea limits input to 500 characters. |

### 7.3 Input Specification — Coupon Validation (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|------------|
| `couponCode` | Coupon Code | クーポンコード | String | Yes | `@IsString()`, `@IsNotEmpty()`; no maximum length decorator. |
| `subtotal` | Subtotal | 小計 | Number | Yes | `@IsNumber()`, `@Min(0.01)`; DTO message: “Subtotal must be greater than 0”. |

### 7.4 Output Specification — Sponsored Ad Slot

The mounted checkout page consumes the shared search-ad DTO, not the separate checkout service DTO.

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `adId` | `advertisements.id` | UUID string |
| `placement` | `ad_fee_settings.placement` | `checkout_page_banner` |
| `title`, `description`, `announcementMessage` | Advertisement record | Strings (description may be absent) |
| `imageUrl`, `sku` | Advertisement record | URL/string; SKU nullable |
| `ctaText`, `priorityAmount`, `shopName` | Shared ads projection | String/decimal/shop name |
| `startsAt`, `expiresAt` | Advertisement schedule | ISO 8601 timestamp or null |
| `productId`, `productSlug` | Product resolved by SKU or image | UUID/slug or null |
### 7.5 Output Specification — Order Confirmation (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `orderId` | `orders.id` | UUID string |
| `orderNumber` | Derived from `orders.id` | Short reference: first 8 chars of UUID |
| `status` | `orders.status` | Status enum string |
| `subtotal` | Calculated | Currency formatted string |
| `discountAmount` | `orders.discount_amount` | Currency formatted string |
| `total` | `orders.total_amount` | Currency formatted string |
| `paymentMethod` | `orders.payment_method` | Payment method string |
| `shippingAddress` | `orders.shipping_address` | JSON object |
| `createdAt` | `orders.created_at` | ISO 8601 timestamp |
| `estimatedDelivery` | Calculated | Date formatted string |

### 7.6 Output Specification — Order Summary (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `orderId` | `orders.id` | UUID string |
| `orderNumber` | Derived | Short reference |
| `status` | `orders.status` | Status enum string |
| `itemCount` | Count of `order_items` | Integer |
| `total` | `orders.total_amount` | Currency formatted string |
| `createdAt` | `orders.created_at` | ISO 8601 timestamp |

### 7.7 Output Specification — Order Detail (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `orderId` | `orders.id` | UUID string |
| `status` | `orders.status` | Status enum string |
| `items` | `order_items` with `products` | Array of item objects |
| `items[].productName` | `products.name` | String |
| `items[].productImage` | `products.images[0]` | URL string |
| `items[].quantity` | `order_items.quantity` | Integer |
| `items[].unitPrice` | `order_items.unit_price` | Currency formatted string |
| `items[].totalPrice` | `order_items.total_price` | Currency formatted string |
| `subtotal` | Calculated | Currency formatted string |
| `discountAmount` | `orders.discount_amount` | Currency formatted string |
| `total` | `orders.total_amount` | Currency formatted string |
| `shippingAddress` | `orders.shipping_address` | JSON object |
| `paymentMethod` | `orders.payment_method` | String |
| `paymentStatus` | `orders.payment_status` | Status string |
| `couponCode` | `orders.coupon_code` | String or null |
| `notes` | `orders.notes` | String or null |
| `createdAt` | `orders.created_at` | ISO 8601 timestamp |
| `updatedAt` | `orders.updated_at` | ISO 8601 timestamp |

### 7.8 Output Specification — Order Tracking (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `orderId` | `orders.id` | UUID string |
| `currentStatus` | `orders.status` | Status enum string |
| `timeline` | Derived from order status history | Array of status events |
| `timeline[].status` | Status code | String |
| `timeline[].timestamp` | Status change timestamp | ISO 8601 timestamp |
| `timeline[].description` | Status description | Localized string |
| `estimatedDelivery` | Calculated | Date formatted string |
| `trackingNumber` | From courier integration | String or null |
| `carrier` | From courier integration | String or null |

---

## 8. Input Validation Rules

### 8.1 Shipping Address Validation

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `recipientName` | Required, 1-200 chars; frontend allows Unicode letters and spaces only | "Recipient name is required" / "Name must contain letters and spaces only" | 「受取人氏名は必須です」/「氏名は文字と空白のみ入力できます」 |
| `phone` | Backend required, max 20; frontend digits only, starts with 0 and length 9 or 11; input max 11 | "Phone number is required" / "Phone must start with 0 and be 9 or 11 digits" | 「電話番号は必須です」/「電話番号の形式が正しくありません」 |
| `addressLine1` | Required, 1-255 chars | "Address is required" | "住所は必須です" |
| `city` | Required, 1-100 chars | "City is required" | "市区町村は必須です" |
| `state` | Required, 1-100 chars | "State is required" | "都道府県は必須です" |
| `postalCode` | Backend required, max 20; frontend digits only and 4-7 digits | "Postal code is required" / "Postal code must be between 4 and 7 digits" | 「郵便番号は必須です」/「郵便番号は4～7桁で入力してください」 |
| `country` | Required, 1-100 chars | "Country is required" | "国は必須です" |

### 8.2 Payment Method Validation

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `paymentMethod` | Required, must be 'cod', 'bank_transfer', or 'card' | "Payment method is required" / "Invalid payment method" | "決済方法は必須です" / "無効な決済方法です" |

### 8.3 Coupon Code Validation

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `couponCode` | Required, 1-50 chars | "Coupon code is required" | "クーポンコードは必須です" |
| — | Coupon must exist and be active | "Invalid coupon code" | "無効なクーポンコードです" |
| — | Coupon must not be expired | "Coupon has expired" | "クーポンの有効期限が切れています" |
| — | Minimum order amount not met | "Minimum order amount not met" | "最低注文金額を満たしていません" |
| — | Usage limit reached | "Coupon usage limit reached" | "クーポンの使用回数上限に達しました" |

### 8.5 Validation Enforcement Layers

1. **Frontend (Client)**: React Hook Form + Zod schema validation with real-time feedback before API calls.
2. **Backend (Server)**: NestJS ValidationPipe + class-validator DTOs on all endpoints.
3. **Database (DB)**: Prisma constraints (unique, check, FK) as final safety net.

---

## 9. Error Handling Specification

### 9.1 Error Response Structure

```json
{
  "statusCode": 400,
  "message": ["shippingAddress.recipientName must be a string"],
  "error": "Bad Request",
  "timestamp": "2026-08-17T12:00:00.000Z",
  "path": "/api/v1/orders"
}
```

### 9.2 Error Classification Table — Checkout

| HTTP Status | Error Code | Scenario | User-Facing Behavior |
|-------------|------------|----------|---------------------|
| `400` | `VAL_001` / validation details | Invalid order DTO, empty cart on order submission, unavailable stock, or non-positive order total | Order submit catch shows generic failure toast; validation is surfaced inline by form where applicable |
| `400` | `VAL_001` | Coupon inactive/expired, minimum amount unmet, usage cap reached, or invalid discount at order placement | Coupon mutation error or generic order-failure toast |
| `404` | `RES_001` | Coupon code not found during coupon validation | Coupon mutation error |
| `401` | `AUTH_001` | Missing/invalid JWT | Auth flow handles session; checkout page itself shows login dialog when unauthenticated |
| `403` | `RES_004` | Non-buyer on checkout/coupon routes | RolesGuard rejects request |
| `500` | Server error | Unexpected error | Order submit catch shows generic failure toast |

### 9.2.1 Error Classification Table — Sponsored Ad Slot

| HTTP Status | Error Code | Scenario | User-Facing Behavior |
|-------------|------------|----------|---------------------|
| `400` | `BAD_REQUEST` | Invalid placement parameter | Ad panel hidden (graceful degradation) |
| `404` | `NOT_FOUND` | No eligible ads for placement | Ad panel hidden (graceful degradation) |
| `500` | `INTERNAL_SERVER_ERROR` | Ad service error | Ad panel hidden (graceful degradation) |
| `503` | `SERVICE_UNAVAILABLE` | Ad service unavailable | Ad panel hidden (graceful degradation) |

Note: Ad slot failures are non-critical. The checkout page functions normally without ads.

### 9.3 Error Classification Table — Order History & Detail

| HTTP Status | Error Code | Scenario | User-Facing Behavior |
|-------------|------------|----------|---------------------|
| `401` | `UNAUTHORIZED` | Missing or invalid JWT token | Redirect to login |
| `404` | `NOT_FOUND` | Order not found | Toast: "Order not found" |
| `403` | `FORBIDDEN` | Accessing another user's order | Toast: "Order not found" |
| `500` | `INTERNAL_SERVER_ERROR` | Server error | Toast: "Something went wrong. Please try again." |

### 9.5 Frontend Error Display Behavior

- **Field-Level Validation**: Red border and inline text below invalid input.
- **Toast Notifications**: Used for API errors and successful actions (order placed).
- **Loading States**: Spinner on Place Order button; full-page overlay during submission.
- **Stock Warnings**: Alert banner if stock changes detected during checkout.
- **Empty State**: Shown when no orders exist in history.

---

## 10. Permission and Access Control

### 10.1 Authentication Requirements

- JSON Web Token (JWT) Bearer Token passed via `Authorization` header for all checkout and order endpoints.
- Refresh token stored in httpOnly cookie for session management.

### 10.2 Public vs Protected Endpoints

| Endpoint | Access Level | Description |
|----------|-------------|-------------|
| `GET /checkout` | Protected (buyer role) | Load checkout page data |
| `GET /search/ads?placement=checkout_page_banner` | Public shared search ads route | Checkout banner request used by mounted page |
| `GET /checkout/sponsored-ads` | Controller JWT/role guards apply | Separate endpoint exists but is not used by mounted page |
| `POST /checkout/validate-coupon` | Protected (buyer role; active-user guard) | Validate coupon against supplied subtotal |
| `GET /checkout/merchant-promotions/:merchantId` | Protected (buyer role) | List available merchant promotions |
| `POST /orders` | JWT/role guarded for buyer, merchant, admin, super_admin; active-user guarded | Place order; controller permits roles beyond buyer |
| `GET /orders` | JWT/role guarded | View order history, scoped by caller role |
| `GET /orders/:id` | JWT/role guarded | View order detail with service access checks |
| `GET /orders/:id/tracking` | JWT/role guarded | Get tracking data; no mounted buyer tracking page route |

### 10.3 Role-Based Access

| Role | Can Access Checkout | Can Place Orders | Can View History |
|------|:-------------------:|:----------------:|:----------------:|
| `buyer` | ✓ | ✓ | ✓ |
| `merchant` | ✗ | Controller permits; service semantics apply | Role-dependent |
| `admin` / `super_admin` | ✗ | Controller permits; service semantics apply | Role-dependent |

### 10.4 Ownership Rules

| Resource | Ownership Rule | Enforcement |
|----------|---------------|-------------|
| Orders | Users can only view/modify their own orders | Backend filters by `buyer_id` from JWT |
| Order Items | Inherited from order ownership | Backend filters via order join |
| Coupons | Coupons are merchant-created, buyer-applied | Backend validates coupon existence |

---

## 11. Real-Time Notification Behavior

### 11.1 Current Implementation

The Checkout and Order pages operate with standard REST API calls. Real-time WebSocket updates are not required for these features.

### 11.2 Post-Order Notifications

| Event | Trigger | Target | Action |
|-------|---------|--------|--------|
| `order_placed` | Order successfully placed | Merchant | In-app notification: "New order received" |
| `order_status_changed` | Merchant updates order status | Buyer | In-app notification: "Your order status has been updated" |

### 11.3 Client-Side State Updates

| Event | Trigger | Action |
|-------|---------|--------|
| `order:placed` | Order submission success | Navigate to confirmation page; clear cart state |
| `coupon:applied` | Apply button click | Update order summary totals |
| `coupon:removed` | Remove button click | Reset totals to pre-coupon values |

---

## 12. Screen Transition Specification

### 12.1 Inbound Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| Buyer cart page (`/buyer/cart`) | `/buyer/checkout` | Click "Proceed to Checkout" |
| Checkout page | `/login?redirect=%2Fcheckout` | Guest selects [Log in] in the checkout dialog |
| Order detail page | `/buyer/checkout/confirmation/:orderId` | After successful order placement |

### 12.2 Internal Navigation

| Source | Target | Trigger |
|--------|--------|---------|
| `/buyer/checkout` | `/buyer/checkout/confirmation/:orderId` | Order placed successfully; sibling orders are passed in `orderIds` query parameter |
| `/buyer/checkout` | `/buyer/cart` | Click "Back to Cart" or Cancel |
| `/orders` | `/orders/:orderId` | Click order ID or "View Detail" |
| `/orders/:orderId` | Tracking endpoint `/api/v1/orders/:orderId/tracking` | Tracking data is API-backed; no buyer tracking page route is mounted |
| `/orders/:orderId` | `/orders` | Click "← Back to Orders" |

### 12.3 Outbound Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| `/buyer/checkout/confirmation/:orderId` | `/buyer/search` | Click "Continue Shopping" |
| `/buyer/checkout/confirmation/:orderId` | `/orders/:orderId` | Click "View Order" |
| `/orders` | `/login` | Session expired (401) |
| `/buyer/checkout` | `/login` | Session expired (401) |

### 12.4 Error Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| `/buyer/checkout` | — | Empty cart currently remains on checkout with an empty summary (no automatic cart redirect). |
| `/buyer/checkout` | `/login` | Session expired (401) |
| `/orders/:orderId` | `/orders` | 404 Order not found |
| Any checkout/order page | `/login` | Guest user attempts checkout (via alert modal) |

---

## 13. Non-Functional Considerations

### 13.1 Performance Requirements

| Metric | Target |
|--------|--------|
| Checkout Page Load | ≤ 2 seconds |
| Order Placement API | ≤ 2 seconds |
| Coupon Validation API | ≤ 500 milliseconds |
| Ad Slot Load | Target only; current page fetches ads asynchronously through shared query hook |
| Order History Page Load | ≤ 2 seconds |
| Order Detail Page Load | ≤ 1 second |
| Stock Validation Check | ≤ 100 milliseconds |

### 13.2 Caching Strategy

| Cache Target | Strategy | TTL |
|--------------|----------|-----|
| Product prices | Real-time from DB | — |
| Stock quantities | Real-time from DB | — |
| Coupon validation | No cache (must be current) | — |
| Order data | No cache (user-specific, real-time) | — |
| Checkout search ads | No response cache or Redis rotation on this route | — |

### 13.3 Security Considerations

| Concern | Mitigation |
|---------|------------|
| Unauthorized access | JWT Bearer token validation on all endpoints |
| Price manipulation | Price fetched from DB at order creation, not client-provided |
| Stock manipulation | Atomic stock decrement within Prisma transaction |
| IDOR attacks | Ownership validation (buyer_id from JWT) |
| Race conditions on stock | Atomic operations with row-level locking via Prisma |
| Double-spending coupons | Atomic coupon used_count increment within order transaction |
| Payment fraud | Payment status tracking (stubbed for MVP; real gateway integration deferred) |
| Order data leakage | Orders scoped to authenticated user only |

### 13.4 Responsive Design Requirements

| Breakpoint | Checkout Layout | Order History Layout |
|------------|-----------------|---------------------|
| Desktop (≥ 1024px) | Two-column: summary left, form right. Ad panel horizontal (image left, text right), full width above columns. | Full-width table |
| Tablet (768px – 1023px) | Two-column: summary left, form right (narrower). Ad panel horizontal (image left, text right), full width above columns. | Full-width table (compact) |
| Mobile (< 768px) | Single column: summary, then form. Ad panel stacked (image top, content below), full width between header and form. | Card-based list |

---

## 14. Configurable Items (External Definitions)

Defined via `.env` configuration:

| Definition Key | Default Value | Description |
|----------------|---------------|-------------|
| `ORDER_NUMBER_PREFIX` | `ORD` | Prefix for order reference numbers |
| `ORDER_AUTO_CONFIRM_DAYS` | `7` | Days after delivery before auto-confirm |
| `ORDER_HISTORY_PAGE_SIZE` | `10` | Default items per page in order history |
| `MAX_ORDER_ITEMS` | `50` | Maximum items per order |
| `MAX_QUANTITY_PER_ITEM` | `99` | Maximum quantity per order item |

---

## 15. Cross-Reference Traceability Matrix

### 15.1 Requirements Definition Traceability

| Requirement ID | Requirement Description | Covered By (This Document) |
|----------------|-------------------------|----------------------------|
| B-CHECK-001 | User can enter shipping address | UC-CHECK-001, Sec 5.1, Sec 7.1 |
| B-CHECK-002 | User can select payment method | UC-CHECK-001, Sec 5.1, Sec 7.2 |
| B-CHECK-003 | User can review order before confirming | UC-CHECK-001, Sec 5.1 |
| B-CHECK-004 | System calculates subtotal, discount, total | BR-CHECK-008~010, Sec 6.3 |
| B-CHECK-005 | Order is created with status "placed" | UC-CHECK-004, Sec 6.3 |
| B-CHECK-006 | Stock is decremented on order creation | BR-CHECK-013, Sec 6.3 |
| B-CHECK-007 | User can view order confirmation | UC-CHECK-004, Sec 5.2 |
| B-CHECK-008 | User can view order history | UC-CHECK-005, Sec 5.3, Sec 6.4 |
| B-CHECK-009 | User can view order details | UC-CHECK-006, Sec 5.4, Sec 6.5 |
| B-CHECK-010 | Order confirmation notification is sent | Sec 11.2 |
| B-CHECK-011 | Checkout displays ads returned by the search ads endpoint | UC-CHECK-008, Sec 5.1 (EL-32~39), Sec 6.2, BR-AD-001~012 |

### 15.2 Database Design Traceability

| Database Table | Relevant Functional Operations |
|----------------|-------------------------------|
| `orders` | Create (INSERT), View History (SELECT), View Detail (SELECT), Cancel (UPDATE status) |
| `order_items` | Create (INSERT on order placement), View Detail (SELECT with products) |
| `carts` | Load authenticated buyer's persistent cart (SELECT); retain an empty cart after successful checkout |
| `cart_items` | Load and convert to immutable `order_items` (SELECT); delete only after all order writes commit (DELETE) |
| `order_status_history` | Insert initial `placed` status and every later state transition; read in chronological order for tracking timeline |
| `inventory_transactions` | No rows are written by checkout order placement. |
| `products` | Stock validation (SELECT), Price lookup (SELECT), Stock decrement (UPDATE) |
| `advertisements` | Search ads endpoint reads eligible `checkout_page_banner` ads; checkout click analytics callback is not wired. |
| `advertisement_packages` | Not used by current checkout search ads projection for tier ranking. |
| `promotions` | Coupon validation (SELECT), Usage increment (UPDATE used_count) |
| `users` | Buyer identity from JWT; shipping address is entered in checkout and passed in the order request |

### 15.3 Related Document References

| Document ID | Document Name | File Path |
|-------------|---------------|-----------|
| SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` |
| SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` |
| SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` |
| SKM-FDS-WISH-CART-001 | Wishlist & Cart Functional Spec | `docs/screen/Wishlist_Cart/機能設計書_Wishlist_CartPage.md` |

---

*End of Functional Specification (Purchase & Checkout)*
