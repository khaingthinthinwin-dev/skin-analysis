# Screen Items Specification (画面項目設計書) — Purchase & Checkout

**Document ID:** SKM-SIS-SCR-CHECKOUT-001  
**Target Screen:** Purchase & Checkout (購入・チェックアウト)  
**Subsystem:** Buyer Module — Checkout & Order Placement  
**Function ID:** FN-CHECK-001, FN-ORDER-001  
**Version:** 1.2  
**Created:** 2026-08-25  
**Last Updated:** 2026-10-21  
**Author:** Senior System Engineer  
**Review Status:** Source-aligned (implementation baseline; known gaps identified)  
**Classification:** Internal — Engineering Division

---

## 1. Document Control (ドキュメント管理)

### 1.1 Document Revision History

| Version | Date | Author | Description of Changes |
| :--- | :--- | :--- | :--- |
| 1.2 | 2026-10-21 | Senior System Engineer | Reconciled checkout, voucher, ad, order-placement, and confirmation screen items with current frontend/backend behavior; documented known differences from planned PCL scenarios. |
| 1.1 | 2026-08-26 | Senior System Engineer | Specified planned sponsored ad panel/carousel behavior, responsive layouts, and related item definitions/checklist. |
| 1.0 | 2026-08-25 | Senior System Engineer | Initial release. Screen items specification for Checkout and Order Confirmation pages. Order History, Order Detail, and Order Tracking pages are developed by the order status screen team. Aligned with REQUIREMENT_SPEC v2.11, DATABASE_SPEC v2.5, DEVELOPMENT_RULES v2.1, and Functional Specification v1.2. |
### 1.2 Related Documents

| No. | Document ID | Document Name | File Path | Remarks |
| :-- | :--- | :--- | :--- | :--- |
| 1 | SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | Business workflow logic, required fields, and rules. |
| 2 | SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | Table structures (`orders`, `order_items`, `promotions`), constraints. |
| 3 | SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | Security rules, design tokens, error responses. |
| 4 | SKM-FDS-CHECKOUT-001 | Functional Specification — Checkout | `docs/screen/Checkout_Purchase/機能設計書_Checkout_Purchase.md` | Functional rules and source-aligned implementation details. |
| 5 | SKM-PCL-CHECK-001 | Program Checklist — Checkout & Purchase | `docs/screen/Checkout_Purchase/Checkout_Purchase_PCL.md` | Scenario audit and known differences; check code where PCL notes differ from source. |
## 2. Screen Overview & Purpose (画面概要・目的)

### 2.1 Purpose (目的)
The Checkout and Order Confirmation pages provide the purchase workflow for authenticated buyers. Checkout groups cart items and vouchers by merchant, collects shipping/payment details, and places order(s). A cart with no items currently displays the normal checkout form with an empty summary; order submission is rejected by the API.

### 2.2 Target Users & Roles (対象ユーザーと権限)

| Attribute | Value |
| :--- | :--- |
| **Primary Actors** | Authenticated Buyer |
| **Required Authentication** | JWT Bearer Token |
| **Data Scope** | Own orders, own shipping addresses, own payment records |
| **Guest Behavior** | On `/buyer/checkout`, unauthenticated users see a login dialog if the page is rendered. [Log in] navigates to `/login?redirect=%2Fcheckout`; closing the dialog returns to `/buyer/cart`. The app protected route normally redirects guests before this dialog is reachable. |

### 2.3 Core Functions & Basic Design Principles (主要機能・基本設計方針)
1. **Checkout Flow** — Guiding the user through shipping address entry, payment method selection, coupon application, and order summary review before final confirmation.
2. **Coupon Validation** — Validating and applying discount codes (percentage or fixed) at checkout, enforcing expiry, minimum order amount, and single-use constraints.
3. **Order Calculation** — Computing subtotal, discount amount, and final total based on cart items and applied coupons.
4. **Order Placement** — Creates one order per merchant group in one Prisma transaction, with status `placed` and payment status `pending`, decrements stock, clears cart items, and returns an orders array. Checkout does not create `inventory_transactions` rows.

---

## 3. Screen Layout (画面レイアウト構成)

### 3.1 Overall Page Structure (全体画面構成)

#### Checkout Page Layout (`/buyer/checkout`)
```text
┌─────────────────────────────────────────────────────────────────────┐
│                           BROWSER VIEWPORT                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  [A] PAGE HEADER                                              │  │
│  │  [A1] Page Title "Checkout"                                   │  │
│  │  [A2] Back to Cart Link                                       │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │           [D0] SPONSORED AD CAROUSEL (conditional)            │  │
│  │              (shared banner; hidden when empty)               │  │
│  │          ┌─────────────┬──────────────────────────┐           │  │
│  │          │ [D0a]       │ [D0b] Ad Title           │           │  │
│  │          │ Image /     │ [D0c] Description        │           │  │
│  │          │ Banner      │ [D0d] CTA Button         │           │  │
│  │          └─────────────┴──────────────────────────┘           │  │
│  │      (full container width, horizontally centered between     │  │
│  │      [A] and [B+C]; 5s auto-advance, max 5 results)           │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────┐  ┌───────────────────────────────────┐    │
│  │ [B] ORDER SUMMARY    │  │ [C] SHIPPING ADDRESS              │    │
│  │   [B1] Items List    │  │   [C1] Recipient Name             │    │
│  │   [B2] Subtotal      │  │   [C2] Phone Number               │    │
│  │   [B3] Coupon Input  │  │   [C3] Address Line 1             │    │
│  │   [B4] Apply Button  │  │   [C4] Address Line 2             │    │
│  │   [B5] Discount      │  │   [C5] City                       │    │
│  │   [B6] Remove Coupon │  │   [C6] State/Province             │    │
│  │   [B7] Total         │  │   [C7] Postal Code                │    │
│  └──────────────────────┘  │   [C8] Country                    │    │
│                            └───────────────────────────────────┘    │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  [D] PAYMENT METHOD                                           │  │
│  │  [D1] Payment Radio Group                                     │  │
│  │  [D2] Cash on Delivery                                        │  │
│  │  [D3] Bank Transfer                                           │  │
│  │  [D4] Card Payment                                            │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  [E] ORDER NOTES                                              │  │
│  │  [E1] Notes Textarea                                          │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  [F] PLACE ORDER                                              │  │
│  │  [F1] Place Order Button                                      │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  [G] GUEST LOGIN ALERT MODAL (conditional)                    │  │
│  │  [G1] Alert Message                                           │  │
│  │  [G2] Log In Button                                           │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  [H] LOADING OVERLAY (conditional)                            │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Order Confirmation Page Layout (`/buyer/checkout/confirmation/:orderId`)
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
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │  [J] ORDER SUMMARY CARD     │            │
│              │   [J1] Order Items List     │            │
│              │   [J2] Subtotal             │            │
│              │   [J3] Discount             │            │
│              │   [J4] Total Due            │            │
│              │   [J5] Shipping & Payment   │            │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │  [K] ACTION BUTTONS         │            │
│              │   [K1] Continue Shopping    │            │
│              │   [K2] View Order           │            │
│              └─────────────────────────────┘            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Responsive Layout Breakpoints (レスポンシブ対応)

| Breakpoint | Min Width | Checkout Layout |
| :--- | :--- | :--- |
| Mobile (default) | 0px | Single column: Header → Ad (stacked at mobile width) → Summary → Shipping form → Payment → Notes → actions. Ad banner appears only when eligible data is returned. |
| Tablet (`md:`) | 768px | Single column: Header → Ad (horizontal at md width) → Summary → Shipping form → Payment → Notes → actions. |
| Desktop (`lg:`) | 1024px | Two-column form grid at `lg` width: summary and shipping form side by side; payment, notes, and action controls span the form width. Ad banner remains above the form. |
| Wide (`xl:`) | 1280px | Same grid with the page max width of 5xl. |

---

## 4. Item Definitions (画面項目定義)

### 4.1 Section [A]: Checkout Page Header (チェックアウトページヘッダー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 1 | `lblCheckoutTitle` | Page Title | Heading (`<h1>`) | String | — | Visible. Text: "Checkout" / "チェックアウト" | — | Hardcoded UI text | i18n key: `buyer.checkout.title`. Tailwind: `text-2xl font-bold`. |
| 2 | `lnkBackToCart` | Back to Cart Link | Link (`<Link>`) | String | — | Visible. Text: “Back to Cart”. | — | — | i18n key: `buyer.checkout.actions.backToCart`. Navigates to `/buyer/cart`. |

### 4.2 Section [D0]: Sponsored Ad Banner (スポンサー広告バナー)

The mounted checkout page renders the shared `AdBannerSlider` after the page header and before the checkout form. Its data source is `GET /api/v1/search/ads?placement=checkout_page_banner`; no panel is rendered when the request has no eligible results or errors.

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 3 | `slotAdCheckout` | Sponsored Ad Banner | Shared card carousel | — | Conditional | Hidden when filtered ads list is empty. One ad visible at a time. | Maximum 5 results; auto-advance every 5 seconds when motion is allowed. | `GET /api/v1/search/ads?placement=checkout_page_banner` | SearchService filters placement, approved/active ad, active schedule, approved shop; sorts `startsAt DESC`; response `tier` is always `standard`. No checkout-specific cache/rotation/tier priority. |
| 4 | `trackAdSlides` | Carousel Controls | Card content, chevrons, dot buttons | — | Conditional | Controls/dots shown when more than one ad exists. | Previous/next wrap; dot selects slide; auto-slide pauses on hover/focus; reduced-motion disables auto-slide. | Ad list in shared search response | There is no vertical slide-down entrance or vertical slide transition. |
| 5 | `cardAdSlide` | Current Ad Card | Card (`div`, role `link`) | — | Per visible ad | One card rendered for current index; whole card clickable. | Mobile stacked; medium and wider horizontal layout. | Shared search sponsored-ad DTO | Destination resolves by SKU/product, target URL, or `/buyer/products`. |
| 6 | `imgAdBanner` | Ad Image | Image (`img`) | URL | Conditional | Ad image, product image, or sample image fallback. | Responsive sizing; image error advances to next available fallback. | `imageUrl`, resolved product image | Alt text uses ad title. |
| 7 | `lblAdTitle` | Ad Title | Heading (`h3`) | String | Conditional | Ad title or resolved product name. | Line clamp on mobile; truncation on medium widths. | `title` / product name | — |
| 8 | `txtAdDescription` | Ad Description | Paragraph (`p`) | String | Conditional | Hidden when no description is available. | HTML tags stripped. | `description` / product description | — |
| 9 | `btnAdCta` | Learn More Button | Button | String | Conditional | Text: “Learn more”. | Click navigates to the same destination as the card. | Ad/product destination | Checkout does not pass the component's `onAdClick` analytics callback. |
| 10 | `badgeSponsored` | Announcement and Shop/Category Badges | Badge (`span`) | String | Conditional | Announcement text or “SPONSORED”; second badge uses shop/category or “Natural Skin Care”. | Rendered above title. | `announcementMessage`, product merchant/category | No separate amber localized Sponsored badge is rendered. |
### 4.3 Section [B]: Order Summary (注文サマリー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 6 | `lstOrderItems` | Order Items List | List (`<ul>`) | Array | — | Visible. Populated from cart items. | — | `cart_items` JOIN `products` | Each item shows product image, name, unit price, quantity, line total. |
| 7 | `itmOrderItem` | Order Item Row | Row (`<li>`) | Object | — | Visible per cart item. | — | `cart_items.quantity`, `products.name`, `products.price`, `products.images` | Tailwind: `flex items-center gap-4 py-3 border-b`. |
| 8 | `imgOrderItem` | Product Image | Image (`<img>`) | URL | — | Visible. Product thumbnail. | — | `products.images[0]` | Tailwind: `h-16 w-16 rounded-md object-cover`. |
| 9 | `lblOrderItemName` | Product Name | Static Label (`<span>`) | String(255) | — | Visible. Product display name. | — | `products.name` | Tailwind: `font-medium`. |
| 10 | `lblOrderItemQty` | Quantity | Static Label (`<span>`) | Integer | — | Visible. "Qty: {quantity} x {unitPrice}" | — | `cart_items.quantity` | Tailwind: `text-sm text-muted-foreground`. |
| 11 | `lblOrderItemPrice` | Unit Price | Static Label (`<span>`) | Decimal(10,2) | — | Visible. Formatted price. | — | `products.price` | Tailwind: `text-sm`. Currency formatted. |
| 12 | `lblOrderItemTotal` | Line Total | Static Label (`<span>`) | Decimal(10,2) | — | Visible. "unit_price × quantity". | — | Calculated | Tailwind: `font-medium`. Currency formatted. |
| 13 | `lblSubtotal` | Subtotal Label | Static Label (`<span>`) | String | — | Visible. Text: "Subtotal" / "小計" | — | Hardcoded UI text | i18n key: `buyer.checkout.subtotal`. |
| 14 | `lblSubtotalValue` | Subtotal Value | Static Label (`<span>`) | Decimal(10,2) | — | Visible. Sum of all line totals. | — | Calculated | Tailwind: `font-medium`. Currency formatted. |
| 15 | `rowShopVoucher` | Shop Voucher Row | Button row | — | Per merchant group | Visible under each shop item group; shows Select/Enter code or applied discount. | Opens voucher selection modal. | `merchantId`, merchant promotions | At most one applied voucher per merchant in current page state. |
| 16 | `dlgShopVouchers` | Shop Vouchers Modal | Dialog | — | Conditional | Opens from Shop Voucher row; lists available vouchers and manual code entry. | Manual Apply disabled for empty input/loading; no client-side length or 8–12 alphanumeric rule. | `GET /api/v1/checkout/merchant-promotions/:merchantId`; manual code validated by `POST /api/v1/checkout/validate-coupon` with the merchant subtotal. | Applied voucher shows code/discount and Remove action in modal. |
| 17 | `txtCouponCode` | Manual Coupon Code Input | Input (`text`) | String (no client max) | No | Empty in modal. | Trimmed for non-empty check only; submitted code otherwise verbatim. | Modal state; promotion code | No client format rule; backend coupon lookup is exact. |
| 18 | `btnApplyCoupon` | Apply Coupon Button | Button (`button`, `outline`) | — | — | Visible in modal; label “Apply” / “Applying…”. | Disabled when input empty or validation is loading. | `POST /api/v1/checkout/validate-coupon` | On success closes modal and applies to current merchant. |
| 19 | `lblTotal` | Total Label | Static Label (`<span>`) | String | — | Visible: “Total”. | — | i18n key: `cart.total` | — |
| 20 | `lblTotalValue` | Total Value | Static Label (`<span>`) | Decimal string | — | `max(subtotal − sum of shop discounts, 0)`; formatted as rounded Myanmar kyat (`Ks`). | — | Calculated in frontend | Coupon validation may preview a zero total, but order placement rejects a merchant order group totaling zero or less. |

### 4.4 Section [C]: Shipping Address Form (配送先住所フォーム)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 21 | `lblRecipientName` | Recipient Name Label | Static Label (`<label>`) | String | — | Always displayed. Text: "Recipient Name" / "受取人氏名" | — | Hardcoded UI text | i18n key: `buyer.checkout.recipientName`. Associated with `txtRecipientName`. |
| 22 | `txtRecipientName` | Recipient Name Input | Input (`text`) | String(200) | Mandatory | Empty. Placeholder: "Full name" / "氏名" | MaxLength: 200. MinLength: 1. | `shipping_address.recipientName` | AutoComplete: `name`. Tailwind: `w-full`. |
| 23 | `lblPhone` | Phone Number Label | Static Label (`<label>`) | String | — | Always displayed. Text: "Phone Number" / "電話番号" | — | Hardcoded UI text | i18n key: `buyer.checkout.phone`. Associated with `txtPhone`. |
| 24 | `txtPhone` | Phone Number Input | Input (`tel`) | String | Mandatory | Empty. | Digits only; must start with `0` and have 9 or 11 digits; HTML maxLength 11. | `shippingAddress.phone` | Client schema and server DTO also validate. |
| 25 | `lblAddress1` | Address Line 1 Label | Static Label (`<label>`) | String | — | Always displayed. Text: "Address Line 1" / "住所1" | — | Hardcoded UI text | i18n key: `buyer.checkout.address1`. Associated with `txtAddress1`. |
| 26 | `txtAddress1` | Address Line 1 Input | Input (`text`) | String(255) | Mandatory | Empty. Placeholder: "Street address" / "住所" | MaxLength: 255. | `shipping_address.addressLine1` | AutoComplete: `address-line1`. |
| 27 | `lblAddress2` | Address Line 2 Label | Static Label (`<label>`) | String | — | Always displayed. Text: "Address Line 2" / "住所2" | — | Hardcoded UI text | i18n key: `buyer.checkout.address2`. Associated with `txtAddress2`. |
| 28 | `txtAddress2` | Address Line 2 Input | Input (`text`) | String(255) | No | Empty. Placeholder: "Apartment, suite, unit, etc." / "マンション名・部屋番号など" | MaxLength: 255. | `shipping_address.addressLine2` | AutoComplete: `address-line2`. |
| 29 | `lblCity` | City Label | Static Label (`<label>`) | String | — | Always displayed. Text: "City" / "市区町村" | — | Hardcoded UI text | i18n key: `buyer.checkout.city`. Associated with `txtCity`. |
| 30 | `txtCity` | City Input | Input (`text`) | String(100) | Mandatory | Empty. Placeholder: "City" / "市区町村" | MaxLength: 100. | `shipping_address.city` | AutoComplete: `address-level2`. |
| 31 | `lblState` | State/Province Label | Static Label (`<label>`) | String | — | Always displayed. Text: "State/Province" / "都道府県" | — | Hardcoded UI text | i18n key: `buyer.checkout.state`. Associated with `txtState`. |
| 32 | `txtState` | State/Province Input | Input (`text`) | String(100) | Mandatory | Empty. Placeholder: "State/Province" / "都道府県" | MaxLength: 100. | `shipping_address.state` | AutoComplete: `address-level1`. |
| 33 | `lblPostalCode` | Postal Code Label | Static Label (`<label>`) | String | — | Always displayed. Text: "Postal Code" / "郵便番号" | — | Hardcoded UI text | i18n key: `buyer.checkout.postalCode`. Associated with `txtPostalCode`. |
| 34 | `txtPostalCode` | Postal Code Input | Input (`text`) | String | Mandatory | Empty. | Digits only; client requires 4–7 digits and HTML maxLength 7. Backend max length 20. | `shippingAddress.postalCode` | — |
| 35 | `lblCountry` | Country Label | Static Label (`<label>`) | String | — | Always displayed. Text: "Country" / "国" | — | Hardcoded UI text | i18n key: `buyer.checkout.country`. Associated with `selCountry`. |
| 36 | `selCountry` | Country Select | Select (`<select>`) | String(100) | Mandatory | Defaults to `JP`. | Fixed options: JP, US, GB, MM, TH, KR, CN, SG. | `shippingAddress.country` | — |

### 4.5 Section [D]: Payment Method (決済方法)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 37 | `lblPaymentMethod` | Payment Method Label | Static Label (`<label>`) | String | — | Always displayed. Text: "Payment Method" / "決済方法" | — | Hardcoded UI text | i18n key: `buyer.checkout.paymentMethod`. |
| 38 | `rdoPaymentMethod` | Payment Method Radio Group | Radio Group | Enum | Mandatory | Default: `cod` | Options: `cod`, `bank_transfer`, `card` | `orders.payment_method` | i18n keys: `buyer.checkout.cod`, `buyer.checkout.bankTransfer`, `buyer.checkout.cardPayment`. |
| 39 | `rdoCOD` | Cash on Delivery Radio | Radio Button | — | — | Selected by default. | Value: `cod` | — | Label: "Cash on Delivery" / "代金引換" |
| 40 | `rdoBankTransfer` | Bank Transfer Radio | Radio Button | — | — | Unselected. | Value: `bank_transfer` | — | Label: "Bank Transfer" / "銀行振込" |
| 41 | `rdoCard` | Card Payment Radio | Radio Button | — | — | Unselected. | Value: `card` | — | Label: "Credit/Debit Card" / "クレジット・デビットカード" (stubbed for MVP) |

### 4.6 Section [E]: Order Notes (備考)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 42 | `lblNotes` | Order Notes Label | Static Label (`<label>`) | String | — | Always displayed. Text: "Order Notes (optional)" / "備考（任意）" | — | Hardcoded UI text | i18n key: `buyer.checkout.notes`. Associated with `txtNotes`. |
| 43 | `txtNotes` | Order Notes Textarea | Textarea (`<textarea>`) | String | No | Empty; placeholder “Notes for the merchant…”. | Frontend `maxLength=500`; backend DTO has no max-length validator. | `notes` → `orders.notes` | — |

### 4.7 Section [F]: Place Order (注文確定)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 44 | `btnPlaceOrder` | Place Order Button | Button (`submit`, `primary`, `lg`) | — | — | Visible. Text: "Place Order" / "注文を確定する" | — | — | i18n key: `buyer.checkout.placeOrder`. Full width. Loading: Spinner + "Placing order...". Disabled when form invalid or submitting. Tailwind: `w-full`. |

### 4.8 Section [G]: Guest Login Alert Modal (ゲストログインアラートモーダル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 45 | `dlgGuestAlert` | Checkout Login Dialog | Dialog | — | Conditional | Rendered when checkout sees unauthenticated state; normally pre-empted by protected-route redirect. | Close navigates to `/buyer/cart`. | Auth state | i18n keys: `buyer.checkout.auth.*`. |
| 46 | `lblGuestAlertMessage` | Alert Message | Static Label (`<p>`) | String | — | Visible inside modal. Text: "Please log in to complete your purchase." / "購入を完了するにはログインしてください。" | — | Hardcoded UI text | Tailwind: `text-center`. |
| 47 | `btnGuestLogin` | Log In Button | Button (`button`, `default`) | — | — | “Log in”. | — | — | Navigates to `/login?redirect=%2Fcheckout`. |

### 4.9 Section [H]: Loading Overlay (読み込みオーバーレイ)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 48 | `ovlLoading` | Loading Overlay | Overlay (`<div>`) | — | Conditional | Hidden by default. Shown during order submission. | — | — | Tailwind: `fixed inset-0 z-50 bg-background/80 flex items-center justify-center`. Spinner + "Processing your order...". |

### 4.10 Section [I]: Order Confirmation — Success (注文確認 — 成功)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 49 | `icoSuccess` | Success Icon | Icon (`CheckCircle2`) | — | — | Visible. Large green checkmark. | — | — | Lucide icon. Tailwind: `h-16 w-16 text-green-500 mx-auto`. |
| 50 | `lblConfirmTitle` | Success Title | Heading (`<h1>`) | String | — | Visible. Text: "Order Placed Successfully!" / "注文が完了しました！" | — | Hardcoded UI text | i18n key: `buyer.checkout.confirmation.title`. Tailwind: `text-2xl font-bold text-center mt-4`. |
| 51 | `lblConfirmOrderId` | Order Number | Static Label (`<p>`) | String | — | Shows `#{orderNumber}` in monospace, e.g. `#ORD-XXXXXXXX`. | — | Order detail response; `orderNumber` is `ORD-` + first 8 uppercase UUID characters. | Confirmation renders order number, not raw UUID. |
| 52 | `lblConfirmStatus` | Order Status Badge | Badge | Enum | — | Visible. Status: "Placed" | — | `orders.status` | i18n key: `buyer.checkout.confirmation.status`. Color-coded badge. |
| 53 | `lblConfirmEstDelivery` | Estimated Delivery | Static Label (`<p>`) | Date | Not rendered | Order placement response contains estimatedDelivery (+7 days), but confirmation page does not display it. | — | Order placement response | Documented implementation gap. |
| 54 | `cardConfirmSummary` | Order Summary Card | Card | — | — | Contains purchased items, voucher discounts, subtotal, Total Due, shipping address, and payment details as defined below. | — | Order detail data | Confirmation strings are partly hardcoded English. |
| 57 | `lstConfirmItems` | Purchased Items | List | — | Per order item | Shows product image/name, quantity, unit price, and line total. | Uses order detail data. | `order.items`, product projection | — |
| 58 | `lstVoucherDiscounts` | Voucher Discount Rows | List | Decimal values | Conditional | Green discount row for each voucher breakdown; fallback aggregate discount row if no voucher breakdown is available. | Currency formatted. | Order `voucherCodes` / `discountAmount` | — |
| 59 | `lblConfirmSubtotal` | Subtotal | Text | Decimal string | — | Displays subtotal. | — | Order subtotal | — |
| 60 | `lblConfirmTotalDue` | Total Due | Text | Decimal string | — | Displays final total and “Tax included” label; payment badge shows Paid or Pending Payment. | Currency formatted. | Order total/paymentStatus | Several labels hardcoded English. |
| 61 | `cardConfirmShipping` | Shipping Address | Card | — | — | Displays recipient, address lines, city/state/postal code, and country. | — | Order shippingAddress JSON | — |
| 62 | `cardConfirmPayment` | Payment Method | Card | Enum | — | Displays payment method and payment-status badge. | — | Order paymentMethod/paymentStatus | Several labels hardcoded English. |

### 4.11 Section [K]: Order Confirmation — Action Buttons (注文確認 — アクションボタン)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 55 | `btnContinueShopping` | Continue Shopping Button | Button (`button`, `primary`) | — | — | Visible. Text: “Continue Shopping”. | — | — | Navigates to `/buyer/search`. Confirmation label is hardcoded English. |
| 56 | `btnViewOrder` | View Order Button | Button (`button`, `secondary`) | — | — | Visible. Text: "View Order" / "注文を表示" | — | — | i18n key: `buyer.checkout.confirmation.viewOrder`. Navigates to `/orders/:orderId`. Tailwind: `w-full`. |


---

## 5. Item Behaviors & Event Specifications (各項目における挙動・イベント仕様)

### 5.1 Load Checkout Page (`/buyer/checkout`)
- **Trigger:** Buyer navigates from `/buyer/cart` or opens the route directly.
- **Processing:** The page requests `GET /api/v1/checkout`; the backend upserts the cart and returns current cart/product data and totals. Loading shows a spinner. Request failure shows “Unable to load checkout”. Empty `items` is a successful response: checkout form and empty summary remain visible; there is no automatic redirect or empty-cart toast.
- **Authentication:** The app protected route redirects guests. If the component renders unauthenticated, its dialog offers `/login?redirect=%2Fcheckout` and close navigates to `/buyer/cart`.
- **Stock:** Each item exposes `isAvailable`; the page does not render a distinct stock warning in the mounted checkout component.

### 5.2 Sponsored Advertisement Display (`slotAdCheckout` on mount)
- **Trigger:** Shared `AdBannerSlider` mounts after the checkout header.
- **Request:** `GET /api/v1/search/ads?placement=checkout_page_banner`; this is public and runs through the search ads endpoint. The separate `/api/v1/checkout/sponsored-ads` endpoint is unused by the page.
- **Eligibility and ordering:** SearchService filters matching fee-setting placement, approved and active ads, schedule (`startsAt <= now`, `expiresAt >= now`) and approved shops; orders by `startsAt DESC`, returns at most five, and maps every ad to `tier: standard`. This route has no payment-status filter, named tier ranking, Redis rotation, or five-minute response cache.
- **Display:** No eligible ads or query error means no panel. One card is shown at a time; it auto-advances and loops every 5 seconds, with previous/next and dot controls for multiple ads. Hover/focus pauses the timer; `prefers-reduced-motion: reduce` disables timed auto-advance. There is no slide-down entrance or vertical slide transition.
- **Card content:** Image fallback chain is ad image, product image, sample image. Title uses ad title or product name. Description HTML is stripped. The announcement badge falls back to “SPONSORED”; a second badge uses merchant/category/default tag. The “Learn more” button and card use the resolved product/ad destination. Checkout does not pass `onAdClick`, so click analytics are not sent from this page.

### 5.3 Apply Coupon / Voucher (`Shop Voucher`)
- **Trigger:** Buyer opens the Shop Voucher row under a merchant’s cart items, then selects an available promotion or enters a code.
- **Requests:** Available merchant promotions use `GET /api/v1/checkout/merchant-promotions/:merchantId`. Manual code validation uses `POST /api/v1/checkout/validate-coupon` with `{ couponCode, subtotal: shopSubtotal }`.
- **Client validation:** Only non-empty trimmed input is required; there is no client-side format/length rule. The code is sent verbatim.
- **Success:** Close modal, store the voucher by merchant ID, update the shop discount indicator and order-wide Discount/Total. At most one voucher is stored for each merchant. A success toast is shown.
- **Failure:** Keep modal open for manual-entry error; display server message or “Invalid coupon code”. Validation endpoint can return a zero total; order submission rejects a merchant group with total at or below zero.

### 5.4 Remove Coupon / Voucher
- **Trigger:** Buyer clicks Remove on the applied voucher in the modal.
- **Processing:** Remove that merchant’s voucher from frontend state, close modal, and recompute totals. No remove API is called; a success toast is shown.

### 5.5 Place Order (`btnPlaceOrder` onClick)
- **Client checks:** React Hook Form + Zod validates shipping fields in `onChange` mode. Payment method defaults to `cod`. Notes are optional and capped at 500 characters by the textarea. Button is disabled when form is invalid or submitting.
- **Request:** `POST /api/v1/orders` with `shippingAddress`, `paymentMethod`, optional `voucherCodes` keyed by merchant ID, optional legacy `couponCode` (comma-joined applied codes), and optional `notes`.
- **Backend effects:** Re-fetch cart/product data, reject empty cart or inactive/insufficient-stock items, compute prices from database values, group by merchant, and create one order per merchant inside a Prisma transaction. Each order has status `placed` and payment status `pending`; stock decrements, promotions usage increments, merchant notifications and initial status history are created, and cart items are deleted in the transaction. Checkout does not write `inventory_transactions` rows. Failures are HTTP 400, including insufficient stock; frontend displays a generic failure toast.
- **Success:** Show success toast, then navigate to `/buyer/checkout/confirmation/{orders[0].orderId}`. Other order IDs are passed in `?orderIds=...`. Cart/query state is invalidated by the mutation hook.

### 5.6 Guest Checkout Attempt (`dlgGuestAlert`)
- The application’s protected route normally redirects guests before checkout renders. If rendered in the page component, the dialog’s Log in button navigates to `/login?redirect=%2Fcheckout`; closing returns to `/buyer/cart`.

### 5.7 Navigation Links
- `lnkBackToCart` and Cancel navigate to `/buyer/cart`.
- Confirmation `Continue Shopping` navigates to `/buyer/search`; `View Order` navigates to `/orders/:orderId`.
- There is no Print Receipt button. Sibling order details are loaded using the `orderIds` query parameter.

## 6. Validation & Error Message Mapping (バリデーション及びエラーメッセージマッピング)

### 6.1 Shipping Address Validation Errors

| Field | Client Rule | Server Rule | Display / Message |
| :--- | :--- | :--- | :--- |
| `recipientName` | Required; max 200; Unicode letters and spaces only. Input strips other characters. | String, non-empty, max 200. | Inline field message; letter-only key currently falls back to English in locales. |
| `phone` | Required; digits only; starts with 0; 9 or 11 digits; input max 11. | String, non-empty, max 20. | Inline required/digits/format error. |
| `addressLine1` | Required; max 255. | String, non-empty, max 255. | Inline required/length error. |
| `addressLine2` | Optional; max 255. | Optional string, max 255. | No required error. |
| `city`, `state` | Required; max 100 each. | String, non-empty, max 100 each. | Inline required/length error. |
| `postalCode` | Required; digits only; 4–7 digits. | String, non-empty, max 20. | Inline required/digits/format error. |
| `country` | Fixed country selection, defaults to `JP`; client requires non-empty. | String, non-empty, max 100. | Inline required error. |

### 6.2 Payment Method Validation Errors

The radio group always has a selection, default `cod`; choices are `cod`, `bank_transfer`, and `card`. Backend DTO rejects values outside that set with HTTP 400. The UI does not expose a “no method selected” state through its normal flow.

### 6.3 Coupon / Voucher Validation Errors

| Condition | Current API/UI behavior |
| :--- | :--- |
| Empty manual entry | Apply disabled; handler also trims and returns without dispatch. |
| Invalid code not found | HTTP 404 `RES_001`; modal displays extracted server message or localized “Invalid coupon code”. |
| Inactive, expired/not-yet-valid, minimum not met, usage cap reached | HTTP 400 `VAL_001`; modal displays server message for manual entry. |
| Already used by buyer | Available-voucher listing marks it and disables selection; manual validate-coupon endpoint does not enforce prior buyer use. |
| Code format/length | No client format or length validation; DTO requires non-empty string but no max length. |
| Coupon reduces preview total to zero | Validation endpoint returns `newTotal: "0.00"`; order endpoint rejects a merchant group total at or below zero. |

### 6.4 Order Placement Errors

| Scenario | API response | User-visible behavior |
| :--- | :--- | :--- |
| Shipping field invalid | Client form remains invalid; no request sent. Direct API payload receives HTTP 400 validation error. | Field-level message in form. |
| Empty cart | Checkout GET succeeds with `items: []`; POST order returns HTTP 400 `VAL_001`. | Empty summary/form remains on checkout; on submit failure, generic order failure toast. |
| Stock insufficient/inactive product | HTTP 400 `VAL_001` (not 409); transaction rolls back order-side writes. | Generic “Failed to place order. Please try again.” toast. |
| Non-positive merchant-order total | HTTP 400 `VAL_001`. | Generic order failure toast. |
| Unauthenticated | Protected route normally redirects before checkout; endpoints return HTTP 401 `AUTH_001`. | Login flow. |
| Unexpected placement error | Server error. | Generic order failure toast. |

### 6.5 Validation Enforcement Layers

1. **Frontend:** React Hook Form + Zod for shipping fields, with on-change validation. Coupon manual-entry validation checks non-empty trimmed input only.
2. **Backend:** NestJS ValidationPipe and DTO validation. CreateOrderDto.notes has no server maximum; the textarea limits to 500 characters.
3. **Database:** Prisma constraints and transaction behavior.
## 7. API Response Mapping (APIレスポンスマッピング)

### 7.1 Load Checkout Success Response

`GET /api/v1/checkout` returns HTTP 200, including for an empty cart. Current item fields include `id`, `productId`, `productName`, `productImage`, decimal-string `unitPrice`, `quantity`, decimal-string `lineTotal`, `stockQuantity`, `isAvailable`, `merchantId`, and `merchantName`.

```json
{
  "data": {
    "items": [{
      "id": "uuid", "productId": "uuid", "productName": "Product Name",
      "productImage": "https://...", "unitPrice": "29.99", "quantity": 2,
      "lineTotal": "59.98", "stockQuantity": 15, "isAvailable": true,
      "merchantId": "uuid", "merchantName": "Shop Name"
    }],
    "subtotal": "59.98", "discountAmount": "0.00", "total": "59.98", "cartId": "uuid"
  }
}
```

`isAvailable` is computed from product active status and stock quantity. Empty cart returns `items: []`, subtotal/total `"0.00"`; this is not an API error.

### 7.2 Validate Coupon Success Response

Request: `{ "couponCode": "CODE", "subtotal": 59.98 }` (the current UI sends the merchant subtotal). Response values are decimal strings and calculated from supplied subtotal. Validation does not increment usage count.

```json
{
  "data": {
    "discountType": "percentage",
    "discountValue": "10.00",
    "discountAmount": "5.99",
    "newTotal": "53.99"
  }
}
```

### 7.3 Place Order Success Response (201)

Request can include `voucherCodes` keyed by merchant ID. Response contains an `orders` array with one entry per merchant group. The page uses the first order as the primary confirmation and puts remaining IDs in the `orderIds` query parameter.

```json
{
  "data": {
    "orders": [{
      "orderId": "uuid", "orderNumber": "ORD-XXXXXXXX", "merchantId": "uuid",
      "status": "placed", "subtotal": "59.98", "discountAmount": "5.99",
      "total": "53.99", "paymentMethod": "cod", "shippingAddress": { "recipientName": "Buyer" },
      "createdAt": "2026-10-21T12:00:00.000Z",
      "estimatedDelivery": "2026-10-28T12:00:00.000Z"
    }]
  }
}
```

Saved orders have payment status `pending`. Estimated delivery is returned by order placement but not displayed on confirmation. Multi-merchant carts produce one order object per merchant.

### 7.4 Sponsored Ad Slot Response

The checkout page calls `GET /api/v1/search/ads?placement=checkout_page_banner`. SearchService returns `{ data: [...] }`, up to five ads ordered by `startsAt DESC`; every ad currently has `tier: "standard"`.

```json
{
  "data": [{
    "id": "uuid", "placement": "checkout_page_banner", "title": "Ad title",
    "announcementMessage": "Sponsored", "description": "Description",
    "imageUrl": "https://...", "sku": "SKU-1", "tier": "standard",
    "approvalStatus": "approved", "startsAt": "2026-10-01T00:00:00.000Z",
    "expiresAt": "2026-10-31T23:59:59.000Z"
  }]
}
```

The separate `GET /api/v1/checkout/sponsored-ads` response is not consumed by the mounted checkout page.
## 8. i18n Keys Reference (i18nキーリファレンス)

Checkout labels and controls use the `buyer.checkout.*` translation namespace. Main groups include `title`, `subtitle`, `actions.*`, `shippingAddress.*`, `payment.*`, `orderNotes.*`, `vouchers.*`, `auth.*`, `errors.*`, `toasts.*`, and `processing`. The summary also uses shared `cart.summary`, `cart.subtotal`, `cart.total`, and `orders.detail.discount` keys.

Checkout supports EN / JA / MY localization. The recipient-name “letters and spaces only” validation key is missing from locale bundles and falls back to English. Order Confirmation still contains multiple hardcoded English labels; older per-locale confirmation key tables do not guarantee rendered localization.
## 9. Database Field Mapping (データベースフィールドマッピング)

### 9.1 Checkout Form → Database

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
| Applied merchant vouchers | `voucherCodes` (per-merchant map) and legacy `couponCode` | `voucher_codes` (JSONB) and `coupon_code` (nullable string) | `orders` | JSONB / TEXT |
| `txtNotes` | `notes` | `notes` | `orders` | TEXT |

### 9.2 Order Items → Database

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

### 10.3 Shared Checkout Ad Banner

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/shared/AdBannerSlider.tsx` |
| **Data hook/service** | `features/search/hooks/useSponsoredAds.ts` → `features/search/services/ad.service.ts` |
| **Checkout placement** | `checkout_page_banner` |
| **Behavior** | Auto-advance every five seconds; hover/focus pause; reduced-motion stops timed auto-advance; empty/error data hides banner. |
| **Not present on checkout** | Slide-down/vertical transition, named package-tier ranking, rotation, five-minute cache, and click analytics callback wiring. |
## 11. Special UI Notes & Styling Constraints (特記事項・UI仕様)

- **Checkout composition:** Buyer checkout route is `/buyer/checkout`. Page content uses a `max-w-5xl` container. Header and ad banner precede the checkout form; summary and shipping card form a two-column grid at `lg`; payment, notes, and action buttons span the form width.
- **Currency:** Order summary formats rounded values as Myanmar kyat (`Ks`) in the current shared checkout component.
- **Order state:** Checkout calculates display totals client-side from fetched subtotal and merchant voucher discounts. Server recomputes prices and totals when placing orders.
- **Ad panel:** Shared `AdBannerSlider` hides when no eligible ads are present; behavior and endpoint are specified in Sections 4.2 and 5.2.
- **Confirmation limitations:** Only View Order and Continue Shopping buttons are rendered. Order number is shown, estimated delivery is not rendered, and multiple confirmation labels remain hardcoded English.
- **Accessibility:** Carousel has keyboard-operable card, previous/next, and dot controls; reduced-motion disables auto-advance; voucher modal errors use `role="alert"`.
- **Implementation gaps:** Checkout does not create inventory ledger rows; notes maximum is enforced only by the UI; buyer tracking page is not mounted.

## 12. Testing Checklist (テストチェックリスト)

These are proposed manual/e2e checks against current behavior; all remain unchecked unless separately evidenced in `Checkout_Purchase_PCL.md`.

### 12.1 Checkout Page

- [ ] Checkout page loads cart data and displays shop-grouped items, subtotal, voucher rows, discount (when positive), total, shipping, payment, and notes.
- [ ] Empty-cart GET renders the empty summary/form; no redirect to cart occurs.
- [ ] Guest access follows protected-route redirect; component dialog links to `/login?redirect=%2Fcheckout` if it renders.
- [ ] Shipping fields enforce client rules, including phone 9/11 digit patterns, postal 4–7 digits, and country default JP.
- [ ] Shop Voucher opens available promotions and manual code entry for that merchant.
- [ ] Coupon input has no client format/length check; Apply remains disabled when input is blank.
- [ ] Applying/removing a voucher updates that merchant row and aggregate discount/total.
- [ ] Ad banner uses `checkout_page_banner`; empty/error responses hide it; carousel controls and reduced-motion behavior match Section 4.2.
- [ ] Place Order is disabled while shipping form is invalid or request is pending.
- [ ] Successful placement navigates to primary order confirmation and carries sibling IDs in `orderIds`.
- [ ] Failed order submission displays the generic failure toast.

### 12.2 Order Confirmation

- [ ] Confirmation renders order number (`ORD-XXXXXXXX`), status/payment, item/totals, shipping, and payment method.
- [ ] Estimated delivery is not currently rendered.
- [ ] Continue Shopping navigates to `/buyer/search`; View Order navigates to `/orders/:orderId`.
- [ ] No Print Receipt button is rendered.
- [ ] Several confirmation strings remain hardcoded English.

### 12.3 Verification Status

- [ ] E2E scenarios and test completion remain tracked in `Checkout_Purchase_PCL.md`; current PCL scenarios are not marked complete.

---

*End of Screen Items Specification (Checkout & Order Placement)*