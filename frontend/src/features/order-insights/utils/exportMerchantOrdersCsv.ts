import { roundToWholeKs, type MerchantOrderListRowDto } from '../types/merchantOrderInsights.types';
import type { OrderListFilterFormData } from '../schemas/orderFilters.schema';
import { computeOrderCommission } from './orderCommission';
import { formatStatusLabel } from './orderStatusLabel';

/**
 * Everything a column may read beyond the row itself. Only the commission rate
 * qualifies today; it comes from the Revenue Summary (the same source the order
 * detail page uses) — never from a per-order detail request.
 */
export interface MerchantOrderExportContext {
  /** Current platform commission rate (e.g. "12.00"), or null when it is not available. */
  commissionRate: string | null;
}

export interface MerchantOrderExportColumn {
  /** Heading; a function when it depends on the export context (the commission rate). */
  header: string | ((context: MerchantOrderExportContext) => string);
  /**
   * Marks a planned column the order list data cannot fill yet. Such a column is
   * reported once in `skippedColumns` and never written — no header, no blank cells.
   */
  notAvailableReason?: string;
  /** Cell value for one row; required for every column that can be exported. */
  value?: (row: MerchantOrderListRowDto, context: MerchantOrderExportContext) => string;
  /**
   * Per-export guard: returns a reason to drop the column for this export, or
   * null to keep it. A column is either fully present or fully absent — never
   * exported with empty or zero placeholders.
   */
  skipReason?: (context: MerchantOrderExportContext) => string | null;
}

/** Skip reason for columns the order list response does not carry yet. */
export const NOT_ON_ORDER_LIST_DATA = 'not on the order list data';

/** Skip reason for the commission columns when the platform rate could not be loaded. */
export const COMMISSION_RATE_UNAVAILABLE = 'commission rate unavailable';

/**
 * Normalizes a commission rate for export: the rate as-is when usable, or null
 * when it is missing/empty/non-numeric — never a fake 0. The export dialog
 * reuses this rule for its "commission columns skipped" notice.
 */
export function normalizeCommissionRate(rate: string | null | undefined): string | null {
  return rate !== null && rate !== undefined && rate !== '' && Number.isFinite(Number(rate)) ? rate : null;
}

/** The usable commission rate of the export context, or null when unusable. */
function usableCommissionRate(context: MerchantOrderExportContext): string | null {
  return normalizeCommissionRate(context.commissionRate);
}

/**
 * Formats a money cell as a plain whole-Ks integer (e.g. "32000") so Excel
 * reads it as a number. Deliberate, per stakeholder request: the export matches
 * the app's on-screen display exactly — sub-Ks precision is intentionally NOT
 * kept here; do not "fix" this back to exact decimals. The rounding itself
 * comes from roundToWholeKs (merchantOrderInsights.types.ts), the same rule the
 * UI formatter uses, so CSV and screen can never disagree. No decimals, no
 * thousands separators and no " Ks" suffix are added, so cells stay SUM-able in
 * Excel (the headers already carry the unit). Empty or non-numeric input passes
 * through unchanged — the export never invents a figure.
 */
function toPlainMoney(value: string): string {
  if (value === '') return '';
  const parsed = Number(value);
  return Number.isFinite(parsed) ? String(roundToWholeKs(parsed)) : value;
}

/**
 * The single source of truth for the export layout: the 8 columns exported
 * today, in order, followed by the 7 columns documented as not available on
 * the order list data. Enabling a skipped column later is a one-line change:
 * drop `notAvailableReason` and add a `value` accessor.
 */
export const MERCHANT_ORDER_EXPORT_COLUMNS: readonly MerchantOrderExportColumn[] = [
  {
    header: 'Order number',
    // Same fabricated reference the order endpoints return: ORD-{id[0:8]}
    // (backend buyer/orders.service.ts and merchant/order-fulfillment.service.ts).
    value: (row) => `ORD-${row.id.slice(0, 8).toUpperCase()}`,
  },
  {
    header: 'Order date',
    value: (row) => new Date(row.createdAt).toISOString().slice(0, 10),
  },
  { header: 'Customer name', value: (row) => row.customerName },
  { header: 'Order total (Ks)', value: (row) => toPlainMoney(row.totalAmount) },
  {
    header: (context) => {
      const rate = usableCommissionRate(context);
      return rate === null ? 'Commission (Ks)' : `Commission (${Number(rate)}%) (Ks)`;
    },
    skipReason: (context) => (usableCommissionRate(context) === null ? COMMISSION_RATE_UNAVAILABLE : null),
    value: (row, context) => {
      const rate = usableCommissionRate(context);
      return rate === null ? '' : toPlainMoney(computeOrderCommission(row.totalAmount, rate)?.commission ?? '');
    },
  },
  {
    header: 'You receive (Ks)',
    skipReason: (context) => (usableCommissionRate(context) === null ? COMMISSION_RATE_UNAVAILABLE : null),
    value: (row, context) => {
      const rate = usableCommissionRate(context);
      return rate === null ? '' : toPlainMoney(computeOrderCommission(row.totalAmount, rate)?.net ?? '');
    },
  },
  {
    header: 'Payment status',
    // Same wording as PaymentBadge ("completed" -> "Completed").
    value: (row) => formatStatusLabel(row.paymentStatus),
  },
  {
    header: 'Order status',
    // Same wording as StatusBadge ("out_for_delivery" -> "Out For Delivery").
    value: (row) => formatStatusLabel(row.status),
  },
  // --- Not yet available: kept in this config but never exported, because the
  // --- order list response does not carry these fields (no detail fetch per row).
  { header: 'Customer email', notAvailableReason: NOT_ON_ORDER_LIST_DATA },
  { header: 'Shipping city', notAvailableReason: NOT_ON_ORDER_LIST_DATA },
  { header: 'Shipping country', notAvailableReason: NOT_ON_ORDER_LIST_DATA },
  { header: 'Products', notAvailableReason: NOT_ON_ORDER_LIST_DATA },
  { header: 'Total quantity', notAvailableReason: NOT_ON_ORDER_LIST_DATA },
  { header: 'Subtotal', notAvailableReason: NOT_ON_ORDER_LIST_DATA },
  { header: 'Payment method', notAvailableReason: NOT_ON_ORDER_LIST_DATA },
];

/**
 * Escapes one CSV cell:
 * - text starting with `=`, `+`, `-` or `@` gets an apostrophe guard so Excel
 *   does not evaluate it as a formula (plain numeric cells keep their sign);
 * - `"` `,` and line breaks are quoted per RFC 4180.
 */
function toCsvCell(value: string): string {
  const guarded = /^[=+\-@]/.test(value) && !Number.isFinite(Number(value)) ? `'${value}` : value;
  return /[",\n\r]/.test(guarded) ? `"${guarded.replaceAll('"', '""')}"` : guarded;
}

export interface MerchantOrdersSkippedColumn {
  header: string;
  reason: string;
}

export interface MerchantOrdersCsv {
  /** CSV body WITHOUT the UTF-8 BOM (the download adds it). */
  csv: string;
  /** Header cells actually written, in column order. */
  headers: string[];
  /** Columns left out of this export, each with the documented reason. */
  skippedColumns: MerchantOrdersSkippedColumn[];
}

/**
 * Builds the CSV from the config array using only the supplied list rows —
 * columns without usable data are skipped entirely instead of exported blank,
 * and every skipped column is reported with its reason.
 */
export function buildMerchantOrdersCsv(
  rows: MerchantOrderListRowDto[],
  commissionRate: string | null = null,
): MerchantOrdersCsv {
  const context: MerchantOrderExportContext = { commissionRate };
  const included: MerchantOrderExportColumn[] = [];
  const skippedColumns: MerchantOrdersSkippedColumn[] = [];

  for (const column of MERCHANT_ORDER_EXPORT_COLUMNS) {
    const header = typeof column.header === 'function' ? column.header(context) : column.header;
    const reason = column.notAvailableReason ?? column.skipReason?.(context) ?? null;
    if (reason === null) {
      included.push(column);
    } else {
      skippedColumns.push({ header, reason });
    }
  }

  const headers = included.map((column) => (typeof column.header === 'function' ? column.header(context) : column.header));
  const lines = [
    headers.map(toCsvCell).join(','),
    ...rows.map((row) => included.map((column) => toCsvCell(column.value?.(row, context) ?? '')).join(',')),
  ];
  return { csv: lines.join('\r\n'), headers, skippedColumns };
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

export interface ExportMerchantOrdersCsvOptions {
  filename: string;
  /** Commission rate from the Revenue Summary; null omits the Commission/You receive columns. */
  commissionRate?: string | null;
}

/**
 * Downloads the supplied merchant list rows as a UTF-8 CSV (BOM + RFC 4180
 * quoting + formula guard, money as plain whole-Ks integers). Reads ONLY the
 * list rows — no order detail request is made, so large exports stay a single
 * list fetch. Returns what was written and what was skipped.
 */
export function exportMerchantOrdersCsv(
  rows: MerchantOrderListRowDto[],
  options: ExportMerchantOrdersCsvOptions,
): MerchantOrdersCsv {
  const built = buildMerchantOrdersCsv(rows, options.commissionRate ?? null);
  const url = URL.createObjectURL(new Blob([`\uFEFF${built.csv}`], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = options.filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return built;
}