import { useState, useCallback, useMemo, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Package, Plus, Search, Filter, Trash2, ShieldAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
import { PaginationControls } from '@/components/PaginationControls'
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
  const [searchParams] = useSearchParams()
  const highlightedProductId = searchParams.get('highlightProductId') ?? undefined
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    const statusParam = searchParams.get('status')
    return statusParam === 'active' || statusParam === 'inactive'
      ? statusParam
      : 'all'
  })
  const [sortBy, setSortBy] = useState<ProductQueryParams['sortBy']>('newest')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
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
    limit,
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
          onSuccess: () => toast.success(t('merchant.products.toast.stockUpdated')),
          onError: () => toast.error(t('merchant.products.toast.stockUpdateFailed')),
        },
      )
    },
    [updateStock, t],
  )


  const handleToggleFeatured = useCallback(
    (id: string) => {
      toggleFeatured.mutate(id, {
        onSuccess: () => toast.success(t('merchant.products.toast.featuredUpdated')),
        onError: () => toast.error(t('merchant.products.toast.featuredUpdateFailed')),
      })
    },
    [toggleFeatured, t],
  )

  const handleToggleActive = useCallback(
    (id: string) => {
      const product = products.find((p) => p.id === id)
      if (!product) return

      const action = product.isActive ? 'deactivate' : 'activate'
      bulkUpdate.mutate(
        { ids: [id], action },
        {
          onSuccess: () =>
            toast.success(
              action === 'activate'
                ? t('merchant.products.toast.activated')
                : t('merchant.products.toast.deactivated'),
            ),
          onError: () =>
            toast.error(
              action === 'activate'
                ? t('merchant.products.toast.activateFailed')
                : t('merchant.products.toast.deactivateFailed'),
            ),
        },
      )
    },
    [bulkUpdate, products, t],
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
              parts.push(t('merchant.products.delete.deactivatedCount', { count: result.deactivated }))
            }
            if (result.permanentlyDeleted > 0) {
              parts.push(t('merchant.products.delete.permanentlyDeletedCount', { count: result.permanentlyDeleted }))
            }
            if (skippedCount > 0) {
              parts.push(t('merchant.products.delete.skippedActiveOrders', { count: skippedCount }))
            }
            if (parts.length > 0) {
              toast.success(parts.join(', '))
            } else {
              toast.success(t('merchant.products.toast.noProductsProcessed'))
            }
            setSelectedIds([])
            setBulkDeleteOpen(false)
          },
          onError: (err: unknown) => {
            const axiosErr = err as { response?: { data?: { message?: string | string[] } }; message?: string }
            const backendMessage = axiosErr?.response?.data?.message
            toast.error(backendMessage ? String(backendMessage) : t('merchant.products.toast.deleteFailed'))
            setBulkDeleteOpen(false)
          },
        },
      )
    },
    [bulkDelete, t],
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
              parts.push(t('merchant.products.delete.deactivatedCount', { count: result.deactivated }))
            }
            if (result.permanentlyDeleted > 0) {
              parts.push(t('merchant.products.delete.permanentlyDeletedCount', { count: result.permanentlyDeleted }))
            }
            if (skippedCount > 0) {
              parts.push(t('merchant.products.delete.skippedActiveOrders', { count: skippedCount }))
            }
            if (parts.length > 0) {
              toast.success(parts.join(', '))
            } else {
              toast.success(t('merchant.products.toast.noProductsProcessed'))
            }
            setSelectedIds([])
            setDeleteAllOpen(false)
          },
          onError: (err: unknown) => {
            const axiosErr = err as { response?: { data?: { message?: string | string[] } }; message?: string }
            const backendMessage = axiosErr?.response?.data?.message
            toast.error(backendMessage ? String(backendMessage) : t('merchant.products.toast.deleteFailed'))
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
            toast.error(t('merchant.products.toast.deleteAllFailed'))
            setDeleteAllOpen(false)
          },
        },
      )
    }
  }, [selectedIds, bulkDelete, deleteAll, search, statusFilter, t])

  return (
    <div className="space-y-6 p-2 lg:p-4">
      {showDeactivatedBanner && <AccountDeactivatedBanner />}

      {showPendingBanner && (
        <Alert variant="warning">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>{t('merchant.products.banner.pendingTitle')}</AlertTitle>
          <AlertDescription>
            {t('merchant.products.banner.pendingDescription')}
          </AlertDescription>
        </Alert>
      )}

      {guard.showRejectionBanner && (
        <Alert className="border-destructive/50 bg-destructive/10 text-destructive dark:bg-destructive/20">
          <ShieldAlert className="h-4 w-4 text-destructive" />
          <AlertTitle>{t('merchant.products.banner.rejectedTitle')}</AlertTitle>
          <AlertDescription>
            {t('merchant.products.banner.rejectedDescription')}{' '}
            <Link to="/merchant/profile" className="underline font-semibold">
              {t('merchant.products.banner.goToProfile')}
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-5 pb-0">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <Package className="h-6 w-6 text-purple-600" /> {t('merchant.products.title')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('merchant.products.subtitle')}
            </p>
          </div>
          {showCrudActions && (
            <Button
              size="lg"
              className="font-bold bg-primary shrink-0 w-full sm:w-auto"
              onClick={() => navigate('/merchant/products/new')}
            >
              <Plus className="mr-2 h-4 w-4" /> {t('merchant.products.addNew')}
            </Button>
          )}
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-3 flex-wrap p-5">
          <div className="relative flex-1 min-w-0 w-full sm:min-w-[200px] sm:max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('merchant.products.searchPlaceholder')}
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
              <SelectValue placeholder={t('merchant.products.statusPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('merchant.products.filter.all')}</SelectItem>
              <SelectItem value="active">{t('merchant.products.filter.active')}</SelectItem>
              <SelectItem value="inactive">{t('merchant.products.filter.inactive')}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sortBy}
            onValueChange={(val) => setSortBy(val as ProductQueryParams['sortBy'])}
          >
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder={t('merchant.products.sortPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t('merchant.products.sort.newest')}</SelectItem>
              <SelectItem value="price">{t('merchant.products.sort.price')}</SelectItem>
              <SelectItem value="rating">{t('merchant.products.sort.rating')}</SelectItem>
              <SelectItem value="name">{t('merchant.products.sort.name')}</SelectItem>
            </SelectContent>
          </Select>
          {showCrudActions && products.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground w-full sm:w-auto"
              onClick={() => setDeleteAllOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" /> {t('merchant.products.deleteButton')}
            </Button>
          )}
        </div>

        {/* Table */}
        {isLoading ? (
          <LoadingSpinner className="min-h-[400px]" />
        ) : error ? (
          <CardContent className="py-10 text-center">
            <p className="text-destructive">{t('merchant.products.error.load')}</p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              {t('merchant.products.retry')}
            </Button>
          </CardContent>
        ) : (
          <div
            className={`overflow-x-auto rounded-md border bg-card mx-5 ${meta && !error ? '' : 'mb-5'}`}
          >
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
              highlightedProductId={highlightedProductId}
            />
          </div>
        )}

        {/* Pagination */}
        {meta && !error && (
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
      </Card>

      {/* Delete All Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteAllOpen}
        onOpenChange={handleDeleteAllOpenChange}
        onConfirm={handleDeleteAll}
        title={selectedIds.length > 0 ? t('merchant.products.delete.selectedTitle') : t('merchant.products.delete.title')}
        description={(() => {
          const { deactivateCount, permanentCount, skippedCount } = deleteAllBreakdown
          const totalCount = deleteAllTargetProducts.length

          if (totalCount === 0) {
            return t('merchant.products.delete.none')
          }

          const parts: string[] = []
          if (selectedIds.length > 0) {
            parts.push(t('merchant.products.delete.confirmSelected', { count: totalCount }))
          } else {
            parts.push(t('merchant.products.delete.confirmAll', { count: totalCount }))
          }

          if (deactivateCount > 0) {
            parts.push(t('merchant.products.delete.deactivatedCount', { count: deactivateCount }))
          }
          if (permanentCount > 0) {
            parts.push(t('merchant.products.delete.permanentlyDeletedCount', { count: permanentCount }))
          }
          if (skippedCount > 0) {
            parts.push(t('merchant.products.delete.skippedActiveOrders', { count: skippedCount }))
          }

          return parts.join(' ')
        })()}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={handleBulkDeleteOpenChange}
        onConfirm={() => handleBulkDelete(selectedIds)}
        title={t('merchant.products.delete.selectedTitle')}
        description={(() => {
          const { deactivateCount, permanentCount, skippedCount } = deleteBreakdown
          const totalCount = selectedIds.length

          if (deactivateCount === 0 && permanentCount === 0 && skippedCount === 0 && totalCount === 0) {
            return t('merchant.products.delete.noneSelected')
          }

          const parts: string[] = []
          parts.push(t('merchant.products.delete.confirmSelected', { count: totalCount }))

          if (deactivateCount > 0) {
            parts.push(t('merchant.products.delete.deactivatedCount', { count: deactivateCount }))
          }
          if (permanentCount > 0) {
            parts.push(t('merchant.products.delete.permanentlyDeletedCount', { count: permanentCount }))
          }
          if (skippedCount > 0) {
            parts.push(t('merchant.products.delete.skippedActiveOrders', { count: skippedCount }))
          }

          return parts.join(' ')
        })()}
      />
    </div>
  )
}
