import { describe, expect, it } from 'vitest';
import { countRangeDays, formatRangeLabel, isIsoDate, resolveActiveRange, toIsoDate, toSlashDate } from './dateRangeLabel';

/** 2026-09-24 in local time, matching the reference date of the design. */
const TODAY = new Date(2026, 8, 24);

describe('dateRangeLabel date helpers', () => {
  it('formats a local date as yyyy-mm-dd', () => {
    expect(toIsoDate(TODAY)).toBe('2026-09-24');
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('renders the yyyy/mm/dd display value and rejects anything else', () => {
    expect(toSlashDate('2026-09-24')).toBe('2026/09/24');
    expect(toSlashDate('')).toBe('');
    expect(toSlashDate(undefined)).toBe('');
    expect(toSlashDate('24/09/2026')).toBe('');
    expect(isIsoDate('2026-09-24')).toBe(true);
    expect(isIsoDate('2026-9-4')).toBe(false);
  });
});

describe('formatRangeLabel', () => {
  it('labels a one-day range with a single full date', () => {
    expect(formatRangeLabel('2026-09-24', '2026-09-24')).toBe('Sep 24, 2026');
  });

  it('labels same-year ranges with the year on the end date only', () => {
    expect(formatRangeLabel('2026-09-01', '2026-09-24')).toBe('Sep 1 – Sep 24, 2026');
    expect(formatRangeLabel('2026-08-01', '2026-08-31')).toBe('Aug 1 – Aug 31, 2026');
  });

  it('keeps the year on both dates for a cross-year range', () => {
    expect(formatRangeLabel('2025-12-30', '2026-01-02')).toBe('Dec 30, 2025 – Jan 2, 2026');
  });

  it('ignores an incomplete or reversed range', () => {
    expect(formatRangeLabel(undefined, '2026-09-24')).toBeUndefined();
    expect(formatRangeLabel('2026-09-01', undefined)).toBeUndefined();
    expect(formatRangeLabel('2026-09-24', '2026-09-01')).toBe('Sep 1 – Sep 24, 2026');
  });
});

describe('countRangeDays', () => {
  it('counts both ends of a range', () => {
    expect(countRangeDays('2026-09-01', '2026-09-23')).toBe(23);
    expect(countRangeDays('2026-09-01', '2026-09-02')).toBe(2);
  });

  it('counts a single day as one', () => {
    expect(countRangeDays('2026-09-24', '2026-09-24')).toBe(1);
  });

  it('crosses the year boundary and a leap day', () => {
    expect(countRangeDays('2025-12-30', '2026-01-02')).toBe(4);
    expect(countRangeDays('2024-02-28', '2024-03-01')).toBe(3);
  });
});

describe('resolveActiveRange', () => {
  it('derives the preset ranges from the calendar when no summary has arrived', () => {
    expect(resolveActiveRange('today', {}, undefined, TODAY)).toEqual({ from: '2026-09-24', to: '2026-09-24' });
    expect(resolveActiveRange('this_month', {}, undefined, TODAY)).toEqual({ from: '2026-09-01', to: '2026-09-24' });
    expect(resolveActiveRange('last_month', {}, undefined, TODAY)).toEqual({ from: '2026-08-01', to: '2026-08-31' });
  });

  it('walks back across the year boundary for last month', () => {
    expect(resolveActiveRange('last_month', {}, undefined, new Date(2026, 0, 15))).toEqual({ from: '2025-12-01', to: '2025-12-31' });
  });

  it('prefers the server-resolved period of the loaded summary', () => {
    expect(resolveActiveRange('this_month', {}, { from: '2026-09-01', to: '2026-09-30' }, TODAY))
      .toEqual({ from: '2026-09-01', to: '2026-09-30' });
  });

  it('uses the applied range for custom and falls back to the server period', () => {
    expect(resolveActiveRange('custom', { from: '2026-09-10', to: '2026-09-12' }, undefined, TODAY))
      .toEqual({ from: '2026-09-10', to: '2026-09-12' });
    expect(resolveActiveRange('custom', {}, { from: '2026-09-02', to: '2026-09-03' }, TODAY))
      .toEqual({ from: '2026-09-02', to: '2026-09-03' });
    expect(resolveActiveRange('custom', {}, undefined, TODAY)).toBeUndefined();
  });
});
