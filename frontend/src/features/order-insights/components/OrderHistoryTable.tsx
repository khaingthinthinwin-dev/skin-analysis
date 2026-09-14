'use client';

import { useTranslation } from 'react-i18next';
import { ChevronRight, ChevronUp, ChevronDown, Truck } from 'lucide-react';
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
  const { t } = useTranslation();

  if (loading) {
    return (
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[180px]"><Skeleton className="h-4 w-24" /></TableHead>
            <TableHead className="w-[140px]"><Skeleton className="h-4 w-20" /></TableHead>
            <TableHead className="w-[80px]"><Skeleton className="h-4 w-16" /></TableHead>
            <TableHead className="w-[120px]"><Skeleton className="h-4 w-24" /></TableHead>
            <TableHead className="w-[120px]"><Skeleton className="h-4 w-24" /></TableHead>
            <TableHead className="w-[120px]"><Skeleton className="h-4 w-24" /></TableHead>
            <TableHead className="w-[80px]"><Skeleton className="h-4 w-16" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell className="font-mono text-xs"><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-4 w-12" /></TableCell>
              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell><Skeleton className="h-4 w-16" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  const renderSortIcon = (field: OrderSortField) => {
    if (currentSort !== field) return (
      <span className="flex items-center gap-1 text-muted-foreground/50">
        <ChevronUp className="h-3 w-3" /><ChevronDown className="h-3 w-3" />
      </span>
    );
    return currentOrder === 'asc' ? (
      <ChevronUp className="h-4 w-4 text-foreground" />
    ) : (
      <ChevronDown className="h-4 w-4 text-foreground" />
    );
  };

  const handleHeaderClick = (field: OrderSortField) => {
    onSort(field);
  };

  return (
    <>
      <div className="hidden sm:block overflow-x-auto">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[180px] cursor-pointer hover:bg-muted/50"
              onClick={() => handleHeaderClick('createdAt')}>
              <div className="flex items-center gap-1">
                {t('orders.table.orderId')}
                {renderSortIcon('createdAt')}
              </div>
            </TableHead>
            <TableHead className="w-[140px] cursor-pointer hover:bg-muted/50"
              onClick={() => handleHeaderClick('createdAt')}>
              <div className="flex items-center gap-1">
                {t('orders.table.date')}
                {renderSortIcon('createdAt')}
              </div>
            </TableHead>
            <TableHead className="w-[80px] text-center">{t('orders.table.items')}</TableHead>
            <TableHead className="w-[120px] text-right cursor-pointer hover:bg-muted/50"
              onClick={() => handleHeaderClick('totalAmount')}>
              <div className="flex items-center justify-end gap-1">
                {t('orders.table.total')}
                {renderSortIcon('totalAmount')}
              </div>
            </TableHead>
            <TableHead className="w-[120px]">{t('orders.table.payment')}</TableHead>
            <TableHead className="w-[120px] cursor-pointer hover:bg-muted/50"
              onClick={() => handleHeaderClick('status')}>
              <div className="flex items-center gap-1">
                {t('orders.table.status')}
                {renderSortIcon('status')}
              </div>
            </TableHead>
            <TableHead className="w-[80px] text-right">{t('orders.table.track')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} className="hover:bg-muted/50 transition-colors">
              <TableCell className="font-mono text-xs font-medium">
                #{row.id.slice(0, 8).toUpperCase()}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(row.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </TableCell>
              <TableCell className="text-center text-sm font-medium">
                {row.itemCount} {row.itemCount === 1 ? t('orders.table.item') : t('orders.table.items')}
              </TableCell>
              <TableCell className="text-right font-semibold text-foreground">
                ${parseFloat(row.totalAmount).toFixed(2)}
              </TableCell>
              <TableCell className="text-sm">
                <PaymentBadge status={row.paymentStatus} />
              </TableCell>
              <TableCell>
                <StatusBadge status={row.status} />
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 h-7 px-2"
                  onClick={() => onTrack(row.id)}
                >
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">{t('orders.track')}</span>
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
              <p className="text-xs text-muted-foreground">{t('orders.table.date')}</p>
              <p className="mt-1">
                {new Date(row.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{t('orders.table.total')}</p>
              <p className="mt-1 font-semibold">${parseFloat(row.totalAmount).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('orders.table.items')}</p>
              <p className="mt-1">
                {row.itemCount} {row.itemCount === 1 ? t('orders.table.item') : t('orders.table.items')}
              </p>
            </div>
            <div>
              <p className="text-right text-xs text-muted-foreground">{t('orders.table.payment')}</p>
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
            {t('orders.track')}
          </Button>
        </div>
      ))}
      </div>
    </>
  );
}