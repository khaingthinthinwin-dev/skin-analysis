import { test, expect } from '@playwright/test';
import * as path from 'node:path';

const ADMIN = { email: 'pph@gmail.com', password: 'Cosmetics@123' };
const OUT_DIR =
  process.env.OPencode_SHOT_DIR ??
  'C:\\Users\\PYAEPH~1\\AppData\\Local\\Temp\\opencode';

const VIEWPORTS = [
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1280', width: 1280, height: 900 },
];

test('audit log responsive check', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.getByPlaceholder('user@example.com').fill(ADMIN.email);
  await page.getByPlaceholder('Enter your password').fill(ADMIN.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForFunction(() => !window.location.pathname.includes('/login'), {
    timeout: 20_000,
  });

  const results: string[] = [];

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/admin/audit-logs');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);

    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      bodyScrollWidth: document.body.scrollWidth,
    }));
    results.push(
      `${vp.name}: scrollWidth=${metrics.scrollWidth} innerWidth=${metrics.innerWidth} overflowX=${metrics.scrollWidth > metrics.innerWidth}`,
    );

    await page.screenshot({
      path: path.join(OUT_DIR, `audit-${vp.name}.png`),
      fullPage: true,
    });
  }

  // Open the detail modal on mobile to verify the full-screen layout.
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/admin/audit-logs');
  await page.waitForLoadState('networkidle');
  const detailBtn = page.locator('[data-testid="btn-view-detail"]').first();
  if (await detailBtn.isVisible()) {
    await detailBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(OUT_DIR, 'audit-mobile-detail-modal.png'),
    });
  }

  console.log(results.join('\n'));
  expect(results.join('\n')).toContain('overflowX=false');
});
