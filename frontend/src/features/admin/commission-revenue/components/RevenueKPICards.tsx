import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RevenueKPI, TrendRange } from '../services/commission.service';

interface RevenueKPICardsProps {
  kpis?: RevenueKPI;
  loading?: boolean;
  range?: TrendRange;
}

const PERIOD_LABEL: Record<TrendRange, string> = {
  '7d': 'weekly',
  '30d': 'monthly',
  '90d': 'quarterly',
  '1y': 'yearly',
};

const KPI_ITEMS: { key: keyof RevenueKPI; label: string; description?: string }[] = [
  { key: 'totalRevenue', label: 'Total Revenue' },
  { key: 'totalCommission', label: 'Total Commission' },
  { key: 'adFeeRevenue', label: 'Ad Fee Revenue' },
  {
    key: 'totalIncome',
    label: 'Total Income',
    description: 'Total Commission + Ad Fee Revenue',
  },
  { key: 'avgOrderValue', label: 'Avg Order Value' },
  { key: 'netRevenue', label: 'Net Revenue' },
];

// [G] KPI cards grid — 6 cards (DD_02). Values are decimal strings from the API.
export const RevenueKPICards: React.FC<RevenueKPICardsProps> = ({ kpis, loading, range }) => {
  const periodLabel = range ? ` (${PERIOD_LABEL[range]})` : '';
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {KPI_ITEMS.map((item) => (
        <Card key={item.key}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {item.label}
              {periodLabel}
            </CardTitle>
            {item.description && (
              <p className="text-xs text-muted-foreground/70">
                ({item.description})
              </p>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-7 w-24 animate-pulse rounded bg-muted" />
            ) : (
              <p className="text-2xl font-bold">${kpis?.[item.key] ?? '0.00'}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
