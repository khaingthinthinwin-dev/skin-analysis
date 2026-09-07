import { useState } from 'react'
import { Link } from 'react-router'
import { ImageIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useQuery } from '@tanstack/react-query'
import { buyerSearchService } from '@/services/buyer-search.service'
import type { Product } from '@/types/product.types'
import { formatPrice } from '@/lib/format'

function getImageUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('http')) return url
  const raw = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'
  const base = raw.replace(/\/api\/v1\/?$/, '')
  return base + url
}

function ProductImage({ product }: { product: Product }) {
  const [hasError, setHasError] = useState(false)
  const imageUrl = product.images?.[0] ? getImageUrl(product.images[0]) : ''

  if (!imageUrl || hasError) {
    return (
      <div className="flex h-full items-center justify-center">
        <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
      </div>
    )
  }

  return (
    <img
      src={imageUrl}
      alt={product.name}
      className="h-full w-full object-cover"
      onError={() => setHasError(true)}
    />
  )
}

export default function SearchFilter() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['buyer', 'featured-products'],
    queryFn: () => buyerSearchService.searchProducts({ isFeatured: true, limit: 100 }),
  })
  const products = data?.items ?? []

  return (
    <div className="space-y-6 p-2 lg:p-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Featured Products</h1>
        <p className="text-sm text-muted-foreground">Discover products selected for you</p>
      </div>

      {isLoading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Loading featured products...</p>
      ) : error ? (
        <p className="py-12 text-center text-sm text-destructive">Unable to load featured products.</p>
      ) : products.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No featured products available.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            return (
              <Card key={product.id} className="group overflow-hidden border-border/80 shadow-xs transition-transform hover:-translate-y-1">
                <Link to={`/buyer/products/${product.slug}`} className="relative block aspect-square w-full bg-muted">
                  <ProductImage product={product} />
                </Link>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">{product.category?.name || 'Skincare'}</span>
                    <Link to={`/buyer/products/${product.slug}`}>
                      <h3 className="text-sm font-bold text-foreground line-clamp-1 mt-0.5">{product.name}</h3>
                    </Link>
                  </div>

                  <span className="text-base font-extrabold text-foreground">{formatPrice(Number(product.price))}</span>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
