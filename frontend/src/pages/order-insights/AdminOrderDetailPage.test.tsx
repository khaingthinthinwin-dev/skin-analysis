import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import AdminOrderDetailPage from './AdminOrderDetailPage';
import { OrderStatus } from '@/features/order-insights/types/orderInsights.types';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const { useAdminOrderDetail, useAdminOrderTracking } = vi.hoisted(() => ({
  useAdminOrderDetail: vi.fn(),
  useAdminOrderTracking: vi.fn(),
}));

vi.mock('@/features/order-insights/hooks/useAdminOrderDetail', () => ({ useAdminOrderDetail }));
vi.mock('@/features/order-insights/hooks/useAdminOrderTracking', () => ({ useAdminOrderTracking }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
    i18n: { resolvedLanguage: 'en-US', language: 'en-US' },
  }),
}));

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={['/admin/orders/order-12345678']}>
      <Routes>
        <Route path="/admin/orders/:id" element={<AdminOrderDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdminOrderDetailPage', () => {
  beforeEach(() => {
    useAdminOrderDetail.mockReturnValue({
      data: {
        id: 'order-12345678',
        orderNumber: 'ORD-12345678',
        createdAt: '2026-09-01T10:00:00.000Z',
        status: OrderStatus.SHIPPED,
        items: [{ id: 'item-1', productName: 'Vitamin C Serum', quantity: 2, unitPrice: '20.00', totalPrice: '40.00' }],
        discountAmount: '5.00',
        couponCode: 'GLOW5',
        totalAmount: '35.00',
        paymentMethod: 'credit_card',
        paymentStatus: 'completed',
        shippingAddress: { line1: '1 Main St', city: 'Yangon', postalCode: '11111' },
        notes: 'Leave at the front desk',
        customer: { name: 'Aye Aye', email: 'aye@example.com', phone: '+959123456789' },
        shop: { name: 'Lotus Glow', merchantId: 'merchant-1' },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    useAdminOrderTracking.mockReturnValue({
      data: { currentStatus: OrderStatus.SHIPPED, historyAvailable: true, steps: [] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('renders documented admin details without order mutation or tracking actions', () => {
    renderDetail();

    expect(screen.getByText('Vitamin C Serum')).toBeInTheDocument();
    expect(screen.getByText('Lotus Glow')).toBeInTheDocument();
    expect(screen.getByText('Aye Aye')).toBeInTheDocument();
    expect(screen.getByText('aye@example.com')).toBeInTheDocument();
    expect(screen.getByText('1 Main St')).toBeInTheDocument();
    expect(screen.getByText('Leave at the front desk')).toBeInTheDocument();
    expect(screen.queryByText(/track|change status|refund|cancel/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to all orders/i })).toBeInTheDocument();
  });

  it('shows the merchant contact name the admin needs to reach the shop owner', () => {
    useAdminOrderDetail.mockReturnValue({
      data: {
        id: 'order-12345678',
        orderNumber: 'ORD-12345678',
        createdAt: '2026-09-01T10:00:00.000Z',
        status: OrderStatus.SHIPPED,
        items: [],
        discountAmount: '0.00',
        couponCode: null,
        totalAmount: '0.00',
        paymentMethod: 'credit_card',
        paymentStatus: 'completed',
        shippingAddress: {},
        notes: null,
        customer: { name: 'Aye Aye', email: 'aye@example.com', phone: null },
        shop: { name: 'Lotus Glow', merchantId: 'merchant-1', merchantName: 'Thiri' },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderDetail();

    expect(screen.getByText('Merchant contact: Thiri')).toBeInTheDocument();
    expect(screen.getByText('Merchant ID: merchant-1')).toBeInTheDocument();
  });

  it('links each line item to its product and falls back when the image is gone', () => {
    useAdminOrderDetail.mockReturnValue({
      data: {
        id: 'order-12345678',
        orderNumber: 'ORD-12345678',
        createdAt: '2026-09-01T10:00:00.000Z',
        status: OrderStatus.SHIPPED,
        items: [
          { id: 'item-1', productId: 'product-1', productName: 'Vitamin C Serum', productImage: '/uploads/serum.jpg', quantity: 1, unitPrice: '20.00', totalPrice: '20.00' },
          { id: 'item-2', productId: 'product-2', productName: 'Retinol Cream', productImage: null, quantity: 1, unitPrice: '30.00', totalPrice: '30.00' },
        ],
        discountAmount: '0.00',
        couponCode: null,
        totalAmount: '50.00',
        paymentMethod: 'credit_card',
        paymentStatus: 'completed',
        shippingAddress: {},
        notes: null,
        customer: { name: 'Aye Aye', email: 'aye@example.com', phone: null },
        shop: { name: 'Lotus Glow' },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderDetail();

    expect(screen.getByRole('link', { name: /Vitamin C Serum/ })).toHaveAttribute('href', '/products/product-1');
    expect(screen.getByRole('link', { name: /Retinol Cream/ })).toHaveAttribute('href', '/products/product-2');
    // A product with no stored image must not render a broken image.
    expect(document.querySelectorAll('img')).toHaveLength(1);
  });

  it('renders the product name as plain text when the order carries no product id', () => {
    renderDetail();

    expect(screen.queryByRole('link', { name: /Vitamin C Serum/ })).not.toBeInTheDocument();
    expect(screen.getByText('Vitamin C Serum')).toBeInTheDocument();
  });

  it('hands the order to the browser print dialog without touching the order', async () => {
    const printWindow = {
      document: { write: vi.fn(), close: vi.fn() },
      focus: vi.fn(),
      print: vi.fn(),
      setTimeout: vi.fn(),
    };
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(printWindow as unknown as Window);

    renderDetail();
    await userEvent.click(screen.getByRole('button', { name: /print \/ save as pdf/i }));

    expect(openSpy).toHaveBeenCalledWith('', '_blank');
    expect(printWindow.document.write).toHaveBeenCalledTimes(1);
    expect(printWindow.setTimeout).toHaveBeenCalled();
    expect(screen.queryByText(/track|change status|refund|cancel/i)).not.toBeInTheDocument();

    openSpy.mockRestore();
  });

  it('explains when the browser blocks the print pop-up', async () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);

    renderDetail();
    await userEvent.click(screen.getByRole('button', { name: /print \/ save as pdf/i }));

    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/allow pop-ups/i));

    openSpy.mockRestore();
  });
});
