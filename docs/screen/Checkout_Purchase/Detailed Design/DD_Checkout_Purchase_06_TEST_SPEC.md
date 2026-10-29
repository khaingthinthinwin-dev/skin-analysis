# DD_CHECK-06 — Test Specification

> **Doc ID:** SKM-DD-CHECK-06 | **Version:** 1.2 | **Status:** Source-aligned (implementation baseline; known gaps identified)
> **Last Updated:** 2026-10-25

This document defines the testing strategy for the Checkout & Purchase module — Backend Unit Tests, Frontend Component Tests, and End-to-End (E2E) Scenarios. The module is **read-write** (BR-CHECK-014): it creates `orders`, `order_items`, `order_status_history` and `notifications` records, decrements `products.stock_quantity`, increments `promotions.used_count`, and deletes `cart_items` — all within a single Prisma transaction. It also renders the sponsored ad carousel on the Checkout page (`/buyer/checkout`) through the shared search ads route (BR-AD-001~012).

> **Sources of truth:** this test specification is reconciled against `Checkout_Purchase_PCL.md` v1.3, `機能設計書_Checkout_Purchase.md` v1.4, and `画面項目設計書_Checkout_Purchase.md` v1.2. Where this document and the PCL differ, the PCL's as-built evidence — and the source code it cites — wins.

**Scope boundary:** this Detailed Design covers **only** the Checkout page and the Order Confirmation page (`/buyer/checkout/confirmation/:orderId`). Order History, Order Detail, and Order Tracking belong to the Order Insights module and are out of scope for every test below (機能設計書 §1.2 vs 画面項目設計書 v1.2 revision history; DD_CHECK-01 §1).

> **Implementation baseline (2026-10-25):** this document records the tests that **actually exist** in the repository, the behaviours they pin, and — as an explicit **Gap** register — the planned cases that have no automated coverage. The E2E suite is the scenario-level source of truth and is linked 1:1 to `Checkout_Purchase_PCL.md` through `e2e/pcl-map/Checkout_Purchase.json`.

> **Highest-risk area (要件定義書 §3.3):** the order-placement transaction — atomicity of the write groups (BR-CHECK-014), submission-time stock re-validation (BR-CHECK-006/011), and immutable price/discount snapshotting (BR-CHECK-007/015). As built, this area is covered by **E2E only** (N-08, N-22, I-06, I-07, B-07) — there is **no backend unit test** for `OrdersService.placeOrder` (§2.4).

---

## 0. Revision History

| Version | Date | Author | Description of Changes |
| :--- | :--- | :--- | :--- |
| 1.2 | 2026-10-25 | Senior System Engineer | Re-reconciled with PCL v1.3, 機能設計書 v1.4 and 画面項目設計書 v1.2: corrected the validate-coupon status in A-11 (201, not 200), and added the as-built details the E2E suite pins — verbatim coupon handling, exact shipping maxima, the client phone/postal and server notes max-length gaps, the dropped login return path, the ad transition/focus/analytics gaps, the per-merchant notification and cart-retention effects, and the missing `recipientNameLettersOnly` locale key. Extended the gap register with the untested `PROMO_REDEEMED` path, the absent `inventory_transactions` assertion and the untested confirmation i18n/stock-warning behaviour. |
| 1.1 | 2026-10-22 | Senior System Engineer | Reconciled the specification with the tests that exist: replaced the planned suites (none of which were implemented under the assumed names) with the as-built inventory — 1 Jest suite for `getCheckoutPageAds`, 1 Jest case for the search ads route, 4 Vitest suites, and the 62 Playwright scenarios mapped to the PCL; added the test-gap register for the uncovered service methods, the concurrency/oversell risk, and the as-built deviations pinned by the E2E suite. |
| 1.0 | 2026-09-07 | Senior System Engineer | Initial release. |

---

## 1. Overview

### 1.1 Test inventory (as-built)

| Suite | Framework | Location | Tests | Scope |
|-------|-----------|----------|------:|-------|
| Backend unit — checkout ad slot | Jest | `backend/src/modules/buyer/orders/checkout.service.spec.ts` | 13 | `CheckoutService.getCheckoutPageAds` |
| Backend unit — search ads | Jest | `backend/src/modules/catalog/search/search.service.spec.ts` | 2 (1 in scope) | `SearchService.getAdsByPlacement` — the route the checkout page calls |
| Backend unit — orders | Jest | `backend/src/modules/buyer/orders/orders.service.spec.ts` | 12 | **Order Insights** — history/detail/tracking; out of scope here |
| Backend unit — orders controller | Jest | `backend/src/modules/buyer/orders/orders.controller.spec.ts` | 2 | **Order Insights** — out of scope here |
| Backend unit — order list DTO | Jest | `backend/src/modules/buyer/orders/dto/order-list-query.dto.spec.ts` | 1 | **Order Insights** — out of scope here |
| Frontend — checkout ads service | Vitest | `frontend/src/features/buyer/checkout/services/checkout.service.test.ts` | 4 | Envelope unwrapping of `getSponsoredAds` |
| Frontend — shared ad banner | Vitest + Testing Library | `frontend/src/components/shared/AdBannerSlider.test.tsx` | 8 | The `AdBannerSlider` the checkout page mounts |
| Frontend — checkout ad slider | Vitest + Testing Library | `frontend/src/features/buyer/checkout/components/SponsoredAdSlider.test.tsx` | 11 | The checkout-owned slider variant — **not mounted** by any page (§3.3) |
| Frontend — search ad slider | Vitest + Testing Library | `frontend/src/features/search/components/SponsoredAdSlider.test.tsx` | 16 | The search-owned slider variant |
| E2E — Checkout & Purchase | Playwright | `e2e/tests/Checkout_Purchase/checkout.spec.ts` | **62** | N-01…N-22, A-01…A-16, B-01…B-11, I-01…I-13 |

**In-scope totals:** 14 backend unit tests, 39 frontend component tests, 62 E2E scenarios.

### 1.2 Running the suites

| Suite | Command | Working directory |
|-------|---------|-------------------|
| Backend unit | `npm test` (Jest, `rootDir: src`, `testRegex: .*\.spec\.ts$`, `@swc/jest`, setup `src/jest-setup.ts`, `maxWorkers: 1`) | `backend/` |
| Backend unit (watch / coverage) | `npm run test:watch` / `npm run test:cov` | `backend/` |
| Backend integration | `npm run test:e2e` (Jest, `backend/test/jest-e2e.json`, `*.e2e-spec.ts`) | `backend/` |
| Frontend unit | `npm test` (Vitest, jsdom, `globals: true`, setup `./src/test/setup.ts`, `maxWorkers: 4`, 30 s timeout) | `frontend/` |
| Frontend unit (CI / coverage) | `npm run test:coverage` | `frontend/` |
| E2E | `npm test` (`npx playwright test`, `testDir: ./tests`, `globalSetup: ./global-setup.ts`, chromium project, `baseURL` = `FRONTEND_URL`, API = `API_BASE_URL`, 30 s timeout, `fullyParallel: false`) | `e2e/` |
| E2E (UI / debug / report) | `npm run test:ui` / `npm run test:debug` / `npm run test:report` | `e2e/` |
| Capture-name lint | `npm run check:captures` (validates the `<SCENARIO-ID>_<index>_<description>.png` naming) | `e2e/` |
| PCL sync | `npm run update-pcl:Checkout` (rewrites the PCL evidence blocks from the run) | `e2e/` |

### 1.3 Scenario-id convention

Every E2E test title starts with the PCL scenario id, and `e2e/pcl-map/Checkout_Purchase.json` (format `pcl-id-keyed`) maps each of the 62 scenario ids to the E2E test that implements it; `npm run update-pcl:Checkout` rewrites the PCL evidence blocks from the run:

| Prefix | Category | Count | Meaning |
|--------|----------|------:|---------|
| `N-xx` | Normal | 22 | The happy path of a screen or workflow |
| `A-xx` | Abnormal | 16 | An error condition the user can encounter |
| `B-xx` | Boundary | 11 | A limit value or an extreme condition |
| `I-xx` | Interface | 13 | A direct API contract check |

Every test also captures at least one evidence artifact named `<SCENARIO-ID>_<index>_<description>.png` — a UI screenshot (`e2e/utils/screenshot.ts`), an API request/response card (`e2e/utils/api-evidence.ts`), or a database result set (`e2e/utils/db-evidence.ts`). The artifacts are written to `e2e/test-results/Checkout_Purchase/screenshots`, and `npm run check:captures` validates their naming.

### 1.4 E2E execution modes

| Mode | Meaning |
|------|---------|
| **UI** | The backend is mocked with `page.route(...)`; only the frontend runs. Fast, used for rendering and interaction rules. |
| **API** | The real backend and database are used; the browser is not involved. |
| **DB** | The real backend **and** the database are used, with direct SQL assertions and cleanup. |

---

## 2. Backend Unit Tests (Jest)

> **Location note:** there is no `src/modules/checkout/tests/` directory. The checkout and order code lives in `backend/src/modules/buyer/orders/`, and its Jest specs sit beside the source files.

### 2.1 `checkout.service.spec.ts` — `CheckoutService.getCheckoutPageAds`

- **File:** `backend/src/modules/buyer/orders/checkout.service.spec.ts`
- **Mocks:** `prisma.advertisement.findMany` (jest.fn), passed as `prisma as never` to `new CheckoutService(prisma)`.
- **Covers:** the live backend route `GET /api/v1/checkout/sponsored-ads` (`checkout.controller.ts:57`) — **not** the route the checkout page actually calls (§2.2).

| # | Test case | Asserts |
|---|-----------|---------|
| 1 | matches only ads whose fee setting placement is `checkout_page_banner` | `where.feeSetting` = `{ placement: 'checkout_page_banner' }` |
| 2 | filters on the advertisement/fee-setting join rather than a column | `where.feeSettingId` and `where.OR` are `undefined`; `where.isActive` is `true` |
| 3 | returns only approved advertisements | `where.paymentStatus` is `undefined`; `where.approvalStatus` is `'approved'` |
| 4 | returns every matching active ad across all tiers of the placement | 3 ads returned with titles `['Glow Serum','Basic ad','Premium ad']` — **no tier filtering** |
| 5 | does not restrict to a single fee setting id | `feeSettingId` / `OR` remain `undefined` |
| 6 | applies no row limit so every matching ad reaches the banner | `findManyArgs().take` is `undefined` |
| 7 | requires `now` to fall between `startsAt` and `expiresAt` | `startsAt: { lte: Date }`, `expiresAt: { gte: Date }` captured around the call |
| 8 | excludes ads with no schedule | `where.AND` and `where.OR` are `undefined` — no NULL escape hatch |
| 9 | returns an empty list when every matching ad has expired | resolves `{ data: [] }` |
| 10 | orders newest first | `orderBy` = `[{ createdAt: 'desc' }, { paymentAmount: 'desc' }]` |
| 11 | maps database rows to the sponsored ad payload | `placement: 'checkout_page_banner'`, `merchantName` from `shop.name`, `description` from `content` |
| 12 | includes the ad shop name in the sponsored ad payload | `include` = `{ shop: { select: { name: true } } }` |
| 13 | returns an empty list when no ad matches the placement | resolves `{ data: [] }` with no rows |

### 2.2 `search.service.spec.ts` — `SearchService.getAdsByPlacement` (the route the page uses)

- **File:** `backend/src/modules/catalog/search/search.service.spec.ts`
- **Mocks:** `prisma.advertisement.findMany`, `prisma.product.findMany/count`, `redis.get/set`, `prisma.$transaction` (pass-through).

| # | Test case | Asserts |
|---|-----------|---------|
| 1 | filters by stored placement and returns the stored placement | `where` = `{ feeSetting: { placement }, approvalStatus: 'approved', isActive: true }`; `startsAt.lte` / `expiresAt.gte` are `Date` instances; `include.feeSetting` is `true`; the response carries the stored `placement`; **the Redis `get` is never called** — no cache is read on this route (BR-AD-008) |

> **Gap:** the case uses `AdPlacement.SEARCH_PAGE_BANNER`. The **`checkout_page_banner`** placement used by the checkout page is not asserted at the service level; it is covered only by the E2E scenarios N-09, B-08, B-09 and I-11.

### 2.3 Order-module Jest suites (Order Insights scope)

`orders.service.spec.ts` (12 cases), `orders.controller.spec.ts` (2 cases) and `dto/order-list-query.dto.spec.ts` (1 case) cover `getOrderHistory`, `getOrderDetail`, `getOrderTracking`, the order-list query DTO, the merchant/admin/buyer projections, the per-order commission rate, and the raw order-number search. They belong to the **Order Insights** module (DD_OI_06) and are listed here only to fix the module boundary: they must not be counted as Checkout coverage.

### 2.4 Backend unit-test gap register

None of the following service methods has a Jest unit test. They are exercised **only** through the E2E suite (§4).

| Uncovered unit | Risk | Required cases | Currently covered by |
|-----------------|------|----------------|---------------------|
| `CheckoutService.getCheckoutData` | Medium | Empty cart → `items: []`, `subtotal`/`total` `"0.00"`; subtotal from live prices; `isAvailable` computation; nullable `productImage`; `discountAmount` always `"0.00"`; `total === subtotal`; cart upsert | I-01, I-02, A-01 |
| `CheckoutService.validateCoupon` | High | The 6-step chain and its **order** (not-found → inactive → window → per-buyer → usage cap → minimum order); the exact error messages; `discountValue` returned raw; `newTotal` clamped at 0; `used_count` **not** incremented; no zero-total guard | I-03, I-04, I-05, A-06…A-11 |
| `CheckoutService.getMerchantPromotions` | Medium | Active + in-window filter; exhausted promotions dropped; `userAlreadyUsed` marking; `discountType` from the lookup | none (no E2E scenario exercises this route) |
| `OrdersService.placeOrder` | **High** | The whole transaction: 12 steps, rollback semantics, per-merchant grouping, voucher resolution, zero-total guard, `ORDER_PLACED` **and** `PROMO_REDEEMED` notification rows, cart-item clearance with the `carts` header retained, price snapshot immutability, and the **absence of `inventory_transactions` writes** | N-08, N-22, I-06, I-07, B-07 (the `PROMO_REDEEMED` and no-ledger behaviours are not asserted) |
| `OrdersService.computeLegacyCouponDiscount` | High | Returns `0` (does **not** throw) for a missing/inactive/expired promotion — the silent-discount path | none |
| `OrdersService.resolveCommissionRate` | Low | history → settings → default `12.00` fallback chain | orders.service.spec.ts (history projection only) |
| `CreateOrderDto` / `ValidateCouponDto` / `ShippingAddressDto` | Medium | Boundary values for every `@MaxLength`/`@Min`/`@IsIn`; `forbidNonWhitelisted` rejection of unknown properties | I-08, B-04, B-05 |

---

## 3. Frontend Component Tests (Vitest)

> **Location note:** there is no `frontend/src/features/checkout/` directory. The checkout feature lives in `frontend/src/features/buyer/checkout/`, and the page in `frontend/src/pages/buyer/Checkout.tsx`.

### 3.1 `checkout.service.test.ts` — envelope unwrapping

- **File:** `frontend/src/features/buyer/checkout/services/checkout.service.test.ts`
- **Mocks:** `vi.mock('@/lib/api-client')` with `{ default: { get, post } }`.

| # | Test case | Asserts |
|---|-----------|---------|
| 1 | unwraps the payload double-wrapped by TransformInterceptor | `{ data: { data: { data: ads } } }` → `{ data: ads }` |
| 2 | still reads a single-wrapped payload | `{ data: { data: ads } }` → `{ data: ads }` |
| 3 | falls back to an empty list when the ads are not an array | non-array payload → `{ data: [] }` |
| 4 | requests the checkout-scoped endpoint | `apiClient.get` called with `'/checkout/sponsored-ads'` |

> **Note:** case 4 pins the **checkout-scoped** route `GET /api/v1/checkout/sponsored-ads`, which is served by `CheckoutService.getCheckoutPageAds` (§2.1) and consumed by the checkout feature's own `useSponsoredAds` hook (`features/buyer/checkout/hooks/useCheckout.ts:26`, `staleTime` 5 min). The **live** checkout page instead mounts `AdBannerSlider placement="checkout_page_banner"` (`frontend/src/pages/buyer/Checkout.tsx`), which calls `features/search/hooks/useSponsoredAds` → `adService.getByPlacement` → `GET /api/v1/search/ads?placement=checkout_page_banner` with `staleTime: 0`. The checkout-scoped route is therefore **not** on the rendered path (DD_CHECK-05 §2.4).

### 3.2 `AdBannerSlider.test.tsx` — the shared carousel the checkout page mounts

- **File:** `frontend/src/components/shared/AdBannerSlider.test.tsx`
- **Mocks:** `useSponsoredAds`, `useAdProducts`, `react-i18next` (t returns the fallback), `react-router-dom` (`useNavigate`); stubs for `matchMedia` and `IntersectionObserver`.

| # | Test case | Asserts |
|---|-----------|---------|
| 1 | fetches the ads for the requested placement | the hook is called with the passed `placement` |
| 2 | shows only approved, active ads matching its own placement | a mixed payload yields only the matching, approved, currently-scheduled ad |
| 3 | renders the Search & Filter banner design | card classes (`rounded-3xl`, `border-0`, `shadow-xl`, `cursor-pointer`), the gradient `from-[#8d4eb3]`, the shop badge, the Learn-more button and the image classes |
| 4 | hides while ads are pending, failed or empty | pending → `null`; error → `null`; expired-only → `null` (BR-AD-009) |
| 5 | navigates to the advertised product and reports the click | Learn more → `onAdClick('banner-ad')` + `navigate('/buyer/products/GFC-001')` |
| 6 | falls back to the current product when the ad has no SKU | `sku: null` + `fallbackProductId` → `navigate('/buyer/products/current-product')` |
| 7 | reports an impression once the banner becomes visible | `IntersectionObserver` fires twice while intersecting → `onImpression` is called **once** with both ad ids |
| 8 | keeps the carousel controls of the Search & Filter banner | dots with `aria-current`; Next/Previous move the slide |

### 3.3 `SponsoredAdSlider.test.tsx` (checkout variant)

- **File:** `frontend/src/features/buyer/checkout/components/SponsoredAdSlider.test.tsx`

> **Note:** the component under test (`features/buyer/checkout/components/SponsoredAdSlider.tsx`) is **not imported by any page or component** — the Checkout page mounts the shared `AdBannerSlider` instead, and the feature has no barrel export. These 11 cases therefore give passing coverage of a component that never renders; the rendered carousel is covered by §3.2 and by E2E N-09…N-12, B-08…B-10, I-11.

| # | Test case | Asserts |
|---|-----------|---------|
| 1 | renders the first advertisement returned by the API | the first ad is rendered |
| 2 | links the CTA to the product detail page of the ad SKU | the CTA href targets the ad's SKU |
| 3 | falls back to the product list when the ad has no SKU | no SKU → the products list route |
| 4 | renders the announcement and featured promotion badges together | both badges are present |
| 5 | renders the product preview image fully without cropping | the image is not object-cropped |
| 6 | truncates long announcement and merchant names to 20 characters plus an ellipsis | 20-char truncation with `…` |
| 7 | matches the checkout banner styling | the checkout-specific Tailwind classes |
| 8 | advances to the next advertisement and back | next/previous controls move the slide |
| 9 | renders a dot indicator for each advertisement | one dot per ad |
| 10 | exposes every returned ad, not just the first page | all returned ads are reachable |
| 11 | renders nothing when the API returns no advertisements | `null` render |

### 3.4 `SponsoredAdSlider.test.tsx` (search variant)

- **File:** `frontend/src/features/search/components/SponsoredAdSlider.test.tsx` — 16 cases: approved/active filtering, the sponsored-only announcement badge, hidden while pending, hidden on failure, SKU navigation, the currently displayed ad's SKU, the products-page fallback, the fetched-products fallback, the ad target-URL fallback, the mock-ad fallback when no schedule covers today, ad-text precedence over product text, the product-text fallback, the active dot and carousel controls, the 5-second auto-advance, the sample skincare image fallback, and the image-error substitution.

### 3.5 Frontend gap register

| Uncovered behaviour | Risk | Current coverage |
|---------------------|------|------------------|
| `OrderSummary` grouping and totals (`max(subtotal − Σ discounts, 0)`, `Ks` rounding, per-merchant voucher rows) | **High** — this is the money the buyer sees | none (no Vitest file); E2E N-04, N-05 only |
| `CheckoutForm` Zod validation (letters-only name, phone 0-prefix/9-11 digits, postal 4–7 digits, country select, `onChange` mode) | High | E2E A-12, B-04, B-05, N-20 |
| `VoucherSelectionModal` (exhausted/expired filtering, min-order and already-used disabling, manual entry, error extraction) | High | E2E N-04, A-06…A-10 |
| `Checkout.tsx` page orchestration (guest dialog, loading overlay, navigation to the confirmation route, query invalidation) | Medium | E2E N-06, N-13, A-03 |
| Order Confirmation page rendering | Medium | E2E N-07, N-13, A-14 |
| `useCheckout` / `usePlaceOrder` hooks | Medium | E2E N-04, N-06 |
| Stock-warning rendering from the `isAvailable` item flag | **High** — `OrderSummary` never consumes the flag, so an unavailable row looks normal (BR-CHECK-006) | E2E B-01 pins the **absence** of the warning only |
| Order Confirmation localization | Medium — the title, totals labels, address/payment headings, action buttons and "Order not found" are hardcoded English | E2E N-14 pins the deviation only |
| `recipientNameLettersOnly` locale fallback | Low — the Zod key is missing from every bundle, so the name-format error stays English in JA/MY | E2E N-20 covers only the keys that resolve |
| Client phone/postal `.max()` gaps | Medium — the client validates only digit patterns; the backend `@MaxLength(20)` is the effective cap | E2E B-04, B-05 |

---

## 4. End-to-End Scenarios (Playwright)

- **File:** `e2e/tests/Checkout_Purchase/checkout.spec.ts` (62 tests, `test.describe('Buyer Checkout & Purchase')`)
- **Fixtures:** `e2e/fixtures/auth.fixture.ts` — the `buyerPage`, `merchantPage` and `blockCdnFonts` fixtures (its internal `loginViaUI` helper performs the seeded login). Seed credentials: buyer `eem@gmail.com` / `Cosmetics@123`, merchant `smt@gmail.com` / `Cosmetics@123`.
- **Helpers:** `e2e/utils/api-auth.ts` (`loginApi`, `authHeaders`, `adminHeaders`), `e2e/utils/api-evidence.ts`, `e2e/utils/db-evidence.ts` (`executeDb`, `queryDb`), `e2e/utils/screenshot.ts`, `e2e/utils/auth-language.ts`, `e2e/pages/Checkout_Purchase/CheckoutPage`.
- **In-file helpers:** `mockCheckout`, `mockAds`, `buildAd`, `mockPlaceOrder`, `mockPlaceOrderFailure`, `mockOrderDetail`, `openCheckout`, `openVoucherDialog`, `fillShippingForm`, `fillField`, `hasNoHorizontalOverflow`, `adPanel`, `adDot`, `apiError`, `captureApi`; real-backend helpers `pickProduct`, `registerThrowawayBuyer`, `addToCart`, `placeRealOrder`, `withTempPromotion`.
- **Cleanup:** DB-backed scenarios delete the rows they create (`orders`, `notifications`, `promotions`, and restore `products.stock_quantity`).

> **PCL cross-reference:** the PCL notes for N-15/N-18/N-19 cite `E2E-CHECK-13` (i18n) and N-16/N-17 cite `E2E-CHECK-14` (responsive layout). In the as-built suite those are the Playwright scenarios N-14/N-18/N-19 and N-16/N-17 respectively; no test is literally titled `E2E-CHECK-*`.

### 4.1 N — Normal scenarios (22)

| ID | Scenario | Mode | Key assertion / note |
|----|----------|------|----------------------|
| N-01 | renders the order summary, shipping form, payment choices, and actions | UI | Headings, placeholders, the `Sold by {merchant}` / `Qty: n x price` rows, Place Order and Back to Cart are visible; **no** Discount row before a coupon is applied; there is **no** `data-testid="order-summary"` (the only checkout test id is `order-confirmation`) |
| N-02 | starts with empty shipping fields and Japan selected | UI | All shipping fields are empty; the country select is `JP` |
| N-03 | defaults to Cash on Delivery and switches between payment radios | UI | `#cod` is checked by default; `#bank_transfer` and `#card` switch correctly |
| N-04 | applies a valid shop coupon and updates the discount and total | UI | `POST /api/v1/checkout/validate-coupon` is called with `{ couponCode: 'SAVE10', subtotal: 5998 }`; the code is sent **verbatim** (no uppercasing); the endpoint answers **201** (not 200); the applied chip, the discount row and the total update; a success toast is shown |
| N-05 | removes an applied coupon and reverts the total | UI | The applied voucher is shown in the dialog; Remove is **client-side only** (there is no remove endpoint), the discount row disappears, the total reverts and a toast is shown |
| N-06 | submits shipping and payment details and reaches the order confirmation | UI | The `POST /api/v1/orders` body carries the shipping address, `paymentMethod` and the notes; the "Processing your order..." overlay is shown; on 201 the URL becomes `/buyer/checkout/confirmation/{orders[0].orderId}` and sibling orders ride in `?orderIds=` |
| N-07 | renders the placed order details on the confirmation page | UI | The confirmation heading, `#ORD-E2E0001` (the derived `orderNumber`, **not** a truncated UUID), the pending-payment badge, the items, per-voucher discount rows, the totals, the shipping address and the payment method are rendered; **estimated delivery is never rendered** |
| N-08 | Successful order placement applies all write effects atomically | **DB** | 201; `orders` (status `placed`, `payment_status` `pending`), `order_items`, `order_status_history` and the `ORDER_PLACED` notification rows exist; **stock is decremented**, **`promotions.used_count` is incremented**, the converted `cart_items` are deleted while the `carts` header is retained; **no `inventory_transactions` row is written** (the test does not query that table); rows are cleaned up afterwards |
| N-09 | Sponsored ad panel renders eligible Checkout ads | UI | The panel, the SPONSORED badge, the titles, the descriptions, Learn more and the dots/aria-current are rendered |
| N-10 | Ad carousel auto-advances every 5 seconds and loops | UI | The slide advances on the 5-second timer and loops back to the first; the dot reflects the index. **△ Transition deviation:** the live `AdBannerSlider` uses `transition-all duration-700` / `duration-300` dots, **not** the designed 500 ms vertical slide-down |
| N-11 | Ad carousel pauses on hover/focus and resumes on leave/blur | UI | Hover pauses the timer, mouse-move resumes it; focus on a dot pauses, blur resumes (BR-AD-011). **△ Focus gap:** focus capture sits on the card *content* wrapper, so focusing the card itself does not pause the carousel |
| N-12 | Ad CTA click fires the analytics event | UI | **△ As-built deviation:** the click navigates (`role="link"` → `/buyer/products/:sku`) and **no** analytics request is captured — the checkout page passes no `onAdClick`, so no `ad.click` / `placement=checkout_top` event fires (BR-AD-012) |
| N-13 | Order Confirmation action buttons work | UI | Only two buttons exist (no Print Receipt): Continue Shopping → `/buyer/search`; View Order → `/orders/:orderId` |
| N-14 | Language toggle updates checkout and confirmation labels | UI | Checkout labels switch to Japanese; **△ the confirmation keeps hardcoded English** |
| N-15 | Theme toggle works on checkout and confirmation pages | UI | The dark/light class changes on both pages |
| N-16 | Responsive layout on desktop viewport (1280×720) | UI | No horizontal overflow |
| N-17 | Responsive layout on mobile viewport (375×667) | UI | No horizontal overflow |
| N-18 | Language toggle updates all checkout labels (Japanese) | UI | Every checkout label is asserted in Japanese |
| N-19 | Language toggle updates all checkout labels (Myanmar) | UI | Every checkout label is asserted in Myanmar |
| N-20 | Shipping form validation error messages display in the selected language | UI | Empty name, an invalid phone and an invalid postal code produce localized inline errors in JA and then MY. **△ Gap:** the "letters and spaces only" key (`recipientNameLettersOnly`) is missing from every locale and falls back to English |
| N-21 | Toast notifications and modals respect the selected language | UI | The coupon toast and the order-processing overlay are localized |
| N-22 | Order placement creates an ORDER_PLACED in-app notification for the merchant | **DB** | One `ORDER_PLACED` notification per merchant group (`entityType: order`, `entityId` = order id, unread count +1), written by a direct `tx.notification.create` with **hardcoded English** title/message and in-app only; a merchant-scoped voucher additionally writes `PROMO_REDEEMED`. The stored `orders.order_number` differs from the API-derived `ORD-XXXXXXXX` carried by the response; rows are cleaned up |

### 4.2 A — Abnormal scenarios (16)

| ID | Scenario | Mode | Key assertion / note |
|----|----------|------|----------------------|
| A-01 | empty cart renders the empty state without an order summary | UI | **△ Deviation:** the API answers 200 with `items: []`; the summary still renders and Place Order stays disabled |
| A-02 | redirects an unauthenticated visitor to login | UI | The visitor lands on `/login`; no checkout API call is made. **△ Deviation:** the return path is dropped — no `?redirect=/checkout` query is produced |
| A-03 | Guest on a stale checkout view is blocked by the Guest Login dialog | UI | **△ Deviation:** the stale token is redirected to login and the guest dialog is never rendered; a stale *refresh* token makes the api client loop `/login` (the test seeds only a stale access token) |
| A-04 | Non-buyer roles are blocked from checkout | UI | A merchant lands on `/unauthorized`. **△ Deviation:** a direct non-buyer call to the checkout/coupon endpoints returns 403 `RES_004` "Insufficient permissions", not `CHECK_004`; `POST /api/v1/orders` still allows merchant/admin at the class level |
| A-05 | Stock conflict at submission rejects the whole order | UI | **△ Deviation:** the response is 400 `VAL_001`, **not** 409 `CHECK_002`; the buyer sees the generic "Failed to place order. Please try again." toast (not the specific stock message) and stays on checkout; no order rows, no stock/coupon change and the cart is preserved |
| A-06 | Invalid or inactive coupon code is rejected | UI | Nonexistent code → 404 `RES_001`; inactive → 400 `VAL_001`; an alert appears in the voucher dialog, the chip is absent and no discount is applied |
| A-07 | Expired coupon is rejected | UI | 400 `VAL_001`; the server message covers both expired and not-yet-valid windows; the alert shows it |
| A-08 | Coupon below the minimum order amount is rejected | UI | 400 `VAL_001` "Minimum order amount is {amount}"; the check uses the `subtotal` sent in the request body |
| A-09 | Coupon usage limit reached is rejected | UI | 400 `VAL_001` "Coupon has reached maximum usage"; only checked when `max_uses` is set |
| A-10 | Coupon already used by this buyer is rejected | UI | 400 `VAL_001` "You have already used this coupon" (the per-buyer rule **is** implemented in `validateCoupon`) |
| A-11 | Coupon that would zero the order total is rejected at validation | UI | **△ Deviation:** the endpoint does not implement the zero-total guard — it answers **201** with `newTotal: "0.00"`; the discount row and a `0Ks` total are shown (the placement guard in B-07 is the only one that rejects; `TOTAL_MUST_BE_POSITIVE` is not a defined code) |
| A-12 | Missing required shipping field blocks submission | UI | "Postal code is required" is shown inline, Place Order is disabled, pressing Enter does not submit, and **no API request is issued** |
| A-13 | Invalid payment method is rejected | API | `POST /api/v1/orders` with `paymentMethod: 'crypto'` → 400 with the standard error envelope from `@IsIn([...])` (a generic field message, not "Invalid payment method") |
| A-14 | Another buyer cannot open someone else's confirmation page | **DB** | The order detail read by a different buyer → 404 "Order not found" — never 403, so no order existence is leaked |
| A-15 | Order placement rate limit returns 429 | API | **△ Deviation:** the per-endpoint limiter (5 orders/minute) is not implemented — only the global limiter (100 requests / 15 minutes) applies, so six rapid placements all succeed |
| A-16 | shows a recoverable checkout load error when the checkout API fails | UI | A 500 renders "Unable to load checkout" without crashing the page |

### 4.3 B — Boundary scenarios (11)

| ID | Scenario | Mode | Key assertion / note |
|----|----------|------|----------------------|
| B-01 | flags unavailable cart items and keeps order submission disabled | UI | **△ Deviation:** the API returns `isAvailable: false`, but `OrderSummary` never consumes it — an unavailable row renders **no** warning and Place Order stays enabled when the form is valid |
| B-02 | accepts a valid coupon code at the exact 8-character minimum length | UI | `SAVE1000` is accepted and applied; there is no client-side 8–12 alphanumeric rule — the code is sent verbatim and the server accepts it |
| B-03 | rejects coupon codes outside the 8–12 alphanumeric format without an API request | UI | **△ Deviation:** the code is sent to the server anyway — there is no client-side format rule (the test pins that a 5-character code produces a request) |
| B-04 | accepts shipping fields at their exact maximum length | UI | Filled to the limit — recipient name 200, phone 11 (`0` + 10 digits), address lines 255, city/state/country 100, postal 7 — and the order is submitted successfully |
| B-05 | rejects a shipping field one character over the maximum | UI | A 201-character recipient name shows a length error and disables Place Order. **△ Gap:** the client has no `.max(20)` on phone or postal code, so the backend `@MaxLength(20)` is the effective cap |
| B-06 | order notes accept 500 characters and reject the 501st | UI | The textarea enforces `maxlength=500`; the 501st keystroke is ignored. **△ Gap:** `CreateOrderDto.notes` has no `@MaxLength`, so a direct API call with 501 characters is accepted (see I-08) |
| B-07 | Coupon discount equal to the subtotal is rejected with full rollback | **DB** | A 100 % coupon → 400 `VAL_001` via the per-merchant `groupTotalAmount <= 0` guard; **no** order/order-item rows, no stock decrement, no coupon increment and the cart is preserved; a discount leaving exactly $0.01 is accepted |
| B-08 | No eligible ads renders no panel at all | UI | No ad panel and no Learn-more CTA are rendered |
| B-09 | Ad slider never exceeds 5 slides even with more eligible ads | API + UI | The real ads endpoint returns at most five (`take: 5`) and the dot count matches; **△ Deviation:** no premium→standard→basic ranking, Redis cache or round-robin rotation is applied |
| B-10 | Reduced motion preference disables the ad animation and auto-slide | UI | With `prefers-reduced-motion: reduce` the first slide stays static and no auto-advance occurs |
| B-11 | No horizontal overflow at 320px viewport | UI | The page has no horizontal scrollbar |

### 4.4 I — Interface scenarios (13)

| ID | Scenario | Mode | Key assertion / note |
|----|----------|------|----------------------|
| I-01 | `GET /api/v1/checkout` — returns 200 with checkout data | API | 200 with `items`, `subtotal`, `discountAmount: "0.00"`, `total` and `cartId`; each item carries `isAvailable` plus `merchantId`/`merchantName`; `subtotal = Σ lineTotal` |
| I-02 | `GET /api/v1/checkout` — returns 400 for an empty cart | API | **△ Deviation:** the response is 200 with an empty item list |
| I-03 | `POST /api/v1/checkout/validate-coupon` — returns 200 with the discount calculation | API | **△ Deviation:** the status is 201, not 200; the field is `subtotal` (not `cartSubtotal`) and `< 0.01` is rejected; `WELCOME10` yields the expected `discountAmount` and `newTotal`; `used_count` is **not** incremented |
| I-04 | `POST /api/v1/checkout/validate-coupon` — returns an error for each coupon rejection reason | API | **△ Deviations in status/code:** not found → 404 `RES_001`; inactive / expired-or-not-yet-valid / exhausted / below-minimum → 400 `VAL_001`. The "already used by buyer" rule is covered separately by A-10 |
| I-05 | `POST /api/v1/checkout/validate-coupon` — returns 400 when the discount would zero the total | API | **△ Deviation:** a 100 % coupon is accepted — 201 with `newTotal: "0.00"`; the guard exists only at order placement (B-07) |
| I-06 | `POST /api/v1/orders` — returns 201 with the created orders array | API | 201 with the `orders` array — one element per merchant group, `status: 'placed'`, `paymentMethod`, the shipping address, `createdAt` and `estimatedDelivery` (createdAt + 7 days); `orderNumber` is the derived `ORD-{first 8 of id}` and `payment_status` is `pending` |
| I-07 | `POST /api/v1/orders` — rejects insufficient stock at submission | API | **△ Deviation:** the stock conflict is reported as 400 `VAL_001` instead of the designed 409 `CHECK_002`; no order/order-item rows, no stock decrement, no coupon increment and the cart is preserved |
| I-08 | `POST /api/v1/orders` — returns 400 for payload validation failures | API | Missing address fields, an invalid `paymentMethod`, unknown properties and an empty cart are each rejected with the validation envelope; **△** `notes` with 501 characters is accepted (no `@MaxLength`) and no client coupon-format rule exists |
| I-09 | Protected checkout endpoints return 401 without a valid token | API | 401 `AUTH_001` on the checkout, validate-coupon and order-placement routes |
| I-10 | Protected checkout endpoints return 403 for non-buyer roles | API | 403 `RES_004` "Insufficient permissions" for a merchant or admin token on `GET /checkout` and `POST /checkout/validate-coupon`; **△** `POST /orders` permits merchant/admin at the class level |
| I-11 | Ad contract and graceful degradation | API + UI | `GET /api/v1/search/ads?placement=checkout_page_banner` → 200 `{ data: [...] }` with `id`, `placement`, `title`, `announcementMessage`, `description`, `imageUrl`, `sku` — **no `merchantName`**, at most five, no tier ranking/cache/rotation; an error or empty result renders no panel. **△** the designed `GET /api/v1/ads?placement=checkout_top` does not exist |
| I-12 | Rate limits return 429 per endpoint configuration | API | **△ Deviation:** the per-endpoint limits (30/10/5/60 per minute) are not implemented — no checkout endpoint answers 429; only the global limiter (100 requests / 15 minutes) applies, and the `X-RateLimit-Limit` / `-Remaining` / `-Policy` headers report it |
| I-13 | Error responses follow the standard API error envelope | API | The body carries `statusCode`, `error`, `errorCode`, `message`, `timestamp` and `path` |

---

## 5. Test Coverage Requirements

| Category | Required | As-built | Note |
|----------|----------|:--------:|------|
| Backend unit — checkout & order placement | 90 % | **Not met** — only the ad-slot method has a unit suite | §2.4 |
| Backend unit — search ads route | — | 1 case (placement filter + no-cache) | `checkout_page_banner` is not asserted at the service level |
| Frontend component | 85 % | **Partially met** — 4 suites: 2 cover the rendered ad banner, 1 covers an unmounted component (§3.3), 1 covers the checkout-scoped ads service; none covers `OrderSummary`, `CheckoutForm` or the voucher modal | §3.5 |
| E2E critical paths | 100 % | **Met** — all 62 PCL-mapped scenarios exist and are linked through `e2e/pcl-map/Checkout_Purchase.json` | — |
| E2E real-backend coverage | — | **20 of 62** scenarios hit the live backend — 4 DB (N-08, N-22, A-14, B-07), 14 API (A-13, A-15, I-01…I-10, I-12, I-13) and 2 API+UI (B-09, I-11); the remaining 42 run against mocked responses | — |
| Requirement traceability (機能設計書 v1.4) | 100 % of BR-CHECK / BR-COUPON / BR-AD | **Met at scenario level** — every rule is referenced by at least one N/A/B/I row (§4); the enforcement-layer gap (unit vs E2E) is tracked in §2.4 and §3.5 | §4 |

---

## 6. Consolidated Test-Gap and Risk Register

| # | Gap | Impact | Suggested owner |
|---|-----|--------|-----------------|
| 1 | **No unit test for `OrdersService.placeOrder`** — the highest-risk operation in the module (atomicity, rollback, grouping, voucher resolution, snapshot immutability) | A regression in the transaction would only be caught by the e2e suite | Backend |
| 2 | **No unit test for `CheckoutService.validateCoupon`** — the chain's check *order* is not pinned; a reordering silently changes which error a buyer sees | Coupon-rule regressions | Backend |
| 3 | **No unit test for `CheckoutService.getCheckoutData` or `getMerchantPromotions`** | Checkout load and voucher-list regressions | Backend |
| 4 | **No component test for `OrderSummary`** — the per-merchant grouping and the `max(subtotal − Σ discounts, 0)` total are only exercised through the UI e2e | Wrong totals shown to the buyer | Frontend |
| 5 | **No component test for `CheckoutForm`'s Zod rules** or for `VoucherSelectionModal` | Client-side validation regressions | Frontend |
| 6 | **No concurrency test** — the planned `SELECT … FOR UPDATE` lock and the guarded `UPDATE … WHERE stock_quantity >= :qty` are not implemented (DD_CHECK-05 §3.6), so the availability check and the decrement are unguarded and **stock can go negative** under concurrent checkouts | Oversell | Backend + DBA |
| 7 | **The silent-discount path is untested** — in the per-merchant `voucherCodes` path (`orders.service.ts:66-109`) an unknown / inactive / out-of-window promotion is skipped without an error, so the order is created at full price | The buyer believes a voucher was applied but pays the full amount | Backend |
| 8 | **The legacy `couponCode` path is untested** — `computeLegacyCouponDiscount` returns `0` for an invalid code instead of throwing (`orders.service.ts:365-375`), while `used_count` is incremented anyway (`orders.service.ts:150-152`) | The buyer pays full price **and** the promotion's usage counter is consumed | Backend |
| 9 | **No test asserts the `checkout_page_banner` placement at the service level** | Placement-filter regressions | Backend |
| 10 | **The rate-limit expectations are pinned as "not implemented"** (A-15, I-12) — no test protects the intended 30/10/5/60 limits | The limits can never be enforced without a test change | Backend |
| 11 | **The zero-total validation guard is pinned as "not implemented"** (A-11, I-05) — the intended rejection at validation time is not protected | Same as #7 in the preview path | Backend + QA |
| 12 | **The empty-cart rejection is pinned as "not implemented"** (I-02) | The checkout-load route never rejects an empty cart | Backend + QA |
| 13 | **The guest dialog is unreachable** (A-03) and the confirmation page keeps hardcoded English (N-14) | Untested dead paths | Frontend |
| 14 | **No test covers the `GET /api/v1/checkout/merchant-promotions/:merchantId` route** | The voucher modal's data source is unpinned | E2E |
| 15 | **11 Vitest cases cover an unmounted component** — `features/buyer/checkout/components/SponsoredAdSlider.tsx` is imported by nothing; the Checkout page renders the shared `AdBannerSlider` | False confidence: the passing suite does not protect the rendered carousel | Frontend |
| 16 | **The `PROMO_REDEEMED` notification path is untested** — a merchant-scoped voucher writes an extra notification (`orders.service.ts:242-266`) that N-08/N-22 do not query | Unexpected/duplicate merchant notifications, and the "one notification per merchant" claim holds only without a voucher | Backend |
| 17 | **No test asserts that checkout writes no `inventory_transactions` rows** — N-08 reads `orders`, `order_items`, `order_status_history`, `notifications` and `products`, but not the ledger table | The FDS v1.4 contract (checkout writes no ledger rows) is unpinned | Backend + DBA |
| 18 | **The i18n gaps are pinned as deviations, not protected** — `recipientNameLettersOnly` is missing from every bundle (N-20) and the confirmation page keeps hardcoded English (N-14) | A future locale addition or confirmation refactor is unverified | Frontend |
| 19 | **No test covers the stock-warning UI** — B-01 pins that no warning is rendered; the intended `isAvailable` consumption (BR-CHECK-006) is unprotected | Unavailable items can be submitted from an apparently valid form | Frontend |
| 20 | **No test covers the client/server max-length gaps** — client phone/postal have no `.max(20)` and `CreateOrderDto.notes` has no `@MaxLength` (B-04, B-05, B-06, I-08 pin the as-built behaviour) | Backend re-validation is the only cap; a direct API call can exceed the UI limit | Backend + Frontend |

---

## 7. Cross-References

| Related Document | Purpose |
|------------------|---------|
| [DD_CHECK-05](./DD_Checkout_Purchase_05_BUSINESS_LOGIC.md) | Business logic verified by the tests — order-placement transaction (§3.2), coupon validation chain (§3.1), voucher resolution (§3.3), ad selection (§3.4), calculation rules (§4) |
| [DD_CHECK-04](./DD_Checkout_Purchase_04_DTOS_AND_TYPES.md) | DTO definitions, validation messages and response contracts asserted in the controller/interface scenarios |
| [DD_CHECK-03](./DD_Checkout_Purchase_03_API_ENDPOINTS.md) | Endpoints, guards, wire format, error envelope and rate-limit design tested by the I-xx scenarios |
| [DD_CHECK-02](./DD_Checkout_Purchase_02_FRONTEND_Page.md) | Frontend components and screens covered by the component tests and the N-xx scenarios |
| [Checkout_Purchase_PCL.md](../Checkout_Purchase_PCL.md) | The scenario checklist every E2E test title maps to (N/A/B/I ids) |
| [機能設計書_Checkout_Purchase](../機能設計書_Checkout_Purchase.md) | Functional requirements verified by the tests (business rules BR-CHECK-001~015, BR-COUPON-001~009, BR-AD-001~012) |
| [画面項目設計書_Checkout_Purchase](../画面項目設計書_Checkout_Purchase.md) | Screen items specification — item ids, field constraints and i18n expectations asserted by the UI scenarios |
| [要件定義書_REQUIREMENT_SPEC](../../../core-work/要件定義書_REQUIREMENT_SPEC.md) | §3.3 buyer checkout requirements verified by the E2E suite |
| [データベース設計書_DATABASE_SPEC](../../../core-work/データベース設計書_DATABASE_SPEC.md) | `orders` / `order_items` / `order_status_history` / `products` / `promotions` / `cart_items` / `advertisements` fixture and assertion schemas |
| [DD_OI_06](../../Order_Insights/Detailed%20Design/DD_Order_Insights_06_TEST_SPEC.md) | Order Insights test specification — owns the order history/detail/tracking suites that live beside the checkout specs |
