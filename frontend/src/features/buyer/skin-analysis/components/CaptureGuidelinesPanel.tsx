import { useTranslation } from 'react-i18next'
import { ScanFace, Sun, Moon, Glasses, Zap, ShieldCheck } from 'lucide-react'

interface CaptureGuidelinesPanelProps {
  open?: boolean
  onToggle?: () => void
}

const GUIDELINES = [
  {
    icon: Sun,
    title: 'guidelines.lighting',
    desc: 'guidelines.lightingDesc',
  },
  {
    icon: Moon,
    title: 'guidelines.background',
    desc: 'guidelines.backgroundDesc',
  },
  {
    icon: Glasses,
    title: 'guidelines.noGlasses',
    desc: 'guidelines.noGlassesDesc',
  },
  {
    icon: ScanFace,
    title: 'guidelines.expression',
    desc: 'guidelines.expressionDesc',
  },
  {
    icon: Zap,
    title: 'guidelines.distance',
    desc: 'guidelines.distanceDesc',
  },
  {
    icon: ShieldCheck,
    title: 'guidelines.consent',
    desc: 'guidelines.consentDesc',
  },
]

export function CaptureGuidelinesPanel({ open = false, onToggle }: CaptureGuidelinesPanelProps) {
  const { t } = useTranslation('skin')

  return (
    <details className="group" open={open}>
      <summary className="flex cursor-pointer items-center justify-between rounded-xl border border-border/60 bg-muted/40 px-3 py-2.5 text-sm">
        <span className="font-medium flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          {t('guidelines.title')}
        </span>
        {onToggle && (
          <button
            onClick={onToggle}
            className="p-1 rounded-full hover:bg-muted transition-colors"
            aria-label="Toggle guidelines"
          >
            <span className="transition-transform group-open:rotate-90">▸</span>
          </button>
        )}
      </summary>
      <div className="mt-3 space-y-3">
        {GUIDELINES.map((item, index) => (
          <div key={index} className="flex items-start gap-3 rounded-lg border border-border/60 bg-background px-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 ring-1 ring-violet-100 dark:bg-violet-950/60 dark:text-violet-400 dark:ring-violet-900">
              <item.icon className="h-4 w-4" />
            </div>
            <div>
              <h4 className="font-medium">{t(item.title)}</h4>
              <p className="mt-0.5 text-xs text-muted-foreground">{t(item.desc)}</p>
            </div>
          </div>
        ))}
      </div>
    </details>
  )
}