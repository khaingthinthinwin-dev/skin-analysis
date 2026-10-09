'use client';

import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type { AdminOrderFilterFormData } from '../schemas/orderFilters.schema';
import { formatStatusLabel } from '../utils/orderStatusLabel';
import { toSlashDisplayDate } from '../utils/dateRangeLabel';

export type AdminFilterChipKey = 'orderNumber' | 'shop' | 'status' | 'paymentStatus' | 'dateRange';

interface AdminActiveFilterChipsProps {
  filters: AdminOrderFilterFormData;
  /** Clears exactly one filter group and resets to page 1. */
  onClear: (key: AdminFilterChipKey) => void;
  onClearAll: () => void;
}

interface Chip {
  key: AdminFilterChipKey;
  label: string;
  value: string;
}

function formatDay(value?: string): string {
  return toSlashDisplayDate(value);
}

/**
 * The filters currently narrowing the list, each individually removable.
 *
 * Without this the only way to tell why a filtered list came back empty is to
 * read the URL, and the only way to undo one filter is to reload the page with
 * every other filter dropped. Nothing here changes what is filtered — it only
 * mirrors the filter state the page already holds.
 */
export function AdminActiveFilterChips({ filters, onClear, onClearAll }: AdminActiveFilterChipsProps) {
  const { t } = useTranslation();
  const chips: Chip[] = [];

  const orderNumber = filters.orderSearch?.trim();
  if (orderNumber) {
    chips.push({
      key: 'orderNumber',
      label: t('merchant.orders.filter.orderNumber', 'Order #'),
      value: orderNumber,
    });
  }

  const shop = filters.shopSearch?.trim();
  if (shop) {
    chips.push({
      key: 'shop',
      label: t('admin.orders.filter.shop', 'Shop / Merchant'),
      value: shop,
    });
  }

  if (filters.status && filters.status !== 'all') {
    chips.push({
      key: 'status',
      label: t('orders.filter.status', 'Status'),
      value: t(`common.status.${filters.status}`, formatStatusLabel(filters.status)),
    });
  }

  if (filters.paymentStatus && filters.paymentStatus !== 'all') {
    chips.push({
      key: 'paymentStatus',
      label: t('orders.table.payment', 'Payment'),
      value: t(`common.payment.${filters.paymentStatus}`, formatStatusLabel(filters.paymentStatus)),
    });
  }

  if (filters.from || filters.to) {
    const from = formatDay(filters.from);
    const to = formatDay(filters.to);
    const range = from && to ? `${from} – ${to}` : from || to;
    chips.push({
      key: 'dateRange',
      label: t('orders.filter.dateRange.label', 'Date range'),
      value: range,
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3" aria-label={t('common.filters.active', 'Active filters')}>
      <span className="text-xs font-medium text-muted-foreground">
        {t('common.filters.applied', 'Applied:')}
      </span>
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 py-1 pl-2.5 pr-1 text-xs text-foreground"
        >
          <span className="truncate">
            <span className="text-muted-foreground">{chip.label}:</span>{' '}
            <span className="font-medium">{chip.value}</span>
          </span>
          <button
            type="button"
            onClick={() => onClear(chip.key)}
            aria-label={t('common.filters.removeLabel', `Remove filter: ${chip.label}`)}
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="rounded-full px-2 py-1 text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {t('common.filters.clearAll', 'Clear all')}
      </button>
    </div>
  );
}