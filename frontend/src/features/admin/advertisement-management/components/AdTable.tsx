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
  highlightAdId?: string | null
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
  'text-left h-12 px-2 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border whitespace-nowrap'

const TH_CLASS = `${TH_BASE} bg-muted/40`
const TD_BASE = 'py-4 px-2 text-sm text-muted-foreground border-b border-border'
const ROW_BASE = 'group transition-colors duration-150 ease-in-out hover:bg-muted/40'

const PLACEMENT_COL_CLASS = 'hidden xl:table-cell'

const FIRST_CELL_HL =
  'shadow-[inset_2px_2px_0_#a855f7,inset_0_-2px_0_#a855f7] rounded-l-xl'
const LAST_CELL_HL =
  'shadow-[inset_-2px_2px_0_#a855f7,inset_0_-2px_0_#a855f7] rounded-r-xl'
const MIDDLE_CELL_HL = 'shadow-[inset_0_2px_0_#a855f7,inset_0_-2px_0_#a855f7]'

export function AdTable({
  ads = [],
  selectedIds,
  onSelectAll,
  onSelectAd,
  onReview,
  onView,
  isLoading = false,
  highlightAdId = null,
}: AdTableProps) {
  const selectableAds = ads.filter((ad) => ad.approvalStatus === 'pending')
  const allSelectableSelected =
    selectableAds.length > 0 && selectableAds.every((ad) => selectedIds.includes(ad.id))

  useEffect(() => {
    if (!highlightAdId) return
    const timer = window.setTimeout(() => {
      const element = document.getElementById(`ad-row-${highlightAdId}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
    return () => window.clearTimeout(timer)
  }, [highlightAdId])

  const getCellHighlight = (isHighlighted: boolean, index: number) => {
    if (!isHighlighted) return ''
    if (index === 0) return FIRST_CELL_HL
    if (index === COLUMNS - 1) return LAST_CELL_HL
    return MIDDLE_CELL_HL
  }

  const renderSkeletonRow = (key: number) => (
    <tr key={key}>
      {Array.from({ length: COLUMNS }, (_, j) => (
        <td
          key={j}
className={`${TD_BASE} ${j === 2 ? PLACEMENT_COL_CLASS : j === 7 ? SUBMITTED_COL_CLASS : j === COLUMNS - 1 ? 'sticky right-0 z-20 bg-muted/50' : ''}`}
        >
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  )

  const renderHeader = () => (
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
        <th scope="col" className={`${TH_CLASS} ${SUBMITTED_COL_CLASS}`}>Submitted</th>
        <th scope="col" className={TH_CLASS}>Schedule</th>
        <th scope="col" className={`${TH_STICKY_CLASS} text-right`}>Actions</th>
      </tr>
    </thead>
  )

  const renderEmpty = () => (
    <tbody>
      <tr>
        <td colSpan={COLUMNS} className={`${TD_BASE} text-center py-6 text-muted-foreground`}>
          No advertisements found.
        </td>
      </tr>
    </tbody>
  )

  const renderRow = (ad: AdminAdvertisement, _index: number) => {
    const selectable = ad.approvalStatus === 'pending'
    const selected = selectedIds.includes(ad.id)
    const isHighlighted = highlightAdId === ad.id
    const rowClass = `${ROW_BASE}${selected ? ' bg-secondary/40' : ''}`

    return (
      <tr
        key={ad.id}
        id={`ad-row-${ad.id}`}
        className={rowClass}
      >
        <td className={`${TD_BASE} ${getCellHighlight(isHighlighted, 0)}`}>
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onSelectAd(ad.id, checked)}
            disabled={!selectable}
            aria-label={`Select advertisement ${ad.title}`}
          />
        </td>
        <td className={`${TD_BASE} text-foreground font-semibold ${getCellHighlight(isHighlighted, 1)}`}>
          <div className="max-w-[110px] truncate" title={ad.shopName}>
            {ad.shopName}
          </div>
        </td>
        <td className={`${TD_BASE} text-foreground ${getCellHighlight(isHighlighted, 2)}`}>
          <div className="max-w-[120px] truncate flex items-center gap-2" title={ad.title}>
            {ad.title}
            {isHighlighted && (
              <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-purple-600 text-white animate-pulse">
                NEW
              </span>
            )}
          </div>
        </td>
        <td className={`${TD_BASE} ${PLACEMENT_COL_CLASS} ${getCellHighlight(isHighlighted, 3)}`}>
          <div className="max-w-[120px] truncate" title={PLACEMENT_LABELS[ad.placement]}>
            {PLACEMENT_LABELS[ad.placement]}
          </div>
        </td>
        <td className={`${TD_BASE} ${getCellHighlight(isHighlighted, 4)}`}>
          <TierBadge tier={ad.tier} />
        </td>
        <td className={`${TD_BASE} ${getCellHighlight(isHighlighted, 5)}`}>
          <StatusBadge status={ad.approvalStatus} />
        </td>
        <td className={`${TD_BASE} ${getCellHighlight(isHighlighted, 6)}`}>
          <PaymentBadge status={ad.paymentStatus} />
        </td>
        <td className={`${TD_BASE} text-right text-foreground font-semibold tabular-nums ${getCellHighlight(isHighlighted, 7)}`}>
          {ad.paymentAmount ? formatPrice(Number(ad.paymentAmount)) : '\u2014'}
        </td>
        <td className={`${TD_BASE} tabular-nums whitespace-nowrap ${SUBMITTED_COL_CLASS} ${getCellHighlight(isHighlighted, 8)}`}>
          {formatIsoDate(ad.createdAt)}
        </td>
        <td className={`${TD_BASE} ${getCellHighlight(isHighlighted, 9)}`}>
          {formatScheduleRange(ad.startsAt, ad.expiresAt)}
        </td>
<td
          className={`${TD_BASE} sticky right-0 z-20 bg-card ${getCellHighlight(isHighlighted, 10)} relative ${isHighlighted ? 'bg-purple-50/50 dark:bg-purple-950/30' : ''}`}
          style={{ zIndex: isHighlighted ? 30 : 20 }}>
          <div className="text-right">
            {ad.approvalStatus === 'pending' ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReview(ad.id)}
                aria-label={`Review ${ad.title}`}
              >
                <ShieldCheck className="h-4 w-4" />
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
          </div>
        </td>
      </tr>
    )
  }

  return (
    <div className="overflow-x-hidden rounded-lg border bg-card">
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

const TH_STICKY_CLASS = `${TH_BASE} sticky right-0 z-20 bg-muted/50`