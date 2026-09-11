'use client';

import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaginationMetaDto } from '../types/orderInsights.types';

interface OrderPaginationProps {
  meta: PaginationMetaDto;
  onPageChange: (page: number) => void;
}

export function OrderPagination({ meta, onPageChange }: OrderPaginationProps) {
  const { t } = useTranslation();

  const totalPages = Math.ceil(meta.total / meta.limit);
  const showPagination = totalPages > 1;

  if (!showPagination) return null;

  return (
    <div className="flex items-center justify-between border-t pt-4 mt-4">
      <div className="text-sm text-muted-foreground">
        {t('common.pageInfo', {
          page: meta.page,
          totalPages,
          total: meta.total,
        })}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
          aria-label={t('common.actions.previous')}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">{t('common.actions.previous')}</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={meta.page >= totalPages}
          onClick={() => onPageChange(meta.page + 1)}
          aria-label={t('common.actions.next')}
        >
          <span className="hidden sm:inline">{t('common.actions.next')}</span>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}