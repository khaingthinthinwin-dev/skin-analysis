import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StatusTransitionControl } from './StatusTransitionControl';
import { formatStatusLabel } from '../utils/orderStatusLabel';
import { OrderStatus } from '../types/orderInsights.types';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }) }));

describe('formatStatusLabel', () => {
  it('title-cases status codes', () => {
    expect(formatStatusLabel('confirmed')).toBe('Confirmed');
    expect(formatStatusLabel('out_for_delivery')).toBe('Out For Delivery');
  });
});

describe('StatusTransitionControl', () => {
  it('renders the current badge and an "Advance to …" button when a next status is available', () => {
    render(
      <StatusTransitionControl
        currentStatus={OrderStatus.PLACED}
        nextStatus="confirmed"
        isUpdating={false}
        onAdvance={vi.fn()}
      />,
    );

    expect(screen.getByText('Advance to Confirmed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /advance to confirmed/i })).toBeInTheDocument();
  });

  it('does not render any button when there is no next status', () => {
    render(
      <StatusTransitionControl
        currentStatus={OrderStatus.DELIVERED}
        nextStatus={null}
        isUpdating={false}
        onAdvance={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: /advance/i })).not.toBeInTheDocument();
  });

  it('disables the advance button while an update is in flight', () => {
    render(
      <StatusTransitionControl
        currentStatus={OrderStatus.CONFIRMED}
        nextStatus="packed"
        isUpdating
        onAdvance={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /advance to packed/i })).toBeDisabled();
  });

  it('calls onAdvance with the next status when the dialog is confirmed', async () => {
    const onAdvance = vi.fn();
    const user = userEvent.setup();

    render(
      <StatusTransitionControl
        currentStatus={OrderStatus.CONFIRMED}
        nextStatus="packed"
        isUpdating={false}
        onAdvance={onAdvance}
      />,
    );

    await user.click(screen.getByRole('button', { name: /advance to packed/i }));
    expect(screen.getByText('Mark this order as Packed?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /confirm/i }));

    expect(onAdvance).toHaveBeenCalledWith('packed');
  });

  it('does not call onAdvance when the dialog is cancelled', async () => {
    const onAdvance = vi.fn();
    const user = userEvent.setup();

    render(
      <StatusTransitionControl
        currentStatus={OrderStatus.CONFIRMED}
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