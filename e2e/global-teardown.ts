import * as fs from 'fs';
import * as path from 'path';

const TEST_RESULTS_DIR = path.resolve(__dirname, 'test-results');
const PCL_PATH = path.resolve(__dirname, '../docs/screen/SignUp_LogIn/SignUp_Login_PCL.md');

const TITLE_MAP: Record<string, string> = {
  'should display register form with all fields': 'Navigate to `/register` — form displays all fields',
  'should have buyer selected by default': 'Buyer selected by default — license upload hidden',
  'should hide license upload for buyer role': 'Buyer selected by default — license upload hidden',
  'should register as buyer successfully': 'Buyer registration — fill all fields',
  'should show success message after registration': 'Buyer registration — fill all fields',
  'should show errors for empty form submission': 'Empty form submission — all required field errors shown',
  'should show error for invalid email format': 'Invalid email format — inline error displayed',
  'should show error for short password': 'Weak password — password requirements not met indicator',
  'should show error for password missing uppercase': 'Weak password — password requirements not met indicator',
  'should show error for password missing lowercase': 'Weak password — password requirements not met indicator',
  'should show error for password missing number': 'Weak password — password requirements not met indicator',
  'should show error for password missing special character': 'Weak password — password requirements not met indicator',
  'should show error for password mismatch': 'Password mismatch — confirm password error shown',
  'should show error when terms not checked': 'Create Account button disabled until form is valid',
  'should show error for duplicate email': 'Duplicate email',
  'should show license upload when merchant role selected': 'Select Merchant — shopName + license upload appear',
  'should show error for merchant without license': 'Merchant without license file — error shown',
  'should navigate to login page when clicking Already have an account': 'Navigation links',
  'should show weak indicator for short password': 'Weak password — password requirements not met indicator',
  'should show strong indicator for complex password': 'Weak password — password requirements not met indicator',
  'should toggle password visibility': 'Show/Hide password toggle works',
  'should toggle confirm password visibility': 'Show/Hide password toggle works',
  'should redirect to dashboard if already logged in': 'Access token stored after login',
  'should display login form with all fields': 'Navigate to `/login`',
  'should have correct page title': 'Navigate to `/login`',
  'should login as buyer and redirect to buyer dashboard': 'Login with valid buyer credentials',
  'should show toast notification on successful login': 'Login with valid buyer credentials',
  'should show error with invalid email': 'Wrong password',
  'should show error with invalid password': 'Wrong password',
  'should show validation error for empty email': 'Empty form submission',
  'should show validation error for empty password': 'Empty form submission',
  'should show validation error for invalid email format': 'Invalid email format',
  'should show validation error for short password': 'Short password',
  'should navigate to register page when clicking Create Account': 'Create one',
  'should navigate to forgot password page': 'Forgot password',
};

function removeDir(dirPath: string) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

function updatePCL() {
  const resultsPath = path.join(TEST_RESULTS_DIR, 'results.json');
  if (!fs.existsSync(resultsPath)) return;

  const data = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
  const results: { status: string; title: string }[] = [];

  function extractTests(suite: any) {
    if (suite.specs) {
      for (const spec of suite.specs) {
        for (const test of spec.tests) {
          for (const result of test.results) {
            results.push({ status: result.status, title: spec.title });
          }
        }
      }
    }
    if (suite.suites) {
      for (const child of suite.suites) {
        extractTests(child);
      }
    }
  }

  extractTests(data.suites?.[0] || data);

  let content = fs.readFileSync(PCL_PATH, 'utf-8');
  let updatedCount = 0;

  for (const result of results) {
    if (result.status !== 'passed') continue;

    const pclText = TITLE_MAP[result.title];
    if (!pclText) continue;

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
  console.log(`📋 PCL updated: ${updatedCount} tests marked as passed`);
}

export default function globalTeardown() {
  // Auto-update PCL checklist
  updatePCL();
}
