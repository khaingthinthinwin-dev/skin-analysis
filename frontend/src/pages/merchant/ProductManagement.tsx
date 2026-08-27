import { useState } from 'react'
import { Package, Plus, Search, Edit, Trash2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function ProductManagement() {
  const [query, setQuery] = useState('')

  const products = [
    { id: 'PRD-001', name: 'Gentle Foaming Cleanser', price: '$24.99', stock: 150, status: 'Active', category: 'Cleansers' },
    { id: 'PRD-002', name: 'Vitamin C Radiant Serum', price: '$42.00', stock: 85, status: 'Active', category: 'Serums' },
    { id: 'PRD-003', name: 'Deep Moisture Barrier Cream', price: '$36.50', stock: 12, status: 'Low Stock', category: 'Moisturizers' },
    { id: 'PRD-004', name: 'Soothing Centella Gel', price: '$28.00', stock: 0, status: 'Out of Stock', category: 'Gel' },
  ]

  const filtered = products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="space-y-6 p-2 lg:p-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Package className="h-6 w-6 text-purple-600" /> Merchant Product Catalog
          </h1>
          <p className="text-sm text-muted-foreground">Manage inventory, prices, and product details</p>
        </div>
        <Button size="lg" className="font-bold bg-primary shrink-0">
          <Plus className="mr-2 h-4 w-4" /> Add New Product
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products by name or SKU..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Products Table */}
      <Card className="border-border/80 shadow-xs">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-purple-50/50 dark:bg-purple-950/20">
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs font-semibold">{item.id}</TableCell>
                  <TableCell className="font-bold text-foreground">{item.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{item.category}</TableCell>
                  <TableCell className="font-extrabold text-foreground">{item.price}</TableCell>
                  <TableCell className="text-xs font-semibold">{item.stock} units</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        item.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : item.status === 'Low Stock'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {item.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-purple-600">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
