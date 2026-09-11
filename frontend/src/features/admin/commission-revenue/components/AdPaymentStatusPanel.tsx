import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdFeePaymentStatus } from '../services/commission.service';

interface AdPaymentStatusPanelProps {
  status?: AdFeePaymentStatus;
  loading?: boolean;
}

// [K] Ad payment status panel — Completed / Pending / Refunded (DD_02).
// Single-row 3-column grid of status badges with counts.
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
            <div className="h-10 w-full animate-pulse rounded bg-muted" />
            <div className="h-10 w-full animate-pulse rounded bg-muted" />
            <div className="h-10 w-full animate-pulse rounded bg-muted" />
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5 rounded-md bg-green-950 px-2.5 py-1">
              <span className="text-sm font-bold text-green-400">{status?.completed ?? 0}</span>
              <span className="text-xs text-green-400">Completed</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-md bg-amber-950 px-2.5 py-1">
              <span className="text-sm font-bold text-amber-400">{status?.pending ?? 0}</span>
              <span className="text-xs text-amber-400">Pending</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-md bg-slate-800 px-2.5 py-1">
              <span className="text-sm font-bold text-slate-400">{status?.refunded ?? 0}</span>
              <span className="text-xs text-slate-400">Refunded</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
