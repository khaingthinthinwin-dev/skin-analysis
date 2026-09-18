import { useState, useEffect, useCallback, useMemo } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  Package,
  CheckCircle,
  XCircle,
  Ban,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { AdminProduct } from '@/features/admin/content-moderation/services/moderation.service';

// ─── Stats Types ────────────────────────────────────────────────────────────

interface ProductStats {
  total: number;
  active: number;
  inactive: number;
}

// ─── Stats Fetcher Hook ─────────────────────────────────────────────────────

function useProductStats() {
  const [stats, setStats] = useState<ProductStats>({
    total: 0,
    active: 0,
    inactive: 0,
  });

  const fetchStats = useCallback(async () => {
    const [totalRes, activeRes, inactiveRes] = await Promise.all([
      api.get('/admin/content', { params: { limit: 1 } }),
      api.get('/admin/content', { params: { status: 'active', limit: 1 } }),
      api.get('/admin/content', { params: { status: 'inactive', limit: 1 } }),
    ]);
    setStats({
      total: totalRes.data.data.total ?? 0,
      active: activeRes.data.data.total ?? 0,
      inactive: inactiveRes.data.data.total ?? 0,
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const [totalRes, activeRes, inactiveRes] = await Promise.all([
          api.get('/admin/content', { params: { limit: 1 }, signal: controller.signal }),
          api.get('/admin/content', { params: { status: 'active', limit: 1 }, signal: controller.signal }),
          api.get('/admin/content', { params: { status: 'inactive', limit: 1 }, signal: controller.signal }),
        ]);
        setStats({
          total: totalRes.data.data.total ?? 0,
          active: activeRes.data.data.total ?? 0,
          inactive: inactiveRes.data.data.total ?? 0,
        });
      } catch {
        // Stats will remain at 0 on error
      }
    }
    load();
    return () => controller.abort();
  }, []);

  return { stats, refreshStats: fetchStats };
}

// ─── Debounce Hook ──────────────────────────────────────────────────────────

function useDebounced(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

// ─── Image URL Helper ──────────────────────────────────────────────────────

function getImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const raw = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
  const base = raw.replace(/\/api\/v1\/?$/, '');
  return base + url;
}

// ─── Helper Components ──────────────────────────────────────────────────────

function ProductStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge
      variant="outline"
      className={
        isActive
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          : 'bg-red-500/10 text-red-400 border-red-500/20'
      }
    >
      {isActive ? (
        <CheckCircle className="h-3 w-3 mr-1" />
      ) : (
        <XCircle className="h-3 w-3 mr-1" />
      )}
      {isActive ? 'Active' : 'Inactive'}
    </Badge>
  );
}

// ─── Helper Functions ───────────────────────────────────────────────────────

function getPageNumbers(current: number, total: number) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | string)[] = [];
  if (current <= 3) {
    pages.push(1, 2, 3, 4, '...', total);
  } else if (current >= total - 2) {
    pages.push(1, '...', total - 3, total - 2, total - 1, total);
  } else {
    pages.push(1, '...', current - 1, current, current + 1, '...', total);
  }
  return pages;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ContentModeration() {
  // ── State ───────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [status, setStatus] = useState<string>('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 300);
  const [productSort, setProductSort] = useState('createdAt');
  const [productOrder, setProductOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // ── Dialog State ────────────────────────────────────────────────────────
  const [detailProduct, setDetailProduct] = useState<AdminProduct | null>(null);
  const [moderateTarget, setModerateTarget] = useState<AdminProduct | null>(null);
  const [moderateAction, setModerateAction] = useState<'deactivate' | 'reactivate'>('deactivate');
  const [reason, setReason] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // ── Stats ───────────────────────────────────────────────────────────────
  const { stats, refreshStats } = useProductStats();

  // ── Queries ─────────────────────────────────────────────────────────────
  const { query, moderateMutation, bulkModerateMutation } = useAdminProducts({
    page,
    limit,
    status: (status as 'active' | 'inactive' | undefined) || undefined,
    search: debouncedSearch || undefined,
    sort: productSort,
    order: productOrder,
  });

  // ── Derived Data ────────────────────────────────────────────────────────
  const products = query.data?.items || [];
  const totalPages = query.data?.totalPages || 1;
  const total = query.data?.total ?? 0;

  // ── Sort Mapping ────────────────────────────────────────────────────────
  const sortOptions = useMemo(
    () => [
      { value: 'createdAt:desc', label: 'Newest' },
      { value: 'createdAt:asc', label: 'Oldest' },
      { value: 'price:desc', label: 'Price (High-Low)' },
      { value: 'price:asc', label: 'Price (Low-High)' },
      { value: 'name:asc', label: 'Name (A-Z)' },
      { value: 'name:desc', label: 'Name (Z-A)' },
    ],
    [],
  );

  const currentSortValue = `${productSort}:${productOrder}`;

  const handleSortChange = (value: string) => {
    const [sort, order] = value.split(':');
    setProductSort(sort);
    setProductOrder(order as 'asc' | 'desc');
    setPage(1);
  };

  // ── Selection Helpers ───────────────────────────────────────────────────
  const toggleSelectAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map((p) => p.id));
    }
  };

  const toggleSelectProduct = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  // ── Actions ─────────────────────────────────────────────────────────────
  const openModerate = (product: AdminProduct, action: 'deactivate' | 'reactivate') => {
    setModerateTarget(product);
    setModerateAction(action);
    setReason('');
  };

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
          refreshStats();
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
          refreshStats();
        },
      },
    );
  };

  const openDeleteDialog = (id: string) => {
    setDeleteTarget(id);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/admin/content/${deleteTarget}`);
      toast.success('Product deleted');
      setDeleteTarget(null);
      setDetailProduct(null);
      refreshStats();
    } catch {
      toast.error('Failed to delete product');
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* ── [A] Page Header ──────────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Product Content Moderation
        </h1>
        <p className="text-muted-foreground">
          Review and moderate product content
        </p>
      </div>

      {/* ── [B] Stats Bar ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: 'Total Products',
            value: stats.total,
            icon: Package,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            filter: '',
          },
          {
            label: 'Active',
            value: stats.active,
            icon: CheckCircle,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            filter: 'active',
          },
          {
            label: 'Inactive',
            value: stats.inactive,
            icon: XCircle,
            color: 'text-red-400',
            bg: 'bg-red-500/10',
            filter: 'inactive',
          },
        ].map((stat) => (
          <Card
            key={stat.label}
            role="button"
            tabIndex={0}
            onClick={() => {
              setStatus(stat.filter);
              setPage(1);
              setSelectedIds([]);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setStatus(stat.filter);
                setPage(1);
                setSelectedIds([]);
              }
            }}
            className={`cursor-pointer transition-all ${
              status === stat.filter
                ? 'ring-2 ring-primary/60 shadow-sm'
                : 'hover:border-primary/40 hover:shadow-sm'
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bg}`}
                >
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── [C] Search + Sort Bar ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-start gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products by name or shop..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select value={currentSortValue} onValueChange={handleSortChange}>
          <SelectTrigger className="w-[180px]">
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Bulk Actions ────────────────────────────────────────────────── */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between gap-2 p-3 bg-muted rounded-md">
          <span className="text-sm font-medium">
            {selectedIds.length} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                openModerate(products[0], 'deactivate');
              }}
            >
              <Ban className="h-4 w-4 mr-1" /> Deactivate All
            </Button>
            <Button
              size="sm"
              onClick={() => handleBulkModerate(true)}
            >
              <CheckCircle className="h-4 w-4 mr-1" /> Activate All
            </Button>
          </div>
        </div>
      )}

      {/* ── [E] Products Table ──────────────────────────────────────────── */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    products.length > 0 &&
                    selectedIds.length === products.length
                  }
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Shop</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-12 text-muted-foreground"
                >
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(product.id)}
                      onCheckedChange={() => toggleSelectProduct(product.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {product.images?.[0] && (
                        <img
                          src={getImageUrl(product.images[0])}
                          alt=""
                          className="h-10 w-10 rounded object-cover"
                        />
                      )}
                      <div>
                        <p className="font-medium text-sm max-w-[160px] truncate">
                          {product.name}
                        </p>
                        {product.category && (
                          <p className="text-xs text-muted-foreground">
                            {product.category.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{product.merchant?.shopName || 'N/A'}</p>
                    <p className="text-xs text-muted-foreground">
                      {product.merchant?.user?.name || ''}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm">
                    ${Number(product.price).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <ProductStatusBadge isActive={product.isActive} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(product.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => setDetailProduct(product)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {product.isActive ? (
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => openModerate(product, 'deactivate')}
                        >
                          <Ban className="h-4 w-4 text-destructive" />
                        </Button>
                      ) : (
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => openModerate(product, 'reactivate')}
                        >
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── [F] Pagination ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Showing {products.length > 0 ? (page - 1) * limit + 1 : 0}-
          {Math.min(page * limit, total)} of {total} products
        </span>
        <div className="flex items-center gap-2">
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="h-8 px-2 text-sm rounded-md border bg-background"
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {getPageNumbers(page, totalPages).map((p, idx) =>
              typeof p === 'number' ? (
                <Button
                  key={idx}
                  size="icon"
                  variant={p === page ? 'default' : 'outline'}
                  className="h-8 w-8"
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              ) : (
                <span
                  key={idx}
                  className="flex items-center px-1 text-muted-foreground"
                >
                  ...
                </span>
              ),
            )}
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* DIALOGS                                                            */}
      {/* ════════════════════════════════════════════════════════════════════ */}

      {/* ── Product Detail Modal ─────────────────────────────────────────── */}
      <Dialog
        open={!!detailProduct}
        onOpenChange={() => setDetailProduct(null)}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Product Moderation</DialogTitle>
          </DialogHeader>
          {detailProduct && (
            <div className="space-y-5">
              {/* [B] Product Info Card */}
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                {detailProduct.images?.[0] && (
                  <img
                    src={getImageUrl(detailProduct.images[0])}
                    alt=""
                    className="h-16 w-16 rounded object-cover"
                  />
                )}
                <div>
                  <p className="font-semibold">{detailProduct.name}</p>
                  <p className="text-sm text-muted-foreground">
                    ${Number(detailProduct.price).toFixed(2)}
                  </p>
                  {detailProduct.category && (
                    <p className="text-xs text-muted-foreground">
                      {detailProduct.category.name}
                    </p>
                  )}
                </div>
              </div>

              {/* [C] Product Images Gallery */}
              {detailProduct.images?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Product Images
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {detailProduct.images.map((img, i) => (
                      <img
                        key={i}
                        src={getImageUrl(img)}
                        alt=""
                        className="h-20 w-20 rounded object-cover"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* [D] Shop Owner Card */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Shop Information
                </p>
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {detailProduct.merchant?.shopName || 'N/A'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {detailProduct.merchant?.user?.name || ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* [E] Status Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Status
                  </p>
                  <ProductStatusBadge isActive={detailProduct.isActive} />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Created
                  </p>
                  <p className="text-sm">
                    {new Date(detailProduct.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* [F] Action Buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setDetailProduct(null)}
                >
                  Cancel
                </Button>
                {detailProduct.isActive ? (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setDetailProduct(null);
                      openModerate(detailProduct, 'deactivate');
                    }}
                  >
                    <Ban className="h-4 w-4 mr-1" /> Deactivate
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      setDetailProduct(null);
                      openModerate(detailProduct, 'reactivate');
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" /> Reactivate
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={() => {
                    setDetailProduct(null);
                    openDeleteDialog(detailProduct.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Moderate Product Dialog (from table dropdown) ────────────────── */}
      <Dialog
        open={!!moderateTarget && !detailProduct}
        onOpenChange={() => {
          setModerateTarget(null);
          setReason('');
        }}
      >
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
                  <img
                    src={getImageUrl(moderateTarget.images[0])}
                    alt=""
                    className="h-16 w-16 rounded object-cover"
                  />
                )}
                <div>
                  <p className="font-medium">{moderateTarget.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {moderateTarget.merchant?.shopName}
                  </p>
                </div>
              </div>
              {moderateAction === 'deactivate' && (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Enter deactivation reason (required, max 500 characters)..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    maxLength={500}
                  />
                  <div className="text-xs text-muted-foreground text-right">
                    {reason.length}/500
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setModerateTarget(null);
                setReason('');
              }}
            >
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

      {/* ── Delete Product Confirmation ──────────────────────────────────── */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to permanently delete this product? This action
            cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
