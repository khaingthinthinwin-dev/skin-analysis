import type { LucideIcon } from 'lucide-react'
import { Award, Droplets, FileText, TrendingUp } from 'lucide-react'

export type SummaryMetricIcon = 'FileText' | 'Award' | 'Droplets' | 'TrendingUp'

export interface SummaryMetric {
  label: string
  value: string | number
  icon: SummaryMetricIcon
  positive?: boolean
}

const ICONS: Record<SummaryMetricIcon, LucideIcon> = {
  FileText,
  Award,
  Droplets,
  TrendingUp,
}

export function SummaryMetricRow({
  metrics,
  className,
}: {
  metrics: SummaryMetric[]
  className?: string
}) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className ?? ''}`} role="list">
      {metrics.map((metric) => {
        const Icon = ICONS[metric.icon]
        return (
          <div
            key={metric.label}
            className="p-4 rounded-xl border border-border/50 bg-background"
            role="listitem"
          >
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-2xl font-extrabold">{metric.value}</p>
            <p className="text-xs text-muted-foreground">{metric.label}</p>
          </div>
        )
      })}
    </div>
  )
}
