import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Payout } from '../services/commission.service';
import { PaymentStatusBadge } from './badges';
import { formatCurrency } from '../utils/format';

interface PayoutConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payout?: Payout | null;
  onConfirm: (id: string) => void;
  onCancel?: () => void;
  processing?: boolean;
}

// [Q] Payout Confirmation Dialog (DD_02 §5.6).
// Shows merchant name, net amount (net = total - commission; ad fees excluded),
// and completed/pending breakdown when multiple underlying orders exist.
export const PayoutConfirmationDialog: React.FC<PayoutConfirmationDialogProps> = ({
  open,
  onOpenChange,
  payout,
  onConfirm,
  onCancel,
  processing,
}) => {
  if (!payout) {
    return null;
  }

  const hasBreakdown = payout.completedCount + payout.pendingCount > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Process payout for {payout.merchantName}?</DialogTitle>
          <DialogDescription>
            This will mark the payout as completed. Ad fees are excluded from payouts
            (net = total amount - commission).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Total Amount</span>
            <span>{formatCurrency(payout.totalAmount)} Ks</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Commission Fee</span>
            <span>-{formatCurrency(payout.commissionAmount)} Ks</span>
          </div>
          <div className="border-t" />
          <div className="flex justify-between font-semibold">
            <span>Net Payout</span>
            <span>{formatCurrency(payout.netAmount)} Ks</span>
          </div>

          {hasBreakdown && (
            <>
              <div className="my-2 border-t" />
              <p className="text-xs font-medium text-muted-foreground">Breakdown</p>
              {payout.completedCount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <PaymentStatusBadge kind="completed">
                    {payout.completedCount} completed order{payout.completedCount > 1 ? 's' : ''}
                  </PaymentStatusBadge>
                  <span className="font-medium">{formatCurrency(payout.completedTotal)} Ks</span>
                </div>
              )}
              {payout.pendingCount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <PaymentStatusBadge kind="pending">
                    {payout.pendingCount} pending order{payout.pendingCount > 1 ? 's' : ''}
                  </PaymentStatusBadge>
                  <span className="font-medium">{formatCurrency(payout.pendingTotal)} Ks</span>
                </div>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onCancel?.(); onOpenChange(false); }} disabled={processing}>
            Cancel
          </Button>
          <Button variant="default" onClick={() => onConfirm(payout.payoutId)} disabled={processing}>
            {processing ? 'Processing...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
