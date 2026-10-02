import { describe, expect, it } from 'vitest';
import { formatMmt, toMmtDateStamp } from './datetime';

describe('formatMmt', () => {
  it('shifts the UTC instant forward by 06:30', () => {
    expect(formatMmt('2026-08-25T14:30:00.000Z')).toBe(
      '2026-08-25 21:00:00.000 MMT',
    );
  });

  it('rolls over to the next Myanmar day after 17:30 UTC', () => {
    // 17:30 UTC is 00:00 the next day in Myanmar time.
    expect(formatMmt('2026-08-25T17:30:00.000Z')).toBe(
      '2026-08-26 00:00:00.000 MMT',
    );
    expect(formatMmt('2026-08-25T17:29:59.999Z')).toBe(
      '2026-08-25 23:59:59.999 MMT',
    );
  });

  it('rolls back to the previous Myanmar day before 17:30 UTC', () => {
    expect(formatMmt('2026-08-25T17:00:00.000Z')).toBe(
      '2026-08-25 23:30:00.000 MMT',
    );
  });

  it('accepts an offset-bearing value that is not UTC', () => {
    // 2026-08-25T21:00+06:00 is the same instant as 14:30 UTC.
    expect(formatMmt('2026-08-25T21:00:00.000+06:00')).toBe(
      '2026-08-25 21:30:00.000 MMT',
    );
  });

  it('renders an em dash for missing or unparseable values', () => {
    expect(formatMmt(null)).toBe('—');
    expect(formatMmt(undefined)).toBe('—');
    expect(formatMmt('')).toBe('—');
    expect(formatMmt('not-a-date')).toBe('—');
  });
});

describe('toMmtDateStamp', () => {
  it('returns the Myanmar calendar day of the instant', () => {
    expect(toMmtDateStamp('2026-08-25T17:30:00.000Z')).toBe('2026-08-26');
    expect(toMmtDateStamp('2026-08-25T16:59:59.999Z')).toBe('2026-08-25');
  });

  it('defaults to now and is stable within a single day', () => {
    const stamp = toMmtDateStamp();
    expect(stamp).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(toMmtDateStamp(new Date())).toBe(stamp);
  });
});
