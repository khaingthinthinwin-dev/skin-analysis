// [PET/PPH] Audit Log - Append-only security and platform action audit trail
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuditLogQuery } from '@/features/admin/audit-log/hooks/useAuditLogQuery';
import {
  useAuditLogDetail,
  useAuditLogFilters,
  useAuditLogs,
} from '@/features/admin/audit-log/hooks/useAuditLogs';
import { AuditLogHeader } from '@/features/admin/audit-log/components/AuditLogHeader';
import { AuditLogFilters } from '@/features/admin/audit-log/components/AuditLogFilters';
import { AuditLogTable } from '@/features/admin/audit-log/components/AuditLogTable';
import { AuditLogPagination } from '@/features/admin/audit-log/components/AuditLogPagination';
import { AuditLogDetailModal } from '@/features/admin/audit-log/components/AuditLogDetailModal';
import { AuditLogExportDialog } from '@/features/admin/audit-log/components/AuditLogExportDialog';
import { DeleteAuditLogsDialog } from '@/features/admin/audit-log/components/DeleteAuditLogsDialog';
import {
  downloadCsv,
  toExportParams,
} from '@/features/admin/audit-log/services/auditLog.service';
import type { AuditLogQueryState } from '@/features/admin/audit-log/schemas/auditLog.schema';

function extractApiMessage(error: unknown): string | null {
  if (error && typeof error === 'object') {
    const axiosError = error as {
      response?: { data?: unknown };
      message?: string;
    };
    const data = axiosError.response?.data;
    if (data && typeof data === 'object') {
      const message = (data as { message?: string | string[] }).message;
      if (Array.isArray(message)) return message.filter(Boolean).join('; ');
      if (typeof message === 'string' && message) return message;
    }
    if (typeof axiosError.message === 'string') return axiosError.message;
  }
  return null;
}

// Export requests use responseType: 'blob', so a 400 body arrives as a Blob
// rather than parsed JSON — unwrap it before reading `message`.
async function extractExportApiMessage(error: unknown): Promise<string | null> {
  const axiosError = error as { response?: { data?: unknown } } | null;
  const data = axiosError?.response?.data;
  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    try {
      const parsed: unknown = JSON.parse(await data.text());
      const message = extractApiMessage({ response: { data: parsed } });
      return message;
    } catch {
      return null;
    }
  }
  return extractApiMessage(error);
}

export default function AuditLog() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { query, patch, clearFilters, activeFilterCount } = useAuditLogQuery();
  const filterOptions = useAuditLogFilters();
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { listQuery, exportMutation, deleteMutation, refreshError } =
    useAuditLogs(query, { autoRefresh });

  const detailQuery = useAuditLogDetail(detailId);

  const handlePatch = useCallback(
    (values: Partial<AuditLogQueryState>) => patch(values),
    [patch],
  );

  const handleSort = (sortBy: AuditLogQueryState['sortBy']) => {
    if (query.sortBy === sortBy) {
      patch(
        { sortOrder: query.sortOrder === 'asc' ? 'desc' : 'asc', sortBy },
        { resetPage: false },
      );
    } else {
      patch({ sortBy, sortOrder: 'desc' }, { resetPage: false });
    }
  };

  // Opens the date-range dialog; the export itself runs on confirm.
  const handleExport = () => {
    const total = listQuery.data?.meta.total ?? 0;
    if (total === 0) {
      toast.info(t('audit.exportEmpty'));
      return;
    }
    setExportOpen(true);
  };

  const handleExportConfirm = (dateFrom: string, dateTo: string) => {
    exportMutation.mutate(
      { ...toExportParams(query), dateFrom, dateTo },
      {
        onSuccess: (download) => {
          setExportOpen(false);
          downloadCsv(download);
          toast.success(t('audit.exportSuccess'));
        },
        onError: async (error) => {
          const message = await extractExportApiMessage(error);
          toast.error(message ?? t('audit.exportFailed'));
        },
      },
    );
  };

  const handleDeleteConfirm = (olderThanDays: number, recordIds?: string[]) => {
    setDeleteError(null);
    deleteMutation.mutate(
      {
        olderThanDays,
        ...(recordIds && recordIds.length > 0 ? { recordIds } : {}),
      },
      {
        onSuccess: (result) => {
          setDeleteOpen(false);
          setSelectedIds(new Set());
          toast.success(
            t('audit.deleteSuccess', { count: result.deletedRecords }),
          );
        },
        onError: (error) => {
          setDeleteError(extractApiMessage(error) ?? t('audit.deleteFailed'));
        },
      },
    );
  };

  const handleOpenDelete = () => {
    setDeleteError(null);
    setDeleteOpen(true);
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleAll = () => {
    const items = listQuery.data?.items ?? [];
    const allSelected =
      items.length > 0 && items.every((item) => selectedIds.has(item.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const item of items) next.delete(item.id);
      } else {
        for (const item of items) next.add(item.id);
      }
      return next;
    });
  };

  const meta = listQuery.data?.meta;
  const is403 =
    listQuery.error !== null &&
    typeof listQuery.error === 'object' &&
    (listQuery.error as { response?: { status?: number } }).response?.status ===
      403;

  if (is403) {
    navigate('/unauthorized', { replace: true });
    return null;
  }

  const showLoadError = listQuery.isError && !listQuery.data;

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
      <AuditLogHeader
        autoRefresh={autoRefresh}
        onAutoRefreshChange={setAutoRefresh}
        onExport={handleExport}
        onDelete={handleOpenDelete}
        exportPending={exportMutation.isPending}
      />

      {(refreshError || showLoadError) && (
        <div
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive font-medium"
          role="alert"
          data-testid="audit-load-error"
        >
          {extractApiMessage(listQuery.error) ?? t('audit.loadFailed')}
        </div>
      )}

      <AuditLogFilters
        query={query}
        options={filterOptions.data}
        activeCount={activeFilterCount}
        onChange={handlePatch}
        onClear={clearFilters}
      />

      {listQuery.isLoading ? (
        <div className="space-y-3 rounded-xl border border-border/60 bg-card/60 p-4" aria-busy="true" aria-live="polite">
          <div className="h-12 animate-pulse rounded-lg bg-muted/70" />
          <div className="h-12 animate-pulse rounded-lg bg-muted/60" />
          <div className="h-12 animate-pulse rounded-lg bg-muted/50" />
          <div className="h-12 animate-pulse rounded-lg bg-muted/40" />
          <span className="sr-only">{t('audit.loading')}</span>
        </div>
      ) : (
        <div className="space-y-4">
          <AuditLogTable
            logs={listQuery.data?.items ?? []}
            query={query}
            selectedIds={selectedIds}
            onToggleRow={handleToggleRow}
            onToggleAll={handleToggleAll}
            onViewDetail={setDetailId}
            onSort={handleSort}
            sortKey={query.sortBy}
          />
          {meta && (
            <AuditLogPagination
              page={meta.page}
              limit={meta.limit}
              total={meta.total}
              totalPages={meta.totalPages}
              onPageChange={(page) => patch({ page }, { resetPage: false })}
              onLimitChange={(limit) => patch({ limit, page: 1 })}
            />
          )}
        </div>
      )}

      <AuditLogDetailModal
        open={detailId !== null}
        onClose={() => setDetailId(null)}
        detail={detailQuery.data}
        loading={detailQuery.isLoading}
        error={detailQuery.isError}
      />

      <AuditLogExportDialog
        key={`export-${exportOpen}-${query.dateFrom ?? ''}-${query.dateTo ?? ''}`}
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        pending={exportMutation.isPending}
        onConfirm={handleExportConfirm}
        initialDateFrom={query.dateFrom}
        initialDateTo={query.dateTo}
      />

      <DeleteAuditLogsDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        selectedCount={selectedIds.size}
        pending={deleteMutation.isPending}
        onConfirm={(olderThanDays) => {
          // Explicit selection → send those IDs; otherwise retention-wide.
          handleDeleteConfirm(
            olderThanDays,
            selectedIds.size > 0 ? Array.from(selectedIds) : undefined,
          );
        }}
        errorMessage={deleteError}
      />
    </div>
  );
}
