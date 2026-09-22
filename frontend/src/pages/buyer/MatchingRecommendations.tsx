import { useState, type ImgHTMLAttributes } from 'react'
import { Link } from 'react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShoppingCart, Star, Sparkles, FlaskConical, Heart, Check } from 'lucide-react'
import { useMatchFilters } from '@/features/buyer/matching/hooks/useMatchFilters'
import { usePersonalizedRecommendations, useRecommendationHistory, useAdPanel } from '@/features/buyer/matching/hooks/useMatching'
import { matchingService } from '@/features/buyer/matching/services/matching.service'
import { FiltersPanel } from '@/features/buyer/matching/components/FiltersPanel'
import { EmptyState } from '@/features/buyer/matching/components/EmptyState'
import { ErrorBanner } from '@/features/buyer/matching/components/ErrorBanner'
import { SkeletonGrid } from '@/features/buyer/matching/components/SkeletonGrid'
import { HistoryAccordion } from '@/features/buyer/matching/components/HistoryAccordion'
import { AdSlidePanel } from '@/features/buyer/matching/components/AdSlidePanel'
import { ProfilePromptBanner } from '@/features/buyer/matching/components/ProfilePromptBanner'
import { MatchingSortSelect } from '@/features/buyer/matching/components/MatchingSortSelect'
import { MatchingFilterChips } from '@/features/buyer/matching/components/MatchingFilterChips'
import { SampleAdBanner } from '@/features/buyer/matching/components/SampleAdBanner'
import { ViewToggle } from '@/features/search/components/ViewToggle'
import { Pagination } from '@/components/Pagination'
import { cn } from '@/lib/utils'
import type { ViewMode } from '@/types/search.types'

function getImageUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('http')) return url
  const raw = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'
  const base = raw.replace(/\/api\/v1\/?$/, '')
  return base + url
}

function ProductImage({ src, alt, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [error, setError] = useState(false)
  if (!src || error) {
    return <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-4xl">🧴</div>
  }
  return <img src={getImageUrl(src)} alt={alt} onError={() => setError(true)} {...props} />
}

export default function MatchingRecommendations() {
  const { filters, updateFilters, resetFilters, handleLimitChange, pageSizeVersion } = useMatchFilters()
  const [view, setView] = useState<ViewMode>('grid')

  const { data: recData, isLoading, error: recError, refetch } = usePersonalizedRecommendations(filters, pageSizeVersion)
  const { data: historyData } = useRecommendationHistory(1, 5)
  const { data: adPanelData } = useAdPanel('category_banner')

  // Keep the rendered list and pagination in sync with the selected page size
  // even while a refresh is in flight (placeholder data can still be from a
  // previous larger selection).
  const products = (recData?.data ?? []).slice(0, filters.limit)
  const source = recData?.source ?? 'generic'
  const analysisAge = recData?.analysisAge ?? null
  const skinTypes = recData?.skinTypes ?? []
  const meta = {
    ...(recData?.meta ?? { page: filters.page, limit: filters.limit, total: 0, totalPages: 0 }),
    page: filters.page,
    limit: filters.limit,
  }
  const history = historyData?.data ?? []

  const skinTypeLabel = skinTypes.length > 0 ? skinTypes.join(', ') : 'All Types'

  const hasActiveFilters = Boolean(
    filters.categoryId ||
    (filters.skinTypes && filters.skinTypes.split(',').filter(Boolean).filter((t) => t !== 'all').length > 0) ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    filters.rating !== undefined,
  )

  const handleRemoveChip = (key: string, value?: string) => {
    if (key === 'categoryId') {
      updateFilters({ categoryId: undefined })
    } else if (key === 'skinTypes' && value) {
      const current = filters.skinTypes
        ? filters.skinTypes.split(',').filter(Boolean).filter((t) => t !== 'all')
        : []
      const updated = current.filter((t) => t !== value)
      updateFilters({ skinTypes: updated.length > 0 ? updated.join(',') : undefined })
    } else if (key === 'minPrice') {
      updateFilters({ minPrice: undefined })
    } else if (key === 'maxPrice') {
      updateFilters({ maxPrice: undefined })
    } else if (key === 'rating') {
      updateFilters({ rating: undefined })
    }
  }

  const handleClearAllFilters = () => {
    updateFilters({
      categoryId: undefined,
      skinTypes: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      rating: undefined,
    })
  }

  return (
    <div className="space-y-6 p-2 lg:p-4">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Recommended for You</h1>
          <span className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold',
            source === 'ai' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
          )}>
            {source === 'ai' ? <FlaskConical className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
            {source === 'ai' ? 'AI Analysis' : 'General Picks'}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {source === 'ai'
            ? `Based on your AI analysis · ${skinTypeLabel} · ${meta.total} results`
            : 'Showing featured products · No skin analysis found'}
        </p>
      </div>

      {/* Sample Advertisement */}
      <SampleAdBanner />

      {/* Analysis Status Banner */}
      <ProfilePromptBanner source={source} analysisAge={analysisAge} />

      {recError && <ErrorBanner message={recError.message || 'Failed to load recommendations.'} onRetry={() => refetch()} />}

      {/* Ad Carousel */}
      <AdSlidePanel
        ads={adPanelData?.data ?? []}
        onImpression={(adIds) => matchingService.trackImpression(adIds)}
        onClick={(adId) => matchingService.trackClick(adId)}
      />

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <MatchingFilterChips
          filters={filters}
          onRemove={handleRemoveChip}
          onClearAll={handleClearAllFilters}
        />
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Filters Sidebar */}
        <aside className="w-full lg:w-[280px] flex-shrink-0">
          <div className="lg:sticky lg:top-4">
            <FiltersPanel filters={filters} onUpdate={updateFilters} onReset={resetFilters} />
          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-1 space-y-4">
          {isLoading ? (
            <SkeletonGrid count={meta.limit} />
          ) : products.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {/* Sort Bar */}
              <div className="flex flex-wrap items-center justify-end gap-3">
                <MatchingSortSelect
                  sort={filters.sort}
                  order={filters.order}
                  source={source}
                  onChange={(sort, order) => updateFilters({ sort, order })}
                />
                <ViewToggle view={view} onChange={setView} />
              </div>

              {/* Product Grid */}
              {view === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map((product) => (
                    <Card key={product.id} className="group overflow-hidden transition-transform hover:-translate-y-0.5 hover:shadow-md">
                      <Link to={`/buyer/products/${product.slug}`} className="block">
                        <div className="relative aspect-square bg-muted">
                          <ProductImage
                            src={product.images[0]}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                          
                          {/* Badges top-left */}
                          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                            {product.compareAtPrice && (
                              <span className="inline-flex items-center rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
                                SALE
                              </span>
                            )}
                            {!product.isInStock && (
                              <span className="inline-flex items-center rounded-full bg-gray-900 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
                                OUT OF STOCK
                              </span>
                            )}
                          </div>

                          {/* Match Score - Bottom Left (original position) */}
                          {product.matchScore !== null && (
                            <span className="absolute bottom-3 left-3 z-10 inline-flex items-center gap-1 bg-emerald-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-md">
                              <Check className="h-3 w-3" />
                              {product.matchScore}% Match
                            </span>
                          )}

                          {/* Heart icon top-right */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/80 hover:bg-white shadow-sm z-10"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          >
                            <Heart className="h-4 w-4 text-gray-600 hover:text-red-500 transition-colors" />
                          </Button>
                        </div>
                      </Link>
                      <CardContent className="space-y-1.5 p-3 pt-2.5">
                        {/* Sold By / Shop Name with icon */}
                        {product.brandName && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground text-[10px]">🏪</span>
                            <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wide">
                              SOLD BY {product.brandName}
                            </span>
                          </div>
                        )}
                        {/* Product Name */}
                        <Link to={`/buyer/products/${product.slug}`} className="block">
                          <h3 className="line-clamp-1 text-sm font-semibold hover:text-primary transition-colors">
                            {product.name}
                          </h3>
                        </Link>
                        {/* Rating */}
                        <div className="flex items-center gap-1.5 text-xs">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={cn(
                                  'h-3.5 w-3.5',
                                  star <= Math.round(Number(product.avgRating))
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'fill-gray-200 text-gray-200'
                                )}
                              />
                            ))}
                          </div>
                          <span className="font-medium">{Number(product.avgRating).toFixed(2)}</span>
                          <span className="text-muted-foreground">({product.reviewCount})</span>
                        </div>
                        {/* Skin Types */}
                        <div className="flex flex-wrap gap-1">
                          {product.skinTypes.slice(0, 2).map((t) => (
                            <span
                              key={t}
                              className="inline-flex items-center rounded-full bg-violet-100 text-violet-700 px-2 py-0.5 text-[10px] font-medium"
                            >
                              {t.charAt(0).toUpperCase() + t.slice(1)}
                            </span>
                          ))}
                          {product.skinTypes.length > 2 && (
                            <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-600 px-2 py-0.5 text-[10px] font-medium">
                              +{product.skinTypes.length - 2}
                            </span>
                          )}
                        </div>
                        {/* Price and Add to Cart */}
                        <div className="flex items-center justify-between pt-2 border-t border-border/50">
                          <div className="flex items-baseline gap-2">
                            <span className="text-base font-bold text-gray-900">
                              Ks {Number(product.price).toLocaleString()}
                            </span>
                            {product.compareAtPrice && (
                              <span className="text-xs text-muted-foreground line-through">
                                Ks {Number(product.compareAtPrice).toLocaleString()}
                              </span>
                            )}
                          </div>
                          {product.isInStock && (
                            <Button
                              size="icon"
                              className="h-9 w-9 rounded-full bg-violet-600 hover:bg-violet-700 text-white shadow-sm"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            >
                              <ShoppingCart className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {products.map((product) => (
                    <Card key={product.id} className="group overflow-hidden transition-transform hover:-translate-y-0.5 hover:shadow-md">
                      <Link to={`/buyer/products/${product.slug}`} className="block">
                        <div className="flex gap-4 p-4">
                          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-lg bg-muted overflow-hidden">
                            <ProductImage
                              src={product.images[0]}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                            {product.matchScore !== null && (
                              <span className="absolute bottom-1.5 left-1.5 z-10 inline-flex items-center gap-1 bg-emerald-500 text-white px-2 py-0.5 rounded-full text-[9px] font-bold shadow-md">
                                <Check className="h-2.5 w-2.5" />
                                {product.matchScore}% Match
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  {product.compareAtPrice && (
                                    <span className="inline-flex items-center rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-2 py-0.5 text-[9px] font-bold text-white shadow-sm">
                                      SALE
                                    </span>
                                  )}
                                  {!product.isInStock && (
                                    <span className="inline-flex items-center rounded-full bg-gray-900 px-2 py-0.5 text-[9px] font-bold text-white shadow-sm">
                                      OUT OF STOCK
                                    </span>
                                  )}
                                </div>
                                {product.brandName && (
                                  <div className="flex items-center gap-1 mb-0.5">
                                    <span className="text-muted-foreground text-[10px]">🏪</span>
                                    <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wide">
                                      SOLD BY {product.brandName}
                                    </span>
                                  </div>
                                )}
                                <h3 className="truncate text-sm font-semibold">{product.name}</h3>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="shrink-0 h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              >
                                <Heart className="h-4 w-4 text-gray-600 hover:text-red-500 transition-colors" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 text-xs">
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={cn(
                                      'h-3 w-3',
                                      star <= Math.round(Number(product.avgRating))
                                        ? 'fill-amber-400 text-amber-400'
                                        : 'fill-gray-200 text-gray-200'
                                    )}
                                  />
                                ))}
                              </div>
                              <span className="font-medium">{Number(product.avgRating).toFixed(2)}</span>
                              <span className="text-muted-foreground">({product.reviewCount})</span>
                            </div>
                            {product.skinTypes.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {product.skinTypes.slice(0, 2).map((t) => (
                                  <span
                                    key={t}
                                    className="inline-flex items-center rounded-full bg-violet-100 text-violet-700 px-2 py-0.5 text-[10px] font-medium"
                                  >
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                  </span>
                                ))}
                                {product.skinTypes.length > 2 && (
                                  <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-600 px-2 py-0.5 text-[10px] font-medium">
                                    +{product.skinTypes.length - 2}
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="mt-2 flex items-center justify-between">
                              <div className="flex items-baseline gap-2">
                                <span className="text-base font-bold text-gray-900">
                                  Ks {Number(product.price).toLocaleString()}
                                </span>
                                {product.compareAtPrice && (
                                  <span className="text-xs text-muted-foreground line-through">
                                    Ks {Number(product.compareAtPrice).toLocaleString()}
                                  </span>
                                )}
                              </div>
                              {product.isInStock && (
                                <Button
                                  size="icon"
                                  className="h-8 w-8 rounded-full bg-violet-600 hover:bg-violet-700 text-white shadow-sm"
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                >
                                  <ShoppingCart className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </Card>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {meta && (
                <Pagination
                  meta={meta}
                  currentLimit={filters.limit}
                  onLimitChange={handleLimitChange}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* History Section */}
      <div className="mt-8">
        {history.length > 0 ? (
          <HistoryAccordion sessions={history} />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-4xl mb-4">📭</div>
            <p className="font-medium">No recommendation history yet</p>
            <p className="text-sm mt-1">Complete a skin analysis to see your past recommendations here.</p>
          </div>
        )}
      </div>
    </div>
  )
}
