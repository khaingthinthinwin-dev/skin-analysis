# Functional Specification (機能設計書) — Purchase & Checkout

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-FDS-CHECKOUT-001 |
| **Target Screen** | Purchase & Checkout (購入・チェックアウト) |
| **Subsystem** | Buyer Module — Checkout, Order Placement & Order History |
| **Function ID** | FN-CHECK-001, FN-ORDER-001 |
| **Version** | 1.3 |
| **Created** | 2026-08-17 |
| **Last Updated** | 2026-08-27 |
| **Author** | Software Architect |
| **Status** | Released (承認済み) |
| **Classification** | Internal — Engineering Division |

---

## Document Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.2 | 2026-08-23 | Software Architect | Removed shipping fee and tax fee from checkout calculation. Total is now calculated as subtotal - discount. |
| 1.3 | 2026-08-27 | Software Architect | Added sponsored ad slot specification for Checkout Top placement (UC-CHECK-008, Sec 4.4, Sec 5.1 EL-32~39, Sec 6.2, Sec 7.4, Sec 9.2.1, Sec 10.2, Sec 13.2). Includes ad fetch API, tier priority rules (Premium > Standard > Basic), round-robin rotation, slide-down panel behavior, auto-slide (5s interval, max 5 ads), responsive layouts, graceful degradation on error, pause-on-interaction (WCAG 2.2.2), reduced-motion support, click tracking analytics, Redis caching (TTL 5min), and cross-reference traceability updates. |
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
5. **Sponsored Ad Display** — Rendering a slide-down ad panel on the checkout page with approved, active, in-schedule ads from Merchant-purchased Advertisement Packages, applying package placement and tier priority rules.
6. **Order History** — Displaying a paginated list of all past orders with status, date, total, and item count.
7. **Order Details** — Showing full order information including items, shipping address, payment status, and order timeline.
8. **Order Tracking** — Providing real-time order status tracking with timeline visualization and estimated delivery date.
9. **Notification Delivery** — Sending order confirmation and status change notifications to the buyer and relevant merchant.

### 1.3 Target Users

| Attribute | Value |
|-----------|-------|
| **Primary Actor** | Authenticated Buyer |
| **Required Authentication** | JWT Bearer Token |
| **Data Scope** | Own orders, own shipping addresses, own payment records |
| **Guest Behavior** | Checkout unavailable. When a guest user attempts to access `/checkout`, an alert modal is displayed: "Please log in to complete your purchase." Clicking [Log in] navigates to the login page (`/login`). |

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
| UC-CHECK-001 | View Checkout Page | User is authenticated. Cart has at least one in-stock item. | Checkout page displayed with order summary, shipping form, and payment options. | Authenticated Buyer |
| UC-CHECK-002 | Apply Coupon Code | User is on checkout page. Valid coupon code entered. | Discount applied. Order total recalculated. | Authenticated Buyer |
| UC-CHECK-003 | Remove Coupon Code | User is on checkout page. Coupon code already applied. | Discount removed. Order total recalculated. | Authenticated Buyer |
| UC-CHECK-004 | Place Order | User is on checkout page. Shipping address valid. Payment method selected. Stock validated. | Order created with status `placed`. Stock decremented. Cart cleared. Order confirmation displayed. | Authenticated Buyer |
| UC-CHECK-005 | View Order History | User is authenticated. User has past orders. | Paginated order list displayed with status, date, total, and item count. | Authenticated Buyer |
| UC-CHECK-006 | View Order Detail | User is authenticated. Order exists and belongs to user. | Full order detail displayed with items, shipping address, payment status, and timeline. | Authenticated Buyer |
| UC-CHECK-007 | Track Order | User is authenticated. Order exists. | Order tracking timeline displayed with current status and estimated delivery. | Authenticated Buyer |
| UC-CHECK-008 | View Sponsored Ad Slot | User is authenticated. Checkout page loaded. | Approved, active, in-schedule ads displayed in slide-down panel with tier priority (Premium > Standard > Basic). Auto-slides every 5 seconds, max 5 ads. | Authenticated Buyer |

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
     │  (201)       │                 │  (400/409)          │
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
| BR-CHECK-002 | Cart Not Empty | Checkout requires at least one item in cart. | Backend (service validation) |
| BR-CHECK-003 | Buyer Role Only | Checkout is restricted to Buyer role. Merchants and Admins get 403 Forbidden. | Backend (requireBuyerRole guard) |
| BR-CHECK-004 | Shipping Address Required | Shipping address must include: recipient name, phone, address line 1, city, state, postal code, country. | Backend (DTO validation) |
| BR-CHECK-005 | Payment Method Required | Payment method must be selected. | Backend (DTO validation) |
| BR-CHECK-006 | Stock Validation | All items must have sufficient stock before order placement. Stock is re-validated at submission time. | Backend (service validation) |
| BR-CHECK-007 | Price Lock | Order total is calculated at order creation time using current DB prices. Cart prices are informational only. | Backend (order service) |
| BR-CHECK-008 | Subtotal Calculation | Subtotal = sum of (unit_price × quantity) for all items. | Backend (computed field) |
| BR-CHECK-009 | Discount Calculation | Discount is calculated after subtotal, based on applied coupon. Percentage discount: subtotal × (discount_value / 100). Fixed discount: discount_value (capped at subtotal). | Backend (order service) |
| BR-CHECK-010 | Total Calculation | total = subtotal - discount. Total must be > 0. | Backend (order service) |
| BR-CHECK-011 | Atomic Stock Decrement | Stock is decremented atomically within the order transaction. If any item fails stock check, entire order is rejected. | Backend (Prisma transaction) |
| BR-CHECK-012 | Cart Clearance | Successful order placement clears all items from the user's cart. | Backend (order service) |
| BR-CHECK-013 | Order Confirmation | Order confirmation page displays order ID, status, items, and total. | Frontend |
| BR-CHECK-014 | Checkout Persistence Atomicity | Creation of an order, order items, initial status history, inventory transactions, product stock updates, coupon usage update, and cart-item deletion must commit or roll back as one database transaction. | Backend (Prisma transaction) |
| BR-CHECK-015 | Immutable Order Snapshot | Each `order_items` row copies the cart item quantity and the current authoritative product price at checkout. Later changes to `cart_items` or `products` must not alter the order. | Backend (order service) |

### 4.2 Coupon Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-COUPON-001 | Code Validation | Coupon code must exist, be active, and belong to a merchant. | Backend (promotions service) |
| BR-COUPON-002 | Expiry Check | Coupon must not be expired (expires_at > now). | Backend (service validation) |
| BR-COUPON-003 | Minimum Order | If min_order_amount is set, subtotal must meet or exceed it. | Backend (service validation) |
| BR-COUPON-004 | Usage Limit | If max_uses is set, used_count must be < max_uses. | Backend (service validation) |
| BR-COUPON-005 | Single Use Per User | Each user can use a coupon code only once per order. | Backend (service validation) |
| BR-COUPON-006 | Merchant Scope | Coupon must belong to the merchant whose products are in the cart. (For MVP: any valid coupon applies.) | Backend (future) |
| BR-COUPON-007 | Discount Type | `percentage`: discount = subtotal × (value / 100). `fixed`: discount = min(value, subtotal). | Backend (order service) |
| BR-COUPON-008 | One Coupon Per Order | Only one coupon can be applied per order. Applying a new coupon replaces the previous one. | Backend (service logic) |
| BR-COUPON-009 | Usage Increment | On successful order, coupon used_count is incremented atomically. | Backend (Prisma transaction) |

### 4.3 Sponsored Ad Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AD-001 | Placement Eligibility | Ads are eligible only if they belong to a purchased Advertisement Package whose placement includes Checkout Top. | Backend (ads service) |
| BR-AD-002 | Approval Status | Only approved ads (`is_approved = true`) are eligible. | Backend (ads service) |
| BR-AD-003 | Active Status | Only active ads (`is_active = true`) are eligible. | Backend (ads service) |
| BR-AD-004 | Schedule Check | Ads whose `schedule_start <= now <= schedule_end` are eligible. | Backend (ads service) |
| BR-AD-005 | Tier Priority | Ads are prioritized by package tier: Premium > Standard > Basic. | Backend (ads service) |
| BR-AD-006 | Round-Robin Rotation | Within the same tier, ads are rotated using round-robin. | Backend (ads service) |
| BR-AD-007 | Maximum Ads | The slide-down panel displays a maximum of 5 ads. | Backend (ads service) |
| BR-AD-008 | Cache Strategy | Ad slot results are cached in Redis with key `cache:ads:checkout-top`, TTL 5 minutes. | Backend (ads service) |
| BR-AD-009 | Graceful Degradation | On ad fetch error or no eligible ads, the ad panel is hidden — checkout functions normally without ads. | Frontend |
| BR-AD-010 | Reduced Motion | When `prefers-reduced-motion: reduce`, slide-down animation is skipped (instant appear). Rotation rules unchanged. | Frontend |
| BR-AD-011 | Pause on Interaction | Auto-advancement pauses on hover or keyboard focus within ad panel; resumes on pointer leave / blur (WCAG 2.2.2). | Frontend |
| BR-AD-012 | Click Tracking | CTA click fires `ad.click` analytics event with `ad_id` and `placement`. | Frontend |

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

### 5.1 Screen: Checkout Page (`/checkout`)

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
| EL-32 | Sponsored Ad Slide-Down Panel | Slide-down panel (div) | `checkout.sponsored.label` | Conditional | Hidden until ad response arrives. On first eligible ad: slides down into view below [A] Page Header and above [B]+[C] row — horizontally centered across full container width (300ms ease-out, once per mount). Contains up to 5 ad slides with auto-slide every 5 seconds. |
| EL-33 | Ad Slide Track | Slider track (div) | — | Conditional | Renders when ad panel is expanded. Vertical slide-down transition between slides (500ms ease-in-out); advance interval 5s. |
| EL-34 | Ad Slide Card | Card (flex container) | — | Conditional | One card per eligible ad (max 5). Desktop/tablet (≥ 768px): horizontal — image left (w-80), text block right. Mobile (< 768px): stacked — image top, content below. Whole card clickable. |
| EL-35 | Ad Image / Banner | Image (img) | — | Conditional | Desktop: fixed 320×120, object-cover. Mobile: full-width 16:9, object-cover. Lazy-loaded. Alt text from i18n template. |
| EL-36 | Ad Title | Heading (h3) | — | Conditional | Single-line truncation. |
| EL-37 | Ad Description | Paragraph (p) | — | Conditional | Clamped to 2 lines. Hidden when null/empty. |
| EL-38 | Ad CTA Button | Button/Link (primary) | — | Conditional | Desktop: inline, right-aligned. Mobile: full-width. Keyboard-focusable with visible primary focus ring. |
| EL-39 | Sponsored Badge | Badge (span) | `checkout.sponsored.label` | Mandatory | Text: "Sponsored" / "スポンサー提供". Uppercase, amber background + dark text. Distinguishes ads from organic content. |
| EL-40 | Success Icon | Icon (checkmark) | — | Yes | Large green checkmark |
| EL-41 | Success Title | Heading (h1) | `checkout.confirmation.title` | Yes | "Order Placed Successfully!" |
| EL-42 | Order ID | Text | `checkout.confirmation.orderId` | Yes | "Order #ABC-12345" |
| EL-43 | Order Status | Badge | `checkout.confirmation.status` | Yes | "Placed" status badge |
| EL-44 | Estimated Delivery | Text | `checkout.confirmation.estimatedDelivery` | Conditional | "Estimated delivery: Aug 20, 2026" |
| EL-45 | Order Summary Card | Card | — | Yes | Items, totals, shipping address |
| EL-46 | Continue Shopping Button | Button (primary) | `checkout.confirmation.continueShopping` | Yes | Navigate to /products |
| EL-47 | View Order Button | Button (secondary) | `checkout.confirmation.viewOrder` | Yes | Navigate to /orders/:orderId |
| EL-48 | Print Receipt Button | Button (ghost) | `checkout.confirmation.print` | No | Print order confirmation |

**Default State:**
- Order items displayed in summary with thumbnails and quantities
- Subtotal, and total calculated and displayed
- Shipping address form with required fields
- Payment method defaults to "Cash on Delivery"
- Place Order button disabled until form is valid
- Loading overlay shown during submission

### 5.2 Screen: Order Confirmation Page (`/checkout/confirmation/:orderId`)

**Purpose:** Confirm successful order placement and display order summary.

#### 5.2.1 UI Elements

**Confirmation View:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-40 | Success Icon | Icon (checkmark) | — | Yes | Large green checkmark |
| EL-41 | Success Title | Heading (h1) | `checkout.confirmation.title` | Yes | "Order Placed Successfully!" |
| EL-42 | Order ID | Text | `checkout.confirmation.orderId` | Yes | "Order #ABC-12345" |
| EL-43 | Order Status | Badge | `checkout.confirmation.status` | Yes | "Placed" status badge |
| EL-44 | Estimated Delivery | Text | `checkout.confirmation.estimatedDelivery` | Conditional | "Estimated delivery: Aug 20, 2026" |
| EL-45 | Order Summary Card | Card | — | Yes | Items, totals, shipping address |
| EL-46 | Continue Shopping Button | Button (primary) | `checkout.confirmation.continueShopping` | Yes | Navigate to /products |
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

### 5.5 Screen: Order Tracking Page (`/orders/:orderId/tracking`)

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
| **Trigger** | Navigation to `/checkout` from cart page |
| **API Endpoint** | `GET /api/v1/checkout` |
| **Request Headers** | `Authorization: Bearer <accessToken>` |
| **Pre-Submission Validation** | User authenticated, role = buyer, cart has items |
| **Processing Steps** | 1. Validate JWT token. 2. Verify user role is `buyer`. 3. Fetch cart items with product details. 4. Validate stock for all items. 5. Calculate subtotal. 6. Fetch user's saved addresses (if any). 7. Return checkout data. |
| **Success Response** | 200 OK with cart items, subtotal, stock status, and user addresses |
| **Post-Action** | Render checkout form with order summary |

### 6.2 Operation: Load Sponsored Ad Slot

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Component mounts (Checkout page loaded) |
| **API Endpoint** | `GET /api/v1/ads?placement=checkout_top` |
| **Request Headers** | None (public cache) |
| **Pre-Submission Validation** | User authenticated (page-level) |
| **Processing Steps** | 1. Fetch ad slot in parallel to cart data fetch (does not block checkout loading). 2. Filter: Select approved advertisement records from Merchant-purchased Advertisement Packages for the Checkout Top placement. 3. Filter: Keep only approved, active ads whose schedule covers the current time (`is_approved = true`, `is_active = true`, `schedule_start <= now <= schedule_end`). 4. Apply package placement and tier priority rules (Premium > Standard > Basic), with round-robin rotation within each tier. 5. Limit the slider to a maximum of 5 ads. 6. Cache the resulting ad list in Redis with key `cache:ads:checkout-top`, TTL 5 minutes. 7. If eligible ads exist, slide panel into view (300ms ease-out, once per mount). With `prefers-reduced-motion: reduce`, panel appears instantly without animation. 8. Render each ad's image/banner, title, description (hidden when absent), CTA button, and Sponsored badge. 9. Auto-advance to the next ad every 5 seconds using vertical slide-down transition (500ms). Maximum 5 slides; loop after the last. 10. Pause auto-advancement on hover or keyboard focus within ad panel; resume on pointer leave / blur (WCAG 2.2.2). |
| **Success Response** | 200 OK with array of ad objects |
| **Error Response** | On error or empty response: hide ad panel entirely (graceful degradation) |
| **Post-Action** | Render ad panel if eligible ads exist; otherwise skip ad panel rendering |

#### 6.2.1 Ad Slot Response Structure

```json
{
  "data": [
    {
      "id": "uuid",
      "imageUrl": "https://cdn.example.com/ads/banner1.jpg",
      "title": "Summer Sale - 20% Off",
      "description": "Limited time offer on all skincare products.",
      "ctaText": "Shop Now",
      "ctaUrl": "https://example.com/summer-sale",
      "priority": "premium",
      "scheduleStart": "2026-08-20T00:00:00.000Z",
      "scheduleEnd": "2026-09-30T23:59:59.000Z"
    }
  ]
}
```

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
| **Request Body** | `{ shippingAddress: ShippingAddressDTO, paymentMethod: string, couponCode?: string, notes?: string }` |
| **Pre-Submission Validation** | All required fields present, cart not empty |
| **Processing Steps** | 1. Validate JWT token. 2. Verify user role is `buyer`. 3. Validate request body (DTO). 4. Fetch cart items with current product prices and stock. 5. Re-validate stock for all items. 6. Calculate subtotal from DB prices. 7. Validate and apply coupon if provided (BR-COUPON-001~008). 8. Calculate discount and total. 9. Create order record (status: `placed`). 10. Create order_items records. 11. Decrement stock atomically for all items. 12. Increment coupon used_count if coupon applied. 13. Clear user's cart. 14. Send order notification to merchant. 15. Return order confirmation. 16. Log ORDER_PLACED event. |
| **Success Response** | 201 Created with order confirmation data |
| **Error Response** | 400 (validation), 409 (insufficient stock) |
| **Post-Action** | Navigate to order confirmation page |

#### 6.4.1 Checkout Persistence and Transaction Design

All write steps below are executed inside one database transaction. The service uses row-level locks (or an equivalent conditional update) for the selected product rows so that stock is rechecked against the latest committed value. A failure at any step rolls back the order, order items, stock changes, inventory records, coupon update, and cart changes; no partial order is exposed to the buyer or merchant.

##### A. Cart Integration Logic (`carts`, `cart_items` to `orders`, `order_items`)

1. Load the single cart whose `carts.user_id` equals the authenticated buyer ID, together with its `cart_items` and the referenced `products`.
2. Reject the request with `400 BAD_REQUEST` if no cart exists or it has no items. Reject with `409 CONFLICT` if any referenced product is inactive, unavailable, belongs to an invalid merchant, or has insufficient stock.
3. Group cart items by `products.merchant_id`. Because an `orders` row has one `merchant_id`, create one order per merchant group. The request succeeds only if every group can be created; otherwise the complete transaction rolls back. For a single-merchant cart this produces one order.
4. For each group, calculate price and totals from the locked product records, not from client input. Insert `orders` with `buyer_id`, the group `merchant_id`, shipping/payment fields, computed amounts, and `status = 'placed'`.
5. Insert one `order_items` row per source `cart_items` row, copying `product_id`, `merchant_id`, requested `quantity`, current product price as `unit_price`, and `quantity * unit_price` as `total_price`. `cart_items` remain the mutable shopping intent; `order_items` are the immutable purchase snapshot.
6. Delete only the `cart_items` rows successfully converted to order items. Once all rows have been consumed, retain the buyer's empty `carts` row for subsequent use. A failed checkout leaves the cart unchanged.

##### B. Inventory Transaction Logic (`inventory_transactions`)

For each created `order_items` row, read the locked `products.stock_quantity` as `before_quantity`, verify `before_quantity >= order_items.quantity`, then update the product stock to `after_quantity = before_quantity - order_items.quantity`. Insert an `inventory_transactions` row in the same transaction with:

| Event | `transaction_type` | `quantity` | `before_quantity` / `after_quantity` | Reference and audit fields |
|-------|--------------------|------------|----------------------------------------|----------------------------|
| Order confirmation | `order_created` | `-order_items.quantity` | Stock immediately before/after the decrement | `product_id`, `merchant_id`, `reference_type = 'order'`, `reference_id = orders.id`, `reason = 'Checkout order placed'`, `created_by = buyer_id` |

The transaction log is append-only: `order_created` rows are never edited or deleted during normal operation.

##### C. Order Status History Tracking (`order_status_history`)

`orders.status` holds the current state, while `order_status_history` is the authoritative chronological audit trail. Resolve each named status to its `order_statuses` master row and insert exactly one history row in the same database transaction whenever `orders.status` changes.

| Transition | `orders.status` update | History record |
|------------|------------------------|----------------|
| Checkout succeeds | Create as `placed` | Insert `order_id`, the `placed` status ID, `changed_by = buyer_id`, and note `Order placed via checkout`. |
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
| `phone` | Phone Number | 電話番号 | VARCHAR(20) | Yes | `@IsString()`, `@IsNotEmpty()`, `@MaxLength(20)` |
| `addressLine1` | Address Line 1 | 住所1 | VARCHAR(255) | Yes | `@IsString()`, `@IsNotEmpty()`, `@MaxLength(255)` |
| `addressLine2` | Address Line 2 | 住所2 | VARCHAR(255) | No | `@IsOptional()`, `@IsString()`, `@MaxLength(255)` |
| `city` | City | 市区町村 | VARCHAR(100) | Yes | `@IsString()`, `@IsNotEmpty()`, `@MaxLength(100)` |
| `state` | State/Province | 都道府県 | VARCHAR(100) | Yes | `@IsString()`, `@IsNotEmpty()`, `@MaxLength(100)` |
| `postalCode` | Postal Code | 郵便番号 | VARCHAR(20) | Yes | `@IsString()`, `@IsNotEmpty()`, `@MaxLength(20)` |
| `country` | Country | 国 | VARCHAR(100) | Yes | `@IsString()`, `@IsNotEmpty()`, `@MaxLength(100)` |

### 7.2 Input Specification — Order Placement (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|------------|
| `shippingAddress` | Shipping Address | 配送先住所 | JSON Object | Yes | Nested validation (Sec 7.1) |
| `paymentMethod` | Payment Method | 決済方法 | ENUM | Yes | `@IsIn(['cod', 'bank_transfer', 'card'])` |
| `couponCode` | Coupon Code | クーポンコード | VARCHAR(50) | No | `@IsOptional()`, `@IsString()`, `@MaxLength(50)` |
| `notes` | Order Notes | 備考 | TEXT | No | `@IsOptional()`, `@IsString()`, `@MaxLength(500)` |

### 7.3 Input Specification — Coupon Validation (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|------------|
| `couponCode` | Coupon Code | クーポンコード | VARCHAR(50) | Yes | `@IsString()`, `@IsNotEmpty()`, `@MaxLength(50)` |
| `subtotal` | Subtotal | 小計 | DECIMAL(10,2) | Yes | `@IsNumber()`, `@Min(0)` |

### 7.4 Output Specification — Sponsored Ad Slot (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `id` | `advertisements.id` | UUID string |
| `imageUrl` | `advertisements.image_url` | URL string |
| `title` | `advertisements.title` | String |
| `description` | `advertisements.description` | String (nullable) |
| `ctaText` | `advertisements.cta_text` | String |
| `ctaUrl` | `advertisements.cta_url` | URL string |
| `priority` | Package tier | "premium" / "standard" / "basic" |
| `scheduleStart` | `advertisements.schedule_start` | ISO 8601 timestamp |
| `scheduleEnd` | `advertisements.schedule_end` | ISO 8601 timestamp |

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
| `recipientName` | Required, 1-200 chars | "Recipient name is required" | "受取人氏名は必須です" |
| `phone` | Required, 1-20 chars, phone format | "Phone number is required" / "Invalid phone number" | "電話番号は必須です" / "無効な電話番号です" |
| `addressLine1` | Required, 1-255 chars | "Address is required" | "住所は必須です" |
| `city` | Required, 1-100 chars | "City is required" | "市区町村は必須です" |
| `state` | Required, 1-100 chars | "State is required" | "都道府県は必須です" |
| `postalCode` | Required, 1-20 chars | "Postal code is required" | "郵便番号は必須です" |
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
| `400` | `BAD_REQUEST` | Validation failures (missing shipping fields) | Field-level inline errors + toast |
| `400` | `BAD_REQUEST` | Cart is empty | Toast: "Your cart is empty" |
| `400` | `BAD_REQUEST` | Invalid payment method | Toast: "Invalid payment method" |
| `400` | `BAD_REQUEST` | Invalid coupon code | Toast: "Invalid coupon code" |
| `400` | `BAD_REQUEST` | Coupon expired | Toast: "Coupon has expired" |
| `400` | `BAD_REQUEST` | Minimum order not met | Toast: "Minimum order amount not met" |
| `400` | `BAD_REQUEST` | Coupon usage limit reached | Toast: "Coupon usage limit reached" |
| `401` | `UNAUTHORIZED` | Missing or invalid JWT token | Redirect to login |
| `403` | `FORBIDDEN` | Non-buyer role (merchant/admin) | Toast: "Shopping features are only available to buyers" |
| `409` | `CONFLICT` | Insufficient stock during submission | Toast: "Some items are no longer available. Please review your cart." |
| `500` | `INTERNAL_SERVER_ERROR` | Server error | Toast: "Something went wrong. Please try again." |

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
| `GET /checkout` | Protected (Buyer) | Load checkout page data |
| `GET /ads` | Public (cached) | Load sponsored ad slot for checkout |
| `POST /checkout/validate-coupon` | Protected (Buyer) | Validate and apply coupon |
| `POST /orders` | Protected (Buyer) | Place new order |
| `GET /orders` | Protected (Buyer) | View order history |
| `GET /orders/:id` | Protected (Buyer) | View order detail |
| `GET /orders/:id/tracking` | Protected (Buyer) | Track order status |

### 10.3 Role-Based Access

| Role | Can Access Checkout | Can Place Orders | Can View History |
|------|:-------------------:|:----------------:|:----------------:|
| `buyer` | ✓ | ✓ | ✓ |
| `merchant` | ✗ | ✗ | ✗ |
| `admin` | ✗ | ✗ | ✗ |

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
| Cart page (`/cart`) | `/checkout` | Click "Proceed to Checkout" (all items in stock) |
| Product detail page | `/login` | Guest clicks "Buy Now" (alert modal) |
| Order detail page | `/checkout/confirmation/:orderId` | After successful order placement |

### 12.2 Internal Navigation

| Source | Target | Trigger |
|--------|--------|---------|
| `/checkout` | `/checkout/confirmation/:orderId` | Order placed successfully |
| `/checkout` | `/cart` | Click "← Back to Cart" |
| `/orders` | `/orders/:orderId` | Click order ID or "View Detail" |
| `/orders/:orderId` | `/orders/:orderId/tracking` | Click "Track Order" |
| `/orders/:orderId` | `/orders` | Click "← Back to Orders" |

### 12.3 Outbound Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| `/checkout/confirmation/:orderId` | `/products` | Click "Continue Shopping" |
| `/checkout/confirmation/:orderId` | `/orders/:orderId` | Click "View Order" |
| `/orders` | `/login` | Session expired (401) |
| `/checkout` | `/login` | Session expired (401) |

### 12.4 Error Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| `/checkout` | `/cart` | Cart is empty on page load |
| `/checkout` | `/login` | 401 Unauthorized |
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
| Ad Slot Load | ≤ 500 milliseconds (parallel, non-blocking) |
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
| Ad slot (checkout_top) | Redis cache | 5 minutes |

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
| B-CHECK-011 | System displays sponsored ads with tier priority | UC-CHECK-008, Sec 5.1 (EL-32~39), Sec 6.2, BR-AD-001~012 |

### 15.2 Database Design Traceability

| Database Table | Relevant Functional Operations |
|----------------|-------------------------------|
| `orders` | Create (INSERT), View History (SELECT), View Detail (SELECT), Cancel (UPDATE status) |
| `order_items` | Create (INSERT on order placement), View Detail (SELECT with products) |
| `carts` | Load authenticated buyer's persistent cart (SELECT); retain an empty cart after successful checkout |
| `cart_items` | Load and convert to immutable `order_items` (SELECT); delete only after all order writes commit (DELETE) |
| `order_status_history` | Insert initial `placed` status and every later state transition; read in chronological order for tracking timeline |
| `inventory_transactions` | Insert append-only stock-decrement records on order creation and compensating restoration records on cancellation |
| `products` | Stock validation (SELECT), Price lookup (SELECT), Stock decrement (UPDATE) |
| `advertisements` | Load ad slot for checkout_top placement (SELECT), Click tracking (analytics) |
| `advertisement_packages` | Determine package tier priority (SELECT) |
| `promotions` | Coupon validation (SELECT), Usage increment (UPDATE used_count) |
| `users` | Shipping address source (from JWT user context) |

### 15.3 Related Document References

| Document ID | Document Name | File Path |
|-------------|---------------|-----------|
| SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` |
| SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` |
| SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` |
| SKM-FDS-WISH-CART-001 | Wishlist & Cart Functional Spec | `docs/screen/Wishlist_Cart/機能設計書_Wishlist_CartPage.md` |

---

*End of Functional Specification (Purchase & Checkout)*
