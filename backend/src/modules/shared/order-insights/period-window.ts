import { UnprocessableEntityException } from '@nestjs/common';
import { SummaryPeriod } from './dto/order-insights.types';

export interface ResolvedPeriodWindow {
  code: SummaryPeriod;
  from: string;
  to: string;
  start: Date;
  endExclusive: Date;
}

export function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function utcStartOfDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function utcStartOfDayFromInput(value: string): Date {
  const ymd = value.slice(0, 10);
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function utcStartOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/**
 * Resolves a summary period to a UTC half-open window [start, endExclusive).
 * `from` / `to` in the returned DTO are inclusive calendar dates (YYYY-MM-DD).
 */
export function resolvePeriodWindowUtc(
  period: SummaryPeriod,
  from?: string,
  to?: string,
  now: Date = new Date(),
): ResolvedPeriodWindow {
  if (period === 'today') {
    const start = utcStartOfDay(now);
    const endExclusive = new Date(
      Date.UTC(
        start.getUTCFullYear(),
        start.getUTCMonth(),
        start.getUTCDate() + 1,
      ),
    );
    return {
      code: period,
      from: formatUtcDate(start),
      to: formatUtcDate(start),
      start,
      endExclusive,
    };
  }

  if (period === 'this_month') {
    const start = utcStartOfMonth(now);
    const endExclusive = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1),
    );
    return {
      code: period,
      from: formatUtcDate(start),
      to: formatUtcDate(new Date(endExclusive.getTime() - 1)),
      start,
      endExclusive,
    };
  }

  if (period === 'last_month') {
    const thisMonth = utcStartOfMonth(now);
    const start = new Date(
      Date.UTC(thisMonth.getUTCFullYear(), thisMonth.getUTCMonth() - 1, 1),
    );
    const endExclusive = thisMonth;
    return {
      code: period,
      from: formatUtcDate(start),
      to: formatUtcDate(new Date(endExclusive.getTime() - 1)),
      start,
      endExclusive,
    };
  }

  if (!from || !to) {
    throw new UnprocessableEntityException('Select a start and end date');
  }

  const start = utcStartOfDayFromInput(from);
  const toStart = utcStartOfDayFromInput(to);
  if (toStart.getTime() < start.getTime()) {
    throw new UnprocessableEntityException('Select a start and end date');
  }

  const endExclusive = new Date(
    Date.UTC(
      toStart.getUTCFullYear(),
      toStart.getUTCMonth(),
      toStart.getUTCDate() + 1,
    ),
  );

  return {
    code: 'custom',
    from: formatUtcDate(start),
    to: formatUtcDate(toStart),
    start,
    endExclusive,
  };
}
