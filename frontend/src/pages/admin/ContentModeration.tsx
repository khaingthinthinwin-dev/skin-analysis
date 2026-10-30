import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
import { TablePagination } from '@/components/ui/pagination';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Search,
  Eye,
  Package,
  CheckCircle,
  XCircle,
  Ban,
  SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { AdminProduct } from '@/features/admin/content-moderation/services/moderation.service';

// ─── Helpers ────────────────────────────────────────────────────────────────

function apiErrorMessage(error: unknown, fallback: string): string {
  const message = (error as { response?: { data?: { message?: unknown } } })
    ?.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string' && message.trim()) return message;
  return fallback;
}

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
  const { t } = useTranslation();
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
      {isActive
        ? t('admin.content.status.active', 'Active')
        : t('admin.content.status.inactive', 'Inactive')}
    </Badge>
  );
}

// ─── Helper Functions ───────────────────────────────────────────────────────

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ContentModeration() {
  const { t } = useTranslation();
  // ── State ───────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
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
  const [bulkModerateAction, setBulkModerateAction] = useState<'deactivate' | 'activate' | null>(null);

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
      { value: 'createdAt:desc', label: t('admin.content.sort.newest', 'Newest') },
      { value: 'createdAt:asc', label: t('admin.content.sort.oldest', 'Oldest') },
      { value: 'price:desc', label: t('admin.content.sort.priceHighLow', 'Price (High-Low)') },
      { value: 'price:asc', label: t('admin.content.sort.priceLowHigh', 'Price (Low-High)') },
      { value: 'name:asc', label: t('admin.content.sort.nameAsc', 'Name (A-Z)') },
      { value: 'name:desc', label: t('admin.content.sort.nameDesc', 'Name (Z-A)') },
    ],
    [t],
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
          toast.success(
            moderateAction === 'deactivate'
              ? t('admin.content.toast.deactivated', 'Product deactivated')
              : t('admin.content.toast.reactivated', 'Product reactivated'),
          );
          setModerateTarget(null);
          setReason('');
          refreshStats();
        },
        onError: (error: unknown) => {
          toast.error(
            apiErrorMessage(error, t('admin.content.toast.updateFailed', 'Failed to update product')),
          );
        },
      },
    );
  };

  const openBulkModerateDialog = (action: 'deactivate' | 'activate') => {
    setBulkModerateAction(action);
    setReason('');
  };

  const handleBulkModerate = (isActive: boolean) => {
    if (selectedIds.length === 0) return;
    if (!isActive && !reason.trim()) return;

    bulkModerateMutation.mutate(
      { ids: selectedIds, isActive, reason: isActive ? undefined : reason },
      {
        onSuccess: (result) => {
          if (result.failed > 0) {
            toast.error(
              t('admin.content.toast.bulkPartial', {
                processed: result.processed,
                total: selectedIds.length,
                failed: result.failed,
                defaultValue: '{{processed}} of {{total}} updated, {{failed}} failed',
              }),
            );
            setSelectedIds(
              result.results.filter((r) => r.status === 'failed').map((r) => r.id),
            );
          } else {
            toast.success(
              isActive
                ? t('admin.content.toast.bulkActivated', {
                    count: selectedIds.length,
                    defaultValue_one: '{{count}} product activated',
                    defaultValue_other: '{{count}} products activated',
                  })
                : t('admin.content.toast.bulkDeactivated', {
                    count: selectedIds.length,
                    defaultValue_one: '{{count}} product deactivated',
                    defaultValue_other: '{{count}} products deactivated',
                  }),
            );
            setSelectedIds([]);
          }
          setModerateTarget(null);
          setBulkModerateAction(null);
          setReason('');
          refreshStats();
        },
        onError: (error: unknown) =>
          toast.error(
            apiErrorMessage(error, t('admin.content.toast.bulkFailed', 'Failed to update products')),
          ),
      },
    );
  };

  const confirmBulkModerate = () => {
    if (!bulkModerateAction) return;
    handleBulkModerate(bulkModerateAction === 'activate');
  };

  return (
    <div className="space-y-6 p-6">
      {/* ── [A] Page Header ──────────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t('admin.content.title', 'Product Content Moderation')}
        </h1>
        <p className="text-muted-foreground">
          {t('admin.content.subtitle', 'Review and moderate product content')}
        </p>
      </div>

      {/* ── [B] Stats Bar ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {[
          {
            label: t('admin.content.stats.total', 'Total Products'),
            value: stats.total,
            icon: Package,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            filter: '',
          },
          {
            label: t('admin.content.status.active', 'Active'),
            value: stats.active,
            icon: CheckCircle,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            filter: 'active',
          },
          {
            label: t('admin.content.status.inactive', 'Inactive'),
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
            placeholder={t('admin.content.filters.searchPlaceholder', 'Search products by name or shop...')}
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

      {/* ── [E] Products Table ──────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5">
        {/* ── Bulk Actions ────────────────────────────────────────────── */}
        {selectedIds.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted p-3">
            <span className="text-sm font-medium">
              {t('admin.content.table.selected', {
                count: selectedIds.length,
                defaultValue: '{{count}} selected',
              })}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="destructive"
                disabled={
                  selectedIds.length === 0 ||
                  !products.some(
                    (p) =>
                      selectedIds.includes(p.id) &&
                      p.isActive &&
                      !p.hasPendingOrders,
                  )
                }
                onClick={() => openBulkModerateDialog('deactivate')}
              >
                <Ban className="h-4 w-4 mr-1" /> {t('admin.content.bulk.deactivateAll', 'Deactivate All')}
              </Button>
              <Button
                size="sm"
                disabled={
                  selectedIds.length === 0 ||
                  !products.some(
                    (p) => selectedIds.includes(p.id) && !p.isActive,
                  )
                }
                onClick={() => openBulkModerateDialog('activate')}
              >
                <CheckCircle className="h-4 w-4 mr-1" /> {t('admin.content.bulk.activateAll', 'Activate All')}
              </Button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-md border border-border bg-card">
          <Table className="border-separate border-spacing-0 [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_th]:h-12 [&_th]:border-b [&_th]:border-border [&_th]:bg-primary/10 [&_th]:px-4 [&_th]:text-left [&_th]:text-sm [&_th]:font-bold [&_th]:text-muted-foreground [&_th]:whitespace-nowrap [&_th:last-child]:w-32 [&_th:last-child]:text-right [&_td]:border-b [&_td]:border-border [&_td]:bg-card [&_td]:px-2 [&_td]:py-3 [&_td]:text-[13px] [&_td]:text-muted-foreground [&_td]:whitespace-nowrap [&_td:last-child]:w-32 sm:[&_td]:px-3.5 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-muted/40">
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
                <TableHead>{t('admin.content.table.product', 'Product')}</TableHead>
                <TableHead>{t('admin.content.table.shop', 'Shop')}</TableHead>
                <TableHead>{t('admin.content.table.price', 'Price')}</TableHead>
                <TableHead>{t('admin.content.table.status', 'Status')}</TableHead>
                <TableHead>{t('admin.content.table.created', 'Created')}</TableHead>
                <TableHead className="text-right">{t('admin.content.table.actions', 'Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-12 text-muted-foreground"
                  >
                    {t('admin.content.table.empty', 'No products found.')}
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
                      <p className="text-sm">{product.merchant?.shopName || t('admin.content.na', 'N/A')}</p>
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
                          aria-label={t('admin.content.viewDetails', 'View product details')}
                          title={t('admin.content.viewDetails', 'View product details')}
                          data-testid="btn-view-product"
                          className="h-7 w-7 border-sky-300 bg-sky-100 text-sky-700 hover:bg-sky-200 hover:text-sky-800"
                          onClick={() => setDetailProduct(product)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {product.isActive ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                {/* wrapper: disabled buttons don't fire pointer events */}
                                <span>
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-8 w-8 disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={product.hasPendingOrders}
                                    onClick={() =>
                                      openModerate(product, 'deactivate')
                                    }
                                  >
                                    <Ban className="h-4 w-4 text-destructive" />
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              {product.hasPendingOrders && (
                                <TooltipContent>
                                  <p>
                                    {t(
                                      'admin.content.tooltip.pendingOrders',
                                      'Cannot deactivate until the order delivery is completed.',
                                    )}
                                  </p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
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
        <TablePagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          limit={limit}
          onLimitChange={setLimit}
          total={total}
          itemLabel={t('admin.content.pagination.itemLabel', 'products')}
        />
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* DIALOGS                                                            */}
      {/* ════════════════════════════════════════════════════════════════════ */}

      {/* ── Product Detail Modal ─────────────────────────────────────────── */}
      <Dialog
        open={!!detailProduct}
        onOpenChange={() => setDetailProduct(null)}
      >
        <DialogContent className="max-w-xl rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xl dark:border-border dark:bg-background dark:text-foreground dark:[&_.bg-slate-50]:bg-secondary/40 dark:[&_.bg-white]:bg-secondary/50 dark:[&_.border-slate-200]:border-border dark:[&_.bg-slate-200]:bg-secondary dark:[&_.text-slate-900]:text-foreground dark:[&_.text-slate-700]:text-foreground dark:[&_.text-slate-600]:text-muted-foreground dark:[&_.text-slate-500]:text-muted-foreground">
          <DialogHeader className="border-b border-slate-200 pb-2">
            <DialogTitle className="text-base font-semibold tracking-wide text-slate-900">
              {t('admin.content.detail.title', 'Product Moderation')}
            </DialogTitle>
          </DialogHeader>
          {detailProduct && (
            <div className="space-y-3 pt-1">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {t('admin.content.detail.info', 'Product Information')}
                  </p>
                </div>

                <div className="rounded-md border border-slate-200 bg-white p-2">
                  <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500 mb-1">
                    {t('admin.content.table.product', 'Product')}
                  </p>
                  <div className="flex items-center gap-3">
                    {detailProduct.images?.[0] && (
                      <img
                        src={getImageUrl(detailProduct.images[0])}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded object-cover"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {detailProduct.name}
                      </p>
                      <p className="text-xs text-slate-600">
                        ${Number(detailProduct.price).toFixed(2)}
                        {detailProduct.category && (
                          <> &middot; {detailProduct.category.name}</>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-2 rounded-md border border-slate-200 bg-white p-2">
                  <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500 mb-1">
                    {t('admin.content.table.shop', 'Shop')}
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-700">
                      {detailProduct.merchant?.shopName
                        ?.split(' ')
                        .map((part: string) => part[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2) || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {detailProduct.merchant?.shopName || t('admin.content.na', 'N/A')}
                      </p>
                      <p className="truncate text-xs text-slate-600">
                        {detailProduct.merchant?.user?.name || ''}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div className="rounded-md border border-slate-200 bg-white p-2">
                    <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500">
                      {t('admin.content.table.status', 'Status')}
                    </p>
                    <div className="mt-1">
                      <ProductStatusBadge isActive={detailProduct.isActive} />
                    </div>
                  </div>

                  <div className="rounded-md border border-slate-200 bg-white p-2">
                    <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500">
                      {t('admin.content.table.created', 'Created')}
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {new Date(detailProduct.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {detailProduct.images?.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {t('admin.content.detail.images', 'Product Images')}
                  </p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
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

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  onClick={() => setDetailProduct(null)}
                >
                  {t('common.cancel', 'Cancel')}
                </Button>
                {detailProduct.isActive ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            variant="destructive"
                            disabled={detailProduct.hasPendingOrders}
                            onClick={() => {
                              setDetailProduct(null);
                              openModerate(detailProduct, 'deactivate');
                            }}
                          >
                            <Ban className="h-4 w-4 mr-1" />{' '}
                            {t('admin.content.action.deactivate', 'Deactivate')}
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {detailProduct.hasPendingOrders && (
                        <TooltipContent>
                          <p>
                            {t(
                              'admin.content.tooltip.pendingOrders',
                              'Cannot deactivate until the order delivery is completed.',
                            )}
                          </p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <Button
                    className="bg-[#7C3AED] text-white hover:bg-[#6D28D9]"
                    onClick={() => {
                      setDetailProduct(null);
                      openModerate(detailProduct, 'reactivate');
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" /> {t('admin.content.action.reactivate', 'Reactivate')}
                  </Button>
                )}
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
              {moderateAction === 'deactivate'
                ? t('admin.content.dialog.deactivateTitle', 'Deactivate Product')
                : t('admin.content.dialog.reactivateTitle', 'Reactivate Product')}
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
                    placeholder={t(
                      'admin.content.reasonPlaceholder',
                      'Enter deactivation reason (required, max 500 characters)...',
                    )}
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
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant={moderateAction === 'deactivate' ? 'destructive' : 'default'}
              disabled={moderateAction === 'deactivate' && !reason.trim()}
              onClick={handleModerate}
            >
              {moderateAction === 'deactivate'
                ? t('admin.content.action.deactivate', 'Deactivate')
                : t('admin.content.action.reactivate', 'Reactivate')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Moderate Products Confirmation ─────────────────────────── */}
      <Dialog
        open={!!bulkModerateAction}
        onOpenChange={() => {
          setBulkModerateAction(null);
          setReason('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkModerateAction === 'deactivate'
                ? t('admin.content.bulk.deactivateTitle', {
                    count: selectedIds.length,
                    defaultValue_one: 'Deactivate {{count}} Product',
                    defaultValue_other: 'Deactivate {{count}} Products',
                  })
                : t('admin.content.bulk.activateTitle', {
                    count: selectedIds.length,
                    defaultValue_one: 'Activate {{count}} Product',
                    defaultValue_other: 'Activate {{count}} Products',
                  })}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {bulkModerateAction === 'deactivate'
              ? t(
                  'admin.content.bulk.deactivateDescription',
                  'The selected products will be deactivated and hidden from the storefront. This can be undone later.',
                )
              : t(
                  'admin.content.bulk.activateDescription',
                  'The selected products will be activated and visible on the storefront.',
                )}
          </p>
          {bulkModerateAction === 'deactivate' && (
            <div className="space-y-2">
              <Textarea
                placeholder={t(
                  'admin.content.reasonPlaceholder',
                  'Enter deactivation reason (required, max 500 characters)...',
                )}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
              />
              <div className="text-xs text-muted-foreground text-right">
                {reason.length}/500
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBulkModerateAction(null);
                setReason('');
              }}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant={bulkModerateAction === 'deactivate' ? 'destructive' : 'default'}
              disabled={
                bulkModerateMutation.isPending ||
                (bulkModerateAction === 'deactivate' && !reason.trim())
              }
              onClick={confirmBulkModerate}
            >
              {bulkModerateAction === 'deactivate'
                ? t('admin.content.bulk.deactivateAll', 'Deactivate All')
                : t('admin.content.bulk.activateAll', 'Activate All')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
