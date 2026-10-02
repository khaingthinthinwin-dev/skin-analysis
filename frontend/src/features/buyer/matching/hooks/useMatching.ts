import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { matchingService } from '../services/matching.service'
import type { MatchQueryParams } from '@/schemas/matching.schema'

const PREFETCH_STALE_MS = 30_000

export function usePersonalizedRecommendations(params: MatchQueryParams, refreshKey = 0) {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['recommendations', 'personalized', params, refreshKey],
    queryFn: () => matchingService.getPersonalized(params),
    // Keep previous page visible while the next page loads; isFetching drives UI feedback.
    placeholderData: (prev) => prev,
    // Always revalidate on page change so data refreshes immediately on click.
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
  })

  // Warm adjacent pages so Next/Prev paint instantly, then revalidate via staleTime: 0.
  useEffect(() => {
    const totalPages = query.data?.meta.totalPages
    if (!totalPages || totalPages <= 1) return

    for (const page of [params.page - 1, params.page + 1]) {
      if (page < 1 || page > totalPages) continue
      const nextParams: MatchQueryParams = { ...params, page }
      void queryClient.prefetchQuery({
        queryKey: ['recommendations', 'personalized', nextParams, refreshKey],
        queryFn: () => matchingService.getPersonalized(nextParams),
        staleTime: PREFETCH_STALE_MS,
      })
    }
  }, [query.data, params, refreshKey, queryClient])

  return query
}

export function useSimilarProducts(productId: string) {
  // TODO: Implement TanStack Query hook
  return useQuery({
    queryKey: ['recommendations', 'similar', productId],
    queryFn: () => matchingService.getSimilar(productId),
    enabled: !!productId,
  })
}

export function useRecommendationHistory(page = 1, limit = 20) {
  // TODO: Implement TanStack Query hook
  return useQuery({
    queryKey: ['recommendations', 'history', page, limit],
    queryFn: () => matchingService.getHistory(page, limit),
  })
}

export function useAdPanel(placement = 'recommendation_page_banner') {
  // TODO: Implement TanStack Query hook
  return useQuery({
    queryKey: ['ads', 'panel', placement],
    queryFn: () => matchingService.getAdPanel(placement),
    staleTime: 60 * 1000, // 1 minute
  })
}
