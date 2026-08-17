# DD_WISH-CART_02 — Frontend Page (Wishlist & Cart)

> **Doc ID:** SKM-DD-WISH-CART-02 | **Version:** 1.0 | **Status:** Released  
> **Last Updated:** 2026-08-14

---

## 1. Overview

The Wishlist & Cart pages consist of two main screens: `Wishlist` and `Cart`. They enable authenticated buyers to save products for future reference and manage their shopping cart before checkout. Both pages share common patterns for product display, stock validation, and error handling.

- **File Path (Wishlist):** `frontend/src/pages/Wishlist.tsx`
- **File Path (Cart):** `frontend/src/pages/Cart.tsx`
- **Route (Wishlist):** `/wishlist`
- **Route (Cart):** `/cart`
- **Shared Components:** `ProductCard.tsx`, `StockBadge.tsx`, `QuantityStepper.tsx`, `EmptyState.tsx`

---

## 2. Layout Structure

### 2.1 Wishlist Page Layout

```
┌─────────────────────────────────────────────────────────┐
│ Header (Navigation | Search | Cart Icon | User Menu)    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  My Wishlist                           3 items saved    │
│                                                         │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐  │
│  │ [Product Img] │ │ [Product Img] │ │ [Product Img] │  │
│  │ Product Name  │ │ Product Name  │ │ Product Name  │  │
│  │ ¥1,234        │ │ ¥2,345        │ │ ¥3,456        │  │
│  │ Low Stock     │ │ In Stock      │ │ Out of Stock  │  │
│  │               │ │               │ │               │  │
│  │ [Move to Cart]│ │ [Move to Cart]│ │ [Move to Cart]│  │
│  │ [Remove]      │ │ [Remove]      │ │ [Remove]      │  │
│  └───────────────┘ └───────────────┘ └───────────────┘  │
│                                                         │
│  [Continue Shopping ->]                                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Cart Page Layout

```
┌────────────────────────────────────────────────────────┐
│ Header (Navigation | Search | Cart Icon | User Menu)   │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Shopping Cart                       2 items in cart   │
│                                                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ┌─────┐ Product Name 1                          │   │
│  │ │ Img │ ¥1,234  [- 2 +]  ¥2,468    [Remove]     │   │
│  │ └─────┘                                         │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ ┌─────┐ Product Name 2                          │   │
│  │ │ Img │ ¥2,345  [- 1 +]  ¥2,345    [Remove]     │   │
│  │ └─────┘ Low Stock: Only 3 left                  │   │
│  ├─────────────────────────────────────────────────┤   │
│  │                              Subtotal: ¥4,813   │   │
│  │                              3 items            │   │
│  │                                                 │   │
│  │  [Continue Shopping]     [Proceed to Checkout]  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 3. Form State & Validation (React Hook Form + Zod)

### 3.1 Cart Quantity Update Hook

```typescript
// frontend/src/features/cart/hooks/useCartQuantity.ts
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const quantitySchema = z.object({
  quantity: z.number()
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(99, 'Quantity cannot exceed 99'),
});

type QuantityFormData = z.infer<typeof quantitySchema>;

export function useCartQuantity(initialQuantity: number) {
  const methods = useForm<QuantityFormData>({
    resolver: zodResolver(quantitySchema),
    defaultValues: {
      quantity: initialQuantity,
    },
    mode: 'onChange',
  });

  return { methods };
}
```

### 3.2 Add to Cart Hook

```typescript
// frontend/src/features/cart/hooks/useAddToCart.ts
import { useState } from 'react';
import { cartService } from '../services/cart.service';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useGuestModal } from './useGuestModal';

export function useAddToCart() {
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated } = useAuth();
  const { showGuestModal } = useGuestModal();

  const addToCart = async (productId: string, quantity = 1) => {
    if (!isAuthenticated) {
      showGuestModal();
      return { success: false, requiresAuth: true };
    }

    setIsLoading(true);
    try {
      const result = await cartService.addItem(productId, quantity);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  return { addToCart, isLoading };
}
```

### 3.3 Wishlist Toggle Hook

```typescript
// frontend/src/features/wishlist/hooks/useWishlistToggle.ts
import { useState } from 'react';
import { wishlistService } from '../services/wishlist.service';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useGuestModal } from '@/features/cart/hooks/useGuestModal';

export function useWishlistToggle() {
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated } = useAuth();
  const { showGuestModal } = useGuestModal();

  const toggleWishlist = async (productId: string, isInWishlist: boolean) => {
    if (!isAuthenticated) {
      showGuestModal();
      return { success: false, requiresAuth: true };
    }

    setIsLoading(true);
    try {
      if (isInWishlist) {
        await wishlistService.removeItem(productId);
        return { success: true, action: 'removed' };
      } else {
        await wishlistService.addItem(productId);
        return { success: true, action: 'added' };
      }
    } catch (error) {
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  return { toggleWishlist, isLoading };
}
```

### 3.4 Zod Validation Schemas

```typescript
// frontend/src/features/cart/schemas/cart.schema.ts
import { z } from 'zod';

export const addToCartSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number()
    .int()
    .min(1, 'Quantity must be at least 1')
    .max(99, 'Quantity cannot exceed 99')
    .optional()
    .default(1),
});

export const updateQuantitySchema = z.object({
  quantity: z.number()
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(99, 'Quantity cannot exceed 99'),
});

export type AddToCartFormData = z.infer<typeof addToCartSchema>;
export type UpdateQuantityFormData = z.infer<typeof updateQuantitySchema>;
```

```typescript
// frontend/src/features/wishlist/schemas/wishlist.schema.ts
import { z } from 'zod';

export const addToWishlistSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
});

export type AddToWishlistFormData = z.infer<typeof addToWishlistSchema>;
```

---

## 4. Sub-Components

### 4.1 WishlistItemCard Component

- **File Path:** `frontend/src/features/wishlist/components/WishlistItemCard.tsx`
- Displays product image, name, price, stock status
- "Move to Cart" button (primary)
- "Remove" button (ghost/icon)
- Links to product detail page

### 4.2 CartItemRow Component

- **File Path:** `frontend/src/features/cart/components/CartItemRow.tsx`
- Displays product image, name, unit price
- Quantity controls (minus/input/plus)
- Item subtotal calculation
- Stock warning badge
- "Remove" button

### 4.3 QuantityStepper Component

- **File Path:** `frontend/src/components/common/QuantityStepper.tsx`
- Minus button, quantity input, plus button
- Disables minus at quantity 1
- Disables plus at max stock or 99
- Shows loading spinner during update

### 4.4 StockBadge Component

- **File Path:** `frontend/src/components/common/StockBadge.tsx`
- Displays stock status with color coding:
  - Green: "In Stock"
  - Yellow: "Low Stock (X left)"
  - Red: "Out of Stock"

### 4.5 CartSummary Component

- **File Path:** `frontend/src/features/cart/components/CartSummary.tsx`
- Displays subtotal, item count
- "Proceed to Checkout" button (disabled if out of stock items)
- "Continue Shopping" link

### 4.6 EmptyState Component

- **File Path:** `frontend/src/components/common/EmptyState.tsx`
- Displays message and call-to-action button
- Different messages for wishlist vs cart

### 4.7 GuestLoginModal Component

- **File Path:** `frontend/src/features/cart/components/GuestLoginModal.tsx`
- Alert modal for unauthenticated users
- Message: "Please log in to add items to your cart."
- [Log in] button navigates to `/login`
- Closes on outside click or ESC key

---

## 5. Action Buttons & Handlers

### 5.1 Add to Wishlist

- **Button Type:** `button`
- **Icon:** Heart (outline when not in wishlist, filled when in wishlist)
- **Action:**
  1. Check authentication status
  2. If guest, show GuestLoginModal
  3. If authenticated, call `wishlistService.toggle(productId)`
  4. Toggle heart icon optimistically
  5. Revert on API error
  6. Show toast notification

### 5.2 Remove from Wishlist

- **Button Type:** `button`
- **Icon:** Trash/X
- **Action:**
  1. Call `wishlistService.removeItem(productId)`
  2. Remove item from wishlist view
  3. Update item count
  4. Show toast notification

### 5.3 Move to Cart (from Wishlist)

- **Button Type:** `button`
- **Style:** Primary
- **Action:**
  1. Call `wishlistService.moveToCart(productId)`
  2. Remove item from wishlist view
  3. Update cart badge count
  4. Show success toast

### 5.4 Add to Cart (from Product)

- **Button Type:** `button`
- **Style:** Primary
- **Action:**
  1. Check authentication status
  2. If guest, show GuestLoginModal
  3. If authenticated, call `cartService.addItem(productId, quantity)`
  4. Update cart badge count
  5. Show success toast

### 5.5 Update Cart Quantity

- **Button Type:** `button` (minus/plus) or `input` (direct entry)
- **Action:**
  1. Validate quantity (1-99)
  2. Call `cartService.updateQuantity(itemId, quantity)`
  3. Update item subtotal
  4. Update cart summary
  5. Show error if exceeds stock

### 5.6 Remove from Cart

- **Button Type:** `button`
- **Icon:** Trash/X
- **Action:**
  1. Call `cartService.removeItem(itemId)`
  2. Remove item from cart view
  3. Update cart summary
  4. Update cart badge count
  5. Show toast notification

---

## 6. Lookup Data

### 6.1 Stock Status Options

| Value | Label (EN) | Label (JA) | Color |
|-------|------------|------------|-------|
| `in_stock` | In Stock | 在庫あり | Green |
| `low_stock` | Low Stock ({n} left) | 残り{n}個 | Yellow |
| `out_of_stock` | Out of Stock | 在庫切れ | Red |

### 6.2 Wishlist Empty State

| Field | Value (EN) | Value (JA) |
|-------|------------|------------|
| Title | No items saved yet | お気に入りはまだありません |
| Description | Browse products to add favorites. | 商品を閲覧してお気に入りを追加してください。 |
| Button | Continue Shopping | ショッピングを続ける |

### 6.3 Cart Empty State

| Field | Value (EN) | Value (JA) |
|-------|------------|------------|
| Title | Your cart is empty | カートは空です |
| Description | Start shopping! | ショッピングを始めましょう！ |
| Button | Continue Shopping | ショッピングを続ける |

---

## 7. Error Handling

### 7.1 Field-Level Errors

- Red border on invalid quantity input
- Inline error message below quantity field
- Real-time validation on blur and change

### 7.2 API Errors

| Error Code | Scenario | User-Facing Behavior |
|------------|----------|---------------------|
| `400` | Validation failure | Inline field error + toast |
| `401` | Unauthorized | Redirect to login |
| `404` | Product not found | Toast: "Product not found" |
| `409` | Already in wishlist | Toast: "Already in your wishlist" |
| `400` | Out of stock | Toast: "Product is out of stock" |
| `400` | Quantity exceeds stock | Toast: "Only {n} available in stock" |
| `500` | Server error | Toast: "Something went wrong. Please try again." |

### 7.3 Loading States

- Spinner on buttons during API calls
- Skeleton loaders for page content
- Disable form inputs during submission
- Prevent double submission

### 7.4 Optimistic Updates

- Heart icon toggles immediately on click
- Reverts on API failure
- Cart badge updates immediately
- Subtotal recalculates on quantity change

---

## 8. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_WISH-CART_01](./DD_Wishlist_CartPage_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_WISH-CART_03](./DD_Wishlist_CartPage_03_API_ENDPOINTS.md) | Backend REST API contract |
| [DD_WISH-CART_04](./DD_Wishlist_CartPage_04_DTOS_AND_TYPES.md) | DTO and type definitions |
| [DD_WISH-CART_05](./DD_Wishlist_CartPage_05_BUSINESS_LOGIC.md) | Backend business rules |
| [機能設計書_Wishlist_CartPage](../機能設計書_Wishlist_CartPage.md) | Full functional specification |