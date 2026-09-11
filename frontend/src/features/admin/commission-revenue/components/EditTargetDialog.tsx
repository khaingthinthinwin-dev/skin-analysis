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
  onSave: (payload: SaveRevenueTargetPayload) => void;
  saving?: boolean;
}

const PERIOD_LABELS: { value: TargetPeriod; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
];

// [R] Edit Target Dialog (DD_02). Validates a decimal-string amount with up to
// 2 decimal places, greater than 0, plus a monthly/quarterly period toggle.
export const EditTargetDialog: React.FC<EditTargetDialogProps> = ({
  open,
  onOpenChange,
  target,
  period,
  onSave,
  saving,
}) => {
  const [amount, setAmount] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<TargetPeriod>(period);
  const [error, setError] = useState('');

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setSelectedPeriod(period);
    }
    onOpenChange(nextOpen);
  };

  const validate = (): boolean => {
    if (!/^\d+(\.\d{1,2})?$/.test(amount) || parseFloat(amount) <= 0) {
      setError('Target amount must be a positive number with up to 2 decimal places.');
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
                  onClick={() => setSelectedPeriod(p.value)}
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
