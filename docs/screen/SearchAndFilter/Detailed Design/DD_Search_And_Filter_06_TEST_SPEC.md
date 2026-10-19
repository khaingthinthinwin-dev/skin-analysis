# DD_SEARCH_06 — Test Specification

> **Doc ID:** SKM-DD-SEARCH-06 | **Version:** 1.3 | **Status:** Released  
> **Last Updated:** 2026-10-15

> **Codebase alignment:** This test specification is synchronized with the PCL scenario IDs
> (`N-01..N-51`, `A-01..A-19`, `B-01..B-19`, `I-01..I-15`) defined in
> [SearchAndFilter_Guest_PCL.md](../SearchAndFilter_Guest_PCL.md) and
> [SearchAndFilter_Buyer_PCL.md](../SearchAndFilter_Buyer_PCL.md), and with the
> implemented code paths as of 2026-10-15.

---

## 1. Overview

This document defines the testing strategy for the Search & Filter Module, covering Backend Unit Tests, Frontend Component Tests, and End-to-End (E2E) scenarios. Every E2E scenario is keyed to a PCL scenario ID so that DD coverage and the PCL checklist stay in sync.

---

## 2. Backend Unit Tests

**Location:** `backend/src/modules/catalog/search/tests/`  
**Mock dependencies:** `PrismaService`, `RedisService`.

### 2.1 `search.service.spec.ts`

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **searchProducts** | Empty query (defaults) | Returns first page of products sorted by `createdAt desc`, `meta` computed (`totalPages = ceil(total / limit)`) |
| **searchProducts** | Keyword search (`q=cleanser`) | Returns products matching keyword in name/shortDescription/tags/ingredients (case-insensitive `contains`) |
| **searchProducts** | Category filter (`categoryId=uuid`) | Returns products in the category plus all recursive descendant categories (`getCategoryDescendants`) |
| **searchProducts** | Skin type filter (`skinTypes=oily,combination`) | Returns products where `skinTypes` contains ALL selected values (`hasEvery`) |
| **searchProducts** | Ingredient filter (`ingredients=water,glycerin`) | Returns products where `ingredients` contains ANY selected value (`hasSome`) |
| **searchProducts** | Tags filter (`tags=vegan`) | Returns products where `tags` contains ANY selected value (`hasSome`) |
| **searchProducts** | Price range (`minPrice=10, maxPrice=50`) | Returns products where `10 <= price <= 50` |
| **searchProducts** | Rating filter (`rating=4`) | Returns products where `avgRating >= 4` |
| **searchProducts** | Combined filters | Returns intersection of all filter results |
| **searchProducts** | Sort by price ascending | Returns products ordered by `price ASC` (via `buildOrderBy` allowlist) |
| **searchProducts** | Sort by rating descending | Returns products ordered by `avgRating DESC` |
| **searchProducts** | Pagination (`page=2, limit=10`) | Correct `skip`/`take`, `meta.page = 2`, `meta.totalPages` computed |
| **searchProducts** | `limit` omitted | Falls back to `20` in `calculatePagination`/`computeMeta`; screen always sends `12` |
| **searchProducts** | Out-of-stock products | Included with `isInStock: false` (BR-SEARCH-014) |
| **searchProducts** | Inactive products excluded | `where.isActive = true`; no `is_active = false` rows (BR-SEARCH-012) |
| **searchProducts** | Unapproved merchant excluded | `where.merchant.licenseStatus = 'approved'`; no unapproved merchants (BR-SEARCH-013) |
| **searchProducts** | Redis HIT | Returns cached JSON without DB query |
| **searchProducts** | Redis MISS → seed | Queries DB, seeds `cache:products:list:v2:{hash}` with TTL 120s |
| **searchProducts** | Cache key | Key is `cache:products:list:v2:{md5}` over key-sorted query |
| **searchProducts** | Decimal serialization | `price`, `compareAtPrice`, `avgRating` returned as strings; `shop_name` from `merchant.shopName` (BR-SEARCH-018) |
| **searchProducts** | Validation: `q` > 255 chars | `400 BadRequestException` |
| **searchProducts** | Validation: invalid `skinTypes` enum | `400 BadRequestException` |
| **searchProducts** | Validation: `limit` > 100 | `400 BadRequestException` |
| **searchProducts** | Validation: `page` < 1 | `400 BadRequestException` |
| **searchProducts** | Validation: `rating` outside 1–5 | `400 BadRequestException` |
| **searchProducts** | Validation: invalid UUID in `categoryId` | `400 BadRequestException` |
| **getCategoryTree** | Normal fetch | Returns nested tree built from flat `parentId` references, ordered by `sortOrder ASC` |
| **getCategoryTree** | Redis HIT | Returns cached tree without DB query |
| **getCategoryTree** | Redis MISS → seed | Queries DB, seeds `cache:categories` with TTL 1800s |
| **getCategoryTree** | Empty categories | Returns `{ data: [] }` |
| **getProductBySlug** | Valid slug, active product | Returns product detail with category + shop info |
| **getProductBySlug** | Invalid slug | Throws `NotFoundException` (404) |
| **getProductBySlug** | Inactive product | Throws `NotFoundException` (404) |
| **getProductBySlug** | Unapproved merchant product | Throws `NotFoundException` (404) (BR-SEARCH-013) |
| **findBySlug** | Delegation | Delegates to `getProductBySlug` and returns the same result |
| **getAdsByPlacement** | Valid placement, active ads | Returns approved, in-schedule, active ads for an approved shop, ordered by `startsAt desc`, `take: 5` |
| **getAdsByPlacement** | Placement match | Only ads whose `feeSetting.placement` equals the requested placement are returned |
| **getAdsByPlacement** | Schedule window | Excludes ads where `now < startsAt` or `now > expiresAt` |
| **getAdsByPlacement** | Unapproved shop excluded | Ads whose `shop.isApproved = false` are excluded (BR-SEARCH-013) |
| **getAdsByPlacement** | More than 5 eligible ads | Returns exactly the first 5 by `startsAt desc` |
| **getAdsByPlacement** | Serialization | `description = ad.content`, `tier = 'standard'`, includes `announcementMessage` and `sku` |
| **getAdsByPlacement** | No active ads | Returns `{ data: [] }` |
| **getAdsByPlacement** | Not cached | Every call hits the DB; no Redis read/write occurs |
| **getAdsByPlacement** | Invalid placement | `400 BadRequestException` (validated by `AdsQueryDto`) |
| **invalidateProductCache** | Product mutation | Deletes all `cache:products:list:*` keys |
| **invalidateCategoryCache** | Category mutation | Deletes the `cache:categories` key |

> **Note:** there is no `invalidateAdCache` method and no `cache:ads:*` key — advertisements are not cached.

### 2.2 `search.controller.spec.ts`

**Mock dependencies:** `SearchService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **GET /search/products** | Valid query params | Calls `service.searchProducts`, returns 200 with `{ data, meta }` |
| **GET /search/products** | No params (defaults) | Calls service with defaults, returns 200 |
| **GET /search/products** | Invalid params | Returns 400 Bad Request |
| **GET /search/products** | Server error | Returns 500 Internal Server Error |
| **GET /search/categories** | Normal request | Calls `service.getCategoryTree`, returns 200 with `{ data: tree }` |
| **GET /search/products/:slug** | Valid slug | Calls `service.getProductBySlug`, returns 200 with product detail |
| **GET /search/products/:slug** | Invalid slug format | Returns 400 Bad Request |
| **GET /search/products/:slug** | Unknown slug | Returns 404 Not Found |
| **GET /search/ads** | Valid placement | Calls `service.getAdsByPlacement`, returns 200 with `{ data: ads }` |
| **GET /search/ads** | Invalid/missing placement | Returns 400 Bad Request |
| **GET /search/ads** | No active ads | Returns 200 with `{ data: [] }` |
| **All endpoints** | Public access | Served without authentication (`@Public()`) |
| **All endpoints** | Rate-limit headers | Response includes `X-RateLimit-Limit` / `Remaining` / `Reset` / `Policy` |

---

## 3. Frontend Component Tests

Using Vitest + React Testing Library.

### 3.1 `SearchBar.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Initial render | Displays search input with placeholder and Search button |
| Type keyword | Updates input value |
| 300ms debounce | Does NOT fire a query during typing; fires after 300ms idle |
| Debounce timer reset | Each keystroke resets the 300ms timer |
| Enter key | Fires query immediately, bypasses debounce |
| Search button click | Fires query immediately, bypasses debounce |
| Clear button | Visible when `q` is non-empty; click clears `q` and resets input |
| Keyword > 255 chars | Blocked/validation handled (VAL-SEARCH-001) |
| URL sync | Input value reflects the `q` URL param on load |

### 3.2 `FilterPanel.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Initial render | Category, skin type, ingredients, price, and rating controls render |
| Category select | Sets `categoryId`, resets `page` to 1 (applies immediately) |
| Category deselect | Clears `categoryId`, resets `page` to 1 |
| Skin type multi-select | Toggles value in `skinTypes`, resets `page` to 1 |
| Ingredient select | Toggles value in `ingredients`, resets `page` to 1 |
| Min/Max price input | Commits on blur/Enter, sets `minPrice`/`maxPrice` |
| Price validation | Blocks invalid ranges (VAL-SEARCH-005/006/007) |
| Rating selector (1–5) | Sets `rating`, resets `page` to 1 |
| No Apply button | Filters apply immediately; there is no "Apply Filters" action |
| Clear All | Clears all filter params, keeps `q`, resets `page` to 1 |
| Mobile drawer open | Opens filter drawer |
| Mobile drawer "Show N Products" | Closes the drawer showing the active result count |

### 3.3 `SortSelect.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Initial render | Default selection "Newest" (`createdAt:desc`) |
| Select "Price: Low to High" | Sets `sort=price&order=asc`, resets `page` to 1 |
| Select "Price: High to Low" | Sets `sort=price&order=desc`, resets `page` to 1 |
| Select "Highest Rated" | Sets `sort=rating&order=desc`, resets `page` to 1 |
| Select "Newest" | Sets `sort=createdAt&order=desc`, resets `page` to 1 |
| URL sync | Selection reflects `sort`/`order` URL params on load |

### 3.4 `ProductCard.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Basic render | Shows image, name, shop name, formatted price |
| SALE badge | Shown only when `compareAtPrice` is present |
| Skin-type badges | Up to 3 badges in grid view |
| Out-of-stock | Add-to-Cart action hidden when `isInStock = false` |
| Keyboard activation | Card is activatable via keyboard with `role="link"` |
| Image fallback | Broken/missing image falls back to a placeholder |

### 3.5 `ViewToggle.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Default view (Grid) | Grid segment active, `aria-pressed="true"` |
| Switch to List | List segment active, `aria-pressed="true"` |
| Persistence | Selection saved to `localStorage` key `search.viewMode` |
| Fallback on invalid | Absent/invalid stored value falls back to Grid |
| URL unchanged | Switching views does NOT modify URL query params |
| No refetch | Switching views does NOT trigger an API call |

### 3.6 `FilterChips.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| No filters applied | Chips row returns `null` (hidden) |
| Single filter | One chip with a human-readable label |
| Multiple filters | One chip per active value (q / category / skinTypes / ingredients / tags / minPrice / maxPrice / rating) |
| Category chip | Shows the resolved category name |
| Chip close (×) | Removes that value, resets `page` to 1, refetches |
| Clear All | Removes all filters, keeps `q`, resets `page` to 1, refetches |

### 3.7 Pagination (inline in `Products.tsx`)

| Scenario | Expected Outcome |
|----------|------------------|
| Single page | Hidden when `totalPages <= 1` |
| Multiple pages | Shows Prev/Next + windowed page numbers with ellipsis |
| First page | Previous disabled |
| Last page | Next disabled |
| Page click | Updates `page`, refetches (keeping previous data) |

### 3.8 `SponsoredAdSlider.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Eligible ads exist | Renders panel below the search bar, above the filter chips/results row |
| Slide content | Each slide shows image/banner, title, description, CTA together |
| Sponsored label | "Sponsored" badge shown on each slide |
| Description absent | Hidden gracefully when null/empty without breaking layout |
| Client-side filter | Keeps only `search_page_banner` + `approved` + in-window ads |
| Fallback | Renders `FALLBACK_ADS` when no eligible ads and not pending/errored |
| Desktop/tablet layout (≥ 768px) | Horizontal slide (image left, text right, inline CTA) |
| Mobile layout (< 768px) | Stacked slide (full-width image, title, description, full-width CTA) |
| Auto-slide | Advances every `AUTO_SLIDE_MS = 5000` |
| Auto-slide pause | Pauses on hover/keyboard focus inside the panel; resumes on leave/blur |
| `prefers-reduced-motion` | Disables animations; interval unchanged |
| Accessibility | `role="region"` with i18n label; slide changes announced via `aria-live="polite"` |
| Click-through | Navigates to `/buyer/products/{sku}`, else `fallbackProductId`, else `target_url`/`linkUrl`, else `/buyer/products` |
| No ads | Panel returns `null` (hidden) |
| Ad fetch error | Graceful degradation; product results unaffected |
| Independence | Ad fetch does NOT block/defer product results |

### 3.9 `Products.test.tsx` (Integration)

| Scenario | Expected Outcome |
|----------|------------------|
| Page load (no params) | Shows default catalog sorted by newest, `limit=12` |
| URL with params | Parses params, applies filters, shows results |
| Back button | Restores previous search state from URL |
| Guest shopping action | Shows guest dialog (no auto-close) → `navigate('/login')` (no redirect param) |
| Buyer shopping action | Add to cart/wishlist works |
| Merchant/Admin shopping action | **Not enforced on the routed page** (`Products.tsx` guards guests only); A-07 is a known gap (DD_SEARCH_02 §8.2) |
| Language toggle (EN→JA) | Labels switch to Japanese |
| Language toggle (JA→MY) | Labels switch to Myanmar |
| Theme toggle | Cycles light → dark → system |
| Empty results | Empty state shown with **no** reset button |
| Product list error | Inline error state; ad panel unaffected |
| Layout flow | Verifies Header → SearchBar → Ad panel → FilterChips → filters/results |

---

## 4. End-to-End Scenarios (Playwright)

**Spec:** `e2e/tests/SearchAndFilter/search-filter.spec.ts`  
**Page Object:** `e2e/pages/SearchAndFilter/SearchPage.ts`

Every scenario is keyed to its PCL ID. IDs marked **(Buyer PCL)** are defined in
[SearchAndFilter_Buyer_PCL.md](../SearchAndFilter_Buyer_PCL.md).

### 4.1 Normal Scenarios (N)

| PCL ID | Scenario | Coverage |
|--------|----------|----------|
| **N-01** | Page loads with default catalog sorted by newest | E2E `Page Loading` |
| **N-02** | Keyword search after 300ms debounce returns matching products | E2E `Search` |
| **N-03** | Search button fires query immediately, bypassing debounce | E2E `Search` |
| **N-04** | Clear Search resets keyword and restores default catalog | E2E `Search` |
| **N-05** | Category filter narrows results including descendants | E2E `Filtering` |
| **N-06** | Skin type filter uses "all selected" (hasEvery) semantics | Component + API test |
| **N-07** | Ingredient filter uses "any selected" (hasSome) semantics | Component + API test |
| **N-08** | Price range filter returns products within bounds | E2E `Filtering` |
| **N-09** | Rating filter returns products at or above selected stars | E2E `Filtering` |
| **N-10** | Sort by price ascending | E2E `Sorting` |
| **N-11** | Sort by price descending | E2E `Sorting` |
| **N-12** | Sort by highest rated | E2E `Sorting` |
| **N-13** | Pagination navigates between result pages | E2E `Pagination` |
| **N-14** | Page size follows the `limit` URL param (default 12) | Component |
| **N-15** | View mode toggle switches Grid/List without refetch or URL change | Component + E2E |
| **N-16** | Active filter chips display and individual chip removal works | Component + E2E |
| **N-17** | "Clear all" filters keeps keyword intact | E2E |
| **N-18** | "Clear All" in the filters panel clears filters and keeps keyword | Component |
| **N-19** | Product detail navigation and back preserves search state | E2E |
| **N-20** | Sponsored ad slider renders between the search bar and the filter row | E2E `Ad Placement` |
| **N-21** | Language toggle switches the whole screen between EN / JA / MY | E2E |
| **N-22** | Theme toggle switches dark/light | E2E |
| **N-23** | Responsive layout on desktop viewport | E2E + screenshots |
| **N-24** | Responsive layout on mobile viewport with filter drawer | E2E |
| **N-25** | URL state is shareable and restores exactly | E2E |
| **N-26** | Tags filter narrows results using "any selected" (hasSome) semantics | API test |
| **N-27** | Category list collapses to 5 items with View More / View Less | Component |
| **N-28** (Buyer PCL) | Authenticated buyer adds a product to the wishlist | E2E (buyer) |
| **N-29** (Buyer PCL) | Authenticated buyer removes a product from the wishlist | E2E (buyer) |
| **N-30** (Buyer PCL) | Authenticated buyer adds a product to the cart | E2E (buyer) |
| **N-31** | Product card shows SALE badge and compare-at price | Component |
| **N-32** | Product card shows shop name and rating | Component |
| **N-33** | Product card shows up to 3 skin-type badges | Component |
| **N-34** | Missing or broken image falls back to "No image" placeholder | Component |
| **N-35** | Pressing Enter in the search input submits immediately | Component + E2E |
| **N-36** | Selecting "All" in the category list clears the category filter | Component |
| **N-37** | Category chip shows the resolved category name | Component |
| **N-38** | Numbered pagination renders with ellipsis and respects bounds | Component |
| **N-39** | Prices are formatted as "Ks" with thousands separators | Component |
| **N-40** | Out-of-stock products hide the Add-to-Cart action | Component |
| **N-41** | Loading state shows a spinner while products are fetched | Component |
| **N-42** | Ad slider auto-advances and pauses on hover/focus | Component + E2E |
| **N-43** | Ad slider manual controls navigate slides | Component |
| **N-44** | Clicking a sponsored ad opens the linked destination | E2E |
| **N-45** | Sponsored ad image fallback renders a placeholder | Component |
| **N-46** | Product card is keyboard-activatable in grid view | Component |
| **N-47** | Mobile filter drawer Clear All and "Show N Products" | Component + E2E |
| **N-48** | Japanese locale localizes the Search & Filter UI | E2E |
| **N-49** | Myanmar locale localizes the Search & Filter UI | E2E |
| **N-50** | English locale restores English labels | E2E |
| **N-51** | Language preference persists and falls back to English | Component |

### 4.2 Abnormal Scenarios (A)

| PCL ID | Scenario | Coverage |
|--------|----------|----------|
| **A-01** | Keyword exceeding 255 characters shows validation error | Unit + Component |
| **A-02** | Minimum price greater than maximum price shows validation error | Component |
| **A-03** | Negative price values show validation error | Component |
| **A-04** | Rating outside 1–5 range rejected | Unit |
| **A-05** | Invalid category UUID rejected | Unit |
| **A-06** | Guest shopping action prompts login | E2E (Guest PCL) |
| **A-07** | Merchant/Admin shopping action blocked | E2E (Guest PCL) — **known gap, not implemented on the routed page** |
| **A-08** | Network error shows inline error state | Component |
| **A-09** | Server error (500) shows generic error banner | Component |
| **A-10** | Rate limit (429) shows countdown banner | Component |
| **A-11** | Non-existent product slug returns not-found | API test |
| **A-12** (Buyer PCL) | Adding an already-in-cart product opens the "Already in Cart" dialog | E2E (buyer) |
| **A-13** (Buyer PCL) | Server 409 on add-to-cart opens the "Already in Cart" dialog | E2E (buyer) |
| **A-14** (Buyer PCL) | Wishlist add returning 409 shows "Already in your wishlist" info toast | E2E (buyer) |
| **A-15** | Product list request failure shows the inline error state | Component |
| **A-16** | Price validation error blocks URL/query updates and cancels the in-flight request | Component |
| **A-17** | Sponsored-ad request failure is isolated from product results | Component + E2E |
| **A-18** (Buyer PCL) | Add-to-cart failure (non-409) shows a generic error toast | E2E (buyer) |
| **A-19** (Buyer PCL) | Wishlist failure (non-409) shows a generic error toast | E2E (buyer) |

### 4.3 Boundary Scenarios (B)

| PCL ID | Scenario | Coverage |
|--------|----------|----------|
| **B-01** | Keyword at maximum length (255 chars) accepted | Unit + Component |
| **B-02** | Keyword exceeding maximum length (256 chars) rejected | Unit |
| **B-03** | Limit at minimum (1) and maximum (100) accepted | Unit |
| **B-04** | Limit exceeding maximum (101) rejected | Unit |
| **B-05** | Page beyond range clamped to last page or empty state | Component |
| **B-06** | Empty results show the empty state (no reset button) | Component + E2E |
| **B-07** | Empty category tree renders gracefully | Component |
| **B-08** | Price bounds at minimum (0) accepted | Component |
| **B-09** | Rating at boundaries (1 and 5) accepted | Unit |
| **B-10** | Out-of-stock products listed but flagged | Unit + Component |
| **B-11** | Inactive / unapproved products excluded from results | Unit |
| **B-12** | Fallback sample ads render when no eligible ads are returned | Component |
| **B-13** | More than 5 eligible ads capped at 5 | Unit |
| **B-14** | Default page limit is 12; page-size options are 12 / 24 / 48 | Component |
| **B-15** | Rating filter exposes only 3.0+ through 4.5+ options | Component |
| **B-16** | Category list shows 5 items then View More / View Less | Component |
| **B-17** | Equal minimum and maximum price accepted | Component |
| **B-18** | Exactly 5 category items hides the View More control | Component |
| **B-19** | Single-page results hide pagination | Component |
| **B-20** (Buyer PCL) | Cart query is disabled for guests (no cart request) | E2E (buyer) |
| **B-21** (Buyer PCL) | Adding the first item to an empty cart | E2E (buyer) |
| **B-22** (Buyer PCL) | Rapid repeated clicks are serialized per item | E2E (buyer) |

### 4.4 Interface Scenarios (I)

| PCL ID | Scenario | Coverage |
|--------|----------|----------|
| **I-01** | `GET /api/v1/search/products` returns 200 with list and pagination meta | API test |
| **I-02** | `GET /api/v1/search/products` defaults applied when no params supplied | API test |
| **I-03** | `GET /api/v1/search/products` returns 400 for invalid query params | API test |
| **I-04** | `GET /api/v1/search/products` returns 429 when rate limit exceeded | API test (if enforced) |
| **I-05** | `GET /api/v1/search/categories` returns 200 with nested category tree | API test |
| **I-06** | `GET /api/v1/search/products/:slug` returns 200 with product detail | API test |
| **I-07** | `GET /api/v1/search/products/:slug` returns 404 for non-existent/inactive/unapproved | API test |
| **I-08** | `GET /api/v1/search/ads?placement=search_page_banner` returns 200 with eligible ads | API test |
| **I-09** | `GET /api/v1/search/ads` returns 400 for invalid placement | API test |
| **I-10** | Error responses follow the standard API format | API test |
| **I-11** | Product list responses are cached with TTL | Unit test |
| **I-12** | `GET /api/v1/search/products` list endpoint used by the page (repeated array params) | API test |
| **I-13** | `GET /api/v1/search/categories` returns the nested category tree | API test |
| **I-14** | `GET /api/v1/search/ads` request contract used by the slider | API test |
| **I-15** | Ad SKU hydration calls the buyer products endpoint | API test |
| **I-16** (Buyer PCL) | `GET /api/v1/cart` returns the authenticated buyer's cart | API test (buyer) |
| **I-17** (Buyer PCL) | `POST /api/v1/cart/items` adds a product to the cart | API test (buyer) |
| **I-18** (Buyer PCL) | `GET /api/v1/wishlist` returns the buyer's saved items | API test (buyer) |
| **I-19** (Buyer PCL) | `POST /api/v1/wishlist/:productId` adds a product to the wishlist | API test (buyer) |
| **I-20** (Buyer PCL) | `DELETE /api/v1/wishlist/:productId` removes a product from the wishlist | API test (buyer) |
| **I-21** (Buyer PCL) | Wishlist/cart endpoints not exercised by the Search screen | Traceability note |

---

## 5. Test Coverage Requirements

| Category | Minimum Coverage |
|----------|------------------|
| Backend Unit Tests | 90% |
| Frontend Component Tests | 85% |
| E2E Critical Paths | 100% of N/A/B/I scenario IDs |
| Integration Tests | 80% |

---

## 6. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_SEARCH_05](./DD_Search_And_Filter_05_BUSINESS_LOGIC.md) | Business logic tested by unit tests |
| [DD_SEARCH_02](./DD_Search_And_Filter_02_FRONTEND_Page.md) | Frontend components tested |
| [DD_SEARCH_03](./DD_Search_And_Filter_03_API_ENDPOINTS.md) | API endpoints tested |
| [DD_SEARCH_04](./DD_Search_And_Filter_04_DTOS_AND_TYPES.md) | DTOs used in validation tests |
| [SearchAndFilter_Guest_PCL](../SearchAndFilter_Guest_PCL.md) | Guest & shared scenario IDs |
| [SearchAndFilter_Buyer_PCL](../SearchAndFilter_Buyer_PCL.md) | Buyer-only scenario IDs |
| [SearchAndFilter_PCL](../SearchAndFilter_PCL.md) | Original program checklist |
| [機能設計書_Search_And_Filter](../機能設計書%20_Search_And_Filter.md) | Full functional specification (v2.3) |
| [画面項目設計書_Search_And_Filter](../画面項目設計書_Search_And_Filter.md) | Screen items specification (v2.6) |
