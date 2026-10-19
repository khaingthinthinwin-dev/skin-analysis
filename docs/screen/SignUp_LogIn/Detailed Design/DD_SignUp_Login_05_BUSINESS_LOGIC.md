# DD SignUp/Login 05 — Business Logic

> **Doc ID:** SKM-DD-AUTH-05 | **Version:** 2.2 | **Status:** Aligned to current implementation
> **Last Updated:** 2026-10-15

---

## 1. Scope and Sources

This document records behavior present in the current NestJS auth service and frontend auth flows. It does not specify unimplemented rate limits, token cookies, atomic transactions, or guarantees that are not present in those sources.

- Backend: `backend/src/modules/auth/auth.service.ts`, `auth.controller.ts`, and `dto/`
- Frontend: `frontend/src/pages/auth/`, `frontend/src/providers/AuthProvider.tsx`, and `frontend/src/lib/api-client.ts`

---

## 2. Registration

1. `POST /auth/register` checks for an existing user with the submitted email and returns conflict if one exists.
2. The backend DTO accepts email, name, password, and optional buyer/merchant role. Role defaults to buyer in the service.
3. The controller receives a multipart file named `license`; for merchants it is required, and for buyers it is rejected if supplied. Files must be PDF, named `license.pdf` case-insensitively, and no larger than 10 MB.
4. Password is hashed with `argon2.hash()` and the user is created.
5. For merchant role, the service uses `name` as both the account name and `shopName` when creating the merchant record; a provided license is saved and the license status starts as pending. The service also attempts to notify administrators.
6. For buyer role, the service triggers the first skin-analysis reminder.
7. The service generates and stores tokens and returns user and token data.
8. The frontend validates additional client-side requirements (strong password, matching confirmation, license constraints, and terms agreement). It shows a success toast and navigates to Login after the request resolves; the frontend register provider does not persist the returned tokens.

The existing implementation does not have a separate shop-name field, and the service does not atomically wrap user creation, merchant creation, and file persistence in a single transaction.

---

## 3. Login and Session Handling

### 3.1 Login

1. The frontend validates email and requires a password of at least 8 characters.
2. The backend looks up the email and verifies the password using Argon2.
3. A missing user or incorrect password returns 401 `Invalid credentials`.
4. On success, the backend creates tokens and stores a hashed refresh-token record. The response includes user, access token, and refresh token.
5. The frontend stores both tokens in local storage and sets the user in `AuthProvider`.
6. Login navigation uses a supplied `redirect` query value or the role-specific dashboard route.

The current login service code does not reject inactive accounts explicitly, set an HTTP-only refresh-token cookie, or implement login rate limiting in the inspected method.

### 3.2 Auth initialization and refresh

- On initialization, `AuthProvider` reads `accessToken` from local storage and calls `/auth/verify`. If verification fails, both locally stored tokens are removed.
- The API client attaches the access token as a bearer header.
- On a 401 response, the API client tries `/auth/refresh` if a refresh token is in local storage. A successful response replaces both stored tokens and retries the original request. A failed refresh clears local tokens and navigates to `/login`.
- Backend refresh validates the refresh JWT, checks revocation, finds an unrevoked unexpired refresh-token record, revokes that record, and stores a replacement token record. Failures are returned as 401.

### 3.3 Logout

The backend logout endpoint uses the bearer access token to blacklist it for its remaining lifetime when it can verify the token and revokes all refresh-token records for the user. The current `AuthProvider.logout()` does not call that endpoint; it clears local storage, current user state, and the TanStack Query cache.

---

## 4. Password Recovery

### 4.1 Request code

1. The frontend validates the email and calls `POST /auth/forgot-password`.
2. The backend looks up the account. If none is found, it returns 404 `No account found with this email address`.
3. For an existing user, prior unused password-reset records are marked used. The service generates a six-digit code, hashes it with SHA-256, and stores the hash with a 10-minute expiry.
4. The service attempts to email the code. Email delivery exceptions are logged; the request still returns the success message.
5. On an API success response, the frontend navigates to Verify Code and stores the email in router location state.

The current implementation's unknown-email response reveals that the account does not exist; it does not provide the email-enumeration protection described in older design text. No backend rate limiter is applied in the inspected auth controller/service flow. The UI's resend button imposes a 60-second client-side cooldown after a successful resend.

### 4.2 Verify code

1. Verify Code requires an email from router location state; without it, the page navigates back to Forgot Password.
2. The page validates that a code is present and exactly six characters.
3. The backend finds the user by email, hashes the submitted code with SHA-256, and checks for a matching unused record whose expiry is in the future.
4. A valid code returns a success message but is not marked used at this step.
5. The frontend passes email and code to Reset Password in router location state.

### 4.3 Reset password

1. Reset Password requires email and code in router location state; if either is missing, it navigates to Forgot Password.
2. The frontend validates password length (8–128), uppercase, lowercase, digit, special character from `@$!%*?&`, and confirmation match.
3. The API request contains email, code, and password; confirmation is client-only.
4. The backend verifies the email/code against an unused, unexpired code record, hashes the new password with Argon2, updates the user password, marks the matched code used, and invalidates the user's other unused code records.
5. The frontend shows a success toast and replaces the form with a success view linking to Login.

---

## 5. Validation Summary

| Concern | Frontend | Backend |
|---|---|---|
| Registration name | 2–200 characters | 2–100 characters |
| Registration email | Required, valid, max 255 | Valid email |
| Login password | Required, min 8 | Min 8 |
| Registration/reset password | 8–128; uppercase, lowercase, digit, special | Registration DTO requires min 8 only; reset DTO additionally requires uppercase, lowercase, digit, special |
| Role | Buyer or merchant | Buyer or merchant; registration defaults to buyer |
| Merchant license | Required for merchant; PDF, max 10 MB, named `license.pdf` | Controller requires merchant file, rejects buyer file, checks PDF/name, and limits file size to 10 MB |
| Recovery code | Required, exactly 6 characters | Email plus exactly 6-character code |
| Password confirmation | Required and must match | Not sent to backend |
| Terms agreement | Required by registration form | Not sent to backend |

The difference between client and server validation limits is intentional to document current behavior, not to define a proposed contract.

---

## 6. Token and Persistence Notes

- Access and refresh tokens are generated by `AuthService.generateTokens()` using configured JWT signing. The refresh-token expiry is configured from `jwt.refreshExpiration` with a `7d` fallback.
- The service hashes refresh-token strings with Argon2 before storing them and stores an absolute-limit timestamp 90 days from creation.
- The payload visibly constructed in the service contains `sub`, `email`, and `role`; other JWT claims may be supplied by JWT configuration.
- Password recovery stores SHA-256 hashes of six-digit codes with a 10-minute expiry.
- Password hashes are produced with the Argon2 package. The inspected service does not pass the fixed Argon2id tuning parameters previously stated in this document.

---

## 7. Cross-References

| Related document | Purpose |
|---|---|
| [DD SignUp/Login 02](./DD_SignUp_Login_02_FRONTEND_Page.md) | Page behavior |
| [DD SignUp/Login 03](./DD_SignUp_Login_03_API_ENDPOINTS.md) | Endpoint contracts |
| [DD SignUp/Login 04](./DD_SignUp_Login_04_DTOS_AND_TYPES.md) | Field definitions |
| [DD SignUp/Login 06](./DD_SignUp_Login_06__TEST_SPEC.md) | Test coverage |
