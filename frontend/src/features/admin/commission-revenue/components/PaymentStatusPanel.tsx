import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PaymentStatus } from '../services/commission.service';
import { PaymentStatusStat } from './badges';

interface PaymentStatusPanelProps {
  payments?: PaymentStatus;
  loading?: boolean;
}

// [J] Order payment status panel — Completed / Pending (DD_02).
// Two-line stats: count on top, coloured status pill underneath.
// Colours come from the shared §9.6 registry in ./badges.
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
            <div className="h-14 w-full animate-pulse rounded bg-muted" />
            <div className="h-14 w-full animate-pulse rounded bg-muted" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <PaymentStatusStat kind="completed" value={payments?.completed ?? 0} />
            <PaymentStatusStat kind="pending" value={payments?.pending ?? 0} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
