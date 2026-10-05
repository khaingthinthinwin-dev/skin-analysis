import { describe, expect, it, vi } from 'vitest';
import {
  COMMISSION_RATE_UNAVAILABLE,
  NOT_ON_ORDER_LIST_DATA,
  buildMerchantOrdersCsv,
  buildMerchantOrdersExportFilename,
  exportMerchantOrdersCsv,
  resolveRowCommissionRate,
} from './exportMerchantOrdersCsv';
import { OrderStatus } from '../types/orderInsights.types';
import type { MerchantOrderListRowDto } from '../types/merchantOrderInsights.types';

function row(overrides: Partial<MerchantOrderListRowDto> = {}): MerchantOrderListRowDto {
  return {
    id: '1a2b3c4d5e6f7890',
    createdAt: '2026-09-01T10:00:00.000Z',
    status: OrderStatus.DELIVERED,
    itemCount: 1,
    totalAmount: '10000.00',
    paymentStatus: 'completed',
    customerName: 'Customer',
    ...overrides,
  };
}

/** The cells of every data line (index 0 of `csv` is the header line). */
function dataRows(built: { csv: string }): string[][] {
  return built.csv.split('\r\n').slice(1).map((line) => line.split(','));
}

/** The cells of the single data row. */
function cells(built: { csv: string }): string[] {
  return dataRows(built)[0];
}

describe('exportMerchantOrdersCsv', () => {
  it('downloads the supplied rows without requesting order details', () => {
    const click = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(() => 'blob:test'), configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(click);
    vi.spyOn(HTMLAnchorElement.prototype, 'remove').mockImplementation(() => undefined);

    const built = exportMerchantOrdersCsv([row()], { filename: 'merchant-orders-scope.csv' });

    expect(click).toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
    // The BOM is added by the download, never by the builder.
    expect(built.csv.startsWith('\uFEFF')).toBe(false);
    expect(built.headers).toContain('Order number');
  });
});

describe('buildMerchantOrdersCsv', () => {
  it('writes the nine available columns in order, with the applied rate, when only the platform rate is known', () => {
    const built = buildMerchantOrdersCsv([row()], '12.00');

    expect(built.headers).toEqual([
      'Order number',
      'Order date',
      'Customer name',
      'Order total (Ks)',
      'Commission rate (%)',
      'Commission (Ks)',
      'You receive (Ks)',
      'Payment status',
      'Order status',
    ]);
    expect(cells(built)).toEqual([
      'ORD-1A2B3C4D',
      '2026-09-01',
      'Customer',
      '10000',
      // The rate is a plain number: the header already carries the %.
      '12',
      '1200',
      '8800',
      'Completed',
      'Delivered',
    ]);
  });

  it('writes the rate stored on each order and computes that row from it', () => {
    const built = buildMerchantOrdersCsv([row({ commissionRate: '10.00' })], null);

    expect(cells(built).slice(3, 7)).toEqual(['10000', '10', '1000', '9000']);
  });

  it('keeps a mixed-rate file row-accurate instead of applying one rate to every row', () => {
    // Deliberately unsorted rates: the oldest order was placed at 12%, the newer
    // ones at 10%, and the row that cannot report its own rate falls back to the
    // platform rate. Order total, rate, commission, net.
    const built = buildMerchantOrdersCsv(
      [
        row({ id: 'older', commissionRate: '12.00' }),
        row({ id: 'newer', commissionRate: '10.00' }),
        row({ id: 'no-own-rate' }),
      ],
      '10.00',
    );

    expect(dataRows(built).map((line) => line.slice(3, 7))).toEqual([
      ['10000', '12', '1200', '8800'],
      ['10000', '10', '1000', '9000'],
      ['10000', '10', '1000', '9000'],
    ]);
  });

  it('leaves the commission figures unchanged when a row reports the same rate as the platform', () => {
    const fromRowRate = buildMerchantOrdersCsv([row({ commissionRate: '12.00' })], null);
    const fromPlatformRate = buildMerchantOrdersCsv([row()], '12.00');

    expect(fromRowRate.csv).toBe(fromPlatformRate.csv);
  });

  it('keeps the header row identical for a zero-order export', () => {
    const empty = buildMerchantOrdersCsv([], '12.00');
    const populated = buildMerchantOrdersCsv([row()], '12.00');

    expect(empty.headers).toEqual(populated.headers);
    expect(empty.csv).toBe(populated.headers.join(','));
    expect(empty.skippedColumns.map((column) => column.reason)).not.toContain(COMMISSION_RATE_UNAVAILABLE);
  });

  it('rounds every money cell to whole Ks so the file matches the screen', () => {
    // 12000.60 -> 12001 Ks; 12% commission (1440.07) -> 1440 Ks; net (10560.53) -> 10561 Ks.
    const built = buildMerchantOrdersCsv([row({ totalAmount: '12000.60' })], '12.00');

    expect([cells(built)[3], cells(built)[5], cells(built)[6]]).toEqual(['12001', '1440', '10561']);
  });

  it('keeps a negative amount a plain number so Excel can still sum it', () => {
    const built = buildMerchantOrdersCsv([row({ totalAmount: '-500.60' })], null);

    expect(cells(built)[3]).toBe('-501');
  });

  it('skips the commission columns with their reason when the rate is unavailable', () => {
    const built = buildMerchantOrdersCsv([row()], null);

    expect(built.headers).not.toContain('Commission rate (%)');
    expect(built.headers).not.toContain('Commission (Ks)');
    expect(built.headers).not.toContain('You receive (Ks)');
    expect(built.skippedColumns.map((column) => column.header)).toEqual([
      'Commission rate (%)',
      'Commission (Ks)',
      'You receive (Ks)',
      'Customer email',
      'Shipping city',
      'Shipping country',
      'Products',
      'Total quantity',
      'Subtotal',
      'Payment method',
    ]);
    expect(built.skippedColumns.filter((column) => column.reason === COMMISSION_RATE_UNAVAILABLE)).toHaveLength(3);
    expect(built.skippedColumns.filter((column) => column.reason === NOT_ON_ORDER_LIST_DATA)).toHaveLength(7);
  });

  it('quotes separators and guards formula-like text', () => {
    const withSeparator = buildMerchantOrdersCsv([row({ customerName: 'Doe, "Jane"' })], null);
    expect(withSeparator.csv.split('\r\n')[1]).toContain('"Doe, ""Jane"""');

    const withFormula = buildMerchantOrdersCsv([row({ customerName: '=SUM(A1:A2)' })], null);
    expect(withFormula.csv.split('\r\n')[1]).toContain("'=SUM(A1:A2)");
  });
});

describe('resolveRowCommissionRate', () => {
  const context = { commissionRate: '12.00', hasPerOrderRates: true };

  it('prefers the rate stored on the order over the platform rate', () => {
    expect(resolveRowCommissionRate(row({ commissionRate: '10.00' }), context)).toBe('10.00');
  });

  it('falls back to the platform rate when the row cannot report its own', () => {
    expect(resolveRowCommissionRate(row(), context)).toBe('12.00');
    expect(resolveRowCommissionRate(row({ commissionRate: '' }), context)).toBe('12.00');
    expect(resolveRowCommissionRate(row({ commissionRate: 'nonsense' }), context)).toBe('12.00');
  });

  it('returns null instead of inventing a rate when neither source has one', () => {
    expect(resolveRowCommissionRate(row(), { commissionRate: null, hasPerOrderRates: false })).toBeNull();
  });
});

describe('buildMerchantOrdersExportFilename', () => {
  it('falls back to "all" for an unfiltered scope', () => {
    expect(buildMerchantOrdersExportFilename({ status: 'all', from: '', to: '' }, '2026-09-24'))
      .toBe('merchant-orders-all-all-to-all-2026-09-24.csv');
  });

  it('spells out the applied status and ISO bounds', () => {
    expect(
      buildMerchantOrdersExportFilename(
        { status: 'out_for_delivery', from: '2026-09-01T00:00:00.000Z', to: '2026-09-30T00:00:00.000Z' },
        '2026-09-24',
      ),
    ).toBe('merchant-orders-out-for-delivery-2026-09-01-to-2026-09-30-2026-09-24.csv');
  });

  it('defaults the day stamp to today', () => {
    expect(buildMerchantOrdersExportFilename({ status: 'delivered' }))
      .toMatch(/^merchant-orders-delivered-all-to-all-\d{4}-\d{2}-\d{2}\.csv$/);
  });
});
