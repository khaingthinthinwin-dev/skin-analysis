import apiClient from '@/lib/api-client'
import type { LoginCredentials, RegisterData, AuthResponse, User } from '@/types/auth.types'

export const authService = {
  login: async (data: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', data)
    return response.data
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    // Create FormData for multipart upload
    const formData = new FormData()
    formData.append('email', data.email)
    formData.append('name', data.name)
    formData.append('password', data.password)
    if (data.role) {
      formData.append('role', data.role)
    }
    if (data.licenseFile) {
      formData.append('license', data.licenseFile)
    }

    const response = await apiClient.post<AuthResponse>('/auth/register', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  verifyToken: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/verify')
    return response.data
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout')
  },
}
