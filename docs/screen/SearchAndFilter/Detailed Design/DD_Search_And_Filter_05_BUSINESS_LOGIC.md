# DD_SEARCH_05 — Business Logic

> **Doc ID:** SKM-DD-SEARCH-05 | **Version:** 1.3 | **Status:** Released  
> **Last Updated:** 2026-10-15

> **Codebase alignment:** Aligned with `backend/src/modules/catalog/search/search.service.ts` as of 2026-10-15.

---

## 1. Overview

This document specifies the core business logic, caching strategy, filter building, and query execution implemented in `SearchService`. It also describes the frontend ad-panel behavior that consumes the ads endpoint.

- **Location:** `backend/src/modules/catalog/search/search.service.ts`

---

## 2. Core Service Methods

### 2.1 searchProducts(query)

1. **Validation:** Handled by the global `ValidationPipe` (`whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`) against `ProductQueryDto`.
2. **Logic:**
   - Compute cache key from the serialized (key-sorted) query params
   - Check Redis cache (`cache:products:list:v2:{md5}`)
   - **HIT:** Deserialize and return cached JSON
   - **MISS:**
     - Build Prisma `WHERE` clause (§3.1)
     - Build Prisma `orderBy` clause (§4.1)
     - Compute `skip`/`take` (§5.1)
     - Run `findMany` + `count` in a single `$transaction`
     - Serialize product rows (§7.1), including `shop_name` from `merchant.shopName`
     - Compute `meta` (`totalPages = Math.ceil(total / limit)`)
     - Seed Redis with TTL 120 seconds
   - Return `{ data, meta }`
3. **Transaction Boundaries:** `findMany` + `count` run in a single Prisma `$transaction`.

### 2.2 getCategoryTree()

1. **Logic:**
   - Check Redis cache (`cache:categories`)
   - **HIT:** Return cached `{ data: tree }`
   - **MISS:**
     - Query all categories ordered by `sortOrder ASC`
     - Build the tree from the `parent_id` self-reference (§8.1)
     - Seed Redis with TTL 1800 seconds
   - Return `{ data: tree }`

### 2.3 getProductBySlug(slug)

1. **Logic:**
   - `findFirst` where `slug`, `isActive = true`, and `merchant.licenseStatus = 'approved'`
   - Include `category` and `merchant`
   - If not found, throw `NotFoundException` (404)
   - Serialize Decimal fields as strings and `isInStock = stockQuantity > 0`
   - Return `{ data: productDetail }`
2. **Alias:** `findBySlug(slug)` delegates to `getProductBySlug(slug)`.

### 2.4 getAdsByPlacement(placement)

1. **Logic:**
   - Query `advertisement` where `feeSetting.placement = placement`, `approvalStatus = 'approved'`, `isActive = true`, `startsAt <= NOW()` and `expiresAt >= NOW()`, and `shop.isApproved = true`
   - Include `shop` and `feeSetting`; order by `startsAt DESC`; `take: 5`
   - Map each row to `SponsoredAdDto` (`description` from `content`, `tier = 'standard'`)
   - Return `{ data }` (empty array if no ads)
   - No Redis caching is performed for ads.

### 2.5 Cache Invalidation

- `invalidateProductCache()` — deletes all `cache:products:list:*` keys (via `redis.getClient().keys(...)`)
- `invalidateCategoryCache()` — deletes `cache:categories`

---

## 3. WHERE Clause Building

### 3.1 Search Query Filter Builder

```typescript
private async buildSearchWhere(query: ProductQueryDto): Promise<Prisma.ProductWhereInput> {
  const where: Prisma.ProductWhereInput = {
    // BR-SEARCH-012: Active products only
    isActive: true,
    // BR-SEARCH-013: Approved merchant only
    merchant: { licenseStatus: 'approved' },
  };

  // BR-SEARCH-001: Partial keyword matching (case-insensitive)
  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: 'insensitive' } },
      { shortDescription: { contains: query.q, mode: 'insensitive' } },
      { tags: { hasSome: [query.q] } },
      { ingredients: { hasSome: [query.q] } },
    ];
  }

  // BR-SEARCH-010: Category subtree (recursive descendant lookup)
  if (query.categoryId) {
    const descendantIds = await this.getCategoryDescendants(query.categoryId);
    where.categoryId = { in: descendantIds };
  }

  // BR-SEARCH-006: Skin type matching (hasEvery)
  if (query.skinTypes?.length) {
    where.skinTypes = { hasEvery: query.skinTypes };
  }

  // BR-SEARCH-007: Ingredient matching (hasSome)
  if (query.ingredients?.length) {
    where.ingredients = { hasSome: query.ingredients };
  }

  // BR-SEARCH-008: Price range bounds
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    where.price = {};
    if (query.minPrice !== undefined) where.price.gte = query.minPrice;
    if (query.maxPrice !== undefined) where.price.lte = query.maxPrice;
  }

  // BR-SEARCH-009: Rating filter
  if (query.rating !== undefined) {
    where.avgRating = { gte: query.rating };
  }

  // Tags filter
  if (query.tags?.length) {
    where.tags = { hasSome: query.tags };
  }

  return where;
}
```

### 3.2 Category Descendant Lookup

```typescript
private async getCategoryDescendants(categoryId: string): Promise<string[]> {
  const descendants: string[] = [categoryId];
  const queue = [categoryId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = await this.prisma.category.findMany({
      where: { parentId: currentId },
      select: { id: true },
    });
    for (const child of children) {
      descendants.push(child.id);
      queue.push(child.id);
    }
  }

  return descendants;
}
```

---

## 4. Sort Logic

### 4.1 OrderBy Builder

```typescript
private buildOrderBy(sort?: string, order?: string): Prisma.ProductOrderByWithRelationInput {
  // BR-SEARCH-015: Sort allowlist
  const sortFieldMap: Record<string, string> = {
    price: 'price',
    rating: 'avgRating',
    createdAt: 'createdAt',
  };

  const field = sortFieldMap[sort || 'createdAt'] || 'createdAt';
  const direction = order === 'asc' ? 'asc' : 'desc';

  return { [field]: direction };
}
```

---

## 5. Pagination Logic

### 5.1 Skip/Take Calculation

```typescript
private calculatePagination(page?: number, limit?: number) {
  const safePage = Math.max(1, page || 1);
  const safeLimit = Math.min(100, Math.max(1, limit || 20));

  return {
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
  };
}
```

### 5.2 Meta Computation

```typescript
private computeMeta(total: number, page?: number, limit?: number) {
  const safePage = page || 1;
  const safeLimit = limit || 20;
  return {
    page: safePage,
    limit: safeLimit,
    total,
    totalPages: Math.ceil(total / safeLimit),
  };
}
```

> **Effective default page size:** `calculatePagination` / `computeMeta` fall back to `20` only when `limit` is absent. The Search & Filter screen's Zod schema defaults `limit` to **12** and always sends `limit=12`, so screen-issued requests use **12**.

---

## 6. Cache Logic

### 6.1 Cache Key Generation

```typescript
private generateCacheKey(query: ProductQueryDto): string {
  const normalized = JSON.stringify(query, Object.keys(query).sort());
  const hash = createHash('md5').update(normalized).digest('hex');
  return `cache:products:list:v2:${hash}`;
}
```

### 6.2 Cache-Aside Pattern

```typescript
async searchProducts(query: ProductQueryDto): Promise<ProductListResponseDto> {
  const cacheKey = this.generateCacheKey(query);
  const cached = await this.redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached) as ProductListResponseDto;
  }

  const where = await this.buildSearchWhere(query);
  const orderBy = this.buildOrderBy(query.sort, query.order);
  const { skip, take } = this.calculatePagination(query.page, query.limit);

  const [products, total] = await this.prisma.$transaction([
    this.prisma.product.findMany({
      where, orderBy, skip, take,
      include: { category: true, merchant: { select: { shopName: true } } },
    }),
    this.prisma.product.count({ where }),
  ]);

  const data = products.map((p) => this.serializeProduct(p));
  const meta = this.computeMeta(total, query.page, query.limit);
  const result = { data, meta };

  await this.redis.set(cacheKey, JSON.stringify(result), 120);

  return result;
}
```

### 6.3 Cache Invalidation

```typescript
async invalidateProductCache(): Promise<void> {
  const client = this.redis.getClient();
  if (!client) return;
  const keys = await client.keys('cache:products:list:*');
  if (keys.length) await client.del(...keys);
}

async invalidateCategoryCache(): Promise<void> {
  await this.redis.del('cache:categories');
}
```

---

## 7. Product Serialization

### 7.1 Decimal Serialization

```typescript
private serializeProduct(product): ProductSummaryDto {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    shortDescription: product.shortDescription ?? '',
    price: product.price.toString(),                    // BR-SEARCH-018
    compareAtPrice: product.compareAtPrice?.toString() ?? null,
    images: product.images,
    skinTypes: product.skinTypes,
    tags: product.tags,
    avgRating: product.avgRating.toString(),             // BR-SEARCH-018
    reviewCount: product.reviewCount,
    isInStock: product.stockQuantity > 0,                // BR-SEARCH-014
    category: {
      id: product.category.id,
      name: product.category.name,
      slug: product.category.slug,
    },
    shop_name: product.merchant?.shopName ?? null,
  };
}
```

---

## 8. Category Tree Builder

### 8.1 Tree Construction

```typescript
private buildCategoryTree(categories): CategoryNodeDto[] {
  const map = new Map<string, CategoryNodeDto>();
  const roots: CategoryNodeDto[] = [];

  for (const cat of categories) {
    map.set(cat.id, {
      id: cat.id, name: cat.name, slug: cat.slug,
      iconUrl: cat.iconUrl, sortOrder: cat.sortOrder, children: [],
    });
  }

  for (const cat of categories) {
    const node = map.get(cat.id)!;
    if (cat.parentId && map.has(cat.parentId)) {
      map.get(cat.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
```

---

## 9. Ad Display Logic

### 9.1 Advertisement Selection (backend)

```typescript
async getAdsByPlacement(placement: AdPlacement): Promise<{ data: SponsoredAdDto[] }> {
  const now = new Date();

  const ads = await this.prisma.advertisement.findMany({
    where: {
      feeSetting: { placement },
      approvalStatus: 'approved',
      isActive: true,
      startsAt: { lte: now },
      expiresAt: { gte: now },
      shop: { isApproved: true },
    },
    include: { shop: true, feeSetting: true },
    orderBy: { startsAt: 'desc' },
    take: 5,
  });

  const data: SponsoredAdDto[] = ads.map((ad) => ({
    id: ad.id,
    placement: ad.feeSetting?.placement ?? '',
    title: ad.title,
    announcementMessage: ad.announcementMessage,
    description: ad.content,
    imageUrl: ad.imageUrl,
    sku: ad.sku,
    tier: 'standard',
    approvalStatus: ad.approvalStatus,
    startsAt: ad.startsAt,
    expiresAt: ad.expiresAt,
  }));

  return { data };
}
```

**Selection algorithm:**

1. Query advertisements whose fee-setting placement equals the requested `placement`.
2. Require `approval_status = 'approved'` and `is_active = true`.
3. Require the current time to be within the inclusive window: `starts_at <= NOW() <= expires_at`.
4. Require the linked shop to have `shop.is_approved = true`.
5. Order by `starts_at DESC` and return at most **5** rows (`take: 5`). If fewer than 5 eligible ads exist, return all of them.
6. The response is **not cached**; each request re-queries the database.

### 9.2 Ad Slide Panel Behavior (frontend)

The `SponsoredAdSlider` panel renders below the full-width search bar and above the filter chips and filters/results row:

1. **Mount:** Fetch `GET /api/v1/search/ads?placement=search_page_banner` in parallel with product results via `useSponsoredAds('search_page_banner')`.
2. **Client-side eligibility filter:** keep only ads where `placement === 'search_page_banner'`, `approvalStatus === 'approved'`, and the current time is within `[startsAt, expiresAt]`.
3. **Fallback:** when no eligible ads remain and the request is not pending/errored, render the built-in `FALLBACK_ADS` set.
4. **Auto-slide:** advance every `AUTO_SLIDE_MS = 5000`; pauses while the panel is hovered or keyboard-focused, and when `prefers-reduced-motion: reduce` matches.
5. **Product hydration:** ad titles/descriptions may be hydrated from the linked `sku` via `useAdProducts`, which calls `GET /api/v1/products/:sku` (`getDetail`).
6. **Click-through:** `/buyer/products/{sku}` when a SKU exists, else `fallbackProductId`, else `ad.target_url` / `ad.linkUrl`, else `/buyer/products`; external `http(s)` URLs open via `window.location.assign`.
7. **Graceful degradation:** hides (`return null`) when there are no ads; ad failure never blocks product results.
8. **Images:** fall back in order product image → ad image → sample image → placeholder.

---

## 10. Rate Limiting Logic

A global `RateLimitInterceptor` adds rate-limit headers (see DD_SEARCH_03 §4). It does not reject requests and there is no search-specific throttle.

```typescript
const DEFAULT_CONFIG = { windowMs: 15 * 60 * 1000, maxRequests: 100 };
const STRICT_CONFIG  = { windowMs: 15 * 60 * 1000, maxRequests: 10 }; // /auth/login, /auth/register
```

Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `X-RateLimit-Policy`.

---

## 11. Validation Rules

### 11.1 Search Query Validation

| Field | Rule | Error Message |
|-------|------|---------------|
| `q` | Optional, max 255 chars | "Keyword must be 255 characters or fewer" |
| `categoryId` | Optional, valid UUID | "Invalid category ID" |
| `skinTypes` | Optional, valid enum values | "Invalid skin type" |
| `ingredients` | Optional, array of strings (max 50) | (array/string constraints) |
| `tags` | Optional, array of strings (max 20) | (array/string constraints) |
| `minPrice` | Optional, ≥ 0 | "Minimum price must be 0 or more" |
| `maxPrice` | Optional, ≥ 0 | "Maximum price must be 0 or more" |
| `minPrice` ≤ `maxPrice` | Frontend-only (Zod `.refine` / `validatePriceRange`) | "Minimum price cannot exceed maximum price" |
| `rating` | Optional, 1–5 | "Rating must be between 1 and 5" |
| `sort` | Optional, price/rating/createdAt | "Invalid sort field" |
| `order` | Optional, asc/desc | "Invalid sort direction" |
| `page` | Optional, ≥ 1 | "Page must be at least 1" |
| `limit` | Optional, 1–100 | "Limit must be between 1 and 100" |

---

## 12. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_SEARCH_03](./DD_Search_And_Filter_03_API_ENDPOINTS.md) | Endpoint routing to these methods |
| [DD_SEARCH_04](./DD_Search_And_Filter_04_DTOS_AND_TYPES.md) | DTO definitions used in validation |
| [DD_SEARCH_06](./DD_Search_And_Filter_06_TEST_SPEC.md) | Test specification (synced to PCL scenario IDs) |
| [SearchAndFilter_PCL](../SearchAndFilter_PCL.md) | Program checklist (scenario IDs N / A / B / I) |
| [機能設計書_Search_And_Filter](../機能設計書%20_Search_And_Filter.md) | Full functional specification (v2.3) |
| [画面項目設計書_Search_And_Filter](../画面項目設計書_Search_And_Filter.md) | Screen items specification (v2.6) |
| [Requirement Spec](../../core-work/要件定義書_REQUIREMENT_SPEC.md) | Source business rules |
