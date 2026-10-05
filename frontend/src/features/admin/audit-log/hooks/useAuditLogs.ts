import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { auditLogService } from '../services/auditLog.service';
import type { AuditLogQueryState } from '../schemas/auditLog.schema';

const AUTO_REFRESH_MS = 30_000;

function usePageVisible(): boolean {
  const [visible, setVisible] = useState(
    () => typeof document === 'undefined' || document.visibilityState === 'visible',
  );
  useEffect(() => {
    const onChange = () =>
      setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
  return visible;
}

export function useAuditLogFilters() {
  return useQuery({
    queryKey: ['audit-log-filters'],
    queryFn: () => auditLogService.getFilterOptions(),
    staleTime: 5 * 60_000,
  });
}

export function useAuditLogDetail(id: string | null) {
  return useQuery({
    queryKey: ['audit-logs', 'detail', id],
    queryFn: () => auditLogService.getLogDetail(id as string),
    enabled: Boolean(id),
  });
}

export function useSearchUsers(search: string) {
  const enabled = search.trim().length >= 2;
  return useQuery({
    queryKey: ['audit-logs', 'user-search', search],
    queryFn: () => auditLogService.searchUsers(search.trim()),
    enabled,
    staleTime: 30_000,
  });
}

export function useAuditLogs(
  query: AuditLogQueryState,
  options?: { autoRefresh?: boolean },
) {
  const queryClient = useQueryClient();
  const pageVisible = usePageVisible();
  const autoRefresh = options?.autoRefresh ?? false;
  const [refreshError, setRefreshError] = useState(false);

  const listQuery = useQuery({
    queryKey: ['audit-logs', 'list', query],
    queryFn: async () => {
      try {
        const data = await auditLogService.getLogs({
          ...query,
        } as unknown as Record<string, unknown>);
        setRefreshError(false);
        return data;
      } catch (error) {
        // Preserve previously successful rows on background refresh failures.
        const previous = queryClient.getQueryData([
          'audit-logs',
          'list',
          query,
        ]);
        if (previous) {
          setRefreshError(true);
          return previous as Awaited<ReturnType<typeof auditLogService.getLogs>>;
        }
        throw error;
      }
    },
    refetchInterval: autoRefresh && pageVisible ? AUTO_REFRESH_MS : false,
    refetchIntervalInBackground: false,
    placeholderData: (prev) => prev,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    queryClient.invalidateQueries({ queryKey: ['audit-log-filters'] });
  };

  const exportMutation = useMutation({
    mutationFn: (params: Parameters<typeof auditLogService.exportCsv>[0]) =>
      auditLogService.exportCsv(params),
  });

  const deleteMutation = useMutation({
    mutationFn: (body: { olderThanDays: number; recordIds?: string[] }) =>
      auditLogService.deleteLogs(body),
    onSuccess: invalidate,
  });

  return {
    listQuery,
    exportMutation,
    deleteMutation,
    invalidate,
    refreshError,
  };
}
