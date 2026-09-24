import { useLocation, useSearchParams, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Search as SearchIcon, Loader2, SlidersHorizontal, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import type { SearchParams } from '@/schemas/search.schema'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { categoryService } from '@/features/search/services/category.service'
import { SearchBar } from '@/features/search/components/SearchBar'
import { FilterPanel } from '@/features/search/components/FilterPanel'
import { FilterChips } from '@/features/search/components/FilterChips'
import { MobileFilterSheet } from '@/features/search/components/MobileFilterSheet'
import { ViewToggle } from '@/features/search/components/ViewToggle'
import { SortSelect } from '@/features/search/components/SortSelect'
import { SponsoredAdSlider } from '@/features/search/components/SponsoredAdSlider'
import { ProductCard } from '@/features/search/components/ProductCard'
import { useProductSearch } from '@/features/search/hooks/useProductSearch'
import { useWishlist } from '@/features/buyer/wishlist/hooks/useWishlist'
import { useCart } from '@/features/buyer/cart/hooks/useCart'
import { useAuth } from '@/providers/AuthProvider'
import { DuplicateCartAlertDialog } from '@/components/common/DuplicateCartAlertDialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ViewMode } from '@/types/search.types'
import type { ProductSummary } from '@/types/search.types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CategoryNode } from '@/types/search.types'

const VIEW_MODE_KEY = 'search.viewMode'

function readInitialViewMode(): ViewMode {
  const stored = localStorage.getItem(VIEW_MODE_KEY)
  return stored === 'list' ? 'list' : 'grid'
}

export default function Products() {
  const location = useLocation()
  const [, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [view, setView] = useState<ViewMode>(readInitialViewMode)
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false)
  const { isAuthenticated } = useAuth()
  const { items: wishlistItems, addToWishlist, removeFromWishlist } = useWishlist()
  const { items: cartItems, addToCart } = useCart()

  const wishlistProductIds = useMemo(
    () => new Set(wishlistItems.map((item) => item.productId)),
    [wishlistItems],
  )

  const cartProductIds = useMemo(
    () => new Set(cartItems.map((item) => item.productId)),
    [cartItems],
  )

  const [wishlistLoadingId, setWishlistLoadingId] = useState<string | null>(null)
  const [cartLoadingId, setCartLoadingId] = useState<string | null>(null)
  const [cartDuplicateOpen, setCartDuplicateOpen] = useState(false)
  const [guestLoginOpen, setGuestLoginOpen] = useState(false)
  const [guestLoginMessage, setGuestLoginMessage] = useState('')

  const handleWishlistToggle = useCallback(
    async (product: ProductSummary) => {
      if (!isAuthenticated) {
        setGuestLoginMessage('Please log in to use the wishlist')
        setGuestLoginOpen(true)
        return
      }
      const isInWishlist = wishlistProductIds.has(product.id)
      setWishlistLoadingId(product.id)
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
      } finally {
        setWishlistLoadingId(null)
      }
    },
    [isAuthenticated, wishlistProductIds, addToWishlist, removeFromWishlist],
  )

  const handleAddToCart = useCallback(
    async (product: ProductSummary) => {
      if (!isAuthenticated) {
        setGuestLoginMessage('Please log in to add items to your cart')
        setGuestLoginOpen(true)
        return
      }
      if (cartProductIds.has(product.id)) {
        setCartDuplicateOpen(true)
        return
      }
      setCartLoadingId(product.id)
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
      } finally {
        setCartLoadingId(null)
      }
    },
    [isAuthenticated, cartProductIds, addToCart],
  )

  useEffect(() => {
    localStorage.setItem(VIEW_MODE_KEY, view)
  }, [view])

  const { data, isLoading, isError, params, updateParams } = useProductSearch({
    featuredOnly: location.pathname === '/products',
  })

  const { data: categoryData } = useQuery({
    queryKey: ['categories'] as const,
    queryFn: categoryService.getTree,
    staleTime: 30 * 60 * 1000,
  })

  const categories = categoryData?.data ?? []
  const products = data?.data ?? []
  const meta = data?.meta

  const activeFilterCount =
    (params.categoryId !== '' ? 1 : 0) +
    params.skinTypes.length +
    params.ingredients.length +
    params.tags.length +
    (params.minPrice !== undefined ? 1 : 0) +
    (params.maxPrice !== undefined ? 1 : 0) +
    (params.rating !== undefined ? 1 : 0)

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
    if (p.limit !== 12) entries.push(['limit', String(p.limit)])
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

  const resolveCategoryName = (categories: CategoryNode[], id: string): string | null => {
    if (!id) return null
    for (const cat of categories) {
      if (cat.id === id) return cat.name
      const child = resolveCategoryName(cat.children, id)
      if (child) return child
    }
    return null
  }

  const categoryName = resolveCategoryName(categories, params.categoryId)
  const isGuestProductsPage = location.pathname === '/products'

  return (
    <div className={`${isGuestProductsPage ? 'mx-auto max-w-7xl' : ''} w-full space-y-6 overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8`}>
      {/* A. Page header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          Cosmetics Search & Filter
        </h1>
        <p className="text-sm text-muted-foreground">
          Find skincare products matched to your skin profile
        </p>
      </div>

      {/* Search bar - full width */}
      <SearchBar
        value={params.q}
        onChange={(q) => handleFilterUpdate({ q })}
        onSubmit={handleSearchBarSubmit}
      />

      {/* Advertisement panel */}
      <SponsoredAdSlider />

      <div className="md:hidden">
        <div className="mb-4 flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setIsMobileFilterOpen(true)}>
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge className="ml-2 h-5 min-w-5 rounded-full px-1 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
          <SortSelect
            sort={params.sort}
            order={params.order}
            onChange={(sort, order) => handleFilterUpdate({ sort, order })}
          />
          <ViewToggle view={view} onChange={setView} />
        </div>
        <FilterChips
          params={params}
          onRemove={handleRemoveChip}
          onClearAll={hasActiveFilters ? handleClearAll : undefined}
          categoryName={categoryName}
        />
      </div>

      <MobileFilterSheet
        open={isMobileFilterOpen}
        onOpenChange={setIsMobileFilterOpen}
        params={params}
        onUpdate={handleFilterUpdate}
        categories={categories}
        onClearAll={handleClearAll}
        onApply={() => setIsMobileFilterOpen(false)}
        activeFilterCount={activeFilterCount}
        totalProductCount={meta?.total}
      />

      {/* Main content area: Fixed left sidebar + Product grid on right */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[250px_1fr] md:gap-8">
        {/* Left Sidebar - Filters */}
        <aside className="hidden md:block">
          <div className="sticky top-0 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-lg border bg-card p-4">
            <FilterPanel
              params={params}
              onUpdate={handleFilterUpdate}
              categories={categories}
              onReset={handleResetFilters}
            />
          </div>
        </aside>

        {/* Right Content - Product Grid */}
        <div className="min-w-0 flex-1">
          {/* Toolbar above grid */}
          <div className="mb-4 hidden flex-wrap items-center justify-end gap-3 md:flex">
            <div className="ml-auto flex items-center gap-3">
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
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  className="mt-4 gap-2"
                  onClick={handleClearAll}
                >
                  <RefreshCw className="h-4 w-4" />
                  Reset Filters
                </Button>
              )}
            </div>
          ) : (
            <>
              <div
                className={
                  view === 'grid'
                    ? 'grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'
                    : 'min-w-0 space-y-4'
                }
              >
                {Array.isArray(products) && products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    view={view}
                    productLink={`/buyer/products/${product.slug}`}
                    isInWishlist={wishlistProductIds.has(product.id)}
                    onWishlistToggle={handleWishlistToggle}
                    onAddToCart={handleAddToCart}
                    isWishlistLoading={wishlistLoadingId === product.id}
                    isCartLoading={cartLoadingId === product.id}
                  />
                ))}
              </div>

              {meta && (
                <div className="flex justify-center items-center gap-2 mt-8">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => updateParams({ ...params, page: params.page > 1 ? params.page - 1 : 1 })}
                    disabled={params.page <= 1}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground hover:bg-muted disabled:opacity-40">
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  {Array.from({ length: meta?.totalPages || 1 }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => updateParams({ ...params, page })}
                      className={`
                        flex h-10 w-10 items-center justify-center rounded-xl ${params.page === page
                          ? 'bg-primary font-bold text-primary-foreground'
                          : 'border border-border bg-background text-foreground hover:bg-muted'}
                      `}
                    >
                      {page}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => updateParams({ ...params, page: params.page < meta?.totalPages ? params.page + 1 : meta?.totalPages })}
                    disabled={params.page >= (meta?.totalPages || 1)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground hover:bg-muted disabled:opacity-40">
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Guest Login Modal */}
      <Dialog open={guestLoginOpen} onOpenChange={setGuestLoginOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Login Required</DialogTitle>
            <DialogDescription>{guestLoginMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGuestLoginOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => navigate('/login')}>
              Login
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cart Duplicate Modal */}
      <DuplicateCartAlertDialog
        open={cartDuplicateOpen}
        onClose={() => setCartDuplicateOpen(false)}
      />
    </div>
  )
}
