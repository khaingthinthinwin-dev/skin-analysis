import { describe, expect, it } from 'vitest'
import en from '../../public/locales/en/translation.json'
import my from '../../public/locales/my/translation.json'
import ja from '../../public/locales/ja/translation.json'

const bundles = { en, my, ja } as const

function leafEntries(value: unknown, prefix = ''): Array<[string, unknown]> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return [[prefix, value]]
  }
  return Object.entries(value).flatMap(([key, child]) =>
    leafEntries(child, prefix ? `${prefix}.${key}` : key),
  )
}

function getAdsBundle(bundle: unknown): Record<string, unknown> {
  const root = bundle as { admin?: { ads?: Record<string, unknown> } }
  if (!root.admin?.ads) throw new Error('Missing admin.ads translation bundle')
  return root.admin.ads
}

function getPath(value: unknown, path: string): string {
  const result = path.split('.').reduce<unknown>((current, key) => {
    if (typeof current !== 'object' || current === null) return undefined
    return (current as Record<string, unknown>)[key]
  }, value)
  if (typeof result !== 'string' || !result.trim()) throw new Error(`Missing translation: ${path}`)
  return result
}

describe('Ad Management translations', () => {
  it('has the same complete, non-empty admin.ads keys in English, Myanmar, and Japanese', () => {
    const englishKeys = leafEntries(getAdsBundle(en)).map(([key]) => key).sort()

    for (const [locale, bundle] of Object.entries(bundles)) {
      const ads = getAdsBundle(bundle)
      const entries = leafEntries(ads)
      expect(entries.map(([key]) => key).sort(), `${locale} keys`).toEqual(englishKeys)
      for (const [key, value] of entries) {
        expect(typeof value, `${locale}: ${key}`).toBe('string')
        expect((value as string).trim(), `${locale}: ${key}`).not.toBe('')
      }
    }
  })

  it('provides Myanmar and Japanese copy instead of English fallback text', () => {
    const keys = [
      'list.title',
      'reviewModal.reviewTitle',
      'list.table.shop',
      'packages.title',
      'feeHistory.title',
      'analytics.title',
      'export.title',
    ]

    for (const key of keys) {
      const english = getPath(getAdsBundle(en), key)
      expect(getPath(getAdsBundle(my), key), `Myanmar ${key}`).not.toBe(english)
      expect(getPath(getAdsBundle(ja), key), `Japanese ${key}`).not.toBe(english)
    }

    const myText = keys.map((key) => getPath(getAdsBundle(my), key)).join(' ')
    const jaText = keys.map((key) => getPath(getAdsBundle(ja), key)).join(' ')
    expect(myText).toMatch(/[\u1000-\u109f]/)
    expect(jaText).toMatch(/[\u3040-\u30ff\u4e00-\u9fff]/)
  })
})
