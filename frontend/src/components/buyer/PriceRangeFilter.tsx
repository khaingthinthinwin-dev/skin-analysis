import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { validatePriceRange } from '@/lib/priceRangeValidation'

interface PriceRangeFilterProps {
  minPrice?: number
  maxPrice?: number
  onChange: (min: number | undefined, max: number | undefined, hasError: boolean) => void
}

export function PriceRangeFilter({ minPrice, maxPrice, onChange }: PriceRangeFilterProps) {
  const [minDraft, setMinDraft] = useState(minPrice?.toString() ?? '')
  const [maxDraft, setMaxDraft] = useState(maxPrice?.toString() ?? '')
  const [error, setError] = useState<string | null>(null)

  const commit = () => {
    const validationError = validatePriceRange(minDraft, maxDraft)
    if (validationError) {
      setError(validationError)
      onChange(
        minDraft.trim() ? Number(minDraft) : undefined,
        maxDraft.trim() ? Number(maxDraft) : undefined,
        true,
      )
      return
    }
    setError(null)
    onChange(
      minDraft.trim() ? Number(minDraft) : undefined,
      maxDraft.trim() ? Number(maxDraft) : undefined,
      false,
    )
  }

  const errorId = 'price-range-filter-error'

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          type="number"
          placeholder="Min"
          value={minDraft}
          onChange={(e) => setMinDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur()
            }
          }}
          className="h-10 flex-1 text-sm"
          min={0}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? errorId : undefined}
        />
        <span className="text-slate-400">-</span>
        <Input
          type="number"
          placeholder="Max"
          value={maxDraft}
          onChange={(e) => setMaxDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur()
            }
          }}
          className="h-10 flex-1 text-sm"
          min={0}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? errorId : undefined}
        />
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-red-600 text-xs">
          {error}
        </p>
      )}
    </div>
  )
}
