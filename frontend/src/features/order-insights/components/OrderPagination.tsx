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

  const firstItem = (meta.page - 1) * meta.limit + 1;
  const lastItem = Math.min(meta.page * meta.limit, meta.total);

  return (
    <div className="flex flex-col gap-3 border-t border-gray-100 oidark:border-surface-container-highest px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-2">
      <p className="text-[13px] text-gray-500 oidark:text-muted-foreground">
        {t('common.pagination.showing', 'Showing')}{' '}
        <span className="font-medium text-foreground">{firstItem}-{lastItem}</span>{' '}
        {t('common.pagination.of', 'of')}{' '}
        <span className="font-medium text-foreground">{meta.total}</span>{' '}
        {t('buyer.orders.orders', 'orders')}
      </p>

      <div className="flex items-center justify-end gap-2">
        <span className="text-[13px] text-gray-500 oidark:text-muted-foreground">{t('common.pagination.show', 'Show')}</span>
        <Select value={String(meta.limit)} onValueChange={(value) => onLimitChange(Number(value))}>
          <SelectTrigger className="h-[30px] w-[60px] border-gray-200 px-2 text-[13px] oidark:border-outline-variant focus:border-[#7c3aed] focus:ring-[#7c3aed]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sizes.map((size) => (
              <SelectItem key={size} value={String(size)}>{size}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          type="button"
          className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-[6px] border border-gray-200 bg-white text-gray-500 hover:border-[#7c3aed] hover:text-[#7c3aed] oidark:border-outline-variant oidark:bg-surface-container-high oidark:text-on-surface-variant oidark:hover:border-primary oidark:hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          disabled={meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
          aria-label={t('common.actions.previous', 'Previous')}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-[6px] border border-gray-200 bg-white text-gray-500 hover:border-[#7c3aed] hover:text-[#7c3aed] oidark:border-outline-variant oidark:bg-surface-container-high oidark:text-on-surface-variant oidark:hover:border-primary oidark:hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          disabled={meta.page >= totalPages}
          onClick={() => onPageChange(meta.page + 1)}
          aria-label={t('common.actions.next', 'Next')}
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
