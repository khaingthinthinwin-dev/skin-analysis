# DD_PROD_05 — Business Logic

> **Doc ID:** SKM-DD-PROD-05 | **Version:** 1.4 | **Status:** Released  
> **Last Updated:** 2026-08-17

---

## 1. Overview

This document specifies the core business logic, state transitions, and validation rules implemented in the `ProductsService`.

- **Location:** `src/modules/products/products.service.ts`

---

## 2. Core Service Methods

### 2.1 findAll(query)

1. **Validation:** Handled by ProductQueryDto with class-validator.
2. **Logic:**
   - Build Prisma `where` clause from query parameters
   - For public access: filter `isActive = true`
   - For merchant access: filter `merchantId = userId`
   - Apply search filter on `name` and `sku` (ILIKE)
   - Apply category filter on `categoryId`
   - Apply skin type filter on `skinTypes` array overlap
   - Apply price range filter on `price`
   - Apply sort (price, rating, newest, name)
   - Apply pagination (page, limit)
   - Include `category` relation
3. **Cache:** Check `cache:products:list:{hash}` first. On miss, query DB and cache result.
4. **Return:** `ProductListResponseDto` with products and pagination meta.

### 2.2 findBySlug(slug)

1. **Logic:**
   - Check `cache:product:{slug}` first
   - On miss: Query `products` table by `slug` where `isActive = true`
   - Include `category` relation
   - Cache result with TTL 5 minutes
2. **Return:** `ProductResponseDto`
3. **Error:** `NotFoundException` if product not found or inactive.

### 2.3 create(dto, files, userId)

1. **Validation:** Handled by CreateProductDto with class-validator.
2. **Logic:**
   - Verify merchant has approved shop (check `shops.is_approved`)
   - Check category exists in `categories` table
   - Generate slug from product name using slugify utility
   - Check slug uniqueness (regenerate with suffix if needed)
   - Check SKU uniqueness if provided
   - Upload images to storage (UUID-based filenames)
   - Insert `products` record with generated data
   - Log `PRODUCT_CREATED` audit event
3. **Transaction:** Product creation and image upload must be atomic.
4. **Cache:** Invalidate `cache:products:list:*` pattern.
5. **Return:** `ProductResponseDto`

### 2.4 update(id, dto, files, userId)

1. **Validation:** Handled by UpdateProductDto with class-validator.
2. **Logic:**
   - Verify product exists
   - **Ownership Check:** If user role is `merchant`, verify `merchantId === userId`. If not, throw `ForbiddenException`.
   - If `name` changed, regenerate slug and check uniqueness
   - If `sku` changed, check uniqueness (excluding current product)
   - If `categoryId` changed, verify category exists
   - Handle image additions (upload new files)
   - Handle image removals (delete from storage)
   - Update product record
   - Log `PRODUCT_UPDATED` audit event
3. **Cache:** Invalidate `cache:product:{id}` and `cache:products:list:*`.
4. **Return:** `ProductResponseDto`

### 2.5 softDelete(id, userId)

1. **Logic:**
   - Verify product exists
   - **Ownership Check:** If user role is `merchant`, verify `merchantId === userId`.
   - **Active Order Guard (BR-PROD-024):** Check if product has any orders with status NOT IN resolved states:
     ```typescript
     const activeOrders = await this.prisma.orderItem.findMany({
       where: {
         productId: id,
         order: {
           status: { notIn: ['delivered', 'cancelled'] },
         },
       },
       select: { orderId: true },
     });
     
     if (activeOrders.length > 0) {
       throw new ConflictException('Cannot delete product with active orders. All orders must be completed first.');
     }
     ```
   - Set `isActive = false` (soft delete)
   - Log `PRODUCT_DELETED` audit event
2. **Cache:** Invalidate `cache:product:{id}` and `cache:products:list:*`.
3. **Return:** `204 No Content`

### 2.6 updateStock(id, stockQuantity, userId)

1. **Validation:** `stockQuantity >= 0` and integer.
2. **Logic:**
   - Verify product exists
   - **Ownership Check:** If user role is `merchant`, verify `merchantId === userId`.
   - Update `stockQuantity` atomically
   - Check `stockQuantity <= lowStockThreshold` → set `isLowStock` flag
   - Check `stockQuantity === 0` → set `isOutOfStock` flag
   - Log `STOCK_UPDATED` audit event with old and new quantities
3. **Cache:** Invalidate `cache:product:{id}`.
4. **Return:** `StockUpdateResponseDto`

### 2.7 bulkAction(ids, action, userId)

1. **Validation:** `ids` array must not be empty. `action` must be 'activate' or 'deactivate'.
2. **Logic:**
   - For each product in `ids`:
     - Verify product exists
     - **Ownership Check:** If user role is `merchant`, verify `merchantId === userId`
     - If ownership fails, add to `errors` array and continue
   - Perform bulk update on valid products
   - Log `BULK_OPERATION` audit event
3. **Cache:** Invalidate `cache:products:list:*`.
4. **Return:** `BulkOperationResponseDto` with updated count and errors.

### 2.8 bulkSoftDelete(ids, userId)

1. **Validation:** `ids` array must not be empty.
2. **Logic:**
   - For each product in `ids`:
     - Verify product exists
     - **Ownership Check:** If user role is `merchant`, verify `merchantId === userId`
     - If ownership fails, add to `errors` array and continue
   - **Active Order Guard (BR-PROD-024):** Check each product for active orders:
     ```typescript
     // Check for active orders on each product
     const productsWithActiveOrders = await this.prisma.orderItem.findMany({
       where: {
         productId: { in: validProductIds },
         order: {
           status: { notIn: ['delivered', 'cancelled'] },
         },
       },
       select: { productId: true },
       distinct: ['productId'],
     });
     
     const activeOrderProductIds = new Set(
       productsWithActiveOrders.map(item => item.productId)
     );
     
     // Partition into eligible and skipped
     const eligibleIds = validProductIds.filter(id => !activeOrderProductIds.has(id));
     const skippedIds = validProductIds.filter(id => activeOrderProductIds.has(id));
     ```
   - Perform bulk soft delete (`isActive = false`) on eligible products only
   - Add skipped products to `errors` array with reason
   - Log `BULK_DELETE` audit event
3. **Cache:** Invalidate `cache:products:list:*`.
4. **Return:** `BulkOperationResponseDto` with updated count, errors, and skipped products

### 2.9 deleteAllByMerchant(userId)

Delete all products belonging to the authenticated merchant. Products with active orders are skipped.

1. **Validation:** User must be authenticated with approved merchant license.
2. **Logic:**
   - Query all products where `merchantId = userId` and `isActive = true`
   - **Active Order Guard (BR-PROD-024):** Check each product for active orders:
     ```typescript
     // Get all merchant's active products
     const merchantProducts = await this.prisma.product.findMany({
       where: { merchantId: userId, isActive: true },
       select: { id: true },
     });
     
     const productIds = merchantProducts.map(p => p.id);
     
     // Check for active orders on each product
     const productsWithActiveOrders = await this.prisma.orderItem.findMany({
       where: {
         productId: { in: productIds },
         order: {
           status: { notIn: ['delivered', 'cancelled'] },
         },
       },
       select: { productId: true },
       distinct: ['productId'],
     });
     
     const activeOrderProductIds = new Set(
       productsWithActiveOrders.map(item => item.productId)
     );
     
     // Partition into eligible and skipped
     const eligibleIds = productIds.filter(id => !activeOrderProductIds.has(id));
     const skippedIds = productIds.filter(id => activeOrderProductIds.has(id));
     ```
   - Perform bulk soft delete (`isActive = false`) on eligible products only
   - Add skipped products to `skippedProductIds` array
3. **Cache:** Invalidate all product caches (`cache:products:list:*` and `cache:product:*` pattern).
4. **Return:** `DeleteAllProductsResponseDto`
   ```typescript
   {
     deleted: number;           // Count of successfully deleted products
     skipped: number;           // Count of skipped products (active orders)
     skippedProductIds: string[]; // UUIDs of skipped products
     errors: BulkOperationError[]; // Any errors encountered
   }
   ```
5. **Audit:** Log `DELETE_ALL_PRODUCTS` event with merchantId, deletedCount, skippedCount.

## 3. State Transition Logic

### 3.1 Product State Machine

```
                    ┌──────────────────────┐
                    │     ACTIVE           │
                    │  (is_active=true)    │
                    └──────────┬───────────┘
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
   │  INACTIVE    │   │  OUT_OF_STOCK│   │  UPDATE      │
   │ (is_active=  │   │ (stock = 0)  │   │ (details)    │
   │  false)      │   │              │   │              │
   └──────────────┘   └──────────────┘   └──────────────┘
```

### 3.2 State Transition Rules

| Transition | Trigger | Guard Conditions | Action |
|------------|---------|------------------|--------|
| → ACTIVE | Create product | Valid data, merchant authenticated | Set `isActive = true` (default) |
| ACTIVE → INACTIVE | Toggle off / Soft delete | Product belongs to merchant | Set `isActive = false` |
| INACTIVE → ACTIVE | Toggle on / Restore | Product belongs to merchant | Set `isActive = true` |
| ACTIVE → OUT_OF_STOCK | Stock = 0 | Order creation | System detects `stockQuantity === 0` |
| OUT_OF_STOCK → ACTIVE | Stock replenished | Merchant updates stock | System detects `stockQuantity > 0` |

### 3.3 Stock State Logic

```typescript
private checkStockState(stockQuantity: number, lowStockThreshold: number) {
  return {
    isLowStock: stockQuantity <= lowStockThreshold && stockQuantity > 0,
    isOutOfStock: stockQuantity === 0,
  };
}
```

---

## 4. Slug Generation Logic

### 4.1 Slugify Utility

```typescript
// backend/src/common/utils/slug.util.ts
import slugify from 'slugify';
import { v4 as uuidv4 } from 'uuid';

export function generateSlug(name: string): string {
  return slugify(name, {
    lower: true,
    strict: true,
    trim: true,
  });
}

export function generateUniqueSlug(name: string, existingSlugs: string[]): string {
  let slug = generateSlug(name);
  let counter = 1;
  
  while (existingSlugs.includes(slug)) {
    slug = `${generateSlug(name)}-${counter}`;
    counter++;
  }
  
  return slug;
}
```

### 4.2 Slug Uniqueness Check

```typescript
async checkSlugUniqueness(slug: string, excludeId?: string): Promise<boolean> {
  const existing = await this.prisma.product.findFirst({
    where: {
      slug,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
  return !existing;
}
```

---

## 5. Image Management Logic

### 5.1 Image Upload Process

```typescript
async uploadImages(files: ProductImageFile[]): Promise<string[]> {
  const uploadedPaths: string[] = [];
  
  for (const file of files) {
    // Validate MIME type
    if (!IMAGE_VALIDATION_CONFIG.allowedMimeTypes.includes(file.mimetype)) {
      throw new UnsupportedMediaTypeException(file.mimetype);
    }
    
    // Validate file size
    if (file.size > IMAGE_VALIDATION_CONFIG.maxSize) {
      throw new PayloadTooLargeException('Image exceeds 5MB limit');
    }
    
    // Generate UUID-based filename
    const ext = file.originalname.split('.').pop();
    const filename = `${uuidv4()}.${ext}`;
    const filepath = path.join(IMAGE_VALIDATION_CONFIG.storagePath, filename);
    
    // Move file to storage
    await fs.rename(file.path, filepath);
    uploadedPaths.push(`/uploads/products/${filename}`);
  }
  
  return uploadedPaths;
}
```

### 5.2 Image Reordering

```typescript
async reorderImages(productId: string, imageOrder: string[], userId: string): Promise<void> {
  // Verify ownership
  const product = await this.findById(productId);
  if (product.merchantId !== userId) {
    throw new ForbiddenException('You can only manage your own products');
  }
  
  // Update images array order
  await this.prisma.product.update({
    where: { id: productId },
    data: { images: imageOrder },
  });
  
  // Invalidate cache
  await this.invalidateCache(productId);
}
```

---

## 6. Ownership Enforcement Logic

### 6.1 Product Ownership Check

```typescript
private async checkOwnership(productId: string, userId: string, userRole: string): Promise<void> {
  const product = await this.prisma.product.findUnique({
    where: { id: productId },
    select: { merchantId: true },
  });
  
  if (!product) {
    throw new NotFoundException('Product not found');
  }
  
  if (userRole === 'merchant' && product.merchantId !== userId) {
    throw new ForbiddenException('You can only manage your own products');
  }
  // Admin can manage all products — no additional check needed
}
```

### 6.2 Shop Approval Check

```typescript
private async checkShopApproval(userId: string): Promise<void> {
  const shop = await this.prisma.shop.findUnique({
    where: { userId },
    select: { isApproved: true },
  });
  
  if (!shop || !shop.isApproved) {
    throw new ForbiddenException('Your shop must be approved before creating products');
  }
}
```

---

## 7. Validation Rules

### 7.1 Product Creation Validation

| Field | Rule | Error Message |
|-------|------|---------------|
| `name` | Required, 1-255 chars | "Product name is required" |
| `shortDescription` | Required, 1-500 chars | "Short description is required" |
| `description` | Required, non-empty | "Description is required" |
| `categoryId` | Required, valid UUID, exists in DB | "Category is required" |
| `price` | Required, > 0 | "Price must be greater than 0" |
| `compareAtPrice` | Optional, > price | "Compare price must be greater than selling price" |
| `sku` | Optional, unique, max 100 chars | "SKU already exists" |
| `stockQuantity` | Required, >= 0 | "Stock quantity must be 0 or greater" |
| `images` | Required, max 10 files, 5MB each, JPG/PNG/WebP | Various image errors |

### 7.2 Stock Update Validation

| Field | Rule | Error Message |
|-------|------|---------------|
| `stockQuantity` | Required, >= 0, integer | "Stock quantity must be 0 or greater" |

### 7.3 Bulk Operation Validation

| Field | Rule | Error Message |
|-------|------|---------------|
| `ids` | Required, non-empty array | "At least one product ID is required" |
| `action` | Required, 'activate' or 'deactivate' | "Action must be activate or deactivate" |

---

## 8. Cache Invalidation Logic

### 8.1 Cache Key Patterns

| Key Pattern | TTL | Invalidation Trigger |
|-------------|-----|---------------------|
| `cache:product:{slug}` | 5 minutes | Product update/delete |
| `cache:products:list:{hash}` | 2 minutes | Any product mutation |
| `cache:categories` | 30 minutes | Category mutation |

### 8.2 Invalidation Strategy

```typescript
private async invalidateProductCache(productId: string, slug?: string): Promise<void> {
  // Delete product detail cache
  if (slug) {
    await this.redis.del(`cache:product:${slug}`);
  }
  
  // Delete all product list caches (pattern delete)
  const keys = await this.redis.keys('cache:products:list:*');
  if (keys.length > 0) {
    await this.redis.del(...keys);
  }
}
```

---

## 9. Audit Logging

### 9.1 Audit Event Types

| Event | Data Logged | Retention |
|-------|-------------|-----------|
| `PRODUCT_CREATED` | merchantId, productId, timestamp | 90 days |
| `PRODUCT_UPDATED` | merchantId, productId, changes, timestamp | 90 days |
| `PRODUCT_DELETED` | merchantId, productId, timestamp | 90 days |
| `PRODUCT_IMAGE_UPLOADED` | merchantId, productId, fileSize, timestamp | 30 days |
| `STOCK_UPDATED` | merchantId, productId, oldQty, newQty, timestamp | 90 days |
| `BULK_OPERATION` | merchantId, productIds, action, timestamp | 90 days |
| `BULK_DELETE` | merchantId, productIds, timestamp | 90 days |
| `DELETE_ALL_PRODUCTS` | merchantId, deletedCount, skippedCount, timestamp | 90 days |

### 9.2 Audit Log Format

```typescript
private logAuditEvent(event: string, data: Record<string, unknown>): void {
  this.logger.log(JSON.stringify({
    event,
    ...data,
    timestamp: new Date().toISOString(),
  }));
}
```

---

## 10. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_PROD_03](./DD_Product_Management_03_API_ENDPOINTS.md) | Endpoint routing to these methods |
| [DD_PROD_04](./DD_Product_Management_04_DTOS_AND_TYPES.md) | DTO definitions used in validation |
| [DD_PROD_06](./DD_Product_Management_06__TEST_SPEC.md) | Test specification |
| [Requirement Spec](../../core-work/要件定義書_REQUIREMENT_SPEC.md) | Source business rules |
| [Database Spec](../../core-work/データベース設計書_DATABASE_SPEC.md) | Schema and constraints |
