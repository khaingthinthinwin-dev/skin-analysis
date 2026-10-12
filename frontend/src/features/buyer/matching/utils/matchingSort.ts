import type { MatchQueryParams } from '@/schemas/matching.schema'

export type MatchingSortField = 'matchScore' | 'price' | 'rating' | 'createdAt'
export type MatchingSortOrder = 'asc' | 'desc'
export type RecommendationSource = 'ai' | 'generic'

export interface MatchingSortOption {
  value: string
  label: string
}

/**
 * Default sort shown (and sent) by the sort bar: newest first. Keeping the default
 * explicit means the selected option always matches the order the API applies.
 */
export const DEFAULT_MATCHING_SORT: {
  sort: MatchingSortField
  order: MatchingSortOrder
} = { sort: 'createdAt', order: 'desc' }

/** Shared sort fields (BR-MATCH-025 allowlist) — newest, then price and rating. */
const COMMON_SORT_OPTIONS: readonly MatchingSortOption[] = [
  { value: 'createdAt:desc', label: 'Newest' },
  { value: 'price:asc', label: 'Price: Low to High' },
  { value: 'price:desc', label: 'Price: High to Low' },
  { value: 'rating:desc', label: 'Highest Rated' },
]

/** Match Score is only offered for AI results — generic results carry no scores. */
const MATCH_SCORE_OPTION: MatchingSortOption = {
  value: 'matchScore:desc',
  label: 'Match Score',
}

/** AI options keep "Newest" at the top too, so both sources open on the default. */
const AI_SORT_OPTIONS: readonly MatchingSortOption[] = [
  COMMON_SORT_OPTIONS[0],
  MATCH_SCORE_OPTION,
  ...COMMON_SORT_OPTIONS.slice(1),
]

export function getMatchingSortOptions(
  source: RecommendationSource,
): readonly MatchingSortOption[] {
  return source === 'ai' ? AI_SORT_OPTIONS : COMMON_SORT_OPTIONS
}

/**
 * Resolve the value the sort bar shows for the current URL, falling back to the
 * "Newest" default when the URL carries no explicit sort/order.
 *
 * When the result `source` is known, a sort that source cannot offer (a stale
 * `matchScore` after the AI analysis lapsed, or an unlisted direction like
 * `rating:asc`) also falls back to "Newest" — otherwise the select would render
 * its placeholder while the API applies a different order than the one shown.
 * Pass `undefined` while the source is still loading to avoid flashing the
 * fallback for a valid AI sort.
 */
export function resolveMatchingSort(
  filters: Partial<Pick<MatchQueryParams, 'sort' | 'order'>>,
  source?: RecommendationSource,
): {
  sort: MatchingSortField
  order: MatchingSortOrder
} {
  const sort = filters.sort ?? DEFAULT_MATCHING_SORT.sort
  const order = filters.order ?? DEFAULT_MATCHING_SORT.order

  const displayable =
    !source ||
    getMatchingSortOptions(source).some((option) => option.value === `${sort}:${order}`)

  if (!displayable) return { ...DEFAULT_MATCHING_SORT }
  return { sort, order }
}
