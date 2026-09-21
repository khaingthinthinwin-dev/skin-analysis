import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MerchantOrderTable } from './MerchantOrderTable';
import { OrderStatus } from '../types/orderInsights.types';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }) }));

describe('MerchantOrderTable', () => {
  it('renders the customer column and both row actions', () => {
    render(<MerchantOrderTable rows={[{ id: 'order-12345678', createdAt: '2026-09-01', status: OrderStatus.DELIVERED, itemCount: 2, totalAmount: '10.00', paymentStatus: 'completed', customerName: 'Aye Aye' }]} onView={vi.fn()} onTrack={vi.fn()} onSort={vi.fn()} currentSort="createdAt" currentOrder="desc" />);
    expect(screen.getAllByText('Customer').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Aye Aye')).toHaveLength(2);
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(2);
  });
});