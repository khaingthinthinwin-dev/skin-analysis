import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTranslation } from 'react-i18next'

export interface DateRange {
  from?: string
  to?: string
}

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
  fromLabel?: string
  toLabel?: string
  /** Hide the visible From/To labels (still exposed via aria-label). */
  hideLabels?: boolean
}

export function DateRangePicker({
  value,
  onChange,
  fromLabel,
  toLabel,
  hideLabels = false,
}: DateRangePickerProps) {
  const { t } = useTranslation()
  const resolvedFromLabel = fromLabel ?? t('admin.ads.dateRange.from', 'From')
  const resolvedToLabel = toLabel ?? t('admin.ads.dateRange.to', 'To')
  const handleFrom = (v: string) => {
    if (value.to && v && v > value.to) {
      onChange({ from: v, to: v })
    } else {
      onChange({ from: v || undefined, to: value.to })
    }
  }

  const handleTo = (v: string) => {
    if (value.from && v && v < value.from) {
      onChange({ from: v, to: v })
    } else {
      onChange({ from: value.from, to: v || undefined })
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center">
      <div className="flex min-w-0 items-center gap-2">
        <label className={hideLabels ? 'sr-only' : 'shrink-0 text-sm text-muted-foreground'}>{resolvedFromLabel}</label>
        <Input
          type="date"
          value={value.from ?? ''}
          onChange={(e) => handleFrom(e.target.value)}
          className="h-9 min-w-0 flex-1 md:w-44 md:flex-none"
          aria-label={resolvedFromLabel}
        />
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <label className={hideLabels ? 'sr-only' : 'shrink-0 text-sm text-muted-foreground'}>{resolvedToLabel}</label>
        <Input
          type="date"
          min={value.from}
          value={value.to ?? ''}
          onChange={(e) => handleTo(e.target.value)}
          className="h-9 min-w-0 flex-1 md:w-44 md:flex-none"
          aria-label={resolvedToLabel}
        />
        {(value.from || value.to) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange({})}
            aria-label={t('admin.ads.dateRange.clear', 'Clear date range')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}