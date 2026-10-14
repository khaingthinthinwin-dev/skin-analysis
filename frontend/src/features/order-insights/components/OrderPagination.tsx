'use client';

import { useTranslation } from 'react-i18next';
import { PaginationControls } from '@/components/PaginationControls';
import { PaginationMetaDto } from '../types/orderInsights.types';

interface OrderPaginationProps {
  meta: PaginationMetaDto;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  sizes?: number[];
}

export function OrderPagination({ meta, onPageChange, onLimitChange, sizes = [10, 20, 50, 100] }: OrderPaginationProps) {
  const { t } = useTranslation();

  const startIndex = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const endIndex = Math.min(meta.page * meta.limit, meta.total);

  const totalPages = Math.ceil(meta.total / meta.limit);
  const safeTotal = Math.max(totalPages || 1, 1);
  const prevDisabled = meta.page <= 1;
  const nextDisabled = meta.page >= safeTotal;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (safeTotal <= 7) {
      for (let i = 1; i <= safeTotal; i++) pages.push(i);
    } else {
      pages.push(1);
      if (meta.page > 3) pages.push('...');
      const start = Math.max(2, meta.page - 1);
      const end = Math.min(safeTotal - 1, meta.page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (meta.page < safeTotal - 2) pages.push('...');
      pages.push(safeTotal);
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 select-none">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <span className="hidden sm:inline">{t('common.pagination.rows', 'Rows:')}</span>
          <select
            aria-label={t('common.pagination.rowsAria', 'Rows per page')}
            value={meta.limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="h-8 rounded-md border border-border bg-card px-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer hover:border-primary/50 transition-colors"
          >
            {sizes.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <span className="text-[13px] text-muted-foreground transition-opacity duration-200">
          {t(
            'common.pagination.showingOrders',
            'Showing {start}–{end} of {total} orders',
            { start: startIndex, end: endIndex, total: meta.total }
          )}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          aria-label={t('common.actions.previous', 'Previous page')}
          type="button"
          className={`h-8 px-2.5 rounded-md flex items-center justify-center text-[13px] border font-medium
            transition-all duration-200 ease-in-out active:scale-95
            ${prevDisabled
              ? 'bg-card border-border text-muted-foreground/40 cursor-not-allowed opacity-50 active:scale-100'
              : 'bg-card border-border text-muted-foreground cursor-pointer hover:bg-primary/10 hover:border-primary/50 hover:text-primary'
            }`}
          disabled={prevDisabled}
          onClick={() => onPageChange(meta.page - 1)}
        >
          {'<'} Prev
        </button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((p, idx) => {
            if (typeof p === 'string') {
              return (
                <span key={`ellipsis-${idx}`} className="px-1 text-xs text-muted-foreground select-none">
                  •••
                </span>
              );
            }
            const isCurrent = p === meta.page;
            return (
              <button
                key={p}
                type="button"
                aria-current={isCurrent ? 'page' : undefined}
                className={`h-8 w-8 rounded-md flex items-center justify-center text-[13px] font-medium border
                  transition-all duration-200 ease-in-out active:scale-95
                  ${isCurrent
                    ? 'bg-primary border-primary text-primary-foreground font-semibold shadow-sm scale-105'
                    : 'bg-card border-border text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-muted/50 cursor-pointer'
                  }`}
                onClick={() => onPageChange(p)}
              >
                {p}
              </button>
            );
          })}
        </div>

        <button
          aria-label={t('common.actions.next', 'Next page')}
          type="button"
          className={`h-8 px-2.5 rounded-md flex items-center justify-center text-[13px] border font-medium
            transition-all duration-200 ease-in-out active:scale-95
            ${nextDisabled
              ? 'bg-card border-border text-muted-foreground/40 cursor-not-allowed opacity-50 active:scale-100'
              : 'bg-card border-border text-muted-foreground cursor-pointer hover:bg-primary/10 hover:border-primary/50 hover:text-primary'
            }`}
          disabled={nextDisabled}
          onClick={() => onPageChange(meta.page + 1)}
        >
          Next {'>'}
        </button>
      </div>
    </div>
  );
}
