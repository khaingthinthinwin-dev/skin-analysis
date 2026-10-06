import apiClient from '@/lib/api-client';
import type { AdminOrderFilterFormData } from '../schemas/orderFilters.schema';
import type {
  AdminMerchantOption,
  AdminOrderDetailDto,
  AdminOrderTrackingDto,
  AdminOrderListResponseDto,
} from '../types/adminOrderInsights.types';
import { ORDER_STATUS_FILTER_VALUES, type OrderStatus } from '../types/orderInsights.types';

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
    // Matches the merchant filter bar: the copied `#ABCD1234` reference pasted
    // straight in narrows the list (the backend strips the leading `#`).
    ...(filters.orderSearch?.trim() ? { orderSearch: filters.orderSearch.trim() } : {}),
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

export async function getAdminOrderTracking(orderId: string): Promise<AdminOrderTrackingDto> {
  const response = await apiClient.get(`/orders/${orderId}/tracking`);
  const payload = unwrapData<unknown>(response.data);
  if (!payload || typeof payload !== 'object') return { historyAvailable: false, steps: [] };

  const envelope = payload as Record<string, unknown>;
  const tracking = envelope.tracking && typeof envelope.tracking === 'object'
    ? envelope.tracking as Record<string, unknown>
    : envelope;
  const validStatuses = new Set<string>(ORDER_STATUS_FILTER_VALUES);
  const rawSteps = Array.isArray(tracking.steps)
    ? tracking.steps
    : Array.isArray(tracking.timeline)
      ? tracking.timeline
      : [];
  const steps = rawSteps.flatMap((rawStep) => {
    if (!rawStep || typeof rawStep !== 'object') return [];
    const step = rawStep as Record<string, unknown>;
    const status = step.statusCode ?? step.status;
    const reachedAt = step.reachedAt ?? step.timestamp;
    if (typeof status !== 'string' || !validStatuses.has(status)) return [];
    return [{ statusCode: status as OrderStatus, reachedAt: typeof reachedAt === 'string' ? reachedAt : null }];
  });
  const currentStatus = typeof tracking.currentStatus === 'string' && validStatuses.has(tracking.currentStatus)
    ? tracking.currentStatus as OrderStatus
    : undefined;
  const historyAvailable = typeof tracking.historyAvailable === 'boolean'
    ? tracking.historyAvailable
    : steps.some((step) => step.reachedAt !== null);

  return {
    orderId: typeof tracking.orderId === 'string' ? tracking.orderId : undefined,
    currentStatus,
    historyAvailable,
    steps,
  };
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
