# DD_AUTH_05 — Business Logic

> **Doc ID:** SKM-DD-AUTH-05 | **Version:** 1.0 | **Status:** Released  
> **Last Updated:** 2026-08-10

---

## 1. Overview

This document specifies the core business logic, token lifecycle management, and security rules implemented in the `AuthService`.

- **Location:** `src/modules/auth/auth.service.ts`

---

## 2. Core Service Methods

### 2.1 register(dto, licenseFile)

1. **Validation:** Handled by RegisterDto with class-validator.
2. **Logic:**
   - Check email uniqueness in `users` table
   - If `dto.role === 'merchant'`, validate license file (PDF, named license.pdf, max 10MB)
   - Hash password with Argon2id (64MB memory, 3 iterations, 4 threads)
   - Generate CUID for user ID
   - Upload license file to storage (if merchant)
   - Insert `users` record with `is_active=true`, `email_verified=false`
   - Log `USER_REGISTERED` event
3. **Transaction Boundaries:** User creation and license file upload must be atomic

### 2.2 login(dto)

1. **Validation:** Handled by LoginDto with class-validator
2. **Rate Limiting:** Check `rate:auth:login:{ip}` in Redis. If count > 5, reject with 429
3. **Logic:**
   - Find user by email. If not found, return generic "Invalid email or password"
   - Check `is_active` flag. If false, return 403 FORBIDDEN
   - Verify password with `argon2.verify()`. If fails, return generic error
   - Generate access token (15 min expiry) with payload `{sub, email, role, jti}`
   - Generate refresh token (7 day expiry) with family ID
   - Hash refresh token and store in `refresh_tokens` table
   - Set httpOnly cookie with refresh token
   - Log `USER_LOGIN_SUCCESS` event
4. **Transaction Boundaries:** Token generation and storage must be atomic

### 2.3 refreshToken(refreshToken)

1. **Logic:**
   - Verify JWT signature with `JWT_REFRESH_SECRET`
   - Find `refresh_tokens` record by token hash
   - If not found, return 401 UNAUTHORIZED
   - Check `is_revoked` flag. If true, possible token reuse detected:
     - Revoke ALL tokens for this user and family
     - Log `SECURITY_VIOLATION` event
     - Return 401 UNAUTHORIZED
   - Check `absolute_limit_at` (90-day hard cap)
   - Check `expires_at`
   - Revoke old token, generate new access + refresh token
   - Set new httpOnly cookie
   - Log `TOKEN_REFRESHED` event
2. **Transaction Boundaries:** Old token revocation and new token creation must be atomic

### 2.4 logout(userId, jti, tokenPayload)

1. **Logic:**
   - Calculate remaining TTL of access token
   - Add `jti` to Redis blacklist with TTL = remaining TTL
   - Revoke all active refresh tokens for this user
   - Clear refresh token cookie
   - Log `USER_LOGOUT` event
2. **Transaction Boundaries:** None (Redis and DB operations are independent)

### 2.5 verifyToken(userId)

1. **Logic:**
   - Find user by `id` in `users` table
   - If not found, return 401 UNAUTHORIZED
   - Check `is_active` flag. If false, return 403 FORBIDDEN
   - Return user profile data (excluding password hash)

---

## 3. Token Lifecycle Logic

### 3.1 Access Token Generation

```typescript
private generateAccessToken(user: User): string {
  const payload: AccessTokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    jti: uuidv4(),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 15 * 60, // 15 minutes
  };
  
  return this.jwtService.sign(payload, {
    secret: process.env.JWT_ACCESS_SECRET,
  });
}
```

### 3.2 Refresh Token Generation

```typescript
private generateRefreshToken(user: User, family?: string): RefreshTokenResult {
  const tokenFamily = family || uuidv4();
  const payload: RefreshTokenPayload = {
    sub: user.id,
    jti: uuidv4(),
    family: tokenFamily,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
  };
  
  const token = this.jwtService.sign(payload, {
    secret: process.env.JWT_REFRESH_SECRET,
  });
  
  return { token, family: tokenFamily };
}
```

### 3.3 Token Blacklisting (Redis)

```typescript
async blacklistToken(jti: string, ttlSeconds: number): Promise<void> {
  await this.redis.setex(`blacklist:${jti}`, ttlSeconds, '1');
}

async isTokenBlacklisted(jti: string): Promise<boolean> {
  const result = await this.redis.exists(`blacklist:${jti}`);
  return result === 1;
}
```

---

## 4. Password Hashing Logic

### 4.1 Argon2 Configuration

```typescript
import * as argon2 from 'argon2';

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536,    // 64MB
  timeCost: 3,          // 3 iterations
  parallelism: 4,       // 4 threads
};

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}
```

---

## 5. Rate Limiting Logic

### 5.1 Rate Limit Configuration

```typescript
const RATE_LIMIT_CONFIG = {
  login: { limit: 5, window: 300 },      // 5 attempts per 5 minutes
  register: { limit: 3, window: 3600 },  // 3 attempts per hour
  refresh: { limit: 10, window: 60 },    // 10 attempts per minute
};
```

### 5.2 Rate Limit Check

```typescript
async checkRateLimit(key: string, limit: number, window: number): Promise<boolean> {
  const redisKey = `rate:auth:${key}`;
  const current = await this.redis.incr(redisKey);
  
  if (current === 1) {
    await this.redis.expire(redisKey, window);
  }
  
  return current <= limit;
}
```

---

## 6. Cookie Configuration

### 6.1 Refresh Token Cookie Settings

```typescript
const REFRESH_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/v1/auth/refresh',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
};
```

### 6.2 Clear Cookie Settings

```typescript
const CLEAR_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/v1/auth/refresh',
  maxAge: 0, // Expire immediately
};
```

---

## 7. Validation Rules

### 7.1 Registration Validation

| Field | Rule | Error Message |
|-------|------|---------------|
| `email` | Required, valid format, max 255 chars | "Email is required" / "Invalid email" |
| `password` | Required, 8-128 chars, uppercase, lowercase, digit, special char | "Password must be at least 8 characters" |
| `name` | Required, 1-200 chars | "Name is required" |
| `role` | Optional, 'buyer' or 'merchant' | "Invalid role" |
| `license` | Required if role=merchant, PDF, named license.pdf, max 10MB | Various license errors |

### 7.2 Login Validation

| Field | Rule | Error Message |
|-------|------|---------------|
| `email` | Required, valid format | "Email is required" / "Invalid email" |
| `password` | Required, min 8 chars | "Password is required" |

---

## 8. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_AUTH_03](./DD_SignUp_Login_03_API_ENDPOINTS.md) | Endpoint routing to these methods |
| [DD_AUTH_04](./DD_SignUp_Login_04_DTOS_AND_TYPES.md) | DTO definitions used in validation |
| [DD_AUTH_06](./DD_SignUp_Login_06__TEST_SPEC.md) | Test specification |
| [Requirement Spec](../../core-work/要件定義書_REQUIREMENT_SPEC.md) | Source business rules |
