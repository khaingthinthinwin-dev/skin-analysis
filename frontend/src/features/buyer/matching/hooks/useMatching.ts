import { useQuery } from '@tanstack/react-query'
import { matchingService } from '../services/matching.service'
import type { MatchQueryParams } from '@/schemas/matching.schema'

export function usePersonalizedRecommendations(params: MatchQueryParams) {
  // TODO: Implement TanStack Query hook
  return useQuery({
    queryKey: ['recommendations', 'personalized', params],
    queryFn: () => matchingService.getPersonalized(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
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

export function useAdPanel() {
  // TODO: Implement TanStack Query hook
  return useQuery({
    queryKey: ['ads', 'panel'],
    queryFn: () => matchingService.getAdPanel(),
    staleTime: 60 * 1000, // 1 minute
  })
}
