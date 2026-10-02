import { useTranslation } from 'react-i18next';
import { Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PaymentBadge } from './PaymentBadge';
import { StatusBadge } from './StatusBadge';
import type { OrderSortField } from '../types/orderInsights.types';
import type { MerchantOrderListRowDto } from '../types/merchantOrderInsights.types';
import { formatCurrencyAmount } from '../types/merchantOrderInsights.types';
import { formatCommissionRatePercent } from '../utils/orderCommission';

export interface MerchantOrderTableProps {
  rows: MerchantOrderListRowDto[];
  loading?: boolean;
  onView: (id: string) => void;
  onSort: (field: OrderSortField) => void;
  currentSort: OrderSortField;
  currentOrder: 'asc' | 'desc';
}

/** Renders the merchant order list as a desktop table and mobile cards. */
export function MerchantOrderTable({ rows, loading, onView, onSort, currentSort, currentOrder }: MerchantOrderTableProps) {
  const { t } = useTranslation();
  const dateLocale = 'en-US';
  const sortIcon = (field: OrderSortField) => currentSort === field ? (currentOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />) : null;
  const ariaSort = (field: OrderSortField) => currentSort === field ? (currentOrder === 'asc' ? 'ascending' : 'descending') : 'none';
  const sortButton = (label: string, field: OrderSortField) => <button type="button" className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => onSort(field)}>{label}{sortIcon(field)}</button>;
  // Header cells mirror the Buyer Order Insights table: 48px band, uppercase gray-700 labels.
  const headClassName = 'h-[60px] whitespace-nowrap text-sm font-medium text-muted-foreground';
  // The rate CHARGED on this order (`orders.commission_rate`, merchant rows only — DD §2.4
  // Section [D]). Deliberately NOT the BR-OI-023 platform-rate fallback the CSV export
  // applies: the rows here are not scoped to the Revenue Summary period, so quoting today's
  // platform rate on a list that can span months would misstate the older orders. A row the
  // API cannot report a rate for shows the same em dash as the other empty figures
  // (BR-OI-030), never a fabricated "0%".
  const rateLabel = (row: MerchantOrderListRowDto) => formatCommissionRatePercent(row.commissionRate) ?? '—';

  if (loading) return <div className="space-y-3 p-4">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-12 w-full" />)}</div>;

  return <>
    <div className="hidden overflow-x-auto rounded-md border bg-card sm:block [&>div]:overflow-visible">
      <Table className="min-w-[1120px] border-separate border-spacing-0 text-[13px]">
        <TableHeader className="sticky top-0 z-10"><TableRow className="border-b-0 bg-primary/10 hover:bg-primary/10">
          <TableHead className={headClassName}>{t('orders.table.orderId', 'Order #')}</TableHead>
          <TableHead className={headClassName} aria-sort={ariaSort('createdAt')}>{sortButton(t('orders.table.date', 'Date'), 'createdAt')}</TableHead>
          <TableHead className={headClassName}>{t('orders.table.customer', 'Customer')}</TableHead>
          <TableHead className={`${headClassName} text-center`}>{t('orders.table.items', 'Items')}</TableHead>
          <TableHead className={`${headClassName} text-right [&_button]:ml-auto`} aria-sort={ariaSort('totalAmount')}>{sortButton(t('orders.table.total', 'Total'), 'totalAmount')}</TableHead>
          <TableHead className={`${headClassName} text-center`}>{t('merchant.orders.table.commissionRate', 'Commission Rate')}</TableHead>
          <TableHead className={`${headClassName} text-center`}>{t('orders.table.payment', 'Payment')}</TableHead>
          <TableHead className={`${headClassName} text-center`}>{t('orders.table.status', 'Status')}</TableHead>
          <TableHead className={`${headClassName} text-right`}>{t('orders.table.actions', 'Actions')}</TableHead>
        </TableRow></TableHeader>
        <TableBody>{rows.map((row) => <TableRow key={row.id} className="border-b border-border text-gray-900 transition-colors hover:bg-muted/40">
          <TableCell className="border-b border-border px-3.5 py-3 font-mono text-xs font-medium dark:text-slate-100">#{row.id.slice(0, 8).toUpperCase()}</TableCell>
          <TableCell className="border-b border-border px-3.5 py-3 text-[13px] text-muted-foreground">{new Date(row.createdAt).toLocaleDateString(dateLocale, { year: 'numeric', month: 'short', day: 'numeric' })}</TableCell>
          <TableCell className="border-b border-border px-3.5 py-3 text-[13px] text-muted-foreground">{row.customerName}</TableCell>
          <TableCell className="border-b border-border px-3.5 py-3 text-center text-[13px] text-muted-foreground">{row.itemCount}</TableCell>
          <TableCell className="border-b border-border px-3.5 py-3 text-right text-[13px] text-muted-foreground">{formatCurrencyAmount(row.totalAmount)}</TableCell>
          <TableCell className="border-b border-border px-3.5 py-3 text-center text-[13px] text-muted-foreground">{rateLabel(row)}</TableCell>
          <TableCell className="border-b border-border px-3.5 py-3 text-center"><PaymentBadge status={row.paymentStatus} /></TableCell>
          <TableCell className="border-b border-border px-3.5 py-3 text-center"><StatusBadge status={row.status} /></TableCell>
          <TableCell className="border-b border-border px-3.5 py-3"><div className="flex justify-end"><Button variant="ghost" size="sm" className="h-7 w-7 px-0" title={t('common.view', 'View')} aria-label={t('common.view', 'View')} onClick={() => onView(row.id)}><Eye className="h-4 w-4" /></Button></div></TableCell>
        </TableRow>)}</TableBody>
      </Table>
    </div>
    <div className="space-y-3 sm:hidden">{rows.map((row) => <div key={row.id} className="rounded-lg border bg-card p-4 text-gray-900 dark:border-[#29252f] dark:bg-[#111014] dark:text-slate-100 oidark:border-outline-variant oidark:bg-surface-container-low oidark:text-slate-100"><div className="flex justify-between gap-3"><span className="font-mono text-xs">#{row.id.slice(0, 8).toUpperCase()}</span><StatusBadge status={row.status} /></div><dl className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-muted-foreground dark:text-slate-300 oidark:text-slate-300">{t('orders.table.date', 'Date')}</dt><dd>{new Date(row.createdAt).toLocaleDateString(dateLocale)}</dd></div><div><dt className="text-xs text-muted-foreground dark:text-slate-300 oidark:text-slate-300">{t('orders.table.customer', 'Customer')}</dt><dd>{row.customerName}</dd></div><div><dt className="text-xs text-muted-foreground dark:text-slate-300 oidark:text-slate-300">{t('orders.table.items', 'Items')}</dt><dd>{row.itemCount}</dd></div><div><dt className="text-xs text-muted-foreground dark:text-slate-300 oidark:text-slate-300">{t('orders.table.total', 'Total')}</dt><dd className="font-semibold">{formatCurrencyAmount(row.totalAmount)}</dd></div></dl><div className="mt-3 flex items-center justify-between"><PaymentBadge status={row.paymentStatus} /><div className="flex gap-1"><Button variant="outline" size="sm" className="dark:border-[#393440] dark:bg-[#211a29] dark:text-slate-100" onClick={() => onView(row.id)}><Eye className="mr-1 h-4 w-4" />{t('common.view', 'View')}</Button></div></div></div>)}</div>
  </>;
}
