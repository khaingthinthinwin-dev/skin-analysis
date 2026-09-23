import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCategoryTree } from '@/features/search/hooks/useCategoryTree'
import type { MatchQueryParams } from '@/schemas/matching.schema'
import type { CategoryNode } from '@/types/search.types'

interface MatchingFilterChipsProps {
  filters: MatchQueryParams
  onRemove: (key: string, value?: string) => void
  onClearAll?: () => void
}

function findCategoryName(categories: CategoryNode[], id: string): string | null {
  for (const cat of categories) {
    if (cat.id === id) return cat.name
    const child = findCategoryName(cat.children ?? [], id)
    if (child) return child
  }
  return null
}

export function MatchingFilterChips({ filters, onRemove, onClearAll }: MatchingFilterChipsProps) {
  const { data: categoryData } = useCategoryTree()
  const categories = categoryData?.data ?? []
  const categoryName = filters.categoryId
    ? findCategoryName(categories, filters.categoryId)
    : null

  const chips: Array<{ key: string; label: string; value?: string }> = []

  if (filters.categoryId) {
    chips.push({ key: 'categoryId', label: categoryName ?? 'Category' })
  }

  if (filters.skinTypes) {
    const types = filters.skinTypes.split(',').filter(Boolean).filter((t) => t !== 'all')
    types.forEach((st) => {
      chips.push({ key: 'skinTypes', label: st.charAt(0).toUpperCase() + st.slice(1), value: st })
    })
  }

  if (filters.minPrice !== undefined) chips.push({ key: 'minPrice', label: `Min: ${Number(filters.minPrice).toLocaleString()}Ks` })
  if (filters.maxPrice !== undefined) chips.push({ key: 'maxPrice', label: `Max: ${Number(filters.maxPrice).toLocaleString()}Ks` })
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
