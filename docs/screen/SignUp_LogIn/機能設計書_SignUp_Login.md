# Functional Specification (機能設計書) — Sign-up / Login / Password Reset

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-FDS-AUTH-001 |
| **Target Screen** | Sign-up / Login / Password Reset (新規登録 / ログイン / パスワード再設定) |
| **Subsystem** | Authentication — User Registration, Session Management & Password Recovery |
| **Function ID** | FN-AUTH-001 |
| **Version** | 4.2 |
| **Created** | 2026-08-04 |
| **Last Updated** | 2026-10-15 |
| **Author** | Software Architect |
| **Status** | Released (承認済み) |
| **Classification** | Internal — Engineering Division |

---

## Document Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-08-04 | Software Architect | Initial functional specification for Sign-up and Login pages covering use cases, business rules, validation, error handling, and permission control. |
| 2.0 | 2026-08-04 | Software Architect | Updated structure to fully conform to standard functional specification template, integrating detailed specifications from Requirement, Database, and Development Rules documents. |
| 3.0 | 2026-08-05 | Software Architect | Added merchant license file upload feature. When role = merchant, user must upload business license PDF (license.pdf, max 10MB). Includes use case, business rules, validation, and API changes. |
| 3.1 | 2026-08-17 | Software Architect | Aligned with REQUIREMENT_SPEC v1.5 / DATABASE_SPEC v2.0: UUID primary keys, `merchants` table with license approval workflow (`license_status`), `users.merchant_id`, `super_admin` role, Argon2 password hashing. |
| 4.0 | 2026-08-20 | Software Architect | Added Forgot Password / Reset Password features: new use cases (UC-AUTH-006/007), new screens (/forgot-password, /reset-password), new API endpoints, `password_reset_tokens` table integration, rate limiting (3/hour), 24-hour token expiry, single-use tokens. Admin registration disabled (login only). |
| 4.1 | 2026-08-21 | Software Architect | Aligned with DATABASE_SPEC v2.1: added conditional shopName (店舗名) required for merchant registration, included super_admin in registration rules, and consolidated /api/v1 API prefixing. |
| 4.2 | 2026-10-15 | Software Architect | Aligned auth page specifications with current Login, Register, Forgot Password, Verify Code, and Reset Password pages; replaced reset-link token flow with six-character verification-code flow. |

---

## Table of Contents

1. [Functional Overview](#1-functional-overview)
2. [Use Cases and Business Workflow](#2-use-cases-and-business-workflow)
3. [State Transition Specification](#3-state-transition-specification)
4. [Business Rules](#4-business-rules)
5. [Screen Specifications](#5-screen-specifications)
6. [Functional Operation Specification](#6-functional-operation-specification)
7. [Input / Output Specification](#7-input--output-specification)
8. [Input Validation Rules](#8-input-validation-rules)
9. [Error Handling Specification](#9-error-handling-specification)
10. [Permission and Access Control](#10-permission-and-access-control)
11. [Real-Time Notification Behavior](#11-real-time-notification-behavior)
12. [Screen Transition Specification](#12-screen-transition-specification)
13. [Non-Functional Considerations](#13-non-functional-considerations)
14. [Configurable Items (External Definitions)](#14-configurable-items-external-definitions)
15. [Cross-Reference Traceability Matrix](#15-cross-reference-traceability-matrix)

---

## 1. Functional Overview

### 1.1 Purpose and Scope

This screen serves as the entry point for user authentication within the Cosmetics Finder platform. The Sign-up, Login, and Password Reset subsystem provides the complete set of capabilities necessary for new users to create accounts, existing users to authenticate and establish secure sessions, and all users to recover forgotten passwords.

This subsystem is the gateway to all platform functionality. It is responsible for ensuring that only properly validated, authenticated users can access protected features, while maintaining security through JWT token management, password hashing, session tracking, and secure password recovery.

### 1.2 Functional Responsibilities

This screen is responsible for the following core functional areas:

1. **User Registration** — Enabling new users to create accounts with email, password, name, and role selection (Buyer or Merchant).
2. **Merchant License Upload** — When registering as a Merchant, users must upload a business license PDF file (license.pdf, max 10MB).
3. **User Authentication** — Validating user credentials and issuing JWT access tokens (15-minute expiry) and refresh tokens (7-day expiry).
4. **Session Management** — Managing token refresh, rotation, and revocation with family tracking for breach detection.
5. **Token Blacklisting** — Implementing Redis-based token blacklisting for secure logout.
6. **Password Security** — Hashing passwords with Argon2id algorithm (64MB memory, 3 iterations, 4 threads).
7. **Request Throttling** — The inspected auth service has no backend rate limiter; the Verify Code page applies a 60-second client-side resend cooldown after successful resend.
8. **Account Verification** — Verifying token validity for protected route access.
9. **Password Recovery** — Let users request an emailed six-digit code, verify it, and submit a new password.

### 1.3 Target Users

| Attribute | Value |
|-----------|-------|
| **Primary Actor** | Unauthenticated visitor (Registration), Authenticated user (Login/Session), Any user (Password Recovery) |
| **Required Authentication** | None (Registration, Password Reset Request), JWT Bearer Token (Session operations), Reset Token (Password Reset) |
| **Data Scope** | New user creation (Registration), Own session management (Login/Logout), Own password recovery (Password Reset) |

### 1.4 Relationships with Other Functions and Peripheral Systems

```text
┌──────────────────────────┐      ┌─────────────────────────────────────┐
│   New User Actor         │      │     users / refresh_tokens          │
│   (Registers Account)    ├─────►│  Creates user records               │
└──────────────────────────┘      └──────────────┬────────────────────┘
                                                 │ Reads/Writes
                                                 ▼
                                      ┌────────────────────────┐
                                      │  Authentication Module │
                                      └──────────┬─────────────┘
                                                 │ JWT/Redis
                                                 ▼
┌──────────────────────────┐      ┌─────────────────────────────────────┐
│   Existing User Actor    │      │     Redis (Blacklist/Session)       │
│ (Logs In / Refreshes)    ├─────┤  Manages token lifecycle             │
└──────────────────────────┘      └─────────────────────────────────────┘

┌──────────────────────────┐      ┌─────────────────────────────────────┐
│   Any User Actor         │      │     password_reset_tokens           │
│ (Forgot Password)        ├─────►│  Creates reset token                │
└──────────────────────────┘      └──────────────┬────────────────────┘
                                                 │ Sends Email
                                                 ▼
                                      ┌────────────────────────┐
                                      │   Email Service        │
                                      │   (Reset Link)         │
                                      └────────────────────────┘
```

### 1.5 Inputs / Outputs

| Input Information | Data Category | Source / Description |
|-------------------|---------------|----------------------|
| `email` | User Input | Email address for registration, login, or password reset |
| `password` | User Input | Password for registration or login |
| `name` | User Input | Name for registration; the UI relabels the same input as “Shop Name” for merchants |
| `role` | User Input | Role selection (buyer/merchant) for registration |
| `license` | File Upload | Business license PDF (merchant only, max 10MB) |
| `confirmPassword`, `agreeToTerms` | Client-only form values | Registration validation; not sent to the API |
| `refreshToken` | JSON request body | Refresh token used by the frontend API client |
| `code` | User Input / router state | Six-character password-recovery code |

| Output Information | Data Category | Destination / Description |
|--------------------|---------------|---------------------------|
| `accessToken` | JWT Token | Returned in response body for API authorization |
| `refreshToken` | JSON response body | Stored by the current frontend auth provider in local storage |
| `user` | User DTO | User profile data (excluding password hash) |
| `licenseUrl` | URL | Path to uploaded license file (merchant only) |
| `blacklist` | Redis Key | Token revocation record for logout |
| `message` | API response | Message response for forgot-password, verify-code, and reset-password operations |

### 1.6 Related Documents

| No. | Document ID | Document Name | File Path / Reference | Remarks |
|-----|-------------|---------------|----------------------|---------|
| 1 | SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | Business workflow logic, required fields, and rules. |
| 2 | SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | Table structures (`users`, `refresh_tokens`, `password_reset_tokens`), constraints. |
| 3 | SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | Security rules, design tokens, error responses. |

---

## 2. Use Cases and Business Workflow

### 2.1 Use Case Catalog

| UC-ID | Use Case Name | Precondition | Postcondition | Triggering Actor |
|-------|---------------|--------------|---------------|------------------|
| UC-AUTH-001 | Register New Account | User is not authenticated. | New user record created in `users` table with hashed password. User redirected to login page. | Visitor |
| UC-AUTH-001A | Upload Merchant License | User selects "Merchant" role during registration. | License PDF uploaded and stored. `merchants` record created with `license_status='pending'` awaiting admin approval. | Visitor |
| UC-AUTH-002 | Login with Credentials | User has existing account. | API returns user and tokens; frontend stores tokens and navigates to a redirect target or role dashboard. | Visitor |
| UC-AUTH-003 | Refresh Access Token | Valid refresh token exists in local storage. | Frontend posts refresh token in request body; successful response replaces stored tokens and retries the original request. | Authenticated User |
| UC-AUTH-004 | Logout | User is authenticated. | Access token blacklisted in Redis. Refresh token revoked. User redirected to login page. | Authenticated User |
| UC-AUTH-005 | Verify Token Validity | User has access token. | Token validated. User profile returned. | Authenticated User |
| UC-AUTH-006 | Request Password Recovery Code | User enters an email on Forgot Password. | Frontend navigates to Verification Code with email in router location state after API success. | Visitor |
| UC-AUTH-006A | Verify Password Recovery Code | Email is present in router state and user enters a six-character code. | Valid code is checked by the API; frontend passes email and code to Reset Password in router state. | Visitor |
| UC-AUTH-007 | Reset Password with Code | Email and code are present in router state. | New password is submitted with email and code; success view offers a link to Login. | Visitor |

### 2.2 Primary Business Workflow

```
                        ┌──────────────────┐
                        │  Visitor Arrives │
                        │  (Not Authenticated) │
                        └────────┬─────────┘
                                 │
                                 ▼
                   ┌─────────────────────────────┐
                   │  Separate Auth Routes       │
                   │ (Login, Register, Recovery) │
                   └──────────┬──────────────────┘
                              │
              ┌───────────────┼───────────────────┐
              ▼               ▼                   ▼
    ┌─────────────┐  ┌──────────────┐   ┌──────────────────┐
    │ Login Page │  │ Register Page│   │ Language/Theme   │
    │ (UC-AUTH-02)│  │ (UC-AUTH-01) │   │ Shared Header    │
    └──────┬──────┘  └──────┬───────┘   └──────────────────┘
           │                │
           ▼                ▼
    ┌──────────────────────────────────────────────────┐
    │         Authentication Form (Email/Password)     │
    └──────────────────┬───────────────────────────────┘
                       │
          ┌────────────┼────────────────┐
          ▼            ▼                ▼
   ┌────────────┐ ┌──────────────┐ ┌──────────────┐
   │ Submit     │ │ Form         │ │ Link to      │
   │ Credentials│ │ Validation   │ │ Other Tab    │
   └─────┬──────┘ └──────────────┘ └──────────────┘
         │
   ┌─────┴──────┐
   ▼            ▼
┌───────────┐ ┌──────────────────┐
│ Validation│ │ Validation FAIL  │
│  PASS     │ │ (Error Display)  │
└─────┬─────┘ └──────────────────┘
      │
      ▼
┌──────────────────────┐
│ Backend Processing   │
│ (Password Verify /   │
│  User Creation)      │
└──────────┬───────────┘
           │
  ┌────────┴──────────────────────┐
  ▼                               ▼
┌──────────────┐        ┌─────────────────────┐
│  SUCCESS     │        │  FAILURE            │
│  (200/201)   │        │  (400/401/409)      │
└──────┬───────┘        └─────────┬───────────┘
       │                          │
       ▼                          ▼
┌──────────────┐        ┌─────────────────────┐
│ Store Tokens │        │ Display Error       │
│ Redirect by  │        │ Message             │
│ Role/Query   │        └─────────────────────┘
└──────────────┘
```

Password recovery uses separate routes: Forgot Password sends the email to `/verify-code` in router state; successful code verification sends `{ email, code }` to `/reset-password` in router state. Missing required state on Verify Code or Reset Password returns the user to `/forgot-password`.

### 2.3 Workflow Critical Path Summary

| Step | Action | Status Before | Status After | Assigned To |
|:----:|--------|---------------|--------------|-------------|
| 1 | Visitor navigates to /login or /register | Unauthenticated | — | System |
| 2 | Visitor fills registration form | — | — | Visitor |
| 3 | Visitor submits registration | — | User Created | System |
| 4 | Visitor redirected to login | — | — | System |
| 5 | User fills login form | — | — | User |
| 6 | User submits login | Unauthenticated | Authenticated | System |
| 7 | Tokens issued | — | Session Active | System |
| 8 | User accesses protected features | — | — | User |

### 2.4 Relevant Requirements Covered

| Requirement ID | Requirement Summary |
|----------------|---------------------|
| B-AUTH-001 | User can register with email and password |
| B-AUTH-002 | User can login with email and password |
| B-AUTH-003 | System issues JWT access token (15 min) and refresh token (7 days) |
| B-AUTH-004 | User can logout (token blacklisted in Redis) |
| B-AUTH-005 | Access token auto-refreshes via refresh token |
| B-AUTH-006 | Password is hashed with Argon2 |
| B-AUTH-007 | Refresh token rotation on every use |
| B-AUTH-008 | Token family tracking for breach detection |
| B-AUTH-009 | User can request password reset via email |
| B-AUTH-010 | Recovery verification code expires after 10 minutes |
| B-AUTH-011 | Recovery code is marked used after a successful password reset |

---

## 3. State Transition Specification

### 3.1 User Account States

| State | Description | Can Login | Can Register |
|-------|-------------|:---------:|:------------:|
| `NEW` | User just registered, not yet logged in | ✓ | ✗ |
| `ACTIVE` | User account is active and can authenticate | ✓ | ✗ |
| `INACTIVE` | User account deactivated by admin | ✗ | ✗ |
| `EMAIL_UNVERIFIED` | Email not yet verified | ✓ (limited) | ✗ |

### 3.2 Session States

| State | Description | Can Access API | Can Refresh |
|-------|-------------|:--------------:|:-----------:|
| `NO_SESSION` | No tokens issued | ✗ | ✗ |
| `ACCESS_VALID` | Access token valid (≤15 min) | ✓ | ✓ |
| `ACCESS_EXPIRED` | Access token expired, refresh valid | ✗ | ✓ |
| `REFRESH_EXPIRED` | Both tokens expired | ✗ | ✗ |
| `BLACKLISTED` | Token revoked (logout) | ✗ | ✗ |

### 3.3 Token Lifecycle Transitions

| Transition ID | Origin State | Target State | Trigger Action | Guard Conditions |
|---------------|--------------|--------------|----------------|------------------|
| TR-AUTH-01 | `NO_SESSION` | `ACCESS_VALID` | Login success | Valid credentials |
| TR-AUTH-02 | `ACCESS_VALID` | `ACCESS_VALID` | Token refresh | Valid refresh token, not blacklisted |
| TR-AUTH-03 | `ACCESS_EXPIRED` | `ACCESS_VALID` | Token refresh | Valid refresh token, not expired |
| TR-AUTH-04 | `ACCESS_VALID` | `BLACKLISTED` | Logout | User initiates logout |
| TR-AUTH-05 | `BLACKLISTED` | `NO_SESSION` | Token expiry | TTL expires in Redis |

---

## 4. Business Rules

### 4.1 Registration Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AUTH-001 | Email Uniqueness | Email must be unique across all users. | Backend (DB constraint + service check) |
| BR-AUTH-002 | Password Strength | Frontend registration form requires 8–128 characters, uppercase, lowercase, digit, and one of `@$!%*?&`. Registration DTO requires a minimum of 8 characters only. | Frontend (Zod) + Backend (DTO; weaker rule) |
| BR-AUTH-003 | Role Restriction | Only 'buyer' or 'merchant' roles allowed during registration. | Backend (DTO validation) |
| BR-AUTH-004 | Default Role | If role not specified, defaults to 'buyer'. | Backend (service logic) |
| BR-AUTH-005 | Email Verification | New users are created with `emailVerified = true` (accounts are treated as verified at registration). | Backend (user creation) |
| BR-AUTH-020 | Merchant License Required | When role = 'merchant', license file upload is mandatory. | Backend (DTO validation) + Frontend (conditional validation) |
| BR-AUTH-021 | License File Type | License file must be PDF format only. | Backend (file validation) + Frontend (accept attribute) |
| BR-AUTH-022 | License File Name | License file must be named 'license.pdf' (case-insensitive). | Backend (file validation) + Frontend (file name check) |
| BR-AUTH-023 | License File Size | License file must not exceed 10MB. | Backend (file validation) + Frontend (size check) |
| BR-AUTH-024 | Merchant License Status | Merchant registration creates `merchants` record with `license_status='pending'`; merchant features stay locked until admin sets `license_status='approved'`. | Backend (merchant creation, approval workflow) |
| BR-AUTH-025 | Admin Registration Disabled | Admin and Super Admin accounts cannot be created via registration. Admin/Super Admin accounts are system-seeded or created by Admin/Super Admin. | Backend (role validation) + Frontend (role options) |
| BR-AUTH-026 | Merchant Name Label | For a merchant, the same `name` input is labeled “Shop Name”; no separate `shopName` field is submitted. | Frontend label; backend service reuses `name` |

### 4.2 Login Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AUTH-006 | Credential Validation | Email must exist and password must match Argon2 hash. | Backend (auth service) |
| BR-AUTH-007 | Account Active Check | User must have `isActive = true` to login. | Backend (auth service) |
| BR-AUTH-008 | Login Rate Limiting | No login rate limiter is applied in the inspected auth service flow. | Not implemented in current source |
| BR-AUTH-009 | Generic Error Messages | Never reveal whether email exists or password is wrong. | Backend (error handling) |

### 4.3 Token Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AUTH-010 | Access Token Expiry | Access tokens expire after 15 minutes. | Backend (JWT config) |
| BR-AUTH-011 | Refresh Token Expiry | Refresh tokens expire after 7 days. | Backend (JWT config) |
| BR-AUTH-012 | Absolute Session Limit | Maximum session duration of 90 days regardless of rotations. | Backend (refresh token record) |
| BR-AUTH-013 | Token Rotation | New refresh token issued on every refresh request. | Backend (auth service) |
| BR-AUTH-014 | Family Tracking | Each login session has unique family ID for breach detection. | Backend (refresh token record) |
| BR-AUTH-015 | Reuse Detection | If revoked token is used, ALL tokens for that user are revoked. | Backend (auth service) |

### 4.4 Security Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AUTH-016 | Password Hashing | Use Argon2id with 64MB memory, 3 iterations, 4 threads. | Backend (argon2 library) |
| BR-AUTH-017 | Token Storage | The current frontend stores access and refresh tokens in localStorage after login. | Frontend (`AuthProvider`) |
| BR-AUTH-018 | Refresh Request | The frontend sends the refresh token in the JSON request body; the controller does not use a refresh-token cookie. | Frontend API client and backend controller |
| BR-AUTH-019 | CORS Protection | Only allowed origins can access auth endpoints. | Backend (CORS config) |

### 4.5 Password Reset Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AUTH-030 | Recovery Code Expiry | Password recovery code expires after 10 minutes. | Backend (auth service) |
| BR-AUTH-031 | Recovery Code Use | Code is checked at verification and consumed after successful password reset. | Backend (auth service) |
| BR-AUTH-032 | Replace Earlier Codes | A new code request marks the user's previous unused recovery records used. | Backend (auth service) |
| BR-AUTH-033 | Unknown Email Response | Forgot-password currently returns 404 when no account exists; it does not always return a generic success response. | Backend (auth service) |
| BR-AUTH-034 | Resend Cooldown | The Verification Code page prevents another resend for 60 seconds after a successful resend. | Frontend only |
| BR-AUTH-035 | Password Hash Updated | New password is hashed with Argon2 before storing. | Backend (auth service) |

---

## 5. Screen Specifications

### 5.1 Screen: Login Page (`/login`)

**Purpose:** Allow existing users to authenticate with email and password.

#### 5.1.1 UI Elements

**Login Form:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-01 | Logo | Image | — | No | Application logo (Cosmetics Finder) |
| EL-02 | System Name | Text | `app.name` | No | "Cosmetics Finder" |
| EL-03 | Email Label | Label | `auth.email` | Yes | "Email" |
| EL-04 | Email Input | Input (email) | `auth.emailPlaceholder` | Yes | Email address input |
| EL-05 | Password Label | Label | `auth.password` | Yes | "Password" |
| EL-06 | Password Input | Input (password) | `auth.passwordPlaceholder` | Yes | Password input with show/hide toggle |
| EL-07 | Show Password | Button (icon) | — | No | Toggle password visibility |
| EL-08 | Log In Button | Button (primary) | `auth.login` | Yes | Submit login form |
| EL-09 | Sign Up Link | Link | `auth.noAccount` | No | "Don't have an account? Sign Up" |
| EL-09A | Forgot Password Link | Link | `auth.forgotPassword` | No | "Forgot password?" |
| EL-10 | Language Toggle | Toggle | — | No | Switch between EN/JA/MY |
| EL-11 | Theme Toggle | Toggle | — | No | Switch between Light/Dark |

**Default State:**
- Email input auto-focused
- Log In button is disabled and shows a loading indicator while the request is in progress.
- An authenticated user is redirected to the `redirect` query value when present, otherwise to the dashboard route for the user's role.

### 5.2 Screen: Register Page (`/register`)

**Purpose:** Allow new users to create accounts with role selection.

#### 5.2.1 UI Elements

**Register Form:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-12 | Logo | Image | — | No | Application logo |
| EL-13 | System Name | Text | `app.name` | No | "Cosmetics Finder" |
| EL-14 | Name Label | Label | `auth.register.fullName` / `auth.register.shopName` | Yes | "Full Name" for buyer; "Shop Name" for merchant |
| EL-15 | Name Input | Input (text) | `auth.register.fullNamePlaceholder` / `auth.register.shopNamePlaceholder` | Yes | One `name` value; no separate shop-name field |
| EL-16 | Email Label | Label | `auth.email` | Yes | "Email" |
| EL-17 | Email Input | Input (email) | `auth.emailPlaceholder` | Yes | Email address input |
| EL-18 | Password Label | Label | `auth.password` | Yes | "Password" |
| EL-19 | Password Input | Input (password) | `auth.register.passwordPlaceholder` | Yes | Password with show/hide control |
| EL-20 | Password Requirements | Helper Text | — | No | Shows password rules |
| EL-21 | Confirm Password Label | Label | `auth.confirmPassword` | Yes | "Confirm Password" |
| EL-22 | Confirm Password Input | Input (password) | `auth.confirmPasswordPlaceholder` | Yes | Must match password |
| EL-23 | Role Selection | Radio Group | `auth.iAm` | Yes | "I am a:" |
| EL-24 | Buyer Radio | Radio Button | `auth.buyer` | Yes | "Buyer" - Browse and purchase |
| EL-25 | Merchant Radio | Radio Button | `auth.merchant` | Yes | "Merchant" - Sell products |
| EL-35 | Terms Agreement | Checkbox | `auth.register.termsAgreement` | Yes | Must be selected; client-side only |
| EL-30 | License Label | Label | `auth.license` | Conditional | "Business License (PDF)" — shown when Merchant selected |
| EL-31 | License Upload | File Input | `auth.licensePlaceholder` | Conditional | PDF upload with drag & drop zone — shown when Merchant selected |
| EL-32 | License Helper | Helper Text | `auth.licenseHelper` | No | "Upload your business license as PDF (max 10MB). File must be named license.pdf." |
| EL-33 | License File Name | Text | — | No | Displays uploaded filename "license.pdf" |
| EL-34 | Remove License | Icon Button | `auth.licenseRemove` | No | Remove uploaded file and show upload zone again |
| EL-26 | Create Account Button | Button (primary) | `auth.createAccount` | Yes | Submit registration |
| EL-27 | Log In Link | Link | `auth.hasAccount` | No | "Already have an account? Log In" |
| EL-28 | Language Toggle | Toggle | — | No | Switch between EN/JA/MY |
| EL-29 | Theme Toggle | Toggle | — | No | Switch between Light/Dark |

**Default State:**
- Buyer radio selected by default
- Password requirements shown below password field
- License upload field hidden (shown only when Merchant selected)
- Submit button is disabled and shows a loading indicator only while registration is in progress.
- Selecting Buyer clears a previously selected license file.

### 5.3 Screen: Forgot Password Page (`/forgot-password`)

**Purpose:** Request a six-digit password recovery code by email.

#### 5.3.1 UI Elements

**Forgot Password Form:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-40 | Logo | Image | — | No | Application logo |
| EL-41 | System Name | Text | `app.name` | No | "Cosmetics Finder" |
| EL-42 | Title | Text | `auth.forgotPasswordTitle` | No | "Forgot your password?" |
| EL-43 | Description | Text | `auth.forgotPassword.description` | No | Prompts the user to enter an email to receive a verification code. |
| EL-44 | Email Label | Label | `auth.email` | Yes | "Email" |
| EL-45 | Email Input | Input (email) | `auth.emailPlaceholder` | Yes | Email address input |
| EL-46 | Send Verification Code Button | Button (primary) | `auth.forgotPassword.submit` | Yes | Submit email and request a recovery code |
| EL-47 | Back to Login Link | Link | `auth.backToLogin` | No | "Back to Login" |
| EL-48 | Language Toggle | Toggle | — | No | Switch between EN/JA/MY |
| EL-49 | Theme Toggle | Toggle | — | No | Switch between Light/Dark |

**Default State:**
- Email input auto-focused
- Submit button is disabled and shows a loading indicator while the request is in progress.

**Success State:**
- On API success, navigate to `/verify-code` and pass the entered email in React Router location state. The page does not replace its form with an in-place success view.
- API failures are shown in a destructive alert; unknown email may be returned by the API as an error.

### 5.4 Screen: Verification Code Page (`/verify-code`)

**Purpose:** Verify the six-character password recovery code sent for the submitted email.

| Element | Type | Behavior |
|---------|------|----------|
| Page title and description | Text | Description displays a masked email from router location state. |
| Code input | Text input | Numeric input mode, one-time-code autocomplete, autofocus, max length 6; schema requires exactly 6 characters. |
| Verify button | Submit button | Calls verification with email and code; disabled with loading indicator while submitting. |
| Resend code button | Button | Requests a new code for the same email; after success displays an alert and starts a 60-second cooldown. Disabled while resending or during cooldown. |
| Back to email link | Link | Navigates to `/forgot-password`. |
| Error/success alerts | Alert | Displays request errors or resend success. |

If email is missing from router location state, the page redirects to `/forgot-password` and renders no form content. On successful verification, it navigates to Reset Password with email and code in location state.

### 5.5 Screen: Reset Password Page (`/reset-password`)

**Purpose:** Allow users to set a new password after verifying a recovery code.

#### 5.4.1 UI Elements

**Reset Password Form:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-50 | Logo | Image | — | No | Application logo |
| EL-51 | System Name | Text | `app.name` | No | "Cosmetics Finder" |
| EL-52 | Title | Text | `auth.resetPasswordTitle` | No | "Reset your password" |
| EL-53 | Description | Text | `auth.resetPasswordDesc` | No | "Enter your new password below." |
| EL-54 | New Password Label | Label | `auth.newPassword` | Yes | "New Password" |
| EL-55 | New Password Input | Input (password) | `auth.resetPassword.newPasswordPlaceholder` | Yes | Password with show/hide control and shared strength indicator |
| EL-56 | Password Strength | Component | — | No | `PasswordStrengthIndicator` reflects the new password |
| EL-57 | Confirm Password Label | Label | `auth.confirmPassword` | Yes | "Confirm Password" |
| EL-58 | Confirm Password Input | Input (password) | `auth.confirmPasswordPlaceholder` | Yes | Must match new password |
| EL-59 | Reset Password Button | Button (primary) | `auth.resetPassword` | Yes | Submit new password |
| EL-60 | Back to Login Link | Link | `auth.backToLogin` | No | "Back to Login" |
| EL-61 | Language Toggle | Toggle | — | No | Switch between EN/JA/MY |
| EL-62 | Theme Toggle | Toggle | — | No | Switch between Light/Dark |

**Default State:**
- New Password input auto-focused
- The page requires email and code in React Router location state. If either is missing, it redirects to `/forgot-password` and renders no form content.
- Reset Password button is disabled and shows a loading indicator while the request is in progress.

**Success State:**
- After successful reset, show success message: "Your password has been reset successfully."
- Show "Back to Login" link
- A success toast is also shown; the form is replaced by the success view.
- Invalid or expired code errors are displayed in an alert; the page does not automatically redirect to Login.

---

## 6. Functional Operation Specification

### 6.1 Operation: User Registration

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Register page form submission |
| **API Endpoint** | `POST /api/v1/auth/register` |
| **Request Content-Type** | `multipart/form-data`; `authService.register()` appends `email`, `name`, `password`, optional `role`, optional `address`, optional `phone`, and optional `license` file. |
| **Pre-Submission Validation** | Zod validates name (2–200), email (valid, max 255), password (8–128 and complexity), confirmation match, buyer/merchant role, terms agreement, conditional merchant license requirements, and (merchant only) address (required, max 255) and phone (required, `^\+?[0-9()\-\s]{7,20}$`). |
| **Processing Steps** | The UI sends one `name` value. For merchants its label changes to “Shop Name”; no separate `shopName` field or request property exists. `confirmPassword` and `agreeToTerms` remain client-only. |
| **Success Response** | Service returns user and token data within the API data envelope. |
| **Post-Action** | Show a success toast and navigate to `/login`; the Register page does not establish the returned tokens in AuthProvider. |

### 6.2 Operation: User Login

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Log In" button click on Login form |
| **API Endpoint** | `POST /api/v1/auth/login` |
| **Request Content-Type** | `application/json` |
| **Pre-Submission Validation** | Zod requires a valid email and a password of at least 8 characters. |
| **Processing Steps** | Login page calls the auth hook with email and password. On success the auth provider stores access and refresh tokens and sets the user. |
| **Success Response** | API returns user, access token, and refresh token in the response body. |
| **Post-Action** | Show a success toast. Auth navigation uses the `redirect` query value when present, otherwise the role-specific dashboard route. |

### 6.3 Operation: Token Refresh

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Automatic when access token expires, or manual refresh |
| **API Endpoint** | `POST /api/v1/auth/refresh` |
| **Request Content-Type** | None (reads from cookie) |
| **Pre-Submission Validation** | Refresh token exists in cookie |
| **Processing Steps** | 1. Read refresh token from cookie. 2. Verify JWT signature. 3. Find token record by hash. 4. Validate not revoked, not expired, within absolute limit. 5. Check token family for reuse. 6. Revoke old token. 7. Generate new access token. 8. Generate new refresh token (same family). 9. Hash and store new token. 10. Set new httpOnly cookie. 11. Return new access token. 12. Log TOKEN_REFRESHED event. |
| **Success Response** | 200 OK with new accessToken |
| **Error Response** | 401 Unauthorized (various reasons) |

### 6.4 Operation: User Logout

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Logout" action from UI |
| **API Endpoint** | `POST /api/v1/auth/logout` |
| **Request Headers** | `Authorization: Bearer <accessToken>` |
| **Pre-Submission Validation** | Valid access token |
| **Processing Steps** | 1. Validate access token. 2. Extract jti from payload. 3. Add jti to Redis blacklist with remaining TTL. 4. Revoke refresh token. 5. Return 204 No Content. 6. Log USER_LOGOUT event. |
| **Success Response** | 204 No Content |
| **Post-Action** | Clear client-side token, redirect to login |

### 6.5 Operation: Token Verification

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | App load, or accessing protected route |
| **API Endpoint** | `GET /api/v1/auth/verify` |
| **Request Headers** | `Authorization: Bearer <accessToken>` |
| **Pre-Submission Validation** | Access token exists |
| **Processing Steps** | 1. Validate access token signature. 2. Check Redis blacklist. 3. Extract user data from payload. 4. Return user DTO. |
| **Success Response** | 200 OK with user data |
| **Error Response** | 401 Unauthorized |

### 6.6 Operation: Request Password Reset

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Forgot Password form submission |
| **API Endpoint** | `POST /api/v1/auth/forgot-password` |
| **Request Content-Type** | `application/json` |
| **Pre-Submission Validation** | `forgotPasswordSchema` requires a valid email. |
| **Processing Steps** | Frontend sends `{ email }`. On API success, the page navigates to `/verify-code` and passes the email in React Router location state. The page has no separate success view. |
| **API Behavior** | Backend creates a six-digit code with a 10-minute expiry for an existing account and attempts to email it. Unknown email currently returns 404; email delivery failure is logged while the service returns its success message. |
| **Error Response** | Page displays the response message when present, otherwise the thrown error message or translated fallback. |

### 6.7 Operation: Reset Password

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Reset Password form submission after successful code verification |
| **API Endpoint** | `POST /api/v1/auth/reset-password` |
| **Request Content-Type** | `application/json` |
| **Request Body** | `{ email, code, password }`; confirmation is not sent. |
| **Pre-Submission Validation** | Email and code must be present in router state. Password must be 8–128 characters and satisfy the complexity rules; confirmation must match. |
| **Processing Steps** | The page sends email, code, and new password. The API checks the recovery code, updates the password, and consumes the code on success. |
| **Success Response** | 200 OK with message "Your password has been reset successfully." |
| **Post-Action** | Show a success toast and replace the form with a success view containing a Back to Login link. |
| **Error Response** | An invalid or expired code is displayed in the page alert; the user can return to Forgot Password. |

---

## 7. Input / Output Specification

### 7.1 Input Specification — Registration (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `email` | Email | メールアドレス | String | Yes | Input (email) | Frontend: valid email, max 255 characters |
| `password` | Password | パスワード | String | Yes | Input (password) | Frontend: 8–128 characters, uppercase, lowercase, digit, and special character |
| `name` | Full Name / Shop Name | 氏名 / 店舗名 | String | Yes | Input (text) | Frontend: 2–200 characters; same field is labeled “Shop Name” for merchants |
| `role` | Role | ロール | Enum | Yes | Radio Group | `buyer` or `merchant`; defaults to `buyer` |
| `confirmPassword` | Confirm Password | パスワード確認 | String | Yes | Input (password) | Client-only; must match password |
| `agreeToTerms` | Terms agreement | 利用規約への同意 | Boolean | Yes | Checkbox | Client-only; must be true |
| `license` | Business License | 事業許可書 | File (PDF) | Conditional | File input / drag and drop | Merchant only; PDF, ≤10 MB, filename `license.pdf` (case-insensitive) |

### 7.2 Input Specification — Login (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `email` | Email | メールアドレス | VARCHAR(255) | Yes | Input (email) | `@IsEmail()`, `@IsNotEmpty()` |
| `password` | Password | パスワード | VARCHAR(128) | Yes | Input (password) | `@IsNotEmpty()`, `@MinLength(8)` |

### 7.3 Input Specification — Forgot Password (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `email` | Email | メールアドレス | VARCHAR(255) | Yes | Input (email) | `@IsEmail()`, `@IsNotEmpty()` |

### 7.4 Input Specification — Verify Recovery Code (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `email` | Email | メールアドレス | String in router state | Yes | Not directly editable | Passed from Forgot Password |
| `code` | Verification Code | 確認コード | String(6) | Yes | Text input | Exactly 6 characters; numeric input mode; max length 6 |

### 7.5 Input Specification — Reset Password (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `email` | Email | メールアドレス | String in router state | Yes | Not directly editable | Passed from Verify Code |
| `code` | Verification Code | 確認コード | String(6) in router state | Yes | Not directly editable | Passed from Verify Code |
| `password` | New Password | 新しいパスワード | String(128) | Yes | Input (password) | 8–128 characters; uppercase, lowercase, digit, special character |
| `confirmPassword` | Confirm Password | パスワード確認 | String | Yes | Input (password) | Client-only; must match password |

### 7.6 Output Specification — Login Success (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `accessToken` | JWT Generation | Bearer token string |
| `refreshToken` | API response body | Token string |
| `user.id` | `users.id` | UUID string |
| `user.email` | `users.email` | String |
| `user.name` | `users.name` | String |
| `user.role` | `users.role` | Role enum string |
| `user.merchantId` | `users.merchant_id` | UUID string or null |
| `user.licenseStatus` | `merchants.license_status` | pending/approved/rejected or null |
| `user.avatarUrl` | `users.avatar_url` | URL or null |

### 7.7 Output Specification — Registration Success (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `id` | `users.id` | UUID string |
| `email` | `users.email` | String |
| `name` | `users.name` | String |
| `role` | `users.role` | Role enum string |
| `merchantId` | `merchants.id` | UUID string or null (merchant only) |
| `licenseStatus` | `merchants.license_status` | 'pending' / 'approved' / 'rejected', null (buyer) |
| `emailVerified` | `users.email_verified` | Boolean |
| `licenseUrl` | `merchants.business_license_url` | URL string or null (merchant only) |
| `createdAt` | `users.created_at` | ISO 8601 timestamp |

### 7.8 Output Specification — Recovery Operations (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `message` | API response | Message response for code request, code verification, or successful password reset |

---

## 8. Input Validation Rules

### 8.1 Registration Validation (Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `name` | Required, 2–200 characters. Merchant UI labels this same field “Shop Name”. | “Name must be at least 2 characters” / “Name must not exceed 200 characters” | Frontend Zod schema |
| `email` | Required, valid format, max 255 characters | “Email is required” / “Please enter a valid email address” / max-length message | Frontend Zod schema |
| `password` | Required, 8–128 characters with uppercase, lowercase, digit, and one of `@$!%*?&` | Translated field-level validation messages | Frontend Zod schema |
| `confirmPassword` | Required and must match password | “Passwords do not match” | Frontend Zod schema |
| `role` | Buyer or merchant; defaults to buyer | “Please select a role” | Frontend Zod schema |
| `agreeToTerms` | Must be true | Terms agreement validation message | Frontend Zod schema |
| `licenseFile` | Required for merchant; PDF, ≤10 MB, filename `license.pdf` (case-insensitive) | File-specific validation messages | Frontend Zod schema |

### 8.2 Login Validation (Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `email` | Required, valid email format | "Email is required" / "Invalid email address" | "メールアドレスは必須です" / "メールアドレスが無効です" |
| `password` | Required, min 8 chars | "Password is required" / "Password must be at least 8 characters" | "パスワードは必須です" / "パスワードは8文字以上である必要があります" |

### 8.3 Forgot Password Validation (Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `email` | Required, valid email format | "Email is required" / "Invalid email address" | "メールアドレスは必須です" / "メールアドレスが無効です" |

### 8.4 Verify Code Validation

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `code` | Required; exactly 6 characters. Input uses numeric mode and max length 6. | “Verification code is required” / “Code must be exactly 6 digits” | Schema-defined messages |

### 8.5 Reset Password Validation

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `password` | Required, 8–128 chars, uppercase, lowercase, digit, special char from `@$!%*?&` | Schema-defined password messages | Translated schema messages |
| `confirmPassword` | Required and must match password | “Passwords do not match” | Translated schema message |

### 8.6 Password Strength Requirements

```
Minimum Requirements:
✓ At least 8 characters
✓ At least 1 uppercase letter (A-Z)
✓ At least 1 lowercase letter (a-z)
✓ At least 1 number (0-9)
✓ At least 1 special character (@$!%*?&)
```

### 8.7 Validation Enforcement Layers

1. **Frontend (Client)**: React Hook Form + Zod schema validation with real-time feedback.
2. **Backend (Server)**: NestJS ValidationPipe + class-validator DTOs on all endpoints.

---

## 9. Error Handling Specification

### 9.1 Error Response Structure

```json
{
  "statusCode": 400,
  "message": ["email must be an email", "password must be longer than 8 characters"],
  "error": "Bad Request",
  "timestamp": "2026-08-04T12:00:00.000Z",
  "path": "/api/v1/auth/register"
}
```

### 9.2 Error Classification Table — Registration

| HTTP Status | Error Code | Scenario | User-Facing Behavior |
|-------------|------------|----------|---------------------|
| `400` | `BAD_REQUEST` | Validation failures | Field-level inline errors + top banner |
| `400` | `VALIDATION_ERROR` | License file not PDF | "File must be PDF format" |
| `400` | `VALIDATION_ERROR` | License file not named license.pdf | "File must be named license.pdf" |
| `400` | `VALIDATION_ERROR` | License file exceeds 10MB | "File size must not exceed 10MB" |
| `400` | `VALIDATION_ERROR` | License file missing for merchant | "Business license is required for merchant registration" |
| `409` | `CONFLICT` | Email already exists | "Email already registered" with link to login |

### 9.3 Error Classification Table — Login

| HTTP Status | Error Code | Scenario | User-Facing Behavior |
|-------------|------------|----------|---------------------|
| `400` | `BAD_REQUEST` | Validation failures | Field-level inline errors |
| `401` | `UNAUTHORIZED` | Invalid credentials | "Invalid email or password" (generic) |

### 9.4 Error Classification Table — Token Operations

| HTTP Status | Error Code | Scenario | User-Facing Behavior |
|-------------|------------|----------|---------------------|
| `401` | `UNAUTHORIZED` | Missing refresh token | Redirect to login |
| `401` | `UNAUTHORIZED` | Refresh token revoked | "Session expired. Please login again" |
| `401` | `UNAUTHORIZED` | Refresh token expired | "Session expired. Please login again" |
| `401` | `UNAUTHORIZED` | Absolute limit reached | "Session expired. Please login again" |
| `401` | `UNAUTHORIZED` | Token reuse detected | "Security violation. All sessions revoked" |
| `401` | `UNAUTHORIZED` | Invalid token signature | Redirect to login |

### 9.5 Error Classification Table — Password Reset

| HTTP Status | Error Code | Scenario | User-Facing Behavior |
|-------------|------------|----------|---------------------|
| API error | Response-dependent | Unknown email, invalid/expired code, or request failure | Destructive alert displays the response message when available, otherwise the thrown error message or page fallback. |
| Client validation | N/A | Invalid form values | Field-level messages shown below the corresponding fields. |

### 9.6 Frontend Error Display Behavior

- **Field-Level Validation**: React Hook Form renders schema messages below invalid fields.
- **Request Errors**: Login and Register display the thrown `Error.message` or a translated fallback in a destructive alert. Forgot Password, Verify Code, and Reset Password prefer the response message, then the thrown error message, then a fallback.
- **Success Feedback**: Login and Register show a success toast; Reset Password shows a success toast and success view. Forgot Password and Verify Code navigate on success; Verify Code also displays an alert after a successful resend.
- **Loading States**: Each request submit button is disabled and displays a loading indicator while its request is in progress.

---

## 10. Permission and Access Control

### 10.1 Authentication Requirements

- JSON Web Token (JWT) Bearer Token passed via `Authorization` header for protected endpoints.
- Refresh token stored in httpOnly cookie for session management.

### 10.2 Public vs Protected Endpoints

| Endpoint | Access Level | Description |
|----------|-------------|-------------|
| `POST /api/v1/auth/register` | Public | No authentication required |
| `POST /api/v1/auth/login` | Public | No authentication required |
| `POST /api/v1/auth/forgot-password` | Public | No authentication required |
| `POST /api/v1/auth/verify-code` | Public | No authentication required; accepts email and six-digit code |
| `POST /api/v1/auth/reset-password` | Public | No authentication required; accepts email, code, and new password |
| `POST /api/v1/auth/refresh` | Cookie-based | Requires valid refresh token in cookie |
| `POST /api/v1/auth/logout` | Protected | Requires valid access token |
| `GET /api/v1/auth/verify` | Protected | Requires valid access token |

### 10.3 Role-Based Access

| Role | Can Register | Can Login | Can Reset Password | Default Dashboard |
|------|:------------:|:---------:|:------------------:|-------------------|
| `buyer` | ✓ | ✓ | ✓ | Home page |
| `merchant` | ✓ | ✓ | ✓ | Merchant dashboard |
| `admin` | ✗ (seeded) | ✓ | ✓ | Admin dashboard |

Merchant accounts are created with `license_status = 'pending'`. Merchant features remain locked (per SECTION 2.6 / 2.7 of the Requirement Spec) until admin sets `license_status = 'approved'`; rejected merchants see a rejection banner and may resubmit.

### 10.4 Security Audit Logging

| Event | Data Logged | Retention |
|-------|-------------|-----------|
| `USER_REGISTERED` | userId, email, ip, timestamp | 90 days |
| `USER_LOGIN_SUCCESS` | userId, email, ip, timestamp | 90 days |
| `USER_LOGIN_FAILED` | email, ip, timestamp, reason | 30 days |
| `USER_LOGOUT` | userId, timestamp | 90 days |
| `TOKEN_REFRESHED` | userId, timestamp | 90 days |
| `SECURITY_VIOLATION` | userId, ip, timestamp, details | 1 year |
| `PASSWORD_RESET_REQUESTED` | userId, email, ip, timestamp | 90 days |
| `PASSWORD_RESET_COMPLETED` | userId, ip, timestamp | 90 days |

---

## 11. Real-Time Notification Behavior

### 11.1 Current Implementation

The Sign-up/Login screens do not require WebSocket connections as they operate in unauthenticated state.

### 11.2 Post-Login WebSocket Connection

Upon successful login, the frontend establishes WebSocket connection:

| Event | Trigger | Action |
|-------|---------|--------|
| `connect` | Login success | Join user-specific room |
| `statusUpdate` | Order/status changes | Display toast notification |
| `disconnect` | Connection lost | Auto-reconnect with backoff |

---

## 12. Screen Transition Specification

### 12.1 Inbound Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| Any page (unauthenticated) | `/login` | Accessing protected route without token |
| Any page (unauthenticated) | `/register` | Clicking "Sign Up" link |
| Any page | `/forgot-password` | Clicking "Forgot password?" link |
| `/forgot-password` | `/verify-code` | Successful code request; email passed in router location state |
| `/verify-code` | `/reset-password` | Successful code verification; email and code passed in router location state |
| Logout action | `/login` | Session terminated |

### 12.2 Internal Navigation

| Source | Target | Trigger |
|--------|--------|---------|
| `/login` | `/register` | Click "Don't have an account? Sign Up" |
| `/login` | `/forgot-password` | Click "Forgot password?" |
| `/register` | `/login` | Click "Already have an account? Log In" |
| `/forgot-password` | `/login` | Click "Back to Login" |
| `/forgot-password` | `/verify-code` | After successful code request |
| `/verify-code` | `/forgot-password` | Required email is missing from router state |
| `/verify-code` | `/reset-password` | Code verification succeeds |
| `/reset-password` | `/forgot-password` | Email or code is missing from router state |
| `/reset-password` | `/login` | Click "Back to Login" |

### 12.3 Outbound Navigation (Post-Authentication)

| Source | Target | Condition |
|--------|--------|-----------|
| `/login` (success) | Redirect query or role dashboard | Auth provider completes login; redirect query takes precedence |
| `/register` (success) | `/login` | Registration successful |

### 12.4 Error Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| Any auth page | `/unauthorized` | 403 Forbidden |
| Any auth page | `/` | Token verification success |

---

## 13. Non-Functional Considerations

### 13.1 Performance Requirements

| Metric | Target |
|--------|--------|
| Page Load (Initial Render) | ≤ 2 seconds |
| Login API Response | ≤ 500 milliseconds |
| Registration API Response | ≤ 1 second |
| License File Upload | ≤ 3 seconds (10MB PDF) |
| Token Refresh Response | ≤ 200 milliseconds |
| Password Hashing (Argon2) | ≤ 1 second |
| Forgot Password Response | ≤ 1 second |
| Reset Password Response | ≤ 500 milliseconds |

### 13.2 Security Considerations

| Concern | Mitigation |
|---------|------------|
| Brute Force Attacks | Login rate limiting is not implemented in the inspected auth service flow. |
| Password Theft | Argon2id hashing (memory-hard, GPU-resistant) |
| Token Theft | httpOnly cookies, Secure flag, SameSite=Strict |
| Session Hijacking | Token rotation, family tracking, reuse detection |
| CSRF | SameSite cookies, CORS restrictions |
| Malicious File Upload | PDF-only validation, file size limit (10MB), filename validation (license.pdf) |
| Password Reset Abuse | Six-digit recovery code with a 10-minute expiry; a 60-second resend cooldown is enforced by the frontend after a successful resend. No backend rate limiter is applied in the inspected auth flow. |
| Password Reset Code Theft | The recovery code is required with the account email to reset the password and is consumed on successful reset. |

### 13.3 Responsive Design Requirements

| Breakpoint | Layout |
|------------|--------|
| Desktop (≥ 1024px) | Centered card, max-width 400px |
| Tablet (768px – 1023px) | Centered card, full-width with padding |
| Mobile (< 768px) | Full-width card, stacked layout |

---

## 14. Configurable Items (External Definitions)

Defined via `.env` configuration:

| Definition Key | Default Value | Description |
|----------------|---------------|-------------|
| `JWT_ACCESS_SECRET` | (required) | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | (required) | Secret for signing refresh tokens (different from access) |
| `JWT_ACCESS_EXPIRY` | `15m` | Access token expiry time |
| `JWT_REFRESH_EXPIRY` | `7d` | Refresh token expiry time |
| `JWT_ABSOLUTE_LIMIT_DAYS` | `90` | Maximum session duration in days |
| `ARGON2_MEMORY_COST` | `65536` | Argon2 memory cost in KB (64MB) |
| `ARGON2_TIME_COST` | `3` | Argon2 iterations |
| `ARGON2_PARALLELISM` | `4` | Argon2 parallel threads |
| `LICENSE_MAX_SIZE` | `10485760` | Maximum license file size in bytes (10MB) |
| `LICENSE_ALLOWED_TYPES` | `['application/pdf']` | Allowed MIME types for license upload |
| `LICENSE_ALLOWED_FILENAME` | `license.pdf` | Required filename for license upload |
| `LICENSE_STORAGE_PATH` | `./uploads/licenses` | Directory to store uploaded license files |

---

## 15. Cross-Reference Traceability Matrix

### 15.1 Requirements Definition Traceability

| Requirement ID | Requirement Description | Covered By (This Document) |
|----------------|-------------------------|----------------------------|
| B-AUTH-001 | User can register with email and password | UC-AUTH-001, Sec 6.1 |
| B-AUTH-002 | User can login with email and password | UC-AUTH-002, Sec 6.2 |
| B-AUTH-003 | System issues JWT access and refresh tokens | UC-AUTH-002, BR-AUTH-010/011 |
| B-AUTH-004 | User can logout (token blacklisted) | UC-AUTH-004, Sec 6.4 |
| B-AUTH-005 | Access token auto-refreshes | UC-AUTH-003, Sec 6.3 |
| B-AUTH-006 | Password hashed with Argon2 | BR-AUTH-016, Sec 6.1 |
| B-AUTH-007 | Refresh token rotation | BR-AUTH-013, Sec 6.3 |
| B-AUTH-008 | Token family tracking | BR-AUTH-014, BR-AUTH-015 |
| B-AUTH-009 | User can request password reset via email | UC-AUTH-006, Sec 6.6 |
| B-AUTH-010 | Six-digit recovery code expires after 10 minutes | UC-AUTH-006A/007, Sec 6.6–6.8 |
| B-AUTH-011 | Recovery code is consumed after successful password reset | UC-AUTH-007, Sec 6.8 |
| B-AUTH-012 | Resend is disabled for 60 seconds after a successful code resend; no backend request rate limit is implemented in the inspected flow | Sec 6.7 |
| B-AUTH-020 | Merchant must upload business license PDF | UC-AUTH-001A, BR-AUTH-020~023, Sec 6.1 |

### 15.2 Database Design Traceability

| Database Table | Relevant Functional Operations |
|----------------|-------------------------------|
| `users` | Registration (INSERT), Login (SELECT), Verify (SELECT), Reset Password (UPDATE) |
| `merchants` | Registration (INSERT, merchant only — business license + `license_status='pending'`) |
| `refresh_tokens` | Token storage (INSERT), Rotation (UPDATE), Revocation (UPDATE) |
| `user_roles` | Role validation during registration |
| Recovery-code storage | Forgot Password (create code), Verify Code (check code), Reset Password (consume code) |

### 15.3 Related Document References

| Document ID | Document Name | File Path |
|-------------|---------------|-----------|
| SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` |
| SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` |
| SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` |

---

*End of Functional Specification (Sign-up / Login / Password Reset)*
