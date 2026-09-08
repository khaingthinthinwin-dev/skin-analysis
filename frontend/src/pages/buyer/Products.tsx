import { useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Search as SearchIcon, Loader2 } from 'lucide-react'
import type { SearchParams } from '@/schemas/search.schema'
import { Pagination } from '@/components/Pagination'
import { categoryService } from '@/features/search/services/category.service'
import { SearchBar } from '@/features/search/components/SearchBar'
import { FilterPanel } from '@/features/search/components/FilterPanel'
import { FilterChips } from '@/features/search/components/FilterChips'
import { ViewToggle } from '@/features/search/components/ViewToggle'
import { SortSelect } from '@/features/search/components/SortSelect'
import { SponsoredAdSlider } from '@/features/search/components/SponsoredAdSlider'
import { ProductCard } from '@/features/search/components/ProductCard'
import { useProductSearch } from '@/features/search/hooks/useProductSearch'
import type { ViewMode } from '@/types/search.types'
import { useEffect, useState } from 'react'
import type { CategoryNode } from '@/types/search.types'

const VIEW_MODE_KEY = 'search.viewMode'

function readInitialViewMode(): ViewMode {
  const stored = localStorage.getItem(VIEW_MODE_KEY)
  return stored === 'list' ? 'list' : 'grid'
}

export default function Products() {
  const [, setSearchParams] = useSearchParams()
  const [view, setView] = useState<ViewMode>(readInitialViewMode)

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
          {/* Toolbar above grid */}
          <div className="flex flex-wrap items-center justify-end gap-3 mb-4">
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
                    ? 'grid gap-4 grid-cols-3 min-w-0'
                    : 'space-y-4 min-w-0'
                }
              >
                {Array.isArray(products) && products.map((product) => (
                  <ProductCard key={product.id} product={product} view={view} />
                ))}
              </div>

              {meta && (
                <Pagination
                  meta={meta}
                  onLimitChange={handleLimitChange}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}