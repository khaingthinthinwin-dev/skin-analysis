// Internal helpers shared across the Commission & Revenue module.
// NOTE: This file lives inside the commission-revenue module and is NOT part
// of the global shared/ folder.

export function fmtDecimal(value: unknown): string {
  if (value === null || value === undefined) return '0.00';
  const num = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(num)) return '0.00';
  return num.toFixed(2);
}

export function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(num) ? 0 : num;
}

const DAY = 24 * 60 * 60 * 1000;

export function getRangeStart(range: string, now: Date): Date {
  const end = now.getTime();
  switch (range) {
    case '7d':
      return new Date(end - 7 * DAY);
    case '30d':
      return new Date(end - 30 * DAY);
    case '90d':
      return new Date(end - 90 * DAY);
    case '1y':
      return new Date(end - 365 * DAY);
    default:
      return new Date(end - 30 * DAY);
  }
}

export function getPeriodStart(period: string, now: Date): Date {
  const start = new Date(now);
  if (period === 'monthly') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  // quarterly
  const quarter = Math.floor(now.getMonth() / 3) * 3;
  start.setMonth(quarter, 1);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function formatBucket(date: Date, groupBy: 'day' | 'month'): string {
  if (groupBy === 'month') {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addBucketStep(date: Date, groupBy: 'day' | 'month'): Date {
  const next = new Date(date);
  if (groupBy === 'month') {
    next.setMonth(next.getMonth() + 1);
  } else {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

/** Returns a list of bucket keys starting at `from` up to and including `to`. */
export function buildBucketKeys(
  from: Date,
  to: Date,
  groupBy: 'day' | 'month',
): string[] {
  const keys: string[] = [];
  let cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(23, 59, 59, 999);
  let guard = 0;
  while (cursor <= end && guard < 1000) {
    keys.push(formatBucket(cursor, groupBy));
    cursor = addBucketStep(cursor, groupBy);
    guard += 1;
  }
  return keys;
}
