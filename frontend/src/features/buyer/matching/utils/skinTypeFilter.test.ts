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

  it('scopes the selection to the analysed skin types (custom rule)', () => {
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

  it('keeps the analysis scope with all selected types (custom rule)', () => {
    expect(
      resolveSkinTypeConditions({
        source: 'ai',
        analysisSkinTypes: ['oily', 'combination'],
        requestedSkinTypes: ['oily', 'dry'],
      }),
    ).toEqual({
      required: ['oily', 'combination'],
      selected: ['oily', 'dry'],
      restrict: true,
    })
  })

  it('applies selection and analysis together when they overlap', () => {
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

  it('scopes a selection outside the analysis to the analysis result set (custom rule)', () => {
    // The selection never widens the grid: dry-only products that are
    // incompatible with the analysed types stay hidden, universal ones show.
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

  it('keeps the multi-type UV sunscreen visible when one of its types is selected (reported case)', () => {
    // Reported case: analysis = "normal", the result grid shows UV Protection
    // Sunscreen SPF50 (dry,oily,combination,sensitive,normal). Selecting
    // "dry" must keep it visible: it matches the selection AND the analysed
    // type — even though it is stored in no skin_analysis_recommendations row.
    const uv = {
      id: 'uv',
      skinTypes: ['dry', 'oily', 'combination', 'sensitive', 'normal'],
    }
    const dryOnly = { id: 'dry-only', skinTypes: ['dry'] }
    expect(
      filterProductsBySkinType([uv, dryOnly], {
        source: 'ai',
        analysisSkinTypes: ['normal'],
        requestedSkinTypes: ['dry'],
      }),
    ).toEqual([uv])
  })

  it('keeps a product that carries the analysed type among several', () => {
    const multi = { id: 'multi', skinTypes: ['dry', 'normal'] }
    expect(
      filterProductsBySkinType([multi], {
        source: 'ai',
        analysisSkinTypes: ['normal'],
        requestedSkinTypes: [],
      }),
    ).toEqual([multi])
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

  it('scopes an oily selection to the combination analysis result (custom rule)', () => {
    // Reported case: analysis = Combination with an "Oily" filter selected.
    // The selection narrows within the analysis result, so products tagged
    // {oily, combination} and "all"-tagged ones show — dry/combination-only
    // products behave exactly like the default analysis view.
    const visible = filterProductsBySkinType(EXAMPLE_CATALOG, {
      source: 'ai',
      analysisSkinTypes: ['combination'],
      requestedSkinTypes: ['oily'],
    })

    expect(ids(visible)).toEqual([
      'oily-combination',
      'all',
      'all-mixed-case',
    ])
  })

  it('hides products outside the analysis result even when selected (custom rule)', () => {
    const visible = filterProductsBySkinType(EXAMPLE_CATALOG, {
      source: 'ai',
      analysisSkinTypes: ANALYSIS_SKIN_TYPES,
      requestedSkinTypes: ['dry'],
    })

    // "dry" is not part of the analysed types: only universal products
    // survive, so the selection narrows the grid instead of widening it.
    expect(ids(visible)).toEqual(['all', 'all-mixed-case'])
  })
})
