# 機能設計書（Sign-up / Login Page）

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-FDS-AUTH-001 |
| **System** | Cosmetics Finder |
| **Module** | Authentication (Sign-up / Login) |
| **Version** | 1.0 |
| **Created** | 2026-08-04 |
| **Status** | Draft |

---

## 1. Overview

This document defines the detailed functional design for the Sign-up and Login pages, covering frontend UI, backend API, and database interactions.

---

## 2. Requirements Traceability

| Requirement ID | Description | Priority |
|---------------|-------------|----------|
| B-AUTH-001 | User can register with email and password | High |
| B-AUTH-002 | User can login with email and password | High |
| B-AUTH-003 | System issues JWT access token (15 min) and refresh token (7 days) | High |
| B-AUTH-004 | User can logout (token blacklisted in Redis) | High |
| B-AUTH-005 | Access token auto-refreshes via refresh token | High |
| B-AUTH-006 | Password is hashed with Argon2 | High |
| B-AUTH-007 | Refresh token rotation on every use | High |
| B-AUTH-008 | Token family tracking for breach detection | Medium |

---

## 3. API Endpoints Design

### 3.1 Endpoint Summary

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/api/v1/auth/register` | User registration | Public |
| `POST` | `/api/v1/auth/login` | User login | Public |
| `POST` | `/api/v1/auth/refresh` | Refresh access token | Cookie (refresh token) |
| `POST` | `/api/v1/auth/logout` | Logout (blacklist token) | Bearer JWT |
| `GET` | `/api/v1/auth/verify` | Verify token validity | Bearer JWT |

---

### 3.2 POST `/api/v1/auth/register`

**Request Body (RegisterDto):**

```json
{
  "email": "user@example.com",
  "password": "secureP@ss1",
  "name": "John Doe",
  "role": "buyer"
}
```

**Validation Rules (class-validator):**

| Field | Type | Constraints |
|-------|------|-------------|
| `email` | `string` | `@IsEmail()`, `@IsNotEmpty()` |
| `password` | `string` | `@MinLength(8)`, `@MaxLength(128)`, `@Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)` |
| `name` | `string` | `@IsString()`, `@IsNotEmpty()`, `@MaxLength(200)` |
| `role` | `string` | `@IsIn(['buyer', 'merchant'])`, `@IsOptional()` |

**Success Response (201):**

```json
{
  "data": {
    "id": "clx1234567890",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "buyer",
    "emailVerified": false,
    "createdAt": "2026-08-04T12:00:00.000Z"
  }
}
```

**Error Responses:**

| Status | Message | Trigger |
|--------|---------|---------|
| `409` | `["Email already exists"]` | Duplicate email |
| `400` | `["email must be an email", ...]` | Validation failure |

**Backend Processing Flow:**

```
RegisterDto validated by ValidationPipe
  → AuthService.register()
    → Check email uniqueness in users table
    → Hash password with Argon2 (64MB, 3 iterations, 4 threads)
    → Create user record in users table
    → Return user DTO (exclude password_hash)
    → Log: USER_REGISTERED audit event
```

---

### 3.3 POST `/api/v1/auth/login`

**Request Body (LoginDto):**

```json
{
  "email": "user@example.com",
  "password": "secureP@ss1"
}
```

**Validation Rules:**

| Field | Type | Constraints |
|-------|------|-------------|
| `email` | `string` | `@IsEmail()`, `@IsNotEmpty()` |
| `password` | `string` | `@IsNotEmpty()`, `@MinLength(8)` |

**Success Response (200):**

```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "clx1234567890",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "buyer",
      "avatarUrl": null
    }
  }
}
```

**Response Headers:**

```
Set-Cookie: refreshToken=<hashed>; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth/refresh; Max-Age=604800
```

**Error Responses:**

| Status | Message | Trigger |
|--------|---------|---------|
| `401` | `["Invalid email or password"]` | Wrong credentials |
| `403` | `["Account is deactivated"]` | `is_active = false` |
| `400` | Validation errors | Invalid input |

**Backend Processing Flow:**

```
LoginDto validated
  → AuthService.login()
    → Find user by email (idx_users_email index)
    → Check is_active = true
    → Verify password with argon2.verify()
    → Check Redis rate limit (rate:auth:{ip}, 5 attempts / 300s)
    → Generate JWT access token (15 min expiry)
      Payload: { sub: userId, email, role, jti }
      Signed with: JWT_ACCESS_SECRET
    → Generate refresh token (7 day expiry)
      Signed with: JWT_REFRESH_SECRET
    → Hash refresh token with Argon2
    → Store refresh token in refresh_tokens table
      - family: cuid() (new session family)
      - absoluteLimitAt: now + 90 days
      - expiresAt: now + 7 days
    → Set httpOnly cookie with raw refresh token
    → Return accessToken + user DTO in response body
    → Log: USER_LOGIN success audit event
```

---

### 3.4 POST `/api/v1/auth/refresh`

**Request:**
- No body required
- Refresh token read from httpOnly cookie

**Success Response (200):**

```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Response Headers:**

```
Set-Cookie: refreshToken=<new_hashed>; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth/refresh; Max-Age=604800
```

**Error Responses:**

| Status | Message | Trigger |
|--------|---------|---------|
| `401` | `["Refresh token not found"]` | Missing cookie |
| `401` | `["Refresh token has been revoked"]` | `is_revoked = true` |
| `401` | `["Session expired. Please login again"]` | `expires_at < now` |
| `401` | `["Absolute session limit reached"]` | `absolute_limit_at < now` |
| `401` | `["Token reuse detected. All sessions revoked"]` | Family reuse detected |
| `401` | `["Invalid refresh token"]` | Signature verification failed |

**Backend Processing Flow (Refresh Token Rotation):**

```
Read refresh token from cookie
  → AuthService.refresh()
    → Verify JWT signature with JWT_REFRESH_SECRET
    → Extract jti from token
    → Find refresh_token record by token_hash
    → Validate:
      1. Token exists in DB
      2. is_revoked = false
      3. expires_at > now()
      4. absolute_limit_at > now()
    → Check token family:
      - If revoked token in same family detected → REUSE DETECTED
        → Revoke ALL tokens for this user
        → Log: SECURITY_VIOLATION
        → Return 401
    → Revoke old token (is_revoked = true)
    → Generate new access token (15 min)
    → Generate new refresh token (7 day)
      - Same family ID inherited
    → Hash new refresh token
    → Store new refresh token in DB
    → Set new httpOnly cookie
    → Return new access token
    → Log: TOKEN_REFRESHED audit event
```

---

### 3.5 POST `/api/v1/auth/logout`

**Request Headers:**

```
Authorization: Bearer <accessToken>
```

**Success Response (204):** No body

**Backend Processing Flow:**

```
JwtAuthGuard validates access token
  → AuthService.logout()
    → Extract jti from token payload
    → Add jti to Redis blacklist:
      SET blacklist:{jti} "1" EX <remaining_ttl>
    → Revoke all refresh tokens for this user (optional: current session only)
    → Log: USER_LOGOUT audit event
```

---

### 3.6 GET `/api/v1/auth/verify`

**Request Headers:**

```
Authorization: Bearer <accessToken>
```

**Success Response (200):**

```json
{
  "data": {
    "id": "clx1234567890",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "buyer",
    "emailVerified": false
  }
}
```

**Error Response:**

| Status | Message | Trigger |
|--------|---------|---------|
| `401` | `["Invalid or expired token"]` | Token expired or blacklisted |

---

## 4. Frontend Design

### 4.1 Page Structure

```
frontend/src/
├── pages/
│   ├── Login.tsx                    # Login page (route: /login)
│   └── Register.tsx                 # Registration page (route: /register)
├── features/auth/
│   ├── components/
│   │   ├── LoginForm.tsx            # Login form component
│   │   ├── RegisterForm.tsx         # Register form component
│   │   └── AuthLayout.tsx           # Shared auth layout (logo, background)
│   ├── hooks/
│   │   └── useAuth.ts              # Authentication hook
│   ├── schemas/
│   │   └── auth.schema.ts          # Zod validation schemas
│   └── services/
│       └── auth.service.ts         # API service layer
```

### 4.2 Route Definitions (routes.tsx)

```tsx
// Public routes
<Route path="/login" element={<Login />} />
<Route path="/register" element={<Register />} />

// Protected routes (require authentication)
<Route element={<ProtectedRoute />}>
  <Route path="/profile" element={<Profile />} />
  {/* ... other protected routes */}
</Route>
```

### 4.3 Zod Schema (auth.schema.ts)

```typescript
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      'Password must contain uppercase, lowercase, number, and special character'
    ),
  name: z.string().min(1, 'Name is required').max(200),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
```

### 4.4 UI Wireframe

#### Login Page

```
┌─────────────────────────────────────────────┐
│  ┌─────────────────────────────────────┐    │
│  │         🌿 Cosmetics Finder         │    │
│  │                                     │    │
│  │  ┌─────────────────────────────┐    │    │
│  │  │  Email                      │    │    │
│  │  │  ┌─────────────────────┐    │    │    │
│  │  │  │ user@example.com    │    │    │    │
│  │  │  └─────────────────────┘    │    │    │
│  │  └─────────────────────────────┘    │    │
│  │                                     │    │
│  │  ┌─────────────────────────────┐    │    │
│  │  │  Password                   │    │    │
│  │  │  ┌─────────────────────┐    │    │    │
│  │  │  │ ••••••••       👁   │    │    │    │
│  │  │  └─────────────────────┘    │    │    │
│  │  └─────────────────────────────┘    │    │
│  │                                     │    │
│  │  ┌─────────────────────────────┐    │    │
│  │  │       Log In (primary)      │    │    │
│  │  └─────────────────────────────┘    │    │
│  │                                     │    │
│  │  Don't have an account? Sign Up     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  🌐 Language: EN | MY | JA                  │
│  🌙 Theme: Light / Dark                     │
└─────────────────────────────────────────────┘
```

#### Register Page

```
┌─────────────────────────────────────────────┐
│  ┌─────────────────────────────────────┐    │
│  │         🌿 Cosmetics Finder         │    │
│  │                                     │    │
│  │  ┌─────────────────────────────┐    │    │
│  │  │  Full Name                  │    │    │
│  │  │  ┌─────────────────────┐    │    │    │
│  │  │  │ John Doe            │    │    │    │
│  │  │  └─────────────────────┘    │    │    │
│  │  └─────────────────────────────┘    │    │
│  │                                     │    │
│  │  ┌─────────────────────────────┐    │    │
│  │  │  Email                      │    │    │
│  │  │  ┌─────────────────────┐    │    │    │
│  │  │  │ user@example.com    │    │    │    │
│  │  │  └─────────────────────┘    │    │    │
│  │  └─────────────────────────────┘    │    │
│  │                                     │    │
│  │  ┌─────────────────────────────┐    │    │
│  │  │  Password                   │    │    │
│  │  │  ┌─────────────────────┐    │    │    │
│  │  │  │ ••••••••       👁   │    │    │    │
│  │  │  └─────────────────────┘    │    │    │
│  │  │  Min 8 chars, uppercase,    │    │    │
│  │  │  lowercase, number, symbol  │    │    │
│  │  └─────────────────────────────┘    │    │
│  │                                     │    │
│  │  ┌─────────────────────────────┐    │    │
│  │  │  Confirm Password           │    │    │
│  │  │  ┌─────────────────────┐    │    │    │
│  │  │  │ ••••••••            │    │    │    │
│  │  │  └─────────────────────┘    │    │    │
│  │  └─────────────────────────────┘    │    │
│  │                                     │    │
│  │  ┌─────────────────────────────┐    │    │
│  │  │  I am a:                    │    │    │
│  │  │  ( ) Buyer  ( ) Merchant    │    │    │
│  │  └─────────────────────────────┘    │    │
│  │                                     │    │
│  │  ┌─────────────────────────────┐    │    │
│  │  │     Create Account          │    │    │
│  │  └─────────────────────────────┘    │    │
│  │                                     │    │
│  │  Already have an account? Log In     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  🌐 Language: EN | MY | JA                  │
│  🌙 Theme: Light / Dark                     │
└─────────────────────────────────────────────┘
```

### 4.5 Frontend Service Layer (auth.service.ts)

```typescript
const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

export const authService = {
  async login(data: LoginFormData): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Send/receive cookies
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new AuthError(error.message, response.status);
    }
    return response.json();
  },

  async register(data: RegisterFormData): Promise<RegisterResponse> {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: data.email,
        password: data.password,
        name: data.name,
      }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new AuthError(error.message, response.status);
    }
    return response.json();
  },

  async refresh(): Promise<{ accessToken: string }> {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) throw new AuthError('Session expired', 401);
    return response.json();
  },

  async logout(): Promise<void> {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getAccessToken()}`,
      },
      credentials: 'include',
    });
    clearAccessToken();
  },

  async verify(): Promise<User> {
    const response = await fetch(`${API_BASE}/auth/verify`, {
      headers: {
        Authorization: `Bearer ${getAccessToken()}`,
      },
    });
    if (!response.ok) throw new AuthError('Invalid token', 401);
    return response.json();
  },
};
```

### 4.6 useAuth Hook (useAuth.ts)

```typescript
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Auto-refresh token on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { accessToken } = await authService.refresh();
        setAccessToken(accessToken);
        const userData = await authService.verify();
        setUser(userData);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (data: LoginFormData) => {
    const response = await authService.login(data);
    setAccessToken(response.accessToken);
    setUser(response.user);
    navigate('/');
  };

  const register = async (data: RegisterFormData) => {
    await authService.register(data);
    navigate('/login');
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    navigate('/login');
  };

  return { user, isLoading, login, register, logout };
}
```

---

## 5. Database Operations

### 5.1 Tables Involved

| Table | Operation | Purpose |
|-------|-----------|---------|
| `users` | INSERT | Create new user on registration |
| `users` | SELECT | Lookup user by email on login |
| `refresh_tokens` | INSERT | Store hashed refresh token |
| `refresh_tokens` | SELECT | Verify refresh token on rotation |
| `refresh_tokens` | UPDATE | Revoke old token on rotation |
| `refresh_tokens` | UPDATE | Revoke all tokens on breach detection |

### 5.2 Index Usage

| Index | Used By | Purpose |
|-------|---------|---------|
| `idx_users_email` | Login, Register (uniqueness check) | Fast email lookup |
| `idx_refresh_tokens_token_hash` | Refresh endpoint | Token verification |
| `idx_refresh_tokens_user_id` | Logout (revoke all) | User token lookup |
| `idx_refresh_tokens_family` | Breach detection | Family tracking |

### 5.3 Prisma Queries

**Register - Check Email Uniqueness:**

```typescript
const existingUser = await prisma.user.findUnique({
  where: { email: dto.email },
  select: { id: true },
});
```

**Register - Create User:**

```typescript
const user = await prisma.user.create({
  data: {
    email: dto.email,
    passwordHash: await argon2.hash(dto.password),
    name: dto.name,
    role: dto.role || 'buyer',
  },
  select: {
    id: true,
    email: true,
    name: true,
    role: true,
    emailVerified: true,
    createdAt: true,
  },
});
```

**Login - Find User:**

```typescript
const user = await prisma.user.findUnique({
  where: { email: dto.email },
  select: {
    id: true,
    email: true,
    name: true,
    passwordHash: true,
    role: true,
    avatarUrl: true,
    isActive: true,
  },
});
```

**Refresh - Store Token:**

```typescript
await prisma.refreshToken.create({
  data: {
    userId: user.id,
    tokenHash: await argon2.hash(refreshToken),
    family: familyId,
    ipAddress: requestIp,
    deviceInfo: userAgent,
    absoluteLimitAt: addDays(now, 90),
    expiresAt: addDays(now, 7),
  },
});
```

---

## 6. Security Measures

### 6.1 Password Policy

| Rule | Value |
|------|-------|
| Minimum length | 8 characters |
| Maximum length | 128 characters |
| Required character types | Uppercase, lowercase, digit, special character |
| Hashing algorithm | Argon2id |
| Memory cost | 64 MB |
| Time cost | 3 iterations |
| Parallelism | 4 threads |

### 6.2 JWT Configuration

| Parameter | Access Token | Refresh Token |
|-----------|-------------|---------------|
| Expiry | 15 minutes | 7 days |
| Secret | `JWT_ACCESS_SECRET` | `JWT_REFRESH_SECRET` |
| Storage (frontend) | Memory variable | httpOnly cookie |
| Payload | `{ sub, email, role, jti }` | `{ sub, jti, family }` |
| Cookie attributes | N/A | `HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth/refresh` |

### 6.3 Rate Limiting

| Endpoint | Limit | Window | Key |
|----------|-------|--------|-----|
| `/auth/login` | 5 attempts | 300 seconds | `rate:auth:{ip}` |
| `/auth/register` | 3 attempts | 300 seconds | `rate:auth:{ip}` |
| `/auth/refresh` | 10 attempts | 60 seconds | `rate:auth:{ip}` |

### 6.4 Security Headers

```
Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth/refresh; Max-Age=604800
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

## 7. Error Handling

### 7.1 Backend Error Format

```json
{
  "statusCode": 401,
  "message": ["Invalid email or password"],
  "error": "Unauthorized",
  "timestamp": "2026-08-04T12:00:00.000Z",
  "path": "/api/v1/auth/login"
}
```

### 7.2 Frontend Error Handling

| HTTP Status | User-Friendly Message | Action |
|-------------|----------------------|--------|
| `400` | "Please check your input" | Show field errors |
| `401` | "Invalid email or password" | Show inline error |
| `403` | "Account is deactivated" | Show contact support |
| `409` | "Email already registered" | Suggest login |
| `429` | "Too many attempts. Please wait" | Show countdown |
| `500` | "Something went wrong" | Show retry button |

### 7.3 Audit Logging

| Event | Data | Retention |
|-------|------|-----------|
| `USER_REGISTERED` | userId, email, ip, timestamp | 90 days |
| `USER_LOGIN_SUCCESS` | userId, email, ip, timestamp | 90 days |
| `USER_LOGIN_FAILED` | email, ip, timestamp, reason | 30 days |
| `USER_LOGOUT` | userId, timestamp | 90 days |
| `TOKEN_REFRESHED` | userId, timestamp | 90 days |
| `SECURITY_VIOLATION` | userId, ip, timestamp, details | 1 year |

---

## 8. Testing Strategy

### 8.1 Unit Tests

| Component | Test Cases |
|-----------|------------|
| `auth.service.ts` | Register success, duplicate email, login success, wrong password, inactive account |
| `auth.controller.ts` | All endpoint success/error paths, validation, RBAC |
| `auth.schema.ts` | Valid/invalid email, password strength, confirm password match |

### 8.2 Integration Tests

| Scenario | Expected Result |
|----------|-----------------|
| Register → Login → Profile access | Full flow works |
| Login → Refresh → Access protected resource | Token rotation works |
| Login → Logout → Use old access token | 401 returned (blacklisted) |
| Refresh with revoked token | All user tokens revoked |
| Rate limit exceeded | 429 returned |

### 8.3 Security Tests

| Test | Expected Result |
|------|-----------------|
| SQL injection in email field | Input sanitized, no injection |
| XSS in name field | HTML escaped, no script execution |
| Brute force login | Rate limited after 5 attempts |
| Token replay after logout | 401 (blacklist check) |
| Refresh token reuse | Family revoked, 401 |

---

## 9. Implementation Checklist

### Backend (NestJS)

- [ ] Create `auth.module.ts`
- [ ] Create `auth.controller.ts` with all endpoints
- [ ] Create `auth.service.ts` with business logic
- [ ] Create `dto/register.dto.ts` with validation
- [ ] Create `dto/login.dto.ts` with validation
- [ ] Create `strategies/jwt.strategy.ts`
- [ ] Create `guards/local-auth.guard.ts`
- [ ] Implement Argon2 password hashing
- [ ] Implement JWT access/refresh token generation
- [ ] Implement refresh token rotation with family tracking
- [ ] Implement Redis blacklist for logout
- [ ] Implement rate limiting
- [ ] Write unit tests (90% coverage)
- [ ] Write integration tests

### Frontend (React)

- [ ] Create `pages/Login.tsx`
- [ ] Create `pages/Register.tsx`
- [ ] Create `features/auth/components/LoginForm.tsx`
- [ ] Create `features/auth/components/RegisterForm.tsx`
- [ ] Create `features/auth/components/AuthLayout.tsx`
- [ ] Create `features/auth/schemas/auth.schema.ts`
- [ ] Create `features/auth/services/auth.service.ts`
- [ ] Create `hooks/useAuth.ts`
- [ ] Implement access token in-memory storage
- [ ] Implement auto-refresh on app load
- [ ] Implement i18n keys for all strings
- [ ] Implement form validation with error display
- [ ] Write component tests
- [ ] Write E2E tests for full auth flow

---

*End of 機能設計書 (Sign-up / Login Page)*
