# Screen Items Specification (画面項目設計書) — Purchase & Checkout

**Document ID:** SKM-SIS-SCR-CHECKOUT-001  
**Target Screen:** Checkout & Order Placement (チェックアウト・注文)  
**Subsystem:** Buyer Module — Checkout & Order Placement  
**Function ID:** FN-CHECK-001, FN-ORDER-001  
**Version:** 1.0  
**Created:** 2026-08-25  
**Last Updated:** 2026-08-25  
**Author:** Senior System Engineer  
**Review Status:** Released (承認済み)  
**Classification:** Internal — Engineering Division

---

## 1. Document Control (ドキュメント管理)

### 1.1 Document Revision History

| Version | Date | Author | Description of Changes |
| :--- | :--- | :--- | :--- |
| 1.0 | 2026-08-25 | Senior System Engineer | Initial release. Screen items specification for Checkout and Order Confirmation pages. Order History, Order Detail, and Order Tracking pages are developed by the order status screen team. Aligned with REQUIREMENT_SPEC v2.11, DATABASE_SPEC v2.5, DEVELOPMENT_RULES v2.1, and Functional Specification v1.2. |

### 1.2 Related Documents

| No. | Document ID | Document Name | File Path | Remarks |
| :-- | :--- | :--- | :--- | :--- |
| 1 | SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | Business workflow logic, required fields, and rules. |
| 2 | SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | Table structures (`orders`, `order_items`, `promotions`), constraints. |
| 3 | SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | Security rules, design tokens, error responses. |
| 4 | SKM-FDS-CHECKOUT-001 | Functional Specification — Checkout | `docs/screen/Checkout_Purchase/機能設計書_Checkout_Purchase.md` | Use cases, state transitions, validation rules, error handling. |

---

## 2. Screen Overview & Purpose (画面概要・目的)

### 2.1 Purpose (目的)
The Checkout and Order Confirmation pages provide the purchase workflow for authenticated buyers on the Cosmetics Finder platform. These screens convert cart contents into confirmed orders while validating stock availability, applying coupon discounts, calculating totals, and persisting order records for merchant fulfillment.

### 2.2 Target Users & Roles (対象ユーザーと権限)

| Attribute | Value |
| :--- | :--- |
| **Primary Actors** | Authenticated Buyer |
| **Required Authentication** | JWT Bearer Token |
| **Data Scope** | Own orders, own shipping addresses, own payment records |
| **Guest Behavior** | Checkout unavailable. When a guest user attempts to access `/checkout`, an alert modal is displayed: "Please log in to complete your purchase." Clicking [Log in] navigates to the login page (`/login`). |

### 2.3 Core Functions & Basic Design Principles (主要機能・基本設計方針)
1. **Checkout Flow** — Guiding the user through shipping address entry, payment method selection, coupon application, and order summary review before final confirmation.
2. **Coupon Validation** — Validating and applying discount codes (percentage or fixed) at checkout, enforcing expiry, minimum order amount, and single-use constraints.
3. **Order Calculation** — Computing subtotal, discount amount, and final total based on cart items and applied coupons.
4. **Order Placement** — Creating order records with status `placed`, decrementing stock atomically, clearing the cart, and returning order confirmation.

---

## 3. Screen Layout (画面レイアウト構成)

### 3.1 Overall Page Structure (全体画面構成)

#### Checkout Page Layout (`/checkout`)
```text
┌──────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  [A] PAGE HEADER                                    │ │
│  │  [A1] Page Title "Checkout"                         │ │
│  │  [A2] Back to Cart Link                             │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌──────────────────────┐  ┌───────────────────────────┐ │
│  │ [B] ORDER SUMMARY    │  │ [C] SHIPPING ADDRESS      │ │
│  │   [B1] Items List    │  │   [C1] Recipient Name     │ │
│  │   [B2] Subtotal      │  │   [C2] Phone Number       │ │
│  │   [B3] Coupon Input  │  │   [C3] Address Line 1     │ │
│  │   [B4] Apply Button  │  │   [C4] Address Line 2     │ │
│  │   [B5] Discount      │  │   [C5] City               │ │
│  │   [B6] Remove Coupon │  │   [C6] State/Province     │ │
│  │   [B7] Total         │  │   [C7] Postal Code        │ │
│  └──────────────────────┘  │   [C8] Country            │ │
│                            └───────────────────────────┘ │
│                             ┌───────────────────────────┐│
│                             │ [D] PAYMENT METHOD        ││
│                             │   [D1] Payment Radio Group││
│                             │   [D2] Cash on Delivery   ││
│                             │   [D3] Bank Transfer      ││
│                             │   [D4] Card Payment       ││
│                             └───────────────────────────┘│
│                             ┌───────────────────────────┐│
│                             │ [E] ORDER NOTES           ││
│                             │   [E1] Notes Textarea     ││
│                             └───────────────────────────┘│
│                             ┌───────────────────────────┐│
│                             │ [F] PLACE ORDER           ││
│                             │   [F1] Place Order Button ││
│                             └───────────────────────────┘│
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  [G] GUEST LOGIN ALERT MODAL (conditional)          │ │
│  │  [G1] Alert Message                                 │ │
│  │  [G2] Log In Button                                 │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  [H] LOADING OVERLAY (conditional)                  │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

#### Order Confirmation Page Layout (`/checkout/confirmation/:orderId`)
```text
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              ┌─────────────────────────────┐            │
│              │  [I] SUCCESS SECTION        │            │
│              │   [I1] Success Icon         │            │
│              │   [I2] Success Title        │            │
│              │   [I3] Order ID             │            │
│              │   [I4] Order Status Badge   │            │
│              │   [I5] Estimated Delivery   │            │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │  [J] ORDER SUMMARY CARD     │            │
│              │   [J1] Order Items List     │            │
│              │   [J2] Subtotal             │            │
│              │   [J3] Discount             │            │
│              │   [J4] Total                │            │
│              │   [J5] Shipping Address     │            │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │  [K] ACTION BUTTONS         │            │
│              │   [K1] Continue Shopping    │            │
│              │   [K2] View Order           │            │
│              │   [K3] Print Receipt        │            │
│              └─────────────────────────────┘            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Responsive Layout Breakpoints (レスポンシブ対応)

| Breakpoint | Min Width | Checkout Layout |
| :--- | :--- | :--- |
| Mobile (default) | 0px | Single column: summary, then form |
| Tablet (`md:`) | 768px | Two-column: summary left, form right (narrower) |
| Desktop (`lg:`) | 1024px | Two-column: summary left, form right |
| Wide (`xl:`) | 1280px | Two-column: summary left, form right |

---

## 4. Item Definitions (画面項目定義)

### 4.1 Section [A]: Checkout Page Header (チェックアウトページヘッダー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 1 | `lblCheckoutTitle` | Page Title | Heading (`<h1>`) | String | — | Visible. Text: "Checkout" / "チェックアウト" | — | Hardcoded UI text | i18n key: `checkout.title`. Tailwind: `text-2xl font-bold`. |
| 2 | `lnkBackToCart` | Back to Cart Link | Link (`<Link>`) | String | — | Visible. Text: "← Back to Cart" / "← カートに戻る" | — | — | i18n key: `checkout.backToCart`. Navigates to `/cart`. Tailwind: `text-sm text-muted-foreground hover:text-primary`. |

### 4.2 Section [B]: Order Summary (注文サマリー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 3 | `lstOrderItems` | Order Items List | List (`<ul>`) | Array | — | Visible. Populated from cart items. | — | `cart_items` JOIN `products` | Each item shows product image, name, unit price, quantity, line total. |
| 4 | `itmOrderItem` | Order Item Row | Row (`<li>`) | Object | — | Visible per cart item. | — | `cart_items.quantity`, `products.name`, `products.price`, `products.images` | Tailwind: `flex items-center gap-4 py-3 border-b`. |
| 5 | `imgOrderItem` | Product Image | Image (`<img>`) | URL | — | Visible. Product thumbnail. | — | `products.images[0]` | Tailwind: `h-16 w-16 rounded-md object-cover`. |
| 6 | `lblOrderItemName` | Product Name | Static Label (`<span>`) | String(255) | — | Visible. Product display name. | — | `products.name` | Tailwind: `font-medium`. |
| 7 | `lblOrderItemQty` | Quantity | Static Label (`<span>`) | Integer | — | Visible. "Qty: {quantity}" | — | `cart_items.quantity` | Tailwind: `text-sm text-muted-foreground`. |
| 8 | `lblOrderItemPrice` | Unit Price | Static Label (`<span>`) | Decimal(10,2) | — | Visible. Formatted price. | — | `products.price` | Tailwind: `text-sm`. Currency formatted. |
| 9 | `lblOrderItemTotal` | Line Total | Static Label (`<span>`) | Decimal(10,2) | — | Visible. "unit_price × quantity". | — | Calculated | Tailwind: `font-medium`. Currency formatted. |
| 10 | `lblSubtotal` | Subtotal Label | Static Label (`<span>`) | String | — | Visible. Text: "Subtotal" / "小計" | — | Hardcoded UI text | i18n key: `checkout.subtotal`. |
| 11 | `lblSubtotalValue` | Subtotal Value | Static Label (`<span>`) | Decimal(10,2) | — | Visible. Sum of all line totals. | — | Calculated | Tailwind: `font-medium`. Currency formatted. |
| 12 | `txtCouponCode` | Coupon Code Input | Input (`text`) | String(50) | No | Empty. Placeholder: "Enter coupon code" / "クーポンコードを入力" | MaxLength: 50. | — | i18n key: `checkout.couponCode`. Tailwind: `w-full`. |
| 13 | `btnApplyCoupon` | Apply Coupon Button | Button (`button`, `secondary`) | — | — | Visible. Text: "Apply" / "適用" | — | — | i18n key: `checkout.applyCoupon`. Tailwind: `ml-2`. Loading: Spinner + "Applying...". |
| 14 | `lblDiscount` | Discount Amount | Static Label (`<span>`) | Decimal(10,2) | Conditional | Hidden by default. Shown when coupon applied. Text: "-$X.XX" / "-¥X.XX" | — | `orders.discount_amount` | i18n key: `checkout.discount`. Tailwind: `text-green-600 font-medium`. |
| 15 | `btnRemoveCoupon` | Remove Coupon Button | Button (`button`, `ghost`) | — | Conditional | Hidden by default. Shown when coupon applied. Text: "Remove" / "削除" | — | — | i18n key: `checkout.removeCoupon`. Tailwind: `text-sm text-destructive`. |
| 16 | `lblTotal` | Total Label | Static Label (`<span>`) | String | — | Visible. Text: "Total" / "合計" | — | Hardcoded UI text | i18n key: `checkout.total`. |
| 17 | `lblTotalValue` | Total Value | Static Label (`<span>`) | Decimal(10,2) | — | Visible. "subtotal - discount". Must be > 0. | — | Calculated | Tailwind: `text-lg font-bold`. Currency formatted. |

### 4.3 Section [C]: Shipping Address Form (配送先住所フォーム)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 18 | `lblRecipientName` | Recipient Name Label | Static Label (`<label>`) | String | — | Always displayed. Text: "Recipient Name" / "受取人氏名" | — | Hardcoded UI text | i18n key: `checkout.recipientName`. Associated with `txtRecipientName`. |
| 19 | `txtRecipientName` | Recipient Name Input | Input (`text`) | String(200) | Mandatory | Empty. Placeholder: "Full name" / "氏名" | MaxLength: 200. MinLength: 1. | `shipping_address.recipientName` | AutoComplete: `name`. Tailwind: `w-full`. |
| 20 | `lblPhone` | Phone Number Label | Static Label (`<label>`) | String | — | Always displayed. Text: "Phone Number" / "電話番号" | — | Hardcoded UI text | i18n key: `checkout.phone`. Associated with `txtPhone`. |
| 21 | `txtPhone` | Phone Number Input | Input (`tel`) | String(20) | Mandatory | Empty. Placeholder: "Phone number" / "電話番号" | MaxLength: 20. | `shipping_address.phone` | AutoComplete: `tel`. InputMode: `tel`. |
| 22 | `lblAddress1` | Address Line 1 Label | Static Label (`<label>`) | String | — | Always displayed. Text: "Address Line 1" / "住所1" | — | Hardcoded UI text | i18n key: `checkout.address1`. Associated with `txtAddress1`. |
| 23 | `txtAddress1` | Address Line 1 Input | Input (`text`) | String(255) | Mandatory | Empty. Placeholder: "Street address" / "住所" | MaxLength: 255. | `shipping_address.addressLine1` | AutoComplete: `address-line1`. |
| 24 | `lblAddress2` | Address Line 2 Label | Static Label (`<label>`) | String | — | Always displayed. Text: "Address Line 2" / "住所2" | — | Hardcoded UI text | i18n key: `checkout.address2`. Associated with `txtAddress2`. |
| 25 | `txtAddress2` | Address Line 2 Input | Input (`text`) | String(255) | No | Empty. Placeholder: "Apartment, suite, unit, etc." / "マンション名・部屋番号など" | MaxLength: 255. | `shipping_address.addressLine2` | AutoComplete: `address-line2`. |
| 26 | `lblCity` | City Label | Static Label (`<label>`) | String | — | Always displayed. Text: "City" / "市区町村" | — | Hardcoded UI text | i18n key: `checkout.city`. Associated with `txtCity`. |
| 27 | `txtCity` | City Input | Input (`text`) | String(100) | Mandatory | Empty. Placeholder: "City" / "市区町村" | MaxLength: 100. | `shipping_address.city` | AutoComplete: `address-level2`. |
| 28 | `lblState` | State/Province Label | Static Label (`<label>`) | String | — | Always displayed. Text: "State/Province" / "都道府県" | — | Hardcoded UI text | i18n key: `checkout.state`. Associated with `txtState`. |
| 29 | `txtState` | State/Province Input | Input (`text`) | String(100) | Mandatory | Empty. Placeholder: "State/Province" / "都道府県" | MaxLength: 100. | `shipping_address.state` | AutoComplete: `address-level1`. |
| 30 | `lblPostalCode` | Postal Code Label | Static Label (`<label>`) | String | — | Always displayed. Text: "Postal Code" / "郵便番号" | — | Hardcoded UI text | i18n key: `checkout.postalCode`. Associated with `txtPostalCode`. |
| 31 | `txtPostalCode` | Postal Code Input | Input (`text`) | String(20) | Mandatory | Empty. Placeholder: "Postal code" / "郵便番号" | MaxLength: 20. | `shipping_address.postalCode` | AutoComplete: `postal-code`. |
| 32 | `lblCountry` | Country Label | Static Label (`<label>`) | String | — | Always displayed. Text: "Country" / "国" | — | Hardcoded UI text | i18n key: `checkout.country`. Associated with `selCountry`. |
| 33 | `selCountry` | Country Select | Select (`<select>`) | String(100) | Mandatory | Default: first option or empty. | Options loaded from predefined list. | `shipping_address.country` | AutoComplete: `country`. |

### 4.4 Section [D]: Payment Method (決済方法)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 34 | `lblPaymentMethod` | Payment Method Label | Static Label (`<label>`) | String | — | Always displayed. Text: "Payment Method" / "決済方法" | — | Hardcoded UI text | i18n key: `checkout.paymentMethod`. |
| 35 | `rdoPaymentMethod` | Payment Method Radio Group | Radio Group | Enum | Mandatory | Default: `cod` | Options: `cod`, `bank_transfer`, `card` | `orders.payment_method` | i18n keys: `checkout.cod`, `checkout.bankTransfer`, `checkout.cardPayment`. |
| 36 | `rdoCOD` | Cash on Delivery Radio | Radio Button | — | — | Selected by default. | Value: `cod` | — | Label: "Cash on Delivery" / "代金引換" |
| 37 | `rdoBankTransfer` | Bank Transfer Radio | Radio Button | — | — | Unselected. | Value: `bank_transfer` | — | Label: "Bank Transfer" / "銀行振込" |
| 38 | `rdoCard` | Card Payment Radio | Radio Button | — | — | Unselected. | Value: `card` | — | Label: "Credit/Debit Card" / "クレジット・デビットカード" (stubbed for MVP) |

### 4.5 Section [E]: Order Notes (備考)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 39 | `lblNotes` | Order Notes Label | Static Label (`<label>`) | String | — | Always displayed. Text: "Order Notes (optional)" / "備考（任意）" | — | Hardcoded UI text | i18n key: `checkout.notes`. Associated with `txtNotes`. |
| 40 | `txtNotes` | Order Notes Textarea | Textarea (`<textarea>`) | TEXT(500) | No | Empty. Placeholder: "Notes for the merchant..." / "出品者への備考..." | MaxLength: 500. | `orders.notes` | Tailwind: `w-full min-h-[80px]`. |

### 4.6 Section [F]: Place Order (注文確定)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 41 | `btnPlaceOrder` | Place Order Button | Button (`submit`, `primary`, `lg`) | — | — | Visible. Text: "Place Order" / "注文を確定する" | — | — | i18n key: `checkout.placeOrder`. Full width. Loading: Spinner + "Placing order...". Disabled when form invalid or submitting. Tailwind: `w-full`. |

### 4.7 Section [G]: Guest Login Alert Modal (ゲストログインアラートモーダル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 42 | `dlgGuestAlert` | Guest Login Alert Modal | Dialog/Modal | — | Conditional | Hidden by default. Shown when guest attempts checkout. | — | — | i18n key: `checkout.guestLoginAlert`. |
| 43 | `lblGuestAlertMessage` | Alert Message | Static Label (`<p>`) | String | — | Visible inside modal. Text: "Please log in to complete your purchase." / "購入を完了するにはログインしてください。" | — | Hardcoded UI text | Tailwind: `text-center`. |
| 44 | `btnGuestLogin` | Log In Button | Button (`button`, `default`) | — | — | Visible inside modal. Text: "Log in" / "ログイン" | — | — | Navigates to `/login`. Tailwind: `w-full`. |

### 4.8 Section [H]: Loading Overlay (読み込みオーバーレイ)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 45 | `ovlLoading` | Loading Overlay | Overlay (`<div>`) | — | Conditional | Hidden by default. Shown during order submission. | — | — | Tailwind: `fixed inset-0 z-50 bg-background/80 flex items-center justify-center`. Spinner + "Processing your order...". |

### 4.9 Section [I]: Order Confirmation — Success (注文確認 — 成功)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 46 | `icoSuccess` | Success Icon | Icon (`CheckCircle2`) | — | — | Visible. Large green checkmark. | — | — | Lucide icon. Tailwind: `h-16 w-16 text-green-500 mx-auto`. |
| 47 | `lblConfirmTitle` | Success Title | Heading (`<h1>`) | String | — | Visible. Text: "Order Placed Successfully!" / "注文が完了しました！" | — | Hardcoded UI text | i18n key: `checkout.confirmation.title`. Tailwind: `text-2xl font-bold text-center mt-4`. |
| 48 | `lblConfirmOrderId` | Order ID | Static Label (`<p>`) | UUID | — | Visible. "Order #ABC-12345" | — | `orders.id` | i18n key: `checkout.confirmation.orderId`. Displays first 8 chars of UUID. Tailwind: `text-center text-muted-foreground`. |
| 49 | `lblConfirmStatus` | Order Status Badge | Badge | Enum | — | Visible. Status: "Placed" | — | `orders.status` | i18n key: `checkout.confirmation.status`. Color-coded badge. |
| 50 | `lblConfirmEstDelivery` | Estimated Delivery | Static Label (`<p>`) | Date | Conditional | Visible for shipped/out_for_delivery orders. | — | Calculated | i18n key: `checkout.confirmation.estimatedDelivery`. Tailwind: `text-center text-muted-foreground`. |
| 51 | `cardConfirmSummary` | Order Summary Card | Card | — | — | Visible. Contains items, totals, shipping address. | — | Order data | Tailwind: `mt-6 border rounded-lg p-4`. |

### 4.10 Section [K]: Order Confirmation — Action Buttons (注文確認 — アクションボタン)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 52 | `btnContinueShopping` | Continue Shopping Button | Button (`button`, `primary`) | — | — | Visible. Text: "Continue Shopping" / "買い物を続ける" | — | — | i18n key: `checkout.confirmation.continueShopping`. Navigates to `/products`. Tailwind: `w-full`. |
| 53 | `btnViewOrder` | View Order Button | Button (`button`, `secondary`) | — | — | Visible. Text: "View Order" / "注文を表示" | — | — | i18n key: `checkout.confirmation.viewOrder`. Navigates to `/orders/:orderId`. Tailwind: `w-full`. |
| 54 | `btnPrintReceipt` | Print Receipt Button | Button (`button`, `ghost`) | — | — | Visible. Text: "Print Receipt" / "領収書を印刷" | — | — | i18n key: `checkout.confirmation.print`. Calls `window.print()`. Tailwind: `w-full`. |

---

## 5. Item Behaviors & Event Specifications (各項目における挙動・イベント仕様)

### 5.1 Load Checkout Page (`/checkout`)
- **Trigger:** Navigation from cart page via "Proceed to Checkout" button.
- **Processing Logic:**
  1. **Authentication Check:** Verify JWT token. If guest, show `dlgGuestAlert`.
  2. **Role Check:** Verify role is `buyer`. If not, show 403 toast.
  3. **Cart Validation:** Fetch cart items with product details. If empty, redirect to `/cart`.
  4. **Stock Validation:** Check stock for all items. If any item out of stock, show `alertStockWarning`.
  5. **Calculate Subtotal:** Sum of (unit_price × quantity) for all items.
  6. **Render:** Display order summary, shipping form, payment options.
- **Exception Handling:**
  - `401 UNAUTHORIZED`: Redirect to `/login`.
  - `403 FORBIDDEN`: Toast: "Shopping features are only available to buyers".
  - Empty cart: Redirect to `/cart`.

### 5.2 Apply Coupon Code (`btnApplyCoupon` onClick)
- **Trigger:** User clicks "Apply" button after entering coupon code.
- **Processing Logic:**
  1. **Client-Side Pre-Check:** Coupon code not empty.
  2. **Backend Dispatch:** `POST /api/v1/checkout/validate-coupon` with `{ couponCode, subtotal }`.
  3. **Backend Execution:** Validate coupon (active, expired, min order, usage limit). Calculate discount.
  4. **Post-Execution UI:** Update order summary with discount. Show `lblDiscount`, `btnRemoveCoupon`. Recalculate total.
- **Exception Handling:**
  - `VAL-CHECK-010`: "Coupon code is required" — inline error on `txtCouponCode`.
  - `VAL-CHECK-011`: "Invalid coupon code" — toast.
  - `VAL-CHECK-012`: "Coupon has expired" — toast.
  - `VAL-CHECK-013`: "Minimum order amount not met" — toast.
  - `VAL-CHECK-014`: "Coupon usage limit reached" — toast.

### 5.3 Remove Coupon Code (`btnRemoveCoupon` onClick)
- **Trigger:** User clicks "Remove" button for applied coupon.
- **Processing Logic:**
  1. Clear coupon code from state.
  2. Hide `lblDiscount`, `btnRemoveCoupon`.
  3. Reset total to subtotal.
  4. Clear `txtCouponCode` input.
- **Exception Handling:** None applicable.

### 5.4 Place Order (`btnPlaceOrder` onClick)
- **Trigger:** User clicks "Place Order" button.
- **Processing Logic:**
  1. **Client-Side Pre-Check:** All shipping fields valid, payment method selected, cart not empty.
  2. **Backend Dispatch:** `POST /api/v1/orders` with `{ shippingAddress, paymentMethod, couponCode?, notes? }`.
  3. **Backend Execution:** Validate DTO. Fetch cart items with current prices. Re-validate stock. Calculate subtotal. Validate and apply coupon if provided. Calculate discount and total. Create order record (status: `placed`). Create order_items records. Decrement stock atomically. Increment coupon used_count if applied. Clear cart. Send notification to merchant.
  4. **Post-Execution UI:** Navigate to `/checkout/confirmation/:orderId`. Clear cart state.
- **Exception Handling:**
  - `VAL-CHECK-001`~`VAL-CHECK-008`: Field-level inline errors on shipping address fields.
  - `VAL-CHECK-009`: "Payment method is required" — inline error.
  - `CHECK_001` (400): "Your cart is empty" — toast.
  - `CHECK_002` (409): "Some items are no longer available" — toast.
  - `CHECK_003` (400): "Invalid coupon code" — toast.
  - `401 UNAUTHORIZED`: Redirect to login.
  - `500 INTERNAL_SERVER_ERROR`: Toast: "Something went wrong. Please try again."

### 5.5 Guest Checkout Attempt (`dlgGuestAlert` display)
- **Trigger:** Guest user navigates to `/checkout`.
- **Processing Logic:**
  1. Detect unauthenticated state.
  2. Display `dlgGuestAlert` modal.
  3. `btnGuestLogin` navigates to `/login`.
- **Exception Handling:** None applicable.

### 5.9 Navigation Links
- **Trigger:** User clicks navigation links.
- **Processing Logic:**
  1. `lnkBackToCart`: Navigate to `/cart`.
  2. `btnContinueShopping`: Navigate to `/products`.
  3. `btnViewOrder`: Navigate to `/orders/:orderId`.
  4. `btnPrintReceipt`: Call `window.print()`.
- **Exception Handling:** None applicable.

---

## 6. Validation & Error Message Mapping (バリデーション及びエラーメッセージマッピング)

### 6.1 Shipping Address Validation Errors

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-CHECK-001** | `txtRecipientName` | Recipient name is empty or exceeds 200 chars | Red border. Text below field. | "Recipient name is required" / "Name must not exceed 200 characters" | "受取人氏名は必須です" / "氏名は200文字以内にしてください" |
| **VAL-CHECK-002** | `txtPhone` | Phone number is empty or exceeds 20 chars | Red border. Text below field. | "Phone number is required" / "Phone number is invalid" | "電話番号は必須です" / "無効な電話番号です" |
| **VAL-CHECK-003** | `txtAddress1` | Address line 1 is empty or exceeds 255 chars | Red border. Text below field. | "Address is required" / "Address must not exceed 255 characters" | "住所は必須です" / "住所は255文字以内にしてください" |
| **VAL-CHECK-004** | `txtCity` | City is empty or exceeds 100 chars | Red border. Text below field. | "City is required" / "City must not exceed 100 characters" | "市区町村は必須です" / "市区町村は100文字以内にしてください" |
| **VAL-CHECK-005** | `txtState` | State is empty or exceeds 100 chars | Red border. Text below field. | "State is required" / "State must not exceed 100 characters" | "都道府県は必須です" / "都道府県は100文字以内にしてください" |
| **VAL-CHECK-006** | `txtPostalCode` | Postal code is empty or exceeds 20 chars | Red border. Text below field. | "Postal code is required" / "Postal code must not exceed 20 characters" | "郵便番号は必須です" / "郵便番号は20文字以内にしてください" |
| **VAL-CHECK-007** | `selCountry` | Country is empty | Red border. Text below field. | "Country is required" | "国は必須です" |

### 6.2 Payment Method Validation Errors

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-CHECK-008** | `rdoPaymentMethod` | No payment method selected | Form-level error | "Payment method is required" | "決済方法は必須です" |

### 6.3 Coupon Validation Errors

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-CHECK-010** | `txtCouponCode` | Coupon code is empty | Red border. Text below field. | "Coupon code is required" | "クーポンコードは必須です" |
| **VAL-CHECK-011** | `alertError` | Coupon does not exist or is inactive (400 response) | Toast notification | "Invalid coupon code" | "無効なクーポンコードです" |
| **VAL-CHECK-012** | `alertError` | Coupon expired (400 response) | Toast notification | "Coupon has expired" | "クーポンの有効期限が切れています" |
| **VAL-CHECK-013** | `alertError` | Minimum order amount not met (400 response) | Toast notification | "Minimum order amount not met" | "最低注文金額を満たしていません" |
| **VAL-CHECK-014** | `alertError` | Coupon usage limit reached (400 response) | Toast notification | "Coupon usage limit reached" | "クーポンの使用回数上限に達しました" |

### 6.4 Order Placement Errors

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CHECK_001** | `alertError` | Cart is empty (400 response) | Toast notification | "Your cart is empty" | "カートが空です" |
| **CHECK_002** | `alertError` | Insufficient stock during submission (409 response) | Toast notification | "Some items are no longer available. Please review your cart." | "一部の商品は利用できなくなりました。カートを確認してください。" |
| **CHECK_003** | `alertError` | Invalid coupon during order placement (400 response) | Toast notification | "Invalid coupon code" | "無効なクーポンコードです" |
| **CHECK_004** | `alertError` | Non-buyer role (403 response) | Toast notification | "Shopping features are only available to buyers" | "ショッピング機能は購入者のみ利用できます" |
| **AUTH_001** | `alertError` | Missing or invalid JWT token (401 response) | Redirect to login | "Session expired. Please log in again." | "セッションが期限切れです。再度ログインしてください。" |
| **SYS_001** | `alertError` | Server error (500 response) | Toast notification | "Something went wrong. Please try again." | "問題が発生しました。もう一度お試しください。" |
| **NET_ERR** | `alertError` | Network error | Toast notification | "Network error. Please check your connection" | "ネットワークエラー。接続を確認してください" |

### 6.6 Validation Enforcement Layers

1. **Frontend (Client)**: React Hook Form + Zod schema validation with real-time feedback before API calls.
2. **Backend (Server)**: NestJS ValidationPipe + class-validator DTOs on all endpoints.
3. **Database (DB)**: Prisma constraints (unique, check, FK) as final safety net.

---

## 7. API Response Mapping (APIレスポンスマッピング)

### 7.1 Load Checkout Success Response

```json
{
  "data": {
    "items": [
      {
        "id": "uuid",
        "productId": "uuid",
        "productName": "Product Name",
        "productImage": "https://...",
        "unitPrice": 29.99,
        "quantity": 2,
        "lineTotal": 59.98,
        "stockQuantity": 15
      }
    ],
    "subtotal": 59.98,
    "discountAmount": 0,
    "total": 59.98,
    "cartId": "uuid"
  }
}
```

### 7.2 Validate Coupon Success Response

```json
{
  "data": {
    "discountType": "percentage",
    "discountValue": 10,
    "discountAmount": 5.998,
    "newTotal": 53.982
  }
}
```

### 7.3 Place Order Success Response (201)

```json
{
  "data": {
    "orderId": "uuid",
    "orderNumber": "abc12345",
    "status": "placed",
    "subtotal": 59.98,
    "discountAmount": 5.998,
    "total": 53.982,
    "paymentMethod": "cod",
    "shippingAddress": {
      "recipientName": "John Doe",
      "phone": "+1234567890",
      "addressLine1": "123 Main St",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001",
      "country": "US"
    },
    "createdAt": "2026-08-25T12:00:00.000Z",
    "estimatedDelivery": "2026-08-30"
  }
}
```

---

## 8. i18n Keys Reference (i18nキーリファレンス)

### 8.1 English (en) — Checkout

| Key | Value |
| :--- | :--- |
| `checkout.title` | "Checkout" |
| `checkout.backToCart` | "← Back to Cart" |
| `checkout.subtotal` | "Subtotal" |
| `checkout.couponCode` | "Enter coupon code" |
| `checkout.applyCoupon` | "Apply" |
| `checkout.discount` | "Discount" |
| `checkout.removeCoupon` | "Remove" |
| `checkout.total` | "Total" |
| `checkout.recipientName` | "Recipient Name" |
| `checkout.phone` | "Phone Number" |
| `checkout.address1` | "Address Line 1" |
| `checkout.address2` | "Address Line 2" |
| `checkout.city` | "City" |
| `checkout.state` | "State/Province" |
| `checkout.postalCode` | "Postal Code" |
| `checkout.country` | "Country" |
| `checkout.paymentMethod` | "Payment Method" |
| `checkout.cod` | "Cash on Delivery" |
| `checkout.bankTransfer` | "Bank Transfer" |
| `checkout.cardPayment` | "Credit/Debit Card" |
| `checkout.notes` | "Order Notes (optional)" |
| `checkout.placeOrder` | "Place Order" |
| `checkout.guestLoginAlert` | "Please log in to complete your purchase." |

### 8.2 English (en) — Confirmation

| Key | Value |
| :--- | :--- |
| `checkout.confirmation.title` | "Order Placed Successfully!" |
| `checkout.confirmation.orderId` | "Order #{orderId}" |
| `checkout.confirmation.status` | "Status" |
| `checkout.confirmation.estimatedDelivery` | "Estimated delivery: {date}" |
| `checkout.confirmation.continueShopping` | "Continue Shopping" |
| `checkout.confirmation.viewOrder` | "View Order" |
| `checkout.confirmation.print` | "Print Receipt" |

### 8.6 Japanese (ja) — Checkout

| Key | Value |
| :--- | :--- |
| `checkout.title` | "チェックアウト" |
| `checkout.backToCart` | "← カートに戻る" |
| `checkout.subtotal` | "小計" |
| `checkout.couponCode` | "クーポンコードを入力" |
| `checkout.applyCoupon` | "適用" |
| `checkout.discount` | "割引" |
| `checkout.removeCoupon` | "削除" |
| `checkout.total` | "合計" |
| `checkout.recipientName` | "受取人氏名" |
| `checkout.phone` | "電話番号" |
| `checkout.address1` | "住所1" |
| `checkout.address2` | "住所2" |
| `checkout.city` | "市区町村" |
| `checkout.state` | "都道府県" |
| `checkout.postalCode` | "郵便番号" |
| `checkout.country` | "国" |
| `checkout.paymentMethod` | "決済方法" |
| `checkout.cod` | "代金引換" |
| `checkout.bankTransfer` | "銀行振込" |
| `checkout.cardPayment` | "クレジット・デビットカード" |
| `checkout.notes` | "備考（任意）" |
| `checkout.placeOrder` | "注文を確定する" |
| `checkout.guestLoginAlert` | "購入を完了するにはログインしてください。" |

### 8.7 Japanese (ja) — Confirmation

| Key | Value |
| :--- | :--- |
| `checkout.confirmation.title` | "注文が完了しました！" |
| `checkout.confirmation.orderId` | "注文番号 #{orderId}" |
| `checkout.confirmation.status` | "ステータス" |
| `checkout.confirmation.estimatedDelivery` | "配達予定日：{date}" |
| `checkout.confirmation.continueShopping` | "買い物を続ける" |
| `checkout.confirmation.viewOrder` | "注文を表示" |
| `checkout.confirmation.print` | "領収書を印刷" |

---

## 9. Database Field Mapping (データベースフィールドマッピング)

### 7.1 Checkout Form → Database

| Form Field | API Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| `txtRecipientName` | `shippingAddress.recipientName` | `shipping_address->>'recipientName'` | `orders` | JSONB |
| `txtPhone` | `shippingAddress.phone` | `shipping_address->>'phone'` | `orders` | JSONB |
| `txtAddress1` | `shippingAddress.addressLine1` | `shipping_address->>'addressLine1'` | `orders` | JSONB |
| `txtAddress2` | `shippingAddress.addressLine2` | `shipping_address->>'addressLine2'` | `orders` | JSONB |
| `txtCity` | `shippingAddress.city` | `shipping_address->>'city'` | `orders` | JSONB |
| `txtState` | `shippingAddress.state` | `shipping_address->>'state'` | `orders` | JSONB |
| `txtPostalCode` | `shippingAddress.postalCode` | `shipping_address->>'postalCode'` | `orders` | JSONB |
| `selCountry` | `shippingAddress.country` | `shipping_address->>'country'` | `orders` | JSONB |
| `rdoPaymentMethod` | `paymentMethod` | `payment_method` | `orders` | VARCHAR(50) |
| `txtCouponCode` | `couponCode` | `coupon_code` | `orders` | VARCHAR(50) |
| `txtNotes` | `notes` | `notes` | `orders` | TEXT |

### 7.2 Order Items → Database

| Data Source | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- |
| Cart item quantity | `quantity` | `order_items` | INTEGER |
| Current product price | `unit_price` | `order_items` | DECIMAL(10,2) |
| quantity × unit_price | `total_price` | `order_items` | DECIMAL(10,2) |
| Product reference | `product_id` | `order_items` | UUID (FK) |
| Merchant reference | `merchant_id` | `order_items` | UUID (FK) |

---

## 10. Shared Components (共有コンポーネント)

### 10.1 Order Status Badge Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/common/OrderStatusBadge.tsx` |
| **Purpose** | Displays order status with color-coded badge |

**Status Color Mapping:**
| Status | Color | Tailwind Classes |
| :--- | :--- | :--- |
| `placed` | Blue | `bg-blue-100 text-blue-800` |
| `confirmed` | Yellow | `bg-yellow-100 text-yellow-800` |
| `packed` | Orange | `bg-orange-100 text-orange-800` |
| `shipped` | Purple | `bg-purple-100 text-purple-800` |
| `out_for_delivery` | Cyan | `bg-cyan-100 text-cyan-800` |
| `delivered` | Green | `bg-green-100 text-green-800` |

### 10.2 Price Formatting Utility

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/lib/format.ts` |
| **Purpose** | Formats prices with locale-appropriate currency |

---

## 11. Special UI Notes & Styling Constraints (特記事項・UI仕様)

- **Design System:** Luxury Cosmetics Theme — Primary `#7C3AED` (Purple), Accent `#EC4899` (Pink), Secondary `#F3E8FF` (Lavender).
- **Responsive Viewport Design:** Two-column checkout layout on desktop (summary left, form right). Single column on mobile.
- **Accessibility:** Every control must be keyboard navigable. ARIA labels required. Error messages must be announced via `role="alert"`.
- **Performance:** Forms use skeleton loaders during initial load. Buttons display spinner during async operations. Checkout page loads in ≤ 2 seconds.
- **Security:** All user input is sanitized to prevent XSS. Prices fetched from DB, not client. Atomic stock decrement via Prisma transaction.
- **Design Tokens:** Status badges use standard color mapping — success: `bg-green-100 text-green-800`, error: `bg-red-100 text-red-800`, warning: `bg-amber-100 text-amber-800`.
- **Currency Formatting:** All prices displayed with locale-appropriate currency (e.g., `$XX.XX` for EN, `¥XX,XXX` for JA).

---

## 12. Testing Checklist (テストチェックリスト)

### 12.1 Checkout Page Tests

- [ ] Checkout page loads with cart items
- [ ] Empty cart redirects to `/cart`
- [ ] Guest user sees alert modal
- [ ] Alert modal navigates to `/login`
- [ ] Non-buyer role sees 403 error
- [ ] Shipping address form validates all required fields
- [ ] Phone number input accepts tel format
- [ ] Country select loads options
- [ ] Payment method defaults to Cash on Delivery
- [ ] Payment method radio group works
- [ ] Coupon code input accepts text
- [ ] Apply button validates coupon via API
- [ ] Valid coupon updates discount and total
- [ ] Invalid coupon shows toast error
- [ ] Expired coupon shows toast error
- [ ] Remove coupon resets totals
- [ ] Place Order button disabled when form invalid
- [ ] Place Order submits order via API
- [ ] Successful order navigates to confirmation
- [ ] Loading overlay shown during submission
- [ ] Stock validation error shows toast
- [ ] Empty cart error shows toast
- [ ] All i18n keys render correctly (EN/JA)
- [ ] Keyboard navigation works (Tab, Enter)
- [ ] Responsive layout works on mobile

### 12.2 Order Confirmation Page Tests

- [ ] Success icon and title displayed
- [ ] Order ID displayed (first 8 chars)
- [ ] Order status badge displayed
- [ ] Order summary shows all items
- [ ] Subtotal, discount, total displayed correctly
- [ ] Shipping address displayed
- [ ] Continue Shopping navigates to `/products`
- [ ] View Order navigates to `/orders/:orderId`
- [ ] Print Receipt calls `window.print()`
- [ ] All i18n keys render correctly

### 12.6 Error Handling Tests

- [ ] 401 Unauthorized redirects to login
- [ ] 404 Order not found shows toast
- [ ] 403 Forbidden shows toast
- [ ] Network error shows toast
- [ ] Server error shows toast
- [ ] Validation errors show inline errors
- [ ] Stock conflict shows toast

---

*End of Screen Items Specification (Checkout & Order Placement)*
