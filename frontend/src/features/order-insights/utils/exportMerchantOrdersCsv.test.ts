import { describe, expect, it, vi } from 'vitest';
import {
  COMMISSION_RATE_UNAVAILABLE,
  NOT_ON_ORDER_LIST_DATA,
  buildMerchantOrdersCsv,
  buildMerchantOrdersExportFilename,
  exportMerchantOrdersCsv,
  normalizeCommissionRate,
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

/** The cells of the single data row (index 0 of `csv` is the header line). */
function cells(built: { csv: string }): string[] {
  return built.csv.split('\r\n')[1].split(',');
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
  it('writes the eight available columns in order when the rate is known', () => {
    const built = buildMerchantOrdersCsv([row()], '12.00');

    expect(built.headers).toEqual([
      'Order number',
      'Order date',
      'Customer name',
      'Order total (Ks)',
      'Commission (12%) (Ks)',
      'You receive (Ks)',
      'Payment status',
      'Order status',
    ]);
    expect(cells(built)).toEqual([
      'ORD-1A2B3C4D',
      '2026-09-01',
      'Customer',
      '10000',
      '1200',
      '8800',
      'Completed',
      'Delivered',
    ]);
  });

  it('rounds every money cell to whole Ks so the file matches the screen', () => {
    // 12000.60 -> 12001 Ks; 12% commission (1440.07) -> 1440 Ks; net (10560.53) -> 10561 Ks.
    const built = buildMerchantOrdersCsv([row({ totalAmount: '12000.60' })], '12.00');

    expect(cells(built).slice(3, 6)).toEqual(['12001', '1440', '10561']);
  });

  it('keeps a negative amount a plain number so Excel can still sum it', () => {
    const built = buildMerchantOrdersCsv([row({ totalAmount: '-500.60' })], null);

    expect(cells(built)[3]).toBe('-501');
  });

  it('skips the commission columns with their reason when the rate is unavailable', () => {
    const built = buildMerchantOrdersCsv([row()], null);

    expect(built.headers).not.toContain('Commission (Ks)');
    expect(built.headers).not.toContain('You receive (Ks)');
    expect(built.skippedColumns.map((column) => column.header)).toEqual([
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
    expect(built.skippedColumns.filter((column) => column.reason === COMMISSION_RATE_UNAVAILABLE)).toHaveLength(2);
    expect(built.skippedColumns.filter((column) => column.reason === NOT_ON_ORDER_LIST_DATA)).toHaveLength(7);
  });

  it('quotes separators and guards formula-like text', () => {
    const withSeparator = buildMerchantOrdersCsv([row({ customerName: 'Doe, "Jane"' })], null);
    expect(withSeparator.csv.split('\r\n')[1]).toContain('"Doe, ""Jane"""');

    const withFormula = buildMerchantOrdersCsv([row({ customerName: '=SUM(A1:A2)' })], null);
    expect(withFormula.csv.split('\r\n')[1]).toContain("'=SUM(A1:A2)");
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
