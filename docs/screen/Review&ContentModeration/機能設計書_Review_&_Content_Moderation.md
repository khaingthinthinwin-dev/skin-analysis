# 機能設計書 - レビュー＆コンテンツ管理 (Review & Content Moderation)

---

## Document Control (ドキュメント管理)

| Attribute | Value |
| :--- | :--- |
| **Document ID** | SKM-FDS-RCM-001 |
| **System** | Cosmetics Finder |
| **Phase** | Functional Design |
| **Version** | 1.0 |
| **Created** | 2026-08-05 |
| **Last Updated** | 2026-08-05 |
| **Author** | Software Architect |
| **Status** | Released (承認済み) |

### Document Revision History

| Version | Date | Author | Description of Changes |
| :--- | :--- | :--- | :--- |
| 1.0 | 2026-08-05 | Software Architect | Initial functional design (新規作成) |

---

## Table of Contents (目次)

1. [Overview](#1-overview)
2. [User Roles & Permissions](#2-user-roles--permissions)
3. [Functional Requirements](#3-functional-requirements)
4. [API Endpoints](#4-api-endpoints)
5. [UI Specifications](#5-ui-specifications)
6. [Business Rules](#6-business-rules)
7. [Data Model](#7-data-model)
8. [Error Handling](#8-error-handling)
9. [Non-Functional Requirements](#9-non-functional-requirements)

---

## 1. Overview

### 1.1 Purpose (目的)

This document defines the functional specifications for the Review Moderation and Content Moderation features within the Cosmetics Finder platform. These features enable platform administrators to maintain content quality, enforce community guidelines, and ensure a safe marketplace environment.

### 1.2 Scope (範囲)

- **Review Moderation:** Admin management of product reviews (approve, reject, delete)
- **Content Moderation:** Admin management of product listings and merchant registrations
- **Reporting System:** User-initiated content reports for admin review

### 1.3 Related Requirements (関連要件)

| Requirement ID | Description |
|---------------|-------------|
| A-REV-001 | Admin can view all reviews |
| A-REV-002 | Admin can approve/reject reviews |
| A-REV-003 | Admin can delete inappropriate reviews |
| A-REV-004 | Admin can view review reports from users |
| A-CONT-001 | Admin can review new product listings |
| A-CONT-002 | Admin can approve/reject merchant registrations |
| A-CONT-003 | Admin can manage categories (add/edit/delete) |
| A-CONT-004 | Admin can remove violating content |

---

## 2. User Roles & Permissions

### 2.1 Role Matrix (ロールマトリクス)

| Feature | Buyer | Merchant | Admin |
|---------|:-----:|:--------:|:-----:|
| View own reviews | ✅ | - | ✅ |
| Write reviews | ✅ | ❌ | ❌ |
| Report content | ✅ | ✅ | ✅ |
| View all reviews | ❌ | ❌ | ✅ |
| Approve/reject reviews | ❌ | ❌ | ✅ |
| Delete reviews | ❌ | ❌ | ✅ |
| View reports | ❌ | ❌ | ✅ |
| Review product listings | ❌ | ❌ | ✅ |
| Approve/reject products | ❌ | ❌ | ✅ |
| Approve merchant shops | ❌ | ❌ | ✅ |
| Manage categories | ❌ | ❌ | ✅ |
| Remove violating content | ❌ | ❌ | ✅ |

---

## 3. Functional Requirements

### 3.1 Review Moderation (レビュー管理)

#### 3.1.1 Review List View (レビュー一覧表示)

| ID | Requirement | Priority |
|----|-------------|----------|
| RM-001 | Admin can view all reviews across the platform | High |
| RM-002 | Reviews can be filtered by status (pending, approved, rejected) | High |
| RM-003 | Reviews can be filtered by product, merchant, or user | Medium |
| RM-004 | Reviews can be sorted by date, rating, or status | High |
| RM-005 | Pagination with 20 items per page default | High |
| RM-006 | Search reviews by keyword in title/body | Medium |
| RM-007 | Display review count by status in header | Medium |

#### 3.1.2 Review Moderation Actions (レビュー管理アクション)

| ID | Requirement | Priority |
|----|-------------|----------|
| RM-010 | Admin can approve a pending review | High |
| RM-011 | Admin can reject a review with optional reason | High |
| RM-012 | Admin can delete a review (soft delete) | High |
| RM-013 | Admin can bulk approve multiple reviews | Medium |
| RM-014 | Admin can bulk reject multiple reviews | Medium |
| RM-015 | Admin can view review change history | Low |
| RM-016 | Moderation actions are logged for audit | High |

#### 3.1.3 Review Detail View (レビュー詳細表示)

| ID | Requirement | Priority |
|----|-------------|----------|
| RM-020 | Display full review content (title, body, images) | High |
| RM-021 | Display review metadata (author, date, product) | High |
| RM-022 | Display verified purchase status | High |
| RM-023 | Display current moderation status | High |
| RM-024 | Show user's other reviews (for pattern detection) | Medium |
| RM-025 | Show product's other reviews | Medium |

### 3.2 Content Moderation (コンテンツ管理)

#### 3.2.1 Product Listing Review (商品リスト審査)

| ID | Requirement | Priority |
|----|-------------|----------|
| CM-001 | Admin can view pending product approvals | High |
| CM-002 | Admin can approve product for listing | High |
| CM-003 | Admin can reject product with reason | High |
| CM-004 | Admin can request product modification | Medium |
| CM-005 | Product requires admin approval before going live | High |
| CM-006 | Rejected products can be resubmitted after edits | Medium |

#### 3.2.2 Merchant Registration Approval (出品者登録承認)

| ID | Requirement | Priority |
|----|-------------|----------|
| CM-010 | Admin can view pending merchant registrations | High |
| CM-011 | Admin can approve merchant registration | High |
| CM-012 | Admin can reject merchant with reason | High |
| CM-013 | Merchant shop inactive until approved | High |
| CM-014 | Admin can view merchant's submitted information | High |
| CM-015 | Approval notification sent to merchant | Medium |

#### 3.2.3 Category Management (カテゴリ管理)

| ID | Requirement | Priority |
|----|-------------|----------|
| CM-020 | Admin can create new categories | High |
| CM-021 | Admin can edit existing categories | High |
| CM-022 | Admin can delete categories (if no products) | High |
| CM-023 | Categories support hierarchical tree structure | High |
| CM-024 | Category slug auto-generated from name | High |
| CM-025 | Category sort order configurable | Medium |

#### 3.2.4 Content Violation Management (コンテンツ違反管理)

| ID | Requirement | Priority |
|----|-------------|----------|
| CM-030 | Admin can remove violating content immediately | High |
| CM-031 | Admin can issue warnings to users | Medium |
| CM-032 | Admin can suspend user accounts | High |
| CM-033 | Content violation reasons logged | High |
| CM-034 | User notified of content removal | Medium |

### 3.3 User Reporting System (ユーザー報告システム)

#### 3.3.1 Report Submission (報告提出)

| ID | Requirement | Priority |
|----|-------------|----------|
| UR-001 | User can report reviews for violations | High |
| UR-002 | User can report product listings for violations | High |
| UR-003 | User can select violation reason from predefined list | High |
| UR-004 | User can add optional description | Medium |
| UR-005 | Duplicate reports from same user prevented | Medium |
| UR-006 | Report confirmation shown to user | High |

#### 3.3.2 Report Management (報告管理)

| ID | Requirement | Priority |
|----|-------------|----------|
| UR-010 | Admin can view all reports | High |
| UR-011 | Reports can be filtered by type (review, product, user) | High |
| UR-012 | Reports can be filtered by status (pending, resolved, dismissed) | High |
| UR-013 | Admin can resolve report with action taken | High |
| UR-014 | Admin can dismiss report | Medium |
| UR-015 | Reporter notified of resolution | Medium |

---

## 4. API Endpoints

### 4.1 Admin Review Management (管理者レビュー管理)

```
/api/v1/admin/reviews
├── GET    /                    # List all reviews (with filters)
├── GET    /pending             # List pending reviews
├── GET    /:id                 # Get review detail
├── POST   /:id/approve         # Approve review
├── POST   /:id/reject          # Reject review
├── DELETE /:id                 # Delete review
└── POST   /bulk-moderate       # Bulk moderation actions
```

#### 4.1.1 List All Reviews

**GET /api/v1/admin/reviews**

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page (max 100) |
| `status` | string | - | Filter: `pending`, `approved`, `rejected` |
| `productId` | string | - | Filter by product ID |
| `userId` | string | - | Filter by reviewer ID |
| `rating` | integer | - | Filter by rating (1-5) |
| `sort` | string | `createdAt` | Sort field |
| `order` | string | `desc` | Sort direction |
| `search` | string | - | Search in title/body |

**Response (200):**

```json
{
  "data": [
    {
      "id": "clx1234567890",
      "user": {
        "id": "clx0987654321",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "product": {
        "id": "clx1122334455",
        "name": "Gentle Foaming Cleanser",
        "merchant": {
          "id": "clx5566778899",
          "name": "Beauty Shop"
        }
      },
      "rating": 4,
      "title": "Great product!",
      "body": "Really effective for my skin type...",
      "images": ["https://example.com/review-1.jpg"],
      "isVerifiedPurchase": true,
      "isApproved": true,
      "createdAt": "2026-08-01T10:00:00.000Z",
      "updatedAt": "2026-08-01T10:00:00.000Z"
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

#### 4.1.2 Approve Review

**POST /api/v1/admin/reviews/:id/approve**

**Response (200):**

```json
{
  "data": {
    "id": "clx1234567890",
    "isApproved": true,
    "updatedAt": "2026-08-05T12:00:00.000Z"
  }
}
```

#### 4.1.3 Reject Review

**POST /api/v1/admin/reviews/:id/reject**

**Request Body:**

```json
{
  "reason": "Violates community guidelines",
  "details": "Contains inappropriate language"
}
```

**Response (200):**

```json
{
  "data": {
    "id": "clx1234567890",
    "isApproved": false,
    "moderationReason": "Violates community guidelines",
    "updatedAt": "2026-08-05T12:00:00.000Z"
  }
}
```

#### 4.1.4 Bulk Moderation

**POST /api/v1/admin/reviews/bulk-moderate**

**Request Body:**

```json
{
  "reviewIds": ["clx1234567890", "clx0987654321"],
  "action": "approve",
  "reason": null
}
```

**Response (200):**

```json
{
  "data": {
    "processed": 2,
    "failed": 0
  }
}
```

### 4.2 Admin Content Management (管理者コンテンツ管理)

```
/api/v1/admin/content
├── GET    /products/pending     # List pending products
├── POST   /products/:id/approve # Approve product
├── POST   /products/:id/reject  # Reject product
├── GET    /merchants/pending    # List pending merchants
├── POST   /merchants/:id/approve # Approve merchant
├── POST   /merchants/:id/reject  # Reject merchant
├── POST   /categories           # Create category
├── PATCH  /categories/:id       # Update category
└── DELETE /categories/:id       # Delete category
```

### 4.3 User Reports (ユーザー報告)

```
/api/v1/reports
├── POST   /                     # Submit report
├── GET    /                     # List reports (admin only)
├── GET    /:id                  # Get report detail (admin only)
├── POST   /:id/resolve          # Resolve report (admin only)
└── POST   /:id/dismiss          # Dismiss report (admin only)
```

---

## 5. UI Specifications

### 5.1 Admin Review Management Page

```
┌─────────────────────────────────────────────────────────────────┐
│  Review Moderation                                     [Export] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Filters:                                                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │ Status: All │ │ Product: All│ │ Rating: All │ [Search]     │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
│                                                                 │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                          │
│  │All   │ │Pending│ │Approved│ │Rejected│                      │
│  │ 150  │ │  23  │ │  115  │ │  12  │                          │
│  └──────┘ └──────┘ └──────┘ └──────┘                          │
│                                                                 │
│  ☐ Select All                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ☐ │ Rating │ Product        │ Author      │ Date    │ Act│   │
│  ├───┼────────┼────────────────┼─────────────┼─────────┼────│   │
│  │ ☐ │ ★★★★☆ │ Cleanser       │ John Doe    │ Aug 1  │ ✅❌│   │
│  │ ☐ │ ★★☆☆☆ │ Moisturizer    │ Jane Smith  │ Aug 2  │ ✅❌│   │
│  │ ☐ │ ★★★★★ │ Sunscreen      │ Bob Wilson  │ Aug 3  │ ✅❌│   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Bulk Approve] [Bulk Reject]          Page 1 of 8 [Next →]   │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Review Detail Modal

```
┌─────────────────────────────────────────────────────────────────┐
│  Review Detail                                           [Close]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Product: Gentle Foaming Cleanser                               │
│  Author: John Doe (john@example.com)                            │
│  Date: August 1, 2026                                           │
│  Status: Pending │ Verified Purchase: ✅                        │
│                                                                 │
│  Rating: ★★★★☆ (4/5)                                          │
│                                                                 │
│  Title: Great product!                                          │
│  ─────────────────────────────────────────────────────────────  │
│  Body:                                                          │
│  Really effective for my skin type. I've been using it for      │
│  two weeks and already see improvements. The texture is         │
│  gentle and doesn't dry out my skin.                           │
│                                                                 │
│  Images:                                                        │
│  ┌──────────┐ ┌──────────┐                                     │
│  │ 📷 img1  │ │ 📷 img2  │                                     │
│  └──────────┘ └──────────┘                                     │
│                                                                 │
│  Author's Other Reviews: 12 reviews │ Avg Rating: 4.2         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Moderation Notes                                        │   │
│  │ [Text area for admin notes]                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Approve] [Reject] [Delete] [Cancel]                          │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Pending Products Queue

```
┌─────────────────────────────────────────────────────────────────┐
│  Pending Product Approvals                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Product: Vitamin C Serum                                │   │
│  │ Merchant: Beauty Shop                                   │   │
│  │ Submitted: Aug 3, 2026                                  │   │
│  │ Category: Skincare > Serums                             │   │
│  │ Price: $39.99                                           │   │
│  │                                                         │   │
│  │ Images: [img1] [img2] [img3]                            │   │
│  │                                                         │   │
│  │ Description: Advanced Vitamin C serum for brightening...│   │
│  │                                                         │   │
│  │ [View Full Details] [Approve] [Reject] [Request Edit]   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Product: Hydrating Face Mask                            │   │
│  │ Merchant: Skincare Pro                                  │   │
│  │ Submitted: Aug 4, 2026                                  │   │
│  │ Category: Skincare > Masks                              │   │
│  │ Price: $24.99                                           │   │
│  │                                                         │   │
│  │ [View Full Details] [Approve] [Reject] [Request Edit]   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 5.4 Pending Merchant Approvals

```
┌─────────────────────────────────────────────────────────────────┐
│  Pending Merchant Registrations                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Shop: Organic Beauty Store                              │   │
│  │ Owner: Jane Smith (jane@organic.com)                    │   │
│  │ Submitted: Aug 2, 2026                                  │   │
│  │                                                         │   │
│  │ Description: Premium organic skincare products...        │   │
│  │ Address: 123 Main St, Tokyo, Japan                      │   │
│  │ Phone: +81-90-1234-5678                                 │   │
│  │                                                         │   │
│  │ Documents: [Business License] [Tax Certificate]         │   │
│  │                                                         │   │
│  │ [View Profile] [Approve] [Reject]                       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 5.5 User Report Submission Dialog

```
┌─────────────────────────────────────────────────────────────────┐
│  Report Content                                          [Close]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  What are you reporting?                                        │
│  ○ This review violates community guidelines                   │
│  ○ This product listing is inaccurate                          │
│  ○ This is spam or fake content                                │
│  ○ This contains inappropriate language                        │
│  ○ Other                                                       │
│                                                                 │
│  Additional details (optional):                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Cancel] [Submit Report]                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Business Rules

### 6.1 Review Moderation Rules (レビュ管理ルール)

#### Rule 6.1.1: Review Approval Workflow

```
Review Created (is_approved = true by default)
    │
    ├─── Report Received ──→ Review Flagged (is_approved = false)
    │                              │
    │                              ├─── Admin Approves ──→ Review Published
    │                              │
    │                              └─── Admin Rejects ──→ Review Hidden
    │
    └─── No Reports ──→ Review Remains Published
```

#### Rule 6.1.2: Review Eligibility

- Only users with verified purchase can write reviews (is_verified_purchase flag)
- One review per user per product (unique constraint: user_id, product_id)
- Reviews are approved by default but can be moderated by admin
- Reviews with reports are automatically flagged for moderation

#### Rule 6.1.3: Review Content Validation

| Rule | Description |
|------|-------------|
| Rating | Must be between 1 and 5 (inclusive) |
| Title | Optional, max 255 characters |
| Body | Optional, max 5000 characters |
| Images | Max 5 images per review, 5MB each |

### 6.2 Content Moderation Rules (コンテンツ管理ルール)

#### Rule 6.2.1: Product Approval Workflow

```
Product Created (is_active = false)
    │
    └─── Admin Review ──→ Approval Decision
                              │
                              ├─── Approve ──→ Product Active (is_active = true)
                              │
                              ├─── Reject ──→ Product Rejected (with reason)
                              │
                              └─── Request Edit ──→ Merchant Notified
```

#### Rule 6.2.2: Merchant Shop Approval

- New merchant shops require admin approval before going live
- Shops are inactive until approved (is_approved = false)
- Admin can reject shops with reason
- Merchant can resubmit after addressing rejection reason

### 6.3 Category Management Rules (カテゴリ管理ルール)

#### Rule 6.3.1: Category Hierarchy

- Categories support tree structure (parent_id self-reference)
- Maximum depth: 3 levels (L1 > L2 > L3)
- Categories with products cannot be deleted (ON DELETE RESTRICT)
- Category slug must be unique and URL-friendly

#### Rule 6.3.2: Category Deletion

- Categories with products: Cannot delete (show error)
- Categories with subcategories: Cannot delete (show error)
- Empty categories: Can be deleted

### 6.4 Report Management Rules (報告管理ルール)

#### Rule 6.4.1: Report Submission

| Rule | Description |
|------|-------------|
| Duplicate prevention | One report per user per content item |
| Anonymous reports | Reporter identity hidden from reported user |
| Report resolution | Reporter notified of resolution action |
| Auto-flag threshold | Content with 3+ reports auto-flagged |

#### Rule 6.4.2: Violation Reasons

| Code | Reason | Description |
|------|--------|-------------|
| `spam` | Spam | Unsolicited commercial content |
| `fake` | Fake Review | Review not based on actual experience |
| `inappropriate` | Inappropriate Language | Contains offensive language |
| `misleading` | Misleading | Product description inaccurate |
| `harassment` | Harassment | Targeted harassment of individuals |
| `other` | Other | Other violation not listed |

---

## 7. Data Model

### 7.1 Review Moderation Fields

The following fields are added to the `reviews` table for moderation:

| Field | Type | Description |
|-------|------|-------------|
| `moderationReason` | TEXT | Reason for rejection (nullable) |
| `moderatedBy` | VARCHAR(25) | Admin user ID who performed moderation |
| `moderatedAt` | TIMESTAMPTZ | Timestamp of moderation action |
| `reportCount` | INTEGER | Number of reports received (default: 0) |

### 7.2 Content Reports Table

New table for user-submitted reports:

```sql
CREATE TABLE content_reports (
    id VARCHAR(25) PRIMARY KEY,
    reporter_id VARCHAR(25) NOT NULL,
    content_type VARCHAR(20) NOT NULL,
    content_id VARCHAR(25) NOT NULL,
    reason VARCHAR(50) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    resolved_by VARCHAR(25),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_content_reports_content_type 
        CHECK (content_type IN ('review', 'product', 'user')),
    CONSTRAINT chk_content_reports_status 
        CHECK (status IN ('pending', 'resolved', 'dismissed')),
    CONSTRAINT chk_content_reports_reason 
        CHECK (reason IN ('spam', 'fake', 'inappropriate', 'misleading', 'harassment', 'other')),
    CONSTRAINT fk_content_reports_reporter 
        FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_content_reports_resolved_by 
        FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);
```

### 7.3 Category Table Updates

Add sort_order field to categories:

```sql
ALTER TABLE categories 
ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX idx_categories_sort_order ON categories (sort_order);
```

### 7.4 Prisma Schema Updates

```prisma
model ContentReport {
  id              String    @id @default(cuid())
  reporterId      String    @map("reporter_id")
  contentType     String    @map("content_type")
  contentId       String    @map("content_id")
  reason          String
  description     String?
  status          String    @default("pending")
  resolvedBy      String?   @map("resolved_by")
  resolvedAt      DateTime? @map("resolved_at")
  resolutionNotes String?   @map("resolution_notes")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  reporter        User      @relation("ReportedContent", fields: [reporterId], references: [id], onDelete: Cascade)
  resolver        User?     @relation("ResolvedContent", fields: [resolvedBy], references: [id], onDelete: SetNull)

  @@index([reporterId])
  @@index([contentType, contentId])
  @@index([status])
  @@map("content_reports")
}

model Review {
  // ... existing fields ...
  moderationReason String?   @map("moderation_reason")
  moderatedBy      String?   @map("moderated_by")
  moderatedAt      DateTime? @map("moderated_at")
  reportCount      Int       @default(0) @map("report_count")
}
```

---

## 8. Error Handling

### 8.1 Error Response Format

```json
{
  "statusCode": 400,
  "message": ["Invalid moderation action"],
  "error": "Bad Request",
  "timestamp": "2026-08-05T12:00:00.000Z",
  "path": "/api/v1/admin/reviews/123/approve"
}
```

### 8.2 Common Error Scenarios

| Error Code | Scenario | HTTP Status |
|------------|----------|-------------|
| `REVIEW_NOT_FOUND` | Review ID doesn't exist | 404 |
| `ALREADY_MODERATED` | Review already approved/rejected | 409 |
| `UNAUTHORIZED_ACTION` | Non-admin attempting moderation | 403 |
| `REPORT_SELF` | User reporting own content | 400 |
| `DUPLICATE_REPORT` | User already reported this content | 409 |
| `CATEGORY_HAS_PRODUCTS` | Cannot delete category with products | 409 |
| `MERCHANT_NOT_PENDING` | Merchant already approved/rejected | 409 |

---

## 9. Non-Functional Requirements

### 9.1 Performance (パフォーマンス)

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-RCM-001 | Review list page load | ≤ 2 seconds |
| NFR-RCM-002 | Moderation action response | ≤ 500ms |
| NFR-RCM-003 | Bulk operations (100 items) | ≤ 5 seconds |

### 9.2 Security (セキュリティ)

| ID | Requirement | Description |
|----|-------------|-------------|
| NFR-RCM-010 | Admin-only access | All moderation endpoints require admin role |
| NFR-RCM-011 | Audit logging | All moderation actions logged with admin ID |
| NFR-RCM-012 | Rate limiting | Report submission limited to 10/hour per user |
| NFR-RCM-013 | Input validation | All moderation inputs validated via DTOs |

### 9.3 Data Integrity (データ整合性)

| ID | Requirement | Description |
|----|-------------|-------------|
| NFR-RCM-020 | Soft delete | Reviews and products soft-deleted (is_active flag) |
| NFR-RCM-021 | Cascade rules | Deleting user deletes their reports |
| NFR-RCM-022 | Transaction safety | Moderation actions in database transactions |

---

**Document Management (文書管理):**
- Author: Software Architect
- Created: 2026-08-05
- Last Updated: 2026-08-05
- Next Review: Phase 2 Planning

---

*End of REVIEW_CONTENT_MODERATION.md*