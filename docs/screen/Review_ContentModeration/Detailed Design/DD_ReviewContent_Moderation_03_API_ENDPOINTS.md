# DD_MOD_03 — API Endpoints (Review & Content Moderation)

> **Doc ID:** SKM-DD-MOD-03 | **Version:** 1.1 | **Status:** Released  
> **Last Updated:** 2026-08-18

---

## 0. Document Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-08-17 | Software Architect | Initial API endpoints for Review & Content Moderation. |
| 1.1 | 2026-08-18 | Software Architect | Added Review Reports endpoints: GET /admin/reports, PATCH /admin/reports/:id/status, DELETE /admin/reports/:id. Added report-related audit logging events. |

---

## 1. Controller Setup

- **File:** `src/modules/admin/admin.controller.ts`
- **Base Route:** `/api/v1/admin`
- **Guards:** `JwtAuthGuard` + `RolesGuard` (all endpoints require `admin` role)

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class AdminController { ... }
```

---

## 2. API Endpoints Contract

### 2.1 GET /admin/reviews

View all reviews with filters, search, sort, and pagination.

- **Auth Required:** Yes (Admin)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Query Parameters:**
  - `page` (integer, optional, default: `1`) — Page number
  - `limit` (integer, optional, default: `20`, max: `100`) — Items per page
  - `sort` (string, optional, default: `createdAt`) — Sort field: `createdAt`, `rating`
  - `order` (string, optional, default: `desc`) — Sort order: `asc`, `desc`
  - `status` (enum, optional) — Filter: `approved`, `rejected` (omit for all)
  - `search` (string, optional) — Search by user name, product name, or review content
- **Response:** `200 OK`
  ```json
  {
    "data": [
      {
        "id": "clx1234567890",
        "user": {
          "id": "clx0987654321",
          "name": "John Doe",
          "avatarUrl": "https://cdn.example.com/avatars/john.jpg"
        },
        "product": {
          "id": "clx1122334455",
          "name": "Hydrating Serum",
          "images": ["https://cdn.example.com/products/serum-1.jpg"],
          "slug": "hydrating-serum"
        },
        "rating": 5,
        "title": "Excellent product!",
        "body": "This serum transformed my skin...",
        "isApproved": true,
        "isVerifiedPurchase": true,
        "createdAt": "2026-08-07T10:30:00.000Z"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
  ```
- **Error Responses:**
  - `401 UNAUTHORIZED` — Invalid or expired access token
  - `403 FORBIDDEN` — Non-admin role
  - `500 INTERNAL_SERVER_ERROR` — Server error
- **Logic:** Validates JWT + admin role. Queries `reviews` table with filters. Joins `users` and `products` for display data. Applies pagination.
- **Rate Limit:** 100 requests per minute per admin

---

### 2.2 POST /admin/reviews/:id/moderate

Approve or reject a review.

- **Auth Required:** Yes (Admin)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Path Parameters:**
  - `id` (UUID, required) — Review ID
- **Body:** `ModerateReviewDto`
  - `action` (enum: `'approve'` | `'reject'`, required)
  - `reason` (string, optional, max 500 chars) — Required when action = `'reject'`
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "id": "clx1234567890",
      "isApproved": false,
      "updatedAt": "2026-08-08T12:00:00.000Z"
    }
  }
  ```
- **Side Effects:**
  - Updates `reviews.is_approved`
  - Recalculates product `avg_rating` and `review_count` from approved reviews only
  - Invalidates product cache (`cache:product:{id}`) in Redis
  - Invalidates product list cache (`cache:products:list:*`) in Redis
  - Logs moderation action to audit trail
- **Error Responses:**
  - `400 BAD_REQUEST` — Validation failed (missing action, missing reason for reject)
  - `401 UNAUTHORIZED` — Invalid or expired access token
  - `403 FORBIDDEN` — Non-admin role
  - `404 NOT_FOUND` — Review not found
  - `409 CONFLICT` — Review already in target state
  - `500 INTERNAL_SERVER_ERROR` — Server error
- **Logic:** Validates JWT + admin role. Finds review by ID. If reject, validates reason. Updates `is_approved`. Recalculates product stats. Invalidates caches. Logs audit.
- **Rate Limit:** 100 requests per minute per admin

---

### 2.3 DELETE /admin/reviews/:id

Permanently delete a review.

- **Auth Required:** Yes (Admin)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Path Parameters:**
  - `id` (UUID, required) — Review ID
- **Response:** `204 No Content`
- **Side Effects:**
  - Hard deletes review from database
  - Recalculates product `avg_rating` and `review_count` from remaining approved reviews
  - Invalidates product cache in Redis
  - Invalidates product list cache in Redis
  - Logs deletion action to audit trail
- **Error Responses:**
  - `401 UNAUTHORIZED` — Invalid or expired access token
  - `403 FORBIDDEN` — Non-admin role
  - `404 NOT_FOUND` — Review not found
  - `500 INTERNAL_SERVER_ERROR` — Server error
- **Logic:** Validates JWT + admin role. Finds review by ID. Hard deletes review. Recalculates product stats. Invalidates caches. Logs audit.
- **Rate Limit:** 100 requests per minute per admin

---

### 2.4 POST /admin/reviews/bulk/moderate

Bulk approve or reject multiple reviews.

- **Auth Required:** Yes (Admin)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Body:**
  - `ids` (UUID[], required) — Array of review IDs
  - `action` (enum: `'approve'` | `'reject'`, required)
  - `reason` (string, optional, max 500 chars) — Required when action = `'reject'`
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "processed": 5,
      "failed": 0,
      "results": [
        { "id": "clx123", "status": "success" },
        { "id": "clx456", "status": "success" }
      ]
    }
  }
  ```
- **Side Effects:** Same as single moderation, applied to all selected reviews.
- **Error Responses:**
  - `400 BAD_REQUEST` — Validation failed
  - `401 UNAUTHORIZED` — Invalid or expired access token
  - `403 FORBIDDEN` — Non-admin role
  - `500 INTERNAL_SERVER_ERROR` — Server error (partial failure returns counts)
- **Rate Limit:** 100 requests per minute per admin

---

### 2.5 DELETE /admin/reviews/bulk

Bulk delete multiple reviews.

- **Auth Required:** Yes (Admin)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Body:**
  - `ids` (UUID[], required) — Array of review IDs
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "processed": 5,
      "failed": 0
    }
  }
  ```
- **Side Effects:** Same as single deletion, applied to all selected reviews.
- **Error Responses:**
  - `400 BAD_REQUEST` — Validation failed
  - `401 UNAUTHORIZED` — Invalid or expired access token
  - `403 FORBIDDEN` — Non-admin role
  - `500 INTERNAL_SERVER_ERROR` — Server error
- **Rate Limit:** 100 requests per minute per admin

---

### 2.6 GET /admin/merchants

View all merchants with filters and pagination.

- **Auth Required:** Yes (Admin)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Query Parameters:**
  - `page` (integer, optional, default: `1`)
  - `limit` (integer, optional, default: `20`, max: `100`)
  - `sort` (string, optional, default: `createdAt`)
  - `order` (string, optional, default: `desc`)
  - `status` (enum, optional) — Filter: `pending`, `approved`, `rejected`
  - `search` (string, optional) — Search by merchant name or user email
- **Response:** `200 OK`
  ```json
  {
    "data": [
      {
        "id": "clxShop001",
        "name": "Beauty Garden",
        "slug": "beauty-garden",
        "logoUrl": "https://cdn.example.com/shops/beauty-garden-logo.png",
        "user": {
          "id": "clxUser001",
          "name": "Jane Smith",
          "email": "jane@example.com"
        },
        "isApproved": false,
        "createdAt": "2026-08-06T08:00:00.000Z"
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
  - `401 UNAUTHORIZED` — Invalid or expired access token
  - `403 FORBIDDEN` — Non-admin role
  - `500 INTERNAL_SERVER_ERROR` — Server error
- **Logic:** Validates JWT + admin role. Queries `merchants` table with `license_status` filter. Joins `users` and `shops`. Applies pagination.
- **Rate Limit:** 100 requests per minute per admin

---

### 2.7 GET /admin/merchants/:id

View merchant detail.

- **Auth Required:** Yes (Admin)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Path Parameters:**
  - `id` (UUID, required) — Merchant/Shop ID
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "id": "clxShop001",
      "name": "Beauty Garden",
      "slug": "beauty-garden",
      "description": "Premium skincare products...",
      "logoUrl": "https://cdn.example.com/shops/logo.png",
      "bannerUrl": "https://cdn.example.com/shops/banner.png",
      "licenseUrl": "https://cdn.example.com/licenses/shop001.pdf",
      "user": {
        "id": "clxUser001",
        "name": "Jane Smith",
        "email": "jane@example.com",
        "phone": "+60123456789"
      },
      "isApproved": false,
      "createdAt": "2026-08-06T08:00:00.000Z"
    }
  }
  ```
- **Error Responses:**
  - `401 UNAUTHORIZED` — Invalid or expired access token
  - `403 FORBIDDEN` — Non-admin role
  - `404 NOT_FOUND` — Merchant not found
  - `500 INTERNAL_SERVER_ERROR` — Server error
- **Rate Limit:** 100 requests per minute per admin

---

### 2.8 PATCH /admin/merchants/:id/status

Approve or reject a merchant registration.

- **Auth Required:** Yes (Admin)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Path Parameters:**
  - `id` (UUID, required) — Merchant ID
- **Body:** `ModerateMerchantDto`
  - `status` (enum: `'approved'` | `'rejected'`, required)
  - `reason` (string, optional, max 500 chars) — Required when status = `'rejected'`
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "id": "clxShop001",
      "isApproved": true,
      "updatedAt": "2026-08-08T12:00:00.000Z"
    }
  }
  ```
- **Side Effects:**
  - Updates `merchants.license_status`, `rejection_reason`, `reviewed_at`, `reviewed_by`
  - Synchronizes `shops.is_approved` (`true` for approved, `false` for rejected)
  - If rejected: deactivates merchant's products (`is_active = false`)
  - Creates website notification for the merchant user
  - Logs moderation action to audit trail
- **Error Responses:**
  - `400 BAD_REQUEST` — Validation failed (missing status, missing reason for reject)
  - `401 UNAUTHORIZED` — Invalid or expired access token
  - `403 FORBIDDEN` — Non-admin role
  - `404 NOT_FOUND` — Merchant/shop not found
  - `409 CONFLICT` — Merchant already in target status
  - `500 INTERNAL_SERVER_ERROR` — Server error
- **Logic:** Validates JWT + admin role. Finds merchant by ID. If reject, validates reason. Updates `license_status`. Synchronizes `shops.is_approved`. If rejected, deactivates products. Creates notification. Logs audit.
- **Rate Limit:** 100 requests per minute per admin

---

### 2.9 GET /admin/content

View all products with filters, search, sort, and pagination.

- **Auth Required:** Yes (Admin)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Query Parameters:**
  - `page` (integer, optional, default: `1`)
  - `limit` (integer, optional, default: `20`, max: `100`)
  - `sort` (string, optional, default: `createdAt`)
  - `order` (string, optional, default: `desc`)
  - `status` (enum, optional) — Filter: `active`, `inactive`
  - `search` (string, optional) — Search by product name or shop name
- **Response:** `200 OK`
  ```json
  {
    "data": [
      {
        "id": "clxProd001",
        "name": "Hydrating Serum",
        "slug": "hydrating-serum",
        "images": ["https://cdn.example.com/products/serum-1.jpg"],
        "price": 49.99,
        "isActive": true,
        "shop": {
          "id": "clxShop001",
          "name": "Beauty Garden",
          "user": {
            "id": "clxUser001",
            "name": "Jane Smith"
          }
        },
        "createdAt": "2026-08-01T10:00:00.000Z"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 200,
      "totalPages": 10
    }
  }
  ```
- **Error Responses:**
  - `401 UNAUTHORIZED` — Invalid or expired access token
  - `403 FORBIDDEN` — Non-admin role
  - `500 INTERNAL_SERVER_ERROR` — Server error
- **Logic:** Validates JWT + admin role. Queries `products` table with `is_active` filter. Joins `shops` and `users`. Applies pagination.
- **Rate Limit:** 100 requests per minute per admin

---

### 2.10 GET /admin/content/:id

View product detail for moderation.

- **Auth Required:** Yes (Admin)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Path Parameters:**
  - `id` (UUID, required) — Product ID
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "id": "clxProd001",
      "name": "Hydrating Serum",
      "slug": "hydrating-serum",
      "description": "A deeply hydrating serum...",
      "images": ["https://cdn.example.com/products/serum-1.jpg"],
      "price": 49.99,
      "isActive": true,
      "category": {
        "id": "clxCat001",
        "name": "Serums"
      },
      "shop": {
        "id": "clxShop001",
        "name": "Beauty Garden",
        "logoUrl": "https://cdn.example.com/shops/logo.png",
        "user": {
          "id": "clxUser001",
          "name": "Jane Smith",
          "email": "jane@example.com"
        }
      },
      "createdAt": "2026-08-01T10:00:00.000Z",
      "updatedAt": "2026-08-05T14:30:00.000Z"
    }
  }
  ```
- **Error Responses:**
  - `401 UNAUTHORIZED` — Invalid or expired access token
  - `403 FORBIDDEN` — Non-admin role
  - `404 NOT_FOUND` — Product not found
  - `500 INTERNAL_SERVER_ERROR` — Server error
- **Rate Limit:** 100 requests per minute per admin

---

### 2.11 PATCH /admin/content/:id/status

Deactivate or reactivate a product.

- **Auth Required:** Yes (Admin)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Path Parameters:**
  - `id` (UUID, required) — Product ID
- **Body:** `ModerateProductDto`
  - `isActive` (boolean, required) — `false` to deactivate, `true` to reactivate
  - `reason` (string, optional, max 500 chars) — Required when `isActive = false`
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "id": "clxProd001",
      "isActive": false,
      "updatedAt": "2026-08-12T12:00:00.000Z"
    }
  }
  ```
- **Side Effects:**
  - Updates `products.is_active`
  - Invalidates product cache in Redis
  - Invalidates product list cache in Redis
  - Logs moderation action to audit trail
- **Error Responses:**
  - `400 BAD_REQUEST` — Validation failed (missing reason for deactivation)
  - `401 UNAUTHORIZED` — Invalid or expired access token
  - `403 FORBIDDEN` — Non-admin role
  - `404 NOT_FOUND` — Product not found
  - `409 CONFLICT` — Product already in target state
  - `500 INTERNAL_SERVER_ERROR` — Server error
- **Logic:** Validates JWT + admin role. Finds product by ID. If deactivating, validates reason. Updates `is_active`. Invalidates caches. Logs audit.
- **Rate Limit:** 100 requests per minute per admin

---

### 2.12 PATCH /admin/content/bulk/status

Bulk deactivate or reactivate multiple products.

- **Auth Required:** Yes (Admin)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Body:**
  - `ids` (UUID[], required) — Array of product IDs
  - `isActive` (boolean, required) — `false` to deactivate, `true` to reactivate
  - `reason` (string, optional, max 500 chars) — Required when `isActive = false`
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "processed": 5,
      "failed": 0,
      "results": [
        { "id": "clxProd001", "status": "success" },
        { "id": "clxProd002", "status": "success" }
      ]
    }
  }
  ```
- **Side Effects:** Same as single product moderation, applied to all selected products.
- **Error Responses:**
  - `400 BAD_REQUEST` — Validation failed
  - `401 UNAUTHORIZED` — Invalid or expired access token
  - `403 FORBIDDEN` — Non-admin role
  - `500 INTERNAL_SERVER_ERROR` — Server error
- **Rate Limit:** 100 requests per minute per admin

---

### 2.13 GET /admin/users

View all users with filters and pagination.

- **Auth Required:** Yes (Admin)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Query Parameters:**
  - `page` (integer, optional, default: `1`)
  - `limit` (integer, optional, default: `20`, max: `100`)
  - `sort` (string, optional, default: `createdAt`)
  - `order` (string, optional, default: `desc`)
  - `status` (enum, optional) — Filter: `active`, `inactive`, `admin`
  - `search` (string, optional) — Search by user name or email
- **Response:** `200 OK`
  ```json
  {
    "data": [
      {
        "id": "clxUser001",
        "name": "John Doe",
        "email": "john@example.com",
        "avatarUrl": "https://cdn.example.com/avatars/john.jpg",
        "role": "buyer",
        "isActive": true,
        "createdAt": "2026-07-01T10:00:00.000Z"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 500,
      "totalPages": 25
    }
  }
  ```
- **Error Responses:**
  - `401 UNAUTHORIZED` — Invalid or expired access token
  - `403 FORBIDDEN` — Non-admin role
  - `500 INTERNAL_SERVER_ERROR` — Server error
- **Logic:** Validates JWT + admin role. Queries `users` table with filters. Applies pagination.
- **Rate Limit:** 100 requests per minute per admin

---

### 2.14 GET /admin/users/:id

View user detail.

- **Auth Required:** Yes (Admin)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Path Parameters:**
  - `id` (UUID, required) — User ID
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "id": "clxUser001",
      "name": "John Doe",
      "email": "john@example.com",
      "avatarUrl": "https://cdn.example.com/avatars/john.jpg",
      "phone": "+60123456789",
      "role": "buyer",
      "isActive": true,
      "lastLoginAt": "2026-08-10T09:15:00.000Z",
      "createdAt": "2026-07-01T10:00:00.000Z",
      "reviewCount": 12
    }
  }
  ```
- **Error Responses:**
  - `401 UNAUTHORIZED` — Invalid or expired access token
  - `403 FORBIDDEN` — Non-admin role
  - `404 NOT_FOUND` — User not found
  - `500 INTERNAL_SERVER_ERROR` — Server error
- **Rate Limit:** 100 requests per minute per admin

---

### 2.15 PATCH /admin/users/:id/status

Activate or deactivate a user account.

- **Auth Required:** Yes (Admin)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Path Parameters:**
  - `id` (UUID, required) — User ID
- **Body:** `ModerateUserDto`
  - `isActive` (boolean, required) — `false` to deactivate, `true` to reactivate
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "id": "clxUser001",
      "isActive": false,
      "updatedAt": "2026-08-12T12:00:00.000Z"
    }
  }
  ```
- **Side Effects:**
  - Updates `users.is_active`
  - If deactivating: revokes all user refresh tokens
  - Invalidates user profile cache
  - Logs action to audit trail
- **Error Responses:**
  - `400 BAD_REQUEST` — Admin cannot deactivate own account
  - `401 UNAUTHORIZED` — Invalid or expired access token
  - `403 FORBIDDEN` — Non-admin role
  - `404 NOT_FOUND` — User not found
  - `409 CONFLICT` — User already in target state
  - `500 INTERNAL_SERVER_ERROR` — Server error
- **Logic:** Validates JWT + admin role. Finds user by ID. Prevents self-deactivation. Updates `is_active`. If deactivating, revokes all refresh tokens. Invalidates cache. Logs audit.
- **Rate Limit:** 100 requests per minute per admin

---

### 2.16 GET /admin/reports

View all review reports with filters, search, and pagination.

- **Auth Required:** Yes (Admin)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Query Parameters:**
  - `page` (integer, optional, default: `1`) — Page number
  - `limit` (integer, optional, default: `20`, max: `100`) — Items per page
  - `sort` (string, optional, default: `createdAt`) — Sort field: `createdAt`
  - `order` (string, optional, default: `desc`) — Sort order: `asc`, `desc`
  - `status` (enum, optional) — Filter: `pending`, `rejected`, `completed` (omit for all)
  - `search` (string, optional) — Search by reporter name, email, or review content
- **Response:** `200 OK`
  ```json
  {
    "data": [
      {
        "id": "clxReport001",
        "reviewId": "clxReview001",
        "reporter": {
          "id": "clxUser002",
          "name": "Jane Doe",
          "email": "jane@example.com",
          "avatarUrl": "https://cdn.example.com/avatars/jane.jpg"
        },
        "review": {
          "id": "clxReview001",
          "body": "This product is amazing! It completely transformed my skin in just two weeks...",
          "rating": 5,
          "product": {
            "id": "clxProd001",
            "name": "Hydrating Serum",
            "slug": "hydrating-serum"
          }
        },
        "reason": "spam",
        "detail": "This review appears to be fake promotional content",
        "status": "pending",
        "resolvedBy": null,
        "resolvedAt": null,
        "createdAt": "2026-08-15T10:30:00.000Z"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
  ```
- **Error Responses:**
  - `401 UNAUTHORIZED` — Invalid or expired access token
  - `403 FORBIDDEN` — Non-admin role
  - `500 INTERNAL_SERVER_ERROR` — Server error
- **Logic:** Validates JWT + admin role. Queries `review_reports` table with optional status filter. Joins `users` (reporter) and `reviews` for display data. Applies pagination.
- **Rate Limit:** 100 requests per minute per admin

---

### 2.17 PATCH /admin/reports/:id/status

Update report status (reject or complete).

- **Auth Required:** Yes (Admin)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Path Parameters:**
  - `id` (UUID, required) — Report ID
- **Body:** `UpdateReportStatusDto`
  - `status` (enum: `'rejected'` | `'completed'`, required)
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "id": "clxReport001",
      "status": "completed",
      "resolvedBy": "clxAdmin001",
      "resolvedAt": "2026-08-17T14:00:00.000Z",
      "updatedAt": "2026-08-17T14:00:00.000Z"
    }
  }
  ```
- **Side Effects:**
  - Updates `review_reports.status`
  - Sets `review_reports.resolved_by` and `resolved_at`
  - If status = `'completed'`: rejects the target review (`reviews.is_approved = false`)
  - Recalculates product `avg_rating` and `review_count` from approved reviews only
  - Invalidates product cache in Redis
  - Invalidates product list cache in Redis
  - Logs moderation action to audit trail
- **Error Responses:**
  - `400 BAD_REQUEST` — Validation failed (missing status)
  - `401 UNAUTHORIZED` — Invalid or expired access token
  - `403 FORBIDDEN` — Non-admin role
  - `404 NOT_FOUND` — Report not found
  - `409 CONFLICT` — Attempting to change an already completed report
  - `500 INTERNAL_SERVER_ERROR` — Server error
- **Logic:** Validates JWT + admin role. Finds report by ID. If report is already completed, returns 409. If status = `'completed'`, rejects the target review. Updates report status. Sets `resolved_by` and `resolved_at`. Logs audit.
- **Rate Limit:** 100 requests per minute per admin

---

### 2.18 DELETE /admin/reports/:id

Delete a review report.

- **Auth Required:** Yes (Admin)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Path Parameters:**
  - `id` (UUID, required) — Report ID
- **Response:** `204 No Content`
- **Side Effects:**
  - Hard deletes report from `review_reports` table
  - Logs deletion action to audit trail
- **Error Responses:**
  - `401 UNAUTHORIZED` — Invalid or expired access token
  - `403 FORBIDDEN` — Non-admin role
  - `404 NOT_FOUND` — Report not found
  - `409 CONFLICT` — Completed reports cannot be deleted
  - `500 INTERNAL_SERVER_ERROR` — Server error
- **Logic:** Validates JWT + admin role. Finds report by ID. If report is completed, returns 409. Hard deletes report. Logs audit.
- **Rate Limit:** 100 requests per minute per admin

---

## 3. Protected Endpoint Guards

All admin endpoints execute guards sequentially:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class AdminController { ... }
```

| Guard | Purpose | Behavior |
|-------|---------|----------|
| `JwtAuthGuard` | Validates JWT signature | Checks `Authorization: Bearer <token>` header. Verifies signature, expiry, and Redis blacklist. |
| `RolesGuard` | Enforces admin-only access | Checks `@Roles('admin')` decorator against user's `role` claim in JWT payload. |

---

## 4. Rate Limiting Configuration

| Endpoint | Limit | Window | Key |
|----------|-------|--------|-----|
| `GET /admin/*` | 100 requests | 1 minute | Admin user ID |
| `POST /admin/*` | 100 requests | 1 minute | Admin user ID |
| `PATCH /admin/*` | 100 requests | 1 minute | Admin user ID |
| `DELETE /admin/*` | 100 requests | 1 minute | Admin user ID |

**Redis Key Pattern:** `rate:admin:{endpoint}:{adminUserId}`

---

## 5. WebSocket Events (Post-Moderation)

After moderation actions, real-time notifications are sent via WebSocket:

| Event | Direction | Recipients | Payload | Description |
|-------|-----------|------------|---------|-------------|
| `REVIEW_STATUS_CHANGED` | Server -> Client | Review author, Product merchant | `{ reviewId, status, productName }` | Review approved/rejected notification |
| `MERCHANT_STATUS_CHANGED` | Server -> Client | Merchant user | `{ merchantId, status, shopName }` | Merchant approved/rejected notification |
| `CONTENT_REMOVED` | Server -> Client | Product merchant | `{ productId, productName }` | Product deactivated notification |
| `USER_STATUS_CHANGED` | Server -> Client | Affected user | `{ userId, isActive }` | User activated/deactivated notification |
| `NEW_MERCHANT_REGISTRATION` | Server -> Client | Admin dashboard | `{ merchantId, shopName }` | New merchant pending approval |
| `REVIEW_CREATED` | Server -> Client | Admin dashboard | `{ reviewId, productName }` | New review submitted (approved by default) |
| `REPORT_STATUS_CHANGED` | Server -> Client | Admin dashboard | `{ reportId, status, reviewId }` | Report status updated (rejected/completed) |

---

## 6. Audit Logging

All moderation actions are logged to the `audit_logs` table:

| Event | Data Logged | Retention |
|-------|-------------|-----------|
| `REVIEW_APPROVED` | adminId, reviewId, productId, timestamp | 2 years |
| `REVIEW_REJECTED` | adminId, reviewId, productId, reason, timestamp | 2 years |
| `REVIEW_DELETED` | adminId, reviewId, productId, timestamp | 2 years |
| `MERCHANT_APPROVED` | adminId, shopId, merchantId, timestamp | 2 years |
| `MERCHANT_REJECTED` | adminId, shopId, merchantId, reason, timestamp | 2 years |
| `PRODUCT_DEACTIVATED` | adminId, productId, reason, timestamp | 2 years |
| `PRODUCT_REACTIVATED` | adminId, productId, timestamp | 2 years |
| `USER_DEACTIVATED` | adminId, userId, timestamp | 2 years |
| `USER_ACTIVATED` | adminId, userId, timestamp | 2 years |
| `REPORT_REJECTED` | adminId, reportId, reviewId, timestamp | 2 years |
| `REPORT_COMPLETED` | adminId, reportId, reviewId, timestamp | 2 years |
| `REPORT_DELETED` | adminId, reportId, timestamp | 2 years |
| `RBAC_VIOLATION` | userId, endpoint, requiredRole, timestamp | 30 days |

---

## 7. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_MOD_01](./DD_ReviewContent_Moderation_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_MOD_02](./DD_ReviewContent_Moderation_02_FRONTEND_PAGES.md) | Frontend page design |
| [DD_MOD_04](./DD_ReviewContent_Moderation_04_DTOS_AND_TYPES.md) | Full DTO definitions |
| [DD_MOD_05](./DD_ReviewContent_Moderation_05_BUSINESS_LOGIC.md) | Backend business rules |
| [機能設計書_Review_Content_Moderation](../機能設計書_Review_Content_Moderation.md) | Full functional specification |
| [画面項目設計書_Review_Content_Moderation](../画面項目設計書_Review_Content_Moderation.md) | Screen items specification |
