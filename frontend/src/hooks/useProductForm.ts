import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createProductSchema, updateProductSchema } from '@/schemas/product.schema'
import type { CreateProductFormData, UpdateProductFormData } from '@/schemas/product.schema'
import type { Product } from '@/types/product.types'

function toNum(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isNaN(n) ? 0 : n
  }
  return 0
}

function toNumOrUndefined(v: unknown): number | undefined {
  if (v == null) return undefined
  if (typeof v === 'number') return Number.isNaN(v) ? undefined : v
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isNaN(n) ? undefined : n
  }
  return undefined
}

export function useCreateProductForm() {
  return useForm<CreateProductFormData>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      name: '',
      shortDescription: '',
      description: '',
      categoryId: '',
      sku: '',
      price: 0,
      compareAtPrice: undefined,
      stockQuantity: 0,
      lowStockThreshold: 10,
      skinTypes: [],
      ingredients: [],
      tags: [],
      isActive: true,
      isFeatured: false,
      images: [],
    },
  })
}

export function useUpdateProductForm(product?: Product) {
  return useForm<UpdateProductFormData>({
    resolver: zodResolver(updateProductSchema),
    defaultValues: product
      ? {
          name: product.name,
          shortDescription: product.shortDescription,
          description: product.description,
          categoryId: product.category.id,
          sku: product.sku ?? '',
          price: toNum(product.price),
          compareAtPrice: toNumOrUndefined(product.compareAtPrice),
          stockQuantity: toNum(product.stockQuantity),
          lowStockThreshold: toNum(product.lowStockThreshold),
          skinTypes: product.skinTypes ?? [],
          ingredients: product.ingredients ?? [],
          tags: product.tags ?? [],
          isActive: product.isActive,
          isFeatured: product.isFeatured,
          retainedImageUrls: product.images ?? [],
          images: [],
        }
      : undefined,
  })
}
