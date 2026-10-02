import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ReviewManagement from './ReviewManagement'
import { adminService } from '@/features/admin/content-moderation/services/moderation.service'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(async () => ({ data: { data: { total: 0 } } })),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
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
      getReviews: vi.fn(),
      getReports: vi.fn(),
      bulkModerateReviews: vi.fn(),
      bulkDeleteReviews: vi.fn(),
    },
  }
})

const reviews = [
  {
    id: 'r-1',
    rating: 5,
    title: 'Alpha review',
    body: 'Loved it',
    images: [],
    isVerifiedPurchase: true,
    status: 'pending',
    createdAt: '2026-01-01T00:00:00.000Z',
    user: { id: 'u-1', name: 'Ada', email: 'ada@example.com', avatarUrl: null },
    product: { id: 'p-1', name: 'Serum', images: [], slug: 'serum' },
  },
  {
    id: 'r-2',
    rating: 2,
    title: 'Beta review',
    body: 'Not for me',
    images: [],
    isVerifiedPurchase: false,
    status: 'pending',
    createdAt: '2026-01-02T00:00:00.000Z',
    user: { id: 'u-2', name: 'Ben', email: 'ben@example.com', avatarUrl: null },
    product: { id: 'p-2', name: 'Mask', images: [], slug: 'mask' },
  },
]

const bulkModerateReviews = vi.mocked(adminService.bulkModerateReviews)
const bulkDeleteReviews = vi.mocked(adminService.bulkDeleteReviews)
const user = userEvent.setup({ delay: null })

async function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ReviewManagement />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  await screen.findByText('Alpha review')
  // Header checkbox selects every review on the current page
  await user.click(screen.getAllByRole('checkbox')[0])
  await screen.findByText('2 selected')
}

describe('ReviewManagement bulk action modals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    vi.mocked(adminService.getReviews).mockResolvedValue({
      items: reviews,
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1,
    })
    vi.mocked(adminService.getReports).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 1,
    })
    bulkModerateReviews.mockResolvedValue({ processed: 2, failed: 0, results: [] })
    bulkDeleteReviews.mockResolvedValue({ processed: 2, failed: 0, results: [] })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('approves selected reviews only after confirming in the modal', async () => {
    await renderPage()

    await user.click(screen.getByRole('button', { name: 'Approve All' }))

    const dialog = await screen.findByRole('dialog')
    expect(bulkModerateReviews).not.toHaveBeenCalled()
    expect(window.confirm).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('button', { name: 'Approve All' }))

    await waitFor(() => {
      expect(bulkModerateReviews).toHaveBeenCalledTimes(1)
    })
    expect(bulkModerateReviews).toHaveBeenCalledWith({
      ids: ['r-1', 'r-2'],
      action: 'approve',
    })
    expect(bulkDeleteReviews).not.toHaveBeenCalled()
  }, 20_000)

  it('rejects selected reviews with a reason only after confirming in the modal', async () => {
    await renderPage()

    await user.click(screen.getByRole('button', { name: 'Reject All' }))

    const dialog = await screen.findByRole('dialog')
    expect(bulkModerateReviews).not.toHaveBeenCalled()

    const confirmButton = within(dialog).getByRole('button', { name: 'Reject All' })
    expect(confirmButton).toBeDisabled()

    await user.type(
      within(dialog).getByPlaceholderText(/rejection reason/i),
      'Off-topic content',
    )
    await user.click(confirmButton)

    await waitFor(() => {
      expect(bulkModerateReviews).toHaveBeenCalledTimes(1)
    })
    expect(bulkModerateReviews).toHaveBeenCalledWith({
      ids: ['r-1', 'r-2'],
      action: 'reject',
      reason: 'Off-topic content',
    })
  }, 20_000)

  it('deletes selected reviews only after confirming in the modal', async () => {
    await renderPage()

    await user.click(screen.getByRole('button', { name: 'Delete All' }))

    const dialog = await screen.findByRole('dialog')
    expect(bulkDeleteReviews).not.toHaveBeenCalled()
    expect(window.confirm).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('button', { name: 'Delete All' }))

    await waitFor(() => {
      expect(bulkDeleteReviews).toHaveBeenCalledTimes(1)
    })
    expect(bulkDeleteReviews).toHaveBeenCalledWith({ ids: ['r-1', 'r-2'] })
    expect(bulkModerateReviews).not.toHaveBeenCalled()
  }, 20_000)

  it('does not update review status when a modal is cancelled', async () => {
    await renderPage()

    await user.click(screen.getByRole('button', { name: 'Approve All' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(bulkModerateReviews).not.toHaveBeenCalled()
  }, 20_000)
})
