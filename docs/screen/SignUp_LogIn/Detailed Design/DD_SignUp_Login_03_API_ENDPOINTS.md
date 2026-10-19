# DD SignUp/Login 03 — API Endpoints

> **Doc ID:** SKM-DD-AUTH-03 | **Version:** 2.2 | **Status:** Aligned to current implementation
> **Last Updated:** 2026-10-15

---

## 1. Controller and Base URL

- **Controller:** `backend/src/modules/auth/auth.controller.ts`
- **Controller prefix:** `/auth`
- **Frontend API base URL:** `VITE_API_BASE_URL`, defaulting to `http://localhost:8080/api/v1`
- Public endpoints are marked `@Public()`. Protected endpoints use `JwtAuthGuard`; administrative and merchant endpoints additionally use role guards.
- Frontend service methods unwrap the API response from `response.data.data`.

POST status codes use NestJS defaults unless an endpoint explicitly overrides them; no explicit status override is present on the auth controller POST handlers described below.

---

## 2. Public Authentication Endpoints

### 2.1 `POST /auth/register`

Creates a buyer or merchant account.

- **Request content type:** `multipart/form-data`
- **Fields:** `email`, `name`, `password`, optional `role` (`buyer` or `merchant`, default `buyer`), optional `address`, optional `phone`, and optional file field `license`.
- `name` is the merchant shop name as well as the account name for a merchant; there is no separate `shopName` request field.
- A merchant must include a license file. A buyer must not include one.
- The controller accepts only a PDF named `license.pdf` (case-insensitive) with a maximum size of 10 MB.
- `address` and `phone` describe the shop and are stored on `shops` together with the `merchants` record created for a merchant. The register form requires both when Merchant is selected, but the backend DTO accepts them as optional (API callers may omit them) and ignores them for buyers.
- Backend DTO constraints: valid email; name length 2–100; password minimum 8; role restricted to buyer or merchant; address max 255 characters; phone max 20 characters matching `^\+?[0-9()\-\s]{7,20}$`.
- The frontend additionally requires password complexity, confirmation matching, and acceptance of the Terms of Service. Those client-only fields are not sent as backend DTO fields.
- **Success body from service:** user data plus `accessToken` and `refreshToken`.
- The Register page shows a success toast and navigates to `/login`; it does not set the returned tokens through `AuthProvider.register()`.
- **Errors visible in controller/service:** validation and invalid upload errors (400), duplicate email (409); upload size limit is 10 MB.

### 2.2 `POST /auth/login`

- **Request:** JSON `{ "email": "user@example.com", "password": "..." }`.
- **Validation:** valid email and password of at least 8 characters.
- **Success body from service:** `{ "user": ..., "accessToken": "...", "refreshToken": "..." }`.
- **Failure:** invalid email or password returns 401 with `Invalid credentials`.
- On success, the frontend auth provider stores both returned tokens in local storage and sets the current user.
- No refresh-token cookie is set by the auth controller implementation.

### 2.3 `POST /auth/refresh`

- **Request:** JSON `{ "refreshToken": "..." }`; the controller reads the token from the request DTO, not a cookie.
- **Success:** returns the newly generated access and refresh tokens.
- **Failure:** invalid or expired refresh-token validation is reported as 401.
- The frontend attempts this endpoint after a 401 only when a refresh token is available in local storage.

### 2.4 `POST /auth/logout`

- **Authentication:** `JwtAuthGuard`; bearer access token required.
- **Request body:** none.
- **Behavior:** backend blacklists the supplied access token when it can read a valid expiry and marks the user's refresh-token records revoked.
- **Response:** `{ "message": "Logged out successfully" }`.
- The current frontend `AuthProvider.logout()` clears local client state but does not call this endpoint.

### 2.5 `GET /auth/verify`

- **Authentication:** `JwtAuthGuard`; bearer access token required.
- **Success:** returns the current user's profile fields, including role, merchant/license fields when present, active-state fields, and creation time.
- **Failure:** invalid authentication is rejected by the guard; a missing user in the service returns 401.
- The frontend uses this endpoint during auth-provider initialization.

### 2.6 `POST /auth/forgot-password`

- **Request:** JSON `{ "email": "user@example.com" }`.
- **Success for an existing account:** creates a six-digit code, stores its hash with a 10-minute expiry, attempts to email it, and returns a message indicating a verification code will be received.
- **Unknown email:** the current service throws 404 `No account found with this email address`; it does not return the same successful response for unknown and known emails.
- **Email delivery failure:** logged by the service; the service still returns its success message.
- The frontend navigates to `/verify-code` with the entered email in router location state after an API success response.

### 2.7 `POST /auth/verify-code`

- **Request:** JSON `{ "email": "user@example.com", "code": "123456" }`.
- **Validation:** email and exactly six characters for the code.
- **Success:** `{ "message": "Verification code is valid." }`.
- **Failure:** 400 `Invalid or expired verification code`.
- Verification does not mark the code as used; the code is checked again by Reset Password.

### 2.8 `POST /auth/reset-password`

- **Request:** JSON `{ "email": "user@example.com", "code": "123456", "password": "..." }`.
- **Validation:** email; exactly six-character code; password minimum 8 with uppercase, lowercase, digit, and one of `@$!%*?&`.
- **Success:** `{ "message": "Your password has been reset successfully." }`.
- **Failure:** 400 `Invalid or expired verification code` when the email/code pair has no valid, unused, unexpired code.
- **Behavior:** updates the password, marks that code used, and marks the user's other unused password-reset records used.

---

## 3. Other Auth Controller Endpoints

| Method | Path | Access | Purpose |
|---|---|---|---|
| `PATCH` | `/auth/resubmit-license` | Merchant | Resubmit a rejected merchant's license PDF. |
| `POST` | `/auth/create-admin` | Admin or super-admin | Create an administrative account. |
| `PATCH` | `/auth/change-password` | Authenticated user | Change the authenticated user's password. |

These routes are not part of the five public auth page flows documented in DD02.

---

## 4. Cross-References

| Related document | Purpose |
|---|---|
| [DD SignUp/Login 01](./DD_SignUp_Login_01_MODULE_OVERVIEW.md) | Module overview |
| [DD SignUp/Login 02](./DD_SignUp_Login_02_FRONTEND_Page.md) | Frontend interactions |
| [DD SignUp/Login 04](./DD_SignUp_Login_04_DTOS_AND_TYPES.md) | Request and response shapes |
| [DD SignUp/Login 05](./DD_SignUp_Login_05_BUSINESS_LOGIC.md) | Endpoint processing |
