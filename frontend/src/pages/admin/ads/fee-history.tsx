import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, Trash2 } from 'lucide-react'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import {
  useDeleteFeeHistory,
  useFeeHistory,
} from '@/features/admin/advertisement-management/hooks/useFeeHistory'
import { DeleteFeeHistoryModal } from '@/features/admin/advertisement-management/components/DeleteFeeHistoryModal'
import { FeeHistoryTable } from '@/features/admin/advertisement-management/components/FeeHistoryTable'
import { Pagination } from '@/features/admin/advertisement-management/components/Pagination'
import { ADMIN_AD_PLACEMENTS, ADMIN_AD_TIERS } from '@/types/admin-ad-management'
import type { AdminAdFeeHistory, Placement, Tier } from '@/types/admin-ad-management'
import {
  PLACEMENT_LABELS,
  TIER_LABELS,
  isHistoryDeletable,
  recentMonthOptions,
} from '@/features/admin/advertisement-management/utils/labels'

function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined
    const message = Array.isArray(data?.message) ? data.message[0] : data?.message
    if (message) return message
    return error.message
  }
  return error instanceof Error ? error.message : 'Unknown error'
}

export default function FeeHistoryPage() {
  const [placement, setPlacement] = useState<Placement | undefined>(undefined)
  const [tier, setTier] = useState<Tier | undefined>(undefined)
  const [month, setMonth] = useState<string | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null)

  const params = useMemo(
    () => ({ placement, tier, month, page, limit }),
    [placement, tier, month, page, limit],
  )
  const { data, isPending } = useFeeHistory(params)
  const { deleteMutation } = useDeleteFeeHistory()

  const monthOptions = useMemo(() => recentMonthOptions(12), [])

  const resetPage = () => setPage(1)
  const clearSelection = () => setSelectedIds([])

  const selectableIds = useMemo(
    () =>
      (data?.data ?? [])
        .filter((row) => isHistoryDeletable(row.createdAt))
        .map((row) => row.id),
    [data],
  )

  const handleSelectAll = (checked: boolean) => setSelectedIds(checked ? selectableIds : [])

  const handleSelectRow = (id: string, checked: boolean) =>
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((item) => item !== id)))

  const requestDeleteRow = (row: AdminAdFeeHistory) => {
    if (!isHistoryDeletable(row.createdAt)) return
    setPendingDeleteIds([row.id])
  }

  const requestDeleteSelected = () => {
    if (selectedIds.length === 0) return
    setPendingDeleteIds(selectedIds)
  }

  const handleDelete = () => {
    if (!pendingDeleteIds || pendingDeleteIds.length === 0) return
    deleteMutation.mutate(
      { ids: pendingDeleteIds },
      {
        onSuccess: (result) => {
          toast({
            title:
              result.deletedCount === 1
                ? 'Fee change history deleted'
                : `${result.deletedCount} fee change history records deleted`,
            variant: 'default',
          })
          setPendingDeleteIds(null)
          clearSelection()
        },
        onError: (error) => {
          toast({
            title: 'Failed to delete fee change history',
            description: apiErrorMessage(error),
            variant: 'destructive',
          })
        },
      },
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fee Change History</h1>
          <p className="text-muted-foreground">Audit trail of fee setting changes</p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/admin/ads/packages">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Packages
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-md border bg-card p-3">
        <div>
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Month</span>
          <Select
            value={month ?? 'all'}
            onValueChange={(value) => {
              setMonth(value === 'all' ? undefined : value)
              resetPage()
              clearSelection()
            }}
          >
            <SelectTrigger className="h-9 w-44" aria-label="Month filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All months</SelectItem>
              {monthOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Placement</span>
          <Select
            value={placement ?? 'all'}
            onValueChange={(value) => {
              setPlacement(value === 'all' ? undefined : (value as Placement))
              resetPage()
              clearSelection()
            }}
          >
            <SelectTrigger className="h-9 w-44" aria-label="Placement filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All placements</SelectItem>
              {ADMIN_AD_PLACEMENTS.map((p) => (
                <SelectItem key={p} value={p}>
                  {PLACEMENT_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Tier</span>
          <Select
            value={tier ?? 'all'}
            onValueChange={(value) => {
              setTier(value === 'all' ? undefined : (value as Tier))
              resetPage()
              clearSelection()
            }}
          >
            <SelectTrigger className="h-9 w-36" aria-label="Tier filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tiers</SelectItem>
              {ADMIN_AD_TIERS.map((t) => (
                <SelectItem key={t} value={t}>
                  {TIER_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {selectedIds.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {selectedIds.length} selected
            </span>
          )}
          {selectedIds.length > 50 && (
            <span role="alert" className="text-sm text-destructive">
              Maximum 50 records per bulk operation
            </span>
          )}
          {selectedIds.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              disabled={deleteMutation.isPending}
            >
              Clear
            </Button>
          )}
          <Button
            size="sm"
            variant="destructive"
            disabled={
              selectedIds.length === 0 ||
              selectedIds.length > 50 ||
              deleteMutation.isPending
            }
            onClick={requestDeleteSelected}
            aria-label="Delete selected fee change history"
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Fee change history from the current month is protected and cannot be deleted. Select
        records from previous months to remove them.
      </p>

      <FeeHistoryTable
        rows={data?.data}
        selectedIds={selectedIds}
        onSelectAll={handleSelectAll}
        onSelectRow={handleSelectRow}
        onDeleteRow={requestDeleteRow}
        isDeleting={deleteMutation.isPending}
        isLoading={isPending}
      />

      <Pagination
        page={page}
        limit={limit}
        total={data?.meta.total ?? 0}
        totalPages={data?.meta.totalPages ?? 0}
        onPageChange={(next) => {
          setPage(next)
          clearSelection()
        }}
        onLimitChange={(next) => {
          setLimit(next)
          setPage(1)
          clearSelection()
        }}
      />

      <DeleteFeeHistoryModal
        open={pendingDeleteIds !== null}
        count={pendingDeleteIds?.length ?? 0}
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onClose={() => setPendingDeleteIds(null)}
      />
    </div>
  )
}