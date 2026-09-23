import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';
import { SCREEN_FOLDERS, getScreenFromFilePath } from './screenshot';

const TEST_RESULTS_DIR = path.resolve(__dirname, '../test-results');

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export default class ModularReporter implements Reporter {
  private testMap: Record<
    string,
    Array<{
      title: string;
      file: string;
      status: string;
      duration: number;
      error?: string;
    }>
  > = {};

  onTestEnd(test: TestCase, result: TestResult) {
    const filePath = test.location.file;
    const moduleName = getScreenFromFilePath(filePath);

    if (!this.testMap[moduleName]) {
      this.testMap[moduleName] = [];
    }

    this.testMap[moduleName].push({
      title: test.title,
      file: filePath,
      status: result.status,
      duration: result.duration,
      error: result.error?.message,
    });
  }

  async onEnd(result: FullResult) {
    ensureDir(TEST_RESULTS_DIR);

    // 1. Write per-module results.json
    for (const [moduleName, tests] of Object.entries(this.testMap)) {
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
  }
}
