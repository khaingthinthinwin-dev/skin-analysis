import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MerchantEmptyOrderState } from './MerchantEmptyOrderState';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }) }));

describe('MerchantEmptyOrderState', () => {
  it('clears filters without offering buyer navigation', () => {
    render(<MerchantEmptyOrderState onReset={vi.fn()} />);
    expect(screen.getByText('No orders match the current filters.')).toBeInTheDocument();
    expect(screen.queryByText(/browse products/i)).not.toBeInTheDocument();
  });
});