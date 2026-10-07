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
    announcementMessage: 'Brighten your skin with Glow Serum',
    description: 'Brighten your routine',
    imageUrl: 'https://cdn.test/a.png',
    sku: 'sku-001',
  },
  {
    id: 'ad-2',
    placement: 'checkout_page_banner',
    title: 'Night Cream',
    announcementMessage: 'Wake up to refreshed skin',
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
    expect(
      screen.getByText('Brighten your skin with Glow Serum'),
    ).toBeInTheDocument()
    expect(screen.getByText('Featured Promotion')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /learn more/i }),
    ).toHaveAttribute('href', '/buyer/products/sku-001')
  })

  it('links the CTA to the product detail page of the ad SKU', async () => {
    mockedGetSponsoredAds.mockResolvedValue({ data: ads })

    renderSlider()

    await screen.findByText('Glow Serum')

    expect(
      screen.getByRole('link', { name: /learn more/i }),
    ).toHaveAttribute('href', '/buyer/products/sku-001')
  })

  it('falls back to the product list when the ad has no SKU', async () => {
    mockedGetSponsoredAds.mockResolvedValue({ data: [ads[1]] })

    renderSlider()

    await screen.findByText('Night Cream')

    expect(
      screen.getByRole('link', { name: /learn more/i }),
    ).toHaveAttribute('href', '/buyer/products')
  })

  it('renders the announcement and featured promotion badges together', async () => {
    mockedGetSponsoredAds.mockResolvedValue({ data: ads })

    renderSlider()

    const announcement = await screen.findByText(
      'Brighten your skin with Glow Serum',
    )
    const featured = await screen.findByText('Featured Promotion')

    expect(announcement.parentElement).toBe(featured.parentElement)
    expect(featured).toHaveClass('bg-purple-500/25')
  })

  it('renders the product preview card with a landscape image', async () => {
    mockedGetSponsoredAds.mockResolvedValue({ data: ads })

    renderSlider()

    const image = await screen.findByAltText('Glow Serum')
    const frame = image.parentElement as HTMLElement

    expect(frame).toHaveClass('max-w-[22rem]')
    expect(frame).toHaveClass('rounded-2xl')
    expect(frame).toHaveClass('shadow-2xl')
    expect(image).toHaveClass('aspect-[1.74]')
    expect(image).toHaveClass('object-cover')
    expect(screen.queryByText('Merchant Partner')).not.toBeInTheDocument()
  })

  it('matches the checkout banner styling', async () => {
    mockedGetSponsoredAds.mockResolvedValue({ data: ads })

    renderSlider()

    const card = await screen.findByLabelText('Sponsored advertisements')

    expect(card.className).toContain('rounded-[1.75rem]')
    expect(card).toHaveAttribute('aria-roledescription', 'carousel')
    expect(card.querySelector('.bg-gradient-to-r')).toBeInTheDocument()
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
    expect(screen.getByRole('button', { name: 'Previous advertisement' })).toHaveClass('absolute')
    expect(screen.getByRole('button', { name: 'Next advertisement' })).toHaveClass('absolute')
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
