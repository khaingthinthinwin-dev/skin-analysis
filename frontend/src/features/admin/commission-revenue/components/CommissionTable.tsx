import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CommissionSettings } from '../services/commission.service';

interface CommissionTableProps {
  settings?: CommissionSettings;
  onUpdateRate?: (rate: number) => void;
}

export const CommissionTable: React.FC<CommissionTableProps> = ({ settings, onUpdateRate }) => {
  const [rate, setRate] = useState<number>(settings?.commissionRate ?? 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform Commission Rate Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          This rate determines the platform fee percentage deducted from merchant sales. Changes apply to all new transactions from the moment saved.
        </p>

        <div className="flex items-center gap-4 max-w-sm">
          <div className="flex items-center gap-2 flex-1">
            <Input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value))}
            />
            <span className="font-semibold">%</span>
          </div>
          <Button onClick={() => onUpdateRate?.(rate)}>Save Rate</Button>
        </div>
      </CardContent>
    </Card>
  );
};
