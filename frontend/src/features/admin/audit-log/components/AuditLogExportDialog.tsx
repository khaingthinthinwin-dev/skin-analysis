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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AUDIT_LOG_EXPORT_MAX_RANGE_DAYS } from '../schemas/auditLog.schema';

interface AuditLogExportDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (dateFrom: string, dateTo: string) => void;
  pending?: boolean;
  initialDateFrom?: string;
  initialDateTo?: string;
}

// Date-range dialog shown before the CSV export request (mirrors the
// commission report export modal). The chosen range is sent to the backend,
// which filters rows and names the file startDate-endDate(today).csv.
export function AuditLogExportDialog({
  open,
  onClose,
  onConfirm,
  pending = false,
  initialDateFrom,
  initialDateTo,
}: AuditLogExportDialogProps) {
  const { t } = useTranslation();
  const [dateFrom, setDateFrom] = useState(initialDateFrom ?? '');
  const [dateTo, setDateTo] = useState(initialDateTo ?? '');
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (next: boolean) => {
    // State resets happen via the parent-controlled `key` remount on reopen.
    if (!next) onClose();
  };

  const validate = (): string | null => {
    if (!dateFrom || !dateTo) {
      return t('audit.exportRangeRequired');
    }
    const fromMs = new Date(`${dateFrom}T00:00:00.000Z`).getTime();
    const toMs = new Date(`${dateTo}T23:59:59.999Z`).getTime();
    if (Number.isNaN(fromMs) || Number.isNaN(toMs)) {
      return t('audit.exportRangeRequired');
    }
    if (toMs < fromMs) {
      return t('audit.invalidDateRange');
    }
    // Mirrors the backend: range measured to end-of-day must not exceed the cap.
    if ((toMs - fromMs) / 86_400_000 > AUDIT_LOG_EXPORT_MAX_RANGE_DAYS) {
      return t('audit.exportRangeTooLong', {
        days: AUDIT_LOG_EXPORT_MAX_RANGE_DAYS,
      });
    }
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    const validationError = validate();
    setError(validationError);
    if (validationError) return;
    onConfirm(dateFrom, dateTo);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* DD_Audit_Log_02_FRONTEND_PAGE §9: full-screen dialog on mobile
          (<768px) with internal scroll; centered max-w-md dialog from md up. */}
      <DialogContent
        className="left-0 top-0 h-dvh max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-none border-0 sm:rounded-none md:left-1/2 md:top-1/2 md:h-auto md:max-h-[85dvh] md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg md:border"
        data-testid="export-audit-dialog"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>{t('audit.exportDialogTitle')}</DialogTitle>
          <DialogDescription>
            {t('audit.exportDialogDescription')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="export-date-from">{t('audit.exportStartDate')}</Label>
            <Input
              id="export-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              disabled={pending}
              data-testid="export-date-from"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="export-date-to">{t('audit.exportEndDate')}</Label>
            <Input
              id="export-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              disabled={pending}
              data-testid="export-date-to"
            />
          </div>
          {error && (
            <p
              className="text-xs text-destructive"
              role="alert"
              aria-live="polite"
              data-testid="export-range-error"
            >
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={pending}
            >
              {t('audit.cancel')}
            </Button>
            <Button type="submit" disabled={pending} data-testid="export-confirm">
              {pending ? t('audit.exporting') : t('audit.exportCsv')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
