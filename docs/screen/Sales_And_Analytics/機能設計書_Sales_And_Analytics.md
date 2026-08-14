# Functional Specification (機能設計書) — Sales & Analytics

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-FDS-SA-001 |
| **Target Screen** | Merchant Sales Dashboard & Analytics (販売ダッシュボード・分析), Admin Analytics & Reports (管理者分析・レポート) |
| **Subsystem** | Sales Dashboard & Analytics |
| **Function ID** | FN-SA-001 (Merchant Sales Dashboard), FN-SA-002 (Merchant Analytics), FN-SA-003 (Admin Analytics & Reports) |
| **Version** | 1.0 |
| **Created** | 2026-08-14 |
| **Last Updated** | 2026-08-14 |
| **Author** | Software Architect |
| **Status** | Draft (レビュー中) |
| **Classification** | Internal — Engineering Division |

---

## Document Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-08-14 | Software Architect | Initial functional specification for the Sales & Analytics subsystem covering the Merchant Sales Dashboard, Merchant Analytics, and Admin Analytics & Reports screens. Aligned with Requirement Spec v1.0 modules M-DASH, M-ANAL, A-ANAL and the `orders`, `order_items`, `products`, `users`, `shops`, and `reviews` tables in Database Spec v1.0. |

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
16. [Shared Schema & Cross-Screen Considerations](#16-shared-schema--cross-screen-considerations)

---

## 1. Functional Overview

### 1.1 Purpose and Scope

This subsystem provides merchants and platform administrators with a consolidated view of business performance through dashboard and analytics screens. Merchants can monitor their shop's sales, orders, product performance, and customer demographics; administrators can monitor platform-wide KPIs, revenue, user growth, and merchant/category performance.

The Sales & Analytics subsystem is **fully read-only** for analytics: all KPI and chart data is derived by aggregating transactional data (`orders`, `order_items`) and master data (`products`, `users`, `shops`, `reviews`) at query time; no derived KPI tables are persisted in this version.

**Scope boundary:** the order status update (`PATCH /orders/:id/status`, M-DASH-003) is **out of scope** for this subsystem. It is owned and implemented by the **Order Management / Fulfillment module**; Sales & Analytics only consumes `orders.status` as a **data dependency** (KPI recognition BR-SA-006, order list display, cache invalidation §11.2). This subsystem never writes `orders.status`.

### 1.2 Functional Responsibilities

This subsystem is responsible for the following core functional areas:

1. **Sales Dashboard KPIs** — Merchants view key metrics: total sales, order count, average order value, and average product rating (M-DASH-005).
2. **Daily / Monthly Sales Overview** — Merchants view a summary of sales by day and by month (M-DASH-001).
3. **Order List (Read-Only)** — Merchants view their shop's orders with status and amount (M-DASH-002). `orders.status` is displayed read-only; updates are performed in the Order Management / Fulfillment module (out of scope).
4. **Order Status Update (Out of Scope)** — Advancing an order's status (M-DASH-003) is owned by the Order Management / Fulfillment module. Documented in this spec (§3, §4.4, §6.4) only for data-dependency traceability; not implemented here.
5. **Best-Selling Products Ranking** — Merchants view their top-selling products (M-DASH-004).
6. **Sales Trend Charts** — Merchants visualize sales trends over selectable time ranges (7d/30d/90d/1y) (M-ANAL-001).
7. **Product Performance** — Merchants view per-product views and sales performance (M-ANAL-002).
8. **Customer Demographics** — Merchants view anonymized customer demographic breakdowns derived from shipping address data (M-ANAL-003).
9. **Platform-Wide Dashboard (Admin)** — Admins view platform KPIs (users, merchants, orders, revenue) and pending actions (A-ANAL-001).
10. **User Growth Analytics (Admin)** — Admins view user growth over time (A-ANAL-002).
11. **Sales Reports (Admin)** — Admins view monthly/yearly sales reports with export (A-ANAL-003).
12. **Category Performance (Admin)** — Admins view sales/revenue breakdown by category (A-ANAL-004).
13. **Merchant Performance (Admin)** — Admins view merchant-level revenue ranking (A-ANAL-005).

### 1.3 Target Users

| Attribute | Value |
|-----------|-------|
| **Primary Actor (Merchant)** | Authenticated merchant viewing own shop's sales, orders, and analytics |
| **Primary Actor (Admin)** | Authenticated admin viewing platform-wide dashboard and analytics |
| **Required Authentication** | JWT Bearer Token for all endpoints (no public access) |
| **Data Scope** | Merchant: own shop's order items and products only. Admin: platform-wide data. |

### 1.4 Relationships with Other Functions and Peripheral Systems

```text
┌──────────────────────────┐      ┌─────────────────────────────────────┐
│   Merchant Actor         │      │     Analytics Module               │
│   (Views Dashboard)      ├─────►│  GET /analytics/merchant/*          │
└──────────────────────────┘      │  GET /orders (merchant, read-only) │
                                  └──────────────┬────────────────────┘
                                                 │ Reads / Aggregates
              ┌────────────────────────────┬──────┴──────┬──────────────────────────┐
              ▼                            ▼             ▼                          ▼
      ┌──────────────┐            ┌──────────────┐  ┌──────────────┐        ┌──────────────┐
      │  orders      │            │ order_items  │  │  products    │        │   users      │
      │  status,     │            │ merchant_id, │  │  merchant_id,│        │  created_at, │
      │  total,      │            │ quantity,    │  │  avg_rating, │        │  role        │
      │  created_at  │            │ total_price  │  │  category_id │        │  is_active   │
      └──────────────┘            └──────────────┘  └──────────────┘        └──────────────┘
              ▼                            ▼                     ▼
      ┌──────────────┐            ┌──────────────┐     ┌──────────────┐
      │  shipping_   │            │  reviews     │     │  shops       │
      │  address     │            │  rating      │     │  is_approved │
      │  (JSONB)     │            │  is_approved │     │  created_at  │
      └──────────────┘            └──────────────┘     └──────────────┘
              ▲                            ▲
              │                            │
┌──────────────────────────┐    ┌──────────────────────────┐
│   Admin Actor            │    │  Report Export (CSV)     │
│   (Platform Analytics)   │    │  client-side generation  │
└──────────────────────────┘    └──────────────────────────┘
```
> `PATCH /orders/:id/status` (write to `orders.status`) is **owned by the Order Management / Fulfillment module** (out of scope, §6.4); the Analytics Module only reads `orders.status`.

### 1.5 Inputs / Outputs

| Input Information | Data Category | Source / Description |
|-------------------|---------------|----------------------|
| `range` | Query Parameter | Trend range preset: `7d`, `30d`, `90d`, `1y` |
| `from` / `to` | Query Parameter | Custom date range (ISO 8601, UTC); mutually exclusive with `range` |
| `reportType` | Query Parameter | Admin sales report type: `monthly`, `yearly` |
| `period` | Query Parameter | Specific report period (e.g. `2026-08` or `2026`) |
| `status` | Query Parameter | Order status filter for the order list |
| `page` / `limit` | Query Parameter | Pagination for order list / product performance / rankings |
| `sort` / `orderBy` | Query Parameter | Sort field and direction |
| `id` | Path Parameter | Order ID (CUID) for status update *(Order Management / Fulfillment module — out of scope)* |
| `status` (body) | User Input | New order status for `PATCH /orders/:id/status` *(Order Management / Fulfillment module — out of scope)* |

| Output Information | Data Category | Destination / Description |
|--------------------|---------------|---------------------------|
| `kpis` | KPI Data | Merchant/admin dashboard KPI values with trend deltas |
| `trendPoints` | Chart Data | Time-series data for sales/revenue/user-growth charts |
| `orders` | Order Data | Merchant order list rows |
| `bestSellers` | Product Data | Best-selling product ranking rows |
| `productPerformance` | Product Data | Per-product views/sales rows |
| `demographics` | Aggregate Data | Anonymized demographic breakdowns |
| `reports` | Report Data | Admin monthly/yearly sales report rows |
| `categoryPerformance` | Aggregate Data | Sales/revenue by category |
| `merchantPerformance` | Aggregate Data | Merchant revenue ranking rows |
| `meta` | Pagination Meta | Page, limit, total, totalPages |

### 1.6 Related Documents

| No. | Document ID | Document Name | File Path / Reference | Remarks |
|-----|-------------|---------------|----------------------|---------|
| 1 | SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | M-DASH-001~005, M-ANAL-001~003, A-ANAL-001~005, API endpoints (§6.2), frontend routes (§6.3), permission matrix (§2) |
| 2 | SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | `orders`, `order_items`, `products`, `users`, `shops`, `reviews` tables, indexes |
| 3 | SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | Merchant/Admin Dashboard Design (§9.4/§9.5), design tokens (§9.6), RBAC, charting rules |

---

## 2. Use Cases and Business Workflow

### 2.1 Use Case Catalog

| UC-ID | Use Case Name | Precondition | Postcondition | Triggering Actor |
|-------|---------------|--------------|---------------|------------------|
| UC-SA-001 | View Merchant Dashboard KPIs | Merchant authenticated. | KPI cards (total sales, orders, avg order value, rating) displayed with trend deltas. | Merchant |
| UC-SA-002 | View Daily/Monthly Sales Overview | Merchant authenticated. | Sales summary by day and by month displayed. | Merchant |
| UC-SA-003 | View Sales Trend Chart | Merchant authenticated. | Line/bar chart of sales over the selected range rendered. | Merchant |
| UC-SA-004 | View Merchant Order List | Merchant authenticated. | Paginated order list scoped to the merchant's shop displayed. | Merchant |
| UC-SA-005 | Update Order Status *(External)* | Merchant authenticated. Order contains at least one item from the merchant's shop. | Order `status` advanced to a valid next state; order list refreshes. | Merchant (via Order Management / Fulfillment module) |
| UC-SA-006 | View Best-Selling Products Ranking | Merchant authenticated. | Top-selling products ranking (by quantity and revenue) displayed. | Merchant |
| UC-SA-007 | View Product Performance | Merchant authenticated. | Per-product views and sales table displayed with sorting/pagination. | Merchant |
| UC-SA-008 | View Customer Demographics | Merchant authenticated. | Anonymized demographic breakdowns (location, gender, age) displayed. | Merchant |
| UC-SA-009 | View Platform Dashboard (Admin) | Admin authenticated. | Platform-wide KPI cards and pending actions displayed. | Admin |
| UC-SA-010 | View User Growth Analytics (Admin) | Admin authenticated. | User growth chart (new signups over time by role) displayed. | Admin |
| UC-SA-011 | View Sales Reports (Admin) | Admin authenticated. | Monthly/yearly sales report with export displayed. | Admin |
| UC-SA-012 | View Category Performance (Admin) | Admin authenticated. | Sales/revenue breakdown by category displayed. | Admin |
| UC-SA-013 | View Merchant Performance (Admin) | Admin authenticated. | Merchant revenue ranking with pagination displayed. | Admin |

> **UC-SA-005 is out of scope** for the Sales & Analytics implementation. It is owned by the **Order Management / Fulfillment module** and is listed here only for traceability (M-DASH-003) and to document the data dependency: analytics reads `orders.status` after the external module updates it.

### 2.2 Primary Business Workflow — Merchant Sales Dashboard

```
            ┌──────────────────────┐
            │  Merchant Logs In    │
            │  (JWT Authenticated) │
            └──────────┬───────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │  /merchant/dashboard │
            │  (UC-SA-001)         │
            └──────────┬───────────┘
                       │
        ┌──────────────┼─────────────────────┐
        ▼              ▼                     ▼
┌──────────────┐ ┌──────────────┐  ┌──────────────────┐
│ KPI Cards    │ │ Sales Trend  │  │ Recent Orders    │
│ Total Sales, │ │ Chart        │  │ Table (read-only,│
│ Orders, AOV, │ │ (UC-SA-003)  │  │  status display) │
│ Rating       │ │              │  │ (UC-SA-004)      │
│ (UC-SA-001)  │ └──────────────┘  └──────────────────┘
└──────────────┘        │
                        ▼
              ┌──────────────┐
              │ Range Select │
              │ 7d/30d/90d/1y│
              └──────────────┘
                        │
                        ▼
              ┌──────────────────────────────┐
              │  /merchant/analytics         │
              │  Sales Trends / Product      │
              │  Performance / Demographics  │
              │  (UC-SA-002, 006, 007, 008)  │
              └──────────────────────────────┘
```
> Status updates (UC-SA-005) are performed in the Order Management / Fulfillment module; the dashboard displays the resulting status read-only.

### 2.3 Primary Business Workflow — Admin Analytics

```
            ┌──────────────────────┐
            │  Admin Logs In       │
            │  (JWT Authenticated) │
            └──────────┬───────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │  /admin/dashboard    │
            │  (UC-SA-009)         │
            └──────────┬───────────┘
                       │
        ┌──────────────┼───────────────────┐
        ▼              ▼                   ▼
┌──────────────┐ ┌──────────────┐  ┌────────────────┐
│ Platform KPIs│ │ Pending      │  │ Revenue & User │
│ Users,       │ │ Actions      │  │ Growth Charts  │
│ Merchants,   │ │ List         │  │ (UC-SA-010)    │
│ Orders,      │ └──────────────┘  └────────────────┘
│ Revenue      │
└──────────────┘
        │
        ▼
┌──────────────────────────────┐
│  /admin/analytics            │
│  Sales Reports (UC-SA-011)   │
│  Category Performance        │
│  (UC-SA-012)                 │
│  Merchant Performance        │
│  (UC-SA-013)                 │
└──────────────────────────────┘
```

### 2.4 Data Dependency — Order Status Update (M-DASH-003)

The order status update workflow is executed **entirely by the Order Management / Fulfillment module** (out of scope for this subsystem). Sales & Analytics is only a consumer of its outcome:

| Step | Action | Module |
|:----:|--------|--------|
| 1 | Merchant advances an order's status via the Order Management screens | Order Management / Fulfillment |
| 2 | `PATCH /orders/:id/status` validates the forward-only transition and persists it | Order Management / Fulfillment |
| 3 | Order Management invalidates `cache:sa:merchant:{id}:kpis` (cross-module contract, §11.2) | Order Management / Fulfillment |
| 4 | Sales & Analytics re-aggregates KPIs from the updated `orders.status` on next request | Sales & Analytics (read-only) |

The state machine itself (states + forward-only transitions) is specified in §3 and enforced by the Order Management module (§6.4).

### 2.5 Relevant Requirements Covered

| Requirement ID | Requirement Summary |
|----------------|---------------------|
| M-DASH-001 | Merchant can view daily/monthly sales overview |
| M-DASH-002 | Merchant can view order list |
| M-DASH-003 | Merchant can update order status — **implemented by Order Management / Fulfillment module (out of scope)**; this subsystem consumes `orders.status` as a data dependency (§2.4, §6.4) |
| M-DASH-004 | Merchant can view best-selling products ranking |
| M-DASH-005 | Dashboard shows key metrics: total sales, orders, avg order value |
| M-ANAL-001 | Merchant can view sales trends (charts) |
| M-ANAL-002 | Merchant can view product performance (views, sales) |
| M-ANAL-003 | Merchant can view customer demographics |
| A-ANAL-001 | Admin can view platform-wide dashboard |
| A-ANAL-002 | Admin can view user growth analytics |
| A-ANAL-003 | Admin can view sales reports (monthly/yearly) |
| A-ANAL-004 | Admin can view category performance |
| A-ANAL-005 | Admin can view merchant performance |

---

## 3. State Transition Specification

> The order status state machine below (§3.1–§3.2) is **owned and enforced by the Order Management / Fulfillment module** (out of scope). Sales & Analytics documents it here only to specify how it reads `orders.status` — for KPI recognition (BR-SA-006), order list display, and cache invalidation (§11.2). This subsystem never triggers a transition.

### 3.1 Order Status States (M-DASH-003)

| State | DB Value | Description | Is Terminal |
|-------|----------|-------------|:-----------:|
| `PENDING` | `'pending'` | Order created, awaiting merchant confirmation | ✗ |
| `CONFIRMED` | `'confirmed'` | Order confirmed by merchant | ✗ |
| `PROCESSING` | `'processing'` | Order is being prepared/shipped | ✗ |
| `DELIVERED` | `'delivered'` | Order delivered to customer | ✗ |
| `DONE` | `'done'` | Order completed and confirmed by customer | ✓ |

### 3.2 Order Status Transition Table

| Transition ID | Origin State | Target State | Trigger Action | Guard Conditions |
|---------------|--------------|--------------|----------------|------------------|
| TR-SA-01 | `PENDING` | `CONFIRMED` | Merchant confirms order | Order contains ≥ 1 item owned by the merchant |
| TR-SA-02 | `CONFIRMED` | `PROCESSING` | Merchant starts fulfillment | Previous state is `confirmed` |
| TR-SA-03 | `PROCESSING` | `DELIVERED` | Merchant marks delivered | Previous state is `processing` |
| TR-SA-04 | `DELIVERED` | `DONE` | Order completed | Previous state is `delivered` |

> Rule: Only **forward** transitions are allowed (TR-SA-01→02→03→04). No regression, no skipping. `done` is terminal. Transitions are enforced **by the Order Management / Fulfillment module** (§6.4, out of scope).

### 3.3 Query State Specification (Time Ranges)

| State | Description | Behavior |
|-------|-------------|----------|
| `RANGE_PRESET` | User selects 7d/30d/90d/1y | Server computes the window from `now()` at query time |
| `RANGE_CUSTOM` | User provides explicit `from`/`to` | Mutually exclusive with `range`; both present → `400 BAD_REQUEST` |
| `RANGE_EMPTY` | No range provided | Defaults to `30d` |

### 3.4 Data Freshness / Cache States

| State | Description | TTL | Behavior |
|-------|-------------|:---:|----------|
| `CACHE_COLD` | Dashboard KPIs not cached | — | Query DB, seed Redis cache |
| `CACHE_WARM` | Dashboard KPIs cached | 5 min | Serve cached response |
| `CACHE_INVALIDATED` | Order status updated *(by Order Management / Fulfillment module)* | — | `DEL cache:sa:merchant:{id}:kpis`, next request re-queries |

---

## 4. Business Rules

### 4.1 Data Scope & Authorization Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-SA-001 | Merchant Data Scope | All merchant analytics queries MUST be scoped to `order_items.merchant_id = <current user id>` (or products owned by the current user). A merchant can never see another merchant's data. | Backend (query scoping) |
| BR-SA-002 | Admin Platform Scope | Admin analytics queries cover all merchants/platform data with no merchant filter. | Backend (query scoping) |
| BR-SA-003 | Read-Only Analytics | All `/analytics/*` endpoints are read-only. This subsystem performs **no write operations at all** — order status update (§6.4) is owned by the Order Management / Fulfillment module (out of scope). | Backend (method design) |
| BR-SA-004 | Role Requirement | `/analytics/merchant/*` requires role `merchant` or `admin`; `/analytics/admin/*` requires role `admin` only (Requirement Spec permission matrix §2: View Sales Dashboard/View Analytics — Merchant ✓ Admin ✓; Revenue Tracking — Admin only). | Backend (RBAC) |

### 4.2 Metric Definition Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-SA-005 | Total Sales | `totalSales = SUM(order_items.total_price)` for the merchant's items, counted only within **recognized orders** (BR-SA-006). | Backend (aggregation) |
| BR-SA-006 | Recognized Order | An order is recognized for revenue KPIs when its `status` is `confirmed`, `processing`, `delivered`, or `done`. `pending` orders are excluded from sales figures (they are not yet confirmed). | Backend (aggregation) |
| BR-SA-007 | Order Count | `orderCount = COUNT(DISTINCT orders.id)` over recognized orders containing at least one item from the merchant's shop. | Backend (aggregation) |
| BR-SA-008 | Average Order Value | `avgOrderValue = totalSales / orderCount`. When `orderCount = 0`, display `0.00`. | Backend (aggregation) + Frontend (formatting) |
| BR-SA-009 | Average Rating | `avgRating = AVG(products.avg_rating)` across the merchant's products (rounded to 1 decimal). When no products, display `—`. | Backend (aggregation) |
| BR-SA-010 | Best-Seller Ranking | Ranked by `SUM(order_items.quantity)` DESC, tie-broken by `SUM(total_price)` DESC. Only recognized orders count. | Backend (aggregation) |
| BR-SA-011 | Product Views | `views` metric for product performance: derived from a `product_views` counter (event-sourced or periodic aggregation). When unavailable, defaults to `0` with a documented limitation. | Backend (analytics service) |

### 4.3 Time Range & Aggregation Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-SA-012 | Range Presets | Trend charts support `7d`, `30d`, `90d`, `1y` presets plus custom `from`/`to`. Default = `30d`. | Backend (validation) + Frontend (selector) |
| BR-SA-013 | Granularity | ≤ 30d → daily buckets; 90d → weekly buckets; 1y → monthly buckets. | Backend (aggregation) |
| BR-SA-014 | Timezone | All aggregations computed in UTC (DB stores UTC); presentation layer converts to local time. | Backend (query) + Frontend (formatting) |
| BR-SA-015 | Zero Filling | Empty time buckets are zero-filled so the chart is continuous. | Backend (aggregation) |

### 4.4 Order Status Rules

> The following rules are **enforced by the Order Management / Fulfillment module** (§6.4, out of scope). They are documented here only as the data dependency that defines which `orders.status` values this subsystem may observe.

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-SA-016 | Forward-Only Transitions | Status can only move forward in the chain `pending → confirmed → processing → delivered → done`. Regression or skipping is rejected with `409 CONFLICT`. | Order Management / Fulfillment module (backend service logic) |
| BR-SA-017 | Ownership for Update | A merchant can only update orders containing at least one `order_items` row with `merchant_id = <current user id>`. Otherwise `403 FORBIDDEN`. `admin` bypasses this ownership check (per REQUIREMENT_SPEC §2 the admin role inherits all merchant features), so an admin may update any order's status. | Order Management / Fulfillment module (backend service check) |
| BR-SA-018 | Terminal State | `done` cannot be transitioned further. | Order Management / Fulfillment module (backend service logic) |

### 4.5 Report Rules (Admin)

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-SA-019 | Sales Report Recognition | Admin sales reports count orders with `payment_status = 'completed'` (paid orders only), grouped by month (yearly report) or day (monthly report). | Backend (aggregation) |
| BR-SA-020 | Report Granularity | `reportType = monthly` groups by calendar month; `reportType = yearly` groups by calendar year. | Backend (aggregation) |
| BR-SA-021 | Export Format | Report tables can be exported client-side to CSV (rows limited to the current page/filter). | Frontend (CSV generation) |
| BR-SA-022 | User Growth Metric | User growth counts `users.created_at` bucketed by time; breakdown by `role` (buyer/merchant/admin). | Backend (aggregation) |

### 4.6 Display & UX Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-SA-023 | Currency Formatting | All monetary values formatted with currency symbol and 2 decimals using the platform default locale. | Frontend (Intl.NumberFormat) |
| BR-SA-024 | Trend Indicators | KPI cards show an up/down arrow with percentage delta vs. the previous period. | Frontend (display logic) |
| BR-SA-025 | Empty States | Zero/null data renders as `0`/`—` placeholders with an illustrated empty state, never an error. | Frontend (display logic) |
| BR-SA-026 | PII Anonymization | Demographics are aggregated and anonymized on the backend; raw buyer identities are never returned to merchants. | Backend (aggregation, DTO projection) |

---

## 5. Screen Specifications

### 5.1 Screen: Merchant Sales Dashboard (`/merchant/dashboard`)

**Purpose:** Provide merchants with a consolidated overview of their shop's sales performance.

#### 5.1.1 UI Elements

**Header & Controls:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-SA-01 | Page Title | Heading (h5) | `merchant.dashboard.title` | Yes | "Sales Dashboard" |
| EL-SA-02 | Page Subtitle | Text | `merchant.dashboard.subtitle` | No | "Track your shop's sales, orders, and performance." |
| EL-SA-03 | Time Range Selector | Select/Button Group | `common.timeRange` | Yes | 7d / 30d / 90d / 1y presets |
| EL-SA-04 | Custom Date Range | Date Range Picker | `merchant.dashboard.customRange` | No | Optional from/to picker (overrides preset) |
| EL-SA-05 | Refresh Button | Button (ghost, icon) | `common.refresh` | No | Refetch dashboard data |

**KPI Cards:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-SA-06 | Total Sales Card | Card | `merchant.dashboard.totalSales` | Yes | Sum of recognized order items; trend delta |
| EL-SA-07 | Orders Card | Card | `merchant.dashboard.orders` | Yes | Recognized order count; trend delta |
| EL-SA-08 | Avg Order Value Card | Card | `merchant.dashboard.aov` | Yes | Total sales / orders; trend delta |
| EL-SA-09 | Avg Rating Card | Card | `merchant.dashboard.rating` | Yes | Average product rating (1 decimal + stars) |

**Charts:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-SA-10 | Sales Trend Chart | Line/Bar Chart | `merchant.dashboard.salesTrend` | Yes | Revenue over the selected range (Recharts) |
| EL-SA-11 | Daily/Monthly Sales Overview | Table/Toggle | `merchant.dashboard.salesOverview` | No | Daily or monthly sales summary toggle |

**Order List:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-SA-12 | Recent Orders Table | Table | `merchant.dashboard.recentOrders` | Yes | Latest orders: order#, customer, items, amount, status — **read-only display** |
| EL-SA-14 | Status Badge | Badge | — | Yes | Color-coded status (pending/confirmed/processing/delivered/done) |
| EL-SA-15 | Page Info | Text | `common.pageInfo` | Yes | "Page 1 of 3 · 12 orders" |
| EL-SA-16 | Prev/Next Buttons | Buttons | `common.prev` / `common.next` | Yes | Pagination |

> Order status is displayed **read-only** on the dashboard (EL-SA-14 badge). Status updates are performed in the Order Management / Fulfillment module screens (out of scope).

**Best-Sellers:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-SA-17 | Best-Selling Products Card | Card/List | `merchant.dashboard.bestSellers` | Yes | Top N products by units sold with revenue |
| EL-SA-18 | View All Link | Link | `merchant.analytics.products` | No | Navigate to product performance |

**Default State:**
- Range = `30d`
- KPI cards show skeleton shimmer during load
- Chart shows last 30 days, daily buckets
- Order list sorted newest first, 10 per page
- Best-sellers shows top 5

### 5.2 Screen: Merchant Analytics (`/merchant/analytics`)

**Purpose:** Provide detailed analytical views of sales trends, product performance, and customer demographics.

#### 5.2.1 UI Elements

**Tabs:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-SA-20 | Sales Trends Tab | Tab | `merchant.analytics.salesTrends` | Yes | Tab: sales trends charts |
| EL-SA-21 | Product Performance Tab | Tab | `merchant.analytics.products` | Yes | Tab: product performance table |
| EL-SA-22 | Demographics Tab | Tab | `merchant.analytics.demographics` | Yes | Tab: customer demographics |

**Sales Trends Tab:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-SA-23 | Sales Trend Chart | Chart | `merchant.analytics.salesTrend` | Yes | Revenue + order count dual-axis chart |
| EL-SA-24 | Daily/Monthly Toggle | Button Group | `merchant.analytics.period` | Yes | Daily / Monthly aggregation toggle |
| EL-SA-25 | Comparison Chart | Chart | `merchant.analytics.compare` | No | Current vs previous period overlay |

**Product Performance Tab:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-SA-26 | Product Performance Table | Table | `merchant.analytics.productTable` | Yes | Columns: product, category, units sold, revenue, views, avg rating |
| EL-SA-27 | Sort Controls | Column headers | `common.sort` | No | Sort by revenue/units/views/rating |
| EL-SA-28 | Pagination | Control | `common.pageInfo` | Yes | 20 per page |

**Demographics Tab:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-SA-29 | Location Breakdown | Donut/Bar Chart | `merchant.analytics.location` | Yes | Buyers by region/city (from shipping address) |
| EL-SA-30 | Gender Breakdown | Bar Chart | `merchant.analytics.gender` | No | Anonymized gender distribution (when available) |
| EL-SA-31 | Age Breakdown | Bar Chart | `merchant.analytics.age` | No | Anonymized age bands |
| EL-SA-32 | No-Data Note | Text | `merchant.analytics.noData` | No | Shown when demographic source data is unavailable |

**Default State:**
- Active tab = Sales Trends
- Sales Trends shows 30d daily aggregation
- Product Performance sorted by revenue DESC

### 5.3 Screen: Admin Dashboard (`/admin/dashboard`)

**Purpose:** Provide platform administrators with a high-level overview of the whole marketplace.

#### 5.3.1 UI Elements

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-SA-40 | Page Title | Heading (h5) | `admin.dashboard.title` | Yes | "Admin Dashboard" |
| EL-SA-41 | Total Users Card | Card | `admin.dashboard.totalUsers` | Yes | Total registered users + delta |
| EL-SA-42 | Merchants Card | Card | `admin.dashboard.merchants` | Yes | Registered merchants + delta |
| EL-SA-43 | Orders Card | Card | `admin.dashboard.orders` | Yes | Total orders + delta |
| EL-SA-44 | Revenue Card | Card | `admin.dashboard.revenue` | Yes | Platform revenue + delta |
| EL-SA-45 | Pending Actions Panel | Card/List | `admin.dashboard.pendingActions` | Yes | Alert badges: merchant approvals, review moderation, content reports |
| EL-SA-46 | Revenue Chart | Dual-axis Chart | `admin.dashboard.revenueChart` | Yes | Platform revenue trend |
| EL-SA-47 | User Growth Chart | Chart | `admin.dashboard.userGrowth` | Yes | Signups over time (by role) |
| EL-SA-48 | Time Range Selector | Select | `common.timeRange` | Yes | 7d/30d/90d/1y |

**Default State:**
- Range = `30d`
- Pending actions show counts with Beauty Pink (#EC4899) accent badges
- Charts interactive (hover tooltips, click drill-down)

### 5.4 Screen: Admin Analytics & Reports (`/admin/analytics`)

**Purpose:** Provide administrators with detailed sales reports, category performance, and merchant performance analytics.

#### 5.4.1 UI Elements

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-SA-50 | Page Title | Heading (h5) | `admin.analytics.title` | Yes | "Analytics & Reports" |
| EL-SA-51 | Sales Report Tab | Tab | `admin.analytics.salesReport` | Yes | Monthly/yearly sales report |
| EL-SA-52 | Category Performance Tab | Tab | `admin.analytics.categories` | Yes | Sales/revenue by category |
| EL-SA-53 | Merchant Performance Tab | Tab | `admin.analytics.merchants` | Yes | Merchant revenue ranking |
| EL-SA-54 | Report Type Toggle | Button Group | `admin.analytics.reportType` | Yes | Monthly / Yearly |
| EL-SA-55 | Report Table | Table | `admin.analytics.reportTable` | Yes | Period, orders, gross sales, net revenue |
| EL-SA-56 | Export CSV Button | Button (outline) | `admin.analytics.export` | No | Export current report view to CSV |
| EL-SA-57 | Category Chart | Bar/Donut Chart | `admin.analytics.categoryChart` | Yes | Revenue share by category |
| EL-SA-58 | Merchant Ranking Table | Table | `admin.analytics.merchantTable` | Yes | Merchant, shop, orders, revenue (ranked) |

**Default State:**
- Sales Report tab active, report type = `monthly`, current month/year
- Merchant ranking sorted by revenue DESC, 20 per page

---

## 6. Functional Operation Specification

### 6.1 Operation: View Merchant Dashboard KPIs

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Navigate to `/merchant/dashboard` or change time range |
| **API Endpoint** | `GET /api/v1/analytics/merchant/dashboard?range=30d` |
| **Request Content-Type** | None (query parameters) |
| **Pre-Submission Validation** | `range` ∈ `7d/30d/90d/1y`; custom `from`/`to` must not be present with `range` |
| **Processing Steps** | 1. Validate JWT and role (`merchant`/`admin`). 2. Resolve merchant's user id (for admin, platform-wide). 3. Check Redis cache `cache:sa:merchant:{id}:kpis`. 4. On miss: compute `totalSales`, `orderCount`, `avgOrderValue`, `avgRating` per BR-SA-005~009 using `idx_order_items_merchant_id`, `idx_orders_created_at`. 5. Compute trend deltas vs. previous equivalent period. 6. Seed cache (5-min TTL). 7. Return KPI DTO. |
| **Success Response** | 200 OK with `kpis` object |
| **Post-Action** | Render KPI cards |

### 6.2 Operation: View Merchant Sales Trend

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Dashboard chart render or analytics Sales Trends tab |
| **API Endpoint** | `GET /api/v1/analytics/merchant/sales?range=30d&granularity=daily` |
| **Request Content-Type** | None (query parameters) |
| **Pre-Submission Validation** | Range validation; `granularity` ∈ `daily/weekly/monthly` (derived server-side if omitted) |
| **Processing Steps** | 1. Validate JWT and role. 2. Build time window (BR-SA-012). 3. Aggregate recognized orders by bucket (BR-SA-013/015, zero-filled). 4. Return `trendPoints` (timestamp + totalSales + orderCount). |
| **Success Response** | 200 OK with `trendPoints` array |
| **Post-Action** | Render chart series |

### 6.3 Operation: View Product Performance & Best-Sellers

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Analytics Product Performance tab / dashboard best-sellers card |
| **API Endpoint** | `GET /api/v1/analytics/merchant/products?page=1&limit=20&sortBy=revenue&order=desc` |
| **Request Content-Type** | None (query parameters) |
| **Pre-Submission Validation** | Pagination and sort validation |
| **Processing Steps** | 1. Validate JWT and role. 2. Scope products to the merchant (`products.merchant_id`). 3. Aggregate units sold and revenue from `order_items` within recognized orders (BR-SA-005/006/010). 4. Join `products.avg_rating`/`review_count` and views (BR-SA-011). 5. Apply sort and pagination. 6. Return rows with `meta`. |
| **Success Response** | 200 OK with `productPerformance` rows and `meta` |
| **Post-Action** | Render sortable table / best-seller list |

### 6.4 Operation: Update Order Status (OUT OF SCOPE — Order Management / Fulfillment module)

> **Ownership:** this operation is owned and implemented by the **Order Management / Fulfillment module**. It is documented here **only for data-dependency traceability** (M-DASH-003) and to define the cache-invalidation contract (§11.2) that Sales & Analytics relies on. It is **not** implemented by this subsystem.

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Merchant changes order status in the Order Management screens |
| **API Endpoint** | `PATCH /api/v1/orders/:id/status` |
| **Request Content-Type** | `application/json` |
| **Pre-Submission Validation** | `:id` is valid CUID; body `status` ∈ status enum; forward transition only |
| **Processing Steps** | 1. Validate `:id` and JWT + role. 2. Load order with `order_items`. 3. For `merchant` role: verify the caller owns ≥ 1 item (BR-SA-017) — else `403 FORBIDDEN`. `admin` skips this check. 4. Verify the target status is exactly the next state (BR-SA-016) — else `409 CONFLICT`. 5. Update `orders.status` and `updated_at`. 6. Invalidate `cache:sa:merchant:{id}:kpis` (analytics cache contract, §11.2). 7. Log `ORDER_STATUS_UPDATED` audit event. 8. Return updated order DTO. |
| **Success Response** | 200 OK with updated order |
| **Post-Action** | Refresh order list, show success toast |

### 6.5 Operation: View Customer Demographics

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Analytics Demographics tab |
| **API Endpoint** | `GET /api/v1/analytics/merchant/demographics?range=90d` |
| **Request Content-Type** | None (query parameters) |
| **Pre-Submission Validation** | Range validation |
| **Processing Steps** | 1. Validate JWT and role. 2. Scope recognized orders to merchant. 3. Aggregate `orders.shipping_address` JSONB (region/city, optional gender/age when present). 4. Anonymize — return counts only (BR-SA-026). 5. Return `demographics` object. |
| **Success Response** | 200 OK with `demographics` |
| **Post-Action** | Render charts or no-data note |

### 6.6 Operation: View Admin Platform Dashboard

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Navigate to `/admin/dashboard` |
| **API Endpoint** | `GET /api/v1/analytics/admin/dashboard?range=30d` |
| **Request Content-Type** | None (query parameters) |
| **Pre-Submission Validation** | Admin role; range validation |
| **Processing Steps** | 1. Validate JWT + `admin` role. 2. Aggregate total users, merchants, orders, revenue (BR-SA-002/019). 3. Compute pending action counts (unapproved shops, pending reviews, content reports). 4. Return KPI + pending actions DTO. |
| **Success Response** | 200 OK with dashboard data |
| **Post-Action** | Render admin dashboard |

### 6.7 Operation: View Admin Sales Reports

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Admin Analytics → Sales Report tab, toggle monthly/yearly |
| **API Endpoint** | `GET /api/v1/analytics/admin/revenue?reportType=monthly&period=2026-08` |
| **Request Content-Type** | None (query parameters) |
| **Pre-Submission Validation** | Admin role; `reportType` ∈ `monthly/yearly`; `period` format validation |
| **Processing Steps** | 1. Validate JWT + admin role. 2. Aggregate paid orders (`payment_status = 'completed'`) by period bucket (BR-SA-019/020). 3. Return report rows (period, orders, gross, net). 4. CSV export generated client-side from the current view (BR-SA-021). |
| **Success Response** | 200 OK with `reports` rows |
| **Post-Action** | Render report table; enable export |

### 6.8 Operation: View Admin User Growth & Performance

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Admin Dashboard user growth chart / Analytics tabs |
| **API Endpoint** | `GET /api/v1/analytics/admin/users?range=1y` and `GET /api/v1/analytics/admin/revenue?reportType=yearly` (merchant performance view) |
| **Request Content-Type** | None (query parameters) |
| **Pre-Submission Validation** | Admin role; range/period validation |
| **Processing Steps** | 1. Validate JWT + admin role. 2. Bucket `users.created_at` by role (BR-SA-022). 3. For merchant performance, aggregate revenue per merchant from recognized orders (BR-SA-002). 4. Return `userGrowth` and/or `merchantPerformance` rows with `meta`. |
| **Success Response** | 200 OK with data |
| **Post-Action** | Render charts and ranking tables |

---

## 7. Input / Output Specification

### 7.1 Input Specification — Common Query Parameters (入力定義)

| Field | Display Name (EN) | Data Type | Required | Input Control | Validation |
|-------|-------------------|-----------|:--------:|---------------|------------|
| `range` | Time Range | String | No | Select | `@IsIn(['7d','30d','90d','1y'])`, `@IsOptional()`; default `30d` |
| `from` | From Date | Date | No | Date picker | `@IsDateString()`, `@IsOptional()`; mutually exclusive with `range` |
| `to` | To Date | Date | No | Date picker | `@IsDateString()`, `@IsOptional()`; must be ≥ `from`; mutually exclusive with `range` |
| `page` | Page | Number | No | Pagination | `@IsInt()`, `@Min(1)`, default 1 |
| `limit` | Limit | Number | No | Pagination | `@IsInt()`, `@Min(1)`, `@Max(100)`, default 20 |
| `sortBy` | Sort Field | String | No | Sort control | `@IsIn(['revenue','units','views','rating'])`, `@IsOptional()` |
| `order` | Sort Direction | String | No | Sort control | `@IsIn(['asc','desc'])`, default `desc` |

### 7.2 Input Specification — Admin Report Query (入力定義)

| Field | Display Name (EN) | Data Type | Required | Input Control | Validation |
|-------|-------------------|-----------|:--------:|---------------|------------|
| `reportType` | Report Type | String | Yes | Button group | `@IsIn(['monthly','yearly'])` |
| `period` | Report Period | String | No | Select | `@Matches(/^\d{4}(-\d{2})?$/)`, `@IsOptional()`; e.g. `2026` or `2026-08` |

### 7.3 Input Specification — Order Status Update (入力定義)

> **Out of scope** — owned by the Order Management / Fulfillment module (§6.4). Listed for data-dependency reference only; the Sales & Analytics screens contain no status-update inputs.

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `status` | Order Status | 注文ステータス | VARCHAR(20) | Yes | Select (restricted) | `@IsIn(['confirmed','processing','delivered','done'])` |

### 7.4 Output Specification — Merchant Dashboard KPI (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `totalSales` | Aggregated `order_items.total_price` | Currency (e.g. `$5,740.00`) |
| `totalSalesDelta` | Previous-period comparison | Signed percent string (`+12.5%`) |
| `orderCount` | `COUNT(DISTINCT orders.id)` | Integer |
| `orderCountDelta` | Previous-period comparison | Signed percent string |
| `avgOrderValue` | `totalSales / orderCount` | Currency |
| `avgOrderValueDelta` | Previous-period comparison | Signed percent string |
| `avgRating` | `AVG(products.avg_rating)` | Number (1 decimal) |
| `range` | Echo of request | String (`30d`) |

### 7.5 Output Specification — Trend Point (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `timestamp` | Bucket start | ISO 8601 |
| `totalSales` | Bucket revenue | Number |
| `orderCount` | Bucket orders | Integer |

### 7.6 Output Specification — Product Performance Row (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `id` | `products.id` | CUID |
| `name` | `products.name` | String |
| `categoryId` | `products.category_id` | CUID |
| `unitsSold` | `SUM(order_items.quantity)` | Integer |
| `revenue` | `SUM(order_items.total_price)` | Currency |
| `views` | `product_views` counter | Integer (0 when unavailable) |
| `avgRating` | `products.avg_rating` | Number (1 decimal) |
| `reviewCount` | `products.review_count` | Integer |

### 7.7 Output Specification — Admin Report Row (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `period` | Bucket label (e.g. `2026-08` / `2026`) | String |
| `orderCount` | `COUNT(DISTINCT orders.id)` | Integer |
| `grossSales` | `SUM(orders.total)` | Currency |
| `netRevenue` | `SUM(orders.total) - commission/fees` | Currency |

---

## 8. Input Validation Rules

### 8.1 Query Parameter Validation

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `range` | Must be `7d/30d/90d/1y` | "Invalid time range" | "期間の指定が不正です" |
| `from`/`to` | Must be valid ISO dates; `to ≥ from` | "Invalid date range" | "日付範囲が不正です" |
| `range` + `from`/`to` | Mutually exclusive | "Use either range preset or custom dates, not both" | "プリセット期間と日付範囲は同時に指定できません" |
| `page` | Integer ≥ 1 | "Invalid page number" | "ページ番号が不正です" |
| `limit` | Integer 1–100 | "Invalid limit" | "件数指定が不正です" |
| `reportType` | Must be `monthly/yearly` | "Invalid report type" | "レポート種別が不正です" |
| `period` | Format `YYYY` or `YYYY-MM` | "Invalid period format" | "期間の形式が不正です" |

### 8.2 Order Status Validation

> **Out of scope** — these rules are enforced by the Order Management / Fulfillment module (§6.4). They are listed here only because they define which `orders.status` values this subsystem can observe.

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `status` (body) | Must be a valid next state (BR-SA-016) | "Invalid status transition" | "不正なステータス遷移です" |
| `status` (body) | Cannot transition from `done` | "Order is already completed" | "注文はすでに完了しています" |

### 8.3 Validation Enforcement Layers

1. **Frontend (Client)**: React Hook Form + Zod schema validation on all analytics query inputs (range presets, custom dates, pagination, sort, report query).
2. **Backend (Server)**: NestJS ValidationPipe + class-validator DTOs on all `/analytics/*` endpoints.
3. **Database (PostgreSQL)**: `order_statuses` lookup table as the source of truth for valid status values (consumed read-only by this subsystem).

---

## 9. Error Handling Specification

### 9.1 Error Response Structure

```json
{
  "statusCode": 409,
  "message": ["Invalid status transition"],
  "error": "Conflict",
  "timestamp": "2026-08-14T12:00:00.000Z",
  "path": "/api/v1/orders/clx1234567890/status"
}
```

### 9.2 Error Classification Table — Sales & Analytics

| HTTP Status | Error Code | Scenario | User-Facing Behavior |
|-------------|------------|----------|---------------------|
| `400` | `BAD_REQUEST` | Invalid range/date/period/query params | Field-level inline errors + top banner |
| `401` | `UNAUTHORIZED` | Missing or invalid JWT | Redirect to login |
| `403` | `FORBIDDEN` | Non-merchant/admin role, or merchant accessing another merchant's data | "You don't have permission to view this data" |
| `404` | `NOT_FOUND` | Order `:id` not found *(raised by Order Management / Fulfillment module — not reachable from analytics screens)* | "Order not found" with refresh option |
| `409` | `INVALID_STATUS_TRANSITION` | Non-forward order status change *(raised by Order Management / Fulfillment module — not reachable from analytics screens)* | "Invalid status transition" with the status badge unchanged |
| `422` | `UNPROCESSABLE_ENTITY` | Invalid report period combination | "Invalid report parameters" |
| `429` | `TOO_MANY_REQUESTS` | Rate limit exceeded | "Too many requests. Please wait {seconds} seconds" |
| `500` | `INTERNAL_SERVER_ERROR` | Aggregation/DB failure | "Something went wrong. Please try again" |

### 9.3 Frontend Error Display Behavior

- **Chart/Loading**: Skeleton shimmer during fetch; error state with retry button.
- **Empty Data**: Zero-filled charts and `0`/`—` KPI placeholders (BR-SA-025), never an error.
- **Order Status Errors**: Not reachable from analytics screens (status is read-only); if a stale `409` surfaces on refresh, the badge is re-rendered from the server response.
- **Toast Notifications**: Used for API errors and successful exports.
- **Export Failures**: CSV export errors surfaced as a toast; export is client-side so data is always current view.

---

## 10. Permission and Access Control

### 10.1 Authentication Requirements

- All Sales & Analytics endpoints require a valid JWT Bearer Token via the `Authorization` header. There are **no public endpoints** in this subsystem.
- Role-based access per Requirement Spec permission matrix: `buyer` has no access to dashboard/analytics; `merchant` and `admin` have access to merchant dashboard/analytics; `admin` only for admin analytics.

### 10.2 Protected Endpoints

| Endpoint | Access Level | Description |
|----------|-------------|-------------|
| `GET /analytics/merchant/dashboard` | Protected (Merchant, Admin) | Merchant dashboard KPIs |
| `GET /analytics/merchant/sales` | Protected (Merchant, Admin) | Sales trend data |
| `GET /analytics/merchant/products` | Protected (Merchant, Admin) | Product performance & best-sellers |
| `GET /analytics/merchant/demographics` | Protected (Merchant, Admin) | Customer demographics |
| `GET /orders` | Protected (Merchant, Admin) | Merchant order list (read-only) |
| `PATCH /orders/:id/status` | Protected (Merchant, Admin) | Update order status — **owned by Order Management / Fulfillment module (out of scope)** |
| `GET /analytics/admin/dashboard` | Protected (Admin) | Platform dashboard |
| `GET /analytics/admin/revenue` | Protected (Admin) | Sales reports / category & merchant performance |
| `GET /analytics/admin/users` | Protected (Admin) | User growth analytics |

### 10.3 Role-Based Access

| Role | Merchant Dashboard | Merchant Analytics | Order List (Read) | Order Status Update | Admin Dashboard | Admin Reports |
|------|:------------------:|:------------------:|:-----------------:|:-------------------:|:---------------:|:-------------:|
| `buyer` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `merchant` | ✓ | ✓ | ✓ (own orders) | ✓ (own orders) * | ✗ | ✗ |
| `admin` | ✓ | ✓ | ✓ (platform) | ✓ (platform) * | ✓ | ✓ |

> \* Order status update access applies to the **Order Management / Fulfillment module** (§6.4, out of scope). The Order List column within this subsystem is read-only display only.

### 10.4 Ownership & Data Scoping

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('merchant', 'admin')
@Controller('analytics/merchant')
export class MerchantAnalyticsController {
  // GET /dashboard, GET /sales, GET /products, GET /demographics
  //   merchant  -> aggregates scoped to order_items.merchant_id = current user (BR-SA-001)
  //   admin     -> no merchant scoping (BR-SA-002); admin has no shop and sees nothing
  //                unless orders/products are selected via a merchant filter
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('analytics/admin')
export class AdminAnalyticsController {
  // GET /dashboard, GET /revenue, GET /users  (admin only)
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('merchant', 'admin')
@Controller('orders')
export class MerchantOrdersController {
  // GET /         -> read-only order list: merchant: orders containing own items; admin: all
  // PATCH /:id/status -> OUT OF SCOPE: owned by Order Management / Fulfillment module (§6.4)
  //   merchant  -> 403 unless the order contains an item owned by the caller (BR-SA-017)
  //   admin     -> allowed, bypasses merchant ownership (admin inherits merchant features,
  //                REQUIREMENT_SPEC §2); forward-transition rule (BR-SA-016) still applies
}
```

Merchant queries MUST always be scoped by `order_items.merchant_id` and/or `products.merchant_id` — never by trusting the client to pass a merchant id. This scoping applies to all **read** queries in this subsystem. The ownership check for order status **updates** (a merchant attempting to update another merchant's order → `403 Forbidden`, with admin exempt per BR-SA-017) is enforced by the **Order Management / Fulfillment module** (out of scope).

### 10.5 Security Audit Logging

| Event | Data Logged | Retention |
|-------|-------------|-----------|
| `DASHBOARD_VIEWED` | userId, role, range, timestamp | 90 days |
| `ANALYTICS_QUERY` | userId, role, endpoint, range, timestamp | 90 days |
| `ORDER_STATUS_UPDATED` | orderId, actorId (merchantId or adminId), fromStatus, toStatus, timestamp — **logged by Order Management / Fulfillment module** | 90 days |
| `REPORT_EXPORTED` | adminId, reportType, period, timestamp | 90 days |

---

## 11. Real-Time Notification Behavior

### 11.1 Current Implementation

The Sales & Analytics screens do not require WebSocket connections. Dashboard and analytics data is fetched on navigation and on time-range change via standard query invalidation (TanStack Query). Status updates (and the resulting cache invalidation) are initiated by the Order Management / Fulfillment module.

### 11.2 Refresh Triggers

| Event | Trigger | Effect |
|-------|---------|--------|
| Order status updated | `PATCH /orders/:id/status` succeeds *(initiated by Order Management / Fulfillment module)* | KPI cache invalidated; order list + KPIs refetch |
| Time range changed | User switches 7d/30d/90d/1y | Chart + KPI refetch with new window |
| Manual refresh | Refresh button clicked | Full refetch of the active view |
| Route focus | Returning to a dashboard route | Stale-time query refetch (default 5 min staleTime) |

### 11.3 Pending Actions (Admin Dashboard)

Pending action counts (merchant approvals, review moderation, content reports) are read-only aggregates fetched with the admin dashboard; they refresh on dashboard load. No push notification is implemented in this version.

---

## 12. Screen Transition Specification

### 12.1 Inbound Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| Merchant sidebar | `/merchant/dashboard` | Click "Dashboard" |
| Merchant dashboard | `/merchant/analytics` | Click "Analytics" or "View All" in best-sellers |
| Merchant dashboard | `/merchant/products` | Click "Manage Products" |
| Admin sidebar | `/admin/dashboard` | Click "Dashboard" |
| Admin dashboard | `/admin/analytics` | Click "Analytics" or a report quick link |
| Any protected route (unauthenticated) | `/login` | No valid access token |
| Any route (buyer role) | `/unauthorized` | `buyer` role attempting dashboard/analytics |

### 12.2 Internal Navigation

| Source | Target | Trigger |
|--------|--------|---------|
| Dashboard order list row | Order detail (`/orders/:id`) — **Order Management / Fulfillment module screen** | Click order number |
| Best-sellers card | Product Performance tab | Click "View All" |
| Admin dashboard revenue chart | Admin Analytics → Sales Report | Click chart / "View Reports" |

### 12.3 Outbound Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| Merchant analytics | `/merchant/products/:id/edit` | Click a product in performance table |
| Admin analytics | `/admin/merchants` | Click a merchant in ranking table |

### 12.4 Error Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| Any dashboard/analytics page | `/login` | 401 Unauthorized |
| Any dashboard/analytics page | `/unauthorized` | 403 Forbidden (role-based or cross-merchant data access) |
| Any dashboard/analytics page | Current page + toast | 404 / 409 / 422 / 429 (inline handling, no redirect) |

---

## 13. Non-Functional Considerations

### 13.1 Performance Requirements

| Metric | Target |
|--------|--------|
| Dashboard Page Load | ≤ 2 seconds |
| KPI Aggregation API | ≤ 500 ms (cache hit) / ≤ 1.5 s (cache miss) |
| Trend Chart API | ≤ 1.5 s |
| Product Performance API | ≤ 1.5 s |
| Order Status Update API | ≤ 500 ms — *owned by Order Management / Fulfillment module (out of scope)* |
| Admin Report API | ≤ 2 s |
| CSV Export (client-side) | ≤ 1 s for 1,000 rows |

### 13.2 Caching Strategy

| Cache Key | TTL | Invalidation Trigger |
|-----------|-----|---------------------|
| `cache:sa:merchant:{userId}:kpis` | 5 min | Order status update *(initiated by Order Management / Fulfillment module)* / refresh |
| `cache:sa:admin:dashboard` | 5 min | Manual refresh |

### 13.3 Charting

| Requirement | Description |
|-------------|-------------|
| Library | Recharts (or equivalent) |
| Interactivity | Hover tooltips; click to drill down |
| Colors | Luxury Purple (#7C3AED) primary series; Beauty Pink (#EC4899) accent; purple gradient fills for revenue |
| Responsive | Charts resize to container width (desktop/tablet/mobile) |

### 13.4 Responsive Design Requirements

| Breakpoint | Layout |
|------------|--------|
| Desktop (≥ 1024px) | 4-column KPI cards, full-width charts, sidebar |
| Tablet (768px – 1023px) | 2-column KPI cards, stacked charts |
| Mobile (< 768px) | 1-column KPI cards, horizontal-scroll tables |

### 13.5 Accessibility Requirements

| Requirement | Implementation |
|-------------|---------------|
| WCAG 2.1 AA | Semantic HTML, ARIA labels on all interactive elements |
| Keyboard Navigation | Tab order through KPI cards, charts, tables, and pagination controls |
| Screen Reader | ARIA labels for status badges and chart fallback text |
| Color Contrast | Minimum 4.5:1 for text, 3:1 for UI components |
| Focus Indicators | Visible focus ring on all interactive elements |

---

## 14. Configurable Items (External Definitions)

Defined via `.env` configuration:

| Definition Key | Default Value | Description |
|----------------|---------------|-------------|
| `SA_DEFAULT_RANGE` | `30d` | Default time range preset |
| `SA_DASHBOARD_CACHE_TTL_SECONDS` | `300` | Dashboard KPI cache TTL (5 min) |
| `SA_ORDER_LIST_PAGE_SIZE` | `10` | Recent orders page size |
| `SA_TABLE_PAGE_SIZE` | `20` | Default table page size |
| `SA_TABLE_MAX_PAGE_SIZE` | `100` | Maximum table page size |
| `SA_BEST_SELLER_LIMIT` | `5` | Best-seller card item count |
| `SA_REPORT_MAX_ROWS` | `1000` | Max report rows for CSV export |

---

## 15. Cross-Reference Traceability Matrix

### 15.1 Requirements Definition Traceability

| Requirement ID | Requirement Description | Covered By (This Document) |
|----------------|-------------------------|----------------------------|
| M-DASH-001 | Merchant can view daily/monthly sales overview | UC-SA-002, BR-SA-012~015, §5.1 (EL-SA-11), §6.2 |
| M-DASH-002 | Merchant can view order list | UC-SA-004, §5.1 (EL-SA-12, EL-SA-14~16), §6.4 (GET /orders, read-only) |
| M-DASH-003 | Merchant can update order status | UC-SA-005, §3.1/§3.2, BR-SA-016~018, §6.4 — **implemented by Order Management / Fulfillment module (out of scope)** |
| M-DASH-004 | Merchant can view best-selling products ranking | UC-SA-006, BR-SA-010, §5.1 (EL-SA-17/18), §6.3 |
| M-DASH-005 | Dashboard shows key metrics: total sales, orders, avg order value | UC-SA-001, BR-SA-005~009, §5.1 (EL-SA-06~09), §6.1 |
| M-ANAL-001 | Merchant can view sales trends (charts) | UC-SA-003, BR-SA-012~015, §5.2 (EL-SA-23~25), §6.2 |
| M-ANAL-002 | Merchant can view product performance (views, sales) | UC-SA-007, BR-SA-011, §5.2 (EL-SA-26~28), §6.3 |
| M-ANAL-003 | Merchant can view customer demographics | UC-SA-008, BR-SA-026, §5.2 (EL-SA-29~32), §6.5 |
| A-ANAL-001 | Admin can view platform-wide dashboard | UC-SA-009, §5.3, §6.6 |
| A-ANAL-002 | Admin can view user growth analytics | UC-SA-010, BR-SA-022, §5.3 (EL-SA-47), §6.8 |
| A-ANAL-003 | Admin can view sales reports (monthly/yearly) | UC-SA-011, BR-SA-019~021, §5.4 (EL-SA-54~56), §6.7 |
| A-ANAL-004 | Admin can view category performance | UC-SA-012, §5.4 (EL-SA-52/57), §6.7 |
| A-ANAL-005 | Admin can view merchant performance | UC-SA-013, §5.4 (EL-SA-53/58), §6.8 |

### 15.2 Database Design Traceability

| Database Table | Relevant Functional Operations |
|----------------|-------------------------------|
| `orders` | KPI aggregation (SELECT by created_at/status), order list (SELECT, read-only), report rows (SELECT GROUP BY period), demographics (SELECT shipping_address). Status UPDATE is performed by the Order Management / Fulfillment module (out of scope) |
| `order_items` | Total sales / units sold aggregation (SELECT SUM by merchant_id via `idx_order_items_merchant_id`), ownership scoping |
| `products` | Rating KPI (SELECT avg_rating), product performance (SELECT join), best-sellers |
| `users` | User growth analytics (SELECT by created_at/role), merchant performance (SELECT join) |
| `shops` | Admin pending actions (SELECT is_approved = false), merchant list for reports |
| `reviews` | Pending review counts for admin dashboard pending actions |
| `order_statuses` | Valid status values source of truth |

### 15.3 Related Document References

| Document ID | Document Name | File Path |
|-------------|---------------|-----------|
| SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` |
| SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` |
| SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` |

---

## 16. Shared Schema & Cross-Screen Considerations

This section documents schema and behavior shared with other subsystems. It is the cross-reference target for schema-gap notes raised in other functional specs (e.g. SKM-FDS-AD-001 BR-AD-042).

### 16.1 Shared Tables

| Table | Consumed By | Usage in Sales & Analytics |
|-------|-------------|----------------------------|
| `orders` | Sales Dashboard, Checkout, Order History | Revenue KPIs, order list, reports |
| `order_items` | Sales Dashboard, Checkout | Merchant-scoped sales aggregation |
| `products` | Product Management, Product Detail | Product performance, rating KPI |
| `shops` | Shop Profile, Advertisement Management | Merchant identification, admin pending actions |
| `reviews` | Review Moderation, Product Detail | Pending review counts |
| `users` | SignUp/Login, Admin Management | User growth, merchant identity |

### 16.2 Order Status Enum Shared

`order_statuses` (pending, confirmed, processing, delivered, done) is shared by Checkout (creates `pending`), Order History (displays), and Order Management / Fulfillment (advances status). Sales & Analytics consumes it **read-only** for KPI recognition (BR-SA-006) and order list display. Any change to the enum MUST be coordinated across these subsystems.

### 16.3 Payment Status Enum Shared

`orders.payment_status` (pending, completed, failed) is written by Checkout and read by admin sales reports (BR-SA-019 counts only `completed`). Changing payment semantics affects reported revenue.

### 16.4 products.avg_rating / review_count Shared

`avg_rating`/`review_count` are denormalized on `products` by the Review subsystem. Sales & Analytics reads them read-only (BR-SA-009, §7.6). Re-computation must remain the Review subsystem's responsibility.

### 16.5 shop.is_approved Shared

`shops.is_approved` gates the Advertisement Management screen (BR-AD-040~043 in SKM-FDS-AD-001) and is used by admin pending-action counts in this spec (§5.3 EL-SA-45). Admin Dashboard counts `is_approved = false` shops as "pending merchant approvals" — a heuristic that cannot distinguish pending from rejected (see §16.7).

### 16.6 Aggregation Source of Truth

KPI and report figures in this spec are computed at query time from `orders`/`order_items`. No denormalized revenue/KPI tables exist. If a future version introduces an analytics materialization (e.g. daily rollup table), it MUST be flagged here and kept consistent with BR-SA-005/006/019 definitions.

### 16.7 shops.is_approved Boolean Limitation (Pending vs Rejected)

**Status:** Documented limitation, no schema change in this version.

`shops.is_approved` is a boolean (DATABASE_SPEC §3.9) and therefore **cannot distinguish** a shop awaiting review (pending) from a shop declined after review (rejected). Additionally, `shops` has no `rejection_reason` field (unlike `advertisements.rejection_reason`).

Consequences today:
1. **Advertisement Management** (SKM-FDS-AD-001 BR-AD-041/042): a merchant whose shop is not approved is redirected to the Home Page; pending vs rejected both collapse to `is_approved = false` and receive identical treatment.
2. **Admin Dashboard pending actions** (this spec, §5.3 EL-SA-45): "merchant approvals pending" counts all `is_approved = false` shops, which overstates true pending work by including rejected shops.

Recommendation for a future schema version:
- Replace the boolean with an enum `approval_status` (`pending`/`approved`/`rejected`) on `shops`, mirroring `advertisements.approval_status`.
- Add `shops.rejection_reason` (VARCHAR, nullable) for declined shops.
- Update BR-AD-040~043, the admin pending-action query (§6.6 step 3), and any merchant-facing redirect logic (SKM-FDS-AD-001 §12) accordingly.

Impacted documents: SKM-FDS-AD-001 (BR-AD-042), this document (§5.3, §6.6, §16.5).

### 16.8 Change Coordination

Any change to `order_statuses`, `orders.payment_status`, `products.avg_rating`, or `shops.is_approved` MUST be reviewed against: SKM-FDS-AD-001 (Advertisement Management), the Checkout/Order-History functional specs, the Review functional spec, and this document.

---

*End of Functional Specification (Sales & Analytics)*
