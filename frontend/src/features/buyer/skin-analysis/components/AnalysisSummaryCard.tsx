import { Sparkles, ShieldCheck, Droplets, User, Calendar, Award } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { LatestAnalysisResponse } from '@/schemas/skin-analysis.schema'
import { SKIN_TYPE_LABELS } from '../types/skin-analysis.types'

interface AnalysisSummaryCardProps {
  analysis: LatestAnalysisResponse | null
  onViewHistory?: () => void
  onViewTrends?: () => void
  className?: string
}

export function AnalysisSummaryCard({ analysis, onViewHistory, onViewTrends, className }: AnalysisSummaryCardProps) {
  const { t } = useTranslation('skin')

  if (!analysis) {
    return (
      <Card className={cn('rounded-2xl border-border/60 shadow-sm', className)}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-600" />
            {t('summary.title')}
          </CardTitle>
          <CardDescription>{t('summary.noScan')}</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">{t('summary.noScanDesc')}</p>
        </CardContent>
      </Card>
    )
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <Card className={cn('rounded-2xl border-border/60 shadow-sm', className)}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-600" />
          {t('summary.title')}
        </CardTitle>
        <CardDescription>
          {t('summary.lastAnalyzed', { date: formatDate(analysis.analysisDate) })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Health Score Gauge */}
        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24 flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="42"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                className="text-muted/30"
              />
              <circle
                cx="48"
                cy="48"
                r="42"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                strokeDasharray={264}
                strokeDashoffset={264 * (1 - analysis.healthScore / 100)}
                strokeLinecap="round"
                className="text-violet-500 transition-all duration-1000"
                style={{ strokeDasharray: 264, strokeDashoffset: 264 * (1 - analysis.healthScore / 100) }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <span className="text-2xl font-extrabold text-foreground">{analysis.healthScore}</span>
                <div className="text-xs text-muted-foreground">{t('summary.healthScore')}</div>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('summary.hydration')}</span>
                <span className="font-semibold">{analysis.hydration}%</span>
              </div>
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={analysis.hydration}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-cyan-500 transition-all duration-500"
                  style={{ width: `${analysis.hydration}%` }}
                />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('summary.skinAge')}</span>
                <span className="font-semibold">{t('summary.years', { age: analysis.skinAge })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              <span>{t('summary.quotaRemaining', { count: analysis.remainingDailyQuota })}</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Award className="h-4 w-4" />
              <span>{t('summary.years', { age: analysis.skinAge })}</span>
            </div>
          </div>
        </div>

        {/* Skin Type Badge */}
        <div className="rounded-xl bg-muted/50 p-3 ring-1 ring-border/70">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            <span className="font-semibold text-foreground">
              {t('summary.skinTypeLabel', { type: SKIN_TYPE_LABELS[analysis.skinType] })}
            </span>
          </div>
        </div>

        {/* Quick Links */}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={onViewHistory} className="flex-1">
            <Calendar className="mr-2 h-4 w-4" />
            {t('summary.viewHistory')}
          </Button>
          <Button variant="outline" size="sm" onClick={onViewTrends} className="flex-1">
            <Droplets className="mr-2 h-4 w-4" />
            {t('summary.viewTrends')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}