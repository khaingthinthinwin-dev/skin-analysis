import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CustomRangeModal } from './CustomRangeModal';
import { toIsoDate } from '../utils/dateRangeLabel';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }) }));

/** Dates safely in the past so the assertions never depend on the day the suite runs. */
const PAST_FROM = '2024-01-05';
const PAST_TO = '2024-01-20';

type ModalProps = Parameters<typeof CustomRangeModal>[0];

function renderModal(props: Partial<ModalProps> = {}) {
  const user = userEvent.setup();
  render(<CustomRangeModal onClose={vi.fn()} {...props} />);
  return user;
}

const setStart = (value: string) => fireEvent.change(screen.getByLabelText('Start date'), { target: { value } });
const setEnd = (value: string) => fireEvent.change(screen.getByLabelText('End date'), { target: { value } });

describe('CustomRangeModal', () => {
  it('opens as a modal dialog with the focus on the start field and caps both fields at today', () => {
    renderModal();

    const dialog = screen.getByRole('dialog', { name: 'Custom range' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Choose the period to calculate your revenue.')).toBeInTheDocument();
    expect(screen.getByText('No dates selected')).toBeInTheDocument();
    expect(screen.getByLabelText('Start date')).toHaveFocus();
    expect(screen.getByLabelText('Start date')).toHaveAttribute('max', toIsoDate(new Date()));
    expect(screen.getByLabelText('End date')).toHaveAttribute('max', toIsoDate(new Date()));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('prefills an applied range and floors the end field at the picked start', () => {
    renderModal({ from: PAST_FROM, to: PAST_TO });

    expect(screen.getByLabelText('Start date')).toHaveValue(PAST_FROM);
    expect(screen.getByLabelText('End date')).toHaveValue(PAST_TO);
    expect(screen.getByLabelText('End date')).toHaveAttribute('min', PAST_FROM);
    expect(screen.getByText('Jan 5 – Jan 20, 2024')).toBeInTheDocument();
    expect(screen.getByText('16 days')).toBeInTheDocument();
    expect(screen.getByLabelText('Start date')).toHaveFocus();
  });

  it('walks the summary line from empty to half picked to a complete range', () => {
    renderModal();

    expect(screen.getByText('No dates selected')).toBeInTheDocument();

    setStart(PAST_FROM);
    expect(screen.getByText('Now pick an end date')).toBeInTheDocument();

    setEnd(PAST_TO);
    expect(screen.queryByText('Now pick an end date')).not.toBeInTheDocument();
    expect(screen.getByText('Jan 5 – Jan 20, 2024')).toHaveClass('font-semibold', 'text-[#7c3aed]');
    expect(screen.getByText('16 days')).toBeInTheDocument();
  });

  it('asks for the missing half of the range and counts a single day once', () => {
    renderModal();

    setEnd(PAST_TO);
    expect(screen.getByText('Now pick a start date')).toBeInTheDocument();

    setStart(PAST_FROM);
    setEnd(PAST_FROM);
    expect(screen.getByText('Jan 5, 2024')).toBeInTheDocument();
    expect(screen.getByText('1 day')).toBeInTheDocument();
  });

  it('applies the picked range', () => {
    const onApply = vi.fn();
    renderModal({ onApply });

    setStart(PAST_FROM);
    setEnd(PAST_TO);
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onApply).toHaveBeenCalledWith(PAST_FROM, PAST_TO);
  });

  it('stays open with the error line when a date is missing and clears it on the next pick', () => {
    const onApply = vi.fn();
    renderModal({ onApply });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onApply).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Select a start and end date.');
    expect(screen.getByRole('dialog', { name: 'Custom range' })).toBeInTheDocument();

    setStart(PAST_FROM);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Now pick an end date')).toBeInTheDocument();
  });

  it('refuses a start after the end and stays open', () => {
    const onApply = vi.fn();
    renderModal({ onApply });

    setStart(PAST_TO);
    setEnd(PAST_FROM);
    // A backwards range keeps asking for the end date instead of showing a range.
    expect(screen.getByText('Now pick an end date')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onApply).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Start date must be before end date.');
    expect(screen.getByRole('dialog', { name: 'Custom range' })).toBeInTheDocument();

    setEnd('2024-01-30');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Jan 20 – Jan 30, 2024')).toBeInTheDocument();
  });

  it('refuses a range that reaches into the future', () => {
    const onApply = vi.fn();
    renderModal({ onApply });
    const tomorrow = toIsoDate(new Date(Date.now() + 86_400_000));

    setStart(tomorrow);
    setEnd(tomorrow);
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onApply).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Select a start and end date.');
  });

  it('surfaces the server range error in the error line and clears it on the next pick', () => {
    renderModal({ error: 'End date must be on or after start date' });

    expect(screen.getByRole('alert')).toHaveTextContent('End date must be on or after start date');

    setEnd(PAST_TO);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('closes through Cancel, the X, Escape and a click on the dimmed backdrop', async () => {
    const onClose = vi.fn();
    const user = renderModal({ onClose });

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(2);

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(3);

    const backdrop = screen.getByRole('dialog', { name: 'Custom range' }).previousElementSibling;
    expect(backdrop).not.toBeNull();
    fireEvent.pointerDown(backdrop as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(4);
  });

  it('traps the keyboard focus inside the dialog', async () => {
    const user = renderModal();
    const dialog = screen.getByRole('dialog', { name: 'Custom range' });

    // Start, End, Cancel, Apply and the X close the loop.
    for (let step = 0; step < 6; step += 1) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });
});
