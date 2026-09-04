import { useState, useCallback, useMemo } from 'react'
import { Search, Filter, Sparkles, Heart, ShoppingCart, Star, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { useWishlist } from '@/features/buyer/wishlist/hooks/useWishlist'
import { useCart } from '@/features/buyer/cart/hooks/useCart'
import { GuestLoginModal } from '@/components/common/GuestLoginModal'
import { DuplicateCartAlertDialog } from '@/components/common/DuplicateCartAlertDialog'
import { toast } from 'sonner'
import type { WishlistItem } from '@/types/wishlist-cart.types'

export default function SearchFilter() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const { items: wishlistItems, addToWishlist, removeFromWishlist, isAdding, isRemoving } = useWishlist()
  const { items: cartItems, addToCart, isAdding: isAddingToCart } = useCart()

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [guestModalOpen, setGuestModalOpen] = useState(false)
  const [guestModalType, setGuestModalType] = useState<'wishlist' | 'cart'>('wishlist')
  const [pendingProductId, setPendingProductId] = useState<string | null>(null)
  const [pendingActionType, setPendingActionType] = useState<'wishlist' | 'cart' | null>(null)
  const [isDuplicateCartAlertOpen, setIsDuplicateCartAlertOpen] = useState(false)

  const wishlistProductIds = useMemo(
    () => new Set(wishlistItems.map((item: WishlistItem) => item.productId)),
    [wishlistItems],
  )

  const categories = ['All', 'Cleansers', 'Serums', 'Moisturizers', 'Sunscreens', 'Masks']

  const products = [
    { id: '1b725212-655e-4b87-96be-8224b71aef0e', name: 'Gentle Foam Cleanser', category: 'Cleansers', price: '15,000 MMK', match: '98% Match', rating: 4.9, reviews: 128 },
    { id: 'a6ea7c41-d650-4f00-8d30-35d535381605', name: 'Vitamin C Brightening Serum', category: 'Serums', price: '25,000 MMK', match: '95% Match', rating: 4.8, reviews: 95 },
    { id: '1645ad5e-fe1e-4dde-a728-aa407c90c7de', name: 'Daily Moisture Cream', category: 'Moisturizers', price: '18,000 MMK', match: '92% Match', rating: 4.9, reviews: 210 },
    { id: '0c55d34c-bbbe-4124-b0f7-af7b2e693fde', name: 'UV Protection Sunscreen SPF50', category: 'Sunscreens', price: '20,000 MMK', match: '90% Match', rating: 4.7, reviews: 84 },
  ]

  const filteredProducts = products.filter(
    (p) =>
      (category === 'All' || p.category === category) &&
      p.name.toLowerCase().includes(query.toLowerCase()),
  )

  const handleWishlistToggle = useCallback(
    async (productId: string) => {
      if (!isAuthenticated) {
        setGuestModalType('wishlist')
        setGuestModalOpen(true)
        return
      }
      const isCurrentlyWishlisted = wishlistProductIds.has(productId)
      setPendingProductId(productId)
      setPendingActionType('wishlist')
      try {
        if (isCurrentlyWishlisted) {
          await removeFromWishlist(productId)
          toast.success(t('wishlist.removedFromWishlist', 'Removed from wishlist'))
        } else {
          await addToWishlist(productId)
          toast.success(t('wishlist.addedToWishlist', 'Added to wishlist'))
        }
      } catch {
        toast.error(t('wishlist.failedToUpdate', 'Something went wrong. Please try again.'))
      } finally {
        setPendingProductId(null)
        setPendingActionType(null)
      }
    },
    [isAuthenticated, wishlistProductIds, removeFromWishlist, addToWishlist, t],
  )

  const handleAddToCart = useCallback(
    async (productId: string) => {
      if (!isAuthenticated) {
        setGuestModalType('cart')
        setGuestModalOpen(true)
        return
      }
      if (cartItems.some((item) => item.productId === productId)) {
        setIsDuplicateCartAlertOpen(true)
        return
      }
      setPendingProductId(productId)
      setPendingActionType('cart')
      try {
        await addToCart({ productId, quantity: 1 })
        toast.success(t('cart.addedToCart', 'Added to cart'))
      } catch (error: unknown) {
        const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message
        if (message === 'This product is already in cart.') {
          setIsDuplicateCartAlertOpen(true)
        } else {
          toast.error(t('cart.failedToAdd', 'Something went wrong. Please try again.'))
        }
      } finally {
        setPendingProductId(null)
        setPendingActionType(null)
      }
    },
    [isAuthenticated, cartItems, addToCart, t],
  )

  return (
    <div className="space-y-6 p-2 lg:p-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Cosmetics Search & Filter</h1>
        <p className="text-sm text-muted-foreground">Find skincare products matched to your skin profile</p>
      </div>

      {/* Search Bar & Filter Chips */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by product name, ingredient, or concern..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" /> Filter Options
        </Button>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <Button
            key={cat}
            size="sm"
            variant={category === cat ? 'default' : 'outline'}
            onClick={() => setCategory(cat)}
            className="rounded-full text-xs font-semibold shrink-0"
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Product Results Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {filteredProducts.map((product) => {
          const wishlisted = wishlistProductIds.has(product.id)
          const isWishlistPending = pendingProductId === product.id && pendingActionType === 'wishlist'
          const isCartPending = pendingProductId === product.id && pendingActionType === 'cart'

          return (
            <Card key={product.id} className="group overflow-hidden border-border/80 shadow-xs transition-transform hover:-translate-y-1">
              <div className="relative h-44 bg-gradient-to-tr from-purple-100/60 via-purple-50/30 to-pink-100/60 flex items-center justify-center p-4">
                <span className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-pink-500 text-white px-2 py-0.5 text-[10px] font-extrabold uppercase shadow-xs">
                  <Sparkles className="h-3 w-3" /> {product.match}
                </span>
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/80 dark:bg-zinc-800/80 shadow-md">
                  <Sparkles className="h-10 w-10 text-purple-600" />
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={isWishlistPending || isAdding || isRemoving}
                  className={`absolute top-3 right-3 hover:text-pink-500 transition-colors ${
                    wishlisted ? 'text-pink-500' : 'text-muted-foreground'
                  }`}
                  onClick={() => handleWishlistToggle(product.id)}
                >
                  {isWishlistPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Heart className={`h-4 w-4 ${wishlisted ? 'fill-pink-500' : ''}`} />
                  )}
                </Button>
              </div>
              <CardContent className="p-4 space-y-3">
                <div>
                  <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">{product.category}</span>
                  <h3 className="text-sm font-bold text-foreground line-clamp-1 mt-0.5">{product.name}</h3>
                </div>

                <div className="flex items-center gap-1 text-xs text-amber-500 font-semibold">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <span>{product.rating}</span>
                  <span className="text-muted-foreground font-normal">({product.reviews})</span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <span className="text-base font-extrabold text-foreground">{product.price}</span>
                  <Button
                    size="sm"
                    disabled={isCartPending || isAddingToCart}
                    className="gap-1.5 bg-primary text-xs font-bold"
                    onClick={() => handleAddToCart(product.id)}
                  >
                    {isCartPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ShoppingCart className="h-3.5 w-3.5" />
                    )}{' '}
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <GuestLoginModal
        open={guestModalOpen}
        onClose={() => setGuestModalOpen(false)}
        messageKey={guestModalType}
      />
      <DuplicateCartAlertDialog
        open={isDuplicateCartAlertOpen}
        onClose={() => setIsDuplicateCartAlertOpen(false)}
      />
    </div>
  )
}
