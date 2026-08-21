# DD_WISH-CART_02 — Frontend Page (Wishlist & Cart)

> **Doc ID:** SKM-DD-WISH-CART-02 | **Version:** 1.2 | **Status:** Released
> **Last Updated:** 2026-08-21

---

## 1. Overview

The Wishlist & Cart module consists of two main screens: `Wishlist` and `Cart`. The Wishlist page allows authenticated users to view and manage saved products with a responsive card grid. The Cart page allows authenticated users to review and manage items before checkout, including quantity adjustment, item removal, stock warnings, and order summary. Both pages require JWT authentication and provide guest user handling via login alert modals.

- **File Path (Wishlist):** `frontend/src/pages/buyer/Wishlist.tsx`
- **File Path (Cart):** `frontend/src/pages/buyer/Cart.tsx`
- **Route (Wishlist):** `/wishlist`
- **Route (Cart):** `/cart`
- **Shared Components:** `EmptyState.tsx`, `Skeleton.tsx`, `GuestLoginAlertModal.tsx`

---

## 2. Layout Structure

### 2.1 Wishlist Page Layout

```
┌─────────────────────────────────────────────────────────┐
│ Header (Language Toggle EN/JA/MY | Theme Toggle)        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [A] PAGE HEADER                                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │ My Wishlist                          3 items saved│  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  [B] WISHLIST GRID (responsive: 4/2/1 columns)          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │
│  │ [C] Card     │ │ [C] Card     │ │ [C] Card     │     │
│  │ ┌──────────┐ │ │ ┌──────────┐ │ │ ┌──────────┐ │     │
│  │ │  Image   │ │ │ │  Image   │ │ │ │  Image   │ │     │
│  │ └──────────┘ │ │ └──────────┘ │ │ └──────────┘ │     │
│  │ Product Name │ │ Product Name │ │ Product Name │     │
│  │ ¥39.99       │ │ ¥29.99       │ │ ¥49.99       │     │
│  │ [In Stock]   │ │ [Low Stock]  │ │[Out of Stock]│     │
│  │ [Add to Cart]│ │ [Add to Cart]│ │ [Add to Cart]│     │
│  │ [Remove]     │ │ [Remove]     │ │ [Remove]     │     │
│  └──────────────┘ └──────────────┘ └──────────────┘     │
│                                                         │
│  [D] EMPTY STATE (conditional)                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │ No items saved yet                                │  │
│  │ Browse products to add favorites.                 │  │
│  │ [Continue Shopping]                               │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  [E] LOADING SKELETON (conditional)                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │
│  │ ░░░░░░░░░░░░ │ │ ░░░░░░░░░░░░ │ │ ░░░░░░░░░░░░ │     │
│  │ ░░░░░░░░░░░░ │ │ ░░░░░░░░░░░░ │ │ ░░░░░░░░░░░░ │     │
│  └──────────────┘ └──────────────┘ └──────────────┘     │
│                                                         │
│  [F] GUEST LOGIN ALERT MODAL (conditional)              │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Log In Required                                   │  │
│  │ Please log in to add items to your wishlist.      │  │
│  │ [Log In] [Cancel]                                 │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Cart Page Layout

```
┌─────────────────────────────────────────────────────────┐
│ Header (Language Toggle EN/JA/MY | Theme Toggle)        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [F] PAGE HEADER                                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Shopping Cart                     3 items in cart │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌────────────────────────────┐ ┌───────────────────┐   │
│  │ [G] CART ITEMS LIST        │ │ [H] SUMMARY PANEL │   │
│  │                            │ │                   │   │
│  │ ┌────────────────────────┐ │ │ Subtotal: ¥79.98  │   │
│  │ │ [I] Cart Item 1        │ │ │ Total Items: 3    │   │
│  │ │ Image | Name | Price   │ │ │                   │   │
│  │ │ [- 2 +] | ¥79.98       │ │ │ [J] Proceed to    │   │
│  │ │ [Remove]               │ │ │   Checkout        │   │
│  │ └────────────────────────┘ │ │                   │   │
│  │ ┌────────────────────────┐ │ │ Continue Shopping │   │
│  │ │ [I] Cart Item 2        │ │ │                   │   │
│  │ │ ...                    │ │ │                   │   │
│  │ └────────────────────────┘ │ │                   │   │
│  │                            │ └───────────────────┘   │
│  └────────────────────────────┘                         │
│                                                         │
│  [L] EMPTY STATE (conditional)                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Your cart is empty                                │  │
│  │ Start shopping!                                   │  │
│  │ [Browse Products]                                 │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  [M] GUEST LOGIN ALERT MODAL (conditional)              │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Log In Required                                   │  │
│  │ Please log in to add items to your cart.          │  │
│  │ [Log In] [Cancel]                                 │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Form State & Validation (React Hook Form + Zod)

### 3.1 Cart Quantity Validation Schema

```typescript
// frontend/src/features/buyer/cart/schemas/cart.schema.ts
import { z } from 'zod';

export const updateQuantitySchema = z.object({
  quantity: z
    .number({ invalid_type_error: 'cart.quantity.invalid' })
    .int('cart.quantity.invalid')
    .min(1, 'cart.quantity.min')
    .max(99, 'cart.quantity.max'),
});

export type UpdateQuantityFormData = z.infer<typeof updateQuantitySchema>;
```

### 3.2 Cart Quantity Hook

```typescript
// frontend/src/features/buyer/cart/hooks/useCartQuantity.ts
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateQuantitySchema, type UpdateQuantityFormData } from '../schemas/cart.schema';

export function useCartQuantity(initialQuantity: number) {
  const methods = useForm<UpdateQuantityFormData>({
    resolver: zodResolver(updateQuantitySchema),
    defaultValues: {
      quantity: initialQuantity,
    },
    mode: 'onChange',
  });

  return { methods };
}
```

---

## 4. Sub-Components

### 4.1 WishlistItemCard Component

- **File Path:** `frontend/src/features/buyer/wishlist/components/WishlistItemCard.tsx`
- Displays product image, name, price, compare price, stock status badge, move-to-cart button, remove button
- Optimistic UI: heart icon toggles immediately on click
- Out of stock: disables move-to-cart button, shows unavailable text

### 4.2 CartItemRow Component

- **File Path:** `frontend/src/features/buyer/cart/components/CartItemRow.tsx`
- Displays product image, name, unit price, quantity stepper (minus/input/plus), item subtotal, stock warning badge, remove button
- Optimistic UI: quantity changes and removal update immediately
- Quantity validation: rejects values < 1 or > 99 with inline error

### 4.3 CartSummaryPanel Component

- **File Path:** `frontend/src/features/buyer/cart/components/CartSummaryPanel.tsx`
- Displays subtotal, total items, checkout button, continue shopping link
- Checkout button disabled when `canCheckout = false` or cart is empty
- Sticky on desktop, below items on mobile

### 4.4 GuestLoginAlertModal Component

- **File Path:** `frontend/src/components/common/GuestLoginAlertModal.tsx`
- Modal dialog: title, message, [Log In] button, [Cancel] button
- [Log In] navigates to `/login?redirect={currentPath}`
- Closes on ESC key or clicking outside

### 4.5 QuantityStepper Component

- **File Path:** `frontend/src/features/buyer/cart/components/QuantityStepper.tsx`
- Minus button, quantity input (number), plus button
- Minus disabled when quantity = 1
- Plus disabled when quantity >= stock_quantity
- Direct input validates on blur

### 4.6 EmptyState Component

- **File Path:** `frontend/src/components/common/EmptyState.tsx`
- Variants: `wishlist`, `cart`
- Props: `title`, `message`, `actionLabel`, `actionHref`

### 4.7 Skeleton Component

- **File Path:** `frontend/src/components/ui/skeleton.tsx`
- Variants: `card` (wishlist), `row` (cart)
- Loading placeholders during data fetch

---

## 5. Action Buttons & Handlers

### 5.1 Toggle Wishlist (Heart Icon)

- **Button Type:** `button` (icon)
- **Action:**
  1. Check if user is authenticated. If not, trigger `GuestLoginAlertModal`.
  2. Optimistic UI: toggle heart icon immediately (outline ↔ filled).
  3. If adding: `POST /api/v1/wishlist/:productId`
  4. If removing: `DELETE /api/v1/wishlist/:productId`
  5. On failure: revert toggle state, show error toast.

### 5.2 Move to Cart (from Wishlist)

- **Button Type:** `button` (primary)
- **Action:**
  1. Check if user is authenticated. If not, trigger `GuestLoginAlertModal`.
  2. Check if product is in stock. If not, show error toast.
  3. `POST /api/v1/wishlist/:productId/move-to-cart`
  4. On success: remove item from wishlist grid (optimistic), show success toast.
  5. On failure: revert removal, show error toast.

### 5.3 Add to Cart (from Product Detail/Card)

- **Button Type:** `button` (primary)
- **Action:**
  1. Check if user is authenticated. If not, trigger `GuestLoginAlertModal`.
  2. `POST /api/v1/cart/items` with `{ productId, quantity: 1 }`
  3. On success: update cart badge count, show success toast.
  4. On failure: show error toast.

### 5.4 Update Cart Quantity (Minus Button)

- **Button Type:** `button` (icon)
- **Action:**
  1. Validate `currentQuantity > 1`. If at min, button is disabled.
  2. Optimistic UI: decrement quantity, update subtotal.
  3. `PATCH /api/v1/cart/items/:id` with `{ quantity: currentQuantity - 1 }`
  4. On failure: revert quantity, show error toast.

### 5.5 Update Cart Quantity (Plus Button)

- **Button Type:** `button` (icon)
- **Action:**
  1. Validate `currentQuantity < stock_quantity`. If at max, button is disabled.
  2. Optimistic UI: increment quantity, update subtotal.
  3. `PATCH /api/v1/cart/items/:id` with `{ quantity: currentQuantity + 1 }`
  4. On failure: revert quantity, show error toast.

### 5.6 Update Cart Quantity (Direct Input)

- **Button Type:** `input` (number)
- **Action:**
  1. Validate on blur: integer ≥ 1 and ≤ 99.
  2. If invalid, revert to previous value with inline error.
  3. Optimistic UI: update quantity, update subtotal.
  4. `PATCH /api/v1/cart/items/:id` with `{ quantity: newValue }`
  5. On failure: revert to previous value, show error toast.

### 5.7 Remove from Cart

- **Button Type:** `button` (ghost/icon)
- **Action:**
  1. Optimistic UI: remove row from list with fade-out animation.
  2. `DELETE /api/v1/cart/items/:id`
  3. On success: update item count, update summary panel, update cart badge.
  4. On failure: revert removal, show error toast.

### 5.8 Proceed to Checkout

- **Button Type:** `button` (primary)
- **Action:**
  1. Verify `canCheckout = true` and cart is not empty.
  2. Navigate to `/checkout` via React Router.
  3. If checkout is not allowed: button is disabled.

---

## 6. Lookup Data

### 6.1 Stock Status Mapping

| Status | Badge Text (EN) | Badge Text (JA) | Badge Color |
|--------|-----------------|-----------------|-------------|
| `IN_STOCK` | "In Stock" | "在庫あり" | `bg-status-success/10 text-status-success` |
| `LOW_STOCK` | "Only {n} left in stock" | "残り{n}個" | `bg-status-warning/10 text-status-warning` |
| `OUT_OF_STOCK` | "Out of Stock" | "在庫切れ" | `bg-status-danger/10 text-status-danger` |

---

## 7. Error Handling

### 7.1 Field-Level Errors

- Quantity input: red border and inline error below input
- Validation messages: "Quantity must be at least 1", "Quantity cannot exceed 99"

### 7.2 Toast Notifications

| Scenario | Toast Type | Message |
|----------|------------|---------|
| Add to wishlist success | Success | "Added to wishlist" |
| Remove from wishlist success | Success | "Removed from wishlist" |
| Add to cart success | Success | "Added to cart" |
| Update quantity success | Success | "Quantity updated" |
| Remove from cart success | Success | "Item removed from cart" |
| Clear cart success | Success | "Cart cleared" |
| Out of stock | Destructive | "Product is out of stock" |
| Quantity exceeds stock | Destructive | "Only {n} available in stock" |
| API error | Destructive | "Something went wrong. Please try again." |
| Network error | Destructive | "Network error. Please check your connection." |

### 7.3 Loading States

- Skeleton loaders for page content during initial data fetch
- Spinner on buttons during API calls
- Disable form inputs during submission to prevent double submission

---

## 8. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_WISH-CART_01](./DD_Wishlist_CartPage_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_WISH-CART_03](./DD_Wishlist_CartPage_03_API_ENDPOINTS.md) | Backend REST API contract |
| [DD_WISH-CART_04](./DD_Wishlist_CartPage_04_DTOS_AND_TYPES.md) | DTO and type definitions |
| [DD_WISH-CART_05](./DD_Wishlist_CartPage_05_BUSINESS_LOGIC.md) | Backend business rules |
| [DD_WISH-CART_06](./DD_Wishlist_CartPage_06_TEST_SPEC.md) | Test specification |
| [機能設計書_Wishlist_CartPage](../機能設計書_Wishlist_CartPage.md) | Full functional specification |
| [画面項目設計書_Wishlist_CartPage](../画面項目設計書_Wishlist_CartPage.md) | Screen items specification |
