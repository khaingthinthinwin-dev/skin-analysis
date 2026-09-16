import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { merchantAdService } from '../services/advertisement.service';

export function useAdvertisements(params?: {
  status?: 'active' | 'inactive' | 'expired';
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  search?: string;
  page?: number;
  limit?: number;
}) {
  const queryClient = useQueryClient();

  const adsQuery = useQuery({
    queryKey: ['merchant', 'ads', params],
    queryFn: () => merchantAdService.getAds(params),
  });

  const allAdsQuery = useQuery({
    queryKey: ['merchant', 'ads', 'all'],
    queryFn: () => merchantAdService.getAllAds(),
  });

  const packagesQuery = useQuery({
    queryKey: ['merchant', 'ads', 'packages'],
    queryFn: () => merchantAdService.getPackages(),
  });

  const selectPackage = useMutation({
    mutationFn: (packageId: string) => merchantAdService.selectPackage(packageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant', 'ads'] });
    },
  });

  const uploadContent = useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) =>
      merchantAdService.uploadContent(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant', 'ads'] });
    },
  });

  const updateContent = useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) =>
      merchantAdService.updateContent(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant', 'ads'] });
    },
  });

  const pay = useMutation({
    mutationFn: ({ id, paymentReference }: { id: string; paymentReference?: string }) =>
      merchantAdService.pay(id, paymentReference),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant', 'ads'] });
    },
  });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      merchantAdService.toggle(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant', 'ads'] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => merchantAdService.deleteAd(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant', 'ads'] });
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['merchant', 'ads'] });
    queryClient.invalidateQueries({ queryKey: ['merchant', 'ads', 'all'] });
    queryClient.invalidateQueries({ queryKey: ['merchant', 'ads', 'packages'] });
  };

  return {
    adsQuery,
    allAdsQuery,
    packagesQuery,
    selectPackage,
    uploadContent,
    updateContent,
    pay,
    toggle,
    remove,
    refresh,
  };
}
