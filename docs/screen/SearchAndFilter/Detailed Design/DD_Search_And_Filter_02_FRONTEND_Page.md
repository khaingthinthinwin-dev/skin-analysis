# DD_SEARCH_02 — Frontend Page (Search & Filter)

> **Doc ID:** SKM-DD-SEARCH-02 | **Version:** 1.2 | **Status:** Released  
> **Last Updated:** 2026-10-15

> **Codebase alignment:** Aligned with `frontend/src/pages/buyer/Products.tsx`,
> `frontend/src/features/search/**` and `frontend/src/schemas/search.schema.ts` as of 2026-10-15.

---

## 1. Overview

The Search & Filter page is the product discovery hub of the Cosmetics Finder platform. It consists of a page header, a full-width search bar, a sponsored ad slide panel (conditional), a row of active filter chips, a filters panel (desktop sidebar / mobile drawer), and a results area with product grid/list, sort control, view mode toggle, and pagination. All search state is managed via URL query parameters (React Router `useSearchParams`), ensuring results are shareable and back-button friendly.

**Page layout flow:** A → B → Advertisement → C+D — The page header ([A]) renders at the top, followed by the full-width search bar ([B]), then the sponsored ad slide panel ([D0]), then the active filter chips, then the filters panel ([C]) and results area ([D]) in the same row (desktop) / stacked (mobile).

- **File Path:** `frontend/src/pages/buyer/Products.tsx` (default export `Products`)
- **Route:** `/products` (public, shareable), `/buyer/products` and `/buyer/search` (buyer area). Product detail: `/buyer/products/:slug`.
- **Layout:** Page → search bar → ad panel → filter chips → (filters sidebar | results) → footer

---

## 2. Layout Structure

The page follows the flow: **A → B → Advertisement → C+D**. The search bar renders full width at the top; the ad panel renders below it; the filter chips render below the ad panel; then the filters panel and results area render side-by-side on desktop.

### 2.1 Desktop Layout (≥ 1024px)

```
┌──────────────────────────────────────────────────────────────────────┐
│ [A] PAGE HEADER — Logo + "Cosmetics Finder"                          │
├──────────────────────────────────────────────────────────────────────┤
│ [B] SEARCH BAR (full width)                                          │
│     [B1] Keyword Input                            [B2] Search Button │
├──────────────────────────────────────────────────────────────────────┤
│ [D0] SPONSORED AD PANEL (conditional, full container width)          │
│      image/banner · title · description · CTA badge                  │
├──────────────────────────────────────────────────────────────────────┤
│ [D3] ACTIVE FILTER CHIPS (+ Clear All)                               │
├──────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────┐  ┌─────────────────────────────────────────┐  │
│ │ [C] FILTERS PANEL  │  │ [D] RESULTS AREA                        │  │
│ │ [C1] Categories    │  │ [D1] Sort Select   [D2] View Toggle     │  │
│ │ [C2] Skin Type     │  │ [D3] Product Grid (3 cols) / List       │  │
│ │ [C3] Price Range   │  │ (cond.) Spinner / Empty / Error         │  │
│ │ [C4] Rating        │  │ [D4] Pagination                         │  │
│ │ [C5] Clear All     │  │                                         │  │
│ └────────────────────┘  └─────────────────────────────────────────┘  │
│                                                                      │
│ [E] FOOTER CONTROLS — [Language Toggle] [Theme Toggle]               │
└──────────────────────────────────────────────────────────────────────┘
```

### 2.2 Mobile Layout (< 1024px)

```
┌───────────────────────────────────────────────────────┐
│ [A] PAGE HEADER (Logo + System Name)                  │
│ [B] SEARCH BAR (full width)                           │
│ [D0] SPONSORED AD PANEL (conditional)                 │
│ [D3] ACTIVE FILTER CHIPS (+ Clear All)                │
│ [D1] Sort Select        [D2] View Toggle              │
│ [Filters] button (outline, opens filter drawer)       │
│ [D3] PRODUCT GRID (1–3 cols) / LIST (stacked rows)    │
│ [D4] Pagination                                       │
│ [E] FOOTER CONTROLS ([Language] [Theme])              │
│                                                       │
│ [C] FILTER SHEET (right-side drawer, conditional)     │
│    [C1] Categories  [C2] Skin Type  [C3] Price Range  │
│    [C4] Rating                                        │
│    [C5] Clear All   [Show N Products]                 │
└───────────────────────────────────────────────────────┘
```

### 2.3 Responsive Layout Breakpoints

| Breakpoint | Min Width | Layout Behavior |
|:-----------|:----------|:----------------|
| Mobile (default) | 0px | Search bar full width. Filters opened via a "Filters" trigger button as a right-side sheet (drawer). Grid view renders 1 column; List view renders stacked rows. Sponsored ad panel below the search bar, full width. |
| Tablet (`sm:`/`md:`) | 640px / 768px | Grid view renders 2–3 columns. Filters still in the mobile drawer until `lg:`. |
| Desktop (`lg:`) | 1024px | Filters sidebar (`w-72`, sticky) shown on the left, results area on the right with a 3-column grid. "Filters" trigger hidden. |

---

## 3. Form State & Validation (Zod `searchParamsSchema` + TanStack Query)

All search state is derived from URL query parameters, parsed and validated with Zod. TanStack Query manages the query lifecycle, caching, and deduplication.

### 3.1 Search Params Schema

```typescript
// frontend/src/schemas/search.schema.ts
import { z } from 'zod'

const skinTypeEnum = z.enum(['dry', 'oily', 'combination', 'sensitive', 'normal'])
const sortFieldEnum = z.enum(['price', 'rating', 'createdAt'])
const sortOrderEnum = z.enum(['asc', 'desc'])

export const searchParamsSchema = z.object({
  q: z.string().max(255).optional().default(''),
  categoryId: z.string().uuid().optional().default(''),
  skinTypes: z
    .union([z.string(), z.array(skinTypeEnum)])
    .optional()
    .transform((v) => {
      if (Array.isArray(v)) return v
      if (!v) return []
      return v.split(',').filter(Boolean) as z.infer<typeof skinTypeEnum>[]
    })
    .default([]),
  ingredients: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (Array.isArray(v) ? v : v ? v.split(',').filter(Boolean) : []))
    .default([]),
  tags: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (Array.isArray(v) ? v : v ? v.split(',').filter(Boolean) : []))
    .default([]),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  rating: z.coerce.number().min(1).max(5).optional(),
  sort: sortFieldEnum.optional().default('createdAt'),
  order: sortOrderEnum.optional().default('desc'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(12),
}).refine(
  (data) =>
    data.minPrice === undefined ||
    data.maxPrice === undefined ||
    data.minPrice <= data.maxPrice,
  { message: 'Minimum price cannot exceed maximum price', path: ['minPrice'] },
)

export type SearchParams = z.infer<typeof searchParamsSchema>

export const SORT_OPTIONS = [
  { value: 'createdAt:desc', label: 'Newest' },
  { value: 'price:asc', label: 'Price: Low to High' },
  { value: 'price:desc', label: 'Price: High to Low' },
  { value: 'rating:desc', label: 'Highest Rated' },
] as const

export const PAGE_SIZE_OPTIONS = [12, 24, 48] as const
```

> **Default page limit is 12.** `PAGE_SIZE_OPTIONS` is `[12, 24, 48]`.

### 3.2 Product Search Query Hook

```typescript
// frontend/src/features/search/hooks/useProductSearch.ts
export function useProductSearch(enabled = true) {
  const [searchParams, setSearchParams] = useReactRouterSearchParams()

  const parsedParams = useMemo(() => {
    const raw = Object.fromEntries(searchParams.entries())
    return searchParamsSchema.parse(raw)
  }, [searchParams])

  const query = useQuery({
    queryKey: ['products', parsedParams] as const,
    queryFn: ({ signal }) => productService.search(parsedParams, signal),
    placeholderData: (prev) => prev,          // keepPreviousData
    staleTime: 30_000,
    enabled,
  })

  const updateParams = (updates: Partial<SearchParams>) => {
    const next = { ...parsedParams, ...updates, page: updates.page ?? 1 }
    setSearchParams(serializeParams(next))
  }

  return { ...query, params: parsedParams, updateParams }
}

// serializeParams omits default values (q/categoryId empty, arrays empty,
// sort=createdAt, order=desc, page=1, limit=12) from the URL.
```

### 3.3 Category Tree Query

```typescript
// frontend/src/features/search/hooks/useCategoryTree.ts
export function useCategoryTree() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: categoryService.getTree,
    staleTime: 30 * 60 * 1000, // 30 min
    throwOnError: false,
  })
}
```

The page also issues the same `['categories']` query inline (via `categoryService.getTree`, `staleTime: 30 * 60 * 1000`) to resolve category names for chips.

---

## 4. Sub-Components

### 4.1 SearchBar Component

- **File Path:** `frontend/src/features/search/components/SearchBar.tsx`
- Renders a `<form role="search">` with the keyword input, a gradient Search icon button (`type="submit"`), and an inline Clear (×) button shown only when the input is non-empty
- Debounce: `DEBOUNCE_MS = 300`; typing updates the draft and fires `onChange` after 300ms of idle
- Enter key or the Search button calls `flush()`, which cancels the debounce and calls both `onChange` and `onSubmit` immediately (ST-DEB-003)
- Clear (×) cancels the debounce and calls `onChange('')` + `onSubmit('')`
- All labels/aria come from i18n (`buyer.search.placeholder`, `buyer.search.aria.*`)

### 4.2 FilterPanel Component

- **File Path:** `frontend/src/features/search/components/FilterPanel.tsx`
- Desktop/tablet (`variant="desktop"`): rendered in the left sidebar; mobile (`variant="mobile"`): rendered inside the filter drawer
- Groups: Category (`CategorySelect`), Skin Type (checkboxes; pill buttons on mobile), Price Range (min/max number inputs), Rating (radio group)
- Skin types: `dry`, `oily`, `combination`, `sensitive`, `normal` (multi-select)
- Rating options: `4.5`, `4.0`, `3.5`, `3.0` (single-select radio)
- **No "Apply" button** — filter changes propagate immediately via `onUpdate`. Price values commit on input blur (or Enter). A single **Clear All** button is shown when `hasActiveFilters` and `onReset` is provided
- Price validation uses `validatePriceRange` (`frontend/src/lib/priceRangeValidation.ts`); on error it shows an inline `role="alert"` message and notifies the page via `onPriceErrorChange(true)`
- Mobile drawer is a right-side `Sheet` containing the same groups plus a footer with **Clear All** and a **"Show N Products"** primary button that closes the drawer

### 4.3 CategorySelect Component

- **File Path:** `frontend/src/features/search/components/CategorySelect.tsx`
- Flattens the nested category tree (`flattenCategories`) and injects an "All" item (`buyer.search.all`) at the top
- Single-select: clicking a category calls `onSelect(id)`; clicking "All" clears `categoryId`
- Collapses to `COLLAPSED_COUNT = 5` items with a **View More / View Less** toggle rendered only when `allItems.length > 5`
- Backend includes all descendant categories in results (BR-SEARCH-010)
- Variants: `default` (sidebar list, indented by depth), `pills` (mobile), `nav`

### 4.4 FilterChips Component

- **File Path:** `frontend/src/features/search/components/FilterChips.tsx`
- Renders one chip per active filter value from URL params (BR-SEARCH-019): keyword (`"q"`), category (resolved name), each skin type, each ingredient, each tag, min price (`Min: Ks …`), max price (`Max: Ks …`), and rating (`N+ Stars`)
- Returns `null` when there are no chips
- Each chip has a Close (×) button (`aria-label` "Remove {label}") that removes that single value and resets `page` to 1 (BR-SEARCH-022)
- A **Clear All** button (i18n `buyer.search.clearAll`) is shown when `onClearAll` is provided; it removes all filters (BR-SEARCH-023)
- Category chip label uses the resolved category name passed by the page

### 4.5 ViewToggle Component

- **File Path:** `frontend/src/features/search/components/ViewToggle.tsx`
- `role="group"` with two `size="icon"` buttons (Grid / List) using `LayoutGrid` / `List` icons
- Active segment uses the default button variant and `aria-pressed={true}`; inactive segment is `ghost`
- Persists to `localStorage` key `search.viewMode` (managed by the page); defaults to Grid; never written to URL
- Switching views re-renders already-fetched `data` — no API refetch triggered

### 4.6 SortSelect Component

- **File Path:** `frontend/src/features/search/components/SortSelect.tsx`
- shadcn `Select` driven by `SORT_OPTIONS` (`createdAt:desc`, `price:asc`, `price:desc`, `rating:desc`); value is `"{sort}:{order}"`
- Labels come from i18n (`buyer.search.sortOptions.*`); trigger placeholder is `buyer.search.sortBy`
- Change calls `onChange(sort, order)`; the page resets `page` to 1

### 4.7 ProductCard Component

- **File Path:** `frontend/src/features/search/components/ProductCard.tsx`
- `view="grid"`: vertical `Card` with image, SALE badge (when `compareAtPrice`), out-of-stock badge, wishlist heart (top-right), shop name, name, star rating, up to 3 skin-type badges, price (`Ks` formatted) and an add-to-cart button shown only when `isInStock`
- `view="list"`: horizontal row — thumbnail left; title, description, rating, price/compare-at price, wishlist and add-to-cart controls on the right
- Grid card is keyboard-activatable (`role="link"`, `tabIndex={0}`, Enter/Space); both views navigate via `productLink`
- Prices formatted by `formatKs` as `{value.toLocaleString('en-US')} Ks`; missing images fall back to the i18n "No image" placeholder
- Wishlist/cart actions stop propagation and show per-item loading spinners

### 4.8 Pagination (inline in `Products.tsx`)

- Rendered inside the results card only when `meta.totalPages > 1`
- `getPageItems` produces page numbers with `'ellipsis'` placeholders (windowed for > 5 pages)
- Prev/Next buttons (`aria-label` "Previous page" / "Next page") disable at the bounds; current page uses `aria-current="page"`
- Clicking a page or Prev/Next updates the `page` param

### 4.9 SponsoredAdSlider Component

- **File Path:** `frontend/src/features/search/components/SponsoredAdSlider.tsx`
- Renders the sponsored advertisement slide panel below the full-width search bar, above the filter chips and filters/results row
- Fetches ads via `useSponsoredAds('search_page_banner')` → `GET /api/v1/search/ads?placement=search_page_banner`; parallel to product results, never blocking product loading
- Filters the response client-side to `placement === 'search_page_banner'`, `approvalStatus === 'approved'`, and an active schedule window (`startsAt <= now <= expiresAt`)
- When no eligible ads are returned and the request is not pending/errored, a built-in `FALLBACK_ADS` set (e.g. "Daily Moisture Cream") is shown
- Slides through `activeAds` with `AUTO_SLIDE_MS = 5000`; pauses on hover, keyboard focus, or `prefers-reduced-motion: reduce`
- Ad title/description can be hydrated from the linked product SKU via `useAdProducts`, which calls the buyer endpoint `GET /api/v1/products/:sku`
- Click-through: `/buyer/products/{sku}` when a SKU exists, else `fallbackProductId`, else `ad.target_url`/`ad.linkUrl`, else `/buyer/products`; external `http(s)` URLs use `window.location.assign`
- Hides (`return null`) when there are no ads; image failures fall back through product image → ad image → sample image → placeholder

---

## 5. Action Buttons & Handlers

### 5.1 Keyword Search (Debounced)

- **Input:** keyword input (`SearchBar`) — 300ms debounce (ST-DEB-001)
- **Action:** after 300ms of idle, `onChange` → `handleFilterUpdate({ q })` → `serializeToUrl` → URL update → TanStack Query refetches `['products', params]`

### 5.2 Search Button / Enter (Immediate)

- Calls `flush()` on the form submit, bypassing debounce (ST-DEB-003) and updating `q` immediately

### 5.3 Clear Search

- Inline × in the input; cancels debounce and clears `q`

### 5.4 Filter Change (immediate)

- `handleFilterUpdate(updates)` merges `{ ...params, ...updates, page: 1 }` and writes to the URL
- Blocked entirely while `priceRangeErrorRef.current` is `true` (invalid price range)

### 5.5 Price Range Commit

- On blur/Enter, `validatePriceRange(priceMin, priceMax)` runs; on error the inline alert shows and `onPriceErrorChange(true)` cancels the in-flight `['products']` query and disables further updates

### 5.6 Clear All

- `handleClearAll` clears all filter params, resets price drafts/errors, keeps `sort`/`order`/`limit`, and sets `page: 1`

### 5.7 Sort Change

- `onChange(sort, order)` → `handleFilterUpdate({ sort, order })`; resets `page` to 1

### 5.8 View Mode Toggle

- `setView(next)` re-renders using already-fetched `data`; writes `localStorage['search.viewMode']`; URL untouched

### 5.9 Pagination

- `handlePageUpdate({ page })` updates the `page` param (preserving other params); `keepPreviousData` keeps prior results visible during the fetch

### 5.10 Mobile Filter Drawer

- **Button:** "Filters" (outline, `lg:hidden`) → opens the right-side `Sheet`
- Footer: **Clear All** (text button) and **Show N Products** (primary, closes the sheet; label from `buyer.search.showProducts` with the current total)

---

## 6. Lookup Data

Filter options are sourced from the database and hardcoded enums:

| Filter | Source | Values |
|--------|--------|--------|
| Skin Type | Hardcoded enum | `dry`, `oily`, `combination`, `sensitive`, `normal` |
| Categories | `GET /api/v1/search/categories` (cached, TTL 30 min) | Nested tree, flattened with an "All" item |
| Rating | Hardcoded | `4.5`, `4.0`, `3.5`, `3.0` |
| Sort Options | `SORT_OPTIONS` | `newest` (`createdAt:desc`), `price:asc`, `price:desc`, `rating:desc` |
| Page Size | `PAGE_SIZE_OPTIONS` | `12`, `24`, `48` (default `12`) |
| View Mode | Hardcoded | `grid`, `list` (persisted to `localStorage`) |

---

## 7. Internationalization (i18n)

- **Runtime locale files:** `frontend/public/locales/{en,ja,my}/translation.json`
- **i18n config:** `frontend/src/i18n.ts` — `fallbackLng: 'en'`, `supportedLngs: ['en', 'my', 'ja']`, HTTP backend loading `/locales/{{lng}}/{{ns}}.json`, `defaultNS: 'translation'`
- **Language switcher:** `SUPPORTED_LANGUAGES` in `frontend/src/lib/constants.ts` = `[{ en, 'English' }, { my, 'မြန်မာ' }, { ja, '日本語' }]`
- **Screen keys:** all Search & Filter strings live under the `buyer.search.*` namespace, e.g.:

| Key | English | Japanese | Myanmar |
|-----|---------|----------|---------|
| `buyer.search.placeholder` | Search by product name, ingredient, or concern... | — | — |
| `buyer.search.filters` | Filters | フィルター | စစ်ထုတ်ရန် |
| `buyer.search.clearAll` | Clear All | すべてクリア | အားလုံးရှင်းလင်းရန် |
| `buyer.search.noProducts` | No products found | 商品が見つかりません | ကုန်ပစ္စည်း မတွေ့ပါ |
| `buyer.search.guestWishlist` | Please log in to use the wishlist | お気に入りを利用するにはログインしてください | ဆန္ဒစာရင်းအသုံးပြုရန် အကောင့်ဝင်ပါ |
| `buyer.search.guestCart` | Please log in to add items to your cart | カートに商品を追加するにはログインしてください | စျေးခြင်းဘူးထဲ ထည့်ရန် အကောင့်ဝင်ပါ |

> **Known localization gaps (hard-coded English):** price-range validation messages in
> `frontend/src/lib/priceRangeValidation.ts` ("Price cannot be negative.",
> "Minimum price cannot be greater than maximum price."), the pagination Prev/Next
> `aria-label`s, and the ad slider Prev/Next `aria-label`s
> ("Previous advertisement" / "Next advertisement").

---

## 8. Error Handling

### 8.1 Field-Level Errors

- Invalid price range (`min > max`) or negative price shows an inline `role="alert"` message below the price inputs
- The page blocks URL/query updates and cancels the in-flight product query while the price error is present

### 8.2 Product List / API Errors

| Scenario | UI Behavior |
|----------|-------------|
| Product list request fails (`isError`) | Inline error state: icon + `buyer.search.errorTitle` ("Something went wrong") + `buyer.search.errorDescription` ("Failed to load products. Please try again."). No auto-retry button — recovery is via changing URL state. |
| Guest attempts a shopping action | `Dialog` (no auto-close) with `buyer.search.loginRequired` title and a per-action message (`buyer.search.guestWishlist` / `buyer.search.guestCart`); buttons `common.cancel` and Login → `navigate('/login')` (no redirect param) |
| Merchant/Admin attempts a shopping action | **Not enforced on the routed page.** `Products.tsx` guards only `!isAuthenticated` (guest). There is no merchant/admin shopping guard and no `SHOPPING_NOT_ALLOWED` error code in the codebase. The unrouted legacy `frontend/src/pages/buyer/SearchFilter.tsx` shows a plain `toast.error('Shopping features are only available to buyers.')`; PCL A-07 is therefore an unimplemented/known gap for this screen. |
| Add-to-cart generic failure (non-409) | `toast.error` with `buyer.search.toastError` |
| Add-to-cart 409 | Opens the "Already in Cart" dialog (`DuplicateCartAlertDialog`) |
| Wishlist 409 | `toast.info` with `buyer.search.alreadyInWishlist` ("Already in your wishlist") |
| Wishlist generic failure (non-409) | `toast.error` with `buyer.search.toastError` |

### 8.3 Loading States

- `isLoading`: a centered spinner (`Loader2`) in the results area
- `placeholderData: (prev) => prev` preserves previous results during pagination/filter changes (`keepPreviousData`)
- Per-item spinners on the wishlist heart and add-to-cart button via `isWishlistLoading` / `isCartLoading`

### 8.4 Empty Results

- Empty state: icon + `buyer.search.noProducts` ("No products found") + `buyer.search.noProductsHint` ("Try adjusting your search or filter criteria.")
- **There is no reset button in the empty state** — users clear filters via the FilterChips / FilterPanel "Clear All" controls

---

## 9. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_SEARCH_01](./DD_Search_And_Filter_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_SEARCH_03](./DD_Search_And_Filter_03_API_ENDPOINTS.md) | Backend REST API contract |
| [DD_SEARCH_04](./DD_Search_And_Filter_04_DTOS_AND_TYPES.md) | DTO and type definitions |
| [DD_SEARCH_05](./DD_Search_And_Filter_05_BUSINESS_LOGIC.md) | Backend business rules and caching |
| [DD_SEARCH_06](./DD_Search_And_Filter_06_TEST_SPEC.md) | Test specification (synced to PCL scenario IDs) |
| [SearchAndFilter_PCL](../SearchAndFilter_PCL.md) | Program checklist (scenario IDs N / A / B / I) |
| [機能設計書_Search_And_Filter](../機能設計書%20_Search_And_Filter.md) | Full functional specification (v2.3) |
| [画面項目設計書_Search_And_Filter](../画面項目設計書_Search_And_Filter.md) | Screen items specification (v2.6) |
