import { Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPrice } from '@/lib/format'
import type { AdminAdFeeHistory } from '@/types/admin-ad-management'
import { TierBadge } from './badges'
import { PLACEMENT_LABELS, formatDate, isHistoryDeletable } from '../utils/labels'

interface FeeHistoryTableProps {
  rows?: AdminAdFeeHistory[]
  isLoading?: boolean
  selectedIds?: string[]
  onSelectAll?: (checked: boolean) => void
  onSelectRow?: (id: string, checked: boolean) => void
  onDeleteRow?: (row: AdminAdFeeHistory) => void
  isDeleting?: boolean
}

// Responsive styling follows AdTable: uppercase muted header band, tight
// horizontal padding, truncated text, and a sticky right-pinned Actions
// column so the Delete button stays reachable. The lower-priority Old Rate,
// Changed By, and Reason columns collapse below md/lg/xl so the core columns
// fit on smaller viewports; the wrapper's overflow-x-auto only remains as a
// fallback for the narrowest screens.
const TH_BASE =
  'text-left align-middle h-12 px-2 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border whitespace-nowrap'

const TH_CLASS = `${TH_BASE} bg-muted/40`

const TH_STICKY_CLASS = `${TH_BASE} sticky right-0 z-10 bg-card before:absolute before:inset-0 before:-z-10 before:content-[''] before:bg-muted/40`

const TD_CLASS = 'py-4 px-2 text-sm text-muted-foreground border-b border-border'

const TD_STICKY_CLASS = `${TD_CLASS} sticky right-0 z-10 bg-card before:absolute before:inset-0 before:-z-10 before:content-['']`

const ROW_CLASS = 'group transition-colors duration-150 ease-in-out hover:bg-muted/40'

// Responsive column visibility — shared by header, body, and skeleton rows
// so they always line up.
const OLD_RATE_COL_CLASS = 'hidden md:table-cell'
const CHANGED_BY_COL_CLASS = 'hidden lg:table-cell'
const REASON_COL_CLASS = 'hidden xl:table-cell'

export function FeeHistoryTable({
  rows = [],
  isLoading = false,
  selectedIds = [],
  onSelectAll,
  onSelectRow,
  onDeleteRow,
  isDeleting = false,
}: FeeHistoryTableProps) {
  const { t } = useTranslation()
  const deletableRows = rows.filter((row) => isHistoryDeletable(row.createdAt))
  const allDeletableSelected =
    deletableRows.length > 0 &&
    deletableRows.every((row) => selectedIds.includes(row.id))
  if (isLoading) {
    return (
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full border-separate border-spacing-0">
          <thead className="sticky top-0 z-10">
            <tr>
              <th scope="col" className={`${TH_CLASS} w-10`} />
              <th scope="col" className={TH_CLASS}>{t('admin.ads.feeHistory.date', 'Date')}</th>
              <th scope="col" className={TH_CLASS}>{t('admin.ads.feeHistory.placement', 'Placement')}</th>
              <th scope="col" className={TH_CLASS}>{t('admin.ads.feeHistory.tier', 'Tier')}</th>
              <th scope="col" className={`${TH_CLASS} ${OLD_RATE_COL_CLASS} text-right`}>{t('admin.ads.feeHistory.oldRate', 'Old Rate')}</th>
              <th scope="col" className={`${TH_CLASS} text-right`}>{t('admin.ads.feeHistory.newRate', 'New Rate')}</th>
              <th scope="col" className={`${TH_CLASS} ${CHANGED_BY_COL_CLASS}`}>{t('admin.ads.feeHistory.changedBy', 'Changed By')}</th>
              <th scope="col" className={`${TH_CLASS} ${REASON_COL_CLASS}`}>{t('admin.ads.feeHistory.reason', 'Reason')}</th>
              <th scope="col" className={`${TH_STICKY_CLASS} text-right`}>{t('admin.ads.feeHistory.actions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }, (_, i) => (
              <tr key={i}>
                {Array.from({ length: 9 }, (_, j) => {
                  const extra =
                    j === 4
                      ? ` ${OLD_RATE_COL_CLASS}`
                      : j === 6
                        ? ` ${CHANGED_BY_COL_CLASS}`
                        : j === 7
                          ? ` ${REASON_COL_CLASS}`
                          : j === 8
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
            <th scope="col" className={`${TH_CLASS} w-10`}>
              <Checkbox
                checked={allDeletableSelected}
                onCheckedChange={(checked) => onSelectAll?.(checked)}
                disabled={deletableRows.length === 0}
                title={
                  deletableRows.length === 0
                    ? t('admin.ads.feeHistory.currentMonthProtected', 'Fee change history from the current month is protected and cannot be deleted. Select records from previous months to remove them.')
                    : t('admin.ads.feeHistory.selectAllLabel', 'Select all deletable fee change history')
                }
                aria-label={t('admin.ads.feeHistory.selectAllLabel', 'Select all deletable fee change history')}
              />
            </th>
            <th scope="col" className={TH_CLASS}>{t('admin.ads.feeHistory.date', 'Date')}</th>
            <th scope="col" className={TH_CLASS}>{t('admin.ads.feeHistory.placement', 'Placement')}</th>
            <th scope="col" className={TH_CLASS}>{t('admin.ads.feeHistory.tier', 'Tier')}</th>
            <th scope="col" className={`${TH_CLASS} ${OLD_RATE_COL_CLASS} text-right`}>{t('admin.ads.feeHistory.oldRate', 'Old Rate')}</th>
            <th scope="col" className={`${TH_CLASS} text-right`}>{t('admin.ads.feeHistory.newRate', 'New Rate')}</th>
            <th scope="col" className={`${TH_CLASS} ${CHANGED_BY_COL_CLASS}`}>{t('admin.ads.feeHistory.changedBy', 'Changed By')}</th>
            <th scope="col" className={`${TH_CLASS} ${REASON_COL_CLASS}`}>{t('admin.ads.feeHistory.reason', 'Reason')}</th>
            <th scope="col" className={`${TH_STICKY_CLASS} text-right`}>{t('admin.ads.feeHistory.actions', 'Actions')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={9} className={`${TD_CLASS} py-10 text-center text-muted-foreground`}>
                {t('admin.ads.feeHistory.empty', 'No fee change history found.')}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => {
              const deletable = isHistoryDeletable(row.createdAt)
              const selected = selectedIds.includes(row.id)
              const rowBg = selected
                ? ' bg-secondary/40'
                : index % 2 === 1
                  ? ' bg-muted/50'
                  : ''
              const stickyBg = selected
                ? ' before:bg-secondary/40'
                : index % 2 === 1
                  ? ' before:bg-muted/50'
                  : ''
              const placementLabel = t(
                `admin.ads.placement.${row.placement}`,
                PLACEMENT_LABELS[row.placement],
              )
              return (
                <tr key={row.id} className={`${ROW_CLASS}${rowBg}`}>
                  <td className={TD_CLASS}>
                    <Checkbox
                      checked={selected}
                      onCheckedChange={(checked) => onSelectRow?.(row.id, checked)}
                      disabled={!deletable}
                      title={
                        deletable
                          ? undefined
                          : t('admin.ads.feeHistory.currentMonthProtected', 'Fee change history from the current month is protected and cannot be deleted. Select records from previous months to remove them.')
                      }
                      aria-label={t('admin.ads.feeHistory.selectRowLabel', 'Select fee change history from {{date}}', { date: formatDate(row.createdAt) })}
                    />
                  </td>
                  <td className={`${TD_CLASS} whitespace-nowrap tabular-nums`}>
                    {formatDate(row.createdAt)}
                  </td>
                  <td className={`${TD_CLASS} font-medium text-foreground`}>
                    <div className="max-w-[120px] truncate" title={placementLabel}>
                      {placementLabel}
                    </div>
                  </td>
                  <td className={TD_CLASS}>
                    <TierBadge tier={row.tier} />
                  </td>
                  <td className={`${TD_CLASS} ${OLD_RATE_COL_CLASS} text-right tabular-nums`}>
                    {row.oldDailyRate ? formatPrice(Number(row.oldDailyRate)) : '\u2014'}
                  </td>
                  <td className={`${TD_CLASS} text-right text-foreground font-semibold tabular-nums`}>
                    {formatPrice(Number(row.newDailyRate))}
                  </td>
                  <td className={`${TD_CLASS} ${CHANGED_BY_COL_CLASS} whitespace-nowrap`}>
                    {row.changedByName}
                  </td>
                  <td className={`${TD_CLASS} ${REASON_COL_CLASS}`}>
                    <div className="max-w-[240px] truncate" title={row.changeReason ?? ''}>
                      {row.changeReason ?? '\u2014'}
                    </div>
                  </td>
                  <td className={`${TD_STICKY_CLASS} text-right${stickyBg} group-hover:before:bg-muted/40`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!deletable || isDeleting || !onDeleteRow}
                      title={
                        deletable
                          ? t('admin.ads.feeHistory.deleteRecordTitle', 'Delete this history record')
                          : t('admin.ads.feeHistory.currentMonthProtected', 'Fee change history from the current month is protected and cannot be deleted. Select records from previous months to remove them.')
                      }
                      aria-label={t('admin.ads.feeHistory.deleteRecordLabel', 'Delete fee change history from {{date}}', { date: formatDate(row.createdAt) })}
                      onClick={() => onDeleteRow?.(row)}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                     
                    </Button>
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