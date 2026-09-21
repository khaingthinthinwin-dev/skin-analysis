import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { SummaryPeriod } from '../types/merchantOrderInsights.types';

export function PeriodSelector({ value, from, to, onChange }: { value: SummaryPeriod; from?: string; to?: string; onChange: (value: SummaryPeriod, from?: string, to?: string) => void }) {
  const { t } = useTranslation();
  return <div className="space-y-3"><div className="text-sm font-medium">{t('merchant.revenue.period', 'Period')}</div><Tabs value={value} onValueChange={(next) => onChange(next as SummaryPeriod, next === 'custom' ? from : undefined, next === 'custom' ? to : undefined)}><TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-4"><TabsTrigger value="today">{t('merchant.revenue.today', 'Today')}</TabsTrigger><TabsTrigger value="this_month">{t('merchant.revenue.thisMonth', 'This Month')}</TabsTrigger><TabsTrigger value="last_month">{t('merchant.revenue.lastMonth', 'Last Month')}</TabsTrigger><TabsTrigger value="custom">{t('merchant.revenue.custom', 'Custom')}</TabsTrigger></TabsList></Tabs>{value === 'custom' && <div className="grid gap-2 sm:grid-cols-2"><Input aria-label="From" type="date" value={from ?? ''} onChange={(event) => onChange('custom', event.target.value, to)} /><Input aria-label="To" type="date" value={to ?? ''} onChange={(event) => onChange('custom', from, event.target.value)} /></div>}</div>;
}