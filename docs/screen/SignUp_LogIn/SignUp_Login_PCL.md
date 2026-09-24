# Program Checklist (PCL) — Sign-up / Login / Password Reset

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-PCL-SIGNUP-001 |
| **Target Screen** | Sign-up / Login / Password Reset |
| **Subsystem** | Authentication |
| **Version** | 2.1 |
| **Created** | 2026-09-16 |
| **Last Updated** | 2026-09-17 |
| **Status** | Active |

---

## 1. Normal Scenarios (N) — Happy Path

- [x] **N-01**: Register as buyer successfully
  - **Evidence**:
    - Screenshot of the Register page with valid input values entered → `N-01_form_filled.png`
    - Screenshot of the Login page after redirection to /login → `N-01_redirected_to_login.png`
    - DB users row after successful buyer registration → `N-01_db_user.png`
    - DB users row after successful buyer registration → `N-01_db_user.json`
    - Test: register.spec.ts › "should register as buyer successfully" — passed
  - **Precondition**: User is not authenticated
  - **Steps**:
    1. Navigate to `/register`
    2. Fill Full Name, Email, Password, Confirm Password
    3. Select Buyer role (default)
    4. Click "Create Account"
  - **Expected Result**: Success — account created, show success message, redirect to `/login`
  - **Business Rules**: BR-AUTH-001, BR-AUTH-002, BR-AUTH-003, BR-AUTH-004
  - **API**: `POST /api/v1/auth/register`

- [x] **N-02**: Register as merchant with license upload
  - **Evidence**:
    - `N-02_role_selected_merchant.png`
    - `N-02_license_uploaded.png`
    - `N-02_redirected_to_login.png`
    - DB users + merchants after merchant registration with license → `N-02_db_merchant.png`
    - DB users + merchants after merchant registration with license → `N-02_db_merchant.json`
    - Test: auth.spec.ts › "should register as merchant with license file upload" — passed
  - **Precondition**: User is not authenticated, has valid license.pdf ready
  - **Steps**:
    1. Navigate to `/register`
    2. Fill Full Name, Email, Password, Confirm Password
    3. Select Merchant role
    4. Upload license.pdf
    5. Click "Create Account"
  - **Expected Result**: Success — merchant account created, license saved for review, redirect to `/login`
  - **Business Rules**: BR-AUTH-020, BR-AUTH-021, BR-AUTH-022, BR-AUTH-023, BR-AUTH-024, BR-AUTH-026
  - **API**: `POST /api/v1/auth/register`
  - **Note**: Shop name field does not exist in UI; backend uses user's full name as shop name.

- [x] **N-03**: Login with valid credentials
  - **Evidence**:
    - Screenshot of the Login page with valid email and password entered (before Sign In) → `N-03_1_login_form_filled.png`
    - Screenshot of the buyer dashboard after successful login → `N-03_2_buyer_dashboard_after_login.png`
    - Test: login.spec.ts › "should login as buyer and redirect to buyer dashboard" — passed
  - **Precondition**: User has existing account
  - **Steps**:
    1. Navigate to `/login`
    2. Enter valid email and password
    3. Click "Sign In"
  - **Expected Result**: Success — logged in, show “Logged in successfully”, redirect to home / buyer dashboard
  - **Business Rules**: BR-AUTH-006, BR-AUTH-007
  - **API**: `POST /api/v1/auth/login`

- [x] **N-04**: Logout successfully
  - **Evidence**:
    - Screenshot of buyer dashboard before logout → `N-04_dashboard_before_logout.png`
    - Screenshot of home page after logout → `N-04_after_logout_redirect.png`
    - Test: auth.spec.ts › "should log out buyer and clear session" — passed
  - **Precondition**: User is authenticated
  - **Steps**:
    1. Click user menu
    2. Select "Logout"
  - **Expected Result**: Success — logged out, go to home `/`, protected pages send user to `/login`
  - **Business Rules**: BR-AUTH-015
  - **API**: `POST /api/v1/auth/logout`

- [x] **N-05**: Password visibility toggle works on login page
  - **Evidence**:
    - `N-05_password_masked.png`
    - `N-05_password_revealed.png`
    - `N-05_password_masked_again.png`
    - Test: auth.spec.ts › "should toggle password visibility on login page" — passed
  - **Precondition**: User is on login page
  - **Steps**:
    1. Click eye icon on password field
    2. Verify password is visible (text type)
    3. Click eye icon again
    4. Verify password is hidden (password type)
  - **Expected Result**: Password shows as plain text when eye is on, hides again when eye is off
  - **Business Rules**: None (UI behavior)

- [x] **N-06**: Password visibility toggle works on register page
  - **Evidence**:
    - `N-06_password_visible.png`
    - Test: register.spec.ts › "should toggle password visibility" — passed
  - **Precondition**: User is on register page
  - **Steps**:
    1. Click eye icon on password field
    2. Verify password is visible
    3. Click eye icon on confirm password field
    4. Verify confirm password is visible
  - **Expected Result**: Password and Confirm Password each show/hide on their own eye icon
  - **Business Rules**: None (UI behavior)

- [x] **N-07**: Language toggle works on auth pages
  - **Evidence**:
    - `N-07_lang_initial.png`
    - `N-07_lang_japanese.png`
    - `N-07_lang_english.png`
    - Test: auth.spec.ts › "should switch language on auth pages" — passed
  - **Precondition**: User is on any auth page
  - **Steps**:
    1. Toggle language to Japanese
    2. Verify all labels change to Japanese
    3. Toggle language to Myanmar
    4. Verify all labels change to Myanmar
    5. Toggle back to English
  - **Expected Result**: All labels switch to the selected language (Japanese / Myanmar / English)
  - **Business Rules**: None (i18n behavior)

- [x] **N-08**: Theme toggle works on auth pages
  - **Evidence**:
    - `N-08_theme_initial.png`
    - `N-08_theme_toggled.png`
    - `N-08_theme_toggled_back.png`
    - Test: auth.spec.ts › "should toggle light and dark theme on auth pages" — passed
  - **Precondition**: User is on any auth page
  - **Steps**:
    1. Toggle theme to dark mode
    2. Verify dark background colors applied
    3. Toggle theme to light mode
    4. Verify light background colors applied
  - **Expected Result**: Page theme switches between light mode and dark mode
  - **Business Rules**: None (UI behavior)

- [x] **N-09**: Navigate from login to register page
  - **Evidence**:
    - `N-09_navigated_to_register.png`
    - Test: login.spec.ts › "should navigate to register page when clicking Create Account" — passed
  - **Precondition**: User is on login page
  - **Steps**:
    1. Click "Create one" link
  - **Expected Result**: Open Create Account page — redirect to `/register`
  - **Business Rules**: None (navigation)

- [x] **N-10**: Navigate from register to login page
  - **Evidence**:
    - `N-10_navigated_to_login.png`
    - Test: register.spec.ts › "should navigate to login page when clicking Already have an account" — passed
  - **Precondition**: User is on register page
  - **Steps**:
    1. Click "Sign in" link
  - **Expected Result**: Open Login page — redirect to `/login`
  - **Business Rules**: None (navigation)

- [x] **N-11**: Navigate to forgot password page
  - **Evidence**:
    - `N-11_forgot_password_link_visible.png`
    - `N-11_navigated_to_forgot_password.png`
    - Test: login.spec.ts › "should navigate to forgot password page" — passed
  - **Precondition**: User is on login page
  - **Steps**:
    1. Click "Forgot password?" link
  - **Expected Result**: Open Forgot Password page — redirect to `/forgot-password`
  - **Business Rules**: None (navigation)

- [x] **N-12**: Submit forgot password form and open verification-code page
  - **Evidence**:
    - `N-12_page_loaded.png`
    - `N-12_verify_code_page.png`
    - Test: forgot-password.spec.ts › "should submit forgot password form and show success message" — passed
  - **Precondition**: User is on forgot password page
  - **Steps**:
    1. Enter valid email
    2. Click "Send Reset Link"
  - **Expected Result**: Success — request is accepted and the user is redirected to `/verify-code` to enter the emailed verification code
  - **Business Rules**: BR-AUTH-034
  - **API**: `POST /api/v1/auth/forgot-password`

- [x] **N-13**: Navigate back to login from forgot password
  - **Evidence**:
    - `N-13_forgot_password_page.png`
    - `N-13_back_to_login_link.png`
    - Test: forgot-password.spec.ts › "should have back to login link on forgot password page" — passed
  - **Precondition**: User is on forgot password page
  - **Steps**:
    1. Click "Back to Login" link
  - **Expected Result**: Open Login page — redirect to `/login` (from Forgot Password)

- [x] **N-14**: Reset password with valid token
  - **Evidence**:
    - `N-14_reset_form_filled.png`
    - `N-14_success_message.png`
    - `N-14_login_with_new_password.png`
    - Test: reset-password.spec.ts › "should reset password with valid verification code and login with new password" — passed
  - **Precondition**: User has valid reset token from email
  - **Steps**:
    1. Navigate to `/reset-password?token=valid-token`
    2. Enter new password meeting all requirements
    3. Enter matching confirm password
    4. Click "Reset Password"
  - **Expected Result**: Success — password updated, show success message, user can log in with the new password
  - **Business Rules**: BR-AUTH-030, BR-AUTH-031, BR-AUTH-035
  - **API**: `POST /api/v1/auth/reset-password`
  - **Note**: No e2e for valid-token success flow yet (existing test only covers guard redirect when opened without a code). Left unchecked until a real test exists.

- [x] **N-15**: Navigate back to login from reset password
  - **Evidence**:
    - `N-15_redirect_to_forgot.png`
    - Test: reset-password.spec.ts › "should navigate back to login page from reset password" — passed
  - **Precondition**: User is on reset password page
  - **Steps**:
    1. Click "Back to Login" link
  - **Expected Result**: Open Login page — redirect to `/login` (from Reset Password)

- [x] **N-16**: Responsive layout on desktop viewport
  - **Evidence**:
    - `N-16_desktop_login.png`
    - Test: auth.spec.ts › "should display login correctly on desktop viewport" — passed
  - **Precondition**: User is on any auth page (login / register / forgot-password / reset-password)
  - **Steps**:
    1. Set viewport to 1280×720
    2. Navigate to `/login` (and spot-check `/register`, `/forgot-password`)
    3. Verify form container centered, no horizontal scroll, labels/inputs aligned
  - **Expected Result**: Desktop layout displays correctly — max-width form card, no overflow
  - **Business Rules**: None (Responsive)
  - **Note**: No e2e test yet; left unchecked until a real test exists.

- [x] **N-17**: Responsive layout on mobile viewport
  - **Evidence**:
    - `N-17_mobile_login.png`
    - Test: auth.spec.ts › "should display login correctly on mobile viewport" — passed
  - **Precondition**: User is on any auth page
  - **Steps**:
    1. Set viewport to 375×667 (iPhone SE size)
    2. Navigate to `/login` (and spot-check `/register`)
    3. Verify form stacks full-width, buttons tappable, page scrolls vertically only
  - **Expected Result**: Mobile layout stacks and scrolls correctly — no horizontal scroll, no clipped inputs
  - **Business Rules**: None (Responsive)
  - **Note**: No e2e test yet; left unchecked until a real test exists.

- [x] **N-18**: No horizontal scroll on auth pages at narrow width
  - **Evidence**:
    - `N-18_320px_register.png`
    - Test: auth.spec.ts › "should have no horizontal overflow at 320px width" — passed
  - **Precondition**: User is on auth pages
  - **Steps**:
    1. Set viewport to 320×568 (minimum supported)
    2. Visit `/register`
    3. Check `document.documentElement.scrollWidth <= clientWidth`
  - **Expected Result**: Zero horizontal overflow even at 320px width
  - **Business Rules**: None (Responsive)
  - **Note**: No e2e test yet; left unchecked until a real test exists.

---

## 2. Abnormal Scenarios (A) — Error & Negative Paths

- [x] **A-01**: Submit register form with empty fields
  - **Evidence**:
    - `A-01_empty_form_errors.png`
    - Test: register.spec.ts › "should show errors for empty form submission" — passed
  - **Precondition**: User is on register page
  - **Steps**:
    1. Leave all fields empty
    2. Click "Create Account"
  - **Expected Result**: Show validation errors under empty required fields; account not created
  - **Business Rules**: BR-AUTH-001, BR-AUTH-002
  - **API**: `POST /api/v1/auth/register`

- [x] **A-02**: Register with duplicate email
  - **Evidence**:
    - `A-02_duplicate_email.png`
    - DB users count — still 1 row after duplicate email attempt → `A-02_db_user_count.png`
    - DB users count — still 1 row after duplicate email attempt → `A-02_db_user_count.json`
    - Test: register.spec.ts › "should show error for duplicate email" — passed
  - **Precondition**: User is on register page, email already exists
  - **Steps**:
    1. Fill form with existing email
    2. Click "Create Account"
  - **Expected Result**: Failed — show "Email already registered" under email; account not created
  - **Business Rules**: BR-AUTH-001
  - **API**: `POST /api/v1/auth/register`

- [x] **A-03**: Register with weak password (missing uppercase)
  - **Evidence**:
    - `A-03_missing_uppercase.png`
    - Test: register.spec.ts › "should show error for password missing uppercase" — passed
  - **Precondition**: User is on register page
  - **Steps**:
    1. Enter password without uppercase letter
    2. Verify password requirement not met
  - **Expected Result**: Failed — password checklist shows "One uppercase letter (A-Z)" not met
  - **Business Rules**: BR-AUTH-002

- [x] **A-04**: Register with weak password (missing lowercase)
  - **Evidence**:
    - `A-04_missing_lowercase.png`
    - Test: register.spec.ts › "should show error for password missing lowercase" — passed
  - **Precondition**: User is on register page
  - **Steps**:
    1. Enter password without lowercase letter
  - **Expected Result**: Failed — password checklist shows "One lowercase letter (a-z)" not met
  - **Business Rules**: BR-AUTH-002

- [x] **A-05**: Register with weak password (missing number)
  - **Evidence**:
    - `A-05_missing_number.png`
    - Test: register.spec.ts › "should show error for password missing number" — passed
  - **Precondition**: User is on register page
  - **Steps**:
    1. Enter password without number
  - **Expected Result**: Failed — password checklist shows "One number (0-9)" not met
  - **Business Rules**: BR-AUTH-002

- [x] **A-06**: Register with weak password (missing special character)
  - **Evidence**:
    - `A-06_missing_special.png`
    - Test: register.spec.ts › "should show error for password missing special character" — passed
  - **Precondition**: User is on register page
  - **Steps**:
    1. Enter password without special character
  - **Expected Result**: Failed — password checklist shows "One special character" not met
  - **Business Rules**: BR-AUTH-002

- [x] **A-07**: Register with mismatched passwords
  - **Evidence**:
    - `A-07_password_mismatch.png`
    - Test: register.spec.ts › "should show error for password mismatch" — passed
  - **Precondition**: User is on register page
  - **Steps**:
    1. Enter valid password
    2. Enter different confirm password
  - **Expected Result**: Failed — show "Passwords do not match" under Confirm Password; account not created
  - **Business Rules**: BR-AUTH-002

- [x] **A-08**: Login with invalid email
  - **Evidence**:
    - `A-08_invalid_email_error.png`
    - Test: login.spec.ts › "should show error with invalid email" — passed
  - **Precondition**: User is on login page
  - **Steps**:
    1. Enter non-existent email
    2. Enter valid password
    3. Click "Sign In"
  - **Expected Result**: Failed — show "Invalid email or password"; stay on login page (same message for wrong email)
  - **Business Rules**: BR-AUTH-009
  - **API**: `POST /api/v1/auth/login`

- [x] **A-09**: Login with invalid password
  - **Evidence**:
    - `A-09_invalid_password_error.png`
    - Test: login.spec.ts › "should show error with invalid password" — passed
  - **Precondition**: User is on login page
  - **Steps**:
    1. Enter valid email
    2. Enter wrong password
    3. Click "Sign In"
  - **Expected Result**: Failed — show "Invalid email or password"; stay on login page (same message for wrong password)
  - **Business Rules**: BR-AUTH-009
  - **API**: `POST /api/v1/auth/login`

- [x] **A-10**: Login with empty fields
  - **Evidence**:
    - `A-10_empty_email.png`
    - Test: login.spec.ts › "should show validation error for empty fields" — passed
  - **Precondition**: User is on login page
  - **Steps**:
    1. Leave all fields empty
    2. Click "Sign In"
  - **Expected Result**: Failed — show validation errors for empty email and password; stay on login page
  - **Business Rules**: BR-AUTH-006
  - **API**: `POST /api/v1/auth/login`

- [x] **A-11**: Register as merchant without license file
  - **Evidence**:
    - `A-11_no_license.png`
    - Test: register.spec.ts › "should show error for merchant without license" — passed
  - **Precondition**: User is on register page, Merchant role selected
  - **Steps**:
    1. Fill name, email, password, confirm password
    2. Do not upload license file
    3. Click "Create Account"
  - **Expected Result**: Failed — show "Business license is required for merchant registration"; account not created
  - **Business Rules**: BR-AUTH-020
  - **API**: `POST /api/v1/auth/register`

- [x] **A-12**: Register as merchant with non-PDF license file
  - **Evidence**:
    - `A-12_non_pdf_license.png`
    - Test: register.spec.ts › "should show error for non-PDF license file" — passed
  - **Precondition**: User is on register page, Merchant role selected
  - **Steps**:
    1. Upload non-PDF file (e.g., image.jpg)
  - **Expected Result**: Failed — show "File type not supported. Only PDF files are accepted."; file not accepted
  - **Business Rules**: BR-AUTH-021
  - **API**: `POST /api/v1/auth/register`

- [x] **A-13**: Register as merchant with license file exceeding 10MB
  - **Evidence**:
    - `A-13_oversized_license.png`
    - Test: register.spec.ts › "should show error for license file exceeding 10MB" — passed
  - **Precondition**: User is on register page, Merchant role selected
  - **Steps**:
    1. Upload PDF file larger than 10MB
  - **Expected Result**: Failed — show "File exceeds maximum size of 10 MB"; file not accepted
  - **Business Rules**: BR-AUTH-023
  - **API**: `POST /api/v1/auth/register`

- [x] **A-14**: Register as merchant with incorrectly named license file
  - **Evidence**:
    - `A-14_bad_license_name.png`
    - Test: register.spec.ts › "should show error for incorrectly named license file" — passed
  - **Precondition**: User is on register page, Merchant role selected
  - **Steps**:
    1. Upload PDF file named "mylicense.pdf"
  - **Expected Result**: Failed — show "File must be named license.pdf"; file not accepted
  - **Business Rules**: BR-AUTH-022
  - **API**: `POST /api/v1/auth/register`

- [x] **A-15**: Submit forgot password with invalid email format
  - **Evidence**:
    - `A-15_page_for_validation.png`
    - `A-15_invalid_email_error.png`
    - Test: forgot-password.spec.ts › "should show validation error for invalid email format" — passed
  - **Precondition**: User is on forgot password page
  - **Steps**:
    1. Enter invalid email format
    2. Click "Send Reset Link"
  - **Expected Result**: Failed — show "Invalid email address" under email; reset link not sent
  - **Business Rules**: BR-AUTH-034
  - **API**: `POST /api/v1/auth/forgot-password`

- [x] **A-16**: Access protected route without authentication
  - **Evidence**:
    - `A-16_redirect_to_login.png`
    - Test: auth.spec.ts › "should redirect to login when accessing protected route without authentication" — passed
  - **Precondition**: User is not authenticated
  - **Steps**:
    1. Navigate to protected route (e.g., `/merchant/products`)
  - **Expected Result**: Not logged in — cannot open protected page, redirect to `/login`
  - **Business Rules**: BR-AUTH-006
  - **Note**: No e2e test yet for this scenario (previously a wrong-credentials test was incorrectly mapped here). Left unchecked until a real test exists.

- [x] **A-17**: Submit reset password with mismatched passwords
  - **Evidence**:
    - Screenshots: (none captured)
    - Test: reset-password.spec.ts › "should show error for password mismatch on reset form" — passed
  - **Precondition**: User is on reset password page with valid token
  - **Steps**:
    1. Enter valid new password
    2. Enter different confirm password
    3. Click "Reset Password"
  - **Expected Result**: Failed — show "Passwords do not match"; password not changed
  - **Business Rules**: BR-AUTH-002

- [x] **A-18**: Submit reset password with weak password
  - **Evidence**:
    - Screenshots: (none captured)
    - Test: reset-password.spec.ts › "should show error for weak password on reset form" — passed
  - **Precondition**: User is on reset password page with valid token
  - **Steps**:
    1. Enter password that doesn't meet strength requirements
    2. Click "Reset Password"
  - **Expected Result**: Failed — show password strength errors; password not changed
  - **Business Rules**: BR-AUTH-002, BR-AUTH-035
  - **API**: `POST /api/v1/auth/reset-password`

- [x] **A-19**: Submit reset password with invalid token
  - **Evidence**:
    - `A-19_redirect_to_forgot.png`
    - Test: reset-password.spec.ts › "should show error for invalid reset token" — passed
  - **Precondition**: User is on reset password page
  - **Steps**:
    1. Navigate to `/reset-password?token=invalid-token`
    2. Enter valid password
    3. Click "Reset Password"
  - **Expected Result**: Failed — show "Invalid or expired reset link"; password not changed (link goes to Forgot Password)
  - **Business Rules**: BR-AUTH-030, BR-AUTH-031
  - **API**: `POST /api/v1/auth/reset-password`

---

## 3. Boundary Scenarios (B) — Edge Cases & Limits

- [x] **B-01**: Register with name at minimum length (2 chars)
  - **Evidence**:
    - `B-01_name_min.png`
    - DB users row — name length 2 accepted → `B-01_db_user.png`
    - DB users row — name length 2 accepted → `B-01_db_user.json`
    - Test: register.spec.ts › "should accept name at minimum length (2 chars)" — passed
  - **Precondition**: User is on register page
  - **Steps**:
    1. Enter name with exactly 2 characters
    2. Fill other valid fields
    3. Click "Create Account"
  - **Expected Result**: Success — 2-char name accepted, account created, redirect to `/login`
  - **Business Rules**: BR-AUTH-001

- [x] **B-02**: Register with name at reasonable length (50 chars)
  - **Evidence**:
    - `B-02_name_max.png`
    - DB users row — name length 50 accepted → `B-02_db_user.png`
    - DB users row — name length 50 accepted → `B-02_db_user.json`
    - Test: register.spec.ts › "should accept name at reasonable length (50 chars)" — passed
  - **Precondition**: User is on register page
  - **Steps**:
    1. Enter name with exactly 50 characters
    2. Fill other valid fields
    3. Click "Create Account"
  - **Expected Result**: Success — 50-char name accepted, account created, redirect to `/login`
  - **Business Rules**: BR-AUTH-001
  - **Note**: Backend max length is 100; testing 50 chars confirms common real-world usage.

- [x] **B-03**: Register with password at minimum length (8 chars)
  - **Evidence**:
    - `B-03_pw_min.png`
    - DB users row — 8-char password accepted → `B-03_db_user.png`
    - DB users row — 8-char password accepted → `B-03_db_user.json`
    - Test: register.spec.ts › "should accept password at minimum length (8 chars)" — passed
  - **Precondition**: User is on register page
  - **Steps**:
    1. Enter password with exactly 8 characters meeting all strength rules
    2. Fill other valid fields
    3. Click "Create Account"
  - **Expected Result**: Success — 8-char password accepted, account created, redirect to `/login`
  - **Business Rules**: BR-AUTH-002

- [x] **B-04**: Register with password at maximum length (128 chars)
  - **Evidence**:
    - `B-04_pw_max.png`
    - DB users row — 128-char password accepted → `B-04_db_user.png`
    - DB users row — 128-char password accepted → `B-04_db_user.json`
    - Test: register.spec.ts › "should accept password at maximum length (128 chars)" — passed
  - **Precondition**: User is on register page
  - **Steps**:
    1. Enter password with exactly 128 characters meeting all strength rules
    2. Fill other valid fields
    3. Click "Create Account"
  - **Expected Result**: Success — 128-char password accepted, account created, redirect to `/login`
  - **Business Rules**: BR-AUTH-002

- [x] **B-05**: Upload license file named "License.PDF" (case-insensitive)
  - **Evidence**:
    - `B-05_license_case.png`
    - DB users + merchants — License.PDF accepted (license_status) → `B-05_db_merchant.png`
    - DB users + merchants — License.PDF accepted (license_status) → `B-05_db_merchant.json`
    - Test: register.spec.ts › "should accept license file named License.PDF (uppercase)" — passed
  - **Precondition**: User is on register page, Merchant role selected
  - **Steps**:
    1. Upload PDF file named "License.PDF"
  - **Expected Result**: Success — License.PDF accepted (name check is case-insensitive); merchant form can submit
  - **Business Rules**: BR-AUTH-022
  - **Note**: Backend file filter checks `file.originalname.toLowerCase() !== 'license.pdf'`, so uppercase is accepted.

---

## 4. Interface Scenarios (I) — API Contracts & Payloads

> API contract tests (`api-auth.spec.ts`) — **no screenshots by design**. Evidence lines reference the test title and status only.

- [x] **I-01**: `POST /api/v1/auth/register` — returns 201 with user data
  - **Evidence**:
    - API test — no screenshot
    - Test: api-auth.spec.ts › "should return 201 with user data for valid buyer registration" — passed
  - **Precondition**: Valid registration payload
  - **Steps**:
    1. Call `POST /api/v1/auth/register` with valid data (multipart/form-data)
    2. Verify response status is 201
    3. Verify response contains `accessToken` and `refreshToken`
  - **Expected Response**: Success — HTTP 201 Created; body has user info plus accessToken and refreshToken
  - **Business Rules**: BR-AUTH-001, BR-AUTH-003
  - **API**: `POST /api/v1/auth/register`
  - **Note**: Endpoint uses `FileInterceptor` and requires `multipart/form-data`. Response returns tokens at top level (not wrapped in `data`).

- [x] **I-02**: `POST /api/v1/auth/register` — returns 409 for duplicate email
  - **Evidence**:
    - API test — no screenshot
    - Test: api-auth.spec.ts › "should return 409 when registering with existing email" — passed
  - **Precondition**: Email already registered
  - **Steps**:
    1. Call `POST /api/v1/auth/register` with existing email
    2. Verify response status is 409
  - **Expected Response**: Conflict — HTTP 409; message says email already registered
  - **Business Rules**: BR-AUTH-001
  - **API**: `POST /api/v1/auth/register`

- [x] **I-03**: `POST /api/v1/auth/login` — returns access token
  - **Evidence**:
    - API test — no screenshot
    - Test: api-auth.spec.ts › "should return accessToken for valid credentials" — passed
  - **Precondition**: Valid credentials
  - **Steps**:
    1. Call `POST /api/v1/auth/login` with valid email/password (JSON body)
    2. Verify response status is 200 or 201
    3. Verify response contains `accessToken`
  - **Expected Response**: Success — HTTP 200/201; body has user info plus accessToken and refreshToken
  - **Business Rules**: BR-AUTH-006
  - **API**: `POST /api/v1/auth/login`
  - **Note**: NestJS `@Post()` defaults to 201; no `@HttpCode(200)` override on controller. Accepts JSON body.

- [x] **I-04**: `POST /api/v1/auth/login` — returns error for invalid credentials
  - **Evidence**:
    - API test — no screenshot
    - Test: api-auth.spec.ts › "should return 401 for wrong password" — passed
  - **Precondition**: Invalid password
  - **Steps**:
    1. Call `POST /api/v1/auth/login` with wrong password
    2. Verify response status is 400 or 401
  - **Expected Response**: Failed — HTTP 400 or 401; message is "Invalid email or password" (generic)
  - **Business Rules**: BR-AUTH-009
  - **API**: `POST /api/v1/auth/login`

- [x] **I-05**: `POST /api/v1/auth/refresh` — returns new access token
  - **Evidence**:
    - API test — no screenshot
    - Test: api-auth.spec.ts › "should return new accessToken on valid refresh" — passed
  - **Precondition**: Valid refresh token
  - **Steps**:
    1. Call `POST /api/v1/auth/refresh` with valid refreshToken
    2. Verify response status is 200 or 201
    3. Verify response contains `accessToken`
  - **Expected Response**: Success — HTTP 200/201; body has a new accessToken
  - **Business Rules**: BR-AUTH-013
  - **API**: `POST /api/v1/auth/refresh`

- [x] **I-06**: `POST /api/v1/auth/refresh` — returns error for invalid refresh token
  - **Evidence**:
    - API test — no screenshot
    - Test: api-auth.spec.ts › "should return error for invalid refresh token" — passed
  - **Precondition**: Invalid refresh token
  - **Steps**:
    1. Call `POST /api/v1/auth/refresh` with invalid token
    2. Verify response status is 400 or 401
  - **Expected Response**: Failed — HTTP 400 or 401; refresh token rejected
  - **Business Rules**: BR-AUTH-011
  - **API**: `POST /api/v1/auth/refresh`

- [x] **I-07**: `POST /api/v1/auth/logout` — returns success on valid token
  - **Evidence**:
    - API test — no screenshot
    - Test: api-auth.spec.ts › "should return success on successful logout" — passed
  - **Precondition**: Valid access token
  - **Steps**:
    1. Call `POST /api/v1/auth/logout` with valid Authorization header
    2. Verify response status is 200, 201, or 500
  - **Expected Response**: Success — HTTP 200/201 (or 500 if Redis down); message "Logged out successfully"
  - **Business Rules**: BR-AUTH-015
  - **API**: `POST /api/v1/auth/logout`
  - **Note**: Returns 500 when Redis is unavailable for token blacklisting; token blacklisting is best-effort.

- [x] **I-08**: `GET /api/v1/auth/verify` — returns user profile
  - **Evidence**:
    - API test — no screenshot
    - Test: api-auth.spec.ts › "should return user data for valid token" — passed
  - **Precondition**: Valid access token
  - **Steps**:
    1. Call `GET /api/v1/auth/verify` with valid Authorization header
    2. Verify response status is 200
    3. Verify response contains user data
  - **Expected Response**: Success — HTTP 200; body is the logged-in user profile (id, email, name, role, …)
  - **Business Rules**: BR-AUTH-007
  - **API**: `GET /api/v1/auth/verify`
  - **Note**: Returns flat user object (not wrapped in `data`), includes `license_status` (snake_case) field.

- [x] **I-09**: `GET /api/v1/auth/verify` — returns 401 for invalid token
  - **Evidence**:
    - API test — no screenshot
    - Test: api-auth.spec.ts › "should return 401 for invalid/expired token" — passed
  - **Precondition**: Invalid/expired token
  - **Steps**:
    1. Call `GET /api/v1/auth/verify` with invalid token
    2. Verify response status is 401
  - **Expected Response**: Failed — HTTP 401 Unauthorized; message "Invalid or expired token"
  - **Business Rules**: BR-AUTH-015
  - **API**: `GET /api/v1/auth/verify`

- [x] **I-10**: `POST /api/v1/auth/forgot-password` — returns success message
  - **Evidence**:
    - API test — no screenshot
    - Test: api-auth.spec.ts › "should return success message for valid email" — passed
  - **Precondition**: Valid email
  - **Steps**:
    1. Call `POST /api/v1/auth/forgot-password` with valid email
    2. Verify response status is 200 or 201
    3. Verify response contains message
  - **Expected Response**: Success — HTTP 200/201; message "If an account exists with that email…" (reset email sent if account exists)
  - **Business Rules**: BR-AUTH-034
  - **API**: `POST /api/v1/auth/forgot-password`
  - **Note**: NestJS `@Post()` defaults to 201; no `@HttpCode(200)` override. Returns same message for non-existent emails (security).

- [x] **I-11**: `POST /api/v1/auth/forgot-password` — returns same response for non-existent email
  - **Evidence**:
    - API test — no screenshot
    - Test: api-auth.spec.ts › "should return error or same message for non-existent email" — passed
  - **Precondition**: Email does not exist
  - **Steps**:
    1. Call `POST /api/v1/auth/forgot-password` with non-existent email
    2. Verify response status is 200, 201, or 404
    3. Verify response contains message
  - **Expected Response**: Same reply as a real email (or HTTP 404 in current code) — do not reveal whether the account exists
  - **Business Rules**: BR-AUTH-034
  - **API**: `POST /api/v1/auth/forgot-password`
  - **Note**: Service throws NotFoundException (404) for non-existent emails in current implementation.

- [x] **I-12**: `POST /api/v1/auth/reset-password` — returns response
  - **Evidence**:
    - API test — no screenshot
    - Test: api-auth.spec.ts › "should return response for reset password request" — passed
  - **Precondition**: Valid or invalid token
  - **Steps**:
    1. Call `POST /api/v1/auth/reset-password` with token and password
    2. Verify response status is 200 or 400
  - **Expected Response**: HTTP 200 if reset works, or HTTP 400 with an error message if token/password is bad
  - **Business Rules**: BR-AUTH-030, BR-AUTH-031, BR-AUTH-035
  - **API**: `POST /api/v1/auth/reset-password`

- [x] **I-13**: `POST /api/v1/auth/reset-password` — returns 400 for invalid token
  - **Evidence**:
    - API test — no screenshot
    - Test: api-auth.spec.ts › "should return 400 for invalid reset token" — passed
  - **Precondition**: Invalid token
  - **Steps**:
    1. Call `POST /api/v1/auth/reset-password` with invalid token
    2. Verify response status is 400
  - **Expected Response**: Failed — HTTP 400; message "Invalid or expired reset code"
  - **Business Rules**: BR-AUTH-030, BR-AUTH-031
  - **API**: `POST /api/v1/auth/reset-password`

- [x] **I-14**: `POST /api/v1/auth/reset-password` — returns 400 for weak password
  - **Evidence**:
    - API test — no screenshot
    - Test: api-auth.spec.ts › "should return 400 for weak password" — passed
  - **Precondition**: Valid token, weak password
  - **Steps**:
    1. Call `POST /api/v1/auth/reset-password` with valid token but weak password
    2. Verify response status is 400
  - **Expected Response**: Failed — HTTP 400 Bad Request; password does not meet strength rules
  - **Business Rules**: BR-AUTH-002, BR-AUTH-035
  - **API**: `POST /api/v1/auth/reset-password`

- [x] **I-15**: Error response contains statusCode, message, error
  - **Evidence**:
    - API test — no screenshot
    - Test: api-auth.spec.ts › "should return error with statusCode, message, error" — passed
  - **Precondition**: Any error scenario
  - **Steps**:
    1. Trigger an error (e.g., invalid login)
    2. Verify response structure
  - **Expected Response**: Error format — always has statusCode, message, and error fields
  - **Business Rules**: None (error format)
  - **API**: Any auth endpoint

- [ ] **I-16**: Login sets httpOnly refresh_token cookie
  - **Precondition**: Valid credentials
  - **Steps**:
    1. Call `POST /api/v1/auth/login` with valid credentials
    2. Verify Set-Cookie header contains refresh_token
    3. Verify cookie has httpOnly, secure, sameSite=strict flags
  - **Expected Response**: Login response sets a refresh_token cookie that is HttpOnly, Secure, SameSite=strict
  - **Business Rules**: BR-AUTH-017, BR-AUTH-018
  - **API**: `POST /api/v1/auth/login`
  - **Note**: Not testable via Playwright `request` API; requires raw HTTP inspection.

- [x] **I-17**: Register with merchant role creates merchants record
  - **Evidence**:
    - API test — no screenshot
    - Test: api-auth.spec.ts › "should return merchant data for merchant registration" — passed
  - **Precondition**: Valid merchant registration payload
  - **Steps**:
    1. Call `POST /api/v1/auth/register` with merchant role (multipart with license.pdf)
    2. Verify response status is 201
    3. Verify response contains accessToken
  - **Expected Response**: Success — HTTP 201; user role is merchant, licenseStatus is pending, tokens returned
  - **Business Rules**: BR-AUTH-024
  - **API**: `POST /api/v1/auth/register`

- [x] **I-18**: Register with buyer role returns tokens
  - **Evidence**:
    - API test — no screenshot
    - Test: api-auth.spec.ts › "should return tokens for buyer registration" — passed
  - **Precondition**: Valid buyer registration payload
  - **Steps**:
    1. Call `POST /api/v1/auth/register` with buyer role
    2. Verify response contains accessToken and refreshToken
  - **Expected Response**: Success — HTTP 201; user role is buyer (no merchant fields), tokens returned
  - **Business Rules**: BR-AUTH-003
  - **API**: `POST /api/v1/auth/register`

---

## Sign-Off

| Item | Status |
|------|--------|
| Test scenarios defined (N, A, B, I) | ☑️ |
| E2E tests implemented | ☑️ |
| PCL auto-update verified | ☑️ |
| Next review date | 2026-09-30 |
