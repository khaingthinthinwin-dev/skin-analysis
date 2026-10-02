import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ListChecks, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

const MORNING_STEPS = ['cleanser', 'serum', 'moisturizer', 'sunscreen'] as const
const EVENING_STEPS = ['doubleCleanse', 'exfoliate', 'treatment', 'nightCream'] as const

type RoutinePeriod = 'morning' | 'evening'
type StepKey = (typeof MORNING_STEPS)[number] | (typeof EVENING_STEPS)[number]

const PERIOD_STYLES: Record<RoutinePeriod, { icon: LucideIcon; chip: string }> = {
  morning: {
    icon: Sun,
    chip: 'bg-amber-500/10 text-amber-600 ring-amber-500/25 dark:text-amber-300',
  },
  evening: {
    icon: Moon,
    chip: 'bg-indigo-500/10 text-indigo-600 ring-indigo-500/25 dark:text-indigo-300',
  },
}

export function DailyRoutineSection() {
  const { t } = useTranslation('skin')

  const renderPeriod = (period: RoutinePeriod, stepKeys: readonly StepKey[]) => {
    const { icon: Icon, chip } = PERIOD_STYLES[period]

    return (
      <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset',
              chip,
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-foreground">{t(`routine.${period}.label`)}</h4>
            <p className="text-xs text-muted-foreground">{t(`routine.${period}.desc`)}</p>
          </div>
        </div>

        <ol className="mt-4 space-y-3">
          {stepKeys.map((key, index) => (
            <li key={key} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-pink-500 text-[10px] font-bold text-white">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight text-foreground">
                  {t(`routine.${period}.steps.${key}.name`)}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {t(`routine.${period}.steps.${key}.desc`)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    )
  }

  return (
    <Card className="rounded-2xl border-border/60 shadow-sm">
      <CardContent className="space-y-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2.5 text-lg font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600 ring-1 ring-violet-100 dark:bg-violet-950/60 dark:text-violet-400 dark:ring-violet-900">
              <ListChecks className="h-4 w-4" />
            </span>
            {t('routine.title')}
          </h3>
          <Badge
            variant="secondary"
            className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-600 ring-1 ring-violet-500/20 dark:text-violet-300"
          >
            {t('routine.badge')}
          </Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {renderPeriod('morning', MORNING_STEPS)}
          {renderPeriod('evening', EVENING_STEPS)}
        </div>

        <p className="rounded-2xl bg-violet-600/10 p-3 text-xs font-medium leading-relaxed text-violet-700 dark:text-violet-300">
          {t('routine.tip')}
        </p>
      </CardContent>
    </Card>
  )
}
