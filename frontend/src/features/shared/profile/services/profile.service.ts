import apiClient from '@/lib/api-client'
import type { Profile, UpdateProfileData, ChangePasswordData } from '@/types/profile.types'
import type { UserRole, LicenseStatus } from '@/types/auth.types'

interface ResubmitLicenseResponse {
  id: string
  licenseStatus: LicenseStatus
  licenseUrl: string
  updatedAt: string
}

interface ProfileResponseData {
  id: string
  email: string
  name: string
  role: UserRole
  avatar?: string
  avatarUrl?: string
  phone?: string
  emailVerified?: boolean
  licenseUrl?: string | null
  licenseStatus?: LicenseStatus
  createdAt: string
  updatedAt?: string
}

function normalizeProfile(raw: ProfileResponseData): Profile {
  return {
    ...raw,
    avatar: raw.avatar || raw.avatarUrl || undefined,
  }
}

export const profileService = {
  getProfile: async (): Promise<Profile> => {
    const response = await apiClient.get<{ data: ProfileResponseData }>('/users/me')
    return normalizeProfile(response.data.data)
  },

  updateProfile: async (data: UpdateProfileData): Promise<Profile> => {
    const response = await apiClient.patch<{ data: ProfileResponseData }>('/users/me', data)
    return normalizeProfile(response.data.data)
  },

  resubmitLicense: async (file: File): Promise<ResubmitLicenseResponse> => {
    const formData = new FormData()
    formData.append('license', file)
    const response = await apiClient.patch<{ data: ResubmitLicenseResponse }>('/auth/resubmit-license', formData)
    return response.data.data
  },

  changePassword: async (data: ChangePasswordData): Promise<{ message: string }> => {
    const response = await apiClient.post<{ data: { message: string } }>('/auth/change-password', data)
    return response.data.data
  },
}
