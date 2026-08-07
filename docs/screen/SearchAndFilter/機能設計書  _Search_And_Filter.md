# 機能設計書（Search and Filter Page）

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-FDS-SEARCH-001 |
| **System** | Cosmetics Finder |
| **Module** | Search & Filter |
| **Version** | 1.0 |
| **Created** | 2026-08-05 |
| **Status** | Draft |

---

## 1. Overview

This document defines the detailed functional design for the Search and Filter page, covering frontend UI, backend API, and database interactions. The page allows buyers to search skincare products by keyword, browse by category, apply multi-dimensional filters (skin type, ingredients, price range, rating), and sort/paginate results.

---

## 2. Requirements Traceability

| Requirement ID | Description | Priority |
|---------------|-------------|----------|
| B-SEARCH-001 | User can search products by keyword | High |
| B-SEARCH-002 | User can browse products by category | High |
| B-SEARCH-003 | User can sort by price, rating, newest | High |
| B-SEARCH-004 | Results are paginated (default 20 per page) | High |
| B-SEARCH-005 | Search supports partial matching | High |
| B-SEARCH-006 | Category tree supports nested navigation | Medium |
| B-MATCH-002 | User can filter products by skin type | High |
| B-MATCH-003 | User can filter products by ingredients | Medium |
| B-MATCH-004 | User can filter products by price range | High |
| B-MATCH-005 | User can filter products by review rating | Medium |

---

## 3. API Endpoints Design

### 3.1 Endpoint Summary

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/v1/products` | Product list with search, filter, sort, pagination | Public |
| `GET` | `/api/v1/categories` | Category tree (nested navigation) | Public |
| `GET` | `/api/v1/products/:slug` | Product detail (from result click) | Public |

---

### 3.2 GET `/api/v1/products`

**Query Parameters (ProductQueryDto / SearchQueryDto):**

| Parameter | Type | Default | Constraint | Description |
|-----------|------|---------|------------|-------------|
| `q` | `string` | - | `@IsOptional()`, `@MaxLength(255)` | Keyword search (partial matching on name, tags, ingredients, short_description) |
| `categoryId` | `string` | - | `@IsOptional()`, CUID format | Filter by category (includes descendant categories) |
| `skinTypes` | `string` (comma-separated) | - | `@IsOptional()` | Filter by compatible skin types (`in` on `skin_types` array) |
| `ingredients` | `string` (comma-separated) | - | `@IsOptional()` | Filter by ingredient (`has` on `ingredients` array) |
| `tags` | `string` (comma-separated) | - | `@IsOptional()` | Filter by product tags |
| `minPrice` | `number` | - | `@IsOptional()`, `@Min(0)` | Lower price bound (`price >= minPrice`) |
| `maxPrice` | `number` | - | `@IsOptional()`, `@Min(0)` | Upper price bound (`price <= maxPrice`) |
| `rating` | `number` | - | `@IsOptional()`, `@Min(1)`, `@Max(5)` | Minimum average rating filter (`avg_rating >= rating`) |
| `sort` | `string` | `createdAt` | `@IsIn(['price', 'rating', 'createdAt'])` | Sort field |
| `order` | `string` | `desc` | `@IsIn(['asc', 'desc'])` | Sort direction |
| `page` | `number` | `1` | `@IsOptional()`, `@Min(1)` | Page number (1-indexed) |
| `limit` | `number` | `20` | `@IsOptional()`, `@Min(1)`, `@Max(100)` | Items per page (max 100) |

**Request Example:**

```
GET /api/v1/products?q=cleanser&skinTypes=oily&minPrice=10&maxPrice=50&rating=4&sort=price&order=asc&page=1&limit=20
```

**Success Response (200):**

```json
{
  "data": [
    {
      "id": "clx1234567890",
      "name": "Gentle Foaming Cleanser",
      "slug": "gentle-foaming-cleanser",
      "shortDescription": "pH-balanced cleanser for oily skin",
      "price": "29.99",
      "compareAtPrice": "39.99",
      "images": ["https://cdn.example.com/products/clx1234567890/main.webp"],
      "skinTypes": ["oily", "combination"],
      "tags": ["cleanser", "fragrance-free"],
      "avgRating": "4.5",
      "reviewCount": 128,
      "isInStock": true,
      "category": { "id": "clxcat001", "name": "Cleansers", "slug": "cleansers" }
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

**Backend Processing Flow:**

```
ProductQueryDto validated by ValidationPipe (whitelist + forbidNonWhitelisted)
  → SearchService.searchProducts(query)
    → Redis cache lookup: cache:products:list:{hashOfQuery}
      → HIT: return cached JSON (TTL 2 minutes)
      → MISS: continue to PostgreSQL
    → Build Prisma WHERE clause:
      - isActive: true (Rule 4.2.1 - only active products)
      - merchant shop approved (join shops, is_approved = true)
      - q: contains on name / shortDescription / tags / ingredients (OR, case-insensitive)
      - categoryId: category subtree (recursive parent/child lookup)
      - skinTypes: hasEvery / hasSome
      - ingredients: has
      - minPrice / maxPrice: price range
      - rating: avg_rating >= rating
    → Apply sort/order (idx_products_price, idx_products_created_at)
    → Apply skip/take pagination (page-1)*limit, limit
    → Run prisma.product.findMany({ select, skip, take, orderBy })
    → Run prisma.product.count({ where }) for total
    → Serialize Decimal price as string
    → Cache result in Redis (2 min TTL)
    → Return { data, meta }
```

**Business Rules Applied:**
- Only `is_active = true` products appear in search results (Rule 4.2.1).
- Products from unapproved shops are NOT visible to buyers (Section 12.2 of Development Rules).
- Out-of-stock products remain listed but are flagged `isInStock: false` (Rule 4.2.2).

---

### 3.3 GET `/api/v1/categories`

**Success Response (200):**

```json
{
  "data": [
    {
      "id": "clxcat001",
      "name": "Skincare",
      "slug": "skincare",
      "iconUrl": null,
      "sortOrder": 1,
      "children": [
        {
          "id": "clxcat002",
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

**Backend Processing Flow:**

```
CategoriesController.findAll() (Public)
  → CategoriesService.getTree()
    → Redis cache lookup: cache:categories
      → HIT: return cached tree (TTL 30 minutes)
      → MISS: prisma.category.findMany({ orderBy: { sortOrder: 'asc' } })
        → Build tree from parent_id self-reference
        → Seed Redis cache (30 min TTL)
    → Return { data: tree }
```

---

## 4. Frontend Design

### 4.1 Page Structure

```
frontend/src/
├── pages/
│   └── search/
│       ├── Search.tsx                  # Search & Filter page (route: /products, /search)
│       └── SearchFilters.tsx           # Filters drawer/sidebar container
├── features/search/
│   ├── components/
│   │   ├── SearchBar.tsx               # Keyword input with debounce
│   │   ├── FilterPanel.tsx             # Category tree, skin type, price, rating filters
│   │   └── SearchResults.tsx           # Result count, sort dropdown, product grid
│   ├── hooks/
│   │   └── useSearch.ts                # Search state + TanStack Query data fetching
│   └── services/
│       └── search.service.ts           # API service layer
└── features/products/
    └── components/
        └── ProductCard.tsx             # Reused result card
```

### 4.2 Route Definition (routes.tsx)

```tsx
// Search & Filter page (public)
<Route path="/products" element={<Search />} />
<Route path="/products/:slug" element={<ProductDetail />} />
```

### 4.3 URL State Contract

Filter and search state is persisted in URL query parameters (single source of truth), enabling shareable/back-button-friendly navigation:

```
/products?q=cleanser&categoryId=clxcat002&skinTypes=oily&minPrice=10&maxPrice=50&rating=4&sort=price&order=asc&page=1
```

Rules:
- URL is the single source of truth for search state (never React Context).
- `useSearchParams` (React Router) reads/writes URL; server state is fetched via TanStack Query keyed on the serialized params.
- Typing in SearchBar updates `q` after 300ms debounce (Performance section 10.3).
- Changing a filter or page replaces the URL and invalidates/refetches the query.

### 4.4 Zod Schema (search.schema.ts)

```typescript
import { z } from 'zod';

export const searchParamsSchema = z.object({
  q: z.string().max(255).optional(),
  categoryId: z.string().optional(),
  skinTypes: z.array(z.enum(['dry', 'oily', 'combination', 'sensitive', 'normal'])).optional(),
  ingredients: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  rating: z.coerce.number().min(1).max(5).optional(),
  sort: z.enum(['price', 'rating', 'createdAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;
```

### 4.5 Frontend Service Layer (search.service.ts)

```typescript
const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

export interface ProductSearchResponse {
  data: ProductSummary[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export const searchService = {
  async searchProducts(params: SearchParams): Promise<ProductSearchResponse> {
    const query = toQueryString(params);
    const response = await fetch(`${API_BASE}/products?${query}`);
    if (!response.ok) {
      const error = await response.json();
      throw new SearchError(error.message, response.status);
    }
    return response.json();
  },

  async getCategories(): Promise<CategoryNode[]> {
    const response = await fetch(`${API_BASE}/categories`);
    if (!response.ok) throw new SearchError('Failed to load categories', response.status);
    return response.json().then((res) => res.data);
  },
};
```

### 4.6 useSearch Hook (useSearch.ts)

```typescript
export function useSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const parsed = searchParamsSchema.parse(Object.fromEntries(searchParams));

  const updateParams = (patch: Partial<SearchParams>) => {
    setSearchParams(toQueryString({ ...parsed, ...patch, page: 1 }));
  };

  const productsQuery = useQuery({
    queryKey: productKeys.search(parsed),
    queryFn: () => searchService.searchProducts(parsed),
    placeholderData: keepPreviousData,
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: searchService.getCategories,
    staleTime: 30 * 60 * 1000, // aligned with Redis TTL
  });

  return { searchParams: parsed, updateParams, productsQuery, categoriesQuery };
}
```

### 4.7 UI Wireframe

```
┌────────────────────────────────────────────────────────────────────────────┐
│  Header (Luxury Purple background)                                          │
│  [🔍 Search input..........................]  [Sort ▾]                     │
├──────────────────────────┬─────────────────────────────────────────────────┤
│  FILTERS (sidebar/drawer)│  RESULTS                                        │
│  ┌────────────────────┐  │  "128 products for 'cleanser'"                   │
│  │ Categories ▾       │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │  ☐ Skincare        │  │  │Cleanser 1│ │Cleanser 2│ │Cleanser 3│         │
│  │  ☐  └ Cleansers    │  │  │★★★★☆ 4.5│ │★★★☆☆ 4.0│ │★★★★★ 4.8│         │
│  │  ☐  └ Toners       │  │  │$29.99    │ │$19.99    │ │$39.99    │         │
│  │  ☐ Makeup          │  │  │[oily]    │ │[dry]     │ │[sensitive]│        │
│  │                    │  │  └──────────┘ └──────────┘ └──────────┘         │
│  │ Skin Type          │  │                                                 │
│  │  ☐ Dry ☐ Oily      │  │                                                 │
│  │  ☐ Combination     │  │  ◄ 1 2 3 ... 8 ►  Showing 1-20 of 128           │
│  │  ☐ Sensitive       │  │                                                 │
│  │  ☐ Normal          │  └─────────────────────────────────────────────────┘
│  │                    │                                                    │
│  │ Price Range        │                                                    │
│  │  [ $10 ] ──── [ $50 ]                                                   │
│  │                    │                                                    │
│  │ Minimum Rating     │                                                    │
│  │  ★★★★★ (4.0+)     │                                                    │
│  │                    │                                                    │
│  │ [Apply] [Reset]    │                                                    │
│  └────────────────────┘                                                    │
└────────────────────────────────────────────────────────────────────────────┘
```

### 4.8 Design System Compliance (Section 9.1 - 9.6)

| Element | Token / Style |
|---------|---------------|
| Page background | `bg-background` (White) |
| Filter background | `bg-secondary` (Soft Lavender #F3E8FF) |
| Primary CTA (Apply/Search) | `bg-primary` (Luxury Purple #7C3AED) with `text-primary-foreground` |
| Rating stars | Beauty Pink accent (#EC4899), Lucide `Star` icons with half-star support |
| Sale/compare price | Compare-at price `text-muted-foreground line-through` |
| Skin type pills | `bg-secondary` pill badges (Soft Lavender), `text-sm` |
| Checkbox/radio accent | Purple focus ring (`--ring` = #7C3AED) |
| Sort dropdown | shadcn/ui `Select` with purple focus ring |
| Active pagination page | Purple active state |
| Dark mode | Semantic CSS variables only, no raw colors, no `dark:` overrides |

### 4.9 Loading / Empty / Error States

| State | UI |
|-------|----|
| Loading | Skeleton shimmer grid (shadcn `Skeleton`) with lavender background |
| Empty results | `EmptyState` component with message + illustration, "Reset Filters" button |
| Error | Inline error banner with retry button (TanStack Query `error` + `refetch`) |
| No results for filter combo | Suggestion to clear filters or broaden keyword |

---

## 5. Database Operations

### 5.1 Related Tables

| Table | Operation | Purpose |
|-------|-----------|---------|
| `products` | SELECT | Filtered product listing (is_active, category, price, rating) |
| `products` | COUNT | Total result count for pagination meta |
| `categories` | SELECT | Category tree for nested navigation |
| `shops` | SELECT (join) | Filter out products from unapproved shops |

### 5.2 Indexes Used

| Index | Usage | Purpose |
|-------|-------|---------|
| `idx_products_is_active` | Every search query | Active product filtering |
| `idx_products_category_id` | Category browsing | Category-based filtering (includes descendant traversal) |
| `idx_products_price` | Price sort/filter | Price range queries + sort |
| `idx_products_created_at` | Newest sort | `orderBy createdAt desc` |
| `idx_products_merchant_id` | Shop-approval join | Merchant lookup |
| `idx_categories_parent_id` | Tree traversal | Recursive child lookup |
| `idx_categories_slug` | Category navigation | Slug lookups |
| `idx_products_active_featured` | (Partial) Featured sorting | `WHERE is_active = TRUE` fast path |
| `idx_reviews_rating` | Rating aggregation | avg_rating maintenance |

### 5.3 Prisma Query (SearchService.searchProducts)

```typescript
const where: Prisma.ProductWhereInput = {
  isActive: true,
  merchant: { shop: { isApproved: true } },
  ...(query.q && {
    OR: [
      { name: { contains: query.q, mode: 'insensitive' } },
      { shortDescription: { contains: query.q, mode: 'insensitive' } },
      { tags: { has: query.q } },
      { ingredients: { hasSome: tokenizedKeywords(query.q) } },
    ],
  }),
  ...(query.categoryId && { categoryId: { in: await getDescendantCategoryIds(query.categoryId) } }),
  ...(query.skinTypes?.length && { skinTypes: { hasEvery: query.skinTypes } }),
  ...(query.ingredients?.length && { ingredients: { hasSome: query.ingredients } }),
  ...(query.minPrice !== undefined && { price: { gte: new Prisma.Decimal(query.minPrice) } }),
  ...(query.maxPrice !== undefined && { price: { lte: new Prisma.Decimal(query.maxPrice) } }),
  ...(query.rating !== undefined && { avgRating: { gte: new Prisma.Decimal(query.rating) } }),
};

const [products, total] = await prisma.$transaction([
  prisma.product.findMany({
    where,
    select: {
      id: true,
      name: true,
      slug: true,
      shortDescription: true,
      price: true,
      compareAtPrice: true,
      images: true,
      skinTypes: true,
      tags: true,
      avgRating: true,
      reviewCount: true,
      stockQuantity: true,
      category: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { [query.sort]: query.order },
    skip: (query.page - 1) * query.limit,
    take: query.limit,
  }),
  prisma.product.count({ where }),
]);

// Partial matching is delegated to DB ILIKE via Prisma `contains`.
// Serialize Decimal fields to string before returning (API Standard 8.3).
```

---

## 6. Performance & Caching

### 6.1 Targets (Performance Standards Section 10.3)

| Metric | Target |
|--------|--------|
| Search response time (10K records) | ≤ 3 seconds (NFR-002) |
| Autocomplete response time | ≤ 200ms |
| Filter application time | ≤ 500ms |
| Debounce delay (search input) | 300ms |
| API response time (p95) | ≤ 500ms (NFR-003) |
| Database query time | ≤ 50ms |

### 6.2 Redis Caching (Section 5 / 10.5)

| Key | Type | TTL | Invalidation |
|-----|------|-----|--------------|
| `cache:products:list:{hash}` | String (JSON) | 2 minutes | Any product mutation → `DEL` |
| `cache:categories` | String (JSON) | 30 minutes | Category mutation → `DEL` |

Rules:
- Cache-aside pattern: Check Redis → miss → query DB → seed Redis.
- List cache key is a hash of the serialized query params to support per-filter caching.
- ALWAYS set TTL. Never cache sensitive data.

---

## 7. Error Handling

### 7.1 Backend Error Format

```json
{
  "statusCode": 400,
  "message": ["limit must not be greater than 100", "rating must not be greater than 5"],
  "error": "Bad Request",
  "timestamp": "2026-08-05T12:00:00.000Z",
  "path": "/api/v1/products"
}
```

### 7.2 Frontend Error Handling

| HTTP Status | User-Friendly Message (i18n key) | Action |
|-------------|----------------------------------|--------|
| `400` | "Please check your search input" (`search.errors.invalidParams`) | Show inline validation hint |
| `401`/`403` | "You do not have permission" (`common.errors.forbidden`) | Redirect to `/login` |
| `429` | "Too many requests. Please wait" (`common.errors.rateLimited`) | Show retry countdown |
| `500` | "Something went wrong" (`common.errors.serverError`) | Show retry button |

### 7.3 Audit / Logging

- `SEARCH_EXECUTED` (warn level for slow queries > 500ms): userId (if logged in), query params, result count, duration.
- NEVER log the full response body (security).
- Use NestJS `Logger` with `[SearchService]` context. No `console.log`.

---

## 8. Testing Strategy

### 8.1 Unit Tests

| Component | Test Cases |
|-----------|------------|
| `search-query.dto.ts` | Valid params, invalid sort value, limit > 100, negative price, CUID format |
| `search.service.ts` | Keyword partial match, category subtree, skin type `hasEvery`, price range, rating filter, pagination math, inactive product exclusion, unapproved shop exclusion |
| `search.schema.ts` (Zod) | Valid/invalid query params, coercion of numbers, default values |
| `search.service.ts` (FE) | Query string building, error propagation |
| `useSearch.ts` | Debounce behavior, URL param sync, keepPreviousData |

### 8.2 Integration Tests

| Scenario | Expected Result |
|----------|-----------------|
| Search keyword matches partial product names | Matching products returned |
| Filter by category includes descendant categories | Nested products returned |
| Price range filter respects min/max boundaries | Only in-range prices returned |
| Sort by price asc/desc | Ordering verified |
| Pagination page 2 with limit 20 | Offset applied correctly, total/meta accurate |
| Inactive products excluded | Never appear in results |
| Unapproved shop products excluded | Never appear in results |
| Cache hit returns within 200ms | Redis HIT path verified |
| Product mutation invalidates list cache | Next search returns fresh data |

### 8.3 Security Tests

| Test | Expected Result |
|------|-----------------|
| SQL injection in `q` | Input sanitized (Prisma parameterized queries), no injection |
| XSS in keyword/URL params | React auto-escaping, no script execution |
| Extremely long `q` (> 255) | 400 validation error |
| Invalid CUID in `categoryId` | 400 validation error |
| Rate limit abuse on public search | 429 after threshold |

---

## 9. Implementation Checklist

### Backend (NestJS)

- [ ] `search.module.ts`, `search.controller.ts`, `search.service.ts` created
- [ ] `dto/search-query.dto.ts` with class-validator constraints
- [ ] `GET /api/v1/products` supports `q`, `categoryId`, `skinTypes`, `ingredients`, `tags`, `minPrice`, `maxPrice`, `rating`, `sort`, `order`, `page`, `limit`
- [ ] Partial keyword matching via Prisma `contains` (case-insensitive)
- [ ] Category subtree traversal (recursive parent/child)
- [ ] Active-only + approved-shop filtering enforced
- [ ] Decimal serialized as string
- [ ] Redis list cache (`cache:products:list:{hash}`, TTL 2min) + invalidation on product mutation
- [ ] Redis category cache (`cache:categories`, TTL 30min) + invalidation on category mutation
- [ ] Swagger annotations for all query parameters
- [ ] Unit + integration tests (coverage ≥ 80%)
- [ ] Rate limiting on public search endpoint

### Frontend (React)

- [ ] `pages/search/Search.tsx` and `SearchFilters.tsx` created
- [ ] `features/search/components/{SearchBar,FilterPanel,SearchResults}.tsx` created
- [ ] `features/search/hooks/useSearch.ts` created
- [ ] `features/search/services/search.service.ts` created
- [ ] URL-state driven filters (`useSearchParams`)
- [ ] 300ms debounce on keyword input
- [ ] Product grid reuses `ProductCard` (lavender cards, pink stars, purple CTAs)
- [ ] Skeleton loading, empty, and error states implemented
- [ ] Responsive: filters drawer on mobile, sidebar on desktop
- [ ] All strings use i18n keys (`search.*`, EN/MY/JA)
- [ ] Component tests with Vitest + Testing Library

---

*End of Functional Design Document (Search and Filter Page)*
