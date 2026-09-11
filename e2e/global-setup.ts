import * as fs from 'fs';
import * as path from 'path';

const TEST_RESULTS_DIR = path.resolve(__dirname, 'test-results');

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

function getScreenFromTestPath(testPath: string): string | null {
  const normalized = testPath.replace(/\\/g, '/');
  for (const screen of SCREEN_FOLDERS) {
    if (normalized.includes(`tests/${screen}/`) || normalized.includes(`tests/${screen}`)) {
      return screen;
    }
  }
  return null;
}

function getTestPathsFromArgs(): string[] {
  const args = process.argv.slice(2);
  return args.filter(arg => {
    if (arg.startsWith('-')) return false;
    const normalized = arg.replace(/\\/g, '/');
    return normalized.startsWith('tests/') || normalized.endsWith('.spec.ts');
  });
}

function removeDir(dirPath: string) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

export default function globalSetup() {
  fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true });

  const testPaths = getTestPathsFromArgs();
  const screensToClear = new Set<string>();

  for (const testPath of testPaths) {
    const screen = getScreenFromTestPath(testPath);
    if (screen) screensToClear.add(screen);
  }

  if (screensToClear.size === 0) return;

  if (fs.existsSync(TEST_RESULTS_DIR)) {
    const entries = fs.readdirSync(TEST_RESULTS_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const shouldClear = [...screensToClear].some(
        screen => entry.name === screen || entry.name === `${screen}_Screenshots`
      );
      if (shouldClear) {
        removeDir(path.join(TEST_RESULTS_DIR, entry.name));
      }
    }
  }
}
