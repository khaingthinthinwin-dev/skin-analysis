# DD_SEARCH_02 — Frontend Page (Search & Filter)

> **Doc ID:** SKM-DD-SEARCH-02 | **Version:** 1.1 | **Status:** Released  
> **Last Updated:** 2026-08-25

---

## 1. Overview

The Search & Filter page is the product discovery hub of the Cosmetics Finder platform. It consists of a page header, a sponsored ad slide-down panel (conditional), a search bar and filters panel in the same row, a results area with product grid/list, sort controls, view mode toggle, active filter chips, and pagination. All search state is managed via URL query parameters using `useSearchParams`, ensuring results are shareable and back-button friendly.

**Page layout flow:** A → Advertisement → B+C → D — The page header ([A]) renders at the top, followed by the sponsored ad slide-down panel (between [A] and [B+C]), then the search bar ([B]) and filters panel ([C]) in the same row, with the results area ([D]) below.

- **File Path:** `frontend/src/pages/Products.tsx` (primary), `frontend/src/pages/Search.tsx` (alias)
- **Route:** `/products`, `/search`
- **Layout:** Full-width page with header → ad panel → search+filters row (side-by-side on desktop/tablet, trigger on mobile) → results area → footer

---

## 2. Layout Structure

The page follows the flow: **A → Advertisement → B+C → D**. The search bar and filters panel render in the same row/section, with the results area below.

### 2.1 Desktop Layout (≥ 1024px)

```
┌──────────────────────────────────────────────────────────────────────┐
│ [A] PAGE HEADER — Logo + "Cosmetics Finder"                          │
│     [A1] Page Title: "Search Products"                               │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ [D0] SPONSORED AD SLIDE-DOWN PANEL (conditional)                 │ │
│ │      Horizontally centered between [A] and [B+C]                │ │
│ │      ┌─────────────┬──────────────────────────┐                 │ │
│ │      │ [D0a] Image │ [D0b] Title              │                 │ │
│ │      │ / Banner    │ [D0c] Description         │                 │ │
│ │      │             │ [D0d] CTA Button           │                 │ │
│ │      └─────────────┴──────────────────────────┘                 │ │
│ │      (full container width, horizontal slide, 5s auto, max 5)   │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ ┌──────────────────────────┐  ┌──────────────────────────────────┐  │
│ │  [B] SEARCH BAR          │  │  [C] FILTERS PANEL               │  │
│ │  [B1] Keyword Input      │  │  [C1] Categories                 │  │
│ │  [B2] Search  [B3] Clear │  │  [C2] Skin Type  [C3] Ingredients│  │
│ │                          │  │  [C4] Price Range  [C5] Rating    │  │
│ │                          │  │  [C6] Apply Filters               │  │
│ │                          │  │  [C7] Reset Filters               │  │
│ └──────────────────────────┘  └──────────────────────────────────┘  │
│                                                                      │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │  [D] RESULTS AREA                                                 │ │
│ │  [D1] Results Count  [D2] Sort Select  [D2a] View Toggle        │ │
│ │  [D3] Active Filter Chips                                        │ │
│ │  [D4] Product Grid (4 columns)                                   │ │
│ │      or Product List (stacked rows)                              │ │
│ │  (cond.) Loading Skeleton / Empty State / Error Banner            │ │
│ │  [D5] Pagination + Page Size Select                              │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ [E] FOOTER CONTROLS — [Language Toggle] [Theme Toggle]               │
└──────────────────────────────────────────────────────────────────────┘
```

### 2.2 Mobile Layout (< 768px)

```
┌───────────────────────────────────────────────────────┐
│ [A] PAGE HEADER (Logo + System Name)                  │
│     [A1] Page Title: "Search Products"                 │
│                                                       │
│ [D0] SPONSORED AD SLIDE-DOWN PANEL (conditional)      │
│    ┌──────────────────────────────────────┐           │
│    │ [D0a] Image/Banner (full-width)      │           │
│    │ [D0b] Title                          │           │
│    │ [D0c] Description (2-line clamp)     │           │
│    │ [D0d] CTA Button (full-width)        │           │
│    └──────────────────────────────────────┘           │
│    (stacked, full container width, 5s auto, max 5)    │
│                                                       │
│ ┌──────────────────────────┐┌──────────────┐          │
│ │ [B] SEARCH BAR           ││[C] FILTERS   │          │
│ │ [B1] Input [B2] [B3]     ││  TRIGGER     │          │
│ └──────────────────────────┘└──────────────┘          │
│                                                       │
│ [D1] Results Count  [D2] Sort Select                  │
│ [D2a] View Toggle (Grid/List)                         │
│ [D3] Active Filter Chips Row                          │
│ [D4] PRODUCT GRID (1–2 cols) / LIST (stacked rows)    │
│ [D5] Pagination   [D6] Page Size Select               │
│                                                       │
│ [E] FOOTER CONTROLS ([Language] [Theme])              │
│                                                       │
│ [C] FILTER DRAWER (bottom sheet / overlay, cond.)     │
│    [C1] Categories  [C2] Skin Type  [C3] Ingredients  │
│    [C4] Price Range  [C5] Rating                      │
│    [C6] Apply Filters  [C7] Reset Filters             │
└───────────────────────────────────────────────────────┘
```

### 2.3 Responsive Layout Breakpoints

| Breakpoint | Min Width | Layout Behavior |
|:-----------|:----------|:----------------|
| Mobile (default) | 0px | Search bar ([B]) and filter trigger button ([C]) in the same row. Filters open as a bottom-sheet/overlay drawer. Grid view: 1–2 columns; List view: stacked rows. Grid/List view toggle in results toolbar (persists to localStorage). Sponsored ad slide-down panel between page header and search+filters row, stacked layout (full-width image, title, description, CTA). |
| Tablet (`md:`) | 768px | Search bar ([B]) and filters panel ([C]) in the same row — search bar left, compact filters right. Results grid with 2–3 columns. Grid/List view toggle in results toolbar. Sponsored ad slide-down panel switches to horizontal layout (image left, text block right), full container width, horizontally centered between page header and search+filters row. |
| Desktop (`lg:`) | 1024px | Search bar ([B]) and filters panel ([C]) side-by-side in the same row — search bar left, full filters sidebar right. Results area below with 4-column grid. Grid/List view toggle in results toolbar. Sponsored ad slide-down panel renders horizontal (image left, text block right), full container width, horizontally centered between page header and search+filters row. |
| Wide (`xl:`) | 1280px | Same as `lg:` with enhanced spacing. Search bar + filters in the same row, results below with 4-column grid. Sponsored ad slide-down panel identical to `lg:` with enhanced spacing. |

---

## 3. Form State & Validation (Zod searchParamsSchema + TanStack Query)

All search state is derived from URL query parameters, parsed and validated with Zod. TanStack Query manages the query lifecycle, caching, and deduplication.

### 3.1 Search Params Schema

```typescript
// frontend/src/features/search/schemas/searchParams.schema.ts
import { z } from 'zod';

export const searchParamsSchema = z.object({
  q: z.string().max(255, 'Keyword must be 255 characters or fewer').optional().default(''),
  categoryId: z.string().uuid('Invalid category ID').optional().default(''),
  skinTypes: z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : v ? v.split(',') : []))
    .optional()
    .default([]),
  ingredients: z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : v ? v.split(',') : []))
    .optional()
    .default([]),
  minPrice: z.coerce.number().min(0, 'Minimum price must be 0 or more').optional().default(undefined),
  maxPrice: z.coerce.number().min(0, 'Maximum price must be 0 or more').optional().default(undefined),
  rating: z.coerce.number().min(1).max(5, 'Rating must be between 1 and 5').optional().default(undefined),
  sort: z.enum(['price', 'rating', 'createdAt']).optional().default('createdAt'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().min(1, 'Page must be at least 1').optional().default(1),
  limit: z.coerce.number().min(1).max(100, 'Limit must be between 1 and 100').optional().default(20),
}).refine(
  (data) => data.minPrice === undefined || data.maxPrice === undefined || data.minPrice <= data.maxPrice,
  { message: 'Minimum price cannot exceed maximum price', path: ['minPrice'] }
);

export type SearchParams = z.infer<typeof searchParamsSchema>;
```

### 3.2 Product Search Query Hook

```typescript
// frontend/src/features/search/hooks/useProductSearch.ts
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { searchParamsSchema, type SearchParams } from '../schemas/searchParams.schema';
import { productService } from '../services/product.service';
import { useMemo } from 'react';

export function useProductSearch() {
  const [searchParams, setSearchParams] = useSearchParams();

  const parsedParams = useMemo(() => {
    const raw = Object.fromEntries(searchParams.entries());
    return searchParamsSchema.parse(raw);
  }, [searchParams]);

  const query = useQuery({
    queryKey: ['products', parsedParams],
    queryFn: () => productService.search(parsedParams),
    placeholderData: (prev) => prev, // keepPreviousData
    staleTime: 30_000,
  });

  const updateParams = (updates: Partial<SearchParams>) => {
    const next = { ...parsedParams, ...updates, page: updates.page ?? 1 };
    setSearchParams(serializeParams(next));
  };

  return {
    ...query,
    params: parsedParams,
    updateParams,
  };
}

function serializeParams(params: SearchParams): Record<string, string> {
  const entries: [string, string][] = [];
  if (params.q) entries.push(['q', params.q]);
  if (params.categoryId) entries.push(['categoryId', params.categoryId]);
  if (params.skinTypes.length) entries.push(['skinTypes', params.skinTypes.join(',')]);
  if (params.ingredients.length) entries.push(['ingredients', params.ingredients.join(',')]);
  if (params.minPrice !== undefined) entries.push(['minPrice', String(params.minPrice)]);
  if (params.maxPrice !== undefined) entries.push(['maxPrice', String(params.maxPrice)]);
  if (params.rating !== undefined) entries.push(['rating', String(params.rating)]);
  if (params.sort !== 'createdAt') entries.push(['sort', params.sort]);
  if (params.order !== 'desc') entries.push(['order', params.order]);
  if (params.page > 1) entries.push(['page', String(params.page)]);
  if (params.limit !== 20) entries.push(['limit', String(params.limit)]);
  return Object.fromEntries(entries);
}
```

### 3.3 Category Tree Hook

```typescript
// frontend/src/features/search/hooks/useCategoryTree.ts
import { useQuery } from '@tanstack/react-query';
import { categoryService } from '../services/category.service';

export function useCategoryTree() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: categoryService.getTree,
    staleTime: 30 * 60 * 1000, // 30 min
  });
}
```

---

## 4. Sub-Components

### 4.1 SearchBar Component

- **File Path:** `frontend/src/features/search/components/SearchBar.tsx`
- Renders keyword input with 300ms debounce, Search button, and Clear Search button
- Debounce: `IDLE` → `LOADING` fires after 300ms of typing idle (ST-DEB-001); Enter key bypasses debounce (ST-DEB-003)
- Clear Search (B3) visible only when `q` is non-empty; clears `q` and refetches default catalog
- AutoFocus on direct `/search` route

### 4.2 FilterPanel Component

- **File Path:** `frontend/src/features/search/components/FilterPanel.tsx`
- Desktop/tablet: rendered side-by-side with SearchBar in the same row. Mobile: hidden drawer triggered by `btnMobileFilter` (EL-28)
- Contains accordion groups: Categories (C1), Skin Type (C2), Ingredients (C3), Price Range (C4), Rating (C5)
- Apply Filters (C6) and Reset Filters (C7) buttons at the bottom
- Mobile drawer: bottom-sheet overlay with focus trap + `aria-modal`; Apply closes drawer, Close (X) dismisses without applying pending changes

### 4.3 CategoryTree Component

- **File Path:** `frontend/src/features/search/components/CategoryTree.tsx`
- Renders nested category checkboxes from `useCategoryTree()` hook
- Single-select: checking a category sets `categoryId`; unchecking clears it
- Backend includes all descendant categories in results (BR-SEARCH-010)

### 4.4 FilterChips Component

- **File Path:** `frontend/src/features/search/components/FilterChips.tsx`
- Renders active filter tags/chips row from URL query params (BR-SEARCH-019)
- One chip per active filter value (e.g., "Skin Type: Dry", "$10–$50", "Rating: 4★+")
- Close (×) icon on each chip removes that single filter value, resets `page` to 1 (BR-SEARCH-022)
- "Clear all" button removes all filters at once, keeps keyword `q` (BR-SEARCH-023)
- Placement: above results on desktop; above results inside drawer header on mobile (BR-SEARCH-024)

### 4.5 ViewToggle Component

- **File Path:** `frontend/src/features/search/components/ViewToggle.tsx`
- Segmented Grid/List toggle in the results toolbar next to `selSort`
- Grid: responsive 1–4 column card layout (mobile 1–2 cols, desktop 4 cols)
- List: stacked single-column rows (thumbnail left, title/description/price right); no horizontal scroll; long text truncated
- Persists to `localStorage` key `search.viewMode`; defaults to Grid; never written to URL
- Switching views re-renders already-fetched `data` — no API refetch triggered
- `role="group"` with visible label; each segment is a focusable button with `aria-pressed`; keyboard operable (Tab, Enter, Space, arrow keys); touch targets ≥ 44px

### 4.6 SortSelect Component

- **File Path:** `frontend/src/features/search/components/SortSelect.tsx`
- Dropdown with options: Newest, Price: Low to High, Price: High to Low, Highest Rated
- Maps option → `sort` + `order` params (`price/asc`, `price/desc`, `rating/desc`, `createdAt/desc`)
- Change resets `page` to 1

### 4.7 ProductGrid / ProductList Components

- **File Path:** `frontend/src/features/products/components/ProductCard.tsx`
- Grid view: vertical card. List view: horizontal row layout (thumbnail left, details right)
- Reused `ProductCard` component; click navigates to `/products/:slug`
- Out-of-stock products flagged `isInStock: false` (BR-SEARCH-014)
- Loading: `sklLoading` shimmer placeholders (lavender) matching current view mode
- Empty: `pnlEmpty` state with "No products found" + Reset Filters button

### 4.8 Pagination Component

- **File Path:** `frontend/src/components/ui/pagination.tsx`
- Previous/next + page numbers; First/last page boundaries disable buttons (Sec 3.3)
- Page size select: 10 / 20 / 50 (default 20)
- Page beyond range clamped to last page or empty state

### 4.9 SponsoredAdSlider Component

- **File Path:** `frontend/src/features/search/components/SponsoredAdSlider.tsx`
- Slide-down sponsored advertisement panel between page header ([A]) and search bar + filters row ([B]+[C])
- Fetches eligible ads via `GET /api/v1/ads?placement=search_top` — parallel to product results fetch, does not block product loading
- Renders animated slide-down container (`slotAdTop`) spanning the full container width, horizontally centered between [A] and [B]+[C], with search bar + filters rendered immediately below
- Per-ad slide cards (`cardAdSlide`) with: image/banner (`imgAdBanner`), title (`lblAdTitle`), description (`txtAdDescription`), CTA (`btnAdCta`), "Sponsored" badge (`badgeSponsored`)
- Desktop/tablet (≥ 768px): horizontal slide — image 320×120 (`object-cover`) left, text block right, inline CTA
- Mobile (< 768px): stacked slide — full-width 16:9 image, title, description, full-width CTA below
- Auto-slides every 5 seconds with vertical slide-down transition (500ms); maximum 5 ads
- Auto-advancement pauses on hover/keyboard focus; resumes on leave/blur (WCAG 2.2.2)
- `prefers-reduced-motion: reduce` disables entrance/slide animations; 5-second interval unchanged
- Hidden on ad fetch error or no eligible ads — graceful degradation; ad failure never blocks product results
- Sub-items: `trackAdSlides` (slider track), `cardAdSlide` (per-ad card), `imgAdBanner` (image), `lblAdTitle` (title), `txtAdDescription` (description), `btnAdCta` (CTA link), `badgeSponsored` (sponsor badge)

---

## 5. Action Buttons & Handlers

### 5.1 Keyword Search (Debounced)

- **Input:** `txtSearch` (B1) — 300ms debounce (ST-DEB-001)
- **Action:**
  1. After 300ms of typing idle, update `q` URL param via `setSearchParams`
  2. TanStack Query refetches `GET /api/v1/products` with new key
  3. `IDLE` → `LOADING` transition occurs at debounce fire time (ST-DEB-005)
  4. Previous in-flight request cancelled/superseded (ST-DEB-004)

### 5.2 Search Button (Immediate)

- **Button:** `btnSearch` (B2) — submit/primary
- **Action:**
  1. Fires query immediately, bypassing debounce (ST-DEB-003)
  2. Updates `q` param and refetches

### 5.3 Clear Search

- **Button:** `btnClearSearch` (B3) — ghost/icon; hidden when `q` is empty
- **Action:**
  1. Clears `q` param from URL
  2. Resets `txtSearch` to empty
  3. Refetches default catalog (sorted by `createdAt desc`)

### 5.4 Apply Filters

- **Button:** `btnApplyFilters` (C6) — primary
- **Action:**
  1. Collect changed filters (skinTypes, ingredients, minPrice, maxPrice, rating, categoryId)
  2. Validate numeric fields (min ≥ 0, max ≥ 0, min ≤ max)
  3. Merge into current params with `page: 1` (BR-SEARCH-011)
  4. `setSearchParams(toQueryString(...))`
  5. TanStack Query refetches; grid shows skeleton during fetch
  6. On mobile: close the filters drawer

### 5.5 Reset Filters

- **Button:** `btnResetFilters` (C7) — outline
- **Action:**
  1. Removes all filter params (`categoryId`, `skinTypes`, `ingredients`, `minPrice`, `maxPrice`, `rating`)
  2. Keeps keyword `q` intact
  3. Resets `page` to 1 (BR-SEARCH-011)
  4. Refetches default result set

### 5.6 Sort Change

- **Input:** `selSort` (D2) — select dropdown
- **Action:**
  1. Maps selected option → `sort` + `order` URL params
  2. Resets `page` to 1
  3. Refetches via TanStack Query; re-renders grid in new order

### 5.7 View Mode Toggle

- **Input:** `tglViewMode` (D2a) — segmented Grid/List toggle
- **Action:**
  1. Sets `tglViewMode` to clicked value (`grid` or `list`)
  2. Re-renders product grid/list using already-fetched `data` — no API refetch
  3. Leaves all URL query params untouched
  4. Persists selection to `localStorage` key `search.viewMode`

### 5.8 Active Filter Chip Removal

- **Input:** `chipFilter` × close icon
- **Action:**
  1. Removes that single filter value from URL params
  2. Resets `page` to 1 (BR-SEARCH-022)
  3. Refetches

### 5.9 Clear All Filters

- **Button:** `btnClearAllFilters` — ghost/link; visible only when ≥ 1 chip present
- **Action:**
  1. Removes all active filters at once (BR-SEARCH-023)
  2. Keeps keyword `q` intact
  3. Resets `page` to 1; refetches default result set

### 5.10 Mobile Filter Drawer

- **Button:** `btnMobileFilter` — icon, outline; hidden on desktop
- **Action:**
  1. Opens `pnlFilters` as bottom-sheet/overlay drawer
  2. Focus trap + `aria-modal` applied
  3. "Apply Filters" applies and closes drawer
  4. Close (X) dismisses without applying pending changes

---

## 6. Lookup Data

Filter options are sourced from the database and hardcoded enums:

| Filter | Source | Values |
|--------|--------|--------|
| Skin Type | Hardcoded enum | `dry`, `oily`, `combination`, `sensitive`, `normal` |
| Ingredients | `GET /api/v1/categories` + product data | Dynamic from product catalog |
| Categories | `GET /api/v1/categories` (cached, TTL 30 min) | Nested tree from `categories` table |
| Sort Options | Hardcoded | `newest` (`createdAt desc`), `price asc`, `price desc`, `rating` (`rating desc`) |
| Page Size | Hardcoded | `10`, `20`, `50` |
| View Mode | Hardcoded | `grid`, `list` (persisted to localStorage) |

---

## 7. Error Handling

### 7.1 Field-Level Errors

- Red border on invalid filter input (e.g., `minPrice > maxPrice`)
- Inline error message below the field
- Real-time validation via Zod `searchParamsSchema`

### 7.2 Form-Level / API Errors

| HTTP Status | Scenario | UI Behavior |
|-------------|----------|-------------|
| `400` | Validation failures (invalid params) | Inline validation hint + top alert banner |
| `401` | Guest attempts shopping action without authentication | Alert modal (no auto-close) → redirect to `/login?redirect=<path>` |
| `403` | Merchant/Admin attempts shopping action | Alert banner (destructive, no auto-close): "Shopping features are only available to buyers" |
| `429` | Rate limit exceeded on public search | `alertError` banner: "Too many requests. Please wait {seconds} seconds" + retry countdown |
| `500` | Server error | `alertError` banner: "Something went wrong" + retry button |
| Network error | Offline / connection failure | `alertError` banner: "Network error. Please check your connection" + retry button |

### 7.3 Loading States

- Skeleton shimmer grid (`sklLoading`) during fetch; matches current view mode (grid blocks or list rows)
- Spinner on Apply/Search buttons during API calls
- `placeholderData: (prev) => prev` in TanStack Query preserves previous results during page changes (`keepPreviousData`)

### 7.4 Empty Results

- `EmptyState` component with message + illustration: "No products found" + "Try clearing filters or broadening your keyword"
- Includes `btnResetFilters` action button

---

## 8. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_SEARCH_01](./DD_Search_And_Filter_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_SEARCH_03](./DD_Search_And_Filter_03_API_ENDPOINTS.md) | Backend REST API contract |
| [DD_SEARCH_04](./DD_Search_And_Filter_04_DTOS_AND_TYPES.md) | DTO and type definitions |
| [DD_SEARCH_05](./DD_Search_And_Filter_05_BUSINESS_LOGIC.md) | Backend business rules and caching |
| [機能設計書_Search_And_Filter](../機能設計書%20_Search_And_Filter.md) | Full functional specification (v2.3) |
| [画面項目設計書_Search_And_Filter](../画面項目設計書_Search_And_Filter.md) | Screen items specification (v2.6) |
