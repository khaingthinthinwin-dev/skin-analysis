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

interface PayoutConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payout?: Payout | null;
  onConfirm: (id: string) => void;
  processing?: boolean;
}

// [Q] Payout Confirmation Dialog (DD_02 §5.6).
// Shows merchant name and net amount (net = total - commission; ad fees excluded).
export const PayoutConfirmationDialog: React.FC<PayoutConfirmationDialogProps> = ({
  open,
  onOpenChange,
  payout,
  onConfirm,
  processing,
}) => {
  if (!payout) {
    return null;
  }

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
            <span>${payout.totalAmount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Commission Fee</span>
            <span>-${payout.commissionAmount}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Net Payout</span>
            <span>${payout.netAmount}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
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
