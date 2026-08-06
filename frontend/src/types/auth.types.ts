export interface User {
  id: string
  email: string
  name: string
  role: 'buyer' | 'merchant' | 'admin'
  avatar?: string
  licenseUrl?: string | null
  licenseStatus?: 'pending' | 'approved' | 'rejected' | null
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
