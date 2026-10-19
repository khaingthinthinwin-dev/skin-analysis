import React from 'react';
import { useTranslation } from 'react-i18next';
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
import { formatCurrency } from '../utils/format';

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
  const { t } = useTranslation();
  if (!payout) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('admin.commission.payout.detailTitle', 'Payout Detail for {{merchantName}}', { merchantName: payout.merchantName })}</DialogTitle>
          <DialogDescription>
            {t('admin.commission.payout.detailDescription', 'This payout has been completed. Below are the details.')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">{t('admin.commission.payout.totalAmount', 'Total Amount')}</span>
            <span>{formatCurrency(payout.totalAmount)} Ks</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">{t('admin.commission.payout.commissionFee', 'Commission Fee')}</span>
            <span>-{formatCurrency(payout.commissionAmount)} Ks</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>{t('admin.commission.payout.netPayout', 'Net Payout')}</span>
            <span>{formatCurrency(payout.netAmount)} Ks</span>
          </div>
          <div className="flex justify-between border-t pt-2 mt-2">
            <span className="text-sm text-muted-foreground">{t('admin.commission.payout.paidDate', 'Paid Date')}</span>
            <span className="text-sm font-medium">{formatDate(payout.processedAt)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.close', 'Close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
