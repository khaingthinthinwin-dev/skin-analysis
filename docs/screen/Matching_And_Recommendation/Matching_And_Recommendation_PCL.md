# Program Checklist (PCL) — Matching & Recommendation

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-PCL-MATCH-001 |
| **Target Screen** | Matching & Recommendation |
| **Subsystem** | Product Discovery |
| **Version** | 1.1 |
| **Created** | 2026-10-14 |
| **Last Updated** | 2026-10-19 |
| **Status** | Active |
| **Source Specs** | DD_MATCH_01–06; 機能設計書 / 画面項目設計書 (Matching_And_Recommendation) |

---

## 1. Normal Scenarios (N) — Happy Path

- [x] **N-01**: View personalized recommendations with a completed skin analysis
  - **Evidence**:
    - `N-01_1_personalized.png`
    - Test: matching.spec.ts › "N-01: displays personalized recommendations and match scores" — passed
  - **Precondition**: Authenticated buyer has a completed AI skin analysis and eligible products exist
  - **Steps**:
    1. Navigate to `/buyer/recommendations`
    2. Inspect the source badge and recommendation cards
  - **Expected Result**: AI Analysis badge and match score badges are shown; recommendations are displayed in the desktop grid
  - **Business Rules**: BR-MATCH-001, BR-MATCH-021, BR-MATCH-022
  - **API**: `GET /api/v1/recommendations/personalized`
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [x] **N-02**: View generic recommendations without a skin analysis
  - **Evidence**:
    - `N-02_1_generic.png`
    - Test: matching.spec.ts › "N-02: displays generic recommendations without match scores" — passed
  - **Precondition**: Authenticated buyer has no completed skin analysis and featured products exist
  - **Steps**:
    1. Navigate to `/buyer/recommendations`
    2. Inspect the source badge, prompt banner, and product cards
  - **Expected Result**: General Picks badge and skin analysis prompt are shown; generic cards do not show match scores
  - **Business Rules**: BR-MATCH-001
  - **API**: `GET /api/v1/recommendations/personalized`
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [x] **N-03**: Show the refresh prompt for stale analysis
  - **Evidence**:
    - `N-03_1_retake_analysis.png`
    - Test: matching.spec.ts › "N-03: shows the stale analysis prompt and retake navigation" — passed
  - **Precondition**: Authenticated buyer has a completed analysis older than 24 hours
  - **Steps**:
    1. Navigate to `/buyer/recommendations`
    2. Inspect the source badge, product scores, and freshness prompt
    3. Click `Retake Analysis`
  - **Expected Result**: AI Analysis badge and match scores remain visible with a subtle `Want Fresh Results?` prompt; CTA navigates to `/buyer/skin-analysis`
  - **Business Rules**: BR-MATCH-001, BR-MATCH-004
  - **API**: `GET /api/v1/recommendations/personalized`
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [x] **N-04**: Filter recommendations by skin type, price, category, and rating
  - **Evidence**:
    - `N-04_1_skin_type_filtered.png`
    - `N-04_2_all_filters_applied.png`
    - Test: matching.spec.ts › "N-04: filters by skin type, price, category, and rating" — passed
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

- [x] **N-05**: Sort and paginate recommendation results
  - **Evidence**:
    - `N-05_1_price_sort_page_2.png`
    - Test: matching.spec.ts › "N-05: sorts by ascending price and paginates results" — passed
  - **Precondition**: Recommendation result set contains enough products for multiple pages
  - **Steps**:
    1. Select price sort and ascending order
    2. Navigate to page 2
    3. Inspect order and active page
  - **Expected Result**: Products are ordered by price ascending and the requested page is displayed; pagination keeps prior data without a full skeleton flash (`placeholderData: prev => prev`)
  - **Business Rules**: BR-MATCH-024, BR-MATCH-025, BR-MATCH-026, BR-MATCH-027
  - **API**: `GET /api/v1/recommendations/personalized`
  - **Note**: Unchecked because no matching Playwright evidence has been recorded. Actual code scrolls `main`/window to top only on first arrival, not on page change.

- [x] **N-06**: Reset applied filters
  - **Evidence**:
    - `N-06_1_filters_reset.png`
    - Test: matching.spec.ts › "N-06: resets filters and returns pagination to page 1" — passed
  - **Precondition**: At least one recommendation filter is applied
  - **Steps**:
    1. Click `Reset Filters`
    2. Inspect filter controls and results
  - **Expected Result**: Filter parameters are cleared, page resets to 1, and default results return
  - **Business Rules**: None (UI behavior)
  - **API**: `GET /api/v1/recommendations/personalized`
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [x] **N-07**: Open a recommended product
  - **Evidence**:
    - `N-07_1_product_navigation.png`
    - Test: matching.spec.ts › "N-07: opens the product page from a recommendation card" — passed
  - **Precondition**: Recommendation cards are displayed
  - **Steps**:
    1. Click a recommendation card
  - **Expected Result**: Browser navigates to `/buyer/products/:slug` for that product
  - **Business Rules**: None (navigation)
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [x] **N-08**: View and expand recommendation history
  - **Evidence**:
    - `N-08_1_history_session.png`
    - Test: matching.spec.ts › "N-08: expands a recommendation history session" — passed
  - **Precondition**: Authenticated buyer has past analysis sessions with recommendations
  - **Steps**:
    1. Navigate to `/buyer/recommendations`
    2. Expand a session in the history section
  - **Expected Result**: Sessions are grouped with date headers; expanding a session shows its recommended product mini-cards
  - **Business Rules**: None (history display)
  - **API**: `GET /api/v1/recommendations/history`
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [x] **N-09**: View similar products from a product detail page
  - **Evidence**:
    - `N-09_1_similar_products.png`
    - Test: matching.spec.ts › "N-09: views similar products from a product detail page" — passed
  - **Precondition**: Product detail returns a product and its similar-products endpoint returns at least one match.
  - **Steps**:
    1. Open the product detail page
    2. Inspect the Similar Products section
    3. Open one similar product
  - **Expected Result**: Similar products are shown and selecting one navigates to its product page.
  - **Business Rules**: BR-MATCH-021, BR-MATCH-022
  - **API**: Product Detail calls `GET /api/v1/products/:idOrSlug/similar?limit=8`; Matching's similar-recommendation endpoint is `GET /api/v1/recommendations/similar/:productId`.
  - **Note**: E2E covers the Product Detail similar-products UI as a cross-screen journey.

- [x] **N-10**: Display sponsored ads and record panel impression
  - **Evidence**:
    - `N-10_1_sponsored_impression.png`
    - Test: matching.spec.ts › "N-10: displays sponsored ads and records a panel impression" — passed
  - **Precondition**: Eligible approved ads exist for the `recommendation_page_banner` placement. Actual component: shared `AdBannerSlider` (not the unused `AdSlidePanel` in this feature folder).
  - **Steps**:
    1. Navigate to `/buyer/recommendations`
    2. Scroll until at least 50% of the ad panel is visible (`IMPRESSION_VISIBILITY_THRESHOLD = 0.5`, `useSponsoredAds` + schedule filter `approved` + in-window, placement match)
    3. Inspect the disclosure (`Sponsored` badge) and impression request
  - **Expected Result**: Eligible ads and disclosure are displayed; impression tracking (`matchingService.trackImpression`) is sent when visibility reaches at least 50%; hides entirely while pending/failed/expired/empty
  - **Business Rules**: BR-MATCH-037, BR-MATCH-049, BR-MATCH-050, BR-MATCH-051
  - **API**: `GET /api/v1/ads/panel`; `POST /api/v1/ads/track/impression`
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [x] **N-11**: Follow a sponsored ad call to action
  - **Evidence**:
    - `N-11_1_ad_destination.png`
    - Test: matching.spec.ts › "N-11: tracks a sponsored ad click and follows its destination" — passed
  - **Precondition**: Ad panel contains an eligible ad. `AdBannerSlider` resolves SKU product, fallback product, target/link URL, then catalog fallback; HTTP(S) destinations use `window.location.assign`, app paths use router navigation.
  - **Steps**:
    1. Click the ad call to action
    2. Inspect navigation and the click tracking request
  - **Expected Result**: Click is tracked (`matchingService.trackClick`) and the resolved internal or external destination opens.
  - **Business Rules**: BR-MATCH-037
  - **API**: `POST /api/v1/ads/track/click`
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [x] **N-12**: Change the interface language via the app-shell toggle
  - **Evidence**:
    - `N-12_1_language_en.png`
    - `N-12_2_language_my.png`
    - `N-12_3_language_ja.png`
    - `N-12_4_language_toggle.png`
    - Test: matching.spec.ts › "N-12: switches the app-shell language and returns to English" — passed
  - **Precondition**: Recommendations page is open. This screen's own code renders hardcoded English strings (no `useTranslation` in `MatchingRecommendations.tsx`); language switching is provided only by the app-shell `LanguageToggle` in `BuyerDashboardLayout`.
  - **Steps**:
    1. Change language to Japanese via the layout toggle
    2. Change language to Myanmar
    3. Change language back to English
  - **Expected Result**: Shell/chrome labels update; this screen's hardcoded strings remain English until its i18n is implemented
  - **Business Rules**: None (i18n; screen-level i18n not implemented in this file)
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [x] **N-13**: Render recommendation layout at desktop, tablet, and mobile widths
  - **Evidence**:
    - `N-13_1280_responsive.png`
    - `N-13_768_responsive.png`
    - `N-13_390_responsive.png`
    - Test: matching.spec.ts › "N-13: renders the product grid at desktop, tablet, and mobile widths" — passed
  - **Precondition**: Recommendations are available. Product grid uses `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`; filter sheet (`Sheet`) is available below `lg`.
  - **Steps**:
    1. Set viewport to desktop width (1024px or wider)
    2. Set viewport to tablet width (768px)
    3. Set viewport below 768px
  - **Expected Result**: Desktop uses sidebar filters and a 3-column grid at `lg`; below `lg`, filters use a sheet. Product grid uses 2 columns at `sm` and 1 column below `sm`.
  - **Business Rules**: None (responsive layout)
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [x] **N-14**: Navigate recommendation pages on mobile
  - **Evidence**:
    - `N-14_1_mobile_pagination.png`
    - Test: matching.spec.ts › "N-14: changes recommendation pages on mobile with numbered pagination" — passed
  - **Steps**:
    1. Set viewport to mobile width (below 768px)
    2. Navigate to `/buyer/recommendations`
    3. Select page 2 in the numbered pagination controls
  - **Expected Result**: The URL and recommendation results change to page 2; mobile filters remain available. Load More is not implemented.
  - **Business Rules**: BR-MATCH-026, BR-MATCH-027
  - **API**: `GET /api/v1/recommendations/personalized`
  - **Note**: Current implementation uses numbered pagination at all viewport sizes, as reconciled in DD_MATCH_06.

- [x] **N-15**: Toggle wishlist from a recommendation card
  - **Evidence**:
    - `N-15_1_wishlist_toggle.png`
    - Test: matching.spec.ts › "N-15: adds and removes a recommendation from the wishlist" — passed
  - **Precondition**: Recommendation cards are displayed (`MatchingRecommendations.tsx` `handleWishlistToggle`)
  - **Steps**:
    1. Click the heart button on a card not in the wishlist
    2. Click the heart button on a card already in the wishlist
  - **Expected Result**: Add shows `Added to wishlist` toast and fills the heart red; remove shows `Removed from wishlist` toast; duplicate (409) shows `Already in your wishlist` info toast
  - **Business Rules**: None (wishlist integration; owned by Wishlist team)
  - **API**: Wishlist add/remove endpoints
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [x] **N-16**: Add to cart from a recommendation card
  - **Evidence**:
    - `N-16_1_cart_add.png`
    - Test: matching.spec.ts › "N-16: adds an in-stock recommendation to the cart" — passed
  - **Precondition**: Recommendation cards are displayed for in-stock products (`handleAddToCart`); out-of-stock cards hide the cart button
  - **Steps**:
    1. Click the cart button on an in-stock card
    2. Click the cart button on a card already in the cart (or when API returns 409)
  - **Expected Result**: First add shows `Added to cart` toast; duplicate opens the `Already in Cart` dialog; out-of-stock cards show no cart button
  - **Business Rules**: None (cart integration; owned by Cart team)
  - **API**: `POST /api/v1/cart/items`
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [x] **N-17**: Switch product grid between grid and list views
  - **Evidence**:
    - `N-17_1_grid_and_list.png`
    - Test: matching.spec.ts › "N-17: switches between grid and list views" — passed
  - **Precondition**: Recommendation results are displayed (`ViewToggle` in the sort bar)
  - **Steps**:
    1. Click the List view toggle
    2. Click the Grid view toggle
  - **Expected Result**: List shows stacked cards, grid restores the responsive card grid; URL query params are unchanged (view is local state only)
  - **Business Rules**: None (UI behavior)
  - **API**: None (client-side)
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [x] **N-18**: Filter by category, rating, and price validation states
  - **Evidence**:
    - `N-18_1_price_validation.png`
    - Test: matching.spec.ts › "N-18: validates category, rating, and invalid price range" — passed
  - **Precondition**: Recommendations page is open (`FiltersPanel`: `CategorySelect`, price Min/Max, `RATING_OPTIONS` 4.5/4.0/3.5/3.0)
  - **Steps**:
    1. Select a category via `CategorySelect`
    2. Select a minimum rating (e.g. `4.5+ Stars`)
    3. Enter an invalid price (negative or non-numeric) and blur
  - **Expected Result**: Category and rating filters narrow results and reset to page 1; negative/non-numeric price shows an inline `role="alert"` error; min greater than max also shows an inline error (the range is committed, so the API can return no results).
  - **Business Rules**: BR-MATCH-006
  - **API**: `GET /api/v1/recommendations/personalized`
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [x] **N-19**: Default sort is Newest and invalid sorts fall back to Newest
  - **Evidence**:
    - `N-19_1_default_and_fallback_sort.png`
    - Test: matching.spec.ts › "N-19: defaults to Newest and falls back from an unsupported sort" — passed
  - **Precondition**: Recommendations page loads with no explicit sort (`resolveMatchingSort`, `DEFAULT_MATCHING_SORT`)
  - **Steps**:
    1. Load `/buyer/recommendations` with a bare URL and inspect the sort select and URL
    2. Open a URL with `sort=matchScore` on generic (unscored) results
  - **Expected Result**: Bare URL pins `sort=createdAt&order=desc` via replace (select shows Newest, page preserved); undisplayable sorts fall back to Newest instead of a placeholder
  - **Business Rules**: BR-MATCH-024, BR-MATCH-025
  - **API**: `GET /api/v1/recommendations/personalized`
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [x] **N-20**: Expand all history sessions with See more
  - **Evidence**:
    - `N-20_1_history_expand_collapse.png`
    - Test: matching.spec.ts › "N-20: expands and collapses recommendation history beyond the first five sessions" — passed
  - **Precondition**: Buyer has more than 5 history sessions (page initially fetches 5, expanded fetches 50)
  - **Steps**:
    1. Navigate to `/buyer/recommendations` and inspect the history section
    2. Click `See more (N more)`
    3. Click `Show less`
  - **Expected Result**: First 5 sessions shown inline; See more loads all (up to 50/page) in place without navigation; Show less collapses back
  - **Business Rules**: None (history display)
  - **API**: `GET /api/v1/recommendations/history`
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [x] **N-21**: Open and apply filters from the mobile filter sheet
  - **Evidence**:
    - `N-21_1_mobile_filter_applied.png`
    - Test: matching.spec.ts › "N-21: opens the mobile filters sheet and applies a filter" — passed
  - **Precondition**: Viewport below `lg` (`mobileFilterOpen` `Sheet`, `setMobileFilterOpen`; `Show {meta.total} Products` confirm button, `Clear All` reset)
  - **Steps**:
    1. Set viewport below 1024px and open the Filters sheet
    2. Change a filter and click `Show {N} Products`
    3. Reopen the sheet and click `Clear All`
  - **Expected Result**: Sheet opens with the full `FiltersPanel`; confirm applies filters and closes; Clear All resets via `resetFilters`
  - **Business Rules**: BR-MATCH-006
  - **API**: `GET /api/v1/recommendations/personalized`
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [x] **N-22**: Remove individual filters via filter chips
  - **Evidence**:
    - `N-22_1_filter_chips_removed.png`
    - Test: matching.spec.ts › "N-22: removes a filter chip and clears all chips" — passed
  - **Precondition**: Filters are applied (`hasFilterChips`, `MatchingFilterChips` with `handleRemoveFilterChip`: per-chip X buttons in the desktop sidebar and the mobile row below `lg`, plus `Clear All`/`onClearAll`)
  - **Steps**:
    1. Apply multiple filters
    2. Click one chip's X button
    3. Click `Clear All` on the chips row
  - **Expected Result**: Single chip removal clears only that filter value (skin-type chip removes one type); Clear All resets everything
  - **Business Rules**: BR-MATCH-006
  - **API**: `GET /api/v1/recommendations/personalized`
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [x] **N-23**: Select multiple skin types simultaneously
  - **Evidence**:
    - `N-23_1_multiple_types_and_universal_product.png`
    - Test: matching.spec.ts › "N-23: selects multiple skin types and removes one without a reload" — passed
  - **Precondition**: Recommendations page is open (`FiltersPanel` renders one skin-type option per `SKIN_TYPES` entry — a `Checkbox` in the desktop sidebar, a toggle button in the mobile sheet; both call `toggleSkinType`). Each toggle calls `toggleSkinType` → `onUpdate({ skinTypes })` immediately — there is no Apply button (the mobile sheet's `Show {N} Products` button only closes the sheet); values are comma-joined into the `skinTypes` URL param (`'all'` sentinel when cleared, which the schema drops from the API request). Products matching the selected types and products tagged `all` exist.
  - **Steps**:
    1. Check the `Dry` checkbox, then check the `Oily` checkbox in the Skin Type filter
    2. Inspect the network request and the displayed product cards
    3. Uncheck the `Oily` checkbox
    4. Inspect the network request and displayed results again without reloading the page
  - **Expected Result**: Request query carries `skinTypes=dry,oily` on `GET /api/v1/recommendations/personalized`; displayed products include those matching at least one selected type and products tagged `all` (suitable for every skin type), for both AI and generic recommendations. Unchecking `Oily` updates the request to `skinTypes=dry` and refetches automatically via the URL-driven query key (no Apply button, no page reload); `Dry` remains selected and products matching Dry or tagged `all` remain visible.
  - **Business Rules**: BR-MATCH-006
  - **API**: `GET /api/v1/recommendations/personalized`
  - **Note**: Verified by the Matching & Recommendation E2E and frontend/backend filter tests. Selection order determines the comma-joined order (`dry,oily` if Dry was checked first). The universal `all` product remains eligible when any explicit skin type is selected, including for generic results.

- [x] **N-24**: Show the Match Score sort option only for the AI source
  - **Evidence**:
    - `N-24_1_source_sort_options.png`
    - Test: matching.spec.ts › "N-24: offers Match Score sort only for AI recommendations" — passed
  - **Precondition**: Recommendations page is open. The sort bar passes `getMatchingSortOptions(source)` to `SortSelect`; `source` is read from the personalized response (`recData?.source ?? 'generic'`). `COMMON_SORT_OPTIONS` = Newest, Price: Low to High, Price: High to Low, Highest Rated; `MATCH_SCORE_OPTION` = Match Score (`matchScore:desc`) is spliced in only for AI.
  - **Steps**:
    1. Load recommendations as a buyer with a completed AI analysis (`source: 'ai'`) and open the sort select
    2. Load recommendations as a buyer with no completed analysis (`source: 'generic'`) and open the sort select
    3. Compare the option lists in both cases
  - **Expected Result**: With `source: 'ai'`, the sort select shows five options in order: `Newest`, `Match Score`, `Price: Low to High`, `Price: High to Low`, `Highest Rated`. With `source: 'generic'`, the select shows only the four common options (`Newest`, `Price: Low to High`, `Price: High to Low`, `Highest Rated`) — `Match Score` is absent because generic results carry no scores
  - **Business Rules**: BR-MATCH-024, BR-MATCH-025
  - **API**: `GET /api/v1/recommendations/personalized`
  - **Note**: Unchecked because no matching Playwright evidence has been recorded. While the response is loading, `source` defaults to `'generic'`, so `Match Score` may appear only after AI data arrives.

- [x] **N-25**: Hide the "Want Fresh Results?" banner when the AI analysis is 24 hours old or newer
  - **Evidence**:
    - `N-25_1_fresh_analysis.png`
    - Test: matching.spec.ts › "N-25: hides the freshness prompt at exactly 24 hours" — passed
  - **Precondition**: Authenticated buyer has a completed AI analysis. `ProfilePromptBanner` receives `source` and `analysisAge` (hours) from the personalized response; the component computes `age = analysisAge ?? 0` and decides freshness inline (`source === 'ai' && age <= 24` → hidden; `source === 'ai' && age > 24` → stale banner). N-03 covers the stale (> 24h) display case; this case covers the fresh (≤ 24h) hidden case.
  - **Steps**:
    1. Load recommendations with `analysisAge` well below 24 hours (e.g. 0) and inspect the area above the product grid
    2. Load recommendations with `analysisAge` at exactly 24 hours and inspect the same area
    3. Optionally load with `analysisAge` above 24 hours to contrast against N-03
  - **Expected Result**: When `source === 'ai'` and `analysisAge <= 24`, no banner is rendered at all — neither the stale "Want Fresh Results?" prompt nor the generic "Get Personalized Recommendations" prompt. Exactly 24 hours counts as fresh (boundary uses `<= 24`, not `< 24`). Above 24 hours the amber stale banner with the `Retake Analysis` CTA appears, as verified in N-03
  - **Business Rules**: BR-MATCH-001, BR-MATCH-004
  - **API**: `GET /api/v1/recommendations/personalized`
  - **Note**: Unchecked because no matching Playwright evidence has been recorded. `analysisAge` is computed server-side as hours (float) since `completedAt`; the server still returns `source: 'ai'` when stale — staleness is purely a UI concern in `ProfilePromptBanner.tsx`.

---

## 2. Abnormal Scenarios (A) — Error & Negative Paths

- [x] **A-01**: Open recommendations without authentication
  - **Evidence**:
    - Screenshots: (none captured)
    - Test: matching.spec.ts › "A-01: redirects unauthenticated visitors to login" — passed
  - **Precondition**: User is not authenticated
  - **Steps**:
    1. Navigate directly to `/buyer/recommendations`
  - **Expected Result**: User is redirected to `/login`
  - **Business Rules**: None (route authentication)
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [x] **A-02**: Reject invalid personalized recommendation query parameters
  - **Evidence**:
    - Screenshots: (none captured)
    - Test: matching.spec.ts › "A-02: rejects an invalid recommendation query" — passed
  - **Precondition**: Valid buyer token is available
  - **Steps**:
    1. Request personalized recommendations with an invalid sort field or invalid filter value
  - **Expected Response**: HTTP 400 `BAD_REQUEST`
  - **Business Rules**: BR-MATCH-025
  - **API**: `GET /api/v1/recommendations/personalized`
  - **Note**: Unchecked because no API test evidence has been recorded.

- [x] **A-03**: Reject personalized recommendations for a non-buyer role
  - **Evidence**:
    - Screenshots: (none captured)
    - Test: matching.spec.ts › "A-03: rejects a non-buyer recommendation request" — passed
  - **Precondition**: Authenticated user has a role other than buyer
  - **Steps**:
    1. Request `GET /api/v1/recommendations/personalized`
  - **Expected Response**: HTTP 403 `FORBIDDEN`
  - **Business Rules**: None (role guard)
  - **API**: `GET /api/v1/recommendations/personalized`
  - **Note**: Unchecked because no API test evidence has been recorded.

- [x] **A-04**: Handle recommendations request failure and retry
  - **Evidence**:
    - `A-04_1_retry.png`
    - Test: matching.spec.ts › "A-04: offers retry after a failed recommendations request" — passed
  - **Precondition**: Recommendations page is open and the API can be made to fail once
  - **Steps**:
    1. Cause a network error for the recommendations request
    2. Confirm the error banner appears
    3. Click `Retry`
  - **Expected Result**: Error banner offers retry and the query is refetched
  - **Business Rules**: None (error handling)
  - **API**: `GET /api/v1/recommendations/personalized`
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [x] **A-05**: Observe malformed and missing similar-product source behavior
  - **Evidence**:
    - Screenshots: (none captured)
    - Test: matching.spec.ts › "A-05: records malformed and missing similar-product ID behavior" — passed
  - **Precondition**: No valid source product matching the requested ID
  - **Steps**:
    1. Request similar products using a malformed UUID
    2. Request similar products using a valid UUID for a non-existent product
  - **Expected Response**: A malformed non-UUID path value currently reaches the UUID-typed database lookup and returns HTTP 500; a well-formed unknown UUID returns HTTP 200 with empty `data` and zero totals. The endpoint does not return 400/404.
  - **Business Rules**: None (request validation and lookup)
  - **API**: `GET /api/v1/recommendations/similar/:productId`
  - **Note**: The malformed-ID runtime response differs from DD_MATCH_06 §2.1's unit-level design note, which says non-UUID values match nothing. This E2E records the observed PostgreSQL behavior; a safer validation response requires a separate application change.

- [x] **A-06**: Confirm personalized requests have no endpoint rate limit
  - **Evidence**:
    - Screenshots: (none captured)
    - Test: matching.spec.ts › "A-06: accepts requests above the documented rate-limit threshold" — passed
  - **Precondition**: Authenticated buyer sends personalized requests above the configured limit
  - **Steps**:
    1. Send more than 30 `GET /api/v1/recommendations/personalized` requests within one minute
    2. Inspect the response status
  - **Expected Response**: All 31 requests return HTTP 200; DD_MATCH_03 §4 states that endpoint rate limiting is not implemented.
  - **Business Rules**: None (documents current implementation; not a rate-limit policy)
  - **API**: `GET /api/v1/recommendations/personalized`
  - **Note**: Records current behavior and does not establish a future rate-limit requirement.

- [x] **A-07**: Blocks a non-buyer from the recommendations page
  - **Evidence**:
    - Screenshots: (none captured)
    - Test: matching.spec.ts › "A-07: blocks non-buyers from the recommendations page" — passed
  - **Precondition**: An authenticated merchant opens the buyer-only recommendations route.
  - **Steps**:
    1. Navigate to `/buyer/recommendations` as a merchant
    2. Inspect the resulting route
  - **Expected Result**: The route guard redirects to `/unauthorized`; recommendation cards and wishlist/cart actions do not render. Guest redirection is covered by A-01.
  - **Business Rules**: Buyer-only route access
  - **API**: None (blocked by the frontend route guard)
  - **Note**: The prior card-action expectation did not match the protected route and is replaced with current access-control behavior.

- [x] **A-08**: Price filter rejects invalid input
  - **Evidence**:
    - `A-08_1_negative_price.png`
    - Test: matching.spec.ts › "A-08: rejects negative price input without applying it" — passed
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

- [x] **B-01**: Handle an empty recommendation result set
  - **Evidence**:
    - `B-01_1_empty_results.png`
    - Test: matching.spec.ts › "B-01: displays the empty result state" — passed
  - **Precondition**: Selected filters produce zero matching products
  - **Steps**:
    1. Apply filters that return no results
  - **Expected Result**: `No matching products` empty state and `Reset Filters` action are displayed
  - **Business Rules**: None (empty state)
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [x] **B-02**: Keep out-of-stock products visible with an availability indicator
  - **Evidence**:
    - `B-02_1_out_of_stock.png`
    - Test: matching.spec.ts › "B-02: shows out-of-stock products and hides cart action" — passed
  - **Precondition**: Matching result set includes an out-of-stock active product from an approved shop
  - **Steps**:
    1. Load the recommendation results
    2. Inspect the out-of-stock product card
  - **Expected Result**: Product remains in results and its card displays `Out of Stock`
  - **Business Rules**: BR-MATCH-021, BR-MATCH-022, BR-MATCH-023
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [x] **B-03**: Return an empty page when requested page exceeds available pages
  - **Evidence**:
    - Screenshots: (none captured)
    - Test: matching.spec.ts › "B-03: returns an empty page beyond total pages" — passed
  - **Precondition**: Valid buyer token and a result set with fewer pages than the requested page
  - **Steps**:
    1. Request a page number greater than `totalPages`
  - **Expected Response**: HTTP 200 with an empty `data` array and pagination metadata for the full result set
  - **Business Rules**: BR-MATCH-026, BR-MATCH-027
  - **API**: `GET /api/v1/recommendations/personalized`
  - **Note**: Unchecked because no API test evidence has been recorded.

- [x] **B-04**: Enforce the maximum recommendation page size
  - **Evidence**:
    - Screenshots: (none captured)
    - Test: matching.spec.ts › "B-04: accepts limit 50 and rejects limit 51" — passed
  - **Precondition**: Valid buyer token
  - **Steps**:
    1. Request personalized recommendations with `limit=50`
    2. Request personalized recommendations with `limit=51`
  - **Expected Result**: Limit 50 is accepted; a limit above 50 is rejected by query validation
  - **Business Rules**: BR-MATCH-026
  - **API**: `GET /api/v1/recommendations/personalized`
  - **Note**: Unchecked because no API test evidence has been recorded.

- [x] **B-05**: Display the no-history state
  - **Evidence**:
    - `B-05_1_no_history.png`
    - Test: matching.spec.ts › "B-05: displays the empty recommendation history state" — passed
  - **Precondition**: Authenticated buyer has no recommendation history
  - **Steps**:
    1. Open the recommendations page
    2. Inspect the history section
  - **Expected Result**: `No recommendation history yet` is displayed
  - **Business Rules**: None (empty state)
  - **API**: `GET /api/v1/recommendations/history`
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [x] **B-06**: Hide the ad panel when no eligible ads exist
  - **Evidence**:
    - `B-06_1_no_ads.png`
    - Test: matching.spec.ts › "B-06: hides the ad panel with an empty ad response" — passed
  - **Precondition**: No eligible ad exists for the panel placement
  - **Steps**:
    1. Load the recommendations page
  - **Expected Result**: Ad panel is not rendered
  - **Business Rules**: BR-MATCH-037
  - **API**: `GET /api/v1/ads/panel`
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [x] **B-07**: Card image and price display fallbacks
  - **Evidence**:
    - `B-07_1_card_fallbacks.png`
    - Test: matching.spec.ts › "B-07: uses image fallback and formats product prices" — passed
  - **Precondition**: Recommendation cards are displayed (`ProductImage` in `MatchingRecommendations.tsx`)
  - **Steps**:
    1. Inspect a card whose image URL is empty or fails to load
    2. Inspect price and compare-at-price rendering on any card
  - **Expected Result**: Broken/empty image renders the 🧴 placeholder block, never a broken-image glyph; prices render with `toLocaleString()` plus `Ks`, compare-at-price struck through
  - **Business Rules**: None (UI behavior)
  - **API**: None (client-side)
  - **Note**: Unchecked because no matching Playwright evidence has been recorded.

- [x] **B-08**: First-load skeleton grid matches the active view
  - **Evidence**:
    - `B-08_1_first_load_skeleton.png`
    - Test: matching.spec.ts › "B-08: shows first-load skeleton cards while the request is pending" — passed
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

- [x] **I-01**: `GET /api/v1/recommendations/personalized` returns recommendation data and metadata
  - **Evidence**:
    - API test — no screenshot
    - Test: matching.spec.ts › "I-01: returns recommendation data and pagination metadata" — passed
  - **Precondition**: Valid buyer JWT and query parameters
  - **Steps**:
    1. Call the endpoint with a valid token
    2. Verify HTTP status and response fields
  - **Expected Response**: HTTP 200; JSON contains `data` recommendations, top-level `source`, and `meta` pagination information (`total`, `page`, `limit`, `totalPages`)
  - **Business Rules**: BR-MATCH-001, BR-MATCH-027, BR-MATCH-028
  - **API**: `GET /api/v1/recommendations/personalized`
  - **Note**: Unchecked because no API test evidence has been recorded.

- [x] **I-02**: `GET /api/v1/recommendations/personalized` rejects a missing or invalid token
  - **Evidence**:
    - API test — no screenshot
    - Test: matching.spec.ts › "I-02: rejects missing and invalid tokens" — passed
  - **Precondition**: Missing or invalid JWT
  - **Steps**:
    1. Call the endpoint without a valid bearer token
  - **Expected Response**: HTTP 401 `UNAUTHORIZED`
  - **Business Rules**: None (JWT guard)
  - **API**: `GET /api/v1/recommendations/personalized`
  - **Note**: Unchecked because no API test evidence has been recorded.

- [x] **I-03**: `GET /api/v1/recommendations/similar/:productId` returns similar products
  - **Evidence**:
    - API test — no screenshot
    - Test: matching.spec.ts › "I-03: returns a similar-products array excluding the source product" — passed
  - **Precondition**: Product exists and eligible similar products exist
  - **Steps**:
    1. Call the endpoint with a valid product UUID
  - **Expected Response**: HTTP 200 with a `data` array of similar products, excluding the source product
  - **Business Rules**: BR-MATCH-021, BR-MATCH-022
  - **API**: `GET /api/v1/recommendations/similar/:productId`
  - **Note**: Unchecked because no API test evidence has been recorded.

- [x] **I-04**: `GET /api/v1/recommendations/history` returns the buyer's paginated sessions
  - **Evidence**:
    - API test — no screenshot
    - Test: matching.spec.ts › "I-04: returns paginated history for the authenticated buyer" — passed
  - **Precondition**: Valid buyer JWT and history sessions exist
  - **Steps**:
    1. Call the endpoint with valid pagination parameters
    2. Verify sessions and pagination data belong to the authenticated buyer
  - **Expected Response**: HTTP 200 with session groups in `data` and pagination metadata
  - **Business Rules**: None (buyer history isolation)
  - **API**: `GET /api/v1/recommendations/history`
  - **Note**: Unchecked because no API test evidence has been recorded.

- [x] **I-05**: `GET /api/v1/ads/panel` returns eligible ads for a placement
  - **Evidence**:
    - API test — no screenshot
    - Test: matching.spec.ts › "I-05: returns the ad panel contract for the recommendation placement" — passed
  - **Precondition**: Valid placement and eligible ads exist
  - **Steps**:
    1. Call the endpoint with the placement parameter
    2. Verify the ad payload fields
  - **Expected Response**: HTTP 200 with a `data` array containing eligible ads and their image URL, link URL, CTA text, and priority amount
  - **Business Rules**: BR-MATCH-037, BR-MATCH-049, BR-MATCH-051
  - **API**: `GET /api/v1/ads/panel`
  - **Note**: Unchecked because no API test evidence has been recorded.

- [x] **I-06**: `POST /api/v1/ads/track/impression` records valid ad IDs
  - **Evidence**:
    - API test — no screenshot
    - Test: matching.spec.ts › "I-06: records impressions for submitted ad IDs" — passed
  - **Precondition**: One or more valid ad IDs
  - **Steps**:
    1. Post the ad IDs to the impression endpoint
    2. Verify the response status and result
  - **Expected Response**: HTTP 200 with a `data` response confirming the tracking operation
  - **Business Rules**: None (ad analytics)
  - **API**: `POST /api/v1/ads/track/impression`
  - **Note**: Unchecked because no API test evidence has been recorded.

- [x] **I-07**: `POST /api/v1/ads/track/click` records a valid ad click
  - **Evidence**:
    - API test — no screenshot
    - Test: matching.spec.ts › "I-07: records a sponsored ad click" — passed
  - **Precondition**: Valid ad ID
  - **Steps**:
    1. Post the ad ID and optional context ID to the click endpoint
    2. Verify the response status and result
  - **Expected Response**: HTTP 200 with a `data` response confirming the tracking operation
  - **Business Rules**: None (ad analytics)
  - **API**: `POST /api/v1/ads/track/click`
  - **Note**: Unchecked because no API test evidence has been recorded.

- [x] **I-08**: Documents permissive handling of malformed ad tracking payloads
  - **Evidence**:
    - API test — no screenshot
    - Test: matching.spec.ts › "I-08: documents permissive handling of malformed ad tracking payloads" — passed
  - **Precondition**: Tracking controllers receive an incorrect impression/click payload.
  - **Steps**:
    1. Send invalid payload to the relevant tracking endpoint
    2. Verify response status
  - **Expected Response**: HTTP 200. No DTO validation exists; impressions report submitted `adIds.length` (including 0), and click tracking returns `recorded: true` when `adId` is absent.
  - **Business Rules**: None (documents current log-only analytics behavior)
  - **API**: `POST /api/v1/ads/track/impression`; `POST /api/v1/ads/track/click`
  - **Note**: Aligned with DD_MATCH_03 §§2.5–2.6; this documents current behavior and does not imply validation.

---

## Sign-Off

| Item | Status |
|------|--------|
| Test scenarios defined (N, A, B, I) | ☐ |
| E2E tests implemented | ☐ |
| PCL auto-update verified | ☐ |
| Next review date | 2026-11-14 |
