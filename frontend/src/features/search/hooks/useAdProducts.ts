import { useQuery } from '@tanstack/react-query'
import { productService, type ProductDetail } from '@/features/buyer/products/services/product.service'

export type AdProductMap = Record<string, ProductDetail>

function normalizeSkus(skus: Array<string | null | undefined>): string[] {
  const unique = new Set<string>()
  for (const sku of skus) {
    const trimmed = sku?.trim()
    if (trimmed) unique.add(trimmed)
  }
  return Array.from(unique).sort()
}

export function useAdProducts(skus: Array<string | null | undefined>) {
  const skuKeys = normalizeSkus(skus)

  return useQuery<AdProductMap>({
    queryKey: ['ads', 'products', skuKeys],
    enabled: skuKeys.length > 0,
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: async () => {
      const entries = await Promise.all(
        skuKeys.map(async (sku) => {
          try {
            return [sku, await productService.getDetail(sku)] as const
          } catch {
            return [sku, null] as const
          }
        }),
      )

      return entries.reduce<AdProductMap>((map, [sku, product]) => {
        if (product) map[sku] = product
        return map
      }, {})
    },
  })
}
