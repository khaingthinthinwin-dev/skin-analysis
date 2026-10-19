# Functional Specification (機能設計書) — Wishlist & Cart Page

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-FDS-WISH-CART-001 |
| **Target Screen** | Wishlist & Cart Page (お気に入り & カートページ) |
| **Subsystem** | Buyer Module — Wishlist Management & Shopping Cart |
| **Function ID** | FN-WISH-001, FN-CART-001 |
| **Version** | 2.2 |
| **Created** | 2026-08-05 |
| **Last Updated** | 2026-10-15 |
| **Author** | Software Architect |
| **Status** | Released (承認済み) |
| **Classification** | Internal — Engineering Division |

---

## Document Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-08-05 | Software Architect | Initial functional specification for Wishlist and Cart pages covering use cases, business rules, validation, error handling, and permission control. |
| 1.1 | 2026-08-07 | Software Architect | Clarified that cart page subtotal is unit_price × quantity only (no discounts). Added note that coupon code entry and discount calculation occur on the checkout page. |
| 1.2 | 2026-08-07 | Software Architect | Added guest user behavior: alert modal "Please log in to add items to your cart." with [Log in] button navigating to /login. Added UC-CART-005, BR-CART-0010, EL-36, and updated cart workflow diagram. |
| 2.0 | 2026-08-14 | Software Architect | Aligned with REQUIREMENT_SPEC v2.10 and DATABASE_SPEC v2.0: updated ID format from CUID to UUID, restricted wishlist and cart access to Buyer role only (Merchants and Admins get 403 Forbidden). |
| 2.1 | 2026-08-20 | Software Architect | Reconciled the document with REQUIREMENT_SPEC v2.10, DATABASE_SPEC v2.4, DEVELOPMENT_RULES v2.1, and the current Prisma schema: corrected table mappings, UUID validation, response contracts, RBAC, and delete semantics. |
| 2.2 | 2026-10-15 | Software Architect | Reconciled with the current Frontend (`pages/buyer/Wishlist.tsx`, `pages/buyer/Cart.tsx`, feature hooks/services) and Backend (`modules/buyer/wishlist`, `modules/buyer/cart`) implementation: corrected route paths (`/buyer/...`), documented Clear-All operations, the duplicate-cart conflict on Move-to-Cart, the account-deactivated checkout guard, `shippingEstimate`/`total` summary fields, `category` wishlist field, guest `GuestLoginModal` behavior, and error/retry states. Removed the inaccurate claim that Move-to-Cart increments quantity. |

---

## Table of Contents

1. [Functional Overview](#1-functional-overview)
2. [Use Cases and Business Workflow](#2-use-cases-and-business-workflow)
3. [State Transition Specification](#3-state-transition-specification)
4. [Business Rules](#4-business-rules)
5. [Screen Specifications](#5-screen-specifications)
6. [Functional Operation Specification](#6-functional-operation-specification)
7. [Input / Output Specification](#7-input--output-specification)
8. [Input Validation Rules](#8-input-validation-rules)
9. [Error Handling Specification](#9-error-handling-specification)
10. [Permission and Access Control](#10-permission-and-access-control)
11. [Real-Time Notification Behavior](#11-real-time-notification-behavior)
12. [Screen Transition Specification](#12-screen-transition-specification)
13. [Non-Functional Considerations](#13-non-functional-considerations)
14. [Configurable Items (External Definitions)](#14-configurable-items-external-definitions)
15. [Cross-Reference Traceability Matrix](#15-cross-reference-traceability-matrix)

---

## 1. Functional Overview

### 1.1 Purpose and Scope

This screen provides the complete wishlist and shopping cart functionality for the Cosmetics Finder platform. The Wishlist subsystem enables authenticated users to save products for future reference, while the Cart subsystem manages the complete purchase workflow from product selection through checkout initiation.

These subsystems are critical components of the e-commerce workflow, bridging product browsing and order placement. They ensure seamless product curation, quantity management, stock validation, and price calculation to support a smooth purchasing experience.

### 1.2 Functional Responsibilities

This screen is responsible for the following core functional areas:

1. **Wishlist Management** — Enabling authenticated users to add/remove products from their saved wishlist, view saved products with details, clear the entire wishlist, and move items to cart.
2. **Shopping Cart Management** — Enabling authenticated users to add products to cart, update quantities, remove items, clear the entire cart, and view real-time subtotals.
3. **Stock Validation** — Add-to-cart requires positive stock; quantity updates must not exceed stock. The add endpoint does not validate the initial requested quantity against stock, so `isAvailable` may be false for an item it accepts.
4. **Price Calculation** — Computing item subtotals based on unit price × quantity for each cart item, plus a summary subtotal, shipping estimate, and total. Discounts and coupons are **not** applied on the cart page; coupon entry and discount calculation occur on the checkout page.
5. **Wishlist-to-Cart Transfer** — Allowing users to move saved wishlist items directly into the shopping cart. If the product is already in the cart, the move is rejected with a duplicate-cart alert instead of merging quantities.
6. **Cart Persistence** — Maintaining cart contents across sessions for logged-in users via database storage.
7. **Product Display** — Showing product images, names, category, and prices on wishlist cards; wishlist availability is returned by the API and controls the Add button, while cart rows also show a stock badge.
8. **Guest Gating** — Handling guest access per entry point: header icons use `GuestLoginModal`; listing/search/recommendation actions use page-level login dialogs; product-detail cart actions navigate to login and its wishlist action is disabled; protected buyer routes redirect guests to login.

### 1.3 Target Users

| Attribute | Value |
|-----------|-------|
| **Primary Actor** | Authenticated Buyer |
| **Required Authentication** | JWT Bearer Token |
| **Data Scope** | Own wishlist items, Own cart items |
| **Guest Behavior** | Cart not persisted; wishlist unavailable. The `/buyer/wishlist` and `/buyer/cart` routes are protected by `ProtectedRoute roles={['buyer']}`, so direct navigation by a guest redirects to `/login`. Header icons and listing/search/recommendation actions open login dialogs. Header and search/recommendation dialogs preserve a redirect target; the buyer product-list dialog navigates to `/login` without one. On the product detail page, Add to Cart navigates directly to `/login?redirect=/buyer/products`; Add to Wishlist is disabled for guests and non-buyers. |

### 1.4 Relationships with Other Functions and Peripheral Systems

```text
┌──────────────────────────┐      ┌─────────────────────────────────────┐
│   Authenticated Buyer    │      │ wishlists / carts / cart_items      │
│   (Manages Wishlist)     ├─────►│  Creates/saves wishlist records     │
└──────────────────────────┘      └──────────────┬──────────────────────┘
                                                 │ Reads/Writes
                                                 ▼
                                       ┌────────────────────────┐
                                       │   Wishlist & Cart      │
                                       │   Service Layer        │
                                       └──────────┬─────────────┘
                                                  │ Stock/Price Check
                                                  ▼
┌──────────────────────────┐      ┌─────────────────────────────────────┐
│   Authenticated Buyer    │      │     products (Stock Validation)     │
│   (Manages Cart)         ├──────┤  Validates stock & calculates totals│
└──────────────────────────┘      └──────────────┬──────────────────────┘
                                                 │
                                                 ▼
                                       ┌────────────────────────┐
                                       │   Orders Module        │
                                       │   (Checkout Flow)      │
                                       └────────────────────────┘
```

### 1.5 Inputs / Outputs

| Input Information | Data Category | Source / Description |
|-------------------|---------------|----------------------|
| `productId` | URL Parameter | Product to add to wishlist or cart |
| `cartItemId` | URL Parameter | Cart item to update or remove |
| `quantity` | Request Body | Number of units for cart item |

| Output Information | Data Category | Destination / Description |
|--------------------|---------------|---------------------------|
| `wishlistItems` | Wishlist DTO Array | List of saved products with details (including `category`) |
| `cartItems` | Cart DTO Array | List of cart items with quantities and subtotals |
| `cartSummary` | Cart Summary DTO | `totalItems`, `subtotal`, `shippingEstimate`, `total`, `hasOutOfStock`, `canCheckout` |
| `operationResult` | Standard API Response | Success response or HTTP error according to the API standards |
| `clearResult` | Standard API Response | Clear-All returns `{ success, deletedCount }` |

### 1.6 Related Documents

| No. | Document ID | Document Name | File Path / Reference | Remarks |
|-----|-------------|---------------|----------------------|---------|
| 1 | SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | Business workflow logic, required fields, and rules. |
| 2 | SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | Table structures (`wishlists`, `carts`, `cart_items`, `products`), constraints. |
| 3 | SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | Security rules, design tokens, error responses. |

---

## 2. Use Cases and Business Workflow

### 2.1 Use Case Catalog

| UC-ID | Use Case Name | Precondition | Postcondition | Triggering Actor |
|-------|---------------|--------------|---------------|------------------|
| UC-WISH-001 | Add Product to Wishlist | User is authenticated. Product exists and is active. | Wishlist record created. Heart icon toggled to filled state. | Authenticated Buyer |
| UC-WISH-002 | Remove Product from Wishlist | User is authenticated. Product is in user's wishlist. | Wishlist record deleted from the wishlist page or by the toggle action on listing/search/recommendation cards. Product-detail Add to Wishlist does not remove an existing item; it reports a duplicate instead. | Authenticated Buyer |
| UC-WISH-003 | View Wishlist | User is authenticated. User has saved items. | Wishlist page displays saved products with images, category, and prices. Availability is represented by disabling the Add button when out of stock; no stock badge is rendered on wishlist cards. | Authenticated Buyer |
| UC-WISH-004 | Move Wishlist Item to Cart | User is authenticated. Wishlist item exists. Product is active and in stock. Product is not already in cart. | Cart item created with quantity 1. Wishlist item removed. | Authenticated Buyer |
| UC-WISH-005 | Guest User Wishlist Action Attempt | User is not authenticated (guest). | Header wishlist icon and listing/search/recommendation card actions show a login dialog; product-detail Add to Wishlist is disabled. Direct navigation to `/buyer/wishlist` redirects to `/login`. | Guest User |
| UC-WISH-006 | Clear Wishlist | User is authenticated. Wishlist contains items. | All wishlist records deleted; empty state displayed. | Authenticated Buyer |
| UC-CART-001 | Add Product to Cart | User is authenticated. Product exists, is active, has stock > 0, and is not already in cart. | Cart item created with the requested quantity (default 1). Cart badge updated. | Authenticated Buyer |
| UC-CART-002 | Update Cart Item Quantity | User is authenticated. Cart item exists. Requested quantity ≤ available stock. | Cart item quantity updated. Subtotal recalculated. | Authenticated Buyer |
| UC-CART-003 | Remove Item from Cart | User is authenticated. Cart item exists. | Cart item deleted. Subtotal recalculated. Cart badge updated. | Authenticated Buyer |
| UC-CART-004 | View Cart | User is authenticated. | Cart page displays all items with images, names, prices, quantities, subtotals, and stock status, plus the summary panel. | Authenticated Buyer |
| UC-CART-005 | Guest User Add to Cart Attempt | User is not authenticated (guest). | Header cart icon and listing/search/recommendation card actions show a login dialog; product-detail Add to Cart navigates directly to `/login?redirect=/buyer/products`. Direct navigation to `/buyer/cart` redirects to `/login`. | Guest User |
| UC-CART-006 | Clear Cart | User is authenticated. Cart contains items. | All cart items deleted; empty state displayed. | Authenticated Buyer |
| UC-CART-007 | Proceed to Checkout | User is authenticated with an active account and at least one cart item. | Navigation to `/buyer/checkout`; if the account is deactivated, the `AccountDeactivatedDialog` is shown instead. | Authenticated Buyer |

### 2.2 Primary Business Workflow — Wishlist

```
Buyer product-detail Add to Wishlist:
  - Guest/non-buyer: button is disabled.
  - Buyer, not already saved: POST /wishlist/:productId; on success show a toast
    and refresh wishlist data so the button changes to "Added to Wishlist".
  - Buyer, already saved: POST returns 409; show the "Already in Wishlist" dialog.

Wishlist page Remove:
  - Buyer clicks the card's trash button: DELETE /wishlist/:productId.
  - On success remove the item from the refreshed list and show a toast.

Listing/search/recommendation cards:
  - Buyer toggles wishlist: POST /wishlist/:productId to add, or
    DELETE /wishlist/:productId to remove.
  - A guest action opens the page's login-required dialog. A duplicate add
    shows an informational message/dialog depending on the page.
```

### 2.3 Primary Business Workflow — Cart

```
Product-detail Add to Cart:
  - Guest: navigate directly to /login?redirect=/buyer/products.
  - Buyer, out of stock: button is disabled.
  - Buyer, in stock: POST /cart/items; on success refresh cart data and show a
    toast. A duplicate returns 409 and opens the "Already in Cart" dialog.

Wishlist-to-cart:
  - Buyer clicks Add on an in-stock wishlist card: POST
    /wishlist/:productId/move-to-cart; on success remove the wishlist item and
    refresh both wishlist and cart data. A duplicate returns 409 and leaves the
    wishlist item in place.

Cart page:
  - Quantity changes use PATCH /cart/items/:id; removal uses
    DELETE /cart/items/:id. Clear All uses DELETE /cart/items after confirmation.
  - Proceed to Checkout navigates to /buyer/checkout unless the account is
    deactivated, in which case AccountDeactivatedDialog is shown.
```

### 2.4 Workflow Critical Path Summary

| Step | Action | Status Before | Status After | Assigned To |
|:----:|--------|---------------|--------------|-------------|
| 1 | User clicks "Add to Wishlist" on product | Product not saved | Wishlist item created | System |
| 2 | User removes a saved item with the wishlist card's trash button | Product saved | Wishlist item deleted | System |
| 3 | User navigates to /buyer/wishlist | — | Wishlist page displayed | System |
| 4 | User clicks "Move to Cart" from wishlist | Item in wishlist | Cart item created | System |
| 5 | User clicks "Add to Cart" on product | Product not in cart | Cart item created | System |
| 6 | User updates quantity in cart | Old quantity | New quantity, subtotal updated | System |
| 7 | User removes item from cart | Item in cart | Cart item deleted | System |
| 8 | User navigates to /buyer/cart | — | Cart page displayed | System |

### 2.5 Relevant Requirements Covered

| Requirement ID | Requirement Summary |
|----------------|---------------------|
| B-WISH-001 | User can add product to wishlist |
| B-WISH-002 | User can remove product from wishlist |
| B-WISH-003 | User can view wishlist list |
| B-WISH-004 | Wishlist shows product images, prices, availability |
| B-WISH-005 | User can move wishlist items to cart |
| B-CART-001 | User can add products to cart |
| B-CART-002 | User can update item quantities |
| B-CART-003 | User can remove items from cart |
| B-CART-004 | Cart shows item subtotal calculation |
| B-CART-005 | Cart shows available stock |
| B-CART-006 | Cart persists across sessions (logged-in users) |
| B-CART-007 | Cart shows product images and names |

**Note on Promotions/Discounts:** The cart page displays only the pre-discount subtotal (unit_price × quantity). Coupon code entry and discount calculation (per Rule 4.5.1 and 4.5.2 in `要件定義書_REQUIREMENT_SPEC.md`) are handled on the checkout page (`/buyer/checkout`), not the cart page. This separation ensures the cart remains a simple review step before the full pricing breakdown at checkout.

**Note on Guest User Behavior:** The shared `GuestLoginModal` is opened by header wishlist/cart icons; listing/search/recommendation actions use their own login-required dialogs with category-specific messages. Header dialogs redirect to the selected wishlist/cart route; SearchFilter and MatchingRecommendations redirect to the encoded current pathname; the buyer product-list dialog navigates to `/login` without a redirect parameter. The product-detail Add to Cart handler instead navigates directly to `/login?redirect=/buyer/products`; Add to Wishlist is disabled for guests and non-buyers. Direct navigation to the protected wishlist/cart pages redirects to `/login`.

**Note on Clear-All Operations:** Both pages expose a "All Data Clear" (Clear All) action that opens a `ConfirmDialog` requiring explicit confirmation. Confirming calls `DELETE /api/v1/wishlist` or `DELETE /api/v1/cart/items`, which returns HTTP 200 with `{ success: true, deletedCount }`. There is no per-item bulk selection; it clears the entire collection.

---

## 3. State Transition Specification

### 3.1 Wishlist Item States

| State | Description | Visible in Wishlist | Can Move to Cart |
|-------|-------------|:-------------------:|:----------------:|
| `SAVED` | Product saved in wishlist; `isInStock` is true | ✓ | ✓ |
| `OUT_OF_STOCK` | Product saved but currently out of stock; `isInStock` is false | ✓ (Add button disabled; no stock badge) | ✗ |
| `INACTIVE` | Not exposed as a wishlist item state: the GET response omits `isActive`, and the card has no inactive notice | May still render if the product remains related | Move-to-Cart returns 404 |
| `MOVED_TO_CART` | Item transferred to cart; the wishlist record is always removed | ✗ | — |

### 3.2 Cart Item States

| State | Description | Visible in Cart | Can Checkout |
|-------|-------------|:---------------:|:------------:|
| `ACTIVE` | Item in cart with valid stock and requested quantity available | ✓ | ✓ |
| `LOW_STOCK` | Item in cart, stock below threshold (≤10), with requested quantity available | ✓ (warning) | ✓ |
| `OUT_OF_STOCK` | Item in cart, stock = 0 | ✓ (out-of-stock badge) | `canCheckout` is false; checkout button is not disabled by this field |
| `QUANTITY_EXCEEDED` | Requested quantity exceeds available stock | ✓ (availability false; quantity controls disabled) | `canCheckout` is false; checkout button is not disabled by this field |
| `INACTIVE` | Cart item's product is deactivated (`isAvailable` false); no dedicated inactive notice is rendered | ✓ | `canCheckout` is false; checkout button is not disabled by this field |

### 3.3 Wishlist State Transitions

| Transition ID | Origin State | Target State | Trigger Action | Guard Conditions |
|---------------|--------------|--------------|----------------|------------------|
| TR-WISH-01 | (Not in wishlist) | `SAVED` | Add to wishlist | User authenticated, product exists and active |
| TR-WISH-02 | `SAVED` | (Removed) | Remove from wishlist | User owns wishlist item |
| TR-WISH-03 | `SAVED` | `OUT_OF_STOCK` | Stock becomes 0 | Automatic (stock check) |
| TR-WISH-04 | `OUT_OF_STOCK` | `SAVED` | Stock replenished | Automatic (stock check) |
| TR-WISH-05 | `SAVED` | `MOVED_TO_CART` | Move to cart | Product in stock |

### 3.4 Cart State Transitions

| Transition ID | Origin State | Target State | Trigger Action | Guard Conditions |
|---------------|--------------|--------------|----------------|------------------|
| TR-CART-01 | (Not in cart) | `ACTIVE` | Add to cart | User authenticated, product active, stock > 0 |
| TR-CART-02 | `ACTIVE` | `ACTIVE` | Update quantity | Requested qty ≤ available stock |
| TR-CART-03 | `ACTIVE` | `QUANTITY_EXCEEDED` | Stock drops below qty | Automatic (stock check) |
| TR-CART-04 | `ACTIVE` | `OUT_OF_STOCK` | Stock becomes 0 | Automatic (stock check) |
| TR-CART-05 | `ACTIVE` | (Removed) | Remove from cart | User owns cart item |
| TR-CART-06 | `QUANTITY_EXCEEDED` | `ACTIVE` | Quantity corrected | Stock replenished or qty reduced |

---

## 4. Business Rules

### 4.1 Wishlist Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-WISH-001 | Authentication and Role Required | Only authenticated users with the `buyer` role can manage wishlists. | Backend (`JwtAuthGuard`, `RolesGuard`, `@Roles('buyer')`) |
| BR-WISH-002 | One Wishlist Per Product | Each user can save a product to wishlist only once. Unique constraint on [user_id, product_id]. | Backend (DB constraint + service check) |
| BR-WISH-003 | Active Product Only | Only active products can be added to wishlist. | Backend (service validation) |
| BR-WISH-004 | Product Existence | Product must exist in the system to be added. | Backend (FK constraint) |
| BR-WISH-005 | Owner-Only Access | Users can only view/modify their own wishlist items. | Backend (service filter) |
| BR-WISH-006 | Move to Cart Validation | Moving to cart requires the product to exist, be active, and be in stock (stock_quantity > 0). If the product is already in the cart, the move is rejected with `409 Conflict` and the duplicate-cart alert is shown; quantities are never merged. | Backend (stock + duplicate check) |
| BR-WISH-007 | Guest User Restriction | Direct access to `/buyer/wishlist` redirects to login. The header icon and listing/search/recommendation card actions open login dialogs; the product-detail Add to Wishlist button handler navigates directly to /login?redirect=/buyer/products. |
| BR-WISH-008 | Wishlist Limit | A user's wishlist may contain at most 100 items. Exceeding the limit fails with `400 Bad Request` ("Wishlist limit reached (100 items)"). | Backend (service check, hardcoded 100) |
| BR-WISH-009 | Clear All Wishlist | Users may delete all of their wishlist items at once. The operation is scoped to the authenticated user's records and returns `{ success, deletedCount }`. | Backend (`deleteMany` by `user_id`) |

### 4.2 Cart Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-CART-001 | Authentication and Role Required | Only authenticated users with the `buyer` role can manage the cart. | Backend (`JwtAuthGuard`, `RolesGuard`, `@Roles('buyer')`) |
| BR-CART-002 | Stock Availability | Cannot add product to cart if stock_quantity = 0. | Backend (stock validation) |
| BR-CART-003 | Quantity Limit | Cart quantity is limited to 1–99. Quantity updates are rejected when the requested quantity exceeds stock; add-to-cart validates stock > 0 but does not reject an initial quantity greater than stock. | Backend (DTO and update service); product-detail UI caps to stock but does not cap at 99 |
| BR-CART-004 | Quantity Minimum | Cart item quantity must be ≥ 1. | Backend (DTO validation and DB constraint) |
| BR-CART-005 | Active Product Only | Only active products can be added to cart. | Backend (service validation) |
| BR-CART-006 | Price at Order Time | Price is locked at order creation time, not cart time. | Backend (order service) |
| BR-CART-007 | Cart Persistence | Cart items are stored in database for logged-in users. | Backend (DB storage) |
| BR-CART-008 | Subtotal Calculation | Subtotal = unit_price × quantity for each item. Discounts and coupons are **not** applied at this stage; coupon entry and discount calculation occur on the checkout page. | Backend (computed field) |
| BR-CART-009 | Duplicate Handling | Adding a product that already exists in the cart fails with `409 Conflict` ("This product is already in cart."). The client does not auto-merge quantities; the `DuplicateCartAlertDialog` is shown. Quantity changes are made explicitly via the PATCH endpoint. | Backend (service logic) |
| BR-CART-010 | Guest User Restriction | Direct access to `/buyer/cart` redirects to login. The header icon and listing/search/recommendation card actions open login dialogs; the product-detail Add to Cart handler navigates directly to `/login?redirect=/buyer/products`. | Frontend (`ProtectedRoute`, header and page handlers) |
| BR-CART-011 | Checkout Eligibility | The backend computes `canCheckout = true` only when the cart is non-empty and contains no out-of-stock, quantity-exceeded, or inactive items. The frontend does not display or use this field to disable checkout; checkout is blocked only by the account-deactivated guard on the cart page. | Backend (computed field); not enforced by the Cart UI |
| BR-CART-012 | Clear All Cart | Users may delete all of their cart items at once. The operation is scoped to the authenticated user's cart and returns `{ success, deletedCount }`. | Backend (`deleteMany` by `cart_id`) |
| BR-CART-013 | Deactivated Account Guard | If the authenticated user's account is deactivated (`isActive === false` / status `deactivated` or `inactive`), the "Proceed to Checkout" button does not navigate; it opens the `AccountDeactivatedDialog`. | Frontend (UI guard) |

### 4.3 Stock Validation Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-STOCK-001 | Add to Cart Check | Before adding, verify `stock_quantity > 0`. | Backend (service validation) |
| BR-STOCK-002 | Update Quantity Check | Before updating, verify `requested_quantity ≤ stock_quantity`. | Backend (service validation) |
| BR-STOCK-003 | Atomic Decrement | Stock decremented atomically on order creation. | Backend (Prisma transaction) |
| BR-STOCK-004 | Low Stock Warning | Display warning when `stock_quantity ≤ low_stock_threshold`. | Frontend (UI indicator) |

### 4.4 Display Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-DISP-001 | Product Images | Show the first image from `product.images` as a thumbnail. Wishlist cards show a placeholder icon when the URL is missing or the image fails to load; cart rows render a blank muted thumbnail when the URL is missing and do not handle image load errors. | Frontend |
| BR-DISP-002 | Price Display | Display price as `{rounded}Ks` (Myanmar Kyat) using `toLocaleString('en-US')` and `Math.round`. `compareAtPrice` is shown struck-through only when greater than `productPrice`. | Frontend |
| BR-DISP-003 | Stock Status | Cart rows show "In Stock" (stock > 10), "Only {n} left" (0 < stock ≤ 10), or "Out of Stock" (stock = 0) via `StockBadge`. Wishlist cards show no stock badge; the Add button is disabled when `isInStock` is false. | Frontend |
| BR-DISP-004 | Cart Badge | Header cart icon shows `summary.totalItems` (sum of quantities) capped at "99+"; header heart icon shows wishlist `totalCount` capped at "99+". Badges hidden when count is 0. | Frontend |
| BR-DISP-005 | Category Label | Wishlist cards show the product's category name (uppercase), falling back to "Uncategorized" when null. | Frontend |

---

## 5. Screen Specifications

### 5.1 Screen: Wishlist Page (`/buyer/wishlist`)

**Purpose:** Allow authenticated users to view and manage their saved products.

#### 5.1.1 UI Elements

**Wishlist View:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-01 | Page Title | Heading (h1) | `wishlist.title` | Yes | "My Saved Wishlist" with heart icon |
| EL-02 | Item Count | Text | — | Yes | "1 item saved for future purchase" / "{n} items saved for future purchase"; composed as hard-coded English in the page |
| EL-03 | Wishlist Grid | Grid Container | — | Yes | Responsive grid (2 cols default, 3 at `md`, 4 at `lg`) |
| EL-04 | Wishlist Item Card | Card (`WishlistItemCard`) | — | Yes | Product image, category, name, price, compare price, and actions |
| EL-05 | Product Image | Image | — | Yes | Clickable thumbnail linking to `/buyer/wishlist/products/:slug` (placeholder icon on missing/error image) |
| EL-06 | Product Name | Text (link) | — | Yes | Clickable product name linking to the same product route |
| EL-07 | Product Price | Text | — | Yes | Current price formatted as `{rounded}Ks` |
| EL-08 | Compare Price | Text (strikethrough) | — | No | Original price struck through when `compareAtPrice > productPrice` |
| EL-10 | Move to Cart Button | Button (primary) | — | Yes | Hard-coded "Add"; disabled when `!item.isInStock` or while moving |
| EL-11 | Remove Button | Button (ghost/icon, Trash2) | Hard-coded `aria-label` | Yes | Remove item from wishlist |
| EL-12 | Empty State | `EmptyState` (`variant="wishlist"`) | `wishlist.emptyTitle`, `wishlist.emptyMessage` | Conditional | "No items saved yet" / "Browse products to add favorites." with Continue Shopping button to `/buyer/search` |
| EL-13 | Continue Shopping Link | Link (inside EmptyState) | `wishlist.continueShopping` | Conditional | "Continue Shopping" link to `/buyer/search` |
| EL-14 | Loading Skeleton | Skeleton | — | Conditional | 4 pulse cards shown while loading wishlist data |
| EL-37 | Clear All Button | Button (outline, Trash2) | `wishlist.clearAll` / `wishlist.clearing` | Conditional | "All Data Clear"; shown only when items exist; disabled while clearing |
| EL-38 | Clear All Confirm Dialog | `ConfirmDialog` | `wishlist.clearAllTitle/Confirm/ConfirmButton/CancelButton` | Conditional | Confirms clearing the whole wishlist before calling Clear-All |
| EL-39 | Error / Retry State | Empty-state block | `wishlist.errorTitle`, `wishlist.errorMessage`, `wishlist.retry` | Conditional | Shown on load failure with a "Try again" button calling `refetch()` |
| EL-40 | Duplicate Cart Alert | `DuplicateCartAlertDialog` | `buyer.products.cart.alreadyInCartTitle/Description` | Conditional | Shown when Move-to-Cart returns `409 Conflict` ("This product is already in cart.") |

**Availability:** The wishlist API returns `stockStatus` and `isInStock`, but the card renders no stock badge. The Add button is disabled when `isInStock` is false.

**Localization:** Page headings, clear-all controls, error states, and empty-state text use translation keys. The item count, card category fallback, Add label, and remove-button `aria-label` are hard-coded English.

**Note:** `GuestLoginModal` is rendered by the header icon flow, not on this page. The product-detail Add to Wishlist button is disabled for guests and non-buyers. The page route itself is protected, so guests are redirected to `/login` by `ProtectedRoute`.

**Default State:**
- Page title and item count displayed at top
- Wishlist items displayed in responsive grid (4 columns desktop, 3 tablet, 2 default/mobile)
- Loading skeleton shown during initial data fetch
- Empty state shown when no items exist
- Error/retry state shown when the initial fetch fails

### 5.2 Screen: Cart Page (`/buyer/cart`)

**Purpose:** Allow authenticated users to review and manage items before checkout.

#### 5.2.1 UI Elements

**Cart View:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-15 | Page Title | Heading (h1) | `cart.title` | Yes | "Shopping Cart" with cart icon |
| EL-16 | Page Subtitle | Text | `cart.subtitle` | Yes | "Review items in your cart before checkout" |
| EL-17 | Clear All Button | Button (outline, Trash2) | `cart.clearAll` / `cart.clearing` | Conditional | "All Data Clear"; shown only when items exist; disabled while clearing |
| EL-18 | Cart Items Container | Container (grid, `lg:col-span-2`) | — | Yes | List of `CartItemRow` components |
| EL-19 | Cart Item Row | Row (`CartItemRow`) | — | Yes | Product image, name, unit price, stock badge, quantity stepper, subtotal, remove |
| EL-20 | Product Image | Image | — | Yes | Clickable thumbnail linking to `/buyer/products/:slug`; a missing URL renders a blank muted thumbnail, and image-load failures have no fallback handler |
| EL-21 | Product Name | Text (link) | — | Yes | Clickable product name linking to the same product route |
| EL-22 | Unit Price | Text | — | Yes | Price per unit shown as "{price} each"; the "each" suffix is hard-coded English |
| EL-23 | Stock Warning | Badge (`StockBadge`) | — | Yes | Hard-coded "In Stock", "Only {n} left", or "Out of Stock" |
| EL-24 | Quantity Controls | Stepper (`QuantityStepper`) | Hard-coded aria-labels | Yes | Minus button, quantity input, plus button; accessible labels are English |
| EL-25 | Item Subtotal | Text | — | Yes | `unit_price × quantity` formatted as `{rounded}Ks` |
| EL-26 | Remove Button | Button (ghost/icon, Trash2) | Hard-coded `aria-label` | Yes | Remove item from cart (mobile top-right and desktop) |
| EL-27 | Cart Summary Panel | Card/Sidebar (`CartSummaryPanel`) | `cart.summary` | Yes | Order summary with subtotal, shipping estimate, and total |
| EL-28 | Subtotal | Text | `cart.subtotalLabel` | Yes | Sum of all item subtotals |
| EL-29 | Shipping Estimate | Text | `cart.shippingEstimate` | Yes | Label is translated; value shows hard-coded "Free" when the amount is 0, otherwise formatted `{rounded}Ks` |
| EL-30 | Out-of-Stock Notice | Text (destructive) | — | Conditional | Hard-coded "Some items are out of stock" when `summary.hasOutOfStock` |
| EL-31 | Total | Text | `cart.total` | Yes | `subtotal + shippingEstimate`, highlighted |
| EL-32 | Checkout Button | Button (primary) | `cart.checkout` | Yes | Navigate to `/buyer/checkout`; when the account is deactivated it opens the Account Deactivated dialog instead |
| EL-33 | Continue Shopping Link | Link (ghost) | `cart.continueShopping` | Yes | "Continue Shopping" link to `/buyer/search` |
| EL-34 | Empty State | `EmptyState` (`variant="cart"`) | `cart.emptyTitle`, `cart.emptyMessage` | Conditional | "Your cart is empty" / "Start shopping!" with Continue Shopping button to `/buyer/search` |
| EL-35 | Loading Skeleton | Skeleton | — | Conditional | 3 row skeletons plus a summary skeleton while loading |
| EL-36 | Clear All Confirm Dialog | `ConfirmDialog` | `cart.clearAllTitle/Confirm/ConfirmButton/CancelButton` | Conditional | Confirms clearing the whole cart before calling Clear-All |
| EL-41 | Error / Retry State | Empty-state block | `cart.errorTitle`, `cart.errorMessage`, `cart.retry` | Conditional | Shown on load failure with a "Try again" button calling `refetch()` |
| EL-42 | Account Deactivated Dialog | `AccountDeactivatedDialog` | — | Conditional | Shown when a deactivated user clicks "Proceed to Checkout" |

**Localization:** The page title/subtitle, clear-all controls, summary labels, checkout/continue-shopping buttons, empty state, and error state use translations. Stock badges, quantity-control/remove aria labels, the unit-price suffix, "Free", and the out-of-stock notice are hard-coded English.

**Default State:**
- Cart items displayed as rows with quantity controls
- Summary panel displayed on right side (desktop) or below items (mobile)
- When the cart has items, the checkout button is rendered regardless of `canCheckout`; that API field is not shown or used by the UI. Navigation is blocked only when the account is deactivated.
- Loading skeleton shown during initial data fetch
- Empty state shown when no items exist
- Error/retry state shown when the initial fetch fails

- **Guest Login Modal (shared):** Rendered by the shared `GuestLoginModal` in the header icon flow, not on these pages.
- **Trigger:** A guest clicks the header cart or wishlist icon. Product-detail Add to Cart instead redirects directly to login; Add to Wishlist is disabled for guests and non-buyers.
- **Behavior:** The header modal shows "Please log in to add items to your cart." or "Please log in to add items to your wishlist." according to the selected icon.
- **Actions:** Clicking [Log In] navigates to `/login?redirect=<encoded targetPath>`. Clicking [Cancel], outside the modal, or pressing ESC closes the modal.
- **i18n Keys:** Cart: `cart.guestLoginAlert.title`, `cart.guestLoginAlert.message`, `cart.guestLoginAlert.loginButton`, `cart.guestLoginAlert.closeButton`; Wishlist: `wishlist.guestLoginAlert.title`, `wishlist.guestLoginAlert.message`, `wishlist.guestLoginAlert.loginButton`, `wishlist.guestLoginAlert.closeButton`

---

## 6. Functional Operation Specification

### 6.1 Operation: Add Product to Wishlist

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Add to Wishlist" button on product detail |
| **API Endpoint** | `POST /api/v1/wishlist/:productId` |
| **Request Headers** | `Authorization: Bearer <accessToken>` |
| **Guest Behavior** | The product-detail Add to Wishlist button is disabled for guests and non-buyers. Header and listing/search/recommendation actions open their login dialog. |
| **Pre-Submission Validation** | User authenticated with the `buyer` role; product exists and is active |
| **Processing Steps** | 1. Validate JWT token, the `buyer` role, and active account. 2. Verify product exists; `404` if missing. 3. If `!isActive`, return `404` ("Product is not available"). 4. Check if product already in the user's wishlist; `409` if present. 5. Check the user's wishlist count (< 100); `400` if at the limit. 6. Create the wishlist record. 7. Return `{ data: <wishlist item DTO> }`. |
| **Success Response** | 201 Created with wishlist item data |
| **Post-Action** | Invalidate wishlist data; on success, the button label changes to "Added to Wishlist" and a success toast is shown. Repeated clicks return 409 and show the "Already in Wishlist" dialog. |

### 6.2 Operation: Remove Product from Wishlist

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Remove" (trash) button on a wishlist card |
| **API Endpoint** | `DELETE /api/v1/wishlist/:productId` |
| **Request Headers** | `Authorization: Bearer <accessToken>` |
| **Pre-Submission Validation** | User authenticated with the `buyer` role; product is in the user's wishlist |
| **Processing Steps** | 1. Validate JWT token and the `buyer` role. 2. Find the wishlist record by `userId` + `productId`; `404` if absent. 3. Delete the record. 4. Return 204 with no response body. |
| **Success Response** | 204 No Content |
| **Post-Action** | Remove the item from the wishlist view. The product-detail Add to Wishlist button does not remove an already-saved product; the duplicate response opens the "Already in Wishlist" dialog. |

### 6.3 Operation: View Wishlist

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Navigation to `/buyer/wishlist` |
| **API Endpoint** | `GET /api/v1/wishlist` |
| **Request Headers** | `Authorization: Bearer <accessToken>` |
| **Guest Behavior** | The `/buyer/wishlist` route is protected by `ProtectedRoute roles={['buyer']}`, so guests are redirected to `/login`. The header wishlist icon and listing/search/recommendation actions open login dialogs; the product-detail Add to Wishlist button is disabled for guests and non-buyers. |
| **Pre-Submission Validation** | User authenticated with the `buyer` role |
| **Processing Steps** | 1. Validate JWT token and the `buyer` role. 2. Query `wishlists` by `user_id`, ordered by `created_at DESC`. 3. Join with `products` (and `category`) for name, category, slug, price, compareAtPrice, images, active status, and stock. 4. Derive `stockStatus` and `isInStock`. 5. Return `{ data: { items, totalCount } }`. An unknown/empty `userId` returns an empty list. |
| **Success Response** | 200 OK with wishlist items array |
| **Post-Action** | Render wishlist grid with product cards |

### 6.4 Operation: Move Wishlist Item to Cart

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Add to Cart" button on wishlist item |
| **API Endpoint** | `POST /api/v1/wishlist/:productId/move-to-cart` |
| **Request Headers** | `Authorization: Bearer <accessToken>` |
| **Pre-Submission Validation** | User authenticated with the `buyer` role; product is in the wishlist, active, and in stock, and not already in the cart |
| **Processing Steps** | 1. Validate JWT token, the `buyer` role, and active account. 2. Find the wishlist record; `404` if absent. 3. Verify the product exists and `isActive`; `404` otherwise. 4. If `stock_quantity <= 0`, return `400` ("Product is out of stock"). 5. Upsert the user's `cart` row. 6. If a `cart_item` for the product already exists, return `409 Conflict` ("This product is already in cart."). 7. Otherwise create the `cart_item` with `quantity = 1`. 8. Delete the wishlist record. 9. Return `{ data: { cartItem, wishlistRemoved: true } }`. These writes are not wrapped in a Prisma transaction. |
| **Success Response** | 200 OK with cart item data |
| **Post-Action** | Remove from wishlist view; show in cart. On `409`, display `DuplicateCartAlertDialog` |

### 6.5 Operation: Add Product to Cart

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Add to Cart" button on product detail, listing/search card, or recommendation card |
| **API Endpoint** | `POST /api/v1/cart/items` |
| **Request Headers** | `Authorization: Bearer <accessToken>` |
| **Guest Behavior** | On the product detail page, an unauthenticated Add to Cart click navigates directly to `/login?redirect=/buyer/products`. Header and listing/search/recommendation actions open a login-required dialog; [Log In] returns to the selected header route, the current pathname on SearchFilter/MatchingRecommendations, or `/login` without a redirect on the buyer product-list page. |
| **Request Body** | `{ productId: string, quantity?: number }` |
| **Pre-Submission Validation** | User authenticated with the `buyer` role; product exists, is active, and has stock > 0 |
| **Processing Steps** | 1. Validate JWT token, the `buyer` role, and active account. 2. Validate request body (`productId` must be a UUID v4; `quantity` is an integer from 1 to 99 and defaults to 1). 3. Verify product exists, `isActive = true`, and `stock_quantity > 0`. 4. Check whether the product already exists in the user's cart. 5. If it exists, return `409 Conflict`; quantity changes use PATCH. 6. Otherwise create the cart item. 7. Return the item in the standard response envelope with Decimal monetary fields serialized as strings. |
| **Success Response** | 201 Created with cart item data |
| **Post-Action** | Invalidate the cart query. The product-detail flow shows a success toast; duplicate products show the "Already in Cart" dialog. Other failures in that flow currently have no visible error feedback. |

### 6.6 Operation: Update Cart Item Quantity

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Plus/Minus button click or direct quantity input |
| **API Endpoint** | `PATCH /api/v1/cart/items/:id` |
| **Request Headers** | `Authorization: Bearer <accessToken>` |
| **Request Body** | `{ quantity: number }` |
| **Pre-Submission Validation** | User authenticated with the `buyer` role; cart item belongs to the user's cart |
| **Processing Steps** | 1. Validate JWT token and the `buyer` role. 2. Resolve the cart item through the authenticated user's `cart.id` (ownership check). 3. Validate quantity as an integer from 1 to 99. 4. Verify `quantity ≤ product.stock_quantity`. 5. Update the cart item quantity. 6. Return the updated item with the new subtotal and Decimal monetary fields serialized as strings. |
| **Success Response** | 200 OK with updated cart item data |
| **Post-Action** | Update subtotal display; update cart badge if quantity changed |

### 6.7 Operation: Remove Item from Cart

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Remove" button on cart item |
| **API Endpoint** | `DELETE /api/v1/cart/items/:id` |
| **Request Headers** | `Authorization: Bearer <accessToken>` |
| **Pre-Submission Validation** | User authenticated with the `buyer` role; cart item belongs to the user's cart |
| **Processing Steps** | 1. Validate JWT token and the `buyer` role. 2. Resolve the cart and confirm the cart item belongs to it. 3. Delete the cart item record. 4. Return 204 with no response body. |
| **Success Response** | 204 No Content |
| **Post-Action** | Remove item from cart view; update subtotal and badge |

### 6.8 Operation: View Cart

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Navigation to `/buyer/cart` |
| **API Endpoint** | `GET /api/v1/cart` |
| **Request Headers** | `Authorization: Bearer <accessToken>` |
| **Pre-Submission Validation** | User authenticated with the `buyer` role |
| **Processing Steps** | 1. Validate JWT token and the `buyer` role. 2. Resolve the user's `cart` and query its `cart_items`. 3. Join with `products` for details (name, slug, images, price, active status, stock). 4. Calculate `unitPrice × quantity` for each item and sum the pre-discount subtotal. 5. Derive stock status and availability (`stock_quantity >= quantity`). 6. Set `canCheckout = true` only when every item is active and available; set it to `false` for `OUT_OF_STOCK`, `QUANTITY_EXCEEDED`, or `INACTIVE` items, and for an empty cart. 7. Return `{ data: { items, summary } }`, serializing Decimal values as strings. |
| **Success Response** | 200 OK with cart items and summary |
| **Post-Action** | Render cart view with items and summary panel |

### 6.9 Operation: Clear All Wishlist

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "All Data Clear" button on the wishlist page → confirm in `ConfirmDialog` |
| **API Endpoint** | `DELETE /api/v1/wishlist` |
| **Request Headers** | `Authorization: Bearer <accessToken>` |
| **Pre-Submission Validation** | User authenticated with the `buyer` role |
| **Processing Steps** | 1. Validate JWT token and the `buyer` role. 2. `deleteMany` all `wishlists` rows where `user_id = userId`. 3. Return `{ data: { success: true, deletedCount } }`. |
| **Success Response** | 200 OK with `{ success, deletedCount }` |
| **Post-Action** | Show empty state; update wishlist badge |

### 6.10 Operation: Clear All Cart

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "All Data Clear" button on the cart page → confirm in `ConfirmDialog` |
| **API Endpoint** | `DELETE /api/v1/cart/items` |
| **Request Headers** | `Authorization: Bearer <accessToken>` |
| **Pre-Submission Validation** | User authenticated with the `buyer` role |
| **Processing Steps** | 1. Validate JWT token and the `buyer` role. 2. Resolve the user's `cart`; if none exists return `{ success: true, deletedCount: 0 }`. 3. `deleteMany` all `cart_items` where `cart_id = cart.id`. 4. Return `{ data: { success: true, deletedCount } }`. |
| **Success Response** | 200 OK with `{ success, deletedCount }` |
| **Post-Action** | Show empty state; update cart badge |

---

## 7. Input / Output Specification

### 7.1 Input Specification — Add to Wishlist (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|------------|
| `productId` | Product ID | 商品ID | UUID v4 | Yes | `@IsUUID('4')`, `@IsNotEmpty()`, UUID v4 format |

### 7.2 Input Specification — Add to Cart (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|------------|
| `productId` | Product ID | 商品ID | UUID v4 | Yes | `@IsUUID('4')`, `@IsNotEmpty()`, UUID v4 format |
| `quantity` | Quantity | 数量 | INTEGER | No (default: 1) | `@IsInt()`, `@Min(1)`, `@Max(99)`; server cap is 99 |

### 7.3 Input Specification — Update Cart Quantity (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|------------|
| `quantity` | Quantity | 数量 | INTEGER | Yes | `@IsInt()`, `@Min(1)`, `@Max(99)` |

### 7.4 Output Specification — Wishlist Item (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `id` | `wishlists.id` | UUID string |
| `productId` | `wishlists.product_id` | UUID string |
| `productName` | `products.name` | String |
| `category` | `products.category.name` | GET wishlist response only; String, falls back to "Uncategorized". The add response does not include this field. |
| `productSlug` | `products.slug` | URL-friendly string |
| `productImage` | `products.images[0]` | URL string or null |
| `productPrice` | `products.price` | Decimal serialized as a string; rendered as `{rounded}Ks` |
| `compareAtPrice` | `products.compare_at_price` | Decimal serialized as a string or null |
| `stockStatus` | `products.stock_quantity` | `"IN_STOCK"` / `"LOW_STOCK"` / `"OUT_OF_STOCK"` |
| `isInStock` | `products.stock_quantity > 0` | Boolean |
| `createdAt` | `wishlists.created_at` | ISO 8601 timestamp |

### 7.5 Output Specification — Cart Item (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `id` | Cart item ID | UUID string |
| `productId` | Product reference | UUID string |
| `productName` | `products.name` | String |
| `productSlug` | `products.slug` | URL-friendly string |
| `productImage` | `products.images[0]` | URL string or null |
| `unitPrice` | `products.price` | Decimal serialized as a string; format for display in the frontend |
| `quantity` | Cart item quantity | Integer |
| `subtotal` | `unitPrice × quantity` | Decimal serialized as a 2-decimal string; discounts are excluded |
| `stockQuantity` | `products.stock_quantity` | Integer |
| `stockStatus` | Derived from stock_quantity | `"IN_STOCK"` / `"LOW_STOCK"` / `"OUT_OF_STOCK"` |
| `isAvailable` | `isActive && stock_quantity >= quantity` (GET); `stock_quantity >= quantity` (add/update) | Boolean |

### 7.6 Output Specification — Cart Summary (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `items` | Cart items array | Array of Cart Item DTOs |
| `totalItems` | Sum of quantities | Integer |
| `subtotal` | Sum of all subtotals (unit_price × quantity per item, **before** discounts) | Decimal serialized as a 2-decimal string |
| `shippingEstimate` | Fixed `"0.00"` (shipping is not computed on the cart page) | Decimal serialized as a string |
| `total` | `subtotal + shippingEstimate` | Decimal serialized as a 2-decimal string |
| `hasOutOfStock` | Any item with `stockQuantity <= 0` | Boolean |
| `canCheckout` | `true` only when the cart is non-empty and contains no out-of-stock, quantity-exceeded, or inactive items; otherwise `false`. The Cart UI does not use this field to disable checkout. | Boolean |

---

## 8. Input Validation Rules

### 8.1 Add to Wishlist Validation

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `productId` | Required, valid UUID format | "Product ID is required" / "Invalid product ID" | "商品IDは必須です" / "無効な商品IDです" |
| — | Product must exist and be active | "Product not found or unavailable" | "商品が見つからないか利用できません" |
| — | Product must not already be in wishlist | "Product already in wishlist" | "商品は既にお気に入りに追加されています" |

**Implementation note:** `productId` is a raw route parameter in the current controller; the declared wishlist path DTO is not wired to this route, so UUID format is not validated by a DTO before the service call.

### 8.2 Add to Cart Validation

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `productId` | Required, valid UUID format | "Product ID is required" / "Invalid product ID" | "商品IDは必須です" / "無効な商品IDです" |
| `quantity` | Optional, integer ≥ 1, ≤ 99 | "Quantity must be at least 1" / "Quantity cannot exceed 99" | "数量は1以上である必要があります" / "数量は99を超えることはできません" |
| — | Product must exist, be active, and have stock > 0 | "Product is out of stock" | "商品は在庫切れです" |
| — | Initial quantity must not exceed stock | Not checked by the add service; the returned item can have `isAvailable: false` | — |
| — | Product must not already be in the cart | "This product is already in cart." (`409 Conflict`) | "この商品はすでにカートに入っています" |

### 8.3 Update Cart Quantity Validation

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `quantity` | Required, integer ≥ 1, ≤ 99 | "Quantity must be at least 1" / "Quantity cannot exceed 99" | "数量は1以上である必要があります" / "数量は99を超えることはできません" |
| — | Requested quantity ≤ product stock_quantity | "Only {stock} available in stock" | "在庫が{stock}個しかありません" |

### 8.4 Validation Enforcement Layers

1. **Frontend (Client)**: Cart-row `QuantityStepper` limits values to `min(99, stockQuantity)`; product-detail `QuantityStepper` uses `stockQuantity` as its maximum without a 99 cap, so a stock value above 99 can expose a quantity that the server rejects. Input uses `parseInt`, so a decimal such as `2.5` is truncated to `2`. No inline quantity validation message is rendered. The 100-item wishlist limit is enforced on the server; the frontend does not disable Add to Wishlist at the limit. Forms use component-level constraints rather than React Hook Form + Zod on these pages.
2. **Backend (Server)**: NestJS `ValidationPipe` + class-validator DTOs (`AddToCartDto`, `UpdateCartQuantityDto`). **Note:** the wishlist and cart-item path parameters (`:productId`, `:id`) are declared with DTO classes (`AddToWishlistDto`, `WishlistPathDto`, `CartItemPathDto`) that are currently **not** wired into the controllers, so path IDs are read as raw strings at runtime. UUID format errors therefore surface as `404`/`409`/`500` from the service rather than `400`.
3. **Database (DB)**: Prisma constraints (unique `[user_id, product_id]`, FK, quantity ≥ 1) as the final safety net.

---

## 9. Error Handling Specification

### 9.1 Error Response Structure

```json
{
  "statusCode": 400,
  "errorCode": "VAL_001",
  "message": ["Invalid product ID format"],
  "error": "Bad Request",
  "timestamp": "2026-08-05T12:00:00.000Z",
  "path": "/api/v1/cart/items"
}
```

### 9.2 Error Classification Table — Wishlist

| HTTP Status | Error Code | Scenario | Current User-Facing Behavior |
|-------------|------------|----------|------------------------------|
| `400` | `VAL_001` | Wishlist limit reached or validation failure | Listing/search/recommendation flows show a generic failure toast; product-detail Add to Wishlist currently has no visible feedback for non-409 failures. |
| `401` | `AUTH_001` | Missing or invalid JWT token | Buyer routes are protected and direct guest navigation redirects to `/login`; API failure handling depends on the auth layer. |
| `403` | `RES_004` (role/access denial); `ACCOUNT_DEACTIVATED` (active-user guard) | Authenticated user is not a buyer or the account is deactivated | Product-detail handlers navigate non-buyers to `/unauthorized` and show `AccountDeactivatedDialog` for deactivated buyers. Listing/search/recommendation actions show a generic failure toast for a deactivated account. |
| `404` | `RES_001` | Product not found, inactive, or wishlist item not found | Wishlist page remove/move and listing/search/recommendation failures show generic failure feedback; product-detail non-409 failures have no visible feedback. |
| `409` | `RES_003` | Product already in wishlist | Product-detail flow shows the "Already in Wishlist" dialog; listing/search/recommendation flows show an informational "Already in your wishlist" message. |
| `500` | `SYS_001` | Server error | Wishlist page remove/move and listing/search/recommendation failures show generic failure feedback; product-detail non-409 failures have no visible feedback. |

### 9.3 Error Classification Table — Cart

| HTTP Status | Error Code | Scenario | Current User-Facing Behavior |
|-------------|------------|----------|------------------------------|
| `400` | `VAL_001` | Invalid quantity, out of stock, or requested quantity exceeds stock | Cart-page quantity updates show the generic "Failed to update quantity" toast. Listing/search/recommendation add flows show a generic failure toast; product-detail Add to Cart currently has no visible feedback for non-409 failures. Out-of-stock controls are disabled. |
| `401` | `AUTH_001` | Missing or invalid JWT token | Buyer routes are protected and direct guest navigation redirects to `/login`; API failure handling depends on the auth layer. |
| `403` | `RES_004` (role/access denial); `ACCOUNT_DEACTIVATED` (active-user guard) | Authenticated user is not a buyer or the account is deactivated | Product-detail handlers navigate non-buyers to `/unauthorized` and show `AccountDeactivatedDialog` for deactivated buyers. Listing/search/recommendation add actions show a generic failure toast; cart checkout shows `AccountDeactivatedDialog`. |
| `404` | `RES_001` | Cart item/product not found or product inactive | Cart-page remove failures and listing/search/recommendation add failures show generic failure feedback; product-detail non-409 failures have no visible feedback. |
| `409` | `RES_003` | Product already in cart (add or move-to-cart) | Product-detail and listing/search/recommendation Add to Cart, and wishlist Move-to-Cart, show duplicate-cart dialogs. |
| `500` | `SYS_001` | Server error | Cart-page update/remove/clear failures and listing/search/recommendation add failures show generic failure feedback; product-detail non-409 failures have no visible feedback. |

### 9.4 Frontend Error Display Behavior

- **Input Validation**: The quantity input accepts only parsed integer values within its HTML min/max range; invalid/empty input is ignored and no inline error is rendered. `parseInt` truncates decimal input.
- **Toast Notifications**: Wishlist and cart page handlers show success/failure toasts for remove, move, quantity update, and clear-all operations. Product-detail add handlers show success toasts and duplicate dialogs but currently do not surface other API failures.
- **Query Updates**: Mutations invalidate the relevant TanStack Query key on settlement; no optimistic heart/cart updates are implemented.
- **Loading States**: Page skeletons appear during loading; page-level loading failures show an error state and a Retry button. Mutation controls show loading/disabled states.
- **Stock Warnings**: Cart rows show the stock badge; wishlist cards have no stock badge and disable Add when the product is out of stock.

---

## 10. Permission and Access Control

### 10.1 Authentication Requirements

- JSON Web Token (JWT) Bearer Token passed via the `Authorization` header for all wishlist and cart endpoints.
- Every endpoint is protected by `JwtAuthGuard` and `RolesGuard`, with `@Roles('buyer')`.
- Mutating add/move endpoints (`POST /wishlist/:productId`, `POST /wishlist/:productId/move-to-cart`, `POST /cart/items`) additionally require `ActiveUserGuard` so deactivated accounts cannot create items.

### 10.2 Public vs Protected Endpoints

| Endpoint | Access Level | Description |
|----------|-------------|-------------|
| `GET /wishlist` | Protected | Requires a valid access token and the `buyer` role |
| `POST /wishlist/:productId` | Protected | Requires a valid access token, the `buyer` role, and an active account (`ActiveUserGuard`) |
| `DELETE /wishlist/:productId` | Protected | Requires a valid access token and the `buyer` role |
| `DELETE /wishlist` | Protected | Clear All — requires a valid access token and the `buyer` role |
| `POST /wishlist/:productId/move-to-cart` | Protected | Requires a valid access token, the `buyer` role, and an active account (`ActiveUserGuard`) |
| `GET /cart` | Protected | Requires a valid access token and the `buyer` role |
| `POST /cart/items` | Protected | Requires a valid access token, the `buyer` role, and an active account (`ActiveUserGuard`) |
| `PATCH /cart/items/:id` | Protected | Requires a valid access token and the `buyer` role |
| `DELETE /cart/items/:id` | Protected | Requires a valid access token and the `buyer` role |
| `DELETE /cart/items` | Protected | Clear All — requires a valid access token and the `buyer` role |

### 10.3 Role-Based Access

| Role | Can Access Wishlist | Can Access Cart | Notes |
|------|:-------------------:|:---------------:|-------|
| `buyer` | ✓ | ✓ | Primary users of these features |
| `merchant` | ✗ | ✗ | Forbidden: "Shopping features are only available to buyers" (403 Forbidden) |
| `admin` | ✗ | ✗ | Forbidden: "Shopping features are only available to buyers" (403 Forbidden) |


### 10.4 Ownership Rules

| Resource | Ownership Rule | Enforcement |
|----------|---------------|-------------|
| Wishlist items | Users can only view/modify their own wishlist items | Backend filters by `user_id` from JWT |
| Cart items | Users can only view/modify items reachable through their own `cart.id` | Backend resolves `cart.id` from `user_id` in the JWT and filters by `cart_id` |

---

## 11. Real-Time Notification Behavior

### 11.1 Current Implementation

The Wishlist and Cart pages operate with standard REST API calls. Real-time WebSocket updates are not required for these features.

### 11.2 Client-Side State Updates

| Event | Trigger | Action |
|-------|---------|--------|
| `wishlist:add` | Product-detail or listing/search/recommendation Add to Wishlist click | Add via mutation; invalidate `['wishlist']`; duplicate behavior varies by surface |
| `wishlist:remove` | Wishlist card trash button or listing/search/recommendation toggle | Remove via mutation; invalidate `['wishlist']` |
| `wishlist:clear` | Clear All confirm | Invalidate `['wishlist']`; show cleared toast and empty state |
| `wishlist:move` | Move to Cart click | Invalidate `['wishlist']` and `['cart']`; on `409` open `DuplicateCartAlertDialog` |
| `cart:add` | Add to cart button click | Invalidate `['cart']`; refresh cart data and header badge; show a success toast on supported surfaces |
| `cart:update` | Quantity change | Invalidate `['cart']`; update subtotal display and badge |
| `cart:remove` | Remove button click | Invalidate `['cart']`; remove item from view; update badge and subtotal |
| `cart:clear` | Clear All confirm | Invalidate `['cart']`; show cleared toast and empty state |

---

## 12. Screen Transition Specification

### 12.1 Inbound Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| Buyer navigation | `/buyer/wishlist` | Click "Wishlist" link (authenticated) |
| Header cart icon | `/buyer/cart` | Click cart icon (authenticated) |
| Header heart icon | `/buyer/wishlist` | Click wishlist icon (authenticated) |
| Any page (unauthenticated) | Login-required dialog | Click header wishlist/cart icon or listing/search/recommendation action as guest |
| Product detail (unauthenticated) | `/login?redirect=/buyer/products` | Click Add to Cart as guest; Add to Wishlist is disabled |

### 12.2 Internal Navigation

| Source | Target | Trigger |
|--------|--------|---------|
| `/buyer/wishlist` | `/buyer/wishlist/products/:slug` | Click product image or name on a wishlist card |
| `/buyer/wishlist` | Cart contents (implicit) | Click "Add" (Move to Cart) on a wishlist item — item is added to the cart; both query keys refresh and the user stays on the wishlist page |
| `/buyer/cart` | `/buyer/products/:slug` | Click product image or name |
| `/buyer/cart` | `/buyer/checkout` | Click "Proceed to Checkout" (active account) |
| `/buyer/cart` | `/buyer/search` | Click "Continue Shopping" |
| `/buyer/wishlist` (empty) | `/buyer/search` | Click "Continue Shopping" in the empty state |

### 12.3 Outbound Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| `/buyer/cart` | `/buyer/checkout` | Proceed to checkout (active account) |
| Login-required dialog | Login route | [Log In] clicked by a guest; header modal uses the selected wishlist/cart route, SearchFilter/MatchingRecommendations use the encoded current pathname, and the buyer product-list dialog goes to `/login` without a redirect |
| `/login` | Protected page | Direct navigation by guest (via `ProtectedRoute`) |

### 12.4 Error Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| `/buyer/wishlist` | `/login` | 401 Unauthorized or guest direct navigation |
| `/buyer/cart` | `/login` | 401 Unauthorized or guest direct navigation |
| Product Detail | `/login?redirect=/buyer/products` | Guest user clicks Add to Cart; the Add to Wishlist button is disabled |
| Listing/search/recommendation page | Login-required dialog | Guest user clicks a wishlist/cart action; post-login target varies by page as specified above |
| `/buyer/cart` | `AccountDeactivatedDialog` | Deactivated account clicks "Proceed to Checkout" |

---

## 13. Non-Functional Considerations

### 13.1 Performance Requirements

| Metric | Target |
|--------|--------|
| Wishlist Page Load | ≤ 2 seconds |
| Cart Page Load | ≤ 2 seconds |
| Add to Wishlist API | ≤ 300 milliseconds |
| Add to Cart API | ≤ 300 milliseconds |
| Update Quantity API | ≤ 200 milliseconds |
| Remove Item API | ≤ 200 milliseconds |
| Stock Validation Check | ≤ 100 milliseconds |

### 13.2 Caching Strategy

| Cache Target | Strategy | TTL |
|--------------|----------|-----|
| Wishlist items | TanStack Query in-memory cache (user-keyed); `staleTime: 0`, refetch on mount/window focus, one retry | No persistent cache |
| Cart items | TanStack Query in-memory cache (user-keyed); `staleTime: 0`, refetch on mount/window focus, one retry | No persistent cache |
| Stock quantities | Loaded with wishlist/cart responses from the database | Refetched with the corresponding query |

### 13.3 Security Considerations

| Concern | Mitigation |
|---------|------------|
| Unauthorized access | JWT Bearer token validation on all endpoints |
| Price manipulation | Price fetched from DB, not client-provided |
| Stock manipulation | Stock validated server-side before operations |
| IDOR attacks | Ownership validation (userId from JWT) |
| Race conditions on stock | Stock validated server-side before operations; the unique `[user_id, product_id]` constraint guards duplicate wishlist inserts. Move-to-Cart/Add-to-Cart are not wrapped in an explicit Prisma transaction in the current implementation. |

### 13.4 Responsive Design Requirements

| Breakpoint | Wishlist Layout | Cart Layout |
|------------|-----------------|-------------|
| Desktop (≥ 1024px, `lg`) | 4-column grid | 3-column grid: items span 2, summary sidebar sticky on the right |
| Tablet (768px – 1023px, `md`) | 3-column grid | Items stacked above the summary (summary below) |
| Mobile (< 768px) | 2-column grid | Stacked items + bottom summary |

---

## 14. Configurable Items (External Definitions)

Intended `.env` configuration values and their **current implementation status**:

| Definition Key | Default Value | Current Implementation |
|----------------|---------------|------------------------|
| `WISHLIST_MAX_ITEMS` | `100` | Hardcoded `100` in `WishlistService.addToWishlist`; not read from env |
| `CART_MAX_ITEMS` | `50` | Not enforced anywhere |
| `CART_MAX_QUANTITY_PER_ITEM` | `99` | Enforced via `@Max(99)` in `AddToCartDto` / `UpdateCartQuantityDto` and the cart-row `QuantityStepper`; the product-detail stepper is capped by stock only and can expose values above 99; not env-driven |
| `LOW_STOCK_THRESHOLD` | `10` | Hardcoded `10` in `calculateStockStatus` (wishlist and cart services); not read from env |
| Shipping estimate | `0.00` | Fixed `"0.00"` in `CartService.getCartItems`; not env-driven |

---

## 15. Cross-Reference Traceability Matrix

### 15.1 Requirements Definition Traceability

| Requirement ID | Requirement Description | Covered By (This Document) |
|----------------|-------------------------|----------------------------|
| B-WISH-001 | User can add product to wishlist | UC-WISH-001, Sec 6.1 |
| B-WISH-002 | User can remove product from wishlist | UC-WISH-002, Sec 6.2 |
| B-WISH-003 | User can view wishlist list | UC-WISH-003, Sec 6.3 |
| B-WISH-004 | Wishlist shows product images, prices, availability | Sec 5.1, BR-DISP-001/002/003 |
| B-WISH-005 | User can move wishlist items to cart | UC-WISH-004, Sec 6.4 |
| B-CART-001 | User can add products to cart | UC-CART-001, Sec 6.5 |
| B-CART-002 | User can update item quantities | UC-CART-002, Sec 6.6 |
| B-CART-003 | User can remove items from cart | UC-CART-003, Sec 6.7 |
| B-CART-004 | Cart shows item subtotal calculation | Sec 5.2, BR-CART-008 |
| B-CART-005 | Cart shows available stock | Sec 5.2, BR-DISP-003 |
| B-CART-006 | Cart persists across sessions (logged-in users) | BR-CART-007, Sec 6.8 |
| B-CART-007 | Cart shows product images and names | Sec 5.2, BR-DISP-001 |

> **Note:** Clear-All wishlist/cart (UC-WISH-006, UC-CART-006) and the duplicate-cart conflict handling (BR-CART-009, BR-WISH-006) are implemented in the current codebase but do not map to a dedicated requirement ID in `要件定義書_REQUIREMENT_SPEC.md`; they are documented here for implementation traceability.

### 15.2 Database Design Traceability

| Database Table | Relevant Functional Operations |
|----------------|-------------------------------|
| `wishlists` | Add (INSERT), Remove (DELETE), View (SELECT), Move to Cart (DELETE), Clear All (DELETE many) |
| `carts` | Resolve the authenticated buyer's single cart (SELECT/UPSERT) |
| `cart_items` | Add (INSERT), Update Quantity (PATCH/UPDATE), Remove (DELETE), View (SELECT), Clear All (DELETE many) |
| `products` | Stock validation (SELECT), Price lookup (SELECT), Product details (SELECT), Category lookup (SELECT) |

### 15.3 Related Document References

| Document ID | Document Name | File Path |
|-------------|---------------|-----------|
| SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` |
| SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` |
| SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` |

---

*End of Functional Specification (Wishlist & Cart Page)*
