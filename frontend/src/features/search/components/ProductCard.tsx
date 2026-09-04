import { Link } from 'react-router'
import { Star, ShoppingCart, Heart } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { ProductSummary, ViewMode } from '@/types/search.types'

interface ProductCardProps {
  product: ProductSummary
  view: ViewMode
}

function getImageUrl(url: string | null | undefined): string {
  if (!url) return ''
  if (url.startsWith('http')) return url

  const raw = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'
  const base = raw.replace(/\/api\/v1\/?$/, '')
  return `${base}${url.startsWith('/') ? url : `/${url}`}`
}

export function ProductCard({ product, view }: ProductCardProps) {
  const imageUrl = getImageUrl(Array.isArray(product.images) ? product.images[0] : null)

  if (view === 'list') {
    return (
      <Link
        to={`/products/${product.slug}`}
        className="block rounded-lg border bg-card transition-shadow hover:shadow-md"
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
                <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                  {product.category.name}
                </span>
                <h3 className="truncate text-sm font-semibold">{product.name}</h3>
              </div>
              <Button variant="ghost" size="icon" className="shrink-0">
                <Heart className="h-4 w-4" />
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
                <span className="text-base font-bold">${product.price}</span>
                {product.compareAtPrice && (
                  <span className="text-xs text-muted-foreground line-through">
                    ${product.compareAtPrice}
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
    <Card className="group overflow-hidden transition-transform hover:-translate-y-0.5 hover:shadow-md">
      <Link to={`/products/${product.slug}`} className="block">
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
          
          {/* Badges top-left */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
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

          {/* Heart icon top-right - always visible */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8"
            onClick={(e) => e.preventDefault()}
          >
            <Heart className="h-4 w-4 text-foreground/80 hover:text-foreground" />
          </Button>
        </div>
      </Link>
      <CardContent className="space-y-2 p-3 pt-2">
        {/* Category (brand) */}
        <span className="text-[10px] font-semibold uppercase text-muted-foreground block">
          {product.category.name}
        </span>
        {/* Title */}
        <h3 className="line-clamp-1 text-sm font-semibold">{product.name}</h3>
        {/* Rating */}
        <div className="flex items-center gap-1 text-xs">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          <span className="font-medium">{product.avgRating}</span>
          <span className="text-muted-foreground">({product.reviewCount})</span>
        </div>
        {/* Skin type chips */}
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
            {product.skinTypes.length > 3 && (
              <span className="inline-flex items-center rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
                +{product.skinTypes.length - 3}
              </span>
            )}
          </div>
        )}
        {/* Price and Add to Cart */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold">${product.price}</span>
            {product.compareAtPrice && (
              <span className="text-xs text-muted-foreground line-through">
                ${product.compareAtPrice}
              </span>
            )}
          </div>
          {product.isInStock && (
            <Button size="sm" className="gap-1 text-xs">
              <ShoppingCart className="h-3.5 w-3.5" /> Add
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
