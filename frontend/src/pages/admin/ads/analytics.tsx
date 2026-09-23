import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useRevenueAnalytics } from '@/features/admin/advertisement-management/hooks/useRevenueAnalytics'
import { SummaryMetrics } from '@/features/admin/advertisement-management/components/AnalyticsMetrics'
import {
  RevenueByPlacementChart,
  RevenueByTierChart,
  RevenueTrendChart,
} from '@/features/admin/advertisement-management/components/AnalyticsCharts'
import { AdsByPlacementTable, AdsByTierTable } from '@/features/admin/advertisement-management/components/AnalyticsTables'
import { DateRangePicker } from '@/features/admin/advertisement-management/components/DateRangePicker'
import { MultiSelect, type MultiSelectOption } from '@/features/admin/advertisement-management/components/MultiSelect'
import { ADMIN_AD_PLACEMENTS, ADMIN_AD_TIERS, type RevenueAnalyticsQuery } from '@/types/admin-ad-management'
import type { Placement, Tier } from '@/types/admin-ad-management'
import { PLACEMENT_LABELS, TIER_LABELS, daysAgoIso, todayIso } from '@/features/admin/advertisement-management/utils/labels'

const PLACEMENT_OPTIONS: MultiSelectOption[] = ADMIN_AD_PLACEMENTS.map((placement) => ({
  value: placement,
  label: PLACEMENT_LABELS[placement],
}))
const TIER_OPTIONS: MultiSelectOption[] = ADMIN_AD_TIERS.map((tier) => ({
  value: tier,
  label: TIER_LABELS[tier],
}))

function ChartSkeleton() {
  return (
    <div className="rounded-md border bg-card p-4">
      <Skeleton className="mb-3 h-4 w-40" />
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </div>
    </div>
  )
}

export default function RevenueAnalyticsPage() {
  const [dateFrom, setDateFrom] = useState(daysAgoIso(29))
  const [dateTo, setDateTo] = useState(todayIso())
  const [placement, setPlacement] = useState<string[]>([])
  const [tier, setTier] = useState<string[]>([])

  const params: RevenueAnalyticsQuery = useMemo(
    () => ({
      dateFrom,
      dateTo,
      placement: (placement.length ? placement : undefined) as Placement[] | undefined,
      tier: (tier.length ? tier : undefined) as Tier[] | undefined,
    }),
    [dateFrom, dateTo, placement, tier],
  )

  const { data, isPending } = useRevenueAnalytics(params)
  const summary = data?.summary
  const byPlacement = data?.byPlacement ?? []
  const byTier = data?.byTier ?? []
  const trend = data?.trend ?? []

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Revenue Analytics</h1>
          <p className="text-muted-foreground">Revenue overview from approved advertisements</p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/admin/ads">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Ads
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-md border bg-card p-3">
        <div>
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Date range</span>
          <DateRangePicker
            value={{ from: dateFrom, to: dateTo }}
            onChange={(range) => {
              setDateFrom(range.from ?? '')
              setDateTo(range.to ?? '')
            }}
          />
        </div>
        <div>
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Placement</span>
          <MultiSelect label="placements" options={PLACEMENT_OPTIONS} value={placement} onChange={setPlacement} />
        </div>
        <div>
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Tier</span>
          <MultiSelect label="tiers" options={TIER_OPTIONS} value={tier} onChange={setTier} />
        </div>
      </div>

      <SummaryMetrics summary={summary} isLoading={isPending} />

      <div className="grid gap-4 lg:grid-cols-2">
        {isPending ? (
          <>
            <ChartSkeleton />
            <ChartSkeleton />
          </>
        ) : (
          <>
            <RevenueByPlacementChart rows={byPlacement} />
            <RevenueByTierChart rows={byTier} />
          </>
        )}
      </div>

      {isPending ? <ChartSkeleton /> : <RevenueTrendChart rows={trend} />}

      <div className="grid gap-4 lg:grid-cols-2">
        <AdsByPlacementTable rows={byPlacement} />
        <AdsByTierTable rows={byTier} />
      </div>
    </div>
  )
}