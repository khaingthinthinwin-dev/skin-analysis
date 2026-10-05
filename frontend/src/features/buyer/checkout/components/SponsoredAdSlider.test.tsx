import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { SponsoredAdSlider } from './SponsoredAdSlider'
import { checkoutService } from '../services/checkout.service'
import type { SponsoredAd } from '@/types/checkout.types'

vi.mock('../services/checkout.service', () => ({
  checkoutService: { getSponsoredAds: vi.fn() },
}))

const mockedGetSponsoredAds = vi.mocked(checkoutService.getSponsoredAds)

const ads: SponsoredAd[] = [
  {
    id: 'ad-1',
    placement: 'checkout_page_banner',
    title: 'Glow Serum',
    description: 'Brighten your routine',
    imageUrl: 'https://cdn.test/a.png',
    sku: 'sku-001',
  },
  {
    id: 'ad-2',
    placement: 'checkout_page_banner',
    title: 'Night Cream',
    description: 'Repair while you sleep',
    imageUrl: null,
    sku: null,
  },
]

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
})

const renderSlider = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <SponsoredAdSlider />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SponsoredAdSlider (checkout)', () => {
  it('renders the first advertisement returned by the API', async () => {
    mockedGetSponsoredAds.mockResolvedValue({ data: ads })

    renderSlider()

    expect(await screen.findByText('Glow Serum')).toBeInTheDocument()
    expect(screen.getByText('Brighten your routine')).toBeInTheDocument()
    expect(screen.getByText('Sponsored')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /explore acne solutions/i }),
    ).toHaveAttribute('href', '/buyer/products')
  })

  it('matches the Search and Filter banner styling', async () => {
    mockedGetSponsoredAds.mockResolvedValue({ data: ads })

    const { container } = renderSlider()

    const card = await screen.findByLabelText('Sponsored advertisements')

    expect(card.className).toContain('border-border')
    expect(card.className).toContain('bg-muted')
    expect(card).toHaveAttribute('aria-roledescription', 'carousel')
    expect(container.querySelector('.p-4')).toBeInTheDocument()
  })

  it('advances to the next advertisement and back', async () => {
    mockedGetSponsoredAds.mockResolvedValue({ data: ads })

    renderSlider()

    expect(await screen.findByText('Glow Serum')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Next advertisement' }))
    expect(await screen.findByText('Night Cream')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Previous advertisement' }))
    expect(await screen.findByText('Glow Serum')).toBeInTheDocument()
  })

  it('renders a dot indicator for each advertisement', async () => {
    mockedGetSponsoredAds.mockResolvedValue({ data: ads })

    renderSlider()

    await screen.findByText('Glow Serum')

    expect(screen.getByRole('button', { name: 'Go to advertisement 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Go to advertisement 2' })).toBeInTheDocument()
  })

  it('exposes every returned ad, not just the first page', async () => {
    const many = Array.from({ length: 7 }, (_, i) => ({
      ...ads[0],
      id: `ad-${i + 1}`,
      title: `Checkout ad ${i + 1}`,
    }))
    mockedGetSponsoredAds.mockResolvedValue({ data: many })

    renderSlider()

    await screen.findByText('Checkout ad 1')

    for (let i = 1; i <= 7; i++) {
      expect(screen.getByRole('button', { name: `Go to advertisement ${i}` })).toBeInTheDocument()
    }

    // Every ad is reachable by cycling forward.
    for (let i = 2; i <= 7; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'Next advertisement' }))
      expect(await screen.findByText(`Checkout ad ${i}`)).toBeInTheDocument()
    }
  })

  it('renders nothing when the API returns no advertisements', async () => {
    mockedGetSponsoredAds.mockResolvedValue({ data: [] })

    const { container } = renderSlider()

    await vi.waitFor(() => {
      expect(mockedGetSponsoredAds).toHaveBeenCalled()
    })
    expect(container).toBeEmptyDOMElement()
  })
})
