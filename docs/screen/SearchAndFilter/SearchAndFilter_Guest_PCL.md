# Program Checklist (PCL) — Search & Filter (Guest & Shared)

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-PCL-SEARCH-001-G |
| **Target Screen** | Search & Filter — Guest & Shared |
| **Subsystem** | Product Discovery |
| **Version** | 1.2 |
| **Created** | 2026-10-15 |
| **Last Updated** | 2026-10-15 |
| **Status** | Active |

**Related design:** `docs/screen/SearchAndFilter/Detailed Design/DD_Search_And_Filter_01..06`
**Spec:** `e2e/tests/SearchAndFilter/search-filter.spec.ts` · **POM:** `e2e/pages/SearchAndFilter/SearchPage.ts`
**Sibling document:** `docs/screen/SearchAndFilter/SearchAndFilter_Buyer_PCL.md` (authenticated buyer actions).

**Scope:** This document covers shared and guest Search & Filter behavior. Authenticated buyer wishlist/cart actions and their API contracts are documented in the Buyer PCL.

---

## 1. Normal Scenarios (N) — Happy Path

- [ ] **N-01**: Page loads with default catalog sorted by newest
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: Products exist in the database
  - **Steps**:
    1. Navigate to `/products`
    2. Observe the results area without entering any query
  - **Expected Result**: Default catalog renders sorted by `createdAt desc`; results count and sort select show "Newest"; no filter chips
  - **Business Rules**: BR-SEARCH-003, BR-SEARCH-011
  - **API**: `GET /api/v1/search/products`

- [ ] **N-02**: Keyword search after 300ms debounce returns matching products
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: Products matching "cleanser" exist
  - **Steps**:
    1. Navigate to `/products`
    2. Type "cleanser" in the search input
    3. Wait 300ms of typing inactivity
  - **Expected Result**: Query fires after debounce; results update with name/description/tag/ingredient matches (case-insensitive); `q=cleanser` written to URL
  - **Business Rules**: BR-SEARCH-001, BR-SEARCH-003, ST-DEB-001, ST-DEB-005
  - **API**: `GET /api/v1/search/products?q=cleanser`

- [ ] **N-03**: Search button fires query immediately, bypassing debounce
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: User is on `/products`
  - **Steps**:
    1. Type "serum" in the search input
    2. Click the Search button before the debounce elapses
  - **Expected Result**: Query fires immediately on click (no 300ms wait); results update; `q=serum` in URL
  - **Business Rules**: ST-DEB-003
  - **API**: `GET /api/v1/search/products?q=serum`

- [ ] **N-04**: Clear Search resets keyword and restores default catalog
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: `q` is non-empty (Clear button visible)
  - **Steps**:
    1. Click the Clear Search button
  - **Expected Result**: `q` removed from URL; input emptied; default catalog refetched (newest)
  - **Business Rules**: BR-SEARCH-003
  - **API**: `GET /api/v1/search/products`

- [ ] **N-05**: Category filter narrows results including descendants
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: Category tree loaded; parent category with child products exists
  - **Steps**:
    1. Expand the Categories accordion
    2. Check a parent category checkbox
  - **Expected Result**: `categoryId` set in URL, `page` reset to 1; results include products from the category and all descendant categories
  - **Business Rules**: BR-SEARCH-010, BR-SEARCH-011
  - **API**: `GET /api/v1/search/products?categoryId=<uuid>`

- [ ] **N-06**: Skin type filter uses "all selected" (hasEvery) semantics
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: Products tagged with skin types exist
  - **Steps**:
    1. Select skin types "Oily" and "Combination"
  - **Expected Result**: Only products whose `skinTypes` contain **both** selected values are returned; `skinTypes=oily,combination` in URL; `page` = 1
  - **Business Rules**: BR-SEARCH-006, BR-SEARCH-011
  - **API**: `GET /api/v1/search/products?skinTypes=oily,combination`

- [ ] **N-07**: Ingredient filter uses "any selected" (hasSome) semantics
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: Products with ingredients exist
  - **Steps**:
    1. Select ingredients "Water" and "Glycerin"
  - **Expected Result**: Products containing **any** selected ingredient are returned; `ingredients=...` in URL; `page` = 1
  - **Business Rules**: BR-SEARCH-007, BR-SEARCH-011
  - **API**: `GET /api/v1/search/products?ingredients=Water,Glycerin`

- [ ] **N-08**: Price range filter returns products within bounds
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: Products exist above and below the range
  - **Steps**:
    1. Set Min Price = 10 and Max Price = 50
  - **Expected Result**: Only products with `10 <= price <= 50` are returned; `minPrice=10&maxPrice=50` in URL; `page` = 1
  - **Business Rules**: BR-SEARCH-008, BR-SEARCH-011
  - **API**: `GET /api/v1/search/products?minPrice=10&maxPrice=50`

- [ ] **N-09**: Rating filter returns products at or above selected stars
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: Products with varying ratings exist
  - **Steps**:
    1. Select minimum rating 4 stars
  - **Expected Result**: Only products with `avgRating >= 4` are returned; `rating=4` in URL; `page` = 1
  - **Business Rules**: BR-SEARCH-009, BR-SEARCH-011
  - **API**: `GET /api/v1/search/products?rating=4`

- [ ] **N-10**: Sort by price ascending
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: Products with differing prices exist
  - **Steps**:
    1. Select "Price: Low to High" in the sort dropdown
  - **Expected Result**: Results ordered by `price asc`; URL `sort=price&order=asc`; `page` reset to 1
  - **Business Rules**: BR-SEARCH-015, BR-SEARCH-011
  - **API**: `GET /api/v1/search/products?sort=price&order=asc`

- [ ] **N-11**: Sort by price descending
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: Products with differing prices exist
  - **Steps**:
    1. Select "Price: High to Low" in the sort dropdown
  - **Expected Result**: Results ordered by `price desc`; URL `sort=price&order=desc`; `page` reset to 1
  - **Business Rules**: BR-SEARCH-015, BR-SEARCH-011
  - **API**: `GET /api/v1/search/products?sort=price&order=desc`

- [ ] **N-12**: Sort by highest rated
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: Products with differing ratings exist
  - **Steps**:
    1. Select "Highest Rated" in the sort dropdown
  - **Expected Result**: Results ordered by `avgRating desc`; URL `sort=rating&order=desc`; `page` reset to 1
  - **Business Rules**: BR-SEARCH-015, BR-SEARCH-011
  - **API**: `GET /api/v1/search/products?sort=rating&order=desc`

- [ ] **N-13**: Pagination navigates between result pages
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: Total results exceed one page (default `limit` = 12)
  - **Steps**:
    1. Navigate to `/products`
    2. Click page 2 (or "Next") in the pagination control
  - **Expected Result**: `page=2` in URL; page 2 results render; previous page results are retained while the next page loads (`placeholderData` / `keepPreviousData`); the current page button has `aria-current="page"` and is disabled
  - **Business Rules**: BR-SEARCH-016
  - **API**: `GET /api/v1/search/products?page=2`

- [ ] **N-14**: Page size follows the `limit` URL param (default 12)
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: User is on `/products` with results
  - **Steps**:
    1. Navigate to `/products?limit=24`
    2. Observe the number of products rendered
  - **Expected Result**: Up to 24 products render; `limit=24` is retained in the URL; the page-size options supported by the app are 12 / 24 / 48
  - **Business Rules**: BR-SEARCH-016
  - **API**: `GET /api/v1/search/products?limit=24`
  - **Note**: This screen renders only the inline numbered pagination (`Products.tsx`); it does **not** render a page-size selector, and `limit` is omitted from the URL while it equals the default `12`.

- [ ] **N-15**: View mode toggle switches Grid/List without refetch or URL change
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: Results are loaded; default view is Grid
  - **Steps**:
    1. Click the "List" segment of the view toggle
    2. Click the "Grid" segment to switch back
  - **Expected Result**: Products re-render in stacked list / card grid using already-fetched data; no network request; URL params unchanged; `aria-pressed` reflects the active segment
  - **Business Rules**: None (UI)
  - **Note**: Selection persists to `localStorage` key `search.viewMode`; does not modify URL state.

- [ ] **N-16**: Active filter chips display and individual chip removal works
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: URL has `skinTypes=oily&minPrice=10&maxPrice=50`
  - **Steps**:
    1. Navigate to `/products?skinTypes=oily&minPrice=10&maxPrice=50`
    2. Click the close (×) icon on the "Skin Type: Oily" chip
  - **Expected Result**: Three chips render initially; removing one clears only that value from URL, resets `page` to 1, and refetches; remaining chips persist
  - **Business Rules**: BR-SEARCH-019, BR-SEARCH-022, BR-SEARCH-024
  - **API**: `GET /api/v1/search/products`

- [ ] **N-17**: "Clear all" filters keeps keyword intact
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: `q` set plus ≥ 1 active filter chip
  - **Steps**:
    1. Click the "Clear all" button
  - **Expected Result**: All filter params removed, all chips cleared, `q` preserved, `page` reset to 1, default filter set refetched
  - **Business Rules**: BR-SEARCH-023
  - **API**: `GET /api/v1/search/products`

- [ ] **N-18**: "Clear All" in the filters panel clears filters and keeps keyword
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: User is on `/products` (desktop layout) with filters and a keyword applied
  - **Steps**:
    1. Click "Clear All" in the filters panel (the button is only shown while filters are active)
  - **Expected Result**: `categoryId`, `skinTypes`, `ingredients`, `tags`, `minPrice`, `maxPrice`, `rating` removed; `q` retained; `page` reset to 1; results refetched
  - **Business Rules**: BR-SEARCH-011
  - **API**: `GET /api/v1/search/products`
  - **Note**: Panel button label is `t('buyer.search.clearAll', 'Clear All')`; it maps to the same handler as the chip row's Clear All.

- [ ] **N-19**: Product detail navigation and back preserves search state
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: Results are displayed for `q=cleanser`
  - **Steps**:
    1. Navigate to `/products?q=cleanser`
    2. Click a product card
    3. Click the browser back button
  - **Expected Result**: Card click routes to `/buyer/products/:slug` (`ProductCard` `productLink`); back returns to `/products?q=cleanser` with search state preserved
  - **Business Rules**: BR-SEARCH-003, UC-SEARCH-009
  - **API**: `GET /api/v1/search/products/:slug`
  - **Note**: The card navigates to the buyer product route `/buyer/products/:slug`, whose detail page fetches via the buyer products endpoint `GET /api/v1/products/:slug`. The parallel search endpoint `GET /api/v1/search/products/:slug` exists and is exercised directly by I-06/I-07.

- [ ] **N-20**: Sponsored ad slider renders between the search bar and the filter row
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: Active, in-schedule `search_page_banner` ads exist for approved shops/merchants
  - **Steps**:
    1. Navigate to `/products`
  - **Expected Result**: A full-width slider card renders directly below the search bar and above the filter chips; each slide shows an image (or placeholder), title, description, a "Learn more" CTA, and an announcement/sponsored badge; slides auto-advance every 5s
  - **Business Rules**: BR-SEARCH-013, BR-SEARCH-026, BR-SEARCH-028, REQ §5.3
  - **API**: `GET /api/v1/search/ads?placement=search_page_banner`
  - **Note**: Ad fetch runs in parallel via `useSponsoredAds('search_page_banner')` and must never block or delay product results.

- [ ] **N-21**: Language toggle works on the Search & Filter page (Guest)
  - **Evidence**:
    - `N-21_1_lang_initial.png`
    - `N-21_2_lang_japanese.png`
    - `N-21_3_lang_english.png`
    - Test: search-filter.spec.ts › "should toggle language on guest search page" – pending
  - **Precondition**: Guest user (not logged in); LanguageToggle control is available
  - **Steps**:
    1. Toggle language to Japanese
    2. Verify all labels change to Japanese
    3. Toggle language to Myanmar
    4. Verify all labels change to Myanmar
    5. Toggle back to English
  - **Expected Result**: All guest-facing search bar, filter options, category names, and UI labels switch to the selected language (Japanese / Myanmar / English)
  - **Business Rules**: None (i18n behavior)

- [ ] **N-22**: Theme toggle switches dark/light
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: User is on `/products`
  - **Steps**:
    1. Toggle theme to dark, then to light
  - **Expected Result**: Styling switches between dark and light modes; skeletons and cards remain legible
  - **Business Rules**: None (UI)

- [ ] **N-23**: Responsive layout on desktop viewport
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: Viewport ≥ 1024px
  - **Steps**:
    1. Set viewport to 1280×720
    2. Navigate to `/products`
  - **Expected Result**: Search bar [B] and full filters panel [C] side-by-side in the same row; 4-column product grid; ad panel horizontal layout
  - **Business Rules**: None (Responsive)

- [ ] **N-24**: Responsive layout on mobile viewport with filter drawer
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: Viewport < 768px
  - **Steps**:
    1. Set viewport to 375×667
    2. Navigate to `/products`
    3. Tap the filters trigger
  - **Expected Result**: Search bar + filter trigger in the same row; 1–2 column grid; ad panel stacked (full-width image, title, description, CTA); filters open as a right-side drawer with focus trap and a "Show N Products" button that closes the drawer
  - **Business Rules**: BR-SEARCH-024, EL-28 (mobile filter trigger)
  - **Note**: Filters apply immediately; the drawer's "Show N Products" button closes it.

- [ ] **N-25**: URL state is shareable and restores exactly
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: A populated search URL is available
  - **Steps**:
    1. Navigate to `/products?q=serum&skinTypes=dry&sort=rating&page=2`
    2. Open the same URL in a new tab
  - **Expected Result**: Input shows "serum", "Dry" checked, sort shows "Highest Rated", page 2 results render — identical state in both tabs
  - **Business Rules**: BR-SEARCH-003
  - **API**: `GET /api/v1/search/products?q=serum&skinTypes=dry&sort=rating&order=desc&page=2`

- [ ] **N-26**: Tags filter narrows results using "any selected" (hasSome) semantics
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: Products tagged with product tags exist
  - **Steps**:
    1. Apply a tag value so that `tags` is set (via chip source / URL `?tags=fragrance-free`)
  - **Expected Result**: Products containing **any** selected tag are returned; a tag chip renders; `page` reset to 1
  - **Business Rules**: BR-SEARCH-019, BR-SEARCH-020, BR-SEARCH-007
  - **API**: `GET /api/v1/search/products?tags=fragrance-free`
  - **Note**: `tags` is a distinct filter from `ingredients`; both are serialized as comma-separated arrays.

- [ ] **N-27**: Category list collapses to 5 items with View More / View Less
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: More than 5 categories (including "All") exist
  - **Steps**:
    1. Open the filter panel Category group
    2. Click "View More", then "View Less"
  - **Expected Result**: Only the first 5 items (incl. "All") are shown initially; "View More" expands the flattened tree; "View Less" collapses it
  - **Business Rules**: None (UI)
  - **Note**: `CategorySelect` constant `COLLAPSED_COUNT = 5`.

> Authenticated wishlist/cart actions are defined in `SearchAndFilter_Buyer_PCL.md`.

- [ ] **N-28**: Product card shows SALE badge and compare-at price
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: Product has `compareAtPrice` set (less than or greater than `price`)
  - **Steps**:
    1. Navigate to `/products`
  - **Expected Result**: A red/pink "SALE" badge renders on the card and the `compareAtPrice` renders with a line-through next to the current price
  - **Business Rules**: None (UI)
  - **Note**: `ProductCard` renders SALE only when `compareAtPrice` is present.

- [ ] **N-29**: Product card shows shop name and rating
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: Product has `shop_name`, `avgRating`, and `reviewCount`
  - **Steps**:
    1. Navigate to `/products`
  - **Expected Result**: "Sold by {shop_name}" renders, and a star rating plus review count renders on each card
  - **Business Rules**: None (UI)

- [ ] **N-30**: Product card shows up to 3 skin-type badges
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: Product has `skinTypes` with more than 3 values
  - **Steps**:
    1. Navigate to `/products`
  - **Expected Result**: At most the first 3 skin-type badges render in grid view
  - **Business Rules**: None (UI)
  - **Note**: `ProductCard` uses `product.skinTypes.slice(0, 3)`; badges are grid-only.7

- [ ] **N-31**: Missing or broken image falls back to "No image" placeholder
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: A product has no `images` entry, or its image URL fails to load
  - **Steps**:
    1. Navigate to `/products`
    2. Observe a product with no image / a broken image URL
  - **Expected Result**: The broken `<img>` is hidden and the localized "No image" placeholder is shown; the card layout does not break
  - **Business Rules**: None (UI)

- [ ] **N-32**: Pressing Enter in the search input submits immediately
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: User is on `/products`
  - **Steps**:
    1. Type "serum" in the search input
    2. Press Enter before the 300ms debounce elapses
  - **Expected Result**: The `SearchBar` form submit fires the query immediately (`flush()`), cancelling the pending debounce; `q=serum` in URL; results update
  - **Business Rules**: ST-DEB-003
  - **API**: `GET /api/v1/search/products?q=serum`

- [ ] **N-33**: Selecting "All" in the category list clears the category filter
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: A `categoryId` filter is active
  - **Steps**:
    1. In the Category group, click "All"
  - **Expected Result**: `CategorySelect` fires `onSelect('')`; `categoryId` removed from URL; `page` reset to 1; results refreshed to the full catalog
  - **Business Rules**: BR-SEARCH-010, BR-SEARCH-011
  - **API**: `GET /api/v1/search/products`
  - **Note**: "All" is injected as the first item with `id: ''`; it is separate from `buyer.search.allCategories`.

- [ ] **N-34**: Category chip shows the resolved category name
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: URL has `categoryId=<uuid>` for a loaded category
  - **Steps**:
    1. Navigate to `/products?categoryId=<uuid>`
  - **Expected Result**: The category chip renders the resolved category `name` (via `resolveCategoryName`), not the category label fallback; removing it clears `categoryId`
  - **Business Rules**: BR-SEARCH-019
  - **API**: `GET /api/v1/search/products?categoryId=<uuid>`

- [ ] **N-35**: Numbered pagination renders with ellipsis and respects bounds
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: `totalPages > 5`
  - **Steps**:
    1. Navigate to `/products`
    2. Observe the pagination control on the first, middle, and last pages
  - **Expected Result**: Page numbers render with `…` ellipsis windows (`getPageItems`); the active page has `aria-current="page"` and is disabled; "Prev" is disabled on page 1 and "Next" is disabled on the last page
  - **Business Rules**: BR-SEARCH-016

- [ ] **N-36**: Prices are formatted as "Ks" with thousands separators
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: Products with numeric `price` and `compareAtPrice` exist
  - **Steps**:
    1. Navigate to `/products`
  - **Expected Result**: Prices render as `{toLocaleString('en-US')} Ks` (e.g. `12,000 Ks`); when `compareAtPrice` is present it renders struck-through next to the current price
  - **Business Rules**: None (UI)
  - **Note**: `formatKs` in `ProductCard.tsx`; `0 Ks` is shown for null/NaN values.

- [ ] **N-37**: Out-of-stock products hide the Add-to-Cart action
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: A product has `isInStock = false`
  - **Steps**:
    1. Navigate to `/products`
  - **Expected Result**: Grid view shows the "OUT OF STOCK" badge and no Add-to-cart button; list view shows "Out of stock" text in place of the cart button. The product remains listed.
  - **Business Rules**: BR-SEARCH-014
  - **Note**: `ProductCard` renders the cart button only when `product.isInStock`.

- [ ] **N-38**: Loading state shows a spinner while products are fetched
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: The product list request is in flight
  - **Steps**:
    1. Navigate to `/products` (throttle the network so the request is visible)
  - **Expected Result**: A centered `Loader2` spinner renders in the results area until the query resolves; neither the empty state nor the error state is shown while loading
  - **Business Rules**: None (UI)
  - **API**: `GET /api/v1/search/products`

- [ ] **N-39**: Ad slider auto-advances and pauses on hover/focus
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: ≥ 2 eligible `search_page_banner` ads render
  - **Steps**:
    1. Navigate to `/products`
    2. Wait 5 seconds without interacting
    3. Hover the slider, wait 5 seconds, then move the pointer away
  - **Expected Result**: Slides auto-advance every 5000ms; auto-advance pauses while the slider is hovered (`isHovered`) or focused (`isFocused`) and resumes afterwards; when the OS reports `prefers-reduced-motion: reduce`, auto-advance is disabled entirely
  - **Business Rules**: BR-SEARCH-026

- [ ] **N-40**: Ad slider manual controls navigate slides
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: ≥ 2 eligible `search_page_banner` ads render
  - **Steps**:
    1. Click the Previous / Next arrows
    2. Click a dot indicator
  - **Expected Result**: Previous/Next cycle slides (wrapping); each dot has `aria-label="Go to advertisement {n}"` and `aria-current` on the active dot; clicking a dot jumps to that slide
  - **Business Rules**: BR-SEARCH-026

- [ ] **N-41**: Clicking a sponsored ad opens the linked destination
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: An eligible ad with a `sku` and/or `target_url` renders
  - **Steps**:
    1. Click the ad card (or its "Learn more" button)
  - **Expected Result**: Navigates to `/buyer/products/{sku}` (or the `fallbackProductId` product, or `/buyer/products`) for internal links; an absolute `http(s)` `target_url`/`linkUrl` is opened via `window.location.assign`. Clicking the CTA does not trigger the slide navigation
  - **Business Rules**: BR-SEARCH-028
  - **Note**: Destination resolution is `getDestination()` in `SponsoredAdSlider.tsx`.

- [ ] **N-42**: Sponsored ad image fallback renders a placeholder
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: An eligible ad's product image, `imageUrl`, and the bundled sample image are all missing or fail to load
  - **Steps**:
    1. Navigate to `/products` with such an ad
  - **Expected Result**: A gradient placeholder with an image icon renders in place of the image, exposed via `role="img"` and `aria-label="{title} image unavailable"`
  - **Business Rules**: None (UI)

- [ ] **N-43**: Product card is keyboard-activatable in grid view
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: Results are loaded in grid view
  - **Steps**:
    1. Tab to a product card so it receives focus
    2. Press Enter, then repeat with Space
  - **Expected Result**: The card (`role="link"`, `tabIndex={0}`) navigates to the product detail on Enter/Space without scrolling the page; the inner wishlist/cart buttons keep their own focus and do not trigger navigation
  - **Business Rules**: None (Accessibility)

- [ ] **N-44**: Mobile filter drawer Clear All and "Show N Products"
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: Viewport < 768px; filters are active
  - **Steps**:
    1. Open the mobile filters drawer
    2. Tap the "Clear All" text button
    3. Re-apply a filter, then tap "Show N Products"
  - **Expected Result**: "Clear All" removes all filter params and chips and resets `page`; the primary button shows `buyer.search.showProducts` ("Show {count} Products" using `meta.total`) and closes the drawer on click. Filters apply immediately while the drawer is open; the drawer traps focus and closes on Escape/overlay click
  - **Business Rules**: BR-SEARCH-024
  - **Note**: Drawer uses the shadcn `Sheet` with `side="right"`.

- [ ] **N-45**: Notification bell for guest prompts login modal
  - **Evidence**:
    - `N-45_1_guest_notification_click.png`
    - Test: search-filter.spec.ts › "N-45: should prompt login when guest clicks notification bell" — passed
  - **Precondition**: Guest user (not logged in)
  - **Steps**:
    1. Observe the header navigation bar as a guest user
    2. Verify that no unread notification badge or relative timestamps (e.g., "5m ago", "2h ago") are visible
    3. Click the notification bell icon
  - **Expected Result**: Notification unread badge and relative timestamps (e.g., "5m ago", "2h ago") are not displayed for guest users; clicking the bell icon opens the Login Required modal instead of a notification panel
  - **Business Rules**: Auth guard for personal notifications

---

## 2. Abnormal Scenarios (A) — Error & Negative Paths

- [ ] **A-01**: Keyword exceeding 255 characters shows validation error
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: User is on `/products`
  - **Steps**:
    1. Enter a keyword longer than 255 characters
  - **Expected Result**: Validation error "Keyword must be 255 characters or fewer" (VAL-SEARCH-001); query not sent
  - **Business Rules**: BR-SEARCH-001
  - **API**: `GET /api/v1/search/products`

- [ ] **A-02**: Minimum price greater than maximum price shows validation error
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: User is on `/products`
  - **Steps**:
    1. Set Min Price = 100 and Max Price = 50
  - **Expected Result**: Inline error "Minimum price cannot exceed maximum price" (VAL-SEARCH-007); filters not applied
  - **Business Rules**: BR-SEARCH-008
  - **API**: `GET /api/v1/search/products`

- [ ] **A-03**: Negative price values show validation error
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: User is on `/products`
  - **Steps**:
    1. Enter Min Price = -5 (and repeat for Max Price = -5)
  - **Expected Result**: Inline error "Minimum/Maximum price must be 0 or more" (VAL-SEARCH-005/006); filters not applied
  - **Business Rules**: BR-SEARCH-008
  - **API**: `GET /api/v1/search/products`

- [ ] **A-04**: Rating outside 1–5 range rejected
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: User is on `/products`
  - **Steps**:
    1. Provide an out-of-range rating value (0 or 6) via URL or control
  - **Expected Result**: Validation error "Rating must be between 1 and 5"; invalid value not applied
  - **Business Rules**: BR-SEARCH-009
  - **API**: `GET /api/v1/search/products?rating=6`

- [ ] **A-05**: Invalid category UUID rejected
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: User is on `/products`
  - **Steps**:
    1. Navigate to `/products?categoryId=not-a-uuid`
  - **Expected Result**: Validation error "Invalid category ID"; query not executed / defaults restored
  - **Business Rules**: BR-SEARCH-010
  - **API**: `GET /api/v1/search/products?categoryId=not-a-uuid`

- [ ] **A-06**: Guest shopping action prompts login
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: User is not authenticated (guest)
  - **Steps**:
    1. Navigate to `/products`
    2. Click a product card's wishlist (heart) button
    3. Repeat for the Add-to-cart button
  - **Expected Result**: A "Login Required" dialog opens instead of sending the request. Wishlist shows the message `buyer.search.guestWishlist` ("Please log in to use the wishlist"); cart shows `buyer.search.guestCart` ("Please log in to add items to your cart"). The dialog offers Cancel (closes) and Login (navigates to `/login`). No cart/wishlist request is issued.
  - **Business Rules**: None (Auth guard on shopping action)
  - **API**: None (request is not sent; the guard runs client-side in `Products.tsx`)

- [ ] **A-07**: Merchant/Admin shopping action blocked
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: User is authenticated as merchant or admin
  - **Steps**:
    1. Navigate to `/products`
    2. Attempt to add a product to cart/wishlist
  - **Expected Result**: Destructive alert banner "Shopping features are only available to buyers" (no auto-close); request returns 403 `SHOPPING_NOT_ALLOWED`
  - **Business Rules**: None (Role restriction)
  - **API**: Protected cart/wishlist endpoint (returns 403)

- [ ] **A-08**: Network error shows inline error state
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: Network to `/api/v1/search/products` is failing/offline
  - **Steps**:
    1. Navigate to `/products` with the API unreachable
  - **Expected Result**: Inline error state renders ("Something went wrong" + "Failed to load products. Please try again."); the request is not automatically retried
  - **Business Rules**: None (Error handling)
  - **API**: `GET /api/v1/search/products`

- [ ] **A-09**: Server error (500) shows generic error banner
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: `/api/v1/search/products` returns 500
  - **Steps**:
    1. Trigger a 500 response
  - **Expected Result**: Inline error state renders ("Something went wrong"); no retry button is shown
  - **Business Rules**: None (Error handling)
  - **API**: `GET /api/v1/search/products`

- [ ] **A-10**: Rate limit (429) shows countdown banner
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: More than 60 requests per IP per minute to `/api/v1/search/products`
  - **Steps**:
    1. Exceed the rate limit
  - **Expected Result**: Banner "Too many requests. Please wait {seconds} seconds" with retry countdown
  - **Business Rules**: BR-SEARCH-005 (rate limiting)
  - **API**: `GET /api/v1/search/products`

- [ ] **A-11**: Non-existent product slug returns not-found
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: No active product with the slug exists
  - **Steps**:
    1. Navigate to `/products/this-slug-does-not-exist`
  - **Expected Result**: 404 not-found page/state (inactive or unapproved product also treated as not found)
  - **Business Rules**: BR-SEARCH-012, BR-SEARCH-013
  - **API**: `GET /api/v1/search/products/:slug`

> **A-12 … A-14** (duplicate wishlist/cart guards) are defined in `SearchAndFilter_Buyer_PCL.md`.

- [ ] **A-12**: Product list request failure shows the inline error state
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: `GET /api/v1/search/products` fails (network/500)
  - **Steps**:
    1. Navigate to `/products` with the API failing
  - **Expected Result**: Inline error state renders ("Something went wrong" + "Failed to load products. Please try again."); no product grid is shown
  - **Business Rules**: None (error handling)
  - **API**: `GET /api/v1/search/products`
  - **Note**: The page shows an inline error block — it does not render a retry button or status-specific banners.

- [ ] **A-13**: Price validation error blocks URL/query updates and cancels the in-flight request
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: User is on `/products`; an invalid price range is committed (min > max or negative)
  - **Steps**:
    1. Enter Min = 100 and Max = 50, then blur the field
  - **Expected Result**: Inline error renders and `aria-invalid="true"` is set; the products query is disabled/cancelled; the URL is not updated with the invalid range; results area shows no products while invalid
  - **Business Rules**: BR-SEARCH-008
  - **API**: `GET /api/v1/search/products`
  - **Note**: `Products.tsx` sets `hasPriceValidationError` and calls `queryClient.cancelQueries({ queryKey: ['products'] })`.

- [ ] **A-14**: Sponsored-ad request failure is isolated from product results
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: `GET /api/v1/search/ads` fails (network/500) while `search/products` succeeds
  - **Steps**:
    1. Navigate to `/products` with the ads endpoint broken
  - **Expected Result**: Product results still load and render normally; the ad slider renders nothing (no error banner, no blocking); the failure is not surfaced to the page
  - **Business Rules**: BR-SEARCH-026
  - **API**: `GET /api/v1/search/ads?placement=search_page_banner`

> Wishlist/cart failure handling is defined in `SearchAndFilter_Buyer_PCL.md`.

---

## 3. Boundary Scenarios (B) — Edge Cases & Limits

- [ ] **B-01**: Keyword at maximum length (255 chars) accepted
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: User is on `/products`
  - **Steps**:
    1. Enter exactly 255 characters as the keyword
  - **Expected Result**: Input accepted; query executes (may return empty results)
  - **Business Rules**: BR-SEARCH-001

- [ ] **B-02**: Keyword exceeding maximum length (256 chars) rejected
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: User is on `/products`
  - **Steps**:
    1. Enter exactly 256 characters as the keyword
  - **Expected Result**: Validation error or input truncated; no oversized query sent
  - **Business Rules**: BR-SEARCH-001

- [ ] **B-03**: Limit at minimum (1) and maximum (100) accepted
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: User is on `/products`
  - **Steps**:
    1. Set `limit=1`, then `limit=100` in URL
  - **Expected Result**: Both accepted; number of items per page matches
  - **Business Rules**: BR-SEARCH-016

- [ ] **B-04**: Limit exceeding maximum (101) rejected
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: User is on `/products`
  - **Steps**:
    1. Navigate to `/products?limit=101`
  - **Expected Result**: Validation error "Limit must be between 1 and 100" (or clamped); no oversized page returned
  - **Business Rules**: BR-SEARCH-016

- [ ] **B-05**: Page beyond range clamped to last page or empty state
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: `totalPages` is e.g. 3 but `page=99` requested
  - **Steps**:
    1. Navigate to `/products?page=99`
  - **Expected Result**: Clamped to last page or friendly empty state; no crash
  - **Business Rules**: BR-SEARCH-016

- [ ] **B-06**: Empty results show the empty state (no reset button)
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: No products match the query
  - **Steps**:
    1. Navigate to `/products?q=xyznonexistent`
  - **Expected Result**: The empty state renders a search icon plus `buyer.search.noProducts` ("No products found") and `buyer.search.noProductsHint` ("Try adjusting your search or filter criteria."); there is **no** reset/filters button in the empty state — the user clears criteria via the filter panel or chips
  - **Business Rules**: None (UI)
  - **Note**: `Products.tsx` renders a plain message block when `products.length === 0`.

- [ ] **B-07**: Empty category tree renders gracefully
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: `categories` table is empty
  - **Steps**:
    1. Navigate to `/products`
    2. Open the Categories accordion
  - **Expected Result**: Categories group shows an empty/placeholder state without errors
  - **Business Rules**: None (UI)

- [ ] **B-08**: Price bounds at minimum (0) accepted
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: User is on `/products`
  - **Steps**:
    1. Set Min Price = 0 (and/or Max Price = 0)
  - **Expected Result**: `0` accepted as a valid bound (min ≥ 0 rule)
  - **Business Rules**: BR-SEARCH-008

- [ ] **B-09**: Rating at boundaries (1 and 5) accepted
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: User is on `/products`
  - **Steps**:
    1. Set `rating=1`, then `rating=5`
  - **Expected Result**: Both accepted; `rating=5` returns only top-rated products
  - **Business Rules**: BR-SEARCH-009

- [ ] **B-10**: Out-of-stock products listed but flagged
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: A product has `stockQuantity = 0`
  - **Steps**:
    1. Search for that product
  - **Expected Result**: Product remains listed with `isInStock: false` ("Out of stock" flag)
  - **Business Rules**: BR-SEARCH-014

- [ ] **B-11**: Inactive / unapproved products excluded from results
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: Products exist with `isActive=false`, an unapproved shop, or an unapproved merchant
  - **Steps**:
    1. Search a keyword matching those products
  - **Expected Result**: None of those products appear in results (or product detail returns 404)
  - **Business Rules**: BR-SEARCH-012, BR-SEARCH-013

- [ ] **B-12**: Fallback sample ads render when no eligible ads are returned
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: `GET /api/v1/search/ads?placement=search_page_banner` resolves successfully but returns zero eligible ads (or only out-of-schedule/unapproved ads)
  - **Steps**:
    1. Navigate to `/products`
  - **Expected Result**: The slider shows the built-in `FALLBACK_ADS` sample slides (e.g. "Daily Moisture Cream") rather than an empty/hidden panel; product results are unaffected. The panel is hidden only while the ads request is pending or errors out
  - **Business Rules**: BR-SEARCH-026
  - **API**: `GET /api/v1/search/ads?placement=search_page_banner`
  - **Note**: `SponsoredAdSlider` selects `activeAds.length > 0 ? activeAds : (!isPending && !isError ? FALLBACK_ADS : [])`.

- [ ] **B-13**: More than 5 eligible ads capped at 5 by tier priority
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: > 5 eligible `search_page_banner` ads across tiers
  - **Steps**:
    1. Navigate to `/products`
  - **Expected Result**: At most 5 ads shown, ordered Premium → Standard → Basic with round-robin within tier
  - **Business Rules**: BR-SEARCH-026
  - **Note**: The 5-ad cap and tier ordering are enforced by the ads API; the slider renders every eligible slide it receives.

- [ ] **B-14**: Default page limit is 12; page-size options are 12 / 24 / 48
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: User is on `/products` with no `limit` param
  - **Steps**:
    1. Navigate to `/products`
    2. Observe the request and any page-size control
  - **Expected Result**: Default `limit` is 12; `limit` is omitted from the URL while it equals 12; selectable page sizes are 12, 24, 48
  - **Business Rules**: BR-SEARCH-016
  - **API**: `GET /api/v1/search/products`
  - **Note**: `searchParamsSchema` default `limit = 12`; `PAGE_SIZE_OPTIONS = [12, 24, 48]`.

- [ ] **B-15**: Rating filter exposes only 3.0+ through 4.5+ options
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: User is on `/products` with the filter panel open
  - **Steps**:
    1. Inspect the Rating group options
  - **Expected Result**: Exactly four options render (4.5+, 4.0+, 3.5+, 3.0+); no 1–2.5 star options are offered in the UI even though the schema permits 1–5
  - **Business Rules**: BR-SEARCH-009
  - **Note**: `RATING_OPTIONS = [4.5, 4.0, 3.5, 3.0]` in `FilterPanel.tsx`.

- [ ] **B-16**: Category list shows 5 items then View More / View Less
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: More than 5 flattened categories (including "All")
  - **Steps**:
    1. Open the Category group filter
  - **Expected Result**: 5 items shown; "View More" appears and toggles to "View Less" after expansion
  - **Business Rules**: None (UI)

- [ ] **B-17**: Equal minimum and maximum price accepted
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: User is on `/products`
  - **Steps**:
    1. Set Min Price = 50 and Max Price = 50, then blur
  - **Expected Result**: No validation error (only `min > max` is rejected); query executes with `minPrice=50&maxPrice=50`
  - **Business Rules**: BR-SEARCH-008
  - **API**: `GET /api/v1/search/products?minPrice=50&maxPrice=50`

- [ ] **B-18**: Exactly 5 category items hides the View More control
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: The flattened category list (including "All") contains exactly 5 items
  - **Steps**:
    1. Open the Category group in the filter panel
  - **Expected Result**: All 5 items render and no "View More"/"View Less" button appears
  - **Business Rules**: None (UI)
  - **Note**: `CategorySelect` shows the toggle only when `allItems.length > COLLAPSED_COUNT` (5).

- [ ] **B-19**: Single-page results hide pagination
  - **Evidence**:
    - No evidence captured yet; scenario-specific verification is pending
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: A query returns `total > 0` but `totalPages = 1`
  - **Steps**:
    1. Apply a filter that yields a single page of results
  - **Expected Result**: The product grid renders and the pagination nav is not rendered at all
  - **Business Rules**: BR-SEARCH-016
  - **Note**: `Products.tsx` renders pagination only when `meta.total > 0 && meta.totalPages > 1`.

> Buyer cart/wishlist boundary scenarios are defined in `SearchAndFilter_Buyer_PCL.md`.

---

## 4. Interface Scenarios (I) — API Contracts & Payloads

> API contract tests — no screenshots by design. Evidence lines reference the test title and status only.

- [ ] **I-01**: `GET /api/v1/search/products` — returns 200 with list and pagination meta
  - **Evidence**:
    - No API contract evidence captured yet; scenario-specific contract test is pending implementation
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: Products exist; valid query params supplied
  - **Steps**:
    1. Call `GET /api/v1/search/products` with valid query parameters
  - **Expected Response**: Status 200; JSON `{ data: [ProductSummaryDto], meta: { page, limit, total, totalPages } }`; decimals (`price`, `compareAtPrice`, `avgRating`) returned as strings
  - **Business Rules**: BR-SEARCH-018
  - **API**: `GET /api/v1/search/products`

- [ ] **I-02**: `GET /api/v1/search/products` — defaults applied when no params supplied
  - **Evidence**:
    - No API contract evidence captured yet; scenario-specific contract test is pending implementation
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: Products exist
  - **Steps**:
    1. Call `GET /api/v1/search/products` with no query params
  - **Expected Response**: Status 200; sorted by `createdAt desc`; `page=1`, `limit=12`; correct `total`
  - **Business Rules**: BR-SEARCH-016
  - **API**: `GET /api/v1/search/products`
  - **Note**: `searchParamsSchema` default `limit = 12` (shared by the client and asserted by B-14).

- [ ] **I-03**: `GET /api/v1/search/products` — returns 400 for invalid query params
  - **Evidence**:
    - No API contract evidence captured yet; scenario-specific contract test is pending implementation
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: Invalid params (e.g. `limit=101`, bad `skinTypes` enum, `q` > 255)
  - **Steps**:
    1. Call `GET /api/v1/search/products` with each invalid param
  - **Expected Response**: Status 400 `BAD_REQUEST` with validation messages
  - **Business Rules**: None (validation)
  - **API**: `GET /api/v1/search/products`

- [ ] **I-04**: `GET /api/v1/search/products` — returns 429 when rate limit exceeded
  - **Evidence**:
    - No API contract evidence captured yet; scenario-specific contract test is pending implementation
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: > 60 requests per IP in 1 minute
  - **Steps**:
    1. Issue requests beyond the limit
  - **Expected Response**: Status 429 `TOO_MANY_REQUESTS` with `retryAfter`
  - **Business Rules**: BR-SEARCH-005
  - **API**: `GET /api/v1/search/products`

- [ ] **I-05**: `GET /api/v1/search/categories` — returns 200 with nested category tree
  - **Evidence**:
    - No API contract evidence captured yet; scenario-specific contract test is pending implementation
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: Categories exist
  - **Steps**:
    1. Call `GET /api/v1/search/categories`
  - **Expected Response**: Status 200; JSON `{ data: [CategoryNodeDto] }` with recursive `children`, ordered by `sortOrder`
  - **Business Rules**: None
  - **API**: `GET /api/v1/search/categories`

- [ ] **I-06**: `GET /api/v1/search/products/:slug` — returns 200 with product detail
  - **Evidence**:
    - No API contract evidence captured yet; scenario-specific contract test is pending implementation
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: Active product with valid slug and approved shop/merchant
  - **Steps**:
    1. Call `GET /api/v1/search/products/:slug`
  - **Expected Response**: Status 200; JSON `{ data: ProductDetailDto }` including `ingredients`, `stockQuantity`, `isInStock`, `category`, `shop`
  - **Business Rules**: BR-SEARCH-012, BR-SEARCH-013
  - **API**: `GET /api/v1/search/products/:slug`

- [ ] **I-07**: `GET /api/v1/search/products/:slug` — returns 404 for non-existent/inactive/unapproved
  - **Evidence**:
    - No API contract evidence captured yet; scenario-specific contract test is pending implementation
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: No active product with the slug, or product inactive / shop unapproved / merchant unapproved
  - **Steps**:
    1. Call `GET /api/v1/search/products/:slug` with such a slug
  - **Expected Response**: Status 404 `NOT_FOUND`
  - **Business Rules**: BR-SEARCH-012, BR-SEARCH-013
  - **API**: `GET /api/v1/search/products/:slug`

- [ ] **I-08**: `GET /api/v1/search/ads?placement=search_page_banner` — returns 200 with eligible ads
  - **Evidence**:
    - No API contract evidence captured yet; scenario-specific contract test is pending implementation
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: Approved, in-schedule `search_page_banner` ads exist
  - **Steps**:
    1. Call `GET /api/v1/search/ads?placement=search_page_banner`
  - **Expected Response**: Status 200; JSON `{ data: [SponsoredAdDto] }`, max 5, tier-priority ordered; empty array when none
  - **Business Rules**: BR-SEARCH-013, BR-SEARCH-026, BR-SEARCH-028
  - **API**: `GET /api/v1/search/ads?placement=search_page_banner`

- [ ] **I-09**: `GET /api/v1/search/ads` — returns 400 for invalid placement
  - **Evidence**:
    - No API contract evidence captured yet; scenario-specific contract test is pending implementation
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: Invalid or missing `placement`
  - **Steps**:
    1. Call `GET /api/v1/search/ads?placement=unknown`
  - **Expected Response**: Status 400 `BAD_REQUEST` "Invalid placement value"
  - **Business Rules**: None (validation)
  - **API**: `GET /api/v1/search/ads`

- [ ] **I-10**: Error responses follow the standard API format
  - **Evidence**:
    - No API contract evidence captured yet; scenario-specific contract test is pending implementation
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: Any error scenario
  - **Steps**:
    1. Trigger an error
  - **Expected Response**: JSON contains `{ statusCode, message, error, timestamp, path }`
  - **Business Rules**: None (error format)
  - **API**: Any endpoint

- [ ] **I-11**: Product list responses are cached with TTL
  - **Evidence**:
    - No API contract evidence captured yet; scenario-specific contract test is pending implementation
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: A prior identical query has populated Redis
  - **Steps**:
    1. Repeat an identical `GET /api/v1/search/products` request
  - **Expected Response**: Second request served from `cache:products:list:{hash}` (TTL 120s) without a DB read
  - **Business Rules**: BR-SEARCH-005
  - **API**: `GET /api/v1/search/products`

- [ ] **I-12**: `GET /api/v1/search/products` — list endpoint used by the page, array params repeated
  - **Evidence**:
    - No API contract evidence captured yet; scenario-specific contract test is pending implementation
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: Products exist; multi-value filters supplied
  - **Steps**:
    1. Call the list endpoint with `skinTypes`, `ingredients`, and/or `tags` as arrays
  - **Expected Response**: Status 200; JSON `{ data: ProductListResponse }` wrapped in `{ data }`; array params serialized as repeated keys (e.g. `skinTypes=dry&skinTypes=oily`); `limit` sent only when different from the default
  - **Business Rules**: BR-SEARCH-018
  - **API**: `GET /api/v1/search/products`
  - **Note**: Frontend service (`product.service.ts`) calls `GET /api/v1/search/products` through the api-client (base URL `http://localhost:8080/api/v1`). `product.service.ts` omits `limit` only when it equals `20`, while the schema default is `12`, so a default request currently sends `limit=12` explicitly.

- [ ] **I-13**: `GET /api/v1/search/categories` — returns the nested category tree
  - **Evidence**:
    - No API contract evidence captured yet; scenario-specific contract test is pending implementation
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: Categories exist
  - **Steps**:
    1. Call the categories endpoint
  - **Expected Response**: Status 200; nested `CategoryNode[]` with recursive `children`; response cached client-side with a 30-minute `staleTime`
  - **Business Rules**: None
  - **API**: `GET /api/v1/search/categories`

- [ ] **I-14**: `GET /api/v1/search/ads` — request contract used by the slider
  - **Evidence**:
    - No API contract evidence captured yet; scenario-specific contract test is pending implementation
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: The slider mounts on `/products`
  - **Steps**:
    1. Observe the ads request issued by `adService.getByPlacement`
  - **Expected Response**: `placement` is the only query param (`search_page_banner` hard-coded in `SponsoredAdSlider.tsx`); response is `{ data: { data: [SponsoredAdDto] } }` (service returns `response.data.data`); the React Query key is `['ads', 'search_page_banner']` with `staleTime: 0` (always re-fetched on mount)
  - **Business Rules**: BR-SEARCH-026
  - **API**: `GET /api/v1/search/ads?placement=search_page_banner`

- [ ] **I-15**: Ad SKU hydration calls the buyer products endpoint
  - **Evidence**:
    - No API contract evidence captured yet; scenario-specific contract test is pending implementation
    - Test: pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: The slider renders ads that carry a `sku`
  - **Steps**:
    1. Observe the request issued by `useAdProducts(skus)`
  - **Expected Response**: Each SKU is fetched (in parallel) via the buyer products service `getDetail(sku)` → `GET /api/v1/products/:sku`; SKUs are trimmed, de-duplicated, and sorted before fetching; failed lookups resolve to `null` and are dropped (`retry: false`); the query is disabled when no SKUs exist and cached for 5 minutes
  - **Business Rules**: None (ad presentation)
  - **API**: `GET /api/v1/products/:sku`
  - **Note**: Ad-*product* hydration intentionally uses the buyer catalog detail endpoint; product *search/list*, categories, ads, and the search detail endpoint live under `/api/v1/search/...`.

> Wishlist/cart endpoint contracts are defined in `SearchAndFilter_Buyer_PCL.md`.

---

## Sign-Off

| Item | Status |
|------|--------|
| Test scenarios defined (N, A, B, I) | ☑️ |
| E2E tests implemented | ☐ |
| PCL auto-update verified | ☐ |
| Next review date | 2026-10-28 |
