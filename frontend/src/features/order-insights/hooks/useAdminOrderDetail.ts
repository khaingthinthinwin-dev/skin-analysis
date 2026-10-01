import { useQuery } from '@tanstack/react-query';
import { getAdminOrderDetail } from '../services/adminOrderService';
import type { AdminOrderDetailDto } from '../types/adminOrderInsights.types';

export function useAdminOrderDetail(orderId: string | undefined) {
  return useQuery<AdminOrderDetailDto, Error>({
    queryKey: ['adminOrderDetail', orderId],
    queryFn: () => getAdminOrderDetail(orderId as string),
    enabled: Boolean(orderId),
    retry: false,
  });
}
