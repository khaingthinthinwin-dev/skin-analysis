import { useQuery } from '@tanstack/react-query'
import { adService } from '../services/ad.service'

export function useSponsoredAds(placement = 'search_top') {
  return useQuery({
    queryKey: ['ads', placement] as const,
    queryFn: () => adService.getByPlacement(placement),
    staleTime: 5 * 60 * 1000,
  })
}
