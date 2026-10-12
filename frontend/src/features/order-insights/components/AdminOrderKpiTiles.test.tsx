import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdminOrderKpiTiles } from './AdminOrderKpiTiles';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }),
}));

describe('AdminOrderKpiTiles', () => {
  it('shows the filtered totals and the endpoint aggregates', () => {
    render(
      <AdminOrderKpiTiles
        meta={{ page: 1, limit: 20, total: 42 }}
        summary={{ totalSpent: 1250, inProgress: 7, completed: 35 }}
      />,
    );

    expect(screen.getByText('Total orders')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('1,250 Ks')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('35')).toBeInTheDocument();
  });

  it('never labels the order value as revenue', () => {
    render(<AdminOrderKpiTiles meta={{ page: 1, limit: 20, total: 1 }} summary={{ totalSpent: 10, inProgress: 1, completed: 0 }} />);

    expect(screen.queryByText(/revenue/i)).not.toBeInTheDocument();
  });

  it('renders an em dash and a note when the payload carries no aggregates', () => {
    render(<AdminOrderKpiTiles meta={{ page: 1, limit: 20, total: 3 }} summary={undefined} />);

    expect(screen.getByText('Total orders')).toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(3);
    expect(screen.getByText('Aggregates are not available for this result set.')).toBeInTheDocument();
  });

  it('shows an empty zero result rather than hiding the figures', () => {
    render(<AdminOrderKpiTiles meta={{ page: 1, limit: 20, total: 0 }} summary={{ totalSpent: 0, inProgress: 0, completed: 0 }} />);

    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(3);
  });

  it('renders a skeleton while the first request is in flight', () => {
    const { container } = render(<AdminOrderKpiTiles meta={undefined} summary={undefined} loading />);

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByText('Total orders')).not.toBeInTheDocument();
  });
});