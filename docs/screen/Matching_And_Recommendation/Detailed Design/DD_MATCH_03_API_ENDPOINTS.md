# DD_MATCH_03 — API Endpoints

> **Doc ID:** SKM-DD-MATCH-03 | **Version:** 1.0 | **Status:** Released  
> **Last Updated:** 2026-09-01

---

## 1. Controller Setup

- **File:** `src/modules/recommendations/recommendation.controller.ts`
- **Base Route:** `/api/v1/recommendations`
- **Guards:** `JwtAuthGuard` + `RolesGuard` (for protected endpoints)

- **File:** `src/modules/ads/ad.controller.ts`
- **Base Route:** `/api/v1/ads`
- **Guards:** Public (no auth required)

---

## 2. API Endpoints Contract

### 2.1 GET /recommendations/personalized

Get personalized or generic product recommendations.

- **Auth Required:** Yes (JwtAuthGuard, `buyer` role or higher)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Query Params:** `MatchQueryDto`
  - `skinTypes` (string, optional) — comma-separated skin type filter
  - `ingredients` (string, optional) — comma-separated ingredient filter
  - `minPrice` (number, optional, ≥ 0) — lower price bound
  - `maxPrice` (number, optional, ≥ 0) — upper price bound
  - `sort` (enum, optional) — `matchScore` | `price` | `createdAt`, default: `matchScore`
  - `order` (enum, optional) — `asc` | `desc`, default: `desc`
  - `page` (number, optional, ≥ 1) — default: 1
  - `limit` (number, optional, 1–50) — default: 20
- **Response:** `200 OK`
  ```json
  {
    "data": [
      {
        "id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
        "name": "Vitamin C Brightening Serum",
        "slug": "vitamin-c-brightening-serum",
        "price": "4980",
        "compare_at_price": "6980",
        "images": ["https://cdn.example.com/products/vitamin-c-1.webp"],
        "skinTypes": ["oily", "combination"],
        "avgRating": "4.70",
        "reviewCount": 128,
        "isFeatured": true,
        "isInStock": true,
        "matchScore": 92
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 156,
      "totalPages": 8
    },
    "source": "ai"
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` — Validation failures (invalid params)
  - `401 UNAUTHORIZED` — Missing/invalid token
  - `403 FORBIDDEN` — Non-buyer role
  - `429 TOO_MANY_REQUESTS` — Rate limit exceeded
  - `500 INTERNAL_SERVER_ERROR` — Server error
- **Logic:** Calls `matchingService.getPersonalized(userId, query)`
- **Caching:** Redis cache-aside pattern (TTL 5min). Cache key: `cache:recommendations:user:{userId}:{hashOfQuery}`

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
        "price": "3200",
        "compare_at_price": null,
        "images": ["https://cdn.example.com/products/ha-serum-1.webp"],
        "skinTypes": ["oily", "dry"],
        "avgRating": "4.50",
        "reviewCount": 89,
        "isFeatured": false,
        "isInStock": true,
        "matchScore": null
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
- **Error Responses:**
  - `400 BAD_REQUEST` — Invalid productId format
  - `404 NOT_FOUND` — Product not found
  - `429 TOO_MANY_REQUESTS` — Rate limit exceeded
- **Logic:** Calls `matchingService.getSimilar(productId, limit)`
- **Rate Limit:** 30 requests per IP per minute

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
- **Query Params:**
  - `placement` (string, required) — e.g., `category_banner` (recommendation panel uses existing category-banner placement)
  - `sessionId` (string, optional) — session ID for round-robin rotation tracking
- **Response:** `200 OK`
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
    "placement": "category_banner",
    "meta": {
      "total": 5,
      "maxAds": 5
    }
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` — Invalid placement parameter
  - `429 TOO_MANY_REQUESTS` — Rate limit exceeded
- **Logic:** Calls `adService.getPanel(placement, sessionId)`
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
- **Error Responses:**
  - `400 BAD_REQUEST` — Invalid adIds
- **Logic:** Calls `adService.trackImpression(adIds)`

### 2.6 POST /ads/track/click

Record ad click when CTA is clicked.

- **Auth Required:** No (Public)
- **Body:**
  ```json
  {
    "adId": "adv_abc456",
    "contextId": "optional-context-uuid"
  }
  ```
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "recorded": true
    }
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` — Invalid adId
- **Logic:** Calls `adService.trackClick(adId, contextId)`

---

## 3. Protected Endpoint Guards

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('recommendations')
export class RecommendationController { ... }
```

| Guard | Purpose | Behavior |
|-------|---------|----------|
| `JwtAuthGuard` | Validates JWT signature | Checks `Authorization: Bearer <token>` header. Verifies signature, expiry, and Redis blacklist. |
| `RolesGuard` | Enforces role-based access | Checks `@Roles('buyer')` decorator against user's `role` claim in JWT payload. |

---

## 4. Rate Limiting Configuration

| Endpoint | Limit | Window | Key |
|----------|-------|--------|-----|
| `GET /recommendations/personalized` | 30 requests | 1 minute | User ID |
| `GET /recommendations/similar/:productId` | 30 requests | 1 minute | IP address |
| `GET /recommendations/history` | 30 requests | 1 minute | User ID |
| `GET /ads/panel` | 60 requests | 1 minute | IP address |
| `POST /ads/track/impression` | 30 requests | 1 minute | IP address |
| `POST /ads/track/click` | 30 requests | 1 minute | IP address |

**Redis Key Pattern:** `rate:match:{endpoint}:{identifier}`

---

## 5. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_MATCH_01](./DD_MATCH_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_MATCH_02](./DD_MATCH_02_FRONTEND_Page.md) | Frontend page design |
| [DD_MATCH_04](./DD_MATCH_04_DTOS_AND_TYPES.md) | Full DTO definitions |
| [DD_MATCH_05](./DD_MATCH_05_BUSINESS_LOGIC.md) | Backend business rules |
| [機能設計書_Matching_And_Recommendation](../機能設計書_Matching_And_Recommendation.md) | Full functional specification |
