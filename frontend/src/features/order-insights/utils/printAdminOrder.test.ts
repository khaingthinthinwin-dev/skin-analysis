import { describe, expect, it, vi } from 'vitest';
import { buildAdminOrderPrintHtml, printAdminOrder } from './printAdminOrder';
import { OrderStatus } from '../types/orderInsights.types';
import type { AdminOrderDetailDto } from '../types/adminOrderInsights.types';

const ORDER: AdminOrderDetailDto = {
  id: '9f1c1a52-6f0e-4f6d-9a1e-2b5d3c7e8a10',
  orderNumber: 'ORD-9F1C1A52',
  createdAt: '2026-08-21T09:30:00.000Z',
  status: OrderStatus.SHIPPED,
  items: [{ id: 'item-1', productId: 'product-1', productName: 'Vitamin C Serum', quantity: 2, unitPrice: '45.00', totalPrice: '90.00' }],
  discountAmount: '5.00',
  couponCode: 'GLOW10',
  totalAmount: '85.00',
  paymentMethod: 'credit_card',
  paymentStatus: 'completed',
  shippingAddress: { recipientName: 'Aye Aye', line1: '1 Main St', city: 'Yangon', postalCode: '11111' },
  notes: 'Leave at the front desk',
  customer: { name: 'Aye Aye', email: 'aye@example.com', phone: '+959123456789' },
  shop: { name: 'Lotus Glow Shop', merchantId: '7c2d', merchantName: 'Thiri' },
  timeline: [
    { status: OrderStatus.PLACED, statusName: 'Placed', changedBy: 'aye@example.com', note: null, createdAt: '2026-08-21T09:30:00.000Z' },
    { status: OrderStatus.SHIPPED, statusName: 'Shipped', changedBy: 'admin@platform.com', note: 'Handed to courier', createdAt: '2026-08-22T08:00:00.000Z' },
  ],
};

describe('printAdminOrder', () => {
  it('renders the order, the shop contact and the customer into one document', () => {
    const html = buildAdminOrderPrintHtml(ORDER);

    expect(html).toContain('ORD-9F1C1A52');
    expect(html).toContain('Lotus Glow Shop');
    expect(html).toContain('Thiri');
    expect(html).toContain('aye@example.com');
    expect(html).toContain('1 Main St');
    expect(html).toContain('Vitamin C Serum');
    expect(html).toContain('Leave at the front desk');
  });

  it('includes the status history with who changed it and why', () => {
    const html = buildAdminOrderPrintHtml(ORDER);

    expect(html).toContain('Status History');
    expect(html).toContain('admin@platform.com');
    expect(html).toContain('Handed to courier');
  });

  it('omits the history section entirely when the order has none', () => {
    const html = buildAdminOrderPrintHtml({ ...ORDER, timeline: [] });

    expect(html).not.toContain('Status History');
  });

  it('escapes values coming from the order so they cannot inject markup', () => {
    const html = buildAdminOrderPrintHtml({
      ...ORDER,
      customer: { name: '<script>alert(1)</script>', email: 'aye@example.com', phone: null },
    });

    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert(1)');
  });

  it('keeps its print rules inside its own document rather than the app', () => {
    const html = buildAdminOrderPrintHtml(ORDER);

    expect(html).toContain('@media print');
    expect(html).not.toContain('oidark:');
  });

  it('writes the document into a separate window and opens the browser print dialog', () => {
    const printWindow = {
      document: { write: vi.fn(), close: vi.fn() },
      focus: vi.fn(),
      print: vi.fn(),
      setTimeout: vi.fn(),
    };
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(printWindow as unknown as Window);

    expect(printAdminOrder(ORDER)).toBe(true);
    expect(openSpy).toHaveBeenCalledWith('', '_blank');
    expect(printWindow.document.write).toHaveBeenCalledTimes(1);
    expect(printWindow.focus).toHaveBeenCalled();
    expect(printWindow.setTimeout).toHaveBeenCalled();

    openSpy.mockRestore();
  });

  it('reports a blocked pop-up instead of throwing', () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);

    expect(printAdminOrder(ORDER)).toBe(false);

    openSpy.mockRestore();
  });

  it('formats every money figure in Ks like the rest of the app', () => {
    const html = buildAdminOrderPrintHtml(ORDER);

    expect(html).toContain('45 Ks'); // unit price
    expect(html).toContain('90 Ks'); // line total / subtotal
    expect(html).toContain('85 Ks'); // total
    expect(html).not.toContain('$');
  });

  it('keeps the read-only disclaimer on the printed footer', () => {
    const html = buildAdminOrderPrintHtml(ORDER);

    expect(html).toContain('This copy is read-only and is not a payment receipt.');
  });

  it('trims print-only spacing so a small order stays on one A4 page', () => {
    const html = buildAdminOrderPrintHtml(ORDER);
    const printRules = html.slice(html.indexOf('@media print'));

    expect(printRules).toContain('.header { padding-bottom: 14px; }');
    expect(printRules).toContain('section { margin-top: 14px; }');
    expect(printRules).toContain('footer { margin-top: 16px; padding-top: 10px; break-inside: avoid; }');
    // Rows and headings stay whole when a longer order does spill to page 2.
    expect(printRules).toContain('tr { break-inside: avoid; }');
    expect(printRules).toContain('break-after: avoid');
  });
});