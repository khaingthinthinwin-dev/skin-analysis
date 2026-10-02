import { Pencil, Ban, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPrice } from '@/lib/format'
import type { AdminAdFeeSetting } from '@/types/admin-ad-management'
import { FeeStatusBadge, TierBadge } from './badges'
import { PLACEMENT_LABELS } from '../utils/labels'

interface FeeSettingsTableProps {
  feeSettings?: AdminAdFeeSetting[]
  onEdit: (feeSetting: AdminAdFeeSetting) => void
  onDeactivate: (feeSetting: AdminAdFeeSetting) => void
  onReactivate: (feeSetting: AdminAdFeeSetting) => void
  isLoading?: boolean
}

// Responsive styling follows AdTable: uppercase muted header band, tight
// horizontal padding, truncated text, and a sticky right-pinned Actions
// column so its buttons stay reachable. The lower-priority Duration/Max Ads
// columns collapse below md/lg so every remaining column fits within the
// card on smaller viewports; the wrapper's overflow-x-auto only remains as
// a fallback for the narrowest screens.
const TH_BASE =
  'text-left align-middle h-12 px-2 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border whitespace-nowrap'

const TH_CLASS = `${TH_BASE} bg-muted/40`

const TH_STICKY_CLASS = `${TH_BASE} sticky right-0 z-10 bg-card before:absolute before:inset-0 before:-z-10 before:content-[''] before:bg-muted/40`

const TD_CLASS = 'py-4 px-2 text-sm text-muted-foreground border-b border-border'

const TD_STICKY_CLASS = `${TD_CLASS} sticky right-0 z-10 bg-card before:absolute before:inset-0 before:-z-10 before:content-['']`

const ROW_CLASS = 'group transition-colors duration-150 ease-in-out hover:bg-muted/40'

// Responsive column visibility — shared by header, body, and skeleton rows
// so they always line up.
const DURATION_COL_CLASS = 'hidden md:table-cell'
const MAX_ADS_COL_CLASS = 'hidden lg:table-cell'

export function FeeSettingsTable({
  feeSettings = [],
  onEdit,
  onDeactivate,
  onReactivate,
  isLoading = false,
}: FeeSettingsTableProps) {
  if (isLoading) {
    return (
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full border-separate border-spacing-0">
          <thead className="sticky top-0 z-10">
            <tr>
              <th scope="col" className={TH_CLASS}>Placement</th>
              <th scope="col" className={TH_CLASS}>Tier</th>
              <th scope="col" className={`${TH_CLASS} text-right`}>Daily Rate</th>
              <th scope="col" className={`${TH_CLASS} ${DURATION_COL_CLASS} text-right`}>Duration</th>
              <th scope="col" className={`${TH_CLASS} text-right`}>Total Fee</th>
              <th scope="col" className={`${TH_CLASS} ${MAX_ADS_COL_CLASS} text-right`}>Max Ads</th>
              <th scope="col" className={TH_CLASS}>Status</th>
              <th scope="col" className={`${TH_STICKY_CLASS} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 4 }, (_, i) => (
              <tr key={i}>
                {Array.from({ length: 8 }, (_, j) => {
                  const extra =
                    j === 3
                      ? ` ${DURATION_COL_CLASS}`
                      : j === 5
                        ? ` ${MAX_ADS_COL_CLASS}`
                        : j === 7
                          ? ' sticky right-0 z-10 bg-card'
                          : ''
                  return (
                    <td key={j} className={`${TD_CLASS}${extra}`}>
                      <Skeleton className="h-4 w-full" />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full border-separate border-spacing-0">
        <thead className="sticky top-0 z-10">
          <tr>
            <th scope="col" className={TH_CLASS}>Placement</th>
            <th scope="col" className={TH_CLASS}>Tier</th>
            <th scope="col" className={`${TH_CLASS} text-right`}>Daily Rate</th>
            <th scope="col" className={`${TH_CLASS} ${DURATION_COL_CLASS} text-right`}>Duration</th>
            <th scope="col" className={`${TH_CLASS} text-right`}>Total Fee</th>
            <th scope="col" className={`${TH_CLASS} ${MAX_ADS_COL_CLASS} text-right`}>Max Ads</th>
            <th scope="col" className={TH_CLASS}>Status</th>
            <th scope="col" className={`${TH_STICKY_CLASS} text-right`}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {feeSettings.length === 0 ? (
            <tr>
              <td colSpan={8} className={`${TD_CLASS} py-10 text-center text-muted-foreground`}>
                No fee settings found.
              </td>
            </tr>
          ) : (
            feeSettings.map((feeSetting) => (
              <tr key={feeSetting.id} className={ROW_CLASS}>
                <td className={`${TD_CLASS} font-medium text-foreground`}>
                  <div className="max-w-[140px] truncate" title={PLACEMENT_LABELS[feeSetting.placement]}>
                    {PLACEMENT_LABELS[feeSetting.placement]}
                  </div>
                </td>
                <td className={TD_CLASS}>
                  <TierBadge tier={feeSetting.tier} />
                </td>
                <td className={`${TD_CLASS} text-right text-foreground font-semibold tabular-nums`}>
                  {formatPrice(Number(feeSetting.dailyRate))}
                </td>
                <td className={`${TD_CLASS} ${DURATION_COL_CLASS} text-right tabular-nums whitespace-nowrap`}>
                  {feeSetting.durationDays} days
                </td>
                <td className={`${TD_CLASS} text-right text-foreground font-semibold tabular-nums`}>
                  {formatPrice(Number(feeSetting.totalFee))}
                </td>
                <td className={`${TD_CLASS} ${MAX_ADS_COL_CLASS} text-right tabular-nums`}>
                  {feeSetting.maxAds}
                </td>
                <td className={TD_CLASS}>
                  <FeeStatusBadge active={feeSetting.isActive} />
                </td>
                <td className={`${TD_STICKY_CLASS} text-right group-hover:before:bg-muted/40`}>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => onEdit(feeSetting)}>
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                     
                    </Button>
                    {feeSetting.isActive ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => onDeactivate(feeSetting)}
                      >
                        <Ban className="mr-1 h-3.5 w-3.5" />
                        
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onReactivate(feeSetting)}
                      >
                        <RotateCcw className="mr-1 h-3.5 w-3.5" />
                        
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}