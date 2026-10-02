import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '@/lib/api-client';
import { getAdminOrders, searchAdminMerchants } from './adminOrderService';

vi.mock('@/lib/api-client', () => ({ default: { get: vi.fn() } }));

describe('adminOrderService', () => {
  beforeEach(() => vi.mocked(apiClient.get).mockReset());

  it('fetches all-platform orders with admin scope filters', async () => {
    const response = {
      orders: [],
      meta: { page: 1, limit: 20, total: 0 },
    };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: response } });

    await expect(getAdminOrders({
      status: 'delivered',
      from: '2026-09-01',
      to: '2026-09-30',
      page: 1,
      limit: 20,
      sort: 'createdAt',
      order: 'desc',
      merchantId: '11111111-1111-4111-8111-111111111111',
    })).resolves.toEqual(response);

    expect(apiClient.get).toHaveBeenCalledWith('/orders', {
      params: expect.objectContaining({
        status: 'delivered',
        merchantId: '11111111-1111-4111-8111-111111111111',
        page: 1,
        limit: 20,
      }),
    });
  });

  it('searches the admin merchant options endpoint', async () => {
    const items = [{ id: '11111111-1111-4111-8111-111111111111', shopName: 'Lotus Glow' }];
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: { items } } });

    await expect(searchAdminMerchants('Lotus')).resolves.toEqual(items);
    expect(apiClient.get).toHaveBeenCalledWith('/admin/merchants', {
      params: { search: 'Lotus', page: 1, limit: 20 },
    });
  });
});
