import { useState, useCallback, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { Package, Plus, Search, Filter, Trash2, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ProductTable } from '@/components/merchant/ProductTable'
import { DeleteConfirmDialog } from '@/components/merchant/DeleteConfirmDialog'
import { useTranslation } from 'react-i18next'
import {
  useProducts,
  useUpdateStock,
  useToggleFeatured,
  useBulkUpdateStatus,
  useBulkDelete,
  useDeleteAll,
  useCheckActiveOrders,
} from '@/hooks/useProducts'
import { useAuth } from '@/hooks/useAuth'
import { useMerchantProductsGuard } from '@/features/merchant/products/guards/merchantProducts.guard'
import { AccountDeactivatedBanner } from '@/components/merchant/AccountDeactivatedBanner'
import type { ProductQueryParams } from '@/types/product.types'

export default function ProductManagement() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const guard = useMerchantProductsGuard()
  const status =
    user?.licenseStatus ||
    user?.license_status
  const isPending = guard.isPending || status === 'pending'
  const isDeactivated =
    guard.isDeactivated ||
    user?.isActive === false ||
    user?.is_active === false ||
    user?.status === 'deactivated' ||
    user?.status === 'inactive'
  const showPendingBanner = (guard.showPendingBanner || isPending) && !isDeactivated
  const showDeactivatedBanner = guard.showDeactivatedBanner || isDeactivated
  const showCrudActions = guard.showCrudActions && !isPending && !isDeactivated

  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<ProductQueryParams['sortBy']>('newest')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deleteAllOpen, setDeleteAllOpen] = useState(false)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [skippedIds, setSkippedIds] = useState<string[]>([])
  const [deleteAllSkippedIds, setDeleteAllSkippedIds] = useState<string[]>([])

  const queryParams: ProductQueryParams = {
    search: search || undefined,
    isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
    sortBy,
    page,
    limit: 10,
  }

  const { data, isLoading, error } = useProducts(queryParams)
  const updateStock = useUpdateStock()
  const toggleFeatured = useToggleFeatured()
  const bulkUpdate = useBulkUpdateStatus()
  const bulkDelete = useBulkDelete()
  const deleteAll = useDeleteAll()
  const checkActiveOrders = useCheckActiveOrders()
  const checkActiveOrdersMutate = checkActiveOrders.mutate

  const products = useMemo(() => data?.items || [], [data?.items])
  const meta = data?.meta

  const selectedProducts = useMemo(
    () => products.filter((p) => selectedIds.includes(p.id)),
    [products, selectedIds],
  )

  const deleteBreakdown = useMemo(() => {
    const skippedSet = new Set(skippedIds)
    const deactivateCount = selectedProducts.filter((p) => p.isActive && !skippedSet.has(p.id)).length
    const permanentCount = selectedProducts.filter((p) => !p.isActive && !skippedSet.has(p.id)).length
    const skippedCount = selectedProducts.filter((p) => skippedSet.has(p.id)).length
    return { deactivateCount, permanentCount, skippedCount }
  }, [selectedProducts, skippedIds])

  const handleBulkDeleteOpenChange = useCallback((open: boolean) => {
    setBulkDeleteOpen(open)
    if (!open) {
      setSkippedIds([])
    }
  }, [])

  useEffect(() => {
    if (bulkDeleteOpen && selectedIds.length > 0) {
      checkActiveOrdersMutate(selectedIds, {
        onSuccess: (result) => {
          setSkippedIds(result.skippedIds)
        },
      })
    }
  }, [bulkDeleteOpen, selectedIds, checkActiveOrdersMutate])

  const deleteAllTargetProducts = useMemo(
    () => (selectedIds.length > 0 ? selectedProducts : products),
    [selectedIds, selectedProducts, products],
  )

  const handleDeleteAllOpenChange = useCallback((open: boolean) => {
    setDeleteAllOpen(open)
    if (!open) {
      setDeleteAllSkippedIds([])
    }
  }, [])

  useEffect(() => {
    if (deleteAllOpen && deleteAllTargetProducts.length > 0) {
      const targetIds = deleteAllTargetProducts.map((p) => p.id)
      checkActiveOrdersMutate(targetIds, {
        onSuccess: (result) => {
          setDeleteAllSkippedIds(result.skippedIds)
        },
      })
    }
  }, [deleteAllOpen, deleteAllTargetProducts, checkActiveOrdersMutate])

  const deleteAllBreakdown = useMemo(() => {
    const skippedSet = new Set(deleteAllSkippedIds)
    const deactivateCount = deleteAllTargetProducts.filter((p) => p.isActive && !skippedSet.has(p.id)).length
    const permanentCount = deleteAllTargetProducts.filter((p) => !p.isActive && !skippedSet.has(p.id)).length
    const skippedCount = deleteAllTargetProducts.filter((p) => skippedSet.has(p.id)).length
    return { deactivateCount, permanentCount, skippedCount }
  }, [deleteAllTargetProducts, deleteAllSkippedIds])

  const handleStockUpdate = useCallback(
    (id: string, stock: number) => {
      updateStock.mutate(
        { id, data: { stockQuantity: stock } },
        {
          onSuccess: () => toast.success('Stock updated'),
          onError: () => toast.error('Failed to update stock'),
        },
      )
    },
    [updateStock],
  )


  const handleToggleFeatured = useCallback(
    (id: string) => {
      toggleFeatured.mutate(id, {
        onSuccess: () => toast.success('Featured status updated'),
        onError: () => toast.error('Failed to update featured status'),
      })
    },
    [toggleFeatured],
  )

  const handleToggleActive = useCallback(
    (id: string) => {
      const product = products.find((p) => p.id === id)
      if (!product) return

      const action = product.isActive ? 'deactivate' : 'activate'
      bulkUpdate.mutate(
        { ids: [id], action },
        {
          onSuccess: () => toast.success(`Product ${action === 'activate' ? 'activated' : 'deactivated'}`),
          onError: () => toast.error(`Failed to ${action} product`),
        },
      )
    },
    [bulkUpdate, products],
  )

  const handleBulkDelete = useCallback(
    (ids: string[]) => {
      bulkDelete.mutate(
        { ids },
        {
          onSuccess: (result) => {
            const skippedCount = result.skippedIds.length
            const parts: string[] = []
            if (result.deactivated > 0) {
              parts.push(`${result.deactivated} deactivated`)
            }
            if (result.permanentlyDeleted > 0) {
              parts.push(`${result.permanentlyDeleted} permanently deleted`)
            }
            if (skippedCount > 0) {
              parts.push(`${skippedCount} skipped (active orders)`)
            }
            if (parts.length > 0) {
              toast.success(parts.join(', '))
            } else {
              toast.success('No products were processed.')
            }
            setSelectedIds([])
            setBulkDeleteOpen(false)
          },
          onError: (err: unknown) => {
            const axiosErr = err as { response?: { data?: { message?: string | string[] } }; message?: string }
            const backendMessage = axiosErr?.response?.data?.message
            toast.error(backendMessage ? String(backendMessage) : 'Failed to delete products')
            setBulkDeleteOpen(false)
          },
        },
      )
    },
    [bulkDelete],
  )

  const handleDeleteAll = useCallback(() => {
    if (selectedIds.length > 0) {
      bulkDelete.mutate(
        { ids: selectedIds },
        {
          onSuccess: (result) => {
            const skippedCount = result.skippedIds.length
            const parts: string[] = []
            if (result.deactivated > 0) {
              parts.push(`${result.deactivated} deactivated`)
            }
            if (result.permanentlyDeleted > 0) {
              parts.push(`${result.permanentlyDeleted} permanently deleted`)
            }
            if (skippedCount > 0) {
              parts.push(`${skippedCount} skipped (active orders)`)
            }
            if (parts.length > 0) {
              toast.success(parts.join(', '))
            } else {
              toast.success('No products were processed.')
            }
            setSelectedIds([])
            setDeleteAllOpen(false)
          },
          onError: (err: unknown) => {
            const axiosErr = err as { response?: { data?: { message?: string | string[] } }; message?: string }
            const backendMessage = axiosErr?.response?.data?.message
            toast.error(backendMessage ? String(backendMessage) : 'Failed to delete products')
            setDeleteAllOpen(false)
          },
        },
      )
    } else {
      deleteAll.mutate(
        {
          search: search || undefined,
          isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
        },
        {
          onSuccess: () => {
            setDeleteAllOpen(false)
          },
          onError: () => {
            toast.error('Delete all failed. Please try again.')
            setDeleteAllOpen(false)
          },
        },
      )
    }
  }, [selectedIds, bulkDelete, deleteAll, search, statusFilter])

  return (
    <div className="space-y-6 p-2 lg:p-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Package className="h-6 w-6 text-purple-600" /> Product Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage inventory, prices, and product details
          </p>
        </div>
        {showCrudActions && (
          <Button
            size="lg"
            className="font-bold bg-primary shrink-0 w-full sm:w-auto"
            onClick={() => navigate('/merchant/products/new')}
          >
            <Plus className="mr-2 h-4 w-4" /> Add New Product
          </Button>
        )}
      </div>

      {showDeactivatedBanner && <AccountDeactivatedBanner />}

      {showPendingBanner && (
        <Alert variant="warning">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Pending Approval</AlertTitle>
          <AlertDescription>
            {t(
              'merchant.products.pendingBanner',
              'Your merchant account is pending approval. Product management features are restricted until your license is approved.',
            )}
          </AlertDescription>
        </Alert>
      )}

      {guard.showRejectionBanner && (
        <Alert className="border-destructive/50 bg-destructive/10 text-destructive dark:bg-destructive/20">
          <ShieldAlert className="h-4 w-4 text-destructive" />
          <AlertTitle>Account Rejected</AlertTitle>
          <AlertDescription>
            Your merchant account has been rejected. Product management features are restricted.
          </AlertDescription>
        </Alert>
      )}

      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-0 w-full sm:min-w-[200px] sm:max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-9 w-full"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(val) => {
            setStatusFilter(val)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-full sm:w-[140px]">
            <Filter className="mr-2 h-3 w-3" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={sortBy}
          onValueChange={(val) => setSortBy(val as ProductQueryParams['sortBy'])}
        >
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="price">Price</SelectItem>
            <SelectItem value="rating">Rating</SelectItem>
            <SelectItem value="name">Name</SelectItem>
          </SelectContent>
        </Select>
        {showCrudActions && products.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground w-full sm:w-auto"
            onClick={() => setDeleteAllOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingSpinner className="min-h-[400px]" />
      ) : error ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-destructive">Failed to load products. Please try again.</p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto -mx-2 px-2 lg:mx-0 lg:px-0">
          <ProductTable
            products={products}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onStockUpdate={handleStockUpdate}
            onToggleFeatured={handleToggleFeatured}
            onToggleActive={handleToggleActive}
            isTogglingFeatured={toggleFeatured.isPending}
            isTogglingActive={bulkUpdate.isPending}
            showActions={showCrudActions}
          />
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {meta.totalPages} ({meta.total} products)
          </p>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
              const startPage = Math.max(1, Math.min(page - 2, meta.totalPages - 4))
              const pageNum = startPage + i
              if (pageNum > meta.totalPages) return null
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </Button>
              )
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page === meta.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Delete All Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteAllOpen}
        onOpenChange={handleDeleteAllOpenChange}
        onConfirm={handleDeleteAll}
        title={selectedIds.length > 0 ? 'Delete Selected Products' : 'Delete Products'}
        description={(() => {
          const { deactivateCount, permanentCount, skippedCount } = deleteAllBreakdown
          const totalCount = deleteAllTargetProducts.length

          if (totalCount === 0) {
            return 'No products to delete.'
          }

          const parts: string[] = []
          if (selectedIds.length > 0) {
            parts.push(`Are you sure you want to delete ${totalCount === 1 ? 'this 1 product' : `these ${totalCount} products`}?`)
          } else {
            parts.push(`Are you sure you want to delete all ${totalCount} products?`)
          }

          if (deactivateCount > 0) {
            parts.push(`${deactivateCount} will be deactivated`)
          }
          if (permanentCount > 0) {
            parts.push(`${permanentCount} soft-deleted product${permanentCount > 1 ? 's' : ''} will be permanently deleted`)
          }
          if (skippedCount > 0) {
            parts.push(`${skippedCount} product${skippedCount > 1 ? 's' : ''} with active orders will be skipped`)
          }

          return parts.join(' ')
        })()}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={handleBulkDeleteOpenChange}
        onConfirm={() => handleBulkDelete(selectedIds)}
        title={selectedIds.length === 1 ? 'Delete Selected Product' : 'Delete Selected Products'}
        description={(() => {
          const { deactivateCount, permanentCount, skippedCount } = deleteBreakdown
          const totalCount = selectedIds.length

          if (deactivateCount === 0 && permanentCount === 0 && skippedCount === 0 && totalCount === 0) {
            return 'No products selected.'
          }

          const parts: string[] = []
          parts.push(`Are you sure you want to delete ${totalCount === 1 ? 'this 1 product' : `these ${totalCount} products`}?`)

          if (deactivateCount > 0) {
            parts.push(`${deactivateCount} will be deactivated`)
          }
          if (permanentCount > 0) {
            parts.push(`${permanentCount} soft-deleted product${permanentCount > 1 ? 's' : ''} will be permanently deleted`)
          }
          if (skippedCount > 0) {
            parts.push(`${skippedCount} product${skippedCount > 1 ? 's' : ''} with active orders will be skipped`)
          }

          return parts.join(' ')
        })()}
      />
    </div>
  )
}
