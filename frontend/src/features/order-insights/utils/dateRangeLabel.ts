import type { SummaryPeriod } from '../types/merchantOrderInsights.types';

/** Locale used for the range labels (mirrors the MerchantOrderTable date column). */
const DATE_LOCALE = 'en-US';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface DateRange {
  from: string;
  to: string;
}

/** True when the value is a `yyyy-mm-dd` date string. */
export function isIsoDate(value?: string): value is string {
  return typeof value === 'string' && ISO_DATE_PATTERN.test(value);
}

/** Local-time `yyyy-mm-dd` value used by the date inputs and the API query params. */
export function toIsoDate(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** `yyyy/mm/dd` display of an ISO date (empty string when the value is not a date). */
export function toSlashDate(value?: string): string {
  return isIsoDate(value) ? value.split('-').join('/') : '';
}

function toLocalDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

/** e.g. `Sep 24, 2026`. */
export function formatFullDate(iso: string): string {
  return toLocalDate(iso).toLocaleDateString(DATE_LOCALE, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** e.g. `Sep 24`. */
export function formatMonthDay(iso: string): string {
  return toLocalDate(iso).toLocaleDateString(DATE_LOCALE, { month: 'short', day: 'numeric' });
}

/**
 * Inclusive day count of a range — `Sep 1` to `Sep 23` covers 23 days and a
 * single day counts as `1`.
 */
export function countRangeDays(from: string, to: string): number {
  const millis = toLocalDate(to).getTime() - toLocalDate(from).getTime();
  return Math.round(millis / 86_400_000) + 1;
}

/**
 * Label for the active-range pill: a single date when the range covers one day,
 * `Sep 1 – Sep 24, 2026` inside a single year, and the year on both dates when
 * the range spans two years.
 */
export function formatRangeLabel(from?: string, to?: string): string | undefined {
  if (!isIsoDate(from) || !isIsoDate(to)) return undefined;
  const [start, end] = to < from ? [to, from] : [from, to];
  if (start === end) return formatFullDate(start);
  if (start.slice(0, 4) === end.slice(0, 4)) return `${formatMonthDay(start)} – ${formatFullDate(end)}`;
  return `${formatFullDate(start)} – ${formatFullDate(end)}`;
}

/**
 * Resolves the dates behind the active period so the pill can label it. The
 * server-resolved `period` of the loaded summary wins (those are the dates the
 * figures were calculated from); the local calendar is only a fallback for the
 * presets before a summary arrives.
 */
export function resolveActiveRange(
  period: SummaryPeriod,
  applied: { from?: string; to?: string },
  serverPeriod?: { from?: string; to?: string },
  today: Date = new Date(),
): DateRange | undefined {
  const serverFrom = serverPeriod?.from;
  const serverTo = serverPeriod?.to;
  const serverRange: DateRange | undefined = isIsoDate(serverFrom) && isIsoDate(serverTo)
    ? { from: serverFrom, to: serverTo }
    : undefined;

  if (period === 'custom') {
    const appliedFrom = applied.from;
    const appliedTo = applied.to;
    return isIsoDate(appliedFrom) && isIsoDate(appliedTo) ? { from: appliedFrom, to: appliedTo } : serverRange;
  }
  if (serverRange) return serverRange;

  const todayIso = toIsoDate(today);
  if (period === 'today') return { from: todayIso, to: todayIso };
  if (period === 'this_month') {
    return { from: toIsoDate(new Date(today.getFullYear(), today.getMonth(), 1)), to: todayIso };
  }
  return {
    from: toIsoDate(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
    to: toIsoDate(new Date(today.getFullYear(), today.getMonth(), 0)),
  };
}
