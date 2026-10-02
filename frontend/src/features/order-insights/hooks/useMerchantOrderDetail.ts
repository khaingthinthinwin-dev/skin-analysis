import { useQuery } from '@tanstack/react-query';
import { getMerchantOrderDetail } from '../services/orderFulfillmentService';
import type { MerchantOrderDetailDto } from '../types/merchantOrderFulfillment.types';

export function useMerchantOrderDetail(orderId: string | undefined) {
  return useQuery<MerchantOrderDetailDto, Error>({
    queryKey: ['merchantOrderDetail', orderId],
    queryFn: () => getMerchantOrderDetail(orderId as string),
    enabled: Boolean(orderId),
    retry: false,
  });
}