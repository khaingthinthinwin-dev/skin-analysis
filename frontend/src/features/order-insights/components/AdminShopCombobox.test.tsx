import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminShopCombobox } from './AdminShopCombobox';
import type { AdminMerchantOption } from '../types/adminOrderInsights.types';

const { useAdminMerchantOptions } = vi.hoisted(() => ({ useAdminMerchantOptions: vi.fn() }));

vi.mock('../hooks/useAdminMerchantOptions', () => ({ useAdminMerchantOptions }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }),
}));

const LOTUS: AdminMerchantOption = { id: 'merchant-1', shopName: 'Lotus Glow', user: { name: 'Aye Chan', email: 'lotus@example.com' } };

function setOptions(overrides: Partial<ReturnType<typeof useAdminMerchantOptions>> = {}) {
  useAdminMerchantOptions.mockReturnValue({
    data: [LOTUS],
    isFetching: false,
    ...overrides,
  } as ReturnType<typeof useAdminMerchantOptions>);
}

/** Mirrors how the filter bar owns the text: the box reflects what was typed. */
function ControlledCombobox({ onSelect, initial = '' }: { onSelect: (option: AdminMerchantOption) => void; initial?: string }) {
  const [value, setValue] = useState(initial);
  return <AdminShopCombobox value={value} onValueChange={setValue} onSelect={onSelect} placeholder="Search shop" />;
}

describe('AdminShopCombobox', () => {
  beforeEach(() => {
    useAdminMerchantOptions.mockReset();
    setOptions();
  });

  it('reports every keystroke so the free-text shop filter keeps working', async () => {
    const onSelect = vi.fn();
    render(<ControlledCombobox onSelect={onSelect} />);

    await userEvent.type(screen.getByRole('combobox'), 'Lot');

    expect(screen.getByRole('combobox')).toHaveValue('Lot');
    expect(useAdminMerchantOptions).toHaveBeenLastCalledWith('Lot');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('keeps the list closed until something has been typed', () => {
    render(<AdminShopCombobox value="" onValueChange={vi.fn()} onSelect={vi.fn()} placeholder="Search shop" />);

    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('offers the matching shops with the owning account to disambiguate', async () => {
    render(<AdminShopCombobox value="Lot" onValueChange={vi.fn()} onSelect={vi.fn()} placeholder="Search shop" />);

    await userEvent.click(screen.getByRole('combobox'));

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Lotus Glow/ })).toBeInTheDocument();
    // The merchant's name replaces the email underneath the shop name.
    expect(screen.getByText('Aye Chan')).toBeInTheDocument();
    expect(screen.queryByText('lotus@example.com')).not.toBeInTheDocument();
  });

  it('hands the chosen shop back so the page can pin the exact merchant', async () => {
    const onSelect = vi.fn();
    render(<AdminShopCombobox value="Lot" onValueChange={vi.fn()} onSelect={onSelect} placeholder="Search shop" />);

    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByRole('button', { name: /Lotus Glow/ }));

    expect(onSelect).toHaveBeenCalledWith(LOTUS);
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  });

  it('tells the admin that plain name filtering still applies when nothing matches', async () => {
    setOptions({ data: [], isFetching: false });
    render(<AdminShopCombobox value="zzz" onValueChange={vi.fn()} onSelect={vi.fn()} placeholder="Search shop" />);

    await userEvent.click(screen.getByRole('combobox'));

    expect(screen.getByText('No matching shops. Keep typing to filter by name.')).toBeInTheDocument();
  });
});