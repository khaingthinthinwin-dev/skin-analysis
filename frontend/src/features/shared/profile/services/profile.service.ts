import apiClient from '@/lib/api-client'
import type { Profile, UpdateProfileData, ChangePasswordData } from '../types/profile.types'

export const profileService = {
  getProfile: async (): Promise<Profile> => {
    const response = await apiClient.get<{ data: Profile }>('/users/me')
    return response.data.data
  },

  updateProfile: async (data: UpdateProfileData): Promise<Profile> => {
    const response = await apiClient.patch<{ data: Profile }>('/users/me', data)
    return response.data.data
  },

  changePassword: async (data: ChangePasswordData): Promise<{ message: string }> => {
    const response = await apiClient.post<{ data: { message: string } }>('/auth/change-password', data)
    return response.data.data
  },
}
