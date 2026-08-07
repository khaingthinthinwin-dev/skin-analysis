# Functional Specification (機能設計書) — Wishlist & Cart Page

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-FDS-WISH-CART-001 |
| **Target Screen** | Wishlist & Cart Page (お気に入り & カートページ) |
| **Subsystem** | Buyer Module — Wishlist Management & Shopping Cart |
| **Function ID** | FN-WISH-001, FN-CART-001 |
| **Version** | 1.2 |
| **Created** | 2026-08-05 |
| **Last Updated** | 2026-08-07 |
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
| **Guest Behavior** | Cart not persisted; wishlist unavailable. When a guest user clicks "Add to Cart" or "Add to Wishlist", an alert modal is displayed: "Please log in to add items to your cart." Clicking [Log in] navigates to the login page (`/login`). |

### 1.4 Relationships with Other Functions and Peripheral Systems

```text
┌──────────────────────────┐      ┌─────────────────────────────────────┐
│   Authenticated Buyer    │      │     wishlists / order_items         │
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
| `wishlistId` | URL Parameter | Wishlist item to remove or transfer |

| Output Information | Data Category | Destination / Description |
|--------------------|---------------|---------------------------|
| `wishlistItems` | Wishlist DTO Array | List of saved products with details |
| `cartItems` | Cart DTO Array | List of cart items with quantities and subtotals |
| `cartSummary` | Cart Summary DTO | Subtotal, item count, stock status |
| `operationResult` | Boolean | Success/failure status for add/remove/update |

### 1.6 Related Documents

| No. | Document ID | Document Name | File Path / Reference | Remarks |
|-----|-------------|---------------|----------------------|---------|
| 1 | SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | Business workflow logic, required fields, and rules. |
| 2 | SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | Table structures (`wishlists`, `products`), constraints. |
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

**Note on Guest User Behavior:** Unauthenticated (guest) users cannot add items to cart. When a guest user clicks "Add to Cart" or "Move to Cart", an alert modal is displayed with the message "Please log in to add items to your cart." Clicking [Log in] navigates to the login page (`/login`). This ensures cart functionality is only available to authenticated users, as specified in BR-CART-001 and BR-CART-010.

---

## 3. State Transition Specification

### 3.1 Wishlist Item States

| State | Description | Visible in Wishlist | Can Move to Cart |
|-------|-------------|:-------------------:|:----------------:|
| `SAVED` | Product saved in wishlist, in stock | ✓ | ✓ |
| `OUT_OF_STOCK` | Product saved but currently out of stock | ✓ | ✗ |
| `PRODUCT_DELETED` | Saved product was removed from platform | ✓ (with notice) | ✗ |
| `MOVED_TO_CART` | Item transferred to cart (optional auto-remove) | ✗ (if removed) | — |

### 3.2 Cart Item States

| State | Description | Visible in Cart | Can Checkout |
|-------|-------------|:---------------:|:------------:|
| `ACTIVE` | Item in cart with valid stock | ✓ | ✓ |
| `LOW_STOCK` | Item in cart, stock below threshold (≤10) | ✓ (warning) | ✓ |
| `OUT_OF_STOCK` | Item in cart, stock = 0 | ✓ (error) | ✗ |
| `QUANTITY_EXCEEDED` | Requested quantity exceeds available stock | ✓ (error) | ✗ |
| `PRODUCT_DELETED` | Cart item's product was removed | ✓ (with notice) | ✗ |

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
| BR-WISH-001 | Authentication Required | Only authenticated users can manage wishlists. | Backend (JwtAuthGuard) |
| BR-WISH-002 | One Wishlist Per Product | Each user can save a product to wishlist only once. Unique constraint on [user_id, product_id]. | Backend (DB constraint + service check) |
| BR-WISH-003 | Active Product Only | Only active products can be added to wishlist. | Backend (service validation) |
| BR-WISH-004 | Product Existence | Product must exist in the system to be added. | Backend (FK constraint) |
| BR-WISH-005 | Owner-Only Access | Users can only view/modify their own wishlist items. | Backend (service filter) |
| BR-WISH-006 | Move to Cart Validation | Moving to cart requires product to be in stock (stock_quantity > 0). | Backend (stock check) |

### 4.2 Cart Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-CART-001 | Authentication Required | Only authenticated users can manage cart. | Backend (JwtAuthGuard) |
| BR-CART-002 | Stock Availability | Cannot add product to cart if stock_quantity = 0. | Backend (stock validation) |
| BR-CART-003 | Quantity Limit | Cart item quantity cannot exceed available stock_quantity. | Backend (stock validation) |
| BR-CART-004 | Quantity Minimum | Cart item quantity must be ≥ 1. | Backend (DB constraint) |
| BR-CART-005 | Active Product Only | Only active products can be added to cart. | Backend (service validation) |
| BR-CART-006 | Price at Order Time | Price is locked at order creation time, not cart time. | Backend (order service) |
| BR-CART-007 | Cart Persistence | Cart items are stored in database for logged-in users. | Backend (DB storage) |
| BR-CART-008 | Subtotal Calculation | Subtotal = unit_price × quantity for each item. Discounts and coupons are **not** applied at this stage; coupon entry and discount calculation occur on the checkout page. | Backend (computed field) |
| BR-CART-009 | Duplicate Handling | Adding an existing cart item increments quantity instead of creating duplicate. | Backend (service logic) |
| BR-CART-010 | Guest User Restriction | Unauthenticated (guest) users cannot add items to cart. An alert modal is displayed: "Please log in to add items to your cart." Clicking [Log in] navigates to `/login`. | Frontend (UI guard) |

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

**Default State:**
- Page title and item count displayed at top
- Wishlist items displayed in responsive grid (4 columns desktop, 2 tablet, 1 mobile)
- Loading skeleton shown during initial data fetch
- Empty state shown when no items exist

#### 5.1.2 Wishlist Item Card Layout

```
┌─────────────────────────────────────────┐
│  ┌───────────┐  Product Name (link)     │
│  │           │  ¥2,980                  │
│  │  Product  │  ¥3,500 (strikethrough)  │
│  │  Image    │  ● In Stock              │
│  │           │                          │
│  └───────────┘  [Add to Cart]  [Remove] │
└─────────────────────────────────────────┘
```

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
| EL-32 | Checkout Button | Button (primary) | `cart.checkout` | Yes | Navigate to /checkout |
| EL-33 | Continue Shopping Link | Link | `cart.continueShopping` | Yes | "Continue Shopping" link to /products |
| EL-34 | Empty State | EmptyState | `cart.empty` | Conditional | "Your cart is empty. Start shopping!" |
| EL-35 | Loading Skeleton | Skeleton | — | Conditional | Shown while loading cart data |
| EL-36 | Guest Login Alert Modal | Dialog/Modal | `cart.guestLoginAlert` | Conditional | Alert modal for unauthenticated users: "Please log in to add items to your cart." with [Log in] button navigating to `/login` |

**Default State:**
- Cart items displayed as rows with quantity controls
- Summary panel displayed on right side (desktop) or below items (mobile)
- Checkout button disabled if any items are out of stock
- Loading skeleton shown during initial data fetch
- Empty state shown when no items exist

#### 5.2.2 Cart Item Row Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  ┌─────────┐  Product Name (link)        ┌────────────────────────┐  │
│  │         │  Unit Price: ¥2,980         │  [-]  2  [+]           │  │
│  │ Product │                             │  Subtotal: ¥5,960      │  │
│  │ Image   │  ⚠ Only 3 left in stock    │  [Remove]              │  │
│  └─────────┘                             └────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

#### 5.2.3 Cart Summary Panel Layout

```
┌─────────────────────────────┐
│  Order Summary              │
│  ─────────────────────────  │
│  Items: 3                   │
│  Subtotal: ¥8,940           │
│  (unit_price × quantity)    │
│  ─────────────────────────  │
│  Note: Discounts and coupon │
│  codes are applied at       │
│  checkout.                  │
│  ─────────────────────────  │
│  [Proceed to Checkout]      │
│  ─────────────────────────  │
│  [Continue Shopping]        │
└─────────────────────────────┘
```

#### 5.2.4 Guest User Alert Modal Layout

```
┌─────────────────────────────────────────┐
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  │  ⚠ Please log in to add items  │    │
│  │    to your cart.                │    │
│  │                                 │    │
│  │  ┌─────────────┐               │    │
│  │  │   Log in    │               │    │
│  │  └─────────────┘               │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

- **Trigger:** Guest user clicks "Add to Cart" on product detail, product card, or wishlist item.
- **Behavior:** Modal dialog appears with message "Please log in to add items to your cart."
- **Actions:** Clicking [Log in] navigates to `/login`. Clicking outside the modal or pressing ESC closes the modal.
- **i18n Keys:** `cart.guestLoginAlert.title`, `cart.guestLoginAlert.message`, `cart.guestLoginAlert.loginButton`

---

## 6. Functional Operation Specification

### 6.1 Operation: Add Product to Wishlist

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Heart icon click or "Add to Wishlist" button on product card/detail |
| **API Endpoint** | `POST /api/v1/wishlist/:productId` |
| **Request Headers** | `Authorization: Bearer <accessToken>` |
| **Pre-Submission Validation** | User authenticated, product exists and is active |
| **Processing Steps** | 1. Validate JWT token. 2. Verify product exists and `isActive = true`. 3. Check if product already in user's wishlist. 4. If not exists, create wishlist record. 5. Return success response. 6. Log WISHLIST_ITEM_ADDED event. |
| **Success Response** | 201 Created with wishlist item data |
| **Post-Action** | Toggle heart icon to filled state |

### 6.2 Operation: Remove Product from Wishlist

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Heart icon click (toggle off) or "Remove" button in wishlist |
| **API Endpoint** | `DELETE /api/v1/wishlist/:productId` |
| **Request Headers** | `Authorization: Bearer <accessToken>` |
| **Pre-Submission Validation** | User authenticated, product in user's wishlist |
| **Processing Steps** | 1. Validate JWT token. 2. Find wishlist record by userId + productId. 3. If exists, delete the record. 4. Return success response. 5. Log WISHLIST_ITEM_REMOVED event. |
| **Success Response** | 200 OK with success message |
| **Post-Action** | Toggle heart icon to outline state; remove from wishlist view if on wishlist page |

### 6.3 Operation: View Wishlist

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Navigation to /wishlist |
| **API Endpoint** | `GET /api/v1/wishlist` |
| **Request Headers** | `Authorization: Bearer <accessToken>` |
| **Pre-Submission Validation** | User authenticated |
| **Processing Steps** | 1. Validate JWT token. 2. Query wishlists table with user_id. 3. Join with products table for details (name, price, images, stock). 4. Check stock status for each item. 5. Return array of wishlist items with product details. |
| **Success Response** | 200 OK with wishlist items array |
| **Post-Action** | Render wishlist grid with product cards |

### 6.4 Operation: Move Wishlist Item to Cart

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Add to Cart" button on wishlist item |
| **API Endpoint** | `POST /api/v1/wishlist/:productId/move-to-cart` |
| **Request Headers** | `Authorization: Bearer <accessToken>` |
| **Pre-Submission Validation** | User authenticated, product in wishlist, product in stock |
| **Processing Steps** | 1. Validate JWT token. 2. Find wishlist record. 3. Verify product `stock_quantity > 0`. 4. Create or update cart item (increment quantity if exists). 5. Optionally remove wishlist item. 6. Return success response. 7. Log WISHLIST_ITEM_MOVED_TO_CART event. |
| **Success Response** | 200 OK with cart item data |
| **Post-Action** | Remove from wishlist view; show in cart |

### 6.5 Operation: Add Product to Cart

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Add to Cart" button on product detail or product card |
| **API Endpoint** | `POST /api/v1/cart/items` |
| **Request Headers** | `Authorization: Bearer <accessToken>` |
| **Request Body** | `{ productId: string, quantity?: number }` |
| **Pre-Submission Validation** | User authenticated, product exists, active, stock > 0 |
| **Processing Steps** | 1. Validate JWT token. 2. Validate request body (productId required, quantity defaults to 1). 3. Verify product exists, `isActive = true`, `stock_quantity > 0`. 4. Check if product already in user's cart. 5. If exists, increment quantity (validate new total ≤ stock). 6. If not exists, create new cart item. 7. Return cart item with subtotal. 8. Log CART_ITEM_ADDED event. |
| **Success Response** | 201 Created with cart item data |
| **Post-Action** | Update cart badge count; show success toast |

### 6.6 Operation: Update Cart Item Quantity

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Plus/Minus button click or direct quantity input |
| **API Endpoint** | `PATCH /api/v1/cart/items/:id` |
| **Request Headers** | `Authorization: Bearer <accessToken>` |
| **Request Body** | `{ quantity: number }` |
| **Pre-Submission Validation** | User authenticated, cart item exists, belongs to user |
| **Processing Steps** | 1. Validate JWT token. 2. Find cart item by id and user_id. 3. Validate quantity ≥ 1. 4. Verify `quantity ≤ product.stock_quantity`. 5. Update cart item quantity. 6. Return updated cart item with new subtotal. 7. Log CART_ITEM_UPDATED event. |
| **Success Response** | 200 OK with updated cart item data |
| **Post-Action** | Update subtotal display; update cart badge if quantity changed |

### 6.7 Operation: Remove Item from Cart

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Remove" button on cart item |
| **API Endpoint** | `DELETE /api/v1/cart/items/:id` |
| **Request Headers** | `Authorization: Bearer <accessToken>` |
| **Pre-Submission Validation** | User authenticated, cart item exists, belongs to user |
| **Processing Steps** | 1. Validate JWT token. 2. Find cart item by id and user_id. 3. Delete the cart item record. 4. Return success response. 5. Log CART_ITEM_REMOVED event. |
| **Success Response** | 200 OK with success message |
| **Post-Action** | Remove item from cart view; update subtotal and badge |

### 6.8 Operation: View Cart

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Navigation to /cart |
| **API Endpoint** | `GET /api/v1/cart` |
| **Request Headers** | `Authorization: Bearer <accessToken>` |
| **Pre-Submission Validation** | User authenticated |
| **Processing Steps** | 1. Validate JWT token. 2. Query cart items with user_id. 3. Join with products for details (name, price, images, stock). 4. Calculate subtotals for each item. 5. Calculate total subtotal. 6. Validate stock status for each item. 7. Return cart items with summary. |
| **Success Response** | 200 OK with cart items and summary |
| **Post-Action** | Render cart view with items and summary panel |

---

## 7. Input / Output Specification

### 7.1 Input Specification — Add to Wishlist (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|------------|
| `productId` | Product ID | 商品ID | VARCHAR(25) | Yes | `@IsString()`, `@IsNotEmpty()`, CUID format |

### 7.2 Input Specification — Add to Cart (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|------------|
| `productId` | Product ID | 商品ID | VARCHAR(25) | Yes | `@IsString()`, `@IsNotEmpty()`, CUID format |
| `quantity` | Quantity | 数量 | INTEGER | No (default: 1) | `@IsInt()`, `@Min(1)`, `@Max(99)` |

### 7.3 Input Specification — Update Cart Quantity (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|------------|
| `quantity` | Quantity | 数量 | INTEGER | Yes | `@IsInt()`, `@Min(1)`, `@Max(99)` |

### 7.4 Output Specification — Wishlist Item (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `id` | `wishlists.id` | CUID string |
| `productId` | `wishlists.product_id` | CUID string |
| `productName` | `products.name` | String |
| `productSlug` | `products.slug` | URL-friendly string |
| `productImage` | `products.images[0]` | URL string |
| `productPrice` | `products.price` | Currency formatted string |
| `compareAtPrice` | `products.compare_at_price` | Currency formatted string or null |
| `stockStatus` | `products.stock_quantity` | "In Stock" / "Low Stock" / "Out of Stock" |
| `isInStock` | `products.stock_quantity > 0` | Boolean |
| `createdAt` | `wishlists.created_at` | ISO 8601 timestamp |

### 7.5 Output Specification — Cart Item (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `id` | Cart item ID | CUID string |
| `productId` | Product reference | CUID string |
| `productName` | `products.name` | String |
| `productSlug` | `products.slug` | URL-friendly string |
| `productImage` | `products.images[0]` | URL string |
| `unitPrice` | `products.price` | Currency formatted string |
| `quantity` | Cart item quantity | Integer |
| `subtotal` | `unitPrice × quantity` | Currency formatted string |
| `stockQuantity` | `products.stock_quantity` | Integer |
| `stockStatus` | Derived from stock_quantity | "In Stock" / "Low Stock" / "Out of Stock" |
| `isAvailable` | `stock_quantity >= quantity` | Boolean |

### 7.6 Output Specification — Cart Summary (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `items` | Cart items array | Array of Cart Item DTOs |
| `totalItems` | Sum of quantities | Integer |
| `subtotal` | Sum of all subtotals (unit_price × quantity per item, **before** discounts) | Currency formatted string |
| `hasOutOfStock` | Any item with stock = 0 | Boolean |
| `canCheckout` | All items in stock | Boolean |

---

## 8. Input Validation Rules

### 8.1 Add to Wishlist Validation

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `productId` | Required, valid CUID format | "Product ID is required" / "Invalid product ID" | "商品IDは必須です" / "無効な商品IDです" |
| — | Product must exist and be active | "Product not found or unavailable" | "商品が見つからないか利用できません" |
| — | Product must not already be in wishlist | "Product already in wishlist" | "商品は既にお気に入りに追加されています" |

### 8.2 Add to Cart Validation

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `productId` | Required, valid CUID format | "Product ID is required" / "Invalid product ID" | "商品IDは必須です" / "無効な商品IDです" |
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
  "message": ["productId must be a valid CUID"],
  "error": "Bad Request",
  "timestamp": "2026-08-05T12:00:00.000Z",
  "path": "/api/v1/wishlist/abc123"
}
```

### 9.2 Error Classification Table — Wishlist

| HTTP Status | Error Code | Scenario | User-Facing Behavior |
|-------------|------------|----------|---------------------|
| `400` | `BAD_REQUEST` | Validation failures (invalid productId) | Inline field error + toast |
| `401` | `UNAUTHORIZED` | Missing or invalid JWT token | Redirect to login |
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

- JSON Web Token (JWT) Bearer Token passed via `Authorization` header for all wishlist and cart endpoints.

### 10.2 Public vs Protected Endpoints

| Endpoint | Access Level | Description |
|----------|-------------|-------------|
| `GET /wishlist` | Protected | Requires valid access token |
| `POST /wishlist/:productId` | Protected | Requires valid access token |
| `DELETE /wishlist/:productId` | Protected | Requires valid access token |
| `POST /wishlist/:productId/move-to-cart` | Protected | Requires valid access token |
| `GET /cart` | Protected | Requires valid access token |
| `POST /cart/items` | Protected | Requires valid access token |
| `PATCH /cart/items/:id` | Protected | Requires valid access token |
| `DELETE /cart/items/:id` | Protected | Requires valid access token |

### 10.3 Role-Based Access

| Role | Can Access Wishlist | Can Access Cart | Notes |
|------|:-------------------:|:---------------:|-------|
| `buyer` | ✓ | ✓ | Primary users of these features |
| `merchant` | ✓ | ✓ | Can also use buyer features |
| `admin` | ✓ | ✓ | Full access |


### 10.4 Ownership Rules

| Resource | Ownership Rule | Enforcement |
|----------|---------------|-------------|
| Wishlist items | Users can only view/modify their own wishlist items | Backend filters by `user_id` from JWT |
| Cart items | Users can only view/modify their own cart items | Backend filters by `user_id` from JWT |

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
| `products` | Stock validation (SELECT), Price lookup (SELECT), Product details (SELECT) |

### 15.3 Related Document References

| Document ID | Document Name | File Path |
|-------------|---------------|-----------|
| SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` |
| SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` |
| SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` |

---

*End of Functional Specification (Wishlist & Cart Page)*
