# DD_AUTH_06 — Test Specification

> **Doc ID:** SKM-DD-AUTH-06 | **Version:** 1.0 | **Status:** Released  
> **Last Updated:** 2026-08-10

---

## 1. Overview

This document defines the testing strategy for the Authentication Module, covering Unit Tests, Component Tests, and End-to-End (E2E) Scenarios.

---

## 2. Backend Unit Tests (`src/modules/auth/tests/`)

### 2.1 `auth.service.spec.ts`

Mock dependencies: `PrismaService`, `RedisService`, `JwtService`, `ConfigService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **register** | Valid data, no license | Creates user, hashes password, returns user DTO |
| **register** | Valid data with merchant role and license | Creates user, uploads license, returns user with licenseUrl |
| **register** | Email already exists | Throws `ConflictException` (409) |
| **register** | Invalid license file type (not PDF) | Throws `BadRequestException` (415) |
| **register** | License file named incorrectly | Throws `BadRequestException` (400) |
| **register** | License file exceeds 10MB | Throws `PayloadTooLargeException` (413) |
| **login** | Valid credentials | Returns accessToken and user DTO, sets refresh cookie |
| **login** | Invalid email | Throws `UnauthorizedException` (401) with generic message |
| **login** | Invalid password | Throws `UnauthorizedException` (401) with generic message |
| **login** | Account deactivated | Throws `ForbiddenException` (403) |
| **login** | Rate limit exceeded | Throws `TooManyRequestsException` (429) |
| **refreshToken** | Valid refresh token | Returns new accessToken, rotates refresh token |
| **refreshToken** | Refresh token expired | Throws `UnauthorizedException` (401) |
| **refreshToken** | Refresh token revoked | Throws `UnauthorizedException` (401) |
| **refreshToken** | Token reuse detected | Revokes all user tokens, throws `UnauthorizedException` (401) |
| **refreshToken** | Absolute limit reached (90 days) | Throws `UnauthorizedException` (401) |
| **logout** | Valid session | Blacklists token in Redis, revokes refresh tokens |
| **verifyToken** | Valid token, active user | Returns user profile data |
| **verifyToken** | Valid token, inactive user | Throws `ForbiddenException` (403) |
| **verifyToken** | Invalid token | Throws `UnauthorizedException` (401) |

### 2.2 `auth.controller.spec.ts`

Mock dependencies: `AuthService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **POST /register** | Valid payload | Calls `service.register`, returns 201 |
| **POST /register** | Email exists | Returns 409 Conflict |
| **POST /login** | Valid credentials | Calls `service.login`, returns 200 with accessToken |
| **POST /login** | Invalid credentials | Returns 401 Unauthorized |
| **POST /refresh** | Valid refresh cookie | Calls `service.refreshToken`, returns 200 |
| **POST /refresh** | Missing refresh cookie | Returns 401 Unauthorized |
| **POST /logout** | Valid token | Calls `service.logout`, returns 204 |
| **GET /verify** | Valid token | Calls `service.verifyToken`, returns 200 with user |
| **GET /verify** | Invalid token | Returns 401 Unauthorized |

---

## 3. Frontend Component Tests

Using Vitest + React Testing Library.

### 3.1 `LoginForm.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Initial render | Displays email and password inputs, disabled submit button |
| Valid email input | Email field accepts valid format, no error shown |
| Invalid email input | Shows "Invalid email address" error below field |
| Empty password | Shows "Password is required" error on submit |
| Short password | Shows "Password must be at least 8 characters" error |
| Toggle password visibility | Clicking eye icon toggles input type between text/password |
| Successful login | Calls authService.login, redirects by role |
| Failed login | Shows "Invalid email or password" toast error |
| Loading state | Shows spinner on submit button during API call |
| Navigate to register | Clicking "Sign Up" link navigates to /register |

### 3.2 `RegisterForm.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Initial render | Displays all fields, Buyer selected by default, license hidden |
| Empty name | Shows "Name is required" error |
| Invalid email | Shows "Invalid email address" error |
| Weak password | Shows password strength indicator as "Weak" |
| Strong password | Shows password strength indicator as "Very Strong" with all checks green |
| Password mismatch | Shows "Passwords do not match" error on confirm field |
| Select Merchant role | License upload field appears |
| Select Buyer role | License upload field hidden |
| Valid license upload | Shows filename and remove button |
| Invalid license type | Shows "License must be a PDF file" error |
| License too large | Shows "License must not exceed 10MB" error |
| License wrong name | Shows "File must be named license.pdf" error |
| Terms not checked | Shows "You must agree to the Terms of Service" error |
| Successful registration | Shows success toast, redirects to /login |
| Duplicate email | Shows "Email already registered" toast error |
| Navigate to login | Clicking "Sign In" link navigates to /login |

### 3.3 `PasswordStrengthIndicator.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Empty password | Shows "Weak" with 0 requirements met |
| 8+ chars only | Shows "Fair" with 1 requirement met |
| + Uppercase | Shows "Fair" with 2 requirements met |
| + Lowercase | Shows "Strong" with 3 requirements met |
| + Number | Shows "Strong" with 4 requirements met |
| + Special char | Shows "Very Strong" with all 5 requirements met |

### 3.4 `LicenseUpload.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Initial render | Shows drag & drop zone with helper text |
| Drag PDF file | Shows filename and remove button |
| Click to upload | Opens file picker, accepts PDF only |
| Invalid file type | Shows error "License must be a PDF file" |
| File too large | Shows error "License must not exceed 10MB" |
| Wrong filename | Shows error "File must be named license.pdf" |
| Remove file | Clicking remove icon clears file, shows upload zone again |

---

## 4. End-to-End (E2E) Scenarios (Playwright)

| Scenario ID | Flow Description |
|-------------|------------------|
| **E2E-AUTH-01** | **Happy Path: Register and Login**<br>1. Navigate to /register.<br>2. Fill name, email, password, confirm password.<br>3. Select Buyer role.<br>4. Check terms checkbox.<br>5. Click "Create Account".<br>6. Verify success toast and redirect to /login.<br>7. Enter email and password.<br>8. Click "Sign In".<br>9. Verify redirect to home page (/). |
| **E2E-AUTH-02** | **Merchant Registration with License**<br>1. Navigate to /register.<br>2. Fill name, email, password, confirm password.<br>3. Select Merchant role.<br>4. Upload license.pdf file.<br>5. Check terms checkbox.<br>6. Click "Create Account".<br>7. Verify success toast and redirect to /login. |
| **E2E-AUTH-03** | **Login and Logout**<br>1. Navigate to /login.<br>2. Enter valid credentials.<br>3. Click "Sign In".<br>4. Verify redirect to home page.<br>5. Click user menu, select "Logout".<br>6. Verify redirect to /login.<br>7. Try to access / (protected route).<br>8. Verify redirect to /login. |
| **E2E-AUTH-04** | **Token Refresh**<br>1. Login with valid credentials.<br>2. Wait 15+ minutes (or mock token expiry).<br>3. Make API request.<br>4. Verify automatic token refresh occurs.<br>5. Verify request succeeds with new token. |
| **E2E-AUTH-05** | **Invalid Login Attempts**<br>1. Navigate to /login.<br>2. Enter wrong password 5 times.<br>3. Verify "Too many attempts" error message.<br>4. Verify login form is disabled for 5 minutes. |
| **E2E-AUTH-06** | **Registration Validation**<br>1. Navigate to /register.<br>2. Try to submit with empty fields.<br>3. Verify all validation errors appear.<br>4. Fill valid data except password mismatch.<br>5. Verify "Passwords do not match" error.<br>6. Fix password, submit.<br>7. Verify successful registration. |
| **E2E-AUTH-07** | **Duplicate Email Handling**<br>1. Register with email test@example.com.<br>2. Try to register again with same email.<br>3. Verify "Email already registered" error. |
| **E2E-AUTH-08** | **Language Toggle**<br>1. Navigate to /login.<br>2. Toggle language to Japanese.<br>3. Verify all labels change to Japanese.<br>4. Toggle language to Myanmar.<br>5. Verify all labels change to Myanmar.<br>6. Toggle back to English. |
| **E2E-AUTH-09** | **Theme Toggle**<br>1. Navigate to /login.<br>2. Toggle theme to dark mode.<br>3. Verify dark background colors applied.<br>4. Toggle theme to light mode.<br>5. Verify light background colors applied. |
| **E2E-AUTH-10** | **Responsive Layout**<br>1. Navigate to /login on desktop (1024px+).<br>2. Verify centered card layout.<br>3. Resize to tablet (768px).<br>4. Verify full-width card with padding.<br>5. Resize to mobile (< 768px).<br>6. Verify stacked layout. |

---

## 5. Test Coverage Requirements

| Category | Minimum Coverage |
|----------|-----------------|
| Backend Unit Tests | 90% |
| Frontend Component Tests | 85% |
| E2E Critical Paths | 100% |
| Integration Tests | 80% |

---

## 6. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_AUTH_05](./DD_SignUp_Login_05_BUSINESS_LOGIC.md) | Business logic tested by unit tests |
| [DD_AUTH_02](./DD_SignUp_Login_02_FRONTEND_Page.md) | Frontend components tested |
| [DD_AUTH_03](./DD_SignUp_Login_03_API_ENDPOINTS.md) | API endpoints tested |
| [DD_COMMON_04](../00_common/DD_COMMON_04_SHARED_VALIDATION.md) | Validation rules tested |
| [機能設計書_SignUp_Login](./機能設計書_SignUp_Login_New.md) | Functional requirements |
