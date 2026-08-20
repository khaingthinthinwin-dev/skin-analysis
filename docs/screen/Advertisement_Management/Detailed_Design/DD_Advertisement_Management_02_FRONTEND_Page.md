# DD_AD_02 — Frontend Page (Advertisement Management)

> **Doc ID:** SKM-DD-AD-02 | **Version:** 1.0 | **Status:** Released  
> **Last Updated:** 2026-08-19

---

## 1. Overview

The Advertisement Management frontend consists of three main screens: Merchant Advertisement List, Create/Edit Advertisement Dialog, and Admin Advertisement Moderation. The merchant screens manage ad lifecycle (create, pay, submit, edit, delete), while the admin screen handles approval/rejection workflow.

- **File Path (Merchant List):** `frontend/src/pages/merchant/Advertisements.tsx`
- **File Path (Admin Moderation):** `frontend/src/pages/admin/AdvertisementModeration.tsx`
- **Route (Merchant):** `/merchant/advertisements`
- **Route (Admin):** `/admin/advertisements`
- **Route (Public Banner):** `/` (storefront, banner carousel rendered on home page)

---

## 2. Layout Structure

### 2.1 Merchant Advertisement Management Page Layout (`/merchant/advertisements`)

```
┌──────────────────────────────────────────────────────────────┐
│  Sidebar │  Header (Language Toggle EN/JA/MY | Theme Toggle) │
├──────────┴──────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [A] PAGE HEADER & SUMMARY                             │  │
│  │  Title "Advertisements"          + New Ad Button       │  │
│  │  Subtitle                                               │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐               │  │
│  │  │ Active   │ │ Pending  │ │ Expired  │               │  │
│  │  │ Ads: 3   │ │ Ads: 2   │ │ Ads: 5   │               │  │
│  │  └──────────┘ └──────────┘ └──────────┘               │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [B] TOOLBAR                                           │  │
│  │  Status Filter ▾ │ Approval Filter ▾ │ Search... │ CSV │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [C] AD CARD GRID (3-col desktop / 2-col tablet / 1-col)│  │
│  │  ┌──────────────────┐ ┌──────────────────┐             │  │
│  │  │ Thumbnail        │ │ Thumbnail        │             │  │
│  │  │ Title            │ │ Title            │             │  │
│  │  │ [Active] [Paid]  │ │ [Pending] [Draft]│             │  │
│  │  │ Announcement...  │ │ Announcement...  │             │  │
│  │  │ Aug 01 → Sep 15  │ │ Aug 10 → Sep 08  │             │  │
│  │  │ [Pay&Submit]     │ │ [Edit] [Delete]  │             │  │
│  │  │ [Edit] [Delete]  │ │                  │             │  │
│  │  └──────────────────┘ └──────────────────┘             │  │
│  │  ┌──────────────────┐                                   │  │
│  │  │ Thumbnail        │                                   │  │
│  │  │ Title            │                                   │  │
│  │  │ [Rejected][Paid] │                                   │  │
│  │  │ ⚠ Reason: ...    │                                   │  │
│  │  │ [Resubmit]       │                                   │  │
│  │  │ [Edit] [Delete]  │                                   │  │
│  │  └──────────────────┘                                   │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [D] PAGINATION                                        │  │
│  │  Page 1 of 3 · 12 ads    < Prev   Next >              │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 Create / Edit Advertisement Dialog Layout

```
┌─────────────────────────────────────────────────────┐
│              MODAL DIALOG (max-width 640px)           │
├─────────────────────────────────────────────────────┤
│  Create Advertisement                        [x]    │
│                                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │ Title *                                       │    │
│  │ [________________________]                    │    │
│  │                                               │    │
│  │ Content                                       │    │
│  │ [________________________________________]    │    │
│  │ [________________________________________]    │    │
│  │                                               │    │
│  │ Announcement Message *                        │    │
│  │ [________________________________________]    │    │
│  │ [________________________________________]    │    │
│  │                                    0/500      │    │
│  │                                               │    │
│  │ Image                                         │    │
│  │ ┌─────────────────────────────────────┐       │    │
│  │ │  Drag & drop or click to upload     │       │    │
│  │ │  JPG, PNG, WebP · max 5MB           │       │    │
│  │ └─────────────────────────────────────┘       │    │
│  │                                               │    │
│  │ Link URL                                      │    │
│  │ [https://example.com_____________]            │    │
│  │                                               │    │
│  │ Start Date *    │ End Date *                   │    │
│  │ [2026-08-15   ] │ [2026-09-14   ]              │    │
│  │                                               │    │
│  │ ☑ Visible to buyers during scheduled period   │    │
│  └─────────────────────────────────────────────┘    │
│                                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │ PAYMENT & SUBMISSION                        │    │
│  │ Fee: $50.00    Status: Pending               │    │
│  │ [Pay Fee]   [Submit for Approval] (disabled) │    │
│  │ Approval: Pending                            │    │
│  └─────────────────────────────────────────────┘    │
│                                                      │
│  Cancel                              [Save Ad]       │
└─────────────────────────────────────────────────────┘
```

### 2.3 Admin Advertisement Moderation Page Layout (`/admin/advertisements`)

```
┌──────────────────────────────────────────────────────────────┐
│  Sidebar │  Header (Language Toggle EN/JA/MY | Theme Toggle) │
├──────────┴──────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [G1] Advertisement Moderation                         │  │
│  │  Weekly Limit: "3 of 5 active this week"               │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [G2] PENDING APPROVAL QUEUE                           │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │ Preview: Thumbnail | Title | Announcement        │  │  │
│  │  │ Schedule: Aug 01 → Sep 15 | Shop: ABC Shop      │  │  │
│  │  │ Fee: $50.00 | Payment: Paid                      │  │  │
│  │  │ [Approve]  [Reject]                               │  │  │
│  │  │ Rejection Reason: [________________] (on reject)  │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │ Preview: ...                                      │  │  │
│  │  │ [Approve]  [Reject]                               │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [G8] ALL ADS TABLE (filterable, paginated)            │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Form State & Validation (React Hook Form + Zod)

### 3.1 Advertisement Form Hook

```typescript
// frontend/src/features/merchant/hooks/useAdvertisementForm.ts
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { advertisementSchema, type AdvertisementFormData } from '../schemas/advertisement.schema';

export function useAdvertisementForm(defaultValues?: Partial<AdvertisementFormData>) {
  const methods = useForm<AdvertisementFormData>({
    resolver: zodResolver(advertisementSchema),
    defaultValues: {
      title: '',
      content: '',
      announcementMessage: '',
      imageUrl: undefined,
      linkUrl: '',
      isActive: true,
      startsAt: '',
      expiresAt: '',
      ...defaultValues,
    },
    mode: 'onChange',
  });

  return { methods };
}
```

### 3.2 Zod Validation Schema

```typescript
// frontend/src/features/merchant/schemas/advertisement.schema.ts
import { z } from 'zod';

const MIN_DURATION_DAYS = 7;
const MAX_DURATION_DAYS = 30;

export const advertisementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must not exceed 200 characters'),
  content: z.string().max(5000, 'Content must not exceed 5000 characters').optional().or(z.literal('')),
  announcementMessage: z
    .string()
    .min(1, 'Announcement message is required')
    .max(500, 'Announcement message must not exceed 500 characters'),
  imageUrl: z.instanceof(File).optional(),
  linkUrl: z.string().url('Invalid link URL').max(500).optional().or(z.literal('')),
  isActive: z.boolean().default(true),
  startsAt: z.string().min(1, 'Start date is required'),
  expiresAt: z.string().min(1, 'End date is required'),
}).refine((data) => data.expiresAt > data.startsAt, {
  message: 'End date must be after start date',
  path: ['expiresAt'],
}).refine(
  (data) => {
    if (!data.startsAt || !data.expiresAt) return true;
    const start = new Date(data.startsAt);
    const end = new Date(data.expiresAt);
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= MIN_DURATION_DAYS;
  },
  { message: 'Advertisement must run for at least 7 days', path: ['expiresAt'] }
).refine(
  (data) => {
    if (!data.startsAt || !data.expiresAt) return true;
    const start = new Date(data.startsAt);
    const end = new Date(data.expiresAt);
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= MAX_DURATION_DAYS;
  },
  { message: 'Advertisement duration must not exceed 30 days', path: ['expiresAt'] }
);

export type AdvertisementFormData = z.infer<typeof advertisementSchema>;
```

---

## 4. Sub-Components

### 4.1 AdvertisementCard Component

- **File Path:** `frontend/src/features/merchant/components/AdvertisementCard.tsx`
- **Props:** `advertisement: Advertisement`, `onEdit: () => void`, `onDelete: () => void`, `onPaySubmit: () => void`, `onResubmit: () => void`
- Renders thumbnail with BANNER tag overlay, title, status/approval/payment badges, announcement message (truncated), schedule display, link URL, and action buttons
- Conditional buttons: Pay & Submit (drafts), Resubmit (rejected), Edit/Delete (always)

### 4.2 AdvertisementFormDialog Component

- **File Path:** `frontend/src/features/merchant/components/AdvertisementFormDialog.tsx`
- **Props:** `open: boolean`, `advertisement?: Advertisement`, `onClose: () => void`, `onSaved: () => void`
- Uses `useAdvertisementForm` hook
- Renders all form fields with validation, image upload zone, schedule pickers, active toggle
- Contains Payment & Submission Panel (fee summary, payment status, pay/submit buttons, approval status)
- Mobile: full-screen sheet; Desktop: max-width 640px modal

### 4.3 ImageUpload Component

- **File Path:** `frontend/src/features/merchant/components/ImageUpload.tsx`
- Drag & drop zone for ad image upload
- Client-side MIME validation (JPG, PNG, WebP)
- Client-side size validation (max 5MB)
- File name display and remove button
- Image preview after upload

### 4.4 PaymentSubmissionPanel Component

- **File Path:** `frontend/src/features/merchant/components/PaymentSubmissionPanel.tsx`
- **Props:** `advertisement: Advertisement`, `onPaid: () => void`, `onSubmitted: () => void`
- Displays fee summary (resolved from `ad_fee_settings`), payment status text, Pay Fee button, Submit for Approval button, approval status text with rejection reason
- Submit button disabled until `payment_status = completed`

### 4.5 AdvertisementModerationCard Component

- **File Path:** `frontend/src/features/admin/components/AdvertisementModerationCard.tsx`
- **Props:** `advertisement: Advertisement`, `onApprove: () => void`, `onReject: (reason: string) => void`
- Full ad preview (thumbnail, title, content, announcement, schedule, link, shop name, fee/payment info)
- Approve and Reject buttons; Reject reveals rejection reason textarea (required)

### 4.6 BannerCarousel Component

- **File Path:** `frontend/src/features/storefront/components/BannerCarousel.tsx`
- **Props:** `ads: ActiveAdvertisement[]`
- Auto-play carousel with manual navigation arrows
- 4:1 aspect ratio banners; renders image + announcement message overlay
- Click navigates to `link_url` (new tab)

### 4.7 Shared UI Primitives (shadcn/ui)

| Component | Location | Usage |
|-----------|----------|-------|
| `Dialog` | `frontend/src/components/ui/dialog.tsx` | Create/Edit dialog, delete confirmation |
| `Badge` | `frontend/src/components/ui/badge.tsx` | Status / approval / payment badges |
| `Select` | `frontend/src/components/ui/select.tsx` | Status & approval filters |
| `Switch` | `frontend/src/components/ui/switch.tsx` | Active toggle |
| `Alert` | `frontend/src/components/ui/alert.tsx` | Error / rejection reason banners |
| `Table` | `frontend/src/components/ui/table.tsx` | Admin all-ads table |
| `Toast` | `frontend/src/components/ui/toast.tsx` | Success / error notifications |
| `Skeleton` | `frontend/src/components/ui/skeleton.tsx` | List loading states |

---

## 5. Action Buttons & Handlers

### 5.1 Create Advertisement (Save Ad)

- **Button Type:** `submit`
- **Validation:** Uses Zod `advertisementSchema`
- **Action:**
  1. Validate all fields client-side (title, announcement, schedule, image, duration 7–30 days)
  2. If image attached, send as `multipart/form-data`; otherwise `application/json`
  3. Call `advertisementService.create(formData)`
  4. Backend creates draft with `payment_status = pending`, `approval_status = pending`
  5. Close dialog, refresh ad list, show success toast
  6. New ad appears with "Pay & Submit" action button

### 5.2 Update Advertisement

- **Button Type:** `submit`
- **Validation:** Uses Zod `advertisementSchema` (partial)
- **Action:**
  1. Validate provided fields
  2. Call `advertisementService.update(id, formData)`
  3. If ad was rejected, saving re-submits (`approval_status` → `pending`)
  4. Close dialog, refresh ad list, show success toast

### 5.3 Pay Advertising Fee

- **Button Type:** `button`
- **Action:**
  1. Call `advertisementService.pay(adId)`
  2. Backend resolves fee rate from `ad_fee_settings`, creates payment transaction in `ad_payments`
  3. On success: update `lblPaymentStatus`, `badgePayment`, enable Submit for Approval button
  4. Show success toast "Advertising fee paid successfully"

### 5.4 Submit for Approval

- **Button Type:** `button` (disabled unless `payment_status = completed`)
- **Action:**
  1. Call `advertisementService.submit(adId)`
  2. Backend verifies payment, sets `approval_status = pending`
  3. Ad becomes read-only for merchant until admin decision
  4. Show toast "Advertisement submitted for approval"

### 5.5 Admin Approve

- **Button Type:** `button` (success variant)
- **Action:**
  1. Call `adminAdvertisementService.approve(adId)`
  2. Backend validates weekly limit (max 5) and per-merchant limit (max 2)
  3. On success: remove ad from pending queue, refresh weekly limit indicator, show success toast
  4. On 409: show "Weekly advertisement limit reached" or "Maximum 2 active ads per merchant reached"

### 5.6 Admin Reject

- **Button Type:** `button` (destructive variant)
- **Action:**
  1. Clicking "Reject" reveals rejection reason textarea (required)
  2. Call `adminAdvertisementService.reject(adId, { rejectionReason })`
  3. Backend sets `approval_status = rejected`, processes automatic refund
  4. Remove ad from pending queue, show success toast "Advertisement rejected and refunded"

### 5.7 Soft Delete

- **Button Type:** `button` (ghost, danger)
- **Action:**
  1. Show confirmation dialog: "Delete this advertisement? This action cannot be undone."
  2. On confirm: call `advertisementService.delete(adId)`
  3. Backend sets `is_active = false`
  4. Remove ad from list, refresh stat cards, show success toast

### 5.8 Toggle Active/Inactive

- **Button Type:** `Switch` component
- **Action:**
  1. Toggle `swActive` state in form
  2. Saved on "Update Ad" (`PATCH /api/v1/ads/:id`)
  3. Ad displays only when `is_active = true`, `approval_status = approved`, `payment_status = completed`, and in schedule

### 5.9 Resubmit Rejected Ad

- **Button Type:** `button` (primary)
- **Action:**
  1. Open Edit dialog pre-populated with rejected ad data
  2. Show rejection reason alert at top
  3. Merchant edits fields and saves (auto-resubmits to `pending`)
  4. Approval status returns to `pending` for admin re-review

---

## 6. Lookup Data

### 6.1 Status Filter Options

| Value | Label (EN) | Label (JA) |
|-------|------------|------------|
| `all` | All statuses | すべての状態 |
| `active` | Active | 掲載中 |
| `inactive` | Inactive | 停止中 |
| `expired` | Expired | 終了 |

### 6.2 Approval Status Filter Options

| Value | Label (EN) | Label (JA) |
|-------|------------|------------|
| `all` | All approval statuses | すべての承認状態 |
| `pending` | Pending | 承認待ち |
| `approved` | Approved | 承認済み |
| `rejected` | Rejected | 却下 |

### 6.3 Payment Status Display Mapping

| DB Value | Display (EN) | Display (JA) | Badge Color |
|----------|-------------|-------------|-------------|
| `completed` | Paid | 支払い済み | Green `bg-green-100 text-green-800` |
| `pending` | Payment Pending | 支払い待ち | Amber `bg-amber-100 text-amber-800` |
| `failed` | Payment Failed | 支払い失敗 | Red `bg-red-100 text-red-800` |
| `refunded` | Refunded | 返金済み | Gray `bg-gray-100 text-gray-800` |

---

## 7. Error Handling

### 7.1 Field-Level Errors

- Red border on invalid input
- Inline error message below the field
- Real-time validation on blur and change
- Character counters on content (0/5000) and announcement (0/500) fields

### 7.2 Form-Level Errors

- Alert banner at top of form listing all validation errors
- Toast notification for API errors
- Specific messages: "Shop is not approved", "Advertisement not found", "Advertising fee must be paid before submission"

### 7.3 Loading States

- Skeleton cards during ad list fetch
- Spinner on submit buttons during API calls
- Disable form inputs during submission
- Prevent double submission

### 7.4 Empty States

- Illustrated message: "No advertisements yet. Create your first ad to promote your shop."
- Empty search/filter results: "No advertisements match your filters"

---

## 8. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_AD_01](./DD_Advertisement_Management_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_AD_03](./DD_Advertisement_Management_03_API_ENDPOINTS.md) | Backend REST API contract |
| [DD_AD_04](./DD_Advertisement_Management_04_DTOS_AND_TYPES.md) | DTO and type definitions |
| [DD_AD_05](./DD_Advertisement_Management_05_BUSINESS_LOGIC.md) | Backend business rules |
| [機能設計書_Advertisement_Management](../機能設計書_Advertisement_Management.md) | Full functional specification |
| [画面項目設計書_Advertisement_Management](../画面項目設計書_Advertisement_Management.md) | Screen items specification |
