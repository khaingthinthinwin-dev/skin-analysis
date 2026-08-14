import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required').min(8, 'Password must be at least 8 characters'),
})

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPTED_MIME_TYPES = ['application/pdf']

export const registerSchema = z
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
    role: z.enum(['buyer', 'merchant'], { message: 'Please select a role' }),
    licenseFile: z.any().optional().nullable(),
    agreeToTerms: z.boolean().refine((val) => val === true, {
      message: 'You must agree to the Terms of Service',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine(
    (data) => {
      if (data.role === 'merchant' && !data.licenseFile) {
        return false
      }
      return true
    },
    {
      message: 'Business license is required for merchant registration',
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
      message: 'File type not supported. Only PDF files are accepted.',
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
      message: 'File exceeds maximum size of 10 MB',
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
      message: 'File must be named license.pdf',
      path: ['licenseFile'],
    }
  )

export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
