import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
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

function LocationDisplay() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname + location.search}</div>
}

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

describe('ReviewManagement notification highlight', () => {
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
      items: [
        {
          id: 'rep-1',
          reviewId: 'r-1',
          resolver: null,
          reason: 'spam',
          description: 'Obvious spam',
          status: 'pending',
          adminNote: null,
          resolvedBy: null,
          resolvedAt: null,
          createdAt: '2026-01-03T00:00:00.000Z',
          reporter: {
            id: 'u-9',
            name: 'Cara',
            email: 'cara@example.com',
            avatarUrl: null,
          },
          review: {
            id: 'r-1',
            title: 'Alpha review',
            body: 'Loved it',
            rating: 5,
            user: { id: 'u-1', name: 'Ada', email: 'ada@example.com', avatarUrl: null },
            product: { id: 'p-1', name: 'Serum', slug: 'serum' },
          },
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function highlightedRow(id: string): HTMLElement {
    const cell = screen.getByText(id === 'r-1' ? 'Alpha review' : 'Beta review').closest('tr')
    if (!cell) throw new Error(`row for ${id} not found`)
    return cell as HTMLElement
  }

  it('highlights only the review the notification pointed at', async () => {
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter initialEntries={['/admin/reviews?tab=reviews&highlight=r-2']}>
          <ReviewManagement />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Beta review')).toBeInTheDocument()
    expect(
      screen.queryByText(/opened from a notification/),
    ).not.toBeInTheDocument()

    // Exactly one row is flagged as highlighted and it is the target one.
    expect(document.querySelectorAll('tr[data-highlighted]')).toHaveLength(1)
    expect(highlightedRow('r-2')).toHaveAttribute('data-highlighted', 'true')
    expect(highlightedRow('r-1')).not.toHaveAttribute('data-highlighted')
    expect(highlightedRow('r-2')).toHaveClass(
      'review-row',
      '[&>td]:!border-t-2',
      '[&>td]:!border-b-2',
      '[&>td]:!border-purple-600',
      '[&>td:first-child]:!border-l-2',
      '[&>td:last-child]:!border-r-2',
      '[&>td:first-child]:rounded-l-lg',
      '[&>td:last-child]:rounded-r-lg',
    )
    expect(screen.getByText('Beta review').closest('table')).toHaveClass(
      '[&_tbody_tr[data-highlighted]>td]:bg-purple-500/10',
      '[&_tbody_tr[data-highlighted]>td]:border-b-0',
    )
    expect(screen.getAllByText('From notification')).toHaveLength(1)
  }, 20_000)

  it('switches to the reports tab and highlights the reported row', async () => {
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter initialEntries={['/admin/reviews?tab=reports&highlight=rep-1']}>
          <ReviewManagement />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await screen.findByText('Loved it')
    expect(
      screen.queryByText(/opened from a notification/),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Reports/ })).toHaveAttribute('aria-selected', 'true')

    await screen.findByText('spam')
    expect(document.querySelectorAll('tr[data-highlighted]')).toHaveLength(1)
    const row = screen.getByText('Loved it').closest('tr')
    expect(row).toHaveAttribute('data-highlighted', 'true')
    expect(row).toHaveClass(
      '[&>td]:!border-t-2',
      '[&>td]:!border-b-2',
      '[&>td]:!border-purple-600',
      '[&>td:first-child]:!border-l-2',
      '[&>td:last-child]:!border-r-2',
      '[&>td:first-child]:rounded-l-lg',
      '[&>td:last-child]:rounded-r-lg',
    )
    expect(screen.getByText('Loved it').closest('table')).toHaveClass(
      '[&_tbody_tr[data-highlighted]>td]:bg-purple-500/10',
      '[&_tbody_tr[data-highlighted]>td]:border-b-0',
    )
    expect(screen.getByText('From notification')).toBeInTheDocument()
  }, 20_000)

  it('does not show a notification banner when the highlighted review is not on the current page', async () => {
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter initialEntries={['/admin/reviews?tab=reviews&highlight=missing-id']}>
          <ReviewManagement />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Alpha review')).toBeInTheDocument()
    expect(
      screen.queryByText(/opened from a notification|not on the current page/),
    ).not.toBeInTheDocument()
    expect(document.querySelectorAll('tr[data-highlighted]')).toHaveLength(0)
  }, 20_000)

  it('drops the highlight when the admin switches tabs', async () => {
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter initialEntries={['/admin/reviews?tab=reviews&highlight=r-1']}>
          <ReviewManagement />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Alpha review')).toBeInTheDocument()
    expect(highlightedRow('r-1')).toHaveAttribute('data-highlighted', 'true')

    await user.click(screen.getByRole('tab', { name: /Reports/ }))

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Reports/ })).toHaveAttribute(
        'aria-selected',
        'true',
      )
    })
    expect(document.querySelectorAll('tr[data-highlighted]')).toHaveLength(0)
    expect(screen.queryByText('From notification')).not.toBeInTheDocument()
  }, 20_000)

  it('clears the highlight when the review detail modal is closed and removes the highlight param', async () => {
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter initialEntries={['/admin/reviews?tab=reviews&highlight=r-2']}>
          <LocationDisplay />
          <ReviewManagement />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await screen.findByText('Beta review')
    expect(highlightedRow('r-2')).toHaveAttribute('data-highlighted', 'true')
    expect(screen.getByTestId('location')).toHaveTextContent('highlight=r-2')

    const targetRow = screen.getByText('Beta review').closest('tr') as HTMLElement
    await user.click(within(targetRow).getAllByRole('button')[0])
    expect(await screen.findByRole('dialog')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByTestId('location')).not.toHaveTextContent('highlight')
    })
    expect(document.querySelectorAll('tr[data-highlighted]')).toHaveLength(0)
    expect(screen.queryByText('From notification')).not.toBeInTheDocument()
  }, 20_000)

  it('clears the highlight when the report detail modal is closed and removes the highlight param', async () => {
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter initialEntries={['/admin/reviews?tab=reports&highlight=rep-1']}>
          <LocationDisplay />
          <ReviewManagement />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await screen.findByText('Loved it')
    const targetRow = screen.getByText('Loved it').closest('tr') as HTMLElement
    expect(targetRow).toHaveAttribute('data-highlighted', 'true')
    expect(screen.getByTestId('location')).toHaveTextContent('highlight=rep-1')

    await user.click(within(targetRow).getAllByRole('button')[0])
    expect(await screen.findByRole('dialog')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByTestId('location')).not.toHaveTextContent('highlight')
    })
    expect(document.querySelectorAll('tr[data-highlighted]')).toHaveLength(0)
    expect(screen.queryByText('From notification')).not.toBeInTheDocument()
  }, 20_000)
})
