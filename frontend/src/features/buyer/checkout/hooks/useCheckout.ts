import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { checkoutService } from '../services/checkout.service';
import type { CreateOrderPayload } from '@/types/checkout.types';

export const checkoutKeys = {
  all: ['checkout'] as const,
  data: () => [...checkoutKeys.all, 'data'] as const,
  orders: () => [...checkoutKeys.all, 'orders'] as const,
  orderHistory: (page: number, limit: number) =>
    [...checkoutKeys.orders(), { page, limit }] as const,
  orderDetail: (id: string) => [...checkoutKeys.orders(), id] as const,
  orderTracking: (id: string) =>
    [...checkoutKeys.orders(), id, 'tracking'] as const,
};

export function useCheckoutData() {
  return useQuery({
    queryKey: checkoutKeys.data(),
    queryFn: () => checkoutService.getCheckoutData(),
    staleTime: 0,
    retry: 1,
  });
}

export function useSponsoredAds() {
  return useQuery({
    queryKey: [...checkoutKeys.all, 'sponsored-ads'],
    queryFn: () => checkoutService.getSponsoredAds(),
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useValidateCoupon() {
  return useMutation({
    mutationFn: ({
      couponCode,
      subtotal,
    }: {
      couponCode: string;
      subtotal: number;
    }) => checkoutService.validateCoupon(couponCode, subtotal),
  });
}

export function usePlaceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateOrderPayload) =>
      checkoutService.placeOrder(payload),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: checkoutKeys.orders() });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

export function useOrderHistory(page = 1, limit = 10) {
  return useQuery({
    queryKey: checkoutKeys.orderHistory(page, limit),
    queryFn: () => checkoutService.getOrderHistory(page, limit),
    staleTime: 30_000,
    retry: 1,
  });
}

export function useOrderDetail(orderId: string) {
  return useQuery({
    queryKey: checkoutKeys.orderDetail(orderId),
    queryFn: () => checkoutService.getOrderDetail(orderId),
    enabled: !!orderId,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useOrderTracking(orderId: string) {
  return useQuery({
    queryKey: checkoutKeys.orderTracking(orderId),
    queryFn: () => checkoutService.getOrderTracking(orderId),
    enabled: !!orderId,
    staleTime: 30_000,
    retry: 1,
  });
}
