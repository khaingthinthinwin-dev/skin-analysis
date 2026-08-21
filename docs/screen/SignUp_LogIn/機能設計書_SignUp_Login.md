# Functional Specification (機能設計書) — Sign-up / Login / Password Reset

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-FDS-AUTH-001 |
| **Target Screen** | Sign-up / Login / Password Reset (新規登録 / ログイン / パスワード再設定) |
| **Subsystem** | Authentication — User Registration, Session Management & Password Recovery |
| **Function ID** | FN-AUTH-001 |
| **Version** | 4.0 |
| **Created** | 2026-08-04 |
| **Last Updated** | 2026-08-20 |
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
7. **Rate Limiting** — Protecting authentication endpoints from brute-force attacks.
8. **Account Verification** — Verifying token validity for protected route access.
9. **Password Recovery** — Enabling users to reset forgotten passwords via secure email links with 24-hour expiry and single-use tokens.

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
| `name` | User Input | Full name for registration |
| `role` | User Input | Role selection (buyer/merchant) for registration |
| `license` | File Upload | Business license PDF (merchant only, max 10MB) |
| `refreshToken` | HTTP Cookie | Refresh token for session operations |
| `resetToken` | URL Parameter | Password reset token from email link |

| Output Information | Data Category | Destination / Description |
|--------------------|---------------|---------------------------|
| `accessToken` | JWT Token | Returned in response body for API authorization |
| `refreshToken` | HTTP Cookie | Set as httpOnly cookie for session management |
| `user` | User DTO | User profile data (excluding password hash) |
| `licenseUrl` | URL | Path to uploaded license file (merchant only) |
| `blacklist` | Redis Key | Token revocation record for logout |
| `resetEmailSent` | Boolean | Confirmation that reset email was sent |

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
| UC-AUTH-002 | Login with Credentials | User has existing account. | JWT access token issued. Refresh token set as httpOnly cookie. User redirected to home page. | Visitor |
| UC-AUTH-003 | Refresh Access Token | Valid refresh token exists in httpOnly cookie. | New access token issued. Old refresh token revoked and new one issued (rotation). | Authenticated User |
| UC-AUTH-004 | Logout | User is authenticated. | Access token blacklisted in Redis. Refresh token revoked. User redirected to login page. | Authenticated User |
| UC-AUTH-005 | Verify Token Validity | User has access token. | Token validated. User profile returned. | Authenticated User |
| UC-AUTH-006 | Request Password Reset | User has account but forgot password. | Password reset token created in `password_reset_tokens` table. Reset email sent to user. | Any User |
| UC-AUTH-007 | Reset Password with Token | User clicked reset link from email. | Password updated in `users` table. Reset token marked as used. User redirected to login page. | Any User |

### 2.2 Primary Business Workflow

```
                        ┌──────────────────┐
                        │  Visitor Arrives │
                        │  (Not Authenticated) │
                        └────────┬─────────┘
                                 │
                                 ▼
                   ┌─────────────────────────────┐
                   │  Auth Page Display          │
                   │  (Login / Register Toggle)  │
                   └──────────┬──────────────────┘
                              │
              ┌───────────────┼───────────────────┐
              ▼               ▼                   ▼
    ┌─────────────┐  ┌──────────────┐   ┌──────────────────┐
    │ Login Tab   │  │ Register Tab │   │ Language/Theme   │
    │ (UC-AUTH-02)│  │ (UC-AUTH-01) │   │ Toggle           │
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
│ Issue Tokens │        │ Display Error       │
│ Redirect to  │        │ Message             │
│ Home         │        └─────────────────────┘
└──────────────┘
```

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
| B-AUTH-010 | Reset link expires after 24 hours |
| B-AUTH-011 | Reset token is single-use |
| B-AUTH-012 | Rate limiting: max 3 reset requests per email per hour |

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
| TR-AUTH-01 | `NO_SESSION` | `ACCESS_VALID` | Login success | Valid credentials, rate limit not exceeded |
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
| BR-AUTH-002 | Password Strength | Minimum 8 characters, must include uppercase, lowercase, number, and special character. | Backend (DTO validation) + Frontend (Zod schema) |
| BR-AUTH-003 | Role Restriction | Only 'buyer' or 'merchant' roles allowed during registration. | Backend (DTO validation) |
| BR-AUTH-004 | Default Role | If role not specified, defaults to 'buyer'. | Backend (service logic) |
| BR-AUTH-005 | Email Verification | New users have `emailVerified = false`. | Backend (user creation) |
| BR-AUTH-020 | Merchant License Required | When role = 'merchant', license file upload is mandatory. | Backend (DTO validation) + Frontend (conditional validation) |
| BR-AUTH-021 | License File Type | License file must be PDF format only. | Backend (file validation) + Frontend (accept attribute) |
| BR-AUTH-022 | License File Name | License file must be named 'license.pdf' (case-insensitive). | Backend (file validation) + Frontend (file name check) |
| BR-AUTH-023 | License File Size | License file must not exceed 10MB. | Backend (file validation) + Frontend (size check) |
| BR-AUTH-024 | Merchant License Status | Merchant registration creates `merchants` record with `license_status='pending'`; merchant features stay locked until admin sets `license_status='approved'`. | Backend (merchant creation, approval workflow) |
| BR-AUTH-025 | Admin Registration Disabled | Admin accounts cannot be created via registration. Admin accounts are system-seeded only. | Backend (role validation) + Frontend (role options) |

### 4.2 Login Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AUTH-006 | Credential Validation | Email must exist and password must match Argon2 hash. | Backend (auth service) |
| BR-AUTH-007 | Account Active Check | User must have `isActive = true` to login. | Backend (auth service) |
| BR-AUTH-008 | Rate Limiting | Max 5 login attempts per IP per 300 seconds. | Backend (Redis rate limiter) |
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
| BR-AUTH-017 | Token Storage | Access token in memory only (never localStorage). Refresh token in httpOnly cookie. | Frontend (auth service) |
| BR-AUTH-018 | Cookie Security | httpOnly, Secure, SameSite=Strict, Path=/api/v1/auth/refresh. | Backend (cookie settings) |
| BR-AUTH-019 | CORS Protection | Only allowed origins can access auth endpoints. | Backend (CORS config) |

### 4.5 Password Reset Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-AUTH-030 | Reset Token Expiry | Password reset tokens expire after 24 hours. | Backend (password_reset_tokens table) |
| BR-AUTH-031 | Single-Use Token | Reset token can only be used once. After successful reset, `used = TRUE`. | Backend (auth service) |
| BR-AUTH-032 | Reset Rate Limiting | Max 3 password reset requests per email per hour. | Backend (Redis rate limiter) |
| BR-AUTH-033 | Invalidate Old Tokens | When a new reset is requested, all previous unused tokens for that user are invalidated. | Backend (auth service) |
| BR-AUTH-034 | Email Not Revealed | Response always shows same message regardless of whether email exists. | Backend (error handling) |
| BR-AUTH-035 | Password Hash Updated | New password must be hashed with Argon2 before storing. | Backend (auth service) |

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
- Log In button disabled until form is valid
- Loading spinner on button during submission

### 5.2 Screen: Register Page (`/register`)

**Purpose:** Allow new users to create accounts with role selection.

#### 5.2.1 UI Elements

**Register Form:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-12 | Logo | Image | — | No | Application logo |
| EL-13 | System Name | Text | `app.name` | No | "Cosmetics Finder" |
| EL-14 | Full Name Label | Label | `auth.fullName` | Yes | "Full Name" |
| EL-15 | Full Name Input | Input (text) | `auth.fullNamePlaceholder` | Yes | User's full name |
| EL-16 | Email Label | Label | `auth.email` | Yes | "Email" |
| EL-17 | Email Input | Input (email) | `auth.emailPlaceholder` | Yes | Email address input |
| EL-18 | Password Label | Label | `auth.password` | Yes | "Password" |
| EL-19 | Password Input | Input (password) | `auth.passwordPlaceholder` | Yes | Password with strength indicator |
| EL-20 | Password Requirements | Helper Text | — | No | Shows password rules |
| EL-21 | Confirm Password Label | Label | `auth.confirmPassword` | Yes | "Confirm Password" |
| EL-22 | Confirm Password Input | Input (password) | `auth.confirmPasswordPlaceholder` | Yes | Must match password |
| EL-23 | Role Selection | Radio Group | `auth.iAm` | Yes | "I am a:" |
| EL-24 | Buyer Radio | Radio Button | `auth.buyer` | Yes | "Buyer" - Browse and purchase |
| EL-25 | Merchant Radio | Radio Button | `auth.merchant` | Yes | "Merchant" - Sell products |
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
- Full Name input auto-focused
- Buyer radio selected by default
- Create Account button disabled until form is valid
- Password requirements shown below password field
- License upload field hidden (shown only when Merchant selected)

### 5.3 Screen: Forgot Password Page (`/forgot-password`)

**Purpose:** Allow users to request a password reset link via email.

#### 5.3.1 UI Elements

**Forgot Password Form:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-40 | Logo | Image | — | No | Application logo |
| EL-41 | System Name | Text | `app.name` | No | "Cosmetics Finder" |
| EL-42 | Title | Text | `auth.forgotPasswordTitle` | No | "Forgot your password?" |
| EL-43 | Description | Text | `auth.forgotPasswordDesc` | No | "Enter your email and we'll send you a reset link." |
| EL-44 | Email Label | Label | `auth.email` | Yes | "Email" |
| EL-45 | Email Input | Input (email) | `auth.emailPlaceholder` | Yes | Email address input |
| EL-46 | Send Reset Link Button | Button (primary) | `auth.sendResetLink` | Yes | Submit email to receive reset link |
| EL-47 | Back to Login Link | Link | `auth.backToLogin` | No | "Back to Login" |
| EL-48 | Language Toggle | Toggle | — | No | Switch between EN/JA/MY |
| EL-49 | Theme Toggle | Toggle | — | No | Switch between Light/Dark |

**Default State:**
- Email input auto-focused
- Send Reset Link button disabled until form is valid
- Loading spinner on button during submission

**Success State:**
- After submission, show success message: "If an account exists with that email, you'll receive a password reset link shortly."
- Form is replaced with success message and "Back to Login" link

### 5.4 Screen: Reset Password Page (`/reset-password`)

**Purpose:** Allow users to set a new password after clicking the reset link from email.

#### 5.4.1 UI Elements

**Reset Password Form:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-50 | Logo | Image | — | No | Application logo |
| EL-51 | System Name | Text | `app.name` | No | "Cosmetics Finder" |
| EL-52 | Title | Text | `auth.resetPasswordTitle` | No | "Reset your password" |
| EL-53 | Description | Text | `auth.resetPasswordDesc` | No | "Enter your new password below." |
| EL-54 | New Password Label | Label | `auth.newPassword` | Yes | "New Password" |
| EL-55 | New Password Input | Input (password) | `auth.newPasswordPlaceholder` | Yes | Password with strength indicator |
| EL-56 | Password Requirements | Helper Text | — | No | Shows password rules |
| EL-57 | Confirm Password Label | Label | `auth.confirmPassword` | Yes | "Confirm Password" |
| EL-58 | Confirm Password Input | Input (password) | `auth.confirmPasswordPlaceholder` | Yes | Must match new password |
| EL-59 | Reset Password Button | Button (primary) | `auth.resetPassword` | Yes | Submit new password |
| EL-60 | Back to Login Link | Link | `auth.backToLogin` | No | "Back to Login" |
| EL-61 | Language Toggle | Toggle | — | No | Switch between EN/JA/MY |
| EL-62 | Theme Toggle | Toggle | — | No | Switch between Light/Dark |

**Default State:**
- New Password input auto-focused
- Reset Password button disabled until form is valid
- Loading spinner on button during submission
- If token is invalid or expired, show error message and redirect to login

**Success State:**
- After successful reset, show success message: "Your password has been reset successfully."
- Show "Back to Login" link

---

## 6. Functional Operation Specification

### 6.1 Operation: User Registration

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Create Account" button click on Register form |
| **API Endpoint** | `POST /api/v1/auth/register` |
| **Request Content-Type** | `multipart/form-data` (when license file attached) or `application/json` |
| **Pre-Submission Validation** | Full field validation (Zod schema). If role = merchant, license file validation. |
| **Processing Steps** | 1. Validate email format and uniqueness. 2. Validate password strength. 3. Validate role is 'buyer' or 'merchant' (admin not allowed). 4. If role = merchant, validate license file (PDF, named license.pdf, ≤10MB). 5. Hash password with Argon2. 6. Upload license file to storage. 7. Create `users` record. 8. If role = merchant, create `merchants` record with `license_status='pending'` and link `users.merchant_id`. 9. Return user DTO (exclude password). 10. Log USER_REGISTERED event. |
| **Success Response** | 201 Created with user data (including licenseUrl for merchants) |
| **Post-Action** | Redirect to login page |

### 6.2 Operation: User Login

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Log In" button click on Login form |
| **API Endpoint** | `POST /api/v1/auth/login` |
| **Request Content-Type** | `application/json` |
| **Pre-Submission Validation** | Email format, password not empty |
| **Processing Steps** | 1. Find user by email. 2. Check isActive. 3. Verify password with Argon2. 4. Check rate limit. 5. Generate access token (15 min). 6. Generate refresh token (7 days). 7. Hash and store refresh token. 8. Set httpOnly cookie. 9. Return access token + user DTO. 10. Log USER_LOGIN_SUCCESS event. |
| **Success Response** | 200 OK with accessToken and user |
| **Post-Action** | Redirect to home page |

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
| **Trigger** | "Send Reset Link" button click on Forgot Password form |
| **API Endpoint** | `POST /api/v1/auth/forgot-password` |
| **Request Content-Type** | `application/json` |
| **Pre-Submission Validation** | Email format validation |
| **Processing Steps** | 1. Validate email format. 2. Check rate limit (max 3 per email per hour). 3. Find user by email. 4. If user exists: a. Invalidate all previous unused tokens for this user. b. Generate secure random token. c. Hash token and store in `password_reset_tokens` table with 24-hour expiry. d. Send reset email with link containing token. 5. Always return same response regardless of whether email exists. 6. Log PASSWORD_RESET_REQUESTED event. |
| **Success Response** | 200 OK with message "If an account exists with that email, you'll receive a password reset link shortly." |
| **Error Response** | 429 Too Many Requests (rate limit exceeded) |

### 6.7 Operation: Reset Password

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Reset Password" button click on Reset Password form (after clicking email link) |
| **API Endpoint** | `POST /api/v1/auth/reset-password` |
| **Request Content-Type** | `application/json` |
| **Request Body** | `{ token: string, password: string }` |
| **Pre-Submission Validation** | Token not empty, password meets strength requirements |
| **Processing Steps** | 1. Validate token format. 2. Hash the received token. 3. Find token record by `token_hash`. 4. Validate: token exists, not used, not expired (24 hours). 5. Find user by `user_id` from token. 6. Validate password strength (min 8 chars, uppercase, lowercase, digit, special char). 7. Hash new password with Argon2. 8. Update user's password in `users` table. 9. Mark token as `used = TRUE`. 10. Invalidate all other unused tokens for this user. 11. Return 200 OK. 12. Log PASSWORD_RESET_COMPLETED event. |
| **Success Response** | 200 OK with message "Your password has been reset successfully." |
| **Error Response** | 400 Bad Request (invalid/expired token, weak password) |

---

## 7. Input / Output Specification

### 7.1 Input Specification — Registration (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `email` | Email | メールアドレス | VARCHAR(255) | Yes | Input (email) | `@IsEmail()`, `@IsNotEmpty()`, `@MaxLength(255)` |
| `password` | Password | パスワード | VARCHAR(128) | Yes | Input (password) | `@MinLength(8)`, `@MaxLength(128)`, regex |
| `name` | Full Name | 氏名 | VARCHAR(200) | Yes | Input (text) | `@IsString()`, `@IsNotEmpty()`, `@MaxLength(200)` |
| `role` | Role | ロール | ENUM | No | Radio Group | `@IsIn(['buyer', 'merchant'])`, default 'buyer' |
| `license` | Business License | 事業許可書 | File (PDF) | Conditional | File Input | MIME: application/pdf, MaxSize: 10MB, FileName: license.pdf |

### 7.2 Input Specification — Login (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `email` | Email | メールアドレス | VARCHAR(255) | Yes | Input (email) | `@IsEmail()`, `@IsNotEmpty()` |
| `password` | Password | パスワード | VARCHAR(128) | Yes | Input (password) | `@IsNotEmpty()`, `@MinLength(8)` |

### 7.3 Input Specification — Forgot Password (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `email` | Email | メールアドレス | VARCHAR(255) | Yes | Input (email) | `@IsEmail()`, `@IsNotEmpty()` |

### 7.4 Input Specification — Reset Password (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `token` | Reset Token | リセットトークン | VARCHAR(255) | Yes | URL Parameter | `@IsNotEmpty()` |
| `password` | New Password | 新しいパスワード | VARCHAR(128) | Yes | Input (password) | `@MinLength(8)`, `@MaxLength(128)`, regex |
| `confirmPassword` | Confirm Password | パスワード確認 | VARCHAR(128) | Yes | Input (password) | Must match password |

### 7.5 Output Specification — Login Success (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `accessToken` | JWT Generation | Bearer token string |
| `user.id` | `users.id` | UUID string |
| `user.email` | `users.email` | String |
| `user.name` | `users.name` | String |
| `user.role` | `users.role` | Role enum string |
| `user.merchantId` | `users.merchant_id` | UUID string or null |
| `user.licenseStatus` | `merchants.license_status` | pending/approved/rejected or null |
| `user.avatarUrl` | `users.avatar_url` | URL or null |

### 7.6 Output Specification — Registration Success (出力定義)

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

### 7.7 Output Specification — Forgot Password Success (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `message` | System | "If an account exists with that email, you'll receive a password reset link shortly." |

### 7.8 Output Specification — Reset Password Success (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `message` | System | "Your password has been reset successfully." |

---

## 8. Input Validation Rules

### 8.1 Registration Validation (Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `email` | Required, valid email format, max 255 chars | "Email is required" / "Invalid email address" | "メールアドレスは必須です" / "メールアドレスが無効です" |
| `password` | Required, 8-128 chars, uppercase, lowercase, digit, special char | "Password must be at least 8 characters" / "Password must contain uppercase, lowercase, number, and special character" | "パスワードは8文字以上である必要があります" / "パスワードには大文字、小文字、数字、特殊文字を含めてください" |
| `license` | Required when role = merchant. PDF only, named license.pdf, max 10MB | "Business license is required for merchant registration" / "File must be PDF format" / "File must be named license.pdf" / "File size must not exceed 10MB" | " Merchant登録には事業許可書が必要です" / "ファイルはPDF形式である必要があります" / "ファイル名はlicense.pdfである必要があります" / "ファイルサイズは10MB以下である必要があります" |
| `name` | Required, 1-200 chars | "Name is required" | "名前は必須です" |
| `role` | Optional, must be 'buyer' or 'merchant' | "Invalid role" | "無効なロールです" |

### 8.2 Login Validation (Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `email` | Required, valid email format | "Email is required" / "Invalid email address" | "メールアドレスは必須です" / "メールアドレスが無効です" |
| `password` | Required, min 8 chars | "Password is required" / "Password must be at least 8 characters" | "パスワードは必須です" / "パスワードは8文字以上である必要があります" |

### 8.3 Forgot Password Validation (Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `email` | Required, valid email format | "Email is required" / "Invalid email address" | "メールアドレスは必須です" / "メールアドレスが無効です" |

### 8.4 Reset Password Validation (Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `token` | Required | "Reset token is required" | "リセットトークンは必須です" |
| `password` | Required, 8-128 chars, uppercase, lowercase, digit, special char | "Password must be at least 8 characters" / "Password must contain uppercase, lowercase, number, and special character" | "パスワードは8文字以上である必要があります" / "パスワードには大文字、小文字、数字、特殊文字を含めてください" |
| `confirmPassword` | Required, must match password | "Passwords do not match" | "パスワードが一致しません" |

### 8.5 Password Strength Requirements

```
Minimum Requirements:
✓ At least 8 characters
✓ At least 1 uppercase letter (A-Z)
✓ At least 1 lowercase letter (a-z)
✓ At least 1 number (0-9)
✓ At least 1 special character (@$!%*?&)
```

### 8.6 Validation Enforcement Layers

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
| `429` | `TOO_MANY_REQUESTS` | Rate limit exceeded | "Too many attempts. Please wait {seconds} seconds" |
| `500` | `INTERNAL_SERVER_ERROR` | Server error | "Something went wrong. Please try again" |

### 9.3 Error Classification Table — Login

| HTTP Status | Error Code | Scenario | User-Facing Behavior |
|-------------|------------|----------|---------------------|
| `400` | `BAD_REQUEST` | Validation failures | Field-level inline errors |
| `401` | `UNAUTHORIZED` | Invalid credentials | "Invalid email or password" (generic) |
| `403` | `FORBIDDEN` | Account deactivated | "Account is deactivated. Contact support" |
| `429` | `TOO_MANY_REQUESTS` | Rate limit exceeded | "Too many attempts. Please wait {seconds} seconds" |
| `500` | `INTERNAL_SERVER_ERROR` | Server error | "Something went wrong. Please try again" |

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
| `400` | `BAD_REQUEST` | Validation failures (invalid email format) | Field-level inline errors |
| `400` | `BAD_REQUEST` | Invalid or expired reset token | "Invalid or expired reset link. Please request a new one." |
| `400` | `BAD_REQUEST` | Password does not meet strength requirements | "Password must contain uppercase, lowercase, number, and special character" |
| `400` | `BAD_REQUEST` | Passwords do not match | "Passwords do not match" |
| `429` | `TOO_MANY_REQUESTS` | Rate limit exceeded (forgot password) | "Too many attempts. Please wait {seconds} seconds" |
| `500` | `INTERNAL_SERVER_ERROR` | Server error | "Something went wrong. Please try again" |

### 9.6 Frontend Error Display Behavior

- **Field-Level Validation**: Red border and inline text below invalid input.
- **Form-Level Summary**: Alert banner at top of form listing all errors.
- **Toast Notifications**: Used for API errors and successful actions.
- **Loading States**: Spinner on submit buttons during API calls.

---

## 10. Permission and Access Control

### 10.1 Authentication Requirements

- JSON Web Token (JWT) Bearer Token passed via `Authorization` header for protected endpoints.
- Refresh token stored in httpOnly cookie for session management.

### 10.2 Public vs Protected Endpoints

| Endpoint | Access Level | Description |
|----------|-------------|-------------|
| `POST /auth/register` | Public | No authentication required |
| `POST /auth/login` | Public | No authentication required |
| `POST /auth/forgot-password` | Public | No authentication required |
| `POST /auth/reset-password` | Public | No authentication required (token in body) |
| `POST /auth/refresh` | Cookie-based | Requires valid refresh token in cookie |
| `POST /auth/logout` | Protected | Requires valid access token |
| `GET /auth/verify` | Protected | Requires valid access token |

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
| Email reset link | `/reset-password?token=xxx` | Clicking reset link from email |
| Logout action | `/login` | Session terminated |

### 12.2 Internal Navigation

| Source | Target | Trigger |
|--------|--------|---------|
| `/login` | `/register` | Click "Don't have an account? Sign Up" |
| `/login` | `/forgot-password` | Click "Forgot password?" |
| `/register` | `/login` | Click "Already have an account? Log In" |
| `/forgot-password` | `/login` | Click "Back to Login" |
| `/forgot-password` | `/login` | After successful submission |
| `/reset-password` | `/login` | Click "Back to Login" |
| `/reset-password` | `/login` | After successful password reset |

### 12.3 Outbound Navigation (Post-Authentication)

| Source | Target | Condition |
|--------|--------|-----------|
| `/login` (success) | `/` | Login successful, role = buyer |
| `/login` (success) | `/merchant/dashboard` | Login successful, role = merchant |
| `/login` (success) | `/admin/dashboard` | Login successful, role = admin |
| `/register` (success) | `/login` | Registration successful |

### 12.4 Error Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| Any auth page | `/unauthorized` | 403 Forbidden |
| Any auth page | `/` | Token verification success |
| `/reset-password` | `/login` | Invalid or expired token |

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
| Brute Force Attacks | Rate limiting (5 attempts / 300 seconds per IP) |
| Password Theft | Argon2id hashing (memory-hard, GPU-resistant) |
| Token Theft | httpOnly cookies, Secure flag, SameSite=Strict |
| Session Hijacking | Token rotation, family tracking, reuse detection |
| CSRF | SameSite cookies, CORS restrictions |
| Malicious File Upload | PDF-only validation, file size limit (10MB), filename validation (license.pdf) |
| Password Reset Abuse | Rate limiting (3 requests / hour per email), single-use tokens, 24-hour expiry |
| Password Reset Token Theft | Tokens stored as hashes, one-time use, old tokens invalidated on new request |

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
| `RATE_LIMIT_LOGIN` | `5` | Max login attempts per window |
| `RATE_LIMIT_WINDOW` | `300` | Rate limit window in seconds |
| `RATE_LIMIT_PASSWORD_RESET` | `3` | Max password reset requests per email per hour |
| `PASSWORD_RESET_EXPIRY` | `86400` | Password reset token expiry in seconds (24 hours) |
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
| B-AUTH-010 | Reset link expires after 24 hours | BR-AUTH-030, Sec 6.6 |
| B-AUTH-011 | Reset token is single-use | BR-AUTH-031, Sec 6.7 |
| B-AUTH-012 | Rate limiting: max 3 reset requests per email per hour | BR-AUTH-032, Sec 6.6 |
| B-AUTH-020 | Merchant must upload business license PDF | UC-AUTH-001A, BR-AUTH-020~023, Sec 6.1 |

### 15.2 Database Design Traceability

| Database Table | Relevant Functional Operations |
|----------------|-------------------------------|
| `users` | Registration (INSERT), Login (SELECT), Verify (SELECT), Reset Password (UPDATE) |
| `merchants` | Registration (INSERT, merchant only — business license + `license_status='pending'`) |
| `refresh_tokens` | Token storage (INSERT), Rotation (UPDATE), Revocation (UPDATE) |
| `user_roles` | Role validation during registration |
| `password_reset_tokens` | Forgot Password (INSERT), Reset Password (SELECT + UPDATE `used`) |

### 15.3 Related Document References

| Document ID | Document Name | File Path |
|-------------|---------------|-----------|
| SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` |
| SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` |
| SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` |

---

*End of Functional Specification (Sign-up / Login / Password Reset)*
