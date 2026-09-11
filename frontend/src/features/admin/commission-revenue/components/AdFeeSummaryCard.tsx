import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdFeeKpis } from '../services/commission.service';

interface AdFeeSummaryCardProps {
  kpis?: AdFeeKpis;
  loading?: boolean;
}

// [L] Ad fee summary card — Active Ads / Total Collected / Pending (DD_02).
export const AdFeeSummaryCard: React.FC<AdFeeSummaryCardProps> = ({ kpis, loading }) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Ad Fee Summary</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex gap-4">
            <div className="h-10 w-full animate-pulse rounded bg-muted" />
            <div className="h-10 w-full animate-pulse rounded bg-muted" />
            <div className="h-10 w-full animate-pulse rounded bg-muted" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl font-bold">{kpis?.activeAds ?? 0}</span>
              <span className="text-xs text-muted-foreground">Active Ads</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl font-bold">${kpis?.totalAdFees ?? '0.00'}</span>
              <span className="text-xs text-muted-foreground">Total Collected</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl font-bold">{kpis?.pendingPayments ?? 0}</span>
              <span className="text-xs text-muted-foreground">Pending</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
