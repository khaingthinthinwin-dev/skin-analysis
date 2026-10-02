import { beforeAll, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TrendVisualizationChart } from './TrendVisualizationChart'
import { initTestI18n } from '@/test/i18nTest'
import type { TrendPointDto } from '../types/skin-analysis.types'

beforeAll(async () => {
  await initTestI18n()
})

const point = (date: string, value: number): TrendPointDto => ({
  date,
  value,
  analysisId: `${date}-0000-0000-0000-000000000000`,
})

const scoreTrend = [point('2026-08-01', 70), point('2026-09-01', 76)]
const hydrationTrend = [point('2026-08-01', 45), point('2026-09-01', 52)]

describe('TrendVisualizationChart', () => {
  it('shows the fallback placeholder when the minimum point count is not met', () => {
    render(
      <TrendVisualizationChart
        healthScoreTrend={[]}
        hydrationTrend={[]}
        minPointsMet={false}
      />,
    )

    expect(
      screen.getByText('At least 2 completed scans are required to view trends'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Health Score')).not.toBeInTheDocument()
  })

  it('falls back when fewer than two points exist even if minPointsMet is true', () => {
    render(
      <TrendVisualizationChart
        healthScoreTrend={[scoreTrend[0]]}
        hydrationTrend={[hydrationTrend[0]]}
        minPointsMet
      />,
    )

    expect(
      screen.getByText('At least 2 completed scans are required to view trends'),
    ).toBeInTheDocument()
  })

  it('renders the chart card with both metric tabs when enough points exist', () => {
    const { container } = render(
      <TrendVisualizationChart
        healthScoreTrend={scoreTrend}
        hydrationTrend={hydrationTrend}
        minPointsMet
        className="custom-chart"
      />,
    )

    expect(screen.getByText('Trend Visualization')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Health Score' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Hydration' })).toBeInTheDocument()
    expect(container.querySelector('.custom-chart')).not.toBeNull()
    expect(container.querySelector('.recharts-responsive-container')).not.toBeNull()
  })
})
