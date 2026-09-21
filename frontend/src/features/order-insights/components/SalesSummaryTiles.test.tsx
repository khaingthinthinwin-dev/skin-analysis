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
});