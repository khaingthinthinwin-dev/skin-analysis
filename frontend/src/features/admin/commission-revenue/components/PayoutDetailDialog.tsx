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

interface PayoutDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payout?: Payout | null;
}

const formatDate = (dateString?: string | null): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const PayoutDetailDialog: React.FC<PayoutDetailDialogProps> = ({
  open,
  onOpenChange,
  payout,
}) => {
  if (!payout) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Payout Detail for {payout.merchantName}</DialogTitle>
          <DialogDescription>
            This payout has been completed. Below are the details.
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
          <div className="flex justify-between border-t pt-2 mt-2">
            <span className="text-sm text-muted-foreground">Paid Date</span>
            <span className="text-sm font-medium">{formatDate(payout.processedAt)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
