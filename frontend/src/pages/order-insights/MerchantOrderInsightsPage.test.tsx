import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import MerchantOrderInsightsPage from './MerchantOrderInsightsPage';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }) }));
vi.mock('@/features/order-insights/hooks/useOrderListFilters', () => ({ useOrderListFilters: () => ({ methods: { reset: vi.fn(), setValue: vi.fn(), getValues: vi.fn(() => 'createdAt'), handleSubmit: vi.fn(), watch: vi.fn(), control: {}, formState: { errors: {} } }, filters: { status: 'all', from: '', to: '', page: 1, limit: 20, sort: 'createdAt', order: 'desc' } }) }));
vi.mock('@/features/order-insights/hooks/useOrderQueryParams', () => ({ useOrderQueryParams: () => ({ patch: vi.fn() }) }));
vi.mock('@/features/order-insights/hooks/useSalesSummary', () => ({ useSalesSummary: () => ({ data: { todayCount: 1, thisMonthCount: 2, completedCount: 3 }, isLoading: false, error: null, refetch: vi.fn() }) }));
vi.mock('@/features/order-insights/hooks/useRevenueSummary', () => ({ useRevenueSummary: () => ({ data: { sales: '10.00', commission: '1.00', revenue: '9.00', aov: '9.00', orderCount: 1, commissionRate: '12.00', commissionRateLocked: false, commissionRateSource: 'current_settings', period: { code: 'this_month', from: '', to: '' } }, isLoading: false, error: null, refetch: vi.fn() }) }));
vi.mock('@/features/order-insights/hooks/useMerchantOrders', () => ({ useMerchantOrders: () => ({ data: { orders: [], meta: { page: 1, limit: 20, total: 0 } }, isLoading: false, error: null, refetch: vi.fn() }) }));
vi.mock('@/features/order-insights/components/OrderFilterBar', () => ({ OrderFilterBar: () => <div data-testid="order-filter-bar" /> }));

describe('MerchantOrderInsightsPage', () => {
  it('renders the merchant title and scope note', () => {
    render(<MemoryRouter><MerchantOrderInsightsPage /></MemoryRouter>);
    expect(screen.getByText('Order Insights')).toBeInTheDocument();
    expect(screen.getByText('Showing orders for your shop only.')).toBeInTheDocument();
  });
});