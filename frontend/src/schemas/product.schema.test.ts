import { describe, it, expect } from 'vitest'
import { createProductSchema, updateProductSchema } from './product.schema'

const baseFields = {
  name: 'Test Product',
  shortDescription: 'Short',
  description: 'Description',
  categoryId: 'cat-1',
  price: 20000,
  compareAtPrice: 25000,
  stockQuantity: 10,
  skinTypes: [],
  ingredients: [],
  tags: [],
  isActive: true,
  isFeatured: false,
  retainedImageUrls: [],
  images: [],
}

describe('product price schema', () => {
  it('allows empty price (discount) on create when compareAtPrice is set', () => {
    const result = createProductSchema.safeParse({
      ...baseFields,
      price: null,
      lowStockThreshold: 0,
      images: [new File(['x'], 'a.png', { type: 'image/png' })],
    })
    expect(result.success).toBe(true)
  })

  it('requires compareAtPrice on create', () => {
    const result = createProductSchema.safeParse({
      ...baseFields,
      compareAtPrice: null,
      lowStockThreshold: 0,
      images: [new File(['x'], 'a.png', { type: 'image/png' })],
    })
    expect(result.success).toBe(false)
  })

  it('rejects compareAtPrice lower than price', () => {
    const result = createProductSchema.safeParse({
      ...baseFields,
      compareAtPrice: 100,
      lowStockThreshold: 0,
      images: [new File(['x'], 'a.png', { type: 'image/png' })],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        'Compare price must be greater than selling price',
      )
    }
  })

  it('requires compareAtPrice on update', () => {
    const result = updateProductSchema.safeParse({
      price: 20000,
      compareAtPrice: null,
      retainedImageUrls: ['/uploads/products/img1.jpg'],
      images: [],
    })
    expect(result.success).toBe(false)
  })

  it('allows empty price (discount) on update when compareAtPrice is set', () => {
    const result = updateProductSchema.safeParse({
      price: null,
      compareAtPrice: 25000,
      retainedImageUrls: ['/uploads/products/img1.jpg'],
      images: [],
    })
    expect(result.success).toBe(true)
  })
})
