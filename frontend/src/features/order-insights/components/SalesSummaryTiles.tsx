import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Package, PackageCheck, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SalesSummaryDto } from '../types/merchantOrderInsights.types';

export function SalesSummaryTiles({ data, loading, onCompletedClick }: { data?: SalesSummaryDto; loading?: boolean; onCompletedClick: () => void }) {
  const { t } = useTranslation();
  const tiles: Array<{ label: string; value: number; clickable: boolean; icon: LucideIcon; iconClassName: string }> = [
    { label: t('merchant.orders.today', "Today's Orders"), value: data?.todayCount ?? 0, clickable: false, icon: Package, iconClassName: 'bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-300' },
    { label: t('merchant.orders.thisMonth', "This Month's Orders"), value: data?.thisMonthCount ?? 0, clickable: false, icon: Calendar, iconClassName: 'bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-300' },
    { label: t('merchant.orders.completed', 'Completed Orders'), value: data?.completedCount ?? 0, clickable: true, icon: PackageCheck, iconClassName: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300' },
  ];
  const cardClassName = 'flex min-h-[96px] items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-gray-900 shadow-[0_6px_18px_rgba(0,0,0,0.08)]';

  return <section aria-label={t('merchant.orders.salesSummary', 'Sales Summary')} className="grid gap-3 sm:grid-cols-3">{tiles.map((tile) => {
    const Icon = tile.icon;
    const content = <><span><span className="block text-sm text-muted-foreground">{tile.label}</span><strong className="mt-2 block text-2xl font-bold tabular-nums text-gray-900">{tile.value}</strong></span><span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tile.iconClassName}`}><Icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" /></span></>;
    return loading ? <Skeleton key={tile.label} className="h-24" /> : tile.clickable ? <Button key={tile.label} type="button" variant="outline" className={`${cardClassName} cursor-pointer transition hover:border-violet-300 hover:shadow-md focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2`} onClick={onCompletedClick}>{content}</Button> : <div key={tile.label} className={cardClassName}>{content}</div>;
  })}</section>;
}