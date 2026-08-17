import type { UserRole } from '@/types/auth.types'

export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Cosmetics Finder'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'

export const TOKEN_KEYS = {
  ACCESS: 'accessToken',
  REFRESH: 'refreshToken',
} as const

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  UNAUTHORIZED: '/unauthorized',
  ABOUT: '/about',
  DASHBOARD: '/dashboard',
  PROFILE: '/dashboard/profile',
  SETTINGS: '/dashboard/settings',
  MERCHANT_DASHBOARD: '/merchant/dashboard',
  ADMIN_DASHBOARD: '/admin/dashboard',
} as const

export function getDashboardRoute(role: UserRole): string {
  switch (role) {
    case 'merchant':
      return ROUTES.MERCHANT_DASHBOARD
    case 'admin':
    case 'super_admin':
      return ROUTES.ADMIN_DASHBOARD
    case 'buyer':
    default:
      return ROUTES.HOME
  }
}

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'my', label: 'မြန်မာ' },
  { code: 'ja', label: '日本語' },
] as const

export const THEME_OPTIONS = ['light', 'dark', 'system'] as const
