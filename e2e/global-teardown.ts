import * as fs from 'fs';
import * as path from 'path';
import { SCREEN_FOLDERS, getScreenFromFilePath } from './utils/screenshot';

const TEST_RESULTS_DIR = path.resolve(__dirname, 'test-results');
const PLAYWRIGHT_REPORT_DIR = path.resolve(__dirname, 'playwright-report');

function removeDir(dirPath: string) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

interface TestItem {
  title: string;
  file: string;
  status: string;
  duration: number;
  errors?: any[];
}

function processTestResults() {
  const globalResultsFile = path.join(TEST_RESULTS_DIR, 'results.json');
  if (!fs.existsSync(globalResultsFile)) return;

  try {
    const rawData = JSON.parse(fs.readFileSync(globalResultsFile, 'utf-8'));
    const moduleTestsMap: Record<string, TestItem[]> = {};

    function collectTests(suite: any, currentFile: string = '') {
      const file = suite.file || currentFile;
      if (suite.specs) {
        for (const spec of suite.specs) {
          const specFile = spec.file || file;
          for (const test of spec.tests) {
            for (const result of test.results) {
              const moduleName = getScreenFromFilePath(specFile);
              if (!moduleTestsMap[moduleName]) {
                moduleTestsMap[moduleName] = [];
              }
              moduleTestsMap[moduleName].push({
                title: spec.title,
                file: specFile,
                status: result.status,
                duration: result.duration,
                errors: result.errors,
              });
            }
          }
        }
      }

      if (suite.suites) {
        for (const childSuite of suite.suites) {
          collectTests(childSuite, file);
        }
      }
    }

    if (rawData.suites) {
      for (const rootSuite of rawData.suites) {
        collectTests(rootSuite);
      }
    }

    // Write module results into test-results/<ModuleName>/results.json
    for (const [moduleName, tests] of Object.entries(moduleTestsMap)) {
      if (moduleName === 'Other') continue;

      const moduleDir = path.join(TEST_RESULTS_DIR, moduleName);
      ensureDir(moduleDir);

      const passed = tests.filter(t => t.status === 'passed').length;
      const failed = tests.filter(t => t.status === 'failed' || t.status === 'timedOut').length;
      const skipped = tests.filter(t => t.status === 'skipped').length;
      const totalDuration = tests.reduce((acc, t) => acc + (t.duration || 0), 0);

      const summary = {
        module: moduleName,
        timestamp: new Date().toISOString(),
        total: tests.length,
        passed,
        failed,
        skipped,
        durationMs: totalDuration,
        tests,
      };

      fs.writeFileSync(
        path.join(moduleDir, 'results.json'),
        JSON.stringify(summary, null, 2),
        'utf-8'
      );
    }
  } catch (err) {
    console.error('Error processing test results in globalTeardown:', err);
  }
}

export default function globalTeardown() {
  // 1. Process and organize results per module
  processTestResults();

  // 2. Prevent playwright-report directory from existing
  removeDir(PLAYWRIGHT_REPORT_DIR);
}
