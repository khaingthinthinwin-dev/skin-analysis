import { z } from 'zod'

/** Same pattern as registration: optional +, digits, spaces, dashes, parentheses */
export const PHONE_REGEX = /^\+?[0-9()\-\s]{7,20}$/

export const updateProfileSchema = z
  .object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must not exceed 100 characters'),
    /** Internal only — mirrors registerSchema, never sent to the API */
    role: z.string().optional(),
    phone: z.string().optional().or(z.literal('')),
    address: z.string().optional().or(z.literal('')),
    avatarUrl: z
      .string()
      .optional()
      .or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    // Values are compared trimmed, so " " counts as empty
    const phone = data.phone?.trim() ?? ''
    const address = data.address?.trim() ?? ''
    const isMerchant = data.role === 'merchant'

    if (isMerchant && !phone) {
      ctx.addIssue({
        code: 'custom',
        path: ['phone'],
        message: 'Phone number is required for merchant accounts',
      })
    } else if (phone && !PHONE_REGEX.test(phone)) {
      ctx.addIssue({
        code: 'custom',
        path: ['phone'],
        message: 'Please enter a valid phone number',
      })
    }

    if (isMerchant && !address) {
      ctx.addIssue({
        code: 'custom',
        path: ['address'],
        message: 'Shop address is required for merchant accounts',
      })
    } else if (address.length > 255) {
      ctx.addIssue({
        code: 'custom',
        path: ['address'],
        message: 'Address must not exceed 255 characters',
      })
    }
  })

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(1, 'New password is required')
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must not exceed 128 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[@$!%*?&]/, 'Password must contain at least one special character (@$!%*?&)'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>
