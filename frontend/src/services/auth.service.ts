import apiClient from '@/lib/api-client'
import type {
  LoginCredentials,
  RegisterData,
  AuthResponse,
  User,
  ForgotPasswordData,
  ResetPasswordData,
  CreateAdminData,
  MessageResponse,
} from '@/types/auth.types'

export const authService = {
  login: async (data: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<{ data: AuthResponse }>('/auth/login', data)
    return response.data.data
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
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

    const response = await apiClient.post<{ data: AuthResponse }>('/auth/register', formData)
    return response.data.data
  },

  verifyToken: async (): Promise<User> => {
    const response = await apiClient.get<{ data: User }>('/auth/verify')
    return response.data.data
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout')
  },

  forgotPassword: async (data: ForgotPasswordData): Promise<MessageResponse> => {
    const response = await apiClient.post<{ data: MessageResponse }>('/auth/forgot-password', data)
    return response.data.data
  },

  resetPassword: async (data: ResetPasswordData): Promise<MessageResponse> => {
    const response = await apiClient.post<{ data: MessageResponse }>('/auth/reset-password', data)
    return response.data.data
  },

  createAdmin: async (data: CreateAdminData): Promise<User> => {
    const response = await apiClient.post<{ data: User }>('/auth/create-admin', data)
    return response.data.data
  },
}
