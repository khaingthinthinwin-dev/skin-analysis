import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PeriodSelector } from './PeriodSelector';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }) }));

describe('PeriodSelector', () => {
  it('selects Custom via the toggle without rendering its own date inputs', () => {
    const onChange = vi.fn();
    render(<PeriodSelector value="this_month" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Custom' }));
    expect(onChange).toHaveBeenCalledWith('custom', undefined, undefined);
    expect(screen.queryByLabelText('From')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('To')).not.toBeInTheDocument();
  });

  it('renders the period options as one pill toggle group', () => {
    render(<PeriodSelector value="this_month" onChange={vi.fn()} />);
    expect(screen.getByRole('group', { name: 'Period' })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(4);
    expect(screen.queryByLabelText('From')).not.toBeInTheDocument();
  });

  it('marks the active period and clears custom dates when leaving custom', () => {
    const onChange = vi.fn();
    render(<PeriodSelector value="custom" from="2026-09-01" to="2026-09-30" onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Custom' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'This Month' })).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(screen.getByRole('button', { name: 'This Month' }));
    expect(onChange).toHaveBeenCalledWith('this_month', undefined, undefined);
  });

  it('wraps the pills into a full-width two-column grid below sm and restores the inline pills from sm up', () => {
    render(<PeriodSelector value="this_month" onChange={vi.fn()} />);

    // Four 88px pills cannot fit a phone viewport, so the group fills the card and wraps 2x2 on mobile.
    expect(screen.getByRole('group', { name: 'Period' })).toHaveClass('grid', 'w-full', 'grid-cols-2', 'sm:inline-flex', 'sm:w-auto');
    expect(screen.getByRole('button', { name: 'This Month' })).toHaveClass('w-full', 'sm:w-auto', 'sm:min-w-[88px]', 'sm:px-4');
    expect(screen.getByRole('button', { name: 'Custom' })).toHaveClass('w-full', 'sm:min-w-[88px]', 'sm:px-4');
  });
});
