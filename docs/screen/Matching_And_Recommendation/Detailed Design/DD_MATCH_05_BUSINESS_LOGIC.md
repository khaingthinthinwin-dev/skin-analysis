# DD_MATCH_05 — Business Logic

> **Doc ID:** SKM-DD-MATCH-05 | **Version:** 1.1 | **Status:** Released  
> **Last Updated:** 2026-10-15 (code reconciliation)

> **Source update (2026-10-15):** Current service is `backend/src/modules/buyer/matching/matching.service.ts`. It uses SHA-256 (not MD5) for cache keys, adds rating/category to cache inputs, supports `rating` sorting, and globally sorts scored results before pagination. User-facing default is Newest; generic `matchScore` falls back to Newest. The page uses shared `AdBannerSlider`; the ad rotation algorithm below is not part of this service.

---

## 1. Overview

This document specifies the core business logic for the Matching & Recommendation module, including the matching algorithm, source determination, caching strategy, recommendation history management, and ad rotation.

- **Location:** `backend/src/modules/buyer/matching/matching.service.ts`; sponsored-ad behavior belongs to the shared ads feature.

---

## 2. Core Service Methods

### 2.1 getPersonalized(userId, query)

1. **Determine Source:** Check buyer's latest completed AI analysis.
   - If analysis exists (regardless of age) → `source = "ai"` (stale analysis > 24h still uses AI scores; UI shows subtle prompt banner)
   - If no analysis exists → `source = "generic"`
2. **Build Context:** Extract `skinTypes` and `skinConcerns` from analysis (or empty for generic).
3. **Resolve Effective Skin Types (custom dual rule):** The `skinTypes=all` sentinel means "no selection" and is stripped. An explicit `skinTypes` filter **overrides** the analysis-derived types for the `hasSome` clause (BR-MATCH-006); on the `ai` source an additional `AND` clause requires products to remain compatible with at least one analysed type, and products tagged `all` satisfy either condition via `{ skinTypes: { has: 'all' } }`.
4. **Additional filters:** `rating` (1–5) → `avgRating gte`; `categoryId`/`category` → `getCategoryDescendants()` (self + all nested children) → `categoryId in [...]`; `ingredients` CSV → display-name mapping (`INGREDIENT_KEY_MAP`) → `hasSome`.
5. **Redis Lookup:** Check cache key `cache:recommendations:user:{userId}:{sha256(normalizedFilters)}` (sorted skinTypes, ingredients, min/max/rating, categoryId, sort, order, page, limit).
   - HIT → return cached response
   - MISS → continue
6. **Build Prisma WHERE:** `isActive` + approved merchant chain + skin-type conditions + filters above.
7. **Effective sort:** `sort` absent → `matchScore` for `ai`, DB default (`isFeatured desc, avgRating desc`) for `generic`; a stale `matchScore` on `generic` is coerced to `createdAt desc`.
8. **Fetch & order:** DB `orderBy` for `price`/`rating`/`createdAt`; for `matchScore` the full match set is fetched (no `skip`/`take`), scored in memory, sorted globally, then sliced to the requested page.
9. **Compute Match Scores:** Only when `source = "ai"`; generic products get `matchScore: null`.
10. **Count Total:** `prisma.product.count({ where })` ignoring pagination; `totalPages = ceil(total / limit)`.
11. **Seed Redis:** `redis.set(key, json, 300)`.
12. **Return:** `{ data, meta, source, analysisAge, skinTypes }`.

### 2.2 getSimilar(productId, limit)

1. **Lookup Source Product:** `findUnique` including `merchant.shopName`. If it does not exist → return `{ data: [], meta: { page: 1, limit, total: 0, totalPages: 0 }, source: null }` (HTTP 200 — this service never throws 404).
2. **Build WHERE:** `isActive` + approved merchant + same `categoryId` + `id not productId` + (when the source declares skin types) `skinTypes hasSome source.skinTypes`.
3. **Fetch:** `findMany({ where, take: limit, orderBy: { createdAt: 'desc' } })` plus `count({ where })` in parallel.
4. **Map:** `RecommendationResultDto` with `brandName` from the merchant and `matchScore: null`.
5. **Return:** `{ data, meta: { page: 1, limit, total, totalPages }, source: null }`.

### 2.3 getHistory(userId, page, limit)

1. **Query:** `prisma.skinAnalysis.findMany({ where: { userId, analysisStatus: 'completed', completedAt: { not: null } }, include: { conditions: true, recommendations: { include: { product: { include: { merchant: { include: { user: { include: { shop: true } } } } } } }, orderBy: { displayOrder: 'asc' } } }, orderBy: { completedAt: 'desc' }, skip, take })` with `count` in parallel.
2. **Map sessions:** `sessionId = analysis.id`, `sessionDate = completedAt.toISOString()`, `skinTypesUsed = [analysis.skinType]` (raw string, not comma-split).
3. **Filter products:** Keep only `product.isActive && merchant.user.shop.isApproved`; recompute `matchScore` with the same `computeMatchScore` formula (first analysed skin type + condition names), sort descending.
4. **Return:** `{ data, meta: { page, limit, total, totalPages } }`.

---

## 3. Matching Algorithm

### 3.1 Match Score Computation

Score = Skin Type Compatibility (50) + Skin Concern Match (20) + Average Rating (20) + Featured Boost (10)

```typescript
function computeMatchScore(
  product: Product,
  userSkinType: string,
  userConcerns: string[]
): ScoreComponents {
  // BR-MATCH-009: Skin Type Compatibility (0–50)
  // `userSkinType` is the scoring type: the first explicitly requested filter
  // type, falling back to the analysis's first type (see getPersonalized).
  let skinTypeScore = 0;
  if (userSkinType && product.skinTypes.includes(userSkinType)) {
    skinTypeScore = 50; // Primary match
  } else if (product.skinTypes.length > 0) {
    skinTypeScore = 30; // Secondary match (product declares any skin types)
  }

  // BR-MATCH-010: Concern Matching (0–20)
  const matchedConcerns = userConcerns.filter(concern =>
    product.tags?.includes(concern) ||
    product.ingredients?.some(ing => ing.toLowerCase().includes(concern.toLowerCase()))
  );
  const concernScore = Math.min(20, matchedConcerns.length * 10);

  // BR-MATCH-011: Rating Factor (0–20)
  const rating = parseFloat(product.avgRating);
  let ratingScore = 0;
  if (rating >= 4.5) ratingScore = 20;
  else if (rating >= 4.0) ratingScore = 15;
  else if (rating >= 3.0) ratingScore = 10;
  else ratingScore = 0;

  // BR-MATCH-012: Featured Boost (0–10)
  const featuredBoost = product.isFeatured ? 10 : 0;

  const total = skinTypeScore + concernScore + ratingScore + featuredBoost;

  return { skinTypeScore, concernScore, ratingScore, featuredBoost, total };
}
```

### 3.2 Score Validation

- Score range: 0–100 (integer)
- All components non-negative
- Score only computed when `source = "ai"`; generic results and similar products return `matchScore: null`
- `getHistory` reuses the same formula (first analysed skin type + condition names) so history percentages match the recommendations page

---

## 4. Caching Strategy

### 4.1 Cache-Aside Pattern

```typescript
// Redis key format — full SHA-256 of the normalized filter JSON (see §4.3)
const cacheKey = `cache:recommendations:user:${userId}:${sha256(paramsJson)}`;

// TTL: 5 minutes (BR-MATCH-029)
const CACHE_TTL = 5 * 60; // seconds

// Lookup
async function getCachedRecommendations(key: string): Promise<RecommendationResponseDto | null> {
  const cached = await redis.get(key);
  if (!cached) return null;
  try { return JSON.parse(cached); } catch { return null; }
}

// Seed
async function seedCache(key: string, data: RecommendationResponseDto): Promise<void> {
  await redis.set(key, JSON.stringify(data), CACHE_TTL);
}
```

### 4.2 Cache Invalidation

- **On New Analysis:** Invalidate all cache keys matching `cache:recommendations:user:{userId}:*`
- **On Product Update:** No automatic invalidation (TTL handles stale data)
- **On Ad Update:** No cache invalidation (ads are not cached in recommendation cache)

### 4.3 Cache Key Design

```
cache:recommendations:user:{userId}:{sha256(paramsJson)}
```

The JSON covers **every** input that changes the result set: sorted `skinTypes` CSV (so `oily,dry` ≡ `dry,oily`, and the `all` sentinel is normalized away), `ingredients`, `minPrice`, `maxPrice`, `rating`, `categoryId`, `sort`, `order`, `page`, `limit`. The digest is a **full SHA-256 — never truncated** — so long filter JSON cannot drop the trailing `page`/`limit` fields and make every page collide on one key. The `user:` prefix also enables pattern-based invalidation (`invalidateUserCache(userId)` → `redis.keys` + `del`).

---

## 5. Source Determination Logic

### 5.1 Analysis Freshness Check

```typescript
async function determineSource(userId: string): Promise<PersonalizationContext> {
  const latestAnalysis = await prisma.skinAnalysis.findFirst({
    where: { userId, analysisStatus: 'completed', completedAt: { not: null } },
    orderBy: { completedAt: 'desc' },
    include: { conditions: true },
  });

  if (!latestAnalysis) {
    return { source: 'generic', analysisId: null, skinTypes: [], skinConcerns: [], analysisAge: null };
  }

  const analysisAge = (Date.now() - latestAnalysis.completedAt.getTime()) / (1000 * 60 * 60);

  // Any age → source = 'ai' with match scores (BR-MATCH-001). The 24h threshold
  // is purely a UI concern (subtle "Want Fresh Results?" banner, BR-MATCH-004).
  return {
    source: 'ai',
    analysisId: latestAnalysis.id,
    skinTypes: latestAnalysis.skinType.split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
    skinConcerns: latestAnalysis.conditions.map(c => c.conditionName),
    analysisAge,
  };
}
```

### 5.2 Stale Analysis Handling

- Analysis > 24h old → still `source = "ai"` with match scores (BR-MATCH-001)
- UI shows "🧬 AI Analysis" badge, match score badges on cards
- UI shows subtle "Want Fresh Results?" prompt banner (BR-MATCH-004)
- Skin type filters pre-selected from analysis
- History section still shows stale sessions

---

## 6. Ad Rotation Logic

### 6.1 Eligible Advertisement Filter

```typescript
// BR-MATCH-037 — camelCase Prisma fields; selection (rotation/slice) happens after
const found = await prisma.advertisement.findMany({
  where: {
    isActive: true,
    approvalStatus: 'approved',
    paymentStatus: 'completed',
    startsAt: { lte: now },
    expiresAt: { gt: now },
    // For placements ending in `_banner` (e.g. recommendation_page_banner):
    ...(isBannerPlacement ? { feeSetting: { placement, isActive: true } } : {}),
  },
  include: {
    feeSetting: { select: { placement: true, tier: true, isActive: true } },
    shop: { select: { id: true, name: true, userId: true } },
  },
  orderBy: [
    { paymentAmount: 'desc' }, // BR-MATCH-051
    { createdAt: 'desc' },
  ],
});
// then: sessionId + Redis → rotateAds(); else found.slice(0, 5) — BR-MATCH-049
```

### 6.2 Round-Robin Rotation

```typescript
// BR-MATCH-050: Session-based round-robin among equal-priority ads
async function rotateAds(
  ads: Advertisement[],
  sessionId: string,
  placement: string
): Promise<Advertisement[]> {
  if (ads.length <= 1) return ads;

  // Group by payment_amount tier
  const tiers = groupByTier(ads);

  // Get or create rotation index in Redis
  const redisKey = `ad_rotation:${sessionId}:${placement}`;
  const currentIndex = await redis.get(redisKey) || 0;

  // Select ad from each tier using round-robin
  const selected: Advertisement[] = [];
  for (const tier of tiers) {
    const index = (currentIndex as number) % tier.length;
    selected.push(tier[index]);
  }

  // Increment index (circular)
  const nextIndex = ((currentIndex as number) + 1) % Math.max(...tiers.map(t => t.length));
  await redis.setex(redisKey, 24 * 60 * 60, nextIndex.toString()); // TTL 24h

  return selected;
}
```

### 6.3 Fallback

- Rotation only runs when a `sessionId` is supplied and Redis is available; otherwise the first 5 of the payment-ordered list are returned (deterministic, non-rotating)
- If Redis errors mid-rotation, the service logs a warning and falls back to the same deterministic top-5 slice
- Any failure in `getAdsByPlacement` is caught and yields `200 OK` with empty `data` and zeroed `meta`

---

## 7. Visibility Rules

### 7.1 Active Products Only (BR-MATCH-021)

```typescript
where: { is_active: true }
```

### 7.2 Approved Shop Only (BR-MATCH-022)

```typescript
where: {
  shops: { is_approved: true }
}
```

### 7.3 Out-of-Stock Still Listed (BR-MATCH-023)

- Out-of-stock products remain in results
- Flagged as `isInStock: false` in response
- Display "Out of Stock" badge on card

---

## 8. Sorting Rules

### 8.1 Default Sort (BR-MATCH-024)

| Source | Default Sort |
|--------|-------------|
| `ai` | `matchScore desc` |
| `generic` | `is_featured desc, then avg_rating desc` |
| `similar` | `createdAt desc` |

### 8.2 Sort Allowlist (BR-MATCH-025)

- `sort` ∈ {`matchScore`, `price`, `createdAt`}
- `order` ∈ {`asc`, `desc`}
- Invalid values rejected with 400 BAD_REQUEST

---

## 9. Pagination Rules

### 9.1 Defaults (BR-MATCH-026)

- `page` defaults to 1
- `limit` defaults to 20
- `limit` maximum 50

### 9.2 Result Counting (BR-MATCH-027)

- `total` counts full match set ignoring pagination (`skip`/`take`)
- `totalPages` = `ceil(total / limit)`

### 9.3 Decimal Serialization (BR-MATCH-028)

- `price`, `compare_at_price`, `avg_rating` serialized as strings in response

---

## 10. Validation Rules

### 10.1 Personalized Query Validation

| Field | Rule | Error |
|-------|------|-------|
| `skinTypes` | Optional, valid enum values | "Invalid skin type" |
| `ingredients` | Optional, array of strings | "Invalid ingredients" |
| `minPrice` | Optional, ≥ 0 | "Minimum price must be 0 or more" |
| `maxPrice` | Optional, ≥ 0 | "Maximum price must be 0 or more" |
| `sort` | Optional, matchScore/price/createdAt | "Invalid sort field" |
| `order` | Optional, asc/desc | "Invalid sort direction" |
| `page` | Optional, ≥ 1 | "Page must be at least 1" |
| `limit` | Optional, 1–50 | "Limit must be between 1 and 50" |

### 10.2 Enforcement Layers

1. **Frontend:** Zod schema (`matchQuerySchema` in `frontend/src/schemas/matching.schema.ts`)
2. **Backend:** NestJS ValidationPipe + class-validator DTOs
3. **Database:** Prisma indexes and CHECK constraints

---

## 11. Audit / Logging

| Event | Data Logged | Retention |
|-------|-------------|-----------|
| `RECOMMENDATION_EXECUTED` (warn for slow > 500ms) | userId, source, filters, result count, duration | 30 days |
| `RECOMMENDATION_SOURCE_EMPTY` (info) | userId, reason (no analysis) | 30 days |

Rules:
- NEVER log full response body (security)
- NEVER log skin analysis image data or personal health data
- Use NestJS `Logger` with `[MatchingService]` context
- No `console.log` in production

---

## 12. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_MATCH_03](./DD_MATCH_03_API_ENDPOINTS.md) | Endpoint routing to these methods |
| [DD_MATCH_04](./DD_MATCH_04_DTOS_AND_TYPES.md) | DTO definitions used in validation |
| [DD_MATCH_06](./DD_MATCH_06_TEST_SPEC.md) | Test specification |
| [Requirement Spec](../../core-work/要件定義書_REQUIREMENT_SPEC.md) | Source business rules |
