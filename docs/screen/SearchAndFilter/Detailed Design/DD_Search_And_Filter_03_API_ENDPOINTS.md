# DD_SEARCH_03 — API Endpoints

> **Doc ID:** SKM-DD-SEARCH-03 | **Version:** 1.3 | **Status:** Released  
> **Last Updated:** 2026-10-15

> **Codebase alignment:** Aligned with `backend/src/modules/catalog/search/**` and
> `backend/src/modules/catalog/products/buyer-products.controller.ts` as of 2026-10-15.

---

## 1. Controller Setup

- **Controller File:** `backend/src/modules/catalog/search/search.controller.ts`
- **Controller Prefix:** `@Controller('search')` with the global prefix `api/v1`
- **Base Route:** `/api/v1/search`
- **Guards:** All four endpoints are `@Public()` — no authentication required
- **Global request pipeline (from `main.ts`):** `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`, `AllExceptionsFilter`, and global interceptors `LoggingInterceptor`, `TransformInterceptor`, and `RateLimitInterceptor`

---

## 2. API Endpoints Contract

> **Note on `limit`:** the `ProductQueryDto` declares a fallback default of `20` (applied only when `limit` is omitted from the request). The Search & Filter screen's Zod schema defaults `limit` to **12** and always sends `limit=12` explicitly, so requests made by the screen use a page size of 12.

### 2.1 GET /search/products

Search, filter, sort, and paginate the product catalog.

- **Full path:** `GET /api/v1/search/products`
- **Auth Required:** No (Public)
- **Query Parameters:** `ProductQueryDto`
  - `q` (string, optional, max 255 chars) — Keyword for partial matching search
  - `categoryId` (UUID, optional) — Category filter (includes all descendant categories)
  - `skinTypes` (string[], optional) — Skin type filter; comma-separated or repeated enum values (`dry` | `oily` | `combination` | `sensitive` | `normal`)
  - `ingredients` (string[], optional) — Ingredient filter (max 50); comma-separated or repeated
  - `tags` (string[], optional) — Product tag filter (max 20); comma-separated or repeated
  - `minPrice` (number, optional, ≥ 0) — Lower price bound
  - `maxPrice` (number, optional, ≥ 0) — Upper price bound
  - `rating` (number, optional, 1–5) — Minimum average rating
  - `sort` (enum, optional, default: `createdAt`) — Sort field: `price` | `rating` | `createdAt`
  - `order` (enum, optional, default: `desc`) — Sort direction: `asc` | `desc`
  - `page` (number, optional, default: 1, ≥ 1) — Page number (1-indexed)
  - `limit` (number, optional, default: 20, 1–100) — Items per page (the screen sends `12` by default)
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
        },
        "shop_name": "Glow Skincare"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 12,
      "total": 150,
      "totalPages": 13
    }
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` — Validation failed (invalid query params)
  - `500 INTERNAL_SERVER_ERROR` — Server error
- **Logic:** Calls `SearchService.searchProducts(query)`
- **Cache:** Redis key `cache:products:list:v2:{md5HashOfQuery}`, TTL **120 seconds (2 minutes)**
- **Product Visibility Restriction:** Return only products that satisfy all of the following: `products.is_active = true` and `products.merchant.license_status = 'approved'`. Inactive products and products from merchants whose license is not approved are excluded at the query level (BR-SEARCH-012, BR-SEARCH-013).

### 2.2 GET /search/categories

Retrieve the nested category tree for navigation.

- **Full path:** `GET /api/v1/search/categories`
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
- **Logic:** Calls `SearchService.getCategoryTree()` (queries categories ordered by `sortOrder ASC`, builds the `parent_id` tree)
- **Cache:** Redis key `cache:categories`, TTL **1800 seconds (30 minutes)**

### 2.3 GET /search/products/:slug

Retrieve full product detail by slug.

- **Full path:** `GET /api/v1/search/products/:slug`
- **Auth Required:** No (Public)
- **Path Parameters:**
  - `slug` (string, required) — URL-friendly product slug (`^[a-z0-9]+(?:-[a-z0-9]+)*$`)
- **Response:** `200 OK` — `{ "data": ProductDetailDto }`
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
      "category": { "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d", "name": "Cleansers", "slug": "cleansers" },
      "shop": { "id": "c4d5e6f7-a8b9-0c1d-2e3f-4a5b6c7d8e9f", "name": "Glow Skincare", "slug": "glow-skincare", "isApproved": true },
      "createdAt": "2026-07-15T10:30:00.000Z",
      "updatedAt": "2026-08-01T14:20:00.000Z"
    }
  }
  ```
- **Error Responses:**
  - `404 NOT_FOUND` — Product not found (invalid slug, inactive product, or unapproved merchant)
  - `500 INTERNAL_SERVER_ERROR` — Server error
- **Logic:** Calls `SearchService.getProductBySlug(slug)`
- **Product Visibility Restriction:** Return a product only when `products.is_active = true` and `products.merchant.license_status = 'approved'`. Otherwise the product is treated as not found (`404 NOT_FOUND`) (BR-SEARCH-012, BR-SEARCH-013).

### 2.4 GET /search/ads

Retrieve sponsored advertisements for a given placement.

- **Full path:** `GET /api/v1/search/ads?placement=search_page_banner`
- **Auth Required:** No (Public)
- **Query Parameters:**
  - `placement` (enum, required) — Ad placement. Allowed values (from `AdPlacement`): `search_page_banner` | `recommendation_page_banner` | `checkout_page_banner` | `productDetail_page_banner`. The Search & Filter screen uses **`search_page_banner`**.
- **Response:** `200 OK` — `{ "data": SponsoredAdDto[] }`
  ```json
  {
    "data": [
      {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "placement": "search_page_banner",
        "title": "Summer Skincare Sale",
        "announcementMessage": "SPONSORED",
        "description": "Up to 40% off premium skincare products",
        "imageUrl": "https://cdn.example.com/ads/a1b2c3d4-e5f6-7890-abcd-ef1234567890/banner.webp",
        "sku": "DMC-004",
        "tier": "standard",
        "approvalStatus": "approved",
        "startsAt": "2026-08-01T00:00:00.000Z",
        "expiresAt": "2026-09-01T00:00:00.000Z"
      }
    ]
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` — Invalid or missing placement value
  - `500 INTERNAL_SERVER_ERROR` — Server error
- **Logic:** Calls `SearchService.getAdsByPlacement(placement)`. The service selects advertisements where `feeSetting.placement = placement`, `approvalStatus = 'approved'`, `isActive = true`, `startsAt <= NOW() <= expiresAt`, and `shop.isApproved = true`; ordered by `startsAt DESC` and capped at **5** (`take: 5`). `description` is mapped from the ad's `content`; `tier` is returned as `'standard'`.
- **Cache:** None — advertisements are queried directly (not cached by `SearchService`).

### 2.5 GET /products/:idOrSlug (buyer product detail — ad SKU hydration)

Used by the frontend `useAdProducts` hook to hydrate an ad's linked product SKU.

- **Controller:** `backend/src/modules/catalog/products/buyer-products.controller.ts` (`@Controller('products')`)
- **Full path:** `GET /api/v1/products/:idOrSlug`
- **Auth Required:** No (Public)
- **Behavior:** Returns product detail by id or slug via `ProductsService.getDetail(idOrSlug)`.

---

## 3. Guard Summary

| Guard | Applied to Search module? | Purpose |
|-------|:------------------------:|---------|
| Authentication ([A]) | No | All search endpoints are `@Public()` |
| Roles | No | No role restriction on search endpoints |
| `RateLimitInterceptor` (global) | Yes (headers only) | Adds `X-RateLimit-*` response headers; see §4 |

Shopping actions (add to cart / wishlist) triggered from product cards are handled by separate protected endpoints in the Cart and Wishlist modules.

---

## 4. Rate Limiting / Response Headers

A global `RateLimitInterceptor` (`backend/src/common/interceptors/rate-limit.interceptor.ts`) attaches rate-limit headers to responses keyed by `ratelimit:{ip}:{path}`:

| Config | Window | Max requests | Applies to |
|--------|--------|--------------|------------|
| Default | 15 minutes | 100 | All paths (includes `/search/**`) |
| Strict | 15 minutes | 10 | `/auth/login`, `/auth/register` |

- Headers emitted: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `X-RateLimit-Policy`.
- The interceptor **does not reject** requests; it only reports limits via headers. No search-specific throttling is configured. A `429 TOO_MANY_REQUESTS` response would only occur if a limit is enforced elsewhere (the shared API error filter maps a `429` status to a standard error response).

---

## 5. Cache Configuration

| Cache Key | TTL | Scope | Invalidation Trigger |
|-----------|-----|-------|---------------------|
| `cache:products:list:v2:{hash}` | 2 minutes | Per unique query | Product create/update/delete (`SearchService.invalidateProductCache()`) |
| `cache:categories` | 30 minutes | Global | Category create/update/delete (`SearchService.invalidateCategoryCache()`) |
| _(advertisements)_ | — | Not cached | — |

**Cache-Aside Pattern:** Check Redis first → HIT → return cached; MISS → query DB → seed Redis with TTL.

---

## 6. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_SEARCH_01](./DD_Search_And_Filter_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_SEARCH_02](./DD_Search_And_Filter_02_FRONTEND_Page.md) | Frontend page design |
| [DD_SEARCH_04](./DD_Search_And_Filter_04_DTOS_AND_TYPES.md) | Full DTO definitions |
| [DD_SEARCH_05](./DD_Search_And_Filter_05_BUSINESS_LOGIC.md) | Business logic and caching |
| [DD_SEARCH_06](./DD_Search_And_Filter_06_TEST_SPEC.md) | Test specification (synced to PCL scenario IDs) |
| [SearchAndFilter_PCL](../SearchAndFilter_PCL.md) | Program checklist (scenario IDs N / A / B / I) |
| [機能設計書_Search_And_Filter](../機能設計書%20_Search_And_Filter.md) | Full functional specification (v2.3) |
| [画面項目設計書_Search_And_Filter](../画面項目設計書_Search_And_Filter.md) | Screen items specification (v2.6) |
