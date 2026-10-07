import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Eye, MessageSquare, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { PaginationControls } from '@/components/PaginationControls'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useProduct, useProducts } from '@/hooks/useProducts'
import { formatPrice } from '@/lib/format'
import type { ProductQueryParams } from '@/types/product.types'

function getImageUrl(url: string): string {
  if (!url || url.startsWith('http')) return url
  const raw = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'
  return raw.replace(/\/api\/v1\/?$/, '') + url
}

export default function ProductReview() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const highlightedProductId = searchParams.get('highlight')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const queryParams: ProductQueryParams = {
    search: search || undefined,
    page,
    limit,
  }
  const { data, isLoading, error } = useProducts(queryParams)
  const {
    data: highlightedProduct,
    isLoading: isHighlightedProductLoading,
    error: highlightedProductError,
  } = useProduct(highlightedProductId ?? '')
  const products = useMemo(() => data?.items ?? [], [data?.items])
  const displayedProducts = useMemo(() => {
    if (
      !highlightedProduct ||
      products.some((product) => product.id === highlightedProduct.id)
    ) {
      return products
    }
    return [highlightedProduct, ...products]
  }, [highlightedProduct, products])
  const highlightedProductUnavailable =
    highlightedProductId !== null &&
    Boolean(highlightedProductError) &&
    !products.some((product) => product.id === highlightedProductId)
  const meta = data?.meta
  const productHeaderClass =
    'text-left align-middle h-12 px-4 text-sm font-bold text-muted-foreground border-b border-border bg-primary/10 hover:bg-primary/10 whitespace-nowrap'

  return (
    <div className="space-y-6 p-2 lg:p-4">
      <Card>
        <div className="flex flex-col gap-4 p-5 pb-0 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
              <MessageSquare className="h-5 w-5 text-purple-600 sm:h-6 sm:w-6" />
              Product Review
            </h1>
            <p className="text-sm text-muted-foreground">
              View review counts for your products
            </p>
          </div>
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              aria-label="Search products"
              placeholder="Search products..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              className="pl-9"
            />
          </div>
        </div>

        {isLoading || (highlightedProductId && isHighlightedProductLoading) ? (
          <LoadingSpinner className="min-h-[400px]" />
        ) : error ? (
          <CardContent className="py-10 text-center">
            <p className="text-destructive">Failed to load products. Please try again.</p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        ) : (
          <>
            <div className="mx-5 mt-5 overflow-x-auto rounded-md border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={productHeaderClass}>Image</TableHead>
                    <TableHead className={productHeaderClass}>Product Name</TableHead>
                    <TableHead className={productHeaderClass}>SKU</TableHead>
                    <TableHead className={productHeaderClass}>Price (Discount Price)</TableHead>
                    <TableHead className={productHeaderClass}>Compare At Price</TableHead>
                    <TableHead className={productHeaderClass}>Review Count</TableHead>
                    <TableHead className={`${productHeaderClass} text-right`}>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedProducts.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                        No products found
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedProducts.map((product) => {
                      const price = Number(product.price)
                      const compareAtPrice =
                        product.compareAtPrice == null || product.compareAtPrice === ''
                          ? null
                          : Number(product.compareAtPrice)
                      return (
                        <TableRow
                          key={product.id}
                          className={
                            product.id === highlightedProductId
                              ? 'hover:bg-transparent border-b-0 [&>td]:border-y-2 [&>td]:border-purple-500 [&>td]:bg-purple-500/5 [&>td:first-child]:border-l-2 [&>td:first-child]:rounded-l-md [&>td:last-child]:border-r-2 [&>td:last-child]:rounded-r-md'
                              : 'hover:bg-transparent'
                          }
                        >
                          <TableCell>
                            {product.images[0] ? (
                              <img
                                src={getImageUrl(product.images[0])}
                                alt={product.name}
                                className="h-10 w-10 rounded object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                                No img
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium text-foreground">{product.name}</TableCell>
                          <TableCell className="font-mono text-xs">{product.sku || '—'}</TableCell>
                          <TableCell>{formatPrice(price)}</TableCell>
                          <TableCell>
                            {compareAtPrice == null ? (
                              '—'
                            ) : (
                              <span
                                className={
                                  compareAtPrice > price
                                    ? 'font-semibold line-through'
                                    : 'font-semibold'
                                }
                              >
                                {formatPrice(compareAtPrice)}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>{product.reviewCount}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() =>
                                navigate(
                                  `/merchant/products/${product.slug || product.id}/view`,
                                )
                              }
                              aria-label={`View ${product.name}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            {highlightedProductUnavailable && (
              <p className="px-5 pt-3 text-sm text-destructive" role="alert">
                The product linked from this notification could not be loaded.
              </p>
            )}
            {meta && (
              <div className="px-5 pb-5">
                <PaginationControls
                  page={page}
                  totalPages={meta.totalPages}
                  onPageChange={setPage}
                  limit={limit}
                  onLimitChange={(newLimit) => {
                    setLimit(newLimit)
                    setPage(1)
                  }}
                />
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
