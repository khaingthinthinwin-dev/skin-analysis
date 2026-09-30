import apiClient from '@/lib/api-client';
import type { AdminOrderFilterFormData } from '../schemas/orderFilters.schema';
import type {
  AdminMerchantOption,
  AdminOrderDetailDto,
  AdminOrderListResponseDto,
} from '../types/adminOrderInsights.types';

function unwrapData<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return unwrapData((payload as { data: unknown }).data);
  }
  return payload as T;
}

export async function getAdminOrders(
  filters: AdminOrderFilterFormData,
): Promise<AdminOrderListResponseDto> {
  const params = {
    ...(filters.status !== 'all' ? { status: filters.status } : {}),
    ...(filters.from ? { from: filters.from } : {}),
    ...(filters.to ? { to: filters.to } : {}),
    ...(filters.merchantId ? { merchantId: filters.merchantId } : {}),
    ...(filters.shopId ? { shopId: filters.shopId } : {}),
    ...(filters.shopSearch?.trim() ? { shopSearch: filters.shopSearch.trim() } : {}),
    ...(filters.paymentStatus !== 'all' ? { paymentStatus: filters.paymentStatus } : {}),
    page: filters.page,
    limit: filters.limit,
    sort: filters.sort,
    order: filters.order,
  };
  const response = await apiClient.get('/orders', { params });
  return unwrapData<AdminOrderListResponseDto>(response.data);
}

export async function searchAdminMerchants(search: string): Promise<AdminMerchantOption[]> {
  const response = await apiClient.get('/admin/merchants', {
    params: { search, page: 1, limit: 20 },
  });
  const payload = unwrapData<{ items: AdminMerchantOption[] }>(response.data);
  return payload.items ?? [];
}

export async function getAdminOrderDetail(orderId: string): Promise<AdminOrderDetailDto> {
  const response = await apiClient.get(`/orders/${orderId}`);
  return unwrapData<AdminOrderDetailDto>(response.data);
}

export async function getAllAdminOrders(
  filters: AdminOrderFilterFormData,
): Promise<AdminOrderListResponseDto['orders']> {
  const orders: AdminOrderListResponseDto['orders'] = [];
  let page = 1;

  for (;;) {
    const response = await getAdminOrders({ ...filters, page, limit: 100 });
    orders.push(...response.orders);
    if (response.orders.length === 0 || orders.length >= response.meta.total) break;
    page += 1;
  }

  return orders;
}
