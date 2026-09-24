import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SalesSummaryTiles } from './SalesSummaryTiles';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }) }));

describe('SalesSummaryTiles', () => {
  it('only makes the completed tile actionable', () => {
    render(<SalesSummaryTiles data={{ todayCount: 1, thisMonthCount: 2, completedCount: 3 }} onCompletedClick={vi.fn()} />);
    expect(screen.getByText('Completed Orders').closest('button')).toBeInTheDocument();
    expect(screen.getByText("Today's Orders").closest('button')).toBeNull();
  });

  it('uses the Buyer Order Insights KPI card typography for label and value', () => {
    render(<SalesSummaryTiles data={{ todayCount: 1, thisMonthCount: 2, completedCount: 3 }} onCompletedClick={vi.fn()} />);
    expect(screen.getByText("Today's Orders").className).toContain('text-[12.5px]');
    expect(screen.getByText("This Month's Orders").className).toContain('text-gray-500');
    expect(screen.getByText('2').className).toContain('text-[22px]');
    expect(screen.getByText('2').className).toContain('font-bold');
  });

  it('shows one placeholder card per tile while loading', () => {
    const { container } = render(<SalesSummaryTiles loading onCompletedClick={vi.fn()} />);
    expect(container.querySelectorAll('[class*="animate-pulse"]')).toHaveLength(3);
    expect(screen.queryByText('Completed Orders')).not.toBeInTheDocument();
  });

  it('hints that the completed tile is clickable without adding a line to the tile', () => {
    const { container } = render(<SalesSummaryTiles data={{ todayCount: 1, thisMonthCount: 2, completedCount: 3 }} onCompletedClick={vi.fn()} />);

    // One hint only, and it shares the value's flex row so the tile keeps the same height as its siblings.
    expect(screen.getAllByText('View')).toHaveLength(1);
    expect(screen.getByText('3').parentElement?.className).toContain('flex items-center');
    expect(screen.getByText('Completed Orders').closest('button')).toHaveTextContent('View');
    // The two plain tiles stay hint-free, so no line is added to them either.
    expect(screen.getByText("Today's Orders").closest('div')).not.toHaveTextContent('View');
    expect(screen.getByText("This Month's Orders").closest('div')).not.toHaveTextContent('View');
    // Three KPI icons plus the single arrow hint.
    expect(container.querySelectorAll('svg')).toHaveLength(4);
  });

  it('names the completed tile for assistive tech and keeps hover/focus in the purple palette', () => {
    render(<SalesSummaryTiles data={{ todayCount: 1, thisMonthCount: 2, completedCount: 3 }} onCompletedClick={vi.fn()} />);

    const completed = screen.getByRole('button', { name: 'View completed orders' });
    expect(completed).toHaveTextContent('Completed Orders');
    expect(completed.className).toContain('hover:border-[#7c3aed]');
    expect(completed.className).toContain('hover:bg-[#f9f5ff]');
    expect(completed.className).toContain('hover:text-gray-900');
    expect(completed.className).toContain('hover:shadow-md');
    expect(completed.className).toContain('focus-visible:bg-[#f9f5ff]');
    expect(completed.className).toContain('focus-visible:ring-violet-500');
    // tailwind-merge drops the outline variant's pink accent hover so it can never leak through.
    expect(completed.className).not.toContain('hover:bg-accent');
    expect(completed.className).not.toContain('hover:text-accent-foreground');
  });
});
