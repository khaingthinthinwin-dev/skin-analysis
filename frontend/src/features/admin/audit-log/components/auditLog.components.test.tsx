import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../../../../../public/locales/en/translation.json';
import { AuditLogFilters } from './AuditLogFilters';
import { AuditLogTable } from './AuditLogTable';
import { AuditLogDetailModal } from './AuditLogDetailModal';
import { DeleteAuditLogsDialog } from './DeleteAuditLogsDialog';
import { AuditLogExportDialog } from './AuditLogExportDialog';
import { AuditLogPagination } from './AuditLogPagination';
import {
  DEFAULT_AUDIT_LOG_QUERY,
  type AuditLogQueryState,
} from '../schemas/auditLog.schema';
import { useAuditLogQuery } from '../hooks/useAuditLogQuery';
import type { AuditLogListItem } from '../services/auditLog.service';

i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { translation: en } },
  interpolation: { escapeValue: false },
});

const newQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const renderI18n = (ui: React.ReactElement) =>
  render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={newQueryClient()}>{ui}</QueryClientProvider>
    </I18nextProvider>,
  );

const row = (overrides: Partial<AuditLogListItem> = {}): AuditLogListItem => ({
  id: '11111111-1111-4111-8111-111111111111',
  userId: '22222222-2222-4222-8222-222222222222',
  userName: 'Ada',
  userEmail: 'ada@example.com',
  userRole: 'admin',
  action: 'merchant.approve',
  entityType: 'Merchant',
  summary: 'Merchant Approve Merchant',
  ipAddress: '10.0.0.1',
  createdAt: '2026-08-25T14:30:00.000Z',
  ...overrides,
});

const SEARCHED_USER_ID = '44444444-4444-4444-8444-444444444444';

describe('AuditLogFilters', () => {
  const baseQuery: AuditLogQueryState = { ...DEFAULT_AUDIT_LOG_QUERY };

  const applyRange = (
    dateFrom: string,
    dateTo: string,
  ): AuditLogQueryState => ({
    ...baseQuery,
    dateFrom,
    dateTo,
  });

  // Both date inputs share their aria-label with the calendar icon buttons, so
  // narrow the query to the input element.
  const fromInput = () => screen.getByLabelText('From', { selector: 'input' });
  const toInput = () => screen.getByLabelText('To', { selector: 'input' });
  // The filter panel has a single text input: the merged search box.
  const searchBox = () =>
    screen.getByTestId('audit-search') as HTMLInputElement;

  const renderFilters = (
    query: AuditLogQueryState,
    onChange: (patch: Partial<AuditLogQueryState>) => void = vi.fn(),
  ): {
    onChange: (patch: Partial<AuditLogQueryState>) => void;
    rerender: (q: AuditLogQueryState) => void;
  } => {
    const view = renderI18n(
      <AuditLogFilters
        query={query}
        activeCount={0}
        onChange={onChange}
        onClear={vi.fn()}
      />,
    );
    return {
      onChange,
      rerender: (next: AuditLogQueryState) =>
        view.rerender(
          <I18nextProvider i18n={i18n}>
            <QueryClientProvider client={newQueryClient()}>
              <AuditLogFilters
                query={next}
                activeCount={0}
                onChange={onChange}
                onClear={vi.fn()}
              />
            </QueryClientProvider>
          </I18nextProvider>,
        ),
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders filter controls and clear button only when active', () => {
    const onChange = vi.fn();
    const onClear = vi.fn();
    const { rerender } = renderI18n(
      <AuditLogFilters
        query={baseQuery}
        options={{ actions: ['merchant.approve'], entityTypes: ['Merchant'] }}
        activeCount={0}
        onChange={onChange}
        onClear={onClear}
      />,
    );
    expect(
      screen.getByLabelText('Search', { selector: 'input' }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('btn-clear-filters')).not.toBeInTheDocument();

    rerender(
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={newQueryClient()}>
          <AuditLogFilters
            query={{ ...baseQuery, search: 'ada' }}
            options={{ actions: [], entityTypes: [] }}
            activeCount={1}
            onChange={onChange}
            onClear={onClear}
          />
        </QueryClientProvider>
      </I18nextProvider>,
    );
    expect(screen.getByTestId('btn-clear-filters')).toBeInTheDocument();
    expect(screen.getByTestId('active-filters-count')).toHaveTextContent('1');
  });

  it('renders exactly one search box and no separate user filter', () => {
    renderFilters(baseQuery);

    // One merged box replaces both the User autocomplete and the old Search box.
    expect(screen.getByTestId('audit-search')).toBeInTheDocument();
    expect(searchBox()).toHaveValue('');
    expect(
      screen.getByLabelText('Search', { selector: 'input' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText('User', { selector: 'input' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('audit-user-filter')).not.toBeInTheDocument();
  });

  it('debounces the merged search term into the query', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    renderFilters(baseQuery, onChange);

    await user.type(searchBox(), 'ada');

    await waitFor(
      () => expect(onChange).toHaveBeenCalledWith({ search: 'ada' }),
      { timeout: 2000 },
    );
  });

  it('mirrors a search term that changed outside the panel', () => {
    const { rerender } = renderFilters(baseQuery);

    expect(searchBox()).toHaveValue('');

    // e.g. a drill-down link or a shared URL applied the term elsewhere.
    rerender({ ...baseQuery, search: 'merchant' });
    expect(searchBox()).toHaveValue('merchant');

    rerender({ ...baseQuery });
    expect(searchBox()).toHaveValue('');
  });

  it('keeps a single picked date and applies the range once both ends are set', () => {
    const { onChange } = renderFilters(baseQuery);

    fireEvent.change(fromInput(), { target: { value: '2026-01-05' } });

    // The picked date must not disappear while the range is still incomplete.
    expect(fromInput()).toHaveValue('2026-01-05');
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(toInput(), { target: { value: '2026-01-31' } });

    expect(toInput()).toHaveValue('2026-01-31');
    expect(onChange).toHaveBeenCalledWith({
      dateFrom: '2026-01-05',
      dateTo: '2026-01-31',
    });
  });

  it('hydrates both pickers from an applied range without re-querying', () => {
    const { onChange } = renderFilters(applyRange('2026-02-01', '2026-02-28'));

    expect(fromInput()).toHaveValue('2026-02-01');
    expect(toInput()).toHaveValue('2026-02-28');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows the inline error and keeps the values for an inverted range', () => {
    const { onChange } = renderFilters(applyRange('2026-01-05', '2026-01-31'));

    fireEvent.change(fromInput(), { target: { value: '2026-03-01' } });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'End date must be after start date',
    );
    expect(fromInput()).toHaveValue('2026-03-01');
    expect(toInput()).toHaveValue('2026-01-31');
    // An inverted range is never sent to the API.
    expect(onChange).not.toHaveBeenCalled();
  });

  it('drops the range filter when one end is cleared but keeps the other draft', () => {
    const { onChange } = renderFilters(applyRange('2026-01-05', '2026-01-31'));

    fireEvent.change(fromInput(), { target: { value: '' } });

    expect(onChange).toHaveBeenCalledWith({
      dateFrom: undefined,
      dateTo: undefined,
    });
    expect(fromInput()).toHaveValue('');
    expect(toInput()).toHaveValue('2026-01-31');
  });

  it('mirrors a range that was cleared outside the panel', () => {
    const { rerender } = renderFilters(applyRange('2026-01-05', '2026-01-31'));

    expect(fromInput()).toHaveValue('2026-01-05');

    rerender({ ...baseQuery });

    expect(fromInput()).toHaveValue('');
    expect(toInput()).toHaveValue('');
  });

  // Regression: the native browser picker auto-committed the same day number
  // when browsing months (Sep 24 -> Aug 24). The custom calendar must only
  // change the visible month until a day is explicitly clicked.
  it('does not commit a date when only navigating calendar months', () => {
    const { onChange } = renderFilters(applyRange('2026-09-24', '2026-09-30'));

    fireEvent.click(screen.getByRole('button', { name: 'From' }));
    const dialog = screen.getByRole('dialog');

    fireEvent.click(within(dialog).getByRole('button', { name: '前の月' }));
    expect(
      within(dialog).getByTestId('date-picker-month-label'),
    ).toHaveTextContent('2026年(令和8年) 8月');
    expect(fromInput()).toHaveValue('2026-09-24');
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: '2026年8月15日',
      }),
    );
    expect(fromInput()).toHaveValue('2026-08-15');
    expect(onChange).toHaveBeenCalledWith({
      dateFrom: '2026-08-15',
      dateTo: '2026-09-30',
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('AuditLogFilters with the real query state', () => {
  function FiltersHarness() {
    const { query, patch, clearFilters, activeFilterCount } =
      useAuditLogQuery();
    return (
      <AuditLogFilters
        query={query}
        activeCount={activeFilterCount}
        onChange={patch}
        onClear={clearFilters}
      />
    );
  }

  const renderHarness = (search = '') =>
    render(
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={newQueryClient()}>
          <MemoryRouter initialEntries={[`/admin/audit-logs${search}`]}>
            <FiltersHarness />
          </MemoryRouter>
        </QueryClientProvider>
      </I18nextProvider>,
    );

  it('keeps the pickers usable even though only complete ranges reach the URL', () => {
    renderHarness();
    const from = screen.getByLabelText('From', { selector: 'input' });
    const to = screen.getByLabelText('To', { selector: 'input' });

    // An incomplete range is not valid query state (BR-AUDIT-023), but the picked
    // date must still stay in the picker instead of disappearing.
    fireEvent.change(from, { target: { value: '2026-01-05' } });
    expect(from).toHaveValue('2026-01-05');
    expect(
      screen.queryByTestId('active-filters-count'),
    ).not.toBeInTheDocument();

    fireEvent.change(to, { target: { value: '2026-01-31' } });
    expect(from).toHaveValue('2026-01-05');
    expect(to).toHaveValue('2026-01-31');
    expect(screen.getByTestId('active-filters-count')).toHaveTextContent('1');

    fireEvent.click(screen.getByTestId('btn-clear-filters'));
    expect(from).toHaveValue('');
    expect(to).toHaveValue('');
    expect(
      screen.queryByTestId('active-filters-count'),
    ).not.toBeInTheDocument();
  });

  it('still counts a drill-down user filter and drops it on Clear Filters', async () => {
    const user = userEvent.setup();
    renderHarness(`?userId=${SEARCHED_USER_ID}`);

    expect(screen.getByTestId('active-filters-count')).toHaveTextContent('1');

    await user.click(screen.getByTestId('btn-clear-filters'));

    expect(
      screen.queryByTestId('active-filters-count'),
    ).not.toBeInTheDocument();
  });

  it('seeds the box from the URL and clears it with Clear Filters', async () => {
    const user = userEvent.setup();
    renderHarness('?search=merchant');

    const input = screen.getByTestId('audit-search');
    expect(input).toHaveValue('merchant');

    await user.click(screen.getByTestId('btn-clear-filters'));

    expect(input).toHaveValue('');
    expect(
      screen.queryByTestId('active-filters-count'),
    ).not.toBeInTheDocument();
  });
});

describe('AuditLogTable', () => {
  const noop = () => {};

  it('renders columns without an entity ID column', () => {
    renderI18n(
      <MemoryRouter>
        <AuditLogTable
          logs={[row()]}
          query={DEFAULT_AUDIT_LOG_QUERY}
          selectedIds={new Set()}
          onToggleRow={noop}
          onToggleAll={noop}
          onViewDetail={noop}
        />
      </MemoryRouter>,
    );
    const table = within(screen.getByTestId('audit-table-scroll'));
    expect(table.getByText('Timestamp')).toBeInTheDocument();
    expect(table.getByText('Ada')).toBeInTheDocument();
    expect(table.queryByText('Entity ID')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders the mobile card list alongside the desktop table', () => {
    const longAction = 'audit.action.with.a.very.long.unbroken.identifier';
    renderI18n(
      <MemoryRouter>
        <AuditLogTable
          logs={[row({ action: longAction })]}
          query={DEFAULT_AUDIT_LOG_QUERY}
          selectedIds={new Set()}
          onToggleRow={noop}
          onToggleAll={noop}
          onViewDetail={noop}
        />
      </MemoryRouter>,
    );
    // <768px shows cards, >=768px shows the table — both variants exist in the
    // DOM and are toggled with Tailwind breakpoints.
    expect(screen.getByTestId('audit-cards')).toBeInTheDocument();
    expect(screen.getByTestId('audit-table-scroll')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('audit-cards')).getByText(longAction),
    ).toHaveClass('break-all');
    expect(
      within(screen.getByTestId('audit-cards')).getAllByTestId(
        'btn-view-detail',
      ),
    ).toHaveLength(1);
  });

  it('shows empty state and renders System for null actor', () => {
    const { rerender } = renderI18n(
      <MemoryRouter>
        <AuditLogTable
          logs={[]}
          query={DEFAULT_AUDIT_LOG_QUERY}
          selectedIds={new Set()}
          onToggleRow={noop}
          onToggleAll={noop}
          onViewDetail={noop}
        />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('audit-empty')).toBeInTheDocument();

    rerender(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <AuditLogTable
            logs={[
              row({
                userId: null,
                userName: null,
                userEmail: null,
                userRole: null,
              }),
            ]}
            query={DEFAULT_AUDIT_LOG_QUERY}
            selectedIds={new Set()}
            onToggleRow={noop}
            onToggleAll={noop}
            onViewDetail={noop}
          />
        </MemoryRouter>
      </I18nextProvider>,
    );
    expect(
      within(screen.getByTestId('audit-table-scroll')).getByText('System'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('audit-empty')).not.toBeInTheDocument();
  });

  it('shows the timestamp in Myanmar time, not raw UTC', () => {
    renderI18n(
      <MemoryRouter>
        <AuditLogTable
          logs={[row()]}
          query={DEFAULT_AUDIT_LOG_QUERY}
          selectedIds={new Set()}
          onToggleRow={noop}
          onToggleAll={noop}
          onViewDetail={noop}
        />
      </MemoryRouter>,
    );
    // 14:30 UTC is 21:00 the same day in Myanmar time (UTC+06:30).
    const expected = '2026-08-25 21:00:00.000 MMT';
    expect(
      within(screen.getByTestId('audit-table-scroll')).getByText(expected),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('audit-cards')).getByText(expected),
    ).toBeInTheDocument();
    expect(screen.queryByText(/UTC/)).not.toBeInTheDocument();
  });

  it('rolls the displayed date over the Myanmar midnight boundary', () => {
    renderI18n(
      <MemoryRouter>
        <AuditLogTable
          logs={[row({ createdAt: '2026-08-25T18:15:00.000Z' })]}
          query={DEFAULT_AUDIT_LOG_QUERY}
          selectedIds={new Set()}
          onToggleRow={noop}
          onToggleAll={noop}
          onViewDetail={noop}
        />
      </MemoryRouter>,
    );
    // 18:15 UTC is already 00:45 on the 26th in Myanmar time.
    expect(
      within(screen.getByTestId('audit-table-scroll')).getByText(
        '2026-08-26 00:45:00.000 MMT',
      ),
    ).toBeInTheDocument();
  });
});

describe('AuditLogDetailModal', () => {
  it('shows full detail and renders change values', () => {
    const longAgent = 'x'.repeat(250);
    renderI18n(
      <MemoryRouter>
        <AuditLogDetailModal
          open
          onClose={vi.fn()}
          onViewUserHistory={vi.fn()}
          onViewEntityHistory={vi.fn()}
          detail={{
            ...row(),
            oldValue: {
              password: '***',
              license_status: 'pending',
              targetAmount: '100000.00',
              commissionRate: '12.00%',
            },
            newValue: {
              license_status: 'approved',
              targetAmount: '200000.00',
              commissionRate: '15.50%',
            },
            userAgent: longAgent,
          }}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('Audit Log Detail')).toBeInTheDocument();
    // 14:30 UTC is 21:00 the same day in Myanmar time (UTC+06:30).
    expect(screen.getByText('2026-08-25 21:00:00.000 MMT')).toBeInTheDocument();
    expect(screen.queryByText(/UTC/)).not.toBeInTheDocument();
    expect(screen.getByText('Password')).toBeInTheDocument();
    expect(screen.getAllByText('License Status')).toHaveLength(2);
    expect(screen.getByText(/100,000/)).toBeInTheDocument();
    expect(screen.getByText(/200,000/)).toBeInTheDocument();
    expect(screen.getByText(/12%/)).toBeInTheDocument();
    expect(screen.getByText(/15.5%/)).toBeInTheDocument();
    expect(screen.queryByText(/100000\.00/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\{/)).not.toBeInTheDocument();
    // The raw user agent string is no longer rendered anywhere in the modal;
    // the parsed client facts (Client Type/Browser/Device) replace it.
    expect(screen.queryByTitle(longAgent)).not.toBeInTheDocument();
    expect(screen.queryByText(longAgent)).not.toBeInTheDocument();
    expect(screen.getByTestId('btn-view-user-history')).toBeInTheDocument();
    // Entity id is intentionally not retrieved, so its history action is gone.
    expect(
      screen.queryByTestId('btn-view-entity-history'),
    ).not.toBeInTheDocument();
  });

  it('shows parsed browser, device, and client type - but never an OS', () => {
    renderI18n(
      <MemoryRouter>
        <AuditLogDetailModal
          open
          onClose={vi.fn()}
          detail={{
            ...row(),
            oldValue: null,
            newValue: null,
            userAgent:
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          }}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('Client Type:')).toBeInTheDocument();
    expect(screen.getByText('Web Browser')).toBeInTheDocument();
    const parsed = within(screen.getByTestId('ua-parsed'));
    expect(parsed.getByText(/^Chrome/)).toBeInTheDocument();
    expect(parsed.getByText('Desktop')).toBeInTheDocument();
    expect(parsed.queryByText('Unknown')).not.toBeInTheDocument();
    // No OS row: `Windows 10` must not appear anywhere in the modal.
    expect(screen.queryByText(/Windows/)).not.toBeInTheDocument();
  });

  it('shows not-found error', () => {
    renderI18n(
      <MemoryRouter>
        <AuditLogDetailModal open onClose={vi.fn()} error loading={false} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Audit log entry not found',
    );
  });
});

describe('DeleteAuditLogsDialog', () => {
  it('defaults to 90 and disables confirm below minimum', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderI18n(
      <DeleteAuditLogsDialog
        open
        onClose={vi.fn()}
        selectedCount={0}
        onConfirm={onConfirm}
      />,
    );
    const input = screen.getByTestId('txt-retention-days');
    expect(input).toHaveValue(90);

    await user.clear(input);
    await user.type(input, '89');
    await user.tab();
    expect(screen.getByText(/at least 90/i)).toBeInTheDocument();
    expect(screen.getByTestId('btn-confirm-delete')).toBeDisabled();
  });

  it('submits valid retention and shows selected scope', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderI18n(
      <DeleteAuditLogsDialog
        open
        onClose={vi.fn()}
        selectedCount={3}
        onConfirm={onConfirm}
      />,
    );
    expect(screen.getByTestId('delete-scope')).toHaveTextContent(
      /3 selected records/i,
    );
    await user.click(screen.getByTestId('btn-confirm-delete'));
    expect(onConfirm).toHaveBeenCalledWith(90);
  });
});

describe('AuditLogPagination', () => {
  it('disables previous on first page and fires page changes', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const onLimitChange = vi.fn();
    renderI18n(
      <AuditLogPagination
        page={1}
        limit={50}
        total={120}
        totalPages={3}
        onPageChange={onPageChange}
        onLimitChange={onLimitChange}
      />,
    );
    expect(screen.getByTestId('page-info')).toHaveTextContent(
      'Showing 1-50 of 120',
    );
    expect(screen.getByRole('button', { name: /Previous/i })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /Next/i }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});

describe('AuditLogExportDialog', () => {
  const setDate = (testId: string, value: string) => {
    fireEvent.change(screen.getByTestId(testId), { target: { value } });
  };

  it('shows a required error when a date is missing', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderI18n(
      <AuditLogExportDialog open onClose={vi.fn()} onConfirm={onConfirm} />,
    );

    await user.click(screen.getByTestId('export-confirm'));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByTestId('export-range-error')).toHaveTextContent(
      /both start and end date/i,
    );
  });

  it('rejects an end date before the start date', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderI18n(
      <AuditLogExportDialog open onClose={vi.fn()} onConfirm={onConfirm} />,
    );

    setDate('export-date-from', '2026-01-31');
    setDate('export-date-to', '2026-01-01');
    await user.click(screen.getByTestId('export-confirm'));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByTestId('export-range-error')).toHaveTextContent(
      /End date must be after start date/i,
    );
  });

  it('rejects a range longer than 365 days', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderI18n(
      <AuditLogExportDialog open onClose={vi.fn()} onConfirm={onConfirm} />,
    );

    setDate('export-date-from', '2026-01-01');
    setDate('export-date-to', '2027-01-01');
    await user.click(screen.getByTestId('export-confirm'));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByTestId('export-range-error')).toHaveTextContent(
      /cannot exceed 365 days/i,
    );
  });

  it('confirms with the selected range', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    renderI18n(
      <AuditLogExportDialog open onClose={onClose} onConfirm={onConfirm} />,
    );

    setDate('export-date-from', '2026-01-01');
    setDate('export-date-to', '2026-01-31');
    await user.click(screen.getByTestId('export-confirm'));
    expect(onConfirm).toHaveBeenCalledWith('2026-01-01', '2026-01-31');
    expect(screen.queryByTestId('export-range-error')).not.toBeInTheDocument();
  });
});
