import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMerchantApproval } from './useMerchantApproval';
import { merchantService } from '../services/merchant.service';

vi.mock('../services/merchant.service', () => ({
  merchantService: {
    getMerchants: vi.fn(),
    approveMerchant: vi.fn(),
    rejectMerchant: vi.fn(),
  },
}));

function createWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const emptyPage = { items: [], total: 0, page: 1, limit: 10, totalPages: 0 };

describe('useMerchantApproval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invalidates the admin users query after approving a merchant', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.mocked(merchantService.getMerchants).mockResolvedValue(emptyPage);
    vi.mocked(merchantService.approveMerchant).mockResolvedValue({
      id: 'm1',
      licenseStatus: 'approved',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    client.setQueryData(['admin', 'users', {}], { items: [] });

    const { result } = renderHook(() => useMerchantApproval(), {
      wrapper: createWrapper(client),
    });

    await act(async () => {
      await result.current.approveMutation.mutateAsync({ id: 'm1' });
    });

    await waitFor(() => {
      expect(client.getQueryState(['admin', 'users', {}])?.isInvalidated).toBe(
        true,
      );
    });
  });

  it('invalidates the admin users query after rejecting a merchant', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.mocked(merchantService.getMerchants).mockResolvedValue(emptyPage);
    vi.mocked(merchantService.rejectMerchant).mockResolvedValue({
      id: 'm1',
      licenseStatus: 'rejected',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    client.setQueryData(['admin', 'users', {}], { items: [] });

    const { result } = renderHook(() => useMerchantApproval(), {
      wrapper: createWrapper(client),
    });

    await act(async () => {
      await result.current.rejectMutation.mutateAsync({
        id: 'm1',
        reason: 'Invalid documents',
      });
    });

    await waitFor(() => {
      expect(client.getQueryState(['admin', 'users', {}])?.isInvalidated).toBe(
        true,
      );
    });
  });
});
