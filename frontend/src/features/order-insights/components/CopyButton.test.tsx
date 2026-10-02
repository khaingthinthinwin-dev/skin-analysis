import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { CopyButton } from './CopyButton';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : _key) }),
}));

const toastSuccess = toast.success as ReturnType<typeof vi.fn>;
const toastError = toast.error as ReturnType<typeof vi.fn>;

function stubClipboard(writeText: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true, writable: true });
}

describe('CopyButton', () => {
  it('copies the plain value and confirms with a Copied toast', async () => {
    vi.clearAllMocks();
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);

    render(<CopyButton value="haml@gmail.com" label="Copy customer email" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy customer email' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('haml@gmail.com'));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Copied'));
  });

  it('shows an error toast instead of throwing when the clipboard fails', async () => {
    vi.clearAllMocks();
    stubClipboard(vi.fn().mockRejectedValue(new Error('denied')));

    render(<CopyButton value="secret" label="Copy shipping address" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy shipping address' }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Could not copy to the clipboard.'));
  });
});