# DD_OI_02 — Frontend Page (Order History / Order Detail / Order Tracking / Order Insights)

> **Doc ID:** SKM-DD-OI-02 | **Version:** 1.0 | **Status:** Draft  
> **Last Updated:** 2026-08-31

---

## 1. Overview

The Order Insights pages give each platform role a read-only view of the orders that belong to them, plus — for merchants — the sales and revenue summaries derived from those orders. There are seven screens: Buyer Order History, Buyer Order Detail, Order Tracking (shared by Buyer / Merchant / Admin), Merchant Order Insights, Merchant Order Detail, Admin All Orders, and Admin Order Detail. Every screen renders server-scoped data (BR-OI-001): buyer → own orders, merchant → own-shop orders, admin → all platform orders. **No screen performs a status transition or writes order data** (BR-OI-007); the only order-status mutation available anywhere is the merchant "Change Status" navigation link to the Order Fulfillment module (FDS §1.1).

- **File Path (Buyer Order History):** `frontend/src/pages/order-insights/BuyerOrdersPage.tsx`
- **File Path (Buyer Order Detail):** `frontend/src/pages/order-insights/BuyerOrderDetailPage.tsx`
- **File Path (Order Tracking):** `frontend/src/pages/order-insights/OrderTrackingPage.tsx` (shared by Buyer / Merchant / Admin)
- **File Path (Merchant Order Insights):** `frontend/src/pages/order-insights/MerchantOrderInsightsPage.tsx`
- **File Path (Merchant Order Detail):** `frontend/src/pages/order-insights/MerchantOrderDetailPage.tsx`
- **File Path (Admin All Orders):** `frontend/src/pages/order-insights/AdminOrdersPage.tsx`
- **File Path (Admin Order Detail):** `frontend/src/pages/order-insights/AdminOrderDetailPage.tsx`
- **Route (Buyer Order History):** `/orders`
- **Route (Buyer Order Detail):** `/orders/:id`
- **Route (Order Tracking):** `/orders/:id/tracking`
- **Route (Merchant Order Insights):** `/merchant/orders`
- **Route (Merchant Order Detail):** `/merchant/orders/:id`
- **Route (Admin All Orders):** `/admin/orders`
- **Route (Admin Order Detail):** `/admin/orders/:id`
- **Shared Layout:** `BuyerLayout.tsx` / `MerchantLayout.tsx` / `AdminLayout.tsx` — role menus + header provide the sidebar navigation entries ("Orders" / "Order Insights"). Feature container: `frontend/src/features/order-insights/` (components, hooks, schemas, services, types).

### 1.1 Route Registry & Role Visibility

| Screen | Route | Role Guard | Data Scope (BR-OI-001) | License Gate |
|--------|-------|-----------|------------------------|--------------|
| Buyer Order History | `/orders` | `buyer` | `orders.buyer_id = currentUser.id` | — |
| Buyer Order Detail | `/orders/:id` | `buyer` | Order owned by `currentUser.id` (BR-OI-008) | — |
| Order Tracking | `/orders/:id/tracking` | `buyer` / `merchant` / `admin` | Role-scoped (`buyer_id`, own `merchant_id`, all) | merchant: `license_status = 'approved'` (BR-OI-006) |
| Merchant Order Insights | `/merchant/orders` | `merchant` / `admin` | `orders.merchant_id = <own merchants.id>` | merchant: `license_status = 'approved'` |
| Merchant Order Detail | `/merchant/orders/:id` | `merchant` | Own-shop order + `order_items.merchant_id` = own | merchant: `license_status = 'approved'` |
| Admin All Orders | `/admin/orders` | `admin` / `super_admin` | All platform orders (no implicit owner filter) | — |
| Admin Order Detail | `/admin/orders/:id` | `admin` / `super_admin` | Any platform order (unrestricted items) | — |

> **Route registry note (flagged):** the current frontend scaffold mounts a single `OrderInsights` page under role namespaces (`/buyer/order-insights`, `/merchant/order-insights`). This design follows 機能設計書 §5 / 画面項目設計書 §3 canonical routes above; the scaffold routes are to be re-aligned with this registry.

### 1.2 Role-Based Visibility Differences (Buyer / Merchant / Admin)

| Field / Behavior | Buyer | Merchant | Admin |
|------------------|-------|----------|-------|
| `customerName` list column | Not rendered (no DTO field) | Rendered (BR-OI-015) | Rendered |
| `shopName` list column | Not rendered | Not rendered | Rendered |
| Sales / Revenue summaries | Never (BR-OI-005) | Rendered (own-shop) | Not rendered on order screens (Revenue & Commission subsystem scope) |
| Customer-information block (detail) | **No** — only his/her own `shipping_address` | Yes (`customer.name/email/phone` + shipping, BR-OI-033) | Yes (same fields, admin-only per BR-OI-015/033) |
| `shop.merchantId` (detail) | Hidden (name only) | Hidden | Rendered in Shop / Merchant card |
| Order items (detail) | Own order items | Restricted to own `merchant_id` | Unrestricted (all order items) |
| Change Status action | Not present | **Navigation only** to Order Fulfillment (EL-OI-57) | Not present |
| Filters | Status + date range | Status + date range | Status + date range + **Shop/Merchant** (`merchantId`/`shopId`, EL-OI-61) |

The screens are fully responsive and internationalised through i18next keys resolved for EN / JA / MY (FDS §13.6); order-status names and the four Revenue Summary labels are i18n-driven. All interactive elements use `components/ui` primitives (button, select, table, badge, skeleton, alert, toast, tabs) — which are **read-only shared ui components**, never modified by this module.

---

## 2. Layout Structure

All seven screens share the same design language: white/surface cards on the role layout background, Luxury Purple `#7C3AED` accent for the active tracking step, colour-coded status badges, skeleton shimmer during loading, and a responsive grid that degenerates from a multi-column row to a single column on mobile. The layouts below use the local section letters `[A]`, `[B]`, `[C]` matching the box diagrams and item tables in 画面項目設計書 §3.1 / §4; the FDS element IDs (`EL-OI-xx`) are retained as a cross-reference only.

**Responsive Layout Breakpoints (画面項目設計書 §3.2):**

| Breakpoint | Min Width | Layout Behavior |
| :--- | :--- | :--- |
| Mobile (default) | 0px | Filter bar stacks vertically; tables horizontally scrollable; summary tiles / stat group stack to one column; timeline full width. |
| Tablet (`md:`) | 768px | Two-column stat tiles; filter bar wraps; tables full width with horizontal scroll. |
| Desktop (`lg:`) | 1024px | Order-list rows show all columns; pagination right-aligned; Revenue Summary renders as a 4-stat row. |
| Wide (`xl:`) | 1280px | Full-width tables with enhanced spacing; admin filter bar single row. |

### 2.1 Buyer Order History Layout (`/orders`)

**Purpose:** Let a buyer see all of their own past orders (§3.3 — FDS §5.1). Read-only list with optional status and date-range filters.

```
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

**Field / Item Table** (画面項目設計書 §4.1):

#### Section [A]: Page Header

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `lblPageTitle` | Page Title / ページタイトル | Heading (h5) | String | Yes | Visible. Text: "My Orders" | — | Hardcoded UI text | i18n key: `buyer.orders.title`. | EL-OI-01 |

#### Section [B]: Filter Bar

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `selFilterStatus` | Status Filter / ステータス絞り込み | Select | String | No | Default "All" | Options: All / placed / confirmed / packed / shipped / out_for_delivery / delivered | `order_statuses.status_code` | i18n key: `orders.filter.status`. Values = seeded `order_statuses` codes (BR-OI-011). | EL-OI-02 |
| 2 | `drpFilterDateRange` | Date Range Filter / 日付範囲絞り込み | Date Range Picker | Date × 2 | No | Empty (all dates) | ISO dates; `to ≥ from` | `orders.created_at` | i18n key: `orders.filter.dateRange`. Filter by order date. | EL-OI-03 |

#### Section [C]: Order List Table

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `tblOrderList` | Order List Table / 注文リストテーブル | Table | — | Yes | Loading skeleton; 20 rows/page; `createdAt DESC` | Columns: Order #, Date, Items, Total, Payment, Status | §7.4 order-history-row DTO | i18n key: `orders.table`. Server-side pagination/sort. | EL-OI-04 |
| 2 | `badgeOrderStatus` | Status Badge / ステータスバッジ | Badge | VARCHAR(50) | Yes | One per row | One colour per status code | `order_statuses.status_name` | Colour-coded per BR-OI-031; i18n label. Row-level. | EL-OI-05 |
| 3 | `lnkTrack` | Track Link / 追跡リンク | Link / Button (ghost) | — | Yes | One per row | Navigates to `/orders/:id/tracking` | — | i18n key: `orders.track`. Row-level. | EL-OI-06 |
| 4 | `pgOrderList` | Pagination / ページネーション | Control | — | Yes | Page 1 of N; 20/page | Prev / Next; "Page 1 of 3 · 42 orders" | `meta` (page/limit/total) | i18n key: `common.pageInfo`. `page ≥ 1`, `limit` 1–100. | EL-OI-07 |

#### Section [D]: Empty State

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `emptyOrderList` | Empty State / 空状態 | Illustration + Text | — | Yes | Hidden by default; shown when 0 rows | Text: "You haven't placed any orders yet." + Browse Products CTA | — | i18n key: `orders.empty`. BR-OI-030 — empty is not an error. | EL-OI-08 |

> **Role note:** the buyer history row DTO exposes **no** `customerName` / `shopName` — the buyer table must not render them (画面項目設計書 §4.1 note).

**Loading / Empty / Error / Responsive:** skeleton shimmer on the table while `GET /api/v1/orders` is in flight; empty state (illustration + "Browse Products" CTA) when the list has 0 rows; `400/422/429` inline + toast, `401` → login, `500` → alert with retry (FDS §9). On mobile the table scrolls horizontally and the filter bar stacks vertically.

### 2.2 Buyer Order Detail Layout (`/orders/:id`)

**Purpose:** Show order items, totals, and payment status for one of the buyer's own orders (§3.3 — FDS §5.2).

```
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

**Field / Item Table** (画面項目設計書 §4.2):

#### Section [A]: Order Header

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `cardOrderHeader` | Order Header / 注文ヘッダー | Card | — | Yes | Visible | Order #, date, current status badge | `orders.id`, `orders.created_at`, `orders.status` | i18n key: `orders.detail.header`. | EL-OI-10 |
| 2 | `badgeStatus` | Status Badge / ステータスバッジ | Badge | VARCHAR(50) | Yes | Visible in header | One colour per status code | `order_statuses.status_name` | Colour-coded per BR-OI-031; i18n label. | EL-OI-10 (part of header) |
| 3 | `txtShopName` | Shop Name / ショップ名 | Text | String | Yes | Visible | Name only; merchant ID is not rendered | `shop.name` (`merchants.shop_name` via `orders.merchant_id`) | Buyer-visible per FDS §7.5. `shop.merchantId` remains admin-only. | — (FDS §7.5 field) |

#### Section [B]: Order Items Table

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `tblOrderItems` | Order Items Table / 注文明細テーブル | Table | UUID / INTEGER / DECIMAL(10,2) | Yes | Loading skeleton | Columns: Product, Qty, Unit Price, Line Total | `order_items` + `products.name` (§7.5 `items[]`) | i18n key: `orders.detail.items`. Prices frozen at order creation (BR-OI-017). | EL-OI-11 |

#### Section [C]: Totals Panel

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `cardTotals` | Totals Panel / 合計パネル | Card | DECIMAL(10,2) / VARCHAR(50) | Yes | — | Rows: Subtotal, Discount (with coupon), **Total** | Subtotal (derived), `orders.discount_amount`, `orders.coupon_code`, `orders.total_amount` | i18n key: `orders.detail.totals`. **No shipping-fee row** — §7.5 exposes only `discountAmount`/`couponCode`/`totalAmount`. | EL-OI-12 |

#### Section [D]: Payment Status

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `cardPayment` | Payment Status / 支払ステータス | Card | VARCHAR(50) / VARCHAR(20) | Yes | — | Payment Method + status badge | `orders.payment_method`, `orders.payment_status` | i18n key: `orders.detail.payment`. Status ∈ {pending, completed} (`chk_orders_payment_status`). | EL-OI-13 |

#### Section [E]: Shipping Address

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `cardShippingAddress` | Shipping Address / 配送先住所 | Card | JSONB | Yes | — | Formatted address block | `orders.shipping_address` (JSONB) | i18n key: `orders.detail.shipping`. | EL-OI-14 |

#### Section [F]: Order Notes

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `txtOrderNotes` | Order Notes / 注文メモ | Text | TEXT | No | Hidden when null | — | `orders.notes` | i18n key: `orders.detail.notes`. | EL-OI-15 |

#### Section [G]: Track Order

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `btnTrackOrder` | Track Order Button / 注文追跡ボタン | Button (primary) | — | Yes | Visible | Navigates to `/orders/:id/tracking` | — | i18n key: `orders.track`. | EL-OI-16 |

> **Role note:** no sales / commission / revenue figure ever appears on any buyer screen (BR-OI-005). The detail DTO additionally carries `customer.*` and `shop.merchantId` for merchant/admin only (FDS §7.5) — none of these are rendered here.

**Loading / Empty / Error / Responsive:** skeleton card while `GET /api/v1/orders/:id` loads; a not-found panel on `404` (never revealing another owner's order — BR-OI-008); alert with retry on `500`. Cards stack to a single column on mobile; the items table is horizontally scrollable.

### 2.3 Order Tracking Layout (`/orders/:id/tracking`) — Buyer / Merchant / Admin

**Purpose:** Show the six-step status timeline of one order (§3.3 buyer, §4.5 merchant, §5.6 admin drill-down — FDS §5.3). One shared screen for all three roles; only the "Back to Detail" target differs by role.

```
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

**Field / Item Table** (画面項目設計書 §4.3):

#### Section [A]: Order Reference

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `txtOrderReference` | Order Reference / 注文参照 | Text | — | Yes | Visible | Order # + order date | `orders.id`, `orders.created_at` | i18n key: `orders.tracking.ref`. | EL-OI-20 |

#### Section [B]: Status Timeline

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `stpTrackingTimeline` | Status Timeline / ステータスタイムライン | Stepper (vertical) | — | Yes | Expanded; scroll current step into view | 6 steps in `display_order` | `order_statuses` (placed→…→delivered) | i18n key: `orders.tracking.timeline`. Steps from BR-OI-013. | EL-OI-21 |
| 2 | `txtStepTimestamp` | Step Timestamp / ステップタイムスタンプ | Text | — | Yes | One per reached step | Reached → ISO timestamp; unreached → blank | `order_status_history.created_at` | Row-level within the timeline. | EL-OI-22 |
| 3 | `mkrCurrentStep` | Current Status Highlight / 現在ステータス強調 | Marker | — | Yes | One per timeline | `done` / `current` / `upcoming` (§3.3) | Derived from `orders.status` vs. steps | `STEP_CURRENT` gets Luxury Purple `#7C3AED` marker. | EL-OI-23 |

#### Section [C]: Delivered Banner

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `bannerDelivered` | Delivered Confirmation / 配送完了確認 | Banner | — | No | Hidden; shown when `status = 'delivered'` | Terminal-state banner | `orders.status` | i18n key: `orders.tracking.delivered`. Terminal state (`is_terminal_state`). | EL-OI-24 |

#### Section [D]: No-History Note

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `txtNoHistory` | No-History Note / 履歴不明注記 | Text | — | No | Hidden; shown when `historyAvailable = false` | — | Derived (`order_status_history` rows > 0) | i18n key: `orders.tracking.noHistory`. Per BR-OI-014. | EL-OI-25 |

#### Section [E]: Back to Detail

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `lnkBackToDetail` | Back to Detail / 注文詳細へ戻る | Link | — | Yes | Visible | Navigates to the role-appropriate detail route | — | i18n key: `common.back`. | EL-OI-26 |

> **Role note (shared screen):** Buyer → back to `/orders/:id`; Merchant → back to `/merchant/orders/:id`; Admin → back to `/admin/orders/:id`. Merchant requires `license_status = 'approved'` (BR-OI-006); `404` on out-of-scope `:id` per BR-OI-008.

**Loading / Empty / Error / Responsive:** skeleton shimmer while `GET /api/v1/orders/:id/tracking` loads; if no `order_status_history` rows exist the timeline collapses to the single current step with `txtNoHistory` (BR-OI-014); Delivered banner only when terminal. Timeline is full-width on mobile; the stepper is an ordered list with `aria-current="step"` on the current marker (FDS §13.5).

### 2.4 Merchant Order Insights Layout (`/merchant/orders`)

**Purpose:** Own-shop order history plus the Sales Summary and Revenue Summary panels (§4.5 — FDS §5.4). The Sales Summary (EL-OI-30~32) and Revenue Summary (EL-OI-34~41) are **panels on this single screen** — they are not separate routes or screens (FDS §5.4 defines one screen). Access gate: merchant with `license_status = 'approved'` (BR-OI-006, else 403) or admin.

```
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

**Field / Item Table** (画面項目設計書 §4.4):

#### Section [A]: Page Header

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `lblPageTitle` | Page Title / ページタイトル | Heading (h5) | String | Yes | Text: "Order Insights" | — | Hardcoded UI text | i18n key: `merchant.orders.title`. Functional-spec omission: §5.4 defines no page-title element; flagged for the FDS owner. | — (FDS §5.4 omission) |
| 2 | `txtScopeNote` | Scope Note / スコープ注記 | Text (small) | — | Yes | "Showing orders for your shop only." (§6.4) | — | — | i18n key: `merchant.orders.scopeNote`. | EL-OI-47 |

#### Section [B]: Sales Summary (order-count tiles)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `tileTodayOrders` | Today's Orders / 本日の注文タイル | Stat Tile | INTEGER | Yes | Loading skeleton | Integer count | `COUNT(orders)` where `created_at` = today | i18n key: `merchant.orders.today`. | EL-OI-30 |
| 2 | `tileThisMonthOrders` | This Month's Orders / 今月の注文タイル | Stat Tile | INTEGER | Yes | Loading skeleton | Integer count | `COUNT(orders)` where `created_at` in current month | i18n key: `merchant.orders.thisMonth`. | EL-OI-31 |
| 3 | `tileCompletedOrders` | Completed Orders / 完了注文タイル | Stat Tile | INTEGER | Yes | Loading skeleton | Integer count | `COUNT(orders)` where `status='delivered'` | i18n key: `merchant.orders.completed`. Terminal state (BR-OI-018). | EL-OI-32 |

> **Note (flagged):** EL-OI-33 is not defined in FDS §5.4.1 — numbering runs 30–32 → 34. Reproduced here as a gap; do not invent an element for it (画面項目設計書 §4.4).

#### Section [C]: Revenue Summary (four figures, always together)

> **BR-OI-026:** Sales / Commission / Revenue / AOV are returned together by the API and must render as one indivisible group (`grpRevenueSummary`). Rendering Revenue (`statRevenue`) alone is prohibited; mobile layouts must stack the four stats, never drop them.

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `grpRevenueSummary` | Revenue Summary Group / 収益サマリーグループ | Card (single component) | — | Yes | Loading skeleton | Container for the 4 stats | `revenueSummary` DTO (§7.8) | i18n key: `merchant.revenue.title`. Indivisible (BR-OI-026). | EL-OI-34 |
| 2 | `statSales` | Sales / 売上 | Stat (currency) | DECIMAL(10,2) | Yes | Currency format | e.g. `$1,000.00` | `SUM(orders.total_amount)` | i18n key: `merchant.revenue.sales`. Gross paid by customers (BR-OI-021). | EL-OI-35 |
| 3 | `statCommission` | Commission / コミッション | Stat (currency) | DECIMAL(10,2) | Yes | Currency format | e.g. `$120.00` | `SUM(order.total_amount × rate)`, rate per BR-OI-022/023/028 | i18n key: `merchant.revenue.commission`. | EL-OI-36 |
| 4 | `statRevenue` | Revenue / 収益 | Stat (currency, emphasized) | DECIMAL(10,2) | Yes | Currency, emphasized | e.g. `$880.00` | `sales − commission` | i18n key: `merchant.revenue.net`. Net received (BR-OI-024). **Never standalone** (BR-OI-026). | EL-OI-37 |
| 5 | `statAov` | AOV / 平均注文額 | Stat (currency) | DECIMAL(10,2) | Yes | Currency format | e.g. `$88.00` | `revenue ÷ orderCount` — **net revenue, not gross sales** (BR-OI-025) | i18n key: `merchant.revenue.aov`. | EL-OI-38 |
| 6 | `txtOrderCount` | Order Count Caption / 注文数キャプション | Text | INTEGER | Yes | "Based on N orders" | Integer | `COUNT(orders)` same order set (BR-OI-027) | i18n key: `merchant.revenue.orderCount`. AOV denominator. | EL-OI-39 |
| 7 | `txtRateFootnote` | Commission Rate Footnote / コミッション率脚注 | Text (small) | UI-derived text | Yes | Shows rate + source note | Rate % + source | `commissionRate`, `commissionRateSource`, `commissionRateLocked` | i18n key: `merchant.revenue.rateNote`. Schema gap managed per BR-OI-023; render `—` when unlocked (BR-OI-032). | EL-OI-40 |
| 8 | `tglPeriod` | Period Selector / 期間セレクタ | Button Group | String (enum) | Yes | Default: This Month | today / this_month / last_month / custom | `period` query param | i18n key: `merchant.revenue.period`. `custom` requires `from`/`to`. | EL-OI-41 |

#### Section [D]: Own-shop Order List

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `tblMerchantOrderList` | Order List Table / 注文リストテーブル | Table | — | Yes | Loading skeleton; 20 rows/page; `createdAt DESC` | Columns: Order #, Date, **Customer**, Items, Total, Payment, Status | `orders` scoped to own `merchant_id`; §7.4 row DTO + `customerName` | i18n key: `merchant.orders.table`. `customerName` from `users.name` via `orders.buyer_id` (BR-OI-015). | EL-OI-42 |
| 2 | `selFilterStatus` | Status Filter / ステータス絞り込み | Select | String | No | Default "All" | placed…delivered enums | `order_statuses.status_code` | i18n key: `orders.filter.status`. | EL-OI-43 |
| 3 | `drpFilterDateRange` | Date Range Filter / 日付範囲絞り込み | Date Range Picker | Date × 2 | No | Empty (all dates) | ISO dates; `to ≥ from` | `orders.created_at` | i18n key: `orders.filter.dateRange`. | EL-OI-44 |
| 4 | `lnkRowActions` | Row Actions / 行アクション | Link Group | — | Yes | One per row | View Detail / Track | — | i18n keys: `common.view` / `orders.track`. Row-level. | EL-OI-45 |
| 5 | `pgMerchantOrderList` | Pagination / ページネーション | Control | — | Yes | Page 1 of N; 20/page | Prev / Next | `meta` | i18n key: `common.pageInfo`. | EL-OI-46 |

> **Role note:** Sales/Revenue summaries are for merchant (and admin) only — buyer never receives these endpoints (BR-OI-005). The own-shop list adds the `customerName` column that the buyer list cannot show; the `shopName` column is admin-only and not rendered here. Clicking a Sales tile (e.g. Completed) pre-filters the list (`status=delivered`).

**Loading / Empty / Error / Responsive:** skeleton shimmer on tiles, Revenue Summary group, and the list while the two summary endpoints and `GET /api/v1/orders` load; `0` / `—` placeholders for empty figures (never an error, BR-OI-030); `403` license gate → `/merchant/pending-approval` (BR-OI-006); `422` when `period=custom` lacks `from`/`to` → inline error; `500` → alert with retry. On mobile the stat tiles stack to one column and the Revenue Summary group stacks vertically (BR-OI-026 — all four figures remain visible).

### 2.5 Merchant Order Detail Layout (`/merchant/orders/:id`)

**Purpose:** View items **and customer information** for one of the merchant's own-shop orders (§4.5 — FDS §5.5). Items are restricted to `order_items.merchant_id` = own; the view is read-only.

```
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

**Field / Item Table** (画面項目設計書 §4.5):

#### Section [A]: Order Header

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `cardOrderHeader` | Order Header / 注文ヘッダー | Card | — | Yes | Visible | Order #, date, status badge, payment status | `orders.id`, `orders.created_at`, `orders.status`, `orders.payment_status` | i18n key: `orders.detail.header`. | EL-OI-50 |
| 2 | `badgeStatus` | Status Badge / ステータスバッジ | Badge | VARCHAR(50) | Yes | Visible; **read-only** | One colour per status | `order_statuses.status_name` | Status changes only in Order Fulfillment screens. | EL-OI-56 |

#### Section [B]: Own-shop Items Table

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `tblMerchantOrderItems` | Order Items Table / 注文明細テーブル | Table | UUID / INTEGER / DECIMAL(10,2) | Yes | Loading skeleton | Columns: Product, Qty, Unit Price, Line Total | `order_items` where `merchant_id` = own; `products.name` | i18n key: `orders.detail.items`. Prices frozen (BR-OI-017). | EL-OI-51 |

#### Section [C]: Totals Panel

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `cardTotals` | Totals Panel / 合計パネル | Card | DECIMAL(10,2) / VARCHAR(50) | Yes | — | Rows: Subtotal, Discount (with coupon code when present), Total | Subtotal (derived from own `order_items`), `orders.discount_amount`, `orders.coupon_code`, `orders.total_amount` | i18n key: `orders.detail.totals`. Discount shown; coupon shown when present. No shipping-fee row. | EL-OI-52 |

#### Section [D]: Customer Information

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `cardCustomerInfo` | Customer Information / 顧客情報 | Card | String | Yes | — | Buyer name, contact, shipping address | `customer.name`, `customer.email`, `customer.phone` (via `orders.buyer_id` → `users`) + `orders.shipping_address` | i18n key: `merchant.orders.customer`. Merchant/admin only (BR-OI-015/033). | EL-OI-53 |

#### Section [E]: Order Notes

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `txtOrderNotes` | Order Notes / 注文メモ | Text | TEXT | No | Hidden when null | — | `orders.notes` | i18n key: `orders.detail.notes`. Customer note. | EL-OI-54 |

#### Section [F]: Track Order

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `btnTrackOrder` | Track Order Button / 注文追跡ボタン | Button | — | Yes | Visible | Navigates to `/orders/:id/tracking` | — | i18n key: `orders.track`. Uses the shared Layout 3 tracking route. | EL-OI-55 |

#### Section [G]: Change Status

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `lnkChangeStatus` | Change Status Action / Change Status アクション | Link / Button | — | No | Visible | **Navigation only** to Order Fulfillment | — | i18n key: `orders.changeStatus`. No status-update API / state transition here (FDS §1.1). | EL-OI-57 |

> **Role note:** customer PII is limited to `customer.name` / `customer.email` / `customer.phone` + shipping address (BR-OI-033). The status badge is read-only (EL-OI-56); "Change Status" never mutates state on this screen. Admin does **not** see the Change Status action — it is merchant-only (FDS §5.5 vs §5.6).

**Loading / Empty / Error / Responsive:** skeleton while `GET /api/v1/orders/:id` loads; `404` not-found panel (BR-OI-008 — an order from another shop is indistinguishable from missing); `403` → `/merchant/pending-approval`; `500` → alert with retry. Cards stack to one column on mobile; the items table is horizontally scrollable.

### 2.6 Admin All Orders Layout (`/admin/orders`)

**Purpose:** View all platform orders with shop/merchant, status, and date filters (§5.6 — FDS §5.6). Covers order **visibility only** — platform revenue, commission configuration, payouts, and targets belong to the Revenue & Commission subsystem (Requirement Spec §5.7) and are out of scope.

```
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

**Field / Item Table** (画面項目設計書 §4.6):

#### Section [A]: Page Header

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `lblPageTitle` | Page Title / ページタイトル | Heading (h5) | String | Yes | Text: "All Orders" | — | Hardcoded UI text | i18n key: `admin.orders.title`. | EL-OI-60 |

#### Section [B]: Filter Bar

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `selFilterShop` | Shop/Merchant Filter / ショップ／販売者絞り込み | Searchable Select | UUID | No | Default: none (all) | Filter by shop or merchant | `merchantId` / `shopId` (admin only) | i18n key: `admin.orders.filter.shop`. Non-admin → 403 (BR-OI-001/016). | EL-OI-61 |
| 2 | `selFilterStatus` | Status Filter / ステータス絞り込み | Select | String | No | Default "All" | placed…delivered enums | `order_statuses.status_code` | i18n key: `admin.orders.filter.status`. | EL-OI-62 |
| 3 | `drpFilterDateRange` | Date Range Filter / 日付範囲絞り込み | Date Range Picker | Date × 2 | No | Empty (all dates) | ISO dates; `to ≥ from` | `orders.created_at` | i18n key: `orders.filter.dateRange`. | EL-OI-63 |
| 4 | `grpActiveFilters` | Active Filter Chips / 適用絞り込みチップ | Chip Group | — | No | Shows applied filters | Individual clear per chip | — | i18n key: `common.filters`. | EL-OI-64 |

#### Section [C]: Result Count

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `txtResultCount` | Result Count / 結果件数 | Text | — | Yes | "42 orders match the current filters" | Derived from `meta.total` | `meta` (total) | i18n key: `common.resultCount`. | EL-OI-66 |

#### Section [D]: Order List Table

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `tblAdminOrderList` | Order List Table / 注文リストテーブル | Table | — | Yes | Loading skeleton; 20 rows/page; `createdAt DESC` | Columns: Order #, Date, Shop/Merchant, Buyer, Items, Total, Payment, Status | §7.4 row DTO incl. `customerName` + `shopName` (`merchants.shop_name`) | i18n key: `admin.orders.table`. | EL-OI-65 |
| 2 | `lnkRowActions` | Row Actions / 行アクション | Link Group | — | Yes | One per row | View Detail / Track (any order) | — | i18n keys: `common.view` / `orders.track`. Row-level. | EL-OI-67 |
| 3 | `pgAdminOrderList` | Pagination / ページネーション | Control | — | Yes | Page 1 of N; 20/page | Prev / Next | `meta` | i18n key: `common.pageInfo`. | EL-OI-68 |

#### Section [E]: Empty State

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `emptyAdminOrderList` | Empty State / 空状態 | Illustration + Text | — | Yes | Hidden; shown when 0 rows match | "No orders match the current filters." + Clear Filters CTA | — | i18n key: `admin.orders.empty`. BR-OI-030. | EL-OI-69 |

> **Role note:** `selFilterShop` (searchable select over `shops` / `merchants`) is admin-only — a buyer or merchant supplying `merchantId`/`shopId` receives `403` (BR-OI-001/016). Filters AND-combine server-side; changing any filter resets to page 1. The admin table renders both `customerName` (buyer) and `shopName` columns, unlike merchant/buyer lists.

**Loading / Empty / Error / Responsive:** skeleton while `GET /api/v1/orders?merchantId=&shopId=…` loads; empty state when 0 rows match the filters (with "Clear Filters"); `400` invalid combination → inline; `403` (should not occur for admin) → `/unauthorized`; `500` → alert with retry. On mobile the filter bar stacks horizontally scrollable rows; the admin filter bar becomes a single row at `xl:`.

### 2.7 Admin Order Detail Layout (`/admin/orders/:id`)

**Purpose:** Allow an admin to inspect any platform order, its shop/merchant identity, unrestricted order items, totals, and customer information (画面項目設計書 §4.7). Read-only per BR-OI-007; **no** Change Status action or state-mutating control.

```
┌──────────────────────────────────────────────────────────────┐
│                     BROWSER VIEWPORT                          │
├──────────────────────────────────────────────────────────────┤
│  ← All Orders                 /admin/orders/:id                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [A] ORDER HEADER (cardAdminOrderHeader)               │  │
│  │  Order #  •  Placed date/time  •  Status  •  Payment   │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [B] SHOP / MERCHANT (cardAdminShopInfo)               │  │
│  │  Shop Name  •  Merchant ID                             │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [C] ITEMS TABLE (tblAdminOrderItems)                  │  │
│  │  Product / Qty / Unit Price / Line Total               │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [D] TOTALS PANEL (cardAdminTotals)                    │  │
│  │  Subtotal  /  Discount (+coupon)  /  Total             │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [E] CUSTOMER INFORMATION (cardAdminCustomerInfo)      │  │
│  │  Name / Email / Phone / Shipping Address               │  │
│  └────────────────────────────────────────────────────────┘  │
│  [F] TRACK ORDER (btnAdminTrackOrder)                       │
└──────────────────────────────────────────────────────────────┘
```

**Field / Item Table** (画面項目設計書 §4.7):

> **Note (flagged for FDS owner):** FDS §5 defines no Admin Order Detail element IDs. All Layout 7 item IDs are local UI IDs; no EL-OI number is invented (画面項目設計書 §4.7 note).

#### Section [A]: Order Header

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `cardAdminOrderHeader` | Order Header / 注文ヘッダー | Card | — | Yes | Visible | Order #, placed date/time, status badge, payment status badge | `orders.id`, `orders.created_at`, `orders.status`, `orders.payment_status` | i18n key: `orders.detail.header`. Read-only per BR-OI-007. | — (local UI ID) |

#### Section [B]: Shop / Merchant

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `cardAdminShopInfo` | Shop / Merchant Information / ショップ／販売者情報カード | Card | String / UUID | Yes | Visible | Shop name and merchant ID | `shop.name` / `shop.merchantId` (`merchants.shop_name` / `merchants.id` via `orders.merchant_id`) | i18n key: `admin.orders.detail.shopInfo`. Admin-only per BR-OI-015/033. | — (local UI ID) |

#### Section [C]: Unrestricted Items Table

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `tblAdminOrderItems` | Order Items Table / 注文明細テーブル | Table | UUID / INTEGER / DECIMAL(10,2) | Yes | Loading skeleton | Columns: Product, Qty, Unit Price, Line Total | `order_items` without a `merchant_id` filter; `products.name` | i18n key: `orders.detail.items`. All items in the order are shown. Prices frozen (BR-OI-017); unrestricted for admin. | — (local UI ID) |

#### Section [D]: Totals Panel

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `cardAdminTotals` | Totals Panel / 合計パネル | Card | DECIMAL(10,2) / VARCHAR(50) | Yes | — | Rows: Subtotal, Discount (with coupon code when present), Total | Derived subtotal, `orders.discount_amount`, `orders.coupon_code`, `orders.total_amount` | i18n key: `orders.detail.totals`. Read-only per BR-OI-007. | — (local UI ID) |

#### Section [E]: Customer Information

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `cardAdminCustomerInfo` | Customer Information / 顧客情報 | Card | String | Yes | — | Name, email, phone, shipping address | `customer.name`, `customer.email`, `customer.phone` via `orders.buyer_id` → `users`; `orders.shipping_address` | i18n key: `merchant.orders.customer`. Admin-only per BR-OI-015/033; PII limited to fulfilment needs. | — (local UI ID) |

#### Section [F]: Track Order

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL-OI) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `btnAdminTrackOrder` | Track Order Button / 注文追跡ボタン | Button | — | Yes | Visible | Navigates to `/orders/:id/tracking` | — | i18n key: `orders.track`. Uses the shared Layout 3 tracking route; read-only navigation only per BR-OI-007. | — (local UI ID) |

> **Role note:** Admin Order Detail renders the Shop/Merchant identity (`shop.name` + `shop.merchantId`) and the customer-information block — both absent from the buyer detail. It has **no** Change Status action (unlike Layout 5), keeping the admin surface read-only.

**Loading / Empty / Error / Responsive:** skeleton while `GET /api/v1/orders/:id` loads; `404` not-found panel with a "Back to Orders" action; `500` → alert with retry. Cards stack to one column on mobile; the unrestricted items table is horizontally scrollable.

---

## 3. Form State & Validation (React Hook Form + Zod)

The Order Insights pages are read-only output screens; the only "forms" are the **filter bars** (Layouts 1, 4 [D], 6) and the **Revenue Summary period selector** (Layout 4 [C]). All filters use `react-hook-form` with `zodResolver`; the resolved, validated values are pushed into URL search parameters and fed to TanStack Query keys, so the URL stays shareable and the server does the filtering (BR-OI-016 — never client-side).

### 3.1 Order List Filters Hook (`useOrderListFilters`)

```typescript
// frontend/src/features/order-insights/hooks/useOrderListFilters.ts
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { orderListFilterSchema, type OrderListFilterFormData } from '../schemas/orderFilters.schema'

export function useOrderListFilters() {
  const methods = useForm<OrderListFilterFormData>({
    resolver: zodResolver(orderListFilterSchema),
    defaultValues: {
      status: 'all',
      from: '',
      to: '',
      page: 1,
      limit: 20,
      sort: 'createdAt',
      order: 'desc',
    },
    mode: 'onChange',
  })

  return { methods }
}
```

Used by the Buyer (`/orders`), Merchant own-shop list (Layout 4 [D]), and Admin (`/admin/orders`) list screens. `status` default `'all'` is serialised as an empty query parameter (omitted).

### 3.2 Admin Order Filters Hook (`useAdminOrderFilters`)

```typescript
// frontend/src/features/order-insights/hooks/useAdminOrderFilters.ts
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { adminOrderFilterSchema, type AdminOrderFilterFormData } from '../schemas/orderFilters.schema'

export function useAdminOrderFilters() {
  const methods = useForm<AdminOrderFilterFormData>({
    resolver: zodResolver(adminOrderFilterSchema),
    defaultValues: {
      status: 'all',
      from: '',
      to: '',
      page: 1,
      limit: 20,
      sort: 'createdAt',
      order: 'desc',
      merchantId: '',
      shopId: '',
    },
    mode: 'onChange',
  })

  return { methods }
}
```

Extends the list filter with the admin-only `merchantId` / `shopId` searchable select (EL-OI-61). The searchable-select options are loaded from `GET /api/v1/shops` and `GET /api/v1/merchants` option endpoints; the values map to `merchantId` / `shopId` query parameters and are **rejected with `403`** for non-admin callers (BR-OI-001/016). Active selections render as chips (`grpActiveFilters`) with individual clear actions (EL-OI-64).

### 3.3 Revenue Summary Period Hook (`useRevenuePeriod`)

```typescript
// frontend/src/features/order-insights/hooks/useRevenuePeriod.ts
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { revenuePeriodSchema, type RevenuePeriodFormData } from '../schemas/orderFilters.schema'

export function useRevenuePeriod() {
  const methods = useForm<RevenuePeriodFormData>({
    resolver: zodResolver(revenuePeriodSchema),
    defaultValues: {
      period: 'this_month',
      from: '',
      to: '',
    },
    mode: 'onChange',
  })

  const selectedPeriod = methods.watch('period')

  return { methods, selectedPeriod }
}
```

Drives `tglPeriod` (EL-OI-41). When `period = 'custom'`, `from` / `to` date-range pickers appear and are required (VAL-OI-007 → `422`). Changing the period refetches `GET /api/v1/order-insights/merchant/revenue-summary?period=…` and repopulates the four-stat group.

### 3.4 URL Search-Parameter Sync (`useOrderQueryParams`)

```typescript
// frontend/src/features/order-insights/hooks/useOrderQueryParams.ts
import { useSearchParams } from 'react-router'

export function useOrderQueryParams() {
  const [searchParams, setSearchParams] = useSearchParams()

  function patch(values: Record<string, string | number | undefined>) {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined || value === '' || value === 'all') next.delete(key)
      else next.set(key, String(value))
    }
    setSearchParams(next, { replace: true })
  }

  return { searchParams, patch }
}
```

`patch()` is called on filter change, sort-column click, and pagination; the URL is the single source of truth for page/filter state (shareable deep links, e.g. the Notification System deep link to `/orders/:id/tracking`).

### 3.5 Zod Validation Schema

```typescript
// frontend/src/features/order-insights/schemas/orderFilters.schema.ts
import { z } from 'zod'

export const orderStatusCodes = [
  'placed', 'confirmed', 'packed', 'shipped',
  'out_for_delivery', 'delivered',
] as const

export const orderListFilterSchema = z.object({
  status: z.enum(['all', ...orderStatusCodes]),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1, 'Invalid page number'),
  limit: z.coerce.number().int().min(1).max(100, 'Invalid limit'),
  sort: z.enum(['createdAt', 'totalAmount', 'status'], { message: 'Invalid sort option' }),
  order: z.enum(['asc', 'desc']),
}).refine((data) => !data.from || !data.to || data.to >= data.from, {
  message: 'Invalid date range',
  path: ['to'],
})

export const adminOrderFilterSchema = orderListFilterSchema.extend({
  merchantId: z.string().uuid().optional(),
  shopId: z.string().uuid().optional(),
})

export const revenuePeriodSchema = z.object({
  period: z.enum(['today', 'this_month', 'last_month', 'custom'], {
    message: 'Invalid period',
  }),
  from: z.string().optional(),
  to: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.period === 'custom' && (!data.from || !data.to || data.to < data.from)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['from'],
      message: 'Select a start and end date',
    })
  }
})
```

Validation rules mirror FDS §8 / 画面項目設計書 §6.1: `status` is constrained to the seeded `order_statuses.status_code` values; `from`/`to` are ISO dates with `to ≥ from`; `page ≥ 1`; `limit` 1–100; `sort` ∈ {createdAt, totalAmount, status}; `order` ∈ {asc, desc}; `period` ∈ {today, this_month, last_month, custom}; `custom` requires a valid `from`/`to` pair.

---

## 4. Sub-Components

All components live in `frontend/src/features/order-insights/components/`. Everything below composes **read-only** `components/ui` primitives (button, select, table, badge, skeleton, alert, toast) and the global `EmptyState`; no shared component (`frontend/src/components/ui/`, `frontend/src/components/common/`) is modified.

### 4.1 OrderHistoryTable Component

- **File Path:** `frontend/src/features/order-insights/components/OrderHistoryTable.tsx`
- Reusable read-only data table used by Layouts 1 (`tblOrderList`), 4 [D] (`tblMerchantOrderList`), and 6 (`tblAdminOrderList`)
- Props: `columns: OrderRow[]`, `rows`, `loading`, `onView(orderId)`, `onTrack(orderId)`, `onSort(field)`, `pagination { page, limit, total }`, `onPageChange(page)`
- Column set is role-driven: buyer omits `customerName`/`shopName`; merchant adds `customerName`; admin adds both (BR-OI-015)
- Renders `StatusBadge` per row (EL-OI-05) and the View/Track row actions (EL-OI-06/45/67); skeleton shimmer while `loading`

### 4.2 StatusBadge Component

- **File Path:** `frontend/src/features/order-insights/components/StatusBadge.tsx`
- Colour-coded badge per `order_statuses.status_code` (BR-OI-031), label from `order_statuses.status_name` via i18n
- Used in Layouts 1, 2, 4 [D], 5, 6, 7 (EL-OI-05 / EL-OI-56)
- Accessible: exposes the full status name to screen readers, not just colour

### 4.3 PaymentBadge Component

- **File Path:** `frontend/src/features/order-insights/components/PaymentBadge.tsx`
- `pending` (amber) / `completed` (green); used in Layouts 2, 5, 7
- Reads `orders.payment_status` (`chk_orders_payment_status` constraint)

### 4.4 OrderDetailView Component

- **File Path:** `frontend/src/features/order-insights/components/OrderDetailView.tsx`
- Single role-aware detail renderer used by Layouts 2, 5, 7
- Props: `mode: 'buyer' | 'merchant' | 'admin'`, `orderDetail: OrderDetail | null`, `loading`, `error`, `onTrack(orderId)`
- Composes the order-items table (EL-OI-11 / EL-OI-51), the Totals Panel (EL-OI-12 / EL-OI-52), Payment Status (EL-OI-13), Shipping Address (EL-OI-14), Customer Information (EL-OI-53, merchant/admin only), Order Notes (EL-OI-15 / EL-OI-54), and the Track button (EL-OI-16 / EL-OI-55 / local UI ID)
- In `merchant` mode items are the own-shop subset and the Change Status link (EL-OI-57) is rendered; in `admin` mode the Shop/Merchant card (local UI ID) is rendered and no Change Status link appears

### 4.5 OrderTrackingTimeline Component

- **File Path:** `frontend/src/features/order-insights/components/OrderTrackingTimeline.tsx`
- Vertical stepper (`stpTrackingTimeline`) rendering the 6 steps from `order_statuses` ordered by `display_order` (BR-OI-013)
- Props: `steps: TrackingStep[]`, `currentStatus`, `historyAvailable`, `delivered`
- Step state `done` / `current` / `upcoming` per FDS §3.3; `STEP_CURRENT` gets the Luxury Purple `#7C3AED` marker (EL-OI-23); renders `txtStepTimestamp` per reached step (EL-OI-22), the Delivered banner (EL-OI-24), the no-history note (EL-OI-25), and the role-aware Back link (EL-OI-26)
- Ordered list with `aria-current="step"` on the current marker (FDS §13.5)

### 4.6 SalesSummaryTiles Component

- **File Path:** `frontend/src/features/order-insights/components/SalesSummaryTiles.tsx`
- Three stat tiles (EL-OI-30/31/32) from the `salesSummary` DTO (`todayCount`, `thisMonthCount`, `completedCount`)
- Tile click pre-filters the own-shop list (e.g. Completed → `status=delivered`)

### 4.7 RevenueSummaryGroup Component

- **File Path:** `frontend/src/features/order-insights/components/RevenueSummaryGroup.tsx`
- Single card (`grpRevenueSummary`) rendering Sales, Commission, Revenue, AOV **together** (BR-OI-026 — never a bare revenue figure), plus the order-count caption (`txtOrderCount`) and the commission-rate footnote
- Props: `revenueSummary: RevenueSummary | null`, `loading`, `period: RevenuePeriod`, `onPeriodChange(period)`
- When `commissionRateLocked = false` the footnote renders the BR-OI-023 sourcing note and the rate renders `—` (BR-OI-032), not an error

### 4.8 OrderFilterBar Component

- **File Path:** `frontend/src/features/order-insights/components/OrderFilterBar.tsx`
- Status select + date-range picker for Layouts 1 and 4 [D] (EL-OI-02/03 and EL-OI-43/44)
- Props: `methods` (RHF `OrderListFilterFormData`), `onApply(values)`, `onReset()`; date-range errors show inline (VAL-OI-002)

### 4.9 AdminOrderFilterBar Component

- **File Path:** `frontend/src/features/order-insights/components/AdminOrderFilterBar.tsx`
- Shop/Merchant searchable select (EL-OI-61), status select (EL-OI-62), date range (EL-OI-63), active-filter chips (EL-OI-64), and result count (EL-OI-66) for Layout 6
- Props: `methods` (RHF `AdminOrderFilterFormData`), `shopOptions`, `merchantOptions`, `onApply(values)`, `onClearChip(key)`, `onClearFilters()`

### 4.10 EmptyOrderState Component

- **File Path:** `frontend/src/features/order-insights/components/EmptyOrderState.tsx`
- Illustrated empty state + CTA (BR-OI-030 — empty is not an error)
- Buyer mode (EL-OI-08): "You haven't placed any orders yet." + Browse Products CTA
- Admin mode (EL-OI-69): "No orders match the current filters." + Clear Filters CTA
- Composes the global `EmptyState` component

---

## 5. Action Buttons & Handlers

All handlers are read-only and call `orderInsights.service.ts` (`frontend/src/features/order-insights/services/orderInsights.service.ts`), a thin typed wrapper over the shared API client. TanStack Query keys include the role scope so cache is never shared across roles (BR-OI-001).

### 5.1 Order List Load (page mount / filter change / page change)

- **Trigger:** Navigate to `/orders`, `/merchant/orders`, or `/admin/orders`; change a filter, sort, or page
- **Validation:** Zod `orderListFilterSchema` / `adminOrderFilterSchema` on the form values (VAL-OI-001~005, 008)
- **Action:**
  1. Read the role from the auth context; render the appropriate page component
  2. Call `orderInsightsService.getOrderHistory({ status, from, to, page, limit, sort, order, merchantId?, shopId? })` → `GET /api/v1/orders`
  3. Project role-appropriate row DTO (`customerName` merchant/admin; `shopName` admin) and render `OrderHistoryTable`
  4. Write `ORDER_LIST_VIEWED` audit event (server-side)
  5. On success (`200`) update `meta` (page/limit/total) and result count / pagination

### 5.2 Apply Filters

- **Button Type:** `submit` on the filter bar (or auto-apply on change)
- **Action:**
  1. Validate via Zod — inline error on the offending control for `400`/`422` (VAL-OI-001/002/007)
  2. `patch()` the URL search params (3.4) and reset to `page = 1`
  3. Refetch the list through the TanStack Query keyed by the new params
  4. Update active filter chips (admin, EL-OI-64) and the result count (`txtResultCount`, EL-OI-66)

### 5.3 Clear / Reset Filters

- **Trigger:** "Clear Filters" CTA in an empty state, or the reset action in a filter bar
- **Action:**
  1. Reset the form to defaults (`status: 'all'`, empty dates)
  2. Remove all query params, reset to `page = 1`
  3. Refetch the unfiltered list; hide the empty state when rows return

### 5.4 Sort Column Click

- **Trigger:** Click an order-list column header (`createdAt`, `totalAmount`, or `status`)
- **Action:** Toggle `order` between `asc`/`desc` (or set on first click → `desc`), `patch()` the `sort`/`order` params, reset to `page = 1`, refetch (VAL-OI-005)

### 5.5 Pagination (Prev / Next)

- **Button Type:** `button` on `pgOrderList` / `pgMerchantOrderList` / `pgAdminOrderList`
- **Action:** `patch()` `page` (prev/next), respecting `meta.total` and the 1–100 limit (VAL-OI-003/004); refetch

### 5.6 Revenue Summary Period Change

- **Button Type:** `button` on `tglPeriod` (EL-OI-41)
- **Validation:** Zod `revenuePeriodSchema`; `period = custom` requires `from`/`to` else inline error (VAL-OI-006/007 → `422`)
- **Action:**
  1. Call `orderInsightsService.getRevenueSummary({ period, from, to })` → `GET /api/v1/order-insights/merchant/revenue-summary`
  2. Render the four-stat group on `200` (BR-OI-026 — never a single figure); update the order-count caption and rate footnote
  3. When `commissionRateLocked = false` render `—` + the BR-OI-023 footnote (BR-OI-032)

### 5.7 Navigate to Order Detail (row click / View)

- **Button Type:** `link` / row click
- **Action:** Navigate to `/orders/:id` (buyer), `/merchant/orders/:id` (merchant), `/admin/orders/:id` (admin); the detail page loads `GET /api/v1/orders/:id` and renders `OrderDetailView` in the role mode (FDS §6.2; SIS §5.2)

### 5.8 Navigate to Order Tracking (Track / Track Order)

- **Button Type:** `link` / `button` (`lnkTrack`, `btnTrackOrder`, `btnAdminTrackOrder`)
- **Action:** Navigate to `/orders/:id/tracking`; the tracking page loads `GET /api/v1/orders/:id/tracking` and renders the six-step timeline (FDS §6.3; SIS §5.3)

### 5.9 Back to Order Detail (from Tracking)

- **Button Type:** `link` (`lnkBackToDetail`)
- **Action:** Navigate to the role-appropriate detail route — buyer `/orders/:id`, merchant `/merchant/orders/:id`, admin `/admin/orders/:id`

### 5.10 Change Status (merchant only — navigation only)

- **Button Type:** `link` (`lnkChangeStatus`, EL-OI-57)
- **Action:** Navigate to the Order Fulfillment status screen. **No status-update API is called and no state transition is performed here** (BR-OI-007, FDS §1.1)

### 5.11 Sales Summary Tile Click

- **Button Type:** `button` on `tileTodayOrders` / `tileThisMonthOrders` / `tileCompletedOrders`
- **Action:** Pre-filter the own-shop list (e.g. Completed → `status=delivered`) and scroll to the list section (FDS §12.2)

### 5.12 Error / Empty / Loading Retry

- **Trigger:** A `500` alert banner or a `429` rate-limit banner with retry
- **Button Type:** `button` "Retry"
- **Action:** Refetch the failed query through TanStack Query; show a transient toast on completion (FDS §9)

---

## 6. Lookup Data

The Order Insights screens require the following lookup sets. Order-status names and Revenue Summary labels resolve via i18n for EN / JA / MY; values come from the seeded `order_statuses` master table (BR-OI-011) and never contain hardcoded status spellings beyond the "All" option.

### 6.1 Order Status Options (`selFilterStatus`)

| Value | Label (EN) | i18n Key | Status Badge Colour (BR-OI-031) |
|-------|-----------|----------|----------------------------------|
| `all` | All | `orders.filter.status` (option) | — |
| `placed` | Placed | `order_statuses.placed` | Primary |
| `confirmed` | Confirmed | `order_statuses.confirmed` | Primary |
| `packed` | Packed | `order_statuses.packed` | Secondary |
| `shipped` | Shipped | `order_statuses.shipped` | Secondary |
| `out_for_delivery` | Out for Delivery | `order_statuses.out_for_delivery` | Accent |
| `delivered` | Delivered | `order_statuses.delivered` | Success |

> Values must equal the seeded `order_statuses.status_code` values (`placed → confirmed → packed → shipped → out_for_delivery → delivered`, forward-only, `delivered` terminal — FDS §3.1).

### 6.2 Revenue Summary Period Options (`tglPeriod`)

| Value | Label (EN) | Query Mapping |
|-------|-----------|---------------|
| `today` | Today | `GET /api/v1/order-insights/merchant/revenue-summary?period=today` |
| `this_month` | This Month | `?period=this_month` (default) |
| `last_month` | Last Month | `?period=last_month` |
| `custom` | Custom | `?period=custom&from=YYYY-MM-DD&to=YYYY-MM-DD` (both required — VAL-OI-007) |

### 6.3 Order List Sort Options (`sort` / `order`)

| Value | Label (EN) | Direction Values |
|-------|-----------|------------------|
| `createdAt` | Date | `asc` / `desc` (default `desc`) |
| `totalAmount` | Total | `asc` / `desc` |
| `status` | Status | `asc` / `desc` |

### 6.4 Admin Shop / Merchant Filter Options (`selFilterShop`)

- Options: shop names (`shops`) and merchant shop names (`merchants.shop_name`), mapped to `shopId` / `merchantId` (UUID) — admin only (BR-OI-001/016)
- Source: option endpoints used by `useAdminOrderFilters` (3.2); searchable select debounced server search

### 6.5 Route & Role Access Summary

| Route | Buyer | Merchant | Admin / Super Admin |
|-------|:-----:|:--------:|:-------------------:|
| `/orders` | ✅ own orders | — | — |
| `/orders/:id` | ✅ own | — | — |
| `/orders/:id/tracking` | ✅ own | ✅ own-shop (license) | ✅ any |
| `/merchant/orders` | ❌ 403 | ✅ own-shop (license) | ✅ |
| `/merchant/orders/:id` | ❌ 403 | ✅ own-shop (license) | ✅ |
| `/admin/orders` | ❌ 403 | ❌ 403 | ✅ |
| `/admin/orders/:id` | ❌ 403 | ❌ 403 | ✅ |

---

## 7. Error Handling

### 7.1 Field-Level Errors

- Red border on the invalid filter/pagination/period control
- Inline error message below the field (or a not-found panel for `:id` failures)
- Real-time validation on change (form `mode: 'onChange'`) plus server re-validation

Client-side (and server) validation errors, mapping 画面項目設計書 §6.1:

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

### 7.2 Form-Level Errors

API error handling, mapping 画面項目設計書 §6.2 / FDS §9.2:

| HTTP Status | Error Code | Scenario | User-Facing Behavior |
| :--- | :--- | :--- | :--- |
| `400` | `BAD_REQUEST` | Invalid status / date / period / pagination / sort parameter | Field-level inline error + top banner |
| `401` | `UNAUTHORIZED` | Missing or invalid JWT | Redirect to login |
| `403` | `FORBIDDEN` | Buyer requesting a merchant summary (BR-OI-005); merchant with `license_status ≠ 'approved'` (BR-OI-006); non-admin supplying `merchantId`/`shopId` | "You don't have permission to view this data" / "Your merchant account is not approved" |
| `404` | `NOT_FOUND` | Order does not exist **or** outside the caller's scope (BR-OI-008 — deliberately indistinguishable) | "Order not found" + Back to Orders action |
| `422` | `UNPROCESSABLE_ENTITY` | `period=custom` without a valid `from`/`to` pair | "Select a start and end date" |
| `429` | `TOO_MANY_REQUESTS` | Rate limit exceeded | "Too many requests. Please wait {seconds} seconds" |
| `500` | `INTERNAL_SERVER_ERROR` | Aggregation / DB failure | "Something went wrong. Please try again" |

Auth-related flows: `401` → `/login`; merchant with unapproved license → `/merchant/pending-approval`; buyer on a merchant/admin route → `/unauthorized` (FDS §12.1/§12.4). Toast notifications are used for transient API errors and retry outcomes; alert banners carry the destructive alert presentation.

### 7.3 Loading & Empty States

**Loading states:**
- Skeleton shimmer for tables (list screens), stat tiles and the Revenue Summary group (Layout 4), and the tracking timeline (Layout 3)
- `Skeleton` shimmer while a page-level query resolves; the filter bar remains interactive so users can change filters during a refetch
- Double-submission is impossible — sorting/pagination buttons are disabled while a refetch is in flight

**Empty states:**
- Buyer history: `emptyOrderList` illustration + "You haven't placed any orders yet." + Browse Products CTA (EL-OI-08)
- Admin list: `emptyAdminOrderList` (illustration + "No orders match the current filters." + Clear Filters CTA) (EL-OI-69)
- Tracked no history: `txtNoHistory` note when `historyAvailable = false` (BR-OI-014)
- Empty figures are never an error — sales summary counts render `0`, unsupported metrics render `—` + footnote (BR-OI-030 / BR-OI-032)
- Cross-scope `404` renders the standard not-found panel — it never reveals that the order exists under another owner (BR-OI-008)

---

## 8. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_OI_01](./DD_Order_Insights_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_OI_03](./DD_Order_Insights_03_API_ENDPOINTS.md) | Backend REST API contract |
| [DD_OI_04](./DD_Order_Insights_04_DTOS_AND_TYPES.md) | DTO and type definitions |
| [DD_OI_05](./DD_Order_Insights_05_BUSINESS_LOGIC.md) | Backend business rules |
| [DD_OI_06](./DD_Order_Insights_06_TEST_SPEC.md) | Test specification |
| [機能設計書_Order_Insights](../機能設計書_Order_Insights.md) | Full functional specification (§3, §5, §7, §8, §9, §12, §13) |
| [画面項目設計書_Order_Insights](../画面項目設計書_Order_Insights.md) | Screen items specification (§2, §3, §4, §6, §9) |
| [要件定義書_REQUIREMENT_SPEC](../../core-work/要件定義書_REQUIREMENT_SPEC.md) | §3.3 (Buyer), §4.5 (Merchant), §5.6 (Admin), §6.4 (data scope rules) |
| [データベース設計書_DATABASE_SPEC](../../core-work/データベース設計書_DATABASE_SPEC.md) | Entity schemas: `orders`, `order_items`, `order_status_history`, `order_statuses`, `merchants`, `shops`, `users`, `commission_settings` |

