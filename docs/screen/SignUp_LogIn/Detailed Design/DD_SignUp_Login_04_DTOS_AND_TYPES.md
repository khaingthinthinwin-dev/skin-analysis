# DD_AUTH_04 — DTOs and Types

> **Doc ID:** SKM-DD-AUTH-04 | **Version:** 2.0 | **Status:** Released  
> **Last Updated:** 2026-08-21

---

## 1. Overview

This document specifies the Data Transfer Objects (DTOs) used by the Authentication module's API endpoints. These DTOs utilize `class-validator` for request validation and `class-transformer` for data transformation.

- **Location:** `src/modules/auth/dto/`

---

## 2. Request DTOs

### 2.1 RegisterDto

Used for `POST /register` to create a new user account.

```typescript
import { 
  IsString, IsEmail, IsOptional, IsEnum, IsNotEmpty, 
  MaxLength, MinLength, Matches 
} from 'class-validator';

export enum UserRole {
  BUYER = 'buyer',
  MERCHANT = 'merchant',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(200, { message: 'Name must be 200 characters or less' })
  name: string;

  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @MaxLength(255)
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/^(?=.*[a-z])/, { message: 'Password must contain at least 1 lowercase letter' })
  @Matches(/^(?=.*[A-Z])/, { message: 'Password must contain at least 1 uppercase letter' })
  @Matches(/^(?=.*\d)/, { message: 'Password must contain at least 1 number' })
  @Matches(/^(?=.*[@$!%*?&])/, { message: 'Password must contain at least 1 special character' })
  password: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Invalid role' })
  role?: UserRole = UserRole.BUYER;
}
```

### 2.2 LoginDto

Used for `POST /login` to authenticate a user.

```typescript
import { IsEmail, IsString, IsNotEmpty, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;
}
```

### 2.3 RefreshTokenDto

Used internally for `POST /refresh` to process refresh token from cookie.

```typescript
import { IsString, IsNotEmpty } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
```

### 2.4 LogoutDto

Used for `POST /logout` to capture token info for blacklisting.

```typescript
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class LogoutDto {
  @IsString()
  @IsNotEmpty()
  jti: string; // JWT ID for blacklisting

  @IsOptional()
  @IsString()
  tokenFamily?: string; // For family-based revocation
}
```

### 2.5 ForgotPasswordDto

Used for `POST /forgot-password` to request a password reset link.

```typescript
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;
}
```

### 2.6 ResetPasswordDto

Used for `POST /reset-password` to reset user password with a valid token.

```typescript
import { IsString, IsNotEmpty, MinLength, Matches } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Reset token is required' })
  token: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/^(?=.*[a-z])/, { message: 'Password must contain at least 1 lowercase letter' })
  @Matches(/^(?=.*[A-Z])/, { message: 'Password must contain at least 1 uppercase letter' })
  @Matches(/^(?=.*\d)/, { message: 'Password must contain at least 1 number' })
  @Matches(/^(?=.*[@$!%*?&])/, { message: 'Password must contain at least 1 special character' })
  password: string;
}
```

---

## 3. Response DTOs

### 3.1 AuthResponseDto

Returned by login and refresh endpoints.

```typescript
export class AuthResponseDto {
  accessToken: string;
  user: UserResponseDto;
}
```

### 3.2 UserResponseDto

Returned in auth responses and verify endpoint.

```typescript
export class UserResponseDto {
  id: string;
  email: string;
  name: string;
  role: string;
  merchantId: string | null;
  licenseStatus: 'pending' | 'approved' | 'rejected' | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  isActive: boolean;
  createdAt: Date;
}
```

### 3.3 RegisterResponseDto

Returned by register endpoint.

```typescript
export class RegisterResponseDto {
  id: string;
  email: string;
  name: string;
  role: string;
  merchantId: string | null;
  licenseStatus: 'pending' | 'approved' | 'rejected' | null;
  emailVerified: boolean;
  licenseUrl: string | null;
  createdAt: Date;
}
```

### 3.4 VerifyResponseDto

Returned by verify endpoint with full user profile.

```typescript
export class VerifyResponseDto {
  id: string;
  email: string;
  name: string;
  role: string;
  merchantId: string | null;
  licenseStatus: 'pending' | 'approved' | 'rejected' | null;
  avatarUrl: string | null;
  phone: string | null;
  emailVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.5 ForgotPasswordResponseDto

Returned by forgot-password endpoint.

```typescript
export class ForgotPasswordResponseDto {
  message: string; // Always same message to prevent email enumeration
}
```

### 3.6 ResetPasswordResponseDto

Returned by reset-password endpoint.

```typescript
export class ResetPasswordResponseDto {
  message: string; // "Your password has been reset successfully."
}
```

---

## 4. JWT Payload Types

### 4.1 AccessTokenPayload

```typescript
export interface AccessTokenPayload {
  sub: string;      // User ID
  email: string;    // User email
  role: string;     // User role (buyer, merchant, admin, super_admin)
  jti: string;      // Unique token ID for blacklisting
  iat: number;      // Issued at timestamp
  exp: number;      // Expiration timestamp (15 minutes)
}
```

### 4.2 RefreshTokenPayload

```typescript
export interface RefreshTokenPayload {
  sub: string;      // User ID
  jti: string;      // Unique token ID
  family: string;   // Token family ID for rotation tracking
  iat: number;      // Issued at timestamp
  exp: number;      // Expiration timestamp (7 days)
}
```

### 4.3 TokenFamily

```typescript
export interface TokenFamily {
  id: string;           // Family ID (generated on first login)
  userId: string;       // Associated user
  isRevoked: boolean;   // Revoked flag for breach detection
  createdAt: Date;      // Family creation timestamp
  absoluteLimitAt: Date; // 90-day hard cap
}
```

### 4.4 PasswordResetToken

```typescript
export interface PasswordResetToken {
  id: string;           // UUID primary key
  userId: string;       // Associated user
  tokenHash: string;    // Hashed reset token (SHA-256)
  expiresAt: Date;      // 24-hour expiry
  used: boolean;        // Single-use flag
  createdAt: Date;      // Token creation timestamp
}
```

---

## 5. Cookie Configuration Types

### 5.1 RefreshTokenCookieConfig

```typescript
export interface RefreshTokenCookieConfig {
  name: string;           // 'refresh_token'
  httpOnly: boolean;      // true
  secure: boolean;        // true (production)
  sameSite: 'strict' | 'lax' | 'none'; // 'strict'
  path: string;           // '/api/v1/auth/refresh'
  maxAge: number;         // 7 days in milliseconds
}
```

### 5.2 Default Cookie Configuration

```typescript
export const REFRESH_TOKEN_COOKIE_CONFIG: RefreshTokenCookieConfig = {
  name: 'refresh_token',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api/v1/auth/refresh',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};
```

---

## 6. Error Response Types

### 6.1 ErrorResponse

```typescript
export interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  details?: ErrorDetail[];
  timestamp: string;
  path: string;
}

export interface ErrorDetail {
  field: string;
  message: string;
}
```

### 6.2 Common Error Codes

```typescript
export enum AuthErrorCode {
  VALIDATION_FAILED = 'VALIDATION_ERROR',
  EMAIL_EXISTS = 'EMAIL_EXISTS',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_DEACTIVATED = 'ACCOUNT_DEACTIVATED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_REVOKED = 'TOKEN_REVOKED',
  TOKEN_REUSE_DETECTED = 'TOKEN_REUSE_DETECTED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  LICENSE_INVALID_TYPE = 'LICENSE_INVALID_TYPE',
  LICENSE_INVALID_NAME = 'LICENSE_INVALID_NAME',
  LICENSE_TOO_LARGE = 'LICENSE_TOO_LARGE',
  RESET_TOKEN_INVALID = 'RESET_TOKEN_INVALID',
  RESET_TOKEN_EXPIRED = 'RESET_TOKEN_EXPIRED',
  RESET_TOKEN_USED = 'RESET_TOKEN_USED',
  PASSWORD_RESET_RATE_LIMIT = 'PASSWORD_RESET_RATE_LIMIT',
}
```

---

## 7. File Upload Types

### 7.1 LicenseFile

```typescript
export interface LicenseFile {
  fieldname: string;      // 'license'
  originalname: string;   // Original filename
  encoding: string;       // File encoding
  mimetype: string;       // 'application/pdf'
  destination: string;    // Upload directory
  filename: string;       // UUID-based filename
  path: string;           // Full file path
  size: number;           // File size in bytes
}
```

### 7.2 LicenseValidationConfig

```typescript
export interface LicenseValidationConfig {
  maxSize: number;           // 10MB in bytes
  allowedMimeTypes: string[]; // ['application/pdf']
  requiredFileName: string;   // 'license.pdf'
  storagePath: string;        // './uploads/licenses'
}

export const LICENSE_VALIDATION_CONFIG: LicenseValidationConfig = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ['application/pdf'],
  requiredFileName: 'license.pdf',
  storagePath: process.env.LICENSE_STORAGE_PATH || './uploads/licenses',
};
```

---

## 8. Redis Types

### 8.1 BlacklistEntry

```typescript
export interface BlacklistEntry {
  key: string;        // 'blacklist:{jti}' or 'refresh:blacklist:{jti}'
  value: string;      // '1'
  ttl: number;        // Time to live in seconds
}
```

### 8.2 RateLimitEntry

```typescript
export interface RateLimitEntry {
  key: string;        // 'rate:auth:{endpoint}:{identifier}'
  count: number;      // Current attempt count
  windowStart: number; // Window start timestamp
  ttl: number;        // Time to live in seconds
}
```

---

## 9. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_AUTH_03](./DD_SignUp_Login_03_API_ENDPOINTS.md) | Endpoints that consume these DTOs |
| [DD_AUTH_05](./DD_SignUp_Login_05_BUSINESS_LOGIC.md) | Business rules for validation |
| [機能設計書_SignUp_Login](../機能設計書_SignUp_Login.md) | Full functional specification |
