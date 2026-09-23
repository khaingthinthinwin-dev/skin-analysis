import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
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
  Flag,
  ChevronLeft,
  ChevronRight,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type {
  AdminReview,
  AdminReport,
} from '@/features/admin/content-moderation/services/moderation.service';

// ─── Stats Fetcher Hook ─────────────────────────────────────────────────────

function useReviewStats() {
  const query = useQuery({
    queryKey: ['admin', 'reviewStats'],
    queryFn: async () => {
      const [totalRes, pendingRes, approvedRes, rejectedRes] = await Promise.all([
        api.get('/admin/reviews', { params: { limit: 1 } }),
        api.get('/admin/reviews', { params: { status: 'pending', limit: 1 } }),
        api.get('/admin/reviews', { params: { status: 'approved', limit: 1 } }),
        api.get('/admin/reviews', { params: { status: 'rejected', limit: 1 } }),
      ]);
      return {
        total: totalRes.data.data.total ?? 0,
        pending: pendingRes.data.data.total ?? 0,
        approved: approvedRes.data.data.total ?? 0,
        rejected: rejectedRes.data.data.total ?? 0,
      };
    },
  });

  return { stats: query.data ?? { total: 0, pending: 0, approved: 0, rejected: 0 }, refreshStats: query.refetch };
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

function StarRating({ rating }: { rating: number }) {
  return (
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
}

function ReviewStatusBadge({ status }: { status: string }) {
  const variants: Record<string, { badge: string; icon: React.ReactNode; label: string }> = {
    pending: {
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      icon: <Clock className="h-3 w-3 mr-1" />,
      label: 'Pending',
    },
    approved: {
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      icon: <CheckCircle className="h-3 w-3 mr-1" />,
      label: 'Approved',
    },
    rejected: {
      badge: 'bg-red-500/10 text-red-400 border-red-500/20',
      icon: <XCircle className="h-3 w-3 mr-1" />,
      label: 'Rejected',
    },
  };
  const v = variants[status] || variants.pending;
  return (
    <Badge variant="outline" className={v.badge}>
      {v.icon}
      {v.label}
    </Badge>
  );
}

function ReportStatusBadge({ status }: { status: string }) {
  const variants: Record<string, { badge: string; icon: React.ReactNode; label: string }> = {
    pending: {
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      icon: <Clock className="h-3 w-3 mr-1" />,
      label: 'Pending',
    },
    reviewed: {
      badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      icon: <Eye className="h-3 w-3 mr-1" />,
      label: 'Reviewed',
    },
    resolved: {
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      icon: <CheckCircle className="h-3 w-3 mr-1" />,
      label: 'Resolved',
    },
    rejected: {
      badge: 'bg-red-500/10 text-red-400 border-red-500/20',
      icon: <XCircle className="h-3 w-3 mr-1" />,
      label: 'Rejected',
    },
  };
  const v = variants[status] || variants.pending;
  return (
    <Badge variant="outline" className={v.badge}>
      {v.icon}
      {v.label}
    </Badge>
  );
}

function ReasonBadge({ reason }: { reason: string }) {
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
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ReviewManagement() {
  // ── Reviews State ────────────────────────────────────────────────────────
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewLimit, setReviewLimit] = useState(10);
  const [reviewStatus, setReviewStatus] = useState<string>('');
  const [reviewSearch, setReviewSearch] = useState('');
  const debouncedSearch = useDebounced(reviewSearch, 300);
  const [reviewSort, setReviewSort] = useState('createdAt');
  const [reviewOrder, setReviewOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedReviews, setSelectedReviews] = useState<string[]>([]);

  // ── Reports State ────────────────────────────────────────────────────────
  const [reportPage, setReportPage] = useState(1);
  const [reportLimit, setReportLimit] = useState(10);
  const [reportStatus, setReportStatus] = useState<string>('');
  const [reportSearch, setReportSearch] = useState('');

  // ── Dialog State ─────────────────────────────────────────────────────────
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [detailReview, setDetailReview] = useState<AdminReview | null>(null);
  const [detailReport, setDetailReport] = useState<AdminReport | null>(null);
  const [reportAdminNote, setReportAdminNote] = useState('');
  const [reportAdminNoteError, setReportAdminNoteError] = useState('');
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
    limit: reportLimit,
    status: (reportStatus as 'pending' | 'reviewed' | 'resolved' | 'rejected' | undefined) || undefined,
    search: reportSearch || undefined,
  });

  // ── Derived Data ─────────────────────────────────────────────────────────
  const reviews = reviewsQuery.data?.items || [];
  const reports = reportsQuery.data?.items || [];
  const reviewTotalPages = reviewsQuery.data?.totalPages || 1;
  const reportTotalPages = reportsQuery.data?.totalPages || 1;
  const reviewTotal = reviewsQuery.data?.total ?? 0;
  const reportTotal = reportsQuery.data?.total ?? 0;

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
          setDetailReview(null);
          refreshStats();
        },
        onError: () => toast.error('Failed to approve review'),
      },
    );
  };

  const handleReject = () => {
    const targetId = rejectTarget || detailReview?.id;
    if (!targetId || !rejectReason.trim()) return;
    moderateMutation.mutate(
      { id: targetId, data: { action: 'reject', reason: rejectReason } },
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
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              {
                label: 'Total Reviews',
                value: stats.total,
                icon: FileText,
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
                  setReviewStatus(stat.filter);
                  setReviewPage(1);
                  setSelectedReviews([]);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setReviewStatus(stat.filter);
                    setReviewPage(1);
                    setSelectedReviews([]);
                  }
                }}
                className={`cursor-pointer transition-all ${
                  reviewStatus === stat.filter
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

          {/* ── [D] Search + Sort Bar ──────────────────────────────────── */}
          <div className="flex flex-wrap items-center justify-start gap-3">
            <div className="relative w-full max-w-sm">
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
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-muted rounded-md">
              <span className="text-sm font-medium">
                {selectedReviews.length} selected
              </span>
              <div className="flex flex-wrap items-center gap-2">
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
            </div>
          )}

          {/* ── [F] Reviews Table ──────────────────────────────────────── */}
          <div className="overflow-x-auto rounded-md border bg-card">
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
                        <ReviewStatusBadge status={review.status} />
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
                            onClick={() => openDeleteDialog(review.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
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
          <div className="flex flex-wrap items-center justify-between gap-3">
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {[
              {
                label: 'Total Reports',
                value: reportsQuery.data?.total ?? 0,
                icon: Flag,
                color: 'text-blue-400',
                bg: 'bg-blue-500/10',
                filter: '',
              },
              {
                label: 'Pending',
                value: reports.filter((r) => r.status === 'pending').length,
                icon: Clock,
                color: 'text-amber-400',
                bg: 'bg-amber-500/10',
                filter: 'pending',
              },
              {
                label: 'Reviewed',
                value: reports.filter((r) => r.status === 'reviewed').length,
                icon: Eye,
                color: 'text-blue-400',
                bg: 'bg-blue-500/10',
                filter: 'reviewed',
              },
              {
                label: 'Resolved',
                value: reports.filter((r) => r.status === 'resolved').length,
                icon: CheckCircle,
                color: 'text-emerald-400',
                bg: 'bg-emerald-500/10',
                filter: 'resolved',
              },
              {
                label: 'Rejected',
                value: reports.filter((r) => r.status === 'rejected').length,
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
                  setReportStatus(stat.filter);
                  setReportPage(1);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setReportStatus(stat.filter);
                    setReportPage(1);
                  }
                }}
                className={`cursor-pointer transition-all ${
                  reportStatus === stat.filter
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

          {/* ── Reports Search Bar ─────────────────────────────────────── */}
          <div className="flex items-center justify-start">
            <div className="relative w-full max-w-sm">
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
          <div className="overflow-x-auto rounded-md border bg-card">
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
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => {
                              setReportAdminNote('');
                              if (report.status === 'pending') {
                                updateStatusMutation.mutate(
                                  { id: report.id, data: { status: 'reviewed' } },
                                  {
                                    onError: () => toast.error('Failed to update report'),
                                  },
                                );
                              }
                              setDetailReport(report);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {report.status !== 'resolved' && (
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => handleDeleteReport(report.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
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

          {/* ── Reports Pagination ─────────────────────────────────────── */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">
              Showing {reports.length > 0 ? (reportPage - 1) * reportLimit + 1 : 0}-
              {Math.min(reportPage * reportLimit, reportTotal)} of {reportTotal}{' '}
              reports
            </span>
            <div className="flex items-center gap-2">
              <Select
                value={String(reportLimit)}
                onValueChange={(v) => {
                  setReportLimit(Number(v));
                  setReportPage(1);
                }}
              >
                <SelectTrigger className="w-[70px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
                  disabled={reportPage <= 1}
                  onClick={() => setReportPage(reportPage - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {getPageNumbers(reportPage, reportTotalPages).map(
                  (page, idx) =>
                    typeof page === 'number' ? (
                      <Button
                        key={idx}
                        size="icon"
                        variant={page === reportPage ? 'default' : 'outline'}
                        className="h-8 w-8"
                        onClick={() => setReportPage(page)}
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
                  disabled={reportPage >= reportTotalPages}
                  onClick={() => setReportPage(reportPage + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* DIALOGS                                                           */}
      {/* ════════════════════════════════════════════════════════════════════ */}

      {/* ── Review Detail Modal ─────────────────────────────────────────── */}
      <Dialog open={!!detailReview} onOpenChange={() => setDetailReview(null)}>
        <DialogContent className="max-w-xl rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xl">
          <DialogHeader className="border-b border-slate-200 pb-2">
            <DialogTitle className="text-base font-semibold tracking-wide text-slate-900">
              Review Detail
            </DialogTitle>
          </DialogHeader>
          {detailReview && (
            <div className="space-y-3 pt-1">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Review Information
                  </p>
                </div>

                <div className="rounded-md border border-slate-200 bg-white p-2">
                  <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500 mb-1">
                    Reviewer
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-700">
                      {detailReview.user?.name
                        ?.split(' ')
                        .map((part: string) => part[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2) || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {detailReview.user?.name || 'N/A'}
                      </p>
                      <p className="truncate text-xs text-slate-600">
                        {detailReview.user?.email || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-2 rounded-md border border-slate-200 bg-white p-2">
                  <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500 mb-1">
                    Product
                  </p>
                  <div className="flex items-center gap-3">
                    {detailReview.product?.images?.[0] && (
                      <img
                        src={getImageUrl(detailReview.product.images[0])}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded object-cover"
                      />
                    )}
                    <div className="min-w-0">
                      {detailReview.product?.slug ? (
                        <Link
                          to={`/buyer/products/${detailReview.product.slug}`}
                          className="truncate text-sm font-medium text-slate-900 underline-offset-2 hover:text-blue-600 hover:underline"
                        >
                          {detailReview.product?.name || 'N/A'}
                        </Link>
                      ) : (
                        <p className="truncate text-sm font-medium text-slate-900">
                          {detailReview.product?.name || 'N/A'}
                        </p>
                      )}
                      <p className="text-xs text-slate-600">
                        {detailReview.product?.price != null
                          ? `$${Number(detailReview.product.price).toFixed(2)}`
                          : 'Price unavailable'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                  <div className="rounded-md border border-slate-200 bg-white p-2">
                    <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500">
                      Status
                    </p>
                    <div className="mt-1">
                      <ReviewStatusBadge status={detailReview.status} />
                    </div>
                  </div>

                  <div className="rounded-md border border-slate-200 bg-white p-2">
                    <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500">
                      Rating
                    </p>
                    <div className="mt-1 flex items-center gap-1">
                      <StarRating rating={detailReview.rating} />
                      <span className="text-xs text-slate-600">
                        ({detailReview.rating}/5)
                      </span>
                    </div>
                  </div>

                  <div className="rounded-md border border-slate-200 bg-white p-2">
                    <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500">
                      Submitted
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {new Date(detailReview.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Review Content
                </p>

                <div className="rounded-md border border-slate-200 bg-white p-2">
                  <div className="flex items-center gap-2 mb-2">
                    {detailReview.isVerifiedPurchase && (
                      <Badge variant="secondary">Verified Purchase</Badge>
                    )}
                  </div>

                  {detailReview.title && (
                    <p className="mb-1 text-sm font-medium text-slate-900">
                      {detailReview.title}
                    </p>
                  )}

                  {detailReview.body && (
                    <p className="whitespace-pre-wrap text-xs leading-5 text-slate-700">
                      {detailReview.body}
                    </p>
                  )}
                </div>

                {detailReview.images?.length > 0 && (
                  <div className="mt-2 rounded-md border border-slate-200 bg-white p-2">
                    <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500 mb-1">
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
              </div>

              {detailReview.status === 'pending' && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Rejection Reason
                  </p>
                  <Textarea
                    placeholder="Enter rejection reason (required)..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="min-h-[72px] rounded-md border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-slate-300"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  onClick={() => setDetailReview(null)}
                >
                  Cancel
                </Button>
                {detailReview.status === 'pending' && (
                  <Button
                    onClick={() => handleApprove(detailReview.id)}
                    disabled={moderateMutation.isPending}
                    className="bg-[#7C3AED] text-white hover:bg-[#6D28D9]"
                  >
                    <Check className="h-4 w-4 mr-1" /> Approve
                  </Button>
                )}
                {detailReview.status === 'pending' && (
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={!rejectReason.trim() || moderateMutation.isPending}
                  >
                    <Flag className="h-4 w-4 mr-1" /> Reject
                  </Button>
                )}
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
      <Dialog open={!!detailReport} onOpenChange={() => { setDetailReport(null); setReportAdminNoteError(''); }}>
        <DialogContent className="max-w-xl rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xl">
          <DialogHeader className="border-b border-slate-200 pb-2">
            <DialogTitle className="text-base font-semibold tracking-wide text-slate-900">
              Report Detail
            </DialogTitle>
          </DialogHeader>
          {detailReport && (
            <div className="space-y-3 pt-1">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Report Information
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-md border border-slate-200 bg-white p-2">
                    <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500">
                      Reporter
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {detailReport.reporter?.name || 'N/A'}
                    </p>
                    <p className="text-xs text-slate-600">
                      {detailReport.reporter?.email || 'N/A'}
                    </p>
                  </div>

                  <div className="rounded-md border border-slate-200 bg-white p-2">
                    <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500">
                      Reason
                    </p>
                    <div className="mt-1">
                      <ReasonBadge reason={detailReport.reason} />
                    </div>
                  </div>

                  <div className="rounded-md border border-slate-200 bg-white p-2">
                    <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500">
                      Submitted
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {new Date(detailReport.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="rounded-md border border-slate-200 bg-white p-2">
                    <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500">
                      Status
                    </p>
                    <div className="mt-1">
                      <ReportStatusBadge status={detailReport.status} />
                    </div>
                  </div>
                </div>

                {detailReport.description && (
                  <div className="mt-3 rounded-md border border-slate-200 bg-white p-2">
                    <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500">
                      Report Details
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-700">
                      {detailReport.description}
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Reported Review
                </p>

                <div className="rounded-md border border-slate-200 bg-white p-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-medium text-slate-700">
                      {detailReport.review?.user?.name
                        ?.split(' ')
                        .map((part) => part[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2) || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        By: {detailReport.review?.user?.name || 'N/A'} ({detailReport.review?.user?.email || 'N/A'})
                      </p>
                      <p className="truncate text-xs text-slate-600">
                        {detailReport.review?.product?.name || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-2">
                    <p className="whitespace-pre-wrap text-xs leading-5 text-slate-700">
                      {detailReport.review?.body || detailReport.review?.title || 'No review content available.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Admin Note <span className="text-red-500">*</span>
                </p>
                <Textarea
                  value={reportAdminNote}
                  onChange={(e) => {
                    setReportAdminNote(e.target.value);
                    if (reportAdminNoteError) setReportAdminNoteError('');
                  }}
                  placeholder="Add internal resolution notes..."
                  className={`min-h-[72px] rounded-md bg-white text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-slate-300 ${
                    reportAdminNoteError
                      ? 'border-red-500 focus-visible:ring-red-300'
                      : 'border-slate-200'
                  }`}
                />
                {reportAdminNoteError && (
                  <p className="mt-1 text-xs text-red-500">{reportAdminNoteError}</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  onClick={() => setDetailReport(null)}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-[#7C3AED] text-white hover:bg-[#6D28D9]"
                  onClick={() => {
                    if (!detailReport) return;
                    if (!reportAdminNote.trim()) {
                      setReportAdminNoteError('Admin note is required.');
                      return;
                    }
                    updateStatusMutation.mutate(
                      { id: detailReport.id, data: { status: 'resolved', adminNote: reportAdminNote.trim() } },
                      {
                        onSuccess: () => {
                          if (detailReport.reviewId) {
                            moderateMutation.mutate(
                              { id: detailReport.reviewId, data: { action: 'reject', reason: 'Report resolved — review rejected' } },
                              { onError: () => {} },
                            );
                          }
                          toast.success('Report resolved');
                          setDetailReport(null);
                        },
                        onError: () => toast.error('Failed to resolve report'),
                      },
                    );
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-1" /> Resolve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (!detailReport) return;
                    if (!reportAdminNote.trim()) {
                      setReportAdminNoteError('Admin note is required.');
                      return;
                    }
                    updateStatusMutation.mutate(
                      { id: detailReport.id, data: { status: 'rejected', adminNote: reportAdminNote.trim() } },
                      {
                        onSuccess: () => {
                          toast.success('Report rejected');
                          setDetailReport(null);
                        },
                        onError: () => toast.error('Failed to reject report'),
                      },
                    );
                  }}
                >
                  <XCircle className="h-4 w-4 mr-1" /> Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
