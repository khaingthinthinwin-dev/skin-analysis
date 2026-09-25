import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RevenueSummaryGroup } from './RevenueSummaryGroup';
import type { RevenueSummaryDto } from '../types/merchantOrderInsights.types';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }) }));

const summary: RevenueSummaryDto = {
  sales: '100.00',
  commission: '12.00',
  revenue: '88.00',
  aov: '88.00',
  orderCount: 1,
  commissionRate: '12.00',
  commissionRateSource: 'current_settings',
  commissionRateLocked: false,
  period: { code: 'this_month', from: '2026-09-01', to: '2026-09-30' },
};

describe('RevenueSummaryGroup', () => {
  it('keeps all figures together and exposes the unlocked-rate note via the info button', () => {
    render(<RevenueSummaryGroup data={summary} period="this_month" onPeriodChange={vi.fn()} />);
    // Figures are MMK rendered via formatCurrencyAmount (whole Ks, no decimals).
    expect(screen.getByText('100 Ks')).toBeInTheDocument();
    expect(screen.getAllByText('88 Ks')).toHaveLength(2);
    expect(screen.getByRole('button', { name: /historical rate locking is pending/i })).toBeInTheDocument();
  });

  it('summarises the basis of the figures in the footer with a singular order noun', () => {
    render(<RevenueSummaryGroup data={summary} period="this_month" onPeriodChange={vi.fn()} />);
    expect(screen.getByText('Based on 1 order · Commission at 12%')).toBeInTheDocument();
  });

  it('drops the info button once the rate is locked', () => {
    render(<RevenueSummaryGroup data={{ ...summary, commissionRateSource: 'order_snapshot', commissionRateLocked: true }} period="this_month" onPeriodChange={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /historical rate locking is pending/i })).not.toBeInTheDocument();
    expect(screen.getByText('Based on 1 order · Commission at 12%')).toBeInTheDocument();
  });

  it('renders the period pill toggle next to the card title', () => {
    render(<RevenueSummaryGroup data={summary} period="this_month" onPeriodChange={vi.fn()} />);
    expect(screen.getByText('Revenue Summary')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Period' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'This Month' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('labels the active period in a pill beside the title', () => {
    render(<RevenueSummaryGroup data={summary} period="this_month" onPeriodChange={vi.fn()} />);
    expect(screen.getByText('Sep 1 – Sep 30, 2026')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sep 1 – Sep 30, 2026' })).not.toBeInTheDocument();
  });

  it('opens the custom range modal without fetching, marks Custom active and holds the figures back', () => {
    const onPeriodChange = vi.fn();
    render(<RevenueSummaryGroup data={summary} period="this_month" onPeriodChange={onPeriodChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Custom' }));

    expect(screen.getByRole('dialog', { name: 'Custom range' })).toBeInTheDocument();
    // The open dialog hides the page behind it from the accessibility tree.
    expect(screen.getByRole('button', { name: 'Custom', hidden: true })).toHaveAttribute('aria-pressed', 'true');
    expect(onPeriodChange).not.toHaveBeenCalled();
    expect(screen.queryByText('Sep 1 – Sep 30, 2026')).not.toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(4);
  });

  it('falls back to the previous preset when the modal is dismissed without applying', () => {
    const onPeriodChange = vi.fn();
    render(<RevenueSummaryGroup data={summary} period="this_month" onPeriodChange={onPeriodChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Custom' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Custom' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'This Month' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('100 Ks')).toBeInTheDocument();
    expect(screen.getByText('Sep 1 – Sep 30, 2026')).toBeInTheDocument();
    expect(onPeriodChange).not.toHaveBeenCalled();
  });

  it('keeps the card and the pending placeholders while showing the server range error', () => {
    render(<RevenueSummaryGroup period="custom" error="End date must be on or after start date" onPeriodChange={vi.fn()} />);

    expect(screen.getByText('Revenue Summary')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Period' })).toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(4);

    fireEvent.click(screen.getByRole('button', { name: 'Custom' }));

    expect(screen.getByRole('alert')).toHaveTextContent('End date must be on or after start date');
  });

  it('applies a picked range and hands the focus back to the Custom toggle', () => {
    const onPeriodChange = vi.fn();
    const onApply = vi.fn();
    render(<RevenueSummaryGroup data={summary} period="this_month" onPeriodChange={onPeriodChange} onApply={onApply} />);

    fireEvent.click(screen.getByRole('button', { name: 'Custom' }));
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2024-01-05' } });
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2024-01-20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onApply).toHaveBeenCalledWith('2024-01-05', '2024-01-20');
    expect(onPeriodChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Custom' })).toHaveFocus();
  });

  it('reopens the modal from the applied custom range pill', () => {
    render(<RevenueSummaryGroup period="custom" from="2024-01-05" to="2024-01-20" onPeriodChange={vi.fn()} />);

    expect(screen.getByText('Jan 5 – Jan 20, 2024')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Jan 5 – Jan 20, 2024' }));

    expect(screen.getByRole('dialog', { name: 'Custom range' })).toBeInTheDocument();
    expect(screen.getByLabelText('Start date')).toHaveValue('2024-01-05');
    expect(screen.getByLabelText('End date')).toHaveValue('2024-01-20');
  });

  it('closes the modal with Escape and returns the focus to the Custom toggle', () => {
    render(<RevenueSummaryGroup data={summary} period="this_month" onPeriodChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Custom' }));
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Custom' })).toHaveFocus();
  });

  it('renders placeholder figures instead of an empty formula box when no data is available', () => {
    render(<RevenueSummaryGroup period="custom" onPeriodChange={vi.fn()} />);
    expect(screen.getAllByText('—')).toHaveLength(4);
    expect(screen.getByText('Based on 0 orders · Commission at 0%')).toBeInTheDocument();
  });

  it('stacks the four figures vertically below sm and keeps the formula row from sm up (BR-OI-026)', () => {
    const { container } = render(<RevenueSummaryGroup data={summary} period="this_month" onPeriodChange={vi.fn()} />);

    // Mobile is a single column (all four figures stay visible); the sm variant is the original
    // Sales − Commission = Revenue | AOV row.
    const formulaBox = screen.getByText('Sales').parentElement?.parentElement;
    expect(formulaBox).toHaveClass('grid-cols-1', 'sm:grid-cols-[1fr_auto_1fr_auto_1fr_1px_1fr]');

    // Every figure is a label/value line on mobile and the stacked block from sm up.
    for (const label of ['Sales', 'Commission', 'Revenue', 'AOV']) {
      expect(screen.getByText(label).parentElement).toHaveClass('justify-between', 'sm:block');
    }
    expect(screen.getByText('Revenue').parentElement).toHaveClass('bg-[#f9f5ff]', 'px-3', 'sm:py-1');

    // The period pill toggle spans the card on mobile and shrinks back to its intrinsic width from sm up.
    expect(screen.getByRole('group', { name: 'Period' }).parentElement).toHaveClass('w-full', 'sm:w-max');

    // The AOV separator is a horizontal rule below sm and the vertical divider from sm up.
    expect(container.querySelector('div[aria-hidden="true"].h-px')).toHaveClass('h-px', 'bg-gray-200', 'sm:h-auto', 'sm:self-stretch');
  });
});
