import { describe, expect, it, vi } from 'vitest';
import apiClient from '@/lib/api-client';
import { getMerchantOrders, getRevenueSummary, getSalesSummary } from './merchantOrderService';

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
});