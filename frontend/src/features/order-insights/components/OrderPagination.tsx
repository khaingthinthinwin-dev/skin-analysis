'use client';

import { PaginationControls } from '@/components/PaginationControls';
import { PaginationMetaDto } from '../types/orderInsights.types';

interface OrderPaginationProps {
  meta: PaginationMetaDto;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  sizes?: number[];
}

export function OrderPagination({ meta, onPageChange, onLimitChange, sizes = [10, 20, 30] }: OrderPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.limit));

  return (
    <PaginationControls
      page={meta.page}
      totalPages={totalPages}
      onPageChange={onPageChange}
      limit={meta.limit}
      onLimitChange={onLimitChange}
      pageSizeOptions={sizes}
    />
  );
}
