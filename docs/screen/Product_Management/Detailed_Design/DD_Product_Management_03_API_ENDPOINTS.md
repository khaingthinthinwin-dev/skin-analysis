# DD_PROD_03 — API Endpoints

> **Doc ID:** SKM-DD-PROD-03 | **Version:** 1.5 | **Status:** Released  
> **Last Updated:** 2026-08-18

---

## 1. Controller Setup

- **File:** `src/modules/products/products.controller.ts`
- **Base Route:** `/api/v1/products`
- **Guards:** `JwtAuthGuard` + `RolesGuard` for merchant endpoints; Public for list/detail
- **License Status Guard:** All merchant CRUD operations (POST, PATCH, DELETE) require `licenseStatus === 'approved'`. Merchants with `pending` or `rejected` status receive `403 Forbidden` with error code `MERCHANT_NOT_APPROVED` or `MERCHANT_REJECTED`.

---

## 2. API Endpoints Contract

### 2.1 GET /products

List products (public for buyers, merchant-scoped for merchants).

- **Auth Required:** No (Public) — Returns only `isActive = true` products for buyers. Merchants see all own products.
- **Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `search` | string | No | Search by product name or SKU (partial match) |
| `categoryId` | string | No | Filter by category ID |
| `skinType` | string | No | Filter by skin type compatibility |
| `minPrice` | number | No | Minimum price filter |
| `maxPrice` | number | No | Maximum price filter |
| `sortBy` | string | No | Sort by: `price`, `rating`, `newest`, `name` (default: `newest`) |
| `sortOrder` | string | No | Sort direction: `asc`, `desc` (default: `desc`) |
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 20, max: 100) |
| `isActive` | boolean | No | Filter by active status (merchant only) |
| `isFeatured` | boolean | No | Filter by featured status |

- **Response:** `200 OK`
  ```json
  {
    "data": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Hydrating Serum",
        "slug": "hydrating-serum",
        "shortDescription": "Lightweight hydrating serum",
        "price": "29.99",
        "compareAtPrice": "39.99",
        "sku": "HS-001",
        "stockQuantity": 50,
        "lowStockThreshold": 10,
        "images": ["/uploads/products/img1.jpg"],
        "skinTypes": ["dry", "normal"],
        "isActive": true,
        "isFeatured": false,
        "avgRating": "4.50",
        "reviewCount": 12,
        "category": {
          "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
          "name": "Serums",
          "slug": "serums"
        },
        "createdAt": "2026-08-10T12:00:00.000Z",
        "updatedAt": "2026-08-10T12:00:00.000Z"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 25,
      "totalPages": 2
    }
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` — Invalid query parameters
  - `429 TOO_MANY_REQUESTS` — Rate limit exceeded
- **Logic:** Calls `service.findAll(query)`
- **Cache:** `cache:products:list:{hash}` (TTL 2 minutes)

### 2.2 GET /products/:slug

Get product detail by slug (public).

- **Auth Required:** No (Public)
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Hydrating Serum",
      "slug": "hydrating-serum",
      "description": "<p>Detailed product description...</p>",
      "shortDescription": "Lightweight hydrating serum",
      "price": "29.99",
      "compareAtPrice": "39.99",
      "sku": "HS-001",
      "stockQuantity": 50,
      "lowStockThreshold": 10,
      "images": ["/uploads/products/img1.jpg", "/uploads/products/img2.jpg"],
      "tags": ["hydrating", "serum"],
      "skinTypes": ["dry", "normal"],
      "ingredients": ["Hyaluronic Acid", "Glycerin"],
      "isActive": true,
      "isFeatured": false,
      "avgRating": "4.50",
      "reviewCount": 12,
      "merchantId": "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
      "categoryId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "createdAt": "2026-08-10T12:00:00.000Z",
      "updatedAt": "2026-08-10T12:00:00.000Z"
    }
  }
  ```
- **Error Responses:**
  - `404 NOT_FOUND` — Product not found or inactive
- **Logic:** Calls `service.findBySlug(slug)`
- **Cache:** `cache:product:{slug}` (TTL 5 minutes)

### 2.3 POST /products

Create a new product (merchant/admin).

- **Auth Required:** Yes (`JwtAuthGuard`)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Roles:** `merchant`, `admin`
- **Guard:** `@requireApprovedMerchant` — Requires `licenseStatus === 'approved'`
- **Request Content-Type:** `multipart/form-data` (for images)
- **Body:** `CreateProductDto`
  - `name` (string, required, max 255 chars)
  - `shortDescription` (string, required, max 500 chars)
  - `description` (string, required)
  - `categoryId` (string, required, valid UUID)
  - `sku` (string, optional, max 100 chars, unique)
  - `price` (number, required, min 0.01)
  - `compareAtPrice` (number, optional, min 0)
  - `stockQuantity` (integer, required, min 0, default 0)
  - `lowStockThreshold` (integer, optional, min 0, default 10)
  - `skinTypes` (string[], optional)
  - `ingredients` (string[], optional)
  - `tags` (string[], optional)
  - `isActive` (boolean, optional, default true)
  - `isFeatured` (boolean, optional, default false)
  - `images` (File[], required, max 10 files, 5MB each, JPG/PNG/WebP)
- **Response:** `201 Created`
  ```json
  {
    "data": {
        "id": "6ba7b812-9dad-11d1-80b4-00c04fd430c8",
      "name": "New Product",
      "slug": "new-product",
      "price": "29.99",
      "isActive": true,
      "createdAt": "2026-08-10T12:00:00.000Z"
    }
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` — Validation failed
  - `401 UNAUTHORIZED` — Missing or invalid JWT
  - `403 FORBIDDEN` — Not merchant/admin or shop not approved
  - `403 MERCHANT_NOT_APPROVED` — Merchant license status is `pending`
  - `403 MERCHANT_REJECTED` — Merchant license status is `rejected` (includes rejection reason)
  - `409 CONFLICT` — Slug or SKU already exists
  - `413 PAYLOAD_TOO_LARGE` — Image exceeds 5MB
  - `415 UNSUPPORTED_MEDIA_TYPE` — Invalid image format
  - `429 TOO_MANY_REQUESTS` — Rate limit exceeded
- **Logic:** Calls `service.create(dto, files, userId)`
- **Side Effects:** Invalidates product list cache

### 2.4 PATCH /products/:id

Update product details (merchant/admin).

- **Auth Required:** Yes (`JwtAuthGuard`)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Roles:** `merchant`, `admin`
- **Guard:** `@requireApprovedMerchant` — Requires `licenseStatus === 'approved'`
- **Request Content-Type:** `multipart/form-data` (for images)
- **Body:** `UpdateProductDto` (all fields optional, partial update)
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Updated Product",
      "slug": "updated-product",
      "price": "34.99",
      "updatedAt": "2026-08-10T12:00:00.000Z"
    }
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` — Validation failed
  - `401 UNAUTHORIZED` — Missing or invalid JWT
  - `403 FORBIDDEN` — Not product owner (merchant) or not admin
  - `403 MERCHANT_NOT_APPROVED` — Merchant license status is `pending`
  - `403 MERCHANT_REJECTED` — Merchant license status is `rejected` (includes rejection reason)
  - `404 NOT_FOUND` — Product not found
  - `409 CONFLICT` — Slug or SKU already exists
  - `413 PAYLOAD_TOO_LARGE` — Image exceeds 5MB
  - `415 UNSUPPORTED_MEDIA_TYPE` — Invalid image format
- **Logic:** Calls `service.update(id, dto, files, userId)`
- **Side Effects:** Invalidates product cache and list cache

### 2.5 DELETE /products/:id

Soft delete product (set `is_active = false`). Applies BR-PROD-024 active order guard — products with active orders (status NOT IN 'delivered', 'cancelled') cannot be deleted.

- **Auth Required:** Yes (`JwtAuthGuard`)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Roles:** `merchant`, `admin`
- **Guard:** `@requireApprovedMerchant` — Requires `licenseStatus === 'approved'`
- **Response:** `204 No Content`
- **Error Responses:**
  - `401 UNAUTHORIZED` — Missing or invalid JWT
  - `403 FORBIDDEN` — Not product owner (merchant) or not admin
  - `403 MERCHANT_NOT_APPROVED` — Merchant license status is `pending`
  - `403 MERCHANT_REJECTED` — Merchant license status is `rejected` (includes rejection reason)
  - `404 NOT_FOUND` — Product not found
  - `409 CONFLICT` — Product has orders with status NOT IN ('delivered', 'cancelled'). Error message: "Cannot delete product with active orders. All orders must be completed first."
- **Logic:** Calls `service.softDelete(id, userId)`
- **Side Effects:** Invalidates product cache and list cache

### 2.6 PATCH /products/:id/stock

Update stock quantity (merchant/admin).

- **Auth Required:** Yes (`JwtAuthGuard`)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Roles:** `merchant`, `admin`
- **Guard:** `@requireApprovedMerchant` — Requires `licenseStatus === 'approved'`
- **Body:**
  ```json
  {
    "stockQuantity": 25
  }
  ```
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "stockQuantity": 25,
      "lowStockThreshold": 10,
      "isLowStock": false,
      "isOutOfStock": false
    }
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` — Stock quantity < 0 or not integer
  - `401 UNAUTHORIZED` — Missing or invalid JWT
  - `403 FORBIDDEN` — Not product owner (merchant) or not admin
  - `403 MERCHANT_NOT_APPROVED` — Merchant license status is `pending`
  - `403 MERCHANT_REJECTED` — Merchant license status is `rejected` (includes rejection reason)
  - `404 NOT_FOUND` — Product not found
- **Logic:** Calls `service.updateStock(id, stockQuantity, userId)`
- **Side Effects:** Invalidates product cache. Checks low stock threshold.

### 2.7 PATCH /products/bulk

Bulk activate/deactivate products (merchant/admin).

- **Auth Required:** Yes (`JwtAuthGuard`)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Roles:** `merchant`, `admin`
- **Guard:** `@requireApprovedMerchant` — Requires `licenseStatus === 'approved'`
- **Body:**
  ```json
  {
    "ids": ["550e8400-e29b-41d4-a716-446655440000", "6ba7b810-9dad-11d1-80b4-00c04fd430c8"],
    "action": "activate"
  }
  ```
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "updated": 2,
      "failed": 0,
      "errors": []
    }
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` — Invalid action or empty IDs
  - `401 UNAUTHORIZED` — Missing or invalid JWT
  - `403 FORBIDDEN` — Partial permission (some products not owned)
  - `403 MERCHANT_NOT_APPROVED` — Merchant license status is `pending`
  - `403 MERCHANT_REJECTED` — Merchant license status is `rejected` (includes rejection reason)
- **Logic:** Calls `service.bulkAction(ids, action, userId)`
- **Side Effects:** Invalidates product list cache

### 2.8 DELETE /products/bulk

Bulk soft delete products (merchant/admin). Applies BR-PROD-024 active order guard per product — products with active orders (status NOT IN 'delivered', 'cancelled') are skipped.

- **Auth Required:** Yes (`JwtAuthGuard`)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Roles:** `merchant`, `admin`
- **Guard:** `@requireApprovedMerchant` — Requires `licenseStatus === 'approved'`
- **Body:**
  ```json
  {
    "ids": ["550e8400-e29b-41d4-a716-446655440000", "6ba7b810-9dad-11d1-80b4-00c04fd430c8"]
  }
  ```
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "updated": 2,
      "failed": 0,
      "errors": []
    }
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` — Empty IDs array
  - `401 UNAUTHORIZED` — Missing or invalid JWT
  - `403 FORBIDDEN` — Partial permission (some products not owned)
  - `403 MERCHANT_NOT_APPROVED` — Merchant license status is `pending`
  - `403 MERCHANT_REJECTED` — Merchant license status is `rejected` (includes rejection reason)
- **Logic:** Calls `service.bulkSoftDelete(ids, userId)`
- **Side Effects:** Invalidates product list cache

### 2.9 GET /categories

Get category tree structure (public).

- **Auth Required:** No (Public)
- **Response:** `200 OK`
  ```json
  {
    "data": [
      {
        "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        "name": "Skincare",
        "slug": "skincare",
        "iconUrl": null,
        "sortOrder": 0,
        "children": [
          {
          "id": "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
          "name": "Serums",
          "slug": "serums",
          "parentId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
            "sortOrder": 0,
            "children": []
          }
        ]
      }
    ]
  }
  ```
- **Error Responses:**
  - `500 INTERNAL_SERVER_ERROR` — Server error
- **Logic:** Calls `categoriesService.getTree()`
- **Cache:** `cache:categories` (TTL 30 minutes)

### 2.10 DELETE /products/all

Delete all products of the authenticated merchant. Applies BR-PROD-024 active order guard per product — products with active orders (status NOT IN 'delivered', 'cancelled') are skipped. Only merchant's own products are affected.

- **Auth Required:** Yes (`JwtAuthGuard`)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Roles:** `merchant`, `admin`
- **Guard:** `@requireApprovedMerchant` — Requires `licenseStatus === 'approved'`
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "deleted": 15,
      "skipped": 3,
      "skippedProductIds": ["550e8400-e29b-41d4-a716-446655440001", "550e8400-e29b-41d4-a716-446655440002", "550e8400-e29b-41d4-a716-446655440003"],
      "errors": []
    }
  }
  ```
- **Error Responses:**
  - `401 UNAUTHORIZED` — Missing or invalid JWT
  - `403 FORBIDDEN` — Not merchant/admin or shop not approved
  - `403 MERCHANT_NOT_APPROVED` — Merchant license status is `pending`
  - `403 MERCHANT_REJECTED` — Merchant license status is `rejected` (includes rejection reason)
  - `429 TOO_MANY_REQUESTS` — Rate limit exceeded
- **Logic:** Calls `service.deleteAllByMerchant(userId)`. Iterates all merchant products, attempts soft delete for each. Products with active orders (status NOT IN 'delivered', 'cancelled') are added to `skippedProductIds` array.
- **Side Effects:** Invalidates all product caches for the merchant

### 2.11 GET /products/:id/inventory-transactions

Get inventory transaction history for a product (merchant/admin).

- **Auth Required:** Yes (`JwtAuthGuard`)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Roles:** `merchant`, `admin`
- **Guard:** `@requireApprovedMerchant` — Requires `licenseStatus === 'approved'`
- **Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `type` | string | No | Filter by transaction_type (sale, adjustment, return, manual, restock) |
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 20, max: 100) |

- **Response:** `200 OK`
  ```json
  {
    "data": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "productId": "550e8400-e29b-41d4-a716-446655440000",
        "merchantId": "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
        "transactionType": "manual",
        "quantity": 10,
        "beforeQuantity": 50,
        "afterQuantity": 60,
        "referenceType": null,
        "referenceId": null,
        "reason": "Inventory count correction",
        "createdBy": "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
        "createdAt": "2026-08-18T12:00:00.000Z"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1
    }
  }
  ```
- **Error Responses:**
  - `401 UNAUTHORIZED` — Missing or invalid JWT
  - `403 FORBIDDEN` — Not product owner (merchant) or not admin
  - `403 MERCHANT_NOT_APPROVED` — Merchant license status is `pending`
  - `403 MERCHANT_REJECTED` — Merchant license status is `rejected` (includes rejection reason)
  - `404 NOT_FOUND` — Product not found
- **Logic:** Queries `inventory_transactions` table filtered by `productId` and optional `type`. Returns paginated results ordered by `createdAt` descending.
- **Cache:** No caching (transaction history is volatile)

---

## 3. Protected Endpoint Guards

### 3.1 requireApprovedMerchant Guard

- **File:** `src/modules/auth/guards/require-approved-merchant.guard.ts`
- **Type:** CanActivate (NestJS Guard)
- **Applied to:** All merchant product CRUD endpoints (POST, PATCH, DELETE)

**Logic:**
1. Extract `userId` from JWT token via `ExecutionContext`
2. Query `merchants` table for `licenseStatus` and `rejectionReason`
3. Route based on status:
   - `approved` → Allow request to proceed
   - `pending` → Throw `ForbiddenException`:
     ```json
     {
       "statusCode": 403,
       "error": "MERCHANT_NOT_APPROVED",
       "message": "Your account is pending approval. Product management is not available at this time."
     }
     ```
   - `rejected` → Throw `ForbiddenException`:
     ```json
     {
       "statusCode": 403,
       "error": "MERCHANT_REJECTED",
       "message": "Your account has been rejected. Reason: [rejectionReason from DB]"
     }
     ```

**Database Query:**
```typescript
const merchant = await this.prisma.merchant.findUnique({
  where: { userId },
  select: { licenseStatus: true, rejectionReason: true },
});
```

### 3.2 JwtAuthGuard

- **File:** `src/modules/auth/guards/jwt-auth.guard.ts`
- **Purpose:** Validates JWT signature and expiration
- **Behavior:** Checks `Authorization: Bearer <token>` header. Verifies signature, expiry, and Redis blacklist.

### 3.3 RolesGuard

- **File:** `src/modules/auth/guards/roles.guard.ts`
- **Purpose:** Enforces role-based access control
- **Behavior:** Checks `@Roles()` decorator against user's `role` claim in JWT payload.

### 3.4 Ownership Enforcement

```typescript
// Middleware: Verify product belongs to merchant
const product = await this.prisma.product.findUnique({ where: { id } });
if (user.role === 'merchant' && product.merchantId !== user.id) {
  throw new ForbiddenException('You can only manage your own products');
}
```

### 3.5 Guard Execution Order

All protected endpoints execute guards sequentially:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard, RequireApprovedMerchantGuard)
@Controller('products')
export class ProductsController { ... }
```

| Order | Guard | Purpose |
|-------|-------|---------|
| 1 | `JwtAuthGuard` | Validates JWT token |
| 2 | `RolesGuard` | Enforces role-based access |
| 3 | `RequireApprovedMerchantGuard` | Ensures merchant license is approved |

### 3.6 Cache Invalidation Strategy

| Event | Cache Keys Invalidated | Method |
|-------|----------------------|--------|
| Product Created | `cache:products:list:*` | Pattern delete |
| Product Updated | `cache:product:{id}`, `cache:products:list:*` | Key delete + pattern delete |
| Product Deleted | `cache:product:{id}`, `cache:products:list:*` | Key delete + pattern delete |
| Delete All Products | `cache:products:list:*`, `cache:product:*` | Pattern delete |
| Stock Updated | `cache:product:{id}` | Key delete |
| Bulk Operation | `cache:products:list:*` | Pattern delete |

---

## 4. Rate Limiting Configuration

| Endpoint | Limit | Window | Key |
|----------|-------|--------|-----|
| `GET /products` | 100 requests | 60 seconds | IP address |
| `POST /products` | 10 requests | 60 seconds | User ID |
| `PATCH /products/:id` | 30 requests | 60 seconds | User ID |
| `DELETE /products/:id` | 10 requests | 60 seconds | User ID |
| `PATCH /products/:id/stock` | 30 requests | 60 seconds | User ID |
| `PATCH /products/bulk` | 5 requests | 60 seconds | User ID |
| `DELETE /products/bulk` | 5 requests | 60 seconds | User ID |
| `DELETE /products/all` | 1 request | 60 seconds | User ID |

**Redis Key Pattern:** `rate:products:{endpoint}:{identifier}`

---

## 5. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_PROD_01](./DD_Product_Management_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_PROD_02](./DD_Product_Management_02_FRONTEND_Page.md) | Frontend page design |
| [DD_PROD_04](./DD_Product_Management_04_DTOS_AND_TYPES.md) | Full DTO definitions |
| [DD_PROD_05](./DD_Product_Management_05_BUSINESS_LOGIC.md) | Backend business rules |
| [機能設計書_Product_Management](../商品管理画面_機能設計書.md) | Full functional specification |
| [画面項目設計書_Product_Management](../画面項目設計書_Product_Management.md) | Screen items specification |
