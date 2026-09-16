import { useQuery } from '@tanstack/react-query'
import { advertisementService } from '../services/advertisement.service'
import type { RevenueAnalyticsQuery } from '@/types/admin-ad-management'

export function useRevenueAnalytics(params: RevenueAnalyticsQuery) {
  return useQuery({
    queryKey: ['analytics', params],
    queryFn: () => advertisementService.getRevenueAnalytics(params),
    staleTime: 30_000,
  })
}