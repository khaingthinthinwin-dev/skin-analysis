# DD_PROD_02 - Frontend Page (Product Detail)

> **Doc ID:** SKM-DD-PROD-02 | **Version:** 1.1 | **Status:** Draft  
> **Last Updated:** 2026-08-24

---

## 1. Overview

The Product Detail page renders one active product and its conversion actions. Visitors can view the product, reviews, related products, and promotions. Authenticated buyers can add the product to their wishlist, request cart addition, and submit a review when eligible.

- **File Path:** `frontend/src/pages/ProductDetailPage.tsx`
- **Route:** `/products/:slug`
- **Feature Root:** `frontend/src/features/products`
- **Layout:** Two-column gallery and product information on desktop; stacked content with a sticky purchase action bar on mobile.

---

## 2. Layout Structure

The page uses a constrained content container. The gallery and product information are side by side at `lg` (1024px) and stacked below that breakpoint. Purchase actions are fixed at the bottom of the mobile viewport.

### 2.1 Desktop Layout

```text
┌──────────────────────────────────────────────────────────────────┐
├───────────────────────────────┬──────────────────────────────────┤
│ ProductGallery                │ ProductInfo                      │
│ [Main image]                  │ Name, rating, price, stock, SKU  │
│ [Thumbnail list]              │ Skin types                       │
│                               │ Quantity, Add to Cart, Wishlist  │
│                               │ Sold by / active promotions      │
│                               │ Sidebar ads (sponsored slider)   │
├───────────────────────────────┴──────────────────────────────────┤
│ ProductTabs: Description | Ingredients | Reviews (count)          │
│ Reviews: login prompt or review form, list, pagination            │
├──────────────────────────────────────────────────────────────────┤
│ RelatedProducts: up to eight product cards                        │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 Mobile Layout

```text
┌──────────────────────────────────────┐
│ Main image                           │
│ Horizontal thumbnail list            │
│ Product information and stock        │
│ Sold by / active promotions          │
│ Sidebar ads (sponsored) (conditional) │
│ Tabs and active tab panel            │
│ Related products (horizontal scroll) │
├──────────────────────────────────────┤
│ Sticky: quantity | Add to Cart | heart│
└──────────────────────────────────────┘
```

---

## 3. Form State & Validation (React Hook Form + Zod)

Only the review form uses React Hook Form. Quantity and gallery selection are local UI state. API mutations are managed through React Query mutation hooks.

### 3.1 Review Form Hook

```typescript
// frontend/src/features/products/hooks/useReviewForm.ts
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { reviewSchema, type ReviewFormData } from '../schemas/product-detail.schema';

export function useReviewForm() {
  const methods = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 0, title: '', body: '', images: [] },
    mode: 'onChange',
  });

  return { methods };
}
```

### 3.2 Page UI State

```typescript
type ProductTab = 'description' | 'ingredients' | 'reviews';

const [activeImageIndex, setActiveImageIndex] = useState(0);
const [activeTab, setActiveTab] = useState<ProductTab>('description');
const [quantity, setQuantity] = useState(1);

const maxQuantity = product?.stockQuantity ?? 0;
const canAddToCart = maxQuantity > 0 && quantity >= 1 && quantity <= maxQuantity;
```

- Reset `activeImageIndex` to `0` when the resolved product changes.
- Clamp quantity to `1..stockQuantity` after product data or stock changes.
- Load reviews only after the Reviews tab becomes active.
- Do not show the review form to unauthenticated visitors; render the login prompt instead.

### 3.3 Zod Validation Schema

```typescript
// frontend/src/features/products/schemas/product-detail.schema.ts
import { z } from 'zod';

export const reviewSchema = z.object({
  rating: z.number().int().min(1, 'Rating is required').max(5),
  title: z.string().max(255).optional(),
  body: z.string().max(5000).optional(),
  images: z.array(z.string().url()).max(5),
});

export const cartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1),
});

export type ReviewFormData = z.infer<typeof reviewSchema>;
export type CartItemFormData = z.infer<typeof cartItemSchema>;
```

---

## 4. Sub-Components

### 4.1 ProductGallery Component

- **File Path:** `frontend/src/features/products/components/ProductGallery.tsx`
- Renders `images[0]` as the initial cover image.
- Renders thumbnails only when more than one image exists.
- Exposes thumbnail buttons with descriptive image `alt` text and selected-state semantics.
- Shows a fallback image when the product has no image URLs.

### 4.2 ProductInfo Component

- **File Path:** `frontend/src/features/products/components/ProductInfo.tsx`
- Renders name, rating summary, current price, optional compare-at price, stock state, SKU, and skin-type badges.
- Computes discount percentage only when `compareAtPrice > price`.
- Makes the rating summary keyboard accessible and links it to the Reviews tab.

### 4.3 ProductPurchaseActions Component

- **File Path:** `frontend/src/features/products/components/ProductPurchaseActions.tsx`
- Owns quantity decrement/increment controls and delegates mutations to parent hooks.
- Disables cart submission while loading, when stock is zero, or when the selected quantity exceeds current stock.
- Shows the wishlist icon state from the wishlist query/mutation state.

### 4.4 ProductTabs Component

- **File Path:** `frontend/src/features/products/components/ProductTabs.tsx`
- Provides Description, Ingredients, and Reviews tabs with keyboard arrow-key navigation.
- Renders escaped description text and ingredient list data.
- Loads the review section only when its tab is selected.

### 4.5 ProductReviews Component

- **File Path:** `frontend/src/features/products/components/ProductReviews.tsx`
- Renders login prompt, eligibility message, review form, approved review cards, and pagination controls.
- Limits images to five review image URLs.
- Displays user name, avatar, verified-purchase status, rating, content, and created date.

### 4.6 RelatedProducts Component

- **File Path:** `frontend/src/features/products/components/RelatedProducts.tsx`
- Displays up to eight active product cards and excludes the current product.
- Uses below-fold lazy loading and hides the section for an empty successful result.

### 4.7 ActivePromotion Component

- **File Path:** `frontend/src/features/products/components/ActivePromotion.tsx`
- Displays coupon code, percentage or fixed discount, optional minimum order, validity period, and balance.
- Hides exhausted promotions and displays "Unlimited" when `maxUses` is `null`.

### 4.8 SidebarAdvertisements Component

- **File Path:** `frontend/src/features/products/components/SidebarAdvertisements.tsx`
- Loads eligible ads via `GET /api/v1/products/:slug/advertisements` (approved, paid, active, in-window, `product_sidebar` placement — Rules BR-PROD-020/021).
- Displays up to five ads per rotation, ordered Premium > Standard > Basic with round-robin within tier (Rule BR-PROD-022).
- Auto-rotates every 5 seconds; pauses on hover or keyboard focus; resumes on leave/blur.
- Renders a "Sponsored" label and shop name on every ad card; outbound links open in a new tab with `rel="noopener noreferrer nofollow sponsored"` (Rule BR-PROD-023).
- Hides the section entirely when the API returns an empty array.

---

## 5. Action Buttons & Handlers

### 5.1 Thumbnail Selection

- **Control Type:** button
- **Action:** Set `activeImageIndex` to the selected thumbnail index.
- **Result:** Main image changes and the selected thumbnail is announced to assistive technology.

### 5.2 Add to Cart

- **Control Type:** primary submit button
- **Validation:** Product UUID, integer quantity >= 1, selected quantity <= displayed stock.
- **Action:**
  1. Require authenticated buyer; otherwise navigate to `/login`.
  2. Call `cartService.addItem({ productId, quantity })`.
  3. On 201, show success toast and invalidate the cart count.
  4. On 400, show the insufficient-stock inline message.
  5. On 422, refresh product data and leave the CTA disabled.

> The UI calls the cart API only. It does not assume `order_items` is cart storage; cart persistence is pending a dedicated database design.

### 5.3 Add to Wishlist

- **Control Type:** icon button
- **Action:**
  1. Require authenticated buyer; otherwise show login gating.
  2. Optimistically mark the product as in the wishlist.
  3. Call `wishlistService.add(productId)`.
  4. Retain the state on 201 or 409; roll it back on other failures.

Wishlist removal is deliberately not implemented on this page.

### 5.4 Submit Review

- **Control Type:** primary submit button
- **Validation:** Rating 1-5; optional title max 255; optional body max 5000; maximum five image URLs.
- **Action:**
  1. Validate the review form.
  2. Call `reviewsService.create(productId, data)`.
  3. On 201, reset the form and invalidate product detail and review queries.
  4. On 409, disable the form and show the duplicate-review message.
  5. On 422, show the verified-purchase explanation.

### 5.5 Tab and Navigation Actions

- Review tab selection lazy-loads the approved review list.
- Rating summary selects and scrolls to the Reviews tab.
- Shop link navigates to `/shops/:shopSlug`.
- Related-product cards navigate to `/products/:slug`.

### 5.6 Sidebar Advertisement Load & Rotation

- **Trigger:** Product detail page loads the "Sidebar Advertisements" section.
- **Processing Logic:**
  1. `GET /api/v1/products/:slug/advertisements` returns eligible ads only (Rules BR-PROD-020/021).
  2. Render up to 5 ads per rotation, ordered Premium > Standard > Basic with round-robin within tier (Rule BR-PROD-022).
  3. Auto-rotate every 5 seconds; pause on hover/focus, resume on leave/blur.
  4. Show "Sponsored" label + shop name; ad link opens in a new tab with `rel="noopener noreferrer nofollow sponsored"` (Rule BR-PROD-023); shop name navigates to `/shops/:shopSlug`.
  5. Hide the section entirely when the API returns an empty array.
- **Exception Handling:** `404`/`400` product not found/invalid slug → section hidden; `NET_ERR` → skeleton retry.

---

## 6. Lookup Data

| Lookup | Values / Source | Usage |
|--------|-----------------|-------|
| Product tabs | `description`, `ingredients`, `reviews` | Selects the visible content panel. |
| Stock status | `IN_STOCK`, `LOW_STOCK`, `OUT_OF_STOCK` derived from product stock fields | Controls label, badge, and cart availability. |
| Rating | Integer values `1` through `5` | Accessible review star selector. |
| Skin types | `products.skin_types` | Product compatibility badge list. |
| Promotion type | `percentage`, `fixed` | Discount formatting. |
| Review pagination | `page >= 1`, `limit` 1-50; default 20 | Review query controls. |

---

## 7. Error Handling

### 7.1 Field-Level Errors

- Review rating: required and must be an integer from 1 through 5.
- Review title: maximum 255 characters.
- Review body: maximum 5000 characters.
- Review images: maximum five URLs/images.
- Quantity: must be at least 1 and cannot exceed displayed stock.

Render errors below their associated control with a red border and `role="alert"` where an error becomes visible.

### 7.2 Page and API Errors

| Status / Code | UI Behavior |
|---------------|-------------|
| 400 invalid slug or insufficient stock | Show invalid-request page state or inline quantity error. |
| 401 mutation unauthenticated | Navigate to login or show login gating. |
| 403 non-buyer mutation | Navigate to `/unauthorized`. |
| 404 inactive or missing product | Render empty state with a link to `/products`. |
| 409 duplicate wishlist/review | Keep wishlist filled or disable the review form with an explanation. |
| 422 out of stock / not verified purchaser | Disable cart action after data refresh or show eligibility explanation. |
| Network error | Keep stable page content and show retry action for the affected query. |

### 7.3 Loading States

- Use skeletons for initial product, gallery, review, related-product, and promotion queries.
- Disable mutation controls and show a spinner while the matching mutation is pending.
- Lazy-load below-fold related products and reviews.
- Prevent duplicate form submission while review or cart mutations are active.

---

## 8. Cross-References

| Related Document | Purpose |
|------------------|---------|
| [DD_PROD_01](./DD_ProductDetail_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_PROD_03](./DD_ProductDetail_03_API_ENDPOINTS.md) | API endpoint contracts consumed by frontend hooks |
| [DD_PROD_04](./DD_ProductDetail_04_DTOS_AND_TYPES.md) | DTO and type definitions used in form state and validation |
| [DD_PROD_05](./DD_ProductDetail_05_BUSINESS_LOGIC.md) | Business logic and validation rules |
| [DD_PROD_06](./DD_ProductDetail_06_TEST.md) | Frontend component and E2E test specification |
| [機能設計書_ProductDetail](../機能設計書_ProductDetail.md) | Functional requirements and operation specifications (v7.1) |
| [画面項目設計書_ProductDetail](../画面項目設計書_ProductDetail.md) | Screen layout, items, validation, API mappings, and i18n (v1.10) |
| [データベース設計書_DATABASE_SPEC](../../../core-work/データベース設計書_DATABASE_SPEC.md) | Table constraints and UUID data model (v2.4) |
| [開発ルール_DEVELOPMENT_RULES](../../../core-work/開発ルール_DEVELOPMENT_RULES.md) | Security, accessibility, API, and quality rules (v2.1) |
