import { useQuery } from '@tanstack/react-query';
import { auditLogService } from '../services/auditLog.service';

export function useAuditLogs(params?: { page?: number; limit?: number; action?: string; userId?: string }) {
  const auditLogsQuery = useQuery({
    queryKey: ['admin', 'audit-logs', params],
    queryFn: () => auditLogService.getLogs(params),
  });

  return {
    auditLogsQuery,
  };
}
