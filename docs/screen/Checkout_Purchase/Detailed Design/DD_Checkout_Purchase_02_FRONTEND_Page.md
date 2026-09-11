# DD_CHECK-02 — Frontend Page (Checkout / Order Confirmation)

> **Doc ID:** SKM-DD-CHECK-02 | **Version:** 1.0 | **Status:** Draft
> **Last Updated:** 2026-09-03

---

## 1. Overview

The Checkout & Purchase pages consist of two main screens: **Checkout** (`/checkout`) and **Order Confirmation** (`/checkout/confirmation/:orderId`). Together they implement the buyer-facing purchase workflow — converting cart contents into a confirmed order with status `placed`, validating stock, applying coupon discounts, calculating totals (subtotal − discount), persisting order records, and rendering the post-purchase confirmation. The Checkout page also renders the sponsored ad slide-down panel (UC-CHECK-008, BR-AD-001~012).

- **File Path (Checkout):** `frontend/src/pages/Checkout.tsx`
- **File Path (Order Confirmation):** `frontend/src/pages/OrderConfirmation.tsx`
- **Route (Checkout):** `/checkout`
- **Route (Order Confirmation):** `/checkout/confirmation/:orderId`
- **Feature Container:** `frontend/src/features/checkout/` (components, hooks, schemas, services, types)
- **Shared Layout:** `BuyerLayout.tsx` — buyer role menu + header. The checkout flow is buyer-only; the route is guarded by `ProtectedRoute` with `roles={['buyer']}`.

### 1.1 Route Registry & Role Visibility

| Screen | Route | Role Guard | Data Scope | License Gate |
|--------|-------|-----------|------------|--------------|
| Checkout | `/checkout` | `buyer` | Own cart items, own shipping addresses, own payment records | — |
| Order Confirmation | `/checkout/confirmation/:orderId` | `buyer` | Order owned by `currentUser.id` (BR-CHECK-015) | — |


---

## 2. Layout Structure

### 2.1 Checkout Page Layout

```
┌──────────────────────────────────────────────────────────────┐
│                     BROWSER VIEWPORT                           │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [A] HEADER                                            │  │
│  │  Language Toggle EN/JA/MY | Theme Toggle               │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [D0] SPONSORED AD SLIDE-DOWN PANEL (slotAdCheckout)   │  │
│  │  ┌─────┐ ┌──────────────────────────┐ ┌────┐ ┌────┐   │  │
│  │  │ ◀   │ │ [D0a] Ad Image/Banner    │ │ ▶  │ │ ✕  │   │  │
│  │  └─────┘ │ [D0b] Title              │ └────┘ └────┘   │  │
│  │          │ [D0c] Description         │                 │  │
│  │          │ [D0d] CTA Button          │                 │  │
│  │          │ [D0e] Sponsored Badge     │                 │  │
│  │          │ [D0f] Slide Indicator     │                 │  │
│  │          └──────────────────────────┘                  │  │
│  │  (auto-slides every 5s, max 5 ads, pause-on-interaction)│  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [B] ORDER SUMMARY                                     │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │ [B1] Cart Items List                             │  │  │
│  │  │  Product Image | Name | Qty | Unit Price | Total │  │  │
│  │  ├──────────────────────────────────────────────────┤  │  │
│  │  │ [B2] Coupon Code Input    [Apply]                │  │  │
│  │  │ [B3] Applied Coupon Chip  [Remove]               │  │  │
│  │  ├──────────────────────────────────────────────────┤  │  │
│  │  │ Subtotal:    $xx.xx                              │  │  │
│  │  │ Discount:   -$x.xx                               │  │  │
│  │  │ ─────────────────────                            │  │  │
│  │  │ [B4] TOTAL:   $xx.xx                             │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [C] SHIPPING ADDRESS FORM                             │  │
│  │  [C1] Recipient Name    [C2] Phone Number             │  │
│  │  [C3] Address Line 1    [C4] Address Line 2           │  │
│  │  [C5] City              [C6] State/Province           │  │
│  │  [C7] Postal Code       [C8] Country                  │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [D] PAYMENT METHOD                                    │  │
│  │  ( ) [D1] Cash on Delivery    ( ) [D2] Credit Card    │  │
│  │  ( ) [D3] Bank Transfer                               │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [E] ORDER NOTES                                       │  │
│  │  [E1] Notes Textarea (optional)                        │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [F] PLACE ORDER BUTTON                                │  │
│  │  [    Place Order    ] (Primary, full-width)           │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  [G] GUEST LOGIN ALERT MODAL (overlay, conditional)           │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  "Please log in to complete your purchase."            │  │
│  │  [ Log in ]                                            │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  [H] LOADING OVERLAY (overlay, conditional)                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [Spinner]  Processing your order...                   │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

> **Scope boundary:** This Detailed Design covers **only** the Checkout page and the Order Confirmation page. Order History, Order Detail, and Order Tracking screens/endpoints/logic are **out of scope** — they belong to the Order Insights module (機能設計書 §1.2 vs 画面項目設計書 v1.0 revision history: "Order History, Order Detail, and Order Tracking pages are developed by the order status screen team"). This module creates the orders that Order Insights later reads.

### 2.2 Order Confirmation Page Layout

```
┌──────────────────────────────────────────────────────────────┐
│                     BROWSER VIEWPORT                           │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [A] HEADER                                            │  │
│  │  Language Toggle EN/JA/MY | Theme Toggle               │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [I] SUCCESS CONFIRMATION                              │  │
│  │          ✓ (Success Icon)                              │  │
│  │       "Thank You for Your Order!"                      │  │
│  │    "Your order has been placed successfully."          │  │
│  │                                                        │  │
│  │  Order Number:  abc12345                               │  │
│  │  Order Date:    2026-08-25                             │  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [K] ACTION BUTTONS                                    │  │
│  │  [ Continue Shopping ]    [ View Order Details ]       │  │
│  └────────────────────────────────────────────────────────┘  │
│  │  Payment Method: Cash on Delivery                      │  │
│  │  Estimated Delivery: 2026-08-30                        │  │
│  │  ─────────────────────────────────                     │  │
│  │  Order Summary (collapsed/expandable)                  │  │
│  │  Subtotal / Discount / Total                           │  │
│  └────────────────────────────────────────────────────────┘  │

---

## 3. Screen Sections — Checkout Page

### 3.1 Section [A]: Header

The shared `BuyerLayout` header provides language toggle (EN/JA/MY) and theme toggle. No checkout-specific header elements.

### 3.2 Section [D0]: Sponsored Ad Slide-Down Panel

> **This is the most complex section.** The sponsored ad panel is a slide-down carousel that fetches and displays merchant-purchased advertisements for the `checkout_top` placement. It must be documented in full — including carousel behavior, accessibility, and graceful degradation — per BR-AD-009~012.

#### 3.2.1 Panel Behavior & Lifecycle

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Component mounts (Checkout page loaded). Fetches in parallel to cart data; does not block checkout loading. |
| **API Endpoint** | `GET /api/v1/ads?placement=checkout_top` |
| **Request Headers** | None (public cache) |
| **Animation (appear)** | Slide-down, 300ms ease-out, once per mount. With `prefers-reduced-motion: reduce`, panel appears instantly without animation. |
| **Carousel Auto-Slide** | Auto-advance to next ad every 5 seconds using vertical slide-down transition (500ms). Maximum 5 slides; loop after the last. |
| **Pause-on-Interaction** | Auto-advancement pauses on hover or keyboard focus within the ad panel; resumes on pointer leave / blur (WCAG 2.2.2). |
| **Max Ads** | Maximum 5 ads displayed (BR-AD-004). |
| **Close** | Manual close (✕ button) hides the panel for the session. |


#### 3.2.2 Ad Priority & Selection Rules (BR-AD-005~008)

1. Filter: Select approved, active ads whose schedule covers the current time (`is_approved = true`, `is_active = true`, `schedule_start <= now <= schedule_end`).
2. Apply package placement and tier priority rules: **Premium > Standard > Basic**.
3. Round-robin rotation within each tier.
4. Limit the slider to a maximum of 5 ads.
5. Cache the resulting ad list in Redis with key `cache:ads:checkout-top`, TTL 5 minutes.
#### 3.2.3 Accessibility (WCAG 2.2.2)

- Pause-on-interaction: auto-advancement pauses on hover/focus, resumes on leave/blur.
- Reduced-motion: `prefers-reduced-motion: reduce` disables slide-down animation (instant appear) and disables auto-slide (static display of first ad only).
- Keyboard navigable: previous/next arrows and close button are focusable and operable.
- Ad content: image alt text from ad title; CTA button labeled with `ctaText`.

#### 3.2.4 Field / Item Table (画面項目設計書 §4.2)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `slotAdCheckout` | Ad Panel Container / 広告パネルコンテナ | Slide-Down Panel | — | No | Hidden (appears on successful ad fetch) | Slide-down 300ms ease-out; instant with reduced-motion | `advertisements` (checkout_top placement) | Graceful hide on error/empty. i18n key: `checkout.adPanel.container`. | EL-32 |
| 4 | `lblAdTitle` | Ad Title / 広告タイトル | Text (Heading) | String (255) | No | — | — | `advertisements.title` | — | EL-35 |
| 5 | `lblAdDescription` | Ad Description / 広告説明 | Text | String (500) | Conditional | Hidden when absent | — | `advertisements.description` | Only rendered when description is non-empty. i18n key: `checkout.adPanel.description`. | EL-36 |
| 6 | `btnAdCta` | Ad CTA Button / 広告CTAボタン | Button | String (50) | No | — | Opens `ctaUrl` in new tab | `advertisements.cta_text`, `advertisements.cta_url` | Click tracked via analytics. i18n key: `checkout.adPanel.cta`. | EL-37 |
| 7 | `lblAdSponsored` | Sponsored Badge / スポンサーバッジ | Badge | String | No | Text: "Sponsored" | — | Hardcoded UI text | i18n key: `checkout.adPanel.sponsored`. | EL-38 |
| 8 | `grpAdIndicator` | Slide Indicator / スライドインジケーター | Dot Indicator Group | — | No | Shows current slide position | — | — | One dot per ad (max 5). Active dot highlighted. i18n key: `checkout.adPanel.indicator`. | EL-39 |
| 9 | `btnAdPrev` | Previous Ad Button / 前広告ボタン | Icon Button (◀) | — | No | — | — | — | Pauses auto-advance on interaction. i18n key: `checkout.adPanel.prev`. | — |
| 10 | `btnAdNext` | Next Ad Button / 次広告ボタン | Icon Button (▶) | — | No | — | — | — | Pauses auto-advance on interaction. i18n key: `checkout.adPanel.next`. | — |

| **Graceful Degradation** | On API error or empty response: hide ad panel entirely (no error state shown to user). The panel is non-essential to checkout. |
| 2 | `btnAdClose` | Ad Close Button / 広告閉じるボタン | Icon Button (✕) | — | No | Visible when panel shown | — | — | Hides panel for session. i18n key: `checkout.adPanel.close`. | EL-33 |
| 3 | `imgAdBanner` | Ad Image/Banner / 広告画像 | Image | URL | No | — | Alt text = ad title | `advertisements.image_url` | i18n key: `checkout.adPanel.imageAlt`. | EL-34 |

### 3.3 Section [B]: Order Summary

Displays cart items, coupon input, applied coupon, and order totals (subtotal, discount, total).

#### Section [B1]: Cart Items List

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `tblCartItems` | Cart Items List / カート商品リスト | Table / List | — | Yes | Populated from cart data | — | `cart_items` → `products` | Each row shows product image, name, quantity, unit price, line total. i18n key: `checkout.orderSummary.items`. | EL-10 |
| 2 | `imgProductImage` | Product Image / 商品画像 | Image | URL | Yes | — | Alt text = product name | `products.image_url` | Thumbnail size. i18n key: `checkout.orderSummary.productImageAlt`. | EL-11 |
| 3 | `lblProductName` | Product Name / 商品名 | Text | String (255) | Yes | — | — | `products.name` | — | EL-12 |
| 4 | `lblQuantity` | Quantity / 数量 | Text | Integer | Yes | — | — | `cart_items.quantity` | — | EL-13 |
| 5 | `lblUnitPrice` | Unit Price / 単価 | Text | Decimal (10,2) | Yes | — | Currency format | `products.unit_price` | Locked at order creation (BR-CHECK-007). | EL-14 |
| 6 | `lblLineTotal` | Line Total / 小計 | Text | Decimal (10,2) | Yes | — | Currency format | Computed: `unit_price × quantity` | — | EL-15 |

#### Section [B2]: Coupon Code Input

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `inpCouponCode` | Coupon Code Input / クーポンコード入力 | Text Input | String (50) | No | Empty | Alphanumeric, uppercase auto-convert | `promotions.code` | i18n key: `checkout.coupon.input`. | EL-20 |
| 2 | `btnApplyCoupon` | Apply Coupon Button / クーポン適用ボタン | Button | — | No | Disabled until input non-empty | — | — | Triggers `POST /api/v1/checkout/coupon` validation. i18n key: `checkout.coupon.apply`. | EL-21 |


| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `chipAppliedCoupon` | Applied Coupon Chip / 適用クーポンチップ | Chip / Badge | String (50) | No | Hidden until coupon applied | — | `promotions.code` | Shows applied code + discount. i18n key: `checkout.coupon.appliedChip`. | EL-22 |

#### Section [B3]: Applied Coupon Chip

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |

#### Section [B4]: Order Totals

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `lblSubtotal` | Subtotal / 小計 | Text | Decimal (10,2) | Yes | Currency format | — | Computed: Σ line totals | BR-CHECK-008. i18n key: `checkout.orderSummary.subtotal`. | EL-24 |
| 2 | `lblDiscount` | Discount / 割引 | Text | Decimal (10,2) | No | "$0.00" or hidden | Currency format | Computed from coupon validation | BR-CHECK-009. Hidden when $0. i18n key: `checkout.orderSummary.discount`. | EL-25 |
| 3 | `lblTotal` | Total / 合計 | Text (Bold) | Decimal (10,2) | Yes | Currency format | — | Computed: subtotal − discount | BR-CHECK-010. i18n key: `checkout.orderSummary.total`. | EL-26 |
| 2 | `btnRemoveCoupon` | Remove Coupon Button / クーポン削除ボタン | Icon Button (✕) | — | No | Hidden until coupon applied | — | — | Clears discount, reverts total to subtotal (BR-CHECK-009, BR-CHECK-010). i18n key: `checkout.coupon.remove`. | EL-23 |

### 3.4 Section [C]: Shipping Address Form

Buyer enters shipping address. All fields required per BR-CHECK-004.

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `txtRecipientName` | Recipient Name / 受取人氏名 | Text Input | String (100) | Yes | Pre-filled from profile | 1–100 characters | `shipping_address.recipientName` | i18n key: `checkout.shipping.recipientName`. | EL-40 |
| 2 | `txtPhone` | Phone Number / 電話番号 | Text Input | String (20) | Yes | Empty | 1–20 characters, numeric | `shipping_address.phone` | i18n key: `checkout.shipping.phone`. | EL-44 |
| 3 | `txtAddress1` | Address Line 1 / 住所1 | Text Input | String (255) | Yes | Empty | 1–255 characters | `shipping_address.addressLine1` | i18n key: `checkout.shipping.addressLine1`. | EL-41 |
| 4 | `txtAddress2` | Address Line 2 / 住所2 | Text Input | String (255) | No | Empty | 0–255 characters | `shipping_address.addressLine2` | i18n key: `checkout.shipping.addressLine2`. | EL-42 |
| 5 | `txtCity` | City / 市区町村 | Text Input | String (100) | Yes | Empty | 1–100 characters | `shipping_address.city` | i18n key: `checkout.shipping.city`. | EL-43 |
| 6 | `txtState` | State/Province / 都道府県 | Text Input | String (100) | Yes | Empty | 1–100 characters | `shipping_address.state` | i18n key: `checkout.shipping.state`. | EL-45 |
| 7 | `txtPostalCode` | Postal Code / 郵便番号 | Text Input | String (20) | Yes | Empty | 1–20 characters | `shipping_address.postalCode` | i18n key: `checkout.shipping.postalCode`. | EL-46 |
| 8 | `selCountry` | Country / 国 | Select | String (100) | Yes | Empty | Options loaded from predefined list | `shipping_address.country` | i18n key: `checkout.shipping.country`. | EL-47 |

### 3.5 Section [D]: Payment Method

Buyer selects one payment method. Required per BR-CHECK-005.

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 38 | `rdoPaymentMethod` | Payment Method Group / 支払い方法グループ | Radio Group | — | Yes | Default: `cod` | Single selection required | `orders.payment_method` | Mandatory group. i18n key: `checkout.payment.group`. | EL-50 |
| 39 | `rdoCOD` | Cash on Delivery / 代金引換 | Radio Button | — | — | Default selected | Value: `cod` | — | Sub-option of `rdoPaymentMethod`. i18n key: `checkout.payment.cod`. | — |
| 40 | `rdoBankTransfer` | Bank Transfer / 銀行振込 | Radio Button | — | — | Unselected | Value: `bank_transfer` | — | Sub-option of `rdoPaymentMethod`. i18n key: `checkout.payment.bankTransfer`. | — |
| 41 | `rdoCard` | Card Payment / カード決済 | Radio Button | — | — | Unselected | Value: `card` | — | Sub-option of `rdoPaymentMethod`. Stubbed for MVP. i18n key: `checkout.payment.card`. | — |

### 3.6 Section [E]: Order Notes

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 42 | `lblNotes` | Order Notes Label / 備考ラベル | Static Label (`<label>`) | String | — | Always displayed. Text: "Order Notes (optional)" / "備考（任意）" | — | Hardcoded UI text | Associated with `txtNotes`. i18n key: `checkout.notes`. | — |
| 43 | `txtNotes` | Order Notes Textarea / 備考テキストエリア | Textarea (`<textarea>`) | TEXT(500) | No | Empty. Placeholder: "Notes for the merchant..." / "出品者への備考..." | MaxLength: 500 | `orders.notes` | i18n key: `checkout.notes.textarea`. | — |

### 3.7 Section [F]: Place Order Button

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 44 | `btnPlaceOrder` | Place Order Button / 注文を確定するボタン | Button (`submit`, `primary`, `lg`) | — | — | Visible. Text: "Place Order" / "注文を確定する" | — | — | Full width. Loading: Spinner + "Placing order...". Disabled when form invalid or submitting. i18n key: `checkout.placeOrder`. | — |

### 3.8 Section [G]: Guest Login Alert Modal

> **Distinct section — not merged into generic error state.** Per BR-CHECK-003, if a guest (unauthenticated) user attempts to place an order, a modal alerts them to log in. This is a checkout-specific flow, not a generic error.

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 45 | `dlgGuestAlert` | Guest Login Alert Modal / ゲストログインアラートモーダル | Dialog/Modal | — | Conditional | Hidden by default. Shown when guest attempts checkout. | — | — | i18n key: `checkout.guestLoginAlert`. | EL-65 |
| 46 | `lblGuestAlertMessage` | Alert Message / 警告メッセージ | Static Label (`<p>`) | String | — | Visible inside modal. Text: "Please log in to complete your purchase." / "購入を完了するにはログインしてください。" | — | Hardcoded UI text | i18n key: `checkout.guestAlert.message`. | EL-66 |
| 47 | `btnGuestLogin` | Log In Button / ログインボタン | Button (`button`, `default`) | — | — | Visible inside modal. Text: "Log in" / "ログイン" | — | — | Navigates to `/login`. i18n key: `checkout.guestAlert.login`. | EL-67 |

### 3.9 Section [H]: Loading Overlay

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 48 | `ovlLoading` | Loading Overlay / 読み込みオーバーレイ | Overlay (`<div>`) | — | Conditional | Hidden by default. Shown during order submission. | — | — | Tailwind: `fixed inset-0 z-50 bg-background/80 flex items-center justify-center`. Spinner + "Processing your order...". i18n key: `checkout.loading.overlay`. | EL-70 |

## 4. Screen Sections — Order Confirmation Page

### 4.1 Section [I]: Success Confirmation

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 49 | `icoSuccess` | Success Icon | Icon (`CheckCircle2`) | — | — | Visible. Large green checkmark. | — | — | Lucide icon. Tailwind: `h-16 w-16 text-green-500 mx-auto`. | — |
| 50 | `lblConfirmTitle` | Success Title | Heading (`<h1>`) | String | — | Visible. Text: "Order Placed Successfully!" / "注文が完了しました！" | — | Hardcoded UI text | i18n key: `checkout.confirmation.title`. Tailwind: `text-2xl font-bold text-center mt-4`. | EL-81 |
| 51 | `lblConfirmOrderId` | Order ID | Static Label (`<p>`) | UUID | — | Visible. "Order #ABC-12345" | — | `orders.id` | i18n key: `checkout.confirmation.orderId`. Displays first 8 chars of UUID. Tailwind: `text-center text-muted-foreground`. | EL-83 |
| 52 | `lblConfirmStatus` | Order Status Badge | Badge | Enum | — | Visible. Status: "Placed" | — | `orders.status` | i18n key: `checkout.confirmation.status`. Color-coded badge. | — |
| 53 | `lblConfirmEstDelivery` | Estimated Delivery | Static Label (`<p>`) | Date | Conditional | Visible for shipped/out_for_delivery orders. | — | Calculated | i18n key: `checkout.confirmation.estimatedDelivery`. Tailwind: `text-center text-muted-foreground`. | EL-86 |
| 54 | `cardConfirmSummary` | Order Summary Card | Card | — | — | Visible. Contains items, totals, shipping address. | — | Order data | Tailwind: `mt-6 border rounded-lg p-4`. | — |

### 4.2 Section [K]: Action Buttons

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules | Maps to (EL) |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 55 | `btnContinueShopping` | Continue Shopping Button | Button (`button`, `primary`) | — | — | Visible. Text: "Continue Shopping" / "買い物を続ける" | — | — | i18n key: `checkout.confirmation.continueShopping`. Navigates to `/products`. Tailwind: `w-full`. | EL-90 |
| 56 | `btnViewOrder` | View Order Button | Button (`button`, `secondary`) | — | — | Visible. Text: "View Order" / "注文を表示" | — | — | i18n key: `checkout.confirmation.viewOrder`. Navigates to `/orders/:orderId`. Tailwind: `w-full`. | EL-91 |
| 57 | `btnPrintReceipt` | Print Receipt Button | Button (`button`, `ghost`) | — | — | Visible. Text: "Print Receipt" / "領収書を印刷" | — | — | i18n key: `checkout.confirmation.print`. Calls `window.print()`. Tailwind: `w-full`. | — |

---

## 5. Form State & Validation (React Hook Form + Zod)

The Checkout page form state is managed with **React Hook Form** (`useForm`) and validated with **Zod** (`@hookform/resolvers`). The form covers two distinct validation surfaces: the **shipping address fields** (§3.4) and the **coupon code input** (§3.2/§3.3). Each surface has its own Zod schema and its own hook instance, composed together at the page level.

### 5.1 Shipping Address Schema (`shippingAddressSchema`)

Covers the `ShippingAddressForm` fields (EL-40–EL-47). All constraints mirror the Input Constraints column in §3.4.

```ts
// frontend/src/features/checkout/schemas/shippingAddressSchema.ts
import { z } from 'zod';

export const shippingAddressSchema = z.object({
  /** EL-40 — Recipient Name / 受取人氏名 · required · max 100 chars */
  recipientName: z
    .string()
    .min(1, { message: 'checkout.shipping.recipientName.required' })
    .max(100, { message: 'checkout.shipping.recipientName.max' }),

  /** EL-41 — Phone Number / 電話番号 · required · max 20 chars */
  phone: z
    .string()
    .min(1, { message: 'checkout.shipping.phone.required' })
    .max(20, { message: 'checkout.shipping.phone.max' }),

  /** EL-42 — Address Line 1 / 住所1 · required · max 200 chars */
  addressLine1: z
    .string()
    .min(1, { message: 'checkout.shipping.addressLine1.required' })
    .max(200, { message: 'checkout.shipping.addressLine1.max' }),

  /** EL-43 — Address Line 2 / 住所2 · optional · max 200 chars */
  addressLine2: z
    .string()
    .max(200, { message: 'checkout.shipping.addressLine2.max' })
    .optional()
    .or(z.literal('')),

  /** EL-44 — City / 市区町村 · required · max 100 chars */
  city: z
    .string()
    .min(1, { message: 'checkout.shipping.city.required' })
    .max(100, { message: 'checkout.shipping.city.max' }),

  /** EL-45 — State/Province · optional · max 100 chars */
  state: z
    .string()
    .max(100, { message: 'checkout.shipping.state.max' })
    .optional()
    .or(z.literal('')),

  /** EL-46 — Postal Code / 郵便番号 · required · max 20 chars */
  postalCode: z
    .string()
    .min(1, { message: 'checkout.shipping.postalCode.required' })
    .max(20, { message: 'checkout.shipping.postalCode.max' }),

  /** EL-47 — Country / 国 · required · select */
  country: z
    .string()
    .min(1, { message: 'checkout.shipping.country.required' }),
});

export type ShippingAddressInput = z.infer<typeof shippingAddressSchema>;
```

### 5.2 Coupon Code Schema (`couponCodeSchema`)

Covers the `CouponInput` field (EL-14). Mirrors the alphanumeric 8–12 char constraint in §3.2/§3.3.

```ts
// frontend/src/features/checkout/schemas/couponCodeSchema.ts
import { z } from 'zod';

export const couponCodeSchema = z.object({
  /** EL-14 — Coupon Code / クーポンコード · optional · alphanumeric 8–12 chars */
  couponCode: z
    .string()
    .regex(/^[A-Za-z0-9]{8,12}$/, {
      message: 'checkout.coupon.format',
    })
    .optional()
    .or(z.literal('')),
});

export type CouponCodeInput = z.infer<typeof couponCodeSchema>;
```

### 5.3 Hook Composition

The page composes two `useForm` instances — one for shipping (submitted with the order) and one for the coupon (validated on Apply). A thin `useCheckoutForm` hook wires them together and exposes the combined submit handler.

```ts
// frontend/src/features/checkout/hooks/useCheckoutForm.ts
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { shippingAddressSchema, ShippingAddressInput } from '../schemas/shippingAddressSchema';
import { couponCodeSchema, CouponCodeInput } from '../schemas/couponCodeSchema';

export function useCheckoutForm(onSubmit: (data: ShippingAddressInput) => void) {
  /** Shipping address form — submitted with Place Order (§3.4, EL-40–EL-47) */
  const shippingForm = useForm<ShippingAddressInput>({
    resolver: zodResolver(shippingAddressSchema),
    defaultValues: {
      recipientName: '',
      phone: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
    },
    mode: 'onBlur',
  });

  /** Coupon code form — validated on Apply Coupon (§3.2/§3.3, EL-14) */
  const couponForm = useForm<CouponCodeInput>({
    resolver: zodResolver(couponCodeSchema),
    defaultValues: { couponCode: '' },
    mode: 'onSubmit',
  });

  return { shippingForm, couponForm, onSubmit };
}
```

> **Validation enforcement (FDS §6.6):** client-side Zod is the first layer; the backend NestJS `ValidationPipe` + class-validator DTOs enforce the same constraints server-side, with Prisma constraints as the final safety net.

---

## 6. Sub-Components

Every reusable component implied by the layout (§2) and screen sections (§3–§4). All paths resolve under the feature container `frontend/src/features/checkout/`.

| # | Component | File Path | Purpose | Props |
| :---: | :--- | :--- | :--- | :--- |
| 1 | `AdCarousel` | `components/AdCarousel.tsx` | Renders the sponsored ad slide-down panel (§2.1 [D0], EL-32–EL-39). Horizontal carousel, 5s auto-slide, max 5 ads, pause-on-interaction (WCAG 2.2.2). | `ads: Ad[]` · `autoSlideInterval?: number` (default `5000`) · `maxSlides?: number` (default `5`) · `onSlideChange?: (index: number) => void` · `onCtaClick?: (ad: Ad) => void` |
| 2 | `CartItemsList` | `components/CartItemsList.tsx` | Renders the cart items table in the Order Summary (§3.2 [B1], EL-10–EL-13). Product image, name, qty, unit price, line total. | `items: CartItem[]` · `loading?: boolean` |
| 3 | `CouponInput` | `components/CouponInput.tsx` | Coupon code text field + Apply button (§3.2/§3.3 [B2], EL-14–EL-15). Validates 8–12 alphanumeric format via `couponCodeSchema`. | `control: Control<CouponCodeInput>` · `onApply: (code: string) => void` · `error?: string` · `disabled?: boolean` |
| 4 | `OrderTotalsPanel` | `components/OrderTotalsPanel.tsx` | Displays subtotal, discount, and total (§3.6 [B4], EL-22–EL-24). Discount row hidden when $0. | `subtotal: number` · `discount: number` · `total: number` · `currency?: string` (default `'USD'`) |
| 5 | `ShippingAddressForm` | `components/ShippingAddressForm.tsx` | Shipping address fields (§3.4 [C], EL-40–EL-47). Composed from `useCheckoutForm().shippingForm`. | `control: Control<ShippingAddressInput>` · `errors: FieldErrors<ShippingAddressInput>` · `disabled?: boolean` |
| 6 | `PaymentMethodSelector` | `components/PaymentMethodSelector.tsx` | Payment method radio group (§3.5 [E], EL-20–EL-21). Options: cod / credit_card / bank_transfer (§8). | `control: Control<{ paymentMethod: string }>` · `options: PaymentMethodOption[]` · `error?: string` |
| 7 | `GuestLoginModal` | `components/GuestLoginModal.tsx` | Alert modal shown on guest order attempt (§3.8 [G], EL-65–EL-67). "Please log in to complete your purchase." | `isOpen: boolean` · `onLogin: () => void` (navigates to `/login?redirect=/checkout`) · `onClose: () => void` |
| 8 | `OrderConfirmationSummary` | `components/OrderConfirmationSummary.tsx` | Read-only order summary on the confirmation page (§4.1 [I], EL-81–EL-89). Order number, date, payment method, estimated delivery, subtotal, discount, total. | `order: OrderConfirmation` · `onContinueShopping: () => void` · `onViewOrderDetails: () => void` |

---

## 7. Action Buttons & Handlers

Each interactive button in the Checkout and Order Confirmation flows, with its handler, pre-conditions, and outcome.

| # | Button | Item ID (EL) | Handler | Pre-Conditions / Guards | Outcome / Side Effects |
| :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | Apply Coupon | EL-15 (`btnApplyCoupon`) | `handleApplyCoupon` | `couponCode` passes `couponCodeSchema` (8–12 alphanumeric); cart subtotal ≥ coupon `min_order_amount` (FDS §8.2) | Calls `POST /api/v1/coupons/validate`. On 200: updates `discount` + `total` in Order Totals Panel (§3.6), renders applied coupon chip (EL-16). On 400/404/409: surfaces field-level error via `CouponInput` (§9). |
| 2 | Remove Coupon | EL-17 (`btnRemoveCoupon`) | `handleRemoveCoupon` | An applied coupon chip (EL-16) is currently displayed | Clears coupon state, resets `discount` to $0, recalculates `total = subtotal`, hides applied chip (EL-16). No API call. |
| 3 | Place Order | EL-25 (`btnPlaceOrder`) | `handlePlaceOrder` | Shipping address form valid (`shippingAddressSchema`); `paymentMethod` selected; `currentUser` is not null (buyer authenticated) | 1. If `currentUser` is null → open `GuestLoginModal` (§3.8, EL-65). 2. Else → show loading overlay (§3.9, EL-68), call `POST /api/v1/orders`. On 201: navigate to `/checkout/confirmation/:orderId`. On 400/409/401/500: hide overlay, surface form-level error (§9). |
| 4 | Continue Shopping | EL-90 (`btnContinueShopping`) | `handleContinueShopping` | Rendered on Order Confirmation page (§4.2 [K]) | Navigates to `/products`. |
| 5 | View Order | EL-91 (`btnViewOrder`) | `handleViewOrder` | Rendered on Order Confirmation page (§4.2 [K]); `orderId` in route params | Navigates to `/orders/:orderId` (Order Insights module, DD_Order_Insights_02). |

> **Loading overlay note:** the overlay (§3.9, EL-68) is shown synchronously before the Place Order API call and hidden on both success and error paths. It blocks double-submission and mirrors the pattern in DD_Order_Insights_02 §5.

---

## 8. Lookup Data

Static and enum-style data used by the Checkout form and confirmation page.

### 8.1 Payment Method Options

Used by `PaymentMethodSelector` (§3.5 [E], EL-20–EL-21). Values map to `orders.payment_method` (FDS §7.3).

| Value | Label (EN) | Label (JA) | i18n Key | Remarks |
| :--- | :--- | :--- | :--- | :--- |
| `cod` | Cash on Delivery | 代金引換 | `checkout.payment.cod` | Default selection (§3.5) |
| `credit_card` | Credit Card | クレジットカード | `checkout.payment.creditCard` | — |
| `bank_transfer` | Bank Transfer | 銀行振込 | `checkout.payment.bankTransfer` | — |

### 8.2 Coupon Error Code Lookups

Error codes returned by `POST /api/v1/coupons/validate` and mapped to field-level messages on `CouponInput` (§3.2/§3.3, EL-14). Codes sourced from FDS §9.

| Error Code | Condition | Field Message (EN) | Field Message (JA) | i18n Key |
| :--- | :--- | :--- | :--- | :--- |
| `COUPON_001` | Coupon code format invalid (fails `couponCodeSchema`) | Invalid coupon code format | 無効なクーポンコード形式です | `checkout.coupon.format` |
| `COUPON_002` | Cart subtotal below coupon `min_order_amount` | Minimum order amount not reached | 最低注文金額に達していません | `checkout.coupon.minOrder` |
| `COUPON_003` | Coupon expired (`expiry_date < now`) | Coupon has expired | クーポンの有効期限が切れています | `checkout.coupon.expired` |
| `COUPON_004` | Coupon usage limit reached (`usage_count >= usage_limit`) | Coupon usage limit reached | クーポンの利用上限に達しました | `checkout.coupon.limitReached` |
| `COUPON_005` | Coupon not found (404) | Coupon not found | クーポンが見つかりません | `checkout.coupon.notFound` |

---

## 9. Error Handling

Two error layers: **field-level** (Zod validation, surfaced inline on the form) and **form-level** (API errors, surfaced as toast notifications or modal).

### 9.1 Field-Level Validation Errors

Surfaced by React Hook Form via the Zod resolvers (§5). Each message maps to an i18n key shown next to the offending field.

| Field | Item ID (EL) | Validation | Error Message (EN) | i18n Key |
| :--- | :--- | :--- | :--- | :--- |
| Recipient Name | EL-40 (`txtRecipientName`) | Required · empty | Recipient name is required | `checkout.shipping.recipientName.required` |
| Recipient Name | EL-40 (`txtRecipientName`) | Max length · > 100 chars | Recipient name must be 100 characters or less | `checkout.shipping.recipientName.max` |
| Phone | EL-41 (`txtPhone`) | Required · empty | Phone number is required | `checkout.shipping.phone.required` |
| Phone | EL-41 (`txtPhone`) | Max length · > 20 chars | Phone number must be 20 characters or less | `checkout.shipping.phone.max` |
| Address Line 1 | EL-42 (`txtAddress1`) | Required · empty | Address line 1 is required | `checkout.shipping.addressLine1.required` |
| Address Line 2 | EL-43 (`txtAddress2`) | Max length · > 200 chars | Address line 2 must be 200 characters or less | `checkout.shipping.addressLine2.max` |
| City | EL-44 (`txtCity`) | Required · empty | City is required | `checkout.shipping.city.required` |
| Postal Code | EL-46 (`txtPostalCode`) | Required · empty | Postal code is required | `checkout.shipping.postalCode.required` |
| Country | EL-47 (`selCountry`) | Required · empty | Country is required | `checkout.shipping.country.required` |
| Coupon Code | EL-14 (`txtCouponCode`) | Format · not 8–12 alphanumeric | Invalid coupon code format | `checkout.coupon.format` |

### 9.2 Form-Level API Errors

Surfaced as toast notifications (`alertError`) or modal, sourced from FDS §9 error codes.

| Error Code | HTTP | Condition | Trigger | UI Response | i18n Key |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `CHECK_002` | 409 | Stock unavailable at submission | Place Order (EL-25) | Toast: "Some items are no longer available. Please review your cart." | `checkout.error.stockUnavailable` |
| `AUTH_001` | 401 | Missing/invalid JWT (guest blocked) | Place Order (EL-25) | Open `GuestLoginModal` (EL-65) → redirect to `/login?redirect=/checkout` | `checkout.guestAlert.message` |
| `CHECK_003` | 400 | Invalid coupon at order placement | Place Order (EL-25) with applied coupon | Toast: "Invalid coupon code" | `checkout.error.invalidCoupon` |
| `CHECK_004` | 403 | Non-buyer role | Any authenticated action | Toast: "Shopping features are only available to buyers" | `checkout.error.nonBuyer` |
| `SYS_001` | 500 | Server error | Any API call | Toast: "Something went wrong. Please try again." | `checkout.error.serverError` |
| `NET_ERR` | — | Network error | Any API call | Toast: "Network error. Please check your connection" | `checkout.error.network` |

> **Error handling pattern (FDS §6.6):** client-side Zod catches format errors before any API call. Server-side errors (400/401/403/409/500) are caught in the handler, the loading overlay (§3.9) is hidden, and the appropriate toast or modal is shown. The guest-check (401) path opens the modal rather than a toast, matching the §3.8 behavior.

---

## 10. State Management

### 10.1 Checkout Page State

The Checkout page maintains the following client-side UI state:

| State | Description |
|---|---|
| `orderSummaryVisible` | Order summary panel is visible when checkout data is available. |
| `shippingFormVisible` | Shipping address form is visible for authenticated buyers. |
| `paymentMethodVisible` | Payment method panel is visible when checkout is available. |
| `orderNotesVisible` | Optional order notes panel is visible. |
| `adPanelOpen` | Sponsored ad panel is open after a successful ad fetch. |
| `adPanelClosed` | Sponsored ad panel was manually closed for the session. |
| `loadingOverlayVisible` | Loading overlay is visible while the order submission is in progress. |
| `guestModalVisible` | Guest login modal is visible when an unauthenticated user attempts to place an order. |

### 10.2 Checkout Form State

Checkout form values, validation, dirty/touched state, and schema behavior are defined in §5, **Form State & Validation (React Hook Form + Zod)**.

### 10.3 Coupon State

Coupon application follows this client-side runtime state machine:

| State | Description | Transition |
|---|---|---|
| `idle` | No coupon validation is currently running and no coupon is applied. | User submits a coupon code → `validating` |
| `validating` | Coupon validation request is in progress. | Successful validation → `applied`; failed validation → `error` |
| `applied` | A coupon is applied and the discount and total are displayed. | User removes the coupon → `idle`; user applies another coupon → `validating` |
| `error` | The latest coupon validation failed and no new coupon was applied. | User submits a new coupon code → `validating`; user clears the code → `idle` |

Coupon error codes and their messages are defined in §8.2.

### 10.4 Sponsored Ad Panel State

The sponsored ad panel described in §2.1 `[D0]` maintains the following state:

| State | Description |
|---|---|
| `slideIndex` | Zero-based index of the currently displayed ad, limited to the available ads. |
| `autoSlideTimer` | Timer that advances the carousel every 5 seconds when auto-slide is active. |
| `pausedOnInteraction` | Auto-slide is paused while the pointer hovers over the panel or keyboard focus remains within it, then resumes on pointer leave or blur (画面項目設計書 §5.2, WCAG 2.2.2). |
| `closed` | The panel is hidden after the buyer selects the close button and remains closed for the session. |
| `reducedMotion` | The entrance animation is skipped and the panel appears instantly when `prefers-reduced-motion: reduce` is enabled; carousel rotation continues unchanged (画面項目設計書 §4.2, §5.2). |

### 10.5 Order Submission State

Order submission uses the following state values:

| State | Description |
|---|---|
| `idle` | No order submission is in progress. |
| `submitting` | The order request is being processed and the loading overlay is visible. |
| `success` | The order was created successfully and navigation to the confirmation page is initiated. |
| `error` | The order request failed and the submission state has returned to an actionable error state. |

Handler logic is defined in §7, **Action Buttons & Handlers**. API error responses are defined in §9.2, **Form-Level API Errors**.

### 10.6 Order Confirmation Page State

On load, the Order Confirmation page holds the following client-side state:

| State | Description |
|---|---|
| `loading` | Confirmation data for the route `orderId` is being fetched. |
| `loaded` | The owned order confirmation data is available and the success summary is rendered. |
| `error` | Confirmation data could not be loaded, including an invalid, missing, or unauthorized order. |

---

## 11. Responsive Layout Breakpoints

The Checkout and Order Confirmation pages use the following responsive layout behavior:

| Breakpoint | Min Width | Layout Behavior |
|---|---:|---|
| Mobile (default) | 0px | Order summary, shipping form, and payment method render in a single stacked column. The sponsored ad panel uses a stacked layout with the full-width image above the title, description, and full-width CTA. The screen-item specification does not define responsive behavior for the Order Confirmation page in this breakpoint row. (画面項目設計書 §3.2; ad details: §4.2) |
| Tablet (`md:`) | 768px | Order summary, shipping form, and payment method remain in a single stacked column. Only the sponsored ad panel changes to a horizontal layout with the image on the left and text content on the right, spanning the full container width. The screen-item specification does not define responsive behavior for the Order Confirmation page in this breakpoint row. (画面項目設計書 §3.2; ad details: §4.2) |
| Desktop (`lg:`) | 1024px | The specification explicitly defines a two-column checkout layout with the order summary on the left and shipping address on the right. It does not explicitly define a separate responsive placement for the payment method or the Order Confirmation page. The sponsored ad panel uses a horizontal layout and spans the full container width above the columns. (画面項目設計書 §3.2; ad details: §4.2) |
| Wide (`xl:`) | 1280px | The specification states that the layout is the same as `lg:` with enhanced spacing, and that the sponsored ad panel remains identical to `lg:` with enhanced spacing. It does not explicitly define additional responsive behavior for the payment method or the Order Confirmation page. (画面項目設計書 §3.2; ad details: §4.2) |

---

## 12. Cross-References

| Related Document | Purpose |
|---|---|
| [DD_CHECK-01](./DD_Checkout_Purchase_01_MODULE_OVERVIEW.md) | Module overview, use cases, and architecture |
| [DD_CHECK-03](./DD_Checkout_Purchase_03_API_ENDPOINTS.md) | Backend REST API contract for `GET /api/v1/checkout`, `POST /api/v1/checkout/validate-coupon`, `POST /api/v1/orders` |
| [DD_CHECK-04](./DD_Checkout_Purchase_04_DTOS_AND_TYPES.md) | DTO and type definitions consumed by these endpoints |
| [DD_CHECK-05](./DD_Checkout_Purchase_05_BUSINESS_LOGIC.md) | Backend business rules — order-placement transaction, coupon validation, sponsored ad selection |
| [DD_CHECK-06](./DD_Checkout_Purchase_06_TEST_SPEC.md) | Test specification |
| [機能設計書_Checkout_Purchase](../機能設計書_Checkout_Purchase.md) | Full functional specification |
| [画面項目設計書_Checkout_Purchase](../画面項目設計書_Checkout_Purchase.md) | Screen items specification |