# Program Checklist (PCL) — Checkout & Purchase

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-PCL-CHECK-001 |
| **Target Screen** | Checkout & Purchase |
| **Subsystem** | Buyer Module — Checkout & Purchase (Checkout Page + Order Confirmation Page) |
| **Version** | 1.1 |
| **Created** | 2026-10-19 |
| **Last Updated** | 2026-10-19 |
| **Status** | Active |

> **Implementation references:** `frontend/src/pages/buyer/Checkout.tsx`, `frontend/src/pages/buyer/OrderConfirmation.tsx`, `frontend/src/features/buyer/checkout/**`, `backend/src/modules/buyer/orders/**`.
> **Frontend routes:** `/buyer/checkout`, `/buyer/checkout/confirmation/:orderId` (referred to as `/checkout` and `/checkout/confirmation/:orderId` in the Detailed Design). Both are registered under the `buyer` segment with `<ProtectedRoute roles={['buyer']} />` (`frontend/src/app/routes.tsx:373,381`).
> **Scope:** Checkout and Order Confirmation only. Order History, Order Detail, and Order Tracking (`/orders*`) belong to the **Order Insights module** (BR-OI-007) and are out of scope here (DD_CHECK-01 §1). Note: the confirmation page reads order detail via `GET /api/v1/orders/:id` (an Order Insights endpoint) — acceptable as a cross-module read, but order-detail contract changes are owned by Order Insights.
> **Source of truth:** `docs/screen/Checkout_Purchase/Detailed Design/` (DD_CHECK-01 ~ DD_CHECK-06) — business rules BR-CHECK-001~015, BR-COUPON-001~009, BR-AD-001~012.
> **Test status:** `e2e/tests/Checkout_Purchase/checkout.spec.ts` has one "real" test that cannot pass (uses the unauthenticated `{ page }` fixture instead of `buyerPage`, and its `order-summary` locator matches nothing in the app) plus 5 TODO stubs; `e2e/pcl-map/Checkout_Purchase.json` still uses the legacy title-keyed format. No e2e or page-level unit test currently passes for this screen, so **all items below remain unchecked**.
> **Implementation status (code review 2026-10-19, v1.1):** Each scenario note now records the as-built status — ✅ implemented, 🟡 partial/deviating, ❌ missing — with `file:line` evidence. Headline deviations: (1) the ads panel uses `GET /api/v1/search/ads?placement=checkout_page_banner` instead of the designed `GET /api/v1/ads?placement=checkout_top` (no tier ranking, no cache, no entrance animation, no click analytics); (2) `CHECK_001~005`, `TOTAL_MUST_BE_POSITIVE`, and checkout-specific 409/429 behaviors do not exist — errors use the generic `VAL_001`/`RES_00x`/`AUTH_001` codes; (3) no rate-limit 429 is ever thrown (`RateLimitInterceptor` writes headers only); (4) coupons are per-merchant-shop (voucher modal), not a single per-order chip; (5) the confirmation page has no i18n, no `placed` badge, no Print Receipt, and `Continue Shopping` → `/buyer/search`; (6) empty `GET /checkout` returns 200 (not 400); stock conflict on `POST /orders` returns 400 (not 409).

---

## 1. Normal Scenarios (N) — Happy Path

- [ ] **N-01**: Checkout page loads with order summary, shipping form, and payment options
  - **Precondition**: Authenticated buyer with a non-empty cart (e.g. P1 × 2 @ $10.00, P2 × 1 @ $15.00).
  - **Steps**:
    1. Log in as a buyer.
    2. Navigate to `/buyer/checkout`.
    3. Wait for the checkout query to resolve.
  - **Expected Result**: The page renders the order summary (product image, name, quantity, unit price, line total per item), `Subtotal`, `Discount` (row hidden when $0), and `Total`; the shipping address form, payment method radios (Cash on Delivery / Bank Transfer / Card), optional Order Notes textarea, and the `Place Order` button are visible. Ad panel renders only when eligible ads exist — see N-09 for the as-built placement deviation.
  - **Business Rules**: BR-CHECK-001, BR-CHECK-002, BR-CHECK-006, BR-CHECK-008, BR-CHECK-010
  - **API**: `GET /api/v1/checkout`
  - **Implementation**: 🟡 All sections render (`Checkout.tsx:173–223`, `OrderSummary.tsx:82–161`, `CheckoutForm.tsx:159–441`); Discount row hidden when 0 (`OrderSummary.tsx:148`); totals grouped per merchant with "Sold by" labels; currency rendered as `Ks`. Ad slot is `<AdBannerSlider placement="checkout_page_banner" />` (`Checkout.tsx:193`), not `checkout_top`.
  - **Note**: The existing e2e test (`should display checkout page with order summary`) cannot pass — wrong fixture, non-existent `order-summary` locator. Left unchecked.

- [ ] **N-02**: Shipping recipient name is pre-filled from the buyer profile
  - **Precondition**: Authenticated buyer with a profile containing a recipient name; on `/buyer/checkout`.
  - **Steps**:
    1. Open `/buyer/checkout`.
    2. Inspect the shipping address form.
  - **Expected Result**: `Recipient Name` is pre-filled from the profile; `Phone`, `Address Line 1`, `Address Line 2 (optional)`, `City`, `State`, `Postal Code`, and `Country` start empty.
  - **Business Rules**: BR-CHECK-004
  - **API**: `GET /api/v1/checkout`
  - **Implementation**: ❌ Not implemented. `defaultValues` are all empty strings (`CheckoutForm.tsx:139–148`); `GET /checkout` returns no profile data (`checkout.service.ts:131–137`). Note also `Country` defaults to `JP` (a `<select>` of 8 countries, `CheckoutForm.tsx:75–84`), so it does not "start empty" as designed.
  - **Note**: Left unchecked — design gap.

- [ ] **N-03**: Payment method defaults to Cash on Delivery
  - **Precondition**: Authenticated buyer on `/buyer/checkout`.
  - **Steps**:
    1. Open `/buyer/checkout`.
    2. Inspect the Payment Method section.
  - **Expected Result**: `cod` (Cash on Delivery) is selected by default; selecting `bank_transfer` or `card` updates the selection.
  - **Business Rules**: BR-CHECK-005
  - **API**: None (client state, submitted with `POST /api/v1/orders`)
  - **Implementation**: ✅ Radios `cod | bank_transfer | card`, default `'cod'` (`CheckoutForm.tsx:134`); card described as "stubbed for MVP" (`CheckoutForm.tsx:384`). Note: `features/buyer/checkout/components/PaymentMethod.tsx` is an empty 0-byte file (dead placeholder).
  - **Note**: Left unchecked until a real test passes.

- [ ] **N-04**: Apply a valid coupon code and see the discount and total update
  - **Precondition**: Authenticated buyer with cart subtotal $59.98; a valid active percentage coupon exists.
  - **Steps**:
    1. Open `/buyer/checkout`.
    2. Enter a valid 8–12 alphanumeric coupon code.
    3. Click `Apply`.
  - **Expected Result**: `POST /api/v1/checkout/validate-coupon` returns 200; the applied coupon chip (EL-22) renders; the Discount row shows `-$x.xx`; `Total = Subtotal − Discount`; a "Coupon applied successfully" toast is shown.
  - **Business Rules**: BR-COUPON-007, BR-COUPON-008, BR-CHECK-009, BR-CHECK-010
  - **API**: `POST /api/v1/checkout/validate-coupon`
  - **Implementation**: 🟡 The flow works but the model deviates: coupons are applied **per merchant shop** via `ShopVoucherRow` → `VoucherSelectionModal` (list of merchant promotions + manual code entry), not a single per-order chip. Manual apply does **not** enforce the 8–12 alphanumeric format and does **not** uppercase before sending (`VoucherSelectionModal.tsx:82–89`); uppercase is display-only. Success toast "Coupon applied successfully" and discount/total update work (`Checkout.tsx:55–72`, `OrderSummary.tsx:68–80`).
  - **Note**: Left unchecked — e2e stub has TODO assertions; design deviation (per-shop vouchers).

- [ ] **N-05**: Remove an applied coupon and verify the total reverts
  - **Precondition**: Authenticated buyer on `/buyer/checkout` with a coupon already applied (discount > $0).
  - **Steps**:
    1. Click the remove control on the applied coupon chip.
  - **Expected Result**: The coupon chip disappears, the discount resets to $0 (Discount row hidden), and `Total` reverts to `Subtotal`. A "Coupon removed" toast is shown.
  - **Business Rules**: BR-CHECK-009, BR-CHECK-010, BR-COUPON-008 (one coupon per order — replacement/removal, never stacking)
  - **API**: None (client state reset)
  - **Implementation**: 🟡 Removal works with "Coupon removed" toast (`Checkout.tsx:74–81`; `VoucherSelectionModal.tsx:97–101,141`). ⚠ Deviation: one coupon **per merchant shop** may be applied simultaneously (`appliedByMerchant` map, `Checkout.tsx:50–52`) — stacking across shops is possible, unlike the one-coupon-per-order design. On submit, legacy `couponCode` joins codes with `", "` (`Checkout.tsx:97–104`).
  - **Note**: Left unchecked — e2e stub has TODO assertions; design deviation.

- [ ] **N-06**: Place an order successfully and reach the Order Confirmation page
  - **Precondition**: Authenticated buyer with in-stock cart items; valid shipping address entered; payment method selected.
  - **Steps**:
    1. Open `/buyer/checkout`.
    2. Fill all required shipping fields with valid data.
    3. Keep/choose a payment method and optionally add order notes.
    4. Click `Place Order`.
  - **Expected Result**: The loading overlay (EL-70) "Processing your order..." appears while submitting; on 201 the overlay hides and the browser navigates to `/buyer/checkout/confirmation/{orderId}` using `orders[0]` (the primary order) from the response.
  - **Business Rules**: BR-CHECK-004, BR-CHECK-005, BR-CHECK-007, BR-CHECK-011, BR-CHECK-012, BR-CHECK-013, BR-CHECK-014
  - **API**: `POST /api/v1/orders`
  - **Implementation**: ✅ Overlay text "Processing your order..." (`Checkout.tsx:209–216`); on success toast + redirect to `/buyer/checkout/confirmation/{orders[0].orderId}` with `?orderIds=` listing the remaining split-order IDs (`Checkout.tsx:107–116`); backend returns 201 (`orders.controller.ts:42`). Caveat: all place-order failures surface as one generic "Failed to place order. Please try again." toast (`Checkout.tsx:117–121`) — no status-specific handling. An `AccountDeactivatedDialog` blocks deactivated buyers pre-submit (`Checkout.tsx:88–91`).
  - **Note**: Left unchecked — e2e stub has TODO assertions. Scenario DD_CHECK-06 §4 — E2E-CHECK-01.

- [ ] **N-07**: Order Confirmation page renders the placed order details
  - **Precondition**: Buyer has just placed an order (status `placed`) and is on `/buyer/checkout/confirmation/:orderId`.
  - **Steps**:
    1. Complete checkout (N-06).
    2. Inspect the confirmation page.
  - **Expected Result**: Success icon and "Order Placed Successfully!" title (EL-81); order ID shown as `#` + the first 8 characters of the UUID (EL-83); `placed` status badge; summary card with items (image, name, quantity, unit price, line total), Subtotal, Discount, Total Due, shipping address block, and payment method. The estimated-delivery row (EL-86) is **hidden** for `placed` status.
  - **Business Rules**: BR-CHECK-013, BR-CHECK-015, BR-DISP-001, BR-DISP-004
  - **API**: Order confirmation data rendered from `GET /api/v1/orders/:id` (Order Insights read endpoint)
  - **Implementation**: 🟡 Title + green check render (`OrderConfirmation.tsx:179–192`); items/totals/shipping/payment cards render (`OrderConfirmation.tsx:198–392`). ⚠ Order ID shown as `#ORD-XXXXXXXX` (`#{orderNumber}`, `OrderConfirmation.tsx:189`; backend `orderNumber = "ORD-" + first-8-UUID`, `orders.service.ts:648`) — not bare `#` + first 8. ❌ No `placed` status badge (only Paid/Pending-Payment payment badges, `OrderConfirmation.tsx:326–337,381–390`). Estimated-delivery row is absent entirely (satisfies "hidden for placed" but EL-86 is unimplemented for all statuses; `GET /orders/:id` has no `estimatedDelivery` field, `orders.service.ts:646–685`). Split orders merge vouchers/shipping into one summary (`OrderConfirmation.tsx:121–147`).
  - **Note**: Left unchecked — e2e stub has TODO assertions; multiple design deviations.

- [ ] **N-08**: Successful order placement applies all write effects atomically
  - **Precondition**: Buyer places an order with a coupon applied and stock available for all items.
  - **Steps**:
    1. Record product `stock_quantity`, coupon `promotions.used_count`, and cart contents before submitting.
    2. Place the order (N-06).
    3. Snapshot the DB after the redirect.
  - **Expected Result**: One `orders` row (status `placed`), one `order_items` row per cart item with prices locked at creation, one initial `order_status_history` row, per-item `inventory_transactions` rows; `products.stock_quantity` decremented per quantity; `promotions.used_count` incremented by 1; converted `cart_items` rows deleted while the `carts` header is retained.
  - **Business Rules**: BR-CHECK-011, BR-CHECK-012, BR-CHECK-013, BR-CHECK-014, BR-CHECK-015, BR-COUPON-009
  - **API**: `POST /api/v1/orders`
  - **Implementation**: 🟡 Single `$transaction` covers: coupon `usedCount` increment per unique code (`orders.service.ts:136–148`), one order per merchant group (`orders.service.ts:102–118,161–268` — order splitting ✓), order + items rows (`orders.service.ts:185–238`), stock decrement (`orders.service.ts:240–247`), `order_status_history` row (`orders.service.ts:250–256`), cart clear via `cartItem.deleteMany` (`orders.service.ts:270–272`), merchant `ORDER_PLACED` notification (`orders.service.ts:214–223`). ❌ No `inventory_transactions` rows are created (that table is only written by the products module). ⚠ The stock availability check runs **before** the transaction (`orders.service.ts:40–48`) and the decrement is not conditionally guarded, so a race can drive stock negative.
  - **Note**: Left unchecked — no test exists; partial implementation. Evidence when passed: DB snapshot `N-08_db_orders.json`.

- [ ] **N-09**: Sponsored ad panel renders eligible Checkout Top ads
  - **Precondition**: At least one approved, active, in-schedule ad with a `checkout_top` placement exists; buyer on `/buyer/checkout`.
  - **Steps**:
    1. Open `/buyer/checkout`.
    2. Observe the ad panel while the cart query loads (ads fetch runs in parallel).
  - **Expected Result**: The panel slides down into view (300 ms ease-out, once per mount) and renders one card per ad: image, title, description only when present, CTA button, and a `Sponsored` badge; slides appear in the fetched order (premium first, then standard, then basic). Checkout remains fully usable if ads load slowly or fail.
  - **Business Rules**: BR-AD-001, BR-AD-002, BR-AD-003, BR-AD-004, BR-AD-005, BR-AD-007, BR-AD-009
  - **API**: `GET /api/v1/ads?placement=checkout_top` (designed) — **as-built: `GET /api/v1/search/ads?placement=checkout_page_banner`**
  - **Implementation**: ❌ Not implemented as designed. The page renders the shared `<AdBannerSlider placement="checkout_page_banner" />` (`Checkout.tsx:193`) which calls the public `GET /api/v1/search/ads` endpoint (`search/services/ad.service.ts:6`, `search.controller.ts:62–75`). No frontend code calls `GET /api/v1/ads?placement=checkout_top` (that endpoint exists, `ads.controller.ts:14–23`, but is unconsumed; its placement filter is also ignored for non-`_banner` values, `ads.service.ts:28–42`). No 300 ms slide-down entrance animation, no Premium→Standard→Basic tier ranking (search endpoint orders by `startsAt desc`, `search.service.ts:148`; shared ads endpoint by `paymentAmount desc`, `ads.service.ts:56`). Graceful degradation ✓ (renders `null` when no ads, `AdBannerSlider.tsx:134`). The checkout-feature `SponsoredAdSlider.tsx` component is dead code (never rendered); `GET /api/v1/checkout/sponsored-ads` feeds only that unused component.
  - **Note**: Left unchecked — major design deviation. Scenario DD_CHECK-06 §4 — E2E-CHECK-06 (ordering part) cannot pass against current code.

- [ ] **N-10**: Ad carousel auto-advances every 5 seconds and loops
  - **Precondition**: 2–3 eligible ads rendered in the checkout ad panel.
  - **Steps**:
    1. Leave the pointer outside the ad panel and keep it unfocused.
    2. Wait 5 seconds, then another 5 seconds.
  - **Expected Result**: The visible slide advances every 5000 ms with a vertical slide-down transition (500 ms); after the last slide it loops back to the first; the slide indicator reflects the current index.
  - **Business Rules**: DD_CHECK-02 §3.2.1, BR-AD-007 (max 5 slides)
  - **API**: `GET /api/v1/search/ads?placement=checkout_page_banner` (as-built)
  - **Implementation**: 🟡 Auto-advance interval 5000 ms with modulo loop and dot indicators (`AdBannerSlider.tsx:11,88–102`). ⚠ No vertical 500 ms slide transition between slides (instant swap).
  - **Note**: Left unchecked — no e2e test; transition deviation. Scenario DD_CHECK-06 §4 — E2E-CHECK-07.

- [ ] **N-11**: Ad carousel pauses on hover/focus and resumes on leave/blur
  - **Precondition**: Ad panel with multiple slides is visible on `/buyer/checkout`.
  - **Steps**:
    1. Hover the pointer over the ad panel; wait 7 seconds.
    2. Move the pointer away; wait 5 seconds.
    3. Keyboard-focus the CTA; wait 7 seconds; then blur it.
  - **Expected Result**: No slide change while hovered or focused; auto-advance resumes after pointer leave / blur.
  - **Business Rules**: BR-AD-011 (WCAG 2.2.2)
  - **API**: None (client behavior)
  - **Implementation**: ✅ Pause on hover/focus and resume on leave/blur implemented (`AdBannerSlider.tsx:86,180–188`).
  - **Note**: Left unchecked — no e2e test exists. Scenario DD_CHECK-06 §4 — E2E-CHECK-07.

- [ ] **N-12**: Ad CTA click fires the analytics event
  - **Precondition**: Ad panel with at least one ad is visible.
  - **Steps**:
    1. Click the CTA button of the visible ad.
  - **Expected Result**: The `ad.click` analytics event fires carrying `ad_id` and `placement = checkout_top`; the CTA destination (`ctaUrl`) opens.
  - **Business Rules**: BR-AD-012
  - **API**: None (client-side analytics)
  - **Implementation**: ❌ Not wired. `AdBannerSlider` exposes `onAdClick`/`onImpression` callbacks, but `Checkout.tsx:193` passes neither; nothing on the checkout page calls the click-tracking endpoint (`POST /api/v1/ads/track/click`, `ads.controller.ts:39–44` is unused by the frontend).
  - **Note**: Left unchecked — missing implementation.

- [ ] **N-13**: Order Confirmation action buttons work
  - **Precondition**: Buyer is on `/buyer/checkout/confirmation/:orderId`.
  - **Steps**:
    1. Click `Continue Shopping`.
    2. Return to the confirmation page and click `View Order`.
    3. Return again and click `Print Receipt` (if rendered).
  - **Expected Result**: `Continue Shopping` navigates to the product listing (`/products` per EL-90); `View Order` navigates to `/orders/:orderId` (the Order Insights screen); `Print Receipt` calls `window.print()`.
  - **Business Rules**: None (navigation / browser print)
  - **API**: None
  - **Implementation**: 🟡 `View Order` → `/orders/{id}` ✓ (`OrderConfirmation.tsx:398`; route exists, `routes.tsx:590–616`). ⚠ `Continue Shopping` → `/buyer/search` (`OrderConfirmation.tsx:404`) instead of the product listing. ❌ `Print Receipt` button (画面項目設計書 K3) is not rendered; no `window.print` anywhere in the file. An extra `View Order History` button → `/orders` exists (`OrderConfirmation.tsx:166`).
  - **Note**: Left unchecked — implementation still deviates from DD_CHECK-02 §3.10 / DD_CHECK-06 §3.9 and no tests exist.

- [ ] **N-14**: Language toggle updates checkout and confirmation labels
  - **Precondition**: User is on `/buyer/checkout` or `/buyer/checkout/confirmation/:orderId`.
  - **Steps**:
    1. Toggle language to Japanese; verify labels, toasts, validation messages, and the guest modal text.
    2. Toggle language to Myanmar; verify again.
    3. Toggle back to English.
  - **Expected Result**: All UI labels, button texts, toasts, and error messages switch to the selected locale (EN / JA / MY) without layout breakage.
  - **Business Rules**: None (i18n)
  - **API**: None
  - **Implementation**: 🟡 Checkout page is fully keyed with `buyer.checkout.*` and EN/JA/MY translations exist (`frontend/public/locales/{en,ja,my}/translation.json`). ❌ `OrderConfirmation.tsx` never calls `useTranslation` — the entire confirmation page (title, not-found panel, buttons, badges) is hard-coded English.
  - **Note**: Left unchecked — partial implementation; no e2e test. Scenario DD_CHECK-06 §4 — E2E-CHECK-13.

- [ ] **N-15**: Theme toggle works on checkout and confirmation pages
  - **Precondition**: User is on `/buyer/checkout` or `/buyer/checkout/confirmation/:orderId`.
  - **Steps**:
    1. Toggle theme to dark mode; verify styling.
    2. Toggle back to light mode.
  - **Expected Result**: Background, cards, badges, and overlays switch between dark and light modes without layout breakage.
  - **Business Rules**: None (UI)
  - **API**: None
  - **Implementation**: ✅ (by platform) Tailwind `dark:` variants are used throughout both pages; no page-specific theme logic.
  - **Note**: Left unchecked — no test exists. Scenario DD_CHECK-06 §4 — E2E-CHECK-13.

- [ ] **N-16**: Responsive layout on desktop viewport
  - **Precondition**: Viewport >= 1024px.
  - **Steps**:
    1. Set viewport to 1280x720.
    2. Open `/buyer/checkout`.
  - **Expected Result**: Desktop layout shows the order summary and shipping/payment sections side by side; no horizontal scroll; ad card sits in its designed slot.
  - **Business Rules**: None (Responsive)
  - **API**: None
  - **Implementation**: 🟡 Two-column grid `lg:grid-cols-2` with `max-w-5xl` container (`CheckoutForm.tsx:161`, `Checkout.tsx:174`); ad panel sits above the grid (`Checkout.tsx:193`). No horizontal-scroll guard tested.
  - **Note**: Left unchecked — no e2e test. Scenario DD_CHECK-06 §4 — E2E-CHECK-14.

- [ ] **N-17**: Responsive layout on mobile viewport
  - **Precondition**: Viewport < 768px.
  - **Steps**:
    1. Set viewport to 375x667.
    2. Open `/buyer/checkout` and `/buyer/checkout/confirmation/:orderId`.
  - **Expected Result**: Sections stack vertically (order summary, shipping, payment, notes, totals) and scroll normally; the ad card stacks its image above the content (画面項目設計書 §6.2); no horizontal overflow.
  - **Business Rules**: None (Responsive)
  - **API**: None
  - **Implementation**: 🟡 Sections stack via `sm:`/`flex-col` responsive classes; ad card stacks image above content (`AdBannerSlider.tsx:185–246`). No overflow test.
  - **Note**: Left unchecked — no e2e test. Scenario DD_CHECK-06 §4 — E2E-CHECK-14.

---

## 2. Abnormal Scenarios (A) — Error & Negative Paths

- [ ] **A-01**: Empty cart is blocked from checkout
  - **Precondition**: Buyer B is authenticated with zero `cart_items`.
  - **Steps**:
    1. Log in as buyer B.
    2. Navigate to `/buyer/checkout`.
  - **Expected Result**: Toast "Your cart is empty" (`CHECK_001`); no order summary and no `Place Order` button rendered.
  - **Business Rules**: BR-CHECK-002
  - **API**: `GET /api/v1/checkout` → 400 `CHECK_001`
  - **Implementation**: ❌ Backend `GET /checkout` always returns **200** with `items: []` (`checkout.service.ts:76–138`); the page renders an empty summary with $0.00 totals and the Place Order button remains (enabled once the form is valid). No `CHECK_001` code exists anywhere. Only `POST /orders` rejects an empty cart with 400 `'Cart is empty'` (`orders.service.ts:36–38`).
  - **Note**: Left unchecked — design gap. Scenario DD_CHECK-06 §4 — E2E-CHECK-09 cannot pass.

- [ ] **A-02**: Unauthenticated access to checkout is redirected to login
  - **Precondition**: No session (logged out).
  - **Steps**:
    1. Navigate directly to `/buyer/checkout`.
  - **Expected Result**: Redirect to `/login` (design: `/login?redirect=/checkout`) so the buyer returns to checkout after logging in; no checkout data is requested without a token.
  - **Business Rules**: BR-CHECK-001
  - **API**: Any checkout endpoint without a token → 401 `AUTH_001`
  - **Implementation**: 🟡 `ProtectedRoute` redirects unauthenticated users to `/login` **without** a `?redirect=` param (`ProtectedRoute.tsx:15`), so the return-to-checkout guarantee is missing. The checkout page's own guest dialog (unreachable in practice, since the route guard fires first) links to `/login?redirect=%2Fcheckout` (`Checkout.tsx:140`), but `Login.tsx:49` redirects verbatim to `/checkout`, which matches the catch-all route → **NotFound page** (`routes.tsx:669–676`) — broken return path.
  - **Note**: Left unchecked — redirect works but return path is broken. Scenario DD_CHECK-06 §4 — E2E-CHECK-04.

- [ ] **A-03**: Guest on a stale checkout view is blocked by the Guest Login Modal
  - **Precondition**: A `/buyer/checkout` view is open but the session has expired or the user is a guest.
  - **Steps**:
    1. On the stale checkout view, click `Place Order`.
    2. Read the modal message; click `Log in`.
    3. Close the modal via its close control.
  - **Expected Result**: The `GuestLoginModal` (EL-65) opens with "Please log in to complete your purchase." / 「購入を完了するにはログインしてください。」 (EL-66); `Log in` navigates to `/login?redirect=/checkout` (EL-67) and the buyer returns to checkout after login; the close control dismisses the modal without navigation; no order is created.
  - **Business Rules**: BR-CHECK-001, BR-CHECK-003 (guest has no buyer session)
  - **API**: `POST /api/v1/orders` → 401 `AUTH_001`
  - **Implementation**: ❌ `GuestLoginModal` is not used by checkout (it is only rendered by `Header.tsx:194`). A place-order 401 surfaces only the generic failure toast (`Checkout.tsx:117–121`); the axios client attempts a token refresh and hard-redirects to `/login` on refresh failure (`api-client.ts:50–72`).
  - **Note**: Left unchecked — missing implementation. Scenario DD_CHECK-06 §4 — E2E-CHECK-04.

- [ ] **A-04**: Non-buyer roles are blocked from checkout
  - **Precondition**: Authenticated as merchant or admin.
  - **Steps**:
    1. Attempt to navigate to `/buyer/checkout`.
    2. Call `POST /api/v1/orders` with the non-buyer token.
  - **Expected Result**: Route guard blocks the screen (role mismatch → `/unauthorized`); the direct API call returns 403 `CHECK_004` with the toast "Shopping features are only available to buyers".
  - **Business Rules**: BR-CHECK-003
  - **API**: `GET /api/v1/checkout`, `POST /api/v1/checkout/validate-coupon`, `POST /api/v1/orders` → 403 `CHECK_004`
  - **Implementation**: 🟡 Frontend route guard ✓ (`routes.tsx:311`, `ProtectedRoute.tsx:16–17` → `/unauthorized`). ⚠ API 403 uses code `RES_004` / message `'Insufficient permissions'` (`roles.guard.ts:35`), not `CHECK_004`. ❌ **`POST /api/v1/orders` explicitly allows `buyer, merchant, admin, super_admin`** (`orders.controller.ts:35`) — contrary to BR-CHECK-003; only `GET /checkout` and `validate-coupon` are buyer-only (`checkout.controller.ts:16–42`).
  - **Note**: Left unchecked — API deviation. Scenario DD_CHECK-06 §4 — E2E-CHECK-10.

- [ ] **A-05**: Stock conflict at submission rejects the whole order
  - **Precondition**: Buyer A loads `/buyer/checkout` with quantity 4 of a product whose stock is 5 (passes page-load check); stock then drops to 2 because another buyer purchases 3 units.
  - **Steps**:
    1. As buyer A, click `Place Order`.
  - **Expected Result**: The loading overlay hides and a toast shows "Some items are no longer available. Please review your cart." (`CHECK_002`, HTTP 409); the buyer stays on `/buyer/checkout`; **no** `orders` / `order_items` rows are created, stock stays at 2, the coupon `used_count` is unchanged, and the cart is fully preserved.
  - **Business Rules**: BR-CHECK-006, BR-CHECK-011, BR-CHECK-014
  - **API**: `POST /api/v1/orders` → 409 `CHECK_002`
  - **Implementation**: 🟡 Whole-order rejection with no partial writes ✓ (pre-transaction check, `orders.service.ts:40–48`), but returns **400** with message `Product "X" is no longer available in the requested quantity` — not 409 / `CHECK_002`. The frontend shows only the generic failure toast (`Checkout.tsx:117–121`) and the buyer stays on checkout.
  - **Note**: Left unchecked — status/code deviation; no e2e test. Scenario DD_CHECK-06 §4 — E2E-CHECK-02.

- [ ] **A-06**: Invalid or inactive coupon code is rejected
  - **Precondition**: Authenticated buyer on `/buyer/checkout` with a non-empty cart.
  - **Steps**:
    1. Enter a coupon code that does not exist in `promotions`, or one with `is_active = false`.
    2. Click `Apply`.
  - **Expected Result**: Toast/inline error "Invalid coupon code" (`CHECK_003`); no coupon chip; discount stays $0; total unchanged.
  - **Business Rules**: BR-COUPON-001
  - **API**: `POST /api/v1/checkout/validate-coupon` → 400 `CHECK_003`
  - **Implementation**: 🟡 Backend rejects: not-found → **404** `'Coupon not found'` (`checkout.service.ts:146`), inactive → 400 `'Coupon is no longer active'` (`checkout.service.ts:150`). No `CHECK_003` code. Frontend collapses **all** validation failures into one toast "Invalid coupon code" (`Checkout.tsx:66–69`).
  - **Note**: Left unchecked — status/message deviations; no e2e test. Scenario DD_CHECK-06 §4 — E2E-CHECK-03.

- [ ] **A-07**: Expired coupon is rejected
  - **Precondition**: A coupon exists with `expires_at` in the past; buyer on `/buyer/checkout`.
  - **Steps**:
    1. Apply the expired coupon code (e.g. `EXPIRED`).
  - **Expected Result**: Toast "Coupon has expired"; no coupon applied; total unchanged.
  - **Business Rules**: BR-COUPON-002
  - **API**: `POST /api/v1/checkout/validate-coupon` → 400
  - **Implementation**: ✅ (backend) 400 `'Coupon has expired or is not yet valid'` (`checkout.service.ts:154–157`); ⚠ frontend shows the generic "Invalid coupon code" toast instead of the specific message.
  - **Note**: Left unchecked — no e2e test. Scenario DD_CHECK-06 §4 — E2E-CHECK-03 (VAL-CHECK-012).

- [ ] **A-08**: Coupon below the minimum order amount is rejected
  - **Precondition**: A coupon with `min_order_amount = 100`; cart subtotal $59.98.
  - **Steps**:
    1. Apply the coupon (e.g. `MINL`).
  - **Expected Result**: Toast "Minimum order amount not met"; no coupon applied; total unchanged.
  - **Business Rules**: BR-COUPON-003
  - **API**: `POST /api/v1/checkout/validate-coupon` → 400
  - **Implementation**: ✅ (backend) 400 ``Minimum order amount is ${min}`` (`checkout.service.ts:163–170`); the voucher modal also disables the radio for below-minimum promotions (`VoucherSelectionModal.tsx:156–186`). ⚠ Message text differs from the design; frontend toast is generic.
  - **Note**: Left unchecked — no e2e test. Scenario DD_CHECK-06 §4 — E2E-CHECK-03 (VAL-CHECK-013).

- [ ] **A-09**: Coupon usage limit reached is rejected
  - **Precondition**: A coupon with `used_count >= max_uses`; buyer on `/buyer/checkout`.
  - **Steps**:
    1. Apply the exhausted coupon (e.g. `LIMIT`).
  - **Expected Result**: Toast "Coupon usage limit reached"; no coupon applied; total unchanged.
  - **Business Rules**: BR-COUPON-004
  - **API**: `POST /api/v1/checkout/validate-coupon` → 400
  - **Implementation**: ✅ (backend) 400 `'Coupon has reached maximum usage'` (`checkout.service.ts:159–161`); exhausted promotions are also hidden from the voucher list (`VoucherSelectionModal.tsx:156–186`). ⚠ Frontend toast is generic.
  - **Note**: Left unchecked — no e2e test. Scenario DD_CHECK-06 §4 — E2E-CHECK-03 (VAL-CHECK-014).

- [ ] **A-10**: Coupon already used by this buyer is rejected
  - **Precondition**: Buyer A has a prior order with `coupon_code = X`; the coupon is otherwise valid.
  - **Steps**:
    1. Apply coupon X again on `/buyer/checkout`.
  - **Expected Result**: Toast "Coupon already used"; no coupon applied; total unchanged.
  - **Business Rules**: BR-COUPON-005
  - **API**: `POST /api/v1/checkout/validate-coupon` → 400
  - **Implementation**: ❌ No per-buyer "already used" check exists in `validateCoupon` (`checkout.service.ts:140–190`) or `placeOrder` — the only usage checks are `usedCount >= maxUses` and the increment.
  - **Note**: Left unchecked — rule unimplemented. Scenario DD_CHECK-06 §4 — E2E-CHECK-03.

- [ ] **A-11**: Coupon that would zero the order total is rejected at validation
  - **Precondition**: A percentage coupon with `discount_value = 100` (or a fixed coupon ≥ subtotal); cart subtotal $59.98.
  - **Steps**:
    1. Apply the 100%-off coupon on `/buyer/checkout`.
  - **Expected Result**: `POST /api/v1/checkout/validate-coupon` returns 400; toast "Coupon discount cannot reduce the order total to zero or below."; the total stays $59.98; no coupon chip is rendered.
  - **Business Rules**: BR-CHECK-010, BR-COUPON-007
  - **API**: `POST /api/v1/checkout/validate-coupon` → 400 `TOTAL_MUST_BE_POSITIVE`
  - **Implementation**: ❌ Validation returns **200** with `newTotal: "0.00"` (`checkout.service.ts:182–189`) — the coupon applies. The zero-total guard exists only inside `POST /orders` (`orders.service.ts:178–183`, 400 with the design message, full rollback — see B-07). No `TOTAL_MUST_BE_POSITIVE` code exists.
  - **Note**: Left unchecked — validation-time rule unimplemented. Scenario DD_CHECK-06 §4 — E2E-CHECK-15.

- [ ] **A-12**: Missing required shipping field blocks submission
  - **Precondition**: Authenticated buyer on `/buyer/checkout` with at least one required shipping field left blank.
  - **Steps**:
    1. Leave e.g. `Postal Code` empty (or clear `Recipient Name`).
    2. Click `Place Order` / blur the field.
  - **Expected Result**: Inline i18n validation error for the field (e.g. "Postal code is required"); submission is blocked; no API request is issued; other filled fields keep their values.
  - **Business Rules**: BR-CHECK-004
  - **API**: `POST /api/v1/orders` (only reached with a fully valid payload) → 400 on missing sub-field
  - **Implementation**: ✅ Zod schema with `mode: 'onChange'`, inline i18n messages via `VALIDATION_KEYS`, submit disabled until the form is valid (`CheckoutForm.tsx:25–61,86–129,425`).
  - **Note**: Left unchecked — no e2e test exists.

- [ ] **A-13**: Invalid payment method is rejected
  - **Precondition**: Authenticated buyer with a valid shipping address.
  - **Steps**:
    1. Attempt to submit with no payment method selected, or call the API directly with an unsupported value (e.g. `crypto`).
  - **Expected Result**: The UI keeps submission blocked with a payment-required error; the direct API call returns 400 "Invalid payment method".
  - **Business Rules**: BR-CHECK-005
  - **API**: `POST /api/v1/orders` → 400
  - **Implementation**: 🟡 API rejects unknown values via `@IsIn(['cod','bank_transfer','card'])` → 400 (`create-order.dto.ts:25`); the message is the class-validator enum text, not "Invalid payment method". ❌ The UI can never be in a "none selected" state — `cod` is always selected by default (`CheckoutForm.tsx:134`).
  - **Note**: Left unchecked — no e2e test exists.

- [ ] **A-14**: Another buyer cannot open someone else's confirmation page
  - **Precondition**: Buyer A has placed an order; buyer B is authenticated.
  - **Steps**:
    1. Log in as buyer B.
    2. Open `/buyer/checkout/confirmation/{buyer A's orderId}`.
  - **Expected Result**: The "Order not found" panel is rendered — HTTP 404, **never** 403, and no hint that another account owns the order; a non-existent UUID renders the identical panel.
  - **Business Rules**: BR-CHECK-013, BR-CHECK-015
  - **API**: Order confirmation lookup → 404 "Order not found" (`CHECK_005`)
  - **Implementation**: 🟡 Buyer mismatch → `NotFoundException('Order not found')` = 404, never 403 (`orders.service.ts:771–781`) ✓; the confirmation page renders the same "Order not found" panel for errors and missing orders (`OrderConfirmation.tsx:159–171`). ⚠ Error code is `RES_001`, not `CHECK_005`; the panel text is hard-coded English (no i18n).
  - **Note**: Left unchecked — code deviation; no e2e test. Scenario DD_CHECK-06 §4 — E2E-CHECK-11.

- [ ] **A-15**: Order placement rate limit returns 429
  - **Precondition**: Authenticated buyer A.
  - **Steps**:
    1. Issue 6 rapid `POST /api/v1/orders` requests.
    2. Wait for the 60-second window to reset, then retry once.
  - **Expected Result**: The 6th request returns 429 Too Many Requests; the request succeeds again after the window (5/min per user).
  - **Business Rules**: None (rate limiting — DD_CHECK-03 §4)
  - **API**: `POST /api/v1/orders` → 429
  - **Implementation**: ❌ No throttler is configured anywhere in the backend; the global `RateLimitInterceptor` only writes `X-RateLimit-*` headers and never throws 429 (`common/interceptors/rate-limit.interceptor.ts:49–113`). No `@Throttle` decorators exist.
  - **Note**: Left unchecked — rate limiting not enforced. Scenario DD_CHECK-06 §4 — E2E-CHECK-12 cannot pass.

- [ ] **A-16**: Checkout load failure shows a generic error without crashing
  - **Precondition**: `GET /api/v1/checkout` fails (server error `SYS_001`).
  - **Steps**:
    1. Force the checkout query to fail (mock/intercept 500).
    2. Navigate to `/buyer/checkout`.
  - **Expected Result**: Toast/inline error "Something went wrong. Please try again." (`SYS_001`); the page renders an "Unable to load checkout" state without a white-screen crash; no internal details leak.
  - **Business Rules**: None (error handling — DD_CHECK-03 §6)
  - **API**: `GET /api/v1/checkout` → 500 `SYS_001`
  - **Implementation**: 🟡 No crash: the page renders an inline panel "Unable to load checkout" / "Your cart may be empty or an error occurred." (`Checkout.tsx:157–171`; query `retry: 1`, `useCheckout.ts:17–24`). ⚠ No toast, no `SYS_001` code surfaced, no retry control.
  - **Note**: Left unchecked — partial implementation; no e2e test.

---

## 3. Boundary Scenarios (B) — Edge Cases & Limits

- [ ] **B-01**: Out-of-stock item at page load flags the row and disables submission
  - **Precondition**: A cart item's quantity exceeds `products.stock_quantity` when `/buyer/checkout` loads.
  - **Steps**:
    1. Open `/buyer/checkout` with the over-stock cart.
    2. Fill in a fully valid shipping address and payment method.
  - **Expected Result**: The affected item row shows the stock warning styling (`outOfStock: true`); `Place Order` stays **disabled** even though the form is valid; other items render normally.
  - **Business Rules**: BR-CHECK-006
  - **API**: `GET /api/v1/checkout`
  - **Implementation**: ❌ `GET /checkout` returns `isAvailable` + `stockQuantity` per item (`checkout.service.ts:120–122`, type at `checkout.types.ts:23`) but **no UI code reads `isAvailable`** — no warning styling, and Place Order is gated only by form validity (`CheckoutForm.tsx:425`). (Also note the response field is `isAvailable`, not the designed `outOfStock`.)
  - **Note**: Left unchecked — UI feature missing.

- [ ] **B-02**: Coupon code at the exact minimum format length is accepted
  - **Precondition**: A valid coupon exists whose code is exactly 8 alphanumeric characters; buyer on `/buyer/checkout`.
  - **Steps**:
    1. Enter the 8-character code (lowercase letters are auto-uppercased).
    2. Click `Apply`.
  - **Expected Result**: The format check passes and `POST /api/v1/checkout/validate-coupon` is called with the uppercased code; a valid coupon applies (N-04).
  - **Business Rules**: BR-COUPON-001, BR-COUPON-007
  - **API**: `POST /api/v1/checkout/validate-coupon`
  - **Implementation**: ❌ There is no format check and no uppercase transform — `handleApplyManual` only `trim()`s the input (`VoucherSelectionModal.tsx:82–89`). An 8-char code happens to work (any length is sent), but the designed `couponCodeSchema` (8–12 alphanumeric, uppercased) does not exist.
  - **Note**: Left unchecked — client-side rule missing (`couponCodeSchema`, DD_CHECK-06 §3.3).

- [ ] **B-03**: Coupon code outside the 8–12 alphanumeric format is rejected client-side
  - **Precondition**: Buyer on `/buyer/checkout`; coupon input empty (Apply disabled, EL-21).
  - **Steps**:
    1. Enter a 7-character or 13-character code (or one containing symbols).
    2. Click `Apply`.
  - **Expected Result**: Inline "Invalid coupon code format" appears **without** any API request; Apply stays disabled while the input is empty.
  - **Business Rules**: None (client-side format validation)
  - **API**: None (no request is issued)
  - **Implementation**: ❌ Apply is disabled only when the input is empty/trim-empty or a request is loading (`VoucherSelectionModal.tsx:253`); any non-empty string is sent to the API. No inline format error exists.
  - **Note**: Left unchecked — client-side rule missing (`couponCodeSchema`, DD_CHECK-06 §3.3).

- [ ] **B-04**: Shipping fields at exact maximum length are accepted
  - **Precondition**: Buyer on `/buyer/checkout`.
  - **Steps**:
    1. Enter values at exactly the schema maximums: recipient name 100 chars, phone 20 chars, address line 200 chars, city / state / postal code / country 100 chars each (address line 2 optional).
    2. Submit the form.
  - **Expected Result**: All values are accepted; the form validates and the order request is issued.
  - **Business Rules**: BR-CHECK-004
  - **API**: `POST /api/v1/orders`
  - **Implementation**: 🟡 Accepted maxima **differ from the PCL table**: recipient name **200** (FE zod `CheckoutForm.tsx:29`, BE `shipping-address.dto.ts:8`; DD_04 says 255); phone — BE max 20 but FE enforces a digits-only `0` + 9-or-11-digit rule and `maxLength=11` (`CheckoutForm.tsx:34–38`); address lines **255** (`CheckoutForm.tsx`, `shipping-address.dto.ts:20,26`); city/state **100**; postal code — FE requires **4–7 digits** (`CheckoutForm.tsx`), BE max 20; country is a fixed `<select>` (FE) / max 100 (BE). At these as-built maxima the form validates and submits.
  - **Note**: Left unchecked — no test; update the PCL/DTO maxima to a single agreed set (code vs DD_04 diverge on recipientName).

- [ ] **B-05**: Shipping field one character over the maximum is rejected
  - **Precondition**: Buyer on `/buyer/checkout`.
  - **Steps**:
    1. Enter recipient name with 101 characters (or phone 21, address line 201, etc.).
    2. Attempt to submit / blur the field.
  - **Expected Result**: Length validation error displayed for the field; the over-length value is not accepted; no order request is issued with the invalid payload.
  - **Business Rules**: BR-CHECK-004
  - **API**: `POST /api/v1/orders` → 400 when called directly with an over-length field (DTO `@MaxLength`)
  - **Implementation**: 🟡 FE zod `max()` enforces over-length for name/address/city/state (`CheckoutForm.tsx:25–61`); postal and phone have **no zod length max** (only input `maxLength` attributes, which users can bypass). BE `@MaxLength` covers all fields (`shipping-address.dto.ts`) → 400 via ValidationPipe.
  - **Note**: Left unchecked — no test; phone/postal zod max gaps.

- [ ] **B-06**: Order notes at exactly 500 characters accepted; 501 rejected
  - **Precondition**: Buyer on `/buyer/checkout` with a valid shipping address and payment method.
  - **Steps**:
    1. Enter exactly 500 characters into the Order Notes textarea; place the order.
    2. Repeat with 501 characters.
  - **Expected Result**: 500 characters is accepted and stored in `orders.notes`; 501 characters is rejected — textarea enforces `MaxLength: 500`, and a direct API call returns 400 "Notes must be 500 characters or less".
  - **Business Rules**: None (DTO validation — DD_CHECK-05 §7.3)
  - **API**: `POST /api/v1/orders`
  - **Implementation**: 🟡 FE textarea enforces `maxLength={500}` (`CheckoutForm.tsx:402`), but **`CreateOrderDto.notes` has no `@MaxLength`** (`create-order.dto.ts:40–43`) — a direct API call with 501+ characters is accepted and stored (`payload.notes || null`, `orders.service.ts`).
  - **Note**: Left unchecked — server-side cap missing.

- [ ] **B-07**: Coupon discount equal to the subtotal is rejected with full rollback
  - **Precondition**: A fixed coupon whose `discount_value` equals (or exceeds) the cart subtotal passes validation-time checks and is submitted with the order.
  - **Steps**:
    1. Apply the fixed coupon so `subtotal − discount = $0.00`.
    2. Click `Place Order`.
  - **Expected Result**: `POST /api/v1/orders` returns 400 "Coupon discount cannot reduce the order total to zero or below."; the entire transaction rolls back — no `orders` / `order_items` rows, no stock decrement, no coupon increment, cart preserved. A discount leaving exactly $0.01 is accepted.
  - **Business Rules**: BR-CHECK-010, BR-CHECK-014, BR-COUPON-007
  - **API**: `POST /api/v1/orders` → 400 `TOTAL_MUST_BE_POSITIVE`
  - **Implementation**: ✅ Guard inside the `$transaction` throws 400 with the exact design message (`orders.service.ts:178–183`), rolling back all writes. ⚠ Error code is the generic `VAL_001`, not `TOTAL_MUST_BE_POSITIVE`. Note this is the **only** place the zero-total rule is enforced (see A-11: validation allows it through).
  - **Note**: Left unchecked — no automated test (unit tests in DD_CHECK-06 §2.2 do not exist for `placeOrder`).

- [ ] **B-08**: No eligible ads renders no panel at all
  - **Precondition**: All `checkout_top` ads are expired, inactive, unapproved, or none exist.
  - **Steps**:
    1. Navigate to `/buyer/checkout`.
    2. Repeat with the ads endpoint mocked to return 500.
  - **Expected Result**: No ad panel, no blank placeholder margins, no error state; checkout loads and functions identically in both cases.
  - **Business Rules**: BR-AD-009
  - **API**: `GET /api/v1/search/ads?placement=checkout_page_banner` (as-built) → 200 `[]` (or error, degraded gracefully)
  - **Implementation**: ✅ `AdBannerSlider` returns `null` when the ad list is empty (`AdBannerSlider.tsx:134`); an endpoint error leaves `data` undefined → same path. Checkout is unaffected either way.
  - **Note**: Left unchecked — no e2e test. Scenario DD_CHECK-06 §4 — E2E-CHECK-05.

- [ ] **B-09**: Ad slider never exceeds 5 slides even with more eligible ads
  - **Precondition**: More than 5 eligible `checkout_top` ads exist (e.g. 6 premium, 3 standard, 2 basic).
  - **Steps**:
    1. Navigate to `/buyer/checkout`.
    2. Count the rendered slides; force a cache MISS (or wait out the 5-minute TTL) and reload.
  - **Expected Result**: Exactly the first 5 ads of the ranked list are rendered, all premium while premium ads remain eligible; no standard/basic ad precedes a premium ad; the rotation start advances on the next MISS (round-robin).
  - **Business Rules**: BR-AD-005, BR-AD-006, BR-AD-007
  - **API**: `GET /api/v1/search/ads?placement=checkout_page_banner` (as-built)
  - **Implementation**: 🟡 Cap of 5 ✓ (`search.service.ts:148`; `ads.service.ts:7,73`). ❌ Ranking is not tier-based (`startsAt desc` / `paymentAmount desc` — no Premium→Standard→Basic ordering); no result cache / no `cache:ads:checkout-top` / no 5-minute TTL; round-robin rotation exists only in the unused `/api/v1/ads/panel` flow (`ads.service.ts` rotation when `sessionId` supplied).
  - **Note**: Left unchecked — tier ranking, cache, and rotation unimplemented. Scenario DD_CHECK-06 §4 — E2E-CHECK-06.

- [ ] **B-10**: Reduced motion preference disables the ad animation and auto-slide
  - **Precondition**: Browser/emulation sets `prefers-reduced-motion: reduce`.
  - **Steps**:
    1. Emulate reduced motion.
    2. Navigate to `/buyer/checkout`.
    3. Wait 7+ seconds; then restore `no-preference` and reload.
  - **Expected Result**: With reduced motion the ad panel appears instantly (no 300 ms slide-down) and the first ad stays static (no auto-advance); restoring `no-preference` brings back the entrance animation and 5-second auto-slide.
  - **Business Rules**: BR-AD-010
  - **API**: `GET /api/v1/search/ads?placement=checkout_page_banner` (as-built)
  - **Implementation**: 🟡 Auto-slide is suppressed under `prefers-reduced-motion: reduce` (`AdBannerSlider.tsx:86,98–102`). ⚠ There is no entrance animation in the code at all, so "no 300 ms slide-down" is trivially satisfied.
  - **Note**: Left unchecked — no e2e test. Scenario DD_CHECK-06 §4 — E2E-CHECK-08.

- [ ] **B-11**: No horizontal overflow at 320px viewport
  - **Precondition**: Viewport is the minimum supported width.
  - **Steps**:
    1. Set viewport to 320x568.
    2. Visit `/buyer/checkout` and `/buyer/checkout/confirmation/:orderId`.
    3. Check `document.documentElement.scrollWidth <= clientWidth`.
  - **Expected Result**: Zero horizontal overflow on both pages; forms, buttons, and totals remain reachable by vertical scrolling only.
  - **Business Rules**: None (Responsive)
  - **API**: None
  - **Implementation**: (unverified) Responsive utility classes are present; no explicit overflow guarantee and no test.
  - **Note**: Left unchecked — no test exists.

---

## 4. Interface Scenarios (I) — API Contracts & Payloads

> API contract tests — **no screenshots by design**. Evidence lines reference the test title and status only.
> As-built auth matrix (v1.1): `GET /api/v1/checkout`, `POST /api/v1/checkout/validate-coupon`, `GET /api/v1/checkout/merchant-promotions/:id`, and `GET /api/v1/checkout/sponsored-ads` require `Authorization: Bearer <accessToken>` + the `buyer` role (`checkout.controller.ts:16–61`). **`POST /api/v1/orders` allows buyer, merchant, admin, and super_admin** (`orders.controller.ts:35`) — deviation from the designed buyer-only rule. `GET /api/v1/search/ads` and `GET /api/v1/ads` are public. **No endpoint enforces a rate limit** (see I-12). Order History / Detail / Tracking endpoints are **not** listed here — they belong to the Order Insights module.

- [ ] **I-01**: `GET /api/v1/checkout` — returns 200 with checkout data
  - **Precondition**: Valid buyer JWT; the buyer's cart has at least one item.
  - **Steps**:
    1. Call `GET /api/v1/checkout` with `Authorization: Bearer <accessToken>`.
  - **Expected Response**: HTTP 200; body `{ data: { items: [ { id, productId, productName, productImage, unitPrice, quantity, lineTotal, stockQuantity } ], subtotal, discountAmount: 0, total, cartId } }`; `subtotal = Σ(quantity × unit_price)` computed from live DB prices; items whose quantity exceeds stock carry `outOfStock: true`.
  - **Business Rules**: BR-CHECK-002, BR-CHECK-006, BR-CHECK-007, BR-CHECK-008, BR-CHECK-010
  - **API**: `GET /api/v1/checkout`
  - **Implementation**: 🟡 Returns 200 with `{ items, subtotal, discountAmount: "0.00", total, cartId }` (`checkout.service.ts:131–137`). ⚠ Items carry **`isAvailable`** (not `outOfStock`) plus extra `merchantId`/`merchantName` fields (`checkout.service.ts:120–122`); `discountAmount` is always the string `"0.00"` (server never computes a discount at load).
  - **Note**: No API test — left unchecked until a real test exists; contract differs from the designed shape.

- [ ] **I-02**: `GET /api/v1/checkout` — returns 400 for an empty cart
  - **Precondition**: Valid buyer JWT; no `carts` row or zero `cart_items` rows.
  - **Steps**:
    1. Call `GET /api/v1/checkout` with an empty-cart buyer token.
  - **Expected Response**: HTTP 400 BAD_REQUEST; error `CHECK_001` "Your cart is empty" / "カートが空です".
  - **Business Rules**: BR-CHECK-002
  - **API**: `GET /api/v1/checkout`
  - **Implementation**: ❌ Returns **200** with `items: []` (`checkout.service.ts:76–138`). No `CHECK_001` code exists in the repo.
  - **Note**: No API test — left unchecked; designed behavior unimplemented (see A-01).

- [ ] **I-03**: `POST /api/v1/checkout/validate-coupon` — returns 200 with the discount calculation
  - **Precondition**: Valid buyer JWT; an active, valid coupon; payload `{ couponCode, cartSubtotal }`.
  - **Steps**:
    1. Call `POST /api/v1/checkout/validate-coupon` with a valid code and subtotal.
  - **Expected Response**: HTTP 200; body `{ data: { discountType, discountValue, discountAmount, newTotal } }`; percentage → `discountAmount = subtotal × (value / 100)`, fixed → `min(discount_value, subtotal)`; `used_count` is **not** incremented by this call.
  - **Business Rules**: BR-COUPON-007, BR-COUPON-008, BR-COUPON-009
  - **API**: `POST /api/v1/checkout/validate-coupon`
  - **Implementation**: ✅ Shape and math match (`checkout.service.ts:182–189`); `usedCount` is not incremented on validate. DTO requires `couponCode` non-empty and `subtotal ≥ 0.01` (`dto/validate-coupon.dto.ts`); no `@MaxLength(50)` on the code (per DD_04).
  - **Note**: No API test — left unchecked until a real test exists.

- [ ] **I-04**: `POST /api/v1/checkout/validate-coupon` — returns 400 for each coupon rejection reason
  - **Precondition**: Valid buyer JWT; one coupon seeded per rejection reason (not found/inactive, expired, below minimum, usage limit reached, already used).
  - **Steps**:
    1. Call the endpoint once per rejection reason with otherwise-valid payloads.
  - **Expected Response**: Each call returns HTTP 400 BAD_REQUEST with the matching message — "Invalid coupon code" (BR-COUPON-001, `CHECK_003`), "Coupon has expired" (BR-COUPON-002), "Minimum order amount not met" (BR-COUPON-003), "Coupon usage limit reached" (BR-COUPON-004), "Coupon already used" (BR-COUPON-005); no discount payload is returned and no state changes.
  - **Business Rules**: BR-COUPON-001, BR-COUPON-002, BR-COUPON-003, BR-COUPON-004, BR-COUPON-005
  - **API**: `POST /api/v1/checkout/validate-coupon`
  - **Implementation**: 🟡 4 of 6 reasons implemented with different statuses/messages: not-found → **404** `'Coupon not found'` (`checkout.service.ts:146`); inactive → 400 `'Coupon is no longer active'` (150); outside window → 400 `'Coupon has expired or is not yet valid'` (155); usage limit → 400 `'Coupon has reached maximum usage'` (159); below minimum → 400 ``Minimum order amount is ${min}`` (163). ❌ "Already used" (BR-COUPON-005) is missing. Codes are the generic `VAL_001`/`RES_001`, never `CHECK_003`.
  - **Note**: No API test — left unchecked; contract deviates.

- [ ] **I-05**: `POST /api/v1/checkout/validate-coupon` — returns 400 when the discount would zero the total
  - **Precondition**: Valid buyer JWT; percentage coupon at 100%, or fixed coupon ≥ subtotal.
  - **Steps**:
    1. Call the endpoint with the zeroing coupon and the current subtotal.
  - **Expected Response**: HTTP 400 BAD_REQUEST; `TOTAL_MUST_BE_POSITIVE` "Coupon discount cannot reduce the order total to zero or below."; no `data` payload.
  - **Business Rules**: BR-CHECK-010, BR-COUPON-007
  - **API**: `POST /api/v1/checkout/validate-coupon`
  - **Implementation**: ❌ Returns **200** with `newTotal: "0.00"` (`checkout.service.ts:182–189`). The guard exists only on `POST /orders` (B-07).
  - **Note**: No API test — left unchecked; designed behavior unimplemented (see A-11).

- [ ] **I-06**: `POST /api/v1/orders` — returns 201 with the created orders array
  - **Precondition**: Valid buyer JWT; non-empty cart in stock; valid `shippingAddress` + `paymentMethod` payload.
  - **Steps**:
    1. Call `POST /api/v1/orders` with a complete valid payload.
  - **Expected Response**: HTTP 201; body `{ data: { orders: [ { orderId, orderNumber, merchantId, status: "placed", subtotal, discountAmount, total, paymentMethod, shippingAddress, createdAt, estimatedDelivery } ] } }`; `orders` is always an array with one element per merchant group (single-merchant cart → exactly one); `orders[0]` is the primary order used for the confirmation redirect; prices are snapshots from re-fetched DB values.
  - **Business Rules**: BR-CHECK-007, BR-CHECK-008, BR-CHECK-009, BR-CHECK-010, BR-CHECK-013, BR-CHECK-014, BR-CHECK-015
  - **API**: `POST /api/v1/orders`
  - **Implementation**: ✅ 201 with all 12 fields per element (`orders.controller.ts:42`, `orders.service.ts:277–296`); one element per merchant group; `estimatedDelivery` = createdAt + 7 days; frontend uses `orders[0]` for the redirect (`Checkout.tsx:108`). Payload also accepts optional `voucherCodes[]` and `notes` (`checkout.types.ts:66–72`). Response body is double-wrapped (`{ data: { data: { orders } } }` via controller + transform interceptor) — the frontend triple-unwraps (`checkout.service.ts:41`).
  - **Note**: No API test — left unchecked until a real test exists.

- [ ] **I-07**: `POST /api/v1/orders` — returns 409 for insufficient stock at submission
  - **Precondition**: Valid buyer JWT; at least one cart item's quantity exceeds `products.stock_quantity` at submission time.
  - **Steps**:
    1. Call `POST /api/v1/orders` with the stale-stock cart.
  - **Expected Response**: HTTP 409 CONFLICT; `CHECK_002` "Some items are no longer available. Please review your cart."; transaction fully rolled back — no `orders`, `order_items`, stock decrement, or coupon increment; `cart_items` preserved.
  - **Business Rules**: BR-CHECK-006, BR-CHECK-011, BR-CHECK-014
  - **API**: `POST /api/v1/orders`
  - **Implementation**: 🟡 Rollback semantics satisfied (pre-transaction rejection, `orders.service.ts:40–48` — nothing is written), but the status is **400** with message `Product "X" is no longer available in the requested quantity` — not 409 / `CHECK_002`.
  - **Note**: No API test — left unchecked; status/code deviate (see A-05).

- [ ] **I-08**: `POST /api/v1/orders` — returns 400 for payload validation failures
  - **Precondition**: Valid buyer JWT.
  - **Steps**:
    1. Call the endpoint once per invalid payload: missing `shippingAddress`, missing required sub-field (e.g. `postalCode`), `paymentMethod: "crypto"`, `notes` with 501 chars, empty cart, invalid coupon code.
  - **Expected Response**: Each call returns HTTP 400 BAD_REQUEST with the field-level message ("Shipping address is required", "Postal code is required", "Invalid payment method", "Notes must be 500 characters or less") or the domain code (`CHECK_001` for empty cart, `CHECK_003` for invalid coupon); no order rows are created.
  - **Business Rules**: BR-CHECK-002, BR-CHECK-004, BR-CHECK-005, BR-COUPON-001
  - **API**: `POST /api/v1/orders`
  - **Implementation**: 🟡 ValidationPipe (`whitelist + forbidNonWhitelisted`, `main.ts:41–50`) → 400 with field messages / `VAL_001`. ⚠ **`notes` with 501+ chars is accepted** (no `@MaxLength`, `create-order.dto.ts:40–43`); empty cart → 400 `'Cart is empty'` (`orders.service.ts:36–38`, no `CHECK_001`); an invalid `couponCode` on the order payload is **silently ignored** (recompute finds no promotion → zero discount, `orders.service.ts:76–99`) rather than rejected.
  - **Note**: No API test — left unchecked; several sub-cases deviate (see B-06).

- [ ] **I-09**: Protected checkout endpoints return 401 without a valid token
  - **Precondition**: No `Authorization` header, or an invalid/expired token.
  - **Steps**:
    1. Call `GET /api/v1/checkout`, `POST /api/v1/checkout/validate-coupon`, or `POST /api/v1/orders` without a token.
  - **Expected Response**: HTTP 401 UNAUTHORIZED; `AUTH_001` "Session expired. Please log in again."; no data returned or mutated.
  - **Business Rules**: BR-CHECK-001
  - **API**: `GET /api/v1/checkout`, `POST /api/v1/checkout/validate-coupon`, `POST /api/v1/orders`
  - **Implementation**: 🟡 Status→code mapping yields `AUTH_001` for 401 (`http-exception.filter.ts:114–115`); the message is the generic `'Unauthorized'`, not "Session expired. Please log in again.".
  - **Note**: No API test — left unchecked until a real test exists.

- [ ] **I-10**: Protected checkout endpoints return 403 for non-buyer roles
  - **Precondition**: Valid JWT with `merchant` or `admin` role.
  - **Steps**:
    1. Call any protected checkout endpoint with a non-buyer token.
  - **Expected Response**: HTTP 403 FORBIDDEN; `CHECK_004` "Shopping features are only available to buyers" (access denied by `RolesGuard`).
  - **Business Rules**: BR-CHECK-003
  - **API**: `GET /api/v1/checkout`, `POST /api/v1/checkout/validate-coupon`, `POST /api/v1/orders`
  - **Implementation**: 🟡/❌ `RolesGuard` returns 403 with code `RES_004` / message `'Insufficient permissions'` (`roles.guard.ts:35`), not `CHECK_004`. **`POST /api/v1/orders` does not restrict to buyer** — merchant/admin/super_admin pass (`orders.controller.ts:35`), so this item fails for the orders endpoint by design of the route itself.
  - **Note**: No API test — left unchecked; contract deviates (see A-04).

- [ ] **I-11**: `GET /api/v1/ads?placement=checkout_top` — public contract and graceful degradation
  - **Precondition**: No auth header required; eligible ads exist (or none / failing service).
  - **Steps**:
    1. Call the endpoint without a token.
    2. Call it with `placement=banner` (invalid).
    3. Call it when the ad query errors or returns nothing.
  - **Expected Response**: (1) HTTP 200 with `{ data: [ { id, imageUrl, title, description, ctaText, ctaUrl, priority, scheduleStart, scheduleEnd } ] }`, ranked premium → standard → basic, capped at 5, served from Redis `cache:ads:checkout-top` (TTL 300 s) on HIT; (2) HTTP 400 "Invalid ad placement"; (3) HTTP 200 with `{ data: [] }` — never a 5xx to the page.
  - **Business Rules**: BR-AD-001, BR-AD-002, BR-AD-003, BR-AD-004, BR-AD-005, BR-AD-006, BR-AD-007, BR-AD-008, BR-AD-009
  - **API**: `GET /api/v1/ads?placement=checkout_top`
  - **Implementation**: 🟡 Public ✓ (no guards, `ads.controller.ts:14–23`); errors → 200 `{ data: [] }` ✓ (`ads.service.ts:138–148`); cap 5 ✓. ❌ Placement is **not validated** (no 400 for invalid values); the placement filter is applied **only when the value ends in `_banner`** — `checkout_top` returns unfiltered ads (`ads.service.ts:28–42`); no Redis read-cache / no `cache:ads:checkout-top` (only an invalidation helper, `ads.service.ts:181–183`); ranking is `paymentAmount desc, createdAt desc`, not tier-based; response fields (`adId`, `priorityAmount`, `startsAt`, `expiresAt`, …) differ from the designed set. **The checkout page does not call this endpoint at all** (see N-09).
  - **Note**: No API test — left unchecked; the as-built checkout surface is `GET /api/v1/search/ads?placement=checkout_page_banner` instead.

- [ ] **I-12**: Rate limits return 429 per endpoint configuration
  - **Precondition**: Authenticated buyer A (ads by IP for the public endpoint).
  - **Steps**:
    1. Exceed `GET /api/v1/checkout` (30/min), `POST /api/v1/checkout/validate-coupon` (10/min), `POST /api/v1/orders` (5/min), and `GET /api/v1/ads?placement=checkout_top` (60/min per IP).
  - **Expected Response**: Each exceeded endpoint returns HTTP 429 TOO_MANY_REQUESTS within its 1-minute window; requests succeed again after the window resets.
  - **Business Rules**: None (rate limiting — DD_CHECK-03 §4)
  - **API**: `GET /api/v1/checkout`, `POST /api/v1/checkout/validate-coupon`, `POST /api/v1/orders`, `GET /api/v1/ads?placement=checkout_top`
  - **Implementation**: ❌ No per-endpoint (or global) 429 enforcement exists. No `ThrottlerModule` / `@Throttle` in the repo; `RateLimitInterceptor` only sets `X-RateLimit-*` headers and never rejects (`rate-limit.interceptor.ts:49–113`; default 100 req/15 min, auth paths 10/15 min).
  - **Note**: No API test — left unchecked; designed limits unimplemented (see A-15).

- [ ] **I-13**: Error responses follow the standard API error envelope
  - **Precondition**: Any error scenario (e.g. empty cart, stock conflict, invalid coupon).
  - **Steps**:
    1. Trigger an error on any checkout endpoint.
    2. Inspect the response body.
  - **Expected Response**: JSON contains `{ statusCode, message, error, timestamp, path }` (DD_CHECK-03 §6); `message` carries the localized text defined in DD_CHECK-05 §6; coupon/stock messages never leak internal details.
  - **Business Rules**: None (error format)
  - **API**: Any checkout endpoint
  - **Implementation**: ✅ Global filter emits `{ statusCode, error, errorCode, message, timestamp, path[, details] }` (`http-exception.filter.ts:94–101`) — a superset of the designed fields. Status→code mapping: 400→`VAL_001`, 401→`AUTH_001`, 403→`RES_004`, 404→`RES_001`, 409→`RES_003`, 429→`RATE_001`, 500→`SYS_001` (`http-exception.filter.ts:110–131`). Messages are plain text (not locale-switched per `Accept-Language`).
  - **Note**: No API test — left unchecked until a real test exists.

---

## Sign-Off

| Item | Status |
|------|--------|
| Test scenarios defined (N, A, B, I) | ☑️ |
| Implementation status annotated vs code (v1.1 code review) | ☑️ |
| E2E tests implemented | ☐ (1 broken test + 5 TODO stubs; pcl-map legacy format) |
| PCL auto-update verified | ☐ |
| Next review date | 2026-11-02 |
