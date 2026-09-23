import { useForm, type UseFormReturn, type Resolver } from 'react-hook-form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { createProductSchema, updateProductSchema } from '@/schemas/product.schema'
import type { CreateProductFormData, UpdateProductFormData, ProductFormData } from '@/schemas/product.schema'
import type { Product } from '@/types/product.types'

export type { CreateProductFormData, UpdateProductFormData, ProductFormData }

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

export function useProductForm(options: {
  mode: 'create' | 'edit'
  product?: Product
}): UseFormReturn<ProductFormData> {
  const { mode, product } = options
  return useForm<ProductFormData>({
    // The edit schema's fields are optional, so its inferred input type
    // doesn't satisfy standardSchemaResolver's FieldValues constraint, and
    // validation output differs from ProductFormData at the type level only.
    // Runtime behavior is identical, so casts on both the schema argument
    // and the resulting resolver are safe.
    resolver: standardSchemaResolver(
      (mode === 'edit' ? updateProductSchema : createProductSchema) as never,
    ) as unknown as Resolver<ProductFormData>,
    defaultValues:
      mode === 'edit' && product
        ? {
            name: product.name,
            shortDescription: product.shortDescription,
            description: product.description ?? '',
            categoryId: product.category?.id ?? '',
            sku: product.sku ?? '',
            price: toNumOrUndefined(product.price),
            compareAtPrice:
              product.compareAtPrice != null
                ? toNumOrUndefined(product.compareAtPrice)
                : undefined,
            stockQuantity: toNum(product.stockQuantity),
            lowStockThreshold: toNum(product.lowStockThreshold),
            skinTypes: (product.skinTypes ?? []).flatMap((s: string) => {
              const lower = s.toLowerCase()
              return lower === 'all'
                ? ['dry', 'oily', 'combination', 'sensitive', 'normal']
                : lower
            }),
            ingredients: product.ingredients ?? [],
            tags: product.tags ?? [],
            isActive: product.isActive,
            isFeatured: product.isFeatured,
            retainedImageUrls: product.images ?? [],
            images: [],
          }
        : {
            name: '',
            shortDescription: '',
            description: '',
            categoryId: '',
            sku: '',
            price: undefined,
            compareAtPrice: undefined,
            stockQuantity: 0,
            lowStockThreshold: 10,
            skinTypes: [],
            ingredients: [],
            tags: [],
            isActive: true,
            isFeatured: false,
            retainedImageUrls: [],
            images: [],
          },
  })
}

export function useCreateProductForm() {
  return useProductForm({ mode: 'create' })
}

export function useUpdateProductForm(product?: Product) {
  return useProductForm({ mode: 'edit', product })
}

