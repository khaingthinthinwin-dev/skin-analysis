import { X } from 'lucide-react'
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

  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    const min = params.minPrice !== undefined ? `$${params.minPrice}` : '0'
    const max = params.maxPrice !== undefined ? `$${params.maxPrice}` : '∞'
    chips.push({ key: 'priceRange', label: `${min} - ${max}` })
  }
  if (params.rating !== undefined) chips.push({ key: 'rating', label: `${params.rating}+ Stars` })

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip, idx) => (
        <span
          key={`${chip.key}-${chip.value ?? idx}`}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-100 dark:text-gray-800"
        >
          {chip.label}
          <button
            type="button"
            aria-label={`Remove ${chip.label}`}
            onClick={() => onRemove(chip.key, chip.value)}
            className="ml-0.5 rounded-full p-0.5 hover:bg-gray-100 dark:hover:bg-gray-200"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      {onClearAll && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ml-1 h-6 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
          onClick={onClearAll}
        >
          Reset all
        </Button>
      )}
    </div>
  )
}
