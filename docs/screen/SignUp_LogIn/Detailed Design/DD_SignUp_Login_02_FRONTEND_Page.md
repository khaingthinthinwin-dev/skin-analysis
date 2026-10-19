# DD SignUp/Login 02 — Frontend Pages

> **Doc ID:** SKM-DD-AUTH-02 | **Version:** 2.2 | **Status:** Aligned to current frontend implementation

---

## 1. Overview

The authentication UI has five separate routes: Login, Register, Forgot Password, Verification Code, and Reset Password. Each page renders its own card inside the shared `AuthLayout`; Login and Register are not tabs on a shared page.

| Page | Source file | Route |
|---|---|---|
| Login | `frontend/src/pages/auth/Login.tsx` | `/login` |
| Register | `frontend/src/pages/auth/Register.tsx` | `/register` |
| Forgot Password | `frontend/src/pages/auth/ForgotPassword.tsx` | `/forgot-password` |
| Verification Code | `frontend/src/pages/auth/VerifyCode.tsx` | `/verify-code` |
| Reset Password | `frontend/src/pages/auth/ResetPassword.tsx` | `/reset-password` |

All five routes are wrapped by `frontend/src/layouts/AuthLayout.tsx`, which renders the shared header and a centered content area with `max-w-md`. The page content uses a card layout. The shared header provides app-wide controls; those controls are not implemented by the individual auth pages.

---

## 2. Page Behavior

### 2.1 Login

**Fields**

- Email: email input, email autocomplete, autofocus.
- Password: password input with a show/hide control.

**Validation and submission**

- Uses `loginSchema` through React Hook Form and Zod with `mode: 'onTouched'`.
- Email is required and must be valid. Password is required and must be at least 8 characters.
- The submit button is disabled while the login request is in progress and displays a loading indicator.
- On success, shows a success toast. Authentication navigation is handled by the auth provider; an authenticated user visiting this page is redirected to the `redirect` query value when present, otherwise to the dashboard route for their role.
- On failure, displays the thrown error message in a destructive alert, or the translated fallback message when the error is not an `Error`.

**Navigation**

- “Forgot password” navigates to `/forgot-password`.
- “Create account” navigates to `/register`.

### 2.2 Register

**Fields**

- Role radio group: `buyer` (default) or `merchant`.
- Name: one input bound to `name`. Its label and placeholder change from full name to shop name when the selected role is merchant; there is no separate shop-name input.
- Email.
- Password and confirmation, each with an independent show/hide control.
- Terms of Service agreement checkbox with a link to `/terms`.
- Merchant-only business-license upload. The user can select a file or drag and drop it, see the selected filename, and remove it. The file picker accepts PDF files.

**Validation and submission**

- Uses `registerSchema` through React Hook Form and Zod with `mode: 'onTouched'`.
- Name is 2–200 characters; email is required, valid, and at most 255 characters.
- Password is 8–128 characters and must include an uppercase letter, lowercase letter, digit, and one of `@$!%*?&`. Confirmation is required and must match.
- Role must be `buyer` or `merchant`; the Terms of Service checkbox must be selected.
- A merchant must supply a license file. It must be a PDF, no larger than 10 MB, and named `license.pdf` (case-insensitive).
- Choosing buyer clears any selected license file.
- The submit button is disabled and shows a loading indicator while registration is in progress.
- On success, shows a success toast and navigates to `/login`.
- On failure, displays the thrown error message in a destructive alert, or the translated fallback message when the error is not an `Error`.
- An already-authenticated user is redirected to the dashboard route for their role.

### 2.3 Forgot Password

**Fields**

- Email: email input with email autocomplete, autofocus, and email input mode.

**Validation and submission**

- Uses `forgotPasswordSchema` through React Hook Form and Zod with `mode: 'onTouched'`.
- Email is required and must be valid.
- The submit button is disabled and shows a loading indicator while the request is in progress.
- On success, navigates to `/verify-code` and passes the email in router location state. This page does not render a separate success state.
- On failure, displays the response message when available, otherwise the thrown error message or the translated fallback.

**Navigation**

- “Back to Login” navigates to `/login`.

### 2.4 Verification Code

**Entry conditions and fields**

- Reads the email from router location state. If no email is present, redirects to `/forgot-password` and renders no page content while redirecting.
- Shows a masked version of the email in the description.
- Code: text input with numeric input mode, one-time-code autocomplete, autofocus, and a maximum input length of 6.

**Validation and submission**

- Uses `verifyCodeSchema` through React Hook Form with `mode: 'onTouched'`.
- Code is required and must contain exactly 6 characters. The schema checks length; the input uses numeric input mode.
- On successful verification, navigates to `/reset-password` and passes both email and code in router location state.
- On failure, displays the response message when available, otherwise the thrown error message or the page fallback.
- The resend action requests a new code for the same email. On success, displays a success alert and starts a 60-second cooldown; the action is disabled during the request and cooldown. On failure, displays the response message, thrown error message, or fallback.

**Navigation**

- “Back to email” navigates to `/forgot-password`.

### 2.5 Reset Password

**Entry conditions and fields**

- Reads email and code from router location state. If either is missing, redirects to `/forgot-password` and renders no form content while redirecting.
- New password and confirmation fields each have a show/hide control.
- The new-password field has autofocus and a maximum input length of 128. A `PasswordStrengthIndicator` is rendered for that field.

**Validation and submission**

- Uses `resetPasswordSchema` through React Hook Form with `mode: 'onTouched'`.
- Password is required, 8–128 characters, and must include an uppercase letter, lowercase letter, digit, and one of `@$!%*?&`. Confirmation is required and must match.
- Submits email, code, and the new password. The confirmation value is for client-side validation and is not included in the reset request.
- The submit button is disabled and shows a loading indicator while the request is in progress.
- On success, shows a success toast and replaces the form with a success view containing a “Back to Login” link.
- On failure, displays the response message when available, otherwise the thrown error message or the translated fallback.

---

## 3. Form and Error Presentation

- The five pages use React Hook Form with Zod resolvers from `frontend/src/schemas/auth.schema.ts`.
- Field validation messages are rendered below their respective fields.
- Login, Register, Forgot Password, Verification Code, and Reset Password render request errors in destructive alerts with `role="alert"`.
- Login and Register use the error message from an `Error` instance or their translated fallback. Forgot Password, Verification Code, and Reset Password prefer a server response message, then an `Error` message, then a page fallback.
- Submit controls show a loading indicator and are disabled during their corresponding request. The implementation does not disable every form input during submission.
- User-facing text is read through `react-i18next`; the shared header is responsible for the global language control.

---

## 4. Password Visibility and Strength

- Login and Register provide show/hide password controls.
- Register shows a live checklist for minimum length, uppercase, lowercase, number, and special character requirements.
- Reset Password uses the shared `PasswordStrengthIndicator` component for the new password.
- Visibility controls are buttons and provide translated screen-reader labels.

---

## 5. Password-Recovery Navigation Flow

1. Login links to Forgot Password.
2. Forgot Password validates the email and requests a verification code.
3. On success, Forgot Password navigates to Verification Code with the email in router location state.
4. Verification Code validates the code and verifies it for that email.
5. On success, Verification Code navigates to Reset Password with the email and code in router location state.
6. Reset Password requires both state values, submits the new password with them, and shows the success view after success.
7. Verification Code and Reset Password redirect to Forgot Password when their required router state is missing.

The Reset Password route does not read a `token` query parameter; its required email and code are passed through router location state by the preceding page.

---

## 6. Implementation References

| Concern | Source |
|---|---|
| Auth routes and page wrappers | `frontend/src/app/routes.tsx` |
| Shared auth layout | `frontend/src/layouts/AuthLayout.tsx` |
| Form schemas and inferred types | `frontend/src/schemas/auth.schema.ts` |
| Auth service requests | `frontend/src/services/auth.service.ts` |
| Login page | `frontend/src/pages/auth/Login.tsx` |
| Register page | `frontend/src/pages/auth/Register.tsx` |
| Forgot Password page | `frontend/src/pages/auth/ForgotPassword.tsx` |
| Verification Code page | `frontend/src/pages/auth/VerifyCode.tsx` |
| Reset Password page | `frontend/src/pages/auth/ResetPassword.tsx` |

---

## 7. Cross-References

| Related Document | Purpose |
|---|---|
| [DD SignUp/Login 01](./DD_SignUp_Login_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD SignUp/Login 03](./DD_SignUp_Login_03_API_ENDPOINTS.md) | Backend REST API contract |
| [DD SignUp/Login 04](./DD_SignUp_Login_04_DTOS_AND_TYPES.md) | DTO and type definitions |
| [DD SignUp/Login 05](./DD_SignUp_Login_05_BUSINESS_LOGIC.md) | Backend business rules |
| [機能設計書_SignUp_Login](../機能設計書_SignUp_Login.md) | Functional specification |
