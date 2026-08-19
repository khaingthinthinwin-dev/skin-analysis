// [PET/PPH] Audit Log - Append-only security and platform action audit trail
import React, { useState } from 'react';
import { useAuditLogs } from '@/features/admin/hooks/useAuditLogs';
import { AuditLogTable } from '@/features/admin/components/AuditLogTable';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function AuditLog() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const { auditLogsQuery } = useAuditLogs({
    page,
    limit: 20,
    action: actionFilter || undefined,
  });

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground">Append-only security and platform action audit trail</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Filter by action:</span>
              <input
                type="text"
                placeholder="e.g., merchant.approve"
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1 text-sm border rounded-md w-64"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Total entries:</span>
              <Badge variant="secondary">{auditLogsQuery.data?.total ?? 0}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <AuditLogTable logs={auditLogsQuery.data?.items} />

      {auditLogsQuery.data && auditLogsQuery.data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {auditLogsQuery.data.page} of {auditLogsQuery.data.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= auditLogsQuery.data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
