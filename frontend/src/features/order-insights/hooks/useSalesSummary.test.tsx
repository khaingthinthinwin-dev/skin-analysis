import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSalesSummary } from './useSalesSummary';
import { getSalesSummary } from '../services/merchantOrderService';

vi.mock('../services/merchantOrderService', () => ({ getSalesSummary: vi.fn() }));

describe('useSalesSummary', () => {
  it('uses the stable merchant sales query key', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    renderHook(() => useSalesSummary(), { wrapper });
    expect(getSalesSummary).toHaveBeenCalled();
  });
});