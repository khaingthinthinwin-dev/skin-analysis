import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

const languages = {
  en: 'English',
  ja: '日本語',
  my: 'မြန်မာ',
} as const;

export type AuthLanguage = keyof typeof languages;

export async function chooseAuthLanguage(
  page: Page,
  language: AuthLanguage
): Promise<void> {
  const toggle = page.locator('button').filter({
    has: page.locator('svg.lucide-globe'),
  });
  await expect(toggle).toBeVisible();
  await toggle.click();
  await page.getByRole('menuitem', { name: languages[language] }).click();
}
