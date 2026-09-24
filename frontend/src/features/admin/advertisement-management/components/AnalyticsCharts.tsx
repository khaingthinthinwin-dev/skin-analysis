import { useState } from 'react'
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

interface PieChartProps {
  title: string
  description: string
  rows: Array<{ label: string; name: string; revenue: number }>
}

const PIE_COLORS = [
  '#7C3AED',
  '#EC4899',
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EF4444',
  '#14B8A6',
]

// Renders revenue share as an accessible SVG pie chart with a legend.
function RevenuePieChart({ title, description, rows }: PieChartProps) {
  const total = rows.reduce((sum, row) => sum + Number(row.revenue), 0)
  const slices =
    total > 0
      ? (() => {
          const radius = 80
          const center = 90
          let angle = -Math.PI / 2
          return rows.map((row, index) => {
            const share = Number(row.revenue) / total
            const sweep = share * Math.PI * 2
            const x1 = center + radius * Math.cos(angle)
            const y1 = center + radius * Math.sin(angle)
            angle += sweep
            const x2 = center + radius * Math.cos(angle)
            const y2 = center + radius * Math.sin(angle)
            const largeArc = sweep > Math.PI ? 1 : 0
            return {
              key: row.name,
              label: row.label,
              revenue: Number(row.revenue),
              percent: Math.round(share * 1000) / 10,
              color: PIE_COLORS[index % PIE_COLORS.length],
              path:
                share >= 1
                  ? undefined // full circle: render as <circle> instead
                  : `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`,
            }
          })
        })()
      : []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 || total <= 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No data</p>
        ) : (
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
            <svg
              viewBox="0 0 180 180"
              className="h-44 w-44 shrink-0"
              role="img"
              aria-label={`${title} pie chart`}
            >
              {slices.map((slice) =>
                slice.path ? (
                  <path key={slice.key} d={slice.path} fill={slice.color}>
                    <title>{`${slice.label}: ${formatPrice(slice.revenue)} (${slice.percent}%)`}</title>
                  </path>
                ) : (
                  <circle key={slice.key} cx={90} cy={90} r={80} fill={slice.color}>
                    <title>{`${slice.label}: ${formatPrice(slice.revenue)} (${slice.percent}%)`}</title>
                  </circle>
                ),
              )}
            </svg>
            <ul className="min-w-0 flex-1 space-y-2">
              {slices.map((slice) => (
                <li key={slice.key} className="flex items-center gap-2 text-sm">
                  <span
                    className="h-3 w-3 shrink-0 rounded-sm"
                    style={{ backgroundColor: slice.color }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate" title={slice.label}>
                    {slice.label}
                  </span>
                  <span className="shrink-0 text-muted-foreground">{slice.percent}%</span>
                  <span className="w-24 shrink-0 text-right font-medium">
                    {formatPrice(slice.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
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
    <RevenuePieChart
      title="Revenue by Placement"
      description="Revenue share grouped by ad placement"
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
    <RevenuePieChart
      title="Revenue by Tier"
      description="Revenue share grouped by advertising tier"
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
  const [hovered, setHovered] = useState<number | null>(null)

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue Trend</CardTitle>
          <CardDescription>Daily revenue over the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="py-6 text-center text-sm text-muted-foreground">No data</p>
        </CardContent>
      </Card>
    )
  }

  const width = 600
  const height = 220
  const padX = 12
  const padTop = 30
  const padBottom = 28
  const innerW = width - padX * 2
  const innerH = height - padTop - padBottom
  const values = rows.map((row) => Number(row.revenue))
  const max = Math.max(1, ...values)

  const points = rows.map((row, i) => ({
    x: padX + (rows.length === 1 ? innerW / 2 : (i / (rows.length - 1)) * innerW),
    y: padTop + innerH - (Number(row.revenue) / max) * innerH,
    revenue: Number(row.revenue),
    date: row.date,
    label: new Date(row.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
  }))

  // Smooth the line with a Catmull-Rom-style curve through the points.
  const linePath = points
    .map((point, i) => {
      if (i === 0) return `M ${point.x} ${point.y}`
      const prev = points[i - 1]
      const cx = (prev.x + point.x) / 2
      return `C ${cx} ${prev.y} ${cx} ${point.y} ${point.x} ${point.y}`
    })
    .join(' ')
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padTop + innerH} L ${points[0].x} ${padTop + innerH} Z`

  // Show ~6 evenly spaced x-axis labels.
  const tickCount = Math.min(6, points.length)
  const tickIndexes = Array.from({ length: tickCount }, (_, i) =>
    Math.round((i / (tickCount - 1 || 1)) * (points.length - 1)),
  )

  const active = hovered !== null ? points[hovered] : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Revenue Trend</CardTitle>
        <CardDescription>Daily revenue over the selected period</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-56 w-full"
            role="img"
            aria-label="Revenue trend line chart"
            onMouseLeave={() => setHovered(null)}
          >
            <defs>
              <linearGradient id="revenueTrendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            <path d={areaPath} fill="url(#revenueTrendFill)" />
            <path d={linePath} fill="none" stroke="#10B981" strokeWidth="2.5" />

            {points.map((point, i) => (
              <g key={point.date}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={hovered === i ? 5 : 3}
                  fill={hovered === i ? '#10B981' : '#ffffff'}
                  stroke="#10B981"
                  strokeWidth="2"
                >
                  <title>{`${point.label}: ${formatPrice(point.revenue)}`}</title>
                </circle>
                {/* Invisible hover hit area */}
                <rect
                  x={point.x - innerW / (2 * points.length)}
                  y={padTop}
                  width={innerW / points.length}
                  height={innerH}
                  fill="transparent"
                  onMouseEnter={() => setHovered(i)}
                />
              </g>
            ))}

            {active && (
              <line
                x1={active.x}
                y1={padTop - 6}
                x2={active.x}
                y2={padTop + innerH}
                stroke="#10B981"
                strokeWidth="1"
                strokeDasharray="4 3"
              />
            )}

            {tickIndexes.map((index) => (
              <text
                key={points[index].date}
                x={points[index].x}
                y={height - 6}
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize="11"
              >
                {points[index].label}
              </text>
            ))}
          </svg>

          {active && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-md bg-foreground px-3 py-1.5 text-center shadow-lg"
              style={{
                left: `${(active.x / width) * 100}%`,
                top: `${(active.y / height) * 100 - 18}%`,
              }}
            >
              <div className="text-sm font-semibold text-background">
                {formatPrice(active.revenue)}
              </div>
              <div className="text-[10px] text-background/70">{active.label}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}