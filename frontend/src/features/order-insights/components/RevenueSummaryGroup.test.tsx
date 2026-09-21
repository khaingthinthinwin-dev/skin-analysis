import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RevenueSummaryGroup } from './RevenueSummaryGroup';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }) }));

describe('RevenueSummaryGroup', () => {
  it('keeps all figures together and shows the unlocked-rate note', () => {
    render(<RevenueSummaryGroup data={{ sales: '100.00', commission: '12.00', revenue: '88.00', aov: '88.00', orderCount: 1, commissionRate: '12.00', commissionRateSource: 'current_settings', commissionRateLocked: false, period: { code: 'this_month', from: '', to: '' } }} period="this_month" onPeriodChange={vi.fn()} />);
    expect(screen.getByText('$100.00')).toBeInTheDocument();
    expect(screen.getAllByText('$88.00')).toHaveLength(2);
    expect(screen.getByText(/historical rate locking is pending/i)).toBeInTheDocument();
  });
});