# DD_PROD_04 — DTOs and Types

> **Doc ID:** SKM-DD-PROD-04 | **Version:** 1.4 | **Status:** Released  
> **Last Updated:** 2026-08-18

---

## 1. Overview

This document specifies the Data Transfer Objects (DTOs) used by the Product Management module's API endpoints. These DTOs utilize `class-validator` for request validation and `class-transformer` for data transformation.

- **Location:** `src/modules/products/dto/`

---

## 2. Request DTOs

### 2.1 CreateProductDto

Used for `POST /products` to create a new product.

```typescript
import {
  IsString, IsNotEmpty, IsOptional, IsNumber, IsInt,
  IsBoolean, IsArray, MaxLength, Min, MinLength,
  ValidateNested, IsIn, IsUUID
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty({ message: 'Product name is required' })
  @MaxLength(255, { message: 'Product name must not exceed 255 characters' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Short description is required' })
  @MaxLength(500, { message: 'Short description must not exceed 500 characters' })
  shortDescription: string;

  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  description: string;

  @IsUUID('4', { message: 'Category ID must be a valid UUID v4' })
  @IsNotEmpty({ message: 'Category is required' })
  categoryId: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'SKU must not exceed 100 characters' })
  sku?: string;

  @IsNumber({}, { message: 'Price must be a number' })
  @Min(0.01, { message: 'Price must be greater than 0' })
  price: number;

  @IsOptional()
  @IsNumber({}, { message: 'Compare at price must be a number' })
  @Min(0, { message: 'Compare at price must be 0 or greater' })
  compareAtPrice?: number;

  @IsInt({ message: 'Stock quantity must be a whole number' })
  @Min(0, { message: 'Stock quantity must be 0 or greater' })
  stockQuantity: number = 0;

  @IsOptional()
  @IsInt({ message: 'Low stock threshold must be a whole number' })
  @Min(0, { message: 'Low stock threshold must be 0 or greater' })
  lowStockThreshold?: number = 10;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn(['dry', 'oily', 'combination', 'sensitive', 'normal'], { each: true })
  skinTypes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ingredients?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean = false;
}
```

### 2.2 UpdateProductDto

Used for `PATCH /products/:id` to update product details (partial update).

```typescript
import {
  IsString, IsOptional, IsNumber, IsInt,
  IsBoolean, IsArray, MaxLength, Min,
  IsIn, IsUUID
} from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Product name must not exceed 255 characters' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Short description must not exceed 500 characters' })
  shortDescription?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Category ID must be a valid UUID v4' })
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'SKU must not exceed 100 characters' })
  sku?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Price must be a number' })
  @Min(0.01, { message: 'Price must be greater than 0' })
  price?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Compare at price must be a number' })
  @Min(0, { message: 'Compare at price must be 0 or greater' })
  compareAtPrice?: number;

  @IsOptional()
  @IsInt({ message: 'Stock quantity must be a whole number' })
  @Min(0, { message: 'Stock quantity must be 0 or greater' })
  stockQuantity?: number;

  @IsOptional()
  @IsInt({ message: 'Low stock threshold must be a whole number' })
  @Min(0, { message: 'Low stock threshold must be 0 or greater' })
  lowStockThreshold?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn(['dry', 'oily', 'combination', 'sensitive', 'normal'], { each: true })
  skinTypes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ingredients?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
```

### 2.3 UpdateStockDto

Used for `PATCH /products/:id/stock` to update stock quantity.

```typescript
import { IsInt, Min } from 'class-validator';

export class UpdateStockDto {
  @IsInt({ message: 'Stock quantity must be a whole number' })
  @Min(0, { message: 'Stock quantity must be 0 or greater' })
  stockQuantity: number;
}
```

### 2.4 BulkActionDto

Used for `PATCH /products/bulk` to perform bulk activate/deactivate.

```typescript
import { IsArray, IsString, IsNotEmpty, IsIn, IsUUID } from 'class-validator';

export class BulkActionDto {
  @IsArray()
  @IsUUID('4', { each: true, message: 'Each product ID must be a valid UUID v4' })
  @IsNotEmpty({ message: 'At least one product ID is required' })
  ids: string[];

  @IsString()
  @IsNotEmpty()
  @IsIn(['activate', 'deactivate'], { message: 'Action must be activate or deactivate' })
  action: 'activate' | 'deactivate';
}
```

### 2.5 BulkDeleteDto

Used for `DELETE /products/bulk` to perform bulk soft delete.

```typescript
import { IsArray, IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class BulkDeleteDto {
  @IsArray()
  @IsUUID('4', { each: true, message: 'Each product ID must be a valid UUID v4' })
  @IsNotEmpty({ message: 'At least one product ID is required' })
  ids: string[];
}
```

### 2.6 ProductQueryDto

Used for `GET /products` query parameters.

```typescript
import {
  IsOptional, IsString, IsNumber, IsBoolean,
  Min, Max, IsIn, IsUUID
} from 'class-validator';
import { Type } from 'class-transformer';

export class ProductQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Category ID must be a valid UUID v4' })
  categoryId?: string;

  @IsOptional()
  @IsString()
  skinType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsString()
  @IsIn(['price', 'rating', 'newest', 'name'])
  sortBy?: string = 'newest';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: string = 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isFeatured?: boolean;
}
```

### 2.7 InventoryTransactionQueryDto

Used for `GET /products/:id/inventory-transactions` query parameters.

```typescript
import { IsOptional, IsString, IsIn, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class InventoryTransactionQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['sale', 'adjustment', 'return', 'manual', 'restock'])
  type?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
```

---

## 3. Response DTOs

### 3.1 ProductResponseDto

Returned by product endpoints.

```typescript
export class ProductResponseDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  price: string;
  compareAtPrice: string | null;
  sku: string | null;
  stockQuantity: number;
  lowStockThreshold: number;
  images: string[];
  tags: string[];
  skinTypes: string[];
  ingredients: string[];
  isActive: boolean;
  isFeatured: boolean;
  avgRating: string;
  reviewCount: number;
  merchantId: string;
  categoryId: string;
  category?: CategoryResponseDto;
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.2 ProductListResponseDto

Returned by list endpoint with pagination metadata.

```typescript
export class ProductListResponseDto {
  data: ProductResponseDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### 3.3 CategoryResponseDto

Returned in product responses and category tree.

```typescript
export class CategoryResponseDto {
  id: string;
  name: string;
  slug: string;
  iconUrl: string | null;
  sortOrder: number;
  parentId: string | null;
  children?: CategoryResponseDto[];
}
```

### 3.4 StockUpdateResponseDto

Returned by stock update endpoint.

```typescript
export class StockUpdateResponseDto {
  id: string;
  stockQuantity: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
}
```

### 3.5 BulkOperationResponseDto

Returned by bulk operation endpoints.

```typescript
export class BulkOperationResponseDto {
  updated: number;
  failed: number;
  errors: BulkOperationError[];
}

export class BulkOperationError {
  id: string;
  error: string;
  message: string;
}
```

### 3.6 InventoryTransactionResponseDto

Returned by inventory transaction history endpoint.

```typescript
export class InventoryTransactionResponseDto {
  id: string;
  productId: string;
  merchantId: string;
  transactionType: 'sale' | 'adjustment' | 'return' | 'manual' | 'restock';
  quantity: number;
  beforeQuantity: number;
  afterQuantity: number;
  referenceType: string | null;
  referenceId: string | null;
  reason: string | null;
  createdBy: string;
  createdAt: Date;
}
```

### 3.7 InventoryTransactionListResponseDto

Returned by list endpoint with pagination metadata.

```typescript
export class InventoryTransactionListResponseDto {
  data: InventoryTransactionResponseDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### 3.9 DeleteAllProductsResponseDto

Returned by the `DELETE /products/all` endpoint.

```typescript
export class DeleteAllProductsResponseDto {
  deleted: number;           // Count of successfully deleted products
  skipped: number;           // Count of skipped products (active orders)
  skippedProductIds: string[]; // UUIDs of skipped products
  errors: BulkOperationError[]; // Any errors encountered
}
```

---

## 4. File Upload Types

### 4.1 ProductImageFile

```typescript
export interface ProductImageFile {
  fieldname: string;      // 'images'
  originalname: string;   // Original filename
  encoding: string;       // File encoding
  mimetype: string;       // 'image/jpeg' | 'image/png' | 'image/webp'
  destination: string;    // Upload directory
  filename: string;       // UUID-based filename
  path: string;           // Full file path
  size: number;           // File size in bytes
}
```

### 4.2 ImageValidationConfig

```typescript
export interface ImageValidationConfig {
  maxSize: number;           // 5MB in bytes
  allowedMimeTypes: string[]; // ['image/jpeg', 'image/png', 'image/webp']
  maxFiles: number;          // 10
  storagePath: string;       // './uploads/products'
}

export const IMAGE_VALIDATION_CONFIG: ImageValidationConfig = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxFiles: 10,
  storagePath: process.env.PRODUCT_STORAGE_PATH || './uploads/products',
};
```

---

## 5. Error Response Types

### 5.1 ErrorResponse

```typescript
export interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  details?: ErrorDetail[];
  timestamp: string;
  path: string;
}

export interface ErrorDetail {
  field: string;
  message: string;
}
```

**Error Response Examples:**

```json
// 403 MERCHANT_NOT_APPROVED (Pending License)
{
  "statusCode": 403,
  "error": "MERCHANT_NOT_APPROVED",
  "message": "Your account is pending approval. Product management is not available at this time.",
  "timestamp": "2026-08-16T12:00:00.000Z",
  "path": "/api/v1/products"
}

// 403 MERCHANT_REJECTED (Rejected License)
{
  "statusCode": 403,
  "error": "MERCHANT_REJECTED",
  "message": "Your account has been rejected. Reason: Missing business license documentation",
  "timestamp": "2026-08-16T12:00:00.000Z",
  "path": "/api/v1/products"
}

// 409 PRODUCT_HAS_ACTIVE_ORDERS (Active Order Guard)
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "Cannot delete product with active orders. All orders must be completed first.",
  "timestamp": "2026-08-16T12:00:00.000Z",
  "path": "/api/v1/products/550e8400-e29b-41d4-a716-446655440000"
}
```

### 5.2 ProductErrorCode

```typescript
export enum ProductErrorCode {
  VALIDATION_FAILED = 'VALIDATION_ERROR',
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  SLUG_CONFLICT = 'SLUG_CONFLICT',
  SKU_CONFLICT = 'SKU_CONFLICT',
  CATEGORY_NOT_FOUND = 'CATEGORY_NOT_FOUND',
  CATEGORY_RESTRICTED = 'CATEGORY_RESTRICTED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  SHOP_NOT_APPROVED = 'SHOP_NOT_APPROVED',
  MERCHANT_NOT_APPROVED = 'MERCHANT_NOT_APPROVED',
  MERCHANT_REJECTED = 'MERCHANT_REJECTED',
  PRODUCT_HAS_ACTIVE_ORDERS = 'PRODUCT_HAS_ACTIVE_ORDERS',
  IMAGE_TOO_LARGE = 'IMAGE_TOO_LARGE',
  IMAGE_INVALID_TYPE = 'IMAGE_INVALID_TYPE',
  IMAGE_MAX_EXCEEDED = 'IMAGE_MAX_EXCEEDED',
  STOCK_NEGATIVE = 'STOCK_NEGATIVE',
  BULK_NO_IDS = 'BULK_NO_IDS',
  BULK_PARTIAL_FAILURE = 'BULK_PARTIAL_FAILURE',
}
```

---

## 6. Prisma Generated Types

### 6.1 ProductWithRelations

```typescript
import type { Prisma } from '../generated/prisma/client';

export type ProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    category: true;
    merchant: {
      select: {
        id: true;
        name: true;
        email: true;
      };
    };
  };
}>;
```

### 6.2 ProductListQuery

```typescript
export type ProductListQuery = Prisma.ProductFindManyArgs;
```

### 6.3 InventoryTransactionWithRelations

```typescript
export type InventoryTransactionWithRelations = Prisma.InventoryTransactionGetPayload<{
  include: {
    product: {
      select: {
        id: true;
        name: true;
        sku: true;
      };
    };
    merchant: {
      select: {
        id: true;
        name: true;
      };
    };
  };
}>;
```

---

## 7. Cache Types

### 7.1 ProductCacheEntry

```typescript
export interface ProductCacheEntry {
  key: string;        // 'cache:product:{id}'
  value: string;      // JSON serialized ProductResponseDto
  ttl: number;        // Time to live in seconds (300)
}
```

### 7.2 ProductListCacheEntry

```typescript
export interface ProductListCacheEntry {
  key: string;        // 'cache:products:list:{hash}'
  value: string;      // JSON serialized ProductListResponseDto
  ttl: number;        // Time to live in seconds (120)
}
```

---

## 8. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_PROD_03](./DD_Product_Management_03_API_ENDPOINTS.md) | Endpoints that consume these DTOs |
| [DD_PROD_05](./DD_Product_Management_05_BUSINESS_LOGIC.md) | Business rules for validation |
| [機能設計書_Product_Management](../商品管理画面_機能設計書.md) | Full functional specification |
| [画面項目設計書_Product_Management](../画面項目設計書_Product_Management.md) | Screen items specification |
