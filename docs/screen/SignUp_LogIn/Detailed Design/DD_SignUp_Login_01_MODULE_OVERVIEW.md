# DD SignUp/Login 01 — Module Overview

> **Doc ID:** SKM-DD-AUTH-01 | **Version:** 2.2 | **Status:** Aligned to current implementation
> **Last Updated:** 2026-10-15

---

## 1. Module Overview

The Authentication module provides separate frontend pages for account login, registration, and password recovery. The password recovery path uses an emailed six-digit verification code before the user can reset a password.

The frontend is implemented with React, React Router, React Hook Form, Zod, and `react-i18next`. The auth pages call the shared `authService`; authenticated-user state is managed by `AuthProvider`. The backend implementation is in the NestJS auth module.

---

## 2. Supported User Flows

| ID | Flow | Implemented behavior |
|---|---|---|
| UC-AUTH-01 | Register | Buyer or merchant submits name, email, password, role, terms agreement, and (for merchants) a business-license PDF. The UI shows success and navigates to Login. |
| UC-AUTH-02 | Login | User submits email and password. On success, the auth provider stores the access and refresh tokens and sets the user in application state. |
| UC-AUTH-03 | Restore authenticated user | On provider initialization, an access token in local storage is verified with `/auth/verify`; an invalid token causes stored tokens to be removed. |
| UC-AUTH-04 | Refresh tokens | The API client attempts `/auth/refresh` after a 401 when a stored refresh token is available. |
| UC-AUTH-05 | Logout | The auth provider clears local tokens, user state, and the query cache. The current provider implementation does not call the backend logout endpoint. |
| UC-AUTH-06 | Request recovery code | User submits an email; the backend creates and emails a six-digit verification code for an existing account. |
| UC-AUTH-07 | Verify recovery code | User submits the email and six-character code. On success, the frontend passes both values to Reset Password through router location state. |
| UC-AUTH-08 | Reset password | User submits a new password with the email and code. A valid code is consumed after password update. |

---

## 3. Frontend Routes and Components

| Page | Source | Route |
|---|---|---|
| Login | `frontend/src/pages/auth/Login.tsx` | `/login` |
| Register | `frontend/src/pages/auth/Register.tsx` | `/register` |
| Forgot Password | `frontend/src/pages/auth/ForgotPassword.tsx` | `/forgot-password` |
| Verification Code | `frontend/src/pages/auth/VerifyCode.tsx` | `/verify-code` |
| Reset Password | `frontend/src/pages/auth/ResetPassword.tsx` | `/reset-password` |

Each route is wrapped by `frontend/src/layouts/AuthLayout.tsx`. Login, Register, and the recovery pages are separate routes, not tabs on a combined form.

### Password-recovery navigation

```text
Login -> Forgot Password -> Verification Code -> Reset Password -> Login
```

Forgot Password passes the email in router location state. Verify Code requires that email and passes email plus code to Reset Password. Verify Code and Reset Password redirect to `/forgot-password` when required state is missing. Reset Password does not read a URL token or query parameter.

---

## 4. Authentication State and Token Storage

- `AuthProvider` stores `accessToken` and `refreshToken` in `localStorage` after successful login.
- The frontend API client attaches the access token as a bearer authorization header when present.
- When a request receives HTTP 401 and a refresh token is stored, the API client attempts `/auth/refresh`, saves the returned tokens, and retries the original request. If refresh fails, it removes stored tokens and redirects to `/login`.
- Provider initialization verifies an existing access token through `/auth/verify`.
- `AuthProvider.logout()` clears local storage, in-memory user state, and the TanStack Query cache. It does not invoke `authService.logout()` in the current implementation.
- Successful login navigation is governed by the Login page's `redirect` query parameter or the dashboard route selected for the user's role.

These are descriptions of the current code, not a claim that local storage is the recommended secure token-storage design.

---

## 5. Auth API Endpoints

The frontend API client uses an `/api/v1` base URL and calls the following auth endpoints:

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/auth/register` | Create buyer or merchant account; multipart form supports a license file. |
| `POST` | `/auth/login` | Authenticate and return user and token data. |
| `POST` | `/auth/refresh` | Exchange a refresh token supplied in the request body. |
| `POST` | `/auth/logout` | Backend logout endpoint; not called by the current `AuthProvider.logout()`. |
| `GET` | `/auth/verify` | Verify current access token and retrieve user data. |
| `POST` | `/auth/forgot-password` | Request an emailed recovery code. |
| `POST` | `/auth/verify-code` | Verify email and recovery code. |
| `POST` | `/auth/reset-password` | Reset password with email, code, and new password. |

---

## 6. Implementation References

| Layer | Source files |
|---|---|
| Frontend pages | `frontend/src/pages/auth/Login.tsx`, `Register.tsx`, `ForgotPassword.tsx`, `VerifyCode.tsx`, `ResetPassword.tsx` |
| Frontend routing/layout | `frontend/src/app/routes.tsx`, `frontend/src/layouts/AuthLayout.tsx` |
| Frontend validation | `frontend/src/schemas/auth.schema.ts` |
| Frontend API and state | `frontend/src/services/auth.service.ts`, `frontend/src/providers/AuthProvider.tsx`, `frontend/src/lib/api-client.ts` |
| Backend controller/service | `backend/src/modules/auth/auth.controller.ts`, `backend/src/modules/auth/auth.service.ts` |
| Backend request validation | `backend/src/modules/auth/dto/` |

---

## 7. Cross-References

| Related document | Purpose |
|---|---|
| [DD SignUp/Login 02](./DD_SignUp_Login_02_FRONTEND_Page.md) | Frontend page behavior |
| [DD SignUp/Login 03](./DD_SignUp_Login_03_API_ENDPOINTS.md) | API endpoint contracts |
| [DD SignUp/Login 04](./DD_SignUp_Login_04_DTOS_AND_TYPES.md) | Frontend and backend types |
| [DD SignUp/Login 05](./DD_SignUp_Login_05_BUSINESS_LOGIC.md) | Current business logic |
| [DD SignUp/Login 06](./DD_SignUp_Login_06__TEST_SPEC.md) | Test inventory and scenarios |
