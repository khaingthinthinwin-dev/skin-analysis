# DD_MOD_05  EBusiness Logic (Review & Content Moderation)

> **Doc ID:** SKM-DD-MOD-05 | **Version:** 1.2 | **Status:** Released  
> **Last Updated:** 2026-08-22

---

## 0. Document Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-08-17 | Software Architect | Initial business logic for Review & Content Moderation. |
| 1.1 | 2026-08-18 | Software Architect | Added Review Reports business logic (UC-MOD-007): report status update, report deletion, report state machine, validation rules, audit logging, and cache invalidation. |
| 1.2 | 2026-08-22 | Software Architect | Aligned with FDS v2.0 and screen items v6.0: updated report status from COMPLETED to RESOLVED, added REVIEWED state, added report review method. |
| 1.3 | 2026-08-24 | Software Architect | Changed review display approach from hybrid to admin-moderated: ALL reviews now require admin approval before being shown to buyers. Updated review creation logic. |

---

## 1. Overview

This document specifies the core business logic, state transition rules, cache invalidation, and audit logging implemented in the `AdminService` and related moderation services.

- **Location:** `src/modules/admin/admin.service.ts`, `src/modules/admin/merchant-admin.service.ts`, `src/modules/admin/content-moderation.service.ts`, `src/modules/admin/user-admin.service.ts`, `src/modules/admin/report-admin.service.ts`

---

## 2. Core Service Methods

### 2.1 moderateReview(reviewId, dto)

1. **Validation:** Handled by `ModerateReviewDto` with class-validator.
2. **Logic:**
   - Find review by `id` in `reviews` table. If not found, return 404.
   - **Review approval approach:**
      - When a review is created, set `is_approved = false` (hidden from buyers until admin approval).
      - The `moderate` endpoint handles approval/rejection: admins approve or reject reviews.
   - If `dto.action === 'reject'`:
     - Validate `dto.reason` is provided and non-empty. If missing, return 400 with `REJECTION_REASON_REQUIRED`.
     - Check current `is_approved` state. If already `false`, return 409 with `REVIEW_ALREADY_REJECTED`.
   - If `dto.action === 'approve'`:
     - Check current `is_approved` state. If already `true`, return 409 with `REVIEW_ALREADY_APPROVED`.
   - Update `reviews.is_approved` (`true` for approve, `false` for reject).
   - **Recalculate product statistics:**
     - Query `SELECT AVG(rating), COUNT(*) FROM reviews WHERE product_id = :productId AND is_approved = true`
     - Update `products.avg_rating` and `products.review_count`
   - **Invalidate caches:**
     - Delete `cache:product:{productId}` from Redis
     - Delete all keys matching `cache:products:list:*` from Redis (pattern-based invalidation)
   - **Audit log:** Insert `REVIEW_APPROVED` or `REVIEW_REJECTED` with `adminId`, `reviewId`, `productId`, `reason` (if rejected), `timestamp`.
3. **Transaction Boundaries:** Review update, product stat recalculation, and audit log must be atomic.

### 2.2 deleteReview(reviewId)

1. **Validation:** Review ID is valid UUID.
2. **Logic:**
   - Find review by `id`. If not found, return 404.
   - Capture `productId` before deletion for recalculation.
   - Hard delete review from `reviews` table.
   - **Recalculate product statistics:**
     - Query remaining approved reviews for the product
     - Update `products.avg_rating` and `products.review_count`
   - **Invalidate caches:**
     - Delete `cache:product:{productId}` from Redis
     - Delete all keys matching `cache:products:list:*` from Redis
   - **Audit log:** Insert `REVIEW_DELETED` with `adminId`, `reviewId`, `productId`, `timestamp`.
3. **Transaction Boundaries:** Review deletion, product stat recalculation, and audit log must be atomic.

### 2.3 bulkModerateReviews(dto)

1. **Validation:** Handled by `BulkModerateReviewsDto`.
2. **Logic:**
   - Validate all review IDs exist.
   - For each review, apply the same logic as `moderateReview` (step 2.1).
   - Return `BulkOperationResponseDto` with `processed` count, `failed` count, and per-ID results.
   - On partial failure, continue processing remaining reviews.
3. **Transaction Boundaries:** Each review moderation is independent. No cross-review atomicity required.

### 2.4 bulkDeleteReviews(dto)

1. **Validation:** Handled by `BulkDeleteReviewsDto`.
2. **Logic:**
   - Validate all review IDs exist.
   - For each review, apply the same logic as `deleteReview` (step 2.2).
   - Return `BulkOperationResponseDto` with counts and results.
3. **Transaction Boundaries:** Each review deletion is independent.

### 2.5 moderateMerchant(merchantId, dto)

1. **Validation:** Handled by `ModerateMerchantDto`.
2. **Logic:**
   - Find merchant by `id` in `merchants` table. If not found, return 404.
   - Find associated shop via `shops.merchant_id = merchantId`. If not found, return 404.
   - If `dto.status === 'rejected'`:
     - Validate `dto.reason` is provided. If missing, return 400 with `REJECTION_REASON_REQUIRED`.
     - Check current `license_status`. If already `'rejected'`, return 409 with `MERCHANT_ALREADY_REJECTED`.
   - If `dto.status === 'approved'`:
     - Check current `license_status`. If already `'approved'`, return 409 with `MERCHANT_ALREADY_APPROVED`.
   - Update `merchants.license_status` to `dto.status`.
   - Set `merchants.rejection_reason` to `dto.reason` (if rejected) or `null` (if approved).
   - Set `merchants.reviewed_at` to current timestamp.
   - Set `merchants.reviewed_by` to `adminId`.
   - **Synchronize shop visibility:**
     - If approved: set `shops.is_approved = true`
     - If rejected: set `shops.is_approved = false`
   - **If rejected: deactivate merchant's products:**
     - Update `products.is_active = false` WHERE `shop_id = shopId`
     - Invalidate product caches for all affected products
   - **Create website notification:**
     - Insert notification record for the merchant user with type `MERCHANT_STATUS_CHANGED`
   - **Audit log:** Insert `MERCHANT_APPROVED` or `MERCHANT_REJECTED` with `adminId`, `merchantId`, `shopId`, `reason` (if rejected), `timestamp`.
3. **Transaction Boundaries:** Merchant update, shop sync, product deactivation, notification creation, and audit log must be atomic.

### 2.6 moderateProduct(productId, dto)

1. **Validation:** Handled by `ModerateProductDto`.
2. **Logic:**
   - Find product by `id` in `products` table. If not found, return 404.
   - If `dto.isActive === false`:
     - Validate `dto.reason` is provided. If missing, return 400 with `DEACTIVATION_REASON_REQUIRED`.
     - Check current `is_active`. If already `false`, return 409 with `PRODUCT_ALREADY_INACTIVE`.
   - If `dto.isActive === true`:
     - Check current `is_active`. If already `true`, return 409 with `PRODUCT_ALREADY_ACTIVE`.
   - Update `products.is_active` to `dto.isActive`.
   - **Invalidate caches:**
     - Delete `cache:product:{productId}` from Redis
     - Delete all keys matching `cache:products:list:*` from Redis
   - **Audit log:** Insert `PRODUCT_DEACTIVATED` or `PRODUCT_REACTIVATED` with `adminId`, `productId`, `reason` (if deactivated), `timestamp`.
3. **Transaction Boundaries:** Product update, cache invalidation, and audit log must be atomic.

### 2.7 bulkModerateProducts(dto)

1. **Validation:** Handled by `BulkModerateProductsDto`.
2. **Logic:**
   - Validate all product IDs exist.
   - For each product, apply the same logic as `moderateProduct` (step 2.6).
   - Return `BulkOperationResponseDto` with counts and results.
3. **Transaction Boundaries:** Each product moderation is independent.

### 2.8 moderateUser(userId, dto)

1. **Validation:** Handled by `ModerateUserDto`.
2. **Logic:**
   - Find user by `id` in `users` table. If not found, return 404.
   - **Self-deactivation prevention:** If `userId === adminId` and `dto.isActive === false`, return 400 with `SELF_DEACTIVATION_PREVENTED`.
   - If `dto.isActive === false`:
     - Check current `is_active`. If already `false`, return 409 with `USER_ALREADY_INACTIVE`.
   - If `dto.isActive === true`:
     - Check current `is_active`. If already `true`, return 409 with `USER_ALREADY_ACTIVE`.
   - Update `users.is_active` to `dto.isActive`.
   - **If deactivating: revoke all sessions:**
     - Update `refresh_tokens.is_revoked = true` WHERE `user_id = userId`
     - This ensures user cannot refresh access token after deactivation
   - **Invalidate user profile cache** in Redis.
   - **Audit log:** Insert `USER_DEACTIVATED` or `USER_ACTIVATED` with `adminId`, `userId`, `timestamp`.
3. **Transaction Boundaries:** User update, token revocation, and audit log must be atomic.

### 2.9 updateReportStatus(reportId, dto)

1. **Validation:** Handled by `UpdateReportStatusDto` with class-validator.
2. **Logic:**
   - Find report by `id` in `review_reports` table. If not found, return 404 with `REPORT_NOT_FOUND`.
   - Check current `status`. If already `'resolved'`, return 409 with `REPORT_ALREADY_RESOLVED`.
   - Update `review_reports.status` to `dto.status`.
   - Set `review_reports.resolved_by` to `adminId`.
   - Set `review_reports.resolved_at` to current timestamp.
   - Set `review_reports.admin_note` from `dto.adminNote`.
   - **If status = `'resolved'`:**
     - Reject the target review: Update `reviews.is_approved = false` WHERE `id = report.reviewId`.
     - **Recalculate product statistics:**
       - Query `SELECT AVG(rating), COUNT(*) FROM reviews WHERE product_id = :productId AND is_approved = true`
       - Update `products.avg_rating` and `products.review_count`
     - **Invalidate caches:**
       - Delete `cache:product:{productId}` from Redis
       - Delete all keys matching `cache:products:list:*` from Redis
   - **If status = `'reviewed'`:**
     - Just update the status. Do not reject the target review.
   - **Audit log:** Insert `REPORT_REJECTED` or `REPORT_RESOLVED` with `adminId`, `reportId`, `reviewId`, `timestamp`.
3. **Transaction Boundaries:** Report update, review rejection (if resolved), product stat recalculation, cache invalidation, and audit log must be atomic.

### 2.10 deleteReport(reportId)

1. **Validation:** Report ID is valid UUID.
2. **Logic:**
   - Find report by `id` in `review_reports` table. If not found, return 404 with `REPORT_NOT_FOUND`.
   - Check current `status`. If `'resolved'`, return 409 with `REPORT_RESOLVED_CANNOT_DELETE`.
   - Hard delete report from `review_reports` table.
   - **Audit log:** Insert `REPORT_DELETED` with `adminId`, `reportId`, `timestamp`.
3. **Transaction Boundaries:** Report deletion and audit log must be atomic.

### 2.11 reportReview(reviewId, adminId, dto)

1. **Validation:** Review ID is valid UUID. Handled by `ReportReviewDto` with class-validator.
2. **Logic:**
   - Validate review exists in `reviews` table. If not found, return 404 with `REVIEW_NOT_FOUND`.
   - Check for duplicate report: Query `review_reports` WHERE `review_id = reviewId` AND `reported_by = adminId`. If found, return 409 with `REPORT_ALREADY_EXISTS`.
   - Create report record:
     - `review_id` = `reviewId`
     - `reported_by` = `adminId`
     - `reason` = `dto.reason`
     - `detail` = `dto.detail` (optional)
     - `status` = `'pending'`
     - `created_at` = current timestamp
   - **Audit log:** Insert `REPORT_CREATED` with `adminId`, `reviewId`, `reason`, `timestamp`.
   - Return the created report.
3. **Transaction Boundaries:** Report creation and audit log must be atomic.

---

## 3. State Transition Logic

### 3.1 Review State Machine

| Transition | Origin | Target | Guard Conditions |
|------------|--------|--------|------------------|
| TR-MOD-01 | `is_approved = true` | `is_approved = false` | Admin role, review exists |
| TR-MOD-02 | `is_approved = false` | `is_approved = true` | Admin role, review exists |

```typescript
function transitionReviewState(review: Review, action: ReviewAction): boolean {
  if (action === 'reject') {
    if (!review.isApproved) return false; // Already rejected (409)
    review.isApproved = false;
  } else if (action === 'approve') {
    if (review.isApproved) return false; // Already approved (409)
    review.isApproved = true;
  }
  return true;
}
```

### 3.2 Merchant State Machine

| Transition | Origin | Target | Guard Conditions |
|------------|--------|--------|------------------|
| TR-MOD-03 | `license_status = 'pending'` | `license_status = 'approved'` | Admin role, merchant and shop exist |
| TR-MOD-04 | `license_status = 'pending'` | `license_status = 'rejected'` | Admin role, merchant and shop exist |

```typescript
function transitionMerchantState(merchant: Merchant, status: MerchantStatus): boolean {
  if (status === 'rejected') {
    if (merchant.licenseStatus === 'rejected') return false; // Already rejected (409)
    merchant.licenseStatus = 'rejected';
  } else if (status === 'approved') {
    if (merchant.licenseStatus === 'approved') return false; // Already approved (409)
    merchant.licenseStatus = 'approved';
  }
  return true;
}
```

### 3.3 Product State Machine

| Transition | Origin | Target | Guard Conditions |
|------------|--------|--------|------------------|
| TR-MOD-05 | `is_active = true` | `is_active = false` | Admin role, product exists |
| TR-MOD-06 | `is_active = false` | `is_active = true` | Admin role, product exists |

```typescript
function transitionProductState(product: Product, isActive: boolean): boolean {
  if (!isActive) {
    if (!product.isActive) return false; // Already inactive (409)
    product.isActive = false;
  } else {
    if (product.isActive) return false; // Already active (409)
    product.isActive = true;
  }
  return true;
}
```

### 3.4 User State Machine

| Transition | Origin | Target | Guard Conditions |
|------------|--------|--------|------------------|
| TR-MOD-07 | `is_active = true` | `is_active = false` | Admin role, user exists, not self-deactivation |
| TR-MOD-08 | `is_active = false` | `is_active = true` | Admin role, user exists |

```typescript
function transitionUserState(user: User, adminId: string, isActive: boolean): boolean {
  if (!isActive) {
    if (user.id === adminId) return false; // Self-deactivation prevented (400)
    if (!user.isActive) return false; // Already inactive (409)
    user.isActive = false;
  } else {
    if (user.isActive) return false; // Already active (409)
    user.isActive = true;
  }
  return true;
}
```

### 3.5 Report State Machine

| Transition | Origin | Target | Guard Conditions |
|------------|--------|--------|------------------|
| TR-MOD-09 | `status = 'pending'` | `status = 'reviewed'` | Admin role, report exists |
| TR-MOD-10 | `status = 'pending'` or `'reviewed'` | `status = 'resolved'` | Admin role, report exists |
| TR-MOD-11 | `status = 'pending'` or `'reviewed'` | `status = 'rejected'` | Admin role, report exists |
| TR-MOD-12 | `status = 'pending'` or `'rejected'` | Deleted | Admin role, report exists, not resolved |

```typescript
function transitionReportState(report: Report, status: ReportAction): boolean {
  if (report.status === 'resolved') return false; // Already resolved (409)
  if (status === 'reviewed') {
    if (report.status !== 'pending') return false; // Only pending ↁEreviewed (409)
    report.status = 'reviewed';
  } else if (status === 'resolved') {
    if (report.status !== 'pending' && report.status !== 'reviewed') return false; // Only pending/reviewed ↁEresolved (409)
    report.status = 'resolved';
  } else if (status === 'rejected') {
    if (report.status !== 'pending' && report.status !== 'reviewed') return false; // Only pending/reviewed ↁErejected (409)
    report.status = 'rejected';
  }
  return true;
}

function canDeleteReport(report: Report): boolean {
  return report.status !== 'resolved'; // Resolved reports cannot be deleted
}
```

---

## 4. Product Statistics Recalculation

### 4.1 Recalculate After Review Change

```typescript
async recalculateProductStats(productId: string): Promise<void> {
  const result = await this.prisma.$queryRaw`
    SELECT 
      COALESCE(AVG(rating), 0) as avg_rating,
      COUNT(*) as review_count
    FROM reviews 
    WHERE product_id = ${productId} 
    AND is_approved = true
  `;

  await this.prisma.products.update({
    where: { id: productId },
    data: {
      avgRating: result.avg_rating,
      reviewCount: result.review_count,
    },
  });
}
```

### 4.2 Trigger Points

| Action | Recalculation Required |
|--------|----------------------|
| Review approved | Yes  Eproduct `avg_rating` and `review_count` |
| Review rejected | Yes  Eproduct `avg_rating` and `review_count` |
| Review deleted | Yes  Eproduct `avg_rating` and `review_count` |
| Report resolved (auto-rejects review) | Yes  Eproduct `avg_rating` and `review_count` |
| Merchant rejected | No  Eproducts deactivated, but stats unchanged |
| Product deactivated | No  Eproduct hidden, stats preserved |
| Product reactivated | No  Eproduct restored, stats preserved |
| User deactivated | No  Euser hidden, reviews preserved |

---

## 5. Cache Invalidation Logic

### 5.1 Product Cache Invalidation

```typescript
async invalidateProductCache(productId: string): Promise<void> {
  // Delete specific product cache
  await this.redis.del(`cache:product:${productId}`);
  
  // Delete all product list caches (pattern-based)
  const keys = await this.redis.keys('cache:products:list:*');
  if (keys.length > 0) {
    await this.redis.del(...keys);
  }
}
```

### 5.2 User Profile Cache Invalidation

```typescript
async invalidateUserCache(userId: string): Promise<void> {
  await this.redis.del(`cache:user:${userId}`);
  await this.redis.del(`cache:user:profile:${userId}`);
}
```

### 5.3 When Invalidation Occurs

| Action | Cache Invalidated |
|--------|-------------------|
| Review approved/rejected | `cache:product:{id}`, `cache:products:list:*` |
| Review deleted | `cache:product:{id}`, `cache:products:list:*` |
| Product deactivated/reactivated | `cache:product:{id}`, `cache:products:list:*` |
| Merchant rejected (products deactivated) | `cache:product:{id}` for each product, `cache:products:list:*` |
| User deactivated/reactivated | `cache:user:{id}`, `cache:user:profile:{id}` |

---

## 6. Audit Logging Logic

### 6.1 Audit Log Structure

```typescript
interface AuditLogEntry {
  id: string;           // UUID
  adminId: string;      // Who performed the action
  action: string;       // Event type
  targetType: string;   // 'review' | 'merchant' | 'product' | 'user' | 'report'
  targetId: string;     // ID of the affected record
  details: Record<string, any>; // Additional context
  timestamp: Date;      // When the action occurred
}
```

### 6.2 Audit Log Events

| Event | Details Captured | Retention |
|-------|------------------|-----------|
| `REVIEW_APPROVED` | adminId, reviewId, productId, timestamp | 2 years |
| `REVIEW_REJECTED` | adminId, reviewId, productId, reason, timestamp | 2 years |
| `REVIEW_DELETED` | adminId, reviewId, productId, timestamp | 2 years |
| `MERCHANT_APPROVED` | adminId, merchantId, shopId, timestamp | 2 years |
| `MERCHANT_REJECTED` | adminId, merchantId, shopId, reason, timestamp | 2 years |
| `PRODUCT_DEACTIVATED` | adminId, productId, reason, timestamp | 2 years |
| `PRODUCT_REACTIVATED` | adminId, productId, timestamp | 2 years |
| `USER_DEACTIVATED` | adminId, userId, timestamp | 2 years |
| `USER_ACTIVATED` | adminId, userId, timestamp | 2 years |
| `REPORT_REJECTED` | adminId, reportId, reviewId, timestamp | 2 years |
| `REPORT_RESOLVED` | adminId, reportId, reviewId, timestamp | 2 years |
| `REPORT_CREATED` | adminId, reviewId, reason, timestamp | 2 years |
| `REPORT_DELETED` | adminId, reportId, timestamp | 2 years |
| `RBAC_VIOLATION` | userId, endpoint, requiredRole, timestamp | 30 days |

### 6.3 Audit Interceptor

```typescript
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const adminId = request.user?.id;
    const action = this.getDecoratorValue(context, 'AuditAction');
    const targetType = this.getDecoratorValue(context, 'AuditTarget');

    return next.handle().pipe(
      tap(async (response) => {
        if (action && adminId) {
          await this.auditService.log({
            adminId,
            action,
            targetType,
            targetId: response?.data?.id,
            details: response?.data,
            timestamp: new Date(),
          });
        }
      }),
    );
  }
}
```

---

## 7. Notification Logic

### 7.1 Website Notification on Merchant Status Change

```typescript
async createMerchantStatusNotification(
  userId: string,
  status: 'approved' | 'rejected',
  shopName: string,
  rejectionReason?: string,
): Promise<void> {
  const message = status === 'approved'
    ? `Your shop "${shopName}" has been approved. You can now list products.`
    : `Your shop "${shopName}" has been rejected. ${rejectionReason || ''}`;

  await this.prisma.notifications.create({
    data: {
      userId,
      type: 'MERCHANT_STATUS_CHANGED',
      title: `Merchant ${status === 'approved' ? 'Approved' : 'Rejected'}`,
      message,
      metadata: { shopName, status, rejectionReason },
    },
  });
}
```

### 7.2 Notification Events

| Event | Recipients | Trigger |
|-------|------------|---------|
| `REVIEW_STATUS_CHANGED` | Review author, Product merchant | Admin approves/rejects review |
| `MERCHANT_STATUS_CHANGED` | Merchant user | Admin approves/rejects merchant |
| `CONTENT_REMOVED` | Product merchant | Admin deactivates product |
| `USER_STATUS_CHANGED` | Affected user | Admin activates/deactivates user |

---

## 8. Session Termination Logic

### 8.1 Revoke All User Tokens

```typescript
async revokeAllUserTokens(userId: string): Promise<void> {
  await this.prisma.refreshTokens.updateMany({
    where: { userId, isRevoked: false },
    data: { isRevoked: true },
  });
}
```

### 8.2 Trigger Points

| Action | Token Revocation |
|--------|------------------|
| User deactivated | Yes  Eall refresh tokens revoked |
| User reactivated | No  Etokens remain revoked, user must re-login |
| Admin logout | Yes  Ecurrent session tokens revoked |

---

## 9. Validation Rules

### 9.1 Review Moderation Validation

| Field | Rule | Error Message (EN) | Error Message (JA) |
|-------|------|--------------------|--------------------|
| `action` | Required, 'approve' or 'reject' | "Action must be 'approve' or 'reject'" | "アクションは'approve'また�E'reject'である忁E��がありまぁE |
| `reason` | Required when action = 'reject', required (TEXT, no max length) | "Rejection reason is required" | "却下理由は忁E��でぁE |

### 9.2 Merchant Moderation Validation

| Field | Rule | Error Message (EN) | Error Message (JA) |
|-------|------|--------------------|--------------------|
| `status` | Required, 'approved' or 'rejected' | "Status must be 'approved' or 'rejected'" | "スチE�Eタスは'approved'また�E'rejected'である忁E��がありまぁE |
| `reason` | Required when status = 'rejected', required (TEXT, no max length) | "Rejection reason is required" | "却下理由は忁E��でぁE |

### 9.3 Product Moderation Validation

| Field | Rule | Error Message (EN) | Error Message (JA) |
|-------|------|--------------------|--------------------|
| `isActive` | Required, boolean | "Active status must be a boolean" | "有効スチE�Eタスはブ�Eル値である忁E��がありまぁE |
| `reason` | Required when isActive = false, required (TEXT, no max length) | "Deactivation reason is required" | "無効化理由は忁E��でぁE |

### 9.4 User Moderation Validation

| Field | Rule | Error Message (EN) | Error Message (JA) |
|-------|------|--------------------|--------------------|
| `isActive` | Required, boolean | "Active status must be a boolean" | "有効スチE�Eタスはブ�Eル値である忁E��がありまぁE |

### 9.5 Report Status Validation

| Field | Rule | Error Message (EN) | Error Message (JA) |
|-------|------|--------------------|--------------------|
| `status` | Required, 'rejected', 'reviewed', or 'resolved' | "Status must be 'rejected', 'reviewed', or 'resolved'" | "スチE�Eタスは'rejected'、Ereviewed'、また�E'resolver'である忁E��がありまぁE |
| `adminNote` | Optional, required (TEXT, no max length) |  E|  E|
|  E| Report must not be already resolved | "This report has already been resolved" | "こ�Eレポ�Eト�E既に解決済みでぁE |
|  E| Report must exist | "Report not found" | "レポ�Eトが見つかりません" |

### 9.6 Report Deletion Validation

| Field | Rule | Error Message (EN) | Error Message (JA) |
|-------|------|--------------------|--------------------|
|  E| Report must exist | "Report not found" | "レポ�Eトが見つかりません" |
|  E| Completed reports cannot be deleted | "Resolved reports cannot be deleted" | "解決済みレポ�Eト�E削除できません" |

---

## 10. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_MOD_03](./DD_ReviewContent_Moderation_03_API_ENDPOINTS.md) | Endpoint routing to these methods |
| [DD_MOD_04](./DD_ReviewContent_Moderation_04_DTOS_AND_TYPES.md) | DTO definitions used in validation |
| [DD_MOD_06](./DD_ReviewContent_Moderation_06_TEST_SPEC.md) | Test specification |
| [機�E設計書_Review_Content_Moderation](../機�E設計書_Review_Content_Moderation.md) | Full functional specification |
| [画面頁E��設計書_Review_Content_Moderation](../画面頁E��設計書_Review_Content_Moderation.md) | Screen items specification |
