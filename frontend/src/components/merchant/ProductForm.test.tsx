import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { ProductForm } from './ProductForm'
import type { Product } from '@/types/product.types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: { name?: string }) => {
      const labels: Record<string, string> = {
        'merchant.products.toast.created': 'Product created successfully',
        'merchant.products.toast.updated': 'Product updated successfully',
        'merchant.products.error.generic': 'Something went wrong. Please try again.',
        'merchant.products.form.createTitle': 'Create New Product',
        'merchant.products.form.editTitle': 'Edit: {{name}}',
        'merchant.products.form.create': 'Create Product',
        'merchant.products.form.saveChanges': 'Save Changes',
        'merchant.products.form.basicInformation': 'Basic Information',
        'merchant.products.form.productName': 'Product Name',
        'merchant.products.form.productNamePlaceholder': 'e.g., Vitamin C Serum',
        'merchant.products.form.shortDescription': 'Short Description',
        'merchant.products.form.shortDescriptionPlaceholder': 'Brief product description (max 500 chars)',
        'merchant.products.form.fullDescription': 'Full Description',
        'merchant.products.form.fullDescriptionPlaceholder': 'Detailed product description',
        'merchant.products.form.media': 'Media',
        'merchant.products.form.tagsAttributes': 'Tags & Attributes',
        'merchant.products.form.tags': 'Tags',
        'merchant.products.form.addTagPlaceholder': 'Add a tag...',
        'merchant.products.form.skinTypes': 'Skin Types',
        'merchant.products.form.skinType.dry': 'Dry',
        'merchant.products.form.skinType.oily': 'Oily',
        'merchant.products.form.skinType.combination': 'Combination',
        'merchant.products.form.skinType.sensitive': 'Sensitive',
        'merchant.products.form.skinType.normal': 'Normal',
        'merchant.products.form.ingredients': 'Ingredients',
        'merchant.products.form.addIngredientPlaceholder': 'Add an ingredient...',
        'merchant.products.form.organization': 'Organization',
        'merchant.products.form.category': 'Category',
        'merchant.products.form.skuPlaceholder': 'e.g., VCS-001',
        'merchant.products.form.pricingInventory': 'Pricing & Inventory',
        'merchant.products.form.price': 'Price',
        'merchant.products.form.discountPrice': 'Discount Price',
        'merchant.products.form.optional': 'Optional',
        'merchant.products.form.salePricePlaceholder': 'Optional sale price',
        'merchant.products.form.compareAtPrice': 'Compare At Price',
        'merchant.products.form.compareAtPricePlaceholder': 'e.g., 25000',
        'merchant.products.form.stockQuantity': 'Stock Quantity',
        'merchant.products.form.lowStockThreshold': 'Low Stock Threshold',
      }
      return (labels[key] ?? key).replace('{{name}}', values?.name ?? '')
    },
  }),
}))

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

  it('labels compare price as required with asterisk', () => {
    render(
      <MemoryRouter>
        <ProductForm mode="create" />
      </MemoryRouter>,
    )
    expect(screen.getByText('Compare At Price *')).toBeInTheDocument()
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
