import { useQuery } from '@tanstack/react-query';
import type { AdminOrderFilterFormData } from '../schemas/orderFilters.schema';
import { getAdminOrders } from '../services/adminOrderService';
import type { AdminOrderListResponseDto } from '../types/adminOrderInsights.types';

export function useAdminOrders(filters: AdminOrderFilterFormData) {
  return useQuery<AdminOrderListResponseDto, Error>({
    queryKey: ['adminOrders', filters],
    queryFn: () => getAdminOrders(filters),
    placeholderData: (previousData) => previousData,
  });
}
