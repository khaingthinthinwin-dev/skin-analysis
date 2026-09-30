import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ContentModeration from './ContentModeration'
import { adminService } from '@/features/admin/content-moderation/services/moderation.service'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/features/admin/content-moderation/services/moderation.service', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('@/features/admin/content-moderation/services/moderation.service')
    >()
  return {
    ...actual,
    adminService: {
      ...actual.adminService,
      getProducts: vi.fn(),
      bulkModerateProducts: vi.fn(),
    },
  }
})

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(async () => ({ data: { data: { total: 0 } } })),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

const products = [
  {
    id: 'p-1',
    name: 'Hydrating Serum',
    slug: 'hydrating-serum',
    images: [],
    price: 24,
    isActive: true,
    avgRating: 4.5,
    reviewCount: 2,
    createdAt: '2026-01-01T00:00:00.000Z',
    merchant: { id: 'm-1', shopName: 'Glow Beauty', user: { id: 'u-1', name: 'Glow' } },
    category: null,
  },
  {
    id: 'p-2',
    name: 'Clay Mask',
    slug: 'clay-mask',
    images: [],
    price: 18,
    isActive: true,
    avgRating: 4,
    reviewCount: 1,
    createdAt: '2026-01-02T00:00:00.000Z',
    merchant: { id: 'm-1', shopName: 'Glow Beauty', user: { id: 'u-1', name: 'Glow' } },
    category: null,
  },
]

const bulkModerateProducts = vi.mocked(adminService.bulkModerateProducts)
const user = userEvent.setup({ delay: null })

async function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ContentModeration />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  await screen.findByText('Hydrating Serum')
  // Header checkbox selects every product on the current page
  await user.click(screen.getAllByRole('checkbox')[0])
  await screen.findByText('2 selected')
}

describe('ContentModeration bulk moderation modals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(adminService.getProducts).mockResolvedValue({
      items: products,
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1,
    })
    bulkModerateProducts.mockResolvedValue({ processed: 2, failed: 0, results: [] })
  })

  it('deactivates all selected products only after confirming in the modal', async () => {
    await renderPage()

    await user.click(screen.getByRole('button', { name: 'Deactivate All' }))

    const dialog = await screen.findByRole('dialog')
    expect(bulkModerateProducts).not.toHaveBeenCalled()

    const confirmButton = within(dialog).getByRole('button', { name: 'Deactivate All' })
    expect(confirmButton).toBeDisabled()

    await user.type(
      within(dialog).getByPlaceholderText(/deactivation reason/i),
      'Out of stock',
    )
    await user.click(confirmButton)

    await waitFor(() => {
      expect(bulkModerateProducts).toHaveBeenCalledTimes(1)
    })
    expect(bulkModerateProducts).toHaveBeenCalledWith({
      ids: ['p-1', 'p-2'],
      isActive: false,
      reason: 'Out of stock',
    })
  }, 20_000)

  it('activates all selected products only after confirming in the modal', async () => {
    await renderPage()

    await user.click(screen.getByRole('button', { name: 'Activate All' }))

    const dialog = await screen.findByRole('dialog')
    expect(bulkModerateProducts).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('button', { name: 'Activate All' }))

    await waitFor(() => {
      expect(bulkModerateProducts).toHaveBeenCalledTimes(1)
    })
    expect(bulkModerateProducts).toHaveBeenCalledWith({
      ids: ['p-1', 'p-2'],
      isActive: true,
    })
  }, 20_000)

  it('does not update product status when the modal is cancelled', async () => {
    await renderPage()

    await user.click(screen.getByRole('button', { name: 'Activate All' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(bulkModerateProducts).not.toHaveBeenCalled()
  }, 20_000)
})
