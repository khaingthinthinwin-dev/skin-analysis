import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { SponsoredAdSlider } from './SponsoredAdSlider'
import { useSponsoredAds } from '../hooks/useSponsoredAds'
import type { SponsoredAd } from '@/types/search.types'

vi.mock('../hooks/useSponsoredAds', () => ({ useSponsoredAds: vi.fn() }))
const mockNavigate = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }))

const mockedUseSponsoredAds = vi.mocked(useSponsoredAds)

function makeAd(overrides: Partial<SponsoredAd> = {}): SponsoredAd {
  return {
    id: 'search-ad',
    placement: 'search_page_banner',
    title: 'Search banner',
    description: null,
    imageUrl: null,
    sku: null,
    linkUrl: null,
    product_id: 'prod_123',
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
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    mockNavigate.mockReset()
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

  it('navigates to the advertised product when the banner is clicked', () => {
    mockedUseSponsoredAds.mockReturnValue({
      data: { data: [makeAd({ product_id: 'product-123' })] },
    } as never)

    render(<SponsoredAdSlider />)

    fireEvent.click(screen.getByRole('button', { name: /learn more/i }))
    expect(mockNavigate).toHaveBeenLastCalledWith('/buyer/products/product-123')
    mockNavigate.mockClear()

    fireEvent.click(screen.getByRole('link', { name: /sponsored advertisements/i }))
    expect(mockNavigate).toHaveBeenLastCalledWith('/buyer/products/product-123')
  })

  it('uses the currently displayed ad product ID for Learn more navigation', () => {
    mockedUseSponsoredAds.mockReturnValue({
      data: {
        data: [
          makeAd({ product_id: 'first-product' }),
          makeAd({ id: 'second-ad', title: 'Second banner', product_id: 'second-product' }),
        ],
      },
    } as never)

    render(<SponsoredAdSlider />)

    fireEvent.click(screen.getByRole('button', { name: 'Go to advertisement 2' }))
    fireEvent.click(screen.getByRole('button', { name: /learn more/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/buyer/products/second-product')
  })

  it('navigates to the products page when the active ad has no product ID', () => {
    mockedUseSponsoredAds.mockReturnValue({
      data: { data: [makeAd({ product_id: null })] },
    } as never)

    render(<SponsoredAdSlider />)

    fireEvent.click(screen.getByRole('button', { name: /learn more/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/buyer/products')
  })

  it('uses the fetched products fallback when the active ad has no product ID', () => {
    mockedUseSponsoredAds.mockReturnValue({
      data: { data: [makeAd({ product_id: null })] },
    } as never)

    render(<SponsoredAdSlider fallbackProductId="cho" />)
    fireEvent.click(screen.getByRole('button', { name: /learn more/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/buyer/products/cho')
  })

  it('falls back to the ad target URL when no product ID is present', () => {
    mockedUseSponsoredAds.mockReturnValue({
      data: { data: [makeAd({ product_id: null, target_url: '/offers/summer' })] },
    } as never)

    render(<SponsoredAdSlider />)
    fireEvent.click(screen.getByRole('link', { name: /sponsored advertisements/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/offers/summer')
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

  it('uses the sample skincare image when an ad has no image', () => {
    mockedUseSponsoredAds.mockReturnValue({
      data: { data: [makeAd()] },
    } as never)

    render(<SponsoredAdSlider />)

    expect(screen.getByRole('img', { name: 'Search banner' })).toHaveAttribute(
      'src',
      expect.stringContaining('/uploads/products/cd8048d7-ab84-463f-8851-17bb1659b9ee.png'),
    )
  })

  it('shows the ad photo and avoids substituting an unrelated image on failure', () => {
    mockedUseSponsoredAds.mockReturnValue({
      data: { data: [makeAd({ imageUrl: 'https://storage.example.com/ads/ad-placeholder.jpg' })] },
    } as never)

    render(<SponsoredAdSlider />)
    const image = screen.getByRole('img', { name: 'Search banner' })

    expect(image).toHaveAttribute('src', 'https://storage.example.com/ads/ad-placeholder.jpg')
    expect(image.parentElement).toHaveClass('h-[168px]', 'w-full', 'max-w-[310px]', 'rounded-2xl')
    fireEvent.error(image)
    expect(screen.getByRole('img', { name: 'Search banner' })).toHaveAttribute(
      'src',
      expect.stringContaining('/uploads/products/cd8048d7-ab84-463f-8851-17bb1659b9ee.png'),
    )
  })
})