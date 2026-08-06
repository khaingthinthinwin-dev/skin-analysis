import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('merges class names', () => {
    const result = cn('text-red-500', 'text-blue-500')
    expect(result).toBe('text-blue-500')
  })

  it('handles conditional classes', () => {
    const isVisible = true
    const isHidden = false
    const result = cn('base', isHidden && 'hidden', isVisible && 'visible')
    expect(result).toBe('base visible')
  })

  it('handles empty input', () => {
    const result = cn()
    expect(result).toBe('')
  })

  it('handles single input', () => {
    const result = cn('text-lg')
    expect(result).toBe('text-lg')
  })

  it('handles undefined and null', () => {
    const result = cn('base', undefined, null, 'extra')
    expect(result).toBe('base extra')
  })

  it('merges tailwind classes correctly', () => {
    const result = cn('px-4 py-2', 'px-8')
    expect(result).toBe('py-2 px-8')
  })
})
