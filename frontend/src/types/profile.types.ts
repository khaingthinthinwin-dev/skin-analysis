import type { User } from '@/types/auth.types'

export interface Profile extends User {
  phone?: string | null
  emailVerified?: boolean
  updatedAt?: string
}

export interface UpdateProfileData {
  name?: string
  avatarUrl?: string
}

export interface ChangePasswordData {
  currentPassword: string
  newPassword: string
}

export interface ProfileResponse {
  user: Profile
}
