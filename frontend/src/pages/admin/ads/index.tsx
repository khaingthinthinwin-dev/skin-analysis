import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { BarChart3, Download, LayoutGrid } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { useAdminAds } from '@/features/admin/advertisement-management/hooks/useAdminAds'
import { useAdReview } from '@/features/admin/advertisement-management/hooks/useAdReview'
import { AdTable } from '@/features/admin/advertisement-management/components/AdTable'
import { AdReviewModal } from '@/features/admin/advertisement-management/components/AdReviewModal'
import { BulkActionBar } from '@/features/admin/advertisement-management/components/BulkActionBar'
import { BulkApproveModal } from '@/features/admin/advertisement-management/components/BulkApproveModal'
import { BulkRejectModal } from '@/features/admin/advertisement-management/components/BulkRejectModal'
import { FilterBar, type AdListFilters } from '@/features/admin/advertisement-management/components/FilterBar'
import { Pagination } from '@/features/admin/advertisement-management/components/Pagination'
import { ADMIN_AD_STATUSES, type AdminAdListQuery, type ApprovalStatus } from '@/types/admin-ad-management'

function toApprovalStatus(value: string | null): ApprovalStatus | undefined {
  return ADMIN_AD_STATUSES.find((status) => status === value)
}

export default function AdminAdListPage() {
  // Deep-linked from the AD_SUBMITTED notification, which points at the pending
  // review queue the new submission just joined. Only the status filter is
  // seeded from the URL; the rest stay local until the admin changes them.
  const [searchParams] = useSearchParams()
  const [filters, setFilters] = useState<AdListFilters>(() => {
    const status = toApprovalStatus(searchParams.get('status'))
    return status ? { status } : {}
  })
  const [page, setPage] = useState(1)
  // Page size selector (10/20/50/100), default 10; changing it resets to page 1.
  const [limit, setLimit] = useState(10)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [review, setReview] = useState<{ id: string; viewOnly: boolean } | null>(null)
  const [bulkApproveOpen, setBulkApproveOpen] = useState(false)
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false)
  const [highlightAdId, setHighlightAdId] = useState<string | null>(() =>
    searchParams.get('highlightAdId')
  )

  const params: AdminAdListQuery = useMemo(
    () => ({ ...filters, page, limit }),
    [filters, page, limit],
  )

  const {
    adsQuery,
    pendingCountQuery,
    approveMutation,
    rejectMutation,
    bulkApproveMutation,
    bulkRejectMutation,
  } = useAdminAds(params)
  const reviewDetailQuery = useAdReview(review?.id ?? '')

  const pendingCount = pendingCountQuery.data ?? 0
  const selectableIds = useMemo(
    () =>
      (adsQuery.data?.data ?? [])
        .filter((ad) => ad.approvalStatus === 'pending')
        .map((ad) => ad.id),
    [adsQuery.data],
  )

  const updateFilter = (patch: Partial<AdListFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }))
    setPage(1)
  }

  const handleSelectAll = (checked: boolean) => setSelectedIds(checked ? selectableIds : [])
  const handleSelectAd = (id: string, checked: boolean) =>
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((item) => item !== id)))

  const handleApprove = () => {
    if (!review) return
    approveMutation.mutate(review.id, {
      onSuccess: () => {
        toast({ title: 'Advertisement approved', variant: 'default' })
        setReview(null)
      },
      onError: () => {
        toast({ title: 'Failed to approve advertisement', variant: 'destructive' })
      },
    })
  }

  const handleReject = (reason: string) => {
    if (!review) return
    rejectMutation.mutate(
      { id: review.id, rejection_reason: reason },
      {
        onSuccess: () => {
          toast({ title: 'Advertisement rejected', variant: 'default' })
          setReview(null)
        },
        onError: () => {
          toast({ title: 'Failed to reject advertisement', variant: 'destructive' })
        },
      },
    )
  }

  const handleBulkApprove = () => {
    bulkApproveMutation.mutate(
      { ad_ids: selectedIds },
      {
        onSuccess: (data) => {
          toast({
            title: `${data.approved ?? selectedIds.length} advertisements approved`,
            variant: 'default',
          })
          setBulkApproveOpen(false)
          setSelectedIds([])
        },
        onError: () => {
          toast({ title: 'Bulk approve failed', variant: 'destructive' })
        },
      },
    )
  }

  const handleBulkReject = (reason: string) => {
    bulkRejectMutation.mutate(
      { ad_ids: selectedIds, rejection_reason: reason },
      {
        onSuccess: (data) => {
          toast({
            title: `${data.rejected ?? selectedIds.length} advertisements rejected`,
            variant: 'default',
          })
          setBulkRejectOpen(false)
          setSelectedIds([])
        },
        onError: () => {
          toast({ title: 'Bulk reject failed', variant: 'destructive' })
        },
      },
    )
  }

  // Handle highlightAdId from URL (e.g., from AD_SUBMITTED notification)
  useEffect(() => {
    const adId = searchParams.get('highlightAdId')
    if (adId && adId !== highlightAdId) {
      // Defer state update to avoid synchronous setState in effect
      window.setTimeout(() => {
        setHighlightAdId(adId)
        // Auto-clear highlight after 8 seconds
        const timer = window.setTimeout(() => {
          setHighlightAdId(null)
          // Clean up URL
          const params = new URLSearchParams(searchParams)
          params.delete('highlightAdId')
          window.history.replaceState({}, '', `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`)
        }, 8000)
        return () => window.clearTimeout(timer)
      }, 0)
    }
  }, [searchParams, highlightAdId])

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Advertisement Management</h1>
          <p className="text-muted-foreground">Review merchant ads and manage advertising fees</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
            {pendingCount} pending
          </Badge>
          <Button asChild size="sm" variant="outline">
            <Link to="/admin/ads/packages">
              <LayoutGrid className="mr-1 h-4 w-4" />
              Manage Packages
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/admin/ads/analytics">
              <BarChart3 className="mr-1 h-4 w-4" />
              Revenue Analytics
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/admin/ads/export">
              <Download className="mr-1 h-4 w-4" />
              Export
            </Link>
          </Button>
        </div>
      </div>

      <FilterBar filters={filters} onChange={updateFilter} />

      <BulkActionBar
        selectedCount={selectedIds.length}
        onBulkApprove={() => setBulkApproveOpen(true)}
        onBulkReject={() => setBulkRejectOpen(true)}
        onClear={() => setSelectedIds([])}
      />

      <AdTable
        ads={adsQuery.data?.data}
        selectedIds={selectedIds}
        onSelectAll={handleSelectAll}
        onSelectAd={handleSelectAd}
        onReview={(id) => setReview({ id, viewOnly: false })}
        onView={(id) => setReview({ id, viewOnly: true })}
        isLoading={adsQuery.isPending}
        highlightAdId={highlightAdId}
      />

      <Pagination
        page={page}
        limit={limit}
        total={adsQuery.data?.meta.total ?? 0}
        totalPages={adsQuery.data?.meta.totalPages ?? 0}
        onPageChange={setPage}
        onLimitChange={(next) => {
          setLimit(next)
          setPage(1)
        }}
      />

      {review && (
        <AdReviewModal
          open
          ad={reviewDetailQuery.data}
          isLoading={reviewDetailQuery.isPending}
          isReadOnly={review.viewOnly}
          isApproving={approveMutation.isPending}
          isRejecting={rejectMutation.isPending}
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={() => setReview(null)}
        />
      )}

      <BulkApproveModal
        open={bulkApproveOpen}
        count={selectedIds.length}
        isLoading={bulkApproveMutation.isPending}
        onConfirm={handleBulkApprove}
        onClose={() => setBulkApproveOpen(false)}
      />

      {bulkRejectOpen && (
        <BulkRejectModal
          open
          count={selectedIds.length}
          isLoading={bulkRejectMutation.isPending}
          onConfirm={handleBulkReject}
          onClose={() => setBulkRejectOpen(false)}
        />
      )}
    </div>
  )
}