import { Eye, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatPrice } from '../utils/format'
import type { AdminAdvertisement } from '@/types/admin-ad-management'
import { PaymentBadge, StatusBadge, TierBadge } from './badges'
import { PLACEMENT_LABELS, formatDate } from '../utils/labels'

const headerCellClass =
  'h-14 whitespace-nowrap bg-muted/95 text-xs font-semibold uppercase tracking-wide text-foreground'

interface AdTableProps {
  ads?: AdminAdvertisement[]
  selectedIds: string[]
  onSelectAll: (checked: boolean) => void
  onSelectAd: (id: string, checked: boolean) => void
  onReview: (id: string) => void
  onView: (id: string) => void
  isLoading?: boolean
}

export function AdTable({
  ads = [],
  selectedIds,
  onSelectAll,
  onSelectAd,
  onReview,
  onView,
  isLoading = false,
}: AdTableProps) {
  const selectableAds = ads.filter((ad) => ad.approvalStatus === 'pending')
  const allSelectableSelected =
    selectableAds.length > 0 && selectableAds.every((ad) => selectedIds.includes(ad.id))

  if (isLoading) {
    return (
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted/95 shadow-sm">
            <TableRow>
              <TableHead className={`${headerCellClass} w-10`} />
              <TableHead className={headerCellClass}>Shop</TableHead>
              <TableHead className={headerCellClass}>Title</TableHead>
              <TableHead className={headerCellClass}>Placement</TableHead>
              <TableHead className={headerCellClass}>Tier</TableHead>
              <TableHead className={headerCellClass}>Status</TableHead>
              <TableHead className={headerCellClass}>Payment</TableHead>
              <TableHead className={`${headerCellClass} text-right`}>Fee</TableHead>
              <TableHead className={headerCellClass}>Submitted</TableHead>
              <TableHead className={headerCellClass}>Schedule</TableHead>
              <TableHead className={`${headerCellClass} text-right`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }, (_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 11 }, (_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-muted/95 shadow-sm">
          <TableRow>
            <TableHead className={`${headerCellClass} w-10`}>
              {selectableAds.length > 0 && (
                <Checkbox
                  checked={allSelectableSelected}
                  onCheckedChange={onSelectAll}
                  disabled={selectableAds.length === 0}
                  aria-label="Select all pending advertisements"
                />
              )}
            </TableHead>
            <TableHead className={headerCellClass}>Shop</TableHead>
            <TableHead className={headerCellClass}>Title</TableHead>
            <TableHead className={headerCellClass}>Placement</TableHead>
            <TableHead className={headerCellClass}>Tier</TableHead>
            <TableHead className={headerCellClass}>Status</TableHead>
            <TableHead className={headerCellClass}>Payment</TableHead>
            <TableHead className={`${headerCellClass} text-right`}>Fee</TableHead>
            <TableHead className={headerCellClass}>Submitted</TableHead>
            <TableHead className={headerCellClass}>Schedule</TableHead>
            <TableHead className={`${headerCellClass} text-right`}>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ads.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="py-10 text-center text-muted-foreground">
                No advertisements found.
              </TableCell>
            </TableRow>
          ) : (
            ads.map((ad) => {
              const selectable = ad.approvalStatus === 'pending'
              const selected = selectedIds.includes(ad.id)
              return (
                <TableRow key={ad.id} className={selected ? 'bg-secondary/40' : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={selected}
                      onCheckedChange={(checked) => onSelectAd(ad.id, checked)}
                      disabled={!selectable}
                      aria-label={`Select advertisement ${ad.title}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{ad.shopName}</TableCell>
                  <TableCell className="max-w-[180px] truncate" title={ad.title}>
                    {ad.title}
                  </TableCell>
                  <TableCell>{PLACEMENT_LABELS[ad.placement]}</TableCell>
                  <TableCell>
                    <TierBadge tier={ad.tier} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={ad.approvalStatus} />
                  </TableCell>
                  <TableCell>
                    <PaymentBadge status={ad.paymentStatus} />
                  </TableCell>
                  <TableCell className="text-right">
                    {ad.paymentAmount ? formatPrice(Number(ad.paymentAmount)) : '\u2014'}
                  </TableCell>
                  <TableCell>{formatDate(ad.createdAt)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(ad.startsAt)} - {formatDate(ad.expiresAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    {ad.approvalStatus === 'pending' ? (
                      <Button size="sm" variant="outline" onClick={() => onReview(ad.id)}>
                        <ShieldCheck className="mr-1 h-4 w-4" />
                        Review
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => onView(ad.id)}>
                        <Eye className="mr-1 h-4 w-4" />
                        View
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
