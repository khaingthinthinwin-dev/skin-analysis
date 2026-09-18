import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { advertisementService } from '../services/advertisement.service'
import type { CreateFeeSettingInput, EditFeeSettingInput } from '@/types/admin-ad-management'

export function useFeeSettings() {
  const queryClient = useQueryClient()

  const refreshFeeData = () => {
    queryClient.invalidateQueries({ queryKey: ['fee-settings'] })
    queryClient.invalidateQueries({ queryKey: ['fee-history'] })
  }

  const feeSettingsQuery = useQuery({
    queryKey: ['fee-settings'],
    queryFn: advertisementService.listFeeSettings,
    staleTime: 30_000,
  })

  const createMutation = useMutation({
    mutationFn: (input: CreateFeeSettingInput) => advertisementService.createFeeSetting(input),
    onSuccess: refreshFeeData,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditFeeSettingInput }) =>
      advertisementService.updateFeeSetting(id, data),
    onSuccess: refreshFeeData,
  })

  const deactivateMutation = useMutation({
    mutationFn: ({ id, change_reason }: { id: string; change_reason: string }) =>
      advertisementService.deactivateFeeSetting(id, { change_reason }),
    onSuccess: refreshFeeData,
  })

  return {
    feeSettingsQuery,
    createMutation,
    updateMutation,
    deactivateMutation,
    refreshFeeData,
  }
}