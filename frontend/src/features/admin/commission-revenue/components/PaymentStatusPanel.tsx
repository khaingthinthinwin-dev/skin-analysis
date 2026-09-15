import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PaymentStatus } from '../services/commission.service';

interface PaymentStatusPanelProps {
  payments?: PaymentStatus;
  loading?: boolean;
}

// [J] Order payment status panel — Completed / Pending (DD_02).
// Single-row 2-column grid of status badges with counts.
export const PaymentStatusPanel: React.FC<PaymentStatusPanelProps> = ({
  payments,
  loading,
}) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Order Payment Status</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex gap-4">
            <div className="h-10 w-full animate-pulse rounded bg-muted" />
            <div className="h-10 w-full animate-pulse rounded bg-muted" />
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5 rounded-md bg-green-950 px-2.5 py-1">
              <span className="text-sm font-bold text-green-400">{payments?.completed ?? 0}</span>
              <span className="text-xs text-green-400">Completed</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-md bg-amber-950 px-2.5 py-1">
              <span className="text-sm font-bold text-amber-400">{payments?.pending ?? 0}</span>
              <span className="text-xs text-amber-400">Pending</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
