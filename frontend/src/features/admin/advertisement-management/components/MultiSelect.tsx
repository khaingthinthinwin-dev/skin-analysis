import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export interface MultiSelectOption {
  value: string
  label: string
}

interface MultiSelectProps {
  label: string
  options: MultiSelectOption[]
  value: string[]
  onChange: (next: string[]) => void
}

export function MultiSelect({ label, options, value, onChange }: MultiSelectProps) {
  const [open, setOpen] = useState(false)

  const toggle = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue))
    } else {
      onChange([...value, optionValue])
    }
  }

  const summary =
    value.length === 0
      ? `Select ${label.toLowerCase()}`
      : value.length === options.length
        ? `All ${label.toLowerCase()}`
        : `${value.length} selected`

  return (
    <div className="relative w-full min-w-0 sm:w-52">
      <Button
        type="button"
        variant="outline"
        className="h-9 w-full justify-between font-normal sm:w-52 shadow-2xs text-sm rounded-lg px-3 bg-background border-input"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{summary}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground/80 shrink-0 transition-transform duration-200',
            open && 'rotate-180 text-foreground',
          )}
        />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            role="listbox"
            aria-multiselectable="true"
            aria-label={label}
            className="absolute left-0 top-full z-50 mt-1.5 max-h-64 w-full min-w-[13rem] overflow-auto rounded-xl border border-border bg-popover text-popover-foreground shadow-xl p-1.5 backdrop-blur-md"
          >
            {value.length > 0 && (
              <button
                type="button"
                className="mb-1 w-full rounded-lg border-b border-border/40 px-3 py-1.5 text-left text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                onClick={() => onChange([])}
              >
                Clear selection
              </button>
            )}
            <div className="space-y-0.5">
              {options.map((option) => {
                const selected = value.includes(option.value)
                return (
                  <label
                    key={option.value}
                    className={cn(
                      'flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
                      selected && 'bg-accent/70 font-medium text-accent-foreground',
                    )}
                  >
                    <span
                      className={cn(selected && 'font-medium')}
                      role="option"
                      aria-selected={selected}
                    >
                      {option.label}
                    </span>
                    {selected && <Check className="h-4 w-4 text-primary shrink-0" />}
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={selected}
                      onChange={() => toggle(option.value)}
                      aria-label={option.label}
                    />
                  </label>
                )
              })}
            </div>
            {options.length === 0 && (
              <p className="px-3 py-2 text-sm text-muted-foreground">No options</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}