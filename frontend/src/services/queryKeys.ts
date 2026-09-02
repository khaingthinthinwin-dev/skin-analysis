import type { ProductFilters } from '@/types'
import type { ProductQueryParams } from '@/types/product.types'
import type { BuyerSearchParams } from '@/services/buyer-search.service'

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
    list: (params?: ProductQueryParams) =>
      [...queryKeys.merchantProducts.all, 'list', params] as const,
    detail: (id: string) => [...queryKeys.merchantProducts.all, id] as const,
  },
  buyerSearch: {
    all: ['buyerSearch'] as const,
    list: (params?: BuyerSearchParams) =>
      [...queryKeys.buyerSearch.all, 'list', params] as const,
    detail: (slug: string) => [...queryKeys.buyerSearch.all, 'detail', slug] as const,
  },
}
