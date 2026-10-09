import { z } from 'zod'

// Ads render their description inside a 2-line clamp (line-clamp-2) in every
// placement (checkout slider, search slider, sidebar, matching panel). At the
// narrowest of those (~300px on mobile) two lines hold about 100 characters,
// so anything longer is cut off with "…" on screen.
export const AD_CONTENT_MAX = 100

const contentFields = {
  title: z.string().min(1, 'Title is required').max(200, 'Title must not exceed 200 characters'),
  content: z.string().max(AD_CONTENT_MAX, `Content must not exceed ${AD_CONTENT_MAX} characters`),
  // The image is not uploaded: the merchant picks one of the images already
  // attached to one of their own products, so the value is a stored product
  // image path (e.g. /uploads/products/<file>) and is validated server-side
  // against the merchant's catalogue.
  imageUrl: z.string().max(2048, 'Image path must not exceed 2048 characters'),
  announcementMessage: z.string().min(1, 'Announcement message is required').max(500, 'Announcement message must not exceed 500 characters'),
  // Required-only here: the plain Edit dialog keeps the previously saved
  // schedule (field disabled), which may predate the 3-day rule. The
  // Resubmit dialog uses resubmitContentSchema below so the merchant can
  // re-pick the start date.
  startsAt: z.string().min(1, 'Start date is required'),
}

// Start date must be at least 3 days from today (UTC day granularity): today,
// tomorrow, and the day after tomorrow cannot be selected, so the first
// selectable date is two days after tomorrow. Applies to both new uploads and
// resubmission of rejected ads.
function isSelectableStartDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || value.length !== 10) return false
  const min = new Date()
  min.setUTCHours(0, 0, 0, 0)
  min.setUTCDate(min.getUTCDate() + 3)
  return date >= min
}

export const uploadContentSchema = z.object({
  ...contentFields,
  // Strict rule only where the merchant sets a fresh schedule (Upload Content
  // dialog); the plain Edit dialog cannot change the schedule.
  startsAt: contentFields.startsAt.refine(isSelectableStartDate, {
    message: 'Start date must be at least 3 days from today',
  }),
  imageUrl: contentFields.imageUrl.min(1, 'Advertisement image is required'),
})

// Edit / Resubmit dialog for rejected ads: content fields plus a re-pickable
// schedule. The same 3-day lead time as new uploads applies; the backend
// derives expires_at from the package duration. An empty imageUrl keeps the
// currently saved image, so it stays optional here.
export const resubmitContentSchema = z.object({
  ...contentFields,
  startsAt: contentFields.startsAt.refine(isSelectableStartDate, {
    message: 'Start date must be at least 3 days from today',
  }),
})

export const contentSchema = z.object({
  ...contentFields,
})

// Payment reference is a numeric transaction reference: at least 8 digits,
// up to the 100-character column limit.
export const paymentSchema = z.object({
  paymentReference: z
    .string()
    .min(8, 'Payment reference must be at least 8 digits')
    .max(100, 'Payment reference must not exceed 100 characters')
    .regex(/^\d+$/, 'Payment reference must contain only digits'),
})

export type UploadContentForm = z.infer<typeof uploadContentSchema>
export type ContentForm = z.infer<typeof contentSchema>
export type PaymentForm = z.infer<typeof paymentSchema>
