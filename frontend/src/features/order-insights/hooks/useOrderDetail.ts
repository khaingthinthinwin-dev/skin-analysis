import { useQuery } from '@tanstack/react-query';
import { orderService } from '../services/orderService';
import { type OrderDetailResponseDto } from '../types/orderInsights.types';

export function useOrderDetail(orderId: string | undefined) {
  return useQuery<OrderDetailResponseDto, Error>({
    queryKey: ['buyerOrderDetail', orderId],
    queryFn: () => orderService.getBuyerOrderDetail(orderId as string),
    enabled: Boolean(orderId),
    retry: false,
  });
}