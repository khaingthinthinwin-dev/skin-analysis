import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import {
  CheckCircle2,
  Info,
  CalendarDays,
  Droplets,
  HeartPulse,
  ScanFace,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { ConditionSeveritySection } from '../../features/buyer/skin-analysis/components/ConditionSeveritySection'
import { DailyRoutineSection } from '../../features/buyer/skin-analysis/components/DailyRoutineSection'
import { ProductRecommendationCard } from '../../features/buyer/skin-analysis/components/ProductRecommendationCard'
import { SKIN_TYPE_LABELS } from '../../features/buyer/skin-analysis/types/skin-analysis.types'
import { cn } from '@/lib/utils'
import { getImageUrl } from '@/lib/image-url'
import type { AnalysisResultResponse } from '@/schemas/skin-analysis.schema'
import type { LucideIcon } from 'lucide-react'

interface AIFacialAnalysisCardProps {
  analysis: AnalysisResultResponse
}

const GUIDELINE_KEYS = [
  'guidelines.lightingDesc',
  'guidelines.backgroundDesc',
  'guidelines.expressionDesc',
] as const

export function AIFacialAnalysisCard({ analysis }: AIFacialAnalysisCardProps) {
  const { t } = useTranslation('skin')

  const formatShortDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })

  const stats: {
    label: string
    value: string
    accent: string
    chip: string
    Icon: LucideIcon
    progress?: number
  }[] = [
    {
      label: t('results.skinType'),
      value: SKIN_TYPE_LABELS[analysis.skinType],
      accent: 'text-violet-600 dark:text-violet-300',
      chip: 'bg-violet-500/10 text-violet-600 ring-violet-500/20 dark:text-violet-300',
      Icon: ScanFace,
    },
    {
      label: t('results.skinAge'),
      value: `${analysis.skinAge} ${t('common.yrs')}`,
      accent: 'text-foreground',
      chip: 'bg-slate-500/10 text-slate-600 ring-slate-500/20 dark:text-slate-300',
      Icon: CalendarDays,
    },
    {
      label: t('results.healthScore'),
      value: `${analysis.healthScore}`,
      accent: 'text-emerald-600 dark:text-emerald-300',
      chip: 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-300',
      Icon: HeartPulse,
      progress: analysis.healthScore,
    },
    {
      label: t('results.hydration'),
      value: `${analysis.hydration}%`,
      accent: 'text-sky-600 dark:text-sky-300',
      chip: 'bg-sky-500/10 text-sky-600 ring-sky-500/20 dark:text-sky-300',
      Icon: Droplets,
      progress: analysis.hydration,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Report hero */}
      <div className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-600 via-purple-600 to-pink-500 p-6 text-white shadow-lg shadow-purple-600/20">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-pink-300/25 blur-2xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest backdrop-blur">
              <Sparkles className="h-3 w-3" />
              {t('results.badge')}
            </span>
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              {t('results.title')}
            </h2>
            <p className="max-w-md text-sm text-white/80">{t('results.reportSubtitle')}</p>
          </div>

          {/* Confidence ring */}
          <div className="flex items-center gap-4">
            <div className="relative h-24 w-24 shrink-0">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="rgba(255,255,255,0.25)"
                  strokeWidth="10"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="white"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${(analysis.confidence / 100) * 2 * Math.PI * 42} ${
                    2 * Math.PI * 42
                  }`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-extrabold leading-none">{analysis.confidence}%</span>
                <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-white/75">
                  {t('results.confidence')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key metric tiles */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-400/40 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </p>
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1',
                  stat.chip,
                )}
              >
                <stat.Icon className="h-4 w-4" />
              </span>
            </div>

            <p className={cn('mt-3 text-3xl font-extrabold tracking-tight', stat.accent)}>
              {stat.value}
            </p>

            {stat.progress !== undefined && (
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 transition-all duration-700"
                  style={{ width: `${stat.progress}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Diagnostic image | capture guidelines */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="relative aspect-[4/3] max-h-[460px] w-full overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950/70 shadow-lg">
            <img
              src={getImageUrl(analysis.facialScanUrl)}
              alt={t('results.scanImage')}
              className="absolute inset-0 h-full w-full object-contain"
            />

            {/* Status chips */}
            <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-500/95 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm">
                {t('results.processed')}
              </span>
              <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-foreground shadow-sm dark:bg-black/70 dark:text-white">
                {formatShortDate(analysis.analysisDate)}
              </span>
            </div>

            {/* Caption */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-4 pt-12">
              <p className="text-base font-semibold text-white sm:text-lg">{t('results.analysisComplete')}</p>
              <p className="mt-0.5 text-xs text-white/80">{t('summary.confidence', { value: analysis.confidence })}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-violet-200/70 bg-gradient-to-b from-violet-50 to-white p-5 shadow-sm dark:border-violet-900 dark:from-violet-950/40 dark:to-card">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white shadow-md shadow-violet-600/30">
              <Info className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-bold text-foreground">{t('guidelines.title')}</h3>
          </div>

          <ul className="mt-4 space-y-3">
            {GUIDELINE_KEYS.map((key) => (
              <li
                key={key}
                className="flex items-start gap-2.5 rounded-2xl bg-background/70 p-3 text-sm text-muted-foreground ring-1 ring-border/60"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>

          <p className="mt-4 rounded-2xl bg-violet-600/10 p-3 text-xs font-medium leading-relaxed text-violet-700 dark:text-violet-300">
            {t('guidelines.consentDesc')}
          </p>
        </div>
      </div>

      {/* Conditions | daily routine */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ConditionSeveritySection conditions={analysis.conditions} />
        <DailyRoutineSection />
      </div>

      {/* Recommendations */}
      <div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2.5 text-lg font-semibold text-foreground">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600 ring-1 ring-violet-100 dark:bg-violet-950/60 dark:text-violet-400 dark:ring-violet-900">
              <Sparkles className="h-4 w-4" />
            </span>
            {t('results.recommendations')}
          </h3>
          <Link
            to="/buyer/recommendations"
            className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-300 dark:hover:bg-violet-950"
          >
            {t('results.viewMore')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {analysis.recommendations.slice(0, 3).map((recommendation, index) => (
            <ProductRecommendationCard
              key={recommendation.recommendationId}
              recommendation={recommendation}
              index={index}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
