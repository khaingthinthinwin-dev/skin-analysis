'use client';

import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PaginationMetaDto } from '../types/orderInsights.types';

interface OrderPaginationProps {
  meta: PaginationMetaDto;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  sizes?: number[];
}

export function OrderPagination({ meta, onPageChange, onLimitChange, sizes = [10, 20, 30] }: OrderPaginationProps) {
  const { t } = useTranslation();

  const totalPages = Math.ceil(meta.total / meta.limit);

  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <div className="flex flex-col gap-3 px-0 pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <span>{t('common.pagination.rows', 'Rows:')}</span>
        <Select value={String(meta.limit)} onValueChange={(value) => onLimitChange(Number(value))}>
          <SelectTrigger className="h-10 w-[78px] border-border px-3 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sizes.map((size) => (
              <SelectItem key={size} value={String(size)}>{size}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-1">Showing page <span className="font-medium text-foreground">{meta.page}</span> of <span className="font-medium text-foreground">{totalPages}</span></span>
      </div>

      <div className="flex items-center justify-end gap-1.5">
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center rounded-md border border-border px-3 text-sm hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          disabled={meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
          aria-label={t('common.actions.previous', 'Previous')}
        >
          <ChevronLeft className="mr-1 h-4 w-4" aria-hidden="true" />Prev
        </button>
        {pageNumbers.map((page) => (
          <button key={page} type="button" aria-current={meta.page === page ? 'page' : undefined}
            className={`inline-flex h-10 min-w-10 items-center justify-center rounded-md border px-3 text-sm font-semibold ${meta.page === page ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-foreground hover:border-primary hover:text-primary'}`}
            onClick={() => onPageChange(page)}>{page}</button>
        ))}
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center rounded-md border border-border px-3 text-sm hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          disabled={meta.page >= totalPages}
          onClick={() => onPageChange(meta.page + 1)}
          aria-label={t('common.actions.next', 'Next')}
        >
          Next<ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
