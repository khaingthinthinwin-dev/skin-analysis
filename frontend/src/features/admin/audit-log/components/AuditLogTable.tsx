import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AuditLogItem } from '../services/auditLog.service';

interface AuditLogTableProps {
  logs?: AuditLogItem[];
}

export const AuditLogTable: React.FC<AuditLogTableProps> = ({ logs = [] }) => {
  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Timestamp</TableHead>
            <TableHead>User ID</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Target Entity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                No audit log entries recorded.
              </TableCell>
            </TableRow>
          ) : (
            logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-mono text-xs">
                  {new Date(log.createdAt).toLocaleString()}
                </TableCell>
                <TableCell className="font-mono text-xs">{log.userId}</TableCell>
                <TableCell className="font-semibold">{log.action}</TableCell>
                <TableCell>{log.entityType} {log.entityId ? `(${log.entityId})` : ''}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
