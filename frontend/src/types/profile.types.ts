import type { User } from '@/types/auth.types'

export interface Profile extends User {
  phone?: string | null
  /** Shop address (merchants only — stored on the shop row) */
  address?: string | null
  emailVerified?: boolean
  updatedAt?: string
  roleCode?: string
}

export interface UpdateProfileData {
  name?: string
  avatarUrl?: string
  phone?: string
  address?: string
}

export interface ChangePasswordData {
  currentPassword: string
  newPassword: string
}

export interface ProfileResponse {
  user: Profile
}
