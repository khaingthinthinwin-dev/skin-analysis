import { Link } from 'react-router'
import { Star, ShoppingCart, Heart, Loader2, Store } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { ProductSummary, ViewMode } from '@/types/search.types'

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
  const imageUrl = getImageUrl(Array.isArray(product.images) ? product.images[0] : null)

  if (view === 'list') {
    return (
      <Link
        to={productLink}
        onClick={(e) => e.stopPropagation()}
        className="block rounded-lg border border-border bg-card transition-shadow hover:shadow-md"
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
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] font-semibold uppercase text-purple-600 dark:text-purple-400">
                  {product.category.name}
                </span>
                {product.shop_name && (
                    <span className="mt-1 block rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
                    Sold by {product.shop_name}
                  </span>
                )}
                <h3 className="cursor-pointer truncate text-sm font-semibold text-foreground transition-colors duration-200 hover:text-primary">{product.name}</h3>
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
            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{product.shortDescription}</p>
            <div className="mt-2 flex items-center gap-1 text-xs">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="font-medium">{product.avgRating}</span>
              <span className="text-muted-foreground">({product.reviewCount})</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-purple-600 dark:text-purple-400 font-bold text-sm">{Number(product.price).toLocaleString()} Ks</span>
                {product.compareAtPrice && (
                  <span className="text-gray-400 dark:text-gray-500 line-through text-xs">
                    {Number(product.compareAtPrice).toLocaleString()} Ks
                  </span>
                )}
              </div>
              {!product.isInStock && (
                <span className="text-xs text-destructive font-medium">Out of stock</span>
              )}
            </div>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Card className="group overflow-hidden border-border bg-card transition-transform hover:-translate-y-0.5 hover:shadow-md">
      {/* Image Section */}
      <Link to={productLink} onClick={(e) => e.stopPropagation()} className="block">
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

          {/* SALE Badge - Top Left */}
          {product.compareAtPrice && (
            <span className="absolute top-2 left-2 rounded-full bg-pink-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
              SALE
            </span>
          )}

          {/* Wishlist Heart - Top Right */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8 rounded-full bg-transparent shadow-none hover:bg-transparent"
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
              <Heart className={`h-4 w-4 ${isInWishlist ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
            )}
          </Button>
        </div>
      </Link>

      {/* Content Section */}
      <CardContent className="space-y-2 p-3 pt-2.5">
        {/* Sold By */}
        {product.shop_name && (
          <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">
            <Store className="h-3 w-3" />
            <span>Sold by {product.shop_name}</span>
          </div>
        )}

        {/* Product Title */}
        <h3 className="line-clamp-1 cursor-pointer text-sm font-semibold text-foreground transition-colors duration-200 hover:text-primary">
          {product.name}
        </h3>

        {/* Rating: 5 Stars + Score + Review Count */}
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`h-3.5 w-3.5 ${
                star <= Math.round(Number(product.avgRating))
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'fill-gray-200 text-gray-200'
              }`}
            />
          ))}
          <span className="ml-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
            {Number(product.avgRating).toFixed(2)}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-400">
            ({product.reviewCount})
          </span>
        </div>

        {/* Skin Type Badge */}
        {product.skinTypes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {product.skinTypes.slice(0, 2).map((skinType) => (
              <span
                key={skinType}
                className="inline-flex items-center rounded-full bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 text-[10px] font-semibold text-purple-600 dark:text-purple-400"
              >
                {skinType.charAt(0).toUpperCase() + skinType.slice(1)}
              </span>
            ))}
          </div>
        )}

        {/* Price + Cart Button */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-baseline gap-2">
            <span className="text-purple-600 dark:text-purple-400 font-bold text-sm">
              {Number(product.price).toLocaleString()} Ks
            </span>
            {product.compareAtPrice && (
              <span className="text-gray-400 dark:text-gray-500 line-through text-xs">
                {Number(product.compareAtPrice).toLocaleString()} Ks
              </span>
            )}
          </div>

          {product.isInStock && (
            <Button
              type="button"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-full bg-purple-600 text-white shadow-md hover:bg-purple-700"
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
