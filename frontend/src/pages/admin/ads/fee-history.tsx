import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useFeeHistory } from '@/features/admin/advertisement-management/hooks/useFeeHistory'
import { FeeHistoryTable } from '@/features/admin/advertisement-management/components/FeeHistoryTable'
import { Pagination } from '@/features/admin/advertisement-management/components/Pagination'
import { ADMIN_AD_PLACEMENTS, ADMIN_AD_TIERS } from '@/types/admin-ad-management'
import type { Placement, Tier } from '@/types/admin-ad-management'
import { PLACEMENT_LABELS, TIER_LABELS } from '@/features/admin/advertisement-management/utils/labels'

export default function FeeHistoryPage() {
  const [placement, setPlacement] = useState<Placement | undefined>(undefined)
  const [tier, setTier] = useState<Tier | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)

  const params = useMemo(
    () => ({ placement, tier, page, limit }),
    [placement, tier, page, limit],
  )
  const { data, isPending } = useFeeHistory(params)

  const resetPage = () => setPage(1)

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Fee Change History</h1>
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
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Placement</span>
          <Select
            value={placement ?? 'all'}
            onValueChange={(value) => {
              setPlacement(value === 'all' ? undefined : (value as Placement))
              resetPage()
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
      </div>

      <FeeHistoryTable rows={data?.data} isLoading={isPending} />

      <Pagination
        page={page}
        limit={limit}
        total={data?.meta.total ?? 0}
        totalPages={data?.meta.totalPages ?? 0}
        onPageChange={setPage}
        onLimitChange={(next) => {
          setLimit(next)
          setPage(1)
        }}
      />
    </div>
  )
}
