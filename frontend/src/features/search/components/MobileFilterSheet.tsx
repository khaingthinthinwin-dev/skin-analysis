import { useEffect, useRef, useState, useCallback } from 'react'
import { X, Check, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SearchParams } from '@/schemas/search.schema'
import type { CategoryNode } from '@/types/search.types'

const SKIN_TYPES = [
  { value: 'dry' as const, label: 'Dry', icon: '🌵' },
  { value: 'oily' as const, label: 'Oily', icon: '💧' },
  { value: 'combination' as const, label: 'Combination', icon: '🔄' },
  { value: 'sensitive' as const, label: 'Sensitive', icon: '🌸' },
  { value: 'normal' as const, label: 'Normal', icon: '✨' },
]

const RATING_OPTIONS = [
  { value: 4.5, label: '4.5+' },
  { value: 4.0, label: '4.0+' },
  { value: 3.5, label: '3.5+' },
  { value: 3.0, label: '3.0+' },
] as const

const PRICE_PRESETS = [
  { label: 'Under $30', min: undefined, max: 30 },
  { label: '$30 - $70', min: 30, max: 70 },
  { label: '$70+', min: 70, max: undefined },
]

interface MobileFilterSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  params: SearchParams
  onUpdate: (updates: Partial<SearchParams>) => void
  categories: CategoryNode[]
  onClearAll: () => void
  onApply: () => void
  activeFilterCount: number
  totalProductCount?: number
}

function flattenCategories(categories: CategoryNode[]): { id: string; name: string }[] {
  const result: { id: string; name: string }[] = []
  for (const cat of categories) {
    result.push({ id: cat.id, name: cat.name })
    if (cat.children?.length) {
      result.push(...flattenCategories(cat.children))
    }
  }
  return result
}

export function MobileFilterSheet({
  open,
  onOpenChange,
  params,
  onUpdate,
  categories,
  onClearAll,
  onApply,
  activeFilterCount,
  totalProductCount,
}: MobileFilterSheetProps) {
  const [priceDraftMin, setPriceDraftMin] = useState('')
  const [priceDraftMax, setPriceDraftMax] = useState('')
  const [focusedPrice, setFocusedPrice] = useState<'min' | 'max' | null>(null)
  const [activePreset, setActivePreset] = useState<number | null>(null)
  const [isVisible, setIsVisible] = useState(open)
  const [isClosing, setIsClosing] = useState(false)
  const [isEntered, setIsEntered] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const dragStartY = useRef<number | null>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  const priceMin = focusedPrice === 'min' ? priceDraftMin : (params.minPrice?.toString() ?? '')
  const priceMax = focusedPrice === 'max' ? priceDraftMax : (params.maxPrice?.toString() ?? '')

  useEffect(() => {
    let enterFrame: number | undefined
    let closeFrame: number | undefined
    let closeTimer: ReturnType<typeof setTimeout> | undefined

    if (open) {
      enterFrame = requestAnimationFrame(() => {
        setIsVisible(true)
        setIsClosing(false)
        setDragOffset(0)
        setIsEntered(true)
      })
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      closeFrame = requestAnimationFrame(() => {
        setIsClosing(true)
        setIsEntered(false)
        closeTimer = setTimeout(() => setIsVisible(false), 220)
      })
    }

    return () => {
      if (enterFrame) cancelAnimationFrame(enterFrame)
      if (closeFrame) cancelAnimationFrame(closeFrame)
      if (closeTimer) clearTimeout(closeTimer)
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onOpenChange, open])

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === backdropRef.current) {
      onOpenChange(false)
    }
  }, [onOpenChange])

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    dragStartY.current = event.clientY
    event.currentTarget.setPointerCapture(event.pointerId)
  }, [])

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartY.current === null) return
    setDragOffset(Math.max(0, event.clientY - dragStartY.current))
  }, [])

  const handlePointerUp = useCallback(() => {
    if (dragOffset > 80) onOpenChange(false)
    setDragOffset(0)
    dragStartY.current = null
  }, [dragOffset, onOpenChange])

  const handleCategoryToggle = useCallback((categoryId: string) => {
    onUpdate({ categoryId: params.categoryId === categoryId ? '' : categoryId })
  }, [params.categoryId, onUpdate])

  const handleSkinTypeToggle = useCallback((type: SearchParams['skinTypes'][number]) => {
    const next = params.skinTypes.includes(type)
      ? params.skinTypes.filter((t) => t !== type)
      : [...params.skinTypes, type]
    onUpdate({ skinTypes: next as SearchParams['skinTypes'] })
  }, [params.skinTypes, onUpdate])

  const handleRatingToggle = useCallback((rating: number) => {
    onUpdate({ rating: params.rating === rating ? undefined : rating })
  }, [onUpdate, params.rating])

  const handlePricePreset = useCallback((preset: typeof PRICE_PRESETS[number], index: number) => {
    setActivePreset(activePreset === index ? null : index)
    setPriceDraftMin(preset.min?.toString() ?? '')
    setPriceDraftMax(preset.max?.toString() ?? '')
    setFocusedPrice(null)
    onUpdate({ minPrice: preset.min, maxPrice: preset.max })
  }, [activePreset, onUpdate])

  const handlePriceMinChange = useCallback((value: string) => {
    setPriceDraftMin(value)
    setFocusedPrice('min')
    setActivePreset(null)
  }, [])

  const handlePriceMaxChange = useCallback((value: string) => {
    setPriceDraftMax(value)
    setFocusedPrice('max')
    setActivePreset(null)
  }, [])

  const commitPrice = useCallback(() => {
    onUpdate({
      minPrice: priceDraftMin ? Number(priceDraftMin) : undefined,
      maxPrice: priceDraftMax ? Number(priceDraftMax) : undefined,
    })
    setFocusedPrice(null)
  }, [priceDraftMin, priceDraftMax, onUpdate])

  const handleClearAll = useCallback(() => {
    setPriceDraftMin('')
    setPriceDraftMax('')
    setFocusedPrice(null)
    setActivePreset(null)
    onClearAll()
  }, [onClearAll])

  const safeCategories = Array.isArray(categories) ? categories : []
  const flatCats = flattenCategories(safeCategories)
  const visibleCategories = flatCats.slice(0, 8)

  if (!open && !isVisible) return null

  const sheetTransform = dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined

  return (
    <div className="fixed inset-0 z-50 md:hidden" aria-modal="true" role="dialog">
      {/* Dimmed backdrop overlay */}
      <div
        ref={backdropRef}
        className={`mobile-filter-backdrop absolute inset-0 bg-black/60 backdrop-blur-sm ${isEntered && !isClosing ? 'mobile-filter-backdrop-visible' : ''}`}
        onClick={handleBackdropClick}
      />

      {/* Bottom Sheet Container */}
      <div
        className={`mobile-filter-sheet absolute bottom-0 left-0 right-0 flex flex-col rounded-t-[32px] bg-white/95 backdrop-blur-md shadow-2xl ${isEntered && !isClosing ? 'mobile-filter-sheet-visible' : ''}`}
        style={{ height: '85dvh', transform: sheetTransform }}
      >
        {/* Drag handle indicator */}
        <div
          className="mobile-filter-drag-handle flex justify-center pb-1 pt-3"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>

        {/* Sticky Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </h2>
            {activeFilterCount > 0 && (
              <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-gray-900 px-2 text-xs font-medium text-white">
                {activeFilterCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close filters"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 pb-24">
          {/* Category Section */}
          <section className="mb-6">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Category</h3>
            <div className="filter-pill-rail flex gap-2 overflow-x-auto pb-1">
              {visibleCategories.map((cat) => {
                const isActive = cat.id === params.categoryId
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategoryToggle(cat.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-gray-900 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {isActive && <Check className="h-3.5 w-3.5" />}
                    {cat.name}
                  </button>
                )
              })}
            </div>
          </section>

          {/* Price Range Section */}
          <section className="mb-6">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Price Range</h3>
            <div className="mb-4 flex flex-wrap gap-2">
              {PRICE_PRESETS.map((preset, index) => {
                const isActive = activePreset === index
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handlePricePreset(preset, index)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-gray-900 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                <input
                  type="number"
                  placeholder="Min"
                  value={priceMin}
                  onChange={(e) => handlePriceMinChange(e.target.value)}
                  onBlur={commitPrice}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                  className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-7 pr-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-gray-900 focus:bg-white focus:outline-none"
                  min={0}
                />
              </div>
              <span className="text-gray-300">—</span>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={priceMax}
                  onChange={(e) => handlePriceMaxChange(e.target.value)}
                  onBlur={commitPrice}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                  className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-7 pr-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-gray-900 focus:bg-white focus:outline-none"
                  min={0}
                />
              </div>
            </div>
          </section>

          {/* Skin Types Section */}
          <section className="mb-6">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Skin Type</h3>
            <div className="grid grid-cols-2 gap-2">
              {SKIN_TYPES.map((st) => {
                const isActive = params.skinTypes.includes(st.value)
                return (
                  <button
                    key={st.value}
                    type="button"
                    onClick={() => handleSkinTypeToggle(st.value)}
                    className={`relative flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                      isActive
                        ? 'border-gray-900 bg-gray-50 shadow-sm'
                        : 'border-gray-100 bg-white hover:border-gray-200'
                    }`}
                  >
                    <span className="text-xl">{st.icon}</span>
                    <div className="flex-1">
                      <span className={`text-sm font-medium ${isActive ? 'text-gray-900' : 'text-gray-700'}`}>
                        {st.label}
                      </span>
                    </div>
                    {isActive && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-900">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </section>

          {/* Rating Section */}
          <section className="mb-6">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Rating</h3>
            <div className="grid grid-cols-2 gap-2">
              {RATING_OPTIONS.map((rating) => {
                const isActive = params.rating === rating.value
                return (
                  <button
                    key={rating.value}
                    type="button"
                    onClick={() => handleRatingToggle(rating.value)}
                    aria-pressed={isActive}
                    className={`flex items-center gap-2 rounded-xl border-2 p-3 text-left text-sm font-medium transition-all ${
                      isActive
                        ? 'border-gray-900 bg-gray-50 text-gray-900 shadow-sm'
                        : 'border-gray-100 bg-white text-gray-700 hover:border-gray-200'
                    }`}
                  >
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    {rating.label} Stars
                    {isActive && <Check className="ml-auto h-4 w-4" />}
                  </button>
                )
              })}
            </div>
          </section>

        </div>

        {/* Floating Sticky Footer Bar */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-100 bg-white/90 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-lg">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleClearAll}
              className="text-sm font-medium text-gray-500 underline underline-offset-2 transition-colors hover:text-gray-900"
            >
              Clear All
            </button>
            <Button
              type="button"
              onClick={onApply}
              className="flex-1 rounded-full bg-gray-900 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-gray-800 active:scale-[0.98]"
            >
              {totalProductCount !== undefined
                ? `Show ${totalProductCount} Products`
                : 'Show Results'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
