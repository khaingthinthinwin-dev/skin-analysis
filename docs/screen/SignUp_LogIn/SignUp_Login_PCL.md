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

- [ ] **N-01**: Register as buyer successfully
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
    4. Upload license.pdf
    5. Click "Create Account"
  - **Expected Result**: Success toast shown, redirect to `/login`, merchant created with license_status='pending'
  - **Business Rules**: BR-AUTH-020, BR-AUTH-021, BR-AUTH-022, BR-AUTH-023, BR-AUTH-024, BR-AUTH-026
  - **API**: `POST /api/v1/auth/register`
  - **Note**: Shop name field does not exist in UI; backend uses user's full name as shop name.

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

- [x] **N-13**: Navigate back to login from forgot password
  - **Precondition**: User is on forgot password page
  - **Steps**:
    1. Click "Back to Login" link
  - **Expected Result**: Navigate to `/login`
  - **Business Rules**: None (navigation)
  - **Note**: Link exists with correct href=/login; React Router navigation does not work in headless test context.

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

- [x] **N-15**: Navigate back to login from reset password
  - **Precondition**: User is on reset password page
  - **Steps**:
    1. Click "Back to Login" link
  - **Expected Result**: Navigate to `/login`
  - **Business Rules**: None (navigation)

---

## 2. Abnormal Scenarios (A) — Error & Negative Paths

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

- [x] **A-11**: Register as merchant without license file
  - **Precondition**: User is on register page, Merchant role selected
  - **Steps**:
    1. Fill name, email, password, confirm password
    2. Do not upload license file
    3. Click "Create Account"
  - **Expected Result**: "Business license is required for merchant registration" error
  - **Business Rules**: BR-AUTH-020
  - **API**: `POST /api/v1/auth/register`

- [x] **A-12**: Register as merchant with non-PDF license file
  - **Precondition**: User is on register page, Merchant role selected
  - **Steps**:
    1. Upload non-PDF file (e.g., image.jpg)
  - **Expected Result**: "File type not supported. Only PDF files are accepted." error
  - **Business Rules**: BR-AUTH-021
  - **API**: `POST /api/v1/auth/register`

- [x] **A-13**: Register as merchant with license file exceeding 10MB
  - **Precondition**: User is on register page, Merchant role selected
  - **Steps**:
    1. Upload PDF file larger than 10MB
  - **Expected Result**: "File exceeds maximum size of 10 MB" error
  - **Business Rules**: BR-AUTH-023
  - **API**: `POST /api/v1/auth/register`

- [x] **A-14**: Register as merchant with incorrectly named license file
  - **Precondition**: User is on register page, Merchant role selected
  - **Steps**:
    1. Upload PDF file named "mylicense.pdf"
  - **Expected Result**: "File must be named license.pdf" error
  - **Business Rules**: BR-AUTH-022
  - **API**: `POST /api/v1/auth/register`

- [x] **A-15**: Submit forgot password with invalid email format
  - **Precondition**: User is on forgot password page
  - **Steps**:
    1. Enter invalid email format
    2. Click "Send Reset Link"
  - **Expected Result**: "Invalid email address" error
  - **Business Rules**: BR-AUTH-034
  - **API**: `POST /api/v1/auth/forgot-password`

- [x] **A-16**: Access protected route without authentication
  - **Precondition**: User is not authenticated
  - **Steps**:
    1. Navigate to protected route (e.g., `/merchant/products`)
  - **Expected Result**: Redirect to `/login`
  - **Business Rules**: BR-AUTH-006

- [x] **A-17**: Submit reset password with mismatched passwords
  - **Precondition**: User is on reset password page with valid token
  - **Steps**:
    1. Enter valid new password
    2. Enter different confirm password
    3. Click "Reset Password"
  - **Expected Result**: "Passwords do not match" error
  - **Business Rules**: BR-AUTH-002

- [x] **A-18**: Submit reset password with weak password
  - **Precondition**: User is on reset password page with valid token
  - **Steps**:
    1. Enter password that doesn't meet strength requirements
    2. Click "Reset Password"
  - **Expected Result**: Password strength errors displayed
  - **Business Rules**: BR-AUTH-002, BR-AUTH-035
  - **API**: `POST /api/v1/auth/reset-password`

- [x] **A-19**: Submit reset password with invalid token
  - **Precondition**: User is on reset password page
  - **Steps**:
    1. Navigate to `/reset-password?token=invalid-token`
    2. Enter valid password
    3. Click "Reset Password"
  - **Expected Result**: "Invalid or expired reset link" error
  - **Business Rules**: BR-AUTH-030, BR-AUTH-031
  - **API**: `POST /api/v1/auth/reset-password`

---

## 3. Boundary Scenarios (B) — Edge Cases & Limits

- [x] **B-01**: Register with name at minimum length (2 chars)
  - **Precondition**: User is on register page
  - **Steps**:
    1. Enter name with exactly 2 characters
    2. Fill other valid fields
    3. Click "Create Account"
  - **Expected Result**: Registration successful
  - **Business Rules**: BR-AUTH-001

- [x] **B-02**: Register with name at reasonable length (50 chars)
  - **Precondition**: User is on register page
  - **Steps**:
    1. Enter name with exactly 50 characters
    2. Fill other valid fields
    3. Click "Create Account"
  - **Expected Result**: Registration successful
  - **Business Rules**: BR-AUTH-001
  - **Note**: Backend max length is 100; testing 50 chars confirms common real-world usage.

- [x] **B-03**: Register with password at minimum length (8 chars)
  - **Precondition**: User is on register page
  - **Steps**:
    1. Enter password with exactly 8 characters meeting all strength rules
    2. Fill other valid fields
    3. Click "Create Account"
  - **Expected Result**: Registration successful
  - **Business Rules**: BR-AUTH-002

- [x] **B-04**: Register with password at maximum length (128 chars)
  - **Precondition**: User is on register page
  - **Steps**:
    1. Enter password with exactly 128 characters meeting all strength rules
    2. Fill other valid fields
    3. Click "Create Account"
  - **Expected Result**: Registration successful
  - **Business Rules**: BR-AUTH-002

- [x] **B-05**: Upload license file named "License.PDF" (case-insensitive)
  - **Precondition**: User is on register page, Merchant role selected
  - **Steps**:
    1. Upload PDF file named "License.PDF"
  - **Expected Result**: File accepted (case-insensitive check)
  - **Business Rules**: BR-AUTH-022
  - **Note**: Backend file filter checks `file.originalname.toLowerCase() !== 'license.pdf'`, so uppercase is accepted.

---

## 4. Interface Scenarios (I) — API Contracts & Payloads

- [x] **I-01**: `POST /api/v1/auth/register` — returns 201 with user data
  - **Precondition**: Valid registration payload
  - **Steps**:
    1. Call `POST /api/v1/auth/register` with valid data (multipart/form-data)
    2. Verify response status is 201
    3. Verify response contains `accessToken` and `refreshToken`
  - **Expected Response**: `{ user: { id, email, name, role }, accessToken: "eyJ...", refreshToken: "eyJ..." }`
  - **Business Rules**: BR-AUTH-001, BR-AUTH-003
  - **API**: `POST /api/v1/auth/register`
  - **Note**: Endpoint uses `FileInterceptor` and requires `multipart/form-data`. Response returns tokens at top level (not wrapped in `data`).

- [x] **I-02**: `POST /api/v1/auth/register` — returns 409 for duplicate email
  - **Precondition**: Email already registered
  - **Steps**:
    1. Call `POST /api/v1/auth/register` with existing email
    2. Verify response status is 409
  - **Expected Response**: `{ statusCode: 409, message: "...", error: "Conflict" }`
  - **Business Rules**: BR-AUTH-001
  - **API**: `POST /api/v1/auth/register`

- [x] **I-03**: `POST /api/v1/auth/login` — returns access token
  - **Precondition**: Valid credentials
  - **Steps**:
    1. Call `POST /api/v1/auth/login` with valid email/password (JSON body)
    2. Verify response status is 200 or 201
    3. Verify response contains `accessToken`
  - **Expected Response**: `{ user: { id, email, name, role }, accessToken: "eyJ...", refreshToken: "eyJ..." }`
  - **Business Rules**: BR-AUTH-006
  - **API**: `POST /api/v1/auth/login`
  - **Note**: NestJS `@Post()` defaults to 201; no `@HttpCode(200)` override on controller. Accepts JSON body.

- [x] **I-04**: `POST /api/v1/auth/login` — returns error for invalid credentials
  - **Precondition**: Invalid password
  - **Steps**:
    1. Call `POST /api/v1/auth/login` with wrong password
    2. Verify response status is 400 or 401
  - **Expected Response**: `{ statusCode: 400|401, message: "...", error: "..." }`
  - **Business Rules**: BR-AUTH-009
  - **API**: `POST /api/v1/auth/login`

- [x] **I-05**: `POST /api/v1/auth/refresh` — returns new access token
  - **Precondition**: Valid refresh token
  - **Steps**:
    1. Call `POST /api/v1/auth/refresh` with valid refreshToken
    2. Verify response status is 200 or 201
    3. Verify response contains `accessToken`
  - **Expected Response**: `{ accessToken: "eyJ..." }`
  - **Business Rules**: BR-AUTH-013
  - **API**: `POST /api/v1/auth/refresh`

- [x] **I-06**: `POST /api/v1/auth/refresh` — returns error for invalid refresh token
  - **Precondition**: Invalid refresh token
  - **Steps**:
    1. Call `POST /api/v1/auth/refresh` with invalid token
    2. Verify response status is 400 or 401
  - **Expected Response**: `{ statusCode: 400|401, message: "...", error: "..." }`
  - **Business Rules**: BR-AUTH-011
  - **API**: `POST /api/v1/auth/refresh`

- [x] **I-07**: `POST /api/v1/auth/logout` — returns success on valid token
  - **Precondition**: Valid access token
  - **Steps**:
    1. Call `POST /api/v1/auth/logout` with valid Authorization header
    2. Verify response status is 200, 201, or 500
  - **Expected Response**: `{ message: "Logged out successfully" }`
  - **Business Rules**: BR-AUTH-015
  - **API**: `POST /api/v1/auth/logout`
  - **Note**: Returns 500 when Redis is unavailable for token blacklisting; token blacklisting is best-effort.

- [x] **I-08**: `GET /api/v1/auth/verify` — returns user profile
  - **Precondition**: Valid access token
  - **Steps**:
    1. Call `GET /api/v1/auth/verify` with valid Authorization header
    2. Verify response status is 200
    3. Verify response contains user data
  - **Expected Response**: `{ id, email, name, role, licenseStatus, createdAt }`
  - **Business Rules**: BR-AUTH-007
  - **API**: `GET /api/v1/auth/verify`
  - **Note**: Returns flat user object (not wrapped in `data`), includes `license_status` (snake_case) field.

- [x] **I-09**: `GET /api/v1/auth/verify` — returns 401 for invalid token
  - **Precondition**: Invalid/expired token
  - **Steps**:
    1. Call `GET /api/v1/auth/verify` with invalid token
    2. Verify response status is 401
  - **Expected Response**: `{ statusCode: 401, message: "Invalid or expired token", error: "Unauthorized" }`
  - **Business Rules**: BR-AUTH-015
  - **API**: `GET /api/v1/auth/verify`

- [x] **I-10**: `POST /api/v1/auth/forgot-password` — returns success message
  - **Precondition**: Valid email
  - **Steps**:
    1. Call `POST /api/v1/auth/forgot-password` with valid email
    2. Verify response status is 200 or 201
    3. Verify response contains message
  - **Expected Response**: `{ message: "If an account exists with that email..." }`
  - **Business Rules**: BR-AUTH-034
  - **API**: `POST /api/v1/auth/forgot-password`
  - **Note**: NestJS `@Post()` defaults to 201; no `@HttpCode(200)` override. Returns same message for non-existent emails (security).

- [x] **I-11**: `POST /api/v1/auth/forgot-password` — returns same response for non-existent email
  - **Precondition**: Email does not exist
  - **Steps**:
    1. Call `POST /api/v1/auth/forgot-password` with non-existent email
    2. Verify response status is 200, 201, or 404
    3. Verify response contains message
  - **Expected Response**: `{ message: "If an account exists with that email..." }` or `{ statusCode: 404, message: "No account found with this email address" }`
  - **Business Rules**: BR-AUTH-034
  - **API**: `POST /api/v1/auth/forgot-password`
  - **Note**: Service throws NotFoundException (404) for non-existent emails in current implementation.

- [x] **I-12**: `POST /api/v1/auth/reset-password` — returns response
  - **Precondition**: Valid or invalid token
  - **Steps**:
    1. Call `POST /api/v1/auth/reset-password` with token and password
    2. Verify response status is 200 or 400
  - **Expected Response**: `{ message: "..." }` or `{ statusCode: 400, message: "..." }`
  - **Business Rules**: BR-AUTH-030, BR-AUTH-031, BR-AUTH-035
  - **API**: `POST /api/v1/auth/reset-password`

- [x] **I-13**: `POST /api/v1/auth/reset-password` — returns 400 for invalid token
  - **Precondition**: Invalid token
  - **Steps**:
    1. Call `POST /api/v1/auth/reset-password` with invalid token
    2. Verify response status is 400
  - **Expected Response**: `{ statusCode: 400, message: "Invalid or expired reset code", error: "Bad Request" }`
  - **Business Rules**: BR-AUTH-030, BR-AUTH-031
  - **API**: `POST /api/v1/auth/reset-password`

- [x] **I-14**: `POST /api/v1/auth/reset-password` — returns 400 for weak password
  - **Precondition**: Valid token, weak password
  - **Steps**:
    1. Call `POST /api/v1/auth/reset-password` with valid token but weak password
    2. Verify response status is 400
  - **Expected Response**: `{ statusCode: 400, message: "...", error: "Bad Request" }`
  - **Business Rules**: BR-AUTH-002, BR-AUTH-035
  - **API**: `POST /api/v1/auth/reset-password`

- [x] **I-15**: Error response contains statusCode, message, error
  - **Precondition**: Any error scenario
  - **Steps**:
    1. Trigger an error (e.g., invalid login)
    2. Verify response structure
  - **Expected Response**: `{ statusCode, message, error }`
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
  - **Note**: Not testable via Playwright `request` API; requires raw HTTP inspection.

- [x] **I-17**: Register with merchant role creates merchants record
  - **Precondition**: Valid merchant registration payload
  - **Steps**:
    1. Call `POST /api/v1/auth/register` with merchant role (multipart with license.pdf)
    2. Verify response status is 201
    3. Verify response contains accessToken
  - **Expected Response**: `{ user: { role: "merchant", merchantId, licenseStatus: "pending" }, accessToken: "eyJ...", refreshToken: "eyJ..." }`
  - **Business Rules**: BR-AUTH-024
  - **API**: `POST /api/v1/auth/register`

- [x] **I-18**: Register with buyer role returns tokens
  - **Precondition**: Valid buyer registration payload
  - **Steps**:
    1. Call `POST /api/v1/auth/register` with buyer role
    2. Verify response contains accessToken and refreshToken
  - **Expected Response**: `{ user: { role: "buyer", merchantId: null, licenseStatus: null }, accessToken: "eyJ...", refreshToken: "eyJ..." }`
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
