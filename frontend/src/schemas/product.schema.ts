import { z } from 'zod'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const imageFileSchema = z
  .instanceof(File)
  .refine((file) => file.size <= MAX_FILE_SIZE, `Image must be less than 5MB`)
  .refine(
    (file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
    'Only JPG, PNG, and WebP images are allowed',
  )

export const createProductSchema = z.object({
  name: z
    .string()
    .min(1, 'Product name is required')
    .max(255, 'Product name must not exceed 255 characters'),
  shortDescription: z
    .string()
    .min(1, 'Short description is required')
    .max(500, 'Short description must not exceed 500 characters'),
  description: z.string().min(1, 'Description is required'),
  categoryId: z.string().min(1, 'Category is required'),
  sku: z.string().max(100, 'SKU must not exceed 100 characters').optional().or(z.literal('')),
  price: z
    .number({ invalid_type_error: 'Price must be a number' })
    .min(0.01, 'Price must be greater than 0'),
  compareAtPrice: z
    .number({ invalid_type_error: 'Compare at price must be a number' })
    .min(0, 'Compare at price must be 0 or greater')
    .optional()
    .or(z.nan())
    .transform((v) => (isNaN(v) ? undefined : v)),
  stockQuantity: z
    .number({ invalid_type_error: 'Stock quantity must be a number' })
    .int('Stock quantity must be a whole number')
    .min(0, 'Stock quantity must be 0 or greater')
    .default(0),
  lowStockThreshold: z
    .number({ invalid_type_error: 'Low stock threshold must be a number' })
    .int('Low stock threshold must be a whole number')
    .min(0, 'Low stock threshold must be 0 or greater')
    .optional()
    .default(10),
  skinTypes: z.array(z.string()).optional().default([]),
  ingredients: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  isActive: z.boolean().optional().default(true),
  isFeatured: z.boolean().optional().default(false),
  images: z.array(imageFileSchema).max(10, 'Maximum 10 images allowed').optional().default([]),
})

export type CreateProductFormData = z.infer<typeof createProductSchema>

export const updateProductSchema = createProductSchema.partial().extend({
  isActive: z.boolean(),
  retainedImageUrls: z.array(z.string()).optional().default([]),
  images: z.array(imageFileSchema).max(10, 'Maximum 10 images allowed').optional().default([]),
})

export type UpdateProductFormData = z.infer<typeof updateProductSchema>

export const productQuerySchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().optional(),
  skinType: z.string().optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  sortBy: z.enum(['price', 'rating', 'newest', 'name']).optional().default('newest'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(20),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
})

export type ProductQueryFormData = z.infer<typeof productQuerySchema>
