import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AdminActiveFilterChips } from './AdminActiveFilterChips';
import type { AdminOrderFilterFormData } from '../schemas/orderFilters.schema';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }),
}));

const BASE: AdminOrderFilterFormData = {
  status: 'all',
  paymentStatus: 'all',
  shopSearch: '',
  from: '',
  to: '',
  page: 1,
  limit: 20,
  sort: 'createdAt',
  order: 'desc',
};

describe('AdminActiveFilterChips', () => {
  it('renders nothing while no filter is applied', () => {
    const { container } = render(<AdminActiveFilterChips filters={BASE} onClear={vi.fn()} onClearAll={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('mirrors every applied filter group', () => {
    render(
      <AdminActiveFilterChips
        filters={{ ...BASE, shopSearch: 'Lotus Glow', status: 'shipped', paymentStatus: 'pending', from: '2026-09-01', to: '2026-09-30' }}
        onClear={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );

    expect(screen.getByText('Lotus Glow')).toBeInTheDocument();
    expect(screen.getByText('Shipped')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText(/2026/)).toBeInTheDocument();
    expect(screen.getByText('Clear all')).toBeInTheDocument();
  });

  it('removes a single filter group without touching the others', async () => {
    const onClear = vi.fn();
    const onClearAll = vi.fn();
    render(<AdminActiveFilterChips filters={{ ...BASE, shopSearch: 'Lotus Glow', status: 'shipped' }} onClear={onClear} onClearAll={onClearAll} />);

    await userEvent.click(screen.getByRole('button', { name: 'Remove filter: Status' }));

    expect(onClear).toHaveBeenCalledWith('status');
    expect(onClearAll).not.toHaveBeenCalled();
  });

  it('clears the date range as one group even when only one end is set', async () => {
    const onClear = vi.fn();
    render(<AdminActiveFilterChips filters={{ ...BASE, from: '2026-09-01' }} onClear={onClear} onClearAll={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Remove filter: Date range' }));

    expect(onClear).toHaveBeenCalledWith('dateRange');
  });

  it('does not offer Clear all when only the default filters are set', () => {
    render(<AdminActiveFilterChips filters={{ ...BASE, status: 'all', paymentStatus: 'all' }} onClear={vi.fn()} onClearAll={vi.fn()} />);

    expect(screen.queryByText('Clear all')).not.toBeInTheDocument();
  });
});