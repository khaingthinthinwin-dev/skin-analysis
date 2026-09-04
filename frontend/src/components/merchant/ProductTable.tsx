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
  onDelete: (id: string) => void
  isDeleting?: boolean
}

export function ProductTable({
  products,
  selectedIds,
  onSelectionChange,
  onStockUpdate,
  onDelete,
  isDeleting = false,
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
              <TableHead>Image</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow
                  key={product.id}
                  className={selectedIds.includes(product.id) ? 'bg-muted/30' : ''}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(product.id)}
                      onCheckedChange={() => toggleOne(product.id)}
                      aria-label={`Select ${product.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <ProductImage
                      url={product.images[0]}
                      alt={product.name}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-foreground">{product.name}</span>
                      {product.isFeatured && (
                        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300 text-[10px]">
                          Featured
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {product.sku || '—'}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatPrice(product.price)}
                  </TableCell>
                  <TableCell>
                    <InlineStockEditor
                      value={product.stockQuantity}
                      onSave={(stock) => onStockUpdate(product.id, stock)}
                    />
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(product)}
                  </TableCell>
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
            onDelete(deleteTarget.id)
            setDeleteTarget(null)
          }
        }}
        title="Delete Product"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        isLoading={isDeleting}
      />
    </>
  )
}
