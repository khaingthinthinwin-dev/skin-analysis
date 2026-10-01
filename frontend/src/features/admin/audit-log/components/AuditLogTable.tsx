import React from 'react';
import { useTranslation } from 'react-i18next';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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

/**
 * Mobile (<768px) card list — DD_Audit_Log_02_FRONTEND_PAGE §9: "mobile
 * (<768px) uses stacked filters, cards, and full-screen modal/dialog".
 * Hidden from `md` up, where the scrollable/full table takes over.
 */
export const AuditLogCards: React.FC<
  Omit<AuditLogTableProps, 'onSort' | 'sortKey' | 'onToggleAll'>
> = ({ logs = [], query: _query, selectedIds, onToggleRow, onViewDetail }) => {
  const { t } = useTranslation();
  if (logs.length === 0) return null;

  return (
    <ul className="space-y-3 md:hidden" data-testid="audit-cards">
      {logs.map((log) => (
        <li
          key={log.id}
          className="rounded-md border bg-card p-4 text-sm break-words"
        >
          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Checkbox
                checked={selectedIds.has(log.id)}
                onCheckedChange={() => onToggleRow(log.id)}
                aria-label={`${t('audit.selectRow')} ${log.id}`}
              />
              <span className="font-mono text-xs text-muted-foreground">
                {formatMmt(log.createdAt)}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewDetail(log.id)}
              data-testid="btn-view-detail"
            >
              {t('audit.viewDetail')}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2 [&>div]:min-w-0">
            <div>
              <span className="text-xs text-muted-foreground">
                {t('audit.actor')}
              </span>
              <p className="font-medium">{log.userName ?? t('audit.system')}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">
                {t('audit.action')}
              </span>
              <p className="break-all font-mono text-xs">{log.action}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">
                {t('audit.entityType')}
              </span>
              <p>{log.entityType}</p>
            </div>
          </div>
          <p className="mt-2 text-muted-foreground">{log.summary}</p>
        </li>
      ))}
    </ul>
  );
};

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

  const header = (
    key: AuditLogQueryState['sortBy'],
    label: string,
    widthClass?: string,
  ) => (
    <TableHead className={`sticky top-0 z-20 bg-card ${widthClass ?? ''}`}>
      {onSort ? (
        <button
          type="button"
          className="inline-flex items-center gap-1 hover:underline"
          onClick={() => onSort(key)}
          aria-label={`${t('audit.sortBy')} ${label}`}
        >
          {label}
          {sortKey === key && (
            <span aria-hidden="true">
              {query.sortOrder === 'asc' ? '▲' : '▼'}
            </span>
          )}
        </button>
      ) : (
        label
      )}
    </TableHead>
  );

  if (logs.length === 0) {
    return (
      <div
        className="rounded-md border bg-card p-8 text-center text-muted-foreground"
        data-testid="audit-empty"
      >
        {t('audit.noLogs')}
      </div>
    );
  }

  return (
    <>
      {/* Hidden below md (768px) where the card list is rendered instead.
          Tablet scrolls horizontally; desktop (>=1024px) shows the full table. */}
      <div className="hidden -mx-2 rounded-md border bg-card sm:-mx-3 md:block">
        <div
          className="max-h-[75vh] overflow-auto overscroll-auto [&>div]:overflow-visible"
          data-testid="audit-table-scroll"
        >
          <Table className="w-full table-fixed min-w-[760px] lg:min-w-0">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky top-0 z-20 w-10 bg-card">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={onToggleAll}
                    aria-label={t('audit.selectAll')}
                  />
                </TableHead>
                {header('created_at', t('audit.timestamp'), 'w-[150px]')}
                <TableHead className="sticky top-0 z-20 bg-card w-[180px]">
                  {t('audit.actor')}
                </TableHead>
                {header('action', t('audit.action'), 'w-[130px]')}
                <TableHead className="sticky top-0 z-20 hidden bg-card sm:table-cell w-[120px]">
                  {t('audit.entityType')}
                </TableHead>
                <TableHead className="sticky top-0 z-20 hidden bg-card lg:table-cell w-[220px]">
                  {t('audit.summary')}
                </TableHead>
                <TableHead className="sticky top-0 z-20 hidden bg-card lg:table-cell w-[140px]">
                  {t('audit.ipAddress')}
                </TableHead>
                <TableHead className="sticky top-0 z-20 bg-card text-right w-[80px]">
                  {t('audit.actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow
                  key={log.id}
                  data-selected={selectedIds.has(log.id) || undefined}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(log.id)}
                      onCheckedChange={() => onToggleRow(log.id)}
                      aria-label={`${t('audit.selectRow')} ${log.id}`}
                    />
                  </TableCell>
                  <TableCell className="break-words font-mono text-xs">
                    {formatMmt(log.createdAt)}
                  </TableCell>
                  <TableCell className="max-w-32 truncate text-sm sm:max-w-40">
                    {log.userName ?? t('audit.system')}
                    {log.userEmail ? (
                      <span className="block truncate text-xs text-muted-foreground">
                        {log.userEmail}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="break-all font-mono text-xs">
                    {log.action}
                  </TableCell>
                  <TableCell className="hidden text-sm sm:table-cell">
                    {log.entityType}
                  </TableCell>
                  <TableCell className="hidden max-w-48 truncate text-sm text-muted-foreground lg:table-cell">
                    {log.summary}
                  </TableCell>
                  <TableCell className="hidden break-all font-mono text-xs lg:table-cell">
                    {log.ipAddress ?? t('audit.unknownIp')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-sky-300 bg-sky-100 text-sky-700 hover:bg-sky-200 hover:text-sky-800"
                      onClick={() => onViewDetail(log.id)}
                      aria-label={t('audit.viewDetail')}
                      title={t('audit.viewDetail')}
                      data-testid="btn-view-detail"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <AuditLogCards
        logs={logs}
        query={query}
        selectedIds={selectedIds}
        onToggleRow={onToggleRow}
        onViewDetail={onViewDetail}
      />
    </>
  );
};
