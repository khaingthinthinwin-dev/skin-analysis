# Functional Specification (機能設計書) — Matching & Recommendation

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-FDS-MATCH-001 |
| **Target Screen** | Recommendations Page (おすすめ商品ページ) — Matching & Recommendation |
| **Subsystem** | Buyer Module — Smart Product Matching & Personalized Recommendation |
| **Function ID** | FN-MATCH-001 |
| **Version** | 1.0 |
| **Created** | 2026-08-13 |
| **Last Updated** | 2026-08-13 |
| **Author** | Software Architect |
| **Status** | Released (承認済み) |
| **Classification** | Internal — Engineering Division |

---

## Document Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-08-13 | Software Architect | Initial functional specification for the Matching & Recommendation page covering personalized recommendations, matching algorithm scoring, skin type / ingredient / price / rating filters, similar products, and permission control. |

---

## Table of Contents

1. [Functional Overview](#1-functional-overview)
2. [Use Cases and Business Workflow](#2-use-cases-and-business-workflow)
3. [State Transition Specification](#3-state-transition-specification)
4. [Business Rules](#4-business-rules)
5. [Screen Specifications](#5-screen-specifications)
6. [Functional Operation Specification](#6-functional-operation-specification)
7. [Input / Output Specification](#7-input--output-specification)
8. [Input Validation Rules](#8-input-validation-rules)
9. [Error Handling Specification](#9-error-handling-specification)
10. [Permission and Access Control](#10-permission-and-access-control)
11. [Real-Time Notification Behavior](#11-real-time-notification-behavior)
12. [Screen Transition Specification](#12-screen-transition-specification)
13. [Non-Functional Considerations](#13-non-functional-considerations)
14. [Configurable Items (External Definitions)](#14-configurable-items-external-definitions)
15. [Cross-Reference Traceability Matrix](#15-cross-reference-traceability-matrix)

---

## 1. Functional Overview

### 1.1 Purpose and Scope

This screen serves as the personalized product discovery entry point within the Cosmetics Finder platform. The Matching & Recommendation subsystem provides the complete set of capabilities necessary for buyers to receive personalized skincare product recommendations derived from their skin profile and AI skin analysis results, to narrow those recommendations through multi-dimensional matching filters (skin type, ingredients, price range, review rating), and to discover similar products from any product detail context.

This subsystem bridges AI skin analysis and the product catalog. It is responsible for translating a buyer's skin conditions into a ranked, score-annotated set of compatible products while maintaining performance through Redis caching and guaranteeing that only active products from approved merchant shops are ever surfaced.

### 1.2 Functional Responsibilities

This screen is responsible for the following core functional areas:

1. **Personalized Recommendations** — Computing a ranked list of products ("Recommended for You") based on the buyer's skin type, skin concerns, and latest AI skin analysis results.
2. **Matching Score Calculation** — Scoring each product with a 0–100 match score derived from skin type compatibility, skin concern match, average rating, and featured status.
3. **Similar Product Discovery** — Recommending products similar to a given product (shared category and skin type compatibility) on product detail pages.
4. **Multi-Dimensional Matching Filters** — Enabling buyers to narrow recommendations by skin type, ingredients, price range, and minimum review rating.
5. **Manual Skin Profile Fallback** — Allowing buyers without an AI analysis to set or confirm skin type and skin concerns as the personalization data source.
6. **Personalization Source Awareness** — Distinguishing whether recommendations are driven by AI analysis, manual profile, or generic (featured/top-rated) fallback.
7. **Skin Type Compatibility Display** — Showing each recommendation's compatible skin types and match score so buyers understand why a product was recommended.
8. **Caching** — Serving repeated personalized recommendation queries from Redis to meet performance targets, with invalidation on profile or analysis changes.

### 1.3 Target Users

| Attribute | Value |
|-----------|-------|
| **Primary Actor** | Buyer (authenticated, personalized), Visitor (unauthenticated, generic fallback) |
| **Required Authentication** | JWT Bearer Token (personalized recommendations), None (similar products, generic fallback) |
| **Data Scope** | Own skin profile + latest AI analysis result (personalized), global active product catalog (filters / similar) |

### 1.4 Relationships with Other Functions and Peripheral Systems

```text
┌──────────────────────────┐      ┌─────────────────────────────────────┐
│   Buyer Actor            │      │  users / skin analysis (AI result)   │
│  (Searches & Filters)    ├─────►│  Reads skin profile + analysis       │
└──────────────────────────┘      └──────────────┬──────────────────────┘
                                                 │ Reads/Writes
                                                 ▼
                                       ┌────────────────────────┐
                                       │  Matching Service      │
                                       │  (Scoring + Filters)   │
                                       └──────────┬─────────────┘
                                                  │ Cache-Aside
                                                  ▼
┌──────────────────────────┐      ┌─────────────────────────────────────┐
│   Product Detail Page    │      │     Redis / PostgreSQL              │
│   (/products/:slug)      │◄─────┤  Cached results & product catalog   │
│   Similar Products       │      └─────────────────────────────────────┘
└──────────────────────────┘
```

### 1.5 Inputs / Outputs

| Input Information | Data Category | Source / Description |
|-------------------|---------------|----------------------|
| `skinTypes` | Query Parameter | Skin type filter / personalization override (comma-separated) |
| `ingredients` | Query Parameter | Ingredient filter (comma-separated) |
| `minPrice` | Query Parameter | Lower price bound |
| `maxPrice` | Query Parameter | Upper price bound |
| `rating` | Query Parameter | Minimum average rating (1–5) |
| `sort` | Query Parameter | Sort field (`matchScore`, `price`, `rating`, `createdAt`) |
| `order` | Query Parameter | Sort direction (`asc`, `desc`) |
| `page` | Query Parameter | Page number (1-indexed) |
| `limit` | Query Parameter | Items per page (max 50) |
| `productId` | Path Parameter | Product ID for similar-product lookup |
| `source` | Query Parameter | Personalization source override (`ai`, `manual`, `generic`) |
| `profile` | Request Body | Manual skin profile (skin type + skin concerns) for fallback |

| Output Information | Data Category | Destination / Description |
|--------------------|---------------|---------------------------|
| `data` | Recommendation Result DTO Array | Paginated list of scored product recommendations |
| `meta` | Pagination Meta DTO | `page`, `limit`, `total`, `totalPages` |
| `source` | Source Enum | Personalization data source used (`ai`, `manual`, `generic`) |
| `data` (similar) | Product Summary DTO Array | Similar products for a given product |

### 1.6 Related Documents

| No. | Document ID | Document Name | File Path / Reference | Remarks |
|-----|-------------|---------------|----------------------|---------|
| 1 | SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | Business workflow logic, required fields (B-MATCH-*, B-AI-004, B-PROF-004/005), and rules (Rule 4.2.1, 4.2.2, 4.7.2). |
| 2 | SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | Table structures (`products`, `categories`, `shops`), `skin_types` / `skin_concerns` lookup tables, indexes. |
| 3 | SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | Security rules (Section 12.2), API standards (8.3), performance standards (10.3). |

---

## 2. Use Cases and Business Workflow

### 2.1 Use Case Catalog

| UC-ID | Use Case Name | Precondition | Postcondition | Triggering Actor |
|-------|---------------|--------------|---------------|------------------|
| UC-MATCH-001 | Get Personalized Recommendations | Buyer has a skin profile or AI analysis result. | Ranked, score-annotated recommendation list displayed. | Buyer |
| UC-MATCH-002 | Get Similar Products | Product detail page loaded with active product. | List of similar products displayed on detail page. | Visitor / Buyer |
| UC-MATCH-003 | Filter by Skin Type | Recommendations displayed. | Results narrowed to products compatible with the selected skin types. | Visitor / Buyer |
| UC-MATCH-004 | Filter by Ingredients | Recommendations displayed. | Results narrowed to products containing any selected ingredient. | Visitor / Buyer |
| UC-MATCH-005 | Filter by Price Range | Recommendations displayed. | Results narrowed to products within the min/max price bounds. | Visitor / Buyer |
| UC-MATCH-006 | Filter by Minimum Rating | Recommendations displayed. | Results narrowed to products with `avg_rating >= rating`. | Visitor / Buyer |
| UC-MATCH-007 | Set Manual Skin Profile | Buyer has no AI analysis result. | Manual skin type + concerns saved; personalized recommendations generated from them. | Buyer |
| UC-MATCH-008 | View Product Detail from Recommendation | Recommendations displayed. | Buyer navigates to `/products/:slug`. | Visitor / Buyer |

### 2.2 Primary Business Workflow

```
                     ┌──────────────────────┐
                     │  Buyer Arrives at    │
                     │  /recommendations    │
                     └───────────┬──────────┘
                                 │
                                 ▼
                   ┌─────────────────────────────┐
                   │  Personalization Source     │
                   │  Determination              │
                   └──────┬──────────┬───────────┘
                          │          │
              ┌───────────┼──────────┼───────────┐
              ▼           ▼          ▼
     ┌─────────────┐ ┌─────────┐ ┌──────────────┐
     │ AI Analysis │ │ Manual  │ │ No Data →    │
     │ Available   │ │ Profile │ │ Prompt to    │
     │ (Rule 4.7.2)│ │ Set     │ │ Set Profile  │
     └──────┬──────┘ └────┬────┘ └──────────────┘
            │             │
            ▼             ▼
     ┌────────────────────────────────────────────┐
     │  Build Personalization Context              │
     │  (skinTypes, skinConcerns)                  │
     └──────────────────┬─────────────────────────┘
                        │
                        ▼
     ┌────────────────────────────────────────────┐
     │  GET /api/v1/recommendations/personalized  │
     │  MatchingService.getPersonalized(query)    │
     └──────────────────┬─────────────────────────┘
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
        ┌──────────────┐    ┌──────────────────────┐
        │ Redis HIT    │    │ Redis MISS →         │
        │ (≤200ms)     │    │ PostgreSQL WHERE     │
        └──────┬───────┘    │ is_active + approved │
               │            │ shop + skin types    │
               │            │ + filters            │
               │            └──────────┬───────────┘
               │                       │
               │                       ▼
               │            ┌──────────────────────┐
               │            │ findMany + count     │
               │            │ Compute match score  │
               │            │ Sort by score        │
               │            │ Seed Redis (TTL 5m)  │
               │            └──────────┬───────────┘
               │                       │
               └───────────┬───────────┘
                           ▼
              ┌────────────────────────────┐
              │  SUCCESS                   │
              │  (200, { data, meta,       │
              │   source })                │
              └────────────┬───────────────┘
                           │
              ┌────────────┴───────────┐
              ▼                        ▼
       ┌────────────────┐      ┌──────────────────┐
       │ Render Match   │      │ FAILURE          │
       │ Cards + Score  │      │ (400/401/429/500)│
       └────────────────┘      └────────┬─────────┘
                                        │
                                        ▼
                                 ┌──────────────┐
                                 │ Display Error│
                                 │ / Retry      │
                                 └──────────────┘
```

### 2.3 Workflow Critical Path Summary

| Step | Action | Status Before | Status After | Assigned To |
|:----:|--------|---------------|--------------|-------------|
| 1 | Buyer navigates to /recommendations | — | Page displayed | System |
| 2 | System determines personalization source | — | Source = ai/manual/generic | System |
| 3 | Buyer applies filters / changes sort | Default list | URL params updated | Buyer |
| 4 | Frontend calls GET /api/v1/recommendations/personalized | URL params valid | Query in-flight (skeleton) | System |
| 5 | Backend checks Redis cache | — | HIT (return cached) or MISS (query DB) | System |
| 6 | Backend builds Prisma WHERE (active + approved shop + skin types + filters) | — | Filtered candidate set | System |
| 7 | Backend computes match score, sorts, returns `{ data, meta, source }` | — | 200 response | System |
| 8 | Frontend renders recommendation cards with match scores | Data received | Results displayed | System |
| 9 | Buyer clicks a recommendation | Results displayed | Navigates to /products/:slug | Buyer |

### 2.4 Relevant Requirements Covered

| Requirement ID | Requirement Summary |
|----------------|---------------------|
| B-MATCH-001 | System provides personalized recommendations based on skin analysis |
| B-MATCH-002 | User can filter products by skin type |
| B-MATCH-003 | User can filter products by ingredients |
| B-MATCH-004 | User can filter products by price range |
| B-MATCH-005 | User can filter products by review rating |
| B-MATCH-006 | System displays "Recommended for You" section |
| B-AI-004 | System recommends products based on analysis results |
| B-PROF-004 | User can set skin type (dry, oily, combination, sensitive, normal) |
| B-PROF-005 | User can set skin concerns (acne, dark spots, wrinkles, etc.) |
| B-PROD-006 | Product detail shows skin type compatibility |

---

## 3. State Transition Specification

### 3.1 Recommendation Page UI States

| State | Description | Results Displayed | Actions Available |
|-------|-------------|:-----------------:|-------------------|
| `IDLE` | Page loaded, no query in-flight | ✓ (default or cached list) | Filter, sort, paginate |
| `LOADING` | Query in-flight | Skeleton grid | New query (replaces in-flight) |
| `SUCCESS` | Query returned successfully | ✓ | Sort, filter, paginate, view detail |
| `EMPTY` | Query returned zero matches | Empty state | Reset filters, change profile |
| `NO_PROFILE` | No skin profile or analysis available | Profile prompt | Set skin profile, browse generic |
| `ERROR` | Query failed (network/5xx) | Error banner | Retry |

### 3.2 Recommendation Lifecycle Transitions

| Transition ID | Origin State | Target State | Trigger Action | Guard Conditions |
|---------------|--------------|--------------|----------------|------------------|
| TR-MATCH-01 | `IDLE` | `LOADING` | Filter/sort/page change or page load | Valid URL params |
| TR-MATCH-02 | `LOADING` | `SUCCESS` | Fetch resolves 200 | Data returned |
| TR-MATCH-03 | `LOADING` | `EMPTY` | Fetch resolves with `total = 0` | No matching products |
| TR-MATCH-04 | `LOADING` | `ERROR` | Fetch rejects (network/4xx/5xx) | Error response |
| TR-MATCH-05 | `LOADING` | `NO_PROFILE` | Fetch resolves with `source = generic` and no profile (fresh user) | No skin data on server |
| TR-MATCH-06 | `SUCCESS` | `LOADING` | Filter/sort/page changed | Params changed |
| TR-MATCH-07 | `EMPTY` | `LOADING` | Filters reset or profile updated | Params / profile changed |
| TR-MATCH-08 | `NO_PROFILE` | `LOADING` | User sets manual skin profile | Profile saved |
| TR-MATCH-09 | `ERROR` | `LOADING` | Retry clicked | — |

### 3.3 Personalization Data Source States

| Source | Description | Used When | Can Refresh |
|--------|-------------|-----------|:-----------:|
| `AI_ANALYSIS` | Latest AI skin analysis result (skin type + conditions) | Latest analysis is newer than 24h cache window (Rule 4.7.2) | ✓ (run new analysis) |
| `MANUAL_PROFILE` | Skin type + skin concerns set manually by the buyer | No analysis exists, or analysis is stale and user has a profile | ✓ (edit profile) |
| `GENERIC` | Featured + top-rated products (no personalization) | No analysis and no manual profile (guest or fresh buyer) | ✗ |

---

## 4. Business Rules

### 4.1 Personalization Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-MATCH-001 | Personalization Source Priority | The latest AI analysis result is used first; if none or stale (Rule 4.7.2), fall back to the buyer's manual skin profile; if neither exists, fall back to generic recommendations. | Backend (matching service) |
| BR-MATCH-002 | Authentication for Personalization | Personalized recommendations require a valid JWT and a `buyer` role (or higher). Guests always receive generic results. | Backend (JwtAuthGuard + service) |
| BR-MATCH-003 | Analysis Freshness | An AI analysis result is considered current for 24 hours after analysis; results beyond the window are treated as stale. | Backend (analysis cache TTL) |
| BR-MATCH-004 | Profile Requirement | A buyer with no analysis and no manual profile is prompted to set skin type and skin concerns before personalized results are meaningful. | Frontend (profile prompt) |
| BR-MATCH-005 | Guest Fallback | Unauthenticated visitors receive generic recommendations (featured products first, then highest-rated) without personalization. | Backend (public endpoint branch) |
| BR-MATCH-006 | Filter Override | If the buyer explicitly changes the `skinTypes` filter, the filtered value overrides the profile-derived skin types for that query. | Backend (query precedence) |

### 4.2 Matching Algorithm Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-MATCH-007 | Match Score Range | Every recommendation carries a `matchScore` between 0 and 100 (integer). | Backend (scoring) |
| BR-MATCH-008 | Score Components | Score = Skin Type Compatibility (50) + Skin Concern Match (20) + Average Rating (20) + Featured Boost (10). | Backend (scoring) |
| BR-MATCH-009 | Skin Type Compatibility | Products whose `skin_types` array contains the user's primary skin type receive the full 50 points; products containing a secondary skin type receive 30; products with no overlap receive 0. | Backend (Prisma + scoring) |
| BR-MATCH-010 | Concern Matching | Products whose `tags` or `ingredients` match the buyer's skin concerns (e.g., acne, dark spots, wrinkles) earn up to 20 points. | Backend (scoring) |
| BR-MATCH-011 | Rating Factor | `avg_rating >= 4.5` earns 20 points; `4.0–4.49` earns 15; `3.0–3.99` earns 10; below 3.0 earns 0. | Backend (scoring) |
| BR-MATCH-012 | Featured Boost | Products with `is_featured = true` earn a 10-point boost (deterministic tie-breaker ordering). | Backend (scoring) |
| BR-MATCH-013 | Skin Type Overlap Filter | Personalized queries require at least one overlapping skin type between the user and the product (`skin_types` `hasSome`); products with zero overlap are excluded. | Backend (Prisma `hasSome`) |
| BR-MATCH-014 | Similar Product Criteria | Similar products share the same `category_id` and at least one `skin_types` value with the source product; the source product itself and inactive products are excluded. | Backend (Prisma WHERE) |
| BR-MATCH-015 | Similar Limit | Similar product list is capped (default 8 items). | Backend (take limit) |

### 4.3 Filter Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-MATCH-016 | Skin Type Filter | `skinTypes` filter uses `hasSome` semantics on the `skin_types` array. | Backend (Prisma `hasSome`) |
| BR-MATCH-017 | Ingredient Filter | `ingredients` filter uses `hasSome` semantics on the `ingredients` array. | Backend (Prisma `hasSome`) |
| BR-MATCH-018 | Price Range Bounds | `price >= minPrice` and `price <= maxPrice`; both bounds must be ≥ 0. | Backend (DTO + Prisma) |
| BR-MATCH-019 | Rating Filter | `avg_rating >= rating`; rating must be 1–5. | Backend (DTO + Prisma) |
| BR-MATCH-020 | Page Reset on Change | Any filter or sort change resets `page` to 1. | Frontend (updateParams) |

### 4.4 Visibility Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-MATCH-021 | Active Products Only | Only `is_active = true` products appear in recommendations (Rule 4.2.1). | Backend (Prisma WHERE) |
| BR-MATCH-022 | Approved Shop Only | Products from unapproved merchant shops (`shops.is_approved = false`) are NEVER shown in recommendations (Section 12.2 of Development Rules). | Backend (Prisma join) |
| BR-MATCH-023 | Out-of-Stock Still Listed | Out-of-stock products remain listed but are flagged `isInStock: false` (Rule 4.2.2). | Backend (serialization) |

### 4.5 Sorting & Pagination Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-MATCH-024 | Default Sort | Personalized results default to `matchScore desc`; generic and similar results default to `createdAt desc`. | Backend (service logic) |
| BR-MATCH-025 | Sort Allowlist | `sort` ∈ {`matchScore`, `price`, `rating`, `createdAt`}; `order` ∈ {`asc`, `desc`}; other values rejected. | Backend (DTO validation) |
| BR-MATCH-026 | Pagination Defaults | `page` defaults to 1; `limit` defaults to 20; `limit` maximum 50. | Backend (DTO defaults) |
| BR-MATCH-027 | Result Counting | `total` counts the full match set ignoring pagination (`skip`/`take`). | Backend (Prisma `count`) |
| BR-MATCH-028 | Decimal Serialization | `price`, `compare_at_price`, and `avg_rating` serialized as strings (API Standard 8.3). | Backend (serializer) |
| BR-MATCH-029 | Cache-Aside Pattern | Redis checked first → miss → query DB → seed Redis. TTL must always be set. Never cache sensitive data. | Backend (matching service) |

---

## 5. Screen Specifications

### 5.1 Screen: Recommendations Page (`/recommendations`)

**Purpose:** Allow buyers to view personalized skincare product recommendations derived from their skin profile / AI analysis, narrow them through matching filters, and understand why each product was recommended.

#### 5.1.1 UI Elements

**Recommendations View:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-01 | Page Title | Heading (h1) | `matching.title` | Yes | "Recommended for You" / "あなたへのおすすめ" |
| EL-02 | Recommendations Subtitle | Text | `matching.subtitle` | No | Explains personalization ("Based on your skin analysis and profile") |
| EL-03 | Personalization Source Badge | Badge | `matching.source` | Conditional | Shows "AI Analysis" / "Your Profile" / "General Picks" |
| EL-04 | Skin Profile Summary | Text | `matching.profileSummary` | Conditional | Displays current skin type + concerns used for matching |
| EL-05 | Edit Skin Profile Link | Link | `matching.editProfile` | Conditional | Navigates to `/profile` (or inline editor) to change skin type/concerns |
| EL-06 | Set Skin Profile Prompt | EmptyState | `matching.noProfile` | Conditional | "Set your skin type to get personalized recommendations" + CTA button |
| EL-07 | Results Count | Text | `matching.resultsCount` | Yes | "{total} products matched" |
| EL-08 | Sort Select | Select | `matching.sort` | No | Dropdown: match score, price asc, price desc, rating, newest |
| EL-09 | Filters Panel | Aside (sidebar/drawer) | `matching.filtersTitle` | Yes | Container for all match filter groups |
| EL-10 | Skin Type Filter | Checkbox Group | `matching.skinType` | No | dry / oily / combination / sensitive / normal |
| EL-11 | Ingredients Filter | Checkbox Group | `matching.ingredients` | No | Ingredient filter (hasSome semantics) |
| EL-12 | Price Range Group | Accordion | `matching.priceRange` | No | Min/max price inputs |
| EL-13 | Min Price Input | Input (number) | `matching.minPrice` | No | Lower price bound |
| EL-14 | Max Price Input | Input (number) | `matching.maxPrice` | No | Upper price bound |
| EL-15 | Rating Group | Accordion | `matching.rating` | No | Minimum rating selector |
| EL-16 | Rating Selector | Star radio | — | No | 1–5 star minimum rating |
| EL-17 | Apply Filters Button | Button (primary) | `matching.applyFilters` | Yes | Apply current filter selections |
| EL-18 | Reset Filters Button | Button (outline) | `matching.resetFilters` | No | Clear all filters |
| EL-19 | Active Filter Chips | Chips | — | Conditional | Shows active filters with remove (×) and "Clear All" |
| EL-20 | Recommendation Grid | Grid | — | Yes | Responsive grid of `RecommendationCard` components |
| EL-21 | Recommendation Card | Card | — | Yes | Product image, name, price, skin types, match score badge |
| EL-22 | Match Score Badge | Badge | `matching.matchScore` | Yes | "92% match" on each card with tooltip explaining score |
| EL-23 | Skin Type Compatibility Row | Text | `matching.compatible` | Conditional | Lists compatible skin types on card |
| EL-24 | Reason Hint | Text | `matching.reason` | Conditional | "Matches your oily skin & acne concern" |
| EL-25 | Pagination | Pagination | `matching.pagination` | No | Previous/next + page numbers |
| EL-26 | Loading Skeleton | Skeleton | — | Conditional | Shimmer placeholders during fetch |
| EL-27 | Empty State | EmptyState | `matching.empty` | Conditional | "No matching products" + Reset Filters button |
| EL-28 | Error Banner | Alert | `matching.errors.serverError` | Conditional | Inline error with retry button |
| EL-29 | Mobile Filter Trigger | Button (icon) | `matching.openFilters` | Conditional | Opens filters drawer on mobile |

**Similar Products Section (on Product Detail page):**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-30 | Similar Products Heading | Heading (h2) | `matching.similarTitle` | No | "You may also like" / "こちらもおすすめ" |
| EL-31 | Similar Product Card | Card | — | Conditional | Reused `RecommendationCard` without match score |
| EL-32 | Similar Products Loading | Skeleton | — | Conditional | Shimmer placeholders during fetch |
| EL-33 | Similar Products Empty | EmptyState | `matching.similarEmpty` | Conditional | Hidden entirely when no similar products |

**Default State:**
- Personalization source determined automatically (AI analysis > manual profile > generic)
- Skin Type filter pre-selected from profile/analysis; filters sidebar on desktop, drawer on mobile
- 20 products per page, sorted by match score descending
- Skeleton grid shown during initial fetch
- Empty state shown when no products match the active query
- Profile prompt shown when no skin data exists (fresh buyer)

---

## 6. Functional Operation Specification

### 6.1 Operation: Get Personalized Recommendations

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Page load on `/recommendations`, filter/sort/page change, or profile/analysis update |
| **API Endpoint** | `GET /api/v1/recommendations/personalized` |
| **Request Content-Type** | Query parameters only |
| **Pre-Submission Validation** | `MatchQueryDto` validated via ValidationPipe; Zod schema validated on the frontend. Authentication required (`buyer` or higher). |
| **Processing Steps** | 1. Validate `MatchQueryDto` (whitelist + forbidNonWhitelisted). 2. Determine personalization source (AI analysis > manual profile > generic; BR-MATCH-001). 3. Resolve effective skin types (profile-derived unless overridden by `skinTypes` filter; BR-MATCH-006). 4. Redis lookup `cache:recommendations:user:{userId}:{hashOfQuery}` (skip for generic). 5. HIT → return cached JSON (TTL 5 min). 6. MISS → build Prisma WHERE clause (is_active, approved shop, skin type overlap `hasSome`, ingredient `hasSome`, price range, rating). 7. Fetch candidates with `category`, `shop` relations. 8. Compute `matchScore` per candidate (BR-MATCH-008~012). 9. Sort by match score (default) or requested sort. 10. Apply skip/take pagination + `count`. 11. Serialize Decimal fields as strings. 12. Seed Redis (5 min TTL). 13. Return `{ data, meta, source }`. |
| **Success Response** | 200 OK with `{ data: RecommendationResult[], meta, source }` |
| **Post-Action** | Render recommendation grid with match score badges and source badge |

### 6.2 Operation: Get Similar Products

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Product detail page load |
| **API Endpoint** | `GET /api/v1/recommendations/similar/:productId` |
| **Request Content-Type** | Path parameter |
| **Pre-Submission Validation** | Valid CUID `productId`; product exists and is active. Public endpoint. |
| **Processing Steps** | 1. Validate CUID format. 2. Load the source product (must be `is_active`). 3. Find products sharing `category_id` and at least one `skin_types` value (BR-MATCH-014), excluding the source product and inactive products. 4. Join `shops` and filter `is_approved = true`. 5. Sort by `avg_rating desc`, then `review_count desc`. 6. Cap at default similar limit (8). 7. Serialize Decimal fields as strings. 8. Return `{ data }`. |
| **Success Response** | 200 OK with `{ data: ProductSummary[] }` |
| **Post-Action** | Render "You may also like" section on product detail page |

### 6.3 Operation: Apply Match Filters

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Checkbox/input change in FiltersPanel, or "Apply Filters" button |
| **API Endpoint** | None (frontend URL state only) — combined with Get Personalized Recommendations (Sec 6.1) |
| **Request Content-Type** | URL query parameters |
| **Pre-Submission Validation** | `matchingSearchParamsSchema` parse (Zod) |
| **Processing Steps** | 1. Collect changed filters (skinTypes, ingredients, minPrice, maxPrice, rating). 2. Merge into current params with `page: 1` (BR-MATCH-020). 3. `setSearchParams(toQueryString(...))`. 4. TanStack Query refetches with new key. 5. Grid updates (skeleton during fetch). |
| **Success Response** | — |
| **Post-Action** | Updated result count and grid |

### 6.4 Operation: Set Manual Skin Profile

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Set Your Skin Profile" CTA in the profile prompt, or Edit Skin Profile link |
| **API Endpoint** | `PATCH /api/v1/users/me` (profile update) — referenced from matching feature |
| **Request Content-Type** | `application/json` |
| **Pre-Submission Validation** | `skinTypes` ∈ {dry, oily, combination, sensitive, normal}; `skinConcerns` array valid enums (acne, dark spots, wrinkles, sensitivity, dullness) |
| **Processing Steps** | 1. Buyer selects skin type and skin concerns. 2. Profile saved via `PATCH /api/v1/users/me`. 3. Backend invalidates `cache:recommendations:user:{userId}:*`. 4. Frontend refetches personalized recommendations. 5. Source badge switches to "Your Profile". |
| **Success Response** | 200 OK with updated user DTO |
| **Post-Action** | Recommendation grid refreshes with `source = manual` |

### 6.5 Operation: View Product Detail from Recommendation

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Click a recommendation card image or name |
| **API Endpoint** | `GET /api/v1/products/:slug` |
| **Request Content-Type** | Path parameter |
| **Pre-Submission Validation** | Valid slug |
| **Processing Steps** | 1. Navigate to `/products/:slug`. 2. Product detail page fetches by slug (is_active + approved shop enforced). 3. Similar products section loads via Sec 6.2. |
| **Success Response** | 200 OK with product detail DTO |
| **Post-Action** | Render Product Detail page with "You may also like" section |

---

## 7. Input / Output Specification

### 7.1 Input Specification — Personalized Recommendation Query (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|------------|
| `skinTypes` | Skin Type Filter | 肌タイプ | TEXT[] (comma-separated) | No | `@IsOptional()`, enum: dry/oily/combination/sensitive/normal |
| `ingredients` | Ingredients | 成分 | TEXT[] (comma-separated) | No | `@IsOptional()`, `@IsArray()` |
| `minPrice` | Minimum Price | 最低価格 | NUMERIC(10,2) | No | `@IsOptional()`, `@Min(0)` |
| `maxPrice` | Maximum Price | 最高価格 | NUMERIC(10,2) | No | `@IsOptional()`, `@Min(0)` |
| `rating` | Minimum Rating | 最低評価 | NUMERIC(3,2) | No | `@IsOptional()`, `@Min(1)`, `@Max(5)` |
| `sort` | Sort Field | 並び順項目 | ENUM | No (default: `matchScore`) | `@IsIn(['matchScore', 'price', 'rating', 'createdAt'])` |
| `order` | Sort Direction | 並び順 | ENUM | No (default: `desc`) | `@IsIn(['asc', 'desc'])` |
| `page` | Page | ページ | INTEGER | No (default: 1) | `@IsOptional()`, `@Min(1)` |
| `limit` | Items Per Page | 1ページあたりの件数 | INTEGER | No (default: 20) | `@IsOptional()`, `@Min(1)`, `@Max(50)` |
| `source` | Personalization Source | パーソナライズソース | ENUM | No | `@IsOptional()`, `@IsIn(['ai', 'manual', 'generic'])` |

**Request Example:**

```
GET /api/v1/recommendations/personalized?skinTypes=oily&minPrice=10&maxPrice=50&rating=4&sort=matchScore&order=desc&page=1&limit=20
Authorization: Bearer <accessToken>
```

### 7.2 Input Specification — Similar Products Query (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|------------|
| `productId` | Source Product | 対象商品 | VARCHAR(25) | Yes | CUID format |

**Request Example:**

```
GET /api/v1/recommendations/similar/clx1234567890
```

### 7.3 Output Specification — Recommendation Result (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `id` | `products.id` | CUID string |
| `name` | `products.name` | String |
| `slug` | `products.slug` | URL-friendly string |
| `shortDescription` | `products.short_description` | String |
| `price` | `products.price` | Decimal serialized as string |
| `compareAtPrice` | `products.compare_at_price` | Decimal string or null |
| `images` | `products.images` | Array of URL strings |
| `skinTypes` | `products.skin_types` | Array of skin type enums |
| `tags` | `products.tags` | Array of strings |
| `avgRating` | `products.avg_rating` | Decimal string |
| `reviewCount` | `products.review_count` | Integer |
| `isInStock` | `products.stock_quantity > 0` | Boolean |
| `matchScore` | Computed by matching service | Integer 0–100 (BR-MATCH-007) |
| `matchReasons` | Computed by matching service | Array of reason strings (e.g., ["Matches oily skin", "Addresses acne concern"]) |
| `category` | `categories` | `{ id, name, slug }` object |

**Response Example:**

```json
{
  "data": [
    {
      "id": "clx1234567890",
      "name": "Oil-Control Mattifying Gel",
      "slug": "oil-control-mattifying-gel",
      "shortDescription": "Sebum-regulating gel for oily skin",
      "price": "29.99",
      "compareAtPrice": "39.99",
      "images": ["https://cdn.example.com/products/clx1234567890/main.webp"],
      "skinTypes": ["oily", "combination"],
      "tags": ["acne", "sebum", "fragrance-free"],
      "avgRating": "4.6",
      "reviewCount": 98,
      "isInStock": true,
      "matchScore": 92,
      "matchReasons": ["Matches your oily skin", "Addresses your acne concern"],
      "category": { "id": "clxcat001", "name": "Moisturizers", "slug": "moisturizers" }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 36,
    "totalPages": 2
  },
  "source": "ai"
}
```

### 7.4 Output Specification — Recommendation Meta (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `page` | Requested page number | Integer |
| `limit` | Requested items per page | Integer |
| `total` | `prisma.product.count({ where })` | Integer |
| `totalPages` | `Math.ceil(total / limit)` | Integer |

### 7.5 Output Specification — Personalization Source (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `source` | Matching service determination (BR-MATCH-001) | `"ai"` / `"manual"` / `"generic"` |
| `skinTypesUsed` | Effective skin types after override resolution (BR-MATCH-006) | Array of skin type enums |
| `skinConcernsUsed` | Buyer's skin concerns used for concern scoring | Array of concern enums |

---

## 8. Input Validation Rules

### 8.1 Personalized Query Validation (Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `skinTypes` | Optional, valid enum values | "Invalid skin type" | "無効な肌タイプです" |
| `ingredients` | Optional, array of strings | "Invalid ingredients" | "無効な成分です" |
| `minPrice` | Optional, ≥ 0 | "Minimum price must be 0 or more" | "最低価格は0以上である必要があります" |
| `maxPrice` | Optional, ≥ 0 | "Maximum price must be 0 or more" | "最高価格は0以上である必要があります" |
| `rating` | Optional, 1–5 | "Rating must be between 1 and 5" | "評価は1〜5の間である必要があります" |
| `sort` | Optional, matchScore/price/rating/createdAt | "Invalid sort field" | "無効な並び順項目です" |
| `order` | Optional, asc/desc | "Invalid sort direction" | "無効な並び順です" |
| `page` | Optional, ≥ 1 | "Page must be at least 1" | "ページは1以上である必要があります" |
| `limit` | Optional, 1–50 | "Limit must be between 1 and 50" | "件数は1〜50の間である必要があります" |
| `source` | Optional, ai/manual/generic | "Invalid source" | "無効なソースです" |
| `productId` | Required, valid CUID | "Invalid product ID" | "無効な商品IDです" |

### 8.2 Manual Skin Profile Validation (Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `skinType` | Required, enum: dry/oily/combination/sensitive/normal | "Skin type is required" / "Invalid skin type" | "肌タイプは必須です" / "無効な肌タイプです" |
| `skinConcerns` | Optional, enum: acne/dark_spots/wrinkles/sensitivity/dullness | "Invalid skin concern" | "無効な肌悩みです" |

### 8.3 Validation Enforcement Layers

1. **Frontend (Client)**: `matchingSearchParamsSchema` (Zod) parse + coercion of URL query parameters, with `z.coerce.number()` for numeric fields and real-time inline feedback.
2. **Backend (Server)**: NestJS ValidationPipe + class-validator DTOs on `GET /api/v1/recommendations/*` (whitelist + forbidNonWhitelisted).
3. **Database (DB)**: Prisma indexes and CHECK constraints (e.g., `chk_products_price`, `chk_products_stock`) as final safety net.

---

## 9. Error Handling Specification

### 9.1 Error Response Structure

```json
{
  "statusCode": 400,
  "message": ["limit must not be greater than 50", "rating must not be greater than 5"],
  "error": "Bad Request",
  "timestamp": "2026-08-13T12:00:00.000Z",
  "path": "/api/v1/recommendations/personalized"
}
```

### 9.2 Error Classification Table — Personalized Recommendations

| HTTP Status | Error Code | Scenario | User-Facing Behavior |
|-------------|------------|----------|---------------------|
| `400` | `BAD_REQUEST` | Validation failures (invalid params) | Inline validation hint + top banner |
| `401` | `UNAUTHORIZED` | Missing/invalid token on personalized endpoint | Redirect to login |
| `403` | `FORBIDDEN` | Non-buyer role attempting personalized access | Redirect to /unauthorized |
| `404` | `NOT_FOUND` | Similar product not found (invalid productId) | Empty state / hide similar section |
| `429` | `TOO_MANY_REQUESTS` | Rate limit exceeded on public similar endpoint | "Too many requests. Please wait" + retry countdown |
| `500` | `INTERNAL_SERVER_ERROR` | Server error | "Something went wrong" + retry button |

### 9.3 Frontend Error Display Behavior

- **Field-Level Validation**: Red border and inline text below invalid filter input (e.g., minPrice > maxPrice).
- **Form-Level Summary**: Alert banner at top of results area listing all errors.
- **Loading States**: Skeleton shimmer grid (shadcn `Skeleton`) during fetch; spinner on Apply buttons.
- **Empty Results**: `EmptyState` component with message + "Reset Filters" button.
- **No Profile**: `EmptyState` with "Set Your Skin Profile" CTA (transitions to `NO_PROFILE` state).
- **Retry**: TanStack Query `error` + `refetch` for transient failures.

### 9.4 Audit / Logging

| Event | Data Logged | Retention |
|-------|-------------|-----------|
| `RECOMMENDATION_EXECUTED` (warn level for slow queries > 500ms) | userId (if logged in), source, filters, result count, duration | 30 days |
| `RECOMMENDATION_SOURCE_EMPTY` (info) | userId, reason (no analysis, no profile) | 30 days |

Rules:
- NEVER log the full response body (security).
- NEVER log skin analysis image data or personal health data beyond the identifiers already in the event fields.
- Use NestJS `Logger` with `[MatchingService]` context. No `console.log`.

---

## 10. Permission and Access Control

### 10.1 Authentication Requirements

- Personalized recommendations require a valid JWT Bearer Token (`buyer` role or higher).
- Similar products endpoint is public — no JWT required.
- Rate limiting is enforced on the public similar products endpoint to protect against abuse.

### 10.2 Public vs Protected Endpoints

| Endpoint | Access Level | Description |
|----------|-------------|-------------|
| `GET /recommendations/personalized` | Protected | Requires valid access token + `buyer` role or higher |
| `GET /recommendations/similar/:productId` | Public | No authentication required |

### 10.3 Role-Based Access

| Role | Get Personalized | Filter Results | Get Similar | Set Manual Profile |
|------|:----------------:|:--------------:|:-----------:|:------------------:|
| Visitor (guest) | ✗ (generic only) | ✓ | ✓ | ✗ |
| `buyer` | ✓ | ✓ | ✓ | ✓ |
| `merchant` | ✓ | ✓ | ✓ | ✓ |
| `admin` | ✓ | ✓ | ✓ | ✓ |

### 10.4 Security Audit Logging

| Event | Data Logged | Retention |
|-------|-------------|-----------|
| `RECOMMENDATION_EXECUTED` | userId, source, filters, timestamp | 90 days |
| `RECOMMENDATION_ACCESS_DENIED` | userId, target endpoint, timestamp | 90 days |

---

## 11. Real-Time Notification Behavior

### 11.1 Current Implementation

The Matching & Recommendation page operates with standard REST API calls. Real-time WebSocket connections are not required for this feature; personalization changes (new analysis, profile edit) are reflected on the next query (mitigated by the 5-minute personalized cache TTL and immediate cache invalidation on profile/analysis change).

### 11.2 Client-Side State Updates

| Event | Trigger | Action |
|-------|---------|--------|
| `matching:paramChange` | URL query param change | Refetch recommendations query (TanStack Query invalidation) |
| `matching:profileUpdated` | Manual skin profile saved | Invalidate user cache keys, refetch with `source = manual` |
| `matching:analysisCompleted` | New AI analysis result returned | Invalidate user cache keys, refetch with `source = ai` |
| `matching:filterApplied` | Apply Filters / Reset Filters | Reset `page` to 1 and refetch |
| `matching:pageChange` | Pagination control click | Update `page` and refetch with `keepPreviousData` |

---

## 12. Screen Transition Specification

### 12.1 Inbound Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| Header navigation link | `/recommendations` | Click "Recommendations" / "おすすめ" |
| Home page | `/recommendations` | Click "Recommended for You" / "あなたへのおすすめ" section link |
| AI skin analysis result | `/recommendations` | Click "See My Recommendations" CTA after analysis completes |
| Profile page | `/recommendations` | Click "Get Recommendations" after setting skin profile |

### 12.2 Internal Navigation

| Source | Target | Trigger |
|--------|--------|---------|
| `/recommendations` | `/recommendations/:slug` | Click recommendation card image or name |
| `/recommendations` (self) | `/recommendations` (updated params) | Filter/sort/pagination change (URL replaced in place) |
| `/recommendations` | `/recommendations` (default) | Reset Filters clicked |

### 12.3 Outbound Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| `/recommendations` | `/products/:slug` | Click recommendation card |
| `/recommendations` | `/profile` | Click Edit Skin Profile link |
| `/recommendations` | `/skin-analysis` | Click "Run a New Analysis" prompt |
| `/recommendations` | `/login` | Session required action without valid token |

### 12.4 Error Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| `/recommendations` | (stay, retry) | 429/500 — error banner with retry button |
| `/recommendations` | `/login` | 401 on personalized endpoint |
| `/recommendations` | `/unauthorized` | 403 Forbidden (non-buyer role) |

---

## 13. Non-Functional Considerations

### 13.1 Performance Requirements (Performance Standards Section 10.3)

| Metric | Target |
|--------|--------|
| Personalized recommendation response time (10K records) | ≤ 3 seconds (NFR-002) |
| API response time (p95) | ≤ 500ms (NFR-003) |
| Filter application time | ≤ 500ms |
| Match score computation (in-memory) | ≤ 50ms |
| Cache hit response time | ≤ 200ms |
| Similar products response time | ≤ 500ms |
| Page Load (Initial Render) | ≤ 2 seconds (NFR-001) |

### 13.2 Caching Strategy (Section 5 / 10.5)

| Cache Target | Strategy | TTL | Invalidation |
|--------------|----------|-----|--------------|
| Personalized recommendation results | `cache:recommendations:user:{userId}:{hashOfQuery}` (String JSON) | 5 minutes | Profile update, new AI analysis, or any product mutation → `DEL` |
| Similar product results | `cache:recommendations:similar:{productId}` (String JSON) | 5 minutes | Product update/delete → `DEL` |

Rules:
- Cache-aside pattern: Check Redis → miss → query DB → seed Redis.
- Personalized cache key is scoped by `userId` + hash of serialized query params.
- Invalidation on profile or analysis change must purge ALL keys for that user (`cache:recommendations:user:{userId}:*`).
- ALWAYS set TTL. Never cache sensitive data.

### 13.3 Security Considerations

| Concern | Mitigation |
|---------|------------|
| SQL injection in filters | Prisma parameterized queries; no string interpolation into SQL |
| XSS in URL params | React auto-escaping, no `dangerouslySetInnerHTML` |
| Extremely long ingredient list | 400 validation error; max array length enforced |
| Invalid CUID in `productId` | 400 validation error |
| Data leakage (unapproved shops) | Unapproved shop products excluded at query level (Section 12.2) |
| Unauthorized personalization | JWT required; personalization data never returned to guests |
| PII / health data exposure | Never log analysis images or skin data; only identifiers in event logs |

### 13.4 Responsive Design Requirements

| Breakpoint | Layout |
|------------|--------|
| Desktop (≥ 1024px) | Filters sidebar + results grid (4 columns) |
| Tablet (768px – 1023px) | Filters sidebar (narrower) + grid (2–3 columns) |
| Mobile (< 768px) | Filters drawer (trigger EL-29) + stacked grid (1–2 columns) |

---

## 14. Configurable Items (External Definitions)

Defined via `.env` configuration:

| Definition Key | Default Value | Description |
|----------------|---------------|-------------|
| `RECOMMENDATION_DEFAULT_LIMIT` | `20` | Default items per page |
| `RECOMMENDATION_MAX_LIMIT` | `50` | Maximum items per page allowed |
| `RECOMMENDATION_SIMILAR_LIMIT` | `8` | Maximum number of similar products returned |
| `RECOMMENDATION_CACHE_TTL_SECONDS` | `300` | Personalized + similar result Redis cache TTL (5 minutes) |
| `RECOMMENDATION_ANALYSIS_TTL_HOURS` | `24` | AI analysis result freshness window (Rule 4.7.2) |
| `RECOMMENDATION_SCORE_SKIN_TYPE` | `50` | Weight for skin type compatibility score |
| `RECOMMENDATION_SCORE_CONCERN` | `20` | Weight for skin concern match score |
| `RECOMMENDATION_SCORE_RATING` | `20` | Weight for average rating factor |
| `RECOMMENDATION_SCORE_FEATURED` | `10` | Weight for featured product boost |
| `RECOMMENDATION_SLOW_QUERY_MS` | `500` | Slow-query warn threshold for `RECOMMENDATION_EXECUTED` logging |
| `RECOMMENDATION_RATE_LIMIT_PER_MINUTE` | `60` | Max public similar-request rate per minute per IP |

---

## 15. Cross-Reference Traceability Matrix

### 15.1 Requirements Definition Traceability

| Requirement ID | Requirement Description | Covered By (This Document) |
|----------------|-------------------------|----------------------------|
| B-MATCH-001 | System provides personalized recommendations based on skin analysis | UC-MATCH-001, Sec 6.1, BR-MATCH-001 |
| B-MATCH-002 | User can filter products by skin type | UC-MATCH-003, BR-MATCH-016 |
| B-MATCH-003 | User can filter products by ingredients | UC-MATCH-004, BR-MATCH-017 |
| B-MATCH-004 | User can filter products by price range | UC-MATCH-005, BR-MATCH-018 |
| B-MATCH-005 | User can filter products by review rating | UC-MATCH-006, BR-MATCH-019 |
| B-MATCH-006 | System displays "Recommended for You" section | Sec 5.1, EL-01, EL-21, Sec 6.1 |
| B-AI-004 | System recommends products based on analysis results | UC-MATCH-001, BR-MATCH-001, BR-MATCH-003 |
| B-PROF-004 | User can set skin type (dry, oily, combination, sensitive, normal) | UC-MATCH-007, Sec 6.4 |
| B-PROF-005 | User can set skin concerns (acne, dark spots, wrinkles, etc.) | UC-MATCH-007, Sec 6.4 |
| B-PROD-006 | Product detail shows skin type compatibility | BR-MATCH-009, EL-23, Sec 6.2 |

### 15.2 Database Design Traceability

| Database Table | Relevant Functional Operations |
|----------------|-------------------------------|
| `products` | Personalized match (SELECT with filters + skin_types `hasSome`), Match score computation (SELECT `skin_types`, `tags`, `ingredients`, `avg_rating`, `is_featured`), Similar products (SELECT by category + skin types) |
| `categories` | Similar product category join |
| `shops` | Merchant approval filter (SELECT join, `is_approved = true`) |
| `skin_types` | Lookup for valid skin type enums (matching + profile) |
| `skin_concerns` | Lookup for valid skin concern enums (matching + profile) |
| `reviews` | Rating aggregation (`avg_rating`, `review_count` maintenance) |

### 15.3 Related Document References

| Document ID | Document Name | File Path |
|-------------|---------------|-----------|
| SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` |
| SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` |
| SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` |

---

*End of Functional Specification (Matching & Recommendation)*
