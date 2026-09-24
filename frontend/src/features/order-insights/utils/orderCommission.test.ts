import { describe, expect, it } from 'vitest';
import { computeOrderCommission } from './orderCommission';

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