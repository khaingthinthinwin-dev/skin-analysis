import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AUDIT_LOG_PAGE_SIZES } from '../schemas/auditLog.schema';

interface AuditLogPaginationProps {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

function buildPageItems(page: number, totalPages: number): Array<number | 'gap'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const candidates = new Set([
    1,
    2,
    totalPages - 1,
    totalPages,
    page - 1,
    page,
    page + 1,
  ]);
  const sorted = [...candidates]
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);
  const items: Array<number | 'gap'> = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) items.push('gap');
    items.push(p);
    prev = p;
  }
  return items;
}

export function AuditLogPagination({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
}: AuditLogPaginationProps) {
  const { t } = useTranslation();
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const items = buildPageItems(page, Math.max(totalPages, 1));

  return (
    <div
      className="flex flex-col items-center justify-between gap-3 sm:flex-row"
      aria-label={t('audit.paginationLabel')}
    >
      <span className="text-sm text-muted-foreground" data-testid="page-info">
        {t('audit.pageInfo', { from, to, total })}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label={t('audit.previous')}
        >
          <ChevronLeft className="h-4 w-4" />
          {t('audit.previous')}
        </Button>
        {items.map((item, index) =>
          item === 'gap' ? (
            <span
              key={`gap-${index}`}
              className="px-1 text-sm text-muted-foreground"
            >
              ...
            </span>
          ) : (
            <Button
              key={item}
              size="sm"
              variant={item === page ? 'default' : 'outline'}
              onClick={() => onPageChange(item)}
              aria-label={`${t('audit.goToPage')} ${item}`}
              aria-current={item === page ? 'page' : undefined}
            >
              {item}
            </Button>
          ),
        )}
        <Button
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label={t('audit.next')}
        >
          {t('audit.next')}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {t('audit.pageSize')}
        </span>
        <Select
          value={String(limit)}
          onValueChange={(value) => onLimitChange(Number(value))}
        >
          <SelectTrigger className="h-8 w-20" aria-label={t('audit.pageSize')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AUDIT_LOG_PAGE_SIZES.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
