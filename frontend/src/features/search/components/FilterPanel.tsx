import { useState } from 'react'
import { ChevronUp, SlidersHorizontal, Star } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { CategorySelect } from './CategorySelect'
import type { CategoryNode } from '@/types/search.types'
import type { SearchParams } from '@/schemas/search.schema'

const SKIN_TYPES = [
  { value: 'dry' as const, label: 'Dry', count: 54 },
  { value: 'oily' as const, label: 'Oily', count: 42 },
  { value: 'combination' as const, label: 'Combination', count: 68 },
  { value: 'sensitive' as const, label: 'Sensitive', count: 31 },
  { value: 'normal' as const, label: 'Normal', count: 87 },
]

const RATING_OPTIONS = [
  { value: 4.5, label: '4.5 & up', count: 89 },
  { value: 4.0, label: '4.0 & up', count: 64 },
  { value: 3.5, label: '3.5 & up', count: 18 },
  { value: 3.0, label: '3.0 & up', count: 4 },
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

  const priceMin = focusedPriceField === 'min' ? priceMinDraft : (params.minPrice?.toString() ?? '')
  const priceMax = focusedPriceField === 'max' ? priceMaxDraft : (params.maxPrice?.toString() ?? '')

  const commitPrice = () => {
    onUpdate({
      minPrice: priceMin ? Number(priceMin) : undefined,
      maxPrice: priceMax ? Number(priceMax) : undefined,
    })
    setFocusedPriceField(null)
  }

  const applyPriceFilter = () => {
    commitPrice()
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
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-semibold text-foreground">
        <span className="flex items-center gap-1.5"><SlidersHorizontal className="h-3.5 w-3.5 text-purple-600" />Filters</span>
        {onReset && (
          <button
            type="button"
            onClick={handleReset}
            className="text-[9px] font-semibold uppercase tracking-wide text-purple-600 hover:text-purple-700"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <h4 className="mb-2 border-b border-gray-100 dark:border-border pb-2 text-[9px] font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-300">Category</h4>
          <CategorySelect
            categories={categories}
            selectedCategoryId={params.categoryId}
            onSelect={(id) => onUpdate({ categoryId: id })}
          />
        </div>

        <Separator className="bg-gray-100" />

        <div>
          <h4 className="mb-2 flex items-center justify-between border-b border-gray-100 dark:border-border pb-2 text-[9px] font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-300">Skin Type <ChevronUp className="h-3 w-3" /></h4>
          <div className="space-y-1.5">
            {SKIN_TYPES.map((st) => (
              <div key={st.value} className="flex items-center gap-2">
                <Checkbox
                  checked={params.skinTypes.includes(st.value)}
                  onCheckedChange={() => handleSkinTypeToggle(st.value)}
                />
                <span className="text-xs">{st.label}</span>
              </div>
            ))}
          </div>
        </div>

        <Separator className="bg-gray-100" />

        <div>
          <h4 className="mb-2 flex items-center justify-between border-b border-gray-100 dark:border-border pb-2 text-[9px] font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-300">Price Range <ChevronUp className="h-3 w-3" /></h4>
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
              className="h-8 bg-gray-50 text-[10px]"
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
              className="h-8 bg-gray-50 text-[10px]"
              min={0}
            />
          </div>
          <Button
            type="button"
            size="sm"
            onClick={applyPriceFilter}
            className="mt-3 h-7 w-full bg-purple-100 text-[9px] font-semibold uppercase tracking-wide text-purple-700 hover:bg-purple-200"
          >
            Apply Filter
          </Button>
        </div>

        <Separator className="bg-gray-100" />

        <div>
          <h4 className="mb-2 flex items-center justify-between border-b border-gray-100 dark:border-border pb-2 text-[9px] font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-300">Rating <ChevronUp className="h-3 w-3" /></h4>
          <div className="space-y-1.5">
            {RATING_OPTIONS.map((r) => (
              <div key={r.value} className="flex items-center gap-2">
                <Checkbox
                  checked={params.rating === r.value}
                  onCheckedChange={() => handleRatingChange(r.value)}
                />
                <span className="flex items-center gap-1 text-xs">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" aria-label={`${r.label} rating`} />
                  {r.label}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
