# DD_MATCH_01 — Module Overview

> **Doc ID:** SKM-DD-MATCH-01 | **Version:** 1.1 | **Status:** Released  
> **Last Updated:** 2026-10-15 (code reconciliation)

> **Source update (2026-10-15):** Current UI is `MatchingRecommendations.tsx`. The page provides category, skin type, price, and minimum-rating filters; ingredients are API-only. The UI uses 12 items per page, Newest (`createdAt desc`) by default, numbered pagination, and grid/list modes. Similar lookup is public. Sponsored placement is `recommendation_page_banner` and uses the shared `AdBannerSlider`; legacy Slide-Down/rotation details below are superseded by the shared component.

---

## 1. Module Overview

The **Matching & Recommendation Module** (おすすめ・マッチングモジュール) is the personalized product discovery engine within the Cosmetics Finder platform. It translates a buyer's AI skin analysis results into ranked, score-annotated product recommendations, provides multi-dimensional filtering (skin type, ingredients, price range), maintains recommendation history from completed analysis sessions, and displays sponsored advertisements through a reusable cross-screen Slide-Down Panel.

This module bridges the AI Skin Analysis subsystem and the Product Catalog. It computes a 0–100 match score per product based on skin type compatibility, skin concern matching, average rating, and featured status, while maintaining performance through Redis caching and ensuring only active products from approved merchant shops are surfaced.

---

## 2. Supported Use Cases

| ID | Use Case | Description |
|---|----------|-------------|
| UC-MATCH-001 | Get Personalized Recommendations | Compute a ranked list of products ("Recommended for You") based on the buyer's skin type, skin concerns, and latest AI skin analysis results. Returns scored products when analysis exists; returns generic featured/top-rated products when no analysis is available. |
| UC-MATCH-002 | Get Similar Products | Recommend products similar to a given product (shared category and skin type compatibility) on product detail pages. Public endpoint — no authentication required. |
| UC-MATCH-003 | Filter by Skin Type | Narrow recommendation results to products compatible with selected skin types using `hasSome` semantics on `products.skin_types` array. |
| UC-MATCH-004 | Filter by Ingredients | Narrow recommendation results to products containing any selected ingredient using `hasSome` semantics on `products.ingredients` array. |
| UC-MATCH-005 | Filter by Price Range | Narrow recommendation results to products within `minPrice`/`maxPrice` bounds. |
| UC-MATCH-006 | Filter by Category | Narrow results to a category and all of its descendants (`categoryId`, alias `category`). UI: `CategorySelect` + chip. |
| UC-MATCH-007 | Filter by Minimum Rating | Narrow results to products with `avgRating >= rating` (1–5). UI: rating radios 3.0–4.5+. |
| UC-MATCH-008 | View Recommendation History | View past recommendations from the buyer's completed AI skin analysis sessions, grouped by analysis date. |
| UC-MATCH-009 | View Sponsored Recommendations | Display sponsored ads from approved merchants in the Cross-Screen Slide-Down Panel (D0) with transparent disclosure. |
| UC-MATCH-010 | Track Ad Interactions | Record impressions (when panel visible ≥ 50%) and clicks (on CTA) for sponsored ad analytics. |

---

## 3. Session State Machine (Recommendation Scope)

The Matching & Recommendation module manages three distinct source states based on the buyer's analysis availability.

```mermaid
stateDiagram-v2
    [*] --> DETERMINING_SOURCE : Page Load
    
    DETERMINING_SOURCE --> AI_FRESH : Analysis valid (≤ 24h)
    DETERMINING_SOURCE --> AI_STALE : Analysis exists (> 24h)
    DETERMINING_SOURCE --> GENERIC : No analysis found
    
    AI_FRESH --> LOADING : Fetch personalized
    AI_STALE --> LOADING : Fetch personalized
    GENERIC --> LOADING : Fetch generic
    
    LOADING --> SUCCESS : 200 OK
    LOADING --> EMPTY : total = 0
    LOADING --> ERROR : Network / 4xx / 5xx
    
    SUCCESS --> LOADING : Filter / Sort / Page change
    EMPTY --> LOADING : Reset filters
    ERROR --> LOADING : Retry clicked
    
    AI_FRESH --> DETERMINING_SOURCE : New analysis completed
    AI_STALE --> DETERMINING_SOURCE : Retake analysis
    GENERIC --> DETERMINING_SOURCE : Analysis completed
```

**Source States:**

| State | Description | UI Indicator | Match Scores | Prompt Banner |
|-------|-------------|:------------:|:------------:|:-------------:|
| `AI_FRESH` | Latest completed analysis ≤ 24h old | "🧬 AI Analysis" (emerald) | Shown | Hidden |
| `AI_STALE` | Latest completed analysis > 24h old | "🧬 AI Analysis" (emerald) | Shown | Subtle: "Want Fresh Results?" |
| `GENERIC` | No valid analysis available | "⬡ General Picks" (amber) | Hidden | Prominent: "Start Skin Analysis →" |

---

## 4. Security & Permissions

1. **JWT Authentication**: Personalized and history endpoints require JWT and `buyer` role.
2. **Public Endpoint**: Similar products route declares no JWT/role guard. Ads panel access is owned by the ads module.
3. **Role-Based Access**: Matching controller has no merchant/admin read access; protected routes are buyer-only.
4. **Rate Limiting**: No matching-controller rate-limit decorator is declared.
5. **Data Isolation**: Buyers only see their own recommendation history.
6. **Input Sanitization**: All filter parameters validated via Zod (frontend) and class-validator (backend).
7. **Prisma Parameterized Queries**: All database queries use parameterized statements — no raw SQL.
8. **Cache Security**: Personalized cache keys include user ID; no sensitive data cached in Redis.
9. **XSS Prevention**: User input sanitized before rendering; React auto-escaping.
10. **No console.log**: Production code uses NestJS Logger with `[MatchingService]` context.

---

## 5. Architectural Components Involved

| Layer | Files |
|-------|-------|
| **Frontend Pages** | `frontend/src/pages/buyer/MatchingRecommendations.tsx`; product detail integration is separate |
| **Frontend Components** | Matching feature components plus shared `frontend/src/components/shared/AdBannerSlider.tsx` |
| **Frontend Hooks** | `useMatching.ts`, `useMatchFilters.ts`; shared `features/search/hooks/useSponsoredAds.ts` supplies the ad data actually rendered |
| **Frontend Services** | `frontend/src/features/buyer/matching/services/matching.service.ts` |
| **Frontend Schemas** | `frontend/src/schemas/matching.schema.ts` |
| **Frontend Providers** | — |
| **Backend API** | `backend/src/modules/buyer/matching/matching.controller.ts`; ads controller is `backend/src/modules/shared/ads/ads.controller.ts` |
| **Backend Service** | `backend/src/modules/buyer/matching/matching.service.ts` |
| **Backend DTOs** | `backend/src/modules/buyer/matching/dto/` |
| **Backend Guards** | `jwt-auth.guard.ts`, `roles.guard.ts` |
| **Backend Strategies** | `jwt-access.strategy.ts` |
| **Shared Services** | `prisma.service.ts` (products, skin_analyses, skin_analysis_recommendations, advertisements, shops), `redis.service.ts` (caching, ad rotation) |

---

## 6. API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:-------------:|
| `GET` | `/api/v1/recommendations/personalized` | Get personalized or generic recommendations | Yes (buyer) |
| `GET` | `/api/v1/recommendations/similar/:productId` | Get similar products for a given product | No |
| `GET` | `/api/v1/recommendations/history` | Get recommendation history from past analysis sessions | Yes (buyer) |
| — | Ads panel and tracking routes | Shared ads module; matching page uses `recommendation_page_banner`. `GET /api/v1/ads?placement=` is the endpoint the page's `useSponsoredAds` hook calls | Separate module |

> **Note (2026-10-15):** No rate limiting is implemented on any matching/ads endpoint (no `ThrottlerModule` in the backend).

---

## 7. Database Tables Involved

| Table | Purpose | Operations |
|-------|---------|------------|
| `products` | Product catalog with skin_types, ingredients, price, is_featured, avg_rating, stock | SELECT (recommendations, similar) |
| `categories` | Product categories (used for similar product matching) | SELECT (JOIN with products) |
| `shops` | Merchant shop info, is_approved flag | SELECT (JOIN to filter approved shops only) |
| `skin_analyses` | Buyer's AI skin analysis results, skin_type, completed_at | SELECT (source determination, history) |
| `skin_analysis_recommendations` | Recommended products per analysis session (read via the `skinAnalysis.recommendations` include in `getHistory`) | SELECT only — INSERTs are owned by the AI Skin Analysis module |
| `advertisements` | Sponsored ad data, is_active, approval_status, payment_amount | SELECT (ad panel) |

---

## 8. External Dependencies

| Dependency | Purpose | Configuration |
|------------|---------|---------------|
| Redis | Personalized recommendation response cache (TTL 5min) | `REDIS_URL` |
| Prisma ORM | Database queries with type-safe WHERE clauses | `DATABASE_URL` |
| TanStack Query | Frontend data fetching, caching, and invalidation | — |
| Zod | Frontend query parameter validation and coercion | — |
| class-validator | Backend DTO validation | — |

---

## 9. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_MATCH_02](./DD_MATCH_02_FRONTEND_Page.md) | Frontend page design |
| [DD_MATCH_03](./DD_MATCH_03_API_ENDPOINTS.md) | Backend REST API contract |
| [DD_MATCH_04](./DD_MATCH_04_DTOS_AND_TYPES.md) | DTO and type definitions |
| [DD_MATCH_05](./DD_MATCH_05_BUSINESS_LOGIC.md) | Backend business rules and matching algorithm |
| [DD_MATCH_06](./DD_MATCH_06_TEST_SPEC.md) | Test specification |
| [機能設計書_Matching_And_Recommendation](../機能設計書_Matching_And_Recommendation.md) | Full functional specification |
| [画面項目設計書_Matching_And_Recommendation](../画面項目設計書_Matching_And_Recommendation.md) | Screen items specification |
