import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';
import type { SalesSummaryDto } from '../types/merchantOrderInsights.types';

export function SalesSummaryTiles({ data, loading, onCompletedClick }: { data?: SalesSummaryDto; loading?: boolean; onCompletedClick: () => void }) {
  const { t } = useTranslation();
  const tiles = [{ label: t('merchant.orders.today', "Today's Orders"), value: data?.todayCount ?? 0, clickable: false }, { label: t('merchant.orders.thisMonth', "This Month's Orders"), value: data?.thisMonthCount ?? 0, clickable: false }, { label: t('merchant.orders.completed', 'Completed Orders'), value: data?.completedCount ?? 0, clickable: true }];
  return <section aria-label={t('merchant.orders.salesSummary', 'Sales Summary')} className="grid gap-3 sm:grid-cols-3">{tiles.map((tile) => loading ? <Skeleton key={tile.label} className="h-24" /> : tile.clickable ? <Button key={tile.label} variant="outline" className="h-24 justify-between px-4 text-left" onClick={onCompletedClick}><span><span className="block text-sm text-muted-foreground">{tile.label}</span><strong className="mt-2 block text-2xl text-foreground">{tile.value}</strong></span><span aria-hidden="true">&#x1F3C6;</span></Button> : <div key={tile.label} className="flex h-24 items-center justify-between rounded-xl border bg-white px-4 shadow-sm"><span><span className="block text-sm text-muted-foreground">{tile.label}</span><strong className="mt-2 block text-2xl">{tile.value}</strong></span><span aria-hidden="true">&#x1F4E6;</span></div>)}</section>;
}