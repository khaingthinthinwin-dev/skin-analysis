import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'

interface BulkActionBarProps {
  selectedCount: number
  onBulkApprove: () => void
  onBulkReject: () => void
  onClear: () => void
}

export function BulkActionBar({
  selectedCount,
  onBulkApprove,
  onBulkReject,
  onClear,
}: BulkActionBarProps) {
  const { t } = useTranslation()
  if (selectedCount === 0) return null

  const overLimit = selectedCount > 50

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">
          {t('admin.ads.bulk.selectedCount', '{{count}} ads selected', { count: selectedCount })}
        </span>
        {overLimit && (
          <span role="alert" className="text-sm text-destructive">
            {t('admin.ads.bulk.maxSelection', 'Maximum 50 ads per bulk operation.')}
          </span>
        )}
        <Button variant="ghost" size="sm" onClick={onClear}>
          {t('common.filters.clear', 'Clear')}
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={overLimit}
          onClick={onBulkApprove}
          aria-label={t('admin.ads.bulk.approveSelected', 'Approve all selected advertisements')}
        >
          {t('admin.ads.bulk.approveAll', 'Approve All')}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={overLimit}
          onClick={onBulkReject}
          aria-label={t('admin.ads.bulk.rejectSelected', 'Reject all selected advertisements')}
        >
          {t('admin.ads.bulk.rejectAll', 'Reject All')}
        </Button>
      </div>
    </div>
  )
}