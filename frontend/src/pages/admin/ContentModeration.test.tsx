import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18n from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import en from '../../../public/locales/en/translation.json'
import ContentModeration from './ContentModeration'
import { adminService } from '@/features/admin/content-moderation/services/moderation.service'
import type { AdminProduct } from '@/features/admin/content-moderation/services/moderation.service'
import type { ReactNode } from 'react'

const testI18n = i18n.createInstance()

beforeAll(async () => {
  await testI18n.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    resources: { en: { translation: en } },
    interpolation: { escapeValue: false },
  })
})

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

// Radix Tooltip starves the jsdom event loop once triggered (plain setTimeout
// callbacks stop firing), which hangs waitFor/findBy*. Hover mechanics are
// library behavior; the wiring under test here is our conditional rendering.
vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children?: ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children?: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children?: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children?: ReactNode }) => (
    <div role="tooltip">{children}</div>
  ),
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

const activeProducts = [
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

const inactiveProducts = [
  {
    id: 'p-1',
    name: 'Hydrating Serum',
    slug: 'hydrating-serum',
    images: [],
    price: 24,
    isActive: false,
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
    isActive: false,
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
    <I18nextProvider i18n={testI18n}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ContentModeration />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>,
  )
  await screen.findByText('Hydrating Serum')
  // Header checkbox selects every product on the current page
  await user.click(screen.getAllByRole('checkbox')[0])
  await screen.findByText('2 selected')
}

describe('ContentModeration bulk moderation modals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    bulkModerateProducts.mockResolvedValue({ processed: 2, failed: 0, results: [] })
  })

  it('deactivates all selected products only after confirming in the modal', async () => {
    vi.mocked(adminService.getProducts).mockResolvedValue({
      items: activeProducts,
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1,
    })
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
    vi.mocked(adminService.getProducts).mockResolvedValue({
      items: inactiveProducts,
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1,
    })
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
    vi.mocked(adminService.getProducts).mockResolvedValue({
      items: inactiveProducts,
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1,
    })
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

describe('ContentModeration pending-order deactivation guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    bulkModerateProducts.mockResolvedValue({ processed: 0, failed: 0, results: [] })
  })

  async function renderWithProducts(items: AdminProduct[]) {
    vi.mocked(adminService.getProducts).mockResolvedValue({
      items,
      total: items.length,
      page: 1,
      limit: 10,
      totalPages: 1,
    })
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    render(
      <I18nextProvider i18n={testI18n}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <ContentModeration />
          </MemoryRouter>
        </QueryClientProvider>
      </I18nextProvider>,
    )
    await screen.findByText('Hydrating Serum')
  }

  it('disables deactivate and shows a tooltip while orders are undelivered', async () => {
    await renderWithProducts([
      { ...activeProducts[0], hasPendingOrders: true },
      activeProducts[1],
    ])

    const blockedRow = screen
      .getByText('Hydrating Serum')
      .closest('tr') as HTMLElement
    const allowedRow = screen
      .getByText('Clay Mask')
      .closest('tr') as HTMLElement

    // RTL getByRole has no `disabled` option — filter on the property instead
    const disabledIn = (row: HTMLElement) =>
      within(row)
        .getAllByRole('button')
        .filter((btn) => (btn as HTMLButtonElement).disabled)

    const [blockedButton] = disabledIn(blockedRow)
    expect(blockedButton).toBeDefined()
    expect(blockedButton).toBeDisabled()
    expect(disabledIn(allowedRow)).toHaveLength(0)

    const tooltip = within(blockedRow).getByRole('tooltip')
    expect(tooltip).toHaveTextContent(
      'Cannot deactivate until the order delivery is completed.',
    )
    expect(within(allowedRow).queryByRole('tooltip')).not.toBeInTheDocument()
  }, 20_000)

  it('keeps Deactivate All disabled when every selected product has undelivered orders', async () => {
    await renderWithProducts([
      { ...activeProducts[0], hasPendingOrders: true },
      { ...activeProducts[1], hasPendingOrders: true },
    ])

    await user.click(screen.getAllByRole('checkbox')[0])
    await screen.findByText('2 selected')

    expect(screen.getByRole('button', { name: 'Deactivate All' })).toBeDisabled()
  }, 20_000)
})
