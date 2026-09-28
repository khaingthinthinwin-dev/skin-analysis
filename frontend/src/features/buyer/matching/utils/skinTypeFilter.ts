import type { RecommendationSource } from './matchingSort'

/** Products tagged with this value are suitable for every skin type. */
const UNIVERSAL_SKIN_TYPE = 'all'

export interface SkinTypeFilterInput {
  source: RecommendationSource
  /** Skin types reported by the buyer's latest analysis (`[]` when generic). */
  analysisSkinTypes: string[]
  /** Skin types picked in the filter panel ([] / `all` mean "All"). */
  requestedSkinTypes: string[]
}

function normalize(types: string[]): string[] {
  return types
    .map((type) => type.trim().toLowerCase())
    .filter((type) => type.length > 0 && type !== UNIVERSAL_SKIN_TYPE)
}

/** `true` for the "suitable for every skin type" tag, ignoring case/space. */
function isUniversal(type: string): boolean {
  return type.trim().toLowerCase() === UNIVERSAL_SKIN_TYPE
}

/**
 * Skin type conditions a product has to satisfy.
 *
 * Mirrors the API rule: the analysis result and the panel selection are ANDed,
 * while each condition is an OR inside itself (one shared skin type is enough,
 * a product never has to carry every type). `required` holds the analysed skin
 * types, `selected` the types the buyer picked. Without an analysis the
 * selection applies on its own, and no selection means no restriction.
 */
export function resolveSkinTypeConditions({
  source,
  analysisSkinTypes,
  requestedSkinTypes,
}: SkinTypeFilterInput): {
  required: string[]
  selected: string[]
  restrict: boolean
} {
  const analysis = normalize(analysisSkinTypes)
  const requested = normalize(requestedSkinTypes)

  if (source !== 'ai') {
    return { required: [], selected: requested, restrict: requested.length > 0 }
  }

  return {
    required: analysis,
    selected: requested,
    restrict: analysis.length > 0 || requested.length > 0,
  }
}

/**
 * Client-side counterpart of the API skin-type filter. The API already applies
 * the same rule; this keeps the rendered grid consistent with the analysis
 * result (and with products tagged for every skin type) even when a cached
 * response predates a filter change.
 */
export function filterProductsBySkinType<
  T extends { skinTypes: string[] },
>(products: T[], input: SkinTypeFilterInput): T[] {
  const { required, selected, restrict } = resolveSkinTypeConditions(input)

  if (!restrict) return products

  // A product tagged for every skin type is compatible with the analysis result
  // and with whichever skin type the buyer selected.
  const universalMatches = input.source === 'ai'

  const matches = (product: { skinTypes: string[] }, types: string[]): boolean => {
    if (universalMatches && product.skinTypes.some(isUniversal)) return true

    const normalized = normalize(product.skinTypes)
    return normalized.some((type) => types.includes(type))
  }

  return products.filter((product) => {
    // Analysis result AND panel selection - a product has to satisfy both, and
    // matching one type inside each condition is enough.
    if (required.length > 0 && !matches(product, required)) return false
    if (selected.length > 0 && !matches(product, selected)) return false
    return true
  })
}
