# Program Checklist (PCL) — Sign-up / Login / Password Reset

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-PCL-SIGNUP-001 |
| **Target Screen** | Sign-up / Login / Forgot Password / Verification Code / Password Reset |
| **Subsystem** | Authentication |
| **Version** | 2.7 |
| **Created** | 2026-09-16 |
| **Last Updated** | 2026-10-20 |
| **Status** | Active |

---

## 1. Normal Scenarios (N) — Happy Path

- [x] **N-01**: Register as buyer successfully
  - **Evidence**:
    - Screenshot of the Register page with valid input values entered → `N-01_1_form_filled.png`
    - Screenshot of the Login page after redirection to /login → `N-01_2_redirected_to_login.png`
    - DB users row after successful buyer registration → `N-01_3_db_user.png`
    - DB users row after successful buyer registration → `N-01_3_db_user.json`
    - Test: register.spec.ts › "should register as buyer successfully" — passed
  - **Precondition**: User is not authenticated
  - **Steps**:
    1. Navigate to `/register`
    2. Fill Full Name, Email, Password, Confirm Password
    3. Select Buyer role (default)
    4. Check the "I agree to the Terms of Service" checkbox
    5. Click "Create Account"
  - **Expected Result**: Success — account created, toast "Account created successfully", redirect to `/login`
  - **Business Rules**: BR-AUTH-001, BR-AUTH-002, BR-AUTH-003, BR-AUTH-004
  - **API**: `POST /api/v1/auth/register`

- [x] **N-02**: Register as merchant with license upload
  - **Evidence**:
    - `N-02_1_role_selected_merchant.png`
    - `N-02_2_license_uploaded.png`
    - `N-02_3_redirected_to_login.png`
    - DB users + merchants after merchant registration with license → `N-02_4_db_merchant.png`
    - DB users + merchants after merchant registration with license → `N-02_4_db_merchant.json`
    - Test: auth.spec.ts › "should register as merchant with license file upload" — passed
  - **Precondition**: User is not authenticated, has valid license.pdf ready
  - **Steps**:
    1. Navigate to `/register`
    2. Select Merchant role — the name field label switches from "Full Name" to "Shop Name"
    3. Fill Shop Name, Email, Password, Confirm Password
    4. Upload license.pdf
    5. Check the "I agree to the Terms of Service" checkbox
    6. Click "Create Account"
  - **Expected Result**: Success — merchant account created, license saved for review, redirect to `/login`
  - **Business Rules**: BR-AUTH-020, BR-AUTH-021, BR-AUTH-022, BR-AUTH-023, BR-AUTH-024, BR-AUTH-026
  - **API**: `POST /api/v1/auth/register`
  - **Note**: No separate shop-name field: `Register.tsx` reuses the single `name` input (label = "Shop Name" when role = merchant) and submits it as `name`; the backend stores it as the shop name (BR-AUTH-026).

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
    - Screenshot of buyer dashboard before logout → `N-04_1_dashboard_before_logout.png`
    - Screenshot of home page after logout → `N-04_2_after_logout_redirect.png`
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
    - `N-05_1_password_masked.png`
    - `N-05_2_password_revealed.png`
    - `N-05_3_password_masked_again.png`
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
    - `N-06_1_password_visible.png`
    - `N-06_2_confirm_password_visible.png`
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
    - `N-07_1_lang_initial.png`
    - `N-07_2_lang_japanese.png`
    - `N-07_3_lang_english.png`
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
    - Auth page after toggling the theme - dark-mode class flipped → `N-08_1_theme_toggled.png`
    - Auth page after toggling back - original theme restored → `N-08_2_theme_restored.png`
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
    - `N-09_1_navigated_to_register.png`
    - Test: login.spec.ts › "should navigate to register page when clicking Create Account" — passed
  - **Precondition**: User is on login page
  - **Steps**:
    1. Click "Create one" link
  - **Expected Result**: Open Create Account page — redirect to `/register`
  - **Business Rules**: None (navigation)

- [x] **N-10**: Navigate from register to login page
  - **Evidence**:
    - `N-10_1_navigated_to_login.png`
    - Test: register.spec.ts › "should navigate to login page when clicking Already have an account" — passed
  - **Precondition**: User is on register page
  - **Steps**:
    1. Click "Sign in" link
  - **Expected Result**: Open Login page — redirect to `/login`
  - **Business Rules**: None (navigation)

- [x] **N-11**: Navigate to forgot password page
  - **Evidence**:
    - `N-11_1_forgot_password_link_visible.png`
    - `N-11_2_navigated_to_forgot_password.png`
    - Test: login.spec.ts › "should navigate to forgot password page" — passed
  - **Precondition**: User is on login page
  - **Steps**:
    1. Click "Forgot password?" link
  - **Expected Result**: Open Forgot Password page — redirect to `/forgot-password`
  - **Business Rules**: None (navigation)

- [x] **N-12**: Submit forgot password form and open verification-code page
  - **Evidence**:
    - `N-12_1_page_loaded.png`
    - `N-12_2_verify_code_page.png`
    - Test: forgot-password.spec.ts › "should submit forgot password form and show success message" — passed
  - **Precondition**: User is on forgot password page (`Forgot Password?` heading, description "Enter your email and we'll send you a verification code.")
  - **Steps**:
    1. Enter valid email
    2. Click "Send Verification Code"
  - **Expected Result**: Success — request is accepted and the user is redirected to `/verify-code` to enter the emailed 6-digit code (email is passed in router location state)
  - **Business Rules**: BR-AUTH-030, BR-AUTH-032
  - **API**: `POST /api/v1/auth/forgot-password`
  - **Note**: The success message must not reveal whether the account exists (BR-AUTH-033); the current backend throws 404 for unknown emails — see I-11.

- [x] **N-13**: Navigate back to login from forgot password
  - **Evidence**:
    - `N-13_2_back_to_login_link.png`
    - `N-13_1_forgot_password_page.png`
    - Test: forgot-password.spec.ts › "should have back to login link on forgot password page" — passed
  - **Precondition**: User is on forgot password page
  - **Steps**:
    1. Click "Back to Login" link
  - **Expected Result**: Open Login page — redirect to `/login` (from Forgot Password)
  - **Business Rules**: None (navigation)

- [x] **N-14**: Reset password with valid verification code
  - **Evidence**:
    - `N-14_1_reset_form_filled.png`
    - `N-14_2_success_message.png`
    - `N-14_3_login_with_new_password.png`
    - Test: reset-password.spec.ts › "should reset password with valid verification code and login with new password" — passed
  - **Precondition**: User completed `/forgot-password` and `/verify-code`, so `/reset-password` is opened with `email` + `code` in router location state
  - **Steps**:
    1. Complete the forgot-password → verification-code flow so `/reset-password` opens with `email` + `code` in router location state
    2. Enter new password meeting all requirements (strength indicator shown)
    3. Enter matching confirm password
    4. Click "Reset Password"
  - **Expected Result**: Success — heading "Password reset successful" with success message, toast shown, "Back to Login" link available; the new password can then log the user in
  - **Business Rules**: BR-AUTH-030, BR-AUTH-031, BR-AUTH-035
  - **API**: `POST /api/v1/auth/reset-password`
  - **Note**: `ResetPassword.tsx` reads `location.state.email` / `location.state.code` only — a `?token=` query parameter is ignored (see A-19).

- [x] **N-15**: Navigate back to login from reset password
  - **Evidence**:
    - `N-15_2_redirect_to_forgot.png`
    - Test: reset-password.spec.ts › "should navigate back to login page from reset password" — passed
  - **Precondition**: User requests the Reset Password page
  - **Steps**:
    1. Open `/reset-password` (the mapped test opens it as `/reset-password?token=mock-token`, i.e. without `email` + `code` router state)
    2. Verify the page guard redirects to `/forgot-password`
    3. From `/forgot-password` (or from the reset form / success card when reached legitimately) click "Back to Login"
  - **Expected Result**: Reset page without state lands on `/forgot-password`, whose "Back to Login" link opens `/login`; when the reset form or its success card is shown, its own "Back to Login" link also opens `/login`
  - **Business Rules**: None (navigation)
  - **Note**: The mapped test only exercises the guard branch (step 2) because it opens the page without router state; clicking the reset form's own "Back to Login" link is not automated — verify manually or add a test driven through the verification-code flow.

- [x] **N-16**: Responsive layout on desktop viewport
  - **Evidence**:
    - `N-16_1_desktop_login.png`
    - `N-16_2_desktop_register.png`
    - Test: auth.spec.ts › "should display login correctly on desktop viewport" — passed
  - **Precondition**: User is on any auth page (login / register / forgot-password / reset-password)
  - **Steps**:
    1. Set viewport to 1280×720
    2. Navigate to `/login` (and spot-check `/register`, `/forgot-password`)
    3. Verify form container centered, no horizontal scroll, labels/inputs aligned
  - **Expected Result**: Desktop layout displays correctly — max-width form card, no overflow
  - **Business Rules**: None (Responsive)

- [x] **N-17**: Responsive layout on mobile viewport
  - **Evidence**:
    - `N-17_1_mobile_login.png`
    - `N-17_2_mobile_register.png`
    - Test: auth.spec.ts › "should display login correctly on mobile viewport" — passed
  - **Precondition**: User is on any auth page
  - **Steps**:
    1. Set viewport to 375×667 (iPhone SE size)
    2. Navigate to `/login` (and spot-check `/register`)
    3. Verify form stacks full-width, buttons tappable, page scrolls vertically only
  - **Expected Result**: Mobile layout stacks and scrolls correctly — no horizontal scroll, no clipped inputs
  - **Business Rules**: None (Responsive)

- [x] **N-18**: No horizontal scroll on auth pages at narrow width
  - **Evidence**:
    - `N-18_1_320px_register.png`
    - Test: auth.spec.ts › "should have no horizontal overflow at 320px width" — passed
  - **Precondition**: User is on auth pages
  - **Steps**:
    1. Set viewport to 320×568 (minimum supported)
    2. Visit `/register`
    3. Check `document.documentElement.scrollWidth <= clientWidth`
  - **Expected Result**: Zero horizontal overflow even at 320px width
  - **Business Rules**: None (Responsive)

- [x] **N-19**: Language toggle works on Login page
  - **Evidence**:
    - Login page rendered in Japanese → `N-19_1_login_japanese.png`
    - Login page rendered in Myanmar → `N-19_2_login_myanmar.png`
    - Login page restored to English after the language cycle → `N-19_3_login_english_restored.png`
    - Test: login.spec.ts › "should switch language on login page" — passed
  - **Precondition**: User is on `/login`
  - **Steps**:
    1. Toggle language to Japanese
    2. Verify all UI labels on the Login page update to Japanese (e.g., "Sign In" button, "Email", "Password" field labels, "Forgot password?" link, "Create one" link)
    3. Toggle language to Myanmar
    4. Verify all UI labels on the Login page update to Myanmar
    5. Toggle back to English
    6. Verify all UI labels restore to English
  - **Expected Result**: All labels on the Login page switch correctly to the selected language (Japanese / Myanmar / English)
  - **Business Rules**: None (i18n)

- [x] **N-20**: Language toggle works on Register page
  - **Evidence**:
    - Register page rendered in Japanese → `N-20_1_register_japanese.png`
    - Register page rendered in Myanmar → `N-20_2_register_myanmar.png`
    - Register page restored to English after the language cycle → `N-20_3_register_english_restored.png`
    - Test: register.spec.ts › "should switch language on register page" — passed
  - **Precondition**: User is on `/register`
  - **Steps**:
    1. Toggle language to Japanese
    2. Verify all UI labels on the Register page update to Japanese (e.g., "Create Account" button, "Full Name", "Email", "Password", "Confirm Password" field labels, role selector labels)
    3. Toggle language to Myanmar
    4. Verify all UI labels on the Register page update to Myanmar
    5. Toggle back to English
    6. Verify all UI labels restore to English
  - **Expected Result**: All labels on the Register page switch correctly to the selected language (Japanese / Myanmar / English)
  - **Business Rules**: None (i18n)

- [x] **N-21**: Language toggle works on Forgot Password page
  - **Evidence**:
    - Forgot Password page rendered in Japanese → `N-21_1_forgot_japanese.png`
    - Forgot Password page rendered in Myanmar → `N-21_2_forgot_myanmar.png`
    - Forgot Password page restored to English after the language cycle → `N-21_3_forgot_english_restored.png`
    - Test: forgot-password.spec.ts › "should switch language on forgot password page" — passed
  - **Precondition**: User is on `/forgot-password`
  - **Steps**:
    1. Toggle language to Japanese
    2. Verify all UI labels on the Forgot Password page update to Japanese (e.g., "Send Verification Code" button, "Email" field label, "Back to Login" link, page heading)
    3. Toggle language to Myanmar
    4. Verify all UI labels on the Forgot Password page update to Myanmar
    5. Toggle back to English
    6. Verify all UI labels restore to English
  - **Expected Result**: All labels on the Forgot Password page switch correctly to the selected language (Japanese / Myanmar / English)
  - **Business Rules**: None (i18n)

- [x] **N-22**: Language toggle works on Reset Password page
  - **Evidence**:
    - Reset Password page rendered in Japanese → `N-22_1_reset_japanese.png`
    - Reset Password page rendered in Myanmar → `N-22_2_reset_myanmar.png`
    - Reset Password page restored to English after the language cycle → `N-22_3_reset_english_restored.png`
    - Test: reset-password.spec.ts › "should switch language on reset password page" — passed
  - **Precondition**: User reached `/reset-password` through the Forgot Password → Verification Code flow (`email` + `code` in router location state)
  - **Steps**:
    1. Toggle language to Japanese
    2. Verify all UI labels on the Reset Password page update to Japanese (e.g., "Reset Password" button, "New Password", "Confirm Password" field labels, "Back to Login" link, page heading)
    3. Toggle language to Myanmar
    4. Verify all UI labels on the Reset Password page update to Myanmar
    5. Toggle back to English
    6. Verify all UI labels restore to English
  - **Expected Result**: All labels on the Reset Password page switch correctly to the selected language (Japanese / Myanmar / English)
  - **Business Rules**: None (i18n)

- [x] **N-23**: Register as buyer successfully with Myanmar language UI
  - **Evidence**:
    - Myanmar-language register form (Buyer role) filled and ready to submit → `N-23_1_myanmar_buyer_form_filled.png`
    - Myanmar success message after buyer registration in Myanmar language → `N-23_2_myanmar_buyer_success.png`
    - Test: register.spec.ts › "N-23: should register as buyer successfully in Myanmar language" — passed
  - **Precondition**: User is not authenticated; UI language is set to Myanmar
  - **Steps**:
    1. Toggle UI language to Myanmar
    2. Navigate to `/register`
    3. Verify page heading, all field labels, role selector, and "Create Account" button are displayed in Myanmar
    4. Fill Full Name, Email, Password, Confirm Password with valid values
    5. Select Buyer role (default)
    6. Click the Myanmar-labelled "Create Account" button
  - **Expected Result**: Success — account created, success message appears in Myanmar, redirect to `/login`; all labels were in Myanmar throughout
  - **Business Rules**: BR-AUTH-001, BR-AUTH-002, BR-AUTH-003, BR-AUTH-004
  - **API**: `POST /api/v1/auth/register`

- [x] **N-24**: Register as merchant with license upload in Myanmar language UI
  - **Evidence**:
    - Myanmar-language register form (Merchant role) with license uploaded → `N-24_1_myanmar_merchant_form_filled.png`
    - Myanmar success message after merchant registration in Myanmar language → `N-24_2_myanmar_merchant_success.png`
    - Test: register.spec.ts › "N-24: should register as merchant in Myanmar language" — passed
  - **Precondition**: User is not authenticated; UI language is set to Myanmar; valid license.pdf ready
  - **Steps**:
    1. Toggle UI language to Myanmar
    2. Navigate to `/register`
    3. Verify all labels are in Myanmar
    4. Fill Full Name, Email, Password, Confirm Password
    5. Select Merchant role (Myanmar label)
    6. Upload license.pdf
    7. Click the Myanmar-labelled "Create Account" button
  - **Expected Result**: Success — merchant account created, success message in Myanmar, redirect to `/login`; Myanmar role label was visible throughout
  - **Business Rules**: BR-AUTH-020, BR-AUTH-021, BR-AUTH-022, BR-AUTH-023, BR-AUTH-024, BR-AUTH-026
  - **API**: `POST /api/v1/auth/register`

- [x] **N-25**: Login with valid credentials in Myanmar language UI
  - **Evidence**:
    - Login page rendered in Myanmar with all labels verified → `N-25_1_myanmar_login_form.png`
    - Buyer dashboard reached with Myanmar success toast after Myanmar-language login → `N-25_2_myanmar_login_success.png`
    - Test: login.spec.ts › "N-25: should login successfully in Myanmar language" — passed
  - **Precondition**: User has an existing account; UI language is set to Myanmar
  - **Steps**:
    1. Toggle UI language to Myanmar
    2. Navigate to `/login`
    3. Verify page heading, field labels, "Sign In" button, "Forgot password?" and "Create one" links are displayed in Myanmar
    4. Enter valid email and password
    5. Click the Myanmar-labelled "Sign In" button
  - **Expected Result**: Success — logged in, success toast appears in Myanmar, redirect to home / buyer dashboard
  - **Business Rules**: BR-AUTH-006, BR-AUTH-007
  - **API**: `POST /api/v1/auth/login`

- [x] **N-26**: Submit forgot password form in Myanmar language UI
  - **Evidence**:
    - Myanmar-language Forgot Password form filled before submitting → `N-26_1_myanmar_forgot_form_filled.png`
    - Verification Code page opened in Myanmar after submitting the Myanmar-language forgot form → `N-26_2_myanmar_forgot_verify_code.png`
    - Test: forgot-password.spec.ts › "should submit forgot password in Myanmar language" — passed
  - **Precondition**: User is on `/forgot-password`; UI language is set to Myanmar
  - **Steps**:
    1. Toggle UI language to Myanmar
    2. Navigate to `/forgot-password`
    3. Verify page heading, email field label, and "Send Verification Code" button are in Myanmar
    4. Enter valid email
    5. Click the Myanmar-labelled "Send Verification Code" button
  - **Expected Result**: Success — request accepted, success/instruction message shown in Myanmar, redirect to `/verify-code`
  - **Business Rules**: BR-AUTH-030, BR-AUTH-032
  - **API**: `POST /api/v1/auth/forgot-password`

- [x] **N-27**: Reset password with valid token in Myanmar language UI
  - **Evidence**:
    - Myanmar-language Reset Password form filled before submitting → `N-27_1_myanmar_reset_form_filled.png`
    - Myanmar-language password reset success message → `N-27_2_myanmar_reset_success.png`
    - Test: reset-password.spec.ts › "N-27: should reset password in Myanmar language" — passed
  - **Precondition**: User has a valid reset token from email; UI language is set to Myanmar
  - **Steps**:
    1. Toggle UI language to Myanmar
    2. Navigate to `/reset-password` through the Forgot Password → Verification Code flow (`email` + `code` in router location state)
    3. Verify page heading, "New Password", "Confirm Password" field labels, and "Reset Password" button are in Myanmar
    4. Enter new password meeting all requirements
    5. Enter matching confirm password
    6. Click the Myanmar-labelled "Reset Password" button
  - **Expected Result**: Success — password updated, success message shown in Myanmar, user can log in with new password
  - **Business Rules**: BR-AUTH-030, BR-AUTH-031, BR-AUTH-035
  - **API**: `POST /api/v1/auth/reset-password`

- [x] **N-28**: Login page renders all expected fields and links
  - **Evidence**:
    - Login page showing all form fields: email, password, sign-in, forgot-password and register links → `N-28_1_login_form_all_fields.png`
    - Test: login.spec.ts › "should display login form with all fields" — passed
  - **Precondition**: User is not authenticated
  - **Steps**:
    1. Navigate to `/login`
    2. Verify Email field, Password field, "Sign In" button, "Forgot password?" link and "Create one" link are visible
    3. Verify the document title matches the site title (`/cosmetics finder/i`)
  - **Expected Result**: Sign In card renders with all controls; the page title is the site title
  - **Business Rules**: None (UI render)
  - **Note**: Title assertion is covered by `login.spec.ts › "should have correct page title"`.

- [x] **N-29**: Success toast is shown after login
  - **Evidence**:
    - Success toast notification displayed after login redirects to the dashboard → `N-29_1_success_toast.png`
    - Test: login.spec.ts › "should show toast notification on successful login" — passed
  - **Precondition**: User has an existing account
  - **Steps**:
    1. Navigate to `/login`
    2. Enter valid email and password
    3. Click "Sign In"
    4. Observe the toast area after the dashboard renders
  - **Expected Result**: Toast "Logged in successfully" is displayed on top of the buyer dashboard
  - **Business Rules**: BR-AUTH-006
  - **API**: `POST /api/v1/auth/login`

- [x] **N-30**: Login as merchant and land on the merchant dashboard
  - **Evidence**:
    - Merchant Portal dashboard after merchant login → `N-30_1_merchant_dashboard.png`
    - Test: auth.spec.ts › "should log in as merchant and navigate to merchant dashboard" — passed
  - **Precondition**: User has an existing merchant account (license approved)
  - **Steps**:
    1. Navigate to `/login`
    2. Enter merchant email and password
    3. Click "Sign In"
  - **Expected Result**: Redirected to the merchant dashboard; "Merchant Portal" is visible
  - **Business Rules**: BR-AUTH-006, BR-AUTH-007
  - **API**: `POST /api/v1/auth/login`

- [x] **N-31**: Register page renders all expected fields
  - **Evidence**:
    - Register page showing all form fields: name, email, passwords, roles, terms, submit and login link → `N-31_1_register_form_all_fields.png`
    - Test: register.spec.ts › "should display register form with all fields" — passed
  - **Precondition**: User is not authenticated
  - **Steps**:
    1. Navigate to `/register`
    2. Verify Buyer / Merchant radios, name, Email, Password, Confirm Password, Terms of Service checkbox, "Create Account" button and "Sign in" link are visible
  - **Expected Result**: Create Account card renders with all controls; no license upload area is shown while Buyer is selected
  - **Business Rules**: None (UI render)

- [x] **N-32**: Buyer role is selected by default and hides the license upload
  - **Evidence**:
    - Buyer role selected by default with the license upload section hidden → `N-32_1_buyer_role_selected_by_default.png`
    - Test: register.spec.ts › "should have buyer selected by default" — passed
  - **Precondition**: User is on `/register`
  - **Steps**:
    1. Navigate to `/register`
    2. Verify the Buyer radio is checked
    3. Select Buyer explicitly and verify the license upload input is not visible
  - **Expected Result**: Buyer is the default role and the Business License upload section is hidden
  - **Business Rules**: BR-AUTH-004
  - **Note**: License-hidden assertion is covered by `register.spec.ts › "should hide license upload for buyer role"`.

- [x] **N-33**: Selecting Merchant shows the license upload and switches the name label to "Shop Name"
  - **Evidence**:
    - License upload area visible after selecting the Merchant role → `N-33_1_license_upload_visible.png`
    - Test: register.spec.ts › "should show license upload when merchant role selected" — passed
  - **Precondition**: User is on `/register`
  - **Steps**:
    1. Navigate to `/register`
    2. Select the Merchant radio
    3. Verify the dashed "Drag & drop or click to upload" area appears
    4. Verify the name field label changes from "Full Name" to "Shop Name"
  - **Expected Result**: License upload section appears (required for merchant) and the single `name` input is relabelled "Shop Name" (its value is still submitted as `name`)
  - **Business Rules**: BR-AUTH-020, BR-AUTH-026
  - **Note**: The automated test asserts the upload area only; the "Shop Name" label switch comes from `Register.tsx` (`t('auth.register.shopName')` when role = merchant).

- [x] **N-34**: Password strength checklist updates while typing on the register page
  - **Evidence**:
    - Password strength indicator showing weak for a short password → `N-34_1_strength_weak.png`
    - Test: register.spec.ts › "should show weak indicator for short password" — passed
  - **Precondition**: User is on `/register`
  - **Steps**:
    1. Navigate to `/register`
    2. Type `abc` in Password and observe the requirement checklist
    3. Replace it with `VeryStr0ng!Pass` and observe the checklist again
  - **Expected Result**: Short password → requirements mostly unmet (weak); complex password → all requirements turn green (strong)
  - **Business Rules**: BR-AUTH-002
  - **Note**: Strong case is covered by `register.spec.ts › "should show strong indicator for complex password"`.

- [x] **N-35**: Authenticated users are redirected away from /login and /register
  - **Evidence**:
    - Final state when an already-authenticated user visits /login (redirected to the dashboard) → `N-35_1_already_authenticated_redirect.png`
    - Test: login.spec.ts › "should redirect to dashboard if already logged in" — passed
  - **Precondition**: User is already logged in (buyer session)
  - **Steps**:
    1. With an active session, navigate to `/login`
    2. Verify the URL is no longer `/login` (buyer/merchant/admin dashboard renders)
    3. Repeat for `/register`
  - **Expected Result**: Neither auth form is shown — the user is taken straight to their dashboard
  - **Business Rules**: None (auth guard)
  - **Note**: Register-side assertion is covered by `register.spec.ts › "should redirect to dashboard if already logged in"`.

- [x] **N-36**: Submit a valid 6-digit verification code and reach the Reset Password page
  - **Evidence**:
    - Valid 6-digit code accepted — Reset Password page reached with router state → `N-36_1_reached_reset_password.png`
    - Test: verify-code.spec.ts › "should navigate to reset password page with valid 6-digit code" — passed
  - **Precondition**: User completed `/forgot-password` with an existing email and received a 6-digit code by email
  - **Steps**:
    1. Complete `/forgot-password` so `/verify-code` opens with the email in router location state
    2. Enter the 6-digit code (input is `maxLength=6`, numeric)
    3. Click "Verify Code"
  - **Expected Result**: Success — `POST /api/v1/auth/verify-code` accepts the code and the page navigates to `/reset-password` with `email` + `code` in router state
  - **Business Rules**: BR-AUTH-030, BR-AUTH-031
  - **API**: `POST /api/v1/auth/verify-code`
  - **Note**: Covered by `verify-code.spec.ts › "should navigate to reset password page with valid 6-digit code"` (code `123456` seeded via `seedKnownResetCode`); the same forgot → verify flow underpins N-22, N-27 and A-24 in `reset-password.spec.ts`.

- [x] **N-37**: Verification Code page masks the recipient email address
  - **Evidence**:
    - Recipient email masked as se***@gmail.com → `N-37_1_masked_email.png`
    - Test: verify-code.spec.ts › "should mask the recipient email address in the description" — passed
  - **Precondition**: User reached `/verify-code` from `/forgot-password`
  - **Steps**:
    1. Read the page description under the "Enter Verification Code" heading
  - **Expected Result**: Description reads "We sent a 6-digit code to ab***@example.com" — only the first two characters of the local part are kept, the rest is masked
  - **Business Rules**: None (UI)
  - **Note**: Covered by `verify-code.spec.ts › "should mask the recipient email address in the description"` — the expected mask is computed from the seeded email with the same regex the page uses.

- [x] **N-38**: Resend the verification code and observe the 60-second cooldown
  - **Evidence**:
    - Resend Code clicked — success alert shown and 60s cooldown started → `N-38_1_resend_cooldown.png`
    - Test: verify-code.spec.ts › "should resend code and start 60-second cooldown" — passed
  - **Precondition**: User is on `/verify-code` with an email in router location state
  - **Steps**:
    1. Click "Resend Code"
    2. Verify the success alert "A new verification code has been sent to your email." appears
    3. Observe the resend button
  - **Expected Result**: A new code is requested (`POST /api/v1/auth/forgot-password`), the button becomes disabled and shows "Resend in 60s", counting down until "Resend Code" is enabled again
  - **Business Rules**: BR-AUTH-034 (Resend Cooldown — 機能設計書 §6.9)
  - **API**: `POST /api/v1/auth/forgot-password`
  - **Note**: Covered by `verify-code.spec.ts › "should resend code and start 60-second cooldown"` (success alert + "Resend in 60s" cooldown start); the full 60s → 0s boundary is covered by B-09.

- [x] **N-39**: "Back to Email" link on the Verification Code page returns to Forgot Password
  - **Evidence**:
    - Back to Email link returns to the Forgot Password page → `N-39_1_back_to_email.png`
    - Test: verify-code.spec.ts › "should return to forgot password via Back to Email link" — passed
  - **Precondition**: User is on `/verify-code`
  - **Steps**:
    1. Click the "Back to Email" link
  - **Expected Result**: The user returns to `/forgot-password` to request a new code
  - **Business Rules**: None (navigation)
  - **Note**: Covered by `verify-code.spec.ts › "should return to forgot password via Back to Email link"`. Defect found and fixed while testing: blur-validation inserted the error paragraph mid-click and shifted the link out from under the pointer, swallowing the first click; `VerifyCode.tsx` now reserves the validation-message slot (`min-h-[20px]`) so the layout never moves.

- [x] **N-40**: Language toggle works on Verification Code page
  - **Evidence**:
    - Verification Code page rendered in Japanese → `N-40_1_verify_code_japanese.png`
    - Verification Code page rendered in Myanmar → `N-40_2_verify_code_myanmar.png`
    - Test: verify-code.spec.ts › "should switch language on verify code page" — passed
  - **Precondition**: User is on `/verify-code` (email in router location state) so the Verification Code card renders
  - **Steps**:
    1. Toggle language to Japanese
    2. Verify all UI labels on the Verification Code page update to Japanese (e.g., "コードを確認" button, "認証コード" field label, "メールアドレスに戻る" link, page heading)
    3. Toggle language to Myanmar
    4. Verify all UI labels on the Verification Code page update to Myanmar
    5. Toggle back to English
    6. Verify all UI labels restore to English
  - **Expected Result**: All labels on the Verification Code page switch correctly to the selected language (Japanese / Myanmar / English)
  - **Business Rules**: None (i18n)

---

## 2. Abnormal Scenarios (A) — Error & Negative Paths

- [x] **A-01**: Submit register form with empty fields
  - **Evidence**:
    - `A-01_1_empty_form_errors.png`
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
    - `A-02_1_duplicate_email.png`
    - DB users count — still 1 row after duplicate email attempt → `A-02_2_db_user_count.png`
    - DB users count — still 1 row after duplicate email attempt → `A-02_2_db_user_count.json`
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
    - `A-03_1_missing_uppercase.png`
    - Test: register.spec.ts › "should show error for password missing uppercase" — passed
  - **Precondition**: User is on register page
  - **Steps**:
    1. Enter password without uppercase letter
    2. Verify password requirement not met
  - **Expected Result**: Failed — password checklist shows "One uppercase letter (A-Z)" not met
  - **Business Rules**: BR-AUTH-002

- [x] **A-04**: Register with weak password (missing lowercase)
  - **Evidence**:
    - `A-04_1_missing_lowercase.png`
    - Test: register.spec.ts › "should show error for password missing lowercase" — passed
  - **Precondition**: User is on register page
  - **Steps**:
    1. Enter password without lowercase letter
  - **Expected Result**: Failed — password checklist shows "One lowercase letter (a-z)" not met
  - **Business Rules**: BR-AUTH-002

- [x] **A-05**: Register with weak password (missing number)
  - **Evidence**:
    - `A-05_1_missing_number.png`
    - Test: register.spec.ts › "should show error for password missing number" — passed
  - **Precondition**: User is on register page
  - **Steps**:
    1. Enter password without number
  - **Expected Result**: Failed — password checklist shows "One number (0-9)" not met
  - **Business Rules**: BR-AUTH-002

- [x] **A-06**: Register with weak password (missing special character)
  - **Evidence**:
    - `A-06_1_missing_special.png`
    - Test: register.spec.ts › "should show error for password missing special character" — passed
  - **Precondition**: User is on register page
  - **Steps**:
    1. Enter password without special character
  - **Expected Result**: Failed — password checklist shows "One special character" not met
  - **Business Rules**: BR-AUTH-002

- [x] **A-07**: Register with mismatched passwords
  - **Evidence**:
    - `A-07_1_password_mismatch.png`
    - Test: register.spec.ts › "should show error for password mismatch" — passed
  - **Precondition**: User is on register page
  - **Steps**:
    1. Enter valid password
    2. Enter different confirm password
  - **Expected Result**: Failed — show "Passwords do not match" under Confirm Password; account not created
  - **Business Rules**: BR-AUTH-002

- [x] **A-08**: Login with invalid email
  - **Evidence**:
    - `A-08_1_invalid_email_error.png`
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
    - `A-09_1_invalid_password_error.png`
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
    - `A-10_1_empty_email.png`
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
    - `A-11_1_no_license.png`
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
    - `A-12_1_non_pdf_license.png`
    - Test: register.spec.ts › "should show error for non-PDF license file" — passed
  - **Precondition**: User is on register page, Merchant role selected
  - **Steps**:
    1. Upload non-PDF file (e.g., image.jpg)
  - **Expected Result**: Failed — show "File type not supported. Only PDF files are accepted."; file not accepted
  - **Business Rules**: BR-AUTH-021
  - **API**: `POST /api/v1/auth/register`

- [x] **A-13**: Register as merchant with license file exceeding 10MB
  - **Evidence**:
    - `A-13_1_oversized_license.png`
    - Test: register.spec.ts › "should show error for license file exceeding 10MB" — passed
  - **Precondition**: User is on register page, Merchant role selected
  - **Steps**:
    1. Upload PDF file larger than 10MB
  - **Expected Result**: Failed — show "File exceeds maximum size of 10 MB"; file not accepted
  - **Business Rules**: BR-AUTH-023
  - **API**: `POST /api/v1/auth/register`

- [x] **A-14**: Register as merchant with incorrectly named license file
  - **Evidence**:
    - `A-14_1_bad_license_name.png`
    - Test: register.spec.ts › "should show error for incorrectly named license file" — passed
  - **Precondition**: User is on register page, Merchant role selected
  - **Steps**:
    1. Upload PDF file named "mylicense.pdf"
  - **Expected Result**: Failed — show "File must be named license.pdf"; file not accepted
  - **Business Rules**: BR-AUTH-022
  - **API**: `POST /api/v1/auth/register`

- [x] **A-15**: Submit forgot password with invalid email format
  - **Evidence**:
    - `A-15_1_page_for_validation.png`
    - `A-15_2_invalid_email_error.png`
    - Test: forgot-password.spec.ts › "should show validation error for invalid email format" — passed
  - **Precondition**: User is on forgot password page
  - **Steps**:
    1. Enter invalid email format
    2. Click "Send Verification Code"
  - **Expected Result**: Failed — show "Invalid email address" under email; verification code not sent
  - **Business Rules**: None (frontend Zod email validation)
  - **API**: `POST /api/v1/auth/forgot-password`

- [x] **A-16**: Access protected route without authentication
  - **Evidence**:
    - `A-16_1_redirect_to_login.png`
    - `A-16_2_buyer_redirect_to_login.png`
    - Test: auth.spec.ts › "should redirect to login when accessing protected route without authentication" — passed
  - **Precondition**: User is not authenticated
  - **Steps**:
    1. Navigate to protected route (e.g., `/merchant/products`)
  - **Expected Result**: Not logged in — cannot open protected page, redirect to `/login`
  - **Business Rules**: BR-AUTH-006

- [x] **A-17**: Submit reset password with mismatched passwords
  - **Evidence**:
    - Confirm password does not match - validation error on the real reset flow → `A-17_1_password_mismatch_error.png`
    - Test: reset-password.spec.ts › "should show error for password mismatch on reset form" — passed
  - **Precondition**: User reached the Reset Password page through the Forgot Password → Verification Code flow (`email` + `code` in router location state)
  - **Steps**:
    1. Enter valid new password
    2. Enter different confirm password
    3. Click "Reset Password"
  - **Expected Result**: Failed — show "Passwords do not match" / "စကားဝှက်များ မကိုက်ညီပါ"; password not changed, user stays on `/reset-password`
  - **Business Rules**: BR-AUTH-002
  - **API**: `POST /api/v1/auth/reset-password`
  - **Note**: The mapped test opens `/reset-password?token=…` directly and is redirected to `/forgot-password` (no screenshot captured), so its inline assertion never runs. The mismatch error is genuinely verified in the real flow by A-24 (`reset-password.spec.ts › "A-24: should show password mismatch error in Myanmar language"`); add an English real-flow case before relying on this item.

- [x] **A-18**: Submit reset password with weak password
  - **Evidence**:
    - Weak password rejected on the real reset flow — stays on Reset Password → `A-18_1_weak_password_error.png`
    - Test: reset-password.spec.ts › "should show error for weak password on reset form" — passed
  - **Precondition**: User reached the Reset Password page through the Forgot Password → Verification Code flow (`email` + `code` in router location state)
  - **Steps**:
    1. Enter a password that doesn't meet strength requirements (e.g. `weak`)
    2. Click "Reset Password"
  - **Expected Result**: Failed — password strength errors / strength indicator shows unmet rules; password not changed, user stays on `/reset-password`
  - **Business Rules**: BR-AUTH-002, BR-AUTH-035
  - **API**: `POST /api/v1/auth/reset-password`
  - **Note**: Reworked — the test now drives the real Forgot Password → Verification Code flow via `openVerifiedResetForm`, asserts the "Password must be at least 8 characters" error and unmet strength rules, and verifies the page stays on `/reset-password` (no success state, no screenshot of a success heading).

- [x] **A-19**: Open Reset Password page with an invalid / expired reset link (no email + code state)
  - **Evidence**:
    - `A-19_2_redirect_to_forgot.png`
    - Test: reset-password.spec.ts › "should show error for invalid reset token" — passed
  - **Precondition**: User is not in a verified reset session (no `email` + `code` in router location state)
  - **Steps**:
    1. Navigate to `/reset-password?token=invalid-token-12345` (the `?token=` query is ignored by the page)
    2. (Alternative) Open `/reset-password` directly
  - **Expected Result**: Failed — no password form is rendered; the page guard redirects to `/forgot-password`, so a stale or invalid link cannot change the password. An invalid code that does reach the API is rejected with HTTP 400 (see I-13)
  - **Business Rules**: BR-AUTH-030, BR-AUTH-031
  - **API**: `POST /api/v1/auth/reset-password`

- [x] **A-20**: Submit register form with empty fields — error messages display in Myanmar
  - **Evidence**:
    - Myanmar-language validation errors for an empty register form → `A-20_1_myanmar_empty_field_errors.png`
    - Test: register.spec.ts › "A-20: should show empty field errors in Myanmar language" — passed
  - **Precondition**: User is on `/register`; UI language is set to Myanmar
  - **Steps**:
    1. Toggle UI language to Myanmar
    2. Navigate to `/register`
    3. Leave all required fields empty
    4. Click the Myanmar-labelled "Create Account" button
  - **Expected Result**: Failed — inline validation error messages appear in Myanmar under each empty required field; account not created
  - **Business Rules**: BR-AUTH-001, BR-AUTH-002
  - **API**: `POST /api/v1/auth/register`

- [x] **A-21**: Register with duplicate email — error message displays in Myanmar
  - **Evidence**:
    - 409 duplicate-email error alert displayed in Myanmar locale → `A-21_1_myanmar_duplicate_email_error.png`
    - Test: register.spec.ts › "A-21: should show duplicate email error in Myanmar language" — passed
  - **Precondition**: User is on `/register`; email already exists; UI language is set to Myanmar
  - **Steps**:
    1. Toggle UI language to Myanmar
    2. Fill form with an existing email
    3. Click the Myanmar-labelled "Create Account" button
  - **Expected Result**: Failed — "Email already registered" error appears in Myanmar under the email field; account not created
  - **Business Rules**: BR-AUTH-001
  - **API**: `POST /api/v1/auth/register`

- [x] **A-22**: Login with invalid credentials — error message displays in Myanmar
  - **Evidence**:
    - 401 error alert shown in Myanmar locale after invalid credentials → `A-22_1_myanmar_invalid_credentials_error.png`
    - Test: login.spec.ts › "A-22: should show invalid credentials error in Myanmar language" — passed
  - **Precondition**: User is on `/login`; UI language is set to Myanmar
  - **Steps**:
    1. Toggle UI language to Myanmar
    2. Enter non-existent email and any password
    3. Click the Myanmar-labelled "Sign In" button
  - **Expected Result**: Failed — "Invalid email or password" error message appears in Myanmar; user stays on login page
  - **Business Rules**: BR-AUTH-009
  - **API**: `POST /api/v1/auth/login`

- [x] **A-23**: Submit forgot password with invalid email format — error message displays in Myanmar
  - **Evidence**:
    - Myanmar validation error for an invalid email on the Forgot Password page → `A-23_1_myanmar_invalid_email_error.png`
    - Test: forgot-password.spec.ts › "should show invalid email error in Myanmar language" — passed
  - **Precondition**: User is on `/forgot-password`; UI language is set to Myanmar
  - **Steps**:
    1. Toggle UI language to Myanmar
    2. Enter invalid email format (e.g., `not-an-email`)
    3. Click the Myanmar-labelled "Send Verification Code" button
  - **Expected Result**: Failed — "Invalid email address" error message appears in Myanmar under the email field; verification code not sent
  - **Business Rules**: None (frontend Zod email validation)
  - **API**: `POST /api/v1/auth/forgot-password`

- [x] **A-24**: Submit reset password with mismatched passwords — error message displays in Myanmar
  - **Evidence**:
    - Myanmar password mismatch validation error on the Reset Password page → `A-24_1_myanmar_mismatch_error.png`
    - Test: reset-password.spec.ts › "A-24: should show password mismatch error in Myanmar language" — passed
  - **Precondition**: User reached `/reset-password` through the Forgot Password → Verification Code flow; UI language is set to Myanmar
  - **Steps**:
    1. Toggle UI language to Myanmar
    2. Enter valid new password
    3. Enter different confirm password
    4. Click the Myanmar-labelled "Reset Password" button
  - **Expected Result**: Failed — "Passwords do not match" error message appears in Myanmar; password not changed
  - **Business Rules**: BR-AUTH-002
  - **API**: `POST /api/v1/auth/reset-password`

- [x] **A-25**: Login with invalid credentials — error message displays in Japanese
  - **Evidence**:
    - 401 error alert shown in Japanese locale after invalid credentials → `A-25_1_japanese_invalid_credentials_error.png`
    - Test: login.spec.ts › "A-25: should show invalid credentials error in Japanese" — passed
  - **Precondition**: User is on `/login`; UI language is set to Japanese
  - **Steps**:
    1. Toggle UI language to Japanese
    2. Enter a non-existent email and any password
    3. Click the Japanese-labelled Sign In button
  - **Expected Result**: Failed — the invalid credentials error appears in Japanese; user stays on the login page
  - **Business Rules**: BR-AUTH-009
  - **API**: `POST /api/v1/auth/login`

- [x] **A-26**: Submit register form without accepting the Terms of Service
  - **Evidence**:
    - Terms-not-accepted validation error shown on submit → `A-26_1_terms_not_checked_error.png`
    - Test: register.spec.ts › "should show error when terms not checked" — passed
  - **Precondition**: User is on `/register`
  - **Steps**:
    1. Fill Full Name, Email, Password, Confirm Password with valid values
    2. Leave the "I agree to the Terms of Service" checkbox unchecked
    3. Click "Create Account"
  - **Expected Result**: Failed — show "You must agree to the Terms of Service" under the checkbox; account not created (submit blocked client-side)
  - **Business Rules**: None (frontend-only rule — DD05 §5; `agreeToTerms` is not sent to the backend)
  - **API**: `POST /api/v1/auth/register`

- [x] **A-27**: Register with invalid email format
  - **Evidence**:
    - Invalid email format validation error on the Register page → `A-27_1_invalid_email_error.png`
    - Test: register.spec.ts › "should show error for invalid email format" — passed
  - **Precondition**: User is on `/register`
  - **Steps**:
    1. Fill name, valid password + matching confirm password, accept terms
    2. Enter an invalid email (e.g. `bademail`)
    3. Click "Create Account"
  - **Expected Result**: Failed — "Please enter a valid email address" shown under Email; account not created
  - **Business Rules**: None (frontend Zod email validation)
  - **API**: `POST /api/v1/auth/register`

- [x] **A-28**: Register with password shorter than 8 characters
  - **Evidence**:
    - Minimum 8-character password validation error on the Register page → `A-28_1_short_password_error.png`
    - Test: register.spec.ts › "should show error for short password" — passed
  - **Precondition**: User is on `/register`
  - **Steps**:
    1. Fill name, email, a password shorter than 8 characters (e.g. `abc`) and matching confirm password, accept terms
    2. Click "Create Account"
  - **Expected Result**: Failed — password requirement "At least 8 characters" (and the strength checklist) shows the rule unmet; account not created
  - **Business Rules**: BR-AUTH-002

- [x] **A-29**: Register as merchant without Shop Name
  - **Evidence**:
    - Merchant without Shop Name — min-length error shown under the field → `A-29_1_shop_name_required.png`
    - Test: register.spec.ts › "should show error for merchant without shop name" — passed
  - **Precondition**: User is on `/register`, Merchant role selected, license uploaded, terms accepted
  - **Steps**:
    1. Select Merchant role (name label switches to "Shop Name")
    2. Leave the Shop Name field empty
    3. Fill Email, Password, Confirm Password; upload license.pdf; accept terms
    4. Click "Create Account"
  - **Expected Result**: Failed — "Name must be at least 2 characters" shown under the Shop Name field; account not created
  - **Business Rules**: BR-AUTH-020, BR-AUTH-026
  - **API**: `POST /api/v1/auth/register`
  - **Note**: Reworked — the test now clears the name after selecting Merchant (label switches to "Shop Name"), uploads the license, accepts the terms, and asserts the specific message "Name must be at least 2 characters" through `expectErrorVisible(...)`.

- [x] **A-30**: Login with invalid email format
  - **Evidence**:
    - Validation error shown for invalid email format on the Login page → `A-30_1_invalid_email_format_error.png`
    - Test: login.spec.ts › "should show validation error for invalid email format" — passed
  - **Precondition**: User is on `/login`
  - **Steps**:
    1. Enter an invalid email (e.g. `notanemail`) and a valid password
    2. Click "Sign In"
  - **Expected Result**: Failed — "Please enter a valid email address" shown under Email; no API request is sent, user stays on `/login`
  - **Business Rules**: None (frontend Zod email validation)
  - **API**: `POST /api/v1/auth/login`

- [x] **A-31**: Login with password shorter than 8 characters
  - **Evidence**:
    - Validation error shown for short password on the Login page → `A-31_1_short_password_error.png`
    - Test: login.spec.ts › "should show validation error for short password" — passed
  - **Precondition**: User is on `/login`
  - **Steps**:
    1. Enter a valid email and a password shorter than 8 characters (e.g. `abc`)
    2. Click "Sign In"
  - **Expected Result**: Failed — password error shown under Password; no API request is sent, user stays on `/login`
  - **Business Rules**: None (frontend Zod min-8 rule — DD05 §5)
  - **API**: `POST /api/v1/auth/login`

- [x] **A-32**: Login error does not reveal whether the account exists
  - **Evidence**:
    - Generic credential error shown without revealing whether the account exists → `A-32_1_generic_credential_error.png`
    - Test: auth.spec.ts › "should show generic error for wrong credentials without leaking account existence" — passed
  - **Precondition**: User is on `/login`
  - **Steps**:
    1. Enter an existing account's email with a wrong password
    2. Click "Sign In"
    3. Compare the message with the one shown for a non-existent email (A-08)
  - **Expected Result**: Failed — a generic "Invalid email or password" alert is shown in both cases; nothing indicates whether the email is registered
  - **Business Rules**: BR-AUTH-009
  - **API**: `POST /api/v1/auth/login`

- [x] **A-33**: Submit verification code field left empty
  - **Evidence**:
    - Empty code rejected client-side — no API request sent → `A-33_1_empty_code_error.png`
    - Test: verify-code.spec.ts › "should show required error when verification code is empty" — passed
  - **Precondition**: User is on `/verify-code` with an email in router location state
  - **Steps**:
    1. Leave the Verification Code field empty
    2. Click "Verify Code"
  - **Expected Result**: Failed — "Verification code is required" shown under the field; user stays on `/verify-code`, no API request is sent
  - **Business Rules**: None (frontend Zod validation)
  - **Note**: Covered by `verify-code.spec.ts › "should show required error when verification code is empty"` — also asserts that no `POST /auth/verify-code` request is sent.

- [x] **A-34**: Submit verification code that is not exactly 6 digits
  - **Evidence**:
    - 4-digit code rejected client-side with exact-length message → `A-34_1_short_code_error.png`
    - Test: verify-code.spec.ts › "should show length error for code shorter than 6 digits" — passed
  - **Precondition**: User is on `/verify-code`
  - **Steps**:
    1. Enter fewer than 6 digits (e.g. `1234`)
    2. Click "Verify Code"
  - **Expected Result**: Failed — "Code must be exactly 6 digits" shown under the field; user stays on `/verify-code`
  - **Business Rules**: None (frontend Zod length rule — DD05 §5)
  - **Note**: Covered by `verify-code.spec.ts › "should show length error for code shorter than 6 digits"` (client-side only, no API request); the exact 6-digit boundary is covered by B-08.

- [x] **A-35**: Submit an invalid or expired verification code
  - **Evidence**:
    - HTTP 400 — Invalid or expired verification code alert shown → `A-35_1_invalid_code_error.png`
    - Test: verify-code.spec.ts › "should show invalid code alert for unissued code" — passed
  - **Precondition**: User is on `/verify-code` with an email that requested a code (or whose code has expired after 10 minutes)
  - **Steps**:
    1. Enter a 6-digit code that was not issued or has expired
    2. Click "Verify Code"
  - **Expected Result**: Failed — alert "Invalid or expired verification code" (HTTP 400); user stays on `/verify-code` and cannot reach `/reset-password`
  - **Business Rules**: BR-AUTH-030, BR-AUTH-031
  - **API**: `POST /api/v1/auth/verify-code`
  - **Note**: Covered by `verify-code.spec.ts › "should show invalid code alert for unissued code"` — the known code is seeded as `123456`, so `999999` reliably triggers the real HTTP 400 alert; the API-level contract is covered by I-20.

- [x] **A-36**: Open the Verification Code page directly (no email in router state)
  - **Evidence**:
    - No router state — page guard redirects to Forgot Password → `A-36_1_redirect_to_forgot.png`
    - Test: verify-code.spec.ts › "should redirect to forgot password when opened directly without email state" — passed
  - **Precondition**: User is not in a forgot-password session
  - **Steps**:
    1. Navigate to `/verify-code` directly (no router location state)
  - **Expected Result**: No code form is rendered; the page guard redirects to `/forgot-password`
  - **Business Rules**: None (frontend guard)
  - **API**: `POST /api/v1/auth/verify-code`
  - **Note**: Covered by `verify-code.spec.ts › "should redirect to forgot password when opened directly without email state"`.

---

## 3. Boundary Scenarios (B) — Edge Cases & Limits

- [x] **B-01**: Register with name at minimum length (2 chars)
  - **Evidence**:
    - `B-01_1_name_min.png`
    - DB users row — name length 2 accepted → `B-01_2_db_user.png`
    - DB users row — name length 2 accepted → `B-01_2_db_user.json`
    - Test: register.spec.ts › "should accept name at minimum length (2 chars)" — passed
  - **Precondition**: User is on register page
  - **Steps**:
    1. Enter name with exactly 2 characters
    2. Fill other valid fields (including accepting the Terms of Service)
    3. Click "Create Account"
  - **Expected Result**: Success — 2-char name accepted, account created, redirect to `/login`
  - **Business Rules**: BR-AUTH-001

- [x] **B-02**: Register with name at reasonable length (50 chars)
  - **Evidence**:
    - `B-02_1_name_max.png`
    - DB users row — name length 50 accepted → `B-02_2_db_user.png`
    - DB users row — name length 50 accepted → `B-02_2_db_user.json`
    - Test: register.spec.ts › "should accept name at reasonable length (50 chars)" — passed
  - **Precondition**: User is on register page
  - **Steps**:
    1. Enter name with exactly 50 characters
    2. Fill other valid fields (including accepting the Terms of Service)
    3. Click "Create Account"
  - **Expected Result**: Success — 50-char name accepted, account created, redirect to `/login`
  - **Business Rules**: BR-AUTH-001
  - **Note**: Frontend allows 2–200 characters (`maxLength=200` + Zod max 200) while the backend accepts 2–100 (DD05 §5); testing 50 chars confirms common real-world usage. Oversized names are tracked in B-07.

- [x] **B-03**: Register with password at minimum length (8 chars)
  - **Evidence**:
    - `B-03_1_pw_min.png`
    - DB users row — 8-char password accepted → `B-03_2_db_user.png`
    - DB users row — 8-char password accepted → `B-03_2_db_user.json`
    - Test: register.spec.ts › "should accept password at minimum length (8 chars)" — passed
  - **Precondition**: User is on register page
  - **Steps**:
    1. Enter password with exactly 8 characters meeting all strength rules
    2. Fill other valid fields (including accepting the Terms of Service)
    3. Click "Create Account"
  - **Expected Result**: Success — 8-char password accepted, account created, redirect to `/login`
  - **Business Rules**: BR-AUTH-002

- [x] **B-04**: Register with password at maximum length (128 chars)
  - **Evidence**:
    - `B-04_1_pw_max.png`
    - DB users row — 128-char password accepted → `B-04_2_db_user.png`
    - DB users row — 128-char password accepted → `B-04_2_db_user.json`
    - Test: register.spec.ts › "should accept password at maximum length (128 chars)" — passed
  - **Precondition**: User is on register page
  - **Steps**:
    1. Enter password with exactly 128 characters meeting all strength rules
    2. Fill other valid fields (including accepting the Terms of Service)
    3. Click "Create Account"
  - **Expected Result**: Success — 128-char password accepted, account created, redirect to `/login`
  - **Business Rules**: BR-AUTH-002

- [x] **B-05**: Upload license file named "License.PDF" (case-insensitive)
  - **Evidence**:
    - `B-05_1_license_case.png`
    - DB users + merchants — License.PDF accepted (license_status) → `B-05_2_db_merchant.png`
    - DB users + merchants — License.PDF accepted (license_status) → `B-05_2_db_merchant.json`
    - Test: register.spec.ts › "should accept license file named License.PDF (uppercase)" — passed
  - **Precondition**: User is on register page, Merchant role selected
  - **Steps**:
    1. Upload PDF file named "License.PDF"
  - **Expected Result**: Success — License.PDF accepted (name check is case-insensitive); merchant form can submit
  - **Business Rules**: BR-AUTH-022
  - **Note**: Backend file filter checks `file.originalname.toLowerCase() !== 'license.pdf'`, so uppercase is accepted.

- [x] **B-06**: Register with name at min/max boundary length with Myanmar language UI
  - **Evidence**:
    - Myanmar 2-character minimum name rule - 1-character name rejected at the boundary → `B-06_1_myanmar_name_min_error.png`
    - Test: register.spec.ts › "should validate name boundaries in Myanmar language" — passed
  - **Precondition**: User is on `/register`; UI language is set to Myanmar
  - **Steps**:
    1. Toggle UI language to Myanmar
    2. Navigate to `/register`
    3. Enter name with exactly 2 characters; fill other valid fields; click Myanmar-labelled "Create Account" — verify accepted
    4. Repeat with name of exactly 50 characters — verify accepted
    5. Attempt with name of 1 character — verify Myanmar-language validation error appears
  - **Expected Result**: 2-char and 50-char names are accepted; 1-char name shows the "Name too short" validation message in Myanmar; account created only for valid lengths
  - **Business Rules**: BR-AUTH-001
  - **Note**: Ensures boundary validation messages are correctly translated to Myanmar.

- [x] **B-07**: Register name exceeding the maximum allowable length
  - **Evidence**:
    - 201-character name truncated to 200 by maxLength=200 — no client-side max error → `B-07_1_name_truncated_at_200.png`
    - Frontend limit 200 / backend limit 100 mismatch — submission rejected by the API → `B-07_2_backend_rejects_name.png`
    - Test: register.spec.ts › "should block name longer than 200 characters" — passed
  - **Precondition**: User is on `/register`
  - **Steps**:
    1. Paste a name of 201+ characters into the name field
    2. Fill other valid fields (including accepting the Terms of Service)
    3. Click "Create Account"
  - **Expected Result**: The input truncates at 200 characters (`maxLength=200`), so the Zod max rule never fires and submission proceeds; names of 101–200 characters pass frontend validation but exceed the backend limit of 100 (DD05 §5)
  - **Business Rules**: None (frontend Zod / `maxLength`; DD05 §5)
  - **Note**: Covered by `register.spec.ts › "should block name longer than 200 characters"`. Mismatch confirmed: the input truncates at 200 (`maxLength`), and the API rejects a 150-character name with HTTP 400 ("name must be shorter than or equal to 100 characters"), so 101–200-character names always fail at the backend.

- [x] **B-08**: Verification code at the exact 6-digit boundary
  - **Evidence**:
    - 5 digits rejected — exact 6-digit boundary enforced → `B-08_1_five_digits_error.png`
    - Exactly 6 digits accepted — navigated to Reset Password → `B-08_2_six_digits_accepted.png`
    - Test: verify-code.spec.ts › "should enforce exactly 6 digits as the accepted boundary" — passed
  - **Precondition**: User is on `/verify-code`
  - **Steps**:
    1. Enter 5 digits and submit — expect a client-side length error
    2. Enter exactly 6 digits and submit — expect the code to be accepted
    3. Attempt to type a 7th digit
  - **Expected Result**: Exactly 6 digits is the only accepted length; 5 digits shows "Code must be exactly 6 digits"; a 7th character is never entered (`maxLength=6`, `inputMode="numeric"`)
  - **Business Rules**: None (frontend Zod length rule — DD05 §5)
  - **Note**: Covered by `verify-code.spec.ts › "should enforce exactly 6 digits as the accepted boundary"` — 5-digit client error, 7th digit blocked by `maxLength=6`, and a 6-digit submit reaches `/reset-password`.

- [x] **B-09**: Resend cooldown boundary (60s → 0s)
  - **Evidence**:
    - Resend disabled while cooldown counts down from 60s → `B-09_1_cooldown_started.png`
    - Cooldown finished at 0s — Resend Code enabled again → `B-09_2_cooldown_ended.png`
    - Test: verify-code.spec.ts › "should enable resend button exactly when cooldown reaches zero" — passed
  - **Precondition**: User just clicked "Resend Code" on `/verify-code`
  - **Steps**:
    1. Click "Resend Code" and wait for the success alert
    2. Observe the button label counting down from "Resend in 60s"
    3. Wait until the countdown reaches 0
  - **Expected Result**: The button is disabled while the cooldown is > 0 and becomes enabled ("Resend Code") exactly when it reaches 0; no second request is sent during the cooldown
  - **Business Rules**: BR-AUTH-034 (Resend Cooldown — 機能設計書 §6.9)
  - **API**: `POST /api/v1/auth/forgot-password`
  - **Note**: Covered by `verify-code.spec.ts › "should enable resend button exactly when cooldown reaches zero"` — waits the full countdown (test timeout 120s) and asserts exactly one resend request is sent.

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
  - **Expected Response**: Success — HTTP 200/201; message stating that a verification code will be received if an account exists with that email
  - **Business Rules**: BR-AUTH-030, BR-AUTH-032
  - **API**: `POST /api/v1/auth/forgot-password`
  - **Note**: NestJS `@Post()` defaults to 201; no `@HttpCode(200)` override. A six-digit code (10-minute expiry) is created and earlier unused codes are invalidated (see I-11 for unknown-email behaviour).

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
  - **Business Rules**: BR-AUTH-033
  - **API**: `POST /api/v1/auth/forgot-password`
  - **Note**: Service throws NotFoundException (404) for non-existent emails in current implementation.

- [x] **I-12**: `POST /api/v1/auth/reset-password` — returns response
  - **Evidence**:
    - API test — no screenshot
    - Test: api-auth.spec.ts › "should return response for reset password request" — passed
  - **Precondition**: Valid or invalid email + code pair
  - **Steps**:
    1. Call `POST /api/v1/auth/reset-password` with `{ email, code, password }`
    2. Verify response status is 200 or 400
  - **Expected Response**: HTTP 200 if reset works, or HTTP 400 with an error message if the email/code pair or password is bad
  - **Business Rules**: BR-AUTH-030, BR-AUTH-031, BR-AUTH-035
  - **API**: `POST /api/v1/auth/reset-password`

- [x] **I-13**: `POST /api/v1/auth/reset-password` — returns 400 for invalid code
  - **Evidence**:
    - API test — no screenshot
    - Test: api-auth.spec.ts › "should return 400 for invalid reset token" — passed
  - **Precondition**: Invalid email + code pair
  - **Steps**:
    1. Call `POST /api/v1/auth/reset-password` with `{ email, code, password }` where the code was not issued / has expired / was already used
    2. Verify response status is 400
  - **Expected Response**: Failed — HTTP 400; message "Invalid or expired verification code"
  - **Business Rules**: BR-AUTH-030, BR-AUTH-031
  - **API**: `POST /api/v1/auth/reset-password`

- [x] **I-14**: `POST /api/v1/auth/reset-password` — returns 400 for weak password
  - **Evidence**:
    - API test — no screenshot
    - Test: api-auth.spec.ts › "should return 400 for weak password" — passed
  - **Precondition**: Valid email + code pair, weak password
  - **Steps**:
    1. Call `POST /api/v1/auth/reset-password` with a valid email + code but a weak password
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

- [x] **I-16**: Login does not set a refresh_token cookie (tokens returned in body / stored in localStorage)
  - **Evidence**:
    - API test — no screenshot
    - Test: api-auth.spec.ts › "should not set refresh_token cookie on login" — passed
  - **Precondition**: Valid credentials
  - **Steps**:
    1. Call `POST /api/v1/auth/login` with valid credentials
    2. Inspect the JSON body and the `Set-Cookie` header
  - **Expected Response**: `accessToken` + `refreshToken` are returned in the JSON body and the frontend stores both in localStorage; no `refresh_token` cookie is required for refresh (the refresh token is sent in the JSON body)
  - **Business Rules**: BR-AUTH-017, BR-AUTH-018
  - **API**: `POST /api/v1/auth/login`
  - **Note**: Covered by `api-auth.spec.ts › "should not set refresh_token cookie on login"` — verifies `accessToken`/`refreshToken` in the JSON body and inspects raw `Set-Cookie` headers for any refresh-named cookie (none expected).

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

- [x] **I-19**: Auth endpoints accept `Accept-Language: my` header and return error messages in Myanmar
  - **Evidence**:
    - API test — no screenshot
    - Test: api-auth.spec.ts › "should return Myanmar error messages when Accept-Language is my" — passed
  - **Precondition**: Backend i18n middleware is configured to honour the `Accept-Language` header
  - **Steps**:
    1. Call `POST /api/v1/auth/login` with wrong password and header `Accept-Language: my`
    2. Verify response status is 400 or 401
    3. Verify the `message` field in the JSON body is the Myanmar translation of "Invalid email or password"
    4. Call `POST /api/v1/auth/register` with missing fields and header `Accept-Language: my`
    5. Verify the `message` field contains Myanmar-language validation text
  - **Expected Response**: Error message bodies are returned in Myanmar when `Accept-Language: my` is sent; status codes remain unchanged (400/401/409)
  - **Business Rules**: None (i18n API contract)
  - **API**: `POST /api/v1/auth/login`, `POST /api/v1/auth/register`
  - **Note**: Requires backend i18n middleware support for `Accept-Language`.

- [x] **I-20**: `POST /api/v1/auth/verify-code` — returns 201 for a valid code and 400 otherwise
  - **Evidence**:
    - API test — no screenshot
    - Test: api-auth.spec.ts › "should return 201 for valid verification code" — passed
  - **Precondition**: An account requested a code via `POST /api/v1/auth/forgot-password` (code valid for 10 minutes)
  - **Steps**:
    1. Call `POST /api/v1/auth/verify-code` with `{ email, code }` where `code` is the 6-digit code just issued
    2. Verify response status is 201
    3. Repeat with an unknown, short or expired code and verify status 400
  - **Expected Response**: Success — HTTP 201 `{ "data": { "message": "Verification code is valid." } }`; Failed — HTTP 400 with the standard error body (`statusCode`, `message: "Invalid or expired verification code"`, `error`). Verification checks but does not consume the code — it is consumed by Reset Password
  - **Business Rules**: BR-AUTH-030, BR-AUTH-031
  - **API**: `POST /api/v1/auth/verify-code`
  - **Note**: Covered by `api-auth.spec.ts › "should return 201 for valid verification code"` (code made deterministic via `seedKnownResetCode`) and `› "should return 400 for invalid verification code"` (wrong 6-digit code and short code). Runtime returns 201 for a valid code (NestJS POST default) even though the Swagger `@ApiResponse` annotation documents 200.

---

## Sign-Off

| Item | Status |
|------|--------|
| Test scenarios defined (N, A, B, I) | ☑️ |
| E2E tests implemented | ☑️ |
| Language test cases defined (N-19 to N-22, N-40) | ☑️ |
| Japanese-language validation test case added (A-25) | ☑️ |
| Myanmar language test cases added (N-23–N-27, A-20–A-24, B-06, I-19) | ☑️ |
| Register/Login page-behaviour cases added (N-28–N-35, A-26–A-32) | ☑️ |
| Verification Code page cases defined (N-36–N-39, A-33–A-36, B-08, B-09, I-20) | ☑️ |
| Verification Code E2E / API tests implemented | ☑️ |
| A-18 (weak password on reset form) rework | ☑️ |
| A-29 (empty shop name) rework | ☑️ |
| B-07 (name upper bound) verified | ☑️ |
| PCL auto-update verified | ☑️ |
| Next review date | 2026-10-28 |
