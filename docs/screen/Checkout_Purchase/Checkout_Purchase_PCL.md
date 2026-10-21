# Program Checklist (PCL) — Checkout & Purchase

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-PCL-CHECK-001 |
| **Target Screen** | Checkout & Purchase |
| **Subsystem** | Buyer Module — Checkout & Purchase (Checkout Page + Order Confirmation Page) |
| **Version** | 1.2 |
| **Created** | 2026-10-19 |
| **Last Updated** | 2026-10-20 |
| **Status** | Active |

## 1. Normal Scenarios (N) — Happy Path

- [ ] **N-01**: Checkout page loads with order summary, shipping form, and payment options
  - **Precondition**: Authenticated buyer (`buyerPage` fixture / seed buyer `eem@gmail.com`) with a non-empty cart.
  - **Steps**:
    1. Log in as a buyer.
    2. Navigate to `/buyer/checkout`.
    3. Wait for the checkout query to resolve.
  - **Expected Result**: The page renders the order summary (product image, name, `Sold by {merchant}`, `Qty: {n} x {unitPrice}`, line total per item), `Subtotal`, `Discount` (row hidden when $0), and `Total`; the shipping address form, payment radios (Cash on Delivery / Bank Transfer / Card), optional Order Notes textarea, and the `Place Order` / `Back to Cart` buttons are visible. The ad panel renders only when eligible ads exist (N-09).
  - **Business Rules**: BR-CHECK-001, BR-CHECK-002, BR-CHECK-006, BR-CHECK-008, BR-CHECK-010
  - **API**: `GET /api/v1/checkout` → `{ data: { items, subtotal, discountAmount: "0.00", total, cartId } }`
  - **Note**: Test `e2e/tests/Checkout_Purchase/checkout.spec.ts` › "should display checkout page with order summary" — **currently FAILS**: it uses the unauthenticated `{ page }` fixture (ProtectedRoute redirects to `/login`) and its `order-summary` locator matches nothing. **No `data-testid="order-summary"` exists**; the summary title is `t('cart.summary')` = "Order Summary" and the only checkout test id in the app is `data-testid="order-confirmation"`. Left unchecked.

- [ ] **N-02**: Shipping form loads with empty fields and default country (JP)
  - **Precondition**: Authenticated buyer on `/buyer/checkout`.
  - **Steps**:
    1. Open `/buyer/checkout`.
    2. Inspect the shipping address form.
  - **Expected Result**: All shipping address fields (`Recipient Name`, `Phone`, `Address Line 1`, `Address Line 2 (optional)`, `City`, `State`, `Postal Code`) start completely empty with placeholder text, and `Country` defaults to `JP`.
  - **Business Rules**: BR-CHECK-004
  - **API**: `GET /api/v1/checkout`
  - **Note**: Form state matches implementation in `CheckoutForm.tsx:139-148` where all shipping fields are initialized to empty strings (`''`) except `country: 'JP'`.

- [ ] **N-03**: Payment method defaults to Cash on Delivery
  - **Precondition**: Authenticated buyer on `/buyer/checkout`.
  - **Steps**:
    1. Open `/buyer/checkout`.
    2. Inspect the Payment Method section.
  - **Expected Result**: `cod` (Cash on Delivery) is selected by default; selecting `bank_transfer` or `card` updates the selection; the chosen value is submitted with `POST /api/v1/orders`.
  - **Business Rules**: BR-CHECK-005
  - **API**: None (client state; submitted with `POST /api/v1/orders`, DTO `@IsIn(['cod','bank_transfer','card'])`)
  - **Note**: Left unchecked — implemented as `useState<PaymentMethod>('cod')` (`CheckoutForm.tsx:134`); rendered as a `RadioGroup` (ids `cod`/`bank_transfer`/`card`), **not a combobox** (the existing page-object `paymentMethodSelect` locator is wrong).

- [ ] **N-04**: Apply a valid coupon code and see the discount and total update
  - **Precondition**: Authenticated buyer with cart subtotal $59.98; a valid active coupon exists for one of the cart's shops.
  - **Steps**:
    1. Open `/buyer/checkout`.
    2. On a shop row click `Shop Voucher`, then enter the code in the coupon input (any length — no client-side format check) and click `Apply`.
  - **Expected Result**: `POST /api/v1/checkout/validate-coupon` returns 200 with `{ discountType, discountValue, discountAmount, newTotal }`; the applied chip renders the uppercase code + "applied"; the shop discount pill and the `Discount` row show `-{amount}`; `Total = Subtotal − Σ discounts` (floored at 0); a "Coupon applied successfully" toast is shown.
  - **Business Rules**: BR-COUPON-007, BR-COUPON-008, BR-CHECK-009, BR-CHECK-010
  - **API**: `POST /api/v1/checkout/validate-coupon` (body `{ couponCode, subtotal }`)
  - **Note**: Left unchecked — matches e2e stub title "should apply a valid promo code" (`checkout.spec.ts:34`) which is a screenshot-only TODO (no discount assertions). Applied codes are upserted to server (looked up verbatim; no uppercasing client- or server-side).

- [ ] **N-05**: Remove an applied coupon and verify the total reverts
  - **Precondition**: Authenticated buyer on `/buyer/checkout` with a coupon already applied (discount > $0).
  - **Steps**:
    1. Open the shop voucher modal and click `Remove` on the applied coupon chip.
  - **Expected Result**: The coupon chip disappears, that shop's discount resets to $0 (the `Discount` row hides when no shop has a discount), and `Total` reverts to `Subtotal`. A "Coupon removed" toast is shown.
  - **Business Rules**: BR-CHECK-009, BR-CHECK-010, BR-COUPON-008 (one coupon per shop — replacement/removal, never stacking)
  - **API**: None (client state reset)
  - **Note**: Left unchecked — no e2e test exists. Removal is client-side only (there is no remove endpoint).

- [ ] **N-06**: Place an order successfully and reach the Order Confirmation page
  - **Precondition**: Authenticated buyer with in-stock cart items; valid shipping address entered; payment method selected.
  - **Steps**:
    1. Open `/buyer/checkout`.
    2. Fill all required shipping fields with valid data.
    3. Keep/choose a payment method and optionally add order notes.
    4. Click `Place Order`.
  - **Expected Result**: The loading overlay (EL-70) "Processing your order..." appears while submitting; on 201 the overlay hides and the browser navigates to `/buyer/checkout/confirmation/{orderId}` using `orders[0]` (the primary order) from the response; sibling split orders ride along as `?orderIds=id2,id3`.
  - **Business Rules**: BR-CHECK-004, BR-CHECK-005, BR-CHECK-007, BR-CHECK-011, BR-CHECK-012, BR-CHECK-013, BR-CHECK-014
  - **API**: `POST /api/v1/orders` → 201 `{ data: { orders: [...] } }`
  - **Note**: Left unchecked — matches e2e stub "should place an order successfully" (`checkout.spec.ts:20`), a screenshot-only TODO. Redirect implemented at `Checkout.tsx:108`.

- [ ] **N-07**: Order Confirmation page renders the placed order details
  - **Precondition**: Buyer has just placed an order (status `placed`) and is on `/buyer/checkout/confirmation/:orderId`.
  - **Steps**:
    1. Complete checkout (N-06).
    2. Inspect the confirmation page.
  - **Expected Result**: Success icon and "Order Placed Successfully!" title; the order identifier is shown as the server-generated `orderNumber` (`ORD-XXXXXXXX`) rendered as `#{orderNumber}` in a `font-mono` span — **not** a truncated UUID; payment-status badge (`Paid` / `Pending Payment`); summary card with items (image, name, quantity, unit price, line total), per-voucher green discount rows, Subtotal, `Total Due`, shipping address block, and payment method label. Exact-total below subtotal.
  - **Business Rules**: BR-CHECK-013, BR-CHECK-015, BR-DISP-001, BR-DISP-004
  - **API**: `GET /api/v1/orders/:id` (Order Insights read endpoint) + sibling `?orderIds=` via `useQueries`
  - **Note**: Left unchecked — **deviations:** the estimated-delivery row (EL-86) is **never rendered** (`estimatedDelivery` exists in the type but is unused); order id uses `orderNumber`, not `#` + first 8 UUID chars; several confirmation strings are hardcoded English (see N-14). Root element has `data-testid="order-confirmation"`.

- [ ] **N-08**: Successful order placement applies all write effects atomically
  - **Precondition**: Buyer places an order with a coupon applied and stock available for all items.
  - **Steps**:
    1. Record product `stock_quantity`, coupon `used_count`, and cart contents before submitting.
    2. Place the order (N-06).
    3. Snapshot the DB after the redirect.
  - **Expected Result**: One `orders` row (status `placed`, `payment_status: pending`), one `order_items` row per cart item with prices locked at creation, one initial `order_status_history` row, and an `ORDER_PLACED` notification for the merchant; `products.stock_quantity` decremented per quantity; `promotions.used_count` incremented by 1 per applied code; converted `cart_items` rows deleted while the `carts` header is retained. All writes occur in a single `prisma.$transaction`.
  - **Business Rules**: BR-CHECK-011, BR-CHECK-012, BR-CHECK-013, BR-CHECK-014, BR-CHECK-015, BR-COUPON-009
  - **API**: `POST /api/v1/orders`
  - **Note**: Left unchecked — no test exists. **No `inventory_transactions` rows are created by checkout** (that table is only read/written by the products module), contradicting the DD expectation. Evidence when passed: DB snapshot `N-08_db_orders.json`.

- [ ] **N-09**: Sponsored ad panel renders eligible Checkout ads
  - **Precondition**: At least one approved, active, in-schedule ad with the `checkout_page_banner` placement exists; buyer on `/buyer/checkout`.
  - **Steps**:
    1. Open `/buyer/checkout`.
    2. Observe the ad panel (`AdBannerSlider`, rendered at `Checkout.tsx:193`).
  - **Expected Result**: The panel renders one card per eligible ad (badge, title, description, CTA) with a `Sponsored` badge and prev/next chevrons + dot indicators when more than one ad is eligible. Checkout remains fully usable if ads load slowly or fail (empty → panel hidden).
  - **Business Rules**: BR-AD-001, BR-AD-002, BR-AD-003, BR-AD-004, BR-AD-005, BR-AD-007, BR-AD-009
  - **API**: `GET /api/v1/ads?placement=checkout_top` (designed) — **as-built: `GET /api/v1/search/ads?placement=checkout_page_banner`**
  - **Note**: Left unchecked — **major design deviation.** The live page uses shared `AdBannerSlider` (feature `SponsoredAdSlider` + `checkoutService.getSponsoredAds()` are dead code); the endpoint is `GET /api/v1/search/ads?placement=checkout_page_banner`, not `/api/v1/ads?placement=checkout_top`. There is **no `take` cap of 5** and **no premium-first tier ranking / Redis cache / round-robin rotation** in the as-built path (the old `checkout/sponsored-ads` service ordered by `createdAt desc, paymentAmount desc` with no limit). Unit test `AdBannerSlider.test.tsx` covers placement/filtering/hide-when-empty.

- [ ] **N-10**: Ad carousel auto-advances every 5 seconds and loops
  - **Precondition**: 2–3 eligible ads rendered in the checkout ad panel.
  - **Steps**:
    1. Leave the pointer outside the ad panel and keep it unfocused.
    2. Wait 5 seconds, then another 5 seconds.
  - **Expected Result**: The visible slide advances every 5000 ms (`AUTO_SLIDE_MS`); after the last slide it loops back to the first; the dot indicator reflects the current index.
  - **Business Rules**: DD_CHECK-02 §3.2.1, BR-AD-007 (max 5 slides)
  - **API**: `GET /api/v1/search/ads?placement=checkout_page_banner` (as-built)
  - **Note**: Left unchecked — no e2e test; **transition deviation** (live `AdBannerSlider` uses `transition-all duration-700` on CardContent + `duration-300` dots; it is **not** a vertical slide-down of the designed 500 ms). Unit test `AdBannerSlider.test.tsx` › "advances to the next advertisement and back".

- [ ] **N-11**: Ad carousel pauses on hover/focus and resumes on leave/blur
  - **Precondition**: Ad panel with multiple slides is visible on `/buyer/checkout`.
  - **Steps**:
    1. Hover the pointer over the ad panel; wait 7 seconds.
    2. Move the pointer away; wait 5 seconds.
    3. Keyboard-focus the panel/CTA; wait 7 seconds; then blur it.
  - **Expected Result**: No slide change while hovered or focused; auto-advance resumes after pointer leave / blur.
  - **Business Rules**: BR-AD-011 (WCAG 2.2.2)
  - **API**: None (client behavior)
  - **Note**: Left unchecked — no e2e test. Implemented in `AdBannerSlider` (hover + focus capture) but unverified.

- [ ] **N-12**: Ad CTA click fires the analytics event
  - **Precondition**: Ad panel with at least one ad is visible.
  - **Steps**:
    1. Click the CTA button of the visible ad.
  - **Expected Result**: The `ad.click` analytics event fires carrying `ad_id` and `placement = checkout_top`; the CTA destination (`ctaUrl`) opens.
  - **Business Rules**: BR-AD-012
  - **API**: None (client-side analytics)
  - **Note**: Left unchecked — **missing implementation.** `AdBannerSlider` supports an `onAdClick` callback but **Checkout.tsx does not pass it**, so no analytics fires on checkout. Clicking navigates (card is `role="link"` → `/buyer/products/:sku`).

- [ ] **N-13**: Order Confirmation action buttons work
  - **Precondition**: Buyer is on `/buyer/checkout/confirmation/:orderId`.
  - **Steps**:
    1. Click `Continue Shopping`.
    2. Return to the confirmation page and click `View Order`.
  - **Expected Result**: `Continue Shopping` navigates to the product listing; `View Order` navigates to `/orders/:orderId` (the Order Insights screen); 
  - **Business Rules**: None (navigation / browser print)
  - **API**: None
  - **Note**: Left unchecked — **deviations confirmed:** only two buttons exist (`OrderConfirmation.tsx:396-410`). `Continue Shopping` → `/buyer/search` (**not** `/products`); `View Order` → `/orders/:id` (matches);

- [ ] **N-14**: Language toggle updates checkout and confirmation labels
  - **Precondition**: User is on `/buyer/checkout` or `/buyer/checkout/confirmation/:orderId`.
  - **Steps**:
    1. Toggle language to Japanese; verify labels, toasts, validation messages, and the log-in dialog text.
    2. Toggle language to Myanmar; verify again.
    3. Toggle back to English.
  - **Expected Result**: All UI labels, button texts, toasts, and error messages switch to the selected locale (EN / JA / MY) without layout breakage.
  - **Business Rules**: None (i18n)
  - **API**: None
  - **Note**: Left unchecked — **partial implementation.** Checkout is fully keyed under `buyer.checkout.*`; but several **OrderConfirmation strings are hardcoded English** ("Order Placed Successfully!", "Reserved Formulations", "Subtotal", "Total Due", "Tax included", "Shipping Address", "Payment Method", "View Order", "Continue Shopping", "Order not found").

- [ ] **N-15**: Theme toggle works on checkout and confirmation pages
  - **Precondition**: User is on `/buyer/checkout` or `/buyer/checkout/confirmation/:orderId`.
  - **Steps**:
    1. Toggle theme to dark mode; verify styling.
    2. Toggle back to light mode.
  - **Expected Result**: Background, cards, badges, and overlays switch between dark and light modes without layout breakage.
  - **Business Rules**: None (UI)
  - **API**: None
  - **Note**: Left unchecked — no test exists. Scenario DD_CHECK-06 §4 — E2E-CHECK-13.

- [ ] **N-16**: Responsive layout on desktop viewport
  - **Precondition**: Viewport >= 1024px.
  - **Steps**:
    1. Set viewport to 1280x720.
    2. Open `/buyer/checkout`.
  - **Expected Result**: Desktop layout shows the order summary and shipping/payment sections side by side (`grid lg:grid-cols-2`); no horizontal scroll; ad card sits in its designed slot.
  - **Business Rules**: None (Responsive)
  - **API**: None
  - **Note**: Left unchecked — no e2e test. Scenario DD_CHECK-06 §4 — E2E-CHECK-14.

- [ ] **N-17**: Responsive layout on mobile viewport
  - **Precondition**: Viewport < 768px.
  - **Steps**:
    1. Set viewport to 375x667.
    2. Open `/buyer/checkout` and `/buyer/checkout/confirmation/:orderId`.
  - **Expected Result**: Sections stack vertically (order summary, shipping, payment, notes, totals) and scroll normally; the ad card stacks content correctly; no horizontal overflow.
  - **Business Rules**: None (Responsive)
  - **API**: None
  - **Note**: Left unchecked — no e2e test. Scenario DD_CHECK-06 §4 — E2E-CHECK-14.

- [ ] **N-18**: Language toggle updates all checkout labels (Japanese)
  - **Precondition**: Buyer is authenticated with cart items; on `/buyer/checkout`.
  - **Steps**:
    1. Open `/buyer/checkout`.
    2. Toggle language to Japanese (`日本語`) via the header language selector.
    3. Verify all UI labels, section titles, payment methods, order summary, notes, and buttons.
  - **Expected Result**: All checkout UI switches to the values in `ja/translation.json` under `buyer.checkout.*`: title "購入手続き", subtitle "注文情報を安全に入力してください", Back to Cart "カートに戻る", Shipping Address title "お届け先住所" (`orders.detail.shippingTitle`), Recipient Name label "受取人名", Phone "電話番号", Address Line 1 "住所1", Address Line 2 "住所2（任意）", City "市区町村", State "都道府県", Postal Code "郵便番号", Country "国", Payment Method "お支払い方法", Cash on Delivery "代金引換", Bank Transfer "銀行振込", Card "クレジット・デビットカード", Order Notes "注文メモ（任意）", Cancel "キャンセル" (`common.cancel`), Place Order button "注文する" (`actions.placeOrder`), Order Summary "注文概要" (`cart.summary`), Subtotal "小計" (`cart.subtotal`), Total "合計" (`cart.total`), currency in `Ks`.
  - **Business Rules**: None (i18n)
  - **API**: None
  - **Note**: Left unchecked — no e2e test. Scenario DD_CHECK-06 §4 — E2E-CHECK-13. **Corrections vs. earlier draft:** the Place Order label is "注文する" (not「注文を確定する」) and the Shipping Address title is "お届け先住所".

- [ ] **N-19**: Language toggle updates all checkout labels (Myanmar)
  - **Precondition**: Buyer is authenticated with cart items; on `/buyer/checkout`.
  - **Steps**:
    1. Open `/buyer/checkout`.
    2. Toggle language to Myanmar (`မြန်မာ`) via the header language selector.
    3. Verify all UI labels, section titles, payment methods, order summary, notes, and buttons.
  - **Expected Result**: All checkout UI switches to the values in `my/translation.json`: title "ငွေရှင်းရန်", subtitle "သင့်အော်ဒါအချက်အလက်များကို လုံခြုံစွာဖြည့်ပါ", Back to Cart "စျေးခြင်းဘူးသို့ ပြန်သွားရန်", Shipping Address title (from `orders.detail.shippingTitle`), Payment Method "ငွေပေးချေနည်းလမ်း", Cash on Delivery "ပစ္စည်းရောက်မှ ငွေပေးချေ", Bank Transfer "ဘဏ်လွှဲပြောင်း", Card "ကတ်ငွေပေးချေ", Order Notes "အော်ဒါ မှတ်ချက် (မဖြည့်လည်းရပါသည်)", Cancel "ပယ်ဖျက်ရန်" (`common.cancel`), Place Order "အော်ဒါမှာရန်" (`actions.placeOrder`), Order Summary (`cart.summary`), Subtotal (`cart.subtotal`), Total (`cart.total`), and currency display in `Ks`.
  - **Business Rules**: None (i18n)
  - **API**: None
  - **Note**: Left unchecked — no e2e test. Scenario DD_CHECK-06 §4 — E2E-CHECK-13. (Later draft labels like「အမှာစာ တင်မည်」do not match the shipped bundle; the shipped value is "အော်ဒါမှာရန်".)

- [ ] **N-20**: Shipping form validation error messages display in selected language (Japanese / Myanmar)
  - **Precondition**: Buyer is authenticated on `/buyer/checkout`.
  - **Steps**:
    1. Toggle language to Japanese (`日本語`).
    2. Trigger form validation by leaving required fields empty or entering invalid formats.
    3. Verify inline error messages in Japanese ("受取人名は必須です。", "電話番号は必須です。", "住所は必須です。", "市区町村は必須です。", "都道府県は必須です。", "郵便番号は必須です。", "電話番号は0から始まり、9桁または11桁で入力してください。", "郵便番号は4〜7桁で入力してください。").
    4. Toggle language to Myanmar (`မြန်မာ`) and trigger validation; verify inline error messages.
    5. Toggle back to English and verify English error messages.
  - **Expected Result**: Inline field validation messages dynamically switch to the active language via the `VALIDATION_KEYS` map (`CheckoutForm.tsx:86-112`) and `CheckoutValidationMessage` without a page reload.
  - **Business Rules**: BR-CHECK-004
  - **API**: None (client-side validation)
  - **Note**: Left unchecked — no e2e test. **Gap:** the zod message "Name must contain letters and spaces only" maps to key `recipientNameLettersOnly`, which is **missing from all locale files**, so it falls back to English in every language. Most other keys resolve in EN/JA/MY.

- [ ] **N-21**: Toast notifications and modals respect selected language
  - **Precondition**: Buyer is authenticated on `/buyer/checkout`.
  - **Steps**:
    1. Set language to Japanese (`日本語`).
    2. Apply a valid coupon / invalid coupon and observe toast messages.
    3. Remove an applied coupon and observe toast message.
    4. Click Place Order and observe the loading overlay text ("注文を処理しています...").
    5. Repeat with Myanmar (`မြန်မာ`) and English.
  - **Expected Result**: Toast notifications (coupon applied/removed/invalid, order placed/failed) and the loading overlay are translated to the active language via `buyer.checkout.toasts.*` and `buyer.checkout.processing`.
  - **Business Rules**: None (i18n)
  - **API**: None
  - **Note**: Left unchecked — no e2e test. Overlay text confirmed as `buyer.checkout.processing` ("Processing your order..." in EN).

- [ ] **N-22**: Order placement creates an ORDER_PLACED in-app notification for the merchant
  - **Precondition**: Authenticated buyer with a non-empty cart; the cart's shop(s) belong to registered merchant account(s); order placement succeeds (N-06).
  - **Steps**:
    1. Place the order (N-06).
    2. Log in as the merchant user of the ordered shop.
    3. Call `GET /api/v1/notifications` and `GET /api/v1/notifications/unread-count`.
  - **Expected Result**: Exactly one notification exists per merchant group (multi-merchant cart → one notification per merchant, each pointing at its own order): `type: "ORDER_PLACED"`, `title: "New order received"`, `message: "A buyer placed order {orderNumber}."`, `entityType: "order"`, `entityId` = the created order's id, `userId` = the merchant's user id; it appears newest-first in the merchant's list and the unread count increases by 1. The notification is written inside the same `prisma.$transaction` as the order, so a rolled-back placement (A-05, B-07) leaves no notification behind and no other user receives it.
  - **Business Rules**: B-CHECK-010 (機能設計書 §11.2 — `order_placed` → Merchant: "New order received")
  - **API**: `POST /api/v1/orders` (creates the notification) → `GET /api/v1/notifications`, `GET /api/v1/notifications/unread-count` (merchant-side verification)
  - **Note**: Left unchecked — no test exists. As-built at `orders.service.ts:214-223`: a direct `tx.notification.create` per merchant group (not via `NotificationsService`); title/message are **hardcoded English** (not i18n). No push/email is sent — in-app only (機能設計書 §11.1: no real-time WebSocket required). Related: N-08 (atomic write effects include the ORDER_PLACED notification).
---

## 2. Abnormal Scenarios (A) — Error & Negative Paths

- [ ] **A-01**: Empty cart is blocked from checkout
  - **Precondition**: Buyer B is authenticated with zero `cart_items`.
  - **Steps**:
    1. Log in as buyer B.
    2. Navigate to `/buyer/checkout`.
  - **Expected Result**: Toast "Your cart is empty"; no order summary and no `Place Order` button rendered.
  - **Business Rules**: BR-CHECK-002
  - **API**: `GET /api/v1/checkout` → 400 `CHECK_001`
  - **Note**: Left unchecked — **design gap.** `getCheckoutData` upserts a cart and returns `{ items: [], subtotal: "0.00", total: "0.00" }` with **HTTP 200** — it never throws `CHECK_001`. The frontend surfaces the "Unable to load checkout" state only when the query itself errors.

- [ ] **A-02**: Unauthenticated access to checkout is redirected to login
  - **Precondition**: No session (logged out).
  - **Steps**:
    1. Navigate directly to `/buyer/checkout`.
  - **Expected Result**: Redirect to `/login?redirect=/checkout` so the buyer returns to checkout after logging in; no checkout data is requested without a token.
  - **Business Rules**: BR-CHECK-001
  - **API**: Any checkout endpoint without a token → 401 `AUTH_001`
  - **Note**: Left unchecked — **redirect works but the return path is dropped.** `ProtectedRoute` navigates to plain `/login` with no `redirect` query (`ProtectedRoute.tsx:10-21`).

- [ ] **A-03**: Guest on a stale checkout view is blocked by the Guest Login dialog
  - **Precondition**: A `/buyer/checkout` view is open but the session has expired or the user is a guest.
  - **Steps**:
    1. On the stale checkout view, click `Place Order`.
    2. Read the dialog message; click `Log in`.
    3. Close the dialog via its close control.
  - **Expected Result**: A log-in dialog opens with "Please log in to complete your purchase." / 「購入を完了するにはログインしてください。」 (`buyer.checkout.auth.*`); `Log in` navigates to `/login?redirect=%2Fcheckout`; the close control dismisses the dialog (navigating to `/buyer/cart`); no order is created.
  - **Business Rules**: BR-CHECK-001, BR-CHECK-003 (guest has no buyer session)
  - **API**: `POST /api/v1/orders` → 401 `AUTH_001`
  - **Note**: Left unchecked — Checkout renders an **inline dialog** (not the shared `GuestLoginModal`), but it is **effectively unreachable** because `ProtectedRoute` redirects guests first. No e2e test.

- [ ] **A-04**: Non-buyer roles are blocked from checkout
  - **Precondition**: Authenticated as merchant or admin.
  - **Steps**:
    1. Attempt to navigate to `/buyer/checkout`.
    2. Call `POST /api/v1/orders` with the non-buyer token.
  - **Expected Result**: Route guard blocks the screen (role mismatch → `/unauthorized`); the direct API call returns 403 with the toast "Shopping features are only available to buyers".
  - **Business Rules**: BR-CHECK-003
  - **API**: `GET /api/v1/checkout`, `POST /api/v1/checkout/validate-coupon`, `POST /api/v1/orders`
  - **Note**: Left unchecked — **contract deviates.** Checkout endpoints restrict to `@Roles('buyer')`, so a merchant/admin call returns **403 with the generic message "Insufficient permissions"** mapped to `RES_004` — not `CHECK_004`. `POST /api/v1/orders` allows `merchant`/`admin`/`super_admin` at the class level.

- [ ] **A-05**: Stock conflict at submission rejects the whole order
  - **Precondition**: Buyer A loads `/buyer/checkout` with quantity 4 of a product whose stock is 5 (passes page-load check); stock then drops to 2 because another buyer purchases 3 units.
  - **Steps**:
    1. As buyer A, click `Place Order`.
  - **Expected Result**: The loading overlay hides and a toast shows "Some items are no longer available. Please review your cart." (`CHECK_002`, HTTP 409); the buyer stays on `/buyer/checkout`; **no** `orders` / `order_items` rows are created, stock stays at 2, the coupon `used_count` is unchanged, and the cart is fully preserved.
  - **Business Rules**: BR-CHECK-006, BR-CHECK-011, BR-CHECK-014
  - **API**: `POST /api/v1/orders` → 409 `CHECK_002`
  - **Note**: Left unchecked — **status/code deviate.** `placeOrder` throws `BadRequestException('Product "…" is no longer available in the requested quantity')` → **HTTP 400 `VAL_001`** (not 409 `CHECK_002`). Rollback itself is correct (single transaction). The frontend shows the generic "Failed to place order. Please try again." toast, not the specific message.

- [ ] **A-06**: Invalid or inactive coupon code is rejected
  - **Precondition**: Authenticated buyer on `/buyer/checkout` with a non-empty cart.
  - **Steps**:
    1. Enter a coupon code that does not exist in `promotions`, or one with `is_active = false`.
    2. Click `Apply`.
  - **Expected Result**: Toast/inline error "Invalid coupon code"; no coupon chip; discount stays 0; total unchanged.
  - **Business Rules**: BR-COUPON-001
  - **API**: `POST /api/v1/checkout/validate-coupon` → 400 `CHECK_003`
  - **Note**: Left unchecked — **status/code deviate.** Nonexistent code → `NotFoundException('Coupon not found')` → **HTTP 404 `RES_001`**; inactive → `BadRequestException('Coupon is no longer active')` → **400 `VAL_001`**. The frontend catch shows the generic `buyer.checkout.toasts.invalidCoupon` toast.

- [ ] **A-07**: Expired coupon is rejected
  - **Precondition**: A coupon exists with `expires_at` (or `starts_at` in the future); buyer on `/buyer/checkout`.
  - **Steps**:
    1. Apply the expired coupon code (e.g. `EXPIRED`).
  - **Expected Result**: Toast "Coupon has expired"; no coupon applied; total unchanged.
  - **Business Rules**: BR-COUPON-002
  - **API**: `POST /api/v1/checkout/validate-coupon` → 400
  - **Note**: Left unchecked — no e2e test. Backend throws `BadRequestException('Coupon has expired or is not yet valid')` (400 `VAL_001`), covering both not-yet-valid and expired.

- [ ] **A-08**: Coupon below the minimum order amount is rejected
  - **Precondition**: A coupon with `min_order_amount = 100`; cart subtotal $59.98.
  - **Steps**:
    1. Apply the coupon (e.g. `MINL`).
  - **Expected Result**: Toast "Minimum order amount not met"; no coupon applied; total unchanged.
  - **Business Rules**: BR-COUPON-003
  - **API**: `POST /api/v1/checkout/validate-coupon` → 400
  - **Note**: Left unchecked — no e2e test. Backend message is "Minimum order amount is {amount}" (400 `VAL_001`). Note the check compares against the `subtotal` sent in the request body.

- [ ] **A-09**: Coupon usage limit reached is rejected
  - **Precondition**: A coupon with `used_count >= max_uses`; buyer on `/buyer/checkout`.
  - **Steps**:
    1. Apply the exhausted coupon (e.g. `LIMIT`).
  - **Expected Result**: Toast "Coupon usage limit reached"; no coupon applied; total unchanged.
  - **Business Rules**: BR-COUPON-004
  - **API**: `POST /api/v1/checkout/validate-coupon` → 400
  - **Note**: Left unchecked — no e2e test. Backend message "Coupon has reached maximum usage" (400 `VAL_001`); only checked when `max_uses` is set.

- [ ] **A-10**: Coupon already used by this buyer is rejected
  - **Precondition**: Buyer A has a prior order with `coupon_code = X`; the coupon is otherwise valid.
  - **Steps**:
    1. Apply coupon X again on `/buyer/checkout`.
  - **Expected Result**: Toast "Coupon already used"; no coupon applied; total unchanged.
  - **Business Rules**: BR-COUPON-005
  - **API**: `POST /api/v1/checkout/validate-coupon` → 400
  - **Note**: Left unchecked — **rule unimplemented.** `validateCoupon` does not check prior usage by the buyer; it would succeed.

- [ ] **A-11**: Coupon that would zero the order total is rejected at validation
  - **Precondition**: A percentage coupon with `discount_value = 100` (or a fixed coupon ≥ subtotal); cart subtotal $59.98.
  - **Steps**:
    1. Apply the 100%-off coupon on `/buyer/checkout`.
  - **Expected Result**: `POST /api/v1/checkout/validate-coupon` returns 400; toast "Coupon discount cannot reduce the order total to zero or below."; the total stays $59.98; no coupon chip.
  - **Business Rules**: BR-CHECK-010, BR-COUPON-007
  - **API**: `POST /api/v1/checkout/validate-coupon` → 400 `TOTAL_MUST_BE_POSITIVE`
  - **Note**: Left unchecked — **validation-time rule unimplemented.** `validateCoupon` returns 200 with `newTotal: "0.00"` (`Math.max(subtotal - discountAmount, 0)`); the zero-total guard only exists during `POST /orders` (per merchant group). The code `TOTAL_MUST_BE_POSITIVE` is not defined.

- [ ] **A-12**: Missing required shipping field blocks submission
  - **Precondition**: Authenticated buyer on `/buyer/checkout` with at least one required shipping field left blank.
  - **Steps**:
    1. Leave e.g. `Postal Code` empty (or clear `Recipient Name`).
    2. Click `Place Order` / blur the field.
  - **Expected Result**: Inline i18n validation error for the field (e.g. "Postal code is required"); submission is blocked (`Place Order` is disabled while `!form.formState.isValid`); no API request is issued; other filled fields keep their values.
  - **Business Rules**: BR-CHECK-004
  - **API**: `POST /api/v1/orders` (only reached with a fully valid payload) → 400 on missing sub-field
  - **Note**: Left unchecked — no e2e test exists. Implemented client-side via `shippingSchema` (`mode: 'onChange'`).

- [ ] **A-13**: Invalid payment method is rejected
  - **Precondition**: Authenticated buyer with a valid shipping address.
  - **Steps**:
    1. Attempt to submit with no payment method selected, or call the API directly with an unsupported value (e.g. `crypto`).
  - **Expected Result**: The UI keeps submission blocked with a payment-required error; the direct API call returns 400 "Invalid payment method".
  - **Business Rules**: BR-CHECK-005
  - **API**: `POST /api/v1/orders` → 400
  - **Note**: Left unchecked — no e2e test. The UI always has one of `cod`/`bank_transfer`/`card` selected (default `cod`), so the UI path cannot submit an empty payment method; the DTO `@IsIn([...])` rejects `crypto` with a `ValidationPipe` 400 (generic field message, not "Invalid payment method").

- [ ] **A-14**: Another buyer cannot open someone else's confirmation page
  - **Precondition**: Buyer A has placed an order; buyer B is authenticated.
  - **Steps**:
    1. Log in as buyer B.
    2. Open `/buyer/checkout/confirmation/{buyer A's orderId}`.
  - **Expected Result**: The "Order not found" panel is rendered — HTTP 404, **never** 403, and no hint that another account owns the order; a non-existent UUID renders the identical panel.
  - **Business Rules**: BR-CHECK-013, BR-CHECK-015
  - **API**: Order confirmation lookup → 404 "Order not found" (`CHECK_005`)
  - **Note**: Left unchecked — code deviation; no e2e test. Ownership enforcement lives in the Order Insights `GET /api/v1/orders/:id` endpoint (out of scope), and its exact status/message should be verified there.

- [ ] **A-15**: Order placement rate limit returns 429
  - **Precondition**: Authenticated buyer A.
  - **Steps**:
    1. Issue 6 rapid `POST /api/v1/orders` requests.
    2. Wait for the window to reset, then retry once.
  - **Expected Result**: The 6th request returns 429 Too Many Requests; the request succeeds again after the window resets (5/min per user).
  - **Business Rules**: None (rate limiting — DD_CHECK-03 §4)
  - **API**: `POST /api/v1/orders` → 429
  - **Note**: Left unchecked — **per-endpoint limit not enforced.** Only the global limiter applies (100 req / 15 min per user), mapped to `RATE_001`. 6 requests will not trip it.

- [ ] **A-16**: Checkout load failure shows a generic error without crashing
  - **Precondition**: `GET /api/v1/checkout` fails (server error).
  - **Steps**:
    1. Force the checkout query to fail (mock/intercept 500).
    2. Navigate to `/buyer/checkout`.
  - **Expected Result**: The page renders an "Unable to load checkout" state (`buyer.checkout.errors.*`) without a white-screen crash; no internal details leak.
  - **Business Rules**: None (error handling — DD_CHECK-03 §6)
  - **API**: `GET /api/v1/checkout` → 500 `SYS_001`
  - **Note**: Left unchecked — implemented as an inline error screen (`Checkout.tsx:157-171`); no e2e test.

---

## 3. Boundary Scenarios (B) — Edge Cases & Limits

- [ ] **B-01**: Out-of-stock item at page load flags the row and disables submission
  - **Precondition**: A cart item's quantity exceeds `products.stock_quantity` when `/buyer/checkout` loads.
  - **Steps**:
    1. Open `/buyer/checkout` with the over-stock cart.
    2. Fill in a fully valid shipping address and payment method.
  - **Expected Result**: The affected item row shows stock-warning styling; `Place Order` stays **disabled**; other items render normally.
  - **Business Rules**: BR-CHECK-006
  - **API**: `GET /api/v1/checkout`
  - **Note**: Left unchecked — **UI feature missing.** The API returns `isAvailable: false` per item (`checkout.service.ts:121-122`), but `OrderSummary.tsx` does not consume it and `Place Order` is disabled only by form validity, not stock. The submission-time stock check (A-05) still protects the order.

- [ ] **B-02**: Coupon code at the exact minimum format length is accepted
  - **Precondition**: A valid coupon exists whose code is exactly 8 alphanumeric characters; buyer on `/buyer/checkout`.
  - **Steps**:
    1. Enter the 8-character code.
    2. Click `Apply`.
  - **Expected Result**: A valid coupon applies (N-04).
  - **Business Rules**: BR-COUPON-001, BR-COUPON-007
  - **API**: `POST /api/v1/checkout/validate-coupon`
  - **Note**: Left unchecked — **client-side format rule missing.** There is no 8–12 alphanumeric `couponCodeSchema`; the input only trims for non-emptiness and the code is sent verbatim (no uppercasing).

- [ ] **B-03**: Coupon code outside the 8–12 alphanumeric format is rejected client-side
  - **Precondition**: Buyer on `/buyer/checkout`; coupon input empty (`Apply` disabled while empty).
  - **Steps**:
    1. Enter a 7-character or 13-character code (or one containing symbols).
    2. Click `Apply`.
  - **Expected Result**: Inline "Invalid coupon code format" appears **without** any API request; `Apply` stays disabled while the input is empty.
  - **Business Rules**: None (client-side format validation)
  - **API**: None (no request is issued)
  - **Note**: Left unchecked — **client-side rule missing** (`couponCodeSchema`, DD_CHECK-06 §3.3). As-built, any non-empty string is sent to the server, which returns a server-side error.

- [ ] **B-04**: Shipping fields at exact maximum length are accepted
  - **Precondition**: Buyer on `/buyer/checkout`.
  - **Steps**:
    1. Enter values at exactly the schema maximums: recipient name 200 chars, phone 11 chars (`0` + 10 digits), address line 1 / line 2 255 chars, city / state / country 100 chars, postal code 7 digits.
    2. Submit the form.
  - **Expected Result**: All values are accepted; the form validates and the order request is issued.
  - **Business Rules**: BR-CHECK-004
  - **API**: `POST /api/v1/orders`
  - **Note**: Left unchecked — no test. **Set the maxima from the client schema / `ShippingAddressDto`:** recipientName **200** (code) vs DD_04's 100 — code and DTO agree on 200; phone **20** backend / **11** client; addressLine1 **255**; city/state/country **100**; postalCode backend 20 / client 7.

- [ ] **B-05**: Shipping field one character over the maximum is rejected
  - **Precondition**: Buyer on `/buyer/checkout`.
  - **Steps**:
    1. Enter recipient name with 201 characters (or city with 101, etc.).
    2. Attempt to submit / blur the field.
  - **Expected Result**: Length validation error displayed for the field; the over-length value is not accepted; no order request is issued with the invalid payload.
  - **Business Rules**: BR-CHECK-004
  - **API**: `POST /api/v1/orders` → 400 when called directly with an over-length field (DTO `@MaxLength`)
  - **Note**: Left unchecked — no test. Client zod enforces the maxima above; backend `ShippingAddressDto` re-validates with `@MaxLength`. **Gaps:** client phone has no `.max(20)` rule (only the 9/11-digit refine) and postal code has no `.max(20)` rule (only 4–7 digits), so backend re-validation is the effective cap.

- [ ] **B-06**: Order notes at exactly 500 characters accepted; 501 rejected
  - **Precondition**: Buyer on `/buyer/checkout` with a valid shipping address and payment method.
  - **Steps**:
    1. Enter exactly 500 characters into the Order Notes textarea; place the order.
    2. Repeat with 501 characters.
  - **Expected Result**: 500 characters is accepted and stored in `orders.notes`; 501 characters is rejected.
  - **Business Rules**: None (DTO validation — DD_CHECK-05 §7.3)
  - **API**: `POST /api/v1/orders`
  - **Note**: Left unchecked — **server-side cap missing.** The textarea enforces `maxLength={500}` client-side, but `CreateOrderDto.notes` has **no `@MaxLength`** decorator, so a direct API call with 501 chars is accepted.

- [ ] **B-07**: Coupon discount equal to the subtotal is rejected with full rollback
  - **Precondition**: A fixed coupon whose `discount_value` equals (or exceeds) the cart subtotal passes validation-time checks and is submitted with the order.
  - **Steps**:
    1. Apply the fixed coupon so `subtotal − discount = $0.00`.
    2. Click `Place Order`.
  - **Expected Result**: `POST /api/v1/orders` returns 400 "Coupon discount cannot reduce the order total to zero or below."; the entire transaction rolls back — no `orders` / `order_items` rows, no stock decrement, no coupon increment, cart preserved. A discount leaving exactly $0.01 is accepted.
  - **Business Rules**: BR-CHECK-010, BR-CHECK-014, BR-COUPON-007
  - **API**: `POST /api/v1/orders` → 400 `TOTAL_MUST_BE_POSITIVE`
  - **Note**: Left unchecked — **implemented** (per merchant group: `groupTotalAmount <= 0` → `BadRequestException`), but no automated test exists. `TOTAL_MUST_BE_POSITIVE` is not a defined code; the response carries `VAL_001` + the message.

- [ ] **B-08**: No eligible ads renders no panel at all
  - **Precondition**: All `checkout_page_banner` ads are expired, inactive, unapproved, or none exist.
  - **Steps**:
    1. Navigate to `/buyer/checkout`.
    2. Repeat with the ads endpoint mocked to return 500.
  - **Expected Result**: No ad panel, no blank placeholder margins, no error state; checkout loads and functions identically in both cases.
  - **Business Rules**: BR-AD-009
  - **API**: `GET /api/v1/search/ads?placement=checkout_page_banner` (as-built) → 200 `[]` (or error, degraded gracefully)
  - **Note**: Left unchecked — no e2e test. `AdBannerSlider` hides itself when the filtered list is empty; unit test `AdBannerSlider.test.tsx` › "hide-when-empty".

- [ ] **B-09**: Ad slider never exceeds 5 slides even with more eligible ads
  - **Precondition**: More than 5 eligible `checkout_page_banner` ads exist.
  - **Steps**:
    1. Navigate to `/buyer/checkout`.
    2. Count the rendered slides; force a cache MISS (or wait out any TTL) and reload.
  - **Expected Result**: Exactly the first 5 ads of a ranked list (premium → standard → basic) are rendered with the rotation start advancing on the next MISS.
  - **Business Rules**: BR-AD-005, BR-AD-006, BR-AD-007
  - **API**: `GET /api/v1/search/ads?placement=checkout_page_banner` (as-built)
  - **Note**: Left unchecked — **tier ranking, 5-cap, Redis cache, and round-robin rotation unimplemented.** The as-built ad path (search ads) has no `take` cap or premium ordering.

- [ ] **B-10**: Reduced motion preference disables the ad animation and auto-slide
  - **Precondition**: Browser/emulation sets `prefers-reduced-motion: reduce`.
  - **Steps**:
    1. Emulate reduced motion.
    2. Navigate to `/buyer/checkout`.
    3. Wait 7+ seconds; then restore `no-preference` and reload.
  - **Expected Result**: With reduced motion the ad panel appears instantly and the first ad stays static (no auto-advance); restoring `no-preference` brings back auto-slide.
  - **Business Rules**: BR-AD-010
  - **API**: `GET /api/v1/search/ads?placement=checkout_page_banner` (as-built)
  - **Note**: Left unchecked — no e2e test. `AdBannerSlider` reads `prefers-reduced-motion` and sets `paused`; the orphaned `SponsoredAdSlider.test.tsx` has matchMedia stubs but tests dead code.

- [ ] **B-11**: No horizontal overflow at 320px viewport
  - **Precondition**: Viewport is the minimum supported width.
  - **Steps**:
    1. Set viewport to 320x568.
    2. Visit `/buyer/checkout` and `/buyer/checkout/confirmation/:orderId`.
    3. Check `document.documentElement.scrollWidth <= clientWidth`.
  - **Expected Result**: Zero horizontal overflow on both pages; forms, buttons, and totals remain reachable by vertical scrolling only.
  - **Business Rules**: None (Responsive)
  - **API**: None
  - **Note**: Left unchecked — no test exists.

---

## 4. Interface Scenarios (I) — API Contracts & Payloads

- [ ] **I-01**: `GET /api/v1/checkout` — returns 200 with checkout data
  - **Precondition**: Valid buyer JWT; the buyer's cart has at least one item.
  - **Steps**:
    1. Call `GET /api/v1/checkout` with `Authorization: Bearer <accessToken>`.
  - **Expected Response**: HTTP 200; body `{ data: { items: [ { id, productId, productName, productImage, unitPrice, quantity, lineTotal, stockQuantity, isAvailable, merchantId, merchantName } ], subtotal, discountAmount: "0.00", total, cartId } }`; `subtotal = Σ lineTotal`; `isAvailable = product.isActive && stockQuantity >= quantity`.
  - **Business Rules**: BR-CHECK-002, BR-CHECK-006, BR-CHECK-007, BR-CHECK-008, BR-CHECK-010
  - **API**: `GET /api/v1/checkout`
  - **Note**: No API test — left unchecked until a real test exists; the item shape uses `isAvailable` (not `outOfStock`) and adds `merchantId`/`merchantName` beyond the designed contract.

- [ ] **I-02**: `GET /api/v1/checkout` — returns 400 for an empty cart
  - **Precondition**: Valid buyer JWT; no `carts` row or zero `cart_items` rows.
  - **Steps**:
    1. Call `GET /api/v1/checkout` with an empty-cart buyer token.
  - **Expected Response**: HTTP 400 BAD_REQUEST; error `CHECK_001` "Your cart is empty".
  - **Business Rules**: BR-CHECK-002
  - **API**: `GET /api/v1/checkout`
  - **Note**: No API test — left unchecked; **designed behavior unimplemented** (see A-01): returns 200 with `items: []`.

- [ ] **I-03**: `POST /api/v1/checkout/validate-coupon` — returns 200 with the discount calculation
  - **Precondition**: Valid buyer JWT; an active, valid coupon; payload `{ couponCode, subtotal }`.
  - **Steps**:
    1. Call `POST /api/v1/checkout/validate-coupon` with a valid code and subtotal ≥ 0.01.
  - **Expected Response**: HTTP 200; body `{ data: { discountType, discountValue, discountAmount, newTotal } }`; percentage → `discountAmount = subtotal × (value / 100)`, fixed → `min(discount_value, subtotal)`; `used_count` is **not** incremented by this call.
  - **Business Rules**: BR-COUPON-007, BR-COUPON-008, BR-COUPON-009
  - **API**: `POST /api/v1/checkout/validate-coupon`
  - **Note**: No API test — left unchecked until a real test exists. Payload field is `subtotal` (not `cartSubtotal`) and `subtotal < 0.01` is rejected by the DTO ("Subtotal must be greater than 0").

- [ ] **I-04**: `POST /api/v1/checkout/validate-coupon` — returns an error for each coupon rejection reason
  - **Precondition**: Valid buyer JWT; one coupon seeded per rejection reason.
  - **Steps**:
    1. Call the endpoint once per rejection reason with otherwise-valid payloads.
  - **Expected Response** (as-built): not found → **404 `RES_001`** "Coupon not found"; inactive → **400 `VAL_001`** "Coupon is no longer active"; expired/not-yet-valid → **400 `VAL_001`** "Coupon has expired or is not yet valid"; usage limit reached → **400 `VAL_001`** "Coupon has reached maximum usage"; below minimum → **400 `VAL_001`** "Minimum order amount is {amount}". No discount payload is returned and no state changes.
  - **Business Rules**: BR-COUPON-001, BR-COUPON-002, BR-COUPON-003, BR-COUPON-004, BR-COUPON-005
  - **API**: `POST /api/v1/checkout/validate-coupon`
  - **Note**: No API test — left unchecked; **contract deviates** (codes are generic; "already used by buyer" — BR-COUPON-005 — is not implemented at all).

- [ ] **I-05**: `POST /api/v1/checkout/validate-coupon` — returns 400 when the discount would zero the total
  - **Precondition**: Valid buyer JWT; percentage coupon at 100%, or fixed coupon ≥ subtotal.
  - **Steps**:
    1. Call the endpoint with the zeroing coupon and the current subtotal.
  - **Expected Response**: HTTP 400 BAD_REQUEST; `TOTAL_MUST_BE_POSITIVE` "Coupon discount cannot reduce the order total to zero or below."; no `data` payload.
  - **Business Rules**: BR-CHECK-010, BR-COUPON-007
  - **API**: `POST /api/v1/checkout/validate-coupon`
  - **Note**: No API test — left unchecked; **designed behavior unimplemented** (see A-11): returns 200 with `newTotal: "0.00"`.

- [ ] **I-06**: `POST /api/v1/orders` — returns 201 with the created orders array
  - **Precondition**: Valid buyer JWT; non-empty cart in stock; valid `shippingAddress` + `paymentMethod` payload.
  - **Steps**:
    1. Call `POST /api/v1/orders` with a complete valid payload.
  - **Expected Response**: HTTP 201; body `{ data: { orders: [ { orderId, orderNumber, merchantId, status: "placed", subtotal, discountAmount, total, paymentMethod, shippingAddress, createdAt, estimatedDelivery } ] } }`; `orders` is always an array with one element per merchant group (single-merchant cart → exactly one); `orders[0]` is the primary order used for the confirmation redirect; prices are snapshots from re-fetched DB values.
  - **Business Rules**: BR-CHECK-007, BR-CHECK-008, BR-CHECK-009, BR-CHECK-010, BR-CHECK-013, BR-CHECK-014, BR-CHECK-015
  - **API**: `POST /api/v1/orders`
  - **Note**: No API test — left unchecked until a real test exists. `orderNumber` is `ORD-{first 8 of id}`; `estimatedDelivery` = createdAt + 7 days; `payment_status` is set to `pending`.

- [ ] **I-07**: `POST /api/v1/orders` — rejects insufficient stock at submission
  - **Precondition**: Valid buyer JWT; at least one cart item's quantity exceeds `products.stock_quantity` at submission time.
  - **Steps**:
    1. Call `POST /api/v1/orders` with the stale-stock cart.
  - **Expected Response** (as-built): **HTTP 400 `VAL_001`** "Product \"{name}\" is no longer available in the requested quantity"; transaction fully rolled back — no `orders`, `order_items`, stock decrement, or coupon increment; `cart_items` preserved.
  - **Business Rules**: BR-CHECK-006, BR-CHECK-011, BR-CHECK-014
  - **API**: `POST /api/v1/orders`
  - **Note**: No API test — left unchecked; **status/code deviate** (designed 409 `CHECK_002`).

- [ ] **I-08**: `POST /api/v1/orders` — returns 400 for payload validation failures
  - **Precondition**: Valid buyer JWT.
  - **Steps**:
    1. Call the endpoint once per invalid payload: missing `shippingAddress`, missing required sub-field (e.g. `postalCode`), `paymentMethod: "crypto"`, empty cart.
  - **Expected Response**: Each call returns HTTP 400 BAD_REQUEST via the `ValidationPipe` (field-level `details`) or the domain message ("Cart is empty") mapped to `VAL_001`; no order rows are created.
  - **Business Rules**: BR-CHECK-002, BR-CHECK-004, BR-CHECK-005
  - **API**: `POST /api/v1/orders`
  - **Note**: No API test — left unchecked; `notes` with 501 chars is **accepted** (no `@MaxLength`; see B-06) and invalid coupon format is not caught client-side (see B-03).

- [ ] **I-09**: Protected checkout endpoints return 401 without a valid token
  - **Precondition**: No `Authorization` header, or an invalid/expired token.
  - **Steps**:
    1. Call `GET /api/v1/checkout`, `POST /api/v1/checkout/validate-coupon`, or `POST /api/v1/orders` without a token.
  - **Expected Response**: HTTP 401 UNAUTHORIZED; `AUTH_001`; no data returned or mutated.
  - **Business Rules**: BR-CHECK-001
  - **API**: `GET /api/v1/checkout`, `POST /api/v1/checkout/validate-coupon`, `POST /api/v1/orders`
  - **Note**: No API test — left unchecked until a real test exists.

- [ ] **I-10**: Protected checkout endpoints return 403 for non-buyer roles
  - **Precondition**: Valid JWT with `merchant` or `admin` role.
  - **Steps**:
    1. Call `GET /api/v1/checkout` or `POST /api/v1/checkout/validate-coupon` with a non-buyer token.
  - **Expected Response**: HTTP 403 FORBIDDEN; **`RES_004` "Insufficient permissions"** (from `RolesGuard`).
  - **Business Rules**: BR-CHECK-003
  - **API**: `GET /api/v1/checkout`, `POST /api/v1/checkout/validate-coupon`, `POST /api/v1/orders`
  - **Note**: No API test — left unchecked; **contract deviates** (designed `CHECK_004` "Shopping features are only available to buyers"). Note `POST /api/v1/orders` allows `merchant`/`admin`/`super_admin` at the class level.

- [ ] **I-11**: Ad contract and graceful degradation
  - **Precondition**: Buyer JWT (live page) / eligible ads exist (or none / failing service).
  - **Steps**:
    1. Call the ads endpoint used by the page without additional params.
    2. Call it when the ad query errors or returns nothing.
  - **Expected Response** (as-built): HTTP 200 with the ads list `{ data: [ { id, placement, merchantName, title, announcementMessage, description, imageUrl, sku } ] }` (checkout-scoped shape) — filtered client-side to approved + in-window; empty list → panel hidden; error → gracefully degraded (panel hidden).
  - **Business Rules**: BR-AD-001, BR-AD-002, BR-AD-003, BR-AD-004, BR-AD-009
  - **API**: `GET /api/v1/search/ads?placement=checkout_page_banner` (as-built) / `GET /api/v1/checkout/sponsored-ads` (orphaned)
  - **Note**: No API test — left unchecked; **the designed `GET /api/v1/ads?placement=checkout_top` does not exist.** As-built lacks the 5-cap, tier ranking, Redis cache, and the `400 "Invalid ad placement"` case.

- [ ] **I-12**: Rate limits return 429 per endpoint configuration
  - **Precondition**: Authenticated buyer A (ads by IP for the public endpoint).
  - **Steps**:
    1. Exceed the global limiter on checkout endpoints.
  - **Expected Response**: HTTP 429 TOO_MANY_REQUESTS (`RATE_001`) once the global window (100 req / 15 min) is exceeded; requests succeed again after the window resets.
  - **Business Rules**: None (rate limiting — DD_CHECK-03 §4)
  - **API**: All checkout endpoints
  - **Note**: No API test — left unchecked; **per-endpoint limits (30/10/5/60 per min) are not implemented**; only the global limiter applies.

- [ ] **I-13**: Error responses follow the standard API error envelope
  - **Precondition**: Any error scenario (e.g. invalid coupon, stock conflict).
  - **Steps**:
    1. Trigger an error on any checkout endpoint.
    2. Inspect the response body.
  - **Expected Response**: JSON contains `{ statusCode, error, errorCode, message, timestamp, path, details? }` (global `AllExceptionsFilter`); `message` carries the domain text; coupon/stock messages never leak internal details.
  - **Business Rules**: None (error format)
  - **API**: Any checkout endpoint
  - **Note**: No API test — left unchecked. The envelope includes `errorCode` (not the designed `error` string code) and an optional `details` object for validation errors.

---

## Sign-Off

| Item | Status |
|------|--------|
| Test scenarios defined (N, A, B, I) | ☑️ |
| E2E tests implemented | ☐ |
| PCL auto-update verified | ☐ |
| Next review date | 2026-11-02 |
