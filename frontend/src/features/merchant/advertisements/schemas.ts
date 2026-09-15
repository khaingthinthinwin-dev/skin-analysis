import { z } from 'zod'

export const contentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must not exceed 200 characters'),
  content: z.string().max(5000, 'Content must not exceed 5000 characters'),
  linkUrl: z.union([z.string().url('Invalid URL format').max(2048, 'Link URL must not exceed 2048 characters'), z.literal('')]),
  announcementMessage: z.string().min(1, 'Announcement message is required').max(500, 'Announcement message must not exceed 500 characters'),
  startsAt: z.string().min(1, 'Start date is required'),
  image: z.custom<File | null>().nullable().optional(),
})

export const paymentSchema = z.object({
  paymentReference: z.string().max(100, 'Payment reference must not exceed 100 characters'),
})

export type ContentForm = z.infer<typeof contentSchema>
export type PaymentForm = z.infer<typeof paymentSchema>
