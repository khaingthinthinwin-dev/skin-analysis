'use client';

import { useTranslation } from 'react-i18next';
import { ChevronUp, ChevronDown, Truck } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from './StatusBadge';
import { PaymentBadge } from './PaymentBadge';
import { Button } from '@/components/ui/button';
import { OrderListRowDto, OrderSortField } from '../types/orderInsights.types';
import { formatCurrencyAmount } from '../types/merchantOrderInsights.types';
import { toSlashDisplayDate } from '../utils/dateRangeLabel';

export interface OrderHistoryTableProps {
  rows: OrderListRowDto[];
  loading?: boolean;
  onView?: (orderId: string) => void;
  onTrack: (orderId: string) => void;
  onSort: (field: OrderSortField) => void;
  pagination: { page: number; limit: number; total: number };
  onPageChange: (page: number) => void;
  currentSort?: OrderSortField;
  currentOrder?: 'asc' | 'desc';
}

export function OrderHistoryTable({
  rows,
  loading,
  onView: _onView,
  onTrack,
  onSort,
  pagination: _pagination,
  onPageChange: _onPageChange,
  currentSort = 'createdAt',
  currentOrder = 'desc',
}: OrderHistoryTableProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <Table>
        <TableHeader className="sticky top-0 z-10 border-b-2 border-[#7c3aed] bg-[#f3f0ff] dark:border-violet-500 dark:bg-[#211a29] oidark:border-primary oidark:bg-muted">
          <TableRow className="border-b-0 hover:bg-transparent">
          <TableHead className="h-12 w-[130px] text-sm"><Skeleton className="h-4 w-24" /></TableHead>
            <TableHead className="h-12 w-[130px] text-sm"><Skeleton className="h-4 w-20" /></TableHead>
            <TableHead className="h-12 w-[180px] text-sm"><Skeleton className="h-4 w-24" /></TableHead>
            <TableHead className="h-12 w-[100px] text-sm"><Skeleton className="h-4 w-16" /></TableHead>
            <TableHead className="h-12 w-[150px] text-sm"><Skeleton className="h-4 w-24" /></TableHead>
            <TableHead className="h-12 w-[160px] text-sm"><Skeleton className="h-4 w-24" /></TableHead>
            <TableHead className="h-12 w-[160px] text-sm"><Skeleton className="h-4 w-24" /></TableHead>
            <TableHead className="h-12 w-[80px] text-sm"><Skeleton className="h-4 w-16" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i} className="oidark:border-surface-container-highest">
              <TableCell className="font-mono text-xs"><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-4 w-28" /></TableCell>
              <TableCell className="text-center"><Skeleton className="h-4 w-12" /></TableCell>
              <TableCell className="text-right pr-4"><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell className="text-center"><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell className="text-center"><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-4 w-16" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  const renderSortIcon = (field: OrderSortField) => {
    if (currentSort !== field) return null;
    return currentOrder === 'asc' ? (
      <ChevronUp className="h-4 w-4 text-foreground" />
    ) : (
      <ChevronDown className="h-4 w-4 text-foreground" />
    );
  };

  const renderSortableHeader = (label: string, field: OrderSortField, className = '') => (
    <TableHead className={`h-[60px] text-sm font-medium text-muted-foreground ${className}`} aria-sort={currentSort === field ? `${currentOrder === 'asc' ? 'ascending' : 'descending'}` : 'none'}>
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-sm text-left font-medium text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => onSort(field)}
      >
        {label}
        {renderSortIcon(field)}
      </button>
    </TableHead>
  );

  return (
    <>
      <div className="max-h-[285px] w-full max-w-full overflow-x-auto overflow-y-auto rounded-md border bg-card [&>div]:overflow-visible">
      <Table className="min-w-[1120px] border-separate border-spacing-0 text-[13px]">
        <TableHeader className="sticky top-0 z-20 border-b-2 border-[#7c3aed] bg-[#f3f0ff] dark:border-violet-500 dark:bg-[#211a29] oidark:border-primary oidark:bg-muted">
          <TableRow className="border-b-0 bg-[#f3f0ff] hover:bg-[#f3f0ff] dark:bg-[#211a29] dark:hover:bg-[#211a29] oidark:bg-muted oidark:hover:bg-muted">
            <TableHead className="h-[60px] w-[130px] text-sm font-medium text-muted-foreground">{t('orders.table.orderId', 'Order #')}</TableHead>
            {renderSortableHeader(t('orders.table.date', 'Date'), 'createdAt', 'w-[130px]')}
            <TableHead className="h-[60px] w-[180px] text-sm font-medium text-muted-foreground">{t('orders.table.shop', 'Shop')}</TableHead>
            <TableHead className="h-[60px] w-[100px] text-center text-sm font-medium text-muted-foreground">{t('orders.table.items', 'Items')}</TableHead>
            {renderSortableHeader(t('orders.table.total', 'Total'), 'totalAmount', 'w-[150px] text-right pr-4 [&_button]:ml-auto')}
            <TableHead className="h-[60px] w-[160px] text-center text-sm font-medium text-muted-foreground">{t('orders.table.payment', 'Payment')}</TableHead>
            <TableHead className="h-[60px] w-[160px] text-center text-sm font-medium text-muted-foreground">{t('orders.table.status', 'Status')}</TableHead>
            <TableHead className="h-[60px] w-[80px] text-right text-sm font-medium text-muted-foreground">{t('orders.table.track', 'Track')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} className="h-[45px] border-b border-border transition-colors hover:bg-muted/40">
              <TableCell className="border-b border-border px-3.5 py-2 font-mono text-xs font-medium dark:text-slate-100">
                #{row.id.slice(0, 8).toUpperCase()}
              </TableCell>
              <TableCell className="border-b border-border px-3.5 py-2 text-[13px] text-muted-foreground">
                {toSlashDisplayDate(row.createdAt)}
              </TableCell>
              <TableCell className="border-b border-border px-3.5 py-2 text-[13px] text-muted-foreground">{row.shopName || '—'}</TableCell>
              <TableCell className="border-b border-border px-3.5 py-2 text-center text-[13px] text-muted-foreground">
                {row.itemCount} {row.itemCount === 1 ? t('orders.table.item', 'Item') : t('orders.table.items', 'Items')}
              </TableCell>
              <TableCell className="border-b border-border px-3.5 py-2 text-right text-[13px] text-muted-foreground">
                {formatCurrencyAmount(row.totalAmount)}
              </TableCell>
              <TableCell className="border-b border-border px-3.5 py-2 text-center text-[13px] text-muted-foreground">
                <PaymentBadge status={row.paymentStatus} />
              </TableCell>
              <TableCell className="border-b border-border px-3.5 py-2 text-center text-[13px]">
                <StatusBadge status={row.status} />
              </TableCell>
              <TableCell className="border-b border-border px-3.5 py-2 text-right text-[13px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 px-0 dark:text-slate-200 dark:hover:bg-[#29252f] dark:hover:text-white"
                  title={t('orders.track', 'Track')}
                  aria-label={t('orders.track', 'Track')}
                  onClick={() => onTrack(row.id)}
                >
                  <Truck className="h-4 w-4" aria-hidden="true" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
    </>
  );
}
