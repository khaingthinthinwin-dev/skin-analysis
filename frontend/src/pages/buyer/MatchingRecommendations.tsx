import { useState, type ImgHTMLAttributes } from 'react'
import { Link, useNavigate } from 'react-router'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShoppingCart, Star, ChevronLeft, ChevronRight, Sparkles, FlaskConical, Heart, Plus, Check, RefreshCw } from 'lucide-react'
import { useMatchFilters } from '@/features/buyer/matching/hooks/useMatchFilters'
import { usePersonalizedRecommendations, useRecommendationHistory, useAdPanel } from '@/features/buyer/matching/hooks/useMatching'
import { matchingService } from '@/features/buyer/matching/services/matching.service'
import { FiltersPanel } from '@/features/buyer/matching/components/FiltersPanel'
import { EmptyState } from '@/features/buyer/matching/components/EmptyState'
import { ErrorBanner } from '@/features/buyer/matching/components/ErrorBanner'
import { SkeletonGrid } from '@/features/buyer/matching/components/SkeletonGrid'
import { HistoryAccordion } from '@/features/buyer/matching/components/HistoryAccordion'
import { AdSlidePanel } from '@/features/buyer/matching/components/AdSlidePanel'
import { cn } from '@/lib/utils'

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

const BADGE_STYLES: Record<string, string> = {
  featured: 'bg-amber-100 text-amber-700',
  topRated: 'bg-teal-100 text-teal-700',
  bestSeller: 'bg-orange-100 text-orange-700',
  new: 'bg-purple-100 text-purple-700',
}

const BADGE_LABELS: Record<string, string> = {
  featured: '⭐ Featured',
  topRated: '🏆 Top Rated',
  bestSeller: '🔥 Best Seller',
  new: '✨ New',
}

const STALE_THRESHOLD_HOURS = 30 * 24

export default function MatchingRecommendations() {
  const navigate = useNavigate()
  const { filters, updateFilters, resetFilters } = useMatchFilters()

  const { data: recData, isLoading, error: recError, refetch } = usePersonalizedRecommendations({ ...filters, limit: 12 })
  const { data: historyData } = useRecommendationHistory(1, 5)
  const { data: adPanelData } = useAdPanel('category_banner')

  const products = recData?.data ?? []
  const source = recData?.source ?? 'generic'
  const analysisAge = recData?.analysisAge ?? null
  const skinTypes = recData?.skinTypes ?? []
  const meta = recData?.meta ?? { page: 1, limit: 12, total: 0, totalPages: 0 }
  const history = historyData?.data ?? []

  const isStale = source === 'ai' && analysisAge !== null && analysisAge >= STALE_THRESHOLD_HOURS

  const handlePageChange = (newPage: number) => {
    updateFilters({ page: newPage })
  }

  const getPageNumbers = () => {
    const pages: (number | '...')[] = []
    const total = meta.totalPages
    const current = meta.page

    if (total <= 5) {
      for (let i = 1; i <= total; i++) pages.push(i)
    } else {
      pages.push(1)
      if (current > 3) pages.push('...')
      for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
        pages.push(i)
      }
      if (current < total - 2) pages.push('...')
      pages.push(total)
    }
    return pages
  }

  const skinTypeLabel = skinTypes.length > 0 ? skinTypes.join(', ') : 'All Types'

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

      {/* Stale Analysis Banner */}
      {isStale && (
        <div className="rounded-xl p-4 flex items-center justify-between bg-amber-50 border border-amber-200">
          <div className="flex items-center gap-3">
            <span className="text-lg">💡</span>
            <div>
              <p className="text-sm font-semibold text-amber-700">Want Fresh Results?</p>
              <p className="text-xs text-amber-600">Retake your skin analysis for updated recommendations</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="border-amber-300 text-amber-700 hover:bg-amber-100" asChild>
            <Link to="/buyer/skin-analysis">
              <RefreshCw className="h-4 w-4 mr-1.5" /> Retake Analysis
            </Link>
          </Button>
        </div>
      )}

      {/* Prominent Profile Prompt Banner - Generic (no analysis) */}
      {source === 'generic' && (
        <div className="rounded-xl p-6 flex items-center gap-6 bg-gradient-to-r from-pink-50 to-purple-50 border border-purple-100">
          <div className="text-5xl flex-shrink-0">🧑‍🔬</div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-foreground">Get Personalized Recommendations</h2>
            <p className="text-sm text-muted-foreground mt-1">Run an AI skin analysis to receive products matched to your skin type and concerns</p>
          </div>
          <Button className="flex-shrink-0 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-semibold px-6" asChild>
            <Link to="/buyer/skin-analysis">
              <Sparkles className="h-4 w-4 mr-2" /> Start Skin Analysis
            </Link>
          </Button>
        </div>
      )}

      {recError && <ErrorBanner message={recError.message || 'Failed to load recommendations.'} onRetry={() => refetch()} />}

      {/* Ad Carousel */}
      <AdSlidePanel
        ads={adPanelData?.data ?? []}
        onImpression={(adIds) => matchingService.trackImpression(adIds)}
        onClick={(adId) => matchingService.trackClick(adId)}
      />

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
              <div className="flex items-center gap-3">
                {source === 'ai' && (
                  <>
                    <span className="text-sm text-muted-foreground">Sort by:</span>
                    <select
                      value={filters.sort ?? ''}
                      onChange={(e) => updateFilters({ sort: e.target.value as 'matchScore' | 'price' | 'rating' | 'createdAt' || undefined })}
                      className="px-3 py-1.5 text-sm border border-border rounded-md bg-card text-foreground cursor-pointer focus:outline-none focus:border-primary"
                    >
                      <option value="matchScore">Match Score</option>
                      <option value="price">Price: Low to High</option>
                      <option value="rating">Rating</option>
                      <option value="createdAt">Newest</option>
                    </select>
                  </>
                )}
                <span className="ml-auto text-sm text-muted-foreground">
                  Showing {((meta.page - 1) * meta.limit) + 1}–{Math.min(meta.page * meta.limit, meta.total)} of {meta.total} results
                </span>
              </div>

              {/* Product Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((product) => (
                  <Card key={product.id} onClick={() => navigate(`/buyer/products/${product.slug}`)} className="relative border border-border/60 bg-card shadow-sm flex flex-col overflow-hidden hover:shadow-xl transition-shadow duration-200 cursor-pointer group rounded-xl">
                    {/* Image Area */}
                    <div className="relative aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
                      <ProductImage
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />

                      {/* Category Badge - Top Left */}
                      {product.categoryBadge && (
                        <span className={cn(
                          'absolute top-3 left-3 z-10 rounded-full px-2.5 py-1 text-xs font-semibold',
                          BADGE_STYLES[product.categoryBadge]
                        )}>
                          {BADGE_LABELS[product.categoryBadge]}
                        </span>
                      )}

                      {/* Out of Stock */}
                      {!product.isInStock && (
                        <span className="absolute top-3 left-3 z-10 px-2.5 py-1 text-[10px] font-semibold rounded bg-black/60 text-white">
                          Out of Stock
                        </span>
                      )}

                      {/* Match Score - Bottom Left Overlay */}
                      {product.matchScore !== null && (
                        <span className="absolute bottom-3 left-3 z-10 inline-flex items-center gap-1 bg-emerald-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-md">
                          <Check className="h-3 w-3" />
                          {product.matchScore}% Match
                        </span>
                      )}

                      {/* Mobile Add Button - Bottom Right */}
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        className="absolute bottom-3 right-3 z-10 sm:hidden w-10 h-10 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center shadow-lg hover:bg-primary transition-colors"
                      >
                        <Plus className="h-5 w-5 text-white" />
                      </button>
                    </div>

                    {/* Favorite Heart - Fixed position */}
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      className="absolute top-3 right-3 z-30 w-9 h-9 rounded-full flex items-center justify-center"
                    >
                      <Heart className="h-5 w-5 text-gray-400 hover:text-red-500 transition-colors" />
                    </button>

                    {/* Card Body */}
                    <div className="p-4 flex flex-col flex-1">
                      {product.brandName && (
                        <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-widest mb-1">
                          {product.brandName}
                        </p>
                      )}

                      <Link to={`/buyer/products/${product.slug}`} className="text-sm font-bold text-foreground line-clamp-2 hover:text-primary transition-colors leading-snug mb-2">
                        {product.name}
                      </Link>

                      {/* Rating */}
                      <div className="flex items-center gap-1 mb-2">
                        <div className="flex items-center">
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
                        <span className="text-xs text-muted-foreground font-medium">
                          {Number(product.avgRating).toFixed(2)} ({product.reviewCount})
                        </span>
                      </div>

                      {/* Skin Types */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {product.skinTypes.slice(0, 3).map((t) => (
                          <span key={t} className="px-2 py-0.5 text-[10px] font-medium bg-purple-50 text-purple-700 rounded">
                            {t}
                          </span>
                        ))}
                      </div>

                      <div className="flex-1" />

                      {/* Price and Cart Button */}
                      <div className="flex items-center justify-between pt-3 border-t border-border/50">
                        <div className="flex items-baseline gap-2">
                          {product.compareAtPrice && (
                            <span className="text-sm text-muted-foreground line-through">
                              Ks {Number(product.compareAtPrice).toLocaleString()}
                            </span>
                          )}
                          <span className="text-base font-bold text-purple-700">
                            Ks {Number(product.price).toLocaleString()}
                          </span>
                        </div>

                        <Link
                          to={`/buyer/products/${product.slug}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hidden sm:flex w-9 h-9 rounded-full bg-purple-100 items-center justify-center hover:bg-purple-200 transition-colors"
                        >
                          <ShoppingCart className="h-4 w-4 text-purple-700" />
                        </Link>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {meta.totalPages > 1 && (
                <div className="flex items-center justify-center gap-1.5 pt-4">
                  <button
                    onClick={() => handlePageChange(meta.page - 1)}
                    disabled={meta.page <= 1}
                    className="w-9 h-9 rounded-lg border border-border bg-card text-sm text-muted-foreground flex items-center justify-center hover:bg-muted disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {getPageNumbers().map((page, i) =>
                    page === '...' ? (
                      <span key={`dots-${i}`} className="w-9 h-9 flex items-center justify-center text-sm text-muted-foreground">
                        ...
                      </span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={cn(
                          'w-9 h-9 rounded-lg text-sm font-medium flex items-center justify-center transition-colors',
                          meta.page === page
                            ? 'bg-primary text-primary-foreground'
                            : 'border border-border bg-card text-muted-foreground hover:bg-muted'
                        )}
                      >
                        {page}
                      </button>
                    )
                  )}
                  <button
                    onClick={() => handlePageChange(meta.page + 1)}
                    disabled={meta.page >= meta.totalPages}
                    className="w-9 h-9 rounded-lg border border-border bg-card text-sm text-muted-foreground flex items-center justify-center hover:bg-muted disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
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
