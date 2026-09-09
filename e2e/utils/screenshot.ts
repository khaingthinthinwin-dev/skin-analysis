import type { Page } from '@playwright/test';
import { test } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const SCREENSHOT_ROOT = path.resolve(__dirname, '../test-results');

const SCREEN_FOLDERS = [
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

function getScreenFromFilePath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  for (const screen of SCREEN_FOLDERS) {
    if (normalized.includes(`/tests/${screen}/`)) {
      return `${screen}_Screenshots`;
    }
  }
  return 'Other_Screenshots';
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 80);
}

export async function captureScreenshot(
  page: Page,
  stepName: string,
  testInfo?: { title: string; file: string }
): Promise<string> {
  let screenFolder = 'Other_Screenshots';

  try {
    const info = test.info();
    screenFolder = getScreenFromFilePath(info.file);
  } catch {
    if (testInfo?.file) {
      screenFolder = getScreenFromFilePath(testInfo.file);
    }
  }

  const screenshotDir = path.join(SCREENSHOT_ROOT, screenFolder);
  ensureDir(screenshotDir);

  const step = sanitize(stepName);
  const filename = `${step}.png`;
  const filePath = path.join(screenshotDir, filename);

  await page.screenshot({ path: filePath, fullPage: true });

  return filePath;
}

export async function captureElementScreenshot(
  page: Page,
  selector: string,
  stepName: string
): Promise<string> {
  let screenFolder = 'Other_Screenshots';

  try {
    const info = test.info();
    screenFolder = getScreenFromFilePath(info.file);
  } catch {}

  const screenshotDir = path.join(SCREENSHOT_ROOT, screenFolder);
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
