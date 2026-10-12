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

  it('overrides the analysis with the selection (BR-MATCH-006)', () => {
    expect(
      resolveSkinTypeConditions({
        source: 'ai',
        analysisSkinTypes: ['oily', 'combination'],
        requestedSkinTypes: ['dry'],
      }),
    ).toEqual({
      required: [],
      selected: ['dry'],
      restrict: true,
    })
  })

  it('overrides the analysis with all selected types (BR-MATCH-006)', () => {
    expect(
      resolveSkinTypeConditions({
        source: 'ai',
        analysisSkinTypes: ['oily', 'combination'],
        requestedSkinTypes: ['oily', 'dry'],
      }),
    ).toEqual({
      required: [],
      selected: ['oily', 'dry'],
      restrict: true,
    })
  })

  it('replaces the analysis result with the selection when they overlap', () => {
    expect(
      resolveSkinTypeConditions({
        source: 'ai',
        analysisSkinTypes: ['oily', 'combination'],
        requestedSkinTypes: ['combination'],
      }),
    ).toEqual({
      required: [],
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

  it('shows the selected skin type even when it is outside the analysis (BR-MATCH-006)', () => {
    expect(
      filterProductsBySkinType(CATALOG, {
        source: 'ai',
        analysisSkinTypes,
        requestedSkinTypes: ['dry'],
      }),
    ).toEqual([DRY, UNIVERSAL, SENSITIVE_UNIVERSAL])
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

  it('keeps "all" products compatible while a skin type is selected', () => {
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

  it('shows the whole selected type regardless of the analysis (BR-MATCH-006)', () => {
    // Reported case: analysis = Combination with an "Oily" filter selected.
    // The selection overrides the analysis, so every oily product shows.
    const visible = filterProductsBySkinType(EXAMPLE_CATALOG, {
      source: 'ai',
      analysisSkinTypes: ['combination'],
      requestedSkinTypes: ['oily'],
    })

    expect(ids(visible)).toEqual([
      'oily',
      'oily-combination',
      'all',
      'all-mixed-case',
    ])
  })

  it('shows products that match only the selection, not the analysis (BR-MATCH-006)', () => {
    const visible = filterProductsBySkinType(EXAMPLE_CATALOG, {
      source: 'ai',
      analysisSkinTypes: ANALYSIS_SKIN_TYPES,
      requestedSkinTypes: ['dry'],
    })

    expect(ids(visible)).toEqual(['dry', 'all', 'all-mixed-case'])
  })
})
