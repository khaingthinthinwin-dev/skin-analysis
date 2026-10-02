import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import SkinAnalysisPage from './SkinAnalysisPage'
import { initTestI18n } from '@/test/i18nTest'
import { skinAnalysisService } from '@/features/buyer/skin-analysis/services/skin-analysis.service'
import type { AnalysisResultResponse } from '@/schemas/skin-analysis.schema'

const mockNavigate = vi.fn()
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('@/features/buyer/skin-analysis/services/skin-analysis.service', () => ({
  skinAnalysisService: {
    uploadImage: vi.fn(),
    startAnalysis: vi.fn(),
    getLatest: vi.fn(),
    getAnalysisById: vi.fn(),
    getHistory: vi.fn(),
    getTrends: vi.fn(),
    compareAnalyses: vi.fn(),
    exportReport: vi.fn(),
    exportHistoryReport: vi.fn(),
    updateRecommendationFeedback: vi.fn(),
  },
}))

beforeAll(async () => {
  await initTestI18n()
  if (typeof URL.createObjectURL !== 'function') {
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:preview') })
  }
})

const emptyHistory = {
  items: [],
  meta: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 },
  summary: {
    totalAnalyses: 0,
    bestScore: 0,
    averageHydration: 0,
    improvementPercentage: 0,
    firstAnalysisDate: null,
    latestAnalysisDate: null,
  },
}

const historyAnalysis: AnalysisResultResponse = {
  analysisId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  userId: '99999999-9999-4999-8999-999999999999',
  analysisDate: '2026-09-01T10:00:00.000Z',
  status: 'COMPLETED',
  skinType: 'Dry',
  skinAge: 29,
  healthScore: 81,
  hydration: 44,
  confidence: 92,
  facialScanUrl: '/scan.png',
  conditions: [],
  findings: {
    primaryConcerns: [],
    secondaryConcerns: [],
    overallAssessment: 'Dry skin with mild dehydration.',
  },
  recommendations: [],
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
}

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SkinAnalysisPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SkinAnalysisPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(skinAnalysisService.getLatest).mockResolvedValue(null)
    vi.mocked(skinAnalysisService.getHistory).mockResolvedValue(emptyHistory)
    vi.mocked(skinAnalysisService.getTrends).mockResolvedValue({
      healthScoreTrend: [],
      hydrationTrend: [],
      minPointsMet: false,
    })
  })

  it('renders the single-page scanner header, mode switcher and view history action without old clinical titles or tabs', async () => {
    renderPage()

    // Verifies new single-page scanner header
    expect(
      await screen.findByRole('heading', { name: /10 skin metrics in one selfie/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Camera ready/i)).toBeInTheDocument()

    // Verifies View History action button
    expect(
      screen.getByRole('button', { name: /View History/i }),
    ).toBeInTheDocument()

    // Verifies scanner mode switcher
    expect(screen.getByRole('button', { name: /Live scan/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Upload photos/i })).toBeInTheDocument()
    expect(screen.getByText(/Average scan: 30 s/i)).toBeInTheDocument()

    // Verifies old sentences are completely removed
    expect(
      screen.queryByText('Review diagnostic imaging and AI-driven dermatological insights.'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('Clinical Skin Analysis'),
    ).not.toBeInTheDocument()

    // Verifies old top tabs (New Scan, History, Trends) are removed
    expect(screen.queryByRole('tab', { name: 'New Scan' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'History' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Trends' })).not.toBeInTheDocument()
  })

  it('renders the dual-mode scanner directly with camera and upload options', async () => {
    renderPage()

    expect(screen.getByText('Upload Facial Image')).toBeInTheDocument()
    expect(screen.getByText('Camera Capture')).toBeInTheDocument()
    expect(screen.getByText('Camera ready')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Take Photo/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/10 skin metrics in/i),
    ).toBeInTheDocument()
  })

  it('navigates to the history page when View History is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    const historyButton = screen.getByRole('button', { name: /View History/i })
    await user.click(historyButton)

    expect(mockNavigate).toHaveBeenCalledWith('/buyer/skin-analysis/history')
  })

  it('shows the result page for the analysis opened from history (/:id route)', async () => {
    vi.mocked(skinAnalysisService.getAnalysisById).mockResolvedValue(historyAnalysis)

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={['/buyer/skin-analysis/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa']}
        >
          <Routes>
            <Route path="/buyer/skin-analysis/:id" element={<SkinAnalysisPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(
      await screen.findByRole('heading', { name: /Analysis Results/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('Daily Routine')).toBeInTheDocument()
    expect(skinAnalysisService.getAnalysisById).toHaveBeenCalledWith(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    )
  })
})
