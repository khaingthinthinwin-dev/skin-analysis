import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RangeLabelPill } from './RangeLabelPill';

describe('RangeLabelPill', () => {
  it('renders a static pill for a preset period', () => {
    render(<RangeLabelPill label="Sep 1 – Sep 24, 2026" />);

    expect(screen.getByText('Sep 1 – Sep 24, 2026')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders a clickable pill for an applied custom range', () => {
    const onClick = vi.fn();
    render(<RangeLabelPill label="Sep 10 – Sep 12, 2026" interactive onClick={onClick} />);

    fireEvent.click(screen.getByRole('button', { name: 'Sep 10 – Sep 12, 2026' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
