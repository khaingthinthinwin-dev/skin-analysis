'use client';

import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PaginationMetaDto } from '../types/orderInsights.types';

interface OrderPaginationProps {
  meta: PaginationMetaDto;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

export function OrderPagination({ meta, onPageChange, onLimitChange }: OrderPaginationProps) {
  const { t } = useTranslation();

  const totalPages = Math.ceil(meta.total / meta.limit);

  const firstItem = (meta.page - 1) * meta.limit + 1;
  const lastItem = Math.min(meta.page * meta.limit, meta.total);

  return (
    <div className="mt-6 flex flex-col gap-4 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {t('common.pagination.showing', 'Showing')}{' '}
        <span className="font-medium text-foreground">{firstItem}-{lastItem}</span>{' '}
        {t('common.pagination.of', 'of')}{' '}
        <span className="font-medium text-foreground">{meta.total}</span>{' '}
        {t('buyer.orders.orders', 'orders')}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">{t('common.pagination.show', 'Show')}</span>
        <Select value={String(meta.limit)} onValueChange={(value) => onLimitChange(Number(value))}>
          <SelectTrigger className="h-9 w-[70px] border-violet-300 focus:border-violet-500 focus:ring-violet-500">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[10, 20, 30].map((size) => (
              <SelectItem key={size} value={String(size)}>{size}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          disabled={meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
          aria-label={t('common.actions.previous', 'Previous')}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">{t('common.actions.previous', 'Previous')}</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={meta.page >= totalPages}
          onClick={() => onPageChange(meta.page + 1)}
          aria-label={t('common.actions.next', 'Next')}
        >
          <span className="hidden sm:inline">{t('common.actions.next', 'Next')}</span>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
