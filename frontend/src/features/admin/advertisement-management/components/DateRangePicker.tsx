import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export interface DateRange {
  from?: string
  to?: string
}

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
  fromLabel?: string
  toLabel?: string
}

export function DateRangePicker({
  value,
  onChange,
  fromLabel = 'From',
  toLabel = 'To',
}: DateRangePickerProps) {
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
    <div className="flex items-center gap-2">
      <label className="text-sm text-muted-foreground">{fromLabel}</label>
      <Input
        type="date"
        value={value.from ?? ''}
        onChange={(e) => handleFrom(e.target.value)}
        className="h-9 w-44"
        aria-label={fromLabel}
      />
      <label className="text-sm text-muted-foreground">{toLabel}</label>
      <Input
        type="date"
        min={value.from}
        value={value.to ?? ''}
        onChange={(e) => handleTo(e.target.value)}
        className="h-9 w-44"
        aria-label={toLabel}
      />
      {(value.from || value.to) && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange({})}
          aria-label="Clear date range"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}