import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StatusBadge } from './StatusBadge';
import { OrderStatus } from '../types/orderInsights.types';
import { formatStatusLabel } from '../utils/orderStatusLabel';

interface StatusTransitionControlProps {
  currentStatus: OrderStatus;
  nextStatus: string | null;
  isUpdating: boolean;
  onAdvance: (status: string) => void;
}

/**
 * Shows the current order status next to a single "Advance to …" button that
 * appears only when the backend reports exactly one next status. The change is
 * confirmed in a Dialog before calling onAdvance.
 */
export function StatusTransitionControl({
  currentStatus,
  nextStatus,
  isUpdating,
  onAdvance,
}: StatusTransitionControlProps) {
  const { t } = useTranslation();
  const [isConfirmOpen, setConfirmOpen] = useState(false);

  const label = nextStatus ? formatStatusLabel(nextStatus) : '';

  const confirmAdvance = () => {
    if (!nextStatus) return;
    setConfirmOpen(false);
    onAdvance(nextStatus);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <StatusBadge status={currentStatus} />
      {nextStatus && (
        <>
          <Button
            type="button"
            className="gap-2 rounded-lg bg-gradient-to-br from-[#7c3aed] to-[#ec4899] text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(124,58,237,0.25)] hover:opacity-90"
            disabled={isUpdating}
            onClick={() => setConfirmOpen(true)}
            data-testid="advance-status-button"
          >
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
            {t('merchant.orders.advanceTo', `Advance to ${label}`)}
          </Button>
          <Dialog open={isConfirmOpen} onOpenChange={setConfirmOpen}>
            <DialogContent className="sm:max-w-md border-border/50 bg-background">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold">
                  {t('merchant.orders.confirmAdvance', `Mark this order as ${label}?`)}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  {t(
                    'merchant.orders.confirmAdvanceDescription',
                    'The order will move to the next fulfillment step. This cannot be undone.',
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
        </>
      )}
    </div>
  );
}