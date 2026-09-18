import { useQuery } from '@tanstack/react-query'
import {
  advertisementService,
  type AdminAdFeeHistoryQuery,
} from '../services/advertisement.service'

export function useFeeHistory(params?: AdminAdFeeHistoryQuery) {
  return useQuery({
    queryKey: ['fee-history', params],
    queryFn: () => advertisementService.listFeeHistory(params),
    staleTime: 30_000,
  })
}