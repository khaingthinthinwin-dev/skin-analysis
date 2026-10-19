# DD_MATCH_02 — Frontend Page (Recommendations)

> **Doc ID:** SKM-DD-MATCH-02 | **Version:** 1.1 | **Status:** Released  
> **Last Updated:** 2026-10-15 (code reconciliation)

> **Source update (2026-10-15):** The page defaults to 12 results, uses `createdAt desc` (Newest), and has numbered pagination on all viewport sizes; there is no mobile Load More. Product grid is 1 column by default, 2 at `sm`, and 3 at `lg`; filter sidebar becomes a sheet below `lg`. Grid/list toggle, wishlist, in-stock cart action, category/rating filters, removable filter chips, and history expansion are implemented. Ingredients are not exposed in this page's filter UI.

---

## 1. Overview

The Recommendations page is the personalized product discovery entry point. It displays a responsive grid of product recommendation cards, a filters sidebar (desktop) / drawer (mobile), sort controls, pagination, recommendation history accordion, and a cross-screen sponsored ad carousel panel. The page adapts its UI based on the recommendation source (`ai` vs `generic`).

- **File Path:** `frontend/src/pages/buyer/MatchingRecommendations.tsx`
- **Route:** `/buyer/recommendations`
- **Layout:** `BuyerLayout.tsx` (authenticated buyer shell)
- **Code note (2026-10-15):** the ASCII layouts below are conceptual. As built: the filter panel offers **Category, Skin Type, Price Range and Rating (no ingredients picker)**; the grid is **1 / `sm:2` / `lg:3` columns** (not 4/2/1); there is **no Load More** — numbered pagination at every viewport; filter chips (`MatchingFilterChips`) render above the panel on desktop and mobile; mobile filters open in a `Sheet` (side `right`) with a `Show {total} Products` footer.

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
│  │  PANEL       │  │  3 columns desktop / 2 small / 1 mobile │  │
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
// frontend/src/schemas/matching.schema.ts
import { z } from 'zod';

export const matchQuerySchema = z.object({
  skinTypes: z.string().optional().transform((val) => (val === 'all' || val === '' ? undefined : val)),
  ingredients: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  rating: z.coerce.number().min(1).max(5).optional(),
  // The sort bar defaults to "Newest" and the value is sent explicitly so the
  // option shown is always the order the API applies (BR-MATCH-025 allowlist).
  sort: z.enum(['matchScore', 'price', 'rating', 'createdAt']).optional().default('createdAt'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(12),
});

export type MatchQueryParams = z.infer<typeof matchQuerySchema>
```

### 3.2 useMatchFilters Hook

```typescript
// frontend/src/features/buyer/matching/hooks/useMatchFilters.ts
import { useSearchParams } from 'react-router';
import { matchQuerySchema, type MatchQueryParams } from '@/schemas/matching.schema';

export function useMatchFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: MatchQueryParams = useMemo(
    () => matchQuerySchema.parse(Object.fromEntries(searchParams)),
    [searchParams],
  );

  const updateFilters = useCallback(
    (updates: Partial<MatchQueryParams>, options?: { replace?: boolean; keepPage?: boolean }) => {
      setSearchParams(
        (prev: URLSearchParams) => {
          const next = new URLSearchParams(prev);
          Object.entries(updates).forEach(([key, value]) => {
            if (value === undefined || value === null || value === '') next.delete(key);
            else next.set(key, String(value));
          });
          // A sort/filter change restarts at page 1 — unless the caller is only
          // persisting the current selection (e.g. pinning the default sort on
          // load), where the current page must survive a refresh.
          if (!options?.keepPage && Object.keys(updates).some((k) => k !== 'page')) {
            next.set('page', '1');
          }
          return next;
        },
        { replace: options?.replace ?? false },
      );
    },
    [setSearchParams],
  );

  const resetFilters = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  return { filters, updateFilters, resetFilters };
}
```

---

## 4. Sub-Components

### 4.1 PageHeader Component

- **File Path:** Header (title, source badge, subtitle) is rendered inline in `frontend/src/pages/buyer/MatchingRecommendations.tsx` — there is no separate `PageHeader.tsx`
- Renders page title (h1), source badge (emerald green or amber), and source subtitle
- Conditional: Profile Prompt Banner (prominent for generic, subtle for stale, hidden for fresh)

### 4.2 ProfilePromptBanner Component

- **File Path:** `frontend/src/features/buyer/matching/components/ProfilePromptBanner.tsx`
- 3 states: prominent (generic), subtle compact (stale), hidden (fresh)
- Prominent: AI illustration + heading + body + CTA button
- Subtle: heading + body + subtle CTA button
- Navigates to `/buyer/skin-analysis`

### 4.3 FiltersPanel Component

- **File Path:** `frontend/src/features/buyer/matching/components/FiltersPanel.tsx`
- Desktop: sticky sidebar (always visible)
- Mobile: opened from a `Filters` button in a `Sheet` (side `right`) with `Clear All` + `Show {total} Products` footer
- Filter groups: Category (`CategorySelect`), Skin Type (checkboxes), Price Range (min/max inputs with inline validation), Rating (radios 3.0/3.5/4.0/4.5). **No ingredients control — `ingredients` is API-only**
- Reset Filters button (rendered only when filters are active)

### 4.4 Result Grid (inline)

- **File Path:** Rendered inline in `frontend/src/pages/buyer/MatchingRecommendations.tsx` (no `RecommendationGrid.tsx`)
- Responsive grid: 3 columns (`lg:grid-cols-3`) desktop / 2 (`sm:grid-cols-2`) tablet / 1 column (mobile); list view (`ViewToggle`) renders wide rows instead
- Card markup is inline in the page (the `features/buyer/matching/components/RecommendationCard.tsx` file exists but is **not imported** by the page)
- `SkeletonGrid` shimmer during loading (`frontend/src/features/buyer/matching/components/SkeletonGrid.tsx`)

### 4.5 RecommendationCard Component

- **File Path:** Card markup is inline in `frontend/src/pages/buyer/MatchingRecommendations.tsx`; `features/buyer/matching/components/RecommendationCard.tsx` exists but is unused by the page
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

### 4.6 Ad Panel — shared `AdBannerSlider`

- **File Path:** `frontend/src/components/shared/AdBannerSlider.tsx` (the design path `frontend/src/components/AdSlidePanel.tsx` does not exist; `features/buyer/matching/components/AdSlidePanel.tsx` exists but is unused by this page)
- Reusable cross-screen sponsored ad carousel (also used by Search, ProductDetail, Checkout)
- Horizontal carousel card with up to 5 slides; each slide: image (right), title + description (left), CTA button
- 5-second auto-rotation — pauses on hover, focus, and `prefers-reduced-motion`
- Left/right arrows + dot indicators
- Client-side eligibility filter (placement match, `approvalStatus === 'approved'`, `startsAt <= now <= expiresAt`); resolves the ad's `sku` to a product for navigation; fires impressions once via `IntersectionObserver` at ≥ 50% visibility

**Props Interface:**
```typescript
interface AdBannerSliderProps {
  placement: AdBannerPlacement; // 'recommendation_page_banner' on this page
  fallbackProductId?: string;
  onImpression?: (adIds: string[]) => void;
  onAdClick?: (adId: string) => void;
}
```

### 4.7 HistoryAccordion Component

- **File Path:** `frontend/src/features/buyer/matching/components/HistoryAccordion.tsx`
- Accordion rows grouped by analysis date (first session expanded by default)
- Expanded: compact product mini-cards (image + name + score + price) linking to `/buyer/products/:slug`
- Collapsed: date header + chevron; the page fetches 5 sessions, `See more` refetches 50, `Show less` returns to 5

### 4.8 Pagination (all viewports)

- **Desktop:** `Pagination` component with previous/next arrows + page numbers
- **Mobile:** Uses the same numbered pagination; Load More is not implemented.
- Uses TanStack Query `keepPreviousData` for smooth transitions

### 4.9 EmptyState Component

- **File Path:** `frontend/src/features/buyer/matching/components/EmptyState.tsx`
- Default message: "No products match your filters. Try adjusting your criteria." (no Reset button inside the component; the mobile filter button sits below it)

### 4.10 ErrorBanner Component

- **File Path:** `frontend/src/features/buyer/matching/components/ErrorBanner.tsx`
- Alert with error message ("Something went wrong. Please try again.") + Retry button
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

### 5.3 Filter Change — Category & Rating

- **Category:** `CategorySelect` change → updates URL `categoryId` (self + descendants expanded server-side), resets `page` to 1, refetch. Chip shows the resolved category name with per-chip remove.
- **Rating:** radio change → updates URL `rating` (1–5), resets `page` to 1, refetch. Chip shows `{rating}+ Stars`.
- **Ingredients:** no UI control exists; `ingredients` can only be supplied as an API query parameter.

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

### 5.7 Load More — Not Implemented

- The page has numbered pagination at all viewport sizes. It retains previous results while the selected page loads and does not append pages.

### 5.8 Recommendation Card Click

- **Trigger:** Click card image or name
- **Action:** Navigate to `/buyer/products/:slug`

### 5.9 Ad Panel — CTA Click

- **Trigger:** Click "Learn more" on ad slide
- **Action:**
  1. Fire-and-forget `POST /ads/track/click` with `{ adId }`
  2. Navigate to `/buyer/products/{sku}` (fallbacks: ad `productId` route, then ad `linkUrl`/`target_url`)

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
| `createdAt` (`desc`) | Newest | 新着 | Default for both sources — pinned into the URL on mount (`replace` + `keepPage`) |
| `matchScore` (`desc`) | Match Score | 一致度 | Offered only when `source = "ai"` |
| `price` (`asc`/`desc`) | Price: Low to High / High to Low | 価格 | — |
| `rating` (`desc`) | Highest Rated | 評価 | — |

`resolveMatchingSort()` falls back to "Newest" when the URL carries a sort the current source cannot honour (e.g. stale `matchScore` after the AI analysis lapsed, or an unlisted direction such as `rating:asc`).

### 7.3 Category Badge Options (Generic Source)

Backend-computed `categoryBadge` (shown for both sources; page styles only `topRated`/`bestSeller` — `featured`/`new` currently render unstyled):

| Condition (evaluated in `getCategoryBadge`, precedence order) | Badge | Page colour class |
|-----------|-------|-------|
| `isFeatured = true` | `featured` | (no style map entry) |
| `avgRating >= 4.7` AND `reviewCount >= 100` | `topRated` | teal |
| `reviewCount >= 200` | `bestSeller` | orange |
| `createdAt` within last 30 days | `new` | (no style map entry) |

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
| Mobile (default) | 0px | Filters as sheet, 1-column grid, numbered pagination |
| Small (`sm:`) | 640px | 2-column grid |
| Desktop (`lg:`) | 1024px | Filters sidebar + 3-column grid, pagination controls |
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
