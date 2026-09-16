# Pre-condition Checklist (PCL) — Sign-up / Login / Password Reset

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-PCL-SIGNUP-001 |
| **Target Screen** | Sign-up / Login / Password Reset |
| **Subsystem** | Authentication |
| **Version** | 1.0 |
| **Created** | 2026-09-16 |
| **Last Updated** | 2026-09-16 |
| **Status** | Active |

---

## 1. Database & Schema

- [ ] `users` table exists with all required columns (`id` UUID PK, `email` VARCHAR(255), `password_hash` VARCHAR(255), `name` VARCHAR(255), `role` VARCHAR(20), `merchant_id` UUID FK, `phone` VARCHAR(20), `avatar_url` TEXT, `is_active` BOOLEAN, `email_verified` BOOLEAN, `created_at` TIMESTAMPTZ, `updated_at` TIMESTAMPTZ)
- [ ] `merchants` table exists with all required columns (`id` UUID PK, `user_id` UUID FK, `shop_name` VARCHAR(255), `business_license_url` TEXT, `license_status` VARCHAR(20), `rejection_reason` TEXT, `reviewed_at` TIMESTAMPTZ, `reviewed_by` UUID FK, `license_expires_at` TIMESTAMPTZ, `created_at` TIMESTAMPTZ, `updated_at` TIMESTAMPTZ)
- [ ] `refresh_tokens` table exists with all required columns (`id` UUID PK, `user_id` UUID FK, `token_hash` VARCHAR(255), `family` VARCHAR(255), `device_info` JSONB, `ip_address` VARCHAR(50), `is_revoked` BOOLEAN, `absolute_limit_at` TIMESTAMPTZ, `expires_at` TIMESTAMPTZ, `created_at` TIMESTAMPTZ)
- [ ] `password_reset_tokens` table exists with all required columns (`id` UUID PK, `user_id` UUID FK, `token_hash` VARCHAR(255), `expires_at` TIMESTAMPTZ, `used` BOOLEAN, `created_at` TIMESTAMPTZ)
- [ ] Unique constraint on `users.email` — `uq_users_email`
- [ ] Check constraint on `users.role` — `chk_users_role` (IN: buyer, merchant, admin, super_admin)
- [ ] Unique constraint on `merchants.user_id` — `uq_merchants_user_id`
- [ ] Check constraint on `merchants.license_status` — `chk_merchants_license_status` (IN: pending, approved, rejected)
- [ ] Foreign key: `users.merchant_id` → `merchants.id` (ON DELETE SET NULL ON UPDATE CASCADE)
- [ ] Foreign key: `merchants.user_id` → `users.id` (ON DELETE CASCADE ON UPDATE CASCADE)
- [ ] Foreign key: `refresh_tokens.user_id` → `users.id` (ON DELETE CASCADE ON UPDATE CASCADE)
- [ ] Foreign key: `password_reset_tokens.user_id` → `users.id` (ON DELETE CASCADE ON UPDATE CASCADE)
- [ ] Indexes on `password_reset_tokens.user_id` and `password_reset_tokens.token_hash`
- [ ] Prisma schema matches database schema

---

## 2. Seed Data

- [ ] Buyer user pre-seeded: `eem@gmail.com` / `Cosmetics@123` (role: buyer)
- [ ] Merchant user pre-seeded: `smt@gmail.com` / `Cosmetics@123` (role: merchant, license_status: approved)
- [ ] At least one user with `is_active = false` for deactivated account testing
- [ ] At least one merchant with `license_status = 'pending'` for pending merchant testing

---

## 3. Backend — Module Structure

- [ ] `AuthModule` created and registered in `AppModule`
- [ ] `AuthController` with endpoints: register, login, refresh, logout, verify, forgot-password, reset-password
- [ ] `AuthService` with business logic for all auth operations
- [ ] DTOs: `RegisterDto`, `LoginDto`, `ForgotPasswordDto`, `ResetPasswordDto`
- [ ] Guards: `JwtAuthGuard`, `CookieGuard` (refresh token)
- [ ] Strategies: `JwtAccessStrategy`, `JwtRefreshStrategy`
- [ ] Proper error handling with consistent error responses

---

## 4. Backend — API Endpoints

### Registration
- [ ] `POST /api/v1/auth/register` — Register new user (Public)
- [ ] Accepts multipart/form-data when license file attached

### Authentication
- [ ] `POST /api/v1/auth/login` — Authenticate user, issue tokens (Public)
- [ ] `POST /api/v1/auth/refresh` — Refresh access token via cookie (Cookie-based)
- [ ] `POST /api/v1/auth/logout` — Terminate session, blacklist token (Authenticated)
- [ ] `GET /api/v1/auth/verify` — Validate token, return user profile (Authenticated)

### Password Recovery
- [ ] `POST /api/v1/auth/forgot-password` — Request password reset email (Public)
- [ ] `POST /api/v1/auth/reset-password` — Reset password with token (Public)

### Response Format
- [ ] Consistent response structure with `data` payload
- [ ] Proper HTTP status codes (200, 201, 400, 401, 403, 409, 413, 415, 429, 500)

---

## 5. Backend — Business Rules

### Registration Rules
- [ ] **BR-AUTH-001**: Email must be unique across all users
- [ ] **BR-AUTH-002**: Password minimum 8 characters, must include uppercase, lowercase, number, and special character
- [ ] **BR-AUTH-003**: Only 'buyer' or 'merchant' roles allowed during registration
- [ ] **BR-AUTH-004**: Default role is 'buyer' if not specified
- [ ] **BR-AUTH-005**: New users have `emailVerified = false`
- [ ] **BR-AUTH-020**: When role = 'merchant', license file upload is mandatory
- [ ] **BR-AUTH-021**: License file must be PDF format only
- [ ] **BR-AUTH-022**: License file must be named 'license.pdf' (case-insensitive)
- [ ] **BR-AUTH-023**: License file must not exceed 10MB
- [ ] **BR-AUTH-024**: Merchant registration creates `merchants` record with `license_status='pending'`
- [ ] **BR-AUTH-025**: Admin and Super Admin accounts cannot be created via registration
- [ ] **BR-AUTH-026**: When role = 'merchant', shop name is mandatory (1-255 characters)

### Login Rules
- [ ] **BR-AUTH-006**: Email must exist and password must match Argon2 hash
- [ ] **BR-AUTH-007**: User must have `isActive = true` to login
- [ ] **BR-AUTH-008**: Max 5 login attempts per IP per 300 seconds
- [ ] **BR-AUTH-009**: Never reveal whether email exists or password is wrong

### Token Rules
- [ ] **BR-AUTH-010**: Access tokens expire after 15 minutes
- [ ] **BR-AUTH-011**: Refresh tokens expire after 7 days
- [ ] **BR-AUTH-012**: Maximum session duration of 90 days regardless of rotations
- [ ] **BR-AUTH-013**: New refresh token issued on every refresh request (rotation)
- [ ] **BR-AUTH-014**: Each login session has unique family ID for breach detection
- [ ] **BR-AUTH-015**: If revoked token is used, ALL tokens for that user are revoked

### Security Rules
- [ ] **BR-AUTH-016**: Use Argon2id with 64MB memory, 3 iterations, 4 threads
- [ ] **BR-AUTH-017**: Access token in memory only (never localStorage). Refresh token in httpOnly cookie
- [ ] **BR-AUTH-018**: Cookie: httpOnly, Secure, SameSite=Strict, Path=/api/v1/auth/refresh
- [ ] **BR-AUTH-019**: Only allowed origins can access auth endpoints (CORS)

### Password Reset Rules
- [ ] **BR-AUTH-030**: Password reset tokens expire after 24 hours
- [ ] **BR-AUTH-031**: Reset token is single-use (used = TRUE after successful reset)
- [ ] **BR-AUTH-032**: Max 3 password reset requests per email per hour
- [ ] **BR-AUTH-033**: When a new reset is requested, all previous unused tokens for that user are invalidated
- [ ] **BR-AUTH-034**: Response always shows same message regardless of whether email exists
- [ ] **BR-AUTH-035**: New password must be hashed with Argon2 before storing

---

## 6. Backend — Validation

- [ ] All DTOs use `class-validator` decorators
- [ ] Register: `@IsEmail()`, `@IsNotEmpty()`, `@MaxLength(255)` on email
- [ ] Register: `@MinLength(8)`, `@MaxLength(128)` on password with regex for strength
- [ ] Register: `@IsString()`, `@IsNotEmpty()`, `@MaxLength(200)` on name
- [ ] Register: `@IsIn(['buyer', 'merchant'])` on role
- [ ] Register: Conditional `@IsNotEmpty()` on shopName when role = merchant
- [ ] Login: `@IsEmail()`, `@IsNotEmpty()` on email
- [ ] Login: `@IsNotEmpty()`, `@MinLength(8)` on password
- [ ] Forgot Password: `@IsEmail()`, `@IsNotEmpty()` on email
- [ ] Reset Password: `@IsNotEmpty()` on token, `@MinLength(8)`, `@MaxLength(128)` on password
- [ ] ValidationPipe applied globally with `{ whitelist: true }`

---

## 7. Frontend — Module & Routing

- [ ] Login route: `/login`
- [ ] Register route: `/register`
- [ ] Forgot Password route: `/forgot-password`
- [ ] Reset Password route: `/reset-password`
- [ ] Routes are public (no auth guard required)
- [ ] Authenticated user redirect: `/login` and `/register` redirect to home when already logged in

---

## 8. Frontend — Screen Layout

### Login Page
- [ ] Centered card layout with max-width 400px
- [ ] Logo + "Cosmetics Finder" header
- [ ] Email input (auto-focused)
- [ ] Password input with show/hide toggle
- [ ] "Forgot password?" link (right-aligned)
- [ ] "Sign In" submit button (full width, spinner during loading)
- [ ] "Don't have an account? Create one" footer link

### Register Page
- [ ] Centered card layout with max-width 400px
- [ ] Logo + "Cosmetics Finder" header
- [ ] Full Name input
- [ ] Email input
- [ ] Password input with strength indicator and requirements checklist
- [ ] Confirm Password input with show/hide toggle
- [ ] Role selection: Buyer / Merchant radio buttons (Buyer default)
- [ ] Shop Name input (conditional — shown when Merchant selected)
- [ ] License upload zone (conditional — shown when Merchant selected)
- [ ] "Create Account" submit button (full width, spinner during loading)
- [ ] "Already have an account? Sign in" footer link

### Forgot Password Page
- [ ] Centered card layout with max-width 400px
- [ ] Logo + "Cosmetics Finder" header
- [ ] Title: "Forgot your password?"
- [ ] Description: "Enter your email and we'll send you a reset link."
- [ ] Email input (auto-focused)
- [ ] "Send Reset Link" submit button (full width, spinner during loading)
- [ ] "Back to Login" footer link
- [ ] Success state: Form replaced with success message

### Reset Password Page
- [ ] Centered card layout with max-width 400px
- [ ] Logo + "Cosmetics Finder" header
- [ ] Title: "Reset your password"
- [ ] Description: "Enter your new password below."
- [ ] New Password input with strength indicator (auto-focused)
- [ ] Confirm Password input with show/hide toggle
- [ ] "Reset Password" submit button (full width, spinner during loading)
- [ ] "Back to Login" footer link
- [ ] Success state: "Your password has been reset successfully." message

---

## 9. Frontend — UI Elements

### Login Form
| Element ID | Element Name | Component | i18n Key | Required |
|------------|--------------|-----------|----------|:--------:|
| `txtEmail` | Email Input | Input (email) | `auth.login.email` | Yes |
| `txtPassword` | Password Input | Input (password) | `auth.login.password` | Yes |
| `btnShowPassword` | Show/Hide Password | Icon Button | — | No |
| `btnLogin` | Log In Button | Button (submit) | `auth.login.submit` | Yes |
| `lnkForgotPassword` | Forgot Password Link | Link | `auth.login.forgotPassword` | No |
| `lnkSignUp` | Sign Up Link | Link | `auth.login.createAccount` | No |

### Register Form
| Element ID | Element Name | Component | i18n Key | Required |
|------------|--------------|-----------|----------|:--------:|
| `txtFullName` | Full Name Input | Input (text) | `auth.register.fullName` | Yes |
| `txtRegEmail` | Email Input | Input (email) | `auth.register.email` | Yes |
| `txtRegPassword` | Password Input | Input (password) | `auth.register.password` | Yes |
| `btnShowRegPassword` | Show/Hide Password | Icon Button | — | No |
| `lstPasswordRequirements` | Password Requirements | Helper Text List | — | No |
| `txtConfirmPassword` | Confirm Password Input | Input (password) | `auth.register.confirmPassword` | Yes |
| `btnShowConfirmPassword` | Show/Hide Confirm Password | Icon Button | — | No |
| `rdoBuyer` | Buyer Radio | Radio Button | `auth.register.buyer` | Yes |
| `rdoMerchant` | Merchant Radio | Radio Button | `auth.register.merchant` | Yes |
| `txtShopName` | Shop Name Input | Input (text) | — | Conditional |
| `uplLicense` | License File Upload | File Input | `auth.register.license` | Conditional |
| `btnRegister` | Create Account Button | Button (submit) | `auth.register.submit` | Yes |
| `lnkSignIn` | Login Link | Link | `auth.register.signIn` | No |

### Forgot Password Form
| Element ID | Element Name | Component | i18n Key | Required |
|------------|--------------|-----------|----------|:--------:|
| `txtForgotEmail` | Email Input | Input (email) | `auth.forgotPassword.email` | Yes |
| `btnSendResetLink` | Send Reset Link Button | Button (submit) | `auth.forgotPassword.submit` | Yes |
| `lnkBackToLoginForgot` | Back to Login Link | Link | `auth.forgotPassword.backToLogin` | No |

### Reset Password Form
| Element ID | Element Name | Component | i18n Key | Required |
|------------|--------------|-----------|----------|:--------:|
| `txtNewPassword` | New Password Input | Input (password) | `auth.resetPassword.newPassword` | Yes |
| `btnShowNewPassword` | Show/Hide New Password | Icon Button | — | No |
| `txtResetConfirmPassword` | Confirm Password Input | Input (password) | `auth.resetPassword.confirmPassword` | Yes |
| `btnShowResetConfirmPassword` | Show/Hide Confirm Password | Icon Button | — | No |
| `btnResetPassword` | Reset Password Button | Button (submit) | `auth.resetPassword.submit` | Yes |
| `lnkBackToLoginReset` | Back to Login Link | Link | `auth.resetPassword.backToLogin` | No |

---

## 10. Frontend — Form Handling

### Login Form
- [ ] React Hook Form + Zod schema validation
- [ ] Email: required, valid email format
- [ ] Password: required, min 8 chars
- [ ] Submit button disabled during submission
- [ ] Form-level error summary banner

### Register Form
- [ ] React Hook Form + Zod schema validation
- [ ] Full Name: required, min 2, max 200 chars
- [ ] Email: required, valid email format, max 255 chars
- [ ] Password: required, 8-128 chars, uppercase, lowercase, number, special character
- [ ] Confirm Password: must match password
- [ ] Role: required, buyer or merchant
- [ ] Shop Name: conditional required when role = merchant, max 255 chars
- [ ] License: conditional required when role = merchant, PDF only, max 10MB, named license.pdf
- [ ] Submit button disabled during submission
- [ ] Real-time password strength indicator with 5 requirements checklist

### Forgot Password Form
- [ ] React Hook Form + Zod schema validation
- [ ] Email: required, valid email format
- [ ] Submit button disabled during submission

### Reset Password Form
- [ ] React Hook Form + Zod schema validation
- [ ] New Password: required, 8-128 chars, same strength rules as Register
- [ ] Confirm Password: must match new password
- [ ] Submit button disabled during submission
- [ ] Token extracted from URL query parameter

---

## 11. Frontend — Error Handling

- [ ] 400: Inline field-level errors + top banner
- [ ] 401: "Invalid email or password" (generic, no credential leaking)
- [ ] 403: "Account is deactivated. Contact support"
- [ ] 409: "Email already registered" (inline on email field)
- [ ] 413: "File size exceeds limit"
- [ ] 415: "Only PDF files are supported for business license"
- [ ] 429: "Too many attempts. Try again later"
- [ ] 500: "Something went wrong" + retry button
- [ ] Network error: Toast "Network error. Check connection"
- [ ] Password reset: "Invalid or expired reset link. Please request a new one."

---

## 12. Frontend — State Management

- [ ] Auth state managed via `AuthProvider` context
- [ ] Login: stores accessToken in memory (never localStorage)
- [ ] Login: stores user profile in auth context
- [ ] Logout: clears auth context and redirects to /login
- [ ] Token refresh handled automatically via interceptor
- [ ] Loading states managed per form submission

---

## 13. Frontend — i18n

- [ ] Translation files: `frontend/src/i18n/locales/{en,ja,my}/auth.json`
- [ ] Login labels: `auth.login.*`
- [ ] Register labels: `auth.register.*`
- [ ] Forgot Password labels: `auth.forgotPassword.*`
- [ ] Reset Password labels: `auth.resetPassword.*`
- [ ] Error messages: `auth.errors.*`
- [ ] Password strength labels: `auth.register.passwordRequirement.*`
- [ ] Language toggle works on all auth pages (EN, JA, MY)

---

## 14. Frontend — Responsive Design

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile (default) | < 768px | Full-width card, stacked inputs, centered layout |
| Tablet (`md:`) | 768px - 1023px | Centered card with max-width 400px |
| Desktop (`lg:`) | 1024px+ | Centered card with max-width 400px, enhanced spacing |
| Wide (`xl:`) | 1280px+ | Centered card with max-width 400px |

---

## 15. Frontend — Accessibility

- [ ] Semantic HTML throughout (`<form>`, `<input>`, `<button>`, `<label>`)
- [ ] `aria-label` on all icon buttons (show/hide password)
- [ ] `aria-live="polite"` on error alerts
- [ ] Full keyboard navigation (Tab, Enter, Escape)
- [ ] WCAG AA color contrast (4.5:1 minimum)
- [ ] Focus indicators visible on all interactive elements
- [ ] `htmlFor`/`id` associations on all label-input pairs
- [ ] `role="alert"` on error messages

---

## 16. Frontend — Loading States

- [ ] Skeleton loader for initial page load
- [ ] Spinner on login button during submission ("Signing in...")
- [ ] Spinner on register button during submission ("Creating account...")
- [ ] Spinner on forgot password button during submission ("Sending...")
- [ ] Spinner on reset password button during submission ("Resetting...")
- [ ] Disabled state on all buttons during API calls

---

## 17. Caching

- [ ] No Redis caching for auth endpoints (security requirement)
- [ ] Refresh token rotation invalidates old tokens
- [ ] Token blacklist uses Redis with TTL matching remaining token expiry

---

## 18. Testing — Unit Tests

### Backend Unit Tests
- [ ] `AuthService.register()` — success case (buyer)
- [ ] `AuthService.register()` — success case (merchant with license)
- [ ] `AuthService.register()` — email already exists (409)
- [ ] `AuthService.register()` — invalid license type (415)
- [ ] `AuthService.register()` — license too large (413)
- [ ] `AuthService.register()` — missing shop name for merchant (400)
- [ ] `AuthService.login()` — valid credentials
- [ ] `AuthService.login()` — invalid email (401)
- [ ] `AuthService.login()` — invalid password (401)
- [ ] `AuthService.login()` — account deactivated (403)
- [ ] `AuthService.login()` — rate limit exceeded (429)
- [ ] `AuthService.refreshToken()` — valid token
- [ ] `AuthService.refreshToken()` — expired token (401)
- [ ] `AuthService.refreshToken()` — revoked token (401)
- [ ] `AuthService.refreshToken()` — token reuse detected (401)
- [ ] `AuthService.logout()` — success
- [ ] `AuthService.verifyToken()` — valid token
- [ ] `AuthService.verifyToken()` — invalid token (401)
- [ ] `AuthService.forgotPassword()` — success
- [ ] `AuthService.forgotPassword()` — rate limit (429)
- [ ] `AuthService.resetPassword()` — valid token
- [ ] `AuthService.resetPassword()` — invalid token (400)
- [ ] `AuthService.resetPassword()` — expired token (400)
- [ ] `AuthService.resetPassword()` — weak password (400)

### Frontend Unit Tests
- [ ] LoginForm renders all fields
- [ ] LoginForm validates email format
- [ ] LoginForm validates password length
- [ ] LoginForm toggles password visibility
- [ ] RegisterForm renders all fields with buyer selected by default
- [ ] RegisterForm shows license field when merchant selected
- [ ] RegisterForm validates password strength (5 rules)
- [ ] RegisterForm validates password match
- [ ] RegisterForm validates shop name when merchant
- [ ] PasswordStrengthIndicator shows correct strength levels
- [ ] LicenseUpload validates file type, size, and name

---

## 19. Testing — Integration Tests

- [ ] Register flow: create buyer → login → verify token
- [ ] Register flow: create merchant → login → verify merchant profile
- [ ] Login flow: valid credentials → token issued → access protected route
- [ ] Login flow: invalid credentials → 401 error
- [ ] Token refresh: expired access token → refresh → new token issued
- [ ] Logout: token blacklisted → access denied
- [ ] Password reset: request → email sent → reset → login with new password
- [ ] Rate limiting: 5 login attempts → 429 error
- [ ] Rate limiting: 3 forgot password attempts → 429 error
- [ ] Duplicate email: register → register again → 409 error

---

## 20. Testing — E2E Tests

### Normal (N)

- [x] **N-01**: Register as buyer successfully
  - **Precondition**: User is not authenticated
  - **Steps**:
    1. Navigate to `/register`
    2. Fill Full Name, Email, Password, Confirm Password
    3. Select Buyer role (default)
    4. Click "Create Account"
  - **Expected Result**: Success toast shown, redirect to `/login`
  - **Business Rules**: BR-AUTH-001, BR-AUTH-002, BR-AUTH-003, BR-AUTH-004
  - **API**: `POST /api/v1/auth/register`

- [x] **N-02**: Register as merchant with license upload
  - **Precondition**: User is not authenticated, has valid license.pdf ready
  - **Steps**:
    1. Navigate to `/register`
    2. Fill Full Name, Email, Password, Confirm Password
    3. Select Merchant role
    4. Fill Shop Name
    5. Upload license.pdf
    6. Click "Create Account"
  - **Expected Result**: Success toast shown, redirect to `/login`, merchant created with license_status='pending'
  - **Business Rules**: BR-AUTH-020, BR-AUTH-021, BR-AUTH-022, BR-AUTH-023, BR-AUTH-024, BR-AUTH-026
  - **API**: `POST /api/v1/auth/register`

- [x] **N-03**: Login with valid credentials
  - **Precondition**: User has existing account
  - **Steps**:
    1. Navigate to `/login`
    2. Enter valid email and password
    3. Click "Sign In"
  - **Expected Result**: Redirect to home page, JWT token stored in memory
  - **Business Rules**: BR-AUTH-006, BR-AUTH-007
  - **API**: `POST /api/v1/auth/login`

- [x] **N-04**: Logout successfully
  - **Precondition**: User is authenticated
  - **Steps**:
    1. Click user menu
    2. Select "Logout"
  - **Expected Result**: Redirect to `/login`, token blacklisted, protected routes inaccessible
  - **Business Rules**: BR-AUTH-015
  - **API**: `POST /api/v1/auth/logout`

- [x] **N-05**: Password visibility toggle works on login page
  - **Precondition**: User is on login page
  - **Steps**:
    1. Click eye icon on password field
    2. Verify password is visible (text type)
    3. Click eye icon again
    4. Verify password is hidden (password type)
  - **Expected Result**: Password toggles between visible and hidden
  - **Business Rules**: None (UI behavior)

- [x] **N-06**: Password visibility toggle works on register page
  - **Precondition**: User is on register page
  - **Steps**:
    1. Click eye icon on password field
    2. Verify password is visible
    3. Click eye icon on confirm password field
    4. Verify confirm password is visible
  - **Expected Result**: Both password fields toggle independently
  - **Business Rules**: None (UI behavior)

- [x] **N-07**: Language toggle works on auth pages
  - **Precondition**: User is on any auth page
  - **Steps**:
    1. Toggle language to Japanese
    2. Verify all labels change to Japanese
    3. Toggle language to Myanmar
    4. Verify all labels change to Myanmar
    5. Toggle back to English
  - **Expected Result**: All i18n labels update correctly
  - **Business Rules**: None (i18n behavior)

- [x] **N-08**: Theme toggle works on auth pages
  - **Precondition**: User is on any auth page
  - **Steps**:
    1. Toggle theme to dark mode
    2. Verify dark background colors applied
    3. Toggle theme to light mode
    4. Verify light background colors applied
  - **Expected Result**: Theme switches between light and dark
  - **Business Rules**: None (UI behavior)

- [x] **N-09**: Navigate from login to register page
  - **Precondition**: User is on login page
  - **Steps**:
    1. Click "Create one" link
  - **Expected Result**: Navigate to `/register`
  - **Business Rules**: None (navigation)

- [x] **N-10**: Navigate from register to login page
  - **Precondition**: User is on register page
  - **Steps**:
    1. Click "Sign in" link
  - **Expected Result**: Navigate to `/login`
  - **Business Rules**: None (navigation)

- [x] **N-11**: Navigate to forgot password page
  - **Precondition**: User is on login page
  - **Steps**:
    1. Click "Forgot password?" link
  - **Expected Result**: Navigate to `/forgot-password`
  - **Business Rules**: None (navigation)

- [x] **N-12**: Submit forgot password form successfully
  - **Precondition**: User is on forgot password page
  - **Steps**:
    1. Enter valid email
    2. Click "Send Reset Link"
  - **Expected Result**: Success message displayed, form replaced with message
  - **Business Rules**: BR-AUTH-034
  - **API**: `POST /api/v1/auth/forgot-password`

- [ ] **N-13**: Navigate back to login from forgot password
  - **Precondition**: User is on forgot password page
  - **Steps**:
    1. Click "Back to Login" link
  - **Expected Result**: Navigate to `/login`
  - **Business Rules**: None (navigation)

- [x] **N-14**: Reset password with valid token
  - **Precondition**: User has valid reset token from email
  - **Steps**:
    1. Navigate to `/reset-password?token=valid-token`
    2. Enter new password meeting all requirements
    3. Enter matching confirm password
    4. Click "Reset Password"
  - **Expected Result**: Success message displayed, can login with new password
  - **Business Rules**: BR-AUTH-030, BR-AUTH-031, BR-AUTH-035
  - **API**: `POST /api/v1/auth/reset-password`

- [ ] **N-15**: Navigate back to login from reset password
  - **Precondition**: User is on reset password page
  - **Steps**:
    1. Click "Back to Login" link
  - **Expected Result**: Navigate to `/login`
  - **Business Rules**: None (navigation)

### Abnormal (A)

- [x] **A-01**: Submit register form with empty fields
  - **Precondition**: User is on register page
  - **Steps**:
    1. Leave all fields empty
    2. Click "Create Account"
  - **Expected Result**: Validation errors displayed for all required fields
  - **Business Rules**: BR-AUTH-001, BR-AUTH-002
  - **API**: `POST /api/v1/auth/register`

- [x] **A-02**: Register with duplicate email
  - **Precondition**: User is on register page, email already exists
  - **Steps**:
    1. Fill form with existing email
    2. Click "Create Account"
  - **Expected Result**: "Email already registered" error on email field
  - **Business Rules**: BR-AUTH-001
  - **API**: `POST /api/v1/auth/register`

- [x] **A-03**: Register with weak password (missing uppercase)
  - **Precondition**: User is on register page
  - **Steps**:
    1. Enter password without uppercase letter
    2. Verify password requirement not met
  - **Expected Result**: Password strength indicator shows requirement not met
  - **Business Rules**: BR-AUTH-002

- [x] **A-04**: Register with weak password (missing lowercase)
  - **Precondition**: User is on register page
  - **Steps**:
    1. Enter password without lowercase letter
  - **Expected Result**: Password requirement not met indicator shown
  - **Business Rules**: BR-AUTH-002

- [x] **A-05**: Register with weak password (missing number)
  - **Precondition**: User is on register page
  - **Steps**:
    1. Enter password without number
  - **Expected Result**: Password requirement not met indicator shown
  - **Business Rules**: BR-AUTH-002

- [x] **A-06**: Register with weak password (missing special character)
  - **Precondition**: User is on register page
  - **Steps**:
    1. Enter password without special character
  - **Expected Result**: Password requirement not met indicator shown
  - **Business Rules**: BR-AUTH-002

- [x] **A-07**: Register with mismatched passwords
  - **Precondition**: User is on register page
  - **Steps**:
    1. Enter valid password
    2. Enter different confirm password
  - **Expected Result**: "Passwords do not match" error on confirm field
  - **Business Rules**: BR-AUTH-002

- [x] **A-08**: Login with invalid email
  - **Precondition**: User is on login page
  - **Steps**:
    1. Enter non-existent email
    2. Enter valid password
    3. Click "Sign In"
  - **Expected Result**: "Invalid email or password" error (generic)
  - **Business Rules**: BR-AUTH-009
  - **API**: `POST /api/v1/auth/login`

- [x] **A-09**: Login with invalid password
  - **Precondition**: User is on login page
  - **Steps**:
    1. Enter valid email
    2. Enter wrong password
    3. Click "Sign In"
  - **Expected Result**: "Invalid email or password" error (generic)
  - **Business Rules**: BR-AUTH-009
  - **API**: `POST /api/v1/auth/login`

- [x] **A-10**: Login with empty fields
  - **Precondition**: User is on login page
  - **Steps**:
    1. Leave all fields empty
    2. Click "Sign In"
  - **Expected Result**: Validation errors for email and password
  - **Business Rules**: BR-AUTH-006
  - **API**: `POST /api/v1/auth/login`

- [ ] **A-11**: Register as merchant without shop name
  - **Precondition**: User is on register page, Merchant role selected
  - **Steps**:
    1. Fill name, email, password, confirm password
    2. Leave shop name empty
    3. Upload license.pdf
    4. Click "Create Account"
  - **Expected Result**: "Shop name is required for merchant registration" error
  - **Business Rules**: BR-AUTH-026
  - **API**: `POST /api/v1/auth/register`

- [x] **A-12**: Register as merchant without license file
  - **Precondition**: User is on register page, Merchant role selected
  - **Steps**:
    1. Fill name, email, password, confirm password, shop name
    2. Do not upload license file
    3. Click "Create Account"
  - **Expected Result**: "Business license is required for merchant registration" error
  - **Business Rules**: BR-AUTH-020
  - **API**: `POST /api/v1/auth/register`

- [ ] **A-13**: Register as merchant with non-PDF license file
  - **Precondition**: User is on register page, Merchant role selected
  - **Steps**:
    1. Upload non-PDF file (e.g., image.jpg)
  - **Expected Result**: "File type not supported. Only PDF files are accepted." error
  - **Business Rules**: BR-AUTH-021
  - **API**: `POST /api/v1/auth/register`

- [ ] **A-14**: Register as merchant with license file exceeding 10MB
  - **Precondition**: User is on register page, Merchant role selected
  - **Steps**:
    1. Upload PDF file larger than 10MB
  - **Expected Result**: "File exceeds maximum size of 10 MB" error
  - **Business Rules**: BR-AUTH-023
  - **API**: `POST /api/v1/auth/register`

- [ ] **A-15**: Register as merchant with incorrectly named license file
  - **Precondition**: User is on register page, Merchant role selected
  - **Steps**:
    1. Upload PDF file named "mylicense.pdf"
  - **Expected Result**: "File must be named license.pdf" error
  - **Business Rules**: BR-AUTH-022
  - **API**: `POST /api/v1/auth/register`

- [ ] **A-16**: Submit forgot password with invalid email format
  - **Precondition**: User is on forgot password page
  - **Steps**:
    1. Enter invalid email format
    2. Click "Send Reset Link"
  - **Expected Result**: "Invalid email address" error
  - **Business Rules**: BR-AUTH-034
  - **API**: `POST /api/v1/auth/forgot-password`

- [x] **A-17**: Access protected route without authentication
  - **Precondition**: User is not authenticated
  - **Steps**:
    1. Navigate to protected route (e.g., `/merchant/products`)
  - **Expected Result**: Redirect to `/login`
  - **Business Rules**: BR-AUTH-006

- [ ] **A-18**: Submit reset password with mismatched passwords
  - **Precondition**: User is on reset password page with valid token
  - **Steps**:
    1. Enter valid new password
    2. Enter different confirm password
    3. Click "Reset Password"
  - **Expected Result**: "Passwords do not match" error
  - **Business Rules**: BR-AUTH-002

- [ ] **A-19**: Submit reset password with weak password
  - **Precondition**: User is on reset password page with valid token
  - **Steps**:
    1. Enter password that doesn't meet strength requirements
    2. Click "Reset Password"
  - **Expected Result**: Password strength errors displayed
  - **Business Rules**: BR-AUTH-002, BR-AUTH-035
  - **API**: `POST /api/v1/auth/reset-password`

- [ ] **A-20**: Submit reset password with invalid token
  - **Precondition**: User is on reset password page
  - **Steps**:
    1. Navigate to `/reset-password?token=invalid-token`
    2. Enter valid password
    3. Click "Reset Password"
  - **Expected Result**: "Invalid or expired reset link" error
  - **Business Rules**: BR-AUTH-030, BR-AUTH-031
  - **API**: `POST /api/v1/auth/reset-password`

### Boundary (B)

- [ ] **B-01**: Register with name at minimum length (2 chars)
  - **Precondition**: User is on register page
  - **Steps**:
    1. Enter name with exactly 2 characters
    2. Fill other valid fields
    3. Click "Create Account"
  - **Expected Result**: Registration successful
  - **Business Rules**: BR-AUTH-001

- [ ] **B-02**: Register with name at maximum length (200 chars)
  - **Precondition**: User is on register page
  - **Steps**:
    1. Enter name with exactly 200 characters
    2. Fill other valid fields
    3. Click "Create Account"
  - **Expected Result**: Registration successful
  - **Business Rules**: BR-AUTH-001

- [ ] **B-03**: Register with name exceeding maximum length (201 chars)
  - **Precondition**: User is on register page
  - **Steps**:
    1. Enter name with 201 characters
  - **Expected Result**: Validation error for name length
  - **Business Rules**: BR-AUTH-001

- [ ] **B-04**: Register with password at minimum length (8 chars)
  - **Precondition**: User is on register page
  - **Steps**:
    1. Enter password with exactly 8 characters meeting all strength rules
    2. Fill other valid fields
    3. Click "Create Account"
  - **Expected Result**: Registration successful
  - **Business Rules**: BR-AUTH-002

- [ ] **B-05**: Register with password at maximum length (128 chars)
  - **Precondition**: User is on register page
  - **Steps**:
    1. Enter password with exactly 128 characters meeting all strength rules
    2. Fill other valid fields
    3. Click "Create Account"
  - **Expected Result**: Registration successful
  - **Business Rules**: BR-AUTH-002

- [ ] **B-06**: Register with password exceeding maximum length (129 chars)
  - **Precondition**: User is on register page
  - **Steps**:
    1. Enter password with 129 characters
  - **Expected Result**: Validation error for password length
  - **Business Rules**: BR-AUTH-002

- [ ] **B-07**: Register with shop name at maximum length (255 chars)
  - **Precondition**: User is on register page, Merchant role selected
  - **Steps**:
    1. Enter shop name with exactly 255 characters
    2. Fill other valid fields including license
    3. Click "Create Account"
  - **Expected Result**: Registration successful
  - **Business Rules**: BR-AUTH-026

- [ ] **B-08**: Register with shop name exceeding maximum length (256 chars)
  - **Precondition**: User is on register page, Merchant role selected
  - **Steps**:
    1. Enter shop name with 256 characters
  - **Expected Result**: Validation error for shop name length
  - **Business Rules**: BR-AUTH-026

- [ ] **B-09**: Upload license file named "License.PDF" (case-insensitive)
  - **Precondition**: User is on register page, Merchant role selected
  - **Steps**:
    1. Upload PDF file named "License.PDF"
  - **Expected Result**: File accepted (case-insensitive check)
  - **Business Rules**: BR-AUTH-022

- [ ] **B-10**: Register with email at maximum length (255 chars)
  - **Precondition**: User is on register page
  - **Steps**:
    1. Enter email with exactly 255 characters (valid format)
    2. Fill other valid fields
    3. Click "Create Account"
  - **Expected Result**: Registration successful
  - **Business Rules**: BR-AUTH-001

- [ ] **B-11**: Register with email exceeding maximum length (256 chars)
  - **Precondition**: User is on register page
  - **Steps**:
    1. Enter email with 256 characters
  - **Expected Result**: Validation error for email length
  - **Business Rules**: BR-AUTH-001

- [ ] **B-12**: Single product in list — pagination hidden
  - **Precondition**: User is authenticated as merchant, has 1 product
  - **Steps**:
    1. Navigate to product list
  - **Expected Result**: Pagination component not visible
  - **Business Rules**: None (UI behavior)

- [ ] **B-13**: Empty product list shows "No products found" state
  - **Precondition**: User is authenticated as merchant, has 0 products
  - **Steps**:
    1. Navigate to product list
  - **Expected Result**: "No products found" message displayed
  - **Business Rules**: None (UI behavior)

### Interface (I)

- [ ] **I-01**: `POST /api/v1/auth/register` — returns 201 with user data
  - **Precondition**: Valid registration payload
  - **Steps**:
    1. Call `POST /api/v1/auth/register` with valid data
    2. Verify response status is 201
    3. Verify response contains `data` with user fields
  - **Expected Response**: `{ data: { id, email, name, role, merchantId, licenseStatus, emailVerified, createdAt } }`
  - **Business Rules**: BR-AUTH-001, BR-AUTH-003
  - **API**: `POST /api/v1/auth/register`

- [ ] **I-02**: `POST /api/v1/auth/register` — returns 409 for duplicate email
  - **Precondition**: Email already registered
  - **Steps**:
    1. Call `POST /api/v1/auth/register` with existing email
    2. Verify response status is 409
    3. Verify error code is `AUTH_007`
  - **Expected Response**: `{ statusCode: 409, error: "CONFLICT", errorCode: "AUTH_007" }`
  - **Business Rules**: BR-AUTH-001
  - **API**: `POST /api/v1/auth/register`

- [ ] **I-03**: `POST /api/v1/auth/login` — returns 200 with access token
  - **Precondition**: Valid credentials
  - **Steps**:
    1. Call `POST /api/v1/auth/login` with valid email/password
    2. Verify response status is 200
    3. Verify response contains `data.accessToken` and `data.user`
  - **Expected Response**: `{ data: { accessToken: "eyJ...", user: { id, email, name, role } } }`
  - **Business Rules**: BR-AUTH-006
  - **API**: `POST /api/v1/auth/login`

- [ ] **I-04**: `POST /api/v1/auth/login` — returns 401 for invalid credentials
  - **Precondition**: Invalid password
  - **Steps**:
    1. Call `POST /api/v1/auth/login` with wrong password
    2. Verify response status is 401
    3. Verify error code is `AUTH_001`
  - **Expected Response**: `{ statusCode: 401, error: "UNAUTHORIZED", errorCode: "AUTH_001" }`
  - **Business Rules**: BR-AUTH-009
  - **API**: `POST /api/v1/auth/login`

- [ ] **I-05**: `POST /api/v1/auth/refresh` — returns 200 with new access token
  - **Precondition**: Valid refresh token cookie
  - **Steps**:
    1. Call `POST /api/v1/auth/refresh` with valid refresh_token cookie
    2. Verify response status is 200
    3. Verify response contains `data.accessToken`
  - **Expected Response**: `{ data: { accessToken: "eyJ..." } }`
  - **Business Rules**: BR-AUTH-013
  - **API**: `POST /api/v1/auth/refresh`

- [ ] **I-06**: `POST /api/v1/auth/refresh` — returns 401 for expired refresh token
  - **Precondition**: Expired refresh token
  - **Steps**:
    1. Call `POST /api/v1/auth/refresh` with expired refresh_token cookie
    2. Verify response status is 401
  - **Expected Response**: `{ statusCode: 401, error: "UNAUTHORIZED" }`
  - **Business Rules**: BR-AUTH-011
  - **API**: `POST /api/v1/auth/refresh`

- [ ] **I-07**: `POST /api/v1/auth/logout` — returns 204 on success
  - **Precondition**: Valid access token
  - **Steps**:
    1. Call `POST /api/v1/auth/logout` with valid Authorization header
    2. Verify response status is 204
  - **Expected Response**: No content
  - **Business Rules**: BR-AUTH-015
  - **API**: `POST /api/v1/auth/logout`

- [ ] **I-08**: `GET /api/v1/auth/verify` — returns 200 with user profile
  - **Precondition**: Valid access token
  - **Steps**:
    1. Call `GET /api/v1/auth/verify` with valid Authorization header
    2. Verify response status is 200
    3. Verify response contains user data
  - **Expected Response**: `{ data: { id, email, name, role, isActive } }`
  - **Business Rules**: BR-AUTH-007
  - **API**: `GET /api/v1/auth/verify`

- [ ] **I-09**: `GET /api/v1/auth/verify` — returns 401 for blacklisted token
  - **Precondition**: Token blacklisted (user logged out)
  - **Steps**:
    1. Call `GET /api/v1/auth/verify` with blacklisted token
    2. Verify response status is 401
  - **Expected Response**: `{ statusCode: 401, error: "UNAUTHORIZED" }`
  - **Business Rules**: BR-AUTH-015
  - **API**: `GET /api/v1/auth/verify`

- [ ] **I-10**: `POST /api/v1/auth/forgot-password` — returns 200 with success message
  - **Precondition**: Valid email
  - **Steps**:
    1. Call `POST /api/v1/auth/forgot-password` with valid email
    2. Verify response status is 200
    3. Verify response contains success message
  - **Expected Response**: `{ data: { message: "If an account exists with that email..." } }`
  - **Business Rules**: BR-AUTH-034
  - **API**: `POST /api/v1/auth/forgot-password`

- [ ] **I-11**: `POST /api/v1/auth/forgot-password` — returns same response for non-existent email
  - **Precondition**: Email does not exist
  - **Steps**:
    1. Call `POST /api/v1/auth/forgot-password` with non-existent email
    2. Verify response status is 200
    3. Verify same success message returned
  - **Expected Response**: `{ data: { message: "If an account exists with that email..." } }`
  - **Business Rules**: BR-AUTH-034
  - **API**: `POST /api/v1/auth/forgot-password`

- [ ] **I-12**: `POST /api/v1/auth/reset-password` — returns 200 on success
  - **Precondition**: Valid token and strong password
  - **Steps**:
    1. Call `POST /api/v1/auth/reset-password` with valid token and password
    2. Verify response status is 200
    3. Verify success message
  - **Expected Response**: `{ data: { message: "Your password has been reset successfully." } }`
  - **Business Rules**: BR-AUTH-030, BR-AUTH-031, BR-AUTH-035
  - **API**: `POST /api/v1/auth/reset-password`

- [ ] **I-13**: `POST /api/v1/auth/reset-password` — returns 400 for invalid token
  - **Precondition**: Invalid token
  - **Steps**:
    1. Call `POST /api/v1/auth/reset-password` with invalid token
    2. Verify response status is 400
    3. Verify error code is `AUTH_009`
  - **Expected Response**: `{ statusCode: 400, error: "BAD_REQUEST", errorCode: "AUTH_009" }`
  - **Business Rules**: BR-AUTH-030, BR-AUTH-031
  - **API**: `POST /api/v1/auth/reset-password`

- [ ] **I-14**: `POST /api/v1/auth/reset-password` — returns 400 for weak password
  - **Precondition**: Valid token, weak password
  - **Steps**:
    1. Call `POST /api/v1/auth/reset-password` with valid token but weak password
    2. Verify response status is 400
  - **Expected Response**: `{ statusCode: 400, error: "BAD_REQUEST" }`
  - **Business Rules**: BR-AUTH-002, BR-AUTH-035
  - **API**: `POST /api/v1/auth/reset-password`

- [ ] **I-15**: Error response contains statusCode, message, error, timestamp, path
  - **Precondition**: Any error scenario
  - **Steps**:
    1. Trigger an error (e.g., invalid login)
    2. Verify response structure
  - **Expected Response**: `{ statusCode, message, error, timestamp, path }`
  - **Business Rules**: None (error format)
  - **API**: Any auth endpoint

- [ ] **I-16**: Login sets httpOnly refresh_token cookie
  - **Precondition**: Valid credentials
  - **Steps**:
    1. Call `POST /api/v1/auth/login` with valid credentials
    2. Verify Set-Cookie header contains refresh_token
    3. Verify cookie has httpOnly, secure, sameSite=strict flags
  - **Expected Response**: Set-Cookie header with refresh_token
  - **Business Rules**: BR-AUTH-017, BR-AUTH-018
  - **API**: `POST /api/v1/auth/login`

- [ ] **I-17**: Register with merchant role creates merchants record
  - **Precondition**: Valid merchant registration payload
  - **Steps**:
    1. Call `POST /api/v1/auth/register` with merchant role
    2. Verify response contains merchantId and licenseStatus='pending'
  - **Expected Response**: `{ data: { role: "merchant", merchantId: "uuid", licenseStatus: "pending" } }`
  - **Business Rules**: BR-AUTH-024
  - **API**: `POST /api/v1/auth/register`

- [ ] **I-18**: Register with buyer role has null merchantId and licenseStatus
  - **Precondition**: Valid buyer registration payload
  - **Steps**:
    1. Call `POST /api/v1/auth/register` with buyer role
    2. Verify response has null merchantId and licenseStatus
  - **Expected Response**: `{ data: { role: "buyer", merchantId: null, licenseStatus: null } }`
  - **Business Rules**: BR-AUTH-003
  - **API**: `POST /api/v1/auth/register`

- [ ] **I-19**: Product slug is URL-safe
  - **Precondition**: Product exists
  - **Steps**:
    1. Create product with name "Test Product"
    2. Verify slug is "test-product"
  - **Expected Result**: Slug contains only lowercase letters, numbers, and hyphens
  - **Business Rules**: None (slug generation)

- [ ] **I-20**: Product images array contains valid URLs
  - **Precondition**: Product with images exists
  - **Steps**:
    1. Get product detail
    2. Verify images array contains valid URLs
  - **Expected Result**: Each image URL is valid and accessible
  - **Business Rules**: None (data format)

- [ ] **I-21**: Product createdAt and updatedAt are ISO 8601 timestamps
  - **Precondition**: Product exists
  - **Steps**:
    1. Get product detail
    2. Verify createdAt and updatedAt format
  - **Expected Result**: Timestamps are valid ISO 8601 format
  - **Business Rules**: None (data format)

---

## 21. Performance

- [ ] Login API response time <= 500ms
- [ ] Register API response time <= 1s
- [ ] Token refresh API response time <= 200ms
- [ ] Password reset request API response time <= 1s
- [ ] Frontend page load <= 2s on 3G network
- [ ] Form submission feedback <= 100ms (optimistic UI)

---

## 22. Security

- [ ] JWT authentication on all protected endpoints
- [ ] Argon2id password hashing (64MB memory, 3 iterations, 4 threads)
- [ ] Access token stored in memory only (never localStorage)
- [ ] Refresh token in httpOnly, Secure, SameSite=Strict cookie
- [ ] Token rotation on every refresh request
- [ ] Token family tracking for breach detection
- [ ] Redis-based token blacklisting on logout
- [ ] Rate limiting: 5 login attempts per IP per 5 minutes
- [ ] Rate limiting: 3 forgot password requests per email per hour
- [ ] Generic error messages (no credential leaking)
- [ ] Input sanitization (XSS prevention)
- [ ] CORS protection on auth endpoints
- [ ] Password reset tokens expire after 24 hours
- [ ] Password reset tokens are single-use
- [ ] Email non-disclosure on password reset

---

## 23. Documentation

- [ ] API documentation via Swagger/OpenAPI
- [ ] All endpoints documented with request/response examples
- [ ] Error codes documented (AUTH_001-AUTH_009, VAL-AUTH-*)
- [ ] Business rules documented (BR-AUTH-001 to BR-AUTH-035)
- [ ] Screen items specification complete
- [ ] Functional specification complete
- [ ] Detailed design documents complete

---

## Sign-Off

| Item | Status |
|------|--------|
| All sections reviewed | ☑️ |
| Accuracy verified | ☑️ |
| Completeness confirmed | ☑️ |
| Next review date | 2026-09-30 |
