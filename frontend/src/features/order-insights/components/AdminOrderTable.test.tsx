import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import { AdminOrderTable } from './AdminOrderTable';
import { OrderStatus } from '../types/orderInsights.types';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key, i18n: { resolvedLanguage: 'en-US', language: 'en-US' } }) }));

describe('AdminOrderTable', () => {
  it('shows shop and buyer fields with a view action and no tracking or mutation controls', () => {
    render(
      <MemoryRouter>
        <AdminOrderTable
          rows={[{
            id: 'order-12345678',
            createdAt: '2026-09-01T00:00:00.000Z',
            status: OrderStatus.DELIVERED,
            itemCount: 2,
            totalAmount: '12000.00',
            paymentStatus: 'completed',
            customerName: 'Aye Aye',
            shopName: 'Lotus Glow',
          }]}
          onSort={vi.fn()}
          currentSort="createdAt"
          currentOrder="desc"
        />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('Lotus Glow')).toHaveLength(2);
    expect(screen.getAllByText('Aye Aye')).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: /view/i })).toHaveLength(2);
    expect(screen.queryByText(/track/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/refund|cancel/i)).not.toBeInTheDocument();
  });
});
