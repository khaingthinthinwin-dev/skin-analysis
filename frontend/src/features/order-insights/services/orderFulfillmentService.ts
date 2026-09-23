import apiClient from '@/lib/api-client';
import type {
  MerchantOrderDetailDto,
  MerchantTrackingDto,
} from '../types/merchantOrderFulfillment.types';

export const MERCHANT_ORDER_DETAIL_PATH = (orderId: string) => `/merchant/orders/${orderId}`;
export const MERCHANT_ORDER_TRACKING_PATH = (orderId: string) => `/merchant/orders/${orderId}/tracking`;
export const MERCHANT_ORDER_STATUS_PATH = (orderId: string) => `/merchant/orders/${orderId}/status`;

/** Recursively unwraps the server's `{ data: ... }` envelope when present. */
export function unwrapData<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return unwrapData((payload as { data: unknown }).data);
  }
  return payload as T;
}

/** Fetches the merchant order detail including customer info and available transitions. */
export async function getMerchantOrderDetail(
  orderId: string,
): Promise<MerchantOrderDetailDto> {
  const response = await apiClient.get(MERCHANT_ORDER_DETAIL_PATH(orderId));
  return unwrapData<MerchantOrderDetailDto>(response.data);
}

/** Fetches the merchant-visible delivery timeline for an order. */
export async function getMerchantOrderTracking(
  orderId: string,
): Promise<MerchantTrackingDto> {
  const response = await apiClient.get(MERCHANT_ORDER_TRACKING_PATH(orderId));
  return unwrapData<MerchantTrackingDto>(response.data);
}

/** Advances an order status one step forward; returns the refreshed order detail. */
export async function updateOrderStatus(
  orderId: string,
  status: string,
): Promise<MerchantOrderDetailDto> {
  const response = await apiClient.patch(MERCHANT_ORDER_STATUS_PATH(orderId), {
    status,
  });
  return unwrapData<MerchantOrderDetailDto>(response.data);
}