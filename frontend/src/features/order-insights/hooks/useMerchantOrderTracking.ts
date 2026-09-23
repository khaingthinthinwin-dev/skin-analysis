import { useQuery } from '@tanstack/react-query';
import { getMerchantOrderTracking } from '../services/orderFulfillmentService';
import type { MerchantTrackingDto } from '../types/merchantOrderFulfillment.types';

export function useMerchantOrderTracking(orderId: string | undefined) {
  return useQuery<MerchantTrackingDto, Error>({
    queryKey: ['merchantOrderTracking', orderId],
    queryFn: () => getMerchantOrderTracking(orderId as string),
    enabled: Boolean(orderId),
    retry: false,
  });
}