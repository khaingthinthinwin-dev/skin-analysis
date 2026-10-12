import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminOrdersPage from './AdminOrdersPage';

const { useAdminOrders } = vi.hoisted(() => ({ useAdminOrders: vi.fn() }));

vi.mock('@/features/order-insights/hooks/useAdminOrders', () => ({ useAdminOrders }));
vi.mock('@/lib/api-client', () => ({ default: { get: vi.fn().mockResolvedValue({ data: [] }) } }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key, i18n: { resolvedLanguage: 'en-US', language: 'en-US' } }),
}));

const ROWS = [
  {
    id: 'order-12345678',
    createdAt: '2026-09-01T00:00:00.000Z',
    status: 'delivered',
    itemCount: 2,
    totalAmount: '120.00',
    paymentStatus: 'completed',
    customerName: 'Aye Aye',
    shopName: 'Lotus Glow',
  },
];

function setOrders(overrides = {}) {
  useAdminOrders.mockReturnValue({
    data: { orders: ROWS, meta: { page: 1, limit: 20, total: 1 }, summary: { totalSpent: 120, inProgress: 0, completed: 1 } },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  });
}

/** Surfaces the live query string so tests can assert what the URL ended up holding. */
function LocationProbe() {
  const { search } = useLocation();
  return <span data-testid="location-search">{search}</span>;
}

function readSearch(): URLSearchParams {
  return new URLSearchParams(screen.getByTestId('location-search').textContent ?? '');
}

function renderPage(path = '/admin/orders') {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/admin/orders"
            element={
              <>
                <AdminOrdersPage />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AdminOrdersPage', () => {
  beforeEach(() => {
    useAdminOrders.mockReset();
    setOrders();
  });

  it('puts the filtered headline figures above the table', async () => {
    renderPage();

    expect(screen.getByText('Total orders')).toBeInTheDocument();
    const orderValueTile = screen.getByText('Order value').closest('div');
    expect(orderValueTile).not.toBeNull();
    expect(within(orderValueTile as HTMLElement).getByText('120 Ks')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'All Orders' })).toBeInTheDocument();
  });

  it('narrows the list by order number so the copied value has a destination', async () => {
    renderPage();

    await userEvent.type(screen.getByRole('textbox', { name: /order #/i }), '#A1B2C3D4');

    // verify-all runs vitest with v8 coverage; under that load typing these
    // 9 chars took 11s, so the 250ms-debounced URL sync can miss Testing
    // Library's default 1000ms waitFor budget even when the code is correct.
    await waitFor(() => expect(readSearch().get('orderSearch')).toBe('#A1B2C3D4'), {
      timeout: 10000,
    });
    expect(screen.getByRole('button', { name: 'Remove filter: Order #' })).toBeInTheDocument();
  });

  it('clears the order number without disturbing the other filters', async () => {
    renderPage('/admin/orders?orderSearch=%23A1B2C3D4&status=delivered');

    await userEvent.click(await screen.findByRole('button', { name: 'Remove filter: Order #' }));

    await waitFor(() => {
      const params = readSearch();
      expect(params.get('orderSearch')).toBeNull();
      expect(params.get('status')).toBe('delivered');
    });
  });

  it('shows the applied filters as removable chips taken from the URL', async () => {
    renderPage('/admin/orders?status=delivered&paymentStatus=pending&shopSearch=Lotus%20Glow');

    expect(await screen.findByRole('button', { name: 'Remove filter: Status' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove filter: Payment' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove filter: Shop / Merchant' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear all' })).toBeInTheDocument();
  });

  it('drops one filter from the URL without touching the others', async () => {
    renderPage('/admin/orders?status=delivered&paymentStatus=pending');

    await userEvent.click(await screen.findByRole('button', { name: 'Remove filter: Payment' }));

    await waitFor(() => {
      const params = readSearch();
      expect(params.get('status')).toBe('delivered');
      expect(params.get('paymentStatus')).toBeNull();
    });
  });

  it('clears the whole filter set at once', async () => {
    renderPage('/admin/orders?status=delivered&paymentStatus=pending&from=2026-09-01');

    await userEvent.click(await screen.findByRole('button', { name: 'Clear all' }));

    await waitFor(() => expect([...readSearch().keys()].sort()).toEqual(['limit', 'order', 'page', 'sort']));
  });

  it('offers the shop filter as a searchable picker', async () => {
    renderPage();

    expect(await screen.findByRole('combobox', { name: /shop/i })).toBeInTheDocument();
  });

  it('renders the empty state with a clear action when nothing matches', async () => {
    setOrders({ data: { orders: [], meta: { page: 1, limit: 20, total: 0 }, summary: { totalSpent: 0, inProgress: 0, completed: 0 } } });

    renderPage();

    expect(await screen.findByText('No orders match the current filters.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear Filters' })).toBeInTheDocument();
  });

  it('offers a retry when the list request fails', async () => {
    setOrders({ data: undefined, error: new Error('boom') });

    renderPage();

    expect(await screen.findByText('Unable to load orders')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});