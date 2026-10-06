'use client';

import type { LucideIcon } from 'lucide-react';
import { CheckCircle2, ShoppingCart, Truck, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrencyAmount } from '../types/merchantOrderInsights.types';
import type { AdminOrderListResponseDto } from '../types/adminOrderInsights.types';

interface AdminOrderKpiTilesProps {
  meta: AdminOrderListResponseDto['meta'] | undefined;
  summary: AdminOrderListResponseDto['summary'];
  loading?: boolean;
}

const CARD_CLASS =
  'min-w-0 rounded-xl border-[#f3f4f6] shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:border-[#29252f] dark:bg-[#111014] dark:shadow-none oidark:border-outline-variant oidark:bg-surface-container-low oidark:shadow-none';

interface Tile {
  icon: LucideIcon;
  iconClassName: string;
  label: string;
  value: string;
  hint: string;
}

/**
 * Headline figures for the order list.
 *
 * Every number is scoped to the filters currently applied — `meta.total` and the
 * endpoint's own aggregate block are both computed from the same order set that
 * produced the rows — so the tiles always describe the table underneath them.
 *
 * "Order value" is the gross sum of the matching orders, deliberately *not*
 * labelled revenue: platform revenue, commission and payouts belong to the
 * Revenue & Commission subsystem and are out of scope on this screen.
 *
 * A figure the payload does not carry renders as `—` with a footnote instead of
 * as `0`, so a missing aggregate is never misread as "no orders"
 * (BR-OI-030 / BR-OI-032).
 */
export function AdminOrderKpiTiles({ meta, summary, loading = false }: AdminOrderKpiTilesProps) {
  const { t } = useTranslation();

  if (loading && !meta) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className={CARD_CLASS}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-7 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totalSpent = typeof summary?.totalSpent === 'number' ? summary.totalSpent : null;
  const inProgress = typeof summary?.inProgress === 'number' ? summary.inProgress : null;
  const delivered = typeof summary?.completed === 'number' ? summary.completed : null;

  const tiles: Tile[] = [
    {
      icon: ShoppingCart,
      iconClassName: 'bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-300 oidark:bg-violet-950 oidark:text-violet-300',
      label: t('admin.orders.kpi.totalOrders', 'Total orders'),
      value: meta ? String(meta.total) : '—',
      hint: t('admin.orders.kpi.matchingFilters', 'Matching the current filters'),
    },
    {
      icon: Wallet,
      iconClassName: 'bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-300 oidark:bg-sky-950 oidark:text-sky-300',
      label: t('admin.orders.kpi.orderValue', 'Order value'),
      value: totalSpent === null ? '—' : formatCurrencyAmount(totalSpent.toFixed(2)),
      hint: t('admin.orders.kpi.orderValueHint', 'Gross value of the matching orders'),
    },
    {
      icon: Truck,
      iconClassName: 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-300 oidark:bg-amber-950 oidark:text-amber-300',
      label: t('admin.orders.kpi.inProgress', 'In progress'),
      value: inProgress === null ? '—' : String(inProgress),
      hint: t('admin.orders.kpi.inProgressHint', 'Not yet delivered'),
    },
    {
      icon: CheckCircle2,
      iconClassName: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300 oidark:bg-emerald-950 oidark:text-emerald-300',
      label: t('admin.orders.kpi.delivered', 'Delivered'),
      value: delivered === null ? '—' : String(delivered),
      hint: t('admin.orders.kpi.deliveredHint', 'Completed orders'),
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {tiles.map(({ icon: Icon, iconClassName, label, value, hint }) => (
        <Card key={label} className={CARD_CLASS}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClassName}`} aria-hidden="true">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-xs font-semibold text-muted-foreground">{label}</h2>
                <p className="mt-0.5 text-xl font-extrabold text-foreground">{value}</p>
              </div>
            </div>
            <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{hint}</p>
          </CardContent>
        </Card>
      ))}
      {totalSpent === null && inProgress === null && delivered === null && (
        <p className="text-[11px] text-muted-foreground sm:col-span-2 xl:col-span-4">
          {t('admin.orders.kpi.aggregateUnavailable', 'Aggregates are not available for this result set.')}
        </p>
      )}
    </div>
  );
}