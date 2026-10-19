# DD SignUp/Login 06 — Test Specification

> **Doc ID:** SKM-DD-AUTH-06 | **Version:** 2.2 | **Status:** Aligned to current test suites
> **Last Updated:** 2026-10-15

---

## 1. Overview

This document inventories the current auth-related automated test suites and summarizes the behaviors they cover. It does not assert unverified results or claim component test files that are not present in the repository.

---

## 2. Backend Tests

Current Jest test files:

- `backend/src/modules/auth/auth.service.spec.ts`
- `backend/src/modules/auth/auth.controller.spec.ts`
- `backend/src/modules/auth/auth.module.spec.ts`
- `backend/src/common/guards/jwt-auth.guard.spec.ts`

The service/controller suites cover registration and login outcomes, token refresh, logout, token verification, password recovery, verification codes, password reset, and administrative auth operations as defined by the current implementation. Keep expected DTO fields, status codes, and error messages aligned with the actual controller/service/DTO code, including the six-digit recovery-code flow.

---

## 3. Playwright E2E Tests

Current SignUp/Login Playwright files:

- `e2e/tests/SignUp_LogIn/auth.spec.ts`
- `e2e/tests/SignUp_LogIn/login.spec.ts`
- `e2e/tests/SignUp_LogIn/register.spec.ts`
- `e2e/tests/SignUp_LogIn/forgot-password.spec.ts`
- `e2e/tests/SignUp_LogIn/reset-password.spec.ts`
- `e2e/tests/SignUp_LogIn/api-auth.spec.ts`

### 3.1 UI scenarios

The suites include coverage for:

- Login form rendering, successful login, input validation, invalid-credential feedback, role-based redirect, already-authenticated redirect, and navigation to registration or password recovery.
- Buyer and merchant registration, role-dependent license upload, license constraints, terms agreement, password complexity and confirmation, duplicate-email handling, and authenticated-user redirect.
- Forgot Password form validation, submission feedback, navigation back to Login, and language switching.
- Reset Password page entry conditions, password validation/confirmation, submission, invalid response feedback, navigation, and language switching.
- Auth-page language switching, responsive layout, password visibility, protected-route behavior, and logout/session behavior.

### 3.2 API scenarios

`api-auth.spec.ts` covers auth API contracts including duplicate registration, invalid login credentials, refresh, logout, token verification, forgot/reset password, standard error response format, buyer registration token response, and language-header behavior. Expected response content must match current server behavior; the frontend's language setting does not itself establish that backend error messages are localized.

### 3.3 Recovery-flow expectations

- Forgot Password succeeds by navigating to Verification Code with the email in router location state.
- Verification Code requires a six-character value and an email state value.
- Successful verification passes email and code to Reset Password through router state.
- Reset Password opened without the required state redirects to `/forgot-password`; it does not accept a `?token=` URL.
- Reset request body includes email, code, and password; it does not include confirmation.

---

## 4. Coverage Notes

- No standalone frontend page/component test files were found for the five auth screens. `frontend/src/providers/AuthProvider.test.tsx` covers the auth provider; the Playwright UI tests are the current documented browser-level page coverage.
- This document does not prescribe numeric coverage thresholds; none are treated as verified requirements here.
- Verify any live-service, seeded-account, or environment prerequisites in the E2E fixtures before running the suite.

---

## 5. Cross-References

| Related document | Purpose |
|---|---|
| [DD SignUp/Login 01](./DD_SignUp_Login_01_MODULE_OVERVIEW.md) | Module scope and flows |
| [DD SignUp/Login 02](./DD_SignUp_Login_02_FRONTEND_Page.md) | UI details |
| [DD SignUp/Login 03](./DD_SignUp_Login_03_API_ENDPOINTS.md) | API contracts |
| [DD SignUp/Login 05](./DD_SignUp_Login_05_BUSINESS_LOGIC.md) | Business rules under test |
