import { beforeAll, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DailyRoutineSection } from './DailyRoutineSection'
import { initTestI18n } from '@/test/i18nTest'

beforeAll(async () => {
  await initTestI18n()
})

describe('DailyRoutineSection', () => {
  it('renders the section header and AM/PM periods', () => {
    render(<DailyRoutineSection />)

    expect(screen.getByText('Daily Routine')).toBeInTheDocument()
    expect(screen.getByText('AM · PM')).toBeInTheDocument()
    expect(screen.getByText('Morning')).toBeInTheDocument()
    expect(screen.getByText('Evening')).toBeInTheDocument()
    expect(
      screen.getByText('Protect and hydrate for the day ahead'),
    ).toBeInTheDocument()
  })

  it('renders all four morning steps in order', () => {
    render(<DailyRoutineSection />)

    const names = screen
      .getAllByText(/Gentle Cleanser|Antioxidant Serum|Light Moisturizer|Sunscreen SPF 50/)
      .map((el) => el.textContent)
    expect(names).toEqual([
      'Gentle Cleanser',
      'Antioxidant Serum',
      'Light Moisturizer',
      'Sunscreen SPF 50',
    ])
  })

  it('renders all four evening steps in order', () => {
    render(<DailyRoutineSection />)

    const names = screen
      .getAllByText(/Double Cleanse|Exfoliate 2–3× a week|Treatment Serum|Night Cream/)
      .map((el) => el.textContent)
    expect(names).toEqual([
      'Double Cleanse',
      'Exfoliate 2–3× a week',
      'Treatment Serum',
      'Night Cream',
    ])
  })

  it('shows numbered steps and the patch-test tip', () => {
    render(<DailyRoutineSection />)

    expect(screen.getAllByText('1')).toHaveLength(2)
    expect(screen.getAllByText('4')).toHaveLength(2)
    expect(
      screen.getByText('Introduce one new product at a time and patch test before full use.'),
    ).toBeInTheDocument()
  })
})
