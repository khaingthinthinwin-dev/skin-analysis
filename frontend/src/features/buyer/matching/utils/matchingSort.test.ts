import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MATCHING_SORT,
  getMatchingSortOptions,
  resolveMatchingSort,
} from './matchingSort'

/** BR-MATCH-025 allowlists. */
const ALLOWED_SORT_FIELDS = ['matchScore', 'price', 'rating', 'createdAt']
const ALLOWED_ORDERS = ['asc', 'desc']

describe('resolveMatchingSort', () => {
  it('falls back to the "Newest" default when the URL has no sort', () => {
    expect(resolveMatchingSort({})).toEqual(DEFAULT_MATCHING_SORT)
    expect(DEFAULT_MATCHING_SORT).toEqual({ sort: 'createdAt', order: 'desc' })
  })

  it('returns the sort explicitly selected in the URL', () => {
    expect(resolveMatchingSort({ sort: 'price', order: 'asc' })).toEqual({
      sort: 'price',
      order: 'asc',
    })
    expect(resolveMatchingSort({ sort: 'rating', order: 'desc' })).toEqual({
      sort: 'rating',
      order: 'desc',
    })
  })

  it('defaults a partially specified sort to desc', () => {
    expect(resolveMatchingSort({ sort: 'price' })).toEqual({
      sort: 'price',
      order: 'desc',
    })
  })
})

describe('getMatchingSortOptions', () => {
  it('offers Match Score for AI results only', () => {
    expect(
      getMatchingSortOptions('ai').find((option) => option.value === 'matchScore:desc'),
    ).toEqual({ value: 'matchScore:desc', label: 'Match Score' })
    expect(
      getMatchingSortOptions('generic').some((option) => option.value === 'matchScore:desc'),
    ).toBe(false)
  })

  it('never offers a "Recommended" entry', () => {
    for (const source of ['ai', 'generic'] as const) {
      expect(getMatchingSortOptions(source).map((option) => option.label)).not.toContain(
        'Recommended',
      )
    }
  })

  it('always offers the values the sort bar must be able to display', () => {
    for (const source of ['ai', 'generic'] as const) {
      const resolved = resolveMatchingSort({})
      const values = getMatchingSortOptions(source).map((option) => option.value)
      // The resolved default must exist as an option, otherwise the select renders
      // the "Sort by" placeholder instead of the current selection.
      expect(values).toContain(`${resolved.sort}:${resolved.order}`)
    }
  })

  it('only offers sort fields and directions from the BR-MATCH-025 allowlist', () => {
    for (const source of ['ai', 'generic'] as const) {
      const options = getMatchingSortOptions(source)
      expect(options.length).toBeGreaterThan(0)
      for (const { value } of options) {
        const [field, order] = value.split(':')
        expect(ALLOWED_SORT_FIELDS).toContain(field)
        expect(ALLOWED_ORDERS).toContain(order)
      }
    }
  })

  it('offers price, newest and rating ordering for both sources', () => {
    for (const source of ['ai', 'generic'] as const) {
      const values = getMatchingSortOptions(source).map((option) => option.value)
      expect(values).toContain('price:asc')
      expect(values).toContain('price:desc')
      expect(values).toContain('createdAt:desc')
      expect(values).toContain('rating:desc')
    }
  })

  it('lists Newest once and as the default entry for generic results', () => {
    const options = getMatchingSortOptions('generic')
    expect(options[0]).toEqual({ value: 'createdAt:desc', label: 'Newest' })
    expect(options.filter((option) => option.value === 'createdAt:desc')).toHaveLength(1)
  })
})
