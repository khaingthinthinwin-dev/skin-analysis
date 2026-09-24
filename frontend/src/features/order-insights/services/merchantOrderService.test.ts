import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '@/lib/api-client';
import { getAllMerchantOrders, getMerchantOrders, getRevenueSummary, getSalesSummary } from './merchantOrderService';
import { OrderStatus } from '../types/orderInsights.types';
import type { MerchantOrderListRowDto } from '../types/merchantOrderInsights.types';

vi.mock('@/lib/api-client', () => ({ default: { get: vi.fn() } }));

const filters = {
  status: 'delivered' as const,
  from: '2026-09-01T00:00:00.000Z',
  to: '2026-09-30T00:00:00.000Z',
  page: 1,
  limit: 20,
  sort: 'createdAt' as const,
  order: 'desc' as const,
};

describe('merchantOrderService', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
  });

  it('fetches merchant orders without an owner id', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: { orders: [], meta: { page: 1, limit: 20, total: 0 } } } });
    await getMerchantOrders(filters);
    expect(apiClient.get).toHaveBeenCalledWith('/orders', { params: expect.objectContaining({ status: 'delivered', page: 1 }) });
  });

  it('unwraps summary envelopes and rejects invalid custom periods', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { salesSummary: { todayCount: 1, thisMonthCount: 2, completedCount: 3 } } });
    await expect(getSalesSummary()).resolves.toEqual({ todayCount: 1, thisMonthCount: 2, completedCount: 3 });
    await expect(getRevenueSummary({ period: 'custom', from: '', to: '' })).rejects.toThrow('Select a start and end date');
  });

  it('walks every page of the filtered result set for an export', async () => {
    const row = (id: string): MerchantOrderListRowDto => ({
      id, createdAt: '2026-09-01', status: OrderStatus.DELIVERED, itemCount: 1, totalAmount: '1.00', paymentStatus: 'completed', customerName: 'Customer',
    });
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({ data: { data: { orders: [row('1')], meta: { page: 1, limit: 100, total: 2 } } } })
      .mockResolvedValueOnce({ data: { data: { orders: [row('2')], meta: { page: 2, limit: 100, total: 2 } } } });

    const rows = await getAllMerchantOrders(filters);

    expect(rows).toHaveLength(2);
    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/orders', { params: expect.objectContaining({ page: 1, limit: 100 }) });
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/orders', { params: expect.objectContaining({ page: 2, limit: 100 }) });
  });

  it('stops on an empty page instead of looping past a stale total', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: { orders: [], meta: { page: 1, limit: 100, total: 5 } } } });

    await expect(getAllMerchantOrders(filters)).resolves.toEqual([]);
    expect(apiClient.get).toHaveBeenCalledTimes(1);
  });
});