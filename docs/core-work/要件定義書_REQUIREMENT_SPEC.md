# Cosmetics Finder 要件定義書

## Requirements Definition (要件定義)

---

## Document Control (ドキュメント管理)

| Attribute | Value |
| :--- | :--- |
| **Document ID** | SKM-REQ-001 |
| **System** | Cosmetics Finder |
| **Version** | 1.6 |
| **Created** | 2026-08-03 |
| **Last Updated** | 2026-08-17 |
| **Author** | Software Architect |
| **Status** | Released (承認済み) |

### Document Revision History

| Version | Date | Author | Description of Changes |
| :--- | :--- | :--- | :--- |
| 1.0 | 2026-08-03 | Software Architect | Initial requirements definition |
| 1.1 | 2026-08-10 | Software Architect | Added advertisement approval workflow, payment system, weekly ad limit, and announcement message requirements |
| 1.2 | 2026-08-14 | Software Architect | Added comprehensive merchant state management, product ownership rules, review validation, database schemas, API requirements, and database relationships from system specification |
| 1.3 | 2026-08-14 | Software Architect | Restricted shopping features (cart, wishlist, checkout) to Buyer role only; replaced email notifications with website notification system |
| 1.4 | 2026-08-14 | Software Architect | Updated all entity definitions to use UUID primary keys; added SQL schema for all entities; added merchant_id field to users table |
| 1.5 | 2026-08-14 | Software Architect | Removed duplicate order status flow section |
| 1.6 | 2026-08-17 | Software Architect | Added Commission Management (§3.2.19), Revenue Tracking (§3.2.20), Ad Fee Revenue (§3.2.21) requirements; added commission_settings, revenue_targets, payouts database schemas; added commission, revenue, payout, ad fee business rules (§4.8-4.11); added commission & revenue API endpoints; updated frontend route structure |

---

## Table of Contents (目次)

1. [Project Overview & Background](#1-project-overview--background)
2. [User Roles & Permissions](#2-user-roles--permissions)
3. [Functional Requirements](#3-functional-requirements)
4. [Special Business Rules](#4-special-business-rules)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [System Architecture Context](#6-system-architecture-context)

---

## 1. Project Overview & Background

### 1.1 Project Name (プロジェクト名)
**Cosmetics Finder**

### 1.2 Purpose & objectives (目的と目標)
The system provides the Cosmetics Finder platform that connects buyers seeking personalized skincare solutions with merchants selling skincare products. The platform features AI skin analysis, smart product recommendations, and a complete e-commerce workflow from browsing to checkout.

### 1.3 Business Context (ビジネス背景)
- **Problem Statement:** Consumers struggle to find skincare products suited to their individual skin types and concerns. Traditional e-commerce lacks personalization, leading to poor product choices and wasted spending.
- **Solution Approach:** Implement an AI-powered marketplace that analyzes user skin conditions and recommends personalized products, connecting buyers with suitable merchants.
- **Expected Outcomes:**
  - Personalized skincare product recommendations based on AI analysis
  - Increased conversion rates through targeted product matching
  - Merchant tools for product management and sales analytics
  - Platform growth through multi-vendor marketplace model

### 1.4 Project Scope (プロジェクト範囲)
- **Included:** User authentication/authorization, AI skin analysis, product management, shopping cart, checkout, order management, merchant dashboard, admin panel, multi-language support (EN/MY/JA)
- **Excluded:** Physical product delivery logistics, payment gateway integration (stubbed), mobile native apps, advanced ML model training

### 1.5 Technology Stack (技術スタック)

**Backend:**
- Runtime: Node.js v22+ (LTS)
- Framework: NestJS v11
- Language: TypeScript v5.7+
- ORM: Prisma v6
- Database: PostgreSQL v16
- Cache: Redis v7 (ioredis v6)
- Auth: JWT (access + refresh tokens), Argon2 password hashing
- API Docs: Swagger/OpenAPI v11

**Frontend:**
- UI Library: React v19
- Bundler: Vite v6
- Language: TypeScript v5.7+ (strict)
- Routing: React Router v7
- State: TanStack Query v5
- Forms: React Hook Form + Zod
- UI Components: shadcn/ui (Radix UI)
- Styling: Tailwind CSS v4
- i18n: i18next (English, Myanmar, Japanese)
- Testing: Vitest, Testing Library, MSW v2

---

## 2. User Roles & Permissions

### 2.0 Guest / Unauthorized User Rules (未認証ユーザールール)

#### Allowed Actions
- View Home Page without login
- Browse public product listings
- Search products by keyword
- Filter products (category, price, rating)
- View product detail pages
- View public shop profiles and locations
- View advertisements displayed on storefront
- View product reviews (read only)

#### Restricted Actions (Trigger Redirect to Login)

| Action | Behavior |
|--------|----------|
| Add to Cart | Show alert modal with login button → redirect to `/login` |
| Add to Wishlist | Show alert modal with login button → redirect to `/login` |
| AI Skin Analysis | Redirect to `/register` |
| Checkout & Payment | Redirect to `/login` |
| Write Reviews | Redirect to `/login` |
| View Order History | Redirect to `/login` |
| Chat with Merchant | Redirect to `/login` |
| Order Tracking | Redirect to `/login` |

#### Implementation Notes
- All restricted actions must check `req.user` or equivalent auth state before executing
- Alert modal must NOT dismiss without user action (no auto-close)
- Redirect URL should include `?redirect=<original_path>` for post-login navigation
- Public routes must not expose any private user data or session tokens

### 2.1 User Roles Overview (ユーザーロール概要)

| Role | Japanese Name | Primary Responsibility | Key Permissions |
|------|---------------|----------------------|-----------------|
| **Buyer** | 購入者 | Browse products, AI analysis, purchase | • Register/login<br>• AI skin analysis<br>• Browse/search products<br>• Add to cart/wishlist<br>• Checkout & payment<br>• Write reviews<br>• View order history |
| **Merchant** | 出品者 | Sell skincare products | • Register/login<br>• Browse products<br>• Manage products (CRUD)<br>• Manage shop profile<br>• Create promotions/coupons<br>• Manage advertisements<br>• View sales dashboard<br>• View analytics |
| **Admin** | 管理者 | Platform management | • Register/login<br>• User management<br>• Merchant approval<br>• Review moderation<br>• Content moderation<br>• Analytics & reports<br>• Revenue & commission management |

### 2.2 Role-Based Access Control (RBAC) (ロールベースアクセス制御)

**Permission Matrix:**

| Feature | Buyer | Merchant | Admin |
|---------|:-----:|:--------:|:-----:|
| **User Management** | | | |
| Register/Login | ✅ | ✅ | ✅ |
| View/Edit Own Profile | ✅ | ✅ | ✅ |
| Manage Users | ❌ | ❌ | ✅ |
| **Product Management** | | | |
| Browse Products | ✅ | ✅ | ✅ |
| Search/Filter Products | ✅ | ✅ | ✅ |
| View Product Details | ✅ | ✅ | ✅ |
| Create/Edit Products | ❌ | ✅ | ✅ |
| Delete Products | ❌ | ✅ | ✅ |
| **AI Skin Analysis** | | | |
| Upload Photo | ✅ | ❌ | ❌ |
| View Analysis Results | ✅ | ❌ | ❌ |
| View Recommendations | ✅ | ❌ | ❌ |
| **Shopping** | | | |
| Add to Cart | ✅ | ❌ | ❌ |
| Manage Cart | ✅ | ❌ | ❌ |
| Checkout | ✅ | ❌ | ❌ |
| View Orders | ✅ | ❌ | ❌ |
| **Wishlist** | | | |
| Add/Remove Wishlist | ✅ | ❌ | ❌ |
| View Wishlist | ✅ | ❌ | ❌ |
| **Reviews** | | | |
| Write Reviews | ✅ | ❌ | ❌ |
| View Reviews | ✅ | ✅ | ✅ |
| Moderate Reviews | ❌ | ❌ | ✅ |
| **Merchant Features** | | | |
| Manage Shop Profile | ❌ | ✅ | ✅ |
| View Sales Dashboard | ❌ | ✅ | ✅ |
| Create Promotions | ❌ | ✅ | ✅ |
| Manage Advertisements | ❌ | ✅ | ✅ |
| View Analytics | ❌ | ✅ | ✅ |
| **Admin Features** | | | |
| Approve Merchants | ❌ | ❌ | ✅ |
| Moderate Content | ❌ | ❌ | ✅ |
| Revenue Tracking | ❌ | ❌ | ✅ |
| Commission Management | ❌ | ❌ | ✅ |

### 2.3 Buyer / Authorized User Rules (認証済み購入者ルール)

#### Authentication Requirements
- Must be logged in with valid JWT/session token
- Account status must be `active` (not `inactive` or `banned`)
- Email verification required before accessing full features

#### Allowed Actions
- Full product browsing and search
- AI Skin Analysis (photo upload and results)
- Personalized product recommendations
- **Shopping features (Buyer only):**
  - Wishlist management (add/remove/move to cart)
  - Cart management (add/remove/update quantity)
  - Checkout and payment processing
  - Order placement and tracking
- Write reviews for purchased products
- Manage own profile
- Chat with merchants (future feature)
- Request password reset
- Request forget password

#### Buyer-Specific Validations
- Profile must include skin type and concerns for AI features
- Photo upload: JPG, PNG, WebP only, max 10MB
- Only one review per customer per product
- Reviews allowed only after confirmed product arrival
- Coupon codes validated at checkout (expiry, minimum amount, single use)

#### Shopping Restriction
- **Merchant and Admin users CANNOT access shopping features**
- Cart, wishlist, checkout, and order features are restricted to Buyer role only
- Attempting restricted actions returns `403 Forbidden` with message: "Shopping features are only available to buyers"

#### Session Management
- JWT token expiry: 24 hours
- Refresh token expiry: 7 days
- Invalid/expired tokens return `401 Unauthorized`

### 2.4 Merchant Rules (出品者ルール)

#### Merchant Allowed Actions
- Register/login
- Browse and search products (view only)
- View product details
- Manage own products (CRUD)
- Manage shop profile
- Create promotions/coupons
- Manage advertisements
- View sales dashboard and analytics
- View reviews (read only)
- Dispute management (report false/abusive reviews)

#### Merchant Restricted Actions
- **CANNOT access shopping features (cart, wishlist, checkout)**
- **CANNOT write reviews**
- **CANNOT use AI skin analysis**
- Attempting restricted actions returns `403 Forbidden` with message: "This feature is not available for merchant accounts"

### 2.5 Admin Rules (管理者ルール)

#### Admin Allowed Actions
- Register/login
- User management (view, toggle status)
- Merchant approval/rejection
- Review moderation (approve/reject/flag)
- Content moderation
- Advertisement management and approval
- Revenue and commission management
- Platform analytics and reports
- System configuration

#### Admin Restricted Actions
- **CANNOT access shopping features (cart, wishlist, checkout)**
- **CANNOT write reviews**
- **CANNOT use AI skin analysis**
- **CANNOT create/edit products (except for moderation purposes)**
- Attempting restricted actions returns `403 Forbidden` with message: "This feature is not available for admin accounts"

### 2.6 Merchant State Management (出品者ステート管理)

#### State Definitions

| State | Code | Description |
|-------|------|-------------|
| **Pending** | `pending` | Registration submitted, awaiting admin approval |
| **Approved** | `approved` | License verified, full access granted |
| **Rejected** | `rejected` | License denied, access blocked |

#### State Transitions

```
[New Registration]
       ↓
    PENDING ────────→ APPROVED
       ↓                  ↑
    REJECTED ─── Resubmit ┘
```

#### Pending State Rules
- Can login with email/password
- Can access merchant dashboard
- Can view and edit own profile
- Can view license status and rejection reason
- **CANNOT:** Create/edit/delete products
- **CANNOT:** Create promotions or coupons
- **CANNOT:** Create advertisements
- **CANNOT:** Access sales analytics
- **CANNOT:** Shop is not publicly visible
- **CANNOT:** Access shopping features (cart, wishlist, checkout)
- Attempting restricted actions returns `403 Forbidden` with message: "Your account is pending approval"

#### Approved State Rules
- Full access to all merchant features (except shopping)
- Shop publicly visible
- Products appear in search results
- Can create/manage products, promotions, advertisements
- Can view sales dashboard and analytics
- Can generate order invoices
- **CANNOT:** Access shopping features (cart, wishlist, checkout)

#### Rejected State Rules
- Can login with email/password
- See alert banner: "Your account has been rejected. Reason: [reason]"
- Can view rejection details
- Can resubmit license for review
- **CANNOT:** Access any merchant features
- **CANNOT:** Access shopping features (cart, wishlist, checkout)
- Attempting restricted actions returns `403 Forbidden` with message: "Your account has been rejected"

### 2.7 Strict APPROVED-Only Merchant Feature Gate

#### Implementation Rule
All merchant-specific features MUST check `merchant.license_status === 'approved'` before allowing access.

#### Middleware / Guard Logic
```typescript
// Pseudocode for merchant feature guard
function requireApprovedMerchant(req, res, next) {
  const merchant = getMerchantByUserId(req.user.id);
  
  if (!merchant) {
    return res.status(403).json({ 
      error: 'MERCHANT_NOT_FOUND',
      message: 'You must register as a merchant first' 
    });
  }
  
  if (merchant.license_status !== 'approved') {
    return res.status(403).json({ 
      error: 'MERCHANT_NOT_APPROVED',
      status: merchant.license_status,
      message: getStatusMessage(merchant.license_status) 
    });
  }
  
  next();
}
```

#### Shopping Feature Guard
```typescript
// Middleware to restrict shopping features to buyers only
function requireBuyerRole(req, res, next) {
  if (req.user.role !== 'buyer') {
    return res.status(403).json({ 
      error: 'SHOPPING_NOT_ALLOWED',
      message: 'Shopping features are only available to buyers' 
    });
  }
  next();
}
```

#### Protected Endpoints (Merchant Only)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/products` | POST | Create product |
| `/products/:id` | PATCH | Edit product |
| `/products/:id` | DELETE | Soft delete product |
| `/products/:id/stock` | PATCH | Update stock |
| `/promotions` | POST | Create promotion |
| `/promotions/:id` | PATCH | Edit promotion |
| `/promotions/:id` | DELETE | Delete promotion |
| `/ads` | POST | Create advertisement |
| `/ads/:id/pay` | POST | Pay ad fee |
| `/ads/:id/submit` | POST | Submit ad for approval |
| `/shops/merchant` | PATCH | Edit shop profile |
| `/analytics/merchant/dashboard` | GET | View dashboard |
| `/analytics/merchant/sales` | GET | View analytics |

#### Protected Endpoints (Buyer Only - Shopping)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/cart` | GET | View cart |
| `/cart/items` | POST | Add item to cart |
| `/cart/items/:id` | PATCH | Update cart item |
| `/cart/items/:id` | DELETE | Remove cart item |
| `/wishlist` | GET | View wishlist |
| `/wishlist/:productId` | POST | Add to wishlist |
| `/wishlist/:productId` | DELETE | Remove from wishlist |
| `/orders` | POST | Place order |
| `/orders` | GET | View order history |
| `/orders/:id` | GET | View order detail |
| `/checkout` | POST | Process checkout |

### 2.8 Product Ownership & 403 Authorization

#### Ownership Rules
- Products can only be created by `approved` merchants
- Each product is linked to exactly one merchant via `merchant_id`
- Only the owning merchant can edit/delete their own products
- Admin can view all products regardless of ownership

#### Authorization Check
```typescript
// Middleware for product ownership verification
function requireProductOwnership(req, res, next) {
  const product = getProductById(req.params.id);
  
  if (!product) {
    return res.status(404).json({ error: 'PRODUCT_NOT_FOUND' });
  }
  
  if (req.user.role === 'admin') {
    return next(); // Admin bypass
  }
  
  if (req.user.role !== 'merchant') {
    return res.status(403).json({ error: 'UNAUTHORIZED' });
  }
  
  const merchant = getMerchantByUserId(req.user.id);
  
  if (product.merchant_id !== merchant.id) {
    return res.status(403).json({ 
      error: 'PRODUCT_OWNERSHIP_REQUIRED',
      message: 'You can only manage your own products' 
    });
  }
  
  next();
}
```

#### 403 Error Responses
| Scenario | Error Code | Message |
|----------|------------|---------|
| Buyer tries to access merchant features | `UNAUTHORIZED_ROLE` | "You do not have merchant permissions" |
| Merchant/Admin tries to access shopping features | `SHOPPING_NOT_ALLOWED` | "Shopping features are only available to buyers" |
| Pending merchant tries to create product | `MERCHANT_NOT_APPROVED` | "Your account is pending approval" |
| Rejected merchant tries any merchant action | `MERCHANT_REJECTED` | "Your account has been rejected" |
| Merchant tries to edit another's product | `PRODUCT_OWNERSHIP_REQUIRED` | "You can only manage your own products" |
| Unauthorized user tries protected action | `AUTHENTICATION_REQUIRED` | "Please login to continue" |

### 2.9 Password Reset / Forgot Password

#### Flow
```
User clicks "Forgot Password"
    ↓
Enters email address
    ↓
System generates password reset token (6-digit code or link)
    ↓
Display website notification with reset code/link
    ↓
User enters code or clicks link
    ↓
User enters new password (min 8 chars, 1 uppercase, 1 number, 1 special char)
    ↓
Password updated, all existing sessions invalidated
    ↓
Redirect to login with success message
```

#### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Reset password with token |
| POST | `/auth/verify-reset-code` | Verify 6-digit code |

#### Security Rules
- Reset token expires after 15 minutes
- Maximum 3 reset requests per email per hour
- Reset code is 6 digits, valid for 10 minutes
- After successful reset, invalidate all existing sessions
- Log password reset events in audit trail

### 2.10 Website Notification System (ウェブサイト通知システム)

#### Notification Types
| Type | Trigger | Target User |
|------|---------|-------------|
| `merchant_approved` | Admin approves merchant registration | Merchant |
| `merchant_rejected` | Admin rejects merchant registration | Merchant |
| `order_placed` | Buyer places new order | Merchant |
| `order_status_changed` | Merchant updates order status | Buyer |
| `ad_approved` | Admin approves advertisement | Merchant |
| `ad_rejected` | Admin rejects advertisement | Merchant |
| `review_submitted` | Buyer writes product review | Merchant |
| `review_moderated` | Admin moderates review | Buyer |
| `password_reset` | User requests password reset | User (all roles) |
| `stock_low_warning` | Product stock below threshold | Merchant |
| `license_expiring` | Merchant license expiring soon | Merchant |

#### Notification Data Structure
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "type": "merchant_approved",
  "title": "Merchant Registration Approved",
  "message": "Your merchant registration has been approved. You can now access all merchant features.",
  "data": {
    "merchant_id": "uuid",
    "shop_name": "Beauty Shop"
  },
  "is_read": false,
  "created_at": "2026-08-14T10:30:00Z"
}
```

#### Notification Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications` | Get user notifications (paginated) |
| GET | `/notifications/unread-count` | Get unread notification count |
| PATCH | `/notifications/:id/read` | Mark notification as read |
| PATCH | `/notifications/read-all` | Mark all notifications as read |
| DELETE | `/notifications/:id` | Delete notification |

#### Notification Display Rules
- Notifications display in header as bell icon with unread count badge
- Clicking bell icon shows notification dropdown panel
- Notifications ordered by creation date (newest first)
- Unread notifications highlighted with bold text
- Clicking notification marks it as read and navigates to relevant page (if applicable)
- Maximum 100 notifications per user (older auto-deleted)
- Notifications older than 90 days auto-deleted

### 2.11 Merchant Rejection Reason & Review Information

#### Rejection Data Structure
```json
{
  "merchant_id": "uuid",
  "license_status": "rejected",
  "rejection_reason": "Business license is expired or unreadable",
  "rejection_details": {
    "category": "expired_license | invalid_document | mismatch | other",
    "message": "The uploaded license shows an expiration date of 2024-12-31",
    "suggested_action": "Please upload a current valid business license",
    "resubmit_allowed": true
  },
  "reviewed_at": "2026-08-10T10:30:00Z",
  "reviewed_by": "admin_user_id"
}
```

#### Website Notification for Rejection
```json
{
  "type": "merchant_rejected",
  "title": "Merchant Registration Update",
  "message": "Your merchant registration has been reviewed. Reason: Business license is expired or unreadable. Please resubmit with a valid license.",
  "data": {
    "merchant_id": "uuid",
    "rejection_reason": "Business license is expired or unreadable",
    "resubmit_url": "/merchant/license/resubmit"
  }
}
```

---

## 3. Functional Requirements

### 3.1 Core Entities & Data Model (コアエンティティとデータモデル)

#### 3.1.1 User Entity
Represents system users with role assignments.

**Attributes:**
- UserID (Primary Key, UUID)
- Email (Unique, VARCHAR(255))
- PasswordHash (VARCHAR(255), Argon2)
- Name (VARCHAR(255))
- Phone (VARCHAR(20), Optional)
- AvatarUrl (TEXT, Optional)
- Role (VARCHAR(20), Default: 'buyer') - Values: 'buyer', 'merchant', 'admin', 'super_admin'
- MerchantID (UUID, Foreign Key to Merchants, Optional) - Links user to merchant account
- IsActive (BOOLEAN, Default: true)
- EmailVerified (BOOLEAN, Default: false)
- CreatedAt (TIMESTAMP)
- UpdatedAt (TIMESTAMP)

**SQL Schema:**
```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  phone           VARCHAR(20),
  avatar_url      TEXT,
  role            VARCHAR(20) NOT NULL DEFAULT 'buyer',
  -- roles: 'buyer', 'merchant', 'admin', 'super_admin'
  merchant_id     UUID REFERENCES merchants(id),
  is_active       BOOLEAN DEFAULT true,
  email_verified  BOOLEAN DEFAULT false,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

#### 3.1.2 Product Entity
Represents a skincare product listed by a merchant.

**Attributes:**
- ProductID (Primary Key, UUID)
- MerchantID (Foreign Key to Merchants)
- CategoryID (Foreign Key to Categories)
- Name (VARCHAR(255))
- Slug (VARCHAR(255), Unique)
- Description (TEXT)
- ShortDescription (VARCHAR(500), Optional)
- Price (DECIMAL(10,2))
- CompareAtPrice (DECIMAL(10,2), Optional)
- SKU (VARCHAR(100), Unique, Optional)
- StockQuantity (INTEGER, Default: 0)
- LowStockThreshold (INTEGER, Default: 10)
- Images (TEXT Array)
- Tags (TEXT Array)
- SkinTypes (TEXT Array)
- Ingredients (TEXT Array)
- IsActive (BOOLEAN, Default: true)
- IsFeatured (BOOLEAN, Default: false)
- AvgRating (DECIMAL(3,2), Default: 0)
- ReviewCount (INTEGER, Default: 0)
- CreatedAt (TIMESTAMP)
- UpdatedAt (TIMESTAMP)

**SQL Schema:**
```sql
CREATE TABLE products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id       UUID NOT NULL REFERENCES merchants(id),
  category_id       UUID REFERENCES categories(id),
  name              VARCHAR(255) NOT NULL,
  slug              VARCHAR(255) UNIQUE NOT NULL,
  description       TEXT,
  short_description VARCHAR(500),
  price             DECIMAL(10,2) NOT NULL,
  compare_at_price  DECIMAL(10,2),
  sku               VARCHAR(100) UNIQUE,
  stock_quantity    INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 10,
  images            TEXT[],
  tags              TEXT[],
  skin_types        TEXT[],
  ingredients       TEXT[],
  is_active         BOOLEAN DEFAULT true,
  is_featured       BOOLEAN DEFAULT false,
  avg_rating        DECIMAL(3,2) DEFAULT 0,
  review_count      INTEGER DEFAULT 0,
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);
```

#### 3.1.3 Category Entity
Represents product categories with tree structure.

**Attributes:**
- CategoryID (Primary Key, UUID)
- Name (VARCHAR(255))
- Slug (VARCHAR(255), Unique)
- ParentID (Foreign Key to Categories, Optional)
- IconUrl (TEXT, Optional)
- SortOrder (INTEGER, Default: 0)
- CreatedAt (TIMESTAMP)

**SQL Schema:**
```sql
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  slug        VARCHAR(255) UNIQUE NOT NULL,
  parent_id   UUID REFERENCES categories(id),
  icon_url    TEXT,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMP DEFAULT NOW()
);
```

#### 3.1.4 Order Entity
Represents a customer order.

**Attributes:**
- OrderID (Primary Key, UUID)
- UserID (Foreign Key to Users)
- Status (VARCHAR(30), Default: 'placed') - Values: 'placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'
- Subtotal (DECIMAL(10,2))
- ShippingCost (DECIMAL(10,2), Default: 0)
- Tax (DECIMAL(10,2), Default: 0)
- Total (DECIMAL(10,2))
- ShippingAddress (JSONB)
- PaymentMethod (VARCHAR(50), Optional)
- PaymentStatus (VARCHAR(20), Default: 'pending')
- CouponCode (VARCHAR(50), Optional)
- DiscountAmount (DECIMAL(10,2), Default: 0)
- Notes (TEXT, Optional)
- CreatedAt (TIMESTAMP)
- UpdatedAt (TIMESTAMP)

**SQL Schema:**
```sql
CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id        UUID NOT NULL REFERENCES users(id),
  merchant_id     UUID NOT NULL REFERENCES merchants(id),
  status          VARCHAR(30) NOT NULL DEFAULT 'placed',
  total_amount    DECIMAL(10,2) NOT NULL,
  shipping_address JSONB NOT NULL,
  payment_method  VARCHAR(50) NOT NULL,
  payment_status  VARCHAR(20) NOT NULL DEFAULT 'pending',
  coupon_code     VARCHAR(50),
  discount_amount DECIMAL(10,2) DEFAULT 0,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

#### 3.1.5 Review Entity
Represents a product review.

**Attributes:**
- ReviewID (Primary Key, UUID)
- UserID (Foreign Key to Users)
- ProductID (Foreign Key to Products)
- Rating (INTEGER, 1-5)
- Title (VARCHAR(255), Optional)
- Body (TEXT, Optional)
- Images (TEXT Array)
- IsVerifiedPurchase (BOOLEAN, Default: false)
- IsApproved (BOOLEAN, Default: true)
- CreatedAt (TIMESTAMP)
- UpdatedAt (TIMESTAMP)
- Unique Constraint: [UserID, ProductID]

**SQL Schema:**
```sql
CREATE TABLE reviews (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id),
  product_id          UUID NOT NULL REFERENCES products(id),
  rating              INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title               VARCHAR(255),
  body                TEXT,
  images              TEXT[],
  is_verified_purchase BOOLEAN DEFAULT false,
  is_approved         BOOLEAN DEFAULT true,
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);
```

#### 3.1.6 Wishlist Entity
Represents a user's saved products.

**Attributes:**
- WishlistID (Primary Key, UUID)
- UserID (Foreign Key to Users)
- ProductID (Foreign Key to Products)
- CreatedAt (TIMESTAMP)
- Unique Constraint: [UserID, ProductID]

**SQL Schema:**
```sql
CREATE TABLE wishlist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  product_id  UUID NOT NULL REFERENCES products(id),
  created_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);
```

#### 3.1.7 Shop Entity
Represents a merchant's shop profile.

**Attributes:**
- ShopID (Primary Key, UUID)
- UserID (Foreign Key to Users, Unique)
- Name (VARCHAR(255))
- Slug (VARCHAR(255), Unique)
- Description (TEXT, Optional)
- LogoUrl (TEXT, Optional)
- BannerUrl (TEXT, Optional)
- Address (TEXT, Optional)
- Phone (VARCHAR(20), Optional)
- Email (VARCHAR(255), Optional)
- Latitude (DECIMAL(10,7), Optional)
- Longitude (DECIMAL(10,7), Optional)
- IsApproved (BOOLEAN, Default: false)
- CreatedAt (TIMESTAMP)
- UpdatedAt (TIMESTAMP)

**SQL Schema:**
```sql
CREATE TABLE shops (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID UNIQUE NOT NULL REFERENCES users(id),
  name        VARCHAR(255) NOT NULL,
  slug        VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  logo_url    TEXT,
  banner_url  TEXT,
  address     TEXT,
  phone       VARCHAR(20),
  email       VARCHAR(255),
  latitude    DECIMAL(10,7),
  longitude   DECIMAL(10,7),
  is_approved BOOLEAN DEFAULT false,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);
```

#### 3.1.8 Promotion Entity
Represents discount codes and promotions.

**Attributes:**
- PromotionID (Primary Key, UUID)
- MerchantID (Foreign Key to Merchants)
- Code (VARCHAR(50), Unique)
- Description (TEXT, Optional)
- DiscountType (VARCHAR(20)) - Values: 'percentage', 'fixed'
- DiscountValue (DECIMAL(10,2))
- MinOrderAmount (DECIMAL(10,2), Optional)
- MaxUses (INTEGER, Optional)
- UsedCount (INTEGER, Default: 0)
- StartsAt (TIMESTAMP)
- ExpiresAt (TIMESTAMP)
- IsActive (BOOLEAN, Default: true)
- CreatedAt (TIMESTAMP)

**SQL Schema:**
```sql
CREATE TABLE promotions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id     UUID NOT NULL REFERENCES merchants(id),
  code            VARCHAR(50) UNIQUE NOT NULL,
  description     TEXT,
  discount_type   VARCHAR(20) NOT NULL,
  discount_value  DECIMAL(10,2) NOT NULL,
  min_order_amount DECIMAL(10,2),
  max_uses        INTEGER,
  used_count      INTEGER DEFAULT 0,
  starts_at       TIMESTAMP NOT NULL,
  expires_at      TIMESTAMP NOT NULL,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMP DEFAULT NOW()
);
```

#### 3.1.9 Advertisement Entity
Represents shop advertisements with approval workflow, payment tracking, and weekly limits.

**Attributes:**
- AdvertisementID (Primary Key, UUID)
- ShopID (Foreign Key to Shops)
- Title (VARCHAR(255))
- Content (TEXT, Optional)
- AnnouncementMessage (VARCHAR(500), Required) — banner text displayed on storefront
- ImageUrl (TEXT, Optional)
- LinkUrl (TEXT, Optional)
- IsActive (BOOLEAN, Default: true)
- ApprovalStatus (VARCHAR(20), Default: 'pending') - Values: 'pending', 'approved', 'rejected'
- PaymentStatus (VARCHAR(20), Default: 'pending') - Values: 'pending', 'completed', 'refunded', 'failed'
- PaymentAmount (DECIMAL(10,2), Optional) — advertising fee amount
- PaymentReference (VARCHAR(255), Optional) — payment transaction reference
- ApprovedBy (Foreign Key to Users, Optional) — admin who approved/rejected
- ApprovedAt (TIMESTAMP, Optional)
- RejectionReason (TEXT, Optional) — reason when admin rejects
- WeekNumber (INTEGER) — ISO week number for weekly limit tracking
- StartsAt (TIMESTAMP)
- ExpiresAt (TIMESTAMP)
- CreatedAt (TIMESTAMP)

**SQL Schema:**
```sql
CREATE TABLE advertisements (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id               UUID NOT NULL REFERENCES shops(id),
  title                 VARCHAR(255) NOT NULL,
  content               TEXT,
  announcement_message  VARCHAR(500) NOT NULL,
  image_url             TEXT,
  link_url              TEXT,
  is_active             BOOLEAN DEFAULT true,
  approval_status       VARCHAR(20) NOT NULL DEFAULT 'pending',
  payment_status        VARCHAR(20) NOT NULL DEFAULT 'pending',
  payment_amount        DECIMAL(10,2),
  payment_reference     VARCHAR(255),
  approved_by           UUID REFERENCES users(id),
  approved_at           TIMESTAMP,
  rejection_reason      TEXT,
  week_number           INTEGER,
  starts_at             TIMESTAMP NOT NULL,
  expires_at            TIMESTAMP NOT NULL,
  created_at            TIMESTAMP DEFAULT NOW()
);
```

#### 3.1.10 RefreshToken Entity
Represents JWT refresh tokens.

**Attributes:**
- RefreshTokenID (Primary Key, UUID)
- UserID (Foreign Key to Users)
- TokenHash (VARCHAR(255))
- Family (VARCHAR(255))
- DeviceInfo (JSONB, Optional)
- IPAddress (VARCHAR(45), Optional)
- IsRevoked (BOOLEAN, Default: false)
- AbsoluteLimitAt (TIMESTAMP)
- ExpiresAt (TIMESTAMP)
- CreatedAt (TIMESTAMP)

**SQL Schema:**
```sql
CREATE TABLE refresh_tokens (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id),
  token_hash        VARCHAR(255) NOT NULL,
  family            VARCHAR(255) NOT NULL,
  device_info       JSONB,
  ip_address        VARCHAR(45),
  is_revoked        BOOLEAN DEFAULT false,
  absolute_limit_at TIMESTAMP NOT NULL,
  expires_at        TIMESTAMP NOT NULL,
  created_at        TIMESTAMP DEFAULT NOW()
);
```

### 3.1.11 Database Schema (データベーススキーマ)

#### Users Table
```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  phone           VARCHAR(20),
  avatar_url      TEXT,
  role            VARCHAR(20) NOT NULL DEFAULT 'buyer',
  -- roles: 'buyer', 'merchant', 'admin', 'super_admin'
  is_active       BOOLEAN DEFAULT true,
  email_verified  BOOLEAN DEFAULT false,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

#### Merchants Table
```sql
CREATE TABLE merchants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID UNIQUE NOT NULL REFERENCES users(id),
  shop_name       VARCHAR(255) NOT NULL,
  business_license_url TEXT NOT NULL,
  license_status  VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- status: 'pending', 'approved', 'rejected'
  rejection_reason TEXT,
  reviewed_at     TIMESTAMP,
  reviewed_by     UUID REFERENCES users(id),
  license_expires_at TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

#### Orders Table
```sql
CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id        UUID NOT NULL REFERENCES users(id),
  merchant_id     UUID NOT NULL REFERENCES merchants(id),
  status          VARCHAR(30) NOT NULL DEFAULT 'placed',
  total_amount    DECIMAL(10,2) NOT NULL,
  shipping_address JSONB NOT NULL,
  payment_method  VARCHAR(50) NOT NULL,
  payment_status  VARCHAR(20) NOT NULL DEFAULT 'pending',
  coupon_code     VARCHAR(50),
  discount_amount DECIMAL(10,2) DEFAULT 0,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

#### Order Status Flow
```
placed → confirmed → packed → shipped → out_for_delivery → delivered
   ↓         ↓          ↓         ↓              ↓              ↓
  Any state can be cancelled (before shipped) → cancelled
```

#### Order Status Updates
| Status | Description | Updated By |
|--------|-------------|------------|
| `placed` | Order created, awaiting confirmation | System |
| `confirmed` | Merchant accepted order | Merchant |
| `packed` | Order packed and ready to ship | Merchant |
| `shipped` | Order sent to courier | Merchant |
| `out_for_delivery` | Order on the way to buyer | Courier/System |
| `delivered` | Buyer received order | Buyer/System |
| `cancelled` | Order cancelled (buyer or merchant) | Buyer/Merchant |

#### Tracking Response
```json
{
  "order_id": "uuid",
  "status": "shipped",
  "timeline": [
    { "status": "placed", "timestamp": "2026-08-10T10:00:00Z" },
    { "status": "confirmed", "timestamp": "2026-08-10T14:30:00Z" },
    { "status": "packed", "timestamp": "2026-08-11T09:00:00Z" },
    { "status": "shipped", "timestamp": "2026-08-11T15:00:00Z" }
  ],
  "estimated_delivery": "2026-08-14",
  "carrier": "YANGON_EXPRESS",
  "tracking_number": "YOE123456789"
}
```

#### Advertisements Table
```sql
CREATE TABLE advertisements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         UUID NOT NULL REFERENCES shops(id),
  title           VARCHAR(255) NOT NULL,
  content         TEXT,
  announcement_message VARCHAR(500) NOT NULL,
  image_url       TEXT,
  link_url        TEXT,
  is_active       BOOLEAN DEFAULT true,
  approval_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  payment_status  VARCHAR(20) NOT NULL DEFAULT 'pending',
  payment_amount  DECIMAL(10,2),
  payment_reference VARCHAR(255),
  approved_by     UUID REFERENCES users(id),
  approved_at     TIMESTAMP,
  rejection_reason TEXT,
  week_number     INTEGER,
  starts_at       TIMESTAMP NOT NULL,
  expires_at      TIMESTAMP NOT NULL,
  created_at      TIMESTAMP DEFAULT NOW()
);
```

#### Ad Fee Settings Table
```sql
CREATE TABLE ad_fee_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placement       VARCHAR(50) NOT NULL,
  tier            VARCHAR(20) NOT NULL,
  daily_rate      DECIMAL(10,2) NOT NULL,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE(placement, tier)
);
```

#### Default Fee Settings
| Placement | Basic | Standard | Premium |
|-----------|-------|----------|---------|
| Homepage Slider | $3.00/day | $5.00/day | $8.00/day |
| Product Page Sidebar | $2.00/day | $3.50/day | $6.00/day |
| Category Banner | $2.50/day | $4.00/day | $7.00/day |
| Search Results Top | $1.50/day | $2.50/day | $5.00/day |

#### Ad Fee Calculation Formula
```
Total Fee = daily_rate × number_of_days × tier_multiplier

Tier Multipliers:
- basic: 1.0x
- standard: 1.5x
- premium: 2.0x
```

#### Ad Payments Table
```sql
CREATE TABLE ad_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id           UUID NOT NULL REFERENCES advertisements(id),
  merchant_id     UUID NOT NULL REFERENCES merchants(id),
  amount          DECIMAL(10,2) NOT NULL,
  payment_method  VARCHAR(50) NOT NULL,
  payment_status  VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- status: 'pending', 'completed', 'refunded', 'failed'
  transaction_id  VARCHAR(255),
  paid_at         TIMESTAMP,
  refund_amount   DECIMAL(10,2),
  refund_reason   TEXT,
  refunded_at     TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

#### Ad Fee History Table
```sql
CREATE TABLE ad_fee_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_fee_setting_id UUID NOT NULL REFERENCES ad_fee_settings(id),
  old_daily_rate  DECIMAL(10,2),
  new_daily_rate  DECIMAL(10,2),
  changed_by      UUID NOT NULL REFERENCES users(id),
  change_reason   TEXT,
  effective_from  TIMESTAMP NOT NULL,
  created_at      TIMESTAMP DEFAULT NOW()
);
```

#### Fee History Rules
- Fee changes do not affect already-paid advertisements
- New fees apply only to ads created after the change effective date
- All fee changes are logged in `ad_fee_history`
- Admin can view fee change history with timestamps and reasons

#### Commission Settings Table
```sql
CREATE TABLE commission_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  -- rate: 0.00 to 100.00 (percentage)
  updated_by      UUID REFERENCES users(id),
  updated_at      TIMESTAMP DEFAULT NOW(),
  created_at      TIMESTAMP DEFAULT NOW()
);
```

#### Commission Settings Rules
- Only one row exists (singleton table)
- Rate must be between 0 and 100 with max 2 decimal places
- Rate applies to all new transactions from the moment saved
- Historical invoices are not affected by rate changes
- All changes are logged in audit trail

#### Revenue Targets Table
```sql
CREATE TABLE revenue_targets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_amount   DECIMAL(12,2) NOT NULL,
  period          VARCHAR(20) NOT NULL,
  -- period: 'monthly', 'quarterly'
  is_active       BOOLEAN DEFAULT true,
  created_by      UUID REFERENCES users(id),
  updated_at      TIMESTAMP DEFAULT NOW(),
  created_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE(period, is_active)
);
```

#### Revenue Targets Rules
- Target amount must be positive (> 0) with max 2 decimal places
- Only `monthly` and `quarterly` periods supported
- Only one active target per period type (new overwrites old)
- Progress calculated from completed/settled orders only

#### Payouts Table
```sql
CREATE TABLE payouts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id     UUID NOT NULL REFERENCES merchants(id),
  total_amount    DECIMAL(12,2) NOT NULL,
  commission_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  ad_fee_amount   DECIMAL(12,2) NOT NULL DEFAULT 0,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- status: 'pending', 'processing', 'completed', 'failed'
  processed_by    UUID REFERENCES users(id),
  processed_at    TIMESTAMP,
  failure_reason  TEXT,
  idempotency_key VARCHAR(255) UNIQUE,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

#### Payout Rules
- Payout status flows: pending → processing → completed, or pending → failed
- Processing is idempotent (idempotency_key prevents double-pay)
- Amount = commission earned + ad fees owed for the period
- Payout only for status = pending

### 3.2 Functional Requirements by Module

#### 3.2.1 Buyer Module - Authentication (購入者モジュール - 認証)

| ID | Requirement | Priority |
|----|-------------|----------|
| B-AUTH-001 | User can register with email and password | High |
| B-AUTH-002 | User can login with email and password | High |
| B-AUTH-003 | System issues JWT access token (15 min) and refresh token (7 days) | High |
| B-AUTH-004 | User can logout (token blacklisted in Redis) | High |
| B-AUTH-005 | Access token auto-refreshes via refresh token | High |
| B-AUTH-006 | Password is hashed with Argon2 | High |
| B-AUTH-007 | Refresh token rotation on every use | High |
| B-AUTH-008 | Token family tracking for breach detection | Medium |
| B-AUTH-009 | User can request password reset via website | High |
| B-AUTH-010 | User can reset password with 6-digit code | High |
| B-AUTH-011 | Reset token expires after 15 minutes | High |
| B-AUTH-012 | Maximum 3 reset requests per email per hour | Medium |
| B-AUTH-013 | Password reset invalidates all existing sessions | High |

#### 3.2.2 Buyer Module - Profile Setup (購入者モジュール - プロフィール設定)

| ID | Requirement | Priority |
|----|-------------|----------|
| B-PROF-001 | User can view own profile | High |
| B-PROF-002 | User can edit name, email, phone | High |
| B-PROF-003 | User can upload/change avatar | Medium |
| B-PROF-004 | User can set skin type (dry, oily, combination, sensitive, normal) | High |
| B-PROF-005 | User can set skin concerns (acne, dark spots, wrinkles, etc.) | High |
| B-PROF-006 | Profile auto-populates during registration | High |

#### 3.2.3 Buyer Module - AI Skin Analysis (購入者モジュール - AI肌分析)

| ID | Requirement | Priority |
|----|-------------|----------|
| B-AI-001 | User can upload facial photo or use camera for analysis | High |
| B-AI-002 | System performs AI-based skin condition analysis | High |
| B-AI-003 | System displays analysis results (skin type, condition, age estimation) | High |
| B-AI-004 | System recommends products based on analysis results | High |
| B-AI-005 | User can view analysis history | Medium |
| B-AI-006 | System shows skin condition trends over time | Medium |
| B-AI-007 | Supported image formats: JPG, PNG, WebP | High |
| B-AI-008 | Maximum image size: 10MB | High |

#### 3.2.4 Buyer Module - Smart Product Matching (購入者モジュール - スマート商品マッチング)

| ID | Requirement | Priority |
|----|-------------|----------|
| B-MATCH-001 | System provides personalized recommendations based on skin analysis | High |
| B-MATCH-002 | User can filter products by skin type | High |
| B-MATCH-003 | User can filter products by ingredients | Medium |
| B-MATCH-004 | User can filter products by price range | High |
| B-MATCH-005 | User can filter products by review rating | Medium |
| B-MATCH-006 | System displays "Recommended for You" section | High |

#### 3.2.5 Buyer Module - Search & Filter (購入者モジュール - 検索・フィルタ)

| ID | Requirement | Priority |
|----|-------------|----------|
| B-SEARCH-001 | User can search products by keyword | High |
| B-SEARCH-002 | User can browse products by category | High |
| B-SEARCH-003 | User can sort by price, rating, newest | High |
| B-SEARCH-004 | Results are paginated (default 20 per page) | High |
| B-SEARCH-005 | Search supports partial matching | High |
| B-SEARCH-006 | Category tree supports nested navigation | Medium |

#### 3.2.6 Buyer Module - Product Details (購入者モジュール - 商品詳細)

| ID | Requirement | Priority |
|----|-------------|----------|
| B-PROD-001 | Product detail shows images, description, price, ingredients | High |
| B-PROD-002 | Product detail shows multiple images with gallery view | Medium |
| B-PROD-003 | Product detail shows reviews with ratings | High |
| B-PROD-004 | User can write reviews (login required) | High |
| B-PROD-005 | Product detail shows related products | Medium |
| B-PROD-006 | Product detail shows skin type compatibility | High |
| B-PROD-007 | Product detail shows average rating and review count | High |

#### 3.2.7 Buyer Module - Wishlist (購入者モジュール - お気に入り)

| ID | Requirement | Priority |
|----|-------------|----------|
| B-WISH-001 | User can add product to wishlist | High |
| B-WISH-002 | User can remove product from wishlist | High |
| B-WISH-003 | User can view wishlist list | High |
| B-WISH-004 | Wishlist shows product images, prices, availability | High |
| B-WISH-005 | User can move wishlist items to cart | Medium |

#### 3.2.8 Buyer Module - Cart (購入者モジュール - カート)

| ID | Requirement | Priority |
|----|-------------|----------|
| B-CART-001 | User can add products to cart | High |
| B-CART-002 | User can update item quantities | High |
| B-CART-003 | User can remove items from cart | High |
| B-CART-004 | Cart shows item subtotal calculation | High |
| B-CART-005 | Cart shows available stock | High |
| B-CART-006 | Cart persists across sessions (logged-in users) | High |
| B-CART-007 | Cart shows product images and names | High |

#### 3.2.9 Buyer Module - Checkout & Payment (購入者モジュール - 注文・決済)

| ID | Requirement | Priority |
|----|-------------|----------|
| B-CHECK-001 | User can enter shipping address | High |
| B-CHECK-002 | User can select payment method | High |
| B-CHECK-003 | User can review order before confirming | High |
| B-CHECK-004 | System calculates subtotal, shipping, tax, total | High |
| B-CHECK-005 | Order is created with status "pending" | High |
| B-CHECK-006 | Stock is decremented on order creation | High |
| B-CHECK-007 | User can view order confirmation | High |
| B-CHECK-008 | User can view order history | High |
| B-CHECK-009 | User can view order details | High |
| B-CHECK-010 | Order confirmation notification is sent | Medium |

#### 3.2.10 Merchant Module - Product Management (マーチャントモジュール - 商品管理)

| ID | Requirement | Priority |
|----|-------------|----------|
| M-PROD-001 | Merchant can create new products | High |
| M-PROD-002 | Merchant can edit existing products | High |
| M-PROD-003 | Merchant can delete products (soft delete) | High |
| M-PROD-004 | Merchant can upload product images | High |
| M-PROD-005 | Merchant can manage inventory (stock quantity) | High |
| M-PROD-006 | Merchant can view own product list | High |
| M-PROD-007 | Merchant can toggle product active/inactive | High |
| M-PROD-008 | Merchant can set product as featured | Medium |
| M-PROD-009 | Product creation requires: name, category, price, description | High |
| M-PROD-010 | Product images support JPG, PNG, WebP (max 5MB each) | High |

#### 3.2.11 Merchant Module - Sales Dashboard (マーチャントモジュール - セールスダッシュボード)

| ID | Requirement | Priority |
|----|-------------|----------|
| M-DASH-001 | Merchant can view daily/monthly sales overview | High |
| M-DASH-002 | Merchant can view order list | High |
| M-DASH-003 | Merchant can update order status | High |
| M-DASH-004 | Merchant can view best-selling products ranking | Medium |
| M-DASH-005 | Dashboard shows key metrics: total sales, orders, avg order value | High |

#### 3.2.12 Merchant Module - Analytics (マーチャントモジュール - 分析)

| ID | Requirement | Priority |
|----|-------------|----------|
| M-ANAL-001 | Merchant can view sales trends (charts) | Medium |
| M-ANAL-002 | Merchant can view product performance (views, sales) | Medium |
| M-ANAL-003 | Merchant can view customer demographics | Low |

#### 3.2.13 Merchant Module - Promotions (マーチャントモジュール - プロモーション)

| ID | Requirement | Priority |
|----|-------------|----------|
| M-PROMO-001 | Merchant can create discount coupons | High |
| M-PROMO-002 | Merchant can set discount type (percentage or fixed) | High |
| M-PROMO-003 | Merchant can set min order amount | Medium |
| M-PROMO-004 | Merchant can set max uses and expiry date | High |
| M-PROMO-005 | Merchant can view coupon usage statistics | Medium |
| M-PROMO-006 | Merchant can edit/delete coupons | High |

#### 3.2.14 Merchant Module - Shop Advertisement (マーチャントモジュール - 店舗広告)

| ID | Requirement | Priority |
|----|-------------|----------|
| M-AD-001 | Merchant can create shop advertisements | Medium |
| M-AD-002 | Merchant can set ad schedule (start/end date) | Medium |
| M-AD-003 | Merchant can upload ad images | Medium |
| M-AD-004 | Merchant can view/manage own ads | Medium |
| M-AD-005 | Active ads display on platform | Medium |
| M-AD-006 | Admin can approve/reject advertisements | High |
| M-AD-007 | Merchants must pay advertising fee before submission | High |
| M-AD-008 | Maximum 5 active advertisements per week | High |
| M-AD-009 | Advertisements display with banner/image and announcement message | Medium |
| M-AD-010 | Ad states: draft → pending_payment → pending_approval → approved → active → expired | High |
| M-AD-011 | Rejected ads auto-refund payment to merchant | High |
| M-AD-012 | Per merchant: maximum 2 active ads simultaneously | Medium |
| M-AD-013 | Minimum ad duration: 7 days | Medium |
| M-AD-014 | Maximum ad duration: 30 days | Medium |

#### Advertisement Ad States Flow
```
draft → pending_payment → pending_approval → approved → active → expired
                                    ↓
                                rejected (refund fee)
                                    ↓
                                resubmitted
```

#### Ad Creation Flow
```
Merchant creates advertisement
    ↓
Uploads content (image, title, description, date range)
    ↓
System calculates fee based on duration and placement
    ↓
Merchant pays advertisement fee
    ↓
Ad enters admin approval queue
    ↓
Admin reviews ad content, image, message, and due date
    ↓
├── Approved → Ad displayed on storefront
└── Rejected → Fee refunded, reason sent to merchant
```

#### Advertisement Slider on Product Dashboard

##### Display Rules
- Slider appears on the main product dashboard/home page
- Shows only `approved` and `active` advertisements
- Maximum 5 ads in rotation
- Auto-rotate every 5 seconds
- Manual navigation (prev/next buttons)

##### Slider Response
```json
{
  "ads": [
    {
      "id": "uuid",
      "title": "Summer Sale - 20% Off",
      "image_url": "https://...",
      "link": "/products?promo=summer20",
      "shop_name": "Beauty Shop",
      "start_date": "2026-08-01",
      "end_date": "2026-08-31"
    }
  ]
}
```

##### Display Priority
1. Ads with higher payment tier (premium > standard > basic)
2. Ads ending soonest (urgency)
3. Random rotation within same priority

#### 3.2.15 Merchant Module - Shop Profile (マーチャントモジュール - 店舗プロフィール)

| ID | Requirement | Priority |
|----|-------------|----------|
| M-SHOP-001 | Merchant can create/edit shop profile | High |
| M-SHOP-002 | Shop profile includes: name, description, logo, banner | High |
| M-SHOP-003 | Shop profile includes: address, phone, email | Medium |
| M-SHOP-004 | Shop profile includes GPS coordinates for shop finder | Low |
| M-SHOP-005 | Shop must be approved by admin before going live | High |

#### 3.2.16 Admin Module - Review Moderation (管理者モジュール - レビュー管理)

| ID | Requirement | Priority |
|----|-------------|----------|
| A-REV-001 | Admin can view all reviews | High |
| A-REV-002 | Admin can approve/reject reviews | High |
| A-REV-003 | Admin can delete inappropriate reviews | High |

#### 3.2.17 Admin Module - Content Moderation (管理者モジュール - コンテンツ管理)

| ID | Requirement | Priority |
|----|-------------|----------|
| A-CONT-002 | Admin can approve/reject merchant registrations | High |
| A-CONT-004 | Admin can remove violating content | High |

#### 3.2.18 Admin Module - Analytics & Reports (管理者モジュール - 分析・レポート)

| ID | Requirement | Priority |
|----|-------------|----------|
| A-ANAL-001 | Admin can view platform-wide dashboard | High |
| A-ANAL-002 | Admin can view user growth analytics | Medium |
| A-ANAL-003 | Admin can view sales reports (monthly/yearly) | High |
| A-ANAL-004 | Admin can view category performance | Medium |
| A-ANAL-005 | Admin can view merchant performance | Medium |

#### 3.2.19 Admin Module - Commission Management (管理者モジュール - 手数料管理)

| ID | Requirement | Priority |
|----|-------------|----------|
| A-COMM-001 | Admin can set platform commission rate | High |
| A-COMM-002 | System calculates commission per transaction | High |
| A-COMM-003 | Admin can view commission reports by merchant | Medium |
| A-COMM-004 | Commission rate must be between 0 and 100 with max 2 decimal places | High |
| A-COMM-005 | Commission rate applies to all new transactions from the moment saved | High |
| A-COMM-006 | Commission reports support date range filtering (from/to) | Medium |
| A-COMM-007 | Commission reports support pagination and sorting | Medium |
| A-COMM-008 | Commission rate changes are logged in audit trail | High |

#### 3.2.20 Admin Module - Revenue Tracking (管理者モジュール - 収益追跡)

| ID | Requirement | Priority |
|----|-------------|----------|
| A-REV-001 | Admin can view revenue dashboard | High |
| A-REV-002 | Admin can view revenue trends (charts) | High |
| A-REV-003 | Admin can view payment status breakdown | High |
| A-REV-004 | Admin can manage merchant payouts | Medium |
| A-REV-005 | Admin can set monthly/quarterly revenue targets and view progress | Medium |
| A-REV-006 | System can forecast revenue and platform fees using historical data | Medium |
| A-REV-007 | Revenue KPIs include: total revenue, total commission, avg order value, net revenue | High |
| A-REV-008 | Revenue trend chart supports 7d/30d/90d/1y range selection | High |
| A-REV-009 | Revenue target progress displayed as gauge bar (0-100%) | Medium |
| A-REV-010 | Payout processing is idempotent (no double-pay) | High |
| A-REV-011 | Payout status flows: pending → processing → completed, or pending → failed | High |
| A-REV-012 | Revenue target supports only monthly and quarterly periods | Medium |
| A-REV-013 | Only one active target per period type (new overwrites old) | Medium |
| A-REV-014 | Forecast is indicative only, never written to financial records | Low |

#### 3.2.21 Admin Module - Ad Fee Revenue (管理者モジュール - 広告料収益)

| ID | Requirement | Priority |
|----|-------------|----------|
| A-ADFE-001 | Admin can view advertisement fee revenue in dashboard | Medium |
| A-ADFE-002 | Ad fee revenue included in total platform income KPI | Medium |
| A-ADFE-003 | Ad fee payment status tracked alongside order payment status | Medium |
| A-ADFE-004 | Ad fee trend series displayed on revenue chart | Medium |
| A-ADFE-005 | Ad fee revenue included in payout deduction calculation | Medium |
| A-ADFE-006 | Ad fee revenue included in revenue target progress calculation | Low |
| A-ADFE-007 | Ad fee revenue included in AI forecast calculation | Low |

---

## 4. Special Business Rules

### 4.1 Authentication Rules (認証ルール)

#### Rule 4.1.1: Dual-Token Architecture
- Access Token: 15-minute expiry, signed with `JWT_ACCESS_SECRET`
- Refresh Token: 7-day expiry, signed with `JWT_REFRESH_SECRET` (different secret)
- Refresh tokens hashed (Argon2) before database storage
- Token rotation: issue new refresh token on every use
- Absolute time limit: 90-day hard session cap regardless of rotations
- Token family tracking for breach detection (reuse detection)
- On reuse of revoked token: revoke ALL tokens for the user

#### Rule 4.1.2: Redis Blacklisting
- On logout, blacklist access token in Redis for remaining TTL
- JwtAuthGuard checks Redis blacklist on every request (sub-millisecond)
- Prevents stolen tokens from being used after logout

#### Rule 4.1.3: Password Security
- Passwords must be at least 8 characters
- Passwords hashed with Argon2 (memory-hard, GPU-resistant)
- Never store plain text passwords

### 4.2 Product Rules (商品ルール)

#### Rule 4.2.1: Product Status
- Products can be active or inactive
- Only active products appear in search results
- Inactive products are hidden from buyers but visible to merchant

#### Rule 4.2.2: Stock Management
- Stock quantity cannot go below 0
- Low stock threshold triggers warning (default: 10 units)
- Stock is decremented atomically on order creation
- Out-of-stock products cannot be added to cart

#### Rule 4.2.3: Product Images
- Maximum 10 images per product
- Supported formats: JPG, PNG, WebP
- Maximum file size: 5MB per image
- First image is the primary/cover image

### 4.3 Order Rules (注文ルール)

#### Rule 4.3.1: Order Completion
- Delivered status is auto-confirmed by system or confirmed by buyer

#### Rule 4.3.2: Price Calculation
- Subtotal = sum of (unit_price × quantity) for all items
- Tax is calculated based on shipping address location
- Total = Subtotal + Shipping Cost + Tax
- Prices are locked at order creation time (not affected by later price changes)

### 4.4 Review Rules (レビュールール)

#### Rule 4.4.1: Review Eligibility
- Only users who purchased a product can review it (verified purchase)
- One review per user per product
- Reviews are approved by default but can be moderated by admin

#### Rule 4.4.2: Review Rating
- Rating must be between 1 and 5 (inclusive)
- Average rating is auto-calculated from all approved reviews
- Review count is auto-updated

#### Rule 4.4.3: Review Validation Rules
1. **Purchase Required:** Reviewer must have a confirmed order containing the product
2. **Arrival Confirmed:** Order status must be `delivered` or buyer confirmed arrival
3. **One Review Per Product:** Each buyer can review a product only once
4. **Rating Range:** Star rating must be between 1 and 5 (integer)
5. **Content Rules:**
   - No external website links
   - No phone numbers
   - No store advertisements
   - No inappropriate images
   - No unrelated content
6. **Image Limits:** Maximum 5 images per review, max 5MB each, JPG/PNG only

#### Review Validation Middleware
```typescript
function validateReview(req, res, next) {
  const { productId } = req.params;
  const buyerId = req.user.id;
  
  // Check purchase history
  const hasOrder = checkProductPurchased(buyerId, productId);
  if (!hasOrder) {
    return res.status(403).json({ 
      error: 'PURCHASE_REQUIRED',
      message: 'You can only review products you have purchased' 
    });
  }
  
  // Check arrival confirmation
  const orderDelivered = checkOrderDelivered(buyerId, productId);
  if (!orderDelivered) {
    return res.status(403).json({ 
      error: 'DELIVERY_REQUIRED',
      message: 'You can only review products after confirming delivery' 
    });
  }
  
  // Check existing review
  const existingReview = getReviewByBuyerAndProduct(buyerId, productId);
  if (existingReview) {
    return res.status(409).json({ 
      error: 'REVIEW_EXISTS',
      message: 'You have already reviewed this product' 
    });
  }
  
  next();
}
```

#### Admin Moderation Actions
| Action | Description |
|--------|-------------|
| Approve | Make review visible to public |
| Reject | Remove review, notify buyer |
| Flag | Mark for further investigation |

### 4.5 Promotion Rules (プロモーションルール)

#### Rule 4.5.1: Coupon Validation
- Coupon code must be unique
- Coupon must be active and not expired
- Order amount must meet minimum requirement (if set)
- Total usage must not exceed max uses (if set)
- Only one coupon can be applied per order

#### Rule 4.5.2: Discount Calculation
- Percentage discount: applied to subtotal
- Fixed discount: subtracted from subtotal (cannot exceed subtotal)
- Discounted amount cannot go below 0

### 4.6 Advertisement Rules (広告ルール)

#### Rule 4.6.1: Advertisement Approval
- All advertisements require admin approval before display
- Advertisements are in `PENDING_APPROVAL` status after payment
- Admin can approve or reject with reason
- Rejected ads can be edited and resubmitted

#### Rule 4.6.2: Advertisement Payment
- Merchants must pay advertising fee before ad submission
- Payment must be verified before ad transitions to `PENDING_APPROVAL`
- Payment transaction recorded with amount, status, reference
- Refund automatically processed if ad is rejected

#### Rule 4.6.3: Weekly Ad Limit
- Maximum 5 active advertisements per week across all merchants
- Week runs Monday 00:00 to Sunday 23:59 (UTC)
- Limit validated before approving ad for display

#### Rule 4.6.4: Advertisement Display
- Advertisements display with banner/image and announcement message
- Only approved ads within schedule are shown to buyers
- Active ads cached in Redis with 5-minute TTL

### 4.7 Merchant Rules (出品者ルール)

#### Rule 4.6.1: Shop Approval
- New merchant shops require admin approval
- Shops are inactive until approved
- Admin can reject shops with reason

#### Rule 4.6.2: Product Ownership
- Merchants can only edit/delete their own products
- Products are linked to merchant's user account

### 4.7 AI Skin Analysis Rules (AI肌分析ルール)

#### Rule 4.7.1: Image Requirements
- Image must contain a face
- Image should be well-lit and clear
- Maximum image size: 10MB
- Supported formats: JPG, PNG, WebP

#### Rule 4.7.2: Analysis Results
- Analysis results are cached for 24 hours
- Users can re-analyze at any time
- Analysis history is retained indefinitely

### 4.8 Commission Rules (手数料ルール)

#### Rule 4.8.1: Commission Rate
- Commission rate must be between 0 and 100 (percentage)
- Maximum 2 decimal places
- Rate is stored as a string to preserve precision
- Only one rate exists (singleton setting)
- Rate applies to all new transactions from the moment saved
- Historical invoices are not retroactively affected

#### Rule 4.8.2: Commission Calculation
- Commission = Order Total × (Commission Rate / 100)
- Commission is calculated per transaction at order creation time
- Commission amount is stored on the order record
- Only completed/settled orders are included in commission reports

#### Rule 4.8.3: Commission Reports
- Reports support filtering by date range (from/to)
- Reports support pagination and sorting
- Reports show merchant-level commission breakdown

### 4.9 Revenue Rules (収益ルール)

#### Rule 4.9.1: Revenue KPIs
- Total Revenue: Sum of all completed order amounts
- Total Commission: Sum of all commission from completed orders
- Avg Order Value: Total Revenue / Number of completed orders
- Net Revenue: Total Revenue - Refunds
- Only completed/settled orders are included
- Refunds are excluded from net revenue

#### Rule 4.9.2: Revenue Trend Chart
- Supports 7d, 30d, 90d, and 1y ranges
- Data points are grouped by day (7d, 30d) or month (90d, 1y)
- Each point includes: date, revenue, commission, ad fee, total income

#### Rule 4.9.3: Revenue Targets
- Only `monthly` and `quarterly` periods supported
- Target amount must be positive (> 0) with max 2 decimal places
- Only one active target per period type (new overwrites old)
- Progress = (actual revenue in period / target amount) × 100
- Gauge clamps display to 0-100%; values above 100% shown as "over target"
- Progress calculated from completed/settled orders only
- Ad fee revenue included in progress calculation

#### Rule 4.9.4: AI Revenue Forecast
- Forecast derived from historical revenue data using trend extrapolation
- Minimum 7 historical data points required
- Produces predicted revenue and platform fee series
- Rendered as dotted line on trend chart
- Forecast is indicative only, never written to financial records
- If insufficient data, forecast is hidden with informational note

### 4.10 Payout Rules (支払いルール)

#### Rule 4.10.1: Payout Processing
- Payout status flows: pending → processing → completed, or pending → failed
- Processing is idempotent (idempotency_key prevents double-pay)
- Retry of already-processed payout returns 409 Conflict
- Payout amount = commission earned + ad fees owed for the period

#### Rule 4.10.2: Payout Scope
- Only status = pending payouts can be processed
- Payout includes both commission and ad fee deductions
- Processed payouts are logged in audit trail

### 4.11 Ad Fee Revenue Rules (広告料収益ルール)

#### Rule 4.11.1: Ad Fee Scope
- Ad fee revenue includes only completed ad payments
- Ad fee trend series overlaid on revenue chart
- Ad fee payment statuses summarized alongside order payment statuses

#### Rule 4.11.2: Ad Fee in Platform Income
- Total Platform Income = Commission Revenue + Ad Fee Revenue
- Ad fee included in revenue target progress calculation
- Ad fee included in AI forecast calculation

---

## 5. Non-Functional Requirements

### 5.1 Performance (パフォーマンス)

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-001 | Page load time for dashboards | ≤ 2 seconds |
| NFR-002 | Search and filter operations | ≤ 3 seconds (10,000 records) |
| NFR-003 | API response time (p95) | ≤ 500 milliseconds |
| NFR-004 | AI skin analysis processing | ≤ 10 seconds |
| NFR-005 | Database query optimization | Proper indexing on FK and filter columns |

### 5.2 Security (セキュリティ)

| ID | Requirement | Description |
|----|-------------|-------------|
| NFR-006 | Role-based authorization | All API endpoints enforce RBAC |
| NFR-007 | Authentication required | All non-public endpoints require JWT |
| NFR-008 | Input validation | Validate all user inputs at every layer |
| NFR-009 | SQL injection prevention | Use Prisma parameterized queries |
| NFR-010 | XSS prevention | React auto-escaping + CSP headers |
| NFR-011 | CSRF protection | SameSite cookies + CSRF tokens |
| NFR-012 | Rate limiting | API rate limits per IP/user |
| NFR-013 | Audit logging | Log all significant actions |
| NFR-014 | Sensitive data protection | Never log passwords, tokens, PII |
| NFR-015 | HTTPS enforcement | All production traffic over HTTPS |

### 5.3 Data Storage & File Management (データストレージ・ファイル管理)

| ID | Requirement | Description |
|----|-------------|-------------|
| NFR-016 | File storage abstraction | Interface for future cloud migration |
| NFR-017 | Image optimization | Multiple resolutions (thumbnail, medium, full) |
| NFR-018 | File size limits | Product images: 5MB, User avatar: 5MB, Analysis photos: 10MB |
| NFR-019 | Supported file types | JPG, PNG, WebP for images |
| NFR-020 | File naming convention | UUID-based to prevent conflicts |

### 5.4 Caching (Redis) (キャッシング)

| ID | Requirement | Description |
|----|-------------|-------------|
| NFR-021 | Session management | Redis for session storage with configurable TTL |
| NFR-022 | API caching | Cache frequently accessed data (products, categories) |
| NFR-023 | Token blacklisting | Redis for access token blacklist |
| NFR-024 | Rate limiting | Redis-based rate limiting counters |
| NFR-025 | Cache invalidation | Automatic expiration + manual invalidation on updates |

### 5.5 Database (データベース)

| ID | Requirement | Description |
|----|-------------|-------------|
| NFR-026 | PostgreSQL v16 | Primary relational database |
| NFR-027 | Prisma ORM | Type-safe database access |
| NFR-028 | Migrations | Version-controlled schema changes |
| NFR-029 | Indexing | Indexes on FK columns and frequent query filters |
| NFR-030 | Backups | Automated daily backups |

### 5.6 Internationalization (国際化)

| ID | Requirement | Description |
|----|-------------|-------------|
| NFR-031 | Multi-language support | English, Myanmar, Japanese |
| NFR-032 | Language detection | Auto-detect from browser settings |
| NFR-033 | Language toggle | User can manually switch languages |
| NFR-034 | Localized content | UI text, error messages, notifications |
| NFR-035 | Locale-aware formatting | Dates, numbers, currencies |

### 5.7 Accessibility (アクセシビリティ)

| ID | Requirement | Description |
|----|-------------|-------------|
| NFR-036 | WCAG 2.1 AA compliance | Semantic HTML, keyboard navigation |
| NFR-037 | Screen reader support | ARIA labels, roles, descriptions |
| NFR-038 | Color contrast | Minimum 4.5:1 for normal text |
| NFR-039 | Focus indicators | Visible focus on all interactive elements |
| NFR-034 | Skip navigation | Skip-to-main-content link |

### 5.8 Scalability (スケーラビリティ)

| ID | Requirement | Description |
|----|-------------|-------------|
| NFR-040 | Horizontal scaling | Backend supports multiple instances |
| NFR-041 | Connection pooling | Database connection pool management |
| NFR-042 | CDN ready | Image delivery via CDN |
| NFR-043 | API versioning | URI-based versioning (/api/v1/) |

### 5.9 Monitoring & Logging (モニタリング・ログ)

| ID | Requirement | Description |
|----|-------------|-------------|
| NFR-044 | Structured logging | JSON format logs |
| NFR-045 | Error tracking | Sentry or equivalent |
| NFR-046 | Health check endpoint | GET /health |
| NFR-047 | Performance monitoring | Response time, error rate metrics |

---

## 6. System Architecture Context

### 6.1 High-Level Architecture (ハイレベルアーキテクチャ)

```
┌─────────────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                                   │
│  +-------------------------------------------------------------+   │
│  |  React SPA (Vite + TypeScript)                              |   │
│  |  |-- shadcn/ui Components                                   |   │
│  |  |-- React Router (Lazy Routes)                             |   │
│  |  |-- TanStack Query (Server State)                          |   │
│  |  |-- React Hook Form + Zod (Forms)                          |   │
│  |  |-- i18next (EN/MY/JA)                                     |   │
│  |  +-- next-themes (Light/Dark)                               |   │
│  +----------------------------+--------------------------------+   │
│                               | HTTPS (JWT Bearer)                 │
+-------------------------------+------------------------------------+
|                          API LAYER                                 |
|  +----------------------------+--------------------------------+   │
|  |  NestJS REST API (v11 + TypeScript)                         |   │
|  |  |-- Auth Module (JWT + Refresh Rotation)                   |   │
|  |  |-- Guards (JWT, RBAC)                                     |   │
|  |  |-- Pipes (ValidationPipe + class-validator)               |   │
|  |  |-- Interceptors (Logging, Serialization, Timeout)         |   │
|  |  |-- Filters (ExceptionFilter -> Structured Errors)         |   │
|  |  +-- Swagger/OpenAPI Documentation                          |   │
|  +----------+-------------------------------+------------------+   │
|             |                               |                     |
+-------------+-------------------------------+---------------------+
|          DATA LAYER                    CACHE LAYER                |
|  +----------+----------+      +----------+----------+             |
|  |  PostgreSQL v16     |      |  Redis v7            |             |
|  |  |-- Prisma ORM v6  |      |  |-- Session Store   |             |
|  |  |-- Migrations     |      |  |-- Token Blacklist |             |
|  |  |-- Indexes        |      |  |-- API Cache       |             |
|  |  +-- Transactions   |      |  +-- Rate Limiting   |             |
|  +---------------------+      +---------------------+             |
+--------------------------------------------------------------------+
```

### 6.2 API Endpoint Overview (APIエンドポイント概要)

```
/api/v1/
├── /auth           # Authentication
│   ├── POST /register
│   ├── POST /login
│   ├── POST /refresh
│   ├── POST /logout
│   └── GET  /verify
├── /users          # User Management
│   ├── GET    /me
│   ├── PATCH  /me
│   ├── GET    /me/avatar
│   └── PATCH  /me/password
├── /products       # Product Management
│   ├── GET    /           # List (public, filterable)
│   ├── GET    /:slug      # Detail (public)
│   ├── POST   /           # Create (merchant)
│   ├── PATCH  /:id        # Update (merchant)
│   ├── DELETE /:id        # Delete (merchant)
│   └── PATCH  /:id/stock  # Update stock (merchant)
├── /categories     # Category Management
│   └── GET    /           # Category tree
├── /recommendations # AI Recommendations
│   ├── POST   /skin-analysis
│   ├── GET    /personalized
│   └── GET    /similar/:productId
├── /wishlist       # Wishlist
│   ├── GET    /
│   ├── POST   /:productId
│   └── DELETE /:productId
├── /cart           # Shopping Cart
│   ├── GET    /
│   ├── POST   /items
│   ├── PATCH  /items/:id
│   ├── DELETE /items/:id
│   └── POST   /promo
├── /orders         # Order Management
│   ├── POST   /
│   ├── GET    /
│   ├── GET    /:id
│   └── POST   /:id/complete
├── /reviews        # Reviews
│   ├── GET    /products/:productId/reviews
│   ├── POST   /products/:productId/reviews
│   ├── PATCH  /:id
│   └── DELETE /:id
├── /promotions     # Promotions
│   ├── POST   /
│   ├── GET    /
│   ├── PATCH  /:id
│   ├── DELETE /:id
│   └── POST   /validate
├── /shops          # Shop Management
│   ├── GET    /:id
│   ├── GET    /merchant
│   └── PATCH  /merchant
├── /ads            # Advertisements (Merchant)
│   ├── POST   /           # Create ad (draft)
│   ├── GET    /           # List own ads
│   ├── PATCH  /:id        # Update ad
│   ├── DELETE /:id        # Soft delete ad
│   ├── POST   /:id/pay    # Pay advertising fee
│   ├── POST   /:id/submit # Submit for approval
│   └── GET    /active     # List active ads (public)
├── /analytics      # Analytics
│   ├── GET    /merchant/dashboard
│   ├── GET    /merchant/sales
│   ├── GET    /merchant/products
│   ├── GET    /admin/dashboard
│   ├── GET    /admin/revenue
│   └── GET    /admin/users
├── /admin          # Admin Management
│   ├── GET    /users
│   ├── PATCH  /users/:id/status
│   ├── GET    /merchants
│   ├── PATCH  /merchants/:id/status
│   ├── GET    /reviews/pending
│   ├── POST   /reviews/:id/moderate
│   ├── GET    /ads                # List all ads / pending approval queue
│   ├── POST   /ads/:id/approve   # Approve advertisement
│   ├── POST   /ads/:id/reject    # Reject advertisement (with reason)
│   ├── GET    /commission              # Get commission settings
│   ├── PATCH  /commission              # Update commission rate
│   ├── GET    /commission/reports      # Get commission reports
│   ├── GET    /revenue                 # Get revenue KPI data
│   ├── GET    /revenue/trends          # Get revenue trend series
│   ├── GET    /revenue/targets         # Get revenue target & progress
│   ├── PUT    /revenue/targets         # Save/update revenue target
│   ├── GET    /revenue/forecast        # Get AI revenue forecast
│   ├── GET    /revenue/ad-fees         # Get ad fee revenue data
│   ├── GET    /revenue/payments        # Get payment status breakdown
│   ├── GET    /revenue/payouts         # Get payout list
│   └── POST   /revenue/payouts/:id/process  # Process a payout
└── /health         # Health Check
    └── GET    /
```

### 6.3 Frontend Route Structure (フロントエンドルート構成)

```
Routes:
├── /                          # Home (featured products, hero)
├── /login                     # Login page
├── /register                  # Registration page
├── /profile                   # User profile
├── /skin-analysis             # AI skin analysis
├── /recommendations           # Personalized recommendations
├── /products                  # Product list (search, filter)
├── /products/:slug            # Product detail
├── /wishlist                  # Wishlist
├── /cart                      # Shopping cart
├── /checkout                  # Checkout flow
├── /orders                    # Order history
├── /orders/:id                # Order detail
├── /shop-finder               # GPS-based shop finder
├── /merchant/
│   ├── /dashboard             # Merchant dashboard
│   ├── /products              # Product management
│   ├── /products/new          # Add product
│   ├── /products/:id/edit     # Edit product
│   ├── /promotions            # Promotions management
│   ├── /advertisements        # Advertisements management
│   └── /analytics             # Analytics
├── /admin/
│   ├── /dashboard             # Admin dashboard
│   ├── /users                 # User management
│   ├── /merchants             # Merchant management
│   ├── /reviews               # Review moderation
│   ├── /analytics             # Analytics
│   ├── /commission            # Commission management
│   └── /revenue               # Revenue management
├── /unauthorized              # 403 page
└── *                          # 404 page
```

### 6.4 Development Constraints & Assumptions (開発制約・前提条件)

- **Single-Tenant:** System designed for a single organization
- **Multi-Language:** UI supports English, Myanmar, Japanese from day one
- **Local Development:** Node.js, PostgreSQL, Redis on local machine
- **Reasonable Load:** Designed for typical e-commerce workload
- **AI Service:** AI skin analysis may use external API or stubbed for initial implementation
- **Payment Gateway:** Payment processing is stubbed (no real payment integration)

### 6.5 Future Extensibility Points (将来の拡張ポイント)

1. **AI Enhancement:** Advanced ML models for skin analysis
2. **Payment Gateway:** Real payment processing (Stripe, PayPal)
3. **Mobile App:** React Native mobile application
4. **Push Notifications:** Firebase Cloud Messaging
5. **Email Service:** Transactional emails (SendGrid, AWS SES)
6. **Cloud Storage:** AWS S3, Azure Blob for file storage
7. **Microservice Migration:** Independent scaling of services
8. **Advanced Analytics:** Business intelligence dashboards

### 6.6 API Requirements (API要件)

#### Authentication
- JWT-based authentication
- Token stored in HTTP-only cookie or Authorization header
- Token refresh mechanism
- Role-based middleware for protected routes

#### Request/Response Format
- All requests use JSON body (except file uploads)
- All responses follow consistent format:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message",
  "error": null
}
```

#### Error Response Format
```json
{
  "success": false,
  "data": null,
  "message": "Human-readable error message",
  "error": {
    "code": "ERROR_CODE",
    "details": { ... }
  }
}
```

#### Standard HTTP Status Codes
| Code | Usage |
|------|-------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request / Validation Error |
| 401 | Unauthorized / Invalid Token |
| 403 | Forbidden / Insufficient Permissions |
| 404 | Resource Not Found |
| 409 | Conflict (e.g., duplicate review) |
| 422 | Unprocessable Entity |
| 500 | Internal Server Error |

#### File Upload Requirements
- Use `multipart/form-data` for file uploads
- Max file size: 10MB
- Supported formats: JPG, PNG, WebP (images), PDF (documents)
- Store files in cloud storage (S3, GCS, etc.)
- Return public URLs for uploaded files

#### Rate Limiting
- Auth endpoints: 5 requests per minute per IP
- API endpoints: 100 requests per minute per user
- File upload: 10 requests per minute per user

### 6.7 Database Relationships (データベースリレーションシップ)

#### Entity Relationship Diagram
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   users     │────<│  merchants  │────<│  products   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  orders     │────<│ order_items │     │  reviews    │
└─────────────┘     └─────────────┘     └─────────────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  payments   │     │  coupons    │     │  promotions │
└─────────────┘     └─────────────┘     └─────────────┘
                                            │
                                            ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│advertisements│────<│ ad_payments │     │ ad_fee_hist │
└─────────────┘     └─────────────┘     └─────────────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ ad_settings │     │   shops     │     │ audit_logs  │
└─────────────┘     └─────────────┘     └─────────────┘

┌──────────────────┐     ┌──────────────────┐     ┌─────────────┐
│commission_settings│     │ revenue_targets  │     │   payouts   │
└──────────────────┘     └──────────────────┘     └─────────────┘
```

#### Key Relationships
| Relationship | Type | Description |
|--------------|------|-------------|
| users → merchants | 1:1 | One user can be one merchant |
| merchants → products | 1:N | One merchant has many products |
| users → orders | 1:N | One buyer has many orders |
| merchants → orders | 1:N | One merchant has many orders |
| orders → order_items | 1:N | One order has many items |
| products → reviews | 1:N | One product has many reviews |
| users → reviews | 1:N | One buyer has many reviews |
| merchants → advertisements | 1:N | One merchant has many ads |
| advertisements → ad_payments | 1:1 | One ad has one payment |
| ad_fee_settings → ad_fee_history | 1:N | Settings changes logged |
| merchants → payouts | 1:N | One merchant has many payouts |
| users → payouts | 1:N | Admin processes many payouts |

---

## 7. Acceptance Criteria & Success Metrics

### 7.1 Functional Acceptance Criteria (機能的受入基準)

- [ ] All three user roles can login and access their respective dashboards
- [ ] User registration and authentication work end-to-end
- [ ] AI skin analysis processes images and returns results
- [ ] Product browsing, search, and filtering work correctly
- [ ] Shopping cart operations (add, update, remove) function properly
- [ ] Checkout flow creates orders and updates inventory
- [ ] Merchant can manage products (CRUD operations)
- [ ] Merchant dashboard shows sales data
- [ ] Admin can moderate reviews and content
- [ ] All API endpoints enforce role-based access control
- [ ] Multi-language support works for EN, MY, JA

### 7.2 Non-Functional Acceptance Criteria (非機能的受入基準)

- [ ] Dashboard pages load in ≤ 2 seconds
- [ ] API response time ≤ 500ms (p95)
- [ ] All role-based access control enforced
- [ ] SQL injection and XSS vulnerabilities mitigated
- [ ] Database schema created via Prisma migrations
- [ ] Test coverage ≥ 80%

### 7.3 Success Metrics (成功指標)

- **User Registration:** > 100 users within first month
- **AI Analysis Usage:** > 50 analyses per day
- **Conversion Rate:** > 5% from browse to purchase
- **Merchant Adoption:** > 10 merchants within first quarter
- **System Uptime:** > 99% availability
- **User Satisfaction:** > 4.0 average rating

---

## 8. Appendix

### 8.1 Reference Terminology (用語集)

| Term | Definition |
|------|-----------|
| **AI Skin Analysis** | Machine learning-based analysis of facial images to determine skin type and conditions |
| **Smart Product Matching** | Algorithm that recommends products based on user's skin analysis results |
| **Merchant** | Seller who lists products on the marketplace |
| **Buyer** | End user who browses and purchases products |
| **Admin** | Platform administrator with full access |
| **SKU** | Stock Keeping Unit - unique product identifier |
| **RBAC** | Role-Based Access Control |
| **JWT** | JSON Web Token for authentication |
| **Soft Delete** | Logical deletion using is_active flag; records retained |

### 8.2 Prisma Schema Reference (Prismaスキーマリファレンス)

The complete database schema is defined in:
```
backend/prisma/schema.prisma
```

### 8.3 API Documentation (APIドキュメント)

Swagger/OpenAPI documentation is available at:
```
http://localhost:8080/api/docs
```

### 8.4 Environment Setup (環境構築)

See: `docs/guides/ENVIRONMENT_SETUP.md`

---

**Document Management (文書管理):**
- Author: Software Architect
- Created: 2026-08-03
- Last Updated: 2026-08-17
- Next Review: Phase 2 Planning

---

*End of REQUIREMENT_DEFINITION.md*
