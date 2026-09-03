import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useAdminReviews,
  useAdminReports,
} from '@/features/admin/content-moderation/hooks/useModeration';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Check,
  Trash2,
  Search,
  Eye,
  X,
  Flag,
  ChevronLeft,
  ChevronRight,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  SlidersHorizontal,
  ArrowUpDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type {
  AdminReview,
  AdminReport,
} from '@/features/admin/content-moderation/services/moderation.service';

// ─── Stats Types ────────────────────────────────────────────────────────────

interface ReviewStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

// ─── Stats Fetcher Hook ─────────────────────────────────────────────────────

function useReviewStats() {
  const [stats, setStats] = useState<ReviewStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  const fetchStats = useCallback(async () => {
    try {
      const [totalRes, pendingRes, approvedRes, rejectedRes] = await Promise.all([
        api.get('/admin/reviews', { params: { limit: 1 } }),
        api.get('/admin/reviews', { params: { status: 'pending', limit: 1 } }),
        api.get('/admin/reviews', { params: { status: 'approved', limit: 1 } }),
        api.get('/admin/reviews', { params: { status: 'rejected', limit: 1 } }),
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
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

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

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ReviewManagement() {
  // ── Reviews State ────────────────────────────────────────────────────────
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewLimit, setReviewLimit] = useState(4);
  const [reviewStatus, setReviewStatus] = useState<string>('');
  const [reviewSearch, setReviewSearch] = useState('');
  const debouncedSearch = useDebounced(reviewSearch, 300);
  const [reviewSort, setReviewSort] = useState('createdAt');
  const [reviewOrder, setReviewOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedReviews, setSelectedReviews] = useState<string[]>([]);

  // ── Reports State ────────────────────────────────────────────────────────
  const [reportPage, setReportPage] = useState(1);
  const [reportStatus, setReportStatus] = useState<string>('');
  const [reportSearch, setReportSearch] = useState('');

  // ── Dialog State ─────────────────────────────────────────────────────────
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [detailReview, setDetailReview] = useState<AdminReview | null>(null);
  const [detailReport, setDetailReport] = useState<AdminReport | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);

  // ── Stats ────────────────────────────────────────────────────────────────
  const { stats, refreshStats } = useReviewStats();

  // ── Queries ──────────────────────────────────────────────────────────────
  const {
    query: reviewsQuery,
    moderateMutation,
    deleteMutation,
    bulkModerateMutation,
    bulkDeleteMutation,
  } = useAdminReviews({
    page: reviewPage,
    limit: reviewLimit,
    status: (reviewStatus as 'approved' | 'rejected' | 'pending' | undefined) || undefined,
    search: debouncedSearch || undefined,
    sort: reviewSort,
    order: reviewOrder,
  });

  const {
    query: reportsQuery,
    updateStatusMutation,
    deleteMutation: deleteReportMutation,
  } = useAdminReports({
    page: reportPage,
    limit: 20,
    status: (reportStatus as 'pending' | 'reviewed' | 'resolved' | 'rejected' | undefined) || undefined,
    search: reportSearch || undefined,
  });

  // ── Derived Data ─────────────────────────────────────────────────────────
  const reviews = reviewsQuery.data?.items || [];
  const reports = reportsQuery.data?.items || [];
  const reviewTotalPages = reviewsQuery.data?.totalPages || 1;
  const reportTotalPages = reportsQuery.data?.totalPages || 1;
  const reviewTotal = reviewsQuery.data?.total ?? 0;

  // ── Sort Mapping ─────────────────────────────────────────────────────────
  const sortOptions = useMemo(
    () => [
      { value: 'createdAt:desc', label: 'Newest' },
      { value: 'createdAt:asc', label: 'Oldest' },
      { value: 'rating:desc', label: 'Rating (High-Low)' },
      { value: 'rating:asc', label: 'Rating (Low-High)' },
    ],
    [],
  );

  const currentSortValue = `${reviewSort}:${reviewOrder}`;

  const handleSortChange = (value: string) => {
    const [sort, order] = value.split(':');
    setReviewSort(sort);
    setReviewOrder(order as 'asc' | 'desc');
    setReviewPage(1);
  };

  // ── Review Actions ───────────────────────────────────────────────────────
  const handleApprove = (id: string) => {
    moderateMutation.mutate(
      { id, data: { action: 'approve' } },
      {
        onSuccess: () => {
          toast.success('Review approved');
          refreshStats();
        },
        onError: () => toast.error('Failed to approve review'),
      },
    );
  };

  const openRejectDialog = (id: string) => {
    setRejectTarget(id);
    setRejectReason('');
  };

  const handleReject = () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    moderateMutation.mutate(
      { id: rejectTarget, data: { action: 'reject', reason: rejectReason } },
      {
        onSuccess: () => {
          toast.success('Review rejected');
          setRejectTarget(null);
          setRejectReason('');
          setDetailReview(null);
          refreshStats();
        },
        onError: () => toast.error('Failed to reject review'),
      },
    );
  };

  const openDeleteDialog = (id: string) => {
    setDeleteTarget(id);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget, {
      onSuccess: () => {
        toast.success('Review deleted');
        setDeleteTarget(null);
        setDetailReview(null);
        refreshStats();
      },
      onError: () => toast.error('Failed to delete review'),
    });
  };

  // ── Bulk Actions ─────────────────────────────────────────────────────────
  const handleBulkApprove = () => {
    if (selectedReviews.length === 0) return;
    bulkModerateMutation.mutate(
      { ids: selectedReviews, action: 'approve' },
      {
        onSuccess: () => {
          toast.success(`${selectedReviews.length} reviews approved`);
          setSelectedReviews([]);
          refreshStats();
        },
      },
    );
  };

  const handleBulkReject = () => {
    if (selectedReviews.length === 0 || !rejectReason.trim()) return;
    bulkModerateMutation.mutate(
      { ids: selectedReviews, action: 'reject', reason: rejectReason },
      {
        onSuccess: () => {
          toast.success(`${selectedReviews.length} reviews rejected`);
          setSelectedReviews([]);
          setBulkRejectOpen(false);
          setRejectReason('');
          refreshStats();
        },
      },
    );
  };

  const handleBulkDelete = () => {
    if (selectedReviews.length === 0) return;
    bulkDeleteMutation.mutate(
      { ids: selectedReviews },
      {
        onSuccess: () => {
          toast.success(`${selectedReviews.length} reviews deleted`);
          setSelectedReviews([]);
          refreshStats();
        },
      },
    );
  };

  // ── Report Actions ───────────────────────────────────────────────────────
  const handleResolveReport = (id: string, status: 'resolved' | 'rejected') => {
    updateStatusMutation.mutate(
      { id, data: { status } },
      {
        onSuccess: () => toast.success(`Report ${status}`),
        onError: () => toast.error('Failed to update report'),
      },
    );
  };

  const handleDeleteReport = (id: string) => {
    deleteReportMutation.mutate(id, {
      onSuccess: () => toast.success('Report deleted'),
      onError: () => toast.error('Failed to delete report'),
    });
  };

  // ── Selection Helpers ────────────────────────────────────────────────────
  const toggleSelectAll = () => {
    if (selectedReviews.length === reviews.length) {
      setSelectedReviews([]);
    } else {
      setSelectedReviews(reviews.map((r) => r.id));
    }
  };

  const toggleSelectReview = (id: string) => {
    setSelectedReviews((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  // ── Helper: Get initials from name ───────────────────────────────────────
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // ── Helper: Avatar colors based on name ──────────────────────────────────
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

  const getAvatarColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return avatarColors[Math.abs(hash) % avatarColors.length];
  };

  // ── Helper: Star rating display ──────────────────────────────────────────
  const StarRating = ({ rating }: { rating: number }) => (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`text-sm ${
            star <= rating ? 'text-yellow-400' : 'text-gray-600'
          }`}
        >
          ★
        </span>
      ))}
    </div>
  );

  // ── Helper: Status badge ─────────────────────────────────────────────────
  const ReviewStatusBadge = ({ isApproved }: { isApproved: boolean }) => (
    <Badge
      variant={isApproved ? 'default' : 'outline'}
      className={
        isApproved
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      }
    >
      {isApproved ? (
        <CheckCircle className="h-3 w-3 mr-1" />
      ) : (
        <Clock className="h-3 w-3 mr-1" />
      )}
      {isApproved ? 'Approved' : 'Pending'}
    </Badge>
  );

  const ReportStatusBadge = ({ status }: { status: string }) => {
    const variants: Record<string, string> = {
      pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      reviewed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      resolved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
    };
    return (
      <Badge variant="outline" className={variants[status] || ''}>
        {status}
      </Badge>
    );
  };

  // ── Helper: Reason badge ─────────────────────────────────────────────────
  const ReasonBadge = ({ reason }: { reason: string }) => {
    const variants: Record<string, string> = {
      spam: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      inappropriate: 'bg-red-500/10 text-red-400 border-red-500/20',
      fake: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      other: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    };
    return (
      <Badge variant="outline" className={variants[reason] || ''}>
        {reason}
      </Badge>
    );
  };

  // ── Helper: Page numbers ─────────────────────────────────────────────────
  const getPageNumbers = (current: number, total: number) => {
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
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6 p-6">
      {/* ── [A] Page Header ─────────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Review & Report Management
        </h1>
        <p className="text-muted-foreground">
          Moderate product reviews and reports
        </p>
      </div>

      <Tabs defaultValue="reviews">
        {/* ── [B] Screen Tabs ──────────────────────────────────────────── */}
        <TabsList>
          <TabsTrigger value="reviews" className="gap-2">
            <FileText className="h-4 w-4" />
            Reviews
            <Badge variant="secondary" className="ml-1">
              {reviewTotal}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <Flag className="h-4 w-4" />
            Reports
            <Badge variant="secondary" className="ml-1">
              {reportsQuery.data?.total ?? 0}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* REVIEWS TAB                                                  */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="reviews" className="space-y-4">
          {/* ── [C] Stats Bar ──────────────────────────────────────────── */}
          <div className="grid grid-cols-4 gap-4">
            {[
              {
                label: 'Total Reviews',
                value: stats.total,
                icon: FileText,
                color: 'text-blue-400',
                bg: 'bg-blue-500/10',
              },
              {
                label: 'Pending',
                value: stats.pending,
                icon: Clock,
                color: 'text-amber-400',
                bg: 'bg-amber-500/10',
              },
              {
                label: 'Approved',
                value: stats.approved,
                icon: CheckCircle,
                color: 'text-emerald-400',
                bg: 'bg-emerald-500/10',
              },
              {
                label: 'Rejected',
                value: stats.rejected,
                icon: XCircle,
                color: 'text-red-400',
                bg: 'bg-red-500/10',
              },
            ].map((stat) => (
              <Card key={stat.label}>
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

          {/* ── [D] Filter Tabs ────────────────────────────────────────── */}
          <div className="flex items-center gap-2">
            {[
              { value: '', label: 'All', count: stats.total },
              { value: 'pending', label: 'Pending', count: stats.pending },
              { value: 'approved', label: 'Approved', count: stats.approved },
              { value: 'rejected', label: 'Rejected', count: stats.rejected },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => {
                  setReviewStatus(f.value);
                  setReviewPage(1);
                  setSelectedReviews([]);
                }}
                className={`px-4 py-2 text-sm rounded-md transition-colors ${
                  reviewStatus === f.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {f.label} {f.count}
              </button>
            ))}
          </div>

          {/* ── [E] Search + Sort Bar ──────────────────────────────────── */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reviews by user, product, or content..."
                value={reviewSearch}
                onChange={(e) => {
                  setReviewSearch(e.target.value);
                  setReviewPage(1);
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

          {/* ── Bulk Actions ───────────────────────────────────────────── */}
          {selectedReviews.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
              <span className="text-sm font-medium">
                {selectedReviews.length} selected
              </span>
              <Button size="sm" onClick={handleBulkApprove}>
                <Check className="h-4 w-4 mr-1" /> Approve All
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setBulkRejectOpen(true)}
              >
                <Flag className="h-4 w-4 mr-1" /> Reject All
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  if (
                    confirm(
                      `Permanently delete ${selectedReviews.length} selected reviews? This cannot be undone.`,
                    )
                  )
                    handleBulkDelete();
                }}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Delete All
              </Button>
            </div>
          )}

          {/* ── [F] Reviews Table ──────────────────────────────────────── */}
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        reviews.length > 0 &&
                        selectedReviews.length === reviews.length
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-12 text-muted-foreground"
                    >
                      No reviews found.
                    </TableCell>
                  </TableRow>
                ) : (
                  reviews.map((review) => (
                    <TableRow key={review.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedReviews.includes(review.id)}
                          onCheckedChange={() =>
                            toggleSelectReview(review.id)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium text-white ${getAvatarColor(
                              review.user?.name || '',
                            )}`}
                          >
                            {getInitials(review.user?.name || '?')}
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {review.user?.name || 'N/A'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {review.user?.email || ''}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {review.product?.images?.[0] && (
                            <img
                              src={getImageUrl(review.product.images[0])}
                              alt=""
                              className="h-8 w-8 rounded object-cover"
                            />
                          )}
                          <div>
                            <p className="text-sm font-medium max-w-[140px] truncate">
                              {review.product?.name || 'N/A'}
                            </p>
                            {review.product?.price != null && (
                              <p className="text-xs text-muted-foreground">
                                ${Number(review.product.price).toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StarRating rating={review.rating} />
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate text-sm">
                        {review.title || review.body || '-'}
                      </TableCell>
                      <TableCell>
                        <ReviewStatusBadge isApproved={review.isApproved} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => setDetailReview(review)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => handleApprove(review.id)}
                          >
                            <Check className="h-4 w-4 text-emerald-500" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => openRejectDialog(review.id)}
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* ── [G] Pagination ─────────────────────────────────────────── */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Showing {reviews.length > 0 ? (reviewPage - 1) * reviewLimit + 1 : 0}-
              {Math.min(reviewPage * reviewLimit, reviewTotal)} of {reviewTotal}{' '}
              reviews
            </span>
            <div className="flex items-center gap-2">
              <Select
                value={String(reviewLimit)}
                onValueChange={(v) => {
                  setReviewLimit(Number(v));
                  setReviewPage(1);
                }}
              >
                <SelectTrigger className="w-[70px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  disabled={reviewPage <= 1}
                  onClick={() => setReviewPage(reviewPage - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {getPageNumbers(reviewPage, reviewTotalPages).map(
                  (page, idx) =>
                    typeof page === 'number' ? (
                      <Button
                        key={idx}
                        size="icon"
                        variant={page === reviewPage ? 'default' : 'outline'}
                        className="h-8 w-8"
                        onClick={() => setReviewPage(page)}
                      >
                        {page}
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
                  disabled={reviewPage >= reviewTotalPages}
                  onClick={() => setReviewPage(reviewPage + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* REPORTS TAB                                                  */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="reports" className="space-y-4">
          {/* ── Reports Stats ──────────────────────────────────────────── */}
          <div className="grid grid-cols-4 gap-4">
            {[
              {
                label: 'Total',
                value: reportsQuery.data?.total ?? 0,
                color: 'bg-blue-100 text-blue-800',
              },
              {
                label: 'Pending',
                value: reports.filter((r) => r.status === 'pending').length,
                color: 'bg-amber-100 text-amber-800',
              },
              {
                label: 'Resolved',
                value: reports.filter((r) => r.status === 'resolved').length,
                color: 'bg-emerald-100 text-emerald-800',
              },
              {
                label: 'Rejected',
                value: reports.filter((r) => r.status === 'rejected').length,
                color: 'bg-red-100 text-red-800',
              },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {stat.label}
                    </span>
                    <Badge className={stat.color}>{stat.value}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── Reports Filters ────────────────────────────────────────── */}
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              {[
                { value: '', label: 'All' },
                { value: 'pending', label: 'Pending' },
                { value: 'reviewed', label: 'Reviewed' },
                { value: 'resolved', label: 'Resolved' },
                { value: 'rejected', label: 'Rejected' },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => {
                    setReportStatus(f.value);
                    setReportPage(1);
                  }}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    reportStatus === f.value
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
                placeholder="Search reports..."
                value={reportSearch}
                onChange={(e) => {
                  setReportSearch(e.target.value);
                  setReportPage(1);
                }}
                className="pl-9"
              />
            </div>
          </div>

          {/* ── Reports Table ──────────────────────────────────────────── */}
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reporter</TableHead>
                  <TableHead>Review</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-6 text-muted-foreground"
                    >
                      No reports found.
                    </TableCell>
                  </TableRow>
                ) : (
                  reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium text-white ${getAvatarColor(
                              report.reporter?.name || '',
                            )}`}
                          >
                            {getInitials(report.reporter?.name || '?')}
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {report.reporter?.name || 'N/A'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {report.reporter?.email || ''}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[250px] truncate">
                        {report.review?.body || report.review?.title || '-'}
                      </TableCell>
                      <TableCell>
                        <ReasonBadge reason={report.reason} />
                      </TableCell>
                      <TableCell>
                        <ReportStatusBadge status={report.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(report.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setDetailReport(report)}
                            >
                              <Eye className="h-4 w-4 mr-2" /> View Detail
                            </DropdownMenuItem>
                            {report.status === 'pending' && (
                              <>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleResolveReport(report.id, 'resolved')
                                  }
                                >
                                  Resolve
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleResolveReport(report.id, 'rejected')
                                  }
                                >
                                  Reject
                                </DropdownMenuItem>
                              </>
                            )}
                            {report.status !== 'resolved' && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDeleteReport(report.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
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

          {/* ── Reports Pagination ─────────────────────────────────────── */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Page {reportPage} of {reportTotalPages}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={reportPage <= 1}
                onClick={() => setReportPage(reportPage - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={reportPage >= reportTotalPages}
                onClick={() => setReportPage(reportPage + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* DIALOGS                                                           */}
      {/* ════════════════════════════════════════════════════════════════════ */}

      {/* ── Review Detail Modal ─────────────────────────────────────────── */}
      <Dialog open={!!detailReview} onOpenChange={() => setDetailReview(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Detail</DialogTitle>
          </DialogHeader>
          {detailReview && (
            <div className="space-y-5">
              {/* [B] User Info Card */}
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-medium text-white ${getAvatarColor(
                    detailReview.user?.name || '',
                  )}`}
                >
                  {getInitials(detailReview.user?.name || '?')}
                </div>
                <div>
                  <p className="font-semibold">
                    {detailReview.user?.name || 'N/A'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {detailReview.user?.email || ''}
                  </p>
                </div>
              </div>

              {/* [C] Product Info Card */}
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                {detailReview.product?.images?.[0] && (
                  <img
                    src={getImageUrl(detailReview.product.images[0])}
                    alt=""
                    className="h-16 w-16 rounded object-cover"
                  />
                )}
                <div>
                  <p className="font-semibold">
                    {detailReview.product?.name || 'N/A'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {detailReview.product?.slug || ''}
                  </p>
                </div>
              </div>

              {/* [D] Review Content */}
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Rating
                  </p>
                  <div className="flex items-center gap-2">
                    <StarRating rating={detailReview.rating} />
                    <span className="text-sm text-muted-foreground">
                      ({detailReview.rating}/5)
                    </span>
                  </div>
                </div>
                {detailReview.title && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Title
                    </p>
                    <p className="font-medium">{detailReview.title}</p>
                  </div>
                )}
                {detailReview.body && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Review
                    </p>
                    <p className="whitespace-pre-wrap text-sm">
                      {detailReview.body}
                    </p>
                  </div>
                )}
                {detailReview.images?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Images
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {detailReview.images.map((img, i) => (
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
                <div className="flex items-center gap-2">
                  <ReviewStatusBadge isApproved={detailReview.isApproved} />
                  {detailReview.isVerifiedPurchase && (
                    <Badge variant="secondary">Verified Purchase</Badge>
                  )}
                </div>
              </div>

              {/* [E] Moderation Reason (shown when rejecting) */}
              {detailReview.isApproved && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Reason for Rejection
                  </label>
                  <Textarea
                    placeholder="Enter rejection reason (required)..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
              )}

              {/* [F] Action Buttons */}
              <div className="flex gap-2 pt-2">
                {!detailReview.isApproved && (
                  <Button
                    onClick={() => handleApprove(detailReview.id)}
                    disabled={moderateMutation.isPending}
                  >
                    <Check className="h-4 w-4 mr-1" /> Approve
                  </Button>
                )}
                {detailReview.isApproved && (
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={
                      !rejectReason.trim() || moderateMutation.isPending
                    }
                  >
                    <Flag className="h-4 w-4 mr-1" /> Reject
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={() => {
                    setDetailReview(null);
                    openDeleteDialog(detailReview.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Reject Review Dialog (from table dropdown) ──────────────────── */}
      <Dialog
        open={!!rejectTarget && !detailReview}
        onOpenChange={() => {
          setRejectTarget(null);
          setRejectReason('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Review</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Enter rejection reason (required)..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
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

      {/* ── Delete Review Confirmation ──────────────────────────────────── */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Review</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to permanently delete this review? This action
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

      {/* ── Bulk Reject Dialog ──────────────────────────────────────────── */}
      <Dialog
        open={bulkRejectOpen}
        onOpenChange={() => {
          setBulkRejectOpen(false);
          setRejectReason('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {selectedReviews.length} Reviews</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Enter rejection reason (required)..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBulkRejectOpen(false);
                setRejectReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim()}
              onClick={handleBulkReject}
            >
              Reject All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Report Detail Modal ─────────────────────────────────────────── */}
      <Dialog open={!!detailReport} onOpenChange={() => setDetailReport(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Report Detail</DialogTitle>
          </DialogHeader>
          {detailReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Reporter
                  </p>
                  <p>
                    {detailReport.reporter?.name} ({detailReport.reporter?.email})
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Status
                  </p>
                  <ReportStatusBadge status={detailReport.status} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Review
                </p>
                <p className="whitespace-pre-wrap">
                  {detailReport.review?.body}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  On: {detailReport.review?.product?.name}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Reason
                  </p>
                  <ReasonBadge reason={detailReport.reason} />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Date
                  </p>
                  <p>
                    {new Date(detailReport.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {detailReport.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Detail
                  </p>
                  <p>{detailReport.description}</p>
                </div>
              )}
              {detailReport.adminNote && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Admin Note
                  </p>
                  <p>{detailReport.adminNote}</p>
                </div>
              )}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDetailReport(null)}
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
