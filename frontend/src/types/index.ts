export type { ApiResponse, PaginatedResponse, ApiError } from './api.types'
export type { User, LoginCredentials, RegisterData, AuthResponse } from './auth.types'

export interface ProductFilters {
  search?: string
  category?: string
  minPrice?: number
  maxPrice?: number
  sortBy?: 'price' | 'name' | 'rating'
  order?: 'asc' | 'desc'
  page?: number
  limit?: number
}
