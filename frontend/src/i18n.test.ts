import { describe, expect, it } from 'vitest'
import i18n from './i18n'

describe('i18n skin namespace', () => {
  it('bundles the AI Skin Analysis copy so no fetch is required', async () => {
    expect(i18n.hasResourceBundle('en', 'skin')).toBe(true)
    expect(i18n.hasResourceBundle('ja', 'skin')).toBe(true)
    expect(i18n.hasResourceBundle('my', 'skin')).toBe(true)

    expect(i18n.t('page.title', { ns: 'skin' })).toBe('Clinical Skin Analysis')
    expect(i18n.t('tabs.scan', { ns: 'skin' })).toBe('New Scan')
    expect(i18n.t('tabs.history', { ns: 'skin' })).toBe('History')
    expect(i18n.t('summary.title', { ns: 'skin' })).toBe('Latest Scan Summary')
    expect(i18n.t('common.back', { ns: 'skin' })).toBe('Back')
  })

  it('falls back to English for an unknown language', () => {
    expect(
      i18n.t('page.title', { ns: 'skin', lng: 'my' }),
    ).not.toBe('page.title')
  })
})
