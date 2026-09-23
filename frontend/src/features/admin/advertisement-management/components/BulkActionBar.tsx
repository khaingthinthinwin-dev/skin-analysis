import { Button } from '@/components/ui/button'

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
  if (selectedCount === 0) return null

  const overLimit = selectedCount > 50

  return (
    <div className="flex flex-col gap-3 rounded-md border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium">{selectedCount} ads selected</span>
        {overLimit && (
          <span role="alert" className="text-sm text-destructive">
            Maximum 50 ads per bulk operation.
          </span>
        )}
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          disabled={overLimit}
          onClick={onBulkApprove}
          aria-label="Bulk approve selected advertisements"
        >
          Bulk Approve
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={overLimit}
          onClick={onBulkReject}
          aria-label="Bulk reject selected advertisements"
        >
          Bulk Reject
        </Button>
      </div>
    </div>
  )
}
