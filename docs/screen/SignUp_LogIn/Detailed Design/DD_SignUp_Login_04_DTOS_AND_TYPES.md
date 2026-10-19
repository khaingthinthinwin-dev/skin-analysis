# DD SignUp/Login 04 — DTOs and Types

> **Doc ID:** SKM-DD-AUTH-04 | **Version:** 2.2 | **Status:** Aligned to current implementation
> **Last Updated:** 2026-10-15

---

## 1. Overview

This document distinguishes the frontend form models and service types from the NestJS request DTOs. Client-side form values are not all sent to the API: confirmation fields and the Terms of Service checkbox are validation/UI state only.

**Backend DTO location:** `backend/src/modules/auth/dto/`
**Frontend types:** `frontend/src/types/auth.types.ts`
**Frontend schemas:** `frontend/src/schemas/auth.schema.ts`

---

## 2. Frontend Form Models

The page schemas use Zod and display translated validation messages where configured.

| Schema | Fields and constraints |
|---|---|
| `loginSchema` | `email`: required and valid email. `password`: required, minimum 8 characters. |
| `registerSchema` | `name`: 2–200 characters; `email`: required, valid, maximum 255; `password`: 8–128 characters with uppercase, lowercase, digit, and special character from `@$!%*?&`; `confirmPassword`: required and must match; `role`: buyer or merchant; `licenseFile`: required for merchant and validated as PDF, at most 10 MB, named `license.pdf`; `agreeToTerms`: must be true. |
| `forgotPasswordSchema` | `email`: required and valid email. |
| `verifyCodeSchema` | `code`: required and exactly 6 characters. |
| `resetPasswordSchema` | `password`: 8–128 characters with uppercase, lowercase, digit, and special character from `@$!%*?&`; `confirmPassword`: required and must match. |

Frontend Register form values:

```typescript
interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'buyer' | 'merchant';
  licenseFile: File | null;
  agreeToTerms: boolean;
}
```

`name` is the single name input. For merchants the UI labels it “Shop Name”, and the backend uses that same `name` value as the merchant shop name. There is no separate shop-name property.

---

## 3. Backend Request DTOs

### 3.1 `RegisterDto`

```typescript
class RegisterDto {
  email: string; // @IsEmail()
  name: string; // string, length 2–100
  password: string; // string, minimum 8
  role?: 'buyer' | 'merchant'; // optional; service defaults to buyer
}
```

The registration endpoint receives the optional `license` as a separate multipart file, not as a DTO property. Controller behavior requires it for merchant and disallows it for buyer. There are no `shopName`, `confirmPassword`, or `agreeToTerms` DTO fields. Unlike the frontend schema, the backend DTO does not enforce password composition rules.

### 3.2 `LoginDto`

```typescript
class LoginDto {
  email: string; // @IsEmail()
  password: string; // string, minimum 8
}
```

### 3.3 `RefreshTokenDto`

```typescript
class RefreshTokenDto {
  refreshToken: string; // string
}
```

The frontend refresh interceptor posts this value in the request body.

### 3.4 `ForgotPasswordDto`

```typescript
class ForgotPasswordDto {
  email: string; // @IsEmail(), not empty
}
```

### 3.5 `VerifyCodeDto`

```typescript
class VerifyCodeDto {
  email: string; // @IsEmail(), not empty
  code: string; // not empty, exactly 6 characters
}
```

### 3.6 `ResetPasswordDto`

```typescript
class ResetPasswordDto {
  email: string; // @IsEmail(), not empty
  code: string; // not empty, exactly 6 characters
  password: string; // minimum 8; lowercase, uppercase, digit, special character
}
```

### 3.7 Other Auth DTOs

The controller also uses `CreateAdminDto` and `ChangePasswordDto` for administrative account creation and authenticated password changes. These are outside the public page form flow.

---

## 4. Frontend Service Types

The frontend types in `auth.types.ts` currently define:

```typescript
type UserRole = 'buyer' | 'merchant' | 'admin' | 'super_admin';
type LicenseStatus = 'pending' | 'approved' | 'rejected' | null;

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: 'buyer' | 'merchant' | 'admin' | 'super_admin';
  licenseFile?: File | null;
}

interface ForgotPasswordData {
  email: string;
}

interface VerifyCodeData {
  email: string;
  code: string;
}

interface ResetPasswordData {
  email: string;
  code: string;
  password: string;
}
```

`authService.register()` serializes `email`, `name`, `password`, optional `role`, and optional file under the multipart field name `license`. It does not send frontend-only confirmation or terms fields.

`AuthResponse` contains `user`, `accessToken`, and `refreshToken`. `User` contains identity and role fields plus optional merchant, license, avatar, active-state, status, and creation-time properties. The interface currently contains both camelCase and snake_case compatibility properties for some fields.

---

## 5. Service Response Types

```typescript
interface MessageResponse {
  message: string;
}
```

`authService.login()` and `authService.register()` return an `AuthResponse` from the API's `data` envelope. Forgot Password, Verify Code, and Reset Password return a `MessageResponse`. Verify Code and Reset Password pass the email and code in JSON request bodies; the frontend page-to-page navigation carries these values using React Router location state.

---

## 6. Current Backend Auth Response Fields

The auth service constructs user response objects with fields including `id`, `email`, `name`, `role`, `avatar`, `avatarUrl`, `merchantId`, `licenseStatus`, `licenseUrl`, `isActive`, `is_active`, `status`, and `createdAt`. Some fields are conditional on merchant profile presence or endpoint. Treat the actual service return objects as authoritative; no single strict response DTO in this module currently guarantees all fields on every endpoint.

---

## 7. Cross-References

| Related document | Purpose |
|---|---|
| [DD SignUp/Login 02](./DD_SignUp_Login_02_FRONTEND_Page.md) | UI form behavior |
| [DD SignUp/Login 03](./DD_SignUp_Login_03_API_ENDPOINTS.md) | Endpoint request/response use |
| [DD SignUp/Login 05](./DD_SignUp_Login_05_BUSINESS_LOGIC.md) | Validation and processing rules |
