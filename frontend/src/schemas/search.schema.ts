import { z } from 'zod'

const skinTypeEnum = z.enum(['dry', 'oily', 'combination', 'sensitive', 'normal'])
const sortFieldEnum = z.enum(['price', 'rating', 'createdAt'])
const sortOrderEnum = z.enum(['asc', 'desc'])

export const searchParamsSchema = z.object({
  q: z.string().max(255).optional().default(''),
  categoryId: z.string().uuid().optional().default(''),
  skinTypes: z
    .union([skinTypeEnum, z.array(skinTypeEnum)])
    .optional()
    .transform((v) => (Array.isArray(v) ? v : v ? [v] : []))
    .default([]),
  ingredients: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (Array.isArray(v) ? v : v ? v.split(',').filter(Boolean) : []))
    .default([]),
  tags: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (Array.isArray(v) ? v : v ? v.split(',').filter(Boolean) : []))
    .default([]),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  rating: z.coerce.number().min(1).max(5).optional(),
  sort: sortFieldEnum.optional().default('createdAt'),
  order: sortOrderEnum.optional().default('desc'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
}).refine(
  (data) =>
    data.minPrice === undefined ||
    data.maxPrice === undefined ||
    data.minPrice <= data.maxPrice,
  { message: 'Minimum price cannot exceed maximum price', path: ['minPrice'] },
)

export type SearchParams = z.infer<typeof searchParamsSchema>

export const SORT_OPTIONS = [
  { value: 'createdAt:desc', label: 'Newest' },
  { value: 'price:asc', label: 'Price: Low to High' },
  { value: 'price:desc', label: 'Price: High to Low' },
  { value: 'rating:desc', label: 'Highest Rated' }, 
] as const

export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const
