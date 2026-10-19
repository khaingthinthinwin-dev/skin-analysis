 # Screen Items Specification (画面項目設計書) — Sign-up / Login / Password Reset

**Document ID:** SKM-SIS-SCR-001  
**Target Screen:** Authentication (Sign-up / Login / Password Recovery)  
**Subsystem:** User Authentication  
**Function ID:** FN-AUTH-001  
**Version:** 4.2  
**Created:** 2026-08-04  
**Last Updated:** 2026-10-15  
**Author:** Senior System Engineer  
**Review Status:** Approved (承認済み)  
**Classification:** Internal — Engineering Division

---

## 1. Document Control (ドキュメント管理)

### 1.1 Document Revision History

| Version | Date | Author | Description of Changes |
| :--- | :--- | :--- | :--- |
| 1.0 | 2026-08-04 | Senior System Engineer | Initial release. Basic screen items specification for Sign-up and Login pages. |
| 2.0 | 2026-08-05 | Senior System Engineer | Complete rewrite aligned with PRWM-SIS-SCR-001 format. Added comprehensive item definitions with Item IDs, component types, data sources, event specifications, validation error codes, responsive breakpoints, and accessibility requirements. |
| 3.0 | 2026-08-05 | Senior System Engineer | Added conditional license file upload for Merchant role. When "Merchant" radio is selected, a PDF file upload field appears for business license (license.pdf). Includes validation rules, file constraints, and event specifications. |
| 3.1 | 2026-08-17 | Senior System Engineer | Aligned with REQUIREMENT_SPEC v1.5 / DATABASE_SPEC v2.0: UUID primary keys, license stored in `merchants.business_license_url` with `license_status='pending'` approval workflow, Argon2 password hashing, role VARCHAR(20). |
| 4.0 | 2026-08-20 | Senior System Engineer | Added Forgot Password (`/forgot-password`) and Reset Password (`/reset-password`) screens. New item definitions, event specifications, validation error mappings, API response mappings, i18n keys, and test cases. |
| 4.1 | 2026-08-21 | Senior System Engineer | Aligned with DATABASE_SPEC v2.1: added conditional shopName (店舗名) required for merchant registration, included super_admin in role remarks, and updated Register Page layouts/operations. |
| 4.2 | 2026-10-15 | Senior System Engineer | Aligned screen items and events with current auth pages; replaced reset-link token flow and separate merchant shop-name field with verification-code and shared-name-input behavior. |

### 1.2 Related Documents

| No. | Document ID | Document Name | File Path | Remarks |
| :-- | :--- | :--- | :--- | :--- |
| 1 | SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | Business workflow logic, required fields, and rules. |
| 2 | SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | Table structures, constraints, and data types. |
| 3 | SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | Security rules, design tokens, error responses. |
| 4 | SKM-FSD-SCR-001 | Functional Specification — Auth | `docs/screen/SignUp_LogIn/機能設計書_SignUp_Login.md` | Use cases, state transitions, validation rules, error handling. |

---

## 2. Screen Overview & Purpose (画面概要・目的)

### 2.1 Purpose (目的)
The Login, Register, Forgot Password, Verification Code, and Reset Password pages are separate auth routes in the Cosmetics Finder platform. They support account creation, sign-in, and password recovery using an emailed six-digit code.

### 2.2 Target Users & Roles (対象ユーザーと権限)

| Attribute | Value |
| :--- | :--- |
| **Primary Actors** | Unauthenticated visitors using Login, Register, or password-recovery routes |
| **Required Authentication** | None (Sign-up, Forgot Password), JWT Bearer Token (Login/Session), Reset Token (Password Reset) |
| **Data Scope** | New user creation, existing user credential verification, password recovery |
| **Access Control** | Public routes — no guards applied |

### 2.3 Core Functions & Basic Design Principles (主要機能・基本設計方針)
1. **User Registration** — Create new accounts with role selection (Buyer/Merchant).
2. **User Authentication** — Verify credentials and issue JWT access/refresh tokens.
3. **Password Security** — Enforce strong password policy, show/hide toggle.
4. **Form Validation** — Client-side validation with real-time feedback.
5. **Error Handling** — Display inline and form-level errors with error codes.
6. **Internationalization** — Full i18n support for EN, JA, MY.
7. **Responsive Design** — Mobile-first centered card layout.
8. **Password Recovery** — Request a code, verify it, then set a new password with email and code carried in route state.

---

## 3. Screen Layout (画面レイアウト構成)

### 3.1 Overall Page Structure (全体画面構成)

#### Login Page Layout
```text
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              ┌─────────────────────────────┐            │
│              │      [A] PAGE HEADER        │            │
│              │   Logo + System Name        │            │
│              │   "Cosmetics Finder"        │            │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [B] ERROR ALERT (cond.)   │            │
│              │   Shown on API errors       │            │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [C] LOGIN FORM            │            │
│              │                             │            │
│              │   [C1] Email Input          │            │
│              │   [C2] Password Input       │            │
│              │       + Show/Hide Toggle    │            │
│              │   [C3] Forgot Password Link │ ← NEW     │
│              │   [C4] Submit Button        │            │
│              │                             │            │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [D] SIGN UP LINK          │            │
│              │   "Don't have an account?"  │            │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [E] FOOTER CONTROLS       │            │
│              │   [Language] [Theme]        │            │
│              └─────────────────────────────┘            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Register Page Layout
```text
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              ┌─────────────────────────────┐            │
│              │      [A] PAGE HEADER        │            │
│              │   Logo + System Name        │            │
│              │   "Cosmetics Finder"        │            │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [B] ERROR ALERT (cond.)   │            │
│              │   Shown on API errors       │            │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [F] REGISTER FORM         │            │
│              │                             │            │
│              │   [F1] Name Input           │            │
│              │       (label becomes Shop Name for Merchant)│
│              │   [F2] Email Input          │            │
│              │   [F3] Password Input       │            │
│              │       + Requirements List   │            │
│              │       + Show/Hide Toggle    │            │
│              │   [F4] Confirm Password     │            │
│              │       + Show/Hide Toggle    │            │
│              │   [F5] Role Selection       │            │
│              │       (Buyer / Merchant)    │            │
│              │   [F6] License Upload (cond.)│           │
│              │       (Shown if Merchant)   │            │
│              │   Terms Agreement Checkbox  │            │
│              │   [F7] Submit Button        │            │
│              │                             │            │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [G] LOGIN LINK            │            │
│              │   "Already have an account?" │            │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [H] FOOTER CONTROLS       │            │
│              │   [Language] [Theme]        │            │
│              └─────────────────────────────┘            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Forgot Password Page Layout
```text
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              ┌─────────────────────────────┐            │
│              │      [A] PAGE HEADER        │            │
│              │   Logo + System Name        │            │
│              │   "Cosmetics Finder"        │            │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [B] ERROR ALERT (cond.)   │            │
│              │   Shown on API errors       │            │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [K] FORGOT PASSWORD FORM  │            │
│              │                             │            │
│              │   [K1] Title Text           │            │
│              │   "Forgot your password?"   │            │
│              │                             │            │
│              │   [K2] Description Text     │            │
│              │   "Enter your email to      │            │
│              │    receive a verification   │            │
│              │    code."                   │            │
│              │                             │            │
│              │   [K3] Email Input          │            │
│              │                             │            │
│              │   [K4] Submit Button        │            │
│              │   "Send Verification Code"  │            │
│              │                             │            │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [L] BACK TO LOGIN LINK    │            │
│              │   "Back to Login"           │            │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [E] FOOTER CONTROLS       │            │
│              │   [Language] [Theme]        │            │
│              └─────────────────────────────┘            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Forgot Password — Success:** On API success, navigate to `/verify-code` and pass email in React Router location state. There is no in-place success state.

#### Verification Code Page Layout (`/verify-code`)

```text
┌─────────────────────────────────────────────────────────┐
│ Verification title and masked email description         │
│ Error alert / resend-success alert (conditional)        │
│ Six-character code input (numeric input mode)           │
│ Verify button                                           │
│ Resend code button (60-second cooldown after success)  │
│ Back to email link                                      │
└─────────────────────────────────────────────────────────┘
```

The page reads email from router location state and redirects to `/forgot-password` if it is missing. On successful verification it navigates to `/reset-password` with email and code in router state.

#### Reset Password Page Layout (`/reset-password`)
```text
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              ┌─────────────────────────────┐            │
│              │      [A] PAGE HEADER        │            │
│              │   Logo + System Name        │            │
│              │   "Cosmetics Finder"        │            │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [B] ERROR ALERT (cond.)   │            │
│              │   Shown on API errors       │            │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [N] RESET PASSWORD FORM   │            │
│              │                             │            │
│              │   [N1] Title Text           │            │
│              │   "Reset your password"     │            │
│              │                             │            │
│              │   [N2] Description Text     │            │
│              │   "Enter your new password" │            │
│              │                             │            │
│              │   [N3] New Password Input   │            │
│              │       + Requirements List   │            │
│              │       + Show/Hide Toggle    │            │
│              │                             │            │
│              │   [N4] Confirm Password     │            │
│              │       + Show/Hide Toggle    │            │
│              │                             │            │
│              │   [N5] Submit Button        │            │
│              │   "Reset Password"          │            │
│              │                             │            │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [O] BACK TO LOGIN LINK    │            │
│              │   "Back to Login"           │            │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [E] FOOTER CONTROLS       │            │
│              │   [Language] [Theme]        │            │
│              └─────────────────────────────┘            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Reset Password — Success State:**
```text
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              ┌─────────────────────────────┐            │
│              │      [A] PAGE HEADER        │            │
│              │   Logo + System Name        │            │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [P] SUCCESS MESSAGE       │            │
│              │   "Your password has been   │            │
│              │    reset successfully."     │            │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [O] BACK TO LOGIN LINK    │            │
│              │   "Back to Login"           │            │
│              └─────────────────────────────┘            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Responsive Layout Breakpoints (レスポンシブ対応)

| Breakpoint | Min Width | Layout Behavior |
| :--- | :--- | :--- |
| Mobile (default) | 0px | Full-width card, stacked inputs, centered layout |
| Tablet (`md:`) | 768px | Centered card with max-width 400px |
| Desktop (`lg:`) | 1024px | Centered card with max-width 400px, enhanced spacing |
| Wide (`xl:`) | 1280px | Centered card with max-width 400px |

---

## 4. Item Definitions (画面項目定義)

### 4.1 Section [A]: Page Header (ページヘッダー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 1 | `lblLogo` | Logo Icon | Icon (`Sparkles`) | — | — | Visible; always displayed. | — | Hardcoded UI element | Lucide `Sparkles` icon. Tailwind: `h-5 w-5 text-primary`. |
| 2 | `lblSystemName` | System Name | Static Label (`<span>`) | String | — | Visible; always displayed. Text: "Cosmetics Finder" | — | Hardcoded UI text | Tailwind: `font-bold text-lg`. |

### 4.2 Section [B]: Error Alert (エラーアラート)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 3 | `alertError` | Error Alert Banner | Alert (`destructive`) | String | Conditional | Hidden by default. Shown when API error occurs. | — | API error response message | Tailwind: `border-destructive/50 text-destructive`. Dismissible. |

### 4.3 Section [C]: Login Form (ログインフォーム)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 4 | `lblEmail` | Email Label | Static Label (`<label>`) | String | — | Always displayed. Text: "Email" | — | Hardcoded UI text | Associated with `txtEmail` via `htmlFor`/`id`. |
| 5 | `txtEmail` | Email Input | Input (`email`) | String(255) | Mandatory | Empty. Placeholder: "user@example.com" | Format: Valid email. MaxLength: 255. | `users.email` | AutoFocus: true. AutoComplete: `email`. InputMode: `email`. |
| 6 | `lblPassword` | Password Label | Static Label (`<label>`) | String | — | Always displayed. Text: "Password" | — | Hardcoded UI text | Associated with `txtPassword` via `htmlFor`/`id`. |
| 7 | `txtPassword` | Password Input | Input (`password`) | String(128) | Mandatory | Empty. Placeholder: "Enter your password" | MinLength: 8. MaxLength: 128. | `users.password_hash` | AutoComplete: `current-password`. Toggleable show/hide. |
| 8 | `btnShowPassword` | Show/Hide Password | Icon Button | — | — | Visible. Eye icon. | — | — | Toggles `txtPassword` type between `password` and `text`. |
| 9 | `lnkForgotPassword` | Forgot Password Link | Link (`<Link>`) | String | — | Text: "Forgot password?" | — | — | Navigates to `/forgot-password`. Right-aligned below password field. |
| 10 | `btnLogin` | Log In Button | Button (`submit`, `default`) | — | — | Visible. Text: "Sign In" | — | — | Full width. Loading: Spinner + "Signing in...". Disabled when loading. |
| 11 | `lblNoAccount` | Sign Up Prompt | Static Label | String | — | Text: "Don't have an account?" | — | — | Footer text. |
| 12 | `lnkSignUp` | Sign Up Link | Link (`<Link>`) | String | — | Text: "Create one" | — | — | Navigates to `/register`. |

### 4.4 Section [E]: Login Footer Controls (フッターコントロール)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 13 | `btnLanguageToggle` | Language Toggle | Toggle Group | Enum | — | Default: Browser language or "en" | Options: EN, JA, MY | — | Switches all i18n keys. Persists to localStorage. |
| 14 | `btnThemeToggle` | Theme Toggle | Icon Button | Enum | — | Default: System preference | Options: light, dark, system | — | Cycles light → dark → system. Uses `next-themes`. |

### 4.5 Section [F]: Register Form (新規登録フォーム)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 14 | `lblFullName` | Name Label | Static Label (`<label>`) | String | — | Buyer: "Full Name"; merchant: "Shop Name" | — | i18n label based on selected role | Label for the single `name` field; no separate shop-name input. |
| 15 | `txtFullName` | Name Input | Input (`text`) | String(200) | Mandatory | Empty. Role-dependent placeholder | MaxLength: 200. Schema minimum: 2. | `users.name` | AutoComplete: `name`; same value is used for account name and merchant shop name. |
| 16 | `lblRegEmail` | Email Label | Static Label (`<label>`) | String | — | Always displayed. Text: "Email" | — | Hardcoded UI text | Associated with `txtRegEmail` via `htmlFor`/`id`. |
| 17 | `txtRegEmail` | Email Input | Input (`email`) | String(255) | Mandatory | Empty. Placeholder: "user@example.com" | Format: Valid email. MaxLength: 255. | `users.email` | AutoComplete: `email`. |
| 18 | `lblRegPassword` | Password Label | Static Label (`<label>`) | String | — | Always displayed. Text: "Password" | — | Hardcoded UI text | Associated with `txtRegPassword` via `htmlFor`/`id`. |
| 19 | `txtRegPassword` | Password Input | Input (`password`) | String(128) | Mandatory | Empty. Placeholder: "Create a password" | Complex regex (see §4.5.1). | `users.password_hash` | AutoComplete: `new-password`. Toggleable show/hide. |
| 20 | `btnShowRegPassword` | Show/Hide Password | Icon Button | — | — | Visible. Eye icon. | — | — | Toggles `txtRegPassword` type. |
| 21 | `lstPasswordRequirements` | Password Requirements | Helper Text List | — | — | Visible below password field | Checklist of 5 requirements | — | Real-time feedback as user types. Green check when met. |
| 22 | `lblConfirmPassword` | Confirm Password Label | Static Label (`<label>`) | String | — | Always displayed. Text: "Confirm Password" | — | Hardcoded UI text | Associated with `txtConfirmPassword` via `htmlFor`/`id`. |
| 23 | `txtConfirmPassword` | Confirm Password Input | Input (`password`) | String(128) | Mandatory | Empty. Placeholder: "Confirm your password" | Must match `txtRegPassword`. | — | AutoComplete: `new-password`. Toggleable show/hide. |
| 24 | `btnShowConfirmPassword` | Show/Hide Password | Icon Button | — | — | Visible. Eye icon. | — | — | Toggles `txtConfirmPassword` type. |
| 25 | `lblRoleSelection` | Role Selection Label | Static Label (`<label>`) | String | — | Text: "I am a:" | — | Hardcoded UI text | Associated with `rdoRole` group. |
| 26 | `rdoRole` | Role Selection | Radio Group | Enum | Mandatory | Default: `buyer` | Options: buyer, merchant | `users.role` | `buyer`: Browse and purchase. `merchant`: Sell products. Register allows only buyer/merchant; Admin/Super Admin accounts are system-seeded or created by Admin/Super Admin. |
| 27 | `rdoBuyer` | Buyer Radio | Radio Button | — | — | Selected by default | Value: `buyer` | — | Label: "Buyer — Browse and purchase products" |
| 28 | `rdoMerchant` | Merchant Radio | Radio Button | — | — | Unselected | Value: `merchant` | — | Label: "Merchant — Sell skincare products" |
| 28C | `chkAgreeToTerms` | Terms Agreement | Checkbox | Boolean | Mandatory | Unchecked | Must be checked before submit | Client-only form value | Terms link navigates to `/terms`; value is not sent to the registration API. |
| 29 | `btnRegister` | Create Account Button | Button (`submit`, `default`) | — | — | Visible. Text: "Create Account" | — | — | Full width. Loading: Spinner + "Creating account...". Disabled when loading. |
| 30 | `lblHasAccount` | Login Prompt | Static Label | String | — | Text: "Already have an account?" | — | — | Footer text. |
| 31 | `lnkSignIn` | Login Link | Link (`<Link>`) | String | — | Text: "Sign in" | — | — | Navigates to `/login`. |
| 32 | `lblLicenseUpload` | Business License Label | Static Label (`<label>`) | String | — | Visible only when `rdoMerchant` selected. Text: "Business License (PDF)" | — | Hardcoded UI text | Associated with `uplLicense` via `htmlFor`/`id`. Required indicator: red asterisk `*`. |
| 33 | `uplLicense` | License File Upload | File Input (`file`) | File (Binary) | Conditional | Hidden by default. Visible when `rdoMerchant` selected. | Accepted MIME: `application/pdf`. Max size: 10MB. Filename must be `license.pdf`. | `merchants.business_license_url` (stored in S3/本地) | PDF only. Drag & drop zone + file picker button. On submit creates `merchants` record with `license_status='pending'`. |
| 34 | `lblLicenseFileName` | Uploaded File Name | Static Label | String(255) | — | Populated after upload. Displays uploaded filename. | — | — | Shows "license.pdf" when uploaded. Clickable to preview/download. |
| 35 | `btnRemoveLicense` | Remove License File | Icon Button (Danger) | — | — | Visible only when file is uploaded. Trash icon. | — | — | Removes uploaded file. Reverts to upload zone. |
| 36 | `lblLicenseHelper` | License Helper Text | Static Label (Helper) | String | — | Text: "Upload your business license as PDF (max 10MB). File must be named license.pdf." | — | — | Displayed below upload zone. Tailwind: `text-xs text-muted-foreground`. |

### 4.6 Section [I]: Forgot Password Form (パスワード忘れたフォーム)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 37 | `lblForgotTitle` | Forgot Password Title | Static Label (`<h2>`) | String | — | Visible. Text: "Forgot your password?" | — | Hardcoded UI text | Tailwind: `text-2xl font-bold text-center`. |
| 38 | `lblForgotDesc` | Forgot Password Description | Static Label (`<p>`) | String | — | Prompts for email to receive a verification code. | — | i18n text | Tailwind: `text-muted-foreground text-center`. |
| 39 | `lblForgotEmail` | Email Label | Static Label (`<label>`) | String | — | Always displayed. Text: "Email" | — | Hardcoded UI text | Associated with `txtForgotEmail` via `htmlFor`/`id`. |
| 40 | `txtForgotEmail` | Email Input | Input (`email`) | String | Mandatory | Empty. Placeholder: "user@example.com" | Format: Valid email. | — | AutoFocus: true. AutoComplete: `email`. InputMode: `email`; no explicit maxLength on the input. |
| 41 | `btnSendResetLink` | Send Verification Code Button | Button (`submit`, `default`) | — | — | Localized submit label | — | — | Full width. Loading indicator while submitting; successful request navigates to `/verify-code` with email in router state. |
| 42 | `lnkBackToLoginForgot` | Back to Login Link | Link (`<Link>`) | String | — | Text: "Back to Login" | — | — | Navigates to `/login`. |

### 4.7 Section [J]: Reset Password Form (パスワードリセットフォーム)

The page requires `email` and `code` in React Router location state. If either is missing, it redirects to `/forgot-password`; neither value is entered on this page or read from a URL token.

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 43 | `lblResetTitle` | Reset Password Title | Static Label (`<h2>`) | String | — | Visible. Text: "Reset your password" | — | Hardcoded UI text | Tailwind: `text-2xl font-bold text-center`. |
| 44 | `lblResetDesc` | Reset Password Description | Static Label (`<p>`) | String | — | Visible. Text: "Enter your new password below." | — | Hardcoded UI text | Tailwind: `text-muted-foreground text-center`. |
| 45 | `lblNewPassword` | New Password Label | Static Label (`<label>`) | String | — | Always displayed. Text: "New Password" | — | Hardcoded UI text | Associated with `txtNewPassword` via `htmlFor`/`id`. |
| 46 | `txtNewPassword` | New Password Input | Input (`password`) | String(128) | Mandatory | Empty. Placeholder: "Create a new password" | Complex regex (see §4.5.1). | — | AutoFocus: true. AutoComplete: `new-password`. Toggleable show/hide. |
| 47 | `btnShowNewPassword` | Show/Hide New Password | Icon Button | — | — | Visible. Eye icon. | — | — | Toggles `txtNewPassword` type between `password` and `text`. |
| 48 | `cmpPasswordStrength` | Password Strength Indicator | Component | — | — | Visible below new-password field | Reflects current password value | — | Uses shared `PasswordStrengthIndicator` component. |
| 49 | `lblResetConfirmPassword` | Confirm Password Label | Static Label (`<label>`) | String | — | Always displayed. Text: "Confirm Password" | — | Hardcoded UI text | Associated with `txtResetConfirmPassword` via `htmlFor`/`id`. |
| 50 | `txtResetConfirmPassword` | Confirm Password Input | Input (`password`) | String(128) | Mandatory | Empty. Placeholder: "Confirm your new password" | Must match `txtNewPassword`. | — | AutoComplete: `new-password`. Toggleable show/hide. |
| 51 | `btnShowResetConfirmPassword` | Show/Hide Confirm Password | Icon Button | — | — | Visible. Eye icon. | — | — | Toggles `txtResetConfirmPassword` type. |
| 52 | `btnResetPassword` | Reset Password Button | Button (`submit`, `default`) | — | — | Visible. Text: "Reset Password" | — | — | Full width. Loading: Spinner + "Resetting...". Disabled when loading or form invalid. |
| 53 | `lnkBackToLoginReset` | Back to Login Link | Link (`<Link>`) | String | — | Text: "Back to Login" | — | — | Navigates to `/login`. |

### 4.8 Section [Q]: Verification Code Form

| Item | Component | Required / Constraints | Behavior |
|------|-----------|-----------------------|----------|
| Email description | Text | Email from router location state | Displays masked email; missing email redirects to `/forgot-password`. |
| Verification code | Text input | Required, exactly 6 characters; max length 6 | Numeric input mode, one-time-code autocomplete, autofocus. |
| Verify button | Submit button | — | Calls code verification; disabled with loading indicator while submitting. |
| Resend button | Button | — | Requests a new code. Shows success alert and starts 60-second cooldown on success; disabled during request/cooldown. |
| Back to email | Link | — | Navigates to `/forgot-password`. |
| Alerts | Alert | Conditional | Shows request error or resend success. |

Successful verification navigates to `/reset-password` with `{ email, code }` in router location state.

### 4.5.1 Password Validation Rules (Register)

| Rule | Regex | Error Message (EN) | Error Message (JA) |
| :--- | :--- | :--- | :--- |
| Minimum Length | `.{8,}` | "At least 8 characters" | "8文字以上" |
| Uppercase | `[A-Z]` | "One uppercase letter (A-Z)" | "大文字1つ (A-Z)" |
| Lowercase | `[a-z]` | "One lowercase letter (a-z)" | "小文字1つ (a-z)" |
| Number | `[0-9]` | "One number (0-9)" | "数字1つ (0-9)" |
| Special Character | `[@$!%*?&]` | "One special character (@$!%*?&)" | "特殊文字1つ (@$!%*?&)" |

---

## 5. Item Behaviors & Event Specifications (各項目における挙動・イベント仕様)

### 5.1 Login Form Submit (`btnLogin` onClick)
- **Trigger:** User clicks "Sign In" button.
- **Processing Logic:**
  1. **Client-Side Pre-Check:** `loginSchema` validates a required valid email and required password of at least 8 characters.
  2. **Backend Dispatch:** `POST /api/v1/auth/login` with `{ email, password }`.
  3. **Backend Execution:** Verify credentials against `users` table. Issue JWT access + refresh tokens.
  4. **Post-Execution UI:** AuthProvider stores access and refresh tokens and sets the user. Show success toast. Navigation uses the `redirect` query value when present or the role dashboard.
- **Exception Handling:**
  - Display the thrown `Error.message`, or the translated fallback when the thrown value is not an Error.

### 5.2 Register Form Submit (`btnRegister` onClick)
- **Trigger:** User clicks "Create Account" button.
- **Processing Logic:**
  1. **Client-Side Pre-Check:** Validate the single `name` value, email, password/confirmation, role, terms agreement, and conditional merchant license. The name input is relabeled “Shop Name” for merchants.
  2. **Backend Dispatch:** `POST /api/v1/auth/register` as multipart form data with `name`, `email`, `password`, optional `role`, and optional `license` file. Confirmation and terms are not sent.
  3. **Backend Execution:** Create the user; for merchants the service reuses `name` as the merchant shop name and stores the license.
  4. **Post-Execution UI:** Show success toast. Navigate to `/login`.
- **Exception Handling:**
  - Display the thrown `Error.message`, or the translated fallback when the thrown value is not an Error.

### 5.3 Show/Hide Password Toggle (`btnShowPassword` / `btnShowRegPassword` / `btnShowConfirmPassword` onClick)
- **Trigger:** User clicks the eye icon button.
- **Processing Logic:**
  1. Toggle the associated input's `type` between `password` and `text`.
  2. Toggle the icon between `Eye` and `EyeOff`.
  3. Update screen reader label.
- **Exception Handling:** None applicable.

### 5.4 Language Toggle (`btnLanguageToggle` onClick)
- **Trigger:** User clicks language toggle button.
- **Processing Logic:**
  1. Cycle through languages: EN → JA → MY → EN.
  2. Update `i18next` language via `i18n.changeLanguage()`.
  3. Persist preference to `localStorage`.
  4. Re-render all translated labels.
- **Exception Handling:** None applicable.

### 5.5 Theme Toggle (`btnThemeToggle` onClick)
- **Trigger:** User clicks theme toggle button.
- **Processing Logic:**
  1. Cycle through themes: light → dark → system.
  2. Update `next-themes` theme via `setTheme()`.
  3. Persist preference to `localStorage`.
- **Exception Handling:** None applicable.

### 5.6 Navigation Links (`lnkSignUp` / `lnkSignIn` / `lnkForgotPassword` / `lnkBackToLoginForgot` / `lnkBackToLoginReset` onClick)
- **Trigger:** User clicks Sign Up, Login, Forgot Password, or Back to Login link.
- **Processing Logic:**
  1. Navigate to `/register`, `/login`, or `/forgot-password` via React Router.
  2. Reset form state on navigation.
- **Exception Handling:** None applicable.

### 5.7 Role Selection Change (`rdoRole` onChange)
- **Trigger:** User selects a different role (Buyer or Merchant).
- **Processing Logic:**
  1. **If `buyer` selected:**
     - Hide the conditional license field.
     - Clear any uploaded license file.
     - The existing name input remains and is labeled “Full Name”.
  2. **If `merchant` selected:**
     - Relabel the same `name` input as “Shop Name”.
     - Show the license field and require a valid license file.
- **Exception Handling:** None applicable.

### 5.8 License File Upload (`uplLicense` onChange / onDrop)
- **Trigger:** User selects a file via file picker or drag & drop.
- **Processing Logic:**
  1. **Client-Side Pre-Check:**
     - Validate file MIME type is `application/pdf`.
     - Validate file size ≤ 10MB.
     - Validate filename is `license.pdf` (case-insensitive).
  2. **Post-Validation:**
     - If valid: Display filename in `lblLicenseFileName`. Show `btnRemoveLicense`. Hide upload zone.
     - If invalid: Display inline error message. Keep upload zone visible.
  3. **File Storage:** Store file temporarily until form submission.
- **Exception Handling:**
  - `VAL-AUTH-030`: "File type not supported. Only PDF files are accepted."
  - `VAL-AUTH-031`: "File exceeds maximum size of 10 MB."
  - `VAL-AUTH-032`: "File must be named license.pdf."

### 5.9 Remove License File (`btnRemoveLicense` onClick)
- **Trigger:** User clicks the remove button for uploaded license.
- **Processing Logic:**
  1. Clear the uploaded file from state.
  2. Reset `uplLicense` input value.
  3. Hide `lblLicenseFileName` and `btnRemoveLicense`.
  4. Show upload zone again.
- **Exception Handling:** None applicable.

### 5.10 Forgot Password Form Submit
- **Trigger:** User submits the Forgot Password form.
- **Processing Logic:**
  1. **Client-Side Pre-Check:** Form undergoes validation — email format valid.
  2. **Backend Dispatch:** `POST /api/v1/auth/forgot-password` with `{ email }`.
  3. **Backend Execution:** For an existing account, create and email a six-digit code. The current service returns 404 for unknown email.
  4. **Post-Execution UI:** On API success, navigate to `/verify-code`, passing email in React Router location state. No in-place success message is shown.
- **Exception Handling:**
  - Show the response message when present; otherwise the thrown error message or translated fallback appears in a destructive alert.

### 5.11 Verification Code Form Submit and Resend
- **Trigger:** User submits the code or activates Resend.
- **Processing Logic:**
  1. Verify Code requires email in router location state; missing email redirects to `/forgot-password`.
  2. Validate the code has exactly six characters. The input uses numeric mode and max length 6.
  3. Submit `{ email, code }` to `POST /api/v1/auth/verify-code`.
  4. On success, navigate to `/reset-password` with email and code in router location state.
  5. Resend calls `POST /api/v1/auth/forgot-password` with the same email; on success, show an alert and start a 60-second cooldown.
- **Exception Handling:**
  - Display the response message when available, otherwise the thrown error message or fallback.

### 5.12 Reset Password Form Submit
- **Trigger:** User submits the Reset Password form after code verification.
- **Processing Logic:**
  1. Require email and code in router location state; if either is missing, navigate to `/forgot-password`.
  2. Validate password length/composition and matching confirmation.
  3. Submit `{ email, code, password }` to `POST /api/v1/auth/reset-password`; confirmation is client-only.
  4. On success, show a success toast and replace the form with a success view and Back to Login link.
- **Exception Handling:**
  - Display the response message when available, otherwise the thrown error message or translated fallback.

---

## 6. Validation & Error Message Mapping (バリデーション及びエラーメッセージマッピング)

### 6.1 Login Validation Errors

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-AUTH-001** | `txtEmail` | Email is empty or invalid format | Red border. Text below field. | "Email is required" | "メールアドレスは必須です" |
| **VAL-AUTH-003** | `txtPassword` | Password is empty | Red border. Text below field. | "Password is required" | "パスワードは必須です" |
| **VAL-AUTH-004** | `txtPassword` | Password less than 8 characters | Red border. Text below field. | "Password must be at least 8 characters" | "パスワードは8文字以上である必要があります" |
| **API_ERROR** | `alertError` | Login request fails | Destructive alert | The thrown `Error.message`, or translated fallback if not an Error | Same fallback handling |

### 6.2 Register Validation Errors

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-AUTH-010** | `txtFullName` | Name is empty or < 2 chars | Red border. Text below field. | "Name must be at least 2 characters" | "名前は2文字以上である必要があります" |
| **VAL-AUTH-011** | `txtFullName` | Name exceeds 200 characters | Red border. Text below field. | "Name must not exceed 200 characters" | "名前は200文字以内にしてください" |
| **VAL-AUTH-012** | `txtRegEmail` | Email is empty or invalid format | Red border. Text below field. | "Email is required" | "メールアドレスは必須です" |
| **VAL-AUTH-013** | `txtRegEmail` | Email exceeds 255 characters | Red border. Text below field. | "Email must not exceed 255 characters" | "メールアドレスは255文字以内にしてください" |
| **VAL-AUTH-014** | `txtRegPassword` | Password is empty | Red border. Text below field. | "Password is required" | "パスワードは必須です" |
| **VAL-AUTH-015** | `txtRegPassword` | Password < 8 chars | Red border. Text below field. | "Password must be at least 8 characters" | "パスワードは8文字以上である必要があります" |
| **VAL-AUTH-016** | `txtRegPassword` | Password > 128 chars | Red border. Text below field. | "Password must not exceed 128 characters" | "パスワードは128文字以内にしてください" |
| **VAL-AUTH-017** | `txtRegPassword` | Missing uppercase letter | Red border. Text below field. | "Password must contain at least one uppercase letter" | "パスワードには大文字を含めてください" |
| **VAL-AUTH-018** | `txtRegPassword` | Missing lowercase letter | Red border. Text below field. | "Password must contain at least one lowercase letter" | "パスワードには小文字を含めてください" |
| **VAL-AUTH-019** | `txtRegPassword` | Missing number | Red border. Text below field. | "Password must contain at least one number" | "パスワードには数字を含めてください" |
| **VAL-AUTH-020** | `txtRegPassword` | Missing special character | Red border. Text below field. | "Password must contain at least one special character (@$!%*?&)" | "パスワードには特殊文字を含めてください" |
| **VAL-AUTH-021** | `txtConfirmPassword` | Passwords do not match | Red border. Text below field. | "Passwords do not match" | "パスワードが一致しません" |
| **VAL-AUTH-022** | `rdoRole` | No role selected | Form-level error | "Please select a role" | "役割を選択してください" |
| **VAL-AUTH-030** | `uplLicense` | File type is not PDF | Inline error on upload zone | "File type not supported. Only PDF files are accepted." | "サポートされていないファイル形式です。PDFファイルのみ対応しています。" |
| **VAL-AUTH-031** | `uplLicense` | File exceeds 10MB | Inline error on upload zone | "File exceeds maximum size of 10 MB" | "ファイルサイズが10MBを超えています" |
| **VAL-AUTH-032** | `uplLicense` | Filename is not license.pdf | Inline error on upload zone | "File must be named license.pdf" | "ファイル名はlicense.pdfである必要があります" |
| **VAL-AUTH-033** | `uplLicense` | No file uploaded when role is merchant | Inline error on upload zone | "Business license is required for merchant registration" | "出品者登録には事業許可書が必要です" |
| — | `chkAgreeToTerms` | `agreeToTerms` is false | Inline schema message below the checkbox | `auth.validation.termsRequired` default: "You must agree to the Terms of Service" | Translated schema message |
| **API_ERROR** | `alertError` | Registration request fails | Destructive alert | The thrown `Error.message`, or translated fallback if not an Error | Same fallback handling |

### 6.3 Forgot Password Validation Errors

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-AUTH-040** | `txtForgotEmail` | Email is empty or invalid format | Red border. Text below field. | "Email is required" / "Invalid email address" | "メールアドレスは必須です" / "メールアドレスが無効です" |
| **API_ERROR** | `alertError` | Request fails, including unknown email | Destructive alert | Response message when available, then thrown error message or fallback | Same precedence |

### 6.4 Verification Code Validation and Request Errors

| Target Field | Condition | Presentation |
|--------------|-----------|--------------|
| `txtVerificationCode` | Empty or not exactly 6 characters | Schema validation message below the field |
| `alertError` | Verification or resend request fails | Response message when available, otherwise thrown error message or fallback |
| `alertResendSuccess` | Resend succeeds | Success alert; resend button disabled for 60 seconds |

### 6.5 Reset Password Validation Errors

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-AUTH-042** | `txtNewPassword` | Password is empty | Red border. Text below field. | "Password is required" | "パスワードは必須です" |
| **VAL-AUTH-043** | `txtNewPassword` | Password < 8 chars | Red border. Text below field. | "Password must be at least 8 characters" | "パスワードは8文字以上である必要があります" |
| **VAL-AUTH-044** | `txtNewPassword` | Password > 128 chars | Red border. Text below field. | "Password must not exceed 128 characters" | "パスワードは128文字以内にしてください" |
| **VAL-AUTH-045** | `txtNewPassword` | Missing uppercase letter | Red border. Text below field. | "Password must contain at least one uppercase letter" | "パスワードには大文字を含めてください" |
| **VAL-AUTH-046** | `txtNewPassword` | Missing lowercase letter | Red border. Text below field. | "Password must contain at least one lowercase letter" | "パスワードには小文字を含めてください" |
| **VAL-AUTH-047** | `txtNewPassword` | Missing number | Red border. Text below field. | "Password must contain at least one number" | "パスワードには数字を含めてください" |
| **VAL-AUTH-048** | `txtNewPassword` | Missing special character | Red border. Text below field. | "Password must contain at least one special character (@$!%*?&)" | "パスワードには特殊文字を含めてください" |
| **VAL-AUTH-049** | `txtResetConfirmPassword` | Passwords do not match | Red border. Text below field. | "Passwords do not match" | "パスワードが一致しません" |
| **API_ERROR** | `alertError` | Reset request fails, including invalid/expired code | Alert banner (destructive) | Response message when available, otherwise thrown error message or translated fallback | Same precedence |

### 7.1 Login Form → Database

| Form Field | API Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| `txtEmail` | `email` | `email` | `users` | VARCHAR(255) UNIQUE |
| `txtPassword` | `password` | `password_hash` | `users` | VARCHAR(255) (Argon2 hash) |

### 7.2 Register Form → Database

| Form Field | API Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| `txtFullName` | `name` | `name` | `users` | VARCHAR(200) — for merchants this same value is used as shop name |
| `txtRegEmail` | `email` | `email` | `users` | VARCHAR(255) UNIQUE |
| `txtRegPassword` | `password` | `password_hash` | `users` | VARCHAR(255) (Argon2 hash) |
| `rdoRole` | `role` | `role` | `users` | VARCHAR(20) (buyer, merchant, admin, super_admin) |
| `uplLicense` | `license` | `business_license_url` | `merchants` | TEXT (nullable) — set with `license_status='pending'` on registration |

`confirmPassword` and `agreeToTerms` are client-side form fields and are not persisted or sent as API fields. The merchant shop name uses the same `name` field shown above.

---

## 8. API Response Mapping (APIレスポンスマッピング)

### 8.1 Login Success Response

```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "f4c5a1b2-3d6e-4f70-8a9b-1c2d3e4f5a6b",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "buyer",
      "merchantId": null,
      "licenseStatus": null,
      "avatarUrl": null
    }
  }
}
```

### 8.2 Login Error Response

```json
{
  "statusCode": 401,
  "error": "UNAUTHORIZED",
  "errorCode": "AUTH_001",
  "message": "Invalid email or password",
  "timestamp": "2026-08-05T12:00:00.000Z",
  "path": "/api/v1/auth/login"
}
```

### 8.3 Register Success Response

```json
{
  "data": {
    "id": "f4c5a1b2-3d6e-4f70-8a9b-1c2d3e4f5a6b",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "merchant",
    "merchantId": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    "licenseStatus": "pending",
    "licenseUrl": "/uploads/licenses/f4c5a1b2-3d6e-4f70-8a9b-1c2d3e4f5a6b.pdf",
    "emailVerified": false,
    "createdAt": "2026-08-05T12:00:00.000Z"
  }
}
```

**Note:** `licenseUrl`, `merchantId`, and `licenseStatus` are only present when `role = "merchant"`. For `role = "buyer"`, these fields are `null` or omitted. Merchant accounts are created with `licenseStatus = "pending"` and must be approved by admin before accessing merchant features.

### 8.4 Register Error Response (Duplicate Email)

```json
{
  "statusCode": 409,
  "error": "CONFLICT",
  "errorCode": "AUTH_007",
  "message": "Email already registered",
  "timestamp": "2026-08-05T12:00:00.000Z",
  "path": "/api/v1/auth/register"
}
```

### 8.5 Forgot Password Success Response

```json
{
  "data": {
    "message": "If an account exists with that email, you will receive a verification code shortly."
  }
}
```

The current service returns this message on success for an existing account. An unknown email returns `404 Not Found` with `No account found with this email address`. The page navigates to `/verify-code` after a successful response and does not display this message in place.

### 8.6 Verify Code API Responses

`POST /api/v1/auth/verify-code` accepts `{ email, code }`. A valid, unexpired six-digit code returns:

```json
{
  "data": {
    "message": "Verification code is valid."
  }
}
```

Invalid or expired codes return `400 Bad Request` with `Invalid or expired verification code`.

### 8.7 Reset Password Success Response

```json
{
  "data": {
    "message": "Your password has been reset successfully."
  }
}
```

### 8.8 Reset Password Error Response (Invalid Code)

```json
{
  "statusCode": 400,
  "error": "BAD_REQUEST",
  "message": "Invalid or expired verification code",
  "timestamp": "2026-08-20T12:00:00.000Z",
  "path": "/api/v1/auth/reset-password"
}
```

---

## 9. i18n Keys Reference (i18nキーリファレンス)

### 9.1 English (en) — Login

| Key | Value |
| :--- | :--- |
| `auth.login.title` | "Sign In" |
| `auth.login.email` | "Email" |
| `auth.login.emailPlaceholder` | "user@example.com" |
| `auth.login.password` | "Password" |
| `auth.login.passwordPlaceholder` | "Enter your password" |
| `auth.login.submit` | "Sign In" |
| `auth.login.submitting` | "Signing in..." |
| `auth.login.success` | "Logged in successfully" |
| `auth.login.forgotPassword` | "Forgot password?" |
| `auth.login.noAccount` | "Don't have an account?" |
| `auth.login.createAccount` | "Create one" |
| `auth.login.showPassword` | "Show password" |
| `auth.login.hidePassword` | "Hide password" |

### 9.2 English (en) — Register

| Key | Value |
| :--- | :--- |
| `auth.register.title` | "Create Account" |
| `auth.register.fullName` | "Full Name" |
| `auth.register.fullNamePlaceholder` | "John Doe" |
| `auth.register.shopName` | "Shop Name" |
| `auth.register.shopNamePlaceholder` | "Your shop name" |
| `auth.register.email` | "Email" |
| `auth.register.emailPlaceholder` | "user@example.com" |
| `auth.register.password` | "Password" |
| `auth.register.passwordPlaceholder` | "Create a password" |
| `auth.register.confirmPassword` | "Confirm Password" |
| `auth.register.confirmPasswordPlaceholder` | "Confirm your password" |
| `auth.register.submit` | "Create Account" |
| `auth.register.submitting` | "Creating account..." |
| `auth.register.success` | "Account created successfully" |
| `auth.register.hasAccount` | "Already have an account?" |
| `auth.register.signIn` | "Sign in" |
| `auth.register.iAm` | "I am a:" |
| `auth.register.buyer` | "Buyer — Browse and purchase products" |
| `auth.register.merchant` | "Merchant — Sell skincare products" |
| `auth.register.showPassword` | "Show password" |
| `auth.register.hidePassword` | "Hide password" |
| `auth.register.passwordRequirement.length` | "At least 8 characters" |
| `auth.register.passwordRequirement.uppercase` | "One uppercase letter (A-Z)" |
| `auth.register.passwordRequirement.lowercase` | "One lowercase letter (a-z)" |
| `auth.register.passwordRequirement.number` | "One number (0-9)" |
| `auth.register.passwordRequirement.special` | "One special character (@$!%*?&)" |
| `auth.register.license` | "Business License (PDF)" |
| `auth.register.licensePlaceholder` | "Drag & drop or click to upload" |
| `auth.register.licenseHelper` | "Upload your business license as PDF (max 10MB). File must be named license.pdf." |
| `auth.register.licenseRemove` | "Remove file" |
| `auth.register.licenseError.type` | "File type not supported. Only PDF files are accepted." |
| `auth.register.licenseError.size` | "File exceeds maximum size of 10 MB" |
| `auth.register.licenseError.name` | "File must be named license.pdf" |
| `auth.register.licenseError.required` | "Business license is required for merchant registration" |
| `auth.register.termsAgreement` | Not defined in `auth.json`; the component supplies the English default agreement text |

### 9.3 Japanese (ja) — Login

| Key | Value |
| :--- | :--- |
| `auth.login.title` | "ログイン" |
| `auth.login.email` | "メールアドレス" |
| `auth.login.emailPlaceholder` | "user@example.com" |
| `auth.login.password` | "パスワード" |
| `auth.login.passwordPlaceholder` | "パスワードを入力" |
| `auth.login.submit` | "ログイン" |
| `auth.login.submitting` | "ログイン中..." |
| `auth.login.success` | "ログイン成功" |
| `auth.login.forgotPassword` | "パスワードをお忘れですか？" |
| `auth.login.noAccount` | "アカウントをお持ちでないですか？" |
| `auth.login.createAccount` | "作成する" |
| `auth.login.showPassword` | "パスワードを表示" |
| `auth.login.hidePassword` | "パスワードを非表示" |

### 9.4 Japanese (ja) — Register

| Key | Value |
| :--- | :--- |
| `auth.register.title` | "アカウント作成" |
| `auth.register.fullName` | "氏名" |
| `auth.register.fullNamePlaceholder` | "田中太郎" |
| `auth.register.shopName` | "店舗名" |
| `auth.register.shopNamePlaceholder` | "店舗名を入力" |
| `auth.register.email` | "メールアドレス" |
| `auth.register.emailPlaceholder` | "user@example.com" |
| `auth.register.password` | "パスワード" |
| `auth.register.passwordPlaceholder` | "パスワードを作成" |
| `auth.register.confirmPassword` | "パスワード確認" |
| `auth.register.confirmPasswordPlaceholder` | "パスワードを再入力" |
| `auth.register.submit` | "アカウント作成" |
| `auth.register.submitting` | "アカウント作成中..." |
| `auth.register.success` | "アカウント作成成功" |
| `auth.register.hasAccount` | "すでにアカウントをお持ちですか？" |
| `auth.register.signIn` | "ログイン" |
| `auth.register.iAm` | "私は：" |
| `auth.register.buyer` | "購入者 — 商品を閲覧・購入する" |
| `auth.register.merchant` | "出品者 — スキンケア商品を販売する" |
| `auth.register.showPassword` | "パスワードを表示" |
| `auth.register.hidePassword` | "パスワードを非表示" |
| `auth.register.passwordRequirement.length` | "8文字以上" |
| `auth.register.passwordRequirement.uppercase` | "大文字1つ (A-Z)" |
| `auth.register.passwordRequirement.lowercase` | "小文字1つ (a-z)" |
| `auth.register.passwordRequirement.number` | "数字1つ (0-9)" |
| `auth.register.passwordRequirement.special` | "特殊文字1つ (@$!%*?&)" |
| `auth.register.license` | "事業許可書 (PDF)" |
| `auth.register.licensePlaceholder` | "ドラッグ＆ドロップまたはクリックしてアップロード" |
| `auth.register.licenseHelper` | "事業許可書をPDF形式でアップロードしてください（最大10MB）。ファイル名はlicense.pdfである必要があります。" |
| `auth.register.licenseRemove` | "ファイルを削除" |
| `auth.register.licenseError.type` | "サポートされていないファイル形式です。PDFファイルのみ対応しています。" |
| `auth.register.licenseError.size` | "ファイルサイズが10MBを超えています" |
| `auth.register.licenseError.name` | "ファイル名はlicense.pdfである必要があります" |
| `auth.register.licenseError.required` | "出品者登録には事業許可書が必要です" |

### 9.5 English (en) — Forgot Password

| Key | Value |
| :--- | :--- |
| `auth.forgotPassword.title` | "Forgot your password?" |
| `auth.forgotPassword.description` | "Enter your email and we'll send you a reset link." |
| `auth.forgotPassword.email` | "Email" |
| `auth.forgotPassword.emailPlaceholder` | "user@example.com" |
| `auth.forgotPassword.submit` | "Send Reset Link" |
| `auth.forgotPassword.submitting` | "Sending..." |
| `auth.forgotPassword.successTitle` | "Check your email" (defined but not shown by the current page) |
| `auth.forgotPassword.successMessage` | "If an account exists with that email, you'll receive a password reset link shortly." (defined but not shown by the current page) |
| `auth.forgotPassword.backToLogin` | "Back to Login" |

**Implementation note:** The current English locale copy still says “reset link”, while the page sends a verification-code request and navigates to `/verify-code`. The success copy above is the locale value, not the API response.

### 9.6 English (en) — Reset Password

| Key | Value |
| :--- | :--- |
| `auth.resetPassword.title` | "Reset your password" |
| `auth.resetPassword.description` | "Enter your new password below." |
| `auth.resetPassword.newPassword` | "New Password" |
| `auth.resetPassword.newPasswordPlaceholder` | "Create a new password" |
| `auth.resetPassword.confirmPassword` | "Confirm Password" |
| `auth.resetPassword.confirmPasswordPlaceholder` | "Confirm your new password" |
| `auth.resetPassword.submit` | "Reset Password" |
| `auth.resetPassword.submitting` | "Resetting..." |
| `auth.resetPassword.successTitle` | "Password reset successful" |
| `auth.resetPassword.successMessage` | "Your password has been reset successfully. You can now sign in with your new password." |
| `auth.resetPassword.backToLogin` | "Back to Login" |
| `auth.resetPassword.invalidToken` | "Invalid or expired reset link. Please request a new one." |
| `auth.resetPassword.showPassword` | "Show password" |
| `auth.resetPassword.hidePassword` | "Hide password" |
| `auth.resetPassword.passwordRequirement.length` | "At least 8 characters" |
| `auth.resetPassword.passwordRequirement.uppercase` | "One uppercase letter (A-Z)" |
| `auth.resetPassword.passwordRequirement.lowercase` | "One lowercase letter (a-z)" |
| `auth.resetPassword.passwordRequirement.number` | "One number (0-9)" |
| `auth.resetPassword.passwordRequirement.special` | "One special character (@$!%*?&)" |

**Implementation note:** The page uses `auth.resetPassword.invalidToken` when email or code is missing from router state, then redirects to `/forgot-password`; it also uses the same key for request failures. The current locale wording refers to a reset link even though the submitted credential is a verification code.

### 9.7 Japanese (ja) — Forgot Password

The current Japanese `auth.json` does not define `forgotPassword` keys. The English locale defines these keys, but its copy refers to a reset link while the page requests a verification code.

### 9.8 Japanese (ja) — Reset Password

The current Japanese `auth.json` does not define `resetPassword` keys. The English locale currently contains the corresponding keys, including an `invalidToken` message that still refers to a reset link.

### 9.9 Verification Code Translations

The Verify Code page references `auth.verifyCode.*` keys, but the current English, Japanese, and Myanmar `auth.json` files do not define a `verifyCode` group.

---

## 10. Shared Components (共有コンポーネント)

### 10.1 AuthLayout Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/features/auth/components/AuthLayout.tsx` |
| **Purpose** | Shared layout wrapper for Login and Register pages |

**Layout Structure:**
```text
┌─────────────────────────────────────────────┐
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │         [Logo]                      │    │
│  │         Cosmetics Finder            │    │
│  │                                     │    │
│  │         {children}                  │    │
│  │                                     │    │
│  │         [Language] [Theme]          │    │
│  └─────────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```

### 10.2 Alert Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/alert.tsx` |
| **Variants** | `default`, `destructive`, `success` |
| **Usage** | Error/success banners at top of form |

### 10.3 RadioGroup Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/radio-group.tsx` |
| **Usage** | Role selection in Register form |

---

## 11. Special UI Notes & Styling Constraints (特記事項・UI仕様)

- **Design System:** Luxury Cosmetics Theme — Primary `#7C3AED` (Purple), Accent `#EC4899` (Pink), Secondary `#F3E8FF` (Lavender).
- **Responsive Viewport Design:** Centered card layout with max-width 400px. Full-width on mobile.
- **Accessibility:** Every control must be keyboard navigable. ARIA labels required. Error messages must be announced via `role="alert"`.
- **Performance:** Forms use skeleton loaders during initial load. Buttons display spinner during async operations.
- **Security:** All user input is sanitized to prevent XSS. Passwords are never logged. AutoComplete attributes set correctly.
- **Design Tokens:** Status badges use standard color mapping — success: `bg-green-100 text-green-800`, error: `bg-red-100 text-red-800`, warning: `bg-amber-100 text-amber-800`.

---

## 12. Testing Checklist (テストチェックリスト)

### 12.1 Login Form Tests

- [ ] Email validation accepts valid formats
- [ ] Email validation rejects invalid formats
- [ ] Password minimum length (8) enforced
- [ ] Show/hide password toggle works
- [ ] Forgot password link navigates to `/forgot-password`
- [ ] Form submits with valid data
- [ ] Error alert displays on invalid credentials (AUTH_001)
- [ ] Error alert displays when the login request fails
- [ ] Loading state shows during submission
- [ ] Navigation to register page works
- [ ] Language toggle switches all labels
- [ ] Theme toggle works
- [ ] Auto-focus on email input
- [ ] Keyboard navigation works (Tab, Enter)

### 12.2 Register Form Tests

- [ ] Name validation works (min 2, max 200)
- [ ] Email validation accepts valid formats
- [ ] Email validation rejects invalid formats
- [ ] Password strength requirements enforced (5 rules)
- [ ] Password requirements checklist updates in real-time
- [ ] Confirm password match validation works
- [ ] Role selection defaults to buyer
- [ ] Form submits with valid data
- [ ] Duplicate email error displays (AUTH_007)
- [ ] Name label changes to “Shop Name” for merchant and remains the same `name` field
- [ ] Terms agreement is required before registration
- [ ] Loading state shows during submission
- [ ] Navigation to login page works
- [ ] All i18n keys render correctly
- [ ] Show/hide password works for password and confirmation fields
- [ ] Keyboard navigation works

### 12.3 Merchant License Upload Tests

- [ ] License upload field hidden when buyer is selected
- [ ] License upload field shown when merchant is selected
- [ ] License upload field hidden when switching back to buyer
- [ ] PDF file upload works via file picker
- [ ] PDF file upload works via drag & drop
- [ ] Non-PDF file rejected with error (VAL-AUTH-030)
- [ ] File > 10MB rejected with error (VAL-AUTH-031)
- [ ] File with wrong name rejected with error (VAL-AUTH-032)
- [ ] File named "license.pdf" accepted
- [ ] File named "License.PDF" accepted (case-insensitive)
- [ ] Uploaded filename displayed correctly
- [ ] Remove button removes uploaded file
- [ ] License required error shows when submitting without file (VAL-AUTH-033)
- [ ] License upload works with i18n (EN/JA/MY)

### 12.4 Forgot Password Form Tests

- [ ] Email validation accepts valid formats
- [ ] Email validation rejects invalid formats
- [ ] Form submits with valid email
- [ ] Successful submission navigates to `/verify-code` with email in router state
- [ ] Unknown email request error is displayed
- [ ] "Back to Login" link navigates to `/login`
- [ ] Loading state shows during submission
- [ ] Language toggle switches all labels
- [ ] Theme toggle works
- [ ] Keyboard navigation works (Tab, Enter)
- [ ] Network error displays appropriate message

### 12.5 Verification Code Form Tests

- [ ] Missing email in router state redirects to `/forgot-password`
- [ ] Code is required and must be exactly 6 characters
- [ ] Valid code submission navigates to `/reset-password` with email and code in router state
- [ ] Invalid or expired code request error is displayed
- [ ] Successful resend displays an alert and disables resend for 60 seconds
- [ ] Language toggle switches all labels
- [ ] Theme toggle works

### 12.6 Reset Password Form Tests

- [ ] Password strength requirements enforced (5 rules)
- [ ] Password requirements checklist updates in real-time
- [ ] Confirm password match validation works
- [ ] Form submits with valid password
- [ ] Success message displayed after reset
- [ ] "Back to Login" link navigates to `/login`
- [ ] Invalid or expired verification-code error displays
- [ ] Loading state shows during submission
- [ ] Auto-focus on new password input
- [ ] Show/hide password toggle works for both password fields
- [ ] Language toggle switches all labels
- [ ] Theme toggle works
- [ ] Keyboard navigation works (Tab, Enter)
- [ ] Network error displays appropriate message
- [ ] Missing email or code in router state redirects to `/forgot-password`

---

*End of Screen Items Specification (Sign-up / Login Page)*
