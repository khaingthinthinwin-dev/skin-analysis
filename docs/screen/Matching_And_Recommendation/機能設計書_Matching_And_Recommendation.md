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
| **Created** | 2026-08-28 |
| **Last Updated** | 2026-08-28 |
| **Author** | Software Architect |
| **Status** | Released (承認済み) |
| **Classification** | Internal — Engineering Division |

---

## Document Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-08-28 | Software Architect | Initial release. Functional specification for the Matching & Recommendation page covering AI-based recommendations, generic fallback, matching filters, recommendation history, similar products, and cross-screen ad panel. |

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

This screen serves as the personalized product discovery entry point within the Cosmetics Finder platform. The Matching & Recommendation subsystem provides the complete set of capabilities necessary for buyers to receive personalized skincare product recommendations derived from their AI skin analysis results, to narrow those recommendations through multi-dimensional matching filters (skin type, ingredients, price range, review rating), and to discover similar products from any product detail context.

This subsystem bridges AI skin analysis and the product catalog. It is responsible for translating a buyer's AI-detected skin conditions into a ranked, score-annotated set of compatible products while maintaining performance through Redis caching and guaranteeing that only active products from approved merchant shops are ever surfaced.

Additionally, the subsystem retrieves recommendation history from the buyer's completed AI skin analysis results to enable re-engagement, and displays approved merchant advertisements in the Cross-Screen Slide-Down Panel with transparent disclosure.

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
9. **Advertisement Display** — Displaying sponsored products from approved merchant advertisements only in the Cross-Screen Slide-Down Panel with transparent disclosure, prioritized by paid amount and rotation order.
10. **Cross-Screen Ad Panel** — A reusable Slide-Down Panel component (D0) that displays sponsored advertisements across 6 screens (Homepage, Search, Category, Product Detail, Recommendation, Cart) with image, title, description, CTA button, 5-second auto-slide rotation, and round-robin ad serving.

### 1.3 Target Users

| Attribute | Value |
|-----------|-------|
| **Primary Actor** | Buyer (authenticated; AI-result recommendations when analysis exists, generic recommendation results when analysis does not exist) |
| **Required Authentication** | JWT Bearer Token (for `/buyer/recommendations` page / recommendations API), None (for similar products on product detail pages) |
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
| `sort` | Query Parameter | Sort field (`matchScore`, `price`, `rating`, `createdAt`) |
| `order` | Query Parameter | Sort direction (`asc`, `desc`) |
| `page` | Query Parameter | Page number (1-indexed) |
| `limit` | Query Parameter | Items per page (max 50) |
| `productId` | Path Parameter | Product ID for similar-product lookup |

| Output Information | Data Category | Destination / Description |
|--------------------|---------------|---------------------------|
| `data` | Recommendation Result DTO Array | Paginated list of scored product recommendations |
| `meta` | Pagination Meta DTO | `page`, `limit`, `total`, `totalPages` |
| `source` | Source Enum | Recommendation source selected by analysis availability (`ai` when analysis exists, `generic` when no valid analysis exists) |
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
| 1 | Buyer navigates to /buyer/recommendations | — | Page displayed | System |
| 2 | System checks whether the buyer has a valid AI analysis result | — | Source = `ai` if analysis exists; otherwise `generic` | System |
| 3 | Buyer applies filters / changes sort | Default list | URL params updated | Buyer |
| 4 | Frontend calls GET /api/v1/recommendations/personalized | URL params valid | Query in-flight (skeleton) | System |
| 5 | Backend checks Redis cache | — | HIT (return cached) or MISS (query DB) | System |
| 6 | Backend builds Prisma WHERE (active + approved shop + skin types + filters) | — | Filtered candidate set | System |
| 7 | Backend computes match score, sorts, returns `{ data, meta, source }` | — | 200 response | System |
| 8 | Frontend renders recommendation cards according to selected source | Data received | AI match cards or generic product cards displayed | System |
| 9 | Buyer clicks a recommendation | Results displayed | Navigates to /buyer/products/:id | Buyer |

### 2.4 Relevant Requirements Covered

| Requirement ID | Requirement Summary |
|----------------|---------------------|
| B-MATCH-001 | System provides personalized recommendations based on skin analysis results |
| B-MATCH-002 | User can filter products by skin type |
| B-MATCH-003 | User can filter products by ingredients |
| B-MATCH-004 | User can filter products by price range |
| B-MATCH-005 | User can filter products by review rating |
| B-MATCH-006 | System displays "Recommended for You" section |
| B-MATCH-007 | System tracks recommendation history for buyers |
| B-MATCH-008 | System displays sponsored ads via Slide-Down Panel |
| B-MATCH-010 | Cross-screen ad panel (D0) displays sponsored ads across 6 screens |
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
| `AI_ANALYSIS` (fresh) | Latest valid AI skin analysis result (skin type + conditions) | Latest completed analysis is no more than 24 hours old | Badge: "🧬 AI Analysis" (emerald green) · Match score badges on cards · **No** prompt banner · History section visible when sessions exist | ✓ (run new analysis) |
| `AI_ANALYSIS` (stale) | AI analysis exists but is older than 24 hours | Latest completed analysis is more than 24 hours old | Badge: "🧬 AI Analysis" (emerald green) · Match score badges on cards · **Subtle** prompt banner: "Want Fresh Results?" · History section visible when sessions exist | ✓ (retake analysis) |
| `GENERIC` | Featured + top-rated products as fallback | No valid analysis is available | Badge: "⬡ General Picks" (amber) · Category badges on cards · **Prominent** prompt banner: "Start Skin Analysis →" · History section remains visible when sessions exist | ✓ (run new analysis) |

---

## 4. Business Rules

### 4.1 Personalization Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-MATCH-001 | Recommendation Source Selection | The recommendations page has no buyer-selected mode. If the buyer's latest completed AI analysis is no more than 24 hours old, return `source = "ai"` and AI-based recommendations. If no valid analysis is available, including a stale analysis older than 24 hours, return `source = "generic"` and generic featured/top-rated recommendation results with the profile prompt banner. | Backend (matching service) |
| BR-MATCH-002 | Authentication for Recommendations | The `/buyer/recommendations` page and personalized API require a valid JWT and a `buyer` role (or higher). Guest / unauthenticated users are blocked and redirected to login. | Backend (JwtAuthGuard) + Frontend Router |
| BR-MATCH-003 | Analysis Freshness | An AI analysis result is considered current for 24 hours after analysis; results beyond the window are treated as stale and fall back to generic. | Backend (analysis cache TTL) |
| BR-MATCH-004 | Profile Prompt Banner — Time-Based Display | The Profile Prompt Banner (EL-03a) adapts based on analysis freshness: **(a) No analysis (`source = "generic"`):** Show full-width prominent banner with heading "Get Personalized Recommendations", body text, and CTA "Start Skin Analysis →". **(b) Stale analysis (`source = "ai"`, analysis > 24h old):** Show subtle banner with heading "Want Fresh Results?", body "Retake your skin analysis for updated recommendations", and CTA "Retake Analysis →". **(c) Fresh analysis (`source = "ai"`, analysis ≤ 24h old):** Hide banner completely. In all cases, when `source = "generic"`: show "⬡ General Picks" amber badge, render category-status badges on cards, sort by `is_featured desc` then `avg_rating desc`. History section remains visible when completed sessions exist, independent of source. | Backend (matching service) + Frontend UI |
| BR-MATCH-005 | Guest Access Restriction | Unauthenticated visitors attempting to access `/buyer/recommendations` are redirected to the Login page. | Frontend (Auth Route Guard) |
| BR-MATCH-006 | Filter Override | If the buyer explicitly changes the `skinTypes` filter, the filtered value overrides the analysis-derived skin types for that query. | Backend (query precedence) |

### 4.2 Matching Algorithm Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-MATCH-007 | Match Score Range | Every recommendation carries a `matchScore` between 0 and 100 (integer). | Backend (scoring) |
| BR-MATCH-008 | Score Components | Score = Skin Type Compatibility (50) + Skin Concern Match (20) + Average Rating (20) + Featured Boost (10). | Backend (scoring) |
| BR-MATCH-009 | Skin Type Compatibility | Products whose `skin_types` array contains the user's primary skin type receive the full 50 points; products containing a secondary skin type receive 30; products with no overlap receive 0. | Backend (Prisma + scoring) |
| BR-MATCH-010 | Concern Matching | Products whose `tags` or `ingredients` match the buyer's skin concerns (e.g., acne, dark spots, wrinkles) earn up to 20 points. | Backend (Prisma + scoring) |
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
| BR-MATCH-024 | Default Sort | AI-analysis recommendation results default to `matchScore desc`; no-analysis generic results default to `is_featured desc`, then `avg_rating desc`; similar results default to `createdAt desc`. | Backend (service logic) |
| BR-MATCH-025 | Sort Allowlist | `sort` ∈ {`matchScore`, `price`, `rating`, `createdAt`}; `order` ∈ {`asc`, `desc`}; other values rejected. | Backend (DTO validation) |
| BR-MATCH-026 | Pagination Defaults | `page` defaults to 1; `limit` defaults to 20; `limit` maximum 50. | Backend (DTO defaults) |
| BR-MATCH-027 | Result Counting | `total` counts the full match set ignoring pagination (`skip`/`take`). | Backend (Prisma `count`) |
| BR-MATCH-028 | Decimal Serialization | `price`, `compare_at_price`, and `avg_rating` serialized as strings. | Backend (serializer) |
| BR-MATCH-029 | Cache-Aside Pattern | Redis checked first → miss → query DB → seed Redis. TTL must always be set. Never cache sensitive data. | Backend (matching service) |

### 4.6 Recommendation History Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-MATCH-030 | History Storage | Recommendation history is driven by the `skin_analysis_recommendations` table, which stores recommended products generated during each AI skin analysis session. | Database (`skin_analysis_recommendations`) |
| BR-MATCH-031 | Generic Excluded | Generic fallback recommendations are not saved to the skin analysis recommendations history. | Backend (matching service) |
| BR-MATCH-032 | History Retention | Historical skin analysis and recommendation records are retained for 180 days. Records older than 180 days are purged by a scheduled job. | Backend (cron job) |
| BR-MATCH-033 | History Pagination | Recommendation history sessions are paginated (default 20, max 50) and sorted by `skin_analyses.completed_at desc` (newest sessions first) via join between `skin_analyses` and `skin_analysis_recommendations`. | Backend (service + DTO) |

### 4.7 Advertisement Placement Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-MATCH-037 | Eligible Advertisement Filter | Sponsored ads in the Slide-Down Panel are selected from `advertisements` where `is_active = true`, `approval_status = 'approved'`, `payment_status = 'completed'`, `starts_at <= now`, and `expires_at > now`. | Backend (ad service) |
| BR-MATCH-038 | Ad Impression Recording | When a sponsored ad becomes visible in the panel (IntersectionObserver ≥ 50%), a client-side impression event is fired. Impression tracking is handled at the application layer via the ad panel API. | Frontend + Backend |
| BR-MATCH-040 | No-Analysis Ads | Sponsored ads are also shown when the buyer has no analysis result, using the same eligible advertisement filter. | Backend (ad service) |

### 4.8 Cross-Screen Slide-Down Panel Rules (D0)

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-MATCH-045 | Panel Component | The Slide-Down Panel (D0) is a reusable horizontal carousel component displayed across 6 screens: Homepage, Search Results, Category Pages, Product Detail, Recommendation, and Cart. | Frontend (AdSlidePanel component) |
| BR-MATCH-046 | Panel Structure | Each panel contains up to 5 ad slides. Each slide has: [D0a] Image/Banner (left), [D0b] Title, [D0c] Description, [D0d] CTA Button (right). Panel slides horizontally with 5-second auto-rotation. | Frontend (AdSlidePanel) |
| BR-MATCH-047 | Panel Position | The panel is positioned between content sections (not overlaying content). Position varies by screen: below hero (Homepage), above results (Search/Category), below add-to-cart (Product Detail), between organic sections (Recommendation), above checkout (Cart). | Frontend (per-screen layout) |
| BR-MATCH-048 | Auto-Slide | Panel auto-slides every 5 seconds. Auto-slide pauses on hover (desktop) or touch (mobile). Manual left/right arrows override auto-slide. Dot indicators show current position. | Frontend (AdSlidePanel) |
| BR-MATCH-049 | Max Slides Per Screen | Maximum 5 ads per panel per screen. If fewer than 5 eligible ads exist, the panel shows only available ads (no placeholders). | Backend (ad service) |
| BR-MATCH-050 | Round-Robin Rotation | Ads with the same priority amount rotate round-robin across page views. Rotation is session-based. | Backend (ad service) |
| BR-MATCH-051 | Advertisement Priority | Eligible ads are prioritized by `advertisements.payment_amount desc`, then `advertisements.created_at desc`. | Backend (ad service) |
| BR-MATCH-052 | Panel Impression Tracking | When the panel becomes visible (IntersectionObserver threshold ≥ 50%), all ads currently in the viewport are recorded as impressions via the ad panel API. | Frontend + Backend (ad tracking) |
| BR-MATCH-053 | Panel Disclosure | Every panel must display a disclosure footer: "Sponsored products are paid placements from merchants". | Frontend (AdSlidePanel) |

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
| EL-06 | Filters Panel | Aside (desktop sidebar / mobile drawer) | `matching.filtersTitle` | Yes | Filter groups: Skin Type, Price Range, Min Rating, Ingredients, and Sort. If buyer has analysis results: Skin Type pre-selected from analysis result. If buyer has no analysis results: all unchecked. |
| EL-17 | Recommendation Grid | Grid | — | Yes | Responsive grid of `RecommendationCard` components. 4 columns desktop / 2 columns tablet / 1 column mobile. |
| EL-19 | Product Card Badge | Badge | — | Conditional | If buyer has analysis results: "92% match" (green→teal gradient pill) on each card. If buyer has no analysis results: category-status badge — "⭐ Featured" (amber), "🏆 Top Rated" (teal), "🔥 Best Seller" (orange), or "✨ New" (purple) based on product flags. No match score shown for generic results. |
| EL-20 | Skin Type Tags | Tag Group | — | Conditional | Screen item mapping: `lblSkinTypeTags`. Compatible skin types are displayed on each product card below the product name. |
| EL-21 | Sort Controls | Select / Dropdown | `matching.sort` | Yes | Sort field (`matchScore`, `price`, `rating`, `createdAt`) and sort direction (`asc`, `desc`). Defaults follow BR-MATCH-024. Any sort change resets `page` to 1. |
| EL-22 | Pagination | Pagination | `matching.pagination` | Conditional | Previous/next + page numbers. Desktop only. |
| EL-23 | Load More Button | Button (outline) | `matching.loadMore` | Conditional | Mobile: infinite-scroll trigger. Rose-gold ghost button. |
| EL-24 | Empty State | EmptyState | `matching.empty` | Conditional | "No matching products" + Reset Filters button. |
| EL-25 | Error Banner | Alert | `matching.errors.serverError` | Conditional | Inline error with retry button. |

**Recommendation History Section (shown only when analysis results exist):**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-31 | History Section Heading | Heading (h2) | `matching.historyTitle` | Conditional | "📋 Previously Recommended" — shown when the buyer has past completed analysis sessions, regardless of the current recommendation `source`. |
| EL-32 | History Session Group | Card Group | — | Conditional | Accordion rows grouped by analysis date, including stale sessions. Expanded row shows compact product mini-cards (image + name + saved score + price). Collapsed row shows only the date header + chevron. |
| EL-33 | History Empty State | EmptyState | `matching.historyEmpty` | Conditional | "No recommendation history yet" — shown when the buyer has no completed analysis sessions in `skin_analysis_recommendations`, regardless of the current recommendation `source`. |

**Cross-Screen Slide-Down Ad Panel (D0) — shown for both analysis-result and no-analysis results:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-41 | Ad Slide-Down Panel | Carousel | — | Conditional | Horizontal glass-morphism carousel panel. Up to 5 ad slides. Each slide: [D0a] product image left, [D0b] title + [D0c] description center, [D0d] "Shop Now" CTA right. Left/right arrows + dot indicators. 5s auto-rotate (pauses on hover/touch). Small italic disclosure footer: "Sponsored products are paid placements from merchants". Shown for both `source = "ai"` and `source = "generic"` responses. |

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
| **API Endpoint** | `GET /api/v1/ads/panel?placement=category_banner` |
| **Processing Steps** | 1. Query eligible rows from `advertisements`. 2. Resolve the recommendation panel to the existing `category_banner` placement. 3. Sort by `payment_amount desc`, then `created_at desc`. 4. Apply session-based round-robin among equal-priority ads. 5. Return ads. |

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
| `ingredients` | Optional, array of strings | "Invalid ingredients" | "無効な成分です" |
| `minPrice` | Optional, ≥ 0 | "Minimum price must be 0 or more" | "最低価格は0以上である必要があります" |
| `maxPrice` | Optional, ≥ 0 | "Maximum price must be 0 or more" | "最高価格は0以上である必要があります" |
| `rating` | Optional, 1–5 | "Rating must be between 1 and 5" | "評価は1〜5の間である必要があります" |
| `sort` | Optional, matchScore/price/rating/createdAt | "Invalid sort field" | "無効な並び順項目です" |
| `order` | Optional, asc/desc | "Invalid sort direction" | "無効な並び順です" |
| `page` | Optional, ≥ 1 | "Page must be at least 1" | "ページは1以上である必要があります" |
| `limit` | Optional, 1–50 | "Limit must be between 1 and 50" | "件数は1〜50の間である必要があります" |
| `productId` | Required, valid UUID | "Invalid product ID" | "無効な商品IDです" |

### 8.2 History & Tracking Validation

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `historyId` | Required, valid UUID | "Invalid history ID" | "無効な履歴IDです" |
| `isHelpful` | Required, boolean | "Invalid feedback value" | "無効なフィードバック値です" |
| `adId` | Required, valid UUID | "Invalid advertisement ID" | "無効な広告IDです" |
| `adIds` | Required, array of UUIDs, max 5 | "Invalid advertisement IDs" | "無効な広告IDです" |
| `contextId` | Optional, valid UUID | "Invalid context ID" | "無効なコンテキストIDです" |

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
| `400` | `BAD_REQUEST` | Invalid context ID for ad panel | Panel not rendered (silent) |
| `401` | `UNAUTHORIZED` | Missing/invalid token on personalized endpoint | Redirect to login |
| `403` | `FORBIDDEN` | Non-buyer role attempting personalized access | Redirect to /unauthorized |
| `404` | `NOT_FOUND` | Similar product not found (invalid productId) | Empty state / hide similar section |
| `404` | `NOT_FOUND` | History record not found (invalid historyId) | Silent ignore (no user-facing error for tracking) |
| `429` | `TOO_MANY_REQUESTS` | Rate limit exceeded on public similar endpoint | "Too many requests. Please wait" + retry countdown |
| `429` | `TOO_MANY_REQUESTS` | Rate limit exceeded on ad panel endpoint | Panel not rendered (silent, no user-facing error) |
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

- Personalized recommendations require a valid JWT Bearer Token (`buyer` role or higher).
- Similar products endpoint is public — no JWT required.
- Rate limiting is enforced on the public similar products endpoint to protect against abuse.

### 10.2 Public vs Protected Endpoints

| `GET /recommendations/personalized` | Protected | Requires valid access token + `buyer` role or higher |
| `GET /recommendations/similar/:productId` | Public | No authentication required |
| `GET /recommendations/history` | Protected | Requires valid access token + `buyer` role |
| `POST /ads/track/click` | Public | No authentication required (guests tracked by session) |
| `GET /ads/panel` | Public | No authentication required (returns eligible ads for the panel) |
| `POST /ads/track/impression` | Public | No authentication required (guests tracked by session) |

### 10.3 Role-Based Access

| Role | Get Personalized | Filter Results | Get Similar | View History | Track Interactions | Sponsored Display |
|------|:----------------:|:--------------:|:-----------:|:------------:|:------------------:|:-----------------:|
| Visitor (guest) | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ (on recommendations screen) / ✓ (other screens) |
| `buyer` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `merchant` | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ |
| `admin` | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ |

### 10.4 Security Audit Logging

| Event | Data Logged | Retention |
|-------|-------------|-----------|
| `RECOMMENDATION_EXECUTED` | userId, source, filters, timestamp | 90 days |
| `RECOMMENDATION_ACCESS_DENIED` | userId, target endpoint, timestamp | 90 days |

---

## 11. Real-Time Notification Behavior

### 11.1 Current Implementation

The Matching & Recommendation page operates with standard REST API calls. Real-time WebSocket connections are not required for this feature; personalization changes (new analysis) are reflected on the next query (mitigated by the 5-minute personalized cache TTL and immediate cache invalidation on analysis change).

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
| Personalized recommendation response time (10K records) | ≤ 3 seconds (NFR-002) |
| API response time (p95) | ≤ 500ms (NFR-003) |
| Filter application time | ≤ 500ms |
| Match score computation (in-memory) | ≤ 50ms |
| Cache hit response time | ≤ 200ms |
| Similar products response time | ≤ 500ms |
| Page Load (Initial Render) | ≤ 2 seconds (NFR-001) |

### 13.2 Caching Strategy (Development Rules Section 10.5)

| Cache Target | Strategy | TTL | Invalidation |
|--------------|----------|-----|--------------|
| Personalized recommendation results | `cache:recommendations:user:{userId}:{hashOfQuery}` (String JSON) | 5 minutes | New AI analysis or any product mutation → `DEL` |
| Similar product results | `cache:recommendations:similar:{productId}` (String JSON) | 5 minutes | Product update/delete → `DEL` |
| Sponsored ad pool | `cache:recommendations:ads:eligible` (String JSON) | 10 minutes | Ad approval/rejection, payment status change, or ad expiry → `DEL` |
| Recommendation history | NOT cached (query hits DB directly; low-volume per user) | — | — |

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
| Extremely long ingredient list | 400 validation error; max array length enforced |
| Invalid UUID in `productId` | 400 validation error |
| Data leakage (unapproved shops) | Unapproved shop products excluded at query level (Section 12.2) |
| Unauthorized personalization | JWT required; access to recommendations screen and data is denied to guests |
| PII / health data exposure | Never log analysis images or skin data; only identifiers in event logs |

### 13.4 Responsive Design Requirements

| Breakpoint | Layout |
|------------|--------|
| Desktop (≥ 1024px) | Filters sidebar + results grid (4 columns) |
| Tablet (768px – 1023px) | Filters sidebar (narrower) + grid (2 columns) |
| Mobile (< 768px) | Filters drawer + stacked grid (1 column) |

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
| `RECOMMENDATION_HISTORY_DEFAULT_LIMIT` | `20` | Default items per history page |
| `RECOMMENDATION_HISTORY_MAX_LIMIT` | `50` | Maximum items per history page |
| `SPONSORED_MAX_PER_PANEL` | `5` | Max sponsored ads per cross-screen ad panel |
| `AD_PANEL_AUTO_SLIDE_MS` | `5000` | Auto-slide interval for cross-screen ad panel (5 seconds) |
| `AD_PANEL_MAX_SLIDES` | `5` | Maximum slides per ad panel per screen |
| `AD_PANEL_CACHE_TTL_SECONDS` | `600` | Cross-screen ad panel cache TTL (10 minutes) |
| `AD_PANEL_IMPRESSION_THRESHOLD` | `0.5` | IntersectionObserver threshold for impression tracking (50%) |
| `AD_RATE_LIMIT_PER_MINUTE` | `120` | Max ad panel + tracking requests per minute per IP |
| `RECOMMENDATION_HISTORY_RETENTION_DAYS` | `180` | Days to retain recommendation history records before purge |

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
