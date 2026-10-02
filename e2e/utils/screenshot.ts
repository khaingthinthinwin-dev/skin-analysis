import type { Page } from '@playwright/test';
import { test } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

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

function saveScreenshotIndex(screenshotDir: string, index: ScreenshotIndex): void {
  const indexPath = path.join(screenshotDir, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
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

  await page.screenshot({ path: filePath, fullPage: true });

  const index = loadScreenshotIndex(screenshotDir);
  const existing = index[filename];
  const prev: ScreenshotIndexEntry =
    typeof existing === 'string' ? { description: existing } : existing || {};
  index[filename] = {
    ...prev,
    ...(description ? { description } : {}),
    ...(testKey ? { test: testKey } : {}),
  };
  saveScreenshotIndex(screenshotDir, index);

  return filePath;
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
