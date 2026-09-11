import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { ProductForm } from './ProductForm'
import type { Product } from '@/types/product.types'

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return { ...actual, useNavigate: vi.fn() }
})

vi.mock('@/hooks/useProducts', () => ({
  useCreateProduct: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
  useUpdateProduct: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
}))

vi.mock('@/hooks/useProductForm', () => ({
  useProductForm: vi.fn().mockReturnValue({
    register: vi.fn().mockReturnValue({}),
    handleSubmit: vi.fn((fn: unknown) => fn),
    setValue: vi.fn(),
    watch: vi.fn((key: string) => {
      const defaults: Record<string, unknown> = {
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
      }
      return defaults[key]
    }),
    formState: { errors: {} },
  }),
}))

vi.mock('@/components/merchant/ImageUploadZone', () => ({
  ImageUploadZone: () => <div data-testid="image-upload-zone" />,
}))

vi.mock('@/components/merchant/ImagePreviewGrid', () => ({
  ImagePreviewGrid: () => <div data-testid="image-preview-grid" />,
}))

vi.mock('@/components/merchant/TagInput', () => ({
  TagInput: () => <div data-testid="tag-input" />,
}))

vi.mock('@/components/merchant/CategorySelect', () => ({
  CategorySelect: () => <div data-testid="category-select" />,
}))

vi.mock('@/components/merchant/RichTextEditor', () => ({
  RichTextEditor: () => <div data-testid="rich-text-editor" />,
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mockProduct: Product = {
  id: 'prod-1',
  name: 'Hydrating Serum',
  slug: 'hydrating-serum',
  shortDescription: 'A hydrating serum',
  description: 'Detailed description',
  price: 29.99,
  compareAtPrice: 39.99,
  sku: 'HS-001',
  stockQuantity: 50,
  lowStockThreshold: 10,
  images: ['/uploads/products/img1.jpg'],
  skinTypes: ['dry'],
  ingredients: ['Hyaluronic Acid'],
  tags: ['hydrating'],
  isActive: true,
  isFeatured: false,
  avgRating: 4.5,
  reviewCount: 10,
  category: { id: 'cat-1', name: 'Skincare', slug: 'skincare' },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('ProductForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders create mode with correct title', () => {
    render(
      <MemoryRouter>
        <ProductForm mode="create" />
      </MemoryRouter>,
    )
    expect(screen.getByText('Create New Product')).toBeInTheDocument()
  })

  it('renders edit mode with correct title', () => {
    render(
      <MemoryRouter>
        <ProductForm mode="edit" product={mockProduct} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Edit: Hydrating Serum')).toBeInTheDocument()
  })

  it('renders all form sections', () => {
    render(
      <MemoryRouter>
        <ProductForm mode="create" />
      </MemoryRouter>,
    )
    expect(screen.getByText('Basic Information')).toBeInTheDocument()
    expect(screen.getByText('Media')).toBeInTheDocument()
    expect(screen.getByText('Tags & Attributes')).toBeInTheDocument()
    expect(screen.getByText('Organization')).toBeInTheDocument()
    expect(screen.getByText('Pricing & Inventory')).toBeInTheDocument()
  })

  it('renders SKU field as disabled', () => {
    render(
      <MemoryRouter>
        <ProductForm mode="create" />
      </MemoryRouter>,
    )
    const skuInput = screen.getByPlaceholderText('e.g., VCS-001')
    expect(skuInput).toBeDisabled()
  })

  it('renders skin type buttons', () => {
    render(
      <MemoryRouter>
        <ProductForm mode="create" />
      </MemoryRouter>,
    )
    expect(screen.getByText('Dry')).toBeInTheDocument()
    expect(screen.getByText('Oily')).toBeInTheDocument()
    expect(screen.getByText('Combination')).toBeInTheDocument()
    expect(screen.getByText('Sensitive')).toBeInTheDocument()
    expect(screen.getByText('Normal')).toBeInTheDocument()
  })

  it('renders submit button with correct text for create', () => {
    render(
      <MemoryRouter>
        <ProductForm mode="create" />
      </MemoryRouter>,
    )
    expect(screen.getByText('Create Product')).toBeInTheDocument()
  })

  it('renders submit button with correct text for edit', () => {
    render(
      <MemoryRouter>
        <ProductForm mode="edit" product={mockProduct} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Save Changes')).toBeInTheDocument()
  })

  it('renders image upload zone', () => {
    render(
      <MemoryRouter>
        <ProductForm mode="create" />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('image-upload-zone')).toBeInTheDocument()
  })

  it('renders image preview grid in edit mode', () => {
    render(
      <MemoryRouter>
        <ProductForm mode="edit" product={mockProduct} />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('image-preview-grid')).toBeInTheDocument()
  })

  it('renders category select', () => {
    render(
      <MemoryRouter>
        <ProductForm mode="create" />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('category-select')).toBeInTheDocument()
  })

  it('renders rich text editor', () => {
    render(
      <MemoryRouter>
        <ProductForm mode="create" />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('rich-text-editor')).toBeInTheDocument()
  })

  it('renders tag inputs for tags and ingredients', () => {
    render(
      <MemoryRouter>
        <ProductForm mode="create" />
      </MemoryRouter>,
    )
    const tagInputs = screen.getAllByTestId('tag-input')
    expect(tagInputs).toHaveLength(2)
  })
})
