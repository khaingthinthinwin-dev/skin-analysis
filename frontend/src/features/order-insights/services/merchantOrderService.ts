import apiClient from '@/lib/api-client';
import { revenuePeriodSchema, type OrderListFilterFormData, type RevenuePeriodFormData } from '../schemas/orderFilters.schema';
import type {
  MerchantOrderListResponseDto,
  MerchantOrderListRowDto,
  RevenueSummaryDto,
  SalesSummaryDto,
} from '../types/merchantOrderInsights.types';

export const MERCHANT_ORDER_DETAIL_PATH = (orderId: string) => `/merchant/orders/${orderId}`;
export const ORDER_TRACKING_PATH = (orderId: string) => `/orders/${orderId}/tracking`;

function unwrap<T>(payload: unknown, key: string): T {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const data = record.data;
    if (data && typeof data === 'object') {
      const nested = data as Record<string, unknown>;
      if (key in nested) return nested[key] as T;
      if ('data' in nested && nested.data && typeof nested.data === 'object') {
        const nestedData = nested.data as Record<string, unknown>;
        if (key in nestedData) return nestedData[key] as T;
      }
    }
    if (key in record) return record[key] as T;
  }
  return payload as T;
}

function unwrapData<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return unwrapData((payload as { data: unknown }).data);
  }
  return payload as T;
}

/** Fetches the merchant's server-scoped order list. */
export async function getMerchantOrders(
  filters: OrderListFilterFormData,
): Promise<MerchantOrderListResponseDto> {
  const params = {
    ...(filters.status !== 'all' ? { status: filters.status } : {}),
    ...(filters.from ? { from: filters.from } : {}),
    ...(filters.to ? { to: filters.to } : {}),
    page: filters.page,
    limit: filters.limit,
    sort: filters.sort,
    order: filters.order,
  };
  const response = await apiClient.get('/orders', { params });
  return unwrapData<MerchantOrderListResponseDto>(response.data);
}

/** Page size of the export walk — the list endpoint caps `limit` at 100 (BR-OI-010). */
export const MERCHANT_EXPORT_PAGE_SIZE = 100;

/**
 * Fetches every merchant row matching the filters, page by page, so an export
 * covers the whole filtered result set instead of the visible page only. The
 * filters keep the applied status, date range and table sort, so the CSV rows
 * are the list rows in the same order. The walk also stops on an empty page, so
 * a stale `total` can never loop forever.
 */
export async function getAllMerchantOrders(
  filters: OrderListFilterFormData,
): Promise<MerchantOrderListRowDto[]> {
  const rows: MerchantOrderListRowDto[] = [];
  let page = 1;

  for (;;) {
    const response = await getMerchantOrders({ ...filters, page, limit: MERCHANT_EXPORT_PAGE_SIZE });
    rows.push(...response.orders);
    if (response.orders.length === 0 || rows.length >= response.meta.total) break;
    page += 1;
  }

  return rows;
}

/** Fetches the merchant order-count summary. */
export async function getSalesSummary(): Promise<SalesSummaryDto> {
  const response = await apiClient.get('/order-insights/merchant/sales-summary');
  return unwrap<SalesSummaryDto>(response.data, 'salesSummary');
}

/** Fetches the merchant revenue summary for a validated period. */
export async function getRevenueSummary(period: RevenuePeriodFormData): Promise<RevenueSummaryDto> {
  const parsed = revenuePeriodSchema.safeParse(period);
  if (!parsed.success) throw new Error('Select a start and end date');

  const params = {
    period: period.period,
    ...(period.from ? { from: period.from } : {}),
    ...(period.to ? { to: period.to } : {}),
  };
  const response = await apiClient.get('/order-insights/merchant/revenue-summary', { params });
  return unwrap<RevenueSummaryDto>(response.data, 'revenueSummary');
}