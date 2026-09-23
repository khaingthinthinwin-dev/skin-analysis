import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import MerchantOrderDetailPage from './MerchantOrderDetailPage';
import { OrderStatus } from '@/features/order-insights/types/orderInsights.types';
import type { MerchantOrderDetailDto, MerchantTrackingDto } from '@/features/order-insights/types/merchantOrderFulfillment.types';

vi.mock('@/lib/api-client', () => ({ default: { get: vi.fn(), patch: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, next?: unknown) => {
      if (typeof next === 'string') return next;
      if (next && typeof next === 'object' && 'defaultValue' in next) {
        return (next as { defaultValue?: string }).defaultValue ?? _key;
      }
      return _key;
    },
    i18n: { resolvedLanguage: 'en-US', language: 'en-US' },
  }),
}));

const detail: MerchantOrderDetailDto = {
  id: 'order-1',
  orderNumber: 'ORD-ORDER-1',
  createdAt: '2026-09-01T10:00:00.000Z',
  status: OrderStatus.PLACED,
  items: [
    { id: 'item-1', productName: 'Hydrating Serum', productImage: null, quantity: 1, unitPrice: '10.00', totalPrice: '10.00' },
  ],
  discountAmount: '0.00',
  totalAmount: '10.00',
  paymentMethod: 'cod',
  paymentStatus: 'pending',
  shippingAddress: { recipientName: 'Aye Aye', addressLine1: '1 Main St', country: 'MM' },
  notes: null,
  customer: { name: 'Aye Aye', email: 'aye@example.com', phone: '+95 912345678' },
  availableTransitions: ['confirmed'],
};

const tracking: MerchantTrackingDto = {
  timeline: [
    { status: 'placed', statusName: 'Placed', note: 'Order placed', changedBy: null, createdAt: '2026-09-01T09:00:00.000Z' },
  ],
};

const getMock = apiClient.get as ReturnType<typeof vi.fn>;
const patchMock = apiClient.patch as ReturnType<typeof vi.fn>;

function mockApi({ order = detail, timeline = tracking } = {}) {
  getMock.mockImplementation((url: string) => {
    if (url === '/merchant/orders/order-1/tracking') {
      return Promise.resolve({ data: { data: timeline } });
    }
    return Promise.resolve({ data: { data: order } });
  });
  patchMock.mockResolvedValue({
    data: {
      data: { ...order, status: OrderStatus.CONFIRMED, availableTransitions: ['packed'] },
    },
  });
}

function renderPage() {
  const router = createMemoryRouter(
    [{ path: '/merchant/orders/:id', element: <MerchantOrderDetailPage /> }],
    { initialEntries: ['/merchant/orders/order-1'] },
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('MerchantOrderDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a loading skeleton while the detail query is pending', () => {
    getMock.mockImplementation(() => new Promise(() => {}));

    renderPage();

    expect(screen.getByLabelText('Loading order')).toBeInTheDocument();
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('shows a 403 blocking panel for an unapproved merchant', async () => {
    getMock.mockImplementation((url: string) => {
      if (url === '/merchant/orders/order-1/tracking') return Promise.resolve({ data: { data: tracking } });
      return Promise.reject({ response: { status: 403, data: { message: 'Your merchant account is not approved' } } });
    });

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Access denied');
    expect(screen.getByText('Your merchant account is not approved')).toBeInTheDocument();
  });

  it('shows the not-found empty state with a link back to order insights for a 404', async () => {
    getMock.mockImplementation((url: string) => {
      if (url === '/merchant/orders/order-1/tracking') return Promise.resolve({ data: { data: tracking } });
      return Promise.reject({ response: { status: 404, data: { message: 'Order not found' } } });
    });

    renderPage();

    expect(await screen.findByText('Order not found')).toBeInTheDocument();
    const backLink = screen.getByRole('link', { name: /Back to Order Insights/i });
    expect(backLink).toHaveAttribute('href', '/merchant/order-insights');
  });

  it('renders customer info and an "Advance to Confirmed" button for a placed order', async () => {
    mockApi();

    renderPage();

    expect(await screen.findByRole('button', { name: /Advance to Confirmed/i })).toBeInTheDocument();
    expect(screen.getByText('aye@example.com')).toBeInTheDocument();
    expect(screen.getByText('+95 912345678')).toBeInTheDocument();
    expect(screen.getAllByText('Aye Aye').length).toBeGreaterThan(0);
  });

  it('does not render an advance button for a terminal order', async () => {
    mockApi({ order: { ...detail, status: OrderStatus.DELIVERED, availableTransitions: [] } });

    renderPage();

    await screen.findByText('Order ORD-ORDER-1');
    expect(screen.queryByRole('button', { name: /Advance to/i })).not.toBeInTheDocument();
  });

  it('cancelling the confirm dialog does not call PATCH', async () => {
    mockApi();
    const user = userEvent.setup();

    renderPage();

    await user.click(await screen.findByRole('button', { name: /Advance to Confirmed/i }));
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(patchMock).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('confirming calls PATCH with the right body and refreshes both queries', async () => {
    mockApi();
    const user = userEvent.setup();

    renderPage();

    await user.click(await screen.findByRole('button', { name: /Advance to Confirmed/i }));
    await user.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => expect(patchMock).toHaveBeenCalledWith('/merchant/orders/order-1/status', { status: 'confirmed' }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Order marked as Confirmed')));
    await waitFor(() => expect(getMock).toHaveBeenCalledTimes(4));
  });

  it('surfaces a 422 server message via toast and re-enables the button after failure', async () => {
    mockApi({ order: { ...detail, status: OrderStatus.CONFIRMED, availableTransitions: ['packed'] } });
    patchMock.mockRejectedValue({
      response: { status: 422, data: { message: 'Orders can only move forward one step at a time' } },
    });
    const user = userEvent.setup();

    renderPage();

    await user.click(await screen.findByRole('button', { name: /Advance to Packed/i }));
    await user.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Orders can only move forward one step at a time'),
    );
    await waitFor(() => expect(screen.getByRole('button', { name: /Advance to Packed/i })).not.toBeDisabled());
  });

  it('surfaces a 429 rate-limit message via toast', async () => {
    mockApi({ order: { ...detail, status: OrderStatus.CONFIRMED, availableTransitions: ['packed'] } });
    patchMock.mockRejectedValue({
      response: { status: 429, data: { message: 'Too many requests. Please wait 60 seconds' } },
    });
    const user = userEvent.setup();

    renderPage();

    await user.click(await screen.findByRole('button', { name: /Advance to Packed/i }));
    await user.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Too many requests. Please wait 60 seconds'));
  });
});