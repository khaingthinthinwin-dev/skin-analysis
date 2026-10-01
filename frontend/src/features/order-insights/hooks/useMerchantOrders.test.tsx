import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useMerchantOrders } from './useMerchantOrders';
import { getMerchantOrders } from '../services/merchantOrderService';

vi.mock('../services/merchantOrderService', () => ({ getMerchantOrders: vi.fn() }));

describe('useMerchantOrders', () => {
  it('uses the merchant query key and query function', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const filters = { status: 'all' as const, from: '', to: '', page: 1, limit: 20, sort: 'createdAt' as const, order: 'desc' as const };
    renderHook(() => useMerchantOrders(filters), { wrapper });
    expect(getMerchantOrders).toHaveBeenCalledWith(filters);
  });
});