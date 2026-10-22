---

## 2. Page Component (ProductDetail.tsx)

### 2.1 Component Structure

\\\	ext
ProductDetail (page)
├── AdBannerSlider (placement="productDetail_page_banner") — conditional, non-merchant only
├── Back button (ArrowLeft, navigate(-1))
├── Grid (gallery + info, md:grid-cols-2)
│   ├── ProductGallery (images, name)
│   └── ProductInfo (product, isMerchantView)
├── ProductTabs (product, showReviewForm, showProductDetails)
├── SimilarProducts (idOrSlug) — conditional, non-merchant only
└── Sticky mobile CTA bar (ProductPurchaseActions) — fixed bottom, md:hidden
\\\

### 2.2 Props and State

| Hook / Variable | Source | Purpose |
|-----------------|--------|---------|
| \useParams<{ id: string }>()\ | React Router | Route parameter \id\ → \idOrSlug\ |
| \useAuth()\ | AuthProvider | \isAuthenticated\, \user\ (role) |
| \useProductDetail(idOrSlug)\ | TanStack Query | Fetches product detail, always refetch on mount |
| \isMerchantView\ | \user?.role === 'merchant'\ | Hides CTAs for merchant users |

## 2. Page Component (ProductDetail.tsx)

### 2.1 Component Structure

```text
ProductDetail (page)
├── AdBannerSlider (placement="productDetail_page_banner") — conditional, non-merchant only
├── Back button (ArrowLeft, navigate(-1))
├── Grid (gallery + info, md:grid-cols-2)
│   ├── ProductGallery (images, name)
│   └── ProductInfo (product, isMerchantView)
├── ProductTabs (product, showReviewForm, showProductDetails)
├── SimilarProducts (idOrSlug) — conditional, non-merchant only
└── Sticky mobile CTA bar (ProductPurchaseActions) — fixed bottom, md:hidden
```

### 2.2 Props and State

| Hook / Variable | Source | Purpose |
|-----------------|--------|---------|
| `useParams<{ id: string }>()` | React Router | Route parameter `id` → `idOrSlug` |
| `useAuth()` | AuthProvider | `isAuthenticated`, `user` (role) |
| `useProductDetail(idOrSlug)` | TanStack Query | Fetches product detail, always refetch on mount |
| `isMerchantView` | `user?.role === 'merchant'` | Hides CTAs for merchant users |
| `showCTA` | `!isMerchantView && (!isAuthenticated || user?.role === 'buyer')` | Controls sticky mobile purchase bar visibility |

### 2.3 UI States

| State | Condition | Render |
|-------|-----------|--------|
| No `id` | `!id` | "Invalid product" message |

## 3. Hooks (`useProductDetail.ts`)

All hooks live in `frontend/src/features/buyer/products/hooks/useProductDetail.ts`.

### 3.1 `useProductDetail(idOrSlug)`

```typescript
export function useProductDetail(idOrSlug: string) {
  return useQuery<ProductDetail>({
    queryKey: ['product', idOrSlug],
    queryFn: () => productService.getDetail(idOrSlug),
    enabled: !!idOrSlug,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });
}
```

- **Query Key:** `['product', idOrSlug]`
- **Cache:** `staleTime: 0`, `gcTime: 0`, `refetchOnMount: 'always'` — no stale cache; fresh fetch on every mount

### 3.2 `useProductReviews(idOrSlug, params)`

```typescript
export function useProductReviews(idOrSlug: string, params: ReviewsParams) {
  return useQuery<ReviewListResponse>({
    queryKey: ['product', idOrSlug, 'reviews', params],
    queryFn: () => productService.getReviews(idOrSlug, params),
    enabled: !!idOrSlug,
    staleTime: 60_000,
  });
}
```

- **Query Key:** `['product', idOrSlug, 'reviews', params]`
- **Params:** `page`, `limit`, `sort`, `rating`
- **Cache:** `staleTime: 60_000` (1 minute)

### 3.3 `useSimilarProducts(idOrSlug, limit)`

```typescript
export function useSimilarProducts(idOrSlug: string, limit = 4) {
  return useQuery<SimilarProduct[]>({
    queryKey: ['product', idOrSlug, 'similar', limit],
    queryFn: () => productService.getSimilar(idOrSlug, limit),
    enabled: !!idOrSlug,
    staleTime: 5 * 60 * 1000,
  });
}
```

- **Default Limit:** 4
- **Cache:** `staleTime: 5 minutes`

### 3.4 `useCreateReview(idOrSlug)`

Mutation hook. On success: invalidates `['product', idOrSlug, 'reviews']`, `['product', idOrSlug, 'can-review']`, `['product', idOrSlug]`; shows success toast. On error: shows error toast with server message.

### 3.5 `useActivePromotions(idOrSlug)`

```typescript
export function useActivePromotions(idOrSlug: string) {
  return useQuery<ActivePromotion[]>({
    queryKey: ['product', idOrSlug, 'promotions'],
    queryFn: () => productService.getPromotions(idOrSlug),
    enabled: !!idOrSlug,
    staleTime: 5 * 60 * 1000,
  });
}
```

### 3.6 `useSidebarAds(idOrSlug)`

```typescript
export function useSidebarAds(idOrSlug: string) {
  return useQuery<SidebarAdvertisement[]>({
    queryKey: ['product', idOrSlug, 'advertisements'],
    queryFn: () => productService.getSidebarAds(idOrSlug),
    enabled: !!idOrSlug,
    staleTime: 5 * 60 * 1000,
  });
}

## 4. Sub-Components

| Component | File Path | Purpose |
|-----------|-----------|---------|
| ProductGallery | `features/buyer/products/components/ProductGallery.tsx` | Main image (`images[0]` as cover) + thumbnail list with swap behavior |
| ProductInfo | `features/buyer/products/components/ProductInfo.tsx` | Name, rating summary, price, compare-at price, stock status, SKU, skin-type badges, merchant info |
| ProductTabs | `features/buyer/products/components/ProductTabs.tsx` | Description / Ingredients / Reviews tabs with keyboard navigation |
| ProductReviews | `features/buyer/products/components/ProductReviews.tsx` | Review list, pagination, review form (auth-gated) |
| SimilarProducts | `features/buyer/products/components/SimilarProducts.tsx` | Product card grid, navigates to `/products/:id` |
| ProductPurchaseActions | `features/buyer/products/components/ProductPurchaseActions.tsx` | Quantity stepper, Add to Cart, Wishlist toggle |
| QuantityStepper | `features/buyer/products/components/QuantityStepper.tsx` | Decrement/increment within `[1, stockQuantity]` |
| ReviewForm | `features/buyer/products/components/ReviewForm.tsx` | Rating stars, title, body (client-required; no image-upload control — `images` is DTO-only) |
| ReviewReportDialog | `features/buyer/products/components/ReviewReportDialog.tsx` | Report reason (spam/inappropriate/fake/other) + optional detail |
| ActivePromotion | `features/buyer/products/components/ActivePromotion.tsx` | Promotion discount badge from `promotions[0]` (component implemented but currently unmounted) |
| SidebarAdvertisements | `features/buyer/products/components/SidebarAdvertisements.tsx` | Sponsored ad slider (max 5, auto-rotate 5s) |

## 5. Local UI State

| State | Type | Default | Description |
|-------|------|---------|-------------|
| `activeImageIndex` | `number` | `0` | Index of the currently displayed main image; resets to `0` when product changes |

## 6. Error Handling

### 6.1 Page-Level Errors

| Status | Condition | UI Behavior |
|--------|-----------|-------------|
| 404 | Product not found or inactive (`is_active = false` or `licenseStatus !== 'approved'`) | EmptyState: "Product not found." + "Browse products" button → `/products` |
| Network error | Query failure | Error state shown; user can navigate back |

### 6.2 API Error Mapping

| HTTP Status | Scenario | Frontend Behavior |
|-------------|----------|-------------------|
| 400 | Invalid `idOrSlug` / validation failure | Error toast or inline field error |
| 401 | Mutation unauthenticated | Login modal / redirect to `/login` |
| 403 | Non-buyer role on mutation | Redirect to `/unauthorized` |
| 404 | Product not found | EmptyState with "Browse products" link |
| 409 | Duplicate review / wishlist / report | Keep state (filled heart / disabled form) + toast |
| 422 | Not a verified purchaser / out of stock | Explanation text or disabled CTA |
| 429 | Rate limit exceeded (review report) | Retry countdown toast |
| NET_ERR | Network failure | Stable page content + retry action for affected query |

### 6.3 Loading States

- Skeleton loaders for product, gallery, review, related-product, and promotion queries on initial load.
- Mutation controls disabled with spinner while pending.
- Below-fold related products and reviews are lazy-loaded.
- Duplicate form submission prevented while review or cart mutations are active.

## 7. Cross-References

| Related Document | Purpose |
|------------------|---------|
| [DD_PROD_01](./DD_ProductDetail_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_PROD_03](./DD_ProductDetail_03_API_ENDPOINTS.md) | API endpoint contracts consumed by frontend hooks |
| [DD_PROD_04](./DD_ProductDetail_04_DTOS_AND_TYPES.md) | DTO and type definitions used in form state and validation |
| [DD_PROD_05](./DD_ProductDetail_05_BUSINESS_LOGIC.md) | Business logic and validation rules |
| [DD_PROD_06](./DD_ProductDetail_06_TEST.md) | Frontend component and E2E test specification |
| [機能設計書_ProductDetail](../機能設計書_ProductDetail.md) | Functional requirements and operation specifications (v8.0) |
| [画面項目設計書_ProductDetail](../画面項目設計書_ProductDetail.md) | Screen layout, items, validation, API mappings, and i18n (v1.10) |
| [データベース設計書_DATABASE_SPEC](../../../core-work/データベース設計書_DATABASE_SPEC.md) | Table constraints and UUID data model (v2.4) |
| [開発ルール_DEVELOPMENT_RULES](../../../core-work/開発ルール_DEVELOPMENT_RULES.md) | Security, accessibility, API, and quality rules (v2.1) |

---

*End of Frontend Page Design (Product Detail)*

| `activeTab` | `'description' \| 'ingredients' \| 'reviews'` | `'description'` | Active product tab |
| `quantity` | `number` | `1` | Cart quantity; clamped to `1..stockQuantity` |

- Reviews are only loaded after the Reviews tab becomes active.
- The review form is hidden for unauthenticated visitors; a login prompt is shown instead.

```

### 3.7 `useCanReview(idOrSlug)`

```typescript
export function useCanReview(idOrSlug: string) {
  return useQuery<{ canReview: boolean; reason: string | null }>({
    queryKey: ['product', idOrSlug, 'can-review'],
    queryFn: () => productService.canReview(idOrSlug),
    enabled: !!idOrSlug,
    staleTime: 0,
    refetchOnMount: 'always',
    retry: false,
  });
}
```

- Returns `{ canReview: boolean; reason: 'not_delivered' | 'already_reviewed' | null }`

### 3.8 `useReportReview(reviewId)`

Mutation hook. Handles 409 ("already reported") and 429 (rate limited) with specific toasts.

| Loading | `isLoading` | Skeleton loaders (grid layout) |
| Error / Not Found | `isError \|\| !product` | "Product not found." + "Browse products" button → `/products` |
| Success | Product data | Full page layout with all sections |

### 2.4 Section Behaviors

| Section | Component | Behavior |
|---------|-----------|----------|
| Ad Banner Slider | AdBannerSlider | `placement="productDetail_page_banner"`, `fallbackProductId={product.id}`; hidden for merchant views |
| Product Gallery | ProductGallery | Main image + thumbnails; `images[0]` as cover |
| Product Info | ProductInfo | Name, rating, price, compare-at, stock, SKU, skin types, merchant |
| Product Tabs | ProductTabs | Description / Ingredients / Reviews tabs; review form gated by auth |
| Similar Products | SimilarProducts | Lazy-loaded, `idOrSlug={product.id}` |
| Sticky CTA Bar | ProductPurchaseActions | Mobile only, fixed bottom; quantity stepper + Add to Cart + Wishlist |

