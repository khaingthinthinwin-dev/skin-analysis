import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AUDIT_LOG_MIN_RETENTION_DAYS,
  deleteAuditLogsSchema,
} from '../schemas/auditLog.schema';

interface DeleteAuditLogsDialogProps {
  open: boolean;
  onClose: () => void;
  selectedCount?: number;
  pending?: boolean;
  onConfirm: (olderThanDays: number) => void;
  errorMessage?: string | null;
}

export function DeleteAuditLogsDialog({
  open,
  onClose,
  selectedCount = 0,
  pending = false,
  onConfirm,
  errorMessage,
}: DeleteAuditLogsDialogProps) {
  const { t } = useTranslation();
  const [retentionDays, setRetentionDays] = useState(
    String(AUDIT_LOG_MIN_RETENTION_DAYS),
  );
  const [touched, setTouched] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setRetentionDays(String(AUDIT_LOG_MIN_RETENTION_DAYS));
      setTouched(false);
      onClose();
    }
  };

  const parsed = deleteAuditLogsSchema.safeParse({ olderThanDays: retentionDays });
  const invalid = !parsed.success;
  const errorId = 'retention-days-error';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!parsed.success || pending) return;
    onConfirm(parsed.data.olderThanDays);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* DD_Audit_Log_02_FRONTEND_PAGE §9: full-screen dialog on mobile
          (<768px) with internal scroll; centered max-w-md dialog from md up. */}
      <DialogContent
        className="left-0 top-0 h-dvh max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-none border-0 sm:rounded-none md:left-1/2 md:top-1/2 md:h-auto md:max-h-[85dvh] md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg md:border"
        data-testid="delete-audit-dialog"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>{t('audit.deleteDialogTitle')}</DialogTitle>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertTitle>{t('audit.deleteWarningTitle')}</AlertTitle>
          <AlertDescription>{t('audit.deleteWarning')}</AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="retention-days">{t('audit.retentionDays')}</Label>
            <div className="flex items-center gap-2">
              <Input
                id="retention-days"
                type="number"
                min={AUDIT_LOG_MIN_RETENTION_DAYS}
                step={1}
                value={retentionDays}
                onChange={(e) => setRetentionDays(e.target.value)}
                onBlur={() => setTouched(true)}
                disabled={pending}
                aria-invalid={touched && invalid}
                aria-describedby={touched && invalid ? errorId : undefined}
                data-testid="txt-retention-days"
              />
              <span className="text-sm text-muted-foreground">
                {t('audit.days')}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('audit.minRetention', { days: AUDIT_LOG_MIN_RETENTION_DAYS })}
            </p>
            {touched && invalid && (
              <p id={errorId} className="text-sm text-destructive" role="alert">
                {t('audit.retentionMin')}
              </p>
            )}
          </div>

          <p className="text-sm text-muted-foreground" data-testid="delete-scope">
            {selectedCount > 0
              ? t('audit.deleteScopeSelected', {
                  count: selectedCount,
                  days: retentionDays,
                })
              : t('audit.deleteScopeSummary', { days: retentionDays })}
          </p>

          {errorMessage && (
            <p className="text-sm text-destructive" role="alert">
              {errorMessage}
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
            <Button
              type="submit"
              variant="destructive"
              disabled={pending || invalid}
              data-testid="btn-confirm-delete"
            >
              {pending ? t('audit.deleting') : t('audit.confirmDelete')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
