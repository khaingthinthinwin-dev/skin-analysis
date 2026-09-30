'use client';

import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PaymentBadge } from './PaymentBadge';
import { StatusBadge } from './StatusBadge';
import type { OrderSortField } from '../types/orderInsights.types';
import type { AdminOrderListRowDto } from '../types/adminOrderInsights.types';
import { formatCurrencyAmount } from '../types/merchantOrderInsights.types';

interface AdminOrderTableProps {
  rows: AdminOrderListRowDto[];
  loading?: boolean;
  onSort: (field: OrderSortField) => void;
  currentSort: OrderSortField;
  currentOrder: 'asc' | 'desc';
}

export function AdminOrderTable({ rows, loading = false, onSort, currentSort, currentOrder }: AdminOrderTableProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || i18n.language || 'en-US';

  if (loading) {
    return <div className="space-y-3 p-4" aria-busy="true">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-12 w-full" />)}</div>;
  }

  const sortButton = (label: string, field: OrderSortField) => (
    <button type="button" onClick={() => onSort(field)} className="inline-flex items-center gap-1 font-bold uppercase tracking-wider hover:text-primary" aria-sort={currentSort === field ? (currentOrder === 'asc' ? 'ascending' : 'descending') : 'none'}>
      {label}{currentSort === field ? (currentOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />) : null}
    </button>
  );
  const formatDate = (value: string) => new Date(value).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
  const formatAmount = (value: string) => formatCurrencyAmount(value);
  const orderNumber = (id: string) => `#${id.slice(0, 8).toUpperCase()}`;

  return (
    <>
      <div className="hidden overflow-x-auto sm:block">
        <Table className="min-w-[1200px]">
          <TableHeader className="sticky top-0 z-10 border-b-2 border-primary bg-muted">
            <TableRow>
              <TableHead className="font-bold uppercase">{t('orders.table.orderId', 'Order #')}</TableHead>
              <TableHead className="font-bold uppercase">{sortButton(t('orders.table.date', 'Date'), 'createdAt')}</TableHead>
              <TableHead className="font-bold uppercase">{t('orders.table.shop', 'Shop / Merchant')}</TableHead>
              <TableHead className="font-bold uppercase">{t('orders.table.customer', 'Buyer')}</TableHead>
              <TableHead className="text-center font-bold uppercase">{t('orders.table.items', 'Items')}</TableHead>
              <TableHead className="text-right font-bold uppercase">{sortButton(t('orders.table.total', 'Total'), 'totalAmount')}</TableHead>
              <TableHead className="text-center font-bold uppercase">{t('orders.table.payment', 'Payment')}</TableHead>
              <TableHead className="text-center font-bold uppercase">{sortButton(t('orders.table.status', 'Status'), 'status')}</TableHead>
              <TableHead className="text-right font-bold uppercase">{t('orders.table.actions', 'Actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono text-xs">{orderNumber(row.id)}</TableCell>
                <TableCell>{formatDate(row.createdAt)}</TableCell>
                <TableCell>{row.shopName}</TableCell>
                <TableCell>{row.customerName}</TableCell>
                <TableCell className="text-center">{row.itemCount}</TableCell>
                <TableCell className="text-right font-semibold">{formatAmount(row.totalAmount)}</TableCell>
                <TableCell className="text-center"><PaymentBadge status={row.paymentStatus} /></TableCell>
                <TableCell className="text-center"><StatusBadge status={row.status} /></TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="sm" aria-label={t('common.view', 'View')}>
                    <Link to={`/admin/orders/${row.id}`}><Eye className="mr-1 h-4 w-4" aria-hidden="true" />{t('common.view', 'View')}</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="space-y-3 sm:hidden">
        {rows.map((row) => (
          <article key={row.id} className="rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-3"><span className="font-mono text-xs">{orderNumber(row.id)}</span><StatusBadge status={row.status} /></div>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs text-muted-foreground">{t('orders.table.date', 'Date')}</dt><dd>{formatDate(row.createdAt)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">{t('orders.table.shop', 'Shop / Merchant')}</dt><dd>{row.shopName}</dd></div>
              <div><dt className="text-xs text-muted-foreground">{t('orders.table.customer', 'Buyer')}</dt><dd>{row.customerName}</dd></div>
              <div><dt className="text-xs text-muted-foreground">{t('orders.table.items', 'Items')}</dt><dd>{row.itemCount}</dd></div>
              <div><dt className="text-xs text-muted-foreground">{t('orders.table.total', 'Total')}</dt><dd className="font-semibold">{formatAmount(row.totalAmount)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">{t('orders.table.payment', 'Payment')}</dt><dd><PaymentBadge status={row.paymentStatus} /></dd></div>
            </dl>
            <Button asChild variant="outline" size="sm" className="mt-4 w-full"><Link to={`/admin/orders/${row.id}`}><Eye className="mr-1 h-4 w-4" aria-hidden="true" />{t('common.view', 'View')}</Link></Button>
          </article>
        ))}
      </div>
    </>
  );
}
