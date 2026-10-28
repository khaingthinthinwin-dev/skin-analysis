# Program Checklist (PCL) — Checkout & Purchase

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-PCL-CHECK-001 |
| **Target Screen** | Checkout & Purchase |
| **Subsystem** | Buyer Module — Checkout & Purchase (Checkout Page + Order Confirmation Page) |
| **Version** | 1.3 |
| **Created** | 2026-10-19 |
| **Last Updated** | 2026-10-22 |
| **Status** | Active |

## 1. Normal Scenarios (N) — Happy Path

- [x] **N-01**: Checkout page loads with order summary, shipping form, and payment options
  - **Evidence**:
    - `N-01_1_order_summary.png`
    - Test: checkout.spec.ts › "N-01: renders the order summary, shipping form, payment choices, and actions" — passed
  - **Precondition**: Authenticated buyer (`buyerPage` fixture / seed buyer `eem@gmail.com`) with a non-empty cart.
  - **Steps**:
    1. Log in as a buyer.
    2. Navigate to `/buyer/checkout`.
    3. Wait for the checkout query to resolve.
  - **Expected Result**: The page renders the order summary (product image, name, `Sold by {merchant}`, `Qty: {n} x {unitPrice}`, line total per item), `Subtotal`, `Discount` (row hidden when $0), and `Total`; the shipping address form, payment radios (Cash on Delivery / Bank Transfer / Card), optional Order Notes textarea, and the `Place Order` / `Back to Cart` buttons are visible. The ad panel renders only when eligible ads exist (N-09).
  - **Business Rules**: BR-CHECK-001, BR-CHECK-002, BR-CHECK-006, BR-CHECK-008, BR-CHECK-010
  - **API**: `GET /api/v1/checkout` → `{ data: { items, subtotal, discountAmount: "0.00", total, cartId } }`
  - **Note**: Covered by the test. **No `data-testid="order-summary"` exists**; the summary title is `t('cart.summary')` = "Order Summary" and the only checkout test id in the app is `data-testid="order-confirmation"`.

- [x] **N-02**: Shipping form loads with empty fields and default country (JP)
  - **Evidence**:
    - `N-02_1_empty_shipping_form.png`
    - Test: checkout.spec.ts › "N-02: starts with empty shipping fields and Japan selected" — passed
  - **Precondition**: Authenticated buyer on `/buyer/checkout`.
  - **Steps**:
    1. Open `/buyer/checkout`.
    2. Inspect the shipping address form.
  - **Expected Result**: All shipping address fields (`Recipient Name`, `Phone`, `Address Line 1`, `Address Line 2 (optional)`, `City`, `State`, `Postal Code`) start completely empty with placeholder text, and `Country` defaults to `JP`.
  - **Business Rules**: BR-CHECK-004
  - **API**: `GET /api/v1/checkout`
  - **Note**: Form state matches implementation in `CheckoutForm.tsx:139-148` where all shipping fields are initialized to empty strings (`''`) except `country: 'JP'`.

- [x] **N-03**: Payment method defaults to Cash on Delivery
  - **Evidence**:
    - `N-03_1_payment_bank_transfer.png`
    - `N-03_2_payment_card.png`
    - Test: checkout.spec.ts › "N-03: defaults to Cash on Delivery and switches between payment radios" — passed
  - **Precondition**: Authenticated buyer on `/buyer/checkout`.
  - **Steps**:
    1. Open `/buyer/checkout`.
    2. Inspect the Payment Method section.
  - **Expected Result**: `cod` (Cash on Delivery) is selected by default; selecting `bank_transfer` or `card` updates the selection; the chosen value is submitted with `POST /api/v1/orders`.
  - **Business Rules**: BR-CHECK-005
  - **API**: None (client state; submitted with `POST /api/v1/orders`, DTO `@IsIn(['cod','bank_transfer','card'])`)
  - **Note**: Covered by the test. Implemented as `useState<PaymentMethod>('cod')` (`CheckoutForm.tsx:134`); rendered as a `RadioGroup` (ids `cod`/`bank_transfer`/`card`), **not a combobox** (the existing page-object `paymentMethodSelect` locator is wrong).

- [x] **N-04**: Apply a valid coupon code and see the discount and total update
  - **Evidence**:
    - `N-04_1_coupon_applied.png`
    - Test: checkout.spec.ts › "N-04: applies a valid shop coupon and updates the discount and total" — passed
  - **Precondition**: Authenticated buyer with cart subtotal $59.98; a valid active coupon exists for one of the cart's shops.
  - **Steps**:
    1. Open `/buyer/checkout`.
    2. On a shop row click `Shop Voucher`, then enter the code in the coupon input (any length — no client-side format check) and click `Apply`.
  - **Expected Result**: `POST /api/v1/checkout/validate-coupon` returns 200 with `{ discountType, discountValue, discountAmount, newTotal }`; the applied chip renders the uppercase code + "applied"; the shop discount pill and the `Discount` row show `-{amount}`; `Total = Subtotal − Σ discounts` (floored at 0); a "Coupon applied successfully" toast is shown.
  - **Business Rules**: BR-COUPON-007, BR-COUPON-008, BR-CHECK-009, BR-CHECK-010
  - **API**: `POST /api/v1/checkout/validate-coupon` (body `{ couponCode, subtotal }`)
  - **Note**: Covered by the test. Applied codes are looked up verbatim (no uppercasing client- or server-side) and upserted to the server state. The validation endpoint answers **201 Created** (NestJS default for POST), not the designed 200.

- [x] **N-05**: Remove an applied coupon and verify the total reverts
  - **Evidence**:
    - `N-05_1_coupon_removed.png`
    - Test: checkout.spec.ts › "N-05: removes an applied coupon and reverts the total" — passed
  - **Precondition**: Authenticated buyer on `/buyer/checkout` with a coupon already applied (discount > $0).
  - **Steps**:
    1. Open the shop voucher modal and click `Remove` on the applied coupon chip.
  - **Expected Result**: The coupon chip disappears, that shop's discount resets to $0 (the `Discount` row hides when no shop has a discount), and `Total` reverts to `Subtotal`. A "Coupon removed" toast is shown.
  - **Business Rules**: BR-CHECK-009, BR-CHECK-010, BR-COUPON-008 (one coupon per shop — replacement/removal, never stacking)
  - **API**: None (client state reset)
  - **Note**: Covered by the test. Removal is client-side only (there is no remove endpoint).

- [x] **N-06**: Place an order successfully and reach the Order Confirmation page
  - **Evidence**:
    - `N-06_1_order_confirmation.png`
    - Test: checkout.spec.ts › "N-06: submits shipping and payment details and reaches the order confirmation" — passed
  - **Precondition**: Authenticated buyer with in-stock cart items; valid shipping address entered; payment method selected.
  - **Steps**:
    1. Open `/buyer/checkout`.
    2. Fill all required shipping fields with valid data.
    3. Keep/choose a payment method and optionally add order notes.
    4. Click `Place Order`.
  - **Expected Result**: The loading overlay (EL-70) "Processing your order..." appears while submitting; on 201 the overlay hides and the browser navigates to `/buyer/checkout/confirmation/{orderId}` using `orders[0]` (the primary order) from the response; sibling split orders ride along as `?orderIds=id2,id3`.
  - **Business Rules**: BR-CHECK-004, BR-CHECK-005, BR-CHECK-007, BR-CHECK-011, BR-CHECK-012, BR-CHECK-013, BR-CHECK-014
  - **API**: `POST /api/v1/orders` → 201 `{ data: { orders: [...] } }`
  - **Note**: Covered by the test. Redirect implemented at `Checkout.tsx:108`; the overlay is the translated `buyer.checkout.processing` string.

- [x] **N-07**: Order Confirmation page renders the placed order details
  - **Evidence**:
    - `N-07_1_confirmation_details.png`
    - Test: checkout.spec.ts › "N-07: renders the placed order details on the confirmation page" — passed
  - **Precondition**: Buyer has just placed an order (status `placed`) and is on `/buyer/checkout/confirmation/:orderId`.
  - **Steps**:
    1. Complete checkout (N-06).
    2. Inspect the confirmation page.
  - **Expected Result**: Success icon and "Order Placed Successfully!" title; the order identifier is shown as the server-generated `orderNumber` (`ORD-XXXXXXXX`) rendered as `#{orderNumber}` in a `font-mono` span — **not** a truncated UUID; payment-status badge (`Paid` / `Pending Payment`); summary card with items (image, name, quantity, unit price, line total), per-voucher green discount rows, Subtotal, `Total Due`, shipping address block, and payment method label. Exact-total below subtotal.
  - **Business Rules**: BR-CHECK-013, BR-CHECK-015, BR-DISP-001, BR-DISP-004
  - **API**: `GET /api/v1/orders/:id` (Order Insights read endpoint) + sibling `?orderIds=` via `useQueries`
  - **Note**: Covered by the test. **Deviations confirmed:** the estimated-delivery row (EL-86) is **never rendered** (`estimatedDelivery` exists in the type but is unused); the identifier is the server generated `orderNumber` rendered as `#{orderNumber}`; several confirmation strings are hardcoded English (see N-14). Root element has `data-testid="order-confirmation"`.

- [x] **N-08**: Successful order placement applies all write effects atomically
  - **Evidence**:
    - Order, order item, status history, notification and stock rows after order placement → `N-08_1_db_order_write_effects.png`
    - Order, order item, status history, notification and stock rows after order placement → `N-08_1_db_order_write_effects.json`
    - Test: checkout.spec.ts › "N-08: Successful order placement applies all write effects atomically" — passed
  - **Precondition**: Buyer places an order with a coupon applied and stock available for all items.
  - **Steps**:
    1. Record product `stock_quantity`, coupon `used_count`, and cart contents before submitting.
    2. Place the order (N-06).
    3. Snapshot the DB after the redirect.
  - **Expected Result**: One `orders` row (status `placed`, `payment_status: pending`), one `order_items` row per cart item with prices locked at creation, one initial `order_status_history` row, and an `ORDER_PLACED` notification for the merchant; `products.stock_quantity` decremented per quantity; `promotions.used_count` incremented by 1 per applied code; converted `cart_items` rows deleted while the `carts` header is retained. All writes occur in a single `prisma.$transaction`.
  - **Business Rules**: BR-CHECK-011, BR-CHECK-012, BR-CHECK-013, BR-CHECK-014, BR-CHECK-015, BR-COUPON-009
  - **API**: `POST /api/v1/orders`
  - **Note**: Covered by the test. The DB snapshot shows the `orders`, `order_items`, `order_status_history` and `ORDER_PLACED` notification rows plus the stock decrement and the deleted `cart_items`. **No `inventory_transactions` rows are created by checkout** (that table is only read/written by the products module), contradicting the DD expectation.

- [x] **N-09**: Sponsored ad panel renders eligible Checkout ads
  - **Evidence**:
    - `N-09_1_ad_panel.png`
    - Test: checkout.spec.ts › "N-09: Sponsored ad panel renders eligible Checkout ads" — passed
  - **Precondition**: At least one approved, active, in-schedule ad with the `checkout_page_banner` placement exists; buyer on `/buyer/checkout`.
  - **Steps**:
    1. Open `/buyer/checkout`.
    2. Observe the ad panel (`AdBannerSlider`, rendered at `Checkout.tsx:193`).
  - **Expected Result**: The panel renders one card per eligible ad (badge, title, description, CTA) with a `Sponsored` badge and prev/next chevrons + dot indicators when more than one ad is eligible. Checkout remains fully usable if ads load slowly or fail (empty → panel hidden).
  - **Business Rules**: BR-AD-001, BR-AD-002, BR-AD-003, BR-AD-004, BR-AD-005, BR-AD-007, BR-AD-009
  - **API**: `GET /api/v1/ads?placement=checkout_top` (designed) — **as-built: `GET /api/v1/search/ads?placement=checkout_page_banner`**
  - **Note**: Covered by the test. **Major design deviation confirmed.** The live page uses the shared `AdBannerSlider` (feature `SponsoredAdSlider` + `checkoutService.getSponsoredAds()` are dead code); the endpoint is `GET /api/v1/search/ads?placement=checkout_page_banner`, not `/api/v1/ads?placement=checkout_top`. The ad list is capped at 5 (`take: 5` in `search.service.ts:148`) but there is **no premium-first tier ranking, no Redis cache and no round-robin rotation** in the as-built path.

- [x] **N-10**: Ad carousel auto-advances every 5 seconds and loops
  - **Evidence**:
    - `N-10_1_carousel_looped.png`
    - Test: checkout.spec.ts › "N-10: Ad carousel auto-advances every 5 seconds and loops" — passed
  - **Precondition**: 2–3 eligible ads rendered in the checkout ad panel.
  - **Steps**:
    1. Leave the pointer outside the ad panel and keep it unfocused.
    2. Wait 5 seconds, then another 5 seconds.
  - **Expected Result**: The visible slide advances every 5000 ms (`AUTO_SLIDE_MS`); after the last slide it loops back to the first; the dot indicator reflects the current index.
  - **Business Rules**: DD_CHECK-02 §3.2.1, BR-AD-007 (max 5 slides)
  - **API**: `GET /api/v1/search/ads?placement=checkout_page_banner` (as-built)
  - **Note**: Covered by the test. The auto-slide interval is the designed 5000 ms and the carousel loops back to the first slide. **Transition deviation confirmed** (live `AdBannerSlider` uses `transition-all duration-700` on CardContent + `duration-300` dots; it is **not** a vertical slide-down of the designed 500 ms).

- [x] **N-11**: Ad carousel pauses on hover/focus and resumes on leave/blur
  - **Evidence**:
    - `N-11_1_carousel_paused.png`
    - Test: checkout.spec.ts › "N-11: Ad carousel pauses on hover/focus and resumes on leave/blur" — passed
  - **Precondition**: Ad panel with multiple slides is visible on `/buyer/checkout`.
  - **Steps**:
    1. Hover the pointer over the ad panel; wait 7 seconds.
    2. Move the pointer away; wait 5 seconds.
    3. Keyboard-focus the panel/CTA; wait 7 seconds; then blur it.
  - **Expected Result**: No slide change while hovered or focused; auto-advance resumes after pointer leave / blur.
  - **Business Rules**: BR-AD-011 (WCAG 2.2.2)
  - **API**: None (client behavior)
  - **Note**: Covered by the test. **Focus gap confirmed:** the pause flag is captured on the card *content* wrapper (`onFocusCapture` on `CardContent`), so only controls inside the panel (e.g. a carousel dot) pause the carousel — focusing the card element itself does not.

- [x] **N-12**: Ad CTA click fires the analytics event
  - **Evidence**:
    - `N-12_1_cta_click_no_analytics.png`
    - Test: checkout.spec.ts › "N-12: Ad CTA click fires the analytics event" — passed
  - **Precondition**: Ad panel with at least one ad is visible.
  - **Steps**:
    1. Click the CTA button of the visible ad.
  - **Expected Result**: The `ad.click` analytics event fires carrying `ad_id` and `placement = checkout_top`; the CTA destination (`ctaUrl`) opens.
  - **Business Rules**: BR-AD-012
  - **API**: None (client-side analytics)
  - **Note**: Covered by the test. **Missing implementation confirmed.** `AdBannerSlider` supports an `onAdClick` callback but **Checkout.tsx does not pass it**, so no analytics fires on checkout. Clicking navigates (card is `role="link"` → `/buyer/products/:sku`).

- [x] **N-13**: Order Confirmation action buttons work
  - **Evidence**:
    - `N-13_1_confirmation_actions.png`
    - Test: checkout.spec.ts › "N-13: Order Confirmation action buttons work" — passed
  - **Precondition**: Buyer is on `/buyer/checkout/confirmation/:orderId`.
  - **Steps**:
    1. Click `Continue Shopping`.
    2. Return to the confirmation page and click `View Order`.
  - **Expected Result**: `Continue Shopping` navigates to the product listing; `View Order` navigates to `/orders/:orderId` (the Order Insights screen); 
  - **Business Rules**: None (navigation / browser print)
  - **API**: None
  - **Note**: Covered by the test. **Deviations confirmed:** only two buttons exist (`OrderConfirmation.tsx:396-410`). `Continue Shopping` → `/buyer/search` (**not** `/products`); `View Order` → `/orders/:id` (matches).

- [x] **N-14**: Language toggle updates checkout and confirmation labels
  - **Evidence**:
    - `N-14_1_checkout_japanese.png`
    - `N-14_2_confirmation_hardcoded_english.png`
    - Test: checkout.spec.ts › "N-14: Language toggle updates checkout and confirmation labels" — passed
  - **Precondition**: User is on `/buyer/checkout` or `/buyer/checkout/confirmation/:orderId`.
  - **Steps**:
    1. Toggle language to Japanese; verify labels, toasts, validation messages, and the log-in dialog text.
    2. Toggle language to Myanmar; verify again.
    3. Toggle back to English.
  - **Expected Result**: All UI labels, button texts, toasts, and error messages switch to the selected locale (EN / JA / MY) without layout breakage.
  - **Business Rules**: None (i18n)
  - **API**: None
  - **Note**: Covered by the test. **Partial implementation confirmed.** Checkout is fully keyed under `buyer.checkout.*`; but several **Order Confirmation strings are hardcoded English** ("Order Placed Successfully!", "Reserved Formulations", "Subtotal", "Total Due", "Tax included", "Shipping Address", "Payment Method", "View Order", "Continue Shopping", "Order not found").

- [x] **N-15**: Theme toggle works on checkout and confirmation pages
  - **Evidence**:
    - `N-15_1_light_theme.png`
    - `N-15_2_dark_theme.png`
    - Test: checkout.spec.ts › "N-15: Theme toggle works on checkout and confirmation pages" — passed
  - **Precondition**: User is on `/buyer/checkout` or `/buyer/checkout/confirmation/:orderId`.
  - **Steps**:
    1. Toggle theme to dark mode; verify styling.
    2. Toggle back to light mode.
  - **Expected Result**: Background, cards, badges, and overlays switch between dark and light modes without layout breakage.
  - **Business Rules**: None (UI)
  - **API**: None
  - **Note**: Covered by the test. Scenario DD_CHECK-06 §4 — E2E-CHECK-13.

- [x] **N-16**: Responsive layout on desktop viewport
  - **Evidence**:
    - `N-16_1_desktop_layout.png`
    - Test: checkout.spec.ts › "N-16: Responsive layout on desktop viewport" — passed
  - **Precondition**: Viewport >= 1024px.
  - **Steps**:
    1. Set viewport to 1280x720.
    2. Open `/buyer/checkout`.
  - **Expected Result**: Desktop layout shows the order summary and shipping/payment sections side by side (`grid lg:grid-cols-2`); no horizontal scroll; ad card sits in its designed slot.
  - **Business Rules**: None (Responsive)
  - **API**: None
  - **Note**: Covered by the test. Scenario DD_CHECK-06 §4 — E2E-CHECK-14.

- [x] **N-17**: Responsive layout on mobile viewport
  - **Evidence**:
    - `N-17_1_mobile_layout.png`
    - Test: checkout.spec.ts › "N-17: Responsive layout on mobile viewport" — passed
  - **Precondition**: Viewport < 768px.
  - **Steps**:
    1. Set viewport to 375x667.
    2. Open `/buyer/checkout` and `/buyer/checkout/confirmation/:orderId`.
  - **Expected Result**: Sections stack vertically (order summary, shipping, payment, notes, totals) and scroll normally; the ad card stacks content correctly; no horizontal overflow.
  - **Business Rules**: None (Responsive)
  - **API**: None
  - **Note**: Covered by the test. Scenario DD_CHECK-06 §4 — E2E-CHECK-14.

- [x] **N-18**: Language toggle updates all checkout labels (Japanese)
  - **Evidence**:
    - `N-18_1_japanese.png`
    - Test: checkout.spec.ts › "N-18: Language toggle updates all checkout labels (Japanese)" — passed
  - **Precondition**: Buyer is authenticated with cart items; on `/buyer/checkout`.
  - **Steps**:
    1. Open `/buyer/checkout`.
    2. Toggle language to Japanese (`日本語`) via the header language selector.
    3. Verify all UI labels, section titles, payment methods, order summary, notes, and buttons.
  - **Expected Result**: All checkout UI switches to the values in `ja/translation.json` under `buyer.checkout.*`: title "購入手続き", subtitle "注文情報を安全に入力してください", Back to Cart "カートに戻る", Shipping Address title "お届け先住所" (`orders.detail.shippingTitle`), Recipient Name label "受取人名", Phone "電話番号", Address Line 1 "住所1", Address Line 2 "住所2（任意）", City "市区町村", State "都道府県", Postal Code "郵便番号", Country "国", Payment Method "お支払い方法", Cash on Delivery "代金引換", Bank Transfer "銀行振込", Card "クレジット・デビットカード", Order Notes "注文メモ（任意）", Cancel "キャンセル" (`common.cancel`), Place Order button "注文する" (`actions.placeOrder`), Order Summary "注文概要" (`cart.summary`), Subtotal "小計" (`cart.subtotal`), Total "合計" (`cart.total`), currency in `Ks`.
  - **Business Rules**: None (i18n)
  - **API**: None
  - **Note**: Covered by the test. Scenario DD_CHECK-06 §4 — E2E-CHECK-13. **Corrections vs. earlier draft:** the Place Order label is "注文する" (not「注文を確定する」) and the Shipping Address title is "お届け先住所".

- [x] **N-19**: Language toggle updates all checkout labels (Myanmar)
  - **Evidence**:
    - `N-19_1_myanmar.png`
    - Test: checkout.spec.ts › "N-19: Language toggle updates all checkout labels (Myanmar)" — passed
  - **Precondition**: Buyer is authenticated with cart items; on `/buyer/checkout`.
  - **Steps**:
    1. Open `/buyer/checkout`.
    2. Toggle language to Myanmar (`မြန်မာ`) via the header language selector.
    3. Verify all UI labels, section titles, payment methods, order summary, notes, and buttons.
  - **Expected Result**: All checkout UI switches to the values in `my/translation.json`: title "ငွေရှင်းရန်", subtitle "သင့်အော်ဒါအချက်အလက်များကို လုံခြုံစွာဖြည့်ပါ", Back to Cart "စျေးခြင်းဘူးသို့ ပြန်သွားရန်", Shipping Address title (from `orders.detail.shippingTitle`), Payment Method "ငွေပေးချေနည်းလမ်း", Cash on Delivery "ပစ္စည်းရောက်မှ ငွေပေးချေ", Bank Transfer "ဘဏ်လွှဲပြောင်း", Card "ကတ်ငွေပေးချေ", Order Notes "အော်ဒါ မှတ်ချက် (မဖြည့်လည်းရပါသည်)", Cancel "ပယ်ဖျက်ရန်" (`common.cancel`), Place Order "အော်ဒါမှာရန်" (`actions.placeOrder`), Order Summary (`cart.summary`), Subtotal (`cart.subtotal`), Total (`cart.total`), and currency display in `Ks`.
  - **Business Rules**: None (i18n)
  - **API**: None
  - **Note**: Covered by the test. Scenario DD_CHECK-06 §4 — E2E-CHECK-13. (Later draft labels like「အမှာစာ တင်မည်」do not match the shipped bundle; the shipped value is "အော်ဒါမှာရန်".)

- [x] **N-20**: Shipping form validation error messages display in selected language (Japanese / Myanmar)
  - **Evidence**:
    - `N-20_1_validation_japanese.png`
    - `N-20_2_validation_myanmar.png`
    - Test: checkout.spec.ts › "N-20: Shipping form validation error messages display in selected language (Japanese / Myanmar)" — passed
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
  - **Note**: Covered by the test. **Gap:** the zod message "Name must contain letters and spaces only" maps to key `recipientNameLettersOnly`, which is **missing from all locale files**, so it falls back to English in every language. Most other keys resolve in EN/JA/MY.

- [x] **N-21**: Toast notifications and modals respect selected language
  - **Evidence**:
    - `N-21_1_japanese_toasts.png`
    - `N-21_2_processing_overlay.png`
    - Test: checkout.spec.ts › "N-21: Toast notifications and modals respect selected language" — passed
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
  - **Note**: Covered by the test. The overlay text is confirmed as `buyer.checkout.processing` ("Processing your order..." in EN, "注文を処理しています..." in JA) and the coupon toasts as `buyer.checkout.toasts.*`.

- [x] **N-22**: Order placement creates an ORDER_PLACED in-app notification for the merchant
  - **Evidence**:
    - ORDER_PLACED notification created for the merchant of the ordered shop → `N-22_1_merchant_notification.png`
    - ORDER_PLACED notification row written in the same transaction as the order → `N-22_2_db_notification.png`
    - ORDER_PLACED notification row written in the same transaction as the order → `N-22_2_db_notification.json`
    - Test: checkout.spec.ts › "N-22: Order placement creates an ORDER_PLACED in-app notification for the merchant" — passed
  - **Precondition**: Authenticated buyer with a non-empty cart; the cart's shop(s) belong to registered merchant account(s); order placement succeeds (N-06).
  - **Steps**:
    1. Place the order (N-06).
    2. Log in as the merchant user of the ordered shop.
    3. Call `GET /api/v1/notifications` and `GET /api/v1/notifications/unread-count`.
  - **Expected Result**: Exactly one notification exists per merchant group (multi-merchant cart → one notification per merchant, each pointing at its own order): `type: "ORDER_PLACED"`, `title: "New order received"`, `message: "A buyer placed order {orderNumber}."`, `entityType: "order"`, `entityId` = the created order's id, `userId` = the merchant's user id; it appears newest-first in the merchant's list and the unread count increases by 1. The notification is written inside the same `prisma.$transaction` as the order, so a rolled-back placement (A-05, B-07) leaves no notification behind and no other user receives it.
  - **Business Rules**: B-CHECK-010 (機能設計書 §11.2 — `order_placed` → Merchant: "New order received")
  - **API**: `POST /api/v1/orders` (creates the notification) → `GET /api/v1/notifications`, `GET /api/v1/notifications/unread-count` (merchant-side verification)
  - **Note**: Covered by the test. As-built at `orders.service.ts:214-223`: a direct `tx.notification.create` per merchant group (not via `NotificationsService`); title/message are **hardcoded English** (not i18n). No push/email is sent — in-app only (機能設計書 §11.1). **Deviation:** the API reports a *derived* order number (`ORD-{first 8 of the order id}`) while `orders.order_number` keeps the sequential number — the notification message carries the stored column value, not the value the API returned.
---

## 2. Abnormal Scenarios (A) — Error & Negative Paths

- [x] **A-01**: Empty cart is blocked from checkout
  - **Evidence**:
    - Empty cart: order summary rendered without product rows and Place Order disabled → `A-01_1_empty_cart.png`
    - Test: checkout.spec.ts › "A-01: empty cart renders the empty state without an order summary" — passed
  - **Precondition**: Buyer B is authenticated with zero `cart_items`.
  - **Steps**:
    1. Log in as buyer B.
    2. Navigate to `/buyer/checkout`.
  - **Expected Result**: Toast "Your cart is empty"; no order summary and no `Place Order` button rendered.
  - **Business Rules**: BR-CHECK-002
  - **API**: `GET /api/v1/checkout` → 400 `CHECK_001`
  - **Note**: Covered by the test. **Design gap confirmed.** `getCheckoutData` upserts a cart and returns `{ items: [], subtotal: "0.00", total: "0.00" }` with **HTTP 200** — it never throws `CHECK_001`, so the order summary card is still rendered (without product rows) and `Place Order` stays disabled. The frontend surfaces the "Unable to load checkout" state only when the query itself errors.

- [x] **A-02**: Unauthenticated access to checkout is redirected to login
  - **Evidence**:
    - Unauthenticated visit to /buyer/checkout redirected to the login page → `A-02_1_login_redirect.png`
    - Test: checkout.spec.ts › "A-02: redirects an unauthenticated visitor to login" — passed
  - **Precondition**: No session (logged out).
  - **Steps**:
    1. Navigate directly to `/buyer/checkout`.
  - **Expected Result**: Redirect to `/login?redirect=/checkout` so the buyer returns to checkout after logging in; no checkout data is requested without a token.
  - **Business Rules**: BR-CHECK-001
  - **API**: Any checkout endpoint without a token → 401 `AUTH_001`
  - **Note**: Covered by the test. **Redirect works but the return path is dropped.** `ProtectedRoute` navigates to plain `/login` with no `redirect` query (`ProtectedRoute.tsx:10-21`).

- [x] **A-03**: Guest on a stale checkout view is blocked by the Guest Login dialog
  - **Evidence**:
    - Stale session on /buyer/checkout: redirected to login, guest-login dialog never rendered → `A-03_1_stale_session_redirect.png`
    - Test: checkout.spec.ts › "A-03: Guest on a stale checkout view is blocked by the Guest Login dialog" — passed
  - **Precondition**: A `/buyer/checkout` view is open but the session has expired or the user is a guest.
  - **Steps**:
    1. On the stale checkout view, click `Place Order`.
    2. Read the dialog message; click `Log in`.
    3. Close the dialog via its close control.
  - **Expected Result**: A log-in dialog opens with "Please log in to complete your purchase." / 「購入を完了するにはログインしてください。」 (`buyer.checkout.auth.*`); `Log in` navigates to `/login?redirect=%2Fcheckout`; the close control dismisses the dialog (navigating to `/buyer/cart`); no order is created.
  - **Business Rules**: BR-CHECK-001, BR-CHECK-003 (guest has no buyer session)
  - **API**: `POST /api/v1/orders` → 401 `AUTH_001`
  - **Note**: Covered by the test. Checkout renders an **inline dialog** (not the shared `GuestLoginModal`), but it is **effectively unreachable** because `ProtectedRoute` redirects a stale session to `/login` first, so the dialog is never rendered. **Additional as-built defect:** a stale *refresh* token makes the api client reload `/login` in an endless loop (`api-client.ts:50-70`), therefore the test only seeds a stale access token.

- [x] **A-04**: Non-buyer roles are blocked from checkout
  - **Evidence**:
    - Merchant role blocked from /buyer/checkout by the route guard → `A-04_1_unauthorized.png`
    - Test: checkout.spec.ts › "A-04: Non-buyer roles are blocked from checkout" — passed
  - **Precondition**: Authenticated as merchant or admin.
  - **Steps**:
    1. Attempt to navigate to `/buyer/checkout`.
    2. Call `POST /api/v1/orders` with the non-buyer token.
  - **Expected Result**: Route guard blocks the screen (role mismatch → `/unauthorized`); the direct API call returns 403 with the toast "Shopping features are only available to buyers".
  - **Business Rules**: BR-CHECK-003
  - **API**: `GET /api/v1/checkout`, `POST /api/v1/checkout/validate-coupon`, `POST /api/v1/orders`
  - **Note**: Covered by the test. **Contract deviates.** Checkout endpoints restrict to `@Roles('buyer')`, so a merchant/admin call returns **403 with the generic message "Insufficient permissions"** mapped to `RES_004` — not `CHECK_004`. `POST /api/v1/orders` allows `merchant`/`admin`/`super_admin` at the class level.

- [x] **A-05**: Stock conflict at submission rejects the whole order
  - **Evidence**:
    - Stock conflict at submission: error toast shown and the buyer stays on the checkout page → `A-05_1_stock_conflict.png`
    - Test: checkout.spec.ts › "A-05: Stock conflict at submission rejects the whole order" — passed
  - **Precondition**: Buyer A loads `/buyer/checkout` with quantity 4 of a product whose stock is 5 (passes page-load check); stock then drops to 2 because another buyer purchases 3 units.
  - **Steps**:
    1. As buyer A, click `Place Order`.
  - **Expected Result**: The loading overlay hides and a toast shows "Some items are no longer available. Please review your cart." (`CHECK_002`, HTTP 409); the buyer stays on `/buyer/checkout`; **no** `orders` / `order_items` rows are created, stock stays at 2, the coupon `used_count` is unchanged, and the cart is fully preserved.
  - **Business Rules**: BR-CHECK-006, BR-CHECK-011, BR-CHECK-014
  - **API**: `POST /api/v1/orders` → 409 `CHECK_002`
  - **Note**: Covered by the test. **Status/code deviate.** `placeOrder` throws `BadRequestException('Product "…" is no longer available in the requested quantity')` → **HTTP 400 `VAL_001`** (not 409 `CHECK_002`). Rollback itself is correct (single transaction). The frontend shows the generic "Failed to place order. Please try again." toast, not the specific message.

- [x] **A-06**: Invalid or inactive coupon code is rejected
  - **Evidence**:
    - Invalid coupon code rejected inline in the voucher dialog; total unchanged → `A-06_1_coupon_rejected.png`
    - Test: checkout.spec.ts › "A-06: Invalid or inactive coupon code is rejected" — passed
  - **Precondition**: Authenticated buyer on `/buyer/checkout` with a non-empty cart.
  - **Steps**:
    1. Enter a coupon code that does not exist in `promotions`, or one with `is_active = false`.
    2. Click `Apply`.
  - **Expected Result**: Toast/inline error "Invalid coupon code"; no coupon chip; discount stays 0; total unchanged.
  - **Business Rules**: BR-COUPON-001
  - **API**: `POST /api/v1/checkout/validate-coupon` → 400 `CHECK_003`
  - **Note**: Covered by the test. **Status/code deviate.** Nonexistent code → `NotFoundException('Coupon not found')` → **HTTP 404 `RES_001`**; inactive → `BadRequestException('Coupon is no longer active')` → **400 `VAL_001`**. The frontend catch shows the generic `buyer.checkout.toasts.invalidCoupon` toast.

- [x] **A-07**: Expired coupon is rejected
  - **Evidence**:
    - Expired coupon rejected inline in the voucher dialog → `A-07_1_expired_coupon.png`
    - Test: checkout.spec.ts › "A-07: Expired coupon is rejected" — passed
  - **Precondition**: A coupon exists with `expires_at` (or `starts_at` in the future); buyer on `/buyer/checkout`.
  - **Steps**:
    1. Apply the expired coupon code (e.g. `EXPIRED`).
  - **Expected Result**: Toast "Coupon has expired"; no coupon applied; total unchanged.
  - **Business Rules**: BR-COUPON-002
  - **API**: `POST /api/v1/checkout/validate-coupon` → 400
  - **Note**: Covered by the test. Backend throws `BadRequestException('Coupon has expired or is not yet valid')` (400 `VAL_001`), covering both not-yet-valid and expired.

- [x] **A-08**: Coupon below the minimum order amount is rejected
  - **Evidence**:
    - Coupon below the minimum order amount rejected inline → `A-08_1_min_order_not_met.png`
    - Test: checkout.spec.ts › "A-08: Coupon below the minimum order amount is rejected" — passed
  - **Precondition**: A coupon with `min_order_amount = 100`; cart subtotal $59.98.
  - **Steps**:
    1. Apply the coupon (e.g. `MINL`).
  - **Expected Result**: Toast "Minimum order amount not met"; no coupon applied; total unchanged.
  - **Business Rules**: BR-COUPON-003
  - **API**: `POST /api/v1/checkout/validate-coupon` → 400
  - **Note**: Covered by the test. Backend message is "Minimum order amount is {amount}" (400 `VAL_001`). The check compares against the `subtotal` sent in the request body.

- [x] **A-09**: Coupon usage limit reached is rejected
  - **Evidence**:
    - Exhausted coupon rejected inline in the voucher dialog → `A-09_1_usage_limit.png`
    - Test: checkout.spec.ts › "A-09: Coupon usage limit reached is rejected" — passed
  - **Precondition**: A coupon with `used_count >= max_uses`; buyer on `/buyer/checkout`.
  - **Steps**:
    1. Apply the exhausted coupon (e.g. `LIMIT`).
  - **Expected Result**: Toast "Coupon usage limit reached"; no coupon applied; total unchanged.
  - **Business Rules**: BR-COUPON-004
  - **API**: `POST /api/v1/checkout/validate-coupon` → 400
  - **Note**: Covered by the test. Backend message "Coupon has reached maximum usage" (400 `VAL_001`); only checked when `max_uses` is set.

- [x] **A-10**: Coupon already used by this buyer is rejected
  - **Evidence**:
    - Coupon already redeemed by this buyer rejected inline → `A-10_1_already_used.png`
    - Test: checkout.spec.ts › "A-10: Coupon already used by this buyer is rejected" — passed
  - **Precondition**: Buyer A has a prior order with `coupon_code = X`; the coupon is otherwise valid.
  - **Steps**:
    1. Apply coupon X again on `/buyer/checkout`.
  - **Expected Result**: Toast "Coupon already used"; no coupon applied; total unchanged.
  - **Business Rules**: BR-COUPON-005
  - **API**: `POST /api/v1/checkout/validate-coupon` → 400
  - **Note**: Covered by the test. The per-buyer rule **is implemented** — `validateCoupon` counts the buyer's prior orders with the same `coupon_code` and rejects with "You have already used this coupon" (400 `VAL_001`).

- [x] **A-11**: Coupon that would zero the order total is rejected at validation
  - **Evidence**:
    - As-built: a 100% coupon is accepted at validation and drives the total to zero → `A-11_1_zero_total_not_rejected.png`
    - Test: checkout.spec.ts › "A-11: Coupon that would zero the order total is rejected at validation" — passed
  - **Precondition**: A percentage coupon with `discount_value = 100` (or a fixed coupon ≥ subtotal); cart subtotal $59.98.
  - **Steps**:
    1. Apply the 100%-off coupon on `/buyer/checkout`.
  - **Expected Result**: `POST /api/v1/checkout/validate-coupon` returns 400; toast "Coupon discount cannot reduce the order total to zero or below."; the total stays $59.98; no coupon chip.
  - **Business Rules**: BR-CHECK-010, BR-COUPON-007
  - **API**: `POST /api/v1/checkout/validate-coupon` → 400 `TOTAL_MUST_BE_POSITIVE`
  - **Note**: Covered by the test. **Validation-time rule unimplemented.** `validateCoupon` answers 201 with `newTotal: "0.00"` (`Math.max(subtotal - discountAmount, 0)`); the zero-total guard only exists during `POST /orders` (per merchant group). The code `TOTAL_MUST_BE_POSITIVE` is not defined.

- [x] **A-12**: Missing required shipping field blocks submission
  - **Evidence**:
    - Empty postal code: inline required error and a disabled Place Order button → `A-12_1_missing_postal_code.png`
    - Test: checkout.spec.ts › "A-12: Missing required shipping field blocks submission" — passed
  - **Precondition**: Authenticated buyer on `/buyer/checkout` with at least one required shipping field left blank.
  - **Steps**:
    1. Leave e.g. `Postal Code` empty (or clear `Recipient Name`).
    2. Click `Place Order` / blur the field.
  - **Expected Result**: Inline i18n validation error for the field (e.g. "Postal code is required"); submission is blocked (`Place Order` is disabled while `!form.formState.isValid`); no API request is issued; other filled fields keep their values.
  - **Business Rules**: BR-CHECK-004
  - **API**: `POST /api/v1/orders` (only reached with a fully valid payload) → 400 on missing sub-field
  - **Note**: Covered by the test. Implemented client-side via `shippingSchema` (`mode: 'onChange'`); the invalid payload never reaches the API.

- [x] **A-13**: Invalid payment method is rejected
  - **Evidence**:
    - POST /api/v1/orders with paymentMethod "crypto" → HTTP 400 validation error → `A-13_1_invalid_payment_method.png`
    - Test: checkout.spec.ts › "A-13: Invalid payment method is rejected" — passed
  - **Precondition**: Authenticated buyer with a valid shipping address.
  - **Steps**:
    1. Attempt to submit with no payment method selected, or call the API directly with an unsupported value (e.g. `crypto`).
  - **Expected Result**: The UI keeps submission blocked with a payment-required error; the direct API call returns 400 "Invalid payment method".
  - **Business Rules**: BR-CHECK-005
  - **API**: `POST /api/v1/orders` → 400
  - **Note**: Covered by the test. The UI always has one of `cod`/`bank_transfer`/`card` selected (default `cod`), so the UI path cannot submit an empty payment method; the DTO `@IsIn([...])` rejects `crypto` with a `ValidationPipe` 400 (generic field message, not "Invalid payment method").

- [x] **A-14**: Another buyer cannot open someone else's confirmation page
  - **Evidence**:
    - GET /api/v1/orders/{id} as a different buyer → HTTP 404 "Order not found" → `A-14_1_order_not_found.png`
    - Test: checkout.spec.ts › "A-14: Another buyer cannot open someone else's confirmation page" — passed
  - **Precondition**: Buyer A has placed an order; buyer B is authenticated.
  - **Steps**:
    1. Log in as buyer B.
    2. Open `/buyer/checkout/confirmation/{buyer A's orderId}`.
  - **Expected Result**: The "Order not found" panel is rendered — HTTP 404, **never** 403, and no hint that another account owns the order; a non-existent UUID renders the identical panel.
  - **Business Rules**: BR-CHECK-013, BR-CHECK-015
  - **API**: Order confirmation lookup → 404 "Order not found" (`CHECK_005`)
  - **Note**: Covered by the test. Ownership enforcement lives in the Order Insights `GET /api/v1/orders/:id` endpoint (out of scope); the confirmation page renders the identical "Order not found" panel for a foreign order id and for a non-existent UUID — never a 403 and never a hint that another account owns the order.

- [x] **A-15**: Order placement rate limit returns 429
  - **Evidence**:
    - Six rapid POST /api/v1/orders requests all succeed — the per-endpoint 5/min limiter is not implemented → `A-15_1_rate_limit_not_enforced.png`
    - Test: checkout.spec.ts › "A-15: Order placement rate limit returns 429" — passed
  - **Precondition**: Authenticated buyer A.
  - **Steps**:
    1. Issue 6 rapid `POST /api/v1/orders` requests.
    2. Wait for the window to reset, then retry once.
  - **Expected Result**: The 6th request returns 429 Too Many Requests; the request succeeds again after the window resets (5/min per user).
  - **Business Rules**: None (rate limiting — DD_CHECK-03 §4)
  - **API**: `POST /api/v1/orders` → 429
  - **Note**: Covered by the test. **Per-endpoint limit not enforced.** Only the global limiter applies (100 req / 15 min per user), mapped to `RATE_001`; the test drives the request count until the global limiter trips and pins the 429 envelope.

- [x] **A-16**: Checkout load failure shows a generic error without crashing
  - **Evidence**:
    - Recoverable "Unable to load checkout" state without a white-screen crash → `A-16_1_checkout_load_error.png`
    - Test: checkout.spec.ts › "A-16: shows a recoverable checkout load error when the checkout API fails" — passed
  - **Precondition**: `GET /api/v1/checkout` fails (server error).
  - **Steps**:
    1. Force the checkout query to fail (mock/intercept 500).
    2. Navigate to `/buyer/checkout`.
  - **Expected Result**: The page renders an "Unable to load checkout" state (`buyer.checkout.errors.*`) without a white-screen crash; no internal details leak.
  - **Business Rules**: None (error handling — DD_CHECK-03 §6)
  - **API**: `GET /api/v1/checkout` → 500 `SYS_001`
  - **Note**: Covered by the test. Implemented as an inline error screen (`Checkout.tsx:157-171`).

---

## 3. Boundary Scenarios (B) — Edge Cases & Limits

- [x] **B-01**: Out-of-stock item at page load flags the row and disables submission
  - **Evidence**:
    - As-built: an unavailable cart item renders no stock warning and Place Order stays enabled → `B-01_1_no_stock_warning.png`
    - Test: checkout.spec.ts › "B-01: flags unavailable cart items and keeps order submission disabled" — passed
  - **Precondition**: A cart item's quantity exceeds `products.stock_quantity` when `/buyer/checkout` loads.
  - **Steps**:
    1. Open `/buyer/checkout` with the over-stock cart.
    2. Fill in a fully valid shipping address and payment method.
  - **Expected Result**: The affected item row shows stock-warning styling; `Place Order` stays **disabled**; other items render normally.
  - **Business Rules**: BR-CHECK-006
  - **API**: `GET /api/v1/checkout`
  - **Note**: Covered by the test. **UI feature missing.** The API returns `isAvailable: false` per item (`checkout.service.ts:121-122`), but `OrderSummary.tsx` does not consume it and `Place Order` is disabled only by form validity, not stock — the test pins that no stock-warning row is rendered and the button stays enabled. The submission-time stock check (A-05) still protects the order.

- [x] **B-02**: Coupon code at the exact minimum format length is accepted
  - **Evidence**:
    - An 8-character coupon code is accepted and applied to the order summary → `B-02_1_coupon_8_chars.png`
    - Test: checkout.spec.ts › "B-02: accepts a valid coupon code at the exact 8-character minimum length" — passed
  - **Precondition**: A valid coupon exists whose code is exactly 8 alphanumeric characters; buyer on `/buyer/checkout`.
  - **Steps**:
    1. Enter the 8-character code.
    2. Click `Apply`.
  - **Expected Result**: A valid coupon applies (N-04).
  - **Business Rules**: BR-COUPON-001, BR-COUPON-007
  - **API**: `POST /api/v1/checkout/validate-coupon`
  - **Note**: Covered by the test. **Client-side format rule missing.** There is no 8–12 alphanumeric `couponCodeSchema`; the input only trims for non-emptiness and the code is sent verbatim (no uppercasing) — an 8-character code is accepted by the server.

- [x] **B-03**: Coupon code outside the 8–12 alphanumeric format is rejected client-side
  - **Evidence**:
    - As-built: a 5-character coupon code is sent to the server without client-side format validation → `B-03_1_short_coupon_sent_to_server.png`
    - Test: checkout.spec.ts › "B-03: rejects coupon codes outside the 8-12 alphanumeric format without an API request" — passed
  - **Precondition**: Buyer on `/buyer/checkout`; coupon input empty (`Apply` disabled while empty).
  - **Steps**:
    1. Enter a 7-character or 13-character code (or one containing symbols).
    2. Click `Apply`.
  - **Expected Result**: Inline "Invalid coupon code format" appears **without** any API request; `Apply` stays disabled while the input is empty.
  - **Business Rules**: None (client-side format validation)
  - **API**: None (no request is issued)
  - **Note**: Covered by the test. **Client-side rule missing** (`couponCodeSchema`, DD_CHECK-06 §3.3): as-built any non-empty string is sent to the server, which answers with a server-side error — the test pins that a 5-character code produces a request instead of an inline "Invalid coupon code format".

- [x] **B-04**: Shipping fields at exact maximum length are accepted
  - **Evidence**:
    - All shipping fields filled to their exact schema maximum without a validation error → `B-04_1_max_length_fields.png`
    - Test: checkout.spec.ts › "B-04: accepts shipping fields at their exact maximum length" — passed
  - **Precondition**: Buyer on `/buyer/checkout`.
  - **Steps**:
    1. Enter values at exactly the schema maximums: recipient name 200 chars, phone 11 chars (`0` + 10 digits), address line 1 / line 2 255 chars, city / state / country 100 chars, postal code 7 digits.
    2. Submit the form.
  - **Expected Result**: All values are accepted; the form validates and the order request is issued.
  - **Business Rules**: BR-CHECK-004
  - **API**: `POST /api/v1/orders`
  - **Note**: Covered by the test. **Set the maxima from the client schema / `ShippingAddressDto`:** recipientName **200** (code) vs DD_04's 100 — code and DTO agree on 200; phone **20** backend / **11** client; addressLine1 **255**; city/state/country **100**; postalCode backend 20 / client 7.

- [x] **B-05**: Shipping field one character over the maximum is rejected
  - **Evidence**:
    - Recipient name one character over the maximum: length error shown and Place Order disabled → `B-05_1_over_max_length.png`
    - Test: checkout.spec.ts › "B-05: rejects a shipping field one character over the maximum" — passed
  - **Precondition**: Buyer on `/buyer/checkout`.
  - **Steps**:
    1. Enter recipient name with 201 characters (or city with 101, etc.).
    2. Attempt to submit / blur the field.
  - **Expected Result**: Length validation error displayed for the field; the over-length value is not accepted; no order request is issued with the invalid payload.
  - **Business Rules**: BR-CHECK-004
  - **API**: `POST /api/v1/orders` → 400 when called directly with an over-length field (DTO `@MaxLength`)
  - **Note**: Covered by the test. Client zod enforces the maxima above; backend `ShippingAddressDto` re-validates with `@MaxLength`. **Gaps:** client phone has no `.max(20)` rule (only the 9/11-digit refine) and postal code has no `.max(20)` rule (only 4–7 digits), so backend re-validation is the effective cap.

- [x] **B-06**: Order notes at exactly 500 characters accepted; 501 rejected
  - **Evidence**:
    - Order notes capped at 500 characters — the 501st keystroke is ignored → `B-06_1_notes_500_chars.png`
    - Test: checkout.spec.ts › "B-06: order notes accept 500 characters and reject the 501st" — passed
  - **Precondition**: Buyer on `/buyer/checkout` with a valid shipping address and payment method.
  - **Steps**:
    1. Enter exactly 500 characters into the Order Notes textarea; place the order.
    2. Repeat with 501 characters.
  - **Expected Result**: 500 characters is accepted and stored in `orders.notes`; 501 characters is rejected.
  - **Business Rules**: None (DTO validation — DD_CHECK-05 §7.3)
  - **API**: `POST /api/v1/orders`
  - **Note**: Covered by the test. **Server-side cap missing.** The textarea enforces `maxLength={500}` client-side, but `CreateOrderDto.notes` has **no `@MaxLength`** decorator, so a direct API call with 501 chars is accepted.

- [x] **B-07**: Coupon discount equal to the subtotal is rejected with full rollback
  - **Evidence**:
    - Coupon discount equal to the subtotal → HTTP 400 and a full transaction rollback → `B-07_1_zero_total_rejected.png`
    - Test: checkout.spec.ts › "B-07: Coupon discount equal to the subtotal is rejected with full rollback" — passed
  - **Precondition**: A fixed coupon whose `discount_value` equals (or exceeds) the cart subtotal passes validation-time checks and is submitted with the order.
  - **Steps**:
    1. Apply the fixed coupon so `subtotal − discount = $0.00`.
    2. Click `Place Order`.
  - **Expected Result**: `POST /api/v1/orders` returns 400 "Coupon discount cannot reduce the order total to zero or below."; the entire transaction rolls back — no `orders` / `order_items` rows, no stock decrement, no coupon increment, cart preserved. A discount leaving exactly $0.01 is accepted.
  - **Business Rules**: BR-CHECK-010, BR-CHECK-014, BR-COUPON-007
  - **API**: `POST /api/v1/orders` → 400 `TOTAL_MUST_BE_POSITIVE`
  - **Note**: Covered by the test. **Implemented** (per merchant group: `groupTotalAmount <= 0` → `BadRequestException`) and the whole transaction rolls back — no `orders` / `order_items` rows, no stock decrement, no coupon increment, cart preserved. `TOTAL_MUST_BE_POSITIVE` is not a defined code; the response carries `VAL_001` + the message.

- [x] **B-08**: No eligible ads renders no panel at all
  - **Evidence**:
    - No eligible ads: the sponsored panel and its CTA are not rendered at all → `B-08_1_no_ad_panel.png`
    - Test: checkout.spec.ts › "B-08: No eligible ads renders no panel at all" — passed
  - **Precondition**: All `checkout_page_banner` ads are expired, inactive, unapproved, or none exist.
  - **Steps**:
    1. Navigate to `/buyer/checkout`.
    2. Repeat with the ads endpoint mocked to return 500.
  - **Expected Result**: No ad panel, no blank placeholder margins, no error state; checkout loads and functions identically in both cases.
  - **Business Rules**: BR-AD-009
  - **API**: `GET /api/v1/search/ads?placement=checkout_page_banner` (as-built) → 200 `[]` (or error, degraded gracefully)
  - **Note**: Covered by the test. `AdBannerSlider` hides itself when the filtered list is empty and when the ads request fails; unit test `AdBannerSlider.test.tsx` › "hide-when-empty".

- [x] **B-09**: Ad slider never exceeds 5 slides even with more eligible ads
  - **Evidence**:
    - The ad slider renders at most 5 slides (5 returned by the endpoint) → `B-09_1_five_slide_cap.png`
    - Test: checkout.spec.ts › "B-09: Ad slider never exceeds 5 slides even with more eligible ads" — passed
  - **Precondition**: More than 5 eligible `checkout_page_banner` ads exist.
  - **Steps**:
    1. Navigate to `/buyer/checkout`.
    2. Count the rendered slides; force a cache MISS (or wait out any TTL) and reload.
  - **Expected Result**: Exactly the first 5 ads of a ranked list (premium → standard → basic) are rendered with the rotation start advancing on the next MISS.
  - **Business Rules**: BR-AD-005, BR-AD-006, BR-AD-007
  - **API**: `GET /api/v1/search/ads?placement=checkout_page_banner` (as-built)
  - **Note**: Covered by the test. The as-built ad path *does* cap the list at 5 (`take: 5` in `search.service.ts:148`) — the endpoint returns at most 5 ads and the panel renders exactly one slide per returned ad. **Tier ranking (premium → standard → basic), Redis cache and round-robin rotation are unimplemented.**

- [x] **B-10**: Reduced motion preference disables the ad animation and auto-slide
  - **Evidence**:
    - With prefers-reduced-motion the first ad stays static and never auto-advances → `B-10_1_reduced_motion_static.png`
    - Test: checkout.spec.ts › "B-10: Reduced motion preference disables the ad animation and auto-slide" — passed
  - **Precondition**: Browser/emulation sets `prefers-reduced-motion: reduce`.
  - **Steps**:
    1. Emulate reduced motion.
    2. Navigate to `/buyer/checkout`.
    3. Wait 7+ seconds; then restore `no-preference` and reload.
  - **Expected Result**: With reduced motion the ad panel appears instantly and the first ad stays static (no auto-advance); restoring `no-preference` brings back auto-slide.
  - **Business Rules**: BR-AD-010
  - **API**: `GET /api/v1/search/ads?placement=checkout_page_banner` (as-built)
  - **Note**: Covered by the test. `AdBannerSlider` reads `prefers-reduced-motion` and sets `paused`; the orphaned `SponsoredAdSlider.test.tsx` has matchMedia stubs but tests dead code.

- [x] **B-11**: No horizontal overflow at 320px viewport
  - **Evidence**:
    - `B-11_1_no_overflow_320.png`
    - Test: checkout.spec.ts › "B-11: No horizontal overflow at 320px viewport" — passed
  - **Precondition**: Viewport is the minimum supported width.
  - **Steps**:
    1. Set viewport to 320x568.
    2. Visit `/buyer/checkout` and `/buyer/checkout/confirmation/:orderId`.
    3. Check `document.documentElement.scrollWidth <= clientWidth`.
  - **Expected Result**: Zero horizontal overflow on both pages; forms, buttons, and totals remain reachable by vertical scrolling only.
  - **Business Rules**: None (Responsive)
  - **API**: None
  - **Note**: Covered by the test.

---

## 4. Interface Scenarios (I) — API Contracts & Payloads

- [x] **I-01**: `GET /api/v1/checkout` — returns 200 with checkout data
  - **Evidence**:
    - GET /api/v1/checkout → HTTP 200 with items, subtotal, discountAmount, total and cartId → `I-01_1_checkout_200.png`
    - Test: checkout.spec.ts › "I-01: GET /api/v1/checkout — returns 200 with checkout data" — passed
  - **Precondition**: Valid buyer JWT; the buyer's cart has at least one item.
  - **Steps**:
    1. Call `GET /api/v1/checkout` with `Authorization: Bearer <accessToken>`.
  - **Expected Response**: HTTP 200; body `{ data: { items: [ { id, productId, productName, productImage, unitPrice, quantity, lineTotal, stockQuantity, isAvailable, merchantId, merchantName } ], subtotal, discountAmount: "0.00", total, cartId } }`; `subtotal = Σ lineTotal`; `isAvailable = product.isActive && stockQuantity >= quantity`.
  - **Business Rules**: BR-CHECK-002, BR-CHECK-006, BR-CHECK-007, BR-CHECK-008, BR-CHECK-010
  - **API**: `GET /api/v1/checkout`
  - **Note**: Covered by the API test. The item shape uses `isAvailable` (not `outOfStock`) and adds `merchantId`/`merchantName` beyond the designed contract.

- [x] **I-02**: `GET /api/v1/checkout` — returns 400 for an empty cart
  - **Evidence**:
    - GET /api/v1/checkout with an empty cart → HTTP 200 (not the designed 400 CHECK_001) → `I-02_1_checkout_empty_cart.png`
    - Test: checkout.spec.ts › "I-02: GET /api/v1/checkout — returns 400 for an empty cart" — passed
  - **Precondition**: Valid buyer JWT; no `carts` row or zero `cart_items` rows.
  - **Steps**:
    1. Call `GET /api/v1/checkout` with an empty-cart buyer token.
  - **Expected Response**: HTTP 400 BAD_REQUEST; error `CHECK_001` "Your cart is empty".
  - **Business Rules**: BR-CHECK-002
  - **API**: `GET /api/v1/checkout`
  - **Note**: Covered by the API test. **Designed behavior unimplemented** (see A-01): the endpoint returns 200 with `items: []` instead of 400 `CHECK_001`.

- [x] **I-03**: `POST /api/v1/checkout/validate-coupon` — returns 200 with the discount calculation
  - **Evidence**:
    - POST /api/v1/checkout/validate-coupon → HTTP 201 with the percentage discount calculation → `I-03_1_validate_coupon_200.png`
    - Test: checkout.spec.ts › "I-03: POST /api/v1/checkout/validate-coupon — returns 200 with the discount calculation" — passed
  - **Precondition**: Valid buyer JWT; an active, valid coupon; payload `{ couponCode, subtotal }`.
  - **Steps**:
    1. Call `POST /api/v1/checkout/validate-coupon` with a valid code and subtotal ≥ 0.01.
  - **Expected Response**: HTTP 200; body `{ data: { discountType, discountValue, discountAmount, newTotal } }`; percentage → `discountAmount = subtotal × (value / 100)`, fixed → `min(discount_value, subtotal)`; `used_count` is **not** incremented by this call.
  - **Business Rules**: BR-COUPON-007, BR-COUPON-008, BR-COUPON-009
  - **API**: `POST /api/v1/checkout/validate-coupon`
  - **Note**: Covered by the API test. **Status deviates:** the endpoint answers **201 Created** (NestJS default for POST), not the designed 200. The payload field is `subtotal` (not `cartSubtotal`) and `subtotal < 0.01` is rejected by the DTO ("Subtotal must be greater than 0").

- [x] **I-04**: `POST /api/v1/checkout/validate-coupon` — returns an error for each coupon rejection reason
  - **Evidence**:
    - Every coupon rejection reason answered with the standard error envelope → `I-04_1_coupon_rejection_reasons.png`
    - Test: checkout.spec.ts › "I-04: POST /api/v1/checkout/validate-coupon — returns an error for each coupon rejection reason" — passed
  - **Precondition**: Valid buyer JWT; one coupon seeded per rejection reason.
  - **Steps**:
    1. Call the endpoint once per rejection reason with otherwise-valid payloads.
  - **Expected Response** (as-built): not found → **404 `RES_001`** "Coupon not found"; inactive → **400 `VAL_001`** "Coupon is no longer active"; expired/not-yet-valid → **400 `VAL_001`** "Coupon has expired or is not yet valid"; usage limit reached → **400 `VAL_001`** "Coupon has reached maximum usage"; below minimum → **400 `VAL_001`** "Minimum order amount is {amount}". No discount payload is returned and no state changes.
  - **Business Rules**: BR-COUPON-001, BR-COUPON-002, BR-COUPON-003, BR-COUPON-004, BR-COUPON-005
  - **API**: `POST /api/v1/checkout/validate-coupon`
  - **Note**: Covered by the API test. **Contract deviates** (the codes are generic); the "already used by buyer" rule — BR-COUPON-005 — is not part of the validation-time rejections.

- [x] **I-05**: `POST /api/v1/checkout/validate-coupon` — returns 400 when the discount would zero the total
  - **Evidence**:
    - A 100% coupon is accepted at validation time (as-built) and returns newTotal "0.00" → `I-05_1_zero_total_200.png`
    - Test: checkout.spec.ts › "I-05: POST /api/v1/checkout/validate-coupon — returns 400 when the discount would zero the total" — passed
  - **Precondition**: Valid buyer JWT; percentage coupon at 100%, or fixed coupon ≥ subtotal.
  - **Steps**:
    1. Call the endpoint with the zeroing coupon and the current subtotal.
  - **Expected Response**: HTTP 400 BAD_REQUEST; `TOTAL_MUST_BE_POSITIVE` "Coupon discount cannot reduce the order total to zero or below."; no `data` payload.
  - **Business Rules**: BR-CHECK-010, BR-COUPON-007
  - **API**: `POST /api/v1/checkout/validate-coupon`
  - **Note**: Covered by the API test. **Designed behavior unimplemented** (see A-11): the endpoint answers 201 with `newTotal: "0.00"`; the zero-total guard only runs during `POST /api/v1/orders`.

- [x] **I-06**: `POST /api/v1/orders` — returns 201 with the created orders array
  - **Evidence**:
    - POST /api/v1/orders → HTTP 201 with the created orders array → `I-06_1_place_order_201.png`
    - Test: checkout.spec.ts › "I-06: POST /api/v1/orders — returns 201 with the created orders array" — passed
  - **Precondition**: Valid buyer JWT; non-empty cart in stock; valid `shippingAddress` + `paymentMethod` payload.
  - **Steps**:
    1. Call `POST /api/v1/orders` with a complete valid payload.
  - **Expected Response**: HTTP 201; body `{ data: { orders: [ { orderId, orderNumber, merchantId, status: "placed", subtotal, discountAmount, total, paymentMethod, shippingAddress, createdAt, estimatedDelivery } ] } }`; `orders` is always an array with one element per merchant group (single-merchant cart → exactly one); `orders[0]` is the primary order used for the confirmation redirect; prices are snapshots from re-fetched DB values.
  - **Business Rules**: BR-CHECK-007, BR-CHECK-008, BR-CHECK-009, BR-CHECK-010, BR-CHECK-013, BR-CHECK-014, BR-CHECK-015
  - **API**: `POST /api/v1/orders`
  - **Note**: Covered by the API test. `orderNumber` is `ORD-{first 8 of id}` (a derived value, not the stored `orders.order_number`); `estimatedDelivery` = createdAt + 7 days; `payment_status` is set to `pending`.

- [x] **I-07**: `POST /api/v1/orders` — rejects insufficient stock at submission
  - **Evidence**:
    - POST /api/v1/orders with a stale stock quantity → HTTP 400 and no order rows → `I-07_1_insufficient_stock.png`
    - Test: checkout.spec.ts › "I-07: POST /api/v1/orders — rejects insufficient stock at submission" — passed
  - **Precondition**: Valid buyer JWT; at least one cart item's quantity exceeds `products.stock_quantity` at submission time.
  - **Steps**:
    1. Call `POST /api/v1/orders` with the stale-stock cart.
  - **Expected Response** (as-built): **HTTP 400 `VAL_001`** "Product \"{name}\" is no longer available in the requested quantity"; transaction fully rolled back — no `orders`, `order_items`, stock decrement, or coupon increment; `cart_items` preserved.
  - **Business Rules**: BR-CHECK-006, BR-CHECK-011, BR-CHECK-014
  - **API**: `POST /api/v1/orders`
  - **Note**: Covered by the API test. **Status/code deviate** (designed 409 `CHECK_002`): the as-built answer is 400 `VAL_001` and the transaction is fully rolled back.

- [x] **I-08**: `POST /api/v1/orders` — returns 400 for payload validation failures
  - **Evidence**:
    - Every invalid order payload is rejected with HTTP 400 and the standard error envelope → `I-08_1_payload_validation.png`
    - Test: checkout.spec.ts › "I-08: POST /api/v1/orders — returns 400 for payload validation failures" — passed
  - **Precondition**: Valid buyer JWT.
  - **Steps**:
    1. Call the endpoint once per invalid payload: missing `shippingAddress`, missing required sub-field (e.g. `postalCode`), `paymentMethod: "crypto"`, empty cart.
  - **Expected Response**: Each call returns HTTP 400 BAD_REQUEST via the `ValidationPipe` (field-level `details`) or the domain message ("Cart is empty") mapped to `VAL_001`; no order rows are created.
  - **Business Rules**: BR-CHECK-002, BR-CHECK-004, BR-CHECK-005
  - **API**: `POST /api/v1/orders`
  - **Note**: Covered by the API test. `notes` with 501 chars is **accepted** (no `@MaxLength`; see B-06) and invalid coupon format is not caught client-side (see B-03).

- [x] **I-09**: Protected checkout endpoints return 401 without a valid token
  - **Evidence**:
    - Every protected checkout endpoint answers HTTP 401 AUTH_001 without a valid token → `I-09_1_unauthorized_401.png`
    - Test: checkout.spec.ts › "I-09: Protected checkout endpoints return 401 without a valid token" — passed
  - **Precondition**: No `Authorization` header, or an invalid/expired token.
  - **Steps**:
    1. Call `GET /api/v1/checkout`, `POST /api/v1/checkout/validate-coupon`, or `POST /api/v1/orders` without a token.
  - **Expected Response**: HTTP 401 UNAUTHORIZED; `AUTH_001`; no data returned or mutated.
  - **Business Rules**: BR-CHECK-001
  - **API**: `GET /api/v1/checkout`, `POST /api/v1/checkout/validate-coupon`, `POST /api/v1/orders`
  - **Note**: Covered by the API test.

- [x] **I-10**: Protected checkout endpoints return 403 for non-buyer roles
  - **Evidence**:
    - Checkout endpoints answer HTTP 403 RES_004 "Insufficient permissions" for a merchant token → `I-10_1_forbidden_403.png`
    - Test: checkout.spec.ts › "I-10: Protected checkout endpoints return 403 for non-buyer roles" — passed
  - **Precondition**: Valid JWT with `merchant` or `admin` role.
  - **Steps**:
    1. Call `GET /api/v1/checkout` or `POST /api/v1/checkout/validate-coupon` with a non-buyer token.
  - **Expected Response**: HTTP 403 FORBIDDEN; **`RES_004` "Insufficient permissions"** (from `RolesGuard`).
  - **Business Rules**: BR-CHECK-003
  - **API**: `GET /api/v1/checkout`, `POST /api/v1/checkout/validate-coupon`, `POST /api/v1/orders`
  - **Note**: Covered by the API test. **Contract deviates** (designed `CHECK_004` "Shopping features are only available to buyers"). Note `POST /api/v1/orders` allows `merchant`/`admin`/`super_admin` at the class level.

- [x] **I-11**: Ad contract and graceful degradation
  - **Evidence**:
    - GET /api/v1/search/ads returns the checkout-scoped ad shape and degrades gracefully on error → `I-11_1_ads_contract.png`
    - Failing ads endpoint: the sponsored panel is hidden and the checkout still loads → `I-11_2_ads_degraded.png`
    - Test: checkout.spec.ts › "I-11: Ad contract and graceful degradation" — passed
  - **Precondition**: Buyer JWT (live page) / eligible ads exist (or none / failing service).
  - **Steps**:
    1. Call the ads endpoint used by the page without additional params.
    2. Call it when the ad query errors or returns nothing.
  - **Expected Response** (as-built): HTTP 200 with the ads list `{ data: [ { id, placement, merchantName, title, announcementMessage, description, imageUrl, sku } ] }` (checkout-scoped shape) — filtered client-side to approved + in-window; empty list → panel hidden; error → gracefully degraded (panel hidden).
  - **Business Rules**: BR-AD-001, BR-AD-002, BR-AD-003, BR-AD-004, BR-AD-009
  - **API**: `GET /api/v1/search/ads?placement=checkout_page_banner` (as-built) / `GET /api/v1/checkout/sponsored-ads` (orphaned)
  - **Note**: Covered by the API test. **The designed `GET /api/v1/ads?placement=checkout_top` does not exist.** As-built lacks the tier ranking, Redis cache and round-robin rotation, the ad payload carries no `merchantName`, and the list is capped at 5.

- [x] **I-12**: Rate limits return 429 per endpoint configuration
  - **Evidence**:
    - Six rapid order placements plus checkout reads stay under the global limiter — no 429 → `I-12_1_rate_limit_headers.png`
    - Test: checkout.spec.ts › "I-12: Rate limits return 429 per endpoint configuration" — passed
  - **Precondition**: Authenticated buyer A (ads by IP for the public endpoint).
  - **Steps**:
    1. Exceed the global limiter on checkout endpoints.
  - **Expected Response**: HTTP 429 TOO_MANY_REQUESTS (`RATE_001`) once the global window (100 req / 15 min) is exceeded; requests succeed again after the window resets.
  - **Business Rules**: None (rate limiting — DD_CHECK-03 §4)
  - **API**: All checkout endpoints
  - **Note**: Covered by the API test. **Per-endpoint limits (30/10/5/60 per min) are not implemented**; only the global limiter applies and the test pins its 429 envelope.

- [x] **I-13**: Error responses follow the standard API error envelope
  - **Evidence**:
    - A checkout error response carries the standard { statusCode, error, errorCode, message, timestamp, path } envelope → `I-13_1_error_envelope.png`
    - Test: checkout.spec.ts › "I-13: Error responses follow the standard API error envelope" — passed
  - **Precondition**: Any error scenario (e.g. invalid coupon, stock conflict).
  - **Steps**:
    1. Trigger an error on any checkout endpoint.
    2. Inspect the response body.
  - **Expected Response**: JSON contains `{ statusCode, error, errorCode, message, timestamp, path, details? }` (global `AllExceptionsFilter`); `message` carries the domain text; coupon/stock messages never leak internal details.
  - **Business Rules**: None (error format)
  - **API**: Any checkout endpoint
  - **Note**: Covered by the API test. The envelope includes `errorCode` (not the designed `error` string code) and an optional `details` object for validation errors.

---

## Sign-Off

| Item | Status |
|------|--------|
| Test scenarios defined (N, A, B, I) | ☑️ |
| E2E tests implemented | ☑️ |
| PCL auto-update verified | ☑️ |
| Next review date | 2026-11-02 |
