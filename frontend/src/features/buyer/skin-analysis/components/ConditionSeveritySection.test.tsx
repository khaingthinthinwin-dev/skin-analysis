import { beforeAll, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConditionSeveritySection } from './ConditionSeveritySection'
import { initTestI18n } from '@/test/i18nTest'
import type { ConditionDto } from '../types/skin-analysis.types'

beforeAll(async () => {
  await initTestI18n()
})

const conditions: ConditionDto[] = [
  {
    conditionId: '11111111-1111-1111-1111-111111111111',
    conditionName: 'acne',
    severity: 'MODERATE',
    severityScore: 55,
    affectedArea: 'T-zone',
    description: 'Inflammatory breakouts across the forehead.',
  },
  {
    conditionId: '22222222-2222-2222-2222-222222222222',
    conditionName: 'redness',
    severity: 'MILD',
    severityScore: 30,
    affectedArea: 'Cheeks',
    description: 'Mild redness on both cheeks.',
  },
  {
    conditionId: '44444444-4444-4444-4444-444444444444',
    conditionName: 'pigmentation',
    severity: 'SEVERE',
    severityScore: 88,
    affectedArea: 'Cheeks',
    description: 'Dark spots across both cheeks.',
  },
]

const bar = (label: string) =>
  screen.getByRole('progressbar', { name: label }) as HTMLElement

const row = (label: string) => bar(label).parentElement as HTMLElement

describe('ConditionSeveritySection', () => {
  it('renders all six conditions in canonical order', () => {
    render(<ConditionSeveritySection conditions={conditions} />)

    expect(screen.getByText('Condition Severity')).toBeInTheDocument()

    const order = screen
      .getAllByRole('progressbar')
      .map((el) => el.getAttribute('aria-label'))
    expect(order).toEqual([
      'Acne & Blemishes',
      'Facial Redness',
      'Skin Texture',
      'Pigmentation & Spots',
      'Dryness',
      'Pore Size',
    ])
  })

  it('shows severity scores and severity tags', () => {
    render(<ConditionSeveritySection conditions={conditions} />)

    expect(bar('Acne & Blemishes')).toHaveAttribute('aria-valuenow', '55')
    expect(bar('Facial Redness')).toHaveAttribute('aria-valuenow', '30')
    expect(bar('Pigmentation & Spots')).toHaveAttribute('aria-valuenow', '88')

    expect(row('Acne & Blemishes')).toHaveTextContent('MODERATE')
    expect(row('Facial Redness')).toHaveTextContent('LOW')
    expect(row('Pigmentation & Spots')).toHaveTextContent('HIGH')
  })

  it('colours bars green / amber / red by severity tag', () => {
    render(<ConditionSeveritySection conditions={conditions} />)

    const barFill = (label: string) =>
      bar(label).firstElementChild as HTMLElement

    expect(barFill('Pigmentation & Spots').className).toContain('bg-red-500')
    expect(barFill('Acne & Blemishes').className).toContain('bg-amber-500')
    expect(barFill('Dryness').className).toContain('bg-emerald-500')
  })

  it('falls back to LOW / 0 for conditions missing from the payload', () => {
    render(<ConditionSeveritySection conditions={conditions} />)

    expect(row('Pore Size')).toHaveTextContent('LOW')
    expect(bar('Pore Size')).toHaveAttribute('aria-valuenow', '0')
    expect(
      screen.getByText('Inflammatory breakouts across the forehead.'),
    ).toBeInTheDocument()
  })

  it('renders compact badges when compact is set', () => {
    render(<ConditionSeveritySection conditions={conditions} compact />)

    expect(screen.queryByText('Condition Severity')).not.toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.getAllByText('Acne & Blemishes')).toHaveLength(1)
    expect(screen.getAllByText('Pore Size')).toHaveLength(1)
  })
})
