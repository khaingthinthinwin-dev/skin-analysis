import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { merchantAdService, CreateAdInput } from '../services/advertisement.service';

export function useMerchantAds(params?: { status?: string; page?: number; limit?: number }) {
  const queryClient = useQueryClient();

  const adsQuery = useQuery({
    queryKey: ['merchant', 'ads', params],
    queryFn: () => merchantAdService.getAds(params),
  });

  const createAdMutation = useMutation({
    mutationFn: (data: CreateAdInput) => merchantAdService.createAd(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant', 'ads'] });
    },
  });

  const updateAdMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateAdInput> }) =>
      merchantAdService.updateAd(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant', 'ads'] });
    },
  });

  const deleteAdMutation = useMutation({
    mutationFn: (id: string) => merchantAdService.deleteAd(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant', 'ads'] });
    },
  });

  return {
    adsQuery,
    createAdMutation,
    updateAdMutation,
    deleteAdMutation,
  };
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { advertisementService } from '../services/advertisement.service'
import type { AdListParams } from '../types'

export function useAdvertisements(params: AdListParams) {
  const queryClient = useQueryClient()
  const adsQuery = useQuery({
    queryKey: ['merchant-ads', params],
    queryFn: () => advertisementService.listAds(params),
    staleTime: 30_000,
  })
  const packagesQuery = useQuery({
    queryKey: ['merchant-ad-packages'],
    queryFn: advertisementService.listPackages,
    staleTime: 600_000,
  })
  const allAdsQuery = useQuery({
    queryKey: ['merchant-ads', 'all'],
    queryFn: () => advertisementService.listAds({ page: 1, limit: 100 }),
    staleTime: 30_000,
  })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['merchant-ads'] })
  const selectPackage = useMutation({ mutationFn: advertisementService.selectPackage, onSuccess: refresh })
  const uploadContent = useMutation({ mutationFn: ({ id, formData }: { id: string; formData: FormData }) => advertisementService.uploadContent(id, formData), onSuccess: refresh })
  const updateContent = useMutation({ mutationFn: ({ id, formData }: { id: string; formData: FormData }) => advertisementService.updateContent(id, formData), onSuccess: refresh })
  const pay = useMutation({ mutationFn: ({ id, paymentReference }: { id: string; paymentReference?: string }) => advertisementService.pay(id, paymentReference), onSuccess: refresh })
  const toggle = useMutation({ mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => advertisementService.toggle(id, isActive), onSuccess: refresh })
  const remove = useMutation({ mutationFn: advertisementService.remove, onSuccess: refresh })

  return { adsQuery, allAdsQuery, packagesQuery, selectPackage, uploadContent, updateContent, pay, toggle, remove, refresh }
}
