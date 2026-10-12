import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Check, RotateCcw, SlidersHorizontal, Star } from 'lucide-react'
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

const PRICE_ERROR_MIN_MAX = 'Minimum price cannot be greater than maximum price.'
const PRICE_ERROR_NEGATIVE = 'Price cannot be negative.'
const PRICE_ERROR_INVALID = 'Please enter a valid price.'

function validatePriceRange(minValue?: string, maxValue?: string): string | null {
  const parsedMin = minValue && minValue.trim() !== '' ? Number(minValue) : undefined
  const parsedMax = maxValue && maxValue.trim() !== '' ? Number(maxValue) : undefined

  for (const value of [parsedMin, parsedMax]) {
    if (value !== undefined && Number.isNaN(value)) return PRICE_ERROR_INVALID
  }
  for (const value of [parsedMin, parsedMax]) {
    if (value !== undefined && value < 0) return PRICE_ERROR_NEGATIVE
  }
  if (
    parsedMin !== undefined &&
    parsedMax !== undefined &&
    parsedMin > parsedMax
  ) {
    return PRICE_ERROR_MIN_MAX
  }
  return null
}

interface FiltersPanelProps {
  filters: MatchQueryParams
  onUpdate: (updates: Partial<MatchQueryParams>) => void
  onReset: () => void
  className?: string
  variant?: 'desktop' | 'mobile'
}

export function FiltersPanel({ filters, onUpdate, onReset, className, variant = 'desktop' }: FiltersPanelProps) {
  const [priceMinDraft, setPriceMinDraft] = useState(filters.minPrice?.toString() ?? '')
  const [priceMaxDraft, setPriceMaxDraft] = useState(filters.maxPrice?.toString() ?? '')
  const [focusedPriceField, setFocusedPriceField] = useState<'min' | 'max' | null>(null)
  const [priceError, setPriceError] = useState<string | null>(null)
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

  const priceErrorActive = Boolean(priceError)
  const priceMin = focusedPriceField === 'min' || priceErrorActive ? priceMinDraft : (filters.minPrice?.toString() ?? '')
  const priceMax = focusedPriceField === 'max' || priceErrorActive ? priceMaxDraft : (filters.maxPrice?.toString() ?? '')

  const toggleSkinType = (value: string) => {
    const updated = selectedSkinTypes.includes(value)
      ? selectedSkinTypes.filter((type) => type !== value)
      : [...selectedSkinTypes, value]
    onUpdate({ skinTypes: updated.length > 0 ? updated.join(',') : 'all' })
  }

  const commitPrice = () => {
    const validationError = validatePriceRange(priceMin, priceMax)
    setPriceError(validationError)
    // Commit even on min>max so the API returns empty results; skip on negative/NaN
    const shouldCommit = validationError === null || validationError === PRICE_ERROR_MIN_MAX
    if (shouldCommit) {
      onUpdate({
        minPrice: priceMin && priceMin.trim() !== '' ? Number(priceMin) : undefined,
        maxPrice: priceMax && priceMax.trim() !== '' ? Number(priceMax) : undefined,
      })
    }
    setFocusedPriceField(null)
  }

  const handleReset = () => {
    setPriceMinDraft('')
    setPriceMaxDraft('')
    setFocusedPriceField(null)
    setPriceError(null)
    onReset()
  }

  if (variant === 'mobile') {
    return (
      <div className="space-y-5">
        <div>
          <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
            Category
          </h4>
          <CategorySelect
            variant="pills"
            categories={categories}
            selectedCategoryId={filters.categoryId ?? ''}
            onSelect={(categoryId) => onUpdate({ categoryId: categoryId || undefined })}
          />
        </div>

        <div>
          <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
            Price Range
          </h4>
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
              className="h-10 flex-1 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
            />
            <span className="text-slate-400">-</span>
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
              className="h-10 flex-1 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>
          {priceError && (
            <p role="alert" className="mt-1.5 text-xs font-medium text-destructive">
              {priceError}
            </p>
          )}
        </div>

        <div>
          <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
            Skin Type
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {SKIN_TYPES.map((type) => {
              const checked = selectedSkinTypes.includes(type.value)
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => toggleSkinType(type.value)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-medium ${
                    checked
                      ? 'border-violet-200 bg-violet-50 text-slate-800 dark:border-violet-400/40 dark:bg-violet-400/15 dark:text-white'
                      : 'border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200'
                  }`}
                >
                  <span className="text-base">{type.icon}</span>
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      checked
                        ? 'border-violet-600 bg-violet-600 text-white'
                        : 'border-slate-300 dark:border-white/20'
                    }`}
                  >
                    {checked && <Check className="h-3 w-3" />}
                  </span>
                  <span>{type.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
            Rating
          </h4>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Rating">
            {RATING_OPTIONS.map((rating) => (
              <label
                key={rating.value}
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm text-slate-700 dark:text-slate-200 ${
                  filters.rating === rating.value
                    ? 'border-violet-200 bg-violet-50 dark:border-violet-400/40 dark:bg-violet-400/15'
                    : 'border-slate-200 bg-white dark:border-white/10 dark:bg-white/5'
                }`}
              >
                <input
                  type="radio"
                  name="match-rating-filter"
                  value={rating.value}
                  checked={filters.rating === rating.value}
                  onChange={() => onUpdate({ rating: rating.value })}
                  className="h-4 w-4 accent-violet-600"
                />
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                {rating.label}
              </label>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className={`overflow-hidden border-border/80 shadow-xs ${className ?? ''}`}>
      <div className="flex w-full items-center gap-2 p-4">
        <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-bold text-foreground">Filters</h3>
        {hasActiveFilters && <span className="h-2 w-2 rounded-full bg-primary" />}
      </div>

      <div className="space-y-4 border-t border-border/50 px-4 pb-4 pt-4">
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</h4>
          <CategorySelect
            variant="nav"
            categories={categories}
            selectedCategoryId={filters.categoryId ?? ''}
            onSelect={(categoryId) => onUpdate({ categoryId: categoryId || undefined })}
            noIndent
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
          {priceError && (
            <p role="alert" className="mt-1.5 text-xs font-medium text-destructive">
              {priceError}
            </p>
          )}
        </div>

        <Separator />

        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rating</h4>
          <RadioGroup
            value={filters.rating?.toString() ?? ''}
            onValueChange={(value) => onUpdate({ rating: value ? Number(value) : undefined })}
            className="space-y-1.5"
          >
            {RATING_OPTIONS.map((rating) => (
              <label key={rating.value} className="flex cursor-pointer items-center gap-2">
                <RadioGroupItem value={rating.value.toString()} className="mt-0.5" />
                <span className="text-sm text-foreground">{rating.label}</span>
              </label>
            ))}
          </RadioGroup>
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