import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { ProductTable } from './ProductTable'
import type { Product } from '@/types/product.types'

vi.mock('@/lib/format', () => ({
  formatPrice: (v: number) => `$${v.toFixed(2)}`,
}))

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return { ...actual, useNavigate: vi.fn() }
})

const mockProducts: Product[] = [
  {
    id: 'prod-1',
    name: 'Hydrating Serum',
    slug: 'hydrating-serum',
    shortDescription: 'Serum',
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
    category: { id: 'c-1', name: 'Skincare', slug: 'skincare' },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'prod-2',
    name: 'Night Cream',
    slug: 'night-cream',
    shortDescription: 'Cream',
    description: 'Night cream description',
    price: 49.99,
    compareAtPrice: 59.99,
    sku: 'NC-002',
    stockQuantity: 0,
    lowStockThreshold: 10,
    images: [],
    skinTypes: ['oily'],
    ingredients: [],
    tags: [],
    isActive: false,
    isFeatured: true,
    avgRating: 0,
    reviewCount: 0,
    category: { id: 'c-1', name: 'Skincare', slug: 'skincare' },
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
]

describe('ProductTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders table headers', () => {
      render(
        <MemoryRouter>
          <ProductTable
            products={mockProducts}
            selectedIds={[]}
            onSelectionChange={vi.fn()}
            onStockUpdate={vi.fn()}
            onDelete={vi.fn()}
            onToggleFeatured={vi.fn()}
            showActions={true}
          />
        </MemoryRouter>,
      )
      expect(screen.getByText('Image')).toBeInTheDocument()
      expect(screen.getByText('Product Name')).toBeInTheDocument()
      expect(screen.getByText('SKU')).toBeInTheDocument()
      expect(screen.getByText('Price (Discount Price)')).toBeInTheDocument()
      expect(screen.getByText('Stock')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
      expect(screen.getByText('isFeatured')).toBeInTheDocument()
    })

    it('renders product rows with data', () => {
      render(
        <MemoryRouter>
          <ProductTable
            products={mockProducts}
            selectedIds={[]}
            onSelectionChange={vi.fn()}
            onStockUpdate={vi.fn()}
            onDelete={vi.fn()}
            onToggleFeatured={vi.fn()}
            showActions={true}
          />
        </MemoryRouter>,
      )
      expect(screen.getByText('Hydrating Serum')).toBeInTheDocument()
      expect(screen.getByText('HS-001')).toBeInTheDocument()
      expect(screen.getByText('Night Cream')).toBeInTheDocument()
      expect(screen.getByText('NC-002')).toBeInTheDocument()
    })

    it('renders empty state when no products', () => {
      render(
        <MemoryRouter>
          <ProductTable
            products={[]}
            selectedIds={[]}
            onSelectionChange={vi.fn()}
            onStockUpdate={vi.fn()}
            onDelete={vi.fn()}
            onToggleFeatured={vi.fn()}
            showActions={true}
          />
        </MemoryRouter>,
      )
      expect(screen.getByText('No products found')).toBeInTheDocument()
    })

    it('displays Active badge for active products', () => {
      render(
        <MemoryRouter>
          <ProductTable
            products={mockProducts}
            selectedIds={[]}
            onSelectionChange={vi.fn()}
            onStockUpdate={vi.fn()}
            onDelete={vi.fn()}
            onToggleFeatured={vi.fn()}
            showActions={true}
          />
        </MemoryRouter>,
      )
      const activeBadges = screen.getAllByText('Active')
      expect(activeBadges.length).toBeGreaterThanOrEqual(1)
    })

    it('displays Inactive badge for inactive products', () => {
      render(
        <MemoryRouter>
          <ProductTable
            products={mockProducts}
            selectedIds={[]}
            onSelectionChange={vi.fn()}
            onStockUpdate={vi.fn()}
            onDelete={vi.fn()}
            onToggleFeatured={vi.fn()}
            showActions={true}
          />
        </MemoryRouter>,
      )
      expect(screen.getByText('Inactive')).toBeInTheDocument()
    })
  })

  describe('selection', () => {
    it('renders select all checkbox', () => {
      render(
        <MemoryRouter>
          <ProductTable
            products={mockProducts}
            selectedIds={[]}
            onSelectionChange={vi.fn()}
            onStockUpdate={vi.fn()}
            onDelete={vi.fn()}
            onToggleFeatured={vi.fn()}
            showActions={true}
          />
        </MemoryRouter>,
      )
      expect(screen.getByLabelText('Select all')).toBeInTheDocument()
    })

    it('renders individual checkboxes for each product', () => {
      render(
        <MemoryRouter>
          <ProductTable
            products={mockProducts}
            selectedIds={[]}
            onSelectionChange={vi.fn()}
            onStockUpdate={vi.fn()}
            onDelete={vi.fn()}
            onToggleFeatured={vi.fn()}
            showActions={true}
          />
        </MemoryRouter>,
      )
      expect(screen.getByLabelText('Select Hydrating Serum')).toBeInTheDocument()
      expect(screen.getByLabelText('Select Night Cream')).toBeInTheDocument()
    })

    it('calls onSelectionChange with all ids when select all clicked', () => {
      const onSelectionChange = vi.fn()
      render(
        <MemoryRouter>
          <ProductTable
            products={mockProducts}
            selectedIds={[]}
            onSelectionChange={onSelectionChange}
            onStockUpdate={vi.fn()}
            onDelete={vi.fn()}
            onToggleFeatured={vi.fn()}
            showActions={true}
          />
        </MemoryRouter>,
      )
      fireEvent.click(screen.getByLabelText('Select all'))
      expect(onSelectionChange).toHaveBeenCalledWith(['prod-1', 'prod-2'])
    })

    it('deselects all when all are already selected', () => {
      const onSelectionChange = vi.fn()
      render(
        <MemoryRouter>
          <ProductTable
            products={mockProducts}
            selectedIds={['prod-1', 'prod-2']}
            onSelectionChange={onSelectionChange}
            onStockUpdate={vi.fn()}
            onDelete={vi.fn()}
            onToggleFeatured={vi.fn()}
            showActions={true}
          />
        </MemoryRouter>,
      )
      fireEvent.click(screen.getByLabelText('Select all'))
      expect(onSelectionChange).toHaveBeenCalledWith([])
    })

    it('toggles individual product selection', () => {
      const onSelectionChange = vi.fn()
      render(
        <MemoryRouter>
          <ProductTable
            products={mockProducts}
            selectedIds={[]}
            onSelectionChange={onSelectionChange}
            onStockUpdate={vi.fn()}
            onDelete={vi.fn()}
            onToggleFeatured={vi.fn()}
            showActions={true}
          />
        </MemoryRouter>,
      )
      fireEvent.click(screen.getByLabelText('Select Hydrating Serum'))
      expect(onSelectionChange).toHaveBeenCalledWith(['prod-1'])
    })

    it('removes product from selection when unchecked', () => {
      const onSelectionChange = vi.fn()
      render(
        <MemoryRouter>
          <ProductTable
            products={mockProducts}
            selectedIds={['prod-1', 'prod-2']}
            onSelectionChange={onSelectionChange}
            onStockUpdate={vi.fn()}
            onDelete={vi.fn()}
            onToggleFeatured={vi.fn()}
            showActions={true}
          />
        </MemoryRouter>,
      )
      fireEvent.click(screen.getByLabelText('Select Hydrating Serum'))
      expect(onSelectionChange).toHaveBeenCalledWith(['prod-2'])
    })
  })

  describe('actions', () => {
    it('renders edit button for each product', () => {
      render(
        <MemoryRouter>
          <ProductTable
            products={mockProducts}
            selectedIds={[]}
            onSelectionChange={vi.fn()}
            onStockUpdate={vi.fn()}
            onDelete={vi.fn()}
            onToggleFeatured={vi.fn()}
            showActions={true}
          />
        </MemoryRouter>,
      )
      expect(screen.getByLabelText('Edit Hydrating Serum')).toBeInTheDocument()
      expect(screen.getByLabelText('Edit Night Cream')).toBeInTheDocument()
    })

    it('renders delete button for each product', () => {
      render(
        <MemoryRouter>
          <ProductTable
            products={mockProducts}
            selectedIds={[]}
            onSelectionChange={vi.fn()}
            onStockUpdate={vi.fn()}
            onDelete={vi.fn()}
            onToggleFeatured={vi.fn()}
            showActions={true}
          />
        </MemoryRouter>,
      )
      expect(screen.getByLabelText('Delete Hydrating Serum')).toBeInTheDocument()
      expect(screen.getByLabelText('Delete Night Cream')).toBeInTheDocument()
    })

    it('renders toggle featured button for each product', () => {
      render(
        <MemoryRouter>
          <ProductTable
            products={mockProducts}
            selectedIds={[]}
            onSelectionChange={vi.fn()}
            onStockUpdate={vi.fn()}
            onDelete={vi.fn()}
            onToggleFeatured={vi.fn()}
            showActions={true}
          />
        </MemoryRouter>,
      )
      expect(screen.getByLabelText('Toggle featured for Hydrating Serum')).toBeInTheDocument()
      expect(screen.getByLabelText('Toggle featured for Night Cream')).toBeInTheDocument()
    })

    it('calls onToggleFeatured when toggle clicked', () => {
      const onToggleFeatured = vi.fn()
      render(
        <MemoryRouter>
          <ProductTable
            products={mockProducts}
            selectedIds={[]}
            onSelectionChange={vi.fn()}
            onStockUpdate={vi.fn()}
            onDelete={vi.fn()}
            onToggleFeatured={onToggleFeatured}
            showActions={true}
          />
        </MemoryRouter>,
      )
      fireEvent.click(screen.getByLabelText('Toggle featured for Hydrating Serum'))
      expect(onToggleFeatured).toHaveBeenCalledWith('prod-1')
    })
  })

  describe('showActions false (read-only mode)', () => {
    it('hides select all checkbox', () => {
      render(
        <MemoryRouter>
          <ProductTable
            products={mockProducts}
            selectedIds={[]}
            onSelectionChange={vi.fn()}
            onStockUpdate={vi.fn()}
            onDelete={vi.fn()}
            onToggleFeatured={vi.fn()}
            showActions={false}
          />
        </MemoryRouter>,
      )
      expect(screen.queryByLabelText('Select all')).not.toBeInTheDocument()
    })

    it('hides individual checkboxes', () => {
      render(
        <MemoryRouter>
          <ProductTable
            products={mockProducts}
            selectedIds={[]}
            onSelectionChange={vi.fn()}
            onStockUpdate={vi.fn()}
            onDelete={vi.fn()}
            onToggleFeatured={vi.fn()}
            showActions={false}
          />
        </MemoryRouter>,
      )
      expect(screen.queryByLabelText('Select Hydrating Serum')).not.toBeInTheDocument()
    })

    it('hides action buttons', () => {
      render(
        <MemoryRouter>
          <ProductTable
            products={mockProducts}
            selectedIds={[]}
            onSelectionChange={vi.fn()}
            onStockUpdate={vi.fn()}
            onDelete={vi.fn()}
            onToggleFeatured={vi.fn()}
            showActions={false}
          />
        </MemoryRouter>,
      )
      expect(screen.queryByLabelText('Edit Hydrating Serum')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Delete Hydrating Serum')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Toggle featured for Hydrating Serum')).not.toBeInTheDocument()
    })

    it('hides actions column header', () => {
      render(
        <MemoryRouter>
          <ProductTable
            products={mockProducts}
            selectedIds={[]}
            onSelectionChange={vi.fn()}
            onStockUpdate={vi.fn()}
            onDelete={vi.fn()}
            onToggleFeatured={vi.fn()}
            showActions={false}
          />
        </MemoryRouter>,
      )
      expect(screen.queryByText('Actions')).not.toBeInTheDocument()
    })

    it('still displays product data', () => {
      render(
        <MemoryRouter>
          <ProductTable
            products={mockProducts}
            selectedIds={[]}
            onSelectionChange={vi.fn()}
            onStockUpdate={vi.fn()}
            onDelete={vi.fn()}
            onToggleFeatured={vi.fn()}
            showActions={false}
          />
        </MemoryRouter>,
      )
      expect(screen.getByText('Hydrating Serum')).toBeInTheDocument()
      expect(screen.getByText('HS-001')).toBeInTheDocument()
      expect(screen.getByText('50')).toBeInTheDocument()
    })
  })

  describe('pricing display', () => {
    it('shows strikethrough compareAtPrice', () => {
      render(
        <MemoryRouter>
          <ProductTable
            products={mockProducts}
            selectedIds={[]}
            onSelectionChange={vi.fn()}
            onStockUpdate={vi.fn()}
            onDelete={vi.fn()}
            onToggleFeatured={vi.fn()}
            showActions={true}
          />
        </MemoryRouter>,
      )
      expect(screen.getByText('$39.99')).toBeInTheDocument()
    })

    it('shows discount savings when compareAtPrice exists', () => {
      render(
        <MemoryRouter>
          <ProductTable
            products={mockProducts}
            selectedIds={[]}
            onSelectionChange={vi.fn()}
            onStockUpdate={vi.fn()}
            onDelete={vi.fn()}
            onToggleFeatured={vi.fn()}
            showActions={true}
          />
        </MemoryRouter>,
      )
      const savedTexts = screen.getAllByText('Saved $10.00')
      expect(savedTexts.length).toBeGreaterThanOrEqual(1)
    })
  })
})
