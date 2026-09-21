import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/services/queryKeys'
import { promotionService } from '@/services/promotion.service'
import type {
  PromotionQueryParams,
  CreatePromotionData,
  UpdatePromotionData,
} from '@/types/promotion.types'

function isClientError(error: unknown): boolean {
  const axiosError = error as { response?: { status?: number } }
  const status = axiosError?.response?.status
  return typeof status === 'number' && status >= 400 && status < 500
}

function isNetworkError(error: unknown): boolean {
  const axiosError = error as { code?: string; response?: unknown }
  return !axiosError?.response && !!axiosError?.code
}

export function getPromotionErrorInfo(error: unknown): {
  type: 'network' | 'forbidden' | 'not_found' | 'server' | 'unknown'
  message: string
} {
  if (isNetworkError(error)) {
    return { type: 'network', message: 'Network error. Please check your connection and try again.' }
  }

  const axiosError = error as { response?: { status?: number; data?: { message?: string | string[] } } }
  const status = axiosError?.response?.status
  const backendMessage = Array.isArray(axiosError?.response?.data?.message)
    ? axiosError.response.data.message.join(', ')
    : axiosError?.response?.data?.message

  switch (status) {
    case 403:
      return {
        type: 'forbidden',
        message: backendMessage || 'You do not have permission to view promotions.',
      }
    case 404:
      return {
        type: 'not_found',
        message: backendMessage || 'Merchant profile not found. Please contact support.',
      }
    default:
      if (typeof status === 'number' && status >= 500) {
        return { type: 'server', message: backendMessage || 'Server error. Please try again later.' }
      }
      return { type: 'unknown', message: backendMessage || 'Failed to load promotions. Please try again.' }
  }
}

export function usePromotions(params?: PromotionQueryParams) {
  return useQuery({
    queryKey: queryKeys.merchantPromotions.list(params),
    queryFn: () => promotionService.getPromotions(params),
    retry: (failureCount, error) => {
      if (isClientError(error) || isNetworkError(error)) {
        return false
      }
      return failureCount < 2
    },
  })
}

export function usePromotion(id: string) {
  return useQuery({
    queryKey: queryKeys.merchantPromotions.detail(id),
    queryFn: () => promotionService.getPromotionById(id),
    enabled: !!id,
  })
}

export function useCreatePromotion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePromotionData) => promotionService.createPromotion(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.merchantPromotions.all })
    },
  })
}

export function useUpdatePromotion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePromotionData }) =>
      promotionService.updatePromotion(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.merchantPromotions.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.merchantPromotions.detail(id) })
    },
  })
}

export function useDeletePromotion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => promotionService.deletePromotion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.merchantPromotions.all })
    },
  })
}

export function useTogglePromotionActive() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => promotionService.toggleActive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.merchantPromotions.all })
    },
  })
}
