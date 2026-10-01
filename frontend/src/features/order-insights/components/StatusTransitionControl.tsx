import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatStatusLabel } from '../utils/orderStatusLabel';

interface StatusTransitionControlProps {
  nextStatus: string | null;
  isUpdating: boolean;
  onAdvance: (status: string) => void;
}

/**
 * Single "Advance to …" action for the merchant action bar, shown only when
 * the backend reports exactly one next status. The change is confirmed in a
 * Dialog (Radix traps focus, closes on Escape and returns focus to the trigger)
 * before calling onAdvance. The current status pill lives in the page header,
 * not here, so the status is never shown twice.
 */
export function StatusTransitionControl({
  nextStatus,
  isUpdating,
  onAdvance,
}: StatusTransitionControlProps) {
  const { t } = useTranslation();
  const [isConfirmOpen, setConfirmOpen] = useState(false);

  const label = nextStatus ? formatStatusLabel(nextStatus) : '';

  const confirmAdvance = () => {
    // Guard against double submits while a request is already in flight.
    if (!nextStatus || isUpdating) return;
    setConfirmOpen(false);
    onAdvance(nextStatus);
  };

  if (!nextStatus) return null;

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <Button
        type="button"
        className="gap-2 rounded-lg bg-gradient-to-br from-[#7c3aed] to-[#ec4899] text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(124,58,237,0.25)] hover:opacity-90"
        disabled={isUpdating}
        onClick={() => setConfirmOpen(true)}
        data-testid="advance-status-button"
      >
        {isUpdating ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        )}
        {t('merchant.orders.advanceTo', `Advance to ${label}`)}
      </Button>
      <Dialog open={isConfirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md border-border/50 bg-background">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {t('merchant.orders.confirmAdvance', 'Confirm order?')}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {t(
                'merchant.orders.confirmAdvanceDescription',
                `The status will change to ${label} and the customer will be notified.`,
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              disabled={isUpdating}
              onClick={() => setConfirmOpen(false)}
              data-testid="cancel-advance-button"
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              type="button"
              disabled={isUpdating}
              onClick={confirmAdvance}
              data-testid="confirm-advance-button"
            >
              {t('common.confirm', 'Confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}