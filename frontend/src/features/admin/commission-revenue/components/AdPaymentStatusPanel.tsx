import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdFeePaymentStatus } from '../services/commission.service';
import { PaymentStatusStat } from './badges';

interface AdPaymentStatusPanelProps {
  status?: AdFeePaymentStatus;
  loading?: boolean;
}

// [K] Ad payment status panel — Completed / Pending / Refunded (DD_02).
// Two-line stats: count on top, coloured status pill underneath.
// Colours come from the shared §9.6 registry in ./badges.
export const AdPaymentStatusPanel: React.FC<AdPaymentStatusPanelProps> = ({
  status,
  loading,
}) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Ad Payment Status</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex gap-4">
            <div className="h-14 w-full animate-pulse rounded bg-muted" />
            <div className="h-14 w-full animate-pulse rounded bg-muted" />
            <div className="h-14 w-full animate-pulse rounded bg-muted" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <PaymentStatusStat kind="completed" value={status?.completed ?? 0} />
            <PaymentStatusStat kind="pending" value={status?.pending ?? 0} />
            <PaymentStatusStat kind="refunded" value={status?.refunded ?? 0} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
