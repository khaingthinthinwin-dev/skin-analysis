import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { advertisementService } from '../services/advertisement.service'
import type {
  AdminAdListQuery,
  AdminBulkApproveInput,
  AdminBulkRejectInput,
  AdminRejectInput,
} from '@/types/admin-ad-management'

export function useAdminAds(params?: AdminAdListQuery) {
  const queryClient = useQueryClient()

  const refreshAds = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-ads'] })
    queryClient.invalidateQueries({ queryKey: ['admin-ads', 'pending-count'] })
  }

  const adsQuery = useQuery({
    queryKey: ['admin-ads', params],
    queryFn: () => advertisementService.listAds(params),
    staleTime: 30_000,
  })

  const pendingCountQuery = useQuery({
    queryKey: ['admin-ads', 'pending-count'],
    queryFn: () => advertisementService.listAds({ status: 'pending', page: 1, limit: 1 }),
    select: (data) => data.meta.total,
    staleTime: 30_000,
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => advertisementService.approveAd(id),
    onSuccess: refreshAds,
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, rejection_reason }: { id: string } & AdminRejectInput) =>
      advertisementService.rejectAd(id, { rejection_reason }),
    onSuccess: refreshAds,
  })

  const bulkApproveMutation = useMutation({
    mutationFn: (input: AdminBulkApproveInput) => advertisementService.bulkApproveAds(input),
    onSuccess: refreshAds,
  })

  const bulkRejectMutation = useMutation({
    mutationFn: (input: AdminBulkRejectInput) => advertisementService.bulkRejectAds(input),
    onSuccess: refreshAds,
  })

  return {
    adsQuery,
    pendingCountQuery,
    approveMutation,
    rejectMutation,
    bulkApproveMutation,
    bulkRejectMutation,
    refreshAds,
  }
}