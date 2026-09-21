import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';
import { formatCurrencyAmount } from '../types/merchantOrderInsights.types';
import type { RevenueSummaryDto, SummaryPeriod } from '../types/merchantOrderInsights.types';
import { PeriodSelector } from './PeriodSelector';

export function RevenueSummaryGroup({ data, loading, period, from, to, onPeriodChange }: { data?: RevenueSummaryDto; loading?: boolean; period: SummaryPeriod; from?: string; to?: string; onPeriodChange: (period: SummaryPeriod, from?: string, to?: string) => void }) {
  const { t } = useTranslation();
  if (loading) return <Card><CardContent className="space-y-4 p-6"><Skeleton className="h-6 w-48" /><Skeleton className="h-24 w-full" /></CardContent></Card>;
  const stats = data ? [{ label: t('merchant.revenue.sales', 'Sales'), value: data.sales }, { label: t('merchant.revenue.commission', 'Commission'), value: data.commission }, { label: t('merchant.revenue.net', 'Revenue'), value: data.revenue, emphasized: true }, { label: t('merchant.revenue.aov', 'AOV'), value: data.aov }] : [];
  return <Card><CardHeader><CardTitle>{t('merchant.revenue.title', 'Revenue Summary')}</CardTitle></CardHeader><CardContent className="space-y-5"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{stats.map((stat) => <div key={stat.label} className={stat.emphasized ? 'rounded-md border border-primary/30 bg-primary/5 p-3' : 'p-3'}><div className="text-sm text-muted-foreground">{stat.label}</div><div className="mt-1 text-xl font-semibold">{formatCurrencyAmount(stat.value)}</div></div>)}</div><p className="text-sm text-muted-foreground">{t('merchant.revenue.orderCount', 'Based on {{count}} orders').replace('{{count}}', String(data?.orderCount ?? 0))}</p><p className="text-sm text-muted-foreground">{data?.commissionRateLocked ? `${Number(data.commissionRate).toFixed(2)}%` : '—'} {data?.commissionRateLocked ? '' : t('merchant.revenue.rateNote', 'Commission is calculated with the current platform rate; historical rate locking is pending.')}</p><PeriodSelector value={period} from={from} to={to} onChange={onPeriodChange} /></CardContent></Card>;
}