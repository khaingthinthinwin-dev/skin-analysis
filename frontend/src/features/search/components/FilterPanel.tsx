import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { CategorySelect } from './CategorySelect'
import type { CategoryNode } from '@/types/search.types'
import type { SearchParams } from '@/schemas/search.schema'

const SKIN_TYPES = [
  { value: 'dry' as const, label: 'Dry' },
  { value: 'oily' as const, label: 'Oily' },
  { value: 'combination' as const, label: 'Combination' },
  { value: 'sensitive' as const, label: 'Sensitive' },
  { value: 'normal' as const, label: 'Normal' },
]

const RATING_OPTIONS = [
  { value: 4.5, label: '4.5+ Stars' },
  { value: 4.0, label: '4.0+ Stars' },
  { value: 3.5, label: '3.5+ Stars' },
  { value: 3.0, label: '3.0+ Stars' },
]

interface FilterPanelProps {
  params: SearchParams
  onUpdate: (updates: Partial<SearchParams>) => void
  categories: CategoryNode[]
  onReset?: () => void
}

export function FilterPanel({ params, onUpdate, categories, onReset }: FilterPanelProps) {
  const [priceMinDraft, setPriceMinDraft] = useState(params.minPrice?.toString() ?? '')
  const [priceMaxDraft, setPriceMaxDraft] = useState(params.maxPrice?.toString() ?? '')
  const [focusedPriceField, setFocusedPriceField] = useState<'min' | 'max' | null>(null)

  const hasActiveFilters =
    params.categoryId !== '' ||
    params.skinTypes.length > 0 ||
    params.tags.length > 0 ||
    params.minPrice !== undefined ||
    params.maxPrice !== undefined ||
    params.rating !== undefined

  const priceMin = focusedPriceField === 'min' ? priceMinDraft : (params.minPrice?.toString() ?? '')
  const priceMax = focusedPriceField === 'max' ? priceMaxDraft : (params.maxPrice?.toString() ?? '')

  const commitPrice = () => {
    onUpdate({
      minPrice: priceMin ? Number(priceMin) : undefined,
      maxPrice: priceMax ? Number(priceMax) : undefined,
    })
    setFocusedPriceField(null)
  }

  const handleSkinTypeToggle = (type: 'dry' | 'oily' | 'combination' | 'sensitive' | 'normal') => {
    const current = params.skinTypes
    const next = current.includes(type) ? current.filter((t) => t !== type) : [...current, type]
    onUpdate({ skinTypes: next as SearchParams['skinTypes'] })
  }

  const handleRatingChange = (rating: number) => {
    onUpdate({ rating: params.rating === rating ? undefined : rating })
  }

  const handleReset = () => {
    setPriceMinDraft('')
    setPriceMaxDraft('')
    setFocusedPriceField(null)
    onReset?.()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <SlidersHorizontal className="h-4 w-4" />
        Filters
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Category</h4>
          <CategorySelect
            categories={categories}
            selectedCategoryId={params.categoryId}
            onSelect={(id) => onUpdate({ categoryId: id })}
          />
        </div>

        <Separator />

        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Skin Type</h4>
          <div className="space-y-1.5">
            {SKIN_TYPES.map((st) => (
              <div key={st.value} className="flex items-center gap-2">
                <Checkbox
                  checked={params.skinTypes.includes(st.value)}
                  onCheckedChange={() => handleSkinTypeToggle(st.value)}
                />
                <span className="text-sm">{st.label}</span>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Price Range</h4>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={priceMin}
              onChange={(e) => {
                setFocusedPriceField('min')
                setPriceMinDraft(e.target.value)
              }}
              onBlur={commitPrice}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
              className="h-8 text-xs"
              min={0}
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="number"
              placeholder="Max"
              value={priceMax}
              onChange={(e) => {
                setFocusedPriceField('max')
                setPriceMaxDraft(e.target.value)
              }}
              onBlur={commitPrice}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
              className="h-8 text-xs"
              min={0}
            />
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Rating</h4>
          <div className="space-y-1.5">
            {RATING_OPTIONS.map((r) => (
              <div key={r.value} className="flex items-center gap-2">
                <Checkbox
                  checked={params.rating === r.value}
                  onCheckedChange={() => handleRatingChange(r.value)}
                />
                <span className="text-sm">{r.label}</span>
              </div>
            ))}
          </div>
        </div>

        {hasActiveFilters && onReset && (
          <>
            <Separator />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleReset}
            >
              Reset Filters
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
