import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { InlineStockEditor } from './InlineStockEditor'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import { formatPrice } from '@/lib/format'
import type { Product } from '@/types/product.types'

function getImageUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('http')) return url
  const raw = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'
  const base = raw.replace(/\/api\/v1\/?$/, '')
  return base + url
}

function ProductImage({ url, alt }: { url: string; alt: string }) {
  const [error, setError] = useState(false)

  if (!url || error) {
    return (
      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
        No img
      </div>
    )
  }

  return (
    <img
      src={getImageUrl(url)}
      alt={alt}
      className="h-10 w-10 rounded object-cover"
      onError={() => setError(true)}
    />
  )
}

interface ProductTableProps {
  products: Product[]
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  onStockUpdate: (id: string, stock: number) => void
  onDelete: (id: string, isActive: boolean) => void
  onToggleFeatured: (id: string) => void
  onToggleActive: (id: string) => void
  isDeleting?: boolean
  isTogglingFeatured?: boolean
  isTogglingActive?: boolean
  showActions?: boolean
}

export function ProductTable({
  products,
  selectedIds,
  onSelectionChange,
  onStockUpdate,
  onDelete,
  onToggleFeatured,
  onToggleActive,
  isDeleting = false,
  isTogglingFeatured = false,
  isTogglingActive = false,
  showActions = true,
}: ProductTableProps) {
  const navigate = useNavigate()
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)

  const toggleAll = () => {
    if (selectedIds.length === products.length) {
      onSelectionChange([])
    } else {
      onSelectionChange(products.map((p) => p.id))
    }
  }

  const toggleOne = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id))
    } else {
      onSelectionChange([...selectedIds, id])
    }
  }

  const getStatusBadge = (product: Product) => {
    if (product.isActive) {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 text-[10px]">
          Active
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="text-[10px]">
        Inactive
      </Badge>
    )
  }

  return (
    <>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              {showActions && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      products.length > 0 &&
                      selectedIds.length === products.length
                    }
                    onCheckedChange={toggleAll}
                    aria-label="Select all"
                  />
                </TableHead>
              )}
              <TableHead>Image</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Compare At Price</TableHead>
              <TableHead>Price (Discount Price)</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>isFeatured</TableHead>
              {showActions && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showActions ? 10 : 8} className="text-center py-8 text-muted-foreground">
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow
                  key={product.id}
                  className={selectedIds.includes(product.id) ? 'bg-muted/30' : ''}
                >
                  {showActions && (
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(product.id)}
                        onCheckedChange={() => toggleOne(product.id)}
                        aria-label={`Select ${product.name}`}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <ProductImage
                      url={product.images[0]}
                      alt={product.name}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-foreground">{product.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {product.sku || '—'}
                  </TableCell>
                  <TableCell>
                    {product.compareAtPrice != null ? (
                      <span className="font-semibold line-through">
                        {formatPrice(product.compareAtPrice)}
                      </span>
                    ) : (
                      <span className="font-semibold">{formatPrice(product.price)}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {product.compareAtPrice != null ? (
                      <div className="space-y-0.5">
                        <div className="font-semibold">{formatPrice(product.price)}</div>
                        <div className="text-xs text-emerald-600 dark:text-emerald-400">
                          Saved {formatPrice(product.compareAtPrice - product.price)}
                        </div>
                      </div>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    {showActions ? (
                      <InlineStockEditor
                        value={product.stockQuantity}
                        onSave={(stock) => onStockUpdate(product.id, stock)}
                      />
                    ) : (
                      <span className="font-medium text-sm">{product.stockQuantity}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {showActions ? (
                      <button
                        type="button"
                        disabled={isTogglingActive}
                        onClick={() => onToggleActive(product.id)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${
                          product.isActive ? 'bg-green-500' : 'bg-input'
                        }`}
                        aria-label={`Toggle status for ${product.name}`}
                      >
                        <span
                          className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg transition-transform ${
                            product.isActive ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    ) : (
                      getStatusBadge(product)
                    )}
                  </TableCell>
                  <TableCell>
                    {showActions ? (
                      <button
                        type="button"
                        disabled={isTogglingFeatured}
                        onClick={() => onToggleFeatured(product.id)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${
                          product.isFeatured ? 'bg-primary' : 'bg-input'
                        }`}
                        aria-label={`Toggle featured for ${product.name}`}
                      >
                        <span
                          className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg transition-transform ${
                            product.isFeatured ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    ) : product.isFeatured ? (
                      <Badge variant="outline" className="text-[10px]">
                        Featured
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  {showActions && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => navigate(`/merchant/products/${product.id}/edit`)}
                          aria-label={`Edit ${product.name}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(product)}
                          aria-label={`Delete ${product.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            onDelete(deleteTarget.id, deleteTarget.isActive)
            setDeleteTarget(null)
          }
        }}
        title={deleteTarget?.isActive ? 'Deactivate Product' : 'Delete Product'}
        description={
          deleteTarget?.isActive
            ? `Are you sure you want to deactivate '${deleteTarget?.name}'? It will be hidden from the store but can be reactivated later.`
            : `Are you sure you want to permanently delete '${deleteTarget?.name}'? All related data will be lost and cannot be recovered.`
        }
        isLoading={isDeleting}
      />
    </>
  )
}
