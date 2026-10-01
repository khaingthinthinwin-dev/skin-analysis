import { describe, expect, it } from 'vitest';
import {
  computeOrderCommission,
  formatCommissionRateLabel,
  formatCommissionRatePercent,
  formatCommissionRateValue,
  needsCurrentRateMarker,
  normalizeCommissionRate,
  resolveOrderCommissionRate,
} from './orderCommission';

describe('computeOrderCommission', () => {
  it('matches the Revenue Summary example (total after discount × 12%)', () => {
    expect(computeOrderCommission('35200.00', '12.00')).toEqual({
      commission: '4224.00',
      net: '30976.00',
    });
  });

  it('rounds half up to two decimals per BR-OI-028', () => {
    // 9.96 × 12.5% = 1.245 → 1.25 (half-up), not 1.24.
    expect(computeOrderCommission('9.96', '12.50')).toEqual({
      commission: '1.25',
      net: '8.71',
    });
  });

  it('uses the given total as the base (the backend already applied the discount)', () => {
    // Subtotal 10.00 with a 5.00 discount → total 5.00: commission must be 0.60, not 1.20.
    expect(computeOrderCommission('5.00', '12.00')?.commission).toBe('0.60');
  });

  it('returns null for non-numeric input instead of inventing figures', () => {
    expect(computeOrderCommission('abc', '12.00')).toBeNull();
    expect(computeOrderCommission('10.00', 'not-a-rate')).toBeNull();
  });
});

describe('normalizeCommissionRate', () => {
  it('keeps a usable rate and drops everything else', () => {
    expect(normalizeCommissionRate('12.00')).toBe('12.00');
    expect(normalizeCommissionRate('0')).toBe('0');
    expect(normalizeCommissionRate(null)).toBeNull();
    expect(normalizeCommissionRate(undefined)).toBeNull();
    expect(normalizeCommissionRate('')).toBeNull();
    expect(normalizeCommissionRate('not-a-rate')).toBeNull();
  });
});

describe('resolveOrderCommissionRate', () => {
  it('prefers the rate stored on the order over the current platform rate', () => {
    expect(resolveOrderCommissionRate('10.00', '12.00')).toBe('10.00');
  });

  it('falls back to the platform rate when the order has none or an unusable one', () => {
    expect(resolveOrderCommissionRate(undefined, '12.00')).toBe('12.00');
    expect(resolveOrderCommissionRate('', '12.00')).toBe('12.00');
    expect(resolveOrderCommissionRate('nonsense', '12.00')).toBe('12.00');
  });

  it('returns null instead of inventing a rate when neither source has one', () => {
    expect(resolveOrderCommissionRate(null, null)).toBeNull();
    expect(resolveOrderCommissionRate('', '')).toBeNull();
    expect(resolveOrderCommissionRate('abc', undefined)).toBeNull();
  });
});

describe('needsCurrentRateMarker', () => {
  it('marks the rate as current only while it is not locked to the order', () => {
    expect(needsCurrentRateMarker(false)).toBe(true);
    expect(needsCurrentRateMarker(true)).toBe(false);
  });
});

describe('formatCommissionRateValue', () => {
  it('writes the rate as a plain number without the percent sign', () => {
    expect(formatCommissionRateValue('12.00')).toBe('12');
    expect(formatCommissionRateValue('10.50')).toBe('10.5');
    expect(formatCommissionRateValue('0.00')).toBe('0');
  });

  it('returns null instead of a fabricated 0 for a missing or invalid rate', () => {
    expect(formatCommissionRateValue(null)).toBeNull();
    expect(formatCommissionRateValue(undefined)).toBeNull();
    expect(formatCommissionRateValue('')).toBeNull();
    expect(formatCommissionRateValue('not-a-rate')).toBeNull();
  });
});

describe('formatCommissionRatePercent', () => {
  it('labels the rate as a percentage', () => {
    expect(formatCommissionRatePercent('12.00')).toBe('12%');
    expect(formatCommissionRatePercent('10.50')).toBe('10.5%');
    expect(formatCommissionRatePercent('')).toBeNull();
  });
});

describe('formatCommissionRateLabel', () => {
  it('marks the rate as the current one while it is not locked to the orders', () => {
    expect(formatCommissionRateLabel('12.00', '(current rate)', false)).toBe('12% (current rate)');
  });

  it('drops the marker once the rate is locked to the order, and never invents a rate', () => {
    expect(formatCommissionRateLabel('12.00', '(current rate)', true)).toBe('12%');
    expect(formatCommissionRateLabel('', '(current rate)', false)).toBeNull();
    expect(formatCommissionRateLabel(null, '(current rate)', true)).toBeNull();
  });
});