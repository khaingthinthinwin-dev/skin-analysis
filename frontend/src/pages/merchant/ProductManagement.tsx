import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { Package, Plus, Search, Filter, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ProductTable } from '@/components/merchant/ProductTable'
import { BulkActionsBar } from '@/components/merchant/BulkActionsBar'
import { DeleteConfirmDialog } from '@/components/merchant/DeleteConfirmDialog'
import {
  useProducts,
  useUpdateStock,
  useDeleteProduct,
  useBulkUpdateStatus,
  useBulkDelete,
  useDeleteAll,
} from '@/hooks/useProducts'
import type { ProductQueryParams } from '@/types/product.types'

export default function ProductManagement() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<ProductQueryParams['sortBy']>('newest')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deleteAllOpen, setDeleteAllOpen] = useState(false)

  const queryParams: ProductQueryParams = {
    search: search || undefined,
    isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
    sortBy,
    page,
    limit: 10,
  }

  const { data, isLoading, error } = useProducts(queryParams)
  const updateStock = useUpdateStock()
  const deleteProduct = useDeleteProduct()
  const bulkUpdate = useBulkUpdateStatus()
  const bulkDelete = useBulkDelete()
  const deleteAll = useDeleteAll()

  const products = data?.items || []
  const meta = data?.meta

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

  const handleDelete = useCallback(
    (id: string) => {
      deleteProduct.mutate(id, {
        onSuccess: () => toast.success('Product deleted'),
        onError: (err: unknown) => {
          const axiosErr = err as { response?: { data?: { message?: string | string[] } }; message?: string }
          const backendMessage = axiosErr?.response?.data?.message
          toast.error(backendMessage ? String(backendMessage) : 'Failed to delete product')
        },
      })
    },
    [deleteProduct],
  )

  const handleBulkActivate = useCallback(
    (ids: string[]) => {
      bulkUpdate.mutate(
        { ids, action: 'activate' },
        {
          onSuccess: () => {
            toast.success(`${ids.length} product(s) activated`)
            setSelectedIds([])
          },
          onError: () => toast.error('Failed to activate products'),
        },
      )
    },
    [bulkUpdate],
  )

  const handleBulkDeactivate = useCallback(
    (ids: string[]) => {
      bulkUpdate.mutate(
        { ids, action: 'deactivate' },
        {
          onSuccess: () => {
            toast.success(`${ids.length} product(s) deactivated`)
            setSelectedIds([])
          },
          onError: () => toast.error('Failed to deactivate products'),
        },
      )
    },
    [bulkUpdate],
  )

  const handleBulkDelete = useCallback(
    (ids: string[]) => {
      bulkDelete.mutate(
        { ids },
        {
          onSuccess: () => {
            toast.success(`${ids.length} product(s) deleted`)
            setSelectedIds([])
          },
          onError: (err: unknown) => {
            const axiosErr = err as { response?: { data?: { message?: string | string[] } }; message?: string }
            const backendMessage = axiosErr?.response?.data?.message
            toast.error(backendMessage ? String(backendMessage) : 'Failed to delete products')
          },
        },
      )
    },
    [bulkDelete],
  )

  const handleDeleteAll = useCallback(() => {
    deleteAll.mutate(
      {
        search: search || undefined,
        isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
      },
      {
        onSuccess: (result) => {
          if (result.skipped > 0) {
            toast.warning(
              `Successfully deleted ${result.deleted} product(s). ${result.skipped} product(s) could not be deleted because they have active orders.`,
            )
          } else {
            toast.success(`${result.deleted} product(s) deleted successfully`)
          }
          setDeleteAllOpen(false)
        },
        onError: () => {
          toast.error('Delete all failed. Please try again.')
          setDeleteAllOpen(false)
        },
      },
    )
  }, [deleteAll, search, statusFilter])

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-destructive">Failed to load products. Please try again.</p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-2 lg:p-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Package className="h-6 w-6 text-purple-600" /> Product Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage inventory, prices, and product details
          </p>
        </div>
        <Button
          size="lg"
          className="font-bold bg-primary shrink-0"
          onClick={() => navigate('/merchant/products/new')}
        >
          <Plus className="mr-2 h-4 w-4" /> Add New Product
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(val) => {
            setStatusFilter(val)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[140px]">
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
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="price">Price</SelectItem>
            <SelectItem value="rating">Rating</SelectItem>
            <SelectItem value="name">Name</SelectItem>
          </SelectContent>
        </Select>
        {products.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => setDeleteAllOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete All
          </Button>
        )}
      </div>

      {/* Bulk Actions */}
      <BulkActionsBar
        selectedIds={selectedIds}
        onBulkActivate={handleBulkActivate}
        onBulkDeactivate={handleBulkDeactivate}
        onBulkDelete={handleBulkDelete}
        onClearSelection={() => setSelectedIds([])}
      />

      {/* Table */}
      {isLoading ? (
        <LoadingSpinner className="min-h-[400px]" />
      ) : (
        <ProductTable
          products={products}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onStockUpdate={handleStockUpdate}
          onDelete={handleDelete}
          isDeleting={deleteProduct.isPending}
        />
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {meta.totalPages} ({meta.total} products)
          </p>
          <div className="flex items-center gap-2">
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
        onOpenChange={setDeleteAllOpen}
        onConfirm={handleDeleteAll}
        title="Delete All Products"
        description={`Are you sure you want to delete all ${meta?.total ?? 0} products? Products with active orders will be skipped. This action cannot be undone.`}
      />
    </div>
  )
}
