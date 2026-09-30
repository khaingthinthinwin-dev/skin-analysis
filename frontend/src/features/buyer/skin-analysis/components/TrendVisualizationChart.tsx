import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { TrendPointDto } from '../types/skin-analysis.types'
import { CustomTooltip } from './CustomTooltip'


interface TrendVisualizationChartProps {
  healthScoreTrend: TrendPointDto[]
  hydrationTrend: TrendPointDto[]
  minPointsMet: boolean
  className?: string
}
const CHART_COLORS = {
  healthScore: '#8b5cf6',
  hydration: '#06b6d4',
}


export function TrendVisualizationChart({
  healthScoreTrend,
  hydrationTrend,
  minPointsMet,
  className,
}: TrendVisualizationChartProps) {
  const { t } = useTranslation('skin')

  const chartData = useMemo(() => {
    const dateMap = new Map<string, { date: string; healthScore?: number; hydration?: number }>()

    healthScoreTrend.forEach((point) => {
      const existing = dateMap.get(point.date) ?? { date: point.date }
      existing.healthScore = point.value
      dateMap.set(point.date, existing)
    })

    hydrationTrend.forEach((point) => {
      const existing = dateMap.get(point.date) ?? { date: point.date }
      existing.hydration = point.value
      dateMap.set(point.date, existing)
    })

    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date))
  }, [healthScoreTrend, hydrationTrend])

  if (!minPointsMet || healthScoreTrend.length < 2 || hydrationTrend.length < 2) {
    return (
      <Card className={cn('rounded-2xl border-border/60 shadow-sm', className)}>
        <CardHeader>
          <CardTitle className="text-lg">{t('trends.title')}</CardTitle>
        </CardHeader>
        <CardContent className="py-12 text-center">
          <div className="text-muted-foreground">
            <p className="text-lg font-medium mb-2">{t('trends.insufficientData')}</p>
            <p className="text-sm">{t('trends.needTwoScans')}</p>
          </div>
        </CardContent>
      </Card>
    )
  }


  return (
    <Card className={cn('rounded-2xl border-border/60 shadow-sm', className)}>
      <CardHeader>
        <CardTitle className="text-lg">{t('trends.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="health" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="health">{t('trends.healthScore')}</TabsTrigger>
            <TabsTrigger value="hydration">{t('trends.hydration')}</TabsTrigger>
          </TabsList>

          <TabsContent value="health" className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  stroke="currentColor"
                  opacity={0.3}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  stroke="currentColor"
                  opacity={0.3}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="healthScore"
                  stroke={CHART_COLORS.healthScore}
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                  name={t('trends.healthScore')}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="hydration" className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  stroke="currentColor"
                  opacity={0.3}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  stroke="currentColor"
                  opacity={0.3}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="hydration"
                  stroke={CHART_COLORS.hydration}
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                  name={t('trends.hydration')}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
