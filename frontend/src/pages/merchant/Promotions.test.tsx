import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Promotions from './Promotions'
import { usePromotion, usePromotions } from '@/hooks/usePromotions'
import type { Promotion } from '@/types/promotion.types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/hooks/usePromotions', () => ({
  usePromotions: vi.fn(),
  usePromotion: vi.fn(),
  useDeletePromotion: vi.fn(() => ({ mutate: vi.fn() })),
  useTogglePromotionActive: vi.fn(() => ({ mutate: vi.fn() })),
  getPromotionErrorInfo: vi.fn(() => ({ type: 'unknown', message: 'error' })),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'merchant-user-1', role: 'merchant' },
    isLoading: false,
    refreshUser: vi.fn(),
  }),
}))

vi.mock('@/features/merchant/products/guards/merchantProducts.guard', () => ({
  useMerchantProductsGuard: () => ({
    isPending: false,
    showPendingBanner: false,
    showDeactivatedBanner: false,
    showCrudActions: true,
    showRejectionBanner: false,
  }),
}))

vi.mock('@/components/merchant/AccountDeactivatedBanner', () => ({
  AccountDeactivatedBanner: () => null,
}))

vi.mock('@/components/PaginationControls', () => ({
  PaginationControls: () => null,
}))

const basePromotion: Promotion = {
  id: 'promo-1',
  merchantId: 'm1',
  code: 'CODE20',
  description: 'Anniversary sale',
  discountTypeCode: 'percentage',
  discountValue: 20,
  usedCount: 3,
  startsAt: '2026-11-01T00:00:00.000Z',
  expiresAt: '2026-12-01T00:00:00.000Z',
  isActive: true,
  createdAt: '2026-10-15T00:00:00.000Z',
}

describe('Promotions page highlight', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(usePromotions).mockReturnValue({
      data: {
        items: [{ ...basePromotion, id: 'promo-2', code: 'OTHER10' }],
        meta: { total: 11, page: 2, limit: 10, totalPages: 2 },
      },
      isLoading: false,
      error: null,
    } as ReturnType<typeof usePromotions>)
    vi.mocked(usePromotion).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as ReturnType<typeof usePromotion>)
  })

  it('lists promotions without a highlight when there is no highlight param', () => {
    render(
      <MemoryRouter initialEntries={['/merchant/promotions']}>
        <Promotions />
      </MemoryRouter>,
    )

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getAllByText('OTHER10').length).toBeGreaterThan(0)
    expect(vi.mocked(usePromotion)).toHaveBeenCalledWith('')
    expect(
      document.querySelector('[id^="highlighted-promo-"]'),
    ).not.toBeInTheDocument()
  })

  it('displays and marks the highlighted promotion fetched from a notification', () => {
    vi.mocked(usePromotion).mockReturnValue({
      data: basePromotion,
      isLoading: false,
      error: null,
    } as ReturnType<typeof usePromotion>)

    render(
      <MemoryRouter initialEntries={['/merchant/promotions?highlightPromoId=promo-1']}>
        <Promotions />
      </MemoryRouter>,
    )

    expect(vi.mocked(usePromotion)).toHaveBeenCalledWith('promo-1')

    const highlighted = document.querySelector('[id^="highlighted-promo-promo-1"]')
    expect(highlighted).toBeInTheDocument()
    expect(highlighted).toHaveClass('animate-pulse')

    // The record outside the current page is prepended so it is displayed.
    expect(screen.getAllByText('CODE20').length).toBeGreaterThan(0)
    expect(screen.getAllByText('OTHER10').length).toBeGreaterThan(0)
  })
})
