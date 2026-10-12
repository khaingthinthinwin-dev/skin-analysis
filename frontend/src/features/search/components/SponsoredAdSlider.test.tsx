import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { SponsoredAdSlider } from './SponsoredAdSlider'
import { useSponsoredAds } from '../hooks/useSponsoredAds'
import { useAdProducts } from '../hooks/useAdProducts'
import type { SponsoredAd } from '@/types/search.types'

vi.mock('../hooks/useSponsoredAds', () => ({ useSponsoredAds: vi.fn() }))
vi.mock('../hooks/useAdProducts', () => ({ useAdProducts: vi.fn() }))
const mockNavigate = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }))

const mockedUseSponsoredAds = vi.mocked(useSponsoredAds)
const mockedUseAdProducts = vi.mocked(useAdProducts)

function makeAd(overrides: Partial<SponsoredAd> = {}): SponsoredAd {
  return {
    id: 'search-ad',
    placement: 'search_page_banner',
    title: 'Search banner',
    description: null,
    content: null,
    imageUrl: null,
    sku: null,
    linkUrl: null,
    target_url: null,
    tier: 'standard',
    approvalStatus: 'approved',
    startsAt: new Date(Date.now() - 60_000).toISOString(),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    ...overrides,
  }
}

describe('SponsoredAdSlider', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }))
    mockedUseAdProducts.mockReturnValue({ data: {} } as never)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    mockNavigate.mockReset()
    mockedUseSponsoredAds.mockReset()
    mockedUseAdProducts.mockReset()
  })

  it('shows only approved, active search-page banner ads', () => {
    mockedUseSponsoredAds.mockReturnValue({
      data: {
        data: [
          makeAd(),
          makeAd({ id: 'recommendation-ad', placement: 'recommendation_page_banner', title: 'Recommendation banner' }),
          makeAd({ id: 'pending-ad', approvalStatus: 'pending', title: 'Pending banner' }),
          makeAd({ id: 'future-ad', startsAt: new Date(Date.now() + 60_000).toISOString(), title: 'Future banner' }),
          makeAd({ id: 'expired-ad', expiresAt: new Date(Date.now() - 60_000).toISOString(), title: 'Expired banner' }),
        ],
      },
    } as never)

    render(<SponsoredAdSlider />)

    expect(screen.getByRole('heading', { name: 'Search banner' })).toBeInTheDocument()
    expect(screen.queryByText('Recommendation banner')).not.toBeInTheDocument()
    expect(screen.queryByText('Pending banner')).not.toBeInTheDocument()
    expect(screen.queryByText('Future banner')).not.toBeInTheDocument()
    expect(screen.queryByText('Expired banner')).not.toBeInTheDocument()
  })

  it('shows the announcement only in the sponsored badge', () => {
    mockedUseSponsoredAds.mockReturnValue({
      data: {
        data: [
          makeAd({
            announcement_message: '',
            announcementMessage: 'Limited-time offer',
          }),
        ],
      },
    } as never)

    render(<SponsoredAdSlider />)

    expect(screen.getAllByText('Limited-time offer')).toHaveLength(1)
    expect(screen.queryByText('SPONSORED')).not.toBeInTheDocument()
  })

  it('hides the slider while the ads query is still pending', () => {
    mockedUseSponsoredAds.mockReturnValue({ data: undefined, isPending: true } as never)

    const { container } = render(<SponsoredAdSlider />)

    expect(container.firstChild).toBeNull()
  })

  it('hides the slider when the ads request fails', () => {
    mockedUseSponsoredAds.mockReturnValue({ data: undefined, isPending: false, isError: true } as never)

    const { container } = render(<SponsoredAdSlider />)

    expect(container.firstChild).toBeNull()
  })

  it('navigates to the product detail page with the advertised SKU', () => {
    mockedUseSponsoredAds.mockReturnValue({
      data: { data: [makeAd({ sku: 'GFC-001' })] },
    } as never)

    render(<SponsoredAdSlider />)

    fireEvent.click(screen.getByRole('button', { name: /learn more/i }))
    expect(mockNavigate).toHaveBeenLastCalledWith('/buyer/products/GFC-001')
    mockNavigate.mockClear()

    fireEvent.click(screen.getByRole('link', { name: /sponsored advertisements/i }))
    expect(mockNavigate).toHaveBeenLastCalledWith('/buyer/products/GFC-001')
  })

  it('uses the currently displayed ad SKU for Learn more navigation', () => {
    mockedUseSponsoredAds.mockReturnValue({
      data: {
        data: [
          makeAd({ sku: 'GFC-001' }),
          makeAd({ id: 'second-ad', title: 'Second banner', sku: 'DMC-004' }),
        ],
      },
    } as never)

    render(<SponsoredAdSlider />)

    fireEvent.click(screen.getByRole('button', { name: 'Go to advertisement 2' }))
    fireEvent.click(screen.getByRole('button', { name: /learn more/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/buyer/products/DMC-004')
  })

  it('navigates to the products page when the active ad has no SKU', () => {
    mockedUseSponsoredAds.mockReturnValue({
      data: { data: [makeAd({ sku: null })] },
    } as never)

    render(<SponsoredAdSlider />)

    fireEvent.click(screen.getByRole('button', { name: /learn more/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/buyer/products')
  })

  it('uses the fetched products fallback when the active ad has no SKU', () => {
    mockedUseSponsoredAds.mockReturnValue({
      data: { data: [makeAd({ sku: null })] },
    } as never)

    render(<SponsoredAdSlider fallbackProductId="cho" />)
    fireEvent.click(screen.getByRole('button', { name: /learn more/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/buyer/products/cho')
  })

  it('falls back to the ad target URL when no SKU is present', () => {
    mockedUseSponsoredAds.mockReturnValue({
      data: { data: [makeAd({ sku: null, target_url: '/offers/summer' })] },
    } as never)

    render(<SponsoredAdSlider />)
    fireEvent.click(screen.getByRole('link', { name: /sponsored advertisements/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/offers/summer')
  })

  it('shows fallback mock ads bound to existing product SKUs when no schedule covers today', () => {
    mockedUseSponsoredAds.mockReturnValue({
      data: {
        data: [
          makeAd({
            id: 'expired-ad',
            title: 'Ad 2026-11',
            expiresAt: new Date(Date.now() - 60_000).toISOString(),
          }),
        ],
      },
    } as never)

    render(<SponsoredAdSlider />)

    expect(screen.getByRole('heading', { name: 'Daily Moisture Cream' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /learn more/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/buyer/products/DMC-004')
  })

  it('binds the matching product name, description, tag and image to the slide', () => {
    mockedUseSponsoredAds.mockReturnValue({
      data: { data: [makeAd({ sku: 'GFC-001', title: 'Ad 2026-11', description: 'Promotional content for 2026-11' })] },
    } as never)
    mockedUseAdProducts.mockReturnValue({
      data: {
        'GFC-001': {
          name: 'Gentle Foam Cleanser',
          description: 'A mild foam cleanser that removes impurities without stripping moisture.',
          shortDescription: 'Mild foam cleanser for daily use',
          sku: 'GFC-001',
          images: ['/uploads/products/cd8048d7-ab84-463f-8851-17bb1659b9ee.png'],
          merchant: { id: 'm1', shopName: 'Glow Beauty Shop', licenseStatus: 'approved' },
          category: { id: 'c1', name: 'Cleansers', slug: 'cleansers' },
        },
      },
    } as never)

    render(<SponsoredAdSlider />)

    expect(screen.getByRole('heading', { name: 'Gentle Foam Cleanser' })).toBeInTheDocument()
    expect(
      screen.getByText('A mild foam cleanser that removes impurities without stripping moisture.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Glow Beauty Shop')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Gentle Foam Cleanser' })).toHaveAttribute(
      'src',
      expect.stringContaining('/uploads/products/cd8048d7-ab84-463f-8851-17bb1659b9ee.png'),
    )
  })

  it('shows the active ad dot and advances with carousel controls', () => {
    mockedUseSponsoredAds.mockReturnValue({
      data: { data: [makeAd(), makeAd({ id: 'second-ad', title: 'Second banner' })] },
    } as never)

    render(<SponsoredAdSlider />)

    expect(screen.getByRole('button', { name: 'Go to advertisement 1' })).toHaveAttribute('aria-current', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Next advertisement' }))
    expect(screen.getByRole('heading', { name: 'Second banner' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Go to advertisement 2' })).toHaveAttribute('aria-current', 'true')
  })

  it('automatically advances to the next ad every five seconds', () => {
    vi.useFakeTimers()
    mockedUseSponsoredAds.mockReturnValue({
      data: { data: [makeAd(), makeAd({ id: 'second-ad', title: 'Second banner' })] },
    } as never)

    render(<SponsoredAdSlider />)

    expect(screen.getByRole('heading', { name: 'Search banner' })).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(5000))
    expect(screen.getByRole('heading', { name: 'Second banner' })).toBeInTheDocument()
  })

  it('uses the sample skincare image when the ad and product have no image', () => {
    mockedUseSponsoredAds.mockReturnValue({
      data: { data: [makeAd()] },
    } as never)

    render(<SponsoredAdSlider />)

    expect(screen.getByRole('img', { name: 'Search banner' })).toHaveAttribute(
      'src',
      expect.stringContaining('/uploads/products/cd8048d7-ab84-463f-8851-17bb1659b9ee.png'),
    )
  })

  it('shows the ad photo in the white product container and substitutes the sample image on failure', () => {
    mockedUseSponsoredAds.mockReturnValue({
      data: { data: [makeAd({ imageUrl: 'https://storage.example.com/ads/ad-placeholder.jpg' })] },
    } as never)

    render(<SponsoredAdSlider />)
    const image = screen.getByRole('img', { name: 'Search banner' })

    expect(image).toHaveAttribute('src', 'https://storage.example.com/ads/ad-placeholder.jpg')
    expect(image.parentElement).toHaveClass('max-w-[22rem]', 'rounded-2xl', 'border-4', 'bg-[#fffaf5]')
    fireEvent.error(image)
    expect(screen.getByRole('img', { name: 'Search banner' })).toHaveAttribute(
      'src',
      expect.stringContaining('/uploads/products/cd8048d7-ab84-463f-8851-17bb1659b9ee.png'),
    )
  })
})
