import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUpdateOrderStatus } from './useUpdateOrderStatus';
import { useMerchantOrderDetail } from './useMerchantOrderDetail';
import { useMerchantOrderTracking } from './useMerchantOrderTracking';
import {
  getMerchantOrderDetail,
  getMerchantOrderTracking,
  updateOrderStatus,
} from '../services/orderFulfillmentService';

vi.mock('../services/orderFulfillmentService', () => ({
  getMerchantOrderDetail: vi.fn(),
  getMerchantOrderTracking: vi.fn(),
  updateOrderStatus: vi.fn(),
  unwrapData: (value: unknown) => value,
  MERCHANT_ORDER_DETAIL_PATH: (id: string) => `/merchant/orders/${id}`,
  MERCHANT_ORDER_TRACKING_PATH: (id: string) => `/merchant/orders/${id}/tracking`,
  MERCHANT_ORDER_STATUS_PATH: (id: string) => `/merchant/orders/${id}/status`,
}));

function createWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useUpdateOrderStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls updateOrderStatus with the order id and requested status', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    (updateOrderStatus as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'order-1', status: 'packed' });

    const { result } = renderHook(() => useUpdateOrderStatus('order-1'), {
      wrapper: createWrapper(client),
    });

    act(() => result.current.mutate('packed'));

    await waitFor(() => expect(updateOrderStatus).toHaveBeenCalledWith('order-1', 'packed'));
  });

  it('invalidates both the detail and tracking queries after a successful update', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const detail = { id: 'order-1', status: 'packed' };
    const tracking = { timeline: [{ status: 'packed', createdAt: '2026-09-01' }] };
    (getMerchantOrderDetail as ReturnType<typeof vi.fn>).mockResolvedValue(detail);
    (getMerchantOrderTracking as ReturnType<typeof vi.fn>).mockResolvedValue(tracking);
    (updateOrderStatus as ReturnType<typeof vi.fn>).mockResolvedValue({ ...detail, status: 'shipped' });

    renderHook(() => useMerchantOrderDetail('order-1'), { wrapper: createWrapper(client) });
    renderHook(() => useMerchantOrderTracking('order-1'), { wrapper: createWrapper(client) });
    await waitFor(() => expect(getMerchantOrderDetail).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getMerchantOrderTracking).toHaveBeenCalledTimes(1));

    const { result } = renderHook(() => useUpdateOrderStatus('order-1'), {
      wrapper: createWrapper(client),
    });
    act(() => result.current.mutate('shipped'));

    await waitFor(() => expect(getMerchantOrderDetail).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(getMerchantOrderTracking).toHaveBeenCalledTimes(2));
  });
});