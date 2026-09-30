import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdContentPayload, merchantAdService } from '../services/advertisement.service';

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
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const allAdsQuery = useQuery({
    queryKey: ['merchant', 'ads', 'all'],
    queryFn: () => merchantAdService.getAllAds(),
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const packagesQuery = useQuery({
    queryKey: ['merchant', 'ads', 'packages'],
    queryFn: () => merchantAdService.getPackages(),
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const selectPackage = useMutation({
    mutationFn: (packageId: string) => merchantAdService.selectPackage(packageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant', 'ads'] });
    },
  });

  const uploadContent = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdContentPayload }) =>
      merchantAdService.uploadContent(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant', 'ads'] });
    },
  });

  const updateContent = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdContentPayload }) =>
      merchantAdService.updateContent(id, payload),
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
    // Optimistically flip the switch so the UI reacts immediately; the
    // invalidate below confirms with fresh server data.
    onMutate: async ({ id, isActive }) => {
      await queryClient.cancelQueries({ queryKey: ['merchant', 'ads'] });
      const previous = queryClient.getQueriesData({
        queryKey: ['merchant', 'ads'],
      });
      queryClient.setQueriesData(
        { queryKey: ['merchant', 'ads'] },
        (old: unknown) => {
          if (!old || typeof old !== 'object') return old;
          const cached = old as { data?: Array<{ id: string; isActive: boolean }> };
          if (!Array.isArray(cached.data)) return old;
          return {
            ...cached,
            data: cached.data.map((ad) =>
              ad.id === id ? { ...ad, isActive } : ad,
            ),
          };
        },
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) {
        for (const [key, value] of context.previous) {
          queryClient.setQueryData(key, value);
        }
      }
    },
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
