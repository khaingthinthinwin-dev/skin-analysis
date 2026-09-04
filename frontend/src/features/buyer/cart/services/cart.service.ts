import apiClient from '@/lib/api-client'

export interface CartItem {
  id: string
  productId: string
  quantity: number
  name?: string
  price?: number
  imageUrl?: string
}

export interface Cart {
  id: string
  items: CartItem[]
  totalItems: number
  subtotal: number
}

export interface AddToCartData {
  productId: string
  quantity: number
}

interface ApiResponse<T> {
  data: T
  statusCode: number
  message?: string
}

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const res = await promise
  return res.data?.data ?? (res.data as unknown as T)
}

export const cartService = {
  addItem(data: AddToCartData): Promise<Cart> {
    return unwrap(apiClient.post('/cart/items', data))
  },
}
