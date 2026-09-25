import type { OrderListRowDto, PaginationMetaDto } from './orderInsights.types';
import type { RevenuePeriodFormData } from '../schemas/orderFilters.schema';

export type SummaryPeriod = RevenuePeriodFormData['period'];

export interface MerchantOrderListRowDto extends OrderListRowDto {
  customerName: string;
}

export interface MerchantOrderListResponseDto {
  orders: MerchantOrderListRowDto[];
  meta: PaginationMetaDto;
}

export interface SalesSummaryDto {
  todayCount: number;
  thisMonthCount: number;
  completedCount: number;
}

export interface SalesSummaryEnvelopeDto {
  salesSummary: SalesSummaryDto;
}

export interface SummaryPeriodDto {
  code: SummaryPeriod;
  from: string;
  to: string;
}

export type CommissionRateSource = 'current_settings' | 'order_snapshot';

export interface RevenueSummaryDto {
  sales: string;
  commission: string;
  revenue: string;
  aov: string;
  orderCount: number;
  commissionRate: string;
  commissionRateSource: CommissionRateSource;
  commissionRateLocked: boolean;
  period: SummaryPeriodDto;
}

export interface RevenueSummaryEnvelopeDto {
  revenueSummary: RevenueSummaryDto;
}

export type TranslateFn = (key: string, defaultValue?: string) => string;

/**
 * Rounds a Money/DECIMAL value to the nearest whole Ks — the senior-confirmed
 * rule: 12000.00 -> 12000, 12000.40 -> 12000, 12000.60 -> 12001 (Math.round).
 * Falls back to 0 for null/undefined/NaN. The single home of the rounding rule:
 * both the on-screen formatter (formatCurrencyAmount) and the merchant order
 * CSV export (exportMerchantOrdersCsv) round through this helper, so a figure
 * can never be shown one way in the UI and exported another.
 */
export function roundToWholeKs(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const amount = Number(value);
  if (Number.isNaN(amount)) return 0;
  return Math.round(amount);
}

/**
 * Formats a Money/DECIMAL value as MMK in Ks via roundToWholeKs —
 * senior-confirmed rule: 12000.00 -> "12,000 Ks", 12000.40 -> "12,000 Ks",
 * 12000.60 -> "12,001 Ks". Same rounding as the backend export's
 * fmtExportCurrency. Falls back to "0 Ks" for null/undefined/NaN.
 */
export function formatCurrencyAmount(value: string | number | null | undefined): string {
  return `${roundToWholeKs(value).toLocaleString('en-US')} Ks`;
}

/** Extracts the HTTP status code from an axios-style error, if present. */
export function getHttpStatus(error: unknown): number | undefined {
  if (error === null || typeof error !== 'object') return undefined;
  const response = (error as { response?: unknown }).response;
  if (response === null || typeof response !== 'object') return undefined;
  const status = (response as { status?: unknown }).status;
  return typeof status === 'number' ? status : undefined;
}

/** Returns true when the given error carries the given HTTP status code. */
export function isHttpErrorStatus(error: unknown, status: number): boolean {
  return getHttpStatus(error) === status;
}

/** Reads a server-provided message from an axios-style error, if present. */
export function getServerErrorMessage(error: unknown): string {
  if (error === null || typeof error !== 'object') return '';
  const response = (error as { response?: unknown }).response;
  if (response === null || typeof response !== 'object') return '';
  const data = (response as { data?: unknown }).data;
  if (data === null || typeof data !== 'object') return '';
  const message = (data as { message?: string | string[] }).message;
  if (typeof message === 'string' && message !== '') return message;
  if (Array.isArray(message) && message.length > 0) return String(message[0]);
  return '';
}

/**
 * Maps an API error to a user-friendly, translatable message for an Order
 * Insights panel. HTTP 429 has its own copy; every other status falls back to
 * the supplied panel-specific default.
 */
export function getPanelErrorMessage(
  error: unknown,
  translate: TranslateFn,
  fallbackKey = 'merchant.orders.error.loadFailed',
  fallbackText = 'Unable to load this data. Please try again.',
): string {
  const status = getHttpStatus(error);
  if (status === 429) {
    return translate(
      'merchant.orders.error.tooManyRequests',
      'Too many requests. Please try again shortly.',
    );
  }
  return translate(fallbackKey, fallbackText);
}