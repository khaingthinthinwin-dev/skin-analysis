# Functional Specification (機能設計書) — Order Insights

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-FDS-OI-001 |
| **Target Screen** | Buyer Order Insights (注文履歴・注文詳細・注文追跡), Merchant Order Insights (注文管理・売上サマリー・収益サマリー), Admin Order Insights (全注文管理) |
| **Subsystem** | Order Insights |
| **Function ID** | FN-OI-001 (Buyer Order Insights), FN-OI-002 (Merchant Order Insights), FN-OI-003 (Admin Order Insights) |
| **Version** | 2.0 |
| **Created** | 2026-08-14 |
| **Last Updated** | 2026-08-21 |
| **Author** | Software Architect |
| **Status** | Draft (レビュー中) |
| **Classification** | Internal — Engineering Division |

---

## Document Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-08-14 | Software Architect | Initial functional specification for the Sales & Analytics subsystem covering the Merchant Sales Dashboard, Merchant Analytics, and Admin Analytics & Reports screens. |
| 1.1 | 2026-08-14 | Software Architect | Added merchant license-status gate and merchant-ID resolution pattern to reflect the confirmed `merchants` table schema. |
| 2.0 | 2026-08-21 | Software Architect | **Subsystem renamed Sales & Analytics → Order Insights** and rescoped to Requirement Spec §3.3 / §4.5 / §5.6 / §6.4. Removed out-of-scope analytics (sales trend charts, product performance, customer demographics, admin platform dashboard, user growth, category performance, merchant ranking, CSV report export). Added Buyer Order History / Order Detail / Order Tracking (§3.3) and Admin All Orders with shop/merchant and status filters (§5.6). Merchant scope restricted to own-shop Order History, Order Detail (items + customer info), Order Tracking, Sales Summary, and Revenue Summary (§4.5). Revenue Summary formulas confirmed with PM: Sales / Commission / Revenue / AOV are defined in BR-OI-020~024, with **AOV computed on net Revenue, not gross Sales**. Order status enum realigned to DATABASE_SPEC §3.1 (`placed → confirmed → packed → shipped → out_for_delivery → delivered`). Commission-rate snapshot schema gap remains open. |

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

The **Order Insights** subsystem gives each role a view of the orders that belong to them, plus — for merchants — the sales and revenue summaries derived from those orders. It is the single place where order history, order detail, and order tracking are specified for all three roles.

The subsystem is **fully read-only**. All figures are derived by aggregating `orders`, `order_items`, and `commission_settings` at query time; no derived summary tables are persisted in this version.

**Scope boundary (write operations):** advancing an order's status is owned by the **Order Fulfillment module** and is **out of scope**. Order Insights only *reads* `orders.status` and `order_status_history` for tracking display, order counts, and cache invalidation (§11.2). This subsystem never writes order data.

**Scope boundary (analytics removed in v2.0):** sales trend charts, product performance, customer demographics, the admin platform dashboard, user growth analytics, category performance, merchant revenue ranking, and CSV report export were part of v1.1 and are **no longer in scope**. Platform-level revenue, commission configuration, payouts, and revenue targets belong to the **Revenue & Commission** subsystem (Requirement Spec §5.7).

### 1.2 Functional Responsibilities

**Buyer (Requirement Spec §3.3)**

1. **Order History** — Buyer views all of their own past orders.
2. **Order Detail** — Buyer views order items, totals, and payment status for one of their own orders.
3. **Order Tracking** — Buyer views the status timeline of one of their own orders.

**Merchant (Requirement Spec §4.5)**

4. **Order History (own shop only)** — Merchant views orders placed against their own shop.
5. **Order Detail** — Merchant views order items **and customer information** for one of their own-shop orders.
6. **Order Tracking** — Merchant views the status timeline of one of their own-shop orders.
7. **Sales Summary** — Merchant views own-shop order counts: today, this month, completed.
8. **Revenue Summary** — Merchant views own-shop **Sales, Commission, Revenue, and AOV** together (BR-OI-021~025).

**Admin (Requirement Spec §5.6)**

9. **All Orders** — Admin views all platform orders.
10. **Orders by Merchant / Shop** — Admin filters the order list by shop or merchant.
11. **Orders by Status** — Admin filters the order list by order status.

**Shared (Requirement Spec §6.4)**

12. **Own-Scope Enforcement** — Every role sees only its own scope of orders: buyer → own orders, merchant → own-shop orders, admin → all platform orders. Enforced server-side (BR-OI-001~004).

### 1.3 Target Users

| Attribute | Value |
|-----------|-------|
| **Primary Actor (Buyer)** | Authenticated buyer viewing their own order history, detail, and tracking |
| **Primary Actor (Merchant)** | Authenticated, license-approved merchant viewing own-shop orders, sales summary, and revenue summary |
| **Primary Actor (Admin)** | Authenticated admin viewing all platform orders with shop/merchant and status filters |
| **Required Authentication** | JWT Bearer Token for all endpoints (no public access) |
| **Data Scope** | Buyer: `orders.buyer_id = self`. Merchant: `orders.merchant_id = own merchants.id`. Admin: platform-wide. (§6.4) |

### 1.4 Relationships with Other Functions and Peripheral Systems

```text
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Buyer Actor  │  │Merchant Actor│  │ Admin Actor  │
│ own orders   │  │ own shop     │  │ all orders   │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       └────────┬────────┴────────┬────────┘
                ▼                 ▼
      ┌────────────────────────────────────────────┐
      │           Order Insights Module            │
      │  GET /orders            (role-scoped list) │
      │  GET /orders/:id        (detail)           │
      │  GET /orders/:id/tracking                  │
      │  GET /order-insights/merchant/sales-summary│
      │  GET /order-insights/merchant/revenue-summary
      └───────────────┬────────────────────────────┘
                      │ Reads / Aggregates (read-only)
   ┌──────────────┬───┴──────────┬──────────────┬──────────────┐
   ▼              ▼              ▼              ▼              ▼
┌──────────┐ ┌──────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────────┐
│ orders   │ │order_items│ │order_status_ │ │merchants │ │ commission_  │
│buyer_id, │ │merchant_id│ │  history     │ │id,user_id│ │  settings    │
│merchant_ │ │quantity,  │ │order_id,     │ │license_  │ │commission_   │
│id,status,│ │unit_price,│ │status_id,    │ │status    │ │rate          │
│total_amt │ │total_price│ │created_at    │ │shop_name │ │              │
└──────────┘ └──────────┘ └──────────────┘ └──────────┘ └──────────────┘
      ▲              ▲
      │ writes       │
┌─────┴──────────────┴──────────┐   ┌──────────────────────────────┐
│ Order Fulfillment module      │   │ Revenue & Commission module  │
│ (status updates — OUT OF      │   │ (platform revenue, payouts,  │
│  SCOPE, §6.6)                 │   │  rate config — OUT OF SCOPE) │
└───────────────────────────────┘   └──────────────────────────────┘
```
> Order Insights performs **no writes**. `orders.status` transitions are owned by the Order Fulfillment module; the commission **rate** is owned by the Revenue & Commission module (§5.7) and only *read* here.

### 1.5 Inputs / Outputs

| Input Information | Data Category | Source / Description |
|-------------------|---------------|----------------------|
| `status` | Query Parameter | Order status filter (`placed`/`confirmed`/`packed`/`shipped`/`out_for_delivery`/`delivered`) — all roles |
| `merchantId` | Query Parameter | Filter orders by merchant — **admin only** (§5.6) |
| `shopId` | Query Parameter | Filter orders by shop — **admin only** (§5.6) |
| `from` / `to` | Query Parameter | Order date range (ISO 8601, UTC) |
| `period` | Query Parameter | Revenue summary period: `today`, `this_month`, `last_month`, `custom` |
| `page` / `limit` | Query Parameter | Pagination for order history lists |
| `sort` / `order` | Query Parameter | Sort field (`createdAt`/`totalAmount`/`status`) and direction |
| `id` | Path Parameter | Order ID (UUID) for order detail / tracking |

| Output Information | Data Category | Destination / Description |
|--------------------|---------------|---------------------------|
| `orders` | Order Data | Role-scoped order history rows |
| `orderDetail` | Order Data | Order header, items, totals, payment status (+ customer info for merchant/admin) |
| `tracking` | Timeline Data | Ordered status timeline from `order_status_history` |
| `salesSummary` | Aggregate Data | Order counts: today, this month, completed |
| `revenueSummary` | Aggregate Data | **Sales, Commission, Revenue, AOV — always returned together (BR-OI-026)** |
| `filters` | Reference Data | Available shop/merchant and status filter options (admin) |
| `meta` | Pagination Meta | Page, limit, total, totalPages |

### 1.6 Related Documents

| No. | Document ID | Document Name | File Path / Reference | Remarks |
|-----|-------------|---------------|----------------------|---------|
| 1 | SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | §3.3 Order Insights (Buyer), §4.5 Order Insights (Merchant), §5.6 Order Insights (Admin), §6.4 Order Insights (Shared), §7.3 Orders, §7.7 Monetization, §2.2 permission matrix |
| 2 | SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | §3.1 `order_statuses`, §3.2 `merchants`, §3.9 `orders`, §3.10 `order_items`, §3.11 `shops`, §3.17 `commission_settings`, §3.25 `order_status_history` |
| 3 | SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | Dashboard/table design, design tokens, RBAC, `[HAML]` Order Insights ownership |

---

## 2. Use Cases and Business Workflow

### 2.1 Use Case Catalog

| UC-ID | Use Case Name | Role | Precondition | Postcondition |
|-------|---------------|------|--------------|---------------|
| UC-OI-001 | View Own Order History | Buyer | Buyer authenticated. | Paginated list of the buyer's own orders displayed. |
| UC-OI-002 | View Own Order Detail | Buyer | Buyer authenticated; order belongs to the buyer. | Order items, totals, and payment status displayed. |
| UC-OI-003 | Track Own Order | Buyer | Buyer authenticated; order belongs to the buyer. | Status timeline (placed → … → delivered) displayed. |
| UC-OI-004 | View Own-Shop Order History | Merchant | Merchant authenticated and `license_status = 'approved'`. | Paginated list of orders for the merchant's own shop displayed. |
| UC-OI-005 | View Own-Shop Order Detail | Merchant | Merchant authenticated; order belongs to the merchant's shop. | Order items **and customer information** displayed. |
| UC-OI-006 | Track Own-Shop Order | Merchant | Merchant authenticated; order belongs to the merchant's shop. | Status timeline displayed. |
| UC-OI-007 | View Sales Summary | Merchant | Merchant authenticated and approved. | Order counts (today / this month / completed) displayed. |
| UC-OI-008 | View Revenue Summary | Merchant | Merchant authenticated and approved. | **Sales, Commission, Revenue, and AOV displayed together.** |
| UC-OI-009 | View All Orders | Admin | Admin authenticated. | Paginated list of all platform orders displayed. |
| UC-OI-010 | Filter Orders by Shop / Merchant | Admin | Admin authenticated. | Order list filtered to the selected shop/merchant. |
| UC-OI-011 | Filter Orders by Status | Admin | Admin authenticated. | Order list filtered to the selected order status. |
| UC-OI-012 | View Any Order Detail / Tracking | Admin | Admin authenticated. | Detail and tracking for any platform order displayed. |

> **Out of scope:** advancing an order's status (Order Fulfillment module) and platform-level revenue/commission/payout management (Revenue & Commission module, Requirement Spec §5.7).

### 2.2 Primary Business Workflow — Buyer (§3.3)

```
      ┌──────────────────────┐
      │  Buyer Logs In       │
      │  (JWT Authenticated) │
      └──────────┬───────────┘
                 ▼
      ┌──────────────────────┐
      │  /orders             │
      │  Order History       │
      │  (UC-OI-001)         │
      └──────────┬───────────┘
                 │ click order row
                 ▼
      ┌──────────────────────┐        ┌──────────────────────┐
      │  /orders/:id         │───────►│  /orders/:id/tracking│
      │  Order Detail        │        │  Status Timeline     │
      │  items, totals,      │        │  (UC-OI-003)         │
      │  payment status      │        │                      │
      │  (UC-OI-002)         │        └──────────────────────┘
      └──────────────────────┘
```
> The buyer sees **only** `orders.buyer_id = self` (BR-OI-002). No customer-information panel is rendered for a buyer (it is their own data), and no sales/revenue figures are exposed to buyers (BR-OI-005).

### 2.3 Primary Business Workflow — Merchant (§4.5)

```
      ┌──────────────────────┐
      │  Merchant Logs In    │
      │  license = approved  │
      └──────────┬───────────┘
                 ▼
      ┌──────────────────────────────────┐
      │  /merchant/orders                │
      │  Order Insights (own shop only)  │
      └──────────┬───────────────────────┘
                 │
   ┌─────────────┼───────────────┬────────────────────┐
   ▼             ▼               ▼                    ▼
┌─────────┐ ┌──────────┐ ┌────────────────┐ ┌──────────────────────┐
│ Order   │ │ Order    │ │ Sales Summary  │ │ Revenue Summary      │
│ History │ │ Detail   │ │ today / month  │ │ Sales · Commission   │
│(UC-004) │ │ items +  │ │ completed      │ │ Revenue · AOV        │
│         │ │ customer │ │ (UC-007)       │ │ (all four together)  │
│         │ │(UC-005)  │ │                │ │ (UC-008)             │
└─────────┘ └────┬─────┘ └────────────────┘ └──────────────────────┘
                 ▼
        ┌──────────────────┐
        │ Order Tracking   │
        │ (UC-OI-006)      │
        └──────────────────┘
```
> The merchant sees **only** `orders.merchant_id = own merchants.id` (BR-OI-003). Sales/Revenue summaries aggregate exactly that same scope — a merchant never sees another merchant's figures or any platform total.

> **Read-only status behavior:** Merchant Order Details display the current status and status history. The **Change Status** action only navigates to Order Fulfillment; it does not call a status-update API, modify `orders.status`, write `order_status_history`, or perform a state transition. The flow is **Order Details -> Change Status -> Order Fulfillment -> Update Status**.

### 2.4 Primary Business Workflow — Admin (§5.6)

```
      ┌──────────────────────┐
      │  Admin Logs In       │
      └──────────┬───────────┘
                 ▼
      ┌──────────────────────────────────┐
      │  /admin/orders — All Orders      │
      │  (UC-OI-009)                     │
      └──────────┬───────────────────────┘
                 │
   ┌─────────────┴──────────────┐
   ▼                            ▼
┌────────────────────┐  ┌────────────────────┐
│ Filter by          │  │ Filter by          │
│ shop / merchant    │  │ order status       │
│ (UC-OI-010)        │  │ (UC-OI-011)        │
└─────────┬──────────┘  └─────────┬──────────┘
          └───────────┬───────────┘
                      ▼
          ┌──────────────────────────┐
          │ /admin/orders/:id        │
          │ Detail + Tracking        │
          │ (UC-OI-012)              │
          └──────────────────────────┘
```
> Filters are **combinable** (shop AND status AND date range) and are applied server-side (BR-OI-016).

### 2.5 Data Dependency — Order Status Update (Order Fulfillment module)

Order Insights is a pure consumer of status changes:

| Step | Action | Module |
|:----:|--------|--------|
| 1 | Merchant/admin advances an order's status | Order Fulfillment |
| 2 | `orders.status` updated and a row appended to `order_status_history` | Order Fulfillment |
| 3 | `cache:oi:merchant:{merchantId}:summary` invalidated (cross-module contract, §11.2) | Order Fulfillment |
| 4 | Order Insights re-reads status/history on the next request | Order Insights (read-only) |

---

## 3. State Transition Specification

> The order status state machine is **owned and enforced by the Order Fulfillment module**. It is specified here because Order Insights renders it (order tracking timeline, status badges) and counts on it (Sales Summary, BR-OI-018).

### 3.1 Order Status States (DATABASE_SPEC §3.1 `order_statuses`)

| Display Order | State | DB Value | Description | Is Terminal |
|:---:|-------|----------|-------------|:-----------:|
| 1 | `PLACED` | `'placed'` | Order created, awaiting confirmation | ✗ |
| 2 | `CONFIRMED` | `'confirmed'` | Merchant accepted order | ✗ |
| 3 | `PACKED` | `'packed'` | Order packed and ready to ship | ✗ |
| 4 | `SHIPPED` | `'shipped'` | Order sent to courier | ✗ |
| 5 | `OUT_FOR_DELIVERY` | `'out_for_delivery'` | Order on the way to buyer | ✗ |
| 6 | `DELIVERED` | `'delivered'` | Buyer received order | ✓ |

> Requirement Spec §3.3 describes the buyer-facing timeline in abbreviated form ("placed → confirmed → shipped → delivered"). The tracking screen renders **all six** states from `order_statuses` ordered by `display_order` (BR-OI-013); the abbreviated form is presentation shorthand, not a different state set.

### 3.2 Order Status Transition Table

| Transition ID | Origin State | Target State | Trigger Action |
|---------------|--------------|--------------|----------------|
| TR-OI-01 | `PLACED` | `CONFIRMED` | Merchant confirms order |
| TR-OI-02 | `CONFIRMED` | `PACKED` | Merchant packs order |
| TR-OI-03 | `PACKED` | `SHIPPED` | Order handed to courier |
| TR-OI-04 | `SHIPPED` | `OUT_FOR_DELIVERY` | Courier begins delivery |
| TR-OI-05 | `OUT_FOR_DELIVERY` | `DELIVERED` | Buyer receives order |

> Rule: **forward only** (TR-OI-01→05); no regression, no skipping; `delivered` is terminal (`is_terminal_state = TRUE`). Enforced by the Order Fulfillment module — Order Insights never triggers a transition.

### 3.3 Tracking Timeline Render States

| State | Description | Rendering |
|-------|-------------|-----------|
| `STEP_DONE` | A status with a row in `order_status_history` | Filled marker + actual timestamp |
| `STEP_CURRENT` | The status equal to `orders.status` | Highlighted marker (Luxury Purple #7C3AED) + timestamp |
| `STEP_UPCOMING` | A later status not yet reached | Muted marker, no timestamp |
| `STEP_UNKNOWN` | No history rows exist (legacy order) | Timeline collapses to the current status only, with a note (BR-OI-014) |

### 3.4 Summary Query / Cache States

| State | Description | TTL | Behavior |
|-------|-------------|:---:|----------|
| `CACHE_COLD` | Merchant summary not cached | — | Query DB, seed Redis |
| `CACHE_WARM` | Merchant summary cached | 5 min | Serve cached response |
| `CACHE_INVALIDATED` | Order created or status updated *(by Checkout / Order Fulfillment)* | — | `DEL cache:oi:merchant:{merchantId}:summary`; next request re-queries |

---

## 4. Business Rules

### 4.1 Data Scope & Authorization Rules (§6.4 — each role sees only its own scope)

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-OI-001 | Own-Scope Principle | **Every** Order Insights query is scoped server-side to the caller's own data. The client never supplies its own identity filter; any client-supplied `buyerId`/`merchantId` is ignored for non-admin roles. | Backend (query scoping) |
| BR-OI-002 | Buyer Scope | Buyer queries are scoped to `orders.buyer_id = currentUser.id`. A buyer can never see another buyer's order, nor any merchant/platform aggregate. | Backend (query scoping) |
| BR-OI-003 | Merchant Scope | Merchant queries MUST resolve `merchants.id` via `merchants.user_id = currentUser.id`, then scope every query to `orders.merchant_id = <resolved merchants.id>`. A merchant can never see another merchant's orders or figures. | Backend (query scoping) |
| BR-OI-004 | Admin Scope | Admin queries cover all platform orders with no implicit owner filter; shop/merchant and status filters are **optional and explicit** (§5.6). | Backend (query scoping) |
| BR-OI-005 | Role Requirement | Order History / Detail / Tracking: `buyer`, `merchant`, `admin` (each within their own scope). Sales Summary and Revenue Summary: `merchant` and `admin` only — buyers have **no** access ("View Order Insights" = ❌ for buyer, Requirement Spec §2.2). | Backend (RBAC) |
| BR-OI-006 | Merchant Eligibility Gate | The `merchant` role MUST have `merchants.license_status = 'approved'` to access any merchant Order Insights endpoint. Otherwise `403 FORBIDDEN` — "Your merchant account is not approved". The `admin` role bypasses this check. | Backend (RBAC / license gate) |
| BR-OI-007 | Read-Only Subsystem | Order Insights exposes **no write operations**. Status updates belong to the Order Fulfillment module; commission-rate configuration and payouts belong to Revenue & Commission (§5.7). | Backend (method design) |
| BR-OI-008 | Ownership on Detail/Tracking | `GET /orders/:id` and `/orders/:id/tracking` MUST verify ownership *after* loading: buyer → `buyer_id` match; merchant → `merchant_id` match; admin → always allowed. On mismatch return `404 NOT_FOUND` (not `403`) so order IDs cannot be enumerated. | Backend (service check) |

### 4.2 Order History Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-OI-009 | Default Sort | Order history is sorted `created_at DESC` (newest first) by default. | Backend (query) |
| BR-OI-010 | Pagination | Default 20 rows per page, maximum 100 (`OI_TABLE_MAX_PAGE_SIZE`). | Backend (validation) |
| BR-OI-011 | Status Filter | All roles may filter their own scope by `orders.status`. Values are validated against `order_statuses.status_code`. | Backend (validation) |
| BR-OI-012 | Date Range Filter | Optional `from`/`to` filter on `orders.created_at`; `to` must be ≥ `from`; both interpreted as UTC. | Backend (validation) |

### 4.3 Order Detail & Tracking Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-OI-013 | Timeline Composition | The tracking timeline is built from `order_statuses` (all six steps, ordered by `display_order`) left-joined to `order_status_history` for the order, so future steps render as upcoming rather than being omitted. | Backend (aggregation) |
| BR-OI-014 | Missing History Fallback | When an order has no `order_status_history` rows, only the current `orders.status` is shown with the note "Detailed history unavailable for this order." Never an error (BR-OI-030). | Backend + Frontend |
| BR-OI-015 | Customer Information Visibility | Order Detail exposes **customer information (buyer name, contact, shipping address) to `merchant` and `admin` only** (§4.5 "Order Detail — order items, customer info"). The buyer's own detail view shows the shipping address as their own data; no other party's identity is ever exposed. Buyer email/phone are shown to a merchant only for orders belonging to that merchant's shop. | Backend (DTO projection) |
| BR-OI-016 | Combinable Admin Filters | Admin filters (`shopId`/`merchantId`, `status`, `from`/`to`) combine with AND semantics and are all applied in SQL, never client-side. | Backend (query) |
| BR-OI-017 | Item Price Immutability | `order_items.unit_price` / `total_price` are the prices locked at order creation (§7.3) and are displayed as stored — never recomputed from the current `products.price`. | Backend (query) |

### 4.4 Sales Summary Rules (Merchant, §4.5)

The Sales Summary presents **order counts**, not money. All counts are scoped by BR-OI-003.

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-OI-018 | Sales Summary Counters | Three counters are returned together:<br>• **Today** = `COUNT(orders)` where `created_at` falls in the current day<br>• **This Month** = `COUNT(orders)` where `created_at` falls in the current calendar month<br>• **Completed** = `COUNT(orders)` where `status = 'delivered'` (the terminal state, `order_statuses.is_terminal_state = TRUE`) | Backend (aggregation) |
| BR-OI-019 | Counting Boundaries | Today / This Month boundaries are computed in UTC (DB stores TIMESTAMPTZ); the presentation layer labels them with the user's locale. Today and This Month count **all** orders regardless of status; Completed is a lifetime count unless a period filter is supplied. | Backend (query) |

### 4.5 Revenue Summary Rules (Merchant, §4.5 — confirmed with PM)

> These four figures are the confirmed definitions for this subsystem and **supersede** any earlier "total sales / net revenue" wording. All are scoped to the merchant's own orders (BR-OI-003).

| Rule ID | Rule Name | Formula / Definition | Enforcement Layer |
|---------|-----------|----------------------|-------------------|
| BR-OI-021 | **Sales** | The **gross amount customers paid**.<br>`Sales = SUM(orders.total_amount)` over the merchant's in-scope orders for the selected period. | Backend (aggregation) |
| BR-OI-022 | **Commission** | The platform's cut.<br>`Commission = Sales × commission rate`, where the rate is the one **locked at order creation time** (Requirement Spec §7.7). Computed **per order** and then summed — `Commission = SUM(order.total_amount × order.commission_rate)` — so that a later rate change never retroactively alters historical figures. Rate sourcing and the current schema gap: **BR-OI-023**. | Backend (aggregation) |
| BR-OI-023 | Commission Rate Sourcing — Schema Gap | §7.7 requires the commission rate to be **locked at order creation time**, but `orders` has no `commission_rate` column; only the global, mutable `commission_settings.commission_rate` (default 12.00) exists (DATABASE_SPEC §3.17). Until `orders.commission_rate` is added, the rate is read from `commission_settings` at query time and the response MUST include `commissionRateSource: "current_settings"` plus `commissionRateLocked: false`, and the UI MUST show the footnote "Commission is calculated with the current platform rate; historical rate locking is pending." Once the column exists, the query reads `orders.commission_rate` and the flags become `"order_snapshot"` / `true`. | Backend (aggregation) + Frontend (display) |
| BR-OI-024 | **Revenue** | The **net amount the merchant receives**.<br>`Revenue = Sales − Commission`.<br>Consistent with Requirement Spec §7.7 "Merchant payouts = Total Sales − Commission". | Backend (aggregation) |
| BR-OI-025 | **AOV (Average Order Value)** | `AOV = Revenue ÷ Number of Orders` — **computed on net Revenue, not gross Sales** (confirmed with PM). `Number of Orders` = `COUNT(orders)` over the same in-scope order set used for Sales. When `Number of Orders = 0`, AOV displays `0.00`. | Backend (aggregation) + Frontend (formatting) |
| BR-OI-026 | **Four-Field Disclosure Rule** | Sales, Commission, Revenue, and AOV MUST be returned by the API and rendered on screen **together, as one group**. It is **never** permitted to display a single figure labelled "revenue" in isolation — a bare number is ambiguous between gross and net and has previously caused misreading. Any surface that shows one of the four (including compact/mobile layouts and any future export) MUST show all four with their own labels. | Backend (DTO contract) + Frontend (component contract) |
| BR-OI-027 | Consistent Order Set | Sales, Commission, Revenue, AOV, and `orderCount` for a given period MUST all be derived from **one** query over the same order set, so the four figures are always internally consistent (`Revenue = Sales − Commission` and `AOV × orderCount = Revenue` hold exactly, subject to BR-OI-028 rounding). | Backend (single aggregation) |
| BR-OI-028 | Rounding | Monetary values are computed in `DECIMAL` and rounded half-up to 2 decimals only at the presentation boundary. Commission is rounded per order before summation to match payout arithmetic (DATABASE_SPEC §3.18 `payouts.commission_amount`). | Backend (aggregation) |

#### Worked Example (Revenue Summary)

| Figure | Formula | Example |
|--------|---------|---------|
| Number of Orders | `COUNT(orders)` | 10 |
| **Sales** | `SUM(orders.total_amount)` | $1,000.00 |
| **Commission** | `Sales × 12%` (rate locked at order creation) | $120.00 |
| **Revenue** | `Sales − Commission` | $880.00 |
| **AOV** | `Revenue ÷ Number of Orders` = `880.00 ÷ 10` | $88.00 |

> Note the deliberate choice: AOV here is **$88.00** (net), not $100.00 (gross ÷ orders). This was confirmed with the PM and is the definition implemented.

### 4.6 Display & UX Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-OI-029 | Currency Formatting | All monetary values formatted with currency symbol and 2 decimals using the platform default locale (`Intl.NumberFormat`). | Frontend |
| BR-OI-030 | Empty States | Zero/absent data renders as `0` / `—` with an illustrated empty state, never an error. | Frontend |
| BR-OI-031 | Status Badge | Status badges use one colour per `order_statuses.status_code`, with the label taken from `order_statuses.status_name` (i18n-mapped for EN/MY/JA). | Frontend |
| BR-OI-032 | Unsupported-Metric Marking | Any figure gated by a schema gap (BR-OI-023 locked rate) MUST be visually marked (`—` / footnote), never rendered as a confident value. | Frontend |
| BR-OI-033 | PII Minimisation | Customer information in Order Detail is limited to what fulfilment requires (name, contact, shipping address). Buyer account identifiers beyond this are never projected to merchants. | Backend (DTO projection) |

---

## 5. Screen Specifications

### 5.1 Screen: Buyer Order History (`/orders`)

**Purpose:** Let a buyer see all of their own past orders (§3.3).

#### 5.1.1 UI Elements

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-OI-01 | Page Title | Heading (h5) | `buyer.orders.title` | Yes | "My Orders" |
| EL-OI-02 | Status Filter | Select | `orders.filter.status` | No | All / placed / confirmed / packed / shipped / out for delivery / delivered |
| EL-OI-03 | Date Range Filter | Date Range Picker | `orders.filter.dateRange` | No | Filter by order date |
| EL-OI-04 | Order List Table | Table | `orders.table` | Yes | Order #, date, items count, total amount, payment status, status badge |
| EL-OI-05 | Status Badge | Badge | — | Yes | Colour-coded `order_statuses.status_name` |
| EL-OI-06 | Track Link | Link/Button (ghost) | `orders.track` | Yes | Opens Order Tracking |
| EL-OI-07 | Pagination | Control | `common.pageInfo` | Yes | "Page 1 of 3 · 42 orders" + Prev/Next |
| EL-OI-08 | Empty State | Illustration + Text | `orders.empty` | Yes | "You haven't placed any orders yet." + Browse Products CTA |

**Default State:** no filters; sorted `created_at DESC`; 20 rows per page.

### 5.2 Screen: Buyer Order Detail (`/orders/:id`)

**Purpose:** Show order items, totals, and payment status for one of the buyer's own orders (§3.3).

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-OI-10 | Order Header | Card | `orders.detail.header` | Yes | Order #, order date, current status badge |
| EL-OI-11 | Order Items Table | Table | `orders.detail.items` | Yes | Product, qty, unit price, line total (prices as locked at order creation, BR-OI-017) |
| EL-OI-12 | Totals Panel | Card | `orders.detail.totals` | Yes | Subtotal, discount (`discount_amount`, with `coupon_code` when present), total amount |
| EL-OI-13 | Payment Status | Badge + Text | `orders.detail.payment` | Yes | `payment_method` + `payment_status` (pending / completed) |
| EL-OI-14 | Shipping Address | Card | `orders.detail.shipping` | Yes | Rendered from `orders.shipping_address` (JSONB) |
| EL-OI-15 | Order Notes | Text | `orders.detail.notes` | No | `orders.notes` when present |
| EL-OI-16 | Track Order Button | Button (primary) | `orders.track` | Yes | Navigate to tracking |

> No sales, commission, or revenue figure appears on any buyer screen (BR-OI-005).

### 5.3 Screen: Order Tracking (`/orders/:id/tracking`) — Buyer & Merchant & Admin

**Purpose:** Show the status timeline of one order (§3.3 buyer, §4.5 merchant, §5.6 admin drill-down).

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-OI-20 | Order Reference | Text | `orders.tracking.ref` | Yes | Order # + order date |
| EL-OI-21 | Status Timeline | Stepper (vertical) | `orders.tracking.timeline` | Yes | Six steps from `order_statuses` ordered by `display_order` (BR-OI-013) |
| EL-OI-22 | Step Timestamp | Text | — | Yes | `order_status_history.created_at` for reached steps; blank for upcoming |
| EL-OI-23 | Current Status Highlight | Marker | — | Yes | Luxury Purple (#7C3AED) marker on `STEP_CURRENT` |
| EL-OI-24 | Delivered Confirmation | Banner | `orders.tracking.delivered` | No | Shown when `status = 'delivered'` (terminal) |
| EL-OI-25 | History Unavailable Note | Text | `orders.tracking.noHistory` | No | Shown per BR-OI-014 |
| EL-OI-26 | Back to Order Detail | Link | `common.back` | Yes | Returns to the role-appropriate detail screen |

**Default State:** timeline expanded; current step scrolled into view.

### 5.4 Screen: Merchant Order Insights (`/merchant/orders`)

**Purpose:** Own-shop order history plus the Sales and Revenue summaries (§4.5).

#### 5.4.1 Summary Panel — Sales Summary (order counts)

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-OI-30 | Orders Today Tile | Stat Tile | `merchant.orders.today` | Yes | Count of own-shop orders created today (BR-OI-018) |
| EL-OI-31 | Orders This Month Tile | Stat Tile | `merchant.orders.thisMonth` | Yes | Count of own-shop orders created this calendar month |
| EL-OI-32 | Completed Orders Tile | Stat Tile | `merchant.orders.completed` | Yes | Count where `status = 'delivered'` |

#### 5.4.2 Summary Panel — Revenue Summary (all four fields together)

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-OI-34 | Revenue Summary Group | Card (single component) | `merchant.revenue.title` | Yes | **Renders EL-OI-35~38 as one indivisible group (BR-OI-026)** |
| EL-OI-35 | Sales | Stat (currency) | `merchant.revenue.sales` | Yes | Gross amount customers paid — `SUM(orders.total_amount)` (BR-OI-021) |
| EL-OI-36 | Commission | Stat (currency) | `merchant.revenue.commission` | Yes | `Sales × commission rate` (BR-OI-022) |
| EL-OI-37 | Revenue | Stat (currency, emphasised) | `merchant.revenue.net` | Yes | `Sales − Commission` — net amount received (BR-OI-024) |
| EL-OI-38 | AOV | Stat (currency) | `merchant.revenue.aov` | Yes | `Revenue ÷ Number of Orders` (BR-OI-025) |
| EL-OI-39 | Order Count Caption | Text | `merchant.revenue.orderCount` | Yes | "Based on N orders" — the denominator behind AOV |
| EL-OI-40 | Commission Rate Footnote | Text (small) | `merchant.revenue.rateNote` | Yes | Shows the applied rate and the BR-OI-023 sourcing note |
| EL-OI-41 | Period Selector | Button Group | `merchant.revenue.period` | Yes | Today / This Month / Last Month / Custom |

> **Never render EL-OI-37 alone.** A layout that cannot fit four figures must stack them, not drop them (BR-OI-026).

#### 5.4.3 Own-Shop Order List

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-OI-42 | Order List Table | Table | `merchant.orders.table` | Yes | Order #, date, customer name, items, total amount, payment status, status badge |
| EL-OI-43 | Status Filter | Select | `orders.filter.status` | No | Filter own-shop orders by status |
| EL-OI-44 | Date Range Filter | Date Range Picker | `orders.filter.dateRange` | No | Filter by order date |
| EL-OI-45 | Row Actions | Link Group | `common.view` / `orders.track` | Yes | View Detail / Track |
| EL-OI-46 | Pagination | Control | `common.pageInfo` | Yes | 20 rows per page |
| EL-OI-47 | Scope Note | Text (small) | `merchant.orders.scopeNote` | Yes | "Showing orders for your shop only." (§6.4) |

**Default State:** period = This Month for summaries; order list unfiltered, `created_at DESC`, 20 rows per page.

### 5.5 Screen: Merchant Order Detail (`/merchant/orders/:id`)

**Purpose:** Order items **and customer information** for one own-shop order (§4.5).

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-OI-50 | Order Header | Card | `orders.detail.header` | Yes | Order #, date, status badge, payment status |
| EL-OI-51 | Order Items Table | Table | `orders.detail.items` | Yes | Product, qty, unit price, line total — **own-shop items** (`order_items.merchant_id` = own) |
| EL-OI-52 | Totals Panel | Card | `orders.detail.totals` | Yes | Subtotal, discount, total amount |
| EL-OI-53 | Customer Information | Card | `merchant.orders.customer` | Yes | Buyer name, contact, shipping address (BR-OI-015/033) |
| EL-OI-54 | Order Notes | Text | `orders.detail.notes` | No | `orders.notes` from the customer |
| EL-OI-55 | Track Order Button | Button | `orders.track` | Yes | Navigate to tracking |
| EL-OI-56 | Status Badge | Badge | — | Yes | **Read-only** — displays the current status; status changes are made only in the Order Fulfillment screens |
| EL-OI-57 | Change Status Action | Link/Button | `orders.changeStatus` | No | Navigation only to Order Fulfillment; no status update API or state transition is performed here |

### 5.6 Screen: Admin All Orders (`/admin/orders`)

**Purpose:** View all platform orders with shop/merchant and status filters (§5.6).

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-OI-60 | Page Title | Heading (h5) | `admin.orders.title` | Yes | "All Orders" |
| EL-OI-61 | Shop / Merchant Filter | Searchable Select | `admin.orders.filter.shop` | No | Filter by shop or merchant (§5.6 "Orders by Merchant") |
| EL-OI-62 | Status Filter | Select | `admin.orders.filter.status` | No | Filter by order status (§5.6 "Orders by Status") |
| EL-OI-63 | Date Range Filter | Date Range Picker | `orders.filter.dateRange` | No | Filter by order date |
| EL-OI-64 | Active Filter Chips | Chip Group | `common.filters` | No | Shows applied filters with individual clear buttons |
| EL-OI-65 | Order List Table | Table | `admin.orders.table` | Yes | Order #, date, shop/merchant, buyer, items, total amount, payment status, status badge |
| EL-OI-66 | Result Count | Text | `common.resultCount` | Yes | "42 orders match the current filters" |
| EL-OI-67 | Row Actions | Link Group | `common.view` / `orders.track` | Yes | View Detail / Track (any order) |
| EL-OI-68 | Pagination | Control | `common.pageInfo` | Yes | 20 rows per page |
| EL-OI-69 | Empty State | Illustration + Text | `admin.orders.empty` | Yes | "No orders match the current filters." + Clear Filters CTA |

**Default State:** no filters (all platform orders); `created_at DESC`; 20 rows per page.

> The admin screens in this subsystem cover **order visibility only**. Platform revenue, commission-rate configuration, payouts, and revenue targets are the Revenue & Commission subsystem (Requirement Spec §5.7) and are **not** specified here.

---

## 6. Functional Operation Specification

### 6.1 Operation: View Order History (Role-Scoped)

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Navigate to `/orders` (buyer), `/merchant/orders` (merchant), `/admin/orders` (admin); or change a filter/page |
| **API Endpoint** | `GET /api/v1/orders?status=&from=&to=&page=1&limit=20&sort=createdAt&order=desc` (admin additionally: `&merchantId=&shopId=`) |
| **Request Content-Type** | None (query parameters) |
| **Pre-Submission Validation** | `status` ∈ `order_statuses.status_code`; `to ≥ from`; `page ≥ 1`; `limit` 1–100; `merchantId`/`shopId` are **rejected with `403`** for non-admin callers |
| **Processing Steps** | 1. Validate JWT; read role. 2. Apply owner scoping (BR-OI-001): buyer → `buyer_id = currentUser.id`; merchant → resolve `merchants.id` from `merchants.user_id = currentUser.id`, verify `license_status = 'approved'` else `403` (BR-OI-006), then `orders.merchant_id = <resolved id>`; admin → no owner filter. 3. Apply optional `status`, `from`/`to`, and (admin only) `merchantId`/`shopId` filters in SQL (BR-OI-016). 4. Sort and paginate (BR-OI-009/010). 5. Project the role-appropriate DTO (customer name included for merchant/admin only, BR-OI-015). 6. Return rows + `meta`. |
| **Success Response** | 200 OK with `orders` rows and `meta` |
| **Post-Action** | Render table; write `ORDER_LIST_VIEWED` audit event |

### 6.2 Operation: View Order Detail

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Click an order row / "View" action |
| **API Endpoint** | `GET /api/v1/orders/:id` |
| **Request Content-Type** | None |
| **Pre-Submission Validation** | `:id` is a valid UUID |
| **Processing Steps** | 1. Validate JWT and `:id`. 2. Load the order with `order_items` (join `products` for name/image). 3. Verify ownership per BR-OI-008 — mismatch → `404 NOT_FOUND`. 4. For merchant: restrict `order_items` to `merchant_id = <resolved merchants.id>`. 5. Project totals (`total_amount`, `discount_amount`, `coupon_code`) and `payment_status`. 6. Attach the customer-information block **only** for `merchant`/`admin` (BR-OI-015/033). 7. Return the detail DTO. |
| **Success Response** | 200 OK with `orderDetail` |
| **Post-Action** | Render detail screen |

### 6.3 Operation: View Order Tracking

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Click "Track" from a list row or the detail screen |
| **API Endpoint** | `GET /api/v1/orders/:id/tracking` |
| **Request Content-Type** | None |
| **Pre-Submission Validation** | `:id` is a valid UUID |
| **Processing Steps** | 1. Validate JWT and `:id`. 2. Load the order; verify ownership (BR-OI-008) — mismatch → `404`. 3. Load all `order_statuses` ordered by `display_order`. 4. Left-join `order_status_history` for this order to attach reached-step timestamps (BR-OI-013). 5. Mark each step `done` / `current` / `upcoming` against `orders.status` (§3.3). 6. When no history rows exist, return the single current step with `historyAvailable: false` (BR-OI-014). 7. Return the `tracking` DTO. |
| **Success Response** | 200 OK with `tracking` |
| **Post-Action** | Render the stepper |

### 6.4 Operation: View Merchant Sales Summary

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Load `/merchant/orders`; change the period selector; manual refresh |
| **API Endpoint** | `GET /api/v1/order-insights/merchant/sales-summary` |
| **Request Content-Type** | None |
| **Pre-Submission Validation** | Role ∈ {`merchant`, `admin`}; merchant must be license-approved (BR-OI-006) |
| **Processing Steps** | 1. Validate JWT and role. 2. Resolve `merchants.id` (BR-OI-003) and verify `license_status = 'approved'`. 3. Check cache `cache:oi:merchant:{merchantId}:summary`. 4. On miss, run **one** aggregation over `orders` scoped to the merchant producing `todayCount`, `thisMonthCount`, `completedCount` (`status = 'delivered'`) using `idx_orders_merchant_id` / `idx_orders_created_at`. 5. Seed cache (TTL `OI_SUMMARY_CACHE_TTL_SECONDS`). 6. Return `salesSummary`. |
| **Success Response** | 200 OK with `salesSummary` (three counters) |
| **Post-Action** | Render the three stat tiles |

### 6.5 Operation: View Merchant Revenue Summary

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Load `/merchant/orders`; change the period selector; manual refresh |
| **API Endpoint** | `GET /api/v1/order-insights/merchant/revenue-summary?period=this_month` (or `from`/`to` when `period=custom`) |
| **Request Content-Type** | None |
| **Pre-Submission Validation** | Role ∈ {`merchant`, `admin`}; merchant must be license-approved; `period` ∈ `today/this_month/last_month/custom`; `from`/`to` required and `to ≥ from` when `period=custom` |
| **Processing Steps** | 1. Validate JWT and role. 2. Resolve `merchants.id` (BR-OI-003) and verify `license_status = 'approved'`. 3. Resolve the period window (UTC). 4. In **one** aggregation over the merchant's in-scope orders (BR-OI-027) compute: `orderCount = COUNT(orders)`; `sales = SUM(orders.total_amount)` (BR-OI-021); `commission = SUM(order.total_amount × rate)` with the rate resolved per BR-OI-022/023 and rounded per order (BR-OI-028); `revenue = sales − commission` (BR-OI-024); `aov = orderCount > 0 ? revenue / orderCount : 0` — **net Revenue as the numerator** (BR-OI-025). 5. Attach `commissionRate`, `commissionRateSource`, `commissionRateLocked` (BR-OI-023). 6. Return **all four figures together** — the DTO has no partial form (BR-OI-026). |
| **Success Response** | 200 OK with `revenueSummary` = `{ sales, commission, revenue, aov, orderCount, commissionRate, commissionRateSource, commissionRateLocked, period }` |
| **Post-Action** | Render the Revenue Summary group (EL-OI-34) with all four stats and the rate footnote |

---

## 7. Input / Output Specification

### 7.1 Input Specification — Order List Query (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type | Required | Input Control | Validation |
|-------|-------------------|-------------------|-----------|:--------:|---------------|------------|
| `status` | Order Status | 注文ステータス | String | No | Select | `@IsIn(['placed','confirmed','packed','shipped','out_for_delivery','delivered'])`, `@IsOptional()` |
| `from` | From Date | 開始日 | Date | No | Date picker | `@IsDateString()`, `@IsOptional()` |
| `to` | To Date | 終了日 | Date | No | Date picker | `@IsDateString()`, `@IsOptional()`; must be ≥ `from` |
| `merchantId` | Merchant | 出品者 | UUID | No | Searchable select | `@IsUUID()`, `@IsOptional()` — **admin only**; `403` for other roles |
| `shopId` | Shop | 店舗 | UUID | No | Searchable select | `@IsUUID()`, `@IsOptional()` — **admin only**; `403` for other roles |
| `page` | Page | ページ | Number | No | Pagination | `@IsInt()`, `@Min(1)`, default 1 |
| `limit` | Limit | 表示件数 | Number | No | Pagination | `@IsInt()`, `@Min(1)`, `@Max(100)`, default 20 |
| `sort` | Sort Field | 並び替え項目 | String | No | Column header | `@IsIn(['createdAt','totalAmount','status'])`, default `createdAt` |
| `order` | Sort Direction | 並び順 | String | No | Column header | `@IsIn(['asc','desc'])`, default `desc` |

### 7.2 Input Specification — Order Detail / Tracking (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type | Required | Input Control | Validation |
|-------|-------------------|-------------------|-----------|:--------:|---------------|------------|
| `id` | Order ID | 注文ID | UUID | Yes | Path parameter | `@IsUUID()`; ownership verified per BR-OI-008 |

### 7.3 Input Specification — Merchant Summary Query (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type | Required | Input Control | Validation |
|-------|-------------------|-------------------|-----------|:--------:|---------------|------------|
| `period` | Period | 期間 | String | No | Button group | `@IsIn(['today','this_month','last_month','custom'])`, default `this_month` |
| `from` | From Date | 開始日 | Date | Conditional | Date picker | Required when `period = custom`; `@IsDateString()` |
| `to` | To Date | 終了日 | Date | Conditional | Date picker | Required when `period = custom`; `@IsDateString()`; must be ≥ `from` |

> The merchant identity is **never** an input — it is resolved server-side from the JWT (BR-OI-001/003).

### 7.4 Output Specification — Order History Row (出力定義)

| Field | Data Source | Display Format | Visible To |
|-------|-------------|----------------|------------|
| `id` | `orders.id` | UUID (rendered as order #) | All |
| `createdAt` | `orders.created_at` | Date-time (locale) | All |
| `status` | `orders.status` → `order_statuses.status_name` | Status badge | All |
| `itemCount` | `COUNT(order_items)` | Integer | All |
| `totalAmount` | `orders.total_amount` | Currency (e.g. `$120.00`) | All |
| `paymentStatus` | `orders.payment_status` | Badge (pending/completed) | All |
| `customerName` | `users.name` via `orders.buyer_id` | String | Merchant, Admin (BR-OI-015) |
| `shopName` | `merchants.shop_name` via `orders.merchant_id` | String | Admin |

### 7.5 Output Specification — Order Detail (出力定義)

| Field | Data Source | Display Format | Visible To |
|-------|-------------|----------------|------------|
| `id` / `createdAt` / `status` | `orders` | UUID / date-time / badge | All |
| `items[].productName` | `products.name` via `order_items.product_id` | String | All |
| `items[].quantity` | `order_items.quantity` | Integer | All |
| `items[].unitPrice` | `order_items.unit_price` | Currency (locked at order creation) | All |
| `items[].totalPrice` | `order_items.total_price` | Currency | All |
| `discountAmount` | `orders.discount_amount` | Currency | All |
| `couponCode` | `orders.coupon_code` | String (when present) | All |
| `totalAmount` | `orders.total_amount` | Currency | All |
| `paymentMethod` / `paymentStatus` | `orders.payment_method` / `payment_status` | String / badge | All |
| `shippingAddress` | `orders.shipping_address` (JSONB) | Formatted address block | All |
| `notes` | `orders.notes` | Text | All |
| `customer.name` / `customer.email` / `customer.phone` | `users` via `orders.buyer_id` | String | **Merchant, Admin only** (BR-OI-015/033) |
| `shop.name` / `shop.merchantId` | `merchants` via `orders.merchant_id` | String / UUID | Admin (and buyer sees shop name only) |

### 7.6 Output Specification — Order Tracking (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `orderId` | `orders.id` | UUID |
| `currentStatus` | `orders.status` | String |
| `historyAvailable` | Derived (`order_status_history` row count > 0) | Boolean (BR-OI-014) |
| `steps[].statusCode` | `order_statuses.status_code` | String |
| `steps[].statusName` | `order_statuses.status_name` | String (i18n) |
| `steps[].displayOrder` | `order_statuses.display_order` | Integer (1–6) |
| `steps[].state` | Derived (§3.3) | `done` / `current` / `upcoming` |
| `steps[].reachedAt` | `order_status_history.created_at` | ISO 8601 (null when not reached) |
| `steps[].isTerminal` | `order_statuses.is_terminal_state` | Boolean |

### 7.7 Output Specification — Merchant Sales Summary (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `todayCount` | `COUNT(orders)` where `created_at` in current day | Integer |
| `thisMonthCount` | `COUNT(orders)` where `created_at` in current month | Integer |
| `completedCount` | `COUNT(orders)` where `status = 'delivered'` | Integer |

### 7.8 Output Specification — Merchant Revenue Summary (出力定義)

> All four monetary/derived figures are returned **together**; there is no partial DTO (BR-OI-026).

| Field | Data Source / Formula | Display Format |
|-------|----------------------|----------------|
| `sales` | `SUM(orders.total_amount)` — gross amount customers paid (BR-OI-021) | Currency (e.g. `$1,000.00`) |
| `commission` | `SUM(order.total_amount × commission rate)`, rate locked at order creation (BR-OI-022) | Currency (e.g. `$120.00`) |
| `revenue` | `sales − commission` — net amount the merchant receives (BR-OI-024) | Currency, emphasised (e.g. `$880.00`) |
| `aov` | `revenue ÷ orderCount` — **net Revenue, not gross Sales** (BR-OI-025) | Currency (e.g. `$88.00`) |
| `orderCount` | `COUNT(orders)` over the same order set (BR-OI-027) | Integer |
| `commissionRate` | Applied rate as a percentage | Number (e.g. `12.00`) |
| `commissionRateSource` | `"current_settings"` \| `"order_snapshot"` (BR-OI-023) | String |
| `commissionRateLocked` | `false` until `orders.commission_rate` exists (BR-OI-023) | Boolean |
| `period` | Echo of the resolved window | `{ code, from, to }` |

---

## 8. Input Validation Rules

### 8.1 Query Parameter Validation

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `status` | Must be a valid `order_statuses.status_code` | "Invalid order status" | "注文ステータスが不正です" |
| `from`/`to` | Valid ISO dates; `to ≥ from` | "Invalid date range" | "日付範囲が不正です" |
| `page` | Integer ≥ 1 | "Invalid page number" | "ページ番号が不正です" |
| `limit` | Integer 1–100 | "Invalid limit" | "件数指定が不正です" |
| `sort` / `order` | Must be an allowed field / direction | "Invalid sort option" | "並び替えの指定が不正です" |
| `period` | Must be `today/this_month/last_month/custom` | "Invalid period" | "期間の指定が不正です" |
| `period=custom` | `from` and `to` are both required | "Select a start and end date" | "開始日と終了日を選択してください" |

### 8.2 Scope & Ownership Validation

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `merchantId` / `shopId` | Admin only; supplying either as buyer/merchant is rejected (BR-OI-001) | "You don't have permission to filter by merchant" | "この絞り込みを行う権限がありません" |
| `:id` | Must be a valid UUID | "Invalid order reference" | "注文の指定が不正です" |
| `:id` | Must belong to the caller's scope (BR-OI-008) | "Order not found" | "注文が見つかりません" |

### 8.3 Validation Enforcement Layers

1. **Frontend (Client):** React Hook Form + Zod schemas on all filter, pagination, sort, and period inputs.
2. **Backend (Server):** NestJS `ValidationPipe` + class-validator DTOs on every Order Insights endpoint; owner scoping applied in the service layer, never from client input.
3. **Database (PostgreSQL):** `order_statuses` is the source of truth for valid status codes; `chk_orders_status` constrains stored values (read-only for this subsystem).

---

## 9. Error Handling Specification

### 9.1 Error Response Structure

```json
{
  "statusCode": 404,
  "message": ["Order not found"],
  "error": "Not Found",
  "timestamp": "2026-08-21T12:00:00.000Z",
  "path": "/api/v1/orders/9f1c1a52-6f0e-4f6d-9a1e-2b5d3c7e8a10"
}
```

### 9.2 Error Classification Table — Order Insights

| HTTP Status | Error Code | Scenario | User-Facing Behavior |
|-------------|------------|----------|---------------------|
| `400` | `BAD_REQUEST` | Invalid status/date/period/pagination/sort parameter | Field-level inline error + top banner |
| `401` | `UNAUTHORIZED` | Missing or invalid JWT | Redirect to login |
| `403` | `FORBIDDEN` | Buyer requesting a merchant summary (BR-OI-005); merchant with `license_status ≠ 'approved'` (BR-OI-006); non-admin supplying `merchantId`/`shopId` | "You don't have permission to view this data" / "Your merchant account is not approved" |
| `404` | `NOT_FOUND` | Order does not exist **or** is outside the caller's scope (BR-OI-008 — deliberately indistinguishable) | "Order not found" with a Back to Orders action |
| `422` | `UNPROCESSABLE_ENTITY` | `period=custom` without a valid `from`/`to` pair | "Select a start and end date" |
| `429` | `TOO_MANY_REQUESTS` | Rate limit exceeded | "Too many requests. Please wait {seconds} seconds" |
| `500` | `INTERNAL_SERVER_ERROR` | Aggregation / DB failure | "Something went wrong. Please try again" |

### 9.3 Frontend Error Display Behavior

- **Loading:** skeleton shimmer for tables, tiles, and the timeline; error state with a retry button.
- **Empty data:** `0` / `—` placeholders and illustrated empty states (BR-OI-030), never an error.
- **Cross-scope access:** a `404` from BR-OI-008 renders the standard not-found panel — it never reveals that the order exists under another owner.
- **Unsupported metrics:** unlocked commission rate renders as `—` / footnote (BR-OI-032), not as errors.
- **Toast notifications:** used for transient API errors and retry outcomes.

---

## 10. Permission and Access Control

### 10.1 Authentication Requirements

- Every Order Insights endpoint requires a valid JWT Bearer Token. There are **no public endpoints**.
- Role access follows Requirement Spec §2.2: "View Order History" is ✅ for buyers (own orders), and "View Order Insights" (sales/revenue summaries) is ✅ for merchant and admin only, ❌ for guest and buyer.

### 10.2 Protected Endpoints

| Endpoint | Access Level | Scope Applied |
|----------|-------------|---------------|
| `GET /orders` | Protected (Buyer, Merchant, Admin) | Buyer → own; Merchant → own shop; Admin → all (§6.4) |
| `GET /orders/:id` | Protected (Buyer, Merchant, Admin) | Ownership verified per BR-OI-008 |
| `GET /orders/:id/tracking` | Protected (Buyer, Merchant, Admin) | Ownership verified per BR-OI-008 |
| `GET /order-insights/merchant/sales-summary` | Protected (Merchant, Admin) | Own shop only |
| `GET /order-insights/merchant/revenue-summary` | Protected (Merchant, Admin) | Own shop only |

### 10.3 Role-Based Access

| Role | Order History | Order Detail | Order Tracking | Customer Info on Detail | Sales Summary | Revenue Summary | Filter by Shop/Merchant |
|------|:-------------:|:------------:|:--------------:|:-----------------------:|:-------------:|:---------------:|:-----------------------:|
| `guest` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `buyer` | ✓ (own orders) | ✓ (own orders) | ✓ (own orders) | ✗ (own address only) | ✗ | ✗ | ✗ |
| `merchant` | ✓ (own shop) | ✓ (own shop) | ✓ (own shop) | ✓ | ✓ (own shop) | ✓ (own shop) | ✗ |
| `admin` | ✓ (all) | ✓ (all) | ✓ (all) | ✓ | ✓ | ✓ | ✓ |

### 10.4 Ownership & Data Scoping

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('buyer', 'merchant', 'admin')
@Controller('orders')
export class OrderInsightsController {
  // GET /            -> role-scoped list (BR-OI-001)
  //   buyer     -> where buyer_id = currentUser.id
  //   merchant  -> 1) resolve merchants.id via merchants.user_id = currentUser.id
  //                2) verify license_status = 'approved', else 403 (BR-OI-006)
  //                3) where merchant_id = <resolved merchants.id>
  //   admin     -> no owner filter; may pass merchantId / shopId / status (§5.6)
  //
  // GET /:id          -> detail;   ownership verified after load, mismatch -> 404 (BR-OI-008)
  // GET /:id/tracking -> timeline; ownership verified after load, mismatch -> 404 (BR-OI-008)
  //
  // NOTE: Status updates are NOT declared here — they belong to the
  //       Order Fulfillment module. This controller is read-only (BR-OI-007).
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('merchant', 'admin')
@Controller('order-insights/merchant')
export class MerchantOrderInsightsController {
  // GET /sales-summary   -> order counts: today / this month / completed (BR-OI-018/019)
  // GET /revenue-summary -> Sales, Commission, Revenue, AOV — ALWAYS all four (BR-OI-026)
  //   merchant -> scoped to the resolved merchants.id; license gate applies (BR-OI-006)
  //   admin    -> bypasses the license gate; must pass merchantId to select a shop
}
```

Merchant and buyer queries MUST always be scoped from the JWT identity — never by trusting a client-supplied owner id. Admin filters (`merchantId`, `shopId`) are the **only** client-supplied scope inputs and are accepted from the `admin` role alone.

### 10.5 Security Audit Logging

| Event | Data Logged | Retention |
|-------|-------------|-----------|
| `ORDER_LIST_VIEWED` | userId, role, applied filters, page, timestamp | 90 days |
| `ORDER_DETAIL_VIEWED` | userId, role, orderId, timestamp | 90 days |
| `ORDER_TRACKING_VIEWED` | userId, role, orderId, timestamp | 90 days |
| `MERCHANT_SUMMARY_VIEWED` | userId, merchantId, summary type (sales/revenue), period, timestamp | 90 days |
| `CROSS_SCOPE_ACCESS_DENIED` | userId, role, requested orderId, timestamp | 180 days (security signal, BR-OI-008) |

---

## 11. Real-Time Notification Behavior

### 11.1 Current Implementation

Order Insights screens do not open WebSocket connections. Data is fetched on navigation and on filter/period change via standard query invalidation (TanStack Query). Status changes originate in the Order Fulfillment module; buyers are informed of them through the Notification System (Requirement Spec §6.2), not by this subsystem.

### 11.2 Refresh Triggers

| Event | Trigger | Effect |
|-------|---------|--------|
| Order created | Checkout completes | Merchant summary cache invalidated; order history refetches on next load |
| Order status updated | Order Fulfillment module updates `orders.status` | `cache:oi:merchant:{merchantId}:summary` invalidated; tracking + list refetch |
| Filter / period changed | User changes status, shop, date range, or period | Refetch the affected query only |
| Manual refresh | Refresh button clicked | Full refetch of the active view |
| Route focus | Returning to an Order Insights route | Stale-time refetch (default 5 min `staleTime`) |

### 11.3 Notification Boundary

Order-status notifications (buyer "your order has shipped", merchant "new order received") are delivered by the **Notification System** (§6.2). Order Insights renders state; it does not emit notifications.

---

## 12. Screen Transition Specification

### 12.1 Inbound Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| Buyer account menu / "My Orders" | `/orders` | Buyer authenticated |
| Checkout completion screen | `/orders/:id` | Order just placed |
| Merchant sidebar → "Orders" | `/merchant/orders` | Merchant authenticated and license-approved |
| Admin sidebar → "Orders" | `/admin/orders` | Admin authenticated |
| Notification (order status changed) | `/orders/:id/tracking` | Deep link from the Notification System |
| Any protected route (unauthenticated) | `/login` | No valid access token |
| Merchant route with `license_status ≠ approved` | `/merchant/pending-approval` | BR-OI-006 |
| Buyer attempting a merchant/admin route | `/unauthorized` | BR-OI-005 |

### 12.2 Internal Navigation

| Source | Target | Trigger |
|--------|--------|---------|
| Order history row | Order detail (`/orders/:id`, `/merchant/orders/:id`, `/admin/orders/:id`) | Click the order number / "View" |
| Order detail | Order tracking (`…/:id/tracking`) | Click "Track Order" |
| Order tracking | Order detail | Click "Back" |
| Admin order list | Same list with filters applied | Select shop/merchant or status filter (§5.6) |
| Merchant summary tile | Own-shop order list pre-filtered | Click a Sales Summary tile (e.g. "Completed" → `status=delivered`) |

### 12.3 Outbound Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| Buyer order detail | `/products/:id` | Click a product line item |
| Buyer order detail | Review form | Order `status = 'delivered'` and the product is not yet reviewed (Review subsystem) |
| Merchant order detail | Order Fulfillment status screen | The **Change Status** action only navigates to Order Fulfillment; the actual update is performed there |
| Admin order list | `/admin/merchants/:id` | Click a shop/merchant name |

### 12.4 Error Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| Any Order Insights page | `/login` | 401 Unauthorized |
| Any Order Insights page | `/unauthorized` | 403 Forbidden (role or license gate) |
| Order detail / tracking | Not-found panel on the current route | 404 (order missing or out of scope, BR-OI-008) |
| Any Order Insights page | Current page + toast | 400 / 422 / 429 / 500 (inline handling, no redirect) |

---

## 13. Non-Functional Considerations

### 13.1 Performance Requirements

| Metric | Target |
|--------|--------|
| Order history page load | ≤ 2 seconds |
| Order list API (any role, paginated) | ≤ 1 second |
| Order detail API | ≤ 500 ms |
| Order tracking API | ≤ 500 ms |
| Merchant sales summary API | ≤ 500 ms (cache hit) / ≤ 1.5 s (cache miss) |
| Merchant revenue summary API | ≤ 500 ms (cache hit) / ≤ 1.5 s (cache miss) |
| Admin all-orders API with filters | ≤ 1.5 s |

### 13.2 Caching Strategy

| Cache Key | TTL | Invalidation Trigger |
|-----------|-----|---------------------|
| `cache:oi:merchant:{merchantId}:summary` | 5 min | Order created (Checkout) / status updated (Order Fulfillment) / manual refresh |
| `cache:oi:statuses` | 24 h | `order_statuses` master data change (deploy-time) |

> Order history, detail, and tracking responses are **not** server-cached — they are per-user scoped and served directly from indexed queries.

### 13.3 Query & Index Usage

| Query | Index Relied Upon |
|-------|-------------------|
| Buyer order history | `idx_orders_buyer_id`, `idx_orders_created_at` |
| Merchant order history / summaries | `idx_orders_merchant_id`, `idx_orders_created_at` |
| Admin filtered list | `idx_orders_merchant_id`, `idx_orders_status`, `idx_orders_created_at` |
| Order detail items | `idx_order_items_order_id`, `idx_order_items_merchant_id` |
| Tracking timeline | `idx_order_status_history_order_id` |

### 13.4 Responsive Design Requirements

| Breakpoint | Layout |
|------------|--------|
| Desktop (≥ 1024px) | 3-across Sales Summary tiles; Revenue Summary as a 4-column group; full-width order table |
| Tablet (768px – 1023px) | Sales Summary tiles in a single 1×3 row; Revenue Summary as a 2×2 group; condensed table |
| Mobile (< 768px) | 1-column tiles; **Revenue Summary stacks all four figures vertically — it is never truncated to a single value (BR-OI-026)**; order list renders as cards |

### 13.5 Accessibility Requirements

| Requirement | Implementation |
|-------------|---------------|
| WCAG 2.1 AA | Semantic HTML; ARIA labels on all interactive elements |
| Keyboard Navigation | Tab order: filters → summary tiles → table rows → pagination |
| Screen Reader | Status badges expose the full status name; the tracking stepper is an ordered list with `aria-current="step"` on the current status; each Revenue Summary figure is announced with its own label (never a bare number) |
| Color Contrast | Minimum 4.5:1 for text, 3:1 for UI components |
| Focus Indicators | Visible focus ring on all interactive elements |

### 13.6 Internationalisation

All labels — including `order_statuses.status_name`, the four Revenue Summary labels, and the schema-gap footnotes — are i18n keys resolved for EN / MY / JA (Requirement Spec §8.1).

---

## 14. Configurable Items (External Definitions)

Defined via `.env` configuration:

| Definition Key | Default Value | Description |
|----------------|---------------|-------------|
| `OI_ORDER_LIST_PAGE_SIZE` | `20` | Default order history page size |
| `OI_TABLE_MAX_PAGE_SIZE` | `100` | Maximum page size accepted by the API |
| `OI_DEFAULT_SUMMARY_PERIOD` | `this_month` | Default Revenue Summary period |
| `OI_SUMMARY_CACHE_TTL_SECONDS` | `300` | Merchant sales/revenue summary cache TTL (5 min) |
| `OI_STATUS_CACHE_TTL_SECONDS` | `86400` | `order_statuses` master-data cache TTL |
| `OI_DEFAULT_COMMISSION_RATE` | `12.00` | Fallback commission rate (%) used only when `commission_settings` is unreadable (BR-OI-023) |

---

## 15. Cross-Reference Traceability Matrix

### 15.1 Requirements Definition Traceability

| Requirement | Requirement Description | Covered By (This Document) |
|-------------|-------------------------|----------------------------|
| §3.3 Order History (Buyer) | View all past orders | UC-OI-001, BR-OI-002/009~012, §5.1, §6.1 |
| §3.3 Order Detail (Buyer) | View order items, totals, payment status | UC-OI-002, BR-OI-008/017, §5.2, §6.2, §7.5 |
| §3.3 Order Tracking (Buyer) | Track status timeline | UC-OI-003, BR-OI-013/014, §3.1~3.3, §5.3, §6.3, §7.6 |
| §4.5 Order History (Merchant) | View orders for own shop | UC-OI-004, BR-OI-003/006, §5.4.3, §6.1 |
| §4.5 Order Detail (Merchant) | View order items, customer info | UC-OI-005, BR-OI-015/033, §5.5, §6.2, §7.5 |
| §4.5 Order Tracking (Merchant) | Track order status | UC-OI-006, BR-OI-013/014, §5.3, §6.3 |
| §4.5 Sales Summary (Merchant) | Order counts: today / this month / completed | UC-OI-007, BR-OI-018~019, §5.4.1, §6.4, §7.7 |
| §4.5 Revenue Summary (Merchant) | Sales, Commission, Revenue, AOV | UC-OI-008, **BR-OI-021~028**, §5.4.2, §6.5, §7.8 |
| §5.6 All Orders (Admin) | View all platform orders | UC-OI-009, BR-OI-004, §5.6, §6.1 |
| §5.6 Orders by Merchant (Admin) | Filter orders by shop | UC-OI-010, BR-OI-016, §5.6 (EL-OI-61), §6.1 |
| §5.6 Orders by Status (Admin) | Filter by order status | UC-OI-011, BR-OI-011/016, §5.6 (EL-OI-62), §6.1 |
| §6.4 Order Insights (Shared) | Each role sees only its own scope | **BR-OI-001~004, BR-OI-008**, §10.3, §10.4 |
| §7.3 Orders | Status flow; prices locked at order creation | §3.1, §3.2, BR-OI-017 |
| §7.7 Monetization | Commission rate locked at order creation; payout = Sales − Commission | BR-OI-022, BR-OI-023, BR-OI-024 |
| §2.2 Permission Matrix | View Order Insights: Merchant ✅ / Admin ✅ | BR-OI-005, §10.1, §10.3 |

### 15.2 Database Design Traceability

| Database Table | Relevant Functional Operations |
|----------------|-------------------------------|
| `orders` | Order history list (SELECT by `buyer_id`/`merchant_id`/`status`/`created_at`), order detail header, sales summary counts, revenue aggregation. **No writes.** |
| `order_items` | Order detail line items; merchant-scoped item projection (`merchant_id`) |
| `order_statuses` | Status label/order source of truth; tracking timeline skeleton (BR-OI-013); terminal-state definition for the completed count (BR-OI-018) |
| `order_status_history` | Tracking timeline timestamps (BR-OI-013/014) |
| `merchants` | Merchant ID resolution (`user_id` → `id`), license gate (`license_status`), shop name for admin list |
| `shops` | Admin shop filter option list (EL-OI-61) |
| `users` | Buyer name/contact for the customer-information block (merchant/admin only) |
| `commission_settings` | Commission rate for the Revenue Summary (BR-OI-022/023) — read-only |

### 15.3 Related Document References

| Document ID | Document Name | File Path |
|-------------|---------------|-----------|
| SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` |
| SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` |
| SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` |

---

---

*End of Functional Specification (Order Insights)*
