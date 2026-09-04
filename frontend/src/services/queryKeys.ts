import type { ProductFilters } from '@/types'
import type { ProductQueryParams } from '@/types/product.types'

export const queryKeys = {
  auth: {
    all: ['auth'] as const,
    user: () => [...queryKeys.auth.all, 'user'] as const,
  },
  users: {
    all: ['users'] as const,
    detail: (id: string) => [...queryKeys.users.all, id] as const,
  },
  products: {
    all: ['products'] as const,
    list: (filters: ProductFilters) => [...queryKeys.products.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.products.all, id] as const,
  },
  merchantProducts: {
    all: ['merchantProducts'] as const,
    list: (filters?: ProductQueryParams) => [...queryKeys.merchantProducts.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.merchantProducts.all, id] as const,
  },
  wishlist: {
    all: ['wishlist'] as const,
    items: () => [...queryKeys.wishlist.all, 'items'] as const,
  },
  cart: {
    all: ['cart'] as const,
    items: () => [...queryKeys.cart.all, 'items'] as const,
  },
}
