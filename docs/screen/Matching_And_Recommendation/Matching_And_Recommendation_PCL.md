# Program Checklist (PCL) — Matching & Recommendation

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-PCL-MATCH-001 |
| **Target Screen** | Matching & Recommendation |
| **Subsystem** | Product Discovery |
| **Version** | 1.0 |
| **Created** | 2026-10-14 |
| **Last Updated** | 2026-10-14 |
| **Status** | Active |
| **Source Specs** | DD_MATCH_01–06; 機能設計書 / 画面項目設計書 (Matching_And_Recommendation) |

---

## 1. Normal Scenarios (N) — Happy Path

- [ ] **N-01**: View personalized recommendations with a completed skin analysis
  - **Precondition**: Authenticated buyer has a completed AI skin analysis and eligible products exist
  - **Steps**:
    1. Navigate to `/buyer/recommendations`
    2. Inspect the source badge and recommendation cards
  - **Expected Result**: AI Analysis badge and match score badges are shown; recommendations are displayed in the desktop grid
  - **Business Rules**: BR-MATCH-001, BR-MATCH-021, BR-MATCH-022
  - **API**: `GET /api/v1/recommendations/personalized`
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [ ] **N-02**: View generic recommendations without a skin analysis
  - **Precondition**: Authenticated buyer has no completed skin analysis and featured products exist
  - **Steps**:
    1. Navigate to `/buyer/recommendations`
    2. Inspect the source badge, prompt banner, and product cards
  - **Expected Result**: General Picks badge and skin analysis prompt are shown; generic cards do not show match scores
  - **Business Rules**: BR-MATCH-001
  - **API**: `GET /api/v1/recommendations/personalized`
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [ ] **N-03**: Show the refresh prompt for stale analysis
  - **Precondition**: Authenticated buyer has a completed analysis older than 24 hours
  - **Steps**:
    1. Navigate to `/buyer/recommendations`
    2. Inspect the source badge, product scores, and freshness prompt
    3. Click `Retake Analysis`
  - **Expected Result**: AI Analysis badge and match scores remain visible with a subtle `Want Fresh Results?` prompt; CTA navigates to `/buyer/skin-analysis`
  - **Business Rules**: BR-MATCH-001, BR-MATCH-004
  - **API**: `GET /api/v1/recommendations/personalized`
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [ ] **N-04**: Filter recommendations by skin type, price, category, and rating
  - **Precondition**: Authenticated buyer is on the recommendations page; products matching the chosen filters exist. No ingredient picker is rendered — `FiltersPanel` offers category, price, skin type, and rating only; `ingredients` remains an API-level filter (`matchQuerySchema`) with no UI control.
  - **Steps**:
    1. Set a skin type filter
    2. Set minimum and maximum prices
    3. Select a category and a minimum rating
    4. Inspect results and the page query state
  - **Expected Result**: Results meet the selected filters and pagination resets to page 1
  - **Business Rules**: BR-MATCH-006
  - **API**: `GET /api/v1/recommendations/personalized`
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [ ] **N-05**: Sort and paginate recommendation results
  - **Precondition**: Recommendation result set contains enough products for multiple pages
  - **Steps**:
    1. Select price sort and ascending order
    2. Navigate to page 2
    3. Inspect order and active page
  - **Expected Result**: Products are ordered by price ascending and the requested page is displayed; pagination keeps prior data without a full skeleton flash (`placeholderData: prev => prev`)
  - **Business Rules**: BR-MATCH-024, BR-MATCH-025, BR-MATCH-026, BR-MATCH-027
  - **API**: `GET /api/v1/recommendations/personalized`
  - **Note**: Unchecked because no matching Playwright evidence has been recorded. Actual code scrolls `main`/window to top only on first arrival, not on page change.

- [ ] **N-06**: Reset applied filters
  - **Precondition**: At least one recommendation filter is applied
  - **Steps**:
    1. Click `Reset Filters`
    2. Inspect filter controls and results
  - **Expected Result**: Filter parameters are cleared, page resets to 1, and default results return
  - **Business Rules**: None (UI behavior)
  - **API**: `GET /api/v1/recommendations/personalized`
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [ ] **N-07**: Open a recommended product
  - **Precondition**: Recommendation cards are displayed
  - **Steps**:
    1. Click a recommendation card
  - **Expected Result**: Browser navigates to `/buyer/products/:slug` for that product
  - **Business Rules**: None (navigation)
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [ ] **N-08**: View and expand recommendation history
  - **Precondition**: Authenticated buyer has past analysis sessions with recommendations
  - **Steps**:
    1. Navigate to `/buyer/recommendations`
    2. Expand a session in the history section
  - **Expected Result**: Sessions are grouped with date headers; expanding a session shows its recommended product mini-cards
  - **Business Rules**: None (history display)
  - **API**: `GET /api/v1/recommendations/history`
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [ ] **N-09**: View similar products from a product detail page
  - **Precondition**: Similar-products section exists on the product detail screen. Not implemented in this screen's code — `MatchingRecommendations.tsx` never calls `useSimilarProducts`/`matchingService.getSimilar`; similar products live in `ProductDetail.tsx` → `SimilarProducts.tsx` (`useProductDetail.ts`), owned by the Product Detail screen.
  - **Steps**:
    1. Open the product detail page
    2. Inspect the Similar Products section
    3. Open one similar product
  - **Expected Result**: Similar products are shown and selecting one navigates to its product page (verified on the Product Detail screen, not here)
  - **Business Rules**: BR-MATCH-021, BR-MATCH-022
  - **API**: `GET /api/v1/recommendations/similar/:productId`
  - **Note**: Unchecked — out of scope for this screen's code; kept for traceability to UC-MATCH-002.

- [ ] **N-10**: Display sponsored ads and record panel impression
  - **Precondition**: Eligible approved ads exist for the `recommendation_page_banner` placement. Actual component: shared `AdBannerSlider` (not the unused `AdSlidePanel` in this feature folder).
  - **Steps**:
    1. Navigate to `/buyer/recommendations`
    2. Scroll until at least 50% of the ad panel is visible (`IMPRESSION_VISIBILITY_THRESHOLD = 0.5`, `useSponsoredAds` + schedule filter `approved` + in-window, placement match)
    3. Inspect the disclosure (`Sponsored` badge) and impression request
  - **Expected Result**: Eligible ads and disclosure are displayed; impression tracking (`matchingService.trackImpression`) is sent when visibility reaches at least 50%; hides entirely while pending/failed/expired/empty
  - **Business Rules**: BR-MATCH-037, BR-MATCH-049, BR-MATCH-050, BR-MATCH-051
  - **API**: `GET /api/v1/ads/panel`; `POST /api/v1/ads/track/impression`
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [ ] **N-11**: Follow a sponsored ad call to action
  - **Precondition**: Ad panel contains an eligible ad. `AdBannerSlider` resolves SKU product, fallback product, target/link URL, then catalog fallback; HTTP(S) destinations use `window.location.assign`, app paths use router navigation.
  - **Steps**:
    1. Click the ad call to action
    2. Inspect navigation and the click tracking request
  - **Expected Result**: Click is tracked (`matchingService.trackClick`) and the resolved internal or external destination opens.
  - **Business Rules**: BR-MATCH-037
  - **API**: `POST /api/v1/ads/track/click`
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [ ] **N-12**: Change the interface language via the app-shell toggle
  - **Precondition**: Recommendations page is open. This screen's own code renders hardcoded English strings (no `useTranslation` in `MatchingRecommendations.tsx`); language switching is provided only by the app-shell `LanguageToggle` in `BuyerDashboardLayout`.
  - **Steps**:
    1. Change language to Japanese via the layout toggle
    2. Change language to Myanmar
    3. Change language back to English
  - **Expected Result**: Shell/chrome labels update; this screen's hardcoded strings remain English until its i18n is implemented
  - **Business Rules**: None (i18n; screen-level i18n not implemented in this file)
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [ ] **N-13**: Render recommendation layout at desktop, tablet, and mobile widths
  - **Precondition**: Recommendations are available. Product grid uses `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`; filter sheet (`Sheet`) is available below `lg`.
  - **Steps**:
    1. Set viewport to desktop width (1024px or wider)
    2. Set viewport to tablet width (768px)
    3. Set viewport below 768px
  - **Expected Result**: Desktop uses sidebar filters and a 3-column grid at `lg`; below `lg`, filters use a sheet. Product grid uses 2 columns at `sm` and 1 column below `sm`.
  - **Business Rules**: None (responsive layout)
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [ ] **N-14**: Append results with Load More on mobile
  - **Precondition**: Not implemented — numbered pagination is the only paging control in this screen. Earlier design text described Load More; the current source does not implement it.
  - **Steps**:
    1. Set viewport to mobile width (below 768px)
    2. Navigate to `/buyer/recommendations`
    3. Confirm the `Load More` button is visible instead of desktop pagination
    4. Click `Load More`
  - **Expected Result**: Additional results are appended to the grid; filters drawer remains available
  - **Business Rules**: BR-MATCH-026, BR-MATCH-027
  - **API**: `GET /api/v1/recommendations/personalized`
  - **Note**: Unchecked — process not present in source code (no Load More control). Implement or remove from scope.

- [ ] **N-15**: Toggle wishlist from a recommendation card
  - **Precondition**: Recommendation cards are displayed (`MatchingRecommendations.tsx` `handleWishlistToggle`)
  - **Steps**:
    1. Click the heart button on a card not in the wishlist
    2. Click the heart button on a card already in the wishlist
  - **Expected Result**: Add shows `Added to wishlist` toast and fills the heart red; remove shows `Removed from wishlist` toast; duplicate (409) shows `Already in your wishlist` info toast
  - **Business Rules**: None (wishlist integration; owned by Wishlist team)
  - **API**: Wishlist add/remove endpoints
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [ ] **N-16**: Add to cart from a recommendation card
  - **Precondition**: Recommendation cards are displayed for in-stock products (`handleAddToCart`); out-of-stock cards hide the cart button
  - **Steps**:
    1. Click the cart button on an in-stock card
    2. Click the cart button on a card already in the cart (or when API returns 409)
  - **Expected Result**: First add shows `Added to cart` toast; duplicate opens the `Already in Cart` dialog; out-of-stock cards show no cart button
  - **Business Rules**: None (cart integration; owned by Cart team)
  - **API**: `POST /api/v1/cart/items`
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [ ] **N-17**: Switch product grid between grid and list views
  - **Precondition**: Recommendation results are displayed (`ViewToggle` in the sort bar)
  - **Steps**:
    1. Click the List view toggle
    2. Click the Grid view toggle
  - **Expected Result**: List shows stacked cards, grid restores the responsive card grid; URL query params are unchanged (view is local state only)
  - **Business Rules**: None (UI behavior)
  - **API**: None (client-side)
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [ ] **N-18**: Filter by category, rating, and price validation states
  - **Precondition**: Recommendations page is open (`FiltersPanel`: `CategorySelect`, price Min/Max, `RATING_OPTIONS` 4.5/4.0/3.5/3.0)
  - **Steps**:
    1. Select a category via `CategorySelect`
    2. Select a minimum rating (e.g. `4.5+ Stars`)
    3. Enter an invalid price (negative or non-numeric) and blur
  - **Expected Result**: Category and rating filters narrow results and reset to page 1; negative/non-numeric price shows an inline `role="alert"` error; min greater than max also shows an inline error (the range is committed, so the API can return no results).
  - **Business Rules**: BR-MATCH-006
  - **API**: `GET /api/v1/recommendations/personalized`
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [ ] **N-19**: Default sort is Newest and invalid sorts fall back to Newest
  - **Precondition**: Recommendations page loads with no explicit sort (`resolveMatchingSort`, `DEFAULT_MATCHING_SORT`)
  - **Steps**:
    1. Load `/buyer/recommendations` with a bare URL and inspect the sort select and URL
    2. Open a URL with `sort=matchScore` on generic (unscored) results
  - **Expected Result**: Bare URL pins `sort=createdAt&order=desc` via replace (select shows Newest, page preserved); undisplayable sorts fall back to Newest instead of a placeholder
  - **Business Rules**: BR-MATCH-024, BR-MATCH-025
  - **API**: `GET /api/v1/recommendations/personalized`
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [ ] **N-20**: Expand all history sessions with See more
  - **Precondition**: Buyer has more than 5 history sessions (page initially fetches 5, expanded fetches 50)
  - **Steps**:
    1. Navigate to `/buyer/recommendations` and inspect the history section
    2. Click `See more (N more)`
    3. Click `Show less`
  - **Expected Result**: First 5 sessions shown inline; See more loads all (up to 50/page) in place without navigation; Show less collapses back
  - **Business Rules**: None (history display)
  - **API**: `GET /api/v1/recommendations/history`
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [ ] **N-21**: Open and apply filters from the mobile filter sheet
  - **Precondition**: Viewport below `lg` (`mobileFilterOpen` `Sheet`, `setMobileFilterOpen`; `Show {meta.total} Products` confirm button, `Clear All` reset)
  - **Steps**:
    1. Set viewport below 1024px and open the Filters sheet
    2. Change a filter and click `Show {N} Products`
    3. Reopen the sheet and click `Clear All`
  - **Expected Result**: Sheet opens with the full `FiltersPanel`; confirm applies filters and closes; Clear All resets via `resetFilters`
  - **Business Rules**: BR-MATCH-006
  - **API**: `GET /api/v1/recommendations/personalized`
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [ ] **N-22**: Remove individual filters via filter chips
  - **Precondition**: Filters are applied (`hasFilterChips`, `MatchingFilterChips` with `handleRemoveFilterChip`: per-chip X buttons in the desktop sidebar and the mobile row below `lg`, plus `Clear All`/`onClearAll`)
  - **Steps**:
    1. Apply multiple filters
    2. Click one chip's X button
    3. Click `Clear All` on the chips row
  - **Expected Result**: Single chip removal clears only that filter value (skin-type chip removes one type); Clear All resets everything
  - **Business Rules**: BR-MATCH-006
  - **API**: `GET /api/v1/recommendations/personalized`
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

---

## 2. Abnormal Scenarios (A) — Error & Negative Paths

- [ ] **A-01**: Open recommendations without authentication
  - **Precondition**: User is not authenticated
  - **Steps**:
    1. Navigate directly to `/buyer/recommendations`
  - **Expected Result**: User is redirected to `/login`
  - **Business Rules**: None (route authentication)
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [ ] **A-02**: Reject invalid personalized recommendation query parameters
  - **Precondition**: Valid buyer token is available
  - **Steps**:
    1. Request personalized recommendations with an invalid sort field or invalid filter value
  - **Expected Response**: HTTP 400 `BAD_REQUEST`
  - **Business Rules**: BR-MATCH-025
  - **API**: `GET /api/v1/recommendations/personalized`
  - **Note**: Unchecked because no API test evidence has been recorded.

- [ ] **A-03**: Reject personalized recommendations for a non-buyer role
  - **Precondition**: Authenticated user has a role other than buyer
  - **Steps**:
    1. Request `GET /api/v1/recommendations/personalized`
  - **Expected Response**: HTTP 403 `FORBIDDEN`
  - **Business Rules**: None (role guard)
  - **API**: `GET /api/v1/recommendations/personalized`
  - **Note**: Unchecked because no API test evidence has been recorded.

- [ ] **A-04**: Handle recommendations request failure and retry
  - **Precondition**: Recommendations page is open and the API can be made to fail once
  - **Steps**:
    1. Cause a network error for the recommendations request
    2. Confirm the error banner appears
    3. Click `Retry`
  - **Expected Result**: Error banner offers retry and the query is refetched
  - **Business Rules**: None (error handling)
  - **API**: `GET /api/v1/recommendations/personalized`
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [ ] **A-05**: Reject similar-products request for invalid or missing product
  - **Precondition**: No valid source product matching the requested ID
  - **Steps**:
    1. Request similar products using a malformed UUID
    2. Request similar products using a valid UUID for a non-existent product
  - **Expected Response**: HTTP 400 `BAD_REQUEST` for malformed ID; HTTP 404 `NOT_FOUND` for missing product
  - **Business Rules**: None (request validation and lookup)
  - **API**: `GET /api/v1/recommendations/similar/:productId`
  - **Note**: Unchecked because no API test evidence has been recorded.

- [ ] **A-06**: Reject requests exceeding rate limits
  - **Precondition**: Authenticated buyer sends personalized requests above the configured limit
  - **Steps**:
    1. Send more than 30 `GET /api/v1/recommendations/personalized` requests within one minute
    2. Inspect the response status
  - **Expected Response**: HTTP 429 `TOO_MANY_REQUESTS`
  - **Business Rules**: None (platform rate-limit policy; DD_MATCH_03 §4)
  - **API**: `GET /api/v1/recommendations/personalized`
  - **Note**: Unchecked because no API test evidence has been recorded.

- [ ] **A-07**: Guest or non-buyer attempts card wishlist/cart actions
  - **Precondition**: Recommendation cards are displayed (`handleWishlistToggle`, `handleAddToCart`)
  - **Steps**:
    1. As a guest, click a card heart button
    2. As a guest, click a card cart button
    3. As an authenticated non-buyer, click either button
  - **Expected Result**: Guest sees the `Log In Required` dialog with Cancel / Log In (redirect preserves path); non-buyer sees `Shopping features are only available to buyers` error toast; no mutation is sent
  - **Business Rules**: None (client-side auth gating; backend enforces buyer role)
  - **API**: None (gated before request)
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [ ] **A-08**: Price filter rejects invalid input
  - **Precondition**: Filters panel is open (`commitPrice` in `FiltersPanel.tsx`: guards are `Number.isNaN` and `< 0` only — there is no min>max validation in code)
  - **Steps**:
    1. Enter a negative price and blur
    2. Enter a non-numeric price and blur
  - **Expected Result**: Negative and non-numeric values block the commit with `role="alert"` errors. A min>max range shows an inline error and is committed as-is.
  - **Business Rules**: None (client-side validation)
  - **API**: `GET /api/v1/recommendations/personalized`
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

---

## 3. Boundary Scenarios (B) — Edge Cases & Limits

- [ ] **B-01**: Handle an empty recommendation result set
  - **Precondition**: Selected filters produce zero matching products
  - **Steps**:
    1. Apply filters that return no results
  - **Expected Result**: `No matching products` empty state and `Reset Filters` action are displayed
  - **Business Rules**: None (empty state)
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [ ] **B-02**: Keep out-of-stock products visible with an availability indicator
  - **Precondition**: Matching result set includes an out-of-stock active product from an approved shop
  - **Steps**:
    1. Load the recommendation results
    2. Inspect the out-of-stock product card
  - **Expected Result**: Product remains in results and its card displays `Out of Stock`
  - **Business Rules**: BR-MATCH-021, BR-MATCH-022, BR-MATCH-023
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [ ] **B-03**: Return an empty page when requested page exceeds available pages
  - **Precondition**: Valid buyer token and a result set with fewer pages than the requested page
  - **Steps**:
    1. Request a page number greater than `totalPages`
  - **Expected Response**: HTTP 200 with an empty `data` array and pagination metadata for the full result set
  - **Business Rules**: BR-MATCH-026, BR-MATCH-027
  - **API**: `GET /api/v1/recommendations/personalized`
  - **Note**: Unchecked because no API test evidence has been recorded.

- [ ] **B-04**: Enforce the maximum recommendation page size
  - **Precondition**: Valid buyer token
  - **Steps**:
    1. Request personalized recommendations with `limit=50`
    2. Request personalized recommendations with `limit=51`
  - **Expected Result**: Limit 50 is accepted; a limit above 50 is rejected by query validation
  - **Business Rules**: BR-MATCH-026
  - **API**: `GET /api/v1/recommendations/personalized`
  - **Note**: Unchecked because no API test evidence has been recorded.

- [ ] **B-05**: Display the no-history state
  - **Precondition**: Authenticated buyer has no recommendation history
  - **Steps**:
    1. Open the recommendations page
    2. Inspect the history section
  - **Expected Result**: `No recommendation history yet` is displayed
  - **Business Rules**: None (empty state)
  - **API**: `GET /api/v1/recommendations/history`
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [ ] **B-06**: Hide the ad panel when no eligible ads exist
  - **Precondition**: No eligible ad exists for the panel placement
  - **Steps**:
    1. Load the recommendations page
  - **Expected Result**: Ad panel is not rendered
  - **Business Rules**: BR-MATCH-037
  - **API**: `GET /api/v1/ads/panel`
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [ ] **B-07**: Card image and price display fallbacks
  - **Precondition**: Recommendation cards are displayed (`ProductImage` in `MatchingRecommendations.tsx`)
  - **Steps**:
    1. Inspect a card whose image URL is empty or fails to load
    2. Inspect price and compare-at-price rendering on any card
  - **Expected Result**: Broken/empty image renders the 🧴 placeholder block, never a broken-image glyph; prices render with `toLocaleString()` plus `Ks`, compare-at-price struck through
  - **Business Rules**: None (UI behavior)
  - **API**: None (client-side)
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [ ] **B-08**: First-load skeleton grid matches the active view
  - **Precondition**: Recommendations query is in `isLoading` (no cached data yet). Present in code: `SkeletonGrid count={8}` on grid view; list view renders 4 pulsing rows (`animate-pulse`, `h-28`).
  - **Steps**:
    1. Hard-load `/buyer/recommendations` in grid view
    2. Hard-load in list view
  - **Expected Result**: Grid shows the 8-card skeleton; list shows 4 skeleton rows. Note: on page/filter changes `placeholderData` keeps old results, so no skeleton appears — skeleton is first-load only.
  - **Business Rules**: None (UI behavior)
  - **API**: None (client-side)
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

---

## 4. Interface Scenarios (I) — API Contracts & Payloads

> API contract tests use status and response assertions only; no screenshots are expected.

- [ ] **I-01**: `GET /api/v1/recommendations/personalized` returns recommendation data and metadata
  - **Precondition**: Valid buyer JWT and query parameters
  - **Steps**:
    1. Call the endpoint with a valid token
    2. Verify HTTP status and response fields
  - **Expected Response**: HTTP 200; JSON contains `data` recommendations, top-level `source`, and `meta` pagination information (`total`, `page`, `limit`, `totalPages`)
  - **Business Rules**: BR-MATCH-001, BR-MATCH-027, BR-MATCH-028
  - **API**: `GET /api/v1/recommendations/personalized`
  - **Note**: Unchecked because no API test evidence has been recorded.

- [ ] **I-02**: `GET /api/v1/recommendations/personalized` rejects a missing or invalid token
  - **Precondition**: Missing or invalid JWT
  - **Steps**:
    1. Call the endpoint without a valid bearer token
  - **Expected Response**: HTTP 401 `UNAUTHORIZED`
  - **Business Rules**: None (JWT guard)
  - **API**: `GET /api/v1/recommendations/personalized`
  - **Note**: Unchecked because no API test evidence has been recorded.

- [ ] **I-03**: `GET /api/v1/recommendations/similar/:productId` returns similar products
  - **Precondition**: Product exists and eligible similar products exist
  - **Steps**:
    1. Call the endpoint with a valid product UUID
  - **Expected Response**: HTTP 200 with a `data` array of similar products, excluding the source product
  - **Business Rules**: BR-MATCH-021, BR-MATCH-022
  - **API**: `GET /api/v1/recommendations/similar/:productId`
  - **Note**: Unchecked because no API test evidence has been recorded.

- [ ] **I-04**: `GET /api/v1/recommendations/history` returns the buyer's paginated sessions
  - **Precondition**: Valid buyer JWT and history sessions exist
  - **Steps**:
    1. Call the endpoint with valid pagination parameters
    2. Verify sessions and pagination data belong to the authenticated buyer
  - **Expected Response**: HTTP 200 with session groups in `data` and pagination metadata
  - **Business Rules**: None (buyer history isolation)
  - **API**: `GET /api/v1/recommendations/history`
  - **Note**: Unchecked because no API test evidence has been recorded.

- [ ] **I-05**: `GET /api/v1/ads/panel` returns eligible ads for a placement
  - **Precondition**: Valid placement and eligible ads exist
  - **Steps**:
    1. Call the endpoint with the placement parameter
    2. Verify the ad payload fields
  - **Expected Response**: HTTP 200 with a `data` array containing eligible ads and their image URL, link URL, CTA text, and priority amount
  - **Business Rules**: BR-MATCH-037, BR-MATCH-049, BR-MATCH-051
  - **API**: `GET /api/v1/ads/panel`
  - **Note**: Unchecked because no API test evidence has been recorded.

- [ ] **I-06**: `POST /api/v1/ads/track/impression` records valid ad IDs
  - **Precondition**: One or more valid ad IDs
  - **Steps**:
    1. Post the ad IDs to the impression endpoint
    2. Verify the response status and result
  - **Expected Response**: HTTP 200 with a `data` response confirming the tracking operation
  - **Business Rules**: None (ad analytics)
  - **API**: `POST /api/v1/ads/track/impression`
  - **Note**: Unchecked because no API test evidence has been recorded.

- [ ] **I-07**: `POST /api/v1/ads/track/click` records a valid ad click
  - **Precondition**: Valid ad ID
  - **Steps**:
    1. Post the ad ID and optional context ID to the click endpoint
    2. Verify the response status and result
  - **Expected Response**: HTTP 200 with a `data` response confirming the tracking operation
  - **Business Rules**: None (ad analytics)
  - **API**: `POST /api/v1/ads/track/click`
  - **Note**: Unchecked because no API test evidence has been recorded.

- [ ] **I-08**: Ad tracking endpoints reject invalid payloads
  - **Precondition**: Invalid ad ID format or empty `adIds` array
  - **Steps**:
    1. Send invalid payload to the relevant tracking endpoint
    2. Verify response status
  - **Expected Response**: HTTP 400 `BAD_REQUEST`
  - **Business Rules**: None (request validation)
  - **API**: `POST /api/v1/ads/track/impression`; `POST /api/v1/ads/track/click`
  - **Note**: Unchecked because no API test evidence has been recorded.

---

## Sign-Off

| Item | Status |
|------|--------|
| Test scenarios defined (N, A, B, I) | ☐ |
| E2E tests implemented | ☐ |
| PCL auto-update verified | ☐ |
| Next review date | 2026-11-14 |
