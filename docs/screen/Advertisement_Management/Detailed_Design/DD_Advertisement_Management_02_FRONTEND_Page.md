# DD_Advertisement_Management_02 — Frontend Page (Advertisement Management)

> **Doc ID:** SKM-DD-AD-02 | **Version:** 1.0 | **Status:** Released
> **Last Updated:** 2026-08-26
> **Target Screen:** Advertisement Management (広告管理)
> **Subsystem:** Advertisement — Shop Advertisement Management
> **Function ID:** FN-AD-001

---

## 1. Overview

The Advertisement Management module consists of two main screens and five dialog overlays:

1. **Merchant Advertisement Management** (`/merchant/advertisements`) — package catalog, statistics, ad list, and full merchant CRUD.
2. **Admin Advertisement Moderation** (`/admin/ads`) — pending approval queue, approval/rejection, all-ads table, and the Admin-owned package (fee settings) management panel.

**Dialog overlays (shared by both screens):**
- Package Selection Confirmation Dialog
- Upload Ad Content Dialog
- Payment Confirmation Dialog
- Edit Ad Content Dialog
- Create Package Dialog / Fee History Dialog

| Item | Value |
|------|-------|
| **Merchant page file (target)** | `frontend/src/pages/merchant/Advertisements.tsx` |
| **Admin page file (target)** | `frontend/src/pages/admin/AdvertisementModeration.tsx` |
| **Route (merchant)** | `/merchant/advertisements` |
| **Route (admin)** | `/admin/ads` |
| **Layout** | `frontend/src/layouts/MerchantLayout.tsx` / `AdminLayout.tsx` |
| **State management** | TanStack Query (server state) + local React state / React Hook Form (forms) |
| **Validation** | React Hook Form + Zod schema |
| **i18n** | EN / JA / MY (`merchant.ads.*`, `admin.ads.*`, `common.*`) |

> **Pending Merchant Mode:** Merchants with `license_status = 'pending'` or `'rejected'` see a read-only page: package catalog is browsable, ad list is viewable, but Select/Upload/Pay/Edit/Delete/Toggle actions are disabled and an info banner is displayed.

---

## 2. Layout Structure

### 2.1 Merchant Advertisement Management Page (`/merchant/advertisements`)

```
┌──────────────────────────────────────────────────────────────┐
│                      BROWSER VIEWPORT                         │
├──────────────────────────────────────────────────────────────┤
│ [A] Sidebar (MerchantLayout)  ← "Advertisements" active       │
│                                                              │
│ [B] Page Header: "Advertisements" + subtitle                  │
│                                                              │
│ [C] Pending Merchant Banner (conditional)                     │
│     license_status ∈ {pending, rejected}                     │
│                                                              │
│ [D] Statistics Cards: [Active] [Pending Approval] [Expired]   │
│                                                              │
│ [E] Package Catalog Section                                   │
│     [E1] "Available Packages"                                │
│     [E2] Package Card Grid                        ┌────────┐ │
│          placement · tier badge · rate/day ·      │ Select │ │
│          duration · max ads · total fee           └────────┘ │
│                                                              │
│ [F] Toolbar: [Status] [Approval Status] [Search]             │
│                                                              │
│ [G] Advertisement List (ad cards)                             │
│     thumbnail | title | badges | content preview |           │
│     announcement | schedule | rejection reason | actions     │
│                                                              │
│ [H] Pagination: Page info · Prev · Next                      │
└──────────────────────────────────────────────────────────────┘
## 3. Form State & Validation (React Hook Form + Zod)

All merchant and admin forms use **React Hook Form + Zod** schemas, implemented with `zodResolver`; errors render as red borders with inline field messages via `role="alert"`. Validation mirrors the backend DTO rules (single source of truth alignment; the backend remains authoritative).

### 3.1 Upload Content / Edit Content Schema (`contentSchema`)

```typescript
import { z } from 'zod';

const contentSchema = z.object({
  title: z.string({ required_error: 'VAL-AD-010' })
    .min(1, 'VAL-AD-010')
    .max(200, 'VAL-AD-011'),
  content: z.string()
    .max(5000, 'VAL-AD-012')
    .optional().or(z.literal('')),
  image: z.any().optional(), // File | null; validated separately
  linkUrl: z.string()
    .url('VAL-AD-015')
    .max(2048, 'VAL-AD-016')
    .optional().or(z.literal('')),
  announcementMessage: z.string({ required_error: 'VAL-AD-017' })
    .min(1, 'VAL-AD-017')
    .max(500, 'VAL-AD-018'),
  startsAt: z.string({ required_error: 'VAL-AD-019' })
    .refine((v) => new Date(v) >= startOfToday(), 'VAL-AD-020'),
});

// Upload dialog: startsAt editable (defaults to today); end date derived.
// Edit dialog (PATCH /ads/:id): startsAt NOT included — unchanged.
```

**Image file validation (client-side):**

```typescript
function validateImage(file: File | null): string | null {
  if (!file) return null;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'VAL-AD-013';
  if (file.size > 5 * 1024 * 1024) return 'VAL-AD-014';
  return null;
}
```

### 3.2 Payment Form Schema (`paySchema`)

```typescript
const paySchema = z.object({
  paymentReference: z.string().max(100).optional().or(z.literal('')),
});
```

### 3.3 Admin Create Package Schema (`createPackageSchema`)

```typescript
const createPackageSchema = z.object({
  placement: z.enum(['homepage_slider', 'product_sidebar', 'category_banner', 'search_top'], {
    required_error: 'VAL-AD-040',
  }),
  tier: z.enum(['basic', 'standard', 'premium'], { required_error: 'VAL-AD-041' }),
  daily_rate: z.coerce.number().min(0, 'VAL-AD-042').max(10000),
  duration_days: z.coerce.number().int().min(7, 'VAL-AD-043').max(30, 'VAL-AD-043'),
  max_ads: z.coerce.number().int().min(1, 'VAL-AD-044'),
});
```

### 3.4 Admin Approval / Other Minimal Forms

| Form | Fields | Notes |
|------|--------|-------|
| Rejection | `reason` | `z.string().min(1, 'VAL-AD-030').max(2000, 'VAL-AD-031')`; textarea revealed after clicking Reject |
| Rate edit (inline) | `daily_rate` | `z.coerce.number().min(0, 'VAL-AD-042').max(10000)`; saved via PATCH |
| Toggle | `isActive` | boolean switch; optimistic update with rollback |

---
## 4. Sub-Components

### 4.1 Merchant Screen Components

| Component | Purpose | Key Props / Data | Notes |
|-----------|---------|------------------|-------|
| `PackageCatalogSection` | Renders active packages grid from `GET /ads/packages` | `packages: AdFeeSetting[]`, `licenseStatus` | Sorted by placement then tier; each card shows placement, tier badge, daily rate, duration, max ads, total fee (`daily_rate × duration_days`). `Select` disabled when `licenseStatus !== 'approved'`. |
| `PackageCard` | Single package card (EL-03a) | `pkg: AdFeeSetting` | Tier badge colors: basic `bg-gray-100 text-gray-800`, standard `bg-blue-100 text-blue-800`, premium `bg-purple-100 text-purple-800`. Total fee emphasized (`text-primary font-bold`). |
| `StatsCards` | 3 stat cards (Active / Pending / Expired) | `ads: Advertisement[]` | Computed client-side: Active = approved + completed + active + in-schedule; Pending = `payment_status = completed`; Expired = `expires_at < now`. |
| `AdToolbar` | Status + approval status filters + search | `filters`, `setFilters` | Debounced search (300ms); resets pagination to page 1 on change. |
| `AdCard` | Individual ad display + conditional actions | `ad: Advertisement`, callbacks | See §5 for conditional action visibility. |
| `StatusBadge` | Approval badge (`pending/approved/rejected`) | `approvalStatus` | amber / green / red. |
| `PaymentBadge` | Payment badge (`pending/completed/refunded`) | `paymentStatus` | amber / green / gray. |
| `Pagination` | Prev / Next + "Page X of Y · N ads" | `meta` | Reuses shared UI pagination. |

### 4.2 Dialog Components

| Component | Used For | Endpoint Call | Success Behavior |
|-----------|----------|---------------|------------------|
| `PackageSelectionDialog` | Confirm package selection | `POST /ads/packages/:feeSettingId/select` | Closes; opens Upload Content dialog for the new draft ad; success toast; refetch ads + packages |
| `UploadContentDialog` | Content upload after selection | `PATCH /ads/:id/content` | Closes; `btnPayFee` becomes available; toast; refetch |
| `PaymentDialog` | Fee payment | `POST /ads/:id/pay` | Closes; ad shows PENDING_APPROVAL; toast; refetch |
| `EditContentDialog` | Edit content / resubmit | `PATCH /ads/:id` (+ optionally open PaymentDialog) | Closes; toast; refetch |
| `ConfirmDeleteDialog` | Soft-delete confirmation | `DELETE /ads/:id` | Closes; toast; refetch |
| `CreatePackageDialog` (admin) | Create fee setting | `POST /admin/ad-fee-settings` | Closes; toast; refetch fee settings |

### 4.3 Admin Screen Components

| Component | Purpose | Key Data |
|-----------|---------|----------|
| `PendingQueue` | Pending approval ads (`approval_status = pending` AND `payment_status = completed`), oldest first | `GET /admin/ads?approvalStatus=pending` |
| `PendingAdCard` | Full ad preview + approve/reject | thumbnail, title, content, announcement, schedule, shop name, fee info |
| `WeeklyLimitIndicator` | "X of 5 active ads this week" | computed count of approved ads for current ISO week |
| `FeeSettingsTable` | All packages (placement · tier · rate · duration · max ads · active · actions) | `GET /admin/ad-fee-settings` |
| `FeeHistoryDialog` | `ad_fee_history` audit trail (old/new rate, changed by, changed at) | per-setting history |
| `AllAdsTable` | All platform ads, filterable by approval/payment status | `GET /admin/ads` |

---
## 5. Action Buttons & Handlers

### 5.1 Ad Card Conditional Action Visibility

| Action | Visible When | API Call |
|--------|--------------|----------|
| `btnPayFee` | content present (`content IS NOT NULL AND image_url IS NOT NULL`) AND `payment_status = 'pending'` | `POST /ads/:id/pay` |
| `btnResubmit` | `approval_status = 'rejected'` | opens Edit dialog in resubmit mode |
| `btnEditAd` | content uploaded AND `payment_status = 'pending'`, OR `approval_status = 'rejected'` | `PATCH /ads/:id` |
| `btnDeleteAd` | content uploaded AND `payment_status = 'pending'`, OR `is_active = false` (inactive) | `DELETE /ads/:id` |
| `swtToggleActive` | `approval_status = 'approved'` AND `payment_status = 'completed'` | `PATCH /ads/:id/toggle` |

### 5.2 Handler Pseudo-Code (Merchant)

```typescript
// Package Selection — POST /ads/packages/:feeSettingId/select
async function handleSelectPackage(feeSettingId: string) {
  if (!isApproved) { toast.info(t('merchant.ads.pendingBanner')); return; }
  const { data } = await adApi.selectPackage(feeSettingId);   // 201 draft ad
  queryClient.invalidateQueries({ queryKey: ['ads'] });
  queryClient.invalidateQueries({ queryKey: ['ads', 'packages'] });
  setUploadTarget(data.data);                                  // open Upload Content dialog
}

// Content Upload — PATCH /ads/:id/content
async function handleSaveContent(id: string, form: ContentForm) {
  const fd = new FormData();
  fd.append('title', form.title); fd.append('content', form.content ?? '');
  if (form.image instanceof File) fd.append('image', form.image);
  fd.append('linkUrl', form.linkUrl ?? '');
  fd.append('announcementMessage', form.announcementMessage);
  fd.append('startsAt', form.startsAt.toISOString());
  await adApi.uploadContent(id, fd);                            // expires_at derived server-side
  queryClient.invalidateQueries({ queryKey: ['ads'] });
  toast.success(t('merchant.ads.uploaded'));
  closeDialog();
}

// Pay Fee — POST /ads/:id/pay
async function handlePay(id: string, paymentReference = '') {
  await adApi.pay(id, { paymentReference });                    // payment_status = completed
  queryClient.invalidateQueries({ queryKey: ['ads'] });
  toast.success(t('merchant.ads.paid'));
  closeDialog();
}

// Edit — PATCH /ads/:id
async function handleEdit(id: string, form: EditForm) {
  await adApi.update(id, form);                                 // content fields only
  queryClient.invalidateQueries({ queryKey: ['ads'] });
  toast.success(t('merchant.ads.saved'));
  if (form.saveAndPay) setPayTarget(id);                        // rejected → open payment dialog
}

// Toggle — PATCH /ads/:id/toggle   (optimistic)
async function handleToggle(ad: Advertisement) {
  queryClient.setQueryData(['ads'], (old) => updateToggle(old, ad.id, !ad.isActive));
  try { await adApi.toggle(ad.id, { isActive: !ad.isActive }); }
  catch { queryClient.invalidateQueries({ queryKey: ['ads'] }); toast.error(...); }
  queryClient.invalidateQueries({ queryKey: ['activeAds'] });
}

// Soft Delete — DELETE /ads/:id
async function handleDelete(id: string) {
  await adApi.softDelete(id);
  queryClient.invalidateQueries({ queryKey: ['ads'] });
  queryClient.invalidateQueries({ queryKey: ['activeAds'] });
  toast.success(t('merchant.ads.deleted'));
}
```

### 5.3 Handler Pseudo-Code (Admin)

```typescript
// Approve — PATCH /admin/ads/:id/approve
async function handleApprove(id: string) {
  await adminAdApi.approve(id);                                 // 409 if weekly limit reached
  queryClient.invalidateQueries({ queryKey: ['admin-ads'] });
  queryClient.invalidateQueries({ queryKey: ['activeAds'] });
  toast.success(t('admin.ads.approved'));
}

// Reject — PATCH /admin/ads/:id/reject  (reason required)
async function handleReject(id: string, reason: string) {
  await adminAdApi.reject(id, { reason });                      // auto-refund on backend
  queryClient.invalidateQueries({ queryKey: ['admin-ads'] });
  queryClient.invalidateQueries({ queryKey: ['activeAds'] });
  toast.success(t('admin.ads.rejected'));
}

// Create Package — POST /admin/ad-fee-settings
async function handleCreatePackage(form: CreatePackageForm) {
  await adminAdApi.createFeeSetting(form);                      // 409 on duplicate (placement,tier)
  queryClient.invalidateQueries({ queryKey: ['fee-settings'] });
  queryClient.invalidateQueries({ queryKey: ['ads', 'packages'] });
  toast.success(t('admin.ads.created'));
}

// Update Rate — PATCH /admin/ad-fee-settings/:id
async function handleUpdateRate(id: string, dailyRate: number) {
  await adminAdApi.updateFeeSetting(id, { daily_rate: dailyRate });
  queryClient.invalidateQueries({ queryKey: ['fee-settings'] });
  queryClient.invalidateQueries({ queryKey: ['ads', 'packages'] });
  toast.success(t('admin.ads.rateSaved'));
}

// Deactivate Package — DELETE /admin/ad-fee-settings/:id
async function handleDeactivate(id: string) {
  await adminAdApi.deactivateFeeSetting(id);
  queryClient.invalidateQueries({ queryKey: ['fee-settings'] });
  queryClient.invalidateQueries({ queryKey: ['ads', 'packages'] });
  toast.success(t('admin.ads.deactivated'));
}
```

### 5.4 Storefront Slider (public display)

| Behavior | Logic |
|----------|-------|
| Data source | `GET /ads/active` (public, Redis-cached 5 min) |
| Rotor limit | At most 5 ads per rotation (`AD_SLIDER_MAX_ADS`) |
| Priority | Premium > Standard > Basic — client-side grouping when package context available; otherwise `created_at DESC` order from API |
| Round-robin | Within the same tier, rotate evenly across cycles |
| Auto-rotation | Every 5 seconds (`AD_SLIDER_ROTATION_SECONDS`); pause on hover/focus, resume on leave/blur |
| Click-through | Entire card navigates to `linkUrl` (BR-SEARCH-029 / BR-AD display rules) |

---
## 6. Lookup Data

| Query | Endpoint | Cache / Staleness | Use |
|-------|----------|-------------------|-----|
| `['ads','packages']` | `GET /ads/packages` | `cache:ads:packages` (10 min TTL) | Package catalog cards |
| `['ads']` | `GET /ads` (+ `page`, `limit`, `status`, `approvalStatus`, `search`) | none (per-merchant) | Merchant ad list + stats |
| `['activeAds']` | `GET /ads/active` | `cache:ads:active` (5 min TTL) | Storefront slider (not used on management pages) |
| `['admin-ads']` | `GET /admin/ads?approvalStatus=pending` | none | Pending approval queue |
| `['fee-settings']` | `GET /admin/ad-fee-settings` | none | Fee settings table |

**TanStack Query configuration:** `staleTime: 30_000`, `refetchOnWindowFocus: false`; all mutations invalidate the relevant keys so the list refreshes after every state change (standard query invalidation per functional spec §11 — no WebSockets).

---

## 7. Error Handling

### 7.1 Error Code → UI Mapping

| HTTP / Code | Presentation |
|-------------|--------------|
| `400 BAD_REQUEST` | Field-level inline errors (red border + `role="alert"` text) + form-level alert banner |
| `401 UNAUTHORIZED` | Redirect to `/login` |
| `403 FORBIDDEN` | Alert banner: "You don't have permission to manage this ad" |
| `403 SHOP_NOT_APPROVED` | Info banner (pending merchant) or dialog error; selection blocked |
| `404 NOT_FOUND` | Alert banner with refresh option → refresh list |
| `409 WEEKLY_LIMIT_REACHED` | Alert banner at top of admin queue: "Weekly advertisement limit reached (max 5)" |
| `409 CONFLICT` (package duplicate) | Dialog error: "A package with this placement and tier already exists" |
| `400 AD_PACKAGE_INVALID` | Dialog error: "Selected advertising package is unavailable" |
| `413 PAYLOAD_TOO_LARGE` | Inline image error: "Image file must not exceed 5MB" |
| `415 UNSUPPORTED_MEDIA_TYPE` | Inline image error: "Image must be JPG, PNG, or WebP format" |
| `422 UNPROCESSABLE_ENTITY` | Dialog error: "Payment failed. Please try again." |
| `429 TOO_MANY_REQUESTS` | Alert banner with retry seconds |
| `500 INTERNAL_SERVER_ERROR` / network | Alert banner: generic retry message |

### 7.2 Global Interceptor Behavior

A shared API/axios interceptor (as used by other merchant modules) handles:
- Attaching `Authorization: Bearer <token>`.
- On `401` → clear auth state, redirect to `/login`.
- On `403` with `SHOP_NOT_APPROVED` → keep user on page (read-only mode), show pending banner — **no redirect**.
- Toast notifications for successful mutations (`toast.success`) and API errors (`toast.error`).

### 7.3 Loading & Empty States

- **Loading:** skeleton loaders for package catalog and ad list; spinner on all submitting buttons ("Selecting...", "Saving...", "Processing payment...", "Approving...", "Rejecting...", "Creating...").
- **Empty:** illustrated message when no ads match filters/search; package grid shows empty state only if `ad_fee_settings` is empty.
- **Deletion/selection confirmations:** confirm dialogs before soft-delete and before package select.

---

## 8. Cross-References

| Related Document | Purpose |
|------------------|---------|
| [DD_Advertisement_Management_01_MODULE_OVERVIEW.md](./DD_Advertisement_Management_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_Advertisement_Management_03_API_ENDPOINTS.md](./DD_Advertisement_Management_03_API_ENDPOINTS.md) | API endpoint contracts consumed by frontend hooks |
| [機能設計書_Advertisement_Management](../機能設計書_Advertisement_Management.md) | Full functional specification |
| [画面項目設計書_Advertisement_Management](../画面項目設計書_Advertisement_Management.md) | Screen items specification (item IDs, i18n keys, event specs) |
| [DD_COMMON_01_UI_COMPONENTS](../00_common/DD_COMMON_01_UI_COMPONENTS.md) | Shared UI components (Button, Badge, Dialog, Switch, Table, Select, DatePicker) |
```

### 2.2 Dialog Overlays (modals over the merchant page)

| Dialog | Trigger | Key Content |
|--------|---------|-------------|
| **Package Selection Confirmation** (I) | Click "Select" on a package card | Read-only package info; Confirm Select / Cancel |
| **Upload Ad Content** (J) | Click "Confirm Select" | Title, content, image upload, link URL, announcement message, start date, read-only end date + fee summary; Cancel / Save & Continue |
| **Payment Confirmation** (K) | Click "Pay Fee" on a card | Fee summary, optional payment reference; Cancel / Pay & Submit |
| **Edit Ad Content** (L) | Click "Edit" / "Resubmit" | Same fields as upload, pre-filled; Cancel / Save / Save & Pay (rejected ads only) |

### 2.3 Admin Advertisement Moderation Page (`/admin/ads`)

```
┌──────────────────────────────────────────────────────────────┐
│ [A] Sidebar (AdminLayout)  ← "Ad Management" active           │
│ [M] Page Header: "Advertisement Moderation"                  │
│                                                              │
│ [N] Pending Approval Queue                                   │
│     [N1] Weekly Limit Indicator: "X of 5 active ads this week"│
│     [N2] Pending Ad Cards (oldest first)                     │
│          thumbnail · title · content · announcement ·        │
│          schedule · shop name · fee info · Approve / Reject  │
│          (+ rejection reason textarea when rejecting)        │
│                                                              │
│ [O] Fee Settings / Package Management Section                │
│     [O1] "Advertisement Packages" + [New Package]            │
│     [O3] Fee Settings Table  (placement · tier · rate ·      │
│          duration · max ads · active · [Edit rate][History]  │
│          [Deactivate])                                       │
│     [O4] All Ads Table (filterable by approval/payment)      │
└──────────────────────────────────────────────────────────────┘
```

### 2.4 Responsive Breakpoints

| Breakpoint | Layout |
|------------|--------|
| Mobile (< 768px) | Single-column cards, dialogs become full-screen sheets, package cards stacked |
| Tablet (768–1023px) | Cards in 2-column grid, sidebar collapses |
| Desktop (≥ 1024px) | Full dashboard layout, 3-column package grid |

---