import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StatusTransitionControl } from './StatusTransitionControl';
import { formatStatusLabel } from '../utils/orderStatusLabel';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }) }));

describe('formatStatusLabel', () => {
  it('title-cases status codes', () => {
    expect(formatStatusLabel('confirmed')).toBe('Confirmed');
    expect(formatStatusLabel('out_for_delivery')).toBe('Out For Delivery');
  });
});

describe('StatusTransitionControl', () => {
  it('renders an "Advance to …" button when a next status is available', () => {
    render(
      <StatusTransitionControl
        nextStatus="confirmed"
        isUpdating={false}
        onAdvance={vi.fn()}
      />,
    );

    expect(screen.getByText('Advance to Confirmed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /advance to confirmed/i })).toBeInTheDocument();
    // The status pill lives in the page header now — never duplicated here.
    expect(screen.queryByText('placed')).not.toBeInTheDocument();
  });

  it('renders nothing when there is no next status', () => {
    const { container } = render(
      <StatusTransitionControl nextStatus={null} isUpdating={false} onAdvance={vi.fn()} />,
    );

    expect(screen.queryByRole('button', { name: /advance/i })).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });

  it('disables the advance button while an update is in flight', () => {
    render(
      <StatusTransitionControl
        nextStatus="packed"
        isUpdating
        onAdvance={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /advance to packed/i })).toBeDisabled();
  });

  it('asks for confirmation with the target status and notification copy', async () => {
    const onAdvance = vi.fn();
    const user = userEvent.setup();

    render(
      <StatusTransitionControl
        nextStatus="packed"
        isUpdating={false}
        onAdvance={onAdvance}
      />,
    );

    await user.click(screen.getByRole('button', { name: /advance to packed/i }));
    expect(screen.getByText('Confirm order?')).toBeInTheDocument();
    expect(
      screen.getByText('The status will change to Packed and the customer will be notified.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /confirm/i }));

    expect(onAdvance).toHaveBeenCalledWith('packed');
  });

  it('does not call onAdvance when the dialog is cancelled', async () => {
    const onAdvance = vi.fn();
    const user = userEvent.setup();

    render(
      <StatusTransitionControl
        nextStatus="packed"
        isUpdating={false}
        onAdvance={onAdvance}
      />,
    );

    await user.click(screen.getByRole('button', { name: /advance to packed/i }));
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onAdvance).not.toHaveBeenCalled();
  });
});