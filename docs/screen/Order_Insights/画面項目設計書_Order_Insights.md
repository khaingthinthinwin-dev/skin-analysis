# Screen Items Specification (画面項目設計書) — Order Insights

**Document ID:** SKM-SIS-OI-001  
**Target Screen:** Buyer Order History, Buyer Order Detail, Buyer Order Tracking, Merchant Order Insights (Sales/Revenue Summary + Order List), Merchant Order Detail, Admin Order Insights (All Orders)  
**Subsystem:** Order Insights  
**Function ID:** FN-OI-001 (Buyer Order Insights), FN-OI-002 (Merchant Order Insights), FN-OI-003 (Admin Order Insights)  
**Version:** 1.1  
**Created:** 2026-08-26  
**Last Updated:** 2026-08-26  
**Author:** Senior System Engineer  
**Review Status:** Draft (For internal review)  
**Classification:** Internal — Engineering Division

---

## 1. Document Control (ドキュメント管理)

### 1.1 Document Revision History (文書改訂履歴)

| Version | Date | Author | Description of Changes |
| :--- | :--- | :--- | :--- |
| 1.0 | 2026-08-26 | Senior System Engineer | Initial release. Screen item specification for the Order Insights subsystem, aligned with SKM-FDS-OI-001 (機能設計書) v2.0 §5 Screen Specifications and §7 Input/Output Specification. |
| 1.1 | 2026-08-26 | Senior System Engineer | **Restructured to fully match the house template `画面項目設計書_Commission_&_Revenue.md`.** Added an ASCII box-diagram Layout per screen using local `[A]`/`[B]`/`[C]` section letters (restarting per layout); converted every item table to the same 10-column format with EL-OI-xx retained as a "Maps to (EL-OI)" cross-reference column; added §5 Item Behaviors, §6 Validation & Error Message Mapping (from FDS §8/§9), §7 Database Fields Mapping (from FDS §15.2), §8 API Response Mapping (from FDS §7), §9 i18n Keys, §10 Shared Components, §11 Special UI Notes, §12 Testing Checklist. Cross-checked Screen 5 (Merchant Order Detail) against the new `Design_Photos/merchant-order-detail.png` design. |

### 1.2 Related Documents (関連ドキュメント)

| No. | Document ID | Document Name | File Path | Remarks |
| :-- | :--- | :--- | :--- | :--- |
| 1 | SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | Business workflow, user roles, order management rules (§3.3, §4.5, §5.6, §6.4). |
| 2 | SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | Table structures with UUID PKs, Decimal types, JSONB `shipping_address`, FK relationships, constraints. |
| 3 | SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | Naming conventions, security rules, RBAC, error responses, design tokens. |
| 4 | SKM-FDS-OI-001 | Functional Specification — Order Insights | `docs/screen/Order_Insights/機能設計書_Order_Insights.md` | Use cases, business rules (BR-OI-xxx), screen specifications (§5), operations (§6), input/output DTO (§7), validation (§8), errors (§9), traceability (§15). |
| 5 | — | Design Reference — Order Insights | `docs/screen/Order_Insights/Design_Photos/` | Figma screenshots used for visual-layout cross-check (§11.1). |

---
## 2. Screen Overview & Purpose (画面概要・目的)

### 2.1 Purpose (目的)
The Order Insights subsystem gives each role a view of the orders that belong to it — and, for merchants only, the Sales and Revenue summaries derived from those orders. This document is the single specification for order history, order detail, and order tracking across all three roles. The subsystem is **fully read-only** (FDS §1.1): order status progression is owned by the Order Fulfillment module; none of the screens below mutate order data.

| Screen (Layout) | Route | Function ID | Primary Actors |
| :--- | :--- | :--- | :--- |
| Layout 1 — Buyer Order History | `/orders` | FN-OI-001 | Buyer |
| Layout 2 — Buyer Order Detail | `/orders/:id` | FN-OI-001 | Buyer |
| Layout 3 — Order Tracking | `/orders/:id/tracking` | FN-OI-001 | Buyer, Merchant, Admin (role-scoped) |
| Layout 4 — Merchant Order Insights | `/merchant/orders` | FN-OI-002 | Merchant, Admin |
| Layout 5 — Merchant Order Detail | `/merchant/orders/:id` | FN-OI-002 | Merchant |
| Layout 6 — Admin All Orders | `/admin/orders` | FN-OI-003 | Admin |

### 2.2 Target Users & Roles (対象ユーザーと権限)

| Attribute | Value |
| :--- | :--- |
| **Primary Actors** | Buyer (購入者), Merchant (販売者), Admin (管理者) |
| **Required Authentication** | JWT access token (buyer / merchant / admin role) |
| **Data Scope** | Orders owned by the caller — buyer → own orders; merchant → own-shop orders; admin → all platform orders (BR-OI-001) |
| **Access Control** | Owner scoping per BR-OI-001; merchant requires `license_status = 'approved'` (BR-OI-006, else 403); merchant/admin-only data rejected with 403 for other roles; `:id` ownership per BR-OI-008 |

### 2.3 Core Functions & Basic Design Principles (主要機能・基本設計方針)
1. **Role-scoped Order History** — Each role sees only its own scope of orders (BR-OI-001); customer name is projected for merchant/admin only (BR-OI-015).
2. **Order Detail** — Items, totals, payment status, shipping address, notes; customer-information block for merchant/admin only (BR-OI-015/033).
3. **Order Tracking Timeline** — 6-step stepper sourced from `order_statuses` ordered by `display_order` (BR-OI-013); unknown-history fallback per BR-OI-014.
4. **Merchant Sales Summary** — Today / This month / Completed order-count tiles (BR-OI-018).
5. **Merchant Revenue Summary** — Sales / Commission / Revenue / AOV returned **together** as one indivisible group (BR-OI-026); AOV is based on net Revenue, not gross Sales (BR-OI-025); commission-rate snapshot schema gap is managed per BR-OI-023/BR-OI-032.
6. **Combined Filters** — Status, date range, and (admin only) shop/merchant filters are AND-combined in SQL (BR-OI-016), never client-side.
7. **Read-Only Boundary** — No screen performs a status transition or writes order data; "Change Status" (EL-OI-57) navigates to Order Fulfillment only.
8. **PII Minimisation** — Customer contact / shipping details limited to fulfillment needs (BR-OI-033).
9. **Internationalization** — All labels are i18n keys resolved for EN / JA / MY (FDS §13.6).

---
## 3. Screen Layout (画面レイアウト構成)

### 3.1 Overall Page Structure (全体画面構成)

Each screen below is described with an ASCII box diagram using **local section letters `[A]`, `[B]`, `[C]`... that restart for every layout**. Element IDs inside the boxes are local UI identifiers; the FDS element IDs (`EL-OI-xx`) are kept as a cross-reference in the item tables in §4 — never reused as the primary item ID here.

---

#### Layout 1: Buyer Order History (`/orders`)

```text
┌──────────────────────────────────────────────────────────────┐
│                     BROWSER VIEWPORT                          │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [A] PAGE HEADER                                       │  │
│  │  h5 "My Orders" (lblPageTitle)                         │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [B] FILTER BAR                                        │  │
│  │  [B1] Status Filter (selFilterStatus)                  │  │
│  │  [B2] Date Range Picker (drpFilterDateRange)           │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [C] ORDER LIST TABLE (tblOrderList)                   │  │
│  │  Order # / Date / Items / Total / Payment / Status     │  │
│  │   • [C1] Status Badge (badgeOrderStatus) [row-level]   │  │
│  │   • [C2] Track Link (lnkTrack) [row-level]             │  │
│  │  [C3] Pagination (pgOrderList)                         │  │
│  └────────────────────────────────────────────────────────┘  │
│  [D] EMPTY STATE (emptyOrderList) — shown only when 0 rows  │
└──────────────────────────────────────────────────────────────┘
```

---

#### Layout 2: Buyer Order Detail (`/orders/:id`)

```text
┌──────────────────────────────────────────────────────────────┐
│                     BROWSER VIEWPORT                          │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [A] ORDER HEADER (cardOrderHeader)                    │  │
│  │  Order #  •  Date  •  Shop Name  •  [A1] Status Badge  │  │
│  │  (badgeStatus)                                         │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [B] ORDER ITEMS TABLE (tblOrderItems)                 │  │
│  │  Product / Qty / Unit Price / Line Total               │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [C] TOTALS PANEL (cardTotals)                         │  │
│  │  Subtotal  /  Discount (+coupon)  /  Total             │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [D] PAYMENT STATUS (cardPayment)                      │  │
│  │  Payment Method  •  [D1] Payment Badge (badgePayment)  │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [E] SHIPPING ADDRESS (cardShippingAddress)            │  │
│  └────────────────────────────────────────────────────────┘  │
│  [F] ORDER NOTES (txtOrderNotes) — hidden when null       │
│  [G] TRACK ORDER (btnTrackOrder)                          │
└──────────────────────────────────────────────────────────────┘
```

---

#### Layout 3: Order Tracking (`/orders/:id/tracking`) — Buyer / Merchant / Admin

```text
┌──────────────────────────────────────────────────────────────┐
│                     BROWSER VIEWPORT                          │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [A] ORDER REFERENCE (txtOrderReference)               │  │
│  │  Order #  •  Order Date                                │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [B] STATUS TIMELINE (stpTrackingTimeline)             │  │
│  │  Placed ─ Confirmed ─ Packed ─ Shipped ─               │  │
│  │  ─ Out for Delivery ─ Delivered                        │  │
│  │   • [B1] Step Timestamp (txtStepTimestamp) [r]         │  │
│  │   • [B2] Current Status Marker (mkrCurrentStep)        │  │
│  └────────────────────────────────────────────────────────┘  │
│  [C] DELIVERED BANNER (bannerDelivered) — shown when       │
│  status = 'delivered' (terminal)                           │
│  [D] NO-HISTORY NOTE (txtNoHistory) — historyAvailable=false│
│  [E] BACK TO DETAIL (lnkBackToDetail)                      │
└──────────────────────────────────────────────────────────────┘
```

---
#### Layout 4: Merchant Order Insights (`/merchant/orders`)

```text
┌──────────────────────────────────────────────────────────────┐
│                     BROWSER VIEWPORT                          │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [A] PAGE HEADER                                       │  │
│  │  h5 "Order Insights" (lblPageTitle)                    │  │
│  │  [A1] Scope Note (txtScopeNote)                        │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [B] SALES SUMMARY (grpSalesSummary)                   │  │
│  │  [B1] Today (tileTodayOrders)   [B2] This Month        │  │
│  │  (tileThisMonthOrders)  [B3] Completed (tileCompleted) │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [C] REVENUE SUMMARY (grpRevenueSummary)               │  │
│  │  [C1] Sales (statSales)  [C2] Commission               │  │
│  │  (statCommission)  [C3] Revenue (statRevenue)          │  │
│  │  [C4] AOV (statAov)  [C5] Order Count (txtOrderCount)  │  │
│  │  [C6] Rate Footnote (txtRateFootnote)                  │  │
│  │  [C7] Period Selector (tglPeriod)                      │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [D] OWN-SHOP ORDER LIST (tblMerchantOrderList)        │  │
│  │  [D1] Status Filter (selFilterStatus)  [D2] Date Range │  │
│  │  (drpFilterDateRange)                                  │  │
│  │  Order #/Date/Customer/Items/Total/Payment/Status      │  │
│  │  • [D3] Row Actions (lnkRowActions) [row-level]        │  │
│  │  [D4] Pagination (pgMerchantOrderList)                 │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

#### Layout 5: Merchant Order Detail (`/merchant/orders/:id`)

```text
┌──────────────────────────────────────────────────────────────┐
│                     BROWSER VIEWPORT                          │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [A] ORDER HEADER (cardOrderHeader)                    │  │
│  │  Order #  •  Date  •  [A1] Status Badge (badgeStatus)  │  │
│  │  [A2] Payment Status (badgePayment)                    │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [B] OWN-SHOP ITEMS TABLE (tblMerchantOrderItems)      │  │
│  │  Product / Qty / Unit Price / Line Total               │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [C] TOTALS PANEL (cardTotals)                         │  │
│  │  Subtotal  /  Discount (+coupon)  /  Total             │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [D] CUSTOMER INFORMATION (cardCustomerInfo)           │  │
│  │  Buyer Name / Email / Phone / Shipping Address         │  │
│  └────────────────────────────────────────────────────────┘  │
│  [E] ORDER NOTES (txtOrderNotes) — hidden when null       │
│  [F] TRACK ORDER (btnTrackOrder)                          │
│  [G] CHANGE STATUS (lnkChangeStatus) — nav to Fulfillment │
└──────────────────────────────────────────────────────────────┘
```

---

#### Layout 6: Admin All Orders (`/admin/orders`)

```text
┌──────────────────────────────────────────────────────────────┐
│                     BROWSER VIEWPORT                          │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [A] PAGE HEADER                                       │  │
│  │  h5 "All Orders" (lblPageTitle)                        │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [B] FILTER BAR                                        │  │
│  │  [B1] Shop/Merchant (selFilterShop)  [B2] Status       │  │
│  │  (selFilterStatus)  [B3] Date Range (drpFilterDateRange)│  │
│  │  [B4] Active Filter Chips (grpActiveFilters)           │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [C] RESULT COUNT (txtResultCount)                     │  │
│  │  "42 orders match the current filters"                 │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [D] ORDER LIST TABLE (tblAdminOrderList)              │  │
│  │  Order #/Date/Shop-Merchant/Buyer/Items/Total/Payment/Status│
│  │  • [D1] Row Actions (lnkRowActions) [row-level]        │  │
│  │  [D2] Pagination (pgAdminOrderList)                    │  │
│  └────────────────────────────────────────────────────────┘  │
│  [E] EMPTY STATE (emptyAdminOrderList) — 0 rows match      │
└──────────────────────────────────────────────────────────────┘
```

---
### 3.2 Responsive Layout Breakpoints (レスポンシブ対応)

| Breakpoint | Min Width | Layout Behavior |
| :--- | :--- | :--- |
| Mobile (default) | 0px | Filter bar stacks vertically; tables horizontally scrollable; summary tiles / stat group stack to one column; timeline full width. |
| Tablet (`md:`) | 768px | Two-column stat tiles; filter bar wraps; tables full width with horizontal scroll. |
| Desktop (`lg:`) | 1024px | Order-list rows show all columns; pagination right-aligned; Revenue Summary renders as a 4-stat row. |
| Wide (`xl:`) | 1280px | Full-width tables with enhanced spacing; admin filter bar single row. |

---

## 4. Item Definitions (画面項目定義)

Each layout below uses its own independent local section letters `[A]`, `[B]`, `[C]`... matching the box diagrams in §3.1. **Every item table uses the same 10 columns.** The FDS element IDs (`EL-OI-xx`) are retained in a dedicated cross-reference column and are **not** used as the primary item ID.

Legend for the **Required** column: `Yes` / `No` / `Cond.` (conditional) / `—` (UI-only container or hardcoded label) — values follow FDS §5 unless noted.

### 4.1 Layout 1: Buyer Order History (`/orders`)

#### Section [A]: Page Header (ページヘッダー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `lblPageTitle` | Page Title / ページタイトル | Heading (h5) | String | Yes | Visible. Text: "My Orders" | — | Hardcoded UI text | i18n key: `buyer.orders.title`. | EL-OI-01 |

#### Section [B]: Filter Bar (フィルターバー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `selFilterStatus` | Status Filter / ステータス絞り込み | Select | String | No | Default "All" | Options: All / placed / confirmed / packed / shipped / out_for_delivery / delivered | `order_statuses.status_code` | i18n key: `orders.filter.status`. Values = seeded `order_statuses` codes (BR-OI-011). | EL-OI-02 |
| 2 | `drpFilterDateRange` | Date Range Filter / 日付範囲絞り込み | Date Range Picker | Date × 2 | No | Empty (all dates) | ISO dates; `to ≥ from` | `orders.created_at` | i18n key: `orders.filter.dateRange`. Filter by order date. | EL-OI-03 |

#### Section [C]: Order List Table (注文リストテーブル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `tblOrderList` | Order List Table / 注文リストテーブル | Table | — | Yes | Loading skeleton; 20 rows/page; `createdAt DESC` | Columns: Order #, Date, Items, Total, Payment, Status | §7.4 order-history-row DTO (see §8.1) | i18n key: `orders.table`. Server-side pagination/sort (§8.1 validation). | EL-OI-04 |
| 2 | `badgeOrderStatus` | Status Badge / ステータスバッジ | Badge | VARCHAR(50) | Yes | One per row | One colour per status code | `order_statuses.status_name` | Colour-coded per BR-OI-031; i18n label. Row-level. | EL-OI-05 |
| 3 | `lnkTrack` | Track Link / 追跡リンク | Link / Button (ghost) | — | Yes | One per row | Navigates to `/orders/:id/tracking` | — | i18n key: `orders.track`. Row-level. | EL-OI-06 |
| 4 | `pgOrderList` | Pagination / ページネーション | Control | — | Yes | Page 1 of N; 20/page | Prev / Next; "Page 1 of 3 · 42 orders" | `meta` (page/limit/total) | i18n key: `common.pageInfo`. `page ≥ 1`, `limit` 1–100 (§8.1). | EL-OI-07 |

#### Section [D]: Empty State (空状態)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `emptyOrderList` | Empty State / 空状態 | Illustration + Text | — | Yes | Hidden by default; shown when 0 rows | Text: "You haven't placed any orders yet." + Browse Products CTA | — | i18n key: `orders.empty`. BR-OI-030 — empty is not an error. | EL-OI-08 |

> **Note (flagged):** The buyer history row DTO (§7.4) exposes **no** `customerName` / `shopName` columns for the buyer role — the buyer table must not render them.

---
### 4.2 Layout 2: Buyer Order Detail (`/orders/:id`)

#### Section [A]: Order Header (注文ヘッダー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `cardOrderHeader` | Order Header / 注文ヘッダー | Card | — | Yes | Visible | Order #, date, current status badge | `orders.id`, `orders.created_at`, `orders.status` | i18n key: `orders.detail.header`. | EL-OI-10 |
| 2 | `badgeStatus` | Status Badge / ステータスバッジ | Badge | VARCHAR(50) | Yes | Visible in header | One colour per status code | `order_statuses.status_name` | Colour-coded per BR-OI-031; i18n label. | EL-OI-10 (part of header) |
| 3 | `txtShopName` | Shop Name / ショップ名 | Text | String | Yes | Visible | Name only; merchant ID is not rendered | `shop.name` (`merchants.shop_name` via `orders.merchant_id`) | Buyer-visible per FDS §7.5. `shop.merchantId` remains admin-only. No EL-OI ID is defined for this output field. | — (FDS §7.5 field) |

#### Section [B]: Order Items Table (注文明細テーブル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `tblOrderItems` | Order Items Table / 注文明細テーブル | Table | UUID / INTEGER / DECIMAL(10,2) | Yes | Loading skeleton | Columns: Product, Qty, Unit Price, Line Total | `order_items` + `products.name` (§7.5 `items[]`) | i18n key: `orders.detail.items`. Prices frozen at order creation (BR-OI-017). | EL-OI-11 |

#### Section [C]: Totals Panel (合計パネル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `cardTotals` | Totals Panel / 合計パネル | Card | DECIMAL(10,2) / VARCHAR(50) | Yes | — | Rows: Subtotal, Discount (with coupon), **Total** | Subtotal (derived), `orders.discount_amount`, `orders.coupon_code`, `orders.total_amount` | i18n key: `orders.detail.totals`. **No shipping-fee row** — §7.5 exposes only `discountAmount`/`couponCode`/`totalAmount`. | EL-OI-12 |

#### Section [D]: Payment Status (支払ステータス)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `cardPayment` | Payment Status / 支払ステータス | Card | VARCHAR(50) / VARCHAR(20) | Yes | — | Payment Method + status badge | `orders.payment_method`, `orders.payment_status` | i18n key: `orders.detail.payment`. Status ∈ {pending, completed} (`chk_orders_payment_status`). | EL-OI-13 |

#### Section [E]: Shipping Address (配送先住所)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `cardShippingAddress` | Shipping Address / 配送先住所 | Card | JSONB | Yes | — | Formatted address block | `orders.shipping_address` (JSONB) | i18n key: `orders.detail.shipping`. | EL-OI-14 |

#### Section [F]: Order Notes (注文メモ)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `txtOrderNotes` | Order Notes / 注文メモ | Text | TEXT | No | Hidden when null | — | `orders.notes` | i18n key: `orders.detail.notes`. | EL-OI-15 |

#### Section [G]: Track Order (注文追跡ボタン)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `btnTrackOrder` | Track Order Button / 注文追跡ボタン | Button (primary) | — | Yes | Visible | Navigates to `/orders/:id/tracking` | — | i18n key: `orders.track`. | EL-OI-16 |

> **Note (flagged):** §7.5 order-detail DTO additionally carries `customer.*` (merchant/admin only, BR-OI-015/033) and `shop.name`/`shop.merchantId`. Buyer Order Detail renders `shop.name` only; `shop.merchantId` remains admin-only. Customer fields are rendered on Layouts 5/6, not on the buyer detail.

---
### 4.3 Layout 3: Order Tracking (注文追跡) — `/orders/:id/tracking` (Buyer / Merchant / Admin)

#### Section [A]: Order Reference (注文参照)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `txtOrderReference` | Order Reference / 注文参照 | Text | — | Yes | Visible | Order # + order date | `orders.id`, `orders.created_at` | i18n key: `orders.tracking.ref`. | EL-OI-20 |

#### Section [B]: Status Timeline (ステータスタイムライン)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `stpTrackingTimeline` | Status Timeline / ステータスタイムライン | Stepper (vertical) | — | Yes | Expanded; scroll current step into view | 6 steps in `display_order` | `order_statuses` (placed→…→delivered) | i18n key: `orders.tracking.timeline`. Steps from BR-OI-013. | EL-OI-21 |
| 2 | `txtStepTimestamp` | Step Timestamp / ステップタイムスタンプ | Text | — | Yes | One per reached step | Reached → ISO timestamp; unreached → blank | `order_status_history.created_at` | Row-level within the timeline. | EL-OI-22 |
| 3 | `mkrCurrentStep` | Current Status Highlight / 現在ステータス強調 | Marker | — | Yes | One per timeline | `done` / `current` / `upcoming` (§3.3) | Derived from `orders.status` vs. steps | `STEP_CURRENT` gets Luxury Purple `#7C3AED` marker. | EL-OI-23 |

#### Section [C]: Delivered Banner (配送完了確認)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `bannerDelivered` | Delivered Confirmation / 配送完了確認 | Banner | — | No | Hidden; shown when `status = 'delivered'` | Terminal-state banner | `orders.status` | i18n key: `orders.tracking.delivered`. Terminal state (`is_terminal_state`). | EL-OI-24 |

#### Section [D]: No-History Note (履歴不明注記)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `txtNoHistory` | No-History Note / 履歴不明注記 | Text | — | No | Hidden; shown when `historyAvailable = false` | — | Derived (`order_status_history` rows > 0) | i18n key: `orders.tracking.noHistory`. Per BR-OI-014. | EL-OI-25 |

#### Section [E]: Back to Detail (注文詳細へ戻る)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `lnkBackToDetail` | Back to Detail / 注文詳細へ戻る | Link | — | Yes | Visible | Navigates to the role-appropriate detail route | — | i18n key: `common.back`. | EL-OI-26 |

---
### 4.4 Layout 4: Merchant Order Insights (`/merchant/orders`)

**Access gate:** merchant with `license_status = 'approved'` (BR-OI-006, else 403) + admin. All summary endpoints are read-only and non-write.

#### Section [A]: Page Header (ページヘッダー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `lblPageTitle` | Page Title / ページタイトル | Heading (h5) | String | Yes | Text: "Order Insights" | — | Hardcoded UI text | i18n key: `merchant.orders.title`. Functional-spec omission: §5.4 defines no page-title element; flagged for the FDS owner to backfill. | — (FDS §5.4 omission) |
| 2 | `txtScopeNote` | Scope Note / スコープ注記 | Text (small) | — | Yes | "Showing orders for your shop only." (§6.4) | — | — | i18n key: `merchant.orders.scopeNote`. | EL-OI-47 |

#### Section [B]: Sales Summary (注文数タイル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `tileTodayOrders` | Today's Orders / 本日の注文タイル | Stat Tile | INTEGER | Yes | Loading skeleton | Integer count | `COUNT(orders)` where `created_at` = today | i18n key: `merchant.orders.today`. | EL-OI-30 |
| 2 | `tileThisMonthOrders` | This Month's Orders / 今月の注文タイル | Stat Tile | INTEGER | Yes | Loading skeleton | Integer count | `COUNT(orders)` where `created_at` in current month | i18n key: `merchant.orders.thisMonth`. | EL-OI-31 |
| 3 | `tileCompletedOrders` | Completed Orders / 完了注文タイル | Stat Tile | INTEGER | Yes | Loading skeleton | Integer count | `COUNT(orders)` where `status='delivered'` | i18n key: `merchant.orders.completed`. Terminal state (BR-OI-018). | EL-OI-32 |

> **Note (flagged):** EL-OI-33 is not defined in FDS §5.4.1 — numbering runs 30–32 → 34. Reproduced here as a gap; do not invent an element for it.

#### Section [C]: Revenue Summary (収益サマリー)

> **BR-OI-026:** The four figures (Sales / Commission / Revenue / AOV) are returned together by the API and must render as one indivisible group (`grpRevenueSummary`). Rendering EL-OI-37 alone is prohibited.

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `grpRevenueSummary` | Revenue Summary Group / 収益サマリーグループ | Card (single component) | — | Yes | Loading skeleton | Container for the 4 stats | `revenueSummary` DTO (§7.8) | i18n key: `merchant.revenue.title`. Indivisible (BR-OI-026). | EL-OI-34 |
| 2 | `statSales` | Sales / 売上 | Stat (currency) | DECIMAL(10,2) | Yes | Currency format | e.g. `$1,000.00` | `SUM(orders.total_amount)` | i18n key: `merchant.revenue.sales`. Gross paid by customers (BR-OI-021). | EL-OI-35 |
| 3 | `statCommission` | Commission / コミッション | Stat (currency) | DECIMAL(10,2) | Yes | Currency format | e.g. `$120.00` | `SUM(order.total_amount × rate)`, rate per BR-OI-022/023/028 | i18n key: `merchant.revenue.commission`. | EL-OI-36 |
| 4 | `statRevenue` | Revenue / 収益 | Stat (currency, emphasized) | DECIMAL(10,2) | Yes | Currency, emphasized | e.g. `$880.00` | `sales − commission` | i18n key: `merchant.revenue.net`. Net received (BR-OI-024). **Never standalone** (BR-OI-026). | EL-OI-37 |
| 5 | `statAov` | AOV / 平均注文額 | Stat (currency) | DECIMAL(10,2) | Yes | Currency format | e.g. `$88.00` | `revenue ÷ orderCount` — **net revenue, not gross sales** (BR-OI-025) | i18n key: `merchant.revenue.aov`. | EL-OI-38 |
| 6 | `txtOrderCount` | Order Count Caption / 注文数キャプション | Text | INTEGER | Yes | "Based on N orders" | Integer | `COUNT(orders)` same order set (BR-OI-027) | i18n key: `merchant.revenue.orderCount`. AOV denominator. | EL-OI-39 |
| 7 | `txtRateFootnote` | Commission Rate Footnote / コミッション率脚注 | Text (small) | UI-derived text | Yes | Shows rate + source note | Rate % + source | `commissionRate`, `commissionRateSource`, `commissionRateLocked` | i18n key: `merchant.revenue.rateNote`. Schema gap managed per BR-OI-023; render `—` when unlocked (BR-OI-032). | EL-OI-40 |
| 8 | `tglPeriod` | Period Selector / 期間セレクタ | Button Group | String (enum) | Yes | Default: This Month | today / this_month / last_month / custom | `period` query param | i18n key: `merchant.revenue.period`. `custom` requires `from`/`to` (§8.1). | EL-OI-41 |

---
#### Section [D]: Own-shop Order List (自ショップ注文リスト)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `tblMerchantOrderList` | Order List Table / 注文リストテーブル | Table | — | Yes | Loading skeleton; 20 rows/page; `createdAt DESC` | Columns: Order #, Date, **Customer**, Items, Total, Payment, Status | `orders` scoped to own `merchant_id`; §7.4 row DTO + `customerName` | i18n key: `merchant.orders.table`. `customerName` from `users.name` via `orders.buyer_id` (BR-OI-015). | EL-OI-42 |
| 2 | `selFilterStatus` | Status Filter / ステータス絞り込み | Select | String | No | Default "All" | placed…delivered enums | `order_statuses.status_code` | i18n key: `orders.filter.status`. | EL-OI-43 |
| 3 | `drpFilterDateRange` | Date Range Filter / 日付範囲絞り込み | Date Range Picker | Date × 2 | No | Empty (all dates) | ISO dates; `to ≥ from` | `orders.created_at` | i18n key: `orders.filter.dateRange`. | EL-OI-44 |
| 4 | `lnkRowActions` | Row Actions / 行アクション | Link Group | — | Yes | One per row | View Detail / Track | — | i18n keys: `common.view` / `orders.track`. Row-level. | EL-OI-45 |
| 5 | `pgMerchantOrderList` | Pagination / ページネーション | Control | — | Yes | Page 1 of N; 20/page | Prev / Next | `meta` | i18n key: `common.pageInfo`. | EL-OI-46 |

---
### 4.5 Layout 5: Merchant Order Detail (`/merchant/orders/:id`)

**Purpose:** View items + customer info for one of the merchant's own-shop orders (§4.5 / §5.5). Items are restricted to `order_items.merchant_id` = own. View is read-only.

#### Section [A]: Order Header (注文ヘッダー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `cardOrderHeader` | Order Header / 注文ヘッダー | Card | — | Yes | Visible | Order #, date, status badge, payment status | `orders.id`, `orders.created_at`, `orders.status`, `orders.payment_status` | i18n key: `orders.detail.header`. | EL-OI-50 |
| 2 | `badgeStatus` | Status Badge / ステータスバッジ | Badge | VARCHAR(50) | Yes | Visible; **read-only** | One colour per status | `order_statuses.status_name` | Status changes only in Order Fulfillment screens. | EL-OI-56 |

#### Section [B]: Own-shop Items Table (自ショップ注文明細テーブル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `tblMerchantOrderItems` | Order Items Table / 注文明細テーブル | Table | UUID / INTEGER / DECIMAL(10,2) | Yes | Loading skeleton | Columns: Product, Qty, Unit Price, Line Total | `order_items` where `merchant_id` = own; `products.name` | i18n key: `orders.detail.items`. Prices frozen (BR-OI-017). | EL-OI-51 |

#### Section [C]: Totals Panel (合計パネル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `cardTotals` | Totals Panel / 合計パネル | Card | DECIMAL(10,2) / VARCHAR(50) | Yes | — | Rows: Subtotal, Discount (with coupon code when present), Total | Subtotal (derived from own `order_items`), `orders.discount_amount`, `orders.coupon_code`, `orders.total_amount` | i18n key: `orders.detail.totals`. Discount amount is shown; coupon code is shown when present. No shipping-fee row. | EL-OI-52 |

---
#### Section [D]: Customer Information (顧客情報)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `cardCustomerInfo` | Customer Information / 顧客情報 | Card | String | Yes | — | Buyer name, contact, shipping address | `customer.name`, `customer.email`, `customer.phone` (via `orders.buyer_id` → `users`) + `orders.shipping_address` | i18n key: `merchant.orders.customer`. Merchant/admin only (BR-OI-015/033). | EL-OI-53 |

#### Section [E]: Order Notes (注文メモ)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `txtOrderNotes` | Order Notes / 注文メモ | Text | TEXT | No | Hidden when null | — | `orders.notes` | i18n key: `orders.detail.notes`. Customer note. | EL-OI-54 |

#### Section [F]: Track Order (注文追跡ボタン)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `btnTrackOrder` | Track Order Button / 注文追跡ボタン | Button | — | Yes | Visible | Navigates to `/merchant/orders/:id/tracking` | — | i18n key: `orders.track`. | EL-OI-55 |

#### Section [G]: Change Status (Change Status アクション)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `lnkChangeStatus` | Change Status Action / Change Status アクション | Link / Button | — | No | Visible | **Navigation only** to Order Fulfillment | — | i18n key: `orders.changeStatus`. No status-update API / state transition here (FDS §1.1). | EL-OI-57 |

> **Note (flagged):** §7.5 defines customer info as `customer.name`, `customer.email`, `customer.phone` (+ shipping address). Only these PII fields are asserted — do not infer additional customer fields beyond §7.5 / BR-OI-033.

---
### 4.6 Layout 6: Admin All Orders (`/admin/orders`)

**Purpose:** View all platform orders with shop/merchant, status, and date filters (§5.6). Covers order **visibility only** — platform revenue, commission config, payouts, and targets belong to the Revenue & Commission subsystem (Requirement Spec §5.7) and are out of scope.

#### Section [A]: Page Header (ページヘッダー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `lblPageTitle` | Page Title / ページタイトル | Heading (h5) | String | Yes | Text: "All Orders" | — | Hardcoded UI text | i18n key: `admin.orders.title`. | EL-OI-60 |

#### Section [B]: Filter Bar (フィルターバー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `selFilterShop` | Shop/Merchant Filter / ショップ／販売者絞り込み | Searchable Select | UUID | No | Default: none (all) | Filter by shop or merchant | `merchantId` / `shopId` (admin only) | i18n key: `admin.orders.filter.shop`. Non-admin → 403 (BR-OI-001/016). | EL-OI-61 |
| 2 | `selFilterStatus` | Status Filter / ステータス絞り込み | Select | String | No | Default "All" | placed…delivered enums | `order_statuses.status_code` | i18n key: `admin.orders.filter.status`. | EL-OI-62 |
| 3 | `drpFilterDateRange` | Date Range Filter / 日付範囲絞り込み | Date Range Picker | Date × 2 | No | Empty (all dates) | ISO dates; `to ≥ from` | `orders.created_at` | i18n key: `orders.filter.dateRange`. | EL-OI-63 |
| 4 | `grpActiveFilters` | Active Filter Chips / 適用絞り込みチップ | Chip Group | — | No | Shows applied filters | Individual clear per chip | — | i18n key: `common.filters`. | EL-OI-64 |

#### Section [C]: Result Count (結果件数)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `txtResultCount` | Result Count / 結果件数 | Text | — | Yes | "42 orders match the current filters" | Derived from `meta.total` | `meta` (total) | i18n key: `common.resultCount`. | EL-OI-66 |

#### Section [D]: Order List Table (注文リストテーブル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `tblAdminOrderList` | Order List Table / 注文リストテーブル | Table | — | Yes | Loading skeleton; 20 rows/page; `createdAt DESC` | Columns: Order #, Date, Shop/Merchant, Buyer, Items, Total, Payment, Status | §7.4 row DTO incl. `customerName` + `shopName` (`merchants.shop_name`) | i18n key: `admin.orders.table`. | EL-OI-65 |
| 2 | `lnkRowActions` | Row Actions / 行アクション | Link Group | — | Yes | One per row | View Detail / Track (any order) | — | i18n keys: `common.view` / `orders.track`. Row-level. | EL-OI-67 |
| 3 | `pgAdminOrderList` | Pagination / ページネーション | Control | — | Yes | Page 1 of N; 20/page | Prev / Next | `meta` | i18n key: `common.pageInfo`. | EL-OI-68 |

#### Section [E]: Empty State (空状態)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `emptyAdminOrderList` | Empty State / 空状態 | Illustration + Text | — | Yes | Hidden; shown when 0 rows match | "No orders match the current filters." + Clear Filters CTA | — | i18n key: `admin.orders.empty`. BR-OI-030. | EL-OI-69 |

---
## 5. Item Behaviors & Event Specifications (各項目における挙動・イベント仕様)

Derived from FDS §6 Functional Operation Specification. All screens are read-only; no behavior below mutates order data.

### 5.1 Order History Load (page mount / filter / page change) — Layouts 1, 4 [D], 6
- **Trigger:** Navigate to `/orders` (buyer), `/merchant/orders` (merchant), `/admin/orders` (admin); or change a filter / page.
- **RBAC Validation:** JWT role check; owner scoping (BR-OI-001); merchant license gate `license_status = 'approved'` else `403` (BR-OI-006); admin-only `merchantId`/`shopId` rejected with `403` for other roles.
- **Processing Logic:**
  1. Validate JWT; read role.
  2. Apply owner scoping — buyer → `orders.buyer_id = currentUser.id`; merchant → resolve `merchants.id` from `merchants.user_id`, then `orders.merchant_id = <id>`; admin → no owner filter.
  3. Apply optional `status`, `from`/`to`, and (admin only) `merchantId`/`shopId` filters in SQL (BR-OI-016).
  4. Sort (`createdAt DESC` default) and paginate (BR-OI-009/010).
  5. Project role-appropriate DTO (`customerName` for merchant/admin only, BR-OI-015).
  6. Render table; write `ORDER_LIST_VIEWED` audit event.
- **API Endpoint:** `GET /api/v1/orders?status=&from=&to=&page=1&limit=20&sort=createdAt&order=desc` (admin: `&merchantId=&shopId=`).
- **Exception Handling:**
  - `400 BAD_REQUEST`: invalid filter/page/sort — inline error on the offending control + top banner.
  - `401 UNAUTHORIZED`: redirect to login.
  - `403 FORBIDDEN`: license not approved / non-admin filter — redirect per FDS §12.1 (pending-approval / unauthorized).
  - `429 TOO_MANY_REQUESTS`: banner with retry-after seconds.
  - `500 INTERNAL_SERVER_ERROR`: destructive alert with retry.

### 5.2 Order Detail Load (row click / View) — Layouts 2, 5
- **Trigger:** Click an order row or "View" action.
- **Processing Logic:**
  1. Validate JWT and `:id` (UUID).
  2. Load order with `order_items` (join `products` for name/image).
  3. Verify ownership per BR-OI-008 — mismatch → `404` (indistinguishable from not-found).
  4. Merchant: restrict `order_items` to `merchant_id` = own.
  5. Project totals (`total_amount`, `discount_amount`, `coupon_code`) and `payment_status`.
  6. Attach customer-information block only for merchant/admin (BR-OI-015/033).
  7. Render detail; write `ORDER_DETAIL_VIEWED` audit event.
- **API Endpoint:** `GET /api/v1/orders/:id`.
- **Exception Handling:** `404 NOT_FOUND` → not-found panel with "Back to Orders" action; `401` → login redirect; `500` → alert with retry.

### 5.3 Order Tracking Load (Track click) — Layout 3
- **Trigger:** Click "Track" from a list row or the detail screen.
- **Processing Logic:**
  1. Validate JWT and `:id`.
  2. Load `order_statuses` all steps ordered by `display_order` (BR-OI-013).
  3. Left-join `order_status_history` for reached-step timestamps.
  4. Mark each step `done` / `current` / `upcoming` against `orders.status` (§3.3).
  5. If no history rows → single current step with `historyAvailable: false` (BR-OI-014).
  6. Render stepper; write `ORDER_TRACKING_VIEWED` audit event.
- **API Endpoint:** `GET /api/v1/orders/:id/tracking`.
- **Exception Handling:** `404` not-found panel; `500` alert with retry. Delivered banner shows only when `status='delivered'` (terminal).

### 5.4 Merchant Sales Summary Load — Layout 4 [B]
- **Trigger:** Load `/merchant/orders`; manual refresh.
- **Processing Logic:** Validate role + license gate → `COUNT(orders)` scoped to merchant for `todayCount` (created today), `thisMonthCount` (current month), `completedCount` (`status='delivered'`). Seed cache (TTL `OI_SUMMARY_CACHE_TTL_SECONDS`). Write `MERCHANT_SUMMARY_VIEWED` (sales).
- **API Endpoint:** `GET /api/v1/order-insights/merchant/sales-summary`.
- **Exception Handling:** `403` license gate; `500` alert with retry.

### 5.5 Merchant Revenue Summary Load / Period Change — Layout 4 [C]
- **Trigger:** Load `/merchant/orders`; change period selector (`tglPeriod`); manual refresh.
- **Processing Logic:**
  1. Validate role + license gate; resolve period window (UTC).
  2. In one aggregation over in-scope orders compute `orderCount`, `sales` (BR-OI-021), `commission` (BR-OI-022, rate per BR-OI-023, rounded per order BR-OI-028), `revenue = sales − commission` (BR-OI-024), `aov = revenue ÷ orderCount` (net — BR-OI-025).
  3. Attach `commissionRate`, `commissionRateSource`, `commissionRateLocked`.
  4. Return **all four figures together** (BR-OI-026); render the group with rate footnote.
- **API Endpoint:** `GET /api/v1/order-insights/merchant/revenue-summary?period=this_month` (or `from`/`to` for `period=custom`).
- **Exception Handling:**
  - `422 UNPROCESSABLE_ENTITY`: `period=custom` missing/invalid `from`/`to` — inline error.
  - `403` license gate; `500` alert with retry.
  - Unsupported metrics (unlocked rate) render `—` / footnote (BR-OI-032), not an error.

### 5.6 Admin Order List Filter Change — Layout 6
- **Trigger:** Select shop/merchant, status, or date range; clear a filter chip.
- **Processing Logic:** AND-combine filters in SQL (BR-OI-016); reset to page 1; refetch `GET /api/v1/orders` with `merchantId`/`shopId`; update `txtResultCount` and filter chips; write `ORDER_LIST_VIEWED`.
- **Exception Handling:** `400` invalid combination → inline; `403` (should not occur for admin) → unauthorized redirect; `500` alert with retry.

### 5.7 Empty / Loading / Error Display Behavior
- **Loading:** skeleton shimmer for tables, tiles, and timeline.
- **Empty data:** `0` / `—` placeholders and illustrated empty states (BR-OI-030) — never an error.
- **Cross-scope access:** `404` (BR-OI-008) renders standard not-found panel — never reveals another owner's order.
- **Unsupported metrics:** unlocked commission rate renders `—` + footnote (BR-OI-032).
- **Toast notifications:** transient API errors and retry outcomes.

---
## 6. Validation & Error Message Mapping (バリデーション及びエラーメッセージマッピング)

Derived from FDS §8 Input Validation Rules and §9 Error Handling Specification.

### 6.1 Client-Side (& Server) Validation Errors

| Error Code | Target Field / Item ID | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-OI-001** | `selFilterStatus` | `status` is not a valid `order_statuses.status_code` | Inline error on the select + top banner | "Invalid order status" | "注文ステータスが不正です" |
| **VAL-OI-002** | `drpFilterDateRange` | `from` / `to` not valid ISO dates, or `to < from` | Inline error on the date range picker | "Invalid date range" | "日付範囲が不正です" |
| **VAL-OI-003** | `pgOrderList` / `pgMerchantOrderList` / `pgAdminOrderList` | `page` is not an integer ≥ 1 | Inline error + banner | "Invalid page number" | "ページ番号が不正です" |
| **VAL-OI-004** | Pagination (limit) | `limit` not an integer in 1–100 | Inline error + banner | "Invalid limit" | "件数指定が不正です" |
| **VAL-OI-005** | Sort (column header) | `sort` / `order` not an allowed field/direction | Banner | "Invalid sort option" | "並び替えの指定が不正です" |
| **VAL-OI-006** | `tglPeriod` | `period` not in `today/this_month/last_month/custom` | Inline error on the period selector | "Invalid period" | "期間の指定が不正です" |
| **VAL-OI-007** | `tglPeriod` + `drpFilterDateRange` | `period=custom` without valid `from`/`to` | Inline error on the date picker | "Select a start and end date" | "開始日と終了日を選択してください" |
| **VAL-OI-008** | `selFilterShop` | Non-admin supplies `merchantId`/`shopId` (BR-OI-001) | Top banner + block | "You don't have permission to filter by merchant" | "この絞り込みを行う権限がありません" |
| **VAL-OI-009** | Route param `:id` | `:id` is not a valid UUID | Not-found panel | "Invalid order reference" | "注文の指定が不正です" |
| **VAL-OI-010** | Route param `:id` | `:id` outside caller's scope (BR-OI-008) | Not-found panel (deliberately indistinguishable) | "Order not found" | "注文が見つかりません" |

### 6.2 API Error Handling

| HTTP Status | Error Code | Scenario | User-Facing Behavior |
| :--- | :--- | :--- | :--- |
| `400` | `BAD_REQUEST` | Invalid status / date / period / pagination / sort parameter | Field-level inline error + top banner |
| `401` | `UNAUTHORIZED` | Missing or invalid JWT | Redirect to login |
| `403` | `FORBIDDEN` | Buyer requesting a merchant summary (BR-OI-005); merchant with `license_status ≠ 'approved'` (BR-OI-006); non-admin supplying `merchantId`/`shopId` | "You don't have permission to view this data" / "Your merchant account is not approved" |
| `404` | `NOT_FOUND` | Order does not exist **or** outside the caller's scope (BR-OI-008 — deliberately indistinguishable) | "Order not found" + Back to Orders action |
| `422` | `UNPROCESSABLE_ENTITY` | `period=custom` without a valid `from`/`to` pair | "Select a start and end date" |
| `429` | `TOO_MANY_REQUESTS` | Rate limit exceeded | "Too many requests. Please wait {seconds} seconds" |
| `500` | `INTERNAL_SERVER_ERROR` | Aggregation / DB failure | "Something went wrong. Please try again" |

---
## 7. Database Fields Mapping (データベースフィールドマッピング)

Derived from FDS §15.2 Database Design Traceability and DATABASE_SPEC v2.x column definitions. **All reads only — no writes.**

### 7.1 Order History List → Database

| Table Column | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- |
| Order # (row) | `id` | `orders` | UUID |
| Date | `created_at` | `orders` | TIMESTAMPTZ |
| Status (badge) | `status` → `status_name` | `orders` → `order_statuses` | VARCHAR(30) → VARCHAR(50) |
| Items count | `COUNT(order_items)` | `order_items` (aggregation) | INTEGER |
| Total | `total_amount` | `orders` | DECIMAL(10,2) |
| Payment status | `payment_status` | `orders` | VARCHAR(20) (pending/completed) |
| Customer name | `users.name` (via `orders.buyer_id`) | `users` | VARCHAR — merchant/admin only (BR-OI-015) |
| Shop name (admin) | `merchants.shop_name` (via `orders.merchant_id`) | `merchants` | VARCHAR — admin only |

### 7.2 Order Detail → Database

| Form/UI Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- |
| Product name | `products.name` (via `order_items.product_id`) | `products` | VARCHAR |
| Quantity | `quantity` | `order_items` | INTEGER |
| Unit price | `unit_price` | `order_items` | DECIMAL(10,2) (frozen — BR-OI-017) |
| Line total | `total_price` | `order_items` | DECIMAL(10,2) |
| Discount | `discount_amount` | `orders` | DECIMAL(10,2) |
| Coupon | `coupon_code` | `orders` | VARCHAR(50) |
| Total | `total_amount` | `orders` | DECIMAL(10,2) |
| Payment method / status | `payment_method` / `payment_status` | `orders` | VARCHAR(50) / VARCHAR(20) |
| Shipping address | `shipping_address` | `orders` | JSONB |
| Notes | `notes` | `orders` | TEXT |

### 7.3 Order Tracking → Database

| UI Element | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- |
| Step order / label | `display_order`, `status_name` | `order_statuses` | INTEGER / VARCHAR(50) |
| Reached timestamp | `created_at` | `order_status_history` | TIMESTAMPTZ |
| Terminal flag | `is_terminal_state` | `order_statuses` | BOOLEAN |

### 7.4 Sales Summary → Database

| KPI | Database Column / Formula | Table | Data Type |
| :--- | :--- | :--- | :--- |
| Today's orders | `COUNT(orders)` where `created_at` = today | `orders` (scoped to merchant) | INTEGER |
| This month's orders | `COUNT(orders)` where `created_at` in current month | `orders` (scoped) | INTEGER |
| Completed orders | `COUNT(orders)` where `status='delivered'` | `orders` (scoped) | INTEGER |

### 7.5 Revenue Summary → Database

| KPI | Database Column / Formula | Table | Data Type |
| :--- | :--- | :--- | :--- |
| Sales | `SUM(orders.total_amount)` | `orders` (scoped, in period) | DECIMAL(10,2) |
| Commission | `SUM(order.total_amount × rate)` — rate per BR-OI-022/023 | `orders` + `commission_settings` | DECIMAL(10,2) |
| Revenue | `sales − commission` | Derived | DECIMAL(10,2) |
| AOV | `revenue ÷ orderCount` (net — BR-OI-025) | Derived | DECIMAL(10,2) |
| Order count | `COUNT(orders)` (same set — BR-OI-027) | `orders` | INTEGER |
| Rate / source / locked | `commission_rate` (open schema gap), `commission_settings` | `commission_settings`, `orders` (pending column) | See BR-OI-023 |

### 7.6 Admin Filters → Database

| Filter | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- |
| Shop/Merchant | `merchants.id` / `shops.id` (`merchantId`/`shopId`) | `merchants` / `shops` | UUID — admin only |
| Status | `orders.status` | `orders` | VARCHAR(30) |
| Date range | `orders.created_at` | `orders` | TIMESTAMPTZ |

---
## 8. API Response Mapping (APIレスポンスマッピング)

Derived from FDS §7 Output Specification. List responses carry a `meta` block with `page`, `limit`, `total`.

### 8.1 Order List Success Response — `GET /api/v1/orders`

```json
{
  "orders": [
    {
      "id": "9f1c1a52-6f0e-4f6d-9a1e-2b5d3c7e8a10",
      "createdAt": "2026-08-21T09:30:00.000Z",
      "status": "shipped",
      "itemCount": 2,
      "totalAmount": "120.00",
      "paymentStatus": "completed",
      "customerName": "Aye Aye",
      "shopName": "Lotus Glow Shop"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 42 }
}
```

> `customerName` present for merchant/admin rows; `shopName` present for admin only (BR-OI-015). Buyer rows omit both.

### 8.2 Order Detail Success Response — `GET /api/v1/orders/:id`

```json
{
  "orderDetail": {
    "id": "9f1c1a52-6f0e-4f6d-9a1e-2b5d3c7e8a10",
    "createdAt": "2026-08-21T09:30:00.000Z",
    "status": "shipped",
    "items": [
      { "productName": "Vitamin C Serum", "quantity": 1, "unitPrice": "45.00", "totalPrice": "45.00" }
    ],
    "discountAmount": "5.00",
    "couponCode": "GLOW10",
    "totalAmount": "120.00",
    "paymentMethod": "credit_card",
    "paymentStatus": "completed",
    "shippingAddress": { "line1": "1 Main St", "city": "Yangon", "postalCode": "11111" },
    "notes": null,
    "customer": { "name": "Aye Aye", "email": "aye@example.com", "phone": "+959..." },
    "shop": { "name": "Lotus Glow Shop", "merchantId": "7c2d..." }
  }
}
```

> `customer` block is merchant/admin only (BR-OI-015/033); `shop` block is admin-only (buyer sees shop name). The merchant detail totals panel renders `discountAmount` and `couponCode` using the same §7.5 order-detail fields.

### 8.3 Order Tracking Success Response — `GET /api/v1/orders/:id/tracking`

```json
{
  "tracking": {
    "orderId": "9f1c1a52-6f0e-4f6d-9a1e-2b5d3c7e8a10",
    "currentStatus": "shipped",
    "historyAvailable": true,
    "steps": [
      { "statusCode": "placed", "statusName": "Placed", "displayOrder": 1, "state": "done", "reachedAt": "2026-08-21T09:30:00.000Z", "isTerminal": false },
      { "statusCode": "shipped", "statusName": "Shipped", "displayOrder": 4, "state": "current", "reachedAt": "2026-08-22T08:00:00.000Z", "isTerminal": false }
    ]
  }
}
```

### 8.4 Sales Summary Success Response — `GET /api/v1/order-insights/merchant/sales-summary`

```json
{
  "salesSummary": { "todayCount": 3, "thisMonthCount": 28, "completedCount": 112 }
}
```

### 8.5 Revenue Summary Success Response — `GET /api/v1/order-insights/merchant/revenue-summary`

```json
{
  "revenueSummary": {
    "sales": "1000.00",
    "commission": "120.00",
    "revenue": "880.00",
    "aov": "88.00",
    "orderCount": 10,
    "commissionRate": 12.00,
    "commissionRateSource": "current_settings",
    "commissionRateLocked": false,
    "period": { "code": "this_month", "from": "2026-08-01", "to": "2026-08-31" }
  }
}
```

### 8.6 Error Response Example — `404 NOT_FOUND`

```json
{
  "statusCode": 404,
  "message": ["Order not found"],
  "error": "Not Found",
  "timestamp": "2026-08-21T12:00:00.000Z",
  "path": "/api/v1/orders/9f1c1a52-6f0e-4f6d-9a1e-2b5d3c7e8a10"
}
```

### 8.7 Error Response Example — `403 FORBIDDEN`

```json
{
  "statusCode": 403,
  "message": ["Your merchant account is not approved"],
  "error": "Forbidden",
  "timestamp": "2026-08-21T12:00:00.000Z",
  "path": "/api/v1/order-insights/merchant/revenue-summary"
}
```

---
## 9. i18n Keys Reference (i18nキーリファレンス)

All keys below are resolved for EN / JA / MY (FDS §13.6). Order-status names and the four Revenue Summary labels are i18n-driven.

### 9.1 English (en) — Order Insights

| Key | Value |
| :--- | :--- |
| `buyer.orders.title` | "My Orders" |
| `orders.filter.status` | "Status" |
| `orders.filter.dateRange` | "Date Range" |
| `orders.table` | "Orders" |
| `orders.track` | "Track" |
| `orders.empty` | "You haven't placed any orders yet." |
| `orders.detail.header` | "Order Details" |
| `orders.detail.items` | "Items" |
| `orders.detail.totals` | "Order Summary" |
| `orders.detail.payment` | "Payment" |
| `orders.detail.shipping` | "Shipping Address" |
| `orders.detail.notes` | "Order Notes" |
| `orders.tracking.ref` | "Order Reference" |
| `orders.tracking.timeline` | "Order Status" |
| `orders.tracking.delivered` | "Your order has been delivered." |
| `orders.tracking.noHistory` | "Tracking history is unavailable for this order." |
| `orders.changeStatus` | "Change Status" |
| `merchant.orders.title` | "Order Insights" |
| `merchant.orders.scopeNote` | "Showing orders for your shop only." |
| `merchant.orders.today` | "Today" |
| `merchant.orders.thisMonth` | "This Month" |
| `merchant.orders.completed` | "Completed" |
| `merchant.orders.table` | "Shop Orders" |
| `merchant.orders.customer` | "Customer" |
| `merchant.revenue.title` | "Revenue Summary" |
| `merchant.revenue.sales` | "Sales" |
| `merchant.revenue.commission` | "Commission" |
| `merchant.revenue.net` | "Revenue" |
| `merchant.revenue.aov` | "Avg. Order Value" |
| `merchant.revenue.orderCount` | "Based on N orders" |
| `merchant.revenue.rateNote` | "Commission rate applied at order creation" |
| `merchant.revenue.period` | "Period" |
| `admin.orders.title` | "All Orders" |
| `admin.orders.filter.shop` | "Shop / Merchant" |
| `admin.orders.filter.status` | "Status" |
| `admin.orders.table` | "Orders" |
| `admin.orders.empty` | "No orders match the current filters." |
| `common.view` | "View" |
| `common.back` | "Back to Order" |
| `common.pageInfo` | "Page 1 of 3 · 42 orders" |
| `common.resultCount` | "42 orders match the current filters" |
| `common.filters` | "Filters" |

### 9.2 Japanese (ja) — Order Insights

| Key | Value |
| :--- | :--- |
| `buyer.orders.title` | "マイ注文" |
| `orders.filter.status` | "ステータス" |
| `orders.filter.dateRange` | "日付範囲" |
| `orders.track` | "追跡" |
| `orders.empty` | "ご注文はまだありません。" |
| `orders.detail.header` | "注文詳細" |
| `orders.detail.totals` | "注文サマリー" |
| `orders.tracking.timeline` | "注文ステータス" |
| `orders.tracking.delivered` | "商品はお届け済みです。" |
| `orders.tracking.noHistory` | "この注文の追跡履歴は利用できません。" |
| `merchant.orders.title` | "注文インサイト" |
| `merchant.orders.scopeNote` | "自ショップの注文のみ表示しています。" |
| `merchant.orders.today` | "本日" |
| `merchant.orders.thisMonth` | "今月" |
| `merchant.orders.completed` | "完了" |
| `merchant.orders.customer` | "顧客" |
| `merchant.revenue.title` | "収益サマリー" |
| `merchant.revenue.sales` | "売上" |
| `merchant.revenue.commission` | "コミッション" |
| `merchant.revenue.net` | "収益" |
| `merchant.revenue.aov` | "平均注文額" |
| `merchant.revenue.orderCount` | "N件の注文に基づく" |
| `merchant.revenue.rateNote` | "注文作成時のコミッション率を適用" |
| `merchant.revenue.period` | "期間" |
| `admin.orders.title` | "全注文" |
| `admin.orders.filter.shop` | "ショップ / 出品者" |
| `admin.orders.empty` | "条件に一致する注文がありません。" |
| `common.view` | "詳細" |
| `common.back` | "注文に戻る" |
| `common.resultCount` | "42件の注文が条件に一致します" |

### 9.3 Myanmar (my) — Order Insights

| Key | Value |
| :--- | :--- |
| `buyer.orders.title` | "ကျွန်ုပ်၏ မှာယူမှုများ" |
| `orders.filter.status` | "အခြေအနေ" |
| `orders.filter.dateRange` | "ရက်အပိုင်းအြား" |
| `orders.track` | "ခြေရာခံ" |
| `orders.empty` | "မှာယူမှု မရှိသေးပါ။" |
| `orders.detail.header` | "မှာယူမှုအသေးစိတ်" |
| `orders.tracking.timeline` | "မှာယူမှုအခြေအနေ" |
| `orders.tracking.delivered` | "သင့်ပစ္စည်း ပို့ဆောင်ပြီးပါပြီ။" |
| `merchant.orders.title` | "မှာယူမှု ခွဲခြမ်းစိတ်ဖြာချက်" |
| `merchant.orders.today` | "ယနေ့" |
| `merchant.orders.thisMonth` | "ဤလ" |
| `merchant.orders.completed` | "ပြီးစီး" |
| `merchant.revenue.title` | "ဝင်ငွေ အကျဉ်းချုပ်" |
| `merchant.revenue.sales` | "ရောင်းအား" |
| `merchant.revenue.commission` | "ကော်မရှင်" |
| `merchant.revenue.net` | "ဝင်ငွေ" |
| `merchant.revenue.aov` | "ပျမ်းမျှမှာယူမှုတန်ဖိုး" |
| `merchant.revenue.period` | "ကာလ" |
| `admin.orders.title` | "မှာယူမှုအားလုံး" |
| `admin.orders.empty` | "စစ်ထုတ်မှုနှင့် ကိုက်ညီသော မှာယူမှုမရှိပါ။" |
| `common.view` | "ကြည့်ရှုရန်" |
| `common.back` | "မှာယူမှုသို့ ပြန်သွားရန်" |

---

## 10. Shared Components (共有コンポーネント)

| Component | Used by | Notes |
| :--- | :--- | :--- |
| `StatusBadge` | Layouts 1, 2, 4 [D], 5, 6 | Colour-coding per BR-OI-031; i18n label from `order_statuses.status_name`. |
| `PaymentBadge` | Layouts 2, 5 | `pending` / `completed` (amber / green). |
| `DataTable` | Layouts 1, 2, 4 [D], 5, 6 | Skeleton loading; server-side pagination/sort; `meta` handling. |
| `VerticalStepper` | Layout 3 | Renders 6 steps; `done`/`current`/`upcoming`; culminating marker `#7C3AED`. |
| `EmptyState` | Layouts 1, 6 | Illustrated empty state + CTA (BR-OI-030). |
| `AlertBanner` | All layouts | Destructive / informational banner for errors (FDS §9). |
| `Skeleton` | All layouts | Shimmer placeholders while loading. |
| `Toast` | All layouts | Transient API error / retry notifications. |

---
## 11. Special UI Notes & Styling Constraints (特記事項・UI仕様)

### 11.1 Design Reference Cross-Check (デザイン参照の照合)

Each Figma screenshot in `docs/screen/Order_Insights/Design_Photos/` was cross-checked against FDS §5/§7. Screenshot mappings to layouts:

| Screenshot | Maps to | Cross-check result |
| :--- | :--- | :--- |
| `buyer order insight .png` | Layout 1 Buyer Order History | OK — elements match EL-OI-01..08. |
| `buyer order insight order detail.png` | Layout 2 Buyer Order Detail | OK — totals show Subtotal / Discount / Total (spec-backed via §7.5 `discountAmount`/`couponCode`/`totalAmount`). |
| `buyer order tracking.png` | Layout 3 Order Tracking | OK — elements match EL-OI-20..26. |
| `order insight merchant.png` | Layout 4 Merchant Order Insights | OK — Sales tiles, Revenue Summary group, own-shop list match EL-OI-30..47. |
| `admin-order-insights.png` | Layout 6 Admin All Orders | OK — elements match EL-OI-60..69. |
| `merchant-order-detail.png` | Layout 5 Merchant Order Detail | **Flagged** — see notes below. |

**Flagged items (documented as notes, not asserted as fact):**
- **Merchant Order Detail — Discount:** The `merchant-order-detail.png` design mock shows a **Discount** line in the Totals Panel. This matches FDS §5.5 and §7.5: the Totals Panel (EL-OI-52) renders **Subtotal, Discount, and Total**, with the coupon code shown when present. The §7.2 DB mapping applies `discount_amount` and `coupon_code` to the order-detail totals for both buyer and merchant detail.
- **No "Shipping fee" line** exists in `orderDetail` (§7.5 exposes only `discountAmount`/`couponCode`/`totalAmount`) — do not add a shipping-fee row to any totals panel.
- **Merchant Order Detail** layout is otherwise consistent with the shared §7.5 detail DTO (customer block, notes, track, change-status navigation), restricting `order_items` to the merchant's own shop.
- **Customer PII** on Layout 5 is limited to `customer.name` / `customer.email` / `customer.phone` + shipping address (BR-OI-033).
- **Commission rate snapshot** (`orders.commission_rate`) is an open schema gap (BR-OI-023) — render `—` / footnote until it exists (BR-OI-032).

### 11.2 Styling & Accessibility Constraints

| Item | Specification |
| :--- | :--- |
| `mkrCurrentStep` accent | Luxury Purple `#7C3AED` for `STEP_CURRENT` (EL-OI-23). |
| Status badge colors | Colour-coded per `order_statuses.status_code` (BR-OI-031); i18n label. |
| Reduced motion | Entrance/step animations skip under `prefers-reduced-motion: reduce`. |
| Empty vs error | Empty data → `—`/`0` + illustrated empty state (BR-OI-030); never error styling. |
| Accessibility | `role="status"` on alert/toast; stepper items sequenced; table headers associated with columns. |
| Read-only emphasis | No inline editing controls on any screen; "Change Status" is navigation only. |

---
## 12. Testing Checklist (テストチェックリスト)

### 12.1 Buyer Order History Tests (Layout 1)

- [ ] Page loads with "My Orders" heading and the order list table
- [ ] Skeleton loading state displays until the API response arrives
- [ ] Status filter defaults to "All" and filters to a single status (each of the 6 statuses)
- [ ] Date range filter validates `from ≤ to` (VAL-OI-002)
- [ ] Table shows Order #, Date, Items, Total, Payment, Status columns
- [ ] Status badge shows the correct colour and i18n label per status (BR-OI-031)
- [ ] Track link navigates to Order Tracking for the selected row
- [ ] Pagination shows "Page 1 of N · total" and Prev/Next works (20 rows/page)
- [ ] Empty state appears with illustration + CTA when 0 orders (BR-OI-030)
- [ ] Buyer rows do **not** include a Customer column (BR-OI-015)
- [ ] Unauthorized access (no JWT) redirects to login (401)
- [ ] Server error shows destructive alert with retry (500)

### 12.2 Buyer Order Detail Tests (Layout 2)

- [ ] Order header shows Order #, date, and current status badge
- [ ] Buyer Order Detail shows the shop name only; `shop.merchantId` is not rendered
- [ ] Items table shows Product / Qty / Unit Price / Line Total; prices frozen (BR-OI-017)
- [ ] Totals panel shows Subtotal, Discount (+ coupon), and Total — **no shipping-fee row**
- [ ] Discount row hidden when `discountAmount = 0` and no `couponCode`
- [ ] Payment status shows method + pending/completed badge
- [ ] Shipping address renders from the JSONB block
- [ ] Order notes hidden when `notes` is null
- [ ] Track Order button navigates to tracking
- [ ] Cross-scope `:id` returns 404 (deliberately indistinguishable, BR-OI-008)
- [ ] NotFound returns "Order not found" + Back to Orders action

### 12.3 Order Tracking Tests (Layout 3)

- [ ] Order reference shows Order # + date
- [ ] Timeline renders all 6 steps in `display_order` (placed→…→delivered)
- [ ] Reached steps show timestamps; unreached steps blank
- [ ] Current step is marked with the `#7C3AED` marker (done/current/upcoming)
- [ ] Delivered banner shows only when `status='delivered'` (terminal)
- [ ] No-history note shows when `historyAvailable = false` (BR-OI-014)
- [ ] Back link navigates to the role-appropriate detail screen
- [ ] Cross-scope access renders the standard not-found panel (BR-OI-008)

---
### 12.4 Merchant Order Insights Tests (Layout 4)

- [ ] Page loads with Sales Summary tiles, Revenue Summary group, and own-shop order list
- [ ] Sales tiles show Today / This Month / Completed counts; skeleton while loading
- [ ] Revenue Summary renders Sales / Commission / Revenue / AOV **as one group** (BR-OI-026)
- [ ] Revenue is emphasized and equals Sales − Commission (BR-OI-024)
- [ ] AOV equals Revenue ÷ orderCount (net, not gross — BR-OI-025)
- [ ] Order Count caption shows "Based on N orders" (BR-OI-027)
- [ ] Rate footnote renders with source; renders `—` when `commissionRateLocked=false` (BR-OI-032)
- [ ] Period selector defaults to This Month; switching to Today/Last Month refetches (VAL-OI-006)
- [ ] `period=custom` without `from`/`to` shows error (VAL-OI-007)
- [ ] Own-shop order list shows Customer column (merchant view, BR-OI-015) and correct scope
- [ ] Row actions (View / Track) navigate correctly
- [ ] Scope note "Showing orders for your shop only." shown (EL-OI-47)
- [ ] Merchant without `license_status='approved'` blocked with 403 (BR-OI-006)
- [ ] Admin can view the merchant dashboard without license gate

### 12.5 Merchant Order Detail Tests (Layout 5)

- [ ] Order header shows Order #, date, status badge, and payment status
- [ ] Items table shows **only the merchant's own-shop** lines (`order_items.merchant_id` = own)
- [ ] Totals panel shows **Subtotal, Discount, and Total**; coupon code is shown when present (EL-OI-52)
- [ ] Customer Information shows name, email, phone, and shipping address only (BR-OI-033)
- [ ] Order notes hidden when null
- [ ] Track Order navigates to `/merchant/orders/:id/tracking`
- [ ] Change Status link **navigates only** to Order Fulfillment; no status-change API call here
- [ ] Status badge is read-only (EL-OI-56)
- [ ] Cross-shop order returns 404 (BR-OI-008)

---
### 12.6 Admin All Orders Tests (Layout 6)

- [ ] Page loads with "All Orders" heading, filter bar, result count, and full-platform order list
- [ ] Shop/Merchant filter is searchable; selecting it filters the list (admin only)
- [ ] Status filter and date range filter AND-combine with the shop filter (BR-OI-016)
- [ ] Active filter chips appear once a filter is applied; clearing a chip refetches
- [ ] Order list shows Shop/Merchant and Buyer columns (both from §7.4 DTO)
- [ ] Result count updates to match the filtered total (`meta.total`)
- [ ] Row actions (View / Track) work on any platform order
- [ ] Pagination works at 20 rows/page
- [ ] Empty state "No orders match the current filters." + Clear Filters CTA when 0 rows
- [ ] Non-admin attempting `merchantId`/`shopId` is blocked with 403 (BR-OI-001)
- [ ] Admin filter parameters are rejected as `403` for buyer/merchant callers

### 12.7 Global Tests (全画面共通)

- [ ] All screens load with skeleton until data arrives
- [ ] Empty states render `0` / `—` and illustrations, never error styling (BR-OI-030)
- [ ] Cross-scope access always renders the standard not-found panel (BR-OI-008)
- [ ] Language toggle switches all labels and status names between EN / JA / MY (FDS §13.6)
- [ ] Locale-aware currency/date formatting follows the selected language
- [ ] Merchant revenue figures never render individually (BR-OI-026)
- [ ] Responsive layout works at mobile / tablet / desktop / wide breakpoints (§3.2)
- [ ] No screen mutates order data or performs a status transition (read-only)
- [ ] Audit events written: `ORDER_LIST_VIEWED`, `ORDER_DETAIL_VIEWED`, `ORDER_TRACKING_VIEWED`, `MERCHANT_SUMMARY_VIEWED`, `CROSS_SCOPE_ACCESS_DENIED`
- [ ] Rate limiting (429) shows "Too many requests. Please wait {seconds} seconds"

---

*画面項目設計書（Order Insights）ここまで — End of Screen Items Specification (Order Insights)*
