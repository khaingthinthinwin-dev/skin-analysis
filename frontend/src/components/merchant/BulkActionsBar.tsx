import { Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface BulkActionsBarProps {
  selectedIds: string[]
  onBulkActivate: (ids: string[]) => void
  onBulkDeactivate: (ids: string[]) => void
  onBulkDelete: (ids: string[]) => void
  onClearSelection: () => void
  className?: string
}

export function BulkActionsBar({
  selectedIds,
  onBulkActivate,
  onBulkDeactivate,
  onBulkDelete,
  onClearSelection,
  className,
}: BulkActionsBarProps) {

  if (selectedIds.length === 0) return null

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2.5',
        className,
      )}
    >
      <Package className="h-4 w-4 text-primary" />
      <span className="text-sm font-medium">
        {selectedIds.length} product{selectedIds.length > 1 ? 's' : ''} selected
      </span>
      <div className="flex items-center gap-2 ml-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onBulkActivate(selectedIds)}
        >
          Activate
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onBulkDeactivate(selectedIds)}
        >
          Deactivate
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onBulkDelete(selectedIds)}
        >
          Delete
        </Button>
        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          Clear
        </Button>
      </div>
    </div>
  )
}
