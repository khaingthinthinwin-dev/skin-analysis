# DD_MATCH_06 — Test Specification

> **Doc ID:** SKM-DD-MATCH-06 | **Version:** 1.0 | **Status:** Released  
> **Last Updated:** 2026-09-01

---

## 1. Overview

This document defines the testing strategy for the Matching & Recommendation module, covering Unit Tests, Component Tests, and End-to-End (E2E) Scenarios.

---

## 2. Backend Unit Tests (`src/modules/recommendations/tests/`)

### 2.1 `matching.service.spec.ts`

Mock dependencies: `PrismaService`, `RedisService`, `ConfigService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **getPersonalized** | User with fresh analysis (≤ 24h), valid query | Returns `source = "ai"`, scored products, correct meta |
| **getPersonalized** | User with stale analysis (> 24h) | Returns `source = "generic"`, no match scores |
| **getPersonalized** | User with no analysis | Returns `source = "generic"`, featured products |
| **getPersonalized** | Redis HIT | Returns cached result without DB query |
| **getPersonalized** | Redis MISS | Queries DB, computes scores, seeds Redis |
| **getPersonalized** | Skin type filter override | Uses filter value instead of analysis-derived type |
| **getPersonalized** | Price range filter | Returns only products within min/max bounds |
| **getPersonalized** | Ingredients filter | Returns only products with matching ingredients |
| **getPersonalized** | Sort by price ascending | Returns products sorted by price asc |
| **getPersonalized** | Invalid sort field | Throws `BadRequestException` (400) |
| **getPersonalized** | Page > totalPages | Returns empty data array |
| **getPersonalized** | Unauthorized (no token) | Throws `UnauthorizedException` (401) |
| **getPersonalized** | Non-buyer role | Throws `ForbiddenException` (403) |
| **getSimilar** | Valid product ID with matches | Returns similar products from same category |
| **getSimilar** | Valid product ID, no matches | Returns empty data array |
| **getSimilar** | Invalid product ID (not UUID) | Throws `BadRequestException` (400) |
| **getSimilar** | Product not found | Throws `NotFoundException` (404) |
| **getSimilar** | Excludes source product | Source product ID not in results |
| **getHistory** | User with past sessions | Returns sessions grouped by date |
| **getHistory** | User with no sessions | Returns empty data array |
| **getHistory** | Pagination (page 2, limit 5) | Returns correct slice |
| **getHistory** | Unauthorized | Throws `UnauthorizedException` (401) |

### 2.2 `matching.controller.spec.ts`

Mock dependencies: `MatchingService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **GET /recommendations/personalized** | Valid query with JWT | Calls `service.getPersonalized`, returns 200 |
| **GET /recommendations/personalized** | Missing JWT | Returns 401 Unauthorized |
| **GET /recommendations/personalized** | Invalid query params | Returns 400 Bad Request |
| **GET /recommendations/similar/:productId** | Valid product ID | Calls `service.getSimilar`, returns 200 |
| **GET /recommendations/similar/:productId** | Invalid UUID | Returns 400 Bad Request |
| **GET /recommendations/history** | Valid JWT | Calls `service.getHistory`, returns 200 |
| **GET /recommendations/history** | Missing JWT | Returns 401 Unauthorized |

### 2.3 `ad.service.spec.ts`

Mock dependencies: `PrismaService`, `RedisService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **getPanel** | 5 eligible ads exist | Returns 5 ads sorted by payment_amount desc |
| **getPanel** | Fewer than 5 eligible ads | Returns available ads (no placeholders) |
| **getPanel** | No eligible ads | Returns empty data array |
| **getPanel** | Ads with same payment_amount | Applies round-robin rotation |
| **getPanel** | Redis unavailable for rotation | Falls back to `ORDER BY created_at ASC` |
| **trackImpression** | Valid ad IDs | Records impressions, returns 200 |
| **trackImpression** | Invalid ad ID format | Returns 400 Bad Request |
| **trackImpression** | Empty ad IDs array | Returns 400 Bad Request |
| **trackClick** | Valid ad ID | Records click, returns 200 |
| **trackClick** | Invalid ad ID | Returns 400 Bad Request |
| **trackClick** | With context ID | Records click with context |

### 2.4 `ad.controller.spec.ts`

Mock dependencies: `AdService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **GET /ads/panel** | Valid placement | Calls `service.getPanel`, returns 200 |
| **GET /ads/panel** | Missing placement param | Returns 400 Bad Request |
| **POST /ads/track/impression** | Valid payload | Calls `service.trackImpression`, returns 200 |
| **POST /ads/track/impression** | Invalid payload | Returns 400 Bad Request |
| **POST /ads/track/click** | Valid payload | Calls `service.trackClick`, returns 200 |
| **POST /ads/track/click** | Invalid payload | Returns 400 Bad Request |

---

## 3. Frontend Component Tests

Using Vitest + React Testing Library.

### 3.1 `Recommendations.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Authenticated buyer with AI analysis | Shows "🧬 AI Analysis" badge, match scores on cards |
| Authenticated buyer without analysis | Shows "⬡ General Picks" badge, profile prompt banner |
| Unauthenticated visitor | Redirects to `/login` |
| Loading state | Shows skeleton shimmer grid |
| Empty results | Shows "No matching products" + Reset Filters button |
| Error state | Shows error banner with Retry button |
| Retry click | Refetches last failed query |

### 3.2 `FiltersPanel.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| AI analysis source | Skin type checkboxes pre-selected from analysis |
| Generic source | All checkboxes unchecked |
| Skin type checkbox change | Updates URL query param, resets page to 1 |
| Min price input | Validates ≥ 0, shows inline error if negative |
| Max price input | Validates ≥ 0, shows inline error if negative |
| Min > Max price | Shows inline error |
| Ingredients checkbox change | Updates URL query param, resets page to 1 |
| Reset Filters click | Clears all params, resets page to 1 |
| Mobile drawer toggle | Opens/closes filter drawer |

### 3.3 `RecommendationCard.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| AI source | Shows match score badge ("92% match") |
| Generic source, featured | Shows "⭐ Featured" badge |
| Generic source, top rated | Shows "🏆 Top Rated" badge |
| Generic source, best seller | Shows "🔥 Best Seller" badge |
| Generic source, new | Shows "✨ New" badge |
| Out of stock | Shows "Out of Stock" indicator |
| Card click | Navigates to `/buyer/products/:slug` |
| Product name truncation | Truncates to 2 lines |
| Price display | Shows formatted price string |
| Compare-at price | Shows strikethrough price |
| Skin type tags | Shows compatible skin types |

### 3.4 `AdSlidePanel.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| 5 ads returned | Renders 5 slides with dot indicators |
| 3 ads returned | Renders 3 slides with dot indicators |
| 0 ads returned | Panel not rendered |
| Auto-slide | Advances every 5 seconds |
| Auto-slide pause on hover | Pauses auto-slide on mouse enter |
| Auto-slide resume on leave | Resumes auto-slide on mouse leave |
| Left arrow click | Navigates to previous slide |
| Right arrow click | Navigates to next slide |
| CTA click | Fires impression tracking, navigates to linkUrl |
| Disclosure footer | Always visible below panel |
| Impression tracking | Fires when panel visible ≥ 50% |

### 3.5 `HistoryAccordion.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Sessions exist | Shows session groups with date headers |
| Expand session | Shows mini-cards with image + name + score + price |
| Collapse session | Hides mini-cards, shows only header + chevron |
| No sessions | Shows "No recommendation history yet" |
| History visible for AI source | Shows when completed sessions exist |
| History visible for generic source | Shows when completed sessions exist |

### 3.6 `useMatchFilters.test.ts`

| Scenario | Expected Outcome |
|----------|------------------|
| Initial state | Returns default filter values |
| Update skin types | Updates URL query param |
| Update price range | Updates URL query params |
| Update sort | Updates URL query params |
| Any filter change | Resets page to 1 |
| Reset filters | Clears all params |

---

## 4. End-to-End (E2E) Scenarios (Playwright)

| Scenario ID | Flow Description |
|-------------|------------------|
| **E2E-MATCH-01** | **Happy Path: View Personalized Recommendations**<br>1. Login as buyer with AI analysis.<br>2. Navigate to /buyer/recommendations.<br>3. Verify "🧬 AI Analysis" badge displayed.<br>4. Verify match score badges on cards.<br>5. Verify recommendation grid has 4 columns on desktop. |
| **E2E-MATCH-02** | **View Generic Recommendations**<br>1. Login as buyer without AI analysis.<br>2. Navigate to /buyer/recommendations.<br>3. Verify "⬡ General Picks" badge displayed.<br>4. Verify profile prompt banner with "Start Skin Analysis →" CTA.<br>5. Verify category badges on cards (no match scores). |
| **E2E-MATCH-03** | **Filter by Skin Type**<br>1. Navigate to /buyer/recommendations.<br>2. Uncheck default skin type.<br>3. Check "dry" skin type.<br>4. Verify grid updates with filtered results.<br>5. Verify page resets to 1. |
| **E2E-MATCH-04** | **Filter by Price Range**<br>1. Navigate to /buyer/recommendations.<br>2. Enter min price 2000.<br>3. Enter max price 5000.<br>4. Verify grid updates with products in price range.<br>5. Verify page resets to 1. |
| **E2E-MATCH-05** | **Filter by Ingredients**<br>1. Navigate to /buyer/recommendations.<br>2. Check "Vitamin C" ingredient.<br>3. Verify grid updates with products containing Vitamin C.<br>4. Verify page resets to 1. |
| **E2E-MATCH-06** | **Sort by Price**<br>1. Navigate to /buyer/recommendations.<br>2. Change sort to "Price".<br>3. Verify grid updates with products sorted by price.<br>4. Toggle sort direction.<br>5. Verify grid re-sorts. |
| **E2E-MATCH-07** | **Reset Filters**<br>1. Apply multiple filters.<br>2. Click "Reset Filters".<br>3. Verify all filters cleared.<br>4. Verify grid returns to default results. |
| **E2E-MATCH-08** | **Pagination**<br>1. Navigate to /buyer/recommendations.<br>2. Verify page 1 is active.<br>3. Click page 2.<br>4. Verify grid updates with page 2 results.<br>5. Verify scroll to top of grid. |
| **E2E-MATCH-09** | **Load More (Mobile)**<br>1. Resize to mobile viewport.<br>2. Navigate to /buyer/recommendations.<br>3. Verify "Load More" button visible.<br>4. Click "Load More".<br>5. Verify new results appended to grid. |
| **E2E-MATCH-10** | **Click Recommendation Card**<br>1. Navigate to /buyer/recommendations.<br>2. Click a recommendation card.<br>3. Verify navigation to /buyer/products/:slug. |
| **E2E-MATCH-11** | **View Recommendation History**<br>1. Login as buyer with past analysis sessions.<br>2. Navigate to /buyer/recommendations.<br>3. Verify "Previously Recommended" section visible.<br>4. Expand a session.<br>5. Verify mini-cards displayed. |
| **E2E-MATCH-12** | **Stale Analysis Retake Prompt**<br>1. Login as buyer with analysis > 24h old.<br>2. Navigate to /buyer/recommendations.<br>3. Verify "Want Fresh Results?" subtle banner.<br>4. Click "Retake Analysis →".<br>5. Verify navigation to /buyer/skin-analysis. |
| **E2E-MATCH-13** | **Ad Panel Display**<br>1. Navigate to /buyer/recommendations.<br>2. Verify ad panel visible with slides.<br>3. Verify auto-slide advances every 5 seconds.<br>4. Verify disclosure footer visible.<br>5. Click CTA button.<br>6. Verify navigation to product page. |
| **E2E-MATCH-14** | **Ad Panel Impression Tracking**<br>1. Navigate to /buyer/recommendations.<br>2. Scroll to ad panel.<br>3. Verify panel visible ≥ 50%.<br>4. Verify impression tracking fires (network request). |
| **E2E-MATCH-15** | **Similar Products on Product Detail**<br>1. Navigate to /buyer/products/:id.<br>2. Scroll to "Similar Products" section.<br>3. Verify similar products displayed.<br>4. Verify products share same category.<br>5. Click a similar product.<br>6. Verify navigation to that product. |
| **E2E-MATCH-16** | **Error Handling**<br>1. Simulate network error on recommendations API.<br>2. Verify error banner with retry button.<br>3. Click Retry.<br>4. Verify refetch succeeds. |
| **E2E-MATCH-17** | **Empty Results**<br>1. Apply filters that return no results.<br>2. Verify "No matching products" empty state.<br>3. Verify "Reset Filters" button visible.<br>4. Click "Reset Filters".<br>5. Verify results restored. |
| **E2E-MATCH-18** | **Language Toggle**<br>1. Navigate to /buyer/recommendations.<br>2. Toggle language to Japanese.<br>3. Verify all labels change to Japanese.<br>4. Toggle language to Myanmar.<br>5. Verify all labels change to Myanmar.<br>6. Toggle back to English. |
| **E2E-MATCH-19** | **Responsive Layout**<br>1. Navigate to /buyer/recommendations on desktop (1024px+).<br>2. Verify sidebar filters + 4-column grid.<br>3. Resize to tablet (768px).<br>4. Verify narrower sidebar + 2-column grid.<br>5. Resize to mobile (< 768px).<br>6. Verify drawer filters + 1-column grid. |
| **E2E-MATCH-20** | **Unauthorized Access**<br>1. Navigate to /buyer/recommendations without login.<br>2. Verify redirect to `/login`. |

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
| [DD_MATCH_05](./DD_MATCH_05_BUSINESS_LOGIC.md) | Business logic tested by unit tests |
| [DD_MATCH_02](./DD_MATCH_02_FRONTEND_Page.md) | Frontend components tested |
| [DD_MATCH_03](./DD_MATCH_03_API_ENDPOINTS.md) | API endpoints tested |
| [機能設計書_Matching_And_Recommendation](../機能設計書_Matching_And_Recommendation.md) | Functional requirements |
