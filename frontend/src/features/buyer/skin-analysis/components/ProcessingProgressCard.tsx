import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ProcessingProgressCardProps {
  status: 'UPLOADING' | 'VALIDATING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  estimatedWaitSeconds?: number
  onCancel?: () => void
}

const STATUS_STEPS: Array<{ key: 'UPLOADING' | 'VALIDATING' | 'PROCESSING' | 'COMPLETED'; label: string }> = [
  { key: 'UPLOADING', label: 'uploading' },
  { key: 'VALIDATING', label: 'validating' },
  { key: 'PROCESSING', label: 'processing' },
  { key: 'COMPLETED', label: 'completed' },
]

const getStepIndex = (status: string) => {
  const idx = STATUS_STEPS.findIndex((s) => s.key === status)
  return idx >= 0 ? idx : 0
}

export function ProcessingProgressCard({ status, estimatedWaitSeconds, onCancel }: ProcessingProgressCardProps) {
  const { t } = useTranslation('skin')
  const stepIndex = getStepIndex(status)
  const progress = ((stepIndex + 1) / STATUS_STEPS.length) * 100

  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setElapsed((prev) => prev + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  const timeLeft = Math.max(0, (estimatedWaitSeconds ?? 15) - elapsed)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  if (status === 'CANCELLED') {
    return (
      <Card className="rounded-2xl border-border/60 shadow-sm">
        <CardContent className="py-8 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold">{t('processing.cancelled')}</h3>
          <p className="text-sm text-muted-foreground mt-2">{t('processing.cancelledDesc')}</p>
        </CardContent>
      </Card>
    )
  }

  if (status === 'FAILED') {
    return (
      <Card className="border-destructive/50 shadow-xs">
        <CardContent className="py-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-destructive">{t('processing.failed')}</h3>
          <p className="text-sm text-muted-foreground mt-2">{t('processing.failedDesc')}</p>
          {onCancel && (
            <Button variant="outline" onClick={onCancel} className="mt-4">
              {t('processing.tryAgain')}
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-2xl border-border/60 shadow-sm">
      <CardContent className="space-y-4 p-6">
        {/* Step indicator */}
        <div className="flex items-center justify-between">
          {STATUS_STEPS.map((step, idx) => (
            <div key={step.key} className="flex flex-col items-center flex-1">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all',
                  idx < stepIndex
                    ? 'bg-emerald-500 text-white'
                    : idx === stepIndex
                    ? 'bg-violet-500 text-white animate-pulse'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {idx < stepIndex ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  idx + 1
                )}
              </div>
              <span className={cn('mt-2 text-xs text-center', idx <= stepIndex ? 'font-medium' : 'text-muted-foreground')}>
                {t(`processing.steps.${step.label}`)}
              </span>
              {idx < STATUS_STEPS.length - 1 && (
                <div
                  className={cn(
                    'absolute top-5 left-1/2 w-full h-1',
                    idx < stepIndex ? 'bg-emerald-500' : 'bg-muted',
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-violet-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Time estimate */}
        {status !== 'COMPLETED' && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{t('processing.estimatedTime', { time: formatTime(timeLeft) })}</span>
            {onCancel && (
              <Button variant="ghost" size="sm" onClick={onCancel}>
                {t('processing.cancel')}
              </Button>
            )}
          </div>
        )}

        {status === 'COMPLETED' && (
          <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
            <span className="font-semibold">{t('processing.completed')}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}