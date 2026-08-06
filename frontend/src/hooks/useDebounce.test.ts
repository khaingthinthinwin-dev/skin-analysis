import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebounce } from './useDebounce'

describe('useDebounce', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 500))
    expect(result.current).toBe('hello')
  })

  it('debounces value changes', async () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'hello', delay: 500 } }
    )

    rerender({ value: 'world', delay: 500 })
    expect(result.current).toBe('hello')

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(result.current).toBe('world')
    vi.useRealTimers()
  })

  it('cancels previous timeout on rapid changes', async () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 500 } }
    )

    rerender({ value: 'b', delay: 500 })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    rerender({ value: 'c', delay: 500 })
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(result.current).toBe('c')
    vi.useRealTimers()
  })

  it('handles zero delay', async () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'hello', delay: 0 } }
    )

    rerender({ value: 'world', delay: 0 })
    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(result.current).toBe('world')
    vi.useRealTimers()
  })

  it('works with numbers', async () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 0, delay: 500 } }
    )

    rerender({ value: 42, delay: 500 })
    expect(result.current).toBe(0)

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(result.current).toBe(42)
    vi.useRealTimers()
  })
})
