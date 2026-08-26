export type UserRole = 'buyer' | 'merchant' | 'admin' | 'super_admin'

export type LicenseStatus = 'pending' | 'approved' | 'rejected' | null

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  merchantId?: string | null
  avatar?: string
  licenseUrl?: string | null
  licenseStatus?: LicenseStatus
  createdAt: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  name: string
  email: string
  password: string
  role?: 'buyer' | 'merchant' | 'admin' | 'super_admin'
  licenseFile?: File | null
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}

export interface ForgotPasswordData {
  email: string
}

export interface ResetPasswordData {
  token: string
  password: string
}

export interface CreateAdminData {
  name: string
  email: string
  password: string
  role: 'admin' | 'super_admin'
}

export interface MessageResponse {
  message: string
}