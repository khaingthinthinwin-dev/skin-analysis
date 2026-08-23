import { z } from 'zod'

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters'),
  phone: z
    .string()
    .max(20, 'Phone number must not exceed 20 characters')
    .regex(/^[\d\s\-+()]*$/, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  avatarUrl: z
    .string()
    .url('Invalid URL format')
    .max(500, 'URL must not exceed 500 characters')
    .optional()
    .or(z.literal('')),
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
