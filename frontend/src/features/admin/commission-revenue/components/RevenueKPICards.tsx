import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RevenueKPI, TrendRange } from '../services/commission.service';
import { formatCurrency } from '../utils/format';

interface RevenueKPICardsProps {
  kpis?: RevenueKPI;
  loading?: boolean;
  range?: TrendRange;
}

const PERIOD_LABEL: Record<TrendRange, string> = {
  '7d': 'admin.commission.period.weekly',
  '30d': 'admin.commission.period.monthly',
  '90d': 'admin.commission.period.quarterly',
  '1y': 'admin.commission.period.yearly',
};

const KPI_ITEMS: { key: keyof RevenueKPI; labelKey: string; label: string; descriptionKey?: string; description?: string }[] = [
  { key: 'totalRevenue', labelKey: 'admin.commission.kpi.totalRevenue', label: 'Total Revenue' },
  { key: 'totalCommission', labelKey: 'admin.commission.kpi.totalCommission', label: 'Total Commission' },
  { key: 'adFeeRevenue', labelKey: 'admin.commission.kpi.adFeeRevenue', label: 'Ad Fee Revenue' },
  {
    key: 'totalIncome',
    labelKey: 'admin.commission.kpi.totalIncome',
    label: 'Total Income',
    descriptionKey: 'admin.commission.kpi.totalIncomeDescription',
    description: 'Total Commission + Ad Fee Revenue',
  },
  { key: 'avgOrderValue', labelKey: 'admin.commission.kpi.avgOrderValue', label: 'Avg Order Value' },
  { key: 'netRevenue', labelKey: 'admin.commission.kpi.netRevenue', label: 'Net Revenue' },
];

// [G] KPI cards grid — 6 cards (DD_02). Values are decimal strings from the API.
export const RevenueKPICards: React.FC<RevenueKPICardsProps> = ({ kpis, loading, range }) => {
  const { t } = useTranslation();
  const periodLabel = range
    ? t('admin.commission.kpi.periodLabel', ' ({{period}})', { period: t(PERIOD_LABEL[range]) })
    : '';
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {KPI_ITEMS.map((item) => (
        <Card key={item.key}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t(item.labelKey, item.label)}
              {periodLabel}
            </CardTitle>
            {item.description && (
              <p className="text-xs text-muted-foreground/70">
                ({t(item.descriptionKey ?? '', item.description ?? '')})
              </p>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-7 w-24 animate-pulse rounded bg-muted" />
            ) : (
              <p className="text-2xl font-bold">{formatCurrency(kpis?.[item.key])} Ks</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
