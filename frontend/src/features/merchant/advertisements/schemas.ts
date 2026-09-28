import { z } from 'zod'

const contentFields = {
  title: z.string().min(1, 'Title is required').max(200, 'Title must not exceed 200 characters'),
  content: z.string().max(5000, 'Content must not exceed 5000 characters'),
  linkUrl: z.union([z.string().url('Invalid URL format').max(2048, 'Link URL must not exceed 2048 characters'), z.literal('')]),
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
  image: z.custom<File>((val) => val instanceof File, { message: 'Advertisement image is required' }),
})

// Edit / Resubmit dialog for rejected ads: content fields plus a re-pickable
// schedule. The same 3-day lead time as new uploads applies; the backend
// derives expires_at from the package duration.
export const resubmitContentSchema = z.object({
  ...contentFields,
  startsAt: contentFields.startsAt.refine(isSelectableStartDate, {
    message: 'Start date must be at least 3 days from today',
  }),
  image: z.custom<File | null>().nullable().optional(),
})

export const contentSchema = z.object({
  ...contentFields,
  image: z.custom<File | null>().nullable().optional(),
})

export const paymentSchema = z.object({
  paymentReference: z.string().max(100, 'Payment reference must not exceed 100 characters'),
})

export type UploadContentForm = z.infer<typeof uploadContentSchema>
export type ContentForm = z.infer<typeof contentSchema>
export type PaymentForm = z.infer<typeof paymentSchema>
