# DD_MATCH_03 — API Endpoints

> **Doc ID:** SKM-DD-MATCH-03 | **Version:** 1.1 | **Status:** Released  
> **Last Updated:** 2026-10-15 (code reconciliation)

> **Source update (2026-10-15):** Controller lives at `backend/src/modules/buyer/matching/matching.controller.ts`. Personalized query also accepts `rating`, `categoryId` and `category` alias; sort allowlist is `matchScore`, `price`, `rating`, `createdAt`. Similar lookup returns an empty result when the source product is missing (not a 404 from this service). Ad panel is owned by the ads module; matching page uses placement `recommendation_page_banner`.

---

## 1. Controller Setup

- **File:** `backend/src/modules/buyer/matching/matching.controller.ts`
- **Base Route:** `/api/v1/recommendations`
- **Guards:** `JwtAuthGuard` + `RolesGuard` (for protected endpoints)

- Ads controller and base route are owned by the separate ads module.

---

## 2. API Endpoints Contract

### 2.1 GET /recommendations/personalized

Get personalized or generic product recommendations.

- **Auth Required:** Yes (JwtAuthGuard and `buyer` role)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Query Params:** `MatchQueryDto`
  - `skinTypes` (string, optional) — comma-separated skin type filter
  - `ingredients` (string, optional) — comma-separated ingredient filter
  - `minPrice` (number, optional, ≥ 0) — lower price bound
  - `maxPrice` (number, optional, ≥ 0) — upper price bound
  - `rating` (number, optional, 1–5) — minimum average rating
  - `categoryId` or `category` (string, optional) — category filter; alias supported
  - `sort` (enum, optional) — `matchScore` | `price` | `rating` | `createdAt`
  - `order` (enum, optional) — `asc` | `desc`, default: `desc`
  - `page` (number, optional, ≥ 1) — service fallback: 1
  - `limit` (number, optional, 1–50) — service fallback: 20; frontend sends 12 by default
- **Response:** `200 OK`
  ```json
  {
    "data": [
      {
        "id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
        "name": "Vitamin C Brightening Serum",
        "slug": "vitamin-c-brightening-serum",
        "brandName": "GlowLab",
        "shortDescription": "Brightening serum with vitamin C",
        "price": "4980",
        "compareAtPrice": "6980",
        "images": ["https://cdn.example.com/products/vitamin-c-1.webp"],
        "skinTypes": ["oily", "combination"],
        "avgRating": "4.70",
        "reviewCount": 128,
        "isFeatured": true,
        "isInStock": true,
        "matchScore": 92,
        "categoryBadge": "topRated"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 156,
      "totalPages": 8
    },
    "source": "ai",
    "analysisAge": 2.5,
    "skinTypes": ["oily", "combination"]
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` — Validation failures (invalid params)
  - `401 UNAUTHORIZED` — Missing/invalid token
  - `403 FORBIDDEN` — Non-buyer role
  - `500 INTERNAL_SERVER_ERROR` — Server error
- **Logic:** Calls `matchingService.getPersonalized(userId, query)`
- **Caching:** Redis cache-aside pattern (TTL 5 min). Cache key: `cache:recommendations:user:{userId}:{sha256(normalizedFilters)}` where the SHA-256 digest covers sorted `skinTypes`, `ingredients`, `minPrice`, `maxPrice`, `rating`, `categoryId`, `sort`, `order`, `page`, `limit` (full digest — never truncated, so pages cannot collide).

### 2.2 GET /recommendations/similar/:productId

Get similar products for a given product.

- **Auth Required:** No (Public)
- **Path Params:**
  - `productId` (UUID, required) — source product ID
- **Query Params:**
  - `limit` (number, optional, 1–20) — default: 8
- **Response:** `200 OK`
  ```json
  {
    "data": [
      {
        "id": "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
        "name": "Hyaluronic Acid Serum",
        "slug": "hyaluronic-acid-serum",
        "brandName": "GlowLab",
        "shortDescription": null,
        "price": "3200",
        "compareAtPrice": null,
        "images": ["https://cdn.example.com/products/ha-serum-1.webp"],
        "skinTypes": ["oily", "dry"],
        "avgRating": "4.50",
        "reviewCount": 89,
        "isFeatured": false,
        "isInStock": true,
        "matchScore": null,
        "categoryBadge": null
      }
    ],
    "meta": {
      "page": 1,
      "limit": 8,
      "total": 6,
      "totalPages": 1
    },
    "source": null
  }
  ```
- **Unknown source product:** Returns `200 OK` with empty `data` and zero totals.
- **Logic:** Calls `matchingService.getSimilar(productId, limit)` — same category + overlapping skin types + active + approved merchant, source excluded, `createdAt desc`; `matchScore` is always `null` and `source` is `null`.
- **Rate Limit:** Not implemented (no throttler).

### 2.3 GET /recommendations/history

Get recommendation history from past AI analysis sessions.

- **Auth Required:** Yes (JwtAuthGuard, `buyer` role)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Query Params:**
  - `page` (number, optional, ≥ 1) — default: 1
  - `limit` (number, optional, 1–50) — default: 20
- **Response:** `200 OK`
  ```json
  {
    "data": [
      {
        "sessionId": "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f",
        "sessionDate": "2026-08-20T14:30:00.000Z",
        "skinTypesUsed": ["oily", "combination"],
        "products": [
          {
            "id": "d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80",
            "name": "Vitamin C Brightening Serum",
            "slug": "vitamin-c-brightening-serum",
            "price": "4980",
            "images": ["https://cdn.example.com/products/vitamin-c-1.webp"],
            "matchScore": 92
          }
        ]
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1
    }
  }
  ```
- **Error Responses:**
  - `401 UNAUTHORIZED` — Missing/invalid token
  - `403 FORBIDDEN` — Non-buyer role
- **Logic:** Calls `matchingService.getHistory(userId, page, limit)`

### 2.4 GET /ads/panel

Get eligible ads for the Slide-Down Panel carousel.

- **Auth Required:** No (Public)
- **Query Params:** The recommendations page requests its shared ad placement, `recommendation_page_banner`; query and ad response contracts are defined by the shared ads module.
- **Response:** `200 OK`
  ```json
  {
    "data": [
      {
        "adId": "adv_abc456",
        "title": "Vitamin C Brightening Serum",
        "description": "Dermatologist-recommended for dull skin",
        "imageUrl": "https://cdn.example.com/ads/vitamin-c-banner.webp",
        "sku": "SKU-VC-001",
        "ctaText": "Shop Now",
        "priorityAmount": "8.00",
        "shopName": "GlowLab",
        "placement": "recommendation_page_banner",
        "startsAt": "2026-10-01T00:00:00.000Z",
        "expiresAt": "2026-10-31T23:59:59.000Z",
        "productId": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
        "productSlug": "vitamin-c-brightening-serum"
      }
    ],
    "placement": "recommendation_page_banner",
    "meta": {
      "total": 5,
      "maxAds": 5
    }
  }
  ```
- **Error Responses:** None — `ads.service.ts` catches failures and returns `200 OK` with empty `data` and zeroed `meta`.
- **Logic:** Calls `adsService.getAdsByPlacement(placement, sessionId)` — eligibility `isActive && approvalStatus:'approved' && paymentStatus:'completed' && startsAt <= now < expiresAt` (+ `feeSetting.placement` match for `*_banner` placements), ordered `paymentAmount desc, createdAt desc`, top 5; round-robin rotation only when `sessionId` is supplied and Redis is available. The page's `useSponsoredAds` hook actually calls `GET /ads?placement=`, then filters placement/approval/dates client-side.
- **Note:** If fewer than 5 eligible ads exist, returns only available ads (no placeholders).

### 2.5 POST /ads/track/impression

Record ad impressions when the panel becomes visible.

- **Auth Required:** No (Public)
- **Body:**
  ```json
  {
    "adIds": ["adv_abc456", "adv_def789"]
  }
  ```
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "recorded": 2
    }
  }
  ```
- **Error Responses:** None — no DTO validation exists; the service logs and returns `{ "data": { "recorded": <adIds.length> } }`.
- **Logic:** Calls `adsService.trackImpression(adIds)` (log-only analytics — nothing persisted)

### 2.6 POST /ads/track/click

Record ad click when CTA is clicked.

- **Auth Required:** No (Public)
- **Body:**
  ```json
  {
    "adId": "adv_abc456",
    "placement": "recommendation_page_banner"
  }
  ```
  (`placement` is optional — there is no `contextId` field in the implementation.)
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "recorded": true
    }
  }
  ```
- **Error Responses:** None — no DTO validation; log-only.
- **Logic:** Calls `adsService.trackClick(adId, placement)`

---

## 3. Protected Endpoint Guards

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('recommendations')
export class MatchingController { ... }
```

| Guard | Purpose | Behavior |
|-------|---------|----------|
| `JwtAuthGuard` | Validates JWT signature | Checks `Authorization: Bearer <token>` header. Verifies signature, expiry, and Redis blacklist. |
| `RolesGuard` | Enforces role-based access | Checks `@Roles('buyer')` decorator against user's `role` claim in JWT payload. |

---

## 4. Rate Limiting Configuration

**Not implemented.** The table below is the original design target only — a repo-wide search finds no `ThrottlerModule` / `@Throttle()` usage, so none of these limits are active:

| Endpoint | Design target | Window | Key |
|----------|-------|--------|-----|
| `GET /recommendations/personalized` | 30 requests | 1 minute | User ID |
| `GET /recommendations/similar/:productId` | 30 requests | 1 minute | IP address |
| `GET /recommendations/history` | 30 requests | 1 minute | User ID |
| `GET /ads/panel` | 60 requests | 1 minute | IP address |
| `POST /ads/track/impression` | 30 requests | 1 minute | IP address |
| `POST /ads/track/click` | 30 requests | 1 minute | IP address |

---

## 5. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_MATCH_01](./DD_MATCH_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_MATCH_02](./DD_MATCH_02_FRONTEND_Page.md) | Frontend page design |
| [DD_MATCH_04](./DD_MATCH_04_DTOS_AND_TYPES.md) | Full DTO definitions |
| [DD_MATCH_05](./DD_MATCH_05_BUSINESS_LOGIC.md) | Backend business rules |
| [機能設計書_Matching_And_Recommendation](../機能設計書_Matching_And_Recommendation.md) | Full functional specification |
