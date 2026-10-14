import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { AdBannerSlider } from './AdBannerSlider'
import { useSponsoredAds } from '@/features/search/hooks/useSponsoredAds'
import { useAdProducts } from '@/features/search/hooks/useAdProducts'
import type { SponsoredAd } from '@/types/search.types'

vi.mock('@/features/search/hooks/useSponsoredAds', () => ({ useSponsoredAds: vi.fn() }))
vi.mock('@/features/search/hooks/useAdProducts', () => ({ useAdProducts: vi.fn() }))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}))
const mockNavigate = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }))

const mockedUseSponsoredAds = vi.mocked(useSponsoredAds)
const mockedUseAdProducts = vi.mocked(useAdProducts)

type IntersectionCallback = (entries: Array<{ isIntersecting: boolean }>) => void

let lastIntersectionCallback: IntersectionCallback | null = null

function makeAd(overrides: Partial<SponsoredAd> = {}): SponsoredAd {
  return {
    id: 'banner-ad',
    placement: 'checkout_page_banner',
    title: 'Checkout banner',
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

describe('AdBannerSlider', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }))
    lastIntersectionCallback = null
    vi.stubGlobal(
      'IntersectionObserver',
      vi.fn().mockImplementation((callback: IntersectionCallback) => {
        lastIntersectionCallback = callback
        return { observe: vi.fn(), disconnect: vi.fn() }
      }),
    )
    mockedUseAdProducts.mockReturnValue({ data: {} } as never)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    mockNavigate.mockReset()
    mockedUseSponsoredAds.mockReset()
    mockedUseAdProducts.mockReset()
  })

  it('fetches the ads for the requested placement', () => {
    mockedUseSponsoredAds.mockReturnValue({ data: { data: [] } } as never)

    render(<AdBannerSlider placement="recommendation_page_banner" />)

    expect(mockedUseSponsoredAds).toHaveBeenCalledWith('recommendation_page_banner')
  })

  it('shows only approved, active ads matching its own placement', () => {
    mockedUseSponsoredAds.mockReturnValue({
      data: {
        data: [
          makeAd({ placement: 'checkout_page_banner' }),
          makeAd({ id: 'other-placement', placement: 'search_page_banner', title: 'Other banner' }),
          makeAd({ id: 'pending-ad', approvalStatus: 'pending', title: 'Pending banner' }),
          makeAd({ id: 'future-ad', startsAt: new Date(Date.now() + 60_000).toISOString(), title: 'Future banner' }),
          makeAd({ id: 'expired-ad', expiresAt: new Date(Date.now() - 60_000).toISOString(), title: 'Expired banner' }),
        ],
      },
    } as never)

    render(<AdBannerSlider placement="checkout_page_banner" />)

    expect(screen.getByRole('heading', { name: 'Checkout banner' })).toBeInTheDocument()
    expect(screen.queryByText('Other banner')).not.toBeInTheDocument()
    expect(screen.queryByText('Pending banner')).not.toBeInTheDocument()
    expect(screen.queryByText('Future banner')).not.toBeInTheDocument()
    expect(screen.queryByText('Expired banner')).not.toBeInTheDocument()
  })

  it('renders the Search & Filter banner design', () => {
    mockedUseSponsoredAds.mockReturnValue({
      data: { data: [makeAd({ sku: 'GFC-001', imageUrl: 'https://storage.example.com/ad.png' })] },
    } as never)
    mockedUseAdProducts.mockReturnValue({
      data: {
        'GFC-001': {
          name: 'Gentle Foam Cleanser',
          description: 'A mild foam cleanser.',
          shortDescription: 'Mild foam cleanser',
          sku: 'GFC-001',
          images: ['/uploads/products/cd8048d7-ab84-463f-8851-17bb1659b9ee.png'],
          merchant: { id: 'm1', shopName: 'Glow Beauty Shop', licenseStatus: 'approved' },
          category: { id: 'c1', name: 'Cleansers', slug: 'cleansers' },
        },
      },
    } as never)

    render(<AdBannerSlider placement="checkout_page_banner" />)

    const card = screen.getByRole('link', { name: /sponsored advertisements/i })
    expect(card).toHaveClass('rounded-3xl', 'border-0', 'shadow-xl', 'cursor-pointer')

    const banner = card.querySelector('.bg-gradient-to-r')
    expect(banner).toHaveClass(
      'h-auto',
      'min-h-[340px]',
      'flex-col',
      'p-4',
      'md:h-[250px]',
      'md:max-h-[260px]',
      'md:flex-row',
      'md:items-center',
      'md:justify-between',
      'md:p-6',
    )
    expect(banner).toHaveClass('from-[#8d4eb3]', 'via-[#7268b3]', 'to-[#5d2d7d]')

    expect(screen.getByText('Glow Beauty Shop')).toHaveClass('bg-pink-500')

    const learnMore = screen.getByRole('button', { name: /learn more/i })
    expect(learnMore).toHaveClass('bg-white', 'text-gray-900', 'rounded-lg', 'lg:h-9', 'lg:px-5')

    const image = screen.getByRole('img', { name: 'Checkout banner' })
    expect(image).toHaveClass(
      'h-auto',
      'w-full',
      'max-w-full',
      'md:h-full',
      'md:w-auto',
      'object-contain',
      'object-center',
    )
    expect(image.parentElement).toHaveClass(
      'h-auto',
      'min-h-44',
      'sm:min-h-48',
      'w-full',
      'mr-0',
      'md:h-[232px]',
      'md:min-h-0',
      'md:w-fit',
      'md:max-w-[49%]',
      'md:mr-12',
      'rounded-2xl',
      'bg-white',
    )
  })

  it('hides while ads are pending, failed or empty', () => {
    mockedUseSponsoredAds.mockReturnValue({ data: undefined, isPending: true } as never)
    const { container, rerender } = render(<AdBannerSlider placement="checkout_page_banner" />)
    expect(container.firstChild).toBeNull()

    mockedUseSponsoredAds.mockReturnValue({ data: undefined, isPending: false, isError: true } as never)
    rerender(<AdBannerSlider placement="checkout_page_banner" />)
    expect(container.firstChild).toBeNull()

    mockedUseSponsoredAds.mockReturnValue({ data: { data: [makeAd({ expiresAt: new Date(Date.now() - 1000).toISOString() })] } } as never)
    rerender(<AdBannerSlider placement="checkout_page_banner" />)
    expect(container.firstChild).toBeNull()
  })

  it('navigates to the advertised product and reports the click', () => {
    mockedUseSponsoredAds.mockReturnValue({
      data: { data: [makeAd({ sku: 'GFC-001' })] },
    } as never)
    const onAdClick = vi.fn()

    render(<AdBannerSlider placement="checkout_page_banner" onAdClick={onAdClick} />)

    fireEvent.click(screen.getByRole('button', { name: /learn more/i }))

    expect(onAdClick).toHaveBeenCalledWith('banner-ad')
    expect(mockNavigate).toHaveBeenCalledWith('/buyer/products/GFC-001')
  })

  it('falls back to the current product when the ad has no SKU', () => {
    mockedUseSponsoredAds.mockReturnValue({
      data: { data: [makeAd({ placement: 'productDetail_page_banner', sku: null })] },
    } as never)

    render(<AdBannerSlider placement="productDetail_page_banner" fallbackProductId="current-product" />)
    fireEvent.click(screen.getByRole('button', { name: /learn more/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/buyer/products/current-product')
  })

  it('reports an impression once the banner becomes visible', () => {
    mockedUseSponsoredAds.mockReturnValue({
      data: {
        data: [
          makeAd({ id: 'ad-1', placement: 'recommendation_page_banner' }),
          makeAd({
            id: 'ad-2',
            placement: 'recommendation_page_banner',
            title: 'Second banner',
          }),
        ],
      },
    } as never)
    const onImpression = vi.fn()

    render(<AdBannerSlider placement="recommendation_page_banner" onImpression={onImpression} />)

    expect(lastIntersectionCallback).toBeTypeOf('function')
    act(() => {
      lastIntersectionCallback?.([{ isIntersecting: true }])
    })
    act(() => {
      lastIntersectionCallback?.([{ isIntersecting: true }])
    })

    expect(onImpression).toHaveBeenCalledTimes(1)
    expect(onImpression).toHaveBeenCalledWith(['ad-1', 'ad-2'])
  })

  it('keeps the carousel controls of the Search & Filter banner', () => {
    mockedUseSponsoredAds.mockReturnValue({
      data: { data: [makeAd(), makeAd({ id: 'second-ad', title: 'Second banner' })] },
    } as never)

    render(<AdBannerSlider placement="checkout_page_banner" />)

    expect(screen.getByRole('button', { name: 'Go to advertisement 1' })).toHaveAttribute('aria-current', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Next advertisement' }))
    expect(screen.getByRole('heading', { name: 'Second banner' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Previous advertisement' }))
    expect(screen.getByRole('heading', { name: 'Checkout banner' })).toBeInTheDocument()
  })
})
