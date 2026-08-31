import apiClient from '@/lib/api-client'
import type { Profile, UpdateProfileData, ChangePasswordData } from '@/types/profile.types'

function normalizeProfile(raw: any): Profile {
  return {
    ...raw,
    avatar: raw.avatar || raw.avatarUrl || undefined,
  }
}

export const profileService = {
  getProfile: async (): Promise<Profile> => {
    const response = await apiClient.get<{ data: any }>('/users/me')
    return normalizeProfile(response.data.data)
  },

  updateProfile: async (data: UpdateProfileData): Promise<Profile> => {
    const response = await apiClient.patch<{ data: any }>('/users/me', data)
    return normalizeProfile(response.data.data)
  },

  changePassword: async (data: ChangePasswordData): Promise<{ message: string }> => {
    const response = await apiClient.post<{ data: { message: string } }>('/auth/change-password', data)
    return response.data.data
  },
}
