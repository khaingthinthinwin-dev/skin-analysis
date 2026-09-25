import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildMerchantInvoiceData,
  buildMerchantInvoiceHtml,
  formatInvoiceDate,
  merchantInvoiceLabels,
  printMerchantInvoice,
} from './merchantInvoice';
import { OrderStatus } from '../types/orderInsights.types';
import type { MerchantOrderDetailDto } from '../types/merchantOrderFulfillment.types';

/** Mirrors the pages' `t(key, fallback)` helper: labels resolve to their defaults. */
const translate = (key: string, fallback: string) => fallback ?? key;
const labels = merchantInvoiceLabels(translate);

/** Fixed "now" so the invoice issue date is deterministic. */
const NOW = new Date('2026-09-20T08:30:00.000Z');

function order(overrides: Partial<MerchantOrderDetailDto> = {}): MerchantOrderDetailDto {
  return {
    id: 'abcdef1234567890',
    orderNumber: 'ORD-1',
    createdAt: '2026-09-01T10:00:00.000Z',
    status: OrderStatus.CONFIRMED,
    items: [
      {
        id: 'item-1',
        productName: 'Hydrating Serum',
        productImage: null,
        quantity: 2,
        unitPrice: '5000.00',
        totalPrice: '10000.00',
      },
    ],
    discountAmount: '0.00',
    totalAmount: '10000.00',
    paymentMethod: 'cash_on_delivery',
    paymentStatus: 'pending',
    shippingAddress: {
      recipientName: 'Aye Aye',
      addressLine1: '1 Main St',
      city: 'Yangon',
      country: 'MM',
      phone: '+95 912345678',
    },
    notes: null,
    customer: { name: 'Aye Aye', email: 'aye@example.com', phone: '+95 912345678' },
    availableTransitions: ['packed'],
    ...overrides,
  };
}

describe('buildMerchantInvoiceData', () => {
  it('uses the order number, and falls back to the id prefix when it is missing', () => {
    expect(buildMerchantInvoiceData(order(), NOW).reference).toBe('ORD-1');
    expect(buildMerchantInvoiceData(order({ orderNumber: '' }), NOW).reference).toBe('#ABCDEF12');
  });

  it('sums the line totals into the subtotal and passes the DTO total through', () => {
    const twoItems = order({
      items: [
        { id: 'a', productName: 'Serum', productImage: null, quantity: 1, unitPrice: '10.00', totalPrice: '10.00' },
        { id: 'b', productName: 'Cream', productImage: null, quantity: 1, unitPrice: '7.50', totalPrice: '7.50' },
      ],
      totalAmount: '15.50',
      discountAmount: '2.00',
    });

    const data = buildMerchantInvoiceData(twoItems, NOW);

    expect(data.subtotal).toBe('17.50');
    expect(data.totalAmount).toBe('15.50');
    expect(data.hasDiscount).toBe(true);
    expect(data.discountAmount).toBe('2.00');
    expect(data.lines.map((line) => line.name)).toEqual(['Serum', 'Cream']);
  });

  it('treats only a completed payment as paid and flags anything else as pending', () => {
    const pending = buildMerchantInvoiceData(order(), NOW);
    expect(pending.isPaymentPaid).toBe(false);
    expect(pending.isPaymentPending).toBe(true);
    expect(pending.paymentStatus).toBe('pending');

    const paid = buildMerchantInvoiceData(order({ paymentStatus: 'completed' }), NOW);
    expect(paid.isPaymentPaid).toBe(true);
    expect(paid.isPaymentPending).toBe(false);
  });

  it('labels the payment method, status and address from the DTO only', () => {
    const data = buildMerchantInvoiceData(order(), NOW);

    expect(data.paymentMethodLabel).toBe('Cash On Delivery');
    expect(data.statusLabel).toBe('Confirmed');
    expect(data.sellerName).toBe('Cosmetics Finder');
    expect(data.shippingAddressLines).toEqual([
      'Aye Aye',
      '1 Main St',
      'Yangon',
      'MM',
      '+95 912345678',
    ]);
    expect(data.orderDate).toBe('2026-09-01T10:00:00.000Z');
    expect(data.issueDate).toBe('2026-09-20T08:30:00.000Z');
  });

  it('keeps the invoice free of commission figures (it is the customer copy)', () => {
    const data = buildMerchantInvoiceData(order(), NOW);
    const html = buildMerchantInvoiceHtml(data, labels);

    expect(html).not.toMatch(/commission/i);
    expect(html).not.toMatch(/you receive/i);
  });
});

describe('formatInvoiceDate', () => {
  it('renders a long, readable date in the active locale', () => {
    const formatted = formatInvoiceDate('2026-09-01T12:00:00.000Z', 'en-US');

    // Midday UTC, and the runner's zone may shift it by at most a day: what
    // matters is the long "Month D, YYYY" shape, not the runner's offset.
    expect(['August 31, 2026', 'September 1, 2026', 'September 2, 2026']).toContain(formatted);
    expect(formatted).not.toContain('T');
  });
});

describe('buildMerchantInvoiceHtml', () => {
  const data = buildMerchantInvoiceData(order(), NOW);
  const html = buildMerchantInvoiceHtml(data, labels, 'en-US');

  it('carries every field a merchant invoice needs', () => {
    for (const expected of [
      'ORD-1',
      `${labels.orderDate}: ${formatInvoiceDate(data.orderDate, 'en-US')}`,
      `${labels.issueDate}: ${formatInvoiceDate(data.issueDate, 'en-US')}`,
      'Aye Aye',
      'aye@example.com',
      '1 Main St',
      'Hydrating Serum',
      '10,000 Ks',
      'Cash On Delivery',
      'Cosmetics Finder',
    ]) {
      expect(html).toContain(expected);
    }
    expect(html).toContain(labels.columnQuantity);
    expect(html).toContain(labels.columnUnitPrice);
    expect(html).toContain(labels.columnLineTotal);
    expect(html).toContain(labels.subtotal);
    expect(html).toContain(labels.total);
  });

  it('states a PENDING payment and never reads like a payment receipt', () => {
    expect(html).toContain('PENDING');
    expect(html).toContain(labels.paymentPendingNotice);
    expect(html).not.toContain(labels.paymentReceivedNotice);
    expect(html).not.toContain('>PAID<');
  });

  it('shows PAID only when the DTO reports a completed payment', () => {
    const paid = buildMerchantInvoiceHtml(
      buildMerchantInvoiceData(order({ paymentStatus: 'completed' }), NOW),
      labels,
      'en-US',
    );

    expect(paid).toContain('PAID');
    expect(paid).toContain(labels.paymentReceivedNotice);
    expect(paid).not.toContain('PENDING');
  });

  it('prints the discount row only for an order that has a discount', () => {
    const discounted = buildMerchantInvoiceHtml(
      buildMerchantInvoiceData(order({ discountAmount: '500.00', totalAmount: '9500.00' }), NOW),
      labels,
      'en-US',
    );

    expect(discounted).toContain(`<span>${labels.discount}</span>`);
    expect(discounted).toContain('-500 Ks');
    expect(html).not.toContain(`<span>${labels.discount}</span>`);
  });

  it('escapes merchant and customer supplied text', () => {
    const injected = order({
      items: [
        {
          id: 'x',
          productName: '<script>alert(1)</script> Serum',
          productImage: null,
          quantity: 1,
          unitPrice: '1.00',
          totalPrice: '1.00',
        },
      ],
      shippingAddress: { recipientName: 'Aye "Aye" & Co', addressLine1: '<b>1 Main St</b>' },
    });

    const escaped = buildMerchantInvoiceHtml(buildMerchantInvoiceData(injected, NOW), labels, 'en-US');

    expect(escaped).not.toContain('<script>alert(1)</script>');
    expect(escaped).toContain('&lt;script&gt;alert(1)&lt;/script&gt; Serum');
    expect(escaped).toContain('Aye &quot;Aye&quot; &amp; Co');
    expect(escaped).toContain('&lt;b&gt;1 Main St&lt;/b&gt;');
  });
});

describe('printMerchantInvoice', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes the invoice into a new window and opens the browser print dialog', () => {
    const write = vi.fn();
    const close = vi.fn();
    const focus = vi.fn();
    const print = vi.fn();
    // Runs the deferred print callback immediately instead of waiting 250 ms.
    const runImmediately = vi.fn((callback: () => void) => {
      callback();
      return 0;
    });
    const open = vi.spyOn(window, 'open').mockReturnValue({
      document: { write, close },
      focus,
      print,
      setTimeout: runImmediately,
    } as unknown as Window);
    const data = buildMerchantInvoiceData(order(), NOW);

    expect(printMerchantInvoice(data, labels, 'en-US')).toBe(true);

    expect(open).toHaveBeenCalledWith('', '_blank');
    expect(write).toHaveBeenCalledWith(buildMerchantInvoiceHtml(data, labels, 'en-US'));
    expect(close).toHaveBeenCalledTimes(1);
    expect(focus).toHaveBeenCalledTimes(1);
    expect(print).toHaveBeenCalledTimes(1);
  });

  it('reports a blocked pop-up instead of throwing', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);

    expect(printMerchantInvoice(buildMerchantInvoiceData(order(), NOW), labels)).toBe(false);
  });
});

