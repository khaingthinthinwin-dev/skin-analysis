import { useTranslation } from 'react-i18next'
import { Activity } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { CompactConditionBadge } from './ConditionSeverityBadge'
import { CONDITION_LABELS } from '../types/skin-analysis.types'
import { cn } from '@/lib/utils'
import type { ConditionDto, ConditionName, ConditionSeverity } from '../types/skin-analysis.types'

interface ConditionSeveritySectionProps {
  conditions: ConditionDto[]
  compact?: boolean
}

const ORDERED_CONDITIONS: ConditionName[] = [
  'acne',
  'redness',
  'texture',
  'pigmentation',
  'dryness',
  'pore_size',
]

type SeverityTag = 'low' | 'moderate' | 'high'

const TAG_FOR_SEVERITY: Record<ConditionSeverity, SeverityTag> = {
  NONE: 'low',
  MILD: 'low',
  MODERATE: 'moderate',
  SEVERE: 'high',
}

const TAG_TEXT: Record<SeverityTag, string> = {
  low: 'text-emerald-600 dark:text-emerald-400',
  moderate: 'text-amber-600 dark:text-amber-400',
  high: 'text-red-600 dark:text-red-400',
}

const TAG_BADGE: Record<SeverityTag, string> = {
  low: 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/30 dark:text-emerald-400',
  moderate: 'bg-amber-500/10 text-amber-600 ring-amber-500/30 dark:text-amber-400',
  high: 'bg-red-500/10 text-red-600 ring-red-500/30 dark:text-red-400',
}

const BAR_CLASSES: Record<SeverityTag, string> = {
  low: 'bg-emerald-500',
  moderate: 'bg-amber-500',
  high: 'bg-red-500',
}

const DOT_CLASSES: Record<SeverityTag, string> = {
  low: 'bg-emerald-500',
  moderate: 'bg-amber-500',
  high: 'bg-red-500',
}

export function ConditionSeveritySection({
  conditions,
  compact = false,
}: ConditionSeveritySectionProps) {
  const { t } = useTranslation('skin')

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {ORDERED_CONDITIONS.map((name) => {
          const condition = conditions.find((c) => c.conditionName === name)
          return (
            <CompactConditionBadge
              key={name}
              conditionName={name}
              severity={condition?.severity ?? 'NONE'}
            />
          )
        })}
      </div>
    )
  }

  return (
    <Card className="rounded-2xl border-border/60 shadow-sm">
      <CardContent className="space-y-5 p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2.5 text-lg font-semibold text-foreground">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600 ring-1 ring-violet-100 dark:bg-violet-950/60 dark:text-violet-400 dark:ring-violet-900">
              <Activity className="h-4 w-4" />
            </span>
            {t('conditions.title')}
          </h3>
          <span className="hidden rounded-full bg-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:inline">
            {t('results.keyMetrics')}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {ORDERED_CONDITIONS.map((name) => {
            const condition = conditions.find((c) => c.conditionName === name)
            const severity = condition?.severity ?? 'NONE'
            const score = condition?.severityScore ?? 0
            const tag = TAG_FOR_SEVERITY[severity]

            return (
              <div
                key={name}
                className="rounded-2xl border border-border/60 bg-background/70 p-4 transition-colors hover:border-violet-400/40"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span
                      className={cn('h-2 w-2 shrink-0 rounded-full', DOT_CLASSES[tag])}
                      aria-hidden="true"
                    />
                    {CONDITION_LABELS[name]}
                  </span>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wider ring-1 ring-inset',
                      TAG_BADGE[tag],
                    )}
                  >
                    {t(`severityTag.${tag}`)}
                  </span>
                </div>

                <div
                  className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={score}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={CONDITION_LABELS[name]}
                >
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      BAR_CLASSES[tag],
                    )}
                    style={{ width: `${score}%` }}
                  />
                </div>

                <div className="mt-2 flex items-start justify-between gap-3">
                  {condition ? (
                    <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {condition.description}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">{t('conditions.none')}</p>
                  )}
                  <span className={cn('shrink-0 text-xs font-bold', TAG_TEXT[tag])}>
                    {score}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
