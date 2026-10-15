# DD_PROMO_01 — Module Overview

> **Doc ID:** SKM-DD-PROMO-01 | **Version:** 2.0 | **Status:** Updated  
> **Last Updated:** 2026-10-15

---

## 1. Module Overview

The promotion module in this repository is implemented as a merchant-focused management flow with a buyer-side validation workflow.

The merchant UI is centered on these live pages:

- `frontend/src/pages/merchant/Promotions.tsx` — promotion list
- `frontend/src/pages/merchant/PromotionCreate.tsx` — create form
- `frontend/src/pages/merchant/PromotionEdit.tsx` — edit form

The backend module lives under:

- `backend/src/modules/merchant/promotions/`

and is exposed through the controller and service classes that manage coupon codes, usage checks, and merchant access restrictions.

### Primary actors

- Approved merchant user
- Merchant account in `pending` or `rejected` state (UI read-only mode)
- Buyer validation flow during checkout or coupon verification

### Primary routes

- `/merchant/promotions`
- `/merchant/promotions/new`
- `/merchant/promotions/:id/edit`

### Implementation map

- Frontend state and mutations: `frontend/src/hooks/usePromotions.ts`
- Frontend HTTP client: `frontend/src/services/promotion.service.ts`
- Frontend types: `frontend/src/types/promotion.types.ts`
- Backend controller: `backend/src/modules/merchant/promotions/promotions.controller.ts`
- Backend service: `backend/src/modules/merchant/promotions/promotions.service.ts`
- Backend DTOs: `backend/src/modules/merchant/promotions/dto/`

---

## 2. Supported Use Cases

| ID | Use case | Actual implementation |
|---|---|---|
| UC-PROMO-001 | View merchant list | `findAll(userId, query)` returns merchant-owned promotions with search, status filter, sort, page, and limit |
| UC-PROMO-002 | Create promotion | `create(userId, dto)` validates values and persists a new promotion |
| UC-PROMO-003 | Edit promotion | `update(userId, id, dto)` updates fields while preventing edits if the promotion has been used |
| UC-PROMO-004 | Delete promotion | `remove(userId, id)` hard deletes a promotion when it is unused |
| UC-PROMO-005 | Toggle active state | `toggleActive(userId, id)` flips `isActive` and invalidates cache keys |
| UC-PROMO-006 | Validate coupon | `validateCoupon(userId, couponCode, subtotal)` checks eligibility and calculates the discount |
| UC-PROMO-007 | Read-only restriction | Pending/rejected merchants see banners and restricted action controls |

---

## 3. Current Business Rules in the Codebase

These are the rules implemented in the live repo:

1. Merchant operations are scoped to `merchant.userId` via `getMerchantId(userId)`.
2. `RequireApprovedMerchantGuard` blocks pending or rejected merchants from create/edit/delete/toggle/validate actions.
3. `discountTypeCode` is validated against `discountType` relation records.
4. Percentage promotions reject values above `99`.
5. Fixed promotions reject values greater than or equal to `minOrderAmount`.
6. `expiresAt` must be strictly later than `startsAt`.
7. A promotion is blocked from edit/delete if `usedCount` is greater than zero; the service calculates usage from actual order records using the promotion code.
8. Coupon validation does not mutate the usage count; it only checks usage against `maxUses` and computes a final discount.

---

## 4. Frontend Architecture

### 4.1 Component map

| Area | File(s) | Role |
|---|---|---|
| Merchant list page | `frontend/src/pages/merchant/Promotions.tsx` | list, filters, actions, banners |
| Create page | `frontend/src/pages/merchant/PromotionCreate.tsx` | coupon creation form |
| Edit page | `frontend/src/pages/merchant/PromotionEdit.tsx` | coupon edit form |
| Query hooks | `frontend/src/hooks/usePromotions.ts` | CRUD and list queries |
| API service | `frontend/src/services/promotion.service.ts` | HTTP wrapper for `/promotions` |
| Frontend types | `frontend/src/types/promotion.types.ts` | request and response models |
| Merchant guard | `frontend/src/features/merchant/products/guards/merchantProducts.guard.ts` | license-state gating for UI actions |

### 4.2 Actual UI behavior

- Search and filtering are done by query params instead of a dedicated `usePromotionList` abstraction.
- Status filter supports: `active`, `inactive`, `expired`.
- Sort supports: `newest`, `oldest`, `code`.
- Pagination uses `page` and `limit`.
- Delete uses a confirmation dialog pattern via `AlertDialog`.
- Toggle is implemented through `PATCH /promotions/:id/toggle-active`.
- Copy-to-clipboard is available on the table for coupon codes.
- Deactivated, pending, and rejected banners are rendered before the list table.

---

## 5. Backend Architecture

### 5.1 Backend module layout

| Layer | Files |
|---|---|
| Controller | `backend/src/modules/merchant/promotions/promotions.controller.ts` |
| Service | `backend/src/modules/merchant/promotions/promotions.service.ts` |
| DTOs | `backend/src/modules/merchant/promotions/dto/*.dto.ts` |
| Query DTO | `backend/src/modules/merchant/promotions/dto/promotion-query.dto.ts` |
| Module | `backend/src/modules/merchant/promotions/promotions.module.ts` |

### 5.2 Security and guard flow

The controller applies:

- `JwtAuthGuard`
- `RolesGuard`
- class-level `@Roles('merchant')`

Mutation routes also use:

- `RequireApprovedMerchantGuard`

This guard rejects merchants with `pending` or `rejected` licenses before create/update/delete/toggle/validation calls proceed.

---

## 6. Data Model Notes

The current implementation uses a Prisma `promotion` model with a relation to `discountType` and merchant ownership via `merchantId`.

Important implementation details:

- `discountTypeCode` is used instead of a generic `discountType`
- `minOrderAmount` and `maxUses` are optional numbers
- `usedCount` is derived at runtime from `order` records by `couponCode`
- `startsAt` and `expiresAt` are ISO strings in the frontend and Date values in the backend service

This differs from some earlier abstract design drafts that modeled a more elaborate promotion state machine. In the live code, state is mostly derived from `isActive`, `expiresAt`, and usage from orders.

---

## 7. Cross-References

| Related document | Purpose |
|---|---|
| [DD_Promotion_02_FRONTEND_Page](./DD_Promotion_02_FRONTEND_Page.md) | Frontend page design and live UI states |
| [DD_Promotion_03_API_ENDPOINTS](./DD_Promotion_03_API_ENDPOINTS.md) | Current controller routes and payloads |
| [DD_Promotion_04_DTOS_AND_TYPES](./DD_Promotion_04_DTOS_AND_TYPES.md) | Backend DTOs and frontend types |
| [DD_Promotion_05_BUSINESS_LOGIC](./DD_Promotion_05_BUSINESS_LOGIC.md) | Service logic and validation rules |
| [DD_Promotion_06_TEST](./DD_Promotion_06_TEST.md) | Testing strategy for the current implementation |

---

## 8. Implementation Note

This document reflects the current repository implementation rather than a theoretical future-state specification. The project is working with direct component state, service-layer mutations, and route-scoped access checks that match the live code today.
