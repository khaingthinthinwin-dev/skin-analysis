import { beforeAll, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AIFacialAnalysisCard } from './AIFacialAnalysisCard'
import { initTestI18n } from '@/test/i18nTest'
import { getImageUrl } from '@/lib/image-url'
import type { AnalysisResultResponse } from '@/schemas/skin-analysis.schema'

vi.mock('@/features/buyer/skin-analysis/services/skin-analysis.service', () => ({
  skinAnalysisService: {
    exportReport: vi.fn().mockResolvedValue(new Blob(['pdf'])),
    exportHistoryReport: vi.fn().mockResolvedValue(new Blob(['pdf'])),
  },
}))

vi.mock('@/features/buyer/products/services/product.service', () => ({
  productService: {
    getDetail: vi.fn().mockResolvedValue({ images: ['/products/serum.jpg'] }),
  },
}))

beforeAll(async () => {
  await initTestI18n()
  if (typeof URL.createObjectURL !== 'function') {
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:preview') })
  }
})

const analysis: AnalysisResultResponse = {
  analysisId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  userId: '99999999-9999-9999-9999-999999999999',
  analysisDate: '2026-09-01T10:00:00.000Z',
  status: 'COMPLETED',
  skinType: 'Combination',
  skinAge: 33,
  healthScore: 76,
  hydration: 52,
  confidence: 94,
  facialScanUrl: '/scan.png',
  conditions: [
    {
      conditionId: '11111111-1111-1111-1111-111111111111',
      conditionName: 'acne',
      severity: 'MODERATE',
      severityScore: 55,
      affectedArea: 'T-zone',
      description: 'Inflammatory breakouts across the forehead.',
    },
  ],
  findings: {
    primaryConcerns: [
      {
        findingId: '33333333-3333-3333-3333-333333333333',
        findingType: 'PRIMARY',
        title: 'Enlarged pores',
        description: 'Visible pores concentrated on the nose and chin.',
        affectedArea: 'T-zone',
        severity: 'MILD',
      },
    ],
    secondaryConcerns: [],
    overallAssessment: 'Combination skin with localized congestion.',
  },
  recommendations: [
    {
      recommendationId: '11111111-1111-1111-1111-111111111111',
      productId: '22222222-2222-2222-2222-222222222222',
      productType: 'Serum',
      productName: 'Niacinamide 10% Serum',
      reason: 'Targets excess sebum and helps refine pores.',
      priority: 'HIGH',
      isHelpful: null,
    },
  ],
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
}

const renderCard = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <AIFacialAnalysisCard analysis={analysis} />
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

describe('AIFacialAnalysisCard', () => {
  it('renders the four headline stats', () => {
    renderCard()

    expect(screen.getAllByText('Combination').length).toBeGreaterThan(0)
    expect(screen.getByText('33 Yrs')).toBeInTheDocument()
    expect(screen.getAllByText('76').length).toBeGreaterThan(0)
    expect(screen.getAllByText('52%').length).toBeGreaterThan(0)

    expect(screen.getAllByText('Skin Type').length).toBeGreaterThan(0)
    expect(screen.getByText('Skin Age')).toBeInTheDocument()
    expect(screen.getAllByText('Health Score').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Hydration').length).toBeGreaterThan(0)
  })

  it('renders capture guidelines with the three checklist tips', () => {
    renderCard()

    expect(screen.getByText('Capture Guidelines')).toBeInTheDocument()
    expect(
      screen.getByText('Use natural, even lighting - avoid harsh shadows or direct flash'),
    ).toBeInTheDocument()
    expect(screen.getByText('Use a plain, neutral background')).toBeInTheDocument()
    expect(
      screen.getByText('Maintain a neutral, relaxed expression'),
    ).toBeInTheDocument()
  })

  it('renders the diagnostic image with status, date and caption', () => {
    renderCard()

    expect(screen.getByAltText('Facial scan image')).toHaveAttribute(
      'src',
      getImageUrl('/scan.png'),
    )
    expect(screen.getByText('PROCESSED')).toBeInTheDocument()
    expect(screen.getByText(/2026/)).toBeInTheDocument()
    expect(screen.getByText('Analysis Complete')).toBeInTheDocument()
    expect(screen.getByText('AI Confidence: 94%')).toBeInTheDocument()
  })

  it('renders conditions, daily routine and recommendations', () => {
    renderCard()

    expect(screen.getByText('Condition Severity')).toBeInTheDocument()
    expect(screen.getByText('MODERATE')).toBeInTheDocument()

    expect(screen.getByText('Daily Routine')).toBeInTheDocument()
    expect(screen.getByText('AM · PM')).toBeInTheDocument()
    expect(screen.getByText('Morning')).toBeInTheDocument()
    expect(screen.getByText('Evening')).toBeInTheDocument()
    expect(screen.getByText('Gentle Cleanser')).toBeInTheDocument()
    expect(screen.getByText('Sunscreen SPF 50')).toBeInTheDocument()
    expect(screen.getByText('Double Cleanse')).toBeInTheDocument()
    expect(screen.getByText('Night Cream')).toBeInTheDocument()

    expect(screen.getByText('Recommended Products')).toBeInTheDocument()
    expect(screen.getByText('Niacinamide 10% Serum')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /View more/ }),
    ).toHaveAttribute('href', '/buyer/recommendations')
    expect(
      screen.queryByRole('button', { name: /Export Report/ }),
    ).not.toBeInTheDocument()
  })

  it('shows at most three recommendation cards', () => {
    const extras = [1, 2, 3].map((n) => ({
      ...analysis.recommendations[0],
      recommendationId: `33333333-3333-3333-3333-33333333333${n}`,
      productId: `44444444-4444-4444-4444-44444444444${n}`,
      productName: `Extra Serum ${n}`,
    }))
    render(
      <MemoryRouter>
        <QueryClientProvider
          client={
            new QueryClient({
              defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
            })
          }
        >
          <AIFacialAnalysisCard analysis={{ ...analysis, recommendations: [...analysis.recommendations, ...extras] }} />
        </QueryClientProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText('Niacinamide 10% Serum')).toBeInTheDocument()
    expect(screen.getByText('Extra Serum 1')).toBeInTheDocument()
    expect(screen.getByText('Extra Serum 2')).toBeInTheDocument()
    expect(screen.queryByText('Extra Serum 3')).not.toBeInTheDocument()
  })
})
