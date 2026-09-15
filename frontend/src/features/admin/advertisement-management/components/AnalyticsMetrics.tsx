import { Skeleton } from '@/components/ui/skeleton'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { formatPrice } from '@/lib/format'
import type { RevenueAnalytics } from '@/types/admin-ad-management'

interface SummaryMetricsProps {
  summary?: RevenueAnalytics['summary']
  isLoading?: boolean
}

export function SummaryMetrics({ summary, isLoading = false }: SummaryMetricsProps) {
  const metrics = summary
    ? [
        { label: 'Total Revenue', value: formatPrice(summary.totalRevenue) },
        { label: 'Total Ads Approved', value: String(summary.totalAdsApproved) },
        { label: 'Total Fees Collected', value: formatPrice(summary.totalFeesCollected) },
        { label: 'Avg Revenue Per Ad', value: formatPrice(summary.avgRevenuePerAd) },
        { label: 'Total Refunds', value: formatPrice(summary.totalRefunds) },
      ]
    : []

  const loadingRows: Array<{ label: string; value: string }> = Array.from({ length: 5 })
  const displayed: Array<{ label: string; value: string } | null> = isLoading
    ? loadingRows.map(() => null)
    : metrics

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {displayed.map((metric, index) =>
        metric ? (
          <Card key={index}>
            <CardHeader className="p-4">
              <CardDescription className="text-xs">{metric.label}</CardDescription>
              <CardTitle className="text-lg">{metric.value}</CardTitle>
            </CardHeader>
          </Card>
        ) : (
          <Card key={index}>
            <CardContent className="p-4">
              <Skeleton className="mb-2 h-3 w-20" />
              <Skeleton className="h-6 w-28" />
            </CardContent>
          </Card>
        ),
      )}
    </div>
  )
}