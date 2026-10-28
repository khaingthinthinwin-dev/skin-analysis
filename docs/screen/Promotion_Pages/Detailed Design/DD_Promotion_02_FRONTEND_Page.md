# DD_PROMO_02 — Frontend Page Design

> **Doc ID:** SKM-DD-PROMO-02 | **Version:** 2.1 | **Status:** Updated  
> **Last Updated:** 2026-10-21

---

## 1. Overview

This document describes the actual promotion page implementation in the current repository.

The merchant promotion feature is composed of three primary pages:

- `frontend/src/pages/merchant/Promotions.tsx` — list page
- `frontend/src/pages/merchant/PromotionCreate.tsx` — create page
- `frontend/src/pages/merchant/PromotionEdit.tsx` — edit page

These screens are rendered under the merchant dashboard layout and use the shared `usePromotions` hook for loading and mutation flows.

### Route map

| Route | Component |
|---|---|
| `/merchant/promotions` | `Promotions` |
| `/merchant/promotions/new` | `PromotionCreate` |
| `/merchant/promotions/:id/edit` | `PromotionEdit` |

---

## 2. Layout Structure

### 2.1 Promotion list page

`Promotions.tsx` renders a card-based layout with:

- page title: `merchant.promotions.title`
- account warning banners for pending or rejected merchants
- search input
- status filter dropdown
- sort dropdown
- Add New button when actions are allowed
- promotion table with per-row controls
- pagination controls

Key UI controls include:

- search box
- status filter: `all`, `active`, `inactive`, `expired`
- sort: `newest`, `oldest`, `code`
- Add New button
- Edit, Delete, Toggle actions per row

### 2.2 Create and edit forms

The create/edit screens are implemented as controlled components using local component state rather than `react-hook-form` + Zod.

The form includes:

- code
- description
- discount type (`percentage` or `fixed`)
- discount value
- min order amount
- max uses
- startsAt
- expiresAt
- isActive

The create page performs inline validation. The edit page validates before submit, blocks changes when the coupon has already been used, and keeps the `code` field read-only.

---

## 3. State and Data Flow

### 3.1 List query

The list query is powered by `usePromotions(params)` from `frontend/src/hooks/usePromotions.ts`.

```ts
const queryParams: PromotionQueryParams = {
  search: search || undefined,
  status: statusFilter === 'all' ? undefined : statusFilter,
  sortBy,
  page,
  limit,
}
```

This is then passed to `promotionService.getPromotions(params)`, which hits the backend `/promotions` route.

### 3.2 Mutation hooks

The main page uses these mutations:

- `useCreatePromotion()`
- `useUpdatePromotion()`
- `useDeletePromotion()`
- `useTogglePromotionActive()`

Each mutation invalidates the merchant promotions cache after a successful result.

### 3.3 Merchant access logic

The list page reads the account status using `useAuth()` and `useMerchantProductsGuard()` and checks values such as:

- `user.licenseStatus`
- `user.license_status`
- `user.isActive` / `user.is_active`
- `user.status`

The page decides whether to show:

- pending merchant banner
- rejection banner
- CRUD action controls

The effective logic is:

```ts
const showPendingBanner = (guard.showPendingBanner || isPending) && !isDeactivated
const showCrudActions = guard.showCrudActions && !isPending && !isDeactivated
```

---

## 4. Actual UI Behavior

### 4.1 Table rows

Promotion rows display:

- code
- description
- discount type
- discount value
- usage
- expiry date
- status badge
- actions area

The usage label is formatted as:

- `usedCount / maxUses` when `maxUses` exists
- `usedCount / Unlimited` when `maxUses` is absent

### 4.2 Status badges

The list page implements status color logic inline:

```ts
if (promo.expiresAt && new Date(promo.expiresAt) < now) {
  return <Badge ...>Expired</Badge>
}
if (promo.maxUses && promo.usedCount >= promo.maxUses) {
  return <Badge ...>Exhausted</Badge>
}
if (promo.isActive) {
  return <Badge ...>Active</Badge>
}
return <Badge ...>Inactive</Badge>
```

### 4.3 Actions

Each promotion row exposes:

- toggle active
- edit
- delete

Edit and delete are hidden or disabled based on merchant restrictions and whether the promotion has already been used.

---

## 5. Validation Rules on the Frontend

Create and edit pages implement validation inline with local `errors` state.

### 5.1 Create form validation

Current rules:

- code required, max 50 characters
- discount value required and > 0
- percentage discount must be between 1 and 99
- fixed discount cannot be equal to or greater than `minOrderAmount`
- expiry must be after start date
- `maxUses` must be at least 1 when present
- `minOrderAmount` must be >= 0
- new promotion start date must not be in the past

### 5.2 Edit form validation

The edit flow uses the same discount and date rules and additionally blocks submission if the coupon has already been used:

```ts
const isUsed = (promotion.usedCount ?? 0) > 0
if (isUsed) return false
```

The UI also shows a warning banner when the coupon is already used.

---

## 6. Page Details

### 6.1 `Promotions.tsx`

This is the main merchant page. It handles:

- query state (`search`, `statusFilter`, `sortBy`, `page`, `limit`)
- `error` handling with `getPromotionErrorInfo(error)`
- loading state with `LoadingSpinner`
- account restriction banners
- success and error toast notifications
- delete confirmation via `AlertDialog`
- code copying via `navigator.clipboard.writeText()`

### 6.2 `PromotionCreate.tsx`

This page:

- sets default start and expiry datetimes
- blocks deactivated, pending, and rejected merchants by redirecting back to `/merchant/promotions`
- converts form values into request payloads
- calls `createPromotion.mutate(...)`
- redirects back to the list when creation succeeds

### 6.3 `PromotionEdit.tsx`

This page:

- loads a promotion by `id`
- maps the record to local form state through `promoToForm()`
- keeps `code` read-only
- allows editing description, discount type/value, min order, max uses, dates, and active flag
- prevents editing for used coupons and shows a warning banner

---

## 7. Data Contracts Used by the Frontend

These interfaces are defined in `frontend/src/types/promotion.types.ts`.

```ts
export interface Promotion {
  id: string
  merchantId: string
  code: string
  description?: string
  discountTypeCode: string
  discountValue: number
  minOrderAmount?: number
  maxUses?: number
  usedCount: number
  startsAt: string
  expiresAt: string
  isActive: boolean
  createdAt: string
}
```

```ts
export interface ValidateCouponData {
  couponCode: string
  subtotal: number
}
```

This differs from some earlier docs that modeled the frontend around `discountType`, `orderAmount`, or a standardized `PromotionFormData` schema.

---

## 8. Cross-References

| Related document | Purpose |
|---|---|
| [DD_Promotion_01_MODULE_OVERVIEW](./DD_Promotion_01_MODULE_OVERVIEW.md) | Module context and route ownership |
| [DD_Promotion_03_API_ENDPOINTS](./DD_Promotion_03_API_ENDPOINTS.md) | Exact backend route contracts |
| [DD_Promotion_04_DTOS_AND_TYPES](./DD_Promotion_04_DTOS_AND_TYPES.md) | DTOs and request models |
| [DD_Promotion_05_BUSINESS_LOGIC](./DD_Promotion_05_BUSINESS_LOGIC.md) | Service-side logic |
| [DD_Promotion_06_TEST](./DD_Promotion_06_TEST.md) | Testing strategy |

---

## 9. Notes

This doc intentionally reflects the live code in the repository, not a theoretical idealized design. The current implementation uses direct component state plus service-layer mutations and route-scoped merchant guards.
