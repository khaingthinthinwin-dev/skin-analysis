import { useSearchParams, useNavigate, useLocation } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Search as SearchIcon, Loader2, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import type { SearchParams } from '@/schemas/search.schema'
import { categoryService } from '@/features/search/services/category.service'
import { SearchBar } from '@/features/search/components/SearchBar'
import { FilterPanel } from '@/features/search/components/FilterPanel'
import { FilterChips } from '@/features/search/components/FilterChips'
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
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
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
  const [, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [view, setView] = useState<ViewMode>(readInitialViewMode)
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
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)

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

  const { data, isLoading, isError, params, updateParams } = useProductSearch()

  const { data: categoryData } = useQuery({
    queryKey: ['categories'] as const,
    queryFn: categoryService.getTree,
    staleTime: 30 * 60 * 1000,
  })

  const categories = categoryData?.data ?? []
  const products = data?.data ?? []
  const meta = data?.meta

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

  const resolveCategoryName = (categories: CategoryNode[], id: string): string | null => {
    if (!id) return null
    for (const cat of categories) {
      if (cat.id === id) return cat.name
      const child = resolveCategoryName(cat.children, id)
      if (child) return child
    }
    return null
  }

  const isGuestRoute = pathname === '/products'

  return (
    <div
      className={isGuestRoute
        ? 'mx-auto w-full max-w-[1400px] space-y-6 bg-[#faf8ff] px-6 py-6 text-slate-900 dark:bg-[#0f0f14] dark:text-white sm:px-8 lg:px-12'
        : 'w-full min-w-0 space-y-6 bg-[#faf8ff] p-2 text-slate-900 dark:bg-[#0f0f14] dark:text-white lg:p-4'}
    >
      {/* A. Page header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Cosmetics Search & Filter
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
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

      <FilterChips
        params={params}
        onRemove={handleRemoveChip}
        onClearAll={hasActiveFilters ? handleClearAll : undefined}
        categoryName={resolveCategoryName(categories, params.categoryId)}
      />

      {/* Main content area: desktop sidebar + product grid */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left Sidebar - Filters */}
        <aside className="hidden w-full flex-shrink-0 lg:block lg:w-72">
          <div className="max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#181028] lg:sticky lg:top-0">
            <FilterPanel
              params={params}
              onUpdate={handleFilterUpdate}
              categories={categories}
              onReset={handleClearAll}
            />
          </div>
        </aside>

        {/* Product grid */}
        <div className="flex-1 min-w-0">
          {/* Toolbar above grid */}
          <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full border-slate-200 bg-white px-4 text-slate-700 shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-[#181028] dark:text-slate-200 dark:hover:bg-white/10 lg:hidden"
              onClick={() => setMobileFilterOpen(true)}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filters
            </Button>
            <SortSelect
              sort={params.sort}
              order={params.order}
              onChange={(sort, order) => handleFilterUpdate({ sort, order })}
            />
            <ViewToggle view={view} onChange={setView} />
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
                    ? 'grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3'
                    : 'space-y-4 min-w-0'
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
                <>
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
                </>
              )}
            </>
          )}
        </div>
      </div>

      <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
        <SheetContent side="right" className="flex flex-col overflow-hidden bg-[#f3f5f8] p-0 dark:bg-[#181028] sm:max-w-md">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-14">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-6 w-7 rounded-full bg-slate-200/80 dark:bg-white/10" />
                <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Filters</h2>
              </div>
            </div>
            <FilterPanel
              params={params}
              onUpdate={(updates) => {
                handleFilterUpdate(updates)
              }}
              categories={categories}
              variant="mobile"
            />
          </div>
          <div className="flex shrink-0 items-center gap-3 border-t border-slate-200 bg-white px-5 py-4 dark:border-white/10 dark:bg-[#100b18]">
            <button
              type="button"
              onClick={handleClearAll}
              className="shrink-0 text-sm font-medium text-slate-600 underline underline-offset-2 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              Clear All
            </button>
            <Button
              type="button"
              onClick={() => setMobileFilterOpen(false)}
              className="h-11 flex-1 rounded-full bg-slate-950 text-sm font-bold text-white shadow-sm hover:bg-slate-800"
            >
              Show {meta?.total ?? products.length} Products
            </Button>
          </div>
        </SheetContent>
      </Sheet>

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
