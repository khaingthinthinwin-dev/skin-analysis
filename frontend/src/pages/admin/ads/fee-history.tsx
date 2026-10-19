import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const [placement, setPlacement] = useState<Placement | undefined>(undefined)
  const [tier, setTier] = useState<Tier | undefined>(undefined)
  const [month, setMonth] = useState<string | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
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
                ? t('admin.ads.feeHistory.deleteSuccessSingle', 'Fee change history deleted')
                : t('admin.ads.feeHistory.deleteSuccessCount', {
                    count: result.deletedCount,
                    defaultValue: '{{count}} fee change history records deleted',
                  }),
            variant: 'default',
          })
          setPendingDeleteIds(null)
          clearSelection()
        },
        onError: (error) => {
          toast({
            title: t('admin.ads.feeHistory.deleteFailed', 'Failed to delete fee change history'),
            description: apiErrorMessage(error),
            variant: 'destructive',
          })
        },
      },
    )
  }

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('admin.ads.feeHistory.title', 'Fee Change History')}</h1>
          <p className="text-muted-foreground">{t('admin.ads.feeHistory.subtitle', 'Audit trail of fee setting changes')}</p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/admin/ads/packages">
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t('admin.ads.feeHistory.backToPackages', 'Back to Packages')}
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-md border bg-card p-3">
        <div className="w-full min-w-0 sm:w-auto">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('admin.ads.feeHistory.month', 'Month')}</span>
          <Select
            value={month ?? 'all'}
            onValueChange={(value) => {
              setMonth(value === 'all' ? undefined : value)
              resetPage()
              clearSelection()
            }}
          >
            <SelectTrigger className="h-9 w-full sm:w-44" aria-label={t('admin.ads.feeHistory.monthFilterLabel', 'Month filter')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.ads.feeHistory.allMonths', 'All months')}</SelectItem>
              {monthOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(`admin.ads.feeHistory.month${Number(option.value.slice(5))}`, {
                    year: option.value.slice(0, 4),
                    defaultValue: option.label,
                  })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full min-w-0 sm:w-auto">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('admin.ads.feeHistory.placement', 'Placement')}</span>
          <Select
            value={placement ?? 'all'}
            onValueChange={(value) => {
              setPlacement(value === 'all' ? undefined : (value as Placement))
              resetPage()
              clearSelection()
            }}
          >
            <SelectTrigger className="h-9 w-full sm:w-44" aria-label={t('admin.ads.feeHistory.placementFilterLabel', 'Placement filter')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.ads.feeHistory.allPlacements', 'All placements')}</SelectItem>
              {ADMIN_AD_PLACEMENTS.map((p) => (
                <SelectItem key={p} value={p}>
                  {t(`admin.ads.placement.${p}`, PLACEMENT_LABELS[p])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full min-w-0 sm:w-auto">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('admin.ads.feeHistory.tier', 'Tier')}</span>
          <Select
            value={tier ?? 'all'}
            onValueChange={(value) => {
              setTier(value === 'all' ? undefined : (value as Tier))
              resetPage()
              clearSelection()
            }}
          >
            <SelectTrigger className="h-9 w-full sm:w-36" aria-label={t('admin.ads.feeHistory.tierFilterLabel', 'Tier filter')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.ads.feeHistory.allTiers', 'All tiers')}</SelectItem>
              {ADMIN_AD_TIERS.map((tier) => (
                <SelectItem key={tier} value={tier}>
                  {t(`admin.ads.tier.${tier}`, TIER_LABELS[tier])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:ml-auto sm:w-auto">
          {selectedIds.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {t('admin.ads.feeHistory.selectedCount', { count: selectedIds.length, defaultValue: '{{count}} selected' })}
            </span>
          )}
          {selectedIds.length > 50 && (
            <span role="alert" className="text-sm text-destructive">
              {t('admin.ads.feeHistory.maxBulkSelection', 'Maximum 50 records per bulk operation')}
            </span>
          )}
          {selectedIds.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              disabled={deleteMutation.isPending}
            >
              {t('common.filters.clear', 'Clear')}
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
            aria-label={t('admin.ads.feeHistory.deleteSelectedLabel', 'Delete selected fee change history')}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {t('admin.ads.feeHistory.currentMonthProtected', 'Fee change history from the current month is protected and cannot be deleted. Select records from previous months to remove them.')}
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