# Cosmetics Finder 要件定義書

## Requirements Definition (要件定義)

---

## Document Control (ドキュメント管理)

| Attribute | Value |
| :--- | :--- |
| **Document ID** | SKM-REQ-001 |
| **System** | Cosmetics Finder |
| **Version** | 2.00 |
| **Created** | 2026-08-03 |
| **Last Updated** | 2026-08-19 |
| **Author** | Software Architect |
| **Status** | Released (承認済み) |

### Document Revision History

| Version | Date | Author | Description of Changes |
| :--- | :--- | :--- | :--- |
| 1.0 | 2026-08-03 | Software Architect | Initial requirements definition |
| 2.0 | 2026-08-19 | Software Architect | Clean rewrite: focused on roles, permissions, and features. Removed duplicate content and unnecessary technical details. |

---

## Table of Contents (目次)

1. [Project Overview](#1-project-overview)
2. [User Roles & Permissions](#2-user-roles--permissions)
3. [Buyer Features](#3-buyer-features)
4. [Merchant Features](#4-merchant-features)
5. [Admin Features](#5-admin-features)
6. [Shared Features](#6-shared-features)
7. [Business Rules](#7-business-rules)
8. [Acceptance Criteria](#8-acceptance-criteria)

---

## 1. Project Overview

### 1.1 Project Name
**Cosmetics Finder**

### 1.2 Purpose
AI-powered skincare marketplace that analyzes user skin conditions and recommends personalized products, connecting buyers with merchants.

### 1.3 Key Features
- AI skin analysis and personalized product recommendations
- Multi-vendor marketplace for skincare products
- Complete e-commerce workflow (browse → cart → checkout → order)
- Merchant tools for product and advertisement management
- Admin panel for platform management
- Multi-language support (English, Myanmar, Japanese)

---

## 2. User Roles & Permissions

### 2.1 Roles Overview

| Role | Description | Access Level |
|------|-------------|--------------|
| **Guest** | Non-logged-in visitor | Public pages only |
| **Buyer** | End user who browses and purchases | Shopping features, AI analysis |
| **Merchant** | Seller on the marketplace | Product/order management, advertisements |
| **Admin** | Platform administrator | Full platform management |

### 2.2 Permission Matrix

| Feature | Guest | Buyer | Merchant | Admin |
|---------|:-----:|:-----:|:--------:|:-----:|
| **Authentication** | | | | |
| Register/Login | ✅ | ✅ | ✅ | ✅ |
| View/Edit Own Profile | ❌ | ✅ | ✅ | ✅ |
| **Products** | | | | |
| Browse/Search Products | ✅ | ✅ | ✅ | ✅ |
| View Product Details | ✅ | ✅ | ✅ | ✅ |
| Create/Edit Products | ❌ | ❌ | ✅ | ❌ |
| Delete Products | ❌ | ❌ | ✅ | ✅ |
| **AI Skin Analysis** | | | | |
| Upload Photo & Analysis | ❌ | ✅ | ❌ | ❌ |
| View Analysis History | ❌ | ✅ | ❌ | ❌ |
| Compare Analyses | ❌ | ✅ | ❌ | ❌ |
| **Shopping** | | | | |
| Add to Cart | ❌ | ✅ | ❌ | ❌ |
| Checkout & Payment | ❌ | ✅ | ❌ | ❌ |
| View Order History | ❌ | ✅ | ❌ | ❌ |
| **Wishlist** | | | | |
| Add/Remove from Wishlist | ❌ | ✅ | ❌ | ❌ |
| **Reviews** | | | | |
| Write Reviews | ❌ | ✅ | ❌ | ❌ |
| View Reviews | ✅ | ✅ | ✅ | ✅ |
| Moderate Reviews | ❌ | ❌ | ❌ | ✅ |
| **Merchant Features** | | | | |
| Manage Shop Profile | ❌ | ❌ | ✅ | ✅ |
| Manage Promotions | ❌ | ❌ | ✅ | ❌ |
| Purchase Advertisements | ❌ | ❌ | ✅ | ❌ |
| View Order Insights | ❌ | ❌ | ✅ | ✅ |
| **Admin Features** | | | | |
| User Management | ❌ | ❌ | ❌ | ✅ |
| Merchant Approval | ❌ | ❌ | ❌ | ✅ |
| Advertisement Management | ❌ | ❌ | ❌ | ✅ |
| Revenue & Commission | ❌ | ❌ | ❌ | ✅ |
| Audit Log | ❌ | ❌ | ❌ | ✅ |

### 2.3 Merchant Approval States

| State | Can Do | Cannot Do |
|-------|--------|-----------|
| **Pending** | Login, view dashboard, edit profile | Create products, manage ads, view analytics |
| **Approved** | All merchant features | Shopping features (cart, checkout) |
| **Rejected** | Login, view rejection reason, resubmit | Any merchant business features |

### 2.4 Dashboard (After Login)

| Role | Dashboard | What User Sees |
|------|-----------|----------------|
| **Buyer** | Product Discovery Home | Search bar, product categories, featured products, personalized recommendations, promotional banners |
| **Merchant** | Product Management Home | Product list, quick actions (add product), order notifications, shop status summary |
| **Admin** | Platform Overview | User count, merchant count, pending approvals, revenue summary, recent activity |

#### Buyer Dashboard

- Search bar for products
- Product categories for browsing
- Featured/promoted products
- Personalized recommendations (based on AI analysis)
- Promotional advertisement banners
- Quick access to wishlist and cart

#### Merchant Dashboard

- Product list with stock status
- Quick action: Add new product
- Recent orders requiring attention
- Shop profile status
- Advertisement performance summary

#### Admin Dashboard

- Total users, merchants, orders
- Pending merchant approvals
- Pending advertisement approvals
- Platform revenue summary
- Recent system activity

---

## 3. Buyer Features

### 3.1 AI Skin Analysis

| Feature | Description |
|---------|-------------|
| Upload Photo | Upload facial image (JPG, PNG, WebP, max 10MB) |
| View Analysis Results | Skin type, conditions with severity, estimated age |
| View Recommendations | Personalized product recommendations with match scores |
| Analysis History | View all past analyses with date/time |
| Analysis Comparison | Compare multiple analyses side-by-side |
| Recommendation Explanation | Understand why each product was recommended |
| Recommendation Feedback | Rate recommendations as helpful/not helpful |

#### Analysis Flow
```
Upload Photo → AI Analysis → View Results → Get Recommendations → Save to History
```

### 3.2 Shopping

| Feature | Description |
|---------|-------------|
| Browse Products | Search and filter products by category and price |
| Product Details | View images, description, price, reviews, skin type compatibility |
| Wishlist | Save products for later |
| Cart | Add products, update quantities, view totals |
| Checkout | Enter shipping address, select payment method, review order |
| Order History | View past orders with status timeline |
| Order Tracking | Track order status from placed to delivered |
| Write Reviews | Rate and review purchased products |

### 3.3 Order Insights (Buyer)

| Feature | Description |
|---------|-------------|
| Order History | View all past orders |
| Order Detail | View order items, totals, payment status |
| Order Tracking | Track status timeline (placed → confirmed → shipped → delivered) |

---

## 4. Merchant Features

### 4.1 Product Management

| Feature | Description |
|---------|-------------|
| Create Products | Add new products with name, description, price, images |
| Edit Products | Update product information |
| Delete Products | Soft delete (deactivate) products |
| Manage Inventory | Update stock quantities |
| Product Images | Upload up to 10 images (JPG, PNG, WebP, max 5MB each) |

### 4.2 Shop Management

| Feature | Description |
|---------|-------------|
| Shop Profile | Create/edit shop name, description, logo, banner |
| Shop Settings | Address, phone, email, location |

### 4.3 Promotions

| Feature | Description |
|---------|-------------|
| Create Coupons | Discount codes (percentage or fixed amount) |
| Set Rules | Min order amount, max uses, expiry date |
| Manage Promotions | Edit/delete promotions, view usage statistics |

### 4.4 Advertisements

| Feature | Description |
|---------|-------------|
| View Packages | Browse available advertisement packages |
| Purchase Ad | Select package, upload image, set schedule, pay fee |
| Submit for Approval | Admin must approve before display |
| View Analytics | Impressions, clicks, click-through rate |
| Resubmit Rejected Ads | Edit and resubmit after rejection |

#### Advertisement Flow
```
Select Package → Upload Content → Pay Fee → Admin Review → Approved → Displayed
```

### 4.5 Order Insights (Merchant)

| Feature | Description |
|---------|-------------|
| Order History | View orders for own shop |
| Order Detail | View order items, customer info |
| Order Tracking | Track order status |
| Sales Summary | Daily/monthly sales overview |
| Revenue Summary | Total sales, average order value |
| Order Statistics | Orders by status (placed, confirmed, shipped, etc.) |

---

## 5. Admin Features

### 5.1 User Management

| Feature | Description |
|---------|-------------|
| View Users | List all users with search and filter |
| Toggle Status | Activate/deactivate user accounts |
| View User Details | Profile information and activity |

### 5.2 Merchant Management

| Feature | Description |
|---------|-------------|
| Review Applications | View merchant registration requests |
| Approve Merchants | Grant full merchant access |
| Reject Merchants | Reject with reason |
| View Merchant Status | Track approval history |

### 5.3 Advertisement Management

| Feature | Description |
|---------|-------------|
| Manage Packages | Create, edit, activate/deactivate ad packages |
| Set Pricing | Configure placement rates and tiers |
| Review Advertisements | Approve/reject merchant ads |
| View Ad Analytics | Platform-wide ad performance |
| Package History | Track pricing changes |

#### Advertisement Package Fields

| Placement | Where It Appears | Basic | Standard | Premium | Duration | Max Ads |
|-----------|------------------|-------|----------|---------|----------|---------|
| Homepage Banner | Top of home page | $3.00/day | $5.00/day | $8.00/day | 7 Days | 1 |
| Product Detail Sidebar | Side of product detail page | $2.00/day | $3.50/day | $6.00/day | 15 Days | 3 |
| Category Banner | Top of category pages | $2.50/day | $4.00/day | $7.00/day | 30 Days | 5 |
| Search Results Top | Above search results | $1.50/day | $2.50/day | $5.00/day | 7 Days | 6 |

#### Advertisement Display Rules

| Rule | Description |
|------|-------------|
| Approval Required | Only approved and active advertisements are displayed |
| Multiple Merchants | Multiple merchants may purchase the same advertisement package |
| Slider Limit | Maximum 5 advertisements are shown in each slider rotation |
| Priority Order | Advertisements are prioritized: Premium > Standard > Basic |
| Round-Robin | Advertisements within the same priority level are displayed using round-robin rotation |
| Auto Rotation | Slider automatically rotates every 5 seconds |
| Expiry Handling | Expired or inactive advertisements are excluded |
| Rejection Handling | Rejected advertisements are removed from all rotations |

### 5.4 Review Moderation

| Feature | Description |
|---------|-------------|
| View Reviews | All platform reviews |
| Moderate Reviews | Approve, reject, or flag reviews |
| Handle Reports | Review reported content |

### 5.5 Content Moderation

| Feature | Description |
|---------|-------------|
| Merchant Registration | Approve/reject new merchants |
| Product Moderation | Review reported products |
| Content Reports | Handle user-reported content |

### 5.6 Order Insights (Admin)

| Feature | Description |
|---------|-------------|
| All Orders | View all platform orders |
| Orders by Merchant | Filter orders by shop |
| Orders by Status | Filter by order status |

### 5.7 Revenue & Commission

| Feature | Description |
|---------|-------------|
| Platform Sales | Total revenue, order counts, and ad fees |
| Revenue Dashboard | Platform revenue trends |
| Commission Fee | Platform commission: 12% on each sale (fixed rate) |
| Ad Fee | Advertising fees from merchant ad purchases |
| Payouts | Process merchant payouts (net of commission and ad fees) |
| Revenue Targets | Set and track monthly/quarterly targets |

#### Commission Calculation
```
Commission = Order Total × 12%

Example:
- Order Total: $100.00
- Commission Rate: 12% (fixed)
- Commission: $100.00 × 0.12 = $12.00
- Merchant Receives: $88.00
```

#### Default Ad Fee Settings

| Placement | Where It Appears | Basic | Standard | Premium |
|-----------|------------------|-------|----------|---------|
| Homepage Banner | Top of home page | $3.00/day | $5.00/day | $8.00/day |
| Product Detail Sidebar | Side of product detail page | $2.00/day | $3.50/day | $6.00/day |
| Category Banner | Top of category pages | $2.50/day | $4.00/day | $7.00/day |
| Search Results Top | Above search results | $1.50/day | $2.50/day | $5.00/day |

#### Ad Fee Calculation Formula
```
Total Fee = Daily Rate × Number of Days × Tier Multiplier

Tier Multipliers:
- Basic: 1.0x
- Standard: 1.5x
- Premium: 2.0x

Example:
- Placement: Homepage Slider
- Tier: Standard
- Duration: 7 days
- Calculation: $5.00 × 7 × 1.5 = $52.50
```

#### Payout Calculation
```
Net Payout = Total Sales - Commission (12%) - Ad Fees

Example:
- Total Sales: $1,000.00
- Commission (12%): $120.00
- Ad Fees: $52.50
- Net Payout: $827.50
```

### 5.8 Audit Log

| Feature | Description |
|---------|-------------|
| View Audit Trail | All significant system actions |
| Track Changes | Who did what, when, with before/after values |
| Filter by Action | Search by user, action type, entity |

#### Audited Actions
- User login/logout, password reset
- Merchant approval/rejection
- Product create/update/delete
- Advertisement create/approve/reject
- Order status changes
- Commission rate changes
- Payout processing

---

## 6. Shared Features

### 6.1 Profile & Settings

| Feature | Description | Roles |
|---------|-------------|-------|
| View Profile | View own profile information | All |
| Edit Profile | Update name, email, phone, avatar | All |
| Change Password | Update account password | All |
| Language Settings | Switch language (EN/MY/JA) | All |
| Notification Preferences | Configure notification settings | All |

### 6.2 Notification System

| Notification Type | Trigger | Recipient |
|-------------------|---------|-----------|
| Order Confirmed | Merchant confirms order | Buyer |
| Order Shipped | Merchant ships order | Buyer |
| Order Delivered | Order received | Buyer |
| AI Analysis Ready | Analysis completed | Buyer |
| New Recommendation | Products matched | Buyer |
| Merchant Approved | Admin approves | Merchant |
| Merchant Rejected | Admin rejects | Merchant |
| New Order | Buyer places order | Merchant |
| Ad Approved | Admin approves ad | Merchant |
| Ad Rejected | Admin rejects ad | Merchant |
| New Merchant Registration | Merchant registers | Admin |
| New Advertisement | Merchant submits ad | Admin |
| Review Reported | Buyer reports review | Admin |

### 6.3 Order Insights (Shared)

All roles see only their own data:
- **Buyer**: Own order history and tracking
- **Merchant**: Orders for own shop only
- **Admin**: All platform orders

---

## 7. Business Rules

### 7.1 Authentication
- JWT access token: 15-minute expiry
- Refresh token: 7-day expiry with rotation
- Password: Minimum 8 characters, hashed with Argon2
- Rate limiting: 3 reset requests per email per hour

### 7.2 Products
- Only active products appear in search results
- Stock cannot go below 0
- Low stock threshold: 10 units (default)
- Maximum 10 images per product

### 7.3 Orders
- Status flow: placed → confirmed → packed → shipped → out_for_delivery → delivered
- Prices locked at order creation time
- Stock decremented atomically on order

### 7.4 Reviews
- Only verified purchasers can review
- One review per user per product
- Rating: 1-5 stars
- Reviews approved by default, can be moderated

### 7.5 Promotions
- One coupon per order
- Code must be unique
- Cannot exceed max uses
- Discount cannot go below $0

### 7.6 Advertisements
- Maximum 5 active ads per week
- Payment required before submission
- Admin approval required before display
- Rejected ads can be resubmitted
- Refund on rejection

### 7.7 Monetization
- Platform commission on each sale (configurable rate)
- Advertisement fees (placement-based pricing)
- Merchant payouts (net of commission and ad fees)

### 7.8 Security
- Role-based access control (RBAC) enforced on backend
- Ownership verification for all resources
- Audit logging for sensitive actions
- Never expose passwords, tokens, or secrets

---

## 8. Acceptance Criteria

### 8.1 Functional
- [ ] All roles can login and access their dashboards
- [ ] AI skin analysis processes images and returns results
- [ ] Product browsing, search, and filtering work correctly
- [ ] Shopping cart and checkout flow complete successfully
- [ ] Merchant can manage products and promotions
- [ ] Admin can approve merchants and moderate content
- [ ] Advertisement lifecycle works end-to-end
- [ ] Order tracking shows correct status timeline
- [ ] Notifications delivered for all event types
- [ ] Multi-language support works for EN, MY, JA

### 8.2 Security
- [ ] Buyer cannot access another buyer's data
- [ ] Merchant cannot access another merchant's orders
- [ ] Pending merchant cannot create products or ads
- [ ] Rejected merchant cannot access business features
- [ ] Unapproved advertisements never shown to buyers
- [ ] Audit logs cannot be modified or deleted
- [ ] Sensitive data never logged

### 8.3 Performance
- [ ] Dashboard pages load in ≤ 2 seconds
- [ ] API response time ≤ 500ms (p95)
- [ ] Search results returned in ≤ 3 seconds

---

**Document Management:**
- Author: Software Architect
- Created: 2026-08-03
- Last Updated: 2026-08-19
- Next Review: Phase 2 Planning

---

*End of REQUIREMENT_DEFINITION.md*
