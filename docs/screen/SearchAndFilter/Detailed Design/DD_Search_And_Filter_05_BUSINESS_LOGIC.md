# DD_SEARCH_05 — Business Logic

> **Doc ID:** SKM-DD-SEARCH-05 | **Version:** 1.2 | **Status:** Released  
> **Last Updated:** 2026-08-25

---

## 1. Overview

This document specifies the core business logic, caching strategy, filter building, and query execution implemented in the `SearchService`.

- **Location:** `src/modules/products/search.service.ts`

---

## 2. Core Service Methods

### 2.1 searchProducts(query)

1. **Validation:** Handled by `ProductQueryDto` with class-validator (whitelist + forbidNonWhitelisted).
2. **Logic:**
   - Compute cache key from serialized query params
   - Check Redis cache (`cache:products:list:{hash}`)
   - **HIT:** Deserialize and return cached JSON (TTL 2 min)
   - **MISS:**
     - Build Prisma `WHERE` clause (Sec 3.1)
     - Build Prisma `orderBy` clause (Sec 4.1)
     - Run `findMany` + `count` in a transaction
     - Serialize Decimal fields (`price`, `compareAtPrice`, `avgRating`) as strings
     - Compute `isInStock` from `stock_quantity > 0`
     - Compute `totalPages = Math.ceil(total / limit)`
     - Seed Redis with TTL 2 min
   - Return `{ data, meta }`
3. **Transaction Boundaries:** `findMany` + `count` run in a single Prisma transaction

### 2.2 getCategoryTree()

1. **Logic:**
   - Check Redis cache (`cache:categories`)
   - **HIT:** Return cached tree (TTL 30 min)
   - **MISS:**
     - Query all categories ordered by `sortOrder ASC`
     - Build tree from `parent_id` self-reference (Sec 3.3)
     - Seed Redis with TTL 30 min
   - Return `{ data: tree }`

### 2.3 getProductBySlug(slug)

1. **Logic:**
   - Find product by `slug` where `is_active = true`
   - Join with `shops` where `is_approved = true` AND `merchants` where `license_status = 'approved'` (BR-SEARCH-013)
   - If not found, return 404 NOT_FOUND
   - Serialize Decimal fields as strings
   - Return `{ data: productDetail }`

### 2.4 getAdsByPlacement(placement)

1. **Logic:**
   - Check Redis cache (`cache:ads:{placement}`)
   - **HIT:** Return cached ads (TTL 5 min)
   - **MISS:**
     - Query `advertisements` where `approval_status = 'approved'`
     - Filter: `starts_at <= NOW()` AND `expires_at >= NOW()`
     - Join with `shops` where `is_approved = true` AND `merchants` where `license_status = 'approved'` (BR-SEARCH-013)
     - Order by tier priority → round-robin within tier (Sec 4.3, REQ §5.3)
     - Cap at maximum 5 ads (BR-SEARCH-026)
     - Seed Redis with TTL 5 min (BR-SEARCH-028)
   - Return `{ data: ads }` (empty array if no ads)

---

## 3. WHERE Clause Building

### 3.1 Search Query Filter Builder

```typescript
private buildSearchWhere(query: ProductQueryDto) {
  const where: Prisma.ProductWhereInput = {
    // BR-SEARCH-012: Active products only
    isActive: true,
    // BR-SEARCH-013: Approved merchant/shop only (REQ §2.4, DEV §12.2)
    shop: {
      isApproved: true,
      merchant: { licenseStatus: 'approved' },
    },
  };

  // BR-SEARCH-001: Partial keyword matching
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
    const currentId = queue.shift();
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
private buildOrderBy(sort: string, order: string): Prisma.ProductOrderByWithRelationInput {
  // BR-SEARCH-015: Sort allowlist
  const sortFieldMap: Record<string, string> = {
    price: 'price',
    rating: 'avgRating',
    createdAt: 'createdAt',
  };

  const field = sortFieldMap[sort] || 'createdAt';
  const direction = order === 'asc' ? 'asc' : 'desc';

  return { [field]: direction };
}
```

---

## 5. Pagination Logic

### 5.1 Skip/Take Calculation

```typescript
private calculatePagination(page: number, limit: number) {
  // BR-SEARCH-016: Defaults
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
private computeMeta(total: number, page: number, limit: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
```

---

## 6. Cache Logic

### 6.1 Cache Key Generation

```typescript
private generateCacheKey(query: ProductQueryDto): string {
  const normalized = JSON.stringify(query, Object.keys(query).sort());
  const hash = createHash('md5').update(normalized).digest('hex');
  return `cache:products:list:${hash}`;
}
```

### 6.2 Cache-Aside Pattern

```typescript
async searchProducts(query: ProductQueryDto): Promise<ProductListResponseDto> {
  const cacheKey = this.generateCacheKey(query);

  // Check Redis
  const cached = await this.redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Query DB
  const where = this.buildSearchWhere(query);
  const orderBy = this.buildOrderBy(query.sort, query.order);
  const { skip, take } = this.calculatePagination(query.page, query.limit);

  const [products, total] = await this.prisma.$transaction([
    this.prisma.product.findMany({ where, orderBy, skip, take, include: { category: true } }),
    this.prisma.product.count({ where }),
  ]);

  // Serialize
  const data = products.map(this.serializeProduct);
  const meta = this.computeMeta(total, query.page, query.limit);
  const result = { data, meta };

  // Seed Redis (2 min TTL)
  await this.redis.setex(cacheKey, 120, JSON.stringify(result));

  return result;
}
```

### 6.3 Cache Invalidation

```typescript
async invalidateProductCache(): Promise<void> {
  const keys = await this.redis.keys('cache:products:list:*');
  if (keys.length) await this.redis.del(...keys);
}

async invalidateCategoryCache(): Promise<void> {
  await this.redis.del('cache:categories');
}

async invalidateAdCache(placement: string): Promise<void> {
  await this.redis.del(`cache:ads:${placement}`);
}
```

---

## 7. Product Serialization

### 7.1 Decimal Serialization

```typescript
private serializeProduct(product: Product): ProductSummaryDto {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    shortDescription: product.shortDescription,
    price: product.price.toString(),          // BR-SEARCH-018
    compareAtPrice: product.compareAtPrice?.toString() ?? null,
    images: product.images,
    skinTypes: product.skinTypes,
    tags: product.tags,
    avgRating: product.avgRating.toString(),   // BR-SEARCH-018
    reviewCount: product.reviewCount,
    isInStock: product.stockQuantity > 0,      // BR-SEARCH-014
    category: {
      id: product.category.id,
      name: product.category.name,
      slug: product.category.slug,
    },
  };
}
```

---

## 8. Category Tree Builder

### 8.1 Tree Construction

```typescript
private buildCategoryTree(categories: Category[]): CategoryNodeDto[] {
  const map = new Map<string, CategoryNodeDto>();
  const roots: CategoryNodeDto[] = [];

  // Initialize nodes
  for (const cat of categories) {
    map.set(cat.id, {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      iconUrl: cat.iconUrl,
      sortOrder: cat.sortOrder,
      children: [],
    });
  }

  // Build tree
  for (const cat of categories) {
    const node = map.get(cat.id);
    if (cat.parentId && map.has(cat.parentId)) {
      map.get(cat.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
```

---

## 9. Ad Display Logic

### 9.1 Ad Filtering and Ordering

```typescript
private async getActiveAds(placement: string): Promise<SponsoredAdDto[]> {
  const now = new Date();

  const ads = await this.prisma.advertisement.findMany({
    where: {
      placement,
      approvalStatus: 'approved',
      startsAt: { lte: now },
      expiresAt: { gte: now },
      shop: {
        isApproved: true,
        merchant: { licenseStatus: 'approved' },
      },
    },
    orderBy: [
      // BR-SEARCH-026: Tier priority (Premium > Standard > Basic)
      { tier: 'asc' },        // premium < standard < basic
    ],
    include: { shop: true },
  });

  // BR-SEARCH-026 (REQ §5.3): Round-robin rotation within the same tier.
  // The slider renders a maximum of 5 ads, rotating automatically every 5 seconds;
  // the starting offset rotates per request so each ad receives impressions.
  // Capped at 5 ads maximum (BR-SEARCH-026).
  const capped = ads.slice(0, 5);
  return this.roundRobinWithinTier(capped).map(this.serializeAd);
}
```

### 9.2 Ad Slide-Down Panel Behavior

The `slotAdTop` sponsored ad panel renders between the page header ([A]) and the search bar + filters row ([B]+[C]):

1. **Mount:** Fetch `GET /api/v1/ads?placement=search_top` in parallel with product results.
2. **Slide-down entrance:** If ads exist, panel slides down (height 0 → auto, translateY −100% → 0, 300ms ease-out, once per mount), pushing [B]+[C] and results down.
3. **Auto-slide:** Vertical slide-down transition every 5 seconds (500ms ease-in-out). Max 5 slides, loops.
4. **Responsive:** Desktop/tablet (≥ 768px): horizontal layout (image left, text right). Mobile (< 768px): stacked (image top, content below). CSS-only switching — no refetch, no rotation reset.
5. **Pause on interaction:** Auto-advancement pauses on hover/keyboard focus; resumes on leave/blur (WCAG 2.2.2).
6. **`prefers-reduced-motion: reduce`:** Disables entrance/slide animations; 5-second interval unchanged.
7. **Error handling:** On fetch error or empty response, panel is entirely hidden — graceful degradation; ad failure never blocks product results.
8. **Accessibility:** `role="region"` + `aria-label` (`search.sponsored.panelLabel`). Slide changes announced via `aria-live="polite"` (`search.sponsored.slideStatus`). Images carry `alt` from `search.sponsored.adAlt`. CTA is a focusable link with visible primary focus ring.

---

## 10. Rate Limiting Logic

### 10.1 Rate Limit Configuration

```typescript
const RATE_LIMIT_CONFIG = {
  products: { limit: 60, window: 60 },   // 60 requests per minute
  productDetail: { limit: 60, window: 60 },
};
```

### 10.2 Rate Limit Check

```typescript
async checkRateLimit(key: string, limit: number, window: number): Promise<boolean> {
  const redisKey = `rate:search:${key}`;
  const current = await this.redis.incr(redisKey);

  if (current === 1) {
    await this.redis.expire(redisKey, window);
  }

  return current <= limit;
}
```

---

## 11. Validation Rules

### 11.1 Search Query Validation

| Field | Rule | Error Message |
|-------|------|---------------|
| `q` | Optional, max 255 chars | "Keyword must be 255 characters or fewer" |
| `categoryId` | Optional, valid UUID | "Invalid category ID" |
| `skinTypes` | Optional, valid enum values | "Invalid skin type" |
| `ingredients` | Optional, array of strings | "Invalid ingredients" |
| `minPrice` | Optional, ≥ 0 | "Minimum price must be 0 or more" |
| `maxPrice` | Optional, ≥ 0 | "Maximum price must be 0 or more" |
| `minPrice` ≤ `maxPrice` | Cross-field: min ≤ max | "Minimum price cannot exceed maximum price" |
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
| [DD_SEARCH_06](./DD_Search_And_Filter_06_TEST_SPEC.md) | Test specification |
| [機能設計書_Search_And_Filter](../機能設計書%20_Search_And_Filter.md) | Full functional specification (v2.3) |
| [画面項目設計書_Search_And_Filter](../画面項目設計書_Search_And_Filter.md) | Screen items specification (v2.6) |
| [Requirement Spec](../../core-work/要件定義書_REQUIREMENT_SPEC.md) | Source business rules |
