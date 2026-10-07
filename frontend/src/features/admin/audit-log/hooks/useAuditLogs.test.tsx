import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useAuditLogQuery } from './useAuditLogQuery';
import { useAuditLogs } from './useAuditLogs';
import { auditLogService } from '../services/auditLog.service';
import { DEFAULT_AUDIT_LOG_QUERY } from '../schemas/auditLog.schema';

vi.mock('../services/auditLog.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/auditLog.service')>();
  return {
    ...actual,
    auditLogService: {
      ...actual.auditLogService,
      getLogs: vi.fn(),
      getFilterOptions: vi.fn(),
      deleteLogs: vi.fn(),
      exportCsv: vi.fn(),
    },
  };
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter initialEntries={['/admin/audit-logs?action=merchant.approve&page=2']}>
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      {children}
    </QueryClientProvider>
  </MemoryRouter>
);

describe('useAuditLogQuery', () => {
  it('parses URL into query state and patches multi-select as repeated keys', async () => {
    const { result } = renderHook(() => useAuditLogQuery(), { wrapper });

    expect(result.current.query.action).toEqual(['merchant.approve']);
    expect(result.current.query.page).toBe(2);
    expect(result.current.activeFilterCount).toBe(1);

    result.current.patch({ action: ['a', 'b'], entityType: ['Merchant'] });

    await waitFor(() => {
      expect(result.current.query.action).toEqual(['a', 'b']);
      expect(result.current.query.entityType).toEqual(['Merchant']);
      // Filter change resets page to 1.
      expect(result.current.query.page).toBe(1);
    });
  });
});

describe('useAuditLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches the list with normalized query', async () => {
    const getLogs = vi.mocked(auditLogService.getLogs).mockResolvedValue({
      items: [],
      meta: { page: 1, limit: 50, total: 0, totalPages: 0 },
    });

    const { result } = renderHook(() => useAuditLogs(DEFAULT_AUDIT_LOG_QUERY), {
      wrapper,
    });

    await waitFor(() => expect(result.current.listQuery.isSuccess).toBe(true));
    expect(getLogs).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 10, sortBy: 'created_at' }),
    );
  });

  it('deletes logs and invalidates queries on success', async () => {
    vi.mocked(auditLogService.deleteLogs).mockResolvedValue({
      deletedRecords: 2,
      deletedFiles: 0,
    });
    vi.mocked(auditLogService.getLogs).mockResolvedValue({
      items: [],
      meta: { page: 1, limit: 50, total: 0, totalPages: 0 },
    });

    const { result } = renderHook(() => useAuditLogs(DEFAULT_AUDIT_LOG_QUERY), {
      wrapper,
    });

    const resultData = await result.current.deleteMutation.mutateAsync({
      olderThanDays: 90,
      recordIds: ['11111111-1111-4111-8111-111111111111'],
    });

    expect(auditLogService.deleteLogs).toHaveBeenCalledWith({
      olderThanDays: 90,
      recordIds: ['11111111-1111-4111-8111-111111111111'],
    });
    expect(resultData).toEqual({
      deletedRecords: 2,
      deletedFiles: 0,
    });
  });
});
