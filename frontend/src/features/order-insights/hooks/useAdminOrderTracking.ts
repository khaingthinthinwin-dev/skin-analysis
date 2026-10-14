import { useQuery } from '@tanstack/react-query';
import { getAdminOrderTracking } from '../services/adminOrderService';
import type { AdminOrderTrackingDto } from '../types/adminOrderInsights.types';

export function useAdminOrderTracking(orderId: string | undefined) {
  return useQuery<AdminOrderTrackingDto, Error>({
    queryKey: ['adminOrderTracking', orderId],
    queryFn: () => getAdminOrderTracking(orderId as string),
    enabled: Boolean(orderId),
    retry: false,
  });
}
