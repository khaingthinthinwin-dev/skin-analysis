import { useState } from 'react';
import { useAdminProducts } from '@/features/admin/content-moderation/hooks/useModeration';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  MoreHorizontal,
  Eye,
  ChevronLeft,
  ChevronRight,
  Ban,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import type { AdminProduct } from '@/features/admin/content-moderation/services/moderation.service';

export default function ContentModeration() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [moderateTarget, setModerateTarget] = useState<AdminProduct | null>(null);
  const [moderateAction, setModerateAction] = useState<'deactivate' | 'reactivate'>('deactivate');
  const [reason, setReason] = useState('');
  const [detailProduct, setDetailProduct] = useState<AdminProduct | null>(null);

  const { query, moderateMutation, bulkModerateMutation } = useAdminProducts({
    page,
    limit: 20,
    status: (status as 'active' | 'inactive' | undefined) || undefined,
    search: search || undefined,
  });

  const handleModerate = () => {
    if (!moderateTarget) return;
    if (moderateAction === 'deactivate' && !reason.trim()) return;

    moderateMutation.mutate(
      {
        id: moderateTarget.id,
        data: {
          isActive: moderateAction === 'reactivate',
          reason: moderateAction === 'deactivate' ? reason : undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success(`Product ${moderateAction === 'deactivate' ? 'deactivated' : 'reactivated'}`);
          setModerateTarget(null);
          setReason('');
        },
        onError: () => toast.error('Failed to update product'),
      },
    );
  };

  const handleBulkModerate = (isActive: boolean) => {
    if (selectedIds.length === 0) return;
    if (!isActive && !reason.trim()) return;

    bulkModerateMutation.mutate(
      { ids: selectedIds, isActive, reason: isActive ? undefined : reason },
      {
        onSuccess: () => {
          toast.success(`${selectedIds.length} products ${isActive ? 'activated' : 'deactivated'}`);
          setSelectedIds([]);
          setModerateTarget(null);
          setReason('');
        },
      },
    );
  };

  const openModerate = (product: AdminProduct, action: 'deactivate' | 'reactivate') => {
    setModerateTarget(product);
    setModerateAction(action);
    setReason('');
  };

  const products = query.data?.items || [];
  const totalPages = query.data?.totalPages || 1;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Product Content Moderation</h1>
        <p className="text-muted-foreground">Review and moderate product content</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: query.data?.total ?? 0, color: 'bg-blue-100 text-blue-800' },
          { label: 'Active', value: products.filter((p) => p.isActive).length, color: 'bg-emerald-100 text-emerald-800' },
          { label: 'Inactive', value: products.filter((p) => !p.isActive).length, color: 'bg-red-100 text-red-800' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <Badge className={stat.color}>{stat.value}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          {[
            { value: '', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => { setStatus(f.value); setPage(1); }}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                status === f.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
          <span className="text-sm">{selectedIds.length} selected</span>
          <Button size="sm" variant="destructive" onClick={() => openModerate(products[0], 'deactivate')}>
            Deactivate Selected
          </Button>
          <Button size="sm" onClick={() => handleBulkModerate(true)}>
            Activate Selected
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) setSelectedIds(products.map((p) => p.id));
                    else setSelectedIds([]);
                  }}
                />
              </TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Shop</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(product.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds([...selectedIds, product.id]);
                        else setSelectedIds(selectedIds.filter((id) => id !== product.id));
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {product.images?.[0] && (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="h-10 w-10 rounded object-cover"
                        />
                      )}
                      <span className="font-medium">{product.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{product.merchant?.shopName || 'N/A'}</TableCell>
                  <TableCell>{product.category?.name || 'N/A'}</TableCell>
                  <TableCell>${Number(product.price).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={product.isActive ? 'default' : 'destructive'}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(product.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDetailProduct(product)}>
                          <Eye className="h-4 w-4 mr-2" /> View Detail
                        </DropdownMenuItem>
                        {product.isActive ? (
                          <DropdownMenuItem onClick={() => openModerate(product, 'deactivate')}>
                            <Ban className="h-4 w-4 mr-2" /> Deactivate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => openModerate(product, 'reactivate')}>
                            <CheckCircle className="h-4 w-4 mr-2" /> Reactivate
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Moderate Dialog */}
      <Dialog open={!!moderateTarget} onOpenChange={() => { setModerateTarget(null); setReason(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {moderateAction === 'deactivate' ? 'Deactivate Product' : 'Reactivate Product'}
            </DialogTitle>
          </DialogHeader>
          {moderateTarget && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {moderateTarget.images?.[0] && (
                  <img src={moderateTarget.images[0]} alt="" className="h-16 w-16 rounded object-cover" />
                )}
                <div>
                  <p className="font-medium">{moderateTarget.name}</p>
                  <p className="text-sm text-muted-foreground">{moderateTarget.merchant?.shopName}</p>
                </div>
              </div>
              {moderateAction === 'deactivate' && (
                <Textarea
                  placeholder="Enter deactivation reason (required)..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setModerateTarget(null); setReason(''); }}>
              Cancel
            </Button>
            <Button
              variant={moderateAction === 'deactivate' ? 'destructive' : 'default'}
              disabled={moderateAction === 'deactivate' && !reason.trim()}
              onClick={handleModerate}
            >
              {moderateAction === 'deactivate' ? 'Deactivate' : 'Reactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Detail Dialog */}
      <Dialog open={!!detailProduct} onOpenChange={() => setDetailProduct(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Product Detail</DialogTitle>
          </DialogHeader>
          {detailProduct && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  <p>{detailProduct.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Price</p>
                  <p>${Number(detailProduct.price).toFixed(2)}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Shop</p>
                <p>{detailProduct.merchant?.shopName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Category</p>
                <p>{detailProduct.category?.name || 'N/A'}</p>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-muted-foreground">Status:</p>
                <Badge variant={detailProduct.isActive ? 'default' : 'destructive'}>
                  {detailProduct.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              {detailProduct.images?.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Images</p>
                  <div className="grid grid-cols-4 gap-2">
                    {detailProduct.images.map((img, i) => (
                      <img key={i} src={img} alt="" className="h-20 w-20 rounded object-cover" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
