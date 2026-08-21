# Functional Specification (機能設計書) — Wishlist & Cart Page

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-FDS-WISH-CART-001 |
| **Target Screen** | Wishlist & Cart Page (お気に入り & カートページ) |
| **Subsystem** | Buyer Module — Wishlist Management & Shopping Cart |
| **Function ID** | FN-WISH-001, FN-CART-001 |
| **Version** | 2.1 |
| **Created** | 2026-08-05 |
| **Last Updated** | 2026-08-20 |
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

1. **Wishlist Management** — Enabling authenticated users to add/remove products from their saved wishlist, view saved products with details, and move items to cart.
2. **Shopping Cart Management** — Enabling authenticated users to add products to cart, update quantities, remove items, and view real-time subtotals.
3. **Stock Validation** — Ensuring products are in stock before adding to cart and validating stock during quantity updates.
4. **Price Calculation** — Computing item subtotals based on unit price × quantity for each cart item. Discounts and coupons are **not** applied on the cart page; coupon entry and discount calculation occur on the checkout page.
5. **Wishlist-to-Cart Transfer** — Allowing users to move saved wishlist items directly into the shopping cart.
6. **Cart Persistence** — Maintaining cart contents across sessions for logged-in users via database storage.
7. **Product Display** — Showing product images, names, prices, and availability status in both wishlist and cart views.

### 1.3 Target Users

| Attribute | Value |
|-----------|-------|
| **Primary Actor** | Authenticated Buyer |
| **Required Authentication** | JWT Bearer Token |
| **Data Scope** | Own wishlist items, Own cart items |
| **Guest Behavior** | Cart not persisted; wishlist unavailable. When a guest user clicks a cart action, an alert modal displays "Please log in to add items to your cart." When a guest user clicks a wishlist action, an alert modal displays "Please log in to add items to your wishlist." Clicking [Log in] in either modal navigates to `/login`. |

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
| `wishlistItems` | Wishlist DTO Array | List of saved products with details |
| `cartItems` | Cart DTO Array | List of cart items with quantities and subtotals |
| `cartSummary` | Cart Summary DTO | Subtotal, item count, stock status |
| `operationResult` | Standard API Response | Success response or HTTP error according to the API standards |

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
| UC-WISH-002 | Remove Product from Wishlist | User is authenticated. Product is in user's wishlist. | Wishlist record deleted. Heart icon toggled to outline state. | Authenticated Buyer |
| UC-WISH-003 | View Wishlist | User is authenticated. User has saved items. | Wishlist page displays all saved products with images, prices, and availability. | Authenticated Buyer |
| UC-WISH-004 | Move Wishlist Item to Cart | User is authenticated. Wishlist item exists. Product is in stock. | Cart item created/updated. Wishlist item optionally removed. | Authenticated Buyer |
| UC-WISH-005 | Guest User Wishlist Action Attempt | User is not authenticated (guest). | Wishlist guest-login alert modal displayed: "Please log in to add items to your wishlist." Clicking [Log in] navigates to `/login`. | Guest User |
| UC-CART-001 | Add Product to Cart | User is authenticated. Product exists, is active, and has stock > 0. | Cart item created with quantity 1. Cart badge updated. | Authenticated Buyer |
| UC-CART-002 | Update Cart Item Quantity | User is authenticated. Cart item exists. Requested quantity ≤ available stock. | Cart item quantity updated. Subtotal recalculated. | Authenticated Buyer |
| UC-CART-003 | Remove Item from Cart | User is authenticated. Cart item exists. | Cart item deleted. Subtotal recalculated. Cart badge updated. | Authenticated Buyer |
| UC-CART-004 | View Cart | User is authenticated. Cart contains items. | Cart page displays all items with images, names, prices, quantities, subtotals, and stock status. | Authenticated Buyer |
| UC-CART-005 | Guest User Add to Cart Attempt | User is not authenticated (guest). | Alert modal displayed: "Please log in to add items to your cart." Clicking [Log in] navigates to `/login`. | Guest User |

### 2.2 Primary Business Workflow — Wishlist

```
                    ┌──────────────────┐
                    │  Product Detail  │
                    │  or Product Card │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌─────────────────────────────┐
                    │  Click Heart / "Add to      │
                    │  Wishlist" Button           │
                    └──────────┬──────────────────┘
                               │
                    ┌──────────┴──────────────────┐
                    │  Authenticated?             │
                    └──────────┬──────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
        ┌──────────┐    ┌──────────┐    ┌──────────────┐
        │ YES      │    │ NO       │    │ Already in   │
        │ (Add/    │    │ (Redirect│    │ Wishlist?    │
        │  Remove) │    │ to Login)│    │              │
        └────┬─────┘    └──────────┘    └──────┬───────┘
             │                                 │
             │                          ┌──────┴───────┐
             │                          ▼              ▼
             │                    ┌──────────┐    ┌──────────┐
             │                    │ YES      │    │ NO       │
             │                    │ (Remove) │    │ (Add)    │
             │                    └────┬─────┘    └────┬─────┘
             │                         │               │
             ▼                         ▼               ▼
     ┌──────────────────────────────────────────────────────┐
     │              Wishlist API Call                       │
     │  POST /wishlist/:productId (Add)                     │
     │  DELETE /wishlist/:productId (Remove)                │
     └──────────────────┬───────────────────────────────────┘
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
        ┌──────────┐        ┌──────────┐
        │ SUCCESS  │        │ FAILURE  │
        │ (200/201)│        │ (400/404)│
        └────┬─────┘        └────┬─────┘
             │                   │
             ▼                   ▼
     ┌──────────────┐    ┌─────────────────┐
     │ Toggle Heart │    │ Display Error   │
     │ Icon State   │    │ Message         │
     └──────────────┘    └─────────────────┘
```

### 2.3 Primary Business Workflow — Cart

```
                    ┌──────────────────┐
                    │  Product Detail  │
                    │  or Wishlist     │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌─────────────────────────────┐
                    │  Click "Add to Cart" Button │
                    └──────────┬──────────────────┘
                               │
                    ┌──────────┴──────────────────┐
                    │  Authenticated?             │
                    └──────────┬──────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
        ┌──────────┐    ┌──────────┐    ┌──────────────┐
        │ YES      │    │ NO       │    │ Out of Stock?│
        │ (Proceed)│    │ (Guest)  │    │              │
        └────┬─────┘    └────┬─────┘    └──────┬───────┘
             │               │                 │
             │               ▼                 │
             │    ┌─────────────────────┐      │
             │    │ Show Alert Modal:   │      │
             │    │ "Please log in to   │      │
             │    │  add items to your  │      │
             │    │  cart."             │      │
             │    │ [Log in]            │      │
             │    └─────────┬───────────┘      │
             │              │                  │
             │              ▼                  │
             │    ┌──────────────────┐         │
             │    │ Click [Log in]   │         │
             │    │ → Navigate to    │         │
             │    │   /login         │         │
             │    └──────────────────┘         │
             │                                 │
             │                          ┌──────┴───────┐
             │                          ▼              ▼
             │                    ┌──────────┐    ┌──────────┐
             │                    │ YES      │    │ NO       │
             │                    │ (Error)  │    │ (Proceed)│
             │                    └──────────┘    └────┬─────┘
             │                                         │
             ▼                                         ▼
     ┌──────────────────────────────────────────────────────┐
     │              Cart API Call                           │
     │  POST /cart/items (Add)                              │
     │  PATCH /cart/items/:id (Update Quantity)             │
     │  DELETE /cart/items/:id (Remove)                     │
     └──────────────────┬───────────────────────────────────┘
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
        ┌──────────┐        ┌──────────┐
        │ SUCCESS  │        │ FAILURE  │
        │ (200/201)│        │ (400/404)│
        └────┬─────┘        └────┬─────┘
             │                   │
             ▼                   ▼
     ┌──────────────┐    ┌─────────────────┐
     │ Update Cart  │    │ Display Error   │
     │ Badge & List │    │ Message         │
     └──────────────┘    └─────────────────┘
```

### 2.4 Workflow Critical Path Summary

| Step | Action | Status Before | Status After | Assigned To |
|:----:|--------|---------------|--------------|-------------|
| 1 | User clicks "Add to Wishlist" on product | Product not saved | Wishlist item created | System |
| 2 | User clicks heart icon again to remove | Product saved | Wishlist item deleted | System |
| 3 | User navigates to /wishlist | — | Wishlist page displayed | System |
| 4 | User clicks "Move to Cart" from wishlist | Item in wishlist | Cart item created | System |
| 5 | User clicks "Add to Cart" on product | Product not in cart | Cart item created | System |
| 6 | User updates quantity in cart | Old quantity | New quantity, subtotal updated | System |
| 7 | User removes item from cart | Item in cart | Cart item deleted | System |
| 8 | User navigates to /cart | — | Cart page displayed | System |

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

**Note on Promotions/Discounts:** The cart page displays only the pre-discount subtotal (unit_price × quantity). Coupon code entry and discount calculation (per Rule 4.5.1 and 4.5.2 in `要件定義書_REQUIREMENT_SPEC.md`) are handled on the checkout page (`/checkout`), not the cart page. This separation ensures the cart remains a simple review step before the full pricing breakdown at checkout.

**Note on Guest User Behavior:** Unauthenticated (guest) users cannot use cart or wishlist actions. A cart action displays an alert modal with "Please log in to add items to your cart." A wishlist action displays an alert modal with "Please log in to add items to your wishlist." Clicking [Log in] in either modal navigates to `/login`; guests are never redirected directly before seeing the modal.

---

## 3. State Transition Specification

### 3.1 Wishlist Item States

| State | Description | Visible in Wishlist | Can Move to Cart |
|-------|-------------|:-------------------:|:----------------:|
| `SAVED` | Product saved in wishlist, in stock | ✓ | ✓ |
| `OUT_OF_STOCK` | Product saved but currently out of stock | ✓ | ✗ |
| `INACTIVE` | Product is deactivated and unavailable for purchase | ✓ (with notice) | ✗ |
| `MOVED_TO_CART` | Item transferred to cart (optional auto-remove) | ✗ (if removed) | — |

### 3.2 Cart Item States

| State | Description | Visible in Cart | Can Checkout |
|-------|-------------|:---------------:|:------------:|
| `ACTIVE` | Item in cart with valid stock and requested quantity available | ✓ | ✓ |
| `LOW_STOCK` | Item in cart, stock below threshold (≤10), with requested quantity available | ✓ (warning) | ✓ |
| `OUT_OF_STOCK` | Item in cart, stock = 0 | ✓ (error) | ✗ |
| `QUANTITY_EXCEEDED` | Requested quantity exceeds available stock | ✓ (error) | ✗ |
| `INACTIVE` | Cart item's product is deactivated | ✓ (with notice) | ✗ |

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
| BR-WISH-006 | Move to Cart Validation | Moving to cart requires product to be in stock (stock_quantity > 0). | Backend (stock check) |
| BR-WISH-007 | Guest User Restriction | Unauthenticated users cannot use wishlist actions. Show the Wishlist guest-login alert before navigation; [Log in] navigates to `/login`. | Frontend (UI guard) |

### 4.2 Cart Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-CART-001 | Authentication and Role Required | Only authenticated users with the `buyer` role can manage the cart. | Backend (`JwtAuthGuard`, `RolesGuard`, `@Roles('buyer')`) |
| BR-CART-002 | Stock Availability | Cannot add product to cart if stock_quantity = 0. | Backend (stock validation) |
| BR-CART-003 | Quantity Limit | Cart item quantity cannot exceed available stock_quantity. | Backend (stock validation) |
| BR-CART-004 | Quantity Minimum | Cart item quantity must be ≥ 1. | Backend (DB constraint) |
| BR-CART-005 | Active Product Only | Only active products can be added to cart. | Backend (service validation) |
| BR-CART-006 | Price at Order Time | Price is locked at order creation time, not cart time. | Backend (order service) |
| BR-CART-007 | Cart Persistence | Cart items are stored in database for logged-in users. | Backend (DB storage) |
| BR-CART-008 | Subtotal Calculation | Subtotal = unit_price × quantity for each item. Discounts and coupons are **not** applied at this stage; coupon entry and discount calculation occur on the checkout page. | Backend (computed field) |
| BR-CART-009 | Duplicate Handling | Adding an existing cart item returns `409 Conflict`; the client updates quantity through the PATCH endpoint. | Backend (service logic) |
| BR-CART-010 | Guest User Restriction | Unauthenticated users cannot use cart actions. Show the Cart guest-login alert before navigation; [Log in] navigates to `/login`. | Frontend (UI guard) |
| BR-CART-011 | Checkout Eligibility | Checkout is enabled only when every cart item is active and the requested quantity is available in stock. It is disabled for `OUT_OF_STOCK`, `QUANTITY_EXCEEDED`, or `INACTIVE` items. | Frontend and backend validation |

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
| BR-DISP-001 | Product Images | Show first image from product.images array as thumbnail. | Frontend |
| BR-DISP-002 | Price Display | Display price formatted with locale-appropriate currency. | Frontend (i18n) |
| BR-DISP-003 | Stock Status | Show "In Stock", "Low Stock (X left)", or "Out of Stock". | Frontend |
| BR-DISP-004 | Cart Badge | Header cart icon shows total item count (sum of quantities). | Frontend |

---

## 5. Screen Specifications

### 5.1 Screen: Wishlist Page (`/wishlist`)

**Purpose:** Allow authenticated users to view and manage their saved products.

#### 5.1.1 UI Elements

**Wishlist View:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-01 | Page Title | Heading (h1) | `wishlist.title` | Yes | "My Wishlist" / "お気に入り" |
| EL-02 | Item Count | Text | `wishlist.itemCount` | Yes | "{count} items saved" |
| EL-03 | Wishlist Grid | Grid Container | — | Yes | Responsive grid of wishlist items |
| EL-04 | Wishlist Item Card | Card | — | Yes | Product image, name, price, stock status, actions |
| EL-05 | Product Image | Image | — | Yes | Clickable thumbnail linking to product detail |
| EL-06 | Product Name | Text (link) | — | Yes | Clickable product name linking to product detail |
| EL-07 | Product Price | Text | — | Yes | Current price with currency formatting |
| EL-08 | Compare Price | Text (strikethrough) | — | No | Original price if discounted |
| EL-09 | Stock Status | Badge | — | Yes | "In Stock", "Low Stock", "Out of Stock" |
| EL-10 | Move to Cart Button | Button (primary) | `wishlist.moveToCart` | Yes | Add item to cart |
| EL-11 | Remove Button | Button (ghost/icon) | `wishlist.remove` | Yes | Remove item from wishlist |
| EL-12 | Empty State | EmptyState | `wishlist.empty` | Conditional | "No items saved yet. Browse products to add favorites." |
| EL-13 | Continue Shopping Link | Link | `wishlist.continueShopping` | Conditional | "Continue Shopping" link to /products |
| EL-14 | Loading Skeleton | Skeleton | — | Conditional | Shown while loading wishlist data |
| EL-37 | Wishlist Guest Login Alert Modal | Dialog/Modal | `wishlist.guestLoginAlert` | Conditional | Alert modal for unauthenticated wishlist actions: "Please log in to add items to your wishlist." with [Log in] button navigating to `/login` |

**Default State:**
- Page title and item count displayed at top
- Wishlist items displayed in responsive grid (4 columns desktop, 2 tablet, 1 mobile)
- Loading skeleton shown during initial data fetch
- Empty state shown when no items exist

### 5.2 Screen: Cart Page (`/cart`)

**Purpose:** Allow authenticated users to review and manage items before checkout.

#### 5.2.1 UI Elements

**Cart View:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-15 | Page Title | Heading (h1) | `cart.title` | Yes | "Shopping Cart" / "カート" |
| EL-16 | Item Count | Text | `cart.itemCount` | Yes | "{count} items in cart" |
| EL-17 | Cart Items Container | Container | — | Yes | List of cart items |
| EL-18 | Cart Item Row | Row/Card | — | Yes | Product image, name, price, quantity controls, subtotal, remove |
| EL-19 | Product Image | Image | — | Yes | Clickable thumbnail linking to product detail |
| EL-20 | Product Name | Text (link) | — | Yes | Clickable product name linking to product detail |
| EL-21 | Unit Price | Text | — | Yes | Price per unit |
| EL-22 | Quantity Controls | Stepper | — | Yes | Minus button, quantity input, plus button |
| EL-23 | Quantity Input | Input (number) | — | Yes | Direct quantity entry |
| EL-24 | Minus Button | Button (icon) | — | Yes | Decrease quantity by 1 |
| EL-25 | Plus Button | Button (icon) | — | Yes | Increase quantity by 1 |
| EL-26 | Item Subtotal | Text | — | Yes | unit_price × quantity |
| EL-27 | Stock Warning | Badge/Alert | — | Conditional | "Only X left in stock" warning |
| EL-28 | Remove Button | Button (ghost/icon) | `cart.remove` | Yes | Remove item from cart |
| EL-29 | Cart Summary Panel | Card/Sidebar | — | Yes | Order summary with totals |
| EL-30 | Subtotal | Text | `cart.subtotal` | Yes | Sum of all item subtotals |
| EL-31 | Item Count Summary | Text | `cart.totalItems` | Yes | Total number of items |
| EL-32 | Checkout Button | Button (primary) | `cart.checkout` | Yes | Navigate to /checkout only when every cart item is active and the requested quantity is available in stock |
| EL-33 | Continue Shopping Link | Link | `cart.continueShopping` | Yes | "Continue Shopping" link to /products |
| EL-34 | Empty State | EmptyState | `cart.empty` | Conditional | "Your cart is empty. Start shopping!" |
| EL-35 | Loading Skeleton | Skeleton | — | Conditional | Shown while loading cart data |
| EL-36 | Guest Login Alert Modal | Dialog/Modal | `cart.guestLoginAlert` | Conditional | Alert modal for unauthenticated cart actions: "Please log in to add items to your cart." with [Log in] button navigating to `/login` |

**Default State:**
- Cart items displayed as rows with quantity controls
- Summary panel displayed on right side (desktop) or below items (mobile)
- Checkout button enabled only when every cart item is active and the requested quantity is available in stock; disabled for `OUT_OF_STOCK`, `QUANTITY_EXCEEDED`, or `INACTIVE` items
- Loading skeleton shown during initial data fetch
- Empty state shown when no items exist

- **Trigger:** Guest user clicks a cart action or wishlist action that requires authentication.
- **Behavior:** Cart actions show a modal with "Please log in to add items to your cart." Wishlist actions show a modal with "Please log in to add items to your wishlist."
- **Actions:** Clicking [Log in] navigates to `/login`. Clicking outside the modal or pressing ESC closes the modal.
- **i18n Keys:** Cart: `cart.guestLoginAlert.title`, `cart.guestLoginAlert.message`, `cart.guestLoginAlert.loginButton`; Wishlist: `wishlist.guestLoginAlert.title`, `wishlist.guestLoginAlert.message`, `wishlist.guestLoginAlert.loginButton`

---

## 6. Functional Operation Specification

### 6.1 Operation: Add Product to Wishlist

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Heart icon click or "Add to Wishlist" button on product card/detail |
| **API Endpoint** | `POST /api/v1/wishlist/:productId` |
| **Request Headers** | `Authorization: Bearer <accessToken>` |
| **Guest Behavior** | Before any API call, show `wishlist.guestLoginAlert` with "Please log in to add items to your wishlist."; navigate to `/login` only when [Log in] is clicked. |
| **Pre-Submission Validation** | User authenticated with the `buyer` role; product exists and is active |
| **Processing Steps** | 1. Validate JWT token and the `buyer` role. 2. Verify product exists and `isActive = true`. 3. Check if product already in the user's wishlist. 4. If it does not exist, create a wishlist record. 5. Return the standard response envelope. 6. Log `WISHLIST_ITEM_ADDED`. |
| **Success Response** | 201 Created with wishlist item data |
| **Post-Action** | Toggle heart icon to filled state |

### 6.2 Operation: Remove Product from Wishlist

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Heart icon click (toggle off) or "Remove" button in wishlist |
| **API Endpoint** | `DELETE /api/v1/wishlist/:productId` |
| **Request Headers** | `Authorization: Bearer <accessToken>` |
| **Guest Behavior** | Before any API call, show `wishlist.guestLoginAlert` with "Please log in to add items to your wishlist."; navigate to `/login` only when [Log in] is clicked. |
| **Pre-Submission Validation** | User authenticated with the `buyer` role; product is in the user's wishlist |
| **Processing Steps** | 1. Validate JWT token and the `buyer` role. 2. Find the wishlist record by `userId` + `productId`. 3. If it exists, delete the record. 4. Return 204 with no response body. 5. Log `WISHLIST_ITEM_REMOVED`. |
| **Success Response** | 204 No Content |
| **Post-Action** | Toggle heart icon to outline state; remove from wishlist view if on wishlist page |

### 6.3 Operation: View Wishlist

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Navigation to /wishlist |
| **API Endpoint** | `GET /api/v1/wishlist` |
| **Request Headers** | `Authorization: Bearer <accessToken>` |
| **Guest Behavior** | Show `wishlist.guestLoginAlert` before navigation to `/login`; do not redirect directly from the wishlist action. |
| **Pre-Submission Validation** | User authenticated with the `buyer` role |
| **Processing Steps** | 1. Validate JWT token and the `buyer` role. 2. Query `wishlists` by `user_id`, ordered by `created_at DESC`. 3. Join with `products` for name, price, images, active status, and stock. 4. Derive stock status for each item. 5. Return `{ data: { items, totalCount } }`. |
| **Success Response** | 200 OK with wishlist items array |
| **Post-Action** | Render wishlist grid with product cards |

### 6.4 Operation: Move Wishlist Item to Cart

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Add to Cart" button on wishlist item |
| **API Endpoint** | `POST /api/v1/wishlist/:productId/move-to-cart` |
| **Request Headers** | `Authorization: Bearer <accessToken>` |
| **Pre-Submission Validation** | User authenticated with the `buyer` role; product is in the wishlist, active, and in stock |
| **Processing Steps** | 1. Validate JWT token and the `buyer` role. 2. Find the wishlist record. 3. Verify product is active and `stock_quantity > 0`. 4. Create or update the user's `cart_items` row in a Prisma transaction. 5. Increment quantity if the item already exists and ensure the new quantity does not exceed stock. 6. Delete the wishlist record in the same transaction. 7. Return `{ data: { cartItem, wishlistRemoved } }`. 8. Log `WISHLIST_ITEM_MOVED_TO_CART`. |
| **Success Response** | 200 OK with cart item data |
| **Post-Action** | Remove from wishlist view; show in cart |

### 6.5 Operation: Add Product to Cart

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Add to Cart" button on product detail or product card |
| **API Endpoint** | `POST /api/v1/cart/items` |
| **Request Headers** | `Authorization: Bearer <accessToken>` |
| **Guest Behavior** | Before any API call, show `cart.guestLoginAlert` with "Please log in to add items to your cart."; navigate to `/login` only when [Log in] is clicked. |
| **Request Body** | `{ productId: string, quantity?: number }` |
| **Pre-Submission Validation** | User authenticated with the `buyer` role; product exists, is active, and has stock > 0 |
| **Processing Steps** | 1. Validate JWT token and the `buyer` role. 2. Validate request body (`productId` is a UUID and `quantity` defaults to 1). 3. Verify product exists, `isActive = true`, and `stock_quantity > 0`. 4. Check whether the product already exists in the user's `cart_items`. 5. If it exists, return `409 Conflict`; quantity changes use PATCH. 6. Otherwise create the cart item. 7. Return the item in the standard response envelope with Decimal monetary fields serialized as strings. 8. Log `CART_ITEM_ADDED`. |
| **Success Response** | 201 Created with cart item data |
| **Post-Action** | Update cart badge count; show success toast |

### 6.6 Operation: Update Cart Item Quantity

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Plus/Minus button click or direct quantity input |
| **API Endpoint** | `PATCH /api/v1/cart/items/:id` |
| **Request Headers** | `Authorization: Bearer <accessToken>` |
| **Request Body** | `{ quantity: number }` |
| **Pre-Submission Validation** | User authenticated with the `buyer` role; cart item belongs to the user's cart |
| **Processing Steps** | 1. Validate JWT token and the `buyer` role. 2. Resolve the cart item through the authenticated user's `cart.id` (ownership check). 3. Validate quantity ≥ 1 and ≤ 99. 4. Verify `quantity ≤ product.stock_quantity`. 5. Update the cart item quantity. 6. Return the updated item with the new subtotal and Decimal monetary fields serialized as strings. 7. Log `CART_ITEM_UPDATED`. |
| **Success Response** | 200 OK with updated cart item data |
| **Post-Action** | Update subtotal display; update cart badge if quantity changed |

### 6.7 Operation: Remove Item from Cart

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Remove" button on cart item |
| **API Endpoint** | `DELETE /api/v1/cart/items/:id` |
| **Request Headers** | `Authorization: Bearer <accessToken>` |
| **Pre-Submission Validation** | User authenticated with the `buyer` role; cart item belongs to the user's cart |
| **Processing Steps** | 1. Validate JWT token and the `buyer` role. 2. Resolve the cart item through the authenticated user's `cart.id` (ownership check). 3. Delete the cart item record. 4. Return 204 with no response body. 5. Log `CART_ITEM_REMOVED`. |
| **Success Response** | 204 No Content |
| **Post-Action** | Remove item from cart view; update subtotal and badge |

### 6.8 Operation: View Cart

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Navigation to /cart |
| **API Endpoint** | `GET /api/v1/cart` |
| **Request Headers** | `Authorization: Bearer <accessToken>` |
| **Pre-Submission Validation** | User authenticated with the `buyer` role |
| **Processing Steps** | 1. Validate JWT token and the `buyer` role. 2. Resolve the user's `cart` and query its `cart_items`. 3. Join with `products` for details (name, slug, images, price, active status, stock). 4. Calculate `unitPrice × quantity` for each item and sum the pre-discount subtotal. 5. Derive stock status and availability (`stock_quantity >= quantity`). 6. Set `canCheckout = true` only when every item is active and available; set it to `false` for `OUT_OF_STOCK`, `QUANTITY_EXCEEDED`, or `INACTIVE` items, and for an empty cart. 7. Return `{ data: { items, summary } }`, serializing Decimal values as strings. |
| **Success Response** | 200 OK with cart items and summary |
| **Post-Action** | Render cart view with items and summary panel |

---

## 7. Input / Output Specification

### 7.1 Input Specification — Add to Wishlist (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|------------|
| `productId` | Product ID | 商品ID | UUID | Yes | `@IsUUID()`, `@IsNotEmpty()`, UUID format |

### 7.2 Input Specification — Add to Cart (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|------------|
| `productId` | Product ID | 商品ID | UUID | Yes | `@IsUUID()`, `@IsNotEmpty()`, UUID format |
| `quantity` | Quantity | 数量 | INTEGER | No (default: 1) | `@IsInt()`, `@Min(1)`, `@Max(99)` |

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
| `productSlug` | `products.slug` | URL-friendly string |
| `productImage` | `products.images[0]` | URL string |
| `productPrice` | `products.price` | Decimal serialized as a string; format for display in the frontend |
| `compareAtPrice` | `products.compare_at_price` | Decimal serialized as a string or null |
| `stockStatus` | `products.stock_quantity` | "In Stock" / "Low Stock" / "Out of Stock" |
| `isInStock` | `products.stock_quantity > 0` | Boolean |
| `createdAt` | `wishlists.created_at` | ISO 8601 timestamp |

### 7.5 Output Specification — Cart Item (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `id` | Cart item ID | UUID string |
| `productId` | Product reference | UUID string |
| `productName` | `products.name` | String |
| `productSlug` | `products.slug` | URL-friendly string |
| `productImage` | `products.images[0]` | URL string |
| `unitPrice` | `products.price` | Decimal serialized as a string; format for display in the frontend |
| `quantity` | Cart item quantity | Integer |
| `subtotal` | `unitPrice × quantity` | Decimal serialized as a string; discounts are excluded |
| `stockQuantity` | `products.stock_quantity` | Integer |
| `stockStatus` | Derived from stock_quantity | "In Stock" / "Low Stock" / "Out of Stock" |
| `isAvailable` | `stock_quantity >= quantity` | Boolean |

### 7.6 Output Specification — Cart Summary (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `items` | Cart items array | Array of Cart Item DTOs |
| `totalItems` | Sum of quantities | Integer |
| `subtotal` | Sum of all subtotals (unit_price × quantity per item, **before** discounts) | Decimal serialized as a string |
| `hasOutOfStock` | Any item with stock = 0 | Boolean |
| `canCheckout` | `true` only when every item is active and `stock_quantity >= quantity`; otherwise `false` | Boolean |

---

## 8. Input Validation Rules

### 8.1 Add to Wishlist Validation

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `productId` | Required, valid UUID format | "Product ID is required" / "Invalid product ID" | "商品IDは必須です" / "無効な商品IDです" |
| — | Product must exist and be active | "Product not found or unavailable" | "商品が見つからないか利用できません" |
| — | Product must not already be in wishlist | "Product already in wishlist" | "商品は既にお気に入りに追加されています" |

### 8.2 Add to Cart Validation

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `productId` | Required, valid UUID format | "Product ID is required" / "Invalid product ID" | "商品IDは必須です" / "無効な商品IDです" |
| `quantity` | Optional, integer ≥ 1, ≤ 99 | "Quantity must be at least 1" / "Quantity cannot exceed 99" | "数量は1以上である必要があります" / "数量は99を超えることはできません" |
| — | Product must exist, be active, and have stock > 0 | "Product is out of stock" | "商品は在庫切れです" |
| — | If product already in cart, new quantity ≤ stock | "Insufficient stock" | "在庫が不足しています" |

### 8.3 Update Cart Quantity Validation

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `quantity` | Required, integer ≥ 1, ≤ 99 | "Quantity must be at least 1" / "Quantity cannot exceed 99" | "数量は1以上である必要があります" / "数量は99を超えることはできません" |
| — | Requested quantity ≤ product stock_quantity | "Only {stock} available in stock" | "在庫が{stock}個しかありません" |

### 8.4 Validation Enforcement Layers

1. **Frontend (Client)**: React Hook Form + Zod schema validation with real-time feedback before API calls.
2. **Backend (Server)**: NestJS ValidationPipe + class-validator DTOs on all endpoints.
3. **Database (DB)**: Prisma constraints (unique, check, FK) as final safety net.

---

## 9. Error Handling Specification

### 9.1 Error Response Structure

```json
{
  "statusCode": 400,
  "message": ["productId must be a valid UUID"],
  "error": "Bad Request",
  "timestamp": "2026-08-05T12:00:00.000Z",
  "path": "/api/v1/wishlist/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
}
```

### 9.2 Error Classification Table — Wishlist

| HTTP Status | Error Code | Scenario | User-Facing Behavior |
|-------------|------------|----------|---------------------|
| `400` | `BAD_REQUEST` | Validation failures (invalid productId) | Inline field error + toast |
| `401` | `UNAUTHORIZED` | Missing or invalid JWT token | Redirect to login |
| `403` | `FORBIDDEN` | Authenticated user is not a buyer | Show "Shopping features are only available to buyers" |
| `GUEST` | `UNAUTHENTICATED` | Guest user performs a wishlist action | Show Wishlist guest-login alert: "Please log in to add items to your wishlist."; navigate to `/login` only after [Log in] is clicked |
| `404` | `NOT_FOUND` | Product not found | Toast: "Product not found" |
| `409` | `CONFLICT` | Product already in wishlist | Toast: "Already in your wishlist" |
| `500` | `INTERNAL_SERVER_ERROR` | Server error | Toast: "Something went wrong. Please try again." |

### 9.3 Error Classification Table — Cart

| HTTP Status | Error Code | Scenario | User-Facing Behavior |
|-------------|------------|----------|---------------------|
| `400` | `BAD_REQUEST` | Validation failures (invalid quantity) | Inline field error + toast |
| `400` | `BAD_REQUEST` | Out of stock | Toast: "Product is out of stock" |
| `400` | `BAD_REQUEST` | Quantity exceeds stock | Toast: "Only {n} available in stock" |
| `401` | `UNAUTHORIZED` | Missing or invalid JWT token | Redirect to login |
| `403` | `FORBIDDEN` | Authenticated user is not a buyer | Show "Shopping features are only available to buyers" |
| `GUEST` | `UNAUTHENTICATED` | Guest user performs a cart action | Show Cart guest-login alert: "Please log in to add items to your cart."; navigate to `/login` only after [Log in] is clicked |
| `404` | `NOT_FOUND` | Cart item not found | Toast: "Item not found in cart" |
| `404` | `NOT_FOUND` | Product not found | Toast: "Product not found" |
| `500` | `INTERNAL_SERVER_ERROR` | Server error | Toast: "Something went wrong. Please try again." |

### 9.4 Frontend Error Display Behavior

- **Field-Level Validation**: Red border and inline text below invalid input.
- **Toast Notifications**: Used for API errors and successful actions (add, remove, update).
- **Optimistic UI Updates**: Heart icon toggles immediately on click; reverts on API failure.
- **Loading States**: Spinner on buttons during API calls. Skeleton loaders for page content.
- **Stock Warnings**: Inline badge/alert on cart items with low or zero stock.

---

## 10. Permission and Access Control

### 10.1 Authentication Requirements

- JSON Web Token (JWT) Bearer Token passed via the `Authorization` header for all wishlist and cart endpoints.
- Every endpoint is protected by `JwtAuthGuard` and `RolesGuard`, with `@Roles('buyer')`.

### 10.2 Public vs Protected Endpoints

| Endpoint | Access Level | Description |
|----------|-------------|-------------|
| `GET /wishlist` | Protected | Requires a valid access token and the `buyer` role |
| `POST /wishlist/:productId` | Protected | Requires a valid access token and the `buyer` role |
| `DELETE /wishlist/:productId` | Protected | Requires a valid access token and the `buyer` role |
| `POST /wishlist/:productId/move-to-cart` | Protected | Requires a valid access token and the `buyer` role |
| `GET /cart` | Protected | Requires a valid access token and the `buyer` role |
| `POST /cart/items` | Protected | Requires a valid access token and the `buyer` role |
| `PATCH /cart/items/:id` | Protected | Requires a valid access token and the `buyer` role |
| `DELETE /cart/items/:id` | Protected | Requires a valid access token and the `buyer` role |

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
| `wishlist:toggle` | Heart icon click | Optimistic UI toggle; revert on API error |
| `cart:add` | Add to cart button click | Increment cart badge count; show toast |
| `cart:update` | Quantity change | Update subtotal display; update badge |
| `cart:remove` | Remove button click | Remove item from view; update badge and subtotal |

---

## 12. Screen Transition Specification

### 12.1 Inbound Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| Product Detail page | `/wishlist` | Click "View Wishlist" link |
| Product Detail page | `/cart` | Click "Add to Cart" button |
| Header cart icon | `/cart` | Click cart icon in header |
| Header heart icon | `/wishlist` | Click wishlist icon in header |
| Any page (unauthenticated) | `/login` | Clicking wishlist/cart action without auth |

### 12.2 Internal Navigation

| Source | Target | Trigger |
|--------|--------|---------|
| `/wishlist` | `/products/:slug` | Click product image or name |
| `/wishlist` | `/cart` | Click "Add to Cart" on wishlist item |
| `/cart` | `/products/:slug` | Click product image or name |
| `/cart` | `/checkout` | Click "Proceed to Checkout" |
| `/cart` | `/products` | Click "Continue Shopping" |

### 12.3 Outbound Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| `/wishlist` | `/cart` | Move item to cart |
| `/cart` | `/checkout` | Proceed to checkout (all items in stock) |
| `/cart` | `/login` | Session expired |

### 12.4 Error Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| `/wishlist` | `/login` | 401 Unauthorized |
| `/cart` | `/login` | 401 Unauthorized |
| Product Detail / Product Card | `/login` | Guest user clicks "Add to Cart" (via alert modal) |
| `/wishlist` | `/login` | Guest user clicks "Move to Cart" (via alert modal) |

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
| Wishlist items | No cache (user-specific) | — |
| Cart items | No cache (user-specific) | — |
| Product details | Redis cache | 5 minutes |
| Stock quantities | Real-time from DB | — |

### 13.3 Security Considerations

| Concern | Mitigation |
|---------|------------|
| Unauthorized access | JWT Bearer token validation on all endpoints |
| Price manipulation | Price fetched from DB, not client-provided |
| Stock manipulation | Stock validated server-side before operations |
| IDOR attacks | Ownership validation (userId from JWT) |
| Race conditions on stock | Atomic operations via Prisma transactions |

### 13.4 Responsive Design Requirements

| Breakpoint | Wishlist Layout | Cart Layout |
|------------|-----------------|-------------|
| Desktop (≥ 1024px) | 4-column grid | Items list + right sidebar summary |
| Tablet (768px – 1023px) | 2-column grid | Items list + bottom summary |
| Mobile (< 768px) | 1-column list | Stacked items + bottom summary |

---

## 14. Configurable Items (External Definitions)

Defined via `.env` configuration:

| Definition Key | Default Value | Description |
|----------------|---------------|-------------|
| `WISHLIST_MAX_ITEMS` | `100` | Maximum items per user wishlist |
| `CART_MAX_ITEMS` | `50` | Maximum items per user cart |
| `CART_MAX_QUANTITY_PER_ITEM` | `99` | Maximum quantity per cart item |
| `LOW_STOCK_THRESHOLD` | `10` | Default low stock warning threshold |

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

### 15.2 Database Design Traceability

| Database Table | Relevant Functional Operations |
|----------------|-------------------------------|
| `wishlists` | Add (INSERT), Remove (DELETE), View (SELECT), Move to Cart (DELETE) |
| `carts` | Resolve the authenticated buyer's single cart (SELECT/CREATE) |
| `cart_items` | Add (INSERT), Update Quantity (PATCH/UPDATE), Remove (DELETE), View (SELECT) |
| `products` | Stock validation (SELECT), Price lookup (SELECT), Product details (SELECT) |

### 15.3 Related Document References

| Document ID | Document Name | File Path |
|-------------|---------------|-----------|
| SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` |
| SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` |
| SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` |

---

*End of Functional Specification (Wishlist & Cart Page)*
