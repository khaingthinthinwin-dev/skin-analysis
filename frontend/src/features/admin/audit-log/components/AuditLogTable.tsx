import React from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, Bot, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AuditLogListItem } from '../services/auditLog.service';
import type { AuditLogQueryState } from '../schemas/auditLog.schema';
import { formatMmt } from '../utils/datetime';

interface AuditLogTableProps {
  logs?: AuditLogListItem[];
  query: AuditLogQueryState;
  selectedIds: Set<string>;
  onToggleRow: (id: string) => void;
  onToggleAll: () => void;
  onViewDetail: (id: string) => void;
  onSort?: (sortBy: AuditLogQueryState['sortBy']) => void;
  sortKey?: AuditLogQueryState['sortBy'];
}

function getInitials(name?: string | null): string {
  if (!name) return 'SYS';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getActionBadgeStyle(action: string): string {
  const upper = action.toUpperCase();
  if (upper.includes('DELETE') || upper.includes('REMOVE') || upper.includes('REJECT')) {
    return 'bg-rose-50 text-rose-600 border-rose-200';
  }
  if (upper.includes('APPROVE') || upper.includes('CREATE') || upper.includes('SUCCESS')) {
    return 'bg-emerald-50 text-emerald-600 border-emerald-200';
  }
  if (upper.includes('FEE') || upper.includes('UPDATE') || upper.includes('EDIT')) {
    return 'bg-amber-50 text-amber-600 border-amber-200';
  }
  if (upper.includes('PAID') || upper.includes('PAY') || upper.includes('EXPORT')) {
    return 'bg-indigo-50 text-indigo-600 border-indigo-200';
  }
  return 'bg-muted text-muted-foreground border-border';
}

function SortIcon({
  col,
  sortKey,
  sortOrder,
}: {
  col: AuditLogQueryState['sortBy'];
  sortKey?: AuditLogQueryState['sortBy'];
  sortOrder: 'asc' | 'desc';
}) {
  if (sortKey !== col)
    return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
  return sortOrder === 'asc' ? (
    <ArrowUp className="ml-1 inline h-3 w-3 text-primary" />
  ) : (
    <ArrowDown className="ml-1 inline h-3 w-3 text-primary" />
  );
}

const thClass = 'bg-primary/10 whitespace-nowrap font-bold';

export const AuditLogTable: React.FC<AuditLogTableProps> = ({
  logs = [],
  query,
  selectedIds,
  onToggleRow,
  onToggleAll,
  onViewDetail,
  onSort,
  sortKey,
}) => {
  const { t } = useTranslation();
  const allSelected =
    logs.length > 0 && logs.every((log) => selectedIds.has(log.id));

  const sortableHead = (col: AuditLogQueryState['sortBy'], label: string, className = '') => (
    <TableHead className={`${thClass} ${className}`}>
      {onSort ? (
        <button
          type="button"
          className="inline-flex items-center gap-0.5 font-bold hover:text-foreground transition-colors"
          onClick={() => onSort(col)}
          aria-label={`${t('audit.sortBy')} ${label}`}
        >
          {label}
          <SortIcon col={col} sortKey={sortKey} sortOrder={query.sortOrder} />
        </button>
      ) : (
        label
      )}
    </TableHead>
  );

  return (
    <div className="overflow-x-auto rounded-md border bg-card" data-testid="audit-table-scroll">
      <Table className="w-full">
        <TableHeader className="sticky top-0 z-10 bg-primary/10">
          <TableRow>
            <TableHead className="w-12 bg-primary/10">
              <input
                type="checkbox"
                aria-label={t('audit.selectAll')}
                checked={allSelected}
                onChange={onToggleAll}
              />
            </TableHead>
            {sortableHead('created_at', t('audit.timestamp'), 'w-[160px]')}
            <TableHead className={thClass}>{t('audit.actor')}</TableHead>
            {sortableHead('action', t('audit.action'))}
            {sortableHead('entity_type', t('audit.entityType'))}
            <TableHead className={thClass}>{t('audit.summary')}</TableHead>
            <TableHead className={thClass}>{t('audit.ipAddress')}</TableHead>
            <TableHead className={`${thClass} text-right w-16`}>{t('audit.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={8}
                className="py-12 text-center text-muted-foreground"
                data-testid="audit-empty"
              >
                <div className="flex flex-col items-center gap-2">
                  <Bot className="h-8 w-8 text-muted-foreground/40" />
                  <p className="font-medium text-foreground">{t('audit.noLogs')}</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            logs.map((log) => (
              <TableRow
                key={log.id}
                data-selected={selectedIds.has(log.id) || undefined}
                className="transition-colors duration-150 ease-in-out hover:bg-muted/40"
              >
                {/* Checkbox */}
                <TableCell>
                  <input
                    type="checkbox"
                    aria-label={`${t('audit.selectRow')} ${log.id}`}
                    checked={selectedIds.has(log.id)}
                    onChange={() => onToggleRow(log.id)}
                  />
                </TableCell>

                {/* Timestamp */}
                <TableCell className="font-mono text-[11px] text-muted-foreground whitespace-nowrap w-[160px]">
                  {formatMmt(log.createdAt)}
                </TableCell>

                {/* Actor */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-[11px] border border-primary/20">
                      {log.userName ? getInitials(log.userName) : <Bot className="h-3.5 w-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate max-w-[130px]">
                        {log.userName ?? t('audit.system')}
                      </p>
                      {log.userEmail && (
                        <span className="block truncate text-[11px] text-muted-foreground max-w-[130px]">
                          {log.userEmail}
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* Action */}
                <TableCell>
                  <span className={`inline-block font-mono text-xs px-2 py-0.5 rounded border font-medium whitespace-nowrap ${getActionBadgeStyle(log.action)}`}>
                    {log.action}
                  </span>
                </TableCell>

                {/* Entity Type */}
                <TableCell>
                  <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground border border-border/60 whitespace-nowrap">
                    {log.entityType}
                  </span>
                </TableCell>

                {/* Summary */}
                <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                  {log.summary || '—'}
                </TableCell>

                {/* IP Address */}
                <TableCell>
                  <span className="font-mono text-xs bg-muted/50 px-1.5 py-0.5 rounded border border-border/50 whitespace-nowrap">
                    {log.ipAddress ?? t('audit.unknownIp')}
                  </span>
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <Button
                    size="icon"
                    variant="outline"
                    aria-label={t('audit.viewDetail')}
                    title={t('audit.viewDetail')}
                    data-testid="btn-view-detail"
                    className="h-7 w-7 border-sky-300 bg-sky-100 text-sky-700 hover:bg-sky-200 hover:text-sky-800"
                    onClick={() => onViewDetail(log.id)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
