import { describe, expect, it } from 'vitest'
import { filterProductsBySkinType, resolveSkinTypeConditions } from './skinTypeFilter'

const OILY = { id: 'oily', skinTypes: ['oily'] }
const COMBINATION = { id: 'combination', skinTypes: ['combination'] }
const DRY = { id: 'dry', skinTypes: ['dry'] }
const UNIVERSAL = { id: 'universal', skinTypes: ['all'] }
const SENSITIVE_UNIVERSAL = { id: 'sensitive-all', skinTypes: ['sensitive', 'all'] }
const CATALOG = [OILY, COMBINATION, DRY, UNIVERSAL, SENSITIVE_UNIVERSAL]

describe('resolveSkinTypeConditions', () => {
  it('requires the analysed skin types when nothing is selected ("All")', () => {
    expect(
      resolveSkinTypeConditions({
        source: 'ai',
        analysisSkinTypes: ['oily', 'combination'],
        requestedSkinTypes: [],
      }),
    ).toEqual({
      required: ['oily', 'combination'],
      selected: [],
      restrict: true,
    })
  })

  it('keeps a selection outside the analysis as its own condition', () => {
    expect(
      resolveSkinTypeConditions({
        source: 'ai',
        analysisSkinTypes: ['oily', 'combination'],
        requestedSkinTypes: ['dry'],
      }),
    ).toEqual({
      required: ['oily', 'combination'],
      selected: ['dry'],
      restrict: true,
    })
  })

  it('keeps the analysis result next to the selection', () => {
    expect(
      resolveSkinTypeConditions({
        source: 'ai',
        analysisSkinTypes: ['oily', 'combination'],
        requestedSkinTypes: ['combination'],
      }),
    ).toEqual({
      required: ['oily', 'combination'],
      selected: ['combination'],
      restrict: true,
    })
  })

  it('does not restrict generic results without a selection', () => {
    expect(
      resolveSkinTypeConditions({
        source: 'generic',
        analysisSkinTypes: [],
        requestedSkinTypes: [],
      }),
    ).toEqual({ required: [], selected: [], restrict: false })
  })
})

describe('filterProductsBySkinType', () => {
  const analysisSkinTypes = ['oily', 'combination']

  it('shows the analysis-compatible products for "All"', () => {
    expect(
      filterProductsBySkinType(CATALOG, {
        source: 'ai',
        analysisSkinTypes,
        requestedSkinTypes: [],
      }),
    ).toEqual([OILY, COMBINATION, UNIVERSAL, SENSITIVE_UNIVERSAL])
  })

  it('keeps only the selected skin type when it is part of the analysis', () => {
    expect(
      filterProductsBySkinType(CATALOG, {
        source: 'ai',
        analysisSkinTypes,
        requestedSkinTypes: ['oily'],
      }),
    ).toEqual([OILY, UNIVERSAL, SENSITIVE_UNIVERSAL])
  })

  it('drops a product that only matches the selection, not the analysis result', () => {
    expect(
      filterProductsBySkinType(CATALOG, {
        source: 'ai',
        analysisSkinTypes,
        requestedSkinTypes: ['dry'],
      }),
    ).toEqual([UNIVERSAL, SENSITIVE_UNIVERSAL])
  })

  it('filters generic results by the selection as-is', () => {
    expect(
      filterProductsBySkinType(CATALOG, {
        source: 'generic',
        analysisSkinTypes: [],
        requestedSkinTypes: ['dry'],
      }),
    ).toEqual([DRY])
  })

  it('keeps every product for generic results without a selection', () => {
    expect(
      filterProductsBySkinType(CATALOG, {
        source: 'generic',
        analysisSkinTypes: [],
        requestedSkinTypes: [],
      }),
    ).toEqual(CATALOG)
  })
})

describe('analysis-result matching (requirement examples)', () => {
  // Analysis result: Oily + Combination
  const ANALYSIS_SKIN_TYPES = ['oily', 'combination']
  const EXAMPLE_CATALOG = [
    { id: 'oily', skinTypes: ['oily'] },
    { id: 'combination', skinTypes: ['combination'] },
    { id: 'oily-combination', skinTypes: ['oily', 'combination'] },
    { id: 'dry', skinTypes: ['dry'] },
    { id: 'all', skinTypes: ['all'] },
    { id: 'all-mixed-case', skinTypes: ['All'] },
  ]
  const ids = (products: Array<{ id: string }>) => products.map((p) => p.id)

  it('shows a product that matches at least one analysed skin type (OR, not ALL)', () => {
    const visible = filterProductsBySkinType(EXAMPLE_CATALOG, {
      source: 'ai',
      analysisSkinTypes: ANALYSIS_SKIN_TYPES,
      requestedSkinTypes: [],
    })

    expect(ids(visible)).toEqual([
      'oily',
      'combination',
      'oily-combination',
      'all',
      'all-mixed-case',
    ])
  })

  it('hides a product whose skin type is not part of the analysis', () => {
    const visible = filterProductsBySkinType(EXAMPLE_CATALOG, {
      source: 'ai',
      analysisSkinTypes: ANALYSIS_SKIN_TYPES,
      requestedSkinTypes: [],
    })

    expect(ids(visible)).not.toContain('dry')
  })

  it('keeps "all" products compatible while an analysed type is selected', () => {
    const visible = filterProductsBySkinType(EXAMPLE_CATALOG, {
      source: 'ai',
      analysisSkinTypes: ANALYSIS_SKIN_TYPES,
      requestedSkinTypes: ['oily'],
    })

    expect(ids(visible)).toEqual([
      'oily',
      'oily-combination',
      'all',
      'all-mixed-case',
    ])
  })

  it('shows a multi-type product that matches both the selection and the analysis', () => {
    // Reported case: analysis = Combination with an "Oily" filter selected. The
    // product tagged oily + combination satisfies both conditions.
    const visible = filterProductsBySkinType(EXAMPLE_CATALOG, {
      source: 'ai',
      analysisSkinTypes: ['combination'],
      requestedSkinTypes: ['oily'],
    })

    expect(ids(visible)).toEqual(['oily-combination', 'all', 'all-mixed-case'])
  })

  it('hides products that only match the selection but not the analysis result', () => {
    const visible = filterProductsBySkinType(EXAMPLE_CATALOG, {
      source: 'ai',
      analysisSkinTypes: ANALYSIS_SKIN_TYPES,
      requestedSkinTypes: ['dry'],
    })

    expect(ids(visible)).toEqual(['all', 'all-mixed-case'])
  })
})
