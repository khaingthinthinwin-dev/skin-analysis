# Screen Items Specification (画面項目設計書) — Sales & Analytics

**Document ID:** SKM-SIS-SA-001  
**Target Screen:** Merchant Sales Dashboard (`/merchant/dashboard`), Merchant Analytics (`/merchant/analytics`), Admin Dashboard (`/admin/dashboard`), Admin Analytics & Reports (`/admin/analytics`)  
**Subsystem:** Sales Dashboard & Analytics  
**Function ID:** FN-SA-001, FN-SA-002, FN-SA-003  
**Version:** 1.0  
**Created:** 2026-08-14  
**Last Updated:** 2026-08-14  
**Author:** Software Architect  
**Review Status:** Draft (レビュー中)  
**Classification:** Internal — Engineering Division

---

## 1. Document Control (ドキュメント管理)

### 1.1 Document Revision History

| Version | Date | Author | Description of Changes |
| :--- | :--- | :--- | :--- |
| 1.0 | 2026-08-14 | Software Architect | Initial release. Screen items specification for the Sales & Analytics subsystem (Merchant Sales Dashboard, Merchant Analytics, Admin Dashboard, Admin Analytics & Reports), aligned with SKM-FDS-SA-001 v1.0 and the `orders`, `order_items`, `products`, `users`, `shops`, and `reviews` tables in SKM-DBS-001 v1.0. |
| 1.1 | 2026-08-14 | Software Architect | Aligned with SKM-FDS-SA-001 revision — order status update marked out of scope (Order Management / Fulfillment module ownership); removed EL-SA-13 status dropdown; corrected EL-SA-04 element ID to match FDS. |

### 1.2 Related Documents

| No. | Document ID | Document Name | File Path | Remarks |
| :-- | :--- | :--- | :--- | :--- |
| 1 | SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | M-DASH-001~005, M-ANAL-001~003, A-ANAL-001~005, API endpoints, permission matrix. |
| 2 | SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | `orders`, `order_items`, `products`, `users`, `shops`, `reviews` tables and indexes. |
| 3 | SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | Merchant/Admin Dashboard Design (§9.4/§9.5), design tokens (§9.6), RBAC. |
| 4 | SKM-FDS-SA-001 | Functional Specification — Sales & Analytics | `docs/screen/Sales_And_Analytics/機能設計書_Sales_And_Analytics.md` | Use cases, business rules, validation rules, error handling. |

---

## 2. Screen Overview & Purpose (画面概要・目的)

### 2.1 Purpose (目的)
The Sales & Analytics screens provide merchants with a consolidated overview of their shop's sales, orders, product performance, and customer demographics, and provide administrators with platform-wide KPIs, sales reports, user growth, and category/merchant performance analytics.

### 2.2 Target Users & Roles (対象ユーザーと権限)

| Attribute | Value |
| :--- | :--- |
| **Primary Actors** | Merchant (views own shop's dashboard/analytics), Admin (views platform-wide dashboard and analytics) |
| **Required Authentication** | JWT Bearer Token for all endpoints (no public access) |
| **Data Scope** | Merchant: own shop's order items and products only. Admin: platform-wide data. |
| **Access Control** | Merchant routes protected with `JwtAuthGuard` + `RolesGuard` (`merchant`/`admin`); admin routes restricted to `admin` role |

> **Scope note:** order status is displayed **read-only** in these screens. Status updates (`PATCH /orders/:id/status`) are owned by the **Order Management / Fulfillment module** (out of scope); this document covers analytics data consumption only.

### 2.3 Core Functions & Basic Design Principles (主要機能・基本設計方針)
1. **Dashboard KPI** — Total sales, orders, average order value, and average rating with trend deltas.
2. **Sales Trend Chart** — Revenue and order count over selectable time ranges (7d/30d/90d/1y) with Recharts.
3. **Order List (Read-Only)** — Recent orders table with read-only status badges; status updates are performed in the Order Management / Fulfillment module screens.
4. **Best-Selling Products** — Top-selling products ranking by units and revenue.
5. **Product Performance** — Sortable/paginated table of per-product units, revenue, views, and rating.
6. **Customer Demographics** — Anonymized location/gender/age breakdowns from shipping address data.
7. **Admin Platform Dashboard** — Users/merchants/orders/revenue KPIs plus pending-action alerts.
8. **Admin Sales Reports** — Monthly/yearly report table with client-side CSV export.
9. **Category & Merchant Performance** — Revenue share by category and merchant revenue ranking.
10. **Internationalization** — Full i18n support for EN, JA, MY.
11. **Responsive Design** — Mobile-first card grid; tables scroll horizontally on small screens.
12. **Empty/Loading States** — Skeletons, zero-filled charts, and `0`/`—` placeholders instead of errors.

---

## 3. Screen Layout (画面レイアウト構成)

### 3.1 Overall Page Structure (全体画面構成)

#### Merchant Sales Dashboard Page Layout (`/merchant/dashboard`)
```text
+-------------------------------------------------------------+
|                    BROWSER VIEWPORT                          |
+-------------------------------------------------------------+
|                                                             |
|  +-------------------------------------------------------+  |
|  |   [A] PAGE HEADER & CONTROLS                          |  |
|  |   [A1] Title "Sales Dashboard"      [A4] Refresh       |  |
|  |   [A2] Subtitle                                        |  |
|  |   [A3] Time Range Selector 7d|30d|90d|1y [A3a] Custom |  |
|  +-------------------------------------------------------+  |
|                                                             |
|  +----------+ +----------+ +----------+ +----------+       |
|  | [B1]     | | [B2]     | | [B3]     | | [B4]     |       |
|  | Total    | | Orders   | | Avg Order| | Avg      |       |
|  | Sales    | |          | | Value    | | Rating   |       |
|  | $5,740   | | 127      | | $45.20   | | 4.7★     |       |
|  | +12.5%   | | +8.2%    | | +4.0%    | | +0.2     |       |
|  +----------+ +----------+ +----------+ +----------+       |
|                                                             |
|  +-------------------------------------------------------+  |
|  | [C] SALES TREND CHART                                 |  |
|  |  Line/Bar chart (Recharts), last 30 days              |  |
|  +-------------------------------------------------------+  |
|                                                             |
|  +-------------------------------------+ +---------------+  |
|  | [D] RECENT ORDERS TABLE             | | [E] BEST-      | |
|  | Order# | Customer | Amount | Status | | SELLERS CARD   | |
|  | #1001  | John D.  | $89.99 | Done   | | 1. Serum A     | |
|  | #1000  | Jane S.  | $34.50 | [D3] Pending| | | 2. Toner B     | |
|  | [D4] Page 1 of 3 · 12 orders [D5][D6]| | [E2] View All  | |
|  +-------------------------------------+ +---------------+  |
+-------------------------------------------------------------+
```

#### Merchant Analytics Page Layout (`/merchant/analytics`)
```text
+-------------------------------------------------------------+
|  [A] PAGE HEADER                                            |
|  [A1] Title "Analytics"                                     |
|  [A2] Time Range Selector 7d|30d|90d|1y                     |
+-------------------------------------------------------------+
|  [B] TABS                                                   |
|  [B1] Sales Trends | [B2] Product Performance | [B3] Demographics |
+-------------------------------------------------------------+
|  TAB 1 - SALES TRENDS                                      |
|  [C1] Daily | Monthly  toggle                               |
|  [C2] Sales Trend Chart (dual axis: revenue + orders)        |
|  [C3] Comparison Chart (current vs previous period)         |
+-------------------------------------------------------------+
|  TAB 2 - PRODUCT PERFORMANCE                               |
|  [D1] Product | Units | Revenue | Views | Rating | Sort ▾   |
|  [D2] Serum A  | 320   | $5,740 | 2,100 | 4.8    |          |
|  [D2] Toner B  | 210   | $3,120 | 1,450 | 4.5    |          |
|  [D3] Page 1 of 5 · 98 products                            |
+-------------------------------------------------------------+
|  TAB 3 - DEMOGRAPHICS                                      |
|  [E1] Location Donut | [E2] Gender Bar | [E3] Age Bar       |
|  [E4] No-Data Note (when source data unavailable)           |
+-------------------------------------------------------------+
```

#### Admin Dashboard Page Layout (`/admin/dashboard`)
```text
+-------------------------------------------------------------+
|  [A] PAGE HEADER                                            |
|  [A1] Title "Admin Dashboard"     [A4] Time Range Selector  |
+-------------------------------------------------------------+
|  +----------+ +----------+ +----------+ +----------+       |
|  | [B1]     | | [B2]     | | [B3]     | | [B4]     |       |
|  | Users    | | Merchants| | Orders   | | Revenue  |       |
|  | 1,247    | | 42       | | 3,891    | | $127K    |       |
|  | +12%     | | +3       | | +8%      | | +15%     |       |
|  +----------+ +----------+ +----------+ +----------+       |
+-------------------------------------------------------------+
|  [C] PENDING ACTIONS                                        |
|  [C1] 5 merchant approvals pending                          |
|  [C2] 12 reviews to moderate                                |
|  [C3] 2 content reports                                     |
+-------------------------------------------------------------+
|  +-------------------------------------+ +---------------+  |
|  | [D] REVENUE CHART (dual axis)       | | [E] USER       | |
|  |     purple gradient fill            | | GROWTH CHART   | |
|  +-------------------------------------+ | (by role)      | |
|                                         +---------------+  |
+-------------------------------------------------------------+
```

#### Admin Analytics & Reports Page Layout (`/admin/analytics`)
```text
+-------------------------------------------------------------+
|  [A] PAGE HEADER                                            |
|  [A1] Title "Analytics & Reports"                           |
+-------------------------------------------------------------+
|  [B] TABS                                                   |
|  [B1] Sales Report | [B2] Category Perf. | [B3] Merchant Perf. |
+-------------------------------------------------------------+
|  TAB 1 - SALES REPORT                                      |
|  [C1] Monthly | Yearly  toggle   [C2] Export CSV             |
|  [C3] Period | Orders | Gross | Net Revenue                  |
|  [C4] 2026-08 | 1,250 | $92,000 | $87,400                   |
|  [C4] 2026-07 | 1,180 | $88,500 | $84,075                   |
+-------------------------------------------------------------+
|  TAB 2 - CATEGORY PERFORMANCE                              |
|  [D1] Category Revenue Bar/Donut Chart                       |
|  [D2] Category | Orders | Revenue | Share %                  |
+-------------------------------------------------------------+
|  TAB 3 - MERCHANT PERFORMANCE                              |
|  [E1] Merchant | Shop | Orders | Revenue                     |
|  [E2] Acme Cosmetics | ... | 1,050 | $32,000                 |
|  [E3] Page 1 of 8 · 42 merchants                            |
+-------------------------------------------------------------+
```

---

## 4. Screen Elements Detail (画面要素詳細)

### 4.1 Merchant Sales Dashboard (`/merchant/dashboard`)

#### 4.1.1 Header & Controls

| Element ID | Element Name | Element Type | i18n Key | Required | Layout | Description / Behavior |
| :-- | :-- | :-- | :-- | :--: | :-- | :-- |
| EL-SA-01 | Page Title | Heading (h5) | `merchant.dashboard.title` | Y | A1 | "Sales Dashboard" |
| EL-SA-02 | Page Subtitle | Text | `merchant.dashboard.subtitle` | N | A2 | "Track your shop's sales, orders, and performance." |
| EL-SA-03 | Time Range Selector | Button Group / Select | `common.timeRange` | Y | A3 | Presets 7d / 30d / 90d / 1y. Default `30d`. On change refetch KPIs and chart. |
| EL-SA-04 | Custom Date Range | Date Range Picker | `merchant.dashboard.customRange` | N | A3a | Optional from/to. Overrides preset; mutually exclusive (BR-SA-012). |
| EL-SA-05 | Refresh Button | Button (ghost, icon) | `common.refresh` | N | A4 | Refetch active view (skips cache for KPI endpoint). |

#### 4.1.2 KPI Cards

| Element ID | Element Name | Element Type | i18n Key | Required | Layout | Description / Behavior |
| :-- | :-- | :-- | :-- | :--: | :-- | :-- |
| EL-SA-06 | Total Sales Card | Card | `merchant.dashboard.totalSales` | Y | B1 | Big number (currency, 2 decimals) + trend indicator (arrow + percent) on Soft Lavender (#F3E8FF) background. |
| EL-SA-07 | Orders Card | Card | `merchant.dashboard.orders` | Y | B2 | Order count + trend indicator. |
| EL-SA-08 | Avg Order Value Card | Card | `merchant.dashboard.aov` | Y | B3 | Total sales / orders + trend indicator. `0.00` when no orders. |
| EL-SA-09 | Avg Rating Card | Card | `merchant.dashboard.rating` | Y | B4 | Average rating (1 decimal) + star icon. `—` when no products. |

#### 4.1.3 Sales Trend Chart

| Element ID | Element Name | Element Type | i18n Key | Required | Layout | Description / Behavior |
| :-- | :-- | :-- | :-- | :--: | :-- | :-- |
| EL-SA-10 | Sales Trend Chart | Line/Bar Chart | `merchant.dashboard.salesTrend` | Y | C | Recharts. Revenue series in Luxury Purple (#7C3AED). Hover tooltip. Granularity auto (daily ≤30d / weekly 90d / monthly 1y). |

#### 4.1.4 Recent Orders Table

| Element ID | Element Name | Element Type | i18n Key | Required | Layout | Description / Behavior |
| :-- | :-- | :-- | :-- | :--: | :-- | :-- |
| EL-SA-12 | Recent Orders Table | Table | `merchant.dashboard.recentOrders` | Y | D | Columns: Order #, Customer, Amount, Status. Sorted newest first, 10 per page. Status column is **read-only** display. |
| EL-SA-14 | Status Badge | Badge | — | Y | D3 | The only status-related element on this screen. Read-only display of order status, color-coded per §5.2 (pending amber, confirmed blue, processing purple, delivered green, done gray). |
| EL-SA-15 | Page Info | Text | `common.pageInfo` | Y | D4 | "Page 1 of 3 · 12 orders". |
| EL-SA-16 | Prev / Next Buttons | Buttons | `common.prev` / `common.next` | Y | D5/D6 | Pagination controls; prev disabled on page 1, next disabled on last page. |

> Order status is displayed read-only. Status updates are performed in the Order Management / Fulfillment module (out of scope).

#### 4.1.5 Best-Selling Products

| Element ID | Element Name | Element Type | i18n Key | Required | Layout | Description / Behavior |
| :-- | :-- | :-- | :-- | :--: | :-- | :-- |
| EL-SA-17 | Best-Selling Products Card | Card/List | `merchant.dashboard.bestSellers` | Y | E | Top 5 products by units sold with revenue and rank badge. |
| EL-SA-18 | View All Link | Link | `merchant.analytics.products` | N | E2 | Navigate to Analytics → Product Performance. |

### 4.2 Merchant Analytics (`/merchant/analytics`)

#### 4.2.1 Tabs

| Element ID | Element Name | Element Type | i18n Key | Required | Layout | Description / Behavior |
| :-- | :-- | :-- | :-- | :--: | :-- | :-- |
| EL-SA-20 | Sales Trends Tab | Tab | `merchant.analytics.salesTrends` | Y | B1 | Default active tab. |
| EL-SA-21 | Product Performance Tab | Tab | `merchant.analytics.products` | Y | B2 | |
| EL-SA-22 | Demographics Tab | Tab | `merchant.analytics.demographics` | Y | B3 | |

#### 4.2.2 Sales Trends Tab

| Element ID | Element Name | Element Type | i18n Key | Required | Layout | Description / Behavior |
| :-- | :-- | :-- | :-- | :--: | :-- | :-- |
| EL-SA-23 | Sales Trend Chart | Chart | `merchant.analytics.salesTrend` | Y | C2 | Dual-axis: revenue (purple) + order count (accent). |
| EL-SA-24 | Daily/Monthly Toggle | Button Group | `merchant.analytics.period` | Y | C1 | Daily (≤30d) / Monthly aggregation. |
| EL-SA-25 | Comparison Chart | Chart | `merchant.analytics.compare` | N | C3 | Current vs previous period overlay (dashed). |

#### 4.2.3 Product Performance Tab

| Element ID | Element Name | Element Type | i18n Key | Required | Layout | Description / Behavior |
| :-- | :-- | :-- | :-- | :--: | :-- | :-- |
| EL-SA-26 | Product Performance Table | Table | `merchant.analytics.productTable` | Y | D1 | Columns: Product, Category, Units Sold, Revenue, Views, Avg Rating. 20 per page. |
| EL-SA-27 | Sort Controls | Column Headers | `common.sort` | N | D1 | Sortable by revenue / units / views / rating, asc/desc. |
| EL-SA-28 | Pagination | Control | `common.pageInfo` | Y | D3 | Page info + prev/next. |

#### 4.2.4 Demographics Tab

| Element ID | Element Name | Element Type | i18n Key | Required | Layout | Description / Behavior |
| :-- | :-- | :-- | :-- | :--: | :-- | :-- |
| EL-SA-29 | Location Breakdown | Donut Chart | `merchant.analytics.location` | Y | E1 | Buyers by region/city from `shipping_address`. |
| EL-SA-30 | Gender Breakdown | Bar Chart | `merchant.analytics.gender` | N | E2 | Anonymized gender distribution when available. |
| EL-SA-31 | Age Breakdown | Bar Chart | `merchant.analytics.age` | N | E3 | Anonymized age bands. |
| EL-SA-32 | No-Data Note | Text | `merchant.analytics.noData` | N | E4 | Illustrated note when demographic source data is unavailable. |

### 4.3 Admin Dashboard (`/admin/dashboard`)

| Element ID | Element Name | Element Type | i18n Key | Required | Layout | Description / Behavior |
| :-- | :-- | :-- | :-- | :--: | :-- | :-- |
| EL-SA-40 | Page Title | Heading (h5) | `admin.dashboard.title` | Y | A1 | "Admin Dashboard" |
| EL-SA-41 | Total Users Card | Card | `admin.dashboard.totalUsers` | Y | B1 | Registered users + trend. |
| EL-SA-42 | Merchants Card | Card | `admin.dashboard.merchants` | Y | B2 | Registered merchants + trend. |
| EL-SA-43 | Orders Card | Card | `admin.dashboard.orders` | Y | B3 | Total orders + trend. |
| EL-SA-44 | Revenue Card | Card | `admin.dashboard.revenue` | Y | B4 | Platform revenue + trend. |
| EL-SA-45 | Pending Actions Panel | Card/List | `admin.dashboard.pendingActions` | Y | C | Alert badges (Beauty Pink #EC4899): merchant approvals (shops `is_approved=false`), reviews to moderate, content reports. |
| EL-SA-46 | Revenue Chart | Dual-axis Chart | `admin.dashboard.revenueChart` | Y | D | Revenue trend, purple gradient fill. |
| EL-SA-47 | User Growth Chart | Chart | `admin.dashboard.userGrowth` | Y | E | Signups over time, stacked by role. |
| EL-SA-48 | Time Range Selector | Select | `common.timeRange` | Y | A4 | 7d/30d/90d/1y, default 30d. |

### 4.4 Admin Analytics & Reports (`/admin/analytics`)

| Element ID | Element Name | Element Type | i18n Key | Required | Layout | Description / Behavior |
| :-- | :-- | :-- | :-- | :--: | :-- | :-- |
| EL-SA-50 | Page Title | Heading (h5) | `admin.analytics.title` | Y | A1 | "Analytics & Reports" |
| EL-SA-51 | Sales Report Tab | Tab | `admin.analytics.salesReport` | Y | B1 | Default active tab. |
| EL-SA-52 | Category Performance Tab | Tab | `admin.analytics.categories` | Y | B2 | |
| EL-SA-53 | Merchant Performance Tab | Tab | `admin.analytics.merchants` | Y | B3 | |
| EL-SA-54 | Report Type Toggle | Button Group | `admin.analytics.reportType` | Y | C1 | Monthly / Yearly. Default monthly. |
| EL-SA-55 | Report Table | Table | `admin.analytics.reportTable` | Y | C3 | Columns: Period, Orders, Gross Sales, Net Revenue. |
| EL-SA-56 | Export CSV Button | Button (outline) | `admin.analytics.export` | N | C2 | Client-side CSV export of current view (max SA_REPORT_MAX_ROWS rows). |
| EL-SA-57 | Category Chart | Bar/Donut Chart | `admin.analytics.categoryChart` | Y | D1 | Revenue share by category. |
| EL-SA-58 | Merchant Ranking Table | Table | `admin.analytics.merchantTable` | Y | E1 | Merchant, Shop, Orders, Revenue. Sorted revenue DESC, 20 per page. |

---

## 5. Element State Specifications (要素状態仕様)

### 5.1 Common States (共通状態)

| State | Description |
| :-- | :-- |
| Loading | Skeleton shimmer for KPI cards and tables; chart placeholder during fetch. |
| Empty | Zero-filled charts; `0`/`—` on KPI cards; illustrated empty state with the data scope note. |
| Error | Error message with Retry button (no hardcoded text; uses i18n key). |
| Disabled | Not applicable to analytics screens (read-only; no inline status control). |

### 5.2 Status Badge Colors

| Order Status | Badge Color |
| :-- | :-- |
| pending | Warning Amber (#F59E0B) |
| confirmed | Blue |
| processing | Luxury Purple (#7C3AED) |
| delivered | Success Green (#22C55E) |
| done | Gray |

### 5.3 KPI Trend Indicator

| Indicator | Display |
| :-- | :-- |
| Increase | Green up arrow + percent (e.g. `↑ 12.5%`) |
| Decrease | Red down arrow + percent (e.g. `↓ 3.2%`) |
| No data | `—` |
| Previous period comparison | Computed per BR-SA-024. |

---

## 6. Interaction Specification (操作仕様)

| # | Action | Element | Behavior |
| :-: | :-- | :-- | :-- |
| 1 | Change time range | EL-SA-03 / EL-SA-48 | Refetch KPIs and chart with new window. Cache TTL respected for KPI endpoint. |
| 2 | Refresh | EL-SA-05 | Refetch active view (bypass KPI cache). |
| 3 | Sort product table | EL-SA-27 | Toggle sort field/direction; refetch table (page resets to 1). |
| 4 | Paginate | EL-SA-16 / EL-SA-28 / EL-SA-58 | Prev/next updates page query; data refetch. |
| 5 | Switch analytics tab | EL-SA-20/21/22 | Tab state persisted locally; data fetched on first activation only. |
| 6 | Toggle report type | EL-SA-54 | Refetch report table for monthly/yearly. |
| 7 | Export CSV | EL-SA-56 | Generate CSV from current report view; download; toast on success/error. |
| 8 | Drill down | Charts | Click chart point → navigate (revenue chart → Sales Report; product → product edit; merchant → `/admin/merchants`). |

---

## 7. Data Fields & Mapping (データ項目・マッピング)

### 7.1 Merchant Dashboard KPI Mapping

| Element | DTO Field | Data Source |
| :-- | :-- | :-- |
| EL-SA-06 | `kpis.totalSales` | `SUM(order_items.total_price)` per BR-SA-005/006 |
| EL-SA-06 | `kpis.totalSalesDelta` | Previous-period comparison |
| EL-SA-07 | `kpis.orderCount` | `COUNT(DISTINCT orders.id)` per BR-SA-007 |
| EL-SA-08 | `kpis.avgOrderValue` | `totalSales / orderCount` per BR-SA-008 |
| EL-SA-09 | `kpis.avgRating` | `AVG(products.avg_rating)` per BR-SA-009 |

### 7.2 Recent Orders Table Mapping

| Element | DTO Field | Data Source |
| :-- | :-- | :-- |
| EL-SA-12 | `orders[].id` | `orders.id` |
| EL-SA-12 | `orders[].customerName` | Buyer `users.name` (via `orders.user_id`) |
| EL-SA-12 | `orders[].amount` | `orders.total` |
| EL-SA-14 | `orders[].status` | `orders.status` (mapped through `order_statuses`; read-only badge) |

### 7.3 Product Performance Mapping

| Element | DTO Field | Data Source |
| :-- | :-- | :-- |
| EL-SA-26 | `productPerformance[].name` | `products.name` |
| EL-SA-26 | `productPerformance[].unitsSold` | `SUM(order_items.quantity)` |
| EL-SA-26 | `productPerformance[].revenue` | `SUM(order_items.total_price)` |
| EL-SA-26 | `productPerformance[].views` | `product_views` counter (0 when unavailable) |
| EL-SA-26 | `productPerformance[].avgRating` | `products.avg_rating` |

### 7.4 Admin Report Mapping

| Element | DTO Field | Data Source |
| :-- | :-- | :-- |
| EL-SA-55 | `reports[].period` | Bucket label (e.g. `2026-08` / `2026`) |
| EL-SA-55 | `reports[].orderCount` | `COUNT(DISTINCT orders.id)` (paid) |
| EL-SA-55 | `reports[].grossSales` | `SUM(orders.total)` |
| EL-SA-55 | `reports[].netRevenue` | `grossSales - commission/fees` |

---

## 8. Validation Rules (入力バリデーション)

### 8.1 Client-Side (Zod)

| Element | Rule |
| :-- | :-- |
| EL-SA-04 | `from`/`to` are valid dates; `to ≥ from`; cannot combine with preset range. |
| EL-SA-54 | `reportType` ∈ monthly/yearly. |

### 8.2 Server-Side (class-validator)

| Parameter | Rule |
| :-- | :-- |
| `range` | `@IsIn(['7d','30d','90d','1y'])`, optional, default `30d` |
| `from` / `to` | `@IsDateString()`, optional, mutually exclusive with `range` |
| `page` / `limit` | `@IsInt()`, `page ≥ 1`, `limit` 1–100 |
| `sortBy` | `@IsIn(['revenue','units','views','rating'])` |
| `order` | `@IsIn(['asc','desc'])` |
| `reportType` | `@IsIn(['monthly','yearly'])` |
| `period` | `@Matches(/^\d{4}(-\d{2})?$/)` |
| `status` (body) | `@IsIn(['confirmed','processing','delivered','done'])` + forward-transition service check (409) — Out of scope: enforced by Order Management / Fulfillment module. Listed for data-dependency reference only. |

---

## 9. Error / Empty / Loading States (エラー・空・読み込み状態)

| State | Screen(s) | Display |
| :-- | :-- | :-- |
| Loading | All | Skeleton shimmer cards; chart skeleton; disabled controls. |
| Empty data | Dashboard / Analytics | KPI `0`/`—`; zero-filled chart; empty-state illustration "No sales in this period yet". |
| API error | All | Error alert with Retry; no partial data mixing. |
| 401 | All | Redirect to `/login`. |
| 403 | All | Redirect to `/unauthorized` + message. |
| 409 (status) | Dashboard | Not reachable from this screen set (status is read-only); a stale `409` on refresh re-renders the badge from the server response. |
| 404 | Dashboard | Not reachable from analytics screens (order-`:id` operations are owned by Order Management / Fulfillment module). |
| Export failure | Admin Analytics | Toast with error; no data loss. |

---

## 10. Internationalization (国際化)

| Text Group | i18n Keys |
| :-- | :-- |
| Merchant Dashboard | `merchant.dashboard.*` (title, subtitle, customRange, totalSales, orders, aov, rating, salesTrend, salesOverview, recentOrders, bestSellers) |
| Merchant Analytics | `merchant.analytics.*` (salesTrends, products, demographics, period, compare, productTable, location, gender, age, noData) |
| Admin Dashboard | `admin.dashboard.*` (title, totalUsers, merchants, orders, revenue, pendingActions, revenueChart, userGrowth) |
| Admin Analytics | `admin.analytics.*` (title, salesReport, categories, merchants, reportType, reportTable, export, categoryChart, merchantTable) |
| Common | `common.*` (timeRange, refresh, pageInfo, prev, next, sort, cancel) |

---

## 11. Accessibility (アクセシビリティ)

| Requirement | Implementation |
| :-- | :-- |
| WCAG 2.1 AA | Semantic HTML; ARIA labels on KPI cards, status badges, charts. |
| Keyboard | Tab order through controls; chart data accessible via table fallback. |
| Screen reader | Status badges expose text via ARIA; charts provide `aria-label` + textual summary. |
| Contrast | Status badge colors meet 3:1 UI contrast on soft backgrounds. |
| Focus | Visible focus ring on all interactive elements (ring token `--ring`). |

---

## 12. Configurable Items (設定項目)

| Definition Key | Default | Element |
| :-- | :-- | :-- |
| `SA_DEFAULT_RANGE` | `30d` | EL-SA-03, EL-SA-48 |
| `SA_ORDER_LIST_PAGE_SIZE` | `10` | EL-SA-12 |
| `SA_TABLE_PAGE_SIZE` | `20` | EL-SA-26, EL-SA-58 |
| `SA_BEST_SELLER_LIMIT` | `5` | EL-SA-17 |
| `SA_REPORT_MAX_ROWS` | `1000` | EL-SA-56 |

---

*End of Screen Items Specification (Sales & Analytics)*
