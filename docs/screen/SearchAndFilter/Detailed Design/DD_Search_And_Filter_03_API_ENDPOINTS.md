# DD_SEARCH_03 — API Endpoints

> **Doc ID:** SKM-DD-SEARCH-03 | **Version:** 1.2 | **Status:** Released  
> **Last Updated:** 2026-08-25

---

## 1. Controller Setup

- **File:** `src/modules/products/products.controller.ts`
- **Base Route:** `/api/v1`
- **Guards:** Public (no authentication required for all endpoints)

---

## 2. API Endpoints Contract

### 2.1 GET /products

Search, filter, sort, and paginate the product catalog.

- **Auth Required:** No (Public)
- **Query Parameters:** `ProductQueryDto`
  - `q` (string, optional, max 255 chars) — Keyword for partial matching search
  - `categoryId` (UUID, optional) — Category filter (includes all descendant categories)
  - `skinTypes` (string[], optional) — Skin type filter, comma-separated enum values
  - `ingredients` (string[], optional) — Ingredient filter, comma-separated
  - `tags` (string[], optional) — Product tag filter, comma-separated
  - `minPrice` (number, optional, ≥ 0) — Lower price bound
  - `maxPrice` (number, optional, ≥ 0) — Upper price bound
  - `rating` (number, optional, 1–5) — Minimum average rating
  - `sort` (enum, optional, default: `createdAt`) — Sort field: `price` | `rating` | `createdAt`
  - `order` (enum, optional, default: `desc`) — Sort direction: `asc` | `desc`
  - `page` (number, optional, default: 1, ≥ 1) — Page number (1-indexed)
  - `limit` (number, optional, default: 20, 1–100) — Items per page
- **Response:** `200 OK`
  ```json
  {
    "data": [
      {
        "id": "6b72a6b2-60cc-483a-867c-1b77df7f7dc8",
        "name": "Gentle Foaming Cleanser",
        "slug": "gentle-foaming-cleanser",
        "shortDescription": "pH-balanced cleanser for oily skin",
        "price": "29.99",
        "compareAtPrice": "39.99",
        "images": ["https://cdn.example.com/products/6b72a6b2-60cc-483a-867c-1b77df7f7dc8/main.webp"],
        "skinTypes": ["oily", "combination"],
        "tags": ["cleanser", "fragrance-free"],
        "avgRating": "4.5",
        "reviewCount": 128,
        "isInStock": true,
        "category": {
          "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
          "name": "Cleansers",
          "slug": "cleansers"
        }
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` — Validation failed (invalid query params)
  - `429 TOO_MANY_REQUESTS` — Rate limit exceeded
  - `500 INTERNAL_SERVER_ERROR` — Server error
- **Logic:** Calls `service.searchProducts(query)`
- **Cache:** Redis key `cache:products:list:{hashOfQuery}`, TTL 2 minutes
- **Product Visibility Restriction:** Return only products that satisfy all of the following conditions: `products.is_active = true`, `merchants.license_status = 'approved'`, and `shops.is_approved = true`. The merchant and shop conditions are conjunctive: exclude every product whose merchant license is not approved or whose shop is not approved (`merchants.license_status <> 'approved'` or `shops.is_approved <> true`), as well as every inactive product (DBS §3.2; BR-SEARCH-012, BR-SEARCH-013).
- **Rate Limit:** 60 requests per IP per minute

### 2.2 GET /categories

Retrieve the nested category tree for navigation.

- **Auth Required:** No (Public)
- **Query Parameters:** None
- **Response:** `200 OK`
  ```json
  {
    "data": [
      {
        "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        "name": "Skincare",
        "slug": "skincare",
        "iconUrl": "https://cdn.example.com/categories/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d/icon.webp",
        "sortOrder": 1,
        "children": [
          {
            "id": "3a52c3c9-c1b7-4c4f-9e67-d8687cfc1d9f",
            "name": "Cleansers",
            "slug": "cleansers",
            "iconUrl": null,
            "sortOrder": 1,
            "children": []
          }
        ]
      }
    ]
  }
  ```
- **Error Responses:**
  - `500 INTERNAL_SERVER_ERROR` — Server error
- **Logic:** Calls `service.getCategoryTree()`
- **Cache:** Redis key `cache:categories`, TTL 30 minutes
- **Rate Limit:** None (cached, low cost)

### 2.3 GET /products/:slug

Retrieve full product detail by slug.

- **Auth Required:** No (Public)
- **Path Parameters:**
  - `slug` (string, required) — URL-friendly product slug
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "id": "6b72a6b2-60cc-483a-867c-1b77df7f7dc8",
      "name": "Gentle Foaming Cleanser",
      "slug": "gentle-foaming-cleanser",
      "shortDescription": "pH-balanced cleanser for oily skin",
      "description": "A gentle, pH-balanced foaming cleanser...",
      "price": "29.99",
      "compareAtPrice": "39.99",
      "images": ["https://cdn.example.com/products/6b72a6b2-60cc-483a-867c-1b77df7f7dc8/main.webp"],
      "skinTypes": ["oily", "combination"],
      "ingredients": ["Water", "Glycerin", "Cocamidopropyl Betaine"],
      "tags": ["cleanser", "fragrance-free"],
      "avgRating": "4.5",
      "reviewCount": 128,
      "stockQuantity": 45,
      "isInStock": true,
      "isActive": true,
      "category": {
        "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        "name": "Cleansers",
        "slug": "cleansers"
      },
      "shop": {
        "id": "c4d5e6f7-a8b9-0c1d-2e3f-4a5b6c7d8e9f",
        "name": "Glow Skincare",
        "slug": "glow-skincare",
        "isApproved": true
      },
      "createdAt": "2026-07-15T10:30:00.000Z",
      "updatedAt": "2026-08-01T14:20:00.000Z"
    }
  }
  ```
- **Error Responses:**
  - `404 NOT_FOUND` — Product not found (invalid slug or inactive product)
  - `429 TOO_MANY_REQUESTS` — Rate limit exceeded
  - `500 INTERNAL_SERVER_ERROR` — Server error
- **Logic:** Calls `service.getProductBySlug(slug)`
- **Product Visibility Restriction:** Return a product only when all of the following conditions are satisfied: `products.is_active = true`, `merchants.license_status = 'approved'`, and `shops.is_approved = true`. Exclude the product from detail responses when its merchant license is not approved or its shop is not approved (`merchants.license_status <> 'approved'` or `shops.is_approved <> true`), as well as when it is inactive; such a product is treated as not found (`404 NOT_FOUND`) (DBS §3.2; BR-SEARCH-012, BR-SEARCH-013).
- **Rate Limit:** 60 requests per IP per minute

### 2.4 GET /ads

Retrieve sponsored advertisements for a given placement.

- **Auth Required:** No (Public)
- **Query Parameters:**
  - `placement` (enum, required) — Ad placement: `homepage_slider` | `product_sidebar` | `category_banner` | `search_top` (aligned with `ad_fee_settings.placement`, DBS §3.14)
- **Response:** `200 OK`
  ```json
  {
    "data": [
      {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "placement": "search_top",
        "title": "Summer Skincare Sale",
        "description": "Up to 40% off premium skincare products",
        "imageUrl": "https://cdn.example.com/ads/a1b2c3d4-e5f6-7890-abcd-ef1234567890/banner.webp",
        "ctaText": "Shop Now",
        "ctaUrl": "/products?category=skincare&sort=newest",
        "impressionUrl": "https://analytics.example.com/impression?ad_id=a1b2c3d4",
        "tier": "premium",
        "urgency": 8,
        "approvalStatus": "approved",
        "startsAt": "2026-08-01T00:00:00.000Z",
        "expiresAt": "2026-09-01T00:00:00.000Z"
      }
    ]
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` — Invalid placement value
  - `500 INTERNAL_SERVER_ERROR` — Server error
- **Logic:** Calls `service.getAdsByPlacement(placement)`
- **Cache:** Redis key `cache:ads:search-top`, TTL 5 minutes
- **Guard Conditions:** Only `approved`/`active` ads within their schedule; linked to approved merchants/shops only (BR-SEARCH-013). Applies package placement and tier priority rules (Premium > Standard > Basic, round-robin within a tier), limited to max 5 ads (BR-SEARCH-026).
- **Rate Limit:** None (cached, low cost)

---

## 3. Protected Endpoint Guards

All endpoints in this module are **public** — no authentication guards are applied. Shopping actions (add to cart/wishlist) triggered from product cards are handled by separate protected endpoints in their respective modules.

| Guard | Purpose | Behavior |
|-------|---------|----------|
| `ThrottlerGuard` | Rate limiting | Protects public search endpoint from abuse. Limits per IP address. |

---

## 4. Rate Limiting Configuration

| Endpoint | Limit | Window | Key |
|----------|-------|--------|-----|
| `GET /products` | 60 requests | 1 minute | IP address |
| `GET /products/:slug` | 60 requests | 1 minute | IP address |
| `GET /categories` | — | — | Served from Redis cache (30 min TTL) |
| `GET /ads` | — | — | Served from Redis cache (5 min TTL) |

**Redis Key Pattern:** `rate:search:{endpoint}:{identifier}`

---

## 5. Cache Configuration

| Cache Key | TTL | Scope | Invalidation Trigger |
|-----------|-----|-------|---------------------|
| `cache:products:list:{hash}` | 2 minutes | Per unique query | Product create/update/delete |
| `cache:categories` | 30 minutes | Global | Category create/update/delete |
| `cache:ads:search-top` | 5 minutes | Per placement | Ad approval/status change |

**Cache-Aside Pattern:** Check Redis first → HIT → return cached; MISS → query DB → seed Redis with TTL.

---

## 6. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_SEARCH_01](./DD_Search_And_Filter_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_SEARCH_02](./DD_Search_And_Filter_02_FRONTEND_Page.md) | Frontend page design |
| [DD_SEARCH_04](./DD_Search_And_Filter_04_DTOS_AND_TYPES.md) | Full DTO definitions |
| [機能設計書_Search_And_Filter](../機能設計書%20_Search_And_Filter.md) | Full functional specification (v2.3) |
| [画面項目設計書_Search_And_Filter](../画面項目設計書_Search_And_Filter.md) | Screen items specification (v2.6) |
