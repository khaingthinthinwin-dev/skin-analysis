import { describe, expect, it, vi } from 'vitest';
import { buildMerchantOrdersExportFilename, exportMerchantOrdersCsv } from './exportMerchantOrdersCsv';
import { OrderStatus } from '../types/orderInsights.types';

describe('exportMerchantOrdersCsv', () => {
  it('exports the supplied rows without requesting details', () => {
    const click = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(() => 'blob:test'), configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(click);
    vi.spyOn(HTMLAnchorElement.prototype, 'remove').mockImplementation(() => undefined);
    exportMerchantOrdersCsv([{ id: '1', createdAt: '2026-09-01', status: OrderStatus.DELIVERED, itemCount: 1, totalAmount: '1.00', paymentStatus: 'completed', customerName: 'Customer' }]);
    expect(click).toHaveBeenCalled();
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