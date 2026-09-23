import React, { useState } from 'react';
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
  onPeriodChange?: (period: TargetPeriod) => void;
  onSave: (payload: SaveRevenueTargetPayload) => void;
  saving?: boolean;
}

const PERIOD_LABELS: { value: TargetPeriod; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
];

const MAX_AMOUNT = 9999999999.99;
const MAX_AMOUNT_DISPLAY = '9,999,999,999.99';

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
  const [amount, setAmount] = useState(target?.targetAmount ?? '');
  const [selectedPeriod, setSelectedPeriod] = useState<TargetPeriod>(period);
  const [error, setError] = useState('');
  const [prevOpen, setPrevOpen] = useState(open);
  const [prevTarget, setPrevTarget] = useState(target);
  const [prevPeriod, setPrevPeriod] = useState(period);

  const handlePeriodClick = (nextPeriod: TargetPeriod) => {
    // Sync selection locally for immediate feedback, and notify the parent so
    // the target for that period is refetched and repopulated into the amount.
    setSelectedPeriod(nextPeriod);
    onPeriodChange?.(nextPeriod);
  };

  // Reset the form whenever the dialog opens or the target/period changes,
  // so switching Monthly/Quarterly shows the target saved for that period.
  if (prevOpen !== open || prevTarget !== target || prevPeriod !== period) {
    setPrevOpen(open);
    setPrevTarget(target);
    setPrevPeriod(period);
    if (open) {
      setAmount(target?.targetAmount ?? '');
      setSelectedPeriod(period);
      setError('');
    }
  }

  const handleDialogOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
  };

  const validate = (): boolean => {
    if (!/^\d+(\.\d{1,2})?$/.test(amount)) {
      setError('Please enter a valid number with up to 2 decimal places.');
      return false;
    }
    const value = parseFloat(amount);
    if (value <= 0) {
      setError('Target amount must be greater than 0.');
      return false;
    }
    if (value > MAX_AMOUNT) {
      setError(`Please enter between 0.01 - ${MAX_AMOUNT_DISPLAY} range.`);
      return false;
    }
    setError('');
    return true;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({ targetAmount: amount, targetPeriod: selectedPeriod });
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {target ? 'Edit Revenue Target' : 'Set Revenue Target'}
          </DialogTitle>
          <DialogDescription>
            Define the revenue target for the {selectedPeriod} period. Changes apply to the selected period only.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <span className="text-xs text-muted-foreground">Target Amount</span>
            <Input
              id="target-amount"
              type="number"
              min={0}
              step={0.01}
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError('');
              }}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            {!error && <p className="text-xs text-muted-foreground">Enter a value between 0.01 and {MAX_AMOUNT_DISPLAY}</p>}
          </div>
          <div className="space-y-1.5">
            <span className="text-xs text-muted-foreground">Period</span>
            <div className="flex gap-2">
              {PERIOD_LABELS.map((p) => (
                <Button
                  key={p.value}
                  type="button"
                  size="sm"
                  variant={selectedPeriod === p.value ? 'default' : 'outline'}
                  onClick={() => handlePeriodClick(p.value)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Target'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
