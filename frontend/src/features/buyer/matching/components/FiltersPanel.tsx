import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { RotateCcw, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react'
import type { MatchQueryParams } from '@/schemas/matching.schema'
import { SKIN_TYPES, INGREDIENTS } from '@/constants/matchingConstants'

interface FiltersPanelProps {
  filters: MatchQueryParams
  onUpdate: (updates: Partial<MatchQueryParams>) => void
  onReset: () => void
}

export function FiltersPanel({ filters, onUpdate, onReset }: FiltersPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const hasActiveFilters =
    filters.skinTypes || filters.ingredients || filters.minPrice || filters.maxPrice || filters.rating

  const selectedSkinTypes = filters.skinTypes ? filters.skinTypes.split(',') : []
  const selectedIngredients = filters.ingredients ? filters.ingredients.split(',') : []

  const toggleSkinType = (value: string) => {
    const updated = selectedSkinTypes.includes(value)
      ? selectedSkinTypes.filter((t) => t !== value)
      : [...selectedSkinTypes, value]
    onUpdate({ skinTypes: updated.length > 0 ? updated.join(',') : undefined })
  }

  const toggleIngredient = (value: string) => {
    const updated = selectedIngredients.includes(value)
      ? selectedIngredients.filter((i) => i !== value)
      : [...selectedIngredients, value]
    onUpdate({ ingredients: updated.length > 0 ? updated.join(',') : undefined })
  }

  return (
    <Card className="border-border/80 shadow-xs overflow-hidden">
      {/* Header - Always visible, clickable to toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-bold text-foreground">Filters</h3>
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-primary" />
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border/50">
          {/* Reset Button */}
          {hasActiveFilters && (
            <div className="flex justify-end pt-3">
              <button
                onClick={onReset}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                Reset All
              </button>
            </div>
          )}

          {/* Skin Type */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Skin Type</label>
            <div className="space-y-2">
              {SKIN_TYPES.map((type) => (
                <label key={type.value} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selectedSkinTypes.includes(type.value)}
                    onChange={() => toggleSkinType(type.value)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                    {type.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Key Ingredients */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Key Ingredients</label>
            <div className="space-y-2">
              {INGREDIENTS.map((ing) => (
                <label key={ing.value} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selectedIngredients.includes(ing.value)}
                    onChange={() => toggleIngredient(ing.value)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                    {ing.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Price Range</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                value={filters.minPrice ?? ''}
                onChange={(e) => onUpdate({ minPrice: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-muted-foreground text-sm">—</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.maxPrice ?? ''}
                onChange={(e) => onUpdate({ maxPrice: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
