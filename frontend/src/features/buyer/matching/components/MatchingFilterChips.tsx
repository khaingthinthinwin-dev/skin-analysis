import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { MatchQueryParams } from '@/schemas/matching.schema'

interface MatchingFilterChipsProps {
  filters: MatchQueryParams
  onRemove: (key: string, value?: string) => void
  onClearAll?: () => void
}

export function MatchingFilterChips({ filters, onRemove, onClearAll }: MatchingFilterChipsProps) {
  const chips: Array<{ key: string; label: string; value?: string }> = []

  if (filters.categoryId) chips.push({ key: 'categoryId', label: 'Category' })

  if (filters.skinTypes) {
    const types = filters.skinTypes.split(',').filter(Boolean).filter((t) => t !== 'all')
    types.forEach((st) => {
      chips.push({ key: 'skinTypes', label: st.charAt(0).toUpperCase() + st.slice(1), value: st })
    })
  }

  if (filters.minPrice !== undefined) chips.push({ key: 'minPrice', label: `Min: Ks ${Number(filters.minPrice).toLocaleString()}` })
  if (filters.maxPrice !== undefined) chips.push({ key: 'maxPrice', label: `Max: Ks ${Number(filters.maxPrice).toLocaleString()}` })
  if (filters.rating !== undefined) chips.push({ key: 'rating', label: `${filters.rating}+ Stars` })

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip, idx) => (
        <Badge key={`${chip.key}-${chip.value ?? idx}`} variant="secondary" className="gap-1 pr-1">
          {chip.label}
          <button
            type="button"
            aria-label={`Remove ${chip.label}`}
            onClick={() => onRemove(chip.key, chip.value)}
            className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      {onClearAll && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ml-1 h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={onClearAll}
        >
          Clear All
        </Button>
      )}
    </div>
  )
}
