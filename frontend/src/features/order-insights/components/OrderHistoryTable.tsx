'use client';

import { useTranslation } from 'react-i18next';
import { ChevronUp, ChevronDown, Truck } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from './StatusBadge';
import { PaymentBadge } from './PaymentBadge';
import { Button } from '@/components/ui/button';
import { OrderListRowDto, OrderSortField } from '../types/orderInsights.types';

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
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.resolvedLanguage || i18n.language || 'en-US';

  if (loading) {
    return (
      <Table>
        <TableHeader className="sticky top-0 z-10 border-b-2 border-[#7c3aed] bg-[#f3f0ff]">
          <TableRow className="border-b-0 hover:bg-transparent">
            <TableHead className="h-12 w-[180px]"><Skeleton className="h-4 w-24" /></TableHead>
            <TableHead className="h-12 w-[150px]"><Skeleton className="h-4 w-20" /></TableHead>
            <TableHead className="h-12 w-[100px]"><Skeleton className="h-4 w-16" /></TableHead>
            <TableHead className="h-12 w-[150px]"><Skeleton className="h-4 w-24" /></TableHead>
            <TableHead className="h-12 w-[160px]"><Skeleton className="h-4 w-24" /></TableHead>
            <TableHead className="h-12 w-[160px]"><Skeleton className="h-4 w-24" /></TableHead>
            <TableHead className="h-12 w-[80px]"><Skeleton className="h-4 w-16" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell className="font-mono text-xs"><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
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
    <TableHead className={`h-12 font-bold uppercase tracking-wider text-gray-700 ${className}`} aria-sort={currentSort === field ? `${currentOrder === 'asc' ? 'ascending' : 'descending'}` : 'none'}>
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-sm text-left font-bold uppercase tracking-wider text-gray-700 hover:text-[#7c3aed] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => onSort(field)}
      >
        {label}
        {renderSortIcon(field)}
      </button>
    </TableHead>
  );

  return (
    <>
      <div className="hidden min-h-[330px] max-w-full flex-1 self-stretch overflow-x-auto overflow-y-auto overscroll-contain sm:block [&>div]:overflow-visible">
      <Table className="min-w-[980px]">
        <TableHeader className="sticky top-0 z-10 border-b-2 border-[#7c3aed] bg-[#f3f0ff]">
          <TableRow className="border-b-0 hover:bg-transparent">
            <TableHead className="h-12 w-[180px] font-bold uppercase tracking-wider text-gray-700">{t('orders.table.orderId', 'Order #')}</TableHead>
            {renderSortableHeader(t('orders.table.date', 'Date'), 'createdAt', 'w-[150px]')}
            <TableHead className="h-12 w-[100px] text-center font-bold uppercase tracking-wider text-gray-700">{t('orders.table.items', 'Items')}</TableHead>
            {renderSortableHeader(t('orders.table.total', 'Total'), 'totalAmount', 'w-[150px] text-right pr-4 [&_button]:ml-auto')}
            <TableHead className="h-12 w-[160px] text-center font-bold uppercase tracking-wider text-gray-700">{t('orders.table.payment', 'Payment')}</TableHead>
            <TableHead className="h-12 w-[160px] text-center font-bold uppercase tracking-wider text-gray-700">{t('orders.table.status', 'Status')}</TableHead>
            <TableHead className="h-12 w-[80px] text-right font-bold uppercase tracking-wider text-gray-700">{t('orders.table.track', 'Track')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} className="py-3 hover:bg-muted/50 transition-colors">
              <TableCell className="py-3 px-4 font-mono text-xs font-medium">
                #{row.id.slice(0, 8).toUpperCase()}
              </TableCell>
              <TableCell className="py-3 px-4 text-sm text-muted-foreground">
                {new Date(row.createdAt).toLocaleDateString(dateLocale, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </TableCell>
              <TableCell className="py-3 px-4 text-center text-sm font-medium">
                {row.itemCount} {row.itemCount === 1 ? t('orders.table.item', 'Item') : t('orders.table.items', 'Items')}
              </TableCell>
              <TableCell className="py-3 text-right font-semibold text-foreground pr-4">
                ${parseFloat(row.totalAmount).toFixed(2)}
              </TableCell>
              <TableCell className="py-3 px-4 text-center text-sm">
                <PaymentBadge status={row.paymentStatus} />
              </TableCell>
              <TableCell className="py-3 px-4 text-center">
                <StatusBadge status={row.status} />
              </TableCell>
              <TableCell className="py-3 px-4 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 px-0"
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
      <div className="space-y-3 sm:hidden">
      {rows.map((row) => (
        <div key={row.id} className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-xs font-medium">
              #{row.id.slice(0, 8).toUpperCase()}
            </span>
            <StatusBadge status={row.status} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">{t('orders.table.date', 'Date')}</p>
              <p className="mt-1">
                {new Date(row.createdAt).toLocaleDateString(dateLocale, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{t('orders.table.total', 'Total')}</p>
              <p className="mt-1 font-semibold">${parseFloat(row.totalAmount).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('orders.table.items', 'Items')}</p>
              <p className="mt-1">
                {row.itemCount} {row.itemCount === 1 ? t('orders.table.item', 'Item') : t('orders.table.items', 'Items')}
              </p>
            </div>
            <div>
              <p className="text-right text-xs text-muted-foreground">{t('orders.table.payment', 'Payment')}</p>
              <div className="mt-1 flex justify-end">
                <PaymentBadge status={row.paymentStatus} />
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 w-full"
            onClick={() => onTrack(row.id)}
          >
            <Truck className="h-4 w-4" aria-hidden="true" />
            {t('orders.track', 'Track')}
          </Button>
        </div>
      ))}
      </div>
    </>
  );
}
