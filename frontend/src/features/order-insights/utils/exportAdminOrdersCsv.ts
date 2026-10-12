import type { AdminOrderDetailDto, AdminOrderListRowDto } from '../types/adminOrderInsights.types';
import type { AdminOrderFilterFormData } from '../schemas/orderFilters.schema';

function csvCell(value: string): string {
  const guarded = /^[=+\-@]/.test(value) && !Number.isFinite(Number(value)) ? `'${value}` : value;
  return /[",\n\r]/.test(guarded) ? `"${guarded.replaceAll('"', '""')}"` : guarded;
}

function label(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

export function buildAdminOrdersExportFilename(
  filters: Pick<AdminOrderFilterFormData, 'status' | 'paymentStatus' | 'from' | 'to'>,
  today = new Date().toISOString().slice(0, 10),
): string {
  const from = filters.from ? filters.from.slice(0, 10) : 'all';
  const to = filters.to ? filters.to.slice(0, 10) : 'all';
  return `admin-orders-${filters.status}-${filters.paymentStatus ?? 'all'}-${from}-to-${to}-${today}.csv`;
}

export interface AdminOrderExportRow {
  row: AdminOrderListRowDto;
  detail?: AdminOrderDetailDto | null;
}

export function buildAdminOrdersCsv(rows: AdminOrderListRowDto[] | AdminOrderExportRow[]): string {
  const columns = [
    'Order number',
    'Order date',
    'Shop / Merchant',
    'Merchant ID',
    'Buyer',
    'Items',
    'Total amount',
    'Payment method',
    'Payment status',
    'Order status',
  ];
  const lines = [
    columns.map(csvCell).join(','),
    ...rows.map((entry) => {
      const row = 'row' in entry ? entry.row : entry;
      const detail = 'row' in entry ? entry.detail : undefined;
      const items = detail
        ? detail.items.map((item) => `${item.productName} (x${item.quantity})`).join(', ')
        : String(row.itemCount);
      return [
        `#${row.id.slice(0, 8).toUpperCase()}`,
        new Date(row.createdAt).toISOString().slice(0, 10),
        row.shopName,
        detail?.shop.merchantId ?? '',
        row.customerName,
        items,
        row.totalAmount,
        detail ? label(detail.paymentMethod) : '',
        label(row.paymentStatus),
        label(row.status),
      ].map(csvCell).join(',');
    }),
  ];
  return lines.join('\r\n');
}

export function exportAdminOrdersCsv(
  rows: AdminOrderListRowDto[] | AdminOrderExportRow[],
  filename: string,
): void {
  const url = URL.createObjectURL(new Blob([`\uFEFF${buildAdminOrdersCsv(rows)}`], {
    type: 'text/csv;charset=utf-8;',
  }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
