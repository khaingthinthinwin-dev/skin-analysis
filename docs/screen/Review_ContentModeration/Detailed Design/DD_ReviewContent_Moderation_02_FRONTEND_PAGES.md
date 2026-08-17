# DD_MOD_02 — Frontend Pages (Review & Content Moderation)

> **Doc ID:** SKM-DD-MOD-02 | **Version:** 1.0 | **Status:** Released  
> **Last Updated:** 2026-08-17

---

## 1. Overview

The Review & Content Moderation module consists of four admin pages, each with a corresponding detail modal. All pages share a common `DashboardLayout` with sidebar navigation, and use server-side pagination, tab-based filtering, and real-time search.

| Page | File Path | Route | Purpose |
|------|-----------|-------|---------|
| Admin Reviews Dashboard | `frontend/src/pages/admin/AdminReviews.tsx` | `/admin/reviews` | View, moderate, and manage all product reviews |
| Admin Merchants Management | `frontend/src/pages/admin/AdminMerchants.tsx` | `/admin/merchants` | View, approve, or reject merchant registrations |
| Product Content Moderation | `frontend/src/pages/admin/AdminContent.tsx` | `/admin/content` | View all products, deactivate/reactivate violating content |
| Users Management | `frontend/src/pages/admin/AdminUsers.tsx` | `/admin/users` | View all users, activate/deactivate user accounts |

**Shared Layout:** `DashboardLayout.tsx` (admin sidebar + page header + content area)

---

## 2. Layout Structure

### 2.1 Reviews Dashboard Layout (`/admin/reviews`)

```
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [A] ADMIN SIDEBAR                   │   │
│  │   Dashboard / Users / Merchants / Reviews / ...  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [B] PAGE HEADER                     │   │
│  │   Page Title: "Review Moderation"                │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [C] STATS BAR (cond.)               │   │
│  │   Total | Approved | Rejected                    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [D] FILTER TABS                     │   │
│  │   All | Approved | Rejected                      │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │   [E] SEARCH + SORT BAR                         │   │
│  │   [Search Input] [Sort Dropdown] [Bulk Actions]  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [F] REVIEWS TABLE                   │   │
│  │   Checkbox | Avatar | User | Product | Rating    │   │
│  │   Title | Status Badge | Date | Actions Dropdown │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [G] PAGINATION                      │   │
│  │   < 1 2 3 ... 10 >    Page Size: [20]           │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Review Detail Modal Layout

```
┌─────────────────────────────────────────────────────────┐
│                    MODAL OVERLAY                         │
│              ┌─────────────────────────────┐            │
│              │   [H] MODAL HEADER          │            │
│              │   "Review Detail"  [X Close] │            │
│              ├─────────────────────────────┤            │
│              │                             │            │
│              │   [I] USER INFO CARD        │            │
│              │   Avatar | Name | Email     │            │
│              │   Review Count              │            │
│              │                             │            │
│              │   [J] PRODUCT INFO CARD     │            │
│              │   Image | Name | Price      │            │
│              │   Link to product detail    │            │
│              │                             │            │
│              │   [K] REVIEW CONTENT        │            │
│              │   Rating Stars | Title      │            │
│              │   Body Text | Images        │            │
│              │   Verified Purchase Badge   │            │
│              │                             │            │
│              │   [L] MODERATION REASON     │            │
│              │   Textarea (conditional)    │            │
│              │                             │            │
│              │   [M] ACTION BUTTONS        │            │
│              │   [Approve] [Reject] [Delete]│            │
│              └─────────────────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

### 2.3 Merchants Management Layout (`/admin/merchants`)

```
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [N] PAGE HEADER                     │   │
│  │   Page Title: "Merchant Management"              │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [O] FILTER TABS                     │   │
│  │   All | Pending Approval | Approved | Rejected   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │   [P] SEARCH BAR                                │   │
│  │   [Search Input]                                 │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [Q] MERCHANTS TABLE                 │   │
│  │   Checkbox | Logo | Shop Name | User Name        │   │
│  │   Registration Date | Status Badge | Actions     │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [R] PAGINATION                      │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 2.4 Merchant Detail Modal Layout

```
┌─────────────────────────────────────────────────────────┐
│                    MODAL OVERLAY                         │
│              ┌─────────────────────────────┐            │
│              │   [S] MODAL HEADER          │            │
│              │   "Merchant Detail" [X Close]│            │
│              ├─────────────────────────────┤            │
│              │                             │            │
│              │   [T] SHOP INFO CARD        │            │
│              │   Logo | Banner | Name      │            │
│              │   Description               │            │
│              │                             │            │
│              │   [U] LICENSE VIEWER        │            │
│              │   PDF Display / Download    │            │
│              │                             │            │
│              │   [V] USER INFO CARD        │            │
│              │   Name | Email | Phone      │            │
│              │   Registration Date         │            │
│              │                             │            │
│              │   [W] REJECTION REASON      │            │
│              │   Textarea (conditional)    │            │
│              │                             │            │
│              │   [X] ACTION BUTTONS        │            │
│              │   [Approve] [Reject]        │            │
│              └─────────────────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

### 2.5 Product Content Moderation Layout (`/admin/content`)

```
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [Y] PAGE HEADER                     │   │
│  │   Page Title: "Product Content Moderation"       │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [AA] STATS BAR (cond.)              │   │
│  │   Total | Active | Inactive                      │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [BB] FILTER TABS                    │   │
│  │   All | Active | Inactive                        │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │   [CC] SEARCH + SORT BAR                        │   │
│  │   [Search Input] [Sort Dropdown] [Bulk Actions]  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [DD] PRODUCTS TABLE                 │   │
│  │   Checkbox | Image | Name | Shop | Price         │   │
│  │   Status Badge | Owner | Date | Actions Dropdown │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [EE] PAGINATION                     │   │
│  │   < 1 2 3 ... 10 >    Page Size: [20]           │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 2.6 Product Moderation Modal Layout

```
┌─────────────────────────────────────────────────────────┐
│                    MODAL OVERLAY                         │
│              ┌─────────────────────────────┐            │
│              │   [FF] MODAL HEADER         │            │
│              │   "Product Moderation"       │            │
│              │              [X Close]       │            │
│              ├─────────────────────────────┤            │
│              │                             │            │
│              │   [GG] PRODUCT INFO CARD    │            │
│              │   Image | Name | Price      │            │
│              │   Description               │            │
│              │   Category | Shop Name      │            │
│              │                             │            │
│              │   [HH] PRODUCT IMAGES       │            │
│              │   Gallery (grid layout)     │            │
│              │                             │            │
│              │   [II] SHOP OWNER CARD      │            │
│              │   Shop Logo | Name          │            │
│              │   Owner Name | Email        │            │
│              │                             │            │
│              │   [JJ] STATUS INFO          │            │
│              │   Current Status Badge      │            │
│              │   Created Date              │            │
│              │   Last Updated              │            │
│              │                             │            │
│              │   [KK] MODERATION REASON    │            │
│              │   Textarea (conditional)    │            │
│              │                             │            │
│              │   [LL] ACTION BUTTONS       │            │
│              │   [Deactivate] [Reactivate] │            │
│              └─────────────────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

### 2.7 Users Management Layout (`/admin/users`)

```
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [MM] PAGE HEADER                    │   │
│  │   Page Title: "User Management"                  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [NN] STATS BAR (cond.)              │   │
│  │   Total | Active | Inactive | Admin              │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [OO] FILTER TABS                    │   │
│  │   All | Active | Inactive | Admin                │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │   [PP] SEARCH BAR                                │   │
│  │   [Search Input]                                 │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [QQ] USERS TABLE                    │   │
│  │   Avatar | Name | Email | Role                   │   │
│  │   Status Badge | Joined Date | Actions Dropdown  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [RR] PAGINATION                     │   │
│  │   < 1 2 3 ... 10 >    Page Size: [20]           │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 2.8 User Detail Modal Layout

```
┌─────────────────────────────────────────────────────────┐
│                    MODAL OVERLAY                         │
│              ┌─────────────────────────────┐            │
│              │   [SS] MODAL HEADER         │            │
│              │   "User Detail" [X Close]    │            │
│              ├─────────────────────────────┤            │
│              │                             │            │
│              │   [TT] USER INFO CARD       │            │
│              │   Avatar | Name | Email     │            │
│              │   Phone | Role | Joined     │            │
│              │                             │            │
│              │   [UU] ACCOUNT STATUS       │            │
│              │   Current Status Badge      │            │
│              │   Last Login                │            │
│              │   Review Count              │            │
│              │                             │            │
│              │   [VV] ACTION BUTTONS       │            │
│              │   [Deactivate] [Reactivate] │            │
│              └─────────────────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Form State & Validation (React Hook Form + Zod)

All moderation forms use `react-hook-form` with `zodResolver` for schema validation.

### 3.1 Review Moderation Schema

```typescript
// frontend/src/features/admin/schemas/admin.schema.ts
import { z } from 'zod';

export const moderateReviewSchema = z.object({
  action: z.enum(['approve', 'reject'], {
    required_error: 'Action must be approve or reject',
  }),
  reason: z.string().max(500, 'Reason must not exceed 500 characters').optional(),
}).refine(
  (data) => data.action !== 'reject' || (data.reason && data.reason.trim().length > 0),
  { message: 'Rejection reason is required', path: ['reason'] }
);

export const moderateMerchantSchema = z.object({
  status: z.enum(['approved', 'rejected'], {
    required_error: 'Status must be approved or rejected',
  }),
  reason: z.string().max(500, 'Reason must not exceed 500 characters').optional(),
}).refine(
  (data) => data.status !== 'rejected' || (data.reason && data.reason.trim().length > 0),
  { message: 'Rejection reason is required', path: ['reason'] }
);

export const moderateProductSchema = z.object({
  isActive: z.boolean(),
  reason: z.string().max(500, 'Reason must not exceed 500 characters').optional(),
}).refine(
  (data) => data.isActive !== false || (data.reason && data.reason.trim().length > 0),
  { message: 'Deactivation reason is required', path: ['reason'] }
);

export const moderateUserSchema = z.object({
  isActive: z.boolean(),
});

export type ModerateReviewFormData = z.infer<typeof moderateReviewSchema>;
export type ModerateMerchantFormData = z.infer<typeof moderateMerchantSchema>;
export type ModerateProductFormData = z.infer<typeof moderateProductSchema>;
export type ModerateUserFormData = z.infer<typeof moderateUserSchema>;
```

### 3.2 Review Moderation Hook

```typescript
// frontend/src/features/admin/hooks/useModerateReview.ts
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { moderateReviewSchema, type ModerateReviewFormData } from '../schemas/admin.schema';

export function useModerateReview() {
  const methods = useForm<ModerateReviewFormData>({
    resolver: zodResolver(moderateReviewSchema),
    defaultValues: {
      action: undefined,
      reason: '',
    },
    mode: 'onChange',
  });

  const selectedAction = methods.watch('action');

  return { methods, selectedAction };
}
```

### 3.3 Merchant Moderation Hook

```typescript
// frontend/src/features/admin/hooks/useModerateMerchant.ts
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { moderateMerchantSchema, type ModerateMerchantFormData } from '../schemas/admin.schema';

export function useModerateMerchant() {
  const methods = useForm<ModerateMerchantFormData>({
    resolver: zodResolver(moderateMerchantSchema),
    defaultValues: {
      status: undefined,
      reason: '',
    },
    mode: 'onChange',
  });

  const selectedStatus = methods.watch('status');

  return { methods, selectedStatus };
}
```

### 3.4 Product Moderation Hook

```typescript
// frontend/src/features/admin/hooks/useModerateProduct.ts
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { moderateProductSchema, type ModerateProductFormData } from '../schemas/admin.schema';

export function useModerateProduct() {
  const methods = useForm<ModerateProductFormData>({
    resolver: zodResolver(moderateProductSchema),
    defaultValues: {
      isActive: true,
      reason: '',
    },
    mode: 'onChange',
  });

  return { methods };
}
```

---

## 4. Sub-Components

### 4.1 ReviewsTable Component

- **File Path:** `frontend/src/features/admin/components/ReviewsTable.tsx`
- Renders DataTable with columns: checkbox, avatar, user name, product name, rating stars, title, status badge, created date, actions dropdown
- Select-all checkbox toggles all row checkboxes
- Actions dropdown: View Detail, Approve, Reject, Delete
- Bulk action buttons enable when selections are made

### 4.2 ReviewDetailModal Component

- **File Path:** `frontend/src/features/admin/components/ReviewDetailModal.tsx`
- Fetches full review data on open
- Displays User Info Card (avatar, name, email, review count)
- Displays Product Info Card (image, name, price, link to `/products/:slug`)
- Displays Review Content (rating, title, body, images gallery, verified purchase badge)
- Shows Moderation Reason textarea (conditional on reject action)
- Action buttons: Approve, Reject, Delete
- Delete requires confirmation dialog

### 4.3 MerchantsTable Component

- **File Path:** `frontend/src/features/admin/components/MerchantsTable.tsx`
- Renders DataTable with columns: checkbox, shop logo, shop name, user name, registration date, status badge, actions dropdown
- Actions dropdown: View Detail, Approve, Reject

### 4.4 MerchantDetailModal Component

- **File Path:** `frontend/src/features/admin/components/MerchantDetailModal.tsx`
- Fetches full merchant data on open
- Displays Shop Info Card (logo, banner, name, description)
- Displays License PDF Viewer with download button
- Displays User Info Card (name, email, phone, registration date)
- Shows Rejection Reason textarea (conditional on reject action)
- Action buttons: Approve, Reject

### 4.5 ProductsTable Component

- **File Path:** `frontend/src/features/admin/components/ProductsTable.tsx`
- Renders DataTable with columns: checkbox, thumbnail, product name (link), shop name, price, status badge, owner, created date, actions dropdown
- Actions dropdown: View Detail, Deactivate, Reactivate
- Bulk action buttons: Deactivate Selected, Reactivate Selected

### 4.6 ProductModerationModal Component

- **File Path:** `frontend/src/features/admin/components/ProductModerationModal.tsx`
- Fetches full product data on open
- Displays Product Info Card (image, name, price, description, category, shop name)
- Displays Product Images Gallery (grid layout)
- Displays Shop Owner Card (logo, shop name, owner name, owner email)
- Displays Status Info (status badge, created date, last updated)
- Shows Moderation Reason textarea (conditional on deactivate action)
- Action buttons: Deactivate, Reactivate
- Deactivate requires confirmation dialog

### 4.7 UsersTable Component

- **File Path:** `frontend/src/features/admin/components/UsersTable.tsx`
- Renders DataTable with columns: avatar, user name, email, role, status badge, joined date, actions dropdown
- Actions dropdown: View Detail, Deactivate, Reactivate
- Deactivate hidden for current admin (self-deactivation prevention)

### 4.8 UserDetailModal Component

- **File Path:** `frontend/src/features/admin/components/UserDetailModal.tsx`
- Fetches full user data on open
- Displays User Info Card (avatar, name, email, phone, role, joined date)
- Displays Account Status (status badge, last login, review count)
- Action buttons: Deactivate, Reactivate
- Deactivate button hidden for current admin

### 4.9 ModerationReasonForm Component

- **File Path:** `frontend/src/features/admin/components/ModerationReasonForm.tsx`
- Shared textarea component for rejection/deactivation reasons
- Character count display (max 500)
- Required validation when rejecting/deactivating

### 4.10 StatsBar Component

- **File Path:** `frontend/src/features/admin/components/StatsBar.tsx`
- Shared stats display with colored badges
- Props: `stats: Array<{ label: string; value: number; color?: string }>`

### 4.11 ConfirmationDialog Component

- **File Path:** `frontend/src/features/admin/components/ConfirmationDialog.tsx`
- AlertDialog for destructive actions (delete, reject, deactivate)
- Props: `title`, `description`, `onConfirm`, ` onCancel`

---

## 5. Action Buttons & Handlers

### 5.1 Approve Review

- **Button Type:** `submit`
- **Validation:** Uses Zod `moderateReviewSchema`
- **Action:**
  1. Call `adminService.moderateReview(reviewId, { action: 'approve' })`
  2. Close modal
  3. Show success toast "Review approved"
  4. Refresh reviews list
- **Error Handling:** 409 Conflict → "Review is already approved"; 403 → "You do not have permission"; 404 → "Review not found"

### 5.2 Reject Review

- **Button Type:** `submit`
- **Validation:** Uses Zod `moderateReviewSchema` (reason required)
- **Action:**
  1. Show moderation reason textarea
  2. Validate reason is not empty
  3. Call `adminService.moderateReview(reviewId, { action: 'reject', reason })`
  4. Close modal
  5. Show success toast "Review rejected"
  6. Refresh reviews list
- **Error Handling:** 400 → "Rejection reason is required"; 409 → "Review is already rejected"

### 5.3 Delete Review

- **Button Type:** `button`
- **Action:**
  1. Show confirmation dialog "Are you sure you want to permanently delete this review? This action cannot be undone."
  2. On confirm: Call `adminService.deleteReview(reviewId)`
  3. Close modal
  4. Show success toast "Review deleted"
  5. Refresh reviews list
- **Error Handling:** 404 → "Review not found"

### 5.4 Bulk Approve Reviews

- **Button Type:** `button`
- **Action:**
  1. Show confirmation dialog "Approve {count} selected reviews?"
  2. Call `adminService.bulkModerateReviews({ ids, action: 'approve' })`
  3. Show success toast "{count} reviews approved"
  4. Refresh list, clear selection

### 5.5 Bulk Reject Reviews

- **Button Type:** `button`
- **Action:**
  1. Open reason modal (reason required)
  2. Call `adminService.bulkModerateReviews({ ids, action: 'reject', reason })`
  3. Show success toast "{count} reviews rejected"
  4. Refresh list, clear selection

### 5.6 Bulk Delete Reviews

- **Button Type:** `button`
- **Action:**
  1. Show confirmation dialog "Permanently delete {count} selected reviews? This cannot be undone."
  2. Call `adminService.bulkDeleteReviews({ ids })`
  3. Show success toast "{count} reviews deleted"
  4. Refresh list, clear selection

### 5.7 Approve Merchant

- **Button Type:** `submit`
- **Validation:** Uses Zod `moderateMerchantSchema`
- **Action:**
  1. Call `adminService.moderateMerchant(merchantId, { status: 'approved' })`
  2. Close modal
  3. Show success toast "Merchant approved"
  4. Refresh merchants list
- **Error Handling:** 409 → "Merchant is already approved"; 403 → "You do not have permission"

### 5.8 Reject Merchant

- **Button Type:** `submit`
- **Validation:** Uses Zod `moderateMerchantSchema` (reason required)
- **Action:**
  1. Show rejection reason textarea
  2. Validate reason is not empty
  3. Call `adminService.moderateMerchant(merchantId, { status: 'rejected', reason })`
  4. Close modal
  5. Show success toast "Merchant rejected"
  6. Refresh merchants list
- **Error Handling:** 400 → "Rejection reason is required"; 409 → "Merchant is already rejected"

### 5.9 Deactivate Product

- **Button Type:** `submit`
- **Validation:** Uses Zod `moderateProductSchema` (reason required)
- **Action:**
  1. Show moderation reason textarea
  2. Validate reason is not empty
  3. Show confirmation dialog "Are you sure you want to deactivate this product? It will no longer be visible to buyers."
  4. Call `adminService.moderateProduct(productId, { isActive: false, reason })`
  5. Close modal
  6. Show success toast "Product deactivated"
  7. Refresh products list
- **Error Handling:** 400 → "Deactivation reason is required"; 409 → "Product is already inactive"

### 5.10 Reactivate Product

- **Button Type:** `submit`
- **Validation:** Uses Zod `moderateProductSchema`
- **Action:**
  1. Show confirmation dialog "Are you sure you want to reactivate this product? It will become visible to buyers again."
  2. Call `adminService.moderateProduct(productId, { isActive: true })`
  3. Close modal
  4. Show success toast "Product reactivated"
  5. Refresh products list
- **Error Handling:** 409 → "Product is already active"

### 5.11 Bulk Deactivate Products

- **Button Type:** `button`
- **Action:**
  1. Open reason modal (reason required)
  2. Show confirmation dialog "Deactivate {count} selected products? They will no longer be visible to buyers."
  3. Call `adminService.bulkModerateProducts({ ids, isActive: false, reason })`
  4. Show success toast "{count} products deactivated"
  5. Refresh list, clear selection

### 5.12 Bulk Reactivate Products

- **Button Type:** `button`
- **Action:**
  1. Show confirmation dialog "Reactivate {count} selected products?"
  2. Call `adminService.bulkModerateProducts({ ids, isActive: true })`
  3. Show success toast "{count} products reactivated"
  4. Refresh list, clear selection

### 5.13 Deactivate User

- **Button Type:** `submit`
- **Validation:** Uses Zod `moderateUserSchema`
- **Action:**
  1. Show confirmation dialog "Are you sure you want to deactivate this user? They will not be able to log in."
  2. Call `adminService.moderateUser(userId, { isActive: false })`
  3. Close modal
  4. Show success toast "User deactivated"
  5. Refresh users list
- **Error Handling:** 400 → "You cannot deactivate your own account"; 409 → "User is already inactive"

### 5.14 Reactivate User

- **Button Type:** `submit`
- **Validation:** Uses Zod `moderateUserSchema`
- **Action:**
  1. Show confirmation dialog "Are you sure you want to reactivate this user? They will be able to log in again."
  2. Call `adminService.moderateUser(userId, { isActive: true })`
  3. Close modal
  4. Show success toast "User reactivated"
  5. Refresh users list
- **Error Handling:** 409 → "User is already active"

---

## 6. Lookup Data

### 6.1 Review Status Options

| Value | Label (EN) | Label (JA) | Badge Color |
|-------|------------|------------|-------------|
| `approved` | Approved | 承認済み | `bg-green-100 text-green-800` |
| `rejected` | Rejected | 却下済み | `bg-red-100 text-red-800` |

### 6.2 Merchant Status Options

| Value | Label (EN) | Label (JA) | Badge Color |
|-------|------------|------------|-------------|
| `pending` | Pending Approval | 承認待ち | `bg-amber-100 text-amber-800` |
| `approved` | Approved | 承認済み | `bg-green-100 text-green-800` |
| `rejected` | Rejected | 却下済み | `bg-red-100 text-red-800` |

### 6.3 Product Status Options

| Value | Label (EN) | Label (JA) | Badge Color |
|-------|------------|------------|-------------|
| `active` | Active | 有効 | `bg-green-100 text-green-800` |
| `inactive` | Inactive | 無効 | `bg-red-100 text-red-800` |

### 6.4 User Status Options

| Value | Label (EN) | Label (JA) | Badge Color |
|-------|------------|------------|-------------|
| `active` | Active | 有効 | `bg-green-100 text-green-800` |
| `inactive` | Inactive | 無効 | `bg-red-100 text-red-800` |

### 6.5 User Role Options

| Value | Label (EN) | Label (JA) |
|-------|------------|------------|
| `buyer` | Buyer | 購入者 |
| `merchant` | Merchant | 出品者 |
| `admin` | Admin | 管理者 |

### 6.6 Sort Options — Reviews

| Value | Label (EN) | Label (JA) | API Params |
|-------|------------|------------|------------|
| `newest` | Newest | 新規順 | `sort=createdAt&order=desc` |
| `oldest` | Oldest | 古い順 | `sort=createdAt&order=asc` |
| `ratingHigh` | Rating (High-Low) | 評価（高→低） | `sort=rating&order=desc` |
| `ratingLow` | Rating (Low-High) | 評価（低→高） | `sort=rating&order=asc` |

### 6.7 Sort Options — Products

| Value | Label (EN) | Label (JA) | API Params |
|-------|------------|------------|------------|
| `newest` | Newest | 新規順 | `sort=createdAt&order=desc` |
| `oldest` | Oldest | 古い順 | `sort=createdAt&order=asc` |
| `priceHigh` | Price (High-Low) | 価格（高→低） | `sort=price&order=desc` |
| `priceLow` | Price (Low-High) | 価格（低→高） | `sort=price&order=asc` |
| `nameAZ` | Name (A-Z) | 名前（A-Z） | `sort=name&order=asc` |
| `nameZA` | Name (Z-A) | 名前（Z-A） | `sort=name&order=desc` |

---

## 7. Error Handling

### 7.1 Field-Level Errors

- Red border on invalid input
- Inline error message below the field
- Real-time validation on blur and change

### 7.2 Form-Level Errors

| HTTP Status | Error Code | Scenario | UI Display |
|-------------|------------|----------|------------|
| `400` | `BAD_REQUEST` | Validation failures (missing reason) | Field-level inline errors |
| `403` | `FORBIDDEN` | Non-admin user | Toast: "You do not have permission" |
| `404` | `NOT_FOUND` | Resource not found | Toast: "Resource not found" |
| `409` | `CONFLICT` | Already in target state | Toast: "Already approved/rejected/active/inactive" |
| `500` | `INTERNAL_SERVER_ERROR` | Server error | Toast: "Something went wrong. Please try again" |
| Network | — | Connection error | Toast: "Network error. Please check your connection" |

### 7.3 Loading States

- Spinner on submit buttons during API calls
- Skeleton loaders on table initial load
- Disable form inputs during submission
- Prevent double submission
- Modal lazy loading

---

## 8. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_MOD_01](./DD_ReviewContent_Moderation_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_MOD_03](./DD_ReviewContent_Moderation_03_API_ENDPOINTS.md) | Backend REST API contract |
| [DD_MOD_04](./DD_ReviewContent_Moderation_04_DTOS_AND_TYPES.md) | DTO and type definitions |
| [DD_MOD_05](./DD_ReviewContent_Moderation_05_BUSINESS_LOGIC.md) | Backend business rules |
| [機能設計書_Review_Content_Moderation](../機能設計書_Review_Content_Moderation.md) | Full functional specification |
| [画面項目設計書_Review_Content_Moderation](../画面項目設計書_Review_Content_Moderation.md) | Screen items specification |
