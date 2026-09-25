import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Calendar, Package, PackageCheck, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SalesSummaryDto } from '../types/merchantOrderInsights.types';

export function SalesSummaryTiles({ data, loading, onCompletedClick }: { data?: SalesSummaryDto; loading?: boolean; onCompletedClick: () => void }) {
  const { t } = useTranslation();
  const tiles: Array<{ label: string; value: number; clickable: boolean; icon: LucideIcon; iconClassName: string }> = [
    { label: t('merchant.orders.today', "Today's Orders"), value: data?.todayCount ?? 0, clickable: false, icon: Package, iconClassName: 'bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-300 oidark:bg-violet-950 oidark:text-violet-300' },
    { label: t('merchant.orders.thisMonth', "This Month's Orders"), value: data?.thisMonthCount ?? 0, clickable: false, icon: Calendar, iconClassName: 'bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-300 oidark:bg-sky-950 oidark:text-sky-300' },
    { label: t('merchant.orders.completed', 'Completed Orders'), value: data?.completedCount ?? 0, clickable: true, icon: PackageCheck, iconClassName: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300 oidark:bg-emerald-950 oidark:text-emerald-300' },
  ];
  // Same KPI card recipe as the Buyer Order Insights page: label top-left, value bottom-left, icon top-right.
  const cardClassName = 'flex h-auto min-h-[72px] items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-gray-900 shadow-[0_6px_18px_rgba(0,0,0,0.08)] oidark:border-outline-variant oidark:bg-surface-container-low oidark:text-foreground oidark:shadow-none';
  // Only the Completed tile is a button, so it replaces the outline variant's default hover surface
  // (`hover:bg-accent` = pink #EC4899 + `hover:text-accent-foreground` = white) with the Revenue
  // highlight tint and a purple border, keeping label and value dark and readable. The lift stays the
  // soft `shadow-md` already used, and focus mirrors the hover surface with a purple ring.
  const clickableCardClassName = `${cardClassName} group cursor-pointer transition hover:border-[#7c3aed] hover:bg-[#f9f5ff] hover:text-gray-900 hover:shadow-md focus-visible:border-[#7c3aed] focus-visible:bg-[#f9f5ff] focus-visible:text-gray-900 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 oidark:hover:border-primary oidark:hover:bg-muted oidark:hover:text-foreground oidark:focus-visible:border-primary oidark:focus-visible:bg-muted oidark:focus-visible:text-foreground`;

  return <section aria-label={t('merchant.orders.salesSummary', 'Sales Summary')} className="grid grid-cols-1 gap-[14px] sm:grid-cols-3">{tiles.map((tile) => {
    const Icon = tile.icon;
    const content = <><span className="min-w-0"><span className="block text-[12.5px] font-medium tracking-[0.2px] text-gray-500 oidark:text-muted-foreground">{tile.label}</span><span className="mt-[6px] flex items-center gap-2"><strong className="text-[22px] font-bold tabular-nums tracking-[-0.3px] text-gray-900 oidark:text-foreground">{tile.value}</strong>{tile.clickable && <span className="inline-flex items-center gap-0.5 text-[12px] font-medium text-[#7c3aed]/60 transition-colors group-hover:text-[#7c3aed] group-focus-visible:text-[#7c3aed] oidark:text-primary/70 oidark:group-hover:text-primary oidark:group-focus-visible:text-primary">{t('common.view', 'View')}<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></span>}</span></span><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tile.iconClassName}`}><Icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" /></span></>;
    return loading ? <Skeleton key={tile.label} className="h-[72px] rounded-xl" /> : tile.clickable ? <Button key={tile.label} type="button" variant="outline" className={clickableCardClassName} aria-label={t('merchant.orders.viewCompletedOrders', 'View completed orders')} onClick={onCompletedClick}>{content}</Button> : <div key={tile.label} className={cardClassName}>{content}</div>;
  })}</section>;
}