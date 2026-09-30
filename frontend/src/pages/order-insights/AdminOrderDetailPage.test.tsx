import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminOrderDetailPage from './AdminOrderDetailPage';
import { OrderStatus } from '@/features/order-insights/types/orderInsights.types';

const { useAdminOrderDetail } = vi.hoisted(() => ({ useAdminOrderDetail: vi.fn() }));

vi.mock('@/features/order-insights/hooks/useAdminOrderDetail', () => ({ useAdminOrderDetail }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }) }));

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
  });

  it('renders documented admin details without order mutation or tracking actions', () => {
    render(
      <MemoryRouter initialEntries={['/admin/orders/order-12345678']}>
        <Routes>
          <Route path="/admin/orders/:id" element={<AdminOrderDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Vitamin C Serum')).toBeInTheDocument();
    expect(screen.getByText('Lotus Glow')).toBeInTheDocument();
    expect(screen.getByText('Aye Aye')).toBeInTheDocument();
    expect(screen.getByText('aye@example.com')).toBeInTheDocument();
    expect(screen.getByText('1 Main St')).toBeInTheDocument();
    expect(screen.getByText('Leave at the front desk')).toBeInTheDocument();
    expect(screen.queryByText(/track|change status|refund|cancel/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to all orders/i })).toBeInTheDocument();
  });
});
