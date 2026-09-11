# DD_MATCH_02 — Frontend Page (Recommendations)

> **Doc ID:** SKM-DD-MATCH-02 | **Version:** 1.0 | **Status:** Released  
> **Last Updated:** 2026-09-01

---

## 1. Overview

The Recommendations page is the personalized product discovery entry point. It displays a responsive grid of product recommendation cards, a filters sidebar (desktop) / drawer (mobile), sort controls, pagination, recommendation history accordion, and a cross-screen sponsored ad carousel panel. The page adapts its UI based on the recommendation source (`ai` vs `generic`).

- **File Path:** `frontend/src/pages/buyer/Recommendations.tsx`
- **Route:** `/buyer/recommendations`
- **Layout:** `BuyerLayout.tsx` (authenticated buyer shell)

---

## 2. Layout Structure

### 2.1 AI Analysis State (`source = "ai"`, fresh ≤ 24h)

```
┌──────────────────────────────────────────────────────────────────┐
│                         BROWSER VIEWPORT                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  [A] PAGE HEADER                                           │  │
│  │  [A1] Page Title: "Recommended for You"                    │  │
│  │  [A2] Source Badge: "🧬 AI Analysis" (emerald green)       │  │
│  │  [A3] Source Subtitle: "Based on your AI analysis · {N}"   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  [D0] AD SLIDE-DOWN PANEL (carousel)                       │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────┐  ┌──────────────────────────────────────────┐  │
│  │  [B] FILTERS │  │  [C] RECOMMENDATION GRID                 │  │
│  │  PANEL       │  │  4 columns desktop / 2 tablet / 1 mobile │  │
│  │              │  │  Match score badges on cards              │  │
│  │  [B1] Skin   │  │                                          │  │
│  │  Type (pre-  │  │  [C5] PAGINATION (desktop)               │  │
│  │  selected)   │  │  [C6] LOAD MORE (mobile)                 │  │
│  │  [B2] Price  │  │                                          │  │
│  │  Range       │  │                                          │  │
│  │  [B3]        │  │                                          │  │
│  │  Ingredients │  │                                          │  │
│  │  [B4] Reset  │  │                                          │  │
│  └──────────────┘  └──────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  [E] RECOMMENDATION HISTORY SECTION                        │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 Generic State (`source = "generic"`)

```
┌──────────────────────────────────────────────────────────────────┐
│                         BROWSER VIEWPORT                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  [A] PAGE HEADER                                           │  │
│  │  [A2] Source Badge: "⬡ General Picks" (amber)              │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  [A4] PROFILE PROMPT BANNER (full-width, prominent)        │  │
│  │  Left: AI face scan illustration                           │  │
│  │  Center: "Get Personalized Recommendations" + description  │  │
│  │  Right: CTA "✦ Start Skin Analysis →"                      │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  [D0] AD SLIDE-DOWN PANEL                                  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────┐  ┌──────────────────────────────────────────┐  │
│  │  [B] FILTERS │  │  [C] RECOMMENDATION GRID                 │  │
│  │  (all        │  │  Category badges (no match score)        │  │
│  │  unchecked)  │  │                                          │  │
│  └──────────────┘  └──────────────────────────────────────────┘  │
│                                                                  │
│  [E] HISTORY (when sessions exist)                               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 2.3 Stale Analysis State (`source = "ai"`, > 24h)

Same as AI Analysis State, but with a subtle compact banner:
```
┌────────────────────────────────────────────────────────────────┐
│  [A4] RETAKE PROMPT BANNER (subtle compact)                    │
│  "💡 Want Fresh Results?"                                       │
│  "Retake your skin analysis for updated recommendations"       │
│  Right: CTA "Retake Analysis →"                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 3. Form State & Validation (React Hook Form + Zod)

### 3.1 Match Search Params Schema

```typescript
// frontend/src/features/recommendations/schemas/matchingSearchParams.schema.ts
import { z } from 'zod';

export const matchingSearchParamsSchema = z.object({
  skinTypes: z.string().optional().transform((val) => {
    if (!val) return [];
    return val.split(',').filter(Boolean);
  }),
  ingredients: z.string().optional().transform((val) => {
    if (!val) return [];
    return val.split(',').filter(Boolean);
  }),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sort: z.enum(['matchScore', 'price', 'createdAt']).optional().default('matchScore'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(50).optional().default(20),
});

export type MatchingSearchParams = z.infer<typeof matchingSearchParamsSchema>;
```

### 3.2 useMatchFilters Hook

```typescript
// frontend/src/features/recommendations/hooks/useMatchFilters.ts
import { useSearchParams } from 'react-router-dom';
import { matchingSearchParamsSchema, type MatchingSearchParams } from '../schemas/matchingSearchParams.schema';

export function useMatchFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: MatchingSearchParams = matchingSearchParamsSchema.parse(
    Object.fromEntries(searchParams)
  );

  const updateFilters = (updates: Partial<MatchingSearchParams>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    });
    // Reset page to 1 on any filter/sort change (BR-MATCH-020)
    if (Object.keys(updates).some(k => k !== 'page')) {
      next.set('page', '1');
    }
    setSearchParams(next);
  };

  const resetFilters = () => {
    setSearchParams({});
  };

  return { filters, updateFilters, resetFilters };
}
```

---

## 4. Sub-Components

### 4.1 PageHeader Component

- **File Path:** `frontend/src/features/recommendations/components/PageHeader.tsx`
- Renders page title (h1), source badge (emerald green or amber), and source subtitle
- Conditional: Profile Prompt Banner (prominent for generic, subtle for stale, hidden for fresh)

### 4.2 ProfilePromptBanner Component

- **File Path:** `frontend/src/features/recommendations/components/ProfilePromptBanner.tsx`
- 3 states: prominent (generic), subtle compact (stale), hidden (fresh)
- Prominent: AI illustration + heading + body + CTA button
- Subtle: heading + body + subtle CTA button
- Navigates to `/buyer/skin-analysis`

### 4.3 FiltersPanel Component

- **File Path:** `frontend/src/features/recommendations/components/FiltersPanel.tsx`
- Desktop: sticky sidebar (always visible)
- Mobile: drawer (hamburger trigger, slide-in from left)
- Filter groups: Skin Type (checkboxes), Price Range (min/max inputs), Ingredients (checkboxes)
- Reset Filters button

### 4.4 RecommendationGrid Component

- **File Path:** `frontend/src/features/recommendations/components/RecommendationGrid.tsx`
- Responsive grid: 4 columns (desktop) / 2 columns (tablet) / 1 column (mobile)
- Renders `RecommendationCard` components
- Skeleton shimmer during loading (shadcn `Skeleton`)

### 4.5 RecommendationCard Component

- **File Path:** `frontend/src/features/recommendations/components/RecommendationCard.tsx`
- Card with product image, name, price, skin type tags
- Conditional badge: match score (ai) or category badge (generic)
- Out-of-stock indicator
- Click navigates to `/buyer/products/:slug`

**Props Interface:**
```typescript
interface RecommendationCardProps {
  id: string;
  name: string;
  slug: string;
  price: string;
  compareAtPrice?: string | null;
  images: string[];
  skinTypes: string[];
  matchScore: number | null;
  avgRating: string;
  reviewCount: number;
  isFeatured: boolean;
  isInStock: boolean;
  source: 'ai' | 'generic';
  onClick: () => void;
}
```

### 4.6 AdSlidePanel Component

- **File Path:** `frontend/src/components/AdSlidePanel.tsx`
- Reusable cross-screen sponsored ad carousel
- Horizontal glass-morphism carousel with up to 5 slides
- Each slide: image (left), title + description (center), CTA button (right)
- 5-second auto-rotation (pauses on hover/touch)
- Left/right arrows + dot indicators
- Disclosure footer: "Sponsored products are paid placements from merchants"

**Props Interface:**
```typescript
interface AdSlidePanelProps {
  placement: string;
  maxSlides?: number;  // default 5
  autoSlideMs?: number; // default 5000
}
```

### 4.7 HistoryAccordion Component

- **File Path:** `frontend/src/features/recommendations/components/HistoryAccordion.tsx`
- Accordion rows grouped by analysis date
- Expanded: compact product mini-cards (image + name + score + price)
- Collapsed: date header + chevron

### 4.8 Pagination / Load More

- **Desktop:** `Pagination` component with previous/next arrows + page numbers
- **Mobile:** "Load More" button (rose-gold ghost style)
- Uses TanStack Query `keepPreviousData` for smooth transitions

### 4.9 EmptyState Component

- **File Path:** `frontend/src/features/recommendations/components/EmptyState.tsx`
- "No matching products" + Reset Filters button

### 4.10 ErrorBanner Component

- **File Path:** `frontend/src/features/recommendations/components/ErrorBanner.tsx`
- Alert with error message + Retry button
- Retry refetches last failed query via TanStack Query

---

## 5. Action Buttons & Handlers

### 5.1 Filter Change — Skin Type

- **Trigger:** Checkbox check/uncheck
- **Action:**
  1. Update URL query param `skinTypes` (comma-separated)
  2. Reset `page` to 1
  3. Trigger refetch via TanStack Query invalidation

### 5.2 Filter Change — Price Range

- **Trigger:** Min/max price input change
- **Action:**
  1. Validate: both ≥ 0; minPrice ≤ maxPrice
  2. Update URL query params
  3. Reset `page` to 1
  4. Trigger refetch

### 5.3 Filter Change — Ingredients

- **Trigger:** Checkbox check/uncheck
- **Action:**
  1. Update URL query param `ingredients` (comma-separated)
  2. Reset `page` to 1
  3. Trigger refetch

### 5.4 Reset Filters

- **Trigger:** Click "Reset Filters" button
- **Action:**
  1. Clear all filter URL params
  2. Reset `page` to 1
  3. Reset sort to default
  4. Trigger refetch

### 5.5 Sort Change

- **Trigger:** Sort dropdown change
- **Action:**
  1. Update URL query params `sort` and `order`
  2. Reset `page` to 1
  3. Trigger refetch

### 5.6 Pagination — Page Change

- **Trigger:** Click page number or prev/next arrow
- **Action:**
  1. Update URL query param `page`
  2. Trigger refetch with `keepPreviousData`
  3. Scroll to top of grid

### 5.7 Load More — Mobile

- **Trigger:** Click "Load More" button
- **Action:**
  1. Increment `page` by 1
  2. Trigger refetch with `keepPreviousData`
  3. Append new results to existing grid

### 5.8 Recommendation Card Click

- **Trigger:** Click card image or name
- **Action:** Navigate to `/buyer/products/:slug`

### 5.9 Ad Panel — CTA Click

- **Trigger:** Click "Shop Now" on ad slide
- **Action:**
  1. Fire-and-forget `POST /ads/track/click`
  2. Navigate to `ad.linkUrl`

### 5.10 Start Skin Analysis CTA

- **Trigger:** Click "Start Skin Analysis →" in Profile Prompt Banner
- **Action:** Navigate to `/buyer/skin-analysis`

---

## 6. Client-Side Events

| Event | Trigger | Action |
|-------|---------|--------|
| `matching:paramChange` | URL query param change | Refetch recommendations (TanStack Query invalidation) |
| `matching:analysisCompleted` | New AI analysis result returned | Invalidate cache keys, refetch with `source = ai` |
| `matching:filterApplied` | Apply Filters / Reset Filters | Reset `page` to 1 and refetch |
| `matching:pageChange` | Pagination control click | Update `page` and refetch with `keepPreviousData` |
| `matching:adClicked` | Ad slide CTA click | Fire-and-forget `POST /ads/track/click`, navigate |
| `ad:panelLoaded` | Panel visible (IntersectionObserver ≥ 50%) | Fire-and-forget `POST /ads/track/impression` |
| `ad:panelSlideChanged` | Auto-slide or manual navigation | Update dot indicators, pause auto-slide on hover/touch |

---

## 7. Lookup Data

### 7.1 Skin Type Options

| Value | Label (EN) | Label (JA) | Label (MY) |
|-------|------------|------------|------------|
| `oily` | Oily | 脂性肌 | အဆီပြန် |
| `dry` | Dry | 乾燥肌 | ခြောက်သွေ့ |
| `combination` | Combination | 混合肌 | ရောစပ် |
| `normal` | Normal | 普通肌 | ပုံမှန် |
| `sensitive` | Sensitive | 敏感肌 | အရမ်းထိလွယ် |

### 7.2 Sort Options

| Value | Label (EN) | Label (JA) | Default When |
|-------|------------|------------|-------------|
| `matchScore` | Match Score | 一致度 | `source = "ai"` |
| `price` | Price | 価格 | — |
| `createdAt` | Created At | 登録日 | — |

### 7.3 Category Badge Options (Generic Source)

| Condition | Badge | Color |
|-----------|-------|-------|
| `is_featured = true` | "⭐ Featured" | amber |
| `avg_rating >= 4.5` | "🏆 Top Rated" | teal |
| `review_count >= 100` | "🔥 Best Seller" | orange |
| `createdAt >= 30 days ago` | "✨ New" | purple |

---

## 8. Error Handling

### 8.1 Field-Level Errors

- Red border on invalid price inputs
- Inline error message below field
- Real-time validation on blur and change

### 8.2 Form-Level Errors

- Error banner at top of results area
- Toast notification for transient errors

### 8.3 Loading States

- Skeleton shimmer grid during fetch (shadcn `Skeleton`)
- Spinner on Apply buttons
- `keepPreviousData` for pagination (no full skeleton flash)

### 8.4 Empty Results

- `EmptyState` component with "No matching products" message
- "Reset Filters" button

### 8.5 Retry

- TanStack Query `error` + `refetch` for transient failures
- Retry button in error banner

---

## 9. Responsive Breakpoints

| Breakpoint | Min Width | Layout Behavior |
|------------|-----------|-----------------|
| Mobile (default) | 0px | Filters as drawer (hamburger), 1-column grid, Load More button |
| Tablet (`md:`) | 768px | Filters sidebar (narrower), 2-column grid |
| Desktop (`lg:`) | 1024px | Filters sidebar + 4-column grid, pagination controls |
| Wide (`xl:`) | 1280px | Same as desktop with enhanced spacing |

---

## 10. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_MATCH_01](./DD_MATCH_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_MATCH_03](./DD_MATCH_03_API_ENDPOINTS.md) | Backend API endpoints consumed |
| [DD_MATCH_04](./DD_MATCH_04_DTOS_AND_TYPES.md) | DTO and type definitions |
| [DD_MATCH_05](./DD_MATCH_05_BUSINESS_LOGIC.md) | Backend business rules |
| [機能設計書_Matching_And_Recommendation](../機能設計書_Matching_And_Recommendation.md) | Full functional specification |
