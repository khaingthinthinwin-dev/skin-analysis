import * as fs from 'fs';
import * as path from 'path';
import { SCREEN_FOLDERS, getScreenFromFilePath } from './utils/screenshot';

const TEST_RESULTS_DIR = path.resolve(__dirname, 'test-results');

function getScreenFromTestPath(testPath: string): string | null {
  return getScreenFromFilePath(testPath);
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
    if (screen && screen !== 'Other') {
      screensToClear.add(screen);
    }
  }

  // If specific modules were specified, only clear those module folders
  for (const screen of screensToClear) {
    const moduleDir = path.join(TEST_RESULTS_DIR, screen);
    if (fs.existsSync(moduleDir)) {
      removeDir(moduleDir);
    }
  }
}
