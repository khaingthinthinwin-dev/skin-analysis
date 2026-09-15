import { useSearchParams, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Search as SearchIcon, Loader2 } from 'lucide-react'
import type { SearchParams } from '@/schemas/search.schema'
import { PAGE_SIZE_OPTIONS } from '@/schemas/search.schema'
import { categoryService } from '@/features/search/services/category.service'
import { SearchBar } from '@/features/search/components/SearchBar'
import { FilterPanel } from '@/features/search/components/FilterPanel'
import { FilterChips } from '@/features/search/components/FilterChips'
import { ViewToggle } from '@/features/search/components/ViewToggle'
import { SortSelect } from '@/features/search/components/SortSelect'
import { SponsoredAdSlider } from '@/features/search/components/SponsoredAdSlider'
import { ProductCard } from '@/features/search/components/ProductCard'
import { useProductSearch } from '@/features/search/hooks/useProductSearch'
import type { ViewMode, ProductSummary } from '@/types/search.types'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CategoryNode } from '@/types/search.types'
import { toast } from 'sonner'
import { useAuth } from '@/providers/AuthProvider'
import { useWishlist } from '@/features/buyer/wishlist/hooks/useWishlist'
import { useCart } from '@/features/buyer/cart/hooks/useCart'

const VIEW_MODE_KEY = 'search.viewMode'

function readInitialViewMode(): ViewMode {
  const stored = localStorage.getItem(VIEW_MODE_KEY)
  return stored === 'list' ? 'list' : 'grid'
}

export default function Products() {
  const [, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [view, setView] = useState<ViewMode>(readInitialViewMode)
  const { isAuthenticated, user } = useAuth()
  const { items: wishlistItems, addToWishlist, removeFromWishlist, isAdding: isWishlistLoading } = useWishlist()
  const { items: cartItems, addToCart, isAdding: isCartLoading } = useCart()

  const [cartDuplicateOpen, setCartDuplicateOpen] = useState(false)
  const [loginRequiredModal, setLoginRequiredModal] = useState<'wishlist' | 'cart' | null>(null)

  useEffect(() => {
    localStorage.setItem(VIEW_MODE_KEY, view)
  }, [view])

  const { data, isLoading, isError, params, updateParams } = useProductSearch()

  const { data: categoryData } = useQuery({
    queryKey: ['categories'] as const,
    queryFn: categoryService.getTree,
    staleTime: 30 * 60 * 1000,
  })

  const categories = categoryData?.data ?? []
  const products = data?.data ?? []
  const meta = data?.meta

  const wishlistProductIds = useMemo(() => new Set(wishlistItems.map((item) => item.productId)), [wishlistItems])
  const cartProductIds = useMemo(() => new Set(cartItems.map((item) => item.productId)), [cartItems])
  const isBuyer = user?.role === 'buyer'

  const handleWishlistToggle = useCallback(
    async (product: ProductSummary) => {
      if (!isAuthenticated) {
        setLoginRequiredModal('wishlist')
        return
      }
      if (!isBuyer) {
        toast.error('Shopping features are only available to buyers.')
        return
      }

      const inWishlist = wishlistProductIds.has(product.id)
      try {
        if (inWishlist) {
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
    async (product: ProductSummary) => {
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

  const serializeToUrl = (p: SearchParams) => {
    const entries: [string, string][] = []
    if (p.q) entries.push(['q', p.q])
    if (p.categoryId) entries.push(['categoryId', p.categoryId])
    if (p.skinTypes.length) entries.push(['skinTypes', p.skinTypes.join(',')])
    if (p.ingredients.length) entries.push(['ingredients', p.ingredients.join(',')])
    if (p.tags.length) entries.push(['tags', p.tags.join(',')])
    if (p.minPrice !== undefined) entries.push(['minPrice', String(p.minPrice)])
    if (p.maxPrice !== undefined) entries.push(['maxPrice', String(p.maxPrice)])
    if (p.rating !== undefined) entries.push(['rating', String(p.rating)])
    if (p.sort !== 'createdAt') entries.push(['sort', p.sort])
    if (p.order !== 'desc') entries.push(['order', p.order])
    if (p.page > 1) entries.push(['page', String(p.page)])
    if (p.limit !== 20) entries.push(['limit', String(p.limit)])
    setSearchParams(Object.fromEntries(entries), { replace: true })
  }

  const handleSearchBarSubmit = (q: string) => {
    updateParams({ q, page: 1 })
  }

  const handleFilterUpdate = (updates: Partial<SearchParams>) => {
    const next = { ...params, ...updates, page: 1 }
    serializeToUrl(next)
  }

  const handleRemoveChip = (key: string, value?: string) => {
    if (key === 'q') {
      serializeToUrl({ ...params, q: '', page: 1 })
    } else if (key === 'categoryId') {
      serializeToUrl({ ...params, categoryId: '', page: 1 })
    } else if (key === 'skinTypes' && value) {
      serializeToUrl({ ...params, skinTypes: params.skinTypes.filter((t) => t !== value) as SearchParams['skinTypes'], page: 1 })
    } else if (key === 'ingredients' && value) {
      serializeToUrl({ ...params, ingredients: params.ingredients.filter((i) => i !== value), page: 1 })
    } else if (key === 'tags' && value) {
      serializeToUrl({ ...params, tags: params.tags.filter((t) => t !== value), page: 1 })
    } else if (key === 'minPrice') {
      serializeToUrl({ ...params, minPrice: undefined, page: 1 })
    } else if (key === 'maxPrice') {
      serializeToUrl({ ...params, maxPrice: undefined, page: 1 })
    } else if (key === 'rating') {
      serializeToUrl({ ...params, rating: undefined, page: 1 })
    }
  }

  const hasActiveFilters =
    params.q !== '' ||
    params.categoryId !== '' ||
    params.skinTypes.length > 0 ||
    params.ingredients.length > 0 ||
    params.tags.length > 0 ||
    params.minPrice !== undefined ||
    params.maxPrice !== undefined ||
    params.rating !== undefined

  const handleClearAll = () => {
    serializeToUrl({
      q: '',
      categoryId: '',
      skinTypes: [],
      ingredients: [],
      tags: [],
      minPrice: undefined,
      maxPrice: undefined,
      rating: undefined,
      sort: params.sort,
      order: params.order,
      page: 1,
      limit: params.limit,
    })
  }

  const handleResetFilters = () => {
    serializeToUrl({
      q: params.q,
      categoryId: '',
      skinTypes: [],
      ingredients: [],
      tags: [],
      minPrice: undefined,
      maxPrice: undefined,
      rating: undefined,
      sort: params.sort,
      order: params.order,
      page: 1,
      limit: params.limit,
    })
  }

  const handlePageChange = (page: number) => {
    serializeToUrl({ ...params, page })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleLimitChange = (limit: number) => {
    serializeToUrl({ ...params, limit, page: 1 })
  }

  const resolveCategoryName = (categories: CategoryNode[], id: string): string | null => {
    if (!id) return null
    for (const cat of categories) {
      if (cat.id === id) return cat.name
      const child = resolveCategoryName(cat.children, id)
      if (child) return child
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* A. Page header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          Cosmetics Search & Filter
        </h1>
        <p className="text-sm text-muted-foreground">
          Find skincare products matched to your skin profile
        </p>
      </div>

      {/* Advertisement panel */}
      <SponsoredAdSlider />

      {/* Search bar - full width */}
      <SearchBar
        value={params.q}
        onChange={(q) => handleFilterUpdate({ q })}
        onSubmit={handleSearchBarSubmit}
      />

      <FilterChips
        params={params}
        onRemove={handleRemoveChip}
        onClearAll={hasActiveFilters ? handleClearAll : undefined}
        categoryName={resolveCategoryName(categories, params.categoryId)}
      />

      {/* Main content area: Fixed left sidebar + Product grid on right */}
      <div className="flex gap-6">
        {/* Left Sidebar - Filters */}
        <aside className="w-72 flex-shrink-0">
          <div className="lg:sticky lg:top-0 max-h-[calc(100vh-6rem)] overflow-y-auto border rounded-lg bg-card p-4">
            <FilterPanel
              params={params}
              onUpdate={handleFilterUpdate}
              categories={categories}
              onReset={handleResetFilters}
            />
          </div>
        </aside>

        {/* Right Content - Product Grid */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <p className="text-sm text-muted-foreground">
              {meta ? (
                <>
                  Showing{' '}
                  <span className="font-medium text-foreground">
                    {(meta.page - 1) * meta.limit + 1}-
                    {Math.min(meta.page * meta.limit, meta.total)}
                  </span>{' '}
                  of <span className="font-medium text-foreground">{meta.total}</span> products
                </>
              ) : (
                'Loading...'
              )}
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Show</span>
                <Select value={String(params.limit)} onValueChange={(v) => handleLimitChange(Number(v))}>
                  <SelectTrigger className="w-[70px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <SortSelect
                sort={params.sort}
                order={params.order}
                onChange={(sort, order) => handleFilterUpdate({ sort, order })}
              />
              <ViewToggle view={view} onChange={setView} />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <SearchIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold">Something went wrong</h3>
              <p className="text-sm text-muted-foreground">Failed to load products. Please try again.</p>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <SearchIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold">No products found</h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          ) : (
            <>
              <div
                className={
                  view === 'grid'
                    ? 'grid gap-4 grid-cols-3 min-w-0'
                    : 'space-y-4 min-w-0'
                }
              >
                {Array.isArray(products) && products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    view={view}
                    productLink={isAuthenticated ? `/buyer/products/${product.slug}` : `/products/${product.slug}`}
                    isInWishlist={wishlistProductIds.has(product.id)}
                    onWishlistToggle={handleWishlistToggle}
                    onAddToCart={handleAddToCart}
                    isWishlistLoading={isWishlistLoading}
                    isCartLoading={isCartLoading}
                  />
                ))}
              </div>

              {/* Pagination - outside product cards, clearly separated */}
              {meta && meta.totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2 pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={meta.page <= 1}
                    onClick={() => handlePageChange(meta.page - 1)}
                  >
                    Previous
                  </Button>
                  {Array.from({ length: Math.min(meta.totalPages, 5) }, (_, i) => {
                    let pageNum: number
                    if (meta.totalPages <= 5) {
                      pageNum = i + 1
                    } else if (meta.page <= 3) {
                      pageNum = i + 1
                    } else if (meta.page >= meta.totalPages - 2) {
                      pageNum = meta.totalPages - 4 + i
                    } else {
                      pageNum = meta.page - 2 + i
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={meta.page === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={meta.page >= meta.totalPages}
                    onClick={() => handlePageChange(meta.page + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

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
            <Button onClick={() => { setLoginRequiredModal(null); navigate('/login?redirect=/buyer/products') }}>Log In</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}