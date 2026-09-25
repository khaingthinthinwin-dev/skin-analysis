import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExportMerchantOrdersDialog } from './ExportMerchantOrdersDialog';
import { useRevenueSummary } from '../hooks/useRevenueSummary';
import { getAllMerchantOrders } from '../services/merchantOrderService';
import { buildMerchantOrdersExportFilename, exportMerchantOrdersCsv } from '../utils/exportMerchantOrdersCsv';
import { OrderStatus } from '../types/orderInsights.types';
import type { MerchantOrderListRowDto } from '../types/merchantOrderInsights.types';
import type { OrderListFilterFormData } from '../schemas/orderFilters.schema';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }) }));
vi.mock('../services/merchantOrderService', () => ({ getAllMerchantOrders: vi.fn() }));
// The dialog reads the current platform rate from the cached Revenue Summary;
// the query itself is covered by useRevenueSummary.test.tsx. Tests that need the
// "columns skipped" state set `mockCommissionRate` to undefined/''.
let mockCommissionRate: string | undefined = '12.00';
vi.mock('../hooks/useRevenueSummary', () => ({
  useRevenueSummary: vi.fn(() => ({ data: mockCommissionRate === undefined ? undefined : { commissionRate: mockCommissionRate } })),
}));
// Only the filename and the download are stubbed: normalizeCommissionRate stays
// the real one, so the notice follows the exact rule the export uses.
vi.mock('../utils/exportMerchantOrdersCsv', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../utils/exportMerchantOrdersCsv')>()),
  buildMerchantOrdersExportFilename: vi.fn(() => 'merchant-orders-scope.csv'),
  exportMerchantOrdersCsv: vi.fn(),
}));

const DEFAULT_FILTERS: OrderListFilterFormData = {
  status: 'all', from: '', to: '', page: 1, limit: 20, sort: 'createdAt', order: 'desc',
};

function row(id: string): MerchantOrderListRowDto {
  return { id, createdAt: '2026-09-01', status: OrderStatus.DELIVERED, itemCount: 1, totalAmount: '1.00', paymentStatus: 'completed', customerName: 'Customer' };
}

type DialogProps = Parameters<typeof ExportMerchantOrdersDialog>[0];

function renderDialog(props: Partial<DialogProps> = {}) {
  const user = userEvent.setup();
  render(<ExportMerchantOrdersDialog filters={DEFAULT_FILTERS} total={30} onClose={vi.fn()} {...props} />);
  return user;
}

/** The scope lines interleave labels and styled spans, so assert on the panel text. */
function dialogText() {
  return screen.getByRole('dialog', { name: 'Export Orders' }).textContent ?? '';
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCommissionRate = '12.00';
  vi.mocked(getAllMerchantOrders).mockResolvedValue([row('1')]);
});

describe('ExportMerchantOrdersDialog', () => {
  it('opens as a modal dialog that explains what the CSV will include', () => {
    renderDialog();

    const dialog = screen.getByRole('dialog', { name: 'Export Orders' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('The CSV will include orders matching your current filters.')).toBeInTheDocument();
    expect(dialogText()).toContain('Export Scope');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(useRevenueSummary).toHaveBeenCalledWith({ period: 'this_month' });
    expect(dialogText()).not.toContain('commission rate unavailable');
  });

  it('states the unfiltered scope as Status: All and Date Range: All dates', () => {
    renderDialog();

    expect(dialogText()).toContain('Status:');
    expect(dialogText()).toContain('Date Range:');
    expect(dialogText()).toContain('All dates');
    expect(dialogText()).toContain('Result: All orders within this range');
  });

  it('states the applied status pill and ISO date range', () => {
    renderDialog({
      filters: {
        ...DEFAULT_FILTERS,
        status: 'out_for_delivery',
        from: '2026-09-01T00:00:00.000Z',
        to: '2026-09-30T00:00:00.000Z',
      },
      total: 12,
    });

    expect(screen.getByText('2026/09/01 to 2026/09/30')).toBeInTheDocument();
    expect(dialogText()).toContain('Out For Delivery');
    expect(dialogText()).toContain('Result: Out For Delivery orders within this range');
  });

  it('disables the export and warns when nothing matches the filters', () => {
    renderDialog({ total: 0 });

    expect(screen.getByRole('alert')).toHaveTextContent('No orders to export.');
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
  });

  it('downloads every matching row on confirm and then closes', async () => {
    const onClose = vi.fn();
    const user = renderDialog({ total: 30, onClose });

    await user.click(screen.getByRole('button', { name: 'Export CSV' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(getAllMerchantOrders).toHaveBeenCalledWith(DEFAULT_FILTERS);
    expect(exportMerchantOrdersCsv).toHaveBeenCalledWith([row('1')], {
      filename: 'merchant-orders-scope.csv',
      commissionRate: '12.00',
    });
    expect(buildMerchantOrdersExportFilename).toHaveBeenCalledWith(DEFAULT_FILTERS);
  });

  it('reports a failed export inside the dialog and stays open', async () => {
    vi.mocked(getAllMerchantOrders).mockRejectedValueOnce(new Error('network down'));
    const onClose = vi.fn();
    const user = renderDialog({ total: 30, onClose });

    await user.click(screen.getByRole('button', { name: 'Export CSV' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Unable to export orders. Please try again.'));
    expect(exportMerchantOrdersCsv).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeEnabled();
  });

  it('closes through Cancel, the X and Escape without exporting', async () => {
    const onClose = vi.fn();
    const user = renderDialog({ onClose });

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(getAllMerchantOrders).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(2);

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('keeps the Cancel button disabled while the export is running', async () => {
    let resolveExport: (rows: ReturnType<typeof row>[]) => void = () => undefined;
    vi.mocked(getAllMerchantOrders).mockImplementation(
      () => new Promise((resolve) => { resolveExport = resolve as typeof resolveExport; }),
    );
    renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));

    expect(await screen.findByRole('button', { name: 'Exporting...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();

    resolveExport([row('1')]);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Exporting...' })).not.toBeInTheDocument());
  });

  it('warns that the commission columns are skipped while the rate is unavailable', () => {
    mockCommissionRate = undefined;
    renderDialog();

    expect(dialogText()).toContain('Commission and You receive columns are not included — commission rate unavailable.');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('treats an empty rate from the summary as unavailable', () => {
    mockCommissionRate = '';
    renderDialog();

    expect(dialogText()).toContain('commission rate unavailable');
  });
});
