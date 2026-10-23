import type { Page } from '@playwright/test';
import en from '../../frontend/public/locales/en/translation.json';
import my from '../../frontend/public/locales/my/translation.json';
import ja from '../../frontend/public/locales/ja/translation.json';

export type AdLocale = 'en' | 'my' | 'ja';

const resources: Record<AdLocale, Record<string, unknown>> = {
  en: en as Record<string, unknown>,
  my: my as Record<string, unknown>,
  ja: ja as Record<string, unknown>,
};

const languageLabels: Record<AdLocale, string> = {
  en: 'English',
  my: 'မြန်မာ',
  ja: '日本語',
};

export function localizedText(
  locale: AdLocale,
  key: string,
  values: Record<string, string | number> = {},
): string {
  let value: unknown = resources[locale];
  for (const segment of key.split('.')) {
    value = typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)[segment]
      : undefined;
  }
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Missing ${locale} translation for ${key}`);
  }
  return value.replace(/{{\s*(\w+)\s*}}/g, (_match, name: string) => String(values[name] ?? ''));
}

export async function switchAdLocale(page: Page, locale: AdLocale): Promise<void> {
  await page.locator('button:has(svg.lucide-globe)').click();
  await page.getByRole('menuitem', { name: languageLabels[locale], exact: true }).click();
  await page.waitForFunction((expected) => localStorage.getItem('i18nextLng') === expected, locale);
  await page.getByRole('heading', {
    name: localizedText(locale, 'admin.ads.list.title'),
    exact: true,
  }).waitFor({ state: 'visible' });
}
