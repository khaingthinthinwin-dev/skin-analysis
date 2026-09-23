import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMerchantOrderTracking } from './useMerchantOrderTracking';
import { getMerchantOrderTracking } from '../services/orderFulfillmentService';

vi.mock('../services/orderFulfillmentService', () => ({
  getMerchantOrderDetail: vi.fn(),
  getMerchantOrderTracking: vi.fn(),
  updateOrderStatus: vi.fn(),
  unwrapData: (value: unknown) => value,
  MERCHANT_ORDER_DETAIL_PATH: (id: string) => `/merchant/orders/${id}`,
  MERCHANT_ORDER_TRACKING_PATH: (id: string) => `/merchant/orders/${id}/tracking`,
  MERCHANT_ORDER_STATUS_PATH: (id: string) => `/merchant/orders/${id}/status`,
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('useMerchantOrderTracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches the delivery timeline for the given id', async () => {
    (getMerchantOrderTracking as ReturnType<typeof vi.fn>).mockResolvedValue({ timeline: [] });

    renderHook(() => useMerchantOrderTracking('order-1'), { wrapper });

    await waitFor(() => expect(getMerchantOrderTracking).toHaveBeenCalledWith('order-1'));
  });

  it('does not fetch while the id is undefined', () => {
    renderHook(() => useMerchantOrderTracking(undefined), { wrapper });

    expect(getMerchantOrderTracking).not.toHaveBeenCalled();
  });
});