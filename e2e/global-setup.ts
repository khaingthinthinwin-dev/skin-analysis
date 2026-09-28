import * as fs from 'fs';
import * as path from 'path';
import { SCREEN_FOLDERS, getScreenFromFilePath } from './utils/screenshot';

const TEST_RESULTS_DIR = path.resolve(__dirname, 'test-results');

function removeDir(dirPath: string) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

function modulesFromArgs(): Set<string> {
  const args = process.argv.slice(2);
  const modules = new Set<string>();

  for (const arg of args) {
    if (arg.startsWith('-')) continue;
    const normalized = arg.replace(/\\/g, '/');
    for (const screen of SCREEN_FOLDERS) {
      if (normalized.includes(screen)) {
        modules.add(screen);
      }
    }
    const viaPath = getScreenFromFilePath(normalized);
    if (viaPath && viaPath !== 'Other') {
      modules.add(viaPath);
    }
  }

  return modules;
}

export default function globalSetup() {
  fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true });

  const fromArgs = modulesFromArgs();
  // Full run (no module args): clear every module folder so stale screenshots never linger
  const screensToClear = fromArgs.size > 0 ? fromArgs : new Set(SCREEN_FOLDERS);

  for (const screen of screensToClear) {
    removeDir(path.join(TEST_RESULTS_DIR, screen));
  }
}
