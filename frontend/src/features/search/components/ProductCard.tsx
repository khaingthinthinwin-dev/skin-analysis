import { Link, useNavigate } from 'react-router'
import { ShoppingCart, Heart, Loader2, Store } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { ProductSummary, ViewMode } from '@/types/search.types'
import { StarRating } from './StarRating'

interface ProductCardProps {
  product: ProductSummary
  view: ViewMode
  productLink: string
  isInWishlist?: boolean
  onWishlistToggle?: (product: ProductSummary) => void
  onAddToCart?: (product: ProductSummary) => void
  isWishlistLoading?: boolean
  isCartLoading?: boolean
}

function formatKs(value: number | string | null | undefined): string {
  const num = Number(value)
  if (value == null || Number.isNaN(num)) return '0 Ks'
  return `${num.toLocaleString('en-US')} Ks`
}

function getImageUrl(url: string | null | undefined): string {
  if (!url) return ''
  if (url.startsWith('http')) return url

  const raw = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'
  const base = raw.replace(/\/api\/v1\/?$/, '')
  return `${base}${url.startsWith('/') ? url : `/${url}`}`
}

export function ProductCard({
  product,
  view,
  productLink,
  isInWishlist = false,
  onWishlistToggle,
  onAddToCart,
  isWishlistLoading = false,
  isCartLoading = false,
}: ProductCardProps) {
  const navigate = useNavigate()
  const imageUrl = getImageUrl(Array.isArray(product.images) ? product.images[0] : null)

  if (view === 'list') {
    return (
      <Link
        to={productLink}
        onClick={(e) => e.stopPropagation()}
        className="block rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-white/10 dark:bg-[#181028]"
      >
        <div className="flex gap-4 p-4">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg bg-muted">
            {imageUrl ? (
              <>
                <img
                  src={imageUrl}
                  alt={product.name}
                  className="h-full w-full rounded-lg object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                    e.currentTarget.nextElementSibling?.classList.remove('hidden')
                  }}
                />
                <span className="hidden text-xs text-muted-foreground">No image</span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">No image</span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] font-semibold uppercase text-purple-600 dark:text-purple-300">
                  {product.category.name}
                </span>
                {product.shop_name && (
                  <span className="mt-1 block rounded bg-purple-50 px-2 py-0.5 text-xs text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                    Sold by {product.shop_name}
                  </span>
                )}
                <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-white">{product.name}</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onWishlistToggle?.(product)
                }}
                disabled={isWishlistLoading}
                aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                {isWishlistLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Heart className={`h-4 w-4 ${isInWishlist ? 'fill-red-500 text-red-500' : ''}`} />
                )}
              </Button>
            </div>

            <p className="mt-1 line-clamp-1 text-xs text-gray-600 dark:text-gray-400">{product.shortDescription}</p>

            <div className="mt-2">
              <StarRating rating={Number(product.avgRating)} totalReviews={product.reviewCount} />
            </div>

            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-base font-bold text-purple-600 dark:text-purple-400">{formatKs(product.price)}</span>
                {product.compareAtPrice && (
                  <span className="text-xs line-through text-gray-400 dark:text-gray-500">
                    {formatKs(product.compareAtPrice)}
                  </span>
                )}
              </div>
              {!product.isInStock && <span className="text-xs font-medium text-destructive">Out of stock</span>}
            </div>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Card
      className="group cursor-pointer overflow-hidden border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-purple-200 hover:shadow-md dark:border-white/10 dark:bg-[#181028] dark:hover:border-purple-500/40"
      onClick={() => navigate(productLink)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          navigate(productLink)
        }
      }}
      role="link"
      tabIndex={0}
    >
      <Link to={productLink} className="block" onClick={(e) => e.stopPropagation()}>
        <div className="relative aspect-square bg-muted">
          {imageUrl ? (
            <>
              <img
                src={imageUrl}
                alt={product.name}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  e.currentTarget.nextElementSibling?.classList.remove('hidden')
                }}
              />
              <div className="hidden flex h-full items-center justify-center">
                <span className="text-xs text-muted-foreground">No image</span>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-xs text-muted-foreground">No image</span>
            </div>
          )}

          <div className="absolute left-2 top-2 flex flex-col gap-1">
            {product.compareAtPrice && (
              <span className="rounded bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground">
                SALE
              </span>
            )}
            {!product.isInStock && (
              <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                OUT OF STOCK
              </span>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-8 w-8"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onWishlistToggle?.(product)
            }}
            disabled={isWishlistLoading}
            aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            {isWishlistLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Heart className={`h-4 w-4 ${isInWishlist ? 'fill-red-500 text-red-500' : 'text-foreground/80 hover:text-foreground'}`} />
            )}
          </Button>
        </div>
      </Link>

      <CardContent className="space-y-2 p-3 pt-2">
        {product.shop_name && (
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Store className="h-3 w-3" />
            <span>Sold by {product.shop_name}</span>
          </div>
        )}

        <span className="block text-[10px] font-semibold uppercase text-purple-600 dark:text-purple-300">
          {product.category.name}
        </span>

        <h3 className="line-clamp-1 text-sm font-semibold text-slate-900 transition-colors group-hover:text-purple-600 dark:text-white dark:group-hover:text-purple-400">
          {product.name}
        </h3>

        <StarRating rating={Number(product.avgRating)} totalReviews={product.reviewCount} />

        {product.skinTypes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {product.skinTypes.slice(0, 3).map((skinType) => (
              <span
                key={skinType}
                className="inline-flex items-center rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground"
              >
                {skinType.charAt(0).toUpperCase() + skinType.slice(1)}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold text-purple-600 dark:text-purple-400">{formatKs(product.price)}</span>
            {product.compareAtPrice && (
              <span className="text-xs line-through text-gray-400 dark:text-gray-500">
                {formatKs(product.compareAtPrice)}
              </span>
            )}
          </div>
          {product.isInStock && (
            <Button
              size="icon"
              aria-label={`Add ${product.name} to cart`}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f3e8ff] p-0 text-[#9333ea] hover:bg-[#f0e6ff] hover:text-[#7e22ce]"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onAddToCart?.(product)
              }}
              disabled={isCartLoading}
            >
              {isCartLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShoppingCart className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
