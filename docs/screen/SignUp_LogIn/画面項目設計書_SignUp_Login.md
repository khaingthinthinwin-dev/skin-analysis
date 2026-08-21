 # Screen Items Specification (画面項目設計書) — Sign-up / Login / Password Reset

**Document ID:** SKM-SIS-SCR-001  
**Target Screen:** Authentication (Sign-up / Login / Password Reset)  
**Subsystem:** User Authentication  
**Function ID:** FN-AUTH-001  
**Version:** 4.1  
**Created:** 2026-08-04  
**Last Updated:** 2026-08-21  
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
The Sign-up, Login, and Password Reset pages are the entry points for user authentication in the Cosmetics Finder platform. They enable new users to create accounts (as Buyers or Merchants), existing users to authenticate via email and password receiving JWT tokens for session management, and all users to recover forgotten passwords via secure email links.

### 2.2 Target Users & Roles (対象ユーザーと権限)

| Attribute | Value |
| :--- | :--- |
| **Primary Actors** | Unauthenticated visitors (Sign-up, Password Reset Request), Authenticated users (Login), Any user with reset token (Password Reset) |
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
8. **Password Recovery** — Request password reset link via email, set new password with token validation.

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
│              │   [F1] Full Name Input      │            │
│              │   [F2] Email Input          │            │
│              │   [F3] Password Input       │            │
│              │       + Requirements List   │            │
│              │       + Show/Hide Toggle    │            │
│              │   [F4] Confirm Password     │            │
│              │       + Show/Hide Toggle    │            │
│              │   [F5] Role Selection       │            │
│              │       (Buyer / Merchant)    │            │
│              │   [F8] Shop Name Input (cond.)│ ← NEW    │
│              │       (Shown if Merchant)   │            │
│              │   [F6] License Upload (cond.)│           │
│              │       (Shown if Merchant)   │            │
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
│              │   "Enter your email..."     │            │
│              │                             │            │
│              │   [K3] Email Input          │            │
│              │                             │            │
│              │   [K4] Submit Button        │            │
│              │   "Send Reset Link"         │            │
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

**Forgot Password — Success State:**
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
│              │   [M] SUCCESS MESSAGE       │            │
│              │   "If an account exists..." │            │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [L] BACK TO LOGIN LINK    │            │
│              │   "Back to Login"           │            │
│              └─────────────────────────────┘            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Reset Password Page Layout
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
| 14 | `lblFullName` | Full Name Label | Static Label (`<label>`) | String | — | Always displayed. Text: "Full Name" | — | Hardcoded UI text | Associated with `txtFullName` via `htmlFor`/`id`. |
| 15 | `txtFullName` | Full Name Input | Input (`text`) | String(200) | Mandatory | Empty. Placeholder: "John Doe" | MaxLength: 200. MinLength: 2. | `users.name` | AutoComplete: `name`. |
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
| 28A | `lblShopName` | Shop Name Label | Static Label (`<label>`) | String | — | Visible only when `rdoMerchant` selected. Text: "Shop Name" | — | Hardcoded UI text | Associated with `txtShopName` via `htmlFor`/`id`. Required indicator: red asterisk `*`. |
| 28B | `txtShopName` | Shop Name Input | Input (`text`) | String(255) | Conditional | Hidden by default. Visible when `rdoMerchant` selected. Placeholder: "Enter your shop name" | MaxLength: 255. MinLength: 1. | `merchants.shop_name` | AutoComplete: `organization`. Required when registering as merchant. |
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
| 38 | `lblForgotDesc` | Forgot Password Description | Static Label (`<p>`) | String | — | Visible. Text: "Enter your email and we'll send you a reset link." | — | Hardcoded UI text | Tailwind: `text-muted-foreground text-center`. |
| 39 | `lblForgotEmail` | Email Label | Static Label (`<label>`) | String | — | Always displayed. Text: "Email" | — | Hardcoded UI text | Associated with `txtForgotEmail` via `htmlFor`/`id`. |
| 40 | `txtForgotEmail` | Email Input | Input (`email`) | String(255) | Mandatory | Empty. Placeholder: "user@example.com" | Format: Valid email. MaxLength: 255. | — | AutoFocus: true. AutoComplete: `email`. InputMode: `email`. |
| 41 | `btnSendResetLink` | Send Reset Link Button | Button (`submit`, `default`) | — | — | Visible. Text: "Send Reset Link" | — | — | Full width. Loading: Spinner + "Sending...". Disabled when loading or form invalid. |
| 42 | `lnkBackToLoginForgot` | Back to Login Link | Link (`<Link>`) | String | — | Text: "Back to Login" | — | — | Navigates to `/login`. |

### 4.7 Section [J]: Reset Password Form (パスワードリセットフォーム)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 43 | `lblResetTitle` | Reset Password Title | Static Label (`<h2>`) | String | — | Visible. Text: "Reset your password" | — | Hardcoded UI text | Tailwind: `text-2xl font-bold text-center`. |
| 44 | `lblResetDesc` | Reset Password Description | Static Label (`<p>`) | String | — | Visible. Text: "Enter your new password below." | — | Hardcoded UI text | Tailwind: `text-muted-foreground text-center`. |
| 45 | `lblNewPassword` | New Password Label | Static Label (`<label>`) | String | — | Always displayed. Text: "New Password" | — | Hardcoded UI text | Associated with `txtNewPassword` via `htmlFor`/`id`. |
| 46 | `txtNewPassword` | New Password Input | Input (`password`) | String(128) | Mandatory | Empty. Placeholder: "Create a new password" | Complex regex (see §4.5.1). | — | AutoFocus: true. AutoComplete: `new-password`. Toggleable show/hide. |
| 47 | `btnShowNewPassword` | Show/Hide New Password | Icon Button | — | — | Visible. Eye icon. | — | — | Toggles `txtNewPassword` type between `password` and `text`. |
| 48 | `lstResetPasswordRequirements` | Password Requirements | Helper Text List | — | — | Visible below password field | Checklist of 5 requirements | — | Real-time feedback as user types. Green check when met. Same rules as Register. |
| 49 | `lblResetConfirmPassword` | Confirm Password Label | Static Label (`<label>`) | String | — | Always displayed. Text: "Confirm Password" | — | Hardcoded UI text | Associated with `txtResetConfirmPassword` via `htmlFor`/`id`. |
| 50 | `txtResetConfirmPassword` | Confirm Password Input | Input (`password`) | String(128) | Mandatory | Empty. Placeholder: "Confirm your new password" | Must match `txtNewPassword`. | — | AutoComplete: `new-password`. Toggleable show/hide. |
| 51 | `btnShowResetConfirmPassword` | Show/Hide Confirm Password | Icon Button | — | — | Visible. Eye icon. | — | — | Toggles `txtResetConfirmPassword` type. |
| 52 | `btnResetPassword` | Reset Password Button | Button (`submit`, `default`) | — | — | Visible. Text: "Reset Password" | — | — | Full width. Loading: Spinner + "Resetting...". Disabled when loading or form invalid. |
| 53 | `lnkBackToLoginReset` | Back to Login Link | Link (`<Link>`) | String | — | Text: "Back to Login" | — | — | Navigates to `/login`. |

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
  1. **Client-Side Pre-Check:** Form undergoes validation — email format, password not empty.
  2. **Backend Dispatch:** `POST /api/v1/auth/login` with `{ email, password }`.
  3. **Backend Execution:** Verify credentials against `users` table. Issue JWT access + refresh tokens.
  4. **Post-Execution UI:** Store tokens in localStorage. Navigate to `/dashboard/profile`. Show success toast.
- **Exception Handling:**
  - `AUTH_001` (401): Display "Invalid email or password" in `alertError`.
  - `AUTH_006` (429): Display rate limit message with retry seconds.
  - `AUTH_004` (403): Display "Account is deactivated" in `alertError`.
  - Network error: Display "Network error. Please check your connection".

### 5.2 Register Form Submit (`btnRegister` onClick)
- **Trigger:** User clicks "Create Account" button.
- **Processing Logic:**
  1. **Client-Side Pre-Check:** Strict validation — all fields valid, passwords match, role selected. If role = merchant, validate `txtShopName` (not empty, max 255 chars) and license PDF uploaded.
  2. **Backend Dispatch:** `POST /api/v1/auth/register` with `{ name, email, password, role }` (and includes `{ shopName }` + license file in multi-part form if role = merchant).
  3. **Backend Execution:** Create user record with hashed password. If role = merchant, create merchant record with shop name and `license_status = 'pending'`. Set `emailVerified = false`.
  4. **Post-Execution UI:** Show success toast. Navigate to `/login`.
- **Exception Handling:**
  - `AUTH_007` (409): Display "Email already registered" inline on email field.
  - `VAL_001` (400): Display field-specific validation errors (e.g., missing shop name).
  - `AUTH_006` (429): Display rate limit message.

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
     - Hide `lblShopName`, `txtShopName`, `lblLicenseUpload`, `uplLicense`, `lblLicenseFileName`, `btnRemoveLicense`, `lblLicenseHelper`.
     - Clear `txtShopName` and any uploaded license file.
     - Remove shop name and license file requirement from validation.
  2. **If `merchant` selected:**
     - Show `lblShopName`, `txtShopName`, `lblLicenseUpload`, `uplLicense`, `lblLicenseHelper`.
     - Enable shop name input and license file upload zone.
     - Add shop name requirement and license file requirement to strict validation.
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

### 5.10 Forgot Password Form Submit (`btnSendResetLink` onClick)
- **Trigger:** User clicks "Send Reset Link" button.
- **Processing Logic:**
  1. **Client-Side Pre-Check:** Form undergoes validation — email format valid.
  2. **Backend Dispatch:** `POST /api/v1/auth/forgot-password` with `{ email }`.
  3. **Backend Execution:** Validate email format. Check rate limit (max 3 per email per hour). Find user by email. If user exists: invalidate previous unused tokens, generate secure token, hash and store in `password_reset_tokens` table with 24-hour expiry, send reset email. Always return same response regardless of email existence.
  4. **Post-Execution UI:** Replace form with success message. Show "Back to Login" link.
- **Exception Handling:**
  - `AUTH_008` (429): Display rate limit message with retry seconds.
  - `VAL-AUTH-040` (400): Display field-level inline error for invalid email.
  - `SYS_001` (500): Display "Something went wrong. Please try again".
  - Network error: Display "Network error. Please check your connection".

### 5.11 Reset Password Form Submit (`btnResetPassword` onClick)
- **Trigger:** User clicks "Reset Password" button (after clicking email link).
- **Processing Logic:**
  1. **Client-Side Pre-Check:** Strict validation — password meets strength requirements, passwords match, token exists in URL.
  2. **Backend Dispatch:** `POST /api/v1/auth/reset-password` with `{ token, password }`.
  3. **Backend Execution:** Validate token format. Hash received token. Find token record by `token_hash`. Validate: token exists, not used, not expired (24 hours). Find user by `user_id` from token. Validate password strength. Hash new password with Argon2. Update user's password. Mark token as `used = TRUE`. Invalidate all other unused tokens for this user.
  4. **Post-Execution UI:** Show success message: "Your password has been reset successfully." Show "Back to Login" link.
- **Exception Handling:**
  - `AUTH_009` (400): Display "Invalid or expired reset link. Please request a new one." in `alertError`.
  - `VAL-AUTH-041` (400): Display password strength errors inline.
  - `VAL-AUTH-042` (400): Display "Passwords do not match" inline.
  - `SYS_001` (500): Display "Something went wrong. Please try again".
  - Network error: Display "Network error. Please check your connection".

### 5.12 Token Validation on Reset Password Page Load
- **Trigger:** User navigates to `/reset-password?token=xxx`.
- **Processing Logic:**
  1. Extract `token` from URL query parameters.
  2. If no token present, display error and redirect to `/login`.
  3. Token is validated on submission (backend checks expiry, usage).
  4. If token is invalid/expired on submission, show error and offer link to request new reset.
- **Exception Handling:**
  - No token: Redirect to `/login`.
  - Invalid/expired token on submit: Display error, link to `/forgot-password`.

---

## 6. Validation & Error Message Mapping (バリデーション及びエラーメッセージマッピング)

### 6.1 Login Validation Errors

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-AUTH-001** | `txtEmail` | Email is empty or invalid format | Red border. Text below field. | "Email is required" | "メールアドレスは必須です" |
| **VAL-AUTH-002** | `txtEmail` | Email exceeds 255 characters | Red border. Text below field. | "Email must not exceed 255 characters" | "メールアドレスは255文字以内にしてください" |
| **VAL-AUTH-003** | `txtPassword` | Password is empty | Red border. Text below field. | "Password is required" | "パスワードは必須です" |
| **VAL-AUTH-004** | `txtPassword` | Password less than 8 characters | Red border. Text below field. | "Password must be at least 8 characters" | "パスワードは8文字以上である必要があります" |
| **AUTH_001** | `alertError` | Invalid credentials (401 response) | Alert banner (destructive) | "Invalid email or password" | "メールアドレスまたはパスワードが無効です" |
| **AUTH_004** | `alertError` | Account deactivated (403 response) | Alert banner (destructive) | "Account is deactivated. Please contact support" | "アカウントが無効化されています。サポートにお問い合わせください" |
| **AUTH_006** | `alertError` | Rate limited (429 response) | Alert banner (destructive) | "Too many attempts. Please wait {seconds} seconds" | "試行回数が多すぎます。{seconds}秒お待ちください" |
| **SYS_001** | `alertError` | Server error (500 response) | Alert banner (destructive) | "Something went wrong. Please try again" | "問題が発生しました。もう一度お試しください" |
| **NET_ERR** | `alertError` | Network error | Alert banner (destructive) | "Network error. Please check your connection" | "ネットワークエラー。接続を確認してください" |

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
| **VAL-AUTH-034** | `txtShopName` | Shop name is empty when role is merchant | Red border. Text below field. | "Shop name is required for merchant registration" | "出品者登録には店舗名が必要です" |
| **VAL-AUTH-035** | `txtShopName` | Shop name exceeds 255 characters | Red border. Text below field. | "Shop name must not exceed 255 characters" | "店舗名は255文字以内にしてください" |
| **AUTH_007** | `txtRegEmail` | Email already exists (409 response) | Red border + inline text | "Email already registered" | "メールアドレスは既に登録されています" |
| **AUTH_006** | `alertError` | Rate limited (429 response) | Alert banner (destructive) | "Too many attempts. Please wait {seconds} seconds" | "試行回数が多すぎます。{seconds}秒お待ちください" |
| **SYS_001** | `alertError` | Server error (500 response) | Alert banner (destructive) | "Something went wrong. Please try again" | "問題が発生しました。もう一度お試しください" |

### 6.3 Forgot Password Validation Errors

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-AUTH-040** | `txtForgotEmail` | Email is empty or invalid format | Red border. Text below field. | "Email is required" / "Invalid email address" | "メールアドレスは必須です" / "メールアドレスが無効です" |
| **VAL-AUTH-041** | `txtForgotEmail` | Email exceeds 255 characters | Red border. Text below field. | "Email must not exceed 255 characters" | "メールアドレスは255文字以内にしてください" |
| **AUTH_008** | `alertError` | Rate limited (429 response) | Alert banner (destructive) | "Too many attempts. Please wait {seconds} seconds" | "試行回数が多すぎます。{seconds}秒お待ちください" |
| **SYS_001** | `alertError` | Server error (500 response) | Alert banner (destructive) | "Something went wrong. Please try again" | "問題が発生しました。もう一度お試しください" |
| **NET_ERR** | `alertError` | Network error | Alert banner (destructive) | "Network error. Please check your connection" | "ネットワークエラー。接続を確認してください" |

### 6.4 Reset Password Validation Errors

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
| **AUTH_009** | `alertError` | Invalid or expired reset token (400 response) | Alert banner (destructive) | "Invalid or expired reset link. Please request a new one." | "無効または期限切れのリセットリンクです。新しいリセットをリクエストしてください。" |
| **AUTH_008** | `alertError` | Rate limited (429 response) | Alert banner (destructive) | "Too many attempts. Please wait {seconds} seconds" | "試行回数が多すぎます。{seconds}秒お待ちください" |
| **SYS_001** | `alertError` | Server error (500 response) | Alert banner (destructive) | "Something went wrong. Please try again" | "問題が発生しました。もう一度お試しください" |
| **NET_ERR** | `alertError` | Network error | Alert banner (destructive) | "Network error. Please check your connection" | "ネットワークエラー。接続を確認してください" | (データベースフィールドマッピング)

### 7.1 Login Form → Database

| Form Field | API Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| `txtEmail` | `email` | `email` | `users` | VARCHAR(255) UNIQUE |
| `txtPassword` | `password` | `password_hash` | `users` | VARCHAR(255) (Argon2 hash) |

### 7.2 Register Form → Database

| Form Field | API Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| `txtFullName` | `name` | `name` | `users` | VARCHAR(200) |
| `txtRegEmail` | `email` | `email` | `users` | VARCHAR(255) UNIQUE |
| `txtRegPassword` | `password` | `password_hash` | `users` | VARCHAR(255) (Argon2 hash) |
| `rdoRole` | `role` | `role` | `users` | VARCHAR(20) (buyer, merchant, admin, super_admin) |
| `txtShopName` | `shopName` | `shop_name` | `merchants` | VARCHAR(255) |
| `uplLicense` | `license` | `business_license_url` | `merchants` | TEXT (nullable) — set with `license_status='pending'` on registration |

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
    "message": "If an account exists with that email, you'll receive a password reset link shortly."
  }
}
```

**Note:** This response is returned regardless of whether the email exists, to prevent email enumeration.

### 8.6 Forgot Password Error Response (Rate Limited)

```json
{
  "statusCode": 429,
  "error": "TOO_MANY_REQUESTS",
  "errorCode": "AUTH_008",
  "message": "Too many attempts. Please wait {seconds} seconds",
  "timestamp": "2026-08-20T12:00:00.000Z",
  "path": "/api/v1/auth/forgot-password"
}
```

### 8.7 Reset Password Success Response

```json
{
  "data": {
    "message": "Your password has been reset successfully."
  }
}
```

### 8.8 Reset Password Error Response (Invalid Token)

```json
{
  "statusCode": 400,
  "error": "BAD_REQUEST",
  "errorCode": "AUTH_009",
  "message": "Invalid or expired reset link. Please request a new one.",
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
| `auth.forgotPassword.success` | "If an account exists with that email, you'll receive a password reset link shortly." |
| `auth.forgotPassword.backToLogin` | "Back to Login" |

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
| `auth.resetPassword.success` | "Your password has been reset successfully." |
| `auth.resetPassword.backToLogin` | "Back to Login" |
| `auth.resetPassword.invalidToken` | "Invalid or expired reset link. Please request a new one." |
| `auth.resetPassword.showPassword` | "Show password" |
| `auth.resetPassword.hidePassword` | "Hide password" |
| `auth.resetPassword.passwordRequirement.length` | "At least 8 characters" |
| `auth.resetPassword.passwordRequirement.uppercase` | "One uppercase letter (A-Z)" |
| `auth.resetPassword.passwordRequirement.lowercase` | "One lowercase letter (a-z)" |
| `auth.resetPassword.passwordRequirement.number` | "One number (0-9)" |
| `auth.resetPassword.passwordRequirement.special` | "One special character (@$!%*?&)" |

### 9.7 Japanese (ja) — Forgot Password

| Key | Value |
| :--- | :--- |
| `auth.forgotPassword.title` | "パスワードをお忘れですか？" |
| `auth.forgotPassword.description` | "メールアドレスを入力すると、リセットリンクを送信します。" |
| `auth.forgotPassword.email` | "メールアドレス" |
| `auth.forgotPassword.emailPlaceholder` | "user@example.com" |
| `auth.forgotPassword.submit` | "リセットリンクを送信" |
| `auth.forgotPassword.submitting` | "送信中..." |
| `auth.forgotPassword.success` | "そのメールアドレスにアカウントが存在する場合、パスワードリセットリンクが送信されます。" |
| `auth.forgotPassword.backToLogin` | "ログインに戻る" |

### 9.8 Japanese (ja) — Reset Password

| Key | Value |
| :--- | :--- |
| `auth.resetPassword.title` | "パスワードをリセット" |
| `auth.resetPassword.description` | "新しいパスワードを入力してください。" |
| `auth.resetPassword.newPassword` | "新しいパスワード" |
| `auth.resetPassword.newPasswordPlaceholder` | "新しいパスワードを作成" |
| `auth.resetPassword.confirmPassword` | "パスワード確認" |
| `auth.resetPassword.confirmPasswordPlaceholder` | "新しいパスワードを再入力" |
| `auth.resetPassword.submit` | "パスワードリセット" |
| `auth.resetPassword.submitting` | "リセット中..." |
| `auth.resetPassword.success` | "パスワードが正常にリセットされました。" |
| `auth.resetPassword.backToLogin` | "ログインに戻る" |
| `auth.resetPassword.invalidToken` | "無効または期限切れのリセットリンクです。新しいリセットをリクエストしてください。" |
| `auth.resetPassword.showPassword` | "パスワードを表示" |
| `auth.resetPassword.hidePassword` | "パスワードを非表示" |
| `auth.resetPassword.passwordRequirement.length` | "8文字以上" |
| `auth.resetPassword.passwordRequirement.uppercase` | "大文字1つ (A-Z)" |
| `auth.resetPassword.passwordRequirement.lowercase` | "小文字1つ (a-z)" |
| `auth.resetPassword.passwordRequirement.number` | "数字1つ (0-9)" |
| `auth.resetPassword.passwordRequirement.special` | "特殊文字1つ (@$!%*?&)" |

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
- [ ] Email max length (255) enforced
- [ ] Password minimum length (8) enforced
- [ ] Show/hide password toggle works
- [ ] Forgot password link navigates to `/forgot-password`
- [ ] Form submits with valid data
- [ ] Error alert displays on invalid credentials (AUTH_001)
- [ ] Error alert displays on deactivated account (AUTH_004)
- [ ] Error alert displays on rate limit (AUTH_006)
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
- [ ] Loading state shows during submission
- [ ] Navigation to login page works
- [ ] All i18n keys render correctly
- [ ] Show/hide password works for all 3 password fields
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
- [ ] Email max length (255) enforced
- [ ] Form submits with valid email
- [ ] Success message displayed after submission
- [ ] Form replaced with success message (no email input visible)
- [ ] "Back to Login" link navigates to `/login`
- [ ] Rate limit error displays on too many attempts (AUTH_008)
- [ ] Loading state shows during submission
- [ ] Auto-focus on email input
- [ ] Language toggle switches all labels
- [ ] Theme toggle works
- [ ] Keyboard navigation works (Tab, Enter)
- [ ] Network error displays appropriate message

### 12.5 Reset Password Form Tests

- [ ] Password strength requirements enforced (5 rules)
- [ ] Password requirements checklist updates in real-time
- [ ] Confirm password match validation works
- [ ] Form submits with valid password
- [ ] Success message displayed after reset
- [ ] "Back to Login" link navigates to `/login`
- [ ] Invalid token error displays on invalid/expired token (AUTH_009)
- [ ] Loading state shows during submission
- [ ] Auto-focus on new password input
- [ ] Show/hide password toggle works for both password fields
- [ ] Language toggle switches all labels
- [ ] Theme toggle works
- [ ] Keyboard navigation works (Tab, Enter)
- [ ] Network error displays appropriate message
- [ ] No token in URL redirects to `/login`

---

*End of Screen Items Specification (Sign-up / Login Page)*
