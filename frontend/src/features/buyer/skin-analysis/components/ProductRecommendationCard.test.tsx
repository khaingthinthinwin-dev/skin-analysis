import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProductRecommendationCard } from './ProductRecommendationCard'
import { initTestI18n } from '@/test/i18nTest'
import { skinAnalysisService } from '../services/skin-analysis.service'
import type { RecommendationDto } from '../types/skin-analysis.types'

vi.mock('../services/skin-analysis.service', () => ({
  skinAnalysisService: {
    updateRecommendationFeedback: vi.fn(),
  },
}))

vi.mock('@/features/buyer/products/services/product.service', () => ({
  productService: {
    getDetail: vi.fn().mockResolvedValue({ images: ['/products/serum.jpg'] }),
  },
}))

beforeAll(async () => {
  await initTestI18n()
})

const recommendation: RecommendationDto = {
  recommendationId: '11111111-1111-1111-1111-111111111111',
  productId: '22222222-2222-2222-2222-222222222222',
  productType: 'Serum',
  productName: 'Niacinamide 10% Serum',
  reason: 'Targets excess sebum and helps refine pores.',
  priority: 'HIGH',
  isHelpful: null,
}

const renderCard = (rec: RecommendationDto = recommendation) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <ProductRecommendationCard recommendation={rec} index={0} />
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

describe('ProductRecommendationCard', () => {
  beforeEach(() => {
    vi.mocked(skinAnalysisService.updateRecommendationFeedback).mockReset()
  })

  it('renders product name, reason, priority and product type', () => {
    renderCard()

    expect(screen.getByText('Niacinamide 10% Serum')).toBeInTheDocument()
    expect(
      screen.getByText('Targets excess sebum and helps refine pores.'),
    ).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByText('Serum')).toBeInTheDocument()
    expect(screen.getByText('1.')).toBeInTheDocument()
  })

  it('submits helpful feedback and marks the button selected', async () => {
    vi.mocked(skinAnalysisService.updateRecommendationFeedback).mockResolvedValue({
      message: 'ok',
    })
    renderCard()

    await userEvent.click(screen.getByRole('button', { name: 'Helpful' }))

    await waitFor(() => {
      expect(skinAnalysisService.updateRecommendationFeedback).toHaveBeenCalledWith(
        recommendation.recommendationId,
        true,
      )
    })

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Helpful' }).className,
      ).toContain('bg-emerald-500')
    })
  })

  it('does not re-submit when the same feedback is clicked twice', async () => {
    vi.mocked(skinAnalysisService.updateRecommendationFeedback).mockResolvedValue({
      message: 'ok',
    })
    renderCard()

    const helpful = screen.getByRole('button', { name: 'Helpful' })
    await userEvent.click(helpful)
    await waitFor(() => expect(helpful.className).toContain('bg-emerald-500'))

    await userEvent.click(screen.getByRole('button', { name: 'Helpful' }))
    expect(skinAnalysisService.updateRecommendationFeedback).toHaveBeenCalledTimes(1)
  })

  it('reflects persisted feedback from the payload', () => {
    renderCard({ ...recommendation, isHelpful: false })

    expect(
      screen.getByRole('button', { name: 'Not Helpful' }).className,
    ).toContain('bg-red-500')
  })
})
