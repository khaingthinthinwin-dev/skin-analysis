import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProductReview from './ProductReview'
import { useProduct, useProducts } from '@/hooks/useProducts'
import type { Product } from '@/types/product.types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: { name?: string }) => {
      const labels: Record<string, string> = {
        'merchant.productReview.title': 'Product Review',
        'merchant.productReview.subtitle': 'View review counts for your products',
        'merchant.productReview.searchLabel': 'Search products',
        'merchant.productReview.reviewCount': 'Review Count',
        'merchant.productReview.viewProduct': 'View {{name}}',
        'merchant.productReview.highlightUnavailable': 'The product linked from this notification could not be loaded.',
        'merchant.products.searchPlaceholder': 'Search products...',
        'merchant.products.error.load': 'Failed to load products. Please try again.',
        'merchant.products.retry': 'Retry',
        'merchant.products.table.image': 'Image',
        'merchant.products.table.name': 'Product Name',
        'merchant.products.table.sku': 'SKU',
        'merchant.products.table.price': 'Price (Discount Price)',
        'merchant.products.table.compareAtPrice': 'Compare At Price',
        'merchant.products.table.action': 'Action',
        'merchant.products.empty': 'No products found',
        'merchant.products.imageAlt': 'Image of {{name}}',
        'merchant.products.noImage': 'No image',
      }
      return (labels[key] ?? key).replace('{{name}}', values?.name ?? '')
    },
  }),
}))

vi.mock('@/hooks/useProducts', () => ({
  useProduct: vi.fn(),
  useProducts: vi.fn(),
}))

const product: Product = {
  id: 'product-1',
  name: 'Daily Moisturizer',
  slug: 'daily-moisturizer',
  shortDescription: '',
  description: '',
  price: 12000,
  compareAtPrice: 15000,
  sku: 'MOIST-01',
  stockQuantity: 8,
  lowStockThreshold: 2,
  images: [],
  tags: [],
  skinTypes: [],
  ingredients: [],
  isActive: true,
  isFeatured: false,
  avgRating: 4,
  reviewCount: 17,
  createdAt: '',
  updatedAt: '',
  category: { id: 'category-1', name: 'Moisturizer', slug: 'moisturizer' },
}

describe('ProductReview page', () => {
  beforeEach(() => {
    vi.mocked(useProduct).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useProduct>)
    vi.mocked(useProducts).mockReturnValue({
      data: {
        items: [product],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useProducts>)
  })

  it('shows review count and omits inventory, status, and featured columns', () => {
    render(
      <MemoryRouter>
        <ProductReview />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Product Review' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Review Count' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Action' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '17' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'View Daily Moisturizer' })).toBeInTheDocument()
    expect(screen.getByText('15,000Ks')).toHaveClass('line-through')
    expect(screen.queryByRole('columnheader', { name: 'Stock' })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Status' })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'isFeatured' })).not.toBeInTheDocument()
  })

  it('adds and boxes the highlighted product when it is outside the current page', () => {
    vi.mocked(useProducts).mockReturnValue({
      data: {
        items: [{ ...product, id: 'other-product', name: 'Other Product' }],
        meta: { total: 11, page: 2, limit: 10, totalPages: 2 },
      },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useProducts>)
    vi.mocked(useProduct).mockReturnValue({
      data: product,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useProduct>)

    render(
      <MemoryRouter initialEntries={['/merchant/product-review?highlight=product-1']}>
        <ProductReview />
      </MemoryRouter>,
    )

    const row = screen.getByRole('row', { name: /Daily Moisturizer/ })
    expect(row).toHaveClass('border-b-0')
    expect(row).toHaveClass('[&>td]:!border-y-2')
    expect(row).toHaveClass('[&>td:first-child]:!border-l-2')
    expect(row).toHaveClass('[&>td:first-child]:rounded-l-md')
    expect(row).toHaveClass('[&>td:last-child]:rounded-r-md')
    expect(vi.mocked(useProduct)).toHaveBeenCalledWith('product-1')
  })
})
