import { useQuery } from '@tanstack/react-query';
import { type OrderListFilterFormData } from '../schemas/orderFilters.schema';
import type { MerchantOrderListResponseDto } from '../types/merchantOrderInsights.types';
import { getMerchantOrders } from '../services/merchantOrderService';

/** Loads the server-scoped merchant order list while retaining the previous page during refetches. */
export function useMerchantOrders(filters: OrderListFilterFormData) {
  return useQuery<MerchantOrderListResponseDto, Error>({
    queryKey: ['merchantOrders', filters],
    queryFn: () => getMerchantOrders(filters),
    placeholderData: (previousData) => previousData,
  });
}