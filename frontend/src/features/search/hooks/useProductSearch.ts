import { useSearchParams as useReactRouterSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { searchParamsSchema, type SearchParams } from '@/schemas/search.schema'
import { productService } from '../services/product.service'

export function useProductSearch() {
  const [searchParams, setSearchParams] = useReactRouterSearchParams()

  const parsedParams = useMemo(() => {
    const raw = Object.fromEntries(searchParams.entries())
    return searchParamsSchema.parse(raw)
  }, [searchParams])

  const query = useQuery({
    queryKey: ['products', parsedParams] as const,
    queryFn: () => productService.search(parsedParams),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  })

  const updateParams = (updates: Partial<SearchParams>) => {
    const next = { ...parsedParams, ...updates, page: updates.page ?? 1 }
    setSearchParams(serializeParams(next))
  }

  return {
    ...query,
    params: parsedParams,
    updateParams,
  }
}

function serializeParams(params: SearchParams): Record<string, string> {
  const entries: [string, string][] = []
  if (params.q) entries.push(['q', params.q])
  if (params.categoryId) entries.push(['categoryId', params.categoryId])
  if (params.skinTypes.length) entries.push(['skinTypes', params.skinTypes.join(',')])
  if (params.ingredients.length) entries.push(['ingredients', params.ingredients.join(',')])
  if (params.tags.length) entries.push(['tags', params.tags.join(',')])
  if (params.minPrice !== undefined) entries.push(['minPrice', String(params.minPrice)])
  if (params.maxPrice !== undefined) entries.push(['maxPrice', String(params.maxPrice)])
  if (params.rating !== undefined) entries.push(['rating', String(params.rating)])
  if (params.sort !== 'createdAt') entries.push(['sort', params.sort])
  if (params.order !== 'desc') entries.push(['order', params.order])
  if (params.page > 1) entries.push(['page', String(params.page)])
  if (params.limit !== 20) entries.push(['limit', String(params.limit)])
  return Object.fromEntries(entries)
}
