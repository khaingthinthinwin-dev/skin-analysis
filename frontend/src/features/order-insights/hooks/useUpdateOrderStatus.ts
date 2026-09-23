import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateOrderStatus } from '../services/orderFulfillmentService';

/** Advances an order one step; on success refreshes both the detail and tracking queries. */
export function useUpdateOrderStatus(orderId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status: string) =>
      updateOrderStatus(orderId as string, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['merchantOrderDetail', orderId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['merchantOrderTracking', orderId],
      });
    },
  });
}