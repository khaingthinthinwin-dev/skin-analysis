import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RangeLabelPill } from './RangeLabelPill';

describe('RangeLabelPill', () => {
  it('renders a static pill for a preset period', () => {
    render(<RangeLabelPill label="2026/09/01 – 2026/09/24" />);

    expect(screen.getByText('2026/09/01 – 2026/09/24')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders a clickable pill for an applied custom range', () => {
    const onClick = vi.fn();
    render(<RangeLabelPill label="2026/09/10 – 2026/09/12" interactive onClick={onClick} />);

    fireEvent.click(screen.getByRole('button', { name: '2026/09/10 – 2026/09/12' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
