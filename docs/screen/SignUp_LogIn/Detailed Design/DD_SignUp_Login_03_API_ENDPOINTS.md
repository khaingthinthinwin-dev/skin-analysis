# DD_AUTH_03 — API Endpoints

> **Doc ID:** SKM-DD-AUTH-03 | **Version:** 2.0 | **Status:** Released  
> **Last Updated:** 2026-08-21

---

## 1. Controller Setup

- **File:** `src/modules/auth/auth.controller.ts`
- **Base Route:** `/api/v1/auth`
- **Guards:** Varies per endpoint (Public, JwtAuthGuard, CookieGuard)

---

## 2. API Endpoints Contract

### 2.1 POST /register

Register a new user account.

- **Auth Required:** No (Public)
- **Body:** `RegisterDto`
  - `name` (string, required, max 200 chars)
  - `email` (string, required, valid email format, max 255 chars)
  - `password` (string, required, min 8 chars, strong password)
  - `role` (enum: 'buyer' | 'merchant', optional, default: 'buyer')
- **File Upload:** `license` (File, optional, PDF only, max 10MB, required if role = 'merchant')
- **Response:** `201 Created`
  ```json
  {
    "data": {
      "id": "f4c5a1b2-3d6e-4f70-8a9b-1c2d3e4f5a6b",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "buyer",
      "merchantId": null,
      "licenseStatus": null,
      "emailVerified": false,
      "licenseUrl": null,
      "createdAt": "2026-08-10T12:00:00.000Z"
    }
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` - Validation failed
  - `409 CONFLICT` - Email already registered
  - `413 PAYLOAD_TOO_LARGE` - License file exceeds 10MB
  - `415 UNSUPPORTED_MEDIA_TYPE` - License file not PDF
  - `429 TOO_MANY_REQUESTS` - Rate limit exceeded
- **Logic:** Calls `service.register(dto, licenseFile)`
- **Rate Limit:** 3 attempts per IP per hour

### 2.2 POST /login

Authenticate user and issue tokens.

- **Auth Required:** No (Public)
- **Body:** `LoginDto`
  - `email` (string, required, valid email format)
  - `password` (string, required, min 8 chars)
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "user": {
        "id": "f4c5a1b2-3d6e-4f70-8a9b-1c2d3e4f5a6b",
        "email": "user@example.com",
        "name": "John Doe",
        "role": "buyer",
        "merchantId": null,
        "licenseStatus": null,
        "avatarUrl": null,
        "emailVerified": false
      }
    }
  }
  ```
- **Cookies Set:**
  - `refresh_token` (httpOnly, secure, sameSite=strict, path=/api/v1/auth/refresh, maxAge=7d)
- **Error Responses:**
  - `400 BAD_REQUEST` - Validation failed
  - `401 UNAUTHORIZED` - Invalid email or password
  - `403 FORBIDDEN` - Account deactivated
  - `429 TOO_MANY_REQUESTS` - Rate limit exceeded
- **Logic:** Calls `service.login(dto)`
- **Rate Limit:** 5 attempts per IP per 300 seconds

### 2.3 POST /refresh

Refresh access token using refresh token cookie.

- **Auth Required:** Cookie-based (httpOnly refresh_token cookie)
- **Body:** None (reads from cookie)
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs..."
    }
  }
  ```
- **Cookies Set:**
  - New `refresh_token` (rotated, httpOnly, secure, sameSite=strict)
- **Error Responses:**
  - `401 UNAUTHORIZED` - Missing refresh token
  - `401 UNAUTHORIZED` - Refresh token expired
  - `401 UNAUTHORIZED` - Refresh token revoked
  - `401 UNAUTHORIZED` - Token reuse detected (security violation)
  - `401 UNAUTHORIZED` - Absolute limit reached (90 days)
- **Logic:** Calls `service.refreshToken(refreshToken)`

### 2.4 POST /logout

Terminate user session.

- **Auth Required:** Yes (JwtAuthGuard)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Body:** None
- **Response:** `204 No Content`
- **Side Effects:**
  - Access token `jti` added to Redis blacklist (TTL = remaining token expiry)
  - Refresh token marked `is_revoked = true` in database
  - `refresh_token` cookie cleared
- **Error Responses:**
  - `401 UNAUTHORIZED` - Invalid or expired access token
- **Logic:** Calls `service.logout(userId, jti, tokenPayload)`

### 2.5 GET /verify

Validate access token and return user profile.

- **Auth Required:** Yes (JwtAuthGuard)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "id": "f4c5a1b2-3d6e-4f70-8a9b-1c2d3e4f5a6b",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "buyer",
      "merchantId": null,
      "licenseStatus": null,
      "avatarUrl": null,
      "emailVerified": false,
      "isActive": true,
      "createdAt": "2026-08-10T12:00:00.000Z"
    }
  }
  ```
- **Error Responses:**
  - `401 UNAUTHORIZED` - Invalid or expired access token
  - `401 UNAUTHORIZED` - Token blacklisted (logged out)
  - `403 FORBIDDEN` - Account deactivated
- **Logic:** Calls `service.verifyToken(userId)`

### 2.6 POST /forgot-password

Request a password reset link via email.

- **Auth Required:** No (Public)
- **Body:** `ForgotPasswordDto`
  - `email` (string, required, valid email format)
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "message": "If an account exists with that email, you'll receive a password reset link shortly."
    }
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` - Validation failed (invalid email format)
  - `429 TOO_MANY_REQUESTS` - Rate limit exceeded (3 requests per email per hour)
- **Logic:** Calls `service.forgotPassword(dto)`
- **Rate Limit:** 3 attempts per email per hour
- **Note:** Always returns same response regardless of whether email exists (prevents email enumeration)

### 2.7 POST /reset-password

Reset user password using a valid reset token.

- **Auth Required:** No (Public — token in body)
- **Body:** `ResetPasswordDto`
  - `token` (string, required)
  - `password` (string, required, min 8 chars, strong password)
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "message": "Your password has been reset successfully."
    }
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` - Validation failed (weak password)
  - `400 BAD_REQUEST` - Invalid or expired reset token
  - `429 TOO_MANY_REQUESTS` - Rate limit exceeded
- **Logic:** Calls `service.resetPassword(dto)`

---

## 3. Protected Endpoint Guards

All protected endpoints execute guards sequentially:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('auth')
export class AuthController { ... }
```

| Guard | Purpose | Behavior |
|-------|---------|----------|
| `JwtAuthGuard` | Validates JWT signature | Checks `Authorization: Bearer <token>` header. Verifies signature, expiry, and Redis blacklist. |
| `RolesGuard` | Enforces role-based access | Checks `@Roles()` decorator against user's `role` claim in JWT payload. |

---

## 4. Rate Limiting Configuration

| Endpoint | Limit | Window | Key |
|----------|-------|--------|-----|
| `POST /register` | 3 attempts | 1 hour | IP address |
| `POST /login` | 5 attempts | 5 minutes | IP address |
| `POST /refresh` | 10 attempts | 1 minute | User ID |
| `POST /logout` | 10 attempts | 1 minute | User ID |
| `POST /forgot-password` | 3 attempts | 1 hour | Email address |
| `POST /reset-password` | 5 attempts | 1 hour | Token hash |

**Redis Key Pattern:** `rate:auth:{endpoint}:{identifier}`

---

## 5. WebSocket Events (Post-Login)

After successful login, the frontend establishes a WebSocket connection:

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `connect` | Client -> Server | JWT token | Authenticate WebSocket connection |
| `join:user` | Client -> Server | `{ userId }` | Join user-specific room for notifications |
| `statusUpdate` | Server -> Client | `{ type, data }` | Order/status change notifications |
| `disconnect` | Client -> Server | — | Handle disconnection |

---

## 6. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_AUTH_01](./DD_SignUp_Login_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_AUTH_02](./DD_SignUp_Login_02_FRONTEND_Page.md) | Frontend page design |
| [DD_AUTH_04](./DD_SignUp_Login_04_DTOS_AND_TYPES.md) | Full DTO definitions |
| [DD_AUTH_05](./DD_SignUp_Login_05_BUSINESS_LOGIC.md) | Backend business rules |
| [機能設計書_SignUp_Login](../機能設計書_SignUp_Login.md) | Full functional specification |
