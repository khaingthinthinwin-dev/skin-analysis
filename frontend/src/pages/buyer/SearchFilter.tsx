import { useState, useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { ImageIcon, Heart, ShoppingCart, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { buyerSearchService } from '@/services/buyer-search.service'
import { useAuth } from '@/providers/AuthProvider'
import { useWishlist } from '@/features/buyer/wishlist/hooks/useWishlist'
import { useCart } from '@/features/buyer/cart/hooks/useCart'
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
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const { items: wishlistItems, addToWishlist, removeFromWishlist, isAdding: isWishlistLoading } = useWishlist()
  const { items: cartItems, addToCart, isAdding: isCartLoading } = useCart()

  const [cartDuplicateOpen, setCartDuplicateOpen] = useState(false)
  const [loginRequiredModal, setLoginRequiredModal] = useState<'wishlist' | 'cart' | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['buyer', 'featured-products'],
    queryFn: () => buyerSearchService.searchProducts({ isFeatured: true, limit: 100 }),
  })
  const products = data?.items ?? []

  const wishlistProductIds = useMemo(() => new Set(wishlistItems.map((item) => item.productId)), [wishlistItems])
  const cartProductIds = useMemo(() => new Set(cartItems.map((item) => item.productId)), [cartItems])
  const isBuyer = user?.role === 'buyer'

  const handleWishlistToggle = useCallback(
    async (product: Product) => {
      if (!isAuthenticated) {
        setLoginRequiredModal('wishlist')
        return
      }
      if (!isBuyer) {
        toast.error('Shopping features are only available to buyers.')
        return
      }

      const isInWishlist = wishlistProductIds.has(product.id)
      try {
        if (isInWishlist) {
          await removeFromWishlist(product.id)
          toast.success('Removed from wishlist')
        } else {
          await addToWishlist(product.id)
          toast.success('Added to wishlist')
        }
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number } }
        if (axiosErr?.response?.status === 409) {
          toast.info('Already in your wishlist')
        } else {
          toast.error('Something went wrong. Please try again.')
        }
      }
    },
    [isAuthenticated, isBuyer, wishlistProductIds, addToWishlist, removeFromWishlist],
  )

  const handleAddToCart = useCallback(
    async (product: Product) => {
      if (!isAuthenticated) {
        setLoginRequiredModal('cart')
        return
      }
      if (!isBuyer) {
        toast.error('Shopping features are only available to buyers.')
        return
      }
      if (cartProductIds.has(product.id)) {
        setCartDuplicateOpen(true)
        return
      }

      try {
        await addToCart({ productId: product.id, quantity: 1 })
        toast.success('Added to cart')
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number } }
        if (axiosErr?.response?.status === 409) {
          setCartDuplicateOpen(true)
        } else {
          toast.error('Something went wrong. Please try again.')
        }
      }
    },
    [isAuthenticated, isBuyer, cartProductIds, addToCart],
  )

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
            const inStock = product.stockQuantity > 0
            const isInWishlist = wishlistProductIds.has(product.id)
            return (
              <Card key={product.id} className="group overflow-hidden border-border/80 shadow-xs transition-transform hover:-translate-y-1">
                <Link to={isAuthenticated ? `/buyer/products/${product.slug}` : `/products/${product.slug}`} className="relative block aspect-square w-full bg-muted">
                  <ProductImage product={product} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleWishlistToggle(product)
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
                </Link>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">{product.category?.name || 'Skincare'}</span>
                    <Link to={isAuthenticated ? `/buyer/products/${product.slug}` : `/products/${product.slug}`}>
                      <h3 className="text-sm font-bold text-foreground line-clamp-1 mt-0.5">{product.name}</h3>
                    </Link>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-base font-extrabold text-foreground">{formatPrice(Number(product.price))}</span>
                    {inStock ? (
                      <Button
                        size="sm"
                        className="gap-1 text-xs"
                        onClick={() => handleAddToCart(product)}
                        disabled={isCartLoading}
                      >
                        {isCartLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ShoppingCart className="h-3.5 w-3.5" />
                        )}
                        Add
                      </Button>
                    ) : (
                      <span className="text-xs text-destructive font-medium">Out of stock</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={cartDuplicateOpen} onOpenChange={setCartDuplicateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Already in Cart</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This product is already in cart.
          </p>
          <DialogFooter>
            <Button onClick={() => setCartDuplicateOpen(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={loginRequiredModal !== null} onOpenChange={() => setLoginRequiredModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log In Required</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {loginRequiredModal === 'wishlist'
              ? 'Please log in to add items to your wishlist.'
              : 'Please log in to add items to your cart.'}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLoginRequiredModal(null)}>Cancel</Button>
            <Button onClick={() => { setLoginRequiredModal(null); navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`) }}>Log In</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
