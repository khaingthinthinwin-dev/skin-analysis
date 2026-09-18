import { useQuery } from '@tanstack/react-query'
import { advertisementService } from '../services/advertisement.service'

export function useAdReview(id: string) {
  return useQuery({
    queryKey: ['admin-ads', id],
    queryFn: () => advertisementService.getAdDetail(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}