import type { MerchantOrderListRowDto } from '../types/merchantOrderInsights.types';
import type { OrderListFilterFormData } from '../schemas/orderFilters.schema';

function escapeCsvField(value: string | number): string {
  const field = String(value);
  return /[",\n\r]/.test(field) ? `"${field.replaceAll('"', '""')}"` : field;
}

/**
 * Names the download after the exported scope, so two exports of the same shop
 * never overwrite each other silently (e.g.
 * `merchant-orders-delivered-2026-09-01-to-2026-09-30-2026-09-24.csv`).
 */
export function buildMerchantOrdersExportFilename(
  filters: Pick<OrderListFilterFormData, 'status' | 'from' | 'to'>,
  today: string = new Date().toISOString().slice(0, 10),
): string {
  const status = filters.status.replaceAll('_', '-');
  const from = filters.from ? filters.from.slice(0, 10) : 'all';
  const to = filters.to ? filters.to.slice(0, 10) : 'all';

  return `merchant-orders-${status}-${from}-to-${to}-${today}.csv`;
}

/** Downloads the supplied merchant list rows as a CSV without fetching order details. */
export function exportMerchantOrdersCsv(rows: MerchantOrderListRowDto[], filename = 'merchant-orders.csv'): void {
  const headers = ['Order #', 'Date', 'Customer', 'Items', 'Total', 'Payment Status', 'Order Status'];
  const values = rows.map((row) => [row.id, new Date(row.createdAt).toISOString().slice(0, 10), row.customerName, row.itemCount, row.totalAmount, row.paymentStatus, row.status]);
  const csv = [headers, ...values].map((row) => row.map(escapeCsvField).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}