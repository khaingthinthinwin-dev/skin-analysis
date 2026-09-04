import apiClient from '@/lib/api-client'

interface ApiResponse<T> {
  data: T
  statusCode: number
  message?: string
}

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const res = await promise
  return res.data?.data ?? (res.data as unknown as T)
}

export interface WishlistMutationResult {
  id: string
  productId: string
  [key: string]: unknown
}

export const wishlistService = {
  add(productId: string): Promise<WishlistMutationResult> {
    return unwrap(apiClient.post(`/wishlist/${productId}`))
  },
}
