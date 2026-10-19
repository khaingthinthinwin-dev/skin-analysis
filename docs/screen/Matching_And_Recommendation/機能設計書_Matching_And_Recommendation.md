# Functional Specification (機能設計書) — Matching & Recommendation

---

## Document Control

> **Current source alignment (2026-10-15):** This document retains its original structure. Where older sections conflict with the implementation, current behavior is: UI filters are category, skin type, price, and minimum rating (ingredients are API-only); default page size is 12 and default sort is `createdAt desc`; sorting supports `matchScore`, `price`, `rating`, and `createdAt`; results include wishlist/cart actions, grid/list toggle, numbered pagination, and five-session expandable history. Similar lookup returns an empty result for an unknown source product. The ad is the shared `AdBannerSlider` at `recommendation_page_banner`, with 5-second rotation, pause on hover/focus/reduced motion, ≥50% visibility impressions, and no separate disclosure footer. API/controller location is `backend/src/modules/buyer/matching/`.

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-FDS-MATCH-001 |
| **Target Screen** | Recommendations Page (おすすめ商品ページ) — Matching & Recommendation |
| **Subsystem** | Buyer Module — Smart Product Matching & Personalized Recommendation |
| **Function ID** | FN-MATCH-001 |
| **Version** | 1.1 |
| **Created** | 2026-08-26 |
| **Last Updated** | 2026-10-15 |
| **Author** | Software Architect |
| **Status** | Released (承認済み) |
| **Classification** | Internal — Engineering Division |

---

## Document Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-08-28 | Software Architect | Initial release. Functional specification for the Matching & Recommendation page covering AI-based recommendations, generic fallback, matching filters, recommendation history, similar products, and cross-screen ad panel. |
| 1.1 | 2026-10-15 | Code reconciliation | Reconciled with implementation: controller/service at `backend/src/modules/buyer/matching/`, page `MatchingRecommendations.tsx`; added rating/category filters; sort allowlist includes `rating`, UI default Newest; frontend page size 12; similar returns empty 200 (no 404); no rate limiting; ads via shared `AdBannerSlider` + `GET /ads`. |

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

This screen serves as the buyer's product discovery page. It uses the latest completed skin analysis when one exists, and otherwise returns general catalog results. Buyers can filter by category, skin type, price, and minimum rating, sort and paginate results, switch grid/list presentation, and use wishlist/cart actions. Ingredient filtering is supported by the API but has no control in this page.

This subsystem bridges AI skin analysis and the product catalog. It is responsible for translating a buyer's AI-detected skin conditions into a ranked, score-annotated set of compatible products while maintaining performance through Redis caching and guaranteeing that only active products from approved merchant shops are ever surfaced.

The subsystem also retrieves history from completed analysis sessions, exposes a public similar-product endpoint, and displays the shared sponsored-ad banner at the recommendation placement.

### 1.2 Functional Responsibilities

This screen is responsible for the following core functional areas:

1. **Personalized Recommendations** — Computing a ranked list of products ("Recommended for You") based on the buyer's skin type, skin concerns, and latest AI skin analysis results.
2. **Matching Score Calculation** — Scoring each product with a 0–100 match score derived from skin type compatibility, skin concern match, average rating, and featured status.
3. **Similar Product Discovery** — Recommending products similar to a given product (shared category and skin type compatibility) on product detail pages.
4. **Multi-Dimensional Matching Filters** — Enabling buyers to narrow recommendations by skin type, ingredients, and price range.
5. **Analysis-Result Conditional Display** — Using AI analysis results when available, and otherwise showing generic featured/top-rated recommendation results with a prompt to run AI analysis.
6. **Skin Type Compatibility Display** — Showing each recommendation's compatible skin types and match score so buyers understand why a product was recommended.
7. **Caching** — Serving repeated personalized recommendation queries from Redis to meet performance targets, with invalidation on analysis changes.
8. **Recommendation History** — Viewing past recommendations retrieved from the buyer's completed AI skin analysis results.
9. **Sponsored Banner Integration** — Rendering the shared `AdBannerSlider` at `recommendation_page_banner` and forwarding impression/click tracking callbacks. Ad selection and policy belong to the shared ads feature.
10. **Shopping Actions and Presentation** — Providing grid/list view, product detail links, wishlist toggles, and add-to-cart for in-stock items, with guest and duplicate-action feedback.

### 1.3 Target Users

| Attribute | Value |
|-----------|-------|
| **Primary Actor** | Buyer (authenticated; AI-result recommendations when analysis exists, generic recommendation results when analysis does not exist) |
| **Required Authentication** | Buyer route; JWT Bearer Token and buyer role for personalized/history APIs; similar-products API is public |
| **Data Scope** | Own latest AI analysis result when available; otherwise global active product catalog for generic results, filters, and similar products |

### 1.4 Relationships with Other Functions and Peripheral Systems

```text
┌──────────────────────────┐      ┌─────────────────────────────────────┐
│   Buyer Actor            │      │  skin_analyses (AI result)          │
│  (Searches & Filters)    ├─────►│  Reads skin type + conditions       │
└──────────┬───────────────┘      └──────────────┬──────────────────────┘
           │                                      │ Reads
           │                                      ▼
           │                            ┌────────────────────────┐
           │                            │  Matching Service      │
           │                            │  (Scoring + Filters)   │
           │                            └──┬────────┬────────┬───┘
           │                               │        │        │
           │                    ┌──────────┘        │        └──────────┐
           │                    ▼                   ▼                   ▼
           │         ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐
           │         │ skin_analysis_   │  │ advertisements│  │ shops            │
           │         │ recommendations  │  │ (sponsored)   │  │ (merchant info)  │
           │         └──────────────────┘  └──────────────┘  └──────────────────┘
           │
┌──────────┴───────────────┐      ┌─────────────────────────────────────┐
│   Product Detail Page    │      │     Redis / PostgreSQL              │
│   (/buyer/products/:id)  │◄─────┤  Cached results & product catalog   │
│   Similar Products       │      └─────────────────────────────────────┘
└──────────┬───────────────┘
```

### 1.5 Inputs / Outputs

| Input Information | Data Category | Source / Description |
|-------------------|---------------|----------------------|
| `skinTypes` | Query Parameter | Skin type filter / personalization override (comma-separated) |
| `ingredients` | Query Parameter | Ingredient filter (comma-separated) |
| `minPrice` | Query Parameter | Lower price bound |
| `maxPrice` | Query Parameter | Upper price bound |
| `rating` | Query Parameter | Minimum average rating (1–5) |
| `categoryId` / `category` | Query Parameter | Category filter; `category` is an alias |
| `sort` | Query Parameter | Sort field (`matchScore`, `price`, `rating`, `createdAt`) |
| `order` | Query Parameter | Sort direction (`asc`, `desc`) |
| `page` | Query Parameter | Page number (1-indexed) |
| `limit` | Query Parameter | Items per page (max 50; frontend default 12, service fallback 20) |
| `productId` | Path Parameter | Product ID for similar-product lookup |

| Output Information | Data Category | Destination / Description |
|--------------------|---------------|---------------------------|
| `data` | Recommendation Result DTO Array | Paginated list of scored product recommendations |
| `meta` | Pagination Meta DTO | `page`, `limit`, `total`, `totalPages` |
| `source`, `analysisAge`, `skinTypes` | Response Fields | Selected source plus analysis age and analysis-derived skin types |
| `data` (similar) | Product Summary DTO Array | Similar products for a given product |

### 1.6 Related Documents

| No. | Document ID | Document Name | File Path / Reference | Remarks |
|-----|-------------|---------------|----------------------|---------|
| 1 | SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | Matching & recommendation requirements (§3.4), AI skin analysis workflow (§3.1), product compatibility display (§3.2), and advertisement display rules (§7.6). |
| 2 | SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | Table structures (`products`, `categories`, `shops`, `skin_analysis_recommendations`, `advertisements`), `skin_types` array field on `products`, `skin_analysis_conditions` for skin concerns, indexes. |
| 3 | SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | Security rules (Section 5), API standards (Section 8.3), performance standards (Section 10.3). |

---

## 2. Use Cases and Business Workflow

### 2.1 Use Case Catalog

| UC-ID | Use Case Name | Precondition | Postcondition | Triggering Actor |
|-------|---------------|--------------|---------------|------------------|
| UC-MATCH-001 | Get Personalized Recommendations | Buyer has an AI analysis result. | Ranked, score-annotated recommendation list displayed. | Buyer |
| UC-MATCH-002 | Get Similar Products | Product detail page loaded with active product. | List of similar products displayed on detail page. | Visitor / Buyer |
| UC-MATCH-003 | Filter by Skin Type | Recommendations displayed. | Results narrowed to products compatible with the selected skin types. | Buyer |
| UC-MATCH-004 | Filter by Ingredients | Recommendations displayed. | Results narrowed to products containing any selected ingredient. | Buyer |
| UC-MATCH-005 | Filter by Price Range | Recommendations displayed. | Results narrowed to products within the min/max price bounds. | Buyer |
| UC-MATCH-006 | Filter by Category and Rating | Recommendations displayed. | Results narrowed to selected category descendants and the minimum rating. | Buyer |
| UC-MATCH-007 | Manage Wishlist and Cart | In-stock recommendation cards displayed. | Buyer can save/remove wishlist items or add an item to cart. | Buyer |
| UC-MATCH-010 | Sort, Paginate, and Change View | Recommendation results displayed. | Results reflect the URL sort/page; grid or list presentation selected locally. | Buyer |
| UC-MATCH-008 | View Recommendation History | Buyer has previous recommendation sessions. | Past recommended products displayed with timestamps. | Buyer |
| UC-MATCH-009 | View Sponsored Recommendations | Approved, active, paid ads exist. | Sponsored ads appear in the Slide-Down Panel (D0) above the recommendation grid, labeled with disclosure footer. | Buyer |

### 2.2 Primary Business Workflow

```
                     ┌──────────────────────┐
                     │  Buyer Arrives at    │
                     │ /buyer/recommendations│
                     └───────────┬──────────┘
                                 │
                                 ▼
                   ┌─────────────────────────────┐
                   │  Personalization Source     │
                   │  Determination              │
                   └──────┬──────────┬───────────┘
                          │          │
              ┌───────────┼──────────┘
              ▼           ▼
     ┌─────────────┐ ┌──────────────┐
     │ AI Analysis │ │ No Analysis →│
     │ Available   │ │ Generic      │
     │ (Rule 4.7.2)│ │ Fallback     │
     └──────┬──────┘ └──────┬───────┘
            │               │
            ▼               ▼
     ┌────────────────────────────────────────────┐
     │  Build Personalization Context             │
     │  (skinTypes, skinConcerns from AI)         │
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
        │ (cached)     │    │ PostgreSQL WHERE     │
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
| 1 | Buyer navigates to /buyer/recommendations | — | Page displayed | System |
| 2 | System checks the buyer's latest completed analysis | — | Source = `ai` if a completed analysis exists (regardless of age); otherwise `generic` | System |
| 3 | Buyer applies filters / changes sort | Default list | URL params updated | Buyer |
| 4 | Frontend calls GET /api/v1/recommendations/personalized | URL params valid | Query in-flight (skeleton) | System |
| 5 | Backend checks Redis cache | — | HIT (return cached) or MISS (query DB) | System |
| 6 | Backend builds Prisma WHERE (active + approved shop + skin types + filters) | — | Filtered candidate set | System |
| 7 | Backend computes match score, sorts, returns `{ data, meta, source }` | — | 200 response | System |
| 8 | Frontend renders recommendation cards according to selected source | Data received | AI match cards or generic product cards displayed | System |
| 9 | Buyer clicks a recommendation | Results displayed | Navigates to `/buyer/products/:slug` | Buyer |
| 10 | Buyer changes a filter or sort | Current results displayed | URL updates and page resets to 1 | Buyer |
| 11 | Buyer pages through results | Multiple pages exist | Numbered pagination loads the selected page; prior results remain during fetch | Buyer |
| 12 | Buyer interacts with a product card | Product available | Wishlist action or in-stock add-to-cart action runs | Buyer |

### 2.4 Relevant Requirements Covered

| Requirement ID | Requirement Summary |
|----------------|---------------------|
| B-MATCH-001 | System provides personalized recommendations based on skin analysis results |
| B-MATCH-002 | User can filter products by skin type |
| B-MATCH-003 | User can filter products by ingredients |
| B-MATCH-004 | User can filter products by price range |
| B-MATCH-006 | System displays "Recommended for You" section |
| B-MATCH-007 | System tracks recommendation history for buyers |
| B-MATCH-008 | System displays sponsored ads via shared recommendation banner |
| B-MATCH-010 | Shared ad component provides cross-screen sponsored banner functionality |
| B-AI-004 | Personalized product recommendations with match scores |
| B-PROD-006 | Product detail shows skin type compatibility |

---

## 3. State Transition Specification

### 3.1 Recommendation Page UI States

| State | Description | Results Displayed | Actions Available |
|-------|-------------|:-----------------:|-------------------|
| `IDLE` | Page loaded, no query in-flight | ✓ (default or cached list) | Filter, sort, paginate |
| `LOADING` | Query in-flight | Skeleton grid | New query (replaces in-flight) |
| `SUCCESS` | Query returned successfully | ✓ | Sort, filter, paginate, view detail |
| `EMPTY` | Query returned zero matches | Empty state | Reset filters |
| `ERROR` | Query failed (network/5xx) | Error banner | Retry |

### 3.2 Recommendation Lifecycle Transitions

| Transition ID | Origin State | Target State | Trigger Action | Guard Conditions |
|---------------|--------------|--------------|----------------|------------------|
| TR-MATCH-01 | `IDLE` | `LOADING` | Filter/sort/page change or page load | Valid URL params |
| TR-MATCH-02 | `LOADING` | `SUCCESS` | Fetch resolves 200 | Data returned |
| TR-MATCH-03 | `LOADING` | `EMPTY` | Fetch resolves with `total = 0` | No matching products |
| TR-MATCH-04 | `LOADING` | `ERROR` | Fetch rejects (network/4xx/5xx) | Error response |
| TR-MATCH-05 | `SUCCESS` | `LOADING` | Filter/sort/page changed | Params changed |
| TR-MATCH-06 | `EMPTY` | `LOADING` | Filters reset | Params changed |
| TR-MATCH-07 | `ERROR` | `LOADING` | Retry clicked | — |

### 3.3 Recommendation Source Selection

The page does not expose or require a buyer-selected mode. The backend selects the recommendation source from the buyer's analysis availability.

| Source | Description | Used When | UI Indicators | Can Refresh |
|--------|-------------|-----------|---------------|:-----------:|
| `AI_ANALYSIS` (fresh) | Latest completed analysis (skin type + conditions) | Latest completed analysis is no more than 24 hours old | Badge: "AI Analysis" · Match score where available · No prompt banner · History section when sessions exist | ✓ (run new analysis) |
| `AI_ANALYSIS` (stale) | Completed analysis older than 24 hours; still used for results | Latest completed analysis is more than 24 hours old | Badge: "AI Analysis" · Match score where available · Prompt banner: "Want Fresh Results?" · History section when sessions exist | ✓ (retake analysis) |
| `GENERIC` | Active catalog products without an analysis context | No completed analysis is available | Badge: "General Picks" · Category badges where applicable · Prompt to start skin analysis · History when sessions exist | ✓ (run new analysis) |

---

## 4. Business Rules

### 4.1 Personalization Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-MATCH-001 | Recommendation Source Selection | The backend uses the latest completed analysis (`analysisStatus = completed`, `completedAt` present), regardless of age: `source = ai`. Without one, `source = generic`. Freshness affects only the prompt banner; history is fetched independently. Generic results are not restricted to featured products. | Backend + frontend |
| BR-MATCH-002 | Authentication for Recommendations | Personalized and history APIs require a valid JWT and buyer role. Similar lookup is public. The page is under the buyer route group. | Backend guards + buyer route |
| BR-MATCH-003 | Analysis Freshness | Analysis age is returned in hours. Analysis older than 24 hours remains the AI source; the page shows a retake prompt. It does not expire from recommendation source selection. | Backend + frontend |
| BR-MATCH-004 | Profile Prompt Banner — Time-Based Display | The Profile Prompt Banner (EL-03a) adapts based on analysis freshness: **(a) No analysis (`source = "generic"`):** Show full-width prominent banner with heading "Get Personalized Recommendations", body text, and CTA "Start Skin Analysis →". **(b) Stale analysis (`source = "ai"`, analysis > 24h old):** Show subtle banner with heading "Want Fresh Results?", body "Retake your skin analysis for updated recommendations", and CTA "Retake Analysis →". **(c) Fresh analysis (`source = "ai"`, analysis ≤ 24h old):** Hide banner completely. In all cases, when `source = "generic"`: show "⬡ General Picks" amber badge, render category-status badges on cards, sort by `is_featured desc` then `avg_rating desc`. History section remains visible when completed sessions exist, independent of source. | Backend (matching service) + Frontend UI |
| BR-MATCH-005 | Guest Access Restriction | Unauthenticated visitors attempting to access `/buyer/recommendations` are redirected to the Login page. | Frontend (Auth Route Guard) |
| BR-MATCH-006 | Skin Type Filter | Explicit skin-type selections filter results; for AI results the displayed products must remain compatible with the analysis types. The `all` sentinel clears the explicit selection. | Backend + frontend |

### 4.2 Matching Algorithm Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-MATCH-007 | Match Score Range | Every recommendation carries a `matchScore` between 0 and 100 (integer). | Backend (scoring) |
| BR-MATCH-008 | Score Components | Score = Skin Type Compatibility (50) + Skin Concern Match (20) + Average Rating (20) + Featured Boost (10). | Backend (scoring) |
| BR-MATCH-009 | Skin Type Compatibility | An exact product skin-type match receives 50 points; otherwise a product with one or more skin type tags receives 30; products with no tags receive 0. | Backend scoring |
| BR-MATCH-010 | Concern Matching | Products whose `tags` or `ingredients` match the buyer's skin concerns (e.g., acne, dark spots, wrinkles) earn up to 20 points. | Backend (Prisma + scoring) |
| BR-MATCH-011 | Rating Factor | `avg_rating >= 4.5` earns 20 points; `4.0–4.49` earns 15; `3.0–3.99` earns 10; below 3.0 earns 0. | Backend (scoring) |
| BR-MATCH-012 | Featured Boost | Products with `is_featured = true` earn a 10-point boost. This is part of the score, not a separate tie-breaker. | Backend (scoring) |
| BR-MATCH-013 | Analysis Compatibility | AI source results use analysis skin types as the default and allow products tagged `all`; explicit filtering must preserve analysis compatibility. | Backend + frontend |
| BR-MATCH-014 | Similar Product Criteria | Similar products share category; when the source product has skin types, results share at least one. The source product is excluded. Only active products from approved shops are returned. | Backend (Prisma WHERE) |
| BR-MATCH-015 | Similar Limit | Similar product limit defaults to 8 and must be 1–20. Unknown source product returns an empty result. | Backend DTO/service |

### 4.3 Filter Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-MATCH-016 | Skin Type Filter | Explicit `skinTypes` uses `hasSome`; `all` is a no-selection sentinel. On AI source, UI-side filtering preserves analysis compatibility. | Backend + frontend |
| BR-MATCH-017 | Ingredient Filter | `ingredients` filter uses `hasSome` semantics on the `ingredients` array. | Backend (Prisma `hasSome`) |
| BR-MATCH-018 | Price Range Bounds | `price >= minPrice` and `price <= maxPrice`; both bounds must be ≥ 0. | Backend (DTO + Prisma) |
| BR-MATCH-019 | Category and Rating | `categoryId` (or alias `category`) includes descendant categories; `rating` filters `avgRating >= rating`. | Backend (service) |
| BR-MATCH-020 | Page Reset on Change | Any filter or sort change resets `page` to 1. | Frontend (updateParams) |

### 4.4 Visibility Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-MATCH-021 | Active Products Only | Only `is_active = true` products appear in recommendations. | Backend (Prisma WHERE) |
| BR-MATCH-022 | Approved Shop Only | Products from unapproved merchant shops (`shops.is_approved = false`) are NEVER shown in recommendations. | Backend (Prisma join) |
| BR-MATCH-023 | Out-of-Stock Still Listed | Out-of-stock products remain listed but are flagged `isInStock: false`. | Backend (serialization) |

### 4.5 Sorting & Pagination Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-MATCH-024 | Default Sort | UI explicitly sends `createdAt desc` (Newest) for both sources. If sort is omitted at service level, AI defaults to match score and generic to featured then rating; similar defaults to `createdAt desc`. | Frontend + backend |
| BR-MATCH-025 | Sort Allowlist | `sort` ∈ {`matchScore`, `price`, `rating`, `createdAt`}; `order` ∈ {`asc`, `desc`}; other values rejected. Generic `matchScore` falls back to Newest. | Backend DTO/service |
| BR-MATCH-026 | Pagination Defaults | Page defaults to 1. Frontend limit defaults to 12; service fallback is 20 when omitted. Limit maximum is 50. Numbered pagination is used on mobile and desktop. | Frontend + backend |
| BR-MATCH-027 | Result Counting | `total` counts the full match set ignoring pagination (`skip`/`take`). | Backend (Prisma `count`) |
| BR-MATCH-028 | Decimal Serialization | `price`, `compare_at_price`, and `avg_rating` serialized as strings. | Backend (serializer) |
| BR-MATCH-029 | Cache-Aside Pattern | Personalized responses use Redis cache-aside with a 300-second TTL. Cache key includes user and result-affecting normalized query values. Similar/history/ad cache behavior is not implemented in this matching service. | Backend (matching service) |

### 4.6 Recommendation History Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-MATCH-030 | History Source | History is derived from the buyer's completed skin-analysis sessions and their saved recommendation rows. | Backend (Prisma) |
| BR-MATCH-031 | Generic Excluded | Generic fallback responses are not written by this matching service to analysis recommendation history; history is read from completed analysis sessions. | Backend (matching service) |
| BR-MATCH-032 | History Product Eligibility | History displays products only when still active and sold by an approved shop. Retention/purge behavior is outside the current matching source. | Backend (service) |
| BR-MATCH-033 | History Pagination | Sessions are sorted by completion time descending; API default limit 20, max 50. Page initially requests 5; See more requests 50. Products are scored and sorted by score descending. | Backend + frontend |

### 4.7 Advertisement Placement Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-MATCH-037 | Sponsored Banner Placement | Recommendations renders shared `AdBannerSlider` with placement `recommendation_page_banner`; shared ads feature owns selection and eligibility. | Frontend + ads module |
| BR-MATCH-038 | Ad Impression Recording | Shared banner fires callback when at least 50% visible; matching service posts impression IDs to the ads tracking endpoint. | Frontend + ads module |
| BR-MATCH-040 | No-Analysis Ads | Banner is rendered independently of recommendation source; it disappears when no eligible banner data is available. | Frontend + ads module |

### 4.8 Cross-Screen Slide-Down Panel Rules (D0)

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-MATCH-045 | Shared Banner Component | Recommendation page uses `AdBannerSlider` from the shared components, placement `recommendation_page_banner`. | Frontend (`AdBannerSlider`) |
| BR-MATCH-046 | Banner Content | Banner shows announcement badge, title, optional description, image, merchant/category tag, and Learn more action; image fallbacks are available. | Frontend (`AdBannerSlider`) |
| BR-MATCH-047 | Banner Eligibility | Component checks matching placement, approved status, and valid start/expiry timestamps; no eligible ads means no banner. | Frontend + sponsored ads hook |
| BR-MATCH-048 | Auto-Slide | Multiple ads rotate every 5 seconds. Rotation pauses on hover, keyboard focus, or reduced-motion preference. | Frontend (`AdBannerSlider`) |
| BR-MATCH-049 | Click Destination | Click records the ad and resolves SKU product, fallback product, target/link URL, or product catalog fallback. External HTTP(S) URLs use full-page navigation. | Frontend (`AdBannerSlider`) |
| BR-MATCH-050 | Impression Tracking | IntersectionObserver threshold is 50%; displayed ad IDs are reported once per ad set. | Frontend + ads tracking API |
| BR-MATCH-051 | Ad Disclosure | The banner displays its announcement badge (default `SPONSORED`); there is no separate disclosure footer in this component. | Frontend (`AdBannerSlider`) |

---

## 5. Screen Specifications

### 5.1 Screen: Recommendations Page (`/buyer/recommendations`)

**Purpose:** Allow buyers to view personalized skincare product recommendations derived from their AI skin analysis.

#### 5.1.1 UI Elements

**Recommendations View:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-01 | Page Title | Heading (h1) | `matching.title` | Yes | "Recommended for You" / "あなたへのおすすめ" — shown for both analysis-result and no-analysis results |
| EL-02 | Source Badge | Badge / Pill | `matching.source` | Yes | If buyer has analysis results: "🧬 AI Analysis" emerald green pill. If buyer has no analysis results: "⬡ General Picks" amber/orange pill. |
| EL-02a | Source Subtitle | Text | `matching.subtitle` | Yes | If buyer has analysis results: "Based on your AI analysis · {skinType} · {N} results". If buyer has no analysis results: "Showing featured products · No skin analysis found". |
| EL-03a | Profile Prompt Banner | Container / Banner | `matching.profilePrompt` | Conditional | Full-width banner with **3 states**: **(a) No analysis (`source = "generic"`):** Prominent banner with AI face scan illustration, heading "Get Personalized Recommendations", body "Run an AI skin analysis to receive products matched to your skin type and concerns", CTA "✦ Start Skin Analysis →" (rose-gold). **(b) Stale analysis (`source = "ai"`, analysis > 24h old):** Subtle compact banner with heading "Want Fresh Results?", body "Retake your skin analysis for updated recommendations", CTA "Retake Analysis →". **(c) Fresh analysis (`source = "ai"`, analysis ≤ 24h old):** Hidden. Navigates to `/buyer/skin-analysis`. |
| EL-06 | Filters Panel | Aside (desktop sidebar / mobile sheet) | — | Yes | Filter groups: Category, Skin Type, Price Range, Rating. Ingredients are accepted by API but not exposed as a page control. |
| EL-17 | Recommendation Results | Responsive grid/list | — | Yes | Grid defaults to 1 column, 2 at `sm`, 3 at `lg`; List view is selectable. |
| EL-19 | Product Card Badge | Badge | — | Conditional | AI results show match score when non-null. Category badge is computed independently by backend precedence: featured, top rated, best seller, new. Generic score is null. |
| EL-20 | Skin Type Tags | Tag Group | — | Conditional | Screen item mapping: `lblSkinTypeTags`. Compatible skin types are displayed on each product card below the product name. |
| EL-21 | Sort Controls | Select / Dropdown | — | Yes | Newest, price low/high, highest rating; AI results also offer Match Score. Sort change resets `page` to 1. |
| EL-22 | Pagination | Pagination | — | Conditional | Previous/next and page numbers at all viewport sizes. Existing page remains visible during fetch. |
| EL-23 | View Toggle | Toggle | — | Yes | Switches grid/list presentation locally; no API query change. |
| EL-24 | Empty State | EmptyState | `matching.empty` | Conditional | "No matching products" + Reset Filters button. |
| EL-25 | Error Banner | Alert | `matching.errors.serverError` | Conditional | Inline error with retry button. |
| EL-26 | Wishlist Action | Card button | — | Yes | Toggles wishlist membership; guest login dialog and non-buyer feedback are handled in the page. |
| EL-27 | Add-to-Cart Action | Card button | — | Conditional | Shown only for in-stock products; adds quantity 1; handles guest login and duplicate item dialog. |
| EL-28 | View Toggle | Toggle | — | Yes | Switches grid/list layout using local page state. |

**Recommendation History Section (shown when completed history sessions exist, independent of current source):**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-31 | History Section Heading | Heading (h2) | `matching.historyTitle` | Conditional | "📋 Previously Recommended" — shown when the buyer has past completed analysis sessions, regardless of the current recommendation `source`. |
| EL-32 | History Session Group | Card Group | — | Conditional | Newest completed sessions first. Initially first five; See more fetches up to 50. Expanded rows show eligible products with image, name, score, price, and product link. |
| EL-33 | History Empty State | Prompt | — | Conditional | When there is no history, the page prompts the buyer to complete a skin analysis. |

**Cross-Screen Slide-Down Ad Panel (D0) — shown for both analysis-result and no-analysis results:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-41 | Sponsored Banner | Shared `AdBannerSlider` | — | Conditional | Uses `recommendation_page_banner`. Rotates every 5 seconds when multiple ads exist; pauses on hover/focus/reduced-motion preference; impression is tracked at ≥50% visibility. Displays announcement badge; no separate disclosure footer. |

#### 5.1.2 Conditional Rendering Summary

| UI Element | Buyer Has Fresh Analysis (`source = "ai"`, ≤ 24h) | Buyer Has Stale Analysis (`source = "ai"`, > 24h) | Buyer Has No Analysis (`source = "generic"`) |
|------------|:------------------------------------------:|:------------------------------------------------:|:------------------------------------------------:|
| EL-02 Source Badge | "🧬 AI Analysis" (green) | "🧬 AI Analysis" (green) | "⬡ General Picks" (amber) |
| EL-03a Profile Prompt Banner | ✗ Hidden | ✓ Shown (subtle compact: "Want Fresh Results?") | ✓ Shown (prominent full-width) |
| EL-19 Card Badge | Match score ("92% match") | Match score ("92% match") | Category badge (Featured / Top Rated / Best Seller) |
| EL-31/32 History Section | ✓ Shown when history exists | ✓ Shown when history exists | ✓ Shown when history exists |
| EL-41 Ad Panel | ✓ Shown | ✓ Shown | ✓ Shown |
| EL-06 Filters — Skin Type pre-selected | ✓ From analysis | ✓ From analysis | ✗ All unchecked |

---

## 6. Functional Operation Specification

### 6.1 Operation: Get Personalized Recommendations

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Page load, filter/sort change |
| **API Endpoint** | `GET /api/v1/recommendations/personalized` |
| **Processing Steps** | 1. Validate `MatchQueryDto`. 2. Determine source. 3. Resolve effective skin types. 4. Redis lookup. 5. If miss, build Prisma WHERE clause. 6. Fetch candidates and compute score. 7. Return paginated result. |

### 6.5 Operation: Get Recommendation History

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Page load of history section |
| **API Endpoint** | `GET /api/v1/recommendations/history` |
| **Processing Steps** | 1. Query `skin_analyses` joined with `skin_analysis_recommendations` WHERE `user_id`. 2. Group by analysis session. 3. Sort by `completed_at desc`. 4. Return paginated history using `skin_analysis_recommendations` fields. |

### 6.8 Operation: Get Cross-Screen Ad Panel

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Page load |
| **API Endpoint** | Shared sponsored-ad hook requests placement `recommendation_page_banner`; endpoint owned by ads module |
| **Processing Steps** | 1. Shared banner loads ads for the recommendation placement. 2. Component filters placement, approval status and active schedule. 3. Banner hides if no eligible ads are returned. 4. Matching page forwards impression/click events to ads tracking endpoints. |

### 6.9 Operation: Track Ad Panel Impression

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Panel visible (≥50%) |
| **API Endpoint** | `POST /api/v1/ads/track/impression` |
| **Processing Steps** | 1. Record impression event for each `adId` via the ad tracking service. 2. Return 200 OK. |

---

## 7. Input / Output Specification

### 7.3 Output Specification — Recommendation Result (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `id` | `products.id` | UUID string |
| `name` | `products.name` | String |
| `slug` | `products.slug` | Product route uses `/buyer/products/:slug` |
| `brandName` | Merchant shop name | String |
| `shortDescription` | `products.short_description` | String or null |
| `price`, `compareAtPrice`, `avgRating` | Product decimals | Strings; `compareAtPrice` may be null |
| `images`, `skinTypes` | Product arrays | String arrays |
| `reviewCount`, `isFeatured`, `isInStock` | Product fields/stock quantity | Number and booleans |
| `matchScore` | Computed | Number for AI source, null otherwise |
| `categoryBadge` | Computed | `featured`, `topRated`, `bestSeller`, `new`, or null |
| `source`, `analysisAge`, `skinTypes` | Latest completed analysis context | `ai`/`generic`, age hours or null, analysis type list |
**Request Example:**

```json
POST /api/v1/ads/track/impression
Content-Type: application/json

{
  "adIds": ["1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d", "2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e"]
}
```

### 7.12 Output Specification — Ad Slide (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `adId` | `advertisements.id` | CUID string |
| `title` | `advertisements.title` | String |
| `description` | `advertisements.content` | String or null |
| `imageUrl` | `advertisements.image_url` | URL string |
| `linkUrl` | `advertisements.link_url` | URL string or null; internal product URL when present |
| `ctaText` | Static UI value for recommendation page | "Shop Now" |
| `priorityAmount` | `advertisements.payment_amount` | Decimal string or null; used for priority only, not displayed |
| `shopName` | `shops.name` | String |

**Response Example:**

```json
{
  "data": [
    {
      "adId": "adv_abc456",
      "title": "Vitamin C Brightening Serum",
      "description": "Dermatologist-recommended for dull skin",
      "imageUrl": "https://cdn.example.com/ads/vitamin-c-banner.webp",
      "linkUrl": "/buyer/products/a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      "ctaText": "Shop Now",
      "priorityAmount": "8.00",
      "shopName": "GlowLab"
    }
  ],
  "meta": {
    "total": 5,
    "maxAds": 5
  }
}
```

### 7.14 Sponsored Product Output Scope

Sponsored products are not inserted into the recommendation grid. Advertisement data is returned only by the Cross-Screen Ad Panel response (Sec 7.12), and recommendation results remain organic product results.

---

## 8. Input Validation Rules

### 8.1 Personalized Query Validation (Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `skinTypes` | Optional, valid enum values | "Invalid skin type" | "無効な肌タイプです" |
| `ingredients` | Optional comma-separated string; API filter, not exposed in page UI | No array validation in `MatchQueryDto` | — |
| `minPrice` | Optional, ≥ 0 | "Minimum price must be 0 or more" | "最低価格は0以上である必要があります" |
| `maxPrice` | Optional, ≥ 0 | "Maximum price must be 0 or more" | "最高価格は0以上である必要があります" |
| `rating` | Optional, 1–5 | class-validator rejects out-of-range values | — |
| `categoryId`, `category` | Optional strings | `category` is an alias for `categoryId` | — |
| `sort` | Optional, matchScore/price/rating/createdAt | class-validator rejects unsupported values | — |
| `order` | Optional, asc/desc | "Invalid sort direction" | "無効な並び順です" |
| `page` | Optional, ≥ 1 | "Page must be at least 1" | "ページは1以上である必要があります" |
| `limit` | Optional, 1–50 | "Limit must be between 1 and 50" | "件数は1〜50の間である必要があります" |
| `productId` | Path value; no UUID validator declared in `MatchingController` | Unknown ID returns empty similar-products result | — |

### 8.2 History & Tracking Validation

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `page`, `limit` (history) | Page ≥1; limit 1–50 | `HistoryQueryDto` | — |
| Ad tracking fields | **No DTO validation** — ads controller accepts raw `{ adIds: string[] }` / `{ adId, placement? }` bodies (log-only, no UUID checks) | — | — |

### 8.3 Validation Enforcement Layers

1. **Frontend (Client)**: `matchQuerySchema` (Zod, `frontend/src/schemas/matching.schema.ts`) parse + coercion of URL query parameters, with `z.coerce.number()` for numeric fields and real-time inline feedback. Defaults sent explicitly: `sort=createdAt`, `order=desc`, `limit=12` (frontend default — the backend default of 20 never applies from this page).
2. **Backend (Server)**: NestJS ValidationPipe + class-validator DTOs on `GET /api/v1/recommendations/*` (whitelist + forbidNonWhitelisted).
3. **Database (DB)**: Prisma indexes and CHECK constraints (e.g., `chk_products_price`, `chk_products_stock`) as final safety net.

---

## 9. Error Handling Specification

### 9.1 Error Response Structure

```json
{
  "statusCode": 400,
  "message": ["limit must not be greater than 50"],
  "error": "Bad Request",
  "timestamp": "2026-08-13T12:00:00.000Z",
  "path": "/api/v1/recommendations/personalized"
}
```

### 9.2 Error Classification Table — Personalized Recommendations

| HTTP Status | Error Code | Scenario | User-Facing Behavior |
|-------------|------------|----------|---------------------|
| `400` | `BAD_REQUEST` | Validation failures (invalid params) | Inline validation hint + top banner |
| `400` | `BAD_REQUEST` | Invalid context ID for ad panel | Panel not rendered (silent) |
| `401` | `UNAUTHORIZED` | Missing/invalid token on personalized endpoint | Redirect to login |
| `403` | `FORBIDDEN` | Non-buyer role attempting personalized access | Redirect to /unauthorized |
| `200` | — | Similar source product not found | Matching service returns empty `data` and zero totals |
| `500` | `INTERNAL_SERVER_ERROR` | Server error | "Something went wrong" + retry button |

### 9.3 Frontend Error Display Behavior

- **Field-Level Validation**: Red border and inline text below invalid filter input (e.g., minPrice > maxPrice).
- **Form-Level Summary**: Alert banner at top of results area listing all errors.
- **Loading States**: Skeleton shimmer grid (shadcn `Skeleton`) during fetch; spinner on Apply buttons.
- **Empty Results**: `EmptyState` component with message + "Reset Filters" button.
- **Retry**: TanStack Query `error` + `refetch` for transient failures.

### 9.4 Audit / Logging

| Event | Data Logged | Retention |
|-------|-------------|-----------|
| `RECOMMENDATION_EXECUTED` (warn level for slow queries > 500ms) | userId (if logged in), source, filters, result count, duration | 30 days |
| `RECOMMENDATION_SOURCE_EMPTY` (info) | userId, reason (no analysis) | 30 days |

Rules:
- NEVER log the full response body (security).
- NEVER log skin analysis image data or personal health data beyond the identifiers already in the event fields.
- Use NestJS `Logger` with `[MatchingService]` context. No `console.log`.

---

## 10. Permission and Access Control

### 10.1 Authentication Requirements

- Personalized recommendations and history require a valid JWT Bearer Token and `buyer` role.
- Similar products endpoint is public — no JWT required.

### 10.2 Public vs Protected Endpoints

| `GET /recommendations/personalized` | Protected | Requires valid access token + `buyer` role |
| `GET /recommendations/similar/:productId` | Public | No authentication required |
| `GET /recommendations/history` | Protected | Requires valid access token + `buyer` role |
| `POST /ads/track/click` | Public | No authentication required (guests tracked by session) |
| `GET /ads/panel` | Public | No authentication required (returns eligible ads for the panel) |
| `POST /ads/track/impression` | Public | No authentication required (guests tracked by session) |

### 10.3 Role-Based Access

| Role | Get Personalized | Filter Results | Get Similar | View History | Track Interactions | Sponsored Display |
|------|:----------------:|:--------------:|:-----------:|:------------:|:------------------:|:-----------------:|
| Visitor (guest) | ✗ | ✗ | ✓ | ✗ | Guest action prompts login | Banner availability is handled by shared ads feature |
| `buyer` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `merchant` | ✗ (buyer-only) | ✗ | ✓ (public endpoint) | ✗ | Page shopping actions unavailable | Shared ads behavior |
| `admin` | ✗ (buyer-only) | ✗ | ✓ (public endpoint) | ✗ | Page shopping actions unavailable | Shared ads behavior |

### 10.4 Security Audit Logging

| Event | Data Logged | Retention |
|-------|-------------|-----------|
| Matching-specific audit events | No such event contract is implemented in `MatchingService` | — |

---

## 11. Real-Time Notification Behavior

### 11.1 Current Implementation

The Matching & Recommendation page operates with REST queries and TanStack Query refetching; this page does not declare a WebSocket subscription. The matching service exposes `invalidateUserCache(userId)` for analysis-completion integration; this method removes matching personalized-cache keys for that user.

### 11.2 Client-Side State Updates

| `matching:paramChange` | URL query param change | Refetch recommendations query (TanStack Query invalidation) |
| `matching:analysisCompleted` | New AI analysis result returned | Invalidate user cache keys, refetch with `source = ai` |
| `matching:filterApplied` | Apply Filters / Reset Filters | Reset `page` to 1 and refetch |
| `matching:pageChange` | Pagination control click | Update `page` and refetch with `keepPreviousData` |
| `matching:adClicked` | Buyer clicks an ad slide CTA in the ad panel | Fire-and-forget `POST /ads/track/click`, navigate to product |
| `ad:panelLoaded` | Ad panel becomes visible (IntersectionObserver ≥ 50%) | Fire-and-forget `POST /ads/track/impression` with visible ad IDs |
| `ad:panelSlideChanged` | Auto-slide or manual navigation | Update dot indicators, pause auto-slide on hover/touch |
| `ad:panelCtaClicked` | Buyer clicks CTA button on ad slide | Fire-and-forget `POST /ads/track/click`, navigate to `ad.linkUrl` |

---

## 12. Screen Transition Specification

### 12.1 Inbound Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| Header navigation link | `/buyer/recommendations` | Click "Recommendations" / "おすすめ" |
| Home page | `/buyer/recommendations` | Click "Recommended for You" / "あなたへのおすすめ" section link |
| AI skin analysis result | `/buyer/recommendations` | Click "See My Recommendations" CTA after analysis completes |

### 12.2 Internal Navigation

| Source | Target | Trigger |
|--------|--------|---------|
| `/buyer/recommendations` | `/buyer/products/:id` | Click recommendation card image or name |
| `/buyer/recommendations` (self) | `/buyer/recommendations` (updated params) | Filter/sort/pagination change (URL replaced in place) |
| `/buyer/recommendations` | `/buyer/recommendations` (default) | Reset Filters clicked |

### 12.3 Outbound Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| `/buyer/recommendations` | `/buyer/products/:id` | Click recommendation card (organic or sponsored) |
| `/buyer/recommendations` | `/buyer/skin-analysis` | Click "Run a New Analysis" prompt |
| `/buyer/recommendations` | `/login` | Session required action without valid token |
| `/buyer/recommendations` (history section) | `/buyer/products/:id` | Click history product card |

### 12.4 Error Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| `/buyer/recommendations` | (stay, retry) | 429/500 — error banner with retry button |
| `/buyer/recommendations` | `/login` | 401 on personalized endpoint |
| `/buyer/recommendations` | `/unauthorized` | 403 Forbidden (non-buyer role) |

---

## 13. Non-Functional Considerations

### 13.1 Performance Requirements (Development Rules Sections 10.1, 10.2, 10.3)

| Metric | Target |
|--------|--------|
| Personalized recommendation response time | Target defined by project NFRs; not guaranteed by this implementation spec |
| API response time (p95) | Target defined by project NFRs; not measured here |
| Filter application time | No implementation timing assertion |
| Match score computation | Computed in service; no timing assertion |
| Cache TTL | 300 seconds for personalized responses |
| Similar products response time | No implementation timing assertion |
| Page Load (Initial Render) | No implementation timing assertion |

### 13.2 Caching Strategy (Development Rules Section 10.5)

| Cache Target | Strategy | TTL | Invalidation |
|--------------|----------|-----|--------------|
| Personalized recommendation results | Per-user `cache:recommendations:user:{userId}:{sha256}` JSON | 5 minutes | `invalidateUserCache(userId)` removes matching user keys |
| Similar product results | No matching-service cache | — | — |
| Sponsored ad pool | Owned by shared ads feature | — | — |
| Recommendation history | No matching-service cache | — | — |

Rules:
- Cache-aside pattern: Check Redis → miss → query DB → seed Redis.
- Personalized cache key is scoped by `userId` + hash of serialized query params.
- Invalidation on analysis change must purge ALL keys for that user (`cache:recommendations:user:{userId}:*`).
- ALWAYS set TTL. Never cache sensitive data.

### 13.3 Security Considerations

| Concern | Mitigation |
|---------|------------|
| SQL injection in filters | Prisma parameterized queries; no string interpolation into SQL |
| XSS in URL params | React auto-escaping, no `dangerouslySetInnerHTML` |
| Ingredient query | String accepted by matching DTO; no array-length rule in DTO |
| Unknown `productId` in similar route | Empty similar-products response |
| Data leakage (unapproved shops) | Unapproved shop products excluded at query level (Section 12.2) |
| Unauthorized personalization | JWT required; access to recommendations screen and data is denied to guests |
| PII / health data exposure | Never log analysis images or skin data; only identifiers in event logs |

### 13.4 Responsive Design Requirements

| Breakpoint | Layout |
|------------|--------|
| Desktop (`lg`, 1024px+) | Filters sidebar + results grid (3 columns) |
| Small (`sm`, 640px+) | Results grid (2 columns); filter sheet below `lg` |
| Mobile (< 640px) | Filter sheet + results grid (1 column) |

---

## 14. Configurable Items (External Definitions)

The values below are implementation defaults/constants, not environment variables unless explicitly configured elsewhere.

| Definition Key | Default Value | Description |
|----------------|---------------|-------------|
| Frontend page-size default | `12` | Frontend Zod default; service fallback when omitted is 20 |
| `RECOMMENDATION_MAX_LIMIT` | `50` | Maximum page size enforced by matching DTO |
| Similar query default | `8` | Default similar-products limit; maximum is 20 |
| Personalized cache TTL | `300` seconds | Hard-coded personalized response cache TTL; similar/history are not cached by matching service |
| Analysis prompt threshold | `24` hours | Prompt threshold only; old completed analysis remains the AI source |
| Skin type score | `50` / `30` / `0` | Exact match / has other tags / no tags |
| Concern score | `10` each, max `20` | Matching concern substrings in product tags or ingredients |
| Rating score | `20` / `15` / `10` / `0` | Rating thresholds 4.5 / 4.0 / 3.0 / below 3.0 |
| Featured score | `10` | Hard-coded featured boost |
| History page default/max | `20` / `50` | Backend history DTO defaults and bounds; UI requests 5 then 50 |
| Shared banner auto-slide interval | `5000` ms | `AdBannerSlider` constant; pauses on hover, focus and reduced motion |
| Shared banner impression threshold | `0.5` | `AdBannerSlider` IntersectionObserver threshold |

---

## 15. Cross-Reference Traceability Matrix

### 15.1 Requirements Definition Traceability

Source: SKM-REQ-001 (`docs/core-work/要件定義書_REQUIREMENT_SPEC.md`)

| Requirement ID | Requirement Description | Source Section | Covered By (This Document) |
|----------------|-------------------------|----------------|----------------------------|
| B-MATCH-001 | System provides personalized recommendations based on skin analysis results | §3.4 Matching & Recommendations | UC-MATCH-001, Sec 6.1, BR-MATCH-001 |
| B-MATCH-002 | User can filter products by skin type | §3.4 Matching & Recommendations | UC-MATCH-003, BR-MATCH-016 |
| B-MATCH-003 | User can filter products by ingredients | §3.4 Matching & Recommendations | UC-MATCH-004, BR-MATCH-017 |
| B-MATCH-004 | User can filter products by price range | §3.4 Matching & Recommendations | UC-MATCH-005, BR-MATCH-018 |
| B-MATCH-006 | System displays "Recommended for You" section | §3.4 Matching & Recommendations | Sec 5.1, EL-01, EL-17, Sec 6.1 |
| B-MATCH-007 | System tracks recommendation history for buyers | §3.4 Matching & Recommendations | UC-MATCH-008, Sec 6.5, BR-MATCH-030~033 |
| B-MATCH-008 | System displays sponsored ads via Slide-Down Panel | §3.4 Matching & Recommendations | UC-MATCH-009, Sec 6.8, BR-MATCH-045~053 |
| B-MATCH-009 | System recommends similar products (shared category + skin type compatibility) | §3.4 Matching & Recommendations | UC-MATCH-002, BR-MATCH-014, BR-MATCH-015 |
| B-MATCH-010 | Cross-screen ad panel (D0) displays sponsored ads across 6 screens | §3.4 Matching & Recommendations | Sec 6.8, BR-MATCH-045~053, EL-41~48 |
| B-AI-004 | Personalized product recommendations with match scores | §3.1 AI Skin Analysis | UC-MATCH-001, BR-MATCH-001, BR-MATCH-003 |
| B-PROD-006 | Product detail shows skin type compatibility | §3.2 Shopping | BR-MATCH-009, EL-20, Sec 6.2 |

### 15.2 Database Design Traceability

| Database Table | Relevant Functional Operations |
|----------------|-------------------------------|
| `products` | Personalized match (SELECT with filters + skin_types `hasSome`), Match score computation (SELECT `skin_types`, `tags`, `ingredients`, `avg_rating`, `is_featured`), Similar products (SELECT by category + skin types). `skin_types` is a `TEXT[]` array field on `products`. Skin concerns are derived from `skin_analysis_conditions.condition_name` (not a field on `products`). |
| `categories` | Similar product category join |
| `shops` | Merchant approval filter (SELECT join, `is_approved = true`) |
| `reviews` | Rating aggregation (`avg_rating`, `review_count` maintenance) |
| `skin_analysis_recommendations` | Recommendation history session load (SELECT join with `skin_analyses` per user) |
| `advertisements` | Sponsored ad pool query (SELECT WHERE approved + active + paid + valid date range), payment amount priority sorting, Cross-screen panel query |

### 15.3 Related Document References

| Document ID | Document Name | File Path |
|-------------|---------------|-----------|
| SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` |
| SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` |
| SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` |

---

*End of Functional Specification (Matching & Recommendation)*
