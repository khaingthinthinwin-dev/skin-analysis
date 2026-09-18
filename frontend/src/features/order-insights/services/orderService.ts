import apiClient from '@/lib/api-client';
import { type OrderListFilterFormData } from '../schemas/orderFilters.schema';
import { type OrderDetailResponseDto, type OrderListResponseDto } from '../types/orderInsights.types';

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

  getBuyerOrderDetail: async (orderId: string): Promise<OrderDetailResponseDto> => {
    const { data } = await apiClient.get(`/orders/${orderId}`);
    const payload = data?.data?.data ?? data?.data ?? data;
    return payload as OrderDetailResponseDto;
  },
};
