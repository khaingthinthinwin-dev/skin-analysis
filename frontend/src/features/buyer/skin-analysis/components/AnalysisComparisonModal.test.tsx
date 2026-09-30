import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AnalysisComparisonModal } from './AnalysisComparisonModal'
import { initTestI18n } from '@/test/i18nTest'
import { skinAnalysisService } from '../services/skin-analysis.service'
import type { ComparisonResult } from '../types/skin-analysis.types'

vi.mock('../services/skin-analysis.service', () => ({
  skinAnalysisService: {
    compareAnalyses: vi.fn(),
  },
}))

beforeAll(async () => {
  await initTestI18n()
})

const comparison: ComparisonResult = {
  analysis1: {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    date: '2026-08-01T10:00:00.000Z',
    healthScore: 70,
    hydration: 45,
    skinAge: 34,
  },
  analysis2: {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    date: '2026-09-01T10:00:00.000Z',
    healthScore: 76,
    hydration: 52,
    skinAge: 33,
  },
  conditionChanges: [
    { conditionName: 'acne', from: 'MODERATE', to: 'MILD', direction: 'IMPROVED' },
    { conditionName: 'dryness', from: 'MILD', to: 'MODERATE', direction: 'REGRESSED' },
    { conditionName: 'redness', from: 'MILD', to: 'MILD', direction: 'STABLE' },
  ],
  scoreDelta: 6,
  hydrationDelta: 7,
  ageDelta: -1,
  daysBetween: 31,
}

const renderModal = (open = true, onClose = vi.fn()) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AnalysisComparisonModal
        open={open}
        onClose={onClose}
        analysisId1="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
        analysisId2="bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
      />
    </QueryClientProvider>,
  )
}

describe('AnalysisComparisonModal', () => {
  beforeEach(() => {
    vi.mocked(skinAnalysisService.compareAnalyses).mockReset()
  })

  it('renders nothing while closed', () => {
    vi.mocked(skinAnalysisService.compareAnalyses).mockResolvedValue(comparison)
    const { container } = renderModal(false)
    expect(container.innerHTML).toBe('')
  })

  it('shows a loading spinner while the comparison is loading', () => {
    vi.mocked(skinAnalysisService.compareAnalyses).mockReturnValue(
      new Promise(() => {}),
    )
    renderModal()

    expect(screen.getByText('Analysis Comparison')).toBeInTheDocument()
    expect(document.querySelector('.animate-spin')).not.toBeNull()
  })

  it('renders metric deltas with positive/negative colouring', async () => {
    vi.mocked(skinAnalysisService.compareAnalyses).mockResolvedValue(comparison)
    renderModal()

    await waitFor(() => {
      expect(screen.getByText('+6')).toBeInTheDocument()
    })

    expect(screen.getByText('+7%')).toBeInTheDocument()
    expect(screen.getByText('-1 yrs')).toBeInTheDocument()
    expect(screen.getByText('+6').className).toContain('text-emerald-600')
    expect(screen.getByText('+7%').className).toContain('text-emerald-600')
    expect(screen.getByText('-1 yrs').className).toContain('text-emerald-600')
    expect(screen.getByText('31 days')).toBeInTheDocument()

    expect(screen.getByText('Acne & Blemishes')).toBeInTheDocument()
    expect(screen.getByText('Improved')).toBeInTheDocument()
    expect(screen.getByText('Regressed')).toBeInTheDocument()
    expect(screen.getByText('Stable')).toBeInTheDocument()
  })

  it('renders an error state with a close button when loading fails', async () => {
    vi.mocked(skinAnalysisService.compareAnalyses).mockRejectedValue(
      new Error('boom'),
    )
    const onClose = vi.fn()
    renderModal(true, onClose)

    await waitFor(() => {
      expect(screen.getByText(/Failed to load comparison/)).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Close', { selector: 'button.btn-primary' }))
    expect(onClose).toHaveBeenCalled()
  })
})
