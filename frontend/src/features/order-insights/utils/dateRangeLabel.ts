import type { SummaryPeriod } from '../types/merchantOrderInsights.types';

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

/**
 * `yyyy/mm/dd` display of any date-like value in local time (empty string when
 * the value is not a date). Plain `yyyy-mm-dd` strings are converted without
 * parsing so they never shift a day in a negative-offset timezone.
 */
export function toSlashDisplayDate(value?: string): string {
  if (isIsoDate(value)) return toSlashDate(value);
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return toIsoDate(parsed).split('-').join('/');
}

/** e.g. `2026/09/24`. */
export function formatFullDate(iso: string): string {
  return toSlashDate(iso);
}

function toLocalDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

/**
 * Inclusive day count of a range — `2026/09/01` to `2026/09/23` covers 23 days
 * and a single day counts as `1`.
 */
export function countRangeDays(from: string, to: string): number {
  const millis = toLocalDate(to).getTime() - toLocalDate(from).getTime();
  return Math.round(millis / 86_400_000) + 1;
}

/**
 * Label for the active-range pill: a single date when the range covers one day
 * and `2026/09/01 – 2026/09/24` otherwise. Both dates always carry the full
 * `yyyy/mm/dd`, so a cross-year range reads the same as a same-year one.
 */
export function formatRangeLabel(from?: string, to?: string): string | undefined {
  if (!isIsoDate(from) || !isIsoDate(to)) return undefined;
  const [start, end] = to < from ? [to, from] : [from, to];
  if (start === end) return formatFullDate(start);
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
