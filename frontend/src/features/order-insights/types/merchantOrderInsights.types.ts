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

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

/** Formats a Money/DECIMAL string value as a USD amount (e.g. "$1,000.00"). */
export function formatCurrencyAmount(value: string): string {
  return currencyFormatter.format(Number(value));
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