# Program Checklist — E2E Testing: SignUp / LogIn

**Document ID:** SKM-PCL-AUTH-001
**Target Screen:** Sign-up / Login / Forgot Password / Reset Password
**Version:** 1.0
**Created:** 2026-09-08

---

## 1. Test Infrastructure Setup

### 1.1 Playwright (Frontend E2E)

- [ ] Install Playwright: `npm init playwright@latest` (in `frontend/`)
- [ ] Configure `playwright.config.ts`
  - [ ] Base URL: `http://localhost:5173` (Vite dev server)
  - [ ] API URL: `http://localhost:8080/api/v1` (NestJS backend)
  - [ ] Browsers: Chromium, Firefox, WebKit
  - [ ] Web server: auto-start `npm run dev` before tests
  - [ ] Retries: 1 (CI), 0 (local)
  - [ ] Screenshots on failure
  - [ ] HTML reporter
- [ ] Create `frontend/e2e/` directory structure:
  ```
  e2e/
  ├── fixtures/
  │   ├── test-users.ts       # Seed data
  │   └── auth.fixture.ts     # Custom fixtures (login-as, etc.)
  ├── auth/
  │   ├── register.spec.ts
  │   ├── login.spec.ts
  │   ├── forgot-password.spec.ts
  │   └── reset-password.spec.ts
  └── global-setup.ts         # DB seed before all tests
  ```
- [ ] Add npm scripts to `frontend/package.json`:
  - [ ] `"test:e2e": "npx playwright test"`
  - [ ] `"test:e2e:ui": "npx playwright test --ui"`
  - [ ] `"test:e2e:report": "npx playwright show-report"`

### 1.2 Backend API E2E (Jest + Supertest)

- [ ] Verify `backend/test/jest-e2e.json` exists and is configured
- [ ] Create `backend/test/auth.e2e-spec.ts`
- [ ] Ensure test database is configured (separate from dev)
- [ ] Add npm script: `"test:e2e": "jest --config ./test/jest-e2e.json"`

### 1.3 Test Database

- [ ] Create test database: `cosmetics_finder_test`
- [ ] Add `DATABASE_URL` for test env in `.env.test`
- [ ] Seed test data before test suite runs
- [ ] Clean up (truncate) after each test suite

---

## 2. Test Data & Fixtures

### 2.1 Pre-seeded Test Users

| User | Email | Password | Role | Purpose |
|------|-------|----------|------|---------|
| buyer1 | `test-buyer@example.com` | `Test1234!` | buyer | Login tests |
| merchant1 | `test-merchant@example.com` | `Test1234!` | merchant | Merchant login |
| existing | `existing@example.com` | `Test1234!` | buyer | Duplicate email test |

### 2.2 Test Data for Registration

| Scenario | Name | Email | Password | Role | License |
|----------|------|-------|----------|------|---------|
| New buyer | `New Buyer` | `new-buyer-{timestamp}@test.com` | `Secure123!` | buyer | — |
| New merchant | `New Merchant` | `new-merchant-{timestamp}@test.com` | `Secure123!` | merchant | `license.pdf` |

### 2.3 Playwright Custom Fixtures

```typescript
// fixtures/auth.fixture.ts
// - loginAs(email, password): Logs in and returns page with auth state
// - authenticatedPage: Page already logged in as buyer
// - merchantPage: Page already logged in as merchant
```

---

## 3. Backend API E2E Tests

**File:** `backend/test/auth.e2e-spec.ts`

### 3.1 Register Endpoint

- [ ] `POST /api/v1/auth/register` — Should create buyer (201)
- [ ] `POST /api/v1/auth/register` — Should create merchant with license (201)
- [ ] `POST /api/v1/auth/register` — Should return 409 for duplicate email
- [ ] `POST /api/v1/auth/register` — Should return 400 for invalid email
- [ ] `POST /api/v1/auth/register` — Should return 400 for weak password
- [ ] `POST /api/v1/auth/register` — Should return 400 for merchant without license
- [ ] `POST /api/v1/auth/register` — Should return 400 for merchant without shopName

### 3.2 Login Endpoint

- [ ] `POST /api/v1/auth/login` — Should return 200 with tokens
- [ ] `POST /api/v1/auth/login` — Should return 401 for wrong password
- [ ] `POST /api/v1/auth/login` — Should return 401 for non-existent email
- [ ] `POST /api/v1/auth/login` — Should return 400 for invalid email format

### 3.3 Token Refresh

- [ ] `POST /api/v1/auth/refresh` — Should return 200 with new access token
- [ ] `POST /api/v1/auth/refresh` — Should return 401 for expired refresh token
- [ ] `POST /api/v1/auth/refresh` — Should return 401 for revoked token

### 3.4 Logout

- [ ] `POST /api/v1/auth/logout` — Should return 204
- [ ] `POST /api/v1/auth/logout` — Should blacklist access token

### 3.5 Forgot Password

- [ ] `POST /api/v1/auth/forgot-password` — Should return 200 for existing email
- [ ] `POST /api/v1/auth/forgot-password` — Should return 200 for non-existent email (no leak)
- [ ] `POST /api/v1/auth/forgot-password` — Should create password_reset_token record

### 3.6 Verify Code

- [ ] `POST /api/v1/auth/verify-code` — Should return 200 for valid code
- [ ] `POST /api/v1/auth/verify-code` — Should return 400 for invalid code
- [ ] `POST /api/v1/auth/verify-code` — Should return 400 for expired code

### 3.7 Reset Password

- [ ] `POST /api/v1/auth/reset-password` — Should return 200 for valid code
- [ ] `POST /api/v1/auth/reset-password` — Should return 400 for invalid code
- [ ] `POST /api/v1/auth/reset-password` — Should return 400 for weak password
- [ ] `POST /api/v1/auth/reset-password` — Should mark token as used

---

## 4. Frontend E2E Tests — Registration

**File:** `frontend/e2e/auth/register.spec.ts`

### 4.1 Happy Path

- [ ] Navigate to `/register` — form displays all fields
- [ ] Buyer registration — fill all fields → click Create Account → redirects to `/login`
- [ ] Merchant registration — select Merchant → fill fields + upload license → redirects to `/login`
- [ ] After registration — new user can login with the same credentials

### 4.2 Form Validation

- [x] Empty form submission — all required field errors shown
- [x] Invalid email format — inline error displayed
- [ ] Weak password — password requirements not met indicator
- [ ] Password mismatch — confirm password error shown
- [ ] Short name (< 2 chars) — inline error displayed
- [ ] Merchant without shopName — error shown
- [ ] Merchant without license file — error shown

### 4.3 Error Handling

- [ ] Duplicate email — "Email already registered" error shown
- [ ] Network error — "Network error" toast displayed

### 4.4 UI Behavior

- [ ] Buyer selected by default — license upload hidden
- [ ] Select Merchant — shopName + license upload appear
- [ ] Switch back to Buyer — shopName + license upload disappear
- [x] Show/Hide password toggle works for all password fields
- [ ] Create Account button disabled until form is valid
- [ ] Loading spinner shown during submission
- [ ] Navigation links: "Already have an account? Sign in" → `/login`

---

## 5. Frontend E2E Tests — Login

**File:** `frontend/e2e/auth/login.spec.ts`

### 5.1 Happy Path

- [x] Navigate to `/login` — email input auto-focused
- [x] Login with valid buyer credentials → redirects to `/buyer` dashboard
- [ ] Login with valid merchant credentials → redirects to `/merchant` dashboard
- [x] Access token stored after login

### 5.2 Form Validation

- [x] Empty form submission — errors shown
- [ ] Invalid email format — inline error
- [x] Short password (< 8 chars) — inline error

### 5.3 Error Handling

- [x] Wrong password — "Invalid email or password" alert shown
- [ ] Non-existent email — same generic error (no email enumeration)
- [ ] Network error — toast displayed

### 5.4 UI Behavior

- [ ] Show/Hide password toggle works
- [ ] Log In button disabled until form valid
- [ ] Loading spinner during submission
- [x] "Don't have an account? Create one" → `/register`
- [x] "Forgot password?" → `/forgot-password`

---

## 6. Frontend E2E Tests — Forgot Password

**File:** `frontend/e2e/auth/forgot-password.spec.ts`

### 6.1 Happy Path

- [ ] Navigate to `/forgot-password` — email input auto-focused
- [ ] Submit valid email → success message displayed
- [ ] Form replaced with "If an account exists..." message
- [ ] "Back to Login" link → `/login`

### 6.2 Form Validation

- [ ] Empty email — error shown
- [ ] Invalid email format — inline error

### 6.3 Error Handling

- [ ] Network error — toast displayed

---

## 7. Frontend E2E Tests — Reset Password

**File:** `frontend/e2e/auth/reset-password.spec.ts`

### 7.1 Happy Path

- [ ] Navigate to `/reset-password` with valid token → form displays
- [ ] Submit matching strong passwords → success message shown
- [ ] "Back to Login" link → `/login`
- [ ] Login with new password → succeeds
- [ ] Login with old password → fails

### 7.2 Form Validation

- [ ] Empty passwords — errors shown
- [ ] Weak password — requirements not met
- [ ] Password mismatch — error shown

### 7.3 Error Handling

- [ ] Navigate without token → redirected to `/forgot-password`
- [ ] Submit with expired token → "Invalid or expired" error
- [ ] Submit with already-used token → error shown

---

## 8. Full Integration Flow Tests

**File:** `frontend/e2e/auth/full-flow.spec.ts`

### 8.1 Complete Registration → Login Flow

- [ ] Register as buyer → login → see buyer dashboard → logout → back to `/login`

### 8.2 Complete Password Reset Flow

- [ ] Login → logout → forgot password → (mock email) → verify code → reset password → login with new password

### 8.3 Session Persistence

- [ ] Login → refresh page → still authenticated (token refresh works)

### 8.4 Concurrent Sessions

- [ ] Login in Tab A → Login in Tab B → both tabs work independently

---

## 9. Cross-Cutting Concerns

### 9.1 Responsive Design

- [ ] Mobile viewport (375px) — form fills width, readable
- [ ] Tablet viewport (768px) — centered card, max-width 400px
- [ ] Desktop viewport (1280px) — centered card, comfortable spacing

### 9.2 Accessibility

- [ ] All form fields have associated labels (`htmlFor`/`id`)
- [ ] Error messages announced to screen readers (`aria-live`)
- [ ] Tab order follows visual flow
- [ ] Enter key submits forms
- [ ] Focus management on error

### 9.3 Internationalization

- [ ] Toggle EN → all labels in English
- [ ] Toggle JA → all labels in Japanese
- [ ] Toggle MY → all labels in Myanmar

---

## 10. Execution & CI

### 10.1 Local Execution

```bash
# Backend API E2E
cd backend && npm run test:e2e

# Frontend E2E
cd frontend && npm run test:e2e

# Frontend E2E with UI
cd frontend && npm run test:e2e:ui
```

### 10.2 CI Pipeline Steps

- [ ] Start test database
- [ ] Run Prisma migrations on test DB
- [ ] Seed test data
- [ ] Start backend (`npm run start:dev`)
- [ ] Start frontend (`npm run dev`)
- [ ] Wait for both servers ready
- [ ] Run Playwright tests
- [ ] Run Jest API E2E tests
- [ ] Upload Playwright report as artifact
- [ ] Cleanup test database

---

## 11. Coverage Summary

| Area | Test Cases | Status |
|------|-----------|--------|
| Backend API — Register | 7 | Pending |
| Backend API — Login | 4 | Pending |
| Backend API — Token Refresh | 3 | Pending |
| Backend API — Logout | 2 | Pending |
| Backend API — Forgot Password | 3 | Pending |
| Backend API — Verify Code | 3 | Pending |
| Backend API — Reset Password | 4 | Pending |
| Frontend — Register | 12 | Pending |
| Frontend — Login | 10 | Pending |
| Frontend — Forgot Password | 4 | Pending |
| Frontend — Reset Password | 7 | Pending |
| Frontend — Full Integration | 4 | Pending |
| Cross-Cutting | 8 | Pending |
| **TOTAL** | **71** | **0%** |
