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
  role?: 'buyer' | 'merchant'
  licenseFile?: File | null
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}