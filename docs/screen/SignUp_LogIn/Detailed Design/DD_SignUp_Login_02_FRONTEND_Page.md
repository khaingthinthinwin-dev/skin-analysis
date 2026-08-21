# DD_AUTH_02 — Frontend Page (Login / Register / Password Reset)

> **Doc ID:** SKM-DD-AUTH-02 | **Version:** 2.1 | **Status:** Released  
> **Last Updated:** 2026-08-21

---

## 1. Overview

The Authentication pages consist of four main screens: `Login`, `Register`, `ForgotPassword`, and `ResetPassword`. They share a common layout with a tabbed interface for switching between login and registration forms. The Register form includes conditional fields for Merchant role (license upload). Forgot/Reset Password screens provide password recovery functionality.

- **File Path (Login):** `frontend/src/pages/Login.tsx`
- **File Path (Register):** `frontend/src/pages/Register.tsx`
- **File Path (ForgotPassword):** `frontend/src/pages/ForgotPassword.tsx`
- **File Path (ResetPassword):** `frontend/src/pages/ResetPassword.tsx`
- **Route (Login):** `/login`
- **Route (Register):** `/register`
- **Route (ForgotPassword):** `/forgot-password`
- **Route (ResetPassword):** `/reset-password?token=xxx`
- **Shared Layout:** `AuthLayout.tsx` (centered card with branding)

---

## 2. Layout Structure

Both pages use a centered card layout with the Cosmetics Finder branding. The design is responsive with a max-width of 400px on desktop.

### 2.1 Login Page Layout

```
┌────────────────────────────────────────────────────────┐
│ Header (Language Toggle EN/JA/MY | Theme Toggle)       │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │                 [Logo]                           │  │
│  │           Cosmetics Finder                       │  │
│  │                                                  │  │
│  │  ┌──────────────────────────────────────────┐    │  │
│  │  │ Email Label                              │    │  │
│  │  │ [Email Input]                            │    │  │
│  │  │                                          │    │  │
│  │  │ Password Label                           │    │  │
│  │  │ [Password Input] [Show/Hide]             │    │  │
│  │  │                                          │    │  │
│  │  │ [    Sign In    ] (Primary)              │    │  │
│  │  │                                          │    │  │
│  │  │ Don't have an account?                   │    │  │
│  │  │ Sign Up ->                               │    │  │
│  │  └──────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 2.2 Register Page Layout

```
┌────────────────────────────────────────────────────────┐
│ Header (Language Toggle EN/JA/MY | Theme Toggle)       │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │                 [Logo]                           │  │
│  │           Cosmetics Finder                       │  │
│  │                                                  │  │
│  │  ┌──────────────────────────────────────────┐    │  │
│  │  │ Full Name Label                          │    │  │
│  │  │ [Full Name Input]                        │    │  │
│  │  │                                          │    │  │
│  │  │ Email Label                              │    │  │
│  │  │ [Email Input]                            │    │  │
│  │  │                                          │    │  │
│  │  │ Password Label                           │    │  │
│  │  │ [Password Input] [Show/Hide]             │    │  │
│  │  │ [||||||____] Password Strength           │    │  │
│  │  │ * 8+ chars  * Uppercase  * Lowercase     │    │  │
│  │  │ * Number    * Special char               │    │  │
│  │  │                                          │    │  │
│  │  │ Confirm Password Label                   │    │  │
│  │  │ [Confirm Password Input]                 │    │  │
│  │  │                                          │    │  │
│  │  │ I am a:                                  │    │  │
│  │  │ (o) Buyer                                │    │  │
│  │  │ ( ) Merchant                             │    │  │
│  │  │                                          │    │  │
│  │  │ [Shop Name - Merchant Only]              │    │  │
│  │  │ [Shop Name Input]                        │    │  │
│  │  │                                          │    │  │
│  │  │ [Business License - Merchant Only]       │    │  │
│  │  │ [Drag & Drop or Click to Upload]         │    │  │
│  │  │ PDF only (max 10MB) - license.pdf        │    │  │
│  │  │                                          │    │  │
│  │  │ [ ] I agree to Terms of Service          │    │  │
│  │  │                                          │    │  │
│  │  │ [ Create Account ] (Primary)             │    │  │
│  │  │                                          │    │  │
│  │  │ Already have an account?                 │    │  │
│  │  │ Sign In ->                               │    │  │
│  │  └──────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 2.3 Forgot Password Page Layout

```
┌────────────────────────────────────────────────────────┐
│ Header (Language Toggle EN/JA/MY | Theme Toggle)       │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │                 [Logo]                           │  │
│  │           Cosmetics Finder                       │  │
│  │                                                  │  │
│  │  ┌──────────────────────────────────────────┐    │  │
│  │  │ Forgot your password?                    │    │  │
│  │  │ Enter your email and we'll send you a    │    │  │
│  │  │ reset link.                              │    │  │
│  │  │                                          │    │  │
│  │  │ Email Label                              │    │  │
│  │  │ [Email Input]                            │    │  │
│  │  │                                          │    │  │
│  │  │ [  Send Reset Link  ] (Primary)          │    │  │
│  │  │                                          │    │  │
│  │  │ Back to Login ->                         │    │  │
│  │  └──────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Success State:**
```
┌────────────────────────────────────────────────────────┐
│ Header (Language Toggle EN/JA/MY | Theme Toggle)       │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │                 [Logo]                           │  │
│  │           Cosmetics Finder                       │  │
│  │                                                  │  │
│  │  ┌──────────────────────────────────────────┐    │  │
│  │  │ If an account exists with that email,    │    │  │
│  │  │ you'll receive a password reset link     │    │  │
│  │  │ shortly.                                 │    │  │
│  │  │                                          │    │  │
│  │  │ Back to Login ->                         │    │  │
│  │  └──────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 2.4 Reset Password Page Layout

```
┌────────────────────────────────────────────────────────┐
│ Header (Language Toggle EN/JA/MY | Theme Toggle)       │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │                 [Logo]                           │  │
│  │           Cosmetics Finder                       │  │
│  │                                                  │  │
│  │  ┌──────────────────────────────────────────┐    │  │
│  │  │ Reset your password                      │    │  │
│  │  │ Enter your new password below.           │    │  │
│  │  │                                          │    │  │
│  │  │ New Password Label                       │    │  │
│  │  │ [New Password Input] [Show/Hide]         │    │  │
│  │  │ [||||||____] Password Strength           │    │  │
│  │  │ * 8+ chars  * Uppercase  * Lowercase     │    │  │
│  │  │ * Number    * Special char               │    │  │
│  │  │                                          │    │  │
│  │  │ Confirm Password Label                   │    │  │
│  │  │ [Confirm Password Input]                 │    │  │
│  │  │                                          │    │  │
│  │  │ [ Reset Password ] (Primary)             │    │  │
│  │  │                                          │    │  │
│  │  │ Back to Login ->                         │    │  │
│  │  └──────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Success State:**
```
┌────────────────────────────────────────────────────────┐
│ Header (Language Toggle EN/JA/MY | Theme Toggle)       │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │                 [Logo]                           │  │
│  │           Cosmetics Finder                       │  │
│  │                                                  │  │
│  │  ┌──────────────────────────────────────────┐    │  │
│  │  │ Your password has been reset             │    │  │
│  │  │ successfully.                            │    │  │
│  │  │                                          │    │  │
│  │  │ Back to Login ->                         │    │  │
│  │  └──────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 3. Form State & Validation (React Hook Form + Zod)

Both forms use `react-hook-form` with `zodResolver` for schema validation.

### 3.1 Login Form Hook

```typescript
// frontend/src/features/auth/hooks/useLoginForm.ts
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormData } from '../schemas/auth.schema';

export function useLoginForm() {
  const methods = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onChange',
  });

  return { methods };
}
```

### 3.2 Register Form Hook

```typescript
// frontend/src/features/auth/hooks/useRegisterForm.ts
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterFormData } from '../schemas/auth.schema';

export function useRegisterForm() {
  const methods = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'buyer',
      shopName: '',
      license: undefined,
      agreeToTerms: false,
    },
    mode: 'onChange',
  });

  const selectedRole = methods.watch('role');

  return { methods, selectedRole };
}
```

### 3.3 Forgot Password Form Hook

```typescript
// frontend/src/features/auth/hooks/useForgotPasswordForm.ts
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '../schemas/auth.schema';

export function useForgotPasswordForm() {
  const methods = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
    mode: 'onChange',
  });

  return { methods };
}
```

### 3.4 Reset Password Form Hook

```typescript
// frontend/src/features/auth/hooks/useResetPasswordForm.ts
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema, type ResetPasswordFormData } from '../schemas/auth.schema';

export function useResetPasswordForm() {
  const methods = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
    mode: 'onChange',
  });

  return { methods };
}
```

### 3.5 Zod Validation Schema

```typescript
// frontend/src/features/auth/schemas/auth.schema.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required').min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: z.string().min(1, 'Email is required').email('Invalid email address').max(255),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least 1 uppercase letter')
    .regex(/[a-z]/, 'Must contain at least 1 lowercase letter')
    .regex(/[0-9]/, 'Must contain at least 1 number')
    .regex(/[@$!%*?&]/, 'Must contain at least 1 special character'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  role: z.enum(['buyer', 'merchant'], { required_error: 'Please select a role' }),
  shopName: z.string().max(255).optional(),
  license: z.instanceof(File).optional(),
  agreeToTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must agree to the Terms of Service' }),
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
}).refine(
  (data) => data.role !== 'merchant' || (data.shopName && data.shopName.trim().length >= 1),
  { message: 'Shop name is required for merchant registration', path: ['shopName'] }
).refine(
  (data) => data.role !== 'merchant' || data.license instanceof File,
  { message: 'Business license is required for merchant registration', path: ['license'] }
);

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least 1 uppercase letter')
    .regex(/[a-z]/, 'Must contain at least 1 lowercase letter')
    .regex(/[0-9]/, 'Must contain at least 1 number')
    .regex(/[@$!%*?&]/, 'Must contain at least 1 special character'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
```

---

## 4. Sub-Components

### 4.1 LoginForm Component

- **File Path:** `frontend/src/features/auth/components/LoginForm.tsx`
- Uses `useLoginForm` hook
- Renders email and password fields with validation
- Shows loading spinner on submit button during API call
- Displays error toast on login failure

### 4.2 RegisterForm Component

- **File Path:** `frontend/src/features/auth/components/RegisterForm.tsx`
- Uses `useRegisterForm` hook
- Renders all registration fields with conditional shop name and license upload
- Shows PasswordStrengthIndicator component
- Shows Shop Name field and LicenseUpload component only when role = 'merchant'

### 4.3 PasswordStrengthIndicator Component

- **File Path:** `frontend/src/features/auth/components/PasswordStrengthIndicator.tsx`
- Visual bar showing password strength (Weak/Fair/Strong/Very Strong)
- Checklist of password requirements with checkmarks

### 4.4 LicenseUpload Component

- **File Path:** `frontend/src/features/auth/components/LicenseUpload.tsx`
- Drag & drop zone for PDF file upload
- File name display and remove button
- File type validation (PDF only)
- File size validation (max 10MB)
- File name validation (must be license.pdf)

### 4.5 AuthTabs Component

- **File Path:** `frontend/src/features/auth/components/AuthTabs.tsx`
- Tab switcher between Login and Register forms
- Preserves form state when switching tabs

### 4.6 ForgotPasswordForm Component

- **File Path:** `frontend/src/features/auth/components/ForgotPasswordForm.tsx`
- Uses `useForgotPasswordForm` hook
- Renders email field with validation
- Shows loading spinner on submit button during API call
- On success, replaces form with success message and "Back to Login" link

### 4.7 ResetPasswordForm Component

- **File Path:** `frontend/src/features/auth/components/ResetPasswordForm.tsx`
- Uses `useResetPasswordForm` hook
- Renders new password and confirm password fields with validation
- Shows PasswordStrengthIndicator component
- Extracts `token` from URL query parameters
- On success, shows success message and "Back to Login" link
- If token is invalid/expired, shows error and redirects to `/forgot-password`

---

## 5. Action Buttons & Handlers

### 5.1 Login Submit

- **Button Type:** `submit`
- **Validation:** Uses Zod loginSchema
- **Action:**
  1. Call `authService.login(email, password)`
  2. Store access token in memory (not localStorage)
  3. Set refresh token cookie via httpOnly
  4. Fetch user profile via `authService.verify()`
  5. Update AuthContext with user data
  6. Redirect by role: buyer -> `/`, merchant -> `/merchant/dashboard`

### 5.2 Register Submit

- **Button Type:** `submit`
- **Validation:** Uses Zod registerSchema
- **Action:**
  1. If role = merchant, validate shop name (1-255 characters) and license file (PDF, named license.pdf, max 10MB)
  2. Call `authService.register(formData)` (includes name, email, password, role, and shopName/license if merchant)
  3. If role = merchant, upload license file and map shop name via `authService.register` or `authService.uploadLicense` (creates `merchants` record with shop name and `license_status='pending'`)
  4. Show success toast: "Account created! Please sign in."
  5. Redirect to `/login` with success message

### 5.3 Password Visibility Toggle

- **Button Type:** `button`
- **Action:** Toggle `showPassword` state between text/password input types
- **Icon:** Eye (hidden) / EyeOff (visible)

### 5.4 Forgot Password Submit

- **Button Type:** `submit`
- **Validation:** Uses Zod forgotPasswordSchema
- **Action:**
  1. Call `authService.forgotPassword(email)`
  2. On success, replace form with success message: "If an account exists with that email, you'll receive a password reset link shortly."
  3. Show "Back to Login" link

### 5.5 Reset Password Submit

- **Button Type:** `submit`
- **Validation:** Uses Zod resetPasswordSchema
- **Action:**
  1. Extract `token` from URL query parameters
  2. If no token, redirect to `/login`
  3. Call `authService.resetPassword(token, password)`
  4. On success, show success message: "Your password has been reset successfully."
  5. Show "Back to Login" link
  6. On error (invalid/expired token), show error and link to `/forgot-password`

### 5.6 Navigation Links

- **Forgot Password Link:** Navigates from `/login` to `/forgot-password`
- **Back to Login Link:** Navigates from `/forgot-password` or `/reset-password` to `/login`
- **Reset Password Page Load:** Extracts `token` from URL, redirects to `/login` if missing

---

## 6. Lookup Data

The Register form requires role options (hardcoded):

| Value | Label (EN) | Label (JA) | Description |
|-------|------------|------------|-------------|
| `buyer` | Buyer | 購入者 | Browse products, AI analysis, purchase |
| `merchant` | Merchant | 出品者 | Sell skincare products on the marketplace |

*Note: Admin and Super Admin roles cannot self-register; they are system-seeded or created/provisioned by an Admin/Super Admin.

---

## 7. Error Handling

### 7.1 Field-Level Errors

- Red border on invalid input
- Inline error message below the field
- Real-time validation on blur and change

### 7.2 Form-Level Errors

- Toast notification for API errors
- Generic message for login: "Invalid email or password"
- Specific message for registration: "Email already registered"
- Generic message for forgot password: Always show same message regardless of email existence (prevents email enumeration)
- Specific message for reset password: "Invalid or expired reset link. Please request a new one."

### 7.3 Loading States

- Spinner on submit buttons during API calls
- Disable form inputs during submission
- Prevent double submission

---

## 8. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_AUTH_01](./DD_SignUp_Login_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_AUTH_03](./DD_SignUp_Login_03_API_ENDPOINTS.md) | Backend REST API contract |
| [DD_AUTH_04](./DD_SignUp_Login_04_DTOS_AND_TYPES.md) | DTO and type definitions |
| [DD_AUTH_05](./DD_SignUp_Login_05_BUSINESS_LOGIC.md) | Backend business rules |
| [機能設計書_SignUp_Login](../機能設計書_SignUp_Login.md) | Full functional specification |
