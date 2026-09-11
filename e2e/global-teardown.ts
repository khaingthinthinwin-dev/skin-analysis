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

function getScreenFolder(dirName: string): string | null {
  for (const screen of SCREEN_FOLDERS) {
    if (dirName.toLowerCase().startsWith(screen.toLowerCase() + '-')) {
      return screen;
    }
  }
  return null;
}

export default function globalTeardown() {
  if (!fs.existsSync(TEST_RESULTS_DIR)) return;

  const entries = fs.readdirSync(TEST_RESULTS_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name === 'screenshots') continue;

    const screenFolder = getScreenFolder(entry.name);
    if (!screenFolder) continue;

    const targetDir = path.join(TEST_RESULTS_DIR, screenFolder);
    fs.mkdirSync(targetDir, { recursive: true });

    const src = path.join(TEST_RESULTS_DIR, entry.name);
    const dest = path.join(targetDir, entry.name);

    fs.renameSync(src, dest);
  }
}
