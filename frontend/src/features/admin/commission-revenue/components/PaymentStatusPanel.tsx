import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PaymentStatusStat } from './badges';

interface StatusCounts {
  completed: number;
  processing: number;
  pending: number;
}

interface PaymentStatusPanelProps {
  statusCounts?: StatusCounts;
  loading?: boolean;
}

// [J] Payout status panel — Completed / Processing / Pending (DD_02).
// Uses statusCounts from the payout table response (all pages, not just current).
export const PaymentStatusPanel: React.FC<PaymentStatusPanelProps> = ({
  statusCounts,
  loading,
}) => {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{t('admin.commission.payoutStatus', 'Payout Status')}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex gap-4">
            <div className="h-14 w-full animate-pulse rounded bg-muted" />
            <div className="h-14 w-full animate-pulse rounded bg-muted" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <PaymentStatusStat kind="completed" value={statusCounts?.completed ?? 0} />
            <PaymentStatusStat kind="processing" value={statusCounts?.processing ?? 0} />
            <PaymentStatusStat kind="pending" value={statusCounts?.pending ?? 0} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
