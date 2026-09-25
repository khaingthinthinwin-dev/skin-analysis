import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getAllMerchantOrders } from '../services/merchantOrderService';
import { useRevenueSummary } from '../hooks/useRevenueSummary';
import { buildMerchantOrdersExportFilename, exportMerchantOrdersCsv, normalizeCommissionRate } from '../utils/exportMerchantOrdersCsv';
import { formatStatusLabel } from '../utils/orderStatusLabel';
import type { OrderListFilterFormData } from '../schemas/orderFilters.schema';

interface ExportMerchantOrdersDialogProps {
  /** Applied filters; they are the export scope, exactly as on the buyer export dialog. */
  filters: OrderListFilterFormData;
  /** Rows matching the applied filters — zero disables the export. */
  total: number;
  /** Cancel, the X, Escape and a click on the dimmed backdrop all land here. */
  onClose: () => void;
}

/**
 * Export confirmation of the own-shop order list (the merchant counterpart of the
 * buyer "Export Orders" dialog).
 *
 * The button no longer downloads on click: the dialog first states the Export
 * Scope (status pill, date range and the result line) so a merchant can see what
 * the file will contain before it is written. Confirming fetches every row that
 * matches the applied filters — not just the visible page (BR-OI-010 caps one
 * page at 100 rows) — and then hands the rows to `exportMerchantOrdersCsv`.
 *
 * The dialog closes on a successful download and on Cancel/the X/Escape/backdrop;
 * a failed fetch keeps it open with the error line, so the merchant can retry
 * without re-opening and losing the stated scope.
 */
export function ExportMerchantOrdersDialog({ filters, total, onClose }: ExportMerchantOrdersDialogProps) {
  const { t } = useTranslation();
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  // Same cached Revenue Summary the order detail page reads (no extra endpoint
  // beyond it): its current platform rate drives the Commission / You receive
  // CSV columns. Without a usable rate those columns are skipped entirely —
  // never exported as 0/blank — and the notice below says so.
  const revenueQuery = useRevenueSummary({ period: 'this_month' });
  const commissionRate = normalizeCommissionRate(revenueQuery.data?.commissionRate);
  const commissionSkipped = commissionRate === null;

  const isEmpty = total === 0;
  const statusLabel = filters.status === 'all'
    ? t('common.filters.all', 'All')
    : t(`common.status.${filters.status}`, formatStatusLabel(filters.status));
  /** Reads an ISO date or timestamp as `YYYY/MM/DD`; a missing bound stays "All dates". */
  const formatScopeDate = (date?: string) =>
    date ? date.slice(0, 10).replaceAll('-', '/') : t('merchant.orders.exportAllDates', 'All dates');
  const scopeDateLabel = filters.from || filters.to
    ? `${formatScopeDate(filters.from)} to ${formatScopeDate(filters.to)}`
    : t('merchant.orders.exportAllDates', 'All dates');

  const handleExport = async () => {
    if (isEmpty) {
      setErrorMessage(t('merchant.orders.exportEmpty', 'No orders to export.'));
      return;
    }

    setIsExporting(true);
    setErrorMessage(undefined);

    try {
      const rows = await getAllMerchantOrders(filters);
      exportMerchantOrdersCsv(rows, {
        filename: buildMerchantOrdersExportFilename(filters),
        commissionRate,
      });
      setIsExporting(false);
      onClose();
    } catch {
      setIsExporting(false);
      setErrorMessage(t('merchant.orders.exportError', 'Unable to export orders. Please try again.'));
    }
  };

  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent aria-modal="true" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('merchant.orders.exportTitle', 'Export Orders')}</DialogTitle>
          <DialogDescription>
            {t('merchant.orders.exportDescription', 'The CSV will include orders matching your current filters.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">{t('merchant.orders.exportScope', 'Export Scope')}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{t('merchant.orders.exportStatus', 'Status')}:</span>
              <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
                {statusLabel}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('merchant.orders.exportDateRange', 'Date Range')}:{' '}
              <span className="font-medium text-foreground">{scopeDateLabel}</span>
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            {t('merchant.orders.exportResultPrefix', 'Result:')}{' '}
            <span className="font-medium text-foreground">{statusLabel}</span>{' '}
            {t('merchant.orders.exportResultSuffix', 'orders within this range')}
          </p>
          {commissionSkipped && (
            <p className="text-sm text-muted-foreground">
              {t(
                'merchant.orders.exportCommissionUnavailable',
                'Commission and You receive columns are not included — commission rate unavailable.',
              )}
            </p>
          )}
          {isEmpty ? (
            <p className="text-sm text-destructive" role="alert">
              {t('merchant.orders.exportEmpty', 'No orders to export.')}
            </p>
          ) : errorMessage && (
            <p className="text-sm text-destructive" role="alert">{errorMessage}</p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isExporting}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="button" onClick={() => void handleExport()} disabled={isExporting || isEmpty}>
            {isExporting ? t('merchant.orders.exporting', 'Exporting...') : t('merchant.orders.exportCsv', 'Export CSV')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
