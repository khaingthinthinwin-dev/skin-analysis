import { z } from 'zod'
import i18n from '@/i18n'

export const loginSchema = z.object({
  email: z.string()
    .min(1, { error: () => i18n.t('auth.validation.emailRequired', { defaultValue: 'Email is required' }) })
    .email({ error: () => i18n.t('auth.validation.emailInvalid', { defaultValue: 'Please enter a valid email address' }) }),
  password: z.string()
    .min(1, { error: () => i18n.t('auth.validation.passwordRequired', { defaultValue: 'Password is required' }) })
    .min(8, { error: () => i18n.t('auth.validation.passwordMinLength', { defaultValue: 'Password must be at least 8 characters' }) }),
})

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPTED_MIME_TYPES = ['application/pdf']
const PHONE_REGEX = /^\+?[0-9()\-\s]{7,20}$/

export const registerSchema = z
  .object({
    name: z.string()
      .min(2, { error: () => i18n.t('auth.validation.nameMinLength', { defaultValue: 'Name must be at least 2 characters' }) })
      .max(200, { error: () => i18n.t('auth.validation.nameMaxLength', { defaultValue: 'Name must not exceed 200 characters' }) }),
    email: z.string()
      .min(1, { error: () => i18n.t('auth.validation.emailRequired', { defaultValue: 'Email is required' }) })
      .email({ error: () => i18n.t('auth.validation.emailInvalid', { defaultValue: 'Please enter a valid email address' }) })
      .max(255, { error: () => i18n.t('auth.validation.emailMaxLength', { defaultValue: 'Email must not exceed 255 characters' }) }),
    password: z
      .string()
      .min(1, { error: () => i18n.t('auth.validation.passwordRequired', { defaultValue: 'Password is required' }) })
      .min(8, { error: () => i18n.t('auth.validation.passwordMinLength', { defaultValue: 'Password must be at least 8 characters' }) })
      .max(128, { error: () => i18n.t('auth.validation.passwordMaxLength', { defaultValue: 'Password must not exceed 128 characters' }) })
      .regex(/[A-Z]/, { error: () => i18n.t('auth.validation.passwordUppercase', { defaultValue: 'Password must contain at least one uppercase letter' }) })
      .regex(/[a-z]/, { error: () => i18n.t('auth.validation.passwordLowercase', { defaultValue: 'Password must contain at least one lowercase letter' }) })
      .regex(/[0-9]/, { error: () => i18n.t('auth.validation.passwordNumber', { defaultValue: 'Password must contain at least one number' }) })
      .regex(/[@$!%*?&]/, { error: () => i18n.t('auth.validation.passwordSpecial', { defaultValue: 'Password must contain at least one special character (@$!%*?&)' }) }),
    confirmPassword: z.string().min(1, { error: () => i18n.t('auth.validation.confirmPasswordRequired', { defaultValue: 'Please confirm your password' }) }),
    role: z.enum(['buyer', 'merchant'], { error: () => i18n.t('auth.validation.roleRequired', { defaultValue: 'Please select a role' }) }),
    address: z.string()
      .trim()
      .max(255, { error: () => i18n.t('auth.validation.addressMaxLength', { defaultValue: 'Address must not exceed 255 characters' }) })
      .optional(),
    phone: z.string()
      .trim()
      .max(20, { error: () => i18n.t('auth.validation.phoneMaxLength', { defaultValue: 'Phone number must not exceed 20 characters' }) })
      .optional(),
    licenseFile: z.any().optional().nullable(),
    agreeToTerms: z.boolean().refine((val) => val === true, {
      error: () => i18n.t('auth.validation.termsRequired', { defaultValue: 'You must agree to the Terms of Service' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: () => i18n.t('auth.validation.passwordMismatch', { defaultValue: 'Passwords do not match' }),
    path: ['confirmPassword'],
  })
  .refine(
    (data) => data.role !== 'merchant' || !!data.address?.trim(),
    {
      error: () => i18n.t('auth.validation.addressRequired', { defaultValue: 'Shop address is required for merchant registration' }),
      path: ['address'],
    }
  )
  .refine(
    (data) => data.role !== 'merchant' || !!data.phone?.trim(),
    {
      error: () => i18n.t('auth.validation.phoneRequired', { defaultValue: 'Phone number is required for merchant registration' }),
      path: ['phone'],
    }
  )
  .refine(
    (data) =>
      data.role !== 'merchant' ||
      !data.phone?.trim() ||
      PHONE_REGEX.test(data.phone.trim()),
    {
      error: () => i18n.t('auth.validation.phoneInvalid', { defaultValue: 'Please enter a valid phone number' }),
      path: ['phone'],
    }
  )
  .refine(
    (data) => {
      if (data.role === 'merchant' && !data.licenseFile) {
        return false
      }
      return true
    },
    {
      error: () => i18n.t('auth.validation.licenseRequired', { defaultValue: 'Business license is required for merchant registration' }),
      path: ['licenseFile'],
    }
  )
  .refine(
    (data) => {
      if (data.licenseFile) {
        return ACCEPTED_MIME_TYPES.includes(data.licenseFile.type)
      }
      return true
    },
    {
      error: () => i18n.t('auth.validation.licenseType', { defaultValue: 'File type not supported. Only PDF files are accepted.' }),
      path: ['licenseFile'],
    }
  )
  .refine(
    (data) => {
      if (data.licenseFile) {
        return data.licenseFile.size <= MAX_FILE_SIZE
      }
      return true
    },
    {
      error: () => i18n.t('auth.validation.licenseSize', { defaultValue: 'File exceeds maximum size of 10 MB' }),
      path: ['licenseFile'],
    }
  )
  .refine(
    (data) => {
      if (data.licenseFile) {
        return data.licenseFile.name.toLowerCase() === 'license.pdf'
      }
      return true
    },
    {
      error: () => i18n.t('auth.validation.licenseName', { defaultValue: 'File must be named license.pdf' }),
      path: ['licenseFile'],
    }
  )

export const forgotPasswordSchema = z.object({
  email: z.string()
    .min(1, { error: () => i18n.t('auth.validation.emailRequired', { defaultValue: 'Email is required' }) })
    .email({ error: () => i18n.t('auth.validation.emailInvalid', { defaultValue: 'Please enter a valid email address' }) }),
})

export const verifyCodeSchema = z.object({
  code: z.string().min(1, 'Verification code is required').length(6, 'Code must be exactly 6 digits'),
})

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, { error: () => i18n.t('auth.validation.passwordRequired', { defaultValue: 'Password is required' }) })
      .min(8, { error: () => i18n.t('auth.validation.passwordMinLength', { defaultValue: 'Password must be at least 8 characters' }) })
      .max(128, { error: () => i18n.t('auth.validation.passwordMaxLength', { defaultValue: 'Password must not exceed 128 characters' }) })
      .regex(/[A-Z]/, { error: () => i18n.t('auth.validation.passwordUppercase', { defaultValue: 'Password must contain at least one uppercase letter' }) })
      .regex(/[a-z]/, { error: () => i18n.t('auth.validation.passwordLowercase', { defaultValue: 'Password must contain at least one lowercase letter' }) })
      .regex(/[0-9]/, { error: () => i18n.t('auth.validation.passwordNumber', { defaultValue: 'Password must contain at least one number' }) })
      .regex(/[@$!%*?&]/, { error: () => i18n.t('auth.validation.passwordSpecial', { defaultValue: 'Password must contain at least one special character (@$!%*?&)' }) }),
    confirmPassword: z.string().min(1, { error: () => i18n.t('auth.validation.confirmPasswordRequired', { defaultValue: 'Please confirm your password' }) }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: () => i18n.t('auth.validation.passwordMismatch', { defaultValue: 'Passwords do not match' }),
    path: ['confirmPassword'],
  })

export const createAdminSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(200, 'Name must not exceed 200 characters'),
    email: z.string().min(1, 'Email is required').email('Please enter a valid email address').max(255, 'Email must not exceed 255 characters'),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must not exceed 128 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[@$!%*?&]/, 'Password must contain at least one special character (@$!%*?&)'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    role: z.enum(['admin', 'super_admin'], { message: 'Please select a valid admin role' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>
export type VerifyCodeFormData = z.infer<typeof verifyCodeSchema>
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>
export type CreateAdminFormData = z.infer<typeof createAdminSchema>
