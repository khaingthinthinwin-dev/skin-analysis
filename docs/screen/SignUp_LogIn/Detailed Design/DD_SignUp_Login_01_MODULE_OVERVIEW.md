# DD_AUTH_01 — Module Overview

> **Doc ID:** SKM-DD-AUTH-01 | **Version:** 2.1 | **Status:** Released  
> **Last Updated:** 2026-08-21

---

## 1. Module Overview

The **Authentication Module** (認証モジュール) is the gateway for all user authentication within the Cosmetics Finder platform. It handles user registration (Buyer and Merchant), credential validation, JWT token lifecycle management, secure session termination, and password recovery. This module ensures that only properly validated, authenticated users can access protected platform features while maintaining security through dual-token architecture, Argon2 password hashing, Redis-based token blacklisting, and secure password reset via email links.

---

## 2. Supported Use Cases

| ID | Use Case | Description |
|---|----------|-------------|
| UC-AUTH-01 | Register New Account | Create a new user account with email, password, name, and role selection (Buyer/Merchant). If role is merchant, a shop name is also collected. IDs use UUID primary keys. |
| UC-AUTH-01A | Upload Merchant License | When registering as Merchant, input shop name and upload business license PDF (license.pdf, max 10MB). Creates a `merchants` record with `license_status='pending'`; merchant features stay locked until license is APPROVED. |
| UC-AUTH-02 | Login with Credentials | Authenticate with email and password, receive JWT access token (15min) and refresh token (7 days). |
| UC-AUTH-03 | Refresh Access Token | Automatically refresh expired access token using refresh token cookie with rotation. |
| UC-AUTH-04 | Logout | Terminate session by blacklisting access token in Redis and revoking refresh token. |
| UC-AUTH-05 | Verify Token Validity | Validate access token and return user profile data for protected route access. |
| UC-AUTH-06 | Detect Token Reuse | Detect and handle revoked refresh token reuse by revoking all user tokens. |
| UC-AUTH-07 | Request Password Reset | Send password reset email with secure token (24-hour expiry, single-use). Rate limited to 3 requests per email per hour. |
| UC-AUTH-08 | Reset Password with Token | Reset password using token from email link. Validates token, updates password with Argon2 hash, invalidates all unused tokens for user. |

---

## 3. Session State Machine (Authentication Scope)

The Authentication module manages the complete token lifecycle from unauthenticated state through session establishment and termination.

```mermaid
stateDiagram-v2
    [*] --> UNAUTHENTICATED : Initial State
    
    UNAUTHENTICATED --> AUTHENTICATING : Submit Credentials
    AUTHENTICATING --> AUTHENTICATED : Login Success
    AUTHENTICATING --> UNAUTHENTICATED : Login Failed
    
    AUTHENTICATED --> TOKEN_REFRESHING : Access Token Expired
    TOKEN_REFRESHING --> AUTHENTICATED : Refresh Success
    TOKEN_REFRESHING --> UNAUTHENTICATED : Refresh Failed
    
    AUTHENTICATED --> LOGGING_OUT : User Logout
    LOGGING_OUT --> UNAUTHENTICATED : Logout Complete
    
    AUTHENTICATED --> UNAUTHENTICATED : Token Reuse Detected
    
    UNAUTHENTICATED --> PASSWORD_RESET_PENDING : Request Password Reset
    PASSWORD_RESET_PENDING --> PASSWORD_RESET_COMPLETE : Reset Password Success
    PASSWORD_RESET_PENDING --> UNAUTHENTICATED : Reset Password Failure
    
    UNAUTHENTICATED --> [*] : Session Terminated
```

**Session States:**

| State | Description | Can Access API | Can Refresh |
|-------|-------------|:--------------:|:-----------:|
| `UNAUTHENTICATED` | No tokens issued or session terminated | ✗ | ✗ |
| `AUTHENTICATING` | Credentials submitted, awaiting validation | ✗ | ✗ |
| `AUTHENTICATED` | Valid access token active (≤15 min) | ✓ | ✓ |
| `TOKEN_REFRESHING` | Access token expired, refresh in progress | ✗ | ✓ |
| `LOGGING_OUT` | Logout initiated, tokens being revoked | ✗ | ✗ |
| `PASSWORD_RESET_PENDING` | Reset email sent, awaiting token usage | ✗ | ✗ |
| `PASSWORD_RESET_COMPLETE` | Password successfully reset | ✗ | ✗ |

---

## 4. Security & Permissions

1. **Password Hashing**: Argon2id algorithm with 64MB memory cost, 3 iterations, 4 threads.
2. **JWT Dual-Token Architecture**: 
   - Access Token: 15-minute expiry, stored in memory only (never localStorage).
   - Refresh Token: 7-day expiry, stored in httpOnly secure cookie.
3. **Token Rotation**: New refresh token issued on every refresh request. Old token revoked.
4. **Token Family Tracking**: Each login session has unique family ID for breach detection.
5. **Reuse Detection**: If revoked refresh token is used, ALL tokens for user are revoked.
6. **Redis Blacklisting**: On logout, access token `jti` added to Redis blacklist with TTL.
7. **Rate Limiting**: Login attempts limited to 5 per IP per 300 seconds. Password reset limited to 3 per email per hour.
8. **Cookie Security**: httpOnly, Secure, SameSite=Strict, Path restricted to refresh endpoint.
9. **Data Isolation**: Users can only access their own profile data.
10. **Generic Error Messages**: Login failures return "Invalid email or password" to prevent user enumeration.
11. **Password Reset Security**: Tokens expire after 24 hours, single-use, all previous unused tokens invalidated on new request.
12. **Email Non-Disclosure**: Password reset always returns same message regardless of email existence.

---

## 5. Architectural Components Involved

| Layer | Files |
|-------|-------|
| **Frontend Pages** | `Login.tsx`, `Register.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx` |
| **Frontend Components** | `LoginForm.tsx`, `RegisterForm.tsx`, `ForgotPasswordForm.tsx`, `ResetPasswordForm.tsx`, `PasswordStrengthIndicator.tsx`, `LicenseUpload.tsx` |
| **Frontend Hooks** | `useAuth.ts` |
| **Frontend Services** | `auth.service.ts` |
| **Frontend Schemas** | `auth.schema.ts` |
| **Frontend Providers** | `AuthProvider.tsx` |
| **Backend API** | `auth.controller.ts` |
| **Backend Service** | `auth.service.ts` |
| **Backend DTOs** | `login.dto.ts`, `register.dto.ts`, `forgot-password.dto.ts`, `reset-password.dto.ts` |
| **Backend Strategies** | `jwt-access.strategy.ts`, `jwt-refresh.strategy.ts` |
| **Backend Guards** | `jwt-auth.guard.ts`, `local-auth.guard.ts` |
| **Backend Config** | `jwt.config.ts`, `argon2.config.ts` |
| **Shared Services** | `prisma.service.ts` (users, merchants, refresh_tokens, password_reset_tokens), `redis.service.ts` (blacklist, rate limiting), `email.service.ts` (reset link) |

---

## 6. API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:-------------:|
| `POST` | `/api/v1/auth/register` | Register new user account | No |
| `POST` | `/api/v1/auth/login` | Authenticate user, issue tokens | No |
| `POST` | `/api/v1/auth/refresh` | Refresh access token via cookie | Cookie |
| `POST` | `/api/v1/auth/logout` | Terminate session, blacklist token | Yes |
| `GET` | `/api/v1/auth/verify` | Validate token, return user profile | Yes |
| `POST` | `/api/v1/auth/forgot-password` | Request password reset email | No |
| `POST` | `/api/v1/auth/reset-password` | Reset password with token | No |

---

## 7. Database Tables Involved

| Table | Purpose | Operations |
|-------|---------|------------|
| `users` | Store user credentials, profile, role, `merchant_id` | SELECT (login), INSERT (register), SELECT (verify), UPDATE (reset password) |
| `merchants` | Store merchant business info and license status | INSERT (register, merchant only) |
| `refresh_tokens` | Store hashed refresh tokens with family tracking | INSERT (login), SELECT (refresh), UPDATE (revoke) |
| `password_reset_tokens` | Store hashed password reset tokens with expiry | INSERT (forgot password), SELECT (reset password), UPDATE (mark used) |

---

## 8. External Dependencies

| Dependency | Purpose | Configuration |
|------------|---------|---------------|
| Redis | Token blacklisting, rate limiting | `REDIS_URL` |
| Argon2 Library | Password hashing | `ARGON2_MEMORY_COST`, `ARGON2_TIME_COST`, `ARGON2_PARALLELISM` |
| JWT Library | Token generation/verification | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` |
| File Storage | Merchant license upload | `LICENSE_STORAGE_PATH` |
| Email Service | Password reset link delivery | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` |

---

## 9. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_AUTH_02](./DD_SignUp_Login_02_FRONTEND_Page.md) | Frontend page design |
| [DD_AUTH_03](./DD_SignUp_Login_03_API_ENDPOINTS.md) | Backend REST API contract |
| [DD_AUTH_04](./DD_SignUp_Login_04_DTOS_AND_TYPES.md) | DTO and type definitions |
| [DD_AUTH_05](./DD_SignUp_Login_05_BUSINESS_LOGIC.md) | Backend business rules and token lifecycle |
| [DD_AUTH_06](./DD_SignUp_Login_06__TEST_SPEC.md) | Test specification |
| [機能設計書_SignUp_Login](../機能設計書_SignUp_Login.md) | Full functional specification |
| [画面項目設計書_SignUp_Login](../画面項目設計書_SignUp_Login.md) | Screen items specification |
