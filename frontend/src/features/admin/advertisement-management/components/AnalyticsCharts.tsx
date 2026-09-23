import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  ComposedChart,
  type PieLabelRenderProps,
} from 'recharts'
import { formatPrice } from '../utils/format'
import type { RevenueAnalytics } from '@/types/admin-ad-management'

type PlacementBreakdownRow = RevenueAnalytics['byPlacement'][number]
type TierBreakdownRow = RevenueAnalytics['byTier'][number]
type TrendRow = RevenueAnalytics['trend'][number]

const PLACEMENT_COLORS = ['#7C3AED', '#EC4899', '#F59E0B', '#22D3EE']
const TIER_COLORS = ['#C4B5FD', '#A78BFA', '#7C3AED']
const TREND_COLOR = '#7C3AED'

const tooltipContentStyle: React.CSSProperties = {
  background: 'var(--color-popover)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  color: 'var(--color-popover-foreground)',
}

function formatAxisPrice(value: number): string {
  const n = Number(value)
  if (Number.isNaN(n)) return '0 KS'
  if (Math.abs(n) >= 1000) {
    return `${(n / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}k KS`
  }
  return `${n} KS`
}

interface RevenuePieChartProps {
  title: string
  description: string
  rows: Array<{ name: string; value: number }>
  colors: string[]
}

function RevenuePieChart({ title, description, rows, colors }: RevenuePieChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No data</p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <Pie
                  data={rows}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={2}
                  label={(props: PieLabelRenderProps) =>
                    `${Math.round((props.percent ?? 0) * 100)}%`
                  }
                  labelLine={false}
                >
                  {rows.map((row, index) => (
                    <Cell key={row.name} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipContentStyle}
                  formatter={(value) => formatPrice(Number(value))}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
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
      description="Total revenue grouped by ad placement"
      rows={rows.map((row) => ({ name: row.placementName, value: Number(row.revenue) }))}
      colors={PLACEMENT_COLORS}
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
      description="Total revenue grouped by advertising tier"
      rows={rows.map((row) => ({ name: row.tierName, value: Number(row.revenue) }))}
      colors={TIER_COLORS}
    />
  )
}

interface RevenueTrendChartProps {
  rows: TrendRow[]
}

export function RevenueTrendChart({ rows }: RevenueTrendChartProps) {
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
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={rows} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={TREND_COLOR} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={TREND_COLOR} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value: string) =>
                    new Date(value).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                  }
                  tick={{ fontSize: 12 }}
                  stroke="var(--color-muted-foreground)"
                />
                <YAxis
                  tickFormatter={(value: number) => formatAxisPrice(value)}
                  width={64}
                  tick={{ fontSize: 12 }}
                  stroke="var(--color-muted-foreground)"
                />
                <Tooltip
                  contentStyle={tooltipContentStyle}
                  labelFormatter={(label) =>
                    new Date(String(label)).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  }
                  formatter={(value) => formatPrice(Number(value))}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  fill="url(#revenueGradient)"
                  stroke="none"
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke={TREND_COLOR}
                  strokeWidth={3}
                  dot={{ r: 5, fill: TREND_COLOR, stroke: '#fff', strokeWidth: 2 }}
                  activeDot={{ r: 7 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}