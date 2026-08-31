# DD_PROMO_02 — Frontend Page (Promotion List / Create / Edit)

> **Doc ID:** SKM-DD-PROMO-02 | **Version:** 1.0 | **Status:** Draft  
> **Last Updated:** 2026-08-25

---

## 1. Overview

The Promotion Management frontend consists of three screens: `PromotionListPage`, `PromotionCreatePage`, and `PromotionEditPage`. All share the `DashboardLayout` (sidebar + header) for merchant pages. The list screen supports search, status filtering, pagination, active-status toggling, and hard delete with a confirmation dialog. The create/edit screens use a single reusable `PromotionForm` with React Hook Form + Zod validation. For merchants with `pending`/`rejected` license status, the list renders in a restricted read-only mode with a status banner and hidden mutation controls.

- **File Path (List):** `frontend/src/pages/merchant/promotions/index.tsx`
- **File Path (Create):** `frontend/src/pages/merchant/promotions/new.tsx`
- **File Path (Edit):** `frontend/src/pages/merchant/promotions/[id]/edit.tsx`
- **Route (List):** `/merchant/promotions`
- **Route (Create):** `/merchant/promotions/new`
- **Route (Edit):** `/merchant/promotions/:id/edit`
- **Shared Layout:** `DashboardLayout.tsx`

---

## 2. Layout Structure

### 2.1 Promotion List Page Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ DashboardLayout Header (Language EN/JA/MY | Theme Toggle)       │
├───────────┬─────────────────────────────────────────────────────┤
│ Sidebar   │  [A] Page Header "Promotion Management" +Breadcrumb│
│ Products  │                                                     │
│ Orders    │  [G] Pending Banner (when license pending/rejected) │
│ Promotions│                                                     │
│ ...       │  [B] Action Bar                                     │
│           │   [Search Input] [Status Filter] [Add New ✗ hidden] │
│           │                                                     │
│           │  [C] Promotion Table                                │
│           │   Code | Desc | Type | Discount | Usage | Expiry   │
│           │   Status | Edit | Delete | Toggle                  │
│           │                                                     │
│           │  [D] Pagination  Page x of y (n promotions)         │
│           └─────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────┘
```

**Restricted (pending/rejected) state:** `PendingBanner` is shown and `Add Promotion`, `Edit`, `Delete`, and `Toggle Active` controls are hidden. `Search`, `Status Filter`, and pagination remain functional (read-only view).

### 2.2 Promotion Form Layout (Create/Edit)

```
┌─────────────────────────────────────────────────────────────────┐
│ DashboardLayout Header  (Language, Theme Toggle)                │
├───────────┬─────────────────────────────────────────────────────┤
│ Sidebar   │  [A Page Header] "Add New / Edit Promotion"         │
│           │  [B Error Alert] (conditional, API errors)          │
│           │  [F Promotion Form]                                 │
│           │   -- Basic Information --                           │
│           │     Code Input | Description Textarea               │
│           │   -- Discount Settings --                           │
│           │     Discount Type | Discount Value                  │
│           │     Min Order Amount | Max Uses                     │
│           │   -- Validity Period --                             │
│           │     Start Date | Expiry Date                        │
│           │   -- Status --                                      │
│           │     Is Active Switch                                │
│           │   -- Actions --                                     │
│           │     [Save/Update] [Cancel]                          │
│           └─────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Responsive Breakpoints

| Breakpoint | Min Width | Layout Behavior |
| :--- | :--- | :--- |
| Mobile (default) | 0px | Stacked form; table scrolls horizontally; bottom navigation |
| Tablet (`md:`) | 768px | Full-width form, collapsible sidebar, reduced table columns |
| Desktop (`lg:`) | 1024px | Full-width form, sidebar navigation, full table |
| Wide (`xl:`) | 1280px | Full-width form, sidebar navigation, enhanced spacing |

---

## 3. Form State & Validation (React Hook Form + Zod)

### 3.1 Promotion List Hook

`frontend/src/features/promotions/hooks/usePromotionList.ts` manages the list query state: current page, `search` (debounced 300ms), `status` filter, license status, and loading/refetch behavior. It calls `promotions.service.list()` and returns `{ data, meta, isLoading, isRestricted, setPage, setSearch, setStatus, refetch }`.

### 3.2 Promotion Form Hook

```typescript
// frontend/src/features/promotions/hooks/usePromotionForm.ts
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { promotionSchema, type PromotionFormData } from '../schemas/promotion.schema';

export function usePromotionForm(initial?: Partial<PromotionFormData>) {
  const methods = useForm<PromotionFormData>({
    resolver: zodResolver(promotionSchema),
    defaultValues: {
      code: initial?.code ?? '',
      description: initial?.description ?? '',
      discountType: initial?.discountType ?? undefined,
      discountValue: initial?.discountValue ?? undefined,
      minOrderAmount: initial?.minOrderAmount ?? undefined,
      maxUses: initial?.maxUses ?? undefined,
      startsAt: initial?.startsAt ?? new Date(),
      expiresAt: initial?.expiresAt ?? undefined,
      isActive: initial?.isActive ?? true,
    },
    mode: 'onChange',
  });

  return { methods };
}
```

### 3.3 Zod Validation Schema

```typescript
// frontend/src/features/promotions/schemas/promotion.schema.ts
import { z } from 'zod';

export const promotionSchema = z
  .object({
    code: z
      .string()
      .min(1, 'Code is required')
      .max(50, 'Code must not exceed 50 characters')
      .regex(/^[A-Za-z0-9_-]+$/, 'Code can only contain letters, numbers, hyphens, and underscores'),
    description: z
      .string()
      .max(500, 'Description must not exceed 500 characters')
      .optional(),
    discountType: z.enum(['percentage', 'fixed'], { required_error: 'Discount type is required' }),
    discountValue: z
      .number({ required_error: 'Discount value is required' })
      .positive('Discount value must be greater than 0'),
    minOrderAmount: z.number().min(0, 'Minimum order amount must be 0 or greater').nullable().optional(),
    maxUses: z.number().int().min(1, 'Maximum uses must be 1 or greater').nullable().optional(),
    startsAt: z.date({ required_error: 'Start date is required' }),
    expiresAt: z.date({ required_error: 'Expiry date is required' }),
    isActive: z.boolean(),
  })
  .superRefine((data, ctx) => {
    // Percentage must be 1-99
    if (data.discountType === 'percentage' && (data.discountValue < 1 || data.discountValue > 99)) {
      ctx.addIssue({ code: 'custom', message: 'Percentage must be between 1 and 99', path: ['discountValue'] });
    }
    // Expiry must be after start
    if (data.expiresAt && data.startsAt && data.expiresAt <= data.startsAt) {
      ctx.addIssue({ code: 'custom', message: 'Expiry date must be after start date', path: ['expiresAt'] });
    }
  });

export type PromotionFormData = z.infer<typeof promotionSchema>;

export const couponValidationSchema = z.object({
  code: z.string().min(1, 'Coupon code is required'),
  orderAmount: z.number().min(0, 'Order amount must be 0 or greater'),
});
```

---

## 4. Sub-Components

### 4.1 PromotionTable Component

- **File Path:** `frontend/src/features/promotions/components/PromotionTable.tsx`
- Renders columns: Code, Description, Discount Type, Discount Value, Usage (`used / max`), Expiry Date, Status, and action cell.
- Edit button (pencil icon) navigates to `/merchant/promotions/:id/edit`; disabled when `usedCount > 0`.
- Delete button (trash icon) opens `DeleteConfirmDialog`; disabled when `usedCount > 0`.
- `swtActive` switch toggles `is_active`; hidden in restricted mode.
- Expiry date rendered red when expired; empty state when no promotions.

### 4.2 PromotionForm Component

- **File Path:** `frontend/src/features/promotions/components/PromotionForm.tsx`
- Uses `usePromotionForm` hook; renders the four sections (Basic Information, Discount Settings, Validity Period, Status) and the Save/Cancel actions.
- In Edit mode, the Code field is disabled (read-only).
- On submit calls `promotions.service.create()` (POST) or `promotions.service.update()` (PATCH).

### 4.3 PendingBanner Component

- **File Path:** `frontend/src/features/promotions/components/PendingBanner.tsx`
- Rendered when `licenseStatus === 'pending'` (warning styling, `bg-amber-50 border-amber-200`) or `'rejected'` (destructive styling, includes rejection reason).
- Hides all mutation controls when present.

### 4.4 DeleteConfirmDialog Component

- **File Path:** `frontend/src/features/promotions/components/DeleteConfirmDialog.tsx`
- Uses `AlertDialog` UI primitive; opens on delete button click.
- Confirm button shows spinner + "Deleting..." while the hard delete request is in flight; Cancel closes the dialog.

### 4.5 StatusBadge / DiscountTypeBadge

- **StatusBadge:** renders Active / Inactive / Scheduled / Expired based on `is_active`, `starts_at`, and `expires_at`.
- **DiscountTypeBadge:** "percentage" (blue) / "fixed" (green).

---

## 5. Action Buttons & Handlers

### 5.1 Add New Promotion

- **Button Type:** `button` (primary) — hidden when restricted.
- **Action:** Navigate to `/merchant/promotions/new`, initialize empty form.

### 5.2 Edit Promotion

- **Button Type:** `ghost` icon button — hidden when restricted; disabled when `usedCount > 0`.
- **Action:** Navigate to `/merchant/promotions/:id/edit`; load the existing promotion data and populate the form.

### 5.3 Delete Promotion

- **Button Type:** `button` opening `DeleteConfirmDialog`.
- **Action (on confirm):** `DELETE /api/v1/promotions/:id`; on success remove row and show success toast.

### 5.4 Toggle Active

- **Button Type:** `switch`.
- **Action:** `PATCH /api/v1/promotions/:id` with `{ isActive: newValue }`; update badge; on `403` revert switch.

### 5.5 Save / Update Form

- **Button Type:** `submit`.
- **Action:** Validate; dispatch `POST /api/v1/promotions` (create) or `PATCH /api/v1/promotions/:id` (update); show success toast; navigate to `/merchant/promotions`.

### 5.6 Cancel Form

- **Action:** navigate to `/merchant/promotions` without saving.

### 5.7 Pagination

- **Buttons:** `btnPrevPage` / `btnNextPage` / `btnPageNumbers`.
- **Action:** `GET /api/v1/promotions?page={n}&limit=20`; update table and `lblPageInfo` ("Page {page} of {totalPages} ({total} promotions)").

### 5.8 Search & Filter

- **Search:** debounced 300ms → `GET /api/v1/promotions?search={q}&status={s}&page=1&limit=20`; reset to page 1.
- **Status filter:** `GET /api/v1/promotions?status={status}&page=1&limit=20`.

---

## 6. Lookup Data

| Item | Options |
|------|---------|
| Discount Type | `percentage` ("Percentage (%)"), `fixed` ("Fixed Amount (MMK)") |
| Status Filter | Active, Inactive, Scheduled, Expired |
| Role Scope | Merchant (own), Admin (all), Buyer (validate only) |

---

## 7. Error Handling

### 7.1 Field-Level

Red border + inline text below the invalid field; real-time validation via RHF + Zod.

### 7.2 Form-Level

- Alert banner listing API errors (`PROMO_CODE_DUPLICATE`, `BAD_REQUEST`, `FORBIDDEN`, `PROMO_NOT_FOUND`, `SYS_001`).
- Toast for 409 usage restriction (`PROMO_EDIT_RESTRICTED` / `PROMO_DELETE_RESTRICTED`).
- License restriction banner for `MERCHANT_NOT_APPROVED` / `MERCHANT_REJECTED`.

### 7.3 Loading States

- Skeleton loaders on initial list load.
- Spinner on submit/delete buttons and toast on network error (`NET_ERR`).

---

## 8. Cross-References

| Related Document | Purpose |
|------------------|---------|
| [DD_PROMO_01](./DD_Promotion_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_PROMO_03](./DD_Promotion_03_API_ENDPOINTS.md) | API endpoint contracts consumed by frontend hooks |
| [DD_PROMO_04](./DD_Promotion_04_DTOS_AND_TYPES.md) | DTO and type definitions used in form state and validation |
| [DD_PROMO_05](./DD_Promotion_05_BUSINESS_LOGIC.md) | Business logic and validation rules |
| [DD_PROMO_06](./DD_Promotion_06_TEST.md) | Frontend component and E2E test specification |
| [プロモーション管理画面_機能設計書](../プロモーション管理画面_機能設計書.md) | Functional requirements and operation specifications (v1.6) |
| [プロモーション管理画面_画面項目設計書](../プロモーション管理画面_画面項目設計書.md) | Screen-item definitions, validation, API mappings, and i18n (v1.3) |
| [データベース設計書_DATABASE_SPEC](../../../core-work/データベース設計書_DATABASE_SPEC.md) | Table constraints and UUID data model (v2.4) |
| [開発ルール_DEVELOPMENT_RULES](../../../core-work/開発ルール_DEVELOPMENT_RULES.md) | Security, accessibility, API, and quality rules (v2.1) |