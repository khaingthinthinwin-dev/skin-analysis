import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { formatPrice } from '@/lib/format'
import type { RevenueAnalytics } from '@/types/admin-ad-management'

type PlacementBreakdownRow = RevenueAnalytics['byPlacement'][number]
type TierBreakdownRow = RevenueAnalytics['byTier'][number]
type TrendRow = RevenueAnalytics['trend'][number]

function horizontalMax(rows: Array<{ revenue: number }>): number {
  return Math.max(1, ...rows.map((row) => Number(row.revenue)))
}

interface BarChartProps {
  title: string
  description: string
  rows: Array<{ label: string; name: string; revenue: number }>
}

export function RevenueBarChart({ title, description, rows }: BarChartProps) {
  const max = horizontalMax(rows)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No data</p>
        ) : (
          rows.map((row) => {
            const revenue = Number(row.revenue)
            const width = Math.max(2, (revenue / max) * 100)
            return (
              <div key={row.name} className="flex items-center gap-3">
                <span className="w-32 shrink-0 truncate text-sm" title={row.label}>
                  {row.label}
                </span>
                <div className="h-5 flex-1 overflow-hidden rounded bg-secondary">
                  <div
                    className="h-5 rounded bg-purple-500"
                    style={{ width: `${width}%` }}
                    role="img"
                    aria-label={`${row.label} revenue ${formatPrice(revenue)}`}
                  />
                </div>
                <span className="w-24 shrink-0 text-right text-sm font-medium">
                  {formatPrice(revenue)}
                </span>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

interface RevenueByPlacementChartProps {
  rows: PlacementBreakdownRow[]
}

export function RevenueByPlacementChart({ rows }: RevenueByPlacementChartProps) {
  return (
    <RevenueBarChart
      title="Revenue by Placement"
      description="Total revenue grouped by ad placement"
      rows={rows.map((row) => ({
        label: row.placementName,
        name: row.placement,
        revenue: row.revenue,
      }))}
    />
  )
}

interface RevenueByTierChartProps {
  rows: TierBreakdownRow[]
}

export function RevenueByTierChart({ rows }: RevenueByTierChartProps) {
  return (
    <RevenueBarChart
      title="Revenue by Tier"
      description="Total revenue grouped by advertising tier"
      rows={rows.map((row) => ({
        label: row.tierName,
        name: row.tier,
        revenue: row.revenue,
      }))}
    />
  )
}

interface RevenueTrendChartProps {
  rows: TrendRow[]
}

export function RevenueTrendChart({ rows }: RevenueTrendChartProps) {
  const max = Math.max(1, ...rows.map((row) => Number(row.revenue)))
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Revenue Trend</CardTitle>
        <CardDescription>Daily revenue over the selected period</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No data</p>
        ) : (
          <div className="flex h-48 items-end gap-1">
            {rows.map((row) => {
              const revenue = Number(row.revenue)
              const height = revenue > 0 ? Math.max(4, (revenue / max) * 160) : 2
              const label = new Date(row.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })
              return (
                <div key={row.date} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-pink-500"
                    style={{ height: `${height}px` }}
                    role="img"
                    aria-label={`${row.date} revenue ${formatPrice(revenue)}`}
                  />
                  <span className="truncate text-[10px] text-muted-foreground">{label}</span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}