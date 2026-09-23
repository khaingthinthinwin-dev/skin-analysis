import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { RotateCcw, SlidersHorizontal } from 'lucide-react'
import { CategorySelect } from '@/features/search/components/CategorySelect'
import { useCategoryTree } from '@/features/search/hooks/useCategoryTree'
import type { MatchQueryParams } from '@/schemas/matching.schema'
import { SKIN_TYPES } from '@/constants/matchingConstants'

const RATING_OPTIONS = [
  { value: 4.5, label: '4.5+ Stars' },
  { value: 4.0, label: '4.0+ Stars' },
  { value: 3.5, label: '3.5+ Stars' },
  { value: 3.0, label: '3.0+ Stars' },
]

interface FiltersPanelProps {
  filters: MatchQueryParams
  onUpdate: (updates: Partial<MatchQueryParams>) => void
  onReset: () => void
}

export function FiltersPanel({ filters, onUpdate, onReset }: FiltersPanelProps) {
  const [priceMinDraft, setPriceMinDraft] = useState(filters.minPrice?.toString() ?? '')
  const [priceMaxDraft, setPriceMaxDraft] = useState(filters.maxPrice?.toString() ?? '')
  const [focusedPriceField, setFocusedPriceField] = useState<'min' | 'max' | null>(null)
  const { data: categoryData } = useCategoryTree()
  const categories = categoryData?.data ?? []

  const selectedSkinTypes = filters.skinTypes
    ? filters.skinTypes.split(',').filter(Boolean).filter((t) => t !== 'all')
    : []

  const hasActiveFilters = Boolean(
    filters.categoryId ||
      selectedSkinTypes.length > 0 ||
      filters.minPrice !== undefined ||
      filters.maxPrice !== undefined ||
      filters.rating !== undefined,
  )

  const priceMin = focusedPriceField === 'min' ? priceMinDraft : (filters.minPrice?.toString() ?? '')
  const priceMax = focusedPriceField === 'max' ? priceMaxDraft : (filters.maxPrice?.toString() ?? '')

  const toggleSkinType = (value: string) => {
    const updated = selectedSkinTypes.includes(value)
      ? selectedSkinTypes.filter((type) => type !== value)
      : [...selectedSkinTypes, value]
    onUpdate({ skinTypes: updated.length > 0 ? updated.join(',') : 'all' })
  }

  const toggleRating = (rating: number) => {
    onUpdate({ rating: filters.rating === rating ? undefined : rating })
  }

  const commitPrice = () => {
    onUpdate({
      minPrice: priceMin ? Number(priceMin) : undefined,
      maxPrice: priceMax ? Number(priceMax) : undefined,
    })
    setFocusedPriceField(null)
  }

  const handleReset = () => {
    setPriceMinDraft('')
    setPriceMaxDraft('')
    setFocusedPriceField(null)
    onReset()
  }

  return (
    <Card className="overflow-hidden border-border/80 shadow-xs">
      <div className="flex w-full items-center gap-2 p-4">
        <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-bold text-foreground">Filters</h3>
        {hasActiveFilters && <span className="h-2 w-2 rounded-full bg-primary" />}
      </div>

      <div className="space-y-4 border-t border-border/50 px-4 pb-4 pt-4">
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</h4>
          <CategorySelect
            categories={categories}
            selectedCategoryId={filters.categoryId ?? ''}
            onSelect={(categoryId) => onUpdate({ categoryId: categoryId || undefined })}
          />
        </div>

        <Separator />

        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Skin Type</h4>
          <div className="space-y-2">
            {SKIN_TYPES.map((type) => (
              <label key={type.value} className="flex cursor-pointer items-center gap-2.5">
                <Checkbox
                  checked={selectedSkinTypes.includes(type.value)}
                  onCheckedChange={() => toggleSkinType(type.value)}
                />
                <span className="text-sm text-foreground">{type.label}</span>
              </label>
            ))}
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Price Range</h4>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              placeholder="Min"
              value={priceMin}
              onChange={(e) => {
                setFocusedPriceField('min')
                setPriceMinDraft(e.target.value)
              }}
              onBlur={commitPrice}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
              className="h-8 text-xs"
            />
            <span className="text-sm text-muted-foreground">-</span>
            <Input
              type="number"
              min={0}
              placeholder="Max"
              value={priceMax}
              onChange={(e) => {
                setFocusedPriceField('max')
                setPriceMaxDraft(e.target.value)
              }}
              onBlur={commitPrice}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
              className="h-8 text-xs"
            />
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rating</h4>
          <div className="space-y-1.5">
            {RATING_OPTIONS.map((rating) => (
              <label key={rating.value} className="flex cursor-pointer items-center gap-2">
                <Checkbox
                  checked={filters.rating === rating.value}
                  onCheckedChange={() => toggleRating(rating.value)}
                />
                <span className="text-sm text-foreground">{rating.label}</span>
              </label>
            ))}
          </div>
        </div>

        {hasActiveFilters && (
          <>
            <Separator />
            <button
              type="button"
              onClick={handleReset}
              className="flex w-full items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Filters
            </button>
          </>
        )}
      </div>
    </Card>
  )
}