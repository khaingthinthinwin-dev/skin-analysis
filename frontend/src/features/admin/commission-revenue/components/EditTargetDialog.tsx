import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RevenueTarget, TargetPeriod, SaveRevenueTargetPayload } from '../services/commission.service';

interface EditTargetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target?: RevenueTarget | null;
  period: TargetPeriod;
  onPeriodChange: (period: TargetPeriod) => void;
  onSave: (payload: SaveRevenueTargetPayload) => void;
  saving?: boolean;
}

const PERIOD_LABELS: { value: TargetPeriod; key: string; fallback: string }[] = [
  { value: 'monthly', key: 'admin.commission.period.monthly', fallback: 'Monthly' },
  { value: 'quarterly', key: 'admin.commission.period.quarterly', fallback: 'Quarterly' },
];

// [R] Edit Target Dialog (DD_02). Validates a decimal-string amount with up to
// 2 decimal places, greater than 0, plus a monthly/quarterly period toggle.
export const EditTargetDialog: React.FC<EditTargetDialogProps> = ({
  open,
  onOpenChange,
  target,
  period,
  onPeriodChange,
  onSave,
  saving,
}) => {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [prevTarget, setPrevTarget] = useState(target);
  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen || target !== prevTarget) {
    setPrevOpen(open);
    setPrevTarget(target);
    setAmount(open ? (target?.targetAmount ?? '') : '');
    setError('');
  }

  const handleDialogOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
  };

  const validate = (): boolean => {
    if (!/^\d+(\.\d{1,2})?$/.test(amount) || parseFloat(amount) <= 0) {
      setError(t('admin.commission.target.validation', 'Target amount must be a positive number with up to 2 decimal places.'));
      return false;
    }
    setError('');
    return true;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({ targetAmount: amount, targetPeriod: period });
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {target ? t('admin.commission.target.editTitle', 'Edit Revenue Target') : t('admin.commission.target.setTitle', 'Set Revenue Target')}
          </DialogTitle>
          <DialogDescription>
            {t('admin.commission.target.dialogDescription', 'Define the revenue target for the {{period}} period. Changes apply to the selected period only.', {
              period: t(`admin.commission.period.${period}`, period),
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <span className="text-xs text-muted-foreground">{t('admin.commission.target.amount', 'Target Amount')}</span>
            <Input
              id="target-amount"
              type="number"
              min={0}
              step={0.01}
              placeholder={t('admin.commission.target.amountPlaceholder', '0.00')}
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError('');
              }}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <div className="space-y-1.5">
            <span className="text-xs text-muted-foreground">{t('admin.commission.target.period', 'Period')}</span>
            <div className="flex gap-2">
              {PERIOD_LABELS.map((p) => (
                <Button
                  key={p.value}
                  type="button"
                  size="sm"
                  variant={period === p.value ? 'default' : 'outline'}
                  onClick={() => {
                    // Notify parent to switch period & re-fetch target;
                    // the useEffect on `target` will update amount automatically.
                    onPeriodChange(p.value);
                  }}
                >
                  {t(p.key, p.fallback)}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t('admin.commission.target.saving', 'Saving...') : t('admin.commission.target.save', 'Save Target')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
