import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { cn } from '@/lib/utils';
import { useMerchantApproval } from '@/features/admin/merchant-management/hooks/useMerchantApproval';
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
import { TablePagination } from '@/components/ui/pagination';
import {
  Search,
  Eye,
  Check,
  X,
  Store,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Download,
  SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { Merchant } from '@/features/admin/merchant-management/services/merchant.service';

// ─── Stats Types ────────────────────────────────────────────────────────────

interface MerchantStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

// ─── Stats Fetcher Hook ─────────────────────────────────────────────────────

function useMerchantStats() {
  const [stats, setStats] = useState<MerchantStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  const fetchStats = useCallback(async () => {
    const [totalRes, pendingRes, approvedRes, rejectedRes] = await Promise.all([
      api.get('/admin/merchants', { params: { limit: 1 } }),
      api.get('/admin/merchants', { params: { status: 'pending', limit: 1 } }),
      api.get('/admin/merchants', { params: { status: 'approved', limit: 1 } }),
      api.get('/admin/merchants', { params: { status: 'rejected', limit: 1 } }),
    ]);
    setStats({
      total: totalRes.data.data.total ?? 0,
      pending: pendingRes.data.data.total ?? 0,
      approved: approvedRes.data.data.total ?? 0,
      rejected: rejectedRes.data.data.total ?? 0,
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const [totalRes, pendingRes, approvedRes, rejectedRes] = await Promise.all([
          api.get('/admin/merchants', { params: { limit: 1 }, signal: controller.signal }),
          api.get('/admin/merchants', { params: { status: 'pending', limit: 1 }, signal: controller.signal }),
          api.get('/admin/merchants', { params: { status: 'approved', limit: 1 }, signal: controller.signal }),
          api.get('/admin/merchants', { params: { status: 'rejected', limit: 1 }, signal: controller.signal }),
        ]);
        setStats({
          total: totalRes.data.data.total ?? 0,
          pending: pendingRes.data.data.total ?? 0,
          approved: approvedRes.data.data.total ?? 0,
          rejected: rejectedRes.data.data.total ?? 0,
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

function MerchantStatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  const icons: Record<string, React.ReactNode> = {
    pending: <Clock className="h-3 w-3 mr-1" />,
    approved: <CheckCircle className="h-3 w-3 mr-1" />,
    rejected: <XCircle className="h-3 w-3 mr-1" />,
  };
  return (
    <Badge variant="outline" className={variants[status] || ''}>
      {icons[status]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

// ─── Helper Functions ───────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const avatarColors = [
  'bg-rose-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-sky-500',
  'bg-violet-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-indigo-500',
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function truncateText(value: string, maxLength = 20) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function MerchantManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightMerchantId = searchParams.get('merchantId');

  useEffect(() => {
    if (highlightMerchantId) {
      const timer = setTimeout(() => {
        setSearchParams((params) => {
          params.delete('merchantId')
          return params
        })
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [highlightMerchantId, setSearchParams])

  // ── State ───────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [status, setStatus] = useState<string>('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 300);
  const [merchantSort, setMerchantSort] = useState('createdAt');
  const [merchantOrder, setMerchantOrder] = useState<'asc' | 'desc'>('desc');

  // ── Dialog State ────────────────────────────────────────────────────────
  const [detailMerchant, setDetailMerchant] = useState<Merchant | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Merchant | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approveTarget, setApproveTarget] = useState<Merchant | null>(null);

  // ── Stats ───────────────────────────────────────────────────────────────
  const { stats, refreshStats } = useMerchantStats();

  // ── Queries ─────────────────────────────────────────────────────────────
  const { merchantsQuery, approveMutation, rejectMutation } = useMerchantApproval({
    page,
    limit,
    status: (status as 'pending' | 'approved' | 'rejected' | undefined) || undefined,
    search: debouncedSearch || undefined,
    sort: merchantSort,
    order: merchantOrder,
  });

  // ── Derived Data ────────────────────────────────────────────────────────
  const merchants = merchantsQuery.data?.items || [];
  const totalPages = merchantsQuery.data?.totalPages || 1;
  const total = merchantsQuery.data?.total ?? 0;

  // ── Sort Mapping ────────────────────────────────────────────────────────
  const sortOptions = useMemo(
    () => [
      { value: 'createdAt:desc', label: 'Newest' },
      { value: 'createdAt:asc', label: 'Oldest' },
      { value: 'shopName:asc', label: 'Name (A-Z)' },
      { value: 'shopName:desc', label: 'Name (Z-A)' },
    ],
    [],
  );

  const currentSortValue = `${merchantSort}:${merchantOrder}`;

  const handleSortChange = (value: string) => {
    const [sort, order] = value.split(':');
    setMerchantSort(sort);
    setMerchantOrder(order as 'asc' | 'desc');
    setPage(1);
  };

  // ── Actions ─────────────────────────────────────────────────────────────
  const openApproveDialog = (merchant: Merchant) => {
    setApproveTarget(merchant);
  };

  const handleApprove = () => {
    if (!approveTarget) return;
    approveMutation.mutate(
      { id: approveTarget.id },
      {
        onSuccess: () => {
          toast.success('Merchant approved');
          setApproveTarget(null);
          setDetailMerchant(null);
          refreshStats();
        },
        onError: () => toast.error('Failed to approve merchant'),
      },
    );
  };

  const openRejectDialog = (merchant: Merchant) => {
    setRejectTarget(merchant);
    setRejectReason('');
  };

  const handleReject = () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    rejectMutation.mutate(
      { id: rejectTarget.id, reason: rejectReason },
      {
        onSuccess: () => {
          toast.success('Merchant rejected');
          setRejectTarget(null);
          setRejectReason('');
          setDetailMerchant(null);
          refreshStats();
        },
        onError: () => toast.error('Failed to reject merchant'),
      },
    );
  };

  return (
    <div className="space-y-6 p-6">
      {/* ── [A] Page Header ──────────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Merchant Management
        </h1>
        <p className="text-muted-foreground">
          Review business licenses and manage merchant registrations
        </p>
      </div>

      {/* ── [B] Stats Bar ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          {
            label: 'Total Merchants',
            value: stats.total,
            icon: Store,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            filter: '',
          },
          {
            label: 'Pending',
            value: stats.pending,
            icon: Clock,
            color: 'text-amber-400',
            bg: 'bg-amber-500/10',
            filter: 'pending',
          },
          {
            label: 'Approved',
            value: stats.approved,
            icon: CheckCircle,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            filter: 'approved',
          },
          {
            label: 'Rejected',
            value: stats.rejected,
            icon: XCircle,
            color: 'text-red-400',
            bg: 'bg-red-500/10',
            filter: 'rejected',
          },
        ].map((stat) => (
          <Card
            key={stat.label}
            role="button"
            tabIndex={0}
            onClick={() => {
              setStatus(stat.filter);
              setPage(1);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setStatus(stat.filter);
                setPage(1);
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

      {/* ── [C] Search + Sort Bar ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-start gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search merchants by name or email..."
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

      {/* ── [E] Merchants Table ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="overflow-x-auto rounded-md border border-border bg-card">
          <Table className="border-separate border-spacing-0 [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_th]:h-12 [&_th]:border-b [&_th]:border-border [&_th]:bg-primary/10 [&_th]:px-4 [&_th]:text-left [&_th]:text-sm [&_th]:font-bold [&_th]:text-muted-foreground [&_th]:whitespace-nowrap [&_th:last-child]:w-24 [&_th:last-child]:text-right [&_td]:border-b [&_td]:border-border [&_td]:bg-card [&_td]:px-2 [&_td]:py-3 [&_td]:text-[13px] [&_td]:text-muted-foreground [&_td]:whitespace-nowrap [&_td:last-child]:w-24 sm:[&_td]:px-3.5 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-muted/40">
            <TableHeader>
              <TableRow>
                <TableHead>Shop</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead>License Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {merchants.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-12 text-muted-foreground"
                  >
                    No merchants found.
                  </TableCell>
                </TableRow>
              ) : (
                merchants.map((merchant) => (
                  <TableRow key={merchant.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-lg text-xs font-medium text-white ${getAvatarColor(
                            merchant.shopName || '',
                          )}`}
                        >
                          {getInitials(merchant.shopName || 'S')}
                        </div>
                        <div className="min-w-0">
                          <p className="max-w-[20ch] truncate text-sm font-medium" title={merchant.shopName}>
                            {truncateText(merchant.shopName || 'N/A')}
                          </p>
                          {merchant.businessLicenseUrl && (
                            <a
                              href={merchant.businessLicenseUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              <FileText className="h-3 w-3" />
                              License
                            </a>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="max-w-[20ch] truncate text-sm font-medium" title={merchant.user?.name || 'N/A'}>
                          {truncateText(merchant.user?.name || 'N/A')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {merchant.user?.email || ''}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(merchant.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <MerchantStatusBadge status={merchant.licenseStatus} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => setDetailMerchant(merchant)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
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
          itemLabel="merchants"
        />
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* DIALOGS                                                            */}
      {/* ════════════════════════════════════════════════════════════════════ */}

      {/* ── Merchant Detail Modal ────────────────────────────────────────── */}
      <Dialog
        open={!!detailMerchant}
        onOpenChange={() => setDetailMerchant(null)}
      >
        <DialogContent className="max-w-xl rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xl dark:border-border dark:bg-background dark:text-foreground dark:[&_.bg-slate-50]:bg-secondary/40 dark:[&_.bg-white]:bg-secondary/50 dark:[&_.border-slate-200]:border-border dark:[&_.bg-slate-200]:bg-secondary dark:[&_.text-slate-900]:text-foreground dark:[&_.text-slate-700]:text-foreground dark:[&_.text-slate-600]:text-muted-foreground dark:[&_.text-slate-500]:text-muted-foreground dark:[&_.text-slate-400]:text-muted-foreground">
          <DialogHeader className="border-b border-slate-200 pb-2">
            <DialogTitle className="text-base font-semibold tracking-wide text-slate-900">
              Merchant Detail
            </DialogTitle>
          </DialogHeader>
          {detailMerchant && (
            <div className="space-y-3 pt-1">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Merchant Information
                  </p>
                </div>

                <div className="rounded-md border border-slate-200 bg-white p-2">
                  <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500 mb-1">
                    Shop
                  </p>
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white ${getAvatarColor(
                        detailMerchant.shopName || '',
                      )}`}
                    >
                      {getInitials(detailMerchant.shopName || 'S')}
                    </div>
                    <div className="min-w-0">
                      <p
                        className="truncate text-sm font-medium text-slate-900"
                        title={detailMerchant.shopName}
                      >
                        {truncateText(detailMerchant.shopName || 'N/A')}
                      </p>
                      <p className="text-xs text-slate-600">
                        Registered {new Date(detailMerchant.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {detailMerchant.businessLicenseUrl && (
                  <div className="mt-2 rounded-md border border-slate-200 bg-white p-2">
                    <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500 mb-1">
                      Business License
                    </p>
                    {detailMerchant.businessLicenseUrl.endsWith('.pdf') ? (
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-slate-400" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">Business License Document</p>
                          <p className="text-xs text-slate-600">PDF document</p>
                        </div>
                        <Button size="sm" variant="outline" asChild className="border-slate-200 text-slate-700">
                          <a
                            href={getImageUrl(detailMerchant.businessLicenseUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </a>
                        </Button>
                      </div>
                    ) : (
                      <img
                        src={getImageUrl(detailMerchant.businessLicenseUrl)}
                        alt="Business License"
                        className="w-full rounded object-contain max-h-64"
                      />
                    )}
                  </div>
                )}

                <div className="mt-2 rounded-md border border-slate-200 bg-white p-2">
                  <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500 mb-1">
                    Owner
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-700">
                      {detailMerchant.user?.name
                        ?.split(' ')
                        .map((part: string) => part[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2) || '?'}
                    </div>
                    <div className="min-w-0">
                      <p
                        className="truncate text-sm font-medium text-slate-900"
                        title={detailMerchant.user?.name || 'N/A'}
                      >
                        {truncateText(detailMerchant.user?.name || 'N/A')}
                      </p>
                      <p className="truncate text-xs text-slate-600">
                        {detailMerchant.user?.email || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div className="rounded-md border border-slate-200 bg-white p-2">
                    <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500">
                      Status
                    </p>
                    <div className="mt-1">
                      <MerchantStatusBadge status={detailMerchant.licenseStatus} />
                    </div>
                  </div>

                  <div className="rounded-md border border-slate-200 bg-white p-2">
                    <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500">
                      Submitted
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {new Date(detailMerchant.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {detailMerchant.rejectionReason && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Rejection Reason
                  </p>
                  <div className="rounded-md border border-slate-200 bg-white p-2">
                    <p className="whitespace-pre-wrap text-xs leading-5 text-slate-700">
                      {detailMerchant.rejectionReason}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  onClick={() => setDetailMerchant(null)}
                >
                  Cancel
                </Button>
                {detailMerchant.licenseStatus === 'pending' && (
                  <>
                    <Button
                      onClick={() => {
                        setDetailMerchant(null);
                        openApproveDialog(detailMerchant);
                      }}
                    >
                      <Check className="h-4 w-4 mr-1" /> Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setDetailMerchant(null);
                        openRejectDialog(detailMerchant);
                      }}
                    >
                      <X className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Approve Merchant Confirmation ──────────────────────────────── */}
      <Dialog open={!!approveTarget} onOpenChange={() => setApproveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Merchant</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to approve{' '}
            <strong className="text-foreground">{approveTarget?.shopName}</strong>?
            Its status will change to Approved.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approveMutation.isPending}
            >
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reject Merchant Dialog (from table dropdown) ─────────────────── */}
      <Dialog
        open={!!rejectTarget && !detailMerchant}
        onOpenChange={() => {
          setRejectTarget(null);
          setRejectReason('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Merchant</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to reject{' '}
            <strong>{rejectTarget?.shopName}</strong>?
          </p>
          <Textarea
            placeholder="Enter rejection reason (required, max 500 characters)..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            maxLength={500}
          />
          <div className="text-xs text-muted-foreground text-right">
            {rejectReason.length}/500
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectTarget(null);
                setRejectReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim()}
              onClick={handleReject}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
