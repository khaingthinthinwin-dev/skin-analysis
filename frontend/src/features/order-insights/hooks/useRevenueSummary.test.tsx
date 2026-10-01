import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useRevenueSummary } from './useRevenueSummary';
import { getRevenueSummary } from '../services/merchantOrderService';

vi.mock('../services/merchantOrderService', () => ({ getRevenueSummary: vi.fn() }));

describe('useRevenueSummary', () => {
  it('does not call the API for an invalid custom period', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    renderHook(() => useRevenueSummary({ period: 'custom', from: '', to: '' }), { wrapper });
    expect(getRevenueSummary).not.toHaveBeenCalled();
  });
});