import { Eye, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPrice } from '@/lib/format'
import type { AdminAdvertisement } from '@/types/admin-ad-management'
import { PaymentBadge, StatusBadge, TierBadge } from './badges'
import { PLACEMENT_LABELS, formatIsoDate, formatScheduleRange } from '../utils/labels'

interface AdTableProps {
  ads?: AdminAdvertisement[]
  selectedIds: string[]
  onSelectAll: (checked: boolean) => void
  onSelectAd: (id: string, checked: boolean) => void
  onReview: (id: string) => void
  onView: (id: string) => void
  isLoading?: boolean
}

// Table styling follows the admin ads mock: uppercase muted header on a
// neutral band, comfortable 14px rows, and muted supporting text with the
// key columns (shop, fee) emphasized in foreground.
//
// Horizontal fit: cells use tight horizontal padding, long text is truncated
// through inner wrappers, and the lower-priority Placement column collapses
// below xl so every remaining column (especially Actions and Submitted)
// fits within the card on laptop viewports. Submitted is never hidden by a
// breakpoint: browser zoom shrinks the effective viewport and made it
// disappear at Zoom +. The wrapper's overflow-x-auto only remains as a
// fallback for narrower screens, where the Actions column pins to the right
// edge so its buttons stay reachable.
const TH_BASE =
  'text-left align-middle h-12 px-2 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border whitespace-nowrap'

const TH_CLASS = `${TH_BASE} bg-muted/40`

// Pinned (sticky) Actions cells must be opaque, otherwise content scrolling
// underneath would show through them. bg-card is the opaque base and the
// before: overlay re-applies the same token-based tints the rest of the table
// uses (header band, row hover, row selection), so the pinned cells stay
// visually identical to their neighbours.
const TH_STICKY_CLASS = `${TH_BASE} sticky right-0 z-10 bg-card before:absolute before:inset-0 before:-z-10 before:content-[''] before:bg-muted/40`

const TD_CLASS = 'py-4 px-2 text-sm text-muted-foreground border-b border-border'

const TD_STICKY_CLASS = `${TD_CLASS} sticky right-0 z-10 bg-card before:absolute before:inset-0 before:-z-10 before:content-['']`

const ROW_CLASS =
  'group transition-colors duration-150 ease-in-out hover:bg-muted/40'

// Responsive column visibility — shared by header, body, and skeleton rows
// so they always line up.
const PLACEMENT_COL_CLASS = 'hidden xl:table-cell'

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

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full border-separate border-spacing-0">
        <thead className="sticky top-0 z-10">
          <tr>
            <th scope="col" className={`${TH_CLASS} w-10`}>
              {selectableAds.length > 0 && (
                <Checkbox
                  checked={allSelectableSelected}
                  onCheckedChange={onSelectAll}
                  disabled={selectableAds.length === 0}
                  aria-label="Select all pending advertisements"
                />
              )}
            </th>
            <th scope="col" className={TH_CLASS}>Shop</th>
            <th scope="col" className={TH_CLASS}>Title</th>
            <th scope="col" className={`${TH_CLASS} ${PLACEMENT_COL_CLASS}`}>Placement</th>
            <th scope="col" className={TH_CLASS}>Tier</th>
            <th scope="col" className={TH_CLASS}>Status</th>
            <th scope="col" className={TH_CLASS}>Payment</th>
            <th scope="col" className={`${TH_CLASS} text-right`}>Fee</th>
            <th scope="col" className={TH_CLASS}>Submitted</th>
            <th scope="col" className={TH_CLASS}>Schedule</th>
            <th scope="col" className={`${TH_STICKY_CLASS} text-right`}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 8 }, (_, i) => (
              <tr key={i}>
                {Array.from({ length: 11 }, (_, j) => {
                  const extra =
                    j === 3
                      ? ` ${PLACEMENT_COL_CLASS}`
                      : j === 10
                        ? ' sticky right-0 z-10 bg-card'
                        : ''
                  return (
                    <td key={j} className={`${TD_CLASS}${extra}`}>
                      <Skeleton className="h-4 w-full" />
                    </td>
                  )
                })}
              </tr>
            ))
          ) : ads.length === 0 ? (
            <tr>
              <td colSpan={11} className={`${TD_CLASS} text-center py-6 text-muted-foreground`}>
                No advertisements found.
              </td>
            </tr>
          ) : (
            ads.map((ad) => {
              const selectable = ad.approvalStatus === 'pending'
              const selected = selectedIds.includes(ad.id)
              return (
                <tr key={ad.id} className={`${ROW_CLASS}${selected ? ' bg-secondary/40' : ''}`}>
                  <td className={TD_CLASS}>
                    <Checkbox
                      checked={selected}
                      onCheckedChange={(checked) => onSelectAd(ad.id, checked)}
                      disabled={!selectable}
                      aria-label={`Select advertisement ${ad.title}`}
                    />
                  </td>
                  <td className={`${TD_CLASS} text-foreground font-semibold`}>
                    <div className="max-w-[110px] truncate" title={ad.shopName}>
                      {ad.shopName}
                    </div>
                  </td>
                  <td className={`${TD_CLASS} text-foreground`}>
                    <div className="max-w-[120px] truncate" title={ad.title}>
                      {ad.title}
                    </div>
                  </td>
                  <td className={`${TD_CLASS} ${PLACEMENT_COL_CLASS}`}>
                    <div
                      className="max-w-[120px] truncate"
                      title={PLACEMENT_LABELS[ad.placement]}
                    >
                      {PLACEMENT_LABELS[ad.placement]}
                    </div>
                  </td>
                  <td className={TD_CLASS}>
                    <TierBadge tier={ad.tier} />
                  </td>
                  <td className={TD_CLASS}>
                    <StatusBadge status={ad.approvalStatus} />
                  </td>
                  <td className={TD_CLASS}>
                    <PaymentBadge status={ad.paymentStatus} />
                  </td>
                  <td className={`${TD_CLASS} text-right text-foreground font-semibold tabular-nums`}>
                    {ad.paymentAmount ? formatPrice(Number(ad.paymentAmount)) : '\u2014'}
                  </td>
                  <td className={`${TD_CLASS} tabular-nums whitespace-nowrap`}>
                    {formatIsoDate(ad.createdAt)}
                  </td>
                  <td className={TD_CLASS}>{formatScheduleRange(ad.startsAt, ad.expiresAt)}</td>
                  <td
                    className={`${TD_STICKY_CLASS} text-right${selected ? ' before:bg-secondary/40' : ''} group-hover:before:bg-muted/40`}
                  >
                    {ad.approvalStatus === 'pending' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onReview(ad.id)}
                        aria-label={`Review ${ad.title}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onView(ad.id)}
                        aria-label={`View ${ad.title}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}