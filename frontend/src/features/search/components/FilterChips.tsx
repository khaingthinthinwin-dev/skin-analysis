import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { SearchParams } from '@/schemas/search.schema'

interface FilterChipsProps {
  params: SearchParams
  onRemove: (key: string, value?: string) => void
  onClearAll?: () => void
  categoryName?: string | null
}

export function FilterChips({ params, onRemove, onClearAll, categoryName }: FilterChipsProps) {
  const chips: Array<{ key: string; label: string; value?: string }> = []

  if (params.q) chips.push({ key: 'q', label: `"${params.q}"` })

  if (params.categoryId) chips.push({ key: 'categoryId', label: categoryName ?? 'Category' })

  params.skinTypes.forEach((st) => {
    chips.push({ key: 'skinTypes', label: st.charAt(0).toUpperCase() + st.slice(1), value: st })
  })

  params.ingredients.forEach((ing) => {
    chips.push({ key: 'ingredients', label: ing, value: ing })
  })

  params.tags.forEach((tag) => {
    chips.push({ key: 'tags', label: tag, value: tag })
  })

  if (params.minPrice !== undefined)
    chips.push({ key: 'minPrice', label: `Min: Ks ${Number(params.minPrice).toLocaleString('en-US')}` })
  if (params.maxPrice !== undefined)
    chips.push({ key: 'maxPrice', label: `Max: Ks ${Number(params.maxPrice).toLocaleString('en-US')}` })
  if (params.rating !== undefined) chips.push({ key: 'rating', label: `${params.rating}+ Stars` })

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip, idx) => (
        <Badge key={`${chip.key}-${chip.value ?? idx}`} variant="secondary" className="gap-1 border border-purple-200 bg-purple-50 pr-1 text-purple-700 dark:border-purple-500/20 dark:bg-purple-500/10 dark:text-purple-200">
          {chip.label}
          <button
            type="button"
            aria-label={`Remove ${chip.label}`}
            onClick={() => onRemove(chip.key, chip.value)}
            className="ml-0.5 rounded-full p-0.5 hover:bg-purple-100 dark:hover:bg-purple-500/20"
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
