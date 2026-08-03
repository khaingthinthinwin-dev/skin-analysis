import apiClient from '@/lib/api-client'
import type { LoginCredentials, RegisterData, AuthResponse, User } from '@/types/auth.types'

export const authService = {
  login: async (data: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', data)
    return response.data
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', data)
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
