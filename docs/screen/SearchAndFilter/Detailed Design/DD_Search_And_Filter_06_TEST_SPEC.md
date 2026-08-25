# DD_SEARCH_06 — Test Specification

> **Doc ID:** SKM-DD-SEARCH-06 | **Version:** 1.2 | **Status:** Released  
> **Last Updated:** 2026-08-25

---

## 1. Overview

This document defines the testing strategy for the Search & Filter Module, covering Unit Tests, Component Tests, and End-to-End (E2E) Scenarios.

---

## 2. Backend Unit Tests (`src/modules/products/tests/`)

### 2.1 `search.service.spec.ts`

Mock dependencies: `PrismaService`, `RedisService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **searchProducts** | Empty query (defaults) | Returns first 20 products sorted by `createdAt desc`, total count correct |
| **searchProducts** | Keyword search (`q=cleanser`) | Returns products matching keyword in name/description/tags/ingredients (case-insensitive) |
| **searchProducts** | Category filter (`categoryId=uuid`) | Returns products in category + all descendant categories |
| **searchProducts** | Skin type filter (`skinTypes=oily,combination`) | Returns products where `skinTypes` contains ALL selected values (hasEvery) |
| **searchProducts** | Ingredient filter (`ingredients=water,glycerin`) | Returns products where `ingredients` contains ANY selected value (hasSome) |
| **searchProducts** | Price range (`minPrice=10, maxPrice=50`) | Returns products where `10 <= price <= 50` |
| **searchProducts** | Rating filter (`rating=4`) | Returns products where `avgRating >= 4` |
| **searchProducts** | Combined filters | Returns intersection of all filter results |
| **searchProducts** | Sort by price ascending | Returns products ordered by `price ASC` |
| **searchProducts** | Sort by rating descending | Returns products ordered by `avgRating DESC` |
| **searchProducts** | Pagination (`page=2, limit=10`) | Returns correct skip/take, meta.page=2, meta.totalPages computed |
| **searchProducts** | Out-of-stock products | Included in results with `isInStock: false` (BR-SEARCH-014) |
| **searchProducts** | Inactive products excluded | No `isActive=false` products in results (BR-SEARCH-012) |
| **searchProducts** | Unapproved shop products excluded | No products from `isApproved=false` shops (BR-SEARCH-013) |
| **searchProducts** | Unapproved merchant products excluded | No products from merchants with `license_status != 'approved'` (BR-SEARCH-013, DBS §3.2) |
| **searchProducts** | Redis HIT | Returns cached result without DB query |
| **searchProducts** | Redis MISS → seed | Queries DB, seeds Redis with 2-min TTL |
| **searchProducts** | Decimal serialization | `price`, `compareAtPrice`, `avgRating` returned as strings (BR-SEARCH-018) |
| **searchProducts** | Validation: `q` > 255 chars | Throws `BadRequestException` (400) |
| **searchProducts** | Validation: invalid `skinTypes` enum | Throws `BadRequestException` (400) |
| **searchProducts** | Validation: `limit` > 100 | Throws `BadRequestException` (400) |
| **searchProducts** | Validation: `page` < 1 | Throws `BadRequestException` (400) |
| **searchProducts** | Validation: `rating` outside 1–5 | Throws `BadRequestException` (400) |
| **searchProducts** | Validation: invalid UUID in `categoryId` | Throws `BadRequestException` (400) |
| **searchProducts** | Validation: `minPrice` > `maxPrice` | Returns empty or throws (cross-field validation) |
| **searchProducts** | Slow query (> 500ms) | Logs `SEARCH_EXECUTED` at warn level |
| **getCategoryTree** | Normal fetch | Returns nested tree from flat `parent_id` references |
| **getCategoryTree** | Redis HIT | Returns cached tree without DB query |
| **getCategoryTree** | Redis MISS → seed | Queries DB, seeds Redis with 30-min TTL |
| **getCategoryTree** | Empty categories | Returns empty array |
| **getProductBySlug** | Valid slug, active product | Returns product detail with shop info |
| **getProductBySlug** | Invalid slug | Throws `NotFoundException` (404) |
| **getProductBySlug** | Inactive product | Throws `NotFoundException` (404) |
| **getProductBySlug** | Unapproved shop product | Throws `NotFoundException` (404) |
| **getProductBySlug** | Unapproved merchant product | Throws `NotFoundException` (404) (BR-SEARCH-013, DBS §3.2) |
| **getAdsByPlacement** | Valid placement, active ads | Returns approved, in-schedule ads ordered by tier priority with round-robin within tier, capped at 5 (REQ §5.3, BR-SEARCH-026) |
| **getAdsByPlacement** | Ad linked to unapproved merchant/shop | Excluded from results (BR-SEARCH-013) |
| **getAdsByPlacement** | More than 5 eligible ads | Returns only first 5 after tier-priority ordering (BR-SEARCH-026) |
| **getAdsByPlacement** | No active ads | Returns empty array |
| **getAdsByPlacement** | Redis HIT | Returns cached ads without DB query |
| **getAdsByPlacement** | Redis MISS → seed | Queries DB, seeds Redis with 5-min TTL |
| **getAdsByPlacement** | Invalid placement | Throws `BadRequestException` (400) |
| **invalidateProductCache** | Product mutation | Deletes all `cache:products:list:*` keys |
| **invalidateCategoryCache** | Category mutation | Deletes `cache:categories` key |
| **invalidateAdCache** | Ad status change | Deletes `cache:ads:{placement}` key |

### 2.2 `products.controller.spec.ts`

Mock dependencies: `SearchService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **GET /products** | Valid query params | Calls `service.searchProducts`, returns 200 with `{ data, meta }` |
| **GET /products** | No params (defaults) | Calls service with defaults, returns 200 |
| **GET /products** | Invalid params | Returns 400 Bad Request |
| **GET /products** | Rate limit exceeded | Returns 429 Too Many Requests |
| **GET /products** | Server error | Returns 500 Internal Server Error |
| **GET /categories** | Normal request | Calls `service.getCategoryTree`, returns 200 with `{ data: tree }` |
| **GET /categories** | Redis cached | Returns cached tree, no DB call |
| **GET /products/:slug** | Valid slug | Calls `service.getProductBySlug`, returns 200 with product detail |
| **GET /products/:slug** | Invalid slug | Returns 404 Not Found |
| **GET /ads** | Valid placement | Calls `service.getAdsByPlacement`, returns 200 with `{ data: ads }` |
| **GET /ads** | Invalid placement | Returns 400 Bad Request |
| **GET /ads** | No active ads | Returns 200 with `{ data: [] }` |

---

## 3. Frontend Component Tests

Using Vitest + React Testing Library.

### 3.1 `SearchBar.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Initial render | Displays search input with placeholder, Search button, Clear button hidden |
| Type keyword | Updates input value |
| 300ms debounce | Does NOT fire API call during typing; fires after 300ms idle |
| Debounce timer reset | Each keystroke resets the 300ms timer |
| Enter key | Fires query immediately, bypasses debounce |
| Search button click | Fires query immediately, bypasses debounce |
| Clear button visible | Shows when `q` param is non-empty |
| Clear button click | Clears `q` param, resets input, refetches default catalog |
| Keyword > 255 chars | Shows validation error (VAL-SEARCH-001) |
| URL sync | Input value reflects `q` URL param on load |

### 3.2 `FilterPanel.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Initial render | All accordion groups collapsed by default |
| Category checkbox select | Sets `categoryId` param, resets `page` to 1 |
| Category checkbox deselect | Clears `categoryId` param, resets `page` to 1 |
| Skin type checkbox multi-select | Appends to `skinTypes` param, resets `page` to 1 |
| Ingredient checkbox select | Appends to `ingredients` param, resets `page` to 1 |
| Min price input | Sets `minPrice` param on apply |
| Max price input | Sets `maxPrice` param on apply |
| Min price < 0 | Shows validation error (VAL-SEARCH-005) |
| Max price < 0 | Shows validation error (VAL-SEARCH-006) |
| Min price > max price | Shows validation error (VAL-SEARCH-007) |
| Rating selector (1–5) | Sets `rating` param, resets `page` to 1 |
| Apply Filters button | Collects all filter values, merges with `page: 1`, updates URL |
| Reset Filters button | Clears all filter params, keeps `q`, resets `page` to 1 |
| Mobile drawer open | Opens filters as bottom-sheet overlay |
| Mobile drawer close (X) | Dismisses without applying pending changes |
| Mobile drawer apply | Applies filters and closes drawer |

### 3.3 `SortSelect.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Initial render | Default selection "Newest" (`createdAt desc`) |
| Select "Price: Low to High" | Sets `sort=price&order=asc`, resets `page` to 1 |
| Select "Price: High to Low" | Sets `sort=price&order=desc`, resets `page` to 1 |
| Select "Highest Rated" | Sets `sort=rating&order=desc`, resets `page` to 1 |
| Select "Newest" | Sets `sort=createdAt&order=desc`, resets `page` to 1 |
| URL sync | Selection reflects `sort`/`order` URL params on load |

### 3.4 `ProductGrid.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Loading state | Shows skeleton shimmer placeholders |
| Products returned | Renders product cards in grid (responsive columns) |
| Empty results | Shows "No products found" empty state with Reset Filters button |
| Product card click | Navigates to `/products/:slug` |
| Out-of-stock product | Card shows `isInStock: false` flag |
| Grid/List toggle (Grid) | Renders responsive 1–4 column grid |
| Grid/List toggle (List) | Renders single-column stacked rows |
| View mode persists | Selection saved to `localStorage` key `search.viewMode` |
| View mode restore | On reload, restores from `localStorage`; invalid falls back to Grid |
| View mode no refetch | Switching views does NOT trigger API call |
| View mode no URL change | Switching views does NOT modify URL query params |

### 3.5 `ViewToggle.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Default view (Grid) | Grid segment active, `aria-pressed="true"` on Grid button |
| Switch to List | List segment active, `aria-pressed="true"` on List button |
| Grid icon + i18n label | Grid segment shows grid icon with i18n label |
| List icon + i18n label | List segment shows list icon with i18n label |
| Keyboard navigation | Tab to focus, Enter/Space to select, arrow keys within group |
| Touch targets | Touch targets ≥ 44px on mobile |
| Focus ring | Primary color focus ring visible on toggle segments |
| Screen reader | Active view mode announced via `aria-live="polite"` |
| LocalStorage persist | Selection persisted to `search.viewMode` key |
| Fallback on invalid | Absent/invalid stored value falls back to Grid |
| URL unchanged | No URL query params modified when switching views |

### 3.6 `FilterChips.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| No filters applied | Chips row hidden |
| One filter applied | Single chip rendered with human-readable label |
| Multiple filters applied | One chip per active filter value |
| Chip label format (skin type) | "Skin Type: Dry" format |
| Chip label format (price) | "$10–$50" format |
| Chip label format (rating) | "Rating: 4★+" format |
| Chip close (×) click | Removes single filter value, resets `page` to 1, refetches |
| "Clear all" click | Removes all filters, keeps `q`, resets `page` to 1, refetches |
| Chips placement (desktop) | Above results area |
| Chips placement (mobile) | Above results inside drawer header |

### 3.7 `Pagination.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Single page | Pagination hidden when `totalPages <= 1` |
| Multiple pages | Shows previous/next + page numbers |
| First page | Previous button disabled |
| Last page | Next button disabled |
| Page click | Updates `page` param, refetches with `keepPreviousData` |
| Page size change | Updates `limit` param, resets `page` to 1 |
| Page beyond range | Clamped to last page or empty state |

### 3.8 `SponsoredAdSlider.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Active ads exist | Renders slide-down panel between [A] and [B+C] |
| Slide content | Each slide shows image/banner, title, description, CTA together |
| "Sponsored" badge | Badge displayed on every slide (REQUIREMENT_SPEC §5.3) |
| Description 2-line clamp | Long descriptions clamped to 2 lines |
| Title truncation | Long titles truncated to 1 line |
| Description absent | Hidden gracefully when null/empty without breaking layout |
| Desktop/tablet layout (≥ 768px) | Horizontal slide — image left (320×120), text block right, inline CTA |
| Mobile layout (< 768px) | Stacked slide — full-width 16:9 image, title, description, full-width CTA below |
| Full container width | Panel spans full container width, horizontally centered between [A] and [B+C] |
| CSS-only breakpoint switch | Re-layouts slides without refetch and without resetting rotation |
| Auto-slide | Advances every 5 seconds with vertical slide-down transition (500ms) |
| Maximum 5 ads | Slider enforces max 5 ads |
| Tier priority | Premium > Standard > Basic ordering with round-robin within tier (BR-SEARCH-026) |
| Auto-slide pause | Pauses on hover and keyboard focus inside panel; resumes on leave/blur |
| Auto-slide resume | Resumes correctly after pointer leave / blur |
| `prefers-reduced-motion` | Disables entrance/slide animations; 5-second interval unchanged |
| Panel accessibility | `role="region"` with i18n `aria-label` |
| Slide change announcement | Announced via `aria-live="polite"` using `search.sponsored.slideStatus` |
| Ad images alt text | Descriptive `alt` from `search.sponsored.adAlt` |
| CTA keyboard focusable | Visible primary focus ring on CTA link |
| Whole-slide click | Does not trap keyboard users |
| No ads hidden | Panel entirely hidden — no slide-down occurs |
| Ad fetch error hidden | Graceful degradation; product results unaffected |
| Redis cache | Cached in `cache:ads:search-top`, TTL 5 min |
| Ad CTA click | Triggers `ad.click` analytics event with `ad_id` and `placement` |
| Ad independence | Ad fetch does NOT block or defer product results loading |

### 3.9 `SearchPage.test.tsx` (Integration)

| Scenario | Expected Outcome |
|----------|------------------|
| Page load (no params) | Shows default catalog sorted by newest |
| URL with params | Parses params, applies filters, shows results |
| Back button | Restores previous search state from URL |
| Guest shopping action (add to cart) | Shows alert modal (no auto-close) → redirects to `/login?redirect=<path>` |
| Buyer shopping action | Works without restriction |
| Merchant shopping action | Returns 403 `SHOPPING_NOT_ALLOWED`, shows error banner |
| Admin shopping action | Returns 403 `SHOPPING_NOT_ALLOWED`, shows error banner |
| Language toggle (EN→JA) | All labels switch to Japanese |
| Language toggle (JA→MY) | All labels switch to Myanmar |
| Theme toggle | Cycles light → dark → system |
| Rate limit (429) | Shows "Too many requests" banner with retry countdown |
| Server error (500) | Shows "Something went wrong" banner with retry button |
| Layout flow | Verifies A → Ad → B+C → D rendering order |

---

## 4. End-to-End (E2E) Scenarios (Playwright)

| Scenario ID | Flow Description |
|-------------|------------------|
| **E2E-SEARCH-01** | **Happy Path: Keyword Search**<br>1. Navigate to `/products`.<br>2. Verify default catalog displayed (sorted by newest).<br>3. Type "cleanser" in search input.<br>4. Wait 300ms debounce.<br>5. Verify results update with matching products.<br>6. Verify results count text shows "{total} products for 'cleanser'". |
| **E2E-SEARCH-02** | **Category Filtering**<br>1. Navigate to `/products`.<br>2. Expand Categories accordion.<br>3. Select "Cleansers" category checkbox.<br>4. Verify `page` resets to 1 in URL.<br>5. Verify results show only cleanser products (including descendants).<br>6. Deselect category.<br>7. Verify default catalog restored. |
| **E2E-SEARCH-03** | **Multi-Dimensional Filtering**<br>1. Navigate to `/products`.<br>2. Select skin type "Oily" and "Combination".<br>3. Set min price to 10, max price to 50.<br>4. Select minimum rating 4 stars.<br>5. Click "Apply Filters".<br>6. Verify results match all filter criteria.<br>7. Verify filter chips rendered (3 chips).<br>8. Verify `page` is 1. |
| **E2E-SEARCH-04** | **Sort and Pagination**<br>1. Navigate to `/products`.<br>2. Select sort "Price: Low to High".<br>3. Verify results ordered by price ascending.<br>4. Verify `page` resets to 1.<br>5. Click page 2.<br>6. Verify page 2 results loaded.<br>7. Change page size to 50.<br>8. Verify 50 products displayed, page resets to 1. |
| **E2E-SEARCH-05** | **Active Filter Chips Interaction**<br>1. Navigate to `/products?skinTypes=oily&minPrice=10&maxPrice=50`.<br>2. Verify 3 filter chips rendered.<br>3. Click close (×) on "Skin Type: Oily" chip.<br>4. Verify `skinTypes` removed from URL, `page` reset to 1.<br>5. Verify results updated.<br>6. Click "Clear all".<br>7. Verify all chips removed, `q` preserved. |
| **E2E-SEARCH-06** | **View Mode Toggle**<br>1. Navigate to `/products`.<br>2. Verify Grid view is default.<br>3. Click "List" toggle.<br>4. Verify products render in stacked list layout.<br>5. Verify no API refetch occurred.<br>6. Verify URL params unchanged.<br>7. Verify `aria-pressed` reflects active segment.<br>8. Refresh page.<br>9. Verify List view persisted from `localStorage`. |
| **E2E-SEARCH-07** | **Product Detail Navigation**<br>1. Navigate to `/products?q=cleanser`.<br>2. Click first product card.<br>3. Verify navigation to `/products/:slug`.<br>4. Click browser back button.<br>5. Verify return to `/products?q=cleanser` with search state preserved. |
| **E2E-SEARCH-08** | **Empty Results State**<br>1. Navigate to `/products?q=xyznonexistent`.<br>2. Verify "No products found" empty state displayed.<br>3. Verify "Reset Filters" button visible.<br>4. Click "Reset Filters".<br>5. Verify default catalog restored. |
| **E2E-SEARCH-09** | **Sponsored Advertisement Display**<br>1. Navigate to `/products` (with active ads in schedule).<br>2. Verify sponsored ad slide-down panel rendered between page header ([A]) and search bar + filters row ([B]+[C]).<br>3. Verify panel spans full container width, horizontally centered.<br>4. Verify search bar + filters row rendered immediately below ad panel.<br>5. Verify each slide shows image/banner, title, description, and CTA together.<br>6. Verify "Sponsored" label badge displayed on every slide.<br>7. Verify desktop/tablet: horizontal slide layout.<br>8. Verify mobile: stacked slide layout.<br>9. Verify auto-slide advances every 5 seconds.<br>10. Click ad CTA.<br>11. Verify navigation to ad target URL.<br>12. Navigate to `/products` (no active ads).<br>13. Verify ad panel hidden; search bar + filters row at top. |
| **E2E-SEARCH-10** | **Guest Shopping Restriction**<br>1. Navigate to `/products` as guest (not logged in).<br>2. Attempt to add a product to cart/wishlist.<br>3. Verify alert modal displayed (no auto-close).<br>4. Click "OK" button.<br>5. Verify redirect to `/login?redirect=<encoded_path>`. |
| **E2E-SEARCH-11** | **Merchant/Admin Shopping Restriction**<br>1. Login as merchant.<br>2. Navigate to `/products`.<br>3. Attempt to add a product to cart/wishlist.<br>4. Verify 403 error banner: "Shopping features are only available to buyers".<br>5. Verify banner does NOT auto-close. |
| **E2E-SEARCH-12** | **URL State Persistence**<br>1. Navigate to `/products?q=serum&skinTypes=dry&sort=rating&page=2`.<br>2. Verify search input shows "serum".<br>3. Verify skin type "Dry" checkbox checked.<br>4. Verify sort shows "Highest Rated".<br>5. Verify page 2 results displayed.<br>6. Share URL in new tab.<br>7. Verify identical search state restored. |
| **E2E-SEARCH-13** | **Language Toggle**<br>1. Navigate to `/products`.<br>2. Toggle language to Japanese.<br>3. Verify page title changes to "商品検索".<br>4. Verify filter labels, chips, and errors in Japanese.<br>5. Toggle language to Myanmar.<br>6. Verify all labels in Myanmar script.<br>7. Toggle back to English. |
| **E2E-SEARCH-14** | **Responsive Layout**<br>1. Navigate to `/products` on desktop (1024px+).<br>2. Verify search bar + filters side-by-side in same row, 4-column grid.<br>3. Verify ad panel above search+filters row (horizontal layout).<br>4. Resize to tablet (768px).<br>5. Verify search bar + compact filters in same row, 2–3 column grid.<br>6. Verify ad panel horizontal layout maintained.<br>7. Resize to mobile (< 768px).<br>8. Verify search bar + filter trigger in same row, 1–2 column grid.<br>9. Verify ad panel stacked layout (full-width image, title, description, CTA).<br>10. Click filter trigger.<br>11. Verify bottom-sheet drawer opens. |
| **E2E-SEARCH-15** | **Error Handling**<br>1. Simulate network error on `/products` API.<br>2. Verify error banner with retry button displayed.<br>3. Click retry.<br>4. Verify request retried successfully.<br>5. Simulate 429 rate limit.<br>6. Verify "Too many requests" banner with countdown. |
| **E2E-SEARCH-16** | **Ad Panel Interaction**<br>1. Navigate to `/products` (with ≥ 2 active ads).<br>2. Hover over ad panel.<br>3. Verify auto-slide pauses.<br>4. Move pointer away.<br>5. Verify auto-slide resumes.<br>6. Verify ad slot failure (simulated error) hides panel gracefully.<br>7. Verify product results remain unaffected during ad fetch. |

---

## 5. Test Coverage Requirements

| Category | Minimum Coverage |
|----------|-----------------|
| Backend Unit Tests | 90% |
| Frontend Component Tests | 85% |
| E2E Critical Paths | 100% |
| Integration Tests | 80% |

---

## 6. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_SEARCH_05](./DD_Search_And_Filter_05_BUSINESS_LOGIC.md) | Business logic tested by unit tests |
| [DD_SEARCH_02](./DD_Search_And_Filter_02_FRONTEND_Page.md) | Frontend components tested |
| [DD_SEARCH_03](./DD_Search_And_Filter_03_API_ENDPOINTS.md) | API endpoints tested |
| [機能設計書_Search_And_Filter](../機能設計書%20_Search_And_Filter.md) | Full functional specification (v2.3) |
| [画面項目設計書_Search_And_Filter](../画面項目設計書_Search_And_Filter.md) | Screen items specification (v2.6) |
