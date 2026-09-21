import { useTranslation } from 'react-i18next';
import { Eye, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PaymentBadge } from './PaymentBadge';
import { StatusBadge } from './StatusBadge';
import type { OrderSortField } from '../types/orderInsights.types';
import type { MerchantOrderListRowDto } from '../types/merchantOrderInsights.types';
import { formatCurrencyAmount } from '../types/merchantOrderInsights.types';

export interface MerchantOrderTableProps {
  rows: MerchantOrderListRowDto[];
  loading?: boolean;
  onView: (id: string) => void;
  onTrack: (id: string) => void;
  onSort: (field: OrderSortField) => void;
  currentSort: OrderSortField;
  currentOrder: 'asc' | 'desc';
}

/** Renders the merchant order list as a desktop table and mobile cards. */
export function MerchantOrderTable({ rows, loading, onView, onTrack, onSort, currentSort, currentOrder }: MerchantOrderTableProps) {
  const { t } = useTranslation();
  const dateLocale = 'en-US';
  const sortIcon = (field: OrderSortField) => currentSort === field ? (currentOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />) : null;
  const sortButton = (label: string, field: OrderSortField) => <button type="button" className="inline-flex items-center gap-1 font-bold uppercase tracking-wider" onClick={() => onSort(field)}>{label}{sortIcon(field)}</button>;

  if (loading) return <div className="space-y-3 p-4">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-12 w-full" />)}</div>;

  return <>
    <div className="hidden overflow-x-auto sm:block">
      <Table className="min-w-[1120px]">
        <TableHeader className="border-b-2 border-[#7c3aed] bg-[#f3f0ff]"><TableRow>
          <TableHead>{t('orders.table.orderId', 'Order #')}</TableHead><TableHead>{sortButton(t('orders.table.date', 'Date'), 'createdAt')}</TableHead>
          <TableHead>{t('orders.table.customer', 'Customer')}</TableHead><TableHead className="text-center">{t('orders.table.items', 'Items')}</TableHead>
          <TableHead className="text-right">{sortButton(t('orders.table.total', 'Total'), 'totalAmount')}</TableHead><TableHead className="text-center">{t('orders.table.payment', 'Payment')}</TableHead><TableHead className="text-center">{t('orders.table.status', 'Status')}</TableHead><TableHead className="text-right">{t('orders.table.actions', 'Actions')}</TableHead>
        </TableRow></TableHeader>
        <TableBody>{rows.map((row) => <TableRow key={row.id}>
          <TableCell className="font-mono text-xs">#{row.id.slice(0, 8).toUpperCase()}</TableCell><TableCell>{new Date(row.createdAt).toLocaleDateString(dateLocale, { year: 'numeric', month: 'short', day: 'numeric' })}</TableCell>
          <TableCell>{row.customerName}</TableCell><TableCell className="text-center">{row.itemCount}</TableCell><TableCell className="text-right font-semibold">{formatCurrencyAmount(row.totalAmount)}</TableCell>
          <TableCell className="text-center"><PaymentBadge status={row.paymentStatus} /></TableCell><TableCell className="text-center"><StatusBadge status={row.status} /></TableCell>
          <TableCell><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" title={t('common.view', 'View')} aria-label={t('common.view', 'View')} onClick={() => onView(row.id)}><Eye className="h-4 w-4" /></Button><Button variant="ghost" size="icon" title={t('orders.track', 'Track')} aria-label={t('orders.track', 'Track')} onClick={() => onTrack(row.id)}><MapPin className="h-4 w-4" /></Button></div></TableCell>
        </TableRow>)}</TableBody>
      </Table>
    </div>
    <div className="space-y-3 sm:hidden">{rows.map((row) => <div key={row.id} className="rounded-lg border bg-card p-4"><div className="flex justify-between gap-3"><span className="font-mono text-xs">#{row.id.slice(0, 8).toUpperCase()}</span><StatusBadge status={row.status} /></div><dl className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-muted-foreground">{t('orders.table.date', 'Date')}</dt><dd>{new Date(row.createdAt).toLocaleDateString(dateLocale)}</dd></div><div><dt className="text-xs text-muted-foreground">{t('orders.table.customer', 'Customer')}</dt><dd>{row.customerName}</dd></div><div><dt className="text-xs text-muted-foreground">{t('orders.table.items', 'Items')}</dt><dd>{row.itemCount}</dd></div><div><dt className="text-xs text-muted-foreground">{t('orders.table.total', 'Total')}</dt><dd className="font-semibold">{formatCurrencyAmount(row.totalAmount)}</dd></div></dl><div className="mt-3 flex items-center justify-between"><PaymentBadge status={row.paymentStatus} /><div className="flex gap-1"><Button variant="outline" size="sm" onClick={() => onView(row.id)}><Eye className="mr-1 h-4 w-4" />{t('common.view', 'View')}</Button><Button variant="outline" size="sm" onClick={() => onTrack(row.id)}><MapPin className="mr-1 h-4 w-4" />{t('orders.track', 'Track')}</Button></div></div></div>)}</div>
  </>;
}