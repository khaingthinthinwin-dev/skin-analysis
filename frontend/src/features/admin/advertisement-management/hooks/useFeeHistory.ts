import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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

export function useDeleteFeeHistory() {
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: ({ ids }: { ids: string[] }) =>
      advertisementService.deleteFeeHistory(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-history'] })
    },
  })

  return { deleteMutation }
}