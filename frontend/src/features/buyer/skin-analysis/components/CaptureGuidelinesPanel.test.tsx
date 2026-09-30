import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { CaptureGuidelinesPanel } from './CaptureGuidelinesPanel'
import { initTestI18n } from '@/test/i18nTest'

beforeAll(async () => {
  await initTestI18n()
})

describe('CaptureGuidelinesPanel', () => {
  it('lists all six capture guidelines with title and description', () => {
    render(<CaptureGuidelinesPanel />)

    expect(screen.getByText('Capture Guidelines')).toBeInTheDocument()

    const expected: [string, string][] = [
      ['Lighting', 'Use natural, even lighting - avoid harsh shadows or direct flash'],
      ['Background', 'Use a plain, neutral background'],
      ['No Glasses', 'Remove glasses and accessories'],
      ['Expression', 'Maintain a neutral, relaxed expression'],
      ['Distance', 'Hold camera at eye level, arm\'s length away'],
      ['Consent', 'I understand my facial image will be analyzed by AI'],
    ]

    for (const [title, desc] of expected) {
      expect(screen.getByText(title)).toBeInTheDocument()
      expect(screen.getByText(desc)).toBeInTheDocument()
    }
  })

  it('fires onToggle from the summary button', () => {
    const onToggle = vi.fn()
    render(<CaptureGuidelinesPanel onToggle={onToggle} />)

    fireEvent.click(screen.getByRole('button', { name: 'Toggle guidelines' }))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('omits the toggle button when no handler is given', () => {
    render(<CaptureGuidelinesPanel />)
    expect(screen.queryByRole('button', { name: 'Toggle guidelines' })).not.toBeInTheDocument()
  })
})
