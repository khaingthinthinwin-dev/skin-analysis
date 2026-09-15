import apiClient from '@/lib/api-client';
import { type OrderListFilterFormData } from '../schemas/orderFilters.schema';
import { type OrderListResponseDto } from '../types/orderInsights.types';

export const orderService = {
  getBuyerOrders: async (
    filters: OrderListFilterFormData,
  ): Promise<OrderListResponseDto> => {
    const params = {
      ...(filters.status !== 'all' ? { status: filters.status } : {}),
      ...(filters.from !== '' ? { from: filters.from } : {}),
      ...(filters.to !== '' ? { to: filters.to } : {}),
      page: filters.page,
      limit: filters.limit,
      sort: filters.sort,
      order: filters.order,
    };

    const response = await apiClient.get<{ data: OrderListResponseDto }>('/orders', {
      params,
    });

    return response.data.data;
  },
};
