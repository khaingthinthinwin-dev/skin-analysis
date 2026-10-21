import type { Page } from '@playwright/test';
import { test } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { createHash } from 'crypto';

const TEST_RESULTS_ROOT = path.resolve(__dirname, '../test-results');

export const SCREEN_FOLDERS = [
  'SignUp_LogIn',
  'SearchAndFilter',
  'ProductDetail',
  'Matching_And_Recommendation',
  'AI_Skin_Analysis',
  'Wishlist_Cart',
  'Checkout_Purchase',
  'Product_Management',
  'Advertisement_Management',
  'Promotion_Pages',
  'Ad_Management_Screen',
  'Review_ContentModeration',
  'Commission_Revenue',
  'Order_Insights',
  'Audit_Log',
];

export function getScreenFromFilePath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  for (const screen of SCREEN_FOLDERS) {
    if (
      normalized.includes(`/tests/${screen}/`) ||
      normalized.includes(`tests/${screen}/`) ||
      normalized.startsWith(`${screen}/`) ||
      normalized.includes(`/${screen}/`) ||
      normalized.includes(screen)
    ) {
      return screen;
    }
  }
  return 'Other';
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 80);
}

type ScreenshotIndexEntry = {
  description?: string;
  test?: string;
};

type ScreenshotIndex = Record<string, string | ScreenshotIndexEntry>;

function loadScreenshotIndex(screenshotDir: string): ScreenshotIndex {
  const indexPath = path.join(screenshotDir, 'index.json');
  if (!fs.existsSync(indexPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  } catch {
    return {};
  }
}

async function updateScreenshotIndex(
  screenshotDir: string,
  filename: string,
  description: string | undefined,
  testKey: string | undefined,
): Promise<void> {
  const lockPath = path.join(screenshotDir, 'index.lock');
  const indexPath = path.join(screenshotDir, 'index.json');
  const deadline = Date.now() + 10_000;
  let lockFd: number;

  while (true) {
    try {
      lockFd = fs.openSync(lockPath, 'wx');
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      if (Date.now() >= deadline) {
        throw new Error(`Timed out waiting for screenshot index lock: ${lockPath}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }

  try {
    const index = loadScreenshotIndex(screenshotDir);
    const existing = index[filename];
    const prev: ScreenshotIndexEntry =
      typeof existing === 'string' ? { description: existing } : existing || {};
    index[filename] = {
      ...prev,
      ...(description ? { description } : {}),
      ...(testKey ? { test: testKey } : {}),
    };
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
  } finally {
    fs.closeSync(lockFd);
    fs.unlinkSync(lockPath);
  }
}

export async function captureScreenshot(
  page: Page,
  stepName: string,
  description?: string,
  testInfo?: { title: string; file: string }
): Promise<string> {
  let screenFolder = 'Other';
  let testKey: string | undefined;

  try {
    const info = test.info();
    screenFolder = getScreenFromFilePath(info.file);
    testKey = `${path.basename(info.file)}::${info.title}`;
  } catch {
    if (testInfo?.file) {
      screenFolder = getScreenFromFilePath(testInfo.file);
    }
    if (testInfo?.file && testInfo?.title) {
      testKey = `${path.basename(testInfo.file)}::${testInfo.title}`;
    }
  }

  const screenshotDir = path.join(TEST_RESULTS_ROOT, screenFolder, 'screenshots');
  ensureDir(screenshotDir);

  const step = sanitize(stepName);
  const filename = `${step}.png`;
  const filePath = path.join(screenshotDir, filename);

  try {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(100);
  } catch {}

  const captureMarker = 'data-e2e-full-page-capture';
  const expandMain = await page.evaluate((marker) => {
    const main = Array.from(document.querySelectorAll<HTMLElement>('main'))
      .reverse()
      .find((element) => element.scrollHeight > element.clientHeight + 1);
    if (!main || main.scrollHeight <= main.clientHeight + 1) return false;

    let element: HTMLElement | null = main;
    let index = 0;
    while (element && element !== document.documentElement) {
      element.setAttribute(marker, index === 0 ? 'main' : 'ancestor');
      if (element.scrollHeight > element.clientHeight) element.scrollTop = 0;
      element = element.parentElement;
      index += 1;
    }
    return true;
  }, captureMarker);

  let expansionStyle: Awaited<ReturnType<Page['addStyleTag']>> | undefined;
  try {
    if (expandMain) {
      expansionStyle = await page.addStyleTag({
        content: `
          [${captureMarker}] {
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            min-height: max-content !important;
          }
          [${captureMarker}="main"] {
            flex: 0 0 auto !important;
          }
        `,
      });
      await page.evaluate(async (marker) => {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        for (const element of document.querySelectorAll<HTMLElement>(`[${marker}]`)) {
          element.scrollTop = 0;
        }
        window.scrollTo(0, 0);
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        for (const element of document.querySelectorAll<HTMLElement>(`[${marker}]`)) {
          element.scrollTop = 0;
        }
        window.scrollTo(0, 0);
      }, captureMarker);
    }
    const hasOpenDialog = await page
      .locator('[role="dialog"], [role="alertdialog"]')
      .first()
      .isVisible();
    await page.screenshot({ path: filePath, fullPage: !hasOpenDialog });
  } finally {
    await expansionStyle?.evaluate((style) => style.parentNode?.removeChild(style));
    if (expandMain) {
      await page.locator(`[${captureMarker}]`).evaluateAll((elements) => {
        for (const element of elements) element.removeAttribute('data-e2e-full-page-capture');
      });
    }
  }

  await updateScreenshotIndex(screenshotDir, filename, description, testKey);

  return filePath;
}

export async function captureFinalTestScreenshot(
  page: Page,
  testInfo: { title: string; file: string; titlePath?: string[] },
): Promise<void> {
  const titlePath = testInfo.titlePath?.join(' / ') || testInfo.title;
  const identity = `${path.basename(testInfo.file)}::${titlePath}`;
  const caseId = titlePath.match(/\b([NABI]-\d{2})\b/)?.[1];
  const prefix = caseId ? `${caseId}_FINAL` : 'TEST_FINAL';
  const suffix = createHash('sha1').update(identity).digest('hex').slice(0, 8);
  await captureScreenshot(
    page,
    `${prefix}_${suffix}_${titlePath}`,
    `Final UI state for: ${titlePath}`,
    testInfo,
  );
}

export async function captureElementScreenshot(
  page: Page,
  selector: string,
  stepName: string
): Promise<string> {
  let screenFolder = 'Other';

  try {
    const info = test.info();
    screenFolder = getScreenFromFilePath(info.file);
  } catch {}

  const screenshotDir = path.join(TEST_RESULTS_ROOT, screenFolder, 'screenshots');
  ensureDir(screenshotDir);

  const step = sanitize(stepName);
  const filename = `element__${step}.png`;
  const filePath = path.join(screenshotDir, filename);

  const element = page.locator(selector);
  await element.screenshot({ path: filePath });

  return filePath;
}

export class EvidenceCollector {
  private steps: Array<{ name: string; path: string; timestamp: number }> = [];
  private page: Page;
  private testTitle: string;

  constructor(page: Page, testTitle: string) {
    this.page = page;
    this.testTitle = sanitize(testTitle);
  }

  async capture(stepName: string): Promise<void> {
    const filePath = await captureScreenshot(this.page, stepName);
    this.steps.push({ name: stepName, path: filePath, timestamp: Date.now() });
  }

  getSteps() {
    return [...this.steps];
  }

  getSummary(): string {
    return this.steps
      .map((s, i) => `  ${i + 1}. ${s.name} -> ${path.basename(s.path)}`)
      .join('\n');
  }
}
