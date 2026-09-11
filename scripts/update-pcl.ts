import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PCL_PATH = path.join(__dirname, '../docs/screen/SignUp_LogIn/SignUp_Login_PCL.md');
const RESULTS_PATH = path.join(__dirname, '../e2e/test-results/results.json');

interface TestResult {
  status: 'passed' | 'failed' | 'timedOut' | 'skipped';
  title: string;
  suite?: string;
}

function loadJsonReport(): TestResult[] {
  if (!fs.existsSync(RESULTS_PATH)) {
    console.error('❌ results.json not found. Run tests first.');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf-8'));
  const results: TestResult[] = [];

  function extractTests(suite: any, parentTitle = '') {
    if (suite.specs) {
      for (const spec of suite.specs) {
        for (const test of spec.tests) {
          for (const result of test.results) {
            results.push({
              status: result.status,
              title: spec.title,
              suite: parentTitle,
            });
          }
        }
      }
    }
    if (suite.suites) {
      for (const child of suite.suites) {
        extractTests(child, suite.title || parentTitle);
      }
    }
  }

  extractTests(data.suites?.[0] || data);
  return results;
}

function mapTestTitleToPCL(pclContent: string, testTitle: string): string | null {
  const titleMap: Record<string, string> = {
    // Register tests
    'should display register form with all fields': 'Navigate to `/register` — form displays all fields',
    'should have buyer selected by default': 'Buyer selected by default — license upload hidden',
    'should hide license upload for buyer role': 'Buyer selected by default — license upload hidden',
    'should register as buyer successfully': 'Buyer registration — fill all fields → click Create Account → redirects to `/login`',
    'should show success message after registration': 'Buyer registration — fill all fields → click Create Account → redirects to `/login`',
    'should show errors for empty form submission': 'Empty form submission — all required field errors shown',
    'should show error for invalid email format': 'Invalid email format — inline error displayed',
    'should show error for short password': 'Weak password — password requirements not met indicator',
    'should show error for password missing uppercase': 'Weak password — password requirements not met indicator',
    'should show error for password missing lowercase': 'Weak password — password requirements not met indicator',
    'should show error for password missing number': 'Weak password — password requirements not met indicator',
    'should show error for password missing special character': 'Weak password — password requirements not met indicator',
    'should show error for password mismatch': 'Password mismatch — confirm password error shown',
    'should show error when terms not checked': 'Create Account button disabled until form is valid',
    'should show error for duplicate email': 'Duplicate email — "Email already registered" error shown',
    'should show license upload when merchant role selected': 'Select Merchant — shopName + license upload appear',
    'should show error for merchant without license': 'Merchant without license file — error shown',
    'should navigate to login page when clicking Already have an account': 'Navigation links: "Already have an account? Sign in" → `/login`',
    'should show weak indicator for short password': 'Weak password — password requirements not met indicator',
    'should show strong indicator for complex password': 'Weak password — password requirements not met indicator',
    'should toggle password visibility': 'Show/Hide password toggle works for all password fields',
    'should toggle confirm password visibility': 'Show/Hide password toggle works for all password fields',
    'should redirect to dashboard if already logged in': 'Access token stored after login',

    // Login tests
    'should display login form with all fields': 'Navigate to `/login` — email input auto-focused',
    'should have correct page title': 'Navigate to `/login` — email input auto-focused',
    'should login as buyer and redirect to buyer dashboard': 'Login with valid buyer credentials → redirects to `/buyer` dashboard',
    'should show toast notification on successful login': 'Login with valid buyer credentials → redirects to `/buyer` dashboard',
    'should show error with invalid email': 'Wrong password — "Invalid email or password" alert shown',
    'should show error with invalid password': 'Wrong password — "Invalid email or password" alert shown',
    'should show validation error for empty email': 'Empty form submission — errors shown',
    'should show validation error for empty password': 'Empty form submission — errors shown',
    'should show validation error for invalid email format': 'Invalid email format — inline error',
    'should show validation error for short password': 'Short password (< 8 chars) — inline error',
    'should navigate to register page when clicking Create Account': '"Don\'t have an account? Create one" → `/register`',
    'should navigate to forgot password page': '"Forgot password?" → `/forgot-password`',
  };

  return titleMap[testTitle] || null;
}

function updatePCL(results: TestResult[]): void {
  let content = fs.readFileSync(PCL_PATH, 'utf-8');
  let updatedCount = 0;

  for (const result of results) {
    if (result.status !== 'passed') continue;

    const pclText = mapTestTitleToPCL(content, result.title);
    if (!pclText) continue;

    // Find the line with this text and mark as done
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(pclText) && lines[i].includes('- [ ]')) {
        lines[i] = lines[i].replace('- [ ]', '- [x]');
        updatedCount++;
        break;
      }
    }
    content = lines.join('\n');
  }

  fs.writeFileSync(PCL_PATH, content);
  console.log(`✅ PCL updated: ${updatedCount} tests marked as passed`);
}

// Main
const results = loadJsonReport();
console.log(`📊 Found ${results.length} test results`);

const passed = results.filter(r => r.status === 'passed').length;
const failed = results.filter(r => r.status === 'failed').length;
console.log(`   ✅ Passed: ${passed}`);
console.log(`   ❌ Failed: ${failed}`);

updatePCL(results);
