import type { OrderListRowDto } from '../types/orderInsights.types';

const CSV_HEADERS = ['Order #', 'Date', 'Items', 'Total', 'Payment Status', 'Order Status', 'Track URL'];

function escapeCsvField(value: string | number): string {
  const field = String(value);

  return /[",\n\r]/.test(field) ? `"${field.replaceAll('"', '""')}"` : field;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function exportOrdersCsv(orders: OrderListRowDto[], filename?: string): void {
  const outputFilename = filename ?? `orders-${formatDate(new Date())}.csv`;
  const rows = orders.map((order) => [
    order.id,
    new Date(order.createdAt).toISOString().slice(0, 10),
    order.itemCount,
    order.totalAmount,
    order.paymentStatus,
    order.status,
    `/orders/${order.id}/tracking`,
  ]);
  const csv = [CSV_HEADERS, ...rows]
    .map((row) => row.map(escapeCsvField).join(','))
    .join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = outputFilename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
