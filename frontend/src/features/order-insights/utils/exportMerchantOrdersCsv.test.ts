import { describe, expect, it, vi } from 'vitest';
import { exportMerchantOrdersCsv } from './exportMerchantOrdersCsv';
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