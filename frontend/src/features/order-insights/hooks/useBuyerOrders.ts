import { useQuery } from '@tanstack/react-query';
import { mockOrderService } from '../services/mockOrderService';
import { OrderListFilterFormData } from '../schemas/orderFilters.schema';
import { OrderListResponseDto } from '../types/orderInsights.types';

const DEFAULT_FILTERS: OrderListFilterFormData = {
  page: 1,
  limit: 20,
  sort: 'createdAt',
  order: 'desc',
  status: 'all',
  from: '',
  to: '',
};

export function useBuyerOrders(filters: Partial<OrderListFilterFormData> = {}) {
  const mergedFilters: OrderListFilterFormData = { ...DEFAULT_FILTERS, ...filters };

  return useQuery<OrderListResponseDto, Error>({
    queryKey: ['buyerOrders', mergedFilters],
    queryFn: () => mockOrderService.getBuyerOrders(mergedFilters),
    placeholderData: (previousData) => previousData,
  });
}