import type { MerchantOrderListRowDto } from '../types/merchantOrderInsights.types';

function escapeCsvField(value: string | number): string {
  const field = String(value);
  return /[",\n\r]/.test(field) ? `"${field.replaceAll('"', '""')}"` : field;
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