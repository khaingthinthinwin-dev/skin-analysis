import { useState } from 'react'
import { Check } from 'lucide-react'
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
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        className="h-9 w-52 justify-between font-normal"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{summary}</span>
        <span className="text-muted-foreground">{'\u25be'}</span>
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            role="listbox"
            aria-multiselectable="true"
            aria-label={label}
            className="absolute left-0 top-full z-40 mt-1 max-h-60 w-52 overflow-auto rounded-md border bg-background shadow-md"
          >
            {value.length > 0 && (
              <button
                type="button"
                className="w-full border-b px-3 py-1.5 text-left text-xs font-medium text-primary hover:bg-secondary"
                onClick={() => onChange([])}
              >
                Clear selection
              </button>
            )}
            {options.map((option) => {
              const selected = value.includes(option.value)
              return (
                <label
                  key={option.value}
                  className={cn(
                    'flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-secondary',
                    selected && 'bg-secondary/70',
                  )}
                >
                  <span
                    className={cn(selected && 'font-medium')}
                    role="option"
                    aria-selected={selected}
                  >
                    {option.label}
                  </span>
                  {selected && <Check className="h-4 w-4 text-primary" />}
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
            {options.length === 0 && (
              <p className="px-3 py-2 text-sm text-muted-foreground">No options</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}