# Sign-Up & Log-In Checklist (PCL)

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-PCL-AUTH-001 |
| **Target Screen** | Sign-Up / Log-In / Forgot Password / Reset Password (新規登録 / ログイン / パスワード再設定) |
| **Subsystem** | Authentication & User Management |
| **Version** | 1.0 |
| **Created** | 2026-09-11 |
| **Status** | Active |

---

## 1. Database & Schema

- [ ] `users` table exists with all required columns (`id`, `email`, `password_hash`, `name`, `role`, `avatar_url`, `is_active`, `email_verified`, `created_at`, `updated_at`, `merchant_id`)
- [ ] `merchants` table exists with `id`, `shop_name`, `license_url`, `license_status`, `is_active`, `created_at`, `updated_at`
- [ ] `refresh_tokens` table exists with `id`, `user_id`, `token_hash`, `family_id`, `is_revoked`, `expires_at`, `created_at`
- [ ] `password_reset_tokens` table exists with `id`, `user_id`, `token_hash`, `expires_at`, `used`, `created_at`
- [ ] Foreign key: `users.merchant_id` → `merchants.id` (SET NULL)
- [ ] Foreign key: `refresh_tokens.user_id` → `users.id` (CASCADE)
- [ ] Foreign key: `password_reset_tokens.user_id` → `users.id` (CASCADE)
- [ ] Unique constraint on `users.email`
- [ ] Unique constraint on `merchants.shop_name`
- [ ] Default values: `users.is_active = true`, `users.email_verified = false`, `merchants.license_status = 'pending'`, `refresh_tokens.is_revoked = false`, `password_reset_tokens.used = false`
- [ ] Indexes on `users.email`, `users.merchant_id`, `merchants.license_status`, `refresh_tokens.family_id`, `password_reset_tokens.token_hash`
- [ ] Prisma schema matches database schema

---

## 2. Seed Data

- [ ] Super Admin user pre-seeded (`superadmin@example.com`, role `super_admin`)
- [ ] Admin user pre-seeded (`admin@example.com`, role `admin`)
- [ ] Approved Merchant users pre-seeded with approved license status
- [ ] Pending Merchant users pre-seeded with pending license status (`license_status = 'pending'`)
- [ ] Active Buyer users pre-seeded (`test-buyer@example.com`, role `buyer`)
- [ ] Inactive/Banned user pre-seeded (`inactive@example.com`, `is_active = false`)
- [ ] All pre-seeded passwords hashed using Argon2id
- [ ] Mock sample `license.pdf` file available for testing uploads

---

## 3. Backend — Module Structure

- [ ] `AuthModule` created and registered in `AppModule`
- [ ] `AuthController` with all authentication & password recovery endpoints
- [ ] `AuthService` with credential validation, user registration, token generation, and password hashing
- [ ] `JwtStrategy` and `JwtRefreshStrategy` implemented using Passport
- [ ] DTOs: `RegisterDto`, `LoginDto`, `RefreshTokenDto`, `ForgotPasswordDto`, `ResetPasswordDto`, `VerifyCodeDto`
- [ ] Guards: `JwtAuthGuard`, `JwtRefreshGuard`, `RolesGuard`, `LicenseStatusGuard`
- [ ] NestJS Mailer service configured for password reset email delivery
- [ ] Proper error handling with consistent error response structures and HTTP status codes

---

## 4. Backend — API Endpoints

### 4.1 Authentication & Password Recovery

- [ ] `POST /api/v1/auth/register` — Register a new buyer or merchant (with license file)
- [ ] `POST /api/v1/auth/login` — Authenticate user and issue access/refresh tokens
- [ ] `POST /api/v1/auth/refresh` — Issue a new access token via refresh token rotation
- [ ] `POST /api/v1/auth/logout` — Revoke refresh token and blacklist access token in Redis
- [ ] `POST /api/v1/auth/forgot-password` — Send password reset link/token to user email
- [ ] `POST /api/v1/auth/verify-code` — Verify validity of reset code/token
- [ ] `POST /api/v1/auth/reset-password` — Reset password using valid reset token

### 4.2 Response Format

- [ ] Consistent response structure with `data` payload or message
- [ ] Proper HTTP status codes (200, 201, 204, 400, 401, 403, 404, 409, 413, 415, 429, 500)
- [ ] Standardized error response includes `statusCode`, `errorCode`, `message`, `timestamp`, `path`

---

## 5. Backend — Business Rules

### 5.1 Registration Rules

- [ ] **BR-AUTH-001**: Email must be unique across all users (case-insensitive check)
- [ ] **BR-AUTH-002**: Password minimum 8 characters, requiring uppercase, lowercase, number, and special character
- [ ] **BR-AUTH-003**: Role selection during registration limited strictly to `buyer` or `merchant`
- [ ] **BR-AUTH-004**: If role is omitted, default to `buyer`
- [ ] **BR-AUTH-005**: New users have `email_verified = false` by default
- [ ] **BR-AUTH-020**: When role = `merchant`, license PDF file upload is mandatory
- [ ] **BR-AUTH-021**: License file must be PDF format only (`application/pdf`)
- [ ] **BR-AUTH-022**: License file must be named `license.pdf` (case-insensitive)
- [ ] **BR-AUTH-023**: License file must not exceed 10MB
- [ ] **BR-AUTH-024**: Merchant registration initializes `merchants.license_status = 'pending'`; merchant operations restricted until admin approval
- [ ] **BR-AUTH-025**: Admin and Super Admin accounts cannot be created via public registration
- [ ] **BR-AUTH-026**: When role = `merchant`, shop name (`shopName`) is mandatory (1–255 characters)

### 5.2 Login & Authentication Rules

- [ ] **BR-AUTH-006**: Credentials verified against email and Argon2id password hash
- [ ] **BR-AUTH-007**: Login rejected for inactive users (`is_active = false`) with 401/403
- [ ] **BR-AUTH-008**: Rate limiting enforced: max 5 login attempts per IP per 300 seconds
- [ ] **BR-AUTH-009**: Anti-enumeration: Generic error message ("Invalid email or password") returned for both invalid email and wrong password

### 5.3 Token & Session Management Rules

- [ ] **BR-AUTH-010**: JWT Access Token expires after 15 minutes
- [ ] **BR-AUTH-011**: JWT Refresh Token expires after 7 days
- [ ] **BR-AUTH-012**: Absolute maximum session limit of 90 days
- [ ] **BR-AUTH-013**: Refresh token rotation: new refresh token issued on every refresh invocation
- [ ] **BR-AUTH-014**: Family tracking: each login creates a unique family ID for session lineage
- [ ] **BR-AUTH-015**: Reuse detection: if a revoked refresh token is presented, revoke all active tokens in that user's session family immediately

### 5.4 Password Reset Rules

- [ ] **BR-AUTH-030**: Password reset tokens expire after 24 hours
- [ ] **BR-AUTH-031**: Single-use tokens: tokens marked `used = true` immediately upon password change
- [ ] **BR-AUTH-032**: Reset rate limiting: max 3 password reset requests per email per hour
- [ ] **BR-AUTH-033**: Invalidate previous tokens: generating a new reset request invalidates prior unused tokens for that user
- [ ] **BR-AUTH-034**: Anti-enumeration on forgot password: same generic success message displayed regardless of whether email exists
- [ ] **BR-AUTH-035**: Updated password re-hashed with Argon2id before database storage

---

## 6. Backend — Validation

- [ ] All DTOs decorated with `class-validator` decorators
- [ ] `@IsEmail()`, `@IsNotEmpty()`, `@MaxLength(255)` on email fields
- [ ] `@MinLength(8)`, `@Matches()` for password complexity requirements
- [ ] `@IsIn(['buyer', 'merchant'])` on registration role field
- [ ] `@ValidateIf(o => o.role === 'merchant')` for conditional `shopName` and license file requirements
- [ ] File upload interceptor validating MIME type (`application/pdf`) and size (≤10MB)
- [ ] Global `ValidationPipe` with `{ whitelist: true, forbidNonWhitelisted: true }` enabled

---

## 7. Frontend — Module & Routing

- [ ] Login route: `/login`
- [ ] Register route: `/register`
- [ ] Forgot Password route: `/forgot-password`
- [ ] Reset Password route: `/reset-password`
- [ ] Public-only guard: Authenticated users navigating to `/login` or `/register` redirected to their role dashboard
- [ ] Role-based redirect: Buyers redirected to `/buyer`, Merchants redirected to `/merchant`, Admins redirected to `/admin`

---

## 8. Frontend — Screen Layout & UI Elements

### 8.1 Login Page (`/login`)

- [ ] Application logo and title ("Cosmetics Finder")
- [ ] Email input (auto-focused on load)
- [ ] Password input with Show/Hide toggle button
- [ ] "Log In" primary button (disabled while invalid, spinner while submitting)
- [ ] "Don't have an account? Sign Up" navigation link → `/register`
- [ ] "Forgot password?" navigation link → `/forgot-password`
- [ ] Language toggle dropdown/buttons (EN / JA / MY)
- [ ] Theme toggle switch (Light / Dark mode)

### 8.2 Registration Page (`/register`)

- [ ] Name input (required, 2–100 characters)
- [ ] Email input (required, valid email)
- [ ] Password input with Show/Hide toggle & real-time strength meter
- [ ] Confirm Password input with match validation
- [ ] Role selector tabs/radio: Buyer (default) vs. Merchant
- [ ] Conditional Merchant Fields (appear when Merchant selected):
  - [ ] Shop Name input (required)
  - [ ] Business License upload zone (`license.pdf`, drag & drop + file picker)
- [ ] "Create Account" primary button (disabled while invalid, spinner while submitting)
- [ ] "Already have an account? Log In" navigation link → `/login`

### 8.3 Forgot Password Page (`/forgot-password`)

- [ ] Header title & instructions
- [ ] Email input field
- [ ] "Send Reset Link" button
- [ ] Success state banner ("If an account exists, a reset link has been sent")
- [ ] "Back to Login" navigation link

### 8.4 Reset Password Page (`/reset-password`)

- [ ] New Password input with Show/Hide toggle & strength meter
- [ ] Confirm New Password input
- [ ] "Reset Password" button
- [ ] Invalid / expired token warning state with redirect to `/forgot-password`
- [ ] Success confirmation banner with "Back to Login" button

---

## 9. Frontend — Form Handling & Validation

- [ ] Forms powered by React Hook Form + Zod schema validation
- [ ] Real-time field validation on blur / change
- [ ] Dynamic password strength meter indicating length, upper, lower, number, and special character
- [ ] Confirm password matching validation
- [ ] Drag-and-drop license file dropzone with file type check (`application/pdf`) and size check (≤10MB)
- [ ] File removal / re-select button in license upload zone
- [ ] Submit buttons disabled during form submission to prevent duplicate requests

---

## 10. Frontend — Error Handling

- [ ] 400: Inline field-level error messages displayed beneath respective inputs
- [ ] 401: Generic alert banner "Invalid email or password" (no credential leaking)
- [ ] 403 (Account Inactive): Banner "Your account is inactive. Please contact support"
- [ ] 409: "An account with this email already exists" message
- [ ] 413: "File size exceeds 10MB limit"
- [ ] 415: "Only PDF files are supported for business license"
- [ ] 429: "Too many attempts. Please try again in 5 minutes" rate limit alert
- [ ] Network Error: Toast notification "Network error. Please check your internet connection"

---

## 11. Frontend — State Management & Auth Context

- [ ] `AuthContext` provides `user`, `role`, `isAuthenticated`, `login()`, `logout()`, and `refresh()`
- [ ] Access token kept in-memory (never in `localStorage` or `sessionStorage`)
- [ ] Silent token refresh timer / Axios interceptor on 401 response
- [ ] Logout clears memory state and invokes backend revocation
- [ ] Role and session state correctly restored on browser reload

---

## 12. Frontend — Internationalization (i18n)

- [ ] Full translation keys configured for EN, JA, MY
- [ ] Form labels (`auth.email`, `auth.password`, `auth.name`, `auth.shopName`)
- [ ] Placeholder text (`auth.emailPlaceholder`, `auth.passwordPlaceholder`)
- [ ] Validation messages (`auth.errors.*`)
- [ ] Success / toast messages translated
- [ ] Language switcher seamlessly switches UI text across all auth views

---

## 13. Frontend — Responsive Design

- [ ] Mobile viewport (< 768px): Full-width form, comfortable touch targets (min 44px), readable text
- [ ] Tablet viewport (768px – 1023px): Centered card container (max-width 480px)
- [ ] Desktop viewport (≥ 1024px): Centered aesthetic card with balanced whitespace
- [ ] Virtual keyboard friendly on mobile devices without layout distortion

---

## 14. Frontend — Accessibility

- [ ] Semantic HTML form elements (`<form>`, `<label>`, `<input>`, `<button>`)
- [ ] `htmlFor` and `id` associations on all input labels
- [ ] `aria-invalid` and `aria-describedby` set when validation errors occur
- [ ] `aria-live="polite"` on error alerts and notifications
- [ ] Full keyboard navigation (Tab order through fields, Enter to submit, Space/Enter to toggle password visibility)
- [ ] WCAG AA color contrast ratio (minimum 4.5:1 for text)

---

## 15. Frontend — Dialogs & Feedback

- [ ] Password visibility toggle button with accessible labels ("Show password" / "Hide password")
- [ ] Loading spinners inside action buttons during submission
- [ ] Toast notification on successful registration, password reset email sent, and password updated
- [ ] Clear visual indicators for drag-over state on license file upload

---

## 16. Testing — Unit Tests

### 16.1 Backend Unit Tests

- [ ] `AuthService.register()` — successful buyer creation
- [ ] `AuthService.register()` — successful merchant creation with license
- [ ] `AuthService.register()` — duplicate email rejection
- [ ] `AuthService.register()` — admin role registration rejection
- [ ] `AuthService.login()` — valid credentials returns tokens
- [ ] `AuthService.login()` — wrong password returns 401
- [ ] `AuthService.login()` — inactive user returns 403
- [ ] `AuthService.refreshToken()` — valid rotation returns new token pair
- [ ] `AuthService.refreshToken()` — revoked token triggers family revocation
- [ ] `AuthService.forgotPassword()` — valid email generates reset token
- [ ] `AuthService.resetPassword()` — valid token updates password hash
- [ ] Password hashing & Argon2id verification helper tests

### 16.2 Frontend Unit Tests

- [ ] Login form renders all fields and submits valid payload
- [ ] Registration form shows/hides merchant fields dynamically on role switch
- [ ] Client-side Zod validation triggers on invalid email, weak password, password mismatch
- [ ] Password strength meter reacts correctly to input complexity
- [ ] Forgot password form handles submission and success display
- [ ] Reset password form validates matching passwords

---

## 17. Testing — Integration Tests

- [ ] `POST /api/v1/auth/register` — full buyer registration flow
- [ ] `POST /api/v1/auth/register` — full merchant registration flow with multipart PDF upload
- [ ] `POST /api/v1/auth/login` — full login flow with JWT cookie issuance
- [ ] `POST /api/v1/auth/refresh` — token rotation cycle
- [ ] `POST /api/v1/auth/logout` — token revocation & Redis blacklisting
- [ ] `POST /api/v1/auth/forgot-password` — email generation & database record creation
- [ ] `POST /api/v1/auth/verify-code` — token validation logic
- [ ] `POST /api/v1/auth/reset-password` — single-use enforcement and subsequent login with new password

---

## 18. Testing — E2E Tests (Playwright)

- [ ] **E2E-AUTH-01**: Buyer Registration (Valid form → redirect to login → login succeeds)
- [ ] **E2E-AUTH-02**: Merchant Registration (Role select → upload `license.pdf` → redirect to login)
- [ ] **E2E-AUTH-03**: Registration Validation (Empty fields, duplicate email, weak password, invalid PDF)
- [ ] **E2E-AUTH-04**: Buyer Login & Redirect (Redirects to `/buyer` dashboard)
- [ ] **E2E-AUTH-05**: Merchant Login & Redirect (Redirects to `/merchant` dashboard)
- [ ] **E2E-AUTH-06**: Login Validation & Error Feedback (Wrong password, non-existent email generic alert)
- [ ] **E2E-AUTH-07**: Password Visibility Toggle (Toggles plaintext/password mask)
- [ ] **E2E-AUTH-08**: Forgot Password Flow (Submit email → success banner)
- [ ] **E2E-AUTH-09**: Reset Password Flow (Open token link → fill new password → login with new password succeeds)
- [ ] **E2E-AUTH-10**: Logout & Session Invalidation (Logout → protected routes inaccessible)
- [ ] **E2E-AUTH-11**: Multi-language Toggle (EN / JA / MY switching across screens)
- [ ] **E2E-AUTH-12**: Theme Switching (Light / Dark mode persistence)
- [ ] **E2E-AUTH-13**: Responsive Layouts (Mobile 375px, Tablet 768px, Desktop 1280px)

---

## 19. Performance

- [ ] Login API response time ≤ 500ms (including Argon2id verification)
- [ ] Registration API response time ≤ 1s (including file upload handling)
- [ ] Refresh token API response time ≤ 200ms
- [ ] Rate limiting configured in Redis to prevent brute-force attacks
- [ ] Minimal frontend bundle size for auth pages (lazy-loaded routes)

---

## 20. Security

- [ ] Passwords hashed with Argon2id (64MB memory, 3 iterations, 4 parallelism)
- [ ] Access tokens kept strictly in memory; refresh tokens stored in `httpOnly`, `Secure`, `SameSite=Strict` cookies
- [ ] Redis token blacklist for immediate revocation upon logout
- [ ] Rate limiter protecting `/login` (5/300s) and `/forgot-password` (3/hour)
- [ ] Anti-user enumeration: generic error messages on both login and password recovery
- [ ] Single-use password reset tokens with strict 24-hour expiration
- [ ] CORS policies restricted strictly to configured frontend origins
- [ ] Input sanitization on all string fields to prevent XSS and SQL/NoSQL injection

---

## 21. File Upload (Merchant License)

- [ ] Dedicated upload handler for merchant license documents
- [ ] MIME type validation strictly verifying `application/pdf`
- [ ] File size limit enforced (max 10MB)
- [ ] Secure storage path with UUID-based filenames to prevent path traversal
- [ ] License file linked to `merchants` record for admin verification

---

## 22. Redis & Session Management

- [ ] Redis client connection configured with reconnect strategy
- [ ] Token blacklist key format: `blacklist:token:{jwt_id}`
- [ ] Rate limiting key formats: `ratelimit:login:{ip}`, `ratelimit:reset:{email}`
- [ ] TTL automatically set on blacklisted tokens matching access token remaining lifetime
- [ ] Session family tracking maintained in DB/Redis for breach detection

---

## 23. Documentation

- [ ] Swagger / OpenAPI documentation complete for all `/api/v1/auth/*` endpoints
- [ ] Request and response schemas fully documented with examples
- [ ] Error status codes (400, 401, 403, 409, 413, 415, 429) documented
- [ ] Functional Specification (機能設計書) and Screen Items Specification (画面項目設計書) up to date

---

## Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Developer | | | |
| QA Engineer | | | |
| Tech Lead | | | |
| Product Owner | | | |
