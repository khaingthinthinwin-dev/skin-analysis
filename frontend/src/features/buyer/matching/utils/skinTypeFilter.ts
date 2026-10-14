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
 * Custom rule (supersedes DD_MATCH_05 §2.1 step 5): an explicit panel
 * selection filters WITHIN the analysis result set — the products the grid
 * shows with no selection — so on the AI source BOTH conditions apply: the
 * product must match at least one selected type (BR-MATCH-016 OR semantics)
 * AND stay compatible with at least one analysed type. Products tagged
 * `all` satisfy either condition. Generic results carry no analysis scope and
 * filter by the selection alone.
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

  if (requested.length > 0) {
    // The selection narrows the analysis result set (AI), never widens it;
    // generic results have nothing to narrow against.
    return {
      required: source === 'ai' ? analysis : [],
      selected: requested,
      restrict: true,
    }
  }

  if (source !== 'ai') {
    return { required: [], selected: [], restrict: false }
  }

  return { required: analysis, selected: [], restrict: analysis.length > 0 }
}

/**
 * Client-side counterpart of the API skin-type filter. The API already applies
 * the same rule — on the AI source with an explicit selection, the product has
 * to match the selection AND remain inside the analysis result set (custom
 * rule, DD_MATCH_05 §2.1 step 5) — so this only re-applies the skin-type
 * conditions to keep the rendered grid consistent with a cached response that
 * predates a filter change. It never widens the set: products outside the
 * analysis result never reach the client.
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
    // Both conditions can apply at once on the AI source with a selection:
    // the analysed skin types scope the result set, the selection narrows it.
    if (required.length > 0 && !matches(product, required)) return false
    if (selected.length > 0 && !matches(product, selected)) return false
    return true
  })
}
