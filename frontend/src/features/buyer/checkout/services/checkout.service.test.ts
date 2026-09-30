import { describe, expect, it, vi, beforeEach } from 'vitest'
import apiClient from '@/lib/api-client'
import { checkoutService } from './checkout.service'
import type { SponsoredAd } from '@/types/checkout.types'

vi.mock('@/lib/api-client', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}))

const mockedGet = vi.mocked(apiClient.get)

const ads: SponsoredAd[] = [
  {
    id: 'ad-1',
    placement: 'checkout_page_banner',
    title: 'Glow Serum',
    description: 'Brighten your routine',
    imageUrl: 'https://cdn.test/a.png',
    linkUrl: 'https://shop.test',
  },
]

describe('checkoutService.getSponsoredAds', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('unwraps the payload double-wrapped by TransformInterceptor', async () => {
    mockedGet.mockResolvedValue({ data: { data: { data: ads } } })

    await expect(checkoutService.getSponsoredAds()).resolves.toEqual({ data: ads })
  })

  it('still reads a single-wrapped payload', async () => {
    mockedGet.mockResolvedValue({ data: { data: ads } })

    await expect(checkoutService.getSponsoredAds()).resolves.toEqual({ data: ads })
  })

  it('falls back to an empty list when the ads are not an array', async () => {
    mockedGet.mockResolvedValue({ data: { data: { data: { oops: true } } } })

    await expect(checkoutService.getSponsoredAds()).resolves.toEqual({ data: [] })
  })

  it('requests the checkout-scoped endpoint', async () => {
    mockedGet.mockResolvedValue({ data: { data: { data: ads } } })

    await checkoutService.getSponsoredAds()

    expect(mockedGet).toHaveBeenCalledWith('/checkout/sponsored-ads')
  })
})
