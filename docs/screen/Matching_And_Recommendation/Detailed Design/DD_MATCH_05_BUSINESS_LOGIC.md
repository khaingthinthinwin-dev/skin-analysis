# DD_MATCH_05 — Business Logic

> **Doc ID:** SKM-DD-MATCH-05 | **Version:** 1.0 | **Status:** Released  
> **Last Updated:** 2026-09-01

---

## 1. Overview

This document specifies the core business logic for the Matching & Recommendation module, including the matching algorithm, source determination, caching strategy, recommendation history management, and ad rotation.

- **Location:** `src/modules/recommendations/matching.service.ts` and `src/modules/ads/ad.service.ts`

---

## 2. Core Service Methods

### 2.1 getPersonalized(userId, query)

1. **Determine Source:** Check buyer's latest completed AI analysis.
   - If analysis exists and `completed_at` ≤ 24h ago → `source = "ai"`
   - Otherwise → `source = "generic"`
2. **Build Context:** Extract `skinTypes` and `skinConcerns` from analysis (or empty for generic).
3. **Resolve Effective Skin Types:** If user explicitly sets `skinTypes` filter, override analysis-derived types (BR-MATCH-006).
4. **Redis Lookup:** Check cache key `cache:recommendations:user:{userId}:{hashOfQuery}`.
   - HIT → return cached result (≤200ms)
   - MISS → continue
5. **Build Prisma WHERE:** Active products + approved shop + skin types (`hasSome`) + filters.
6. **Fetch Candidates:** `prisma.product.findMany({ where, skip, take, orderBy })`.
7. **Compute Match Scores:** For each candidate, compute score (only when `source = "ai"`).
8. **Sort:** By `matchScore desc` (ai), or `is_featured desc, avg_rating desc` (generic).
9. **Count Total:** `prisma.product.count({ where })` ignoring pagination.
10. **Seed Redis:** Cache result with TTL 5 minutes.
11. **Return:** `{ data, meta, source }`.

### 2.2 getSimilar(productId, limit)

1. **Validate Product:** Check product exists and is active.
2. **Get Source Product:** Fetch product with `category_id` and `skin_types`.
3. **Build WHERE:** Same category + at least one overlapping skin type + active + approved shop + exclude source product.
4. **Fetch:** `prisma.product.findMany({ where, take: limit, orderBy: { createdAt: 'desc' } })`.
5. **Return:** `{ data, meta, source: null }`.

### 2.3 getHistory(userId, page, limit)

1. **Query:** `prisma.skinAnalysis.findMany({ where: { userId }, include: { recommendations: true }, orderBy: { completedAt: 'desc' }, skip, take })`.
2. **Group:** By analysis session (each `skin_analyses` row is a session).
3. **Count Total:** `prisma.skinAnalysis.count({ where: { userId } })`.
4. **Return:** `{ data, meta }`.

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
  let skinTypeScore = 0;
  if (product.skinTypes.includes(userSkinType)) {
    skinTypeScore = 50; // Primary match
  } else if (product.skinTypes.some(st => st !== userSkinType)) {
    skinTypeScore = 30; // Secondary match (different type exists)
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
- Score only computed when `source = "ai"`; generic results return `matchScore: null`

---

## 4. Caching Strategy

### 4.1 Cache-Aside Pattern

```typescript
// Redis key format
const cacheKey = `cache:recommendations:user:${userId}:${hashOfQuery}`;

// TTL: 5 minutes (BR-MATCH-029)
const CACHE_TTL = 5 * 60; // seconds

// Lookup
async function getCachedRecommendations(key: string): Promise<CachedRecommendation | null> {
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
}

// Seed
async function seedCache(key: string, data: CachedRecommendation): Promise<void> {
  await redis.setex(key, CACHE_TTL, JSON.stringify(data));
}
```

### 4.2 Cache Invalidation

- **On New Analysis:** Invalidate all cache keys matching `cache:recommendations:user:{userId}:*`
- **On Product Update:** No automatic invalidation (TTL handles stale data)
- **On Ad Update:** No cache invalidation (ads are not cached in recommendation cache)

### 4.3 Cache Key Design

```
cache:recommendations:user:{userId}:{md5hashOfQueryParams}
```

The hash ensures different filter combinations produce different cache keys while keeping key length manageable.

---

## 5. Source Determination Logic

### 5.1 Analysis Freshness Check

```typescript
async function determineSource(userId: string): Promise<PersonalizationContext> {
  const latestAnalysis = await prisma.skinAnalysis.findFirst({
    where: { userId, completedAt: { not: null } },
    orderBy: { completedAt: 'desc' },
  });

  if (!latestAnalysis) {
    return { source: 'generic', skinTypes: [], skinConcerns: [], ... };
  }

  const analysisAge = (Date.now() - latestAnalysis.completedAt.getTime()) / (1000 * 60 * 60);

  if (analysisAge <= 24) {
    return {
      source: 'ai',
      skinTypes: [latestAnalysis.skinType],
      skinConcerns: latestAnalysis.conditions || [],
      analysisId: latestAnalysis.id,
      analysisAge,
    };
  }

  // Stale analysis → generic fallback (BR-MATCH-001)
  return { source: 'generic', skinTypes: [], skinConcerns: [], ... };
}
```

### 5.2 Stale Analysis Handling

- Analysis > 24h old → treated as no analysis (`source = "generic"`)
- UI shows subtle "Want Fresh Results?" banner (BR-MATCH-004)
- History section still shows stale sessions

---

## 6. Ad Rotation Logic

### 6.1 Eligible Advertisement Filter

```typescript
// BR-MATCH-037
const eligibleAds = await prisma.advertisement.findMany({
  where: {
    is_active: true,
    approval_status: 'approved',
    payment_status: 'completed',
    starts_at: { lte: new Date() },
    expires_at: { gt: new Date() },
  },
  orderBy: [
    { payment_amount: 'desc' },    // BR-MATCH-051
    { created_at: 'desc' },
  ],
  take: 5, // BR-MATCH-049
});
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

- If Redis unavailable → `ORDER BY created_at ASC` (deterministic but non-rotating)

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

1. **Frontend:** Zod schema (`matchingSearchParamsSchema`)
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
